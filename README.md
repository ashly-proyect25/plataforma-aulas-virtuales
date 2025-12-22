# 🎓 Plataforma de Aulas Virtuales - Proyecto de Tesis

Sistema de clases virtuales en tiempo real con video streaming, pizarra colaborativa y chat en vivo.

## 🚀 Tecnologías

### Frontend
- React 18
- Vite
- Tailwind CSS
- Socket.IO Client
- Zustand (Estado global)
- Axios

### Backend
- Node.js + Express
- Socket.IO
- Prisma ORM
- PostgreSQL
- Redis
- JWT

### Infraestructura
- Docker + Docker Compose
- PostgreSQL 16
- Redis 7
- MinIO (Almacenamiento)

## 📋 Funcionalidades

### ✅ Implementadas
- [ ] Sistema de autenticación (Login/Register)
- [ ] Gestión de cursos
- [ ] Gestión de aulas virtuales
- [ ] Chat en tiempo real
- [ ] Pizarra colaborativa
- [ ] Video streaming (WebRTC)
- [ ] Compartir pantalla
- [ ] Grabar clases
- [ ] Sistema de roles (Docente/Alumno/Admin)

## 🛠️ Instalación

### Requisitos
- WSL2 (Ubuntu) o Linux
- Node.js 20+
- Docker Desktop
- Git

### Paso 1: Clonar repositorio
```bash
git clone <tu-repo>
cd plataforma-aulas-virtuales
```

### Paso 2: Iniciar servicios Docker
```bash
docker compose up -d
```

### Paso 3: Backend
```bash
cd backend
cp .env.example .env
npm install
npx prisma migrate dev --name init
npx prisma generate
npm run dev
```

### Paso 4: Frontend
```bash
cd frontend
npm install
npm run dev
```

## 🌐 URLs

- Frontend: http://localhost:5173
- Backend API: http://localhost:5000
- MinIO Console: http://localhost:9001

## 👥 Usuarios de Prueba

Crear después de la primera migración.

## 📚 Documentación

Ver carpeta `/docs` para:
- Manual de Usuario
- Manual Técnico
- Diagramas del sistema

## 📸 Capturas de Pantalla

Ver carpeta `/docs/capturas`

## 📄 Licencia

Proyecto de tesis - Uso académico

## 👨‍💻 Autor

[Tu Nombre]
[Tu Universidad]
[Año]
