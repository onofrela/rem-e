/**
 * Database Stores Module Exports
 *
 * Centralized exports for IndexedDB operations.
 */

export {
  // Database management
  openDatabase,
  closeDatabase,
  generateId,
  STORES,

  // Generic CRUD operations
  addItem,
  getItem,
  getAllItems,
  updateItem,
  deleteItem,
  clearStore,
  getByIndex,
  countItems,
  bulkAdd,

  // Inventory specific
  getInventoryByLocation,
  getExpiringInventory,
  getInventoryByIngredientId,

  // Ingredients cache specific
  searchIngredientsByName,
  getIngredientsByCategory,
  getCommonIngredients,

  // Recipes cache specific
  getRecipesByCategory,
  getRecipesByDifficulty,
  getRecipesByCuisine,
  searchRecipes,

  // User preferences
  setPreference,
  getPreference,

  // Utilities
  exportStoreToJSON,
  importJSONToStore,
  getDatabaseStats,
} from './database';
