"""
Configuración de la API REST para Rem-E Voice Server.
"""

# Configuración del servidor
API_HOST = "0.0.0.0"  # Escuchar en todas las interfaces (accesible desde red)
API_PORT = 8765       # Puerto del servidor

# Configuración de CORS
# En desarrollo: permitir todos los orígenes
# En producción: especificar solo los orígenes permitidos
CORS_ORIGINS = [
    "http://localhost:3000",      # Next.js dev
    "http://localhost:3001",      # Otros servicios locales
    "http://127.0.0.1:3000",
    "*"  # Permitir todos (solo para desarrollo)
]

# Configuración de WebSocket
WS_PING_INTERVAL = 20  # Segundos entre pings
WS_PING_TIMEOUT = 20   # Timeout para pong

# Configuración de logging
LOG_LEVEL = "info"  # debug, info, warning, error, critical

# Configuración de rate limiting (futuro)
RATE_LIMIT_REQUESTS = 100  # Requests por minuto
RATE_LIMIT_WINDOW = 60     # Ventana en segundos
