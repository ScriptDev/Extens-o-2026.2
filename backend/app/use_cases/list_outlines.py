from typing import List
from app.domain.entities import SermonOutline
from app.domain.ports.sermon_repository import ISermonRepository


class ListSermonOutlinesUseCase:
    """
    [Caso de Uso] Lista os esboços gravados para a tela inicial ou histórico.
    """

    def __init__(self, repository: ISermonRepository):
        self._repository = repository

    async def execute(self, limit: int = 50, offset: int = 0) -> List[SermonOutline]:
        return await self._repository.list_all(limit=limit, offset=offset)

