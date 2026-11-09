import logging
from contextlib import asynccontextmanager
from fastapi import FastAPI, Request, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from app.config import get_settings
from app.domain.exceptions import (
    AIProcessingException,
    DatabaseException,
    EntityNotFoundException,
    ExternalServiceException,
    ValidationException,
)
from app.infrastructure.database.connection_pool import connect_database, disconnect_database
from app.presentation.routers.sermon_routes import router as sermon_router
from app.presentation.routers.event_routes import router as event_router
from app.presentation.routers.teens_routes import router as teens_router
from app.presentation.routers.ministry_routes import router as ministry_router
from app.presentation.routers.settings_routes import router as settings_router
from app.presentation.routers.insights_routes import router as insights_router

# Configuração de Logging Profissional
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s (%(funcName)s:%(lineno)d): %(message)s",
)
logger = logging.getLogger("sermon_agent")

settings = get_settings()


@asynccontextmanager
async def lifespan(app: FastAPI):
    """
    [Arquitetura] Gerenciamento do ciclo de vida da aplicação (Lifespan).
    Conecta e desconecta com segurança do banco Supabase.
    """
    logger.info("Iniciando Agente de IA para Pregações (Backend FastAPI)...")
    await connect_database()
    yield
    logger.info("Encerrando conexões de infraestrutura...")
    await disconnect_database()


app = FastAPI(
    title="Agente de IA para Pregações - API",
    description="API para transcrição multimodal, análise teológica e estruturação de esboços de cultos com Google Gemini e Supabase.",
    version="1.0.0",
    lifespan=lifespan,
)

# ==============================================================================
# Configuração de Segurança e CORS (DevSecOps)
# ==============================================================================
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ==============================================================================
# Manipuladores Globais de Exceção (Validação vs Exceção em Execução)
# ==============================================================================

@app.exception_handler(ValidationException)
async def validation_exception_handler(request: Request, exc: ValidationException):
    """
    [Validação / HTTP 400]
    Prevenção de entrada de dados corrompidos ou fora da especificação.
    """
    logger.warning(f"Erro de validação na requisição [{request.url.path}]: {exc.message}")
    return JSONResponse(
        status_code=status.HTTP_400_BAD_REQUEST,
        content={
            "error": "ValidationError",
            "message": exc.message,
            "status_code": status.HTTP_400_BAD_REQUEST,
        },
    )


@app.exception_handler(EntityNotFoundException)
async def not_found_exception_handler(request: Request, exc: EntityNotFoundException):
    """
    [Recurso não encontrado / HTTP 404]
    """
    logger.info(f"Recurso não localizado [{request.url.path}]: {exc.message}")
    return JSONResponse(
        status_code=status.HTTP_404_NOT_FOUND,
        content={
            "error": "NotFoundError",
            "message": exc.message,
            "status_code": status.HTTP_404_NOT_FOUND,
        },
    )


@app.exception_handler(AIProcessingException)
async def ai_processing_exception_handler(request: Request, exc: AIProcessingException):
    """
    [Tratamento de Exceções de IA / HTTP 502 Bad Gateway]
    Remediação em tempo de execução para falhas de API externa ou timeouts do Gemini.
    """
    logger.error(f"Falha na API do Google Gemini: {exc.message}", exc_info=True)
    return JSONResponse(
        status_code=status.HTTP_502_BAD_GATEWAY,
        content={
            "error": "ExternalAIServiceError",
            "message": exc.message,
            "status_code": status.HTTP_502_BAD_GATEWAY,
        },
    )


@app.exception_handler(DatabaseException)
async def database_exception_handler(request: Request, exc: DatabaseException):
    """
    [Tratamento de Exceções de Banco / HTTP 500 Internal Server Error]
    """
    logger.error(f"Erro na camada de persistência: {exc.message}", exc_info=True)
    return JSONResponse(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        content={
            "error": "DatabaseError",
            "message": exc.message,
            "status_code": status.HTTP_500_INTERNAL_SERVER_ERROR,
        },
    )


@app.exception_handler(Exception)
async def generic_exception_handler(request: Request, exc: Exception):
    """
    [DevSecOps] Captura genérica sem vazamento de stacktrace ou segredos no payload HTTP.
    """
    logger.error(f"Exceção não tratada na rota [{request.url.path}]: {str(exc)}", exc_info=True)
    return JSONResponse(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        content={
            "error": "InternalServerError",
            "message": "Ocorreu um erro interno inesperado no servidor. Nossa equipe de engenharia foi notificada.",
            "status_code": status.HTTP_500_INTERNAL_SERVER_ERROR,
        },
    )


# ==============================================================================
# Roteamento
# ==============================================================================
app.include_router(sermon_router)
app.include_router(event_router)
app.include_router(teens_router)
app.include_router(ministry_router)
app.include_router(settings_router)
app.include_router(insights_router)


@app.get("/health", tags=["Health"])
async def health_check():
    """Endpoint de prontidão e integridade sistêmica."""
    return {
        "status": "healthy",
        "service": "Agente de IA para Pregações",
        "version": "1.0.0",
        "environment": settings.APP_ENV,
    }


@app.get("/", tags=["Health"])
async def root():
    return {
        "message": "Agente de IA para Pregações API está ativo.",
        "documentation": "/docs",
    }

