#!/bin/bash

# =============================================================================
# Script de Instalación Automática - Plataforma de Aulas Virtuales
# =============================================================================
# Este script automatiza la instalación completa del proyecto
# Uso: bash setup.sh
# =============================================================================

# Colores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Funciones de utilidad
print_success() {
    echo -e "${GREEN}✅ $1${NC}"
}

print_error() {
    echo -e "${RED}❌ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

print_info() {
    echo -e "${BLUE}ℹ️  $1${NC}"
}

print_header() {
    echo ""
    echo -e "${BLUE}================================================${NC}"
    echo -e "${BLUE} $1${NC}"
    echo -e "${BLUE}================================================${NC}"
    echo ""
}

# Verificar si un comando existe
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# =============================================================================
# 1. VERIFICAR REQUISITOS
# =============================================================================

print_header "1/7 - Verificando Requisitos Previos"

# Verificar Node.js
if command_exists node; then
    NODE_VERSION=$(node --version)
    print_success "Node.js encontrado: $NODE_VERSION"

    # Verificar que sea versión 20+
    NODE_MAJOR=$(node -v | cut -d'.' -f1 | sed 's/v//')
    if [ "$NODE_MAJOR" -lt 20 ]; then
        print_warning "Se requiere Node.js 20 o superior. Tienes: $NODE_VERSION"
        print_info "Descarga Node.js 20+ desde: https://nodejs.org/"
        exit 1
    fi
else
    print_error "Node.js no está instalado"
    print_info "Descarga e instala Node.js 20+ desde: https://nodejs.org/"
    exit 1
fi

# Verificar npm
if command_exists npm; then
    NPM_VERSION=$(npm --version)
    print_success "npm encontrado: v$NPM_VERSION"
else
    print_error "npm no está instalado"
    exit 1
fi

# Verificar Git
if command_exists git; then
    GIT_VERSION=$(git --version)
    print_success "Git encontrado: $GIT_VERSION"
else
    print_error "Git no está instalado"
    print_info "Instala Git desde: https://git-scm.com/"
    exit 1
fi

# Verificar Docker
if command_exists docker; then
    DOCKER_VERSION=$(docker --version)
    print_success "Docker encontrado: $DOCKER_VERSION"
else
    print_error "Docker no está instalado"
    print_info "Instala Docker Desktop desde: https://www.docker.com/products/docker-desktop/"
    exit 1
fi

# Verificar Docker Compose
if command_exists docker; then
    if docker compose version >/dev/null 2>&1; then
        DOCKER_COMPOSE_VERSION=$(docker compose version)
        print_success "Docker Compose encontrado: $DOCKER_COMPOSE_VERSION"
    else
        print_error "Docker Compose no está instalado"
        exit 1
    fi
fi

# =============================================================================
# 2. INICIAR SERVICIOS DOCKER
# =============================================================================

print_header "2/7 - Iniciando Servicios Docker"

print_info "Iniciando PostgreSQL, Redis y MinIO..."

docker compose up -d

if [ $? -eq 0 ]; then
    print_success "Servicios Docker iniciados correctamente"

    # Esperar a que PostgreSQL esté listo
    print_info "Esperando a que PostgreSQL esté listo (puede tomar 10-15 segundos)..."
    sleep 15

    # Verificar que los contenedores estén corriendo
    if docker ps | grep -q "edu_postgres"; then
        print_success "PostgreSQL está corriendo"
    else
        print_error "PostgreSQL no se inició correctamente"
        print_info "Ejecuta: docker logs edu_postgres"
        exit 1
    fi
else
    print_error "Error al iniciar servicios Docker"
    print_info "Asegúrate de que Docker Desktop esté abierto"
    exit 1
fi

# =============================================================================
# 3. CONFIGURAR BACKEND
# =============================================================================

print_header "3/7 - Configurando Backend"

cd backend

# Crear .env si no existe
if [ ! -f .env ]; then
    print_info "Creando archivo .env..."

    if [ -f .env.example ]; then
        cp .env.example .env
        print_success "Archivo .env creado desde .env.example"
    else
        # Crear .env desde cero
        cat > .env << 'EOF'
NODE_ENV=development
PORT=5000
DATABASE_URL="postgresql://eduuser:edupass123@localhost:5432/edudb?schema=public"
REDIS_URL="redis://localhost:6379"
REDIS_ENABLED=false
JWT_SECRET=desarrollo_secret_no_usar_en_produccion_cambiar_antes_de_deploy
JWT_EXPIRES_IN=7d
FRONTEND_URL=http://localhost:5173
EOF
        print_success "Archivo .env creado"
    fi
else
    print_info "Archivo .env ya existe, no se modificará"
fi

# =============================================================================
# 4. INSTALAR DEPENDENCIAS BACKEND
# =============================================================================

print_header "4/7 - Instalando Dependencias del Backend"

print_info "Instalando paquetes npm... (esto puede tomar varios minutos)"

npm install

if [ $? -eq 0 ]; then
    print_success "Dependencias del backend instaladas correctamente"
else
    print_error "Error al instalar dependencias del backend"
    exit 1
fi

# =============================================================================
# 5. CONFIGURAR BASE DE DATOS
# =============================================================================

print_header "5/7 - Configurando Base de Datos"

# Ejecutar migraciones de Prisma
print_info "Ejecutando migraciones de Prisma..."

npx prisma migrate deploy

if [ $? -eq 0 ]; then
    print_success "Migraciones ejecutadas correctamente"
else
    print_warning "Migraciones fallaron, intentando con migrate dev..."
    npx prisma migrate dev --name init
fi

# Generar cliente de Prisma
print_info "Generando cliente de Prisma..."

npx prisma generate

if [ $? -eq 0 ]; then
    print_success "Cliente de Prisma generado correctamente"
else
    print_error "Error al generar cliente de Prisma"
    exit 1
fi

# Crear usuario admin (opcional)
print_info "¿Deseas crear un usuario administrador? (s/n)"
read -r CREATE_ADMIN

if [ "$CREATE_ADMIN" = "s" ] || [ "$CREATE_ADMIN" = "S" ]; then
    if [ -f "src/scripts/createAdmin.js" ]; then
        npm run create-admin
        print_success "Usuario admin creado"
    else
        print_warning "Script createAdmin.js no encontrado"
    fi
fi

cd ..

# =============================================================================
# 6. CONFIGURAR FRONTEND
# =============================================================================

print_header "6/7 - Configurando Frontend"

cd frontend

# Crear .env si no existe (opcional para frontend)
if [ ! -f .env ]; then
    print_info "Creando archivo .env para frontend..."
    cat > .env << 'EOF'
VITE_API_URL=http://localhost:5000
EOF
    print_success "Archivo .env del frontend creado"
fi

# =============================================================================
# 7. INSTALAR DEPENDENCIAS FRONTEND
# =============================================================================

print_header "7/7 - Instalando Dependencias del Frontend"

print_info "Instalando paquetes npm... (esto puede tomar varios minutos)"

npm install

if [ $? -eq 0 ]; then
    print_success "Dependencias del frontend instaladas correctamente"
else
    print_error "Error al instalar dependencias del frontend"
    exit 1
fi

cd ..

# =============================================================================
# FINALIZACIÓN
# =============================================================================

print_header "🎉 ¡Instalación Completada!"

echo ""
print_success "El proyecto está listo para ejecutarse"
echo ""
echo -e "${BLUE}================================================${NC}"
echo -e "${BLUE} PRÓXIMOS PASOS:${NC}"
echo -e "${BLUE}================================================${NC}"
echo ""
echo -e "${GREEN}1. Iniciar el backend:${NC}"
echo -e "   cd backend"
echo -e "   npm run dev"
echo ""
echo -e "${GREEN}2. En otra terminal, iniciar el frontend:${NC}"
echo -e "   cd frontend"
echo -e "   npm run dev"
echo ""
echo -e "${GREEN}3. Abrir en el navegador:${NC}"
echo -e "   http://localhost:5173"
echo ""
echo -e "${BLUE}================================================${NC}"
echo -e "${BLUE} SERVICIOS DISPONIBLES:${NC}"
echo -e "${BLUE}================================================${NC}"
echo ""
echo -e "${GREEN}• Frontend:${NC}      http://localhost:5173"
echo -e "${GREEN}• Backend API:${NC}   http://localhost:5000"
echo -e "${GREEN}• MinIO Console:${NC} http://localhost:9001"
echo -e "  ${YELLOW}Usuario:${NC} minioadmin"
echo -e "  ${YELLOW}Contraseña:${NC} minioadmin123"
echo ""
echo -e "${BLUE}================================================${NC}"
echo -e "${BLUE} COMANDOS ÚTILES:${NC}"
echo -e "${BLUE}================================================${NC}"
echo ""
echo -e "${GREEN}• Ver base de datos:${NC}"
echo -e "  cd backend && npx prisma studio"
echo ""
echo -e "${GREEN}• Ver logs de Docker:${NC}"
echo -e "  docker logs edu_postgres"
echo -e "  docker logs edu_redis"
echo ""
echo -e "${GREEN}• Detener servicios Docker:${NC}"
echo -e "  docker compose down"
echo ""
echo -e "${BLUE}================================================${NC}"
echo ""
print_success "¡Disfruta desarrollando! 🚀"
echo ""
