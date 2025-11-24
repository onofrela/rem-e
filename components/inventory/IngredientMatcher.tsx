/* IMPORTANT: Light theme only - do not use dark mode */
'use client';

import React, { useMemo } from 'react';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import type { CatalogIngredient } from '@/lib/db/schemas/types';

interface IngredientMatcherProps {
  detectedName: string;
  detectedCategory?: string;
  confidence?: number;
  ingredients: CatalogIngredient[];
  onSelect: (ingredient: CatalogIngredient) => void;
  onSearchManually: () => void;
}

/**
 * Component that shows ingredient matching suggestions
 * after vision analysis
 */
export function IngredientMatcher({
  detectedName,
  detectedCategory,
  confidence = 0,
  ingredients,
  onSelect,
  onSearchManually,
}: IngredientMatcherProps) {
  // Calculate similarity between strings (simple Levenshtein-like)
  const calculateSimilarity = (str1: string, str2: string): number => {
    const s1 = str1.toLowerCase().trim();
    const s2 = str2.toLowerCase().trim();

    if (s1 === s2) return 100;
    if (s1.includes(s2) || s2.includes(s1)) return 90;

    // Word-based matching
    const words1 = s1.split(/\s+/);
    const words2 = s2.split(/\s+/);
    const matchingWords = words1.filter((w) => words2.includes(w)).length;
    const totalWords = Math.max(words1.length, words2.length);
    const wordMatchScore = (matchingWords / totalWords) * 80;

    return Math.round(wordMatchScore);
  };

  // Find best matches from catalog
  const matches = useMemo(() => {
    const searchTerm = detectedName.toLowerCase().trim();

    const scored = ingredients.map((ingredient) => {
      // Check name similarity
      const nameSimilarity = calculateSimilarity(ingredient.name, detectedName);

      // Check normalized name similarity
      const normalizedSimilarity = calculateSimilarity(
        ingredient.normalizedName,
        detectedName
      );

      // Check synonym matches
      const synonymMatches = ingredient.synonyms.map((syn) =>
        calculateSimilarity(syn, detectedName)
      );
      const bestSynonymMatch = Math.max(...synonymMatches, 0);

      // Calculate final score
      const score = Math.max(nameSimilarity, normalizedSimilarity, bestSynonymMatch);

      // Bonus points if category matches
      let finalScore = score;
      if (
        detectedCategory &&
        ingredient.category.toLowerCase() === detectedCategory.toLowerCase()
      ) {
        finalScore += 10;
      }

      return {
        ingredient,
        score: Math.min(finalScore, 100),
      };
    });

    // Return top 3 matches above 60% similarity
    return scored
      .filter((item) => item.score >= 60)
      .sort((a, b) => b.score - a.score)
      .slice(0, 3);
  }, [ingredients, detectedName, detectedCategory]);

  const getCategoryIcon = (category: string) => {
    const icons: Record<string, string> = {
      Proteínas: '🍗',
      Lácteos: '🥛',
      Vegetales: '🥕',
      Frutas: '🍎',
      Granos: '🌾',
      Condimentos: '🧂',
      Aceites: '🫒',
      Harinas: '🌾',
      Endulzantes: '🍯',
      Bebidas: '🥤',
      Otros: '📦',
    };
    return icons[category] || '📦';
  };

  const getConfidenceBadgeVariant = (conf: number): 'success' | 'warning' | 'info' => {
    if (conf >= 80) return 'success';
    if (conf >= 60) return 'warning';
    return 'info';
  };

  return (
    <div className="container mx-auto max-w-2xl px-4 py-6">
      {/* Detection result */}
      <Card variant="outlined" padding="lg" className="mb-6">
        <div className="text-center mb-4">
          <span className="text-6xl mb-3 block">🔍</span>
          <h3 className="text-2xl font-bold text-[var(--color-text-primary)] mb-2">
            Ingrediente Detectado
          </h3>
          <p className="text-xl text-[var(--color-primary)] font-semibold mb-3">
            {detectedName}
          </p>
          {detectedCategory && (
            <Badge variant="default" className="mb-2">
              {getCategoryIcon(detectedCategory)} {detectedCategory}
            </Badge>
          )}
          {confidence > 0 && (
            <div className="flex items-center justify-center gap-2 mt-2">
              <span className="text-sm text-[var(--color-text-secondary)]">Confianza:</span>
              <Badge variant={getConfidenceBadgeVariant(confidence)}>
                {Math.round(confidence)}%
              </Badge>
            </div>
          )}
        </div>
      </Card>

      {/* Matching results */}
      {matches.length > 0 ? (
        <>
          <div className="mb-4">
            <h4 className="text-lg font-semibold text-[var(--color-text-primary)] mb-2">
              Ingredientes Similares en tu Glosario
            </h4>
            <p className="text-sm text-[var(--color-text-secondary)]">
              Selecciona el ingrediente que mejor coincida:
            </p>
          </div>

          <div className="space-y-3 mb-6">
            {matches.map(({ ingredient, score }) => (
              <Card
                key={ingredient.id}
                variant="outlined"
                padding="md"
                hoverable
                className="cursor-pointer"
                onClick={() => onSelect(ingredient)}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3 flex-1">
                    <span className="text-4xl">{getCategoryIcon(ingredient.category)}</span>
                    <div className="flex-1">
                      <h5 className="font-semibold text-[var(--color-text-primary)] mb-1">
                        {ingredient.name}
                      </h5>
                      <p className="text-sm text-[var(--color-text-secondary)]">
                        {ingredient.category}
                      </p>
                      {ingredient.synonyms.length > 0 && (
                        <p className="text-xs text-[var(--color-text-secondary)] mt-1">
                          También conocido como: {ingredient.synonyms.slice(0, 2).join(', ')}
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="text-right">
                    <Badge
                      variant={score >= 90 ? 'success' : score >= 75 ? 'warning' : 'info'}
                    >
                      {score}% similar
                    </Badge>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </>
      ) : (
        <Card variant="outlined" padding="lg" className="mb-6 text-center">
          <span className="text-5xl mb-3 block">❓</span>
          <h4 className="text-lg font-semibold text-[var(--color-text-primary)] mb-2">
            No se encontraron coincidencias
          </h4>
          <p className="text-sm text-[var(--color-text-secondary)]">
            No pudimos encontrar ingredientes similares en tu glosario. Puedes buscar manualmente.
          </p>
        </Card>
      )}

      {/* Action button */}
      <Button
        variant="secondary"
        size="lg"
        fullWidth
        onClick={onSearchManually}
        icon={<span>🔍</span>}
        iconPosition="left"
      >
        Buscar Manualmente en Glosario
      </Button>

      {/* Help tip */}
      <Card variant="outlined" padding="md" className="mt-6">
        <div className="flex items-start gap-3">
          <span className="text-2xl">💡</span>
          <div>
            <p className="text-sm text-[var(--color-text-secondary)]">
              <strong>Tip:</strong> Si el ingrediente detectado no está en tu glosario, puedes
              agregar ingredientes personalizados desde la sección de Glosario.
            </p>
          </div>
        </div>
      </Card>
    </div>
  );
}
