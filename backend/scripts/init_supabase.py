import asyncio
import os
import pathlib
import sys
import asyncpg
from dotenv import load_dotenv

# Carrega .env do backend ou da raiz
env_path = pathlib.Path(__file__).resolve().parent.parent / ".env"
load_dotenv(env_path)

async def init_db():
    url = os.getenv("DATABASE_URL")
    if not url:
        print("ERRO: DATABASE_URL não definida no .env")
        sys.exit(1)
    sql_path = pathlib.Path(__file__).resolve().parent.parent / "prisma" / "migrations" / "01_init.sql"
    sql_content = sql_path.read_text(encoding="utf-8")

    print(f"Conectando ao Supabase em: {url.split('@')[1]}...")
    conn = await asyncpg.connect(url, timeout=15)
    try:
        print("Executando migration 01_init.sql...")
        await conn.execute(sql_content)
        rows = await conn.fetch(
            "SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' ORDER BY table_name"
        )
        print("Tabelas no schema public:", [r['table_name'] for r in rows])
    finally:
        await conn.close()
    print("Banco de dados Supabase inicializado com sucesso!")

if __name__ == "__main__":
    asyncio.run(init_db())
