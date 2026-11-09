import json
import logging
import uuid
from datetime import datetime, timezone
from typing import List, Optional, Dict, Any

from app.domain.entities import Event, SermonOutline, StructuredContent, BiblicalPoint
from app.domain.ports.event_repository import IEventRepository
from app.infrastructure.database.connection_pool import get_pool

logger = logging.getLogger(__name__)

# Fallback in-memory dictionary
_in_memory_events: Dict[str, Event] = {}


class PrismaEventRepository(IEventRepository):
    """
    [Persistência] Repositório concreto para Eventos e Agenda com suporte a Supabase PostgreSQL.
    Implementa IEventRepository garantindo inversão de dependência (DIP).
    """

    async def save(self, event: Event) -> Event:
        try:
            pool = await get_pool()
            if pool:
                event_uuid = uuid.UUID(event.id) if isinstance(event.id, str) else event.id
                ministry_uuid = uuid.UUID(event.ministry_id) if event.ministry_id else None
                responsible_uuid = uuid.UUID(event.responsible_id) if event.responsible_id else None
                approved_uuid = uuid.UUID(event.approved_by) if event.approved_by else None
                proposed_uuid = uuid.UUID(event.proposed_by) if event.proposed_by else None
                address_json = json.dumps(event.address_details) if event.address_details else None
                planning_json = json.dumps(event.planning) if event.planning else None
                tags_json = json.dumps(event.tags or [])

                query = """
                    INSERT INTO public.events (
                        id, title, date, location, theme, cover_image, description, 
                        address_details, planning, status, ministry_id, ministry_name, 
                        responsible_id, responsible_name, approved_by,
                        tags, is_global, proposed_date, proposed_location, pastor_notes, proposed_by
                    )
                    VALUES (
                        $1, $2, $3, $4, $5, $6, $7, $8::jsonb, $9::jsonb, $10, $11, $12, 
                        $13, $14, $15, $16::jsonb, $17, $18, $19, $20, $21
                    )
                    ON CONFLICT (id) DO UPDATE SET
                        title = EXCLUDED.title,
                        date = EXCLUDED.date,
                        location = EXCLUDED.location,
                        theme = EXCLUDED.theme,
                        cover_image = EXCLUDED.cover_image,
                        description = EXCLUDED.description,
                        address_details = EXCLUDED.address_details,
                        planning = EXCLUDED.planning,
                        status = EXCLUDED.status,
                        ministry_id = EXCLUDED.ministry_id,
                        ministry_name = EXCLUDED.ministry_name,
                        responsible_id = EXCLUDED.responsible_id,
                        responsible_name = EXCLUDED.responsible_name,
                        approved_by = EXCLUDED.approved_by,
                        tags = EXCLUDED.tags,
                        is_global = EXCLUDED.is_global,
                        proposed_date = EXCLUDED.proposed_date,
                        proposed_location = EXCLUDED.proposed_location,
                        pastor_notes = EXCLUDED.pastor_notes,
                        proposed_by = EXCLUDED.proposed_by
                    RETURNING id, title, date, location, theme, cover_image, description, 
                              address_details, planning, status, ministry_id, ministry_name, 
                              responsible_id, responsible_name, approved_by, created_at,
                              tags, is_global, proposed_date, proposed_location, pastor_notes, proposed_by;
                """
                async with pool.acquire() as conn:
                    row = await conn.fetchrow(
                        query,
                        event_uuid,
                        event.title,
                        event.date,
                        event.location,
                        event.theme,
                        event.cover_image,
                        event.description,
                        address_json,
                        planning_json,
                        event.status,
                        ministry_uuid,
                        event.ministry_name,
                        responsible_uuid,
                        event.responsible_name,
                        approved_uuid,
                        tags_json,
                        bool(event.is_global),
                        event.proposed_date,
                        event.proposed_location,
                        event.pastor_notes,
                        proposed_uuid,
                    )
                    logger.info(f"Evento persistido com sucesso no Supabase [ID: {row['id']}]")
                    return self._row_to_event(row)

            # Fallback seguro em memória
            _in_memory_events[event.id] = event
            logger.info(f"Evento salvo no armazenamento em memória [ID: {event.id}].")
            return event

        except Exception as e:
            logger.error(f"Erro ao salvar Event no Supabase: {str(e)}", exc_info=True)
            _in_memory_events[event.id] = event
            return event

    async def get_by_id(self, event_id: str) -> Optional[Event]:
        try:
            pool = await get_pool()
            if pool:
                try:
                    event_uuid = uuid.UUID(event_id)
                except ValueError:
                    return None

                query = """
                    SELECT e.id, e.title, e.date, e.location, e.theme, e.cover_image, e.description,
                           e.address_details, e.planning, e.status, e.ministry_id, e.ministry_name,
                           e.responsible_id, e.responsible_name, e.approved_by, e.created_at,
                           e.tags, e.is_global, e.proposed_date, e.proposed_location, e.pastor_notes, e.proposed_by as proposed_by_id,
                           s.id as sermon_id, s.event_id as sermon_event_id, s.title as sermon_title,
                           s.preacher, s.audio_filename, s.media_type, s.structured_content, s.created_at as sermon_created_at
                    FROM public.events e
                    LEFT JOIN public.sermon_outlines s ON s.event_id = e.id
                    WHERE e.id = $1;
                """
                async with pool.acquire() as conn:
                    row = await conn.fetchrow(query, event_uuid)
                    if not row:
                        return None
                    return self._row_to_event(row)

            return _in_memory_events.get(event_id)

        except Exception as e:
            logger.error(f"Erro ao consultar Event por ID [{event_id}]: {str(e)}")
            return _in_memory_events.get(event_id)

    async def list_all(self, limit: int = 50, offset: int = 0) -> List[Event]:
        try:
            pool = await get_pool()
            if pool:
                query = """
                    SELECT e.id, e.title, e.date, e.location, e.theme, e.cover_image, e.description,
                           e.address_details, e.planning, e.status, e.ministry_id, e.ministry_name,
                           e.responsible_id, e.responsible_name, e.approved_by, e.created_at,
                           e.tags, e.is_global, e.proposed_date, e.proposed_location, e.pastor_notes, e.proposed_by as proposed_by_id,
                           s.id as sermon_id, s.event_id as sermon_event_id, s.title as sermon_title,
                           s.preacher, s.audio_filename, s.media_type, s.structured_content, s.created_at as sermon_created_at
                    FROM public.events e
                    LEFT JOIN public.sermon_outlines s ON s.event_id = e.id
                    ORDER BY e.date ASC
                    LIMIT $1 OFFSET $2;
                """
                async with pool.acquire() as conn:
                    rows = await conn.fetch(query, limit, offset)
                    return [self._row_to_event(r) for r in rows]

            # Ordena eventos em memória pela data
            sorted_events = sorted(_in_memory_events.values(), key=lambda x: x.date)
            return sorted_events[offset : offset + limit]

        except Exception as e:
            logger.error(f"Erro ao listar eventos no Supabase: {str(e)}")
            sorted_events = sorted(_in_memory_events.values(), key=lambda x: x.date)
            return sorted_events[offset : offset + limit]

    @staticmethod
    def _row_to_event(row) -> Event:
        sermon_entity = None
        if "sermon_id" in row and row["sermon_id"]:
            structured_raw = row["structured_content"]
            if isinstance(structured_raw, str):
                try:
                    structured_dict = json.loads(structured_raw)
                except Exception:
                    structured_dict = {}
            elif isinstance(structured_raw, dict):
                structured_dict = structured_raw
            else:
                structured_dict = {}

            sermon_entity = SermonOutline(
                id=str(row["sermon_id"]),
                event_id=str(row["sermon_event_id"]) if row.get("sermon_event_id") else None,
                title=row.get("sermon_title") or "",
                preacher=row.get("preacher"),
                audio_filename=row.get("audio_filename") or "",
                media_type=row.get("media_type") or "audio",
                structured_content=StructuredContent.from_dict(structured_dict),
                created_at=row.get("sermon_created_at") or datetime.now(timezone.utc)
            )

        address_raw = row.get("address_details")
        if isinstance(address_raw, str):
            try:
                address_details = json.loads(address_raw)
            except Exception:
                address_details = None
        else:
            address_details = address_raw

        planning_raw = row.get("planning")
        if isinstance(planning_raw, str):
            try:
                planning = json.loads(planning_raw)
            except Exception:
                planning = None
        else:
            planning = planning_raw

        tags_raw = row.get("tags")
        if isinstance(tags_raw, str):
            try:
                tags = json.loads(tags_raw)
            except Exception:
                tags = []
        elif isinstance(tags_raw, list):
            tags = tags_raw
        else:
            tags = []

        return Event(
            id=str(row["id"]),
            title=row["title"],
            date=row["date"],
            location=row["location"],
            theme=row.get("theme"),
            description=row.get("description"),
            cover_image=row.get("cover_image"),
            address_details=address_details,
            planning=planning,
            status=row.get("status") or "published",
            ministry_id=str(row["ministry_id"]) if row.get("ministry_id") else None,
            ministry_name=row.get("ministry_name"),
            responsible_id=str(row["responsible_id"]) if row.get("responsible_id") else None,
            responsible_name=row.get("responsible_name"),
            approved_by=str(row["approved_by"]) if row.get("approved_by") else None,
            tags=tags,
            is_global=bool(row.get("is_global", False)),
            proposed_date=row.get("proposed_date"),
            proposed_location=row.get("proposed_location"),
            pastor_notes=row.get("pastor_notes"),
            proposed_by=str(row.get("proposed_by_id") or row.get("proposed_by")) if (row.get("proposed_by_id") or row.get("proposed_by")) else None,
            sermon=sermon_entity,
            created_at=row.get("created_at") or datetime.now(timezone.utc)
        )
