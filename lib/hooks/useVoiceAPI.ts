"use client";

import { useState, useCallback } from "react";

/**
 * Hook alternativo para usar la API HTTP en lugar de WebSocket.
 * Útil para dispositivos móviles o cuando WebSocket no está disponible.
 */

export type VoiceAPIStatus = "idle" | "loading" | "error" | "success";

export interface VoiceAPIResponse {
  success: boolean;
  intent: "navigation" | "cooking_command" | "question";
  data?: any;
  response_text?: string;
  error?: string;
  error_type?: string;
}

export interface VoiceAPIError {
  message: string;
  type: string;
}

interface UseVoiceAPIOptions {
  apiUrl?: string; // Permite especificar URL personalizada (ej: http://192.168.1.100:8765)
}

interface UseVoiceAPIReturn {
  status: VoiceAPIStatus;
  response: VoiceAPIResponse | null;
  error: VoiceAPIError | null;
  askQuestion: (text: string, context?: Record<string, any>) => Promise<void>;
  updateContext: (context: Record<string, any>) => Promise<void>;
  clearResponse: () => void;
  clearError: () => void;
}

const DEFAULT_API_URL = "http://localhost:8765";

export function useVoiceAPI(options: UseVoiceAPIOptions = {}): UseVoiceAPIReturn {
  const apiUrl = options.apiUrl || DEFAULT_API_URL;

  const [status, setStatus] = useState<VoiceAPIStatus>("idle");
  const [response, setResponse] = useState<VoiceAPIResponse | null>(null);
  const [error, setError] = useState<VoiceAPIError | null>(null);

  /**
   * Envía una pregunta o comando al servidor
   */
  const askQuestion = useCallback(
    async (text: string, context?: Record<string, any>) => {
      setStatus("loading");
      setError(null);
      setResponse(null);

      try {
        const res = await fetch(`${apiUrl}/api/command`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            text,
            context,
            skip_wake_word: true,
          }),
        });

        if (!res.ok) {
          throw new Error(`HTTP ${res.status}: ${res.statusText}`);
        }

        const data: VoiceAPIResponse = await res.json();

        setResponse(data);
        setStatus(data.success ? "success" : "error");

        if (!data.success) {
          setError({
            message: data.error || "Error desconocido",
            type: data.error_type || "unknown",
          });
        }
      } catch (err) {
        setStatus("error");
        setError({
          message:
            err instanceof Error
              ? err.message
              : "No se pudo conectar con el servidor",
          type: "network",
        });
      }
    },
    [apiUrl]
  );

  /**
   * Actualiza el contexto en el servidor
   */
  const updateContext = useCallback(
    async (context: Record<string, any>) => {
      try {
        await fetch(`${apiUrl}/api/context`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ context }),
        });
      } catch (err) {
        console.error("Error actualizando contexto:", err);
      }
    },
    [apiUrl]
  );

  /**
   * Limpia la respuesta actual
   */
  const clearResponse = useCallback(() => {
    setResponse(null);
    setStatus("idle");
  }, []);

  /**
   * Limpia el error actual
   */
  const clearError = useCallback(() => {
    setError(null);
    if (status === "error") {
      setStatus("idle");
    }
  }, [status]);

  return {
    status,
    response,
    error,
    askQuestion,
    updateContext,
    clearResponse,
    clearError,
  };
}
