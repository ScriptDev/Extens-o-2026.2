import asyncio
import hashlib
import os
from dotenv import load_dotenv
import asyncpg

load_dotenv("backend/.env")

SALT = "agenda_teens_secure_salt_2026"

def hash_password(password: str) -> str:
    return hashlib.sha256(f"{SALT}{password}".encode("utf-8")).hexdigest()

async def main():
    url = os.getenv("DATABASE_URL")
    print("Atualizando senhas de todos os 7 usuários iniciais do MVP no Supabase...")
    conn = await asyncpg.connect(url)
    
    users = [
        ("admin@agendateens.com", "Admin Master (Super Admin)", "ADMIN"),
        ("pastor@agendateens.com", "Pr. Paulo Roberto (Pastor Sênior)", "PASTOR"),
        ("jorge@agendateens.com", "Jorge Oliveira (Líder Teatro)", "LEADER"),
        ("carlos@agendateens.com", "Carlos Silva (Membro Teatro)", "TEEN"),
        ("lider@agendateens.com", "Pr. Marcos Silva (Líder Teens)", "LEADER"),
        ("adolescente@agendateens.com", "Gabriel Santos (Adolescente)", "TEEN"),
        ("samuelmendescf@gmail.com", "Samuel Mendes Cardoso", "TEEN"),
    ]
    
    pwd_hash = hash_password("senha123")
    
    for email, name, role in users:
        await conn.execute("""
            UPDATE public.users 
            SET password_hash = $1,
                name = COALESCE(name, $2),
                role = $3
            WHERE email = $4
        """, pwd_hash, name, role, email)
        print(f"Atualizado: {email} -> {role} (Senha: senha123)")
        
    await conn.close()
    print("Todas as contas do MVP sincronizadas com sucesso!")

if __name__ == "__main__":
    asyncio.run(main())
