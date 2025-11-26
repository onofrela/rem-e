'use client';

import React from 'react';
import { MealCard } from './MealCard';
import type { MealPlan } from '@/lib/db/schemas/types';

interface WeeklyPlanViewProps {
  plan: MealPlan;
  onEditMeal?: (day: string, mealType: string) => void;
}

const DAY_LABELS = {
  lunes: 'Lun',
  martes: 'Mar',
  miercoles: 'Mié',
  jueves: 'Jue',
  viernes: 'Vie',
  sabado: 'Sáb',
  domingo: 'Dom',
};

export const WeeklyPlanView: React.FC<WeeklyPlanViewProps> = ({
  plan,
  onEditMeal,
}) => {
  const days = Object.keys(DAY_LABELS) as Array<keyof typeof DAY_LABELS>;

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-7 gap-4">
      {days.map((day) => (
        <div key={day} className="flex flex-col">
          <h3 className="text-xl font-bold mb-3 text-center">
            {DAY_LABELS[day]}
          </h3>

          <MealCard
            label="🌅 Desayuno"
            recipeId={plan.meals[day].desayuno}
            onEdit={onEditMeal ? () => onEditMeal(day, 'desayuno') : undefined}
          />

          <MealCard
            label="☀️ Almuerzo"
            recipeId={plan.meals[day].almuerzo}
            onEdit={onEditMeal ? () => onEditMeal(day, 'almuerzo') : undefined}
          />

          <MealCard
            label="🍽️ Comida"
            recipeId={plan.meals[day].comida}
            onEdit={onEditMeal ? () => onEditMeal(day, 'comida') : undefined}
          />

          <MealCard
            label="🌙 Cena"
            recipeId={plan.meals[day].cena}
            onEdit={onEditMeal ? () => onEditMeal(day, 'cena') : undefined}
          />
        </div>
      ))}
    </div>
  );
};
