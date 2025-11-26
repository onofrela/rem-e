@echo off
REM Script para iniciar Voice API Server con Ngrok
REM Asegurate de tener ngrok instalado y configurado

echo ========================================
echo   REM-E VOICE API - INICIO CON NGROK
echo ========================================
echo.

REM Verificar si Python esta instalado
python --version >nul 2>&1
if errorlevel 1 (
    echo [ERROR] Python no esta instalado o no esta en el PATH
    pause
    exit /b 1
)

REM Verificar si ngrok esta instalado
ngrok version >nul 2>&1
if errorlevel 1 (
    echo [ERROR] Ngrok no esta instalado o no esta en el PATH
    echo.
    echo Descarga ngrok de: https://ngrok.com/download
    echo Y agregalo al PATH o copia ngrok.exe a esta carpeta
    pause
    exit /b 1
)

echo [1/4] Verificando LM Studio...
curl -s http://localhost:1234/v1/models >nul 2>&1
if errorlevel 1 (
    echo [ADVERTENCIA] LM Studio no esta corriendo en localhost:1234
    echo.
    echo Por favor:
    echo 1. Abre LM Studio
    echo 2. Carga un modelo
    echo 3. Ve a "Local Server" y haz clic en "Start Server"
    echo 4. Habilita CORS en Settings
    echo.
    pause
) else (
    echo [OK] LM Studio detectado
)

echo.
echo [2/4] Iniciando Voice API Server...
start "Rem-E Voice API" cmd /k "python voice_api_server.py"

REM Esperar a que el servidor inicie
timeout /t 5 /nobreak >nul

echo.
echo [3/4] Verificando Voice API...
curl -s http://localhost:8765/health >nul 2>&1
if errorlevel 1 (
    echo [ADVERTENCIA] Voice API no responde aun
    echo Espera unos segundos y verifica la ventana del servidor
) else (
    echo [OK] Voice API corriendo
)

echo.
echo [4/4] Iniciando tunel Ngrok...
echo.
echo IMPORTANTE: Copia la URL HTTPS que ngrok te muestre
echo Ejemplo: https://abc123.ngrok-free.app
echo.
echo Usa esa URL en tu archivo .env.local:
echo NEXT_PUBLIC_VOICE_API_URL=https://abc123.ngrok-free.app
echo.
pause

REM Iniciar ngrok
ngrok http 8765

REM Si ngrok se cierra, ofrecer reiniciar
echo.
echo Ngrok se cerro. ¿Deseas reiniciarlo? (S/N)
set /p restart=
if /i "%restart%"=="S" goto :start_ngrok

echo.
echo Cerrando servicios...
taskkill /FI "WINDOWTITLE eq Rem-E Voice API*" /F >nul 2>&1
echo Listo.
pause
