/* IMPORTANT: Light theme only - do not use dark mode */
'use client';

import React, { useState } from 'react';
import { FullScreenOverlay } from '@/components/ui/FullScreenOverlay';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import type { CatalogAppliance } from '@/lib/db/schemas/types';

interface AddApplianceFlowProps {
  isOpen: boolean;
  onClose: () => void;
  appliances: CatalogAppliance[];
  onAdd: (data: { applianceId: string }) => void;
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

/**
 * Add appliance flow - simple search and add
 */
export function AddApplianceFlow({
  isOpen,
  onClose,
  appliances,
  onAdd,
}: AddApplianceFlowProps) {
  const [searchQuery, setSearchQuery] = useState('');

  // Reset flow when closed
  const handleClose = () => {
    setSearchQuery('');
    onClose();
  };

  // Filter appliances by search query
  const filteredAppliances = appliances.filter(app => {
    if (!searchQuery.trim()) return true;
    const query = searchQuery.toLowerCase();
    return (
      app.name.toLowerCase().includes(query) ||
      app.normalizedName.toLowerCase().includes(query) ||
      app.synonyms.some(syn => syn.toLowerCase().includes(query)) ||
      app.category.toLowerCase().includes(query)
    );
  });

  // Group by category for better UX
  const groupedAppliances = filteredAppliances.reduce((acc, app) => {
    if (!acc[app.category]) {
      acc[app.category] = [];
    }
    acc[app.category].push(app);
    return acc;
  }, {} as Record<string, CatalogAppliance[]>);

  // Handle appliance selection - immediate add
  const handleSelectAppliance = (appliance: CatalogAppliance) => {
    onAdd({ applianceId: appliance.id });
    handleClose();
  };

  return (
    <FullScreenOverlay isOpen={isOpen} onClose={handleClose}>
      <div className="min-h-screen flex flex-col p-4 md:p-6 lg:p-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-2xl md:text-3xl font-bold">
              Agregar Electrodoméstico
            </h2>
            <p className="text-gray-600 mt-1">
              Busca y selecciona el electrodoméstico que tienes
            </p>
          </div>
          <Button variant="ghost" onClick={handleClose}>
            ✕
          </Button>
        </div>

        {/* Search Input */}
        <div className="mb-6">
          <input
            type="text"
            placeholder="Buscar electrodoméstico... (ej: licuadora, horno, cafetera)"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full px-4 py-3 text-base md:text-lg border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
            autoFocus
          />
        </div>

        {/* Results */}
        <div className="flex-1 space-y-6 overflow-y-auto pb-6">
          {Object.keys(groupedAppliances).length === 0 ? (
            <Card variant="outlined" padding="lg" className="text-center">
              <p className="text-gray-600">
                No se encontraron electrodomésticos. Intenta con otro término de búsqueda.
              </p>
            </Card>
          ) : (
            Object.entries(groupedAppliances).map(([category, items]) => (
              <div key={category}>
                <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
                  <span>{categoryEmojis[category] || '🔧'}</span>
                  <span>{category}</span>
                  <Badge variant="default">{items.length}</Badge>
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                  {items.map(appliance => (
                    <Card
                      key={appliance.id}
                      variant="outlined"
                      padding="md"
                      hoverable
                      onClick={() => handleSelectAppliance(appliance)}
                      className="cursor-pointer"
                    >
                      <div className="flex items-start gap-3">
                        <span className="text-3xl flex-shrink-0">
                          {categoryEmojis[category] || '🔧'}
                        </span>
                        <div className="flex-1 min-w-0">
                          <h4 className="font-semibold text-base line-clamp-1">
                            {appliance.name}
                          </h4>
                          {appliance.description && (
                            <p className="text-sm text-gray-600 line-clamp-2 mt-1">
                              {appliance.description}
                            </p>
                          )}
                          {appliance.isCommon && (
                            <Badge variant="success" className="mt-2">
                              ⭐ Común
                            </Badge>
                          )}
                        </div>
                      </div>
                    </Card>
                  ))}
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </FullScreenOverlay>
  );
}
