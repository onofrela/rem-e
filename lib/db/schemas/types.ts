/**
 * Unified Type Definitions for Rem-E Database
 *
 * This file contains all TypeScript interfaces for:
 * - Ingredients (catalog)
 * - Recipes (with steps and nutrition)
 * - Inventory (user's pantry)
 * - Compatibility (ingredient pairing)
 */

// =============================================================================
// INGREDIENT TYPES
// =============================================================================

/**
 * Nutritional information per 100g of an ingredient
 */
export interface NutritionInfo {
  per: number;          // Base amount (always 100)
  unit: 'g' | 'ml';     // Base unit
  calories: number;     // kcal
  protein: number;      // grams
  carbs: number;        // grams
  fat: number;          // grams
  fiber: number;        // grams
  sugar?: number;       // grams (optional)
  sodium?: number;      // mg (optional)
}

/**
 * Storage recommendations for an ingredient
 */
export interface StorageInfo {
  refrigerator: string | null;  // e.g., "3-4 días"
  freezer: string | null;       // e.g., "6 meses"
  pantry: string | null;        // e.g., "1 año"
}

/**
 * Ingredient category options
 */
export type IngredientCategory =
  | 'Proteínas'
  | 'Lácteos'
  | 'Vegetales'
  | 'Frutas'
  | 'Granos'
  | 'Condimentos'
  | 'Aceites'
  | 'Harinas'
  | 'Endulzantes'
  | 'Bebidas'
  | 'Otros';

/**
 * Ingredient subcategory options
 */
export type IngredientSubcategory =
  | 'Aves' | 'Res' | 'Cerdo' | 'Pescado' | 'Mariscos' | 'Embutidos'
  | 'Quesos' | 'Leches' | 'Yogures' | 'Cremas'
  | 'Hojas verdes' | 'Raíces' | 'Bulbos' | 'Frutos' | 'Legumbres'
  | 'Cítricos' | 'Tropicales' | 'Bayas' | 'Frutos secos'
  | 'Arroz' | 'Pasta' | 'Pan' | 'Cereales'
  | 'Especias' | 'Hierbas' | 'Salsas' | 'Vinagres'
  | 'Vegetales' | 'Animales' | 'Semillas'
  | 'Trigo' | 'Maíz' | 'Otras harinas'
  | 'Azúcares' | 'Mieles' | 'Jarabes'
  | 'Otro';

/**
 * Master ingredient in the catalog (ingredients.json)
 */
export interface CatalogIngredient {
  id: string;                           // e.g., "ing_001"
  name: string;                         // Display name: "Pechuga de pollo"
  normalizedName: string;               // For search: "pollo"
  category: IngredientCategory;
  subcategory: IngredientSubcategory;
  synonyms: string[];                   // ["pollo", "pechuga", "chicken"]
  defaultUnit: string;                  // "g", "ml", "pieza", etc.
  alternativeUnits: string[];           // ["kg", "lb", "piezas"]
  nutrition: NutritionInfo;
  storage: StorageInfo;
  compatibleWith: string[];             // IDs of compatible ingredients
  substitutes: string[];                // IDs of substitute ingredients
  isCommon: boolean;                    // Frequently used ingredient
  imageUrl?: string;                    // Optional image
}

/**
 * Simplified ingredient reference used in recipes
 */
export interface RecipeIngredient {
  ingredientId: string;                 // Reference to CatalogIngredient.id
  displayName: string;                  // Can override catalog name
  amount: number;                       // Quantity needed
  unit: string;                         // Unit of measurement
  preparation?: string;                 // e.g., "picado finamente"
  optional: boolean;                    // Is this ingredient optional?
}

// =============================================================================
// RECIPE TYPES
// =============================================================================

/**
 * Recipe difficulty levels
 */
export type RecipeDifficulty = 'Fácil' | 'Intermedio' | 'Avanzado';

/**
 * Recipe category options
 */
export type RecipeCategory =
  | 'Carnes y aves'
  | 'Pastas'
  | 'Ensaladas'
  | 'Snacks y antojitos'
  | 'Sopas'
  | 'Postres'
  | 'Desayunos'
  | 'Bebidas'
  | 'Panadería'
  | 'Otros';

/**
 * A single step in a recipe with ingredient references
 */
export interface RecipeStep {
  step: number;                         // Step number (1-indexed)
  instruction: string;                  // What to do
  duration?: number;                    // Minutes for this step
  ingredientsUsed: string[];            // IDs of ingredients used in this step
  appliancesUsed?: string[];            // IDs of appliances OR functionalities (e.g., "stovetop_gas" or "stovetop_cooking")
  tip?: string;                         // Helpful tip
  warning?: string;                     // Safety warning
}

/**
 * Grouping of ingredients by preparation phase
 */
export interface IngredientGroup {
  phase: string;                        // e.g., "Preparación previa"
  description: string;                  // e.g., "Tener listo antes de cocinar"
  ingredientIds: string[];              // IDs of ingredients in this group
}

/**
 * Scaling configuration for portions
 */
export interface RecipeScaling {
  baseServings: number;                 // Original recipe serves X
  minServings: number;                  // Minimum scalable servings
  maxServings: number;                  // Maximum scalable servings
  scalable: boolean;                    // Can this recipe be scaled?
}

/**
 * Calculated nutrition per serving
 */
export interface NutritionPerServing {
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  fiber: number;
}

/**
 * Complete recipe structure (recipes.json)
 */
export interface Recipe {
  id: string;                           // e.g., "rec_001"
  name: string;
  description: string;
  image: string;
  category: RecipeCategory;
  tags: string[];                       // ["Mexicano", "Rápido", "Familiar"]
  difficulty: RecipeDifficulty;
  time: number;                         // Total time in minutes
  servings: number;                     // Default servings
  scaling: RecipeScaling;

  ingredients: RecipeIngredient[];
  ingredientGroups: IngredientGroup[];  // Organize ingredients by phase
  steps: RecipeStep[];

  nutritionPerServing: NutritionPerServing | null;  // Calculated by service

  // Metadata
  cuisine?: string;                     // e.g., "Mexicana"
  source?: string;                      // Recipe source/author
  createdAt?: string;                   // ISO date
  updatedAt?: string;                   // ISO date
}

// =============================================================================
// INVENTORY TYPES
// =============================================================================

/**
 * Storage locations in the user's kitchen
 * Now dynamic - stored in IndexedDB locations store
 */
export type StorageLocation = string;

/**
 * Default storage locations (used for initialization)
 */
export const DEFAULT_LOCATIONS = ['Refrigerador', 'Congelador', 'Alacena'] as const;

/**
 * A storage location entry in the database
 */
export interface Location {
  id: string;
  name: string;
  icon: string;
  order: number;
  isDefault: boolean;
}

/**
 * An item in the user's inventory (stored in IndexedDB)
 */
export interface InventoryItem {
  id: string;                           // Unique ID for this inventory entry
  ingredientId: string;                 // Reference to CatalogIngredient.id

  // Quantity
  quantity: number;
  unit: string;

  // Location and dates
  location: StorageLocation;
  purchaseDate: string;                 // ISO date
  expirationDate?: string;              // ISO date (optional)

  // Alerts
  lowStockThreshold?: number;           // Alert when below this

  // Optional metadata
  brand?: string;
  notes?: string;

  // Timestamps
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Inventory alert types
 */
export type AlertType = 'low_stock' | 'expiring_soon' | 'expired';

/**
 * Alert priority levels
 */
export type AlertPriority = 'high' | 'medium' | 'low';

/**
 * An inventory alert
 */
export interface InventoryAlert {
  id: string;
  type: AlertType;
  ingredientId: string;
  ingredientName: string;
  message: string;
  priority: AlertPriority;
  date: string;
}

// =============================================================================
// APPLIANCE TYPES
// =============================================================================

/**
 * Appliance category options
 */
export type ApplianceCategory =
  | 'Cocción'           // Cooking
  | 'Refrigeración'     // Refrigeration
  | 'Preparación'       // Prep
  | 'Limpieza'          // Cleaning
  | 'Horneado'          // Baking
  | 'Bebidas'           // Beverages
  | 'Conservación'      // Preservation
  | 'Medición'          // Measuring
  | 'Otro';             // Other

/**
 * Appliance subcategory options
 */
export type ApplianceSubcategory =
  | 'Hornos' | 'Estufas' | 'Microondas' | 'Freidoras' | 'Parrillas' | 'Ollas eléctricas'
  | 'Refrigeradores' | 'Congeladores' | 'Enfriadores'
  | 'Licuadoras' | 'Procesadores' | 'Batidoras' | 'Picadoras' | 'Extractores' | 'Ralladores'
  | 'Lavavajillas'
  | 'Batidoras de pie' | 'Amasadoras' | 'Panificadoras'
  | 'Cafeteras' | 'Exprimidores' | 'Teteras' | 'Dispensadores'
  | 'Envasadoras' | 'Deshidratadores' | 'Fermentadores'
  | 'Básculas' | 'Termómetros' | 'Temporizadores' | 'Medidores'
  | 'Otro';

/**
 * Appliance functionality types
 * Represents what an appliance can DO rather than what it IS
 * Multiple appliances can share the same functionality
 */
export type ApplianceFunctionality =
  // Heat source functions
  | 'stovetop_cooking'        // Cocinar en estufa/parrilla (gas, eléctrica, inducción)
  | 'oven_baking'             // Hornear (horno de gas, eléctrico, convección)
  | 'microwave_heating'       // Calentar en microondas
  | 'grilling'                // Asar a la parrilla (grill, asador, plancha)
  | 'deep_frying'             // Freír por inmersión (freidora, olla)
  | 'air_frying'              // Freír con aire
  | 'slow_cooking'            // Cocción lenta (olla de cocción lenta, instant pot)
  | 'pressure_cooking'        // Cocción a presión
  | 'steaming'                // Cocinar al vapor
  | 'toasting'                // Tostar (tostador, horno)

  // Blending/mixing functions
  | 'blending'                // Licuar (licuadora, procesador)
  | 'food_processing'         // Procesar alimentos (procesador, picadora)
  | 'mixing'                  // Mezclar (batidora manual, de pie)
  | 'whisking'                // Batir (batidora de globo, eléctrica)
  | 'grinding'                // Moler (molinillo, procesador)
  | 'chopping'                // Picar (picadora, procesador)
  | 'grating'                 // Rallar (rallador manual, eléctrico)
  | 'juicing'                 // Exprimir jugos

  // Temperature control
  | 'refrigerating'           // Refrigerar
  | 'freezing'                // Congelar
  | 'cooling'                 // Enfriar
  | 'warming'                 // Mantener caliente

  // Measuring
  | 'weighing'                // Pesar (báscula)
  | 'measuring_temperature'   // Medir temperatura (termómetro)
  | 'timing'                  // Cronometrar (temporizador)

  // Beverage preparation
  | 'brewing_coffee'          // Preparar café
  | 'boiling_water'           // Hervir agua (tetera, calentador)

  // Preservation
  | 'vacuum_sealing'          // Sellar al vacío
  | 'dehydrating'             // Deshidratar
  | 'fermenting'              // Fermentar

  // Other
  | 'dishwashing'             // Lavar trastes
  | 'bread_making';           // Hacer pan (panificadora)

/**
 * Technical specifications for an appliance
 */
export interface ApplianceSpecifications {
  capacity?: string;              // e.g., "30L", "1.5L", "12 tazas"
  power?: string;                 // e.g., "1200W", "800W"
  powerRange?: string;            // e.g., "1200-2000W"
  voltage?: string;               // e.g., "110V", "220V"
  dimensions?: string;            // e.g., "45x35x25cm"
  weight?: string;                // e.g., "5kg"
  temperatureRange?: string;      // e.g., "50-250°C"
  speedSettings?: string;         // e.g., "10 velocidades"
  material?: string;              // e.g., "Acero inoxidable"
  [key: string]: string | undefined; // Allow custom specs
}

/**
 * Master appliance in the catalog (appliances.json)
 */
export interface CatalogAppliance {
  id: string;                           // e.g., "stovetop_gas"
  name: string;                         // Display name: "Horno eléctrico"
  normalizedName: string;               // For search: "horno"
  category: ApplianceCategory;
  subcategory: ApplianceSubcategory;
  synonyms: string[];                   // ["horno", "oven", "horno eléctrico"]

  // NEW: Functionalities this appliance can perform
  functionalities: ApplianceFunctionality[];  // ["oven_baking", "toasting"]

  specifications: ApplianceSpecifications;
  useCases: string[];                   // ["Hornear", "Rostizar", "Gratinar"]

  compatibleWith: string[];             // IDs of compatible appliances
  alternatives: string[];               // IDs of substitute appliances

  isCommon: boolean;                    // Commonly owned appliance
  imageUrl?: string;                    // Optional image
  description?: string;                 // Brief description
}

/**
 * Appliance condition status
 */
export type ApplianceCondition = 'Excelente' | 'Bueno' | 'Regular' | 'Necesita reparación';

/**
 * An appliance in the user's kitchen (stored in IndexedDB)
 */
export interface UserAppliance {
  id: string;                           // Unique ID for this user appliance
  applianceId: string;                  // Reference to CatalogAppliance.id

  // Timestamps
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Appliance alert types
 */
export type ApplianceAlertType = 'maintenance_due' | 'warranty_expiring' | 'needs_repair';

/**
 * An appliance alert
 */
export interface ApplianceAlert {
  id: string;
  type: ApplianceAlertType;
  applianceId: string;
  applianceName: string;
  message: string;
  priority: AlertPriority;
  date: string;
}

/**
 * Parameters for searching appliances
 */
export interface SearchAppliancesParams {
  query: string;
  category?: ApplianceCategory;
  limit?: number;
}

/**
 * Parameters for adding a user appliance
 */
export interface AddUserApplianceParams {
  applianceId: string;
}

// =============================================================================
// COMPATIBILITY TYPES
// =============================================================================

/**
 * A compatibility pair between two ingredients
 */
export interface CompatibilityPair {
  ingredientA: string;                  // First ingredient ID
  ingredientB: string;                  // Second ingredient ID
  score: number;                        // 0.0 to 1.0 (how well they pair)
  reason: string;                       // Why they work together
  cuisines: string[];                   // Cuisines where this pairing is common
}

/**
 * Flavor profile categories
 */
export type FlavorProfile =
  | 'salado' | 'dulce' | 'ácido' | 'amargo' | 'umami'
  | 'picante' | 'herbáceo' | 'ahumado' | 'fresco'
  | 'terroso' | 'cítrico' | 'cremoso' | 'neutro';

/**
 * Complete compatibility data structure (compatibility.json)
 */
export interface CompatibilityData {
  version: string;
  compatibilityPairs: CompatibilityPair[];
  flavorProfiles: Record<string, FlavorProfile[]>;  // ingredientId -> profiles
}

// =============================================================================
// LLM FUNCTION TYPES
// =============================================================================

/**
 * Parameters for searching ingredients
 */
export interface SearchIngredientsParams {
  query: string;
  category?: IngredientCategory;
  limit?: number;
}

/**
 * Parameters for getting inventory
 */
export interface GetInventoryParams {
  location?: StorageLocation;
  expiringWithinDays?: number;
}

/**
 * Parameters for adding to inventory
 */
export interface AddToInventoryParams {
  ingredientId: string;
  quantity: number;
  unit: string;
  location: StorageLocation;
  expirationDate?: string;
  brand?: string;
  notes?: string;
}

/**
 * Parameters for updating inventory
 */
export interface UpdateInventoryParams {
  inventoryId: string;
  quantity?: number;
  location?: StorageLocation;
  expirationDate?: string;
  notes?: string;
}

/**
 * Parameters for getting recipes by ingredients
 */
export interface GetRecipesByIngredientsParams {
  ingredientIds: string[];
  maxMissingIngredients?: number;
  maxTime?: number;
  difficulty?: RecipeDifficulty;
}

/**
 * Parameters for calculating portions
 */
export interface CalculatePortionsParams {
  recipeId: string;
  targetServings: number;
}

/**
 * Result of recipe search with matching info
 */
export interface RecipeSearchResult {
  recipe: Recipe;
  matchScore: number;                   // 0.0 to 1.0
  matchedIngredients: string[];         // IDs of matched ingredients
  missingIngredients: string[];         // IDs of missing ingredients
}

/**
 * Scaled ingredient for portion calculation
 */
export interface ScaledIngredient {
  ingredientId: string;
  displayName: string;
  originalAmount: number;
  scaledAmount: number;
  unit: string;
  preparation?: string;
}

/**
 * Result of portion calculation
 */
export interface PortionCalculationResult {
  recipeId: string;
  recipeName: string;
  originalServings: number;
  targetServings: number;
  scaleFactor: number;
  ingredients: ScaledIngredient[];
  nutritionPerServing: NutritionPerServing | null;
}

// =============================================================================
// DATABASE METADATA TYPES
// =============================================================================

/**
 * JSON file metadata
 */
export interface DatabaseMetadata {
  version: string;
  lastUpdated: string;                  // ISO date
  itemCount: number;
}

/**
 * Ingredients database structure
 */
export interface IngredientsDatabase {
  metadata: DatabaseMetadata;
  ingredients: CatalogIngredient[];
}

/**
 * Recipes database structure
 */
export interface RecipesDatabase {
  metadata: DatabaseMetadata;
  recipes: Recipe[];
}

/**
 * Appliances database structure
 */
export interface AppliancesDatabase {
  metadata: DatabaseMetadata;
  appliances: CatalogAppliance[];
}

// =============================================================================
// INGREDIENT SUBSTITUTION TYPES
// =============================================================================

/**
 * Contextual factors that affect substitution viability
 */
export interface SubstitutionContextualFactors {
  recipeTypes: string[];          // e.g., ["repostería", "salado", "frito"]
  cuisines: string[];             // e.g., ["mexicana", "italiana", "asiática"]
  cookingMethods: string[];       // e.g., ["horneado", "frito", "hervido"]
}

/**
 * Impact analysis of a substitution on the final dish
 */
export interface SubstitutionImpact {
  taste?: string;                 // e.g., "Más dulce", "Menos cremoso"
  texture?: string;               // e.g., "Más denso", "Más esponjoso"
  color?: string;                 // e.g., "Más oscuro", "Más pálido"
  nutritional?: string;           // e.g., "Menos calorías", "Más proteína"
}

/**
 * Adjustments needed when making a substitution
 */
export interface SubstitutionAdjustments {
  otherIngredients?: {
    ingredientId: string;
    adjustment: string;           // e.g., "Reduce líquido en 1/4"
  }[];
  steps?: {
    stepNumber?: number;
    suggestion: string;           // e.g., "Aumenta el tiempo de horneado 5 min"
  }[];
  timing?: {
    adjustment: number;           // minutes +/-
    reason: string;               // e.g., "La harina de almendra requiere más tiempo"
  };
}

/**
 * Enhanced ingredient substitution with contextual analysis
 */
export interface IngredientSubstitution {
  id: string;
  originalIngredientId: string;
  substituteIngredientId: string;
  ratio: number;                  // e.g., 0.75 = use 75% of original amount
  confidence: number;             // 0-1, how reliable this substitution is

  // Contextual analysis
  contextualFactors: SubstitutionContextualFactors;

  // Impact on final dish
  impact: SubstitutionImpact;

  // Required adjustments
  requiresAdjustments?: SubstitutionAdjustments;

  // Metadata
  dietaryTags: string[];          // e.g., ["vegetarian", "vegan", "gluten-free"]
  reason: string;                 // Why this substitution works

  createdAt: string;
  updatedAt: string;
}

/**
 * User's learned preference for ingredient substitution
 */
export interface UserSubstitutionPreference {
  id: string;
  userId?: string;                // For multi-user support
  originalIngredientId: string;
  preferredSubstituteId: string;

  // Learning data
  timesUsed: number;              // How many times user chose this
  successRate: number;            // 0-1, based on ratings/completion
  lastUsedAt: string;

  // Context tracking (for LLM)
  contexts: string[];             // e.g., ["repostería", "brownies", "sin gluten"]
  notes?: string;                 // User's notes about this preference

  createdAt: string;
  updatedAt: string;
}

// =============================================================================
// RECIPE VARIANT TYPES
// =============================================================================

/**
 * Ingredient modifications for a recipe variant
 */
export interface VariantIngredientModifications {
  removed: string[];              // IDs of ingredients to remove
  added: RecipeIngredient[];      // New ingredients to add
  modified: {
    ingredientId: string;
    newAmount: number;
    newUnit: string;
    reason?: string;              // Why this was changed
  }[];
}

/**
 * Step modifications for a recipe variant
 */
export interface VariantStepModifications {
  modified: {
    stepNumber: number;
    newInstruction: string;
    reason?: string;              // Why this was changed
  }[];
  added: RecipeStep[];            // Additional steps
  removed: number[];              // Step numbers to remove
}

/**
 * Metadata changes for a recipe variant
 */
export interface VariantMetadataChanges {
  timeAdjustment?: number;        // minutes +/-
  difficultyChange?: RecipeDifficulty;
  servingsChange?: number;
}

/**
 * Complete modifications for a recipe variant
 */
export interface RecipeVariantModifications {
  ingredients: VariantIngredientModifications;
  steps: VariantStepModifications;
  metadata?: VariantMetadataChanges;
}

/**
 * A variant of a base recipe (e.g., gluten-free version, vegan version)
 */
export interface RecipeVariant {
  id: string;
  baseRecipeId: string;           // Reference to original Recipe.id
  name: string;                   // e.g., "Versión sin gluten", "Con harina de almendra"
  description: string;            // Brief description of changes

  // Only store changes, not entire recipe
  modifications: RecipeVariantModifications;

  // Categorization
  tags: string[];                 // e.g., ["sin-gluten", "vegano", "baja-grasa"]

  // Metadata
  createdBy: 'user' | 'system';   // Who created this variant
  createdAt: string;
  updatedAt: string;
  timesUsed: number;              // Tracking popularity
}

// =============================================================================
// RECIPE APPLIANCE TYPES
// =============================================================================

/**
 * Appliance alternative with adaptation instructions
 */
export interface ApplianceAlternative {
  applianceId: string;            // ID of alternative appliance
  confidence: number;             // 0-1, how well this works
  adaptationInstructions: string; // How to use this alternative

  // Adjustments needed
  adjustments?: {
    timing?: {
      minutes: number;            // +/- adjustment
      reason: string;
    };
    temperature?: {
      degrees: number;            // +/- adjustment
      reason: string;
    };
    technique?: string;           // Different technique description
  };

  // Modified steps if needed
  modifiedSteps?: {
    stepNumber: number;
    newInstruction: string;
  }[];
}

/**
 * Appliance requirement for a recipe
 */
export interface RecipeAppliance {
  applianceId: string;            // Reference to CatalogAppliance.id
  required: boolean;              // True if essential, false if optional
  usedInSteps: number[];          // Which steps use this appliance
  alternatives: ApplianceAlternative[];
}

// =============================================================================
// RECIPE HISTORY TYPES
// =============================================================================

/**
 * A substitution made during a cooking session
 */
export interface SessionSubstitution {
  originalIngredientId: string;
  substituteIngredientId: string;
  reason?: string;                // User's reason for substitution
  stepNumber?: number;            // When it was used
}

/**
 * A note made during a cooking session
 */
export interface SessionNote {
  stepNumber?: number;            // Which step (if applicable)
  content: string;
  type: 'tip' | 'warning' | 'modification' | 'clarification';
  timestamp: string;
}

/**
 * An adjustment made during a cooking session
 */
export interface SessionAdjustment {
  type: 'timing' | 'temperature' | 'quantity' | 'technique';
  description: string;
  stepNumber?: number;
}

/**
 * Changes made during a cooking session
 */
export interface RecipeSessionChanges {
  substitutions: SessionSubstitution[];
  notes: SessionNote[];
  adjustments: SessionAdjustment[];
}

/**
 * Historical record of a recipe execution
 */
export interface RecipeHistory {
  id: string;
  recipeId: string;               // Which recipe was made
  variantId?: string;             // If a variant was used
  userId?: string;                // For multi-user support

  // Timing
  startedAt: string;
  completedAt?: string;
  completed: boolean;

  // Session data
  sessionChanges: RecipeSessionChanges;

  // Simple metadata
  servingsMade: number;
  rating?: number;                // 1-5 stars
  wouldMakeAgain?: boolean;

  createdAt: string;
  updatedAt: string;
}

// =============================================================================
// USER KNOWLEDGE BASE TYPES
// =============================================================================

/**
 * Types of knowledge that can be learned about the user
 */
export type UserKnowledgeType =
  | 'measurement-preference'      // e.g., prefers cups over grams
  | 'equipment-limitation'        // e.g., no digital scale
  | 'skill-note'                  // e.g., struggles with folding technique
  | 'ingredient-preference'       // e.g., prefers organic ingredients
  | 'general-tip';                // e.g., always double vanilla

/**
 * What this knowledge applies to
 */
export interface KnowledgeApplicability {
  recipeTypes?: string[];         // e.g., ["repostería", "pan"]
  ingredients?: string[];         // Ingredient IDs
  appliances?: string[];          // Appliance IDs
  cookingMethods?: string[];      // e.g., ["horneado", "frito"]
}

/**
 * Structured content of a knowledge entry
 */
export interface UserKnowledgeContent {
  summary: string;                // Brief summary for LLM context
  details: string;                // Full details
  context?: string[];             // Contextual tags for filtering
  appliesTo?: KnowledgeApplicability;
}

/**
 * Where this knowledge was learned from
 */
export interface KnowledgeSource {
  recipeId?: string;
  historyId?: string;             // Reference to RecipeHistory
  timestamp: string;
}

/**
 * A piece of learned knowledge about the user
 */
export interface UserKnowledgeEntry {
  id: string;
  userId?: string;                // For multi-user support
  type: UserKnowledgeType;

  // Structured content for LLM
  content: UserKnowledgeContent;

  // Learning metadata
  learnedFrom?: KnowledgeSource;
  confidence: number;             // 0-1, how confident the system is
  timesApplied: number;           // How often this knowledge has been used
  lastAppliedAt?: string;

  createdAt: string;
  updatedAt: string;
}

// =============================================================================
// EXTENDED RECIPE TYPE
// =============================================================================

/**
 * Extended Recipe interface with new fields
 * (backwards compatible - all new fields are optional)
 */
export interface ExtendedRecipe extends Recipe {
  requiredAppliances?: RecipeAppliance[];
  optionalAppliances?: RecipeAppliance[];
}

// =============================================================================
// LLM FUNCTION PARAMETER TYPES (NEW)
// =============================================================================

/**
 * Parameters for suggesting ingredient substitution
 */
export interface SuggestSubstitutionParams {
  originalIngredientId: string;
  substituteIngredientId?: string; // Optional - if not provided, suggest best
  recipeId?: string;              // Context for better suggestions
  recipeType?: string;            // e.g., "repostería", "salado"
}

/**
 * Parameters for getting recipe variants
 */
export interface GetRecipeVariantsParams {
  recipeId: string;
  tags?: string[];                // Filter by tags
}

/**
 * Parameters for creating a recipe variant
 */
export interface CreateRecipeVariantParams {
  baseRecipeId: string;
  name: string;
  description: string;
  modifications: RecipeVariantModifications;
  tags: string[];
}

/**
 * Parameters for saving a cooking note
 */
export interface SaveCookingNoteParams {
  historyId: string;              // Which cooking session
  stepNumber?: number;
  content: string;
  type: 'tip' | 'warning' | 'modification' | 'clarification';
}

/**
 * Parameters for recording substitution preference
 */
export interface RecordSubstitutionPreferenceParams {
  originalIngredientId: string;
  substituteIngredientId: string;
  context: string[];              // e.g., ["repostería", "brownies"]
  successful: boolean;            // Whether it worked well
  notes?: string;
}

/**
 * Parameters for completing a recipe session
 */
export interface CompleteRecipeSessionParams {
  historyId: string;
  rating?: number;                // 1-5
  wouldMakeAgain?: boolean;
  completionNotes?: string;
}

/**
 * Parameters for adapting a recipe
 */
export interface AdaptRecipeParams {
  recipeId: string;
  missingIngredients?: string[];  // Ingredients user doesn't have
  missingAppliances?: string[];   // Appliances user doesn't have
  dietaryRestrictions?: string[]; // e.g., ["vegetarian", "gluten-free"]
  servings?: number;              // Adjust serving size
}

// =============================================================================
// APPLIANCE ADAPTATION TYPES
// =============================================================================

/**
 * Contextual factors affecting appliance adaptation viability
 */
export interface ApplianceAdaptationContext {
  recipeTypes: string[];          // e.g., ["horneado", "asado", "frito"]
  cookingMethods: string[];       // e.g., ["alta temperatura", "cocción lenta"]
  stepTypes: string[];            // e.g., ["precalentamiento", "cocción principal"]
}

/**
 * Impact analysis of appliance adaptation
 */
export interface ApplianceAdaptationImpact {
  technique?: string;             // e.g., "Cocción más lenta"
  timing?: string;                // e.g., "Requiere más tiempo"
  quality?: string;               // e.g., "Resultado similar"
  difficulty?: string;            // e.g., "Más complejo"
}

/**
 * Adjustments needed when adapting to alternative appliance
 */
export interface ApplianceAdaptationAdjustments {
  newInstruction: string;         // Complete rewritten step instruction
  timing?: {
    adjustment: number;           // minutes +/-
    reason: string;
  };
  temperature?: {
    adjustment: number;           // degrees +/-
    reason: string;
  };
  additionalSteps?: string[];
  warnings?: string[];
}

/**
 * Complete appliance adaptation (parallel to IngredientSubstitution)
 */
export interface ApplianceAdaptation {
  id: string;
  originalApplianceId: string;
  alternativeApplianceId: string;
  confidence: number;             // 0-1

  contextualFactors: ApplianceAdaptationContext;
  impact: ApplianceAdaptationImpact;
  adjustments: ApplianceAdaptationAdjustments;

  reason: string;
  difficultyIncrease: 'none' | 'slight' | 'moderate' | 'significant';

  createdAt: string;
  updatedAt: string;
}

/**
 * User's learned preference for appliance adaptations
 */
export interface UserApplianceAdaptationPreference {
  id: string;
  userId?: string;
  originalApplianceId: string;
  preferredAlternativeId: string;

  timesUsed: number;
  successRate: number;
  lastUsedAt: string;

  contexts: string[];
  notes?: string;

  createdAt: string;
  updatedAt: string;
}

/**
 * Runtime adaptation state (NOT persisted as variant)
 */
export interface StepAdaptation {
  stepNumber: number;
  originalAppliance: string;
  alternativeAppliance: string;
  adaptedInstruction: string;
  confidence: number;
  impact: ApplianceAdaptationImpact;
  warnings?: string[];
  timingAdjustment?: number;
  temperatureAdjustment?: number;
  timestamp: string;
}

// =============================================================================
// LLM FUNCTION PARAMETER TYPES - APPLIANCE ADAPTATION
// =============================================================================

/**
 * Parameters for checking appliances in a step
 */
export interface CheckApplianceParams {
  recipeId: string;
  stepNumber: number;
}

/**
 * Parameters for adapting a step when appliance is missing
 */
export interface AdaptStepForApplianceParams {
  recipeId: string;
  stepNumber: number;
  missingApplianceId: string;
  originalInstruction: string;
  userAppliances: string[];
}

/**
 * Parameters for recording appliance adaptation usage
 */
export interface RecordApplianceAdaptationParams {
  originalApplianceId: string;
  alternativeApplianceId: string;
  stepNumber: number;
  recipeId: string;
  successful: boolean;
  notes?: string;
}

// =============================================================================
// MEAL PLANNING TYPES
// =============================================================================

/**
 * Estructura de comidas para un día
 */
export interface DailyMeals {
  desayuno: string | null;  // recipeId or null
  almuerzo: string | null;
  comida: string | null;
  cena: string | null;
}

/**
 * Estructura de comidas para toda la semana
 */
export interface WeeklyMeals {
  lunes: DailyMeals;
  martes: DailyMeals;
  miercoles: DailyMeals;
  jueves: DailyMeals;
  viernes: DailyMeals;
  sabado: DailyMeals;
  domingo: DailyMeals;
}

/**
 * Plan de comidas semanal completo
 */
export interface MealPlan {
  id: string;
  name: string;  // "Plan del 26 Nov - 2 Dic"
  startDate: string;  // ISO date (YYYY-MM-DD)
  endDate: string;    // ISO date (YYYY-MM-DD)
  meals: WeeklyMeals;
  generatedBy: 'questionnaire' | 'llm';
  metadata?: {
    goals?: string[];
    dietaryRestrictions?: string[];
    peopleCount?: number;
  };
  createdAt: string;
  updatedAt: string;
}

/**
 * Preferencias de planificación del usuario
 */
export interface UserPlanningPreferences {
  id: string;  // Always 'planning_preferences' (singleton)
  goals: string[];  // ['weight_loss', 'muscle_gain', 'maintenance', 'family']
  dietaryRestrictions: string[];  // ['vegetarian', 'vegan', 'gluten_free', 'dairy_free']
  peopleCount: number;
  skillLevel: 'beginner' | 'intermediate' | 'advanced';
  timeAvailable: 'low' | 'medium' | 'high';  // < 30min, 30-60min, > 60min
  preferredCuisines: string[];
  updatedAt: string;
}

/**
 * Respuestas del cuestionario de planificación
 */
export interface QuestionnaireAnswers {
  goals: string[];
  dietaryRestrictions: string[];
  peopleCount: number;
  skillLevel: 'beginner' | 'intermediate' | 'advanced';
  timeAvailable: 'low' | 'medium' | 'high';
  preferredCuisines?: string[];
}

// =============================================================================
// RECOMMENDATION SYSTEM TYPES
// =============================================================================

/**
 * Factores de scoring para recomendaciones
 */
export interface RecommendationFactors {
  inventoryMatchScore: number;  // 0-1
  ratingScore: number;           // 0-1
  frequencyScore: number;        // 0-1
  finalScore: number;            // weighted average
}

/**
 * Cache de recomendación diaria
 */
export interface RecommendationCache {
  id: string;  // Always 'daily_recommendation' (singleton)
  recipeId: string;
  score: number;
  factors: RecommendationFactors;
  generatedAt: string;  // ISO timestamp
}

/**
 * Resultado de recomendación con receta completa
 */
export interface RecommendationResult {
  recipe: Recipe;
  factors: RecommendationFactors;
}
