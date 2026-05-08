@echo off
setlocal EnableDelayedExpansion

echo.
echo  =======================================================
echo    CD Utiliza AI  ^|  Local Dev Launcher
echo  =======================================================
echo    Backend   : FastAPI + Uvicorn  (WSL)
echo    Frontend  : Vite               (WSL)
echo    Database  : PostgreSQL + Redis (WSL Docker)
echo  =======================================================
echo.

REM ── Resolve project root from this script's location ──────
SET "ROOT=%~dp0"
IF "!ROOT:~-1!"=="\" SET "ROOT=!ROOT:~0,-1!"

REM ── Check WSL is available ─────────────────────────────────
wsl echo "" >nul 2>&1
IF %ERRORLEVEL% NEQ 0 (
    echo [ERROR] WSL is not available or not running.
    echo         Open WSL once manually, then retry.
    pause
    exit /b 1
)

REM ── Check Windows Terminal is available ────────────────────
where wt >nul 2>&1
IF %ERRORLEVEL% NEQ 0 (
    echo [ERROR] Windows Terminal ^(wt^) not found.
    echo         Install it from the Microsoft Store and retry.
    pause
    exit /b 1
)

REM ── Convert Windows root path to WSL path ─────────────────
echo [1/3] Resolving WSL path...
FOR /F "delims=" %%i IN ('wsl wslpath "!ROOT!"') DO SET "WSL_ROOT=%%i"
echo       Windows : !ROOT!
echo       WSL     : !WSL_ROOT!
echo.

REM ── Start Database (PostgreSQL + Redis) via WSL Docker ─────
echo [2/3] Starting PostgreSQL + Redis via Docker...
wsl -e bash -c "cd '!WSL_ROOT!' && docker compose -f docker-compose.database.yml up -d"
IF %ERRORLEVEL% NEQ 0 (
    echo.
    echo [ERROR] Docker failed to start containers.
    echo         Make sure Docker is running inside WSL.
    echo         Try: wsl -e bash -c "sudo service docker start"
    pause
    exit /b 1
)
echo [DB] Containers started successfully.
echo.

REM ── Launch Windows Terminal: Backend (left) + Frontend (right)
echo [3/3] Launching split terminals in Windows Terminal...
echo.

wt new-tab --title "Backend - FastAPI :8000" --startingDirectory "!ROOT!\backend" wsl bash -c "echo '--- Backend ---' && source venv/bin/activate && echo '[venv] activated' && uvicorn app.main:app --reload --host 0.0.0.0 --port 8000; exec bash" ; split-pane --vertical --title "Frontend - Vite :5173" --startingDirectory "!ROOT!\frontend" wsl bash -c "echo '--- Frontend ---' && npm run dev; exec bash"

echo  Terminals launched.
echo.
echo  -------------------------------------------------------
echo    Backend  : http://localhost:8000
echo    API Docs : http://localhost:8000/docs
echo    Frontend : http://localhost:5173
echo  -------------------------------------------------------
echo.
echo  Tip: Close this window. Ctrl+C inside each pane to stop.
echo.

endlocal
