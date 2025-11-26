#!/bin/bash
# ============================================================================
# Script de Bash para iniciar ngrok y actualizar .env.local
# ============================================================================
#
# Este script:
# 1. Inicia ngrok en puerto 1234 (LM Studio)
# 2. Obtiene la URL pública generada por ngrok
# 3. Actualiza automáticamente .env.local con la nueva URL
# 4. Muestra información de configuración
#
# Uso:
#   ./scripts/start-ngrok.sh
#
# Requisitos:
#   - ngrok instalado y configurado con authtoken
#   - LM Studio corriendo en puerto 1234
#   - jq instalado (para parsear JSON)
#   - curl instalado
#
# Para hacer el script ejecutable:
#   chmod +x scripts/start-ngrok.sh
#
# ============================================================================

set -e  # Salir si hay error

# ============================================================================
# CONFIGURACIÓN
# ============================================================================

PORT=1234
REGION="us"
AUTH_USER=""
AUTH_PASSWORD=""

# Colores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
GRAY='\033[0;90m'
WHITE='\033[1;37m'
NC='\033[0m' # No Color

# ============================================================================
# FUNCIONES
# ============================================================================

show_help() {
    cat << EOF

${CYAN}🚀 Script de Inicio de ngrok para Rem-E${NC}

${WHITE}USO:${NC}
    ./scripts/start-ngrok.sh [opciones]

${WHITE}OPCIONES:${NC}
    -p, --port <número>        Puerto a exponer (default: 1234)
    -r, --region <código>      Región de ngrok (us, eu, ap, au, sa, jp, in)
    -u, --user <usuario>       Usuario para autenticación básica (opcional)
    -P, --password <pass>      Contraseña para autenticación básica (opcional)
    -h, --help                 Muestra esta ayuda

${WHITE}EJEMPLOS:${NC}
    ./scripts/start-ngrok.sh
    ./scripts/start-ngrok.sh --port 1234 --region eu
    ./scripts/start-ngrok.sh --user admin --password miPassword123

EOF
    exit 0
}

cleanup() {
    echo -e "\n\n${YELLOW}🛑 Deteniendo ngrok...${NC}"
    if [ ! -z "$NGROK_PID" ]; then
        kill $NGROK_PID 2>/dev/null || true
    fi
    echo -e "${GREEN}✅ ngrok detenido${NC}"
    echo -e "\n${YELLOW}⚠️  Recuerda actualizar .env.local si vuelves a usar localhost${NC}\n"
    exit 0
}

# ============================================================================
# PARSEAR ARGUMENTOS
# ============================================================================

while [[ $# -gt 0 ]]; do
    case $1 in
        -p|--port)
            PORT="$2"
            shift 2
            ;;
        -r|--region)
            REGION="$2"
            shift 2
            ;;
        -u|--user)
            AUTH_USER="$2"
            shift 2
            ;;
        -P|--password)
            AUTH_PASSWORD="$2"
            shift 2
            ;;
        -h|--help)
            show_help
            ;;
        *)
            echo -e "${RED}❌ Opción desconocida: $1${NC}"
            show_help
            ;;
    esac
done

# ============================================================================
# BANNER
# ============================================================================

echo -e "${GREEN}"
cat << "EOF"

╔═══════════════════════════════════════════════════════════════╗
║                                                               ║
║   🚀  REM-E - NGROK SETUP SCRIPT                             ║
║                                                               ║
║   Exponiendo LM Studio al mundo...                           ║
║                                                               ║
╚═══════════════════════════════════════════════════════════════╝

EOF
echo -e "${NC}"

# ============================================================================
# VERIFICACIONES PREVIAS
# ============================================================================

# Verifica que ngrok esté instalado
echo -e "${YELLOW}🔍 Verificando instalación de ngrok...${NC}"

if ! command -v ngrok &> /dev/null; then
    echo -e "${RED}"
    cat << EOF

❌ ERROR: ngrok no está instalado

Para instalar ngrok:

  macOS (con Homebrew):
    brew install ngrok/ngrok/ngrok

  Linux (con snap):
    snap install ngrok

  O descarga desde:
    https://ngrok.com/download

EOF
    echo -e "${NC}"
    exit 1
fi

echo -e "${GREEN}✅ ngrok encontrado: $(which ngrok)${NC}"

# Verifica que jq esté instalado
if ! command -v jq &> /dev/null; then
    echo -e "${YELLOW}"
    cat << EOF

⚠️  ADVERTENCIA: jq no está instalado (recomendado para parsear JSON)

Para instalar:
  macOS: brew install jq
  Ubuntu/Debian: sudo apt-get install jq

El script intentará funcionar sin jq...
EOF
    echo -e "${NC}"
    sleep 2
fi

# Verifica que LM Studio esté corriendo
echo -e "\n${YELLOW}🔍 Verificando que LM Studio esté corriendo...${NC}"

if curl -s --max-time 5 "http://localhost:$PORT/v1/models" > /dev/null 2>&1; then
    echo -e "${GREEN}✅ LM Studio está corriendo en puerto $PORT${NC}"
else
    echo -e "${YELLOW}"
    cat << EOF

⚠️  ADVERTENCIA: No se puede conectar a LM Studio en puerto $PORT

Asegúrate de:
  1. LM Studio esté abierto
  2. El servidor local esté habilitado (Settings → Server)
  3. El puerto sea $PORT (el default es 1234)

Presiona Enter para continuar de todos modos, o Ctrl+C para cancelar...
EOF
    echo -e "${NC}"
    read
fi

# ============================================================================
# INICIAR NGROK
# ============================================================================

# Construye el comando de ngrok
NGROK_CMD="ngrok http $PORT --region=$REGION --log=stdout"

if [ ! -z "$AUTH_USER" ] && [ ! -z "$AUTH_PASSWORD" ]; then
    NGROK_CMD="$NGROK_CMD --basic-auth=$AUTH_USER:$AUTH_PASSWORD"
    echo -e "${CYAN}🔒 Autenticación básica habilitada${NC}"
fi

# Inicia ngrok en segundo plano
echo -e "\n${GREEN}🚀 Iniciando ngrok...${NC}"
echo -e "${GRAY}   Puerto: $PORT${NC}"
echo -e "${GRAY}   Región: $REGION${NC}"

$NGROK_CMD > /tmp/ngrok.log 2>&1 &
NGROK_PID=$!

# Registra el manejador de limpieza
trap cleanup INT TERM EXIT

# Espera a que ngrok esté listo
echo -e "\n${YELLOW}⏳ Esperando a que ngrok esté listo...${NC}"
sleep 4

# Intenta obtener la URL pública de ngrok
MAX_RETRIES=5
RETRY_COUNT=0
NGROK_URL=""

while [ $RETRY_COUNT -lt $MAX_RETRIES ] && [ -z "$NGROK_URL" ]; do
    if command -v jq &> /dev/null; then
        # Con jq
        NGROK_URL=$(curl -s http://localhost:4040/api/tunnels 2>/dev/null | jq -r '.tunnels[] | select(.proto=="https") | .public_url' | head -n1)
    else
        # Sin jq - parseo manual básico
        NGROK_URL=$(curl -s http://localhost:4040/api/tunnels 2>/dev/null | grep -o '"public_url":"https://[^"]*' | head -n1 | cut -d'"' -f4)
    fi

    if [ -z "$NGROK_URL" ]; then
        RETRY_COUNT=$((RETRY_COUNT + 1))
        if [ $RETRY_COUNT -lt $MAX_RETRIES ]; then
            echo -e "${GRAY}   Reintentando ($RETRY_COUNT/$MAX_RETRIES)...${NC}"
            sleep 2
        fi
    fi
done

if [ -z "$NGROK_URL" ]; then
    echo -e "${RED}"
    cat << EOF

❌ ERROR: No se pudo obtener la URL pública de ngrok

Posibles causas:
  - ngrok no se inició correctamente
  - No hay conexión a internet
  - El authtoken de ngrok es inválido

Verifica:
  1. Que tengas una cuenta de ngrok
  2. Que hayas configurado el authtoken:
     ngrok config add-authtoken TU_TOKEN

Logs de ngrok:
EOF
    cat /tmp/ngrok.log
    echo -e "${NC}"
    exit 1
fi

# ============================================================================
# ÉXITO
# ============================================================================

echo -e "${GREEN}"
cat << "EOF"

╔═══════════════════════════════════════════════════════════════╗
║                                                               ║
║   ✅  NGROK INICIADO EXITOSAMENTE                            ║
║                                                               ║
╚═══════════════════════════════════════════════════════════════╝

EOF
echo -e "${NC}"

echo -e "${CYAN}🌐 URL Pública: ${WHITE}$NGROK_URL${NC}"

# ============================================================================
# ACTUALIZAR .env.local
# ============================================================================

ENV_FILE=".env.local"

if [ -f "$ENV_FILE" ]; then
    echo -e "\n${YELLOW}📝 Actualizando .env.local...${NC}"

    # Crea backup
    cp "$ENV_FILE" "${ENV_FILE}.backup"

    # Reemplaza o agrega la URL
    if grep -q "NEXT_PUBLIC_LM_STUDIO_URL=" "$ENV_FILE"; then
        sed -i.bak "s|NEXT_PUBLIC_LM_STUDIO_URL=.*|NEXT_PUBLIC_LM_STUDIO_URL=$NGROK_URL|g" "$ENV_FILE"
    else
        echo -e "\nNEXT_PUBLIC_LM_STUDIO_URL=$NGROK_URL" >> "$ENV_FILE"
    fi

    echo -e "${GREEN}✅ .env.local actualizado correctamente${NC}"
    echo -e "${GRAY}   Backup guardado en: ${ENV_FILE}.backup${NC}"

else
    echo -e "\n${YELLOW}⚠️  Archivo .env.local no encontrado${NC}"
    echo -e "${YELLOW}   Crea el archivo con:${NC}"
    echo -e "${WHITE}   NEXT_PUBLIC_LM_STUDIO_URL=$NGROK_URL${NC}"
fi

# ============================================================================
# INFORMACIÓN ADICIONAL
# ============================================================================

echo -e "${CYAN}"
cat << EOF

╔═══════════════════════════════════════════════════════════════╗
║                  INFORMACIÓN IMPORTANTE                       ║
╚═══════════════════════════════════════════════════════════════╝

📊 Panel de Control:
   http://localhost:4040

⚡ Próximos Pasos:
   1. Reinicia tu servidor de Next.js:
      npm run dev

   2. Prueba la conexión:
      http://localhost:3000/api/assistant

   3. ¡Ya puedes acceder desde cualquier lugar!

🔒 Seguridad:
EOF

if [ ! -z "$AUTH_USER" ]; then
    echo -e "   ${GREEN}✅ Autenticación básica HABILITADA${NC}"
    echo -e "${GRAY}      Usuario: $AUTH_USER${NC}"
else
    echo -e "   ${YELLOW}⚠️  Sin autenticación - Cualquiera con la URL puede acceder${NC}"
    echo -e "${GRAY}      Considera usar autenticación para mayor seguridad${NC}"
fi

cat << EOF

⚠️  ADVERTENCIAS:
   • Esta URL cambiará cada vez que reinicies ngrok (plan gratuito)
   • Hay límites de uso en el plan gratuito
   • Todo el tráfico pasa por servidores de ngrok
   • No compartas la URL públicamente

🛑 Para Detener:
   Presiona Ctrl+C

EOF
echo -e "${NC}"

# ============================================================================
# MONITOREO
# ============================================================================

echo -e "${GRAY}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}\n"
echo -e "${CYAN}📡 ngrok está corriendo... (logs abajo)${NC}"
echo -e "${GRAY}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}\n"

# Monitorea el estado de ngrok
while true; do
    sleep 10

    # Verifica que ngrok siga corriendo
    if ! kill -0 $NGROK_PID 2>/dev/null; then
        echo -e "\n${RED}❌ ngrok se detuvo inesperadamente${NC}"
        exit 1
    fi

    # Muestra estadísticas básicas (opcional)
    if command -v jq &> /dev/null; then
        STATS=$(curl -s http://localhost:4040/api/tunnels 2>/dev/null | jq -r '.tunnels[0].metrics.conns.count // 0' 2>/dev/null)
        if [ ! -z "$STATS" ] && [ "$STATS" != "0" ]; then
            echo -e "${GRAY}📊 Conexiones totales: $STATS${NC}"
        fi
    fi
done
