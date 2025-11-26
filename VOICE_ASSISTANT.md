# 🎤 Asistente de Voz Rem-E

## 📋 Descripción General

El asistente de voz de Rem-E utiliza la **Web Speech API nativa del navegador** (sin servidores externos ni Vosk) para reconocimiento de voz, combinado con **LM Studio** para procesamiento de lenguaje natural con capacidades de function calling.

### Arquitectura

```
Usuario → Web Speech API → useVoiceNavigation Hook → Clasificador de Intent
                                                              ↓
                                           ┌──────────────────┴──────────────────┐
                                           ↓                                     ↓
                                    Navegación                              Pregunta
                                    (Next.js Router)                   (API /api/assistant)
                                                                              ↓
                                                                       LM Studio + Functions
                                                                              ↓
                                                                    Handlers (IndexedDB)
```

---

## 🚀 Cómo Funciona

### 1. Activación con Wake Word

Di **"Rem-E"** seguido de tu comando o pregunta:

```
✅ "Rem-E, ¿qué tengo en el inventario?"
✅ "Rem-E, ve a recetas"
✅ "Rem-E, ¿cuántos tomates tengo?"
✅ "Rem-E, ¿qué puedo cocinar con pollo?"
```

### 2. Clasificación Automática de Intents

El sistema clasifica automáticamente si tu comando es:

#### 🧭 **Navegación**
- Contiene verbos de navegación: "ve a", "abre", "muestra", "navega"
- Menciona secciones específicas: "recetas", "inventario", "inicio", "planificación"

**Ejemplos:**
```
→ "ve a recetas"          → Navega a /recipes
→ "abre inventario"       → Navega a /inventory
→ "muestra mi cocina"     → Navega a /kitchen
→ "inicio"                → Navega a /
```

#### ❓ **Pregunta/Consulta**
- Contiene palabras interrogativas: "qué", "cuánto", "cómo", "dónde", "cuál"
- Verbos como: "tengo", "hay", "puedo", "necesito", "busca", "dame"

**Ejemplos:**
```
→ "¿qué tengo en el inventario?"           → Llama API del asistente
→ "¿cuántos tomates tengo?"                → Llama getInventory + búsqueda
→ "¿qué puedo cocinar con pollo?"          → Llama getRecipesByIngredients
→ "busca recetas de pasta"                 → Llama searchRecipes
```

#### 🍳 **Comandos de Cocina** (cuando estás en guía de receta)
- "siguiente", "anterior", "repetir", "pausar", "reanudar", "timer"

---

## 🔧 Tecnologías Utilizadas

### Frontend (Cliente)
- **Web Speech API** (`webkitSpeechRecognition`): Reconocimiento de voz nativo del navegador
  - Soportado en: Chrome, Edge, Safari (iOS/macOS)
  - **No requiere servidores externos**
  - Funciona en móviles y tablets con permisos de micrófono

- **useVoiceNavigation Hook**: Maneja:
  - Detección de wake word ("Rem-E")
  - Clasificación de intents (navegación vs pregunta)
  - Llamadas a la API del asistente
  - Gestión de errores y estados

### Backend (Servidor Next.js)
- **`/api/assistant`**: Endpoint que procesa preguntas
  - Recibe texto del usuario + contexto
  - Llama a LM Studio con function calling
  - Ejecuta funciones localmente (IndexedDB)
  - Retorna respuesta en lenguaje natural

- **LM Studio**: LLM local con function calling
  - Ejecuta en `http://localhost:1234`
  - Modelo recomendado: Llama 3.1 8B o similar
  - Tiene acceso a 50+ funciones de cocina

- **Function Handlers**: Ejecutan acciones en IndexedDB
  - `getInventory`: Obtiene inventario del usuario
  - `searchRecipes`: Busca recetas
  - `addToInventory`: Agrega ingredientes
  - Y más...

---

## 📝 Ejemplos de Uso

### Navegación
```
Usuario: "Rem-E, ve a recetas"
→ Sistema navega a /recipes

Usuario: "Rem-E, abre inventario"
→ Sistema navega a /inventory
```

### Consultas al Inventario
```
Usuario: "Rem-E, ¿qué tengo en el inventario?"
→ [thinking...]
→ "Tienes 12 ingredientes: tomates, cebollas, pollo..."

Usuario: "Rem-E, ¿cuántos tomates tengo?"
→ [thinking...]
→ [Llama getInventory → Busca "tomate"]
→ "Tienes 3 tomates en la alacena"
```

### Búsqueda de Recetas
```
Usuario: "Rem-E, ¿qué puedo cocinar con pollo?"
→ [thinking...]
→ [Llama getInventory → getRecipesByIngredients]
→ "Puedes hacer Pollo al Horno, Sopa de Pollo, y Tacos de Pollo"

Usuario: "Rem-E, busca recetas de pasta"
→ [thinking...]
→ [Llama searchRecipes]
→ "Encontré 5 recetas de pasta: Carbonara, Alfredo..."
```

### Comandos de Cocina (en guía de receta)
```
Usuario: [cocinando] "siguiente"
→ Avanza al siguiente paso

Usuario: [cocinando] "Rem-E, ¿cómo pico finamente?"
→ [thinking...]
→ [Llama explainCookingStep con contexto del paso actual]
→ "Para picar finamente, sujeta el cuchillo con firmeza..."
```

---

## 🛠️ Configuración

### Requisitos

1. **Navegador compatible**:
   - Chrome/Edge (desktop y móvil)
   - Safari (iOS/macOS)
   - Firefox (experimental, puede requerir flags)

2. **LM Studio** ejecutándose localmente:
   ```bash
   # Descargar desde: https://lmstudio.ai
   # Cargar modelo (ej: Llama 3.1 8B)
   # Iniciar servidor local en puerto 1234
   ```

3. **HTTPS o localhost**:
   - La Web Speech API requiere conexión segura
   - Funciona en `http://localhost:3000`
   - En producción requiere HTTPS

### Permisos de Micrófono

#### Desktop
- El navegador pedirá permisos automáticamente
- Acepta el permiso cuando se muestre el diálogo

#### Móvil/Tablet
1. Toca el botón del micrófono para activar
2. El navegador pedirá permisos
3. Acepta el permiso en el diálogo
4. Si no funciona, verifica:
   - **iOS**: Ajustes > Safari > Micrófono
   - **Android**: Ajustes > Chrome > Permisos > Micrófono

---

## 🐛 Troubleshooting

### "Navegador no compatible"
- **Causa**: Tu navegador no soporta Web Speech API
- **Solución**: Usa Chrome, Edge o Safari

### "Micrófono denegado"
- **Causa**: No diste permisos de micrófono
- **Solución Desktop**: Haz clic en el ícono del candado (🔒) en la barra de direcciones → Permisos → Micrófono → Permitir
- **Solución Móvil**: Ve a Ajustes del navegador → Permisos → Micrófono → Permitir para este sitio

### "No puedo conectar con LM Studio"
- **Causa**: LM Studio no está corriendo o no está en el puerto 1234
- **Solución**:
  1. Abre LM Studio
  2. Carga un modelo
  3. Ve a "Developer" → "Start Server"
  4. Verifica que esté en `http://localhost:1234`

### El asistente solo hace navegaciones
- **Causa**: Este era el problema original - ahora está ARREGLADO
- **Solución**: La nueva versión de `useVoiceNavigation` ya tiene integración con el LLM

### El asistente no responde preguntas
- **Causa**: LM Studio no está disponible o hay error en la clasificación
- **Solución**:
  1. Verifica que LM Studio esté corriendo
  2. Abre la consola del navegador (F12) y busca errores
  3. Verifica que la pregunta tenga palabras interrogativas ("qué", "cuánto", etc.)

---

## 🔄 Flujo Completo de una Consulta

```
1. Usuario dice: "Rem-E, ¿qué tengo en el inventario?"
   ↓
2. Web Speech API detecta el audio
   ↓
3. useVoiceNavigation detecta wake word "Rem-E"
   ↓
4. Extrae comando: "¿qué tengo en el inventario?"
   ↓
5. classifyIntent detecta que es PREGUNTA (contiene "qué" y "tengo")
   ↓
6. processQuestion llama a /api/assistant con:
   {
     text: "¿qué tengo en el inventario?",
     context: { currentPage: "/", ... }
   }
   ↓
7. API /api/assistant:
   - Construye prompt con SYSTEM_PROMPT + contexto
   - Llama a LM Studio con tools disponibles
   - LM Studio decide llamar a getInventory()
   ↓
8. executeFunction ejecuta getInventory en IndexedDB
   ↓
9. LM Studio recibe resultado y genera respuesta natural:
   "Tienes 12 ingredientes en total: 3 tomates en la alacena, 2 cebollas..."
   ↓
10. useVoiceNavigation muestra la respuesta en VoiceAssistant
    ↓
11. Usuario ve/escucha la respuesta
```

---

## 🎯 Mejoras Futuras

- [ ] Soporte para conversaciones continuas (sin wake word después de cada pregunta)
- [ ] Text-to-Speech para leer respuestas en voz alta
- [ ] Soporte multiidioma
- [ ] Mejores visualizaciones de funciones ejecutadas
- [ ] Modo offline con fallback a comandos básicos
- [ ] Integración con ngrok para usar LLM remoto

---

## 📚 Referencias

- [Web Speech API](https://developer.mozilla.org/en-US/docs/Web/API/Web_Speech_API)
- [LM Studio](https://lmstudio.ai)
- [OpenAI Function Calling](https://platform.openai.com/docs/guides/function-calling)
