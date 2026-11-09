from abc import ABC, abstractmethod
from typing import List, Optional
from app.domain.entities import SermonOutline


class ISermonRepository(ABC):
    """
    [Arquitetura] Porta de Persistência (Repository Port).
    Desacopla o armazenamento de dados (Prisma, PostgreSQL, Supabase) dos casos de uso.
    """

    @abstractmethod
    async def save(self, sermon: SermonOutline) -> SermonOutline:
        """Persiste um novo esboço ou atualiza um existente."""
        pass

    @abstractmethod
    async def get_by_id(self, sermon_id: str) -> Optional[SermonOutline]:
        """Busca um esboço pelo seu UUID único."""
        pass

    @abstractmethod
    async def list_all(self, limit: int = 50, offset: int = 0) -> List[SermonOutline]:
        """Lista esboços ordenados por data de criação decrescente."""
        pass

