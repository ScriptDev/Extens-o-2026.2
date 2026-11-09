# ==============================================================================
# Script de Inicialização Rápida - Agenda Teens & Pregações AI
# Inicia o Backend FastAPI e o Frontend Next.js com liberação de portas
# ==============================================================================

Write-Host "=================================================================" -ForegroundColor Cyan
Write-Host "🎙️  Iniciando Agenda Teens & IA para Pregações (Full-Stack)" -ForegroundColor Green
Write-Host "=================================================================" -ForegroundColor Cyan

$rootDir = Split-Path -Parent $MyInvocation.MyCommand.Path

# 1. Liberação de portas prévia
Write-Host "`n[1/3] Liberando portas 8000 e 3000..." -ForegroundColor Yellow
$ports = @(8000, 3000)
foreach ($p in $ports) {
    $conns = Get-NetTCPConnection -LocalPort $p -State Listen -ErrorAction SilentlyContinue
    if ($conns) {
        foreach ($c in $conns) {
            Stop-Process -Id $c.OwningProcess -Force -ErrorAction SilentlyContinue
        }
    }
}

# 2. Inicializa o Backend FastAPI
Write-Host "[2/3] Inicializando Backend FastAPI (Porta 8000)..." -ForegroundColor Yellow
$backendCmd = @"
Set-Location '$rootDir\backend'
Write-Host 'Conectando ao Supabase e iniciando FastAPI...' -ForegroundColor Green
& '.\.venv\Scripts\python.exe' -m uvicorn app.main:app --app-dir '$rootDir\backend' --host 127.0.0.1 --port 8000 --reload
"@
Start-Process powershell -ArgumentList "-NoExit", "-Command", $backendCmd

Start-Sleep -Seconds 2

# 3. Inicializa o Frontend Next.js
Write-Host "[3/3] Inicializando Frontend Next.js (Porta 3000)..." -ForegroundColor Yellow
$frontendCmd = @"
Set-Location '$rootDir\frontend'
Write-Host 'Iniciando Next.js...' -ForegroundColor Green
npm start
"@
Start-Process powershell -ArgumentList "-NoExit", "-Command", $frontendCmd

Start-Sleep -Seconds 2

Write-Host "`n=================================================================" -ForegroundColor Cyan
Write-Host "✅ Serviços iniciados com sucesso!" -ForegroundColor Green
Write-Host "   -> Aplicação Web: http://localhost:3000" -ForegroundColor White
Write-Host "   -> Agenda e Eventos: http://localhost:3000/events" -ForegroundColor White
Write-Host "   -> Swagger API Docs: http://127.0.0.1:8000/docs" -ForegroundColor White
Write-Host "=================================================================" -ForegroundColor Cyan

Start-Process "http://localhost:3000"
