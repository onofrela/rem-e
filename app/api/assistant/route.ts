/**
 * Assistant API Route
 *
 * Handles voice assistant requests from Python voice_server.
 * Uses LM Studio with function calling for intelligent responses.
 */

import { NextRequest, NextResponse } from 'next/server';
import { LMStudioClient } from '@/lib/db/llm/client';
import { getFunctionDefinitions } from '@/lib/db/llm/functions';
import { type FunctionResult } from '@/lib/db/llm/handlers';

// =============================================================================
// TYPES
// =============================================================================

interface AssistantRequest {
  text: string;
  context?: {
    currentPage?: string;
    inventory?: string[];
    recipes?: string[];
    // Recipe Guide Context
    inRecipeGuide?: boolean;
    recipeName?: string;
    currentStep?: number;
    currentStepInstruction?: string;
    currentStepIngredients?: string[];
    currentStepTip?: string;
    currentStepWarning?: string;
    currentStepDuration?: number;
    sessionId?: string;
  };
  conversationId?: string;
  classification?: string; // NAVIGATION, INVENTORY_ACTION, APPLIANCE_ACTION, RECIPE_SEARCH, COOKING_CONTROL, GENERAL_QUESTION
  // Para el flujo híbrido donde el cliente ejecuta funciones
  toolResults?: Array<{
    tool_call_id: string;
    result: FunctionResult;
  }>;
}

type ErrorType = 'lm_studio' | 'function_error' | 'nextjs_api' | 'unknown';

interface AssistantResponse {
  success: boolean;
  response?: string; // Opcional porque podría estar esperando tool_calls
  functionsCalled?: {
    name: string;
    args: Record<string, unknown>;
    result: FunctionResult;
  }[];
  // Para el flujo híbrido: devolver tool_calls para que el cliente las ejecute
  toolCallsPending?: Array<{
    id: string;
    name: string;
    args: Record<string, unknown>;
  }>;
  conversationState?: ConversationMessage[]; // Estado de la conversación para continuar
  error?: string;
  errorType?: ErrorType;
}

// =============================================================================
// LM STUDIO CONFIGURATION
// =============================================================================

const LM_STUDIO_URL = process.env.NEXT_PUBLIC_LM_STUDIO_URL || process.env.LM_STUDIO_URL || 'http://localhost:1234';

const SYSTEM_PROMPT = `Eres Rem-E, un asistente de cocina inteligente y amigable. Tu objetivo es ayudar a los usuarios a:

1. **Gestionar su inventario**: Saber qué ingredientes tienen, cuándo caducan, y qué necesitan comprar.
2. **Gestionar su cocina**: Conocer qué electrodomésticos tienen disponibles (hornos, licuadoras, microondas, etc.).
3. **Encontrar recetas**: Sugerir recetas basadas en los ingredientes disponibles, preferencias, Y los electrodomésticos que tienen.
4. **Navegar a recetas**: Cuando el usuario pida ir a una receta específica (ej: "llévame a la receta de arroz blanco", "quiero ver la receta de pollo"), busca la receta y navega a ella.
5. **Cocinar paso a paso**: Guiar al usuario durante la preparación de recetas.
6. **Planificar comidas**: Ayudar a organizar las comidas de la semana.

**REGLA CRÍTICA DE PRIORIZACIÓN:**
1. **PRIMERO**: Identifica si el usuario quiere HACER algo (agregar, modificar, buscar datos) - USA FUNCIONES
2. **SEGUNDO**: Solo después, considera si quiere NAVEGAR a alguna sección
3. Ejemplos de ACCIONES (usar funciones):
   - "agregar ingredientes" → searchIngredients + addToInventory
   - "agrega 3 tomates" → searchIngredients + addToInventory
   - "agregar batidora a mi cocina" → searchAppliances + addApplianceToKitchen
   - "receta de arroz blanco" → searchRecipes + navigateToRecipe
   - "cuántos tomates tengo" → getInventory (busca en TODO el inventario)
   - "qué hay en el inventario" → getInventory
   - "ver inventario" → getInventory
   - "muéstrame mi inventario" → getInventory
   - "tengo manzanas" → getInventory (para buscar si tiene manzanas)
4. Ejemplos de NAVEGACIÓN simple (sin funciones):
   - "llévame a inventario" (solo navegación a la página)
   - "ve a la sección de inventario" (solo navegación a la página)
   - "abre mis recetas" (solo navegación a la página)

**Directrices de comportamiento:**
- Responde siempre en español de México.
- Sé conciso pero informativo. Las respuestas deben ser cortas para ser leídas en voz alta.
- Cuando necesites datos (inventario, recetas, ingredientes, electrodomésticos), USA LAS FUNCIONES disponibles.
- NUNCA inventes datos. Si no tienes información, usa una función para obtenerla.
- **CRÍTICO PARA CONSULTAS DE INVENTARIO:**
  - Si el usuario pregunta "qué hay en el inventario", "ver inventario", "muéstrame mi inventario" → SIEMPRE llama a getInventory primero
  - Si el usuario pregunta por un ingrediente específico (ej: "cuántos tomates tengo", "tengo manzanas") → Llama a getInventory (NO uses searchInventoryByName, getInventory es más confiable)
  - getInventory devuelve TODO el inventario. Después de llamarlo, analiza los resultados y responde según lo que encuentres
  - Si getInventory devuelve items vacíos o dice "El inventario está vacío", responde exactamente: "Tu inventario está vacío. No hay ingredientes registrados."
- Si el usuario pregunta sobre sus electrodomésticos o "mi cocina", consulta primero qué electrodomésticos tiene.
- Al sugerir recetas, considera los electrodomésticos disponibles. Por ejemplo, no sugieras recetas de horno si no tiene uno.
- Sugiere alternativas cuando falten ingredientes o electrodomésticos.

**Para acciones de inventario (agregar, modificar):**
- FLUJO OBLIGATORIO:
  1. **PRIMERO**: SIEMPRE llama a searchIngredients para verificar que existe y obtener ingredientId
  2. **DESPUÉS**: Verifica datos faltantes:
     - Cantidad: Si falta, pregunta "¿Cuántos/cuántas?"
     - Unidad: Default "piezas" (o kg/g/ml/L según corresponda)
     - Ubicación: Si falta, pregunta "¿Dónde lo guardas? ¿Refrigerador, congelador o alacena?"
  3. **FINALMENTE**: Cuando tengas TODO, llama a addToInventory

- EJEMPLO CORRECTO:
  Usuario: "agrega 3 tomates"
  1. searchIngredients("tomate") → obtiene ingredientId
  2. Detecta que falta ubicación
  3. Pregunta: "¿Dónde los guardas? ¿Refrigerador, congelador o alacena?"

- NUNCA preguntes sin haber buscado el ingrediente primero
- Después de agregar, confirma: "Listo, agregué 3 tomates al refrigerador"

**Para acciones de cocina/electrodomésticos (agregar a Mi Cocina):**
- CRÍTICO: Cuando el usuario diga "agregar [electrodoméstico] a mi cocina":
  1. Usa searchAppliances para buscar el electrodoméstico (ej: "batidora eléctrica")
  2. Si encuentras 1 resultado, usa addApplianceToKitchen con ese applianceId
  3. Si encuentras varios, pregunta cuál específicamente
  4. Si no encuentras ninguno, di que no existe en el catálogo
- NUNCA confundas "agregar a mi cocina" con "navegar a cocina"
- Ejemplo: "agregar batidora eléctrica" → searchAppliances("batidora") → addApplianceToKitchen(applianceId)

**Para navegación a recetas específicas:**
- CRÍTICO: Si el usuario menciona un plato/comida específico con palabras como "receta de/para/del", "cocinar", "hacer", "preparar" seguido de un nombre (ej: "ceviche de camarón", "arroz blanco", "pollo asado"), SIEMPRE es una receta específica.
- Ejemplos de recetas específicas: "llévame a la receta de arroz blanco", "quiero cocinar ceviche de camarón", "hacer pollo asado", "preparar pizza".
- Para recetas específicas: SIEMPRE llama a searchRecipes PRIMERO con el nombre del plato (extrae solo el nombre: "ceviche de camarón", "arroz blanco", etc).
- searchRecipes usa fuzzy matching, así que funcionará con búsquedas parciales y similares.
- Si searchRecipes devuelve 1 resultado, usa navigateToRecipe inmediatamente.
- Si devuelve 2-3 resultados, menciona los nombres y pregunta cuál (ej: "Encontré Ceviche de Camarón y Ceviche de Pescado, ¿cuál quieres?").
- Si devuelve 4+ resultados, menciona solo los 3 primeros y pregunta.
- Si devuelve 0 resultados, di que no encontraste esa receta.
- Después de navigateToRecipe, confirma brevemente (ej: "Abriendo Ceviche de Camarón").
- Si el usuario solo dice "llévame a recetas" o "quiero cocinar" SIN nombre de plato, NO uses estas funciones.

**Importante para respuestas de voz:**
- Mantén las respuestas cortas (máximo 2-3 oraciones).
- No uses markdown ni formato especial.
- Habla de manera natural y conversacional.
- Usa segunda persona (tú/tienes/puedes), NUNCA primera persona (yo/tengo)

**Reglas críticas de respuesta:**
- NUNCA respondas con JSON al usuario
- Responde SOLO con texto natural en español
- Ejemplo correcto: "Tienes 3 tomates en la alacena"
- Ejemplo INCORRECTO: {"action": "getInventory", "message": "Tengo 3 tomates"}`;

// =============================================================================
// CONVERSATION STORE (in-memory, per-session)
// =============================================================================

interface ConversationMessage {
  role: 'system' | 'user' | 'assistant' | 'tool';
  content: string;
  tool_call_id?: string;
  tool_calls?: ToolCall[];
}

interface ToolCall {
  id: string;
  type: 'function';
  function: {
    name: string;
    arguments: string;
  };
}

// Simple in-memory store for conversations (resets on server restart)
const conversations = new Map<string, ConversationMessage[]>();

function getConversation(id: string): ConversationMessage[] {
  if (!conversations.has(id)) {
    conversations.set(id, []);
  }
  return conversations.get(id)!;
}

function addToConversation(id: string, message: ConversationMessage): void {
  const conv = getConversation(id);
  conv.push(message);
  // Keep only last 20 messages to avoid context overflow
  if (conv.length > 20) {
    conv.splice(0, conv.length - 20);
  }
}

// =============================================================================
// LM STUDIO API CALL
// =============================================================================

interface ChatCompletionResponse {
  choices: {
    message: ConversationMessage;
    finish_reason: 'stop' | 'tool_calls' | 'length';
  }[];
}

async function callLMStudio(
  messages: ConversationMessage[],
  useTools: boolean = true
): Promise<ChatCompletionResponse> {
  const payload: Record<string, unknown> = {
    messages,
    temperature: 0.7,
    max_tokens: 500,
    stream: false,
  };

  if (useTools) {
    payload.tools = getFunctionDefinitions();
    payload.tool_choice = 'auto';
  }

  const response = await fetch(`${LM_STUDIO_URL}/v1/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'ngrok-skip-browser-warning': 'true',
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`LM Studio error: ${response.status} - ${errorText}`);
  }

  return response.json();
}

// =============================================================================
// MAIN HANDLER
// =============================================================================

export async function POST(request: NextRequest): Promise<NextResponse<AssistantResponse>> {
  try {
    const body: AssistantRequest = await request.json();
    const { text, context, conversationId = 'default', classification, toolResults } = body;

    // Validar request
    if (!text && !toolResults) {
      return NextResponse.json({
        success: false,
        response: 'No se proporcionó texto ni resultados de herramientas',
        error: 'Missing text or toolResults parameter',
      }, { status: 400 });
    }

    // Build context string with classification
    let contextString = '';

    // Add classification-specific instructions
    if (classification) {
      contextString += `\n\n[CLASIFICACIÓN: ${classification}]\n`;

      switch (classification) {
        case 'INVENTORY_ACTION':
          contextString += `INSTRUCCIONES ESPECÍFICAS PARA INVENTORY_ACTION:

**TIPO 1: CONSULTAR INVENTARIO** (usuario pregunta qué tiene)
Ejemplos: "qué hay en el inventario", "ver inventario", "muéstrame mi inventario", "cuántos tomates tengo"

FLUJO OBLIGATORIO:
1. **SIEMPRE**: Llama a getInventory primero (sin parámetros para obtener TODO)
2. **ANALIZA** el resultado:
   - Si getInventory devuelve { items: [], totalItems: 0 } → Responde: "Tu inventario está vacío. No hay ingredientes registrados."
   - Si getInventory devuelve items → Analiza y responde según la pregunta:
     * "qué hay en el inventario" → Lista todos los items con cantidad y ubicación
     * "cuántos tomates tengo" → Busca "tomate" en los items y responde la cantidad
     * "tengo manzanas" → Busca "manzana" en los items y responde si lo tiene o no
3. **NO INVENTES**: Si getInventory dice que está vacío, NO digas que tienen ingredientes

**TIPO 2: AGREGAR AL INVENTARIO** (usuario dice "agrega X")
Ejemplos: "agrega 3 tomates", "añade leche"

FLUJO OBLIGATORIO:
1. **PRIMERO**: Llama a searchIngredients con el nombre del ingrediente para obtener el ingredientId
2. **DESPUÉS**: Verifica datos requeridos:
   - Cantidad: Si falta → pregunta "¿Cuántos/cuántas?"
   - Unidad: Default "piezas" (o kg/g/ml/L según corresponda)
   - Ubicación: Si falta → pregunta "¿Dónde lo guardas? ¿Refrigerador, congelador o alacena?"
3. **FINALMENTE**: Cuando tengas TODO (ingredientId, cantidad, unidad, ubicación), llama a addToInventory

IMPORTANTE: Las funciones se ejecutan en el cliente (navegador), donde está IndexedDB. Úsalas normalmente.`;
          break;

        case 'APPLIANCE_ACTION':
          contextString += `INSTRUCCIONES ESPECÍFICAS:
- Usa searchAppliances para buscar el electrodoméstico
- Si encuentras 1 resultado, usa addApplianceToKitchen
- Si encuentras varios, pregunta cuál específicamente
- Si no encuentras ninguno, informa que no existe en el catálogo`;
          break;

        case 'RECIPE_SEARCH':
          contextString += `INSTRUCCIONES ESPECÍFICAS PARA BÚSQUEDA DE RECETAS:

1. **PRIMERO**: Usa searchRecipes con el nombre del plato extraído de la consulta del usuario

2. **SEGUNDO - ANÁLISIS DE RESULTADOS**:
   - Si searchRecipes devuelve 0 resultados: Di que no encontraste esa receta
   - Si searchRecipes devuelve 1 resultado: El cliente AUTO-NAVEGARÁ (no hagas nada más)
   - Si searchRecipes devuelve 2+ resultados:
     a) ANALIZA cuál es la MEJOR COINCIDENCIA con la búsqueda original
     b) Considera: nombre exacto > nombre similar > categoría relacionada
     c) CRÍTICO: Llama a navigateToRecipe con el recipeId de la mejor coincidencia
     d) Ejemplo: Si usuario buscó "Ensalada César" y hay 7 resultados, elige el que se llame EXACTAMENTE "Ensalada César"

3. **NO PREGUNTES** al usuario cuál receta quiere - TÚ decides la mejor coincidencia

4. **FORMATO DE RESPUESTA**: "Abriendo la receta de [NOMBRE_RECETA]"

IMPORTANTE: Cuando llames a navigateToRecipe, el cliente navegará automáticamente.`;
          break;
      }
    }

    if (context) {
      if (context.inRecipeGuide && context.recipeName) {
        contextString += `\n\n[MODO GUÍA DE COCINA ACTIVO]
Estás guiando al usuario en la preparación de: ${context.recipeName}.
Paso actual: ${context.currentStep || 'Inicio'}
Instrucción actual: "${context.currentStepInstruction || ''}"
Ingredientes para este paso: ${context.currentStepIngredients?.join(', ') || 'Ninguno'}
${context.currentStepTip ? `Tip: ${context.currentStepTip}` : ''}
${context.currentStepWarning ? `Advertencia: ${context.currentStepWarning}` : ''}

IMPORTANTE:
- Responde preguntas sobre este paso específico.
- Si el usuario pregunta "¿qué hago?", repite o explica la instrucción actual.
- Si pregunta "¿cuánto tiempo?", usa la duración del paso (${context.currentStepDuration || 0} min).
- Si pregunta por ingredientes, menciona SOLO los de este paso.`;
      } else {
        if (context.currentPage) {
          contextString += `\n[Página actual: ${context.currentPage}]`;
        }
        if (context.inventory && context.inventory.length > 0) {
          contextString += `\n[Inventario conocido: ${context.inventory.join(', ')}]`;
        }
      }
    }

    // Get or create conversation
    const conversation = getConversation(conversationId);

    // ==========================================================================
    // CASO 1: El cliente está enviando resultados de herramientas ejecutadas
    // ==========================================================================
    if (toolResults && toolResults.length > 0) {
      console.log('[Assistant API] Recibiendo resultados de herramientas ejecutadas en cliente');

      // Agregar resultados de herramientas a la conversación
      for (const toolResult of toolResults) {
        const toolMessage: ConversationMessage = {
          role: 'tool',
          tool_call_id: toolResult.tool_call_id,
          content: JSON.stringify(toolResult.result),
        };
        addToConversation(conversationId, toolMessage);
      }

      // Llamar al LLM de nuevo con los resultados
      const updatedMessages: ConversationMessage[] = [
        { role: 'system', content: SYSTEM_PROMPT + contextString },
        ...getConversation(conversationId),
      ];

      const response = await callLMStudio(updatedMessages);
      const assistantMessage = response.choices[0].message;

      // Si el LLM devuelve MÁS tool_calls, devolverlos al cliente
      if (response.choices[0].finish_reason === 'tool_calls' && assistantMessage.tool_calls) {
        addToConversation(conversationId, assistantMessage);

        const toolCallsPending = assistantMessage.tool_calls.map(tc => ({
          id: tc.id,
          name: tc.function.name,
          args: JSON.parse(tc.function.arguments || '{}'),
        }));

        console.log('[Assistant API] LLM solicita más herramientas:', toolCallsPending.map(tc => tc.name).join(', '));

        return NextResponse.json({
          success: true,
          toolCallsPending,
          conversationState: getConversation(conversationId),
        });
      }

      // Si no hay más tool_calls, devolver respuesta final
      const finalResponse = assistantMessage.content || 'No pude generar una respuesta.';
      addToConversation(conversationId, {
        role: 'assistant',
        content: finalResponse,
      });

      console.log(`[Assistant API] Respuesta final: ${finalResponse.substring(0, 100)}...`);

      return NextResponse.json({
        success: true,
        response: finalResponse,
      });
    }

    // ==========================================================================
    // CASO 2: Nueva consulta del usuario
    // ==========================================================================
    const messages: ConversationMessage[] = [
      { role: 'system', content: SYSTEM_PROMPT + contextString },
      ...conversation,
      { role: 'user', content: text! },
    ];

    console.log('--- [Assistant API Debug] ---');
    console.log('Context received:', JSON.stringify(context, null, 2));
    console.log('Conversation ID:', conversationId);
    console.log('System Prompt Suffix:', contextString);
    console.log('-----------------------------');

    // Add user message to conversation history
    addToConversation(conversationId, { role: 'user', content: text! });

    // Call LM Studio
    const response = await callLMStudio(messages);
    const assistantMessage = response.choices[0].message;

    // Si el LLM solicita herramientas, devolver al cliente para que las ejecute
    if (response.choices[0].finish_reason === 'tool_calls' && assistantMessage.tool_calls) {
      addToConversation(conversationId, assistantMessage);

      const toolCallsPending = assistantMessage.tool_calls.map(tc => ({
        id: tc.id,
        name: tc.function.name,
        args: JSON.parse(tc.function.arguments || '{}'),
      }));

      console.log('[Assistant API] LLM solicita herramientas (ejecutar en cliente):', toolCallsPending.map(tc => tc.name).join(', '));

      return NextResponse.json({
        success: true,
        toolCallsPending,
        conversationState: getConversation(conversationId),
      });
    }

    // Si no hay tool_calls, devolver respuesta directa
    const finalResponse = assistantMessage.content || 'No pude generar una respuesta.';
    addToConversation(conversationId, {
      role: 'assistant',
      content: finalResponse,
    });

    console.log(`[Assistant API] Respuesta sin herramientas: ${finalResponse.substring(0, 100)}...`);

    return NextResponse.json({
      success: true,
      response: finalResponse,
    });

  } catch (error) {
    console.error('[Assistant API] Error:', error);

    const errorMessage = error instanceof Error ? error.message : 'Error desconocido';

    // Check if it's a connection error to LM Studio
    if (errorMessage.includes('ECONNREFUSED') || errorMessage.includes('fetch failed')) {
      return NextResponse.json({
        success: false,
        response: 'No puedo conectar con LM Studio. Asegúrate de que esté corriendo en el puerto 1234.',
        functionsCalled: [],
        error: 'LM Studio connection failed',
        errorType: 'lm_studio',
      }, { status: 503 });
    }

    // Check for function execution errors
    if (errorMessage.includes('function') || errorMessage.includes('handler')) {
      return NextResponse.json({
        success: false,
        response: 'Error al ejecutar una función del asistente.',
        functionsCalled: [],
        error: errorMessage,
        errorType: 'function_error',
      }, { status: 500 });
    }

    return NextResponse.json({
      success: false,
      response: 'Ocurrió un error procesando tu pregunta.',
      functionsCalled: [],
      error: errorMessage,
      errorType: 'unknown',
    }, { status: 500 });
  }
}

// =============================================================================
// GET - Health check
// =============================================================================

export async function GET(): Promise<NextResponse> {
  try {
    // Check LM Studio connection
    const response = await fetch(`${LM_STUDIO_URL}/v1/models`, {
      method: 'GET',
      headers: {
        'ngrok-skip-browser-warning': 'true',
      },
    });

    const lmStudioAvailable = response.ok;

    return NextResponse.json({
      status: 'ok',
      lmStudioAvailable,
      lmStudioUrl: LM_STUDIO_URL,
      functionsAvailable: getFunctionDefinitions().length,
    });
  } catch {
    return NextResponse.json({
      status: 'ok',
      lmStudioAvailable: false,
      lmStudioUrl: LM_STUDIO_URL,
      functionsAvailable: getFunctionDefinitions().length,
    });
  }
}
