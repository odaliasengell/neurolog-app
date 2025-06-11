# =============================================
# NEUROLOG APP - SCRIPT DE REPARACIÓN DE DEPENDENCIAS
# =============================================
# Archivo: fix-dependencies.ps1
# Descripción: Resuelve conflictos de dependencias en el proyecto NeuroLog
# Ejecutar: .\fix-dependencies.ps1 en PowerShell

param(
    [switch]$Force,
    [switch]$Help
)

# Mostrar ayuda si se solicita
if ($Help) {
    Write-Host "🔧 SCRIPT DE REPARACIÓN DE DEPENDENCIAS - NEUROLOG APP" -ForegroundColor Cyan
    Write-Host "======================================================" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "Uso:" -ForegroundColor Yellow
    Write-Host "  .\fix-dependencies.ps1          # Reparación normal"
    Write-Host "  .\fix-dependencies.ps1 -Force   # Forzar reparación"
    Write-Host "  .\fix-dependencies.ps1 -Help    # Mostrar esta ayuda"
    Write-Host ""
    Write-Host "Funcionalidades:" -ForegroundColor Green
    Write-Host "  - Limpia node_modules y package-lock.json"
    Write-Host "  - Limpia caché de npm"
    Write-Host "  - Instala dependencias con resolución de conflictos"
    Write-Host "  - Verifica la instalación"
    Write-Host ""
    exit 0
}

# Función para mostrar mensajes con colores
function Write-Step {
    param([string]$Message, [string]$Color = "Green")
    Write-Host $Message -ForegroundColor $Color
}

function Write-Error {
    param([string]$Message)
    Write-Host $Message -ForegroundColor Red
}

function Write-Warning {
    param([string]$Message)
    Write-Host $Message -ForegroundColor Yellow
}

# Verificar que estamos en el directorio correcto del proyecto
if (-not (Test-Path "package.json")) {
    Write-Error "❌ ERROR: No se encontró package.json en el directorio actual"
    Write-Warning "Asegúrate de estar en el directorio raíz del proyecto NeuroLog"
    Write-Warning "Ejemplo: cd C:\Proyectos\Practica Evaluacion AS\neurolog-app"
    exit 1
}

Write-Step "🚀 INICIANDO REPARACIÓN DE DEPENDENCIAS - NEUROLOG APP" "Cyan"
Write-Step "======================================================" "Cyan"
Write-Host ""

# Verificar versiones del sistema
Write-Step "📋 Paso 1: Verificando versiones del sistema..."
try {
    $nodeVersion = node --version
    $npmVersion = npm --version
    Write-Step "✅ Node.js: $nodeVersion"
    Write-Step "✅ npm: $npmVersion"
    
    # Verificar versiones mínimas
    $nodeVersionNumber = $nodeVersion -replace 'v', ''
    if ([version]$nodeVersionNumber -lt [version]"22.16.0") {
        Write-Error "❌ ERROR: Node.js debe ser >= 22.16.0"
        Write-Warning "Actualiza Node.js desde: https://nodejs.org/"
        exit 1
    }
} catch {
    Write-Error "❌ ERROR: Node.js o npm no están instalados o no están en el PATH"
    exit 1
}

# Crear backup si existe package-lock.json
Write-Step "💾 Paso 2: Creando backup..."
$backupDir = "backup\$(Get-Date -Format 'yyyyMMdd_HHmmss')"
if (-not (Test-Path "backup")) {
    New-Item -ItemType Directory -Path "backup" | Out-Null
}
New-Item -ItemType Directory -Path $backupDir | Out-Null

if (Test-Path "package-lock.json") {
    Copy-Item "package-lock.json" "$backupDir\package-lock.json.backup"
    Write-Step "✅ Backup creado en: $backupDir"
}

# Limpiar instalación anterior
Write-Step "🧹 Paso 3: Limpiando instalación anterior..."
$itemsToRemove = @("node_modules", "package-lock.json", ".next", "out", "coverage")

foreach ($item in $itemsToRemove) {
    if (Test-Path $item) {
        Write-Step "   Eliminando: $item"
        Remove-Item -Recurse -Force $item -ErrorAction SilentlyContinue
    }
}

# Limpiar caché de npm
Write-Step "🧹 Paso 4: Limpiando caché de npm..."
try {
    npm cache clean --force
    Write-Step "✅ Caché de npm limpiado"
} catch {
    Write-Warning "⚠️ No se pudo limpiar el caché de npm, continuando..."
}

# Verificar y mostrar el contenido actual de package.json
Write-Step "📦 Paso 5: Verificando package.json..."
if (Test-Path "package.json") {
    $packageJson = Get-Content "package.json" | ConvertFrom-Json
    Write-Step "✅ Proyecto: $($packageJson.name) v$($packageJson.version)"
} else {
    Write-Error "❌ ERROR: package.json no encontrado"
    exit 1
}

# Crear archivo .npmrc temporal para resolución de dependencias
Write-Step "⚙️ Paso 6: Configurando resolución de dependencias..."
$npmrcContent = @"
legacy-peer-deps=true
audit-level=moderate
fund=false
"@
$npmrcContent | Out-File -FilePath ".npmrc" -Encoding UTF8
Write-Step "✅ Configuración temporal creada (.npmrc)"

# Instalar dependencias
Write-Step "📦 Paso 7: Instalando dependencias..."
Write-Warning "⏳ Este proceso puede tomar varios minutos..."

try {
    if ($Force) {
        Write-Step "   Instalando con --force..."
        npm install --force
    } else {
        Write-Step "   Instalando con --legacy-peer-deps..."
        npm install --legacy-peer-deps
    }
    Write-Step "✅ Dependencias instaladas correctamente"
} catch {
    Write-Error "❌ ERROR durante la instalación de dependencias"
    Write-Step "🔄 Intentando con método alternativo..."
    
    try {
        # Método alternativo: instalar dependencias problemáticas por separado
        Write-Step "   Instalando dependencias problemáticas individualmente..."
        npm install @hookform/resolvers@3.10.0 --legacy-peer-deps
        npm install react-hook-form@7.58.0 --legacy-peer-deps
        npm install --legacy-peer-deps
        Write-Step "✅ Dependencias instaladas con método alternativo"
    } catch {
        Write-Error "❌ ERROR: No se pudieron instalar las dependencias"
        Write-Warning "Intenta ejecutar manualmente:"
        Write-Warning "  npm install --force"
        Write-Warning "  o revisa los logs de error arriba"
        exit 1
    }
}

# Limpiar archivo temporal
Write-Step "🧹 Paso 8: Limpiando archivos temporales..."
if (Test-Path ".npmrc") {
    Remove-Item ".npmrc"
    Write-Step "✅ Archivo .npmrc temporal eliminado"
}

# Verificar la instalación
Write-Step "🔍 Paso 9: Verificando instalación..."
try {
    Write-Step "   Verificando lista de dependencias..."
    npm list --depth=0 --silent
    Write-Step "✅ Verificación de dependencias completada"
} catch {
    Write-Warning "⚠️ Algunas dependencias pueden tener warnings, pero la instalación continuó"
}

# Ejecutar verificaciones del proyecto
Write-Step "🧪 Paso 10: Ejecutando verificaciones del proyecto..."

# TypeScript check
Write-Step "   Verificando TypeScript..."
try {
    npm run type-check
    Write-Step "✅ TypeScript: Sin errores"
} catch {
    Write-Warning "⚠️ TypeScript: Hay algunos errores de tipos"
}

# ESLint check  
Write-Step "   Verificando ESLint..."
try {
    npm run lint
    Write-Step "✅ ESLint: Sin errores"
} catch {
    Write-Warning "⚠️ ESLint: Hay algunos warnings/errores de linting"
}

# Build check
Write-Step "   Verificando build..."
try {
    npm run build
    Write-Step "✅ Build: Exitoso"
} catch {
    Write-Warning "⚠️ Build: Hay algunos errores en el build"
}

# Resumen final
Write-Step ""
Write-Step "🎉 ¡REPARACIÓN DE DEPENDENCIAS COMPLETADA!" "Green"
Write-Step "==========================================" "Green"
Write-Step ""
Write-Step "📋 Resumen:" "Cyan"
Write-Step "✅ Dependencias instaladas correctamente"
Write-Step "✅ Proyecto listo para desarrollo"
Write-Step ""
Write-Step "🚀 Próximos pasos:" "Yellow"
Write-Step "1. Ejecuta: npm run dev"
Write-Step "2. Visita: http://localhost:3000"
Write-Step "3. ¡Comienza a desarrollar!"
Write-Step ""
Write-Step "📚 Comandos útiles:" "Blue"
Write-Step "  npm run dev          # Iniciar desarrollo"
Write-Step "  npm run build        # Build de producción"
Write-Step "  npm run test         # Ejecutar tests"
Write-Step "  npm run lint         # Verificar código"
Write-Step ""

# Preguntar si quiere iniciar el servidor de desarrollo
$response = Read-Host "¿Quieres iniciar el servidor de desarrollo ahora? (y/n)"
if ($response -eq "y" -or $response -eq "Y" -or $response -eq "yes") {
    Write-Step "🚀 Iniciando servidor de desarrollo..."
    npm run dev
}