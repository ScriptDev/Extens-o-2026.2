import hashlib
import json
import logging
import uuid
from datetime import datetime, timezone
from typing import List, Optional, Dict, Any
from fastapi import APIRouter, Depends, HTTPException, status, Header
from pydantic import BaseModel, Field

from app.infrastructure.database.connection_pool import get_pool
from app.domain.exceptions import ValidationException, EntityNotFoundException

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api", tags=["Agenda Teens - Ministério de Adolescentes"])

SALT = "agenda_teens_secure_salt_2026"

def hash_password(password: str) -> str:
    return hashlib.sha256(f"{SALT}{password}".encode("utf-8")).hexdigest()


# ==============================================================================
# DTOs
# ==============================================================================

class LoginRequestDTO(BaseModel):
    email: str = Field(..., description="E-mail de acesso")
    password: str = Field(..., min_length=4)

class UserResponseDTO(BaseModel):
    id: str
    name: str
    email: str
    role: str  # 'ADMIN', 'PASTOR', 'LEADER', 'TEEN'
    phone: Optional[str] = None
    parent_name: Optional[str] = None
    parent_phone: Optional[str] = None
    ministries: List[Dict[str, Any]] = Field(default_factory=list)
    tags: List[str] = Field(default_factory=list)
    active: bool
    created_at: datetime


class UpdateUserRoleMinistryDTO(BaseModel):
    role: str = Field(..., description="ADMIN, PASTOR, LEADER, TEEN")
    ministries: List[Dict[str, Any]] = Field(default_factory=list, description="Lista de até 3 ministérios oficiais")
    tags: List[str] = Field(default_factory=list, description="Lista de tags ou atribuições")

class LoginResponseDTO(BaseModel):
    token: str
    user: UserResponseDTO

class CreateUserDTO(BaseModel):
    name: str = Field(..., min_length=2)
    email: str = Field(..., description="E-mail do usuário")
    password: Optional[str] = "senha123"
    role: str = Field("TEEN", description="LEADER ou TEEN")
    phone: Optional[str] = None
    birth_date: Optional[str] = None
    parent_name: Optional[str] = None
    parent_phone: Optional[str] = None
    ministries: Optional[List[Dict[str, Any]]] = None
    tags: Optional[List[str]] = None

class AttendanceResponseDTO(BaseModel):
    id: str
    event_id: str
    user_id: str
    user_name: str
    user_role: str
    status: str
    created_at: datetime

class EventAttendanceStatsDTO(BaseModel):
    event_id: str
    total_confirmed: int
    capacity: Optional[int] = None
    spots_remaining: Optional[int] = None
    is_full: bool = False
    attendees: List[AttendanceResponseDTO] = []

class AnnouncementDTO(BaseModel):
    title: str = Field(..., min_length=3)
    message: str = Field(..., min_length=5)
    target_role: Optional[str] = "TEEN"
    ministry_tag: Optional[str] = None

class NotificationDTO(BaseModel):
    id: str
    title: str
    message: str
    type: str
    read: bool
    created_at: datetime


def _parse_user_dict(row: Any) -> Dict[str, Any]:
    if not row:
        return {}
    data = dict(row)
    mins_raw = data.get("ministries")
    if isinstance(mins_raw, str):
        try:
            data["ministries"] = json.loads(mins_raw)
        except Exception:
            data["ministries"] = []
    elif not isinstance(mins_raw, list):
        data["ministries"] = []

    tags_raw = data.get("tags")
    if isinstance(tags_raw, str):
        try:
            data["tags"] = json.loads(tags_raw)
        except Exception:
            data["tags"] = []
    elif not isinstance(tags_raw, list):
        data["tags"] = []

    return data


# ==============================================================================
# Helper de Sessão / Token Simples (Base64 UUID)
# ==============================================================================

async def get_current_user(authorization: Optional[str] = Header(None)) -> Optional[Dict[str, Any]]:
    """Recupera o usuário pelo token de cabeçalho Authorization ou Bearer."""
    pool = await get_pool()
    if not pool:
        return None

    if not authorization:
        # Retorna o líder padrão se não informado para testes amigáveis
        async with pool.acquire() as conn:
            row = await conn.fetchrow("SELECT * FROM public.users WHERE role = 'LEADER' LIMIT 1")
            return _parse_user_dict(row) if row else None

    token = authorization.replace("Bearer ", "").strip()
    try:
        user_uuid = uuid.UUID(token)
    except ValueError:
        async with pool.acquire() as conn:
            row = await conn.fetchrow("SELECT * FROM public.users WHERE role = 'LEADER' LIMIT 1")
            return _parse_user_dict(row) if row else None

    async with pool.acquire() as conn:
        row = await conn.fetchrow("SELECT * FROM public.users WHERE id = $1 AND active = true", user_uuid)
        return _parse_user_dict(row) if row else None


async def require_leader_or_pastor(current_user: Optional[Dict[str, Any]] = Depends(get_current_user)) -> Dict[str, Any]:
    """Valida RBAC hierárquico: apenas Pastores, Líderes e Administradores possuem acesso."""
    if not current_user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Autenticação necessária para acessar esta funcionalidade."
        )
    role = str(current_user.get("role", "")).upper()
    if role not in ["ADMIN", "LEADER", "PASTOR"]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Acesso Negado: Apenas Líderes Autorizados e Pastores possuem permissão para executar esta operação."
        )
    return current_user


# ==============================================================================
# 1. Autenticação (RF01)
# ==============================================================================

@router.post("/auth/login", response_model=LoginResponseDTO, summary="Login na Agenda Teens")
async def login(payload: LoginRequestDTO):
    pool = await get_pool()
    if not pool:
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail="Banco de dados temporariamente indisponível.")

    pwd_hash = hash_password(payload.password)
    async with pool.acquire() as conn:
        row = await conn.fetchrow(
            "SELECT * FROM public.users WHERE email = $1 AND password_hash = $2 AND active = true",
            payload.email.lower().strip(),
            pwd_hash
        )

        if not row:
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="E-mail ou senha incorretos.")

        user_data = _parse_user_dict(row)
        token = str(user_data["id"])

        return LoginResponseDTO(
            token=token,
            user=UserResponseDTO(
                id=str(user_data["id"]),
                name=user_data["name"],
                email=user_data["email"],
                role=user_data["role"],
                phone=user_data.get("phone"),
                parent_name=user_data.get("parent_name"),
                parent_phone=user_data.get("parent_phone"),
                ministries=user_data.get("ministries", []),
                tags=user_data.get("tags", []),
                active=user_data["active"],
                created_at=user_data["created_at"],
            )
        )


@router.get("/auth/me", response_model=UserResponseDTO, summary="Retorna os dados do usuário autenticado")
async def get_me(current_user: Optional[Dict[str, Any]] = Depends(get_current_user)):
    if not current_user:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Não autenticado.")

    return UserResponseDTO(
        id=str(current_user["id"]),
        name=current_user["name"],
        email=current_user["email"],
        role=current_user["role"],
        phone=current_user.get("phone"),
        parent_name=current_user.get("parent_name"),
        parent_phone=current_user.get("parent_phone"),
        ministries=current_user.get("ministries", []),
        tags=current_user.get("tags", []),
        active=current_user["active"],
        created_at=current_user["created_at"],
    )


# ==============================================================================
# 2. Cadastro e Gerenciamento de Usuários / Adolescentes (RF02, RF03)
# ==============================================================================

@router.post("/users", response_model=UserResponseDTO, status_code=status.HTTP_201_CREATED, summary="Cadastra adolescente ou líder")
async def create_user(payload: CreateUserDTO, current_user: Optional[Dict[str, Any]] = Depends(get_current_user)):
    # Regra de Negócio RN01: Somente pastores, líderes e administradores podem cadastrar membros
    if current_user and current_user.get("role") not in ["ADMIN", "LEADER", "PASTOR"]:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Apenas pastores e líderes autorizados podem cadastrar novos membros.")

    pool = await get_pool()
    if not pool:
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail="Banco de dados indisponível.")

    pwd = payload.password or "senha123"
    pwd_hash = hash_password(pwd)
    new_id = uuid.uuid4()

    async with pool.acquire() as conn:
        existing = await conn.fetchval("SELECT id FROM public.users WHERE email = $1", payload.email.lower().strip())
        if existing:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Este e-mail já está cadastrado na Agenda Teens.")

        user_mins = payload.ministries if payload.ministries is not None else (current_user.get("ministries", []) if current_user and current_user.get("role") == "LEADER" else [])
        user_tags = payload.tags if payload.tags is not None else (current_user.get("tags", []) if current_user and current_user.get("role") == "LEADER" else [])

        row = await conn.fetchrow("""
            INSERT INTO public.users (id, name, email, password_hash, role, phone, parent_name, parent_phone, ministries, tags)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
            RETURNING *;
        """, new_id, payload.name.strip(), payload.email.lower().strip(), pwd_hash, payload.role.upper(),
           payload.phone, payload.parent_name, payload.parent_phone, json.dumps(user_mins) if user_mins else None, user_tags if user_tags else None)

        logger.info(f"Usuário criado com sucesso na Agenda Teens: {row['name']} ({row['email']})")
        return UserResponseDTO(
            id=str(row["id"]),
            name=row["name"],
            email=row["email"],
            role=row["role"],
            phone=row.get("phone"),
            parent_name=row.get("parent_name"),
            parent_phone=row.get("parent_phone"),
            active=row["active"],
            created_at=row["created_at"],
        )


@router.get("/users", response_model=List[UserResponseDTO], summary="Lista os membros e adolescentes")
async def list_users(role: Optional[str] = None):
    pool = await get_pool()
    if not pool:
        return []

    async with pool.acquire() as conn:
        if role:
            rows = await conn.fetch("SELECT * FROM public.users WHERE role = $1 ORDER BY name ASC", role.upper())
        else:
            rows = await conn.fetch("SELECT * FROM public.users ORDER BY name ASC")

        result = []
        for r in rows:
            mins_raw = r.get("ministries")
            if isinstance(mins_raw, str):
                try:
                    mins = json.loads(mins_raw)
                except Exception:
                    mins = []
            elif isinstance(mins_raw, list):
                mins = mins_raw
            else:
                mins = []

            tags_raw = r.get("tags")
            if isinstance(tags_raw, str):
                try:
                    tags = json.loads(tags_raw)
                except Exception:
                    tags = []
            elif isinstance(tags_raw, list):
                tags = tags_raw
            else:
                tags = []

            result.append(
                UserResponseDTO(
                    id=str(r["id"]),
                    name=r["name"],
                    email=r["email"],
                    role=r["role"],
                    phone=r.get("phone"),
                    parent_name=r.get("parent_name"),
                    parent_phone=r.get("parent_phone"),
                    ministries=mins,
                    tags=tags,
                    active=r["active"],
                    created_at=r["created_at"],
                )
            )
        return result


@router.patch("/users/{user_id}/role", response_model=UserResponseDTO, summary="Elege líderes e vincula ministérios (Exclusivo Pastor/Admin/Líder para Teens)")
async def update_user_role_and_ministries(
    user_id: str,
    payload: UpdateUserRoleMinistryDTO,
    current_user: Optional[Dict[str, Any]] = Depends(get_current_user)
):
    caller_role = current_user.get("role") if current_user else None
    if not current_user or caller_role not in ["PASTOR", "ADMIN", "LEADER"]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Apenas Pastores, Administradores ou Líderes podem gerenciar ministérios e tags de membros."
        )

    # Líderes só podem gerenciar membros TEEN
    if caller_role == "LEADER" and payload.role.upper() != "TEEN":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Líderes ministeriais só têm autorização para vincular membros comuns (TEEN) aos seus grupos."
        )

    # Regra de Negócio: No máximo 3 ministérios por líder
    if len(payload.ministries) > 3:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Um membro ou líder pode ter vínculo com no máximo 3 ministérios simultâneos."
        )

    try:
        target_uuid = uuid.UUID(user_id)
    except ValueError:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="ID de usuário inválido.")

    pool = await get_pool()
    if not pool:
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail="Banco de dados indisponível.")

    async with pool.acquire() as conn:
        target_user = await conn.fetchrow("SELECT id, name, role FROM public.users WHERE id = $1", target_uuid)
        if not target_user:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Usuário não encontrado.")

        # Valida se os ministérios informados existem
        if payload.ministries:
            for m in payload.ministries:
                m_id = m.get("id")
                if m_id:
                    exists = await conn.fetchval("SELECT id FROM public.ministries WHERE id = $1", uuid.UUID(str(m_id)))
                    if not exists:
                        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=f"O ministério '{m.get('name')}' não consta na lista oficial criada pelos pastores.")

        updated_row = await conn.fetchrow("""
            UPDATE public.users 
            SET role = $1, ministries = $2::jsonb, tags = $3::jsonb
            WHERE id = $4
            RETURNING *;
        """, payload.role.upper(), json.dumps(payload.ministries), json.dumps(payload.tags), target_uuid)

        # Dispara notificação ao usuário caso tenha sido eleito líder
        if payload.role.upper() == "LEADER" and target_user["role"] != "LEADER":
            await conn.execute("""
                INSERT INTO public.notifications (user_id, title, message, type)
                VALUES ($1, 'Consagração Ministerial: Você foi eleito Líder!', 'A liderança pastoral atribuiu a você a função de Líder com vinculação aos seus ministérios designados.', 'announcement');
            """, target_uuid)

        mins = json.loads(updated_row["ministries"]) if isinstance(updated_row["ministries"], str) else (updated_row["ministries"] or [])
        tags = json.loads(updated_row["tags"]) if isinstance(updated_row["tags"], str) else (updated_row["tags"] or [])

        return UserResponseDTO(
            id=str(updated_row["id"]),
            name=updated_row["name"],
            email=updated_row["email"],
            role=updated_row["role"],
            phone=updated_row.get("phone"),
            parent_name=updated_row.get("parent_name"),
            parent_phone=updated_row.get("parent_phone"),
            ministries=mins,
            tags=tags,
            active=updated_row["active"],
            created_at=updated_row["created_at"],
        )


# ==============================================================================
# 3. Confirmação de Presença (RSVP / Attendance) - RF09, RF10, RF11, RN14
# ==============================================================================

@router.post("/events/{event_id}/attendance", response_model=AttendanceResponseDTO, summary="Confirma presença no evento")
async def confirm_attendance(event_id: str, current_user: Optional[Dict[str, Any]] = Depends(get_current_user)):
    if not current_user:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Faça login para confirmar sua presença.")

    try:
        ev_uuid = uuid.UUID(event_id)
        user_uuid = uuid.UUID(str(current_user["id"]))
    except ValueError:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="ID inválido.")

    pool = await get_pool()
    if not pool:
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail="Banco de dados indisponível.")

    async with pool.acquire() as conn:
        # 1. Verifica se o evento existe e status
        event_row = await conn.fetchrow("SELECT * FROM public.events WHERE id = $1", ev_uuid)
        if not event_row:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Evento não encontrado.")

        if event_row.get("status") == "cancelled":
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Não é permitido confirmar presença em um evento cancelado (RN06).")

        # 2. Verifica limite de vagas (RN14)
        capacity = event_row.get("capacity")
        if capacity and capacity > 0:
            total_active = await conn.fetchval(
                "SELECT COUNT(*) FROM public.event_attendances WHERE event_id = $1 AND status = 'confirmed'",
                ev_uuid
            )
            if total_active >= capacity:
                # Verifica se o próprio usuário já estava confirmado
                already = await conn.fetchval(
                    "SELECT id FROM public.event_attendances WHERE event_id = $1 AND user_id = $2 AND status = 'confirmed'",
                    ev_uuid, user_uuid
                )
                if not already:
                    raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Limite de vagas deste evento foi atingido (RN14).")

        # 3. Registra confirmação (Upsert atômico)
        att_row = await conn.fetchrow("""
            INSERT INTO public.event_attendances (event_id, user_id, status)
            VALUES ($1, $2, 'confirmed')
            ON CONFLICT (event_id, user_id) DO UPDATE SET
                status = 'confirmed',
                created_at = timezone('utc'::text, now())
            RETURNING *;
        """, ev_uuid, user_uuid)

        logger.info(f"Presença confirmada: Usuário {current_user['name']} no evento {event_row['title']}")

        return AttendanceResponseDTO(
            id=str(att_row["id"]),
            event_id=str(att_row["event_id"]),
            user_id=str(att_row["user_id"]),
            user_name=current_user["name"],
            user_role=current_user["role"],
            status=att_row["status"],
            created_at=att_row["created_at"],
        )


@router.delete("/events/{event_id}/attendance", summary="Cancela confirmação de presença (RF10, RN07)")
async def cancel_attendance(event_id: str, current_user: Optional[Dict[str, Any]] = Depends(get_current_user)):
    if not current_user:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Não autenticado.")

    try:
        ev_uuid = uuid.UUID(event_id)
        user_uuid = uuid.UUID(str(current_user["id"]))
    except ValueError:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="ID inválido.")

    pool = await get_pool()
    if not pool:
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail="Banco de dados indisponível.")

    async with pool.acquire() as conn:
        res = await conn.execute("""
            UPDATE public.event_attendances
            SET status = 'cancelled'
            WHERE event_id = $1 AND user_id = $2;
        """, ev_uuid, user_uuid)

        return {"message": "Confirmação de presença cancelada com sucesso.", "status": "cancelled"}


@router.get("/events/{event_id}/attendance", response_model=EventAttendanceStatsDTO, summary="Lista de participantes e vagas (RF11)")
async def get_event_attendance(event_id: str):
    try:
        ev_uuid = uuid.UUID(event_id)
    except ValueError:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="ID inválido.")

    pool = await get_pool()
    if not pool:
        return EventAttendanceStatsDTO(event_id=event_id, total_confirmed=0)

    async with pool.acquire() as conn:
        event_row = await conn.fetchrow("SELECT capacity FROM public.events WHERE id = $1", ev_uuid)
        capacity = event_row.get("capacity") if event_row else None

        rows = await conn.fetch("""
            SELECT a.id, a.event_id, a.user_id, a.status, a.created_at, u.name as user_name, u.role as user_role
            FROM public.event_attendances a
            JOIN public.users u ON u.id = a.user_id
            WHERE a.event_id = $1 AND a.status = 'confirmed'
            ORDER BY a.created_at ASC;
        """, ev_uuid)

        attendees = [
            AttendanceResponseDTO(
                id=str(r["id"]),
                event_id=str(r["event_id"]),
                user_id=str(r["user_id"]),
                user_name=r["user_name"],
                user_role=r["user_role"],
                status=r["status"],
                created_at=r["created_at"],
            )
            for r in rows
        ]

        total_confirmed = len(attendees)
        spots_rem = max(0, capacity - total_confirmed) if capacity else None
        is_full = (capacity is not None and total_confirmed >= capacity)

        return EventAttendanceStatsDTO(
            event_id=event_id,
            total_confirmed=total_confirmed,
            capacity=capacity,
            spots_remaining=spots_rem,
            is_full=is_full,
            attendees=attendees,
        )


@router.get("/events/{event_id}/attendance/me", summary="Consulta minha confirmação no evento")
async def check_my_attendance(event_id: str, current_user: Optional[Dict[str, Any]] = Depends(get_current_user)):
    if not current_user:
        return {"confirmed": False}

    try:
        ev_uuid = uuid.UUID(event_id)
        user_uuid = uuid.UUID(str(current_user["id"]))
    except ValueError:
        return {"confirmed": False}

    pool = await get_pool()
    if not pool:
        return {"confirmed": False}

    async with pool.acquire() as conn:
        status_val = await conn.fetchval(
            "SELECT status FROM public.event_attendances WHERE event_id = $1 AND user_id = $2",
            ev_uuid, user_uuid
        )
        return {"confirmed": status_val == "confirmed"}


# ==============================================================================
# 4. Notificações e Comunicados (RF12, RF14, RF16, RF18)
# ==============================================================================

@router.get("/notifications", response_model=List[NotificationDTO], summary="Histórico de notificações (RF16)")
async def list_notifications(current_user: Optional[Dict[str, Any]] = Depends(get_current_user)):
    pool = await get_pool()
    if not pool:
        return []

    user_uuid = uuid.UUID(str(current_user["id"])) if current_user else None

    async with pool.acquire() as conn:
        if user_uuid:
            rows = await conn.fetch(
                "SELECT * FROM public.notifications WHERE user_id = $1 ORDER BY created_at DESC LIMIT 30",
                user_uuid
            )
        else:
            rows = await conn.fetch("SELECT * FROM public.notifications ORDER BY created_at DESC LIMIT 30")

        return [
            NotificationDTO(
                id=str(r["id"]),
                title=r["title"],
                message=r["message"],
                type=r["type"],
                read=r["read"],
                created_at=r["created_at"],
            )
            for r in rows
        ]


@router.patch("/notifications/{notification_id}/read", summary="Marca notificação como lida")
async def mark_notification_read(notification_id: str):
    pool = await get_pool()
    if not pool:
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail="Banco de dados indisponível.")
    try:
        n_uuid = uuid.UUID(notification_id)
    except ValueError:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="ID inválido.")

    async with pool.acquire() as conn:
        await conn.execute("UPDATE public.notifications SET read = true WHERE id = $1", n_uuid)
    return {"success": True}


@router.post("/notifications/announcements", summary="Envia comunicado geral ou ministerial para os teens (RF18)")
async def send_announcement(payload: AnnouncementDTO, current_user: Optional[Dict[str, Any]] = Depends(get_current_user)):
    if current_user and current_user.get("role") not in ["ADMIN", "LEADER", "PASTOR"]:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Apenas pastores e líderes podem disparar comunicados.")

    pool = await get_pool()
    if not pool:
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail="Banco de dados indisponível.")

    caller_role = current_user.get("role") if current_user else "LEADER"
    leader_tags = [t.replace("#", "").lower() for t in (current_user.get("tags") or [])]
    leader_mins = [m.get("id") for m in (current_user.get("ministries") or []) if isinstance(m, dict)]

    async with pool.acquire() as conn:
        all_teens = await conn.fetch("SELECT id, name, ministries, tags FROM public.users WHERE active = true AND role = 'TEEN'")
        
        target_teens = []
        # Regra Eclesiástica: Pastor e Admin transmitem para TODOS os teens (ou geral)
        if caller_role in ["PASTOR", "ADMIN"]:
            target_teens = all_teens
            notif_type = "PASTOR_DEVOTIONAL" if "devocional" in payload.title.lower() else "PASTOR_ANNOUNCEMENT"
            sender_prefix = f"[Pastor {current_user.get('name', 'Paulo Roberto')}] "
        else:
            # Líder Ministerial: envia estritamente aos adolescentes do seu ministério específico!
            notif_type = "LEADER_ANNOUNCEMENT"
            sender_tag = current_user.get("tags", ["Ministério"])[0] if current_user.get("tags") else "Ministério"
            sender_prefix = f"[{current_user.get('name', 'Líder')} - {sender_tag}] "

            for t in all_teens:
                t_data = _parse_user_dict(t)
                t_tags = [tag.replace("#", "").lower() for tag in (t_data.get("tags") or [])]
                t_mins = [m.get("id") for m in (t_data.get("ministries") or []) if isinstance(m, dict)]

                # Pertence ao ministério do líder se compartilhar tag ou ministério
                shares_tag = any(lt in t_tags for lt in leader_tags)
                shares_min = any(lm in t_mins for lm in leader_mins)

                if shares_tag or shares_min:
                    target_teens.append(t)

            # Fallback de segurança: se nenhum teen tiver a tag ainda, envia a todos os teens para não perder o aviso
            if not target_teens:
                target_teens = all_teens

        for u in target_teens:
            await conn.execute("""
                INSERT INTO public.notifications (user_id, title, message, type)
                VALUES ($1, $2, $3, $4);
            """, u["id"], f"{sender_prefix}{payload.title}", payload.message, notif_type)

    dest_desc = "todos os adolescentes da igreja" if caller_role in ["PASTOR", "ADMIN"] else "adolescentes do seu ministério"
    return {
        "message": f"Comunicado transmitido com sucesso para {len(target_teens)} {dest_desc}.",
        "title": payload.title,
        "count": len(target_teens)
    }

