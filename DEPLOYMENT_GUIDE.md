# 🚀 Guía de Despliegue - Rem-E

Esta guía explica cómo desplegar Rem-E para acceso desde cualquier lugar.

---

## 📋 Requisitos Previos

1. ✅ Aplicación Next.js configurada
2. ✅ Node.js 18+ instalado
3. ✅ (Opcional) LM Studio corriendo para reconocimiento de ingredientes

---

## 🌐 Opción 1: Vercel (Recomendado)

La forma más fácil de desplegar Rem-E es usando Vercel.

### Paso 1: Preparar el Repositorio

```bash
# Si aún no tienes git inicializado
git init
git add .
git commit -m "Initial commit"

# Crear repositorio en GitHub y subirlo
git remote add origin https://github.com/tu-usuario/rem-e.git
git push -u origin main
```

### Paso 2: Desplegar en Vercel

1. Ve a [vercel.com](https://vercel.com)
2. Inicia sesión con tu cuenta de GitHub
3. Haz clic en "New Project"
4. Selecciona tu repositorio `rem-e`
5. Configura las variables de entorno (opcional):
   ```
   AWS_REGION=us-east-1
   AWS_ACCESS_KEY_ID=tu_key
   AWS_SECRET_ACCESS_KEY=tu_secret
   ```
6. Haz clic en "Deploy"

¡Listo! Tu aplicación estará disponible en `https://tu-app.vercel.app`

### Actualizaciones Automáticas

Cada vez que hagas push a tu repositorio, Vercel desplegará automáticamente la nueva versión.

---

## 🏠 Opción 2: Self-Hosting con LM Studio

Si quieres usar el reconocimiento de ingredientes con IA, necesitas mantener LM Studio corriendo localmente y exponerlo.

### Requisitos Adicionales

1. **IP Pública o Dynamic DNS**
   - Servicio recomendado: [DuckDNS](https://www.duckdns.org/) (gratis)

2. **Port Forwarding en Router**
   - Redirigir puerto 1234 → tu PC (para LM Studio)

3. **Certificado SSL**
   - Usar [Let's Encrypt](https://letsencrypt.org/) con Certbot

### Configuración Paso a Paso

#### 1. Configurar Dynamic DNS

**Con DuckDNS (Gratis):**

1. Ve a https://www.duckdns.org/
2. Inicia sesión con Google/GitHub
3. Crea un subdominio: `rem-e-lm.duckdns.org`
4. Instala el cliente de actualización

**Windows:**
```powershell
# Script para actualizar IP cada 5 minutos
$url = "https://www.duckdns.org/update?domains=rem-e-lm&token=TU_TOKEN&ip="
while($true) {
    Invoke-WebRequest -Uri $url
    Start-Sleep -Seconds 300
}
```

Guarda como `duckdns-updater.ps1` y ejecútalo al inicio.

#### 2. Configurar Port Forwarding

1. Accede a tu router (usualmente `http://192.168.1.1`)
2. Busca "Port Forwarding" o "Virtual Server"
3. Agrega esta regla:

| Servicio       | Puerto Externo | Puerto Interno | Protocolo | IP Interna      |
|----------------|----------------|----------------|-----------|-----------------|
| LM Studio      | 1234           | 1234           | TCP       | IP de tu PC     |

**Encontrar IP de tu PC:**
```bash
# Windows
ipconfig

# Linux/Mac
ifconfig
```

#### 3. Configurar Firewall

**Windows Firewall:**
```powershell
netsh advfirewall firewall add rule name="LM Studio API" dir=in action=allow protocol=TCP localport=1234
```

**Linux (UFW):**
```bash
sudo ufw allow 1234/tcp
```

#### 4. Configurar SSL con Nginx (Recomendado)

**Instalar Nginx:**

```bash
# Ubuntu/Debian
sudo apt install nginx certbot python3-certbot-nginx
```

**Configuración de Nginx:**

```nginx
server {
    listen 80;
    server_name rem-e-lm.duckdns.org;

    location / {
        proxy_pass http://localhost:1234;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;

        # CORS headers
        add_header 'Access-Control-Allow-Origin' '*' always;
        add_header 'Access-Control-Allow-Methods' 'GET, POST, OPTIONS' always;
        add_header 'Access-Control-Allow-Headers' 'Content-Type' always;
    }
}
```

**Obtener certificado SSL:**
```bash
sudo certbot --nginx -d rem-e-lm.duckdns.org
```

#### 5. Configurar Variables de Entorno

En tu aplicación desplegada (Vercel/Netlify), agrega:

```env
NEXT_PUBLIC_LM_STUDIO_URL=https://rem-e-lm.duckdns.org
```

---

## 📱 Opción 3: PWA (Progressive Web App)

Rem-E ya está configurado como PWA. Los usuarios pueden:

1. Abrir la app en Chrome/Safari
2. Ir a menú → "Instalar aplicación" o "Agregar a pantalla de inicio"
3. La app funcionará como aplicación nativa

**Características PWA:**
- ✅ Funciona offline (excepto reconocimiento de voz)
- ✅ Se instala en el dispositivo
- ✅ Icono en pantalla de inicio
- ✅ Funciona sin conexión a internet (funciones básicas)

---

## 🔒 Seguridad

### Para Producción

Si expones LM Studio públicamente, considera:

1. **Autenticación básica con Nginx:**

```nginx
server {
    # ... configuración anterior ...

    location / {
        auth_basic "Restricted Access";
        auth_basic_user_file /etc/nginx/.htpasswd;

        proxy_pass http://localhost:1234;
        # ... resto de la configuración ...
    }
}
```

Crear usuario:
```bash
sudo htpasswd -c /etc/nginx/.htpasswd usuario
```

2. **Rate Limiting:**

```nginx
http {
    limit_req_zone $binary_remote_addr zone=api:10m rate=10r/m;

    server {
        location / {
            limit_req zone=api burst=5;
            # ... resto de la configuración ...
        }
    }
}
```

---

## 📊 Monitoreo

### Uptime Monitoring

Usa servicios gratuitos:
- [UptimeRobot](https://uptimerobot.com/) - Monitorea cada 5 minutos
- [Healthchecks.io](https://healthchecks.io/) - Notificaciones si el servicio cae

### Analytics

Para Next.js en Vercel:
- Analytics está incluido automáticamente
- Verifica en el dashboard de Vercel

---

## 🚦 Checklist de Despliegue

### Antes de Desplegar:

- [ ] Código en repositorio Git
- [ ] Variables de entorno configuradas
- [ ] PWA configurado (manifest.json)
- [ ] Pruebas locales pasando
- [ ] LM Studio configurado (si se usa)

### Después de Desplegar:

- [ ] Probar la URL pública
- [ ] Verificar reconocimiento de voz
- [ ] Probar instalación como PWA
- [ ] Verificar funcionalidad offline
- [ ] Configurar monitoreo
- [ ] Documentar URL pública

---

## 💰 Costos Estimados

### Opción 1: Vercel + Web Speech API
- **Hosting:** Gratis (plan Hobby)
- **Voz:** Gratis (Web Speech API del navegador)
- **Total:** $0/mes

### Opción 2: Vercel + Self-Hosted LM Studio
- **Hosting:** Gratis (Vercel Hobby)
- **Dynamic DNS:** Gratis (DuckDNS)
- **Electricidad:** ~$5-10/mes (PC 24/7)
- **SSL:** Gratis (Let's Encrypt)
- **Total:** $5-10/mes

---

## ❓ Troubleshooting

### "CORS error" al usar LM Studio
- Asegúrate que Nginx tiene headers CORS configurados
- Verifica que LM Studio tenga CORS habilitado

### Reconocimiento de voz no funciona
- Verifica que usas HTTPS (requerido para Web Speech API)
- Permite acceso al micrófono en el navegador
- Usa Chrome, Edge o Safari

### PWA no se instala
- Verifica que la app esté en HTTPS
- Revisa que `manifest.json` esté correctamente configurado
- Limpia caché del navegador

---

## 📚 Recursos Adicionales

- [Vercel Documentation](https://vercel.com/docs)
- [Next.js Deployment](https://nextjs.org/docs/deployment)
- [PWA Guide](https://web.dev/progressive-web-apps/)
- [DuckDNS Setup](https://www.duckdns.org/install.jsp)
- [Let's Encrypt Guide](https://letsencrypt.org/getting-started/)

---

## 🎯 Recomendaciones

### Para Desarrollo/Testing
✅ **Opción 1: Vercel** - Rápido, gratis, sin configuración

### Para Producción Personal
✅ **Opción 1 + PWA** - Lo mejor de ambos mundos

### Para Uso con IA de Ingredientes
✅ **Opción 2: Vercel + LM Studio self-hosted**

### Para Máxima Simplicidad
✅ **Solo Web Speech API** - Sin servidor Python, sin configuración extra

---

¿Tienes dudas? Revisa la sección de Troubleshooting o abre un issue en el repo.
