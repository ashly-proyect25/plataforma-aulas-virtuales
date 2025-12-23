# Fix: Estado Inicial de Screen Sharing del Docente

## Problema

Cuando un estudiante se une a una clase **mientras el docente está compartiendo pantalla**, ve "Conectando con el docente..." en lugar de la pantalla compartida.

### Logs del Error
```
📡 Transmisión iniciada Object
📹 [STUDENT] Estado inicial de cámara del docente: false
// ❌ Falta: Estado inicial de screen sharing
```

---

## Causa

El backend NO enviaba el estado de `isScreenSharing` cuando el estudiante se unía tarde a la clase.

**Estados que faltaban:**
- ❌ `streaming-started` no incluía `isScreenSharing`
- ❌ `live-status` no incluía `isScreenSharing`

---

## Solución Implementada

### Backend Changes

#### 1. start-streaming (Líneas 176-180)
```javascript
io.to(`course-${courseId}`).emit('streaming-started', {
  cameraEnabled,
  isScreenSharing: false // Al iniciar nunca está compartiendo
});
```

#### 2. join-viewer (Líneas 241-258)
```javascript
const currentCameraState = session.cameraEnabled !== undefined ? session.cameraEnabled : true;
const currentScreenSharingState = session.isScreenSharing || false;

socket.emit('streaming-started', {
  cameraEnabled: currentCameraState,
  isScreenSharing: currentScreenSharingState
});

// Eventos separados por retrocompatibilidad
socket.emit('teacher-camera-status', { cameraEnabled: currentCameraState });

if (currentScreenSharingState) {
  socket.emit('teacher-screen-share-status', { isSharing: currentScreenSharingState });
}
```

#### 3. check-live-status (Líneas 195-203)
```javascript
const cameraEnabled = session ? (session.cameraEnabled !== undefined ? session.cameraEnabled : true) : true;
const isScreenSharing = session ? (session.isScreenSharing || false) : false;

socket.emit('live-status', { isLive, courseId, cameraEnabled, isScreenSharing });
```

### Frontend Changes

#### 1. live-status listener (Líneas 142-161)
```javascript
socket.on('live-status', (data) => {
  setIsLive(data.isLive);

  if (data.isLive && typeof data.cameraEnabled !== 'undefined') {
    setIsTeacherCameraOn(data.cameraEnabled);
  }

  // ✅ NEW: Recibir screen sharing
  if (data.isLive && typeof data.isScreenSharing !== 'undefined') {
    setIsTeacherScreenSharing(data.isScreenSharing);
  }
});
```

#### 2. streaming-started listener (Líneas 163-180)
```javascript
socket.on('streaming-started', (data) => {
  setIsLive(true);

  if (data && typeof data.cameraEnabled !== 'undefined') {
    setIsTeacherCameraOn(data.cameraEnabled);
  }

  // ✅ NEW: Recibir screen sharing
  if (data && typeof data.isScreenSharing !== 'undefined') {
    setIsTeacherScreenSharing(data.isScreenSharing);
  }
});
```

---

## Flujo Corregido

### Caso: Estudiante se une mientras docente comparte pantalla

```
1. Docente compartiendo pantalla (session.isScreenSharing = true)
2. Estudiante → join-viewer()
3. Backend → Lee session.isScreenSharing (true)
4. Backend → socket.emit('streaming-started', {
     cameraEnabled: false,
     isScreenSharing: true
   })
5. Frontend → setIsTeacherScreenSharing(true)
6. UI → NO muestra "Conectando..." porque isTeacherScreenSharing = true ✅
7. UI → Muestra la pantalla compartida cuando llegue el stream ✅
```

---

## Lógica de Visualización del Estudiante

```javascript
{!isTeacherCameraOn && !isTeacherScreenSharing ? (
  // Cámara apagada Y NO compartiendo → Placeholder
  <VideoOff>Cámara desactivada</VideoOff>
) : !hasStream ? (
  // Sin stream aún → Conectando (solo si NO está compartiendo)
  <Loader>Conectando...</Loader>
) : (
  // Todo OK → Mostrar video
  <video />
)}
```

### Estados Cubiertos

| Cámara | Screen Share | hasStream | UI Muestra |
|--------|--------------|-----------|------------|
| ❌ | ❌ | ❌ | Placeholder "Cámara desactivada" ✅ |
| ❌ | ❌ | ✅ | Placeholder "Cámara desactivada" ✅ |
| ✅ | ❌ | ❌ | "Conectando..." |
| ✅ | ❌ | ✅ | Video de cámara |
| ❌ | ✅ | ❌ | "Conectando..." (normal, stream llegará) ✅ |
| ❌ | ✅ | ✅ | Pantalla compartida ✅ |
| ✅ | ✅ | ✅ | Pantalla compartida ✅ |

---

## Archivos Modificados

### Backend
✅ `backend/src/index.js`
- Líneas 176-180: `start-streaming` con `isScreenSharing: false`
- Líneas 241-258: `join-viewer` con estado actual de `isScreenSharing`
- Líneas 195-203: `check-live-status` con `isScreenSharing`

### Frontend
✅ `frontend/src/components/Student/StudentLiveTab.jsx`
- Líneas 142-161: `live-status` recibe y procesa `isScreenSharing`
- Líneas 163-180: `streaming-started` recibe y procesa `isScreenSharing`

---

## Logs Esperados

### Backend
```
📢 [VIEWER] Notificación 'streaming-started' enviada a viewer abc (cámara: false, screenShare: true)
📹 [VIEWER] Initial camera state (false) sent to viewer abc
📺 [VIEWER] Initial screen share state (true) sent to viewer abc
```

### Frontend
```
📡 Transmisión iniciada { cameraEnabled: false, isScreenSharing: true }
📹 [STUDENT] Estado inicial de cámara del docente: false
📺 [STUDENT] Estado inicial de screen sharing del docente: true
```

---

## Resumen

**Problema:** "Conectando..." al unirse mientras docente comparte pantalla
**Causa:** Backend no enviaba `isScreenSharing` en eventos iniciales
**Solución:**
- Backend envía `isScreenSharing` en todos los eventos iniciales
- Frontend procesa el estado y actualiza `isTeacherScreenSharing`
- Lógica de visualización verifica screen sharing ANTES de mostrar "Conectando..."

**Estado:** ✅ CORREGIDO

---

**Recarga la página del estudiante y únete mientras el docente comparte pantalla.**
**Ahora debería mostrar el stream de pantalla compartida correctamente.** 🎉
