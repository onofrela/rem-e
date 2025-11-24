/**
 * LLM Function Handlers
 *
 * Implementations for each function that the LLM can call.
 * Each handler receives parsed arguments and returns a response.
 */

import * as ingredientService from '../services/ingredientService';
import * as recipeService from '../services/recipeService';
import * as inventoryService from '../services/inventoryService';
import * as compatibilityService from '../services/compatibilityService';
import type {
  SearchIngredientsParams,
  GetInventoryParams,
  AddToInventoryParams,
  UpdateInventoryParams,
  GetRecipesByIngredientsParams,
  CalculatePortionsParams,
  StorageLocation,
  RecipeDifficulty,
  RecipeCategory
} from '../schemas/types';

// =============================================================================
// HANDLER TYPES
// =============================================================================

export type FunctionHandler = (args: Record<string, unknown>) => Promise<unknown>;

export interface FunctionResult {
  success: boolean;
  data?: unknown;
  error?: string;
}

// =============================================================================
// INGREDIENT HANDLERS
// =============================================================================

async function handleSearchIngredients(args: Record<string, unknown>): Promise<FunctionResult> {
  try {
    const params: SearchIngredientsParams = {
      query: args.query as string,
      category: args.category as SearchIngredientsParams['category'],
      limit: args.limit as number,
    };

    const results = await ingredientService.searchIngredients(params);

    return {
      success: true,
      data: results.map(ing => ({
        id: ing.id,
        name: ing.name,
        category: ing.category,
        defaultUnit: ing.defaultUnit,
        calories: ing.nutrition.calories,
      })),
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Error searching ingredients',
    };
  }
}

async function handleGetIngredientDetails(args: Record<string, unknown>): Promise<FunctionResult> {
  try {
    const ingredientId = args.ingredientId as string;
    const ingredient = await ingredientService.getIngredientById(ingredientId);

    if (!ingredient) {
      return { success: false, error: 'Ingrediente no encontrado' };
    }

    return {
      success: true,
      data: {
        id: ingredient.id,
        name: ingredient.name,
        category: ingredient.category,
        subcategory: ingredient.subcategory,
        synonyms: ingredient.synonyms,
        defaultUnit: ingredient.defaultUnit,
        nutrition: ingredient.nutrition,
        storage: ingredient.storage,
        substitutes: ingredient.substitutes,
        compatibleWith: ingredient.compatibleWith,
      },
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Error getting ingredient details',
    };
  }
}

async function handleGetCompatibleIngredients(args: Record<string, unknown>): Promise<FunctionResult> {
  try {
    const ingredientId = args.ingredientId as string;
    const compatible = await compatibilityService.getCompatibleIngredients(ingredientId);

    return {
      success: true,
      data: compatible.map(c => ({
        ingredientId: c.ingredient.id,
        name: c.ingredient.name,
        score: c.score,
        reason: c.reason,
        cuisines: c.cuisines,
      })),
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Error getting compatible ingredients',
    };
  }
}

async function handleGetSubstitutes(args: Record<string, unknown>): Promise<FunctionResult> {
  try {
    const ingredientId = args.ingredientId as string;
    const substitutes = await ingredientService.getSubstitutes(ingredientId);

    return {
      success: true,
      data: substitutes.map(sub => ({
        id: sub.id,
        name: sub.name,
        category: sub.category,
      })),
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Error getting substitutes',
    };
  }
}

// =============================================================================
// INVENTORY HANDLERS
// =============================================================================

async function handleGetInventory(args: Record<string, unknown>): Promise<FunctionResult> {
  try {
    const params: GetInventoryParams = {
      location: args.location as StorageLocation | undefined,
      expiringWithinDays: args.expiringWithinDays as number | undefined,
    };

    const inventory = await inventoryService.getInventory(params);

    // Enrich with ingredient names
    const enriched = await Promise.all(
      inventory.map(async (item) => {
        const ingredient = await ingredientService.getIngredientById(item.ingredientId);
        return {
          inventoryId: item.id,
          ingredientId: item.ingredientId,
          name: ingredient?.name || 'Desconocido',
          quantity: item.quantity,
          unit: item.unit,
          location: item.location,
          expirationDate: item.expirationDate,
          brand: item.brand,
        };
      })
    );

    // Si no hay items, devolver mensaje claro
    if (enriched.length === 0) {
      return {
        success: true,
        data: {
          items: [],
          message: "El inventario está vacío. No hay ingredientes registrados.",
          totalItems: 0
        }
      };
    }

    return {
      success: true,
      data: {
        items: enriched,
        totalItems: enriched.length,
        message: `Se encontraron ${enriched.length} ingrediente(s) en el inventario.`
      }
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Error getting inventory',
    };
  }
}

async function handleSearchInventoryByName(args: Record<string, unknown>): Promise<FunctionResult> {
  try {
    const ingredientName = (args.ingredientName as string || '').toLowerCase().trim();

    if (!ingredientName) {
      return {
        success: false,
        error: 'Debes especificar el nombre del ingrediente a buscar',
      };
    }

    // Obtener todo el inventario
    const inventory = await inventoryService.getInventory();

    // Buscar coincidencias por nombre
    const matches = await Promise.all(
      inventory.map(async (item) => {
        const ingredient = await ingredientService.getIngredientById(item.ingredientId);
        const name = ingredient?.name || '';
        const normalizedName = name.toLowerCase();

        // Verificar si coincide
        if (normalizedName.includes(ingredientName) || ingredientName.includes(normalizedName)) {
          return {
            found: true,
            name: ingredient?.name || 'Desconocido',
            quantity: item.quantity,
            unit: item.unit,
            location: item.location,
            locationName: getLocationName(item.location),
            expirationDate: item.expirationDate,
            brand: item.brand,
          };
        }
        return null;
      })
    );

    const found = matches.filter(m => m !== null);

    if (found.length === 0) {
      return {
        success: true,
        data: {
          found: false,
          message: `No se encontró "${ingredientName}" en tu inventario.`,
          suggestion: "Puedes agregarlo desde la sección de Inventario."
        }
      };
    }

    // Calcular total si hay múltiples ubicaciones
    const totalQuantity = found.reduce((sum, item) => sum + (item?.quantity || 0), 0);
    const unit = found[0]?.unit || '';

    return {
      success: true,
      data: {
        found: true,
        ingredientName: found[0]?.name,
        totalQuantity,
        unit,
        locations: found.map(f => ({
          location: f?.locationName,
          quantity: f?.quantity,
          unit: f?.unit,
          expirationDate: f?.expirationDate
        })),
        message: found.length === 1
          ? `Tienes ${found[0]?.quantity} ${found[0]?.unit} de ${found[0]?.name} en ${found[0]?.locationName}.`
          : `Tienes ${totalQuantity} ${unit} de ${found[0]?.name} en total, distribuido en ${found.length} ubicaciones.`
      }
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Error buscando en el inventario',
    };
  }
}

// Helper para nombres de ubicación en español
function getLocationName(location: StorageLocation): string {
  const names: Record<StorageLocation, string> = {
    refrigerator: 'el refrigerador',
    freezer: 'el congelador',
    pantry: 'la alacena',
    counter: 'el mostrador',
  };
  return names[location] || location;
}

async function handleAddToInventory(args: Record<string, unknown>): Promise<FunctionResult> {
  try {
    const params: AddToInventoryParams = {
      ingredientId: args.ingredientId as string,
      quantity: args.quantity as number,
      unit: args.unit as string,
      location: args.location as StorageLocation,
      expirationDate: args.expirationDate as string | undefined,
      brand: args.brand as string | undefined,
      notes: args.notes as string | undefined,
    };

    const item = await inventoryService.addToInventory(params);
    const ingredient = await ingredientService.getIngredientById(params.ingredientId);

    return {
      success: true,
      data: {
        message: `${ingredient?.name || 'Ingrediente'} agregado al inventario`,
        inventoryId: item.id,
        quantity: item.quantity,
        unit: item.unit,
        location: item.location,
      },
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Error adding to inventory',
    };
  }
}

async function handleUpdateInventory(args: Record<string, unknown>): Promise<FunctionResult> {
  try {
    const inventoryId = args.inventoryId as string;
    const updates: Partial<UpdateInventoryParams> = {};

    if (args.quantity !== undefined) updates.quantity = args.quantity as number;
    if (args.location !== undefined) updates.location = args.location as StorageLocation;
    if (args.expirationDate !== undefined) updates.expirationDate = args.expirationDate as string;
    if (args.notes !== undefined) updates.notes = args.notes as string;

    const item = await inventoryService.updateInventoryItem(inventoryId, updates);

    return {
      success: true,
      data: {
        message: 'Inventario actualizado',
        inventoryId: item.id,
        quantity: item.quantity,
        unit: item.unit,
        location: item.location,
      },
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Error updating inventory',
    };
  }
}

async function handleRemoveFromInventory(args: Record<string, unknown>): Promise<FunctionResult> {
  try {
    const inventoryId = args.inventoryId as string;
    await inventoryService.deleteInventoryItem(inventoryId);

    return {
      success: true,
      data: { message: 'Item eliminado del inventario' },
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Error removing from inventory',
    };
  }
}

async function handleConsumeFromInventory(args: Record<string, unknown>): Promise<FunctionResult> {
  try {
    const ingredientId = args.ingredientId as string;
    const quantity = args.quantity as number;

    const result = await inventoryService.consumeFromInventory(ingredientId, quantity);
    const ingredient = await ingredientService.getIngredientById(ingredientId);

    return {
      success: true,
      data: {
        message: `Consumido ${result.consumed} de ${ingredient?.name || 'ingrediente'}`,
        consumed: result.consumed,
        remaining: result.remaining,
      },
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Error consuming from inventory',
    };
  }
}

async function handleGetInventoryAlerts(): Promise<FunctionResult> {
  try {
    const alerts = await inventoryService.generateInventoryAlerts();

    return {
      success: true,
      data: {
        totalAlerts: alerts.length,
        alerts: alerts.map(alert => ({
          type: alert.type,
          ingredientName: alert.ingredientName,
          message: alert.message,
          priority: alert.priority,
        })),
      },
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Error getting inventory alerts',
    };
  }
}

// =============================================================================
// RECIPE HANDLERS
// =============================================================================

async function handleSearchRecipes(args: Record<string, unknown>): Promise<FunctionResult> {
  try {
    const query = args.query as string;
    const recipes = await recipeService.searchRecipes(query);

    return {
      success: true,
      data: recipes.map(r => ({
        id: r.id,
        name: r.name,
        description: r.description,
        time: r.time,
        difficulty: r.difficulty,
        servings: r.servings,
        category: r.category,
      })),
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Error searching recipes',
    };
  }
}

async function handleGetRecipesByIngredients(args: Record<string, unknown>): Promise<FunctionResult> {
  try {
    const params: GetRecipesByIngredientsParams = {
      ingredientIds: args.ingredientIds as string[],
      maxMissingIngredients: args.maxMissingIngredients as number | undefined,
      maxTime: args.maxTime as number | undefined,
      difficulty: args.difficulty as RecipeDifficulty | undefined,
    };

    const results = await recipeService.getRecipesByIngredients(params);

    return {
      success: true,
      data: results.map(r => ({
        recipeId: r.recipe.id,
        name: r.recipe.name,
        matchScore: Math.round(r.matchScore * 100),
        matchedCount: r.matchedIngredients.length,
        missingCount: r.missingIngredients.length,
        missingIngredients: r.missingIngredients,
        time: r.recipe.time,
        difficulty: r.recipe.difficulty,
      })),
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Error getting recipes by ingredients',
    };
  }
}

async function handleGetRecipeDetails(args: Record<string, unknown>): Promise<FunctionResult> {
  try {
    const recipeId = args.recipeId as string;
    const details = await recipeService.getRecipeDetails(recipeId);

    if (!details) {
      return { success: false, error: 'Receta no encontrada' };
    }

    return {
      success: true,
      data: {
        id: details.recipe.id,
        name: details.recipe.name,
        description: details.recipe.description,
        time: details.recipe.time,
        difficulty: details.recipe.difficulty,
        servings: details.recipe.servings,
        category: details.recipe.category,
        cuisine: details.recipe.cuisine,
        ingredients: details.recipe.ingredients.map(ing => ({
          ingredientId: ing.ingredientId,
          name: ing.displayName,
          amount: ing.amount,
          unit: ing.unit,
          preparation: ing.preparation,
          optional: ing.optional,
        })),
        ingredientGroups: details.recipe.ingredientGroups,
        steps: details.recipe.steps.map(step => ({
          step: step.step,
          instruction: step.instruction,
          duration: step.duration,
          ingredientsUsed: step.ingredientsUsed,
          tip: step.tip,
          warning: step.warning,
        })),
        nutritionPerServing: details.nutritionPerServing,
        timeBreakdown: details.timeBreakdown,
      },
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Error getting recipe details',
    };
  }
}

async function handleGetRecipesByCategory(args: Record<string, unknown>): Promise<FunctionResult> {
  try {
    const category = args.category as RecipeCategory;
    const recipes = await recipeService.getRecipesByCategory(category);

    return {
      success: true,
      data: recipes.map(r => ({
        id: r.id,
        name: r.name,
        time: r.time,
        difficulty: r.difficulty,
        servings: r.servings,
      })),
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Error getting recipes by category',
    };
  }
}

async function handleCalculatePortions(args: Record<string, unknown>): Promise<FunctionResult> {
  try {
    const params: CalculatePortionsParams = {
      recipeId: args.recipeId as string,
      targetServings: args.targetServings as number,
    };

    const result = await recipeService.calculatePortions(params);

    if (!result) {
      return { success: false, error: 'No se puede escalar esta receta o porciones fuera de rango' };
    }

    return {
      success: true,
      data: {
        recipeName: result.recipeName,
        originalServings: result.originalServings,
        targetServings: result.targetServings,
        scaleFactor: result.scaleFactor,
        ingredients: result.ingredients.map(ing => ({
          name: ing.displayName,
          originalAmount: ing.originalAmount,
          scaledAmount: ing.scaledAmount,
          unit: ing.unit,
        })),
        nutritionPerServing: result.nutritionPerServing,
      },
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Error calculating portions',
    };
  }
}

async function handleCalculateNutrition(args: Record<string, unknown>): Promise<FunctionResult> {
  try {
    const recipeId = args.recipeId as string;
    const servings = args.servings as number | undefined;

    const recipe = await recipeService.getRecipeById(recipeId);
    if (!recipe) {
      return { success: false, error: 'Receta no encontrada' };
    }

    const nutrition = await recipeService.calculateRecipeNutrition(recipe, servings);

    return {
      success: true,
      data: {
        recipeName: recipe.name,
        servings: servings || recipe.servings,
        nutritionPerServing: nutrition,
      },
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Error calculating nutrition',
    };
  }
}

async function handleGetIngredientsForStep(args: Record<string, unknown>): Promise<FunctionResult> {
  try {
    const recipeId = args.recipeId as string;
    const stepNumber = args.stepNumber as number;

    const recipe = await recipeService.getRecipeById(recipeId);
    if (!recipe) {
      return { success: false, error: 'Receta no encontrada' };
    }

    const ingredients = await recipeService.getIngredientsForStep(recipe, stepNumber);

    return {
      success: true,
      data: {
        recipeName: recipe.name,
        step: stepNumber,
        ingredients,
      },
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Error getting ingredients for step',
    };
  }
}

// =============================================================================
// COMPATIBILITY/SUGGESTION HANDLERS
// =============================================================================

async function handleSuggestComplementaryIngredients(args: Record<string, unknown>): Promise<FunctionResult> {
  try {
    const currentIngredients = args.currentIngredients as string[];
    const limit = args.limit as number | undefined;

    const suggestions = await compatibilityService.suggestComplementaryIngredients(
      currentIngredients,
      limit
    );

    return {
      success: true,
      data: suggestions.map(s => ({
        ingredientId: s.ingredient.id,
        name: s.ingredient.name,
        reason: s.reason,
        score: Math.round(s.averageScore * 100),
      })),
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Error suggesting ingredients',
    };
  }
}

async function handleAnalyzeFlavorBalance(args: Record<string, unknown>): Promise<FunctionResult> {
  try {
    const ingredientIds = args.ingredientIds as string[];
    const analysis = await compatibilityService.analyzeFlavorBalance(ingredientIds);

    return {
      success: true,
      data: {
        flavorCoverage: analysis.flavorCoverage,
        missingFlavors: analysis.missingFlavors,
        dominantFlavor: analysis.dominantFlavor,
        suggestions: analysis.suggestions,
      },
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Error analyzing flavor balance',
    };
  }
}

// =============================================================================
// UTILITY HANDLERS
// =============================================================================

async function handleCheckRecipeIngredients(args: Record<string, unknown>): Promise<FunctionResult> {
  try {
    const recipeId = args.recipeId as string;
    const recipe = await recipeService.getRecipeById(recipeId);

    if (!recipe) {
      return { success: false, error: 'Receta no encontrada' };
    }

    const recipeIngredients = recipe.ingredients.map(ing => ({
      ingredientId: ing.ingredientId,
      amount: ing.amount,
      optional: ing.optional,
    }));

    const check = await inventoryService.checkRecipeIngredients(recipeIngredients);

    // Enrich with ingredient names
    const missingWithNames = await Promise.all(
      check.missing.map(async (m) => {
        const ing = await ingredientService.getIngredientById(m.ingredientId);
        return {
          name: ing?.name || 'Desconocido',
          amount: m.amount,
          shortage: m.shortage,
        };
      })
    );

    return {
      success: true,
      data: {
        recipeName: recipe.name,
        canMake: check.canMake,
        availableCount: check.available.length,
        missingCount: check.missing.length,
        missing: missingWithNames,
        optionalAvailable: check.optional.filter(o => o.available > 0).length,
      },
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Error checking recipe ingredients',
    };
  }
}

async function handleGetInventorySummary(): Promise<FunctionResult> {
  try {
    const summary = await inventoryService.getInventorySummary();

    return {
      success: true,
      data: summary,
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Error getting inventory summary',
    };
  }
}

// =============================================================================
// HANDLER REGISTRY
// =============================================================================

const handlers: Record<string, FunctionHandler> = {
  // Ingredient handlers
  searchIngredients: handleSearchIngredients,
  getIngredientDetails: handleGetIngredientDetails,
  getCompatibleIngredients: handleGetCompatibleIngredients,
  getSubstitutes: handleGetSubstitutes,

  // Inventory handlers
  getInventory: handleGetInventory,
  searchInventoryByName: handleSearchInventoryByName,
  addToInventory: handleAddToInventory,
  updateInventory: handleUpdateInventory,
  removeFromInventory: handleRemoveFromInventory,
  consumeFromInventory: handleConsumeFromInventory,
  getInventoryAlerts: handleGetInventoryAlerts,

  // Recipe handlers
  searchRecipes: handleSearchRecipes,
  getRecipesByIngredients: handleGetRecipesByIngredients,
  getRecipeDetails: handleGetRecipeDetails,
  getRecipesByCategory: handleGetRecipesByCategory,
  calculatePortions: handleCalculatePortions,
  calculateNutrition: handleCalculateNutrition,
  getIngredientsForStep: handleGetIngredientsForStep,

  // Compatibility handlers
  suggestComplementaryIngredients: handleSuggestComplementaryIngredients,
  analyzeFlavorBalance: handleAnalyzeFlavorBalance,

  // Utility handlers
  checkRecipeIngredients: handleCheckRecipeIngredients,
  getInventorySummary: handleGetInventorySummary,
};

/**
 * Execute a function by name with given arguments
 */
export async function executeFunction(
  functionName: string,
  args: Record<string, unknown>
): Promise<FunctionResult> {
  const handler = handlers[functionName];

  if (!handler) {
    return {
      success: false,
      error: `Función desconocida: ${functionName}`,
    };
  }

  return handler(args);
}

/**
 * Get list of available function names
 */
export function getAvailableFunctions(): string[] {
  return Object.keys(handlers);
}
