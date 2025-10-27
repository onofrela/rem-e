'use client';

import React from 'react';
import Link from 'next/link';
import { MainLayout } from '@/components/layout';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { mockRecipes } from '@/lib/utils/mock-data';

export default function Home() {
  const currentHour = new Date().getHours();
  const greeting =
    currentHour < 12
      ? '¡Buenos días!'
      : currentHour < 18
      ? '¡Buenas tardes!'
      : '¡Buenas noches!';

  const suggestionOfTheDay = mockRecipes[0];

  return (
    <MainLayout>
      <div className="min-h-screen pb-20 md:pb-8">
        {/* Header Section */}
        <div className="pt-8 pb-12 px-4 md:px-6">
          <div className="container mx-auto max-w-4xl">
            <div className="flex items-center justify-between mb-2 animate-fadeInDown">
              <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold text-[var(--color-primary)]">
                Rem-E
              </h1>
              <Link href="/settings">
                <button className="text-2xl p-2 hover:bg-[var(--color-surface)] rounded-full transition-colors">
                  ⚙️
                </button>
              </Link>
            </div>
            <p className="text-lg md:text-xl text-[var(--color-text-secondary)]">
              {greeting}
            </p>
            <h2 className="text-2xl md:text-3xl font-semibold mt-2 text-[var(--color-text-primary)]">
              ¿Qué cocinaremos hoy?
            </h2>
          </div>
        </div>

        <div className="container mx-auto max-w-4xl px-4 md:px-6 -mt-6">
          {/* Primary Action - Cook Now */}
          <Link href="/cook">
            <Card
              variant="elevated"
              padding="lg"
              hoverable
              className="mb-6 bg-gradient-to-r from-[var(--color-primary)] to-[var(--color-secondary)] border-none animate-scaleIn"
            >
              <div className="flex items-center justify-between text-white">
                <div>
                  <p className="text-sm opacity-90 mb-1">Acción rápida</p>
                  <h3 className="text-xl sm:text-2xl font-bold">🍽 Cocinar Ahora</h3>
                  <p className="text-sm opacity-90 mt-1">
                    Descubre recetas con lo que tienes
                  </p>
                </div>
                <div className="text-3xl sm:text-4xl">→</div>
              </div>
            </Card>
          </Link>

          {/* Secondary Actions Grid */}
          <div className="grid grid-cols-2 gap-3 sm:gap-4 mb-8">
            <Link href="/inventory">
              <Card variant="elevated" padding="md" hoverable className="h-full animate-fadeInUp stagger-1">
                <div className="flex flex-col items-center text-center gap-2">
                  <span className="text-3xl sm:text-4xl">🥫</span>
                  <h3 className="text-sm sm:text-base font-semibold text-[var(--color-text-primary)]">
                    Inventario
                  </h3>
                  <p className="text-xs sm:text-sm text-[var(--color-text-secondary)]">
                    Tus ingredientes
                  </p>
                </div>
              </Card>
            </Link>

            <Link href="/recipes">
              <Card variant="elevated" padding="md" hoverable className="h-full animate-fadeInUp stagger-2">
                <div className="flex flex-col items-center text-center gap-2">
                  <span className="text-3xl sm:text-4xl">📖</span>
                  <h3 className="text-sm sm:text-base font-semibold text-[var(--color-text-primary)]">
                    Mis Recetas
                  </h3>
                  <p className="text-xs sm:text-sm text-[var(--color-text-secondary)]">
                    Tus favoritas
                  </p>
                </div>
              </Card>
            </Link>

            <Link href="/plan">
              <Card variant="elevated" padding="md" hoverable className="h-full animate-fadeInUp stagger-3">
                <div className="flex flex-col items-center text-center gap-2">
                  <span className="text-3xl sm:text-4xl">📅</span>
                  <h3 className="text-sm sm:text-base font-semibold text-[var(--color-text-primary)]">
                    Planificar
                  </h3>
                  <p className="text-xs sm:text-sm text-[var(--color-text-secondary)]">
                    Organiza tu semana
                  </p>
                </div>
              </Card>
            </Link>

            <Link href="/learn">
              <Card variant="elevated" padding="md" hoverable className="h-full animate-fadeInUp stagger-4">
                <div className="flex flex-col items-center text-center gap-2">
                  <span className="text-3xl sm:text-4xl">🎓</span>
                  <h3 className="text-sm sm:text-base font-semibold text-[var(--color-text-primary)]">
                    Aprender
                  </h3>
                  <p className="text-xs sm:text-sm text-[var(--color-text-secondary)]">
                    Mejora tus habilidades
                  </p>
                </div>
              </Card>
            </Link>
          </div>

          {/* Suggestion of the Day */}
          <div className="mb-8 animate-fadeInUp stagger-5">
            <div className="flex items-center gap-2 mb-4">
              <span className="text-xl sm:text-2xl">💡</span>
              <h3 className="text-lg sm:text-xl font-semibold text-[var(--color-text-primary)]">
                Sugerencia del día
              </h3>
            </div>

            <Link href={`/recipes/${suggestionOfTheDay.id}`}>
              <Card variant="elevated" padding="none" hoverable>
                {/* Recipe Image Placeholder */}
                <div className="h-40 sm:h-48 bg-gradient-to-br from-[var(--color-primary)] to-[var(--color-secondary)] rounded-t-xl flex items-center justify-center text-white text-5xl sm:text-6xl">
                  🍽
                </div>

                <div className="p-4 sm:p-6">
                  <h4 className="text-lg sm:text-xl font-bold text-[var(--color-text-primary)] mb-2">
                    {suggestionOfTheDay.name}
                  </h4>
                  <p className="text-sm sm:text-base text-[var(--color-text-secondary)] mb-4">
                    {suggestionOfTheDay.description}
                  </p>

                  <div className="flex flex-wrap gap-2 mb-4">
                    <Badge variant="default">
                      ⏱ {suggestionOfTheDay.time} min
                    </Badge>
                    <Badge variant="success">
                      👨‍🍳 {suggestionOfTheDay.difficulty}
                    </Badge>
                    <Badge variant="info">
                      🍴 {suggestionOfTheDay.servings} porciones
                    </Badge>
                  </div>

                  <Button variant="primary" fullWidth>
                    Ver Receta
                  </Button>
                </div>
              </Card>
            </Link>
          </div>

          {/* Quick Stats/Tips */}
          <Card variant="outlined" padding="md" className="bg-[var(--color-accent)] animate-fadeIn">
            <div className="flex items-start gap-3">
              <span className="text-xl sm:text-2xl">💭</span>
              <div>
                <h4 className="text-sm sm:text-base font-semibold text-[var(--color-text-primary)] mb-1">
                  Consejo de hoy
                </h4>
                <p className="text-xs sm:text-sm text-[var(--color-text-secondary)]">
                  El ajo y la cebolla son la base de muchos platillos. Siempre
                  ten algunos a la mano para dar sabor a tus comidas.
                </p>
              </div>
            </div>
          </Card>
        </div>
      </div>
    </MainLayout>
  );
}
