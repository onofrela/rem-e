'use client';

import React from 'react';
import { MainLayout } from '@/components/layout';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';

export default function LearnPage() {
  const techniques = [
    { name: 'Sofreír', difficulty: 'Fácil', icon: '🔥' },
    { name: 'Blanquear', difficulty: 'Fácil', icon: '💧' },
    { name: 'Brasear', difficulty: 'Intermedio', icon: '🍲' },
    { name: 'Emulsionar', difficulty: 'Intermedio', icon: '🥄' },
    { name: 'Juliana', difficulty: 'Fácil', icon: '🔪' },
    { name: 'Brunoise', difficulty: 'Avanzado', icon: '🔪' },
  ];

  return (
    <MainLayout>
      <div className="min-h-screen pb-24 md:pb-8">
        <div className="py-6 sm:py-8 px-4 md:px-6">
          <div className="container mx-auto max-w-4xl">
            <h1 className="text-2xl sm:text-3xl font-bold mb-2 text-[var(--color-text-primary)] animate-fadeInDown">
              🎓 Aprender
            </h1>
            <p className="text-sm sm:text-base text-[var(--color-text-secondary)]">
              Mejora tus habilidades culinarias paso a paso
            </p>
          </div>
        </div>

        <div className="container mx-auto max-w-4xl px-4 md:px-6 -mt-4">
          {/* Progress */}
          <Card variant="elevated" padding="lg" className="mb-6 animate-fadeInUp">
            <h2 className="text-lg sm:text-xl font-bold mb-4">Tu Progreso</h2>
            <div className="space-y-3">
              <div>
                <div className="flex justify-between text-xs sm:text-sm mb-2">
                  <span>Nivel: Intermedio</span>
                  <span>75%</span>
                </div>
                <div className="w-full h-3 bg-[var(--color-surface)] rounded-full overflow-hidden">
                  <div className="h-full bg-[var(--color-primary)] transition-all duration-1000" style={{ width: '75%' }} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3 sm:gap-4 mt-4">
                <div className="text-center p-3 sm:p-4 bg-[var(--color-surface)] rounded-lg">
                  <div className="text-2xl sm:text-3xl font-bold text-[var(--color-primary)]">23</div>
                  <div className="text-xs sm:text-sm text-[var(--color-text-secondary)]">Recetas completadas</div>
                </div>
                <div className="text-center p-3 sm:p-4 bg-[var(--color-surface)] rounded-lg">
                  <div className="text-2xl sm:text-3xl font-bold text-[var(--color-success)]">8</div>
                  <div className="text-xs sm:text-sm text-[var(--color-text-secondary)]">Técnicas dominadas</div>
                </div>
              </div>
            </div>
          </Card>

          {/* Techniques */}
          <h3 className="text-lg sm:text-xl font-bold mb-4">Técnicas de Cocina</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4">
            {techniques.map((tech, idx) => (
              <Card key={tech.name} variant="elevated" padding="md" hoverable className={`animate-fadeInUp stagger-${Math.min(idx + 1, 5)}`}>
                <div className="flex items-center gap-4">
                  <div className="text-4xl">{tech.icon}</div>
                  <div className="flex-1">
                    <h4 className="font-bold">{tech.name}</h4>
                    <Badge
                      variant={
                        tech.difficulty === 'Fácil' ? 'success' :
                        tech.difficulty === 'Intermedio' ? 'warning' : 'error'
                      }
                      size="sm"
                    >
                      {tech.difficulty}
                    </Badge>
                  </div>
                  <span className="text-2xl">→</span>
                </div>
              </Card>
            ))}
          </div>
        </div>
      </div>
    </MainLayout>
  );
}
