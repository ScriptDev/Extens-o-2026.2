import os
from functools import lru_cache
from typing import List
from dotenv import load_dotenv
from pydantic_settings import BaseSettings, SettingsConfigDict

# [DevSecOps] Força o carregamento prioritário do .env local com override=True
# para evitar que variáveis de ambiente legadas do sistema operacional sobrescrevam as credenciais do projeto.
_backend_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
_root_dir = os.path.dirname(_backend_dir)
for _env_candidate in [os.path.join(_backend_dir, ".env"), os.path.join(_root_dir, ".env")]:
    if os.path.exists(_env_candidate):
        load_dotenv(_env_candidate, override=True)


class Settings(BaseSettings):
    """
    [Arquitetura] Configurações centralizadas da aplicação.
    Carrega variáveis de ambiente seguindo o padrão 12-Factor App.
    """
    APP_ENV: str = "development"
    PORT: int = 8000
    HOST: str = "0.0.0.0"

    # Supabase PostgreSQL Database URL
    DATABASE_URL: str = "postgresql://postgres:postgres@localhost:5432/postgres"

    # Google Gemini API
    GEMINI_API_KEY: str = ""
    GEMINI_MODEL: str = "gemini-1.5-pro"

    # CORS (suporta '*' para permitir widgets embutidos em sites externos ou lista de domínios)
    CORS_ORIGINS: str = "*"

    # Upload Constraints
    MAX_AUDIO_SIZE_MB: int = 150

    model_config = SettingsConfigDict(
        env_file=(
            os.path.join(os.path.dirname(os.path.dirname(__file__)), ".env"),
            ".env",
            "backend/.env",
        ),
        env_file_encoding="utf-8",
        extra="ignore"
    )

    @property
    def cors_origins_list(self) -> List[str]:
        origins = [origin.strip() for origin in self.CORS_ORIGINS.split(",") if origin.strip()]
        if "*" in origins or not origins:
            return ["*"]
        return origins


@lru_cache()
def get_settings() -> Settings:
    return Settings()

