/**
 * User Appliance Service (Simplified)
 *
 * Handles simple CRUD operations for user's kitchen appliances.
 * Just tracks which appliances the user has.
 */

import type {
  UserAppliance,
  AddUserApplianceParams
} from '../schemas/types';
import {
  STORES,
  getAllItems,
  getItem,
  addItem,
  deleteItem,
  generateId,
  getUserAppliancesByApplianceId as getByApplianceId
} from '../stores/database';
import { getApplianceById } from './applianceService';

// =============================================================================
// CRUD OPERATIONS
// =============================================================================

/**
 * Get all user appliances
 */
export async function getAllUserAppliances(): Promise<UserAppliance[]> {
  const appliances = await getAllItems<UserAppliance>(STORES.USER_APPLIANCES);
  return appliances.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
}

/**
 * Get a single user appliance by ID
 */
export async function getUserApplianceById(id: string): Promise<UserAppliance | null> {
  return getItem<UserAppliance>(STORES.USER_APPLIANCES, id);
}

/**
 * Get user appliances by appliance ID from catalog
 */
export async function getUserAppliancesByApplianceId(applianceId: string): Promise<UserAppliance[]> {
  return getByApplianceId(applianceId);
}

/**
 * Add a new appliance to user's kitchen
 */
export async function addUserAppliance(params: AddUserApplianceParams): Promise<UserAppliance> {
  // Verify appliance exists in catalog
  const catalogAppliance = await getApplianceById(params.applianceId);
  if (!catalogAppliance) {
    throw new Error('Appliance not found in catalog');
  }

  // Check if user already has this appliance
  const existing = await getByApplianceId(params.applianceId);
  if (existing.length > 0) {
    throw new Error('Ya tienes este electrodoméstico');
  }

  // Create new user appliance
  const newAppliance: UserAppliance = {
    id: generateId('uapp'),
    applianceId: params.applianceId,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  return addItem(STORES.USER_APPLIANCES, newAppliance);
}

/**
 * Delete a user appliance
 */
export async function deleteUserAppliance(id: string): Promise<void> {
  return deleteItem(STORES.USER_APPLIANCES, id);
}

// =============================================================================
// UTILITY
// =============================================================================

/**
 * Check if user has a specific appliance (by catalog ID)
 */
export async function hasAppliance(applianceId: string): Promise<boolean> {
  const userAppliances = await getByApplianceId(applianceId);
  return userAppliances.length > 0;
}

/**
 * Get total count of user appliances
 */
export async function getUserAppliancesCount(): Promise<number> {
  const all = await getAllUserAppliances();
  return all.length;
}

/**
 * Get count of appliances by category
 */
export async function getApplianceCountByCategory(): Promise<Record<string, number>> {
  const userAppliances = await getAllUserAppliances();
  const counts: Record<string, number> = {};

  for (const userApp of userAppliances) {
    const catalogApp = await getApplianceById(userApp.applianceId);
    if (catalogApp) {
      counts[catalogApp.category] = (counts[catalogApp.category] || 0) + 1;
    }
  }

  return counts;
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
 * Export user appliances to JSON
 */
export async function exportUserAppliancesToJSON(): Promise<string> {
  return db.exportUserAppliances();
}

/**
 * Import user appliances from JSON
 */
export async function importUserAppliancesFromJSON(
  jsonData: string,
  clearExisting: boolean = false
): Promise<{ success: number; errors: string[] }> {
  return db.importUserAppliances(jsonData, clearExisting);
}
