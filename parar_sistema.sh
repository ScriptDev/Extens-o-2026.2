#!/bin/bash
# ==============================================================================
# Script de Parada para Linux / macOS
# Agenda Teens & IA Multimodal para Pregações - Software Factory Labs
# ==============================================================================

echo "Encerrando serviços do Agenda Teens (portas 8000 e 3000)..."

if command -v fuser >/dev/null 2>&1; then
    fuser -k 8000/tcp 3000/tcp >/dev/null 2>&1 || true
elif command -v lsof >/dev/null 2>&1; then
    lsof -ti :8000,:3000 | xargs kill -9 >/dev/null 2>&1 || true
fi

# Mata processos residuais uvicorn e next se houver
pkill -f "uvicorn app.main:app" >/dev/null 2>&1 || true
pkill -f "next dev" >/dev/null 2>&1 || true
pkill -f "next start" >/dev/null 2>&1 || true

echo "✓ Todos os serviços foram encerrados com sucesso!"
