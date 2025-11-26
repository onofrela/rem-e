#!/bin/bash
# Script para iniciar Voice API Server con Ngrok
# Asegurate de tener ngrok instalado y configurado

echo "========================================"
echo "  REM-E VOICE API - INICIO CON NGROK"
echo "========================================"
echo ""

# Colores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Verificar si Python esta instalado
if ! command -v python3 &> /dev/null; then
    echo -e "${RED}[ERROR]${NC} Python3 no esta instalado"
    exit 1
fi

# Verificar si ngrok esta instalado
if ! command -v ngrok &> /dev/null; then
    echo -e "${RED}[ERROR]${NC} Ngrok no esta instalado"
    echo ""
    echo "Instala ngrok:"
    echo "  Mac: brew install ngrok"
    echo "  Linux: https://ngrok.com/download"
    exit 1
fi

echo "[1/4] Verificando LM Studio..."
if curl -s http://localhost:1234/v1/models > /dev/null 2>&1; then
    echo -e "${GREEN}[OK]${NC} LM Studio detectado"
else
    echo -e "${YELLOW}[ADVERTENCIA]${NC} LM Studio no esta corriendo en localhost:1234"
    echo ""
    echo "Por favor:"
    echo "1. Abre LM Studio"
    echo "2. Carga un modelo"
    echo "3. Ve a 'Local Server' y haz clic en 'Start Server'"
    echo "4. Habilita CORS en Settings"
    echo ""
    read -p "Presiona Enter cuando este listo..."
fi

echo ""
echo "[2/4] Iniciando Voice API Server..."
python3 voice_api_server.py &
SERVER_PID=$!

# Esperar a que el servidor inicie
sleep 5

echo ""
echo "[3/4] Verificando Voice API..."
if curl -s http://localhost:8765/health > /dev/null 2>&1; then
    echo -e "${GREEN}[OK]${NC} Voice API corriendo"
else
    echo -e "${YELLOW}[ADVERTENCIA]${NC} Voice API no responde aun"
    echo "Verifica los logs del servidor"
fi

echo ""
echo "[4/4] Iniciando tunel Ngrok..."
echo ""
echo -e "${YELLOW}IMPORTANTE:${NC} Copia la URL HTTPS que ngrok te muestre"
echo "Ejemplo: https://abc123.ngrok-free.app"
echo ""
echo "Usa esa URL en tu archivo .env.local:"
echo "NEXT_PUBLIC_VOICE_API_URL=https://abc123.ngrok-free.app"
echo ""
read -p "Presiona Enter para continuar..."

# Iniciar ngrok
ngrok http 8765

# Cleanup cuando se cierre ngrok
echo ""
echo "Cerrando servicios..."
kill $SERVER_PID 2>/dev/null
echo "Listo."
