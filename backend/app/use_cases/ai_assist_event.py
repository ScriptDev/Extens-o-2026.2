import asyncio
import json
import logging
import re
from datetime import datetime, timedelta, timezone
from typing import Optional, Dict, Any, List
from google import genai
from google.genai import types

from app.config import get_settings
from app.domain.exceptions import AIProcessingException
from app.domain.ports.event_repository import IEventRepository
from app.presentation.schemas import (
    EventAIAssistRequestDTO,
    EventAIAssistResponseDTO,
    InconsistencyItemDTO,
    LocationMemoryDTO,
)

logger = logging.getLogger(__name__)

DIAS_SEMANA_PT = [
    "Segunda-feira",
    "Terça-feira",
    "Quarta-feira",
    "Quinta-feira",
    "Sexta-feira",
    "Sábado",
    "Domingo",
]


class AIAssistEventUseCase:
    """
    [Caso de Uso] Copiloto Inteligente de Agendamento e Planejamento de Cultos.
    Possui:
      1. Consciência Temporal em Tempo Real (calcula dias relativos como domingo, segunda a partir de hoje).
      2. Memória Histórica de Localização (lembra o local e endereço padrão dos cultos anteriores).
      3. Análise sem falsos positivos de inconsistência.
    """

    def __init__(self, repository: Optional[IEventRepository] = None):
        self._repository = repository

    async def execute(self, request: EventAIAssistRequestDTO) -> EventAIAssistResponseDTO:
        settings = get_settings()
        if not settings.GEMINI_API_KEY:
            raise AIProcessingException("Chave do Gemini (GEMINI_API_KEY) não configurada.")

        temporal_ctx = self._build_temporal_context()
        location_memory = await self._retrieve_location_memory()

        return await asyncio.to_thread(
            self._sync_gemini_assist,
            request,
            settings,
            temporal_ctx,
            location_memory
        )

    async def execute_with_audio(self, audio_bytes: bytes, mime_type: str) -> EventAIAssistResponseDTO:
        settings = get_settings()
        if not settings.GEMINI_API_KEY:
            raise AIProcessingException("Chave do Gemini (GEMINI_API_KEY) não configurada.")

        temporal_ctx = self._build_temporal_context()
        location_memory = await self._retrieve_location_memory()

        return await asyncio.to_thread(
            self._sync_gemini_assist_audio,
            audio_bytes,
            mime_type,
            settings,
            temporal_ctx,
            location_memory
        )

    def _build_temporal_context(self) -> str:
        """Gera o contexto temporal dinâmico com calendário dos próximos 14 dias a partir de hoje."""
        now = datetime.now()
        dia_semana = DIAS_SEMANA_PT[now.weekday()]
        hoje_formatado = now.strftime("%d/%m/%Y")
        hora_formatada = now.strftime("%H:%M")
        ano_atual = now.year

        linhas_cal = []
        for i in range(14):
            d = now + timedelta(days=i)
            dia_nome = DIAS_SEMANA_PT[d.weekday()]
            rotulo = "Hoje" if i == 0 else ("Amanhã" if i == 1 else dia_nome)
            linhas_cal.append(
                f"  * {rotulo} ({dia_nome}): {d.strftime('%Y-%m-%d')} ({d.strftime('%d/%m/%Y')})"
            )

        tabela_cal = "\n".join(linhas_cal)

        return f"""CONSCIÊNCIA TEMPORAL EM TEMPO REAL:
- Data e Hora Atual de Hoje: {dia_semana}, {hoje_formatado} às {hora_formatada} (Ano {ano_atual}).
- TABELA DE REFERÊNCIA CRONOLÓGICA (Próximos 14 dias a partir de hoje):
{tabela_cal}

INSTRUÇÃO TEMPORAL MANDATÓRIA (INCONSISTÊNCIA INTELIGENTE COM SUGESTÃO):
1. Se o briefing citar termos relativos como "domingo", "segunda", "amanhã", "próxima quarta", etc., consulte a tabela acima e calcule a data e horário EXATOS a partir de HOJE ({dia_semana}, {hoje_formatado}).
   Exemplo Real: Se hoje é Sábado 07/11/2026 e o usuário diz "Vai ter culto domingo as 19h as 20 horas":
   - Domingo é AMANHÃ: 08/11/2026.
   - Início às 19:00: suggested_date = "2026-11-08T19:00:00".
2. REGRA DE INCONSISTÊNCIA DE DATA SOLICITADA PELO USUÁRIO:
   Como o usuário informou apenas o termo relativo ("domingo") sem a data formal do calendário, você DEVE gerar uma inconsistência no campo "date" contendo na sugestão a pergunta de confirmação exata:
   - issue: "A data formal do calendário não foi informada explicitamente no texto (você citou apenas o dia da semana)."
   - suggestion: "Considerando que hoje é {dia_semana} ({hoje_formatado}), a data será no próximo domingo, dia 08/11/2026 às 19:00? Clique em Corrigir para confirmar e aplicar esta data."
   - severity: "warning" """

    async def _retrieve_location_memory(self) -> Dict[str, Any]:
        """Recupera os locais e endereços mais utilizados em eventos passados para atuar como memória."""
        memory: Dict[str, Any] = {
            "has_memory": False,
            "habitual_name": "Templo Principal",
            "habitual_address": "Templo Principal da Igreja",
            "habitual_maps_url": "",
            "history_list": [],
        }

        if not self._repository:
            return memory

        try:
            events = await self._repository.list_all(limit=15)
            loc_counts: Dict[str, int] = {}
            loc_details: Dict[str, Dict[str, Any]] = {}

            for ev in events:
                loc = ev.location.strip() if ev.location else ""
                if loc:
                    loc_counts[loc] = loc_counts.get(loc, 0) + 1
                    if ev.address_details and not loc_details.get(loc):
                        loc_details[loc] = ev.address_details
                    if loc not in memory["history_list"]:
                        memory["history_list"].append(loc)

            if loc_counts:
                # Prioriza o local com endereço estruturado ou mais frequente
                best_loc = max(loc_counts, key=loc_counts.get)
                memory["has_memory"] = True
                memory["habitual_name"] = best_loc

                addr_info = loc_details.get(best_loc)
                if addr_info:
                    memory["habitual_address"] = addr_info.get("formatted_address", best_loc)
                    memory["habitual_maps_url"] = addr_info.get("maps_url", "")
                else:
                    memory["habitual_address"] = best_loc

        except Exception as e:
            logger.warning(f"Erro ao recuperar memória de locais dos eventos: {e}")

        return memory

    def _build_system_prompt(self, temporal_ctx: str, location_memory: Dict[str, Any]) -> str:
        """Monta o prompt com instruções de consistência, tempo real e memória de igreja."""
        loc_mem_ctx = f"""MEMÓRIA DE LOCALIZAÇÃO DA IGREJA:
- Local Habitual dos Cultos Anteriores: {location_memory['habitual_name']}
- Endereço / Detalhes Conhecidos: {location_memory['habitual_address']}
- Histórico de outros locais já cadastrados: {', '.join(location_memory['history_list']) or 'Nenhum'}

INSTRUÇÃO DE LOCALIZAÇÃO E MEMÓRIA:
1. Se o organizador NÃO especificou um novo endereço completo no briefing (ex: apenas disse "culto de ceia", "no templo", "na igreja" ou omitiu local):
   - Adote o local habitual ({location_memory['habitual_name']}) como sugestão em "location_data".
   - Preencha o objeto "location_memory":
     {{
       "has_previous_location": true,
       "previous_location_name": "{location_memory['habitual_name']}",
       "previous_formatted_address": "{location_memory['habitual_address']}",
       "previous_maps_url": "{location_memory.get('habitual_maps_url', '')}",
       "confirmation_prompt": "Identificamos nos cultos anteriores que o local habitual da igreja é '{location_memory['habitual_name']}'. Deseja manter esta mesma localidade ou informar um novo endereço/CEP?",
       "is_confirmed_from_history": true
     }}
   - Gere uma inconsistência no campo "location":
     - issue: "O endereço detalhado do local não foi informado no briefing."
     - suggestion: "Nos cultos anteriores a igreja utilizou '{location_memory['habitual_name']}'. O culto será nesta mesma localidade? Clique em Corrigir para confirmar ou informe um novo CEP."
     - severity: "warning"
"""

        return f"""Você é o Assistente Executivo e Teológico Sênior de Planejamento de Cultos e Eventos da Igreja.
Sua missão é atuar como um Copiloto Inteligente para líderes e pastores, estruturando eventos impecáveis, concisos, sem inconsistências e com altíssima precisão de datas e locais.

{temporal_ctx}

{loc_mem_ctx}

Analise os dados fornecidos e retorne ESTRITAMENTE um objeto JSON válido com a seguinte estrutura:
{{
  "suggested_title": "Título conciso, forte e homilético para o culto (ex: 'Culto de Celebração e Santa Ceia')",
  "suggested_theme": "Tema bíblico ou teológico central",
  "suggested_description": "Descrição concisa (2 a 4 frases) comunicando com clareza o propósito, liturgia e relevância do culto",
  "suggested_date": "YYYY-MM-DDTHH:MM:SS (data/hora ISO calculada a partir de HOJE e do horário mencionado)",
  "location_data": {{
    "place_name": "Nome do local ou templo",
    "formatted_address": "Endereço completo estruturado (Rua, Número, Bairro, Cidade - UF)",
    "maps_url": "https://www.google.com/maps/search/?api=1&query=ENDERECO_URL_ENCODED",
    "city": "Cidade",
    "neighborhood": "Bairro",
    "cep": "CEP se dedutível ou vazio"
  }},
  "location_memory": {{
    "has_previous_location": true,
    "previous_location_name": "Nome do local habitual",
    "previous_formatted_address": "Endereço habitual dos cultos anteriores",
    "previous_maps_url": "URL do maps habitual",
    "confirmation_prompt": "Identificamos nos cultos anteriores que o local habitual da igreja é '...'. Deseja manter esta mesma localidade ou informar um novo endereço/CEP?",
    "is_confirmed_from_history": true
  }},
  "suggested_banner_url": "URL de uma foto em alta definição que case com o tema (Unsplash)",
  "banner_alternatives": [
    "URL alternativa 1",
    "URL alternativa 2",
    "URL alternativa 3",
    "URL alternativa 4"
  ],
  "planning": {{
    "publico_alvo": "Famílias, Jovens, Toda a congregação, etc.",
    "versiculo_base": "Livro Capítulo:Versículo de apoio",
    "ordem_culto": [
      {{"etapa": "Oração Inicial e Boas-Vindas", "tempo_minutos": 10}},
      {{"etapa": "Louvor e Adoração Congregacional", "tempo_minutos": 25}},
      {{"etapa": "Ministração da Palavra (Sermão)", "tempo_minutos": 45}},
      {{"etapa": "Celebração da Santa Ceia (se aplicável)", "tempo_minutos": 15}},
      {{"etapa": "Momento de Apelo e Oração Final", "tempo_minutos": 10}}
    ]
  }},
  "inconsistencies": [
    {{
      "field": "title | date | location | theme | description",
      "issue": "Explicação clara do problema detectado",
      "suggestion": "Sugestão de correção pontual",
      "severity": "warning"
    }}
  ],
  "questions": [
    "Pergunta inteligente para o organizador se faltar algum dado relevante"
  ]
}}

REGRAS OBRIGATÓRIAS:
1. Se o briefing citar "culto de ceia", inclua no título/tema e certifique-se de que a etapa de Santa Ceia do Senhor conste na ordem do culto com o texto bíblico de 1 Coríntios 11:23-26.
2. Forneça sempre 4 URLs de banners com temas cristãos/sacros (adoration, bible, communion, youth-church, worship, cross, prayer).
3. O retorno DEVE ser EXCLUSIVAMENTE o JSON válido, sem nenhum texto explicativo fora das chaves."""

    def _sync_gemini_assist(
        self,
        request: EventAIAssistRequestDTO,
        settings,
        temporal_ctx: str,
        location_memory: Dict[str, Any]
    ) -> EventAIAssistResponseDTO:
        client = genai.Client(api_key=settings.GEMINI_API_KEY)
        system_prompt = self._build_system_prompt(temporal_ctx, location_memory)

        user_content = f"""DADOS FORNECIDOS PELO ORGANIZADOR:
- Briefing Livre / Roteiro: {request.input_text or 'Não informado'}
- Título Atual: {request.current_title or 'Não informado'}
- Data/Horário Atual: {request.current_date or 'Não informado'}
- Local Informado: {request.current_location or 'Não informado'}
- Tema Atual: {request.current_theme or 'Não informado'}
- Descrição Atual: {request.current_description or 'Não informado'}

Analise com inteligência temporal e memória de localização, identificando se há necessidade de confirmação do local habitual e calculando datas relativas perfeitamente."""

        models_to_try = [settings.GEMINI_MODEL, "gemini-3.5-flash-lite", "gemini-3.1-flash-lite"]
        last_error = None

        for target_model in models_to_try:
            try:
                response = client.models.generate_content(
                    model=target_model,
                    contents=[
                        types.Part.from_text(text=system_prompt),
                        types.Part.from_text(text=user_content),
                    ],
                    config=types.GenerateContentConfig(
                        response_mime_type="application/json",
                        temperature=0.2,
                    ),
                )
                raw_text = response.text or "{}"
                data = self._parse_json(raw_text)
                return self._build_dto(data, location_memory)
            except Exception as e:
                last_error = e
                logger.warning(f"Tentativa com modelo {target_model} falhou: {e}. Tentando modelo alternativo...")
                continue

        logger.error(f"Erro em todos os modelos do Copiloto IA: {last_error}", exc_info=True)
        raise AIProcessingException(f"Falha na assistência inteligente de eventos: {str(last_error)}")

    def _sync_gemini_assist_audio(
        self,
        audio_bytes: bytes,
        mime_type: str,
        settings,
        temporal_ctx: str,
        location_memory: Dict[str, Any]
    ) -> EventAIAssistResponseDTO:
        client = genai.Client(api_key=settings.GEMINI_API_KEY)
        system_prompt = self._build_system_prompt(temporal_ctx, location_memory)

        audio_part = types.Part.from_bytes(data=audio_bytes, mime_type=mime_type or "audio/wav")
        instruction_part = types.Part.from_text(
            text=f"{system_prompt}\n\nOuça atentamente o áudio acima com as diretrizes do organizador do culto e estruture os dados do evento com consciência temporal e memória de locais."
        )

        models_to_try = [settings.GEMINI_MODEL, "gemini-3.5-flash-lite", "gemini-3.1-flash-lite"]
        last_error = None

        for target_model in models_to_try:
            try:
                response = client.models.generate_content(
                    model=target_model,
                    contents=[audio_part, instruction_part],
                    config=types.GenerateContentConfig(
                        response_mime_type="application/json",
                        temperature=0.2,
                    ),
                )
                raw_text = response.text or "{}"
                data = self._parse_json(raw_text)
                return self._build_dto(data, location_memory)
            except Exception as e:
                last_error = e
                logger.warning(f"Tentativa com modelo {target_model} para áudio falhou: {e}. Tentando modelo alternativo...")
                continue

        logger.error(f"Erro em todos os modelos do Copiloto IA para áudio: {last_error}", exc_info=True)
        raise AIProcessingException(f"Falha ao processar áudio da agenda com IA: {str(last_error)}")

    def _parse_json(self, text: str) -> Dict[str, Any]:
        cleaned = text.strip()
        if cleaned.startswith("```"):
            cleaned = re.sub(r"^```[a-zA-Z]*\n?", "", cleaned)
            cleaned = re.sub(r"\n?```$", "", cleaned)
        return json.loads(cleaned.strip())

    def _build_dto(self, data: Dict[str, Any], location_memory: Dict[str, Any]) -> EventAIAssistResponseDTO:
        inconsistencies = [
            InconsistencyItemDTO(
                field=inc.get("field", "geral"),
                issue=inc.get("issue", ""),
                suggestion=inc.get("suggestion", ""),
                severity=inc.get("severity", "warning"),
            )
            for inc in data.get("inconsistencies", [])
        ]

        # Garantia de banners inspiradores temáticos caso a IA omita
        default_banner = "https://images.unsplash.com/photo-1438232992991-995b7058bbb3?q=80&w=1200&auto=format&fit=crop"
        banner_url = data.get("suggested_banner_url") or default_banner
        alternatives = data.get("banner_alternatives") or [
            "https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?q=80&w=1200&auto=format&fit=crop",
            "https://images.unsplash.com/photo-1544427920-c49ccfb85579?q=80&w=1200&auto=format&fit=crop",
            "https://images.unsplash.com/photo-1507692049790-de58290a4334?q=80&w=1200&auto=format&fit=crop",
            "https://images.unsplash.com/photo-1519791883288-dc8bd696e667?q=80&w=1200&auto=format&fit=crop",
        ]

        loc = data.get("location_data", {})
        if not loc.get("maps_url") and loc.get("formatted_address"):
            import urllib.parse
            q = urllib.parse.quote(loc["formatted_address"])
            loc["maps_url"] = f"https://www.google.com/maps/search/?api=1&query={q}"

        # Montagem da memória de localização
        loc_mem_data = data.get("location_memory") or {}
        location_memory_dto = None
        if loc_mem_data or location_memory.get("has_memory"):
            location_memory_dto = LocationMemoryDTO(
                has_previous_location=loc_mem_data.get("has_previous_location", location_memory.get("has_memory", False)),
                previous_location_name=loc_mem_data.get("previous_location_name", location_memory.get("habitual_name")),
                previous_formatted_address=loc_mem_data.get("previous_formatted_address", location_memory.get("habitual_address")),
                previous_maps_url=loc_mem_data.get("previous_maps_url", location_memory.get("habitual_maps_url")),
                confirmation_prompt=loc_mem_data.get(
                    "confirmation_prompt",
                    f"Identificamos nos cultos anteriores que o local habitual é '{location_memory.get('habitual_name')}'. Deseja confirmar este mesmo local ou informar um novo?",
                ),
                is_confirmed_from_history=loc_mem_data.get("is_confirmed_from_history", True),
            )

        return EventAIAssistResponseDTO(
            suggested_title=data.get("suggested_title", "Culto de Celebração"),
            suggested_theme=data.get("suggested_theme", "Edificação e Vida"),
            suggested_description=data.get(
                "suggested_description",
                "Um momento especial de comunhão, adoração e reflexão bíblica.",
            ),
            suggested_date=data.get("suggested_date"),
            location_data=loc,
            location_memory=location_memory_dto,
            suggested_banner_url=banner_url,
            banner_alternatives=alternatives,
            planning=data.get("planning", {}),
            inconsistencies=inconsistencies,
            questions=data.get("questions", []),
        )

