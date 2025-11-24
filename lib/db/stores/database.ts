/**
 * IndexedDB Database Manager for Rem-E
 *
 * Manages multiple object stores:
 * - inventory: User's pantry items
 * - ingredientsCache: Cached catalog ingredients
 * - recipesCache: Cached recipes
 * - userPreferences: App settings
 */

import type {
  InventoryItem,
  CatalogIngredient,
  Recipe,
  Location
} from '../schemas/types';

// =============================================================================
// DATABASE CONFIGURATION
// =============================================================================

const DB_NAME = 'RemEDatabase';
const DB_VERSION = 3; // Increment when schema changes

// Store names
export const STORES = {
  INVENTORY: 'inventory',
  INGREDIENTS_CACHE: 'ingredientsCache',
  RECIPES_CACHE: 'recipesCache',
  USER_PREFERENCES: 'userPreferences',
  LOCATIONS: 'locations',
} as const;

// =============================================================================
// DATABASE CONNECTION
// =============================================================================

let dbInstance: IDBDatabase | null = null;

/**
 * Opens a connection to the IndexedDB database
 * Creates all necessary object stores if they don't exist
 */
export function openDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    // Return cached instance if available
    if (dbInstance) {
      resolve(dbInstance);
      return;
    }

    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = () => {
      reject(new Error(`Failed to open IndexedDB: ${request.error?.message}`));
    };

    request.onsuccess = () => {
      dbInstance = request.result;

      // Handle connection close
      dbInstance.onclose = () => {
        dbInstance = null;
      };

      resolve(dbInstance);
    };

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;

      // Create Inventory store
      if (!db.objectStoreNames.contains(STORES.INVENTORY)) {
        const inventoryStore = db.createObjectStore(STORES.INVENTORY, { keyPath: 'id' });
        inventoryStore.createIndex('ingredientId', 'ingredientId', { unique: false });
        inventoryStore.createIndex('location', 'location', { unique: false });
        inventoryStore.createIndex('expirationDate', 'expirationDate', { unique: false });
        inventoryStore.createIndex('createdAt', 'createdAt', { unique: false });
      }

      // Create Ingredients Cache store
      if (!db.objectStoreNames.contains(STORES.INGREDIENTS_CACHE)) {
        const ingredientsStore = db.createObjectStore(STORES.INGREDIENTS_CACHE, { keyPath: 'id' });
        ingredientsStore.createIndex('normalizedName', 'normalizedName', { unique: false });
        ingredientsStore.createIndex('category', 'category', { unique: false });
        ingredientsStore.createIndex('isCommon', 'isCommon', { unique: false });
      }

      // Create Recipes Cache store
      if (!db.objectStoreNames.contains(STORES.RECIPES_CACHE)) {
        const recipesStore = db.createObjectStore(STORES.RECIPES_CACHE, { keyPath: 'id' });
        recipesStore.createIndex('category', 'category', { unique: false });
        recipesStore.createIndex('difficulty', 'difficulty', { unique: false });
        recipesStore.createIndex('time', 'time', { unique: false });
        recipesStore.createIndex('cuisine', 'cuisine', { unique: false });
      }

      // Create User Preferences store
      if (!db.objectStoreNames.contains(STORES.USER_PREFERENCES)) {
        db.createObjectStore(STORES.USER_PREFERENCES, { keyPath: 'key' });
      }

      // Create Locations store
      if (!db.objectStoreNames.contains(STORES.LOCATIONS)) {
        const locationsStore = db.createObjectStore(STORES.LOCATIONS, { keyPath: 'id' });
        locationsStore.createIndex('name', 'name', { unique: true });
        locationsStore.createIndex('order', 'order', { unique: false });
      }
    };
  });
}

/**
 * Closes the database connection
 */
export function closeDatabase(): void {
  if (dbInstance) {
    dbInstance.close();
    dbInstance = null;
  }
}

/**
 * Generates a unique ID
 */
export function generateId(prefix: string = ''): string {
  const timestamp = Date.now().toString(36);
  const random = Math.random().toString(36).substring(2, 9);
  return prefix ? `${prefix}_${timestamp}_${random}` : `${timestamp}_${random}`;
}

// =============================================================================
// GENERIC CRUD OPERATIONS
// =============================================================================

/**
 * Generic add operation
 */
export async function addItem<T>(storeName: string, item: T): Promise<T> {
  const db = await openDatabase();

  return new Promise((resolve, reject) => {
    const transaction = db.transaction([storeName], 'readwrite');
    const store = transaction.objectStore(storeName);
    const request = store.add(item);

    request.onsuccess = () => resolve(item);
    request.onerror = () => {
      const error = request.error;
      let errorMessage = `Failed to add item to ${storeName}`;

      // Provide more specific error messages
      if (error?.name === 'ConstraintError') {
        errorMessage += ': Item with this key or unique index value already exists';
      } else if (error) {
        errorMessage += `: ${error.message}`;
      }

      reject(new Error(errorMessage));
    };
  });
}

/**
 * Generic get by ID operation
 */
export async function getItem<T>(storeName: string, id: string): Promise<T | null> {
  const db = await openDatabase();

  return new Promise((resolve, reject) => {
    const transaction = db.transaction([storeName], 'readonly');
    const store = transaction.objectStore(storeName);
    const request = store.get(id);

    request.onsuccess = () => resolve(request.result || null);
    request.onerror = () => reject(new Error(`Failed to get item from ${storeName}`));
  });
}

/**
 * Generic get all operation
 */
export async function getAllItems<T>(storeName: string): Promise<T[]> {
  const db = await openDatabase();

  return new Promise((resolve, reject) => {
    const transaction = db.transaction([storeName], 'readonly');
    const store = transaction.objectStore(storeName);
    const request = store.getAll();

    request.onsuccess = () => resolve(request.result || []);
    request.onerror = () => reject(new Error(`Failed to get all items from ${storeName}`));
  });
}

/**
 * Generic update operation
 */
export async function updateItem<T>(storeName: string, item: T): Promise<T> {
  const db = await openDatabase();

  return new Promise((resolve, reject) => {
    const transaction = db.transaction([storeName], 'readwrite');
    const store = transaction.objectStore(storeName);
    const request = store.put(item);

    request.onsuccess = () => resolve(item);
    request.onerror = () => reject(new Error(`Failed to update item in ${storeName}`));
  });
}

/**
 * Generic delete operation
 */
export async function deleteItem(storeName: string, id: string): Promise<void> {
  const db = await openDatabase();

  return new Promise((resolve, reject) => {
    const transaction = db.transaction([storeName], 'readwrite');
    const store = transaction.objectStore(storeName);
    const request = store.delete(id);

    request.onsuccess = () => resolve();
    request.onerror = () => reject(new Error(`Failed to delete item from ${storeName}`));
  });
}

/**
 * Generic clear all operation
 */
export async function clearStore(storeName: string): Promise<void> {
  const db = await openDatabase();

  return new Promise((resolve, reject) => {
    const transaction = db.transaction([storeName], 'readwrite');
    const store = transaction.objectStore(storeName);
    const request = store.clear();

    request.onsuccess = () => resolve();
    request.onerror = () => reject(new Error(`Failed to clear ${storeName}`));
  });
}

/**
 * Generic get by index operation
 */
export async function getByIndex<T>(
  storeName: string,
  indexName: string,
  value: IDBValidKey
): Promise<T[]> {
  const db = await openDatabase();

  return new Promise((resolve, reject) => {
    const transaction = db.transaction([storeName], 'readonly');
    const store = transaction.objectStore(storeName);
    const index = store.index(indexName);
    const request = index.getAll(value);

    request.onsuccess = () => resolve(request.result || []);
    request.onerror = () => reject(new Error(`Failed to get items by index from ${storeName}`));
  });
}

/**
 * Generic count operation
 */
export async function countItems(storeName: string): Promise<number> {
  const db = await openDatabase();

  return new Promise((resolve, reject) => {
    const transaction = db.transaction([storeName], 'readonly');
    const store = transaction.objectStore(storeName);
    const request = store.count();

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(new Error(`Failed to count items in ${storeName}`));
  });
}

/**
 * Bulk add operation for efficiency
 */
export async function bulkAdd<T>(storeName: string, items: T[]): Promise<number> {
  const db = await openDatabase();
  let successCount = 0;

  return new Promise((resolve, reject) => {
    const transaction = db.transaction([storeName], 'readwrite');
    const store = transaction.objectStore(storeName);

    transaction.oncomplete = () => resolve(successCount);
    transaction.onerror = () => reject(new Error(`Bulk add failed for ${storeName}`));

    for (const item of items) {
      const request = store.put(item); // Using put to allow updates
      request.onsuccess = () => successCount++;
    }
  });
}

// =============================================================================
// INVENTORY SPECIFIC OPERATIONS
// =============================================================================

/**
 * Get inventory items by location
 */
export async function getInventoryByLocation(location: string): Promise<InventoryItem[]> {
  return getByIndex<InventoryItem>(STORES.INVENTORY, 'location', location);
}

/**
 * Get inventory items expiring within X days
 */
export async function getExpiringInventory(withinDays: number): Promise<InventoryItem[]> {
  const allItems = await getAllItems<InventoryItem>(STORES.INVENTORY);
  const today = new Date();
  const futureDate = new Date(today.getTime() + withinDays * 24 * 60 * 60 * 1000);

  return allItems.filter(item => {
    if (!item.expirationDate) return false;
    const expDate = new Date(item.expirationDate);
    return expDate <= futureDate;
  });
}

/**
 * Get inventory item by ingredient ID
 */
export async function getInventoryByIngredientId(ingredientId: string): Promise<InventoryItem[]> {
  return getByIndex<InventoryItem>(STORES.INVENTORY, 'ingredientId', ingredientId);
}

// =============================================================================
// INGREDIENTS CACHE OPERATIONS
// =============================================================================

/**
 * Search ingredients by name (fuzzy search in cache)
 */
export async function searchIngredientsByName(searchTerm: string): Promise<CatalogIngredient[]> {
  const allIngredients = await getAllItems<CatalogIngredient>(STORES.INGREDIENTS_CACHE);
  const lowerSearch = searchTerm.toLowerCase();

  return allIngredients.filter(ing =>
    ing.name.toLowerCase().includes(lowerSearch) ||
    ing.normalizedName.toLowerCase().includes(lowerSearch) ||
    ing.synonyms.some(syn => syn.toLowerCase().includes(lowerSearch))
  );
}

/**
 * Get ingredients by category
 */
export async function getIngredientsByCategory(category: string): Promise<CatalogIngredient[]> {
  return getByIndex<CatalogIngredient>(STORES.INGREDIENTS_CACHE, 'category', category);
}

/**
 * Get common ingredients
 */
export async function getCommonIngredients(): Promise<CatalogIngredient[]> {
  return getByIndex<CatalogIngredient>(STORES.INGREDIENTS_CACHE, 'isCommon', true);
}

// =============================================================================
// RECIPES CACHE OPERATIONS
// =============================================================================

/**
 * Get recipes by category
 */
export async function getRecipesByCategory(category: string): Promise<Recipe[]> {
  return getByIndex<Recipe>(STORES.RECIPES_CACHE, 'category', category);
}

/**
 * Get recipes by difficulty
 */
export async function getRecipesByDifficulty(difficulty: string): Promise<Recipe[]> {
  return getByIndex<Recipe>(STORES.RECIPES_CACHE, 'difficulty', difficulty);
}

/**
 * Get recipes by cuisine
 */
export async function getRecipesByCuisine(cuisine: string): Promise<Recipe[]> {
  return getByIndex<Recipe>(STORES.RECIPES_CACHE, 'cuisine', cuisine);
}

/**
 * Search recipes by name or description
 */
export async function searchRecipes(searchTerm: string): Promise<Recipe[]> {
  const allRecipes = await getAllItems<Recipe>(STORES.RECIPES_CACHE);
  const lowerSearch = searchTerm.toLowerCase();

  return allRecipes.filter(recipe =>
    recipe.name.toLowerCase().includes(lowerSearch) ||
    recipe.description.toLowerCase().includes(lowerSearch) ||
    recipe.tags.some(tag => tag.toLowerCase().includes(lowerSearch))
  );
}

// =============================================================================
// USER PREFERENCES OPERATIONS
// =============================================================================

interface UserPreference {
  key: string;
  value: unknown;
  updatedAt: Date;
}

/**
 * Set a user preference
 */
export async function setPreference(key: string, value: unknown): Promise<void> {
  const pref: UserPreference = {
    key,
    value,
    updatedAt: new Date(),
  };
  await updateItem(STORES.USER_PREFERENCES, pref);
}

/**
 * Get a user preference
 */
export async function getPreference<T>(key: string, defaultValue: T): Promise<T> {
  const pref = await getItem<UserPreference>(STORES.USER_PREFERENCES, key);
  return pref ? (pref.value as T) : defaultValue;
}

// =============================================================================
// DATABASE UTILITIES
// =============================================================================

/**
 * Export all data from a store as JSON
 */
export async function exportStoreToJSON(storeName: string): Promise<string> {
  const data = await getAllItems(storeName);
  return JSON.stringify(data, null, 2);
}

/**
 * Import data from JSON to a store
 */
export async function importJSONToStore<T>(
  storeName: string,
  jsonData: string,
  clearExisting: boolean = false
): Promise<{ success: number; errors: string[] }> {
  const errors: string[] = [];

  try {
    const data = JSON.parse(jsonData) as T[];

    if (!Array.isArray(data)) {
      throw new Error('JSON data must be an array');
    }

    if (clearExisting) {
      await clearStore(storeName);
    }

    const success = await bulkAdd(storeName, data);
    return { success, errors };

  } catch (error) {
    errors.push(error instanceof Error ? error.message : 'Unknown error');
    return { success: 0, errors };
  }
}

/**
 * Get database statistics
 */
export async function getDatabaseStats(): Promise<{
  inventoryCount: number;
  ingredientsCacheCount: number;
  recipesCacheCount: number;
  locationsCount: number;
}> {
  const [inventoryCount, ingredientsCacheCount, recipesCacheCount, locationsCount] = await Promise.all([
    countItems(STORES.INVENTORY),
    countItems(STORES.INGREDIENTS_CACHE),
    countItems(STORES.RECIPES_CACHE),
    countItems(STORES.LOCATIONS),
  ]);

  return { inventoryCount, ingredientsCacheCount, recipesCacheCount, locationsCount };
}

// =============================================================================
// LOCATIONS OPERATIONS
// =============================================================================

/**
 * Get all locations sorted by order
 */
export async function getAllLocations(): Promise<Location[]> {
  const locations = await getAllItems<Location>(STORES.LOCATIONS);
  return locations.sort((a, b) => a.order - b.order);
}

/**
 * Get location by name
 */
export async function getLocationByName(name: string): Promise<Location | null> {
  const locations = await getByIndex<Location>(STORES.LOCATIONS, 'name', name);
  return locations.length > 0 ? locations[0] : null;
}
