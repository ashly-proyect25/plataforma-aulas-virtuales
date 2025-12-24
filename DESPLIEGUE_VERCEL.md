# Guía de Despliegue en Vercel (Frontend)

## Backend ya desplegado ✅

Tu backend está funcionando en:
- **URL**: https://plataforma-backend-6jsy.onrender.com
- **Health Check**: https://plataforma-backend-6jsy.onrender.com/api/health

## Desplegar Frontend en Vercel

### Opción 1: Desde el Dashboard de Vercel (Recomendado)

1. **Ve a Vercel**: https://vercel.com/dashboard

2. **Importar proyecto**:
   - Haz clic en "Add New..." → "Project"
   - Conecta tu cuenta de GitHub si aún no lo has hecho
   - Busca el repositorio: `ashly-proyect25/plataforma-aulas-virtuales`
   - Haz clic en "Import"

3. **Configurar el proyecto**:
   - **Project Name**: `plataforma-aulas-virtuales` (o el nombre que prefieras)
   - **Framework Preset**: Vite
   - **Root Directory**: `frontend`
   - **Build Command**: `npm run build`
   - **Output Directory**: `dist`
   - **Install Command**: `npm install`

4. **Variables de entorno** (opcional, ya está en .env.production):
   - No es necesario agregar variables de entorno manualmente
   - El archivo `.env.production` ya tiene configurada la URL del backend

5. **Deploy**:
   - Haz clic en "Deploy"
   - Espera a que termine el build (1-3 minutos)

6. **¡Listo!**:
   - Tu frontend estará disponible en una URL como: `https://plataforma-aulas-virtuales.vercel.app`

### Opción 2: Desde la CLI de Vercel

```bash
# Instalar Vercel CLI
npm i -g vercel

# Ir al directorio del frontend
cd frontend

# Deploy
vercel

# Sigue las instrucciones:
# - Set up and deploy? Y
# - Which scope? (selecciona tu cuenta)
# - Link to existing project? N
# - What's your project's name? plataforma-aulas-virtuales
# - In which directory is your code located? ./
# - Want to override the settings? N
```

## Actualizar FRONTEND_URL en Render

Una vez que el frontend esté desplegado:

1. Copia la URL de tu frontend de Vercel (ej: `https://plataforma-aulas-virtuales.vercel.app`)

2. Ve al dashboard de Render → tu servicio backend

3. Ve a "Environment"

4. Busca o agrega la variable `FRONTEND_URL`:
   - **Key**: `FRONTEND_URL`
   - **Value**: `https://tu-app.vercel.app` (tu URL de Vercel)

5. Guarda los cambios

6. Render hará redeploy automáticamente

## Configuración de CORS

El backend ya está configurado para aceptar solicitudes del frontend. Una vez que actualices `FRONTEND_URL`, el CORS funcionará correctamente.

## Verificar funcionamiento

1. Abre tu frontend en el navegador
2. Intenta hacer login con las credenciales de admin/docente/estudiante
3. Verifica que la API responda correctamente
4. Prueba las funcionalidades en vivo (WebRTC, Socket.IO)

## Troubleshooting

### Error de CORS
- Asegúrate de que `FRONTEND_URL` en Render tenga la URL correcta de Vercel
- Verifica que no tenga `/` al final

### Error de conexión con API
- Verifica que el backend esté funcionando: https://plataforma-backend-6jsy.onrender.com/api/health
- Revisa la consola del navegador para ver errores específicos

### WebRTC no funciona
- Verifica que Socket.IO se esté conectando correctamente
- Revisa la consola del navegador para ver mensajes de Socket.IO

## URLs Finales

- **Backend**: https://plataforma-backend-6jsy.onrender.com
- **Frontend**: (se asignará después del deploy en Vercel)
- **Repositorio**: https://github.com/ashly-proyect25/plataforma-aulas-virtuales
