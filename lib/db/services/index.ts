/**
 * Services Module Exports
 *
 * Centralized exports for all database services.
 */

// RemEDatabase - Centralized Database Manager
export { RemEDatabase, db } from '../RemEDatabase';

// Ingredient Service
export {
  initializeIngredientsCache,
  refreshIngredientsCache,
  resetIngredientsToDefaults,
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
  resetRecipesToDefaults,
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
  exportRecipesClean,
  importRecipesFromJSON,
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

// Recipe History Service
export {
  getAllRecipeHistory,
  getRecipeHistoryById,
  getHistoryForRecipe,
  getCompletedRecipeHistory,
  getInProgressRecipeHistory,
  createRecipeHistory,
  completeRecipeHistory,
  updateRecipeHistory,
  deleteRecipeHistory,
  getCookingStatistics,
  getRecipeCookCount,
  getRecipeAverageRating,
  exportRecipeHistoryToJSON,
  importRecipeHistoryFromJSON,
} from './recipeHistoryService';

// Recommendation Service
export {
  getDailyRecommendation,
  invalidateRecommendationCache,
} from './recommendationService';

// Meal Plan Service
export {
  createMealPlan,
  getMealPlanById,
  getAllMealPlans,
  getActiveMealPlan,
  updateMealPlan,
  updateMealInPlan,
  deleteMealPlan,
  generatePlanName,
  getNextWeekDates,
} from './mealPlanService';

// User Preferences Service
export {
  getUserPreferences,
  saveUserPreferences,
  updateUserPreferences,
} from './userPreferencesService';

// Planning Algorithm Service
export {
  generatePlanFromQuestionnaire,
  generatePlanWithLLM,
} from './planningAlgorithmService';

// Cook Recommendation Service
export {
  getTopRecommendedRecipes,
  getRecipesByIngredients,
} from './cookRecommendationService';
