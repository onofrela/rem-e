/**
 * Ingredient Service
 *
 * Handles all operations related to ingredients:
 * - Loading ingredients from JSON
 * - Caching in IndexedDB
 * - Searching and filtering
 * - Normalization and synonyms
 */

import type {
  CatalogIngredient,
  IngredientCategory,
  SearchIngredientsParams
} from '../schemas/types';
import {
  STORES,
  getAllItems,
  getItem,
  bulkAdd,
  clearStore,
  searchIngredientsByName as searchInCache,
  getIngredientsByCategory as getByCategory,
  getCommonIngredients as getCommon,
  countItems
} from '../stores/database';
import { normalizeName, findSimilarIngredients } from '../normalizer';
import { areSynonyms } from '../synonyms';

// =============================================================================
// DATA LOADING
// =============================================================================

/**
 * IMPORTANT: This service uses ONLY IndexedDB as the source of truth.
 * There are NO JSON fallbacks. All data must be in IndexedDB.
 * Use import/export functions to manage ingredients data.
 */

/**
 * Initialize ingredients cache in IndexedDB
 * Note: This only checks if the store exists. Data must be imported separately.
 */
export async function initializeIngredientsCache(): Promise<void> {
  const existingCount = await countItems(STORES.INGREDIENTS_CACHE);

  if (existingCount === 0) {
    console.warn('⚠️ No ingredients found in IndexedDB. Please import ingredients data.');
  } else {
    console.log(`Found ${existingCount} ingredients in IndexedDB`);
  }
}

/**
 * Clear all ingredients from IndexedDB
 * WARNING: This will DELETE ALL INGREDIENTS!
 * Only use this when resetting the database or before importing new data.
 */
export async function clearAllIngredients(): Promise<void> {
  await clearStore(STORES.INGREDIENTS_CACHE);
  console.warn('⚠️ All ingredients have been cleared from IndexedDB.');
}

/**
 * @deprecated This function has been removed. IndexedDB is the only source of truth.
 * To reset ingredients, export your current data first, then use clearAllIngredients() and importIngredientsFromJSON().
 */
export async function resetIngredientsToDefaults(): Promise<number> {
  throw new Error('resetIngredientsToDefaults() has been removed. Use clearAllIngredients() and importIngredientsFromJSON() instead.');
}

/**
 * @deprecated This function has been removed. IndexedDB is the only source of truth.
 */
export async function refreshIngredientsCache(): Promise<number> {
  throw new Error('refreshIngredientsCache() has been removed. IndexedDB is the only source of truth.');
}

// =============================================================================
// QUERY OPERATIONS
// =============================================================================

/**
 * Get all ingredients from IndexedDB
 * IMPORTANT: This only reads from IndexedDB. No JSON fallback.
 */
export async function getAllIngredients(): Promise<CatalogIngredient[]> {
  return getAllItems<CatalogIngredient>(STORES.INGREDIENTS_CACHE);
}

/**
 * Get a single ingredient by ID
 */
export async function getIngredientById(id: string): Promise<CatalogIngredient | null> {
  // Get from IndexedDB - the single source of truth
  const cached = await getItem<CatalogIngredient>(STORES.INGREDIENTS_CACHE, id);
  if (cached) {
    return cached;
  }

  // If not in cache, it doesn't exist (cache should always be initialized)
  return null;
}

/**
 * Get multiple ingredients by IDs
 */
export async function getIngredientsByIds(ids: string[]): Promise<CatalogIngredient[]> {
  const all = await getAllIngredients();
  return all.filter(ing => ids.includes(ing.id));
}

/**
 * Search ingredients with various filters
 */
export async function searchIngredients(
  params: SearchIngredientsParams
): Promise<CatalogIngredient[]> {
  const { query, category, limit = 20 } = params;

  let results: CatalogIngredient[];

  // If category filter, start with that
  if (category) {
    results = await getByCategory(category);
  } else {
    results = await getAllIngredients();
  }

  // Apply text search
  if (query && query.trim()) {
    const normalizedQuery = normalizeName(query);
    const lowerQuery = query.toLowerCase();

    results = results.filter(ing => {
      // Direct match on name
      if (ing.name.toLowerCase().includes(lowerQuery)) return true;

      // Match on normalized name
      if (ing.normalizedName.includes(normalizedQuery)) return true;

      // Match on synonyms
      if (ing.synonyms.some(syn => syn.toLowerCase().includes(lowerQuery))) return true;

      // Check for synonym equivalence
      if (areSynonyms(query, ing.normalizedName)) return true;

      return false;
    });

    // Sort by relevance (exact matches first)
    results.sort((a, b) => {
      const aExact = a.name.toLowerCase() === lowerQuery || a.normalizedName === normalizedQuery;
      const bExact = b.name.toLowerCase() === lowerQuery || b.normalizedName === normalizedQuery;
      if (aExact && !bExact) return -1;
      if (!aExact && bExact) return 1;
      return 0;
    });
  }

  // Apply limit
  return results.slice(0, limit);
}

/**
 * Fuzzy search for ingredients
 */
export async function fuzzySearchIngredients(query: string): Promise<CatalogIngredient[]> {
  const all = await getAllIngredients();
  const lowerQuery = query.toLowerCase();

  return all.filter(ing =>
    ing.normalizedName.includes(lowerQuery) ||
    ing.name.toLowerCase().includes(lowerQuery) ||
    ing.synonyms.some(syn => syn.toLowerCase().includes(lowerQuery))
  );
}

/**
 * Get ingredients by category
 */
export async function getIngredientsByCategory(
  category: IngredientCategory
): Promise<CatalogIngredient[]> {
  return getByCategory(category);
}

/**
 * Get all common/frequently used ingredients
 */
export async function getCommonIngredients(): Promise<CatalogIngredient[]> {
  return getCommon();
}

/**
 * Get all available categories
 */
export async function getCategories(): Promise<IngredientCategory[]> {
  const all = await getAllIngredients();
  const categories = new Set(all.map(ing => ing.category));
  return Array.from(categories) as IngredientCategory[];
}

// =============================================================================
// SUBSTITUTES AND COMPATIBILITY
// =============================================================================

/**
 * Get substitute ingredients for a given ingredient
 */
export async function getSubstitutes(ingredientId: string): Promise<CatalogIngredient[]> {
  const ingredient = await getIngredientById(ingredientId);
  if (!ingredient || !ingredient.substitutes.length) {
    return [];
  }

  return getIngredientsByIds(ingredient.substitutes);
}

/**
 * Get ingredients that are compatible with a given ingredient
 */
export async function getCompatibleIngredients(ingredientId: string): Promise<CatalogIngredient[]> {
  const ingredient = await getIngredientById(ingredientId);
  if (!ingredient || !ingredient.compatibleWith.length) {
    return [];
  }

  return getIngredientsByIds(ingredient.compatibleWith);
}

// =============================================================================
// NORMALIZATION HELPERS
// =============================================================================

/**
 * Find an ingredient by any of its names (including synonyms)
 */
export async function findIngredientByName(name: string): Promise<CatalogIngredient | null> {
  const normalized = normalizeName(name);
  const all = await getAllIngredients();

  // Exact match on normalized name
  const exactMatch = all.find(ing => ing.normalizedName === normalized);
  if (exactMatch) return exactMatch;

  // Match on synonyms
  const synonymMatch = all.find(ing =>
    ing.synonyms.some(syn => normalizeName(syn) === normalized)
  );
  if (synonymMatch) return synonymMatch;

  // Partial match on name
  const partialMatch = all.find(ing =>
    ing.name.toLowerCase().includes(name.toLowerCase()) ||
    name.toLowerCase().includes(ing.name.toLowerCase())
  );

  return partialMatch || null;
}

/**
 * Check if two ingredient names refer to the same ingredient
 */
export async function areIngredientsSame(name1: string, name2: string): Promise<boolean> {
  const ing1 = await findIngredientByName(name1);
  const ing2 = await findIngredientByName(name2);

  if (ing1 && ing2) {
    return ing1.id === ing2.id;
  }

  // Fallback to synonym check
  return areSynonyms(name1, name2);
}

// =============================================================================
// NUTRITION HELPERS
// =============================================================================

/**
 * Calculate calories for a specific amount of an ingredient
 */
export function calculateCalories(
  ingredient: CatalogIngredient,
  amount: number,
  unit: string
): number {
  // Base calculation assumes the default unit matches
  // For simplicity, we assume amounts are already in grams or ml
  const baseCalories = ingredient.nutrition.calories;
  const basePer = ingredient.nutrition.per; // Usually 100

  // If unit is not grams/ml, we'd need conversion tables
  // For now, assume direct proportional calculation
  return (amount / basePer) * baseCalories;
}

/**
 * Get full nutrition info for a specific amount
 */
export function calculateNutrition(
  ingredient: CatalogIngredient,
  amount: number
): {
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  fiber: number;
} {
  const ratio = amount / ingredient.nutrition.per;

  return {
    calories: Math.round(ingredient.nutrition.calories * ratio),
    protein: Math.round(ingredient.nutrition.protein * ratio * 10) / 10,
    carbs: Math.round(ingredient.nutrition.carbs * ratio * 10) / 10,
    fat: Math.round(ingredient.nutrition.fat * ratio * 10) / 10,
    fiber: Math.round(ingredient.nutrition.fiber * ratio * 10) / 10,
  };
}

// =============================================================================
// EXPORT / IMPORT
// =============================================================================

/**
 * IMPORTANT: Import/Export functionality has been moved to RemEDatabase class.
 * These functions now delegate to the centralized database manager.
 * DO NOT add new import/export logic here - use RemEDatabase instead.
 */

import { db } from '../RemEDatabase';

/**
 * Export all ingredients to JSON string (with metadata and IDs)
 * @deprecated Use db.exportIngredients() instead
 */
export async function exportIngredientsToJSON(): Promise<string> {
  return db.exportIngredients();
}

/**
 * Export all ingredients to JSON string with IDs preserved
 * IMPORTANT: IDs are included to maintain recipe references
 */
export async function exportIngredientsClean(): Promise<string> {
  return db.exportIngredients();
}

/**
 * Import ingredients from JSON string
 * @param jsonData - JSON string with ingredients array or object with ingredients property
 * @param clearExisting - If true, clears existing ingredients before import
 * @returns Object with success count and any errors
 */
export async function importIngredientsFromJSON(
  jsonData: string,
  clearExisting: boolean = true
): Promise<{ success: number; errors: string[] }> {
  return db.importIngredients(jsonData, clearExisting);
}

