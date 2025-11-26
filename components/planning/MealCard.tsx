'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import * as recipeService from '@/lib/db/services/recipeService';
import type { Recipe } from '@/lib/db/schemas/types';

interface MealCardProps {
  label: string;
  recipeId: string | null;
  onEdit?: () => void;
  className?: string;
}

export const MealCard: React.FC<MealCardProps> = ({
  label,
  recipeId,
  onEdit,
  className = '',
}) => {
  const [recipe, setRecipe] = useState<Recipe | null>(null);

  useEffect(() => {
    if (recipeId) {
      recipeService.getRecipeById(recipeId).then(setRecipe);
    }
  }, [recipeId]);

  if (!recipeId || !recipe) {
    return (
      <Card
        variant="outlined"
        padding="md"
        className={`mb-3 opacity-50 ${className}`}
      >
        <div className="text-sm font-semibold mb-2">{label}</div>
        <div className="text-sm text-gray-500 italic">Sin planificar</div>
        {onEdit && (
          <button
            onClick={onEdit}
            className="text-xs text-primary mt-2 hover:underline"
          >
            + Agregar receta
          </button>
        )}
      </Card>
    );
  }

  return (
    <Link href={`/recipes/${recipeId}`}>
      <Card
        variant="elevated"
        padding="md"
        hoverable
        className={`mb-3 ${className}`}
      >
        <div className="text-sm font-semibold text-gray-600 mb-2">{label}</div>
        <h4 className="text-base font-bold mb-2">{recipe.name}</h4>
        <div className="flex flex-wrap gap-1">
          <Badge variant="info" size="sm">⏱ {recipe.time}m</Badge>
          <Badge variant="success" size="sm">
            {recipe.difficulty === 'Fácil' ? '👨‍🍳' : recipe.difficulty === 'Medio' ? '🔥' : '⭐'}
          </Badge>
        </div>
      </Card>
    </Link>
  );
};
