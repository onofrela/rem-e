'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { api } from '@/lib/api/mock-api';
import { Recipe } from '@/lib/utils/mock-data';
import { useVoice, VoiceCommand } from '@/lib/hooks/useVoice';
import { useElevenLabsTTS } from '@/lib/hooks/useElevenLabsTTS';

export default function CookingGuidePage({ params }: { params: Promise<{ id: string }> }) {
  const router = useRouter();
  const unwrappedParams = React.use(params);
  const [recipe, setRecipe] = useState<Recipe | null>(null);
  const [currentStep, setCurrentStep] = useState(1);
  const [isPaused, setIsPaused] = useState(false);
  const [showAllSteps, setShowAllSteps] = useState(false);
  const [activeTimers, setActiveTimers] = useState<Array<{ id: number; duration: number; remaining: number }>>([]);
  const [nextTimerId, setNextTimerId] = useState(1);

  // Voice control
  const { isListening, isSupported, transcript, toggleListening } = useVoice({
    onCommand: handleVoiceCommand,
    language: 'es-MX',
    continuous: true,
  });

  // Text-to-speech with ElevenLabs
  const { speak, stop: stopSpeech, isLoading: isSpeechLoading, isPlaying: isSpeechPlaying, usingFallback } = useElevenLabsTTS();

  useEffect(() => {
    loadRecipe();
    // Keep screen on during cooking (experimental API)
    if ('wakeLock' in navigator) {
      (navigator as any).wakeLock.request('screen').catch((err: any) => {
        console.log('Wake Lock error:', err);
      });
    }
  }, [unwrappedParams.id]);

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
    const data = await api.getRecipe(unwrappedParams.id);
    if (data) {
      setRecipe(data);
    }
  };

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

  const speakCurrentStep = () => {
    if (!recipe) return;
    const step = recipe.steps.find(s => s.step === currentStep);
    if (step) {
      speak(step.instruction);
    }
  };

  const goToNextStep = () => {
    if (recipe && currentStep < recipe.steps.length) {
      setCurrentStep(currentStep + 1);
      speakCurrentStep();
    }
  };

  const goToPreviousStep = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
      speakCurrentStep();
    }
  };

  const addTimer = (seconds: number) => {
    setActiveTimers([...activeTimers, {
      id: nextTimerId,
      duration: seconds,
      remaining: seconds,
    }]);
    setNextTimerId(nextTimerId + 1);
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const handleComplete = () => {
    if (confirm('¡Felicidades! ¿Completaste la receta?')) {
      router.push(`/recipes/${unwrappedParams.id}`);
    }
  };

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
                  {currentStepData?.instruction}
                </h2>
              </div>

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
            onClick={isSpeechPlaying ? stopSpeech : speakCurrentStep}
            disabled={isSpeechLoading}
            className="flex flex-col items-center justify-center gap-2 p-4 rounded-xl bg-[var(--color-surface)] hover:bg-[var(--color-border)] transition-colors disabled:opacity-50"
          >
            <span className={`text-2xl ${isSpeechLoading ? 'animate-pulse' : ''}`}>
              {isSpeechLoading ? '⏳' : isSpeechPlaying ? '⏹' : '🔊'}
            </span>
            <span className="text-xs">
              {isSpeechLoading ? 'Cargando' : isSpeechPlaying ? 'Detener' : 'Repetir'}
            </span>
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
    </div>
  );
}
