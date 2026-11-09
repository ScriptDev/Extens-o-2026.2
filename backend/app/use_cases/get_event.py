from app.domain.entities import Event
from app.domain.ports.event_repository import IEventRepository
from app.domain.exceptions import EntityNotFoundException


class GetEventUseCase:
    """
    [Caso de Uso] Recupera os detalhes de um evento específico e o sermão associado (se houver).
    """

    def __init__(self, repository: IEventRepository):
        self._repository = repository

    async def execute(self, event_id: str) -> Event:
        event = await self._repository.get_by_id(event_id)
        if not event:
            raise EntityNotFoundException(entity_name="Culto/Evento", entity_id=event_id)
        return event

