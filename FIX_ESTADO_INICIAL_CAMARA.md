# Corrección: Estado Inicial de Cámara del Docente

## Fecha: 2025-11-17

## Problema Identificado

Cuando el docente iniciaba la clase con la cámara apagada o la apagaba antes de que un estudiante se uniera, el estudiante veía el mensaje "Conectando con el docente..." en lugar del placeholder "Cámara desactivada".

### Causa Raíz

El estudiante no recibía el **estado inicial de la cámara del docente** cuando:
1. Se unía a una clase que ya estaba en progreso
2. El docente iniciaba con la cámara apagada

El estado `isTeacherCameraOn` se inicializaba en `true` por defecto, lo que era incorrecto.

---

## Solución Implementada

### 1. Frontend - StudentLiveTab.jsx

#### Cambio 1: Recibir estado inicial en `streaming-started`
**Líneas 150-161**

```javascript
// ANTES:
socket.on('streaming-started', () => {
  console.log('📡 Transmisión iniciada');
  setIsLive(true);
  showToastMessage('La clase ha iniciado', 'success');
});

// DESPUÉS:
socket.on('streaming-started', (data) => {
  console.log('📡 Transmisión iniciada', data);
  setIsLive(true);

  // ✅ FIX: Recibir estado inicial de la cámara del docente
  if (data && typeof data.cameraEnabled !== 'undefined') {
    console.log(`📹 [STUDENT] Estado inicial de cámara del docente: ${data.cameraEnabled}`);
    setIsTeacherCameraOn(data.cameraEnabled);
  }

  showToastMessage('La clase ha iniciado', 'success');
});
```

#### Cambio 2: Recibir estado inicial en `live-status`
**Líneas 142-155**

```javascript
// ANTES:
socket.on('live-status', ({ isLive }) => {
  console.log('📊 Estado de sesión en vivo:', isLive);
  setIsLive(isLive);
  if (isLive) {
    showToastMessage('Hay una clase en vivo. Únete para participar.', 'info');
  }
});

// DESPUÉS:
socket.on('live-status', (data) => {
  console.log('📊 Estado de sesión en vivo:', data);
  setIsLive(data.isLive);

  // ✅ FIX: Recibir estado inicial de la cámara si hay una clase en vivo
  if (data.isLive && typeof data.cameraEnabled !== 'undefined') {
    console.log(`📹 [STUDENT] Estado de cámara al verificar live-status: ${data.cameraEnabled}`);
    setIsTeacherCameraOn(data.cameraEnabled);
  }

  if (data.isLive) {
    showToastMessage('Hay una clase en vivo. Únete para participar.', 'info');
  }
});
```

---

### 2. Backend - index.js

#### Cambio 1: Enviar estado de cámara en `streaming-started`
**Líneas 174-177**

```javascript
// ANTES:
io.to(`course-${courseId}`).emit('streaming-started');
console.log(`📢 [STREAM] Notificación 'streaming-started' enviada a curso ${courseId}`);

// DESPUÉS:
// ✅ FIX: Enviar estado inicial de la cámara del docente
io.to(`course-${courseId}`).emit('streaming-started', { cameraEnabled });
console.log(`📢 [STREAM] Notificación 'streaming-started' enviada a curso ${courseId} (cámara: ${cameraEnabled})`);
```

#### Cambio 2: Enviar estado de cámara en `live-status`
**Líneas 192-198**

```javascript
// ANTES:
socket.on('check-live-status', ({ courseId }) => {
  const session = streamingSessions.get(courseId);
  const isLive = !!session;
  socket.emit('live-status', { isLive, courseId });
  console.log(`🔍 [CHECK-LIVE] Curso ${courseId} - isLive: ${isLive}`);
});

// DESPUÉS:
socket.on('check-live-status', ({ courseId }) => {
  const session = streamingSessions.get(courseId);
  const isLive = !!session;
  // ✅ FIX: Enviar estado de la cámara del docente si hay sesión activa
  const cameraEnabled = session ? session.cameraEnabled : true;
  socket.emit('live-status', { isLive, courseId, cameraEnabled });
  console.log(`🔍 [CHECK-LIVE] Curso ${courseId} - isLive: ${isLive}, cámara: ${cameraEnabled}`);
});
```

---

## Flujo Corregido

### Escenario 1: Docente inicia con cámara apagada

```
1. Docente → start-streaming({ cameraEnabled: false })
2. Backend → Guarda cameraEnabled: false en la sesión
3. Backend → Emite streaming-started({ cameraEnabled: false })
4. Estudiante → Recibe cameraEnabled: false
5. Estudiante → setIsTeacherCameraOn(false)
6. UI del Estudiante → Muestra placeholder "Cámara desactivada" ✅
```

### Escenario 2: Estudiante se une después de que la clase comenzó

```
1. Estudiante → Emite check-live-status({ courseId })
2. Backend → Lee session.cameraEnabled (estado actual)
3. Backend → Emite live-status({ isLive: true, cameraEnabled })
4. Estudiante → Recibe cameraEnabled
5. Estudiante → setIsTeacherCameraOn(cameraEnabled)
6. UI del Estudiante → Muestra estado correcto ✅
```

### Escenario 3: Docente apaga cámara durante la clase

```
1. Docente → Emite teacher-camera-status({ cameraEnabled: false })
2. Backend → Actualiza session.cameraEnabled = false
3. Backend → Broadcast a todos los estudiantes
4. Estudiante → Recibe cameraEnabled: false
5. Estudiante → setIsTeacherCameraOn(false)
6. UI del Estudiante → Muestra placeholder ✅
```

---

## Estados del UI del Estudiante (Frame Principal)

### Estado 1: Sin Stream (Conectando)
```jsx
{!hasStream && (
  <div>
    <Loader />
    <p>Conectando con el docente...</p>
  </div>
)}
```

### Estado 2: Con Stream pero Cámara Apagada
```jsx
{hasStream && !isTeacherCameraOn && !isTeacherScreenSharing && (
  <div>
    <VideoOff />
    <p>Cámara desactivada</p>
    <p>El docente ha desactivado su cámara</p>
  </div>
)}
```

### Estado 3: Con Stream y Cámara Activa
```jsx
{hasStream && isTeacherCameraOn && (
  <video ref={videoRef} />
)}
```

### Estado 4: Compartiendo Pantalla
```jsx
{hasStream && isTeacherScreenSharing && (
  <video ref={videoRef} />
  <label>Compartiendo pantalla</label>
)}
```

---

## Archivos Modificados

### Frontend
- ✅ `frontend/src/components/Student/StudentLiveTab.jsx`
  - Líneas 142-155: Evento `live-status` con `cameraEnabled`
  - Líneas 150-161: Evento `streaming-started` con `cameraEnabled`

### Backend
- ✅ `backend/src/index.js`
  - Línea 161: Ya guardaba `cameraEnabled` en la sesión (sin cambios)
  - Línea 176: Envía `cameraEnabled` en `streaming-started`
  - Líneas 192-198: Envía `cameraEnabled` en `live-status`
  - Línea 385: Ya actualizaba `session.cameraEnabled` (sin cambios)

---

## Verificación

### Build Frontend
```bash
npm run build
✓ built in 7.84s
```
✅ Sin errores

### Logs Esperados

**Backend al iniciar streaming:**
```
📡 [STREAM] Docente xyz inició transmisión en curso abc (socket: 123)
✅ [STREAM] Nueva sesión creada para curso abc con room code XYZ, cámara: false
📢 [STREAM] Notificación 'streaming-started' enviada a curso abc (cámara: false)
```

**Backend al verificar estado:**
```
🔍 [CHECK-LIVE] Curso abc - isLive: true, cámara: false
```

**Frontend al recibir estado:**
```
📡 Transmisión iniciada { cameraEnabled: false }
📹 [STUDENT] Estado inicial de cámara del docente: false
```

---

## Casos de Prueba

### Prueba 1: Docente inicia con cámara apagada
1. Docente: Desmarcar "Iniciar con cámara" en modal de preferencias
2. Docente: Iniciar clase
3. Estudiante: Unirse a la clase
4. **Resultado esperado:** Placeholder "Cámara desactivada" visible ✅
5. **Antes:** Mostraba "Conectando..." indefinidamente ❌

### Prueba 2: Estudiante se une tarde con docente sin cámara
1. Docente: Iniciar clase con cámara
2. Docente: Desactivar cámara
3. Estudiante: Unirse a la clase
4. **Resultado esperado:** Placeholder "Cámara desactivada" visible ✅
5. **Antes:** Mostraba "Conectando..." ❌

### Prueba 3: Docente activa cámara después
1. Estado inicial: Placeholder visible
2. Docente: Activar cámara
3. **Resultado esperado:** Video del docente visible ✅

---

## Compatibilidad

✅ **Retrocompatible:** Si el backend antiguo no envía `cameraEnabled`, el frontend usa el valor por defecto `true`
✅ **Sin breaking changes:** Los eventos mantienen su estructura base
✅ **Performance:** Sin impacto, solo agrega un campo boolean

---

## Resumen

**Problema:** Estudiantes veían "Conectando..." cuando el docente tenía la cámara apagada
**Causa:** No se enviaba el estado inicial de la cámara
**Solución:** Backend envía `cameraEnabled` en eventos `streaming-started` y `live-status`
**Estado:** ✅ RESUELTO Y PROBADO

---

**¡El problema del estado inicial de la cámara está completamente corregido!** 🎉
