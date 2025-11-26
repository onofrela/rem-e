"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import { parseNavigationCommand, NavigationRoute } from "@/lib/voice/navigationCommands";

export type VoiceStatus = "disconnected" | "listening" | "thinking" | "processing" | "error";

type ErrorType = "browser_not_supported" | "microphone_denied" | "unknown";

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

// Helper para crear errores con sugerencias
function createVoiceError(type: ErrorType, message?: string): VoiceError {
  // Detectar si es móvil para mensajes específicos
  const isMobile = typeof window !== 'undefined' && /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);

  const errors: Record<ErrorType, { message: string; suggestion: string }> = {
    browser_not_supported: {
      message: message || "Tu navegador no soporta reconocimiento de voz",
      suggestion: "Usa Chrome, Edge o Safari para usar el asistente de voz"
    },
    microphone_denied: {
      message: message || "Acceso al micrófono denegado",
      suggestion: isMobile
        ? "En móvil: Toca el botón del micrófono para activar. Si no funciona, verifica permisos en Ajustes > Safari/Chrome > Micrófono"
        : "Permite el acceso al micrófono en la configuración del navegador"
    },
    unknown: {
      message: message || "Error técnico desconocido",
      suggestion: "Revisa la consola para más detalles o recarga la página"
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
  const [executingFunction] = useState<string | null>(null);
  const [currentContext, setCurrentContext] = useState<VoiceContext>({});

  const recognitionRef = useRef<any | null>(null);
  const isListeningRef = useRef(false);
  const wakeWordDetectedRef = useRef(false);

  // Actualizar contexto (ahora solo local, no enviamos a servidor)
  const updateContext = useCallback((context: VoiceContext) => {
    setCurrentContext(context);
    console.log("[Voice] Context updated:", context);
  }, []);

  // Detectar palabra de activación "Rem-E"
  const detectWakeWord = useCallback((text: string): boolean => {
    const lowerText = text.toLowerCase().trim();
    return lowerText.includes('reme') ||
           lowerText.includes('rem e') ||
           lowerText.includes('remi') ||
           lowerText.startsWith('reme') ||
           lowerText.startsWith('rem e');
  }, []);

  // Extraer comando después de la palabra de activación
  const extractCommand = useCallback((text: string): string => {
    const lowerText = text.toLowerCase();
    // Buscar "Rem-E" y tomar todo lo que viene después
    const patterns = ['reme', 'rem e', 'remi'];
    for (const pattern of patterns) {
      const index = lowerText.indexOf(pattern);
      if (index !== -1) {
        const command = text.substring(index + pattern.length).trim();
        return command;
      }
    }
    return text;
  }, []);

  // Clasificar intent: navegación vs pregunta
  const classifyIntent = useCallback((text: string): { type: 'navigation' | 'question'; route?: string } => {
    const lowerText = text.toLowerCase().trim();

    // Palabras que indican pregunta
    const questionIndicators = [
      'qué', 'que', 'cuánto', 'cuanto', 'cuánta', 'cuanta',
      'cuántos', 'cuantos', 'cuántas', 'cuantas',
      'cómo', 'como', 'dónde', 'donde', 'por qué', 'porque',
      'tengo', 'hay', 'puedo', 'necesito', 'falta', 'busca',
      'buscar', 'encuentra', 'encontrar', 'dame', 'dime',
      'cuál', 'cual', 'sería', 'seria', 'explica', 'recomienda'
    ];

    const isQuestion = questionIndicators.some(q => lowerText.includes(q));

    // Verbos de navegación
    const navigationVerbs = ['ve a', 'ir a', 'abre', 'muestra', 'navega'];
    const hasNavVerb = navigationVerbs.some(v => lowerText.includes(v));

    // Si tiene verbo de navegación explícito, es navegación
    if (hasNavVerb) {
      return { type: 'navigation' };
    }

    // Si es pregunta clara, es pregunta
    if (isQuestion) {
      return { type: 'question' };
    }

    // Buscar secciones de navegación específicas
    const route = parseNavigationCommand(text);
    if (route) {
      return { type: 'navigation', route: route.path };
    }

    // Por defecto, es pregunta
    return { type: 'question' };
  }, []);

  // Detectar comandos de cocina
  const detectCookingCommand = useCallback((text: string): string | null => {
    const lowerText = text.toLowerCase();

    // Comandos de navegación de pasos
    if (lowerText.includes('siguiente') || lowerText.includes('continuar')) {
      return 'siguiente';
    }
    if (lowerText.includes('anterior') || lowerText.includes('atrás')) {
      return 'anterior';
    }
    if (lowerText.includes('repetir') || lowerText.includes('repite')) {
      return 'repetir';
    }
    if (lowerText.includes('pausar') || lowerText.includes('pausa')) {
      return 'pausar';
    }
    if (lowerText.includes('reanudar') || lowerText.includes('continúa')) {
      return 'reanudar';
    }

    // Comando de timer
    if (lowerText.includes('timer') || lowerText.includes('temporizador') || lowerText.includes('cronómetro')) {
      return 'timer';
    }

    return null;
  }, []);

  // Procesar comando de navegación
  const processNavigation = useCallback(
    (command: string) => {
      if (!command) return;

      setLastCommand(command);
      setStatus("processing");
      setLlmResponse(null);

      // Parsear comando de navegación
      const route = parseNavigationCommand(command);
      if (route) {
        setLastNavigation(route);
        router.push(route.path);
      } else {
        setLastNavigation(null);
      }

      // Volver a estado de escucha
      setTimeout(() => {
        setStatus("listening");
        wakeWordDetectedRef.current = false;
      }, 500);
    },
    [router]
  );

  // Procesar comando de cocina
  const processCookingCommand = useCallback((cookingCmd: string, originalText: string) => {
    console.log("[Voice] Comando de cocina detectado:", cookingCmd);
    window.dispatchEvent(new CustomEvent('cooking-command', {
      detail: {
        command: cookingCmd,
        originalText
      }
    }));
    setStatus("listening");
    wakeWordDetectedRef.current = false;
  }, []);

  // Procesar pregunta con LLM
  const processQuestion = useCallback(async (question: string) => {
    console.log("[Voice] Procesando pregunta con LLM:", question);
    setLastCommand(question);
    setStatus("thinking");
    setLlmResponse(null);

    try {
      // Llamar a la API del asistente
      const response = await fetch('/api/assistant', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          text: question,
          context: currentContext,
        }),
      });

      const data = await response.json();

      if (data.success) {
        setLlmResponse({
          question,
          response: data.response,
          timestamp: Date.now(),
        });
        console.log("[Voice] Respuesta LLM:", data.response);
        console.log("[Voice] Funciones ejecutadas:", data.functionsCalled?.map((f: any) => f.name).join(', ') || 'ninguna');
      } else {
        // Error del asistente
        setError(createVoiceError("unknown", data.error || "Error al procesar la pregunta"));
      }
    } catch (err) {
      console.error("[Voice] Error llamando al asistente:", err);
      setError(createVoiceError("unknown", "No se pudo conectar con el asistente"));
    } finally {
      setStatus("listening");
      wakeWordDetectedRef.current = false;
    }
  }, [currentContext]);

  // Manejar resultado de reconocimiento de voz
  const handleRecognitionResult = useCallback(
    (event: any) => {
      const results = event.results;
      const lastResult = results[results.length - 1];
      const transcriptText = lastResult[0].transcript;

      console.log("[Voice] Transcript:", transcriptText, "isFinal:", lastResult.isFinal);

      // Actualizar transcript en tiempo real
      setTranscript(transcriptText);

      // Solo procesar comandos finales
      if (lastResult.isFinal) {
        // Si estamos en una receta, primero intentar detectar comandos de cocina
        if (currentContext.inRecipeGuide) {
          const cookingCmd = detectCookingCommand(transcriptText);
          if (cookingCmd) {
            processCookingCommand(cookingCmd, transcriptText);
            setTranscript("");
            return;
          }
        }

        // Si aún no detectamos palabra de activación, buscarla
        if (!wakeWordDetectedRef.current) {
          if (detectWakeWord(transcriptText)) {
            wakeWordDetectedRef.current = true;
            const command = extractCommand(transcriptText);

            if (command) {
              // Si hay comando inmediatamente después de wake word, procesarlo
              console.log("[Voice] Wake word detected with command:", command);

              // Clasificar intent
              const intent = classifyIntent(command);
              console.log("[Voice] Intent classification:", intent);

              if (intent.type === 'navigation') {
                processNavigation(command);
              } else {
                // Es una pregunta, procesarla con el LLM
                processQuestion(command);
              }
            } else {
              // Solo wake word, esperar comando
              console.log("[Voice] Wake word detected, waiting for command");
              setLastCommand("(esperando comando...)");
            }
            setTranscript("");
          }
        } else {
          // Ya detectamos wake word, este es el comando
          console.log("[Voice] Processing command after wake word:", transcriptText);

          // Clasificar intent
          const intent = classifyIntent(transcriptText);
          console.log("[Voice] Intent classification:", intent);

          if (intent.type === 'navigation') {
            processNavigation(transcriptText);
          } else {
            // Es una pregunta, procesarla con el LLM
            processQuestion(transcriptText);
          }
          setTranscript("");
        }
      }
    },
    [detectWakeWord, extractCommand, classifyIntent, processNavigation, processQuestion, detectCookingCommand, processCookingCommand, currentContext.inRecipeGuide]
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

  // Conectar (iniciar reconocimiento de voz)
  const connect = useCallback(async () => {
    if (typeof window === 'undefined') return;

    // Verificar si estamos en contexto seguro (HTTPS o localhost)
    const isSecureContext = window.isSecureContext;
    if (!isSecureContext) {
      console.error("[Voice] Not in secure context (HTTPS required)");
      setError(createVoiceError("unknown", "Se requiere HTTPS para usar el micrófono. Accede desde https:// o localhost"));
      setStatus("error");
      return;
    }

    // Verificar soporte del navegador
    const SpeechRecognitionAPI = window.SpeechRecognition || window.webkitSpeechRecognition;

    if (!SpeechRecognitionAPI) {
      setError(createVoiceError("browser_not_supported"));
      setStatus("error");
      return;
    }

    if (isListeningRef.current) {
      console.log("[Voice] Already listening");
      return;
    }

    // IMPORTANTE: En tablets/móviles, solicitar permisos EXPLÍCITAMENTE primero
    // Esto fuerza al navegador a mostrar el diálogo de permisos
    try {
      console.log("[Voice] Requesting microphone permission...");
      console.log("[Voice] Current URL:", window.location.href);
      console.log("[Voice] Is secure context:", isSecureContext);

      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });

      // Inmediatamente detener el stream, solo lo usamos para obtener permisos
      stream.getTracks().forEach(track => track.stop());
      console.log("[Voice] Microphone permission granted");
    } catch (permError: any) {
      console.error("[Voice] Microphone permission denied:", permError);
      setError(createVoiceError("microphone_denied", permError.message));
      setStatus("error");
      return;
    }

    try {
      const recognition = new SpeechRecognitionAPI();
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = 'es-MX';

      recognition.onresult = handleRecognitionResult;

      recognition.onerror = (event: any) => {
        console.error('[Voice] Speech recognition error:', event.error);

        if (event.error === 'not-allowed' || event.error === 'permission-denied') {
          setError(createVoiceError("microphone_denied"));
          setStatus("error");
          isListeningRef.current = false;
        } else if (event.error === 'no-speech') {
          // No es un error real, solo continuar
          console.log("[Voice] No speech detected, continuing...");
          // No cambiar el estado, permitir que siga escuchando
        } else if (event.error === 'aborted') {
          // Usuario canceló o navegador bloqueó
          console.log("[Voice] Recognition aborted");
          setStatus("disconnected");
          isListeningRef.current = false;
        } else {
          setError(createVoiceError("unknown", `Error: ${event.error}`));
          setStatus("error");
          isListeningRef.current = false;
        }
      };

      recognition.onend = () => {
        console.log("[Voice] Recognition ended");
        isListeningRef.current = false;

        // Auto-restart si no hay error
        if (status !== "error" && status !== "disconnected") {
          setTimeout(() => {
            if (recognitionRef.current) {
              try {
                recognitionRef.current.start();
                isListeningRef.current = true;
                console.log("[Voice] Auto-restarted recognition");
              } catch (err) {
                console.error("[Voice] Error auto-restarting:", err);
              }
            }
          }, 100);
        }
      };

      recognitionRef.current = recognition;
      recognition.start();
      isListeningRef.current = true;
      wakeWordDetectedRef.current = false;
      setStatus("listening");
      setError(null);
      console.log("[Voice] Started listening");
    } catch (err) {
      console.error('[Voice] Error starting recognition:', err);
      setError(createVoiceError("unknown", String(err)));
      setStatus("error");
      isListeningRef.current = false;
    }
  }, [handleRecognitionResult, status]);

  // Desconectar (detener reconocimiento de voz)
  const disconnect = useCallback(() => {
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
        recognitionRef.current = null;
      } catch (err) {
        console.error("[Voice] Error stopping recognition:", err);
      }
    }
    isListeningRef.current = false;
    wakeWordDetectedRef.current = false;
    setStatus("disconnected");
    setTranscript("");
    console.log("[Voice] Disconnected");
  }, []);

  // Auto-conectar al montar SOLO en desktop
  // En móvil REQUIERE interacción del usuario
  useEffect(() => {
    // Detectar si es móvil
    const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);

    if (!isMobile) {
      // Solo auto-conectar en desktop
      const timer = setTimeout(() => {
        connect();
      }, 500);

      return () => {
        clearTimeout(timer);
        disconnect();
      };
    }

    // En móvil, solo cleanup al desmontar
    return () => {
      disconnect();
    };
  }, []); // Solo al montar/desmontar

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
