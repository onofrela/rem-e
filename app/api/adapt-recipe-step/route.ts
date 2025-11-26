/**
 * Adapt Recipe Step API Route
 *
 * Handles recipe step adaptation when user lacks required appliances.
 * Uses LM Studio to intelligently adapt cooking instructions.
 */

import { NextRequest, NextResponse } from 'next/server';

// =============================================================================
// TYPES
// =============================================================================

interface AdaptStepRequest {
  sessionId: string;
  stepNumber: number;
  originalInstruction: string;
  missingFunctionality: string;
  recipeContext: {
    recipeName: string;
    recipeDescription: string;
    allSteps: Array<{
      step: number;
      instruction: string;
    }>;
    ingredientsInStep?: string[];
  };
}

interface AdaptStepResponse {
  success: boolean;
  adaptedInstruction?: string;
  timingAdjustment?: string | null;
  temperatureAdjustment?: string | null;
  warnings?: string[];
  tips?: string[];
  error?: string;
}

// =============================================================================
// LM STUDIO CONFIGURATION
// =============================================================================

const LM_STUDIO_URL = process.env.NEXT_PUBLIC_LM_STUDIO_URL || process.env.LM_STUDIO_URL || 'http://localhost:1234';

// =============================================================================
// SYSTEM PROMPT
// =============================================================================

const SYSTEM_PROMPT = `Eres un experto culinario que ayuda a adaptar recetas cuando falta un electrodoméstico específico.

**Tu tarea:**
1. Analiza el paso de la receta que requiere un electrodoméstico que el usuario NO tiene
2. Propón una alternativa práctica usando electrodomésticos comunes o métodos manuales
3. Ajusta tiempos y temperaturas si es necesario
4. Advierte sobre diferencias importantes en el resultado
5. Ofrece consejos prácticos para lograr el mejor resultado posible

**Directrices:**
- Sé conciso y claro
- Usa segunda persona (tú/tienes/puedes)
- Propón alternativas realistas y prácticas
- Si el paso es crítico y no hay alternativa, indícalo claramente
- Responde SOLO con texto natural en español, NUNCA con JSON

**Formato de respuesta:**
Tu respuesta debe ser una instrucción adaptada clara y directa que el usuario pueda seguir.`;

// =============================================================================
// FUNCTIONALITY NAMES MAP
// =============================================================================

const FUNCTIONALITY_NAMES: Record<string, string> = {
  'stovetop_cooking': 'cocción en estufa/parrilla',
  'oven_baking': 'horneado en horno',
  'blending': 'licuado/mezcla en licuadora',
  'microwave_heating': 'calentamiento en microondas',
  'grilling': 'asado en parrilla/grill',
  'food_processing': 'procesamiento en procesador de alimentos',
  'mixing': 'batido/mezcla con batidora',
  'refrigerating': 'refrigeración',
  'freezing': 'congelación',
  'boiling_water': 'hervir agua',
  'slow_cooking': 'cocción lenta',
  'pressure_cooking': 'cocción a presión',
  'steaming': 'cocción al vapor',
  'frying': 'fritura',
  'toasting': 'tostado',
};

// =============================================================================
// LM STUDIO API CALL
// =============================================================================

async function callLMStudio(prompt: string): Promise<string> {
  const response = await fetch(`${LM_STUDIO_URL}/v1/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'ngrok-skip-browser-warning': 'true',
    },
    body: JSON.stringify({
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content: prompt },
      ],
      temperature: 0.7,
      max_tokens: 300,
      stream: false,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`LM Studio error: ${response.status} - ${errorText}`);
  }

  const data = await response.json();
  return data.choices[0].message.content || '';
}

// =============================================================================
// MAIN HANDLER
// =============================================================================

export async function POST(request: NextRequest): Promise<NextResponse<AdaptStepResponse>> {
  try {
    const body: AdaptStepRequest = await request.json();
    const {
      stepNumber,
      originalInstruction,
      missingFunctionality,
      recipeContext,
    } = body;

    // Validate required fields
    if (!originalInstruction || !missingFunctionality) {
      return NextResponse.json({
        success: false,
        error: 'Missing required fields: originalInstruction or missingFunctionality',
      }, { status: 400 });
    }

    // Build adaptation prompt
    const functionalityName = FUNCTIONALITY_NAMES[missingFunctionality] || missingFunctionality;

    const prompt = `Necesito adaptar el paso ${stepNumber} de la receta "${recipeContext.recipeName}" porque el usuario NO tiene ningún electrodoméstico con la funcionalidad de "${functionalityName}".

**Paso original:**
"${originalInstruction}"

**Contexto de la receta:**
${recipeContext.recipeDescription}

**Todos los pasos de la receta:**
${recipeContext.allSteps.map(s => `${s.step}. ${s.instruction}`).join('\n')}

${recipeContext.ingredientsInStep && recipeContext.ingredientsInStep.length > 0 ? `\n**Ingredientes usados en este paso:**\n${recipeContext.ingredientsInStep.join(', ')}` : ''}

**Tu tarea:**
Propón una instrucción alternativa que el usuario pueda seguir sin el electrodoméstico que falta. Sé claro, directo y práctico. Si hay advertencias importantes o consejos útiles, menciónalo brevemente al final.`;

    console.log('[Adapt Recipe Step API] Adapting step with LM Studio...');

    // Call LM Studio
    const adaptedText = await callLMStudio(prompt);

    console.log('[Adapt Recipe Step API] Adaptation successful');

    // Parse response for warnings and tips
    const warnings: string[] = [];
    const tips: string[] = [];

    // Simple parsing: look for keywords
    const lowerText = adaptedText.toLowerCase();

    if (lowerText.includes('advertencia') || lowerText.includes('cuidado') || lowerText.includes('importante')) {
      warnings.push('Este paso ha sido adaptado. El resultado puede variar del original.');
    }

    if (lowerText.includes('consejo') || lowerText.includes('tip') || lowerText.includes('recomendación')) {
      tips.push('Revisa las indicaciones cuidadosamente para mejores resultados.');
    }

    return NextResponse.json({
      success: true,
      adaptedInstruction: adaptedText,
      timingAdjustment: null,
      temperatureAdjustment: null,
      warnings: warnings.length > 0 ? warnings : undefined,
      tips: tips.length > 0 ? tips : undefined,
    });

  } catch (error) {
    console.error('[Adapt Recipe Step API] Error:', error);

    const errorMessage = error instanceof Error ? error.message : 'Error desconocido';

    // Check if it's a connection error to LM Studio
    if (errorMessage.includes('ECONNREFUSED') || errorMessage.includes('fetch failed')) {
      // Fallback: provide basic adaptation without LLM
      return NextResponse.json({
        success: true,
        adaptedInstruction: 'Adapta este paso usando los utensilios disponibles en tu cocina. Consulta recetas similares para alternativas.',
        warnings: [
          'No se pudo conectar con el asistente para una adaptación personalizada.',
          'Esta es una sugerencia genérica. Considera consultar métodos alternativos.',
        ],
        tips: [
          'Si tienes dudas, busca videos o guías sobre métodos alternativos de cocción.',
        ],
      });
    }

    return NextResponse.json({
      success: false,
      error: errorMessage,
    }, { status: 500 });
  }
}
