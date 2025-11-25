/**
 * Appliance Service
 *
 * Handles all operations related to appliances catalog:
 * - Loading appliances from JSON
 * - Caching in IndexedDB
 * - Searching and filtering
 * - Normalization and synonyms
 */

import type {
  CatalogAppliance,
  ApplianceCategory,
  SearchAppliancesParams,
  AppliancesDatabase
} from '../schemas/types';
import {
  STORES,
  getAllItems,
  getItem,
  bulkAdd,
  clearStore,
  searchAppliancesByName as searchInCache,
  getAppliancesByCategory as getByCategory,
  getCommonAppliances as getCommon,
  countItems
} from '../stores/database';

// =============================================================================
// DATA LOADING
// =============================================================================

let appliancesData: CatalogAppliance[] | null = null;

/**
 * Load appliances from JSON file
 */
async function loadAppliancesFromJSON(): Promise<CatalogAppliance[]> {
  if (appliancesData) {
    return appliancesData;
  }

  try {
    // Fetch from public directory
    const response = await fetch('/data/appliances.json');
    if (!response.ok) {
      throw new Error('Failed to load appliances.json');
    }

    const data: AppliancesDatabase = await response.json();
    appliancesData = data.appliances;
    return appliancesData!;
  } catch (error) {
    console.error('Error loading appliances:', error);
    return [];
  }
}

/**
 * Initialize appliances cache in IndexedDB
 */
export async function initializeAppliancesCache(): Promise<void> {
  const existingCount = await countItems(STORES.APPLIANCES_CACHE);

  if (existingCount === 0) {
    const appliances = await loadAppliancesFromJSON();
    await bulkAdd(STORES.APPLIANCES_CACHE, appliances);
    console.log(`Initialized ${appliances.length} appliances in cache`);
  }
}

/**
 * Force refresh the appliances cache
 */
export async function refreshAppliancesCache(): Promise<number> {
  await clearStore(STORES.APPLIANCES_CACHE);
  appliancesData = null;

  const appliances = await loadAppliancesFromJSON();
  await bulkAdd(STORES.APPLIANCES_CACHE, appliances);
  return appliances.length;
}

// =============================================================================
// QUERY OPERATIONS
// =============================================================================

/**
 * Get all appliances from cache or JSON
 */
export async function getAllAppliances(): Promise<CatalogAppliance[]> {
  // Try cache first
  const cached = await getAllItems<CatalogAppliance>(STORES.APPLIANCES_CACHE);
  if (cached.length > 0) {
    return cached;
  }

  // Fallback to JSON and initialize cache
  await initializeAppliancesCache();
  return getAllItems<CatalogAppliance>(STORES.APPLIANCES_CACHE);
}

/**
 * Get a single appliance by ID
 */
export async function getApplianceById(id: string): Promise<CatalogAppliance | null> {
  // Try cache first
  const cached = await getItem<CatalogAppliance>(STORES.APPLIANCES_CACHE, id);
  if (cached) {
    return cached;
  }

  // Fallback to JSON search
  const all = await loadAppliancesFromJSON();
  return all.find(app => app.id === id) || null;
}

/**
 * Get multiple appliances by IDs
 */
export async function getAppliancesByIds(ids: string[]): Promise<CatalogAppliance[]> {
  const all = await getAllAppliances();
  return all.filter(app => ids.includes(app.id));
}

/**
 * Search appliances with various filters
 */
export async function searchAppliances(
  params: SearchAppliancesParams
): Promise<CatalogAppliance[]> {
  const { query, category, limit = 20 } = params;

  let results: CatalogAppliance[];

  // If category filter, start with that
  if (category) {
    results = await getByCategory(category);
  } else {
    results = await getAllAppliances();
  }

  // Apply text search if query provided
  if (query && query.trim()) {
    const normalized = query.toLowerCase().trim();
    results = results.filter(app =>
      app.name.toLowerCase().includes(normalized) ||
      app.normalizedName.toLowerCase().includes(normalized) ||
      app.synonyms.some(syn => syn.toLowerCase().includes(normalized)) ||
      app.description?.toLowerCase().includes(normalized)
    );
  }

  // Sort by relevance (isCommon first, then by name)
  results.sort((a, b) => {
    if (a.isCommon && !b.isCommon) return -1;
    if (!a.isCommon && b.isCommon) return 1;
    return a.name.localeCompare(b.name);
  });

  return results.slice(0, limit);
}

/**
 * Fuzzy search appliances by name/synonym
 */
export async function fuzzySearchAppliances(query: string): Promise<CatalogAppliance[]> {
  if (!query || !query.trim()) {
    return [];
  }

  const results = await searchInCache(query);

  // Sort by relevance
  const normalized = query.toLowerCase().trim();
  return results.sort((a, b) => {
    // Exact name match scores highest
    const aExact = a.name.toLowerCase() === normalized ? 10 : 0;
    const bExact = b.name.toLowerCase() === normalized ? 10 : 0;
    if (aExact !== bExact) return bExact - aExact;

    // Name starts with query
    const aStarts = a.name.toLowerCase().startsWith(normalized) ? 5 : 0;
    const bStarts = b.name.toLowerCase().startsWith(normalized) ? 5 : 0;
    if (aStarts !== bStarts) return bStarts - aStarts;

    // Common appliances rank higher
    if (a.isCommon && !b.isCommon) return -1;
    if (!a.isCommon && b.isCommon) return 1;

    // Alphabetical
    return a.name.localeCompare(b.name);
  });
}

/**
 * Get appliances by category
 */
export async function getAppliancesByCategory(
  category: ApplianceCategory
): Promise<CatalogAppliance[]> {
  const appliances = await getByCategory(category);
  return appliances.sort((a, b) => {
    if (a.isCommon && !b.isCommon) return -1;
    if (!a.isCommon && b.isCommon) return 1;
    return a.name.localeCompare(b.name);
  });
}

/**
 * Get common appliances (most frequently owned)
 */
export async function getCommonAppliances(): Promise<CatalogAppliance[]> {
  const appliances = await getCommon();
  return appliances.sort((a, b) => a.name.localeCompare(b.name));
}

/**
 * Find appliance by name (exact or synonym match)
 */
export async function findApplianceByName(name: string): Promise<CatalogAppliance | null> {
  const normalized = name.toLowerCase().trim();
  const all = await getAllAppliances();

  return all.find(app =>
    app.name.toLowerCase() === normalized ||
    app.normalizedName.toLowerCase() === normalized ||
    app.synonyms.some(syn => syn.toLowerCase() === normalized)
  ) || null;
}

/**
 * Check if two appliance names refer to the same appliance
 */
export async function areAppliancesSame(name1: string, name2: string): Promise<boolean> {
  const app1 = await findApplianceByName(name1);
  const app2 = await findApplianceByName(name2);

  if (!app1 || !app2) return false;
  return app1.id === app2.id;
}

// =============================================================================
// RELATIONSHIPS
// =============================================================================

/**
 * Get alternative appliances (substitutes)
 */
export async function getAlternatives(applianceId: string): Promise<CatalogAppliance[]> {
  const appliance = await getApplianceById(applianceId);
  if (!appliance || !appliance.alternatives.length) {
    return [];
  }

  return getAppliancesByIds(appliance.alternatives);
}

/**
 * Get compatible appliances (work well together)
 */
export async function getCompatibleAppliances(applianceId: string): Promise<CatalogAppliance[]> {
  const appliance = await getApplianceById(applianceId);
  if (!appliance || !appliance.compatibleWith.length) {
    return [];
  }

  return getAppliancesByIds(appliance.compatibleWith);
}

// =============================================================================
// STATISTICS
// =============================================================================

/**
 * Get appliance category distribution
 */
export async function getApplianceCategoryStats(): Promise<Record<ApplianceCategory, number>> {
  const all = await getAllAppliances();

  const stats: Record<string, number> = {};
  for (const app of all) {
    stats[app.category] = (stats[app.category] || 0) + 1;
  }

  return stats as Record<ApplianceCategory, number>;
}

/**
 * Get total appliance count
 */
export async function getApplianceCount(): Promise<number> {
  return countItems(STORES.APPLIANCES_CACHE);
}

// =============================================================================
// IMPORT/EXPORT
// =============================================================================

/**
 * Export appliances to JSON with IDs preserved
 * IMPORTANT: IDs are included to maintain proper references
 */
export async function exportAppliancesToJSON(): Promise<string> {
  const appliances = await getAllAppliances();

  const data: AppliancesDatabase = {
    metadata: {
      version: '1.0.0',
      lastUpdated: new Date().toISOString(),
      itemCount: appliances.length
    },
    appliances
  };

  return JSON.stringify(data, null, 2);
}

/**
 * Import appliances from JSON
 * IMPORTANT: Preserves IDs from the JSON to maintain references
 * @param jsonData - JSON string with appliances array
 * @param clearExisting - If true, clears existing appliances before import
 */
export async function importAppliancesFromJSON(
  jsonData: string,
  clearExisting: boolean = true
): Promise<{ success: number; errors: string[] }> {
  const errors: string[] = [];

  try {
    const data: AppliancesDatabase = JSON.parse(jsonData);

    if (!data.appliances || !Array.isArray(data.appliances)) {
      throw new Error('Formato JSON inválido: debe contener un array "appliances"');
    }

    // Validate that appliances have required fields including ID
    for (let i = 0; i < data.appliances.length; i++) {
      const app = data.appliances[i];
      if (!app.id || !app.name || !app.category) {
        errors.push(`Electrodoméstico ${i + 1}: falta id, name o category`);
      }
    }

    if (clearExisting) {
      await clearStore(STORES.APPLIANCES_CACHE);
      appliancesData = null; // Clear memory cache
    }

    const success = await bulkAdd(STORES.APPLIANCES_CACHE, data.appliances);

    return { success, errors };
  } catch (error) {
    if (error instanceof SyntaxError) {
      errors.push('El archivo no es un JSON válido');
    } else {
      errors.push(error instanceof Error ? error.message : 'Error desconocido');
    }
    return { success: 0, errors };
  }
}

/**
 * Get appliances summary info
 */
export async function getAppliancesSummary(): Promise<{
  total: number;
  common: number;
  categories: Record<ApplianceCategory, number>;
}> {
  const all = await getAllAppliances();
  const common = all.filter(app => app.isCommon).length;
  const categories = await getApplianceCategoryStats();

  return {
    total: all.length,
    common,
    categories
  };
}
