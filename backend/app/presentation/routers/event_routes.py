import re
import urllib.parse
from typing import List, Optional, Dict, Any
import logging
import uuid
from datetime import datetime, timezone
import httpx
from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File

from app.domain.entities import Event
from app.domain.ports.event_repository import IEventRepository
from app.infrastructure.database.prisma_event_repository import PrismaEventRepository
from app.presentation.schemas import (
    EventCreateDTO,
    EventResponseDTO,
    EventInviteResponseDTO,
    SermonOutlineResponseDTO,
    StructuredContentDTO,
    EventAIAssistRequestDTO,
    EventAIAssistResponseDTO,
    CEPAddressResponseDTO,
    ProposeEventChangesDTO,
)
from app.presentation.routers.sermon_routes import map_entity_to_response as map_sermon_to_response
from app.presentation.routers.teens_routes import require_leader_or_pastor, get_current_user
from app.infrastructure.database.connection_pool import get_pool
from app.use_cases.create_event import CreateEventInputDTO, CreateEventUseCase
from app.use_cases.list_events import ListEventsUseCase
from app.use_cases.get_event import GetEventUseCase
from app.use_cases.generate_event_invite import GenerateEventInviteUseCase
from app.use_cases.ai_assist_event import AIAssistEventUseCase

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/events", tags=["Agenda de Eventos e Cultos"])


# ==============================================================================
# Injeção de Dependências (DIP / Clean Architecture)
# ==============================================================================

def get_event_repository() -> IEventRepository:
    return PrismaEventRepository()


def get_create_event_use_case(
    repository: IEventRepository = Depends(get_event_repository)
) -> CreateEventUseCase:
    return CreateEventUseCase(repository=repository)


def get_list_events_use_case(
    repository: IEventRepository = Depends(get_event_repository)
) -> ListEventsUseCase:
    return ListEventsUseCase(repository=repository)


def get_event_details_use_case(
    repository: IEventRepository = Depends(get_event_repository)
) -> GetEventUseCase:
    return GetEventUseCase(repository=repository)


def get_generate_invite_use_case(
    repository: IEventRepository = Depends(get_event_repository)
) -> GenerateEventInviteUseCase:
    return GenerateEventInviteUseCase(repository=repository)


def get_ai_assist_event_use_case(
    repository: IEventRepository = Depends(get_event_repository)
) -> AIAssistEventUseCase:
    return AIAssistEventUseCase(repository=repository)


# ==============================================================================
# Helper de Mapeamento
# ==============================================================================

def map_event_to_response(event: Event) -> EventResponseDTO:
    sermon_dto = None
    if event.sermon:
        sermon_dto = map_sermon_to_response(event.sermon)

    return EventResponseDTO(
        id=str(event.id),
        title=event.title,
        date=event.date,
        location=event.location,
        theme=event.theme,
        description=event.description,
        cover_image=event.cover_image,
        address_details=event.address_details,
        planning=event.planning,
        status=getattr(event, "status", "published") or "published",
        ministry_id=getattr(event, "ministry_id", None),
        ministry_name=getattr(event, "ministry_name", None),
        responsible_id=getattr(event, "responsible_id", None),
        responsible_name=getattr(event, "responsible_name", None),
        approved_by=getattr(event, "approved_by", None),
        tags=getattr(event, "tags", []) or [],
        is_global=bool(getattr(event, "is_global", False)),
        proposed_date=getattr(event, "proposed_date", None),
        proposed_location=getattr(event, "proposed_location", None),
        pastor_notes=getattr(event, "pastor_notes", None),
        proposed_by=getattr(event, "proposed_by", None),
        has_sermon=event.has_sermon,
        is_past=event.is_past,
        sermon=sermon_dto,
        created_at=event.created_at,
    )


# ==============================================================================
# Endpoints da Agenda de Cultos
# ==============================================================================

@router.post(
    "",
    response_model=EventResponseDTO,
    status_code=status.HTTP_201_CREATED,
    summary="Cadastra um novo culto ou evento na agenda (Exclusivo para Pastores e Líderes)"
)
async def create_event(
    payload: EventCreateDTO,
    use_case: CreateEventUseCase = Depends(get_create_event_use_case),
    current_user: Optional[Dict[str, Any]] = Depends(require_leader_or_pastor)
):
    """
    Cadastra um culto futuro no calendário.
    - Se criado por Pastor ou Admin: 'published' imediato.
    - Se criado por Líder: 'pending_pastor_approval' (requer aprovação pastoral antes de ficar visível ao público).
    """
    user_role = current_user.get("role") if current_user else "LEADER"
    user_id = str(current_user["id"]) if current_user and current_user.get("id") else None
    user_name = current_user.get("name") if current_user else "Líder"

    # Define status de aprovação
    if user_role in ["PASTOR", "ADMIN"]:
        event_status = "published"
        approved_by = user_id
    else:
        event_status = "pending_pastor_approval"
        approved_by = None

    # Consulta nome do ministério se informado
    ministry_name = None
    event_tags = list(payload.tags or [])
    if payload.ministry_id:
        try:
            pool = await get_pool()
            if pool:
                async with pool.acquire() as conn:
                    min_row = await conn.fetchrow(
                        "SELECT name FROM public.ministries WHERE id = $1",
                        uuid.UUID(str(payload.ministry_id))
                    )
                    if min_row:
                        ministry_name = min_row["name"]
                        tag_slug = "#" + re.sub(r"[^\w]", "", ministry_name.split()[0] if ministry_name else "Geral")
                        if tag_slug not in event_tags:
                            event_tags.append(tag_slug)
        except Exception as e:
            logger.warning(f"Erro ao consultar ministério: {e}")

    input_dto = CreateEventInputDTO(
        title=payload.title,
        date=payload.date,
        location=payload.location or "Templo Principal",
        theme=payload.theme,
        description=payload.description,
        cover_image=payload.cover_image,
        address_details=payload.address_details,
        planning=payload.planning,
        status=event_status,
        ministry_id=payload.ministry_id,
        ministry_name=ministry_name,
        responsible_id=user_id,
        responsible_name=user_name,
        approved_by=approved_by,
        tags=event_tags,
        is_global=bool(payload.is_global),
    )
    event = await use_case.execute(input_dto)

    # Se pendente de aprovação, notifica os Pastores de forma segura
    if event_status == "pending_pastor_approval":
        try:
            pool = await get_pool()
            if pool:
                async with pool.acquire() as conn:
                    pastors = await conn.fetch("SELECT id FROM public.users WHERE role IN ('PASTOR', 'ADMIN') AND active = true")
                    for p in pastors:
                        await conn.execute("""
                            INSERT INTO public.notifications (user_id, event_id, title, message, type)
                            VALUES ($1, $2, $3, $4, 'approval_request');
                        """, p["id"], uuid.UUID(str(event.id)), f"Validação Pastoral Pendente: {event.title}", f"O líder {user_name} cadastrou um novo culto que aguarda sua aprovação pastoral.")
        except Exception as e:
            logger.warning(f"Erro ao disparar notificação pastoral: {e}")

    return map_event_to_response(event)


@router.post(
    "/ai-assist",
    response_model=EventAIAssistResponseDTO,
    status_code=status.HTTP_200_OK,
    summary="Copiloto de IA para assistência, consistência e planejamento da agenda"
)
async def ai_assist_event(
    payload: EventAIAssistRequestDTO,
    use_case: AIAssistEventUseCase = Depends(get_ai_assist_event_use_case)
):
    return await use_case.execute(payload)


@router.post(
    "/ai-assist-audio",
    response_model=EventAIAssistResponseDTO,
    status_code=status.HTTP_200_OK,
    summary="Copiloto de IA para briefing de culto enviado por voz / áudio"
)
async def ai_assist_event_audio(
    file: UploadFile = File(..., description="Áudio ditando o planejamento do culto"),
    use_case: AIAssistEventUseCase = Depends(get_ai_assist_event_use_case)
):
    content = await file.read()
    mime = file.content_type or "audio/wav"
    return await use_case.execute_with_audio(content, mime)


@router.get(
    "/cep/{cep}",
    response_model=CEPAddressResponseDTO,
    status_code=status.HTTP_200_OK,
    summary="Busca endereço completo e gera Google Maps a partir do CEP (ViaCEP)"
)
async def lookup_cep(cep: str):
    clean_cep = re.sub(r"\D", "", cep)
    if len(clean_cep) != 8:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="CEP deve conter exatamente 8 dígitos numéricos."
        )

    url = f"https://viacep.com.br/ws/{clean_cep}/json/"
    async with httpx.AsyncClient(timeout=6.0) as client:
        try:
            resp = await client.get(url)
            if resp.status_code != 200:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail="CEP não encontrado nos Correios."
                )
            data = resp.json()
            if data.get("erro") is True:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail="CEP não localizado."
                )
        except httpx.RequestError as e:
            raise HTTPException(
                status_code=status.HTTP_502_BAD_GATEWAY,
                detail=f"Falha de comunicação com o serviço de CEP: {str(e)}"
            )

    logradouro = data.get("logradouro", "")
    bairro = data.get("bairro", "")
    localidade = data.get("localidade", "")
    uf = data.get("uf", "")
    parts = [p for p in [logradouro, bairro, f"{localidade} - {uf}"] if p.strip()]
    formatted = ", ".join(parts)
    maps_url = f"https://www.google.com/maps/search/?api=1&query={urllib.parse.quote_plus(formatted)}"

    return CEPAddressResponseDTO(
        cep=data.get("cep", clean_cep),
        logradouro=logradouro,
        bairro=bairro,
        localidade=localidade,
        uf=uf,
        formatted_address=formatted,
        maps_url=maps_url
    )


@router.get(
    "",
    response_model=List[EventResponseDTO],
    status_code=status.HTTP_200_OK,
    summary="Lista a agenda de cultos e eventos com filtragem de Tags e RBAC"
)
async def list_events(
    limit: int = 50,
    offset: int = 0,
    tag: Optional[str] = None,
    use_case: ListEventsUseCase = Depends(get_list_events_use_case),
    current_user: Optional[Dict[str, Any]] = Depends(get_current_user)
):
    """
    Retorna os eventos de acordo com o perfil e tags do usuário:
    - Pastores e Administradores: visualizam todos os eventos (publicados e pendentes de validação bilateral).
    - Líderes: visualizam eventos publicados + eventos do seu ministério + pendentes cadastrados por eles mesmos.
    - Adolescentes / Membros comuns: visualizam estritamente eventos 'published' que correspondam
      às suas tags ministeriais OU eventos gerais da igreja ('is_global' = true).
    """
    events = await use_case.execute(limit=limit, offset=offset)

    role = current_user.get("role") if current_user else "TEEN"
    user_id = str(current_user["id"]) if current_user and current_user.get("id") else None
    user_tags = set(current_user.get("tags") or []) if current_user else set()

    if role in ["PASTOR", "ADMIN"]:
        filtered = events
    elif role == "LEADER":
        filtered = [
            e for e in events
            if getattr(e, "status", "published") == "published"
            or getattr(e, "responsible_id", None) == user_id
            or (getattr(e, "status", "published") in ["pending_pastor_approval", "changes_proposed_by_pastor"] and getattr(e, "responsible_id", None) == user_id)
        ]
    else:
        # Membro Comum (TEEN) ou visitante
        filtered = []
        for e in events:
            # Só vê publicados
            if getattr(e, "status", "published") != "published":
                continue
            
            # Se for global, todos vêem
            if getattr(e, "is_global", False):
                filtered.append(e)
                continue

            # Se o membro possui tags cadastradas, cruza as tags
            event_tags_set = set(getattr(e, "tags", []) or [])
            if user_tags and (user_tags & event_tags_set):
                filtered.append(e)
                continue

            # Se o evento tiver a tag #Geral
            if "#Geral" in event_tags_set:
                filtered.append(e)
                continue

            # Se o usuário não tiver tags específicas, exibe eventos gerais ou sem tags
            if not user_tags and (not event_tags_set or "#Geral" in event_tags_set):
                filtered.append(e)

    if tag:
        filtered = [e for e in filtered if tag in (getattr(e, "tags", []) or [])]

    return [map_event_to_response(e) for e in filtered]


# ==============================================================================
# Fluxo Bilateral de Homologação (Líder <-> Pastor)
# ==============================================================================

@router.patch(
    "/{event_id}/approve",
    status_code=status.HTTP_200_OK,
    summary="Valida e homologa evento para publicação pública (Exclusivo Pastor/Admin)"
)
async def approve_event(
    event_id: str,
    current_user: Optional[Dict[str, Any]] = Depends(get_current_user)
):
    if not current_user or current_user.get("role") not in ["PASTOR", "ADMIN"]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Apenas Pastores ou Administradores podem homologar e aprovar cultos."
        )

    try:
        ev_uuid = uuid.UUID(str(event_id))
    except ValueError:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="ID de evento inválido.")

    pool = await get_pool()
    if not pool:
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail="Banco de dados indisponível.")

    async with pool.acquire() as conn:
        ev_row = await conn.fetchrow("SELECT title, responsible_id FROM public.events WHERE id = $1", ev_uuid)
        if not ev_row:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Evento não encontrado.")

        pastor_id = uuid.UUID(str(current_user["id"]))
        await conn.execute("""
            UPDATE public.events 
            SET status = 'published', approved_by = $1, approved_at = NOW() 
            WHERE id = $2;
        """, pastor_id, ev_uuid)

        # Dispara notificação para os membros
        users = await conn.fetch("SELECT id FROM public.users WHERE active = true")
        for u in users:
            await conn.execute("""
                INSERT INTO public.notifications (user_id, event_id, title, message, type)
                VALUES ($1, $2, $3, $4, 'event_created');
            """, u["id"], ev_uuid, f"Culto Homologado: {ev_row['title']}", f"O culto '{ev_row['title']}' foi validado e homologado pelo colegiado pastoral. Garanta sua presença!")

        # Notifica o líder criador
        if ev_row.get("responsible_id"):
            await conn.execute("""
                INSERT INTO public.notifications (user_id, event_id, title, message, type)
                VALUES ($1, $2, $3, $4, 'announcement');
            """, ev_row["responsible_id"], ev_uuid, f"Evento Aprovado: {ev_row['title']}", f"Parabéns! O culto '{ev_row['title']}' foi aprovado e agora está publicado para todos os membros.")

    return {"message": "Evento homologado e publicado com sucesso.", "event_id": event_id, "status": "published"}


@router.patch(
    "/{event_id}/propose-changes",
    status_code=status.HTTP_200_OK,
    summary="Pastor propõe alterações de data, horário ou local ao líder"
)
async def propose_event_changes(
    event_id: str,
    payload: ProposeEventChangesDTO,
    current_user: Optional[Dict[str, Any]] = Depends(get_current_user)
):
    if not current_user or current_user.get("role") not in ["PASTOR", "ADMIN"]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Apenas Pastores ou Administradores podem propor ajustes e alterações em eventos."
        )

    try:
        ev_uuid = uuid.UUID(str(event_id))
    except ValueError:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="ID de evento inválido.")

    pool = await get_pool()
    if not pool:
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail="Banco de dados indisponível.")

    async with pool.acquire() as conn:
        ev_row = await conn.fetchrow("SELECT title, responsible_id FROM public.events WHERE id = $1", ev_uuid)
        if not ev_row:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Evento não encontrado.")

        pastor_id = uuid.UUID(str(current_user["id"]))
        await conn.execute("""
            UPDATE public.events 
            SET status = 'changes_proposed_by_pastor',
                proposed_date = $1,
                proposed_location = $2,
                pastor_notes = $3,
                proposed_by = $4
            WHERE id = $5;
        """, payload.proposed_date, payload.proposed_location, payload.pastor_notes, pastor_id, ev_uuid)

        if ev_row.get("responsible_id"):
            await conn.execute("""
                INSERT INTO public.notifications (user_id, event_id, title, message, type)
                VALUES ($1, $2, $3, $4, 'announcement');
            """, ev_row["responsible_id"], ev_uuid, f"Proposta Pastoral: {ev_row['title']}", f"O Pastor propôs ajustes no culto '{ev_row['title']}': {payload.pastor_notes}. Revise e confirme o aceite.")

    return {
        "message": "Proposta de alterações registrada. O líder foi notificado para revisão bilateral.",
        "event_id": event_id,
        "status": "changes_proposed_by_pastor"
    }


@router.patch(
    "/{event_id}/accept-changes",
    status_code=status.HTTP_200_OK,
    summary="Líder aceita as mudanças propostas pelo Pastor e homologa o evento"
)
async def accept_event_changes(
    event_id: str,
    current_user: Optional[Dict[str, Any]] = Depends(get_current_user)
):
    if not current_user:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Não autenticado.")

    try:
        ev_uuid = uuid.UUID(str(event_id))
    except ValueError:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="ID de evento inválido.")

    pool = await get_pool()
    if not pool:
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail="Banco de dados indisponível.")

    async with pool.acquire() as conn:
        ev_row = await conn.fetchrow("SELECT * FROM public.events WHERE id = $1", ev_uuid)
        if not ev_row:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Evento não encontrado.")

        user_id = str(current_user["id"])
        is_creator = str(ev_row.get("responsible_id")) == user_id
        is_pastor_or_admin = current_user.get("role") in ["PASTOR", "ADMIN"]

        if not (is_creator or is_pastor_or_admin):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Apenas o líder responsável ou o colegiado pastoral podem aceitar as propostas."
            )

        new_date = ev_row.get("proposed_date") or ev_row.get("date")
        new_location = ev_row.get("proposed_location") or ev_row.get("location")

        await conn.execute("""
            UPDATE public.events 
            SET date = $1,
                location = $2,
                status = 'published',
                approved_at = NOW()
            WHERE id = $3;
        """, new_date, new_location, ev_uuid)

        # Notifica Pastores e Membros
        users = await conn.fetch("SELECT id FROM public.users WHERE active = true")
        for u in users:
            await conn.execute("""
                INSERT INTO public.notifications (user_id, event_id, title, message, type)
                VALUES ($1, $2, $3, $4, 'event_created');
            """, u["id"], ev_uuid, f"Culto Homologado: {ev_row['title']}", f"O culto '{ev_row['title']}' teve seus ajustes aceitos em consenso bilateral e foi homologado!")

    return {
        "message": "Ajustes aceitos com sucesso! O evento foi homologado em consenso mútuo e está publicado.",
        "event_id": event_id,
        "status": "published"
    }


@router.patch(
    "/{event_id}/reject",
    status_code=status.HTTP_200_OK,
    summary="Rejeita ou solicita revisão pastoral em evento pendente (Exclusivo Pastor/Admin)"
)
async def reject_event(
    event_id: str,
    reason: Optional[str] = None,
    current_user: Optional[Dict[str, Any]] = Depends(get_current_user)
):
    if not current_user or current_user.get("role") not in ["PASTOR", "ADMIN"]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Apenas Pastores ou Administradores podem rejeitar cultos."
        )

    try:
        ev_uuid = uuid.UUID(str(event_id))
    except ValueError:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="ID de evento inválido.")

    pool = await get_pool()
    if not pool:
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail="Banco de dados indisponível.")

    async with pool.acquire() as conn:
        ev_row = await conn.fetchrow("SELECT title, responsible_id FROM public.events WHERE id = $1", ev_uuid)
        if not ev_row:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Evento não encontrado.")

        await conn.execute("UPDATE public.events SET status = 'draft' WHERE id = $1", ev_uuid)

        if ev_row.get("responsible_id"):
            obs = f": {reason}" if reason else "."
            await conn.execute("""
                INSERT INTO public.notifications (user_id, event_id, title, message, type)
                VALUES ($1, $2, $3, $4, 'announcement');
            """, ev_row["responsible_id"], ev_uuid, f"Revisão Necessária: {ev_row['title']}", f"O colegiado pastoral solicitou ajustes no culto '{ev_row['title']}'{obs}")

    return {"message": "Evento retornado para revisão do líder.", "event_id": event_id, "status": "draft"}


@router.get(
    "/{event_id}",
    response_model=EventResponseDTO,
    status_code=status.HTTP_200_OK,
    summary="Recupera detalhes de um evento e seu sermão documentado"
)
async def get_event(
    event_id: str,
    use_case: GetEventUseCase = Depends(get_event_details_use_case)
):
    event = await use_case.execute(event_id)
    return map_event_to_response(event)


@router.post(
    "/{event_id}/invite",
    response_model=EventInviteResponseDTO,
    status_code=status.HTTP_200_OK,
    summary="Gera convite criativo com IA para WhatsApp"
)
async def generate_event_invite(
    event_id: str,
    use_case: GenerateEventInviteUseCase = Depends(get_generate_invite_use_case),
    event_query: GetEventUseCase = Depends(get_event_details_use_case)
):
    event = await event_query.execute(event_id)
    invite_text = await use_case.execute(event_id)
    return EventInviteResponseDTO(
        event_id=event.id,
        event_title=event.title,
        invite_text=invite_text
    )


@router.delete(
    "/{event_id}",
    status_code=status.HTTP_200_OK,
    summary="Cancela um evento na agenda e notifica os inscritos (RF06, RN07)"
)
async def cancel_event(
    event_id: str,
    current_user: Optional[Dict[str, Any]] = Depends(require_leader_or_pastor)
):
    try:
        ev_uuid = uuid.UUID(str(event_id))
    except ValueError:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="ID de evento inválido.")

    pool = await get_pool()
    if not pool:
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail="Banco de dados indisponível.")

    async with pool.acquire() as conn:
        ev_row = await conn.fetchrow("SELECT title, date FROM public.events WHERE id = $1", ev_uuid)
        if not ev_row:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Evento não encontrado.")

        await conn.execute("UPDATE public.events SET status = 'cancelled' WHERE id = $1", ev_uuid)

        # Notifica todos os participantes que confirmaram presença
        attendees = await conn.fetch(
            "SELECT user_id FROM public.event_attendances WHERE event_id = $1 AND status = 'confirmed'",
            ev_uuid
        )
        for att in attendees:
            await conn.execute("""
                INSERT INTO public.notifications (user_id, event_id, title, message, type)
                VALUES ($1, $2, $3, $4, 'cancellation');
            """, att["user_id"], ev_uuid, f"Culto Cancelado: {ev_row['title']}", f"Informamos que o evento '{ev_row['title']}' foi cancelado pela liderança pastoral.")

    return {
        "message": "Evento cancelado com sucesso e participantes notificados.",
        "event_id": event_id,
        "status": "cancelled",
        "notified_attendees": len(attendees)
    }
