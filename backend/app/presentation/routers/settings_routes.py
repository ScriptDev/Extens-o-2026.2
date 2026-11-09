import json
import logging
import uuid
from typing import List, Optional, Dict, Any
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, Field

from app.infrastructure.database.connection_pool import get_pool
from app.presentation.schemas import ChurchSettingsDTO, UpdateTerminologyDTO, SuggestTagDTO
from app.presentation.routers.teens_routes import get_current_user

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/settings", tags=["Configurações e Terminologia da Igreja"])


def require_pastor_or_admin(current_user: Optional[Dict[str, Any]] = Depends(get_current_user)) -> Dict[str, Any]:
    if not current_user or current_user.get("role") not in ["PASTOR", "ADMIN"]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Apenas Pastores ou Administradores podem alterar a terminologia da igreja."
        )
    return current_user


@router.get(
    "/terminology",
    response_model=ChurchSettingsDTO,
    status_code=status.HTTP_200_OK,
    summary="Recupera a terminologia oficial e tags da igreja"
)
async def get_terminology():
    pool = await get_pool()
    if not pool:
        return ChurchSettingsDTO(
            church_name="Comunidade Teens",
            group_singular="Ministério",
            group_plural="Ministérios",
            available_tags=["#Teatro", "#Louvor", "#Intercessão", "#Mídia", "#Acolhimento", "#Dança", "#Geral"],
            tag_suggestions=[],
        )

    async with pool.acquire() as conn:
        row = await conn.fetchrow("SELECT * FROM public.church_settings WHERE id = 'default'")
        if not row:
            return ChurchSettingsDTO(
                church_name="Comunidade Teens",
                group_singular="Ministério",
                group_plural="Ministérios",
                available_tags=["#Teatro", "#Louvor", "#Intercessão", "#Mídia", "#Acolhimento", "#Dança", "#Geral"],
                tag_suggestions=[],
            )

        tags_raw = row.get("available_tags")
        if isinstance(tags_raw, str):
            try:
                available_tags = json.loads(tags_raw)
            except Exception:
                available_tags = ["#Geral"]
        elif isinstance(tags_raw, list):
            available_tags = tags_raw
        else:
            available_tags = ["#Geral"]

        sugg_raw = row.get("tag_suggestions")
        if isinstance(sugg_raw, str):
            try:
                tag_suggestions = json.loads(sugg_raw)
            except Exception:
                tag_suggestions = []
        elif isinstance(sugg_raw, list):
            tag_suggestions = sugg_raw
        else:
            tag_suggestions = []

        return ChurchSettingsDTO(
            church_name=row.get("church_name") or "Comunidade Teens",
            group_singular=row.get("group_singular") or "Ministério",
            group_plural=row.get("group_plural") or "Ministérios",
            available_tags=available_tags,
            tag_suggestions=tag_suggestions,
            updated_at=row.get("updated_at")
        )


@router.patch(
    "/terminology",
    response_model=ChurchSettingsDTO,
    status_code=status.HTTP_200_OK,
    summary="Atualiza a terminologia oficial (Exclusivo Pastor/Admin)"
)
async def update_terminology(
    payload: UpdateTerminologyDTO,
    current_user: Dict[str, Any] = Depends(require_pastor_or_admin)
):
    pool = await get_pool()
    if not pool:
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail="Banco de dados indisponível.")

    async with pool.acquire() as conn:
        current_row = await conn.fetchrow("SELECT * FROM public.church_settings WHERE id = 'default'")
        
        church_name = payload.church_name or (current_row["church_name"] if current_row else "Comunidade Teens")
        group_singular = payload.group_singular or (current_row["group_singular"] if current_row else "Ministério")
        group_plural = payload.group_plural or (current_row["group_plural"] if current_row else "Ministérios")
        
        if payload.available_tags is not None:
            tags_json = json.dumps(payload.available_tags)
        elif current_row and current_row["available_tags"]:
            tags_json = current_row["available_tags"] if isinstance(current_row["available_tags"], str) else json.dumps(current_row["available_tags"])
        else:
            tags_json = json.dumps(["#Teatro", "#Louvor", "#Intercessão", "#Mídia", "#Acolhimento", "#Dança", "#Geral"])

        await conn.execute("""
            INSERT INTO public.church_settings (id, church_name, group_singular, group_plural, available_tags, updated_at)
            VALUES ('default', $1, $2, $3, $4::jsonb, NOW())
            ON CONFLICT (id) DO UPDATE SET
                church_name = EXCLUDED.church_name,
                group_singular = EXCLUDED.group_singular,
                group_plural = EXCLUDED.group_plural,
                available_tags = EXCLUDED.available_tags,
                updated_at = NOW();
        """, church_name, group_singular, group_plural, tags_json)

        logger.info(f"Terminologia da igreja atualizada por {current_user['name']}: {group_singular} / {group_plural}")

    return await get_terminology()


@router.post(
    "/terminology/suggest-tag",
    status_code=status.HTTP_201_CREATED,
    summary="Líderes sugerem novas tags para aprovação pastoral"
)
async def suggest_tag(
    payload: SuggestTagDTO,
    current_user: Optional[Dict[str, Any]] = Depends(get_current_user)
):
    if not current_user:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Não autenticado.")

    pool = await get_pool()
    if not pool:
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail="Banco de dados indisponível.")

    clean_tag = payload.tag.strip()
    if not clean_tag.startswith("#"):
        clean_tag = f"#{clean_tag}"

    async with pool.acquire() as conn:
        current_row = await conn.fetchrow("SELECT tag_suggestions, available_tags FROM public.church_settings WHERE id = 'default'")
        
        current_tags = []
        if current_row and current_row.get("available_tags"):
            val = current_row["available_tags"]
            current_tags = json.loads(val) if isinstance(val, str) else val

        if clean_tag in current_tags:
            return {"message": f"A tag {clean_tag} já está ativa e disponível.", "tag": clean_tag}

        suggestions = []
        if current_row and current_row.get("tag_suggestions"):
            val = current_row["tag_suggestions"]
            suggestions = json.loads(val) if isinstance(val, str) else val

        new_suggestion = {
            "id": str(uuid.uuid4()),
            "tag": clean_tag,
            "justification": payload.justification or "Sugerida por líder ministerial",
            "suggested_by_id": str(current_user["id"]),
            "suggested_by_name": current_user.get("name") or "Líder",
            "status": "pending",
        }
        suggestions.append(new_suggestion)

        await conn.execute("""
            UPDATE public.church_settings 
            SET tag_suggestions = $1::jsonb, updated_at = NOW() 
            WHERE id = 'default';
        """, json.dumps(suggestions))

        # Notifica os pastores sobre a nova sugestão de tag
        pastors = await conn.fetch("SELECT id FROM public.users WHERE role IN ('PASTOR', 'ADMIN') AND active = true")
        for p in pastors:
            await conn.execute("""
                INSERT INTO public.notifications (user_id, title, message, type)
                VALUES ($1, $2, $3, 'announcement');
            """, p["id"], f"Nova Sugestão de Tag: {clean_tag}", f"O líder {current_user.get('name')} sugeriu a tag '{clean_tag}'.")

    return {"message": f"Sugestão da tag '{clean_tag}' encaminhada com sucesso para o colegiado pastoral.", "suggestion": new_suggestion}


@router.post(
    "/terminology/approve-tag/{suggestion_id}",
    status_code=status.HTTP_200_OK,
    summary="Pastor aprova uma sugestão de tag e incorpora às tags oficiais"
)
async def approve_tag_suggestion(
    suggestion_id: str,
    current_user: Dict[str, Any] = Depends(require_pastor_or_admin)
):
    pool = await get_pool()
    if not pool:
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail="Banco de dados indisponível.")

    async with pool.acquire() as conn:
        current_row = await conn.fetchrow("SELECT tag_suggestions, available_tags FROM public.church_settings WHERE id = 'default'")
        if not current_row:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Configurações não localizadas.")

        suggestions = json.loads(current_row["tag_suggestions"]) if isinstance(current_row["tag_suggestions"], str) else current_row["tag_suggestions"]
        available_tags = json.loads(current_row["available_tags"]) if isinstance(current_row["available_tags"], str) else current_row["available_tags"]

        target = None
        remaining_suggestions = []
        for s in suggestions:
            if s.get("id") == suggestion_id:
                target = s
            else:
                remaining_suggestions.append(s)

        if not target:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Sugestão de tag não encontrada.")

        tag_name = target["tag"]
        if tag_name not in available_tags:
            available_tags.append(tag_name)

        await conn.execute("""
            UPDATE public.church_settings 
            SET available_tags = $1::jsonb, tag_suggestions = $2::jsonb, updated_at = NOW() 
            WHERE id = 'default';
        """, json.dumps(available_tags), json.dumps(remaining_suggestions))

    return {"message": f"Tag '{tag_name}' aprovada e adicionada às tags oficiais!", "available_tags": available_tags}

