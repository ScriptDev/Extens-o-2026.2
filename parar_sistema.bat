@echo off
chcp 65001 > nul
title Parar Agenda Teens & API
color 0C

echo ===============================================================================
echo                ENCERRANDO SERVIÇOS - AGENDA TEENS & PREGAÇÕES AI
echo ===============================================================================
echo.

echo Finalizando processos na porta 8000 (Backend FastAPI)...
for /f "tokens=5" %%a in ('netstat -ano ^| findstr ":8000" ^| findstr "LISTENING"') do (
    taskkill /PID %%a /F >nul 2>&1
    echo Processo %%a encerrado.
)

echo.
echo Finalizando processos na porta 3000 (Frontend Next.js)...
for /f "tokens=5" %%a in ('netstat -ano ^| findstr ":3000" ^| findstr "LISTENING"') do (
    taskkill /PID %%a /F >nul 2>&1
    echo Processo %%a encerrado.
)

echo.
echo ===============================================================================
echo                   TODOS OS SERVIÇOS FORAM ENCERRADOS!
echo ===============================================================================
echo.
pause

