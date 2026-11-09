import asyncio
import pathlib
import asyncpg

async def run_migration():
    url = "postgresql://postgres.gtmapveuncewqoqgxbgh:exte%402026.2@aws-0-us-east-1.pooler.supabase.com:5432/postgres"
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

