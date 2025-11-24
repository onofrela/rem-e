/**
 * Schema Types Module Exports
 *
 * All TypeScript interfaces and types for the database.
 */

export type {
  // Nutrition
  NutritionInfo,
  StorageInfo,
  NutritionPerServing,

  // Ingredient types
  IngredientCategory,
  IngredientSubcategory,
  CatalogIngredient,
  RecipeIngredient,

  // Recipe types
  RecipeDifficulty,
  RecipeCategory,
  RecipeStep,
  IngredientGroup,
  RecipeScaling,
  Recipe,

  // Inventory types
  StorageLocation,
  Location,
  InventoryItem,
  AlertType,
  AlertPriority,
  InventoryAlert,

  // Compatibility types
  CompatibilityPair,
  FlavorProfile,
  CompatibilityData,

  // LLM function parameter types
  SearchIngredientsParams,
  GetInventoryParams,
  AddToInventoryParams,
  UpdateInventoryParams,
  GetRecipesByIngredientsParams,
  CalculatePortionsParams,

  // LLM result types
  RecipeSearchResult,
  ScaledIngredient,
  PortionCalculationResult,

  // Database metadata
  DatabaseMetadata,
  IngredientsDatabase,
  RecipesDatabase,
} from './types';

export { DEFAULT_LOCATIONS } from './types';
