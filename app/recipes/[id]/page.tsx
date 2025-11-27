'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { MainLayout } from '@/components/layout';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import type { Recipe } from '@/lib/db/schemas/types';
import * as recipeService from '@/lib/db/services/recipeService';

export default function RecipeDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const router = useRouter();
  const unwrappedParams = React.use(params);
  const [recipe, setRecipe] = useState<Recipe | null>(null);
  const [servings, setServings] = useState(4);
  const [checkedIngredients, setCheckedIngredients] = useState<Set<number>>(new Set());

  useEffect(() => {
    loadRecipe();
  }, [unwrappedParams.id]);

  const loadRecipe = async () => {
    const data = await recipeService.getRecipeById(unwrappedParams.id);
    console.log('[RecipeDetail] Loaded recipe:', data);
    if (data) {
      console.log('[RecipeDetail] Recipe steps:', data.steps);
      console.log('[RecipeDetail] Appliances in steps:', data.steps.map(s => ({ step: s.step, appliances: s.appliancesUsed })));
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
                {recipe.nutritionPerServing?.calories && (
                  <Badge variant="warning">🔥 {recipe.nutritionPerServing.calories} kcal</Badge>
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
                        {' '}{ing.displayName}
                        {ing.optional && (
                          <Badge variant="default" size="sm" className="ml-2">
                            Opcional
                          </Badge>
                        )}
                      </span>
                    </div>
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

          {/* Electrodomésticos necesarios */}
          {(() => {
            // Recolectar todos los electrodomésticos únicos de todos los pasos
            const allAppliances = new Set<string>();
            recipe.steps.forEach(step => {
              step.appliancesUsed?.forEach(app => allAppliances.add(app));
            });

            console.log('[RecipeDetail] All appliances collected:', Array.from(allAppliances));

            if (allAppliances.size === 0) {
              console.log('[RecipeDetail] No appliances found, hiding section');
              return null;
            }

            // Nombres amigables para funcionalidades
            const functionalityNames: Record<string, string> = {
              'stovetop_cooking': 'Estufa/Parrilla',
              'oven_baking': 'Horno',
              'blending': 'Licuadora',
              'microwave_heating': 'Microondas',
              'grilling': 'Parrilla/Grill',
              'food_processing': 'Procesador de alimentos',
              'mixing': 'Batidora',
              'refrigerating': 'Refrigerador',
              'freezing': 'Congelador',
              'boiling_water': 'Hervir agua',
              'air_frying': 'Freidora de aire',
              'slow_cooking': 'Olla de cocción lenta',
              'pressure_cooking': 'Olla de presión',
              'toasting': 'Tostadora',
              'chopping': 'Cuchillo/Tabla de cortar',
              'measuring': 'Tazas/Cucharas medidoras',
              'weighing': 'Báscula de cocina',
              'straining': 'Colador',
              'whisking': 'Batidor manual',
              'rolling': 'Rodillo',
              'baking_sheet': 'Charola para hornear',
              'mixing_bowl': 'Tazón para mezclar',
            };

            return (
              <Card variant="elevated" padding="lg" className="mb-6">
                <h2 className="text-2xl font-bold mb-4 text-[var(--color-text-primary)]">
                  Electrodomésticos necesarios
                </h2>
                <div className="flex flex-wrap gap-3">
                  {Array.from(allAppliances).map((functionality) => (
                    <Card key={functionality} variant="outlined" padding="md" className="bg-[var(--color-secondary-light)]/20">
                      <div className="flex items-center gap-3">
                        <span className="text-3xl">🔧</span>
                        <div>
                          <p className="font-semibold text-[var(--color-text-primary)]">
                            {functionalityNames[functionality] || functionality}
                          </p>
                        </div>
                      </div>
                    </Card>
                  ))}
                </div>
                <p className="text-sm text-[var(--color-text-secondary)] mt-4">
                  💡 Al iniciar la guía, verificaremos si tienes estos electrodomésticos y te ayudaremos a adaptarte si no los tienes.
                </p>
              </Card>
            );
          })()}

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
    </MainLayout>
  );
}
