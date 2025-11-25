"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import { parseNavigationCommand, NavigationRoute } from "@/lib/voice/navigationCommands";
import { executeFunctionRequest, type FunctionRequest } from "@/lib/voice/clientFunctionExecutor";

export type VoiceStatus = "disconnected" | "connecting" | "listening" | "thinking" | "processing" | "executing_function" | "error";

type ErrorType = "websocket" | "voice_server" | "nextjs_api" | "lm_studio" | "function_error" | "unknown";

interface WebSocketMessage {
  type: "connected" | "transcript" | "partial" | "wake_word_detected" | "command" | "navigation" | "thinking" | "llm_response" | "pong" | "error" | "function_request" | "executing_functions";
  text?: string;
  command?: string;
  route?: string;
  message?: string;
  question?: string;
  response?: string;
  error_type?: ErrorType;
  error_message?: string;
  // Para function_request
  request_id?: string;
  function_name?: string;
  args?: Record<string, unknown>;
  // Para executing_functions
  functions?: string[];
}

export interface LLMResponse {
  question: string;
  response: string;
  timestamp: number;
}

export interface VoiceError {
  type: ErrorType;
  message: string;
  suggestion: string;
}

interface UseVoiceNavigationReturn {
  status: VoiceStatus;
  transcript: string;
  lastCommand: string;
  lastNavigation: NavigationRoute | null;
  llmResponse: LLMResponse | null;
  error: VoiceError | null;
  executingFunction: string | null;
  connect: () => void;
  disconnect: () => void;
  clearResponse: () => void;
  clearError: () => void;
  updateContext: (context: VoiceContext) => void;
}

export interface VoiceContext {
  inventory?: string[];
  recipes?: string[];
  current_page?: string;
  // Recipe guide context
  inRecipeGuide?: boolean;
  recipeId?: string | null;
  recipeName?: string;
  currentStep?: number | null;
  currentStepInstruction?: string;
  currentStepIngredients?: string[];
  currentStepTip?: string;
  currentStepWarning?: string;
  currentStepDuration?: number;
  sessionId?: string | null;
}

const WS_URL = "ws://localhost:8765";

// Helper para crear errores con sugerencias
function createVoiceError(type: ErrorType, message?: string): VoiceError {
  const errors: Record<ErrorType, { message: string; suggestion: string }> = {
    websocket: {
      message: message || "No se puede conectar al servidor de voz",
      suggestion: "Ejecuta: cd voice-server && python voice_server.py"
    },
    voice_server: {
      message: message || "Error en el servidor de voz",
      suggestion: "Verifica que el micrófono esté conectado y el modelo Vosk esté instalado"
    },
    nextjs_api: {
      message: message || "No se puede conectar a la API del asistente",
      suggestion: "Verifica que Next.js esté corriendo en puerto 3000"
    },
    lm_studio: {
      message: message || "No se puede conectar con LM Studio",
      suggestion: "Abre LM Studio y carga un modelo en el puerto 1234"
    },
    function_error: {
      message: message || "Error al ejecutar una función",
      suggestion: "Intenta reformular tu pregunta"
    },
    unknown: {
      message: message || "Error técnico desconocido",
      suggestion: "Revisa la consola para más detalles"
    }
  };

  return {
    type,
    message: errors[type].message,
    suggestion: errors[type].suggestion
  };
}

export function useVoiceNavigation(): UseVoiceNavigationReturn {
  const router = useRouter();
  const [status, setStatus] = useState<VoiceStatus>("disconnected");
  const [transcript, setTranscript] = useState("");
  const [lastCommand, setLastCommand] = useState("");
  const [lastNavigation, setLastNavigation] = useState<NavigationRoute | null>(null);
  const [llmResponse, setLlmResponse] = useState<LLMResponse | null>(null);
  const [error, setError] = useState<VoiceError | null>(null);
  const [executingFunction, setExecutingFunction] = useState<string | null>(null);

  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const autoConnectAttempted = useRef(false);

  // Actualizar contexto en el servidor
  const updateContext = useCallback((context: VoiceContext) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({
        type: "update_context",
        context,
      }));
    }
  }, []);

  // Procesar comando de navegación
  const processNavigation = useCallback(
    (command: string, routeFromServer?: string) => {
      if (!command && !routeFromServer) return;

      setLastCommand(command);
      setStatus("processing");
      setLlmResponse(null);

      // Si el servidor ya calculó la ruta, usarla directamente
      if (routeFromServer) {
        const route = { path: routeFromServer, name: command, keywords: [] };
        setLastNavigation(route);
        router.push(routeFromServer);
      } else {
        // Fallback: parsear localmente
        const route = parseNavigationCommand(command);
        if (route) {
          setLastNavigation(route);
          router.push(route.path);
        } else {
          setLastNavigation(null);
        }
      }

      // Volver a estado de escucha
      setTimeout(() => setStatus("listening"), 500);
    },
    [router]
  );

  // Limpiar respuesta del LLM
  const clearResponse = useCallback(() => {
    setLlmResponse(null);
    setLastCommand("");
  }, []);

  // Limpiar error
  const clearError = useCallback(() => {
    setError(null);
  }, []);

  // Manejar mensajes del WebSocket
  const handleMessage = useCallback(
    (event: MessageEvent) => {
      try {
        const data: WebSocketMessage = JSON.parse(event.data);

        switch (data.type) {
          case "connected":
            setStatus("listening");
            setError(null);
            break;

          case "partial":
            setTranscript(data.text || "");
            break;

          case "transcript":
            setTranscript(data.text || "");
            break;

          case "wake_word_detected":
            setTranscript(data.text || "");
            setLlmResponse(null);
            if (data.command) {
              setLastCommand(data.command);
            } else {
              setLastCommand("(esperando comando...)");
            }
            break;

          case "navigation":
            // Comando de navegación desde el servidor
            if (data.command || data.route) {
              processNavigation(data.command || "", data.route);
            }
            break;

          default:
            // Check if it's a cooking command
            if ((data as any).type === "cooking_command") {
              console.log("[Voice] Comando de cocina recibido:", (data as any).command);
              window.dispatchEvent(new CustomEvent('cooking-command', {
                detail: {
                  command: (data as any).command,
                  originalText: (data as any).original_text
                }
              }));
              setStatus("listening");
            }
            break;

          case "thinking":
            // El LLM está procesando
            setStatus("thinking");
            setLastNavigation(null);
            break;

          case "llm_response":
            // Respuesta del LLM
            setStatus("listening");
            setLlmResponse({
              question: data.question || "",
              response: data.response || "",
              timestamp: Date.now(),
            });
            break;

          case "command":
            // Compatibilidad con versión anterior
            if (data.command) {
              processNavigation(data.command);
            }
            break;

          case "error":
            // Error específico del servidor
            console.error("[Voice] Error recibido:", data.error_type, data.error_message);
            setStatus("error");
            setExecutingFunction(null);
            setError(createVoiceError(
              data.error_type || "unknown",
              data.error_message
            ));
            break;

          case "executing_functions":
            // El servidor va a ejecutar funciones
            setStatus("executing_function");
            if (data.functions && data.functions.length > 0) {
              setExecutingFunction(data.functions[0]);
            }
            break;

          case "function_request":
            // El servidor solicita ejecutar una función en el cliente
            if (data.request_id && data.function_name) {
              console.log(`[Voice] Ejecutando función: ${data.function_name}`, data.args);
              setStatus("executing_function");
              setExecutingFunction(data.function_name);

              const request: FunctionRequest = {
                requestId: data.request_id,
                functionName: data.function_name,
                args: data.args || {},
              };

              // Ejecutar la función y enviar resultado
              executeFunctionRequest(request)
                .then((response) => {
                  if (wsRef.current?.readyState === WebSocket.OPEN) {
                    wsRef.current.send(JSON.stringify({
                      type: "function_response",
                      request_id: response.requestId,
                      result: response.result,
                    }));
                    console.log(`[Voice] Función completada: ${data.function_name}`, response.result);
                  }
                })
                .catch((err) => {
                  console.error(`[Voice] Error ejecutando función: ${data.function_name}`, err);
                  if (wsRef.current?.readyState === WebSocket.OPEN) {
                    wsRef.current.send(JSON.stringify({
                      type: "function_response",
                      request_id: data.request_id,
                      result: {
                        success: false,
                        error: err instanceof Error ? err.message : "Error desconocido",
                      },
                    }));
                  }
                })
                .finally(() => {
                  setExecutingFunction(null);
                });
            }
            break;
        }
      } catch (e) {
        console.error("Error parsing WebSocket message:", e);
      }
    },
    [processNavigation]
  );

  // Conectar al servidor WebSocket
  const connect = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN) return;

    setStatus("connecting");
    setError(null);

    try {
      const ws = new WebSocket(WS_URL);

      ws.onopen = () => {
        console.log("Conectado al servidor de voz Rem-E");
        setStatus("listening");
        setError(null);
      };

      ws.onmessage = handleMessage;

      ws.onerror = () => {
        setError(createVoiceError("websocket"));
        setStatus("error");
      };

      ws.onclose = () => {
        setStatus("disconnected");
        wsRef.current = null;

        // Intentar reconectar en 3 segundos
        reconnectTimeoutRef.current = setTimeout(() => {
          console.log("Intentando reconectar...");
          connect();
        }, 3000);
      };

      wsRef.current = ws;
    } catch {
      setError(createVoiceError("websocket"));
      setStatus("error");
    }
  }, [handleMessage]);

  // Desconectar
  const disconnect = useCallback(() => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }

    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }

    setStatus("disconnected");
  }, []);

  // Auto-conectar al montar
  useEffect(() => {
    const timer = setTimeout(() => {
      connect();
    }, 500);

    return () => {
      clearTimeout(timer);
      disconnect();
    };
  }, [connect, disconnect]);

  return {
    status,
    transcript,
    lastCommand,
    lastNavigation,
    llmResponse,
    error,
    executingFunction,
    connect,
    disconnect,
    clearResponse,
    clearError,
    updateContext,
  };
}
