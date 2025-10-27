'use client';

import React, { useState } from 'react';
import { MainLayout } from '@/components/layout';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';

export default function SettingsPage() {
  const [permissions, setPermissions] = useState({
    camera: true,
    microphone: true,
    notifications: true,
  });

  const togglePermission = (key: keyof typeof permissions) => {
    setPermissions({ ...permissions, [key]: !permissions[key] });
  };

  return (
    <MainLayout>
      <div className="min-h-screen pb-24 md:pb-8">
        <div className="bg-gradient-to-b from-[var(--color-text-secondary)] to-[var(--color-background)] text-white py-6 sm:py-8 px-4 md:px-6">
          <div className="container mx-auto max-w-4xl">
            <h1 className="text-2xl sm:text-3xl font-bold mb-2 animate-fadeInDown">⚙️ Ajustes</h1>
            <p className="text-sm sm:text-base text-white/90">Personaliza tu experiencia con Rem-E</p>
          </div>
        </div>

        <div className="container mx-auto max-w-4xl px-4 md:px-6 -mt-4 space-y-6">
          {/* Privacy */}
          <Card variant="elevated" padding="lg" className="animate-fadeInUp">
            <h2 className="text-lg sm:text-xl font-bold mb-4">🔐 Privacidad y Permisos</h2>
            <div className="space-y-4">
              {Object.entries(permissions).map(([key, value]) => (
                <div key={key} className="flex items-center justify-between p-4 bg-[var(--color-surface)] rounded-lg">
                  <div>
                    <div className="font-semibold capitalize">{key === 'camera' ? 'Cámara' : key === 'microphone' ? 'Micrófono' : 'Notificaciones'}</div>
                    <div className="text-sm text-[var(--color-text-secondary)]">
                      {key === 'camera' && 'Para detectar ingredientes por foto'}
                      {key === 'microphone' && 'Para control de voz durante cocción'}
                      {key === 'notifications' && 'Para alertas de temporizadores'}
                    </div>
                  </div>
                  <button
                    onClick={() => togglePermission(key as any)}
                    className={`relative w-14 h-8 rounded-full transition-colors ${
                      value ? 'bg-[var(--color-success)]' : 'bg-[var(--color-border)]'
                    }`}
                  >
                    <div className={`absolute top-1 w-6 h-6 bg-white rounded-full transition-transform ${
                      value ? 'translate-x-7' : 'translate-x-1'
                    }`} />
                  </button>
                </div>
              ))}
            </div>

            <div className="mt-6 p-4 bg-[var(--color-accent)] rounded-lg">
              <h4 className="font-semibold mb-2">📊 Tus Datos</h4>
              <ul className="text-sm space-y-1 text-[var(--color-text-secondary)]">
                <li>• 23 recetas completadas</li>
                <li>• 156 ingredientes guardados</li>
                <li>• 2 planes semanales</li>
              </ul>
              <div className="flex gap-2 mt-4">
                <Button variant="ghost" size="sm">Ver todos mis datos</Button>
                <Button variant="ghost" size="sm">Exportar (JSON)</Button>
              </div>
              <Button variant="danger" size="sm" fullWidth className="mt-2">
                🗑️ Borrar todos los datos
              </Button>
            </div>
          </Card>

          {/* Preferences */}
          <Card variant="elevated" padding="lg" className="animate-fadeInUp stagger-1">
            <h2 className="text-lg sm:text-xl font-bold mb-4">🎨 Preferencias</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">Idioma y Región</label>
                <select className="w-full px-4 py-2 rounded-lg border-2 border-[var(--color-border)] bg-[var(--color-background)]">
                  <option>Español (México)</option>
                  <option>Español (España)</option>
                  <option>English (US)</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Unidades de Medida</label>
                <select className="w-full px-4 py-2 rounded-lg border-2 border-[var(--color-border)] bg-[var(--color-background)]">
                  <option>Métrico (g, ml, °C)</option>
                  <option>Imperial (oz, cups, °F)</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Personalidad del Asistente</label>
                <select className="w-full px-4 py-2 rounded-lg border-2 border-[var(--color-border)] bg-[var(--color-background)]">
                  <option>🧑‍🏫 Mentor (Educativo)</option>
                  <option>⚡ Rápido (Solo instrucciones)</option>
                  <option>🎉 Motivador (Con ánimos)</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Tema</label>
                <div className="grid grid-cols-3 gap-2">
                  <button className="p-3 rounded-lg bg-[var(--color-primary)] text-white">☀️ Claro</button>
                  <button className="p-3 rounded-lg border-2 border-[var(--color-border)]">🌙 Oscuro</button>
                  <button className="p-3 rounded-lg border-2 border-[var(--color-border)]">🔄 Auto</button>
                </div>
              </div>
            </div>
          </Card>

          {/* Accessibility */}
          <Card variant="elevated" padding="lg" className="animate-fadeInUp stagger-2">
            <h2 className="text-lg sm:text-xl font-bold mb-4">♿ Accesibilidad</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">Tamaño de Fuente</label>
                <input type="range" min="100" max="200" defaultValue="100" className="w-full" />
                <div className="flex justify-between text-sm text-[var(--color-text-secondary)]">
                  <span>100%</span>
                  <span>200%</span>
                </div>
              </div>

              <div className="flex items-center justify-between p-4 bg-[var(--color-surface)] rounded-lg">
                <div>
                  <div className="font-semibold">Alto Contraste</div>
                  <div className="text-sm text-[var(--color-text-secondary)]">Mejora la legibilidad</div>
                </div>
                <button className="relative w-14 h-8 rounded-full bg-[var(--color-border)]">
                  <div className="absolute top-1 left-1 w-6 h-6 bg-white rounded-full" />
                </button>
              </div>

              <div className="flex items-center justify-between p-4 bg-[var(--color-surface)] rounded-lg">
                <div>
                  <div className="font-semibold">Reducir Animaciones</div>
                  <div className="text-sm text-[var(--color-text-secondary)]">Para sensibilidad al movimiento</div>
                </div>
                <button className="relative w-14 h-8 rounded-full bg-[var(--color-border)]">
                  <div className="absolute top-1 left-1 w-6 h-6 bg-white rounded-full" />
                </button>
              </div>
            </div>
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
