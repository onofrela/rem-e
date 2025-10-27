'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { MainLayout } from '@/components/layout';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { api, RecipeSuggestion } from '@/lib/api/mock-api';
import { Recipe } from '@/lib/utils/mock-data';

export default function SuggestionsPage() {
  const router = useRouter();
  const [ingredients, setIngredients] = useState<string[]>([]);
  const [suggestions, setSuggestions] = useState<RecipeSuggestion[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filters, setFilters] = useState({
    maxTime: 0,
    difficulty: '' as Recipe['difficulty'] | '',
  });

  useEffect(() => {
    // Load ingredients from localStorage
    const stored = localStorage.getItem('selectedIngredients');
    if (stored) {
      const parsed = JSON.parse(stored);
      setIngredients(parsed);
      loadSuggestions(parsed);
    } else {
      router.push('/cook');
    }
  }, []);

  const loadSuggestions = async (ings: string[]) => {
    setIsLoading(true);
    try {
      const results = await api.getRecipeSuggestions(ings, {
        maxTime: filters.maxTime || undefined,
        difficulty: filters.difficulty || undefined,
      });
      setSuggestions(results);
    } catch (error) {
      console.error('Error loading suggestions:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const applyFilters = async () => {
    await loadSuggestions(ingredients);
  };

  const resetFilters = () => {
    setFilters({ maxTime: 0, difficulty: '' });
  };

  if (isLoading) {
    return (
      <MainLayout>
        <div className="min-h-screen flex items-center justify-center">
          <div className="text-center">
            <div className="text-6xl mb-4 animate-spin">🍳</div>
            <p className="text-xl text-[var(--color-text-secondary)]">
              Buscando las mejores recetas para ti...
            </p>
          </div>
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <div className="min-h-screen pb-24 md:pb-8">
        {/* Header */}
        <div className="py-8 px-6">
          <div className="container mx-auto max-w-4xl">
            <button
              onClick={() => router.back()}
              className="mb-4 text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] transition-colors"
            >
              ← Cambiar ingredientes
            </button>
            <h1 className="text-3xl font-bold mb-2 text-[var(--color-text-primary)]">Recetas Sugeridas</h1>
            <p className="text-[var(--color-text-secondary)]">
              Encontramos {suggestions.length} receta{suggestions.length !== 1 ? 's' : ''} para ti
            </p>
          </div>
        </div>

        <div className="container mx-auto max-w-4xl px-6 -mt-4">
          {/* Ingredients Summary */}
          <Card variant="elevated" padding="md" className="mb-6">
            <p className="text-sm text-[var(--color-text-secondary)] mb-2">
              Tus ingredientes:
            </p>
            <div className="flex flex-wrap gap-2">
              {ingredients.map((ing) => (
                <Badge key={ing} variant="info" size="sm">
                  {ing}
                </Badge>
              ))}
            </div>
          </Card>

          {/* Filters */}
          <Card variant="elevated" padding="md" className="mb-6">
            <h3 className="font-semibold mb-3 text-[var(--color-text-primary)]">
              Filtros
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-sm text-[var(--color-text-secondary)] mb-2 block">
                  Tiempo máximo
                </label>
                <select
                  value={filters.maxTime}
                  onChange={(e) => setFilters({ ...filters, maxTime: Number(e.target.value) })}
                  className="w-full px-4 py-2 rounded-lg border-2 border-[var(--color-border)] bg-[var(--color-background)] text-[var(--color-text-primary)]"
                >
                  <option value={0}>Cualquiera</option>
                  <option value={15}>15 minutos</option>
                  <option value={30}>30 minutos</option>
                  <option value={60}>1 hora</option>
                </select>
              </div>

              <div>
                <label className="text-sm text-[var(--color-text-secondary)] mb-2 block">
                  Dificultad
                </label>
                <select
                  value={filters.difficulty}
                  onChange={(e) => setFilters({ ...filters, difficulty: e.target.value as any })}
                  className="w-full px-4 py-2 rounded-lg border-2 border-[var(--color-border)] bg-[var(--color-background)] text-[var(--color-text-primary)]"
                >
                  <option value="">Cualquiera</option>
                  <option value="Fácil">Fácil</option>
                  <option value="Intermedio">Intermedio</option>
                  <option value="Avanzado">Avanzado</option>
                </select>
              </div>
            </div>

            <div className="flex gap-2 mt-4">
              <Button variant="primary" size="sm" onClick={applyFilters}>
                Aplicar Filtros
              </Button>
              <Button variant="ghost" size="sm" onClick={resetFilters}>
                Limpiar
              </Button>
            </div>
          </Card>

          {/* Recipe List */}
          <div className="space-y-4">
            {suggestions.length === 0 ? (
              <Card variant="elevated" padding="lg" className="text-center">
                <div className="text-6xl mb-4">🤔</div>
                <h3 className="text-xl font-semibold mb-2 text-[var(--color-text-primary)]">
                  No encontramos recetas
                </h3>
                <p className="text-[var(--color-text-secondary)] mb-4">
                  Intenta agregar más ingredientes o cambiar los filtros
                </p>
                <Button variant="primary" onClick={() => router.back()}>
                  Cambiar Ingredientes
                </Button>
              </Card>
            ) : (
              suggestions.map((recipe) => (
                <Link key={recipe.id} href={`/recipes/${recipe.id}`}>
                  <Card variant="elevated" padding="none" hoverable>
                    <div className="flex flex-col md:flex-row">
                      {/* Recipe Image */}
                      <div className="w-full md:w-48 h-48 bg-gradient-to-br from-[var(--color-primary)] to-[var(--color-secondary)] flex items-center justify-center text-white text-6xl md:rounded-l-xl rounded-t-xl md:rounded-tr-none flex-shrink-0">
                        🍽
                      </div>

                      {/* Recipe Info */}
                      <div className="flex-1 p-6">
                        <div className="flex items-start justify-between mb-2">
                          <h3 className="text-xl font-bold text-[var(--color-text-primary)]">
                            {recipe.name}
                          </h3>
                          {recipe.matchScore === 1 ? (
                            <Badge variant="success" size="sm">
                              ✓ Completo
                            </Badge>
                          ) : (
                            <Badge variant="warning" size="sm">
                              {Math.round(recipe.matchScore * 100)}% match
                            </Badge>
                          )}
                        </div>

                        <p className="text-[var(--color-text-secondary)] mb-4">
                          {recipe.description}
                        </p>

                        <div className="flex flex-wrap gap-2 mb-4">
                          <Badge variant="default" size="sm">
                            ⏱ {recipe.time} min
                          </Badge>
                          <Badge variant="default" size="sm">
                            👨‍🍳 {recipe.difficulty}
                          </Badge>
                          <Badge variant="default" size="sm">
                            🍴 {recipe.servings} porciones
                          </Badge>
                          {recipe.calories && (
                            <Badge variant="default" size="sm">
                              🔥 {recipe.calories} kcal
                            </Badge>
                          )}
                        </div>

                        {recipe.missingIngredients.length > 0 && (
                          <div className="mb-4">
                            <p className="text-sm font-semibold text-[var(--color-text-secondary)] mb-2">
                              Te faltan:
                            </p>
                            <div className="flex flex-wrap gap-1">
                              {recipe.missingIngredients.slice(0, 5).map((ing) => (
                                <Badge key={ing} variant="error" size="sm">
                                  {ing}
                                </Badge>
                              ))}
                              {recipe.missingIngredients.length > 5 && (
                                <Badge variant="error" size="sm">
                                  +{recipe.missingIngredients.length - 5} más
                                </Badge>
                              )}
                            </div>
                          </div>
                        )}

                        <Button variant="primary" size="sm" className="w-full md:w-auto">
                          Ver Receta Completa
                        </Button>
                      </div>
                    </div>
                  </Card>
                </Link>
              ))
            )}
          </div>
        </div>
      </div>
    </MainLayout>
  );
}
