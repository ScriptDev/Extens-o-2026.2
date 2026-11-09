import asyncio
import os
import pathlib
import sys
import asyncpg

async def init_db():
    url = "postgresql://postgres.gtmapveuncewqoqgxbgh:exte%402026.2@aws-0-us-east-1.pooler.supabase.com:5432/postgres"
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
