/* IMPORTANT: Light theme only - do not use dark mode */
'use client';

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import type { CatalogIngredient, Location } from '@/lib/db/schemas/types';

interface IngredientConfirmationProps {
  selectedIngredient: CatalogIngredient;
  initialQuantity?: number;
  initialUnit?: string;
  initialLocation?: string;
  initialExpirationDate?: string;
  locations: Location[];
  onChangeIngredient: () => void;
  onConfirm: (data: {
    ingredientId: string;
    quantity: number;
    unit: string;
    location: string;
    expirationDate?: string;
  }) => void;
  onCancel: () => void;
}

/**
 * Confirmation screen where user can edit all detected/selected ingredient details
 */
export function IngredientConfirmation({
  selectedIngredient,
  initialQuantity = 1,
  initialUnit,
  initialLocation,
  initialExpirationDate,
  locations,
  onChangeIngredient,
  onConfirm,
  onCancel,
}: IngredientConfirmationProps) {
  const [quantity, setQuantity] = useState(initialQuantity);
  const [unit, setUnit] = useState(initialUnit || selectedIngredient.defaultUnit);
  const [location, setLocation] = useState(initialLocation || locations[0]?.name || '');
  const [expirationDate, setExpirationDate] = useState(initialExpirationDate || '');

  useEffect(() => {
    if (!initialUnit) {
      setUnit(selectedIngredient.defaultUnit);
    }
  }, [selectedIngredient, initialUnit]);

  const handleSubmit = () => {
    if (!selectedIngredient || quantity <= 0) return;

    onConfirm({
      ingredientId: selectedIngredient.id,
      quantity,
      unit,
      location,
      expirationDate: expirationDate || undefined,
    });
  };

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

  const incrementQuantity = () => {
    setQuantity((prev) => prev + 1);
  };

  const decrementQuantity = () => {
    setQuantity((prev) => Math.max(0.1, prev - 1));
  };

  return (
    <div className="container mx-auto max-w-2xl px-4 py-6">
      {/* Selected ingredient display */}
      <Card variant="outlined" padding="lg" className="mb-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-4 flex-1">
            <span className="text-5xl">{getCategoryIcon(selectedIngredient.category)}</span>
            <div className="flex-1">
              <h3 className="text-xl font-bold text-[var(--color-text-primary)] mb-1">
                {selectedIngredient.name}
              </h3>
              <Badge variant="default">{selectedIngredient.category}</Badge>
            </div>
          </div>
          <Button variant="ghost" onClick={onChangeIngredient} className="text-sm">
            Cambiar
          </Button>
        </div>

        {selectedIngredient.synonyms.length > 0 && (
          <p className="text-sm text-[var(--color-text-secondary)]">
            También: {selectedIngredient.synonyms.slice(0, 3).join(', ')}
          </p>
        )}
      </Card>

      {/* Editable fields */}
      <div className="space-y-5 mb-6">
        {/* Quantity */}
        <div>
          <label className="block text-sm font-semibold text-[var(--color-text-primary)] mb-2">
            Cantidad <span className="text-red-500">*</span>
          </label>
          <Card variant="outlined" padding="sm">
            <div className="flex items-center gap-3">
              <button
                onClick={decrementQuantity}
                className="w-12 h-12 flex items-center justify-center rounded-lg bg-[var(--color-surface)] hover:bg-[var(--color-surface-elevated)] text-2xl font-bold text-[var(--color-text-primary)] transition-colors"
              >
                −
              </button>
              <input
                type="number"
                value={quantity}
                onChange={(e) => setQuantity(Math.max(0.1, Number(e.target.value)))}
                min="0.1"
                step="0.1"
                className="flex-1 text-center text-2xl font-bold px-4 py-3 rounded-lg border-2 border-[var(--color-border)] bg-[var(--color-background)] focus:border-[var(--color-primary)] outline-none"
              />
              <button
                onClick={incrementQuantity}
                className="w-12 h-12 flex items-center justify-center rounded-lg bg-[var(--color-surface)] hover:bg-[var(--color-surface-elevated)] text-2xl font-bold text-[var(--color-text-primary)] transition-colors"
              >
                +
              </button>
            </div>
          </Card>
        </div>

        {/* Unit */}
        <div>
          <label className="block text-sm font-semibold text-[var(--color-text-primary)] mb-2">
            Unidad de Medida <span className="text-red-500">*</span>
          </label>
          <select
            value={unit}
            onChange={(e) => setUnit(e.target.value)}
            className="w-full px-4 py-3 text-base rounded-lg border-2 border-[var(--color-border)] bg-[var(--color-background)] focus:border-[var(--color-primary)] outline-none"
          >
            <option value={selectedIngredient.defaultUnit}>
              {selectedIngredient.defaultUnit} (predeterminada)
            </option>
            {selectedIngredient.alternativeUnits.map((u) => (
              <option key={u} value={u}>
                {u}
              </option>
            ))}
          </select>
        </div>

        {/* Location */}
        <div>
          <label className="block text-sm font-semibold text-[var(--color-text-primary)] mb-2">
            Ubicación <span className="text-red-500">*</span>
          </label>
          <select
            value={location}
            onChange={(e) => setLocation(e.target.value)}
            className="w-full px-4 py-3 text-base rounded-lg border-2 border-[var(--color-border)] bg-[var(--color-background)] focus:border-[var(--color-primary)] outline-none"
          >
            {locations.map((loc) => (
              <option key={loc.id} value={loc.name}>
                {loc.icon} {loc.name}
              </option>
            ))}
          </select>
        </div>

        {/* Expiration Date */}
        <div>
          <label className="block text-sm font-semibold text-[var(--color-text-primary)] mb-2">
            Fecha de Caducidad{' '}
            <span className="text-[var(--color-text-secondary)] font-normal">(opcional)</span>
          </label>
          <input
            type="date"
            value={expirationDate}
            onChange={(e) => setExpirationDate(e.target.value)}
            min={new Date().toISOString().split('T')[0]}
            className="w-full px-4 py-3 text-base rounded-lg border-2 border-[var(--color-border)] bg-[var(--color-background)] focus:border-[var(--color-primary)] outline-none"
          />
        </div>
      </div>

      {/* Storage recommendations */}
      {selectedIngredient.storage && (
        <Card variant="outlined" padding="md" className="mb-6">
          <div className="flex items-start gap-3 mb-3">
            <span className="text-2xl">📦</span>
            <div className="flex-1">
              <h4 className="text-sm font-semibold text-[var(--color-text-primary)] mb-2">
                Recomendaciones de Almacenamiento
              </h4>
              <div className="space-y-1 text-sm text-[var(--color-text-secondary)]">
                {selectedIngredient.storage.refrigerator && (
                  <p>🧊 Refrigerador: {selectedIngredient.storage.refrigerator}</p>
                )}
                {selectedIngredient.storage.freezer && (
                  <p>❄️ Congelador: {selectedIngredient.storage.freezer}</p>
                )}
                {selectedIngredient.storage.pantry && (
                  <p>🗄️ Alacena: {selectedIngredient.storage.pantry}</p>
                )}
              </div>
            </div>
          </div>
        </Card>
      )}

      {/* Action buttons */}
      <div className="space-y-3">
        <Button
          variant="primary"
          size="xl"
          fullWidth
          onClick={handleSubmit}
          disabled={!quantity || quantity <= 0 || !location}
          icon={<span>✓</span>}
          iconPosition="left"
        >
          Agregar al Inventario
        </Button>
        <Button variant="ghost" size="lg" fullWidth onClick={onCancel}>
          Cancelar
        </Button>
      </div>
    </div>
  );
}
