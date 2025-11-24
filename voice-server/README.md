# Rem-E Voice Server

Servidor de reconocimiento de voz para el asistente de cocina Rem-E.

## Requisitos

- Python 3.8+
- PyAudio (requiere PortAudio)
- Modelo Vosk en español

## Instalación

### 1. Instalar dependencias del sistema

**Windows:**
```bash
# PyAudio se instalará automáticamente con pip
```

**macOS:**
```bash
brew install portaudio
```

**Linux (Ubuntu/Debian):**
```bash
sudo apt-get install portaudio19-dev python3-pyaudio
```

### 2. Instalar dependencias de Python

```bash
cd voice-server
pip install -r requirements.txt
```

### 3. Descargar modelo Vosk

Descarga el modelo en español desde: https://alphacephei.com/vosk/models

Opciones recomendadas:
- **Pequeño (~39MB)**: `vosk-model-small-es-0.42` - Rápido, bajo consumo
- **Completo (~1.4GB)**: `vosk-model-es-0.42` - Mayor precisión

Extrae el modelo en la carpeta `models/`:
```
voice-server/
├── models/
│   ├── vosk-model-small-es-0.42/
│   └── vosk-model-es-0.42/
├── voice_server.py
├── config.py
└── requirements.txt
```

### 4. Configurar LM Studio

1. Descarga e instala [LM Studio](https://lmstudio.ai/)
2. Descarga un modelo de lenguaje (recomendado: Llama 2, Mistral, o similar)
3. Inicia el servidor local en el puerto 1234

## Uso

```bash
python voice_server.py
```

El servidor:
1. Te pedirá seleccionar un modelo Vosk
2. Iniciará el servidor WebSocket en `ws://localhost:8765`
3. Escuchará comandos de voz

### Comandos de voz

Di "**Rem-E**" seguido de tu comando:

**Navegación:**
- "Rem-E, ve a recetas"
- "Rem-E, abre el inventario"
- "Rem-E, ir a cocinar"
- "Rem-E, muéstrame el planificador"

**Preguntas (requiere LM Studio):**
- "Rem-E, ¿qué puedo cocinar con pollo?"
- "Rem-E, ¿cómo hago una salsa bechamel?"
- "Rem-E, ¿cuántas calorías tiene el arroz?"

## Configuración

Edita `config.py` para personalizar:

- `WAKE_WORD`: Palabra de activación (default: "remy")
- `LM_STUDIO_URL`: URL del servidor LM Studio
- `SAMPLE_RATE`: Tasa de muestreo de audio
- `SYSTEM_PROMPT`: Personalidad del asistente

## Integración con Next.js

El frontend se conecta al WebSocket y recibe:

```json
// Navegación
{"type": "navigation", "command": "ve a recetas", "route": "/recipes"}

// Respuesta del LLM
{"type": "llm_response", "question": "...", "response": "..."}

// Wake word detectado
{"type": "wake_word_detected", "text": "...", "command": "..."}

// Resultado parcial
{"type": "partial", "text": "..."}
```

## Solución de problemas

### "No se encontró el modelo"
Asegúrate de descargar y extraer el modelo Vosk en `models/`.

### "No se puede conectar a LM Studio"
Verifica que LM Studio esté corriendo con el servidor local activado.

### Error de PyAudio
En Windows, puede que necesites instalar las Visual C++ Build Tools.
En macOS/Linux, asegúrate de tener PortAudio instalado.
