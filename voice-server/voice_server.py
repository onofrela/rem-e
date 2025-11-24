"""
Servidor WebSocket para reconocimiento de voz con Vosk para Rem-E.
Escucha el micrófono, clasifica comandos vs preguntas,
y responde usando LM Studio para consultas de cocina.

ARQUITECTURA BIDIRECCIONAL:
- Las funciones del LLM se ejecutan en el CLIENTE (navegador)
- El servidor envía solicitudes de función al cliente via WebSocket
- El cliente ejecuta las funciones (tiene acceso a IndexedDB)
- El cliente envía los resultados de vuelta al servidor
"""

import asyncio
import json
import os
import uuid
import pyaudio
import requests
from vosk import Model, KaldiRecognizer
import websockets
from config import (
    VOSK_MODELS, SAMPLE_RATE, WAKE_WORD, LM_STUDIO_URL,
    SYSTEM_PROMPT, NAVIGATION_SECTIONS, NAVIGATION_VERBS,
    CONVERSATION_TIMEOUT
)

# Clientes WebSocket conectados
connected_clients = set()

# Almacén de respuestas de funciones pendientes
pending_function_responses: dict[str, asyncio.Future] = {}


def classify_intent(text: str) -> tuple[str, str | None]:
    """
    Clasifica si el texto es un comando de navegación o una pregunta.
    Returns: ("navigation" | "question", route | None)
    """
    lower_text = text.lower().strip()

    # Verificar si tiene verbo de navegación
    has_nav_verb = any(verb in lower_text for verb in NAVIGATION_VERBS)

    # Palabras que indican pregunta (no navegación)
    question_indicators = [
        "qué", "que", "cuánto", "cuanto", "cuánta", "cuanta",
        "cuántos", "cuantos", "cuántas", "cuantas",
        "cómo", "como", "dónde", "donde", "por qué", "porque",
        "tengo", "hay", "puedo", "necesito", "falta", "busca",
        "buscar", "encuentra", "encontrar", "dame", "dime"
    ]
    is_question = any(q in lower_text for q in question_indicators)

    # Si es claramente una pregunta, no es navegación
    # EXCEPTO si tiene verbo de navegación explícito
    if is_question and not has_nav_verb:
        return ("question", None)

    # Buscar sección específica
    for section_name, route in NAVIGATION_SECTIONS.items():
        if section_name in lower_text:
            # Si tiene verbo de navegación, es navegación segura
            if has_nav_verb:
                return ("navigation", route)
            # Si es un comando muy corto (1-4 palabras), probablemente es navegación
            if len(lower_text.split()) <= 4:
                return ("navigation", route)

    # Todo lo demás es pregunta
    return ("question", None)


def is_assistant_asking_question(text: str) -> bool:
    """
    Detecta si la respuesta del asistente contiene una pregunta al usuario.
    Esto activará el modo de conversación continua.
    """
    if not text:
        return False

    lower_text = text.lower().strip()

    # Patrones de pregunta muy comunes en español
    question_patterns = [
        "¿", "?",  # Signos de interrogación
        "dónde", "donde",
        "cuántos", "cuantos", "cuántas", "cuantas",
        "cuál", "cual", "cuáles", "cuales",
        "qué tipo", "que tipo",
        "qué ubicación", "que ubicación",
    ]

    # Si contiene signos de interrogación o palabras interrogativas
    return any(pattern in lower_text for pattern in question_patterns)


# Definiciones de funciones para LM Studio
FUNCTION_DEFINITIONS = [
    {
        "type": "function",
        "function": {
            "name": "getInventory",
            "description": "Obtiene el inventario completo del usuario con todos los ingredientes, cantidades y ubicaciones (Refrigerador, Congelador, Alacena, etc.)",
            "parameters": {
                "type": "object",
                "properties": {
                    "location": {
                        "type": "string",
                        "enum": ["Refrigerador", "Congelador", "Alacena"],
                        "description": "Filtrar por ubicación de almacenamiento (opcional)"
                    }
                },
                "required": []
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "searchInventoryByName",
            "description": "Busca un ingrediente específico en el inventario del usuario por nombre. Devuelve la cantidad disponible y en qué ubicación está.",
            "parameters": {
                "type": "object",
                "properties": {
                    "ingredientName": {
                        "type": "string",
                        "description": "Nombre del ingrediente a buscar (ej: cebolla, tomate, pollo)"
                    }
                },
                "required": ["ingredientName"]
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "searchIngredients",
            "description": "Busca ingredientes en el catálogo por nombre o categoría",
            "parameters": {
                "type": "object",
                "properties": {
                    "query": {
                        "type": "string",
                        "description": "Término de búsqueda"
                    },
                    "category": {
                        "type": "string",
                        "description": "Categoría de ingrediente"
                    }
                },
                "required": ["query"]
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "searchRecipes",
            "description": "Busca recetas por nombre o descripción",
            "parameters": {
                "type": "object",
                "properties": {
                    "query": {
                        "type": "string",
                        "description": "Término de búsqueda"
                    }
                },
                "required": ["query"]
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "getRecipesByIngredients",
            "description": "Encuentra recetas que se pueden hacer con los ingredientes dados",
            "parameters": {
                "type": "object",
                "properties": {
                    "ingredientIds": {
                        "type": "array",
                        "items": {"type": "string"},
                        "description": "Lista de IDs de ingredientes disponibles"
                    },
                    "maxMissingIngredients": {
                        "type": "integer",
                        "description": "Máximo de ingredientes faltantes permitidos"
                    }
                },
                "required": ["ingredientIds"]
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "getInventorySummary",
            "description": "Obtiene un resumen del inventario: total de items, por ubicación, alertas",
            "parameters": {
                "type": "object",
                "properties": {},
                "required": []
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "getInventoryAlerts",
            "description": "Obtiene alertas del inventario: productos caducados, próximos a caducar, bajo stock",
            "parameters": {
                "type": "object",
                "properties": {},
                "required": []
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "getRecipeDetails",
            "description": "Obtiene los detalles completos de una receta incluyendo ingredientes y pasos",
            "parameters": {
                "type": "object",
                "properties": {
                    "recipeId": {
                        "type": "string",
                        "description": "ID de la receta"
                    }
                },
                "required": ["recipeId"]
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "checkRecipeIngredients",
            "description": "Verifica si el usuario tiene los ingredientes necesarios para una receta",
            "parameters": {
                "type": "object",
                "properties": {
                    "recipeId": {
                        "type": "string",
                        "description": "ID de la receta a verificar"
                    }
                },
                "required": ["recipeId"]
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "addToInventory",
            "description": "Agrega un ingrediente al inventario del usuario. IMPORTANTE: Antes de llamar esta función, asegúrate de tener el ingredientId (búscalo primero con searchIngredients), la cantidad, la unidad y la ubicación. Si falta la ubicación, pregunta al usuario '¿Dónde?' antes de llamar esta función. NO llames esta función sin location.",
            "parameters": {
                "type": "object",
                "properties": {
                    "ingredientId": {
                        "type": "string",
                        "description": "ID del ingrediente a agregar (búscalo con searchIngredients primero)"
                    },
                    "quantity": {
                        "type": "number",
                        "description": "Cantidad del ingrediente. Si el usuario dice 'tres tomates', usa 3. Si no especifica cantidad, usa 1."
                    },
                    "unit": {
                        "type": "string",
                        "description": "Unidad de medida. Por defecto usa 'piezas' si el usuario no especifica. Otras opciones: g, kg, ml, L, etc."
                    },
                    "location": {
                        "type": "string",
                        "enum": ["Refrigerador", "Congelador", "Alacena"],
                        "description": "Dónde se almacenará. DEBE ser uno de estos valores EXACTOS: 'Refrigerador', 'Congelador', o 'Alacena'. REQUERIDO: Si el usuario no lo menciona, pregunta '¿Dónde?' y espera su respuesta antes de llamar esta función."
                    },
                    "expirationDate": {
                        "type": "string",
                        "description": "Fecha de caducidad en formato ISO (YYYY-MM-DD). OPCIONAL: Solo pregunta si el usuario lo menciona. NO lo pidas por defecto."
                    },
                    "brand": {
                        "type": "string",
                        "description": "Marca del producto (opcional)"
                    },
                    "notes": {
                        "type": "string",
                        "description": "Notas adicionales (opcional)"
                    }
                },
                "required": ["ingredientId", "quantity", "unit", "location"]
            }
        }
    }
]


class LLMClient:
    """Cliente para comunicarse con LM Studio con function calling via cliente."""

    def __init__(self, voice_server: 'VoiceServer'):
        self.voice_server = voice_server
        self.lm_studio_url = LM_STUDIO_URL
        self.conversation_history = []
        self.kitchen_context = {
            "inventory": [],
            "recipes": [],
            "current_page": "/",
            "pending_ingredient": None,  # Para guardar ingrediente buscado
            "pending_quantity": 1,
            "pending_unit": "piezas",
            "pending_location": None  # Para guardar ubicación detectada
        }

    def update_context(self, context: dict):
        """Actualiza el contexto de la cocina."""
        self.kitchen_context.update(context)

    def _parse_json_response(self, text: str) -> dict | None:
        """
        Intenta extraer y parsear JSON de la respuesta del LLM.
        Retorna dict con estructura de acción o None si no es JSON.
        """
        import re

        # Limpiar el texto
        text = text.strip()

        # Si empieza con { y termina con }, probablemente es JSON puro
        if text.startswith('{') and text.endswith('}'):
            try:
                data = json.loads(text)
                if "action" in data and "params" in data:
                    print(f"[PARSER] JSON puro detectado")
                    return data
            except json.JSONDecodeError as e:
                print(f"[PARSER] Error parseando JSON puro: {e}")

        # Buscar JSON embebido en texto
        # Patrón más flexible que captura todo entre { y el último }
        json_pattern = r'\{[^{}]*(?:\{[^{}]*\}[^{}]*)*\}'

        matches = re.findall(json_pattern, text, re.DOTALL)

        print(f"[PARSER] Encontrados {len(matches)} posibles JSONs")

        for i, match in enumerate(matches):
            try:
                print(f"[PARSER] Intentando parsear match {i+1}: {match[:100]}...")
                data = json.loads(match)
                if "action" in data and "params" in data:
                    print(f"[PARSER] ✅ JSON válido encontrado")
                    return data
            except json.JSONDecodeError as e:
                print(f"[PARSER] ❌ Error en match {i+1}: {e}")
                continue

        print(f"[PARSER] No se encontró JSON válido")
        return None

    async def _handle_action(self, action_data: dict) -> tuple[str, str | None]:
        """
        Ejecuta la acción especificada en el JSON parseado.
        """
        action = action_data.get("action")
        params = action_data.get("params", {})
        user_message = action_data.get("user_message", "")
        needs_info = action_data.get("needs_info")

        print(f"[ACTION] Ejecutando: {action} con params: {params}")

        # =====================================================================
        # MANEJO DE searchIngredients
        # =====================================================================
        if action == "searchIngredients":
            # Ejecutar búsqueda de ingrediente
            result = await self._execute_function_on_client(action, params)
            print(f"[ACTION] Resultado de búsqueda: {result}")

            if result.get("success") and result.get("data"):
                ingredients = result["data"]
                if ingredients and len(ingredients) > 0:
                    # Guardar el primer ingrediente encontrado con ID REAL
                    first_ing = ingredients[0]
                    self.kitchen_context["pending_ingredient"] = {
                        "id": first_ing["id"],  # ID REAL de la base de datos
                        "name": first_ing["name"]
                    }

                    # La cantidad ya fue extraída en get_response() del mensaje del usuario
                    # NO extraerla del query de búsqueda (que solo contiene el nombre del ingrediente)
                    quantity = self.kitchen_context.get("pending_quantity", 1)

                    print(f"[ACTION] ✅ Ingrediente encontrado y guardado:")
                    print(f"         ID: {first_ing['id']}")
                    print(f"         Nombre: {first_ing['name']}")
                    print(f"         Cantidad: {quantity}")

                    # Verificar si ya tenemos ubicación
                    has_location = self.kitchen_context.get("pending_location")

                    if has_location:
                        print(f"[ACTION] ✅ Ya tenemos ubicación: {has_location}")
                        print(f"[ACTION] 🚀 Agregando al inventario...")

                        # Agregar al inventario con el ID REAL
                        add_params = {
                            "ingredientId": first_ing["id"],  # ID REAL
                            "quantity": quantity,
                            "unit": "piezas",
                            "location": has_location
                        }

                        add_result = await self._execute_function_on_client("addToInventory", add_params)
                        print(f"[ACTION] Resultado de addToInventory: {add_result}")

                        if add_result.get("success"):
                            # Limpiar contexto
                            self.kitchen_context["pending_ingredient"] = None
                            self.kitchen_context["pending_location"] = None
                            self.kitchen_context["pending_quantity"] = 1
                            self.kitchen_context["pending_unit"] = "piezas"

                            # Mensaje de confirmación en español
                            # Las ubicaciones ya vienen en español de la DB
                            loc_name = has_location.lower()  # "Alacena" → "alacena"
                            confirmation = f"Listo, {quantity} {first_ing['name']} en {loc_name}"

                            self.conversation_history.append({
                                "role": "assistant",
                                "content": confirmation
                            })
                            return (confirmation, None)
                        else:
                            error_msg = f"Error al agregar: {add_result.get('error', 'Error desconocido')}"
                            return (error_msg, "function_error")
                    else:
                        # No tenemos ubicación, preguntar
                        print(f"[ACTION] ❓ Falta ubicación, preguntando al usuario")
                        pregunta = "¿Dónde?"
                        self.conversation_history.append({
                            "role": "assistant",
                            "content": pregunta
                        })
                        return (pregunta, None)
                else:
                    # No se encontró el ingrediente
                    error_msg = f"No encontré '{params.get('query')}' en la base de datos"
                    return (error_msg, "function_error")
            else:
                # Error en la búsqueda
                error_msg = result.get("error", "Error buscando ingrediente")
                return (error_msg, "function_error")

        # =====================================================================
        # MANEJO DE RESPUESTA DE UBICACIÓN (cuando el usuario responde)
        # =====================================================================
        # Si el usuario está respondiendo con ubicación y tenemos ingrediente pendiente
        if self.kitchen_context.get("pending_ingredient") and self.kitchen_context.get("pending_location"):
            print(f"[ACTION] ✅ Usuario dio ubicación: {self.kitchen_context['pending_location']}")
            print(f"[ACTION] 🚀 Agregando ingrediente pendiente...")

            ingredient = self.kitchen_context["pending_ingredient"]
            add_params = {
                "ingredientId": ingredient["id"],  # ID REAL
                "quantity": self.kitchen_context.get("pending_quantity", 1),
                "unit": "piezas",
                "location": self.kitchen_context["pending_location"]
            }

            add_result = await self._execute_function_on_client("addToInventory", add_params)
            print(f"[ACTION] Resultado de addToInventory: {add_result}")

            if add_result.get("success"):
                # Limpiar contexto
                quantity = self.kitchen_context["pending_quantity"]
                location = self.kitchen_context["pending_location"]

                self.kitchen_context["pending_ingredient"] = None
                self.kitchen_context["pending_location"] = None
                self.kitchen_context["pending_quantity"] = 1
                self.kitchen_context["pending_unit"] = "piezas"

                # Mensaje de confirmación
                # Las ubicaciones ya vienen en español de la DB
                loc_name = location.lower()  # "Alacena" → "alacena"
                confirmation = f"Listo, {quantity} {ingredient['name']} en {loc_name}"

                self.conversation_history.append({
                    "role": "assistant",
                    "content": confirmation
                })
                return (confirmation, None)
            else:
                error_msg = f"Error al agregar: {add_result.get('error', 'Error desconocido')}"
                return (error_msg, "function_error")

        # =====================================================================
        # MANEJO DE OTRAS ACCIONES (getInventory, searchRecipes, etc.)
        # =====================================================================
        try:
            result = await self._execute_function_on_client(action, params)
            print(f"[ACTION] Resultado: {result}")

            # Verificar si la función fue exitosa
            if result.get("success"):
                # Extraer datos relevantes del resultado
                data = result.get('data', {})

                # Formatear el resultado de forma legible para el LLM
                if action == "getInventory":
                    items = data.get('items', [])
                    if items:
                        # Crear mensaje con los items encontrados
                        result_summary = f"Encontré {len(items)} ingrediente(s) en el inventario:\n"
                        for item in items:
                            name = item.get('name', 'Desconocido')
                            quantity = item.get('quantity', 0)
                            unit = item.get('unit', '')
                            location = item.get('location', '')
                            result_summary += f"- {quantity} {unit} de {name} en {location}\n"
                    else:
                        result_summary = "No encontré ningún ingrediente en el inventario con esos criterios."
                else:
                    # Para otras acciones, usar JSON simplificado
                    result_summary = f"Resultado de {action}: {json.dumps(data, ensure_ascii=False)}"

                # Crear un mensaje del sistema que pida al LLM formular una respuesta natural
                system_content = f"""Eres Rem-E, un asistente de cocina amigable.

RESULTADO DE LA FUNCIÓN:
{result_summary}

INSTRUCCIONES IMPORTANTES:
1. Responde SOLO con texto natural en español, NUNCA con JSON
2. Usa segunda persona (tú/tienes/puedes), NO primera persona (yo/tengo)
3. Sé conciso: máximo 2 oraciones cortas
4. Basa tu respuesta SOLO en el resultado mostrado arriba
5. NO inventes información que no esté en el resultado

Ejemplo CORRECTO: "Tienes 3 tomates en la alacena"
Ejemplo INCORRECTO: {{"action": "...", "user_message": "..."}}
Ejemplo INCORRECTO: "Tengo 3 tomates en la alacena"

Ahora responde la pregunta del usuario basándote en el resultado:"""

                # Construir mensajes con el contexto del usuario original
                messages = [
                    {"role": "system", "content": system_content},
                    {"role": "user", "content": self.conversation_history[-1]["content"]}  # Pregunta original del usuario
                ]

                print(f"[LLM] Solicitando respuesta final al LLM...")
                print(f"[LLM] Resumen del resultado: {result_summary[:200]}...")

                # Llamar al LLM para generar respuesta final
                response = await self._call_lm_studio(messages, use_tools=False)
                final_response = response["choices"][0]["message"].get("content", "").strip()

                print(f"[LLM] Respuesta final generada: {final_response}")

                self.conversation_history.append({
                    "role": "assistant",
                    "content": final_response
                })

                return (final_response, None)
            else:
                # Error en la función
                error_msg = result.get("error", "Error desconocido")
                return (f"Error: {error_msg}", "function_error")

        except Exception as e:
            print(f"[ACTION] Error: {e}")
            import traceback
            traceback.print_exc()
            return (f"Error ejecutando {action}: {str(e)}", "function_error")

    def _extract_quantity(self, text: str) -> int:
        """Extrae cantidad numérica del texto."""
        import re

        # Buscar números en texto
        number_words = {
            "un": 1, "uno": 1, "una": 1,
            "dos": 2, "tres": 3, "cuatro": 4, "cinco": 5,
            "seis": 6, "siete": 7, "ocho": 8, "nueve": 9, "diez": 10
        }

        lower_text = text.lower()
        for word, num in number_words.items():
            if word in lower_text:
                return num

        # Buscar dígitos
        digits = re.findall(r'\d+', text)
        if digits:
            return int(digits[0])

        return 1  # Default

    def _extract_location(self, text: str) -> str | None:
        """
        Extrae ubicación del texto en español y la retorna en español (como está en la DB).
        Retorna: "Refrigerador", "Congelador", "Alacena" o None
        """
        lower_text = text.lower()

        # Mapeo de palabras en español a nombres de ubicaciones en la DB
        location_map = {
            "refrigerador": "Refrigerador",
            "refri": "Refrigerador",
            "nevera": "Refrigerador",
            "congelador": "Congelador",
            "freezer": "Congelador",
            "alacena": "Alacena",
            "despensa": "Alacena",
            "pantry": "Alacena",
        }

        for spanish_word, db_location in location_map.items():
            if spanish_word in lower_text:
                print(f"[EXTRACT] Ubicación detectada: '{spanish_word}' → '{db_location}'")
                return db_location

        return None

    async def get_response(self, user_message: str) -> tuple[str, str | None]:
        """
        Envía mensaje a LM Studio y parsea respuesta JSON manualmente.
        Returns: (response_text, error_type) - error_type es None si no hay error
        """
        print(f"[LLM] Procesando: {user_message}")

        # Extraer información del comando del usuario
        detected_location = self._extract_location(user_message)
        detected_quantity = self._extract_quantity(user_message)

        # Si detectamos ubicación, guardarla
        if detected_location:
            self.kitchen_context["pending_location"] = detected_location
            print(f"[CONTEXT] Ubicación guardada: {detected_location}")

        # Si detectamos cantidad, guardarla
        if detected_quantity > 1:  # Solo si es diferente del default
            self.kitchen_context["pending_quantity"] = detected_quantity
            print(f"[CONTEXT] Cantidad guardada: {detected_quantity}")

        # Agregar mensaje del usuario al historial
        self.conversation_history.append({
            "role": "user",
            "content": user_message
        })

        # Construir sistema prompt con contexto
        context_info = ""
        if self.kitchen_context.get("pending_ingredient"):
            context_info += f"\nIngrediente pendiente: {self.kitchen_context['pending_ingredient']}"
            context_info += f"\nCantidad: {self.kitchen_context['pending_quantity']}"
            context_info += f"\nUnidad: {self.kitchen_context['pending_unit']}"

        if self.kitchen_context.get("pending_location"):
            context_info += f"\nUbicación especificada: {self.kitchen_context['pending_location']}"
            context_info += f"\nNO PREGUNTES por la ubicación, ya la tenemos."

        system_content = SYSTEM_PROMPT + context_info

        messages = [
            {"role": "system", "content": system_content}
        ] + self.conversation_history[-10:]  # Últimos 10 mensajes

        try:
            # Llamar a LM Studio SIN tools (modo texto plano)
            response = await self._call_lm_studio(messages, use_tools=False)
            assistant_message = response["choices"][0]["message"]
            llm_response = assistant_message.get("content", "")

            print(f"[LLM] Respuesta raw: {llm_response}")

            # Intentar parsear JSON
            action_data = self._parse_json_response(llm_response)

            if action_data:
                print(f"[PARSER] JSON detectado - Action: {action_data['action']}")
                return await self._handle_action(action_data)
            else:
                # Respuesta de texto normal (conversación)
                print(f"[PARSER] Respuesta de texto normal")
                self.conversation_history.append({
                    "role": "assistant",
                    "content": llm_response
                })
                return (llm_response, None)

        except requests.exceptions.ConnectionError:
            print("[LLM] Error: No se puede conectar a LM Studio")
            return ("No puedo conectar con LM Studio.", "lm_studio")
        except requests.exceptions.Timeout:
            print("[LLM] Error: Timeout")
            return ("LM Studio tardó demasiado en responder.", "lm_studio")
        except Exception as e:
            print(f"[LLM] Error: {e}")
            import traceback
            traceback.print_exc()
            return (f"Error procesando la solicitud: {str(e)}", "unknown")

    async def _call_lm_studio(self, messages: list, use_tools: bool = False) -> dict:
        """Llama a LM Studio API en modo texto plano."""
        payload = {
            "messages": messages,
            "temperature": 0.7,
            "max_tokens": 800,
            "stream": False
        }

        print(f"[DEBUG] Enviando mensaje a LM Studio (modo texto)")
        print(f"[DEBUG] Último mensaje: {messages[-1]['content'][:100] if messages else 'N/A'}")

        loop = asyncio.get_event_loop()
        response = await loop.run_in_executor(
            None,
            lambda: requests.post(
                self.lm_studio_url,
                json=payload,
                headers={"Content-Type": "application/json"},
                timeout=60
            )
        )
        response.raise_for_status()
        return response.json()

    async def _execute_function_on_client(self, function_name: str, args: dict) -> dict:
        """
        Envía solicitud de función al cliente y espera respuesta.
        """
        if not connected_clients:
            return {"success": False, "error": "No hay clientes conectados"}

        request_id = str(uuid.uuid4())

        # Crear Future para esperar respuesta
        future = asyncio.get_event_loop().create_future()
        pending_function_responses[request_id] = future

        # Enviar solicitud al cliente
        message = {
            "type": "function_request",
            "request_id": request_id,
            "function_name": function_name,
            "args": args
        }

        await self.voice_server.broadcast(message)

        try:
            # Esperar respuesta con timeout de 30 segundos
            result = await asyncio.wait_for(future, timeout=30.0)
            return result
        except asyncio.TimeoutError:
            return {"success": False, "error": f"Timeout esperando respuesta de {function_name}"}
        finally:
            pending_function_responses.pop(request_id, None)


class VoiceServer:
    def __init__(self, model_key: str = "small"):
        self.model_key = model_key
        self.model_path = VOSK_MODELS[model_key]["path"]
        self.wake_word = WAKE_WORD.lower()
        self.model = None
        self.recognizer = None
        self.audio = None
        self.stream = None
        self.running = False
        self.llm = LLMClient(self)  # Pasar referencia al servidor

        # Estado de conversación continua
        self.conversation_active = False  # Si está en modo conversación continua
        self.last_activity_time = None  # Timestamp de última actividad
        self.conversation_timeout = CONVERSATION_TIMEOUT  # Segundos de timeout

    def initialize(self) -> bool:
        """Inicializa Vosk y PyAudio."""
        if not os.path.exists(self.model_path):
            print(f"Error: No se encontró el modelo en '{self.model_path}'")
            print(f"Descarga el modelo desde: https://alphacephei.com/vosk/models")
            return False

        try:
            print(f"Cargando modelo de Vosk ({VOSK_MODELS[self.model_key]['name']})...")
            self.model = Model(self.model_path)
            self.recognizer = KaldiRecognizer(self.model, SAMPLE_RATE)

            self.audio = pyaudio.PyAudio()
            self.stream = self.audio.open(
                format=pyaudio.paInt16,
                channels=1,
                rate=SAMPLE_RATE,
                input=True,
                frames_per_buffer=8000
            )
            self.stream.start_stream()
            print("Sistema de audio inicializado.")
            return True
        except Exception as e:
            print(f"Error al inicializar: {e}")
            return False

    def activate_conversation_mode(self):
        """Activa el modo de conversación continua."""
        import time
        self.conversation_active = True
        self.last_activity_time = time.time()
        print("[Conversación Continua] ACTIVADA - No se requiere wake word")

    def deactivate_conversation_mode(self):
        """Desactiva el modo de conversación continua."""
        self.conversation_active = False
        self.last_activity_time = None
        print("[Conversación Continua] DESACTIVADA - Se requiere wake word")

    def check_conversation_timeout(self) -> bool:
        """Verifica si la conversación ha expirado por inactividad."""
        import time
        if not self.conversation_active or self.last_activity_time is None:
            return False

        elapsed = time.time() - self.last_activity_time
        if elapsed > self.conversation_timeout:
            print(f"[Timeout] Conversación expirada ({elapsed:.1f}s de inactividad)")
            self.deactivate_conversation_mode()
            return True
        return False

    def update_activity(self):
        """Actualiza el timestamp de última actividad."""
        import time
        if self.conversation_active:
            self.last_activity_time = time.time()

    async def broadcast(self, message: dict):
        """Envía mensaje a todos los clientes conectados."""
        if connected_clients:
            message_str = json.dumps(message)
            print(f"[WS] Enviando: {message}")
            await asyncio.gather(
                *[client.send(message_str) for client in connected_clients],
                return_exceptions=True
            )
        else:
            print("[WS] No hay clientes conectados")

    async def process_command(self, command: str):
        """Procesa el comando: navegar o consultar LLM."""
        intent, route = classify_intent(command)
        print(f"[Intent]: {intent} -> '{command}' (route: {route})")

        if intent == "navigation" and route:
            print(f"[NAV] Enviando comando de navegación: {route}")
            await self.broadcast({
                "type": "navigation",
                "command": command,
                "route": route
            })
            # Desactivar conversación continua después de navegación
            if self.conversation_active:
                self.deactivate_conversation_mode()
        else:
            print(f"[LLM] Procesando pregunta: {command}")
            await self.broadcast({
                "type": "thinking",
                "message": "Pensando..."
            })

            # Llamar al LLM (ahora es async)
            response, error_type = await self.llm.get_response(command)

            print(f"[Rem-E]: {response}")

            # Si hay error, enviar mensaje de error específico
            if error_type:
                print(f"[Error]: Tipo={error_type}")
                await self.broadcast({
                    "type": "error",
                    "error_type": error_type,
                    "error_message": response
                })
                # Desactivar conversación continua en caso de error
                if self.conversation_active:
                    self.deactivate_conversation_mode()
            else:
                await self.broadcast({
                    "type": "llm_response",
                    "question": command,
                    "response": response
                })

                # Detectar si el asistente está haciendo una pregunta
                if is_assistant_asking_question(response):
                    print("[Conversación] Asistente hizo una pregunta - activando modo continuo")
                    self.activate_conversation_mode()
                    await self.broadcast({
                        "type": "conversation_active",
                        "message": "Modo conversación activa - responde sin wake word"
                    })
                else:
                    # Si no hay pregunta, desactivar conversación continua
                    if self.conversation_active:
                        self.deactivate_conversation_mode()
                        await self.broadcast({
                            "type": "conversation_inactive",
                            "message": "Conversación finalizada"
                        })

    async def listen_loop(self):
        """Loop principal de escucha."""
        self.running = True
        print(f"\n{'='*50}")
        print(f"Escuchando... Di '{self.wake_word.upper()}' + comando o pregunta")
        print(f"{'='*50}\n")

        while self.running:
            try:
                # Verificar timeout de conversación
                self.check_conversation_timeout()

                data = self.stream.read(4000, exception_on_overflow=False)

                if self.recognizer.AcceptWaveform(data):
                    result = json.loads(self.recognizer.Result())
                    text = result.get("text", "").strip()

                    if text:
                        print(f"\n[Escuchado]: '{text}'")

                        # SI ESTÁ EN MODO CONVERSACIÓN CONTINUA, procesar directamente sin wake word
                        if self.conversation_active:
                            print(f"[Conversación Continua] Procesando respuesta del usuario: '{text}'")
                            self.update_activity()  # Actualizar timestamp de actividad
                            await self.broadcast({
                                "type": "transcript",
                                "text": text
                            })
                            await self.process_command(text)
                        # Si NO está en modo continuo, verificar wake word
                        elif self.wake_word in text.lower():
                            print(f"[Wake Word] Detectado '{self.wake_word}'")

                            # Extraer comando
                            parts = text.lower().split(self.wake_word, 1)
                            command = parts[1].strip() if len(parts) > 1 else ""

                            await self.broadcast({
                                "type": "wake_word_detected",
                                "text": text,
                                "command": command
                            })

                            if not command:
                                print("[Esperando comando adicional...]")
                                command = await self.listen_for_command()

                            if command:
                                print(f"[Comando final]: '{command}'")
                                await self.process_command(command)
                            else:
                                print("[No se recibió comando]")
                else:
                    # Resultado parcial (mientras habla)
                    partial = json.loads(self.recognizer.PartialResult())
                    partial_text = partial.get("partial", "")
                    if partial_text:
                        await self.broadcast({
                            "type": "partial",
                            "text": partial_text
                        })

                await asyncio.sleep(0.01)

            except Exception as e:
                print(f"Error en loop: {e}")
                await asyncio.sleep(0.1)

    async def listen_for_command(self) -> str:
        """Escucha el comando después del wake word."""
        accumulated_text = ""
        silence_count = 0
        max_silence = 5

        print("[Escuchando comando...]")

        while silence_count < max_silence:
            try:
                data = self.stream.read(4000, exception_on_overflow=False)

                if self.recognizer.AcceptWaveform(data):
                    result = json.loads(self.recognizer.Result())
                    text = result.get("text", "").strip()

                    if text:
                        print(f"[Comando parcial]: '{text}'")
                        accumulated_text += " " + text
                        silence_count = 0
                    else:
                        silence_count += 1

                await asyncio.sleep(0.01)
            except Exception:
                break

        return accumulated_text.strip()

    def cleanup(self):
        """Libera recursos."""
        self.running = False
        if self.stream:
            self.stream.stop_stream()
            self.stream.close()
        if self.audio:
            self.audio.terminate()


voice_server = None


async def handle_client(websocket):
    """Maneja conexiones WebSocket."""
    connected_clients.add(websocket)
    print(f"[WS] Cliente conectado. Total: {len(connected_clients)}")

    try:
        await websocket.send(json.dumps({
            "type": "connected",
            "message": "Conectado al servidor de voz Rem-E"
        }))

        async for message in websocket:
            data = json.loads(message)

            if data.get("type") == "ping":
                await websocket.send(json.dumps({"type": "pong"}))

            elif data.get("type") == "update_context":
                # Actualizar contexto desde el frontend
                if voice_server and voice_server.llm:
                    voice_server.llm.update_context(data.get("context", {}))
                    print(f"[Context] Actualizado: {data.get('context', {})}")

            elif data.get("type") == "function_response":
                # Respuesta de función del cliente
                request_id = data.get("request_id")
                result = data.get("result", {})

                print(f"[WS] Respuesta de función recibida: {request_id}")

                if request_id and request_id in pending_function_responses:
                    future = pending_function_responses[request_id]
                    if not future.done():
                        future.set_result(result)

    except websockets.exceptions.ConnectionClosed:
        pass
    finally:
        connected_clients.discard(websocket)
        print(f"[WS] Cliente desconectado. Total: {len(connected_clients)}")


async def main():
    global voice_server

    print("=" * 50)
    print("   REM-E VOICE SERVER")
    print("   Servidor de Voz para Asistente de Cocina")
    print("   (Modo: Function Calling via Cliente)")
    print("=" * 50)

    # Seleccionar modelo
    print("\nModelos disponibles:")
    available = []
    for key, info in VOSK_MODELS.items():
        exists = os.path.exists(info["path"])
        status = "✓" if exists else "✗"
        print(f"  [{key}] {info['name']} {status}")
        if exists:
            available.append(key)

    if not available:
        print("\nNo hay modelos descargados.")
        print("Descarga un modelo de: https://alphacephei.com/vosk/models")
        print("Colócalo en la carpeta 'models/'")
        return

    model_key = input(f"\nSelecciona modelo ({'/'.join(available)}): ").strip().lower()
    if model_key not in available:
        model_key = available[0]
        print(f"Usando modelo: {model_key}")

    voice_server = VoiceServer(model_key)
    if not voice_server.initialize():
        return

    print("\nIniciando servidor WebSocket en ws://localhost:8765")
    print(f"Usando LM Studio en {LM_STUDIO_URL}")
    print("Las funciones se ejecutan en el CLIENTE (navegador)")
    print("\nAsegúrate de que:")
    print("  1. LM Studio esté corriendo en el puerto 1234")
    print("  2. Next.js esté corriendo (npm run dev)")
    print("  3. Tengas el navegador abierto en http://localhost:3000")

    async with websockets.serve(handle_client, "localhost", 8765):
        print("\n[OK] Servidor WebSocket listo.")
        print(f"\nDi '{WAKE_WORD.upper()}' seguido de tu comando o pregunta.")
        print("\nEjemplos:")
        print(f"  '{WAKE_WORD.capitalize()}, ve a recetas'")
        print(f"  '{WAKE_WORD.capitalize()}, ¿qué tengo en el inventario?'")
        print(f"  '{WAKE_WORD.capitalize()}, ¿qué puedo cocinar con pollo?'")
        print("\nPresiona Ctrl+C para salir.\n")

        try:
            await voice_server.listen_loop()
        except KeyboardInterrupt:
            pass
        finally:
            voice_server.cleanup()
            print("\nServidor detenido.")


if __name__ == "__main__":
    asyncio.run(main())
