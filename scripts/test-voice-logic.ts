
import { parseNavigationCommand, routes } from '../lib/voice/navigationCommands';

// Mocking the classifyIntent logic from useVoiceNavigation.ts for testing purposes
// This logic mirrors what we want to implement/fix
function classifyIntent(text: string) {
    const lowerText = text.toLowerCase().trim();

    // 1. Action Verbs Check (New Logic)
    // If it contains action verbs like "agregar", "comprar", "buscar", it should be a question/action, NOT navigation
    // UNLESS it has an explicit navigation verb like "ir a agregar" (unlikely but possible)
    const actionVerbs = ['agregar', 'añadir', 'poner', 'comprar', 'busca ', 'buscar', 'encuentra', 'dame', 'dime'];
    const hasActionVerb = actionVerbs.some(v => lowerText.includes(v));

    // Navigation verbs
    const navigationVerbs = ['ve a', 'ir a', 'abre', 'muestra', 'navega', 'llévame', 'llevame'];
    const hasNavVerb = navigationVerbs.some(v => lowerText.includes(v));

    // Specific Recipe Patterns
    const specificRecipePatterns = [
        /receta\s+(de|del|para)\s+\w+/i,
        /receta\s+de\s+la\s+\w+/i,
        /(cocinar|hacer|preparar)\s+\w+\s+\w+/i, // "cocinar arroz blanco"
        /quiero\s+(cocinar|hacer|preparar)\s+\w+/i,
    ];
    const isSpecificRecipe = specificRecipePatterns.some(pattern => pattern.test(lowerText));

    if (isSpecificRecipe) {
        return { type: 'question', reason: 'Specific recipe pattern' };
    }

    // If it has an action verb and NO navigation verb, it's likely an action/question
    if (hasActionVerb && !hasNavVerb) {
        return { type: 'question', reason: 'Action verb detected without nav verb' };
    }

    // Navigation check
    if (hasNavVerb) {
        const route = parseNavigationCommand(text);
        if (route) return { type: 'navigation', route: route.path, reason: 'Explicit navigation verb' };
    }

    // Fallback navigation check (loose matching) - THIS IS WHAT WE WANT TO RESTRICT
    // We only want to allow loose matching if it's VERY clear, or maybe disable it for ambiguous terms
    const route = parseNavigationCommand(text);
    if (route) {
        // If we found a route but no nav verb, we need to be careful.
        // For example "inventario" -> OK to navigate? Maybe.
        // "agregar ingredientes al inventario" -> parseNavigationCommand might match "inventario"
        // But we already caught "agregar" above.
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

console.log("Running Voice Logic Tests...\n");

testCases.forEach(text => {
    console.log(`Input: "${text}"`);

    // Test current/new logic
    const result = classifyIntent(text);
    console.log(`Result: ${JSON.stringify(result)}`);

    // Check against expected behavior
    let status = "✅ PASS";
    if (text === "agregar ingredientes al inventario" && result.type === 'navigation') status = "❌ FAIL (Should be question)";
    if (text === "navegar a la receta de arroz blanco" && result.type === 'navigation' && result.route === '/recipes') status = "❌ FAIL (Should be question/specific)";
    if (text === "agregar una batidora eléctrica a mi cocina" && result.route === '/cook') status = "❌ FAIL (Should not be /cook)";

    console.log(`Status: ${status}\n`);
});
