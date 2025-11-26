#!/usr/bin/env node
/**
 * ============================================================================
 * Script de Node.js para iniciar ngrok y actualizar .env.local
 * ============================================================================
 *
 * Este script:
 * 1. Inicia ngrok en puerto 1234 (LM Studio)
 * 2. Obtiene la URL pública generada por ngrok
 * 3. Actualiza automáticamente .env.local con la nueva URL
 * 4. Muestra información de configuración
 *
 * Uso:
 *   node scripts/start-ngrok.js
 *
 * Requisitos:
 *   - @ngrok/ngrok instalado: npm install --save-dev @ngrok/ngrok
 *   - ngrok authtoken configurado en .env o como variable de entorno
 *   - LM Studio corriendo en puerto 1234
 *
 * ============================================================================
 */

const ngrok = require('@ngrok/ngrok');
const fs = require('fs');
const path = require('path');
const http = require('http');

// ============================================================================
// CONFIGURACIÓN
// ============================================================================

const CONFIG = {
  port: process.env.NGROK_PORT || 1234,
  region: process.env.NGROK_REGION || 'us',
  authtoken: process.env.NGROK_AUTHTOKEN,
  domain: process.env.NGROK_DOMAIN, // Para dominios estáticos (plan de pago)
  auth: process.env.NGROK_AUTH, // Formato: "usuario:contraseña"
};

// Colores para console.log
const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  cyan: '\x1b[36m',
  gray: '\x1b[90m',
  white: '\x1b[97m',
};

// ============================================================================
// FUNCIONES AUXILIARES
// ============================================================================

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function banner() {
  log('\n╔═══════════════════════════════════════════════════════════════╗', 'green');
  log('║                                                               ║', 'green');
  log('║   🚀  REM-E - NGROK SETUP SCRIPT                             ║', 'green');
  log('║                                                               ║', 'green');
  log('║   Exponiendo LM Studio al mundo...                           ║', 'green');
  log('║                                                               ║', 'green');
  log('╚═══════════════════════════════════════════════════════════════╝\n', 'green');
}

function checkLMStudio() {
  return new Promise((resolve) => {
    log('🔍 Verificando que LM Studio esté corriendo...', 'yellow');

    const req = http.get(`http://localhost:${CONFIG.port}/v1/models`, (res) => {
      if (res.statusCode === 200) {
        log(`✅ LM Studio está corriendo en puerto ${CONFIG.port}`, 'green');
        resolve(true);
      } else {
        log(`⚠️  LM Studio respondió con código ${res.statusCode}`, 'yellow');
        resolve(false);
      }
    });

    req.on('error', () => {
      log(`⚠️  No se puede conectar a LM Studio en puerto ${CONFIG.port}`, 'yellow');
      log('\nAsegúrate de:', 'yellow');
      log('  1. LM Studio esté abierto', 'gray');
      log('  2. El servidor local esté habilitado (Settings → Server)', 'gray');
      log(`  3. El puerto sea ${CONFIG.port} (el default es 1234)\n`, 'gray');
      resolve(false);
    });

    req.setTimeout(5000, () => {
      req.destroy();
      log('⚠️  Timeout al conectar con LM Studio', 'yellow');
      resolve(false);
    });
  });
}

function updateEnvFile(ngrokUrl) {
  const envPath = path.join(process.cwd(), '.env.local');

  log('\n📝 Actualizando .env.local...', 'yellow');

  try {
    let envContent = '';

    if (fs.existsSync(envPath)) {
      // Lee el archivo existente
      envContent = fs.readFileSync(envPath, 'utf8');

      // Crea backup
      const backupPath = `${envPath}.backup`;
      fs.writeFileSync(backupPath, envContent);
      log(`   Backup guardado en: ${backupPath}`, 'gray');

      // Reemplaza o agrega la variable
      if (envContent.includes('NEXT_PUBLIC_LM_STUDIO_URL=')) {
        envContent = envContent.replace(
          /NEXT_PUBLIC_LM_STUDIO_URL=.*/,
          `NEXT_PUBLIC_LM_STUDIO_URL=${ngrokUrl}`
        );
      } else {
        envContent += `\nNEXT_PUBLIC_LM_STUDIO_URL=${ngrokUrl}\n`;
      }
    } else {
      // Crea nuevo archivo
      envContent = `# LM Studio Configuration\nNEXT_PUBLIC_LM_STUDIO_URL=${ngrokUrl}\n`;
    }

    // Guarda el archivo
    fs.writeFileSync(envPath, envContent);
    log('✅ .env.local actualizado correctamente', 'green');

  } catch (error) {
    log(`⚠️  Error al actualizar .env.local: ${error.message}`, 'yellow');
    log('   Por favor actualiza manualmente:', 'yellow');
    log(`   NEXT_PUBLIC_LM_STUDIO_URL=${ngrokUrl}`, 'white');
  }
}

function showInfo(ngrokUrl) {
  log('\n╔═══════════════════════════════════════════════════════════════╗', 'green');
  log('║                                                               ║', 'green');
  log('║   ✅  NGROK INICIADO EXITOSAMENTE                            ║', 'green');
  log('║                                                               ║', 'green');
  log('╚═══════════════════════════════════════════════════════════════╝\n', 'green');

  log(`🌐 URL Pública: ${ngrokUrl}`, 'cyan');

  log('\n╔═══════════════════════════════════════════════════════════════╗', 'cyan');
  log('║                  INFORMACIÓN IMPORTANTE                       ║', 'cyan');
  log('╚═══════════════════════════════════════════════════════════════╝', 'cyan');

  log('\n📊 Panel de Control:', 'cyan');
  log('   http://localhost:4040\n', 'white');

  log('⚡ Próximos Pasos:', 'cyan');
  log('   1. Reinicia tu servidor de Next.js:', 'white');
  log('      npm run dev\n', 'gray');
  log('   2. Prueba la conexión:', 'white');
  log('      http://localhost:3000/api/assistant\n', 'gray');
  log('   3. ¡Ya puedes acceder desde cualquier lugar!\n', 'white');

  log('🔒 Seguridad:', 'cyan');
  if (CONFIG.auth) {
    log('   ✅ Autenticación básica HABILITADA', 'green');
    const [user] = CONFIG.auth.split(':');
    log(`      Usuario: ${user}`, 'gray');
  } else {
    log('   ⚠️  Sin autenticación - Cualquiera con la URL puede acceder', 'yellow');
    log('      Considera usar autenticación para mayor seguridad', 'gray');
  }

  log('\n⚠️  ADVERTENCIAS:', 'yellow');
  if (!CONFIG.domain) {
    log('   • Esta URL cambiará cada vez que reinicies ngrok (plan gratuito)', 'white');
  }
  log('   • Hay límites de uso en el plan gratuito', 'white');
  log('   • Todo el tráfico pasa por servidores de ngrok', 'white');
  log('   • No compartas la URL públicamente', 'white');

  log('\n🛑 Para Detener:', 'red');
  log('   Presiona Ctrl+C\n', 'white');

  log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n', 'gray');
  log('📡 ngrok está corriendo...\n', 'cyan');
  log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n', 'gray');
}

// ============================================================================
// FUNCIÓN PRINCIPAL
// ============================================================================

async function main() {
  banner();

  // Verifica LM Studio
  await checkLMStudio();

  // Configuración de ngrok
  log('\n🚀 Iniciando ngrok...', 'green');
  log(`   Puerto: ${CONFIG.port}`, 'gray');
  log(`   Región: ${CONFIG.region}`, 'gray');

  if (CONFIG.domain) {
    log(`   Dominio: ${CONFIG.domain}`, 'gray');
  }

  if (CONFIG.auth) {
    log('   Autenticación: Habilitada', 'gray');
  }

  try {
    // Opciones de ngrok
    const ngrokOptions = {
      addr: parseInt(CONFIG.port),
      authtoken: CONFIG.authtoken,
      region: CONFIG.region,
    };

    // Dominio estático (solo con plan de pago)
    if (CONFIG.domain) {
      ngrokOptions.domain = CONFIG.domain;
    }

    // Autenticación básica
    if (CONFIG.auth) {
      ngrokOptions.basic_auth = [CONFIG.auth];
    }

    // Inicia ngrok
    const listener = await ngrok.forward(ngrokOptions);

    const ngrokUrl = listener.url();

    // Actualiza .env.local
    updateEnvFile(ngrokUrl);

    // Muestra información
    showInfo(ngrokUrl);

    // Manejador de señales para cerrar limpiamente
    const cleanup = async () => {
      log('\n\n🛑 Deteniendo ngrok...', 'yellow');
      await listener.close();
      log('✅ ngrok detenido', 'green');
      log('\n⚠️  Recuerda actualizar .env.local si vuelves a usar localhost\n', 'yellow');
      process.exit(0);
    };

    process.on('SIGINT', cleanup);
    process.on('SIGTERM', cleanup);

    // Monitoreo básico (opcional)
    setInterval(() => {
      // Aquí podrías agregar lógica de monitoreo si lo deseas
      // Por ejemplo, verificar que ngrok siga activo
    }, 30000); // Cada 30 segundos

  } catch (error) {
    log('\n❌ ERROR al iniciar ngrok:', 'red');
    log(`   ${error.message}`, 'white');

    if (error.message.includes('authentication')) {
      log('\nPosibles causas:', 'yellow');
      log('  - El authtoken de ngrok es inválido', 'white');
      log('  - No has configurado el authtoken', 'white');
      log('\nConfigura el authtoken con:', 'yellow');
      log('  ngrok config add-authtoken TU_TOKEN', 'white');
      log('\nO define la variable de entorno:', 'yellow');
      log('  NGROK_AUTHTOKEN=tu_token node scripts/start-ngrok.js\n', 'white');
    } else if (error.message.includes('account limit')) {
      log('\nHas alcanzado el límite de tu cuenta de ngrok', 'yellow');
      log('Considera:', 'yellow');
      log('  - Cerrar túneles activos en https://dashboard.ngrok.com/', 'white');
      log('  - Actualizar a un plan de pago\n', 'white');
    } else if (error.message.includes('domain')) {
      log('\nError con el dominio estático:', 'yellow');
      log('  - Verifica que el dominio esté configurado correctamente', 'white');
      log('  - Los dominios estáticos requieren un plan de pago\n', 'white');
    }

    process.exit(1);
  }
}

// ============================================================================
// VERIFICACIÓN DE DEPENDENCIAS
// ============================================================================

try {
  require.resolve('@ngrok/ngrok');
} catch {
  log('❌ ERROR: @ngrok/ngrok no está instalado\n', 'red');
  log('Instala la dependencia con:', 'yellow');
  log('  npm install --save-dev @ngrok/ngrok\n', 'white');
  process.exit(1);
}

// Ejecuta el script
main().catch((error) => {
  log(`\n❌ Error inesperado: ${error.message}`, 'red');
  console.error(error);
  process.exit(1);
});
