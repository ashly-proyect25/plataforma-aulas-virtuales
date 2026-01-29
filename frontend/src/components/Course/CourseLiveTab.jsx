// frontend/src/components/Course/CourseLiveTab.jsx

import { useState, useEffect, useRef } from 'react';
import {
  Video, VideoOff, Mic, MicOff, Monitor, MonitorOff, Users, Loader,
  Maximize, Minimize, MessageCircle, Send, X, Paintbrush, Eraser,
  Download, Trash2, Calendar, Clock, Play, Square, UserCircle,
  AlertCircle, CheckCircle, Plus, Minimize2, List, ChevronLeft, ChevronRight
} from 'lucide-react';
import io from 'socket.io-client';
import ConfirmDialog from '../ConfirmDialog';
import Toast from '../Toast';
import { useNavigationGuard } from '../../hooks/useNavigationGuard';
import { getAuthToken } from '../../utils/getAuthToken';
import { useStore } from '../../store/store';
import ScheduledClassesCarousel from './ScheduledClassesCarousel';
import ClassRecordsModal from './ClassRecordsModal';
import api from '../../services/api';

// ✅ iOS FIX: Función para forzar H.264 codec (compatibilidad con Safari iOS)
const forceH264Codec = (sdp) => {
  console.log('🔧 [iOS-FIX] Modificando SDP para forzar H.264...');
  const sdpLines = sdp.split('\r\n');
  const mLineIndex = sdpLines.findIndex(line => line.startsWith('m=video'));
  if (mLineIndex === -1) return sdp;

  const h264PayloadType = sdpLines.find(line =>
    line.includes('rtpmap') && line.toLowerCase().includes('h264')
  );
  if (!h264PayloadType) return sdp;

  const h264Payload = h264PayloadType.match(/(\d+)\s+H264/i)?.[1];
  if (!h264Payload) return sdp;

  const mLine = sdpLines[mLineIndex];
  const parts = mLine.split(' ');
  const otherPayloads = parts.slice(3).filter(p => p !== h264Payload);
  const newMLine = `${parts[0]} ${parts[1]} ${parts[2]} ${h264Payload} ${otherPayloads.join(' ')}`;
  sdpLines[mLineIndex] = newMLine;

  console.log('✅ [iOS-FIX] SDP modificado - H.264 priorizado');
  return sdpLines.join('\r\n');
};

const CourseLiveTab = ({ course, isMinimizedView = false }) => {
  const { activeLiveClass, setActiveLiveClass, updateActiveLiveClass, clearActiveLiveClass } = useStore();

  // Estados principales
  const [view, setView] = useState('schedule'); // 'schedule' | 'live'
  const [isStreaming, setIsStreaming] = useState(false);
  const isStreamingRef = useRef(false); // ✅ Ref para acceder al estado en cleanup
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoEnabled, setIsVideoEnabled] = useState(true);
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const [viewers, setViewers] = useState(0);
  const [viewersList, setViewersList] = useState([]);
  const [loading, setLoading] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showChat, setShowChat] = useState(true);
  const [showWhiteboard, setShowWhiteboard] = useState(false);
  const [showParticipants, setShowParticipants] = useState(true);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [roomCode, setRoomCode] = useState('');
  const [copied, setCopied] = useState(false);

  // Estados del modal de streaming
  const [showStreamModal, setShowStreamModal] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);

  // Estados para arrastre del modal minimizado
  const [minimizedPosition, setMinimizedPosition] = useState({ x: 20, y: 20 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });

  // ✅ Sincronizar isStreamingRef con isStreaming
  useEffect(() => {
    isStreamingRef.current = isStreaming;
  }, [isStreaming]);

  // Effect to refresh video when minimize state changes
  useEffect(() => {
    if (videoRef.current && streamRef.current) {
      videoRef.current.srcObject = streamRef.current;
      videoRef.current.play().catch(err => {
        console.warn('Error replaying video after minimize toggle:', err);
      });
    }
  }, [isMinimized]);

  // Efecto para manejar el arrastre del modal minimizado
  useEffect(() => {
    if (!isDragging) return;

    const handleMouseMove = (e) => {
      const newX = e.clientX - dragOffset.x;
      const newY = e.clientY - dragOffset.y;

      // Limitar dentro de la ventana
      const maxX = window.innerWidth - 384; // 384px = w-96
      const maxY = window.innerHeight - 300; // altura aprox del modal minimizado

      setMinimizedPosition({
        x: Math.max(0, Math.min(newX, maxX)),
        y: Math.max(0, Math.min(newY, maxY))
      });
    };

    const handleMouseUp = () => {
      setIsDragging(false);
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging, dragOffset]);

  // Manejadores de arrastre
  const handleMouseDown = (e) => {
    if (!isMinimized) return;
    if (e.target.closest('.no-drag')) return; // No arrastrar si se hace clic en botones

    // ✅ iOS FIX: NO capturar eventos touch para evitar conflictos con gestos de navegación de iOS
    if (e.type.includes('touch')) return;

    setIsDragging(true);
    setDragOffset({
      x: e.clientX - minimizedPosition.x,
      y: e.clientY - minimizedPosition.y
    });
  };

  // Estados de programación
  const [scheduledClasses, setScheduledClasses] = useState([]);
  const [showScheduleModal, setShowScheduleModal] = useState(false);
  const [showClassRecordsModal, setShowClassRecordsModal] = useState(false);
  const [scheduleForm, setScheduleForm] = useState({
    title: '',
    description: '',
    date: '',
    time: '',
    duration: 60
  });

  // Estados de confirmación y notificaciones
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [confirmAction, setConfirmAction] = useState(null);
  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  const [toastType, setToastType] = useState('success');

  // ✅ SCREEN SHARE AUTHORIZATION: Estado para solicitudes de compartir pantalla
  const [screenShareRequests, setScreenShareRequests] = useState([]);
  const [showScreenShareRequestModal, setShowScreenShareRequestModal] = useState(false);
  const [isScreenShareBlocked, setIsScreenShareBlocked] = useState(false); // ✅ NUEVO: Bloquear compartir pantalla de estudiantes

  // Estados del pop-up de preferencias de inicio
  const [showStartPreferencesModal, setShowStartPreferencesModal] = useState(false);
  const [startWithCamera, setStartWithCamera] = useState(true);
  const [startWithAudio, setStartWithAudio] = useState(true);

  // Estados de pizarra
  const [isDrawing, setIsDrawing] = useState(false);
  const [drawColor, setDrawColor] = useState('#000000');
  const [drawWidth, setDrawWidth] = useState(2);
  const [drawTool, setDrawTool] = useState('pen');
  const remoteDrawingRef = useRef({ isDrawing: false, ctx: null });

  // Estados para intercambio de videos (pin to main)
  const [pinnedParticipant, setPinnedParticipant] = useState(null); // null = docente, o el ID del estudiante

  // Estados de paginación para panel de participantes (móvil)
  const [currentPage, setCurrentPage] = useState(0);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  const ITEMS_PER_PAGE_MOBILE = 2; // Mostrar 2 participantes por página en móvil

  // Detectar cambios de tamaño de pantalla
  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 768);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Bloquear scroll del body cuando el modal está abierto
  useEffect(() => {
    if (showStreamModal && !isMinimized) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [showStreamModal, isMinimized]);

  // Referencias
  const videoRef = useRef(null);
  const streamRef = useRef(null); // ✅ Contiene el stream de cámara original (se mantiene durante screen share)
  const screenStreamRef = useRef(null); // ✅ NUEVO: Guardar stream de pantalla compartida
  const isScreenSharingRef = useRef(false); // ✅ CRITICAL FIX: Ref to avoid stale closure in socket event listeners
  const socketRef = useRef(null);
  const peerConnectionsRef = useRef({});
  const studentPeerConnectionsRef = useRef({}); // Para videos de estudiantes
  const studentVideoRefs = useRef({}); // Referencias a elementos de video de estudiantes
  const studentAudioRefs = useRef({}); // ✅ FIX AUDIO: Referencias a elementos de audio separados para estudiantes
  const containerRef = useRef(null);
  const canvasRef = useRef(null);
  const chatEndRef = useRef(null);
  const [studentStreams, setStudentStreams] = useState({}); // { viewerId: stream }
  const [studentSharingScreen, setStudentSharingScreen] = useState({}); // { viewerId: boolean }
  // ✅ DUAL STREAM: Nuevos estados para manejar streams separados
  const [studentCameraStreams, setStudentCameraStreams] = useState({}); // { viewerId: cameraStream }
  const [studentScreenStreams, setStudentScreenStreams] = useState({}); // { viewerId: screenStream }
  const [studentCameraStates, setStudentCameraStates] = useState({}); // { viewerId: boolean } - estado de cámara

  // ✅ NAVIGATION GUARD: Proteger contra salidas accidentales durante la transmisión
  useNavigationGuard(
    isStreaming,
    '¿Estás seguro de que quieres salir? La transmisión se detendrá y todos los estudiantes serán desconectados.',
    () => {
      // Cleanup al salir
      if (socketRef.current) {
        socketRef.current.emit('stop-streaming', { courseId: course.id });
      }
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }
      Object.values(peerConnectionsRef.current).forEach(pc => pc.close());
      Object.values(studentPeerConnectionsRef.current).forEach(pc => pc.close());
    }
  );

  useEffect(() => {
    // Conectar al servidor de WebRTC
    // IMPORTANTE: Socket.IO se conecta a la raíz del servidor, no a /api
    const socketUrl = import.meta.env.VITE_API_URL
      ? import.meta.env.VITE_API_URL.replace('/api', '')
      : 'http://localhost:5000';

    console.log('🔌 [TEACHER] Conectando a Socket.IO en:', socketUrl);
    const socket = io(socketUrl, {
      auth: { token: getAuthToken() }
    });

    socketRef.current = socket;

    socket.on('viewer-count', (count) => {
      setViewers(count);
    });

    socket.on('viewers-list', (viewers) => {
      console.log('👥 Lista de espectadores actualizada:', viewers);
      setViewersList(viewers);
    });

    socket.on('viewer-joined', async ({ viewerId, viewerInfo }) => {
      console.log('👤 Nuevo espectador:', viewerId, viewerInfo);
      showToastMessage(`${viewerInfo.name} se unió a la clase`, 'info');
      await createPeerConnection(viewerId);
    });

    socket.on('viewer-left', (viewerId) => {
      console.log('👋 Espectador salió:', viewerId);
      if (peerConnectionsRef.current[viewerId]) {
        peerConnectionsRef.current[viewerId].close();
        delete peerConnectionsRef.current[viewerId];
      }
    });

    socket.on('room-code', (code) => {
      console.log('🔑 Room code recibido:', code);
      setRoomCode(code);
    });

    socket.on('answer', async ({ viewerId, answer }) => {
      console.log(`📥 [TEACHER] Answer recibido de viewer ${viewerId}`);
      const pc = peerConnectionsRef.current[viewerId];
      if (pc) {
        try {
          console.log(`🔍 [TEACHER] Peer connection state para ${viewerId}: connectionState=${pc.connectionState}, signalingState=${pc.signalingState}`);

          // ✅ CRITICAL FIX: Verificar signaling state antes de setRemoteDescription
          if (pc.signalingState !== 'have-local-offer') {
            console.warn(`⚠️ [TEACHER] Peer connection con ${viewerId} no está en estado have-local-offer (${pc.signalingState}), esperando...`);

            // Esperar a que esté en estado válido
            await new Promise((resolve) => {
              if (pc.signalingState === 'have-local-offer') {
                resolve();
                return;
              }

              const checkState = () => {
                if (pc.signalingState === 'have-local-offer') {
                  pc.removeEventListener('signalingstatechange', checkState);
                  resolve();
                }
              };

              pc.addEventListener('signalingstatechange', checkState);

              // Timeout de 3 segundos
              setTimeout(() => {
                pc.removeEventListener('signalingstatechange', checkState);
                console.error(`❌ [TEACHER] Timeout esperando signaling state válido para ${viewerId}`);
                resolve();
              }, 3000);
            });

            console.log(`✅ [TEACHER] Peer connection ahora en estado: ${pc.signalingState}`);
          }

          console.log(`📥 [TEACHER] Configurando remote description para ${viewerId} (current state: ${pc.signalingState})...`);
          await pc.setRemoteDescription(new RTCSessionDescription(answer));
          console.log(`✅ [TEACHER] Answer de viewer ${viewerId} configurado como RemoteDescription`);
        } catch (error) {
          console.error(`❌ [TEACHER] Error configurando answer de viewer ${viewerId}:`, error);
        }
      } else {
        console.error(`❌ [TEACHER] No se encontró peer connection para viewer ${viewerId}`);
      }
    });

    socket.on('ice-candidate', async ({ viewerId, candidate }) => {
      console.log(`🧊 [TEACHER] ICE candidate recibido de viewer ${viewerId}`);
      const pc = peerConnectionsRef.current[viewerId];
      if (pc && candidate) {
        try {
          await pc.addIceCandidate(new RTCIceCandidate(candidate));
          console.log(`✅ [TEACHER] ICE candidate de viewer ${viewerId} agregado correctamente`);
        } catch (error) {
          console.error(`❌ [TEACHER] Error agregando ICE candidate de viewer ${viewerId}:`, error);
        }
      } else {
        if (!pc) {
          console.error(`❌ [TEACHER] No se encontró peer connection para viewer ${viewerId}`);
        }
      }
    });

    socket.on('chat-message', (message) => {
      setMessages(prev => [...prev, message]);
    });

    // Recibir ofertas de video de estudiantes
    socket.on('student-offer', async ({ viewerId, offer }) => {
      console.log('📹 [TEACHER] Received student video offer from:', viewerId);
      await handleStudentOffer(viewerId, offer);
    });

    socket.on('student-ice-candidate', async ({ viewerId, candidate }) => {
      const pc = studentPeerConnectionsRef.current[viewerId];
      if (pc && candidate) {
        await pc.addIceCandidate(new RTCIceCandidate(candidate));
      }
    });

    // ✅ SCREEN SHARE AUTHORIZATION: Recibir solicitudes de compartir pantalla
    socket.on('screen-share-request', ({ viewerId, viewerName }) => {
      console.log('📺 [TEACHER] Screen share request from:', viewerName);
      setScreenShareRequests(prev => [...prev, { viewerId, viewerName }]);
      setShowScreenShareRequestModal(true);
      showToastMessage(`${viewerName} solicita compartir pantalla`, 'info');
    });

    // Listeners para whiteboard (recibir dibujos de estudiantes)
    socket.on('whiteboard-start', ({ x, y, color, width, tool }) => {
      console.log('🎨 [TEACHER] Recibiendo whiteboard-start de estudiante:', { x, y, color, width, tool });

      // ✅ CRITICAL FIX: Usar setTimeout para dar tiempo a que React renderice el canvas
      setTimeout(() => {
        if (!canvasRef.current) {
          console.warn('⚠️ [TEACHER] Canvas no disponible para dibujo remoto');
          return;
        }
        const canvas = canvasRef.current;
        const ctx = canvas.getContext('2d');

        ctx.lineWidth = tool === 'eraser' ? 20 : width;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';

        if (tool === 'eraser') {
          ctx.globalCompositeOperation = 'destination-out';
          ctx.strokeStyle = 'rgba(0,0,0,1)';
        } else {
          ctx.globalCompositeOperation = 'source-over';
          ctx.strokeStyle = color;
          ctx.fillStyle = color;
        }

        ctx.beginPath();
        ctx.moveTo(x, y);
        remoteDrawingRef.current.isDrawing = true;
        remoteDrawingRef.current.ctx = ctx;
        console.log('✅ [TEACHER] Canvas configurado para dibujo remoto de estudiante');
      }, 0);
    });

    socket.on('whiteboard-draw', ({ x, y }) => {
      if (!canvasRef.current || !remoteDrawingRef.current.isDrawing) {
        console.log('⚠️ [TEACHER] whiteboard-draw ignorado - canvas no listo o no está dibujando');
        return;
      }
      const ctx = remoteDrawingRef.current.ctx;
      ctx.lineTo(x, y);
      ctx.stroke();
      console.log('✏️ [TEACHER] Dibujando punto remoto de estudiante:', x, y);
    });

    socket.on('whiteboard-stop', () => {
      if (!canvasRef.current || !remoteDrawingRef.current.isDrawing) {
        console.log('⚠️ [TEACHER] whiteboard-stop ignorado - no hay dibujo activo');
        return;
      }
      const ctx = remoteDrawingRef.current.ctx;
      ctx.closePath();
      ctx.globalCompositeOperation = 'source-over';
      remoteDrawingRef.current.isDrawing = false;
      remoteDrawingRef.current.ctx = null;
      console.log('🎨 [TEACHER] Dibujo remoto de estudiante finalizado');
    });

    socket.on('whiteboard-clear', () => {
      if (!canvasRef.current) return;
      const canvas = canvasRef.current;
      const ctx = canvas.getContext('2d');
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      console.log('🗑️ [TEACHER] Pizarra limpiada remotamente');
    });

    // ✅ Escuchar cuando un estudiante empieza/termina de compartir pantalla
    socket.on('student-screen-share-status', ({ viewerId, isSharing }) => {
      console.log(`📺 [TEACHER] Student ${viewerId} screen sharing: ${isSharing}`);

      setStudentSharingScreen(prev => ({
        ...prev,
        [viewerId]: isSharing
      }));

      // ✅ CRITICAL FIX: Limpiar streams separados cuando deja de compartir
      if (!isSharing) {
        console.log(`🗑️ [TEACHER] Limpiando streams separados para estudiante ${viewerId}`);

        // ✅ FIX: SOLO detener tracks del stream de pantalla (NO la cámara)
        setStudentScreenStreams(prev => {
          const screenStream = prev[viewerId];
          if (screenStream) {
            console.log(`🛑 [TEACHER] Deteniendo SOLO tracks de pantalla compartida de ${viewerId}`);

            // ✅ CRITICAL: Verificar que NO estamos deteniendo tracks del docente
            // Los tracks del docente están en streamRef.current, NO en screenStream del estudiante
            const teacherTracks = streamRef.current?.getTracks() || [];
            const teacherTrackIds = new Set(teacherTracks.map(t => t.id));

            screenStream.getTracks().forEach(track => {
              // ✅ PROTECCIÓN: Verificar que este track NO pertenece al docente
              if (teacherTrackIds.has(track.id)) {
                console.error(`❌ [TEACHER-CRITICAL] PREVENCIÓN: Intentando detener track del DOCENTE! ${track.kind} - ${track.label}`);
                console.error(`❌ [TEACHER-CRITICAL] Este es un BUG - el track del docente NO debe estar en studentScreenStreams[${viewerId}]`);
                console.error(`❌ [TEACHER-CRITICAL] Track ID: ${track.id}`);
                return; // NO detener este track
              }

              console.log(`🛑 [TEACHER] Deteniendo track de pantalla del estudiante: ${track.kind} - ${track.label} (ID: ${track.id})`);
              track.stop();
            });
          }

          const newStreams = { ...prev };
          delete newStreams[viewerId];
          return newStreams;
        });

        // ✅ FIX CRÍTICO: NO detener los tracks de cámara - moverlos de vuelta a studentStreams
        // La cámara sigue activa, solo dejó de compartir pantalla
        setStudentCameraStreams(prev => {
          const cameraStream = prev[viewerId];
          if (cameraStream) {
            console.log(`🔄 [TEACHER] Moviendo cámara de ${viewerId} de vuelta a studentStreams`);
            // Mover el stream de cámara de vuelta a studentStreams para que se muestre correctamente
            setStudentStreams(prevStreams => ({
              ...prevStreams,
              [viewerId]: cameraStream
            }));
          }

          const newStreams = { ...prev };
          delete newStreams[viewerId];
          return newStreams;
        });

        // El stream principal del estudiante ahora solo tiene cámara (sin pantalla)
        console.log(`✅ [TEACHER] Streams separados limpiados para ${viewerId}, cámara movida a studentStreams`);
      }

      // ✅ Auto-pinnear al estudiante cuando comparte pantalla
      if (isSharing && pinnedParticipant !== viewerId) {
        setPinnedParticipant(viewerId);
        console.log(`📌 [TEACHER] Auto-pinned student ${viewerId} for screen sharing`);
      } else if (!isSharing && pinnedParticipant === viewerId) {
        // ✅ Despinnear cuando deja de compartir
        setPinnedParticipant(null);
        console.log(`📌 [TEACHER] Unpinned student ${viewerId} - stopped screen sharing`);
      }
    });

    // ✅ DUAL STREAM: Listen for when ANY participant starts/stops screen sharing
    socket.on('screen-sharer-changed', ({ sharerId, sharerName, isSharing }) => {
      console.log(`📺 [TEACHER-DUAL] Screen sharer changed:`, { sharerId, sharerName, isSharing });

      if (isSharing) {
        // Someone started sharing screen
        if (sharerId !== socket.id) {
          // A student is sharing screen
          console.log(`📌 [TEACHER-DUAL] Auto-pinning student ${sharerId} (${sharerName}) who is sharing screen`);
          setPinnedParticipant(sharerId);
        } else {
          // I'm the one sharing - no need to auto-pin myself
          console.log('ℹ️ [TEACHER-DUAL] I am the one sharing screen');
        }
      } else {
        // Someone stopped sharing screen
        if (sharerId !== socket.id && pinnedParticipant === sharerId) {
          // Student stopped sharing and was pinned
          console.log(`📌 [TEACHER-DUAL] Unpinning student ${sharerId} who stopped sharing`);
          setPinnedParticipant(null);
        }
      }
    });

    // ✅ CAMERA STATUS: Listen for student camera on/off
    socket.on('student-camera-status', ({ viewerId, cameraEnabled }) => {
      console.log(`📹 [TEACHER-CAMERA] Student ${viewerId} camera: ${cameraEnabled ? 'ON' : 'OFF'}`);
      setStudentCameraStates(prev => ({
        ...prev,
        [viewerId]: cameraEnabled
      }));

      // ✅ FIX: Refrescar video cuando estudiante reactiva la cámara para evitar imagen congelada
      if (cameraEnabled) {
        // Esperar un poco para que el track se habilite completamente
        setTimeout(() => {
          const videoEl = studentVideoRefs.current[viewerId];
          if (videoEl && videoEl.srcObject) {
            console.log(`📹 [TEACHER-CAMERA] Refrescando video de estudiante ${viewerId} para evitar imagen congelada`);
            const currentStream = videoEl.srcObject;

            // Forzar re-renderizado del video element
            videoEl.srcObject = null;
            videoEl.load();

            setTimeout(() => {
              if (videoEl) {
                videoEl.srcObject = currentStream;
                videoEl.play().catch(err => console.log('Autoplay prevented:', err));
              }
            }, 100);
          }
        }, 100);
      }
    });

    return () => {
      socket.disconnect();
      stopStreaming();
      // Limpiar conexiones de estudiantes
      Object.values(studentPeerConnectionsRef.current).forEach(pc => pc.close());
      studentPeerConnectionsRef.current = {};
    };
  }, []);

  const handleStudentOffer = async (viewerId, offer) => {
    try {
      let pc = studentPeerConnectionsRef.current[viewerId];

      // ✅ Definir checkAndUpdateStreams ANTES para que esté disponible en ambos casos
      const checkAndUpdateStreams = () => {
        const receivers = pc.getReceivers();
        // ✅ FIX: Solo considerar tracks activos (readyState === 'live')
        const videoTracks = receivers
          .filter(r => r.track && r.track.kind === 'video' && r.track.readyState === 'live')
          .map(r => r.track);
        const audioTracks = receivers
          .filter(r => r.track && r.track.kind === 'audio' && r.track.readyState === 'live')
          .map(r => r.track);

        console.log(`🔍 [TEACHER-DUAL-CHECK] Estudiante ${viewerId}: ${videoTracks.length} video, ${audioTracks.length} audio tracks`);

        if (videoTracks.length >= 2) {
          // DUAL STREAM: Separar cámara y pantalla
          console.log('🎥 [TEACHER-DUAL] Transmisión dual detectada:', viewerId);

          // ✅ FIX CRÍTICO: Identificar tracks por label, NO por posición
          let cameraTrack, screenTrack;

          for (const track of videoTracks) {
            const label = track.label.toLowerCase();
            const isScreen = label.includes('screen') || label.includes('window') ||
                           label.includes('monitor') || label.includes('ubuntu') ||
                           label.includes('chrome') || label.includes('firefox');

            if (isScreen) {
              screenTrack = track;
            } else {
              cameraTrack = track;
            }
          }

          // Fallback: si no pudimos identificar por label, usar posición
          if (!cameraTrack || !screenTrack) {
            console.log('⚠️ [TEACHER-DUAL] No se pudo identificar tracks por label, usando posición');
            cameraTrack = videoTracks[0];
            screenTrack = videoTracks[1];
          }

          const cameraStream = new MediaStream([cameraTrack, ...audioTracks]);
          const screenStream = new MediaStream([screenTrack]);

          console.log('📹 [TEACHER-DUAL] Camera track identificado:', cameraTrack.label, 'enabled:', cameraTrack.enabled);
          console.log('📺 [TEACHER-DUAL] Screen track identificado:', screenTrack.label, 'enabled:', screenTrack.enabled);

          setStudentCameraStreams(prev => ({ ...prev, [viewerId]: cameraStream }));
          setStudentScreenStreams(prev => ({ ...prev, [viewerId]: screenStream }));
          setStudentStreams(prev => {
            const newStreams = { ...prev };
            delete newStreams[viewerId];
            return newStreams;
          });

          console.log('✅ [TEACHER-DUAL] Streams separados y limpiados');
        } else if (videoTracks.length === 1) {
          // SINGLE STREAM: Solo cámara
          console.log('📹 [TEACHER-SINGLE] Stream único para estudiante', viewerId);

          const singleStream = new MediaStream([...videoTracks, ...audioTracks]);

          setStudentStreams(prev => ({ ...prev, [viewerId]: singleStream }));
          setStudentCameraStreams(prev => {
            const newStreams = { ...prev };
            delete newStreams[viewerId];
            return newStreams;
          });
          setStudentScreenStreams(prev => {
            const newStreams = { ...prev };
            delete newStreams[viewerId];
            return newStreams;
          });
        } else if (videoTracks.length === 0 && audioTracks.length > 0) {
          // AUDIO ONLY: Solo audio (cámara desactivada o no disponible)
          console.log('🎤 [TEACHER-AUDIO] Solo audio para estudiante', viewerId);

          const audioStream = new MediaStream([...audioTracks]);

          setStudentStreams(prev => ({ ...prev, [viewerId]: audioStream }));
          setStudentCameraStreams(prev => {
            const newStreams = { ...prev };
            delete newStreams[viewerId];
            return newStreams;
          });
          setStudentScreenStreams(prev => {
            const newStreams = { ...prev };
            delete newStreams[viewerId];
            return newStreams;
          });
        } else if (videoTracks.length === 0 && audioTracks.length === 0) {
          // NO TRACKS: Limpiar todo
          console.log('🗑️ [TEACHER-CLEAN] No hay tracks para estudiante', viewerId);

          setStudentStreams(prev => {
            const newStreams = { ...prev };
            delete newStreams[viewerId];
            return newStreams;
          });
          setStudentCameraStreams(prev => {
            const newStreams = { ...prev };
            delete newStreams[viewerId];
            return newStreams;
          });
          setStudentScreenStreams(prev => {
            const newStreams = { ...prev };
            delete newStreams[viewerId];
            return newStreams;
          });
        }
      };

      // Si ya existe una conexión, es una renegociación
      if (pc) {
        console.log(`🔄 [TEACHER] Renegociando conexión existente con estudiante ${viewerId}`);

        // Procesar offer de renegociación
        await pc.setRemoteDescription(new RTCSessionDescription(offer));
        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);

        socketRef.current.emit('student-answer', { viewerId, answer });
        console.log(`✅ [TEACHER] Answer de renegociación enviado a estudiante ${viewerId}`);

        // ✅ FIX CRÍTICO: Actualizar streams después de renegociación
        // Esperar un poco para que los tracks se actualicen
        setTimeout(() => {
          console.log('🔄 [TEACHER] Actualizando streams después de renegociación');
          checkAndUpdateStreams();
        }, 150);

        return;
      }

      // NO existe conexión - crear nueva
      console.log(`🆕 [TEACHER] Creando nueva peer connection para estudiante ${viewerId}`);
      pc = new RTCPeerConnection({
        iceServers: [
          { urls: 'stun:stun.l.google.com:19302' },
          { urls: 'stun:stun1.l.google.com:19302' },
          { urls: 'stun:stun2.l.google.com:19302' },
          { urls: 'stun:stun3.l.google.com:19302' },
          { urls: 'stun:stun4.l.google.com:19302' }
        ],
        iceCandidatePoolSize: 10
      });

      studentPeerConnectionsRef.current[viewerId] = pc;

      // ✅ checkAndUpdateStreams ya está definido arriba, reutilizarlo aquí

      pc.ontrack = (event) => {
        console.log('📺 [TEACHER-DUAL] Track recibido de estudiante:', viewerId, event.track.kind, event.track.label);

        // ✅ Esperar 100ms para que todos los tracks lleguen, luego revisar
        setTimeout(() => {
          checkAndUpdateStreams();
        }, 100);
      };

      pc.onicecandidate = (event) => {
        if (event.candidate) {
          console.log(`🧊 [TEACHER] Enviando ICE candidate a estudiante ${viewerId}:`, event.candidate.type);
          socketRef.current.emit('student-ice-candidate', {
            viewerId,
            candidate: event.candidate
          });
        } else {
          console.log(`🧊 [TEACHER] ICE gathering completado para ${viewerId}`);
        }
      };

      pc.onicegatheringstatechange = () => {
        console.log(`🧊 [TEACHER] ICE gathering state para ${viewerId}:`, pc.iceGatheringState);
      };

      pc.oniceconnectionstatechange = () => {
        console.log(`🧊 [TEACHER] ICE connection state para ${viewerId}:`, pc.iceConnectionState);
      };

      pc.onconnectionstatechange = () => {
        console.log(`🔗 [TEACHER] Student ${viewerId} connection state:`, pc.connectionState);
        if (pc.connectionState === 'connected') {
          console.log(`✅ [TEACHER] Conexión establecida con estudiante ${viewerId}`);
        } else if (pc.connectionState === 'disconnected' || pc.connectionState === 'failed') {
          console.log(`❌ [TEACHER] Conexión falló con estudiante ${viewerId}`);
          // Limpiar stream del estudiante
          setStudentStreams(prev => {
            const newStreams = { ...prev };
            delete newStreams[viewerId];
            return newStreams;
          });
        }
      };

      await pc.setRemoteDescription(new RTCSessionDescription(offer));
      const answer = await pc.createAnswer();

      // ✅ iOS FIX: Forzar H.264 codec
      answer.sdp = forceH264Codec(answer.sdp);

      await pc.setLocalDescription(answer);

      socketRef.current.emit('student-answer', { viewerId, answer });
      showToastMessage(`Estudiante activó su cámara`, 'info');
    } catch (error) {
      console.error('Error handling student offer:', error);
    }
  };

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // ✅ CRITICAL FIX: Actualizar elementos video cuando studentStreams cambia
  useEffect(() => {
    Object.keys(studentStreams).forEach(viewerId => {
      const videoElement = studentVideoRefs.current[viewerId];
      const stream = studentStreams[viewerId];

      if (videoElement && stream && videoElement.srcObject !== stream) {
        console.log(`🔄 [TEACHER] Actualizando stream para estudiante ${viewerId}`);
        videoElement.srcObject = stream;
        videoElement.play().catch(err => console.log('Autoplay prevented:', err));
      }
    });
  }, [studentStreams]);

  // ✅ FIX AUDIO: Reproducir audio de estudiantes en elementos Audio() separados
  useEffect(() => {
    console.log('🔊 [TEACHER-AUDIO-FIX] Actualizando audio de estudiantes...', Object.keys(studentStreams));

    // Crear/actualizar elementos de audio para cada estudiante
    Object.keys(studentStreams).forEach(viewerId => {
      const stream = studentStreams[viewerId];
      if (!stream) return;

      const audioTracks = stream.getAudioTracks();
      if (audioTracks.length === 0) {
        console.log(`⚠️ [TEACHER-AUDIO-FIX] No hay audio tracks para estudiante ${viewerId}`);
        return;
      }

      console.log(`🔊 [TEACHER-AUDIO-FIX] Configurando audio para estudiante ${viewerId} con ${audioTracks.length} tracks`);

      // Crear o reutilizar elemento de audio
      if (!studentAudioRefs.current[viewerId]) {
        studentAudioRefs.current[viewerId] = new Audio();
        studentAudioRefs.current[viewerId].autoplay = true;
        // ✅ iOS FIX: Atributos necesarios para Safari/iOS
        studentAudioRefs.current[viewerId].playsInline = true;
        studentAudioRefs.current[viewerId].setAttribute('playsinline', 'true');
        studentAudioRefs.current[viewerId].setAttribute('webkit-playsinline', 'true');
        studentAudioRefs.current[viewerId].muted = false;
      }

      const audioEl = studentAudioRefs.current[viewerId];

      // Solo actualizar si es un stream diferente
      if (audioEl.srcObject !== stream) {
        audioEl.srcObject = stream;
        audioEl.play()
          .then(() => {
            console.log(`✅ [TEACHER-AUDIO-FIX] Audio de estudiante ${viewerId} reproduciéndose correctamente`);
          })
          .catch(err => {
            console.warn(`⚠️ [TEACHER-AUDIO-FIX] Error reproduciendo audio de estudiante ${viewerId}:`, err);

            // ✅ iOS FIX: Reintentar si es error de autoplay
            if (err.name === 'NotAllowedError') {
              console.log(`📱 [TEACHER-AUDIO-FIX-iOS] Autoplay bloqueado para estudiante ${viewerId}, reintentando...`);
              setTimeout(() => {
                audioEl.play().catch(e =>
                  console.warn(`⚠️ [TEACHER-AUDIO-FIX-iOS] Segundo intento falló para estudiante ${viewerId}:`, e)
                );
              }, 500);
            }
          });
      }
    });

    // Limpiar elementos de audio de estudiantes que ya no están
    Object.keys(studentAudioRefs.current).forEach(viewerId => {
      if (!studentStreams[viewerId]) {
        console.log(`🗑️ [TEACHER-AUDIO-FIX] Limpiando audio de estudiante ${viewerId} que se desconectó`);
        if (studentAudioRefs.current[viewerId]) {
          studentAudioRefs.current[viewerId].srcObject = null;
          delete studentAudioRefs.current[viewerId];
        }
      }
    });
  }, [studentStreams]);

  const showToastMessage = (message, type = 'success') => {
    setToastMessage(message);
    setToastType(type);
    setShowToast(true);
  };

  const createPeerConnection = async (viewerId) => {
    // 🔍 DIAGNOSTIC: Log current state when creating peer connection
    console.log(`🆕 [TEACHER] ========== CREATING PEER CONNECTION FOR VIEWER ${viewerId} ==========`);
    console.log(`🔍 [TEACHER] isScreenSharing (state): ${isScreenSharing}`);
    console.log(`🔍 [TEACHER] isScreenSharingRef.current (ref): ${isScreenSharingRef.current}`);
    console.log(`🔍 [TEACHER] screenStreamRef.current:`, screenStreamRef.current);
    console.log(`🔍 [TEACHER] streamRef.current:`, streamRef.current);

    // ✅ CRITICAL FIX: Verificar que streamRef existe ANTES de crear peer connection
    if (!streamRef.current) {
      console.error(`❌ [TEACHER] streamRef.current es null - NO se puede crear peer connection para viewer ${viewerId}`);
      console.error(`❌ [TEACHER] El docente debe iniciar la transmisión primero`);
      // Notificar al estudiante que la transmisión no está disponible aún
      socketRef.current.emit('streaming-not-ready', { viewerId });
      return;
    }

    if (screenStreamRef.current) {
      const screenTracks = screenStreamRef.current.getTracks();
      console.log(`🔍 [TEACHER] Screen stream tracks:`, screenTracks.map(t => `${t.kind}: ${t.label} (enabled: ${t.enabled}, readyState: ${t.readyState})`));
    }

    const cameraTracks = streamRef.current.getTracks();
    console.log(`🔍 [TEACHER] Camera stream tracks:`, cameraTracks.map(t => `${t.kind}: ${t.label} (enabled: ${t.enabled}, readyState: ${t.readyState})`));

    const pc = new RTCPeerConnection({
      iceServers: [
        { urls: 'stun:stun.l.google.com:19302' },
        { urls: 'stun:stun1.l.google.com:19302' },
        { urls: 'stun:stun2.l.google.com:19302' },
        { urls: 'stun:stun3.l.google.com:19302' },
        { urls: 'stun:stun4.l.google.com:19302' }
      ],
      iceCandidatePoolSize: 10
    });

    peerConnectionsRef.current[viewerId] = pc;

    // ✅ CRITICAL FIX: Setup event handlers FIRST, before adding tracks
    pc.onicecandidate = (event) => {
      if (event.candidate) {
        console.log(`🧊 [TEACHER] Enviando ICE candidate a viewer ${viewerId}`);
        socketRef.current.emit('ice-candidate', {
          viewerId,
          candidate: event.candidate
        });
      }
    };

    pc.onconnectionstatechange = () => {
      console.log(`🔗 [TEACHER] Connection state con viewer ${viewerId}:`, pc.connectionState);
      if (pc.connectionState === 'failed' || pc.connectionState === 'disconnected') {
        console.warn(`⚠️ [TEACHER] Conexión con viewer ${viewerId} falló o se desconectó`);
      } else if (pc.connectionState === 'connected') {
        console.log(`✅ [TEACHER] Conectado exitosamente con viewer ${viewerId}`);
      }
    };

    // ✅ DUAL STREAM: Agregar tracks según el estado actual (cámara Y/O pantalla compartida)
    const tracks = [];

    // ✅ DUAL STREAM FIX: Verificar y agregar todos los video tracks activos
    if (streamRef.current) {
      const videoTracks = streamRef.current.getVideoTracks();
      console.log(`🔍 [TEACHER-DUAL] Total video tracks en streamRef: ${videoTracks.length}`);

      if (videoTracks.length > 0) {
        videoTracks.forEach((track, index) => {
          // Verificar que el track esté en estado válido
          if (track.readyState === 'live' || track.readyState === 'ended') {
            const trackType = track.label.includes('screen') ? 'PANTALLA' : 'CÁMARA';
            console.log(`📹 [TEACHER-DUAL] Agregando video track ${index} (${trackType}) para viewer ${viewerId}`);
            console.log(`📹 [TEACHER-DUAL] Track: kind=${track.kind}, label=${track.label}, enabled=${track.enabled}, readyState=${track.readyState}, id=${track.id}`);
            pc.addTrack(track, streamRef.current);
            tracks.push(track);
          } else {
            console.warn(`⚠️ [TEACHER-DUAL] Track ${index} no está en estado válido: ${track.readyState}`);
          }
        });
        console.log(`✅ [TEACHER-DUAL] ${videoTracks.length} video track(s) encontrado(s), ${tracks.length} agregado(s) (dual stream: ${videoTracks.length >= 2})`);
      } else {
        console.log(`⚠️ [TEACHER-DUAL] No hay video tracks en streamRef (cámara desactivada)`);
      }
    }

    // ✅ SIEMPRE agregar audio del streamRef (micrófono)
    const audioTracks = streamRef.current.getAudioTracks();
    audioTracks.forEach(track => {
      console.log(`🎤 [TEACHER-DUAL] Agregando track de AUDIO para viewer ${viewerId}`);
      console.log(`🎤 [TEACHER-DUAL] Audio track: label=${track.label}, enabled=${track.enabled}, readyState=${track.readyState}, id=${track.id}`);
      pc.addTrack(track, streamRef.current);
      tracks.push(track);
    });

    console.log(`📤 [TEACHER] Total de ${tracks.length} tracks agregados al peer de viewer ${viewerId}`);

    const offer = await pc.createOffer();

    // ✅ iOS FIX: Forzar H.264 codec para compatibilidad con Safari iOS
    offer.sdp = forceH264Codec(offer.sdp);

    await pc.setLocalDescription(offer);
    console.log(`📤 [TEACHER] Offer creado con ${tracks.length} tracks`);

    // 🔍 DIAGNOSTIC: Log SDP to verify it contains media tracks
    console.log(`🔍 [TEACHER] Offer SDP for viewer ${viewerId}:`);
    console.log(offer.sdp);

    // Count m=video and m=audio lines in SDP to verify tracks
    const videoLines = (offer.sdp.match(/m=video/g) || []).length;
    const audioLines = (offer.sdp.match(/m=audio/g) || []).length;
    console.log(`🔍 [TEACHER] SDP contains ${videoLines} video track(s) and ${audioLines} audio track(s)`);

    console.log(`📤 [TEACHER] Enviando offer a viewer ${viewerId}`);
    socketRef.current.emit('offer', { viewerId, offer });
  };

  const handleStartStreamingClick = () => {
    setShowStartPreferencesModal(true);
  };

  const handleConfirmStartPreferences = () => {
    setShowStartPreferencesModal(false);
    startStreaming();
  };

  const startStreaming = async () => {
    try {
      setLoading(true);

      console.log('🎥 [TEACHER] Solicitando acceso a cámara/micrófono...');

      // ✅ DUAL STREAM FIX: SIEMPRE solicitar video para transmisión dual (aunque se desactive después)
      let stream;

      // Siempre solicitar video para tener el track disponible para dual streaming
      stream = await navigator.mediaDevices.getUserMedia({
        video: true, // Siempre solicitar video
        audio: startWithAudio // ✅ Sin procesamiento de audio para evitar artefactos/pitidos en docente
      });

      console.log('✅ [TEACHER-DUAL] Stream base obtenido con video (para transmisión dual)');

      // Si el usuario no quiere cámara, deshabilitar el track (NO eliminarlo)
      if (!startWithCamera) {
        const videoTrack = stream.getVideoTracks()[0];
        if (videoTrack) {
          videoTrack.enabled = false;
          console.log('📹 [TEACHER-DUAL] Cámara deshabilitada pero track mantenido para dual stream');
        }
      }

      console.log('✅ [TEACHER] Stream obtenido:', stream.getTracks().map(t => `${t.kind}: ${t.label}`));

      // CRITICAL FIX: Asignar stream INMEDIATAMENTE a la referencia
      streamRef.current = stream;

      // CRITICAL FIX: Actualizar estados ANTES de asignar al videoRef
      setIsStreaming(true);
      setShowStreamModal(true); // ← MOVER AQUÍ para que el modal se renderice
      setIsVideoEnabled(startWithCamera);
      setIsMuted(!startWithAudio);

      // CRITICAL FIX: Esperar un tick para que React renderice el modal con el videoRef
      await new Promise(resolve => setTimeout(resolve, 150)); // Aumentado a 150ms

      if (videoRef.current) {
        console.log('📺 [TEACHER] Asignando stream al videoRef...');
        videoRef.current.srcObject = stream;

        // Configurar atributos del video para mejor compatibilidad
        videoRef.current.setAttribute('playsinline', 'true');
        videoRef.current.setAttribute('autoplay', 'true');
        videoRef.current.muted = true; // El docente se ve a sí mismo en mute

        // IMPORTANTE: Forzar reproducción y esperar confirmación
        try {
          const playPromise = videoRef.current.play();
          if (playPromise !== undefined) {
            await playPromise;
            console.log('✅ [TEACHER] Video del docente reproduciéndose correctamente');
          }
        } catch (err) {
          console.error('❌ [TEACHER] Error reproduciendo video:', err);
          throw new Error('No se pudo reproducir el video: ' + err.message);
        }
      } else {
        console.error('❌ [TEACHER] videoRef.current es null después de espera');
        throw new Error('No se pudo encontrar el elemento de video');
      }

      // CRITICAL FIX: Solo emitir start-streaming DESPUÉS de que el video esté reproduciéndose
      socketRef.current.emit('start-streaming', {
        courseId: course.id,
        teacherId: course.teacherId,
        cameraEnabled: startWithCamera // ✅ Send initial camera state
      });

      // ✅ Activar estado de clase en vivo en el store
      setActiveLiveClass({
        courseId: course.id,
        type: 'teacher',
        isMinimized: false
      });

      // Modal ya fue abierto antes (línea 694)
      showToastMessage('Clase iniciada exitosamente. Los estudiantes pueden unirse ahora.', 'success');
    } catch (error) {
      console.error('❌ [TEACHER] Error al iniciar streaming:', error);
      showToastMessage('Error al acceder a la cámara/micrófono. Verifica los permisos.', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleStopStreamingClick = () => {
    setConfirmAction({
      title: 'Finalizar Clase',
      message: '¿Estás seguro de que deseas finalizar la clase? Se desconectarán todos los estudiantes.',
      onConfirm: () => {
        stopStreaming();
        setShowConfirmDialog(false);
        showToastMessage('Clase finalizada correctamente', 'success');
      }
    });
    setShowConfirmDialog(true);
  };

  const stopStreaming = () => {
    console.log('🛑 [TEACHER] Deteniendo streaming y limpiando TODOS los recursos...');

    // ✅ Detener y limpiar stream principal del docente (cámara)
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => {
        track.stop();
        console.log(`🛑 [TEACHER] Track detenido: ${track.kind} - ${track.label}`);
      });
      streamRef.current = null;
    }

    // ✅ Detener y limpiar stream de pantalla compartida
    if (screenStreamRef.current) {
      screenStreamRef.current.getTracks().forEach(track => {
        track.stop();
        console.log(`🛑 [TEACHER] Screen track detenido: ${track.kind}`);
      });
      screenStreamRef.current = null;
    }

    // ✅ Limpiar video del docente
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }

    // ✅ Cerrar todas las peer connections con espectadores
    Object.values(peerConnectionsRef.current).forEach(pc => {
      pc.close();
    });
    peerConnectionsRef.current = {};

    // ✅ Cerrar todas las peer connections con estudiantes
    Object.values(studentPeerConnectionsRef.current).forEach(pc => {
      pc.close();
    });
    studentPeerConnectionsRef.current = {};

    // ✅ Limpiar todos los streams de estudiantes
    setStudentScreenStreams({});
    setStudentCameraStreams({});
    setStudentStreams({});

    // ✅ Limpiar estados de estudiantes
    setStudentCameraStates({});
    setViewersList([]);
    setViewers(0);
    setPinnedParticipant(null);

    // ✅ Notificar al servidor
    socketRef.current.emit('stop-streaming', { courseId: course.id });

    // ✅ Resetear estados UI
    setIsStreaming(false);
    isStreamingRef.current = false;
    setIsScreenSharing(false);
    isScreenSharingRef.current = false;
    setShowStreamModal(false);
    setIsMinimized(false);

    // ✅ Limpiar estado de clase en vivo del store
    clearActiveLiveClass();

    console.log('✅ [TEACHER] Streaming detenido y recursos limpiados completamente');
  };

  const toggleMute = async () => {
    if (streamRef.current) {
      const audioTrack = streamRef.current.getAudioTracks()[0];

      if (!isMuted) {
        // DISABLE: Stop physical microphone
        if (audioTrack) {
          audioTrack.stop();
          console.log('🔇 [TEACHER] Micrófono físicamente detenido');

          // Remove track from peer connections
          Object.values(peerConnectionsRef.current).forEach(async (pc) => {
            const sender = pc.getSenders().find(s => s.track?.kind === 'audio');
            if (sender) {
              await sender.replaceTrack(null);
              console.log('🔇 [TEACHER] Audio track removido de peer connection');
            }
          });

          // Remove from streamRef
          streamRef.current.removeTrack(audioTrack);
        }
        setIsMuted(true);
        showToastMessage('Micrófono silenciado', 'info');
      } else {
        // ENABLE: Get new audio stream
        try {
          const newStream = await navigator.mediaDevices.getUserMedia({
            audio: true // ✅ Sin procesamiento de audio para evitar artefactos/pitidos en docente
          });
          const newAudioTrack = newStream.getAudioTracks()[0];
          console.log('🎤 [TEACHER] Nuevo micrófono obtenido');

          // Add to streamRef (create if doesn't exist)
          if (!streamRef.current) {
            console.log('🎤 [TEACHER] streamRef no existe, creando nuevo stream');
            streamRef.current = new MediaStream([newAudioTrack]);
          } else {
            streamRef.current.addTrack(newAudioTrack);
            console.log('🎤 [TEACHER] Audio track agregado a streamRef existente');
          }

          // ✅ CRITICAL FIX: Agregar/reemplazar en peer connections con renegociación
          const viewerIds = Object.keys(peerConnectionsRef.current);
          for (const viewerId of viewerIds) {
            const pc = peerConnectionsRef.current[viewerId];

            if (pc.connectionState === 'closed' || pc.connectionState === 'failed') {
              console.warn(`⚠️ [TEACHER-AUDIO] Peer connection con ${viewerId} está ${pc.connectionState}, saltando`);
              continue;
            }

            const sender = pc.getSenders().find(s => s.track === null || s.track?.kind === 'audio');
            if (sender) {
              await sender.replaceTrack(newAudioTrack);
              console.log(`🎤 [TEACHER-AUDIO] Audio track reemplazado para viewer ${viewerId}`);
            } else {
              // If no sender exists, add the track
              pc.addTrack(newAudioTrack, streamRef.current);
              console.log(`🎤 [TEACHER-AUDIO] Audio track agregado para viewer ${viewerId} (nuevo sender)`);
            }

            // ✅ CRITICAL: Renegociar para que el cambio se propague
            try {
              if (pc.signalingState === 'stable') {
                const offer = await pc.createOffer();
                offer.sdp = forceH264Codec(offer.sdp);
                await pc.setLocalDescription(offer);
                socketRef.current.emit('offer', { viewerId, offer });
                console.log(`📤 [TEACHER-AUDIO] Offer de renegociación enviado a viewer ${viewerId} (audio activado)`);
              } else {
                console.warn(`⚠️ [TEACHER-AUDIO] No se puede renegociar con ${viewerId}, signalingState: ${pc.signalingState}`);
              }
            } catch (error) {
              console.error(`❌ [TEACHER-AUDIO] Error renegociando con ${viewerId}:`, error);
            }
          }

          // ✅ CRITICAL FIX: NO reasignar videoRef si está compartiendo pantalla
          // porque videoRef debe mostrar la pantalla, NO la cámara
          if (videoRef.current && !isScreenSharing && !isScreenSharingRef.current) {
            videoRef.current.srcObject = streamRef.current;
            console.log('🎤 [TEACHER-AUDIO] Stream reasignado a videoRef (no hay pantalla compartida)');
          } else if (isScreenSharing || isScreenSharingRef.current) {
            console.log('🎤 [TEACHER-AUDIO] No se actualiza videoRef porque está mostrando pantalla compartida');
          }

          setIsMuted(false);
          showToastMessage('Micrófono activado', 'info');
        } catch (error) {
          console.error('❌ Error al acceder al micrófono:', error);
          showToastMessage('Error al acceder al micrófono', 'error');
        }
      }
    }
  };

  const toggleVideo = async () => {
    if (streamRef.current) {
      // ✅ FIX: Identificar ESPECÍFICAMENTE el track de cámara, NO el de pantalla
      const allVideoTracks = streamRef.current.getVideoTracks();
      let cameraTrack = null;

      if (isScreenSharing && allVideoTracks.length >= 2) {
        // Si está compartiendo pantalla, hay 2 tracks: cámara y pantalla
        // El track de cámara NO tiene "screen", "window", "monitor" en el label
        cameraTrack = allVideoTracks.find(track => {
          const label = track.label.toLowerCase();
          return !label.includes('screen') && !label.includes('window') &&
                 !label.includes('monitor') && !label.includes('ubuntu') &&
                 !label.includes('chrome') && !label.includes('firefox');
        });

        if (!cameraTrack) {
          // Fallback: el primero que no sea el de pantalla
          const screenTrack = screenStreamRef.current?.getVideoTracks()[0];
          cameraTrack = allVideoTracks.find(t => t.id !== screenTrack?.id);
        }
      } else {
        // No hay pantalla compartida, usar el primer track
        cameraTrack = allVideoTracks[0];
      }

      if (isVideoEnabled) {
        // DISABLE: Deshabilitar cámara PERO mantener el track para transmisión dual
        if (cameraTrack) {
          console.log('📹 [TEACHER-DUAL] Deshabilitando cámara (manteniendo track para dual stream)');

          // ✅ DUAL STREAM FIX: En lugar de stop() y removeTrack(), solo deshabilitar
          cameraTrack.enabled = false;

          console.log('📹 [TEACHER-DUAL] Track de video deshabilitado, aún en stream');

          // ✅ CRITICAL FIX: Renegociar con todos los estudiantes para que vean el cambio
          const viewerIds = Object.keys(peerConnectionsRef.current);
          for (const viewerId of viewerIds) {
            const pc = peerConnectionsRef.current[viewerId];
            if (pc.connectionState !== 'closed' && pc.connectionState !== 'failed') {
              try {
                const offer = await pc.createOffer();
                offer.sdp = forceH264Codec(offer.sdp);
                await pc.setLocalDescription(offer);
                socketRef.current.emit('offer', { viewerId, offer });
                console.log(`📤 [TEACHER-DUAL] Offer de renegociación enviado a viewer ${viewerId} (cámara desactivada)`);
              } catch (error) {
                console.error(`❌ [TEACHER-DUAL] Error renegociando con ${viewerId}:`, error);
              }
            }
          }
        }

        // ✅ Notificar a todos los estudiantes que la cámara está desactivada
        socketRef.current.emit('teacher-camera-status', {
          courseId: course.id,
          cameraEnabled: false
        });

        setIsVideoEnabled(false);
        showToastMessage('Cámara desactivada', 'info');
      } else {
        // ENABLE: Reactivar cámara
        // ✅ FIX: Usar cameraTrack identificado arriba
        if (cameraTrack && cameraTrack.readyState === 'ended') {
          // El track fue detenido completamente, necesitamos crear uno nuevo
          console.log('⚠️ [TEACHER-DUAL] Track de cámara está en estado "ended", necesita reacquisición');

          try {
            // ✅ FIX CRÍTICO: Asegurar que TODOS los tracks de video ended sean limpiados primero
            console.log('🧹 [TEACHER-DUAL] Limpiando todos los tracks ended del streamRef antes de reacquisición');
            const allTracks = streamRef.current.getTracks();
            allTracks.forEach(track => {
              if (track.readyState === 'ended') {
                console.log(`🧹 [TEACHER-DUAL] Removiendo track ended: ${track.kind} - ${track.label}`);
                streamRef.current.removeTrack(track);
              }
            });

            // Esperar un momento para que el navegador libere los recursos
            await new Promise(resolve => setTimeout(resolve, 100));

            console.log('📹 [TEACHER-DUAL] Solicitando nueva cámara...');
            const newStream = await navigator.mediaDevices.getUserMedia({
              video: true,
              audio: false
            });
            const newVideoTrack = newStream.getVideoTracks()[0];
            console.log('✅ [TEACHER-DUAL] Nueva cámara obtenida:', newVideoTrack.label);

            // Agregar el nuevo track al stream
            streamRef.current.addTrack(newVideoTrack);
            console.log('✅ [TEACHER-DUAL] Nuevo track agregado al streamRef');

            // Reemplazar en peer connections
            const viewerIds = Object.keys(peerConnectionsRef.current);
            for (const viewerId of viewerIds) {
              const pc = peerConnectionsRef.current[viewerId];
              if (pc.connectionState === 'closed') {
                console.log(`⚠️ [TEACHER-DUAL] Peer connection con ${viewerId} está cerrada, saltando`);
                continue;
              }

              const senders = pc.getSenders();

              // Buscar el sender del track de cámara (NO el de pantalla)
              const cameraSender = senders.find(s => {
                if (!s.track || s.track.kind !== 'video') return false;
                // Si está compartiendo pantalla, hay 2 senders de video
                // El de cámara es el que está ended o no coincide con pantalla
                if (isScreenSharing) {
                  const screenTrack = screenStreamRef.current?.getVideoTracks()[0];
                  return s.track.id !== screenTrack?.id;
                }
                return true; // Si no hay screen share, cualquier video sender es la cámara
              });

              if (cameraSender) {
                await cameraSender.replaceTrack(newVideoTrack);
                console.log(`✅ [TEACHER-DUAL] Track de cámara reemplazado para viewer ${viewerId}`);
              } else {
                // Si no hay sender, agregarlo
                pc.addTrack(newVideoTrack, streamRef.current);
                console.log(`➕ [TEACHER-DUAL] Track de cámara agregado para viewer ${viewerId}`);
              }

              // ✅ CRITICAL FIX: Renegociar para actualizar el stream en el estudiante
              try {
                const offer = await pc.createOffer();
                offer.sdp = forceH264Codec(offer.sdp);
                await pc.setLocalDescription(offer);
                socketRef.current.emit('offer', { viewerId, offer });
                console.log(`📤 [TEACHER-DUAL] Offer de renegociación enviado a viewer ${viewerId} (cámara reactivada)`);
              } catch (renegotiateError) {
                console.error(`❌ [TEACHER-DUAL] Error renegociando con ${viewerId}:`, renegotiateError);
              }
            }

            // ✅ CRÍTICO: NO actualizar videoRef si está compartiendo pantalla
            // porque videoRef debe mostrar la pantalla, NO la cámara
            if (videoRef.current && !isScreenSharing) {
              videoRef.current.srcObject = streamRef.current;
              await videoRef.current.play();
            }
          } catch (error) {
            console.error('❌ [TEACHER-DUAL] Error al acceder a la cámara:', error);
            console.error('❌ [TEACHER-DUAL] Error details:', {
              name: error.name,
              message: error.message,
              constraint: error.constraint
            });

            let errorMessage = 'Error al acceder a la cámara. ';
            if (error.name === 'NotAllowedError') {
              errorMessage += 'Permiso denegado.';
            } else if (error.name === 'NotFoundError') {
              errorMessage += 'No se encontró cámara disponible.';
            } else if (error.name === 'NotReadableError' || error.message.includes('videoinput')) {
              errorMessage += 'La cámara está en uso por otra aplicación. Cierra otras apps que usen la cámara e intenta nuevamente.';
            } else {
              errorMessage += error.message;
            }

            showToastMessage(errorMessage, 'error');
            return;
          }
        } else if (cameraTrack) {
          // El track existe y solo está deshabilitado, simplemente habilitarlo
          console.log('📹 [TEACHER-DUAL] Habilitando track de cámara existente');
          cameraTrack.enabled = true;

          // ✅ CRITICAL FIX: Renegociar con todos los estudiantes para que vean el cambio
          const viewerIds = Object.keys(peerConnectionsRef.current);
          for (const viewerId of viewerIds) {
            const pc = peerConnectionsRef.current[viewerId];
            if (pc.connectionState !== 'closed' && pc.connectionState !== 'failed') {
              try {
                const offer = await pc.createOffer();
                offer.sdp = forceH264Codec(offer.sdp);
                await pc.setLocalDescription(offer);
                socketRef.current.emit('offer', { viewerId, offer });
                console.log(`📤 [TEACHER-DUAL] Offer de renegociación enviado a viewer ${viewerId} (cámara activada)`);
              } catch (error) {
                console.error(`❌ [TEACHER-DUAL] Error renegociando con ${viewerId}:`, error);
              }
            }
          }

          // ✅ CRÍTICO: NO actualizar videoRef si está compartiendo pantalla
          // porque videoRef debe mostrar la pantalla, NO la cámara
          if (videoRef.current && !isScreenSharing) {
            console.log('📹 [TEACHER-DUAL] Actualizando videoRef para refrescar imagen');
            videoRef.current.srcObject = streamRef.current;
            videoRef.current.play().catch(err => console.log('Autoplay prevented:', err));
          }
        }

        // ✅ Notificar a todos los estudiantes que la cámara está activada
        socketRef.current.emit('teacher-camera-status', {
          courseId: course.id,
          cameraEnabled: true
        });

        setIsVideoEnabled(true);
        showToastMessage('Cámara activada', 'info');
      }
    }
  };

  const toggleScreenShare = async () => {
    try {
      if (!isScreenSharing) {
        // ✅ DUAL STREAM: Request lock FIRST before asking for screen permission
        console.log('📺 [TEACHER-DUAL] Requesting screen share lock...');

        // Create a promise to wait for lock response
        const lockPromise = new Promise((resolve, reject) => {
          const timeoutId = setTimeout(() => {
            reject(new Error('Timeout esperando respuesta del servidor'));
          }, 5000);

          const lockAcquiredHandler = () => {
            clearTimeout(timeoutId);
            socketRef.current.off('screen-share-denied', deniedHandler);
            resolve(true);
          };

          const deniedHandler = ({ reason, sharerName }) => {
            clearTimeout(timeoutId);
            socketRef.current.off('screen-share-lock-acquired', lockAcquiredHandler);
            reject(new Error(`${sharerName} ya está compartiendo pantalla`));
          };

          socketRef.current.once('screen-share-lock-acquired', lockAcquiredHandler);
          socketRef.current.once('screen-share-denied', deniedHandler);
        });

        // Request lock
        socketRef.current.emit('request-start-screen-share', { courseId: course.id });

        // Wait for lock - Si falla, lanza error ANTES de pedir permiso al navegador
        try {
          await lockPromise;
          console.log('✅ [TEACHER-DUAL] Screen share lock acquired');
        } catch (lockError) {
          console.log('❌ [TEACHER-DUAL] Lock denied:', lockError.message);
          throw lockError; // Re-lanzar para que se maneje en el catch principal
        }

        // Solo si tenemos el lock, pedimos permiso al navegador
        const screenStream = await navigator.mediaDevices.getDisplayMedia({
          video: true,
          audio: false
        });

        const screenVideoTrack = screenStream.getVideoTracks()[0];

        // ✅ DUAL STREAM: Agregar el track de pantalla AL MISMO STREAM de streamRef
        console.log('✅ [TEACHER-DUAL] Agregando track de pantalla al stream principal');

        // ✅ FIX: Verificar que no haya duplicados antes de agregar
        const existingTracks = streamRef.current.getVideoTracks();
        const screenTrackAlreadyExists = existingTracks.some(t => t.id === screenVideoTrack.id);

        if (!screenTrackAlreadyExists) {
          streamRef.current.addTrack(screenVideoTrack);
          console.log('✅ [TEACHER-DUAL] Track de pantalla agregado (total tracks ahora:', streamRef.current.getTracks().length, ')');
        } else {
          console.log('⚠️ [TEACHER-DUAL] Track de pantalla ya existe, no se duplica');
        }

        // ✅ Guardar ref de pantalla para limpiar después
        screenStreamRef.current = screenStream;

        console.log('✅ [TEACHER-DUAL] Stream ahora tiene:', streamRef.current.getTracks().map(t => `${t.kind}: ${t.label}`));

        // ✅ DUAL STREAM: Agregar el track de pantalla a las peer connections existentes
        const viewerIds = Object.keys(peerConnectionsRef.current);
        console.log('📤 [TEACHER-DUAL] Agregando track de pantalla a peer connections:', viewerIds);

        for (const viewerId of viewerIds) {
          const pc = peerConnectionsRef.current[viewerId];

          // ✅ CRITICAL FIX: Verificar estado de la peer connection antes de agregar tracks
          console.log(`🔍 [TEACHER-DUAL] Peer connection state para ${viewerId}: connectionState=${pc.connectionState}, signalingState=${pc.signalingState}`);

          if (pc.connectionState === 'closed' || pc.connectionState === 'failed') {
            console.error(`❌ [TEACHER-DUAL] Peer connection con ${viewerId} está ${pc.connectionState}, saltando`);
            continue;
          }

          // ✅ FIX: Verificar que no haya duplicados antes de agregar
          const senders = pc.getSenders();
          const screenSenderExists = senders.some(s => s.track?.id === screenVideoTrack.id);

          if (!screenSenderExists) {
            try {
              // Agregar el track de pantalla al peer connection (SIN remover el de cámara)
              pc.addTrack(screenVideoTrack, streamRef.current);
              console.log(`✅ [TEACHER-DUAL] Track de pantalla agregado para viewer ${viewerId}`);
            } catch (error) {
              console.error(`❌ [TEACHER-DUAL] Error agregando track para ${viewerId}:`, error);
              continue;
            }
          } else {
            console.log(`⚠️ [TEACHER-DUAL] Track de pantalla ya existe para viewer ${viewerId}, no se duplica`);
          }

          // ✅ CRITICAL FIX: Verificar signaling state antes de renegociar
          if (pc.signalingState !== 'stable') {
            console.warn(`⚠️ [TEACHER-DUAL] Peer connection con ${viewerId} no está en estado stable (${pc.signalingState}), esperando...`);

            // Esperar a que esté stable
            await new Promise((resolve) => {
              if (pc.signalingState === 'stable') {
                resolve();
                return;
              }

              const checkStable = () => {
                if (pc.signalingState === 'stable') {
                  pc.removeEventListener('signalingstatechange', checkStable);
                  resolve();
                }
              };

              pc.addEventListener('signalingstatechange', checkStable);

              // Timeout de 3 segundos
              setTimeout(() => {
                pc.removeEventListener('signalingstatechange', checkStable);
                console.error(`❌ [TEACHER-DUAL] Timeout esperando signaling stable para ${viewerId}`);
                resolve();
              }, 3000);
            });
          }

          try {
            // Renegociar para enviar el nuevo track
            console.log(`📤 [TEACHER-DUAL] Creando offer para ${viewerId}...`);
            const offer = await pc.createOffer();
            offer.sdp = forceH264Codec(offer.sdp);
            await pc.setLocalDescription(offer);
            socketRef.current.emit('offer', { viewerId, offer });
            console.log(`✅ [TEACHER-DUAL] Offer enviado con transmisión dual a viewer ${viewerId}`);
          } catch (error) {
            console.error(`❌ [TEACHER-DUAL] Error en renegociación con ${viewerId}:`, error);
          }
        }

        // Actualizar videoRef para mostrar pantalla compartida en el video principal
        if (videoRef.current) {
          videoRef.current.srcObject = screenStream;
          console.log('📺 [TEACHER-DUAL] Screen share started - displaying in main frame');
        }

        screenVideoTrack.onended = () => {
          toggleScreenShare();
        };

        setIsScreenSharing(true);
        isScreenSharingRef.current = true;

        // Notificar a los estudiantes que el docente está compartiendo pantalla
        socketRef.current.emit('teacher-screen-share-status', {
          courseId: course.id,
          isSharing: true
        });

        showToastMessage('Compartiendo pantalla + cámara', 'info');
      } else {
        // Detener compartición de pantalla
        console.log('🛑 [TEACHER-DUAL] Deteniendo pantalla compartida');

        // ✅ DUAL STREAM: Remover track de pantalla del stream principal
        if (screenStreamRef.current) {
          const screenTrack = screenStreamRef.current.getVideoTracks()[0];
          if (screenTrack) {
            streamRef.current.removeTrack(screenTrack);
            console.log('✅ [TEACHER-DUAL] Track de pantalla removido del stream principal');
          }
        }

        console.log('✅ [TEACHER-DUAL] Stream ahora tiene:', streamRef.current.getTracks().map(t => `${t.kind}: ${t.label}`));

        // ✅ DUAL STREAM: Remover sender de pantalla de las peer connections
        const viewerIds = Object.keys(peerConnectionsRef.current);
        console.log('📤 [TEACHER-DUAL] Removiendo track de pantalla de peer connections:', viewerIds);

        for (const viewerId of viewerIds) {
          const pc = peerConnectionsRef.current[viewerId];

          // ✅ CRITICAL FIX: Verificar estado de la peer connection
          console.log(`🔍 [TEACHER-DUAL] Peer connection state para ${viewerId}: connectionState=${pc.connectionState}, signalingState=${pc.signalingState}`);

          if (pc.connectionState === 'closed' || pc.connectionState === 'failed') {
            console.error(`❌ [TEACHER-DUAL] Peer connection con ${viewerId} está ${pc.connectionState}, saltando`);
            continue;
          }

          const senders = pc.getSenders();

          // Encontrar el sender del track de pantalla
          const screenSender = senders.find(sender => {
            if (!sender.track || sender.track.kind !== 'video') return false;
            if (!screenStreamRef.current) return false;

            const screenTrack = screenStreamRef.current.getVideoTracks()[0];
            return sender.track.id === screenTrack.id;
          });

          if (screenSender) {
            try {
              pc.removeTrack(screenSender);
              console.log(`✅ [TEACHER-DUAL] Sender de pantalla removido para viewer ${viewerId}`);
            } catch (error) {
              console.error(`❌ [TEACHER-DUAL] Error removiendo track para ${viewerId}:`, error);
              continue;
            }

            // ✅ CRITICAL FIX: Verificar signaling state antes de renegociar
            if (pc.signalingState !== 'stable') {
              console.warn(`⚠️ [TEACHER-DUAL] Peer connection con ${viewerId} no está en estado stable (${pc.signalingState}), esperando...`);

              // Esperar a que esté stable
              await new Promise((resolve) => {
                if (pc.signalingState === 'stable') {
                  resolve();
                  return;
                }

                const checkStable = () => {
                  if (pc.signalingState === 'stable') {
                    pc.removeEventListener('signalingstatechange', checkStable);
                    resolve();
                  }
                };

                pc.addEventListener('signalingstatechange', checkStable);

                // Timeout de 3 segundos
                setTimeout(() => {
                  pc.removeEventListener('signalingstatechange', checkStable);
                  console.error(`❌ [TEACHER-DUAL] Timeout esperando signaling stable para ${viewerId}`);
                  resolve();
                }, 3000);
              });
            }

            try {
              // Renegociar para actualizar
              console.log(`📤 [TEACHER-DUAL] Creando offer para ${viewerId}...`);
              const offer = await pc.createOffer();
              offer.sdp = forceH264Codec(offer.sdp);
              await pc.setLocalDescription(offer);
              socketRef.current.emit('offer', { viewerId, offer });
              console.log(`✅ [TEACHER-DUAL] Offer enviado con solo cámara a viewer ${viewerId}`);
            } catch (error) {
              console.error(`❌ [TEACHER-DUAL] Error en renegociación con ${viewerId}:`, error);
            }
          }
        }

        // Restaurar videoRef al stream de cámara
        if (videoRef.current && streamRef.current) {
          videoRef.current.srcObject = streamRef.current;
          console.log('✅ [TEACHER-DUAL] Screen share stopped - camera restored to main frame');
        }

        // ✅ Detener y limpiar stream de pantalla compartida
        if (screenStreamRef.current) {
          screenStreamRef.current.getTracks().forEach(track => track.stop());
          screenStreamRef.current = null;
          console.log('✅ [TEACHER-DUAL] Screen stream stopped and cleared');
        }

        setIsScreenSharing(false);
        isScreenSharingRef.current = false;

        // ✅ DUAL STREAM: Release screen share lock
        socketRef.current.emit('stop-screen-share', { courseId: course.id });

        // Notificar a los estudiantes que el docente dejó de compartir pantalla (backward compatibility)
        socketRef.current.emit('teacher-screen-share-status', {
          courseId: course.id,
          isSharing: false
        });

        showToastMessage('Pantalla dejada de compartir', 'info');
      }
    } catch (error) {
      console.error('Error al compartir pantalla:', error);

      // If we failed to get screen stream but acquired the lock, release it
      if (error.message && !error.message.includes('ya está compartiendo')) {
        socketRef.current.emit('stop-screen-share', { courseId: course.id });
      }

      showToastMessage(error.message || 'Error al compartir pantalla', 'error');
    }
  };

  const toggleFullscreen = () => {
    if (!isFullscreen) {
      if (containerRef.current.requestFullscreen) {
        containerRef.current.requestFullscreen();
      }
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen();
      }
    }
    setIsFullscreen(!isFullscreen);
  };

  const handleSendMessage = (e) => {
    e.preventDefault();
    if (newMessage.trim()) {
      const message = {
        id: Date.now(),
        text: newMessage,
        sender: 'Docente',
        timestamp: new Date().toISOString()
      };
      socketRef.current.emit('chat-message', { courseId: course.id, message });
      // ✅ NO agregar aquí - se agregará cuando llegue por socket (línea 197-199)
      // Esto evita duplicación para el remitente
      setNewMessage('');
    }
  };

  const copyRoomLink = () => {
    const roomLink = `${window.location.origin}/alumno/curso/${course.id}?tab=live&room=${roomCode}`;
    navigator.clipboard.writeText(roomLink).then(() => {
      setCopied(true);
      showToastMessage('Enlace copiado al portapapeles', 'success');
      setTimeout(() => setCopied(false), 2000);
    });
  };

  // Función para intercambiar video con doble clic
  const handleSwapVideo = (participantId) => {
    console.log('🔄 Intercambiando video con participante:', participantId);
    if (pinnedParticipant === participantId) {
      // Si ya está pinneado, volver al docente
      setPinnedParticipant(null);
      showToastMessage('Video del docente en principal', 'info');
    } else {
      // Pinnear el participante
      setPinnedParticipant(participantId);
      showToastMessage(`Video de ${viewersList.find(v => v.id === participantId)?.name || 'estudiante'} en principal`, 'info');
    }
  };

  // Funciones de pizarra
  const startDrawing = (e) => {
    if (!showWhiteboard) return;

    // ✅ CRITICAL FIX: Prevenir arrastre de imagen y comportamiento por defecto
    e.preventDefault();
    e.stopPropagation();

    setIsDrawing(true);
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    const rect = canvas.getBoundingClientRect();

    // Calcular coordenadas escaladas correctamente
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    const x = (e.clientX - rect.left) * scaleX;
    const y = (e.clientY - rect.top) * scaleY;

    ctx.lineWidth = drawTool === 'eraser' ? 20 : drawWidth;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    if (drawTool === 'eraser') {
      ctx.globalCompositeOperation = 'destination-out';
      ctx.strokeStyle = 'rgba(0,0,0,1)';
    } else {
      ctx.globalCompositeOperation = 'source-over';
      ctx.strokeStyle = drawColor;
      ctx.fillStyle = drawColor;
    }

    ctx.beginPath();
    ctx.moveTo(x, y);

    // Emitir evento de inicio de dibujo
    console.log('🎨 [TEACHER] Emitiendo whiteboard-start:', { x, y, color: drawColor, width: drawWidth, tool: drawTool });
    socketRef.current.emit('whiteboard-start', {
      courseId: course.id,
      x,
      y,
      color: drawColor,
      width: drawWidth,
      tool: drawTool
    });
  };

  const draw = (e) => {
    if (!isDrawing || !showWhiteboard) return;

    // ✅ CRITICAL FIX: Prevenir arrastre de imagen
    e.preventDefault();
    e.stopPropagation();

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    const rect = canvas.getBoundingClientRect();

    // Calcular coordenadas escaladas correctamente
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    const x = (e.clientX - rect.left) * scaleX;
    const y = (e.clientY - rect.top) * scaleY;

    ctx.lineTo(x, y);
    ctx.stroke();

    // Emitir evento de dibujo
    socketRef.current.emit('whiteboard-draw', {
      courseId: course.id,
      x,
      y
    });
  };

  const stopDrawing = () => {
    if (isDrawing) {
      const canvas = canvasRef.current;
      const ctx = canvas.getContext('2d');
      ctx.closePath();
      ctx.globalCompositeOperation = 'source-over';

      // Emitir evento de fin de dibujo
      console.log('🎨 [TEACHER] Emitiendo whiteboard-stop');
      socketRef.current.emit('whiteboard-stop', {
        courseId: course.id
      });
    }
    setIsDrawing(false);
  };

  const clearWhiteboard = () => {
    setConfirmAction({
      title: 'Limpiar Pizarra',
      message: '¿Estás seguro de que deseas limpiar toda la pizarra? Esta acción no se puede deshacer.',
      onConfirm: () => {
        const canvas = canvasRef.current;
        const ctx = canvas.getContext('2d');
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        // Emitir evento para limpiar en todos los clientes
        socketRef.current.emit('whiteboard-clear', {
          courseId: course.id
        });

        showToastMessage('Pizarra limpiada', 'info');
        setShowConfirmDialog(false);
      }
    });
    setShowConfirmDialog(true);
  };

  const downloadWhiteboard = () => {
    try {
      if (!canvasRef.current) {
        showToastMessage('No hay pizarra disponible para descargar', 'warning');
        return;
      }

      // Crear un canvas temporal para combinar video + dibujos
      const tempCanvas = document.createElement('canvas');
      const video = videoRef.current;

      // Usar las dimensiones del canvas de la pizarra
      tempCanvas.width = canvasRef.current.width;
      tempCanvas.height = canvasRef.current.height;

      const tempCtx = tempCanvas.getContext('2d');

      // Si hay video y está compartiendo pantalla, capturar el frame actual
      if (video && video.srcObject && isScreenSharing) {
        // Dibujar el video en el canvas temporal
        tempCtx.drawImage(video, 0, 0, tempCanvas.width, tempCanvas.height);
      } else {
        // Fondo blanco si no hay video
        tempCtx.fillStyle = '#FFFFFF';
        tempCtx.fillRect(0, 0, tempCanvas.width, tempCanvas.height);
      }

      // Superponer los dibujos del canvas
      tempCtx.drawImage(canvasRef.current, 0, 0);

      // Crear enlace de descarga
      const link = document.createElement('a');
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
      link.download = `pizarra-${course.code}-${timestamp}.png`;
      link.href = tempCanvas.toDataURL('image/png');
      link.click();

      showToastMessage('Pizarra descargada exitosamente', 'success');
      console.log('💾 [TEACHER] Pizarra descargada');
    } catch (error) {
      console.error('❌ Error al descargar pizarra:', error);
      showToastMessage('Error al descargar la pizarra', 'error');
    }
  };

  // ✅ SCREEN SHARE AUTHORIZATION: Aprobar solicitud
  const approveScreenShare = (viewerId) => {
    socketRef.current.emit('approve-screen-share', { viewerId });
    setScreenShareRequests(prev => prev.filter(req => req.viewerId !== viewerId));
    if (screenShareRequests.length === 1) {
      setShowScreenShareRequestModal(false);
    }
    showToastMessage('Permiso concedido', 'success');
  };

  // ✅ SCREEN SHARE AUTHORIZATION: Denegar solicitud
  const denyScreenShare = (viewerId) => {
    socketRef.current.emit('deny-screen-share', { viewerId });
    setScreenShareRequests(prev => prev.filter(req => req.viewerId !== viewerId));
    if (screenShareRequests.length === 1) {
      setShowScreenShareRequestModal(false);
    }
    showToastMessage('Permiso denegado', 'info');
  };

  const handleScheduleClass = async () => {
    if (!scheduleForm.title || !scheduleForm.date || !scheduleForm.time) {
      showToastMessage('Por favor completa todos los campos requeridos', 'warning');
      return;
    }

    // Validar que la fecha/hora no sea en el pasado
    const now = new Date();
    const selectedDate = new Date(scheduleForm.date);
    const [hours, minutes] = scheduleForm.time.split(':').map(Number);
    selectedDate.setHours(hours, minutes, 0, 0);

    if (selectedDate < now) {
      showToastMessage('No puedes programar clases en el pasado. Por favor selecciona una fecha y hora futura.', 'error');
      return;
    }

    try {
      setLoading(true);
      const response = await api.post(`/courses/${course.id}/schedule-class`, scheduleForm);

      if (response.data.success) {
        // Recargar clases programadas
        await loadScheduledClasses();
        setShowScheduleModal(false);
        setScheduleForm({
          title: '',
          description: '',
          date: '',
          time: '',
          duration: 60
        });
        showToastMessage('Clase programada exitosamente', 'success');
      } else {
        showToastMessage(response.data.message || 'Error al programar la clase', 'error');
      }
    } catch (error) {
      console.error('Error al programar clase:', error);
      const errorMessage = error.response?.data?.message || error.message || 'Error al programar la clase';
      showToastMessage(errorMessage, 'error');
    } finally {
      setLoading(false);
    }
  };

  // Cargar clases programadas desde el backend
  const loadScheduledClasses = async () => {
    try {
      const response = await api.get(`/courses/${course.id}/scheduled-classes`);

      if (response.data.success) {
        // Ordenar clases por fecha más cercana primero
        const sortedClasses = (response.data.classes || []).sort((a, b) => {
          const now = new Date();

          const dateA = new Date(a.date);
          const [hoursA, minutesA] = a.time.split(':').map(Number);
          dateA.setHours(hoursA, minutesA, 0, 0);

          const dateB = new Date(b.date);
          const [hoursB, minutesB] = b.time.split(':').map(Number);
          dateB.setHours(hoursB, minutesB, 0, 0);

          // Calcular diferencia en milisegundos desde ahora
          const diffA = Math.abs(dateA - now);
          const diffB = Math.abs(dateB - now);

          return diffA - diffB; // Más cercana primero
        });

        setScheduledClasses(sortedClasses);
        console.log(`✅ [LIVE-TAB] ${sortedClasses.length} clases programadas cargadas (ordenadas por proximidad)`);
      } else {
        setScheduledClasses([]);
      }
    } catch (error) {
      console.error('Error al cargar clases programadas:', error);
      setScheduledClasses([]);
    }
  };

  // Cargar clases programadas al montar y cuando la vista sea 'schedule'
  useEffect(() => {
    if (view === 'schedule') {
      loadScheduledClasses();
    }
  }, [view, course.id]);

  const handleCancelScheduledClass = (classId) => {
    setConfirmAction({
      title: 'Cancelar Clase Programada',
      message: '¿Estás seguro de que deseas cancelar esta clase programada?',
      onConfirm: async () => {
        try {
          const response = await api.delete(`/courses/${course.id}/scheduled-classes/${classId}`);

          if (response.data.success) {
            await loadScheduledClasses();
            showToastMessage('Clase cancelada exitosamente', 'info');
          } else {
            showToastMessage(response.data.message || 'Error al cancelar la clase', 'error');
          }
        } catch (error) {
          console.error('Error al cancelar clase:', error);
          const errorMessage = error.response?.data?.message || error.message || 'Error al cancelar la clase';
          showToastMessage(errorMessage, 'error');
        }
        setShowConfirmDialog(false);
      }
    });
    setShowConfirmDialog(true);
  };

  // Vista de programación
  // NOTA: No retornamos aquí para permitir que el modal se renderice sobre cualquier vista
  const scheduleView = view === 'schedule' && (
      <div className="space-y-6">
        {/* Header */}
        <div className="bg-white rounded-lg shadow-lg p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-gradient-to-br from-red-500 to-pink-600 rounded-xl shadow-md">
                <Video size={28} className="text-white" />
              </div>
              <div>
                <h2 className="text-2xl font-bold text-gray-800">Clases en Vivo</h2>
                <p className="text-sm text-gray-500">
                  Programa o inicia una clase inmediatamente
                </p>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-2 sm:gap-3">
              <button
                onClick={() => setShowScheduleModal(true)}
                className="flex items-center justify-center gap-2 px-3 py-2 sm:px-4 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition font-semibold text-sm sm:text-base"
              >
                <Calendar size={18} className="sm:w-5 sm:h-5" />
                <span>Programar Clase</span>
              </button>
              <button
                onClick={handleStartStreamingClick}
                disabled={loading}
                className="flex items-center justify-center gap-2 px-3 py-2 sm:px-4 bg-gradient-to-r from-red-500 to-red-600 text-white rounded-lg hover:shadow-lg transition font-semibold disabled:opacity-50 text-sm sm:text-base"
              >
                {loading ? (
                  <>
                    <Loader size={20} className="animate-spin" />
                    Iniciando...
                  </>
                ) : (
                  <>
                    <Play size={20} />
                    Iniciar Ahora
                  </>
                )}
              </button>
            </div>
          </div>
        </div>

        {/* Clases Programadas - Carrusel */}
        <div className="bg-white rounded-lg shadow-lg p-6">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-xl font-bold text-gray-800 flex items-center gap-2">
              <Calendar size={24} className="text-blue-600" />
              Clases Programadas ({scheduledClasses.length})
            </h3>
            <button
              onClick={() => setShowClassRecordsModal(true)}
              className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-purple-600 to-indigo-600 text-white rounded-lg hover:shadow-lg transition font-semibold"
            >
              <List size={20} />
              Ver Todos los Registros
            </button>
          </div>

          {scheduledClasses.length > 0 ? (
            <ScheduledClassesCarousel
              scheduledClasses={scheduledClasses}
              onStartClass={handleStartStreamingClick}
              loading={loading}
            />
          ) : (
            <div className="text-center py-12">
              <Calendar className="mx-auto text-gray-300 mb-4" size={48} />
              <p className="text-gray-600 mb-4">No hay clases programadas</p>
              <button
                onClick={() => setShowScheduleModal(true)}
                className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition font-semibold"
              >
                Programar Primera Clase
              </button>
            </div>
          )}
        </div>

        {/* Modal de Programar Clase */}
        {showScheduleModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full">
              <div className="bg-gradient-to-r from-blue-600 to-cyan-600 text-white p-6 flex items-center justify-between rounded-t-xl">
                <div className="flex items-center gap-3">
                  <Calendar size={24} />
                  <h3 className="text-xl font-bold">Programar Nueva Clase</h3>
                </div>
                <button
                  onClick={() => setShowScheduleModal(false)}
                  className="hover:bg-white hover:bg-opacity-20 p-2 rounded-full transition"
                >
                  <X size={24} />
                </button>
              </div>

              <div className="p-6 space-y-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Título de la clase *
                  </label>
                  <input
                    type="text"
                    value={scheduleForm.title}
                    onChange={(e) => setScheduleForm({ ...scheduleForm, title: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Ej: Introducción a React"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Descripción
                  </label>
                  <textarea
                    value={scheduleForm.description}
                    onChange={(e) => setScheduleForm({ ...scheduleForm, description: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                    rows="3"
                    placeholder="Descripción de la clase..."
                  />
                </div>

                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Fecha *
                    </label>
                    <input
                      type="date"
                      value={scheduleForm.date}
                      onChange={(e) => setScheduleForm({ ...scheduleForm, date: e.target.value })}
                      min={new Date().toISOString().split('T')[0]}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Hora *
                    </label>
                    <input
                      type="time"
                      value={scheduleForm.time}
                      onChange={(e) => setScheduleForm({ ...scheduleForm, time: e.target.value })}
                      min={
                        scheduleForm.date === new Date().toISOString().split('T')[0]
                          ? new Date().toTimeString().slice(0, 5)
                          : undefined
                      }
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Duración (min)
                    </label>
                    <input
                      type="number"
                      value={scheduleForm.duration}
                      onChange={(e) => setScheduleForm({ ...scheduleForm, duration: parseInt(e.target.value) || 60 })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      min="15"
                    />
                  </div>
                </div>
                <p className="text-xs text-gray-500 mt-2">
                  * Solo puedes programar clases desde la fecha y hora actual en adelante
                </p>
              </div>

              <div className="bg-gray-50 px-6 py-4 flex gap-3 rounded-b-xl">
                <button
                  onClick={() => setShowScheduleModal(false)}
                  className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-100:bg-gray-700 transition font-semibold"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleScheduleClass}
                  className="flex-1 px-4 py-2 bg-gradient-to-r from-blue-600 to-cyan-600 text-white rounded-lg hover:shadow-lg transition font-semibold"
                >
                  <Plus size={20} className="inline mr-2" />
                  Programar Clase
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Modal de Preferencias de Inicio */}
        {showStartPreferencesModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl shadow-2xl max-w-md w-full">
              <div className="bg-gradient-to-r from-red-500 to-pink-600 text-white p-6 flex items-center justify-between rounded-t-xl">
                <div className="flex items-center gap-3">
                  <Video size={24} />
                  <h3 className="text-xl font-bold">Preferencias de Inicio</h3>
                </div>
                <button
                  onClick={() => setShowStartPreferencesModal(false)}
                  className="hover:bg-white hover:bg-opacity-20 p-2 rounded-full transition"
                >
                  <X size={24} />
                </button>
              </div>

              <div className="p-6 space-y-6">
                <p className="text-gray-600 text-sm">
                  Configura cómo deseas iniciar la clase en vivo:
                </p>

                {/* Opción de cámara */}
                <div className="flex items-center justify-between p-4 bg-gray-50/50 rounded-lg">
                  <div className="flex items-center gap-3">
                    {startWithCamera ? (
                      <Video size={24} className="text-green-600" />
                    ) : (
                      <VideoOff size={24} className="text-red-600" />
                    )}
                    <div>
                      <p className="font-semibold text-gray-800">Cámara</p>
                      <p className="text-xs text-gray-500">
                        {startWithCamera ? 'Iniciar con cámara encendida' : 'Iniciar con cámara apagada'}
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => setStartWithCamera(!startWithCamera)}
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                      startWithCamera ? 'bg-green-600' : 'bg-gray-300'
                    }`}
                  >
                    <span
                      className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                        startWithCamera ? 'translate-x-6' : 'translate-x-1'
                      }`}
                    />
                  </button>
                </div>

                {/* Opción de audio */}
                <div className="flex items-center justify-between p-4 bg-gray-50/50 rounded-lg">
                  <div className="flex items-center gap-3">
                    {startWithAudio ? (
                      <Mic size={24} className="text-green-600" />
                    ) : (
                      <MicOff size={24} className="text-red-600" />
                    )}
                    <div>
                      <p className="font-semibold text-gray-800">Micrófono</p>
                      <p className="text-xs text-gray-500">
                        {startWithAudio ? 'Iniciar con micrófono encendido' : 'Iniciar con micrófono apagado'}
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => setStartWithAudio(!startWithAudio)}
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                      startWithAudio ? 'bg-green-600' : 'bg-gray-300'
                    }`}
                  >
                    <span
                      className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                        startWithAudio ? 'translate-x-6' : 'translate-x-1'
                      }`}
                    />
                  </button>
                </div>

                <div className="bg-blue-50/20 border border-blue-200 rounded-lg p-3">
                  <p className="text-xs text-blue-800">
                    <AlertCircle size={14} className="inline mr-1" />
                    Podrás activar/desactivar la cámara y el micrófono en cualquier momento durante la clase.
                  </p>
                </div>
              </div>

              <div className="bg-gray-50 px-6 py-4 flex gap-3 rounded-b-xl">
                <button
                  onClick={() => setShowStartPreferencesModal(false)}
                  className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-100:bg-gray-700 transition font-semibold"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleConfirmStartPreferences}
                  className="flex-1 px-4 py-2 bg-gradient-to-r from-red-500 to-pink-600 text-white rounded-lg hover:shadow-lg transition font-semibold"
                >
                  <Play size={20} className="inline mr-2" />
                  Iniciar Clase
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Instrucciones */}
        <div className="bg-blue-50/20 border border-blue-200 rounded-lg p-6">
          <h3 className="font-bold text-blue-900 mb-3 flex items-center gap-2">
            <AlertCircle size={20} />
            Instrucciones
          </h3>
          <ul className="space-y-2 text-sm text-blue-800">
            <li>• Puedes <strong>programar clases</strong> con anticipación o <strong>iniciar inmediatamente</strong></li>
            <li>• Los estudiantes recibirán notificaciones cuando inicies una clase</li>
            <li>• Asegúrate de tener buena conexión a internet y permisos de cámara/micrófono</li>
            <li>• Todas las acciones quedarán registradas en el sistema</li>
          </ul>
        </div>

        {/* Confirmación y Toast */}
        <ConfirmDialog
          isOpen={showConfirmDialog}
          onClose={() => setShowConfirmDialog(false)}
          onConfirm={confirmAction?.onConfirm}
          title={confirmAction?.title}
          message={confirmAction?.message}
          confirmText="Confirmar"
          cancelText="Cancelar"
          type="warning"
        />

        <Toast
          isOpen={showToast}
          onClose={() => setShowToast(false)}
          message={toastMessage}
          type={toastType}
        />
      </div>
    );

  // ✅ Si es vista minimizada, renderizar todo pero ocultar UI, solo mostrar video
  // No podemos hacer early return porque necesitamos que los useEffect se ejecuten

  // SIEMPRE retornamos el layout completo con modal y vista base
  return (
    <div className="space-y-6">
      {/* Renderizar la vista de programación si corresponde */}
      {scheduleView}

      {/* Modal de Transmisión */}
      {showStreamModal && isStreaming && (
        <div
          className={
            isMinimized
              ? "fixed w-96 z-[9999] shadow-2xl"
              : "fixed inset-0 bg-black/75 z-50 flex items-center justify-center p-4"
          }
          style={isMinimized ? {
            left: `${minimizedPosition.x}px`,
            top: `${minimizedPosition.y}px`
          } : {}}
        >
          <div className={
            isMinimized
              ? "w-full bg-gray-900 rounded-lg overflow-hidden flex flex-col"
              : `bg-white rounded-xl shadow-2xl w-full flex flex-col ${isFullscreen ? 'h-screen max-w-none' : 'h-screen md:h-[85vh] max-w-7xl'}`
          } ref={containerRef}>
            {/* Header del modal */}
            {(
            <div
              className="bg-gradient-to-r from-red-500 to-pink-600 text-white p-3 flex items-center justify-between flex-shrink-0"
              onMouseDown={handleMouseDown}
              style={isMinimized ? { cursor: isDragging ? 'grabbing' : 'grab' } : {}}
            >
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-white rounded-full animate-pulse"></div>
                <span className="font-bold text-sm">{isMinimized ? course.code.substring(0, 10) : `EN VIVO - ${course.code}`}</span>
                {!isMinimized && (
                  <>
                    <span className="text-white/80">•</span>
                    <span className="text-white/90 flex items-center gap-1 text-sm">
                      <Users size={14} />
                      {viewers}
                    </span>
                  </>
                )}
              </div>

              <div className="flex gap-1">
                {roomCode && !isMinimized && (
                  <button
                    onClick={copyRoomLink}
                    className="no-drag flex items-center gap-2 px-2 py-1 bg-white/20 hover:bg-white/30 rounded transition text-xs mr-2"
                  >
                    {copied ? <CheckCircle size={12} /> : <span className="font-mono">{roomCode}</span>}
                  </button>
                )}
                <button
                  onClick={() => {
                    setIsMinimized(!isMinimized);
                    updateActiveLiveClass({ isMinimized: !isMinimized });
                  }}
                  className="no-drag p-1.5 hover:bg-white/20 rounded transition"
                  title="Minimizar"
                >
                  <Minimize2 size={16} />
                </button>
                <button
                  onClick={handleStopStreamingClick}
                  className="no-drag p-1.5 hover:bg-white/20 rounded transition"
                  title="Finalizar clase"
                >
                  <Square size={16} />
                </button>
              </div>
            </div>
            )}

            {/* Contenido del modal */}
            {!isMinimized && (
              <div className="flex-1 overflow-auto bg-gray-900">
                {/* Sala estilo Zoom */}
      <div className="bg-gray-900 rounded-lg overflow-hidden shadow-2xl">
        <div className="flex flex-col md:flex-row gap-2 p-2" style={{ minHeight: isFullscreen ? '800px' : '500px' }}>
          {/* Video principal - Flex-grow para ocupar espacio restante */}
          <div
            className="flex-1 relative bg-black rounded-lg overflow-hidden cursor-pointer"
            style={{ minHeight: isFullscreen ? '700px' : '400px' }}
            onDoubleClick={() => pinnedParticipant && handleSwapVideo(pinnedParticipant)}
            title={pinnedParticipant ? "Doble clic para volver al docente" : ""}
          >
            {/* ✅ FIX: Siempre renderizar ambos videos, controlar visibilidad con CSS */}

            {/* Video del docente - SIEMPRE montado */}
            <div className={`absolute inset-0 ${pinnedParticipant ? 'hidden' : 'block'}`}>
              <video
                ref={videoRef}
                autoPlay={true}
                muted={true}
                playsInline={true}
                className="w-full h-full object-contain"
              />

              {/* ✅ Overlay cuando la cámara está desactivada Y NO está compartiendo pantalla */}
              {!isVideoEnabled && !isScreenSharing && (
                <div className="absolute inset-0 flex flex-col items-center justify-center bg-gradient-to-br from-gray-800 to-gray-900 z-10">
                  <div className="relative">
                    <div className="absolute inset-0 bg-red-500/20 blur-3xl rounded-full"></div>
                    <div className="relative bg-gray-700/50 backdrop-blur-sm p-8 rounded-2xl border border-gray-600">
                      <VideoOff size={80} className="text-gray-400 mb-4 mx-auto" />
                      <p className="text-white text-xl font-semibold mb-2 text-center">Cámara desactivada</p>
                      <p className="text-gray-400 text-sm text-center">Tu cámara está apagada</p>
                    </div>
                  </div>
                </div>
              )}

              {/* Nombre del docente / Indicador de pantalla compartida */}
              <div className="absolute bottom-4 left-4 bg-black/60 backdrop-blur-sm px-3 py-1.5 rounded-lg z-20">
                <span className="text-white text-sm font-semibold flex items-center gap-2">
                  {isScreenSharing ? (
                    <>
                      <Monitor size={16} className="text-green-400" />
                      Compartiendo pantalla
                    </>
                  ) : (
                    <>
                      <UserCircle size={16} />
                      Docente (Tú)
                    </>
                  )}
                </span>
              </div>
            </div>

            {/* Video del estudiante pinneado - SIEMPRE montado si hay uno pinneado */}
            {pinnedParticipant && (() => {
              const screenStream = studentScreenStreams[pinnedParticipant];
              const cameraStream = studentCameraStreams[pinnedParticipant] || studentStreams[pinnedParticipant];
              const pinnedViewer = viewersList.find(v => v.id === pinnedParticipant);

              // ✅ EXACTAMENTE IGUAL QUE DOCENTE: Si tiene pantalla, mostrar pantalla. Sino, mostrar cámara.
              return (
                <div className="absolute inset-0">
                  {screenStream ? (
                    // Estudiante compartiendo pantalla - mostrar PANTALLA
                    <video
                      ref={(el) => {
                        if (el) {
                          if (screenStream && el.srcObject !== screenStream) {
                            console.log(`📺 [TEACHER-PIN] Asignando pantalla compartida de ${pinnedViewer?.name}`);
                            // ✅ FIX: Clonar stream para evitar conflictos cuando el mismo stream está en múltiples elementos de video
                            const clonedStream = new MediaStream(screenStream.getTracks());
                            el.srcObject = clonedStream;
                            el.muted = false;
                            el.play().catch(err => console.log('Autoplay prevented:', err));
                          } else if (!screenStream && el.srcObject) {
                            console.log(`🗑️ [TEACHER-PIN] Limpiando pantalla compartida de ${pinnedViewer?.name}`);
                            // ✅ FIX: Detener todos los tracks antes de limpiar
                            if (el.srcObject) {
                              el.srcObject.getTracks().forEach(track => track.stop());
                            }
                            el.srcObject = null;
                          }
                        }
                      }}
                      autoPlay
                      muted={false}
                      playsInline
                      className="w-full h-full object-contain"
                    />
                  ) : cameraStream ? (
                    // Solo cámara - mostrar CÁMARA
                    <>
                      <video
                        ref={(el) => {
                          if (el) {
                            if (cameraStream && el.srcObject !== cameraStream) {
                              console.log(`📹 [TEACHER-PIN] Asignando cámara de ${pinnedViewer?.name}`);
                              // ✅ FIX: Clonar stream para evitar conflictos cuando el mismo stream está en múltiples elementos de video
                              const clonedStream = new MediaStream(cameraStream.getTracks());
                              el.srcObject = clonedStream;
                              el.muted = false;
                              el.play().catch(err => console.log('Autoplay prevented:', err));
                            } else if (!cameraStream && el.srcObject) {
                              console.log(`🗑️ [TEACHER-PIN] Limpiando cámara de ${pinnedViewer?.name}`);
                              // ✅ FIX: Detener todos los tracks antes de limpiar
                              if (el.srcObject) {
                                el.srcObject.getTracks().forEach(track => track.stop());
                              }
                              el.srcObject = null;
                            }
                          }
                        }}
                        autoPlay
                        muted={false}
                        playsInline
                        className="w-full h-full object-contain"
                      />

                      {/* ✅ OVERLAY cuando la cámara está desactivada */}
                      {studentCameraStates[pinnedParticipant] === false && (
                        <div className="absolute inset-0 flex flex-col items-center justify-center bg-gradient-to-br from-gray-800 to-gray-900 z-20">
                          <div className="relative">
                            <div className="absolute inset-0 bg-cyan-500/20 blur-3xl rounded-full"></div>
                            <div className="relative bg-gray-700/50 backdrop-blur-sm p-8 rounded-2xl border border-gray-600">
                              <VideoOff size={80} className="text-gray-400 mb-4 mx-auto" />
                              <p className="text-white text-xl font-semibold mb-2 text-center">Cámara desactivada</p>
                              <p className="text-gray-400 text-sm text-center">{pinnedViewer?.name || 'Estudiante'}</p>
                            </div>
                          </div>
                        </div>
                      )}
                    </>
                  ) : (
                    // Sin stream
                    <div className="w-full h-full flex flex-col items-center justify-center">
                      <div className="w-32 h-32 bg-gradient-to-br from-cyan-500 to-blue-600 rounded-full flex items-center justify-center">
                        <UserCircle size={80} className="text-white" />
                      </div>
                      <span className="text-2xl text-white mt-4 font-semibold">
                        {pinnedViewer?.name || 'Estudiante'}
                      </span>
                    </div>
                  )}

                  <div className="absolute bottom-4 left-4 bg-black/60 backdrop-blur-sm px-3 py-1.5 rounded-lg z-20">
                    <span className="text-white text-sm font-semibold flex items-center gap-2">
                      {screenStream ? (
                        <>
                          <Monitor size={16} className="text-green-400" />
                          {pinnedViewer?.name || 'Estudiante'} - Pantalla
                        </>
                      ) : (
                        <>
                          <UserCircle size={16} />
                          {pinnedViewer?.name || 'Estudiante'}
                        </>
                      )}
                    </span>
                  </div>
                </div>
              );
            })()}

            {/* Pizarra Overlay - SIEMPRE visible para mostrar dibujos locales y remotos */}
            <canvas
              ref={canvasRef}
              width={1280}
              height={720}
              className={`absolute inset-0 w-full h-full ${showWhiteboard ? 'cursor-crosshair' : 'pointer-events-none'}`}
              onMouseDown={startDrawing}
              onMouseMove={draw}
              onMouseUp={stopDrawing}
              onMouseLeave={stopDrawing}
              onDragStart={(e) => e.preventDefault()}
              onContextMenu={(e) => e.preventDefault()}
              style={{
                zIndex: 10,
                pointerEvents: showWhiteboard ? 'auto' : 'none',
                userSelect: 'none',
                WebkitUserSelect: 'none',
                MozUserSelect: 'none',
                msUserSelect: 'none'
                // ✅ CRITICAL FIX: Canvas SIEMPRE visible para mostrar dibujos remotos de estudiantes
                // No usar opacity: 0 porque oculta los dibujos de los estudiantes
              }}
            />
          </div>

          {/* Panel de participantes - Ancho responsive con scroll */}
          <div className="flex flex-col gap-2 w-full md:w-auto" style={{
            width: isMobile ? '100%' : (isFullscreen ? '320px' : '280px'),
            minWidth: isMobile ? '100%' : (isFullscreen ? '320px' : '280px'),
            height: isMobile ? '400px' : 'auto',
            maxHeight: isMobile ? '400px' : 'auto'
          }}>
            {/* Contenedor SOLO para los recuadros de participantes */}
            <div className={`flex flex-col gap-2 overflow-x-hidden pr-1 ${!isMobile ? 'scrollbar-thin scrollbar-thumb-gray-600 scrollbar-track-gray-800' : ''}`} style={{
              flex: 1,
              overflowY: isMobile ? 'hidden' : 'auto',
              maxHeight: isMobile ? 'none' : (isFullscreen ? 'calc(100vh - 200px)' : 'calc(85vh - 200px)'),
              WebkitOverflowScrolling: 'touch' // ✅ iOS FIX: Smooth scroll en iOS
            }}>
              {/* Todos los recuadros de participantes van aquí */}
            {/* ✅ CUANDO UN ESTUDIANTE ESTÁ PINNEADO (compartiendo pantalla): Mostrar cámara del docente Y cámara del estudiante */}
            {pinnedParticipant && studentSharingScreen[pinnedParticipant] && (
              <>
                {/* 1. Cámara del docente */}
                <div
                  className="bg-gray-800 rounded-lg overflow-hidden relative group cursor-pointer border-2 border-red-500" style={{ height: isFullscreen ? '180px' : '157px', minHeight: isFullscreen ? '180px' : '157px', width: '100%' }}
                  onDoubleClick={() => handleSwapVideo(pinnedParticipant)}
                  title="Doble clic para intercambiar"
                >
                  <video
                    ref={(el) => {
                      // ✅ FIX: Usar SOLO streamRef.current (cámara) aquí, NO screenStreamRef
                      // para evitar conflicto si está asignado a videoRef principal
                      if (el && streamRef.current && el.srcObject !== streamRef.current) {
                        el.srcObject = streamRef.current;
                        el.play().catch(err => console.log('Autoplay prevented:', err));
                      }
                    }}
                    autoPlay={true}
                    muted={true}
                    playsInline={true}
                    className="w-full h-full object-cover"
                  />

                  {!isVideoEnabled && !isScreenSharing && (
                    <div className="absolute inset-0 flex flex-col items-center justify-center bg-gradient-to-br from-gray-800 to-gray-900">
                      <div className="w-16 h-16 bg-gray-700/50 backdrop-blur-sm rounded-full flex items-center justify-center mb-2">
                        <VideoOff size={32} className="text-gray-400" />
                      </div>
                      <p className="text-white text-xs font-semibold mb-1">Docente (Tú)</p>
                      <p className="text-gray-400 text-xs">Cámara apagada</p>
                    </div>
                  )}

                  <div className="absolute bottom-1 left-1 right-1 bg-black/60 backdrop-blur-sm px-2 py-1 rounded text-center">
                    <span className="text-xs text-white truncate font-semibold">
                      Tu cámara
                    </span>
                  </div>
                </div>

                {/* 2. Cámara del estudiante (si la tiene) - DUAL STREAM */}
                <div
                  className="bg-gray-800 rounded-lg overflow-hidden relative group cursor-pointer border-2 border-cyan-500" style={{ height: isFullscreen ? '180px' : '157px', minHeight: isFullscreen ? '180px' : '157px', width: '100%' }}
                  title="Cámara del estudiante"
                >
                  {/* ✅ DUAL STREAM: Usar stream de cámara separado SOLO si la cámara está activada */}
                  {studentCameraStates[pinnedParticipant] === true && (studentCameraStreams[pinnedParticipant] || studentStreams[pinnedParticipant]) ? (
                    <video
                      ref={(el) => {
                        const cameraStream = studentCameraStreams[pinnedParticipant] || studentStreams[pinnedParticipant];
                        if (el && cameraStream && el.srcObject !== cameraStream) {
                          el.srcObject = cameraStream;
                          el.muted = false; // ✅ Escuchar audio del estudiante
                          el.play().catch(err => console.log('Autoplay prevented:', err));
                        }
                      }}
                      autoPlay
                      muted={false}
                      playsInline
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="absolute inset-0 flex flex-col items-center justify-center bg-gradient-to-br from-gray-800 to-gray-900">
                      <div className="w-16 h-16 bg-cyan-700/50 backdrop-blur-sm rounded-full flex items-center justify-center mb-2">
                        <UserCircle size={32} className="text-cyan-400" />
                      </div>
                      <p className="text-cyan-400 text-xs font-semibold">
                        {viewersList.find(v => v.id === pinnedParticipant)?.name?.split(' ')[0] || 'Estudiante'}
                      </p>
                      <p className="text-gray-400 text-xs">Cámara apagada</p>
                    </div>
                  )}

                  <div className="absolute bottom-1 left-1 right-1 bg-black/60 backdrop-blur-sm px-2 py-1 rounded text-center">
                    <span className="text-xs text-white truncate font-semibold">
                      {viewersList.find(v => v.id === pinnedParticipant)?.name?.split(' ')[0] || 'Estudiante'}
                    </span>
                  </div>

                  <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition rounded-lg"></div>
                </div>
              </>
            )}

            {/* ✅ FIX: Cuando DOCENTE (no un estudiante) está compartiendo pantalla Y hay un estudiante pinneado */}
            {pinnedParticipant && isScreenSharing && !studentSharingScreen[pinnedParticipant] && (
              <>
                {/* 1. Pantalla compartida del docente */}
                <div
                  className="bg-gray-800 rounded-lg overflow-hidden relative group cursor-pointer border-2 border-green-500" style={{ height: isFullscreen ? '180px' : '157px', minHeight: isFullscreen ? '180px' : '157px', width: '100%' }}
                  onDoubleClick={() => handleSwapVideo(pinnedParticipant)}
                  title="Doble clic para ver pantalla en principal"
                >
                  {/* ✅ FIX: Crear un nuevo MediaStream con los mismos tracks para evitar conflicto
                       No podemos asignar el mismo stream a videoRef principal Y al panel */}
                  <video
                    key="teacher-screen-panel"
                    ref={(el) => {
                      if (el && screenStreamRef.current) {
                        // Solo asignar si no hay srcObject o si el stream cambió
                        if (!el.srcObject || el.srcObject.id !== screenStreamRef.current.id) {
                          const tracks = screenStreamRef.current.getTracks();
                          if (tracks.length > 0) {
                            console.log('🔄 [TEACHER-PANEL] Asignando CLONE de screen stream al panel');
                            const clonedStream = new MediaStream(tracks);
                            el.srcObject = clonedStream;
                            el.play().catch(err => console.log('Autoplay prevented:', err));
                          }
                        }
                      } else if (el && el.srcObject && !screenStreamRef.current) {
                        // Limpiar si ya no hay screen stream
                        el.srcObject = null;
                      }
                    }}
                    autoPlay={true}
                    muted={true}
                    playsInline={true}
                    className="w-full h-full object-cover"
                  />

                  {/* Nombre overlay */}
                  <div className="absolute bottom-1 left-1 right-1 bg-black/60 backdrop-blur-sm px-2 py-1 rounded text-center">
                    <span className="text-xs text-white truncate font-semibold flex items-center justify-center gap-1">
                      <Monitor size={12} className="text-green-400" />
                      Pantalla compartida
                    </span>
                  </div>

                  <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition rounded-lg"></div>
                </div>

                {/* 2. Cámara del docente (streamRef) - SIEMPRE MOSTRAR cuando está compartiendo pantalla */}
                <div
                  className="bg-gray-800 rounded-lg overflow-hidden relative group cursor-pointer border-2 border-red-500" style={{ height: isFullscreen ? '180px' : '157px', minHeight: isFullscreen ? '180px' : '157px', width: '100%' }}
                  title="Tu cámara"
                >
                  {isVideoEnabled && streamRef.current ? (
                    <video
                      key="teacher-camera-panel"
                      ref={(el) => {
                        if (el && streamRef.current && el.srcObject !== streamRef.current) {
                          console.log('🔄 [TEACHER-PANEL] Asignando camera stream al panel:', streamRef.current);
                          el.srcObject = streamRef.current;
                          el.play().catch(err => console.log('Autoplay prevented:', err));
                        }
                      }}
                      autoPlay={true}
                      muted={true}
                      playsInline={true}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="absolute inset-0 flex flex-col items-center justify-center bg-gradient-to-br from-gray-800 to-gray-900">
                      <div className="w-16 h-16 bg-gray-700/50 backdrop-blur-sm rounded-full flex items-center justify-center mb-2">
                        <VideoOff size={32} className="text-gray-400" />
                      </div>
                      <p className="text-white text-xs font-semibold mb-1">Docente (Tú)</p>
                      <p className="text-gray-400 text-xs">Cámara apagada</p>
                    </div>
                  )}

                  {/* Nombre overlay */}
                  <div className="absolute bottom-1 left-1 right-1 bg-black/60 backdrop-blur-sm px-2 py-1 rounded text-center">
                    <span className="text-xs text-white truncate font-semibold">
                      Tu cámara
                    </span>
                  </div>

                  <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition rounded-lg"></div>
                </div>
              </>
            )}

            {/* ✅ NUEVO: Cuando NO hay estudiante pinneado pero SÍ estás compartiendo pantalla, mostrar AMBOS videos en el panel */}
            {!pinnedParticipant && isScreenSharing && (
              <>
                {/* 1. Pantalla compartida del docente */}
                <div
                  className="bg-gray-800 rounded-lg overflow-hidden relative group cursor-pointer border-2 border-green-500" style={{ height: isFullscreen ? '180px' : '157px', minHeight: isFullscreen ? '180px' : '157px', width: '100%' }}
                  onDoubleClick={() => setPinnedParticipant(null)}
                  title="Tu pantalla compartida en el panel (intercambio deshabilitado)"
                >
                  {/* ✅ FIX: NO asignar el stream aquí para evitar conflicto con videoRef principal
                       El mismo stream no debe estar en 2 elementos de video simultáneamente */}
                  <div className="w-full h-full bg-gray-900/50 flex items-center justify-center">
                    <svg className="w-16 h-16 text-green-500/30" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                    </svg>
                  </div>

                  {/* Overlay indicando que es el video principal */}
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="bg-black/70 backdrop-blur-sm px-4 py-2 rounded-lg">
                      <p className="text-white text-sm font-semibold">En pantalla principal</p>
                    </div>
                  </div>

                  <div className="absolute bottom-1 left-1 right-1 bg-black/60 backdrop-blur-sm px-2 py-1 rounded text-center">
                    <span className="text-xs text-white truncate font-semibold flex items-center justify-center gap-1">
                      <Monitor size={12} className="text-green-400" />
                      Tu pantalla
                    </span>
                  </div>
                </div>

                {/* 2. Cámara del docente - SIEMPRE MOSTRAR */}
                {isVideoEnabled && streamRef.current && (
                  <div
                    className="bg-gray-800 rounded-lg overflow-hidden relative group border-2 border-red-500" style={{ height: isFullscreen ? '180px' : '157px', minHeight: isFullscreen ? '180px' : '157px', width: '100%' }}
                    title="Tu cámara"
                  >
                    <video
                      key="teacher-camera-panel-no-pinned"
                      ref={(el) => {
                        if (el && streamRef.current && el.srcObject !== streamRef.current) {
                          console.log('🔄 [TEACHER-PANEL-NO-PINNED] Asignando camera stream:', streamRef.current);
                          el.srcObject = streamRef.current;
                          el.play().catch(err => console.log('Autoplay prevented:', err));
                        }
                      }}
                      autoPlay={true}
                      muted={true}
                      playsInline={true}
                      className="w-full h-full object-cover"
                    />

                    <div className="absolute bottom-1 left-1 right-1 bg-black/60 backdrop-blur-sm px-2 py-1 rounded text-center">
                      <span className="text-xs text-white truncate font-semibold">
                        Tu cámara
                      </span>
                    </div>
                  </div>
                )}
              </>
            )}

            {/* ✅ FIX: Cuando un estudiante está pinneado pero NO está compartiendo pantalla, mostrar solo la cámara */}
            {pinnedParticipant && !isScreenSharing && !studentSharingScreen[pinnedParticipant] && (
              <div
                className="bg-gray-800 rounded-lg overflow-hidden relative group cursor-pointer border-2 border-red-500" style={{ height: isFullscreen ? '180px' : '157px', minHeight: isFullscreen ? '180px' : '157px', width: '100%' }}
                onDoubleClick={() => handleSwapVideo(pinnedParticipant)}
                title="Doble clic para ver en principal"
              >
                {/* Mostrar la cámara usando streamRef */}
                <video
                  ref={(el) => {
                    if (el && streamRef.current && el.srcObject !== streamRef.current) {
                      el.srcObject = streamRef.current;
                      el.play().catch(err => console.log('Autoplay prevented:', err));
                    }
                  }}
                  autoPlay={true}
                  muted={true}
                  playsInline={true}
                  className="w-full h-full object-cover"
                />

                {/* Mostrar placeholder cuando cámara está desactivada */}
                {!isVideoEnabled && (
                  <div className="absolute inset-0 flex flex-col items-center justify-center bg-gradient-to-br from-gray-800 to-gray-900">
                    <div className="w-16 h-16 bg-gray-700/50 backdrop-blur-sm rounded-full flex items-center justify-center mb-2">
                      <VideoOff size={32} className="text-gray-400" />
                    </div>
                    <p className="text-white text-xs font-semibold mb-1">Docente (Tú)</p>
                    <p className="text-gray-400 text-xs">Cámara apagada</p>
                  </div>
                )}

                {/* Nombre overlay */}
                <div className="absolute bottom-1 left-1 right-1 bg-black/60 backdrop-blur-sm px-2 py-1 rounded text-center">
                  <span className="text-xs text-white truncate font-semibold">
                    Docente (Tú)
                  </span>
                </div>

                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition rounded-lg"></div>
              </div>
            )}


            {/* Estudiantes */}
            {(() => {
              // En móvil, aplicar paginación
              const viewersToShow = isMobile
                ? viewersList.slice(
                    currentPage * ITEMS_PER_PAGE_MOBILE,
                    (currentPage + 1) * ITEMS_PER_PAGE_MOBILE
                  )
                : viewersList;

              return viewersToShow.map((viewer, index) => {
              // ✅ FIX: Verificar que el stream tenga video tracks activos, no solo que el stream exista
              const cameraStream = studentCameraStreams[viewer.id] || studentStreams[viewer.id];
              const hasCamera = cameraStream && cameraStream.getVideoTracks().some(t => t.readyState === 'live');
              const hasScreen = studentScreenStreams[viewer.id];
              const isPinned = pinnedParticipant === viewer.id;

              // 🔍 DEBUG: Log para identificar duplicación
              if (hasScreen) {
                console.log(`🔍 [RENDER] ${viewer.name}: isPinned=${isPinned}, hasScreen=${!!hasScreen}, hasCamera=${!!hasCamera}, studentStreams=${!!studentStreams[viewer.id]}`);
              }

              // ✅ FIX DUPLICACIÓN: Si está pinneado, NO renderizar en el panel lateral
              // porque ya se está mostrando en el área principal (líneas 1940-2018)
              if (isPinned) {
                console.log(`⏭️ [RENDER-SKIP] Saltando render para ${viewer.name} (${viewer.id}) - está pinneado y ya se muestra en área principal`);
                return null;
              }

              // ✅ DUAL STREAM: Si tiene pantalla compartida, mostrar DOS recuadros
              if (hasScreen) {
                console.log(`📊 [RENDER-DUAL] Renderizando dual stream para ${viewer.name} (${viewer.id}), isPinned: ${isPinned}`);
                return (
                  <div key={viewer.id || index} className="flex flex-col gap-2 w-full">
                    {/* 1. Pantalla compartida */}
                    <div
                      className="bg-gray-800 rounded-lg overflow-hidden relative group cursor-pointer border-2 border-green-500"
                      style={{ height: isFullscreen ? '180px' : '157px', minHeight: isFullscreen ? '180px' : '157px', width: '100%' }}
                      onDoubleClick={() => handleSwapVideo(viewer.id)}
                      title="Pantalla compartida - Doble clic para ver en principal"
                    >
                      <video
                        ref={(el) => {
                          if (el) {
                            if (hasScreen && el.srcObject !== hasScreen) {
                              console.log(`📺 [TEACHER-THUMB] Asignando pantalla compartida de ${viewer.name}`);
                              el.srcObject = hasScreen;
                              el.muted = false;
                              el.play().catch(err => console.log('Autoplay prevented:', err));
                            } else if (!hasScreen && el.srcObject) {
                              console.log(`🗑️ [TEACHER-THUMB] Limpiando pantalla compartida de ${viewer.name}`);
                              el.srcObject = null;
                            }
                          }
                        }}
                        autoPlay
                        muted={false}
                        playsInline
                        className="w-full h-full object-contain"
                      />

                      <div className="absolute bottom-1 left-1 right-1 bg-black/60 backdrop-blur-sm px-2 py-1 rounded text-center">
                        <span className="text-xs text-white truncate font-semibold flex items-center justify-center gap-1">
                          <Monitor size={12} className="text-green-400" />
                          {viewer.name?.split(' ')[0]} - Pantalla
                        </span>
                      </div>

                      <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition rounded-lg"></div>
                    </div>

                    {/* 2. Cámara del estudiante */}
                    <div
                      className="bg-gray-800 rounded-lg overflow-hidden relative group cursor-pointer border-2 border-cyan-500"
                      style={{ height: isFullscreen ? '180px' : '157px', minHeight: isFullscreen ? '180px' : '157px', width: '100%' }}
                      title="Cámara del estudiante"
                    >
                      <video
                        ref={(el) => {
                          if (el) {
                            if (hasCamera && el.srcObject !== hasCamera) {
                              console.log(`📹 [TEACHER-THUMB] Asignando cámara de ${viewer.name}`);
                              el.srcObject = hasCamera;
                              el.muted = false;
                              el.play().catch(err => console.log('Autoplay prevented:', err));
                            } else if (!hasCamera && el.srcObject) {
                              console.log(`🗑️ [TEACHER-THUMB] Limpiando cámara de ${viewer.name}`);
                              el.srcObject = null;
                            }
                          }
                        }}
                        autoPlay
                        muted={false}
                        playsInline
                        className="w-full h-full object-cover"
                      />

                      {/* Overlay cuando cámara está apagada */}
                      {studentCameraStates[viewer.id] === false && (
                        <div className="absolute inset-0 flex flex-col items-center justify-center bg-gradient-to-br from-gray-800 to-gray-900 z-10">
                          <div className="w-16 h-16 bg-gray-700/50 backdrop-blur-sm rounded-full flex items-center justify-center mb-2">
                            <VideoOff size={32} className="text-gray-400" />
                          </div>
                          <p className="text-white text-xs font-semibold mb-1">{viewer.name?.split(' ')[0] || 'Estudiante'}</p>
                          <p className="text-gray-400 text-xs">Cámara apagada</p>
                        </div>
                      )}

                      <div className="absolute bottom-1 left-1 right-1 bg-black/60 backdrop-blur-sm px-2 py-1 rounded text-center">
                        <span className="text-xs text-white truncate font-semibold">
                          {viewer.name?.split(' ')[0]} - Cámara
                        </span>
                      </div>

                      <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition rounded-lg"></div>
                    </div>
                  </div>
                );
              }

              // Solo cámara (sin pantalla compartida)
              console.log(`📊 [RENDER-SINGLE] Renderizando cámara única para ${viewer.name} (${viewer.id}), hasCamera: ${!!hasCamera}`);
              return (
                <div
                  key={viewer.id || index}
                  className="bg-gray-800 rounded-lg overflow-hidden relative group cursor-pointer hover:ring-2 hover:ring-cyan-500 transition" style={{ height: isFullscreen ? '180px' : '157px', minHeight: isFullscreen ? '180px' : '157px', width: '100%' }}
                  onDoubleClick={() => handleSwapVideo(viewer.id)}
                  title={hasCamera ? "Doble clic para ver en principal" : "Cámara desactivada"}
                >
                  <video
                    ref={(el) => {
                      if (el && viewer.id && el.srcObject !== studentStreams[viewer.id]) {
                        studentVideoRefs.current[viewer.id] = el;
                        if (studentStreams[viewer.id]) {
                          console.log('📺 [TEACHER] Asignando stream de estudiante:', viewer.id);
                          el.srcObject = studentStreams[viewer.id];

                          // Configurar atributos (igual que hace el estudiante)
                          el.setAttribute('playsinline', 'true');
                          el.setAttribute('autoplay', 'true');
                          el.muted = false; // Audio habilitado desde el principio

                          // Intentar reproducir
                          el.play()
                            .then(() => {
                              console.log('✅ [TEACHER] Video del estudiante reproduciéndose:', viewer.name);
                            })
                            .catch(err => {
                              console.log('⚠️ [TEACHER] Autoplay prevented para', viewer.name, '- el usuario debe interactuar primero');
                            });
                        }
                      }
                    }}
                    autoPlay={true}
                    muted={false}
                    playsInline={true}
                    className="w-full h-full object-cover"
                  />

                  {/* Overlay cuando la cámara está desactivada */}
                  {studentCameraStates[viewer.id] === false && (
                    <div className="absolute inset-0 flex flex-col items-center justify-center bg-gradient-to-br from-gray-800 to-gray-900 z-10">
                      <div className="w-16 h-16 bg-gray-700/50 backdrop-blur-sm rounded-full flex items-center justify-center mb-2">
                        <VideoOff size={32} className="text-gray-400" />
                      </div>
                      <p className="text-white text-xs font-semibold mb-1">{viewer.name?.split(' ')[0] || 'Estudiante'}</p>
                      <p className="text-gray-400 text-xs">Cámara apagada</p>
                    </div>
                  )}

                  {/* Nombre overlay */}
                  <div className="absolute bottom-1 left-1 right-1 bg-black/60 backdrop-blur-sm px-2 py-1 rounded text-center">
                    <span className="text-xs text-white truncate">
                      {viewer.name?.split(' ')[0] || `Usuario ${index + 1}`}
                    </span>
                  </div>

                  <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition rounded-lg"></div>
                </div>
              );
            });
            })()}

            {viewersList.length === 0 && !pinnedParticipant && (
              <div className="bg-gray-800 rounded-lg flex items-center justify-center" style={{ height: isFullscreen ? '180px' : '157px', minHeight: isFullscreen ? '180px' : '157px', width: '100%' }}>
                <span className="text-gray-500 text-sm text-center px-4">
                  Esperando participantes...
                </span>
              </div>
            )}
            </div>
            {/* Fin del contenedor */}

            {/* Botones de paginación - Solo en móvil */}
            {isMobile && viewersList.length > ITEMS_PER_PAGE_MOBILE && (
              <div className="flex items-center justify-center gap-2 mt-2 pb-2">
                <button
                  onClick={() => setCurrentPage(Math.max(0, currentPage - 1))}
                  disabled={currentPage === 0}
                  className={`p-2 rounded-lg transition ${
                    currentPage === 0
                      ? 'bg-gray-700 text-gray-500 cursor-not-allowed'
                      : 'bg-blue-600 hover:bg-blue-700 text-white'
                  }`}
                  title="Página anterior"
                >
                  <ChevronLeft className="w-5 h-5" />
                </button>

                <span className="text-white text-sm font-semibold px-3">
                  {currentPage + 1} / {Math.ceil(viewersList.length / ITEMS_PER_PAGE_MOBILE)}
                </span>

                <button
                  onClick={() => setCurrentPage(Math.min(
                    Math.ceil(viewersList.length / ITEMS_PER_PAGE_MOBILE) - 1,
                    currentPage + 1
                  ))}
                  disabled={currentPage >= Math.ceil(viewersList.length / ITEMS_PER_PAGE_MOBILE) - 1}
                  className={`p-2 rounded-lg transition ${
                    currentPage >= Math.ceil(viewersList.length / ITEMS_PER_PAGE_MOBILE) - 1
                      ? 'bg-gray-700 text-gray-500 cursor-not-allowed'
                      : 'bg-blue-600 hover:bg-blue-700 text-white'
                  }`}
                  title="Página siguiente"
                >
                  <ChevronRight className="w-5 h-5" />
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Controles */}
        <div className="bg-gray-800 p-2 md:p-3 flex items-center justify-between gap-2 flex-wrap md:flex-nowrap">
          <div className="flex gap-1 md:gap-2 flex-wrap md:flex-nowrap">
            <button
              onClick={toggleMute}
              className={`p-2 md:p-3 rounded-lg transition ${
                isMuted ? 'bg-red-500 hover:bg-red-600' : 'bg-gray-700 hover:bg-gray-600'
              } text-white`}
              title={isMuted ? 'Activar micrófono' : 'Silenciar'}
            >
              {isMuted ? <MicOff className="w-4 h-4 md:w-5 md:h-5" /> : <Mic className="w-4 h-4 md:w-5 md:h-5" />}
            </button>

            <button
              onClick={toggleVideo}
              className={`p-2 md:p-3 rounded-lg transition ${
                !isVideoEnabled ? 'bg-red-500 hover:bg-red-600' : 'bg-gray-700 hover:bg-gray-600'
              } text-white`}
              title={isVideoEnabled ? 'Desactivar cámara' : 'Activar cámara'}
            >
              {isVideoEnabled ? <Video className="w-4 h-4 md:w-5 md:h-5" /> : <VideoOff className="w-4 h-4 md:w-5 md:h-5" />}
            </button>

            <button
              onClick={toggleScreenShare}
              className={`p-2 md:p-3 rounded-lg transition ${
                isScreenSharing ? 'bg-blue-500 hover:bg-blue-600' : 'bg-gray-700 hover:bg-gray-600'
              } text-white`}
              title="Compartir pantalla"
            >
              {isScreenSharing ? <MonitorOff className="w-4 h-4 md:w-5 md:h-5" /> : <Monitor className="w-4 h-4 md:w-5 md:h-5" />}
            </button>

            <button
              onClick={() => {
                socketRef.current.emit('mute-all-students', { courseId: course.id });
                showToastMessage('Todos los estudiantes han sido silenciados', 'info');
              }}
              className="p-2 md:p-3 rounded-lg transition bg-orange-500 hover:bg-orange-600 text-white"
              title="Silenciar a todos los estudiantes"
            >
              <MicOff className="w-4 h-4 md:w-5 md:h-5" />
            </button>

            <button
              onClick={() => {
                socketRef.current.emit('unmute-all-students', { courseId: course.id });
                showToastMessage('Los estudiantes ahora pueden activar su micrófono', 'success');
              }}
              className="p-2 md:p-3 rounded-lg transition bg-green-500 hover:bg-green-600 text-white"
              title="Permitir que los estudiantes activen su micrófono"
            >
              <Mic className="w-4 h-4 md:w-5 md:h-5" />
            </button>

            <div className="hidden md:block h-8 w-px bg-gray-600 mx-1"></div>

            <button
              onClick={() => {
                setIsScreenShareBlocked(true);
                socketRef.current.emit('block-screen-share', { courseId: course.id });
                showToastMessage('Compartir pantalla bloqueado para estudiantes', 'info');
              }}
              className={`p-3 rounded-lg transition ${
                isScreenShareBlocked ? 'bg-red-600 hover:bg-red-700' : 'bg-orange-500 hover:bg-orange-600'
              } text-white`}
              title="Bloquear compartir pantalla de estudiantes"
            >
              <MonitorOff size={20} />
            </button>

            <button
              onClick={() => {
                setIsScreenShareBlocked(false);
                socketRef.current.emit('unblock-screen-share', { courseId: course.id });
                showToastMessage('Los estudiantes ahora pueden compartir pantalla', 'success');
              }}
              className="p-3 rounded-lg transition bg-green-500 hover:bg-green-600 text-white"
              title="Permitir que los estudiantes compartan pantalla"
            >
              <Monitor size={20} />
            </button>

            <div className="hidden md:block h-8 w-px bg-gray-600 mx-1"></div>

            <button
              onClick={() => setShowWhiteboard(!showWhiteboard)}
              className={`p-2 md:p-3 rounded-lg transition ${
                showWhiteboard ? 'bg-green-500 hover:bg-green-600' : 'bg-gray-700 hover:bg-gray-600'
              } text-white`}
              title="Activar/Desactivar Pizarra"
            >
              <Paintbrush className="w-4 h-4 md:w-5 md:h-5" />
            </button>

            {showWhiteboard && (
              <>
                <button
                  onClick={() => setDrawTool('pen')}
                  className={`p-2 md:p-3 rounded-lg transition-all ${
                    drawTool === 'pen' ? 'bg-blue-500 ring-2 ring-blue-300' : 'bg-gray-700 hover:bg-gray-600'
                  } text-white`}
                  title="Lápiz"
                >
                  <Paintbrush className="w-4 h-4 md:w-5 md:h-5" />
                </button>

                <input
                  type="color"
                  value={drawColor}
                  onChange={(e) => {
                    setDrawColor(e.target.value);
                    setDrawTool('pen');
                  }}
                  className="w-8 h-8 md:w-10 md:h-10 rounded cursor-pointer"
                  title="Seleccionar color"
                />

                <button
                  onClick={() => setDrawTool('eraser')}
                  className={`p-2 md:p-3 rounded-lg transition-all ${
                    drawTool === 'eraser' ? 'bg-yellow-500 ring-2 ring-yellow-300' : 'bg-gray-700 hover:bg-gray-600'
                  } text-white`}
                  title="Borrador"
                >
                  <Eraser className="w-4 h-4 md:w-5 md:h-5" />
                </button>

                <button
                  onClick={clearWhiteboard}
                  className="p-2 md:p-3 rounded-lg bg-red-600 hover:bg-red-700 text-white transition"
                  title="Limpiar pizarra"
                >
                  <Trash2 className="w-4 h-4 md:w-5 md:h-5" />
                </button>
              </>
            )}

            {/* Botón de descarga SIEMPRE visible cuando hay pizarra activa o contenido */}
            <button
              onClick={downloadWhiteboard}
              className="p-2 md:p-3 rounded-lg bg-blue-600 hover:bg-blue-700 text-white transition"
              title="Descargar pizarra"
            >
              <Download className="w-4 h-4 md:w-5 md:h-5" />
            </button>
          </div>

          <div className="flex gap-2">
            <button
              onClick={() => setShowChat(!showChat)}
              className={`p-2 md:p-3 rounded-lg transition ${
                showChat ? 'bg-blue-500 hover:bg-blue-600' : 'bg-gray-700 hover:bg-gray-600'
              } text-white`}
            >
              <MessageCircle className="w-4 h-4 md:w-5 md:h-5" />
            </button>

            <button
              onClick={toggleFullscreen}
              className="p-2 md:p-3 rounded-lg bg-gray-700 hover:bg-gray-600 text-white transition"
            >
              {isFullscreen ? <Minimize className="w-4 h-4 md:w-5 md:h-5" /> : <Maximize className="w-4 h-4 md:w-5 md:h-5" />}
            </button>

            <button
              onClick={handleStopStreamingClick}
              className="px-4 py-2 md:px-6 md:py-3 bg-red-600 hover:bg-red-700 text-white rounded-lg transition font-semibold flex items-center gap-2"
            >
              <Square className="w-4 h-4 md:w-5 md:h-5" />
              <span className="hidden sm:inline">Finalizar Clase</span>
              <span className="sm:hidden">Finalizar</span>
            </button>
          </div>
        </div>
      </div>
              </div>
    )}

    {/* Video minimizado */}
    {isMinimized && (
      <div className="flex-1 bg-black aspect-video">
        <video
          ref={videoRef}
          autoPlay={true}
          muted={true}
          playsInline={true}
          className="w-full h-full object-contain"
        />
      </div>
    )}
      </div>
    </div>
  )}

    {/* Chat flotante - ONLY show when streaming is active */}
    {showChat && !isMinimized && isStreaming && (
      <div className="fixed right-4 bottom-4 w-80 bg-white rounded-lg shadow-2xl flex flex-col h-96 z-50">
          <div className="p-4 bg-blue-600 text-white rounded-t-lg flex items-center justify-between">
            <h3 className="font-bold">Chat</h3>
            <button onClick={() => setShowChat(false)} className="hover:bg-white/20 p-1 rounded">
              <X size={18} />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {messages.length === 0 ? (
              <div className="text-center text-gray-400 text-sm py-8">
                <MessageCircle className="mx-auto mb-2 opacity-50" size={32} />
                No hay mensajes
              </div>
            ) : (
              messages.map((msg) => (
                <div key={msg.id} className="bg-gray-100 rounded-lg p-3">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-semibold text-sm text-gray-800">
                      {msg.sender}
                    </span>
                    <span className="text-xs text-gray-500">
                      {new Date(msg.timestamp).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                  <p className="text-sm text-gray-700">{msg.text}</p>
                </div>
              ))
            )}
            <div ref={chatEndRef} />
          </div>

          <form onSubmit={handleSendMessage} className="p-4 border-t">
            <div className="flex gap-2">
              <input
                type="text"
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                placeholder="Escribe un mensaje..."
                className="flex-1 px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
              />
            <button
              type="submit"
              disabled={!newMessage.trim()}
              className="p-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition disabled:opacity-50"
            >
              <Send size={20} />
            </button>
          </div>
          </form>
        </div>
      )}

      {/* Screen Share Request Modal */}
      {showScreenShareRequestModal && screenShareRequests.length > 0 && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-md w-full">
            <div className="bg-gradient-to-r from-blue-600 to-cyan-600 text-white p-6 flex items-center justify-between rounded-t-xl">
              <div className="flex items-center gap-3">
                <Monitor size={24} />
                <h3 className="text-xl font-bold">Solicitud de Compartir Pantalla</h3>
              </div>
              <button
                onClick={() => setShowScreenShareRequestModal(false)}
                className="hover:bg-white hover:bg-opacity-20 p-2 rounded-full transition"
              >
                <X size={24} />
              </button>
            </div>

            <div className="p-6 space-y-4 max-h-96 overflow-y-auto">
              {screenShareRequests.map((request, index) => (
                <div key={request.viewerId} className="bg-gray-50 rounded-lg p-4">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-12 h-12 bg-gradient-to-br from-cyan-500 to-blue-600 rounded-full flex items-center justify-center">
                      <UserCircle size={24} className="text-white" />
                    </div>
                    <div className="flex-1">
                      <p className="font-semibold text-gray-800">
                        {request.viewerName}
                      </p>
                      <p className="text-sm text-gray-600">
                        Solicita compartir su pantalla
                      </p>
                    </div>
                  </div>

                  <div className="flex gap-2">
                    <button
                      onClick={() => approveScreenShare(request.viewerId)}
                      className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition font-semibold flex items-center justify-center gap-2"
                    >
                      <CheckCircle size={18} />
                      Aprobar
                    </button>
                    <button
                      onClick={() => denyScreenShare(request.viewerId)}
                      className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition font-semibold flex items-center justify-center gap-2"
                    >
                      <X size={18} />
                      Denegar
                    </button>
                  </div>
                </div>
              ))}
            </div>

            <div className="bg-gray-50 px-6 py-4 rounded-b-xl">
              <p className="text-xs text-gray-600 text-center">
                <AlertCircle size={14} className="inline mr-1" />
                El estudiante podrá compartir su pantalla con toda la clase si lo apruebas
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Registros de Clases */}
      <ClassRecordsModal
        isOpen={showClassRecordsModal}
        onClose={() => setShowClassRecordsModal(false)}
        scheduledClasses={scheduledClasses}
      />

      {/* Confirmación y Toast */}
      <ConfirmDialog
        isOpen={showConfirmDialog}
        onClose={() => setShowConfirmDialog(false)}
        onConfirm={confirmAction?.onConfirm}
        title={confirmAction?.title}
        message={confirmAction?.message}
        confirmText="Confirmar"
        cancelText="Cancelar"
        type="warning"
      />

      <Toast
        isOpen={showToast}
        onClose={() => setShowToast(false)}
        message={toastMessage}
        type={toastType}
      />
    </div>
  );
};

export default CourseLiveTab;
