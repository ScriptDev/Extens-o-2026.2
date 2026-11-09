import os
import shutil
import tempfile
import uuid
from pathlib import Path
from typing import List, Optional

from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile, status

from app.config import Settings, get_settings
from app.domain.entities import SermonOutline
from app.domain.exceptions import (
    AudioSizeExceededException,
    EmptyFileException,
    InvalidAudioFormatException,
)
from app.domain.ports.ai_provider import IAIProvider
from app.domain.ports.sermon_repository import ISermonRepository
from app.infrastructure.ai.gemini_provider import GeminiAIProvider
from app.infrastructure.database.prisma_repository import PrismaSermonRepository
from app.presentation.schemas import (
    SermonListItemDTO,
    SermonOutlineResponseDTO,
    StructuredContentDTO,
)
from app.use_cases.generate_outline import (
    GenerateOutlineInputDTO,
    GenerateSermonOutlineUseCase,
)
from app.use_cases.get_outline import GetSermonOutlineUseCase
from app.use_cases.list_outlines import ListSermonOutlinesUseCase

router = APIRouter(prefix="/api/sermons", tags=["Sermons"])

# Formatos de Áudio e Vídeo suportados pelo Gemini Multimodal
AUDIO_EXTENSIONS = {".mp3", ".ogg", ".wav", ".m4a", ".aac", ".flac", ".wma"}
VIDEO_EXTENSIONS = {".mp4", ".mov", ".webm", ".mkv", ".avi"}
ALLOWED_EXTENSIONS = AUDIO_EXTENSIONS.union(VIDEO_EXTENSIONS)

MIME_TYPE_MAP = {
    ".mp3": "audio/mpeg",
    ".wav": "audio/wav",
    ".ogg": "audio/ogg",
    ".m4a": "audio/mp4",
    ".aac": "audio/aac",
    ".flac": "audio/flac",
    ".mp4": "video/mp4",
    ".mov": "video/quicktime",
    ".webm": "video/webm",
    ".mkv": "video/x-matroska",
}


# ==============================================================================
# Injeção de Dependências (DIP / Clean Architecture)
# ==============================================================================

def get_ai_provider(settings: Settings = Depends(get_settings)) -> IAIProvider:
    return GeminiAIProvider(api_key=settings.GEMINI_API_KEY, model=settings.GEMINI_MODEL)


def get_repository() -> ISermonRepository:
    return PrismaSermonRepository()


def get_generate_use_case(
    ai_provider: IAIProvider = Depends(get_ai_provider),
    repository: ISermonRepository = Depends(get_repository)
) -> GenerateSermonOutlineUseCase:
    return GenerateSermonOutlineUseCase(ai_provider=ai_provider, repository=repository)


def get_outline_use_case(
    repository: ISermonRepository = Depends(get_repository)
) -> GetSermonOutlineUseCase:
    return GetSermonOutlineUseCase(repository=repository)


def get_list_use_case(
    repository: ISermonRepository = Depends(get_repository)
) -> ListSermonOutlinesUseCase:
    return ListSermonOutlinesUseCase(repository=repository)


# ==============================================================================
# Helper de Mapeamento de Resposta
# ==============================================================================

def map_entity_to_response(entity: SermonOutline) -> SermonOutlineResponseDTO:
    return SermonOutlineResponseDTO(
        id=entity.id,
        event_id=entity.event_id,
        title=entity.title,
        preacher=entity.preacher,
        audio_filename=entity.audio_filename,
        media_type=entity.media_type,
        structured_content=StructuredContentDTO(
            tema=entity.structured_content.tema,
            introducao=entity.structured_content.introducao,
            pontos_principais=[p.to_dict() for p in entity.structured_content.pontos_principais],
            conclusao=entity.structured_content.conclusao,
            frases_de_impacto=entity.structured_content.frases_de_impacto,
            perguntas_discipulado=entity.structured_content.perguntas_discipulado,
        ),
        created_at=entity.created_at,
    )


# ==============================================================================
# Endpoints da API
# ==============================================================================

@router.post(
    "/upload",
    response_model=SermonOutlineResponseDTO,
    status_code=status.HTTP_201_CREATED,
    summary="Upload de pregação (áudio ou vídeo) ou gravação direta"
)
async def upload_sermon_audio(
    file: UploadFile = File(..., description="Arquivo de mídia da pregação (áudio ou vídeo)"),
    event_id: Optional[str] = Form(None, description="UUID do evento da agenda (opcional para vínculo direto)"),
    preacher: Optional[str] = Form(None, description="Nome do pregador"),
    title: Optional[str] = Form(None, description="Título do sermão (opcional)"),
    use_case: GenerateSermonOutlineUseCase = Depends(get_generate_use_case),
    settings: Settings = Depends(get_settings)
):
    """
    [Validação vs Exceção]
    1. Valida extensão suportada (.mp3, .ogg, .wav, .m4a, .mp4, .mov, .webm).
    2. Valida tamanho do payload de mídia.
    3. Executa a IA multimodal com suporte a áudio e vídeo e persiste os insights.
    """
    original_filename = file.filename or "gravacao_culto.mp3"
    _, ext = os.path.splitext(original_filename.lower())

    # 1. Validação estrita de extensão
    if ext not in ALLOWED_EXTENSIONS:
        raise InvalidAudioFormatException(
            received_format=ext or "desconhecido",
            allowed_formats=sorted(list(ALLOWED_EXTENSIONS))
        )

    # Identifica se é vídeo ou áudio
    media_type = "video" if ext in VIDEO_EXTENSIONS else "audio"

    # 2. Gravação em arquivo temporário seguro com verificação de tamanho
    temp_dir = Path(tempfile.gettempdir()) / "sermon_agent_uploads"
    temp_dir.mkdir(parents=True, exist_ok=True)
    temp_path = temp_dir / f"{uuid.uuid4()}{ext}"

    max_bytes = settings.MAX_AUDIO_SIZE_MB * 1024 * 1024
    total_bytes = 0

    try:
        with open(temp_path, "wb") as buffer:
            while chunk := await file.read(1024 * 1024):  # Chunks de 1MB
                total_bytes += len(chunk)
                if total_bytes > max_bytes:
                    raise AudioSizeExceededException(size_bytes=total_bytes, max_bytes=max_bytes)
                buffer.write(chunk)

        if total_bytes == 0:
            raise EmptyFileException()

        # Determina o MIME type para o Gemini
        mime_type = file.content_type
        if not mime_type or mime_type == "application/octet-stream":
            mime_type = MIME_TYPE_MAP.get(ext, "audio/mpeg" if media_type == "audio" else "video/mp4")

        # 3. Execução do Caso de Uso
        input_dto = GenerateOutlineInputDTO(
            audio_path=temp_path,
            original_filename=original_filename,
            mime_type=mime_type,
            media_type=media_type,
            event_id=event_id,
            preacher=preacher,
            custom_title=title
        )

        sermon_entity = await use_case.execute(input_dto)
        return map_entity_to_response(sermon_entity)

    finally:
        # DevSecOps: Limpeza absoluta do arquivo temporário no disco do servidor
        if temp_path.exists():
            try:
                os.remove(temp_path)
            except Exception:
                pass


@router.get(
    "/{sermon_id}",
    response_model=SermonOutlineResponseDTO,
    status_code=status.HTTP_200_OK,
    summary="Busca um esboço e insights salvos por ID"
)
async def get_sermon_by_id(
    sermon_id: str,
    use_case: GetSermonOutlineUseCase = Depends(get_outline_use_case)
):
    """
    Recupera um esboço bíblico e insights persistidos anteriormente pelo seu UUID.
    """
    sermon_entity = await use_case.execute(sermon_id)
    return map_entity_to_response(sermon_entity)


@router.get(
    "",
    response_model=List[SermonListItemDTO],
    status_code=status.HTTP_200_OK,
    summary="Lista todos os esboços salvos"
)
async def list_sermons(
    limit: int = 50,
    offset: int = 0,
    use_case: ListSermonOutlinesUseCase = Depends(get_list_use_case)
):
    """
    Lista esboços previamente gerados para exibição em dashboard ou histórico.
    """
    sermons = await use_case.execute(limit=limit, offset=offset)
    return [
        SermonListItemDTO(
            id=s.id,
            title=s.title,
            preacher=s.preacher,
            audio_filename=s.audio_filename,
            media_type=s.media_type,
            tema=s.structured_content.tema,
            created_at=s.created_at,
        )
        for s in sermons
    ]
