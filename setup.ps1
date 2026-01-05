# =============================================================================
# Script de Instalación Automática - Plataforma de Aulas Virtuales (Windows)
# =============================================================================
# Este script automatiza la instalación completa del proyecto en Windows
# Uso: Abre PowerShell como Administrador y ejecuta: .\setup.ps1
# =============================================================================

# Configurar colores
function Write-Success { Write-Host "✅ $args" -ForegroundColor Green }
function Write-Error { Write-Host "❌ $args" -ForegroundColor Red }
function Write-Warning { Write-Host "⚠️  $args" -ForegroundColor Yellow }
function Write-Info { Write-Host "ℹ️  $args" -ForegroundColor Cyan }
function Write-Header {
    Write-Host ""
    Write-Host "================================================" -ForegroundColor Blue
    Write-Host " $args" -ForegroundColor Blue
    Write-Host "================================================" -ForegroundColor Blue
    Write-Host ""
}

# Función para verificar si un comando existe
function Test-CommandExists {
    param ($command)
    $null = Get-Command $command -ErrorAction SilentlyContinue
    return $?
}

# =============================================================================
# 1. VERIFICAR REQUISITOS
# =============================================================================

Write-Header "1/7 - Verificando Requisitos Previos"

# Verificar Node.js
if (Test-CommandExists node) {
    $nodeVersion = node --version
    Write-Success "Node.js encontrado: $nodeVersion"

    # Verificar versión
    $nodeMajor = ($nodeVersion -replace 'v', '') -split '\.' | Select-Object -First 1
    if ([int]$nodeMajor -lt 20) {
        Write-Warning "Se requiere Node.js 20 o superior. Tienes: $nodeVersion"
        Write-Info "Descarga Node.js 20+ desde: https://nodejs.org/"
        exit 1
    }
} else {
    Write-Error "Node.js no está instalado"
    Write-Info "Descarga e instala Node.js 20+ desde: https://nodejs.org/"
    exit 1
}

# Verificar npm
if (Test-CommandExists npm) {
    $npmVersion = npm --version
    Write-Success "npm encontrado: v$npmVersion"
} else {
    Write-Error "npm no está instalado"
    exit 1
}

# Verificar Git
if (Test-CommandExists git) {
    $gitVersion = git --version
    Write-Success "Git encontrado: $gitVersion"
} else {
    Write-Error "Git no está instalado"
    Write-Info "Instala Git desde: https://git-scm.com/"
    exit 1
}

# Verificar Docker
if (Test-CommandExists docker) {
    $dockerVersion = docker --version
    Write-Success "Docker encontrado: $dockerVersion"
} else {
    Write-Error "Docker no está instalado"
    Write-Info "Instala Docker Desktop desde: https://www.docker.com/products/docker-desktop/"
    exit 1
}

# Verificar Docker Compose
try {
    $dockerComposeVersion = docker compose version 2>$null
    Write-Success "Docker Compose encontrado: $dockerComposeVersion"
} catch {
    Write-Error "Docker Compose no está instalado"
    exit 1
}

# =============================================================================
# 2. INICIAR SERVICIOS DOCKER
# =============================================================================

Write-Header "2/7 - Iniciando Servicios Docker"

Write-Info "Iniciando PostgreSQL, Redis y MinIO..."

docker compose up -d

if ($LASTEXITCODE -eq 0) {
    Write-Success "Servicios Docker iniciados correctamente"

    Write-Info "Esperando a que PostgreSQL esté listo (puede tomar 10-15 segundos)..."
    Start-Sleep -Seconds 15

    # Verificar que PostgreSQL esté corriendo
    $containers = docker ps
    if ($containers -match "edu_postgres") {
        Write-Success "PostgreSQL está corriendo"
    } else {
        Write-Error "PostgreSQL no se inició correctamente"
        Write-Info "Ejecuta: docker logs edu_postgres"
        exit 1
    }
} else {
    Write-Error "Error al iniciar servicios Docker"
    Write-Info "Asegúrate de que Docker Desktop esté abierto"
    exit 1
}

# =============================================================================
# 3. CONFIGURAR BACKEND
# =============================================================================

Write-Header "3/7 - Configurando Backend"

Set-Location backend

# Crear .env si no existe
if (-not (Test-Path .env)) {
    Write-Info "Creando archivo .env..."

    if (Test-Path .env.example) {
        Copy-Item .env.example .env
        Write-Success "Archivo .env creado desde .env.example"
    } else {
        # Crear .env desde cero
        @"
NODE_ENV=development
PORT=5000
DATABASE_URL="postgresql://eduuser:edupass123@localhost:5432/edudb?schema=public"
REDIS_URL="redis://localhost:6379"
REDIS_ENABLED=false
JWT_SECRET=desarrollo_secret_no_usar_en_produccion_cambiar_antes_de_deploy
JWT_EXPIRES_IN=7d
FRONTEND_URL=http://localhost:5173
"@ | Out-File -FilePath .env -Encoding utf8
        Write-Success "Archivo .env creado"
    }
} else {
    Write-Info "Archivo .env ya existe, no se modificará"
}

# =============================================================================
# 4. INSTALAR DEPENDENCIAS BACKEND
# =============================================================================

Write-Header "4/7 - Instalando Dependencias del Backend"

Write-Info "Instalando paquetes npm... (esto puede tomar varios minutos)"

npm install

if ($LASTEXITCODE -eq 0) {
    Write-Success "Dependencias del backend instaladas correctamente"
} else {
    Write-Error "Error al instalar dependencias del backend"
    exit 1
}

# =============================================================================
# 5. CONFIGURAR BASE DE DATOS
# =============================================================================

Write-Header "5/7 - Configurando Base de Datos"

# Ejecutar migraciones de Prisma
Write-Info "Ejecutando migraciones de Prisma..."

npx prisma migrate deploy

if ($LASTEXITCODE -ne 0) {
    Write-Warning "Migraciones fallaron, intentando con migrate dev..."
    npx prisma migrate dev --name init
}

if ($LASTEXITCODE -eq 0) {
    Write-Success "Migraciones ejecutadas correctamente"
}

# Generar cliente de Prisma
Write-Info "Generando cliente de Prisma..."

npx prisma generate

if ($LASTEXITCODE -eq 0) {
    Write-Success "Cliente de Prisma generado correctamente"
} else {
    Write-Error "Error al generar cliente de Prisma"
    exit 1
}

# Crear usuario admin (opcional)
Write-Info "¿Deseas crear un usuario administrador? (s/n)"
$createAdmin = Read-Host

if ($createAdmin -eq "s" -or $createAdmin -eq "S") {
    if (Test-Path "src/scripts/createAdmin.js") {
        npm run create-admin
        Write-Success "Usuario admin creado"
    } else {
        Write-Warning "Script createAdmin.js no encontrado"
    }
}

Set-Location ..

# =============================================================================
# 6. CONFIGURAR FRONTEND
# =============================================================================

Write-Header "6/7 - Configurando Frontend"

Set-Location frontend

# Crear .env si no existe
if (-not (Test-Path .env)) {
    Write-Info "Creando archivo .env para frontend..."
    @"
VITE_API_URL=http://localhost:5000
"@ | Out-File -FilePath .env -Encoding utf8
    Write-Success "Archivo .env del frontend creado"
}

# =============================================================================
# 7. INSTALAR DEPENDENCIAS FRONTEND
# =============================================================================

Write-Header "7/7 - Instalando Dependencias del Frontend"

Write-Info "Instalando paquetes npm... (esto puede tomar varios minutos)"

npm install

if ($LASTEXITCODE -eq 0) {
    Write-Success "Dependencias del frontend instaladas correctamente"
} else {
    Write-Error "Error al instalar dependencias del frontend"
    exit 1
}

Set-Location ..

# =============================================================================
# FINALIZACIÓN
# =============================================================================

Write-Header "🎉 ¡Instalación Completada!"

Write-Host ""
Write-Success "El proyecto está listo para ejecutarse"
Write-Host ""
Write-Host "================================================" -ForegroundColor Blue
Write-Host " PRÓXIMOS PASOS:" -ForegroundColor Blue
Write-Host "================================================" -ForegroundColor Blue
Write-Host ""
Write-Host "1. Iniciar el backend:" -ForegroundColor Green
Write-Host "   cd backend"
Write-Host "   npm run dev"
Write-Host ""
Write-Host "2. En otra terminal, iniciar el frontend:" -ForegroundColor Green
Write-Host "   cd frontend"
Write-Host "   npm run dev"
Write-Host ""
Write-Host "3. Abrir en el navegador:" -ForegroundColor Green
Write-Host "   http://localhost:5173"
Write-Host ""
Write-Host "================================================" -ForegroundColor Blue
Write-Host " SERVICIOS DISPONIBLES:" -ForegroundColor Blue
Write-Host "================================================" -ForegroundColor Blue
Write-Host ""
Write-Host "• Frontend:      " -NoNewline -ForegroundColor Green
Write-Host "http://localhost:5173"
Write-Host "• Backend API:   " -NoNewline -ForegroundColor Green
Write-Host "http://localhost:5000"
Write-Host "• MinIO Console: " -NoNewline -ForegroundColor Green
Write-Host "http://localhost:9001"
Write-Host "  Usuario: minioadmin" -ForegroundColor Yellow
Write-Host "  Contraseña: minioadmin123" -ForegroundColor Yellow
Write-Host ""
Write-Host "================================================" -ForegroundColor Blue
Write-Host " COMANDOS ÚTILES:" -ForegroundColor Blue
Write-Host "================================================" -ForegroundColor Blue
Write-Host ""
Write-Host "• Ver base de datos:" -ForegroundColor Green
Write-Host "  cd backend"
Write-Host "  npx prisma studio"
Write-Host ""
Write-Host "• Ver logs de Docker:" -ForegroundColor Green
Write-Host "  docker logs edu_postgres"
Write-Host "  docker logs edu_redis"
Write-Host ""
Write-Host "• Detener servicios Docker:" -ForegroundColor Green
Write-Host "  docker compose down"
Write-Host ""
Write-Host "================================================" -ForegroundColor Blue
Write-Host ""
Write-Success "¡Disfruta desarrollando! 🚀"
Write-Host ""
