/**
 * LLM Function Definitions
 *
 * Defines the functions available for LM Studio to call.
 * These follow the OpenAI function calling format.
 */

/**
 * Function definition for OpenAI-compatible function calling
 */
export interface FunctionDefinition {
  name: string;
  description: string;
  parameters: {
    type: 'object';
    properties: Record<string, {
      type: string;
      description: string;
      enum?: string[];
      items?: { type: string };
    }>;
    required: string[];
  };
}

/**
 * All available functions for the LLM
 */
export const llmFunctions: FunctionDefinition[] = [
  // ==========================================================================
  // INGREDIENT FUNCTIONS
  // ==========================================================================
  {
    name: 'searchIngredients',
    description: 'Busca ingredientes por nombre, categoría o sinónimos. Útil para encontrar ingredientes específicos o explorar opciones por categoría.',
    parameters: {
      type: 'object',
      properties: {
        query: {
          type: 'string',
          description: 'Término de búsqueda (nombre, sinónimo, o parte del nombre del ingrediente)',
        },
        category: {
          type: 'string',
          description: 'Filtrar por categoría de ingrediente',
          enum: ['Proteínas', 'Lácteos', 'Vegetales', 'Frutas', 'Granos', 'Condimentos', 'Aceites', 'Harinas', 'Endulzantes', 'Bebidas', 'Otros'],
        },
        limit: {
          type: 'number',
          description: 'Número máximo de resultados (default: 20)',
        },
      },
      required: ['query'],
    },
  },
  {
    name: 'getIngredientDetails',
    description: 'Obtiene información detallada de un ingrediente específico, incluyendo nutrición, almacenamiento y sustitutos.',
    parameters: {
      type: 'object',
      properties: {
        ingredientId: {
          type: 'string',
          description: 'ID del ingrediente (ej: ing_001)',
        },
      },
      required: ['ingredientId'],
    },
  },
  {
    name: 'getCompatibleIngredients',
    description: 'Obtiene ingredientes que combinan bien con un ingrediente específico, con scores de compatibilidad.',
    parameters: {
      type: 'object',
      properties: {
        ingredientId: {
          type: 'string',
          description: 'ID del ingrediente base',
        },
      },
      required: ['ingredientId'],
    },
  },
  {
    name: 'getSubstitutes',
    description: 'Obtiene ingredientes que pueden sustituir a otro en recetas.',
    parameters: {
      type: 'object',
      properties: {
        ingredientId: {
          type: 'string',
          description: 'ID del ingrediente a sustituir',
        },
      },
      required: ['ingredientId'],
    },
  },

  // ==========================================================================
  // INVENTORY FUNCTIONS
  // ==========================================================================
  {
    name: 'getInventory',
    description: 'Obtiene el inventario actual del usuario (lo que tiene en su cocina).',
    parameters: {
      type: 'object',
      properties: {
        location: {
          type: 'string',
          description: 'Filtrar por ubicación',
          enum: ['Refrigerador', 'Congelador', 'Alacena'],
        },
        expiringWithinDays: {
          type: 'number',
          description: 'Solo mostrar items que caducan en los próximos X días',
        },
      },
      required: [],
    },
  },
  {
    name: 'addToInventory',
    description: 'Agrega un ingrediente al inventario del usuario. IMPORTANTE: Antes de llamar esta función, asegúrate de tener ingredientId (búscalo primero con searchIngredients si es necesario), quantity, unit y location. Si falta la ubicación (location), pregunta al usuario "¿Dónde?" antes de llamar esta función. NO llames esta función sin location.',
    parameters: {
      type: 'object',
      properties: {
        ingredientId: {
          type: 'string',
          description: 'ID del ingrediente a agregar (búscalo con searchIngredients primero)',
        },
        quantity: {
          type: 'number',
          description: 'Cantidad del ingrediente. Si el usuario dice "tres tomates", usa 3. Si no especifica cantidad, usa 1.',
        },
        unit: {
          type: 'string',
          description: 'Unidad de medida. Por defecto usa "piezas" si el usuario no especifica. Otras opciones: g, kg, ml, L, etc.',
        },
        location: {
          type: 'string',
          description: 'Dónde se almacenará: Refrigerador, Congelador, o Alacena. REQUERIDO: Si el usuario no lo menciona, pregunta "¿Dónde?" y espera su respuesta antes de llamar esta función.',
          enum: ['Refrigerador', 'Congelador', 'Alacena'],
        },
        expirationDate: {
          type: 'string',
          description: 'Fecha de caducidad en formato ISO (YYYY-MM-DD). OPCIONAL: Solo pregunta si el usuario lo menciona. NO lo pidas por defecto.',
        },
        brand: {
          type: 'string',
          description: 'Marca del producto (opcional)',
        },
        notes: {
          type: 'string',
          description: 'Notas adicionales (opcional)',
        },
      },
      required: ['ingredientId', 'quantity', 'unit', 'location'],
    },
  },
  {
    name: 'updateInventory',
    description: 'Actualiza la cantidad u otros datos de un item en el inventario.',
    parameters: {
      type: 'object',
      properties: {
        inventoryId: {
          type: 'string',
          description: 'ID del item en el inventario',
        },
        quantity: {
          type: 'number',
          description: 'Nueva cantidad',
        },
        location: {
          type: 'string',
          description: 'Nueva ubicación',
          enum: ['Refrigerador', 'Congelador', 'Alacena'],
        },
        expirationDate: {
          type: 'string',
          description: 'Nueva fecha de caducidad (YYYY-MM-DD)',
        },
        notes: {
          type: 'string',
          description: 'Nuevas notas',
        },
      },
      required: ['inventoryId'],
    },
  },
  {
    name: 'removeFromInventory',
    description: 'Elimina un item del inventario.',
    parameters: {
      type: 'object',
      properties: {
        inventoryId: {
          type: 'string',
          description: 'ID del item a eliminar',
        },
      },
      required: ['inventoryId'],
    },
  },
  {
    name: 'consumeFromInventory',
    description: 'Consume una cantidad de un ingrediente (útil cuando el usuario cocina).',
    parameters: {
      type: 'object',
      properties: {
        ingredientId: {
          type: 'string',
          description: 'ID del ingrediente a consumir',
        },
        quantity: {
          type: 'number',
          description: 'Cantidad a consumir',
        },
      },
      required: ['ingredientId', 'quantity'],
    },
  },
  {
    name: 'getInventoryAlerts',
    description: 'Obtiene alertas del inventario: productos por caducar, agotados o con poco stock.',
    parameters: {
      type: 'object',
      properties: {},
      required: [],
    },
  },

  // ==========================================================================
  // RECIPE FUNCTIONS
  // ==========================================================================
  {
    name: 'searchRecipes',
    description: 'Busca recetas por nombre, descripción, tags o cocina usando fuzzy matching. USA ESTA FUNCIÓN cuando el usuario mencione un plato/comida específico (ej: "ceviche de camarón", "arroz blanco", "pizza", "tacos"). NO uses esta función para navegación general como "llévame a recetas". Esta función es MUY IMPORTANTE para encontrar recetas antes de navigateToRecipe.',
    parameters: {
      type: 'object',
      properties: {
        query: {
          type: 'string',
          description: 'Nombre del plato a buscar (ej: "ceviche de camarón", "arroz blanco", "pizza margarita"). Usa fuzzy matching, así que funciona con búsquedas parciales.',
        },
      },
      required: ['query'],
    },
  },
  {
    name: 'getRecipesByIngredients',
    description: 'Encuentra recetas que se pueden hacer con los ingredientes disponibles.',
    parameters: {
      type: 'object',
      properties: {
        ingredientIds: {
          type: 'array',
          description: 'Lista de IDs de ingredientes disponibles',
          items: { type: 'string' },
        },
        maxMissingIngredients: {
          type: 'number',
          description: 'Máximo de ingredientes faltantes permitidos (default: 3)',
        },
        maxTime: {
          type: 'number',
          description: 'Tiempo máximo de preparación en minutos',
        },
        difficulty: {
          type: 'string',
          description: 'Dificultad de la receta',
          enum: ['Fácil', 'Intermedio', 'Avanzado'],
        },
      },
      required: ['ingredientIds'],
    },
  },
  {
    name: 'getRecipeDetails',
    description: 'Obtiene todos los detalles de una receta específica.',
    parameters: {
      type: 'object',
      properties: {
        recipeId: {
          type: 'string',
          description: 'ID de la receta',
        },
      },
      required: ['recipeId'],
    },
  },
  {
    name: 'getRecipesByCategory',
    description: 'Obtiene recetas filtradas por categoría.',
    parameters: {
      type: 'object',
      properties: {
        category: {
          type: 'string',
          description: 'Categoría de receta',
          enum: ['Carnes y aves', 'Pastas', 'Ensaladas', 'Snacks y antojitos', 'Sopas', 'Postres', 'Desayunos', 'Bebidas', 'Panadería', 'Otros'],
        },
      },
      required: ['category'],
    },
  },
  {
    name: 'calculatePortions',
    description: 'Recalcula las cantidades de ingredientes para un número diferente de porciones.',
    parameters: {
      type: 'object',
      properties: {
        recipeId: {
          type: 'string',
          description: 'ID de la receta',
        },
        targetServings: {
          type: 'number',
          description: 'Número de porciones deseadas',
        },
      },
      required: ['recipeId', 'targetServings'],
    },
  },
  {
    name: 'calculateNutrition',
    description: 'Calcula la información nutricional por porción de una receta.',
    parameters: {
      type: 'object',
      properties: {
        recipeId: {
          type: 'string',
          description: 'ID de la receta',
        },
        servings: {
          type: 'number',
          description: 'Número de porciones (opcional, usa el default de la receta)',
        },
      },
      required: ['recipeId'],
    },
  },
  {
    name: 'getIngredientsForStep',
    description: 'Obtiene los ingredientes específicos que se usan en un paso de la receta.',
    parameters: {
      type: 'object',
      properties: {
        recipeId: {
          type: 'string',
          description: 'ID de la receta',
        },
        stepNumber: {
          type: 'number',
          description: 'Número del paso (1-indexed)',
        },
      },
      required: ['recipeId', 'stepNumber'],
    },
  },

  // ==========================================================================
  // COMPATIBILITY/SUGGESTION FUNCTIONS
  // ==========================================================================
  {
    name: 'suggestComplementaryIngredients',
    description: 'Sugiere ingredientes que complementarían bien a los ingredientes actuales.',
    parameters: {
      type: 'object',
      properties: {
        currentIngredients: {
          type: 'array',
          description: 'Lista de IDs de ingredientes actuales',
          items: { type: 'string' },
        },
        limit: {
          type: 'number',
          description: 'Número máximo de sugerencias (default: 5)',
        },
      },
      required: ['currentIngredients'],
    },
  },
  {
    name: 'analyzeFlavorBalance',
    description: 'Analiza el balance de sabores de un conjunto de ingredientes.',
    parameters: {
      type: 'object',
      properties: {
        ingredientIds: {
          type: 'array',
          description: 'Lista de IDs de ingredientes a analizar',
          items: { type: 'string' },
        },
      },
      required: ['ingredientIds'],
    },
  },

  // ==========================================================================
  // UTILITY FUNCTIONS
  // ==========================================================================
  {
    name: 'checkRecipeIngredients',
    description: 'Verifica si el usuario tiene todos los ingredientes necesarios para una receta.',
    parameters: {
      type: 'object',
      properties: {
        recipeId: {
          type: 'string',
          description: 'ID de la receta a verificar',
        },
      },
      required: ['recipeId'],
    },
  },
  {
    name: 'getInventorySummary',
    description: 'Obtiene un resumen del inventario: totales por ubicación, categoría, y alertas.',
    parameters: {
      type: 'object',
      properties: {},
      required: [],
    },
  },

  // ==========================================================================
  // RECIPE GUIDE FUNCTIONS (Cooking in Progress)
  // ==========================================================================
  {
    name: 'explainCookingStep',
    description: 'Explica con más detalle cómo realizar una técnica de cocina o un paso específico de la receta. Usa esto cuando el usuario pide más información sobre cómo hacer algo (ej: "¿cómo pico finamente?", "¿qué significa sofreír?", "¿cómo sé cuando está listo?").',
    parameters: {
      type: 'object',
      properties: {
        recipeId: {
          type: 'string',
          description: 'ID de la receta actual',
        },
        stepNumber: {
          type: 'number',
          description: 'Número del paso actual',
        },
        question: {
          type: 'string',
          description: 'Pregunta específica del usuario sobre la técnica o el paso',
        },
      },
      required: ['recipeId', 'stepNumber', 'question'],
    },
  },
  {
    name: 'substituteIngredientInCooking',
    description: 'Sustituye un ingrediente durante una sesión de cocina activa y crea automáticamente una variante de la receta con el cambio. Usa esto cuando el usuario quiere sustituir algo mientras cocina (ej: "¿puedo usar aceite de oliva en lugar de mantequilla?").',
    parameters: {
      type: 'object',
      properties: {
        sessionId: {
          type: 'string',
          description: 'ID de la sesión de cocina actual',
        },
        recipeId: {
          type: 'string',
          description: 'ID de la receta original',
        },
        originalIngredientId: {
          type: 'string',
          description: 'ID del ingrediente original en la receta',
        },
        substituteIngredientId: {
          type: 'string',
          description: 'ID del ingrediente sustituto',
        },
        reason: {
          type: 'string',
          description: 'Por qué se hizo la sustitución (opcional)',
        },
      },
      required: ['sessionId', 'recipeId', 'originalIngredientId', 'substituteIngredientId'],
    },
  },
  {
    name: 'createTimerFromStep',
    description: 'Crea un timer para el usuario basado en una duración mencionada en el paso actual o en la conversación. Usa esto cuando detectes una duración que el usuario debería cronometrar (ej: "avísame en 5 minutos", "necesito un timer de media hora").',
    parameters: {
      type: 'object',
      properties: {
        durationMinutes: {
          type: 'number',
          description: 'Duración del timer en minutos (puede ser decimal, ej: 0.5 para 30 segundos)',
        },
        label: {
          type: 'string',
          description: 'Etiqueta descriptiva del timer (ej: "Cocinar pollo", "Reposar masa")',
        },
        stepNumber: {
          type: 'number',
          description: 'Número del paso relacionado (opcional)',
        },
      },
      required: ['durationMinutes', 'label'],
    },
  },
  {
    name: 'getCurrentStepDetails',
    description: 'Obtiene información detallada del paso actual de la receta, incluyendo ingredientes usados, técnicas, tips y advertencias.',
    parameters: {
      type: 'object',
      properties: {
        recipeId: {
          type: 'string',
          description: 'ID de la receta',
        },
        stepNumber: {
          type: 'number',
          description: 'Número del paso',
        },
      },
      required: ['recipeId', 'stepNumber'],
    },
  },
  // ==========================================================================
  // APPLIANCE ADAPTATION FUNCTIONS
  // ==========================================================================
  {
    name: 'checkStepAppliances',
    description: 'Verifica si el usuario tiene los electrodomésticos necesarios para un paso específico de la receta ANTES de ejecutarlo.',
    parameters: {
      type: 'object',
      properties: {
        recipeId: {
          type: 'string',
          description: 'ID de la receta actual',
        },
        stepNumber: {
          type: 'number',
          description: 'Número del paso a verificar',
        },
      },
      required: ['recipeId', 'stepNumber'],
    },
  },
  {
    name: 'adaptStepForMissingAppliance',
    description: 'Adapta las instrucciones de un paso cuando el usuario NO tiene el electrodoméstico requerido. Genera instrucciones alternativas. NO crea variante.',
    parameters: {
      type: 'object',
      properties: {
        recipeId: {
          type: 'string',
          description: 'ID de la receta',
        },
        stepNumber: {
          type: 'number',
          description: 'Número del paso a adaptar',
        },
        missingApplianceId: {
          type: 'string',
          description: 'ID del electrodoméstico que falta',
        },
        originalInstruction: {
          type: 'string',
          description: 'Instrucción original del paso',
        },
        userAppliances: {
          type: 'array',
          description: 'IDs de electrodomésticos que el usuario SÍ tiene',
          items: { type: 'string' },
        },
      },
      required: ['recipeId', 'stepNumber', 'missingApplianceId', 'originalInstruction', 'userAppliances'],
    },
  },
  {
    name: 'addApplianceToKitchen',
    description: 'Agrega un electrodoméstico a Mi Cocina después de que el usuario confirma que lo tiene.',
    parameters: {
      type: 'object',
      properties: {
        applianceId: {
          type: 'string',
          description: 'ID del electrodoméstico del catálogo',
        },
      },
      required: ['applianceId'],
    },
  },
  {
    name: 'recordApplianceAdaptation',
    description: 'Registra el uso de una adaptación para aprendizaje automático.',
    parameters: {
      type: 'object',
      properties: {
        originalApplianceId: {
          type: 'string',
          description: 'ID del electrodoméstico original',
        },
        alternativeApplianceId: {
          type: 'string',
          description: 'ID del electrodoméstico alternativo usado',
        },
        stepNumber: {
          type: 'number',
          description: 'Número del paso',
        },
        recipeId: {
          type: 'string',
          description: 'ID de la receta',
        },
        successful: {
          type: 'boolean',
          description: 'Si funcionó bien (default: true)',
        },
        notes: {
          type: 'string',
          description: 'Notas opcionales',
        },
      },
      required: ['originalApplianceId', 'alternativeApplianceId', 'stepNumber', 'recipeId'],
    },
  },

  // ==========================================================================
  // MEAL PLANNING SEARCH FUNCTIONS
  // ==========================================================================
  {
    name: 'searchRecipesForPlanning',
    description: 'Busca recetas con filtros específicos para planificación semanal. Devuelve SOLO IDs de recetas que cumplen los criterios.',
    parameters: {
      type: 'object',
      properties: {
        tags: {
          type: 'array',
          description: 'Tags requeridos (ej: ["vegetariano", "bajo en calorías"])',
          items: { type: 'string' },
        },
        excludeTags: {
          type: 'array',
          description: 'Tags a excluir (ej: ["lácteos", "gluten"])',
          items: { type: 'string' },
        },
        maxCalories: {
          type: 'number',
          description: 'Calorías máximas por porción',
        },
        minCalories: {
          type: 'number',
          description: 'Calorías mínimas por porción',
        },
        maxTime: {
          type: 'number',
          description: 'Tiempo máximo de preparación en minutos',
        },
        difficulty: {
          type: 'string',
          description: 'Dificultad deseada',
          enum: ['Fácil', 'Media', 'Difícil'],
        },
        mealType: {
          type: 'string',
          description: 'Tipo de comida',
          enum: ['desayuno', 'comida', 'cena', 'snack'],
        },
        limit: {
          type: 'number',
          description: 'Número máximo de resultados (default: 20)',
        },
      },
      required: [],
    },
  },
  {
    name: 'getRecipeNameById',
    description: 'Obtiene el nombre de una receta por su ID. Útil para confirmar qué receta elegiste.',
    parameters: {
      type: 'object',
      properties: {
        recipeId: {
          type: 'string',
          description: 'ID de la receta',
        },
      },
      required: ['recipeId'],
    },
  },
  {
    name: 'getUserCookingHistory',
    description: 'Obtiene el historial de cocina del usuario: recetas más preparadas y mejor valoradas.',
    parameters: {
      type: 'object',
      properties: {
        limit: {
          type: 'number',
          description: 'Número de recetas a devolver (default: 10)',
        },
      },
      required: [],
    },
  },
  {
    name: 'getRecipesByNutrition',
    description: 'Busca recetas por criterios nutricionales específicos.',
    parameters: {
      type: 'object',
      properties: {
        maxCalories: {
          type: 'number',
          description: 'Calorías máximas por porción',
        },
        minProtein: {
          type: 'number',
          description: 'Proteína mínima en gramos',
        },
        maxCarbs: {
          type: 'number',
          description: 'Carbohidratos máximos en gramos',
        },
        maxFat: {
          type: 'number',
          description: 'Grasas máximas en gramos',
        },
        limit: {
          type: 'number',
          description: 'Número máximo de resultados',
        },
      },
      required: [],
    },
  },

  // ==========================================================================
  // NAVIGATION FUNCTIONS
  // ==========================================================================
  {
    name: 'navigateToRecipe',
    description: 'Navega a la página de detalles de UNA RECETA ESPECÍFICA POR NOMBRE (ej: "llévame a LA RECETA DE arroz blanco", "quiero ver LA RECETA DE pollo asado", "abre LA RECETA DE pizza margarita"). IMPORTANTE: Solo usa esta función cuando el usuario mencione el NOMBRE de un plato específico. NO uses esta función para "llévame a recetas" o "quiero cocinar" sin nombre de plato. Antes de llamar esta función, SIEMPRE busca primero la receta con searchRecipes para obtener el recipeId exacto. Si hay múltiples coincidencias, pregunta al usuario cuál quiere.',
    parameters: {
      type: 'object',
      properties: {
        recipeId: {
          type: 'string',
          description: 'ID exacto de la receta a la que navegar (obtenido con searchRecipes)',
        },
        recipeName: {
          type: 'string',
          description: 'Nombre de la receta (para confirmación al usuario)',
        },
      },
      required: ['recipeId', 'recipeName'],
    },
  },
];

/**
 * Get function definitions formatted for LM Studio / OpenAI API
 */
export function getFunctionDefinitions() {
  return llmFunctions.map(fn => ({
    type: 'function' as const,
    function: fn,
  }));
}

/**
 * Get a specific function definition by name
 */
export function getFunctionByName(name: string): FunctionDefinition | undefined {
  return llmFunctions.find(fn => fn.name === name);
}

/**
 * Get all function names
 */
export function getFunctionNames(): string[] {
  return llmFunctions.map(fn => fn.name);
}
