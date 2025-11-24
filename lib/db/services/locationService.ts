/**
 * Location Service
 *
 * Handles all operations related to storage locations:
 * - CRUD operations for locations
 * - Default locations initialization
 * - Location validation
 */

import type { Location } from '../schemas/types';
import { DEFAULT_LOCATIONS } from '../schemas/types';
import {
  STORES,
  getAllItems,
  getItem,
  addItem,
  updateItem,
  deleteItem,
  generateId,
  countItems,
  getAllLocations as getLocationsFromDB,
  getLocationByName as getByName
} from '../stores/database';

// Default icons for common locations
const DEFAULT_ICONS: Record<string, string> = {
  'Refrigerador': '🧊',
  'Congelador': '❄️',
  'Alacena': '🗄️',
};

// =============================================================================
// INITIALIZATION
// =============================================================================

/**
 * Initialize default locations if none exist
 */
export async function initializeDefaultLocations(): Promise<void> {
  // Get existing locations
  const existingLocations = await getLocationsFromDB();
  const existingNames = new Set(existingLocations.map(l => l.name));

  // Only add default locations that don't already exist
  const locationsToAdd = DEFAULT_LOCATIONS.filter(name => !existingNames.has(name));

  if (locationsToAdd.length > 0) {
    // Get current max order
    const maxOrder = existingLocations.length > 0
      ? Math.max(...existingLocations.map(l => l.order))
      : -1;

    // Create default locations
    for (let i = 0; i < locationsToAdd.length; i++) {
      const name = locationsToAdd[i];
      const location: Location = {
        id: generateId('loc'),
        name,
        icon: DEFAULT_ICONS[name] || '📦',
        order: maxOrder + i + 1,
        isDefault: true,
      };

      try {
        await addItem(STORES.LOCATIONS, location);
      } catch (error) {
        // If adding fails (e.g., due to duplicate), skip this location
        console.warn(`Failed to add default location "${name}":`, error);
      }
    }
  }
}

// =============================================================================
// CRUD OPERATIONS
// =============================================================================

/**
 * Get all locations sorted by order
 */
export async function getAllLocations(): Promise<Location[]> {
  const locations = await getLocationsFromDB();

  // If no locations exist, initialize defaults and return
  if (locations.length === 0) {
    await initializeDefaultLocations();
    return getLocationsFromDB();
  }

  return locations;
}

/**
 * Get a single location by ID
 */
export async function getLocationById(id: string): Promise<Location | null> {
  return getItem<Location>(STORES.LOCATIONS, id);
}

/**
 * Get a location by name
 */
export async function getLocationByName(name: string): Promise<Location | null> {
  return getByName(name);
}

/**
 * Add a new location
 */
export async function addLocation(name: string, icon: string = '📦'): Promise<Location> {
  // Check if location with same name already exists
  const existing = await getByName(name);
  if (existing) {
    throw new Error(`Ya existe una ubicación con el nombre "${name}"`);
  }

  // Get current max order
  const allLocations = await getAllLocations();
  const maxOrder = allLocations.length > 0
    ? Math.max(...allLocations.map(l => l.order))
    : -1;

  const newLocation: Location = {
    id: generateId('loc'),
    name: name.trim(),
    icon,
    order: maxOrder + 1,
    isDefault: false,
  };

  return addItem(STORES.LOCATIONS, newLocation);
}

/**
 * Update a location
 */
export async function updateLocation(
  id: string,
  updates: Partial<Pick<Location, 'name' | 'icon' | 'order'>>
): Promise<Location> {
  const existing = await getLocationById(id);
  if (!existing) {
    throw new Error(`No se encontró la ubicación con ID "${id}"`);
  }

  // If updating name, check for duplicates
  if (updates.name && updates.name !== existing.name) {
    const duplicate = await getByName(updates.name);
    if (duplicate) {
      throw new Error(`Ya existe una ubicación con el nombre "${updates.name}"`);
    }
  }

  const updatedLocation: Location = {
    ...existing,
    ...updates,
    name: updates.name?.trim() || existing.name,
  };

  return updateItem(STORES.LOCATIONS, updatedLocation);
}

/**
 * Delete a location
 * Note: Cannot delete default locations
 */
export async function deleteLocation(id: string): Promise<void> {
  const existing = await getLocationById(id);
  if (!existing) {
    throw new Error(`No se encontró la ubicación con ID "${id}"`);
  }

  if (existing.isDefault) {
    throw new Error(`No se pueden eliminar ubicaciones predeterminadas`);
  }

  await deleteItem(STORES.LOCATIONS, id);
}

// =============================================================================
// UTILITY OPERATIONS
// =============================================================================

/**
 * Reorder locations
 */
export async function reorderLocations(orderedIds: string[]): Promise<void> {
  const locations = await getAllLocations();

  for (let i = 0; i < orderedIds.length; i++) {
    const location = locations.find(l => l.id === orderedIds[i]);
    if (location && location.order !== i) {
      await updateItem(STORES.LOCATIONS, { ...location, order: i });
    }
  }
}

/**
 * Get location names as array (useful for dropdowns)
 */
export async function getLocationNames(): Promise<string[]> {
  const locations = await getAllLocations();
  return locations.map(l => l.name);
}

/**
 * Check if a location name exists
 */
export async function locationExists(name: string): Promise<boolean> {
  const location = await getByName(name);
  return location !== null;
}

/**
 * Get location count
 */
export async function getLocationCount(): Promise<number> {
  return countItems(STORES.LOCATIONS);
}
