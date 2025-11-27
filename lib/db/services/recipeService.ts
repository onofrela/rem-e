/**
 * Recipe Service
 *
 * Handles all operations related to recipes:
 * - Loading recipes from JSON
 * - Caching in IndexedDB
 * - Searching and filtering
 * - Matching recipes to available ingredients
 * - Calculating nutrition and portions
 */

import type {
  Recipe,
  RecipeCategory,
  RecipeDifficulty,
  RecipeSearchResult,
  GetRecipesByIngredientsParams,
  CalculatePortionsParams,
  PortionCalculationResult,
  ScaledIngredient,
  NutritionPerServing
} from '../schemas/types';
import {
  STORES,
  getAllItems,
  getItem,
  bulkAdd,
  clearStore,
  searchRecipes as searchInCache,
  getRecipesByCategory as getByCategory,
  getRecipesByDifficulty as getByDifficulty,
  countItems
} from '../stores/database';
import { getIngredientById, getIngredientsByIds } from './ingredientService';

// =============================================================================
// DATA LOADING
// =============================================================================

/**
 * IMPORTANT: This service uses ONLY IndexedDB as the source of truth.
 * There are NO JSON fallbacks. All data must be in IndexedDB.
 * Use import/export functions to manage recipes data.
 */

/**
 * Initialize recipes cache in IndexedDB
 * Note: This only checks if the store exists. Data must be imported separately.
 */
export async function initializeRecipesCache(): Promise<void> {
  const existingCount = await countItems(STORES.RECIPES_CACHE);

  if (existingCount === 0) {
    console.warn('⚠️ No recipes found in IndexedDB. Please import recipes data.');
  } else {
    console.log(`Found ${existingCount} recipes in IndexedDB`);
  }
}

/**
 * Clear all recipes from IndexedDB
 * WARNING: This will DELETE ALL RECIPES!
 * Only use this when resetting the database or before importing new data.
 */
export async function clearAllRecipes(): Promise<void> {
  await clearStore(STORES.RECIPES_CACHE);
  console.warn('⚠️ All recipes have been cleared from IndexedDB.');
}

/**
 * @deprecated This function has been removed. IndexedDB is the only source of truth.
 * To reset recipes, export your current data first, then use clearAllRecipes() and importRecipesFromJSON().
 */
export async function resetRecipesToDefaults(): Promise<number> {
  throw new Error('resetRecipesToDefaults() has been removed. Use clearAllRecipes() and importRecipesFromJSON() instead.');
}

/**
 * @deprecated This function has been removed. IndexedDB is the only source of truth.
 */
export async function refreshRecipesCache(): Promise<number> {
  throw new Error('refreshRecipesCache() has been removed. IndexedDB is the only source of truth.');
}

// =============================================================================
// QUERY OPERATIONS
// =============================================================================

/**
 * Get all recipes from IndexedDB
 * IMPORTANT: This only reads from IndexedDB. No JSON fallback.
 */
export async function getAllRecipes(): Promise<Recipe[]> {
  return getAllItems<Recipe>(STORES.RECIPES_CACHE);
}

/**
 * Get a single recipe by ID
 */
export async function getRecipeById(id: string): Promise<Recipe | null> {
  // Get from IndexedDB - the single source of truth
  const cached = await getItem<Recipe>(STORES.RECIPES_CACHE, id);
  if (cached) {
    return cached;
  }

  // If not in cache, it doesn't exist (cache should always be initialized)
  return null;
}

/**
 * Search recipes by text (name, description, tags)
 */
/**
 * Calculate similarity score between two strings (0-1)
 * Uses word overlap and partial matching
 */
function calculateSimilarity(str1: string, str2: string): number {
  const words1 = str1.toLowerCase().split(/\s+/);
  const words2 = str2.toLowerCase().split(/\s+/);

  let matchScore = 0;

  // Exact word matches
  for (const word1 of words1) {
    for (const word2 of words2) {
      if (word1 === word2) {
        matchScore += 2; // Full word match
      } else if (word1.includes(word2) || word2.includes(word1)) {
        matchScore += 1; // Partial match
      }
    }
  }

  // Normalize by total words
  const maxPossibleScore = words1.length * words2.length * 2;
  return maxPossibleScore > 0 ? matchScore / maxPossibleScore : 0;
}

export async function searchRecipes(query: string): Promise<Recipe[]> {
  const all = await getAllRecipes();
  const lowerQuery = query.toLowerCase().trim();

  // Remove common filler words
  const queryWords = lowerQuery
    .replace(/\b(de|la|el|del|para|con|y|a)\b/g, '')
    .trim();

  // Score each recipe
  const scored = all.map(recipe => {
    const lowerName = recipe.name.toLowerCase();
    const lowerDesc = recipe.description.toLowerCase();
    const lowerTags = recipe.tags.map(t => t.toLowerCase()).join(' ');

    let score = 0;

    // Exact name match (highest priority)
    if (lowerName === lowerQuery || lowerName === queryWords) {
      score += 100;
    }

    // Name contains query
    if (lowerName.includes(lowerQuery) || lowerName.includes(queryWords)) {
      score += 50;
    }

    // Similarity score on name
    score += calculateSimilarity(lowerName, queryWords) * 30;

    // Description contains query
    if (lowerDesc.includes(lowerQuery) || lowerDesc.includes(queryWords)) {
      score += 20;
    }

    // Tags match
    if (lowerTags.includes(lowerQuery) || lowerTags.includes(queryWords)) {
      score += 15;
    }

    // Cuisine match
    if (recipe.cuisine?.toLowerCase().includes(lowerQuery)) {
      score += 10;
    }

    return { recipe, score };
  });

  // Filter out very low scores and sort by score
  return scored
    .filter(item => item.score > 5)
    .sort((a, b) => b.score - a.score)
    .map(item => item.recipe);
}

/**
 * Get recipes by category
 */
export async function getRecipesByCategory(category: RecipeCategory): Promise<Recipe[]> {
  return getByCategory(category);
}

/**
 * Get recipes by difficulty
 */
export async function getRecipesByDifficulty(difficulty: RecipeDifficulty): Promise<Recipe[]> {
  return getByDifficulty(difficulty);
}

/**
 * Get recipes within a time limit
 */
export async function getRecipesByTime(maxMinutes: number): Promise<Recipe[]> {
  const all = await getAllRecipes();
  return all.filter(recipe => recipe.time <= maxMinutes);
}

/**
 * Get all available categories
 */
export async function getRecipeCategories(): Promise<RecipeCategory[]> {
  const all = await getAllRecipes();
  const categories = new Set(all.map(recipe => recipe.category));
  return Array.from(categories) as RecipeCategory[];
}

/**
 * Get all available cuisines
 */
export async function getCuisines(): Promise<string[]> {
  const all = await getAllRecipes();
  const cuisines = new Set(all.map(recipe => recipe.cuisine).filter(Boolean));
  return Array.from(cuisines) as string[];
}

// =============================================================================
// INGREDIENT MATCHING
// =============================================================================

/**
 * Find recipes that can be made with available ingredients
 */
export async function getRecipesByIngredients(
  params: GetRecipesByIngredientsParams
): Promise<RecipeSearchResult[]> {
  const {
    ingredientIds,
    maxMissingIngredients = 3,
    maxTime,
    difficulty
  } = params;

  let recipes = await getAllRecipes();

  // Apply filters
  if (maxTime) {
    recipes = recipes.filter(r => r.time <= maxTime);
  }
  if (difficulty) {
    recipes = recipes.filter(r => r.difficulty === difficulty);
  }

  const results: RecipeSearchResult[] = [];

  for (const recipe of recipes) {
    // Get required (non-optional) ingredients
    const requiredIngredients = recipe.ingredients
      .filter(ing => !ing.optional)
      .map(ing => ing.ingredientId);

    // Calculate matches
    const matchedIngredients = requiredIngredients.filter(id =>
      ingredientIds.includes(id)
    );
    const missingIngredients = requiredIngredients.filter(id =>
      !ingredientIds.includes(id)
    );

    // Skip if too many missing ingredients
    if (missingIngredients.length > maxMissingIngredients) {
      continue;
    }

    // Calculate match score (percentage of required ingredients available)
    const matchScore = requiredIngredients.length > 0
      ? matchedIngredients.length / requiredIngredients.length
      : 0;

    results.push({
      recipe,
      matchScore,
      matchedIngredients,
      missingIngredients,
    });
  }

  // Sort by match score (highest first)
  results.sort((a, b) => b.matchScore - a.matchScore);

  return results;
}

/**
 * Get recipes that use a specific ingredient
 */
export async function getRecipesWithIngredient(ingredientId: string): Promise<Recipe[]> {
  const all = await getAllRecipes();

  return all.filter(recipe =>
    recipe.ingredients.some(ing => ing.ingredientId === ingredientId)
  );
}

/**
 * Get ingredient IDs used in a recipe
 */
export function getRecipeIngredientIds(recipe: Recipe): string[] {
  return recipe.ingredients.map(ing => ing.ingredientId);
}

/**
 * Get ingredients for a specific step
 */
export async function getIngredientsForStep(
  recipe: Recipe,
  stepNumber: number
): Promise<{ id: string; name: string }[]> {
  const step = recipe.steps.find(s => s.step === stepNumber);
  if (!step) return [];

  const ingredients = await getIngredientsByIds(step.ingredientsUsed);
  return ingredients.map(ing => ({ id: ing.id, name: ing.name }));
}

// =============================================================================
// PORTION CALCULATION
// =============================================================================

/**
 * Calculate scaled ingredient amounts for a target serving size
 */
export async function calculatePortions(
  params: CalculatePortionsParams
): Promise<PortionCalculationResult | null> {
  const { recipeId, targetServings } = params;

  const recipe = await getRecipeById(recipeId);
  if (!recipe) return null;

  // Check if scalable and within limits
  if (!recipe.scaling.scalable) {
    return null;
  }
  if (targetServings < recipe.scaling.minServings ||
      targetServings > recipe.scaling.maxServings) {
    return null;
  }

  const scaleFactor = targetServings / recipe.scaling.baseServings;

  // Scale ingredients
  const scaledIngredients: ScaledIngredient[] = recipe.ingredients.map(ing => ({
    ingredientId: ing.ingredientId,
    displayName: ing.displayName,
    originalAmount: ing.amount,
    scaledAmount: Math.round(ing.amount * scaleFactor * 100) / 100,
    unit: ing.unit,
    preparation: ing.preparation,
  }));

  // Calculate nutrition if available
  let nutritionPerServing: NutritionPerServing | null = null;
  if (recipe.nutritionPerServing) {
    // Nutrition per serving stays the same when scaling
    nutritionPerServing = recipe.nutritionPerServing;
  } else {
    // Try to calculate from ingredients
    nutritionPerServing = await calculateRecipeNutrition(recipe, targetServings);
  }

  return {
    recipeId: recipe.id,
    recipeName: recipe.name,
    originalServings: recipe.scaling.baseServings,
    targetServings,
    scaleFactor,
    ingredients: scaledIngredients,
    nutritionPerServing,
  };
}

// =============================================================================
// NUTRITION CALCULATION
// =============================================================================

/**
 * Calculate nutrition per serving for a recipe
 */
export async function calculateRecipeNutrition(
  recipe: Recipe,
  servings?: number
): Promise<NutritionPerServing | null> {
  const targetServings = servings || recipe.servings;

  let totalCalories = 0;
  let totalProtein = 0;
  let totalCarbs = 0;
  let totalFat = 0;
  let totalFiber = 0;

  for (const recipeIng of recipe.ingredients) {
    const catalogIng = await getIngredientById(recipeIng.ingredientId);
    if (!catalogIng) continue;

    // Calculate based on the amount in the recipe
    // This assumes units are compatible (mostly grams/ml)
    const amount = recipeIng.amount;
    const ratio = amount / catalogIng.nutrition.per;

    totalCalories += catalogIng.nutrition.calories * ratio;
    totalProtein += catalogIng.nutrition.protein * ratio;
    totalCarbs += catalogIng.nutrition.carbs * ratio;
    totalFat += catalogIng.nutrition.fat * ratio;
    totalFiber += catalogIng.nutrition.fiber * ratio;
  }

  // Divide by servings
  return {
    calories: Math.round(totalCalories / targetServings),
    protein: Math.round(totalProtein / targetServings * 10) / 10,
    carbs: Math.round(totalCarbs / targetServings * 10) / 10,
    fat: Math.round(totalFat / targetServings * 10) / 10,
    fiber: Math.round(totalFiber / targetServings * 10) / 10,
  };
}

/**
 * Get total time breakdown for a recipe
 */
export function getRecipeTimeBreakdown(recipe: Recipe): {
  totalTime: number;
  prepTime: number;
  cookTime: number;
  steps: { step: number; duration: number }[];
} {
  let prepTime = 0;
  let cookTime = 0;
  const steps: { step: number; duration: number }[] = [];

  // Typically, first few steps are prep, later steps are cooking
  // This is a simplification - real logic might need recipe metadata
  for (const step of recipe.steps) {
    const duration = step.duration || 0;
    steps.push({ step: step.step, duration });

    // Simple heuristic: steps mentioning "corta", "pica", "lava" are prep
    const instruction = step.instruction.toLowerCase();
    if (instruction.includes('corta') ||
        instruction.includes('pica') ||
        instruction.includes('lava') ||
        instruction.includes('mezcla') ||
        instruction.includes('prepara')) {
      prepTime += duration;
    } else {
      cookTime += duration;
    }
  }

  return {
    totalTime: prepTime + cookTime,
    prepTime,
    cookTime,
    steps,
  };
}

// =============================================================================
// RECIPE DETAILS
// =============================================================================

/**
 * Get complete recipe details with resolved ingredients
 */
export async function getRecipeDetails(recipeId: string): Promise<{
  recipe: Recipe;
  ingredientDetails: { [key: string]: { name: string; category: string } };
  nutritionPerServing: NutritionPerServing | null;
  timeBreakdown: ReturnType<typeof getRecipeTimeBreakdown>;
} | null> {
  const recipe = await getRecipeById(recipeId);
  if (!recipe) return null;

  // Get ingredient details
  const ingredientIds = recipe.ingredients.map(ing => ing.ingredientId);
  const ingredients = await getIngredientsByIds(ingredientIds);

  const ingredientDetails: { [key: string]: { name: string; category: string } } = {};
  for (const ing of ingredients) {
    ingredientDetails[ing.id] = {
      name: ing.name,
      category: ing.category,
    };
  }

  // Calculate nutrition
  const nutritionPerServing = await calculateRecipeNutrition(recipe);

  // Get time breakdown
  const timeBreakdown = getRecipeTimeBreakdown(recipe);

  return {
    recipe,
    ingredientDetails,
    nutritionPerServing,
    timeBreakdown,
  };
}

// =============================================================================
// IMPORT/EXPORT
// =============================================================================

/**
 * IMPORTANT: Import/Export functionality has been moved to RemEDatabase class.
 * These functions now delegate to the centralized database manager.
 * DO NOT add new import/export logic here - use RemEDatabase instead.
 */

import { db } from '../RemEDatabase';

/**
 * Export all recipes to JSON string with IDs preserved
 * IMPORTANT: Both recipe IDs and ingredient IDs are included to maintain proper references
 */
export async function exportRecipesClean(): Promise<string> {
  return db.exportRecipes();
}

/**
 * Import recipes from JSON string
 * Validates format and adds to database
 */
export async function importRecipesFromJSON(jsonString: string): Promise<{
  success: number;
  errors: string[];
}> {
  return db.importRecipes(jsonString, true);
}
