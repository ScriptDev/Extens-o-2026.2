import pytest
from datetime import datetime, timezone
from fastapi.testclient import TestClient

from app.main import app
from app.domain.entities import Event
from app.domain.ports.event_repository import IEventRepository
from app.domain.exceptions import ValidationException, EntityNotFoundException
from app.presentation.routers.event_routes import get_event_repository
from app.use_cases.create_event import CreateEventInputDTO, CreateEventUseCase
from app.use_cases.get_event import GetEventUseCase
from app.use_cases.list_events import ListEventsUseCase


class MockEventRepository(IEventRepository):
    def __init__(self):
        self.storage = {}

    async def save(self, event: Event) -> Event:
        self.storage[event.id] = event
        return event

    async def get_by_id(self, event_id: str):
        return self.storage.get(event_id)

    async def list_all(self, limit: int = 50, offset: int = 0):
        return list(self.storage.values())


@pytest.mark.asyncio
async def test_create_event_use_case():
    repo = MockEventRepository()
    use_case = CreateEventUseCase(repository=repo)

    dto = CreateEventInputDTO(
        title="Culto de Vigília",
        date=datetime.now(timezone.utc),
        location="Templo Sede",
        theme="O Poder da Oração Eficaz"
    )

    created = await use_case.execute(dto)

    assert created.id is not None
    assert created.title == "Culto de Vigília"
    assert created.theme == "O Poder da Oração Eficaz"
    assert created.location == "Templo Sede"


@pytest.mark.asyncio
async def test_create_event_validation_empty_title():
    repo = MockEventRepository()
    use_case = CreateEventUseCase(repository=repo)

    dto = CreateEventInputDTO(
        title="",
        date=datetime.now(timezone.utc)
    )

    with pytest.raises(ValidationException):
        await use_case.execute(dto)


@pytest.mark.asyncio
async def test_get_event_not_found():
    repo = MockEventRepository()
    use_case = GetEventUseCase(repository=repo)

    with pytest.raises(EntityNotFoundException):
        await use_case.execute("non-existent-id")


def test_api_create_and_list_events():
    mock_repo = MockEventRepository()
    app.dependency_overrides[get_event_repository] = lambda: mock_repo

    client = TestClient(app)

    # 1. Criação via POST /api/events
    payload = {
        "title": "Culto de Domingo - Manhã",
        "date": "2026-11-15T09:30:00Z",
        "location": "Auditório Principal",
        "theme": "A Graça que Transforma"
    }
    post_res = client.post("/api/events", json=payload)
    assert post_res.status_code == 201
    created_json = post_res.json()
    assert created_json["title"] == "Culto de Domingo - Manhã"
    assert created_json["has_sermon"] is False

    # 2. Listagem via GET /api/events
    get_res = client.get("/api/events")
    assert get_res.status_code == 200
    list_json = get_res.json()
    assert len(list_json) == 1
    assert list_json[0]["id"] == created_json["id"]

    app.dependency_overrides.clear()

