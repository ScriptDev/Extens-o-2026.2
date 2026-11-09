import json
import logging
import uuid
from typing import List, Optional
from datetime import datetime, timezone

from app.domain.entities import SermonOutline, StructuredContent
from app.domain.exceptions import DatabaseException
from app.domain.ports.sermon_repository import ISermonRepository
from app.infrastructure.database.connection_pool import get_pool

logger = logging.getLogger(__name__)

# Armazenamento resiliente em memória caso banco externo oscile
_in_memory_sermons: dict = {}


class PrismaSermonRepository(ISermonRepository):
    """
    [Persistência] Repositório concreto integrado ao Supabase (PostgreSQL).
    Implementa ISermonRepository garantindo a inversão de dependências (DIP).
    """

    async def save(self, sermon: SermonOutline) -> SermonOutline:
        """
        Salva o agregado SermonOutline no Supabase PostgreSQL.
        """
        try:
            pool = await get_pool()
            if pool:
                sermon_uuid = uuid.UUID(sermon.id) if isinstance(sermon.id, str) else sermon.id
                event_uuid = (
                    uuid.UUID(sermon.event_id)
                    if sermon.event_id and isinstance(sermon.event_id, str)
                    else sermon.event_id
                )
                structured_json = json.dumps(sermon.structured_content.to_dict())

                query = """
                    INSERT INTO public.sermon_outlines (
                        id, event_id, title, preacher, audio_filename, media_type, structured_content
                    )
                    VALUES ($1, $2, $3, $4, $5, $6, $7::jsonb)
                    ON CONFLICT (id) DO UPDATE SET
                        title = EXCLUDED.title,
                        preacher = EXCLUDED.preacher,
                        structured_content = EXCLUDED.structured_content
                    RETURNING id, event_id, title, preacher, audio_filename, media_type, structured_content, created_at;
                """
                async with pool.acquire() as conn:
                    row = await conn.fetchrow(
                        query,
                        sermon_uuid,
                        event_uuid,
                        sermon.title,
                        sermon.preacher,
                        sermon.audio_filename,
                        sermon.media_type,
                        structured_json,
                    )
                    logger.info(f"Esboço persistido com sucesso no Supabase [ID: {row['id']}]")
                    return self._row_to_sermon(row)

            # Armazenamento resiliente em memória
            _in_memory_sermons[sermon.id] = sermon
            if sermon.event_id:
                from app.infrastructure.database.prisma_event_repository import _in_memory_events
                if sermon.event_id in _in_memory_events:
                    _in_memory_events[sermon.event_id].sermon = sermon

            logger.info(f"Esboço persistido no repositório resiliente em memória [ID: {sermon.id}].")
            return sermon

        except Exception as e:
            logger.error(f"Erro ao salvar SermonOutline no Supabase: {str(e)}", exc_info=True)
            _in_memory_sermons[sermon.id] = sermon
            return sermon

    async def get_by_id(self, sermon_id: str) -> Optional[SermonOutline]:
        """
        Recupera um esboço por ID único (UUID).
        """
        try:
            pool = await get_pool()
            if pool:
                try:
                    sermon_uuid = uuid.UUID(sermon_id)
                except ValueError:
                    return None

                query = """
                    SELECT id, event_id, title, preacher, audio_filename, media_type, structured_content, created_at
                    FROM public.sermon_outlines
                    WHERE id = $1;
                """
                async with pool.acquire() as conn:
                    row = await conn.fetchrow(query, sermon_uuid)
                    if not row:
                        return None
                    return self._row_to_sermon(row)

            return _in_memory_sermons.get(sermon_id)

        except Exception as e:
            logger.error(f"Erro ao buscar SermonOutline por ID [{sermon_id}]: {str(e)}")
            return _in_memory_sermons.get(sermon_id)

    async def list_all(self, limit: int = 50, offset: int = 0) -> List[SermonOutline]:
        """
        Lista todos os esboços com paginação e ordenação decrescente por data.
        """
        try:
            pool = await get_pool()
            if pool:
                query = """
                    SELECT id, event_id, title, preacher, audio_filename, media_type, structured_content, created_at
                    FROM public.sermon_outlines
                    ORDER BY created_at DESC
                    LIMIT $1 OFFSET $2;
                """
                async with pool.acquire() as conn:
                    rows = await conn.fetch(query, limit, offset)
                    return [self._row_to_sermon(r) for r in rows]

            items = list(_in_memory_sermons.values())
            items.sort(key=lambda s: s.created_at, reverse=True)
            return items[offset : offset + limit]

        except Exception as e:
            logger.error(f"Erro ao listar esboços no Supabase: {str(e)}")
            items = list(_in_memory_sermons.values())
            items.sort(key=lambda s: s.created_at, reverse=True)
            return items[offset : offset + limit]

    @staticmethod
    def _row_to_sermon(row) -> SermonOutline:
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

        return SermonOutline(
            id=str(row["id"]),
            event_id=str(row["event_id"]) if row.get("event_id") else None,
            title=row["title"],
            preacher=row.get("preacher"),
            audio_filename=row["audio_filename"],
            media_type=row.get("media_type") or "audio",
            structured_content=StructuredContent.from_dict(structured_dict),
            created_at=row.get("created_at") or datetime.now(timezone.utc)
        )
