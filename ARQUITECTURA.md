# Arquitectura del Sistema - Plataforma de Aulas Virtuales

## 📋 Índice

1. [Visión General](#visión-general)
2. [Arquitectura del Sistema](#arquitectura-del-sistema)
3. [Componentes Principales](#componentes-principales)
4. [Tecnologías Utilizadas](#tecnologías-utilizadas)
5. [Diagramas de Flujo](#diagramas-de-flujo)
6. [Estructura de Carpetas](#estructura-de-carpetas)
7. [API Endpoints](#api-endpoints)
8. [Base de Datos](#base-de-datos)
9. [Autenticación y Autorización](#autenticación-y-autorización)
10. [Despliegue](#despliegue)

---

## 🎯 Visión General

La **Plataforma de Aulas Virtuales** es un sistema completo de gestión educativa que permite a administradores, docentes y estudiantes interactuar en un entorno de aprendizaje virtual. El sistema incluye funcionalidades de gestión de cursos, aulas virtuales en tiempo real con WebRTC, evaluaciones, recursos educativos y foros de discusión.

### Características Principales

- ✅ **Gestión de Usuarios**: Administradores, Docentes y Estudiantes
- ✅ **Gestión de Cursos**: Creación, edición y organización de cursos
- ✅ **Aulas Virtuales**: Videoconferencia en tiempo real con WebRTC
- ✅ **Recursos Educativos**: Videos, documentos, enlaces e información
- ✅ **Evaluaciones**: Quizzes con múltiples intentos y calificación automática
- ✅ **Foros de Discusión**: Comunicación asíncrona entre usuarios
- ✅ **Control de Asistencia**: Registro automático en clases virtuales
- ✅ **Grupos de Trabajo**: Organización de estudiantes en equipos
- ✅ **Chat en Tiempo Real**: Mensajería instantánea en las aulas

---

## 🏗️ Arquitectura del Sistema

El sistema sigue una arquitectura **Cliente-Servidor** de tres capas con comunicación en tiempo real:

```mermaid
graph TB
    subgraph "Frontend - React/Vite"
        A[Cliente Web]
        A1[Componentes React]
        A2[Zustand Store]
        A3[Socket.IO Client]
        A4[WebRTC Client]
    end

    subgraph "Backend - Node.js/Express"
        B[API REST]
        B1[Controladores]
        B2[Middlewares]
        B3[Rutas]
        B4[Socket.IO Server]
        B5[WebRTC Signaling]
    end

    subgraph "Capa de Datos"
        C1[(PostgreSQL - Supabase)]
        C2[(Redis - Upstash)]
    end

    A --> B
    A3 --> B4
    A4 --> B5
    B --> C1
    B --> C2

    style A fill:#61DAFB
    style B fill:#68A063
    style C1 fill:#336791
    style C2 fill:#DC382D
```

---

## 🔧 Componentes Principales

### 1. **Frontend (React + Vite)**

**Ubicación**: `/frontend`

El frontend es una Single Page Application (SPA) construida con React y Vite, que proporciona una interfaz de usuario moderna y responsive.

#### Tecnologías Clave:
- **React 18**: Biblioteca de UI con hooks
- **Vite**: Build tool ultrarrápido
- **TailwindCSS**: Framework de CSS utility-first
- **Zustand**: Gestión de estado global ligera
- **React Router**: Navegación SPA
- **Socket.IO Client**: Comunicación en tiempo real
- **Axios**: Cliente HTTP para consumir la API
- **Lucide React**: Iconos modernos

#### Roles y Vistas:

```mermaid
graph LR
    A[Usuario] --> B{Rol}
    B -->|ADMIN| C[Dashboard Admin]
    B -->|TEACHER| D[Dashboard Docente]
    B -->|STUDENT| E[Dashboard Estudiante]

    C --> C1[Gestión Usuarios]
    C --> C2[Gestión Cursos]
    C --> C3[Reportes]

    D --> D1[Mis Cursos]
    D --> D2[Crear Aulas]
    D --> D3[Calificar]
    D --> D4[Asistencias]

    E --> E1[Mis Cursos]
    E --> E2[Aulas Virtuales]
    E --> E3[Recursos]
    E --> E4[Evaluaciones]
```

### 2. **Backend (Node.js + Express)**

**Ubicación**: `/backend`

El backend es una API RESTful con capacidades de tiempo real a través de Socket.IO y WebRTC signaling.

#### Tecnologías Clave:
- **Node.js 18+**: Runtime de JavaScript
- **Express**: Framework web minimalista
- **Prisma ORM**: Abstracción de base de datos
- **Socket.IO**: WebSockets para tiempo real
- **JWT**: Autenticación mediante tokens
- **bcrypt**: Hashing de contraseñas
- **CORS**: Manejo de solicitudes cross-origin

#### Arquitectura MVC:

```
backend/
├── src/
│   ├── controllers/     # Lógica de negocio
│   ├── routes/          # Definición de endpoints
│   ├── middlewares/     # Autenticación, validación
│   ├── config/          # Configuración (DB, Redis)
│   ├── utils/           # Utilidades
│   └── index.js         # Punto de entrada
```

### 3. **Base de Datos (PostgreSQL - Supabase)**

**Servicio**: Supabase (PostgreSQL 17.6)

Base de datos relacional que almacena toda la información del sistema.

#### Características:
- **Connection Pooling**: PgBouncer para gestión de conexiones
- **Migraciones**: Prisma Migrate para control de versiones
- **Índices**: Optimización de consultas frecuentes
- **Foreign Keys**: Integridad referencial

### 4. **Caché (Redis - Upstash)**

**Servicio**: Upstash Redis

Sistema de caché y gestión de sesiones en memoria.

#### Usos:
- **Sesiones de Usuario**: Almacenamiento de tokens activos
- **Caché de Consultas**: Reducción de carga en DB
- **Rate Limiting**: Control de solicitudes por usuario
- **Presencia en Tiempo Real**: Estado de usuarios conectados

---

## 💻 Tecnologías Utilizadas

### Frontend
| Tecnología | Versión | Propósito |
|------------|---------|-----------|
| React | 18.3.1 | Framework de UI |
| Vite | 5.4.2 | Build tool |
| TailwindCSS | 3.4.16 | Estilos CSS |
| Zustand | 5.0.2 | State management |
| React Router | 7.1.1 | Enrutamiento |
| Socket.IO Client | 4.8.1 | WebSockets |
| Axios | 1.7.9 | HTTP client |

### Backend
| Tecnología | Versión | Propósito |
|------------|---------|-----------|
| Node.js | 22.16.0 | Runtime |
| Express | 4.21.2 | Framework web |
| Prisma | 5.22.0 | ORM |
| Socket.IO | 4.8.1 | Tiempo real |
| JWT | 9.0.2 | Autenticación |
| bcrypt | 5.1.1 | Hashing |

### Infraestructura
| Servicio | Proveedor | Propósito |
|----------|-----------|-----------|
| Backend Hosting | Render | Servidor Node.js |
| Frontend Hosting | Vercel | SPA estática |
| Base de Datos | Supabase | PostgreSQL |
| Caché/Sesiones | Upstash | Redis |

---

## 🔄 Diagramas de Flujo

### 1. Flujo de Autenticación

```mermaid
sequenceDiagram
    participant U as Usuario
    participant F as Frontend
    participant B as Backend
    participant DB as PostgreSQL
    participant R as Redis

    U->>F: Ingresa credenciales
    F->>B: POST /api/auth/login
    B->>DB: Buscar usuario
    DB-->>B: Datos del usuario
    B->>B: Verificar contraseña (bcrypt)
    B->>B: Generar JWT
    B->>R: Guardar sesión
    R-->>B: OK
    B-->>F: { token, user }
    F->>F: Guardar en localStorage
    F-->>U: Redirigir a dashboard
```

### 2. Flujo de Creación de Curso

```mermaid
sequenceDiagram
    participant D as Docente/Admin
    participant F as Frontend
    participant B as Backend
    participant DB as PostgreSQL

    D->>F: Completa formulario
    F->>F: Validar datos
    F->>B: POST /api/courses (+ JWT)
    B->>B: Verificar token (authenticate)
    B->>B: Verificar rol (authorize)
    B->>DB: INSERT course
    DB-->>B: Curso creado
    B-->>F: { course }
    F->>F: Actualizar lista de cursos
    F-->>D: Mostrar confirmación
```

### 3. Flujo de Aula Virtual (WebRTC)

```mermaid
sequenceDiagram
    participant E1 as Estudiante 1
    participant E2 as Estudiante 2
    participant F as Frontend
    participant S as Socket.IO Server
    participant W as WebRTC

    E1->>F: Unirse a aula
    F->>S: join-classroom
    S-->>F: user-joined (otros usuarios)

    E2->>F: Unirse a aula
    F->>S: join-classroom
    S-->>E1: user-joined (E2)

    E1->>W: Crear oferta (offer)
    E1->>S: webrtc-offer
    S-->>E2: webrtc-offer

    E2->>W: Crear respuesta (answer)
    E2->>S: webrtc-answer
    S-->>E1: webrtc-answer

    E1->>W: Enviar ICE candidates
    E2->>W: Enviar ICE candidates

    W-->>E1: Conexión establecida
    W-->>E2: Conexión establecida

    Note over E1,E2: Video/Audio en tiempo real
```

### 4. Flujo de Evaluación (Quiz)

```mermaid
graph TD
    A[Estudiante] --> B[Selecciona Quiz]
    B --> C{Tiene intentos<br/>disponibles?}
    C -->|No| D[Mostrar error]
    C -->|Sí| E[Cargar preguntas]
    E --> F[Responder preguntas]
    F --> G[Enviar respuestas]
    G --> H[Backend calcula puntaje]
    H --> I[Guardar intento en DB]
    I --> J{Aprobó?}
    J -->|Sí| K[Mostrar felicitación]
    J -->|No| L{Tiene más<br/>intentos?}
    L -->|Sí| M[Permitir reintento]
    L -->|No| N[Bloquear quiz]
    K --> O[Ver resultados]
    M --> O
    N --> O
```

---

## 📁 Estructura de Carpetas

### Backend

```
backend/
├── prisma/
│   └── schema.prisma          # Esquema de base de datos
├── src/
│   ├── config/
│   │   ├── db.js              # Conexión a PostgreSQL
│   │   └── redis.js           # Conexión a Redis
│   ├── controllers/
│   │   ├── auth.controller.js # Autenticación y usuarios
│   │   ├── course.controller.js # Gestión de cursos
│   │   ├── quiz.controller.js  # Evaluaciones
│   │   └── resource.controller.js # Recursos
│   ├── middlewares/
│   │   └── auth.js            # authenticate, authorize
│   ├── routes/
│   │   ├── auth.js            # Rutas de autenticación
│   │   ├── courses.js         # Rutas de cursos
│   │   ├── quizzes.js         # Rutas de quizzes
│   │   ├── resources.js       # Rutas de recursos
│   │   └── setup.js           # Rutas de configuración
│   ├── scripts/
│   │   └── createAdmin.js     # Script crear admin
│   ├── utils/
│   │   └── validation.js      # Validaciones
│   └── index.js               # Servidor principal
├── package.json
└── render.yaml                # Configuración Render
```

### Frontend

```
frontend/
├── src/
│   ├── components/
│   │   ├── common/            # Componentes reutilizables
│   │   ├── admin/             # Componentes de admin
│   │   ├── teacher/           # Componentes de docente
│   │   └── student/           # Componentes de estudiante
│   ├── pages/
│   │   ├── AdminDashboard.jsx
│   │   ├── DocenteDashboard.jsx
│   │   └── AlumnoDashboard.jsx
│   ├── services/
│   │   └── api.js             # Configuración Axios
│   ├── store/
│   │   └── store.js           # Zustand store
│   ├── App.jsx                # Componente raíz
│   └── main.jsx               # Punto de entrada
├── public/
├── package.json
└── vercel.json                # Configuración Vercel
```

---

## 🔌 API Endpoints

### Autenticación (`/api/auth`)

| Método | Endpoint | Autenticación | Roles | Descripción |
|--------|----------|---------------|-------|-------------|
| POST | `/login` | No | - | Iniciar sesión |
| POST | `/logout` | Sí | Todos | Cerrar sesión |
| GET | `/me` | Sí | Todos | Obtener usuario actual |

### Usuarios (`/api/auth/users`)

| Método | Endpoint | Autenticación | Roles | Descripción |
|--------|----------|---------------|-------|-------------|
| POST | `/users/teacher` | Sí | ADMIN | Crear docente |
| GET | `/users/teachers` | Sí | ADMIN | Listar docentes |
| POST | `/users/student` | Sí | ADMIN, TEACHER | Crear estudiante |
| GET | `/users/students` | Sí | ADMIN, TEACHER | Listar estudiantes |
| PATCH | `/users/:id/toggle-status` | Sí | ADMIN | Activar/desactivar usuario |

### Cursos (`/api/courses`)

| Método | Endpoint | Autenticación | Roles | Descripción |
|--------|----------|---------------|-------|-------------|
| POST | `/` | Sí | ADMIN, TEACHER | Crear curso |
| GET | `/` | Sí | Todos | Listar cursos |
| GET | `/:id` | Sí | Todos | Obtener curso |
| PUT | `/:id` | Sí | ADMIN, TEACHER | Actualizar curso |
| DELETE | `/:id` | Sí | ADMIN | Eliminar curso |
| POST | `/:id/enroll` | Sí | ADMIN, TEACHER | Inscribir estudiante |
| GET | `/:id/students` | Sí | ADMIN, TEACHER | Listar estudiantes del curso |

### Aulas (`/api/classrooms`)

| Método | Endpoint | Autenticación | Roles | Descripción |
|--------|----------|---------------|-------|-------------|
| POST | `/` | Sí | ADMIN, TEACHER | Crear aula |
| GET | `/course/:courseId` | Sí | Todos | Listar aulas de curso |
| POST | `/:id/start` | Sí | TEACHER | Iniciar clase en vivo |
| POST | `/:id/end` | Sí | TEACHER | Finalizar clase |

### Recursos (`/api/resources`)

| Método | Endpoint | Autenticación | Roles | Descripción |
|--------|----------|---------------|-------|-------------|
| POST | `/` | Sí | ADMIN, TEACHER | Crear recurso |
| GET | `/course/:courseId` | Sí | Todos | Listar recursos de curso |
| PUT | `/:id` | Sí | ADMIN, TEACHER | Actualizar recurso |
| DELETE | `/:id` | Sí | ADMIN, TEACHER | Eliminar recurso |

### Evaluaciones (`/api/quizzes`)

| Método | Endpoint | Autenticación | Roles | Descripción |
|--------|----------|---------------|-------|-------------|
| POST | `/` | Sí | ADMIN, TEACHER | Crear quiz |
| GET | `/course/:courseId` | Sí | Todos | Listar quizzes de curso |
| GET | `/:id` | Sí | Todos | Obtener quiz |
| POST | `/:id/attempt` | Sí | STUDENT | Enviar intento |
| GET | `/:id/attempts` | Sí | STUDENT | Ver mis intentos |

### Setup (`/api/setup`)

| Método | Endpoint | Autenticación | Roles | Descripción |
|--------|----------|---------------|-------|-------------|
| POST | `/create-admin` | No | - | Crear administrador inicial |
| POST | `/db-push` | No | - | Sincronizar base de datos |

---

## 💾 Base de Datos

### Modelo de Datos (Prisma Schema)

```prisma
// Usuarios
model User {
  id         Int      @id @default(autoincrement())
  username   String   @unique
  email      String   @unique
  password   String
  name       String
  role       Role     @default(STUDENT)
  isActive   Boolean  @default(true)
  avatar     String?
  createdAt  DateTime @default(now())
  updatedAt  DateTime @updatedAt
}

enum Role {
  ADMIN
  TEACHER
  STUDENT
}

// Cursos
model Course {
  id           Int      @id @default(autoincrement())
  code         String   @unique
  title        String
  description  String?
  teacherId    Int
  credits      Int      @default(3)
  isActive     Boolean  @default(true)
  startDate    DateTime?
  endDate      DateTime?
  createdAt    DateTime @default(now())
  updatedAt    DateTime @updatedAt
}

// Aulas Virtuales
model Classroom {
  id           Int      @id @default(autoincrement())
  courseId     Int
  title        String
  description  String?
  scheduledAt  DateTime?
  duration     Int?
  isLive       Boolean  @default(false)
  recordingUrl String?
  roomCode     String?  @unique
  createdAt    DateTime @default(now())
  updatedAt    DateTime @updatedAt
}

// Inscripciones
model Enrollment {
  id         Int      @id @default(autoincrement())
  userId     Int
  courseId   Int
  enrolledAt DateTime @default(now())
  isActive   Boolean  @default(true)

  @@unique([userId, courseId])
}

// Recursos Educativos
model CourseResource {
  id          Int          @id @default(autoincrement())
  courseId    Int
  title       String
  description String?
  type        ResourceType
  content     String?
  fileUrl     String?
  order       Int          @default(0)
  isActive    Boolean      @default(true)
  createdAt   DateTime     @default(now())
  updatedAt   DateTime     @updatedAt
}

enum ResourceType {
  VIDEO
  DOCUMENT
  LINK
  INFORMATION
}

// Evaluaciones
model Quiz {
  id           Int      @id @default(autoincrement())
  courseId     Int
  title        String
  description  String?
  duration     Int?
  passingScore Int      @default(70)
  maxAttempts  Int      @default(3)
  isActive     Boolean  @default(true)
  createdAt    DateTime @default(now())
  updatedAt    DateTime @updatedAt
}

model QuizQuestion {
  id            Int    @id @default(autoincrement())
  quizId        Int
  question      String
  options       String[]
  correctAnswer Int
  points        Int    @default(1)
  order         Int    @default(0)
}

model QuizAttempt {
  id          Int      @id @default(autoincrement())
  quizId      Int
  userId      Int
  answers     String   // JSON
  score       Float
  completedAt DateTime @default(now())
}

// Asistencias
model Attendance {
  id           Int              @id @default(autoincrement())
  classroomId  Int
  userId       Int
  status       AttendanceStatus @default(ABSENT)
  justification String?
  markedAt     DateTime         @default(now())
  createdAt    DateTime         @default(now())
  updatedAt    DateTime         @updatedAt

  @@unique([classroomId, userId])
}

enum AttendanceStatus {
  PRESENT
  ABSENT
  LATE
  EXCUSED
}

// Foros
model Forum {
  id          Int      @id @default(autoincrement())
  courseId    Int
  title       String
  description String?
  isActive    Boolean  @default(true)
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
}

model ForumPost {
  id        Int      @id @default(autoincrement())
  forumId   Int
  userId    Int
  title     String
  content   String
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
}

model ForumReply {
  id        Int      @id @default(autoincrement())
  postId    Int
  userId    Int
  content   String
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
}
```

### Relaciones Principales

```mermaid
erDiagram
    USER ||--o{ COURSE : teaches
    USER ||--o{ ENROLLMENT : enrolls
    COURSE ||--o{ CLASSROOM : has
    COURSE ||--o{ RESOURCE : contains
    COURSE ||--o{ QUIZ : has
    COURSE ||--o{ FORUM : has
    CLASSROOM ||--o{ ATTENDANCE : tracks
    CLASSROOM ||--o{ MESSAGE : contains
    QUIZ ||--o{ QUESTION : contains
    QUIZ ||--o{ ATTEMPT : receives
    FORUM ||--o{ POST : contains
    POST ||--o{ REPLY : has
```

---

## 🔐 Autenticación y Autorización

### Sistema de Autenticación

El sistema utiliza **JWT (JSON Web Tokens)** para autenticación stateless combinado con **sesiones en Redis** para mayor control.

#### Flujo de Autenticación:

1. **Login**:
   - Usuario envía credenciales
   - Backend verifica con bcrypt
   - Genera JWT con payload: `{ userId, username, role }`
   - Guarda sesión en Redis con TTL de 7 días
   - Retorna token al cliente

2. **Requests Protegidos**:
   - Cliente envía `Authorization: Bearer <token>`
   - Middleware `authenticate`:
     - Verifica firma del JWT
     - Verifica sesión en Redis (si disponible)
     - Agrega `req.user` con datos del usuario
   - Middleware `authorize`:
     - Verifica que el rol esté permitido

3. **Logout**:
   - Cliente envía request de logout
   - Backend elimina sesión de Redis
   - Cliente elimina token de localStorage

### Middleware de Autenticación

```javascript
// authenticate: Verifica que el usuario esté autenticado
export const authenticate = async (req, res, next) => {
  // 1. Extraer token del header Authorization
  // 2. Verificar JWT
  // 3. Verificar sesión en Redis (si disponible)
  // 4. Agregar req.user
  // 5. Continuar con next()
};

// authorize: Verifica que el usuario tenga el rol adecuado
export const authorize = (...allowedRoles) => {
  return (req, res, next) => {
    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({ error: 'Acceso denegado' });
    }
    next();
  };
};
```

### Matriz de Permisos

| Acción | ADMIN | TEACHER | STUDENT |
|--------|-------|---------|---------|
| Crear usuarios | ✅ | ❌ | ❌ |
| Crear docentes | ✅ | ❌ | ❌ |
| Crear estudiantes | ✅ | ✅ | ❌ |
| Crear cursos | ✅ | ✅ | ❌ |
| Eliminar cursos | ✅ | ❌ | ❌ |
| Crear aulas | ✅ | ✅ | ❌ |
| Crear recursos | ✅ | ✅ | ❌ |
| Crear quizzes | ✅ | ✅ | ❌ |
| Ver cursos inscritos | ✅ | ✅ | ✅ |
| Tomar evaluaciones | ❌ | ❌ | ✅ |
| Participar en aulas | ✅ | ✅ | ✅ |

---

## 🚀 Despliegue

### Arquitectura de Despliegue

```mermaid
graph TB
    subgraph "Cliente"
        U[Navegador]
    end

    subgraph "Vercel - Frontend"
        V[Aplicación React]
    end

    subgraph "Render - Backend"
        R[Node.js Server]
        R1[Express API]
        R2[Socket.IO]
    end

    subgraph "Supabase - Database"
        S1[(PostgreSQL)]
        S2[PgBouncer Pooler]
    end

    subgraph "Upstash - Cache"
        UP[(Redis)]
    end

    U --> V
    V --> R1
    V --> R2
    R --> S2
    S2 --> S1
    R --> UP

    style V fill:#000000,color:#ffffff
    style R fill:#0ACF83
    style S1 fill:#3ECF8E
    style UP fill:#00E9A3
```

### Servicios en Producción

#### 1. **Frontend - Vercel**
- **URL**: https://plataforma-aulas-virtuales.vercel.app
- **Plan**: Free
- **Build**: `npm run build`
- **Framework**: Vite
- **Variables de entorno**:
  ```
  VITE_API_URL=https://plataforma-backend-6jsy.onrender.com/api
  ```

#### 2. **Backend - Render**
- **URL**: https://plataforma-backend-6jsy.onrender.com
- **Plan**: Free
- **Build Command**: `npm install && npm run build`
- **Start Command**: `npm start`
- **Variables de entorno**:
  ```
  NODE_ENV=production
  PORT=5000
  DATABASE_URL=postgresql://[user]:[password]@[host]:6543/[db]?pgbouncer=true
  REDIS_URL=rediss://[host]:6379
  JWT_SECRET=[auto-generated]
  FRONTEND_URL=https://plataforma-aulas-virtuales.vercel.app
  ```

#### 3. **Base de Datos - Supabase**
- **Tipo**: PostgreSQL 17.6
- **Región**: AWS us-west-2
- **Plan**: Free (500 MB, 2 GB bandwidth)
- **Conexión**: Connection Pooler (PgBouncer)
- **Puerto**: 6543 (pooler), 5432 (direct - bloqueado)

#### 4. **Caché - Upstash**
- **Tipo**: Redis
- **Plan**: Free
- **Conexión**: TLS (rediss://)
- **Uso**: Sesiones y caché

### Proceso de Despliegue

#### Backend (Render):
1. Push a GitHub (rama `main`)
2. Render detecta cambios automáticamente
3. Ejecuta build: `npm install && npm run build`
4. Genera Prisma Client
5. Inicia servidor: `npm start`
6. Health check en `/api/health`
7. Service live ✅

#### Frontend (Vercel):
1. Push a GitHub (rama `main`)
2. Vercel detecta cambios automáticamente
3. Ejecuta build: `npm run build`
4. Genera archivos estáticos en `/dist`
5. Deploy a CDN global
6. Deployment live ✅

### Variables de Entorno

#### Backend (`render.yaml`)
```yaml
envVars:
  - key: NODE_ENV
    value: production
  - key: PORT
    value: 5000
  - key: DATABASE_URL
    sync: false  # Configurar en dashboard
  - key: REDIS_URL
    sync: false  # Configurar en dashboard
  - key: JWT_SECRET
    generateValue: true  # Auto-generado
  - key: FRONTEND_URL
    sync: false  # URL de Vercel
```

#### Frontend (`.env.production`)
```env
VITE_API_URL=https://plataforma-backend-6jsy.onrender.com/api
```

---

## 📊 Flujos de Datos

### 1. Estado Global (Zustand)

```javascript
// store/store.js
const useAuthStore = create(
  persist(
    (set) => ({
      user: null,
      token: null,
      isAuthenticated: false,

      login: (user, token) => set({
        user,
        token,
        isAuthenticated: true
      }),

      logout: () => set({
        user: null,
        token: null,
        isAuthenticated: false
      }),
    }),
    {
      name: 'auth-storage',
      storage: createJSONStorage(() => localStorage)
    }
  )
);
```

### 2. Comunicación Cliente-Servidor

#### HTTP (REST API):
```javascript
// services/api.js
const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL,
});

api.interceptors.request.use((config) => {
  const token = useAuthStore.getState().token;
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});
```

#### WebSocket (Socket.IO):
```javascript
// Conexión
const socket = io(BACKEND_URL, {
  auth: { token }
});

// Eventos del cliente
socket.emit('join-classroom', { classroomId });
socket.emit('send-message', { message, classroomId });

// Eventos del servidor
socket.on('user-joined', handleUserJoined);
socket.on('message-received', handleMessage);
socket.on('user-left', handleUserLeft);
```

---

## 🔧 Configuración Inicial

### 1. Clonar Repositorio
```bash
git clone https://github.com/ashly-proyect25/plataforma-aulas-virtuales.git
cd plataforma-aulas-virtuales
```

### 2. Configurar Backend
```bash
cd backend
npm install

# Crear .env
cat > .env << EOF
DATABASE_URL="postgresql://user:password@localhost:5432/edudb"
PORT=5000
NODE_ENV=development
FRONTEND_URL=http://localhost:5173
JWT_SECRET=tu_secret_key_aqui
JWT_EXPIRES_IN=7d
REDIS_URL="redis://localhost:6379"
EOF

# Sincronizar base de datos
npx prisma db push

# Crear usuario admin
node src/scripts/createAdmin.js

# Iniciar servidor
npm run dev
```

### 3. Configurar Frontend
```bash
cd frontend
npm install

# Iniciar desarrollo
npm run dev
```

### 4. Acceder a la Aplicación
- Frontend: http://localhost:5173
- Backend: http://localhost:5000
- Admin: username: `admin`, password: `admin123`

---

## 📝 Notas Adicionales

### Limitaciones del Plan Gratuito

- **Render**: El servicio se duerme después de 15 minutos de inactividad (cold start ~30s)
- **Supabase**: 500 MB de almacenamiento, 2 GB de bandwidth
- **Upstash**: 10,000 comandos/día
- **Vercel**: 100 GB bandwidth/mes

### Mejoras Futuras

- [ ] Implementar notificaciones push
- [ ] Agregar grabación de clases
- [ ] Sistema de calificaciones más complejo
- [ ] Dashboard de analytics
- [ ] App móvil con React Native
- [ ] Integración con sistemas LMS externos
- [ ] Sistema de badges y gamificación
- [ ] Exportación de reportes PDF

### Soporte y Contacto

- **Repositorio**: https://github.com/ashly-proyect25/plataforma-aulas-virtuales
- **Documentación**: Este archivo
- **Issues**: https://github.com/ashly-proyect25/plataforma-aulas-virtuales/issues

---

**Última actualización**: 24 de diciembre de 2025
**Versión**: 1.0.0
