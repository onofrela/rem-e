/* IMPORTANT: Light theme only - do not use dark mode */
'use client';

import React, { useState, useMemo } from 'react';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import type { CatalogIngredient } from '@/lib/db/schemas/types';

interface IngredientSearchProps {
  ingredients: CatalogIngredient[];
  onSelect: (ingredient: CatalogIngredient) => void;
}

/**
 * Manual ingredient search component with filtering
 */
export function IngredientSearch({ ingredients, onSelect }: IngredientSearchProps) {
  const [search, setSearch] = useState('');
  const [filterCategory, setFilterCategory] = useState<string>('all');

  // Get unique categories
  const categories = useMemo(() => {
    const cats = new Set(ingredients.map((ing) => ing.category));
    return ['all', ...Array.from(cats).sort()];
  }, [ingredients]);

  // Filter ingredients
  const filteredIngredients = useMemo(() => {
    let filtered = ingredients;

    // Filter by search
    if (search.trim()) {
      const query = search.toLowerCase();
      filtered = filtered.filter(
        (ing) =>
          ing.name.toLowerCase().includes(query) ||
          ing.normalizedName.toLowerCase().includes(query) ||
          ing.synonyms.some((syn) => syn.toLowerCase().includes(query))
      );
    }

    // Filter by category
    if (filterCategory !== 'all') {
      filtered = filtered.filter((ing) => ing.category === filterCategory);
    }

    return filtered.slice(0, 50); // Limit to 50 results
  }, [ingredients, search, filterCategory]);

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

  return (
    <div className="container mx-auto max-w-4xl px-4 py-6">
      {/* Search bar */}
      <div className="mb-5">
        <label className="block text-sm font-semibold text-[var(--color-text-primary)] mb-2">
          Buscar Ingrediente
        </label>
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Escribe el nombre del ingrediente..."
          className="w-full px-4 py-3 text-base rounded-lg border-2 border-[var(--color-border)] bg-[var(--color-background)] focus:border-[var(--color-primary)] outline-none"
          autoFocus
        />
      </div>

      {/* Category filters */}
      <div className="mb-5">
        <p className="text-sm font-semibold text-[var(--color-text-primary)] mb-2">
          Filtrar por Categoría
        </p>
        <div className="flex flex-wrap gap-2">
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setFilterCategory(cat)}
              className={`
                px-3 py-1.5 rounded-full text-sm font-medium transition-all
                ${
                  filterCategory === cat
                    ? 'bg-[var(--color-primary)] text-white shadow-md'
                    : 'bg-[var(--color-surface)] text-[var(--color-text-secondary)] hover:bg-[var(--color-surface-elevated)]'
                }
              `}
            >
              {cat === 'all' ? 'Todas' : `${getCategoryIcon(cat)} ${cat}`}
            </button>
          ))}
        </div>
      </div>

      {/* Results count */}
      <div className="mb-4">
        <p className="text-sm text-[var(--color-text-secondary)]">
          {filteredIngredients.length === 0
            ? 'No se encontraron ingredientes'
            : `${filteredIngredients.length} ingrediente${filteredIngredients.length !== 1 ? 's' : ''} encontrado${filteredIngredients.length !== 1 ? 's' : ''}`}
        </p>
      </div>

      {/* Ingredients grid */}
      {filteredIngredients.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {filteredIngredients.map((ingredient) => (
            <Card
              key={ingredient.id}
              variant="outlined"
              padding="md"
              hoverable
              className="cursor-pointer"
              onClick={() => onSelect(ingredient)}
            >
              <div className="flex items-start gap-3">
                <span className="text-4xl flex-shrink-0">
                  {getCategoryIcon(ingredient.category)}
                </span>
                <div className="flex-1 min-w-0">
                  <h4 className="font-semibold text-[var(--color-text-primary)] mb-1 truncate">
                    {ingredient.name}
                  </h4>
                  <Badge variant="default" className="mb-2">
                    {ingredient.category}
                  </Badge>
                  {ingredient.synonyms.length > 0 && (
                    <p className="text-xs text-[var(--color-text-secondary)] line-clamp-2">
                      {ingredient.synonyms.slice(0, 2).join(', ')}
                    </p>
                  )}
                </div>
              </div>
            </Card>
          ))}
        </div>
      ) : (
        <Card variant="outlined" padding="lg" className="text-center">
          <span className="text-6xl mb-4 block">🔍</span>
          <h3 className="text-xl font-semibold text-[var(--color-text-primary)] mb-2">
            No se encontraron resultados
          </h3>
          <p className="text-sm text-[var(--color-text-secondary)]">
            Intenta con otro término de búsqueda o revisa los filtros
          </p>
        </Card>
      )}

      {/* Tip */}
      <Card variant="outlined" padding="md" className="mt-6">
        <div className="flex items-start gap-3">
          <span className="text-2xl">💡</span>
          <div>
            <p className="text-sm text-[var(--color-text-secondary)]">
              <strong>Tip:</strong> Puedes buscar por nombre o sinónimos. Por ejemplo, "pollo" o
              "chicken breast".
            </p>
          </div>
        </div>
      </Card>
    </div>
  );
}
