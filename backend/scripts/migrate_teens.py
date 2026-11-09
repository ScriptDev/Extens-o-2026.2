import asyncio
import os
import pathlib
import sys
import asyncpg
from dotenv import load_dotenv

env_path = pathlib.Path(__file__).resolve().parent.parent / ".env"
load_dotenv(env_path)

async def run_migration():
    url = os.getenv("DATABASE_URL")
    if not url:
        print("ERRO: DATABASE_URL não definida no .env")
        sys.exit(1)
    sql_path = pathlib.Path(__file__).resolve().parent.parent / "prisma" / "migrations" / "02_agenda_teens.sql"
    sql = sql_path.read_text(encoding="utf-8")

    print("Executando migration Agenda Teens no Supabase...")
    conn = await asyncpg.connect(url, timeout=15)
    try:
        await conn.execute(sql)
        tables = await conn.fetch(
            "SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' ORDER BY table_name"
        )
        print("Tabelas no Supabase após migration:")
        for t in tables:
            print(" -", t["table_name"])
    finally:
        await conn.close()

if __name__ == "__main__":
    asyncio.run(run_migration())

