# ============================================================================
# Script de PowerShell para iniciar ngrok y actualizar .env.local
# ============================================================================
#
# Este script:
# 1. Inicia ngrok en puerto 1234 (LM Studio)
# 2. Obtiene la URL pública generada por ngrok
# 3. Actualiza automáticamente .env.local con la nueva URL
# 4. Muestra información de configuración
#
# Uso:
#   .\scripts\start-ngrok.ps1
#
# Requisitos:
#   - ngrok instalado y configurado con authtoken
#   - LM Studio corriendo en puerto 1234
#   - PowerShell con permisos de ejecución habilitados
#
# Para habilitar la ejecución de scripts PowerShell (primera vez):
#   Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser
#
# ============================================================================

param(
    [switch]$Help,
    [int]$Port = 1234,
    [string]$Region = "us",
    [string]$AuthUser = "",
    [string]$AuthPassword = ""
)

# Función de ayuda
function Show-Help {
    Write-Host @"

🚀 Script de Inicio de ngrok para Rem-E

USO:
    .\scripts\start-ngrok.ps1 [opciones]

OPCIONES:
    -Port <número>           Puerto a exponer (default: 1234)
    -Region <código>         Región de ngrok (us, eu, ap, au, sa, jp, in)
    -AuthUser <usuario>      Usuario para autenticación básica (opcional)
    -AuthPassword <pass>     Contraseña para autenticación básica (opcional)
    -Help                    Muestra esta ayuda

EJEMPLOS:
    .\scripts\start-ngrok.ps1
    .\scripts\start-ngrok.ps1 -Port 1234 -Region eu
    .\scripts\start-ngrok.ps1 -AuthUser admin -AuthPassword miPassword123

"@ -ForegroundColor Cyan
    exit 0
}

if ($Help) {
    Show-Help
}

# Banner
Write-Host @"

╔═══════════════════════════════════════════════════════════════╗
║                                                               ║
║   🚀  REM-E - NGROK SETUP SCRIPT                             ║
║                                                               ║
║   Exponiendo LM Studio al mundo...                           ║
║                                                               ║
╚═══════════════════════════════════════════════════════════════╝

"@ -ForegroundColor Green

# Verifica que ngrok esté instalado
Write-Host "🔍 Verificando instalación de ngrok..." -ForegroundColor Yellow
$ngrokPath = Get-Command ngrok -ErrorAction SilentlyContinue

if (-not $ngrokPath) {
    Write-Host @"

❌ ERROR: ngrok no está instalado o no está en el PATH

Para instalar ngrok:
  1. Descarga desde: https://ngrok.com/download
  2. Extrae ngrok.exe a C:\ngrok\
  3. Agrega C:\ngrok\ al PATH del sistema

  O instala con Chocolatey:
     choco install ngrok

"@ -ForegroundColor Red
    exit 1
}

Write-Host "✅ ngrok encontrado: $($ngrokPath.Source)" -ForegroundColor Green

# Verifica que LM Studio esté corriendo
Write-Host "`n🔍 Verificando que LM Studio esté corriendo..." -ForegroundColor Yellow

try {
    $testConnection = Invoke-WebRequest -Uri "http://localhost:$Port/v1/models" -Method GET -TimeoutSec 5 -ErrorAction Stop
    Write-Host "✅ LM Studio está corriendo en puerto $Port" -ForegroundColor Green
} catch {
    Write-Host @"

⚠️  ADVERTENCIA: No se puede conectar a LM Studio en puerto $Port

Asegúrate de:
  1. LM Studio esté abierto
  2. El servidor local esté habilitado (Settings → Server)
  3. El puerto sea $Port (el default es 1234)

Presiona Enter para continuar de todos modos, o Ctrl+C para cancelar...
"@ -ForegroundColor Yellow
    Read-Host
}

# Construye el comando de ngrok
$ngrokArgs = @("http", $Port, "--region=$Region")

if ($AuthUser -and $AuthPassword) {
    $ngrokArgs += "--basic-auth=$AuthUser`:$AuthPassword"
    Write-Host "🔒 Autenticación básica habilitada" -ForegroundColor Cyan
}

# Inicia ngrok en segundo plano
Write-Host "`n🚀 Iniciando ngrok..." -ForegroundColor Green
Write-Host "   Puerto: $Port" -ForegroundColor Gray
Write-Host "   Región: $Region" -ForegroundColor Gray

$ngrokProcess = Start-Process -FilePath "ngrok" `
    -ArgumentList $ngrokArgs `
    -PassThru `
    -WindowStyle Hidden

if (-not $ngrokProcess) {
    Write-Host "❌ Error al iniciar ngrok" -ForegroundColor Red
    exit 1
}

# Espera a que ngrok esté listo
Write-Host "`n⏳ Esperando a que ngrok esté listo..." -ForegroundColor Yellow
Start-Sleep -Seconds 4

# Intenta obtener la URL pública de ngrok
$maxRetries = 5
$retryCount = 0
$ngrokUrl = $null

while ($retryCount -lt $maxRetries -and -not $ngrokUrl) {
    try {
        $tunnels = Invoke-RestMethod -Uri "http://localhost:4040/api/tunnels" -ErrorAction Stop

        # Busca el túnel HTTPS
        foreach ($tunnel in $tunnels.tunnels) {
            if ($tunnel.proto -eq "https") {
                $ngrokUrl = $tunnel.public_url
                break
            }
        }

        if (-not $ngrokUrl) {
            throw "No se encontró túnel HTTPS"
        }

    } catch {
        $retryCount++
        if ($retryCount -lt $maxRetries) {
            Write-Host "   Reintentando ($retryCount/$maxRetries)..." -ForegroundColor Gray
            Start-Sleep -Seconds 2
        }
    }
}

if (-not $ngrokUrl) {
    Write-Host @"

❌ ERROR: No se pudo obtener la URL pública de ngrok

Posibles causas:
  - ngrok no se inició correctamente
  - No hay conexión a internet
  - El authtoken de ngrok es inválido

Verifica:
  1. Que tengas una cuenta de ngrok
  2. Que hayas configurado el authtoken:
     ngrok config add-authtoken TU_TOKEN

"@ -ForegroundColor Red

    # Detiene el proceso de ngrok
    Stop-Process -Id $ngrokProcess.Id -Force -ErrorAction SilentlyContinue
    exit 1
}

# Éxito - muestra la URL
Write-Host @"

╔═══════════════════════════════════════════════════════════════╗
║                                                               ║
║   ✅  NGROK INICIADO EXITOSAMENTE                            ║
║                                                               ║
╚═══════════════════════════════════════════════════════════════╝

"@ -ForegroundColor Green

Write-Host "🌐 URL Pública: " -NoNewline -ForegroundColor Cyan
Write-Host $ngrokUrl -ForegroundColor White

# Actualiza .env.local
$envPath = ".env.local"

if (Test-Path $envPath) {
    Write-Host "`n📝 Actualizando .env.local..." -ForegroundColor Yellow

    try {
        $envContent = Get-Content $envPath -Raw

        # Reemplaza la URL de LM Studio
        if ($envContent -match "NEXT_PUBLIC_LM_STUDIO_URL=.*") {
            $envContent = $envContent -replace "NEXT_PUBLIC_LM_STUDIO_URL=.*", "NEXT_PUBLIC_LM_STUDIO_URL=$ngrokUrl"
        } else {
            # Si no existe, agrega la variable
            $envContent += "`nNEXT_PUBLIC_LM_STUDIO_URL=$ngrokUrl`n"
        }

        # Guarda el archivo
        Set-Content -Path $envPath -Value $envContent -NoNewline

        Write-Host "✅ .env.local actualizado correctamente" -ForegroundColor Green

    } catch {
        Write-Host "⚠️  Error al actualizar .env.local: $_" -ForegroundColor Yellow
        Write-Host "   Por favor actualiza manualmente:" -ForegroundColor Yellow
        Write-Host "   NEXT_PUBLIC_LM_STUDIO_URL=$ngrokUrl" -ForegroundColor White
    }

} else {
    Write-Host "`n⚠️  Archivo .env.local no encontrado" -ForegroundColor Yellow
    Write-Host "   Crea el archivo con:" -ForegroundColor Yellow
    Write-Host "   NEXT_PUBLIC_LM_STUDIO_URL=$ngrokUrl" -ForegroundColor White
}

# Información adicional
Write-Host @"

╔═══════════════════════════════════════════════════════════════╗
║                  INFORMACIÓN IMPORTANTE                       ║
╚═══════════════════════════════════════════════════════════════╝

📊 Panel de Control:
   http://localhost:4040

⚡ Próximos Pasos:
   1. Reinicia tu servidor de Next.js:
      npm run dev

   2. Prueba la conexión:
      http://localhost:3000/api/assistant

   3. ¡Ya puedes acceder desde cualquier lugar!

🔒 Seguridad:
"@ -ForegroundColor Cyan

if ($AuthUser) {
    Write-Host "   ✅ Autenticación básica HABILITADA" -ForegroundColor Green
    Write-Host "      Usuario: $AuthUser" -ForegroundColor Gray
} else {
    Write-Host "   ⚠️  Sin autenticación - Cualquiera con la URL puede acceder" -ForegroundColor Yellow
    Write-Host "      Considera usar autenticación para mayor seguridad" -ForegroundColor Gray
}

Write-Host @"

⚠️  ADVERTENCIAS:
   • Esta URL cambiará cada vez que reinicies ngrok (plan gratuito)
   • Hay límites de uso en el plan gratuito
   • Todo el tráfico pasa por servidores de ngrok
   • No compartas la URL públicamente

🛑 Para Detener:
   Presiona Ctrl+C o cierra esta ventana

"@ -ForegroundColor Yellow

# Mantiene el script corriendo y muestra logs
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`n" -ForegroundColor Gray
Write-Host "📡 ngrok está corriendo... (logs abajo)" -ForegroundColor Cyan
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`n" -ForegroundColor Gray

# Función de limpieza al salir
$cleanup = {
    Write-Host "`n`n🛑 Deteniendo ngrok..." -ForegroundColor Yellow
    Stop-Process -Id $ngrokProcess.Id -Force -ErrorAction SilentlyContinue
    Write-Host "✅ ngrok detenido" -ForegroundColor Green
    Write-Host "`n⚠️  Recuerda actualizar .env.local si vuelves a usar localhost`n" -ForegroundColor Yellow
}

# Registra el manejador de salida
Register-EngineEvent -SourceIdentifier PowerShell.Exiting -Action $cleanup | Out-Null

try {
    # Monitorea el estado de ngrok cada 10 segundos
    while ($true) {
        Start-Sleep -Seconds 10

        # Verifica que ngrok siga corriendo
        $processAlive = Get-Process -Id $ngrokProcess.Id -ErrorAction SilentlyContinue

        if (-not $processAlive) {
            Write-Host "`n❌ ngrok se detuvo inesperadamente" -ForegroundColor Red
            break
        }

        # Verifica la conectividad (opcional)
        try {
            $status = Invoke-RestMethod -Uri "http://localhost:4040/api/tunnels" -ErrorAction SilentlyContinue
            $connections = $status.tunnels[0].metrics.conns.count

            if ($connections -gt 0) {
                Write-Host "📊 Conexiones activas: $connections" -ForegroundColor Gray
            }
        } catch {
            # Ignora errores de status
        }
    }
} finally {
    & $cleanup
}
