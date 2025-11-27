
// Mock routes from navigationCommands.ts
const routes = [
    {
        path: "/",
        name: "Inicio",
        keywords: ["inicio", "home", "principal", "casa", "comienzo"],
    },
    {
        path: "/cook",
        name: "Cocinar",
        keywords: ["cocinar", "cook", "preparar", "hacer comida", "cocina"],
    },
    {
        path: "/inventory",
        name: "Inventario",
        keywords: ["inventario", "ingredientes", "despensa", "almacén", "almacen", "productos"],
    },
    {
        path: "/mi-cocina",
        name: "Mi Cocina",
        keywords: ["mi cocina", "electrodomésticos", "electrodomesticos", "aparatos", "dispositivos", "equipos", "herramientas"],
    },
    {
        path: "/recipes",
        name: "Recetas",
        keywords: ["recetas", "receta", "comidas", "platos"],
    },
    {
        path: "/plan",
        name: "Planificador",
        keywords: ["planificar", "plan", "planificador", "semana", "menú", "menu"],
    },
    {
        path: "/learn",
        name: "Aprender",
        keywords: ["aprender", "aprendizaje", "tutoriales", "técnicas", "tecnicas", "tips"],
    },
    {
        path: "/settings",
        name: "Ajustes",
        keywords: ["ajustes", "configuración", "configuracion", "opciones", "settings", "preferencias"],
    },
];

const navigationVerbs = [
    "ve a", "ir a", "abre", "abrir", "muestra", "mostrar",
    "llévame a", "llevame a", "navega a", "navegar a",
    "ve al", "ir al", "ve hacia", "ir hacia",
    "regresa a", "regresar a", "volver a", "vuelve a",
    "quiero ir a", "quiero ver", "enséñame", "enseñame",
];

function parseNavigationCommand(text) {
    const lowerText = text.toLowerCase().trim();

    // Mock specific recipe check (simplified from original)
    const specificRecipePatterns = [
        /receta\s+(de|del|para)\s+\w+/i,
        /receta\s+de\s+la\s+\w+/i,
    ];
    const isSpecificRecipe = specificRecipePatterns.some(pattern => pattern.test(lowerText));
    if (isSpecificRecipe) return null;

    let targetText = lowerText;
    for (const verb of navigationVerbs) {
        if (lowerText.includes(verb)) {
            const index = lowerText.indexOf(verb);
            targetText = lowerText.substring(index + verb.length).trim();
            break;
        }
    }

    for (const route of routes) {
        for (const keyword of route.keywords) {
            if (targetText.includes(keyword) || lowerText.includes(keyword)) {
                return route;
            }
        }
    }
    return null;
}

// The NEW logic we want to test
function classifyIntent(text) {
    const lowerText = text.toLowerCase().trim();

    // 1. Action Verbs Check
    const actionVerbs = ['agregar', 'añadir', 'poner', 'comprar', 'busca ', 'buscar', 'encuentra', 'dame', 'dime'];
    const hasActionVerb = actionVerbs.some(v => lowerText.includes(v));

    // Navigation verbs
    const hasNavVerb = navigationVerbs.some(v => lowerText.includes(v));

    // Specific Recipe Patterns
    const specificRecipePatterns = [
        /receta\s+(de|del|para)\s+\w+/i,
        /receta\s+de\s+la\s+\w+/i,
        /(cocinar|hacer|preparar)\s+\w+\s+\w+/i,
        /quiero\s+(cocinar|hacer|preparar)\s+\w+/i,
    ];
    const isSpecificRecipe = specificRecipePatterns.some(pattern => pattern.test(lowerText));

    if (isSpecificRecipe) {
        return { type: 'question', reason: 'Specific recipe pattern' };
    }

    if (hasActionVerb && !hasNavVerb) {
        return { type: 'question', reason: 'Action verb detected without nav verb' };
    }

    if (hasNavVerb) {
        const route = parseNavigationCommand(text);
        if (route) return { type: 'navigation', route: route.path, reason: 'Explicit navigation verb' };
    }

    // Fallback navigation check
    const route = parseNavigationCommand(text);
    if (route) {
        return { type: 'navigation', route: route.path, reason: 'Loose match' };
    }

    return { type: 'question', reason: 'Default' };
}

// Test Cases
const testCases = [
    "agregar ingredientes al inventario",
    "navegar a la receta de arroz blanco",
    "agregar una batidora eléctrica a mi cocina",
    "ir a mi cocina",
    "ir a cocinar",
    "inventario",
    "quiero cocinar arroz",
    "recetas",
];

console.log("Running Voice Logic Tests (JS)...\n");

testCases.forEach(text => {
    console.log(`Input: "${text}"`);
    const result = classifyIntent(text);
    console.log(`Result: ${JSON.stringify(result)}`);

    let status = "✅ PASS";
    // These fail with OLD logic, should PASS with NEW logic (simulated here)
    // But wait, parseNavigationCommand in this script is the OLD one (mostly).
    // The classifyIntent here is the NEW one.

    if (text === "agregar ingredientes al inventario" && result.type === 'navigation') status = "❌ FAIL (Should be question)";
    if (text === "navegar a la receta de arroz blanco" && result.type === 'navigation' && result.route === '/recipes') status = "❌ FAIL (Should be question/specific)";

    // This one fails because "cocina" is in "mi cocina" keywords AND "cocinar" keywords?
    // "agregar ... a mi cocina". "cocina" is in /cook keywords.
    if (text === "agregar una batidora eléctrica a mi cocina") {
        if (result.route === '/cook') status = "❌ FAIL (Should not be /cook)";
        if (result.type === 'navigation') status = "❌ FAIL (Should be question)";
    }

    console.log(`Status: ${status}\n`);
});
