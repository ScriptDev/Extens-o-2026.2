class DomainException(Exception):
    """Classe base para todas as exceções de domínio do sistema."""
    def __init__(self, message: str):
        super().__init__(message)
        self.message = message


# ==============================================================================
# 1. VALIDAÇÃO (Erros de Entrada do Cliente - Prevenção / HTTP 400)
# ==============================================================================

class ValidationException(DomainException):
    """Exceção base para validação de dados fornecidos pelo cliente."""
    pass


class InvalidAudioFormatException(ValidationException):
    """Disparada quando o arquivo enviado não possui uma extensão ou MIME type de áudio suportado."""
    def __init__(self, received_format: str, allowed_formats: list):
        message = (
            f"Formato de áudio inválido '{received_format}'. "
            f"Formatos suportados: {', '.join(allowed_formats)}."
        )
        super().__init__(message)
        self.received_format = received_format
        self.allowed_formats = allowed_formats


class AudioSizeExceededException(ValidationException):
    """Disparada quando o tamanho do áudio excede o limite configurado."""
    def __init__(self, size_bytes: int, max_bytes: int):
        size_mb = size_bytes / (1024 * 1024)
        max_mb = max_bytes / (1024 * 1024)
        message = (
            f"Tamanho do arquivo ({size_mb:.2f} MB) excede o limite máximo permitido de {max_mb:.2f} MB."
        )
        super().__init__(message)


class EmptyFileException(ValidationException):
    """Disparada quando o arquivo enviado está vazio (0 bytes)."""
    def __init__(self):
        super().__init__("O arquivo de áudio enviado está vazio (0 bytes).")


# ==============================================================================
# 2. EXCEÇÕES DE NEGÓCIO E BUSCA (HTTP 404)
# ==============================================================================

class EntityNotFoundException(DomainException):
    """Disparada quando um recurso solicitado não é encontrado no repositório."""
    def __init__(self, entity_name: str, entity_id: str):
        message = f"{entity_name} com identificador '{entity_id}' não foi encontrado(a)."
        super().__init__(message)
        self.entity_name = entity_name
        self.entity_id = entity_id


# ==============================================================================
# 3. TRATAMENTO DE EXCEÇÕES EM TEMPO DE EXECUÇÃO (Falhas Técnicas / HTTP 500/502)
# ==============================================================================

class TechnicalException(DomainException):
    """Exceção base para falhas de infraestrutura, rede ou serviços externos."""
    pass


class ExternalServiceException(TechnicalException):
    """Falha de comunicação ou timeout com provedores externos (ex: Google Gemini)."""
    def __init__(self, service_name: str, detail: str):
        message = f"Falha na comunicação com o serviço externo '{service_name}': {detail}"
        super().__init__(message)
        self.service_name = service_name
        self.detail = detail


class AIProcessingException(ExternalServiceException):
    """Falha específica ocorrida durante a transcrição ou estruturação pela IA."""
    def __init__(self, detail: str):
        super().__init__(service_name="Google Gemini API", detail=detail)


class DatabaseException(TechnicalException):
    """Falha de conexão ou execução de comandos na camada de persistência (Supabase/PostgreSQL)."""
    def __init__(self, detail: str):
        super().__init__(f"Erro ao interagir com o banco de dados: {detail}")
        self.detail = detail

