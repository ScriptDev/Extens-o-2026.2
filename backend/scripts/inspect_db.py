import asyncio
import os
from dotenv import load_dotenv
import asyncpg

load_dotenv("backend/.env")

async def main():
    url = os.getenv("DATABASE_URL")
    print(f"Conectando a {url.split('@')[-1]}...")
    conn = await asyncpg.connect(url)
    
    tables = await conn.fetch("SELECT table_name FROM information_schema.tables WHERE table_schema='public' ORDER BY table_name")
    print("Tabelas:", [t["table_name"] for t in tables])
    
    cols_events = await conn.fetch("SELECT column_name, data_type FROM information_schema.columns WHERE table_name='events'")
    print("Colunas events:", [c["column_name"] for c in cols_events])
    
    cols_users = await conn.fetch("SELECT column_name, data_type FROM information_schema.columns WHERE table_name='users'")
    print("Colunas users:", [c["column_name"] for c in cols_users])
    
    users = await conn.fetch("SELECT email, role FROM public.users")
    print("Usuarios atuais:", [dict(u) for u in users])
    
    await conn.close()

if __name__ == "__main__":
    asyncio.run(main())

