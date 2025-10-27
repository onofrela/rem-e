'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { MainLayout } from '@/components/layout';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Input } from '@/components/ui/Input';
import { mockRecipes } from '@/lib/utils/mock-data';

export default function RecipesPage() {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');

  const filteredRecipes = mockRecipes.filter(recipe =>
    recipe.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    recipe.tags.some(tag => tag.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  return (
    <MainLayout>
      <div className="min-h-screen pb-24 md:pb-8">
        {/* Header */}
        <div className="py-8 px-6">
          <div className="container mx-auto max-w-4xl">
            <h1 className="text-3xl font-bold mb-2 text-[var(--color-text-primary)]">
              📖 Mis Recetas
            </h1>
            <p className="text-[var(--color-text-secondary)]">
              Todas tus recetas favoritas en un solo lugar
            </p>
          </div>
        </div>

        <div className="container mx-auto max-w-4xl px-6 -mt-4">
          {/* Search and Filters */}
          <Card variant="elevated" padding="md" className="mb-6">
            <div className="flex flex-col md:flex-row gap-4">
              <div className="flex-1">
                <Input
                  placeholder="Buscar recetas..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  leftIcon={<span>🔍</span>}
                  fullWidth
                />
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => setViewMode('grid')}
                  className={`px-4 py-2 rounded-lg transition-colors ${
                    viewMode === 'grid'
                      ? 'bg-[var(--color-primary)] text-white'
                      : 'bg-[var(--color-surface)] text-[var(--color-text-secondary)]'
                  }`}
                >
                  ⊞ Grid
                </button>
                <button
                  onClick={() => setViewMode('list')}
                  className={`px-4 py-2 rounded-lg transition-colors ${
                    viewMode === 'list'
                      ? 'bg-[var(--color-primary)] text-white'
                      : 'bg-[var(--color-surface)] text-[var(--color-text-secondary)]'
                  }`}
                >
                  ☰ Lista
                </button>
              </div>
            </div>
          </Card>

          {/* Recipe Grid/List */}
          <div className={viewMode === 'grid' ? 'grid grid-cols-1 md:grid-cols-2 gap-4' : 'space-y-4'}>
            {filteredRecipes.map(recipe => (
              <Link key={recipe.id} href={`/recipes/${recipe.id}`}>
                <Card variant="elevated" padding="none" hoverable>
                  {viewMode === 'grid' ? (
                    <>
                      <div className="h-48 bg-gradient-to-br from-[var(--color-primary)] to-[var(--color-secondary)] flex items-center justify-center text-white text-6xl rounded-t-xl">
                        🍽
                      </div>
                      <div className="p-4">
                        <h3 className="text-lg font-bold mb-2 text-[var(--color-text-primary)]">
                          {recipe.name}
                        </h3>
                        <div className="flex flex-wrap gap-2">
                          <Badge variant="default" size="sm">⏱ {recipe.time} min</Badge>
                          <Badge variant="success" size="sm">👨‍🍳 {recipe.difficulty}</Badge>
                        </div>
                      </div>
                    </>
                  ) : (
                    <div className="p-4 flex gap-4">
                      <div className="w-24 h-24 bg-gradient-to-br from-[var(--color-primary)] to-[var(--color-secondary)] flex items-center justify-center text-white text-4xl rounded-lg flex-shrink-0">
                        🍽
                      </div>
                      <div className="flex-1">
                        <h3 className="text-lg font-bold mb-1 text-[var(--color-text-primary)]">
                          {recipe.name}
                        </h3>
                        <p className="text-sm text-[var(--color-text-secondary)] mb-2">
                          {recipe.description}
                        </p>
                        <div className="flex flex-wrap gap-2">
                          <Badge variant="default" size="sm">⏱ {recipe.time} min</Badge>
                          <Badge variant="success" size="sm">👨‍🍳 {recipe.difficulty}</Badge>
                        </div>
                      </div>
                    </div>
                  )}
                </Card>
              </Link>
            ))}
          </div>

          {filteredRecipes.length === 0 && (
            <Card variant="elevated" padding="lg" className="text-center">
              <div className="text-6xl mb-4">🔍</div>
              <h3 className="text-xl font-semibold mb-2 text-[var(--color-text-primary)]">
                No se encontraron recetas
              </h3>
              <p className="text-[var(--color-text-secondary)]">
                Intenta con otros términos de búsqueda
              </p>
            </Card>
          )}
        </div>
      </div>
    </MainLayout>
  );
}
