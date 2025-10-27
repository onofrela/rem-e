// Mock API Layer - Ready for Python Backend Integration
// Future: Replace these mock functions with actual API calls to FastAPI backend

import { mockRecipes, mockIngredients, getRecipesByIngredients, Recipe } from '../utils/mock-data';

// Simulate network delay
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

export interface DetectedIngredient {
  name: string;
  confidence: number;
}

export interface RecipeSuggestion extends Recipe {
  matchScore: number;
  missingIngredients: string[];
}

export const api = {
  /**
   * Detect ingredients from image
   * MOCK: Returns random ingredients with confidence scores
   * FUTURE: POST /api/detect-ingredients
   */
  async detectIngredients(image: File): Promise<DetectedIngredient[]> {
    await delay(2000); // Simulate AI processing time

    // Mock detection - returns random ingredients
    const numDetected = Math.floor(Math.random() * 5) + 3; // 3-7 ingredients
    const detected: DetectedIngredient[] = [];

    for (let i = 0; i < numDetected; i++) {
      const randomIng = mockIngredients[Math.floor(Math.random() * mockIngredients.length)];
      if (!detected.find(d => d.name === randomIng)) {
        detected.push({
          name: randomIng,
          confidence: Math.random() * 0.3 + 0.7, // 70-100% confidence
        });
      }
    }

    return detected;
  },

  /**
   * Get recipe suggestions based on ingredients
   * MOCK: Filters mock recipes by ingredient match
   * FUTURE: POST /api/suggest-recipes
   */
  async getRecipeSuggestions(
    ingredients: string[],
    filters?: {
      maxTime?: number;
      difficulty?: Recipe['difficulty'];
      tags?: string[];
    }
  ): Promise<RecipeSuggestion[]> {
    await delay(500);

    let recipes = mockRecipes;

    // Filter by ingredients
    if (ingredients.length > 0) {
      recipes = getRecipesByIngredients(ingredients);
    }

    // Apply filters
    if (filters?.maxTime) {
      recipes = recipes.filter(r => r.time <= filters.maxTime!);
    }
    if (filters?.difficulty) {
      recipes = recipes.filter(r => r.difficulty === filters.difficulty);
    }
    if (filters?.tags && filters.tags.length > 0) {
      recipes = recipes.filter(r =>
        r.tags.some(tag => filters.tags!.includes(tag))
      );
    }

    // Calculate match scores and missing ingredients
    const suggestions: RecipeSuggestion[] = recipes.map(recipe => {
      const requiredIngredients = recipe.ingredients
        .filter(ing => !ing.optional)
        .map(ing => ing.name.toLowerCase());

      const userIngredientsLower = ingredients.map(i => i.toLowerCase());

      const matches = requiredIngredients.filter(reqIng =>
        userIngredientsLower.some(userIng =>
          reqIng.includes(userIng) || userIng.includes(reqIng)
        )
      );

      const matchScore = requiredIngredients.length > 0
        ? matches.length / requiredIngredients.length
        : 1;

      const missingIngredients = recipe.ingredients
        .filter(ing =>
          !userIngredientsLower.some(userIng =>
            ing.name.toLowerCase().includes(userIng) ||
            userIng.includes(ing.name.toLowerCase())
          )
        )
        .map(ing => ing.name);

      return {
        ...recipe,
        matchScore,
        missingIngredients,
      };
    });

    // Sort by match score
    return suggestions.sort((a, b) => b.matchScore - a.matchScore);
  },

  /**
   * Get recipe by ID
   * MOCK: Returns from mock data
   * FUTURE: GET /api/recipes/{id}
   */
  async getRecipe(id: string): Promise<Recipe | null> {
    await delay(300);
    return mockRecipes.find(r => r.id === id) || null;
  },

  /**
   * Get step guidance with contextual tips
   * MOCK: Returns step data from recipe
   * FUTURE: GET /api/guidance/{recipeId}/{step}
   */
  async getStepGuidance(recipeId: string, stepNumber: number): Promise<{
    instruction: string;
    tip?: string;
    warning?: string;
    duration?: number;
  } | null> {
    await delay(200);

    const recipe = mockRecipes.find(r => r.id === recipeId);
    if (!recipe) return null;

    const step = recipe.steps.find(s => s.step === stepNumber);
    if (!step) return null;

    return {
      instruction: step.instruction,
      tip: step.tip,
      warning: step.warning,
      duration: step.duration,
    };
  },

  /**
   * Search ingredients with autocomplete
   * MOCK: Filters mock ingredient list
   * FUTURE: GET /api/ingredients/search?q={query}
   */
  async searchIngredients(query: string): Promise<string[]> {
    await delay(100);

    if (!query) return [];

    const lowerQuery = query.toLowerCase();
    return mockIngredients
      .filter(ing => ing.toLowerCase().includes(lowerQuery))
      .slice(0, 10);
  },

  /**
   * Get ingredient substitutions
   * MOCK: Returns mock substitutions
   * FUTURE: GET /api/ingredients/{name}/substitutions
   */
  async getSubstitutions(ingredient: string): Promise<{
    name: string;
    impact: string;
    availability: 'common' | 'moderate' | 'rare';
  }[]> {
    await delay(300);

    // Mock substitution data
    const substitutionMap: Record<string, any[]> = {
      'mantequilla': [
        { name: 'Aceite de coco', impact: 'Sabor ligeramente tropical, textura similar', availability: 'common' },
        { name: 'Aceite vegetal', impact: 'Neutral, ligeramente menos rico', availability: 'common' },
        { name: 'Puré de aguacate', impact: 'Más saludable, color verde, textura cremosa', availability: 'common' },
      ],
      'crema': [
        { name: 'Yogur griego', impact: 'Más ácido, 40% menos calorías', availability: 'common' },
        { name: 'Leche evaporada', impact: 'Menos grasa, textura similar', availability: 'common' },
      ],
      'cilantro': [
        { name: 'Perejil', impact: 'Sabor más suave, sin el toque cítrico', availability: 'common' },
        { name: 'Albahaca', impact: 'Sabor dulce, aromático', availability: 'common' },
      ],
    };

    const lowerIng = ingredient.toLowerCase();
    for (const [key, subs] of Object.entries(substitutionMap)) {
      if (lowerIng.includes(key) || key.includes(lowerIng)) {
        return subs;
      }
    }

    // Default substitutions
    return [
      { name: 'No hay sustituciones comunes', impact: 'Este ingrediente es esencial', availability: 'moderate' },
    ];
  },
};
