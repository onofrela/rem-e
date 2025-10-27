'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { MainLayout } from '@/components/layout';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { api } from '@/lib/api/mock-api';
import { Recipe } from '@/lib/utils/mock-data';

export default function RecipeDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const router = useRouter();
  const unwrappedParams = React.use(params);
  const [recipe, setRecipe] = useState<Recipe | null>(null);
  const [servings, setServings] = useState(4);
  const [checkedIngredients, setCheckedIngredients] = useState<Set<number>>(new Set());
  const [showSubstitutions, setShowSubstitutions] = useState<string | null>(null);
  const [substitutions, setSubstitutions] = useState<any[]>([]);

  useEffect(() => {
    loadRecipe();
  }, [unwrappedParams.id]);

  const loadRecipe = async () => {
    const data = await api.getRecipe(unwrappedParams.id);
    if (data) {
      setRecipe(data);
      setServings(data.servings);
    }
  };

  const handleServingsChange = (delta: number) => {
    const newServings = Math.max(1, servings + delta);
    setServings(newServings);
  };

  const toggleIngredient = (index: number) => {
    const newChecked = new Set(checkedIngredients);
    if (newChecked.has(index)) {
      newChecked.delete(index);
    } else {
      newChecked.add(index);
    }
    setCheckedIngredients(newChecked);
  };

  const handleShowSubstitutions = async (ingredient: string) => {
    setShowSubstitutions(ingredient);
    const subs = await api.getSubstitutions(ingredient);
    setSubstitutions(subs);
  };

  const startCooking = () => {
    router.push(`/recipes/${unwrappedParams.id}/guide`);
  };

  if (!recipe) {
    return (
      <MainLayout>
        <div className="min-h-screen flex items-center justify-center">
          <div className="text-center">
            <div className="text-6xl mb-4">🔍</div>
            <p className="text-xl text-[var(--color-text-secondary)]">
              Cargando receta...
            </p>
          </div>
        </div>
      </MainLayout>
    );
  }

  const servingsRatio = servings / recipe.servings;

  return (
    <MainLayout>
      <div className="min-h-screen pb-24 md:pb-8">
        {/* Hero Section */}
        <div className="relative">
          {/* Recipe Image */}
          <div className="h-56 sm:h-64 md:h-96 bg-gradient-to-br from-[var(--color-primary)] to-[var(--color-secondary)] flex items-center justify-center text-white text-6xl sm:text-8xl animate-fadeIn">
            🍽
          </div>

          {/* Floating Back Button */}
          <button
            onClick={() => router.back()}
            className="absolute top-4 left-4 bg-black/50 text-white px-3 sm:px-4 py-2 rounded-full hover:bg-black/70 transition-colors backdrop-blur-sm min-h-[44px] text-sm sm:text-base"
          >
            ← Volver
          </button>

          {/* Floating Action Buttons */}
          <div className="absolute top-4 right-4 flex gap-2">
            <button className="bg-black/50 text-white p-2 sm:p-3 rounded-full hover:bg-black/70 transition-colors backdrop-blur-sm text-lg sm:text-xl min-w-[44px] min-h-[44px]">
              ❤️
            </button>
            <button className="bg-black/50 text-white p-2 sm:p-3 rounded-full hover:bg-black/70 transition-colors backdrop-blur-sm text-lg sm:text-xl min-w-[44px] min-h-[44px]">
              📤
            </button>
          </div>
        </div>

        <div className="container mx-auto max-w-4xl px-4 md:px-6">
          {/* Recipe Header */}
          <div className="-mt-8 mb-6">
            <Card variant="elevated" padding="lg" className="animate-fadeInUp">
              <h1 className="text-2xl sm:text-3xl font-bold mb-2 text-[var(--color-text-primary)]">
                {recipe.name}
              </h1>
              <p className="text-base sm:text-lg text-[var(--color-text-secondary)] mb-4">
                {recipe.description}
              </p>

              <div className="flex flex-wrap gap-2">
                <Badge variant="info">⏱ {recipe.time} min</Badge>
                <Badge variant="success">👨‍🍳 {recipe.difficulty}</Badge>
                <Badge variant="default">🍴 {recipe.servings} porciones</Badge>
                {recipe.calories && (
                  <Badge variant="warning">🔥 {recipe.calories} kcal</Badge>
                )}
              </div>
            </Card>
          </div>

          {/* Servings Adjuster */}
          <Card variant="elevated" padding="md" className="mb-6 animate-fadeInUp stagger-1">
            <div className="flex items-center justify-between">
              <span className="text-sm sm:text-base font-semibold text-[var(--color-text-primary)]">
                Porciones:
              </span>
              <div className="flex items-center gap-3 sm:gap-4">
                <button
                  onClick={() => handleServingsChange(-1)}
                  className="w-11 h-11 rounded-full bg-[var(--color-surface)] hover:bg-[var(--color-border)] transition-colors flex items-center justify-center text-xl min-w-[44px] min-h-[44px]"
                >
                  −
                </button>
                <span className="text-lg sm:text-xl font-bold w-10 sm:w-12 text-center">
                  {servings}
                </span>
                <button
                  onClick={() => handleServingsChange(1)}
                  className="w-11 h-11 rounded-full bg-[var(--color-surface)] hover:bg-[var(--color-border)] transition-colors flex items-center justify-center text-xl min-w-[44px] min-h-[44px]"
                >
                  +
                </button>
              </div>
            </div>
            {servings !== recipe.servings && (
              <p className="text-sm text-[var(--color-text-secondary)] mt-2">
                Las cantidades se ajustarán automáticamente
              </p>
            )}
          </Card>

          {/* Ingredients */}
          <Card variant="elevated" padding="lg" className="mb-6">
            <h2 className="text-2xl font-bold mb-4 text-[var(--color-text-primary)]">
              Ingredientes
            </h2>
            <div className="space-y-3">
              {recipe.ingredients.map((ing, idx) => (
                <div key={idx}>
                  <div
                    className={`flex items-start gap-3 p-3 rounded-lg transition-colors cursor-pointer ${
                      checkedIngredients.has(idx)
                        ? 'bg-[var(--color-success)]/10'
                        : 'hover:bg-[var(--color-surface)]'
                    }`}
                    onClick={() => toggleIngredient(idx)}
                  >
                    <div className="flex-shrink-0 mt-1">
                      <div
                        className={`w-5 h-5 rounded border-2 flex items-center justify-center ${
                          checkedIngredients.has(idx)
                            ? 'bg-[var(--color-success)] border-[var(--color-success)] text-white'
                            : 'border-[var(--color-border)]'
                        }`}
                      >
                        {checkedIngredients.has(idx) && '✓'}
                      </div>
                    </div>

                    <div className="flex-1">
                      <span className={checkedIngredients.has(idx) ? 'line-through opacity-60' : ''}>
                        <span className="font-medium">
                          {Math.round(ing.amount * servingsRatio * 10) / 10} {ing.unit}
                        </span>
                        {' '}{ing.name}
                        {ing.optional && (
                          <Badge variant="default" size="sm" className="ml-2">
                            Opcional
                          </Badge>
                        )}
                      </span>
                    </div>

                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleShowSubstitutions(ing.name);
                      }}
                      className="text-sm text-[var(--color-primary)] hover:underline"
                    >
                      Sustituir
                    </button>
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-4 flex items-center justify-between text-sm">
              <span className="text-[var(--color-text-secondary)]">
                {checkedIngredients.size} de {recipe.ingredients.length} reunidos
              </span>
              {checkedIngredients.size > 0 && (
                <button
                  onClick={() => setCheckedIngredients(new Set())}
                  className="text-[var(--color-primary)] hover:underline"
                >
                  Limpiar
                </button>
              )}
            </div>
          </Card>

          {/* Steps Preview */}
          <Card variant="elevated" padding="lg" className="mb-6">
            <h2 className="text-2xl font-bold mb-4 text-[var(--color-text-primary)]">
              Preparación ({recipe.steps.length} pasos)
            </h2>
            <div className="space-y-4">
              {recipe.steps.slice(0, 3).map((step) => (
                <div key={step.step} className="flex gap-4">
                  <div className="flex-shrink-0 w-8 h-8 rounded-full bg-[var(--color-primary)] text-white flex items-center justify-center font-bold">
                    {step.step}
                  </div>
                  <div className="flex-1">
                    <p className="text-[var(--color-text-primary)]">
                      {step.instruction}
                    </p>
                    {step.duration && (
                      <p className="text-sm text-[var(--color-text-secondary)] mt-1">
                        ⏱ ~{step.duration} minutos
                      </p>
                    )}
                  </div>
                </div>
              ))}
              {recipe.steps.length > 3 && (
                <p className="text-sm text-[var(--color-text-secondary)] text-center">
                  + {recipe.steps.length - 3} pasos más
                </p>
              )}
            </div>
          </Card>

          {/* Start Cooking Button */}
          <div className="sticky bottom-20 md:bottom-4 z-10">
            <Card variant="elevated" padding="md" className="shadow-xl">
              <Button
                variant="primary"
                size="xl"
                fullWidth
                onClick={startCooking}
                icon={<span>🍳</span>}
              >
                Iniciar Guía de Cocina
              </Button>
            </Card>
          </div>
        </div>
      </div>

      {/* Substitutions Modal */}
      {showSubstitutions && (
        <div
          className="fixed inset-0 bg-black/50 z-[var(--z-modal-backdrop)] flex items-end md:items-center justify-center p-4"
          onClick={() => setShowSubstitutions(null)}
        >
          <Card
            variant="elevated"
            padding="lg"
            className="w-full max-w-lg max-h-[80vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-bold text-[var(--color-text-primary)]">
                Sustitutos para {showSubstitutions}
              </h3>
              <button
                onClick={() => setShowSubstitutions(null)}
                className="text-2xl text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3">
              {substitutions.map((sub, idx) => (
                <div key={idx} className="p-4 bg-[var(--color-surface)] rounded-lg">
                  <div className="flex items-start justify-between mb-2">
                    <h4 className="font-semibold text-[var(--color-text-primary)]">
                      {sub.name}
                    </h4>
                    <Badge
                      variant={
                        sub.availability === 'common' ? 'success' :
                        sub.availability === 'moderate' ? 'warning' : 'error'
                      }
                      size="sm"
                    >
                      {sub.availability === 'common' ? 'Común' :
                       sub.availability === 'moderate' ? 'Moderado' : 'Raro'}
                    </Badge>
                  </div>
                  <p className="text-sm text-[var(--color-text-secondary)]">
                    {sub.impact}
                  </p>
                </div>
              ))}
            </div>
          </Card>
        </div>
      )}
    </MainLayout>
  );
}
