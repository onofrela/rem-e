/**
 * Planning Algorithm Service
 * Generates weekly meal plans using questionnaire or LLM
 */

import type { QuestionnaireAnswers, MealPlan, WeeklyMeals, DailyMeals, Recipe, RecipeHistory } from '../schemas/types';
import * as recipeService from './recipeService';
import * as inventoryService from './inventoryService';
import { generatePlanName, getNextWeekDates } from './mealPlanService';
import { saveUserPreferences, getUserPreferences } from './userPreferencesService';
import { createLMStudioClient } from '../llm/client';
import { STORES, getAllItems } from '../stores/database';

const DAYS: Array<keyof WeeklyMeals> = ['lunes', 'martes', 'miercoles', 'jueves', 'viernes', 'sabado', 'domingo'];
const MEAL_TYPES: Array<keyof DailyMeals> = ['desayuno', 'almuerzo', 'comida', 'cena'];

// =============================================================================
// PROBABILISTIC SCORING SYSTEM
// =============================================================================

interface RecipeScore {
  recipe: Recipe;
  score: number;
  factors: {
    inventoryMatch: number;
    userHistory: number;
    variety: number;
    freshness: number;
    preferences: number;
  };
}

/**
 * Calcula un score probabilístico para cada receta basado en múltiples factores
 */
async function calculateRecipeScores(
  recipes: Recipe[],
  inventoryIds: Set<string>,
  usedRecipeIds: Set<string>,
  preferences?: QuestionnaireAnswers | null
): Promise<RecipeScore[]> {
  // Obtener historial de cocina del usuario
  const history = await getAllItems<RecipeHistory>(STORES.RECIPE_HISTORY);
  const historyMap = new Map<string, { count: number; avgRating: number }>();

  history.forEach(h => {
    if (!historyMap.has(h.recipeId)) {
      historyMap.set(h.recipeId, { count: 0, avgRating: 0 });
    }
    const data = historyMap.get(h.recipeId)!;
    data.count++;
    if (h.rating) {
      data.avgRating = (data.avgRating * (data.count - 1) + h.rating) / data.count;
    }
  });

  // Obtener preferencias guardadas
  const savedPrefs = preferences || await getUserPreferences();

  // Calcular scores para cada receta
  const scoredRecipes = recipes.map(recipe => {
    // 1. INVENTORY MATCH (0-1): Qué tan bien coincide con lo que tiene
    const requiredIds = recipe.ingredients.map(ing => ing.ingredientId);
    const matchCount = requiredIds.filter(id => inventoryIds.has(id)).length;
    const inventoryMatch = requiredIds.length > 0 ? matchCount / requiredIds.length : 0;

    // 2. USER HISTORY (0-1): Recetas que ha cocinado y le gustaron
    const historyData = historyMap.get(recipe.id);
    let userHistory = 0;
    if (historyData) {
      // Favorece recetas bien calificadas pero no muy frecuentes (para variedad)
      const frequencyPenalty = Math.max(0, 1 - (historyData.count / 10)); // Penaliza si ya la hizo >10 veces
      const ratingBonus = historyData.avgRating ? historyData.avgRating / 5 : 0.5;
      userHistory = ratingBonus * frequencyPenalty;
    } else {
      // Recetas nuevas tienen score medio para exploración
      userHistory = 0.5;
    }

    // 3. VARIETY (0-1): Penaliza recetas ya usadas en este plan
    const variety = usedRecipeIds.has(recipe.id) ? 0.3 : 1.0; // Fuerte penalización

    // 4. FRESHNESS (0-1): Favorece recetas que no ha hecho recientemente
    const recentHistory = history
      .filter(h => h.recipeId === recipe.id)
      .sort((a, b) => new Date(b.startedAt).getTime() - new Date(a.startedAt).getTime())[0];

    let freshness = 1.0;
    if (recentHistory) {
      const daysSince = (Date.now() - new Date(recentHistory.startedAt).getTime()) / (1000 * 60 * 60 * 24);
      freshness = Math.min(1, daysSince / 14); // Penaliza si la hizo hace menos de 14 días
    }

    // 5. PREFERENCES (0-1): Qué tan bien coincide con preferencias declaradas
    let preferences = 0.5;
    if (savedPrefs) {
      let prefScore = 0;
      let prefCount = 0;

      // Cocinas preferidas
      if (savedPrefs.preferredCuisines && savedPrefs.preferredCuisines.length > 0 && recipe.cuisine) {
        const cuisineMatch = savedPrefs.preferredCuisines.includes(recipe.cuisine);
        prefScore += cuisineMatch ? 1 : 0.3;
        prefCount++;
      }

      // Nivel de habilidad
      const difficultyMatch = {
        beginner: { 'Fácil': 1, 'Media': 0.5, 'Difícil': 0.1 },
        intermediate: { 'Fácil': 0.8, 'Media': 1, 'Difícil': 0.6 },
        advanced: { 'Fácil': 0.7, 'Media': 0.9, 'Difícil': 1 },
      };
      const skillLevel = savedPrefs.skillLevel || 'intermediate';
      prefScore += (difficultyMatch[skillLevel] as any)[recipe.difficulty] || 0.5;
      prefCount++;

      // Tiempo disponible
      if (savedPrefs.timeAvailable) {
        const timeMatch = {
          low: recipe.time <= 30 ? 1 : 0.3,
          medium: recipe.time <= 60 ? 1 : 0.5,
          high: 1,
        };
        prefScore += timeMatch[savedPrefs.timeAvailable] || 0.5;
        prefCount++;
      }

      preferences = prefCount > 0 ? prefScore / prefCount : 0.5;
    }

    // SCORE FINAL: Promedio ponderado
    const weights = {
      inventoryMatch: 0.3,    // 30% - Prioriza lo que tiene
      userHistory: 0.25,      // 25% - Lo que le ha gustado
      variety: 0.25,          // 25% - CRÍTICO: Evita repeticiones
      freshness: 0.1,         // 10% - Evita recetas muy recientes
      preferences: 0.1,       // 10% - Preferencias generales
    };

    const totalScore =
      inventoryMatch * weights.inventoryMatch +
      userHistory * weights.userHistory +
      variety * weights.variety +
      freshness * weights.freshness +
      preferences * weights.preferences;

    return {
      recipe,
      score: totalScore,
      factors: {
        inventoryMatch,
        userHistory,
        variety,
        freshness,
        preferences,
      },
    };
  });

  // Ordenar por score descendente
  return scoredRecipes.sort((a, b) => b.score - a.score);
}

/**
 * Selección probabilística basada en scores (no siempre la mejor)
 */
function selectRecipeProbabilistic(
  scoredRecipes: RecipeScore[],
  usedRecipes: Set<string>,
  mealType: string
): string | null {
  if (scoredRecipes.length === 0) return null;

  // Filtrar por tipo de comida
  const mealTypeTags: Record<string, string[]> = {
    breakfast: ['desayuno', 'breakfast', 'morning'],
    main: ['comida', 'almuerzo', 'lunch', 'main course', 'principal'],
    dinner: ['cena', 'dinner', 'evening'],
  };

  const relevantTags = mealTypeTags[mealType] || [];

  let candidates = scoredRecipes.filter(sr => {
    // Filtrar usadas
    if (usedRecipes.has(sr.recipe.id)) return false;

    // Filtrar por tipo de comida
    if (relevantTags.length > 0) {
      const recipeTags = sr.recipe.tags.map(t => t.toLowerCase());
      const hasMatchingTag = relevantTags.some(tag =>
        recipeTags.some(recipeTag => recipeTag.includes(tag))
      );
      const categoryMatch = relevantTags.some(tag =>
        sr.recipe.category.toLowerCase().includes(tag)
      );
      return hasMatchingTag || categoryMatch;
    }
    return true;
  });

  if (candidates.length === 0) {
    // Relajar filtro de tipo de comida
    candidates = scoredRecipes.filter(sr => !usedRecipes.has(sr.recipe.id));
  }

  if (candidates.length === 0) return null;

  // SELECCIÓN PROBABILÍSTICA con temperature
  // No siempre selecciona la mejor, sino según probabilidades
  const temperature = 0.7; // 0 = siempre la mejor, 1 = completamente aleatorio

  // Aplicar temperatura a los scores
  const scaledScores = candidates.map(c => Math.pow(c.score, 1 / temperature));
  const totalScore = scaledScores.reduce((sum, s) => sum + s, 0);

  // Selección por ruleta
  const random = Math.random() * totalScore;
  let cumulative = 0;

  for (let i = 0; i < candidates.length; i++) {
    cumulative += scaledScores[i];
    if (random <= cumulative) {
      const selected = candidates[i];
      usedRecipes.add(selected.recipe.id);

      console.log(`✅ Selected ${selected.recipe.name} for ${mealType} (score: ${selected.score.toFixed(3)}, rank: ${i + 1}/${candidates.length})`);
      console.log(`   Factors:`, selected.factors);

      return selected.recipe.id;
    }
  }

  // Fallback: primera candidata
  const selected = candidates[0];
  usedRecipes.add(selected.recipe.id);
  return selected.recipe.id;
}

/**
 * Genera un plan desde el cuestionario
 */
export async function generatePlanFromQuestionnaire(
  answers: QuestionnaireAnswers
): Promise<MealPlan> {
  // Save preferences for future use
  await saveUserPreferences({
    ...answers,
    preferredCuisines: answers.preferredCuisines || []
  });

  // Get all recipes
  const allRecipes = await recipeService.getAllRecipes();

  // Filter recipes based on answers
  let eligibleRecipes = filterRecipesByAnswers(allRecipes, answers);

  console.log(`📋 ${eligibleRecipes.length} recetas elegibles después de filtros`);

  // Get inventory to prioritize makeable recipes
  const inventory = await inventoryService.getInventory();
  const inventoryIds = new Set(inventory.map(item => item.ingredientId));

  // Build weekly plan con sistema probabilístico
  const meals: WeeklyMeals = {} as WeeklyMeals;
  const usedRecipes = new Set<string>();

  for (const day of DAYS) {
    // Re-calcular scores en cada iteración para actualizar factor de variedad
    const scoredRecipes = await calculateRecipeScores(
      eligibleRecipes,
      inventoryIds,
      usedRecipes,
      answers
    );

    meals[day] = {
      desayuno: selectRecipeProbabilistic(scoredRecipes, usedRecipes, 'breakfast'),
      almuerzo: null,
      comida: selectRecipeProbabilistic(scoredRecipes, usedRecipes, 'main'),
      cena: selectRecipeProbabilistic(scoredRecipes, usedRecipes, 'dinner'),
    };
  }

  // Create plan
  const { startDate, endDate } = getNextWeekDates();
  const plan: Omit<MealPlan, 'id' | 'createdAt' | 'updatedAt'> = {
    name: generatePlanName(startDate, endDate),
    startDate,
    endDate,
    meals,
    generatedBy: 'questionnaire',
    metadata: {
      goals: answers.goals,
      dietaryRestrictions: answers.dietaryRestrictions,
      peopleCount: answers.peopleCount,
    },
  };

  console.log('📅 Generated plan from questionnaire:', {
    name: plan.name,
    startDate: plan.startDate,
    endDate: plan.endDate,
    mealsCount: Object.keys(plan.meals).length,
    meals: plan.meals,
  });

  return plan as MealPlan;
}

/**
 * Filtra recetas según las respuestas del cuestionario
 */
function filterRecipesByAnswers(recipes: Recipe[], answers: QuestionnaireAnswers): Recipe[] {
  return recipes.filter(recipe => {
    // Filter by dietary restrictions
    if (answers.dietaryRestrictions.includes('vegetarian')) {
      if (!recipe.tags.includes('vegetariano')) return false;
    }
    if (answers.dietaryRestrictions.includes('vegan')) {
      if (!recipe.tags.includes('vegano')) return false;
    }
    if (answers.dietaryRestrictions.includes('gluten_free')) {
      if (!recipe.tags.includes('sin gluten')) return false;
    }

    // Filter by skill level
    if (answers.skillLevel === 'beginner' && recipe.difficulty === 'Avanzado') {
      return false;
    }

    // Filter by time available
    if (answers.timeAvailable === 'low' && recipe.time > 30) {
      return false;
    }
    if (answers.timeAvailable === 'medium' && recipe.time > 60) {
      return false;
    }

    return true;
  });
}

/**
 * Genera un plan con LLM usando function calling
 */
export async function generatePlanWithLLM(
  userPrompt: string,
  preferredLanguage: string = 'es'
): Promise<MealPlan> {
  // Create LLM client con system prompt optimizado para function calling
  const client = createLMStudioClient({
    systemPrompt: `Eres un asistente experto en planificación de comidas. Tu objetivo es crear planes VARIADOS y BALANCEADOS que eviten la monotonía.

PROCESO OBLIGATORIO:
1. PRIMERO: Llama searchRecipesForPlanning() MÚLTIPLES VECES para obtener MUCHAS opciones:
   - Para desayunos: searchRecipesForPlanning({mealType: "desayuno", limit: 15})
   - Para comidas: searchRecipesForPlanning({mealType: "comida", limit: 15})
   - Para cenas: searchRecipesForPlanning({mealType: "cena", limit: 15})
   - Aplica filtros según las necesidades del usuario (tags, excludeTags, maxTime, difficulty, etc.)

2. SEGUNDO: Llama getUserCookingHistory() para conocer las preferencias del usuario

3. TERCERO: Con los IDs de recetas REALES obtenidos, construye un plan VARIADO

FORMATO DE RESPUESTA (JSON PURO, SIN TEXTO ADICIONAL):
{
  "lunes": {"desayuno": "rec_xxx", "almuerzo": null, "comida": "rec_yyy", "cena": "rec_zzz"},
  "martes": {"desayuno": "rec_aaa", "almuerzo": null, "comida": "rec_bbb", "cena": "rec_ccc"},
  "miercoles": {"desayuno": "rec_ddd", "almuerzo": null, "comida": "rec_eee", "cena": "rec_fff"},
  "jueves": {"desayuno": "rec_ggg", "almuerzo": null, "comida": "rec_hhh", "cena": "rec_iii"},
  "viernes": {"desayuno": "rec_jjj", "almuerzo": null, "comida": "rec_kkk", "cena": "rec_lll"},
  "sabado": {"desayuno": "rec_mmm", "almuerzo": null, "comida": "rec_nnn", "cena": "rec_ooo"},
  "domingo": {"desayuno": "rec_ppp", "almuerzo": null, "comida": "rec_qqq", "cena": "rec_rrr"}
}

REGLAS CRÍTICAS PARA VARIEDAD:
1. USA SOLO IDs de recetas que obtuviste de las funciones (NO inventes IDs)
2. Responde ÚNICAMENTE con el objeto JSON, sin texto antes ni después
3. TODOS los días deben tener desayuno, comida y cena (almuerzo siempre null)

4. **VARIEDAD OBLIGATORIA** (MUY IMPORTANTE):
   - Usa recetas DIFERENTES cada día - evita repeticiones
   - NO uses la misma receta más de 1 vez en la semana (solo repite si no hay suficientes opciones)
   - Distribuye las recetas de forma ALEATORIA, no uses siempre las primeras de la lista
   - Mezcla diferentes tipos de cocina (mexicana, italiana, asiática, etc.)
   - Varía dificultades y tiempos de preparación

5. **SELECCIÓN INTELIGENTE**:
   - Da prioridad a recetas bien valoradas del historial del usuario
   - Considera recetas que el usuario no ha hecho recientemente
   - Balancea entre recetas favoritas y nuevas opciones para explorar
   - Usa recetas apropiadas para cada tiempo de comida (desayuno != cena)

EJEMPLO DE BUEN PLAN (VARIADO):
- Lunes: Avena con frutas, Pasta al pesto, Tacos de pollo
- Martes: Smoothie bowl, Sopa de lentejas, Salmón al horno
- Miércoles: Huevos revueltos, Arroz frito, Pizza casera
- Jueves: Pancakes, Ensalada césar, Pollo al curry
... (7 días completos, TODOS CON RECETAS DIFERENTES)

EJEMPLO DE MAL PLAN (REPETITIVO - NO HACER):
- Lunes: Bowl de quinoa, Bowl de quinoa, Bowl de quinoa ❌
- Martes: Bowl de quinoa, Bowl de quinoa, Bowl de quinoa ❌
... (ESTO ESTÁ MAL - EVITA REPETICIONES)`,
  });

  // Prompt detallado con instrucciones claras
  const userMessage = `Genera un plan semanal de comidas con estas indicaciones: "${userPrompt}"

INSTRUCCIONES:
1. Llama searchRecipesForPlanning() 3 veces (desayunos, comidas, cenas) con los filtros apropiados
2. Llama getUserCookingHistory() para personalizar
3. Responde con el JSON del plan semanal usando los IDs de recetas que obtuviste

Recuerda: Solo JSON puro en tu respuesta final, sin explicaciones.`;

  const result = await client.chat(userMessage);
  const response = result.response;

  console.log('🤖 LLM raw response:', response);
  console.log('🔧 Function calls made:', result.functionCalls?.map(fc => ({ name: fc.name, result: fc.result })));

  // Parse LLM response with better error handling
  const meals = parseWeeklyMealsFromLLM(response, result.functionCalls);

  console.log('📊 Parsed meals:', meals);

  // Validate that we have at least some meals
  const totalMeals = DAYS.reduce((count, day) => {
    const dayMeals = meals[day];
    return count + (dayMeals.desayuno ? 1 : 0) + (dayMeals.comida ? 1 : 0) + (dayMeals.cena ? 1 : 0);
  }, 0);

  if (totalMeals < 7) {
    console.warn('⚠️ Plan generado tiene muy pocas comidas:', totalMeals);
    throw new Error(`El plan generado está incompleto (solo ${totalMeals} comidas). Intenta de nuevo con un prompt más específico.`);
  }

  // Create plan
  const { startDate, endDate } = getNextWeekDates();
  const plan: Omit<MealPlan, 'id' | 'createdAt' | 'updatedAt'> = {
    name: generatePlanName(startDate, endDate),
    startDate,
    endDate,
    meals,
    generatedBy: 'llm',
  };

  console.log('✅ Plan generado exitosamente:', {
    name: plan.name,
    totalMeals,
    meals: plan.meals,
  });

  return plan as MealPlan;
}

/**
 * Parsea respuesta del LLM a WeeklyMeals con mejor manejo de errores
 */
function parseWeeklyMealsFromLLM(llmResponse: string, functionCalls?: any[]): WeeklyMeals {
  try {
    // Intentar limpiar la respuesta si tiene texto adicional
    let jsonString = llmResponse.trim();

    // Buscar el JSON en la respuesta (puede estar rodeado de texto)
    const jsonMatch = jsonString.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      jsonString = jsonMatch[0];
    }

    console.log('🔍 Attempting to parse JSON:', jsonString.substring(0, 200) + '...');

    const parsed = JSON.parse(jsonString);

    // Validate structure
    const meals: WeeklyMeals = {} as WeeklyMeals;
    let validMealsCount = 0;

    for (const day of DAYS) {
      const dayData = parsed[day];

      meals[day] = {
        desayuno: (dayData?.desayuno && typeof dayData.desayuno === 'string') ? dayData.desayuno : null,
        almuerzo: (dayData?.almuerzo && typeof dayData.almuerzo === 'string') ? dayData.almuerzo : null,
        comida: (dayData?.comida && typeof dayData.comida === 'string') ? dayData.comida : null,
        cena: (dayData?.cena && typeof dayData.cena === 'string') ? dayData.cena : null,
      };

      // Count valid meals
      if (meals[day].desayuno) validMealsCount++;
      if (meals[day].comida) validMealsCount++;
      if (meals[day].cena) validMealsCount++;
    }

    console.log(`✅ Parsed ${validMealsCount} meals from LLM response`);

    if (validMealsCount === 0) {
      throw new Error('No se encontraron comidas válidas en la respuesta del LLM');
    }

    return meals;
  } catch (error) {
    console.error('❌ Error parsing LLM response:', error);
    console.error('📄 Raw response:', llmResponse);
    console.error('🔧 Function calls:', functionCalls);

    // Si las funciones fueron llamadas, intentar usar los resultados
    if (functionCalls && functionCalls.length > 0) {
      console.log('🔄 Intentando generar plan desde function calls...');
      return generateFallbackPlanFromFunctionCalls(functionCalls);
    }

    // Si todo falla, lanzar error en lugar de devolver plan vacío
    throw new Error(
      'No se pudo parsear la respuesta del LLM. ' +
      'Asegúrate de que LM Studio esté devolviendo JSON válido. ' +
      `Error: ${error instanceof Error ? error.message : 'Unknown'}`
    );
  }
}

/**
 * Genera un plan de respaldo usando los resultados de las function calls
 * con VARIEDAD FORZADA para evitar repeticiones
 */
function generateFallbackPlanFromFunctionCalls(functionCalls: any[]): WeeklyMeals {
  console.log('🆘 Generando plan de respaldo desde function calls...');

  // Extraer recetas de las llamadas a searchRecipesForPlanning
  const recipesByType: Record<string, string[]> = {
    desayuno: [],
    comida: [],
    cena: [],
  };

  for (const call of functionCalls) {
    if (call.name === 'searchRecipesForPlanning' && call.result?.data?.recipeIds) {
      const mealType = call.arguments?.mealType || 'comida';
      const recipeIds = call.result.data.recipeIds as string[];

      if (recipesByType[mealType]) {
        recipesByType[mealType].push(...recipeIds);
      }
    }
  }

  console.log('📋 Recetas disponibles por tipo:', {
    desayunos: recipesByType.desayuno.length,
    comidas: recipesByType.comida.length,
    cenas: recipesByType.cena.length,
  });

  // Shuffle para variedad
  const shuffle = <T>(array: T[]): T[] => {
    const shuffled = [...array];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
  };

  const shuffledDesayunos = shuffle(recipesByType.desayuno);
  const shuffledComidas = shuffle(recipesByType.comida);
  const shuffledCenas = shuffle(recipesByType.cena);

  // Generar plan VARIADO
  const meals: WeeklyMeals = {} as WeeklyMeals;
  const usedRecipes = new Set<string>();

  for (let i = 0; i < DAYS.length; i++) {
    const day = DAYS[i];

    // Seleccionar desayuno no usado
    const desayuno = shuffledDesayunos.find(id => !usedRecipes.has(id)) ||
                     shuffledDesayunos[i % shuffledDesayunos.length] ||
                     null;
    if (desayuno) usedRecipes.add(desayuno);

    // Seleccionar comida no usada
    const comida = shuffledComidas.find(id => !usedRecipes.has(id)) ||
                   shuffledComidas[i % shuffledComidas.length] ||
                   null;
    if (comida) usedRecipes.add(comida);

    // Seleccionar cena no usada
    const cena = shuffledCenas.find(id => !usedRecipes.has(id)) ||
                 shuffledCenas[i % shuffledCenas.length] ||
                 null;
    if (cena) usedRecipes.add(cena);

    meals[day] = {
      desayuno,
      almuerzo: null,
      comida,
      cena,
    };
  }

  const totalMeals = DAYS.reduce((count, day) => {
    const dayMeals = meals[day];
    return count + (dayMeals.desayuno ? 1 : 0) + (dayMeals.comida ? 1 : 0) + (dayMeals.cena ? 1 : 0);
  }, 0);

  // Contar recetas únicas
  const uniqueRecipes = usedRecipes.size;

  console.log(`✅ Plan de respaldo generado con ${totalMeals} comidas (${uniqueRecipes} recetas únicas)`);

  if (totalMeals === 0) {
    throw new Error('No se pudieron obtener recetas de las function calls');
  }

  return meals;
}
