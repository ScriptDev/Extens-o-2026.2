import json
import logging
import uuid
from typing import Any, Dict, List, Optional
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, Field

from google import genai
from google.genai import types

from app.config import get_settings
from app.infrastructure.database.connection_pool import get_pool
from app.presentation.routers.teens_routes import get_current_user
from app.presentation.schemas import (
    MinistryResponseDTO,
    MinistryCreateDTO,
    MinistryAISuggestionDTO,
)

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/ministries", tags=["Ministérios e Brasões em Kanji"])


async def require_pastor_or_admin(current_user: Optional[Dict[str, Any]] = Depends(get_current_user)) -> Dict[str, Any]:
    """Valida que o usuário é Pastor ou Administrador para gerenciar ministérios."""
    if not current_user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Autenticação requerida."
        )
    role = current_user.get("role")
    if role not in ["PASTOR", "ADMIN"]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Acesso restrito: apenas Pastores ou Administradores podem gerenciar ministérios e brasões."
        )
    return current_user


@router.get("", response_model=List[MinistryResponseDTO], summary="Lista os ministérios oficiais da igreja")
async def list_ministries():
    """
    Retorna todos os ministérios ativos criados pela liderança pastoral,
    com seus ideogramas em Kanji, significados e códigos SVG de brasões.
    """
    pool = await get_pool()
    if not pool:
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail="Banco de dados indisponível.")

    async with pool.acquire() as conn:
        rows = await conn.fetch("SELECT * FROM public.ministries ORDER BY created_at ASC")
        return [
            MinistryResponseDTO(
                id=str(r["id"]),
                name=r["name"],
                description=r["description"],
                kanji_symbol=r["kanji_symbol"],
                kanji_meaning=r["kanji_meaning"],
                badge_svg=r["badge_svg"],
                primary_color=r["primary_color"],
                created_at=r["created_at"]
            )
            for r in rows
        ]


@router.post("", response_model=MinistryResponseDTO, status_code=status.HTTP_201_CREATED, summary="Cadastra um novo ministério oficial")
async def create_ministry(
    payload: MinistryCreateDTO,
    current_user: Dict[str, Any] = Depends(require_pastor_or_admin)
):
    """
    Cria um ministério na lista oficial com nome, significado, kanji e brasão vetorial SVG.
    """
    pool = await get_pool()
    if not pool:
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail="Banco de dados indisponível.")

    creator_id = uuid.UUID(str(current_user["id"])) if current_user.get("id") else None

    async with pool.acquire() as conn:
        existing = await conn.fetchrow("SELECT id FROM public.ministries WHERE name = $1", payload.name.strip())
        if existing:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Já existe um ministério com este nome.")

        row = await conn.fetchrow("""
            INSERT INTO public.ministries (name, description, kanji_symbol, kanji_meaning, badge_svg, primary_color, created_by)
            VALUES ($1, $2, $3, $4, $5, $6, $7)
            RETURNING *;
        """, payload.name.strip(), payload.description, payload.kanji_symbol.strip(), payload.kanji_meaning.strip(), payload.badge_svg, payload.primary_color, creator_id)

        return MinistryResponseDTO(
            id=str(row["id"]),
            name=row["name"],
            description=row["description"],
            kanji_symbol=row["kanji_symbol"],
            kanji_meaning=row["kanji_meaning"],
            badge_svg=row["badge_svg"],
            primary_color=row["primary_color"],
            created_at=row["created_at"]
        )


@router.delete("/{ministry_id}", status_code=status.HTTP_200_OK, summary="Exclui um ministério da lista oficial")
async def delete_ministry(
    ministry_id: str,
    current_user: Dict[str, Any] = Depends(require_pastor_or_admin)
):
    """
    Remove um ministério oficial do catálogo da igreja.
    """
    try:
        min_uuid = uuid.UUID(ministry_id)
    except ValueError:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="ID de ministério inválido.")

    pool = await get_pool()
    if not pool:
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail="Banco de dados indisponível.")

    async with pool.acquire() as conn:
        res = await conn.execute("DELETE FROM public.ministries WHERE id = $1", min_uuid)
        if res == "DELETE 0":
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Ministério não encontrado.")

    return {"message": "Ministério removido com sucesso.", "id": ministry_id}


class AISuggestMinistryRequest(BaseModel):
    theme_hint: Optional[str] = Field(None, description="Dica ou tema do ministério desejado (ex: Jovens, Casais, Comunicação, Louvor)")


@router.post("/ai-suggest", response_model=List[MinistryAISuggestionDTO], summary="Gera sugestões de ministérios com Brasões e Ideogramas Japoneses (Kanji)")
async def ai_suggest_ministry(
    payload: AISuggestMinistryRequest,
    current_user: Dict[str, Any] = Depends(require_pastor_or_admin)
):
    """
    Utiliza o Google Gemini para sugerir 3 propostas de ministérios com:
    - Nome cristão/teológico marcante
    - Ideograma japonês (Kanji legítimo de alto impacto visual)
    - Significado teológico e versículo bíblico
    - Paleta de cores moderna
    - Código SVG do brasão pronto para renderização
    """
    hint = payload.theme_hint or "Ministério da igreja cristã"

    prompt = f"""Você é um especialista em Design Cristão, Homilética e Heráldica Japonesa.
O Pastor solicitou sugestões para um novo Ministério Oficial na igreja.
Dica/Foco informado: "{hint}".

Gere exatamente 3 sugestões completas em JSON, cada uma com:
- "name": Nome do ministério criativo e inspirador (ex: "Metanoia Teens", "Hikari Jovens", "Kizuna Comunhão", "Moriá Famílias", "Chikara Força", "Inochi Vida", "Sei Santidade").
- "description": Propósito claro do ministério para a juventude ou membros.
- "kanji_symbol": Um ÚNICO ideograma japonês (Kanji) que resume a virtude bíblica (ex: 光, 絆, 勇, 聖, 命, 道, 力, 栄, 愛, 信).
- "kanji_meaning": Nome em romaji e tradução bíblica (ex: "Hikari (Luz do Mundo)", "Kizuna (Vínculo da Paz)").
- "biblical_reference": Versículo bíblico de suporte (Livro Capítulo:Versículo).
- "primary_color": Código hexadecimal de destaque da cor (ex: "#8B5CF6", "#EC4899", "#3B82F6", "#10B981", "#F59E0B").
- "badge_svg": Código SVG VÁLIDO e auto-contido (viewBox="0 0 100 100"), contendo um brasão poligonal ou circular escuro moderno com gradiente na borda, o kanji_symbol centralizado em texto grande (font-size 32-36, fill branco, drop-shadow neon).

Responda ESTRITAMENTE em formato JSON com a seguinte estrutura:
[
  {{
    "name": "...",
    "description": "...",
    "kanji_symbol": "...",
    "kanji_meaning": "...",
    "biblical_reference": "...",
    "primary_color": "...",
    "badge_svg": "<svg viewBox=\\"0 0 100 100\\" xmlns=\\"http://www.w3.org/2000/svg\\" class=\\"w-full h-full\\">...</svg>"
  }}
]
"""

    settings = get_settings()
    client = genai.Client(api_key=settings.GEMINI_API_KEY)
    response_text = ""
    # Tenta com gemini-3.5-flash-lite ou gemini-3.1-flash-lite
    for model_name in ["gemini-3.5-flash-lite", "gemini-3.1-flash-lite"]:
        try:
            resp = client.models.generate_content(
                model=model_name,
                contents=prompt,
            )
            response_text = resp.text or ""
            if response_text:
                break
        except Exception as e:
            logger.warning(f"Tentativa com {model_name} falhou: {e}")

    # Sanitização do JSON
    clean_json = response_text.strip()
    if clean_json.startswith("```json"):
        clean_json = clean_json[7:]
    if clean_json.startswith("```"):
        clean_json = clean_json[3:]
    if clean_json.endswith("```"):
        clean_json = clean_json[:-3]
    clean_json = clean_json.strip()

    try:
        suggestions_data = json.loads(clean_json)
        if isinstance(suggestions_data, list):
            return [MinistryAISuggestionDTO(**item) for item in suggestions_data[:3]]
    except Exception as e:
        logger.error(f"Erro ao parsear sugestões de ministério: {e}. Raw: {response_text[:200]}")

    # Fallback determinístico caso haja oscilação na IA
    return [
        MinistryAISuggestionDTO(
            name="Ministério Hikari (Luz)",
            description="Chamados para resplandecer como luzeiros no mundo em santidade e verdade.",
            kanji_symbol="光",
            kanji_meaning="Hikari (Luz do Mundo)",
            biblical_reference="Mateus 5:14",
            primary_color="#8B5CF6",
            badge_svg="""<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg" class="w-full h-full drop-shadow-[0_0_12px_rgba(139,92,246,0.6)]">
  <defs>
    <linearGradient id="grad-h1" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#8B5CF6"/>
      <stop offset="100%" stop-color="#EC4899"/>
    </linearGradient>
  </defs>
  <polygon points="50,4 92,26 92,74 50,96 8,74 8,26" fill="#0f0728" stroke="url(#grad-h1)" stroke-width="4" stroke-linejoin="round"/>
  <circle cx="50" cy="50" r="30" fill="#1e1045" stroke="#A855F7" stroke-width="1.5" stroke-dasharray="3,2"/>
  <text x="50" y="62" font-size="34" font-weight="900" font-family="'Noto Sans JP', sans-serif" fill="#FFFFFF" text-anchor="middle" filter="drop-shadow(0 0 6px #C084FC)">光</text>
</svg>"""
        ),
        MinistryAISuggestionDTO(
            name="Ministério Kizuna (Comunhão)",
            description="Edificação do corpo de Cristo no vínculo perfeito do amor fraternal.",
            kanji_symbol="絆",
            kanji_meaning="Kizuna (Vínculo da Paz)",
            biblical_reference="Colossenses 3:14",
            primary_color="#EC4899",
            badge_svg="""<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg" class="w-full h-full drop-shadow-[0_0_12px_rgba(236,72,153,0.6)]">
  <defs>
    <linearGradient id="grad-k1" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#EC4899"/>
      <stop offset="100%" stop-color="#FB7185"/>
    </linearGradient>
  </defs>
  <polygon points="50,4 94,50 50,96 6,50" fill="#240718" stroke="url(#grad-k1)" stroke-width="4" stroke-linejoin="round"/>
  <circle cx="50" cy="50" r="28" fill="#3b0c29" stroke="#F472B6" stroke-width="1.5"/>
  <text x="50" y="61" font-size="32" font-weight="900" font-family="'Noto Sans JP', sans-serif" fill="#FFFFFF" text-anchor="middle" filter="drop-shadow(0 0 6px #FB7185)">絆</text>
</svg>"""
        ),
        MinistryAISuggestionDTO(
            name="Ministério Yū (Coragem)",
            description="Juventude inabalável para testemunhar do Evangelho com intrepidez e autoridade.",
            kanji_symbol="勇",
            kanji_meaning="Yū (Coragem e Bravura)",
            biblical_reference="Josué 1:9",
            primary_color="#3B82F6",
            badge_svg="""<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg" class="w-full h-full drop-shadow-[0_0_12px_rgba(59,130,246,0.6)]">
  <defs>
    <linearGradient id="grad-y1" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#3B82F6"/>
      <stop offset="100%" stop-color="#06B6D4"/>
    </linearGradient>
  </defs>
  <circle cx="50" cy="50" r="44" fill="#071933" stroke="url(#grad-y1)" stroke-width="4"/>
  <text x="50" y="62" font-size="34" font-weight="900" font-family="'Noto Sans JP', sans-serif" fill="#FFFFFF" text-anchor="middle" filter="drop-shadow(0 0 6px #60A5FA)">勇</text>
</svg>"""
        )
    ]
