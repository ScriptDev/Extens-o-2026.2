import asyncio
import logging
import os
from typing import Optional
import asyncpg
from app.config import get_settings

logger = logging.getLogger(__name__)

_pool: Optional[asyncpg.Pool] = None


async def get_pool() -> Optional[asyncpg.Pool]:
    """
    Retorna o Pool de Conexões assíncrono com o Supabase PostgreSQL.
    """
    global _pool
    return _pool


async def connect_database() -> Optional[asyncpg.Pool]:
    """
    [DevSecOps] Inicializa o pool de conexões com o PostgreSQL (Supabase).
    Utiliza timeout seguro para não bloquear o startup caso a rede oscile.
    """
    global _pool
    if _pool is not None:
        return _pool

    settings = get_settings()
    db_url = settings.DATABASE_URL

    if not db_url or "sua-senha-aqui" in db_url:
        logger.warning("DATABASE_URL não configurada ou com credenciais de exemplo. Operando em modo resiliente local.")
        return None

    try:
        logger.info(f"Conectando ao Supabase PostgreSQL...")
        _pool = await asyncio.wait_for(
            asyncpg.create_pool(
                dsn=db_url,
                min_size=1,
                max_size=10,
                command_timeout=15,
                timeout=5.0
            ),
            timeout=6.0
        )
        logger.info("Conexão e Pool com PostgreSQL/Supabase estabelecidos com sucesso!")
        return _pool
    except Exception as e:
        logger.warning(
            f"Não foi possível conectar ao Supabase remoto ({e}). "
            f"A API operará em modo resiliente com persistência em memória."
        )
        _pool = None
        return None


async def disconnect_database():
    """Fecha o pool de conexões ao desligar a aplicação."""
    global _pool
    if _pool:
        try:
            await _pool.close()
            logger.info("Pool com Supabase PostgreSQL encerrado com sucesso.")
        except Exception as e:
            logger.warning(f"Erro ao encerrar pool: {e}")
        finally:
            _pool = None

