/**
 * Recommendation Service
 *
 * Sistema de recomendaciones probabilístico con pesos:
 * - 50% Match de inventario
 * - 30% Rating del usuario
 * - 20% Frecuencia (inversa, para variedad)
 */

import { STORES, openDatabase, getItem, updateItem } from '../stores/database';
import type { Recipe, RecommendationCache, RecommendationResult, RecommendationFactors } from '../schemas/types';
import * as recipeService from './recipeService';
import * as inventoryService from './inventoryService';
import * as recipeHistoryService from './recipeHistoryService';

const CACHE_DURATION_MS = 24 * 60 * 60 * 1000; // 24 hours
const CACHE_ID = 'daily_recommendation';
const MIN_RECIPES_FOR_ALGORITHM = 3;
const RECENT_DAYS_TO_EXCLUDE = 7;

/**
 * Obtiene la recomendación diaria del usuario
 * Usa cache si está disponible y es válido (< 24 horas)
 */
export async function getDailyRecommendation(): Promise<RecommendationResult | null> {
  try {
    // Check cache first
    const cached = await getCachedRecommendation();
    if (cached) {
      return cached;
    }

    // Generate new recommendation
    const recommendation = await generateRecommendation();

    if (recommendation) {
      // Cache it
      await cacheRecommendation(recommendation.recipe.id, recommendation.factors);
      return recommendation;
    }

    return null;
  } catch (error) {
    console.error('Error getting daily recommendation:', error);
    return null;
  }
}

/**
 * Genera una nueva recomendación usando el algoritmo probabilístico
 */
async function generateRecommendation(): Promise<RecommendationResult | null> {
  // Get all recipes
  const allRecipes = await recipeService.getAllRecipes();
  if (allRecipes.length === 0) return null;

  // Get user data
  const inventory = await inventoryService.getInventory();
  const history = await recipeHistoryService.getCompletedRecipeHistory();
  const stats = await recipeHistoryService.getCookingStatistics();

  // Check if we have enough data for algorithm
  const hasEnoughData =
    history.length >= MIN_RECIPES_FOR_ALGORITHM &&
    inventory.length > 0;

  if (!hasEnoughData) {
    // Fallback: random recipe excluding recently cooked
    return getRandomRecommendation(allRecipes, history);
  }

  // Apply algorithm
  const scoredRecipes = await scoreAllRecipes(allRecipes, inventory, history, stats);

  // Exclude recently cooked recipes
  const recentRecipeIds = getRecentRecipeIds(history, RECENT_DAYS_TO_EXCLUDE);
  const eligibleRecipes = scoredRecipes.filter(
    sr => !recentRecipeIds.has(sr.recipe.id)
  );

  if (eligibleRecipes.length === 0) {
    // All recipes are recent, just return highest scored
    return scoredRecipes.length > 0 ? scoredRecipes[0] : null;
  }

  // Return highest scored eligible recipe
  return eligibleRecipes[0];
}

/**
 * Calcula scores para todas las recetas
 */
async function scoreAllRecipes(
  recipes: Recipe[],
  inventory: any[],
  history: any[],
  stats: any
): Promise<RecommendationResult[]> {
  const inventoryIngredientIds = new Set(inventory.map(item => item.ingredientId));

  // Calculate max cook count for normalization
  const maxCookCount = Math.max(
    ...recipes.map(r => getRecipeCookCount(r.id, history)),
    1
  );

  const scored = recipes.map(recipe => {
    // 1. Inventory Match Score (50% weight)
    const requiredIngredients = recipe.ingredients.map(ing => ing.ingredientId);
    const matchedCount = requiredIngredients.filter(id =>
      inventoryIngredientIds.has(id)
    ).length;
    const inventoryScore = requiredIngredients.length > 0
      ? matchedCount / requiredIngredients.length
      : 0;

    // 2. Rating Score (30% weight)
    const avgRating = getRecipeAverageRating(recipe.id, history);
    const ratingScore = avgRating !== null ? avgRating / 5 : 0.5; // neutral if no rating

    // 3. Frequency Score (20% weight, inverted for variety)
    const cookCount = getRecipeCookCount(recipe.id, history);
    const frequencyScore = 1 - (cookCount / maxCookCount);

    // Weighted final score
    const finalScore =
      (inventoryScore * 0.5) +
      (ratingScore * 0.3) +
      (frequencyScore * 0.2);

    const factors: RecommendationFactors = {
      inventoryMatchScore: inventoryScore,
      ratingScore,
      frequencyScore,
      finalScore,
    };

    return {
      recipe,
      factors,
    };
  });

  // Sort by final score descending
  return scored.sort((a, b) => b.factors.finalScore - a.factors.finalScore);
}

/**
 * Obtiene el conteo de veces que se cocinó una receta
 */
function getRecipeCookCount(recipeId: string, history: any[]): number {
  return history.filter(h => h.recipeId === recipeId).length;
}

/**
 * Obtiene el rating promedio de una receta
 */
function getRecipeAverageRating(recipeId: string, history: any[]): number | null {
  const ratings = history
    .filter(h => h.recipeId === recipeId && h.rating != null)
    .map(h => h.rating);

  if (ratings.length === 0) return null;

  return ratings.reduce((sum, r) => sum + r, 0) / ratings.length;
}

/**
 * Obtiene IDs de recetas cocinadas recientemente
 */
function getRecentRecipeIds(history: any[], days: number): Set<string> {
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - days);

  return new Set(
    history
      .filter(h => new Date(h.completedAt || h.startedAt) > cutoffDate)
      .map(h => h.recipeId)
  );
}

/**
 * Fallback: recomendación aleatoria
 */
function getRandomRecommendation(
  recipes: Recipe[],
  history: any[]
): RecommendationResult | null {
  if (recipes.length === 0) return null;

  // Exclude recently cooked if possible
  const recentIds = getRecentRecipeIds(history, RECENT_DAYS_TO_EXCLUDE);
  const eligible = recipes.filter(r => !recentIds.has(r.id));

  const pool = eligible.length > 0 ? eligible : recipes;
  const randomRecipe = pool[Math.floor(Math.random() * pool.length)];

  return {
    recipe: randomRecipe,
    factors: {
      inventoryMatchScore: 0,
      ratingScore: 0,
      frequencyScore: 0,
      finalScore: 0, // Random, no score
    },
  };
}

/**
 * Obtiene recomendación del cache si es válida
 */
async function getCachedRecommendation(): Promise<RecommendationResult | null> {
  try {
    const cache = await getItem<RecommendationCache>(STORES.RECOMMENDATION_CACHE, CACHE_ID);

    if (!cache) return null;

    const age = Date.now() - new Date(cache.generatedAt).getTime();
    if (age > CACHE_DURATION_MS) {
      return null; // Cache expired
    }

    // Fetch recipe
    const recipe = await recipeService.getRecipeById(cache.recipeId);
    if (!recipe) return null;

    return {
      recipe,
      factors: cache.factors,
    };
  } catch (error) {
    console.error('Error getting cached recommendation:', error);
    return null;
  }
}

/**
 * Guarda recomendación en cache
 */
async function cacheRecommendation(
  recipeId: string,
  factors: RecommendationFactors
): Promise<void> {
  try {
    const cache: RecommendationCache = {
      id: CACHE_ID,
      recipeId,
      score: factors.finalScore,
      factors,
      generatedAt: new Date().toISOString(),
    };

    await updateItem(STORES.RECOMMENDATION_CACHE, cache);
  } catch (error) {
    console.error('Error caching recommendation:', error);
  }
}

/**
 * Invalida el cache (forzar regeneración)
 */
export async function invalidateRecommendationCache(): Promise<void> {
  try {
    const db = await openDatabase();
    const transaction = db.transaction([STORES.RECOMMENDATION_CACHE], 'readwrite');
    const store = transaction.objectStore(STORES.RECOMMENDATION_CACHE);
    await store.delete(CACHE_ID);
  } catch (error) {
    console.error('Error invalidating cache:', error);
  }
}
