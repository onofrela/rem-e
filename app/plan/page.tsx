'use client';

import React from 'react';
import { MainLayout } from '@/components/layout';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';

export default function PlanPage() {
  return (
    <MainLayout>
      <div className="min-h-screen pb-24 md:pb-8">
        <div className="py-8 px-6">
          <div className="container mx-auto max-w-4xl">
            <h1 className="text-3xl font-bold mb-2 text-[var(--color-text-primary)]">📅 Planificador Semanal</h1>
            <p className="text-[var(--color-text-secondary)]">Organiza tus comidas y ahorra tiempo</p>
          </div>
        </div>

        <div className="container mx-auto max-w-4xl px-6 -mt-4">
          <Card variant="elevated" padding="lg" className="mb-6">
            <h2 className="text-2xl font-bold mb-4">Configurar Plan</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">Presupuesto semanal</label>
                <input
                  type="range"
                  min="200"
                  max="2000"
                  step="50"
                  defaultValue="800"
                  className="w-full"
                />
                <div className="flex justify-between text-sm text-[var(--color-text-secondary)]">
                  <span>$200</span>
                  <span className="font-bold text-[var(--color-primary)]">$800</span>
                  <span>$2,000</span>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Días para cocinar</label>
                <div className="flex flex-wrap gap-2">
                  {['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'].map(day => (
                    <button
                      key={day}
                      className="px-4 py-2 rounded-lg bg-[var(--color-primary)] text-white"
                    >
                      {day}
                    </button>
                  ))}
                </div>
              </div>

              <Button variant="primary" size="lg" fullWidth>
                Generar Plan Semanal
              </Button>
            </div>
          </Card>

          <Card variant="elevated" padding="lg">
            <h3 className="font-bold mb-4">Ejemplo de Plan Semanal</h3>
            <div className="space-y-3">
              {['Lunes', 'Martes', 'Miércoles'].map((day, idx) => (
                <div key={day} className="p-4 bg-[var(--color-surface)] rounded-lg">
                  <div className="font-semibold mb-2">{day}</div>
                  <div className="text-sm text-[var(--color-text-secondary)]">
                    Comida: Pollo guisado (Batch cooking)
                  </div>
                  <Badge variant="info" size="sm" className="mt-2">⏱ 1.5h</Badge>
                </div>
              ))}
            </div>
          </Card>
        </div>
      </div>
    </MainLayout>
  );
}
