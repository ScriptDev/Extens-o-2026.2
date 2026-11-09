import asyncio
import os
import asyncpg
from dotenv import load_dotenv

load_dotenv("backend/.env")

async def check():
    url = os.getenv("DATABASE_URL")
    conn = await asyncpg.connect(url)
    cols = await conn.fetch("SELECT column_name, data_type FROM information_schema.columns WHERE table_name='event_attendances'")
    print("Colunas event_attendances:", [c["column_name"] for c in cols])
    await conn.close()

if __name__ == "__main__":
    asyncio.run(check())

