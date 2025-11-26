/**
 * User Planning Preferences Service
 */

import { STORES, getItem, updateItem } from '../stores/database';
import type { UserPlanningPreferences } from '../schemas/types';

const PREFERENCES_ID = 'planning_preferences';

/**
 * Obtiene las preferencias de planificación del usuario
 */
export async function getUserPreferences(): Promise<UserPlanningPreferences | null> {
  return getItem<UserPlanningPreferences>(STORES.USER_PLANNING_PREFERENCES, PREFERENCES_ID);
}

/**
 * Guarda o actualiza preferencias de planificación
 */
export async function saveUserPreferences(
  prefs: Omit<UserPlanningPreferences, 'id' | 'updatedAt'>
): Promise<UserPlanningPreferences> {
  const preferences: UserPlanningPreferences = {
    ...prefs,
    id: PREFERENCES_ID,
    updatedAt: new Date().toISOString(),
  };

  await updateItem(STORES.USER_PLANNING_PREFERENCES, preferences);
  return preferences;
}

/**
 * Actualiza preferencias parcialmente
 */
export async function updateUserPreferences(
  updates: Partial<Omit<UserPlanningPreferences, 'id' | 'updatedAt'>>
): Promise<UserPlanningPreferences> {
  const existing = await getUserPreferences();

  const preferences: UserPlanningPreferences = {
    ...(existing || getDefaultPreferences()),
    ...updates,
    id: PREFERENCES_ID,
    updatedAt: new Date().toISOString(),
  };

  await updateItem(STORES.USER_PLANNING_PREFERENCES, preferences);
  return preferences;
}

/**
 * Preferencias por defecto
 */
function getDefaultPreferences(): Omit<UserPlanningPreferences, 'id' | 'updatedAt'> {
  return {
    goals: [],
    dietaryRestrictions: [],
    peopleCount: 2,
    skillLevel: 'intermediate',
    timeAvailable: 'medium',
    preferredCuisines: [],
  };
}
