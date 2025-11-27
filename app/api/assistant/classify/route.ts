
import { NextRequest, NextResponse } from 'next/server';

const LM_STUDIO_URL = process.env.NEXT_PUBLIC_LM_STUDIO_URL || process.env.LM_STUDIO_URL || 'http://localhost:1234';

const CLASSIFICATION_SYSTEM_PROMPT = `
Eres un clasificador de intenciones para un asistente de cocina.
Tu ÚNICO trabajo es clasificar el texto del usuario en UNA categoría.
Responde SOLO con la categoría. Nada más. Una palabra.

CATEGORÍAS:
1. NAVIGATION - Navegar a una sección SIN hacer nada más (ej: "abre inventario", "ir a recetas", "llévame a inicio", "ve a la sección de inventario")
2. INVENTORY_ACTION - Agregar/modificar/consultar inventario (ej: "agrega tomates", "cuánta leche tengo", "qué hay en el inventario", "muéstrame mi inventario", "ver inventario", "borra manzanas")
3. APPLIANCE_ACTION - Agregar/modificar/consultar electrodomésticos de Mi Cocina (ej: "agrega batidora", "tengo horno", "qué electrodomésticos tengo")
4. RECIPE_SEARCH - Buscar/navegar a UNA receta específica (ej: "receta de arroz blanco", "llévame a ceviche", "busca pizza")
5. COOKING_CONTROL - Control durante cocina activa (ej: "siguiente paso", "repite", "timer de 5 minutos")
6. GENERAL_QUESTION - Preguntas/conversación general (ej: "hola", "cómo se pica cebolla", "qué puedo cocinar")

REGLAS CRÍTICAS PARA DISTINGUIR NAVIGATION vs INVENTORY_ACTION:
- NAVIGATION: Solo frases con "ir a/ve a/abre/llévame a/muestra" + nombre de sección SIN consultar datos
  Ejemplos: "abre inventario", "ve a la sección de inventario", "ir a mis recetas", "llévame a mi cocina"

- INVENTORY_ACTION: Cualquier consulta sobre QUÉ hay, CUÁNTO hay, o AGREGAR/MODIFICAR items
  Ejemplos: "qué hay en el inventario", "ver inventario", "muéstrame mi inventario", "cuántos tomates tengo", "agrega tomates"

IMPORTANTE:
- "ver/muestra/enseña inventario" = INVENTORY_ACTION (consulta de datos)
- "ve/ir a inventario" = NAVIGATION (solo navegación)
- Si pregunta sobre existencia de ingredientes = INVENTORY_ACTION
- Si solo quiere navegar sin consultar = NAVIGATION

EJEMPLOS DE NAVIGATION:
"abre inventario" -> NAVIGATION
"ve a la sección de inventario" -> NAVIGATION
"ir a mis recetas" -> NAVIGATION
"llévame a inicio" -> NAVIGATION
"muestra la pantalla de mi cocina" -> NAVIGATION

EJEMPLOS DE INVENTORY_ACTION:
"agrega 3 tomates" -> INVENTORY_ACTION
"cuántos tomates tengo" -> INVENTORY_ACTION
"qué hay en el inventario" -> INVENTORY_ACTION
"ver inventario" -> INVENTORY_ACTION
"muéstrame mi inventario" -> INVENTORY_ACTION
"hay manzanas" -> INVENTORY_ACTION
"tengo leche" -> INVENTORY_ACTION
"borra manzanas" -> INVENTORY_ACTION

EJEMPLOS DE APPLIANCE_ACTION:
"agrega batidora a mi cocina" -> APPLIANCE_ACTION
"qué electrodomésticos tengo" -> APPLIANCE_ACTION
"tengo horno" -> APPLIANCE_ACTION

EJEMPLOS DE RECIPE_SEARCH:
"receta de arroz blanco" -> RECIPE_SEARCH
"llévame a la receta de ceviche" -> RECIPE_SEARCH
"busca pizza" -> RECIPE_SEARCH

EJEMPLOS DE COOKING_CONTROL:
"siguiente paso" -> COOKING_CONTROL
"repite" -> COOKING_CONTROL
"timer de 5 minutos" -> COOKING_CONTROL

EJEMPLOS DE GENERAL_QUESTION:
"hola" -> GENERAL_QUESTION
"cómo se pica cebolla" -> GENERAL_QUESTION
"qué puedo cocinar" -> GENERAL_QUESTION
`;

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { text } = body;

        if (!text) {
            return NextResponse.json({ error: 'No text provided' }, { status: 400 });
        }

        const payload = {
            messages: [
                { role: 'system', content: CLASSIFICATION_SYSTEM_PROMPT },
                { role: 'user', content: text }
            ],
            temperature: 0.1, // Muy bajo para ser determinista
            max_tokens: 10,
            stream: false,
        };

        const response = await fetch(`${LM_STUDIO_URL}/v1/chat/completions`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'ngrok-skip-browser-warning': 'true',
            },
            body: JSON.stringify(payload),
        });

        if (!response.ok) {
            throw new Error(`LM Studio error: ${response.status}`);
        }

        const data = await response.json();
        const classification = data.choices[0].message.content.trim().toUpperCase();

        // Fallback si el LLM responde algo raro, intentar limpiar
        let finalClassification = 'GENERAL_QUESTION';
        if (classification.includes('NAVIGATION')) finalClassification = 'NAVIGATION';
        else if (classification.includes('INVENTORY_ACTION')) finalClassification = 'INVENTORY_ACTION';
        else if (classification.includes('APPLIANCE_ACTION')) finalClassification = 'APPLIANCE_ACTION';
        else if (classification.includes('RECIPE_SEARCH')) finalClassification = 'RECIPE_SEARCH';
        else if (classification.includes('COOKING_CONTROL')) finalClassification = 'COOKING_CONTROL';
        else if (classification.includes('GENERAL_QUESTION')) finalClassification = 'GENERAL_QUESTION';

        console.log(`[Classify] "${text}" -> ${finalClassification}`);

        return NextResponse.json({ classification: finalClassification });

    } catch (error) {
        console.error('[Classification API] Error:', error);
        return NextResponse.json({
            classification: 'GENERAL_QUESTION',
            error: String(error)
        });
    }
}
