from abc import ABC, abstractmethod
from pathlib import Path
from typing import Optional
from app.domain.entities import StructuredContent


class IAIProvider(ABC):
    """
    [Arquitetura] Porta de Saída (Output Port) para o provedor de Inteligência Artificial.
    Permite desacoplar as regras de aplicação do SDK específico do Google Gemini.
    """

    @abstractmethod
    async def extract_sermon_structure(
        self,
        audio_path: Path,
        mime_type: str,
        custom_instructions: Optional[str] = None
    ) -> StructuredContent:
        """
        Recebe o caminho local de um áudio, envia para a API e retorna a estrutura teológica central.
        """
        pass

