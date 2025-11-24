# Configuración de Amazon Polly para Rem-E

## ¿Por qué Amazon Polly?

Amazon Polly ofrece:
- **5 millones de caracteres gratis por mes** durante los primeros 12 meses
- **Voces neurales de alta calidad** en español mexicano
- Después del periodo gratuito: $4 USD por cada millón de caracteres (muy económico)
- API estable y confiable de AWS

## Pasos para configurar AWS Polly

### 1. Crear una cuenta de AWS
1. Ve a [https://aws.amazon.com/](https://aws.amazon.com/)
2. Haz clic en "Create an AWS Account"
3. Completa el proceso de registro (necesitarás una tarjeta de crédito, pero hay un tier gratuito)

### 2. Crear un usuario IAM con acceso a Polly

1. Inicia sesión en la [Consola de AWS](https://console.aws.amazon.com/)
2. Busca "IAM" en la barra de búsqueda y selecciona el servicio
3. En el menú lateral, haz clic en "Users" (Usuarios)
4. Haz clic en "Add users" (Agregar usuarios)
5. Configura el usuario:
   - **User name:** `rem-e-polly-user` (o el nombre que prefieras)
   - **Access type:** Marca "Programmatic access"
6. Haz clic en "Next: Permissions"

### 3. Asignar permisos de Polly

1. Selecciona "Attach existing policies directly"
2. Busca "Polly" en el filtro
3. Marca la política `AmazonPollyFullAccess` o `AmazonPollyReadOnlyAccess`
   - **Recomendado:** `AmazonPollyReadOnlyAccess` (solo lectura, más seguro)
4. Haz clic en "Next: Tags" (puedes omitir tags)
5. Haz clic en "Next: Review"
6. Haz clic en "Create user"

### 4. Guardar las credenciales

**⚠️ IMPORTANTE:** Esta es la única vez que verás la clave secreta.

1. Después de crear el usuario, verás:
   - **Access key ID:** Algo como `AKIAIOSFODNN7EXAMPLE`
   - **Secret access key:** Algo como `wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY`

2. **Guarda estas credenciales** de forma segura

3. Haz clic en "Download .csv" para descargar un respaldo

### 5. Configurar el archivo .env.local

Abre el archivo `.env.local` en la raíz del proyecto y actualiza con tus credenciales:

```bash
AWS_REGION=us-east-1
AWS_ACCESS_KEY_ID=tu_access_key_id_aqui
AWS_SECRET_ACCESS_KEY=tu_secret_access_key_aqui
```

### 6. Reiniciar el servidor de desarrollo

Si ya tenías el servidor corriendo, detenlo y reinícialo:

```bash
npm run dev
```

## Voces disponibles para Español Mexicano

La implementación actual usa la voz **Mia** (neural, femenina) para español mexicano.

Otras voces disponibles:
- **Andrés** (neural, masculina, es-MX)
- **Mia** (neural, femenina, es-MX) ← **Actualmente configurada**

### Cambiar de voz

Si quieres usar la voz masculina, edita el archivo `app/api/tts/route.ts`:

```typescript
const command = new SynthesizeSpeechCommand({
  Engine: 'neural',
  LanguageCode: 'es-MX',
  VoiceId: 'Andres', // Cambiar de 'Mia' a 'Andres'
  OutputFormat: 'mp3',
  Text: text,
  TextType: 'text',
});
```

## Monitorear el uso

1. Ve a la [Consola de AWS](https://console.aws.amazon.com/)
2. Busca "Billing" en la barra de búsqueda
3. Haz clic en "Bills" para ver tu uso actual
4. Amazon Polly se factura por número de caracteres convertidos

## Límites del tier gratuito

- **Primeros 12 meses:** 5 millones de caracteres por mes GRATIS
- **Después de 12 meses:** $4 USD por millón de caracteres (voces neurales)

### Ejemplo de costos después del tier gratuito:
- 1 receta típica: ~500 caracteres
- 10,000 recetas leídas: 5 millones de caracteres = $4 USD
- Es muy económico para uso normal

## Seguridad

⚠️ **NUNCA compartas tus credenciales de AWS**

- No las subas a GitHub ni otros repositorios públicos
- El archivo `.env.local` ya está en `.gitignore`
- Si crees que tus credenciales fueron comprometidas:
  1. Ve a la consola de IAM
  2. Desactiva o elimina las claves comprometidas
  3. Genera nuevas claves

## Troubleshooting

### Error: "AWS credentials not configured"
- Verifica que `.env.local` tenga las credenciales correctas
- Reinicia el servidor de desarrollo

### Error: "Access Denied"
- Verifica que el usuario IAM tenga permisos de Polly
- Revisa que las credenciales sean correctas

### Error de región
- Asegúrate de que `AWS_REGION` esté configurada correctamente
- Región recomendada: `us-east-1`

## Recursos adicionales

- [Documentación de Amazon Polly](https://docs.aws.amazon.com/polly/)
- [Precios de Amazon Polly](https://aws.amazon.com/polly/pricing/)
- [IAM Best Practices](https://docs.aws.amazon.com/IAM/latest/UserGuide/best-practices.html)
