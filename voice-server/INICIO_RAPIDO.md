# 🚀 Inicio Rápido - Rem-E Voice API

## ⚡ Pasos Rápidos

### 1. Instalar Dependencias

```bash
cd voice-server
pip install -r requirements.txt
```

### 2. Iniciar el Servidor

**Opción A - Script automático (Windows):**
```bash
start_api.bat
```

**Opción B - Manual:**
```bash
python start_api.py
```

### 3. Probar que Funciona

Abre en tu navegador:
```
http://localhost:8765/docs
```

O usa el cliente web de prueba:
```
Abre: voice-server/web_client_example.html
```

## 📱 Usar desde Otros Dispositivos

### 1. Obtén tu IP local

**Windows:**
```bash
ipconfig
```
Busca "Dirección IPv4" (ejemplo: 192.168.1.100)

### 2. Configura el Firewall

```bash
netsh advfirewall firewall add rule name="Rem-E API" dir=in action=allow protocol=TCP localport=8765
```

### 3. Accede desde cualquier dispositivo en tu red

```
http://TU-IP:8765/docs
```

Ejemplo: `http://192.168.1.100:8765/docs`

## 🧪 Probar la API

### Modo Interactivo
```bash
python test_api.py
```

### Hacer una pregunta rápida
```bash
python test_api.py ask "¿qué tengo en el inventario?"
```

### Ejecutar todas las pruebas
```bash
python test_api.py test
```

## 📡 Ejemplo de Uso (JavaScript)

```javascript
const API_URL = 'http://192.168.1.100:8765'; // Cambia por tu IP

async function preguntarRemE(texto) {
  const res = await fetch(`${API_URL}/api/command`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ text: texto })
  });

  const data = await res.json();
  return data.response_text;
}

// Uso
const respuesta = await preguntarRemE('¿cuántos tomates tengo?');
console.log(respuesta); // "Tienes 3 tomates en la alacena"
```

## 🔧 Requisitos Previos

- ✅ Python 3.8+
- ✅ LM Studio corriendo en puerto 1234
- ✅ Modelo Vosk descargado (opcional, para voz)
- ✅ Firewall configurado (para acceso en red)

## 📚 Documentación Completa

Lee `README_API.md` para la documentación completa.

## 🆘 Problemas Comunes

**"No se puede conectar"**
- Verifica que el servidor esté corriendo
- Comprueba tu IP con `ipconfig`
- Asegúrate de estar en la misma red WiFi

**"LM Studio not connected"**
- Inicia LM Studio
- Carga un modelo
- Verifica que esté en puerto 1234

**"Error de firewall"**
- Ejecuta el comando de firewall como administrador
- O desactiva el firewall temporalmente para probar

## 💡 Tips

- Usa `/docs` para ver la documentación interactiva
- El servidor usa `0.0.0.0` para ser accesible en red
- Puedes cambiar el puerto: `python start_api.py 9000`
- El cliente web funciona sin instalación
