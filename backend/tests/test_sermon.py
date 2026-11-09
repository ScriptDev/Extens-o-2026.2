import io
import pytest
from pathlib import Path
from unittest.mock import AsyncMock

from fastapi.testclient import TestClient

from app.domain.entities import BiblicalPoint, SermonOutline, StructuredContent
from app.domain.exceptions import InvalidAudioFormatException
from app.domain.ports.ai_provider import IAIProvider
from app.domain.ports.sermon_repository import ISermonRepository
from app.main import app
from app.presentation.routers.sermon_routes import (
    get_ai_provider,
    get_repository,
)
from app.use_cases.generate_outline import (
    GenerateOutlineInputDTO,
    GenerateSermonOutlineUseCase,
)
from app.use_cases.get_outline import GetSermonOutlineUseCase


# ==============================================================================
# Mocks de Domínio (Clean Architecture)
# ==============================================================================

class MockAIProvider(IAIProvider):
    async def extract_sermon_structure(self, audio_path: Path, mime_type: str, custom_instructions=None) -> StructuredContent:
        return StructuredContent(
            tema="A Graça Redentora e a Fé Inabalável",
            introducao="O pregador inicia contextualizando a carta aos Efésios.",
            pontos_principais=[
                BiblicalPoint(
                    titulo="Salvação pela Graça",
                    explicacao="A salvação é dom imerecido de Deus e não provém de obras humanas.",
                    referencia_biblica="Efésios 2:8-9 - Porque pela graça sois salvos, mediante a fé; e isto não vem de vós; é dom de Deus; não de obras, para que ninguém se glorie."
                )
            ],
            conclusao="Conclui exortando a igreja a viver em gratidão e esperança ativa."
        )


class MockSermonRepository(ISermonRepository):
    def __init__(self):
        self.storage = {}

    async def save(self, sermon: SermonOutline) -> SermonOutline:
        self.storage[sermon.id] = sermon
        return sermon

    async def get_by_id(self, sermon_id: str):
        return self.storage.get(sermon_id)

    async def list_all(self, limit: int = 50, offset: int = 0):
        return list(self.storage.values())


# ==============================================================================
# Testes Unitários dos Casos de Uso
# ==============================================================================

@pytest.mark.asyncio
async def test_generate_sermon_outline_use_case(tmp_path):
    # Cria arquivo temporário simulado
    fake_audio = tmp_path / "culto_domingo.mp3"
    fake_audio.write_bytes(b"dummy audio content")

    ai_provider = MockAIProvider()
    repository = MockSermonRepository()
    use_case = GenerateSermonOutlineUseCase(ai_provider=ai_provider, repository=repository)

    dto = GenerateOutlineInputDTO(
        audio_path=fake_audio,
        original_filename="culto_domingo.mp3",
        mime_type="audio/mpeg",
        preacher="Pastor João Silva",
        custom_title="Mensagem de Esperança"
    )

    result = await use_case.execute(dto)

    assert result.id is not None
    assert result.title == "Mensagem de Esperança"
    assert result.preacher == "Pastor João Silva"
    assert result.structured_content.tema == "A Graça Redentora e a Fé Inabalável"
    assert len(result.structured_content.pontos_principais) == 1
    assert "Efésios 2:8-9" in result.structured_content.pontos_principais[0].referencia_biblica


# ==============================================================================
# Testes de Validação e Handlers da API (HTTP 400 vs 201)
# ==============================================================================

def test_upload_invalid_file_extension():
    client = TestClient(app)
    # Tenta enviar um arquivo .pdf ou .txt em vez de áudio
    file_content = io.BytesIO(b"Este eh um arquivo de texto, nao audio")
    response = client.post(
        "/api/sermons/upload",
        files={"file": ("relatorio.pdf", file_content, "application/pdf")},
        data={"preacher": "Pastor João"}
    )

    assert response.status_code == 400
    data = response.json()
    assert data["error"] == "ValidationError"
    assert "Formato de áudio inválido" in data["message"]


def test_upload_valid_audio_with_dependency_override(tmp_path):
    mock_repo = MockSermonRepository()
    mock_ai = MockAIProvider()

    app.dependency_overrides[get_repository] = lambda: mock_repo
    app.dependency_overrides[get_ai_provider] = lambda: mock_ai

    client = TestClient(app)
    file_content = io.BytesIO(b"Fake MP3 Audio Payload Bytes")
    response = client.post(
        "/api/sermons/upload",
        files={"file": ("pregacao_domingo.mp3", file_content, "audio/mpeg")},
        data={"preacher": "Pastor Marcos", "title": "A Cruz de Cristo"}
    )

    app.dependency_overrides.clear()

    assert response.status_code == 201
    json_data = response.json()
    assert json_data["id"] is not None
    assert json_data["title"] == "A Cruz de Cristo"
    assert json_data["preacher"] == "Pastor Marcos"
    assert json_data["structured_content"]["tema"] == "A Graça Redentora e a Fé Inabalável"
    assert len(json_data["structured_content"]["pontos_principais"]) > 0


def test_health_check():
    client = TestClient(app)
    response = client.get("/health")
    assert response.status_code == 200
    assert response.json()["status"] == "healthy"

