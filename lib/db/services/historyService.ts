/**
 * Recipe History Service
 *
 * Tracks recipe execution history:
 * - Create and manage cooking sessions
 * - Record substitutions, notes, and adjustments during cooking
 * - Track completion and ratings
 * - Provide insights from cooking history
 */

import type {
  RecipeHistory,
  SessionSubstitution,
  SessionNote,
  SessionAdjustment,
  SaveCookingNoteParams,
  CompleteRecipeSessionParams
} from '../schemas/types';
import {
  STORES,
  generateId,
  addItem,
  getItem,
  getAllItems,
  getByIndex,
  updateItem,
  deleteItem
} from '../stores/database';

// =============================================================================
// RECIPE HISTORY CRUD OPERATIONS
// =============================================================================

/**
 * Create a new cooking session (history entry)
 */
export async function createHistoryEntry(
  recipeId: string,
  variantId?: string,
  servingsMade: number = 1
): Promise<RecipeHistory> {
  const now = new Date().toISOString();

  const history: RecipeHistory = {
    id: generateId('hist'),
    recipeId,
    variantId,
    userId: undefined,
    startedAt: now,
    completedAt: undefined,
    completed: false,
    sessionChanges: {
      substitutions: [],
      notes: [],
      adjustments: []
    },
    servingsMade,
    rating: undefined,
    wouldMakeAgain: undefined,
    createdAt: now,
    updatedAt: now
  };

  return addItem(STORES.RECIPE_HISTORY, history);
}

/**
 * Get a specific history entry by ID
 */
export async function getHistoryById(id: string): Promise<RecipeHistory | null> {
  return getItem<RecipeHistory>(STORES.RECIPE_HISTORY, id);
}

/**
 * Get all history entries for a specific recipe
 */
export async function getRecipeHistory(recipeId: string): Promise<RecipeHistory[]> {
  const histories = await getByIndex<RecipeHistory>(
    STORES.RECIPE_HISTORY,
    'recipeId',
    recipeId
  );

  // Sort by most recent first
  return histories.sort((a, b) =>
    new Date(b.startedAt).getTime() - new Date(a.startedAt).getTime()
  );
}

/**
 * Get all completed cooking sessions
 */
export async function getCompletedHistory(): Promise<RecipeHistory[]> {
  const histories = await getByIndex<RecipeHistory>(
    STORES.RECIPE_HISTORY,
    'completed',
    1 // Use 1 instead of true for IndexedDB
  );

  return histories.sort((a, b) =>
    new Date(b.startedAt).getTime() - new Date(a.startedAt).getTime()
  );
}

/**
 * Get recent history entries (last N sessions)
 */
export async function getRecentHistory(limit: number = 10): Promise<RecipeHistory[]> {
  const allHistory = await getAllItems<RecipeHistory>(STORES.RECIPE_HISTORY);

  return allHistory
    .sort((a, b) =>
      new Date(b.startedAt).getTime() - new Date(a.startedAt).getTime()
    )
    .slice(0, limit);
}

/**
 * Get active (in-progress) cooking sessions
 */
export async function getActiveHistoryEntries(): Promise<RecipeHistory[]> {
  const allHistory = await getAllItems<RecipeHistory>(STORES.RECIPE_HISTORY);

  return allHistory.filter(h => !h.completed);
}

/**
 * Delete a history entry
 */
export async function deleteHistoryEntry(id: string): Promise<void> {
  return deleteItem(STORES.RECIPE_HISTORY, id);
}

// =============================================================================
// SESSION MODIFICATIONS
// =============================================================================

/**
 * Add a substitution to a cooking session
 */
export async function addSubstitutionToSession(
  historyId: string,
  substitution: SessionSubstitution
): Promise<RecipeHistory> {
  const history = await getHistoryById(historyId);

  if (!history) {
    throw new Error(`History entry ${historyId} not found`);
  }

  const updated: RecipeHistory = {
    ...history,
    sessionChanges: {
      ...history.sessionChanges,
      substitutions: [...history.sessionChanges.substitutions, substitution]
    },
    updatedAt: new Date().toISOString()
  };

  return updateItem(STORES.RECIPE_HISTORY, updated);
}

/**
 * Add a note to a cooking session
 */
export async function addNoteToSession(
  params: SaveCookingNoteParams
): Promise<RecipeHistory> {
  const history = await getHistoryById(params.historyId);

  if (!history) {
    throw new Error(`History entry ${params.historyId} not found`);
  }

  const note: SessionNote = {
    stepNumber: params.stepNumber,
    content: params.content,
    type: params.type,
    timestamp: new Date().toISOString()
  };

  const updated: RecipeHistory = {
    ...history,
    sessionChanges: {
      ...history.sessionChanges,
      notes: [...history.sessionChanges.notes, note]
    },
    updatedAt: new Date().toISOString()
  };

  return updateItem(STORES.RECIPE_HISTORY, updated);
}

/**
 * Add an adjustment to a cooking session
 */
export async function addAdjustmentToSession(
  historyId: string,
  adjustment: SessionAdjustment
): Promise<RecipeHistory> {
  const history = await getHistoryById(historyId);

  if (!history) {
    throw new Error(`History entry ${historyId} not found`);
  }

  const updated: RecipeHistory = {
    ...history,
    sessionChanges: {
      ...history.sessionChanges,
      adjustments: [...history.sessionChanges.adjustments, adjustment]
    },
    updatedAt: new Date().toISOString()
  };

  return updateItem(STORES.RECIPE_HISTORY, updated);
}

/**
 * Update serving size for a session
 */
export async function updateServingsMade(
  historyId: string,
  servingsMade: number
): Promise<RecipeHistory> {
  const history = await getHistoryById(historyId);

  if (!history) {
    throw new Error(`History entry ${historyId} not found`);
  }

  const updated: RecipeHistory = {
    ...history,
    servingsMade,
    updatedAt: new Date().toISOString()
  };

  return updateItem(STORES.RECIPE_HISTORY, updated);
}

// =============================================================================
// SESSION COMPLETION
// =============================================================================

/**
 * Complete a cooking session
 */
export async function completeHistoryEntry(
  params: CompleteRecipeSessionParams
): Promise<RecipeHistory> {
  const history = await getHistoryById(params.historyId);

  if (!history) {
    throw new Error(`History entry ${params.historyId} not found`);
  }

  const now = new Date().toISOString();

  // Add completion notes if provided
  let sessionChanges = history.sessionChanges;
  if (params.completionNotes) {
    const completionNote: SessionNote = {
      content: params.completionNotes,
      type: 'tip',
      timestamp: now
    };
    sessionChanges = {
      ...sessionChanges,
      notes: [...sessionChanges.notes, completionNote]
    };
  }

  const updated: RecipeHistory = {
    ...history,
    completed: true,
    completedAt: now,
    rating: params.rating,
    wouldMakeAgain: params.wouldMakeAgain,
    sessionChanges,
    updatedAt: now
  };

  return updateItem(STORES.RECIPE_HISTORY, updated);
}

/**
 * Mark a session as abandoned (not completed)
 */
export async function abandonHistoryEntry(historyId: string): Promise<void> {
  const history = await getHistoryById(historyId);

  if (!history) {
    throw new Error(`History entry ${historyId} not found`);
  }

  const updated: RecipeHistory = {
    ...history,
    completed: false,
    updatedAt: new Date().toISOString()
  };

  await updateItem(STORES.RECIPE_HISTORY, updated);
}

// =============================================================================
// HISTORY ANALYTICS
// =============================================================================

/**
 * Get average rating for a recipe
 */
export async function getAverageRecipeRating(recipeId: string): Promise<number | null> {
  const histories = await getRecipeHistory(recipeId);
  const rated = histories.filter(h => h.rating !== undefined && h.rating !== null);

  if (rated.length === 0) {
    return null;
  }

  const sum = rated.reduce((acc, h) => acc + (h.rating || 0), 0);
  return sum / rated.length;
}

/**
 * Get completion rate for a recipe
 */
export async function getRecipeCompletionRate(recipeId: string): Promise<number> {
  const histories = await getRecipeHistory(recipeId);

  if (histories.length === 0) {
    return 0;
  }

  const completed = histories.filter(h => h.completed).length;
  return completed / histories.length;
}

/**
 * Get most common substitutions used for a recipe
 */
export async function getCommonSubstitutionsForRecipe(
  recipeId: string
): Promise<Array<{ originalId: string; substituteId: string; count: number }>> {
  const histories = await getRecipeHistory(recipeId);

  const substitutionMap = new Map<string, number>();

  histories.forEach(history => {
    history.sessionChanges.substitutions.forEach(sub => {
      const key = `${sub.originalIngredientId}:${sub.substituteIngredientId}`;
      substitutionMap.set(key, (substitutionMap.get(key) || 0) + 1);
    });
  });

  const result = Array.from(substitutionMap.entries()).map(([key, count]) => {
    const [originalId, substituteId] = key.split(':');
    return { originalId, substituteId, count };
  });

  return result.sort((a, b) => b.count - a.count);
}

/**
 * Get favorite recipes (highest rated and most cooked)
 */
export async function getFavoriteRecipes(
  limit: number = 10
): Promise<Array<{ recipeId: string; avgRating: number; timesMade: number }>> {
  const allHistory = await getAllItems<RecipeHistory>(STORES.RECIPE_HISTORY);

  const recipeMap = new Map<string, { ratings: number[]; count: number }>();

  allHistory.forEach(h => {
    if (!recipeMap.has(h.recipeId)) {
      recipeMap.set(h.recipeId, { ratings: [], count: 0 });
    }

    const data = recipeMap.get(h.recipeId)!;
    data.count++;
    if (h.rating) {
      data.ratings.push(h.rating);
    }
  });

  const favorites = Array.from(recipeMap.entries()).map(([recipeId, data]) => {
    const avgRating = data.ratings.length > 0
      ? data.ratings.reduce((a, b) => a + b, 0) / data.ratings.length
      : 0;

    return {
      recipeId,
      avgRating,
      timesMade: data.count
    };
  });

  // Sort by average rating * times made (weighted score)
  return favorites
    .sort((a, b) => (b.avgRating * b.timesMade) - (a.avgRating * a.timesMade))
    .slice(0, limit);
}

/**
 * Get total cooking time spent on recipes
 */
export async function getTotalCookingTime(): Promise<number> {
  const completed = await getCompletedHistory();

  let totalMinutes = 0;

  completed.forEach(h => {
    if (h.startedAt && h.completedAt) {
      const start = new Date(h.startedAt);
      const end = new Date(h.completedAt);
      const minutes = Math.round((end.getTime() - start.getTime()) / (1000 * 60));
      totalMinutes += minutes;
    }
  });

  return totalMinutes;
}

/**
 * Get cooking statistics summary
 */
export async function getCookingStatistics(): Promise<{
  totalRecipesCooked: number;
  totalCompletedSessions: number;
  averageRating: number;
  totalCookingTimeMinutes: number;
  mostCookedRecipeId: string | null;
  favoriteRecipeId: string | null;
}> {
  const allHistory = await getAllItems<RecipeHistory>(STORES.RECIPE_HISTORY);
  const completed = allHistory.filter(h => h.completed);

  // Total unique recipes
  const uniqueRecipes = new Set(allHistory.map(h => h.recipeId));

  // Average rating
  const rated = allHistory.filter(h => h.rating !== undefined && h.rating !== null);
  const avgRating = rated.length > 0
    ? rated.reduce((acc, h) => acc + (h.rating || 0), 0) / rated.length
    : 0;

  // Most cooked recipe
  const recipeCounts = new Map<string, number>();
  allHistory.forEach(h => {
    recipeCounts.set(h.recipeId, (recipeCounts.get(h.recipeId) || 0) + 1);
  });

  let mostCookedRecipeId: string | null = null;
  let maxCount = 0;
  recipeCounts.forEach((count, recipeId) => {
    if (count > maxCount) {
      maxCount = count;
      mostCookedRecipeId = recipeId;
    }
  });

  // Favorite recipe (highest avg rating)
  const favorites = await getFavoriteRecipes(1);
  const favoriteRecipeId = favorites.length > 0 ? favorites[0].recipeId : null;

  // Total cooking time
  const totalCookingTimeMinutes = await getTotalCookingTime();

  return {
    totalRecipesCooked: uniqueRecipes.size,
    totalCompletedSessions: completed.length,
    averageRating: Math.round(avgRating * 10) / 10,
    totalCookingTimeMinutes,
    mostCookedRecipeId,
    favoriteRecipeId
  };
}
