/**
 * Assistant API Route
 *
 * Handles voice assistant requests from Python voice_server.
 * Uses LM Studio with function calling for intelligent responses.
 */

import { NextRequest, NextResponse } from 'next/server';
import { LMStudioClient } from '@/lib/db/llm/client';
import { getFunctionDefinitions } from '@/lib/db/llm/functions';
import { executeFunction, type FunctionResult } from '@/lib/db/llm/handlers';

// =============================================================================
// TYPES
// =============================================================================

interface AssistantRequest {
  text: string;
  context?: {
    currentPage?: string;
    inventory?: string[];
    recipes?: string[];
  };
  conversationId?: string;
}

type ErrorType = 'lm_studio' | 'function_error' | 'nextjs_api' | 'unknown';

interface AssistantResponse {
  success: boolean;
  response: string;
  functionsCalled: {
    name: string;
    args: Record<string, unknown>;
    result: FunctionResult;
  }[];
  error?: string;
  errorType?: ErrorType;
}

// =============================================================================
// LM STUDIO CONFIGURATION
// =============================================================================

const LM_STUDIO_URL = process.env.LM_STUDIO_URL || 'http://localhost:1234';

const SYSTEM_PROMPT = `Eres Rem-E, un asistente de cocina inteligente y amigable. Tu objetivo es ayudar a los usuarios a:

1. **Gestionar su inventario**: Saber qué ingredientes tienen, cuándo caducan, y qué necesitan comprar.
2. **Gestionar su cocina**: Conocer qué electrodomésticos tienen disponibles (hornos, licuadoras, microondas, etc.).
3. **Encontrar recetas**: Sugerir recetas basadas en los ingredientes disponibles, preferencias, Y los electrodomésticos que tienen.
4. **Cocinar paso a paso**: Guiar al usuario durante la preparación de recetas.
5. **Planificar comidas**: Ayudar a organizar las comidas de la semana.

**Directrices de comportamiento:**
- Responde siempre en español de México.
- Sé conciso pero informativo. Las respuestas deben ser cortas para ser leídas en voz alta.
- Cuando necesites datos (inventario, recetas, ingredientes, electrodomésticos), USA LAS FUNCIONES disponibles.
- NUNCA inventes datos. Si no tienes información, usa una función para obtenerla.
- Si el usuario pregunta sobre su inventario, SIEMPRE llama a getInventory primero.
- Si el usuario pregunta sobre sus electrodomésticos o "mi cocina", consulta primero qué electrodomésticos tiene.
- Al sugerir recetas, considera los electrodomésticos disponibles. Por ejemplo, no sugieras recetas de horno si no tiene uno.
- Sugiere alternativas cuando falten ingredientes o electrodomésticos.

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
    const { text, context, conversationId = 'default' } = body;

    if (!text || typeof text !== 'string') {
      return NextResponse.json({
        success: false,
        response: 'No se proporcionó texto',
        functionsCalled: [],
        error: 'Missing text parameter',
      }, { status: 400 });
    }

    // Build context string if provided
    let contextString = '';
    if (context) {
      if (context.currentPage) {
        contextString += `\n[Página actual: ${context.currentPage}]`;
      }
      if (context.inventory && context.inventory.length > 0) {
        contextString += `\n[Inventario conocido: ${context.inventory.join(', ')}]`;
      }
    }

    // Get or create conversation
    const conversation = getConversation(conversationId);

    // Build messages array
    const messages: ConversationMessage[] = [
      { role: 'system', content: SYSTEM_PROMPT + contextString },
      ...conversation,
      { role: 'user', content: text },
    ];

    // Add user message to conversation history
    addToConversation(conversationId, { role: 'user', content: text });

    const functionsCalled: AssistantResponse['functionsCalled'] = [];

    // Call LM Studio
    let response = await callLMStudio(messages);
    let assistantMessage = response.choices[0].message;

    // Handle tool calls in a loop
    let iterations = 0;
    const maxIterations = 5; // Prevent infinite loops

    while (response.choices[0].finish_reason === 'tool_calls' && iterations < maxIterations) {
      iterations++;

      // Add assistant message with tool calls to conversation
      addToConversation(conversationId, assistantMessage);

      // Execute each tool call
      for (const toolCall of assistantMessage.tool_calls || []) {
        const functionName = toolCall.function.name;
        let args: Record<string, unknown> = {};

        try {
          args = JSON.parse(toolCall.function.arguments);
        } catch {
          args = {};
        }

        console.log(`[Assistant API] Calling function: ${functionName}`, args);

        // Execute the function
        const result = await executeFunction(functionName, args);

        functionsCalled.push({
          name: functionName,
          args,
          result,
        });

        // Add tool result to conversation
        const toolMessage: ConversationMessage = {
          role: 'tool',
          tool_call_id: toolCall.id,
          content: JSON.stringify(result),
        };
        addToConversation(conversationId, toolMessage);
      }

      // Call LM Studio again with tool results
      const updatedMessages: ConversationMessage[] = [
        { role: 'system', content: SYSTEM_PROMPT + contextString },
        ...getConversation(conversationId),
      ];

      response = await callLMStudio(updatedMessages);
      assistantMessage = response.choices[0].message;
    }

    // Get final response text
    const finalResponse = assistantMessage.content || 'No pude generar una respuesta.';

    // Add final assistant message to conversation
    addToConversation(conversationId, {
      role: 'assistant',
      content: finalResponse,
    });

    console.log(`[Assistant API] Response: ${finalResponse.substring(0, 100)}...`);
    console.log(`[Assistant API] Functions called: ${functionsCalled.map(f => f.name).join(', ') || 'none'}`);

    return NextResponse.json({
      success: true,
      response: finalResponse,
      functionsCalled,
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
