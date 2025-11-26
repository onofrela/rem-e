'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { MainLayout } from '@/components/layout';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import type { Recipe } from '@/lib/db/schemas/types';
import * as recipeService from '@/lib/db/services/recipeService';
import { getDailyRecommendation } from '@/lib/db/services/recommendationService';

const getCurrentTip = (tips: readonly string[]): string => {
  const today = new Date();

  // Calcular el día del año
  const startOfYear = new Date(today.getFullYear(), 0, 0);
  const diff = today.getTime() - startOfYear.getTime();
  const oneDay = 1000 * 60 * 60 * 24;
  const dayOfYear = Math.floor(diff / oneDay);

  // Usar el operador módulo (%) para la rotación
  const tipIndex = dayOfYear % tips.length;

  return tips[tipIndex];
};

export default function Home() {
  const [suggestionOfTheDay, setSuggestionOfTheDay] = useState<Recipe | null>(null);
  const todayTip = getCurrentTip(require('@/lib/utils/daily-tips').dailyTips);

  useEffect(() => {
    const loadSuggestion = async () => {
      // Try to get personalized recommendation
      const recommendation = await getDailyRecommendation();

      if (recommendation) {
        setSuggestionOfTheDay(recommendation.recipe);
      } else {
        // Fallback: show first recipe if recommendation fails
        const recipes = await recipeService.getAllRecipes();
        if (recipes.length > 0) {
          setSuggestionOfTheDay(recipes[0]);
        }
      }
    };
    loadSuggestion();
  }, []);

  const currentHour = new Date().getHours();
  const greeting =
    currentHour < 12
      ? '¡Buenos días!'
      : currentHour < 18
      ? '¡Buenas tardes!'
      : '¡Buenas noches!';

  return (
    <MainLayout>
      {/* Contenedor principal que ocupa toda la altura disponible */}
      <div className="flex-1 flex flex-col min-h-0"> {/* clave: min-h-0 */}
        
        {/* Compact greeting header - only on tablet+ */}
        <div className="hidden md:block px-6 py-6 flex-shrink-0"> {/* flex-shrink-0 para que no se encoja */}
          <p className="text-lg md:text-xl text-gray-600">{greeting}</p>
          <h2 className="text-2xl md:text-3xl font-semibold text-gray-800">¿Qué cocinaremos hoy?</h2>
        </div>

        {/* Grid Container */}
        <div className="flex-1 p-4 md:p-6 lg:p-8 min-h-0"> {/* clave: flex-1 y min-h-0, sin overflow-auto */}
          {/* Mobile: 2-column vertical | Tablet: 4-column horizontal grid with variable sizes */}
          <div className="grid grid-cols-2 md:grid-cols-4 grid-rows-[1fr_1fr_1fr_1fr] md:grid-rows-[1fr_1fr_1fr] gap-3 md:gap-5 lg:gap-6 w-full h-full"> 

            {/* Cook Now - 2x2 tile (Hero) */}
            <Link href="/cook" className="col-span-2 row-span-2">
              <Card
                variant="elevated"
                padding="lg"
                hoverable
                className="h-full animate-scaleIn flex flex-col justify-center relative overflow-hidden home-hero-card"
              >
                <div className="relative flex flex-row md:flex-row items-center md:justify-between text-white h-full md:px-4">
                  <div className="text-left md:text-left flex-1">
                    <p className="text-sm md:text-xl lg:text-2xl opacity-95 mb-3 md:mb-4 font-medium">Acción rápida</p>
                    <h3 className="text-4xl md:text-6xl lg:text-7xl font-bold mb-3 md:mb-4 flex items-center gap-3 md:gap-4 drop-shadow-lg">
                      <span className="text-5xl md:text-7xl lg:text-8xl">🍽</span>
                      <span>Cocinar Ahora</span>
                    </h3>
                    <p className="text-sm md:text-xl lg:text-2xl opacity-95 font-medium">
                      Descubre recetas con lo que tienes
                    </p>
                  </div>
                  <div className="text-4xl md:text-7xl lg:text-8xl mt-4 md:mt-0 md:ml-4 opacity-90">→</div>
                </div>
              </Card>
            </Link>

            {/* Suggestion of the Day - 2x1 tile */}
            {suggestionOfTheDay && (
              <Link href={`/recipes/${suggestionOfTheDay.id}`} className="col-span-2 row-span-1">
                <Card variant="elevated" padding="none" hoverable className="h-full animate-fadeInUp stagger-5 overflow-hidden flex flex-row">
                  {/* Recipe Info */}
                  <div className="p-4 md:p-6 flex flex-col justify-between flex-1">
                    <div>
                      <div className="flex items-center gap-2 md:gap-3 mb-2 md:mb-3">
                        <span className="text-2xl md:text-3xl lg:text-4xl">💡</span>
                        <span className="text-sm md:text-base lg:text-lg font-semibold text-gray-600">
                          Sugerencia del día
                        </span>
                      </div>
                      <h4 className="text-lg md:text-xl lg:text-2xl font-bold text-gray-800 mb-2 md:mb-3">
                        {suggestionOfTheDay.name}
                      </h4>
                      <p className="text-sm md:text-base lg:text-lg text-gray-600 mb-3 md:mb-4 line-clamp-2">
                        {suggestionOfTheDay.description}
                      </p>
                    </div>

                    <div className="flex flex-wrap gap-2 md:gap-3">
                      <Badge variant="default" className="text-xs md:text-sm lg:text-base">
                        ⏱ {suggestionOfTheDay.time}m
                      </Badge>
                      <Badge variant="success" className="text-xs md:text-sm lg:text-base">
                        👨‍🍳 {suggestionOfTheDay.difficulty}
                    </Badge>
                    <Badge variant="info" className="text-xs md:text-sm lg:text-base">
                      🍴 {suggestionOfTheDay.servings}
                    </Badge>
                  </div>
                </div>

                {/* Recipe Image */}
                <div className="w-32 md:w-48 lg:w-56 flex items-center justify-center text-white text-5xl md:text-7xl lg:text-8xl flex-shrink-0 border-l border-white/20 home-suggestion-image">
                  🍽
                </div>
              </Card>
            </Link>
            )}

            {/* Tip of the Day - 2x1 wide tile */}
            <div className="col-span-2 row-span-1">
              <Card variant="outlined" padding="lg" className="h-full animate-fadeIn flex items-center">
                <div className="flex items-center gap-4 md:gap-6 w-full">
                  <span className="text-4xl md:text-5xl lg:text-6xl flex-shrink-0">💭</span>
                  <div className="flex-1 min-w-0">
                    <h4 className="text-sm md:text-lg lg:text-xl font-semibold text-gray-800 mb-2 md:mb-3">
                      Consejo de hoy
                    </h4>
                    <p className="text-sm md:text-base lg:text-lg text-gray-600 line-clamp-2">
                      {todayTip}
                    </p>
                  </div>
                </div>
              </Card>
            </div>
            
            {/* Inventory - 1x1 tile */}
            <Link href="/inventory" className="col-span-1 row-span-1">
              <Card variant="elevated" padding="lg" hoverable className="h-full animate-fadeInUp stagger-1 flex flex-col justify-center items-center text-center gap-2 md:gap-3">
                <span className="text-5xl md:text-6xl lg:text-7xl">🥫</span>
                <div>
                  <h3 className="text-base md:text-xl lg:text-2xl font-semibold text-gray-800">
                    Inventario
                  </h3>
                  <p className="text-sm md:text-base lg:text-lg text-gray-600 mt-1 md:mt-2">
                    Ingredientes
                  </p>
                </div>
              </Card>
            </Link>

            {/* My Recipes - 1x1 tile */}
            <Link href="/recipes" className="col-span-1 row-span-1">
              <Card variant="elevated" padding="lg" hoverable className="h-full animate-fadeInUp stagger-2 flex flex-col justify-center items-center text-center gap-2 md:gap-3">
                <span className="text-5xl md:text-6xl lg:text-7xl">📖</span>
                <div>
                  <h3 className="text-base md:text-xl lg:text-2xl font-semibold text-gray-800">
                    Mis Recetas
                  </h3>
                  <p className="text-sm md:text-base lg:text-lg text-gray-600 mt-1 md:mt-2">
                    Favoritas
                  </p>
                </div>
              </Card>
            </Link>

            {/* Plan - 1x1 tile */}
            <Link href="/plan" className="col-span-1 row-span-1">
              <Card variant="elevated" padding="lg" hoverable className="h-full animate-fadeInUp stagger-3 flex flex-col justify-center items-center text-center gap-2 md:gap-3">
                <span className="text-5xl md:text-6xl lg:text-7xl">📅</span>
                <div>
                  <h3 className="text-base md:text-xl lg:text-2xl font-semibold text-gray-800">
                    Planificar
                  </h3>
                  <p className="text-sm md:text-base lg:text-lg text-gray-600 mt-1 md:mt-2">
                    Tu semana
                  </p>
                </div>
              </Card>
            </Link>

            {/* Learn - 1x1 tile */}
            <Link href="/learn" className="col-span-1 row-span-1">
              <Card variant="elevated" padding="lg" hoverable className="h-full animate-fadeInUp stagger-4 flex flex-col justify-center items-center text-center gap-2 md:gap-3">
                <span className="text-5xl md:text-6xl lg:text-7xl">🎓</span>
                <div>
                  <h3 className="text-base md:text-xl lg:text-2xl font-semibold text-gray-800">
                    Aprender
                  </h3>
                  <p className="text-sm md:text-base lg:text-lg text-gray-600 mt-1 md:mt-2">
                    Habilidades
                  </p>
                </div>
              </Card>
            </Link>

          </div>
        </div>
      </div>
    </MainLayout>
  );
}
