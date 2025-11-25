"use client";

import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react';
import { Recipe, RecipeStep } from '@/lib/db/schemas/types';

/**
 * RecipeGuideContext - Context para compartir estado de guía de receta
 *
 * Este contexto permite que el VoiceAssistant y otros componentes accedan
 * al estado actual de la guía de cocina sin prop drilling.
 */

interface RecipeGuideState {
  isInGuide: boolean;
  recipeId: string | null;
  currentStep: number | null;
  sessionId: string | null;
  activeVariantId: string | null;
  recipe: Recipe | null;
  currentStepData: RecipeStep | null;
}

interface RecipeGuideContextValue extends RecipeGuideState {
  setGuideState: (state: Partial<RecipeGuideState>) => void;
  switchToVariant: (variantId: string) => void;
  addSessionNote: (note: string) => void;
}

const RecipeGuideContext = createContext<RecipeGuideContextValue | null>(null);

interface RecipeGuideProviderProps {
  children: ReactNode;
}

export function RecipeGuideProvider({ children }: RecipeGuideProviderProps) {
  const [state, setState] = useState<RecipeGuideState>({
    isInGuide: false,
    recipeId: null,
    currentStep: null,
    sessionId: null,
    activeVariantId: null,
    recipe: null,
    currentStepData: null,
  });

  const setGuideState = useCallback((newState: Partial<RecipeGuideState>) => {
    setState(prev => {
      const updated = { ...prev, ...newState };

      // Auto-calcular currentStepData cuando cambia currentStep o recipe
      if (updated.recipe && updated.currentStep) {
        updated.currentStepData = updated.recipe.steps.find(s => s.step === updated.currentStep) || null;
      }

      return updated;
    });
  }, []);

  const switchToVariant = useCallback((variantId: string) => {
    setState(prev => ({
      ...prev,
      activeVariantId: variantId,
    }));
  }, []);

  const addSessionNote = useCallback((note: string) => {
    // Esta función será implementada cuando se integre con historyService
    console.log('[RecipeGuide] Adding session note:', note);
    // TODO: Llamar a historyService.addCookingNote(state.sessionId, note)
  }, []);

  const value: RecipeGuideContextValue = {
    ...state,
    setGuideState,
    switchToVariant,
    addSessionNote,
  };

  return (
    <RecipeGuideContext.Provider value={value}>
      {children}
    </RecipeGuideContext.Provider>
  );
}

export function useRecipeGuideContext(): RecipeGuideContextValue {
  const context = useContext(RecipeGuideContext);

  if (!context) {
    // Si no está en RecipeGuideProvider, retornar valores por defecto
    // Esto permite que VoiceAssistant funcione fuera de guías de receta
    return {
      isInGuide: false,
      recipeId: null,
      currentStep: null,
      sessionId: null,
      activeVariantId: null,
      recipe: null,
      currentStepData: null,
      setGuideState: () => {},
      switchToVariant: () => {},
      addSessionNote: () => {},
    };
  }

  return context;
}
