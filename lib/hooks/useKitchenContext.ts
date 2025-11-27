/**
 * Hook para manejar el contexto de cocina con pending ingredient/location
 * Recupera funcionalidades del servidor Python Vosk
 */

import { useState, useCallback } from 'react';

export interface PendingIngredient {
  id: string;
  name: string;
}

export interface KitchenContext {
  pending_ingredient: PendingIngredient | null;
  pending_quantity: number;
  pending_unit: string;
  pending_location: string | null;
  last_activity_time: number | null;
  conversation_timeout: number; // milliseconds
}

const DEFAULT_CONTEXT: KitchenContext = {
  pending_ingredient: null,
  pending_quantity: 1,
  pending_unit: 'piezas',
  pending_location: null,
  last_activity_time: null,
  conversation_timeout: 30000, // 30 segundos
};

/**
 * Extrae cantidad numérica del texto
 */
export function extractQuantity(text: string): number {
  const numberWords: Record<string, number> = {
    'un': 1, 'uno': 1, 'una': 1,
    'dos': 2, 'tres': 3, 'cuatro': 4, 'cinco': 5,
    'seis': 6, 'siete': 7, 'ocho': 8, 'nueve': 9, 'diez': 10
  };

  const lowerText = text.toLowerCase();

  // Buscar palabras numéricas
  for (const [word, num] of Object.entries(numberWords)) {
    if (lowerText.includes(word)) {
      return num;
    }
  }

  // Buscar dígitos
  const digits = text.match(/\d+/);
  if (digits) {
    return parseInt(digits[0], 10);
  }

  return 1; // Default
}

/**
 * Extrae ubicación del texto en español
 * Retorna: "Refrigerador", "Congelador", "Alacena" o null
 */
export function extractLocation(text: string): string | null {
  const lowerText = text.toLowerCase();

  const locationMap: Record<string, string> = {
    'refrigerador': 'Refrigerador',
    'refri': 'Refrigerador',
    'nevera': 'Refrigerador',
    'congelador': 'Congelador',
    'freezer': 'Congelador',
    'alacena': 'Alacena',
    'despensa': 'Alacena',
    'pantry': 'Alacena',
  };

  for (const [word, location] of Object.entries(locationMap)) {
    if (lowerText.includes(word)) {
      console.log(`[Extract] Ubicación detectada: '${word}' → '${location}'`);
      return location;
    }
  }

  return null;
}

/**
 * Detecta si la respuesta del asistente contiene una pregunta
 */
export function isAssistantAskingQuestion(text: string): boolean {
  if (!text) return false;

  const lowerText = text.toLowerCase().trim();

  const questionPatterns = [
    '¿', '?',
    'dónde', 'donde',
    'cuántos', 'cuantos', 'cuántas', 'cuantas',
    'cuál', 'cual', 'cuáles', 'cuales',
    'qué tipo', 'que tipo',
    'qué ubicación', 'que ubicación',
    'refrigerador, congelador o alacena', // Pregunta específica
  ];

  return questionPatterns.some(pattern => lowerText.includes(pattern));
}

export function useKitchenContext() {
  const [context, setContext] = useState<KitchenContext>(DEFAULT_CONTEXT);

  /**
   * Actualizar actividad (para timeout de conversación)
   */
  const updateActivity = useCallback(() => {
    setContext(prev => ({
      ...prev,
      last_activity_time: Date.now()
    }));
  }, []);

  /**
   * Verificar si la conversación ha expirado por inactividad
   */
  const checkTimeout = useCallback((): boolean => {
    if (!context.last_activity_time) return false;

    const elapsed = Date.now() - context.last_activity_time;
    if (elapsed > context.conversation_timeout) {
      console.log(`[Timeout] Conversación expirada (${(elapsed / 1000).toFixed(1)}s de inactividad)`);
      // Limpiar contexto
      setContext(DEFAULT_CONTEXT);
      return true;
    }
    return false;
  }, [context.last_activity_time, context.conversation_timeout]);

  /**
   * Guardar ingrediente pendiente
   */
  const setPendingIngredient = useCallback((ingredient: PendingIngredient | null, quantity?: number, unit?: string) => {
    setContext(prev => ({
      ...prev,
      pending_ingredient: ingredient,
      pending_quantity: quantity !== undefined ? quantity : prev.pending_quantity,
      pending_unit: unit || prev.pending_unit,
    }));
    updateActivity();
  }, [updateActivity]);

  /**
   * Guardar ubicación pendiente
   */
  const setPendingLocation = useCallback((location: string | null) => {
    setContext(prev => ({
      ...prev,
      pending_location: location
    }));
    updateActivity();
  }, [updateActivity]);

  /**
   * Limpiar todo el contexto pendiente
   */
  const clearPending = useCallback(() => {
    setContext(DEFAULT_CONTEXT);
  }, []);

  /**
   * Verificar si tenemos todos los datos para agregar a inventario
   */
  const hasAllDataForInventory = useCallback((): boolean => {
    return !!(
      context.pending_ingredient &&
      context.pending_quantity > 0 &&
      context.pending_unit &&
      context.pending_location
    );
  }, [context]);

  /**
   * Obtener datos para addToInventory
   */
  const getInventoryData = useCallback(() => {
    if (!hasAllDataForInventory()) return null;

    return {
      ingredientId: context.pending_ingredient!.id,
      quantity: context.pending_quantity,
      unit: context.pending_unit,
      location: context.pending_location!
    };
  }, [context, hasAllDataForInventory]);

  return {
    context,
    updateActivity,
    checkTimeout,
    setPendingIngredient,
    setPendingLocation,
    clearPending,
    hasAllDataForInventory,
    getInventoryData,
  };
}
