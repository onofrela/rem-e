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
import * as applianceService from '../services/applianceService';
import * as userApplianceService from '../services/userApplianceService';
import * as substitutionService from '../services/substitutionService';
import * as variantService from '../services/variantService';
import * as historyService from '../services/historyService';
import * as knowledgeService from '../services/knowledgeService';
import * as adaptationService from '../services/adaptationService';
import type {
  SearchIngredientsParams,
  GetInventoryParams,
  AddToInventoryParams,
  UpdateInventoryParams,
  GetRecipesByIngredientsParams,
  CalculatePortionsParams,
  StorageLocation,
  RecipeDifficulty,
  RecipeCategory,
  SearchAppliancesParams,
  SuggestSubstitutionParams,
  GetRecipeVariantsParams,
  CreateRecipeVariantParams,
  SaveCookingNoteParams,
  RecordSubstitutionPreferenceParams,
  CompleteRecipeSessionParams,
  AdaptRecipeParams
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
// APPLIANCE HANDLERS
// =============================================================================

async function handleGetUserAppliances(): Promise<FunctionResult> {
  try {
    const userAppliances = await userApplianceService.getAllUserAppliances();

    // Enrich with appliance details from catalog
    const enriched = await Promise.all(
      userAppliances.map(async (userApp) => {
        const appliance = await applianceService.getApplianceById(userApp.applianceId);
        return {
          id: userApp.id,
          applianceId: userApp.applianceId,
          name: appliance?.name || 'Desconocido',
          category: appliance?.category,
          description: appliance?.description,
        };
      })
    );

    if (enriched.length === 0) {
      return {
        success: true,
        data: {
          appliances: [],
          message: "No tienes electrodomésticos registrados en Mi Cocina.",
          totalAppliances: 0
        }
      };
    }

    return {
      success: true,
      data: {
        appliances: enriched,
        totalAppliances: enriched.length,
        message: `Tienes ${enriched.length} electrodoméstico(s) registrado(s).`
      }
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Error obteniendo electrodomésticos del usuario',
    };
  }
}

async function handleSearchAppliances(args: Record<string, unknown>): Promise<FunctionResult> {
  try {
    const params: SearchAppliancesParams = {
      query: args.query as string,
      category: args.category as SearchAppliancesParams['category'],
      limit: args.limit as number,
    };

    const results = await applianceService.searchAppliances(params);

    return {
      success: true,
      data: results.map(app => ({
        id: app.id,
        name: app.name,
        category: app.category,
        description: app.description,
        isCommon: app.isCommon,
      })),
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Error buscando electrodomésticos',
    };
  }
}

async function handleHasAppliance(args: Record<string, unknown>): Promise<FunctionResult> {
  try {
    const applianceName = (args.applianceName as string || '').toLowerCase().trim();

    if (!applianceName) {
      return {
        success: false,
        error: 'Debes especificar el nombre del electrodoméstico a buscar',
      };
    }

    // Buscar el electrodoméstico en el catálogo
    const catalogAppliance = await applianceService.findApplianceByName(applianceName);

    if (!catalogAppliance) {
      return {
        success: true,
        data: {
          hasAppliance: false,
          message: `No encontré "${applianceName}" en el catálogo de electrodomésticos.`,
          applianceName: applianceName
        }
      };
    }

    // Verificar si el usuario lo tiene
    const hasIt = await userApplianceService.hasAppliance(catalogAppliance.id);

    return {
      success: true,
      data: {
        hasAppliance: hasIt,
        applianceName: catalogAppliance.name,
        message: hasIt
          ? `Sí, tienes ${catalogAppliance.name} en tu cocina.`
          : `No, no tienes ${catalogAppliance.name} registrado en tu cocina.`
      }
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Error verificando electrodoméstico',
    };
  }
}

// =============================================================================
// SUBSTITUTION HANDLERS
// =============================================================================

async function handleSuggestSubstitution(args: Record<string, unknown>): Promise<FunctionResult> {
  try {
    const originalIngredientId = args.originalIngredientId as string;
    const recipeId = args.recipeId as string | undefined;

    const ingredient = await ingredientService.getIngredientById(originalIngredientId);
    if (!ingredient) {
      return { success: false, error: 'Ingrediente original no encontrado' };
    }

    let recipeContext;
    if (recipeId) {
      const recipe = await recipeService.getRecipeById(recipeId);
      if (recipe) {
        recipeContext = {
          recipeType: recipe.category,
          cuisine: recipe.cuisine
        };
      }
    }

    const bestSub = await substitutionService.getBestSubstitute(originalIngredientId, recipeContext);

    if (!bestSub.substitution) {
      return {
        success: true,
        data: {
          found: false,
          message: `No encontré sustitutos adecuados para ${ingredient.name}`
        }
      };
    }

    const substituteIngredient = await ingredientService.getIngredientById(bestSub.substitution.substituteIngredientId);

    return {
      success: true,
      data: {
        found: true,
        original: {
          id: originalIngredientId,
          name: ingredient.name
        },
        substitute: {
          id: bestSub.substitution.substituteIngredientId,
          name: substituteIngredient?.name || 'Desconocido'
        },
        ratio: bestSub.substitution.ratio,
        confidence: bestSub.substitution.confidence,
        reason: bestSub.substitution.reason,
        impact: bestSub.analysis,
        userPreferred: bestSub.userPreferred
      }
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Error sugiriendo sustitución'
    };
  }
}

async function handleRecordSubstitutionPreference(args: Record<string, unknown>): Promise<FunctionResult> {
  try {
    const params: RecordSubstitutionPreferenceParams = {
      originalIngredientId: args.originalIngredientId as string,
      substituteIngredientId: args.substituteIngredientId as string,
      context: args.context as string[],
      successful: args.successful as boolean,
      notes: args.notes as string | undefined
    };

    await substitutionService.recordSubstitutionUsage(
      params.originalIngredientId,
      params.substituteIngredientId,
      params.context,
      params.successful,
      params.notes
    );

    // Also learn from this for the knowledge base
    if (params.successful) {
      const historyId = args.historyId as string | undefined;
      const recipeId = args.recipeId as string | undefined;

      if (recipeId) {
        await knowledgeService.learnFromSubstitution(
          params.originalIngredientId,
          params.substituteIngredientId,
          recipeId,
          historyId
        );
      }
    }

    return {
      success: true,
      data: {
        message: 'Preferencia de sustitución guardada exitosamente'
      }
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Error guardando preferencia'
    };
  }
}

// =============================================================================
// VARIANT HANDLERS
// =============================================================================

async function handleGetRecipeVariants(args: Record<string, unknown>): Promise<FunctionResult> {
  try {
    const recipeId = args.recipeId as string;
    const tags = args.tags as string[] | undefined;

    const variants = await variantService.getRecipeVariants(recipeId, tags);

    if (variants.length === 0) {
      return {
        success: true,
        data: {
          variants: [],
          message: 'No hay variantes disponibles para esta receta'
        }
      };
    }

    const summaries = variants.map(v => variantService.getVariantSummary(v));

    return {
      success: true,
      data: {
        variants: summaries,
        count: variants.length
      }
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Error obteniendo variantes'
    };
  }
}

async function handleCreateRecipeVariant(args: Record<string, unknown>): Promise<FunctionResult> {
  try {
    const params: CreateRecipeVariantParams = {
      baseRecipeId: args.baseRecipeId as string,
      name: args.name as string,
      description: args.description as string,
      modifications: args.modifications as CreateRecipeVariantParams['modifications'],
      tags: args.tags as string[]
    };

    const variant = await variantService.createVariant(params);

    return {
      success: true,
      data: {
        variantId: variant.id,
        message: `Variante "${variant.name}" creada exitosamente`
      }
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Error creando variante'
    };
  }
}

async function handleApplyVariant(args: Record<string, unknown>): Promise<FunctionResult> {
  try {
    const baseRecipeId = args.baseRecipeId as string;
    const variantId = args.variantId as string;

    const adaptedRecipe = await variantService.applyVariantToRecipe(baseRecipeId, variantId);

    return {
      success: true,
      data: {
        recipe: {
          id: adaptedRecipe.id,
          name: adaptedRecipe.name,
          description: adaptedRecipe.description,
          ingredients: adaptedRecipe.ingredients,
          steps: adaptedRecipe.steps,
          time: adaptedRecipe.time,
          difficulty: adaptedRecipe.difficulty,
          servings: adaptedRecipe.servings
        }
      }
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Error aplicando variante'
    };
  }
}

// =============================================================================
// HISTORY HANDLERS
// =============================================================================

async function handleStartCookingSession(args: Record<string, unknown>): Promise<FunctionResult> {
  try {
    const recipeId = args.recipeId as string;
    const variantId = args.variantId as string | undefined;
    const servingsMade = args.servingsMade as number | undefined;

    const history = await historyService.createHistoryEntry(recipeId, variantId, servingsMade);

    return {
      success: true,
      data: {
        sessionId: history.id,
        message: 'Sesión de cocina iniciada'
      }
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Error iniciando sesión'
    };
  }
}

async function handleAddCookingNote(args: Record<string, unknown>): Promise<FunctionResult> {
  try {
    const params: SaveCookingNoteParams = {
      historyId: args.historyId as string,
      stepNumber: args.stepNumber as number | undefined,
      content: args.content as string,
      type: args.type as SaveCookingNoteParams['type']
    };

    await historyService.addNoteToSession(params);

    // Learn from valuable notes
    if ((params.type === 'tip' || params.type === 'modification') && params.historyId) {
      const history = await historyService.getHistoryById(params.historyId);
      if (history) {
        await knowledgeService.learnFromSessionNote(
          params.content,
          params.type,
          history.recipeId,
          params.historyId
        );
      }
    }

    return {
      success: true,
      data: {
        message: 'Nota guardada exitosamente'
      }
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Error guardando nota'
    };
  }
}

async function handleCompleteCookingSession(args: Record<string, unknown>): Promise<FunctionResult> {
  try {
    const params: CompleteRecipeSessionParams = {
      historyId: args.historyId as string,
      rating: args.rating as number | undefined,
      wouldMakeAgain: args.wouldMakeAgain as boolean | undefined,
      completionNotes: args.completionNotes as string | undefined
    };

    await historyService.completeHistoryEntry(params);

    return {
      success: true,
      data: {
        message: 'Sesión de cocina completada exitosamente'
      }
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Error completando sesión'
    };
  }
}

async function handleGetRecipeHistory(args: Record<string, unknown>): Promise<FunctionResult> {
  try {
    const recipeId = args.recipeId as string | undefined;

    const histories = recipeId
      ? await historyService.getRecipeHistory(recipeId)
      : await historyService.getRecentHistory(10);

    return {
      success: true,
      data: {
        sessions: histories.map(h => ({
          id: h.id,
          recipeId: h.recipeId,
          startedAt: h.startedAt,
          completedAt: h.completedAt,
          completed: h.completed,
          rating: h.rating,
          servingsMade: h.servingsMade
        })),
        count: histories.length
      }
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Error obteniendo historial'
    };
  }
}

// =============================================================================
// KNOWLEDGE BASE HANDLERS
// =============================================================================

async function handleGetUserKnowledgeContext(args: Record<string, unknown>): Promise<FunctionResult> {
  try {
    const recipeId = args.recipeId as string | undefined;

    let context;
    if (recipeId) {
      const recipe = await recipeService.getRecipeById(recipeId);
      if (recipe) {
        context = {
          recipeType: recipe.category,
          ingredientIds: recipe.ingredients.map(i => i.ingredientId)
        };
      }
    }

    const llmContext = await knowledgeService.buildLLMContext(context);
    const structured = await knowledgeService.buildStructuredLLMContext(context);

    return {
      success: true,
      data: {
        textContext: llmContext,
        structured: structured
      }
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Error obteniendo contexto del usuario'
    };
  }
}

// =============================================================================
// ADAPTATION HANDLERS
// =============================================================================

async function handleAdaptRecipe(args: Record<string, unknown>): Promise<FunctionResult> {
  try {
    const params: AdaptRecipeParams = {
      recipeId: args.recipeId as string,
      missingIngredients: args.missingIngredients as string[] | undefined,
      missingAppliances: args.missingAppliances as string[] | undefined,
      dietaryRestrictions: args.dietaryRestrictions as string[] | undefined,
      servings: args.servings as number | undefined
    };

    const result = await adaptationService.adaptRecipe(params);

    return {
      success: true,
      data: {
        adaptedRecipe: {
          name: result.adaptedRecipe.name,
          description: result.adaptedRecipe.description,
          ingredients: result.adaptedRecipe.ingredients,
          steps: result.adaptedRecipe.steps,
          time: result.adaptedRecipe.time,
          servings: result.adaptedRecipe.servings
        },
        adaptations: result.adaptations,
        warnings: result.adaptations.warnings
      }
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Error adaptando receta'
    };
  }
}

// =============================================================================
// RECIPE GUIDE HANDLERS (Cooking in Progress)
// =============================================================================

async function handleExplainCookingStep(args: Record<string, unknown>): Promise<FunctionResult> {
  try {
    const recipeId = args.recipeId as string;
    const stepNumber = args.stepNumber as number;
    const question = args.question as string;

    const recipe = await recipeService.getRecipeById(recipeId);
    if (!recipe) {
      return { success: false, error: 'Receta no encontrada' };
    }

    const step = recipe.steps.find(s => s.step === stepNumber);
    if (!step) {
      return { success: false, error: 'Paso no encontrado' };
    }

    // Buscar conocimiento relacionado en la base de conocimiento del usuario
    const knowledge = await knowledgeService.getRelevantKnowledge({
      recipeTypes: [recipe.category],
      query: question,
    });

    return {
      success: true,
      data: {
        step: step.instruction,
        tip: step.tip,
        warning: step.warning,
        duration: step.duration,
        relatedKnowledge: knowledge.slice(0, 3), // Top 3 conocimientos relevantes
        // El LLM usará esto para generar explicación detallada
      },
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Error explicando paso de cocina',
    };
  }
}

async function handleSubstituteIngredientInCooking(args: Record<string, unknown>): Promise<FunctionResult> {
  try {
    const sessionId = args.sessionId as string;
    const recipeId = args.recipeId as string;
    const originalIngredientId = args.originalIngredientId as string;
    const substituteIngredientId = args.substituteIngredientId as string;
    const reason = args.reason as string | undefined;

    // 1. Obtener información de la sustitución
    const substitutions = await substitutionService.getSubstitutionsForIngredient(originalIngredientId);
    const substitution = substitutions.find(s => s.substituteIngredientId === substituteIngredientId);

    if (!substitution) {
      return {
        success: false,
        error: 'No se encontró información de sustitución para estos ingredientes',
      };
    }

    // 2. Obtener nombres de ingredientes
    const originalIng = await ingredientService.getIngredientById(originalIngredientId);
    const substituteIng = await ingredientService.getIngredientById(substituteIngredientId);

    if (!originalIng || !substituteIng) {
      return { success: false, error: 'Ingrediente no encontrado' };
    }

    // 3. Obtener receta original
    const recipe = await recipeService.getRecipeById(recipeId);
    if (!recipe) {
      return { success: false, error: 'Receta no encontrada' };
    }

    // 4. Encontrar el ingrediente en la receta y calcular nueva cantidad
    const recipeIngredient = recipe.ingredients.find(i => i.ingredientId === originalIngredientId);
    if (!recipeIngredient) {
      return { success: false, error: 'Ingrediente no está en esta receta' };
    }

    const newAmount = recipeIngredient.amount * substitution.ratio;

    // 5. Crear variante de la receta
    const variantName = `${recipe.name} - ${substituteIng.name} (${new Date().toLocaleDateString()})`;

    const variantParams: CreateRecipeVariantParams = {
      baseRecipeId: recipeId,
      name: variantName,
      description: `Variante con ${substituteIng.name} en lugar de ${originalIng.name}`,
      modifications: {
        ingredients: {
          changed: [{
            ingredientId: originalIngredientId,
            newIngredientId: substituteIngredientId,
            newAmount,
            newUnit: recipeIngredient.unit,
            reason: reason || 'Sustitución durante cocción',
          }],
        },
        steps: substitution.requiresAdjustments?.steps ? {
          modified: substitution.requiresAdjustments.steps.map(adj => ({
            stepNumber: adj.stepNumber,
            changes: { instruction: adj.suggestion },
          })),
        } : undefined,
      },
      tags: ['sustitucion-automatica'],
      createdBy: 'user',
    };

    const variant = await variantService.createVariant(variantParams);

    // 6. Registrar en sesión de cocina
    const noteParams: SaveCookingNoteParams = {
      historyId: sessionId,
      stepNumber: undefined,
      content: `Sustitución: ${originalIng.name} → ${substituteIng.name} (ratio ${substitution.ratio})`,
      type: 'substitution',
    };

    await historyService.addNoteToSession(noteParams);

    // 7. Retornar variante para que el frontend cambie a ella
    return {
      success: true,
      data: {
        variantId: variant.id,
        substitution: {
          originalName: originalIng.name,
          substituteName: substituteIng.name,
          ratio: substitution.ratio,
          newAmount,
          impact: substitution.impact,
          adjustments: substitution.requiresAdjustments,
        },
        message: 'Variante creada. La guía se actualizará automáticamente.',
      },
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Error sustituyendo ingrediente',
    };
  }
}

async function handleCreateTimerFromStep(args: Record<string, unknown>): Promise<FunctionResult> {
  try {
    const durationMinutes = args.durationMinutes as number;
    const label = args.label as string;
    const stepNumber = args.stepNumber as number | undefined;

    // Validar duración
    if (durationMinutes <= 0 || durationMinutes > 1440) { // Max 24 horas
      return {
        success: false,
        error: 'Duración inválida (debe ser entre 0 y 1440 minutos)',
      };
    }

    // El timer se creará en el frontend via evento
    // Esta función solo valida y retorna los datos
    return {
      success: true,
      data: {
        duration: durationMinutes,
        label,
        stepNumber,
        shouldCreateTimer: true,
      },
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Error creando timer',
    };
  }
}

async function handleGetCurrentStepDetails(args: Record<string, unknown>): Promise<FunctionResult> {
  try {
    const recipeId = args.recipeId as string;
    const stepNumber = args.stepNumber as number;

    const recipe = await recipeService.getRecipeDetails(recipeId);
    if (!recipe) {
      return { success: false, error: 'Receta no encontrada' };
    }

    const step = recipe.steps.find(s => s.step === stepNumber);
    if (!step) {
      return { success: false, error: 'Paso no encontrado' };
    }

    // Resolver ingredientes usados en este paso
    const ingredientsInStep = await Promise.all(
      step.ingredientsUsed.map(async (ingId) => {
        const recipeIng = recipe.ingredients.find(i => i.ingredientId === ingId);
        const catalogIng = await ingredientService.getIngredientById(ingId);

        return {
          id: ingId,
          name: recipeIng?.displayName || catalogIng?.name || 'Desconocido',
          amount: recipeIng?.amount,
          unit: recipeIng?.unit,
          preparation: recipeIng?.preparation,
        };
      })
    );

    return {
      success: true,
      data: {
        stepNumber: step.step,
        instruction: step.instruction,
        duration: step.duration,
        ingredients: ingredientsInStep,
        tip: step.tip,
        warning: step.warning,
      },
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Error obteniendo detalles del paso',
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

  // Appliance handlers
  getUserAppliances: handleGetUserAppliances,
  searchAppliances: handleSearchAppliances,
  hasAppliance: handleHasAppliance,

  // Substitution handlers
  suggestSubstitution: handleSuggestSubstitution,
  recordSubstitutionPreference: handleRecordSubstitutionPreference,

  // Variant handlers
  getRecipeVariants: handleGetRecipeVariants,
  createRecipeVariant: handleCreateRecipeVariant,
  applyVariant: handleApplyVariant,

  // History handlers
  startCookingSession: handleStartCookingSession,
  addCookingNote: handleAddCookingNote,
  completeCookingSession: handleCompleteCookingSession,
  getRecipeHistory: handleGetRecipeHistory,

  // Knowledge base handlers
  getUserKnowledgeContext: handleGetUserKnowledgeContext,

  // Adaptation handlers
  adaptRecipe: handleAdaptRecipe,

  // Recipe guide handlers (cooking in progress)
  explainCookingStep: handleExplainCookingStep,
  substituteIngredientInCooking: handleSubstituteIngredientInCooking,
  createTimerFromStep: handleCreateTimerFromStep,
  getCurrentStepDetails: handleGetCurrentStepDetails,
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
