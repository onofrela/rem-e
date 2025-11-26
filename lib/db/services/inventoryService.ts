/**
 * Inventory Service
 *
 * Handles all operations related to user's inventory:
 * - CRUD operations for inventory items
 * - Expiration alerts
 * - Low stock alerts
 * - Inventory consumption tracking
 */

import type {
  InventoryItem,
  InventoryAlert,
  StorageLocation,
  AddToInventoryParams,
  UpdateInventoryParams,
  GetInventoryParams
} from '../schemas/types';
import {
  STORES,
  getAllItems,
  getItem,
  addItem,
  updateItem,
  deleteItem,
  generateId,
  getInventoryByLocation as getByLocation,
  getExpiringInventory as getExpiring,
  getInventoryByIngredientId as getByIngredientId
} from '../stores/database';
import { getIngredientById } from './ingredientService';

// =============================================================================
// CRUD OPERATIONS
// =============================================================================

/**
 * Get all inventory items
 */
export async function getAllInventory(): Promise<InventoryItem[]> {
  return getAllItems<InventoryItem>(STORES.INVENTORY);
}

/**
 * Get inventory with optional filters
 */
export async function getInventory(params?: GetInventoryParams): Promise<InventoryItem[]> {
  let items = await getAllInventory();

  if (params?.location) {
    items = items.filter(item => item.location === params.location);
  }

  if (params?.expiringWithinDays) {
    const today = new Date();
    const futureDate = new Date(today.getTime() + params.expiringWithinDays * 24 * 60 * 60 * 1000);

    items = items.filter(item => {
      if (!item.expirationDate) return false;
      const expDate = new Date(item.expirationDate);
      return expDate <= futureDate;
    });
  }

  return items;
}

/**
 * Get a single inventory item by ID
 */
export async function getInventoryItemById(id: string): Promise<InventoryItem | null> {
  return getItem<InventoryItem>(STORES.INVENTORY, id);
}

/**
 * Get inventory items by ingredient ID
 * (User might have the same ingredient in multiple locations)
 */
export async function getInventoryByIngredientId(ingredientId: string): Promise<InventoryItem[]> {
  return getByIngredientId(ingredientId);
}

/**
 * Get inventory items by storage location
 */
export async function getInventoryByLocation(location: StorageLocation): Promise<InventoryItem[]> {
  return getByLocation(location);
}

/**
 * Add a new item to inventory
 */
export async function addToInventory(params: AddToInventoryParams): Promise<InventoryItem> {
  // Check if we already have this ingredient in the same location
  const existingItems = await getByIngredientId(params.ingredientId);
  const sameLocation = existingItems.find(item => item.location === params.location);

  if (sameLocation) {
    // Update quantity instead of creating new entry
    const updatedQuantity = sameLocation.quantity + params.quantity;
    return updateInventoryItem(sameLocation.id, {
      quantity: updatedQuantity,
      expirationDate: params.expirationDate || sameLocation.expirationDate,
    });
  }

  // Create new inventory item
  const newItem: InventoryItem = {
    id: generateId('inv'),
    ingredientId: params.ingredientId,
    quantity: params.quantity,
    unit: params.unit,
    location: params.location,
    purchaseDate: new Date().toISOString().split('T')[0],
    expirationDate: params.expirationDate,
    brand: params.brand,
    notes: params.notes,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  return addItem(STORES.INVENTORY, newItem);
}

/**
 * Update an inventory item
 */
export async function updateInventoryItem(
  id: string,
  updates: Partial<UpdateInventoryParams>
): Promise<InventoryItem> {
  const existing = await getInventoryItemById(id);
  if (!existing) {
    throw new Error('Inventory item not found');
  }

  const updatedItem: InventoryItem = {
    ...existing,
    ...updates,
    updatedAt: new Date(),
  };

  return updateItem(STORES.INVENTORY, updatedItem);
}

/**
 * Remove quantity from inventory (when cooking)
 */
export async function consumeFromInventory(
  ingredientId: string,
  quantityToConsume: number,
  preferredLocation?: StorageLocation
): Promise<{ consumed: number; remaining: number }> {
  const items = await getByIngredientId(ingredientId);

  if (items.length === 0) {
    return { consumed: 0, remaining: 0 };
  }

  // Sort by expiration date (consume soonest expiring first) and prefer location
  items.sort((a, b) => {
    // Preferred location first
    if (preferredLocation) {
      if (a.location === preferredLocation && b.location !== preferredLocation) return -1;
      if (a.location !== preferredLocation && b.location === preferredLocation) return 1;
    }

    // Then by expiration date
    if (a.expirationDate && b.expirationDate) {
      return new Date(a.expirationDate).getTime() - new Date(b.expirationDate).getTime();
    }
    if (a.expirationDate) return -1;
    if (b.expirationDate) return 1;
    return 0;
  });

  let remaining = quantityToConsume;
  let totalConsumed = 0;

  for (const item of items) {
    if (remaining <= 0) break;

    if (item.quantity <= remaining) {
      // Consume entire item
      totalConsumed += item.quantity;
      remaining -= item.quantity;
      await deleteInventoryItem(item.id);
    } else {
      // Partial consumption
      totalConsumed += remaining;
      await updateInventoryItem(item.id, {
        quantity: item.quantity - remaining,
      });
      remaining = 0;
    }
  }

  // Calculate total remaining across all items
  const updatedItems = await getByIngredientId(ingredientId);
  const totalRemaining = updatedItems.reduce((sum, item) => sum + item.quantity, 0);

  return { consumed: totalConsumed, remaining: totalRemaining };
}

/**
 * Delete an inventory item
 */
export async function deleteInventoryItem(id: string): Promise<void> {
  return deleteItem(STORES.INVENTORY, id);
}

// =============================================================================
// ALERTS
// =============================================================================

/**
 * Get expiring items within X days
 */
export async function getExpiringItems(withinDays: number): Promise<InventoryItem[]> {
  return getExpiring(withinDays);
}

/**
 * Get low stock items
 */
export async function getLowStockItems(): Promise<InventoryItem[]> {
  const all = await getAllInventory();
  return all.filter(item =>
    item.lowStockThreshold !== undefined &&
    item.quantity <= item.lowStockThreshold
  );
}

/**
 * Generate all inventory alerts
 */
export async function generateInventoryAlerts(): Promise<InventoryAlert[]> {
  const alerts: InventoryAlert[] = [];
  const today = new Date().toISOString().split('T')[0];
  const allItems = await getAllInventory();

  for (const item of allItems) {
    // Get ingredient name
    const ingredient = await getIngredientById(item.ingredientId);
    const ingredientName = ingredient?.name || 'Ingrediente desconocido';

    // Check expiration
    if (item.expirationDate) {
      const daysUntil = getDaysUntilExpiration(item.expirationDate);

      if (daysUntil < 0) {
        // Expired
        alerts.push({
          id: `alert-exp-${item.id}`,
          type: 'expired',
          ingredientId: item.ingredientId,
          ingredientName,
          message: `${ingredientName} ha caducado hace ${Math.abs(daysUntil)} día${Math.abs(daysUntil) !== 1 ? 's' : ''}`,
          priority: 'high',
          date: today,
        });
      } else if (daysUntil <= 2) {
        // Expiring soon
        let message: string;
        if (daysUntil === 0) {
          message = `${ingredientName} caduca hoy`;
        } else if (daysUntil === 1) {
          message = `${ingredientName} caduca mañana`;
        } else {
          message = `${ingredientName} caduca en ${daysUntil} días`;
        }

        alerts.push({
          id: `alert-exp-${item.id}`,
          type: 'expiring_soon',
          ingredientId: item.ingredientId,
          ingredientName,
          message,
          priority: daysUntil === 0 ? 'high' : 'medium',
          date: today,
        });
      }
    }

    // Check low stock
    if (item.lowStockThreshold !== undefined && item.quantity <= item.lowStockThreshold) {
      const isOutOfStock = item.quantity === 0;

      alerts.push({
        id: `alert-stock-${item.id}`,
        type: 'low_stock',
        ingredientId: item.ingredientId,
        ingredientName,
        message: isOutOfStock
          ? `${ingredientName} está agotado`
          : `${ingredientName} tiene poco stock (${item.quantity} ${item.unit})`,
        priority: isOutOfStock ? 'high' : 'medium',
        date: today,
      });
    }
  }

  // Sort by priority (high first, then medium, then low)
  const priorityOrder = { high: 0, medium: 1, low: 2 };
  alerts.sort((a, b) => priorityOrder[a.priority] - priorityOrder[b.priority]);

  return alerts;
}

/**
 * Get alert counts by type
 */
export async function getAlertCounts(): Promise<{
  expired: number;
  expiringSoon: number;
  lowStock: number;
  total: number;
}> {
  const alerts = await generateInventoryAlerts();

  return {
    expired: alerts.filter(a => a.type === 'expired').length,
    expiringSoon: alerts.filter(a => a.type === 'expiring_soon').length,
    lowStock: alerts.filter(a => a.type === 'low_stock').length,
    total: alerts.length,
  };
}

// =============================================================================
// UTILITY FUNCTIONS
// =============================================================================

/**
 * Calculate days until expiration
 */
function getDaysUntilExpiration(expirationDate: string): number {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const expDate = new Date(expirationDate);
  expDate.setHours(0, 0, 0, 0);

  const diffTime = expDate.getTime() - today.getTime();
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
}

/**
 * Get total quantity of an ingredient across all locations
 */
export async function getTotalQuantity(ingredientId: string): Promise<{
  total: number;
  unit: string;
  byLocation: { location: StorageLocation; quantity: number }[];
}> {
  const items = await getByIngredientId(ingredientId);

  if (items.length === 0) {
    return { total: 0, unit: '', byLocation: [] };
  }

  const unit = items[0].unit;
  const total = items.reduce((sum, item) => sum + item.quantity, 0);
  const byLocation = items.map(item => ({
    location: item.location,
    quantity: item.quantity,
  }));

  return { total, unit, byLocation };
}

/**
 * Check if user has enough of an ingredient
 */
export async function hasEnoughIngredient(
  ingredientId: string,
  requiredAmount: number
): Promise<{ hasEnough: boolean; available: number; shortage: number }> {
  const { total } = await getTotalQuantity(ingredientId);
  const hasEnough = total >= requiredAmount;
  const shortage = hasEnough ? 0 : requiredAmount - total;

  return { hasEnough, available: total, shortage };
}

/**
 * Check if user has all ingredients for a recipe
 */
export async function checkRecipeIngredients(
  recipeIngredients: { ingredientId: string; amount: number; optional: boolean }[]
): Promise<{
  canMake: boolean;
  available: { ingredientId: string; amount: number }[];
  missing: { ingredientId: string; amount: number; shortage: number }[];
  optional: { ingredientId: string; amount: number; available: number }[];
}> {
  const available: { ingredientId: string; amount: number }[] = [];
  const missing: { ingredientId: string; amount: number; shortage: number }[] = [];
  const optional: { ingredientId: string; amount: number; available: number }[] = [];

  for (const ing of recipeIngredients) {
    const check = await hasEnoughIngredient(ing.ingredientId, ing.amount);

    if (ing.optional) {
      optional.push({
        ingredientId: ing.ingredientId,
        amount: ing.amount,
        available: check.available,
      });
    } else if (check.hasEnough) {
      available.push({
        ingredientId: ing.ingredientId,
        amount: check.available,
      });
    } else {
      missing.push({
        ingredientId: ing.ingredientId,
        amount: ing.amount,
        shortage: check.shortage,
      });
    }
  }

  return {
    canMake: missing.length === 0,
    available,
    missing,
    optional,
  };
}

// =============================================================================
// INVENTORY SUMMARY
// =============================================================================

/**
 * Get inventory summary by location
 */
export async function getInventorySummary(): Promise<{
  totalItems: number;
  byLocation: { location: StorageLocation; count: number }[];
  byCategory: { category: string; count: number }[];
  expiringCount: number;
  lowStockCount: number;
}> {
  const all = await getAllInventory();

  // Count by location
  const locationCounts: Record<string, number> = {};
  for (const item of all) {
    locationCounts[item.location] = (locationCounts[item.location] || 0) + 1;
  }

  // Count by category (need to fetch ingredients)
  const categoryCounts: Record<string, number> = {};
  for (const item of all) {
    const ingredient = await getIngredientById(item.ingredientId);
    if (ingredient) {
      categoryCounts[ingredient.category] = (categoryCounts[ingredient.category] || 0) + 1;
    }
  }

  // Get alert counts
  const expiring = await getExpiringItems(3);
  const lowStock = await getLowStockItems();

  return {
    totalItems: all.length,
    byLocation: Object.entries(locationCounts).map(([location, count]) => ({
      location: location as StorageLocation,
      count,
    })),
    byCategory: Object.entries(categoryCounts).map(([category, count]) => ({
      category,
      count,
    })),
    expiringCount: expiring.length,
    lowStockCount: lowStock.length,
  };
}

// =============================================================================
// EXPORT / IMPORT
// =============================================================================

/**
 * IMPORTANT: Import/Export functionality has been moved to RemEDatabase class.
 * These functions now delegate to the centralized database manager.
 * DO NOT add new import/export logic here - use RemEDatabase instead.
 */

import { db } from '../RemEDatabase';

/**
 * Export inventory to JSON string with metadata
 */
export async function exportInventoryToJSON(): Promise<string> {
  return db.exportInventory();
}

/**
 * Import inventory from JSON string
 */
export async function importInventoryFromJSON(
  jsonData: string,
  clearExisting: boolean = false
): Promise<{ success: number; errors: string[] }> {
  return db.importInventory(jsonData, clearExisting);
}
