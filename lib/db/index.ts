/**
 * Rem-E Database Module
 *
 * Central exports for all database functionality:
 * - Schemas and types
 * - IndexedDB stores
 * - Services (ingredients, recipes, inventory, compatibility)
 * - LLM integration (function calling for LM Studio)
 */

// =============================================================================
// TYPES AND SCHEMAS
// =============================================================================

export * from './schemas';

// =============================================================================
// SERVICES
// =============================================================================

export * from './services';

// =============================================================================
// LLM INTEGRATION
// =============================================================================

export * from './llm';

// =============================================================================
// DATABASE STORES
// =============================================================================

export * from './stores';

// =============================================================================
// LEGACY EXPORTS (for backward compatibility)
// =============================================================================

// IndexedDB operations (original)
export {
  type Ingredient,
  generateId,
  addIngredient,
  getIngredient,
  getAllIngredients as getAllIngredientsLegacy,
  searchIngredientsByName as searchIngredientsByNameLegacy,
  searchIngredientsBySynonyms,
  updateIngredient,
  deleteIngredient,
  fuzzySearchIngredients as fuzzySearchIngredientsLegacy,
  getIngredientsByCategory as getIngredientsByCategoryLegacy,
  clearAllIngredients,
  exportIngredientsToJSON as exportIngredientsToJSONLegacy,
  importIngredientsFromJSON as importIngredientsFromJSONLegacy,
  getIngredientCount,
} from './indexedDB';

// Normalizer utilities
export {
  normalizeName,
  findSimilarIngredients,
  checkIfIngredientExists,
  generateAutomaticSynonyms,
  calculateSimilarity,
  fuzzySearchIngredientsWithScore,
  cleanInputText,
  extractKeywords,
} from './normalizer';

// Synonyms
export {
  SYNONYM_GROUPS,
  createSynonymMap,
  getSynonyms,
  areSynonyms,
} from './synonyms';

// =============================================================================
// INITIALIZATION
// =============================================================================

import { initializeIngredientsCache } from './services/ingredientService';
import { initializeRecipesCache } from './services/recipeService';

/**
 * Initialize all database caches
 * Call this on app startup
 */
export async function initializeDatabase(): Promise<void> {
  await Promise.all([
    initializeIngredientsCache(),
    initializeRecipesCache(),
  ]);
  console.log('Database initialized');
}
