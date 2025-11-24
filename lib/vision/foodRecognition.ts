/**
 * Food Recognition Module
 * Handles image analysis using LM Studio with Qwen VL
 */

export interface RecognitionResult {
  foodName: string;
  foodNameEs: string;
  confidence: number;
  estimatedWeight: {
    weight: number;
    min: number;
    max: number;
    unit: string;
  };
  category: string;
  description?: string;
  ingredients?: string[];
  brand?: string;
  synonyms?: string[];
  name?: string; // Alias for easier integration
  estimatedCalories?: string;
}

interface APIAnalysisResult {
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

/**
 * Loads the model - No-op since we use API
 * Kept for compatibility
 */
export async function loadModel(): Promise<void> {
  console.log("Sistema de análisis vía API listo");
}

/**
 * Checks if model is loaded - Always returns true since we use API
 */
export function isModelLoaded(): boolean {
  return true;
}

/**
 * Converts image element to base64 for API transmission
 */
export async function imageToBase64(imageElement: HTMLImageElement): Promise<string> {
  return new Promise((resolve) => {
    const canvas = document.createElement('canvas');
    canvas.width = imageElement.naturalWidth;
    canvas.height = imageElement.naturalHeight;

    const ctx = canvas.getContext('2d');
    if (!ctx) {
      throw new Error('No se pudo obtener contexto del canvas');
    }

    ctx.drawImage(imageElement, 0, 0);
    const dataUrl = canvas.toDataURL('image/jpeg', 0.9);
    resolve(dataUrl);
  });
}

/**
 * Parses estimated weight from number or text
 */
function parseWeight(weightValue?: number | string | null): {
  weight: number;
  min: number;
  max: number;
} {
  if (typeof weightValue === 'number') {
    return {
      weight: weightValue,
      min: Math.round(weightValue * 0.8),
      max: Math.round(weightValue * 1.2),
    };
  }

  const weightStr = weightValue ? String(weightValue) : '';

  if (!weightStr || weightStr.trim() === '') {
    return { weight: 200, min: 150, max: 250 };
  }

  const numbers = weightStr.match(/\d+/g);
  if (!numbers || numbers.length === 0) {
    return { weight: 200, min: 150, max: 250 };
  }

  if (numbers.length === 1) {
    const weight = parseInt(numbers[0]);
    return {
      weight,
      min: Math.round(weight * 0.8),
      max: Math.round(weight * 1.2),
    };
  }

  const min = parseInt(numbers[0]);
  const max = parseInt(numbers[1]);
  const weight = Math.round((min + max) / 2);

  return { weight, min, max };
}

/**
 * Determines food category based on analysis type
 */
function determineFoodCategory(type: string): string {
  const categoryMap: Record<string, string> = {
    'platillo': 'Platillo preparado',
    'ingrediente': 'Ingrediente',
    'producto_empaquetado': 'Producto empaquetado',
    'desconocido': 'Alimento',
  };

  return categoryMap[type] || 'Alimento';
}

/**
 * Analyzes an image using LM Studio API with Qwen VL
 */
export async function recognizeFood(
  imageElement: HTMLImageElement
): Promise<RecognitionResult[]> {
  try {
    const base64Image = await imageToBase64(imageElement);

    const response = await fetch('/api/analyze-image', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        image: base64Image,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(
        errorData.error || `Error en la API: ${response.statusText}`
      );
    }

    const apiResult: APIAnalysisResult = await response.json();
    const weightEstimate = parseWeight(apiResult.estimatedWeight);

    let foodName = apiResult.name || 'Análisis de comida';
    let foodNameEs = apiResult.name || 'Análisis de comida';

    if (!apiResult.name || apiResult.name === 'Ingrediente') {
      if (apiResult.type === 'platillo') {
        foodName = 'Prepared Dish';
        foodNameEs = 'Platillo preparado';
      } else if (apiResult.type === 'ingrediente') {
        foodName = 'Ingredient';
        foodNameEs = 'Ingrediente';
      } else if (apiResult.type === 'producto_empaquetado') {
        foodName = 'Packaged Product';
        foodNameEs = 'Producto empaquetado';
      }
    }

    if (apiResult.brand) {
      foodName = apiResult.brand;
      foodNameEs = apiResult.brand;
    }

    const result: RecognitionResult = {
      foodName,
      foodNameEs,
      confidence: Math.round(apiResult.confidence * 100),
      estimatedWeight: {
        weight: weightEstimate.weight,
        min: weightEstimate.min,
        max: weightEstimate.max,
        unit: 'g',
      },
      category: apiResult.category || determineFoodCategory(apiResult.type),
      description: apiResult.description,
      ingredients: apiResult.ingredients,
      brand: apiResult.brand,
      synonyms: apiResult.synonyms || [],
      name: foodNameEs,
      estimatedCalories: apiResult.estimatedCalories,
    };

    return [result];

  } catch (error) {
    console.error('Error al analizar alimento:', error);
    throw error;
  }
}

/**
 * Converts a File to HTMLImageElement for processing
 */
export function fileToImageElement(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = reject;
      img.src = e.target?.result as string;
    };

    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

/**
 * Converts an image URL to HTMLImageElement
 */
export function urlToImageElement(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = url;
  });
}

/**
 * Analyzes an image from a File object
 */
export async function recognizeFoodFromFile(file: File): Promise<RecognitionResult[]> {
  const imageElement = await fileToImageElement(file);
  return recognizeFood(imageElement);
}

/**
 * Analyzes an image from a URL
 */
export async function recognizeFoodFromUrl(url: string): Promise<RecognitionResult[]> {
  const imageElement = await urlToImageElement(url);
  return recognizeFood(imageElement);
}
