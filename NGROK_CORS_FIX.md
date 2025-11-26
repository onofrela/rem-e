# 🔧 Solución de Problemas CORS con Ngrok

## ⚠️ Problema Común

Cuando usas ngrok con LM Studio, puedes ver este error:

```
Error al generar el plan: Error communicating with LM Studio: Failed to fetch
```

Esto ocurre porque **LM Studio necesita configuración CORS** para aceptar peticiones desde el frontend (navegador).

---

## ✅ Solución: Configurar CORS en LM Studio

### Opción 1: Habilitar CORS en la Interfaz de LM Studio

1. **Abre LM Studio**
2. Ve a **"Developer"** en el menú lateral
3. Ve a **"Server Options"**
4. Busca **"CORS"** o **"Cross-Origin Resource Sharing"**
5. **Habilita "Allow All Origins"** o **"Enable CORS"**
6. **Reinicia el servidor** de LM Studio

### Opción 2: Usar ngrok con Configuración CORS

Si LM Studio no tiene opción de CORS, puedes usar un proxy inverso:

#### A) Proxy Simple con Node.js

Crea un archivo `cors-proxy.js`:

```javascript
const express = require('express');
const cors = require('cors');
const { createProxyMiddleware } = require('http-proxy-middleware');

const app = express();

// Habilitar CORS para todas las peticiones
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

// Proxy a LM Studio
app.use('/v1', createProxyMiddleware({
  target: 'http://localhost:1234',
  changeOrigin: true,
  onProxyReq: (proxyReq, req, res) => {
    console.log(`[Proxy] ${req.method} ${req.path}`);
  }
}));

app.listen(8080, () => {
  console.log('✅ CORS Proxy corriendo en http://localhost:8080');
  console.log('🔗 Apunta ngrok a este puerto en lugar de 1234');
});
```

Instalar dependencias:
```bash
npm install express cors http-proxy-middleware
```

Ejecutar:
```bash
node cors-proxy.js
```

Luego, apunta ngrok al proxy:
```bash
ngrok http 8080
```

Y actualiza `.env.local`:
```env
NEXT_PUBLIC_LM_STUDIO_URL=https://tu-url-de-ngrok.ngrok-free.app
```

---

## 🧪 Verificar Configuración CORS

### 1. Verificar desde la consola del navegador (F12):

```javascript
// Abre la consola del navegador y ejecuta:
const url = process.env.NEXT_PUBLIC_LM_STUDIO_URL || 'http://localhost:1234';
fetch(`${url}/v1/models`)
  .then(res => res.json())
  .then(data => console.log('✅ CORS funciona:', data))
  .catch(err => console.error('❌ CORS bloqueado:', err));
```

Si ves:
- ✅ **"CORS funciona"**: Todo está bien configurado
- ❌ **"CORS bloqueado"**: Necesitas configurar CORS

### 2. Verificar Headers de CORS

Abre **Network** en DevTools (F12) y revisa una petición fallida:

**Busca estos headers en la respuesta:**
```
Access-Control-Allow-Origin: *
Access-Control-Allow-Methods: GET, POST, OPTIONS
Access-Control-Allow-Headers: Content-Type
```

Si **NO están presentes**, CORS no está habilitado.

---

## 🚨 Errores Comunes

### Error: "Request has been blocked by CORS policy"

**Causa**: LM Studio no tiene CORS habilitado.

**Solución**:
1. Habilita CORS en LM Studio (Opción 1)
2. O usa el proxy CORS (Opción 2)

### Error: "Failed to fetch"

**Causas posibles**:
1. **LM Studio no está corriendo**
   - Abre LM Studio
   - Carga un modelo
   - Inicia el servidor (Developer > Start Server)

2. **URL de ngrok incorrecta**
   - Verifica `.env.local`:
     ```bash
     NEXT_PUBLIC_LM_STUDIO_URL=https://tu-url.ngrok-free.app
     ```
   - Asegúrate de que NO tenga espacios al inicio/final
   - Reinicia el servidor Next.js (`npm run dev`)

3. **CORS bloqueado** (ver arriba)

### Error: "ngrok-skip-browser-warning"

**Causa**: Ngrok muestra página de advertencia en navegadores.

**Solución**: Agregar header al fetch:

```typescript
fetch(url, {
  headers: {
    'ngrok-skip-browser-warning': 'true'
  }
})
```

Ya está implementado en `lib/db/llm/client.ts`, pero si ves la página de advertencia, verifica que el header esté presente.

---

## 🔍 Debugging Paso a Paso

### 1. Verificar que LM Studio esté corriendo

```bash
curl http://localhost:1234/v1/models
```

**Resultado esperado:**
```json
{
  "object": "list",
  "data": [...]
}
```

### 2. Verificar que ngrok esté funcionando

```bash
curl https://tu-url.ngrok-free.app/v1/models
```

**Resultado esperado:**
```json
{
  "object": "list",
  "data": [...]
}
```

### 3. Verificar variable de entorno

En el navegador (consola F12):
```javascript
console.log('LM Studio URL:', process.env.NEXT_PUBLIC_LM_STUDIO_URL);
```

**Debe mostrar tu URL de ngrok**, NO localhost.

### 4. Verificar CORS desde el navegador

```javascript
fetch('https://tu-url.ngrok-free.app/v1/models', {
  headers: { 'ngrok-skip-browser-warning': 'true' }
})
  .then(r => r.json())
  .then(d => console.log('✅ Funciona:', d))
  .catch(e => console.error('❌ Error:', e));
```

---

## 📋 Checklist de Troubleshooting

Antes de reportar un error, verifica:

- [ ] LM Studio está corriendo y el servidor está activo
- [ ] Ngrok está corriendo y apuntando al puerto correcto
- [ ] `.env.local` tiene `NEXT_PUBLIC_LM_STUDIO_URL` correctamente configurado
- [ ] Has reiniciado el servidor Next.js después de cambiar `.env.local`
- [ ] CORS está habilitado en LM Studio o estás usando proxy CORS
- [ ] No hay espacios en blanco en la URL de `.env.local`
- [ ] El modelo está cargado en LM Studio

---

## 🎯 Configuración Recomendada

### Para desarrollo local (sin tablets/móviles):
```env
NEXT_PUBLIC_LM_STUDIO_URL=http://localhost:1234
```

### Para desarrollo con ngrok (tablets/móviles):
```env
NEXT_PUBLIC_LM_STUDIO_URL=https://tu-url.ngrok-free.app
```

**IMPORTANTE**: Reinicia `npm run dev` después de cambiar variables de entorno.

---

## 🆘 Última Opción: Proxy en Next.js

Si nada funciona, puedes crear un proxy dentro de Next.js:

`app/api/lm-proxy/[...path]/route.ts`:

```typescript
import { NextRequest, NextResponse } from 'next/server';

export async function POST(
  request: NextRequest,
  { params }: { params: { path: string[] } }
) {
  const path = params.path.join('/');
  const body = await request.json();

  const lmStudioUrl = 'http://localhost:1234'; // Solo localhost, no ngrok

  try {
    const response = await fetch(`${lmStudioUrl}/v1/${path}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });

    const data = await response.json();

    return NextResponse.json(data, {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type',
      },
    });
  } catch (error) {
    return NextResponse.json(
      { error: 'Error contacting LM Studio' },
      { status: 500 }
    );
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: { path: string[] } }
) {
  const path = params.path.join('/');
  const lmStudioUrl = 'http://localhost:1234';

  try {
    const response = await fetch(`${lmStudioUrl}/v1/${path}`);
    const data = await response.json();

    return NextResponse.json(data, {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type',
      },
    });
  } catch (error) {
    return NextResponse.json(
      { error: 'Error contacting LM Studio' },
      { status: 500 }
    );
  }
}
```

Luego, en `.env.local`:
```env
NEXT_PUBLIC_LM_STUDIO_URL=/api/lm-proxy
```

Esto hace que **todas las peticiones pasen por Next.js**, evitando CORS por completo.
