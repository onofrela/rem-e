'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { MainLayout } from '@/components/layout';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { WeeklyPlanView } from '@/components/planning';
import { getActiveMealPlan, deleteMealPlan, createMealPlan } from '@/lib/db/services/mealPlanService';
import { generatePlanWithLLM } from '@/lib/db/services/planningAlgorithmService';
import type { MealPlan } from '@/lib/db/schemas/types';

export default function PlanPage() {
  const router = useRouter();
  const [activePlan, setActivePlan] = useState<MealPlan | null>(null);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [llmPrompt, setLlmPrompt] = useState('');
  const [showLlmInput, setShowLlmInput] = useState(false);

  useEffect(() => {
    loadActivePlan();
  }, []);

  const loadActivePlan = async () => {
    setLoading(true);
    const plan = await getActiveMealPlan();
    setActivePlan(plan);
    setLoading(false);
  };

  const handleStartQuestionnaire = () => {
    router.push('/plan/questionnaire');
  };

  const handleGenerateLLM = async () => {
    if (!llmPrompt.trim()) return;

    setGenerating(true);
    try {
      const plan = await generatePlanWithLLM(llmPrompt);
      await createMealPlan(plan);
      await loadActivePlan();
      setShowLlmInput(false);
      setLlmPrompt('');
    } catch (error) {
      console.error('Error generating plan with LLM:', error);
      alert('Error al generar el plan. Por favor intenta de nuevo.');
    } finally {
      setGenerating(false);
    }
  };

  const handleDeletePlan = async () => {
    if (!activePlan) return;

    const confirmed = confirm('¿Seguro que quieres eliminar este plan?');
    if (!confirmed) return;

    await deleteMealPlan(activePlan.id);
    setActivePlan(null);
  };

  if (loading) {
    return (
      <MainLayout>
        <div className="flex items-center justify-center min-h-screen">
          <div className="animate-spin text-6xl">⏳</div>
        </div>
      </MainLayout>
    );
  }

  // No active plan - show mode selector
  if (!activePlan) {
    return (
      <MainLayout>
        <div className="min-h-screen pb-24 md:pb-8">
          <div className="py-8 px-6">
            <div className="container mx-auto max-w-4xl">
              <h1 className="text-4xl font-bold mb-2">📅 Planificador Semanal</h1>
              <p className="text-lg text-gray-600">Crea tu plan de comidas personalizado</p>
            </div>
          </div>

          <div className="container mx-auto max-w-4xl px-6 -mt-4">
            {!showLlmInput ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Card
                  variant="elevated"
                  padding="lg"
                  hoverable
                  className="text-center cursor-pointer"
                  onClick={handleStartQuestionnaire}
                >
                  <span className="text-7xl mb-4 block">📝</span>
                  <h2 className="text-2xl font-bold mb-3">Cuestionario Guiado</h2>
                  <p className="text-gray-600 mb-4">
                    Responde 5-7 preguntas rápidas para un plan personalizado
                  </p>
                  <Button variant="primary" size="lg" fullWidth>
                    Comenzar Cuestionario
                  </Button>
                </Card>

                <Card
                  variant="elevated"
                  padding="lg"
                  hoverable
                  className="text-center cursor-pointer"
                  onClick={() => setShowLlmInput(true)}
                >
                  <span className="text-7xl mb-4 block">🤖</span>
                  <h2 className="text-2xl font-bold mb-3">Describir con IA</h2>
                  <p className="text-gray-600 mb-4">
                    Dile a la IA lo que quieres en lenguaje natural
                  </p>
                  <Button variant="secondary" size="lg" fullWidth>
                    Usar IA
                  </Button>
                </Card>
              </div>
            ) : (
              <Card variant="elevated" padding="lg">
                <h2 className="text-2xl font-bold mb-4">Describe tu plan ideal</h2>
                <p className="text-gray-600 mb-4">
                  Ejemplo: &quot;Quiero un plan vegetariano para 2 personas, enfocado en perder peso&quot;
                </p>

                <textarea
                  value={llmPrompt}
                  onChange={(e) => setLlmPrompt(e.target.value)}
                  placeholder="Describe qué tipo de plan semanal quieres..."
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl resize-none focus:outline-none focus:ring-2 focus:ring-primary mb-4"
                  rows={4}
                />

                <div className="flex gap-3">
                  <Button
                    variant="ghost"
                    size="lg"
                    onClick={() => {
                      setShowLlmInput(false);
                      setLlmPrompt('');
                    }}
                    disabled={generating}
                  >
                    Cancelar
                  </Button>
                  <Button
                    variant="primary"
                    size="lg"
                    onClick={handleGenerateLLM}
                    disabled={!llmPrompt.trim() || generating}
                    className="flex-1"
                  >
                    {generating ? 'Generando...' : 'Generar Plan'}
                  </Button>
                </div>
              </Card>
            )}
          </div>
        </div>
      </MainLayout>
    );
  }

  // Active plan exists - show it
  return (
    <MainLayout>
      <div className="min-h-screen pb-24 md:pb-8">
        <div className="py-8 px-6">
          <div className="container mx-auto max-w-7xl">
            <div className="flex justify-between items-start mb-6">
              <div>
                <h1 className="text-4xl font-bold mb-2">{activePlan.name}</h1>
                <p className="text-lg text-gray-600">
                  {activePlan.startDate} al {activePlan.endDate}
                </p>
              </div>
              <div className="flex gap-3">
                <Button variant="ghost" size="md" onClick={handleDeletePlan}>
                  🗑️ Eliminar
                </Button>
                <Button
                  variant="primary"
                  size="md"
                  onClick={() => {
                    handleDeletePlan();
                  }}
                >
                  + Nuevo Plan
                </Button>
              </div>
            </div>

            <WeeklyPlanView plan={activePlan} />
          </div>
        </div>
      </div>
    </MainLayout>
  );
}
