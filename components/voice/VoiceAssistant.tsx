"use client";

import { Mic, MicOff, Loader2, Wifi, WifiOff, X, Brain, AlertTriangle, Server, Database } from "lucide-react";
import { useVoiceNavigation, VoiceStatus, VoiceError } from "@/lib/hooks/useVoiceNavigation";
import { useRecipeGuideContext } from "@/lib/contexts/RecipeGuideContext";
import { useEffect } from "react";

/**
 * VoiceAssistant Component
 * Floating voice control widget for Rem-E
 * Adapts to the app's green/pistachio theme
 * Now with recipe context integration for cooking guidance
 */
export function VoiceAssistant() {
  const {
    isInGuide,
    recipeId,
    currentStep,
    currentStepData,
    recipe,
    sessionId,
  } = useRecipeGuideContext();

  const {
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
  } = useVoiceNavigation();

  // Enviar contexto de receta cuando cambia
  useEffect(() => {
    console.log('[VoiceAssistant] Context check:', { isInGuide, recipe: recipe?.name, currentStep });

    if (isInGuide && recipe) {
      const context = {
        inRecipeGuide: true,
        recipeId,
        recipeName: recipe.name,
        currentStep,
        currentStepInstruction: currentStepData?.instruction,
        currentStepIngredients: currentStepData?.ingredientsUsed,
        currentStepTip: currentStepData?.tip,
        currentStepWarning: currentStepData?.warning,
        currentStepDuration: currentStepData?.duration,
        sessionId,
      };
      console.log('[VoiceAssistant] Sending recipe context:', context);
      updateContext(context);
    } else {
      console.log('[VoiceAssistant] Not in guide, sending inRecipeGuide: false');
      updateContext({
        inRecipeGuide: false,
      });
    }
  }, [isInGuide, recipeId, currentStep, currentStepData, recipe, sessionId, updateContext]);

  const handleClick = () => {
    if (status === "disconnected" || status === "error") {
      connect();
    } else if (status === "listening") {
      disconnect();
    }
  };

  return (
    <div className="fixed bottom-6 right-6 flex flex-col items-end gap-3 z-50">
      {/* Indicador de modo receta */}
      {isInGuide && recipe && (
        <div
          className="rounded-lg shadow-md px-3 py-2 text-xs font-medium border animate-fadeInDown"
          style={{
            background: 'rgba(151, 194, 138, 0.15)',
            backdropFilter: 'blur(12px)',
            WebkitBackdropFilter: 'blur(12px)',
            borderColor: 'var(--color-primary)',
            color: 'var(--color-primary-dark)',
          }}
        >
          🍳 {recipe.name} - Paso {currentStep}
        </div>
      )}

      {/* Panel de respuesta del LLM - Glassmorphism style */}
      {llmResponse && (
        <div
          className="rounded-2xl shadow-xl p-5 max-w-md border animate-fadeInUp"
          style={{
            background: 'rgba(255, 255, 255, 0.85)',
            backdropFilter: 'blur(20px)',
            WebkitBackdropFilter: 'blur(20px)',
            borderColor: 'var(--color-primary)',
          }}
        >
          <div className="flex items-start justify-between gap-3 mb-3">
            <div className="flex items-center gap-2" style={{ color: 'var(--color-primary-dark)' }}>
              <Brain className="w-5 h-5" />
              <span className="font-semibold">Rem-E</span>
            </div>
            <button
              onClick={clearResponse}
              className="text-gray-400 hover:text-gray-600 transition-colors p-1 rounded-full hover:bg-gray-100"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <p className="text-sm text-gray-500 mb-2 italic">
            &quot;{llmResponse.question}&quot;
          </p>

          <div className="text-gray-800 text-sm leading-relaxed whitespace-pre-wrap">
            {llmResponse.response}
          </div>
        </div>
      )}

      {/* Feedback de transcripción/navegación */}
      {!llmResponse && (transcript || lastCommand || lastNavigation || status === "thinking") && (
        <div
          className="rounded-xl shadow-lg p-4 max-w-sm border"
          style={{
            background: 'rgba(255, 255, 255, 0.9)',
            backdropFilter: 'blur(12px)',
            WebkitBackdropFilter: 'blur(12px)',
            borderColor: 'rgba(151, 194, 138, 0.3)',
          }}
        >
          {transcript && (
            <p className="text-sm text-gray-500 italic">&quot;{transcript}&quot;</p>
          )}
          {lastCommand && (
            <p className="text-sm text-gray-700 mt-1">
              <strong>Comando:</strong> {lastCommand}
            </p>
          )}
          {lastNavigation && (
            <p className="text-sm mt-1 flex items-center gap-1" style={{ color: 'var(--color-secondary)' }}>
              <span>✓</span> Navegando a {lastNavigation.name}
            </p>
          )}
          {status === "thinking" && (
            <p className="text-sm mt-1 flex items-center gap-2" style={{ color: 'var(--color-primary-dark)' }}>
              <Loader2 className="w-4 h-4 animate-spin" />
              Pensando...
            </p>
          )}
          {status === "executing_function" && executingFunction && (
            <p className="text-sm mt-1 flex items-center gap-2" style={{ color: 'var(--color-secondary)' }}>
              <Database className="w-4 h-4 animate-pulse" />
              Consultando: {getFunctionDisplayName(executingFunction)}
            </p>
          )}
        </div>
      )}

      {/* Error/Status message - Con tipos específicos */}
      {error && (
        <div
          className="px-4 py-3 rounded-xl shadow-lg text-sm max-w-sm"
          style={{
            background: getErrorBackground(error.type),
            color: getErrorColor(error.type),
            border: `1px solid ${getErrorBorderColor(error.type)}`,
          }}
        >
          <div className="flex items-start gap-2">
            {getErrorIcon(error.type)}
            <div className="flex-1">
              <div className="flex items-center justify-between">
                <span className="font-medium">{getErrorTitle(error.type)}</span>
                <button
                  onClick={clearError}
                  className="text-current opacity-60 hover:opacity-100 transition-opacity p-0.5"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
              <p className="mt-1 opacity-90">{error.message}</p>
              <p className="text-xs mt-2 opacity-70 font-mono bg-black/5 px-2 py-1 rounded">
                {error.suggestion}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Botón principal - Estilo Rem-E */}
      <button
        onClick={handleClick}
        className={`w-16 h-16 rounded-full flex items-center justify-center shadow-lg transition-all transform hover:scale-105 active:scale-95 ${getButtonStyles(status)}`}
        title={getButtonTitle(status)}
        style={getButtonInlineStyles(status)}
      >
        {getButtonIcon(status)}
      </button>

      {/* Status indicator */}
      <div className="text-xs text-gray-500 text-center max-w-[140px] font-medium">
        {getStatusText(status)}
      </div>
    </div>
  );
}

function getButtonStyles(status: VoiceStatus): string {
  const baseStyles = "border-2";

  switch (status) {
    case "listening":
      return `${baseStyles} animate-pulse`;
    case "thinking":
      return baseStyles;
    case "processing":
      return baseStyles;
    case "connecting":
      return baseStyles;
    case "error":
      return `${baseStyles} hover:opacity-90`;
    case "disconnected":
    default:
      return `${baseStyles} hover:opacity-90`;
  }
}

function getButtonInlineStyles(status: VoiceStatus): React.CSSProperties {
  switch (status) {
    case "listening":
      return {
        background: 'var(--color-primary)',
        borderColor: 'var(--color-primary-dark)',
        color: 'white',
      };
    case "thinking":
      return {
        background: 'var(--color-secondary)',
        borderColor: 'var(--color-secondary-dark)',
        color: 'white',
      };
    case "executing_function":
      return {
        background: '#3B82F6',
        borderColor: '#2563EB',
        color: 'white',
      };
    case "processing":
      return {
        background: 'var(--color-success)',
        borderColor: 'var(--color-success)',
        color: 'white',
      };
    case "connecting":
      return {
        background: 'var(--color-warning)',
        borderColor: 'var(--color-warning)',
        color: 'white',
      };
    case "error":
      return {
        background: '#FEE2E2',
        borderColor: '#DC2626',
        color: '#DC2626',
      };
    case "disconnected":
    default:
      return {
        background: 'rgba(255, 255, 255, 0.8)',
        borderColor: '#E5E7EB',
        color: '#6B7280',
      };
  }
}

function getButtonIcon(status: VoiceStatus) {
  switch (status) {
    case "listening":
      return <Mic className="w-7 h-7" />;
    case "thinking":
      return <Brain className="w-7 h-7 animate-pulse" />;
    case "executing_function":
      return <Database className="w-7 h-7 animate-pulse" />;
    case "processing":
      return <Loader2 className="w-7 h-7 animate-spin" />;
    case "connecting":
      return <Wifi className="w-7 h-7 animate-pulse" />;
    case "error":
      return <WifiOff className="w-7 h-7" />;
    case "disconnected":
    default:
      return <MicOff className="w-7 h-7" />;
  }
}

function getButtonTitle(status: VoiceStatus): string {
  switch (status) {
    case "listening":
      return "Desconectar asistente de voz";
    case "thinking":
      return "Procesando pregunta...";
    case "executing_function":
      return "Consultando datos...";
    case "connecting":
      return "Conectando al servidor...";
    case "error":
    case "disconnected":
      return "Conectar al asistente de voz";
    default:
      return "";
  }
}

function getStatusText(status: VoiceStatus): string {
  switch (status) {
    case "listening":
      return 'Di "Rem-E" + comando';
    case "thinking":
      return "Consultando...";
    case "executing_function":
      return "Obteniendo datos...";
    case "processing":
      return "Navegando...";
    case "connecting":
      return "Conectando...";
    case "error":
      return "Error de conexión";
    case "disconnected":
      return "Asistente desactivado";
    default:
      return "";
  }
}

// Helper para nombres amigables de funciones
function getFunctionDisplayName(functionName: string): string {
  const displayNames: Record<string, string> = {
    getInventory: "inventario",
    searchInventoryByName: "buscando ingrediente",
    searchIngredients: "ingredientes",
    searchRecipes: "recetas",
    getRecipesByIngredients: "recetas disponibles",
    getInventorySummary: "resumen del inventario",
    getInventoryAlerts: "alertas",
    getRecipeDetails: "detalles de receta",
    checkRecipeIngredients: "ingredientes necesarios",
    getIngredientDetails: "detalles del ingrediente",
    getCompatibleIngredients: "ingredientes compatibles",
    getSubstitutes: "sustitutos",
    addToInventory: "agregando al inventario",
    updateInventory: "actualizando inventario",
    removeFromInventory: "eliminando del inventario",
    consumeFromInventory: "consumiendo del inventario",
    calculatePortions: "calculando porciones",
    calculateNutrition: "calculando nutrición",
    suggestComplementaryIngredients: "sugerencias",
    analyzeFlavorBalance: "balance de sabores",
  };
  return displayNames[functionName] || functionName;
}

// Helper functions para errores específicos
type ErrorType = "websocket" | "voice_server" | "nextjs_api" | "lm_studio" | "function_error" | "unknown";

function getErrorBackground(type: ErrorType): string {
  const backgrounds: Record<ErrorType, string> = {
    websocket: 'rgba(254, 242, 242, 0.95)',      // Rojo claro
    voice_server: 'rgba(254, 243, 199, 0.95)',   // Amarillo claro
    nextjs_api: 'rgba(254, 215, 170, 0.95)',     // Naranja claro
    lm_studio: 'rgba(219, 234, 254, 0.95)',      // Azul claro
    function_error: 'rgba(243, 232, 255, 0.95)', // Púrpura claro
    unknown: 'rgba(243, 244, 246, 0.95)',        // Gris claro
  };
  return backgrounds[type];
}

function getErrorColor(type: ErrorType): string {
  const colors: Record<ErrorType, string> = {
    websocket: '#DC2626',      // Rojo
    voice_server: '#D97706',   // Amarillo oscuro
    nextjs_api: '#EA580C',     // Naranja
    lm_studio: '#2563EB',      // Azul
    function_error: '#7C3AED', // Púrpura
    unknown: '#4B5563',        // Gris
  };
  return colors[type];
}

function getErrorBorderColor(type: ErrorType): string {
  const borders: Record<ErrorType, string> = {
    websocket: 'rgba(220, 38, 38, 0.3)',
    voice_server: 'rgba(217, 119, 6, 0.3)',
    nextjs_api: 'rgba(234, 88, 12, 0.3)',
    lm_studio: 'rgba(37, 99, 235, 0.3)',
    function_error: 'rgba(124, 58, 237, 0.3)',
    unknown: 'rgba(75, 85, 99, 0.3)',
  };
  return borders[type];
}

function getErrorIcon(type: ErrorType) {
  const iconClass = "w-5 h-5 flex-shrink-0 mt-0.5";
  switch (type) {
    case "websocket":
      return <WifiOff className={iconClass} />;
    case "voice_server":
      return <Mic className={iconClass} />;
    case "nextjs_api":
      return <Server className={iconClass} />;
    case "lm_studio":
      return <Brain className={iconClass} />;
    case "function_error":
      return <Database className={iconClass} />;
    default:
      return <AlertTriangle className={iconClass} />;
  }
}

function getErrorTitle(type: ErrorType): string {
  const titles: Record<ErrorType, string> = {
    websocket: "Servidor de voz",
    voice_server: "Reconocimiento de voz",
    nextjs_api: "API del asistente",
    lm_studio: "LM Studio",
    function_error: "Error de función",
    unknown: "Error técnico",
  };
  return titles[type];
}

export default VoiceAssistant;
