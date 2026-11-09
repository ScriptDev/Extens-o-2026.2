@echo off
chcp 65001 > nul
title Agenda Teens & IA para Pregações - Software Factory Labs
color 0B

echo ===============================================================================
echo        AGENDA TEENS ^& IA MULTIMODAL PARA PREGAÇÕES - GOVERNANÇA PASTORAL
echo                        Software Factory Labs - 2026
echo ===============================================================================
echo.

set "PROJECT_DIR=%~dp0"
cd /d "%PROJECT_DIR%"

echo [1/4] Verificando arquivos de ambiente (.env)...
if not exist "%PROJECT_DIR%backend\.env" (
    echo      [!] 'backend\.env' não encontrado. Criando a partir de 'backend\.env.example'...
    copy "%PROJECT_DIR%backend\.env.example" "%PROJECT_DIR%backend\.env" > nul
    echo      [ATENÇÃO] Configure sua DATABASE_URL e GEMINI_API_KEY no arquivo 'backend\.env'!
)
if not exist "%PROJECT_DIR%frontend\.env.local" (
    echo      [!] 'frontend\.env.local' não encontrado. Criando a partir de 'frontend\.env.local.example'...
    copy "%PROJECT_DIR%frontend\.env.local.example" "%PROJECT_DIR%frontend\.env.local" > nul
)
echo      Arquivos de ambiente validados!
echo.

echo [2/4] Verificando serviços anteriores e liberando portas (8000 e 3000)...
for /f "tokens=5" %%a in ('netstat -ano ^| findstr ":8000" ^| findstr "LISTENING"') do (
    taskkill /PID %%a /F >nul 2>&1
)
for /f "tokens=5" %%a in ('netstat -ano ^| findstr ":3000" ^| findstr "LISTENING"') do (
    taskkill /PID %%a /F >nul 2>&1
)
echo      Portas liberadas com sucesso!
echo.

echo [3/4] Inicializando Backend FastAPI (Uvicorn + Supabase PostgreSQL)...
start "Backend - FastAPI Agenda Teens (Porta 8000)" /min cmd /c "cd /d "%PROJECT_DIR%backend" && "%PROJECT_DIR%backend\.venv\Scripts\python.exe" -m uvicorn app.main:app --app-dir "%PROJECT_DIR%backend" --host 127.0.0.1 --port 8000 --reload"

timeout /t 3 /nobreak > nul

echo [4/4] Inicializando Frontend Next.js (Porta 3000)...
start "Frontend - Next.js Agenda Teens (Porta 3000)" /min cmd /c "cd /d "%PROJECT_DIR%frontend" && npm start"

timeout /t 3 /nobreak > nul

echo.
echo ===============================================================================
echo                    SISTEMA INICIALIZADO COM SUCESSO!
echo ===============================================================================
echo.
echo   -> Aplicação Web (Next.js):     http://localhost:3000
echo   -> Agenda e Eventos:            http://localhost:3000/events
echo   -> Documentação Swagger API:    http://127.0.0.1:8000/docs
echo   -> Status de Saúde:             http://127.0.0.1:8000/health
echo.
echo   USUÁRIOS CADASTRADOS NO BANCO:
echo   [ADMIN]   admin@agendateens.com       / senha123 (Com Modo Ghost)
echo   [PASTOR]  pastor@agendateens.com      / senha123 (Homologação Pastoral)
echo   [LÍDER]   jorge@agendateens.com       / senha123 (Líder Teatro / #Teatro)
echo   [TEEN]    carlos@agendateens.com      / senha123 (Membro Teatro / #Teatro)
echo.
echo Abrindo seu navegador automaticamente...
start http://localhost:3000

echo.
echo Pressione qualquer tecla para encerrar esta janela (os servidores continuarão rodando em segundo plano).
echo Para parar o sistema a qualquer momento, dê duplo clique em 'parar_sistema.bat'.
echo ===============================================================================
pause > nul
