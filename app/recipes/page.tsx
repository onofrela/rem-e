'use client';

import React, { useState, useMemo } from 'react';
import { MainLayout } from '@/components/layout';
import { Card } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { RecipeCarousel } from '@/components/ui/RecipeCarousel';
import { RecipeCard } from '@/components/ui/RecipeCard';
import { mockRecipes, type Recipe } from '@/lib/utils/mock-data';

export default function RecipesPage() {
  const [searchQuery, setSearchQuery] = useState('');

  // Filter recipes based on search query
  const filteredRecipes = useMemo(() => {
    return mockRecipes.filter(recipe =>
      recipe.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      recipe.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      recipe.tags.some(tag => tag.toLowerCase().includes(searchQuery.toLowerCase()))
    );
  }, [searchQuery]);

  // Group recipes by category
  const recipesByCategory = useMemo(() => {
    const categories = new Map<string, Recipe[]>();

    filteredRecipes.forEach(recipe => {
      const category = recipe.category;
      if (!categories.has(category)) {
        categories.set(category, []);
      }
      categories.get(category)!.push(recipe);
    });

    return categories;
  }, [filteredRecipes]);

  // Get array of categories sorted for display
  const categoryOrder = [
    'Carnes y aves',
    'Pastas',
    'Ensaladas',
    'Snacks y antojitos',
    'Sopas',
    'Postres',
    'Otros'
  ];

  const sortedCategories = Array.from(recipesByCategory.keys()).sort((a, b) => {
    const indexA = categoryOrder.indexOf(a);
    const indexB = categoryOrder.indexOf(b);
    return (indexA === -1 ? 999 : indexA) - (indexB === -1 ? 999 : indexB);
  });

  return (
    <MainLayout>
      <div className="flex-1 flex flex-col min-h-0">
        {/* Header with integrated search */}
        <div className="px-4 md:px-6 py-6 flex-shrink-0">
          <Card variant="elevated" padding="md" className="animate-fadeIn">
            <div className="flex gap-3 md:gap-6 items-center">
              {/* Title and subtitle column */}
              <div className="flex-shrink-0">
                <h1 className="text-2xl md:text-3xl lg:text-4xl font-bold text-gray-800">
                  📖 Mis Recetas
                </h1>
                <p className="text-sm md:text-base lg:text-lg text-gray-600 mt-1">
                  Explora por categorías
                </p>
              </div>

              {/* Search bar */}
              <div className="flex-1">
                <Input
                  placeholder="Buscar recetas..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  leftIcon={<span>🔍</span>}
                  fullWidth
                />
              </div>
            </div>
          </Card>
        </div>

        {/* Content area - scrollable carousel sections */}
        <div className="flex-1 min-h-0 overflow-auto">
          <div className="py-4">
            {sortedCategories.length > 0 ? (
              sortedCategories.map((category, categoryIndex) => {
                const recipes = recipesByCategory.get(category)!;
                return (
                  <RecipeCarousel
                    key={category}
                    title={category}
                    className={`animate-fadeInUp ${categoryIndex < 4 ? `stagger-${categoryIndex + 1}` : ''}`}
                  >
                    {recipes.map((recipe) => (
                      <RecipeCard
                        key={recipe.id}
                        recipe={recipe}
                      />
                    ))}
                  </RecipeCarousel>
                );
              })
            ) : (
              <div className="px-4 md:px-6">
                <Card variant="elevated" padding="lg" className="text-center animate-fadeIn">
                  <div className="text-6xl md:text-7xl mb-4">🔍</div>
                  <h3 className="text-xl md:text-2xl font-semibold mb-2 text-gray-800">
                    No se encontraron recetas
                  </h3>
                  <p className="text-base md:text-lg text-gray-600">
                    Intenta con otros términos de búsqueda
                  </p>
                </Card>
              </div>
            )}
          </div>
        </div>
      </div>
    </MainLayout>
  );
}
