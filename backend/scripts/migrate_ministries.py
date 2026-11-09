import asyncio
import os
import uuid
from dotenv import load_dotenv
import asyncpg
import hashlib

load_dotenv("backend/.env")

def hash_password(pwd: str) -> str:
    return hashlib.sha256(pwd.encode()).hexdigest()

async def migrate_and_seed():
    url = os.getenv("DATABASE_URL")
    print(f"Executando migração no Supabase...")
    conn = await asyncpg.connect(url)
    
    # 1. Tabela de Ministérios Oficiais
    await conn.execute("""
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
    """)
    print("✓ Tabela public.ministries criada/verificada.")

    # 2. Adicionar colunas em users para ministérios (max 3) e tags
    await conn.execute("""
        ALTER TABLE public.users 
        ADD COLUMN IF NOT EXISTS ministries JSONB DEFAULT '[]'::jsonb,
        ADD COLUMN IF NOT EXISTS tags JSONB DEFAULT '[]'::jsonb;
    """)
    print("✓ Colunas ministries e tags adicionadas em public.users.")

    # 3. Adicionar colunas em events para approval_status e ministry_id
    await conn.execute("""
        ALTER TABLE public.events 
        ADD COLUMN IF NOT EXISTS ministry_id UUID REFERENCES public.ministries(id) ON DELETE SET NULL,
        ADD COLUMN IF NOT EXISTS ministry_name VARCHAR(100),
        ADD COLUMN IF NOT EXISTS approved_by UUID,
        ADD COLUMN IF NOT EXISTS approved_at TIMESTAMPTZ;
    """)
    print("✓ Colunas ministry_id, approved_by e approved_at adicionadas em public.events.")

    # 4. Criar usuário ADMIN (Super Administrador com Modo Ghost)
    admin_id = uuid.UUID("99999999-8888-7777-6666-555555555555")
    await conn.execute("""
        INSERT INTO public.users (id, name, email, password_hash, role, phone, active)
        VALUES ($1, 'Admin Master (Super Admin)', 'admin@agendateens.com', $2, 'ADMIN', '(85) 99999-0000', true)
        ON CONFLICT (email) DO UPDATE 
        SET role = 'ADMIN', name = 'Admin Master (Super Admin)';
    """, admin_id, hash_password("senha123"))
    print("✓ Usuário ADMIN verificado/criado (admin@agendateens.com).")

    # 5. Semear Ministérios Iniciais com Símbolos Japoneses (Kanji) em SVG
    initial_ministries = [
        {
            "id": uuid.UUID("a1111111-1111-1111-1111-111111111111"),
            "name": "Ministério Teens Hikari",
            "description": "Ministério de Adolescentes focado em ser luz do mundo (Mateus 5:14).",
            "kanji_symbol": "光",
            "kanji_meaning": "Hikari (Luz)",
            "primary_color": "#8B5CF6",
            "badge_svg": """<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg" class="w-full h-full drop-shadow-[0_0_12px_rgba(139,92,246,0.6)]">
  <defs>
    <linearGradient id="grad-hikari" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#8B5CF6"/>
      <stop offset="50%" stop-color="#C084FC"/>
      <stop offset="100%" stop-color="#F43F5E"/>
    </linearGradient>
  </defs>
  <polygon points="50,4 92,26 92,74 50,96 8,74 8,26" fill="#0f0728" stroke="url(#grad-hikari)" stroke-width="4" stroke-linejoin="round"/>
  <circle cx="50" cy="50" r="32" fill="#1e1045" stroke="#A855F7" stroke-width="1.5" stroke-dasharray="3,2"/>
  <text x="50" y="61" font-size="34" font-weight="900" font-family="'Noto Sans JP', 'Hiragino Kaku Gothic Pro', 'Yu Gothic', sans-serif" fill="#FFFFFF" text-anchor="middle" filter="drop-shadow(0 0 6px #C084FC)">光</text>
</svg>"""
        },
        {
            "id": uuid.UUID("a2222222-2222-2222-2222-222222222222"),
            "name": "Kizuna Louvor & Adoração",
            "description": "Equipe de música e artes unida pelo vínculo perfeito do amor e comunhão (Colossenses 3:14).",
            "kanji_symbol": "絆",
            "kanji_meaning": "Kizuna (Vínculo / Comunhão)",
            "primary_color": "#EC4899",
            "badge_svg": """<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg" class="w-full h-full drop-shadow-[0_0_12px_rgba(236,72,153,0.6)]">
  <defs>
    <linearGradient id="grad-kizuna" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#EC4899"/>
      <stop offset="50%" stop-color="#F472B6"/>
      <stop offset="100%" stop-color="#FB7185"/>
    </linearGradient>
  </defs>
  <polygon points="50,4 94,50 50,96 6,50" fill="#240718" stroke="url(#grad-kizuna)" stroke-width="4" stroke-linejoin="round"/>
  <circle cx="50" cy="50" r="28" fill="#3b0c29" stroke="#F472B6" stroke-width="1.5"/>
  <text x="50" y="61" font-size="32" font-weight="900" font-family="'Noto Sans JP', 'Hiragino Kaku Gothic Pro', 'Yu Gothic', sans-serif" fill="#FFFFFF" text-anchor="middle" filter="drop-shadow(0 0 6px #FB7185)">絆</text>
</svg>"""
        },
        {
            "id": uuid.UUID("a3333333-3333-3333-3333-333333333333"),
            "name": "Yū Jovens & Universitários",
            "description": "Jovens fortes com a palavra de Deus em seus corações e coragem apostólica (1 João 2:14).",
            "kanji_symbol": "勇",
            "kanji_meaning": "Yū (Coragem / Bravura)",
            "primary_color": "#3B82F6",
            "badge_svg": """<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg" class="w-full h-full drop-shadow-[0_0_12px_rgba(59,130,246,0.6)]">
  <defs>
    <linearGradient id="grad-yu" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#3B82F6"/>
      <stop offset="50%" stop-color="#60A5FA"/>
      <stop offset="100%" stop-color="#06B6D4"/>
    </linearGradient>
  </defs>
  <circle cx="50" cy="50" r="44" fill="#071933" stroke="url(#grad-yu)" stroke-width="4"/>
  <polygon points="50,14 84,78 16,78" fill="none" stroke="#60A5FA" stroke-width="1.5" stroke-dasharray="4,2"/>
  <text x="50" y="62" font-size="34" font-weight="900" font-family="'Noto Sans JP', 'Hiragino Kaku Gothic Pro', 'Yu Gothic', sans-serif" fill="#FFFFFF" text-anchor="middle" filter="drop-shadow(0 0 6px #60A5FA)">勇</text>
</svg>"""
        },
        {
            "id": uuid.UUID("a4444444-4444-4444-4444-444444444444"),
            "name": "Sei Células & Discipulado",
            "description": "Discipulado bíblico e consagração ao Senhor nos lares (Atos 2:46).",
            "kanji_symbol": "聖",
            "kanji_meaning": "Sei (Santidade / Consagração)",
            "primary_color": "#10B981",
            "badge_svg": """<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg" class="w-full h-full drop-shadow-[0_0_12px_rgba(16,185,129,0.6)]">
  <defs>
    <linearGradient id="grad-sei" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#10B981"/>
      <stop offset="50%" stop-color="#34D399"/>
      <stop offset="100%" stop-color="#A7F3D0"/>
    </linearGradient>
  </defs>
  <polygon points="50,6 88,38 74,90 26,90 12,38" fill="#06241a" stroke="url(#grad-sei)" stroke-width="4" stroke-linejoin="round"/>
  <circle cx="50" cy="52" r="28" fill="#0b3829" stroke="#34D399" stroke-width="1.5"/>
  <text x="50" y="63" font-size="32" font-weight="900" font-family="'Noto Sans JP', 'Hiragino Kaku Gothic Pro', 'Yu Gothic', sans-serif" fill="#FFFFFF" text-anchor="middle" filter="drop-shadow(0 0 6px #34D399)">聖</text>
</svg>"""
        }
    ]

    for m in initial_ministries:
        await conn.execute("""
            INSERT INTO public.ministries (id, name, description, kanji_symbol, kanji_meaning, badge_svg, primary_color)
            VALUES ($1, $2, $3, $4, $5, $6, $7)
            ON CONFLICT (name) DO UPDATE 
            SET kanji_symbol = EXCLUDED.kanji_symbol,
                kanji_meaning = EXCLUDED.kanji_meaning,
                badge_svg = EXCLUDED.badge_svg,
                primary_color = EXCLUDED.primary_color;
        """, m["id"], m["name"], m["description"], m["kanji_symbol"], m["kanji_meaning"], m["badge_svg"], m["primary_color"])
    print(f"✓ {len(initial_ministries)} ministérios com brasões em Kanji semeados.")

    # 6. Atualizar Líder Marcos com 2 Ministérios de exemplo (respeitando o limite de máx 3)
    import json
    leader_ministries = [
        {"id": "a1111111-1111-1111-1111-111111111111", "name": "Ministério Teens Hikari"},
        {"id": "a2222222-2222-2222-2222-222222222222", "name": "Kizuna Louvor & Adoração"}
    ]
    await conn.execute("""
        UPDATE public.users 
        SET ministries = $1::jsonb,
            tags = '["Coordenação Geral", "Ministração", "Discipulado"]'::jsonb
        WHERE email = 'lider@agendateens.com';
    """, json.dumps(leader_ministries))
    print("✓ Líder Pr. Marcos vinculado a 2 ministérios e tags atribuídas.")

    # 7. Atualizar eventos existentes para ter ministério padrão
    await conn.execute("""
        UPDATE public.events 
        SET ministry_id = 'a1111111-1111-1111-1111-111111111111',
            ministry_name = 'Ministério Teens Hikari'
        WHERE ministry_id IS NULL;
    """)
    print("✓ Eventos vinculados ao ministério padrão.")

    await conn.close()
    print("Migração concluída com 100% de sucesso!")

if __name__ == "__main__":
    asyncio.run(migrate_and_seed())

