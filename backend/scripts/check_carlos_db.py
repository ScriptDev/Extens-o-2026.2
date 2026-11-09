import asyncio
import os
import asyncpg
from dotenv import load_dotenv

load_dotenv("backend/.env")

async def check():
    url = os.getenv("DATABASE_URL")
    conn = await asyncpg.connect(url)
    row = await conn.fetchrow("SELECT id, name, email, role, ministries, tags FROM public.users WHERE email = 'carlos@agendateens.com'")
    print("Carlos DB row:", dict(row) if row else "Not found")
    await conn.close()

if __name__ == "__main__":
    asyncio.run(check())

