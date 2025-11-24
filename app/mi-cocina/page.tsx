/* IMPORTANT: Light theme only - do not use dark mode */
'use client';

import React, { useState, useEffect } from 'react';
import { MainLayout } from '@/components/layout';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { ApplianceCard } from '@/components/appliances/ApplianceCard';
import { AddApplianceFlow } from '@/components/appliances/AddApplianceFlow';
import type { UserAppliance, CatalogAppliance } from '@/lib/db/schemas/types';
import {
  getAllUserAppliances,
  addUserAppliance,
  deleteUserAppliance,
} from '@/lib/db/services/userApplianceService';
import {
  getAllAppliances,
  getApplianceById,
  initializeAppliancesCache,
} from '@/lib/db/services/applianceService';

interface UserApplianceWithCatalog {
  userAppliance: UserAppliance;
  catalogAppliance: CatalogAppliance | null;
}

export default function MiCocinaPage() {
  const [userAppliances, setUserAppliances] = useState<UserApplianceWithCatalog[]>([]);
  const [catalogAppliances, setCatalogAppliances] = useState<CatalogAppliance[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddFlow, setShowAddFlow] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);

      // Initialize appliances cache
      await initializeAppliancesCache();

      const [userAppliancesData, catalogData] = await Promise.all([
        getAllUserAppliances(),
        getAllAppliances(),
      ]);

      // Enrich user appliances with catalog data
      const enriched = await Promise.all(
        userAppliancesData.map(async (userApp) => {
          const catalog = await getApplianceById(userApp.applianceId);
          return {
            userAppliance: userApp,
            catalogAppliance: catalog,
          };
        })
      );

      setUserAppliances(enriched);
      setCatalogAppliances(catalogData);
      setError(null);
    } catch (err) {
      setError('Error al cargar los electrodomésticos');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleAddAppliance = async (data: { applianceId: string }) => {
    try {
      await addUserAppliance(data);
      await loadData();
      setShowAddFlow(false);
    } catch (err: any) {
      setError(err.message || 'Error al agregar el electrodoméstico');
      console.error(err);
    }
  };

  const handleDeleteAppliance = async (appliance: UserAppliance) => {
    if (!confirm('¿Estás seguro de eliminar este electrodoméstico?')) return;
    try {
      await deleteUserAppliance(appliance.id);
      await loadData();
    } catch (err) {
      setError('Error al eliminar el electrodoméstico');
      console.error(err);
    }
  };

  if (loading) {
    return (
      <MainLayout>
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin text-4xl mb-4">⚙️</div>
            <p className="text-gray-600">Cargando tu cocina...</p>
          </div>
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <div className="flex-1 p-4 md:p-6 lg:p-8 max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
          <div>
            <h1 className="text-3xl md:text-4xl font-bold">Mi Cocina</h1>
            <p className="text-gray-600 mt-1">
              {userAppliances.length === 0
                ? 'Agrega los electrodomésticos que tienes'
                : `Tienes ${userAppliances.length} ${userAppliances.length === 1 ? 'electrodoméstico' : 'electrodomésticos'}`}
            </p>
          </div>
          <Button
            variant="primary"
            size="lg"
            icon={<span>➕</span>}
            iconPosition="left"
            onClick={() => setShowAddFlow(true)}
          >
            Agregar
          </Button>
        </div>

        {/* Error Message */}
        {error && (
          <Card variant="outlined" padding="md" className="mb-6 border-red-500 bg-red-50">
            <p className="text-red-700">{error}</p>
            <Button variant="ghost" size="sm" onClick={() => setError(null)} className="mt-2">
              Cerrar
            </Button>
          </Card>
        )}

        {/* Appliances Grid */}
        {userAppliances.length === 0 ? (
          <Card variant="elevated" padding="lg" className="text-center">
            <div className="py-12">
              <span className="text-6xl md:text-7xl block mb-4">🏠</span>
              <h3 className="text-xl md:text-2xl font-semibold mb-2">
                ¡Comienza a construir tu cocina!
              </h3>
              <p className="text-gray-600 mb-6 max-w-md mx-auto">
                Agrega los electrodomésticos que tienes para que Rem-E pueda sugerirte recetas personalizadas.
              </p>
              <Button
                variant="primary"
                size="xl"
                icon={<span>➕</span>}
                iconPosition="left"
                onClick={() => setShowAddFlow(true)}
              >
                Agregar mi primer electrodoméstico
              </Button>
            </div>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {userAppliances.map(({ userAppliance, catalogAppliance }) => {
              if (!catalogAppliance) return null;
              return (
                <ApplianceCard
                  key={userAppliance.id}
                  userAppliance={userAppliance}
                  catalogAppliance={catalogAppliance}
                  onDelete={handleDeleteAppliance}
                />
              );
            })}
          </div>
        )}

        {/* Add Flow */}
        <AddApplianceFlow
          isOpen={showAddFlow}
          onClose={() => setShowAddFlow(false)}
          appliances={catalogAppliances}
          onAdd={handleAddAppliance}
        />
      </div>
    </MainLayout>
  );
}
