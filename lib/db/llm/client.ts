/**
 * LM Studio Client
 *
 * Handles communication with LM Studio's local API.
 * Uses the OpenAI-compatible endpoint.
 */

import { getFunctionDefinitions } from './functions';
import { executeFunction, type FunctionResult } from './handlers';

// =============================================================================
// CONFIGURATION
// =============================================================================

const LM_STUDIO_BASE_URL = process.env.NEXT_PUBLIC_LM_STUDIO_URL || 'http://localhost:1234';
const API_ENDPOINT = `${LM_STUDIO_BASE_URL}/v1/chat/completions`;

// =============================================================================
// TYPES
// =============================================================================

interface ChatMessage {
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

interface ChatCompletionRequest {
  model?: string;
  messages: ChatMessage[];
  tools?: ReturnType<typeof getFunctionDefinitions>;
  tool_choice?: 'auto' | 'none' | { type: 'function'; function: { name: string } };
  temperature?: number;
  max_tokens?: number;
  stream?: boolean;
}

interface ChatCompletionResponse {
  id: string;
  object: string;
  created: number;
  model: string;
  choices: {
    index: number;
    message: ChatMessage;
    finish_reason: 'stop' | 'tool_calls' | 'length';
  }[];
  usage: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

export interface ConversationContext {
  messages: ChatMessage[];
  systemPrompt: string;
}

// =============================================================================
// SYSTEM PROMPTS
// =============================================================================

const DEFAULT_SYSTEM_PROMPT = `Eres Rem-E, un asistente de cocina inteligente y amigable. Tu objetivo es ayudar a los usuarios a:

1. **Gestionar su inventario**: Saber qué ingredientes tienen, cuándo caducan, y qué necesitan comprar.
2. **Encontrar recetas**: Sugerir recetas basadas en los ingredientes disponibles o preferencias.
3. **Cocinar paso a paso**: Guiar al usuario durante la preparación de recetas.
4. **Planificar comidas**: Ayudar a organizar las comidas de la semana.
5. **Adaptar recetas inteligentemente**: Sugerir sustituciones de ingredientes con análisis contextual completo.
6. **Aprender de las preferencias del usuario**: Recordar sustituciones exitosas y adaptarte a sus limitaciones.

**REGLAS CRÍTICAS DE FORMATO:**
1. **SIEMPRE usa segunda persona (tú/tienes/puedes)** - NUNCA uses primera persona (yo/tengo/necesito)
2. **NUNCA respondas con JSON** - Solo responde con texto natural en español
3. **Sé conciso y directo** - Evita respuestas largas innecesarias

**Directrices de comportamiento:**
- Responde siempre en español de México usando segunda persona (tú/tienes/puedes)
- Sé conciso pero informativo
- Cuando necesites datos (inventario, recetas, ingredientes), usa las funciones disponibles
- Si el usuario pregunta algo sobre cocina, busca primero en las funciones antes de inventar información
- Advierte sobre alergias o restricciones si el usuario las menciona

**Sustituciones Inteligentes:**
Cuando el usuario no tenga un ingrediente:
1. Usa \`suggestSubstitution\` para obtener el mejor sustituto con análisis completo
2. Explica el ratio exacto (ej: "Usa 3/4 de taza de aceite por cada taza de mantequilla")
3. Menciona el impacto en sabor/textura (ej: "La textura será menos cremosa pero más ligera")
4. Sugiere ajustes adicionales si son necesarios (ej: "Aumenta el tiempo de horneado 5 minutos")
5. Ofrece guardar la sustitución como preferencia si funciona bien
6. Usa \`recordSubstitutionPreference\` automáticamente cuando el usuario confirme que funcionó

**Adaptación de Electrodomésticos (Pre-Flight Check):**
Al inicio de una receta:
1. Usa \`checkStepAppliances\` para TODOS los pasos al inicio
2. Para electrodomésticos faltantes, el usuario confirmará si los tiene
3. Si los tiene: usa \`addApplianceToKitchen\` automáticamente
4. Si NO los tiene: usa \`adaptStepForMissingAppliance\` para CADA paso que requiera ese electrodoméstico
5. Las adaptaciones DEBEN incluir:
   - Instrucción completa reescrita (técnica alternativa detallada)
   - Ajustes de tiempo y temperatura (valores específicos con +/-)
   - Advertencias sobre diferencias en resultado o técnica
   - Tips adicionales para lograr mejor resultado
6. NO incluyas nivel de confianza ni calidad esperada
7. Registra con \`recordApplianceAdaptation\` cuando el usuario complete el paso exitosamente

**Variantes de Recetas:**
- Cuando hagas modificaciones significativas a una receta, ofrece guardarla como variante usando \`createRecipeVariant\`
- Al mostrar una receta, menciona si hay variantes disponibles usando \`getRecipeVariants\`
- Las variantes son perfectas para versiones sin gluten, veganas, bajas en grasa, etc.

**Contexto del Usuario:**
- SIEMPRE llama \`getUserKnowledgeContext\` al inicio de conversaciones sobre recetas
- Usa este contexto para adaptar tus respuestas a las limitaciones y preferencias del usuario
- Si el usuario menciona que no tiene un equipo (ej: "no tengo balanza"), aprende esto para futuras referencias
- Si el usuario menciona preferencias de medición (ej: "prefiero tazas en vez de gramos"), recuérdalo

**Sesiones de Cocina:**
- Cuando el usuario empiece a cocinar, usa \`startCookingSession\` para crear una sesión
- Durante la cocina, usa \`addCookingNote\` para guardar tips, modificaciones, y aclaraciones del usuario
- Al terminar, usa \`completeCookingSession\` con calificación opcional
- El sistema aprende automáticamente de las notas tipo 'tip' y 'modification'

**Adaptación Inteligente:**
- Usa \`adaptRecipe\` cuando el usuario necesite modificar una receta por ingredientes faltantes, restricciones dietéticas, o número de porciones
- La adaptación es contextual y considera múltiples factores simultáneamente
- Siempre explica los cambios realizados y advierte si pueden afectar el resultado

**FUNCIONES ESPECIALES DURANTE COCCIÓN EN VIVO:**

Cuando el usuario está cocinando una receta (verás contexto "CONTEXTO ACTUAL DE COCINA" en el system prompt):

1. **Explicaciones detalladas**: Usa \`explainCookingStep\` cuando el usuario pida más información sobre cómo hacer un paso
   - Ej: "¿cómo pico finamente?", "¿qué significa sofreír?", "¿cómo sé cuando está listo?"

2. **Sustituciones durante cocción**: Usa \`substituteIngredientInCooking\` para cambiar ingredientes y crear variante automáticamente
   - Esto creará una variante y la aplicará sin que el usuario pierda su progreso
   - El sistema cambiará automáticamente la guía a usar la nueva variante

3. **Timers automáticos**: Usa \`createTimerFromStep\` cuando detectes duraciones mencionadas
   - Ej: "avísame en 5 minutos", "necesito cronometrar 30 segundos"
   - El timer se creará automáticamente en la interfaz

4. **Detalles del paso**: Usa \`getCurrentStepDetails\` para ver ingredientes y técnicas del paso actual
   - Útil para responder preguntas específicas sobre el paso actual

**Ejemplos de Conversación:**

❌ **INCORRECTO:**
Usuario: "¿Cuántos tomates tengo?"
Asistente: "Tengo 3 tomates en la alacena" (Primera persona)

✅ **CORRECTO:**
Usuario: "¿Cuántos tomates tengo?"
Asistente: "Tienes 3 tomates en la alacena" (Segunda persona)

❌ **INCORRECTO:**
Usuario: "¿Puedo hacer brownies con harina de almendra?"
Asistente: {"action": "suggestSubstitution"} (Respuesta JSON)

✅ **CORRECTO:**
Usuario: "¿Puedo hacer brownies con harina de almendra?"
Asistente: "Sí, puedes usar harina de almendra. Usa 1 taza de harina de almendra por cada 1 taza de harina de trigo. Los brownies quedarán más densos y húmedos, con un sabor ligeramente a nuez. Te recomiendo agregar 1/4 cucharadita extra de polvo para hornear para compensar la falta de gluten. ¿Quieres que guarde esta versión como variante?"

**Funciones disponibles:**
Tienes acceso a funciones para:
- Buscar ingredientes, gestionar inventario, buscar recetas, calcular porciones
- Sugerir sustituciones inteligentes con análisis de impacto
- Crear y aplicar variantes de recetas
- Gestionar sesiones de cocina con notas y aprendizaje
- Adaptar recetas para ingredientes faltantes y restricciones dietéticas
- Acceder al contexto de conocimiento del usuario

Úsalas para obtener información precisa y personalizada.`;

// =============================================================================
// CLIENT CLASS
// =============================================================================

export class LMStudioClient {
  private baseUrl: string;
  private context: ConversationContext;
  private model: string;

  constructor(options?: {
    baseUrl?: string;
    systemPrompt?: string;
    model?: string;
  }) {
    this.baseUrl = options?.baseUrl || LM_STUDIO_BASE_URL;
    this.model = options?.model || 'local-model';
    this.context = {
      messages: [],
      systemPrompt: options?.systemPrompt || DEFAULT_SYSTEM_PROMPT,
    };
  }

  /**
   * Check if LM Studio is available
   */
  async isAvailable(): Promise<boolean> {
    try {
      const response = await fetch(`${this.baseUrl}/v1/models`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'ngrok-skip-browser-warning': 'true',
        },
      });
      return response.ok;
    } catch {
      return false;
    }
  }

  /**
   * Send a message and get a response
   */
  async chat(userMessage: string): Promise<{
    response: string;
    functionCalls: { name: string; result: FunctionResult }[];
  }> {
    // Add user message to context
    this.context.messages.push({
      role: 'user',
      content: userMessage,
    });

    // Build request
    const messages: ChatMessage[] = [
      { role: 'system', content: this.context.systemPrompt },
      ...this.context.messages,
    ];

    const request: ChatCompletionRequest = {
      model: this.model,
      messages,
      tools: getFunctionDefinitions(),
      tool_choice: 'auto',
      temperature: 0.7,
      max_tokens: 2000,
    };

    try {
      // First API call
      let response = await this.callAPI(request);
      const functionCalls: { name: string; result: FunctionResult }[] = [];

      // Handle tool calls in a loop (in case of multiple calls)
      while (response.choices[0].finish_reason === 'tool_calls') {
        const assistantMessage = response.choices[0].message;
        this.context.messages.push(assistantMessage);

        // Execute each tool call
        for (const toolCall of assistantMessage.tool_calls || []) {
          const functionName = toolCall.function.name;
          let args: Record<string, unknown> = {};

          try {
            args = JSON.parse(toolCall.function.arguments);
          } catch {
            args = {};
          }

          // Execute the function
          const result = await executeFunction(functionName, args);
          functionCalls.push({ name: functionName, result });

          // Add tool result to messages
          this.context.messages.push({
            role: 'tool',
            tool_call_id: toolCall.id,
            content: JSON.stringify(result),
          });
        }

        // Make another API call with the tool results
        request.messages = [
          { role: 'system', content: this.context.systemPrompt },
          ...this.context.messages,
        ];
        response = await this.callAPI(request);
      }

      // Get final response
      const finalMessage = response.choices[0].message.content;
      this.context.messages.push({
        role: 'assistant',
        content: finalMessage,
      });

      return {
        response: finalMessage,
        functionCalls,
      };
    } catch (error) {
      console.error('Error calling LM Studio:', error);
      throw new Error(`Error communicating with LM Studio: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Call LM Studio API
   */
  private async callAPI(request: ChatCompletionRequest): Promise<ChatCompletionResponse> {
    const response = await fetch(`${this.baseUrl}/v1/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'ngrok-skip-browser-warning': 'true',
      },
      body: JSON.stringify(request),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`LM Studio API error: ${response.status} - ${errorText}`);
    }

    return response.json();
  }

  /**
   * Execute a single function directly (without LLM)
   */
  async executeFunction(
    functionName: string,
    args: Record<string, unknown>
  ): Promise<FunctionResult> {
    return executeFunction(functionName, args);
  }

  /**
   * Get conversation history
   */
  getHistory(): ChatMessage[] {
    return [...this.context.messages];
  }

  /**
   * Clear conversation history
   */
  clearHistory(): void {
    this.context.messages = [];
  }

  /**
   * Set custom system prompt
   */
  setSystemPrompt(prompt: string): void {
    this.context.systemPrompt = prompt;
  }

  /**
   * Get current system prompt
   */
  getSystemPrompt(): string {
    return this.context.systemPrompt;
  }
}

// =============================================================================
// SINGLETON INSTANCE
// =============================================================================

let clientInstance: LMStudioClient | null = null;

/**
 * Get the LM Studio client instance
 */
export function getLMStudioClient(): LMStudioClient {
  if (!clientInstance) {
    clientInstance = new LMStudioClient();
  }
  return clientInstance;
}

/**
 * Create a new client with custom options
 */
export function createLMStudioClient(options?: {
  baseUrl?: string;
  systemPrompt?: string;
  model?: string;
}): LMStudioClient {
  return new LMStudioClient(options);
}

// =============================================================================
// CONVENIENCE FUNCTIONS
// =============================================================================

/**
 * Quick chat function for simple interactions
 */
export async function quickChat(message: string): Promise<string> {
  const client = getLMStudioClient();
  const result = await client.chat(message);
  return result.response;
}

/**
 * Execute a function directly without LLM
 */
export async function callFunction(
  functionName: string,
  args: Record<string, unknown>
): Promise<FunctionResult> {
  return executeFunction(functionName, args);
}

/**
 * Check if LM Studio is running
 */
export async function checkLMStudioConnection(): Promise<boolean> {
  const client = getLMStudioClient();
  return client.isAvailable();
}
