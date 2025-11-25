/**
 * Ingredient Substitution Service
 *
 * Handles intelligent ingredient substitutions with contextual analysis:
 * - Get substitution suggestions based on recipe context
 * - Analyze impact of substitutions
 * - Track user preferences and learning
 * - Calculate substitution ratios and adjustments
 */

import type {
  IngredientSubstitution,
  UserSubstitutionPreference,
  CatalogIngredient,
  Recipe,
  SuggestSubstitutionParams
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
// INGREDIENT SUBSTITUTION OPERATIONS
// =============================================================================

/**
 * Get all substitutions for an ingredient
 */
export async function getSubstitutionsForIngredient(
  ingredientId: string
): Promise<IngredientSubstitution[]> {
  return getByIndex<IngredientSubstitution>(
    STORES.INGREDIENT_SUBSTITUTIONS,
    'originalIngredientId',
    ingredientId
  );
}

/**
 * Get specific substitution between two ingredients
 */
export async function getSubstitution(
  originalId: string,
  substituteId: string
): Promise<IngredientSubstitution | null> {
  const allSubs = await getByIndex<IngredientSubstitution>(
    STORES.INGREDIENT_SUBSTITUTIONS,
    'substitutionPair',
    [originalId, substituteId]
  );

  return allSubs.length > 0 ? allSubs[0] : null;
}

/**
 * Get contextual substitution suggestions
 * Filters substitutions based on recipe type, cuisine, and cooking method
 */
export async function getContextualSubstitutions(
  ingredientId: string,
  recipeContext?: {
    recipeType?: string;
    cuisine?: string;
    cookingMethod?: string;
  }
): Promise<IngredientSubstitution[]> {
  const allSubs = await getSubstitutionsForIngredient(ingredientId);

  if (!recipeContext) {
    return allSubs.sort((a, b) => b.confidence - a.confidence);
  }

  // Filter by context
  const contextualSubs = allSubs.filter(sub => {
    const factors = sub.contextualFactors;

    // Check if the substitution is relevant for this context
    if (recipeContext.recipeType &&
        factors.recipeTypes.length > 0 &&
        !factors.recipeTypes.includes(recipeContext.recipeType)) {
      return false;
    }

    if (recipeContext.cuisine &&
        factors.cuisines.length > 0 &&
        !factors.cuisines.includes(recipeContext.cuisine)) {
      return false;
    }

    if (recipeContext.cookingMethod &&
        factors.cookingMethods.length > 0 &&
        !factors.cookingMethods.includes(recipeContext.cookingMethod)) {
      return false;
    }

    return true;
  });

  return contextualSubs.sort((a, b) => b.confidence - a.confidence);
}

/**
 * Add a new substitution to the database
 */
export async function addSubstitution(
  substitution: Omit<IngredientSubstitution, 'id' | 'createdAt' | 'updatedAt'>
): Promise<IngredientSubstitution> {
  const now = new Date().toISOString();
  const newSubstitution: IngredientSubstitution = {
    id: generateId('sub'),
    ...substitution,
    createdAt: now,
    updatedAt: now
  };

  return addItem(STORES.INGREDIENT_SUBSTITUTIONS, newSubstitution);
}

/**
 * Update an existing substitution
 */
export async function updateSubstitution(
  id: string,
  updates: Partial<Omit<IngredientSubstitution, 'id' | 'createdAt' | 'updatedAt'>>
): Promise<IngredientSubstitution> {
  const existing = await getItem<IngredientSubstitution>(STORES.INGREDIENT_SUBSTITUTIONS, id);

  if (!existing) {
    throw new Error(`Substitution ${id} not found`);
  }

  const updated: IngredientSubstitution = {
    ...existing,
    ...updates,
    updatedAt: new Date().toISOString()
  };

  return updateItem(STORES.INGREDIENT_SUBSTITUTIONS, updated);
}

/**
 * Delete a substitution
 */
export async function deleteSubstitution(id: string): Promise<void> {
  return deleteItem(STORES.INGREDIENT_SUBSTITUTIONS, id);
}

// =============================================================================
// USER SUBSTITUTION PREFERENCES
// =============================================================================

/**
 * Get user preferences for an ingredient
 */
export async function getUserPreferredSubstitutes(
  ingredientId: string
): Promise<UserSubstitutionPreference[]> {
  const prefs = await getByIndex<UserSubstitutionPreference>(
    STORES.USER_SUBSTITUTION_PREFS,
    'originalIngredientId',
    ingredientId
  );

  // Sort by usage frequency and success rate
  return prefs.sort((a, b) => {
    const scoreA = a.timesUsed * a.successRate;
    const scoreB = b.timesUsed * b.successRate;
    return scoreB - scoreA;
  });
}

/**
 * Get specific user preference
 */
export async function getUserPreference(
  originalId: string,
  substituteId: string
): Promise<UserSubstitutionPreference | null> {
  const prefs = await getByIndex<UserSubstitutionPreference>(
    STORES.USER_SUBSTITUTION_PREFS,
    'originalIngredientId',
    originalId
  );

  const pref = prefs.find(p => p.preferredSubstituteId === substituteId);
  return pref || null;
}

/**
 * Record a substitution usage (automatic learning)
 */
export async function recordSubstitutionUsage(
  originalId: string,
  substituteId: string,
  context: string[],
  successful: boolean = true,
  notes?: string
): Promise<UserSubstitutionPreference> {
  const existing = await getUserPreference(originalId, substituteId);

  if (existing) {
    // Update existing preference
    const newTimesUsed = existing.timesUsed + 1;
    const newSuccessRate =
      ((existing.successRate * existing.timesUsed) + (successful ? 1 : 0)) / newTimesUsed;

    // Merge contexts (unique values)
    const mergedContexts = Array.from(new Set([...existing.contexts, ...context]));

    const updated: UserSubstitutionPreference = {
      ...existing,
      timesUsed: newTimesUsed,
      successRate: newSuccessRate,
      lastUsedAt: new Date().toISOString(),
      contexts: mergedContexts,
      notes: notes || existing.notes,
      updatedAt: new Date().toISOString()
    };

    return updateItem(STORES.USER_SUBSTITUTION_PREFS, updated);
  } else {
    // Create new preference
    const now = new Date().toISOString();
    const newPref: UserSubstitutionPreference = {
      id: generateId('usub'),
      originalIngredientId: originalId,
      preferredSubstituteId: substituteId,
      timesUsed: 1,
      successRate: successful ? 1 : 0,
      lastUsedAt: now,
      contexts: context,
      notes,
      createdAt: now,
      updatedAt: now
    };

    return addItem(STORES.USER_SUBSTITUTION_PREFS, newPref);
  }
}

/**
 * Delete a user preference
 */
export async function deleteUserPreference(id: string): Promise<void> {
  return deleteItem(STORES.USER_SUBSTITUTION_PREFS, id);
}

/**
 * Get all user substitution preferences
 */
export async function getAllUserPreferences(): Promise<UserSubstitutionPreference[]> {
  return getAllItems<UserSubstitutionPreference>(STORES.USER_SUBSTITUTION_PREFS);
}

/**
 * Get most frequently used substitutions (for learning insights)
 */
export async function getMostFrequentSubstitutions(
  limit: number = 10
): Promise<UserSubstitutionPreference[]> {
  const prefs = await getAllUserPreferences();
  return prefs
    .sort((a, b) => b.timesUsed - a.timesUsed)
    .slice(0, limit);
}

// =============================================================================
// INTELLIGENT SUBSTITUTION ANALYSIS
// =============================================================================

/**
 * Analyze the impact of a substitution on a specific recipe
 */
export function analyzeSubstitutionImpact(
  substitution: IngredientSubstitution,
  recipe?: Recipe
): {
  ratio: number;
  impact: string[];
  adjustments: string[];
  confidence: number;
} {
  const impacts: string[] = [];
  const adjustments: string[] = [];

  // Compile impact descriptions
  if (substitution.impact.taste) {
    impacts.push(`Sabor: ${substitution.impact.taste}`);
  }
  if (substitution.impact.texture) {
    impacts.push(`Textura: ${substitution.impact.texture}`);
  }
  if (substitution.impact.color) {
    impacts.push(`Color: ${substitution.impact.color}`);
  }
  if (substitution.impact.nutritional) {
    impacts.push(`Nutrición: ${substitution.impact.nutritional}`);
  }

  // Compile adjustment recommendations
  if (substitution.requiresAdjustments) {
    if (substitution.requiresAdjustments.otherIngredients) {
      substitution.requiresAdjustments.otherIngredients.forEach(adj => {
        adjustments.push(adj.adjustment);
      });
    }

    if (substitution.requiresAdjustments.steps) {
      substitution.requiresAdjustments.steps.forEach(adj => {
        adjustments.push(adj.suggestion);
      });
    }

    if (substitution.requiresAdjustments.timing) {
      const { adjustment, reason } = substitution.requiresAdjustments.timing;
      const sign = adjustment > 0 ? '+' : '';
      adjustments.push(`Ajusta el tiempo de cocción: ${sign}${adjustment} minutos (${reason})`);
    }
  }

  return {
    ratio: substitution.ratio,
    impact: impacts,
    adjustments,
    confidence: substitution.confidence
  };
}

/**
 * Get best substitute recommendation for an ingredient
 * Takes into account both catalog substitutions and user preferences
 */
export async function getBestSubstitute(
  ingredientId: string,
  recipeContext?: {
    recipeType?: string;
    cuisine?: string;
    cookingMethod?: string;
  }
): Promise<{
  substitution: IngredientSubstitution | null;
  userPreferred: boolean;
  analysis: ReturnType<typeof analyzeSubstitutionImpact> | null;
}> {
  // First check user preferences
  const userPrefs = await getUserPreferredSubstitutes(ingredientId);
  if (userPrefs.length > 0) {
    const bestPref = userPrefs[0];
    const substitution = await getSubstitution(ingredientId, bestPref.preferredSubstituteId);

    if (substitution) {
      return {
        substitution,
        userPreferred: true,
        analysis: analyzeSubstitutionImpact(substitution)
      };
    }
  }

  // Fall back to contextual substitutions
  const contextualSubs = await getContextualSubstitutions(ingredientId, recipeContext);

  if (contextualSubs.length === 0) {
    return {
      substitution: null,
      userPreferred: false,
      analysis: null
    };
  }

  const bestSub = contextualSubs[0];

  return {
    substitution: bestSub,
    userPreferred: false,
    analysis: analyzeSubstitutionImpact(bestSub)
  };
}

/**
 * Calculate the exact amount needed when substituting
 */
export function calculateSubstitutionAmount(
  originalAmount: number,
  originalUnit: string,
  ratio: number
): {
  amount: number;
  unit: string;
  displayText: string;
} {
  const newAmount = originalAmount * ratio;

  // Round to 2 decimal places
  const roundedAmount = Math.round(newAmount * 100) / 100;

  // Format display text
  let displayText = '';
  if (ratio === 1) {
    displayText = `Usa la misma cantidad: ${roundedAmount} ${originalUnit}`;
  } else if (ratio < 1) {
    displayText = `Usa menos: ${roundedAmount} ${originalUnit} (${Math.round(ratio * 100)}% del original)`;
  } else {
    displayText = `Usa más: ${roundedAmount} ${originalUnit} (${Math.round(ratio * 100)}% del original)`;
  }

  return {
    amount: roundedAmount,
    unit: originalUnit,
    displayText
  };
}
