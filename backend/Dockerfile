# ==============================================================================
# Dockerfile - Backend (FastAPI + Google Gemini API)
# ==============================================================================
FROM python:3.11-slim

# Evita geração de arquivos .pyc e faz buffer direto dos logs
ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1

WORKDIR /app

# Instala dependências de compilação e OpenSSL
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    curl \
    libpq-dev \
    && rm -rf /var/lib/apt/lists/*

# Copia e instala dependências Python
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copia schema do Prisma e gera cliente
COPY prisma/ ./prisma/
RUN prisma generate

# Copia o código da aplicação
COPY . .

# Usuário sem privilégios de root para segurança DevSecOps
RUN addgroup --system appgroup && adduser --system --group appuser
USER appuser

EXPOSE 8000

CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]

