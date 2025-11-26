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

/**
 * IMPORTANT: This service uses ONLY IndexedDB as the source of truth.
 * There are NO JSON fallbacks. All data must be in IndexedDB.
 * Use import/export functions to manage appliances data.
 */

/**
 * Initialize appliances cache in IndexedDB
 * Note: This only checks if the store exists. Data must be imported separately.
 */
export async function initializeAppliancesCache(): Promise<void> {
  const existingCount = await countItems(STORES.APPLIANCES_CACHE);

  if (existingCount === 0) {
    console.warn('⚠️ No appliances found in IndexedDB. Please import appliances data.');
  } else {
    console.log(`Found ${existingCount} appliances in IndexedDB`);
  }
}

/**
 * Clear all appliances from IndexedDB
 * WARNING: This will DELETE ALL APPLIANCES!
 * Only use this when resetting the database or before importing new data.
 */
export async function clearAllAppliances(): Promise<void> {
  await clearStore(STORES.APPLIANCES_CACHE);
  console.warn('⚠️ All appliances have been cleared from IndexedDB.');
}

/**
 * @deprecated This function has been removed. IndexedDB is the only source of truth.
 * To reset appliances, export your current data first, then use clearAllAppliances() and importAppliancesFromJSON().
 */
export async function resetAppliancesToDefaults(): Promise<number> {
  throw new Error('resetAppliancesToDefaults() has been removed. Use clearAllAppliances() and importAppliancesFromJSON() instead.');
}

/**
 * @deprecated This function has been removed. IndexedDB is the only source of truth.
 */
export async function refreshAppliancesCache(): Promise<number> {
  throw new Error('refreshAppliancesCache() has been removed. IndexedDB is the only source of truth.');
}

// =============================================================================
// QUERY OPERATIONS
// =============================================================================

/**
 * Get all appliances from IndexedDB
 * IMPORTANT: This only reads from IndexedDB. No JSON fallback.
 */
export async function getAllAppliances(): Promise<CatalogAppliance[]> {
  return getAllItems<CatalogAppliance>(STORES.APPLIANCES_CACHE);
}

/**
 * Get a single appliance by ID
 */
export async function getApplianceById(id: string): Promise<CatalogAppliance | null> {
  // Get from IndexedDB - the single source of truth
  const cached = await getItem<CatalogAppliance>(STORES.APPLIANCES_CACHE, id);
  if (cached) {
    return cached;
  }

  // If not in cache, it doesn't exist (cache should always be initialized)
  return null;
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
 * IMPORTANT: Import/Export functionality has been moved to RemEDatabase class.
 * These functions now delegate to the centralized database manager.
 * DO NOT add new import/export logic here - use RemEDatabase instead.
 */

import { db } from '../RemEDatabase';

/**
 * Export appliances to JSON with IDs preserved
 * IMPORTANT: IDs are included to maintain proper references
 */
export async function exportAppliancesToJSON(): Promise<string> {
  return db.exportAppliances();
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
  return db.importAppliances(jsonData, clearExisting);
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

// =============================================================================
// FUNCTIONALITY-BASED SEARCH
// =============================================================================

/**
 * Get all appliances that can perform a specific functionality
 * @param functionality - The functionality to search for (e.g., "stovetop_cooking")
 * @returns Array of appliances that support this functionality
 */
export async function getAppliancesByFunctionality(
  functionality: string
): Promise<CatalogAppliance[]> {
  const allAppliances = await getAllAppliances();
  return allAppliances.filter(app =>
    app.functionalities && app.functionalities.includes(functionality as any)
  );
}

/**
 * Check if user has any appliance that can perform a specific functionality
 * @param functionality - The functionality needed (e.g., "stovetop_cooking")
 * @param userApplianceIds - Array of appliance IDs that the user owns
 * @returns Object with hasCapability boolean and matching appliances
 */
export async function checkUserHasFunctionality(
  functionality: string,
  userApplianceIds: string[]
): Promise<{
  hasCapability: boolean;
  matchingAppliances: CatalogAppliance[];
}> {
  const allAppliances = await getAllAppliances();

  // Find appliances that user owns and support this functionality
  const matchingAppliances = allAppliances.filter(app =>
    userApplianceIds.includes(app.id) &&
    app.functionalities &&
    app.functionalities.includes(functionality as any)
  );

  return {
    hasCapability: matchingAppliances.length > 0,
    matchingAppliances
  };
}

/**
 * Resolve an appliance ID or functionality to actual appliance(s)
 * This allows recipes to use either specific appliance IDs or generic functionalities
 * @param idOrFunctionality - Can be an appliance ID (e.g., "stovetop_gas") or functionality (e.g., "stovetop_cooking")
 * @returns Array of appliances that match
 */
export async function resolveApplianceOrFunctionality(
  idOrFunctionality: string
): Promise<CatalogAppliance[]> {
  const allAppliances = await getAllAppliances();

  // First, try to find by ID (exact match)
  const exactMatch = allAppliances.find(app => app.id === idOrFunctionality);
  if (exactMatch) {
    return [exactMatch];
  }

  // If not found, treat as functionality and find all appliances with that functionality
  return allAppliances.filter(app =>
    app.functionalities && app.functionalities.includes(idOrFunctionality as any)
  );
}
