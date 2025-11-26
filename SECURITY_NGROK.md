# Guía de Seguridad para ngrok en Rem-E

Esta guía cubre las mejores prácticas de seguridad al exponer tu servidor LM Studio mediante ngrok u otras herramientas de túnel.

---

## 🔒 Tabla de Contenidos

1. [Riesgos y Consideraciones](#riesgos-y-consideraciones)
2. [Mejores Prácticas de Seguridad](#mejores-prácticas-de-seguridad)
3. [Configuración Segura](#configuración-segura)
4. [Monitoreo y Auditoría](#monitoreo-y-auditoría)
5. [Protección de Datos](#protección-de-datos)
6. [Plan de Respuesta a Incidentes](#plan-de-respuesta-a-incidentes)
7. [Checklist de Seguridad](#checklist-de-seguridad)

---

## ⚠️ Riesgos y Consideraciones

### Riesgos al Exponer LM Studio con ngrok

#### 1. **Exposición Pública**
- ✅ **Riesgo:** Tu servidor LLM estará accesible desde internet
- ✅ **Consecuencia:** Cualquier persona con la URL puede usarlo
- ⚡ **Impacto:** Alto - Uso no autorizado, costos inesperados

#### 2. **Fuga de Información**
- ✅ **Riesgo:** Conversaciones pueden contener información sensible
- ✅ **Consecuencia:** Datos privados expuestos a terceros
- ⚡ **Impacto:** Crítico - Violación de privacidad

#### 3. **Abuso de Recursos**
- ✅ **Riesgo:** Uso excesivo por terceros malintencionados
- ✅ **Consecuencia:** Saturación del servidor, costos elevados
- ⚡ **Impacto:** Medio-Alto - Impacto en rendimiento

#### 4. **Ataque de Denegación de Servicio (DoS)**
- ✅ **Riesgo:** Solicitudes masivas para saturar el servidor
- ✅ **Consecuencia:** Servidor inaccesible para usuarios legítimos
- ⚡ **Impacto:** Alto - Interrupción del servicio

#### 5. **Man-in-the-Middle (MITM)**
- ✅ **Riesgo:** Interposición de tráfico por ngrok
- ✅ **Consecuencia:** ngrok puede ver todo el tráfico
- ⚡ **Impacto:** Medio - Privacidad limitada

#### 6. **Injection Attacks**
- ✅ **Riesgo:** Prompt injection para manipular el LLM
- ✅ **Consecuencia:** Comportamiento no deseado del modelo
- ⚡ **Impacto:** Medio - Respuestas incorrectas o maliciosas

---

## 🛡️ Mejores Prácticas de Seguridad

### 1. Autenticación Obligatoria

**Nunca expongas tu LLM sin autenticación.**

#### Opción A: Autenticación en ngrok

```bash
# Con autenticación básica
ngrok http 1234 --basic-auth="usuario:contraseña-segura-123"

# O en ngrok.yml
tunnels:
  lm-studio:
    proto: http
    addr: 1234
    auth: "usuario:contraseña-segura-123"
```

**✅ Ventajas:**
- Fácil de implementar
- Funciona a nivel de túnel
- No requiere cambios en el código

**❌ Desventajas:**
- Autenticación básica es débil
- Credenciales en texto plano en configuración
- No hay control granular

#### Opción B: API Key en Next.js (Recomendado)

**Paso 1: Agrega variable de entorno**

`.env.local`:
```env
# API Key para proteger el LLM
LM_STUDIO_API_KEY=tu-clave-super-secreta-aqui-2024
```

**Paso 2: Modifica el endpoint `/api/assistant`**

`app/api/assistant/route.ts`:
```typescript
export async function POST(request: Request) {
  // 🔒 VERIFICACIÓN DE API KEY
  const apiKey = request.headers.get('x-api-key');
  const expectedKey = process.env.LM_STUDIO_API_KEY;

  if (expectedKey && apiKey !== expectedKey) {
    return Response.json(
      {
        success: false,
        error: 'Unauthorized - Invalid API Key',
        errorType: 'authentication'
      },
      { status: 401 }
    );
  }

  // ... resto del código
}
```

**Paso 3: Actualiza el frontend**

`app/*/page.tsx`:
```typescript
const response = await fetch('/api/assistant', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'x-api-key': process.env.NEXT_PUBLIC_LM_STUDIO_API_KEY || '',
  },
  body: JSON.stringify({
    text: userMessage,
    context: { /* ... */ }
  })
});
```

**✅ Ventajas:**
- Control granular por endpoint
- Fácil de rotar claves
- Se integra con sistemas de auth existentes

**❌ Desventajas:**
- Requiere cambios en código
- Necesita gestión de claves

#### Opción C: OAuth 2.0 / JWT (Producción)

Para entornos de producción, considera implementar OAuth 2.0 o JWT con:
- NextAuth.js
- Auth0
- Firebase Authentication
- Clerk

### 2. Rate Limiting (Limitación de Tasa)

Previene abuso mediante limitación de solicitudes.

#### Implementación con Middleware de Next.js

**Crea:** `middleware.ts` en raíz del proyecto

```typescript
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// Almacenamiento en memoria (para producción usa Redis)
const rateLimitMap = new Map<string, { count: number; resetTime: number }>();

const RATE_LIMIT_WINDOW = 60 * 1000; // 1 minuto
const MAX_REQUESTS = 10; // 10 solicitudes por minuto

export function middleware(request: NextRequest) {
  // Solo aplica a /api/assistant
  if (!request.nextUrl.pathname.startsWith('/api/assistant')) {
    return NextResponse.next();
  }

  const ip = request.ip || request.headers.get('x-forwarded-for') || 'unknown';
  const now = Date.now();

  let rateLimitData = rateLimitMap.get(ip);

  if (!rateLimitData || now > rateLimitData.resetTime) {
    // Reinicia contador
    rateLimitData = { count: 1, resetTime: now + RATE_LIMIT_WINDOW };
    rateLimitMap.set(ip, rateLimitData);
    return NextResponse.next();
  }

  rateLimitData.count++;

  if (rateLimitData.count > MAX_REQUESTS) {
    return NextResponse.json(
      {
        success: false,
        error: 'Too many requests - Please try again later',
        errorType: 'rate_limit'
      },
      { status: 429 }
    );
  }

  rateLimitMap.set(ip, rateLimitData);
  return NextResponse.next();
}

export const config = {
  matcher: '/api/assistant/:path*',
};
```

**Para producción con Redis:**

```bash
npm install ioredis
```

```typescript
import Redis from 'ioredis';

const redis = new Redis(process.env.REDIS_URL);

export async function middleware(request: NextRequest) {
  const ip = request.ip || 'unknown';
  const key = `rate_limit:${ip}`;

  const current = await redis.incr(key);

  if (current === 1) {
    await redis.expire(key, 60); // 60 segundos
  }

  if (current > MAX_REQUESTS) {
    return NextResponse.json(
      { error: 'Too many requests' },
      { status: 429 }
    );
  }

  return NextResponse.next();
}
```

### 3. Validación de Entrada

Previene ataques de injection y datos maliciosos.

#### Sanitización de Prompts

```typescript
// lib/utils/sanitize.ts

/**
 * Limpia y valida input del usuario para prevenir prompt injection
 */
export function sanitizeUserInput(input: string): {
  sanitized: string;
  warnings: string[];
} {
  const warnings: string[] = [];

  // Límite de longitud
  const MAX_LENGTH = 2000;
  if (input.length > MAX_LENGTH) {
    warnings.push('Input truncado a 2000 caracteres');
    input = input.substring(0, MAX_LENGTH);
  }

  // Detecta patrones sospechosos de prompt injection
  const suspiciousPatterns = [
    /ignore (previous|all) instructions?/i,
    /system:?\s*you are/i,
    /\[INST\]|\[\/INST\]/i, // Llama prompt injection
    /###?\s*system/i,
    /role:?\s*system/i,
  ];

  for (const pattern of suspiciousPatterns) {
    if (pattern.test(input)) {
      warnings.push('Patrón sospechoso detectado - eliminado');
      input = input.replace(pattern, '[FILTERED]');
    }
  }

  // Elimina caracteres de control excepto saltos de línea
  input = input.replace(/[\x00-\x08\x0B-\x0C\x0E-\x1F\x7F]/g, '');

  // Normaliza espacios en blanco
  input = input.replace(/\s+/g, ' ').trim();

  return { sanitized: input, warnings };
}
```

**Uso en el endpoint:**

```typescript
import { sanitizeUserInput } from '@/lib/utils/sanitize';

export async function POST(request: Request) {
  const { text } = await request.json();

  const { sanitized, warnings } = sanitizeUserInput(text);

  if (warnings.length > 0) {
    console.warn('Input sanitization warnings:', warnings);
  }

  // Usa 'sanitized' en vez de 'text'
  const result = await client.chat(sanitized);
  // ...
}
```

### 4. Filtrado de Salida

Previene fugas de información sensible.

```typescript
// lib/utils/filterOutput.ts

/**
 * Filtra salida del LLM para prevenir fugas de información
 */
export function filterLLMOutput(output: string): string {
  // Elimina posibles API keys
  output = output.replace(/[a-zA-Z0-9]{32,}/g, '[REDACTED]');

  // Elimina posibles IPs privadas
  output = output.replace(/\b192\.168\.\d{1,3}\.\d{1,3}\b/g, '[IP]');
  output = output.replace(/\b10\.\d{1,3}\.\d{1,3}\.\d{1,3}\b/g, '[IP]');

  // Elimina posibles emails (opcional)
  // output = output.replace(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g, '[EMAIL]');

  return output;
}
```

### 5. HTTPS Obligatorio

**SIEMPRE usa HTTPS para ngrok:**

```bash
# ngrok proporciona HTTPS por defecto
ngrok http 1234
# ✅ https://abc123.ngrok-free.app (seguro)
# ❌ http://abc123.ngrok-free.app (inseguro - NO USAR)
```

**Fuerza HTTPS en Next.js:**

```typescript
// middleware.ts
export function middleware(request: NextRequest) {
  // En producción, fuerza HTTPS
  if (process.env.NODE_ENV === 'production') {
    const proto = request.headers.get('x-forwarded-proto');
    if (proto !== 'https') {
      return NextResponse.redirect(
        `https://${request.headers.get('host')}${request.nextUrl.pathname}`,
        301
      );
    }
  }

  return NextResponse.next();
}
```

### 6. Rotación de URLs

Si usas el plan gratuito de ngrok, **reinicia el túnel regularmente** para cambiar la URL.

```bash
# Cron job para rotar cada 24 horas (Linux/Mac)
0 0 * * * pkill ngrok && /usr/local/bin/ngrok http 1234 &
```

**O usa un script de rotación automática:**

```javascript
// scripts/rotate-ngrok.js
const cron = require('node-cron');

// Cada día a medianoche
cron.schedule('0 0 * * *', () => {
  console.log('Rotando túnel de ngrok...');
  // Detiene ngrok actual
  // Inicia nuevo túnel
  // Actualiza .env.local
});
```

### 7. Logs y Auditoría

**Registra todas las solicitudes:**

```typescript
// app/api/assistant/route.ts
export async function POST(request: Request) {
  const startTime = Date.now();
  const ip = request.headers.get('x-forwarded-for') || 'unknown';
  const userAgent = request.headers.get('user-agent') || 'unknown';

  try {
    // ... lógica del endpoint

    // Log de éxito
    console.log({
      timestamp: new Date().toISOString(),
      ip,
      userAgent,
      endpoint: '/api/assistant',
      duration: Date.now() - startTime,
      status: 'success',
    });

    return response;

  } catch (error) {
    // Log de error
    console.error({
      timestamp: new Date().toISOString(),
      ip,
      userAgent,
      endpoint: '/api/assistant',
      duration: Date.now() - startTime,
      status: 'error',
      error: error.message,
    });

    throw error;
  }
}
```

**Para producción, usa un servicio de logging:**
- Winston
- Pino
- LogRocket
- Sentry

---

## 🔐 Configuración Segura

### ngrok.yml Seguro

```yaml
version: 2
authtoken: TU_AUTHTOKEN_AQUI

# Configuración de logging
log_level: info
log_format: json
log: /var/log/ngrok.log

tunnels:
  lm-studio:
    proto: http
    addr: 1234

    # Dominio estático (requiere plan de pago)
    # domain: mi-rem-e-llm.ngrok.io

    # Autenticación básica
    auth: "rem-e-user:contraseña-super-segura-2024"

    # Headers de seguridad
    request_headers:
      add:
        - "X-Frame-Options: DENY"
        - "X-Content-Type-Options: nosniff"
        - "Strict-Transport-Security: max-age=31536000"

    # Compresión
    compression: true

    # Inspector (deshabilita en producción)
    inspect: false

    # Restricción de IPs (solo ngrok Pro)
    # ip_restriction:
    #   allow_cidrs:
    #     - "203.0.113.0/24"  # Tu red
```

### Variables de Entorno Seguras

`.env.local`:
```env
# ========================================
# NGROK CONFIGURATION
# ========================================

# Authtoken de ngrok (MANTÉN ESTO SECRETO)
NGROK_AUTHTOKEN=tu_authtoken_super_secreto_aqui

# Dominio estático (si tienes plan de pago)
# NGROK_DOMAIN=mi-rem-e-llm.ngrok.io

# Autenticación básica para ngrok
NGROK_AUTH=rem-e-user:contraseña-super-segura-2024

# ========================================
# API SECURITY
# ========================================

# API Key para proteger endpoints (MANTÉN ESTO SECRETO)
LM_STUDIO_API_KEY=clave-api-super-segura-2024-rem-e

# Rate limiting
RATE_LIMIT_WINDOW_MS=60000  # 1 minuto
RATE_LIMIT_MAX_REQUESTS=10  # 10 solicitudes por minuto

# ========================================
# LM STUDIO
# ========================================

# URL del servidor LM Studio
NEXT_PUBLIC_LM_STUDIO_URL=https://tu-url.ngrok-free.app
```

**⚠️ NUNCA compartas estas credenciales públicamente.**

### Gitignore Correcto

`.gitignore`:
```gitignore
# Environment variables
.env
.env.local
.env.production
.env.*.local

# Backups de .env
.env.local.backup
.env.backup

# Logs de ngrok
ngrok.log
/tmp/ngrok.log

# Configuración de ngrok (contiene authtoken)
.ngrok2/ngrok.yml

# Node modules
node_modules/
```

---

## 📊 Monitoreo y Auditoría

### 1. Dashboard de ngrok

Accede a http://localhost:4040 mientras ngrok esté corriendo para:
- Ver solicitudes en tiempo real
- Inspeccionar headers y payloads
- Detectar patrones sospechosos
- Repetir solicitudes para debugging

### 2. Alertas de Uso Inusual

```javascript
// lib/monitoring/alerts.js

const ALERT_THRESHOLDS = {
  requestsPerMinute: 50,
  errorRate: 0.1, // 10%
  avgResponseTime: 5000, // 5 segundos
};

let stats = {
  requests: 0,
  errors: 0,
  totalResponseTime: 0,
  lastReset: Date.now(),
};

export function trackRequest(duration, isError = false) {
  stats.requests++;
  stats.totalResponseTime += duration;

  if (isError) {
    stats.errors++;
  }

  // Resetea cada minuto
  if (Date.now() - stats.lastReset > 60000) {
    checkThresholds();
    stats = {
      requests: 0,
      errors: 0,
      totalResponseTime: 0,
      lastReset: Date.now(),
    };
  }
}

function checkThresholds() {
  const avgResponseTime = stats.totalResponseTime / stats.requests;
  const errorRate = stats.errors / stats.requests;

  if (stats.requests > ALERT_THRESHOLDS.requestsPerMinute) {
    sendAlert('High request rate detected', { requests: stats.requests });
  }

  if (errorRate > ALERT_THRESHOLDS.errorRate) {
    sendAlert('High error rate detected', { errorRate });
  }

  if (avgResponseTime > ALERT_THRESHOLDS.avgResponseTime) {
    sendAlert('Slow response time detected', { avgResponseTime });
  }
}

function sendAlert(message, data) {
  console.error('[ALERT]', message, data);
  // Aquí puedes integrar con:
  // - Email (SendGrid, AWS SES)
  // - SMS (Twilio)
  // - Slack webhook
  // - PagerDuty
}
```

### 3. Logs Estructurados

```typescript
// lib/logger.ts
export const logger = {
  info: (message: string, meta?: Record<string, unknown>) => {
    console.log(JSON.stringify({
      level: 'info',
      timestamp: new Date().toISOString(),
      message,
      ...meta,
    }));
  },

  warn: (message: string, meta?: Record<string, unknown>) => {
    console.warn(JSON.stringify({
      level: 'warn',
      timestamp: new Date().toISOString(),
      message,
      ...meta,
    }));
  },

  error: (message: string, error: Error, meta?: Record<string, unknown>) => {
    console.error(JSON.stringify({
      level: 'error',
      timestamp: new Date().toISOString(),
      message,
      error: {
        message: error.message,
        stack: error.stack,
      },
      ...meta,
    }));
  },

  security: (message: string, meta?: Record<string, unknown>) => {
    console.error(JSON.stringify({
      level: 'security',
      timestamp: new Date().toISOString(),
      message,
      ...meta,
    }));
  },
};
```

**Uso:**

```typescript
import { logger } from '@/lib/logger';

// Request sospechoso
logger.security('Suspicious request detected', {
  ip: request.ip,
  pattern: 'potential_injection',
  input: sanitized,
});

// Error
logger.error('Failed to process request', error, {
  ip: request.ip,
  endpoint: '/api/assistant',
});
```

---

## 🔏 Protección de Datos

### 1. No Almacenes Datos Sensibles

```typescript
// ❌ MALO
const conversationHistory = [];

export async function POST(request: Request) {
  const { text } = await request.json();
  conversationHistory.push({ user: text }); // NO HAGAS ESTO
  // ...
}

// ✅ BUENO
export async function POST(request: Request) {
  const { text, conversationId } = await request.json();

  // Usa almacenamiento temporal cifrado si es necesario
  // O simplemente no almacenes nada
  // ...
}
```

### 2. Encriptación de Datos en Tránsito

ngrok proporciona HTTPS por defecto, pero asegúrate de que todos los endpoints usen TLS/SSL.

### 3. Política de Retención de Datos

```typescript
// lib/data-retention.ts

const conversationCache = new Map<string, {
  data: unknown;
  expiresAt: number;
}>();

export function cacheConversation(id: string, data: unknown, ttl = 3600000) {
  conversationCache.set(id, {
    data,
    expiresAt: Date.now() + ttl,
  });
}

export function getConversation(id: string) {
  const cached = conversationCache.get(id);

  if (!cached) {
    return null;
  }

  if (Date.now() > cached.expiresAt) {
    conversationCache.delete(id);
    return null;
  }

  return cached.data;
}

// Limpieza periódica
setInterval(() => {
  const now = Date.now();
  for (const [id, { expiresAt }] of conversationCache.entries()) {
    if (now > expiresAt) {
      conversationCache.delete(id);
    }
  }
}, 60000); // Cada minuto
```

---

## 🚨 Plan de Respuesta a Incidentes

### Escenarios de Incidentes

#### 1. URL de ngrok Comprometida

**Síntomas:**
- Tráfico inusualmente alto
- Solicitudes desde IPs desconocidas
- Patrones de uso anormales

**Respuesta:**
1. **INMEDIATAMENTE detén ngrok:** `pkill ngrok` o Ctrl+C
2. Revisa logs para identificar alcance del compromiso
3. Cambia credenciales de autenticación si las tenías
4. Reinicia ngrok (nueva URL)
5. Actualiza `.env.local` con nueva URL
6. Notifica a usuarios legítimos de la nueva URL

#### 2. Ataque de Denegación de Servicio

**Síntomas:**
- Servidor saturado
- Respuestas lentas o timeouts
- Logs muestran solicitudes repetidas desde mismas IPs

**Respuesta:**
1. Activa rate limiting agresivo
2. Bloquea IPs sospechosas (ngrok Pro)
3. Considera detener temporalmente el servicio
4. Analiza logs para identificar patrón de ataque
5. Implementa CAPTCHA si es necesario

#### 3. Prompt Injection Exitoso

**Síntomas:**
- LLM responde de forma inesperada
- Divulga información del system prompt
- Ejecuta funciones no autorizadas

**Respuesta:**
1. Revisa logs para identificar prompt malicioso
2. Actualiza sistema de sanitización
3. Mejora el system prompt con instrucciones más claras
4. Considera usar modelos con mejor alineación
5. Implementa lista negra de patrones conocidos

---

## ✅ Checklist de Seguridad

Antes de exponer tu LLM con ngrok:

### Pre-Deployment

- [ ] ngrok instalado y configurado con authtoken
- [ ] LM Studio corriendo correctamente
- [ ] Variables de entorno configuradas en `.env.local`
- [ ] `.env.local` agregado a `.gitignore`
- [ ] Credenciales de AWS rotadas (las del repo están comprometidas)

### Autenticación

- [ ] Autenticación básica de ngrok habilitada
- [ ] API Key implementada en endpoints
- [ ] Headers de autenticación verificados

### Rate Limiting

- [ ] Middleware de rate limiting implementado
- [ ] Límites configurados apropiadamente (10-20 req/min)
- [ ] Mensajes de error claros para usuarios

### Validación

- [ ] Sanitización de input implementada
- [ ] Validación de longitud de prompts
- [ ] Detección de patrones de injection
- [ ] Filtrado de output para información sensible

### Monitoreo

- [ ] Logs estructurados implementados
- [ ] Dashboard de ngrok revisado regularmente
- [ ] Alertas configuradas para uso inusual
- [ ] Métricas de rendimiento monitoreadas

### Seguridad de Red

- [ ] HTTPS usado exclusivamente (no HTTP)
- [ ] Headers de seguridad configurados
- [ ] CORS configurado apropiadamente
- [ ] Compresión habilitada para eficiencia

### Gestión de Datos

- [ ] Datos sensibles NO almacenados
- [ ] TTL configurado para datos temporales
- [ ] Limpieza periódica de caché implementada
- [ ] Política de retención documentada

### Documentación

- [ ] Equipo informado sobre riesgos de seguridad
- [ ] Procedimientos de emergencia documentados
- [ ] Contactos de soporte identificados
- [ ] Plan de respuesta a incidentes preparado

### Testing

- [ ] Health check funcionando: `GET /api/assistant`
- [ ] Autenticación probada con credenciales inválidas
- [ ] Rate limiting probado con múltiples solicitudes
- [ ] Prompt injection intentado y bloqueado

### Post-Deployment

- [ ] URL de ngrok documentada y compartida solo con usuarios autorizados
- [ ] Monitoreo activo durante primeras 24 horas
- [ ] Logs revisados para patrones anormales
- [ ] Plan de rotación de URL establecido

---

## 📚 Recursos Adicionales

### Documentación Oficial

- **ngrok Security:** https://ngrok.com/docs/security
- **OWASP Top 10:** https://owasp.org/www-project-top-ten/
- **Next.js Security:** https://nextjs.org/docs/security

### Herramientas de Seguridad

- **ngrok Inspector:** http://localhost:4040
- **Security Headers:** https://securityheaders.com/
- **SSL Labs:** https://www.ssllabs.com/ssltest/

### Comunidad

- **ngrok Community:** https://github.com/inconshreveable/ngrok/discussions
- **Next.js Discord:** https://nextjs.org/discord
- **r/netsec:** https://reddit.com/r/netsec

---

## 🆘 Soporte

Si detectas un problema de seguridad:

1. **NO lo compartas públicamente**
2. Detén el servicio inmediatamente
3. Documenta el incidente
4. Contacta al equipo de desarrollo
5. Revisa esta guía para respuesta apropiada

---

**Última actualización:** 2024
**Versión:** 1.0
**Mantenedor:** Equipo Rem-E
