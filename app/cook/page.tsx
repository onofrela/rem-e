'use client';

import React, { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { MainLayout } from '@/components/layout';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { Badge } from '@/components/ui/Badge';
import { recognizeFoodFromFile, RecognitionResult } from '@/lib/vision';
import { searchIngredients } from '@/lib/db/services/ingredientService';
import { getTopRecommendedRecipes } from '@/lib/db/services/cookRecommendationService';
import type { Recipe } from '@/lib/db/schemas/types';

type InputMethod = 'photo' | 'manual' | 'suggestions';

// Extended interface for detected ingredients with vision data
interface DetectedIngredient {
  name: string;
  confidence: number;
  category?: string;
  description?: string;
  estimatedWeight?: number;
}

export default function CookPage() {
  const router = useRouter();
  const [activeMethod, setActiveMethod] = useState<InputMethod>('photo');
  const [selectedIngredients, setSelectedIngredients] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<string[]>([]);
  const [isDetecting, setIsDetecting] = useState(false);
  const [detectedIngredients, setDetectedIngredients] = useState<DetectedIngredient[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [detectionError, setDetectionError] = useState<string | null>(null);
  const [lastRecognitionResult, setLastRecognitionResult] = useState<RecognitionResult | null>(null);

  // Estado para sugerencias de recetas
  const [recommendedRecipes, setRecommendedRecipes] = useState<Recipe[]>([]);
  const [isLoadingRecommendations, setIsLoadingRecommendations] = useState(false);

  // Cargar recomendaciones cuando se selecciona el método de sugerencias
  useEffect(() => {
    if (activeMethod === 'suggestions') {
      loadRecommendations();
    }
  }, [activeMethod]);

  const loadRecommendations = async () => {
    setIsLoadingRecommendations(true);
    try {
      const recommendations = await getTopRecommendedRecipes(10);
      setRecommendedRecipes(recommendations.map(r => r.recipe));
    } catch (error) {
      console.error('Error loading recommendations:', error);
    } finally {
      setIsLoadingRecommendations(false);
    }
  };

  // Handle photo capture with real AI detection
  const handlePhotoCapture = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsDetecting(true);
    setDetectionError(null);
    setDetectedIngredients([]);

    try {
      // Use real AI vision detection via Qwen VL
      const results = await recognizeFoodFromFile(file);

      if (results.length > 0) {
        const result = results[0];
        setLastRecognitionResult(result);

        // Convert recognition result to detected ingredients
        const detected: DetectedIngredient[] = [];

        // Add main ingredient detected
        if (result.foodNameEs && result.foodNameEs !== 'Ingrediente') {
          detected.push({
            name: result.foodNameEs,
            confidence: result.confidence / 100,
            category: result.category,
            description: result.description,
            estimatedWeight: result.estimatedWeight?.weight,
          });
        }

        // Add individual ingredients if detected (for dishes)
        if (result.ingredients && result.ingredients.length > 0) {
          result.ingredients.forEach(ing => {
            detected.push({
              name: ing,
              confidence: 0.75, // Estimated confidence for sub-ingredients
            });
          });
        }

        setDetectedIngredients(detected);

        // Auto-add high confidence detections
        const highConfidence = detected
          .filter(d => d.confidence > 0.7)
          .map(d => d.name);
        setSelectedIngredients(prev => [...new Set([...prev, ...highConfidence])]);
      }
    } catch (error) {
      console.error('Error detecting ingredients:', error);
      setDetectionError(
        error instanceof Error
          ? error.message
          : 'Error al analizar la imagen. Asegúrate de que LM Studio esté corriendo.'
      );

      // Fallback to mock API if real detection fails
      try {
        const detected = await api.detectIngredients(file);
        setDetectedIngredients(detected);
        const highConfidence = detected
          .filter(d => d.confidence > 0.8)
          .map(d => d.name);
        setSelectedIngredients(prev => [...new Set([...prev, ...highConfidence])]);
        setDetectionError('Usando detección simulada (LM Studio no disponible)');
      } catch {
        // If both fail, show error
      }
    } finally {
      setIsDetecting(false);
    }
  };

  // Handle manual search
  const handleSearch = async (query: string) => {
    setSearchQuery(query);
    if (query.length < 2) {
      setSearchResults([]);
      return;
    }

    try {
      const results = await searchIngredients({ query, limit: 10 });
      setSearchResults(results.map(ing => ing.name));
    } catch (error) {
      console.error('Error searching ingredients:', error);
      setSearchResults([]);
    }
  };

  // Add ingredient
  const addIngredient = (ingredient: string) => {
    if (!selectedIngredients.includes(ingredient)) {
      setSelectedIngredients([...selectedIngredients, ingredient]);
    }
    setSearchQuery('');
    setSearchResults([]);
  };

  // Remove ingredient
  const removeIngredient = (ingredient: string) => {
    setSelectedIngredients(selectedIngredients.filter(i => i !== ingredient));
  };

  // Common ingredients for quick add
  const commonIngredients = [
    'Pollo', 'Carne de res', 'Huevo', 'Arroz', 'Pasta',
    'Tomate', 'Cebolla', 'Ajo', 'Papa', 'Queso',
  ];

  // Proceed to suggestions
  const handleContinue = () => {
    if (selectedIngredients.length === 0) return;

    // Store ingredients in localStorage for the suggestions page
    localStorage.setItem('selectedIngredients', JSON.stringify(selectedIngredients));
    router.push('/cook/suggestions');
  };

  return (
    <MainLayout>
      <div className="min-h-screen pb-24 md:pb-8">
        {/* Header */}
        <div className="py-6 sm:py-8 px-4 md:px-6">
          <div className="container mx-auto max-w-4xl">
            <button
              onClick={() => router.back()}
              className="mb-4 text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] transition-colors min-h-[44px] flex items-center"
            >
              ← Volver
            </button>
            <h1 className="text-2xl sm:text-3xl font-bold mb-2 text-[var(--color-text-primary)] animate-fadeInDown">🍽 Cocinar Ahora</h1>
            <p className="text-sm sm:text-base text-[var(--color-text-secondary)]">
              Dime qué ingredientes tienes y te sugeriré recetas deliciosas
            </p>
          </div>
        </div>

        <div className="container mx-auto max-w-4xl px-4 md:px-6 -mt-4">
          {/* Method Selector Tabs */}
          <Card variant="elevated" padding="sm" className="mb-6 animate-scaleIn">
            <div className="grid grid-cols-3 gap-2">
              <button
                onClick={() => setActiveMethod('photo')}
                className={`
                  py-3 px-2 sm:px-4 rounded-lg text-sm sm:text-base font-medium transition-all min-h-[44px]
                  ${activeMethod === 'photo'
                    ? 'bg-[var(--color-primary)] text-white shadow-md'
                    : 'bg-transparent text-[var(--color-text-secondary)] hover:bg-[var(--color-surface)]'
                  }
                `}
              >
                📷 Foto
              </button>
              <button
                onClick={() => setActiveMethod('manual')}
                className={`
                  py-3 px-2 sm:px-4 rounded-lg text-sm sm:text-base font-medium transition-all min-h-[44px]
                  ${activeMethod === 'manual'
                    ? 'bg-[var(--color-primary)] text-white shadow-md'
                    : 'bg-transparent text-[var(--color-text-secondary)] hover:bg-[var(--color-surface)]'
                  }
                `}
              >
                ✍️ Escribir
              </button>
              <button
                onClick={() => setActiveMethod('suggestions')}
                className={`
                  py-3 px-2 sm:px-4 rounded-lg text-sm sm:text-base font-medium transition-all min-h-[44px]
                  ${activeMethod === 'suggestions'
                    ? 'bg-[var(--color-primary)] text-white shadow-md'
                    : 'bg-transparent text-[var(--color-text-secondary)] hover:bg-[var(--color-surface)]'
                  }
                `}
              >
                💡 Sugerencias
              </button>
            </div>
          </Card>

          {/* Photo Input Method */}
          {activeMethod === 'photo' && (
            <Card variant="elevated" padding="lg" className="mb-6 animate-fadeInUp">
              <h3 className="text-lg sm:text-xl font-semibold mb-4 text-[var(--color-text-primary)]">
                Toma una foto de tus ingredientes
              </h3>
              <p className="text-sm sm:text-base text-[var(--color-text-secondary)] mb-6">
                Rem-E detectará automáticamente lo que tienes disponible
              </p>

              <input
                type="file"
                ref={fileInputRef}
                onChange={handlePhotoCapture}
                accept="image/*"
                capture="environment"
                className="hidden"
              />

              <Button
                variant="primary"
                size="lg"
                fullWidth
                onClick={() => fileInputRef.current?.click()}
                disabled={isDetecting}
              >
                {isDetecting ? '🔍 Detectando ingredientes...' : '📸 Abrir Cámara'}
              </Button>

              {isDetecting && (
                <div className="mt-6 text-center">
                  <div className="inline-block animate-spin text-4xl mb-2">🔍</div>
                  <p className="text-[var(--color-text-secondary)]">
                    Analizando imagen con IA (Qwen VL)...
                  </p>
                  <p className="text-xs text-[var(--color-text-secondary)] mt-1">
                    Esto puede tomar unos segundos
                  </p>
                </div>
              )}

              {detectionError && !isDetecting && (
                <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                  <p className="text-sm text-yellow-800">
                    ⚠️ {detectionError}
                  </p>
                </div>
              )}

              {lastRecognitionResult && !isDetecting && (
                <div className="mt-6 p-4 bg-[var(--color-accent)] rounded-xl">
                  <div className="flex items-start gap-4">
                    <div className="text-4xl">🎯</div>
                    <div className="flex-1">
                      <h4 className="font-bold text-lg text-[var(--color-text-primary)]">
                        {lastRecognitionResult.foodNameEs}
                      </h4>
                      {lastRecognitionResult.category && (
                        <Badge variant="info" size="sm" className="mt-1">
                          {lastRecognitionResult.category}
                        </Badge>
                      )}
                      {lastRecognitionResult.description && (
                        <p className="text-sm text-[var(--color-text-secondary)] mt-2 line-clamp-2">
                          {lastRecognitionResult.description}
                        </p>
                      )}
                      <div className="flex gap-4 mt-2 text-xs text-[var(--color-text-secondary)]">
                        <span>Confianza: {lastRecognitionResult.confidence}%</span>
                        {lastRecognitionResult.estimatedWeight && (
                          <span>~{lastRecognitionResult.estimatedWeight.weight}g</span>
                        )}
                        {lastRecognitionResult.estimatedCalories && (
                          <span>{lastRecognitionResult.estimatedCalories}</span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {detectedIngredients.length > 0 && !isDetecting && (
                <div className="mt-6">
                  <h4 className="font-semibold mb-3 text-[var(--color-text-primary)]">
                    Ingredientes detectados ({detectedIngredients.length}):
                  </h4>
                  <div className="space-y-2">
                    {detectedIngredients.map((ing, idx) => (
                      <div
                        key={idx}
                        className="flex items-center justify-between p-3 bg-[var(--color-surface)] rounded-lg"
                      >
                        <div className="flex items-center gap-3 flex-1">
                          <span className="text-xl">
                            {selectedIngredients.includes(ing.name) ? '✓' : '○'}
                          </span>
                          <div className="flex-1">
                            <span className="font-medium">{ing.name}</span>
                            {ing.category && (
                              <span className="text-xs text-[var(--color-text-secondary)] ml-2">
                                ({ing.category})
                              </span>
                            )}
                            {ing.estimatedWeight && (
                              <span className="text-xs text-[var(--color-text-secondary)] ml-2">
                                ~{ing.estimatedWeight}g
                              </span>
                            )}
                          </div>
                          <Badge
                            variant={ing.confidence > 0.85 ? 'success' : ing.confidence > 0.7 ? 'warning' : 'default'}
                            size="sm"
                          >
                            {Math.round(ing.confidence * 100)}%
                          </Badge>
                        </div>
                        <button
                          onClick={() => {
                            if (selectedIngredients.includes(ing.name)) {
                              removeIngredient(ing.name);
                            } else {
                              addIngredient(ing.name);
                            }
                          }}
                          className="text-sm text-[var(--color-primary)] hover:underline ml-3 min-w-[70px] text-right"
                        >
                          {selectedIngredients.includes(ing.name) ? 'Remover' : 'Agregar'}
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </Card>
          )}

          {/* Manual Input Method */}
          {activeMethod === 'manual' && (
            <Card variant="elevated" padding="lg" className="mb-6 animate-fadeInUp">
              <h3 className="text-lg sm:text-xl font-semibold mb-4 text-[var(--color-text-primary)]">
                Escribe tus ingredientes
              </h3>

              <div className="relative">
                <Input
                  placeholder="Buscar ingrediente..."
                  value={searchQuery}
                  onChange={(e) => handleSearch(e.target.value)}
                  leftIcon={<span>🔍</span>}
                  fullWidth
                />

                {searchResults.length > 0 && (
                  <Card
                    variant="elevated"
                    padding="sm"
                    className="absolute top-full left-0 right-0 mt-2 z-10 max-h-60 overflow-y-auto"
                  >
                    {searchResults.map((result, idx) => (
                      <button
                        key={idx}
                        onClick={() => addIngredient(result)}
                        className="w-full text-left px-4 py-3 hover:bg-[var(--color-surface)] rounded-lg transition-colors"
                      >
                        {result}
                      </button>
                    ))}
                  </Card>
                )}
              </div>

              <div className="mt-6">
                <p className="text-sm text-[var(--color-text-secondary)] mb-3">
                  O selecciona de los más comunes:
                </p>
                <div className="flex flex-wrap gap-2">
                  {commonIngredients.map((ing) => (
                    <button
                      key={ing}
                      onClick={() => addIngredient(ing)}
                      disabled={selectedIngredients.includes(ing)}
                      className={`
                        px-4 py-2 rounded-full text-sm font-medium transition-all
                        ${selectedIngredients.includes(ing)
                          ? 'bg-[var(--color-success)] text-white'
                          : 'bg-[var(--color-surface)] text-[var(--color-text-primary)] hover:bg-[var(--color-border)]'
                        }
                      `}
                    >
                      {selectedIngredients.includes(ing) ? '✓ ' : ''}{ing}
                    </button>
                  ))}
                </div>
              </div>
            </Card>
          )}

          {/* Suggestions Method */}
          {activeMethod === 'suggestions' && (
            <Card variant="elevated" padding="lg" className="mb-6 animate-fadeInUp">
              <h3 className="text-lg sm:text-xl font-semibold mb-4 text-[var(--color-text-primary)]">
                Recetas recomendadas para ti
              </h3>
              <p className="text-sm sm:text-base text-[var(--color-text-secondary)] mb-6">
                Basado en tu inventario, historial y preferencias
              </p>

              {isLoadingRecommendations ? (
                <div className="text-center py-12">
                  <div className="inline-block animate-spin text-4xl mb-3">🔍</div>
                  <p className="text-[var(--color-text-secondary)]">
                    Buscando las mejores recetas para ti...
                  </p>
                </div>
              ) : recommendedRecipes.length === 0 ? (
                <div className="text-center py-12">
                  <div className="text-6xl mb-4">🤔</div>
                  <p className="text-[var(--color-text-secondary)]">
                    No hay recetas disponibles. Agrega recetas a tu base de datos primero.
                  </p>
                </div>
              ) : (
                <div className="space-y-3 max-h-[500px] overflow-y-auto">
                  {recommendedRecipes.map((recipe, index) => (
                    <Link key={recipe.id} href={`/recipes/${recipe.id}`}>
                      <Card
                        variant="outlined"
                        padding="md"
                        hoverable
                        className="transition-all hover:shadow-md"
                      >
                        <div className="flex items-start gap-4">
                          <div className="text-4xl flex-shrink-0">🍽</div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-start justify-between gap-2 mb-2">
                              <h4 className="text-base sm:text-lg font-bold text-[var(--color-text-primary)]">
                                {recipe.name}
                              </h4>
                              <Badge variant="info" size="sm">
                                #{index + 1}
                              </Badge>
                            </div>
                            <p className="text-sm text-[var(--color-text-secondary)] mb-3 line-clamp-2">
                              {recipe.description}
                            </p>
                            <div className="flex flex-wrap gap-2">
                              <Badge variant="default" size="sm">
                                ⏱ {recipe.time}m
                              </Badge>
                              <Badge variant="success" size="sm">
                                👨‍🍳 {recipe.difficulty}
                              </Badge>
                              <Badge variant="default" size="sm">
                                🍴 {recipe.servings}
                              </Badge>
                            </div>
                          </div>
                        </div>
                      </Card>
                    </Link>
                  ))}
                </div>
              )}

              <div className="mt-4 p-3 bg-[var(--color-accent)] rounded-lg">
                <p className="text-xs sm:text-sm text-[var(--color-text-secondary)]">
                  💡 <strong>Consejo:</strong> Estas recetas se seleccionan según lo que tienes en inventario
                  y tus preferencias de cocina. Toca cualquier receta para ver los detalles completos.
                </p>
              </div>
            </Card>
          )}

          {/* Selected Ingredients Summary */}
          {selectedIngredients.length > 0 && (
            <Card variant="elevated" padding="lg" className="mb-6 animate-fadeInUp">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-base sm:text-lg font-semibold text-[var(--color-text-primary)]">
                  Ingredientes seleccionados ({selectedIngredients.length})
                </h3>
                <button
                  onClick={() => setSelectedIngredients([])}
                  className="text-sm text-[var(--color-error)] hover:underline min-h-[44px] flex items-center"
                >
                  Limpiar todo
                </button>
              </div>

              <div className="flex flex-wrap gap-2">
                {selectedIngredients.map((ing) => (
                  <Badge
                    key={ing}
                    variant="success"
                    className="flex items-center gap-2 px-3 py-2 cursor-pointer hover:opacity-80"
                    onClick={() => removeIngredient(ing)}
                  >
                    {ing}
                    <span className="text-white/80">✕</span>
                  </Badge>
                ))}
              </div>
            </Card>
          )}

          {/* Continue Button - solo para foto y manual */}
          {activeMethod !== 'suggestions' && (
            <>
              <Button
                variant="primary"
                size="xl"
                fullWidth
                onClick={handleContinue}
                disabled={selectedIngredients.length === 0}
              >
                Ver Recetas Sugeridas ({selectedIngredients.length} ingredientes)
              </Button>

              {selectedIngredients.length === 0 && (
                <p className="text-center text-sm text-[var(--color-text-secondary)] mt-4">
                  Agrega al menos un ingrediente para continuar
                </p>
              )}
            </>
          )}
        </div>
      </div>
    </MainLayout>
  );
}
