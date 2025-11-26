'use client';

import React from 'react';
import Link from 'next/link';
import { Card } from './Card';
import { Badge } from './Badge';
import type { Recipe } from '@/lib/db/schemas/types';

interface RecipeCardProps {
  recipe: Recipe;
  className?: string;
}

export const RecipeCard = React.forwardRef<HTMLDivElement, RecipeCardProps>(
  ({ recipe, className = '' }, ref) => {
    const ingredientsCount = recipe.ingredients?.length || 0;

    return (
      <Link
        href={`/recipes/${recipe.id}`}
        className={`recipe-card block ${className}`}
      >
        <Card
          ref={ref}
          variant="elevated"
          padding="none"
          hoverable
          className="h-full flex flex-col"
        >
          {/* Image Section */}
          <div className="home-suggestion-image h-40 md:h-48 rounded-t-lg flex items-center justify-center">
            <span className="text-5xl md:text-6xl">🍽</span>
          </div>

          {/* Content Section */}
          <div className="p-4 md:p-5 flex-1 flex flex-col">
            {/* Title */}
            <h3 className="text-lg md:text-xl font-bold mb-2 line-clamp-1">
              {recipe.name}
            </h3>

            {/* Description */}
            <p className="text-sm md:text-base text-gray-600 mb-3 md:mb-4 line-clamp-2 flex-1">
              {recipe.description}
            </p>

            {/* Metadata Badges */}
            <div className="flex flex-wrap gap-2 mb-3">
              <Badge variant="info">⏱ {recipe.time}m</Badge>
              <Badge variant="success">
                {recipe.difficulty === 'Fácil' ? '👨‍🍳 Fácil' :
                 recipe.difficulty === 'Intermedio' ? '👨‍🍳 Medio' :
                 '👨‍🍳 Difícil'}
              </Badge>
              <Badge variant="default">🍴 {recipe.servings}</Badge>
            </div>

            {/* Ingredients Count */}
            <div className="text-xs md:text-sm text-gray-500 font-medium">
              📝 {ingredientsCount} {ingredientsCount === 1 ? 'ingrediente' : 'ingredientes'}
            </div>
          </div>
        </Card>
      </Link>
    );
  }
);

RecipeCard.displayName = 'RecipeCard';
