"""
API REST para el servidor de voz Rem-E usando FastAPI.
Permite procesar comandos de voz desde cualquier cliente HTTP.
Mantiene compatibilidad con WebSocket para el cliente web.
"""

import asyncio
import json
import os
import uuid
from typing import Optional, Dict, Any
import pyaudio
import requests
from vosk import Model, KaldiRecognizer
import websockets
from fastapi import FastAPI, HTTPException, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import uvicorn

from config import (
    VOSK_MODELS, SAMPLE_RATE, WAKE_WORD, LM_STUDIO_URL,
    SYSTEM_PROMPT, NAVIGATION_SECTIONS, NAVIGATION_VERBS,
    CONVERSATION_TIMEOUT
)

# ==================== Modelos de datos ====================

class CommandRequest(BaseModel):
    """Solicitud de procesamiento de comando de voz."""
    text: str
    context: Optional[Dict[str, Any]] = None
    skip_wake_word: bool = True  # Por defecto no requiere wake word en API


class ContextUpdate(BaseModel):
    """Actualización de contexto de cocina."""
    context: Dict[str, Any]


class CommandResponse(BaseModel):
    """Respuesta del procesamiento de comando."""
    success: bool
    intent: str  # "navigation" | "cooking_command" | "question"
    data: Optional[Any] = None
    response_text: Optional[str] = None
    error: Optional[str] = None
    error_type: Optional[str] = None


class ServerStatus(BaseModel):
    """Estado del servidor."""
    running: bool
    model: str
    connected_clients: int
    conversation_active: bool
    lm_studio_connected: bool


# ==================== FastAPI App ====================

app = FastAPI(
    title="Rem-E Voice API",
    description="API REST para procesamiento de comandos de voz del asistente Rem-E",
    version="1.0.0"
)

# Configurar CORS para permitir acceso desde cualquier origen
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # En producción, especifica los orígenes permitidos
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ==================== Variables globales ====================

connected_clients = set()
pending_function_responses: Dict[str, asyncio.Future] = {}
voice_server = None

# ==================== Funciones auxiliares ====================

def classify_intent(text: str) -> tuple[str, str | None]:
    """
    Clasifica si el texto es un comando de navegación, comando de cocina o una pregunta.
    Returns: ("navigation" | "cooking_command" | "question", command_type | route | None)
    """
    lower_text = text.lower().strip()

    # Comandos de cocina
    cooking_commands = {
        "siguiente": ["siguiente", "siguiente paso", "continua", "continúa", "avanza"],
        "anterior": ["anterior", "paso anterior", "vuelve", "regresa", "atrás"],
        "repetir": ["repite", "repetir", "otra vez", "de nuevo", "lee de nuevo"],
        "pausar": ["pausa", "pausar", "detén", "detener", "espera"],
        "reanudar": ["reanuda", "reanudar", "continua", "continúa"],
        "timer": ["timer", "temporizador", "cronómetro", "avísame en", "alerta en"],
    }

    for command_type, patterns in cooking_commands.items():
        for pattern in patterns:
            if pattern in lower_text:
                word_count = len(lower_text.split())
                if word_count <= 3:
                    return ("cooking_command", command_type)
                if any(q in lower_text for q in ["qué", "que", "cuál", "cual", "cómo", "como"]):
                    return ("question", None)
                if any(v in lower_text for v in ["ve", "pasa", "avanza", "lee", "di", "dime"]):
                    return ("cooking_command", command_type)

    # Verificar navegación
    has_nav_verb = any(verb in lower_text for verb in NAVIGATION_VERBS)

    question_indicators = [
        "qué", "que", "cuánto", "cuanto", "cuánta", "cuanta",
        "cuántos", "cuantos", "cuántas", "cuantas",
        "cómo", "como", "dónde", "donde", "por qué", "porque",
        "tengo", "hay", "puedo", "necesito", "falta", "busca",
        "buscar", "encuentra", "encontrar", "dame", "dime",
        "cuál", "cual", "sería", "seria"
    ]
    is_question = any(q in lower_text for q in question_indicators)

    if is_question and not has_nav_verb:
        return ("question", None)

    for section_name, route in NAVIGATION_SECTIONS.items():
        if section_name in lower_text:
            if has_nav_verb:
                return ("navigation", route)
            if len(lower_text.split()) <= 4:
                return ("navigation", route)

    return ("question", None)


def is_assistant_asking_question(text: str) -> bool:
    """Detecta si la respuesta del asistente contiene una pregunta."""
    if not text:
        return False

    lower_text = text.lower().strip()
    question_patterns = [
        "¿", "?",
        "dónde", "donde",
        "cuántos", "cuantos", "cuántas", "cuantas",
        "cuál", "cual", "cuáles", "cuales",
        "qué tipo", "que tipo",
        "qué ubicación", "que ubicación",
    ]
    return any(pattern in lower_text for pattern in question_patterns)


# Importar definiciones de funciones del servidor original
from voice_server import FUNCTION_DEFINITIONS, LLMClient, VoiceServer

# ==================== Endpoints de la API ====================

@app.get("/", response_model=dict)
async def root():
    """Endpoint raíz con información de la API."""
    return {
        "name": "Rem-E Voice API",
        "version": "1.0.0",
        "status": "running",
        "endpoints": {
            "health": "/health",
            "status": "/status",
            "process_command": "/api/command",
            "update_context": "/api/context",
            "websocket": "/ws"
        }
    }


@app.get("/health")
async def health_check():
    """Health check endpoint."""
    return {"status": "healthy"}


@app.get("/status", response_model=ServerStatus)
async def get_status():
    """Obtiene el estado actual del servidor."""
    global voice_server

    # Verificar conexión con LM Studio
    lm_studio_connected = False
    try:
        response = requests.get("http://localhost:1234/v1/models", timeout=2)
        lm_studio_connected = response.status_code == 200
    except:
        pass

    if not voice_server:
        return ServerStatus(
            running=False,
            model="none",
            connected_clients=len(connected_clients),
            conversation_active=False,
            lm_studio_connected=lm_studio_connected
        )

    return ServerStatus(
        running=voice_server.running,
        model=voice_server.model_key,
        connected_clients=len(connected_clients),
        conversation_active=voice_server.conversation_active,
        lm_studio_connected=lm_studio_connected
    )


@app.post("/api/command", response_model=CommandResponse)
async def process_command(request: CommandRequest):
    """
    Procesa un comando de texto como si fuera voz.

    Args:
        request: Comando y contexto opcional

    Returns:
        Respuesta con resultado del procesamiento
    """
    global voice_server

    if not voice_server:
        raise HTTPException(status_code=503, detail="Servidor de voz no inicializado")

    # Actualizar contexto si se proporciona
    if request.context:
        voice_server.llm.update_context(request.context)

    # Clasificar intención
    intent, data = classify_intent(request.text)

    try:
        if intent == "navigation" and data:
            # Comando de navegación
            return CommandResponse(
                success=True,
                intent="navigation",
                data={"route": data},
                response_text=f"Navegando a {data}"
            )

        elif intent == "cooking_command" and data:
            # Comando de cocina
            return CommandResponse(
                success=True,
                intent="cooking_command",
                data={"command": data},
                response_text=f"Ejecutando comando: {data}"
            )

        else:
            # Pregunta para el LLM
            response_text, error_type = await voice_server.llm.get_response(request.text)

            if error_type:
                return CommandResponse(
                    success=False,
                    intent="question",
                    response_text=response_text,
                    error=response_text,
                    error_type=error_type
                )
            else:
                # Verificar si el asistente está haciendo una pregunta
                if is_assistant_asking_question(response_text):
                    voice_server.activate_conversation_mode()

                return CommandResponse(
                    success=True,
                    intent="question",
                    response_text=response_text
                )

    except Exception as e:
        return CommandResponse(
            success=False,
            intent=intent,
            error=str(e),
            error_type="server_error"
        )


@app.post("/api/context")
async def update_context(update: ContextUpdate):
    """
    Actualiza el contexto de la cocina.

    Args:
        update: Nuevo contexto

    Returns:
        Confirmación de actualización
    """
    global voice_server

    if not voice_server:
        raise HTTPException(status_code=503, detail="Servidor de voz no inicializado")

    voice_server.llm.update_context(update.context)

    return {
        "success": True,
        "message": "Contexto actualizado",
        "context": update.context
    }


@app.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    """Endpoint WebSocket para compatibilidad con cliente web existente."""
    await websocket.accept()
    connected_clients.add(websocket)
    print(f"[WS] Cliente conectado. Total: {len(connected_clients)}")

    try:
        await websocket.send_json({
            "type": "connected",
            "message": "Conectado al servidor de voz Rem-E"
        })

        while True:
            data = await websocket.receive_json()

            if data.get("type") == "ping":
                await websocket.send_json({"type": "pong"})

            elif data.get("type") == "update_context":
                if voice_server and voice_server.llm:
                    context = data.get("context", {})
                    voice_server.llm.update_context(context)
                    print(f"[Context] Actualizado: {context}")

            elif data.get("type") == "function_response":
                request_id = data.get("request_id")
                result = data.get("result", {})

                if request_id and request_id in pending_function_responses:
                    future = pending_function_responses[request_id]
                    if not future.done():
                        future.set_result(result)

    except WebSocketDisconnect:
        pass
    finally:
        connected_clients.discard(websocket)
        print(f"[WS] Cliente desconectado. Total: {len(connected_clients)}")


# ==================== Inicialización del servidor ====================

async def broadcast(message: dict):
    """Envía mensaje a todos los clientes WebSocket conectados."""
    if connected_clients:
        message_str = json.dumps(message)
        await asyncio.gather(
            *[client.send_text(message_str) for client in connected_clients],
            return_exceptions=True
        )


@app.on_event("startup")
async def startup_event():
    """Inicializa el servidor de voz al arrancar la API."""
    global voice_server

    print("\n" + "="*50)
    print("   REM-E VOICE API SERVER")
    print("   Servidor de Voz con API REST + WebSocket")
    print("="*50)

    # Buscar modelo disponible
    available_models = []
    for key, info in VOSK_MODELS.items():
        if os.path.exists(info["path"]):
            available_models.append(key)
            print(f"✓ Modelo encontrado: {info['name']}")

    if not available_models:
        print("\n⚠️  ADVERTENCIA: No hay modelos Vosk disponibles")
        print("   El servidor arrancará pero el reconocimiento de voz no funcionará")
        print("   Descarga un modelo de: https://alphacephei.com/vosk/models")
        return

    # Usar el primer modelo disponible
    model_key = available_models[0]
    voice_server = VoiceServer(model_key)

    # Inicializar
    if voice_server.initialize():
        print(f"\n✓ Servidor de voz inicializado con modelo: {model_key}")
        print(f"✓ LM Studio: {LM_STUDIO_URL}")

        # Iniciar loop de escucha en background
        asyncio.create_task(voice_server.listen_loop())
    else:
        print("\n⚠️  Error al inicializar el servidor de voz")
        voice_server = None


@app.on_event("shutdown")
async def shutdown_event():
    """Limpia recursos al apagar el servidor."""
    global voice_server
    if voice_server:
        voice_server.cleanup()
        print("\n✓ Servidor de voz detenido")


# ==================== Punto de entrada ====================

def start_server(host: str = "0.0.0.0", port: int = 8765):
    """
    Inicia el servidor API.

    Args:
        host: Host donde escuchar (0.0.0.0 = todas las interfaces)
        port: Puerto donde escuchar
    """
    print(f"\n🚀 Iniciando Rem-E Voice API Server")
    print(f"   Host: {host}")
    print(f"   Port: {port}")
    print(f"\n📡 API disponible en: http://{host}:{port}")
    print(f"   Docs: http://{host}:{port}/docs")
    print(f"   WebSocket: ws://{host}:{port}/ws")
    print(f"\nPresiona Ctrl+C para detener\n")

    uvicorn.run(
        app,
        host=host,
        port=port,
        log_level="info"
    )


if __name__ == "__main__":
    import sys

    # Permitir especificar puerto desde línea de comandos
    port = 8765
    if len(sys.argv) > 1:
        try:
            port = int(sys.argv[1])
        except ValueError:
            print(f"Puerto inválido: {sys.argv[1]}, usando 8765")

    start_server(port=port)
