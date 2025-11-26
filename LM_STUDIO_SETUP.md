# Configuración de LM Studio para Rem-E

Este documento explica cómo configurar LM Studio para que funcione correctamente con la generación de planes por IA.

## 📋 Requisitos

- LM Studio instalado
- Un modelo de lenguaje descargado (ej: Llama, Mistral, Phi, etc.)

## 🔧 Configuración Paso a Paso

### 1. Descargar un Modelo

1. Abre LM Studio
2. Ve a la pestaña **"Search"** o **"Models"**
3. Busca y descarga un modelo (recomendados):
   - `TheBloke/Mistral-7B-Instruct-v0.2-GGUF`
   - `TheBloke/Llama-2-7B-Chat-GGUF`
   - `microsoft/Phi-3-mini-4k-instruct-gguf`
4. Espera a que termine la descarga

### 2. Cargar el Modelo

1. Ve a la pestaña **"Chat"**
2. En la parte superior, selecciona el modelo que descargaste
3. El modelo se cargará en memoria

### 3. Iniciar el Servidor Local

1. Ve a la pestaña **"Local Server"** o **"Developer"**
2. **IMPORTANTE:** Busca y habilita la opción **"Enable CORS"** o **"Allow Cross-Origin Requests"**
   - Si no ves esta opción, busca en Settings/Preferences
3. Haz clic en **"Start Server"**
4. Verifica que diga:
   ```
   Server running at: http://localhost:1234
   ```

### 4. Verificar la Configuración

Puedes verificar que el servidor funciona correctamente:

1. Abre tu navegador
2. Ve a: `http://localhost:1234/v1/models`
3. Deberías ver una respuesta JSON con los modelos disponibles

**Si ves un error CORS**, sigue la sección de solución de problemas.

## 🐛 Solución de Problemas

### Error: "Failed to fetch" o "CORS blocked"

**Causa:** LM Studio no tiene CORS habilitado, o el navegador está bloqueando la petición.

**Soluciones:**

#### Solución 1: Configurar CORS en LM Studio (Preferida)

1. En LM Studio, ve a **Settings** → **Server**
2. Busca **"CORS Settings"** o **"Network Settings"**
3. Habilita **"Allow all origins"** o agrega `http://localhost:3000`
4. Reinicia el servidor

#### Solución 2: Usar un Proxy Local (Si CORS no está disponible)

Si LM Studio no tiene opción de CORS, puedes usar un proxy simple.

**Crear archivo `proxy-lmstudio.js`:**

```javascript
const http = require('http');
const httpProxy = require('http-proxy');

const proxy = httpProxy.createProxyServer({});

const server = http.createServer((req, res) => {
  // Habilitar CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.writeHead(200);
    res.end();
    return;
  }

  // Proxy a LM Studio
  proxy.web(req, res, {
    target: 'http://localhost:1234',
    changeOrigin: true,
  });
});

server.listen(1235, () => {
  console.log('Proxy corriendo en http://localhost:1235');
  console.log('Redirigiendo a LM Studio en http://localhost:1234');
});
```

**Instalar dependencias:**
```bash
npm install http-proxy
```

**Ejecutar el proxy:**
```bash
node proxy-lmstudio.js
```

**Actualizar `.env.local`:**
```env
NEXT_PUBLIC_LM_STUDIO_URL=http://localhost:1235
```

### Error: "Model not loaded"

**Causa:** No hay ningún modelo cargado en LM Studio.

**Solución:**
1. Ve a la pestaña "Chat" en LM Studio
2. Selecciona un modelo del dropdown
3. Espera a que se cargue completamente
4. Vuelve a la pestaña "Server" y verifica que esté corriendo

### El servidor no inicia

**Causa:** El puerto 1234 ya está en uso.

**Solución:**
1. En LM Studio, ve a Settings
2. Cambia el puerto a otro (ej: 1235)
3. Actualiza `.env.local`:
   ```env
   NEXT_PUBLIC_LM_STUDIO_URL=http://localhost:1235
   ```

## ✅ Verificación Final

Una vez configurado:

1. LM Studio debe mostrar: **"Server running"**
2. En Rem-E, ve a **Planificador** → **Describir con IA**
3. Escribe algo como: *"Quiero un plan vegetariano para 2 personas"*
4. Haz clic en **"Generar Plan"**
5. Deberías ver el plan generado en unos segundos

## 🔗 Enlaces Útiles

- [LM Studio Download](https://lmstudio.ai/)
- [LM Studio Documentation](https://lmstudio.ai/docs)
- [Troubleshooting CORS](https://developer.mozilla.org/en-US/docs/Web/HTTP/CORS)
