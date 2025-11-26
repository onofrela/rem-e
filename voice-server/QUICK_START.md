# 🚀 Inicio Rápido - Rem-E Voice API con Ngrok

Esta guía te ayudará a tener tu servidor de voz accesible desde internet en menos de 10 minutos.

---

## 📋 Requisitos

✅ Python 3.8+ instalado
✅ LM Studio instalado y configurado
✅ Dependencias de `voice-server` instaladas

---

## ⚡ Pasos Rápidos

### 1. Instalar Ngrok

#### Windows:
```powershell
# Opción 1: Con Chocolatey
choco install ngrok

# Opción 2: Descarga manual
# Ve a https://ngrok.com/download
# Descarga ngrok.exe y ponlo en esta carpeta
```

#### Mac:
```bash
brew install ngrok
```

#### Linux:
```bash
curl -s https://ngrok-agent.s3.amazonaws.com/ngrok.asc | \
  sudo tee /etc/apt/trusted.gpg.d/ngrok.asc >/dev/null && \
  echo "deb https://ngrok-agent.s3.amazonaws.com buster main" | \
  sudo tee /etc/apt/sources.list.d/ngrok.list && \
  sudo apt update && sudo apt install ngrok
```

### 2. Configurar Ngrok

```bash
# Crear cuenta gratis en https://dashboard.ngrok.com/signup
# Copiar tu authtoken del dashboard

# Configurar el token
ngrok config add-authtoken TU_TOKEN_AQUI
```

### 3. Iniciar LM Studio

1. Abre LM Studio
2. Carga un modelo (ej: Mistral, Llama, Phi)
3. Ve a **"Local Server"** → **"Start Server"**
4. ⚠️ **IMPORTANTE:** Habilita **CORS** en Settings

Verifica que funcione:
```bash
curl http://localhost:1234/v1/models
```

### 4. Iniciar Todo

#### Opción A: Script Automático (Recomendado)

**Windows:**
```cmd
start_with_ngrok.bat
```

**Linux/Mac:**
```bash
chmod +x start_with_ngrok.sh
./start_with_ngrok.sh
```

El script:
- ✅ Verifica LM Studio
- ✅ Inicia Voice API Server
- ✅ Inicia túnel Ngrok
- ✅ Te muestra la URL pública

#### Opción B: Manual

**Terminal 1 - Voice API:**
```bash
cd voice-server
python voice_api_server.py
```

**Terminal 2 - Ngrok:**
```bash
ngrok http 8765
```

### 5. Copiar URL Pública

Ngrok te mostrará algo como:

```
Session Status    online
Forwarding        https://abc123.ngrok-free.app -> http://localhost:8765
```

**Copia la URL:** `https://abc123.ngrok-free.app`

### 6. Configurar la App

Edita `.env.local` en la raíz del proyecto:

```env
NEXT_PUBLIC_VOICE_API_URL=https://abc123.ngrok-free.app
```

### 7. Probar Conexión

```bash
# Desde la carpeta voice-server
python test_remote_connection.py https://abc123.ngrok-free.app
```

Deberías ver:

```
✅ PASS - Health Check
✅ PASS - Status del Servidor
✅ PASS - Información de la API
✅ PASS - Comando de Voz Simple

🎉 ¡Todos los tests pasaron!
```

### 8. Usar en tu App

Reinicia tu aplicación Next.js:

```bash
npm run dev
```

Ahora puedes usar comandos de voz desde cualquier dispositivo conectado a internet.

---

## 🧪 Probar desde Otro Dispositivo

Desde tu teléfono o cualquier otro dispositivo:

1. Abre el navegador
2. Ve a tu app de Next.js (ej: `http://tu-ip:3000`)
3. Intenta usar un comando de voz
4. La app se conectará al Voice API a través de ngrok

**Verificar manualmente:**

```bash
# Desde cualquier dispositivo
curl https://abc123.ngrok-free.app/health

# Debería responder:
# {"status":"healthy"}
```

---

## 🛠️ Solución de Problemas

### "Failed to start ngrok"

**Causa:** No hay authtoken configurado

**Solución:**
```bash
ngrok config add-authtoken TU_TOKEN_AQUI
```

### "Connection refused"

**Causa:** Voice API no está corriendo

**Solución:**
```bash
cd voice-server
python voice_api_server.py
```

Espera a ver:
```
✓ Servidor de voz inicializado
📡 API disponible en: http://0.0.0.0:8765
```

### "Model not loaded" o "LM Studio not connected"

**Causa:** LM Studio no está activo

**Solución:**
1. Abre LM Studio
2. Carga un modelo
3. Inicia el servidor local
4. Verifica CORS habilitado

### Ngrok: "Session expired"

**Causa:** Plan gratuito tiene sesiones de 8 horas

**Solución:**
```bash
# Reinicia ngrok
# Presiona Ctrl+C para detener
ngrok http 8765

# Actualiza la nueva URL en .env.local
```

### CORS Error desde el navegador

**Causa:** LM Studio no tiene CORS habilitado

**Solución:**
1. LM Studio → Settings
2. Busca "CORS" o "Network"
3. Habilita "Allow all origins"
4. Reinicia el servidor de LM Studio

---

## 📊 Dashboard de Ngrok

Mientras ngrok está corriendo, puedes ver un dashboard en:

```
http://localhost:4040
```

Aquí puedes:
- Ver todas las peticiones HTTP
- Inspeccionar requests/responses
- Depurar errores
- Ver estadísticas de uso

---

## 💡 Tips

### Mantener URL Fija (Plan de Pago)

Con Ngrok gratis, la URL cambia cada vez que reinicias. Para URL fija:

1. Suscríbete a plan básico ($8/mes)
2. Configura subdomain fijo:

```bash
ngrok http --subdomain=rem-e-voice 8765
```

Tu URL será siempre: `https://rem-e-voice.ngrok-free.app`

### Múltiples Túneles

Si quieres exponer también LM Studio:

Crea `ngrok.yml`:
```yaml
version: "2"
authtoken: TU_TOKEN_AQUI

tunnels:
  voice-api:
    addr: 8765
    proto: http
  lm-studio:
    addr: 1234
    proto: http
```

Inicia ambos:
```bash
ngrok start --all
```

### Agregar Seguridad

Para producción, agrega autenticación básica:

```bash
ngrok http 8765 --basic-auth="usuario:password"
```

Los clientes deberán incluir:
```
Authorization: Basic dXN1YXJpbzpwYXNzd29yZA==
```

---

## 🎯 Checklist Final

- [ ] Ngrok instalado y configurado con authtoken
- [ ] LM Studio corriendo con CORS habilitado
- [ ] Voice API Server iniciado
- [ ] Túnel ngrok activo
- [ ] URL pública copiada
- [ ] `.env.local` actualizado
- [ ] Test de conexión exitoso
- [ ] App reiniciada

---

## 📚 Siguiente Nivel

Para despliegue permanente sin ngrok, consulta:
- **[DEPLOYMENT_GUIDE.md](./DEPLOYMENT_GUIDE.md)** - Guía completa de despliegue

Para desarrollo de la API, consulta:
- **[README_API.md](./README_API.md)** - Documentación de endpoints

---

## 🆘 ¿Necesitas Ayuda?

Si tienes problemas:

1. Ejecuta el test de diagnóstico:
   ```bash
   python test_remote_connection.py http://localhost:8765
   ```

2. Revisa los logs del servidor

3. Verifica el dashboard de ngrok: `http://localhost:4040`

4. Consulta la documentación completa en `DEPLOYMENT_GUIDE.md`

---

**¡Listo! Tu servidor de voz ahora es accesible desde cualquier lugar del mundo.** 🌍
