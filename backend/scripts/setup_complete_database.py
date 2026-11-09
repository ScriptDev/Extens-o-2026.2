"""
==============================================================================
Script de Inicialização e Migração Completa do Banco de Dados
Agenda Teens & IA Multimodal para Pregações - Software Factory Labs
==============================================================================
Este script é 100% idempotente (pode ser rodado múltiplas vezes sem apagar dados).
Ele cria todas as tabelas, colunas, índices e dados iniciais (Seed) necessários
para que qualquer desenvolvedor rode o sistema em um banco de dados independente
(Supabase PostgreSQL ou PostgreSQL local).
==============================================================================
"""

import asyncio
import os
import pathlib
import sys
import uuid
import json
import hashlib
from datetime import datetime, timedelta, timezone
from dotenv import load_dotenv
import asyncpg

# [DevSecOps] Carrega variáveis de ambiente
backend_dir = pathlib.Path(__file__).resolve().parent.parent
root_dir = backend_dir.parent
for env_path in [backend_dir / ".env", root_dir / ".env"]:
    if env_path.exists():
        load_dotenv(env_path, override=True)
        break

SALT = "agenda_teens_secure_salt_2026"

def hash_password(password: str) -> str:
    return hashlib.sha256(f"{SALT}{password}".encode("utf-8")).hexdigest()

async def setup_database():
    database_url = os.getenv("DATABASE_URL")
    if not database_url or "sua-senha-aqui" in database_url:
        print("\n❌ ERRO: DATABASE_URL não está configurada no backend/.env!")
        print("   Por favor, configure sua string de conexão do PostgreSQL/Supabase no arquivo backend/.env.")
        print("   Exemplo: DATABASE_URL=\"postgresql://postgres:[SENHA]@db.[REF].supabase.co:5432/postgres\"\n")
        sys.exit(1)

    print(f"\n=================================================================")
    print(f"🚀 INICIANDO SETUP DO BANCO DE DADOS")
    print(f"   Destino: {database_url.split('@')[-1]}")
    print(f"=================================================================")

    try:
        conn = await asyncpg.connect(database_url, timeout=20)
    except Exception as e:
        print(f"\n❌ Falha ao conectar ao banco de dados: {e}")
        print("   Verifique se o host, porta, usuário e senha estão corretos no backend/.env.")
        sys.exit(1)

    try:
        print("\n[1/5] Habilitando extensões e criando tabelas principais...")
        await conn.execute("""
            CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
            CREATE EXTENSION IF NOT EXISTS "pgcrypto";

            -- 1. Usuários e Perfis
            CREATE TABLE IF NOT EXISTS public.users (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                name VARCHAR(255) NOT NULL,
                email VARCHAR(255) UNIQUE NOT NULL,
                password_hash VARCHAR(255) NOT NULL,
                role VARCHAR(50) NOT NULL DEFAULT 'TEEN',
                phone VARCHAR(50) NULL,
                birth_date DATE NULL,
                parent_name VARCHAR(255) NULL,
                parent_phone VARCHAR(50) NULL,
                active BOOLEAN NOT NULL DEFAULT true,
                ministries JSONB DEFAULT '[]'::jsonb,
                tags JSONB DEFAULT '[]'::jsonb,
                created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
            );

            -- 2. Ministérios Oficiais
            CREATE TABLE IF NOT EXISTS public.ministries (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                name VARCHAR(100) NOT NULL UNIQUE,
                description TEXT,
                kanji_symbol VARCHAR(10) NOT NULL,
                kanji_meaning VARCHAR(100) NOT NULL,
                badge_svg TEXT NOT NULL,
                primary_color VARCHAR(50) NOT NULL DEFAULT '#8B5CF6',
                created_by UUID,
                created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
            );

            -- 3. Configurações da Igreja e Terminologia Customizável
            CREATE TABLE IF NOT EXISTS public.church_settings (
                id VARCHAR(50) PRIMARY KEY DEFAULT 'default',
                church_name VARCHAR(255) DEFAULT 'Comunidade Teens',
                group_singular VARCHAR(100) DEFAULT 'Ministério',
                group_plural VARCHAR(100) DEFAULT 'Ministérios',
                available_tags JSONB DEFAULT '["#Teatro", "#Louvor", "#Intercessão", "#Mídia", "#Acolhimento", "#Dança", "#Geral"]'::jsonb,
                tag_suggestions JSONB DEFAULT '[]'::jsonb,
                updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
            );

            -- 4. Eventos e Agenda
            CREATE TABLE IF NOT EXISTS public.events (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                title VARCHAR(255) NOT NULL,
                date TIMESTAMP WITH TIME ZONE NOT NULL,
                location VARCHAR(255) NOT NULL,
                theme VARCHAR(255) NULL,
                cover_image VARCHAR(1024) NULL,
                category VARCHAR(100) DEFAULT 'Culto',
                capacity INT NULL,
                status VARCHAR(50) DEFAULT 'published',
                responsible_id UUID NULL REFERENCES public.users(id) ON DELETE SET NULL,
                responsible_name VARCHAR(255) NULL,
                end_at TIMESTAMP WITH TIME ZONE NULL,
                tags JSONB DEFAULT '[]'::jsonb,
                is_global BOOLEAN DEFAULT false,
                proposed_date TIMESTAMP WITH TIME ZONE,
                proposed_location TEXT,
                pastor_notes TEXT,
                proposed_by UUID,
                ministry_id UUID REFERENCES public.ministries(id) ON DELETE SET NULL,
                ministry_name VARCHAR(100),
                approved_by UUID,
                approved_at TIMESTAMPTZ,
                created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
            );

            -- 5. Esboços de Pregação (IA Multimodal)
            CREATE TABLE IF NOT EXISTS public.sermon_outlines (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                event_id UUID UNIQUE NULL REFERENCES public.events(id) ON DELETE CASCADE,
                title VARCHAR(255) NOT NULL,
                preacher VARCHAR(255) NULL,
                audio_filename VARCHAR(512) NOT NULL,
                media_type VARCHAR(50) DEFAULT 'audio' NOT NULL,
                structured_content JSONB NOT NULL,
                created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
            );

            -- 6. Presenças (RSVP)
            CREATE TABLE IF NOT EXISTS public.event_attendances (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                event_id UUID NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
                user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
                status VARCHAR(50) NOT NULL DEFAULT 'confirmed',
                created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
                CONSTRAINT uq_event_user_attendance UNIQUE (event_id, user_id)
            );

            -- 7. Notificações e Comunicados
            CREATE TABLE IF NOT EXISTS public.notifications (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
                event_id UUID NULL REFERENCES public.events(id) ON DELETE SET NULL,
                title VARCHAR(255) NOT NULL,
                message TEXT NOT NULL,
                type VARCHAR(50) NOT NULL,
                read BOOLEAN NOT NULL DEFAULT false,
                created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
            );
        """)
        print("   ✓ Tabelas e relacionamentos criados com sucesso.")

        print("\n[2/5] Criando índices de performance...")
        await conn.execute("""
            CREATE INDEX IF NOT EXISTS idx_events_date ON public.events(date ASC);
            CREATE INDEX IF NOT EXISTS idx_sermon_outlines_event_id ON public.sermon_outlines(event_id);
            CREATE INDEX IF NOT EXISTS idx_users_email ON public.users(email);
            CREATE INDEX IF NOT EXISTS idx_users_role ON public.users(role);
            CREATE INDEX IF NOT EXISTS idx_event_attendances_event_id ON public.event_attendances(event_id);
            CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON public.notifications(user_id);
        """)
        print("   ✓ Índices criados.")

        print("\n[3/5] Semeando ministérios oficiais com brasões em Kanji...")
        ministries_seed = [
            ("Ministério de Teatro & Artes", "Expressão dramática do Evangelho através de peças e artes cênicas.", "劇", "Arte Dramática e Teatro", "#EC4899",
             '<svg viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg"><circle cx="50" cy="50" r="46" fill="#FCE7F3" stroke="#EC4899" stroke-width="4"/><text x="50" y="62" font-size="34" font-weight="bold" fill="#EC4899" text-anchor="middle" font-family="sans-serif">劇</text></svg>'),
            ("Ministério de Louvor & Adoração", "Condução da igreja na presença de Deus através de cânticos espirituais.", "讃", "Louvor e Cântico", "#8B5CF6",
             '<svg viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg"><circle cx="50" cy="50" r="46" fill="#EDE9FE" stroke="#8B5CF6" stroke-width="4"/><text x="50" y="62" font-size="34" font-weight="bold" fill="#8B5CF6" text-anchor="middle" font-family="sans-serif">讃</text></svg>'),
            ("Ministério de Dança & Expressão", "Adoração ao Senhor através dos movimentos e da arte corporal.", "舞", "Dança Sagrada", "#3B82F6",
             '<svg viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg"><circle cx="50" cy="50" r="46" fill="#DBEAFE" stroke="#3B82F6" stroke-width="4"/><text x="50" y="62" font-size="34" font-weight="bold" fill="#3B82F6" text-anchor="middle" font-family="sans-serif">舞</text></svg>'),
            ("Ministério de Mídia & Transmissão", "Propagação do Reino através da tecnologia, áudio, vídeo e redes.", "光", "Luz e Transmissão", "#10B981",
             '<svg viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg"><circle cx="50" cy="50" r="46" fill="#D1FAE5" stroke="#10B981" stroke-width="4"/><text x="50" y="62" font-size="34" font-weight="bold" fill="#10B981" text-anchor="middle" font-family="sans-serif">光</text></svg>'),
            ("Ministério de Recepção & Acolhimento", "O primeiro abraço e o cuidado com cada vida que chega na casa do Pai.", "和", "Harmonia e Paz", "#F59E0B",
             '<svg viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg"><circle cx="50" cy="50" r="46" fill="#FEF3C7" stroke="#F59E0B" stroke-width="4"/><text x="50" y="62" font-size="34" font-weight="bold" fill="#F59E0B" text-anchor="middle" font-family="sans-serif">和</text></svg>'),
            ("Ministério de Intercessão & Oração", "Coluna de sustentação espiritual e oração fervorosa pela juventude.", "祈", "Oração e Súplica", "#EF4444",
             '<svg viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg"><circle cx="50" cy="50" r="46" fill="#FEE2E2" stroke="#EF4444" stroke-width="4"/><text x="50" y="62" font-size="34" font-weight="bold" fill="#EF4444" text-anchor="middle" font-family="sans-serif">祈</text></svg>')
        ]

        for m_name, m_desc, m_kanji, m_meaning, m_color, m_svg in ministries_seed:
            await conn.execute("""
                INSERT INTO public.ministries (name, description, kanji_symbol, kanji_meaning, primary_color, badge_svg)
                VALUES ($1, $2, $3, $4, $5, $6)
                ON CONFLICT (name) DO UPDATE SET
                    description = EXCLUDED.description,
                    kanji_symbol = EXCLUDED.kanji_symbol,
                    kanji_meaning = EXCLUDED.kanji_meaning,
                    primary_color = EXCLUDED.primary_color,
                    badge_svg = EXCLUDED.badge_svg;
            """, m_name, m_desc, m_kanji, m_meaning, m_color, m_svg)
        print(f"   ✓ {len(ministries_seed)} ministérios oficiais sincronizados.")

        # Obtém ID do ministério de teatro
        teatro_row = await conn.fetchrow("SELECT id FROM public.ministries WHERE name ILIKE '%Teatro%'")
        teatro_id = str(teatro_row["id"]) if teatro_row else None
        teatro_min_json = json.dumps([{"id": teatro_id, "name": "Ministério de Teatro & Artes"}]) if teatro_id else "[]"

        print("\n[4/5] Semeando os 7 usuários oficiais do MVP com senhas criptografadas (senha123)...")
        users_seed = [
            {
                "id": uuid.UUID("99999999-9999-9999-9999-999999999999"),
                "name": "Admin Master",
                "email": "admin@agendateens.com",
                "role": "ADMIN",
                "phone": "(85) 99999-0000",
                "parent_name": None,
                "parent_phone": None,
                "ministries": "[]",
                "tags": "[]"
            },
            {
                "id": uuid.UUID("00000000-1111-2222-3333-444444444444"),
                "name": "Pr. Paulo Roberto (Pastor Sênior)",
                "email": "pastor@agendateens.com",
                "role": "PASTOR",
                "phone": "(85) 97777-1111",
                "parent_name": None,
                "parent_phone": None,
                "ministries": "[]",
                "tags": "[]"
            },
            {
                "id": uuid.UUID("22222222-3333-4444-5555-666666666666"),
                "name": "Jorge Oliveira (Líder)",
                "email": "jorge@agendateens.com",
                "role": "LEADER",
                "phone": "(11) 98888-1001",
                "parent_name": None,
                "parent_phone": None,
                "ministries": teatro_min_json,
                "tags": json.dumps(["#Teatro"])
            },
            {
                "id": uuid.UUID("33333333-4444-5555-6666-777777777777"),
                "name": "Carlos Silva (Membro Teatro)",
                "email": "carlos@agendateens.com",
                "role": "TEEN",
                "phone": "(11) 97777-2002",
                "parent_name": "Antônio Silva (Pai)",
                "parent_phone": "(11) 97777-9999",
                "ministries": teatro_min_json,
                "tags": json.dumps(["#Teatro"])
            },
            {
                "id": uuid.UUID("11111111-2222-3333-4444-555555555555"),
                "name": "Pr. Marcos Silva (Líder Teens)",
                "email": "lider@agendateens.com",
                "role": "LEADER",
                "phone": "(85) 98888-1234",
                "parent_name": None,
                "parent_phone": None,
                "ministries": "[]",
                "tags": "[]"
            },
            {
                "id": uuid.UUID("66666666-7777-8888-9999-000000000000"),
                "name": "Gabriel Santos (Adolescente)",
                "email": "adolescente@agendateens.com",
                "role": "TEEN",
                "phone": "(85) 99999-5678",
                "parent_name": "Mariana Santos (Mãe)",
                "parent_phone": "(85) 98765-4321",
                "ministries": "[]",
                "tags": "[]"
            },
            {
                "id": uuid.UUID("77777777-8888-9999-aaaa-bbbbbbbbbbbb"),
                "name": "Samuel Mendes Cardoso",
                "email": "samuelmendescf@gmail.com",
                "role": "TEEN",
                "phone": "85987550573",
                "parent_name": "Ismael Melo Cardoso",
                "parent_phone": "85992002575",
                "ministries": "[]",
                "tags": "[]"
            }
        ]

        pwd_hash = hash_password("senha123")
        for u in users_seed:
            await conn.execute("""
                INSERT INTO public.users (id, name, email, password_hash, role, phone, parent_name, parent_phone, ministries, tags)
                VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9::jsonb, $10::jsonb)
                ON CONFLICT (email) DO UPDATE SET
                    name = EXCLUDED.name,
                    password_hash = EXCLUDED.password_hash,
                    role = EXCLUDED.role,
                    phone = EXCLUDED.phone,
                    parent_name = EXCLUDED.parent_name,
                    parent_phone = EXCLUDED.parent_phone,
                    ministries = EXCLUDED.ministries,
                    tags = EXCLUDED.tags;
            """, u["id"], u["name"], u["email"], pwd_hash, u["role"], u["phone"], u["parent_name"], u["parent_phone"], u["ministries"], u["tags"])

        print(f"   ✓ {len(users_seed)} usuários cadastrados/sincronizados.")

        print("\n[5/5] Semeando configurações da igreja e evento de exemplo...")
        await conn.execute("""
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
        """)

        # Evento de teste
        now = datetime.now(timezone.utc)
        event_date = now + timedelta(days=2, hours=3)
        await conn.execute("""
            INSERT INTO public.events (
                title, date, location, theme, category, capacity, status, 
                responsible_name, is_global, tags
            )
            SELECT 
                'Culto Especial de Conexão Teens', 
                $1, 
                'Templo Principal - Rua Eclesiástica, 100', 
                'Identidade em Cristo e Propósito', 
                'Culto', 
                80, 
                'published', 
                'Pr. Paulo Roberto (Pastor Sênior)', 
                true, 
                '["#Geral"]'::jsonb
            WHERE NOT EXISTS (
                SELECT 1 FROM public.events WHERE title = 'Culto Especial de Conexão Teens'
            );
        """, event_date)
        print("   ✓ Configurações da igreja e agenda inicial semeadas.")

        # Resumo final
        users_count = await conn.fetchval("SELECT COUNT(*) FROM public.users;")
        events_count = await conn.fetchval("SELECT COUNT(*) FROM public.events;")
        min_count = await conn.fetchval("SELECT COUNT(*) FROM public.ministries;")

        print("\n=================================================================")
        print("🎉 BANCO DE DADOS CONFIGURADO COM 100% DE SUCESSO!")
        print("=================================================================")
        print(f"   📊 Usuários Cadastrados:    {users_count}")
        print(f"   🏛️  Ministérios Oficiais:   {min_count}")
        print(f"   📅 Eventos Ativos:          {events_count}")
        print("   🔑 Senha padrão de todos:   senha123")
        print("=================================================================\n")

    finally:
        await conn.close()

if __name__ == "__main__":
    asyncio.run(setup_database())
