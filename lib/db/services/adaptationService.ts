/**
 * Recipe Adaptation Service
 *
 * Orchestrates recipe adaptations based on user constraints:
 * - Adapt recipes for missing ingredients
 * - Adapt recipes for missing appliances
 * - Apply dietary restrictions
 * - Combine multiple adaptations intelligently
 */

import type {
  Recipe,
  RecipeIngredient,
  RecipeStep,
  AdaptRecipeParams,
  RecipeVariantModifications
} from '../schemas/types';
import { getRecipeById } from './recipeService';
import {
  getContextualSubstitutions,
  getBestSubstitute,
  analyzeSubstitutionImpact,
  calculateSubstitutionAmount
} from './substitutionService';
import { createVariant } from './variantService';
import { getRelevantKnowledge } from './knowledgeService';
import { getIngredientById } from './ingredientService';

// =============================================================================
// RECIPE ADAPTATION
// =============================================================================

/**
 * Adapt a recipe based on user constraints
 */
export async function adaptRecipe(
  params: AdaptRecipeParams
): Promise<{
  adaptedRecipe: Recipe;
  adaptations: {
    substitutions: Array<{
      originalId: string;
      originalName: string;
      substituteId: string;
      substituteName: string;
      ratio: number;
      reason: string;
      impact: string[];
    }>;
    removedIngredients: Array<{
      ingredientId: string;
      name: string;
      reason: string;
    }>;
    modifiedSteps: Array<{
      stepNumber: number;
      originalInstruction: string;
      newInstruction: string;
      reason: string;
    }>;
    warnings: string[];
  };
  variantId?: string;
}> {
  // Get base recipe
  const baseRecipe = await getRecipeById(params.recipeId);
  if (!baseRecipe) {
    throw new Error(`Recipe ${params.recipeId} not found`);
  }

  const adaptations: {
    substitutions: any[];
    removedIngredients: any[];
    modifiedSteps: any[];
    warnings: string[];
  } = {
    substitutions: [],
    removedIngredients: [],
    modifiedSteps: [],
    warnings: []
  };

  // Get relevant user knowledge
  const userKnowledge = await getRelevantKnowledge({
    recipeType: baseRecipe.category,
    ingredientIds: baseRecipe.ingredients.map(i => i.ingredientId)
  });

  let adaptedIngredients = [...baseRecipe.ingredients];
  let adaptedSteps = [...baseRecipe.steps];

  // 1. Handle missing ingredients
  if (params.missingIngredients && params.missingIngredients.length > 0) {
    const ingredientAdaptation = await adaptForMissingIngredients(
      baseRecipe,
      params.missingIngredients,
      adaptations.warnings
    );

    adaptedIngredients = ingredientAdaptation.ingredients;
    adaptations.substitutions.push(...ingredientAdaptation.substitutions);
    adaptations.removedIngredients.push(...ingredientAdaptation.removedIngredients);
    adaptations.modifiedSteps.push(...ingredientAdaptation.modifiedSteps);
  }

  // 2. Apply dietary restrictions
  if (params.dietaryRestrictions && params.dietaryRestrictions.length > 0) {
    const dietaryAdaptation = await adaptForDietaryRestrictions(
      adaptedIngredients,
      params.dietaryRestrictions,
      adaptations.warnings
    );

    adaptedIngredients = dietaryAdaptation.ingredients;
    adaptations.substitutions.push(...dietaryAdaptation.substitutions);
  }

  // 3. Adjust servings if needed
  if (params.servings && params.servings !== baseRecipe.servings) {
    adaptedIngredients = scaleIngredients(adaptedIngredients, baseRecipe.servings, params.servings);
  }

  // Build adapted recipe
  const adaptedRecipe: Recipe = {
    ...baseRecipe,
    ingredients: adaptedIngredients,
    steps: adaptedSteps,
    servings: params.servings || baseRecipe.servings,
    description: baseRecipe.description + '\n\n[RECETA ADAPTADA]'
  };

  return {
    adaptedRecipe,
    adaptations,
    variantId: undefined // Could save as variant if user wants
  };
}

// =============================================================================
// INGREDIENT ADAPTATIONS
// =============================================================================

/**
 * Adapt recipe for missing ingredients
 */
async function adaptForMissingIngredients(
  recipe: Recipe,
  missingIngredientIds: string[],
  warnings: string[]
): Promise<{
  ingredients: RecipeIngredient[];
  substitutions: any[];
  removedIngredients: any[];
  modifiedSteps: any[];
}> {
  const substitutions: any[] = [];
  const removedIngredients: any[] = [];
  const modifiedSteps: any[] = [];
  let ingredients = [...recipe.ingredients];

  for (const missingId of missingIngredientIds) {
    const ingredient = ingredients.find(i => i.ingredientId === missingId);

    if (!ingredient) {
      continue;
    }

    // Check if ingredient is optional
    if (ingredient.optional) {
      // Just remove it
      ingredients = ingredients.filter(i => i.ingredientId !== missingId);
      removedIngredients.push({
        ingredientId: missingId,
        name: ingredient.displayName,
        reason: 'Ingrediente opcional eliminado'
      });
      continue;
    }

    // Try to find substitution
    const recipeContext = {
      recipeType: recipe.category,
      cuisine: recipe.cuisine
    };

    const bestSub = await getBestSubstitute(missingId, recipeContext);

    if (bestSub.substitution) {
      const analysis = bestSub.analysis!;
      const catalogIngredient = await getIngredientById(bestSub.substitution.substituteIngredientId);

      if (!catalogIngredient) {
        warnings.push(`No se pudo cargar información del sustituto para ${ingredient.displayName}`);
        continue;
      }

      // Calculate new amount
      const newAmount = calculateSubstitutionAmount(
        ingredient.amount,
        ingredient.unit,
        bestSub.substitution.ratio
      );

      // Replace ingredient
      const substitutedIngredient: RecipeIngredient = {
        ...ingredient,
        ingredientId: bestSub.substitution.substituteIngredientId,
        displayName: catalogIngredient.name,
        amount: newAmount.amount,
        unit: newAmount.unit
      };

      ingredients = ingredients.map(i =>
        i.ingredientId === missingId ? substitutedIngredient : i
      );

      substitutions.push({
        originalId: missingId,
        originalName: ingredient.displayName,
        substituteId: bestSub.substitution.substituteIngredientId,
        substituteName: catalogIngredient.name,
        ratio: bestSub.substitution.ratio,
        reason: bestSub.substitution.reason,
        impact: analysis.impact
      });

      // Apply any required adjustments to steps
      if (bestSub.substitution.requiresAdjustments?.steps) {
        bestSub.substitution.requiresAdjustments.steps.forEach(adj => {
          if (adj.stepNumber) {
            const step = recipe.steps.find(s => s.step === adj.stepNumber);
            if (step) {
              modifiedSteps.push({
                stepNumber: adj.stepNumber,
                originalInstruction: step.instruction,
                newInstruction: `${step.instruction}\n\nNOTA: ${adj.suggestion}`,
                reason: adj.suggestion
              });
            }
          }
        });
      }
    } else {
      // No substitution found - warn user
      warnings.push(
        `No se encontró sustituto para ${ingredient.displayName}. La receta puede no funcionar correctamente.`
      );
    }
  }

  return {
    ingredients,
    substitutions,
    removedIngredients,
    modifiedSteps
  };
}

/**
 * Adapt recipe for dietary restrictions
 */
async function adaptForDietaryRestrictions(
  ingredients: RecipeIngredient[],
  restrictions: string[],
  warnings: string[]
): Promise<{
  ingredients: RecipeIngredient[];
  substitutions: any[];
}> {
  const substitutions: any[] = [];
  let adaptedIngredients = [...ingredients];

  for (const ingredient of ingredients) {
    const catalogIngredient = await getIngredientById(ingredient.ingredientId);

    if (!catalogIngredient) {
      continue;
    }

    // Check if ingredient violates dietary restriction
    let needsSubstitution = false;
    let reason = '';

    for (const restriction of restrictions) {
      // This is simplified - in a real app, you'd have more sophisticated checking
      const restrictionLower = restriction.toLowerCase();

      if (restrictionLower === 'vegetariano' || restrictionLower === 'vegetarian') {
        if (catalogIngredient.category === 'Proteínas' &&
            (catalogIngredient.subcategory === 'Aves' ||
             catalogIngredient.subcategory === 'Res' ||
             catalogIngredient.subcategory === 'Cerdo' ||
             catalogIngredient.subcategory === 'Pescado' ||
             catalogIngredient.subcategory === 'Mariscos')) {
          needsSubstitution = true;
          reason = 'No es vegetariano';
          break;
        }
      }

      if (restrictionLower === 'vegano' || restrictionLower === 'vegan') {
        if (catalogIngredient.category === 'Lácteos' ||
            catalogIngredient.category === 'Proteínas') {
          needsSubstitution = true;
          reason = 'No es vegano';
          break;
        }
      }

      if (restrictionLower === 'sin gluten' || restrictionLower === 'gluten-free') {
        if (catalogIngredient.category === 'Harinas' &&
            catalogIngredient.subcategory === 'Trigo') {
          needsSubstitution = true;
          reason = 'Contiene gluten';
          break;
        }
      }
    }

    if (needsSubstitution) {
      // Find substitution with matching dietary tag
      const allSubs = await getContextualSubstitutions(ingredient.ingredientId);
      const dietarySub = allSubs.find(sub =>
        restrictions.some(r => sub.dietaryTags.includes(r.toLowerCase()))
      );

      if (dietarySub) {
        const catalogSub = await getIngredientById(dietarySub.substituteIngredientId);

        if (catalogSub) {
          const newAmount = calculateSubstitutionAmount(
            ingredient.amount,
            ingredient.unit,
            dietarySub.ratio
          );

          const substitutedIngredient: RecipeIngredient = {
            ...ingredient,
            ingredientId: dietarySub.substituteIngredientId,
            displayName: catalogSub.name,
            amount: newAmount.amount,
            unit: newAmount.unit
          };

          adaptedIngredients = adaptedIngredients.map(i =>
            i.ingredientId === ingredient.ingredientId ? substitutedIngredient : i
          );

          substitutions.push({
            originalId: ingredient.ingredientId,
            originalName: ingredient.displayName,
            substituteId: dietarySub.substituteIngredientId,
            substituteName: catalogSub.name,
            ratio: dietarySub.ratio,
            reason: `Sustitución por restricción dietética: ${reason}`,
            impact: analyzeSubstitutionImpact(dietarySub).impact
          });
        }
      } else {
        warnings.push(
          `No se encontró sustituto compatible con ${restrictions.join(', ')} para ${ingredient.displayName}`
        );
      }
    }
  }

  return {
    ingredients: adaptedIngredients,
    substitutions
  };
}

/**
 * Scale ingredients for different serving sizes
 */
function scaleIngredients(
  ingredients: RecipeIngredient[],
  originalServings: number,
  targetServings: number
): RecipeIngredient[] {
  const scaleFactor = targetServings / originalServings;

  return ingredients.map(ingredient => ({
    ...ingredient,
    amount: Math.round(ingredient.amount * scaleFactor * 100) / 100
  }));
}

// =============================================================================
// SAVE ADAPTATION AS VARIANT
// =============================================================================

/**
 * Save an adaptation as a recipe variant
 */
export async function saveAdaptationAsVariant(
  baseRecipeId: string,
  adaptedRecipe: Recipe,
  adaptationDescription: string,
  tags: string[]
): Promise<string> {
  // Compare base and adapted to generate modifications
  const baseRecipe = await getRecipeById(baseRecipeId);

  if (!baseRecipe) {
    throw new Error(`Base recipe ${baseRecipeId} not found`);
  }

  const modifications: RecipeVariantModifications = {
    ingredients: {
      removed: [],
      added: [],
      modified: []
    },
    steps: {
      removed: [],
      added: [],
      modified: []
    },
    metadata: {
      servingsChange: adaptedRecipe.servings !== baseRecipe.servings
        ? adaptedRecipe.servings
        : undefined
    }
  };

  // Find ingredient changes
  const baseIngIds = new Set(baseRecipe.ingredients.map(i => i.ingredientId));
  const adaptedIngIds = new Set(adaptedRecipe.ingredients.map(i => i.ingredientId));

  // Removed ingredients
  baseRecipe.ingredients.forEach(baseIng => {
    if (!adaptedIngIds.has(baseIng.ingredientId)) {
      modifications.ingredients.removed.push(baseIng.ingredientId);
    }
  });

  // Added ingredients
  adaptedRecipe.ingredients.forEach(adaptedIng => {
    if (!baseIngIds.has(adaptedIng.ingredientId)) {
      modifications.ingredients.added.push(adaptedIng);
    } else {
      // Check if modified
      const baseIng = baseRecipe.ingredients.find(i => i.ingredientId === adaptedIng.ingredientId);
      if (baseIng &&
          (baseIng.amount !== adaptedIng.amount || baseIng.unit !== adaptedIng.unit)) {
        modifications.ingredients.modified.push({
          ingredientId: adaptedIng.ingredientId,
          newAmount: adaptedIng.amount,
          newUnit: adaptedIng.unit
        });
      }
    }
  });

  // Create variant
  const variant = await createVariant({
    baseRecipeId,
    name: 'Versión Adaptada',
    description: adaptationDescription,
    modifications,
    tags
  });

  return variant.id;
}

/**
 * Suggest missing ingredient substitutions for a recipe
 */
export async function suggestSubstitutionsForMissingIngredients(
  recipeId: string,
  availableIngredientIds: string[]
): Promise<Array<{
  missingIngredientId: string;
  missingIngredientName: string;
  suggestions: Array<{
    ingredientId: string;
    ingredientName: string;
    ratio: number;
    confidence: number;
    reason: string;
    userPreferred: boolean;
  }>;
}>> {
  const recipe = await getRecipeById(recipeId);

  if (!recipe) {
    throw new Error(`Recipe ${recipeId} not found`);
  }

  const availableSet = new Set(availableIngredientIds);
  const suggestions: any[] = [];

  for (const ingredient of recipe.ingredients) {
    if (!availableSet.has(ingredient.ingredientId) && !ingredient.optional) {
      // This ingredient is missing
      const contextualSubs = await getContextualSubstitutions(
        ingredient.ingredientId,
        {
          recipeType: recipe.category,
          cuisine: recipe.cuisine
        }
      );

      const bestSub = await getBestSubstitute(ingredient.ingredientId, {
        recipeType: recipe.category,
        cuisine: recipe.cuisine
      });

      const ingredientSuggestions: any[] = [];

      // Add best substitute first
      if (bestSub.substitution) {
        const catalogIng = await getIngredientById(bestSub.substitution.substituteIngredientId);

        if (catalogIng) {
          ingredientSuggestions.push({
            ingredientId: bestSub.substitution.substituteIngredientId,
            ingredientName: catalogIng.name,
            ratio: bestSub.substitution.ratio,
            confidence: bestSub.substitution.confidence,
            reason: bestSub.substitution.reason,
            userPreferred: bestSub.userPreferred
          });
        }
      }

      // Add other contextual substitutions
      for (const sub of contextualSubs.slice(0, 3)) {
        if (bestSub.substitution && sub.id === bestSub.substitution.id) {
          continue; // Skip if already added as best
        }

        const catalogIng = await getIngredientById(sub.substituteIngredientId);

        if (catalogIng) {
          ingredientSuggestions.push({
            ingredientId: sub.substituteIngredientId,
            ingredientName: catalogIng.name,
            ratio: sub.ratio,
            confidence: sub.confidence,
            reason: sub.reason,
            userPreferred: false
          });
        }
      }

      suggestions.push({
        missingIngredientId: ingredient.ingredientId,
        missingIngredientName: ingredient.displayName,
        suggestions: ingredientSuggestions
      });
    }
  }

  return suggestions;
}
