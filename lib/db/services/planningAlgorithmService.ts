/**
 * Planning Algorithm Service
 * Generates weekly meal plans using questionnaire or LLM
 */

import type { QuestionnaireAnswers, MealPlan, WeeklyMeals, DailyMeals, Recipe } from '../schemas/types';
import * as recipeService from './recipeService';
import * as inventoryService from './inventoryService';
import { generatePlanName, getNextWeekDates } from './mealPlanService';
import { saveUserPreferences } from './userPreferencesService';
import { createLMStudioClient } from '../llm/client';

const DAYS: Array<keyof WeeklyMeals> = ['lunes', 'martes', 'miercoles', 'jueves', 'viernes', 'sabado', 'domingo'];
const MEAL_TYPES: Array<keyof DailyMeals> = ['desayuno', 'almuerzo', 'comida', 'cena'];

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

  // Get inventory to prioritize makeable recipes
  const inventory = await inventoryService.getInventory();
  const inventoryIds = new Set(inventory.map(item => item.ingredientId));

  // Score recipes by inventory match
  const scoredRecipes = eligibleRecipes.map(recipe => {
    const requiredIds = recipe.ingredients.map(ing => ing.ingredientId);
    const matchCount = requiredIds.filter(id => inventoryIds.has(id)).length;
    const matchScore = requiredIds.length > 0 ? matchCount / requiredIds.length : 0;

    return { recipe, matchScore };
  });

  // Sort by match score
  scoredRecipes.sort((a, b) => b.matchScore - a.matchScore);

  // Build weekly plan
  const meals: WeeklyMeals = {} as WeeklyMeals;
  const usedRecipes = new Set<string>();

  for (const day of DAYS) {
    meals[day] = {
      desayuno: selectRecipe(scoredRecipes, usedRecipes, 'breakfast'),
      almuerzo: null, // Skip lunch for simplicity (can enable later)
      comida: selectRecipe(scoredRecipes, usedRecipes, 'main'),
      cena: selectRecipe(scoredRecipes, usedRecipes, 'dinner'),
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
 * Selecciona una receta evitando repeticiones
 */
function selectRecipe(
  scoredRecipes: Array<{ recipe: Recipe; matchScore: number }>,
  usedRecipes: Set<string>,
  mealType: string
): string | null {
  // Filter for appropriate meal type
  let candidates = scoredRecipes.filter(sr => !usedRecipes.has(sr.recipe.id));

  if (candidates.length === 0) {
    // Allow reuse if we've exhausted all recipes
    candidates = scoredRecipes;
  }

  if (candidates.length === 0) return null;

  // Take top scored recipe
  const selected = candidates[0];
  usedRecipes.add(selected.recipe.id);

  return selected.recipe.id;
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
    systemPrompt: `Eres un asistente de planificación de comidas. Tu trabajo es generar un plan semanal usando las funciones disponibles.

PROCESO:
1. Usa searchRecipesForPlanning() con filtros según las necesidades del usuario (ej: tags=["vegetariano"], excludeTags=["lácteos"], maxCalories=500)
2. Usa getUserCookingHistory() para ver qué recetas le gustan al usuario
3. Selecciona recetas variadas para cada día
4. Responde con JSON en este formato exacto:
{
  "lunes": {"desayuno": "recipeId", "almuerzo": null, "comida": "recipeId", "cena": "recipeId"},
  "martes": {"desayuno": "recipeId", "almuerzo": null, "comida": "recipeId", "cena": "recipeId"},
  "miercoles": {"desayuno": "recipeId", "almuerzo": null, "comida": "recipeId", "cena": "recipeId"},
  "jueves": {"desayuno": "recipeId", "almuerzo": null, "comida": "recipeId", "cena": "recipeId"},
  "viernes": {"desayuno": "recipeId", "almuerzo": null, "comida": "recipeId", "cena": "recipeId"},
  "sabado": {"desayuno": "recipeId", "almuerzo": null, "comida": "recipeId", "cena": "recipeId"},
  "domingo": {"desayuno": "recipeId", "almuerzo": null, "comida": "recipeId", "cena": "recipeId"}
}

IMPORTANTE:
- USA LAS FUNCIONES para buscar recetas, NO inventes IDs
- Responde SOLO con el JSON final, sin explicaciones
- Asegúrate de incluir TODOS los días de la semana`,
  });

  // Prompt simplificado - el LLM usará las funciones para obtener datos
  const userMessage = `Genera un plan semanal con estas indicaciones: "${userPrompt}"

Pasos:
1. Usa searchRecipesForPlanning() para buscar recetas que cumplan los criterios
2. Usa getUserCookingHistory() para ver preferencias del usuario
3. Genera el plan JSON con los IDs de recetas seleccionadas`;

  const result = await client.chat(userMessage);
  const response = result.response;

  console.log('🤖 LLM response:', response);
  console.log('🔧 Function calls made:', result.functionCalls?.map(fc => fc.name));

  // Parse LLM response
  const meals = parseWeeklyMealsFromLLM(response);

  console.log('📊 Parsed meals:', meals);

  // Create plan
  const { startDate, endDate } = getNextWeekDates();
  const plan: Omit<MealPlan, 'id' | 'createdAt' | 'updatedAt'> = {
    name: generatePlanName(startDate, endDate),
    startDate,
    endDate,
    meals,
    generatedBy: 'llm',
  };

  console.log('📅 Generated plan from LLM:', {
    name: plan.name,
    startDate: plan.startDate,
    endDate: plan.endDate,
    mealsCount: Object.keys(plan.meals).length,
    meals: plan.meals,
  });

  return plan as MealPlan;
}

/**
 * Parsea respuesta del LLM a WeeklyMeals
 */
function parseWeeklyMealsFromLLM(llmResponse: string): WeeklyMeals {
  try {
    const parsed = JSON.parse(llmResponse);

    // Validate structure
    const meals: WeeklyMeals = {} as WeeklyMeals;
    for (const day of DAYS) {
      meals[day] = {
        desayuno: parsed[day]?.desayuno || null,
        almuerzo: parsed[day]?.almuerzo || null,
        comida: parsed[day]?.comida || null,
        cena: parsed[day]?.cena || null,
      };
    }

    return meals;
  } catch (error) {
    console.error('Error parsing LLM response:', error);
    // Return empty plan on error
    const emptyMeals: WeeklyMeals = {} as WeeklyMeals;
    for (const day of DAYS) {
      emptyMeals[day] = {
        desayuno: null,
        almuerzo: null,
        comida: null,
        cena: null,
      };
    }
    return emptyMeals;
  }
}
