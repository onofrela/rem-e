/**
 * IndexedDB Database for Ingredient Storage
 * Provides persistent local storage for ingredient data
 */

export interface Ingredient {
  id: string;
  normalizedName: string; // Used for searching and duplicate detection
  displayName: string; // The human-readable name shown to users
  synonyms: string[]; // Alternative names for this ingredient
  category: string;
  metadata: {
    estimatedWeight?: number; // Peso en gramos
    calories?: string;
    brand?: string;
    quantity?: string; // Cantidad disponible
    unit?: string; // Unidad de medida
  };
  createdAt: Date;
  updatedAt: Date;
}

const DB_NAME = 'RemEIngredientsDB';
const DB_VERSION = 1;
const STORE_NAME = 'ingredients';

/**
 * Opens a connection to the IndexedDB database
 */
function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = () => {
      reject(new Error('Failed to open IndexedDB'));
    };

    request.onsuccess = () => {
      resolve(request.result);
    };

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;

      // Create object store if it doesn't exist
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        const objectStore = db.createObjectStore(STORE_NAME, { keyPath: 'id' });

        // Create index on normalizedName for fast searching
        objectStore.createIndex('normalizedName', 'normalizedName', { unique: false });
        objectStore.createIndex('category', 'category', { unique: false });
        objectStore.createIndex('createdAt', 'createdAt', { unique: false });
      }
    };
  });
}

/**
 * Generates a UUID for ingredient IDs
 */
export function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Adds a new ingredient to the database
 */
export async function addIngredient(ingredient: Omit<Ingredient, 'id' | 'createdAt' | 'updatedAt'>): Promise<Ingredient> {
  const db = await openDB();

  const newIngredient: Ingredient = {
    ...ingredient,
    id: generateId(),
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  return new Promise((resolve, reject) => {
    const transaction = db.transaction([STORE_NAME], 'readwrite');
    const objectStore = transaction.objectStore(STORE_NAME);
    const request = objectStore.add(newIngredient);

    request.onsuccess = () => {
      resolve(newIngredient);
    };

    request.onerror = () => {
      reject(new Error('Failed to add ingredient'));
    };

    transaction.oncomplete = () => {
      db.close();
    };
  });
}

/**
 * Gets an ingredient by its ID
 */
export async function getIngredient(id: string): Promise<Ingredient | null> {
  const db = await openDB();

  return new Promise((resolve, reject) => {
    const transaction = db.transaction([STORE_NAME], 'readonly');
    const objectStore = transaction.objectStore(STORE_NAME);
    const request = objectStore.get(id);

    request.onsuccess = () => {
      resolve(request.result || null);
    };

    request.onerror = () => {
      reject(new Error('Failed to get ingredient'));
    };

    transaction.oncomplete = () => {
      db.close();
    };
  });
}

/**
 * Gets all ingredients from the database
 */
export async function getAllIngredients(): Promise<Ingredient[]> {
  const db = await openDB();

  return new Promise((resolve, reject) => {
    const transaction = db.transaction([STORE_NAME], 'readonly');
    const objectStore = transaction.objectStore(STORE_NAME);
    const request = objectStore.getAll();

    request.onsuccess = () => {
      resolve(request.result || []);
    };

    request.onerror = () => {
      reject(new Error('Failed to get all ingredients'));
    };

    transaction.oncomplete = () => {
      db.close();
    };
  });
}

/**
 * Searches for ingredients by normalized name
 */
export async function searchIngredientsByName(normalizedName: string): Promise<Ingredient[]> {
  const db = await openDB();

  return new Promise((resolve, reject) => {
    const transaction = db.transaction([STORE_NAME], 'readonly');
    const objectStore = transaction.objectStore(STORE_NAME);
    const index = objectStore.index('normalizedName');
    const request = index.getAll(normalizedName);

    request.onsuccess = () => {
      resolve(request.result || []);
    };

    request.onerror = () => {
      reject(new Error('Failed to search ingredients'));
    };

    transaction.oncomplete = () => {
      db.close();
    };
  });
}

/**
 * Searches for ingredients that match any of the provided synonyms
 */
export async function searchIngredientsBySynonyms(synonyms: string[]): Promise<Ingredient[]> {
  const allIngredients = await getAllIngredients();

  return allIngredients.filter(ingredient => {
    // Check if any of the ingredient's synonyms match any of the search synonyms
    return ingredient.synonyms.some(syn => synonyms.includes(syn));
  });
}

/**
 * Updates an existing ingredient
 */
export async function updateIngredient(id: string, updates: Partial<Omit<Ingredient, 'id' | 'createdAt'>>): Promise<Ingredient> {
  const db = await openDB();
  const existing = await getIngredient(id);

  if (!existing) {
    db.close();
    throw new Error('Ingredient not found');
  }

  const updatedIngredient: Ingredient = {
    ...existing,
    ...updates,
    id: existing.id,
    createdAt: existing.createdAt,
    updatedAt: new Date(),
  };

  return new Promise((resolve, reject) => {
    const transaction = db.transaction([STORE_NAME], 'readwrite');
    const objectStore = transaction.objectStore(STORE_NAME);
    const request = objectStore.put(updatedIngredient);

    request.onsuccess = () => {
      resolve(updatedIngredient);
    };

    request.onerror = () => {
      reject(new Error('Failed to update ingredient'));
    };

    transaction.oncomplete = () => {
      db.close();
    };
  });
}

/**
 * Deletes an ingredient by its ID
 */
export async function deleteIngredient(id: string): Promise<void> {
  const db = await openDB();

  return new Promise((resolve, reject) => {
    const transaction = db.transaction([STORE_NAME], 'readwrite');
    const objectStore = transaction.objectStore(STORE_NAME);
    const request = objectStore.delete(id);

    request.onsuccess = () => {
      resolve();
    };

    request.onerror = () => {
      reject(new Error('Failed to delete ingredient'));
    };

    transaction.oncomplete = () => {
      db.close();
    };
  });
}

/**
 * Searches for ingredients with fuzzy matching
 * Returns ingredients whose normalized name contains the search term
 */
export async function fuzzySearchIngredients(searchTerm: string): Promise<Ingredient[]> {
  const allIngredients = await getAllIngredients();
  const lowerSearchTerm = searchTerm.toLowerCase();

  return allIngredients.filter(ingredient =>
    ingredient.normalizedName.includes(lowerSearchTerm) ||
    ingredient.displayName.toLowerCase().includes(lowerSearchTerm) ||
    ingredient.synonyms.some(syn => syn.toLowerCase().includes(lowerSearchTerm))
  );
}

/**
 * Gets ingredients by category
 */
export async function getIngredientsByCategory(category: string): Promise<Ingredient[]> {
  const db = await openDB();

  return new Promise((resolve, reject) => {
    const transaction = db.transaction([STORE_NAME], 'readonly');
    const objectStore = transaction.objectStore(STORE_NAME);
    const index = objectStore.index('category');
    const request = index.getAll(category);

    request.onsuccess = () => {
      resolve(request.result || []);
    };

    request.onerror = () => {
      reject(new Error('Failed to get ingredients by category'));
    };

    transaction.oncomplete = () => {
      db.close();
    };
  });
}

/**
 * Clears all ingredients from the database (useful for testing)
 */
export async function clearAllIngredients(): Promise<void> {
  const db = await openDB();

  return new Promise((resolve, reject) => {
    const transaction = db.transaction([STORE_NAME], 'readwrite');
    const objectStore = transaction.objectStore(STORE_NAME);
    const request = objectStore.clear();

    request.onsuccess = () => {
      resolve();
    };

    request.onerror = () => {
      reject(new Error('Failed to clear ingredients'));
    };

    transaction.oncomplete = () => {
      db.close();
    };
  });
}

/**
 * Exports all ingredients to a JSON file
 * Returns the JSON data as a string
 * Only exports user-editable fields (excludes id, createdAt, updatedAt)
 */
export async function exportIngredientsToJSON(): Promise<string> {
  const ingredients = await getAllIngredients();

  // Export only the essential fields that users should edit
  const exportData = ingredients.map(ing => ({
    normalizedName: ing.normalizedName,
    displayName: ing.displayName,
    synonyms: ing.synonyms,
    category: ing.category,
    metadata: ing.metadata,
  }));

  return JSON.stringify(exportData, null, 2);
}

/**
 * Imports ingredients from a JSON string
 * Validates the data and adds it to the database
 * Ignores id, createdAt, and updatedAt fields - the database will generate these automatically
 * @param jsonData - JSON string containing an array of ingredients
 * @param replaceExisting - If true, clears existing data before importing
 */
export async function importIngredientsFromJSON(
  jsonData: string,
  replaceExisting: boolean = false
): Promise<{ success: number; errors: string[] }> {
  const errors: string[] = [];
  let success = 0;

  try {
    const data = JSON.parse(jsonData);

    if (!Array.isArray(data)) {
      throw new Error('JSON data must be an array of ingredients');
    }

    // Clear existing data if requested
    if (replaceExisting) {
      await clearAllIngredients();
    }

    const db = await openDB();

    for (const item of data) {
      try {
        // Validate required fields
        if (!item.normalizedName || !item.displayName || !item.category) {
          errors.push(`Skipping invalid ingredient: missing required fields (${item.displayName || 'unknown'})`);
          continue;
        }

        // Create new ingredient with auto-generated id and timestamps
        // Ignore any id, createdAt, or updatedAt from the import data
        const ingredient: Ingredient = {
          id: generateId(), // Always generate new ID
          normalizedName: item.normalizedName,
          displayName: item.displayName,
          synonyms: Array.isArray(item.synonyms) ? item.synonyms : [],
          category: item.category,
          metadata: item.metadata || {},
          createdAt: new Date(), // Always use current date
          updatedAt: new Date(), // Always use current date
        };

        // Add to database
        await new Promise<void>((resolve, reject) => {
          const transaction = db.transaction([STORE_NAME], 'readwrite');
          const objectStore = transaction.objectStore(STORE_NAME);
          const request = objectStore.put(ingredient);

          request.onsuccess = () => {
            success++;
            resolve();
          };

          request.onerror = () => {
            errors.push(`Failed to import ingredient: ${ingredient.displayName}`);
            resolve(); // Continue with other items
          };
        });
      } catch (itemError) {
        errors.push(`Error processing ingredient: ${itemError instanceof Error ? itemError.message : 'unknown error'}`);
      }
    }

    db.close();

    return { success, errors };
  } catch (error) {
    throw new Error(`Failed to parse JSON: ${error instanceof Error ? error.message : 'unknown error'}`);
  }
}

/**
 * Gets the count of ingredients in the database
 */
export async function getIngredientCount(): Promise<number> {
  const db = await openDB();

  return new Promise((resolve, reject) => {
    const transaction = db.transaction([STORE_NAME], 'readonly');
    const objectStore = transaction.objectStore(STORE_NAME);
    const request = objectStore.count();

    request.onsuccess = () => {
      resolve(request.result);
    };

    request.onerror = () => {
      reject(new Error('Failed to count ingredients'));
    };

    transaction.oncomplete = () => {
      db.close();
    };
  });
}
