/**
 * Client-side Function Executor for Voice Assistant
 *
 * Executes LLM functions on the client side where IndexedDB is available.
 * This bridges the gap between the Python voice server and browser-only APIs.
 */

import { executeFunction, type FunctionResult } from '@/lib/db/llm/handlers';

export interface FunctionRequest {
  requestId: string;
  functionName: string;
  args: Record<string, unknown>;
}

export interface FunctionResponse {
  requestId: string;
  result: FunctionResult;
}

/**
 * Execute a function request from the voice server
 */
export async function executeFunctionRequest(
  request: FunctionRequest
): Promise<FunctionResponse> {
  console.log(`[ClientFunctionExecutor] Executing: ${request.functionName}`, request.args);

  try {
    const result = await executeFunction(request.functionName, request.args);

    console.log(`[ClientFunctionExecutor] Result:`, result);

    return {
      requestId: request.requestId,
      result,
    };
  } catch (error) {
    console.error(`[ClientFunctionExecutor] Error:`, error);

    return {
      requestId: request.requestId,
      result: {
        success: false,
        error: error instanceof Error ? error.message : 'Error desconocido ejecutando función',
      },
    };
  }
}

/**
 * Get list of available functions for the voice server
 */
export function getAvailableFunctionNames(): string[] {
  return [
    // Ingredient functions
    'searchIngredients',
    'getIngredientDetails',
    'getCompatibleIngredients',
    'getSubstitutes',
    // Inventory functions
    'getInventory',
    'searchInventoryByName',
    'addToInventory',
    'updateInventory',
    'removeFromInventory',
    'consumeFromInventory',
    'getInventoryAlerts',
    // Recipe functions
    'searchRecipes',
    'getRecipesByIngredients',
    'getRecipeDetails',
    'getRecipesByCategory',
    'calculatePortions',
    'calculateNutrition',
    'getIngredientsForStep',
    // Compatibility functions
    'suggestComplementaryIngredients',
    'analyzeFlavorBalance',
    // Utility functions
    'checkRecipeIngredients',
    'getInventorySummary',
    // Appliance functions
    'getUserAppliances',
    'searchAppliances',
    'hasAppliance',
  ];
}
