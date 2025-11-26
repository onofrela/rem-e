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
  console.log('💾 createMealPlan called with:', plan);

  const now = new Date().toISOString();
  const newPlan: MealPlan = {
    ...plan,
    id: generateId('plan'),
    createdAt: now,
    updatedAt: now,
  };

  console.log('💾 Saving plan to database:', {
    id: newPlan.id,
    name: newPlan.name,
    startDate: newPlan.startDate,
    endDate: newPlan.endDate,
  });

  await addItem(STORES.MEAL_PLANS, newPlan);

  console.log('✅ Plan saved successfully');

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

  console.log('🔍 getActiveMealPlan - Today:', today);
  console.log('🔍 Total plans in database:', plans.length);

  if (plans.length > 0) {
    console.log('📋 All plans:', plans.map(p => ({
      id: p.id,
      name: p.name,
      startDate: p.startDate,
      endDate: p.endDate,
      isActive: p.startDate <= today && p.endDate >= today,
    })));
  }

  const activePlan = plans.find(plan =>
    plan.startDate <= today && plan.endDate >= today
  );

  console.log('✅ Active plan found:', activePlan ? activePlan.id : 'None');

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
 * Calcula fechas de inicio y fin para la semana actual (Lun-Dom)
 */
export function getNextWeekDates(): { startDate: string; endDate: string } {
  const today = new Date();
  const dayOfWeek = today.getDay(); // 0 = Sunday, 1 = Monday, ...

  // Calculate this week's Monday (or next Monday if today is Sunday)
  let daysToMonday;
  if (dayOfWeek === 0) {
    // Sunday - use next Monday
    daysToMonday = 1;
  } else {
    // Any other day - go back to this Monday
    daysToMonday = -(dayOfWeek - 1);
  }

  const monday = new Date(today);
  monday.setDate(today.getDate() + daysToMonday);

  // Calculate this week's Sunday
  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);

  const startDate = monday.toISOString().split('T')[0];
  const endDate = sunday.toISOString().split('T')[0];

  console.log('📅 Generated week dates:', {
    today: today.toISOString().split('T')[0],
    startDate,
    endDate,
    dayOfWeek,
  });

  return { startDate, endDate };
}
