@echo off
echo ========================================
echo   REM-E VOICE API SERVER
echo ========================================
echo.

REM Verificar si Python está instalado
python --version >nul 2>&1
if errorlevel 1 (
    echo [ERROR] Python no esta instalado
    echo Descarga Python desde: https://www.python.org/downloads/
    pause
    exit /b 1
)

REM Cambiar al directorio del script
cd /d "%~dp0"

REM Instalar dependencias si no están instaladas
echo [1/3] Verificando dependencias...
pip show fastapi >nul 2>&1
if errorlevel 1 (
    echo Instalando dependencias...
    pip install -r requirements.txt
)

echo.
echo [2/3] Iniciando servidor API...
echo.
echo El servidor estara disponible en:
echo   - API: http://localhost:8765
echo   - Docs: http://localhost:8765/docs
echo.

REM Obtener la IP local
for /f "tokens=2 delims=:" %%a in ('ipconfig ^| findstr /c:"IPv4"') do (
    set IP=%%a
)
set IP=%IP:~1%

if not "%IP%"=="" (
    echo Tu IP local es: %IP%
    echo Accede desde otros dispositivos en:
    echo   - http://%IP%:8765
    echo.
)

echo [3/3] Presiona Ctrl+C para detener el servidor
echo.
echo ========================================
echo.

REM Iniciar servidor
python start_api.py

pause
