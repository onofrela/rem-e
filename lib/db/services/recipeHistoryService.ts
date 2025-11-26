/**
 * Recipe History Service
 *
 * Handles operations related to the history of cooked recipes:
 * - Track when recipes are started and completed
 * - Store user ratings and notes
 * - Export/import cooking history
 */

import type {
  RecipeHistory,
  RecipeSessionChanges
} from '../schemas/types';
import {
  STORES,
  getAllItems,
  getItem,
  addItem,
  updateItem,
  deleteItem,
  generateId,
  getByIndex,
  clearStore
} from '../stores/database';
import { getRecipeById } from './recipeService';

/**
 * Parameters for creating a new recipe history entry
 */
export interface CreateRecipeHistoryParams {
  recipeId: string;
  variantId?: string;
  servings?: number;
  sessionChanges?: RecipeSessionChanges;
  notes?: string;
}

// =============================================================================
// CRUD OPERATIONS
// =============================================================================

/**
 * Get all recipe history entries
 */
export async function getAllRecipeHistory(): Promise<RecipeHistory[]> {
  const history = await getAllItems<RecipeHistory>(STORES.RECIPE_HISTORY);
  // Sort by most recent first
  return history.sort((a, b) => {
    const dateA = a.completedAt || a.startedAt;
    const dateB = b.completedAt || b.startedAt;
    return new Date(dateB).getTime() - new Date(dateA).getTime();
  });
}

/**
 * Get a single history entry by ID
 */
export async function getRecipeHistoryById(id: string): Promise<RecipeHistory | null> {
  return getItem<RecipeHistory>(STORES.RECIPE_HISTORY, id);
}

/**
 * Get history entries for a specific recipe
 */
export async function getHistoryForRecipe(recipeId: string): Promise<RecipeHistory[]> {
  const entries = await getByIndex<RecipeHistory>(STORES.RECIPE_HISTORY, 'recipeId', recipeId);
  return entries.sort((a, b) => {
    const dateA = a.completedAt || a.startedAt;
    const dateB = b.completedAt || b.startedAt;
    return new Date(dateB).getTime() - new Date(dateA).getTime();
  });
}

/**
 * Get completed recipe history entries
 */
export async function getCompletedRecipeHistory(): Promise<RecipeHistory[]> {
  const allEntries = await getAllItems<RecipeHistory>(STORES.RECIPE_HISTORY);
  const entries = allEntries.filter(e => e.completed);
  return entries.sort((a, b) => {
    if (!a.completedAt || !b.completedAt) return 0;
    return new Date(b.completedAt).getTime() - new Date(a.completedAt).getTime();
  });
}

/**
 * Get in-progress recipe history entries
 */
export async function getInProgressRecipeHistory(): Promise<RecipeHistory[]> {
  const allEntries = await getAllItems<RecipeHistory>(STORES.RECIPE_HISTORY);
  const entries = allEntries.filter(e => !e.completed);
  return entries.sort((a, b) =>
    new Date(b.startedAt).getTime() - new Date(a.startedAt).getTime()
  );
}

/**
 * Create a new recipe history entry (when starting to cook)
 */
export async function createRecipeHistory(
  params: CreateRecipeHistoryParams
): Promise<RecipeHistory> {
  // Verify recipe exists
  const recipe = await getRecipeById(params.recipeId);
  if (!recipe) {
    throw new Error('Recipe not found');
  }

  const newEntry: RecipeHistory = {
    id: generateId('history'),
    recipeId: params.recipeId,
    variantId: params.variantId,
    startedAt: new Date().toISOString(),
    completed: false,
    sessionChanges: params.sessionChanges || {
      substitutions: [],
      notes: params.notes ? [{
        content: params.notes,
        type: 'modification' as const,
        timestamp: new Date().toISOString(),
      }] : [],
      adjustments: [],
    },
    servingsMade: params.servings || recipe.servings,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  return addItem(STORES.RECIPE_HISTORY, newEntry);
}

/**
 * Mark a recipe history entry as completed
 */
export async function completeRecipeHistory(
  id: string,
  params?: {
    rating?: number;
    wouldMakeAgain?: boolean;
    notes?: string;
  }
): Promise<RecipeHistory> {
  const existing = await getRecipeHistoryById(id);
  if (!existing) {
    throw new Error('Recipe history entry not found');
  }

  const updated: RecipeHistory = {
    ...existing,
    completed: true,
    completedAt: new Date().toISOString(),
    rating: params?.rating,
    wouldMakeAgain: params?.wouldMakeAgain,
    sessionChanges: {
      ...existing.sessionChanges,
      notes: params?.notes
        ? [...existing.sessionChanges.notes, {
            content: params.notes,
            type: 'modification' as const,
            timestamp: new Date().toISOString(),
          }]
        : existing.sessionChanges.notes,
    },
    updatedAt: new Date().toISOString(),
  };

  return updateItem(STORES.RECIPE_HISTORY, updated);
}

/**
 * Update a recipe history entry
 */
export async function updateRecipeHistory(
  id: string,
  updates: Partial<Omit<RecipeHistory, 'id' | 'recipeId' | 'startedAt'>>
): Promise<RecipeHistory> {
  const existing = await getRecipeHistoryById(id);
  if (!existing) {
    throw new Error('Recipe history entry not found');
  }

  const updated: RecipeHistory = {
    ...existing,
    ...updates,
  };

  return updateItem(STORES.RECIPE_HISTORY, updated);
}

/**
 * Delete a recipe history entry
 */
export async function deleteRecipeHistory(id: string): Promise<void> {
  return deleteItem(STORES.RECIPE_HISTORY, id);
}

// =============================================================================
// STATISTICS
// =============================================================================

/**
 * Get cooking statistics
 */
export async function getCookingStatistics(): Promise<{
  totalCooked: number;
  inProgress: number;
  averageRating: number;
  mostCookedRecipes: { recipeId: string; count: number }[];
  recentlyCooked: RecipeHistory[];
}> {
  const allHistory = await getAllRecipeHistory();
  const completed = allHistory.filter(h => h.completed);
  const inProgress = allHistory.filter(h => !h.completed);

  // Calculate average rating
  const ratingsSum = completed.reduce((sum, h) => sum + (h.rating || 0), 0);
  const ratingsCount = completed.filter(h => h.rating).length;
  const averageRating = ratingsCount > 0 ? ratingsSum / ratingsCount : 0;

  // Count recipes
  const recipeCounts: Record<string, number> = {};
  for (const entry of completed) {
    recipeCounts[entry.recipeId] = (recipeCounts[entry.recipeId] || 0) + 1;
  }

  const mostCookedRecipes = Object.entries(recipeCounts)
    .map(([recipeId, count]) => ({ recipeId, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 5);

  const recentlyCooked = completed.slice(0, 10);

  return {
    totalCooked: completed.length,
    inProgress: inProgress.length,
    averageRating,
    mostCookedRecipes,
    recentlyCooked,
  };
}

/**
 * Get count of times a recipe has been cooked
 */
export async function getRecipeCookCount(recipeId: string): Promise<number> {
  const entries = await getHistoryForRecipe(recipeId);
  return entries.filter(e => e.completed).length;
}

/**
 * Get average rating for a recipe
 */
export async function getRecipeAverageRating(recipeId: string): Promise<number | null> {
  const entries = await getHistoryForRecipe(recipeId);
  const ratingsArray = entries
    .filter(e => e.completed && e.rating)
    .map(e => e.rating!);

  if (ratingsArray.length === 0) return null;

  const sum = ratingsArray.reduce((acc, rating) => acc + rating, 0);
  return sum / ratingsArray.length;
}

// =============================================================================
// EXPORT/IMPORT
// =============================================================================

/**
 * IMPORTANT: Import/Export functionality has been moved to RemEDatabase class.
 * These functions now delegate to the centralized database manager.
 * DO NOT add new import/export logic here - use RemEDatabase instead.
 */

import { db } from '../RemEDatabase';

/**
 * Export recipe history to JSON
 */
export async function exportRecipeHistoryToJSON(): Promise<string> {
  return db.exportRecipeHistory();
}

/**
 * Import recipe history from JSON
 */
export async function importRecipeHistoryFromJSON(
  jsonData: string,
  clearExisting: boolean = false
): Promise<{ success: number; errors: string[] }> {
  return db.importRecipeHistory(jsonData, clearExisting);
}
