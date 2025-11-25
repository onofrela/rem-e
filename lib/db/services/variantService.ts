/**
 * Recipe Variant Service
 *
 * Handles recipe variants - modified versions of base recipes:
 * - Create and manage recipe variants
 * - Apply variant modifications to base recipes
 * - Track variant usage and popularity
 * - Generate complete recipes from base + variant
 */

import type {
  Recipe,
  RecipeVariant,
  RecipeVariantModifications,
  RecipeIngredient,
  RecipeStep,
  CreateRecipeVariantParams
} from '../schemas/types';
import {
  STORES,
  generateId,
  addItem,
  getItem,
  getAllItems,
  getByIndex,
  updateItem,
  deleteItem
} from '../stores/database';
import { getRecipeById } from './recipeService';

// =============================================================================
// RECIPE VARIANT CRUD OPERATIONS
// =============================================================================

/**
 * Get all variants for a base recipe
 */
export async function getRecipeVariants(
  baseRecipeId: string,
  tags?: string[]
): Promise<RecipeVariant[]> {
  const variants = await getByIndex<RecipeVariant>(
    STORES.RECIPE_VARIANTS,
    'baseRecipeId',
    baseRecipeId
  );

  // Filter by tags if provided
  if (tags && tags.length > 0) {
    return variants.filter(variant =>
      tags.some(tag => variant.tags.includes(tag))
    );
  }

  // Sort by usage (most popular first)
  return variants.sort((a, b) => b.timesUsed - a.timesUsed);
}

/**
 * Get a specific variant by ID
 */
export async function getVariantById(id: string): Promise<RecipeVariant | null> {
  return getItem<RecipeVariant>(STORES.RECIPE_VARIANTS, id);
}

/**
 * Get all user-created variants
 */
export async function getUserCreatedVariants(): Promise<RecipeVariant[]> {
  const variants = await getByIndex<RecipeVariant>(
    STORES.RECIPE_VARIANTS,
    'createdBy',
    'user'
  );

  return variants.sort((a, b) => b.timesUsed - a.timesUsed);
}

/**
 * Get all system-created variants
 */
export async function getSystemCreatedVariants(): Promise<RecipeVariant[]> {
  return getByIndex<RecipeVariant>(
    STORES.RECIPE_VARIANTS,
    'createdBy',
    'system'
  );
}

/**
 * Create a new recipe variant
 */
export async function createVariant(
  params: CreateRecipeVariantParams
): Promise<RecipeVariant> {
  const now = new Date().toISOString();

  const variant: RecipeVariant = {
    id: generateId('variant'),
    baseRecipeId: params.baseRecipeId,
    name: params.name,
    description: params.description,
    modifications: params.modifications,
    tags: params.tags,
    createdBy: 'user',
    createdAt: now,
    updatedAt: now,
    timesUsed: 0
  };

  return addItem(STORES.RECIPE_VARIANTS, variant);
}

/**
 * Update an existing variant
 */
export async function updateVariant(
  id: string,
  updates: Partial<Omit<RecipeVariant, 'id' | 'baseRecipeId' | 'createdBy' | 'createdAt' | 'updatedAt' | 'timesUsed'>>
): Promise<RecipeVariant> {
  const existing = await getVariantById(id);

  if (!existing) {
    throw new Error(`Variant ${id} not found`);
  }

  const updated: RecipeVariant = {
    ...existing,
    ...updates,
    updatedAt: new Date().toISOString()
  };

  return updateItem(STORES.RECIPE_VARIANTS, updated);
}

/**
 * Delete a variant
 */
export async function deleteVariant(id: string): Promise<void> {
  return deleteItem(STORES.RECIPE_VARIANTS, id);
}

/**
 * Increment usage count for a variant
 */
export async function incrementVariantUsage(id: string): Promise<RecipeVariant> {
  const variant = await getVariantById(id);

  if (!variant) {
    throw new Error(`Variant ${id} not found`);
  }

  const updated: RecipeVariant = {
    ...variant,
    timesUsed: variant.timesUsed + 1,
    updatedAt: new Date().toISOString()
  };

  return updateItem(STORES.RECIPE_VARIANTS, updated);
}

// =============================================================================
// VARIANT APPLICATION
// =============================================================================

/**
 * Apply variant modifications to a base recipe to generate the complete modified recipe
 */
export async function applyVariantToRecipe(
  baseRecipeId: string,
  variantId: string
): Promise<Recipe> {
  // Get base recipe
  const baseRecipe = await getRecipeById(baseRecipeId);
  if (!baseRecipe) {
    throw new Error(`Base recipe ${baseRecipeId} not found`);
  }

  // Get variant
  const variant = await getVariantById(variantId);
  if (!variant) {
    throw new Error(`Variant ${variantId} not found`);
  }

  if (variant.baseRecipeId !== baseRecipeId) {
    throw new Error(`Variant ${variantId} is not for recipe ${baseRecipeId}`);
  }

  // Apply modifications
  const modifiedRecipe: Recipe = {
    ...baseRecipe,
    name: `${baseRecipe.name} - ${variant.name}`,
    description: `${baseRecipe.description}\n\n${variant.description}`,
    tags: [...baseRecipe.tags, ...variant.tags],
    ingredients: applyIngredientModifications(
      baseRecipe.ingredients,
      variant.modifications.ingredients
    ),
    steps: applyStepModifications(
      baseRecipe.steps,
      variant.modifications.steps
    )
  };

  // Apply metadata changes
  if (variant.modifications.metadata) {
    const meta = variant.modifications.metadata;

    if (meta.timeAdjustment) {
      modifiedRecipe.time += meta.timeAdjustment;
    }

    if (meta.difficultyChange) {
      modifiedRecipe.difficulty = meta.difficultyChange;
    }

    if (meta.servingsChange) {
      modifiedRecipe.servings = meta.servingsChange;
    }
  }

  // Increment variant usage
  await incrementVariantUsage(variantId);

  return modifiedRecipe;
}

/**
 * Apply ingredient modifications to base ingredients
 */
function applyIngredientModifications(
  baseIngredients: RecipeIngredient[],
  modifications: RecipeVariantModifications['ingredients']
): RecipeIngredient[] {
  let ingredients = [...baseIngredients];

  // Remove ingredients
  if (modifications.removed.length > 0) {
    ingredients = ingredients.filter(
      ing => !modifications.removed.includes(ing.ingredientId)
    );
  }

  // Modify existing ingredients
  if (modifications.modified.length > 0) {
    ingredients = ingredients.map(ing => {
      const mod = modifications.modified.find(m => m.ingredientId === ing.ingredientId);
      if (mod) {
        return {
          ...ing,
          amount: mod.newAmount,
          unit: mod.newUnit
        };
      }
      return ing;
    });
  }

  // Add new ingredients
  if (modifications.added.length > 0) {
    ingredients.push(...modifications.added);
  }

  return ingredients;
}

/**
 * Apply step modifications to base steps
 */
function applyStepModifications(
  baseSteps: RecipeStep[],
  modifications: RecipeVariantModifications['steps']
): RecipeStep[] {
  let steps = [...baseSteps];

  // Remove steps
  if (modifications.removed.length > 0) {
    steps = steps.filter(step => !modifications.removed.includes(step.step));
  }

  // Modify existing steps
  if (modifications.modified.length > 0) {
    steps = steps.map(step => {
      const mod = modifications.modified.find(m => m.stepNumber === step.step);
      if (mod) {
        return {
          ...step,
          instruction: mod.newInstruction
        };
      }
      return step;
    });
  }

  // Add new steps
  if (modifications.added.length > 0) {
    steps.push(...modifications.added);
  }

  // Re-number steps sequentially
  steps.sort((a, b) => a.step - b.step);
  steps = steps.map((step, index) => ({
    ...step,
    step: index + 1
  }));

  return steps;
}

/**
 * Get variant summary (without full modifications)
 */
export function getVariantSummary(variant: RecipeVariant): {
  id: string;
  name: string;
  description: string;
  tags: string[];
  timesUsed: number;
  changesSummary: string;
} {
  const changes: string[] = [];

  const { ingredients, steps, metadata } = variant.modifications;

  // Summarize ingredient changes
  if (ingredients.removed.length > 0) {
    changes.push(`${ingredients.removed.length} ingrediente(s) eliminado(s)`);
  }
  if (ingredients.added.length > 0) {
    changes.push(`${ingredients.added.length} ingrediente(s) agregado(s)`);
  }
  if (ingredients.modified.length > 0) {
    changes.push(`${ingredients.modified.length} ingrediente(s) modificado(s)`);
  }

  // Summarize step changes
  if (steps.removed.length > 0) {
    changes.push(`${steps.removed.length} paso(s) eliminado(s)`);
  }
  if (steps.added.length > 0) {
    changes.push(`${steps.added.length} paso(s) agregado(s)`);
  }
  if (steps.modified.length > 0) {
    changes.push(`${steps.modified.length} paso(s) modificado(s)`);
  }

  // Summarize metadata changes
  if (metadata) {
    if (metadata.timeAdjustment) {
      const sign = metadata.timeAdjustment > 0 ? '+' : '';
      changes.push(`Tiempo: ${sign}${metadata.timeAdjustment} min`);
    }
    if (metadata.difficultyChange) {
      changes.push(`Dificultad: ${metadata.difficultyChange}`);
    }
  }

  return {
    id: variant.id,
    name: variant.name,
    description: variant.description,
    tags: variant.tags,
    timesUsed: variant.timesUsed,
    changesSummary: changes.join(', ')
  };
}

/**
 * Search variants by tags
 */
export async function searchVariantsByTags(tags: string[]): Promise<RecipeVariant[]> {
  const allVariants = await getAllItems<RecipeVariant>(STORES.RECIPE_VARIANTS);

  const matchingVariants = allVariants.filter(variant =>
    tags.some(tag => variant.tags.includes(tag))
  );

  return matchingVariants.sort((a, b) => b.timesUsed - a.timesUsed);
}

/**
 * Get most popular variants across all recipes
 */
export async function getMostPopularVariants(limit: number = 10): Promise<RecipeVariant[]> {
  const allVariants = await getAllItems<RecipeVariant>(STORES.RECIPE_VARIANTS);

  return allVariants
    .sort((a, b) => b.timesUsed - a.timesUsed)
    .slice(0, limit);
}
