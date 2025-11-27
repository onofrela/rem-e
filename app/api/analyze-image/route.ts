import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'nodejs';
export const maxDuration = 300; // 5 minutos para dar tiempo a imágenes grandes

export interface AnalysisResult {
  type: 'platillo' | 'ingrediente' | 'producto_empaquetado' | 'desconocido';
  name: string;
  description: string;
  ingredients?: string[];
  estimatedCalories?: string;
  estimatedWeight?: number;
  brand?: string;
  category?: string;
  synonyms?: string[];
  confidence: number;
}

export async function POST(request: NextRequest) {
  try {
    // Configurar headers CORS
    const headers = {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    };

    const { image } = await request.json();

    if (!image) {
      return NextResponse.json(
        { error: 'No se proporcionó ninguna imagen' },
        { status: 400, headers }
      );
    }

    const lmStudioUrl = process.env.NEXT_PUBLIC_LM_STUDIO_URL || process.env.LM_STUDIO_API_URL || process.env.LM_STUDIO_URL || 'http://127.0.0.1:1234';

    // Prompt dinámico para análisis de comida
    const systemPrompt = `Eres un experto en análisis de alimentos y nutrición. Tu tarea es analizar imágenes de comida y proporcionar información detallada.

Debes responder SIEMPRE en formato JSON con la siguiente estructura:
{
  "type": "platillo" | "ingrediente" | "producto_empaquetado" | "desconocido",
  "name": "nombre específico del ingrediente en español",
  "description": "descripción detallada",
  "ingredients": ["ingrediente1", "ingrediente2", ...],
  "estimatedCalories": "rango estimado en kcal",
  "estimatedWeight": número en gramos (solo el número, sin unidades),
  "brand": "marca si es visible",
  "category": "categoría del ingrediente",
  "synonyms": ["sinónimo1", "sinónimo2", "variante1", ...]
}

CATEGORÍAS VÁLIDAS:
- Verduras y Hortalizas
- Frutas
- Carnes y Proteínas
- Lácteos
- Granos y Cereales
- Harinas y Masas
- Condimentos y Especias
- Aceites y Grasas
- Endulzantes
- Frutos Secos y Semillas
- Bebidas
- Otros

INSTRUCCIONES:
- Para el campo "name": Identifica el nombre ESPECÍFICO del ingrediente principal (ej: "Tomate", "Zanahoria", "Pechuga de pollo", NO solo "ingrediente")
- Para el campo "category": Asigna UNA de las categorías válidas listadas arriba que mejor corresponda al ingrediente
- Para "estimatedWeight": Proporciona SOLO EL NÚMERO en gramos (ej: 200, no "200g" ni "200 gramos")
- Para "synonyms": Incluye nombres alternativos, variantes regionales, o formas diferentes de llamar al ingrediente (ej: para "Tomate": ["jitomate", "tomate rojo", "tomate bola"])
- Si es un PLATILLO: identifica el platillo y sus ingredientes visibles
- Si es un INGREDIENTE: identifica el ingrediente específico, su categoría, peso estimado y sinónimos
- Si es un PRODUCTO EMPAQUETADO: identifica la marca si es visible
- Sé específico con las cantidades y estimaciones
- Si no puedes ver algo claramente, usa valores por defecto razonables`;

    const userPrompt = `Analiza esta imagen de comida y proporciona un análisis detallado siguiendo el formato JSON especificado.`;

    // Llamada a LM Studio API con Qwen VL
    const response = await fetch(`${lmStudioUrl}/v1/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'ngrok-skip-browser-warning': 'true',
      },
      body: JSON.stringify({
        model: 'qwen-vl',
        messages: [
          {
            role: 'system',
            content: systemPrompt,
          },
          {
            role: 'user',
            content: [
              {
                type: 'text',
                text: userPrompt,
              },
              {
                type: 'image_url',
                image_url: {
                  url: image, // base64 image
                },
              },
            ],
          },
        ],
        temperature: 0.7,
        max_tokens: 1000,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Error de LM Studio:', errorText);
      return NextResponse.json(
        { error: `Error al comunicarse con LM Studio: ${response.statusText}` },
        { status: response.status, headers }
      );
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content;

    if (!content) {
      return NextResponse.json(
        { error: 'No se recibió respuesta del modelo' },
        { status: 500, headers }
      );
    }

    // Intentar parsear JSON de la respuesta
    let result: AnalysisResult;
    try {
      // Limpiar la respuesta en caso de que tenga markdown o texto extra
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      const jsonStr = jsonMatch ? jsonMatch[0] : content;
      const parsedResult = JSON.parse(jsonStr);

      // Parsear peso - asegurarse que sea número
      let weightValue: number | undefined;
      if (parsedResult.estimatedWeight) {
        if (typeof parsedResult.estimatedWeight === 'number') {
          weightValue = parsedResult.estimatedWeight;
        } else if (typeof parsedResult.estimatedWeight === 'string') {
          // Extraer número del string si viene como texto
          const weightMatch = parsedResult.estimatedWeight.match(/(\d+)/);
          weightValue = weightMatch ? parseInt(weightMatch[1]) : undefined;
        }
      }

      result = {
        type: parsedResult.type || 'ingrediente',
        name: parsedResult.name || 'Ingrediente',
        description: parsedResult.description || content,
        ingredients: parsedResult.ingredients || [],
        estimatedCalories: parsedResult.estimatedCalories,
        estimatedWeight: weightValue,
        brand: parsedResult.brand,
        category: parsedResult.category || 'Otros',
        synonyms: parsedResult.synonyms || [],
        confidence: 0.85, // Qwen VL no proporciona confidence directamente
      };
    } catch {
      // Si no puede parsear JSON, usar la respuesta como descripción
      result = {
        type: 'ingrediente',
        name: 'Ingrediente',
        description: content,
        category: 'Otros',
        synonyms: [],
        confidence: 0.70,
      };
    }

    return NextResponse.json(result, { headers });

  } catch (error) {
    console.error('Error en análisis de imagen:', error);
    return NextResponse.json(
      {
        error: 'Error interno del servidor',
        details: error instanceof Error ? error.message : 'Error desconocido'
      },
      { status: 500, headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type',
      }}
    );
  }
}

// Handler para preflight requests (OPTIONS)
export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  });
}
