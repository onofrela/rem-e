'use client';

import React, { useState, useRef } from 'react';
import { MainLayout } from '@/components/layout';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { useTheme } from '@/contexts/ThemeContext';
import {
  exportIngredientsClean,
  importIngredientsFromJSON,
  initializeIngredientsCache,
} from '@/lib/db/services/ingredientService';
import {
  exportRecipesClean,
  importRecipesFromJSON,
  initializeRecipesCache,
} from '@/lib/db/services/recipeService';

export default function SettingsPage() {
  const { theme, setTheme } = useTheme();
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Refs for file inputs
  const glossaryInputRef = useRef<HTMLInputElement | null>(null);
  const recipesInputRef = useRef<HTMLInputElement | null>(null);

  // ========== THEME HANDLERS ==========
  const handleThemeChange = (newTheme: 'green' | 'orange') => {
    setTheme(newTheme);
    setSuccessMessage(`Tema cambiado a ${newTheme === 'green' ? 'Pistacho' : 'Naranja'}`);
    setTimeout(() => setSuccessMessage(null), 2000);
  };

  // ========== GLOSSARY HANDLERS ==========
  const handleExportGlossary = async () => {
    try {
      const jsonData = await exportIngredientsClean();
      const blob = new Blob([jsonData], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `rem-e-glosario-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      setSuccessMessage('Glosario exportado correctamente');
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (err) {
      setError('Error al exportar el glosario');
      setTimeout(() => setError(null), 3000);
    }
  };

  const handleImportGlossary = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      const text = await file.text();
      const result = await importIngredientsFromJSON(text);

      if (result.errors.length > 0) {
        setError(`Importación con errores: ${result.errors.slice(0, 2).join(', ')}`);
        setTimeout(() => setError(null), 5000);
      } else {
        setSuccessMessage(`Se importaron ${result.success} ingredientes correctamente`);
        setTimeout(() => setSuccessMessage(null), 3000);
      }

      await initializeIngredientsCache();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al importar el archivo');
      setTimeout(() => setError(null), 3000);
    }

    event.target.value = '';
  };

  // ========== RECIPES HANDLERS ==========
  const handleExportRecipes = async () => {
    try {
      const jsonData = await exportRecipesClean();
      const blob = new Blob([jsonData], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `rem-e-recetas-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      setSuccessMessage('Recetas exportadas correctamente');
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (err) {
      setError('Error al exportar las recetas');
      setTimeout(() => setError(null), 3000);
    }
  };

  const handleImportRecipes = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      const text = await file.text();
      const result = await importRecipesFromJSON(text);

      if (result.errors.length > 0) {
        setError(`Importación con errores: ${result.errors.slice(0, 2).join(', ')}`);
        setTimeout(() => setError(null), 5000);
      } else {
        setSuccessMessage(`Se importaron ${result.success} recetas correctamente`);
        setTimeout(() => setSuccessMessage(null), 3000);
      }

      await initializeRecipesCache();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al importar el archivo');
      setTimeout(() => setError(null), 3000);
    }

    event.target.value = '';
  };

  return (
    <MainLayout>
      <div className="min-h-screen pb-24 md:pb-8">
        <div className="py-6 sm:py-8 px-4 md:px-6">
          <div className="container mx-auto max-w-4xl">
            <h1 className="text-2xl sm:text-3xl font-bold mb-2 text-[var(--color-text-primary)] animate-fadeInDown">
              ⚙️ Ajustes
            </h1>
            <p className="text-sm sm:text-base text-[var(--color-text-secondary)]">
              Personaliza tu experiencia con Rem-E
            </p>
          </div>
        </div>

        <div className="container mx-auto max-w-4xl px-4 md:px-6 -mt-4 space-y-6">
          {/* Notifications */}
          {error && (
            <Card variant="outlined" padding="md" className="border-red-300 bg-red-50 animate-fadeInDown">
              <div className="flex justify-between items-center">
                <p className="text-red-600 text-sm">{error}</p>
                <button onClick={() => setError(null)} className="text-red-600 text-xl">
                  ✕
                </button>
              </div>
            </Card>
          )}

          {successMessage && (
            <Card variant="outlined" padding="md" className="border-green-300 bg-green-50 animate-fadeInDown">
              <div className="flex justify-between items-center">
                <p className="text-green-600 text-sm">{successMessage}</p>
                <button onClick={() => setSuccessMessage(null)} className="text-green-600 text-xl">
                  ✕
                </button>
              </div>
            </Card>
          )}

          {/* Theme Settings */}
          <Card variant="elevated" padding="lg" className="animate-fadeInUp">
            <h2 className="text-lg sm:text-xl font-bold mb-4">🎨 Tema de Colores</h2>
            <p className="text-sm text-[var(--color-text-secondary)] mb-4">
              Elige el tema de color que prefieras para la aplicación
            </p>
            <div className="grid grid-cols-2 gap-4">
              <button
                onClick={() => handleThemeChange('green')}
                className={`
                  p-6 rounded-2xl border-2 transition-all duration-300
                  ${theme === 'green'
                    ? 'border-[#97c28a] bg-[#F5FAF3] shadow-lg'
                    : 'border-[var(--color-border)] bg-[var(--color-surface)] hover:border-[#97c28a]/50'
                  }
                `}
              >
                <div className="text-4xl mb-2">🌿</div>
                <div className="font-semibold text-lg">Pistacho</div>
                <div className="text-sm text-[var(--color-text-secondary)] mt-1">
                  Fresco y natural
                </div>
                {theme === 'green' && (
                  <div className="mt-2 text-[#97c28a] font-semibold text-sm">✓ Activo</div>
                )}
              </button>

              <button
                onClick={() => handleThemeChange('orange')}
                className={`
                  p-6 rounded-2xl border-2 transition-all duration-300
                  ${theme === 'orange'
                    ? 'border-[#FA8502] bg-[#FFF5E6] shadow-lg'
                    : 'border-[var(--color-border)] bg-[var(--color-surface)] hover:border-[#FA8502]/50'
                  }
                `}
              >
                <div className="text-4xl mb-2">🍊</div>
                <div className="font-semibold text-lg">Naranja</div>
                <div className="text-sm text-[var(--color-text-secondary)] mt-1">
                  Cálido y vibrante
                </div>
                {theme === 'orange' && (
                  <div className="mt-2 text-[#FA8502] font-semibold text-sm">✓ Activo</div>
                )}
              </button>
            </div>
          </Card>

          {/* Import/Export Glossary */}
          <Card variant="elevated" padding="lg" className="animate-fadeInUp stagger-1">
            <h2 className="text-lg sm:text-xl font-bold mb-2">📖 Glosario de Ingredientes</h2>
            <p className="text-sm text-[var(--color-text-secondary)] mb-4">
              Exporta o importa el catálogo completo de ingredientes que Rem-E reconoce
            </p>
            <div className="flex flex-col sm:flex-row gap-3">
              <Button variant="primary" size="md" onClick={handleExportGlossary} className="flex-1">
                📥 Exportar Glosario
              </Button>
              <div className="flex-1">
                <Button
                  variant="ghost"
                  size="md"
                  fullWidth
                  onClick={() => glossaryInputRef.current?.click()}
                >
                  📤 Importar Glosario
                </Button>
                <input
                  ref={glossaryInputRef}
                  type="file"
                  accept=".json"
                  onChange={handleImportGlossary}
                  className="hidden"
                />
              </div>
            </div>
            <p className="text-xs text-[var(--color-text-tertiary)] mt-3">
              El archivo exportado incluye todos los ingredientes con sus sinónimos, categorías y valores nutricionales
            </p>
          </Card>

          {/* Import/Export Recipes */}
          <Card variant="elevated" padding="lg" className="animate-fadeInUp stagger-2">
            <h2 className="text-lg sm:text-xl font-bold mb-2">🍳 Recetas</h2>
            <p className="text-sm text-[var(--color-text-secondary)] mb-4">
              Exporta o importa todas las recetas con sus variantes y sustitutos
            </p>
            <div className="flex flex-col sm:flex-row gap-3">
              <Button variant="primary" size="md" onClick={handleExportRecipes} className="flex-1">
                📥 Exportar Recetas
              </Button>
              <div className="flex-1">
                <Button
                  variant="ghost"
                  size="md"
                  fullWidth
                  onClick={() => recipesInputRef.current?.click()}
                >
                  📤 Importar Recetas
                </Button>
                <input
                  ref={recipesInputRef}
                  type="file"
                  accept=".json"
                  onChange={handleImportRecipes}
                  className="hidden"
                />
              </div>
            </div>
            <p className="text-xs text-[var(--color-text-tertiary)] mt-3">
              El archivo exportado incluye todas las recetas con ingredientes, pasos, variantes y sustituciones
            </p>
          </Card>

          {/* About */}
          <Card variant="elevated" padding="lg" className="text-center animate-fadeInUp stagger-3">
            <div className="text-5xl sm:text-6xl mb-4">🍳</div>
            <h2 className="text-xl sm:text-2xl font-bold mb-2 text-[var(--color-primary)]">Rem-E</h2>
            <p className="text-xs sm:text-sm text-[var(--color-text-secondary)] mb-4">
              Asistente de Cocina Inteligente<br />
              Versión 1.0.0 (Prototipo)
            </p>
            <div className="text-xs text-[var(--color-text-tertiary)]">
              100% Offline • Privacidad Absoluta • Open Source
            </div>
          </Card>
        </div>
      </div>
    </MainLayout>
  );
}
