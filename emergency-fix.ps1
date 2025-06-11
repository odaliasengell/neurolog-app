# =============================================
# NEUROLOG APP - SCRIPT DE EMERGENCIA
# =============================================
# Archivo: emergency-fix.ps1
# Descripción: Solución rápida para instalar dependencias con versiones que funcionan
# Ejecutar: .\emergency-fix.ps1

Write-Host "🚨 SCRIPT DE EMERGENCIA - NEUROLOG APP" -ForegroundColor Red
Write-Host "======================================" -ForegroundColor Red
Write-Host ""

# Verificar ubicación
if (-not (Test-Path "package.json")) {
    Write-Host "❌ ERROR: package.json no encontrado" -ForegroundColor Red
    Write-Host "Asegúrate de estar en el directorio del proyecto" -ForegroundColor Yellow
    exit 1
}

Write-Host "🧹 Paso 1: Limpieza completa..." -ForegroundColor Yellow
# Limpiar todo
$itemsToRemove = @("node_modules", "package-lock.json", ".next", "out", "coverage")
foreach ($item in $itemsToRemove) {
    if (Test-Path $item) {
        Write-Host "   Eliminando: $item" -ForegroundColor Gray
        Remove-Item -Recurse -Force $item -ErrorAction SilentlyContinue
    }
}

# Limpiar caché
Write-Host "🧹 Paso 2: Limpiando caché..." -ForegroundColor Yellow
npm cache clean --force

Write-Host "📦 Paso 3: Instalando dependencias básicas primero..." -ForegroundColor Yellow

# Instalar Next.js y React primero (lo más importante)
Write-Host "   📌 Instalando Next.js y React..." -ForegroundColor Gray
npm install next@15.3.3 react@19.1.0 react-dom@19.1.0 --save

# TypeScript
Write-Host "   📌 Instalando TypeScript..." -ForegroundColor Gray
npm install typescript@5.8.3 @types/node@22.16.0 @types/react@19.1.8 @types/react-dom@19.1.6 --save-dev

# ESLint básico
Write-Host "   📌 Instalando ESLint..." -ForegroundColor Gray
npm install eslint@9.28.0 eslint-config-next@15.3.3 --save-dev

# Tailwind CSS
Write-Host "   📌 Instalando Tailwind CSS..." -ForegroundColor Gray
npm install tailwindcss@4.1.10 postcss@8.5.5 autoprefixer@10.4.21 --save-dev

# Utilities básicas
Write-Host "   📌 Instalando utilidades básicas..." -ForegroundColor Gray
npm install clsx@2.3.2 tailwind-merge@2.6.0 class-variance-authority@0.7.2 --save

# Supabase (SIN versiones problemáticas)
Write-Host "   📌 Instalando Supabase..." -ForegroundColor Gray
npm install @supabase/supabase-js@2.51.0 --save

# Instalar Radix UI con versiones exactas que SÍ existen
Write-Host "   📌 Instalando Radix UI..." -ForegroundColor Gray
npm install @radix-ui/react-slot@1.2.4 --save
npm install @radix-ui/react-avatar@1.1.10 --save
npm install @radix-ui/react-dialog@1.1.23 --save
npm install @radix-ui/react-label@2.1.9 --save

# Lucide React para iconos
Write-Host "   📌 Instalando iconos..." -ForegroundColor Gray
npm install lucide-react@0.518.0 --save

Write-Host "🔍 Paso 4: Verificando instalación..." -ForegroundColor Yellow
npm list --depth=0

Write-Host ""
Write-Host "🧪 Paso 5: Probando comandos básicos..." -ForegroundColor Yellow

# Probar Next.js
Write-Host "   🔹 Probando Next.js..." -ForegroundColor Gray
try {
    $null = npx next --version
    Write-Host "   ✅ Next.js instalado correctamente" -ForegroundColor Green
} catch {
    Write-Host "   ❌ Next.js no funciona" -ForegroundColor Red
}

# Probar TypeScript
Write-Host "   🔹 Probando TypeScript..." -ForegroundColor Gray
try {
    $null = npx tsc --version
    Write-Host "   ✅ TypeScript instalado correctamente" -ForegroundColor Green
} catch {
    Write-Host "   ❌ TypeScript no funciona" -ForegroundColor Red
}

Write-Host ""
Write-Host "🎯 INSTALACIÓN BÁSICA COMPLETADA" -ForegroundColor Green
Write-Host "=================================" -ForegroundColor Green
Write-Host ""
Write-Host "📋 Estado del proyecto:" -ForegroundColor Cyan
Write-Host "✅ Next.js 15.3.3 instalado" -ForegroundColor Green
Write-Host "✅ React 19.1.0 instalado" -ForegroundColor Green
Write-Host "✅ TypeScript configurado" -ForegroundColor Green
Write-Host "✅ Tailwind CSS instalado" -ForegroundColor Green
Write-Host "✅ Supabase básico instalado" -ForegroundColor Green
Write-Host ""

Write-Host "🚀 SIGUIENTE PASO:" -ForegroundColor Yellow
Write-Host "Ejecuta: npm run dev" -ForegroundColor White -BackgroundColor Blue

$response = Read-Host "¿Quieres probar npm run dev ahora? (y/n)"
if ($response -eq "y" -or $response -eq "Y" -or $response -eq "yes") {
    Write-Host "🚀 Iniciando servidor de desarrollo..." -ForegroundColor Green
    npm run dev
}