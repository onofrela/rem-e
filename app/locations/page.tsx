'use client';

import React, { useState, useEffect } from 'react';
import { MainLayout } from '@/components/layout';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import type { Location } from '@/lib/db/schemas/types';
import {
  getAllLocations,
  addLocation,
  updateLocation,
  deleteLocation,
  initializeDefaultLocations,
} from '@/lib/db/services/locationService';

export default function LocationsPage() {
  const [locations, setLocations] = useState<Location[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [newName, setNewName] = useState('');
  const [newIcon, setNewIcon] = useState('📦');
  const [error, setError] = useState<string | null>(null);

  const commonIcons = ['📦', '🧊', '❄️', '🗄️', '🏠', '🍳', '🥫', '🍶', '🧺', '🛒'];

  useEffect(() => {
    loadLocations();
  }, []);

  const loadLocations = async () => {
    try {
      setLoading(true);
      // Initialize default locations if needed
      await initializeDefaultLocations();
      const data = await getAllLocations();
      setLocations(data);
    } catch (err) {
      setError('Error al cargar ubicaciones');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleAdd = async () => {
    if (!newName.trim()) {
      setError('El nombre es requerido');
      return;
    }

    try {
      setError(null);
      await addLocation(newName.trim(), newIcon);
      setNewName('');
      setNewIcon('📦');
      setShowAddForm(false);
      await loadLocations();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al agregar ubicación');
    }
  };

  const handleUpdate = async (id: string, name: string, icon: string) => {
    try {
      setError(null);
      await updateLocation(id, { name, icon });
      setEditingId(null);
      await loadLocations();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al actualizar ubicación');
    }
  };

  const handleDelete = async (id: string) => {
    try {
      setError(null);
      await deleteLocation(id);
      await loadLocations();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al eliminar ubicación');
    }
  };

  return (
    <MainLayout>
      <div className="min-h-screen pb-24 md:pb-8">
        <div className="py-6 sm:py-8 px-4 md:px-6">
          <div className="container mx-auto max-w-4xl">
            <h1 className="text-2xl sm:text-3xl font-bold mb-2 text-[var(--color-text-primary)] animate-fadeInDown">
              📍 Ubicaciones
            </h1>
            <p className="text-sm sm:text-base text-[var(--color-text-secondary)]">
              Administra los lugares donde almacenas tus ingredientes
            </p>
          </div>
        </div>

        <div className="container mx-auto max-w-4xl px-4 md:px-6 -mt-4 space-y-6">
          {error && (
            <Card variant="outlined" padding="md" className="border-red-300 bg-red-50">
              <p className="text-red-600 text-sm">{error}</p>
            </Card>
          )}

          {/* Add New Location */}
          <Card variant="elevated" padding="lg" className="animate-fadeInUp">
            {!showAddForm ? (
              <Button
                variant="primary"
                size="lg"
                fullWidth
                onClick={() => setShowAddForm(true)}
              >
                + Agregar Nueva Ubicación
              </Button>
            ) : (
              <div className="space-y-4">
                <h3 className="text-lg font-semibold">Nueva Ubicación</h3>

                <div>
                  <label className="block text-sm font-medium mb-2">Nombre</label>
                  <input
                    type="text"
                    value={newName}
                    onChange={(e) => setNewName(e.target.value)}
                    placeholder="Ej: Despensa, Cajón de verduras..."
                    className="w-full px-4 py-3 rounded-lg border-2 border-[var(--color-border)] bg-[var(--color-background)] focus:border-[var(--color-primary)] outline-none transition-colors"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">Icono</label>
                  <div className="flex flex-wrap gap-2">
                    {commonIcons.map((icon) => (
                      <button
                        key={icon}
                        onClick={() => setNewIcon(icon)}
                        className={`w-12 h-12 text-2xl rounded-lg border-2 transition-all ${
                          newIcon === icon
                            ? 'border-[var(--color-primary)] bg-[var(--color-primary-light)]'
                            : 'border-[var(--color-border)] hover:border-[var(--color-primary)]'
                        }`}
                      >
                        {icon}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="flex gap-2">
                  <Button variant="primary" size="md" onClick={handleAdd}>
                    Guardar
                  </Button>
                  <Button
                    variant="ghost"
                    size="md"
                    onClick={() => {
                      setShowAddForm(false);
                      setNewName('');
                      setNewIcon('📦');
                      setError(null);
                    }}
                  >
                    Cancelar
                  </Button>
                </div>
              </div>
            )}
          </Card>

          {/* Locations List */}
          <Card variant="elevated" padding="lg" className="animate-fadeInUp stagger-1">
            <h2 className="text-lg sm:text-xl font-bold mb-4">Tus Ubicaciones</h2>

            {loading ? (
              <div className="text-center py-8">
                <div className="animate-spin text-4xl mb-2">🔄</div>
                <p className="text-[var(--color-text-secondary)]">Cargando...</p>
              </div>
            ) : locations.length === 0 ? (
              <div className="text-center py-8">
                <div className="text-4xl mb-2">📭</div>
                <p className="text-[var(--color-text-secondary)]">No hay ubicaciones</p>
              </div>
            ) : (
              <div className="space-y-3">
                {locations.map((location) => (
                  <LocationItem
                    key={location.id}
                    location={location}
                    isEditing={editingId === location.id}
                    onEdit={() => setEditingId(location.id)}
                    onCancelEdit={() => setEditingId(null)}
                    onUpdate={handleUpdate}
                    onDelete={handleDelete}
                    commonIcons={commonIcons}
                  />
                ))}
              </div>
            )}
          </Card>

          {/* Info Card */}
          <Card variant="outlined" padding="lg" className="animate-fadeInUp stagger-2">
            <div className="flex items-start gap-4">
              <span className="text-3xl">💡</span>
              <div>
                <h4 className="font-semibold mb-1">Consejo</h4>
                <p className="text-sm text-[var(--color-text-secondary)]">
                  Las ubicaciones predeterminadas (Refrigerador, Congelador, Alacena) no se
                  pueden eliminar, pero puedes agregar todas las ubicaciones personalizadas
                  que necesites.
                </p>
              </div>
            </div>
          </Card>
        </div>
      </div>
    </MainLayout>
  );
}

interface LocationItemProps {
  location: Location;
  isEditing: boolean;
  onEdit: () => void;
  onCancelEdit: () => void;
  onUpdate: (id: string, name: string, icon: string) => void;
  onDelete: (id: string) => void;
  commonIcons: string[];
}

function LocationItem({
  location,
  isEditing,
  onEdit,
  onCancelEdit,
  onUpdate,
  onDelete,
  commonIcons,
}: LocationItemProps) {
  const [editName, setEditName] = useState(location.name);
  const [editIcon, setEditIcon] = useState(location.icon);

  useEffect(() => {
    if (isEditing) {
      setEditName(location.name);
      setEditIcon(location.icon);
    }
  }, [isEditing, location.name, location.icon]);

  if (isEditing) {
    return (
      <div className="p-4 bg-[var(--color-surface)] rounded-lg space-y-3">
        <input
          type="text"
          value={editName}
          onChange={(e) => setEditName(e.target.value)}
          className="w-full px-3 py-2 rounded-lg border-2 border-[var(--color-border)] bg-white focus:border-[var(--color-primary)] outline-none"
        />

        <div className="flex flex-wrap gap-2">
          {commonIcons.map((icon) => (
            <button
              key={icon}
              onClick={() => setEditIcon(icon)}
              className={`w-10 h-10 text-xl rounded-lg border-2 transition-all ${
                editIcon === icon
                  ? 'border-[var(--color-primary)] bg-[var(--color-primary-light)]'
                  : 'border-[var(--color-border)] hover:border-[var(--color-primary)]'
              }`}
            >
              {icon}
            </button>
          ))}
        </div>

        <div className="flex gap-2">
          <Button
            variant="primary"
            size="sm"
            onClick={() => onUpdate(location.id, editName, editIcon)}
          >
            Guardar
          </Button>
          <Button variant="ghost" size="sm" onClick={onCancelEdit}>
            Cancelar
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-center justify-between p-4 bg-[var(--color-surface)] rounded-lg">
      <div className="flex items-center gap-3">
        <span className="text-2xl">{location.icon}</span>
        <div>
          <div className="font-semibold">{location.name}</div>
          {location.isDefault && (
            <div className="text-xs text-[var(--color-text-secondary)]">
              Predeterminada
            </div>
          )}
        </div>
      </div>

      <div className="flex gap-2">
        <Button variant="ghost" size="sm" onClick={onEdit}>
          Editar
        </Button>
        {!location.isDefault && (
          <Button variant="danger" size="sm" onClick={() => onDelete(location.id)}>
            Eliminar
          </Button>
        )}
      </div>
    </div>
  );
}
