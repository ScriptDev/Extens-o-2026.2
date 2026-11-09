from typing import List
from app.domain.entities import Event
from app.domain.ports.event_repository import IEventRepository


class ListEventsUseCase:
    """
    [Caso de Uso] Lista a agenda de eventos e cultos da igreja.
    """

    def __init__(self, repository: IEventRepository):
        self._repository = repository

    async def execute(self, limit: int = 50, offset: int = 0) -> List[Event]:
        return await self._repository.list_all(limit=limit, offset=offset)

