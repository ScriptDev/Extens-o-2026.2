#!/bin/bash
# ==============================================================================
# Script de Inicialização para Linux / macOS
# Agenda Teens & IA Multimodal para Pregações - Software Factory Labs
# ==============================================================================

set -e

PROJECT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$PROJECT_DIR"

echo "================================================================="
echo "🎙️  Iniciando Agenda Teens & IA para Pregações (Linux / macOS)"
echo "================================================================="

# 1. Validação de Arquivos de Ambiente (.env)
echo -e "\n[1/5] Verificando arquivos de ambiente (.env)..."
if [ ! -f "backend/.env" ]; then
    echo "   [!] backend/.env não encontrado. Criando a partir de backend/.env.example..."
    cp "backend/.env.example" "backend/.env"
    echo "   [ATENÇÃO] Configure sua DATABASE_URL e GEMINI_API_KEY no arquivo backend/.env!"
fi

if [ ! -f "frontend/.env.local" ]; then
    echo "   [!] frontend/.env.local não encontrado. Criando a partir de frontend/.env.local.example..."
    cp "frontend/.env.local.example" "frontend/.env.local"
fi
echo "   ✓ Arquivos .env validados!"

# 2. Liberação de Portas (8000 e 3000)
echo -e "\n[2/5] Liberando portas 8000 e 3000..."
if command -v fuser >/dev/null 2>&1; then
    fuser -k 8000/tcp 3000/tcp >/dev/null 2>&1 || true
elif command -v lsof >/dev/null 2>&1; then
    lsof -ti :8000,:3000 | xargs kill -9 >/dev/null 2>&1 || true
fi
echo "   ✓ Portas liberadas!"

# 3. Verificação do Ambiente Virtual Python (Backend)
echo -e "\n[3/5] Verificando dependências do Backend (Python)..."
if [ ! -d "backend/.venv" ]; then
    echo "   Criando ambiente virtual Python (backend/.venv)..."
    python3 -m venv backend/.venv
    echo "   Instalando dependências do requirements.txt..."
    ./backend/.venv/bin/pip install --upgrade pip
    ./backend/.venv/bin/pip install -r backend/requirements.txt
fi
echo "   ✓ Backend Python pronto!"

# 4. Verificação do Frontend (Node.js)
echo -e "\n[4/5] Verificando dependências do Frontend (Next.js)..."
if [ ! -d "frontend/node_modules" ]; then
    echo "   Instalando dependências npm (frontend/node_modules)..."
    (cd frontend && npm install)
fi
echo "   ✓ Frontend Node.js pronto!"

# 5. Inicialização dos Serviços
echo -e "\n[5/5] Subindo Backend e Frontend..."

# Inicia FastAPI em background
./backend/.venv/bin/python -m uvicorn app.main:app --app-dir ./backend --host 127.0.0.1 --port 8000 --reload > /dev/null 2>&1 &
BACKEND_PID=$!
echo "   ✓ Backend iniciado (PID: $BACKEND_PID) em http://127.0.0.1:8000"

# Inicia Next.js em background
(cd frontend && npm run dev) > /dev/null 2>&1 &
FRONTEND_PID=$!
echo "   ✓ Frontend iniciado (PID: $FRONTEND_PID) em http://localhost:3000"

echo -e "\n================================================================="
echo "🎉 SISTEMA INICIALIZADO COM SUCESSO!"
echo "================================================================="
echo "   -> Aplicação Web (Next.js):     http://localhost:3000"
echo "   -> Agenda e Eventos:            http://localhost:3000/events"
echo "   -> Documentação Swagger API:    http://127.0.0.1:8000/docs"
echo ""
echo "   USUÁRIOS DE TESTE (Senha padrão: senha123):"
echo "   - [ADMIN]   admin@agendateens.com  (com Modo Ghost)"
echo "   - [PASTOR]  pastor@agendateens.com (Homologação)"
echo "   - [LÍDER]   jorge@agendateens.com  (Líder Teatro / #Teatro)"
echo "   - [TEEN]    carlos@agendateens.com (Membro Teatro / #Teatro)"
echo ""
echo "Para parar os serviços a qualquer momento: ./parar_sistema.sh"
echo "================================================================="

# Tenta abrir o navegador caso exista comando xdg-open (Linux) ou open (macOS)
if command -v xdg-open >/dev/null 2>&1; then
    xdg-open "http://localhost:3000" >/dev/null 2>&1 &
elif command -v open >/dev/null 2>&1; then
    open "http://localhost:3000" >/dev/null 2>&1 &
fi
