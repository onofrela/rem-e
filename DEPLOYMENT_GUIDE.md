# 🚀 Guía de Despliegue - Rem-E Voice API

Esta guía explica cómo exponer tu servidor de voz y LLM para acceso desde cualquier lugar.

---

## 📋 Requisitos Previos

1. ✅ Servidor de voz configurado (`voice-server/`)
2. ✅ LM Studio corriendo con servidor local (`http://localhost:1234`)
3. ✅ Python 3.8+ con dependencias instaladas
4. ✅ PC encendida y conectada a internet

---

## 🌐 Opción 1: Ngrok (Recomendado)

### ¿Qué es Ngrok?

Ngrok es un servicio que crea un túnel seguro entre internet y tu servidor local. Es perfecto para:
- 🧪 Desarrollo y pruebas
- 📱 Demos y presentaciones
- 🔒 Conexión segura sin configurar router

### Paso 1: Instalar Ngrok

#### Windows:
1. Descarga desde: https://ngrok.com/download
2. Extrae el archivo `ngrok.exe` en una carpeta (ej: `C:\ngrok\`)
3. Agrega la carpeta al PATH o usa la ruta completa

#### Linux/Mac:
```bash
# Con Homebrew (Mac)
brew install ngrok

# Con apt (Linux)
curl -s https://ngrok-agent.s3.amazonaws.com/ngrok.asc | sudo tee /etc/apt/trusted.gpg.d/ngrok.asc >/dev/null
echo "deb https://ngrok-agent.s3.amazonaws.com buster main" | sudo tee /etc/apt/sources.list.d/ngrok.list
sudo apt update && sudo apt install ngrok
```

### Paso 2: Crear Cuenta (Gratis)

1. Ve a https://dashboard.ngrok.com/signup
2. Crea una cuenta gratuita
3. Copia tu **authtoken** del dashboard

### Paso 3: Autenticar

```bash
ngrok config add-authtoken TU_TOKEN_AQUI
```

### Paso 4: Configurar Ngrok

Crea un archivo de configuración para túneles múltiples:

**Archivo: `ngrok.yml` (en la carpeta de ngrok o `~/.ngrok2/`)**

```yaml
version: "2"
authtoken: TU_TOKEN_AQUI

tunnels:
  voice-api:
    addr: 8765
    proto: http
    inspect: true
    bind_tls: true

  lm-studio:
    addr: 1234
    proto: http
    inspect: true
    bind_tls: true
```

### Paso 5: Iniciar los Servicios

**1. Inicia LM Studio:**
- Abre LM Studio
- Carga un modelo
- Ve a "Local Server" → "Start Server"
- Verifica que corra en `http://localhost:1234`
- ⚠️ **IMPORTANTE:** Habilita CORS en Settings

**2. Inicia el Voice API Server:**

```bash
cd voice-server
python voice_api_server.py
```

Deberías ver:
```
✓ Servidor de voz inicializado
📡 API disponible en: http://0.0.0.0:8765
```

**3. Inicia Ngrok:**

```bash
ngrok start --all
```

O solo el túnel de voz:
```bash
ngrok http 8765
```

### Paso 6: Obtener URLs Públicas

Ngrok te mostrará algo como:

```
Forwarding https://abc123.ngrok-free.app -> http://localhost:8765
```

**Copia estas URLs:**
- Voice API: `https://abc123.ngrok-free.app`
- LM Studio (si usas túnel doble): `https://xyz789.ngrok-free.app`

### Paso 7: Configurar la Aplicación

**Archivo: `.env.local`**

```env
# URL pública del Voice API
NEXT_PUBLIC_VOICE_API_URL=https://abc123.ngrok-free.app

# Si expones LM Studio también
NEXT_PUBLIC_LM_STUDIO_URL=https://xyz789.ngrok-free.app

# O mantén LM Studio local (recomendado)
NEXT_PUBLIC_LM_STUDIO_URL=http://localhost:1234
```

### Paso 8: Actualizar el Cliente Web

Actualiza el hook de voz para usar la nueva URL:

**Archivo: `lib/hooks/useVoiceAPI.ts`**

```typescript
const VOICE_API_URL = process.env.NEXT_PUBLIC_VOICE_API_URL || 'http://localhost:8765';
```

### Paso 9: Probar la Conexión

```bash
# Prueba el endpoint de salud
curl https://abc123.ngrok-free.app/health

# Debería responder:
# {"status":"healthy"}
```

---

## 🔐 Opción 2: Despliegue Directo (Producción)

Si quieres un despliegue permanente sin depender de Ngrok:

### Requisitos Adicionales

1. **IP Pública o Dynamic DNS**
   - Servicio recomendado: [No-IP](https://www.noip.com/) o [DuckDNS](https://www.duckdns.org/)
   - Gratis para uso básico

2. **Port Forwarding en Router**
   - Redirigir puerto 8765 → tu PC
   - Redirigir puerto 1234 → tu PC (si expones LM Studio)

3. **Certificado SSL**
   - Usar [Let's Encrypt](https://letsencrypt.org/) con Certbot
   - O usar un proxy reverso como Nginx

### Configuración Paso a Paso

#### 1. Configurar Dynamic DNS

**Con DuckDNS (Gratis):**

1. Ve a https://www.duckdns.org/
2. Inicia sesión con Google/GitHub
3. Crea un subdominio: `rem-e-voice.duckdns.org`
4. Instala el cliente de actualización

**Windows:**
```powershell
# Script para actualizar IP cada 5 minutos
$url = "https://www.duckdns.org/update?domains=rem-e-voice&token=TU_TOKEN&ip="
while($true) {
    Invoke-WebRequest -Uri $url
    Start-Sleep -Seconds 300
}
```

Guarda como `duckdns-updater.ps1` y ejecútalo al inicio.

#### 2. Configurar Port Forwarding

**Pasos generales (varía por router):**

1. Accede a tu router (usualmente `http://192.168.1.1`)
2. Busca "Port Forwarding" o "Virtual Server"
3. Agrega estas reglas:

| Servicio       | Puerto Externo | Puerto Interno | Protocolo | IP Interna      |
|----------------|----------------|----------------|-----------|-----------------|
| Voice API      | 8765           | 8765           | TCP       | IP de tu PC     |
| LM Studio      | 1234           | 1234           | TCP       | IP de tu PC     |

**Encontrar IP de tu PC:**
```bash
# Windows
ipconfig

# Linux/Mac
ifconfig
```

Busca algo como `192.168.1.100`

#### 3. Configurar Firewall

**Windows Firewall:**

```powershell
# Permitir Voice API
netsh advfirewall firewall add rule name="Rem-E Voice API" dir=in action=allow protocol=TCP localport=8765

# Permitir LM Studio
netsh advfirewall firewall add rule name="LM Studio API" dir=in action=allow protocol=TCP localport=1234
```

**Linux (UFW):**
```bash
sudo ufw allow 8765/tcp
sudo ufw allow 1234/tcp
```

#### 4. Configurar SSL con Nginx (Recomendado)

**Instalar Nginx:**

```bash
# Ubuntu/Debian
sudo apt install nginx certbot python3-certbot-nginx

# Windows: Descargar de nginx.org
```

**Configuración de Nginx:**

**Archivo: `/etc/nginx/sites-available/rem-e-voice`**

```nginx
server {
    listen 80;
    server_name rem-e-voice.duckdns.org;

    location / {
        proxy_pass http://localhost:8765;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}

server {
    listen 80;
    server_name lm-studio.duckdns.org;

    location / {
        proxy_pass http://localhost:1234;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}
```

**Habilitar sitio:**
```bash
sudo ln -s /etc/nginx/sites-available/rem-e-voice /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

**Obtener certificado SSL:**
```bash
sudo certbot --nginx -d rem-e-voice.duckdns.org -d lm-studio.duckdns.org
```

Certbot configurará automáticamente HTTPS.

#### 5. Configurar Servicio Systemd (Linux)

**Archivo: `/etc/systemd/system/rem-e-voice.service`**

```ini
[Unit]
Description=Rem-E Voice API Server
After=network.target

[Service]
Type=simple
User=tu-usuario
WorkingDirectory=/ruta/a/rem-e/voice-server
ExecStart=/usr/bin/python3 voice_api_server.py
Restart=always
RestartSec=10

[Install]
WantedBy=multi-user.target
```

**Habilitar servicio:**
```bash
sudo systemctl daemon-reload
sudo systemctl enable rem-e-voice
sudo systemctl start rem-e-voice
```

#### 6. Actualizar Variables de Entorno

**Archivo: `.env.local`**

```env
NEXT_PUBLIC_VOICE_API_URL=https://rem-e-voice.duckdns.org
NEXT_PUBLIC_LM_STUDIO_URL=https://lm-studio.duckdns.org
```

---

## 🔒 Seguridad

### Autenticación (Recomendado para Producción)

Agrega autenticación básica al Voice API:

**Archivo: `voice-server/auth.py`**

```python
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
import secrets

# Token de API (guárdalo en variable de entorno)
API_TOKEN = "tu-token-secreto-aqui-genera-uno-seguro"

security = HTTPBearer()

async def verify_token(credentials: HTTPAuthorizationCredentials = Depends(security)):
    if not secrets.compare_digest(credentials.credentials, API_TOKEN):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token inválido"
        )
    return credentials.credentials
```

**Actualizar `voice_api_server.py`:**

```python
from auth import verify_token

@app.post("/api/command", dependencies=[Depends(verify_token)])
async def process_command(request: CommandRequest):
    # ... resto del código
```

**Actualizar cliente:**

```typescript
const response = await fetch(`${VOICE_API_URL}/api/command`, {
  headers: {
    'Authorization': 'Bearer tu-token-secreto-aqui'
  }
});
```

### Rate Limiting

Instala:
```bash
pip install slowapi
```

Agrega a `voice_api_server.py`:

```python
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded

limiter = Limiter(key_func=get_remote_address)
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

@app.post("/api/command")
@limiter.limit("10/minute")  # 10 requests por minuto
async def process_command(request: Request, cmd: CommandRequest):
    # ... resto del código
```

---

## 📊 Monitoreo

### Logs

El servidor ya tiene logging básico. Para producción, considera:

```python
import logging

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler('voice_api.log'),
        logging.StreamHandler()
    ]
)
```

### Uptime Monitoring

Usa servicios gratuitos como:
- [UptimeRobot](https://uptimerobot.com/) - Monitorea cada 5 minutos
- [Healthchecks.io](https://healthchecks.io/) - Notificaciones si el servidor cae

---

## 🐳 Bonus: Docker (Opcional)

Si quieres contenerizar tu aplicación:

**Archivo: `voice-server/Dockerfile`**

```dockerfile
FROM python:3.11-slim

WORKDIR /app

# Instalar dependencias del sistema
RUN apt-get update && apt-get install -y \
    portaudio19-dev \
    && rm -rf /var/lib/apt/lists/*

# Copiar requirements
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copiar código
COPY . .

# Exponer puerto
EXPOSE 8765

# Comando de inicio
CMD ["python", "voice_api_server.py"]
```

**Archivo: `docker-compose.yml`**

```yaml
version: '3.8'

services:
  voice-api:
    build: ./voice-server
    ports:
      - "8765:8765"
    volumes:
      - ./voice-server:/app
    restart: unless-stopped
    environment:
      - LM_STUDIO_URL=http://host.docker.internal:1234
```

**Ejecutar:**
```bash
docker-compose up -d
```

---

## 🚦 Checklist de Despliegue

### Antes de Desplegar:

- [ ] LM Studio configurado y corriendo
- [ ] CORS habilitado en LM Studio
- [ ] Voice API funciona localmente
- [ ] Dependencias de Python instaladas
- [ ] Firewall configurado
- [ ] Dynamic DNS configurado (si usas opción 2)
- [ ] Port forwarding configurado (si usas opción 2)

### Después de Desplegar:

- [ ] Probar endpoint `/health`
- [ ] Probar endpoint `/status`
- [ ] Probar comando de voz desde cliente remoto
- [ ] Verificar logs del servidor
- [ ] Configurar monitoreo de uptime
- [ ] Documentar URL pública
- [ ] Configurar backups de datos (si hay persistencia)

---

## ❓ Troubleshooting

### "Connection refused"
- Verifica que el servidor esté corriendo
- Revisa firewall local y de router
- Confirma que el puerto esté abierto: `telnet tu-ip 8765`

### "CORS error"
- Asegúrate que LM Studio tiene CORS habilitado
- Verifica que FastAPI tenga CORS configurado (ya está en el código)

### "Model not loaded"
- Abre LM Studio y carga un modelo manualmente
- Verifica que el servidor de LM Studio esté activo

### Ngrok: "Session expired"
- Plan gratuito tiene sesiones de 8 horas
- Reinicia ngrok para nueva sesión
- Considera plan de pago para sesiones ilimitadas

---

## 💰 Costos Estimados

### Opción 1: Ngrok
- **Gratis:** Sesiones de 8h, 1 túnel, URL aleatoria
- **Básico ($8/mes):** Sesiones ilimitadas, 3 túneles, subdominios fijos
- **Pro ($20/mes):** IP reservada, más túneles

### Opción 2: Despliegue Directo
- **Dynamic DNS:** Gratis (DuckDNS, No-IP)
- **Electricidad:** ~$5-10/mes (PC 24/7)
- **Internet:** Ya tienes
- **Certificado SSL:** Gratis (Let's Encrypt)

**Total:** $0-10/mes

---

## 📚 Recursos Adicionales

- [Ngrok Documentation](https://ngrok.com/docs)
- [FastAPI Deployment](https://fastapi.tiangolo.com/deployment/)
- [Let's Encrypt Guide](https://letsencrypt.org/getting-started/)
- [DuckDNS Setup](https://www.duckdns.org/install.jsp)
- [Nginx Configuration](https://nginx.org/en/docs/)

---

## 🎯 Siguiente Pasos

1. **Elige una opción** (Ngrok para empezar, Directo para producción)
2. **Sigue los pasos** de esta guía
3. **Prueba la conexión** remota
4. **Configura monitoreo** para detectar caídas
5. **Documenta tu setup** para futuras referencias

¿Tienes dudas? Revisa la sección de Troubleshooting o abre un issue en el repo.
