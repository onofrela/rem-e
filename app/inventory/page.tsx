/* IMPORTANT: Light theme only - do not use dark mode */
'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { MainLayout } from '@/components/layout';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { AddIngredientFlow } from '@/components/inventory/AddIngredientFlow';
import type { InventoryItem, InventoryAlert, Location, CatalogIngredient } from '@/lib/db/schemas/types';
import { RemIcon, getCategoryIcon as getIconForCategory, getStorageIcon } from '@/lib/icons/iconMap';
import {
  Plus,
  X,
  Package,
  AlertTriangle,
  TrendingDown,
  MapPin,
  AlertCircle,
  Loader2,
  ShoppingCart,
  Search,
} from 'lucide-react';
import {
  getAllInventory,
  addToInventory,
  updateInventoryItem,
  deleteInventoryItem,
  generateInventoryAlerts,
} from '@/lib/db/services/inventoryService';
import { getAllLocations, initializeDefaultLocations } from '@/lib/db/services/locationService';
import { getAllIngredients, getIngredientById, initializeIngredientsCache } from '@/lib/db/services/ingredientService';

interface InventoryItemWithName extends InventoryItem {
  ingredientName?: string;
  category?: string;
}

export default function InventoryPage() {
  const [inventory, setInventory] = useState<InventoryItemWithName[]>([]);
  const [alerts, setAlerts] = useState<InventoryAlert[]>([]);
  const [locations, setLocations] = useState<Location[]>([]);
  const [ingredients, setIngredients] = useState<CatalogIngredient[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterCategory, setFilterCategory] = useState<string>('all');
  const [filterLocation, setFilterLocation] = useState<string>('all');
  const [showAddFlow, setShowAddFlow] = useState(false);
  const [editingItem, setEditingItem] = useState<InventoryItemWithName | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);

      // Initialize databases first
      await Promise.all([
        initializeIngredientsCache(),
        initializeDefaultLocations(),
      ]);

      const [inventoryData, alertsData, locationsData, ingredientsData] = await Promise.all([
        getAllInventory(),
        generateInventoryAlerts(),
        getAllLocations(),
        getAllIngredients(),
      ]);

      // Enrich inventory items with ingredient names
      const enrichedInventory = await Promise.all(
        inventoryData.map(async (item) => {
          const ingredient = await getIngredientById(item.ingredientId);
          return {
            ...item,
            ingredientName: ingredient?.name || 'Ingrediente desconocido',
            category: ingredient?.category || 'Otros',
          };
        })
      );

      setInventory(enrichedInventory);
      setAlerts(alertsData);
      setLocations(locationsData);
      setIngredients(ingredientsData);
    } catch (err) {
      setError('Error al cargar el inventario');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const filteredInventory = useMemo(() => {
    return inventory.filter((item) => {
      if (filterCategory !== 'all' && item.category !== filterCategory) return false;
      if (filterLocation !== 'all' && item.location !== filterLocation) return false;
      return true;
    });
  }, [inventory, filterCategory, filterLocation]);

  const categories = useMemo(() => {
    const cats = new Set(inventory.map((item) => item.category));
    return ['all', ...Array.from(cats)];
  }, [inventory]);

  const locationNames = useMemo(() => {
    return ['all', ...locations.map((l) => l.name)];
  }, [locations]);

  const handleAddIngredient = async (data: {
    ingredientId: string;
    quantity: number;
    unit: string;
    location: string;
    expirationDate?: string;
  }) => {
    try {
      await addToInventory(data);
      await loadData();
      setShowAddFlow(false);
    } catch (err) {
      setError('Error al agregar el ingrediente');
      console.error(err);
    }
  };

  const handleUpdateItem = async (
    id: string,
    updates: { quantity?: number; location?: string }
  ) => {
    try {
      await updateInventoryItem(id, updates);
      await loadData();
      setEditingItem(null);
    } catch (err) {
      setError('Error al actualizar el item');
    }
  };

  const handleDeleteItem = async (id: string) => {
    if (!confirm('¿Estás seguro de eliminar este ingrediente del inventario?')) return;
    try {
      await deleteInventoryItem(id);
      await loadData();
    } catch (err) {
      setError('Error al eliminar el item');
    }
  };

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
    if (!expirationDate) return 'Sin fecha';
    const today = new Date();
    const expDate = new Date(expirationDate);
    const diffTime = expDate.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays < 0) return `Caducado hace ${Math.abs(diffDays)}d`;
    if (diffDays === 0) return 'Hoy';
    if (diffDays === 1) return 'Mañana';
    if (diffDays <= 7) return `${diffDays} días`;

    return expDate.toLocaleDateString('es-MX', { day: 'numeric', month: 'short' });
  };

  // Render category icon component
  const renderCategoryIcon = (category: string) => {
    const IconComponent = getIconForCategory(category);
    return <RemIcon icon={IconComponent} size="sm" style="filled" className="inline" />;
  };

  // Render location icon component
  const renderLocationIcon = (locationName?: string) => {
    const location = locations.find((l) => l.name === locationName);
    const IconComponent = getStorageIcon(location?.name || '');
    return <RemIcon icon={IconComponent} size="sm" style="filled" className="inline" />;
  };

  if (loading) {
    return (
      <MainLayout>
        <div className="min-h-screen flex items-center justify-center">
          <div className="text-center">
            <div className="mb-4">
              <RemIcon icon={Loader2} size="hero" className="animate-spin text-[var(--color-primary)]" />
            </div>
            <p className="text-[var(--color-text-secondary)]">Cargando inventario...</p>
          </div>
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <div className="min-h-screen pb-20 md:pb-8">
        {/* Header */}
        <div className="pt-8 pb-6 px-4 md:px-6">
          <div className="container mx-auto max-w-7xl">
            <div className="flex items-center justify-between mb-2">
              <h1 className="text-3xl md:text-4xl font-bold text-[var(--color-primary)]">
                Inventario
              </h1>
              <Button
                variant="primary"
                size="lg"
                onClick={() => setShowAddFlow(true)}
                icon={<RemIcon icon={Plus} size="sm" />}
                iconPosition="left"
              >
                Agregar
              </Button>
            </div>
            <p className="text-base md:text-lg text-[var(--color-text-secondary)]">
              Gestiona tus ingredientes disponibles
            </p>
          </div>
        </div>

        <div className="container mx-auto max-w-7xl px-4 md:px-6">
          {error && (
            <Card variant="outlined" padding="md" className="mb-4 border-red-300 bg-red-50">
              <div className="flex justify-between items-center">
                <p className="text-red-600 text-sm">{error}</p>
                <button onClick={() => setError(null)} className="text-red-600">
                  <RemIcon icon={X} size="sm" />
                </button>
              </div>
            </Card>
          )}

          {/* Stats Grid - Tablet oriented */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4 mb-6">
            <Card variant="elevated" padding="lg" className="text-center">
              <div className="mb-2">
                <RemIcon icon={Package} size="xl" style="filled" className="text-[var(--color-primary)]" />
              </div>
              <p className="text-2xl md:text-3xl font-bold text-[var(--color-primary)]">
                {inventory.length}
              </p>
              <p className="text-xs md:text-sm text-[var(--color-text-secondary)] mt-1">
                Total
              </p>
            </Card>
            <Card variant="elevated" padding="lg" className="text-center">
              <div className="mb-2">
                <RemIcon icon={AlertTriangle} size="xl" style="filled" className="text-red-500" />
              </div>
              <p className="text-2xl md:text-3xl font-bold text-red-500">
                {alerts.filter((a) => a.type === 'expired' || a.type === 'expiring_soon').length}
              </p>
              <p className="text-xs md:text-sm text-[var(--color-text-secondary)] mt-1">
                Por caducar
              </p>
            </Card>
            <Card variant="elevated" padding="lg" className="text-center">
              <div className="mb-2">
                <RemIcon icon={TrendingDown} size="xl" style="filled" className="text-yellow-500" />
              </div>
              <p className="text-2xl md:text-3xl font-bold text-yellow-500">
                {alerts.filter((a) => a.type === 'low_stock').length}
              </p>
              <p className="text-xs md:text-sm text-[var(--color-text-secondary)] mt-1">
                Bajo stock
              </p>
            </Card>
            <Card variant="elevated" padding="lg" className="text-center">
              <div className="mb-2">
                <RemIcon icon={MapPin} size="xl" style="filled" className="text-blue-500" />
              </div>
              <p className="text-2xl md:text-3xl font-bold text-blue-500">{locations.length}</p>
              <p className="text-xs md:text-sm text-[var(--color-text-secondary)] mt-1">
                Ubicaciones
              </p>
            </Card>
          </div>

          {/* Alerts Section */}
          {alerts.length > 0 && (
            <Card variant="outlined" padding="lg" className="mb-6 border-red-200 bg-red-50">
              <div className="flex items-center gap-2 mb-4">
                <RemIcon icon={AlertCircle} size="lg" style="filled" className="text-red-500" />
                <h2 className="text-lg md:text-xl font-semibold text-[var(--color-text-primary)]">
                  Alertas Importantes
                </h2>
                <Badge variant="error">{alerts.length}</Badge>
              </div>
              <div className="space-y-2">
                {alerts.slice(0, 3).map((alert) => (
                  <div
                    key={alert.id}
                    className="flex items-start gap-2 text-sm text-red-800"
                  >
                    <span>•</span>
                    <p>{alert.message}</p>
                  </div>
                ))}
                {alerts.length > 3 && (
                  <p className="text-xs text-red-600 mt-2">
                    + {alerts.length - 3} alertas más
                  </p>
                )}
              </div>
            </Card>
          )}

          {/* Filters */}
          <div className="mb-5 space-y-3">
            <div>
              <p className="text-sm font-semibold text-[var(--color-text-primary)] mb-2">
                Categoría
              </p>
              <div className="flex flex-wrap gap-2">
                {categories.map((cat) => (
                  <button
                    key={cat}
                    onClick={() => setFilterCategory(cat)}
                    className={`
                      px-3 py-1.5 rounded-full text-sm font-medium transition-all
                      ${
                        filterCategory === cat
                          ? 'bg-[var(--color-primary)] text-white shadow-md'
                          : 'bg-[var(--color-surface)] text-[var(--color-text-secondary)] hover:bg-[var(--color-surface-elevated)]'
                      }
                    `}
                  >
                    {cat === 'all' ? 'Todas' : (
                      <>
                        {renderCategoryIcon(cat)} {cat}
                      </>
                    )}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <p className="text-sm font-semibold text-[var(--color-text-primary)] mb-2">
                Ubicación
              </p>
              <div className="flex flex-wrap gap-2">
                {locationNames.map((loc) => (
                  <button
                    key={loc}
                    onClick={() => setFilterLocation(loc)}
                    className={`
                      px-3 py-1.5 rounded-full text-sm font-medium transition-all
                      ${
                        filterLocation === loc
                          ? 'bg-[var(--color-secondary)] text-white shadow-md'
                          : 'bg-[var(--color-surface)] text-[var(--color-text-secondary)] hover:bg-[var(--color-surface-elevated)]'
                      }
                    `}
                  >
                    {loc === 'all' ? 'Todas' : (
                      <>
                        {renderLocationIcon(loc)} {loc}
                      </>
                    )}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Empty State */}
          {inventory.length === 0 && (
            <Card variant="elevated" padding="lg" className="text-center">
              <div className="mb-4">
                <RemIcon icon={ShoppingCart} size="hero" style="filled" className="text-[var(--color-primary)]" />
              </div>
              <h3 className="text-xl md:text-2xl font-semibold text-[var(--color-text-primary)] mb-2">
                Tu inventario está vacío
              </h3>
              <p className="text-[var(--color-text-secondary)] mb-4">
                Comienza agregando ingredientes para llevar un control de tu despensa
              </p>
              <Button variant="primary" size="xl" onClick={() => setShowAddFlow(true)}>
                + Agregar primer ingrediente
              </Button>
            </Card>
          )}

          {/* Inventory Grid - Tablet oriented with horizontal scroll */}
          {filteredInventory.length > 0 && (
            <>
              <div className="mb-3">
                <p className="text-sm text-[var(--color-text-secondary)]">
                  {filteredInventory.length} ingrediente{filteredInventory.length !== 1 ? 's' : ''}
                </p>
              </div>

              {/* Tablet+ Grid - Multiple rows with horizontal scroll */}
              <div className="hidden md:block">
                <div className="overflow-x-auto pb-4">
                  <div className="grid grid-flow-col auto-cols-[minmax(280px,1fr)] gap-4" style={{ gridAutoRows: 'minmax(200px, auto)' }}>
                    {filteredInventory.map((item, index) => (
                      <InventoryCard
                        key={item.id}
                        item={item}
                        locations={locations}
                        index={index}
                        onEdit={() => setEditingItem(item)}
                        onDelete={() => handleDeleteItem(item.id)}
                        renderCategoryIcon={renderCategoryIcon}
                        renderLocationIcon={renderLocationIcon}
                        getExpirationColor={getExpirationColor}
                        formatExpirationDate={formatExpirationDate}
                      />
                    ))}
                  </div>
                </div>
              </div>

              {/* Mobile Grid - Vertical scroll */}
              <div className="md:hidden grid grid-cols-1 gap-3">
                {filteredInventory.map((item, index) => (
                  <InventoryCard
                    key={item.id}
                    item={item}
                    locations={locations}
                    index={index}
                    onEdit={() => setEditingItem(item)}
                    onDelete={() => handleDeleteItem(item.id)}
                    renderCategoryIcon={renderCategoryIcon}
                    renderLocationIcon={renderLocationIcon}
                    getExpirationColor={getExpirationColor}
                    formatExpirationDate={formatExpirationDate}
                  />
                ))}
              </div>
            </>
          )}

          {filteredInventory.length === 0 && inventory.length > 0 && (
            <Card variant="outlined" padding="lg" className="text-center">
              <div className="mb-4">
                <RemIcon icon={Search} size="xl" style="filled" className="text-[var(--color-text-secondary)]" />
              </div>
              <h3 className="text-lg font-semibold text-[var(--color-text-primary)] mb-2">
                No hay ingredientes
              </h3>
              <p className="text-sm text-[var(--color-text-secondary)]">
                No se encontraron ingredientes con los filtros seleccionados
              </p>
            </Card>
          )}
        </div>

        {/* Edit Modal */}
        {editingItem && (
          <EditItemModal
            item={editingItem}
            locations={locations}
            onClose={() => setEditingItem(null)}
            onSave={handleUpdateItem}
          />
        )}

        {/* Add Ingredient Flow */}
        <AddIngredientFlow
          isOpen={showAddFlow}
          onClose={() => setShowAddFlow(false)}
          ingredients={ingredients}
          locations={locations}
          onAdd={handleAddIngredient}
        />
      </div>
    </MainLayout>
  );
}

interface InventoryCardProps {
  item: InventoryItemWithName;
  locations: Location[];
  index: number;
  onEdit: () => void;
  onDelete: () => void;
  renderCategoryIcon: (category: string) => React.ReactNode;
  renderLocationIcon: (location?: string) => React.ReactNode;
  getExpirationColor: (date?: string) => string;
  formatExpirationDate: (date?: string) => string;
}

function InventoryCard({
  item,
  index,
  onEdit,
  onDelete,
  renderCategoryIcon,
  renderLocationIcon,
  getExpirationColor,
  formatExpirationDate,
}: InventoryCardProps) {
  return (
    <Card
      variant="elevated"
      padding="lg"
      hoverable
      className="animate-fadeInUp h-full flex flex-col"
      style={{ animationDelay: `${index * 0.03}s` }}
    >
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="text-4xl">
            {renderCategoryIcon(item.category || 'Otros')}
          </div>
          <div>
            <h3 className="text-lg font-bold text-[var(--color-text-primary)] mb-1">
              {item.ingredientName}
            </h3>
            <Badge variant="default" className="text-xs">{item.category}</Badge>
          </div>
        </div>
        {item.location && (
          <div className="text-2xl" title={item.location}>
            {renderLocationIcon(item.location)}
          </div>
        )}
      </div>

      <div className="space-y-2 flex-1">
        <div className="flex items-center justify-between">
          <span className="text-sm text-[var(--color-text-secondary)]">Cantidad:</span>
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
            <span className="text-sm text-[var(--color-text-secondary)]">Caduca:</span>
            <Badge variant={getExpirationColor(item.expirationDate) as 'default' | 'success' | 'warning' | 'error' | 'info'}>
              {formatExpirationDate(item.expirationDate)}
            </Badge>
          </div>
        )}

        {item.location && (
          <div className="flex items-center justify-between">
            <span className="text-sm text-[var(--color-text-secondary)]">Ubicación:</span>
            <span className="text-xs font-medium text-[var(--color-text-primary)]">
              {item.location}
            </span>
          </div>
        )}
      </div>

      <div className="flex gap-2 mt-4">
        <Button variant="secondary" fullWidth className="text-sm" onClick={onEdit}>
          Editar
        </Button>
        <Button variant="danger" fullWidth className="text-sm" onClick={onDelete}>
          Eliminar
        </Button>
      </div>
    </Card>
  );
}

interface EditItemModalProps {
  item: InventoryItemWithName;
  locations: Location[];
  onClose: () => void;
  onSave: (id: string, updates: { quantity?: number; location?: string }) => void;
}

function EditItemModal({ item, locations, onClose, onSave }: EditItemModalProps) {
  const [quantity, setQuantity] = useState(item.quantity);
  const [location, setLocation] = useState(item.location);

  return (
    <div
      className="fixed inset-0 bg-black/50 z-50 flex items-end md:items-center justify-center p-4"
      onClick={onClose}
    >
      <Card
        variant="elevated"
        padding="lg"
        className="w-full max-w-md animate-fadeInUp"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold text-[var(--color-text-primary)]">
            Editar {item.ingredientName}
          </h2>
          <button
            onClick={onClose}
            className="text-2xl text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]"
          >
            ×
          </button>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-2">Cantidad</label>
            <div className="flex items-center gap-2">
              <input
                type="number"
                value={quantity}
                onChange={(e) => setQuantity(Number(e.target.value))}
                min="0"
                step="0.1"
                className="flex-1 px-4 py-3 rounded-lg border-2 border-[var(--color-border)] bg-[var(--color-background)] focus:border-[var(--color-primary)] outline-none"
              />
              <span className="text-[var(--color-text-secondary)]">{item.unit}</span>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Ubicación</label>
            <select
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              className="w-full px-4 py-3 rounded-lg border-2 border-[var(--color-border)] bg-[var(--color-background)] focus:border-[var(--color-primary)] outline-none"
            >
              {locations.map((loc) => (
                <option key={loc.id} value={loc.name}>
                  {loc.icon} {loc.name}
                </option>
              ))}
            </select>
          </div>

          <div className="flex gap-2 pt-4">
            <Button
              variant="primary"
              fullWidth
              onClick={() => onSave(item.id, { quantity, location })}
            >
              Guardar Cambios
            </Button>
            <Button variant="ghost" fullWidth onClick={onClose}>
              Cancelar
            </Button>
          </div>
        </div>
      </Card>
    </div>
  );
}
