/**
 * Sistema de normalización de nombres de ingredientes
 * Incluye manejo de acentos, plural/singular, y sinónimos
 */

import { getSynonyms, areSynonyms } from './synonyms';
import { getAllIngredients, type Ingredient } from './indexedDB';

/**
 * Remueve acentos de una cadena de texto
 */
function removeAccents(text: string): string {
  return text.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
}

/**
 * Convierte plural a singular (reglas básicas del español)
 */
function singularize(word: string): string {
  // Reglas básicas de pluralización en español
  if (word.endsWith('es')) {
    // tomates -> tomate, ajíes -> ají
    return word.slice(0, -2);
  } else if (word.endsWith('s') && !word.endsWith('ss')) {
    // papas -> papa, pero no afecta "ess" en palabras extranjeras
    return word.slice(0, -1);
  }
  return word;
}

/**
 * Normaliza un nombre de ingrediente para búsqueda y comparación
 * - Convierte a minúsculas
 * - Remueve acentos
 * - Convierte a singular
 * - Elimina espacios extra
 */
export function normalizeName(name: string): string {
  let normalized = name.toLowerCase().trim();
  normalized = removeAccents(normalized);

  // Dividir en palabras, singularizar cada una, y volver a unir
  const words = normalized.split(/\s+/);
  const singularWords = words.map(word => singularize(word));
  normalized = singularWords.join(' ');

  return normalized;
}

/**
 * Encuentra ingredientes similares en la base de datos
 * Usa normalización y sinónimos para detectar duplicados
 */
export async function findSimilarIngredients(name: string): Promise<Ingredient[]> {
  const allIngredients = await getAllIngredients();
  const normalizedSearchName = normalizeName(name);
  const searchSynonyms = getSynonyms(normalizedSearchName);

  const similar: Ingredient[] = [];

  for (const ingredient of allIngredients) {
    // Verificar coincidencia exacta con nombre normalizado
    if (ingredient.normalizedName === normalizedSearchName) {
      similar.push(ingredient);
      continue;
    }

    // Verificar si es un sinónimo conocido
    if (areSynonyms(normalizedSearchName, ingredient.normalizedName)) {
      similar.push(ingredient);
      continue;
    }

    // Verificar si algún sinónimo del ingrediente coincide
    for (const syn of ingredient.synonyms) {
      if (areSynonyms(normalizedSearchName, syn)) {
        similar.push(ingredient);
        break;
      }
    }
  }

  return similar;
}

/**
 * Verifica si un ingrediente ya existe en la base de datos
 * Retorna el ingrediente existente si lo encuentra, o null si no existe
 */
export async function checkIfIngredientExists(name: string): Promise<Ingredient | null> {
  const similar = await findSimilarIngredients(name);

  // Si encontramos al menos un ingrediente similar, retornamos el primero
  // (en la práctica, debería haber solo uno debido a la prevención de duplicados)
  if (similar.length > 0) {
    return similar[0];
  }

  return null;
}

/**
 * Genera sinónimos automáticos basados en variaciones comunes
 * Esto complementa el diccionario de sinónimos
 */
export function generateAutomaticSynonyms(name: string): string[] {
  const normalized = normalizeName(name);
  const knownSynonyms = getSynonyms(normalized);

  // Combinar sinónimos conocidos con el nombre normalizado
  const synonyms = new Set([normalized, ...knownSynonyms]);

  return Array.from(synonyms);
}

/**
 * Calcula la similitud entre dos cadenas usando distancia de Levenshtein simplificada
 * Retorna un valor entre 0 (totalmente diferente) y 1 (idéntico)
 */
export function calculateSimilarity(str1: string, str2: string): number {
  const s1 = normalizeName(str1);
  const s2 = normalizeName(str2);

  if (s1 === s2) return 1;

  const longer = s1.length > s2.length ? s1 : s2;
  const shorter = s1.length > s2.length ? s2 : s1;

  if (longer.length === 0) return 1;

  // Verificar si el más corto está contenido en el más largo
  if (longer.includes(shorter)) {
    return shorter.length / longer.length;
  }

  // Calcular distancia de Levenshtein simplificada
  const editDistance = levenshteinDistance(s1, s2);
  return 1 - editDistance / longer.length;
}

/**
 * Calcula la distancia de Levenshtein entre dos cadenas
 */
function levenshteinDistance(str1: string, str2: string): number {
  const matrix: number[][] = [];

  for (let i = 0; i <= str2.length; i++) {
    matrix[i] = [i];
  }

  for (let j = 0; j <= str1.length; j++) {
    matrix[0][j] = j;
  }

  for (let i = 1; i <= str2.length; i++) {
    for (let j = 1; j <= str1.length; j++) {
      if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1, // substitution
          matrix[i][j - 1] + 1,     // insertion
          matrix[i - 1][j] + 1      // deletion
        );
      }
    }
  }

  return matrix[str2.length][str1.length];
}

/**
 * Busca ingredientes con coincidencia fuzzy
 * Retorna ingredientes ordenados por similitud (mayor a menor)
 */
export async function fuzzySearchIngredientsWithScore(searchTerm: string, threshold: number = 0.6): Promise<Array<{ ingredient: Ingredient; similarity: number }>> {
  const allIngredients = await getAllIngredients();
  const results: Array<{ ingredient: Ingredient; similarity: number }> = [];

  for (const ingredient of allIngredients) {
    // Calcular similitud con el nombre principal
    let maxSimilarity = calculateSimilarity(searchTerm, ingredient.displayName);

    // Verificar similitud con sinónimos
    for (const synonym of ingredient.synonyms) {
      const synSimilarity = calculateSimilarity(searchTerm, synonym);
      maxSimilarity = Math.max(maxSimilarity, synSimilarity);
    }

    // Si la similitud supera el umbral, agregarlo a los resultados
    if (maxSimilarity >= threshold) {
      results.push({ ingredient, similarity: maxSimilarity });
    }
  }

  // Ordenar por similitud descendente
  results.sort((a, b) => b.similarity - a.similarity);

  return results;
}

/**
 * Limpia y normaliza el texto de entrada del usuario
 * Útil antes de procesar nombres de ingredientes
 */
export function cleanInputText(text: string): string {
  return text
    .trim()
    .replace(/\s+/g, ' ') // Múltiples espacios a uno solo
    .replace(/[^\w\s\u00C0-\u017F]/gi, '') // Mantener solo letras, números, espacios y caracteres acentuados
    .toLowerCase();
}

/**
 * Extrae palabras clave de un texto (removiendo palabras comunes)
 */
export function extractKeywords(text: string): string[] {
  const stopWords = new Set([
    'el', 'la', 'los', 'las', 'un', 'una', 'unos', 'unas',
    'de', 'del', 'al', 'a', 'en', 'con', 'sin', 'por', 'para',
    'y', 'o', 'pero', 'que', 'es', 'son', 'está', 'están',
    'su', 'sus', 'mi', 'mis', 'tu', 'tus',
  ]);

  const cleaned = cleanInputText(text);
  const words = cleaned.split(/\s+/);

  return words.filter(word =>
    word.length > 2 && !stopWords.has(word)
  );
}
