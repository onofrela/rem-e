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

**Directrices de comportamiento:**
- Responde siempre en español de México.
- Sé conciso pero informativo.
- Cuando necesites datos (inventario, recetas, ingredientes), usa las funciones disponibles.
- Si el usuario pregunta algo sobre cocina, busca primero en las funciones antes de inventar información.
- Sugiere alternativas cuando falten ingredientes.
- Advierte sobre alergias o restricciones si el usuario las menciona.

**Funciones disponibles:**
Tienes acceso a funciones para buscar ingredientes, gestionar el inventario, buscar recetas, calcular porciones y más. Úsalas para obtener información precisa.`;

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
        headers: { 'Content-Type': 'application/json' },
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
