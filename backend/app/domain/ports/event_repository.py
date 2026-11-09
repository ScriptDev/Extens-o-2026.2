from abc import ABC, abstractmethod
from typing import List, Optional
from app.domain.entities import Event


class IEventRepository(ABC):
    """
    [Arquitetura] Porta de Persistência para Eventos e Agenda da Igreja.
    Garante o desacoplamento do repositório da camada de aplicação (DIP).
    """

    @abstractmethod
    async def save(self, event: Event) -> Event:
        """Salva ou atualiza um evento na agenda."""
        pass

    @abstractmethod
    async def get_by_id(self, event_id: str) -> Optional[Event]:
        """Recupera um evento por UUID, incluindo o esboço vinculado se existir."""
        pass

    @abstractmethod
    async def list_all(self, limit: int = 50, offset: int = 0) -> List[Event]:
        """Lista todos os eventos ordenados pela data do evento."""
        pass

