'use client';
import React, { useState, useEffect, useMemo, useRef } from 'react';
import { MainLayout } from '@/components/layout';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import type { CatalogIngredient, IngredientCategory } from '@/lib/db/schemas/types';
import {
  getAllIngredients,
  getCategories,
  exportIngredientsClean,
  importIngredientsFromJSON,
  initializeIngredientsCache,
} from '@/lib/db/services/ingredientService';

export default function GlossaryPage() {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [ingredients, setIngredients] = useState<CatalogIngredient[]>([]);
  const [categories, setCategories] = useState<IngredientCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [selectedIngredient, setSelectedIngredient] = useState<CatalogIngredient | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      // Initialize ingredients cache first
      await initializeIngredientsCache();

      const [ingredientsData, categoriesData] = await Promise.all([
        getAllIngredients(),
        getCategories(),
      ]);
      setIngredients(ingredientsData);
      setCategories(categoriesData);
    } catch (err) {
      setError('Error al cargar ingredientes');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const filteredIngredients = useMemo(() => {
    let filtered = ingredients;

    if (selectedCategory) {
      filtered = filtered.filter((ing) => ing.category === selectedCategory);
    }

    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (ing) =>
          ing.name.toLowerCase().includes(query) ||
          ing.normalizedName.toLowerCase().includes(query) ||
          ing.synonyms.some((syn) => syn.toLowerCase().includes(query))
      );
    }

    return filtered.sort((a, b) => a.name.localeCompare(b.name));
  }, [ingredients, selectedCategory, searchQuery]);

  const handleExport = async () => {
    try {
      const jsonData = await exportIngredientsClean();
      const blob = new Blob([jsonData], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `rem-e-ingredientes-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      setSuccessMessage('Glosario exportado correctamente');
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (err) {
      setError('Error al exportar el glosario');
    }
  };

  const handleImport = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      const text = await file.text();
      const result = await importIngredientsFromJSON(text);

      if (result.errors.length > 0) {
        setError(`Importación completada con errores: ${result.errors.join(', ')}`);
      } else {
        setSuccessMessage(`Se importaron ${result.success} ingredientes correctamente`);
        setTimeout(() => setSuccessMessage(null), 3000);
      }

      await loadData();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al importar el archivo');
    }

    event.target.value = '';
  };

  const categoryIcons: Record<string, string> = {
    'Proteínas': '🥩',
    'Lácteos': '🧀',
    'Vegetales': '🥬',
    'Frutas': '🍎',
    'Granos': '🌾',
    'Condimentos': '🧂',
    'Aceites': '🫒',
    'Harinas': '🌾',
    'Endulzantes': '🍯',
    'Bebidas': '🥤',
    'Otros': '📦',
  };

  return (
    <MainLayout>
      <div className="min-h-screen pb-24 md:pb-8">
        <div className="py-6 sm:py-8 px-4 md:px-6">
          <div className="container mx-auto max-w-6xl">
            <h1 className="text-2xl sm:text-3xl font-bold mb-2 text-[var(--color-text-primary)] animate-fadeInDown">
              📖 Glosario de Ingredientes
            </h1>
            <p className="text-sm sm:text-base text-[var(--color-text-secondary)]">
              Explora los {ingredients.length} ingredientes que Rem-E reconoce
            </p>
          </div>
        </div>

        <div className="container mx-auto max-w-6xl px-4 md:px-6 -mt-4 space-y-6">
          {error && (
            <Card variant="outlined" padding="md" className="border-red-300 bg-red-50">
              <div className="flex justify-between items-center">
                <p className="text-red-600 text-sm">{error}</p>
                <button onClick={() => setError(null)} className="text-red-600">
                  ✕
                </button>
              </div>
            </Card>
          )}

          {successMessage && (
            <Card variant="outlined" padding="md" className="border-green-300 bg-green-50">
              <p className="text-green-600 text-sm">{successMessage}</p>
            </Card>
          )}

          {/* Import/Export Section */}
          <Card variant="elevated" padding="lg" className="animate-fadeInUp">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
              <div>
                <h2 className="text-lg font-semibold mb-1">Importar / Exportar</h2>
                <p className="text-sm text-[var(--color-text-secondary)]">
                  Gestiona el catálogo de ingredientes de Rem-E
                </p>
              </div>
              <div className="flex gap-2 w-full sm:w-auto">
                <Button variant="primary" size="md" onClick={handleExport}>
                  Exportar JSON
                </Button>
                <div>
                  <Button 
                    variant="ghost" 
                    size="md" 
                    onClick={() => fileInputRef.current?.click()} // Disparador manual
                  >
                    Importar JSON
                  </Button>
                  
                  <input
                    ref={fileInputRef} // Conectamos la referencia
                    type="file"
                    accept=".json"
                    onChange={handleImport}
                    className="hidden" // Sigue oculto, pero funcional
                  />
                </div>
              </div>
            </div>
          </Card>

          {/* Filters */}
          <Card variant="elevated" padding="lg" className="animate-fadeInUp stagger-1">
            <div className="flex flex-col md:flex-row gap-4">
              <div className="flex-1">
                <label className="block text-sm font-medium mb-2">Buscar</label>
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Buscar por nombre o sinónimo..."
                  className="w-full px-4 py-3 rounded-lg border-2 border-[var(--color-border)] bg-[var(--color-background)] focus:border-[var(--color-primary)] outline-none transition-colors"
                />
              </div>
              <div className="md:w-64">
                <label className="block text-sm font-medium mb-2">Categoría</label>
                <select
                  value={selectedCategory}
                  onChange={(e) => setSelectedCategory(e.target.value)}
                  className="w-full px-4 py-3 rounded-lg border-2 border-[var(--color-border)] bg-[var(--color-background)] focus:border-[var(--color-primary)] outline-none"
                >
                  <option value="">Todas las categorías</option>
                  {categories.map((cat) => (
                    <option key={cat} value={cat}>
                      {categoryIcons[cat] || '📦'} {cat}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="mt-4 text-sm text-[var(--color-text-secondary)]">
              Mostrando {filteredIngredients.length} de {ingredients.length} ingredientes
            </div>
          </Card>

          {/* Ingredients Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {loading ? (
              <Card variant="elevated" padding="lg" className="col-span-full text-center">
                <div className="animate-spin text-4xl mb-2">🔄</div>
                <p className="text-[var(--color-text-secondary)]">Cargando ingredientes...</p>
              </Card>
            ) : filteredIngredients.length === 0 ? (
              <Card variant="elevated" padding="lg" className="col-span-full text-center">
                <div className="text-4xl mb-2">🔍</div>
                <p className="text-[var(--color-text-secondary)]">
                  No se encontraron ingredientes
                </p>
              </Card>
            ) : (
              filteredIngredients.map((ingredient, index) => (
                <Card
                  key={ingredient.id}
                  variant="elevated"
                  padding="md"
                  hoverable
                  className={`cursor-pointer animate-fadeInUp stagger-${Math.min(index % 5 + 1, 5)}`}
                  onClick={() => setSelectedIngredient(ingredient)}
                >
                  <div className="flex items-start gap-3">
                    <span className="text-3xl">
                      {categoryIcons[ingredient.category] || '📦'}
                    </span>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold truncate">{ingredient.name}</h3>
                      <p className="text-sm text-[var(--color-text-secondary)]">
                        {ingredient.category} • {ingredient.subcategory}
                      </p>
                      {ingredient.synonyms.length > 0 && (
                        <p className="text-xs text-[var(--color-text-tertiary)] mt-1 truncate">
                          También: {ingredient.synonyms.slice(0, 3).join(', ')}
                          {ingredient.synonyms.length > 3 && '...'}
                        </p>
                      )}
                    </div>
                  </div>
                </Card>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Ingredient Detail Modal */}
      {selectedIngredient && (
        <div
          className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50"
          onClick={() => setSelectedIngredient(null)}
        >
          <Card
            variant="elevated"
            padding="lg"
            className="max-w-lg w-full max-h-[90vh] overflow-y-auto animate-scaleIn"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-between items-start mb-4">
              <div className="flex items-center gap-3">
                <span className="text-4xl">
                  {categoryIcons[selectedIngredient.category] || '📦'}
                </span>
                <div>
                  <h2 className="text-xl font-bold">{selectedIngredient.name}</h2>
                  <p className="text-sm text-[var(--color-text-secondary)]">
                    {selectedIngredient.category} • {selectedIngredient.subcategory}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setSelectedIngredient(null)}
                className="text-2xl hover:text-[var(--color-primary)]"
              >
                ✕
              </button>
            </div>

            {/* Synonyms */}
            {selectedIngredient.synonyms.length > 0 && (
              <div className="mb-4">
                <h4 className="text-sm font-semibold mb-2">Sinónimos</h4>
                <div className="flex flex-wrap gap-2">
                  {selectedIngredient.synonyms.map((syn) => (
                    <Badge key={syn} variant="default">
                      {syn}
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            {/* Units */}
            <div className="mb-4">
              <h4 className="text-sm font-semibold mb-2">Unidades</h4>
              <p className="text-sm text-[var(--color-text-secondary)]">
                Predeterminada: <strong>{selectedIngredient.defaultUnit}</strong>
              </p>
              {selectedIngredient.alternativeUnits.length > 0 && (
                <p className="text-sm text-[var(--color-text-secondary)]">
                  Alternativas: {selectedIngredient.alternativeUnits.join(', ')}
                </p>
              )}
            </div>

            {/* Storage */}
            <div className="mb-4">
              <h4 className="text-sm font-semibold mb-2">Almacenamiento</h4>
              <div className="grid grid-cols-3 gap-2 text-sm">
                <div className="p-2 bg-[var(--color-surface)] rounded-lg text-center">
                  <div className="text-lg mb-1">🧊</div>
                  <div className="text-xs text-[var(--color-text-secondary)]">
                    Refrigerador
                  </div>
                  <div className="font-medium">
                    {selectedIngredient.storage.refrigerator || 'N/A'}
                  </div>
                </div>
                <div className="p-2 bg-[var(--color-surface)] rounded-lg text-center">
                  <div className="text-lg mb-1">❄️</div>
                  <div className="text-xs text-[var(--color-text-secondary)]">
                    Congelador
                  </div>
                  <div className="font-medium">
                    {selectedIngredient.storage.freezer || 'N/A'}
                  </div>
                </div>
                <div className="p-2 bg-[var(--color-surface)] rounded-lg text-center">
                  <div className="text-lg mb-1">🗄️</div>
                  <div className="text-xs text-[var(--color-text-secondary)]">Alacena</div>
                  <div className="font-medium">
                    {selectedIngredient.storage.pantry || 'N/A'}
                  </div>
                </div>
              </div>
            </div>

            {/* Nutrition */}
            <div className="mb-4">
              <h4 className="text-sm font-semibold mb-2">
                Información Nutricional (por {selectedIngredient.nutrition.per}
                {selectedIngredient.nutrition.unit})
              </h4>
              <div className="grid grid-cols-5 gap-2 text-center text-sm">
                <div className="p-2 bg-[var(--color-surface)] rounded-lg">
                  <div className="font-bold text-[var(--color-primary)]">
                    {selectedIngredient.nutrition.calories}
                  </div>
                  <div className="text-xs text-[var(--color-text-secondary)]">kcal</div>
                </div>
                <div className="p-2 bg-[var(--color-surface)] rounded-lg">
                  <div className="font-bold">{selectedIngredient.nutrition.protein}g</div>
                  <div className="text-xs text-[var(--color-text-secondary)]">
                    Proteína
                  </div>
                </div>
                <div className="p-2 bg-[var(--color-surface)] rounded-lg">
                  <div className="font-bold">{selectedIngredient.nutrition.carbs}g</div>
                  <div className="text-xs text-[var(--color-text-secondary)]">Carbs</div>
                </div>
                <div className="p-2 bg-[var(--color-surface)] rounded-lg">
                  <div className="font-bold">{selectedIngredient.nutrition.fat}g</div>
                  <div className="text-xs text-[var(--color-text-secondary)]">Grasa</div>
                </div>
                <div className="p-2 bg-[var(--color-surface)] rounded-lg">
                  <div className="font-bold">{selectedIngredient.nutrition.fiber}g</div>
                  <div className="text-xs text-[var(--color-text-secondary)]">Fibra</div>
                </div>
              </div>
            </div>

            {selectedIngredient.isCommon && (
              <Badge variant="success" className="mt-2">
                Ingrediente común
              </Badge>
            )}
          </Card>
        </div>
      )}
    </MainLayout>
  );
}
