from dataclasses import dataclass, field
from datetime import datetime
from typing import Optional, Dict, Any, List
from app.domain.entities import Event
from app.domain.ports.event_repository import IEventRepository
from app.domain.exceptions import ValidationException


@dataclass(frozen=True)
class CreateEventInputDTO:
    title: str
    date: datetime
    location: str = "Templo Principal"
    theme: Optional[str] = None
    description: Optional[str] = None
    cover_image: Optional[str] = None
    address_details: Optional[Dict[str, Any]] = None
    planning: Optional[Dict[str, Any]] = None
    status: str = "published"
    ministry_id: Optional[str] = None
    ministry_name: Optional[str] = None
    responsible_id: Optional[str] = None
    responsible_name: Optional[str] = None
    approved_by: Optional[str] = None
    tags: List[str] = field(default_factory=list)
    is_global: bool = False


class CreateEventUseCase:
    """
    [Caso de Uso] Cria e agenda um novo culto ou evento no calendário da igreja.
    """

    def __init__(self, repository: IEventRepository):
        self._repository = repository

    async def execute(self, input_dto: CreateEventInputDTO) -> Event:
        if not input_dto.title or not input_dto.title.strip():
            raise ValidationException("O título do evento ou culto é obrigatório.")

        event = Event(
            title=input_dto.title.strip(),
            date=input_dto.date,
            location=input_dto.location.strip() if input_dto.location else "Templo Principal",
            theme=input_dto.theme.strip() if input_dto.theme else None,
            description=input_dto.description.strip() if input_dto.description else None,
            cover_image=input_dto.cover_image.strip() if input_dto.cover_image else None,
            address_details=input_dto.address_details,
            planning=input_dto.planning,
            status=input_dto.status,
            ministry_id=input_dto.ministry_id,
            ministry_name=input_dto.ministry_name,
            responsible_id=input_dto.responsible_id,
            responsible_name=input_dto.responsible_name,
            approved_by=input_dto.approved_by,
            tags=input_dto.tags or [],
            is_global=input_dto.is_global,
        )

        return await self._repository.save(event)
