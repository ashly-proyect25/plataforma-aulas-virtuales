# 🛠️ Instalación de Requisitos y Dependencias

Esta guía te ayudará a instalar **TODAS** las tecnologías necesarias para ejecutar el proyecto en tu computadora.

---

## 📋 Checklist de Tecnologías Necesarias

- [ ] Node.js 20+
- [ ] Git
- [ ] Docker Desktop
- [ ] Editor de Código (VS Code recomendado)

---

## 1️⃣ Instalación de Node.js

Node.js es **OBLIGATORIO** para ejecutar el backend y frontend.

### Windows:

**Opción A - Descarga Directa (Recomendado):**
1. Ve a: https://nodejs.org/
2. Descarga la versión **LTS** (20.x o superior)
3. Ejecuta el instalador
4. Sigue los pasos (deja todo por defecto)
5. Reinicia la computadora

**Opción B - Usando Chocolatey:**
```powershell
# Abre PowerShell como Administrador
choco install nodejs-lts
```

**Verifica la instalación:**
```bash
node --version
# Debe mostrar: v20.x.x o superior

npm --version
# Debe mostrar: 10.x.x o superior
```

---

### macOS:

**Opción A - Descarga Directa:**
1. Ve a: https://nodejs.org/
2. Descarga la versión **LTS** (20.x o superior)
3. Abre el archivo `.pkg` descargado
4. Sigue los pasos de instalación

**Opción B - Usando Homebrew (Recomendado):**
```bash
# Si no tienes Homebrew, instálalo primero:
/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"

# Luego instala Node.js
brew install node@20
```

**Verifica la instalación:**
```bash
node --version
npm --version
```

---

### Linux (Ubuntu/Debian):

**Usando NodeSource (Recomendado):**
```bash
# Descargar e instalar NodeSource
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -

# Instalar Node.js
sudo apt-get install -y nodejs

# Verificar instalación
node --version
npm --version
```

**Alternativa - Usando nvm (Node Version Manager):**
```bash
# Instalar nvm
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.0/install.sh | bash

# Recargar terminal
source ~/.bashrc

# Instalar Node.js 20
nvm install 20
nvm use 20
nvm alias default 20
```

---

## 2️⃣ Instalación de Git

Git es necesario para clonar el repositorio.

### Windows:

**Descarga Directa:**
1. Ve a: https://git-scm.com/download/win
2. Descarga el instalador
3. Ejecuta y sigue los pasos (deja todo por defecto)

**Usando Chocolatey:**
```powershell
choco install git
```

**Verifica la instalación:**
```bash
git --version
```

---

### macOS:

Git normalmente viene instalado con Xcode Command Line Tools:

```bash
# Instalar Xcode Command Line Tools
xcode-select --install
```

**O usando Homebrew:**
```bash
brew install git
```

**Verifica la instalación:**
```bash
git --version
```

---

### Linux (Ubuntu/Debian):

```bash
sudo apt-get update
sudo apt-get install git -y

# Verificar
git --version
```

---

## 3️⃣ Instalación de Docker Desktop

Docker es **OBLIGATORIO** para la base de datos PostgreSQL y otros servicios.

### Windows:

**Requisitos Previos:**
- Windows 10/11 64-bit
- WSL 2 habilitado

**Habilitar WSL 2:**
```powershell
# Abre PowerShell como Administrador y ejecuta:
wsl --install
```

Reinicia la computadora.

**Instalar Docker Desktop:**
1. Ve a: https://www.docker.com/products/docker-desktop/
2. Descarga **Docker Desktop for Windows**
3. Ejecuta el instalador
4. Marca la opción "Use WSL 2 instead of Hyper-V"
5. Completa la instalación
6. Reinicia la computadora
7. Abre Docker Desktop y espera a que inicie

**Verifica la instalación:**
```bash
docker --version
docker compose version
```

---

### macOS:

**Requisitos:**
- macOS 11 o superior

**Instalación:**
1. Ve a: https://www.docker.com/products/docker-desktop/
2. Descarga **Docker Desktop for Mac**
   - Si tienes Mac con chip M1/M2/M3: descarga "Apple Silicon"
   - Si tienes Mac Intel: descarga "Intel Chip"
3. Abre el archivo `.dmg`
4. Arrastra Docker a Applications
5. Abre Docker desde Applications
6. Acepta los permisos necesarios

**Verifica la instalación:**
```bash
docker --version
docker compose version
```

---

### Linux (Ubuntu/Debian):

```bash
# Actualizar sistema
sudo apt-get update

# Instalar dependencias
sudo apt-get install -y \
    ca-certificates \
    curl \
    gnupg \
    lsb-release

# Agregar clave GPG de Docker
sudo mkdir -p /etc/apt/keyrings
curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo gpg --dearmor -o /etc/apt/keyrings/docker.gpg

# Agregar repositorio de Docker
echo \
  "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/ubuntu \
  $(lsb_release -cs) stable" | sudo tee /etc/apt/sources.list.d/docker.list > /dev/null

# Actualizar e instalar Docker
sudo apt-get update
sudo apt-get install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin

# Agregar tu usuario al grupo docker (para no usar sudo)
sudo usermod -aG docker $USER

# Reiniciar sesión o ejecutar:
newgrp docker

# Verificar instalación
docker --version
docker compose version
```

**Iniciar Docker:**
```bash
sudo systemctl start docker
sudo systemctl enable docker
```

---

## 4️⃣ Editor de Código (Opcional pero Recomendado)

### Visual Studio Code:

**Windows / macOS / Linux:**
1. Ve a: https://code.visualstudio.com/
2. Descarga para tu sistema operativo
3. Instala siguiendo los pasos

**Extensiones Recomendadas para VS Code:**
- **ES7+ React/Redux/React-Native snippets** - Snippets para React
- **Prisma** - Syntax highlighting para Prisma
- **Tailwind CSS IntelliSense** - Autocompletado de Tailwind
- **ESLint** - Linter para JavaScript
- **Prettier** - Formateo de código
- **Docker** - Gestión de Docker
- **GitLens** - Mejor integración con Git

Para instalar extensiones:
1. Abre VS Code
2. Ve a la pestaña de Extensiones (Ctrl/Cmd + Shift + X)
3. Busca cada extensión e instala

---

## ✅ Verificación Final

Después de instalar todo, ejecuta estos comandos para verificar:

```bash
# Node.js
node --version
# ✅ Debe mostrar: v20.x.x o superior

npm --version
# ✅ Debe mostrar: 10.x.x o superior

# Git
git --version
# ✅ Debe mostrar: git version 2.x.x

# Docker
docker --version
# ✅ Debe mostrar: Docker version 20.x.x o superior

docker compose version
# ✅ Debe mostrar: Docker Compose version v2.x.x

# Docker debe estar corriendo
docker ps
# ✅ Debe mostrar una tabla vacía (sin errores)
```

---

## 🔧 Configuración Adicional

### Configurar Git (Primera vez):

```bash
# Configurar tu nombre
git config --global user.name "Tu Nombre"

# Configurar tu email
git config --global user.email "tuemail@ejemplo.com"

# Verificar configuración
git config --list
```

---

### Aumentar Memoria de Docker (Si tienes problemas de rendimiento):

**Windows/Mac - Docker Desktop:**
1. Abre Docker Desktop
2. Ve a Settings > Resources
3. Aumenta Memory a 4GB o más
4. Click en "Apply & Restart"

**Linux:**
Docker usa la memoria del sistema directamente, no necesita configuración.

---

## 📦 Instalación de Dependencias del Proyecto

Una vez que tengas todas las tecnologías instaladas, instala las dependencias del proyecto:

### Backend:
```bash
cd backend
npm install
```

**Esto instalará:**
- Express (servidor web)
- Prisma (ORM para base de datos)
- Socket.IO (comunicación en tiempo real)
- bcrypt (encriptación de contraseñas)
- jsonwebtoken (autenticación JWT)
- Y otras dependencias...

### Frontend:
```bash
cd frontend
npm install
```

**Esto instalará:**
- React (librería UI)
- Vite (build tool)
- Tailwind CSS (estilos)
- Zustand (manejo de estado)
- Axios (cliente HTTP)
- Socket.IO Client
- React Router Dom
- Y otras dependencias...

---

## ⚠️ Problemas Comunes y Soluciones

### Error: "npm: command not found"
**Solución:** Node.js no está instalado o no está en el PATH.
- Reinstala Node.js
- Reinicia la terminal
- En Windows, reinicia la computadora

---

### Error: "docker: command not found"
**Solución:** Docker no está instalado o no está en el PATH.
- Verifica que Docker Desktop esté abierto (Windows/Mac)
- En Linux, verifica que el servicio esté corriendo: `sudo systemctl start docker`

---

### Error: "permission denied" en Docker (Linux)
**Solución:** Tu usuario no está en el grupo docker.
```bash
sudo usermod -aG docker $USER
newgrp docker
```

---

### Error al instalar dependencias: "gyp ERR!"
**Solución:** Faltan herramientas de compilación.

**Windows:**
```bash
npm install --global windows-build-tools
```

**macOS:**
```bash
xcode-select --install
```

**Linux:**
```bash
sudo apt-get install build-essential
```

---

## 📊 Requisitos Mínimos de Hardware

### Recomendado:
- **CPU:** 4 cores (Intel i5 / AMD Ryzen 5 o superior)
- **RAM:** 8 GB (mínimo 4 GB)
- **Disco:** 10 GB libres (SSD recomendado)
- **Internet:** Conexión estable para WebRTC

### Mínimo:
- **CPU:** 2 cores
- **RAM:** 4 GB
- **Disco:** 5 GB libres

---

## 🌐 Puertos Necesarios

Asegúrate de que estos puertos estén libres:

- **5173** - Frontend (Vite)
- **5000** - Backend (Express)
- **5432** - PostgreSQL
- **6379** - Redis
- **9000** - MinIO API
- **9001** - MinIO Console

**Verificar si un puerto está en uso:**

Windows:
```powershell
netstat -ano | findstr :5173
```

Mac/Linux:
```bash
lsof -i :5173
```

---

## 🎯 Siguiente Paso

Una vez que tengas todas las tecnologías instaladas, continúa con:
👉 **[INSTALACION.md](./INSTALACION.md)** - Guía de instalación del proyecto

---

## 🆘 ¿Necesitas Ayuda?

Si tienes problemas instalando alguna tecnología:

1. Verifica que tu sistema operativo esté actualizado
2. Revisa los requisitos de hardware
3. Consulta la documentación oficial de cada herramienta
4. Reinicia la computadora después de instalar

---

## 📝 Resumen Rápido

Para instalar todo de una vez (copiar y pegar):

### Windows (PowerShell como Admin):
```powershell
# Instalar Chocolatey
Set-ExecutionPolicy Bypass -Scope Process -Force; [System.Net.ServicePointManager]::SecurityProtocol = [System.Net.ServicePointManager]::SecurityProtocol -bor 3072; iex ((New-Object System.Net.WebClient).DownloadString('https://community.chocolatey.org/install.ps1'))

# Instalar todo
choco install nodejs-lts git docker-desktop vscode -y
```

### macOS (Terminal):
```bash
# Instalar Homebrew
/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"

# Instalar todo
brew install node@20 git
brew install --cask docker visual-studio-code
```

### Linux (Ubuntu/Debian):
```bash
# Actualizar sistema
sudo apt-get update && sudo apt-get upgrade -y

# Instalar Node.js 20
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs

# Instalar Git
sudo apt-get install -y git

# Instalar Docker (ver sección completa arriba)

# Instalar VS Code
sudo snap install code --classic
```

¡Listo! Ahora estás preparado para instalar el proyecto. 🚀
