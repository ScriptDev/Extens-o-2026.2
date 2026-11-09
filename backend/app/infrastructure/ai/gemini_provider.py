import asyncio
import base64
import json
import logging
import os
import re
from pathlib import Path
from typing import Optional

from app.domain.entities import StructuredContent
from app.domain.exceptions import AIProcessingException
from app.domain.ports.ai_provider import IAIProvider

logger = logging.getLogger(__name__)

MASTER_PROMPT = """Você é um assistente teológico sênior e exegeta de alto nível com profunda capacidade de raciocínio bíblico e homilético.
Analise com máxima atenção esta gravação de pregação (áudio ou vídeo) e extraia um conjunto rico e completo de insights práticos e teológicos.

Retorne ESTRITAMENTE um objeto JSON válido, sem texto adicional antes ou depois, com a seguinte estrutura:
{
  "tema": "Tema central e inspirador da mensagem",
  "introducao": "Contextualização inicial, panorama bíblico e gancho da pregação",
  "pontos_principais": [
    {
      "titulo": "Título claro e homilético do ponto",
      "explicacao": "Explicação teológica detalhada e desdobramento pastoral do ponto mencionado",
      "referencia_biblica": "Livro Capítulo:Versículo com o texto bíblico exato citado ou implícito",
      "aplicacao_pratica": "Como o ouvinte pode aplicar este princípio na sua vida diária e espiritual"
    }
  ],
  "conclusao": "Desfecho, recapitulação dos pontos e o apelo/desafio final da mensagem",
  "frases_de_impacto": [
    "Frase marcante ou citação poderosa proferida na mensagem para mídias sociais ou slides",
    "Segunda frase de destaque"
  ],
  "perguntas_discipulado": [
    "Pergunta reflexiva para aplicação em células ou pequenos grupos",
    "Pergunta para autoexame espiritual"
  ]
}"""


class GeminiAIProvider(IAIProvider):
    """
    [Infraestrutura / Adaptador] Provedor de IA com suporte multimodal completo a Áudio e Vídeo.
    Aplica o Padrão Strategy com Failover:
      1. Tenta envio via File API (Google Cloud Files, suporta até 2GB por arquivo).
      2. Se houver restrição de conta ou arquivo leve, faz fallback automático para envio Multimodal Inline.
    """

    def __init__(self, api_key: Optional[str] = None, model: str = "gemini-3.5-flash-lite"):
        self._api_key = api_key or os.getenv("GEMINI_API_KEY", "")
        self._model = model or os.getenv("GEMINI_MODEL", "gemini-3.5-flash-lite")

        if not self._api_key:
            logger.warning("[DevSecOps] GEMINI_API_KEY não configurada. Verifique suas variáveis de ambiente.")

    async def extract_sermon_structure(
        self,
        audio_path: Path,
        mime_type: str,
        custom_instructions: Optional[str] = None
    ) -> StructuredContent:
        """
        Executa a pipeline multimodal com fallback automático e parsing seguro de JSON.
        """
        if not self._api_key:
            raise AIProcessingException(
                "Chave de API do Gemini (GEMINI_API_KEY) não está configurada no backend."
            )

        return await asyncio.to_thread(
            self._sync_gemini_pipeline,
            audio_path,
            mime_type,
            custom_instructions
        )

    def _sync_gemini_pipeline(
        self,
        audio_path: Path,
        mime_type: str,
        custom_instructions: Optional[str]
    ) -> StructuredContent:
        from google import genai
        from google.genai import types

        client = genai.Client(api_key=self._api_key)
        prompt = custom_instructions if custom_instructions else MASTER_PROMPT
        config = types.GenerateContentConfig(
            response_mime_type="application/json",
            temperature=0.2,
        )

        uploaded_file = None
        raw_text = None

        models_to_try = [self._model, "gemini-3.5-flash-lite", "gemini-3.1-flash-lite"]
        def call_models(contents_payload):
            last_ex = None
            for m in models_to_try:
                try:
                    res = client.models.generate_content(
                        model=m,
                        contents=contents_payload,
                        config=config,
                    )
                    return res.text or ""
                except Exception as ex:
                    last_ex = ex
                    logger.warning(f"Modelo {m} falhou na transcrição: {ex}. Tentando próximo modelo...")
                    continue
            raise last_ex

        # ======================================================================
        # Estratégia 1: Upload via File API (Google Cloud Media Upload)
        # ======================================================================
        try:
            logger.info(f"Tentando upload via Gemini File API: {audio_path.name} ({mime_type})")
            uploaded_file = client.files.upload(
                file=str(audio_path),
                config=dict(mime_type=mime_type) if mime_type else None
            )
            logger.info(f"Arquivo carregado na File API com sucesso: {uploaded_file.name}")
            raw_text = call_models([uploaded_file, prompt])

        except Exception as file_api_err:
            logger.warning(
                f"File API indisponível ou sem permissão de storage ({file_api_err}). "
                f"Ativando fallback imediato para envio Multimodal Inline..."
            )

            # ==================================================================
            # Estratégia 2: Fallback Multimodal Inline (Base64 / Bytes)
            # ==================================================================
            try:
                media_bytes = audio_path.read_bytes()
                media_part = types.Part.from_bytes(
                    data=media_bytes,
                    mime_type=mime_type or "audio/wav"
                )
                raw_text = call_models([media_part, prompt])
                logger.info("Processamento multimodal inline concluído com sucesso.")

            except Exception as inline_err:
                logger.error(f"Falha em ambas as estratégias do Gemini: {inline_err}", exc_info=True)
                err_msg = str(inline_err)
                if "CONSUMER_SUSPENDED" in err_msg or "Permission denied" in err_msg:
                    raise AIProcessingException(
                        "Chave do Gemini rejeitada pelo Google Cloud: o projeto da sua chave está temporariamente suspenso (CONSUMER_SUSPENDED). "
                        "Solução rápida: acesse https://aistudio.google.com, gere uma chave de API gratuita em outra conta e atualize GEMINI_API_KEY no arquivo backend/.env."
                    )
                raise AIProcessingException(f"Falha na comunicação com o Google Gemini: {err_msg}")

        finally:
            # DevSecOps: Garantir a remoção do arquivo temporário na nuvem da File API
            if uploaded_file and hasattr(uploaded_file, "name"):
                try:
                    client.files.delete(name=uploaded_file.name)
                except Exception:
                    pass

        # ======================================================================
        # 3. Parsing e Validação Estruturada do JSON Retornado
        # ======================================================================
        try:
            cleaned_json_str = self._clean_json_response(raw_text or "{}")
            data = json.loads(cleaned_json_str)
            return StructuredContent.from_dict(data)
        except json.JSONDecodeError as jde:
            logger.error(f"Erro ao decodificar JSON retornado: {jde}. Raw: {raw_text}")
            raise AIProcessingException(
                f"O modelo Gemini retornou uma resposta que não pôde ser interpretada como JSON: {str(jde)}"
            )

    @staticmethod
    def _clean_json_response(text: str) -> str:
        """Remove delimitadores Markdown como ```json e ``` caso presentes."""
        text = text.strip()
        if text.startswith("```"):
            text = re.sub(r"^```[a-zA-Z]*\n?", "", text)
            text = re.sub(r"\n?```$", "", text)
        return text.strip()
