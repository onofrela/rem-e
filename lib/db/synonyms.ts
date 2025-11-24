/**
 * Diccionario de sinónimos comunes para ingredientes en español
 * Permite reconocer diferentes nombres para el mismo ingrediente
 */

export const SYNONYM_GROUPS: string[][] = [
  // Verduras y hortalizas
  ['tomate', 'jitomate'],
  ['papa', 'patata'],
  ['ejote', 'judía verde', 'vainita', 'chaucha'],
  ['elote', 'maíz', 'choclo'],
  ['chile', 'ají', 'pimiento picante'],
  ['pimiento', 'pimentón', 'morrón'],
  ['calabaza', 'zapallo', 'auyama'],
  ['calabacita', 'calabacín', 'zucchini'],
  ['betabel', 'remolacha', 'betarraga'],
  ['zanahoria', 'azanoria'],
  ['cebolla', 'cebolla cabezona'],
  ['cebollín', 'cebolla de verdeo', 'cebolleta', 'cebolla larga'],
  ['aguacate', 'palta'],
  ['frijol', 'fríjol', 'judía', 'habichuela', 'poroto'],
  ['chícharo', 'guisante', 'arveja'],
  ['col', 'repollo', 'berza'],
  ['brócoli', 'brécol'],
  ['coliflor', 'coliflor'],
  ['espinaca', 'espinacas'],
  ['lechuga', 'lechugas'],
  ['champiñón', 'champiñones', 'hongo', 'seta'],

  // Frutas
  ['plátano', 'banana', 'guineo'],
  ['naranja', 'china'],
  ['limón', 'lima'],
  ['fresa', 'frutilla'],
  ['durazno', 'melocotón'],
  ['damasco', 'albaricoque', 'chabacano'],
  ['ananá', 'piña'],
  ['sandía', 'patilla'],
  ['melón', 'melón'],
  ['manzana', 'manzanas'],
  ['pera', 'peras'],
  ['uva', 'uvas'],
  ['ciruela', 'ciruelas'],
  ['mango', 'mangos'],
  ['papaya', 'lechosa', 'mamón'],
  ['maracuyá', 'parchita', 'fruta de la pasión'],
  ['guayaba', 'guayabas'],

  // Carnes y proteínas
  ['carne de res', 'carne de vaca', 'carne vacuna', 'ternera'],
  ['carne de cerdo', 'carne de puerco', 'carne de chancho'],
  ['carne molida', 'carne picada'],
  ['pollo', 'gallina'],
  ['pavo', 'guajolote'],
  ['pescado', 'pez'],
  ['camarón', 'gamba', 'langostino'],
  ['atún', 'tuna'],
  ['salmón', 'salmon'],
  ['huevo', 'huevos'],

  // Lácteos
  ['leche', 'leche de vaca'],
  ['queso', 'quesos'],
  ['mantequilla', 'manteca'],
  ['crema', 'nata'],
  ['yogur', 'yogurt', 'yoghurt'],
  ['requesón', 'ricota'],

  // Granos y cereales
  ['arroz', 'arroz blanco'],
  ['arroz integral', 'arroz moreno'],
  ['avena', 'hojuelas de avena'],
  ['trigo', 'trigos'],
  ['cebada', 'cebadas'],
  ['quinoa', 'quinua', 'kinua'],
  ['amaranto', 'amarantos'],

  // Harinas y masas
  ['harina', 'harina de trigo'],
  ['harina integral', 'harina de trigo integral'],
  ['maicena', 'fécula de maíz', 'almidón de maíz'],
  ['pan', 'panes'],
  ['tortilla', 'tortillas'],
  ['pasta', 'pastas'],

  // Condimentos y especias
  ['sal', 'sal de mesa'],
  ['pimienta', 'pimienta negra'],
  ['azúcar', 'azucar'],
  ['canela', 'canela en polvo'],
  ['comino', 'cominos'],
  ['orégano', 'oregano'],
  ['cilantro', 'culantro', 'coriandro'],
  ['perejil', 'peregil'],
  ['ajo', 'ajos'],
  ['jengibre', 'kion'],
  ['cúrcuma', 'turmeric'],

  // Aceites y grasas
  ['aceite', 'aceite vegetal'],
  ['aceite de oliva', 'aceite de olivo'],
  ['aceite de girasol', 'aceite de maravilla'],
  ['manteca', 'manteca vegetal'],

  // Endulzantes
  ['miel', 'miel de abeja'],
  ['azúcar morena', 'azúcar mascabado', 'azúcar integral'],
  ['jarabe', 'sirope', 'almíbar'],

  // Frutos secos y semillas
  ['cacahuate', 'maní', 'cacahuete'],
  ['nuez', 'nueces'],
  ['almendra', 'almendras'],
  ['avellana', 'avellanas'],
  ['pistacho', 'pistachos'],
  ['semilla de girasol', 'pipas'],
  ['semilla de calabaza', 'pepitas'],
  ['ajonjolí', 'sésamo'],

  // Bebidas
  ['agua', 'agua potable'],
  ['jugo', 'zumo'],
  ['refresco', 'gaseosa', 'soda'],
  ['café', 'cafe'],
  ['té', 'te'],

  // Otros
  ['tofu', 'queso de soja'],
  ['salsa de soja', 'salsa de soya', 'sillao'],
  ['vinagre', 'vinagre blanco'],
  ['levadura', 'fermento'],
  ['gelatina', 'grenetina'],
  ['chocolate', 'cacao'],
  ['vainilla', 'vanilla', 'extracto de vainilla'],
];

/**
 * Crea un mapa de búsqueda rápida de sinónimos
 * Key: palabra normalizada, Value: todas sus variantes normalizadas
 */
export function createSynonymMap(): Map<string, Set<string>> {
  const synonymMap = new Map<string, Set<string>>();

  for (const group of SYNONYM_GROUPS) {
    // Cada palabra en el grupo apunta a todas las palabras del grupo (incluyéndose a sí misma)
    for (const word of group) {
      const normalized = word.toLowerCase();
      if (!synonymMap.has(normalized)) {
        synonymMap.set(normalized, new Set());
      }

      // Agregar todas las palabras del grupo como sinónimos
      for (const synonym of group) {
        synonymMap.get(normalized)!.add(synonym.toLowerCase());
      }
    }
  }

  return synonymMap;
}

/**
 * Obtiene todos los sinónimos de una palabra
 */
export function getSynonyms(word: string): string[] {
  const synonymMap = createSynonymMap();
  const normalized = word.toLowerCase();

  if (synonymMap.has(normalized)) {
    return Array.from(synonymMap.get(normalized)!);
  }

  // Si no hay sinónimos conocidos, devolver solo la palabra original
  return [normalized];
}

/**
 * Verifica si dos palabras son sinónimos
 */
export function areSynonyms(word1: string, word2: string): boolean {
  const synonyms = getSynonyms(word1);
  return synonyms.includes(word2.toLowerCase());
}
