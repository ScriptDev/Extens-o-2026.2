from app.domain.entities import SermonOutline
from app.domain.exceptions import EntityNotFoundException
from app.domain.ports.sermon_repository import ISermonRepository


class GetSermonOutlineUseCase:
    """
    [Caso de Uso] Recupera um esboço persistido pelo seu UUID.
    """

    def __init__(self, repository: ISermonRepository):
        self._repository = repository

    async def execute(self, sermon_id: str) -> SermonOutline:
        sermon = await self._repository.get_by_id(sermon_id)
        if not sermon:
            raise EntityNotFoundException(entity_name="Esboço de Pregação", entity_id=sermon_id)
        return sermon

