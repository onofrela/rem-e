# 🎯 Plan de Migración: Recuperar Funcionalidades de Vosk

## Funcionalidades a Recuperar

### ✅ YA IMPLEMENTADO
- [x] Handlers ejecutan en cliente (IndexedDB local)
- [x] Modo conversación básico
- [x] Hook `useKitchenContext` con:
  - [x] `extractQuantity()` - Extrae "tres tomates" → 3
  - [x] `extractLocation()` - Extrae "en el refri" → "Refrigerador"
  - [x] `isAssistantAskingQuestion()` - Detecta preguntas
  - [x] `pending_ingredient`, `pending_quantity`, `pending_location`
  - [x] Timeout de conversación (30s)

### ⏳ PENDIENTE DE IMPLEMENTAR

#### 1. Integrar useKitchenContext en useVoiceNavigation
```typescript
// En useVoiceNavigation.ts
import { useKitchenContext, extractQuantity, extractLocation, isAssistantAskingQuestion } from './useKitchenContext';

const {
  context: kitchenContext,
  updateActivity,
  checkTimeout,
  setPendingIngredient,
  setPendingLocation,
  clearPending,
  hasAllDataForInventory,
  getInventoryData,
} = useKitchenContext();
```

#### 2. Extraer datos del mensaje ANTES de enviar al LLM
```typescript
const processCommand = async (text: string, isFollowUp: boolean = false) => {
  // NUEVO: Extraer cantidad y ubicación del mensaje del usuario
  const detectedQuantity = extractQuantity(text);
  const detectedLocation = extractLocation(text);

  // Guardar en contexto si detectamos
  if (detectedQuantity > 1) {
    kitchenContext.pending_quantity = detectedQuantity;
  }
  if (detectedLocation) {
    setPendingLocation(detectedLocation);
  }

  // ... resto del código
}
```

#### 3. Manejar Flujo de searchIngredients
```typescript
// Cuando el LLM devuelve toolCallsPending con searchIngredients:
if (toolCall.name === 'searchIngredients') {
  const result = await executeClientFunction(toolCall.name, toolCall.args);

  // Si encontró ingredientes, guardar el primero
  if (result.success && result.data && result.data.length > 0) {
    const firstIng = result.data[0];
    setPendingIngredient({
      id: firstIng.id,
      name: firstIng.name
    }, kitchenContext.pending_quantity, kitchenContext.pending_unit);

    console.log(`[Kitchen] Ingrediente guardado: ${firstIng.name} (${firstIng.id})`);
  }
}
```

#### 4. Auto-llamar addToInventory cuando tengamos todos los datos
```typescript
// DESPUÉS de ejecutar searchIngredients
if (hasAllDataForInventory()) {
  console.log("[Kitchen] ✅ Todos los datos disponibles, agregando automáticamente...");

  const inventoryData = getInventoryData();
  const addResult = await executeClientFunction('addToInventory', inventoryData!);

  if (addResult.success) {
    clearPending();
    // Enviar confirmación al LLM para que genere respuesta natural
  }
}
```

#### 5. Timeout Automático de Conversación
```typescript
// En el useEffect principal o en un interval
useEffect(() => {
  if (conversationMode) {
    const interval = setInterval(() => {
      if (checkTimeout()) {
        setConversationMode(false);
        lastLLMWasQuestionRef.current = false;
        console.log("[Timeout] Modo conversación desactivado");
      }
    }, 5000); // Verificar cada 5 segundos

    return () => clearInterval(interval);
  }
}, [conversationMode, checkTimeout]);
```

#### 6. Detectar Pregunta del Asistente Mejor
```typescript
// En lugar del código actual de detección de pregunta:
const isLLMQuestion = isAssistantAskingQuestion(data.response);

if (isLLMQuestion) {
  setConversationMode(true);
  lastLLMWasQuestionRef.current = true;
  updateActivity(); // ← Actualizar timestamp
}
```

## 🔄 Flujo Completo Esperado

### Caso 1: Agregar con Ubicación Explícita
```
Usuario: "Rem-E, agrega 3 tomates en el refrigerador"

1. extractQuantity("agrega 3 tomates...") → 3
2. extractLocation("...en el refrigerador") → "Refrigerador"
3. LLM llama searchIngredients("tomate")
4. Cliente ejecuta → guarda pending_ingredient
5. hasAllDataForInventory() → TRUE (tenemos todo)
6. Auto-llamar addToInventory({
     ingredientId: "ing_001",
     quantity: 3,
     unit: "piezas",
     location: "Refrigerador"
   })
7. LLM genera: "Listo, 3 tomates en el refrigerador"
```

### Caso 2: Agregar SIN Ubicación
```
Usuario: "Rem-E, agrega 3 tomates"

1. extractQuantity("agrega 3 tomates") → 3
2. extractLocation("agrega 3 tomates") → null
3. LLM llama searchIngredients("tomate")
4. Cliente ejecuta → guarda pending_ingredient
5. hasAllDataForInventory() → FALSE (falta ubicación)
6. LLM genera: "¿Dónde?"
7. isAssistantAskingQuestion("¿Dónde?") → TRUE
8. Activar modo conversación + updateActivity()

Usuario: "en el refrigerador"

9. extractLocation("en el refrigerador") → "Refrigerador"
10. setPendingLocation("Refrigerador")
11. hasAllDataForInventory() → TRUE
12. Auto-llamar addToInventory(...)
13. LLM genera: "Listo, 3 tomates en el refrigerador"
14. Desactivar modo conversación
```

### Caso 3: Timeout de Conversación
```
Usuario: "Rem-E, agrega 3 tomates"
LLM: "¿Dónde?"
[Modo conversación activado]
[Usuario no responde por 30 segundos]
[checkTimeout() → TRUE]
[Limpiar pending + desactivar conversación]
```

## 📊 Métricas de Éxito

- ✅ Extracción de cantidad funciona ("tres" → 3)
- ✅ Extracción de ubicación funciona ("refri" → "Refrigerador")
- ✅ Flujo completo con ubicación explícita (1 llamada)
- ✅ Flujo completo SIN ubicación (pregunta → respuesta → agrega)
- ✅ Timeout de conversación funciona
- ✅ No requiere wake word en modo conversación
- ✅ Recognition NO se detiene prematuramente

## 🚀 Siguiente Paso

Implementar los cambios en `useVoiceNavigation.ts` manteniendo compatibilidad con el código existente.
