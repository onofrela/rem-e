# 🚀 Guía Rápida: ngrok para Rem-E

Esta es una guía ultra-rápida para exponer tu LM Studio con ngrok. Para información detallada, consulta `NGROK_SETUP.md`.

---

## ⚡ Inicio Rápido (5 minutos)

### 1. Instala ngrok

**Windows (Chocolatey):**
```bash
choco install ngrok
```

**macOS (Homebrew):**
```bash
brew install ngrok/ngrok/ngrok
```

**Linux (Snap):**
```bash
snap install ngrok
```

**O descarga manual:** https://ngrok.com/download

### 2. Configura tu authtoken

1. Regístrate gratis en: https://dashboard.ngrok.com/signup
2. Copia tu authtoken desde: https://dashboard.ngrok.com/get-started/your-authtoken
3. Configúralo:

```bash
ngrok config add-authtoken TU_AUTHTOKEN_AQUI
```

### 3. Inicia LM Studio

1. Abre LM Studio
2. Ve a **Settings → Server**
3. Habilita "Local Server"
4. Asegúrate que esté en puerto **1234**

### 4. Inicia ngrok

**Opción A: Usando el script automático (Recomendado)**

```bash
# Instala la dependencia (solo primera vez)
npm run ngrok:install

# Inicia ngrok
npm run ngrok
```

**Opción B: Manual**

```bash
ngrok http 1234
```

### 5. Copia la URL de ngrok

Verás algo como:
```
Forwarding  https://abc123.ngrok-free.app -> http://localhost:1234
```

Copia la URL HTTPS: `https://abc123.ngrok-free.app`

### 6. Actualiza .env.local

```env
NEXT_PUBLIC_LM_STUDIO_URL=https://abc123.ngrok-free.app
```

### 7. Reinicia Next.js

```bash
npm run dev
```

---

## ✅ Verificación

Abre en tu navegador:
```
http://localhost:3000/api/assistant
```

Deberías ver:
```json
{
  "status": "healthy",
  "lmStudio": "available"
}
```

---

## 🔒 Seguridad Básica (RECOMENDADO)

### Agrega autenticación:

```bash
ngrok http 1234 --basic-auth="usuario:miPassword123"
```

### O usa el script con autenticación:

**PowerShell (Windows):**
```powershell
.\scripts\start-ngrok.ps1 -AuthUser admin -AuthPassword miPassword123
```

**Bash (Linux/Mac):**
```bash
./scripts/start-ngrok.sh --user admin --password miPassword123
```

---

## ⚠️ Advertencias Importantes

1. **La URL cambia cada vez** (plan gratuito) - Actualiza .env.local cada vez
2. **Sin autenticación = público** - Cualquiera con la URL puede usar tu LLM
3. **Plan gratuito tiene límites** - 1 GB/mes, 40 conexiones simultáneas
4. **No compartas la URL** - Mantenla privada

---

## 🛑 Cómo Detener

1. Presiona **Ctrl+C** en la terminal de ngrok
2. Actualiza `.env.local` de vuelta a localhost:
   ```env
   NEXT_PUBLIC_LM_STUDIO_URL=http://localhost:1234
   ```

---

## 📚 Documentación Completa

- **Guía completa de ngrok:** `NGROK_SETUP.md`
- **Seguridad:** `SECURITY_NGROK.md`
- **Configuración de LM Studio:** `LM_STUDIO_SETUP.md`

---

## 🆘 Problemas Comunes

### "ERR_NGROK_3200"
- **Causa:** Límite de conexiones alcanzado
- **Solución:** Reinicia ngrok o actualiza a plan de pago

### "Connection Refused"
- **Causa:** LM Studio no está corriendo
- **Solución:** Inicia LM Studio y habilita el servidor local

### "Invalid authtoken"
- **Causa:** Authtoken incorrecto o no configurado
- **Solución:** Verifica el authtoken en https://dashboard.ngrok.com/

### La URL cambia constantemente
- **Causa:** Plan gratuito de ngrok
- **Solución:** Usa el script automático o actualiza a plan de pago

---

## 💡 Tips Pro

1. **Panel de control de ngrok:** http://localhost:4040
2. **Dominio estático:** Requiere plan de pago ($8-10/mes)
3. **Alternativas gratuitas:** Cloudflare Tunnel, LocalTunnel, Tailscale

---

¡Listo! 🎉 Ahora puedes usar Rem-E desde cualquier lugar.
