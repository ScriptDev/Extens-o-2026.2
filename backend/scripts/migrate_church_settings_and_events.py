import asyncio
import os
import uuid
import json
import hashlib
from datetime import datetime, timedelta, timezone
import asyncpg
from dotenv import load_dotenv

load_dotenv("backend/.env")

SALT = "agenda_teens_secure_salt_2026"

def hash_pwd(password: str) -> str:
    return hashlib.sha256(f"{SALT}{password}".encode("utf-8")).hexdigest()

async def run_migration():
    url = os.getenv("DATABASE_URL")
    print(f"Conectando a {url.split('@')[-1]}...")
    conn = await asyncpg.connect(url)

    print("1. Criando tabela church_settings e colunas adicionais em events...")
    await conn.execute("""
        CREATE TABLE IF NOT EXISTS public.church_settings (
            id VARCHAR(50) PRIMARY KEY DEFAULT 'default',
            church_name VARCHAR(255) DEFAULT 'Comunidade Teens',
            group_singular VARCHAR(100) DEFAULT 'Ministério',
            group_plural VARCHAR(100) DEFAULT 'Ministérios',
            available_tags JSONB DEFAULT '["#Teatro", "#Louvor", "#Intercessão", "#Mídia", "#Acolhimento", "#Dança", "#Geral"]'::jsonb,
            tag_suggestions JSONB DEFAULT '[]'::jsonb,
            updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        );

        INSERT INTO public.church_settings (id, church_name, group_singular, group_plural, available_tags, tag_suggestions)
        VALUES (
            'default', 
            'Comunidade Teens', 
            'Ministério', 
            'Ministérios', 
            '["#Teatro", "#Louvor", "#Intercessão", "#Mídia", "#Acolhimento", "#Dança", "#Geral"]'::jsonb, 
            '[]'::jsonb
        )
        ON CONFLICT (id) DO NOTHING;

        -- Colunas para Homologação Bilateral e Tags no events
        ALTER TABLE public.events ADD COLUMN IF NOT EXISTS tags JSONB DEFAULT '[]'::jsonb;
        ALTER TABLE public.events ADD COLUMN IF NOT EXISTS is_global BOOLEAN DEFAULT false;
        ALTER TABLE public.events ADD COLUMN IF NOT EXISTS proposed_date TIMESTAMP WITH TIME ZONE;
        ALTER TABLE public.events ADD COLUMN IF NOT EXISTS proposed_location TEXT;
        ALTER TABLE public.events ADD COLUMN IF NOT EXISTS pastor_notes TEXT;
        ALTER TABLE public.events ADD COLUMN IF NOT EXISTS proposed_by UUID;
    """)

    print("2. Verificando/Criando Jorge (Líder Teatro) e Carlos (Teen Teatro)...")
    teatro_row = await conn.fetchrow("SELECT id, name, kanji_symbol FROM public.ministries WHERE name ILIKE '%Teatro%'")
    if not teatro_row:
        teatro_id = uuid.uuid4()
        await conn.execute("""
            INSERT INTO public.ministries (id, name, description, kanji_symbol, kanji_meaning, primary_color, badge_svg)
            VALUES ($1, 'Ministério de Teatro & Artes', 'Expressão dramática do Evangelho através de peças e artes cênicas.', '劇', 'Arte Dramática e Teatro', '#EC4899', '<svg viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg"><circle cx="50" cy="50" r="46" fill="#FCE7F3" stroke="#EC4899" stroke-width="4"/><text x="50" y="62" font-size="34" font-weight="bold" fill="#EC4899" text-anchor="middle" font-family="sans-serif">劇</text></svg>');
        """, teatro_id)
        teatro_min = {"id": str(teatro_id), "name": "Ministério de Teatro & Artes", "kanji": "劇"}
    else:
        teatro_min = {"id": str(teatro_row["id"]), "name": teatro_row["name"], "kanji": teatro_row["kanji_symbol"]}

    # Jorge (Líder)
    jorge_row = await conn.fetchrow("SELECT id FROM public.users WHERE email = 'jorge@agendateens.com'")
    if not jorge_row:
        jorge_id = uuid.uuid4()
        await conn.execute("""
            INSERT INTO public.users (id, name, email, password_hash, role, phone, active, ministries, tags)
            VALUES ($1, 'Jorge Oliveira (Líder)', 'jorge@agendateens.com', $2, 'LEADER', '(11) 98888-1001', true, $3::jsonb, $4::jsonb);
        """, jorge_id, hash_pwd("senha123"), json.dumps([teatro_min]), json.dumps(["#Teatro"]))
        print("Criado Jorge (Líder de Teatro)")
    else:
        jorge_id = jorge_row["id"]
        await conn.execute("""
            UPDATE public.users 
            SET ministries = $1::jsonb, tags = $2::jsonb 
            WHERE id = $3;
        """, json.dumps([teatro_min]), json.dumps(["#Teatro"]), jorge_id)

    # Carlos (Teen)
    carlos_row = await conn.fetchrow("SELECT id FROM public.users WHERE email = 'carlos@agendateens.com'")
    if not carlos_row:
        carlos_id = uuid.uuid4()
        await conn.execute("""
            INSERT INTO public.users (id, name, email, password_hash, role, phone, parent_name, parent_phone, active, ministries, tags)
            VALUES ($1, 'Carlos Silva (Membro Teatro)', 'carlos@agendateens.com', $2, 'TEEN', '(11) 97777-2002', 'Marcos Silva', '(11) 97777-2000', true, $3::jsonb, $4::jsonb);
        """, carlos_id, hash_pwd("senha123"), json.dumps([teatro_min]), json.dumps(["#Teatro"]))
        print("Criado Carlos (Teen de Teatro)")
    else:
        carlos_id = carlos_row["id"]
        await conn.execute("""
            UPDATE public.users 
            SET ministries = $1::jsonb, tags = $2::jsonb 
            WHERE id = $3;
        """, json.dumps([teatro_min]), json.dumps(["#Teatro"]), carlos_id)

    print("3. Criando histórico temporal de eventos e presenças para alimentar a IA...")
    now = datetime.now(timezone.utc)
    # Evento de 25 dias atrás (Teatro) - Carlos esteve presente
    ev1_id = uuid.uuid4()
    await conn.execute("""
        INSERT INTO public.events (id, title, date, location, theme, description, status, ministry_id, ministry_name, responsible_id, responsible_name, tags, is_global)
        VALUES ($1, 'Ensaio Geral da Peça da Páscoa', $2, 'Auditório das Artes', 'Redenção', 'Primeiro ensaio do elenco principal', 'published', $3, $4, $5, 'Jorge Oliveira (Líder)', '["#Teatro"]'::jsonb, false)
        ON CONFLICT (id) DO NOTHING;
    """, ev1_id, now - timedelta(days=25), uuid.UUID(teatro_min["id"]), teatro_min["name"], jorge_id)

    # Carlos esteve presente
    await conn.execute("""
        INSERT INTO public.event_attendances (id, event_id, user_id, status, created_at)
        VALUES ($1, $2, $3, 'confirmed', $4)
        ON CONFLICT (id) DO NOTHING;
    """, uuid.uuid4(), ev1_id, carlos_id, now - timedelta(days=25))

    # Evento Geral da Igreja (Culto da Família - 7 dias atrás) - Global
    ev_global_id = uuid.uuid4()
    await conn.execute("""
        INSERT INTO public.events (id, title, date, location, theme, description, status, is_global, tags)
        VALUES ($1, 'Culto da Família e Santa Ceia', $2, 'Templo Principal', 'Comunhão e Aliança', 'Culto geral com toda a congregação reunida.', 'published', true, '["#Geral"]'::jsonb)
        ON CONFLICT (id) DO NOTHING;
    """, ev_global_id, now - timedelta(days=7))

    # Evento pendente de homologação bilateral criado pelo Jorge
    ev_bilateral_id = uuid.uuid4()
    await conn.execute("""
        INSERT INTO public.events (id, title, date, location, theme, description, status, ministry_id, ministry_name, responsible_id, responsible_name, tags, is_global)
        VALUES ($1, 'Oficina de Expressão Corporal e Teatro', $2, 'Sala 4 - Jovens', 'Corpo e Louvor', 'Oficina prática de técnicas teatrais para adolescentes.', 'pending_pastor_approval', $3, $4, $5, 'Jorge Oliveira (Líder)', '["#Teatro"]'::jsonb, false)
        ON CONFLICT (id) DO NOTHING;
    """, ev_bilateral_id, now + timedelta(days=5), uuid.UUID(teatro_min["id"]), teatro_min["name"], jorge_id)

    print("Migração e sementes executadas com sucesso!")
    await conn.close()

if __name__ == "__main__":
    asyncio.run(run_migration())
