
import { NextRequest, NextResponse } from 'next/server';

const LM_STUDIO_URL = process.env.NEXT_PUBLIC_LM_STUDIO_URL || process.env.LM_STUDIO_URL || 'http://localhost:1234';

const CLASSIFICATION_SYSTEM_PROMPT = `
Eres un clasificador de intenciones para un asistente de cocina.
Tu ÚNICO trabajo es clasificar el texto del usuario en una de las siguientes categorías.
Responde SOLO con el nombre de la categoría. Nada más.

CATEGORÍAS:
1. NAVIGATION: El usuario quiere ir a una pantalla específica (ej: "ir a inicio", "ver mis recetas", "abrir inventario", "ir a mi cocina").
2. INVENTORY_ACTION: El usuario quiere modificar su inventario (ej: "agrega 3 tomates", "borra leche", "tengo manzanas").
3. RECIPE_SEARCH: El usuario busca una receta específica o ideas (ej: "receta de arroz", "qué puedo cocinar con pollo", "busca receta de pizza").
4. COOKING_CONTROL: Comandos de control mientras cocina (ej: "siguiente paso", "repite", "cuánto tiempo falta", "pon un timer").
5. GENERAL_QUESTION: Preguntas generales o conversación (ej: "hola", "¿qué eres?", "dame un tip de cocina").

EJEMPLOS:
"ir a inventario" -> NAVIGATION
"agrega 2 litros de leche" -> INVENTORY_ACTION
"quiero cocinar algo con huevo" -> RECIPE_SEARCH
"siguiente paso" -> COOKING_CONTROL
"cómo se corta la cebolla" -> GENERAL_QUESTION
"ve a mi cocina" -> NAVIGATION
"añadir batidora a mi cocina" -> INVENTORY_ACTION (Aunque dice "cocina", es una acción de agregar equipo)
"receta de pastel de chocolate" -> RECIPE_SEARCH
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
        else if (classification.includes('RECIPE_SEARCH')) finalClassification = 'RECIPE_SEARCH';
        else if (classification.includes('COOKING_CONTROL')) finalClassification = 'COOKING_CONTROL';
        else if (classification.includes('GENERAL_QUESTION')) finalClassification = 'GENERAL_QUESTION';

        return NextResponse.json({ classification: finalClassification });

    } catch (error) {
        console.error('[Classification API] Error:', error);
        return NextResponse.json({
            classification: 'GENERAL_QUESTION',
            error: String(error)
        });
    }
}
