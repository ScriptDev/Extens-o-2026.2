import asyncio
import os
import uuid
from dotenv import load_dotenv
import asyncpg

load_dotenv("backend/.env")

async def main():
    url = os.getenv("DATABASE_URL")
    print("Semeando recado oficial do Líder Jorge para os Teens no Supabase...")
    conn = await asyncpg.connect(url)
    
    # Busca Carlos Silva (Teen de Teatro)
    carlos = await conn.fetchrow("SELECT id FROM public.users WHERE email = 'carlos@agendateens.com'")
    if carlos:
        # Insere recado do Líder Jorge
        await conn.execute("""
            INSERT INTO public.notifications (user_id, title, message, type, read)
            VALUES ($1, $2, $3, 'LEADER_ANNOUNCEMENT', false)
        """, carlos["id"], 
            "🎭 Recado do Líder Jorge: Ensaio Geral na Sexta às 18h",
            "Fala galera do Ministério de Teatro! Lembrem-se de levar o figurino preto na sexta para o nosso ensaio geral do culto de celebração. Cheguem 15 minutos antes para orarmos juntos! Vocês são feras! 🔥"
        )
        print("Recado oficial inserido com sucesso para Carlos Silva!")

    await conn.close()

if __name__ == "__main__":
    asyncio.run(main())

