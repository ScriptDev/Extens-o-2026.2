import asyncio
import hashlib
import uuid
import asyncpg

def hash_password(password: str) -> str:
    # Hash SHA-256 seguro com salting fixo de aplicação
    salt = "agenda_teens_secure_salt_2026"
    return hashlib.sha256(f"{salt}{password}".encode("utf-8")).hexdigest()

async def seed_users():
    url = "postgresql://postgres.gtmapveuncewqoqgxbgh:exte%402026.2@aws-0-us-east-1.pooler.supabase.com:5432/postgres"
    conn = await asyncpg.connect(url, timeout=15)
    print("Conectado ao Supabase para semear usuários da Agenda Teens...")

    pastor_id = uuid.UUID("00000000-1111-2222-3333-444444444444")
    leader_id = uuid.UUID("11111111-2222-3333-4444-555555555555")
    teen_id = uuid.UUID("66666666-7777-8888-9999-000000000000")

    users = [
        {
            "id": pastor_id,
            "name": "Pr. Paulo Roberto (Pastor Sênior)",
            "email": "pastor@agendateens.com",
            "password_hash": hash_password("senha123"),
            "role": "PASTOR",
            "phone": "(85) 97777-1111",
            "parent_name": None,
            "parent_phone": None
        },
        {
            "id": leader_id,
            "name": "Pr. Marcos Silva (Líder Teens)",
            "email": "lider@agendateens.com",
            "password_hash": hash_password("senha123"),
            "role": "LEADER",
            "phone": "(85) 98888-1234",
            "parent_name": None,
            "parent_phone": None
        },
        {
            "id": teen_id,
            "name": "Gabriel Santos (Adolescente)",
            "email": "adolescente@agendateens.com",
            "password_hash": hash_password("senha123"),
            "role": "TEEN",
            "phone": "(85) 99999-5678",
            "parent_name": "Mariana Santos (Mãe)",
            "parent_phone": "(85) 98765-4321"
        }
    ]

    for u in users:
        await conn.execute("""
            INSERT INTO public.users (id, name, email, password_hash, role, phone, parent_name, parent_phone)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
            ON CONFLICT (email) DO UPDATE SET
                name = EXCLUDED.name,
                role = EXCLUDED.role,
                phone = EXCLUDED.phone,
                parent_name = EXCLUDED.parent_name,
                parent_phone = EXCLUDED.parent_phone;
        """, u["id"], u["name"], u["email"], u["password_hash"], u["role"], u["phone"], u["parent_name"], u["parent_phone"])
        print(f"Usuário semeado: {u['name']} ({u['email']}) [Role: {u['role']}]")

    await conn.close()
    print("Usuários da Agenda Teens prontos com sucesso!")

if __name__ == "__main__":
    asyncio.run(seed_users())

