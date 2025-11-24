# Rem-E - Asistente de Cocina Inteligente 🍳

> **Prototipo Frontend** - Tu asistente de cocina inteligente y privado que funciona completamente offline

![Version](https://img.shields.io/badge/version-1.0.0-orange)
![Next.js](https://img.shields.io/badge/Next.js-16.0-black)
![PWA](https://img.shields.io/badge/PWA-Enabled-blue)
![Privacy](https://img.shields.io/badge/Privacy-First-green)

## 🌟 Características Principales

### ✅ Implementado en este Prototipo

#### 🍽 **Cook Now Flow** (Cocinar Ahora)
- **3 Métodos de Input de Ingredientes:**
  - 📷 **Foto**: Captura foto de tu refrigerador con detección simulada por IA
  - ✍️ **Manual**: Búsqueda con autocomplete y selección rápida
  - 💡 **Sugerencias**: Conjuntos predefinidos de ingredientes comunes

#### 🔍 **Recipe Suggestions** (Sugerencias de Recetas)
- Motor de recomendaciones que analiza ingredientes disponibles
- Filtros: Tiempo máximo y Dificultad
- **Match Score**: Muestra % de coincidencia con tus ingredientes
- Indica ingredientes faltantes

#### 📖 **Recipe Detail Page** (Detalle de Receta)
- Ajustador de porciones con cálculo automático
- Lista de ingredientes interactiva con checkboxes
- Modal de sustituciones con explicaciones
- Vista previa de pasos

#### 🍳 **Interactive Cooking Mode** (Modo Guía Interactiva)
- Guía paso a paso inmersiva con pantalla completa
- **Control por Voz** (Web Speech API)
- **Text-to-Speech con Amazon Polly** - Voz natural de alta calidad
- Sistema de timers múltiples
- Tap anywhere para avanzar
- Tips y advertencias contextuales
- Screen Wake Lock

#### 📅 **Weekly Planner** + 📖 **My Recipes** + 🎓 **Learning** + ⚙️ **Settings**
- Todas las secciones implementadas con UI funcional
- Planificador con configuración de presupuesto
- Biblioteca de recetas con búsqueda
- Dashboard de progreso
- Configuración completa de privacidad

### 🎨 **Design System**
- Paleta de colores cálidos (naranja #FF6B35, terracota #E07A5F)
- Componentes reutilizables: Button, Card, Input, Badge
- Dark mode support
- Responsive: Mobile-first → Tablet → Desktop

## 🚀 Instalación y Uso

```bash
# Instalar dependencias
npm install

# Configurar variables de entorno
# Copia .env.example a .env.local y configura tus credenciales de AWS
# Ver AWS_POLLY_SETUP.md para instrucciones detalladas

# Iniciar servidor de desarrollo
npm run dev

# Abrir en navegador
# http://localhost:3000
```

### 🎙️ Configuración de Text-to-Speech (Opcional)

Rem-E usa **Amazon Polly** para síntesis de voz de alta calidad en la guía de cocina. Para habilitar esta característica:

1. Consulta la guía completa en [AWS_POLLY_SETUP.md](./AWS_POLLY_SETUP.md)
2. Configura tus credenciales de AWS en `.env.local`
3. Amazon Polly ofrece **5 millones de caracteres gratis por mes** durante los primeros 12 meses

**Nota:** Si no configuras AWS Polly, la app automáticamente usará la síntesis de voz del navegador (Web Speech API) como fallback.

## 🗂 Estructura

```
rem-e/
├── app/                    # Next.js pages
│   ├── cook/              # Ingredient input + suggestions
│   ├── recipes/[id]/      # Recipe detail + guide
│   ├── plan/              # Weekly planner
│   ├── learn/             # Learning section
│   └── settings/          # Settings
├── components/
│   ├── ui/               # Reusable components
│   └── layout/           # Navigation
├── lib/
│   ├── api/mock-api.ts   # 🔌 Ready for Python backend
│   ├── hooks/useVoice.ts # Voice control
│   └── utils/mock-data.ts # 5 demo recipes
└── styles/theme.css      # Design tokens
```

## 🔌 Backend Integration

El Mock API (`lib/api/mock-api.ts`) está listo para conectarse con un backend Python/FastAPI:

```typescript
// Actualmente mock, fácil de reemplazar
api.detectIngredients(image)     // → POST /api/detect-ingredients
api.getRecipeSuggestions(...)    // → POST /api/suggest-recipes
api.getRecipe(id)                // → GET /api/recipes/:id
```

## 🎯 Características UX

- **Máximo 2 clics** para cualquier acción principal
- **Manos libres**: Control por voz completo
- **Touch targets grandes**: 48px mínimo
- **Tap anywhere**: Avanza tocando cualquier parte
- **Accesibilidad**: WCAG AA, font ajustable, screen reader ready

## 🔒 Privacidad

- ✅ 100% Offline por defecto
- ✅ Cero tracking
- ✅ No requiere cuenta
- ✅ Datos solo localmente
- ✅ Exportar/Borrar datos disponible

## 📊 Datos Demo

- 5 Recetas completas (Tacos, Pasta, Ensalada, Arroz con Pollo, Quesadillas)
- 100+ Ingredientes
- Pasos detallados con tips y advertencias

## 🛠 Tecnologías

- Next.js 16 + React 19 + TypeScript
- Tailwind CSS 4
- PWA con service worker
- Web Speech API para reconocimiento de voz
- Amazon Polly (AWS) para síntesis de voz natural
- LocalStorage + IndexedDB

## 📱 Rutas Disponibles

- `/` - Home
- `/cook` - Input ingredientes
- `/cook/suggestions` - Sugerencias
- `/recipes` - Biblioteca
- `/recipes/[id]` - Detalle
- `/recipes/[id]/guide` - Guía interactiva
- `/plan` - Planificador
- `/learn` - Aprendizaje
- `/settings` - Configuración

---

**Desarrollado con ❤️ para hacer la cocina más accesible**

🍳 Rem-E v1.0.0 | Offline-First | Privacy-Focused | 100% Functional Frontend
