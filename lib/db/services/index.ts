/**
 * Services Module Exports
 *
 * Centralized exports for all database services.
 */

// Ingredient Service
export {
  initializeIngredientsCache,
  refreshIngredientsCache,
  getAllIngredients,
  getIngredientById,
  getIngredientsByIds,
  searchIngredients,
  fuzzySearchIngredients,
  getIngredientsByCategory,
  getCommonIngredients,
  getCategories,
  getSubstitutes,
  getCompatibleIngredients,
  findIngredientByName,
  areIngredientsSame,
  calculateCalories,
  calculateNutrition,
  exportIngredientsToJSON,
  exportIngredientsClean,
  importIngredientsFromJSON,
} from './ingredientService';

// Recipe Service
export {
  initializeRecipesCache,
  refreshRecipesCache,
  getAllRecipes,
  getRecipeById,
  searchRecipes,
  getRecipesByCategory,
  getRecipesByDifficulty,
  getRecipesByTime,
  getRecipeCategories,
  getCuisines,
  getRecipesByIngredients,
  getRecipesWithIngredient,
  getRecipeIngredientIds,
  getIngredientsForStep,
  calculatePortions,
  calculateRecipeNutrition,
  getRecipeTimeBreakdown,
  getRecipeDetails,
  exportRecipesToJSON,
} from './recipeService';

// Inventory Service
export {
  getAllInventory,
  getInventory,
  getInventoryItemById,
  getInventoryByIngredientId,
  getInventoryByLocation,
  addToInventory,
  updateInventoryItem,
  consumeFromInventory,
  deleteInventoryItem,
  getExpiringItems,
  getLowStockItems,
  generateInventoryAlerts,
  getAlertCounts,
  getTotalQuantity,
  hasEnoughIngredient,
  checkRecipeIngredients,
  getInventorySummary,
  exportInventoryToJSON,
  importInventoryFromJSON,
} from './inventoryService';

// Compatibility Service
export {
  getCompatibilityPairs,
  getCompatibleIngredients as getCompatibleIngredientsWithScore,
  getCompatibilityScore,
  getFlavorProfile,
  getIngredientsByFlavor,
  getSimilarFlavorIngredients,
  suggestComplementaryIngredients,
  suggestIngredientsForCuisine,
  analyzeFlavorBalance,
  getGroupCompatibility,
} from './compatibilityService';

// Location Service
export {
  initializeDefaultLocations,
  getAllLocations,
  getLocationById,
  getLocationByName,
  addLocation,
  updateLocation,
  deleteLocation,
  reorderLocations,
  getLocationNames,
  locationExists,
  getLocationCount,
} from './locationService';
