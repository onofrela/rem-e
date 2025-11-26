'use client';

import React, { useState, useRef } from 'react';
import { MainLayout } from '@/components/layout';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { useTheme } from '@/contexts/ThemeContext';
import {
  exportIngredientsClean,
  importIngredientsFromJSON,
} from '@/lib/db/services/ingredientService';
import {
  exportRecipesClean,
  importRecipesFromJSON,
} from '@/lib/db/services/recipeService';
import {
  exportAppliancesToJSON,
  importAppliancesFromJSON,
} from '@/lib/db/services/applianceService';
import {
  exportInventoryToJSON,
  importInventoryFromJSON,
} from '@/lib/db/services/inventoryService';
import {
  exportUserAppliancesToJSON,
  importUserAppliancesFromJSON,
} from '@/lib/db/services/userApplianceService';
import {
  exportRecipeHistoryToJSON,
  importRecipeHistoryFromJSON,
} from '@/lib/db/services/recipeHistoryService';
import { useRecipeSettings } from '@/contexts/RecipeSettingsContext';

export default function SettingsPage() {
  const { theme, setTheme } = useTheme();
  const { settings, updateSettings } = useRecipeSettings();
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Refs for file inputs
  const glossaryInputRef = useRef<HTMLInputElement | null>(null);
  const recipesInputRef = useRef<HTMLInputElement | null>(null);
  const appliancesInputRef = useRef<HTMLInputElement | null>(null);
  const inventoryInputRef = useRef<HTMLInputElement | null>(null);
  const myKitchenInputRef = useRef<HTMLInputElement | null>(null);
  const historyInputRef = useRef<HTMLInputElement | null>(null);

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
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al importar el archivo');
      setTimeout(() => setError(null), 3000);
    }

    event.target.value = '';
  };

  // ========== APPLIANCES HANDLERS ==========
  const handleExportAppliances = async () => {
    try {
      const jsonData = await exportAppliancesToJSON();
      const blob = new Blob([jsonData], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `rem-e-electrodomesticos-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      setSuccessMessage('Electrodomésticos exportados correctamente');
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (err) {
      setError('Error al exportar los electrodomésticos');
      setTimeout(() => setError(null), 3000);
    }
  };

  const handleImportAppliances = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      const text = await file.text();
      const result = await importAppliancesFromJSON(text);

      if (result.errors.length > 0) {
        setError(`Importación con errores: ${result.errors.slice(0, 2).join(', ')}`);
        setTimeout(() => setError(null), 5000);
      } else {
        setSuccessMessage(`Se importaron ${result.success} electrodomésticos correctamente`);
        setTimeout(() => setSuccessMessage(null), 3000);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al importar el archivo');
      setTimeout(() => setError(null), 3000);
    }

    event.target.value = '';
  };

  // ========== INVENTORY HANDLERS ==========
  const handleExportInventory = async () => {
    try {
      const jsonData = await exportInventoryToJSON();
      const blob = new Blob([jsonData], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `rem-e-inventario-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      setSuccessMessage('Inventario exportado correctamente');
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (err) {
      setError('Error al exportar el inventario');
      setTimeout(() => setError(null), 3000);
    }
  };

  const handleImportInventory = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      const text = await file.text();
      const result = await importInventoryFromJSON(text, true);

      if (result.errors.length > 0) {
        setError(`Importación con errores: ${result.errors.slice(0, 2).join(', ')}`);
        setTimeout(() => setError(null), 5000);
      } else {
        setSuccessMessage(`Se importaron ${result.success} items de inventario correctamente`);
        setTimeout(() => setSuccessMessage(null), 3000);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al importar el archivo');
      setTimeout(() => setError(null), 3000);
    }

    event.target.value = '';
  };

  // ========== MY KITCHEN HANDLERS ==========
  const handleExportMyKitchen = async () => {
    try {
      const jsonData = await exportUserAppliancesToJSON();
      const blob = new Blob([jsonData], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `rem-e-mi-cocina-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      setSuccessMessage('Mi Cocina exportado correctamente');
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (err) {
      setError('Error al exportar Mi Cocina');
      setTimeout(() => setError(null), 3000);
    }
  };

  const handleImportMyKitchen = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      const text = await file.text();
      const result = await importUserAppliancesFromJSON(text, true);

      if (result.errors.length > 0) {
        setError(`Importación con errores: ${result.errors.slice(0, 2).join(', ')}`);
        setTimeout(() => setError(null), 5000);
      } else {
        setSuccessMessage(`Se importaron ${result.success} electrodomésticos de Mi Cocina correctamente`);
        setTimeout(() => setSuccessMessage(null), 3000);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al importar el archivo');
      setTimeout(() => setError(null), 3000);
    }

    event.target.value = '';
  };

  // ========== HISTORY HANDLERS ==========
  const handleExportHistory = async () => {
    try {
      const jsonData = await exportRecipeHistoryToJSON();
      const blob = new Blob([jsonData], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `rem-e-historial-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      setSuccessMessage('Historial exportado correctamente');
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (err) {
      setError('Error al exportar el historial');
      setTimeout(() => setError(null), 3000);
    }
  };

  const handleImportHistory = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      const text = await file.text();
      const result = await importRecipeHistoryFromJSON(text, true);

      if (result.errors.length > 0) {
        setError(`Importación con errores: ${result.errors.slice(0, 2).join(', ')}`);
        setTimeout(() => setError(null), 5000);
      } else {
        setSuccessMessage(`Se importaron ${result.success} entradas de historial correctamente`);
        setTimeout(() => setSuccessMessage(null), 3000);
      }
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

          {/* Recipe Preferences */}
          <Card variant="elevated" padding="lg" className="animate-fadeInUp">
            <h2 className="text-lg sm:text-xl font-bold mb-4">🍳 Preferencias de Recetas</h2>
            <p className="text-sm text-[var(--color-text-secondary)] mb-4">
              Personaliza cómo funciona la experiencia de cocina
            </p>
            <div className="flex items-center justify-between p-4 bg-[var(--color-primary-light)] rounded-xl">
              <div className="flex-1">
                <h3 className="text-base sm:text-lg font-semibold mb-1">Solicitar Calificación</h3>
                <p className="text-xs sm:text-sm text-[var(--color-text-secondary)]">
                  Pedir calificación al completar una receta por primera vez
                </p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer ml-4">
                <input
                  type="checkbox"
                  checked={settings.askForRating}
                  onChange={(e) => updateSettings({ askForRating: e.target.checked })}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-[var(--color-primary)]/20 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[var(--color-primary)]"></div>
              </label>
            </div>
          </Card>

          {/* Theme Settings */}
          <Card variant="elevated" padding="lg" className="animate-fadeInUp stagger-1">
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

          {/* Import/Export Appliances */}
          <Card variant="elevated" padding="lg" className="animate-fadeInUp stagger-3">
            <h2 className="text-lg sm:text-xl font-bold mb-2">🔌 Electrodomésticos</h2>
            <p className="text-sm text-[var(--color-text-secondary)] mb-4">
              Exporta o importa el catálogo completo de electrodomésticos disponibles
            </p>
            <div className="flex flex-col sm:flex-row gap-3">
              <Button variant="primary" size="md" onClick={handleExportAppliances} className="flex-1">
                📥 Exportar Electrodomésticos
              </Button>
              <div className="flex-1">
                <Button
                  variant="ghost"
                  size="md"
                  fullWidth
                  onClick={() => appliancesInputRef.current?.click()}
                >
                  📤 Importar Electrodomésticos
                </Button>
                <input
                  ref={appliancesInputRef}
                  type="file"
                  accept=".json"
                  onChange={handleImportAppliances}
                  className="hidden"
                />
              </div>
            </div>
            <p className="text-xs text-[var(--color-text-tertiary)] mt-3">
              El archivo exportado incluye todos los electrodomésticos con sus especificaciones y alternativas
            </p>
          </Card>

          {/* Import/Export Inventory */}
          <Card variant="elevated" padding="lg" className="animate-fadeInUp stagger-4">
            <h2 className="text-lg sm:text-xl font-bold mb-2">📦 Inventario</h2>
            <p className="text-sm text-[var(--color-text-secondary)] mb-4">
              Exporta o importa tu inventario personal de ingredientes
            </p>
            <div className="flex flex-col sm:flex-row gap-3">
              <Button variant="primary" size="md" onClick={handleExportInventory} className="flex-1">
                📥 Exportar Inventario
              </Button>
              <div className="flex-1">
                <Button
                  variant="ghost"
                  size="md"
                  fullWidth
                  onClick={() => inventoryInputRef.current?.click()}
                >
                  📤 Importar Inventario
                </Button>
                <input
                  ref={inventoryInputRef}
                  type="file"
                  accept=".json"
                  onChange={handleImportInventory}
                  className="hidden"
                />
              </div>
            </div>
            <p className="text-xs text-[var(--color-text-tertiary)] mt-3">
              El archivo exportado incluye todos los ingredientes en tu despensa, refrigerador y congelador con cantidades y fechas de vencimiento
            </p>
          </Card>

          {/* Import/Export My Kitchen */}
          <Card variant="elevated" padding="lg" className="animate-fadeInUp stagger-5">
            <h2 className="text-lg sm:text-xl font-bold mb-2">🏠 Mi Cocina</h2>
            <p className="text-sm text-[var(--color-text-secondary)] mb-4">
              Exporta o importa los electrodomésticos que tienes en tu cocina
            </p>
            <div className="flex flex-col sm:flex-row gap-3">
              <Button variant="primary" size="md" onClick={handleExportMyKitchen} className="flex-1">
                📥 Exportar Mi Cocina
              </Button>
              <div className="flex-1">
                <Button
                  variant="ghost"
                  size="md"
                  fullWidth
                  onClick={() => myKitchenInputRef.current?.click()}
                >
                  📤 Importar Mi Cocina
                </Button>
                <input
                  ref={myKitchenInputRef}
                  type="file"
                  accept=".json"
                  onChange={handleImportMyKitchen}
                  className="hidden"
                />
              </div>
            </div>
            <p className="text-xs text-[var(--color-text-tertiary)] mt-3">
              El archivo exportado incluye todos los electrodomésticos que has agregado a tu cocina
            </p>
          </Card>

          {/* Import/Export History */}
          <Card variant="elevated" padding="lg" className="animate-fadeInUp stagger-6">
            <h2 className="text-lg sm:text-xl font-bold mb-2">📜 Historial de Recetas</h2>
            <p className="text-sm text-[var(--color-text-secondary)] mb-4">
              Exporta o importa el historial de recetas que has cocinado
            </p>
            <div className="flex flex-col sm:flex-row gap-3">
              <Button variant="primary" size="md" onClick={handleExportHistory} className="flex-1">
                📥 Exportar Historial
              </Button>
              <div className="flex-1">
                <Button
                  variant="ghost"
                  size="md"
                  fullWidth
                  onClick={() => historyInputRef.current?.click()}
                >
                  📤 Importar Historial
                </Button>
                <input
                  ref={historyInputRef}
                  type="file"
                  accept=".json"
                  onChange={handleImportHistory}
                  className="hidden"
                />
              </div>
            </div>
            <p className="text-xs text-[var(--color-text-tertiary)] mt-3">
              El archivo exportado incluye todas las recetas que has cocinado con fechas, calificaciones y notas
            </p>
          </Card>

          {/* About */}
          <Card variant="elevated" padding="lg" className="text-center animate-fadeInUp stagger-7">
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
