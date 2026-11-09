import asyncio
import logging
from typing import Optional

logger = logging.getLogger(__name__)

# Instância Singleton global do cliente Prisma (Python)
_prisma_client = None


def get_prisma_client():
    """
    [Arquitetura] Gerencia o ciclo de vida do Prisma Client no Python.
    Utiliza instanciação preguiçosa (Lazy Initialization).
    """
    global _prisma_client
    if _prisma_client is None:
        try:
            from prisma import Prisma
            _prisma_client = Prisma(auto_register=True)
            logger.info("Prisma Client instanciado com sucesso.")
        except ImportError:
            logger.warning(
                "Biblioteca 'prisma' não encontrada ou cliente Prisma Python ainda não gerado ('prisma generate')."
            )
            _prisma_client = None
    return _prisma_client


async def connect_database():
    """
    Conecta ao banco de dados Supabase no startup da aplicação.
    [Resiliência] Utiliza timeout de 3 segundos para não travar a inicialização do FastAPI
    caso a connection string do Supabase ainda contenha a senha de exemplo.
    """
    client = get_prisma_client()
    if client and not client.is_connected():
        try:
            # Não bloqueia o startup se a internet ou banco estiver fora
            await asyncio.wait_for(client.connect(), timeout=3.0)
            logger.info("Conexão com PostgreSQL/Supabase via Prisma estabelecida com sucesso.")
        except asyncio.TimeoutError:
            logger.warning(
                "Tempo limite atingido ao conectar no Supabase. Servidor operando em modo resiliente."
            )
        except Exception as e:
            logger.warning(f"Banco de dados remoto não disponível ({e}). Operando com armazenamento local/resiliente.")


async def disconnect_database():
    """Desconecta do banco de dados no shutdown da aplicação."""
    client = get_prisma_client()
    if client and client.is_connected():
        try:
            await client.disconnect()
            logger.info("Conexão Prisma desconectada com sucesso.")
        except Exception as e:
            logger.error(f"Erro ao desconectar Prisma Client: {e}")
