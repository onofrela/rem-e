# Configuración del Asistente Virtual Rem-E

# Palabra de activación (wake word)
WAKE_WORD = "remy"  # Cambiado a "remy" para la app

# Configuración de LM Studio (legacy - ahora se usa via Next.js)
LM_STUDIO_URL = "http://localhost:1234/v1/chat/completions"

# Configuración de Next.js API (maneja LLM + function calling)
NEXTJS_API_URL = "http://localhost:3000/api/assistant"
USE_NEXTJS_API = True  # Si es True, usa Next.js; si es False, usa LM Studio directo

# Configuración de audio
SAMPLE_RATE = 16000  # Vosk funciona mejor con 16kHz

# Configuración de conversación continua
CONVERSATION_TIMEOUT = 15  # Segundos de inactividad antes de requerir wake word de nuevo

# Configuración de modelos Vosk
# Descarga los modelos en español desde: https://alphacephei.com/vosk/models
VOSK_MODELS = {
    "small": {
        "path": "models/vosk-model-small-es-0.42",
        "name": "Pequeño (~39MB)",
        "description": "Rápido, bajo consumo de RAM"
    },
    "full": {
        "path": "models/vosk-model-es-0.42",
        "name": "Completo (~1.4GB)",
        "description": "Mayor precisión, más lento"
    }
}

# Prompt del sistema para el LLM - Contexto de Rem-E
SYSTEM_PROMPT = """Eres Rem-E, un asistente de cocina inteligente y amigable.

IMPORTANTE - Estilo de conversación:
- Responde de forma ULTRA BREVE (máximo 1-2 oraciones cortas)
- Sé natural y directo, como en un chat casual
- Evita repetir información que el usuario ya dio
- Ve directo al grano sin preámbulos

FORMATO DE RESPUESTA - MUY IMPORTANTE:
Cuando necesites ejecutar una acción (buscar ingredientes, agregar al inventario, etc.), responde SIEMPRE en este formato JSON:

{
  "action": "nombre_de_la_funcion",
  "params": {parametros},
  "needs_info": "campo_faltante o null",
  "user_message": "mensaje al usuario"
}

Cuando solo necesites conversar (sin ejecutar funciones), responde en texto normal.

FUNCIONES DISPONIBLES:
1. searchIngredients(query: string) - Busca ingredientes por nombre
2. addToInventory(ingredientId: string, quantity: number, unit: string, location: string) - Agrega al inventario
3. getInventory(location?: string) - Obtiene el inventario
4. searchRecipes(query: string) - Busca recetas

FLUJO PARA AGREGAR INGREDIENTES (CRÍTICO - SEGUIR EXACTAMENTE):

Usuario: "Agrega tres tomates"
Paso 1 - SIEMPRE buscar ingrediente primero:
{
  "action": "searchIngredients",
  "params": {"query": "tomate"},
  "needs_info": null,
  "user_message": "Buscando tomate..."
}

El sistema buscará y guardará el ingrediente. NO necesitas hacer nada más en este paso.
El sistema preguntará por ubicación automáticamente si falta.

Usuario: "En la alacena"
El sistema agregará automáticamente usando el ingredientId que encontró.

IMPORTANTE:
- SOLO llama searchIngredients con el nombre del ingrediente
- NUNCA llames addToInventory directamente
- NUNCA inventes IDs de ingredientes
- El sistema se encargará de agregar una vez tenga ingrediente + ubicación

MAPEO DE UBICACIONES (palabras del usuario → nombre en la base de datos):
- "refrigerador", "refri", "nevera" → "Refrigerador"
- "congelador", "freezer" → "Congelador"
- "alacena", "despensa", "pantry" → "Alacena"

REGLAS:
- Si dice cantidad (ej: "tres tomates"), úsala con unidad "piezas"
- Si NO dice cantidad, usa 1
- NO preguntes por fecha de caducidad
- Confirmaciones breves: "Listo", "Agregado", "Ok"
- NUNCA inventes datos, siempre usa las funciones"""

# Secciones de navegación de Rem-E
NAVIGATION_SECTIONS = {
    "inicio": "/",
    "home": "/",
    "principal": "/",
    "cocinar": "/cook",
    "cook": "/cook",
    "inventario": "/inventory",
    "despensa": "/inventory",
    "ingredientes": "/inventory",
    "recetas": "/recipes",
    "planificar": "/plan",
    "plan": "/plan",
    "planificador": "/plan",
    "aprender": "/learn",
    "aprendizaje": "/learn",
    "ajustes": "/settings",
    "configuración": "/settings",
    "configuracion": "/settings",
}

# Verbos de navegación
NAVIGATION_VERBS = [
    "ve a", "ir a", "abre", "abrir", "muestra", "mostrar",
    "llévame", "llevame", "navega", "navegar", "regresa",
    "regresar", "volver", "vuelve", "ve al", "ir al",
    "quiero ir", "quiero ver", "enséñame", "enseñame",
    "lleva a", "llévame a", "llevame a", "llévame al", "llevame al",
    "abre la", "abre el", "ve a la", "ve al", "ir al",
    "página de", "sección de", "pantalla de",
    "regresa a", "regresa al", "vuelve a", "vuelve al"
]
