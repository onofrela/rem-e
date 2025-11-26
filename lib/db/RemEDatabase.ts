/**
 * RemEDatabase - Centralized Database Management Class
 *
 * This class provides a unified interface for all database operations,
 * including import/export functionality for all data types.
 *
 * IMPORTANT: This is the ONLY place where JSON import/export should be handled.
 * All services should delegate to this class instead of implementing their own.
 */

import {
  openDatabase,
  closeDatabase,
  STORES,
  getAllItems,
  clearStore,
  bulkAdd
} from './stores/database';

import type {
  InventoryItem,
  CatalogIngredient,
  Recipe,
  CatalogAppliance,
  UserAppliance,
  RecipeHistory
} from './schemas/types';

// =============================================================================
// EXPORT RESULT TYPES
// =============================================================================

interface ExportMetadata {
  exportedAt: string;
  version: string;
  recordCount: number;
}

interface ExportResult<T> {
  metadata: ExportMetadata;
  data: T[];
}

interface ImportResult {
  success: number;
  errors: string[];
}

// =============================================================================
// REMEDATE - MAIN DATABASE CLASS
// =============================================================================

export class RemEDatabase {
  private static instance: RemEDatabase | null = null;
  private readonly version = '1.0.0';

  private constructor() {
    // Private constructor to enforce singleton pattern
  }

  /**
   * Get the singleton instance of RemEDatabase
   */
  public static getInstance(): RemEDatabase {
    if (!RemEDatabase.instance) {
      RemEDatabase.instance = new RemEDatabase();
    }
    return RemEDatabase.instance;
  }

  /**
   * Open database connection
   */
  public async connect(): Promise<IDBDatabase> {
    return openDatabase();
  }

  /**
   * Close database connection
   */
  public disconnect(): void {
    closeDatabase();
  }

  // ===========================================================================
  // GENERIC IMPORT/EXPORT METHODS
  // ===========================================================================

  /**
   * Generic export method for any store
   * Exports in a format compatible with legacy exports
   */
  private async exportStore<T>(
    storeName: string,
    dataPropertyName: string
  ): Promise<string> {
    const data = await getAllItems<T>(storeName);

    // Export in legacy-compatible format
    const result = {
      version: this.version,
      exportDate: new Date().toISOString().split('T')[0],
      count: data.length,
      [dataPropertyName]: data
    };

    return JSON.stringify(result, null, 2);
  }

  /**
   * Generic import method for any store with validation
   * Supports multiple JSON formats for backward compatibility:
   * 1. Direct array: [...]
   * 2. Legacy format: { ingredients: [...] } or { recipes: [...] }, etc.
   * 3. New format: { data: [...] }
   * 4. With metadata: { metadata: {...}, data: [...] }
   */
  private async importStore<T>(
    storeName: string,
    jsonData: string,
    dataPropertyName: string,
    clearExisting: boolean = false,
    validator?: (item: T) => boolean
  ): Promise<ImportResult> {
    const errors: string[] = [];

    try {
      // Parse JSON
      let parsedData = JSON.parse(jsonData);

      // Handle multiple formats
      let items: T[];

      if (Array.isArray(parsedData)) {
        // Format 1: Direct array [...]
        items = parsedData;
      } else if (parsedData[dataPropertyName] && Array.isArray(parsedData[dataPropertyName])) {
        // Format 2: Legacy format { ingredients: [...] }, { recipes: [...] }, etc.
        items = parsedData[dataPropertyName];
      } else if (parsedData.data && Array.isArray(parsedData.data)) {
        // Format 3: New format { data: [...] }
        items = parsedData.data;
      } else {
        throw new Error(`Invalid JSON format: expected array or object with "${dataPropertyName}" or "data" property`);
      }

      // Validate items if validator provided
      if (validator) {
        const validItems: T[] = [];
        items.forEach((item, index) => {
          if (validator(item)) {
            validItems.push(item);
          } else {
            errors.push(`Item at index ${index} failed validation`);
          }
        });
        items = validItems;
      }

      // Clear existing data if requested
      if (clearExisting) {
        await clearStore(storeName);
      }

      // Bulk add items
      const success = await bulkAdd(storeName, items);

      return { success, errors };

    } catch (error) {
      errors.push(error instanceof Error ? error.message : 'Unknown error during import');
      return { success: 0, errors };
    }
  }

  // ===========================================================================
  // INGREDIENTS - EXPORT/IMPORT
  // ===========================================================================

  /**
   * Export all ingredients to JSON
   */
  public async exportIngredients(): Promise<string> {
    return this.exportStore<CatalogIngredient>(
      STORES.INGREDIENTS_CACHE,
      'ingredients'
    );
  }

  /**
   * Import ingredients from JSON
   */
  public async importIngredients(
    jsonData: string,
    clearExisting: boolean = true
  ): Promise<ImportResult> {
    const validator = (item: CatalogIngredient): boolean => {
      return !!(
        item.id &&
        item.name &&
        item.normalizedName &&
        item.category &&
        Array.isArray(item.synonyms)
      );
    };

    return this.importStore<CatalogIngredient>(
      STORES.INGREDIENTS_CACHE,
      jsonData,
      'ingredients',
      clearExisting,
      validator
    );
  }

  // ===========================================================================
  // RECIPES - EXPORT/IMPORT
  // ===========================================================================

  /**
   * Export all recipes to JSON
   */
  public async exportRecipes(): Promise<string> {
    return this.exportStore<Recipe>(
      STORES.RECIPES_CACHE,
      'recipes'
    );
  }

  /**
   * Import recipes from JSON
   */
  public async importRecipes(
    jsonData: string,
    clearExisting: boolean = true
  ): Promise<ImportResult> {
    const validator = (item: Recipe): boolean => {
      return !!(
        item.id &&
        item.name &&
        Array.isArray(item.ingredients) &&
        Array.isArray(item.steps)
      );
    };

    return this.importStore<Recipe>(
      STORES.RECIPES_CACHE,
      jsonData,
      'recipes',
      clearExisting,
      validator
    );
  }

  // ===========================================================================
  // APPLIANCES - EXPORT/IMPORT
  // ===========================================================================

  /**
   * Export all appliances to JSON
   */
  public async exportAppliances(): Promise<string> {
    return this.exportStore<CatalogAppliance>(
      STORES.APPLIANCES_CACHE,
      'appliances'
    );
  }

  /**
   * Import appliances from JSON
   */
  public async importAppliances(
    jsonData: string,
    clearExisting: boolean = true
  ): Promise<ImportResult> {
    const validator = (item: CatalogAppliance): boolean => {
      return !!(
        item.id &&
        item.name &&
        item.category
      );
    };

    return this.importStore<CatalogAppliance>(
      STORES.APPLIANCES_CACHE,
      jsonData,
      'appliances',
      clearExisting,
      validator
    );
  }

  // ===========================================================================
  // INVENTORY - EXPORT/IMPORT
  // ===========================================================================

  /**
   * Export all inventory items to JSON
   */
  public async exportInventory(): Promise<string> {
    return this.exportStore<InventoryItem>(
      STORES.INVENTORY,
      'inventory'
    );
  }

  /**
   * Import inventory from JSON
   */
  public async importInventory(
    jsonData: string,
    clearExisting: boolean = true
  ): Promise<ImportResult> {
    const validator = (item: InventoryItem): boolean => {
      return !!(
        item.id &&
        item.ingredientId &&
        item.location &&
        typeof item.quantity === 'number'
      );
    };

    return this.importStore<InventoryItem>(
      STORES.INVENTORY,
      jsonData,
      'inventory',
      clearExisting,
      validator
    );
  }

  // ===========================================================================
  // USER APPLIANCES - EXPORT/IMPORT
  // ===========================================================================

  /**
   * Export all user appliances to JSON
   */
  public async exportUserAppliances(): Promise<string> {
    return this.exportStore<UserAppliance>(
      STORES.USER_APPLIANCES,
      'userAppliances'
    );
  }

  /**
   * Import user appliances from JSON
   */
  public async importUserAppliances(
    jsonData: string,
    clearExisting: boolean = true
  ): Promise<ImportResult> {
    const validator = (item: UserAppliance): boolean => {
      return !!(
        item.id &&
        item.applianceId
      );
    };

    return this.importStore<UserAppliance>(
      STORES.USER_APPLIANCES,
      jsonData,
      'userAppliances',
      clearExisting,
      validator
    );
  }

  // ===========================================================================
  // RECIPE HISTORY - EXPORT/IMPORT
  // ===========================================================================

  /**
   * Export all recipe history to JSON
   */
  public async exportRecipeHistory(): Promise<string> {
    return this.exportStore<RecipeHistory>(
      STORES.RECIPE_HISTORY,
      'recipeHistory'
    );
  }

  /**
   * Import recipe history from JSON
   */
  public async importRecipeHistory(
    jsonData: string,
    clearExisting: boolean = true
  ): Promise<ImportResult> {
    const validator = (item: RecipeHistory): boolean => {
      return !!(
        item.id &&
        item.recipeId &&
        item.startedAt
      );
    };

    return this.importStore<RecipeHistory>(
      STORES.RECIPE_HISTORY,
      jsonData,
      'recipeHistory',
      clearExisting,
      validator
    );
  }

  // ===========================================================================
  // BULK OPERATIONS
  // ===========================================================================

  /**
   * Export all data from all stores
   */
  public async exportAllData(): Promise<{
    ingredients: string;
    recipes: string;
    appliances: string;
    inventory: string;
    userAppliances: string;
    recipeHistory: string;
  }> {
    const [
      ingredients,
      recipes,
      appliances,
      inventory,
      userAppliances,
      recipeHistory
    ] = await Promise.all([
      this.exportIngredients(),
      this.exportRecipes(),
      this.exportAppliances(),
      this.exportInventory(),
      this.exportUserAppliances(),
      this.exportRecipeHistory()
    ]);

    return {
      ingredients,
      recipes,
      appliances,
      inventory,
      userAppliances,
      recipeHistory
    };
  }

  /**
   * Get database statistics
   */
  public async getStats(): Promise<{
    ingredientsCount: number;
    recipesCount: number;
    appliancesCount: number;
    inventoryCount: number;
    userAppliancesCount: number;
    recipeHistoryCount: number;
  }> {
    const [
      ingredients,
      recipes,
      appliances,
      inventory,
      userAppliances,
      recipeHistory
    ] = await Promise.all([
      getAllItems<CatalogIngredient>(STORES.INGREDIENTS_CACHE),
      getAllItems<Recipe>(STORES.RECIPES_CACHE),
      getAllItems<CatalogAppliance>(STORES.APPLIANCES_CACHE),
      getAllItems<InventoryItem>(STORES.INVENTORY),
      getAllItems<UserAppliance>(STORES.USER_APPLIANCES),
      getAllItems<RecipeHistory>(STORES.RECIPE_HISTORY)
    ]);

    return {
      ingredientsCount: ingredients.length,
      recipesCount: recipes.length,
      appliancesCount: appliances.length,
      inventoryCount: inventory.length,
      userAppliancesCount: userAppliances.length,
      recipeHistoryCount: recipeHistory.length
    };
  }
}

// Export singleton instance
export const db = RemEDatabase.getInstance();
