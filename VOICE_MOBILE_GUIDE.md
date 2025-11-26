# 🎤 Guía de Control por Voz en Móviles

Esta guía explica cómo usar el control por voz de Rem-E en dispositivos móviles (tablets y smartphones).

---

## 📱 Requisitos

- ✅ **Navegador compatible**: Chrome, Edge o Safari
- ✅ **Conexión a internet**: Necesaria para el reconocimiento de voz
- ✅ **HTTPS**: La app debe estar en un dominio seguro (https://) o localhost
- ✅ **Permisos de micrófono**: Debes otorgar permiso cuando el navegador lo solicite

---

## 🚨 Diferencias con Desktop

### En PC/Desktop:
- El reconocimiento de voz se activa **automáticamente** al cargar la página
- Los permisos se solicitan al primer uso

### En Móvil (Tablets/Smartphones):
- El reconocimiento de voz **NO** se activa automáticamente
- **DEBES tocar el botón del micrófono** para activarlo
- Esta es una restricción de seguridad de los navegadores móviles
- Los permisos se solicitan cuando tocas el botón por primera vez

---

## 📝 Cómo Activar el Control por Voz

### Primera vez:

1. **Toca el botón del micrófono** flotante (esquina inferior derecha)
2. Tu navegador mostrará una ventana emergente pidiendo permiso para usar el micrófono
3. **Toca "Permitir" o "Allow"**
4. El botón cambiará a verde y dirá "Escuchando..."
5. ¡Listo! Ya puedes usar comandos de voz

### Si ya otorgaste permisos:

1. Solo toca el botón del micrófono
2. Empezará a escuchar inmediatamente

---

## ⚠️ Problemas Comunes

### "Acceso al micrófono denegado"

**Causa**: Denegaste el permiso o los permisos están bloqueados en la configuración.

**Solución en iOS (Safari/Chrome):**
1. Ve a **Ajustes** del dispositivo
2. Busca **Safari** o **Chrome** (según tu navegador)
3. Toca **Micrófono**
4. Asegúrate que esté **activado** o **Preguntar**
5. Recarga la página de Rem-E
6. Toca el botón del micrófono nuevamente

**Solución en Android (Chrome):**
1. Ve a **Configuración** del dispositivo
2. **Aplicaciones** > **Chrome**
3. **Permisos** > **Micrófono**
4. Selecciona **Permitir solo mientras se usa la app**
5. Recarga la página de Rem-E
6. Toca el botón del micrófono nuevamente

**Solución alternativa (más rápida):**
1. En la barra de direcciones, toca el **icono del candado** 🔒
2. Toca **Permisos del sitio** o **Configuración del sitio**
3. Encuentra **Micrófono**
4. Cambia a **Permitir**
5. Recarga la página

---

### No aparece la solicitud de permisos

**Causa**: Es posible que ya hayas denegado permisos anteriormente.

**Solución**: Sigue los pasos de la sección anterior para restablecer permisos.

---

### El botón no responde al tocarlo

**Causa**: Puede ser un error temporal del navegador.

**Solución**:
1. Recarga la página completamente (pull to refresh)
2. Cierra y abre de nuevo el navegador
3. Si el problema persiste, limpia la caché del navegador

---

### "Tu navegador no soporta reconocimiento de voz"

**Causa**: Estás usando un navegador no compatible (ej: Firefox en Android).

**Solución**:
- Usa **Chrome** (Android/iOS)
- Usa **Safari** (iOS/iPadOS)
- Usa **Edge** (Android)

---

## 🎯 Comandos de Voz Disponibles

### Navegación General
Requiere decir "Rem-E" primero:

```
"Rem-E, ve a recetas"
"Rem-E, abre el inventario"
"Rem-E, ir a cocinar"
"Rem-E, ir a mi cocina"
"Rem-E, abrir configuración"
```

### Durante una Receta
NO requiere "Rem-E", funcionan directamente:

```
"siguiente"     → Avanza al siguiente paso
"anterior"      → Regresa al paso anterior
"repetir"       → Repite la instrucción del paso actual
"pausar"        → Pausa la guía
"reanudar"      → Continúa la guía
"timer 5 minutos" → Crea un temporizador
```

---

## 💡 Consejos para Mejor Reconocimiento

1. **Habla claro y a volumen normal** - No grites ni susurres
2. **Reduce el ruido ambiente** - El micrófono capta todo el sonido
3. **Espera a que aparezca el transcript** - Verás lo que el sistema reconoce
4. **Si no funciona, repite** - A veces el reconocimiento falla
5. **Usa frases cortas** - "Rem-E, recetas" es mejor que "Rem-E quiero ir a ver las recetas"

---

## 🔋 Consumo de Batería

⚠️ **IMPORTANTE**: El reconocimiento de voz consume batería porque:
- Mantiene el micrófono activo constantemente
- Envía audio a los servidores de Google/Apple para procesamiento
- Requiere conexión a internet activa

**Recomendaciones**:
- Desactiva el control por voz (toca el botón) cuando no lo uses
- En cocina, mantén el dispositivo conectado a corriente si es posible
- Si la batería es baja, usa los botones táctiles en lugar de voz

---

## 🔒 Privacidad

- El audio se procesa en los servidores de Google (Chrome) o Apple (Safari)
- Rem-E **NO** almacena ni procesa tu voz directamente
- Solo recibimos el texto transcrito, no el audio
- Los comandos son procesados localmente en tu dispositivo

---

## 🐛 Reportar Problemas

Si encuentras un problema que no está en esta guía:

1. Verifica que estés usando un navegador compatible
2. Revisa que tengas conexión a internet
3. Comprueba los permisos del micrófono
4. Si el problema persiste, abre un issue en GitHub con:
   - Dispositivo (ej: iPad Pro 2021, Samsung Galaxy S23)
   - Sistema operativo y versión (ej: iOS 17.2, Android 14)
   - Navegador y versión (ej: Safari 17, Chrome 120)
   - Descripción del problema
   - Capturas de pantalla si es posible

---

## ✅ Mejores Prácticas

### ✅ HACER:
- Toca el botón del micrófono ANTES de hablar
- Espera a ver "Escuchando..." antes de dar comandos
- Usa comandos cortos y claros
- Desactiva cuando termines de usar

### ❌ NO HACER:
- No esperes que se active automáticamente en móvil
- No hables si el botón está gris/desactivado
- No uses en ambientes muy ruidosos
- No olvides desactivar para ahorrar batería

---

## 🎓 Video Tutorial

*(Próximamente - enlace a video demostrativo)*

---

¿Sigues teniendo problemas? Revisa las [Preguntas Frecuentes](FAQ.md) o contacta al soporte.
