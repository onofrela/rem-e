/**
 * User Knowledge Service
 *
 * Manages the user's knowledge base - learned preferences and limitations:
 * - Store and retrieve user knowledge entries
 * - Build LLM context from knowledge base
 * - Learn automatically from cooking sessions
 * - Filter knowledge by relevance
 */

import type {
  UserKnowledgeEntry,
  UserKnowledgeType,
  UserKnowledgeContent,
  KnowledgeSource
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
// KNOWLEDGE ENTRY CRUD OPERATIONS
// =============================================================================

/**
 * Add a new knowledge entry
 */
export async function addKnowledgeEntry(
  type: UserKnowledgeType,
  content: UserKnowledgeContent,
  learnedFrom?: KnowledgeSource,
  confidence: number = 0.8
): Promise<UserKnowledgeEntry> {
  const now = new Date().toISOString();

  const entry: UserKnowledgeEntry = {
    id: generateId('knowledge'),
    userId: undefined,
    type,
    content,
    learnedFrom,
    confidence,
    timesApplied: 0,
    lastAppliedAt: undefined,
    createdAt: now,
    updatedAt: now
  };

  return addItem(STORES.USER_KNOWLEDGE, entry);
}

/**
 * Get a specific knowledge entry by ID
 */
export async function getKnowledgeById(id: string): Promise<UserKnowledgeEntry | null> {
  return getItem<UserKnowledgeEntry>(STORES.USER_KNOWLEDGE, id);
}

/**
 * Get all knowledge entries
 */
export async function getAllKnowledge(): Promise<UserKnowledgeEntry[]> {
  const entries = await getAllItems<UserKnowledgeEntry>(STORES.USER_KNOWLEDGE);

  // Sort by confidence * times applied (most relevant first)
  return entries.sort((a, b) => {
    const scoreA = a.confidence * (a.timesApplied + 1);
    const scoreB = b.confidence * (b.timesApplied + 1);
    return scoreB - scoreA;
  });
}

/**
 * Get knowledge entries by type
 */
export async function getKnowledgeByType(
  type: UserKnowledgeType
): Promise<UserKnowledgeEntry[]> {
  return getByIndex<UserKnowledgeEntry>(STORES.USER_KNOWLEDGE, 'type', type);
}

/**
 * Update a knowledge entry
 */
export async function updateKnowledgeEntry(
  id: string,
  updates: Partial<Omit<UserKnowledgeEntry, 'id' | 'userId' | 'createdAt' | 'updatedAt'>>
): Promise<UserKnowledgeEntry> {
  const existing = await getKnowledgeById(id);

  if (!existing) {
    throw new Error(`Knowledge entry ${id} not found`);
  }

  const updated: UserKnowledgeEntry = {
    ...existing,
    ...updates,
    updatedAt: new Date().toISOString()
  };

  return updateItem(STORES.USER_KNOWLEDGE, updated);
}

/**
 * Delete a knowledge entry
 */
export async function deleteKnowledgeEntry(id: string): Promise<void> {
  return deleteItem(STORES.USER_KNOWLEDGE, id);
}

/**
 * Update knowledge confidence
 */
export async function updateKnowledgeConfidence(
  id: string,
  newConfidence: number
): Promise<UserKnowledgeEntry> {
  if (newConfidence < 0 || newConfidence > 1) {
    throw new Error('Confidence must be between 0 and 1');
  }

  return updateKnowledgeEntry(id, { confidence: newConfidence });
}

/**
 * Increment times applied counter
 */
export async function incrementKnowledgeUsage(id: string): Promise<UserKnowledgeEntry> {
  const entry = await getKnowledgeById(id);

  if (!entry) {
    throw new Error(`Knowledge entry ${id} not found`);
  }

  const updated: UserKnowledgeEntry = {
    ...entry,
    timesApplied: entry.timesApplied + 1,
    lastAppliedAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };

  return updateItem(STORES.USER_KNOWLEDGE, updated);
}

// =============================================================================
// CONTEXTUAL KNOWLEDGE RETRIEVAL
// =============================================================================

/**
 * Get relevant knowledge for a specific context
 */
export async function getRelevantKnowledge(context: {
  recipeType?: string;
  ingredientIds?: string[];
  applianceIds?: string[];
  cookingMethod?: string;
}): Promise<UserKnowledgeEntry[]> {
  const allKnowledge = await getAllKnowledge();

  const relevant = allKnowledge.filter(entry => {
    const appliesTo = entry.content.appliesTo;

    if (!appliesTo) {
      // If no specific applicability, it's general knowledge
      return true;
    }

    // Check if knowledge applies to this context
    if (context.recipeType && appliesTo.recipeTypes) {
      if (appliesTo.recipeTypes.includes(context.recipeType)) {
        return true;
      }
    }

    if (context.ingredientIds && appliesTo.ingredients) {
      if (context.ingredientIds.some(id => appliesTo.ingredients?.includes(id))) {
        return true;
      }
    }

    if (context.applianceIds && appliesTo.appliances) {
      if (context.applianceIds.some(id => appliesTo.appliances?.includes(id))) {
        return true;
      }
    }

    if (context.cookingMethod && appliesTo.cookingMethods) {
      if (appliesTo.cookingMethods.includes(context.cookingMethod)) {
        return true;
      }
    }

    return false;
  });

  return relevant;
}

/**
 * Get high-confidence knowledge (above threshold)
 */
export async function getHighConfidenceKnowledge(
  threshold: number = 0.7
): Promise<UserKnowledgeEntry[]> {
  const allKnowledge = await getAllKnowledge();
  return allKnowledge.filter(entry => entry.confidence >= threshold);
}

/**
 * Get frequently applied knowledge
 */
export async function getFrequentlyAppliedKnowledge(
  minTimesApplied: number = 3
): Promise<UserKnowledgeEntry[]> {
  const allKnowledge = await getAllKnowledge();
  return allKnowledge.filter(entry => entry.timesApplied >= minTimesApplied);
}

// =============================================================================
// LLM CONTEXT BUILDING
// =============================================================================

/**
 * Build a text context string for the LLM from user knowledge
 */
export async function buildLLMContext(
  context?: {
    recipeType?: string;
    ingredientIds?: string[];
    applianceIds?: string[];
    cookingMethod?: string;
  }
): Promise<string> {
  const relevantKnowledge = context
    ? await getRelevantKnowledge(context)
    : await getHighConfidenceKnowledge(0.6);

  if (relevantKnowledge.length === 0) {
    return '';
  }

  const contextLines: string[] = [
    '## Contexto del Usuario\n',
    'Información importante sobre las preferencias y limitaciones del usuario:\n'
  ];

  // Group by type
  const byType = new Map<UserKnowledgeType, UserKnowledgeEntry[]>();
  relevantKnowledge.forEach(entry => {
    if (!byType.has(entry.type)) {
      byType.set(entry.type, []);
    }
    byType.get(entry.type)!.push(entry);
  });

  // Format each type
  const typeLabels: Record<UserKnowledgeType, string> = {
    'measurement-preference': '### Preferencias de Medición',
    'equipment-limitation': '### Limitaciones de Equipo',
    'skill-note': '### Notas de Habilidad',
    'ingredient-preference': '### Preferencias de Ingredientes',
    'general-tip': '### Consejos Generales'
  };

  byType.forEach((entries, type) => {
    contextLines.push(`\n${typeLabels[type]}`);

    entries.forEach(entry => {
      contextLines.push(`- ${entry.content.summary}`);
      if (entry.content.details !== entry.content.summary) {
        contextLines.push(`  * ${entry.content.details}`);
      }
    });
  });

  contextLines.push('\n');

  return contextLines.join('\n');
}

/**
 * Build a structured context object for LLM (as JSON)
 */
export async function buildStructuredLLMContext(
  context?: {
    recipeType?: string;
    ingredientIds?: string[];
    applianceIds?: string[];
    cookingMethod?: string;
  }
): Promise<{
  measurementPreferences: string[];
  equipmentLimitations: string[];
  skillNotes: string[];
  ingredientPreferences: string[];
  generalTips: string[];
}> {
  const relevantKnowledge = context
    ? await getRelevantKnowledge(context)
    : await getHighConfidenceKnowledge(0.6);

  const structured = {
    measurementPreferences: [] as string[],
    equipmentLimitations: [] as string[],
    skillNotes: [] as string[],
    ingredientPreferences: [] as string[],
    generalTips: [] as string[]
  };

  relevantKnowledge.forEach(entry => {
    switch (entry.type) {
      case 'measurement-preference':
        structured.measurementPreferences.push(entry.content.summary);
        break;
      case 'equipment-limitation':
        structured.equipmentLimitations.push(entry.content.summary);
        break;
      case 'skill-note':
        structured.skillNotes.push(entry.content.summary);
        break;
      case 'ingredient-preference':
        structured.ingredientPreferences.push(entry.content.summary);
        break;
      case 'general-tip':
        structured.generalTips.push(entry.content.summary);
        break;
    }
  });

  return structured;
}

// =============================================================================
// AUTOMATIC LEARNING
// =============================================================================

/**
 * Learn from a user's substitution preference
 */
export async function learnFromSubstitution(
  originalIngredientId: string,
  substituteIngredientId: string,
  recipeId: string,
  historyId?: string
): Promise<UserKnowledgeEntry | null> {
  // Check if we already have knowledge about this substitution preference
  const existingKnowledge = await getAllKnowledge();
  const existing = existingKnowledge.find(k =>
    k.type === 'ingredient-preference' &&
    k.content.summary.includes(originalIngredientId) &&
    k.content.summary.includes(substituteIngredientId)
  );

  if (existing) {
    // Update confidence and usage
    await updateKnowledgeEntry(existing.id, {
      confidence: Math.min(existing.confidence + 0.1, 1.0)
    });
    await incrementKnowledgeUsage(existing.id);
    return existing;
  }

  // Create new knowledge entry
  const content: UserKnowledgeContent = {
    summary: `Usuario prefiere sustituir ingrediente ${originalIngredientId} con ${substituteIngredientId}`,
    details: `El usuario ha usado ${substituteIngredientId} en lugar de ${originalIngredientId} exitosamente`,
    context: ['sustitución', 'preferencia'],
    appliesTo: {
      ingredients: [originalIngredientId, substituteIngredientId]
    }
  };

  const source: KnowledgeSource = {
    recipeId,
    historyId,
    timestamp: new Date().toISOString()
  };

  return addKnowledgeEntry('ingredient-preference', content, source, 0.7);
}

/**
 * Learn from measurement difficulties
 */
export async function learnMeasurementPreference(
  preferredMeasurement: string,
  reason: string,
  recipeId?: string,
  historyId?: string
): Promise<UserKnowledgeEntry> {
  const content: UserKnowledgeContent = {
    summary: `Usuario prefiere ${preferredMeasurement}`,
    details: reason,
    context: ['medición', 'preferencia']
  };

  const source: KnowledgeSource | undefined = recipeId
    ? {
        recipeId,
        historyId,
        timestamp: new Date().toISOString()
      }
    : undefined;

  return addKnowledgeEntry('measurement-preference', content, source, 0.8);
}

/**
 * Learn from equipment limitations
 */
export async function learnEquipmentLimitation(
  missingApplianceId: string,
  alternativeUsed: string,
  recipeId?: string,
  historyId?: string
): Promise<UserKnowledgeEntry> {
  const content: UserKnowledgeContent = {
    summary: `Usuario no tiene ${missingApplianceId}, usa ${alternativeUsed}`,
    details: `Como alternativa a ${missingApplianceId}, el usuario usa ${alternativeUsed}`,
    context: ['equipo', 'limitación', 'alternativa'],
    appliesTo: {
      appliances: [missingApplianceId]
    }
  };

  const source: KnowledgeSource | undefined = recipeId
    ? {
        recipeId,
        historyId,
        timestamp: new Date().toISOString()
      }
    : undefined;

  return addKnowledgeEntry('equipment-limitation', content, source, 0.9);
}

/**
 * Learn from cooking session notes
 */
export async function learnFromSessionNote(
  noteContent: string,
  noteType: 'tip' | 'warning' | 'modification' | 'clarification',
  recipeId: string,
  historyId: string
): Promise<UserKnowledgeEntry | null> {
  // Only learn from tips and modifications
  if (noteType !== 'tip' && noteType !== 'modification') {
    return null;
  }

  const knowledgeType: UserKnowledgeType =
    noteType === 'modification' ? 'skill-note' : 'general-tip';

  const content: UserKnowledgeContent = {
    summary: noteContent,
    details: noteContent,
    context: [noteType, 'aprendido']
  };

  const source: KnowledgeSource = {
    recipeId,
    historyId,
    timestamp: new Date().toISOString()
  };

  return addKnowledgeEntry(knowledgeType, content, source, 0.6);
}

/**
 * Get knowledge statistics
 */
export async function getKnowledgeStatistics(): Promise<{
  totalEntries: number;
  byType: Record<UserKnowledgeType, number>;
  avgConfidence: number;
  totalApplications: number;
}> {
  const allKnowledge = await getAllKnowledge();

  const byType: Record<UserKnowledgeType, number> = {
    'measurement-preference': 0,
    'equipment-limitation': 0,
    'skill-note': 0,
    'ingredient-preference': 0,
    'general-tip': 0
  };

  let totalConfidence = 0;
  let totalApplications = 0;

  allKnowledge.forEach(entry => {
    byType[entry.type]++;
    totalConfidence += entry.confidence;
    totalApplications += entry.timesApplied;
  });

  return {
    totalEntries: allKnowledge.length,
    byType,
    avgConfidence: allKnowledge.length > 0 ? totalConfidence / allKnowledge.length : 0,
    totalApplications
  };
}
