'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { RatingModal } from '@/components/ui/RatingModal';
import type { Recipe } from '@/lib/db/schemas/types';
import * as recipeService from '@/lib/db/services/recipeService';
import {
  createRecipeHistory,
  completeRecipeHistory,
  getRecipeCookCount,
} from '@/lib/db/services/recipeHistoryService';
import { useVoice, VoiceCommand } from '@/lib/hooks/useVoice';
import { usePollyTTS } from '@/lib/hooks/usePollyTTS';
import { useRecipeGuideContext } from '@/lib/contexts/RecipeGuideContext';
import { useRecipeSettings } from '@/contexts/RecipeSettingsContext';
import { MainLayout } from '@/components/layout';

export default function CookingGuidePage({ params }: { params: Promise<{ id: string }> }) {
  return (
    <MainLayout>
      <RecipeGuideContent params={params} />
    </MainLayout>
  );
}

function RecipeGuideContent({ params }: { params: Promise<{ id: string }> }) {
  const router = useRouter();
  const unwrappedParams = React.use(params);
  const { setGuideState, switchToVariant: switchToVariantContext, activeVariantId } = useRecipeGuideContext();

  const { settings } = useRecipeSettings();
  const [recipe, setRecipe] = useState<Recipe | null>(null);
  const [currentStep, setCurrentStep] = useState(1);
  const [isPaused, setIsPaused] = useState(false);
  const [showAllSteps, setShowAllSteps] = useState(false);
  const [activeTimers, setActiveTimers] = useState<Array<{ id: number; duration: number; remaining: number }>>([]);
  const [nextTimerId, setNextTimerId] = useState(1);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [showRatingModal, setShowRatingModal] = useState(false);

  // Appliance adaptation states
  const [stepAdaptations, setStepAdaptations] = useState<Map<number, any>>(new Map());
  const [isCheckingAppliances, setIsCheckingAppliances] = useState(false);
  const [preFlightComplete, setPreFlightComplete] = useState(false);
  const [showApplianceModal, setShowApplianceModal] = useState(false);
  const [currentCheckingAppliance, setCurrentCheckingAppliance] = useState<{id: string; name: string} | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [functionalityToAppliance, setFunctionalityToAppliance] = useState<Map<string, {id: string; name: string}>>(new Map());

  // Voice control
  const { isListening, isSupported, transcript, toggleListening } = useVoice({
    onCommand: handleVoiceCommand,
    language: 'es-MX',
    continuous: true,
  });

  // Text-to-speech with Amazon Polly TTS
  const { speak, stop: stopSpeech, isLoading: isSpeechLoading, isPlaying: isSpeechPlaying, usingFallback } = usePollyTTS();

  useEffect(() => {
    loadRecipe();
    // Keep screen on during cooking (experimental API)
    if ('wakeLock' in navigator) {
      (navigator as any).wakeLock.request('screen').catch((err: any) => {
        console.log('Wake Lock error:', err);
      });
    }
  }, [unwrappedParams.id]);

  // Create history session when recipe loads
  useEffect(() => {
    const initializeSession = async () => {
      if (recipe && !sessionId) {
        try {
          const history = await createRecipeHistory({
            recipeId: recipe.id,
            servings: recipe.servings,
          });
          setSessionId(history.id);
          console.log('[Guide] Created history session:', history.id);
        } catch (error) {
          console.error('[Guide] Error creating history session:', error);
        }
      }
    };

    initializeSession();
  }, [recipe, sessionId]);

  // Actualizar contexto cuando cambia el estado
  useEffect(() => {
    if (recipe) {
      setGuideState({
        isInGuide: true,
        recipeId: recipe.id,
        currentStep,
        sessionId,
        recipe,
      });
    }

    // Cleanup al salir
    return () => {
      setGuideState({
        isInGuide: false,
        recipeId: null,
        currentStep: null,
        sessionId: null,
        recipe: null,
      });
    };
  }, [recipe, currentStep, sessionId, setGuideState]);

  useEffect(() => {
    // Timer countdown
    const interval = setInterval(() => {
      setActiveTimers(timers =>
        timers.map(timer => ({
          ...timer,
          remaining: Math.max(0, timer.remaining - 1),
        })).filter(timer => timer.remaining > 0)
      );
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  const loadRecipe = async () => {
    try {
      console.log('[Guide] Loading recipe:', unwrappedParams.id);

      const data = await recipeService.getRecipeById(unwrappedParams.id);
      console.log('[Guide] Recipe data:', data);
      console.log('[Guide] Recipe steps with appliances:', data?.steps.map(s => ({ step: s.step, appliances: s.appliancesUsed })));

      if (data) {
        setRecipe(data);
        // Trigger pre-flight check after recipe loads
        if (!preFlightComplete) {
          runPreFlightApplianceCheck(data);
        }
      } else {
        console.error('[Guide] Recipe not found:', unwrappedParams.id);
      }
    } catch (error) {
      console.error('[Guide] Error loading recipe:', error);
    }
  };

  const showToast = (message: string) => {
    setToastMessage(message);
    setTimeout(() => setToastMessage(null), 3000);
  };

  const runPreFlightApplianceCheck = async (recipeData: Recipe) => {
    setIsCheckingAppliances(true);

    try {
      // 1. Collect ALL unique FUNCTIONALITIES needed across ALL steps
      const allFunctionalitiesNeeded = new Set<string>();
      recipeData.steps.forEach(step => {
        if (step.appliancesUsed) {
          step.appliancesUsed.forEach(functionality => allFunctionalitiesNeeded.add(functionality));
        }
      });

      if (allFunctionalitiesNeeded.size === 0) {
        setPreFlightComplete(true);
        setIsCheckingAppliances(false);
        return;
      }

      // 2. For each functionality, check if user has ANY appliance that can perform it
      for (const functionality of Array.from(allFunctionalitiesNeeded)) {
        const canPerformFunctionality = await checkUserHasFunctionality(functionality);

        if (canPerformFunctionality.hasCapability && canPerformFunctionality.matchingAppliances.length > 0) {
          // User already has an appliance for this functionality
          // Use the first matching appliance for display
          const matchingAppliance = canPerformFunctionality.matchingAppliances[0];
          setFunctionalityToAppliance(prev => {
            const newMap = new Map(prev);
            newMap.set(functionality, { id: matchingAppliance.id, name: matchingAppliance.name });
            return newMap;
          });
        } else {
          // User doesn't have ANY appliance for this functionality
          // Get list of appliances that CAN perform it
          const compatibleAppliances = await getAppliancesForFunctionality(functionality);

          // Ask user about each appliance
          let foundAppliance = false;
          for (const appliance of compatibleAppliances) {
            const userHasIt = await askUserAboutAppliance(appliance.id, appliance.name);

            if (userHasIt) {
              // Add to kitchen with toast notification
              await addApplianceToKitchenLocal(appliance.id, appliance.name);
              showToast(`✓ ${appliance.name} agregado a Mi Cocina`);

              // Track this appliance for this functionality
              setFunctionalityToAppliance(prev => {
                const newMap = new Map(prev);
                newMap.set(functionality, { id: appliance.id, name: appliance.name });
                return newMap;
              });

              foundAppliance = true;
              break; // Stop asking, we found one!
            }
          }

          // If no appliance found, adapt ALL steps that need this functionality
          if (!foundAppliance) {
            await adaptAllStepsForMissingFunctionality(functionality, recipeData);
          }
        }
      }

      setPreFlightComplete(true);
    } catch (error) {
      console.error('[Guide] Pre-flight appliance check failed:', error);
      setPreFlightComplete(true); // Continue anyway
    } finally {
      setIsCheckingAppliances(false);
    }
  };

  const checkUserHasFunctionality = async (functionality: string): Promise<{hasCapability: boolean; matchingAppliances: any[]}> => {
    try {
      // Import appliance services
      const { checkUserHasFunctionality: checkFunc } = await import('@/lib/db/services/applianceService');
      const { getAllUserAppliances } = await import('@/lib/db/services/userApplianceService');

      const userAppliances = await getAllUserAppliances();
      console.log('[Guide] User appliances for functionality check:', userAppliances);
      const userApplianceIds = userAppliances.map(ua => ua.applianceId);

      console.log(`[Guide] Checking functionality "${functionality}"`, {
        totalUserAppliances: userAppliances.length,
        userApplianceIds,
        fullUserAppliances: userAppliances
      });

      const result = await checkFunc(functionality, userApplianceIds);
      console.log(`[Guide] Result for functionality "${functionality}":`, {
        hasCapability: result.hasCapability,
        matchingCount: result.matchingAppliances.length,
        matchingAppliances: result.matchingAppliances.map(a => ({ id: a.id, name: a.name, functionalities: a.functionalities }))
      });
      return result;
    } catch (error) {
      console.error('[Guide] Error checking functionality:', error);
      return { hasCapability: false, matchingAppliances: [] };
    }
  };

  const getAppliancesForFunctionality = async (functionality: string): Promise<Array<{id: string; name: string}>> => {
    try {
      const { getAppliancesByFunctionality } = await import('@/lib/db/services/applianceService');

      const appliances = await getAppliancesByFunctionality(functionality);

      console.log(`[Guide] Found ${appliances.length} appliances for functionality "${functionality}":`, appliances.map(a => a.name));

      // Return only common appliances first, then uncommon ones
      const sorted = appliances.sort((a, b) => {
        if (a.isCommon && !b.isCommon) return -1;
        if (!a.isCommon && b.isCommon) return 1;
        return 0;
      });

      const result = sorted.map(a => ({ id: a.id, name: a.name }));
      console.log(`[Guide] Will ask user about these appliances in order:`, result);
      return result;
    } catch (error) {
      console.error('[Guide] Error getting appliances for functionality:', error);
      return [];
    }
  };

  const askUserAboutAppliance = async (applianceId: string, applianceName: string): Promise<boolean> => {
    return new Promise((resolve) => {
      setCurrentCheckingAppliance({ id: applianceId, name: applianceName });
      setShowApplianceModal(true);

      // Store resolver in window for modal to call
      (window as any).__applianceModalResolve = (hasIt: boolean) => {
        setShowApplianceModal(false);
        setCurrentCheckingAppliance(null);
        resolve(hasIt);
      };
    });
  };

  const addApplianceToKitchenLocal = async (applianceId: string, applianceName: string) => {
    try {
      const { addUserAppliance } = await import('@/lib/db/services/userApplianceService');
      await addUserAppliance({ applianceId });
      console.log(`[Guide] Added ${applianceName} (${applianceId}) to Mi Cocina`);
    } catch (error) {
      console.error('[Guide] Error adding appliance to kitchen:', error);
      throw error;
    }
  };

  const adaptAllStepsForMissingFunctionality = async (missingFunctionality: string, recipeData: Recipe) => {
    try {
      // Find all steps that use this functionality
      const stepsToAdapt = recipeData.steps.filter(step =>
        step.appliancesUsed?.includes(missingFunctionality)
      );

      console.log(`[Guide] Adapting ${stepsToAdapt.length} steps for missing functionality: ${missingFunctionality}`);

      // Adapt each step via LLM
      for (const step of stepsToAdapt) {
        try {
          // Get full recipe context for better adaptation
          const recipeContext = {
            recipeName: recipeData.name,
            recipeDescription: recipeData.description,
            allSteps: recipeData.steps,
            currentStepNumber: step.step,
            currentStepInstruction: step.instruction,
            missingFunctionality,
            ingredientsInStep: step.ingredientsUsed || [],
          };

          // Call Adapt Recipe Step API to adapt the step
          const response = await fetch('/api/adapt-recipe-step', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              sessionId: sessionId || `guide-${recipeData.id}-${Date.now()}`,
              stepNumber: step.step,
              originalInstruction: step.instruction,
              missingFunctionality,
              recipeContext,
            }),
          });

          if (!response.ok) {
            throw new Error('API call failed');
          }

          const data = await response.json();

          // Extract adaptation from LLM response
          const adaptation = {
            stepNumber: step.step,
            originalFunctionality: missingFunctionality,
            adaptedInstruction: data.adaptedInstruction || step.instruction,
            timingAdjustment: data.timingAdjustment || null,
            temperatureAdjustment: data.temperatureAdjustment || null,
            warnings: data.warnings || [],
            tips: data.tips || [],
            timestamp: new Date().toISOString(),
          };

          // Store adaptation in map
          setStepAdaptations(prev => {
            const newMap = new Map(prev);
            newMap.set(step.step, adaptation);
            return newMap;
          });

          console.log(`[Guide] Step ${step.step} adapted successfully`);
        } catch (error) {
          console.error(`[Guide] Error adapting step ${step.step}:`, error);

          // Fallback adaptation
          const fallbackAdaptation = {
            stepNumber: step.step,
            originalFunctionality: missingFunctionality,
            adaptedInstruction: step.instruction,
            warnings: [`No se pudo adaptar automáticamente este paso. Necesitas un dispositivo con funcionalidad "${missingFunctionality}".`],
            tips: ['Considera buscar métodos alternativos o consultar con un experto culinario.'],
            timestamp: new Date().toISOString(),
          };

          setStepAdaptations(prev => {
            const newMap = new Map(prev);
            newMap.set(step.step, fallbackAdaptation);
            return newMap;
          });
        }
      }
    } catch (error) {
      console.error('[Guide] Error in adaptAllStepsForMissingFunctionality:', error);
    }
  };

  const speakCurrentStep = useCallback(() => {
    if (!recipe) return;
    const step = recipe.steps.find(s => s.step === currentStep);
    if (step) {
      speak(step.instruction);
    }
  }, [recipe, currentStep, speak]);

  // Auto-play TTS when step changes
  useEffect(() => {
    if (recipe && !isPaused) {
      speakCurrentStep();
    }
  }, [currentStep, recipe, isPaused, speakCurrentStep]);

  function handleVoiceCommand(command: VoiceCommand, text: string) {
    switch (command) {
      case 'next':
        goToNextStep();
        break;
      case 'previous':
        goToPreviousStep();
        break;
      case 'repeat':
        speakCurrentStep();
        break;
      case 'pause':
        setIsPaused(true);
        stopSpeech();
        break;
      case 'resume':
        setIsPaused(false);
        break;
      case 'help':
        setShowAllSteps(true);
        break;
      case 'timer':
        // Extract duration from text (simple parsing)
        const match = text.match(/(\d+)\s*(minuto|segundo)/i);
        if (match) {
          const duration = parseInt(match[1]);
          const unit = match[2].toLowerCase();
          const seconds = unit.startsWith('minuto') ? duration * 60 : duration;
          addTimer(seconds);
        }
        break;
    }
  }

  const goToNextStep = () => {
    if (recipe && currentStep < recipe.steps.length) {
      setCurrentStep(currentStep + 1);
    }
  };

  const goToPreviousStep = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const addTimer = (seconds: number, label?: string) => {
    setActiveTimers([...activeTimers, {
      id: nextTimerId,
      duration: seconds,
      remaining: seconds,
    }]);
    setNextTimerId(nextTimerId + 1);
    console.log(`[Guide] Timer added: ${seconds}s${label ? ` - ${label}` : ''}`);
  };

  // Escuchar evento de crear timer desde voz
  useEffect(() => {
    const handleCreateTimer = (e: CustomEvent) => {
      const { duration, label } = e.detail;
      const seconds = duration * 60; // duration viene en minutos
      addTimer(seconds, label);
    };

    window.addEventListener('create-timer' as any, handleCreateTimer);
    return () => window.removeEventListener('create-timer' as any, handleCreateTimer);
  }, [activeTimers, nextTimerId]);

  // Escuchar evento de variante creada desde voz
  useEffect(() => {
    const handleVariantCreated = (e: CustomEvent) => {
      const { variantId } = e.detail;
      console.log(`[Guide] Switching to variant: ${variantId}`);
      switchToVariantContext(variantId);
      // TODO: Recargar receta con variante aplicada
      // Para ahora, solo actualizamos el estado del contexto
    };

    window.addEventListener('recipe-variant-created' as any, handleVariantCreated);
    return () => window.removeEventListener('recipe-variant-created' as any, handleVariantCreated);
  }, [switchToVariantContext]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const handleComplete = async () => {
    if (!sessionId || !recipe) return;

    if (confirm('¡Felicidades! ¿Completaste la receta?')) {
      try {
        // Check if this is the first time cooking this recipe
        const cookCount = await getRecipeCookCount(recipe.id);
        const isFirstTime = cookCount === 0; // Current session not counted yet

        // Check if we should ask for rating
        if (isFirstTime && settings.askForRating) {
          // Show rating modal
          setShowRatingModal(true);
        } else {
          // Save without rating
          await completeRecipeHistory(sessionId);
          router.push(`/recipes/${unwrappedParams.id}`);
        }
      } catch (error) {
        console.error('[Guide] Error completing recipe:', error);
        // Still redirect on error
        router.push(`/recipes/${unwrappedParams.id}`);
      }
    }
  };

  const handleRatingSubmit = async (rating: number, notes?: string) => {
    if (!sessionId) return;

    try {
      await completeRecipeHistory(sessionId, {
        rating,
        notes,
        wouldMakeAgain: rating >= 4, // Auto-infer from rating
      });
      setShowRatingModal(false);
      router.push(`/recipes/${unwrappedParams.id}`);
    } catch (error) {
      console.error('[Guide] Error saving rating:', error);
      setShowRatingModal(false);
      router.push(`/recipes/${unwrappedParams.id}`);
    }
  };

  const handleRatingSkip = async () => {
    if (!sessionId) return;

    try {
      await completeRecipeHistory(sessionId);
      setShowRatingModal(false);
      router.push(`/recipes/${unwrappedParams.id}`);
    } catch (error) {
      console.error('[Guide] Error completing recipe:', error);
      setShowRatingModal(false);
      router.push(`/recipes/${unwrappedParams.id}`);
    }
  };

  // Escuchar comandos de cocina desde el voice server
  useEffect(() => {
    const handleCookingCommand = (event: CustomEvent) => {
      const { command, originalText } = event.detail;
      console.log('[Guide] Comando de cocina recibido:', command, originalText);

      switch (command) {
        case 'siguiente':
          goToNextStep();
          break;
        case 'anterior':
          goToPreviousStep();
          break;
        case 'repetir':
          speakCurrentStep();
          break;
        case 'pausar':
          setIsPaused(true);
          stopSpeech();
          break;
        case 'reanudar':
          setIsPaused(false);
          speakCurrentStep();
          break;
        case 'timer':
          // Extraer duración del texto original
          const match = originalText.match(/(\d+)\s*(minuto|minutos|segundo|segundos|hora|horas)/i);
          if (match) {
            const value = parseInt(match[1]);
            const unit = match[2].toLowerCase();
            let minutes = value;
            if (unit.includes('segundo')) minutes = value / 60;
            if (unit.includes('hora')) minutes = value * 60;
            addTimer(Math.round(minutes));
          }
          break;
      }
    };

    window.addEventListener('cooking-command', handleCookingCommand as EventListener);
    return () => window.removeEventListener('cooking-command', handleCookingCommand as EventListener);
  }, [recipe, currentStep, speak, stopSpeech]);

  if (!recipe) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[var(--color-background)]">
        <div className="text-center">
          <div className="text-6xl mb-4">🔍</div>
          <p className="text-xl text-[var(--color-text-secondary)]">Cargando guía...</p>
        </div>
      </div>
    );
  }

  const currentStepData = recipe.steps.find(s => s.step === currentStep);
  const progress = (currentStep / recipe.steps.length) * 100;

  return (
    <div className="min-h-screen bg-[var(--color-background)] pb-safe">
      {/* Rating Modal */}
      <RatingModal
        isOpen={showRatingModal}
        recipeName={recipe.name}
        onClose={() => setShowRatingModal(false)}
        onSkip={handleRatingSkip}
        onSubmit={handleRatingSubmit}
      />

      {/* TTS Loading Overlay */}
      {isSpeechLoading && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
          <Card variant="elevated" padding="lg" className="text-center">
            <div className="text-6xl mb-4 animate-pulse">🎙️</div>
            <p className="text-xl font-semibold text-[var(--color-text-primary)] mb-2">
              Preparando audio...
            </p>
            <p className="text-sm text-[var(--color-text-secondary)]">
              {usingFallback ? 'Usando voz sintética' : 'Generando voz natural con Amazon Polly'}
            </p>
          </Card>
        </div>
      )}

      {/* Minimal Header */}
      <div className="sticky top-0 z-10 bg-[var(--color-surface-elevated)] border-b border-[var(--color-border)] safe-area-top">
        <div className="container mx-auto max-w-3xl px-4 py-3">
          <div className="flex items-center justify-between mb-2">
            <button
              onClick={() => {
                if (confirm('¿Seguro que quieres salir? Se perderá el progreso.')) {
                  router.back();
                }
              }}
              className="text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]"
            >
              ✕ Salir
            </button>
            <span className="text-sm font-medium text-[var(--color-text-secondary)]">
              Paso {currentStep} de {recipe.steps.length}
            </span>
            <button
              onClick={() => setShowAllSteps(!showAllSteps)}
              className="text-[var(--color-primary)] hover:underline text-sm"
            >
              {showAllSteps ? 'Ocultar' : 'Ver todos'}
            </button>
          </div>
          {/* Progress Bar */}
          <div className="w-full h-2 bg-[var(--color-surface)] rounded-full overflow-hidden">
            <div
              className="h-full bg-[var(--color-primary)] transition-all duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      </div>

      <div className="container mx-auto max-w-3xl px-4 py-6">
        {/* Active Timers */}
        {activeTimers.length > 0 && (
          <div className="mb-6 space-y-2">
            {activeTimers.map(timer => (
              <Card key={timer.id} variant="elevated" padding="md" className="bg-[var(--color-warning)]/10 border-2 border-[var(--color-warning)]">
                <div className="flex items-center justify-between">
                  <span className="font-semibold">⏱ Timer</span>
                  <span className="text-2xl font-bold">{formatTime(timer.remaining)}</span>
                </div>
              </Card>
            ))}
          </div>
        )}

        {/* All Steps Overview */}
        {showAllSteps ? (
          <div className="space-y-4 mb-6">
            {recipe.steps.map((step) => (
              <Card
                key={step.step}
                variant={step.step === currentStep ? 'elevated' : 'outlined'}
                padding="md"
                className={step.step === currentStep ? 'border-2 border-[var(--color-primary)]' : ''}
              >
                <div className="flex gap-4">
                  <div className={`flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center font-bold ${
                    step.step === currentStep
                      ? 'bg-[var(--color-primary)] text-white'
                      : step.step < currentStep
                      ? 'bg-[var(--color-success)] text-white'
                      : 'bg-[var(--color-surface)] text-[var(--color-text-secondary)]'
                  }`}>
                    {step.step < currentStep ? '✓' : step.step}
                  </div>
                  <div className="flex-1">
                    <p className={step.step === currentStep ? 'font-semibold' : ''}>
                      {step.instruction}
                    </p>
                    {step.duration && (
                      <p className="text-sm text-[var(--color-text-secondary)] mt-1">
                        ⏱ ~{step.duration} minutos
                      </p>
                    )}
                  </div>
                </div>
              </Card>
            ))}
          </div>
        ) : (
          /* Current Step - Large and Readable */
          <div className="mb-8">
            <Card variant="elevated" padding="lg">
              <div className="text-center mb-6">
                <div className="w-16 h-16 mx-auto mb-4 bg-[var(--color-primary)] text-white rounded-full flex items-center justify-center text-2xl font-bold">
                  {currentStep}
                </div>
                <h2 className="text-2xl md:text-3xl font-bold leading-relaxed text-[var(--color-text-primary)]">
                  {stepAdaptations.has(currentStep)
                    ? stepAdaptations.get(currentStep)?.adaptedInstruction
                    : currentStepData?.instruction}
                </h2>
              </div>

              {/* Adaptation Warning Card */}
              {stepAdaptations.has(currentStep) && (
                <Card variant="outlined" padding="md" className="mb-4 bg-[var(--color-warning)]/10 border-2 border-[var(--color-warning)]">
                  <div className="flex items-start gap-3">
                    <span className="text-2xl">🔄</span>
                    <div className="flex-1">
                      <h4 className="font-semibold text-sm text-[var(--color-warning)] mb-1">
                        Paso Adaptado
                      </h4>
                      <p className="text-sm text-[var(--color-text-secondary)] mb-2">
                        Este paso ha sido modificado porque no tienes el electrodoméstico original
                      </p>
                      {stepAdaptations.get(currentStep)?.warnings && stepAdaptations.get(currentStep)?.warnings.length > 0 && (
                        <div className="text-xs text-[var(--color-text-secondary)] mt-2">
                          {stepAdaptations.get(currentStep)?.warnings.map((warning: string, idx: number) => (
                            <div key={idx}>⚠️ {warning}</div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </Card>
              )}

              {currentStepData?.duration && (
                <div className="flex items-center justify-center gap-2 mb-4">
                  <Badge variant="info" size="md">
                    ⏱ ~{currentStepData.duration} minutos
                  </Badge>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => addTimer(currentStepData.duration! * 60)}
                  >
                    Activar Timer
                  </Button>
                </div>
              )}

              {/* Ingredients and Appliances Used in This Step */}
              {((currentStepData?.ingredientsUsed?.length ?? 0) > 0 || (currentStepData?.appliancesUsed?.length ?? 0) > 0) && (
                <div className="mb-4 space-y-3">
                  {/* Ingredients for this step */}
                  {(currentStepData?.ingredientsUsed?.length ?? 0) > 0 && (
                    <Card variant="outlined" padding="sm" className="bg-[var(--color-primary-light)]">
                      <div className="flex items-start gap-3">
                        <span className="text-xl">🥘</span>
                        <div className="flex-1">
                          <h4 className="font-semibold text-xs text-[var(--color-text-primary)] mb-2">
                            Ingredientes para este paso
                          </h4>
                          <div className="flex flex-wrap gap-2">
                            {currentStepData?.ingredientsUsed?.map((ingId) => {
                              const ingredient = recipe?.ingredients.find(i => i.ingredientId === ingId);
                              return ingredient ? (
                                <Badge key={ingId} variant="success" size="sm">
                                  {ingredient.displayName}
                                </Badge>
                              ) : null;
                            })}
                          </div>
                        </div>
                      </div>
                    </Card>
                  )}

                  {/* Appliances for this step */}
                  {(currentStepData?.appliancesUsed?.length ?? 0) > 0 && (
                    <Card variant="outlined" padding="sm" className="bg-[var(--color-secondary-light)]/20">
                      <div className="flex items-start gap-3">
                        <span className="text-xl">🔧</span>
                        <div className="flex-1">
                          <h4 className="font-semibold text-xs text-[var(--color-text-primary)] mb-2">
                            Electrodomésticos necesarios
                          </h4>
                          <div className="flex flex-wrap gap-2">
                            {currentStepData?.appliancesUsed?.map((functionalityId) => {
                              // Try to get the user's actual appliance for this functionality
                              const userAppliance = functionalityToAppliance.get(functionalityId);

                              // Fallback to generic functionality names if not found
                              const functionalityNames: Record<string, string> = {
                                'stovetop_cooking': 'Estufa/Parrilla',
                                'oven_baking': 'Horno',
                                'blending': 'Licuadora',
                                'microwave_heating': 'Microondas',
                                'grilling': 'Parrilla/Grill',
                                'food_processing': 'Procesador',
                                'mixing': 'Batidora',
                                'refrigerating': 'Refrigerador',
                                'freezing': 'Congelador',
                                'boiling_water': 'Hervir agua',
                              };

                              const displayName = userAppliance?.name || functionalityNames[functionalityId] || functionalityId;

                              return (
                                <Badge key={functionalityId} variant="default" size="sm">
                                  {displayName}
                                </Badge>
                              );
                            })}
                          </div>
                        </div>
                      </div>
                    </Card>
                  )}
                </div>
              )}

              {currentStepData?.tip && (
                <Card variant="outlined" padding="md" className="mb-4 bg-[var(--color-accent)]">
                  <div className="flex items-start gap-3">
                    <span className="text-2xl">💡</span>
                    <div>
                      <h4 className="font-semibold text-sm text-[var(--color-text-primary)] mb-1">
                        Consejo
                      </h4>
                      <p className="text-sm text-[var(--color-text-secondary)]">
                        {currentStepData.tip}
                      </p>
                    </div>
                  </div>
                </Card>
              )}

              {currentStepData?.warning && (
                <Card variant="outlined" padding="md" className="bg-[var(--color-error)]/10 border-2 border-[var(--color-error)]">
                  <div className="flex items-start gap-3">
                    <span className="text-2xl">⚠️</span>
                    <div>
                      <h4 className="font-semibold text-sm text-[var(--color-error)] mb-1">
                        Importante
                      </h4>
                      <p className="text-sm text-[var(--color-text-primary)]">
                        {currentStepData.warning}
                      </p>
                    </div>
                  </div>
                </Card>
              )}
            </Card>

            {/* Tap Anywhere Hint */}
            <p className="text-center text-sm text-[var(--color-text-secondary)] mt-4">
              👆 Toca la pantalla para avanzar
            </p>
          </div>
        )}

        {/* Voice Recognition Status */}
        {isSupported && (
          <Card variant="outlined" padding="sm" className="mb-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className={`text-2xl ${isListening ? 'animate-pulse' : ''}`}>
                  {isListening ? '🎤' : '🔇'}
                </span>
                <span className="text-sm">
                  {isListening ? `Escuchando... "${transcript}"` : 'Control por voz'}
                </span>
              </div>
              <button
                onClick={toggleListening}
                className="text-sm text-[var(--color-primary)] hover:underline"
              >
                {isListening ? 'Desactivar' : 'Activar'}
              </button>
            </div>
          </Card>
        )}

        {/* Navigation Controls */}
        <div className="grid grid-cols-4 gap-3 mb-6">
          <button
            onClick={goToPreviousStep}
            disabled={currentStep === 1}
            className="flex flex-col items-center justify-center gap-2 p-4 rounded-xl bg-[var(--color-surface)] hover:bg-[var(--color-border)] transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
          >
            <span className="text-2xl">⏮</span>
            <span className="text-xs">Anterior</span>
          </button>

          <button
            onClick={() => setIsPaused(!isPaused)}
            className="flex flex-col items-center justify-center gap-2 p-4 rounded-xl bg-[var(--color-surface)] hover:bg-[var(--color-border)] transition-colors"
          >
            <span className="text-2xl">{isPaused ? '▶️' : '⏸'}</span>
            <span className="text-xs">{isPaused ? 'Reanudar' : 'Pausar'}</span>
          </button>

          <button
            onClick={speakCurrentStep}
            disabled={isSpeechLoading}
            className="flex flex-col items-center justify-center gap-2 p-4 rounded-xl bg-[var(--color-surface)] hover:bg-[var(--color-border)] transition-colors disabled:opacity-50 disabled:cursor-not-allowed relative"
          >
            <span className="text-2xl">{isSpeechPlaying ? '🔊' : '🔇'}</span>
            <span className="text-xs">Repetir</span>
            {usingFallback && (
              <span className="absolute top-1 right-1 text-xs">⚠️</span>
            )}
          </button>

          {currentStep < recipe.steps.length ? (
            <button
              onClick={goToNextStep}
              className="flex flex-col items-center justify-center gap-2 p-4 rounded-xl bg-[var(--color-primary)] text-white hover:bg-[var(--color-primary-dark)] transition-colors"
            >
              <span className="text-2xl">⏭</span>
              <span className="text-xs">Siguiente</span>
            </button>
          ) : (
            <button
              onClick={handleComplete}
              className="flex flex-col items-center justify-center gap-2 p-4 rounded-xl bg-[var(--color-success)] text-white hover:opacity-90 transition-opacity"
            >
              <span className="text-2xl">✓</span>
              <span className="text-xs">Terminar</span>
            </button>
          )}
        </div>

        {/* Help Section */}
        <Card variant="outlined" padding="md" className="bg-[var(--color-accent)]">
          <h4 className="font-semibold mb-2 text-[var(--color-text-primary)]">
            ¿Necesitas ayuda?
          </h4>
          <p className="text-sm text-[var(--color-text-secondary)] mb-3">
            Comandos de voz disponibles:
          </p>
          <div className="grid grid-cols-2 gap-2 text-xs">
            <div>• "Siguiente"</div>
            <div>• "Anterior"</div>
            <div>• "Repetir"</div>
            <div>• "Pausa"</div>
            <div>• "Timer 5 minutos"</div>
            <div>• "Ayuda"</div>
          </div>
        </Card>
      </div>

      {/* Tap Anywhere to Advance */}
      {!showAllSteps && (
        <div
          className="fixed inset-0 -z-10"
          onClick={() => {
            if (currentStep < recipe.steps.length) {
              goToNextStep();
            }
          }}
        />
      )}

      {/* Pre-Flight Checking Modal */}
      {isCheckingAppliances && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
          <Card variant="elevated" padding="lg" className="text-center max-w-md">
            <div className="text-6xl mb-4 animate-pulse">🔍</div>
            <p className="text-xl font-semibold mb-2">
              Verificando electrodomésticos necesarios...
            </p>
            <p className="text-sm text-[var(--color-text-secondary)]">
              Esto solo tomará un momento
            </p>
          </Card>
        </div>
      )}

      {/* Appliance Check Modal */}
      {showApplianceModal && currentCheckingAppliance && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <Card variant="elevated" padding="lg" className="max-w-md w-full">
            <div className="text-center mb-6">
              <div className="text-6xl mb-4">🔧</div>
              <h3 className="text-2xl font-bold mb-2">
                ¿Tienes {currentCheckingAppliance.name}?
              </h3>
              <p className="text-sm text-[var(--color-text-secondary)]">
                Esta receta requiere este electrodoméstico para algunos pasos
              </p>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Button
                variant="secondary"
                size="lg"
                fullWidth
                onClick={() => {
                  if ((window as any).__applianceModalResolve) {
                    (window as any).__applianceModalResolve(false);
                  }
                }}
              >
                No, no lo tengo
              </Button>
              <Button
                variant="primary"
                size="lg"
                fullWidth
                onClick={() => {
                  if ((window as any).__applianceModalResolve) {
                    (window as any).__applianceModalResolve(true);
                  }
                }}
              >
                Sí, lo tengo
              </Button>
            </div>
          </Card>
        </div>
      )}

      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-safe left-4 right-4 z-50 flex justify-center pointer-events-none">
          <Card
            variant="elevated"
            padding="md"
            className="bg-[var(--color-success)] text-white shadow-lg animate-fadeInUp"
          >
            <p className="font-semibold text-center">{toastMessage}</p>
          </Card>
        </div>
      )}
    </div>
  );
}
