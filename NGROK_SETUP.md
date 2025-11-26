# Configuración de ngrok para Acceso Externo al LLM

Esta guía te ayudará a configurar ngrok para acceder a tu servidor LM Studio desde internet, permitiendo que Rem-E funcione desde cualquier ubicación.

---

## 📋 Tabla de Contenidos

1. [Requisitos Previos](#requisitos-previos)
2. [Instalación de ngrok](#instalación-de-ngrok)
3. [Configuración Básica](#configuración-básica)
4. [Configuración Avanzada (Recomendada)](#configuración-avanzada-recomendada)
5. [Integración con Rem-E](#integración-con-rem-e)
6. [Seguridad](#seguridad)
7. [Solución de Problemas](#solución-de-problemas)
8. [Alternativas a ngrok](#alternativas-a-ngrok)

---

## 🔧 Requisitos Previos

Antes de comenzar, asegúrate de tener:

- ✅ **LM Studio** instalado y funcionando en puerto 1234
- ✅ **Cuenta de ngrok** (gratuita o de pago)
- ✅ **Acceso administrativo** en tu computadora
- ✅ **Conexión a internet estable**

---

## 📥 Instalación de ngrok

### Opción 1: Instalación Manual

1. **Descarga ngrok:**
   - Ve a: https://ngrok.com/download
   - Descarga la versión para Windows
   - Extrae el archivo `ngrok.exe`

2. **Mueve ngrok a una ubicación permanente:**
   ```bash
   # Opción A: Agregar a PATH del sistema
   mkdir C:\ngrok
   move ngrok.exe C:\ngrok\

   # Agregar C:\ngrok a tu PATH en Variables de Entorno
   ```

3. **Verifica la instalación:**
   ```bash
   ngrok version
   ```

### Opción 2: Con Chocolatey (Recomendado para Windows)

```bash
choco install ngrok
```

### Opción 3: Con npm (Si prefieres Node.js)

```bash
npm install -g ngrok
```

---

## 🔑 Configuración Básica

### Paso 1: Autenticación en ngrok

1. **Obtén tu authtoken:**
   - Inicia sesión en: https://dashboard.ngrok.com/
   - Ve a "Your Authtoken"
   - Copia el token

2. **Configura el authtoken:**
   ```bash
   ngrok config add-authtoken TU_AUTHTOKEN_AQUI
   ```

### Paso 2: Exponer LM Studio (Puerto 1234)

**Comando básico:**
```bash
ngrok http 1234
```

**Salida esperada:**
```
ngrok

Session Status                online
Account                       tu_cuenta@email.com (Plan: Free)
Version                       3.x.x
Region                        United States (us)
Latency                       47ms
Web Interface                 http://127.0.0.1:4040
Forwarding                    https://abc123.ngrok-free.app -> http://localhost:1234

Connections                   ttl     opn     rt1     rt5     p50     p90
                              0       0       0.00    0.00    0.00    0.00
```

### Paso 3: Copia la URL de ngrok

- La URL pública es algo como: `https://abc123.ngrok-free.app`
- **IMPORTANTE:** Esta URL cambia cada vez que reinicias ngrok (en plan gratuito)

---

## 🚀 Configuración Avanzada (Recomendada)

### Opción A: URL Estática (Requiere Plan de Pago)

Con una cuenta de pago de ngrok, puedes tener una URL estática que no cambia:

1. **Obtén un dominio estático en ngrok:**
   - Ve a https://dashboard.ngrok.com/domains
   - Crea un dominio (ej: `mi-rem-e-llm.ngrok.io`)

2. **Usa el dominio estático:**
   ```bash
   ngrok http --domain=mi-rem-e-llm.ngrok.io 1234
   ```

### Opción B: Archivo de Configuración ngrok.yml

Crea un archivo de configuración para opciones persistentes:

**Ubicación:** `C:\Users\TU_USUARIO\.ngrok2\ngrok.yml`

```yaml
version: 2
authtoken: TU_AUTHTOKEN_AQUI

tunnels:
  lm-studio:
    proto: http
    addr: 1234
    # Opciones de seguridad
    inspect: false  # Deshabilita inspector web para mejor rendimiento
    # Dominio estático (solo con plan de pago)
    # domain: mi-rem-e-llm.ngrok.io

    # Configuración de headers
    request_headers:
      add:
        - "X-Forwarded-Host: ngrok"

    # Compresión para mejor velocidad
    compression: true

# Configuración regional (opcional)
region: us  # us, eu, ap, au, sa, jp, in
```

**Uso del archivo de configuración:**
```bash
ngrok start lm-studio
```

### Opción C: Autenticación Básica (Seguridad Extra)

Para proteger tu servidor con contraseña:

```bash
ngrok http 1234 --basic-auth="usuario:contraseña123"
```

**O en ngrok.yml:**
```yaml
tunnels:
  lm-studio-secure:
    proto: http
    addr: 1234
    auth: "usuario:contraseña123"
```

---

## 🔗 Integración con Rem-E

### Paso 1: Actualiza Variables de Entorno

Edita tu archivo `.env.local`:

```env
# ========================================
# LM STUDIO CONFIGURATION
# ========================================

# Opción A: Usar localhost (desarrollo local)
# NEXT_PUBLIC_LM_STUDIO_URL=http://localhost:1234

# Opción B: Usar ngrok (acceso remoto)
NEXT_PUBLIC_LM_STUDIO_URL=https://abc123.ngrok-free.app

# Opción C: Usar dominio estático de ngrok (recomendado con plan de pago)
# NEXT_PUBLIC_LM_STUDIO_URL=https://mi-rem-e-llm.ngrok.io

# Si usas autenticación básica de ngrok:
# LM_STUDIO_AUTH_USER=usuario
# LM_STUDIO_AUTH_PASSWORD=contraseña123
```

### Paso 2: Reinicia el Servidor de Next.js

```bash
npm run dev
```

### Paso 3: Verifica la Conexión

Abre tu navegador y ve a:
```
http://localhost:3000/api/assistant
```

Deberías ver:
```json
{
  "status": "healthy",
  "lmStudio": "available",
  "endpoint": "https://abc123.ngrok-free.app/v1/chat/completions"
}
```

---

## 🔒 Seguridad

### ⚠️ ADVERTENCIAS CRÍTICAS

1. **Tu LLM estará expuesto a internet:**
   - Cualquiera con la URL de ngrok puede acceder a tu LM Studio
   - Esto puede generar costos de uso si tienes un plan limitado
   - Riesgo de abuso o uso no autorizado

2. **Uso de datos:**
   - ngrok es un proxy - todo el tráfico pasa por sus servidores
   - No envíes información sensible o privada
   - Lee la política de privacidad de ngrok

3. **Rendimiento:**
   - Habrá latencia adicional (50-200ms típicamente)
   - El plan gratuito tiene límites de ancho de banda
   - Conexiones simultáneas limitadas

### 🛡️ Mejores Prácticas de Seguridad

#### 1. Usa Autenticación

**Opción A: Autenticación en ngrok**
```bash
ngrok http 1234 --basic-auth="rem-e-user:contraseña-segura-123"
```

**Opción B: Autenticación en Next.js API**

Edita `app/api/assistant/route.ts`:

```typescript
// Agregar verificación de API key
const API_KEY = process.env.LM_STUDIO_API_KEY;

export async function POST(request: Request) {
  const apiKey = request.headers.get('x-api-key');

  if (API_KEY && apiKey !== API_KEY) {
    return Response.json(
      { error: 'Unauthorized' },
      { status: 401 }
    );
  }

  // ... resto del código
}
```

#### 2. Limita el Acceso por IP (ngrok Pro)

```yaml
tunnels:
  lm-studio:
    proto: http
    addr: 1234
    ip_restriction:
      allow_cidrs:
        - "203.0.113.0/24"  # Solo tu red
```

#### 3. Monitorea el Uso

- Usa el panel de ngrok: http://127.0.0.1:4040
- Revisa logs regularmente
- Configura alertas de uso inusual

#### 4. Rota URLs Regularmente

Si usas plan gratuito, reinicia ngrok periódicamente para cambiar la URL.

#### 5. Usa HTTPS Siempre

ngrok proporciona HTTPS por defecto - **nunca uses HTTP para acceso externo**.

---

## 🚨 Solución de Problemas

### Problema 1: "ERR_NGROK_3200"

**Error:** Límite de conexiones alcanzado (plan gratuito)

**Solución:**
- Actualiza a plan de pago
- Reinicia ngrok para resetear contador
- Reduce número de solicitudes simultáneas

### Problema 2: "Connection Refused"

**Error:** LM Studio no está escuchando en puerto 1234

**Solución:**
```bash
# Verifica que LM Studio esté corriendo:
curl http://localhost:1234/v1/models

# Si falla, inicia LM Studio y habilita "Local Server"
```

### Problema 3: CORS Errors

**Error:** "Access-Control-Allow-Origin" header is missing

**Solución:**

1. **En LM Studio:**
   - Ve a Settings → Server
   - Habilita "Enable CORS"
   - Reinicia el servidor

2. **O usa un proxy CORS:**
   ```bash
   npx cors-anywhere
   ```

### Problema 4: URL de ngrok Cambia Constantemente

**Solución:**
- Opción A: Compra plan de pago para dominio estático
- Opción B: Usa un script de actualización automática (ver abajo)

### Problema 5: Latencia Alta

**Posibles causas:**
- Servidor ngrok lejano geográficamente
- Conexión a internet lenta
- Plan gratuito con limitaciones

**Soluciones:**
- Cambia región en ngrok: `ngrok http 1234 --region=eu`
- Actualiza a plan de pago
- Usa un VPS cercano a tu ubicación

---

## 🤖 Scripts de Automatización

### Script 1: Iniciar ngrok y Actualizar .env Automáticamente

**Archivo:** `scripts/start-ngrok.ps1` (PowerShell para Windows)

```powershell
# Script para iniciar ngrok y actualizar automáticamente .env.local
# Uso: .\scripts\start-ngrok.ps1

Write-Host "🚀 Iniciando ngrok para LM Studio..." -ForegroundColor Green

# Inicia ngrok en segundo plano
$ngrokProcess = Start-Process -FilePath "ngrok" -ArgumentList "http", "1234", "--log=stdout" -PassThru -NoNewWindow -RedirectStandardOutput "ngrok.log"

# Espera a que ngrok esté listo
Start-Sleep -Seconds 3

# Obtiene la URL pública de ngrok
$ngrokUrl = Invoke-RestMethod -Uri "http://localhost:4040/api/tunnels" |
    Select-Object -ExpandProperty tunnels |
    Where-Object { $_.proto -eq "https" } |
    Select-Object -ExpandProperty public_url -First 1

if ($ngrokUrl) {
    Write-Host "✅ ngrok iniciado exitosamente!" -ForegroundColor Green
    Write-Host "🌐 URL pública: $ngrokUrl" -ForegroundColor Cyan

    # Actualiza .env.local
    $envPath = ".env.local"
    $envContent = Get-Content $envPath -Raw

    # Reemplaza la URL de LM Studio
    $envContent = $envContent -replace 'NEXT_PUBLIC_LM_STUDIO_URL=.*', "NEXT_PUBLIC_LM_STUDIO_URL=$ngrokUrl"

    # Guarda el archivo
    Set-Content -Path $envPath -Value $envContent

    Write-Host "✅ .env.local actualizado con nueva URL" -ForegroundColor Green
    Write-Host ""
    Write-Host "⚡ Ahora reinicia tu servidor de Next.js con: npm run dev" -ForegroundColor Yellow
    Write-Host "🛑 Para detener ngrok, presiona Ctrl+C" -ForegroundColor Red

    # Mantiene el script corriendo
    Wait-Process -Id $ngrokProcess.Id
} else {
    Write-Host "❌ Error: No se pudo obtener la URL de ngrok" -ForegroundColor Red
    Write-Host "Verifica que ngrok esté instalado y autenticado" -ForegroundColor Yellow
    exit 1
}
```

**Uso:**
```powershell
# Dale permisos de ejecución (primera vez):
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser

# Ejecuta el script:
.\scripts\start-ngrok.ps1
```

### Script 2: Bash para Linux/Mac

**Archivo:** `scripts/start-ngrok.sh`

```bash
#!/bin/bash

# Script para iniciar ngrok y actualizar automáticamente .env.local
# Uso: ./scripts/start-ngrok.sh

echo "🚀 Iniciando ngrok para LM Studio..."

# Inicia ngrok en segundo plano
ngrok http 1234 > /dev/null &
NGROK_PID=$!

# Espera a que ngrok esté listo
sleep 3

# Obtiene la URL pública de ngrok
NGROK_URL=$(curl -s http://localhost:4040/api/tunnels | jq -r '.tunnels[0].public_url')

if [ -n "$NGROK_URL" ]; then
    echo "✅ ngrok iniciado exitosamente!"
    echo "🌐 URL pública: $NGROK_URL"

    # Actualiza .env.local
    if [ -f ".env.local" ]; then
        sed -i.bak "s|NEXT_PUBLIC_LM_STUDIO_URL=.*|NEXT_PUBLIC_LM_STUDIO_URL=$NGROK_URL|g" .env.local
        echo "✅ .env.local actualizado con nueva URL"
    else
        echo "⚠️  Advertencia: .env.local no encontrado"
    fi

    echo ""
    echo "⚡ Ahora reinicia tu servidor de Next.js con: npm run dev"
    echo "🛑 Para detener ngrok, presiona Ctrl+C"

    # Función de limpieza al salir
    trap "kill $NGROK_PID 2>/dev/null; exit" INT TERM

    # Mantiene el script corriendo
    wait $NGROK_PID
else
    echo "❌ Error: No se pudo obtener la URL de ngrok"
    echo "Verifica que ngrok esté instalado y autenticado"
    kill $NGROK_PID 2>/dev/null
    exit 1
fi
```

**Uso:**
```bash
# Dale permisos de ejecución:
chmod +x scripts/start-ngrok.sh

# Ejecuta el script:
./scripts/start-ngrok.sh
```

### Script 3: Node.js (Multiplataforma)

**Archivo:** `scripts/start-ngrok.js`

```javascript
const ngrok = require('@ngrok/ngrok');
const fs = require('fs');
const path = require('path');

async function startNgrok() {
  try {
    console.log('🚀 Iniciando ngrok para LM Studio...');

    // Inicia ngrok
    const listener = await ngrok.forward({
      addr: 1234,
      authtoken: process.env.NGROK_AUTHTOKEN,
      // domain: 'mi-rem-e-llm.ngrok.io', // Descomenta si tienes dominio estático
    });

    const ngrokUrl = listener.url();
    console.log(`✅ ngrok iniciado exitosamente!`);
    console.log(`🌐 URL pública: ${ngrokUrl}`);

    // Actualiza .env.local
    const envPath = path.join(__dirname, '..', '.env.local');

    if (fs.existsSync(envPath)) {
      let envContent = fs.readFileSync(envPath, 'utf8');

      // Reemplaza la URL de LM Studio
      envContent = envContent.replace(
        /NEXT_PUBLIC_LM_STUDIO_URL=.*/,
        `NEXT_PUBLIC_LM_STUDIO_URL=${ngrokUrl}`
      );

      fs.writeFileSync(envPath, envContent);
      console.log('✅ .env.local actualizado con nueva URL');
    } else {
      console.log('⚠️  Advertencia: .env.local no encontrado');
    }

    console.log('');
    console.log('⚡ Ahora reinicia tu servidor de Next.js con: npm run dev');
    console.log('🛑 Para detener ngrok, presiona Ctrl+C');

    // Mantiene el proceso corriendo
    process.on('SIGINT', async () => {
      console.log('\n🛑 Cerrando ngrok...');
      await listener.close();
      process.exit(0);
    });

  } catch (error) {
    console.error('❌ Error al iniciar ngrok:', error.message);
    process.exit(1);
  }
}

startNgrok();
```

**Instalación de dependencias:**
```bash
npm install --save-dev @ngrok/ngrok
```

**Uso:**
```bash
node scripts/start-ngrok.js
```

---

## 🔄 Alternativas a ngrok

Si ngrok no se ajusta a tus necesidades, considera estas alternativas:

### 1. **Cloudflare Tunnel (Argo Tunnel)**
- ✅ Gratis
- ✅ Sin límites de ancho de banda
- ✅ Dominios personalizados gratuitos
- ❌ Configuración más compleja

**Instalación:**
```bash
# Windows (con Chocolatey)
choco install cloudflared

# Autenticación
cloudflared tunnel login

# Crear túnel
cloudflared tunnel create rem-e-llm

# Ejecutar túnel
cloudflared tunnel --url http://localhost:1234
```

### 2. **LocalTunnel**
- ✅ Gratis y open source
- ✅ Muy simple de usar
- ❌ Menos estable que ngrok

**Instalación:**
```bash
npm install -g localtunnel

# Uso
lt --port 1234 --subdomain rem-e-llm
```

### 3. **Tailscale**
- ✅ VPN peer-to-peer
- ✅ Muy seguro
- ✅ Gratis para uso personal
- ❌ Requiere cliente en ambos lados

**Instalación:**
```bash
# Descarga desde: https://tailscale.com/download
```

### 4. **Self-hosted con VPS**
- ✅ Control total
- ✅ Sin límites
- ❌ Requiere VPS (costo mensual)
- ❌ Configuración técnica avanzada

**Ejemplo con nginx en VPS:**
```nginx
server {
    listen 443 ssl;
    server_name mi-llm.tudominio.com;

    ssl_certificate /etc/letsencrypt/live/mi-llm.tudominio.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/mi-llm.tudominio.com/privkey.pem;

    location / {
        proxy_pass http://TU_IP_CASA:1234;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}
```

---

## 📊 Comparación de Opciones

| Característica        | ngrok (Free) | ngrok (Paid) | Cloudflare | LocalTunnel | Tailscale | VPS       |
|-----------------------|--------------|--------------|------------|-------------|-----------|-----------|
| **Precio**            | Gratis       | $8-10/mes    | Gratis     | Gratis      | Gratis    | $5-20/mes |
| **URL Estática**      | ❌           | ✅           | ✅         | ⚠️         | ✅        | ✅        |
| **Ancho de Banda**    | 1 GB/mes     | Ilimitado    | Ilimitado  | Limitado    | Ilimitado | Ilimitado |
| **Conexiones Simult.**| 40           | 500+         | Ilimitado  | 10-20       | Ilimitado | Ilimitado |
| **Latencia**          | Media        | Media        | Baja       | Alta        | Muy baja  | Variable  |
| **Seguridad**         | ✅           | ✅✅         | ✅✅       | ⚠️         | ✅✅✅    | ✅✅      |
| **Facilidad Setup**   | ✅✅✅       | ✅✅✅       | ⚠️        | ✅✅✅      | ✅✅      | ❌        |

---

## 🎯 Recomendaciones Finales

### Para Desarrollo/Pruebas:
- **Opción 1:** ngrok (plan gratuito) con script de actualización automática
- **Opción 2:** LocalTunnel si no necesitas estabilidad

### Para Producción Personal:
- **Opción 1:** ngrok (plan de pago) con dominio estático
- **Opción 2:** Cloudflare Tunnel (gratis e ilimitado)
- **Opción 3:** Tailscale si solo tú usarás el sistema

### Para Producción Profesional:
- **Opción 1:** VPS propio con nginx reverse proxy
- **Opción 2:** Cloudflare Tunnel con WAF y protección DDoS
- **Opción 3:** ngrok Business con SLA

---

## 📞 Soporte y Recursos

- **ngrok Docs:** https://ngrok.com/docs
- **ngrok Dashboard:** https://dashboard.ngrok.com/
- **ngrok Status:** https://status.ngrok.com/
- **Cloudflare Tunnel:** https://developers.cloudflare.com/cloudflare-one/connections/connect-apps/
- **Tailscale:** https://tailscale.com/kb/

---

## ✅ Checklist de Configuración

Antes de usar Rem-E con ngrok en producción:

- [ ] LM Studio configurado y corriendo en puerto 1234
- [ ] ngrok instalado y autenticado
- [ ] URL de ngrok agregada a `.env.local`
- [ ] Autenticación básica configurada (opcional pero recomendado)
- [ ] CORS habilitado en LM Studio
- [ ] Script de actualización automática probado
- [ ] Health check de API funcionando: `GET /api/assistant`
- [ ] Prueba de chat exitosa desde dispositivo externo
- [ ] Logs monitoreados en dashboard de ngrok
- [ ] Plan de contingencia si ngrok falla
- [ ] Documentación compartida con equipo

---

¡Listo! Ahora puedes acceder a tu LLM de Rem-E desde cualquier parte del mundo. 🌍
