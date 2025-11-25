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

let ingredientsData: CatalogIngredient[] | null = null;

/**
 * Load ingredients from JSON file
 */
async function loadIngredientsFromJSON(): Promise<CatalogIngredient[]> {
  if (ingredientsData) {
    return ingredientsData;
  }

  try {
    // Fetch from public directory (accessible in production and development)
    const response = await fetch('/data/ingredients.json');
    if (!response.ok) {
      throw new Error('Failed to load ingredients.json');
    }

    const data = await response.json();
    ingredientsData = data.ingredients;
    return ingredientsData!;
  } catch (error) {
    console.error('Error loading ingredients:', error);
    // Fallback: try to import directly (for development)
    try {
      const module = await import('../data/ingredients.json');
      ingredientsData = module.ingredients as CatalogIngredient[];
      return ingredientsData!;
    } catch {
      return [];
    }
  }
}

/**
 * Initialize ingredients cache in IndexedDB
 */
export async function initializeIngredientsCache(): Promise<void> {
  const existingCount = await countItems(STORES.INGREDIENTS_CACHE);

  if (existingCount === 0) {
    const ingredients = await loadIngredientsFromJSON();
    await bulkAdd(STORES.INGREDIENTS_CACHE, ingredients);
    console.log(`Initialized ${ingredients.length} ingredients in cache`);
  }
}

/**
 * Force refresh the ingredients cache
 */
export async function refreshIngredientsCache(): Promise<number> {
  await clearStore(STORES.INGREDIENTS_CACHE);
  ingredientsData = null;

  const ingredients = await loadIngredientsFromJSON();
  await bulkAdd(STORES.INGREDIENTS_CACHE, ingredients);
  return ingredients.length;
}

// =============================================================================
// QUERY OPERATIONS
// =============================================================================

/**
 * Get all ingredients from cache or JSON
 */
export async function getAllIngredients(): Promise<CatalogIngredient[]> {
  // Try cache first
  const cached = await getAllItems<CatalogIngredient>(STORES.INGREDIENTS_CACHE);
  if (cached.length > 0) {
    return cached;
  }

  // Fallback to JSON and initialize cache
  await initializeIngredientsCache();
  return getAllItems<CatalogIngredient>(STORES.INGREDIENTS_CACHE);
}

/**
 * Get a single ingredient by ID
 */
export async function getIngredientById(id: string): Promise<CatalogIngredient | null> {
  // Try cache first
  const cached = await getItem<CatalogIngredient>(STORES.INGREDIENTS_CACHE, id);
  if (cached) {
    return cached;
  }

  // Fallback to JSON search
  const all = await loadIngredientsFromJSON();
  return all.find(ing => ing.id === id) || null;
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
 * Export all ingredients to JSON string (with metadata and IDs)
 */
export async function exportIngredientsToJSON(): Promise<string> {
  const ingredients = await getAllIngredients();
  return JSON.stringify({
    metadata: {
      version: '1.0.0',
      lastUpdated: new Date().toISOString(),
      itemCount: ingredients.length,
    },
    ingredients,
  }, null, 2);
}

/**
 * Clean ingredient object for export (removes IDs and internal fields)
 */
function cleanIngredientForExport(ingredient: CatalogIngredient): Omit<CatalogIngredient, 'id' | 'compatibleWith' | 'substitutes'> & { compatibleWith?: string[]; substitutes?: string[] } {
  const { id, compatibleWith, substitutes, ...rest } = ingredient;
  return {
    ...rest,
    // Only include these if they have values and we want to keep references
    ...(compatibleWith?.length ? { compatibleWith } : {}),
    ...(substitutes?.length ? { substitutes } : {}),
  };
}

/**
 * Export all ingredients to JSON string with IDs preserved
 * IMPORTANT: IDs are included to maintain recipe references
 */
export async function exportIngredientsClean(): Promise<string> {
  const ingredients = await getAllIngredients();

  // IMPORTANT: Preserve IDs to maintain references in recipes
  // Do NOT remove IDs as recipes depend on them
  return JSON.stringify({
    version: '1.0.0',
    exportDate: new Date().toISOString().split('T')[0],
    count: ingredients.length,
    ingredients: ingredients,
  }, null, 2);
}

/**
 * Validate ingredient data structure
 * Note: ID is optional during validation - will be preserved if present or generated if missing
 */
function validateIngredient(data: unknown): data is Partial<CatalogIngredient> {
  if (!data || typeof data !== 'object') return false;
  const ing = data as Record<string, unknown>;

  // Required fields (ID is optional - will be handled during import)
  const requiredFields = ['name', 'normalizedName', 'category', 'subcategory', 'defaultUnit'];
  for (const field of requiredFields) {
    if (typeof ing[field] !== 'string') return false;
  }

  // Required arrays
  const requiredArrays = ['synonyms', 'alternativeUnits'];
  for (const field of requiredArrays) {
    if (!Array.isArray(ing[field])) return false;
  }

  // Required objects
  if (!ing.nutrition || typeof ing.nutrition !== 'object') return false;
  if (!ing.storage || typeof ing.storage !== 'object') return false;

  return true;
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
  const errors: string[] = [];

  try {
    const parsed = JSON.parse(jsonData);

    // Handle both direct array and object with ingredients property
    let ingredientsArray: unknown[];
    if (Array.isArray(parsed)) {
      ingredientsArray = parsed;
    } else if (parsed.ingredients && Array.isArray(parsed.ingredients)) {
      ingredientsArray = parsed.ingredients;
    } else {
      throw new Error('El JSON debe contener un array de ingredientes o un objeto con propiedad "ingredients"');
    }

    if (ingredientsArray.length === 0) {
      throw new Error('El array de ingredientes está vacío');
    }

    // Validate and prepare ingredients
    const validIngredients: CatalogIngredient[] = [];
    let idCounter = 1;

    for (let i = 0; i < ingredientsArray.length; i++) {
      const rawIng = ingredientsArray[i];

      if (!validateIngredient(rawIng)) {
        errors.push(`Ingrediente ${i + 1}: formato inválido`);
        continue;
      }

      const rawIngCast = rawIng as Partial<CatalogIngredient>;

      // IMPORTANT: Preserve existing ID if present (for recipe references)
      // Only generate new ID if missing (for backwards compatibility)
      const ingredient: CatalogIngredient = {
        id: rawIngCast.id || `ing_${String(idCounter++).padStart(3, '0')}`,
        name: rawIngCast.name!,
        normalizedName: rawIngCast.normalizedName!,
        category: rawIngCast.category!,
        subcategory: rawIngCast.subcategory!,
        synonyms: rawIngCast.synonyms || [],
        defaultUnit: rawIngCast.defaultUnit!,
        alternativeUnits: rawIngCast.alternativeUnits || [],
        nutrition: rawIngCast.nutrition!,
        storage: rawIngCast.storage!,
        compatibleWith: rawIngCast.compatibleWith || [],
        substitutes: rawIngCast.substitutes || [],
        isCommon: rawIngCast.isCommon ?? false,
        imageUrl: rawIngCast.imageUrl,
      };

      validIngredients.push(ingredient);
    }

    if (validIngredients.length === 0) {
      throw new Error('No se encontraron ingredientes válidos para importar');
    }

    // Clear existing if requested
    if (clearExisting) {
      await clearStore(STORES.INGREDIENTS_CACHE);
      ingredientsData = null;
    }

    // Bulk add to cache
    const successCount = await bulkAdd(STORES.INGREDIENTS_CACHE, validIngredients);

    return { success: successCount, errors };

  } catch (error) {
    if (error instanceof SyntaxError) {
      errors.push('El archivo no es un JSON válido');
    } else {
      errors.push(error instanceof Error ? error.message : 'Error desconocido');
    }
    return { success: 0, errors };
  }
}
