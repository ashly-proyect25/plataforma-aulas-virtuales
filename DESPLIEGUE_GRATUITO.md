# 🚀 Guía de Despliegue GRATUITO - Plataforma de Aulas Virtuales

Esta guía te llevará paso a paso para desplegar la Plataforma de Aulas Virtuales usando **servicios 100% GRATUITOS**.

## 📋 Servicios que Vamos a Usar

| Componente | Servicio | Plan Gratuito | Límites |
|------------|----------|---------------|---------|
| **Frontend** | Vercel | ✅ Ilimitado | Banda ancha ilimitada |
| **Backend** | Render.com | ✅ 750 horas/mes | Suficiente para uso educativo |
| **PostgreSQL** | Supabase | ✅ 500MB | 2 proyectos gratuitos |
| **Redis** | Upstash | ✅ 10,000 comandos/día | Ideal para sesiones |

---

## 📦 PASO 1: Configurar Base de Datos PostgreSQL (Supabase)

### 1.1 Crear cuenta en Supabase

1. Ve a [https://supabase.com](https://supabase.com)
2. Click en **"Start your project"**
3. Regístrate con GitHub, Google o Email

### 1.2 Crear nuevo proyecto

1. Click en **"New Project"**
2. Configura:
   - **Name:** `plataforma-aulas-virtuales`
   - **Database Password:** Genera una contraseña segura (guárdala bien)
   - **Region:** Selecciona el más cercano a ti
   - **Pricing Plan:** FREE (ya seleccionado)
3. Click en **"Create new project"**
4. Espera 2-3 minutos mientras se crea la base de datos

### 1.3 Obtener la URL de conexión

1. En el panel de Supabase, ve a **Settings** → **Database**
2. Busca la sección **Connection string**
3. Copia el **Connection pooling** (URI mode):
   ```
   postgresql://postgres.xxxxxxxxxxxx:[YOUR-PASSWORD]@aws-0-us-west-1.pooler.supabase.com:6543/postgres
   ```
4. **IMPORTANTE:** Reemplaza `[YOUR-PASSWORD]` con la contraseña que creaste
5. **Guarda esta URL**, la necesitarás después como `DATABASE_URL`

> 💡 **Tip:** La URL debe empezar con `postgresql://` y tener el formato completo

---

## 🔴 PASO 2: Configurar Redis (Upstash)

### 2.1 Crear cuenta en Upstash

1. Ve a [https://upstash.com](https://upstash.com)
2. Click en **"Login"** o **"Sign Up"**
3. Regístrate con GitHub o Email

### 2.2 Crear base de datos Redis

1. Click en **"Create Database"**
2. Configura:
   - **Name:** `plataforma-aulas-redis`
   - **Type:** Regional (más rápido y gratis)
   - **Region:** Selecciona el más cercano a ti
   - **TLS:** Enabled (recomendado)
3. Click en **"Create"**

### 2.3 Obtener la URL de conexión

1. En el dashboard de tu base de datos Redis
2. Busca la sección **"Connect"** o **"REST API"**
3. Copia el **Redis URL** (debe verse así):
   ```
   rediss://default:xxxxxxxxxxxxxxxxxx@us1-xxxx-xxxx.upstash.io:6379
   ```
4. **Guarda esta URL**, la necesitarás después como `REDIS_URL`

> 💡 **Tip:** La URL debe empezar con `redis://` o `rediss://` (con SSL)

---

## 🖥️ PASO 3: Desplegar Backend en Render.com

### 3.1 Crear cuenta en Render

1. Ve a [https://render.com](https://render.com)
2. Click en **"Get Started for Free"**
3. Regístrate con GitHub (recomendado para conectar el repositorio)

### 3.2 Conectar repositorio

1. En Render Dashboard, click en **"New +"**
2. Selecciona **"Web Service"**
3. Click en **"Connect GitHub"** y autoriza Render
4. Busca tu repositorio: `plataforma-aulas-virtuales`
5. Click en **"Connect"**

### 3.3 Configurar el servicio

En la página de configuración:

**Build & Deploy:**
- **Name:** `plataforma-backend` (o el que prefieras)
- **Region:** Oregon (US West) - gratis
- **Branch:** `main`
- **Root Directory:** `backend` ⚠️ **MUY IMPORTANTE**
- **Runtime:** Node
- **Build Command:** `npm install && npm run build`
- **Start Command:** `npm start`

**Plan:**
- Selecciona **"Free"** (750 horas/mes)

### 3.4 Configurar Variables de Entorno

Scroll down hasta **Environment Variables** y agrega:

```env
NODE_ENV=production
PORT=5000
DATABASE_URL=<pega aquí la URL de Supabase>
REDIS_URL=<pega aquí la URL de Upstash>
JWT_SECRET=<genera uno aleatorio - explicación abajo>
FRONTEND_URL=https://tu-frontend.vercel.app
```

**Para generar JWT_SECRET:**
1. Abre una terminal
2. Ejecuta:
   ```bash
   node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
   ```
3. Copia el resultado y úsalo como `JWT_SECRET`

**FRONTEND_URL:**
- Por ahora pon un placeholder: `https://placeholder.com`
- Lo actualizaremos después de desplegar el frontend

### 3.5 Desplegar

1. Click en **"Create Web Service"**
2. Render comenzará a desplegar automáticamente
3. Espera 5-10 minutos (puedes ver los logs en tiempo real)
4. Cuando veas **"Your service is live"**, ¡está listo!

### 3.6 Obtener URL del Backend

1. En el dashboard de Render, copia la URL de tu servicio:
   ```
   https://plataforma-backend.onrender.com
   ```
2. **Guarda esta URL**, la necesitarás para el frontend

### 3.7 Verificar que funciona

Abre en tu navegador:
```
https://tu-backend.onrender.com/api/health
```

Deberías ver:
```json
{
  "status": "ok",
  "database": "connected",
  "redis": "connected",
  "timestamp": "2025-..."
}
```

---

## 🌐 PASO 4: Desplegar Frontend en Vercel

### 4.1 Crear cuenta en Vercel

1. Ve a [https://vercel.com](https://vercel.com)
2. Click en **"Start Deploying"**
3. Regístrate con GitHub (recomendado)

### 4.2 Importar proyecto

1. En Vercel Dashboard, click en **"Add New..."** → **"Project"**
2. Importa tu repositorio de GitHub
3. Selecciona `plataforma-aulas-virtuales`
4. Click en **"Import"**

### 4.3 Configurar el proyecto

En la página de configuración:

**Framework Preset:**
- Vercel detectará automáticamente **Vite** ✅

**Root Directory:**
- Click en **"Edit"**
- Selecciona **`frontend`** ⚠️ **MUY IMPORTANTE**

**Build Settings:**
- Build Command: `npm run build` (ya configurado)
- Output Directory: `dist` (ya configurado)

### 4.4 Configurar Variable de Entorno

En **Environment Variables**, agrega:

```env
VITE_API_URL=https://tu-backend.onrender.com/api
```

⚠️ **IMPORTANTE:** Reemplaza con la URL REAL de tu backend de Render (del paso 3.6)

### 4.5 Desplegar

1. Click en **"Deploy"**
2. Vercel desplegará en 1-2 minutos
3. Cuando termine, verás **"Congratulations!"**

### 4.6 Obtener URL del Frontend

1. Copia la URL de producción:
   ```
   https://plataforma-aulas-virtuales.vercel.app
   ```

### 4.7 Actualizar CORS en Backend

**¡MUY IMPORTANTE!** Ahora que tienes la URL del frontend:

1. Ve a Render.com → Tu servicio backend
2. Click en **"Environment"** en el menú lateral
3. Edita la variable `FRONTEND_URL`
4. Reemplaza el placeholder con tu URL real de Vercel:
   ```
   https://plataforma-aulas-virtuales.vercel.app
   ```
5. Click en **"Save Changes"**
6. Render redesplegará automáticamente (espera 2-3 minutos)

---

## 👤 PASO 5: Crear Usuario Administrador

### 5.1 Ejecutar script de creación

Tienes dos opciones:

#### Opción A: Desde tu computadora local

1. Clona el repositorio si aún no lo tienes:
   ```bash
   git clone https://github.com/tuusuario/plataforma-aulas-virtuales.git
   cd plataforma-aulas-virtuales/backend
   ```

2. Instala dependencias:
   ```bash
   npm install
   ```

3. Crea archivo `.env` con la DATABASE_URL de Supabase:
   ```bash
   DATABASE_URL=postgresql://postgres.xxxx...
   ```

4. Ejecuta el script:
   ```bash
   npm run create-admin
   ```

#### Opción B: Desde Render (más complejo)

1. Ve a Render → Tu servicio backend
2. Click en **"Shell"** en el menú
3. Ejecuta:
   ```bash
   npm run create-admin
   ```

### 5.2 Credenciales del admin

Las credenciales por defecto son:
- **Usuario:** `admin`
- **Contraseña:** `admin123`

⚠️ **IMPORTANTE:** Cambia la contraseña inmediatamente después del primer login

---

## ✅ PASO 6: Verificar Todo Funciona

### 6.1 Verificar Backend

Abre en tu navegador:
```
https://tu-backend.onrender.com/api/health
```

Debe responder:
```json
{
  "status": "ok",
  "database": "connected",
  "redis": "connected"
}
```

### 6.2 Verificar Frontend

1. Abre tu app:
   ```
   https://tu-frontend.vercel.app
   ```

2. Deberías ver la pantalla de login

### 6.3 Iniciar sesión

1. Ingresa:
   - Usuario: `admin`
   - Contraseña: `admin123`

2. Si todo está bien, entrarás al dashboard

---

## 🔒 PASO 7: Seguridad Post-Despliegue

### 7.1 Cambiar contraseña del admin

1. Inicia sesión con `admin/admin123`
2. Ve a **Perfil** o **Configuración**
3. Cambia la contraseña a algo seguro

### 7.2 Rotar JWT_SECRET (Opcional pero recomendado)

Si quieres más seguridad:

1. Genera un nuevo JWT_SECRET:
   ```bash
   node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
   ```

2. Actualízalo en Render → Environment Variables

### 7.3 Verificar CORS

Asegúrate de que `FRONTEND_URL` en Render tenga EXACTAMENTE la URL de Vercel (sin barra final `/`)

---

## 📊 Monitoreo y Mantenimiento

### Render (Backend)

- **Dashboard:** [https://dashboard.render.com](https://dashboard.render.com)
- **Ver logs:** Click en tu servicio → "Logs"
- **Plan gratuito:** 750 horas/mes (suficiente si solo lo usas para clases)
- ⚠️ **Nota:** El servidor se "duerme" después de 15 min de inactividad. La primera request puede tardar ~1 min en despertar.

### Vercel (Frontend)

- **Dashboard:** [https://vercel.com/dashboard](https://vercel.com/dashboard)
- **Despliegues:** Click en tu proyecto → "Deployments"
- **Plan gratuito:** Ilimitado

### Supabase (Database)

- **Dashboard:** [https://app.supabase.com](https://app.supabase.com)
- **Límite:** 500MB (más que suficiente para empezar)
- **Monitor:** Ve a tu proyecto → "Database" → "Usage"

### Upstash (Redis)

- **Dashboard:** [https://console.upstash.com](https://console.upstash.com)
- **Límite:** 10,000 comandos/día
- **Monitor:** Dashboard muestra uso diario

---

## 🐛 Solución de Problemas Comunes

### Error: "Cannot connect to database"

**Solución:**
1. Verifica que `DATABASE_URL` en Render tenga la contraseña correcta
2. Asegúrate de usar **Connection pooling** de Supabase, NO la URI directa
3. Revisa los logs en Render → "Logs"

### Error: "Redis connection failed"

**Solución:**
1. Verifica que `REDIS_URL` sea correcta
2. Asegúrate de que empiece con `rediss://` (con doble 's' si tiene SSL)
3. Verifica en Upstash que la database esté activa

### Error: "CORS policy blocked"

**Solución:**
1. Verifica que `FRONTEND_URL` en Render coincida EXACTAMENTE con la URL de Vercel
2. No incluyas barra final `/`
3. Debe ser `https://`, no `http://`
4. Después de cambiar, espera que Render redesplegue (2-3 min)

### Frontend no se conecta al backend

**Solución:**
1. Verifica que `VITE_API_URL` en Vercel sea correcta
2. Debe terminar en `/api`
3. Ejemplo: `https://tu-backend.onrender.com/api`
4. Revisa la consola del navegador (F12) para ver errores

### Backend tarda mucho en responder

**Causa:** El plan gratuito de Render "duerme" el servidor después de 15 minutos de inactividad.

**Solución:**
- Es normal. La primera request despertará el servidor (~30-60 segundos)
- Las siguientes requests serán rápidas
- Alternativa: Usar un servicio de "ping" para mantenerlo activo (opcional)

### Error de migraciones de Prisma

**Solución:**
1. Verifica que la `DATABASE_URL` sea correcta
2. Ejecuta desde tu computadora local:
   ```bash
   DATABASE_URL="tu_url_de_supabase" npx prisma migrate deploy
   ```
3. Si persiste, elimina las migraciones y créalas de nuevo

---

## 📞 URLs Finales de tu Proyecto

Cuando termines, tus URLs serán:

**Frontend (Usuarios):**
```
https://tu-proyecto.vercel.app
```

**Backend API:**
```
https://tu-backend.onrender.com/api
```

**Health Check:**
```
https://tu-backend.onrender.com/api/health
```

**Supabase Dashboard:**
```
https://app.supabase.com/project/tu-proyecto-id
```

**Upstash Dashboard:**
```
https://console.upstash.com/redis/tu-redis-id
```

---

## 💰 Resumen de Costos

| Servicio | Costo Mensual | Límites |
|----------|---------------|---------|
| Vercel | **$0** | Ilimitado |
| Render | **$0** | 750h/mes |
| Supabase | **$0** | 500MB |
| Upstash | **$0** | 10K comandos/día |
| **TOTAL** | **$0** | ✅ Gratis |

---

## 🎓 Próximos Pasos

Una vez desplegado:

1. ✅ Inicia sesión como admin
2. ✅ Cambia la contraseña
3. ✅ Crea docentes
4. ✅ Crea estudiantes
5. ✅ Crea materias
6. ✅ Programa clases
7. ✅ ¡Prueba las clases en vivo!

---

## 🔄 Despliegues Automáticos

**Buenas noticias:** Tanto Vercel como Render tienen despliegue automático configurado.

Cada vez que hagas `git push` a tu rama `main`:
- ✅ Vercel redesplegará el frontend automáticamente
- ✅ Render redesplegará el backend automáticamente

No necesitas hacer nada más. ¡Es mágico! ✨

---

## 📚 Recursos Adicionales

- **Documentación Vercel:** https://vercel.com/docs
- **Documentación Render:** https://render.com/docs
- **Documentación Supabase:** https://supabase.com/docs
- **Documentación Upstash:** https://docs.upstash.com

---

## 🎉 ¡Felicidades!

Tu plataforma de aulas virtuales está ahora desplegada **100% GRATIS** en la nube.

Si tienes problemas, revisa la sección de **Solución de Problemas** o verifica los logs en cada plataforma.

**¡Disfruta tu plataforma! 🚀**
