// Mock data for prototype demonstration

export interface Recipe {
  id: string;
  name: string;
  description: string;
  time: number; // in minutes
  difficulty: 'Fácil' | 'Intermedio' | 'Avanzado';
  servings: number;
  image: string;
  category: 'Carnes y aves' | 'Pastas' | 'Ensaladas' | 'Snacks y antojitos' | 'Sopas' | 'Postres' | 'Otros';
  ingredients: Ingredient[];
  steps: RecipeStep[];
  tags: string[];
  calories?: number;
}

export interface Ingredient {
  name: string;
  amount: number;
  unit: string;
  optional?: boolean;
}

export interface RecipeStep {
  step: number;
  instruction: string;
  duration?: number; // in minutes
  tip?: string;
  warning?: string;
}

export const mockRecipes: Recipe[] = [
  {
    id: '1',
    name: 'Tacos de Pollo',
    description: 'Deliciosos tacos de pollo con especias mexicanas',
    time: 25,
    difficulty: 'Fácil',
    servings: 4,
    image: '/recipes/tacos.jpg',
    category: 'Carnes y aves',
    ingredients: [
      { name: 'Pechuga de pollo', amount: 500, unit: 'g' },
      { name: 'Tortillas', amount: 8, unit: 'piezas' },
      { name: 'Cebolla', amount: 1, unit: 'pieza' },
      { name: 'Tomate', amount: 2, unit: 'piezas' },
      { name: 'Cilantro', amount: 1, unit: 'manojo', optional: true },
      { name: 'Limón', amount: 2, unit: 'piezas' },
    ],
    steps: [
      { step: 1, instruction: 'Corta el pollo en tiras pequeñas', duration: 5 },
      { step: 2, instruction: 'Sazona el pollo con sal, pimienta y comino', tip: 'El comino le da ese sabor mexicano característico' },
      { step: 3, instruction: 'Calienta una sartén con aceite a fuego medio-alto', duration: 2 },
      { step: 4, instruction: 'Cocina el pollo hasta que esté dorado, unos 8-10 minutos', duration: 10, warning: 'Asegúrate de que el pollo esté completamente cocido' },
      { step: 5, instruction: 'Calienta las tortillas en otra sartén o comal', duration: 3 },
      { step: 6, instruction: 'Pica la cebolla, tomate y cilantro finamente', duration: 5 },
      { step: 7, instruction: 'Sirve el pollo en las tortillas y agrega los vegetales frescos', tip: 'Exprime limón al final para darle frescura' },
    ],
    tags: ['Mexicano', 'Rápido', 'Familia'],
    calories: 450,
  },
  {
    id: '2',
    name: 'Pasta Alfredo',
    description: 'Cremosa pasta con salsa Alfredo casera',
    time: 20,
    difficulty: 'Fácil',
    servings: 2,
    image: '/recipes/pasta.jpg',
    category: 'Pastas',
    ingredients: [
      { name: 'Pasta fettuccine', amount: 200, unit: 'g' },
      { name: 'Crema', amount: 200, unit: 'ml' },
      { name: 'Mantequilla', amount: 50, unit: 'g' },
      { name: 'Queso parmesano', amount: 100, unit: 'g' },
      { name: 'Ajo', amount: 2, unit: 'dientes' },
    ],
    steps: [
      { step: 1, instruction: 'Hierve agua con sal en una olla grande', duration: 5 },
      { step: 2, instruction: 'Cocina la pasta según las instrucciones del paquete', duration: 10 },
      { step: 3, instruction: 'Mientras, derrite la mantequilla en una sartén', duration: 2 },
      { step: 4, instruction: 'Agrega el ajo picado y sofríe por 1 minuto', tip: 'No dejes que el ajo se queme o amargará' },
      { step: 5, instruction: 'Añade la crema y deja hervir suavemente', duration: 3 },
      { step: 6, instruction: 'Agrega el queso rallado y mezcla hasta derretir', duration: 2 },
      { step: 7, instruction: 'Escurre la pasta y mézclala con la salsa', tip: 'Guarda un poco del agua de la pasta para ajustar la consistencia' },
    ],
    tags: ['Italiano', 'Cremoso', 'Rápido'],
    calories: 680,
  },
  {
    id: '3',
    name: 'Ensalada César',
    description: 'Clásica ensalada César con aderezo casero',
    time: 15,
    difficulty: 'Fácil',
    servings: 2,
    image: '/recipes/caesar.jpg',
    category: 'Ensaladas',
    ingredients: [
      { name: 'Lechuga romana', amount: 1, unit: 'pieza' },
      { name: 'Pechuga de pollo', amount: 200, unit: 'g', optional: true },
      { name: 'Pan para crutones', amount: 100, unit: 'g' },
      { name: 'Queso parmesano', amount: 50, unit: 'g' },
      { name: 'Mayonesa', amount: 3, unit: 'cucharadas' },
      { name: 'Ajo', amount: 1, unit: 'diente' },
      { name: 'Limón', amount: 1, unit: 'pieza' },
    ],
    steps: [
      { step: 1, instruction: 'Lava y corta la lechuga en trozos grandes', duration: 3 },
      { step: 2, instruction: 'Corta el pan en cubos y tuesta en el horno', duration: 8 },
      { step: 3, instruction: 'Si usas pollo, cocínalo a la plancha y córtalo en tiras', duration: 10 },
      { step: 4, instruction: 'Mezcla mayonesa, ajo prensado, jugo de limón y queso para el aderezo', duration: 2 },
      { step: 5, instruction: 'Combina todo en un bowl grande', duration: 2 },
    ],
    tags: ['Ensalada', 'Saludable', 'Rápido'],
    calories: 420,
  },
  {
    id: '4',
    name: 'Arroz con Pollo',
    description: 'Tradicional arroz con pollo al estilo mexicano',
    time: 45,
    difficulty: 'Intermedio',
    servings: 6,
    image: '/recipes/arroz-pollo.jpg',
    category: 'Carnes y aves',
    ingredients: [
      { name: 'Pollo', amount: 1, unit: 'kg' },
      { name: 'Arroz', amount: 400, unit: 'g' },
      { name: 'Caldo de pollo', amount: 800, unit: 'ml' },
      { name: 'Zanahoria', amount: 2, unit: 'piezas' },
      { name: 'Chícharos', amount: 150, unit: 'g' },
      { name: 'Pimientos', amount: 2, unit: 'piezas' },
      { name: 'Cebolla', amount: 1, unit: 'pieza' },
      { name: 'Ajo', amount: 3, unit: 'dientes' },
      { name: 'Tomate', amount: 3, unit: 'piezas' },
    ],
    steps: [
      { step: 1, instruction: 'Corta el pollo en piezas y sazona con sal y pimienta', duration: 10 },
      { step: 2, instruction: 'Dora el pollo en una olla grande con aceite', duration: 8 },
      { step: 3, instruction: 'Retira el pollo y sofríe la cebolla y ajo picados', duration: 3 },
      { step: 4, instruction: 'Agrega el arroz y sofríe por 2 minutos', tip: 'Esto sella el arroz y evita que se pegue' },
      { step: 5, instruction: 'Licúa los tomates y agrégalos al arroz', duration: 3 },
      { step: 6, instruction: 'Agrega el caldo, el pollo y las verduras', duration: 2 },
      { step: 7, instruction: 'Tapa y cocina a fuego bajo por 25-30 minutos', duration: 30, warning: 'No destapes durante la cocción para que el arroz quede esponjoso' },
    ],
    tags: ['Mexicano', 'Familiar', 'Batch Cooking'],
    calories: 520,
  },
  {
    id: '5',
    name: 'Quesadillas',
    description: 'Quesadillas clásicas con queso derretido',
    time: 10,
    difficulty: 'Fácil',
    servings: 2,
    image: '/recipes/quesadillas.jpg',
    category: 'Snacks y antojitos',
    ingredients: [
      { name: 'Tortillas', amount: 4, unit: 'piezas' },
      { name: 'Queso Oaxaca', amount: 200, unit: 'g' },
      { name: 'Jamón', amount: 100, unit: 'g', optional: true },
      { name: 'Champiñones', amount: 100, unit: 'g', optional: true },
    ],
    steps: [
      { step: 1, instruction: 'Ralla o desmenuza el queso', duration: 2 },
      { step: 2, instruction: 'Calienta un comal o sartén a fuego medio', duration: 1 },
      { step: 3, instruction: 'Coloca una tortilla y agrega queso en la mitad', duration: 1 },
      { step: 4, instruction: 'Dobla la tortilla por la mitad', tip: 'Presiona ligeramente para sellar' },
      { step: 5, instruction: 'Voltea cuando el queso empiece a derretirse', duration: 3 },
      { step: 6, instruction: 'Cocina por ambos lados hasta que esté dorada', duration: 3 },
    ],
    tags: ['Mexicano', 'Rápido', 'Snack'],
    calories: 350,
  },
];

export const mockIngredients = [
  'Pollo', 'Carne de res', 'Pescado', 'Camarones',
  'Arroz', 'Pasta', 'Papa', 'Tortillas',
  'Tomate', 'Cebolla', 'Ajo', 'Pimiento',
  'Zanahoria', 'Brócoli', 'Calabaza', 'Espinaca',
  'Queso', 'Leche', 'Crema', 'Mantequilla',
  'Huevo', 'Frijoles', 'Lentejas',
  'Aceite', 'Sal', 'Pimienta', 'Limón',
];

export const getRecipeById = (id: string): Recipe | undefined => {
  return mockRecipes.find(recipe => recipe.id === id);
};

export const getRecipesByIngredients = (ingredients: string[]): Recipe[] => {
  if (ingredients.length === 0) return mockRecipes;

  return mockRecipes.filter(recipe =>
    recipe.ingredients.some(ing =>
      ingredients.some(userIng =>
        ing.name.toLowerCase().includes(userIng.toLowerCase())
      )
    )
  );
};

export const getRecipesByTime = (maxTime: number): Recipe[] => {
  return mockRecipes.filter(recipe => recipe.time <= maxTime);
};

export const getRecipesByDifficulty = (difficulty: Recipe['difficulty']): Recipe[] => {
  return mockRecipes.filter(recipe => recipe.difficulty === difficulty);
};

// Inventory / Ingredients interfaces and data
export interface InventoryIngredient {
  id: string;
  name: string;
  quantity: number;
  unit: string;
  category: 'Proteínas' | 'Lácteos' | 'Vegetales' | 'Frutas' | 'Granos' | 'Condimentos' | 'Otros';
  expirationDate?: string; // ISO date string
  addedDate: string; // ISO date string
  location?: 'Refrigerador' | 'Congelador' | 'Alacena' | 'Smart Fridge';
  lowStockThreshold?: number; // Alert when quantity is below this
  image?: string;
}

export interface InventoryAlert {
  id: string;
  type: 'low_stock' | 'expiring_soon' | 'expired';
  ingredientId: string;
  ingredientName: string;
  message: string;
  priority: 'high' | 'medium' | 'low';
  date: string;
}

// Calculate days until expiration
const getDaysUntilExpiration = (expirationDate: string): number => {
  const today = new Date();
  const expDate = new Date(expirationDate);
  const diffTime = expDate.getTime() - today.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  return diffDays;
};

// Mock inventory data
export const mockInventory: InventoryIngredient[] = [
  {
    id: 'inv-1',
    name: 'Pechuga de pollo',
    quantity: 800,
    unit: 'g',
    category: 'Proteínas',
    expirationDate: '2025-11-02',
    addedDate: '2025-10-20',
    location: 'Refrigerador',
    lowStockThreshold: 500,
  },
  {
    id: 'inv-2',
    name: 'Leche',
    quantity: 1,
    unit: 'L',
    category: 'Lácteos',
    expirationDate: '2025-10-29',
    addedDate: '2025-10-24',
    location: 'Refrigerador',
    lowStockThreshold: 0.5,
  },
  {
    id: 'inv-3',
    name: 'Huevos',
    quantity: 6,
    unit: 'piezas',
    category: 'Proteínas',
    expirationDate: '2025-11-05',
    addedDate: '2025-10-18',
    location: 'Refrigerador',
    lowStockThreshold: 6,
  },
  {
    id: 'inv-4',
    name: 'Tomate',
    quantity: 3,
    unit: 'piezas',
    category: 'Vegetales',
    expirationDate: '2025-10-30',
    addedDate: '2025-10-25',
    location: 'Refrigerador',
    lowStockThreshold: 2,
  },
  {
    id: 'inv-5',
    name: 'Cebolla',
    quantity: 4,
    unit: 'piezas',
    category: 'Vegetales',
    addedDate: '2025-10-15',
    location: 'Alacena',
    lowStockThreshold: 2,
  },
  {
    id: 'inv-6',
    name: 'Arroz',
    quantity: 2,
    unit: 'kg',
    category: 'Granos',
    addedDate: '2025-09-10',
    location: 'Alacena',
    lowStockThreshold: 0.5,
  },
  {
    id: 'inv-7',
    name: 'Queso parmesano',
    quantity: 150,
    unit: 'g',
    category: 'Lácteos',
    expirationDate: '2025-11-15',
    addedDate: '2025-10-10',
    location: 'Refrigerador',
    lowStockThreshold: 100,
  },
  {
    id: 'inv-8',
    name: 'Pasta',
    quantity: 500,
    unit: 'g',
    category: 'Granos',
    addedDate: '2025-09-20',
    location: 'Alacena',
    lowStockThreshold: 200,
  },
  {
    id: 'inv-9',
    name: 'Yogurt natural',
    quantity: 2,
    unit: 'piezas',
    category: 'Lácteos',
    expirationDate: '2025-10-28',
    addedDate: '2025-10-22',
    location: 'Smart Fridge',
    lowStockThreshold: 1,
  },
  {
    id: 'inv-10',
    name: 'Zanahoria',
    quantity: 1,
    unit: 'pieza',
    category: 'Vegetales',
    expirationDate: '2025-11-01',
    addedDate: '2025-10-20',
    location: 'Refrigerador',
    lowStockThreshold: 2,
  },
  {
    id: 'inv-11',
    name: 'Ajo',
    quantity: 8,
    unit: 'dientes',
    category: 'Condimentos',
    addedDate: '2025-10-05',
    location: 'Alacena',
    lowStockThreshold: 5,
  },
  {
    id: 'inv-12',
    name: 'Mantequilla',
    quantity: 50,
    unit: 'g',
    category: 'Lácteos',
    expirationDate: '2025-11-20',
    addedDate: '2025-10-15',
    location: 'Refrigerador',
    lowStockThreshold: 100,
  },
  {
    id: 'inv-13',
    name: 'Manzanas',
    quantity: 2,
    unit: 'piezas',
    category: 'Frutas',
    expirationDate: '2025-11-03',
    addedDate: '2025-10-25',
    location: 'Refrigerador',
    lowStockThreshold: 3,
  },
  {
    id: 'inv-14',
    name: 'Pan de caja',
    quantity: 8,
    unit: 'rebanadas',
    category: 'Granos',
    expirationDate: '2025-10-28',
    addedDate: '2025-10-24',
    location: 'Alacena',
    lowStockThreshold: 4,
  },
];

// Generate AI alerts based on inventory
export const generateInventoryAlerts = (): InventoryAlert[] => {
  const alerts: InventoryAlert[] = [];
  const today = new Date().toISOString().split('T')[0];

  mockInventory.forEach((item) => {
    // Check for expired items
    if (item.expirationDate) {
      const daysUntil = getDaysUntilExpiration(item.expirationDate);

      if (daysUntil < 0) {
        alerts.push({
          id: `alert-exp-${item.id}`,
          type: 'expired',
          ingredientId: item.id,
          ingredientName: item.name,
          message: `${item.name} ha caducado hace ${Math.abs(daysUntil)} días`,
          priority: 'high',
          date: today,
        });
      } else if (daysUntil <= 2) {
        alerts.push({
          id: `alert-exp-${item.id}`,
          type: 'expiring_soon',
          ingredientId: item.id,
          ingredientName: item.name,
          message: `${item.name} caduca ${daysUntil === 0 ? 'hoy' : daysUntil === 1 ? 'mañana' : `en ${daysUntil} días`}`,
          priority: daysUntil === 0 ? 'high' : 'medium',
          date: today,
        });
      }
    }

    // Check for low stock
    if (item.lowStockThreshold !== undefined && item.quantity <= item.lowStockThreshold) {
      alerts.push({
        id: `alert-stock-${item.id}`,
        type: 'low_stock',
        ingredientId: item.id,
        ingredientName: item.name,
        message: item.quantity === 0
          ? `${item.name} está agotado`
          : `${item.name} tiene poco stock (${item.quantity} ${item.unit})`,
        priority: item.quantity === 0 ? 'high' : 'medium',
        date: today,
      });
    }
  });

  // Sort by priority: high first
  return alerts.sort((a, b) => {
    if (a.priority === 'high' && b.priority !== 'high') return -1;
    if (a.priority !== 'high' && b.priority === 'high') return 1;
    return 0;
  });
};

export const getInventoryByCategory = (category: InventoryIngredient['category']): InventoryIngredient[] => {
  return mockInventory.filter(item => item.category === category);
};

export const getInventoryByLocation = (location: InventoryIngredient['location']): InventoryIngredient[] => {
  return mockInventory.filter(item => item.location === location);
};
