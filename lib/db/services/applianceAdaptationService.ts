/**
 * Appliance Adaptation Service
 *
 * Handles intelligent appliance adaptations with contextual analysis:
 * - Get adaptation suggestions based on recipe context
 * - Analyze impact of appliance adaptations
 * - Track user preferences and learning
 * - Calculate adaptation adjustments
 */

import type {
  ApplianceAdaptation,
  UserApplianceAdaptationPreference,
  CatalogAppliance,
  Recipe,
  RecipeStep
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

// =============================================================================
// APPLIANCE ADAPTATION OPERATIONS
// =============================================================================

/**
 * Get all adaptations for an appliance
 */
export async function getAdaptationsForAppliance(
  applianceId: string
): Promise<ApplianceAdaptation[]> {
  return getByIndex<ApplianceAdaptation>(
    STORES.APPLIANCE_ADAPTATIONS,
    'originalApplianceId',
    applianceId
  );
}

/**
 * Get specific adaptation between two appliances
 */
export async function getAdaptation(
  originalId: string,
  alternativeId: string
): Promise<ApplianceAdaptation | null> {
  const allAdapt = await getByIndex<ApplianceAdaptation>(
    STORES.APPLIANCE_ADAPTATIONS,
    'adaptationPair',
    [originalId, alternativeId]
  );

  return allAdapt.length > 0 ? allAdapt[0] : null;
}

/**
 * Get contextual adaptation suggestions
 * Filters adaptations based on recipe type and cooking method
 */
export async function getContextualAdaptations(
  applianceId: string,
  recipeContext?: {
    recipeType?: string;
    cookingMethod?: string;
  }
): Promise<ApplianceAdaptation[]> {
  const allAdapt = await getAdaptationsForAppliance(applianceId);

  if (!recipeContext) {
    return allAdapt.sort((a, b) => b.confidence - a.confidence);
  }

  // Filter by context
  const contextualAdapt = allAdapt.filter(adapt => {
    const factors = adapt.contextualFactors;

    // Check if the adaptation is relevant for this context
    if (recipeContext.recipeType &&
        factors.recipeTypes.length > 0 &&
        !factors.recipeTypes.includes(recipeContext.recipeType)) {
      return false;
    }

    if (recipeContext.cookingMethod &&
        factors.cookingMethods.length > 0 &&
        !factors.cookingMethods.includes(recipeContext.cookingMethod)) {
      return false;
    }

    return true;
  });

  return contextualAdapt.sort((a, b) => b.confidence - a.confidence);
}

/**
 * Add a new adaptation to the database
 */
export async function addAdaptation(
  adaptation: Omit<ApplianceAdaptation, 'id' | 'createdAt' | 'updatedAt'>
): Promise<ApplianceAdaptation> {
  const now = new Date().toISOString();
  const newAdaptation: ApplianceAdaptation = {
    id: generateId('adapt'),
    ...adaptation,
    createdAt: now,
    updatedAt: now
  };

  return addItem(STORES.APPLIANCE_ADAPTATIONS, newAdaptation);
}

/**
 * Update an existing adaptation
 */
export async function updateAdaptation(
  id: string,
  updates: Partial<Omit<ApplianceAdaptation, 'id' | 'createdAt' | 'updatedAt'>>
): Promise<ApplianceAdaptation> {
  const existing = await getItem<ApplianceAdaptation>(STORES.APPLIANCE_ADAPTATIONS, id);

  if (!existing) {
    throw new Error(`Adaptation ${id} not found`);
  }

  const updated: ApplianceAdaptation = {
    ...existing,
    ...updates,
    updatedAt: new Date().toISOString()
  };

  return updateItem(STORES.APPLIANCE_ADAPTATIONS, updated);
}

/**
 * Delete an adaptation
 */
export async function deleteAdaptation(id: string): Promise<void> {
  return deleteItem(STORES.APPLIANCE_ADAPTATIONS, id);
}

// =============================================================================
// USER APPLIANCE ADAPTATION PREFERENCES
// =============================================================================

/**
 * Get user preferences for an appliance
 */
export async function getUserPreferredAlternatives(
  applianceId: string
): Promise<UserApplianceAdaptationPreference[]> {
  const prefs = await getByIndex<UserApplianceAdaptationPreference>(
    STORES.USER_APPLIANCE_ADAPTATION_PREFS,
    'originalApplianceId',
    applianceId
  );

  // Sort by usage frequency and success rate
  return prefs.sort((a, b) => {
    const scoreA = a.timesUsed * a.successRate;
    const scoreB = b.timesUsed * b.successRate;
    return scoreB - scoreA;
  });
}

/**
 * Get specific user preference
 */
export async function getUserPreference(
  originalId: string,
  alternativeId: string
): Promise<UserApplianceAdaptationPreference | null> {
  const prefs = await getByIndex<UserApplianceAdaptationPreference>(
    STORES.USER_APPLIANCE_ADAPTATION_PREFS,
    'originalApplianceId',
    originalId
  );

  const pref = prefs.find(p => p.preferredAlternativeId === alternativeId);
  return pref || null;
}

/**
 * Record an adaptation usage (automatic learning)
 */
export async function recordAdaptationUsage(
  originalId: string,
  alternativeId: string,
  context: string[],
  successful: boolean = true,
  notes?: string
): Promise<UserApplianceAdaptationPreference> {
  const existing = await getUserPreference(originalId, alternativeId);

  if (existing) {
    // Update existing preference
    const newTimesUsed = existing.timesUsed + 1;
    const newSuccessRate =
      ((existing.successRate * existing.timesUsed) + (successful ? 1 : 0)) / newTimesUsed;

    // Merge contexts (unique values)
    const mergedContexts = Array.from(new Set([...existing.contexts, ...context]));

    const updated: UserApplianceAdaptationPreference = {
      ...existing,
      timesUsed: newTimesUsed,
      successRate: newSuccessRate,
      lastUsedAt: new Date().toISOString(),
      contexts: mergedContexts,
      notes: notes || existing.notes,
      updatedAt: new Date().toISOString()
    };

    return updateItem(STORES.USER_APPLIANCE_ADAPTATION_PREFS, updated);
  } else {
    // Create new preference
    const now = new Date().toISOString();
    const newPref: UserApplianceAdaptationPreference = {
      id: generateId('uadapt'),
      originalApplianceId: originalId,
      preferredAlternativeId: alternativeId,
      timesUsed: 1,
      successRate: successful ? 1 : 0,
      lastUsedAt: now,
      contexts: context,
      notes,
      createdAt: now,
      updatedAt: now
    };

    return addItem(STORES.USER_APPLIANCE_ADAPTATION_PREFS, newPref);
  }
}

/**
 * Delete a user preference
 */
export async function deleteUserPreference(id: string): Promise<void> {
  return deleteItem(STORES.USER_APPLIANCE_ADAPTATION_PREFS, id);
}

/**
 * Get all user appliance adaptation preferences
 */
export async function getAllUserPreferences(): Promise<UserApplianceAdaptationPreference[]> {
  return getAllItems<UserApplianceAdaptationPreference>(STORES.USER_APPLIANCE_ADAPTATION_PREFS);
}

/**
 * Get most frequently used adaptations (for learning insights)
 */
export async function getMostFrequentAdaptations(
  limit: number = 10
): Promise<UserApplianceAdaptationPreference[]> {
  const prefs = await getAllUserPreferences();
  return prefs
    .sort((a, b) => b.timesUsed - a.timesUsed)
    .slice(0, limit);
}

// =============================================================================
// INTELLIGENT ADAPTATION ANALYSIS
// =============================================================================

/**
 * Analyze the impact of an appliance adaptation on a specific recipe step
 */
export function analyzeAdaptationImpact(
  adaptation: ApplianceAdaptation,
  step?: RecipeStep
): {
  confidence: number;
  impact: string[];
  adjustments: string[];
  warnings: string[];
} {
  const impacts: string[] = [];
  const adjustments: string[] = [];
  const warnings: string[] = [];

  // Compile impact descriptions
  if (adaptation.impact.technique) {
    impacts.push(`Técnica: ${adaptation.impact.technique}`);
  }
  if (adaptation.impact.timing) {
    impacts.push(`Tiempo: ${adaptation.impact.timing}`);
  }
  if (adaptation.impact.quality) {
    impacts.push(`Calidad: ${adaptation.impact.quality}`);
  }
  if (adaptation.impact.difficulty) {
    impacts.push(`Dificultad: ${adaptation.impact.difficulty}`);
  }

  // Compile adjustment recommendations
  if (adaptation.adjustments.timing) {
    const { adjustment, reason } = adaptation.adjustments.timing;
    const sign = adjustment > 0 ? '+' : '';
    adjustments.push(`Ajusta el tiempo: ${sign}${adjustment} minutos (${reason})`);
  }

  if (adaptation.adjustments.temperature) {
    const { adjustment, reason } = adaptation.adjustments.temperature;
    const sign = adjustment > 0 ? '+' : '';
    adjustments.push(`Ajusta la temperatura: ${sign}${adjustment}°C (${reason})`);
  }

  if (adaptation.adjustments.additionalSteps) {
    adaptation.adjustments.additionalSteps.forEach(stepDesc => {
      adjustments.push(stepDesc);
    });
  }

  if (adaptation.adjustments.warnings) {
    warnings.push(...adaptation.adjustments.warnings);
  }

  return {
    confidence: adaptation.confidence,
    impact: impacts,
    adjustments,
    warnings
  };
}

/**
 * Get best alternative recommendation for an appliance
 * Takes into account both catalog adaptations and user preferences
 */
export async function getBestAlternative(
  applianceId: string,
  userAppliances: string[],
  recipeContext?: {
    recipeType?: string;
    cookingMethod?: string;
  }
): Promise<{
  adaptation: ApplianceAdaptation | null;
  userPreferred: boolean;
  analysis: ReturnType<typeof analyzeAdaptationImpact> | null;
}> {
  // First check user preferences
  const userPrefs = await getUserPreferredAlternatives(applianceId);
  for (const pref of userPrefs) {
    // Check if user actually has this alternative
    if (userAppliances.includes(pref.preferredAlternativeId)) {
      const adaptation = await getAdaptation(applianceId, pref.preferredAlternativeId);
      if (adaptation) {
        return {
          adaptation,
          userPreferred: true,
          analysis: analyzeAdaptationImpact(adaptation)
        };
      }
    }
  }

  // Fall back to contextual adaptations
  const contextualAdapt = await getContextualAdaptations(applianceId, recipeContext);

  // Filter to only alternatives user actually has
  const viable = contextualAdapt.filter(adapt =>
    userAppliances.includes(adapt.alternativeApplianceId)
  );

  if (viable.length === 0) {
    return {
      adaptation: null,
      userPreferred: false,
      analysis: null
    };
  }

  const bestAdapt = viable[0];

  return {
    adaptation: bestAdapt,
    userPreferred: false,
    analysis: analyzeAdaptationImpact(bestAdapt)
  };
}
