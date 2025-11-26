# Rem-E Voice API Server

API REST para el servidor de reconocimiento de voz de Rem-E. Permite procesar comandos de voz desde cualquier dispositivo en tu red local.

## 🚀 Características

- **API REST** - Endpoints HTTP para procesar comandos de texto
- **WebSocket** - Compatible con el cliente web existente
- **CORS habilitado** - Accesible desde cualquier origen
- **Auto-documentación** - Swagger UI integrado
- **Network-ready** - Accesible desde cualquier dispositivo en tu red

## 📦 Instalación

1. Instala las dependencias:

```bash
cd voice-server
pip install -r requirements.txt
```

2. Descarga un modelo Vosk (si aún no lo tienes):

```bash
# Descarga el modelo pequeño (recomendado)
# https://alphacephei.com/vosk/models
# Extrae en: voice-server/models/vosk-model-small-es-0.42/
```

## 🎯 Uso

### Iniciar el servidor

```bash
# Usando el puerto por defecto (8765)
python start_api.py

# Especificando un puerto
python start_api.py 9000

# Especificando host y puerto
python start_api.py 8765 0.0.0.0
```

El servidor estará disponible en:
- **API**: `http://tu-ip:8765`
- **Documentación**: `http://tu-ip:8765/docs`
- **WebSocket**: `ws://tu-ip:8765/ws`

### Obtener tu IP local

**Windows:**
```bash
ipconfig
# Busca "Dirección IPv4" en tu adaptador de red
```

**Linux/Mac:**
```bash
ip addr show
# o
ifconfig
```

## 📡 Endpoints de la API

### 1. Health Check

Verifica que el servidor esté funcionando.

```bash
GET /health
```

**Ejemplo:**
```bash
curl http://localhost:8765/health
```

**Respuesta:**
```json
{
  "status": "healthy"
}
```

---

### 2. Estado del Servidor

Obtiene información del estado actual del servidor.

```bash
GET /status
```

**Ejemplo:**
```bash
curl http://localhost:8765/status
```

**Respuesta:**
```json
{
  "running": true,
  "model": "small",
  "connected_clients": 2,
  "conversation_active": false,
  "lm_studio_connected": true
}
```

---

### 3. Procesar Comando

Procesa un comando de texto como si fuera voz.

```bash
POST /api/command
Content-Type: application/json
```

**Body:**
```json
{
  "text": "¿cuántos tomates tengo?",
  "context": {
    "current_page": "/inventory"
  },
  "skip_wake_word": true
}
```

**Parámetros:**
- `text` (requerido): El comando o pregunta a procesar
- `context` (opcional): Contexto adicional de la aplicación
- `skip_wake_word` (opcional): Si `true`, no requiere wake word (por defecto: `true`)

**Ejemplo con curl:**
```bash
curl -X POST http://localhost:8765/api/command \
  -H "Content-Type: application/json" \
  -d '{
    "text": "¿qué tengo en el inventario?"
  }'
```

**Ejemplo con JavaScript:**
```javascript
const response = await fetch('http://192.168.1.100:8765/api/command', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    text: '¿cuántos tomates tengo?',
    skip_wake_word: true
  })
});

const data = await response.json();
console.log(data.response_text);
```

**Respuesta (Pregunta):**
```json
{
  "success": true,
  "intent": "question",
  "data": null,
  "response_text": "Tienes 3 tomates en la alacena",
  "error": null,
  "error_type": null
}
```

**Respuesta (Navegación):**
```json
{
  "success": true,
  "intent": "navigation",
  "data": {
    "route": "/recipes"
  },
  "response_text": "Navegando a /recipes",
  "error": null,
  "error_type": null
}
```

**Respuesta (Comando de Cocina):**
```json
{
  "success": true,
  "intent": "cooking_command",
  "data": {
    "command": "siguiente"
  },
  "response_text": "Ejecutando comando: siguiente",
  "error": null,
  "error_type": null
}
```

---

### 4. Actualizar Contexto

Actualiza el contexto de la cocina (útil cuando el usuario está cocinando).

```bash
POST /api/context
Content-Type: application/json
```

**Body:**
```json
{
  "context": {
    "inRecipeGuide": true,
    "recipeName": "Pasta Carbonara",
    "currentStep": 3,
    "currentStepInstruction": "Cocina la pasta al dente"
  }
}
```

**Ejemplo:**
```bash
curl -X POST http://localhost:8765/api/context \
  -H "Content-Type: application/json" \
  -d '{
    "context": {
      "inRecipeGuide": true,
      "recipeName": "Pasta Carbonara",
      "currentStep": 3
    }
  }'
```

**Respuesta:**
```json
{
  "success": true,
  "message": "Contexto actualizado",
  "context": {
    "inRecipeGuide": true,
    "recipeName": "Pasta Carbonara",
    "currentStep": 3
  }
}
```

---

## 🌐 Uso desde Otros Dispositivos

### Desde un móvil/tablet en tu red

```javascript
// Reemplaza 192.168.1.100 con la IP de tu PC
const API_URL = 'http://192.168.1.100:8765';

async function askRemE(question) {
  const response = await fetch(`${API_URL}/api/command`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ text: question })
  });

  const data = await response.json();
  return data.response_text;
}

// Uso
const answer = await askRemE('¿qué puedo cocinar con pollo?');
console.log(answer);
```

### Desde Python

```python
import requests

API_URL = "http://192.168.1.100:8765"

def ask_reme(question):
    response = requests.post(
        f"{API_URL}/api/command",
        json={"text": question}
    )
    data = response.json()
    return data.get("response_text")

# Uso
answer = ask_reme("¿cuántos tomates tengo?")
print(answer)
```

### Desde cualquier herramienta (Postman, Insomnia, etc.)

1. Configura una petición POST a `http://tu-ip:8765/api/command`
2. Headers: `Content-Type: application/json`
3. Body: `{"text": "tu pregunta aquí"}`

---

## 🔧 Configuración Avanzada

### Cambiar puerto y host

Edita `voice-server/api_config.py`:

```python
API_HOST = "0.0.0.0"  # Todas las interfaces
API_PORT = 8765       # Puerto por defecto
```

### Configurar CORS

Edita `voice-server/api_config.py`:

```python
CORS_ORIGINS = [
    "http://localhost:3000",
    "http://192.168.1.50:3000",  # Tu tablet
    # Agrega más orígenes aquí
]
```

---

## 📚 Documentación Interactiva

Una vez iniciado el servidor, visita:

```
http://localhost:8765/docs
```

Encontrarás:
- Documentación completa de todos los endpoints
- Interfaz para probar las APIs directamente
- Esquemas de request/response
- Ejemplos de uso

---

## 🐛 Troubleshooting

### El servidor no arranca

1. Verifica que LM Studio esté corriendo en el puerto 1234
2. Asegúrate de tener un modelo Vosk descargado
3. Revisa que el puerto 8765 no esté en uso

### No puedo acceder desde otro dispositivo

1. Verifica que tu firewall permita conexiones en el puerto 8765
2. Asegúrate de estar en la misma red WiFi
3. Usa la IP local correcta (no 127.0.0.1)

**Windows Firewall:**
```bash
# Permitir puerto 8765 en el firewall
netsh advfirewall firewall add rule name="Rem-E Voice API" dir=in action=allow protocol=TCP localport=8765
```

### Error "LM Studio not connected"

1. Inicia LM Studio
2. Carga un modelo
3. Asegúrate de que esté escuchando en `http://localhost:1234`

---

## 🔒 Seguridad

⚠️ **IMPORTANTE**: Este servidor está diseñado para uso en red local.

**NO expongas este servidor a internet sin:**
1. Implementar autenticación
2. Usar HTTPS
3. Configurar rate limiting
4. Validar entradas

Para uso en red local (desarrollo), es seguro usar `API_HOST = "0.0.0.0"`.

---

## 📝 Ejemplos Completos

### App móvil simple (HTML + JS)

```html
<!DOCTYPE html>
<html>
<head>
  <title>Rem-E Voice</title>
  <meta name="viewport" content="width=device-width, initial-scale=1">
</head>
<body>
  <h1>Rem-E Asistente</h1>
  <input type="text" id="question" placeholder="Pregunta algo...">
  <button onclick="ask()">Preguntar</button>
  <div id="response"></div>

  <script>
    const API_URL = 'http://192.168.1.100:8765'; // Cambia por tu IP

    async function ask() {
      const question = document.getElementById('question').value;
      const response = await fetch(`${API_URL}/api/command`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: question })
      });

      const data = await response.json();
      document.getElementById('response').innerText = data.response_text;
    }
  </script>
</body>
</html>
```

---

## 💡 Tips

1. **Usa el endpoint `/status`** para verificar que todo funciona antes de hacer requests
2. **Actualiza el contexto** antes de hacer preguntas sobre recetas para respuestas más precisas
3. **Revisa `/docs`** para ver todos los parámetros disponibles
4. **Usa `skip_wake_word: true`** en la API para no tener que decir "Remy"

---

## 📞 Soporte

Si tienes problemas, verifica:
1. Logs del servidor en la consola
2. Respuestas de `/health` y `/status`
3. Documentación en `/docs`
