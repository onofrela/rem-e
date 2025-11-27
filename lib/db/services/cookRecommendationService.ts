/**
 * Cook Recommendation Service
 *
 * Servicio de recomendaciones específico para la sección "Cocinar Ahora"
 * Similar al sistema de scoring del home, pero adaptado para:
 * 1. Mostrar las 10 recetas más probables que el usuario quiera cocinar
 * 2. Recomendar recetas basadas en ingredientes detectados por cámara
 * 3. Recomendar recetas basadas en ingredientes escritos manualmente
 */

import type { Recipe, RecipeHistory, CatalogIngredient } from '../schemas/types';
import * as recipeService from './recipeService';
import * as inventoryService from './inventoryService';
import * as ingredientService from './ingredientService';
import * as recipeHistoryService from './recipeHistoryService';
import { STORES, getAllItems } from '../stores/database';

interface RecipeScore {
  recipe: Recipe;
  score: number;
  matchPercentage: number;
  missingIngredients: string[];
  factors: {
    inventoryMatch: number;
    userHistory: number;
    freshness: number;
    preferences: number;
  };
}

/**
 * Obtiene las 10 recetas más probables que el usuario quiera cocinar
 * Basado en inventario, historial y preferencias
 */
export async function getTopRecommendedRecipes(limit: number = 10): Promise<RecipeScore[]> {
  const allRecipes = await recipeService.getAllRecipes();
  if (allRecipes.length === 0) return [];

  const inventory = await inventoryService.getInventory();
  const history = await getAllItems<RecipeHistory>(STORES.RECIPE_HISTORY);

  const scoredRecipes = await scoreRecipesForCooking(allRecipes, inventory, history);

  // Filtrar recetas muy recientes (últimos 3 días) para más variedad
  const recentRecipeIds = getRecentRecipeIds(history, 3);
  const eligible = scoredRecipes.filter(sr => !recentRecipeIds.has(sr.recipe.id));

  // Si después de filtrar tenemos suficientes, usarlas; sino, usar todas
  const pool = eligible.length >= limit ? eligible : scoredRecipes;

  return pool.slice(0, limit);
}

/**
 * Obtiene recetas recomendadas basadas en ingredientes específicos
 * (para búsqueda por cámara o manual)
 */
export async function getRecipesByIngredients(
  ingredientNames: string[],
  filters?: {
    maxTime?: number;
    difficulty?: Recipe['difficulty'];
  }
): Promise<RecipeScore[]> {
  let recipes = await recipeService.getAllRecipes();

  // Aplicar filtros primero
  if (filters?.maxTime) {
    recipes = recipes.filter(r => r.time <= filters.maxTime!);
  }
  if (filters?.difficulty) {
    recipes = recipes.filter(r => r.difficulty === filters.difficulty);
  }

  if (recipes.length === 0) return [];

  const inventory = await inventoryService.getInventory();
  const history = await getAllItems<RecipeHistory>(STORES.RECIPE_HISTORY);

  // Crear un set de IDs de ingredientes del inventario
  const inventoryIngredientIds = new Set(inventory.map(item => item.ingredientId));

  // Para los ingredientes proporcionados, buscar sus IDs en el catálogo completo
  const ingredientIds = new Set<string>();
  const ingredientNamesLower = ingredientNames.map(n => n.toLowerCase());

  // Obtener todos los ingredientes del catálogo para buscar coincidencias
  const allIngredients = await ingredientService.getAllIngredients();

  // Buscar en el catálogo los ingredientes que coincidan con los nombres proporcionados
  for (const catalogIng of allIngredients) {
    const ingName = catalogIng.name.toLowerCase();
    const ingNormalized = catalogIng.normalizedName.toLowerCase();

    // Verificar si alguno de los nombres proporcionados coincide
    const matches = ingredientNamesLower.some(searchName => {
      // Coincidencia directa en el nombre
      if (ingName.includes(searchName) || searchName.includes(ingName)) return true;
      // Coincidencia en nombre normalizado
      if (ingNormalized.includes(searchName) || searchName.includes(ingNormalized)) return true;
      // Coincidencia en sinónimos
      if (catalogIng.synonyms.some(syn =>
        syn.toLowerCase().includes(searchName) || searchName.includes(syn.toLowerCase())
      )) return true;
      return false;
    });

    if (matches) {
      ingredientIds.add(catalogIng.id);
    }
  }

  console.log('🔍 Búsqueda de ingredientes:', {
    busquedaOriginal: ingredientNames,
    busquedaLower: ingredientNamesLower,
    idsEncontrados: Array.from(ingredientIds),
    nombresEncontrados: Array.from(ingredientIds).map(id => {
      const ing = allIngredients.find(i => i.id === id);
      return ing?.name || 'desconocido';
    }),
  });

  const scoredRecipes = await scoreRecipesBySpecificIngredients(
    recipes,
    ingredientIds,
    inventoryIngredientIds,
    history,
    ingredientNamesLower
  );

  // Filtrar recetas con menos del 50% de match
  const filteredRecipes = scoredRecipes.filter(recipe => recipe.matchPercentage >= 0.5);

  console.log('📊 Resultados de búsqueda:', {
    totalRecetas: scoredRecipes.length,
    recetasFiltradas: filteredRecipes.length,
    umbralMinimo: '50%',
  });

  // Ordenar por score y porcentaje de match
  return filteredRecipes.sort((a, b) => {
    // Primero por match percentage (más importante)
    if (b.matchPercentage !== a.matchPercentage) {
      return b.matchPercentage - a.matchPercentage;
    }
    // Luego por score total
    return b.score - a.score;
  });
}

/**
 * Calcula scores para recetas cuando el usuario busca ingredientes específicos
 */
async function scoreRecipesBySpecificIngredients(
  recipes: Recipe[],
  specificIngredientIds: Set<string>,
  allInventoryIds: Set<string>,
  history: RecipeHistory[],
  ingredientNamesLower: string[]
): Promise<RecipeScore[]> {
  const historyMap = buildHistoryMap(history);
  const maxCookCount = Math.max(
    ...recipes.map(r => historyMap.get(r.id)?.count || 0),
    1
  );

  // Obtener todos los ingredientes del catálogo para poder acceder a sus nombres
  const allCatalogIngredients = await ingredientService.getAllIngredients();
  const ingredientMap = new Map<string, CatalogIngredient>(
    allCatalogIngredients.map(ing => [ing.id, ing])
  );

  return recipes.map(recipe => {
    const requiredIngredients = recipe.ingredients.map(ing => ing.ingredientId);

    // Obtener los nombres de los ingredientes del catálogo
    const requiredIngredientNames = recipe.ingredients
      .map(ing => {
        const catalogIng = ingredientMap.get(ing.ingredientId);
        return catalogIng?.name.toLowerCase() || ing.displayName?.toLowerCase() || '';
      })
      .filter(name => name.length > 0);

    // 1. SPECIFIC MATCH (60% weight): Qué tan bien coincide con los ingredientes buscados
    let specificMatchCount = 0;
    let exactMatches = 0;

    // Para cada ingrediente de la receta, verificar si coincide con los ingredientes buscados
    recipe.ingredients.forEach(recipeIng => {
      const catalogIng = ingredientMap.get(recipeIng.ingredientId);
      if (!catalogIng) return;

      const recipeIngName = catalogIng.name.toLowerCase();
      const recipeIngNormalized = catalogIng.normalizedName.toLowerCase();
      const recipeDisplayName = recipeIng.displayName?.toLowerCase() || '';
      const recipeSynonyms = catalogIng.synonyms.map(s => s.toLowerCase());

      // Verificar si este ingrediente coincide con alguno de los buscados
      for (const searchName of ingredientNamesLower) {
        let matchScore = 0;

        // Coincidencia exacta en ID (si el usuario buscó por ID, cosa rara pero posible)
        if (specificIngredientIds.has(recipeIng.ingredientId)) {
          matchScore = 1.5; // Bonus por match exacto de ID
          exactMatches++;
        }
        // Coincidencia exacta en nombre
        else if (recipeIngName === searchName || recipeIngNormalized === searchName) {
          matchScore = 1.2; // Alta prioridad para coincidencia exacta
          exactMatches++;
        }
        // Coincidencia exacta en sinónimos
        else if (recipeSynonyms.includes(searchName)) {
          matchScore = 1.0; // Sinónimo exacto
          exactMatches++;
        }
        // Coincidencia exacta en displayName
        else if (recipeDisplayName === searchName) {
          matchScore = 1.0;
          exactMatches++;
        }
        // Coincidencia parcial en nombre (ej: "huevo" en "claras de huevo")
        else if (recipeIngName.includes(searchName) || searchName.includes(recipeIngName)) {
          matchScore = 0.6;
        }
        // Coincidencia parcial en nombre normalizado
        else if (recipeIngNormalized.includes(searchName) || searchName.includes(recipeIngNormalized)) {
          matchScore = 0.5;
        }
        // Coincidencia parcial en sinónimos
        else if (recipeSynonyms.some(syn => syn.includes(searchName) || searchName.includes(syn))) {
          matchScore = 0.4;
        }
        // Coincidencia parcial en displayName
        else if (recipeDisplayName && (recipeDisplayName.includes(searchName) || searchName.includes(recipeDisplayName))) {
          matchScore = 0.4;
        }

        if (matchScore > 0) {
          specificMatchCount += matchScore;
          break; // Solo contar una vez por ingrediente de la receta
        }
      }
    });

    // Normalizar el score: dividir entre el número de ingredientes buscados
    // Dar bonus si encontramos todos los ingredientes buscados
    const specificMatch = ingredientNamesLower.length > 0
      ? Math.min(1.5, specificMatchCount / ingredientNamesLower.length)
      : 0;

    // 2. INVENTORY MATCH (20% weight): Qué tan bien coincide con TODO el inventario
    const totalMatchCount = requiredIngredients.filter(id =>
      allInventoryIds.has(id)
    ).length;
    const inventoryMatch = requiredIngredients.length > 0
      ? totalMatchCount / requiredIngredients.length
      : 0;

    // 3. USER HISTORY (15% weight): Recetas que le han gustado
    const historyData = historyMap.get(recipe.id);
    let userHistory = 0.5; // Neutral para recetas no cocinadas
    if (historyData) {
      const frequencyPenalty = Math.max(0, 1 - (historyData.count / 10));
      const ratingBonus = historyData.avgRating / 5;
      userHistory = ratingBonus * frequencyPenalty;
    }

    // 4. FRESHNESS (5% weight): Evita recetas muy recientes
    const recentHistory = history
      .filter(h => h.recipeId === recipe.id)
      .sort((a, b) => new Date(b.startedAt).getTime() - new Date(a.startedAt).getTime())[0];

    let freshness = 1.0;
    if (recentHistory) {
      const daysSince = (Date.now() - new Date(recentHistory.startedAt).getTime()) / (1000 * 60 * 60 * 24);
      freshness = Math.min(1, daysSince / 7); // Penaliza si la hizo hace menos de 7 días
    }

    // SCORE FINAL - Priorizar fuertemente las coincidencias específicas
    const weights = {
      specificMatch: 0.7,    // Aumentado: lo más importante es que tenga los ingredientes buscados
      inventoryMatch: 0.15,  // Reducido: menos importante si tiene otros ingredientes
      userHistory: 0.1,      // Reducido
      freshness: 0.05,       // Mantener bajo
    };

    // Bonus adicional por coincidencias exactas
    const exactMatchBonus = exactMatches > 0 ? 0.2 * (exactMatches / ingredientNamesLower.length) : 0;

    const totalScore =
      specificMatch * weights.specificMatch +
      inventoryMatch * weights.inventoryMatch +
      userHistory * weights.userHistory +
      freshness * weights.freshness +
      exactMatchBonus;

    // Calcular ingredientes faltantes usando nombres del catálogo
    const missingIngredients = recipe.ingredients
      .filter(ing => !allInventoryIds.has(ing.ingredientId))
      .map(ing => {
        const catalogIng = ingredientMap.get(ing.ingredientId);
        return catalogIng?.name || ing.displayName || 'Ingrediente desconocido';
      });

    // Calcular el porcentaje de match basado en los ingredientes buscados específicamente
    // Si la receta usa todos los ingredientes buscados = 100%
    // Si usa algunos = porcentaje proporcional
    const searchMatchPercentage = ingredientNamesLower.length > 0
      ? Math.min(1, specificMatchCount / (ingredientNamesLower.length * 1.2)) // Ajustado para que sea más generoso
      : inventoryMatch; // Fallback al match de inventario si no hay búsqueda específica

    return {
      recipe,
      score: totalScore,
      matchPercentage: searchMatchPercentage,
      missingIngredients,
      factors: {
        inventoryMatch,
        userHistory,
        freshness,
        preferences: specificMatch,
      },
    };
  });
}

/**
 * Calcula scores para todas las recetas (recomendación general)
 */
async function scoreRecipesForCooking(
  recipes: Recipe[],
  inventory: any[],
  history: RecipeHistory[]
): Promise<RecipeScore[]> {
  const inventoryIngredientIds = new Set(inventory.map(item => item.ingredientId));
  const historyMap = buildHistoryMap(history);

  // Obtener todos los ingredientes del catálogo
  const allCatalogIngredients = await ingredientService.getAllIngredients();
  const ingredientMap = new Map<string, CatalogIngredient>(
    allCatalogIngredients.map(ing => [ing.id, ing])
  );

  const scored = recipes.map(recipe => {
    const requiredIngredients = recipe.ingredients.map(ing => ing.ingredientId);

    // 1. INVENTORY MATCH (50% weight)
    const matchedCount = requiredIngredients.filter(id =>
      inventoryIngredientIds.has(id)
    ).length;
    const inventoryMatch = requiredIngredients.length > 0
      ? matchedCount / requiredIngredients.length
      : 0;

    // 2. USER HISTORY (30% weight)
    const historyData = historyMap.get(recipe.id);
    let userHistory = 0.5; // Neutral para recetas nuevas
    if (historyData) {
      const frequencyPenalty = Math.max(0, 1 - (historyData.count / 10));
      const ratingBonus = historyData.avgRating / 5;
      userHistory = ratingBonus * frequencyPenalty;
    }

    // 3. FRESHNESS (20% weight)
    const recentHistory = history
      .filter(h => h.recipeId === recipe.id)
      .sort((a, b) => new Date(b.startedAt).getTime() - new Date(a.startedAt).getTime())[0];

    let freshness = 1.0;
    if (recentHistory) {
      const daysSince = (Date.now() - new Date(recentHistory.startedAt).getTime()) / (1000 * 60 * 60 * 24);
      freshness = Math.min(1, daysSince / 7);
    }

    // SCORE FINAL
    const weights = {
      inventoryMatch: 0.5,
      userHistory: 0.3,
      freshness: 0.2,
    };

    const totalScore =
      inventoryMatch * weights.inventoryMatch +
      userHistory * weights.userHistory +
      freshness * weights.freshness;

    // Calcular ingredientes faltantes usando nombres del catálogo
    const missingIngredients = recipe.ingredients
      .filter(ing => !inventoryIngredientIds.has(ing.ingredientId))
      .map(ing => {
        const catalogIng = ingredientMap.get(ing.ingredientId);
        return catalogIng?.name || ing.displayName || 'Ingrediente desconocido';
      });

    return {
      recipe,
      score: totalScore,
      matchPercentage: inventoryMatch,
      missingIngredients,
      factors: {
        inventoryMatch,
        userHistory,
        freshness,
        preferences: 0.5,
      },
    };
  });

  return scored.sort((a, b) => b.score - a.score);
}

/**
 * Construye un mapa de historial con conteos y ratings promedio
 */
function buildHistoryMap(history: RecipeHistory[]): Map<string, { count: number; avgRating: number }> {
  const map = new Map<string, { count: number; avgRating: number }>();

  history.forEach(h => {
    if (!map.has(h.recipeId)) {
      map.set(h.recipeId, { count: 0, avgRating: 0 });
    }
    const data = map.get(h.recipeId)!;
    data.count++;
    if (h.rating) {
      data.avgRating = (data.avgRating * (data.count - 1) + h.rating) / data.count;
    }
  });

  return map;
}

/**
 * Obtiene IDs de recetas cocinadas recientemente
 */
function getRecentRecipeIds(history: RecipeHistory[], days: number): Set<string> {
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - days);

  return new Set(
    history
      .filter(h => new Date(h.completedAt || h.startedAt) > cutoffDate)
      .map(h => h.recipeId)
  );
}
