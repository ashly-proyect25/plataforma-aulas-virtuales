# 🚀 Guía de Despliegue en Railway.app

Esta guía te llevará paso a paso para desplegar la Plataforma de Aulas Virtuales en Railway.app.

## 📋 Pre-requisitos

- ✅ Cuenta en [Railway.app](https://railway.app/)
- ✅ Código subido a GitHub
- ✅ $5 USD de créditos gratuitos al registrarte

---

## 🎯 Paso 1: Crear Proyecto en Railway

1. **Inicia sesión** en [Railway.app](https://railway.app/)
2. Click en **"New Project"**
3. Selecciona **"Deploy from GitHub repo"**
4. Conecta tu cuenta de GitHub si aún no lo has hecho
5. Selecciona el repositorio: **`ashly-proyect25/plataforma-aulas-virtuales`**

---

## 🗄️ Paso 2: Agregar PostgreSQL

1. En tu proyecto de Railway, click en **"+ New"**
2. Selecciona **"Database"** → **"Add PostgreSQL"**
3. Railway creará automáticamente la base de datos
4. Copia la **`DATABASE_URL`** (la necesitarás después)

---

## 📦 Paso 3: Agregar Redis

1. Click nuevamente en **"+ New"**
2. Selecciona **"Database"** → **"Add Redis"**
3. Railway creará automáticamente Redis
4. Copia la **`REDIS_URL`** (la necesitarás después)

---

## 🖥️ Paso 4: Configurar Backend

### 4.1 Crear servicio para el backend

1. Click en **"+ New"** → **"GitHub Repo"** → Selecciona tu repo
2. Configura el **Root Directory**:
   - Click en **Settings** → **General**
   - En **Root Directory** escribe: `backend`
   - Click en **Save**

### 4.2 Configurar Variables de Entorno

1. Click en el servicio **backend**
2. Ve a la pestaña **"Variables"**
3. Agrega las siguientes variables (click en **"+ New Variable"** para cada una):

```env
# Base de datos (copiada del servicio PostgreSQL)
DATABASE_URL=${{Postgres.DATABASE_URL}}

# Redis (copiada del servicio Redis)
REDIS_URL=${{Redis.REDIS_URL}}

# Puerto (Railway lo asigna automáticamente)
PORT=5000

# JWT Secret (genera uno aleatorio)
JWT_SECRET=tu_jwt_secret_super_secreto_cambiar_esto_123456

# CORS (URL del frontend - la configurarás después)
FRONTEND_URL=https://tu-frontend.railway.app

# NODE_ENV
NODE_ENV=production
```

### 4.3 Configurar Build Command

1. En **Settings** → **Deploy**
2. **Build Command**: Ya está configurado en package.json (`npm run build`)
3. **Start Command**: Ya está configurado (`npm start`)

---

## 🌐 Paso 5: Configurar Frontend

### 5.1 Crear servicio para el frontend

1. Click en **"+ New"** → **"GitHub Repo"** → Selecciona tu repo
2. Configura el **Root Directory**:
   - Click en **Settings** → **General**
   - En **Root Directory** escribe: `frontend`
   - Click en **Save**

### 5.2 Configurar Variables de Entorno

1. Click en el servicio **frontend**
2. Ve a la pestaña **"Variables"**
3. Agrega:

```env
# URL del backend (la obtendrás del servicio backend)
VITE_API_URL=https://tu-backend.railway.app/api
```

**⚠️ IMPORTANTE:** Necesitas la URL pública del backend:
1. Ve al servicio **backend** en Railway
2. Click en **Settings** → **Networking**
3. Click en **"Generate Domain"**
4. Copia la URL generada (ej: `plataforma-backend-production-xxxx.up.railway.app`)
5. Úsala como `VITE_API_URL` en el frontend

---

## 🔧 Paso 6: Actualizar CORS en Backend

Después de tener la URL del frontend:

1. Anota la URL pública del frontend (genérala igual que el backend)
2. Ve al servicio **backend** → **Variables**
3. Actualiza la variable `FRONTEND_URL` con la URL real del frontend

---

## 🎨 Paso 7: Generar Dominios Públicos

Para ambos servicios (backend y frontend):

1. Click en el servicio
2. Ve a **Settings** → **Networking**
3. En **Public Networking**, click en **"Generate Domain"**
4. Copia la URL generada

**URLs finales:**
- Frontend: `https://plataforma-frontend-production-xxxx.up.railway.app`
- Backend: `https://plataforma-backend-production-xxxx.up.railway.app`

---

## 🗃️ Paso 8: Ejecutar Migraciones de Prisma

Railway ejecutará automáticamente:
```bash
npm run build  # Ejecuta: prisma generate && prisma migrate deploy
```

Si las migraciones fallan:
1. Ve al servicio **backend**
2. Click en **"Deployments"**
3. Click en el último deployment
4. Revisa los logs para ver el error

---

## 👤 Paso 9: Crear Usuario Administrador

Para crear el usuario admin inicial:

1. Ve al servicio **backend** en Railway
2. Click en **"Settings"** → **"Deploy"**
3. En **"Custom Start Command"**, temporalmente cambia a:
   ```bash
   node src/scripts/createAdmin.js && node src/index.js
   ```
4. Esto creará el usuario admin en el primer despliegue
5. **Después del primer despliegue**, quita el script y deja solo:
   ```bash
   node src/index.js
   ```

**Credenciales del admin (definidas en createAdmin.js):**
- Usuario: `admin`
- Contraseña: `admin123` (cámbiala inmediatamente después de entrar)

---

## ✅ Paso 10: Verificar Despliegue

1. **Backend**: Ve a `https://tu-backend.railway.app/api/health`
   - Deberías ver: `{"status": "ok"}`

2. **Frontend**: Ve a `https://tu-frontend.railway.app`
   - Deberías ver la página de login

3. **Logs**: Revisa los logs de cada servicio en Railway:
   - Click en el servicio → **"Deployments"** → **"View Logs"**

---

## 🔒 Seguridad Post-Despliegue

### 1. Cambiar JWT_SECRET
```env
# Genera uno nuevo con:
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
```

### 2. Cambiar contraseña del admin
- Entra con `admin/admin123`
- Ve a tu perfil y cambia la contraseña

### 3. Eliminar tokens de GitHub
- Si usaste tokens temporales, elimínalos en https://github.com/settings/tokens

---

## 💰 Monitoreo de Costos

Railway te da **$5 USD** gratis al mes. Para verificar tu uso:

1. Click en tu perfil (arriba a la derecha)
2. Ve a **"Usage"**
3. Monitorea tu consumo

**Estimación de duración:**
- Con uso moderado (clases en vivo esporádicas): ~2-3 semanas
- Con uso intensivo (clases diarias): ~1-2 semanas

---

## 🐛 Solución de Problemas Comunes

### Error: "Cannot connect to database"
- Verifica que `DATABASE_URL` esté correctamente configurada
- Revisa los logs del servicio PostgreSQL

### Error: "Redis connection failed"
- Verifica que `REDIS_URL` esté correctamente configurada
- Revisa los logs del servicio Redis

### Error: "CORS policy"
- Verifica que `FRONTEND_URL` en backend coincida con la URL real del frontend
- Asegúrate de incluir `https://` sin barra final

### Frontend no se conecta al backend
- Verifica que `VITE_API_URL` en frontend apunte a la URL correcta del backend
- Debe terminar en `/api` (ej: `https://backend.railway.app/api`)

### Migraciones de Prisma fallan
- Ve a los logs del backend
- Ejecuta manualmente desde tu computadora:
  ```bash
  DATABASE_URL="tu_database_url_de_railway" npx prisma migrate deploy
  ```

---

## 📊 URLs Finales del Proyecto

**Backend API:**
```
https://[tu-backend].up.railway.app/api
```

**Frontend:**
```
https://[tu-frontend].up.railway.app
```

**PostgreSQL:**
```
Interno de Railway (no expuesto públicamente)
```

**Redis:**
```
Interno de Railway (no expuesto públicamente)
```

---

## 🎓 Siguientes Pasos

Una vez desplegado:

1. ✅ Entra con el usuario admin
2. ✅ Crea docentes y estudiantes
3. ✅ Crea materias
4. ✅ Programa clases
5. ✅ Prueba las clases en vivo

---

## 📞 Soporte

Si tienes problemas:
- Revisa los logs en Railway
- Verifica las variables de entorno
- Consulta la documentación de Railway: https://docs.railway.app

---

**¡Listo!** Tu plataforma de aulas virtuales está ahora desplegada en Railway. 🚀
