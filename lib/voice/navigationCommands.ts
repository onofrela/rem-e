/**
 * Navigation Commands for Voice Control
 * Defines routes and parsing logic for voice navigation in Rem-E
 */

export interface NavigationRoute {
  path: string;
  name: string;
  keywords: string[];
}

export const routes: NavigationRoute[] = [
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

// Palabras que indican navegación
const navigationVerbs = [
  "ve a",
  "ir a",
  "abre",
  "abrir",
  "muestra",
  "mostrar",
  "llévame a",
  "llevame a",
  "navega a",
  "navegar a",
  "ve al",
  "ir al",
  "ve hacia",
  "ir hacia",
  "regresa a",
  "regresar a",
  "volver a",
  "vuelve a",
  "quiero ir a",
  "quiero ver",
  "enséñame",
  "enseñame",
];

/**
 * Parses a voice command and returns the matching route
 */
export function parseNavigationCommand(text: string): NavigationRoute | null {
  const lowerText = text.toLowerCase().trim();

  // Verificar si es un comando de navegación
  let targetText = lowerText;

  for (const verb of navigationVerbs) {
    if (lowerText.includes(verb)) {
      // Extraer lo que viene después del verbo
      const index = lowerText.indexOf(verb);
      targetText = lowerText.substring(index + verb.length).trim();
      break;
    }
  }

  // Buscar la ruta que coincida con las keywords
  for (const route of routes) {
    for (const keyword of route.keywords) {
      if (targetText.includes(keyword) || lowerText.includes(keyword)) {
        return route;
      }
    }
  }

  return null;
}

/**
 * Gets a route by its path
 */
export function getRouteByPath(path: string): NavigationRoute | undefined {
  return routes.find((route) => route.path === path);
}

/**
 * Gets a route by a keyword
 */
export function getRouteByKeyword(keyword: string): NavigationRoute | undefined {
  const lowerKeyword = keyword.toLowerCase();
  return routes.find((route) =>
    route.keywords.some((kw) => kw.includes(lowerKeyword) || lowerKeyword.includes(kw))
  );
}
