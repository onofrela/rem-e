/**
 * Compatibility Service
 *
 * Handles ingredient compatibility and pairing suggestions:
 * - Find compatible ingredients
 * - Get flavor profiles
 * - Suggest ingredient combinations
 */

import type {
  CompatibilityPair,
  CompatibilityData,
  FlavorProfile,
  CatalogIngredient
} from '../schemas/types';
import { getIngredientById, getIngredientsByIds } from './ingredientService';

// =============================================================================
// DATA LOADING
// =============================================================================

let compatibilityData: CompatibilityData | null = null;

/**
 * Load compatibility data from JSON file
 */
async function loadCompatibilityData(): Promise<CompatibilityData> {
  if (compatibilityData) {
    return compatibilityData;
  }

  try {
    const response = await fetch('/lib/db/data/compatibility.json');
    if (!response.ok) {
      throw new Error('Failed to load compatibility.json');
    }

    compatibilityData = await response.json();
    return compatibilityData!;
  } catch (error) {
    console.error('Error loading compatibility data:', error);
    // Fallback: try to import directly (for development)
    try {
      const module = await import('../data/compatibility.json');
      compatibilityData = module as unknown as CompatibilityData;
      return compatibilityData!;
    } catch {
      return {
        version: '1.0.0',
        compatibilityPairs: [],
        flavorProfiles: {},
      };
    }
  }
}

// =============================================================================
// COMPATIBILITY QUERIES
// =============================================================================

/**
 * Get all compatibility pairs involving an ingredient
 */
export async function getCompatibilityPairs(
  ingredientId: string
): Promise<CompatibilityPair[]> {
  const data = await loadCompatibilityData();

  return data.compatibilityPairs.filter(
    pair => pair.ingredientA === ingredientId || pair.ingredientB === ingredientId
  );
}

/**
 * Get compatible ingredients for a given ingredient
 * Returns ingredients sorted by compatibility score
 */
export async function getCompatibleIngredients(
  ingredientId: string
): Promise<{
  ingredient: CatalogIngredient;
  score: number;
  reason: string;
  cuisines: string[];
}[]> {
  const pairs = await getCompatibilityPairs(ingredientId);

  if (pairs.length === 0) {
    // Fallback to ingredient's compatibleWith array
    const ingredient = await getIngredientById(ingredientId);
    if (ingredient && ingredient.compatibleWith.length > 0) {
      const compatibleIngs = await getIngredientsByIds(ingredient.compatibleWith);
      return compatibleIngs.map(ing => ({
        ingredient: ing,
        score: 0.7, // Default score
        reason: 'Combinación común',
        cuisines: [],
      }));
    }
    return [];
  }

  const results: {
    ingredient: CatalogIngredient;
    score: number;
    reason: string;
    cuisines: string[];
  }[] = [];

  for (const pair of pairs) {
    const otherId = pair.ingredientA === ingredientId ? pair.ingredientB : pair.ingredientA;
    const ingredient = await getIngredientById(otherId);

    if (ingredient) {
      results.push({
        ingredient,
        score: pair.score,
        reason: pair.reason,
        cuisines: pair.cuisines,
      });
    }
  }

  // Sort by score (highest first)
  results.sort((a, b) => b.score - a.score);

  return results;
}

/**
 * Get compatibility score between two ingredients
 */
export async function getCompatibilityScore(
  ingredientA: string,
  ingredientB: string
): Promise<{
  score: number;
  reason: string;
  cuisines: string[];
} | null> {
  const data = await loadCompatibilityData();

  const pair = data.compatibilityPairs.find(
    p => (p.ingredientA === ingredientA && p.ingredientB === ingredientB) ||
         (p.ingredientA === ingredientB && p.ingredientB === ingredientA)
  );

  if (pair) {
    return {
      score: pair.score,
      reason: pair.reason,
      cuisines: pair.cuisines,
    };
  }

  // Check if they're in each other's compatibleWith arrays
  const ingA = await getIngredientById(ingredientA);
  const ingB = await getIngredientById(ingredientB);

  if (ingA?.compatibleWith.includes(ingredientB) || ingB?.compatibleWith.includes(ingredientA)) {
    return {
      score: 0.7,
      reason: 'Combinación común',
      cuisines: [],
    };
  }

  return null;
}

// =============================================================================
// FLAVOR PROFILES
// =============================================================================

/**
 * Get flavor profile for an ingredient
 */
export async function getFlavorProfile(ingredientId: string): Promise<FlavorProfile[]> {
  const data = await loadCompatibilityData();
  return data.flavorProfiles[ingredientId] || [];
}

/**
 * Get ingredients by flavor profile
 */
export async function getIngredientsByFlavor(
  flavor: FlavorProfile
): Promise<CatalogIngredient[]> {
  const data = await loadCompatibilityData();

  const matchingIds = Object.entries(data.flavorProfiles)
    .filter(([_, profiles]) => profiles.includes(flavor))
    .map(([id]) => id);

  return getIngredientsByIds(matchingIds);
}

/**
 * Find ingredients that share flavor profiles with a given ingredient
 */
export async function getSimilarFlavorIngredients(
  ingredientId: string
): Promise<{
  ingredient: CatalogIngredient;
  sharedFlavors: FlavorProfile[];
  matchCount: number;
}[]> {
  const data = await loadCompatibilityData();
  const targetFlavors = data.flavorProfiles[ingredientId] || [];

  if (targetFlavors.length === 0) {
    return [];
  }

  const results: {
    ingredient: CatalogIngredient;
    sharedFlavors: FlavorProfile[];
    matchCount: number;
  }[] = [];

  for (const [id, profiles] of Object.entries(data.flavorProfiles)) {
    if (id === ingredientId) continue;

    const sharedFlavors = profiles.filter(f => targetFlavors.includes(f));

    if (sharedFlavors.length > 0) {
      const ingredient = await getIngredientById(id);
      if (ingredient) {
        results.push({
          ingredient,
          sharedFlavors,
          matchCount: sharedFlavors.length,
        });
      }
    }
  }

  // Sort by match count (most shared flavors first)
  results.sort((a, b) => b.matchCount - a.matchCount);

  return results;
}

// =============================================================================
// SUGGESTIONS
// =============================================================================

/**
 * Suggest what to add to a list of ingredients
 */
export async function suggestComplementaryIngredients(
  currentIngredients: string[],
  limit: number = 5
): Promise<{
  ingredient: CatalogIngredient;
  reason: string;
  averageScore: number;
}[]> {
  if (currentIngredients.length === 0) {
    return [];
  }

  const suggestions: Map<string, {
    ingredient: CatalogIngredient;
    reasons: string[];
    totalScore: number;
    matchCount: number;
  }> = new Map();

  // For each current ingredient, find compatible ones
  for (const currentId of currentIngredients) {
    const compatible = await getCompatibleIngredients(currentId);

    for (const comp of compatible) {
      // Skip if already in current ingredients
      if (currentIngredients.includes(comp.ingredient.id)) continue;

      const existing = suggestions.get(comp.ingredient.id);

      if (existing) {
        existing.reasons.push(comp.reason);
        existing.totalScore += comp.score;
        existing.matchCount++;
      } else {
        suggestions.set(comp.ingredient.id, {
          ingredient: comp.ingredient,
          reasons: [comp.reason],
          totalScore: comp.score,
          matchCount: 1,
        });
      }
    }
  }

  // Convert to array and calculate average scores
  const results = Array.from(suggestions.values()).map(s => ({
    ingredient: s.ingredient,
    reason: s.reasons[0], // Use first reason
    averageScore: s.totalScore / s.matchCount,
  }));

  // Sort by average score and match count
  results.sort((a, b) => b.averageScore - a.averageScore);

  return results.slice(0, limit);
}

/**
 * Suggest ingredients for a cuisine
 */
export async function suggestIngredientsForCuisine(
  cuisine: string,
  limit: number = 10
): Promise<CatalogIngredient[]> {
  const data = await loadCompatibilityData();

  // Find ingredients that appear in pairs for this cuisine
  const ingredientIds = new Set<string>();

  for (const pair of data.compatibilityPairs) {
    if (pair.cuisines.includes(cuisine)) {
      ingredientIds.add(pair.ingredientA);
      ingredientIds.add(pair.ingredientB);
    }
  }

  const ingredients = await getIngredientsByIds(Array.from(ingredientIds));

  return ingredients.slice(0, limit);
}

// =============================================================================
// ANALYSIS
// =============================================================================

/**
 * Analyze a set of ingredients for flavor balance
 */
export async function analyzeFlavorBalance(
  ingredientIds: string[]
): Promise<{
  flavorCoverage: { flavor: FlavorProfile; count: number }[];
  missingFlavors: FlavorProfile[];
  dominantFlavor: FlavorProfile | null;
  suggestions: string[];
}> {
  const data = await loadCompatibilityData();

  // Count flavor occurrences
  const flavorCounts: Record<string, number> = {};

  for (const id of ingredientIds) {
    const profiles = data.flavorProfiles[id] || [];
    for (const flavor of profiles) {
      flavorCounts[flavor] = (flavorCounts[flavor] || 0) + 1;
    }
  }

  // All possible flavors
  const allFlavors: FlavorProfile[] = [
    'salado', 'dulce', 'ácido', 'amargo', 'umami',
    'picante', 'herbáceo', 'ahumado', 'fresco',
    'terroso', 'cítrico', 'cremoso', 'neutro'
  ];

  // Calculate coverage
  const flavorCoverage = Object.entries(flavorCounts)
    .map(([flavor, count]) => ({ flavor: flavor as FlavorProfile, count }))
    .sort((a, b) => b.count - a.count);

  const coveredFlavors = new Set(Object.keys(flavorCounts));
  const missingFlavors = allFlavors.filter(f => !coveredFlavors.has(f));

  // Find dominant flavor
  const dominantFlavor = flavorCoverage.length > 0 ? flavorCoverage[0].flavor : null;

  // Generate suggestions
  const suggestions: string[] = [];

  if (missingFlavors.includes('ácido') && !missingFlavors.includes('fresco')) {
    suggestions.push('Considera agregar un cítrico como limón para balance');
  }
  if (!coveredFlavors.has('umami') && ingredientIds.length > 2) {
    suggestions.push('Agregar un ingrediente umami podría dar más profundidad');
  }
  if (flavorCounts['salado'] > 3) {
    suggestions.push('Muchos ingredientes salados, considera algo dulce o ácido para balance');
  }

  return {
    flavorCoverage,
    missingFlavors,
    dominantFlavor,
    suggestions,
  };
}

/**
 * Get overall compatibility score for a group of ingredients
 */
export async function getGroupCompatibility(
  ingredientIds: string[]
): Promise<{
  overallScore: number;
  pairs: { a: string; b: string; score: number }[];
  weakestLink: { a: string; b: string; score: number } | null;
  strongestLink: { a: string; b: string; score: number } | null;
}> {
  const pairs: { a: string; b: string; score: number }[] = [];

  // Check all pairs
  for (let i = 0; i < ingredientIds.length; i++) {
    for (let j = i + 1; j < ingredientIds.length; j++) {
      const compatibility = await getCompatibilityScore(ingredientIds[i], ingredientIds[j]);
      const score = compatibility?.score || 0.5; // Default neutral score

      pairs.push({
        a: ingredientIds[i],
        b: ingredientIds[j],
        score,
      });
    }
  }

  if (pairs.length === 0) {
    return {
      overallScore: 0,
      pairs: [],
      weakestLink: null,
      strongestLink: null,
    };
  }

  // Calculate overall score (average)
  const overallScore = pairs.reduce((sum, p) => sum + p.score, 0) / pairs.length;

  // Find weakest and strongest links
  pairs.sort((a, b) => a.score - b.score);
  const weakestLink = pairs[0];
  const strongestLink = pairs[pairs.length - 1];

  return {
    overallScore,
    pairs,
    weakestLink,
    strongestLink,
  };
}
