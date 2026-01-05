# 📦 Guía de Instalación - Plataforma de Aulas Virtuales

Esta guía te ayudará a instalar y ejecutar el proyecto localmente en cualquier computadora.

---

## 📋 Requisitos Previos

Antes de comenzar, asegúrate de tener instalado:

### Obligatorios:
1. **Node.js 20+** - [Descargar aquí](https://nodejs.org/)
   - Verifica: `node --version` (debe ser v20 o superior)
   - Verifica: `npm --version`

2. **Git** - [Descargar aquí](https://git-scm.com/)
   - Verifica: `git --version`

3. **Docker Desktop** - [Descargar aquí](https://www.docker.com/products/docker-desktop/)
   - Verifica: `docker --version`
   - Verifica: `docker compose version`

### Opcional pero Recomendado:
- **VS Code** o tu editor de código favorito
- **Postman** o Thunder Client para probar APIs

---

## 🚀 Instalación Paso a Paso

### 1️⃣ Clonar el Repositorio

```bash
git clone https://github.com/ashly-proyect25/plataforma-aulas-virtuales.git
cd plataforma-aulas-virtuales
```

---

### 2️⃣ Iniciar Servicios Docker (PostgreSQL, Redis, MinIO)

Esto iniciará la base de datos, caché y almacenamiento:

```bash
docker compose up -d
```

**Verifica que los contenedores estén corriendo:**
```bash
docker ps
```

Deberías ver 3 contenedores:
- `edu_postgres` (Puerto 5432)
- `edu_redis` (Puerto 6379)
- `edu_minio` (Puertos 9000, 9001)

**Si Docker da error:**
- Asegúrate de que Docker Desktop esté abierto
- En Windows, asegúrate de tener WSL2 habilitado

---

### 3️⃣ Configurar Backend

#### a) Navegar a la carpeta backend
```bash
cd backend
```

#### b) Crear archivo .env
```bash
cp .env.example .env
```

Si no existe `.env.example`, crea `.env` manualmente con este contenido:

```env
# Backend
NODE_ENV=development
PORT=5000

# Database
DATABASE_URL="postgresql://eduuser:edupass123@localhost:5432/edudb?schema=public"

# Redis (Opcional - la app funciona sin Redis)
REDIS_URL="redis://localhost:6379"
REDIS_ENABLED=false

# JWT
JWT_SECRET=tu_secreto_super_seguro_cambialo_en_produccion
JWT_EXPIRES_IN=7d

# Frontend URL (para CORS)
FRONTEND_URL=http://localhost:5173
```

#### c) Instalar dependencias
```bash
npm install
```

#### d) Ejecutar migraciones de Prisma
```bash
npx prisma migrate dev --name init
```

Si te pregunta si quieres resetear la base de datos, responde **"y"** (yes).

#### e) Generar cliente de Prisma
```bash
npx prisma generate
```

#### f) (OPCIONAL) Crear usuario admin
```bash
npm run create-admin
```

Esto creará un usuario administrador con credenciales por defecto.

#### g) Iniciar servidor backend
```bash
npm run dev
```

✅ **El backend debería estar corriendo en:** `http://localhost:5000`

**Deja esta terminal abierta.**

---

### 4️⃣ Configurar Frontend

Abre una **nueva terminal** y navega a la carpeta frontend:

```bash
cd frontend
```

#### a) Instalar dependencias
```bash
npm install
```

#### b) Crear archivo .env (OPCIONAL)

Si el backend está en una URL diferente, crea `.env`:

```env
VITE_API_URL=http://localhost:5000
```

Si no creas este archivo, usará la URL por defecto.

#### c) Iniciar servidor frontend
```bash
npm run dev
```

✅ **El frontend debería estar corriendo en:** `http://localhost:5173`

---

## 🌐 Acceder a la Aplicación

1. **Frontend:** http://localhost:5173
2. **Backend API:** http://localhost:5000
3. **MinIO Console:** http://localhost:9001
   - Usuario: `minioadmin`
   - Contraseña: `minioadmin123`

---

## 👥 Usuarios de Prueba

Si ejecutaste el script `create-admin`, tendrás estos usuarios:

### Administrador:
- **Usuario:** `admin`
- **Contraseña:** `admin123`

### Crear Docentes y Alumnos:
1. Ingresa como admin
2. Ve a "Gestión de Usuarios"
3. Crea docentes y alumnos manualmente

**O usa Prisma Studio:**
```bash
cd backend
npx prisma studio
```

Esto abre una interfaz web en `http://localhost:5555` donde puedes ver y editar la base de datos.

---

## 🛑 Detener el Proyecto

### Detener Frontend y Backend:
Presiona `Ctrl + C` en cada terminal.

### Detener Docker:
```bash
docker compose down
```

### Detener Docker y ELIMINAR datos:
```bash
docker compose down -v
```
⚠️ **Esto eliminará TODOS los datos de la base de datos.**

---

## 🔧 Problemas Comunes

### ❌ Error: "Port 5432 already in use"
**Solución:** Ya tienes PostgreSQL corriendo localmente.

Opción 1: Detén PostgreSQL local:
```bash
# En Linux/Mac
sudo systemctl stop postgresql

# En Windows
net stop postgresql-x64-14
```

Opción 2: Cambia el puerto en `docker-compose.yml`:
```yaml
ports:
  - "5433:5432"  # Cambia 5432 a 5433
```

Y actualiza el `.env` del backend:
```env
DATABASE_URL="postgresql://eduuser:edupass123@localhost:5433/edudb?schema=public"
```

---

### ❌ Error: "Module not found"
**Solución:** No se instalaron las dependencias correctamente.

```bash
# Borra node_modules y reinstala
rm -rf node_modules package-lock.json
npm install
```

---

### ❌ Error: "Prisma schema not found"
**Solución:** Estás en la carpeta incorrecta.

```bash
# Asegúrate de estar en la carpeta backend
cd backend
npx prisma generate
```

---

### ❌ Error: "Cannot connect to database"
**Solución:** Docker no está corriendo o la base de datos no inició.

```bash
# Verifica que Docker esté corriendo
docker ps

# Si no hay contenedores, inicia Docker
docker compose up -d

# Verifica los logs de PostgreSQL
docker logs edu_postgres
```

---

### ❌ Error: "CORS policy blocking"
**Solución:** El frontend está intentando conectar al backend en una URL incorrecta.

Verifica que en `backend/.env` tengas:
```env
FRONTEND_URL=http://localhost:5173
```

---

## 📚 Comandos Útiles

### Backend:
```bash
# Ver schema de la base de datos
npx prisma studio

# Resetear base de datos
npx prisma migrate reset

# Ver logs del backend
# (Si usas npm run dev, los logs aparecen en la terminal)

# Crear nueva migración
npx prisma migrate dev --name nombre_de_migracion
```

### Frontend:
```bash
# Limpiar caché y reinstalar
rm -rf node_modules .vite package-lock.json
npm install

# Build para producción
npm run build

# Preview del build
npm run preview
```

### Docker:
```bash
# Ver contenedores corriendo
docker ps

# Ver logs de un contenedor
docker logs edu_postgres
docker logs edu_redis
docker logs edu_minio

# Reiniciar un contenedor
docker restart edu_postgres

# Ejecutar comando en contenedor
docker exec -it edu_postgres psql -U eduuser -d edudb
```

---

## 📦 Estructura del Proyecto

```
plataforma-aulas-virtuales/
├── backend/
│   ├── src/
│   │   ├── config/          # Configuración (DB, Redis, etc.)
│   │   ├── controllers/     # Lógica de negocio
│   │   ├── middlewares/     # Auth, validaciones
│   │   ├── routes/          # Rutas de API
│   │   ├── services/        # Servicios (Socket.IO)
│   │   └── index.js         # Punto de entrada
│   ├── prisma/
│   │   └── schema.prisma    # Modelo de datos
│   ├── .env                 # Variables de entorno
│   └── package.json
│
├── frontend/
│   ├── src/
│   │   ├── components/      # Componentes React
│   │   ├── pages/           # Páginas
│   │   ├── services/        # API calls
│   │   ├── store/           # Zustand store
│   │   └── App.jsx          # Componente principal
│   ├── .env                 # Variables de entorno (opcional)
│   └── package.json
│
├── docker-compose.yml       # Servicios Docker
└── README.md                # Documentación
```

---

## 🚀 Próximos Pasos

Una vez que el proyecto esté corriendo:

1. ✅ Crea usuarios de prueba (admin, docente, alumno)
2. ✅ Crea un curso de prueba
3. ✅ Asigna estudiantes al curso
4. ✅ Inicia una clase en vivo
5. ✅ Prueba las funcionalidades: video, chat, pizarra, compartir pantalla

---

## 🆘 Necesitas Ayuda?

Si tienes problemas que no están en esta guía:

1. Revisa los logs del backend y frontend
2. Verifica que Docker esté corriendo
3. Asegúrate de tener las versiones correctas de Node.js
4. Revisa el archivo `.env` del backend

---

## 📝 Notas Importantes

- ⚠️ **Redis es opcional:** La app funciona sin Redis (solo es para caché)
- ⚠️ **MinIO es opcional:** La app funciona sin MinIO (solo para grabaciones)
- ✅ **PostgreSQL es OBLIGATORIO:** La app NO funciona sin la base de datos
- ✅ Usa navegadores modernos (Chrome, Firefox, Edge) para mejor compatibilidad con WebRTC

---

## 🎯 Checklist de Instalación

- [ ] Node.js 20+ instalado
- [ ] Docker Desktop instalado y corriendo
- [ ] Repositorio clonado
- [ ] `docker compose up -d` ejecutado
- [ ] Backend: `.env` configurado
- [ ] Backend: `npm install` ejecutado
- [ ] Backend: migraciones de Prisma ejecutadas
- [ ] Backend: `npm run dev` corriendo
- [ ] Frontend: `npm install` ejecutado
- [ ] Frontend: `npm run dev` corriendo
- [ ] Navegador abierto en http://localhost:5173
- [ ] Usuario admin creado (opcional)

Si todos los checkboxes están marcados, **¡el proyecto debería estar funcionando!** 🎉
