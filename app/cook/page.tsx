'use client';

import React, { useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { MainLayout } from '@/components/layout';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { Badge } from '@/components/ui/Badge';
import { api, DetectedIngredient } from '@/lib/api/mock-api';

type InputMethod = 'photo' | 'manual' | 'suggestions';

export default function CookPage() {
  const router = useRouter();
  const [activeMethod, setActiveMethod] = useState<InputMethod>('photo');
  const [selectedIngredients, setSelectedIngredients] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<string[]>([]);
  const [isDetecting, setIsDetecting] = useState(false);
  const [detectedIngredients, setDetectedIngredients] = useState<DetectedIngredient[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Handle photo capture
  const handlePhotoCapture = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsDetecting(true);
    try {
      const detected = await api.detectIngredients(file);
      setDetectedIngredients(detected);
      // Auto-add high confidence detections
      const highConfidence = detected
        .filter(d => d.confidence > 0.8)
        .map(d => d.name);
      setSelectedIngredients(prev => [...new Set([...prev, ...highConfidence])]);
    } catch (error) {
      console.error('Error detecting ingredients:', error);
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

    const results = await api.searchIngredients(query);
    setSearchResults(results);
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
        <div className="bg-gradient-to-b from-[var(--color-primary)] to-[var(--color-secondary)] text-white py-6 sm:py-8 px-4 md:px-6">
          <div className="container mx-auto max-w-4xl">
            <button
              onClick={() => router.back()}
              className="mb-4 text-white/80 hover:text-white transition-colors min-h-[44px] flex items-center"
            >
              ← Volver
            </button>
            <h1 className="text-2xl sm:text-3xl font-bold mb-2 animate-fadeInDown">🍽 Cocinar Ahora</h1>
            <p className="text-sm sm:text-base text-white/90">
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
                  <div className="inline-block animate-spin text-4xl mb-2">⚙️</div>
                  <p className="text-[var(--color-text-secondary)]">
                    Analizando imagen con IA...
                  </p>
                </div>
              )}

              {detectedIngredients.length > 0 && !isDetecting && (
                <div className="mt-6">
                  <h4 className="font-semibold mb-3 text-[var(--color-text-primary)]">
                    Ingredientes detectados:
                  </h4>
                  <div className="space-y-2">
                    {detectedIngredients.map((ing, idx) => (
                      <div
                        key={idx}
                        className="flex items-center justify-between p-3 bg-[var(--color-surface)] rounded-lg"
                      >
                        <div className="flex items-center gap-3">
                          <span className="text-xl">✓</span>
                          <span className="font-medium">{ing.name}</span>
                          <Badge
                            variant={ing.confidence > 0.9 ? 'success' : 'warning'}
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
                          className="text-sm text-[var(--color-primary)] hover:underline"
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
                Ingredientes sugeridos
              </h3>
              <p className="text-sm sm:text-base text-[var(--color-text-secondary)] mb-6">
                Basado en lo que sueles tener disponible
              </p>

              <div className="space-y-3">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 p-4 bg-[var(--color-accent)] rounded-lg">
                  <div>
                    <p className="font-semibold text-[var(--color-text-primary)]">
                      🥚 Ingredientes de desayuno
                    </p>
                    <p className="text-sm text-[var(--color-text-secondary)]">
                      Huevo, Pan, Leche, Queso
                    </p>
                  </div>
                  <Button
                    variant="primary"
                    size="sm"
                    onClick={() => setSelectedIngredients(['Huevo', 'Pan', 'Leche', 'Queso'])}
                  >
                    Usar
                  </Button>
                </div>

                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 p-4 bg-[var(--color-accent)] rounded-lg">
                  <div>
                    <p className="font-semibold text-[var(--color-text-primary)]">
                      🍝 Ingredientes para pasta
                    </p>
                    <p className="text-sm text-[var(--color-text-secondary)]">
                      Pasta, Tomate, Ajo, Queso
                    </p>
                  </div>
                  <Button
                    variant="primary"
                    size="sm"
                    onClick={() => setSelectedIngredients(['Pasta', 'Tomate', 'Ajo', 'Queso'])}
                  >
                    Usar
                  </Button>
                </div>

                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 p-4 bg-[var(--color-accent)] rounded-lg">
                  <div>
                    <p className="font-semibold text-[var(--color-text-primary)]">
                      🌮 Comida mexicana
                    </p>
                    <p className="text-sm text-[var(--color-text-secondary)]">
                      Pollo, Tortillas, Tomate, Cebolla, Limón
                    </p>
                  </div>
                  <Button
                    variant="primary"
                    size="sm"
                    onClick={() => setSelectedIngredients(['Pollo', 'Tortillas', 'Tomate', 'Cebolla', 'Limón'])}
                  >
                    Usar
                  </Button>
                </div>
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

          {/* Continue Button */}
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
        </div>
      </div>
    </MainLayout>
  );
}
