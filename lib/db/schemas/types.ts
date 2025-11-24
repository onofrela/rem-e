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
  id: string;                           // e.g., "app_001"
  name: string;                         // Display name: "Horno eléctrico"
  normalizedName: string;               // For search: "horno"
  category: ApplianceCategory;
  subcategory: ApplianceSubcategory;
  synonyms: string[];                   // ["horno", "oven", "horno eléctrico"]

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
