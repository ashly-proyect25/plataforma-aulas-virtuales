import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import dotenv from 'dotenv';
// Importar configuraciones
import prisma from './config/db.js';
import redisClient from './config/redis.js';
// Importar rutas
import authRoutes from './routes/auth.js';
import coursesRoutes from './routes/courses.js';
import resourcesRoutes from './routes/resources.js';
import quizzesRoutes from './routes/quizzes.js';
// Cargar variables de entorno
dotenv.config();
// Crear aplicación Express
const app = express();
const httpServer = createServer(app);
// Configurar Socket.IO
const io = new Server(httpServer, {
  cors: {
    origin: process.env.FRONTEND_URL || 'http://localhost:5173',
    methods: ['GET', 'POST'],
    credentials: true,
  },
});
// ==================== MIDDLEWARES ====================
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:5173',
  credentials: true,
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
// Logging middleware (desarrollo)
if (process.env.NODE_ENV === 'development') {
  app.use((req, res, next) => {
    console.log(`📨 [REQUEST] ${req.method} ${req.path}`);
    if (req.path.includes('quiz')) {
      console.log('🔍 [QUIZ-REQUEST-DETECTED] Full URL:', req.originalUrl);
      console.log('🔍 [QUIZ-REQUEST-DETECTED] Path:', req.path);
      console.log('🔍 [QUIZ-REQUEST-DETECTED] Base URL:', req.baseUrl);
    }
    next();
  });
}
// ==================== RUTAS ====================
app.get('/', (req, res) => {
  res.json({
    message: 'API Plataforma Aulas Virtuales',
    version: '1.0.0',
    status: 'online'
  });
});
// Rutas de autenticación
app.use('/api', authRoutes);
// ✅ IMPORTANTE: Rutas específicas PRIMERO (quizzes y resources)
// para que no sean capturadas por las rutas genéricas de courses
app.use('/api', quizzesRoutes);
app.use('/api', resourcesRoutes);
// Rutas de cursos (debe ir AL FINAL para no capturar subrutas)
app.use('/api/courses', coursesRoutes);
// Health check
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    database: prisma ? 'connected' : 'disconnected',
    redis: redisClient.isOpen ? 'connected' : 'disconnected',
    timestamp: new Date().toISOString()
  });
});
// ==================== SOCKET.IO - WebRTC ====================
const streamingSessions = new Map(); // courseId -> { teacherId, viewers: Map(socketId -> {id, name, email, sessionTimeout}), screenSharer: null }
const sessionTimeouts = new Map(); // socketId -> timeoutId

// Función para generar room code único
function generateRoomCode() {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let code = '';
  for (let i = 0; i < 8; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

// Función para guardar sesión en la base de datos
async function saveSession(viewerInfo, courseId, duration) {
  try {
    // Primero necesitamos encontrar el classroom del curso
    const classroom = await prisma.classroom.findFirst({
      where: { courseId: parseInt(courseId), isLive: true }
    });

    if (!classroom || !viewerInfo.userId) {
      console.log('⚠️ No se pudo guardar sesión: classroom o userId no encontrado');
      return;
    }

    await prisma.session.create({
      data: {
        classroomId: classroom.id,
        userId: viewerInfo.userId,
        duration: Math.floor(duration / 1000), // Convertir ms a segundos
        leftAt: new Date()
      }
    });

    console.log(`✅ Sesión guardada para usuario ${viewerInfo.userId} - Duración: ${Math.floor(duration / 1000)}s`);
  } catch (error) {
    console.error('❌ Error al guardar sesión:', error);
  }
}

// Función para limpiar sesión por inactividad
function scheduleSessionCleanup(socketId, viewerInfo, courseId) {
  // Limpiar timeout anterior si existe
  if (sessionTimeouts.has(socketId)) {
    clearTimeout(sessionTimeouts.get(socketId));
  }

  // Programar nuevo timeout de 5 minutos (300000 ms)
  const timeoutId = setTimeout(async () => {
    console.log(`⏰ Timeout de 5 minutos alcanzado para socket ${socketId}`);

    const session = streamingSessions.get(courseId);
    if (session && session.viewers.has(socketId)) {
      const viewer = session.viewers.get(socketId);
      const duration = Date.now() - viewer.joinedAt.getTime();

      // Guardar sesión en base de datos
      await saveSession(viewer, courseId, duration);

      // Limpiar viewer
      session.viewers.delete(socketId);
      const viewersList = Array.from(session.viewers.values());

      io.to(session.teacherId).emit('viewer-left', socketId);
      io.to(`course-${courseId}`).emit('viewer-count', session.viewers.size);
      io.to(`course-${courseId}`).emit('viewers-list', viewersList); // ✅ Enviar a TODOS los participantes
    }

    sessionTimeouts.delete(socketId);
  }, 5 * 60 * 1000); // 5 minutos

  sessionTimeouts.set(socketId, timeoutId);
}

io.on('connection', (socket) => {
  console.log('✅ Usuario conectado:', socket.id);

  // Iniciar transmisión (Docente)
  socket.on('start-streaming', async ({ courseId, teacherId, cameraEnabled = true }) => {
    console.log(`📡 [STREAM] Docente ${teacherId} inició transmisión en curso ${courseId} (socket: ${socket.id})`);

    const roomCode = generateRoomCode();

    // ✅ Registrar clase en vivo en la base de datos
    try {
      const now = new Date();
      const todayStart = new Date(now);
      todayStart.setHours(0, 0, 0, 0);
      const todayEnd = new Date(now);
      todayEnd.setHours(23, 59, 59, 999);

      // Buscar si hay una clase programada para hoy
      let classroom = await prisma.classroom.findFirst({
        where: {
          courseId: parseInt(courseId),
          scheduledAt: {
            gte: todayStart,
            lte: todayEnd
          }
        }
      });

      if (classroom) {
        // Actualizar clase existente a "en vivo"
        await prisma.classroom.update({
          where: { id: classroom.id },
          data: {
            isLive: true,
            roomCode: roomCode
          }
        });
        console.log(`✅ [DB] Clase programada ${classroom.id} marcada como en vivo`);
      } else {
        // Crear nueva clase en vivo si no había programada
        classroom = await prisma.classroom.create({
          data: {
            courseId: parseInt(courseId),
            title: `Clase en Vivo - ${new Date().toLocaleDateString('es-ES')}`,
            description: 'Clase en vivo no programada',
            scheduledAt: now,
            duration: 60,
            isLive: true,
            roomCode: roomCode
          }
        });
        console.log(`✅ [DB] Nueva clase en vivo creada: ${classroom.id}`);
      }
    } catch (error) {
      console.error('❌ [DB] Error al registrar clase en vivo:', error);
      // Continuar aunque falle el registro en BD
    }

    if (!streamingSessions.has(courseId)) {
      streamingSessions.set(courseId, {
        teacherId: socket.id,
        viewers: new Map(),
        roomCode: roomCode,
        cameraEnabled: cameraEnabled, // ✅ Store initial camera state
        screenSharer: null // ✅ Track who is sharing screen (null, teacherId, or viewerId)
      });
      console.log(`✅ [STREAM] Nueva sesión creada para curso ${courseId} con room code ${roomCode}, cámara: ${cameraEnabled}`);
    } else {
      console.log(`⚠️ [STREAM] Sesión ya existente para curso ${courseId}`);
    }

    socket.join(`course-${courseId}`);

    // Enviar room code al docente
    socket.emit('room-code', roomCode);
    console.log(`🔑 [STREAM] Room code ${roomCode} enviado al docente`);

    // Notificar a todos los estudiantes del curso que hay transmisión
    // ✅ FIX: Enviar estado inicial de la cámara del docente y screen sharing
    io.to(`course-${courseId}`).emit('streaming-started', {
      cameraEnabled,
      isScreenSharing: false // Al iniciar nunca está compartiendo pantalla
    });
    console.log(`📢 [STREAM] Notificación 'streaming-started' enviada a curso ${courseId} (cámara: ${cameraEnabled}, screenShare: false)`);
  });

  // Detener transmisión (Docente)
  socket.on('stop-streaming', async ({ courseId }) => {
    console.log(`📴 [STREAM] Transmisión detenida en curso ${courseId}`);

    // ✅ Marcar clase como finalizada en la base de datos
    try {
      await prisma.classroom.updateMany({
        where: {
          courseId: parseInt(courseId),
          isLive: true
        },
        data: {
          isLive: false
        }
      });
      console.log(`✅ [DB] Clases en vivo del curso ${courseId} marcadas como finalizadas`);
    } catch (error) {
      console.error('❌ [DB] Error al finalizar clase:', error);
      // Continuar aunque falle
    }

    // Notificar a todos los espectadores
    io.to(`course-${courseId}`).emit('streaming-stopped');

    streamingSessions.delete(courseId);
    socket.leave(`course-${courseId}`);
  });

  // Verificar si hay una sesión en vivo (para cuando estudiante entra después de que ya empezó)
  socket.on('check-live-status', ({ courseId }) => {
    const session = streamingSessions.get(courseId);
    const isLive = !!session;
    // ✅ FIX: Enviar estado de la cámara y screen sharing del docente si hay sesión activa
    const cameraEnabled = session ? (session.cameraEnabled !== undefined ? session.cameraEnabled : true) : true;
    const isScreenSharing = session ? (session.isScreenSharing || false) : false;

    socket.emit('live-status', { isLive, courseId, cameraEnabled, isScreenSharing });
    console.log(`🔍 [CHECK-LIVE] Curso ${courseId} - isLive: ${isLive}, cámara: ${cameraEnabled}, screenShare: ${isScreenSharing}`);
  });

  // Unirse como espectador (Estudiante)
  socket.on('join-viewer', ({ courseId, userInfo }) => {
    console.log(`👤 [VIEWER] Estudiante ${socket.id} se unió al curso ${courseId}`, userInfo);

    socket.join(`course-${courseId}`);
    console.log(`✅ [VIEWER] Socket ${socket.id} unido a room course-${courseId}`);

    const session = streamingSessions.get(courseId);
    if (session) {
      console.log(`📺 [VIEWER] Sesión en vivo encontrada para curso ${courseId}`);
      // Guardar información del viewer con userId para las sesiones
      const viewerData = {
        id: socket.id,
        name: userInfo?.name || 'Usuario',
        email: userInfo?.email || '',
        userId: userInfo?.id || null,
        joinedAt: new Date(),
        cameraEnabled: false, // ✅ Estado inicial de cámara
        isScreenSharing: false // ✅ Estado inicial de pantalla compartida
      };

      session.viewers.set(socket.id, viewerData);

      // Programar limpieza por inactividad (5 minutos)
      scheduleSessionCleanup(socket.id, viewerData, courseId);

      // Convertir Map a Array para enviar
      const viewersList = Array.from(session.viewers.values());
      console.log(`👥 [VIEWER] Total de espectadores: ${session.viewers.size}`);

      // Notificar al docente que hay un nuevo espectador
      io.to(session.teacherId).emit('viewer-joined', {
        viewerId: socket.id,
        viewerInfo: viewersList[viewersList.length - 1]
      });
      console.log(`📤 [VIEWER] Notificación 'viewer-joined' enviada al teacher ${session.teacherId}`);

      // Enviar contador y lista de espectadores
      io.to(`course-${courseId}`).emit('viewer-count', session.viewers.size);
      io.to(`course-${courseId}`).emit('viewers-list', viewersList); // ✅ Enviar a TODOS los participantes
      console.log(`📊 [VIEWER] Contador y lista de espectadores actualizada`);

      // ✅ CRITICAL FIX: Notificar al estudiante que la sesión YA está en vivo CON el estado de la cámara Y screen sharing
      const currentCameraState = session.cameraEnabled !== undefined ? session.cameraEnabled : true;
      const currentScreenSharingState = session.isScreenSharing || false;
      const isScreenShareBlockedState = session.isScreenShareBlocked || false;

      socket.emit('streaming-started', {
        cameraEnabled: currentCameraState,
        isScreenSharing: currentScreenSharingState
      });
      console.log(`📢 [VIEWER] Notificación 'streaming-started' enviada a viewer ${socket.id} (cámara: ${currentCameraState}, screenShare: ${currentScreenSharingState})`);

      // También enviar eventos separados por retrocompatibilidad
      socket.emit('teacher-camera-status', { cameraEnabled: currentCameraState });
      console.log(`📹 [VIEWER] Initial camera state (${currentCameraState}) sent to viewer ${socket.id}`);

      if (currentScreenSharingState) {
        socket.emit('teacher-screen-share-status', { isSharing: currentScreenSharingState });
        console.log(`📺 [VIEWER] Initial screen share state (${currentScreenSharingState}) sent to viewer ${socket.id}`);
      }

      // ✅ Enviar estado inicial de bloqueo de compartir pantalla
      if (isScreenShareBlockedState) {
        socket.emit('screen-share-blocked');
        console.log(`🚫 [VIEWER] Initial screen share blocked state sent to viewer ${socket.id}`);
      }

      // ✅ CRITICAL FIX: Enviar estado de cámara y pantalla compartida de todos los estudiantes conectados
      session.viewers.forEach((otherViewer, otherViewerId) => {
        if (otherViewerId !== socket.id) {
          // Enviar estado de cámara
          if (otherViewer.cameraEnabled !== undefined) {
            socket.emit('peer-student-camera-status', {
              viewerId: otherViewerId,
              cameraEnabled: otherViewer.cameraEnabled
            });
            console.log(`📹 [VIEWER] Initial camera state for ${otherViewerId}: ${otherViewer.cameraEnabled}`);
          }

          // Enviar estado de pantalla compartida
          if (otherViewer.isScreenSharing !== undefined) {
            socket.emit('peer-student-screen-share-status', {
              viewerId: otherViewerId,
              viewerInfo: otherViewer,
              isSharing: otherViewer.isScreenSharing
            });
            console.log(`📺 [VIEWER] Initial screen share state for ${otherViewerId}: ${otherViewer.isScreenSharing}`);
          }
        }
      });
    } else {
      console.log(`⚠️ [VIEWER] No hay sesión en vivo para curso ${courseId}`);
    }
  });

  // Salir como espectador
  socket.on('leave-viewer', async ({ courseId }) => {
    const session = streamingSessions.get(courseId);
    if (session && session.viewers.has(socket.id)) {
      const viewer = session.viewers.get(socket.id);
      const duration = Date.now() - viewer.joinedAt.getTime();

      // Cancelar timeout de inactividad
      if (sessionTimeouts.has(socket.id)) {
        clearTimeout(sessionTimeouts.get(socket.id));
        sessionTimeouts.delete(socket.id);
      }

      // Guardar sesión en base de datos
      await saveSession(viewer, courseId, duration);

      // Limpiar viewer
      session.viewers.delete(socket.id);

      const viewersList = Array.from(session.viewers.values());

      io.to(session.teacherId).emit('viewer-left', socket.id);
      io.to(`course-${courseId}`).emit('viewer-count', session.viewers.size);
      io.to(`course-${courseId}`).emit('viewers-list', viewersList); // ✅ Enviar a TODOS los participantes
    }
    socket.leave(`course-${courseId}`);
  });

  // WebRTC Signaling
  socket.on('offer', ({ viewerId, offer }) => {
    console.log(`📤 [WEBRTC-OFFER] Teacher ${socket.id} → Viewer ${viewerId}`);
    console.log(`📊 [WEBRTC-OFFER] SDP type: ${offer.type}`);
    io.to(viewerId).emit('offer', { offer });
  });

  socket.on('answer', ({ answer }) => {
    console.log(`📥 [SIGNAL] Answer recibido de viewer ${socket.id}`);
    // Encontrar el curso y enviar la respuesta al docente
    streamingSessions.forEach((session, courseId) => {
      if (session.viewers.has(socket.id)) {
        console.log(`📤 [SIGNAL] Reenviando answer de viewer ${socket.id} a teacher ${session.teacherId}`);
        io.to(session.teacherId).emit('answer', { viewerId: socket.id, answer });
      }
    });
  });

  socket.on('ice-candidate', ({ viewerId, candidate }) => {
    console.log(`🧊 [ICE] Candidato recibido - viewerId: ${viewerId}, from: ${socket.id}`);
    if (viewerId) {
      // Del teacher al viewer específico
      io.to(viewerId).emit('ice-candidate', { viewerId: socket.id, candidate });
      console.log(`🧊 [ICE] Enviando candidato a viewer ${viewerId}`);
    } else {
      // Candidato del viewer al teacher
      streamingSessions.forEach((session, courseId) => {
        if (session.viewers.has(socket.id)) {
          io.to(session.teacherId).emit('ice-candidate', { viewerId: socket.id, candidate });
          console.log(`🧊 [ICE] Enviando candidato de viewer ${socket.id} a teacher ${session.teacherId}`);
        }
      });
    }
  });

  // ✅ BIDIRECTIONAL VIDEO: Estudiante envía offer al profesor Y a otros estudiantes para compartir su cámara/audio
  socket.on('student-offer', ({ offer, targetViewerId }) => {
    console.log(`📥 [STUDENT-OFFER] Received from ${socket.id}, targetViewerId: ${targetViewerId || 'broadcast'}`);

    streamingSessions.forEach((session, courseId) => {
      if (session.viewers.has(socket.id)) {
        const viewerInfo = session.viewers.get(socket.id);
        console.log(`📋 [STUDENT-OFFER] Student info: ${viewerInfo.name}, viewers in session: ${session.viewers.size}`);

        if (targetViewerId) {
          // Enviar offer a un estudiante específico (P2P entre estudiantes)
          console.log(`📤 [STUDENT-P2P] Enviando offer de ${viewerInfo.name} (${socket.id}) a estudiante ${targetViewerId}`);
          io.to(targetViewerId).emit('peer-student-offer', {
            fromViewerId: socket.id,
            offer,
            viewerInfo
          });
        } else {
          // Enviar al profesor (comportamiento original)
          console.log(`📤 [STUDENT-TEACHER] Enviando offer de ${viewerInfo.name} (${socket.id}) al docente ${session.teacherId}`);
          io.to(session.teacherId).emit('student-offer', {
            viewerId: socket.id,
            offer,
            viewerInfo
          });

          // ✅ FIX: NO hacer broadcast automático a estudiantes
          // El frontend ya envía offers dirigidos con targetViewerId para P2P
          // Broadcast automático causaba duplicación de offers
        }
      }
    });
  });

  // ✅ BIDIRECTIONAL VIDEO: Profesor envía answer al estudiante
  socket.on('student-answer', ({ viewerId, answer }) => {
    io.to(viewerId).emit('student-answer', { answer });
  });

  // ✅ STUDENT P2P: Estudiante envía answer a otro estudiante
  socket.on('peer-student-answer', ({ toViewerId, answer }) => {
    console.log(`📥 [STUDENT-P2P] Enviando answer de ${socket.id} a estudiante ${toViewerId}`);
    io.to(toViewerId).emit('peer-student-answer', {
      fromViewerId: socket.id,
      answer
    });
  });

  // ✅ STUDENT P2P: ICE candidates entre estudiantes
  socket.on('peer-student-ice-candidate', ({ toViewerId, candidate }) => {
    console.log(`🧊 [STUDENT-P2P] ICE candidate de ${socket.id} a estudiante ${toViewerId}`);
    io.to(toViewerId).emit('peer-student-ice-candidate', {
      fromViewerId: socket.id,
      candidate
    });
  });

  // ✅ BIDIRECTIONAL VIDEO: ICE candidates para conexión bidireccional
  socket.on('student-ice-candidate', ({ viewerId, candidate }) => {
    if (viewerId) {
      // Del profesor al estudiante
      io.to(viewerId).emit('student-ice-candidate', { candidate });
    } else {
      // Del estudiante al profesor
      streamingSessions.forEach((session, courseId) => {
        if (session.viewers.has(socket.id)) {
          io.to(session.teacherId).emit('student-ice-candidate', {
            viewerId: socket.id,
            candidate
          });
        }
      });
    }
  });

  // ✅ SCREEN SHARE AUTHORIZATION: Student requests screen share permission
  socket.on('request-screen-share', () => {
    console.log('📺 [SCREEN-SHARE] Student requesting screen share:', socket.id);
    streamingSessions.forEach((session, courseId) => {
      if (session.viewers.has(socket.id)) {
        const viewer = session.viewers.get(socket.id);
        io.to(session.teacherId).emit('screen-share-request', {
          viewerId: socket.id,
          viewerName: viewer.name
        });
        console.log(`📤 [SCREEN-SHARE] Request sent to teacher from ${viewer.name}`);
      }
    });
  });

  // ✅ SCREEN SHARE AUTHORIZATION: Teacher approves screen share
  socket.on('approve-screen-share', ({ viewerId }) => {
    console.log('✅ [SCREEN-SHARE] Teacher approved screen share for:', viewerId);
    io.to(viewerId).emit('screen-share-approved');
  });

  // ✅ SCREEN SHARE AUTHORIZATION: Teacher denies screen share
  socket.on('deny-screen-share', ({ viewerId }) => {
    console.log('❌ [SCREEN-SHARE] Teacher denied screen share for:', viewerId);
    io.to(viewerId).emit('screen-share-denied');
  });

  // ✅ CAMERA STATUS: Notify students when teacher enables/disables camera
  socket.on('teacher-camera-status', ({ courseId, cameraEnabled }) => {
    console.log(`📹 [CAMERA-STATUS] Teacher camera ${cameraEnabled ? 'enabled' : 'disabled'} in course ${courseId}`);
    const session = streamingSessions.get(courseId);
    if (session) {
      // ✅ Update camera state in session
      session.cameraEnabled = cameraEnabled;
      console.log(`💾 [CAMERA-STATUS] Updated session camera state to: ${cameraEnabled}`);

      // Broadcast to all viewers in this course
      session.viewers.forEach((viewer, viewerId) => {
        io.to(viewerId).emit('teacher-camera-status', { cameraEnabled });
      });

      // ✅ CRITICAL FIX: When camera is re-enabled, force students to refresh their peer connections
      if (cameraEnabled) {
        console.log(`🔄 [CAMERA-STATUS] Triggering stream refresh for all viewers in course ${courseId}`);
        session.viewers.forEach((viewer, viewerId) => {
          io.to(viewerId).emit('teacher-stream-refresh');
        });
      }
    }
  });

  // ✅ CAMERA STATUS: Notify all participants when a student enables/disables camera
  socket.on('student-camera-status', ({ cameraEnabled }) => {
    console.log(`📹 [STUDENT-CAMERA-STATUS] Student ${socket.id} camera ${cameraEnabled ? 'enabled' : 'disabled'}`);

    streamingSessions.forEach((session, courseId) => {
      if (session.viewers.has(socket.id)) {
        const viewer = session.viewers.get(socket.id);

        // Update camera state for this viewer
        viewer.cameraEnabled = cameraEnabled;
        console.log(`💾 [STUDENT-CAMERA-STATUS] Updated camera state for ${socket.id} to: ${cameraEnabled}`);

        // Broadcast to teacher
        io.to(session.teacherId).emit('student-camera-status', {
          viewerId: socket.id,
          cameraEnabled
        });

        // Broadcast to all other students (P2P)
        session.viewers.forEach((otherViewer, otherViewerId) => {
          if (otherViewerId !== socket.id) {
            io.to(otherViewerId).emit('peer-student-camera-status', {
              viewerId: socket.id,
              cameraEnabled
            });
          }
        });

        console.log(`📤 [STUDENT-CAMERA-STATUS] Broadcasted camera status for ${socket.id} to all participants`);
      }
    });
  });

  // ✅ SCREEN SHARE STATUS: Notify all participants when a student starts/stops screen sharing
  socket.on('student-screen-share-status', ({ isSharing }) => {
    console.log(`📺 [STUDENT-SCREEN-STATUS] Student ${socket.id} screen sharing ${isSharing ? 'started' : 'stopped'}`);

    streamingSessions.forEach((session, courseId) => {
      if (session.viewers.has(socket.id)) {
        const viewer = session.viewers.get(socket.id);

        // Update screen sharing state for this viewer
        viewer.isScreenSharing = isSharing;
        console.log(`💾 [STUDENT-SCREEN-STATUS] Updated screen sharing state for ${socket.id} to: ${isSharing}`);

        // Broadcast to teacher
        io.to(session.teacherId).emit('student-screen-share-status', {
          viewerId: socket.id,
          isSharing
        });

        // Broadcast to all other students (P2P)
        session.viewers.forEach((otherViewer, otherViewerId) => {
          if (otherViewerId !== socket.id) {
            io.to(otherViewerId).emit('peer-student-screen-share-status', {
              viewerId: socket.id,
              viewerInfo: viewer,
              isSharing
            });
          }
        });

        console.log(`📤 [STUDENT-SCREEN-STATUS] Broadcasted screen sharing status for ${socket.id} to all participants`);
      }
    });
  });

  // ✅ DUAL STREAM: Request to start screen sharing with lock
  socket.on('request-start-screen-share', ({ courseId }) => {
    console.log(`📺 [SCREEN-SHARE-LOCK] Request to start screen sharing from ${socket.id} in course ${courseId}`);
    const session = streamingSessions.get(courseId);

    if (session) {
      // Check if someone else is already sharing
      if (session.screenSharer && session.screenSharer !== socket.id) {
        // Someone else is sharing - deny request
        const sharerInfo = session.screenSharer === session.teacherId
          ? { name: 'Docente', isTeacher: true }
          : session.viewers.get(session.screenSharer);

        console.log(`❌ [SCREEN-SHARE-LOCK] Denied: ${sharerInfo.name} is already sharing`);
        socket.emit('screen-share-denied', {
          reason: 'already-sharing',
          sharerName: sharerInfo.name
        });
      } else {
        // No one is sharing or the same user is sharing - approve
        session.screenSharer = socket.id;
        console.log(`✅ [SCREEN-SHARE-LOCK] Approved for ${socket.id}`);
        socket.emit('screen-share-lock-acquired');

        // Update screen share state in session
        session.isScreenSharing = true;

        // Notify all participants who is sharing
        const sharerInfo = socket.id === session.teacherId
          ? { name: 'Docente', isTeacher: true }
          : session.viewers.get(socket.id);

        io.to(`course-${courseId}`).emit('screen-sharer-changed', {
          sharerId: socket.id,
          sharerName: sharerInfo.name,
          isSharing: true
        });
      }
    }
  });

  // ✅ DUAL STREAM: Release screen sharing lock
  socket.on('stop-screen-share', ({ courseId }) => {
    console.log(`📺 [SCREEN-SHARE-LOCK] Stopping screen share from ${socket.id} in course ${courseId}`);
    const session = streamingSessions.get(courseId);

    if (session && session.screenSharer === socket.id) {
      session.screenSharer = null;
      session.isScreenSharing = false;
      console.log(`✅ [SCREEN-SHARE-LOCK] Lock released by ${socket.id}`);

      // Notify all participants
      io.to(`course-${courseId}`).emit('screen-sharer-changed', {
        sharerId: null,
        sharerName: null,
        isSharing: false
      });
    }
  });

  // ✅ SCREEN SHARE STATUS: Notify students when teacher starts/stops screen sharing (backward compatibility)
  socket.on('teacher-screen-share-status', ({ courseId, isSharing }) => {
    console.log(`📺 [SCREEN-SHARE-STATUS] Teacher ${isSharing ? 'started' : 'stopped'} screen sharing in course ${courseId}`);
    const session = streamingSessions.get(courseId);
    if (session) {
      // ✅ Update screen share state in session
      session.isScreenSharing = isSharing;
      console.log(`💾 [SCREEN-SHARE-STATUS] Updated session screen share state to: ${isSharing}`);

      // Broadcast to all viewers in this course
      session.viewers.forEach((viewer, viewerId) => {
        io.to(viewerId).emit('teacher-screen-share-status', { isSharing });
      });
    }
  });

  // ✅ MUTE ALL STUDENTS: Teacher mutes all students
  socket.on('mute-all-students', ({ courseId }) => {
    console.log(`🔇 [MUTE-ALL] Teacher muting all students in course ${courseId}`);
    const session = streamingSessions.get(courseId);
    if (session) {
      // Broadcast to all viewers in this course
      session.viewers.forEach((viewer, viewerId) => {
        io.to(viewerId).emit('mute-student');
        console.log(`🔇 [MUTE-ALL] Mute signal sent to student ${viewerId} (${viewer.name})`);
      });
      console.log(`✅ [MUTE-ALL] Total students muted: ${session.viewers.size}`);
    }
  });

  socket.on('unmute-all-students', ({ courseId }) => {
    console.log(`🎤 [UNMUTE-ALL] Teacher allowing all students to unmute in course ${courseId}`);
    const session = streamingSessions.get(courseId);
    if (session) {
      // Broadcast to all viewers in this course
      session.viewers.forEach((viewer, viewerId) => {
        io.to(viewerId).emit('unmute-student');
        console.log(`🎤 [UNMUTE-ALL] Unmute signal sent to student ${viewerId} (${viewer.name})`);
      });
      console.log(`✅ [UNMUTE-ALL] Total students can now unmute: ${session.viewers.size}`);
    }
  });

  // ✅ BLOCK SCREEN SHARE: Teacher blocks screen sharing for all students
  socket.on('block-screen-share', ({ courseId }) => {
    console.log(`🚫 [BLOCK-SCREEN] Teacher blocking screen share for all students in course ${courseId}`);
    const session = streamingSessions.get(courseId);
    if (session) {
      session.isScreenShareBlocked = true;
      // Broadcast to all viewers in this course
      session.viewers.forEach((viewer, viewerId) => {
        io.to(viewerId).emit('screen-share-blocked');
        console.log(`🚫 [BLOCK-SCREEN] Block signal sent to student ${viewerId} (${viewer.name})`);
      });
      console.log(`✅ [BLOCK-SCREEN] Screen sharing blocked for ${session.viewers.size} students`);
    }
  });

  socket.on('unblock-screen-share', ({ courseId }) => {
    console.log(`✅ [UNBLOCK-SCREEN] Teacher allowing screen share for all students in course ${courseId}`);
    const session = streamingSessions.get(courseId);
    if (session) {
      session.isScreenShareBlocked = false;
      // Broadcast to all viewers in this course
      session.viewers.forEach((viewer, viewerId) => {
        io.to(viewerId).emit('screen-share-unblocked');
        console.log(`✅ [UNBLOCK-SCREEN] Unblock signal sent to student ${viewerId} (${viewer.name})`);
      });
      console.log(`✅ [UNBLOCK-SCREEN] Screen sharing allowed for ${session.viewers.size} students`);
    }
  });

  // Chat events
  socket.on('chat-message', ({ courseId, message }) => {
    io.to(`course-${courseId}`).emit('chat-message', message);

    // Resetear timeout de inactividad cuando hay actividad
    const session = streamingSessions.get(courseId);
    if (session && session.viewers.has(socket.id)) {
      const viewer = session.viewers.get(socket.id);
      scheduleSessionCleanup(socket.id, viewer, courseId);
    }
  });

  // ✅ WHITEBOARD EVENTS: Sincronización de pizarra en tiempo real BIDIRECCIONAL
  socket.on('whiteboard-start', ({ courseId, x, y, color, width, tool }) => {
    console.log(`🎨 [WHITEBOARD] Start drawing in course ${courseId} from ${socket.id}:`, { x, y, color, width, tool });

    const session = streamingSessions.get(courseId);
    if (session) {
      // ✅ CRITICAL FIX: Enviar a TODOS los participantes excepto al emisor
      // Si el docente dibuja, enviar a todos los estudiantes
      // Si un estudiante dibuja, enviar al docente y a otros estudiantes
      if (socket.id === session.teacherId) {
        // Docente dibuja -> enviar a TODOS los estudiantes
        session.viewers.forEach((viewer, viewerId) => {
          io.to(viewerId).emit('whiteboard-start', { x, y, color, width, tool });
        });
        console.log(`📤 [WHITEBOARD] Teacher drawing -> sent to ${session.viewers.size} students`);
      } else {
        // Estudiante dibuja -> enviar al docente y otros estudiantes
        io.to(session.teacherId).emit('whiteboard-start', { x, y, color, width, tool });
        session.viewers.forEach((viewer, viewerId) => {
          if (viewerId !== socket.id) {
            io.to(viewerId).emit('whiteboard-start', { x, y, color, width, tool });
          }
        });
        console.log(`📤 [WHITEBOARD] Student drawing -> sent to teacher and other students`);
      }
    }
  });

  socket.on('whiteboard-draw', ({ courseId, x, y }) => {
    const session = streamingSessions.get(courseId);
    if (session) {
      // ✅ CRITICAL FIX: Mismo patrón que whiteboard-start
      if (socket.id === session.teacherId) {
        session.viewers.forEach((viewer, viewerId) => {
          io.to(viewerId).emit('whiteboard-draw', { x, y });
        });
      } else {
        io.to(session.teacherId).emit('whiteboard-draw', { x, y });
        session.viewers.forEach((viewer, viewerId) => {
          if (viewerId !== socket.id) {
            io.to(viewerId).emit('whiteboard-draw', { x, y });
          }
        });
      }
    }
  });

  socket.on('whiteboard-stop', ({ courseId }) => {
    console.log(`🎨 [WHITEBOARD] Stop drawing in course ${courseId} from ${socket.id}`);
    const session = streamingSessions.get(courseId);
    if (session) {
      // ✅ CRITICAL FIX: Mismo patrón que whiteboard-start
      if (socket.id === session.teacherId) {
        session.viewers.forEach((viewer, viewerId) => {
          io.to(viewerId).emit('whiteboard-stop');
        });
        console.log(`📤 [WHITEBOARD] Teacher stopped -> sent to ${session.viewers.size} students`);
      } else {
        io.to(session.teacherId).emit('whiteboard-stop');
        session.viewers.forEach((viewer, viewerId) => {
          if (viewerId !== socket.id) {
            io.to(viewerId).emit('whiteboard-stop');
          }
        });
        console.log(`📤 [WHITEBOARD] Student stopped -> sent to teacher and other students`);
      }
    }
  });

  socket.on('whiteboard-clear', ({ courseId }) => {
    console.log(`🎨 [WHITEBOARD] Clear whiteboard in course ${courseId}`);
    const session = streamingSessions.get(courseId);
    if (session) {
      // ✅ CRITICAL FIX: Enviar a TODOS (docente + estudiantes)
      if (socket.id === session.teacherId) {
        // Docente limpia -> enviar a todos los estudiantes
        session.viewers.forEach((viewer, viewerId) => {
          io.to(viewerId).emit('whiteboard-clear');
        });
        console.log(`📤 [WHITEBOARD] Teacher cleared -> sent to ${session.viewers.size} students`);
      } else {
        // Estudiante limpia -> enviar al docente y otros estudiantes
        io.to(session.teacherId).emit('whiteboard-clear');
        session.viewers.forEach((viewer, viewerId) => {
          if (viewerId !== socket.id) {
            io.to(viewerId).emit('whiteboard-clear');
          }
        });
        console.log(`📤 [WHITEBOARD] Student cleared -> sent to teacher and other students`);
      }
    }
  });

  // Evento para mantener sesión activa (heartbeat)
  socket.on('keep-alive', ({ courseId }) => {
    const session = streamingSessions.get(courseId);
    if (session && session.viewers.has(socket.id)) {
      const viewer = session.viewers.get(socket.id);
      scheduleSessionCleanup(socket.id, viewer, courseId);
    }
  });

  // Desconexión
  socket.on('disconnect', async () => {
    console.log('❌ Usuario desconectado:', socket.id);

    // Cancelar timeout si existe
    if (sessionTimeouts.has(socket.id)) {
      clearTimeout(sessionTimeouts.get(socket.id));
      sessionTimeouts.delete(socket.id);
    }

    // Limpiar si era docente transmitiendo
    for (const [courseId, session] of streamingSessions.entries()) {
      if (session.teacherId === socket.id) {
        console.log(`📴 [DISCONNECT] Docente desconectado, finalizando transmisión del curso ${courseId}`);

        // ✅ FIX CRÍTICO: Marcar clase como finalizada en la base de datos
        try {
          await prisma.classroom.updateMany({
            where: {
              courseId: parseInt(courseId),
              isLive: true
            },
            data: {
              isLive: false
            }
          });
          console.log(`✅ [DISCONNECT-DB] Clases en vivo del curso ${courseId} marcadas como finalizadas`);
        } catch (error) {
          console.error('❌ [DISCONNECT-DB] Error al finalizar clase:', error);
          // Continuar aunque falle
        }

        // Guardar todas las sesiones activas antes de cerrar
        for (const [viewerSocketId, viewer] of session.viewers.entries()) {
          const duration = Date.now() - viewer.joinedAt.getTime();
          await saveSession(viewer, courseId, duration);

          // Cancelar timeouts de viewers
          if (sessionTimeouts.has(viewerSocketId)) {
            clearTimeout(sessionTimeouts.get(viewerSocketId));
            sessionTimeouts.delete(viewerSocketId);
          }
        }

        // ✅ CRÍTICO: Notificar a todos los estudiantes que la transmisión finalizó
        io.to(`course-${courseId}`).emit('streaming-stopped');
        console.log(`📢 [DISCONNECT] Enviado 'streaming-stopped' a todos los estudiantes del curso ${courseId}`);

        streamingSessions.delete(courseId);
      } else if (session.viewers.has(socket.id)) {
        const viewer = session.viewers.get(socket.id);
        const duration = Date.now() - viewer.joinedAt.getTime();

        // Guardar sesión del viewer que se desconectó
        await saveSession(viewer, courseId, duration);

        session.viewers.delete(socket.id);

        const viewersList = Array.from(session.viewers.values());

        io.to(session.teacherId).emit('viewer-left', socket.id);
        io.to(`course-${courseId}`).emit('viewer-count', session.viewers.size);
        io.to(`course-${courseId}`).emit('viewers-list', viewersList); // ✅ Enviar a TODOS los participantes

        // ✅ DUAL STREAM: If this viewer was sharing screen, release the lock
        if (session.screenSharer === socket.id) {
          session.screenSharer = null;
          session.isScreenSharing = false;
          console.log(`📺 [SCREEN-SHARE-LOCK] Lock released due to viewer ${socket.id} disconnection`);
          io.to(`course-${courseId}`).emit('screen-sharer-changed', {
            sharerId: null,
            sharerName: null,
            isSharing: false
          });
        }
      }
    }
  });
});
// Hacer io accesible globalmente
app.set('io', io);
// ==================== ERROR HANDLING ====================
app.use((err, req, res, next) => {
  console.error('Error:', err);
  res.status(err.status || 500).json({
    error: err.message || 'Error interno del servidor',
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  });
});
// Ruta 404
app.use((req, res, next) => {
  res.status(404).send("Route not found");
});
// ==================== INICIAR SERVIDOR ====================
const PORT = process.env.PORT || 5000;
httpServer.listen(PORT, () => {
  console.log('');
  console.log('🚀 ============================================');
  console.log(`🚀 Servidor corriendo en puerto ${PORT}`);
  console.log(`🌐 URL: http://localhost:${PORT}`);
  console.log(`📡 Socket.IO: Activo`);
  console.log('🚀 ============================================');
  console.log('');
});
// Manejo de errores no capturados
process.on('unhandledRejection', (err) => {
  console.error('❌ Unhandled Rejection:', err);
});
process.on('uncaughtException', (err) => {
  console.error('❌ Uncaught Exception:', err);
  process.exit(1);
});
// Cerrar conexiones al terminar
process.on('SIGTERM', async () => {
  console.log('SIGTERM recibido, cerrando servidor...');
  await prisma.$disconnect();
  await redisClient.quit();
  process.exit(0);
});