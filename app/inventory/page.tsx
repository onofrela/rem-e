'use client';

import React, { useState, useMemo } from 'react';
import { MainLayout } from '@/components/layout';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import {
  mockInventory,
  generateInventoryAlerts,
  type InventoryIngredient,
  type InventoryAlert
} from '@/lib/utils/mock-data';

export default function InventoryPage() {
  const [filterCategory, setFilterCategory] = useState<string>('all');
  const [filterLocation, setFilterLocation] = useState<string>('all');
  const [showAddModal, setShowAddModal] = useState(false);

  const alerts = useMemo(() => generateInventoryAlerts(), []);

  const filteredInventory = useMemo(() => {
    return mockInventory.filter(item => {
      if (filterCategory !== 'all' && item.category !== filterCategory) return false;
      if (filterLocation !== 'all' && item.location !== filterLocation) return false;
      return true;
    });
  }, [filterCategory, filterLocation]);

  const categories = ['all', 'Proteínas', 'Lácteos', 'Vegetales', 'Frutas', 'Granos', 'Condimentos', 'Otros'];
  const locations = ['all', 'Refrigerador', 'Congelador', 'Alacena', 'Smart Fridge'];

  const getExpirationColor = (expirationDate?: string) => {
    if (!expirationDate) return 'default';
    const today = new Date();
    const expDate = new Date(expirationDate);
    const diffTime = expDate.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays < 0) return 'error';
    if (diffDays <= 2) return 'warning';
    if (diffDays <= 7) return 'info';
    return 'success';
  };

  const formatExpirationDate = (expirationDate?: string) => {
    if (!expirationDate) return 'Sin fecha de caducidad';
    const today = new Date();
    const expDate = new Date(expirationDate);
    const diffTime = expDate.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays < 0) return `Caducado hace ${Math.abs(diffDays)} días`;
    if (diffDays === 0) return 'Caduca hoy';
    if (diffDays === 1) return 'Caduca mañana';
    if (diffDays <= 7) return `Caduca en ${diffDays} días`;

    return `Caduca: ${expDate.toLocaleDateString('es-MX', { day: 'numeric', month: 'short' })}`;
  };

  const getCategoryIcon = (category: string) => {
    const icons: Record<string, string> = {
      'Proteínas': '🍗',
      'Lácteos': '🥛',
      'Vegetales': '🥕',
      'Frutas': '🍎',
      'Granos': '🌾',
      'Condimentos': '🧂',
      'Otros': '📦'
    };
    return icons[category] || '📦';
  };

  const getLocationIcon = (location?: string) => {
    const icons: Record<string, string> = {
      'Refrigerador': '❄️',
      'Congelador': '🧊',
      'Alacena': '🏠',
      'Smart Fridge': '🤖'
    };
    return location ? icons[location] || '📍' : '📍';
  };

  const getAlertIcon = (type: string) => {
    if (type === 'expired') return '🚫';
    if (type === 'expiring_soon') return '⚠️';
    return '📉';
  };

  const getAlertColor = (priority: string) => {
    if (priority === 'high') return 'bg-red-50 border-red-200';
    if (priority === 'medium') return 'bg-yellow-50 border-yellow-200';
    return 'bg-blue-50 border-blue-200';
  };

  return (
    <MainLayout>
      <div className="min-h-screen pb-20 md:pb-8">
        {/* Header */}
        <div className="pt-8 pb-12 px-4 md:px-6">
          <div className="container mx-auto max-w-6xl">
            <div className="flex items-center justify-between mb-2">
              <h1 className="text-3xl sm:text-4xl font-bold text-[var(--color-primary)]">
                Inventario
              </h1>
              <Button
                variant="primary"
                onClick={() => setShowAddModal(true)}
                className="text-sm sm:text-base"
              >
                + Agregar
              </Button>
            </div>
            <p className="text-lg text-[var(--color-text-secondary)]">
              Gestiona tus ingredientes disponibles
            </p>
          </div>
        </div>

        <div className="container mx-auto max-w-6xl px-4 md:px-6 -mt-6">
          {/* AI Alerts Section */}
          {alerts.length > 0 && (
            <div className="mb-6 animate-fadeIn">
              <div className="flex items-center gap-2 mb-4">
                <span className="text-2xl">🚨</span>
                <h2 className="text-xl font-semibold text-[var(--color-text-primary)]">
                  Alertas
                </h2>
                <Badge variant="error">{alerts.length}</Badge>
              </div>

              <div className="space-y-2">
                {alerts.slice(0, 5).map((alert) => (
                  <Card
                    key={alert.id}
                    variant="outlined"
                    padding="md"
                    className={`${getAlertColor(alert.priority)} animate-fadeInUp`}
                  >
                    <div className="flex items-start gap-3">
                      <span className="text-2xl">{getAlertIcon(alert.type)}</span>
                      <div className="flex-1">
                        <p className="text-sm font-medium text-black">
                          {alert.message}
                        </p>
                        <p className="text-xs text-gray-500 mt-1">
                          {alert.type === 'low_stock' && 'Considera agregarlo a tu lista de compras'}
                          {alert.type === 'expiring_soon' && 'Úsalo pronto para evitar desperdicios'}
                          {alert.type === 'expired' && 'Revisa el producto antes de usarlo'}
                        </p>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>

              {alerts.length > 5 && (
                <p className="text-sm text-[var(--color-text-secondary)] text-center mt-3">
                  + {alerts.length - 5} alertas más
                </p>
              )}
            </div>
          )}

          {/* Smart Fridge Integration Placeholder */}
          <Card
            variant="elevated"
            padding="md"
            className="mb-6 bg-gradient-to-r from-blue-50 to-purple-50 border-blue-200 animate-fadeIn"
          >
            <div className="flex items-center gap-3">
              <span className="text-3xl">🤖</span>
              <div className="flex-1">
                <h3 className="text-base font-semibold text-gray-900 mb-1">
                  Smart Fridge Detectado
                </h3>
                <p className="text-sm text-[var(--color-text-secondary)]">
                  1 ingrediente sincronizado automáticamente desde tu refrigerador inteligente
                </p>
              </div>
              <Button variant="secondary" className="text-sm">
                Configurar
              </Button>
            </div>
          </Card>

          {/* Filters */}
          <div className="mb-6 space-y-3">
            <div>
              <p className="text-sm font-medium text-[var(--color-text-secondary)] mb-2">
                Categoría
              </p>
              <div className="flex flex-wrap gap-2">
                {categories.map((cat) => (
                  <button
                    key={cat}
                    onClick={() => setFilterCategory(cat)}
                    className={`
                      px-3 py-1.5 rounded-full text-sm font-medium transition-all
                      ${filterCategory === cat
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

            <div>
              <p className="text-sm font-medium text-[var(--color-text-secondary)] mb-2">
                Ubicación
              </p>
              <div className="flex flex-wrap gap-2">
                {locations.map((loc) => (
                  <button
                    key={loc}
                    onClick={() => setFilterLocation(loc)}
                    className={`
                      px-3 py-1.5 rounded-full text-sm font-medium transition-all
                      ${filterLocation === loc
                        ? 'bg-[var(--color-secondary)] text-white shadow-md'
                        : 'bg-[var(--color-surface)] text-[var(--color-text-secondary)] hover:bg-[var(--color-surface-elevated)]'
                      }
                    `}
                  >
                    {loc === 'all' ? 'Todas' : `${getLocationIcon(loc)} ${loc}`}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Inventory Stats */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
            <Card variant="outlined" padding="md" className="text-center">
              <p className="text-2xl font-bold text-[var(--color-primary)]">
                {mockInventory.length}
              </p>
              <p className="text-xs text-[var(--color-text-secondary)] mt-1">
                Total ingredientes
              </p>
            </Card>
            <Card variant="outlined" padding="md" className="text-center">
              <p className="text-2xl font-bold text-red-500">
                {alerts.filter(a => a.type === 'expired' || a.type === 'expiring_soon').length}
              </p>
              <p className="text-xs text-[var(--color-text-secondary)] mt-1">
                Por caducar
              </p>
            </Card>
            <Card variant="outlined" padding="md" className="text-center">
              <p className="text-2xl font-bold text-yellow-500">
                {alerts.filter(a => a.type === 'low_stock').length}
              </p>
              <p className="text-xs text-[var(--color-text-secondary)] mt-1">
                Bajo stock
              </p>
            </Card>
            <Card variant="outlined" padding="md" className="text-center">
              <p className="text-2xl font-bold text-blue-500">
                {mockInventory.filter(i => i.location === 'Smart Fridge').length}
              </p>
              <p className="text-xs text-[var(--color-text-secondary)] mt-1">
                Smart Fridge
              </p>
            </Card>
          </div>

          {/* Inventory Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredInventory.map((item, index) => (
              <Card
                key={item.id}
                variant="elevated"
                padding="md"
                hoverable
                className="animate-fadeInUp"
                style={{ animationDelay: `${index * 0.05}s` }}
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <span className="text-3xl">{getCategoryIcon(item.category)}</span>
                    <div>
                      <h3 className="font-semibold text-[var(--color-text-primary)]">
                        {item.name}
                      </h3>
                      <p className="text-sm text-[var(--color-text-secondary)]">
                        {item.category}
                      </p>
                    </div>
                  </div>
                  {item.location && (
                    <span className="text-lg" title={item.location}>
                      {getLocationIcon(item.location)}
                    </span>
                  )}
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-[var(--color-text-secondary)]">
                      Cantidad:
                    </span>
                    <Badge
                      variant={
                        item.lowStockThreshold && item.quantity <= item.lowStockThreshold
                          ? 'warning'
                          : 'default'
                      }
                    >
                      {item.quantity} {item.unit}
                    </Badge>
                  </div>

                  {item.expirationDate && (
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-[var(--color-text-secondary)]">
                        Caducidad:
                      </span>
                      <Badge variant={getExpirationColor(item.expirationDate)}>
                        {formatExpirationDate(item.expirationDate)}
                      </Badge>
                    </div>
                  )}

                  {item.location && (
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-[var(--color-text-secondary)]">
                        Ubicación:
                      </span>
                      <span className="text-xs font-medium text-[var(--color-text-primary)]">
                        {item.location}
                      </span>
                    </div>
                  )}
                </div>

                <div className="flex gap-2 mt-4">
                  <Button variant="secondary" fullWidth className="text-sm">
                    Editar
                  </Button>
                  <Button variant="ghost" fullWidth className="text-sm">
                    Usar
                  </Button>
                </div>
              </Card>
            ))}
          </div>

          {filteredInventory.length === 0 && (
            <Card variant="outlined" padding="lg" className="text-center">
              <span className="text-5xl mb-4 block">🔍</span>
              <h3 className="text-lg font-semibold text-[var(--color-text-primary)] mb-2">
                No hay ingredientes
              </h3>
              <p className="text-sm text-[var(--color-text-secondary)]">
                No se encontraron ingredientes con los filtros seleccionados
              </p>
            </Card>
          )}
        </div>

        {/* Add Ingredient Modal Placeholder */}
        {showAddModal && (
          <div
            className="fixed inset-0 bg-black/50 z-50 flex items-end md:items-center justify-center p-4"
            onClick={() => setShowAddModal(false)}
          >
            <Card
              variant="elevated"
              padding="lg"
              className="w-full max-w-md animate-fadeInUp"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-bold text-[var(--color-text-primary)]">
                  Agregar Ingrediente
                </h2>
                <button
                  onClick={() => setShowAddModal(false)}
                  className="text-2xl text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]"
                >
                  ×
                </button>
              </div>
              <div className="text-center py-8">
                <span className="text-5xl mb-4 block">🚧</span>
                <p className="text-[var(--color-text-secondary)]">
                  Funcionalidad en desarrollo
                </p>
                <p className="text-sm text-[var(--color-text-secondary)] mt-2">
                  Pronto podrás agregar ingredientes manualmente o desde tu Smart Fridge
                </p>
              </div>
            </Card>
          </div>
        )}
      </div>
    </MainLayout>
  );
}
