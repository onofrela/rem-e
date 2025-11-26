/**
 * Meal Plan Service
 * CRUD operations for weekly meal plans
 */

import { STORES, generateId, addItem, getItem, getAllItems, updateItem, deleteItem } from '../stores/database';
import type { MealPlan, DailyMeals } from '../schemas/types';

/**
 * Crea un nuevo plan de comidas
 */
export async function createMealPlan(
  plan: Omit<MealPlan, 'id' | 'createdAt' | 'updatedAt'>
): Promise<MealPlan> {
  const now = new Date().toISOString();
  const newPlan: MealPlan = {
    ...plan,
    id: generateId('plan'),
    createdAt: now,
    updatedAt: now,
  };

  await addItem(STORES.MEAL_PLANS, newPlan);
  return newPlan;
}

/**
 * Obtiene un plan por ID
 */
export async function getMealPlanById(id: string): Promise<MealPlan | null> {
  return getItem<MealPlan>(STORES.MEAL_PLANS, id);
}

/**
 * Obtiene todos los planes ordenados por fecha (más reciente primero)
 */
export async function getAllMealPlans(): Promise<MealPlan[]> {
  const plans = await getAllItems<MealPlan>(STORES.MEAL_PLANS);
  return plans.sort((a, b) =>
    new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );
}

/**
 * Obtiene el plan activo (el que cubre la fecha actual)
 */
export async function getActiveMealPlan(): Promise<MealPlan | null> {
  const plans = await getAllItems<MealPlan>(STORES.MEAL_PLANS);
  const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD

  const activePlan = plans.find(plan =>
    plan.startDate <= today && plan.endDate >= today
  );

  return activePlan || null;
}

/**
 * Actualiza un plan existente
 */
export async function updateMealPlan(
  id: string,
  updates: Partial<Omit<MealPlan, 'id' | 'createdAt'>>
): Promise<MealPlan> {
  const existing = await getMealPlanById(id);
  if (!existing) {
    throw new Error(`Meal plan ${id} not found`);
  }

  const updated: MealPlan = {
    ...existing,
    ...updates,
    updatedAt: new Date().toISOString(),
  };

  await updateItem(STORES.MEAL_PLANS, updated);
  return updated;
}

/**
 * Actualiza una comida específica en un plan
 */
export async function updateMealInPlan(
  planId: string,
  day: keyof MealPlan['meals'],
  mealType: keyof DailyMeals,
  recipeId: string | null
): Promise<MealPlan> {
  const plan = await getMealPlanById(planId);
  if (!plan) {
    throw new Error(`Meal plan ${planId} not found`);
  }

  plan.meals[day][mealType] = recipeId;
  plan.updatedAt = new Date().toISOString();

  await updateItem(STORES.MEAL_PLANS, plan);
  return plan;
}

/**
 * Elimina un plan
 */
export async function deleteMealPlan(id: string): Promise<void> {
  await deleteItem(STORES.MEAL_PLANS, id);
}

/**
 * Genera nombre de plan basado en fechas
 */
export function generatePlanName(startDate: string, endDate: string): string {
  const start = new Date(startDate);
  const end = new Date(endDate);

  const formatDate = (date: Date) => {
    const day = date.getDate();
    const months = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun',
                    'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
    return `${day} ${months[date.getMonth()]}`;
  };

  return `Plan del ${formatDate(start)} al ${formatDate(end)}`;
}

/**
 * Calcula fechas de inicio y fin para la próxima semana
 */
export function getNextWeekDates(): { startDate: string; endDate: string } {
  const today = new Date();
  const dayOfWeek = today.getDay(); // 0 = Sunday, 1 = Monday, ...

  // Calculate next Monday
  const daysUntilMonday = dayOfWeek === 0 ? 1 : (8 - dayOfWeek);
  const nextMonday = new Date(today);
  nextMonday.setDate(today.getDate() + daysUntilMonday);

  // Calculate next Sunday
  const nextSunday = new Date(nextMonday);
  nextSunday.setDate(nextMonday.getDate() + 6);

  return {
    startDate: nextMonday.toISOString().split('T')[0],
    endDate: nextSunday.toISOString().split('T')[0],
  };
}
