'use client';

import React from 'react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import type { UserAppliance, CatalogAppliance } from '@/lib/db/schemas/types';

interface ApplianceCardProps {
  userAppliance: UserAppliance;
  catalogAppliance: CatalogAppliance;
  onDelete?: (appliance: UserAppliance) => void;
  className?: string;
}

// Category emoji mapping
const categoryEmojis: Record<string, string> = {
  'Cocción': '🔥',
  'Refrigeración': '❄️',
  'Preparación': '🔪',
  'Limpieza': '🧼',
  'Horneado': '🍰',
  'Bebidas': '☕',
  'Conservación': '📦',
  'Medición': '⚖️',
  'Otro': '🔧'
};

export const ApplianceCard = React.forwardRef<HTMLDivElement, ApplianceCardProps>(
  ({ userAppliance, catalogAppliance, onDelete, className = '' }, ref) => {
    const emoji = categoryEmojis[catalogAppliance.category] || '🔧';

    return (
      <Card
        ref={ref}
        variant="elevated"
        padding="md"
        className={`h-full flex flex-col ${className}`}
      >
        {/* Header with icon */}
        <div className="flex items-start gap-3 md:gap-4 mb-3">
          <span className="text-5xl md:text-6xl flex-shrink-0">{emoji}</span>
          <div className="flex-1 min-w-0">
            <h3 className="text-lg md:text-xl font-bold line-clamp-2">
              {catalogAppliance.name}
            </h3>
            <p className="text-sm text-gray-600 mt-1">
              {catalogAppliance.category}
            </p>
          </div>
        </div>

        {/* Use Cases */}
        {catalogAppliance.useCases && catalogAppliance.useCases.length > 0 && (
          <div className="mb-3">
            <p className="text-xs text-gray-500 mb-1">Usos:</p>
            <div className="flex flex-wrap gap-1">
              {catalogAppliance.useCases.slice(0, 3).map((useCase, idx) => (
                <span
                  key={idx}
                  className="text-xs bg-gray-100 px-2 py-1 rounded"
                >
                  {useCase}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Delete Button */}
        {onDelete && (
          <div className="mt-auto pt-3">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onDelete(userAppliance)}
              className="w-full text-red-600 hover:bg-red-50"
            >
              🗑️ Eliminar
            </Button>
          </div>
        )}
      </Card>
    );
  }
);

ApplianceCard.displayName = 'ApplianceCard';
