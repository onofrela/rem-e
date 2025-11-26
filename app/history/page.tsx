'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { MainLayout } from '@/components/layout';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import {
  getCompletedRecipeHistory,
  getCookingStatistics,
} from '@/lib/db/services/recipeHistoryService';
import { getRecipeById } from '@/lib/db/services/recipeService';
import type { RecipeHistory, Recipe } from '@/lib/db/schemas/types';

export default function HistoryPage() {
  const [history, setHistory] = useState<RecipeHistory[]>([]);
  const [recipes, setRecipes] = useState<Record<string, Recipe>>({});
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<{
    totalCooked: number;
    averageRating: number;
  } | null>(null);

  useEffect(() => {
    const loadHistory = async () => {
      try {
        const completed = await getCompletedRecipeHistory();
        setHistory(completed);

        // Load recipe data
        const recipeIds = [...new Set(completed.map((h) => h.recipeId))];
        const recipeData = await Promise.all(
          recipeIds.map((id) => getRecipeById(id))
        );
        const recipesMap = Object.fromEntries(
          recipeData.filter(Boolean).map((r) => [r!.id, r!])
        );
        setRecipes(recipesMap);

        // Load statistics
        const statistics = await getCookingStatistics();
        setStats({
          totalCooked: statistics.totalCooked,
          averageRating: statistics.averageRating,
        });
      } catch (error) {
        console.error('Error loading history:', error);
      } finally {
        setLoading(false);
      }
    };

    loadHistory();
  }, []);

  if (loading) {
    return (
      <MainLayout>
        <div className="flex-1 p-4 md:p-6 lg:p-8 flex items-center justify-center">
          <span className="text-6xl animate-spin">🍳</span>
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <div className="flex-1 p-4 md:p-6 lg:p-8">
        {/* Header */}
        <div className="mb-6 md:mb-8">
          <h1 className="text-3xl md:text-4xl lg:text-5xl font-bold mb-2">
            Mi Historial de Cocina
          </h1>
          <p className="text-base md:text-lg text-gray-600">
            Recetas que has preparado
          </p>
        </div>

        {/* Statistics Cards */}
        {stats && stats.totalCooked > 0 && (
          <div className="grid grid-cols-2 gap-4 md:gap-6 mb-6 md:mb-8">
            <Card variant="outlined" padding="lg">
              <div className="text-center">
                <span className="text-4xl md:text-5xl">🍽️</span>
                <p className="text-2xl md:text-3xl font-bold mt-2">
                  {stats.totalCooked}
                </p>
                <p className="text-sm md:text-base text-gray-600">
                  Recetas Cocinadas
                </p>
              </div>
            </Card>
            <Card variant="outlined" padding="lg">
              <div className="text-center">
                <span className="text-4xl md:text-5xl">⭐</span>
                <p className="text-2xl md:text-3xl font-bold mt-2">
                  {stats.averageRating > 0
                    ? stats.averageRating.toFixed(1)
                    : 'N/A'}
                </p>
                <p className="text-sm md:text-base text-gray-600">
                  Calificación Promedio
                </p>
              </div>
            </Card>
          </div>
        )}

        {/* Empty State */}
        {history.length === 0 && (
          <Card variant="outlined" padding="lg" className="text-center">
            <span className="text-6xl md:text-8xl">👨‍🍳</span>
            <h3 className="text-2xl md:text-3xl font-semibold mt-4 mb-2">
              Aún no has cocinado nada
            </h3>
            <p className="text-base md:text-lg text-gray-600 mb-6">
              Comienza a cocinar recetas y se guardarán aquí
            </p>
            <Link href="/recipes">
              <Button variant="primary" size="lg">
                Ver Recetas
              </Button>
            </Link>
          </Card>
        )}

        {/* History Grid */}
        {history.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
            {history.map((entry, index) => {
              const recipe = recipes[entry.recipeId];
              if (!recipe) return null;

              return (
                <HistoryCard
                  key={entry.id}
                  entry={entry}
                  recipe={recipe}
                  index={index}
                />
              );
            })}
          </div>
        )}
      </div>
    </MainLayout>
  );
}

interface HistoryCardProps {
  entry: RecipeHistory;
  recipe: Recipe;
  index: number;
}

function HistoryCard({ entry, recipe, index }: HistoryCardProps) {
  const [expanded, setExpanded] = useState(false);

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('es-MX', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  const staggerClass = `stagger-${Math.min(index % 5 + 1, 5)}`;

  return (
    <Card
      variant="elevated"
      padding="md"
      hoverable
      className={`cursor-pointer animate-fadeInUp ${staggerClass}`}
      onClick={() => setExpanded(!expanded)}
    >
      {/* Summary View */}
      <div className="flex gap-4">
        <div
          className="home-suggestion-image flex-shrink-0"
          style={{ width: '80px', height: '80px' }}
        >
          <span className="text-4xl">🍽️</span>
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="text-lg md:text-xl font-semibold mb-1 truncate">
            {recipe.name}
          </h3>
          <p className="text-sm text-gray-600 mb-2">
            {formatDate(entry.completedAt!)}
          </p>
          {entry.rating ? (
            <div className="flex gap-0.5">
              {'⭐'.repeat(entry.rating)}
              {'☆'.repeat(5 - entry.rating)}
            </div>
          ) : (
            <p className="text-sm text-gray-500 italic">Sin calificación</p>
          )}
        </div>
      </div>

      {/* Expanded View */}
      {expanded && (
        <div className="mt-4 pt-4 border-t border-gray-200 animate-fadeIn">
          <div className="space-y-3">
            <div className="flex flex-wrap gap-2">
              <Badge variant="info">
                🍴 {entry.servingsMade}{' '}
                {entry.servingsMade === 1 ? 'porción' : 'porciones'}
              </Badge>
              {entry.wouldMakeAgain && (
                <Badge variant="success">👍 La haría de nuevo</Badge>
              )}
            </div>

            {entry.sessionChanges?.notes &&
              entry.sessionChanges.notes.length > 0 && (
                <div>
                  <h4 className="text-sm font-semibold text-gray-700 mb-2">
                    Notas:
                  </h4>
                  <div className="space-y-2">
                    {entry.sessionChanges.notes.map((note, idx) => (
                      <p
                        key={idx}
                        className="text-sm text-gray-600 bg-gray-50 p-2 rounded-lg"
                      >
                        {note.content}
                      </p>
                    ))}
                  </div>
                </div>
              )}

            {entry.sessionChanges?.substitutions &&
              entry.sessionChanges.substitutions.length > 0 && (
                <div>
                  <h4 className="text-sm font-semibold text-gray-700 mb-2">
                    Sustituciones realizadas:
                  </h4>
                  <p className="text-sm text-gray-600">
                    {entry.sessionChanges.substitutions.length}{' '}
                    {entry.sessionChanges.substitutions.length === 1
                      ? 'ingrediente sustituido'
                      : 'ingredientes sustituidos'}
                  </p>
                </div>
              )}

            <Link href={`/recipes/${recipe.id}`} onClick={(e) => e.stopPropagation()}>
              <Button variant="primary" size="md" fullWidth>
                Ver Receta
              </Button>
            </Link>
          </div>
        </div>
      )}
    </Card>
  );
}
