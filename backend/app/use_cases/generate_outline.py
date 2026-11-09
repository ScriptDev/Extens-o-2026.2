from dataclasses import dataclass
from pathlib import Path
from typing import Optional
from app.domain.entities import SermonOutline
from app.domain.ports.ai_provider import IAIProvider
from app.domain.ports.sermon_repository import ISermonRepository
from app.domain.exceptions import ValidationException


@dataclass(frozen=True)
class GenerateOutlineInputDTO:
    """DTO de entrada para o caso de uso de geração de esboço a partir de áudio ou vídeo."""
    audio_path: Path
    original_filename: str
    mime_type: str
    media_type: str = "audio"
    event_id: Optional[str] = None
    preacher: Optional[str] = None
    custom_title: Optional[str] = None


class GenerateSermonOutlineUseCase:
    """
    [Caso de Uso] Orquestra o fluxo de geração de esboço e insights a partir de áudio ou vídeo.
    Suporta vinculação direta e transparente a um Evento da Agenda (event_id).
    """

    def __init__(self, ai_provider: IAIProvider, repository: ISermonRepository):
        self._ai_provider = ai_provider
        self._repository = repository

    async def execute(self, input_dto: GenerateOutlineInputDTO) -> SermonOutline:
        # 1. Validação de integridade do arquivo local
        if not input_dto.audio_path.exists():
            raise ValidationException(f"Arquivo temporário não encontrado no caminho: {input_dto.audio_path}")

        # 2. Chamada à IA Multimodal (Google Gemini com suporte a áudio e vídeo)
        structured_content = await self._ai_provider.extract_sermon_structure(
            audio_path=input_dto.audio_path,
            mime_type=input_dto.mime_type
        )

        # 3. Definição do título (utiliza o título customizado ou o tema extraído pela IA)
        final_title = (input_dto.custom_title or "").strip()
        if not final_title:
            final_title = structured_content.tema or "Pregação sem Título"

        # 4. Construção da Entidade de Domínio
        sermon_entity = SermonOutline(
            event_id=input_dto.event_id,
            title=final_title,
            preacher=(input_dto.preacher or "").strip() or None,
            audio_filename=input_dto.original_filename,
            media_type=input_dto.media_type,
            structured_content=structured_content
        )

        # 5. Persistência no Repositório (Supabase/Prisma)
        saved_sermon = await self._repository.save(sermon_entity)

        return saved_sermon
