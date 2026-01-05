// frontend/src/components/Student/StudentLiveTab.jsx

import { useState, useEffect, useRef } from 'react';
import {
  Video, VideoOff, Mic, MicOff, Loader, Users, Maximize, Minimize,
  MessageCircle, Send, X, UserCircle, AlertCircle, Clock, Minimize2, Play,
  Monitor, MonitorOff, Paintbrush, Eraser, Download, Trash2, Calendar,
  ChevronLeft, ChevronRight, LogOut
} from 'lucide-react';
import io from 'socket.io-client';
import { useStore } from '../../store/store';
import Toast from '../Toast';
import { useNavigationGuard } from '../../hooks/useNavigationGuard';
import { getAuthToken } from '../../utils/getAuthToken';

// ✅ iOS FIX: Función para forzar H.264 codec (compatibilidad con Safari iOS)
// Safari iOS no soporta VP9, solo H.264 y VP8
const forceH264Codec = (sdp) => {
  console.log('🔧 [iOS-FIX] Modificando SDP para forzar H.264...');

  // Separar SDP en líneas
  const sdpLines = sdp.split('\r\n');
  const mLineIndex = sdpLines.findIndex(line => line.startsWith('m=video'));

  if (mLineIndex === -1) {
    console.warn('⚠️ [iOS-FIX] No se encontró m=video en SDP');
    return sdp;
  }

  // Buscar payload type de H.264
  const h264PayloadType = sdpLines.find(line =>
    line.includes('rtpmap') && line.toLowerCase().includes('h264')
  );

  if (!h264PayloadType) {
    console.warn('⚠️ [iOS-FIX] No se encontró H.264 en SDP');
    return sdp;
  }

  // Extraer el payload number de H.264 (ej: "a=rtpmap:96 H264/90000" -> 96)
  const h264Payload = h264PayloadType.match(/(\d+)\s+H264/i)?.[1];

  if (!h264Payload) {
    console.warn('⚠️ [iOS-FIX] No se pudo extraer payload de H.264');
    return sdp;
  }

  // Modificar m=video line para priorizar H.264
  const mLine = sdpLines[mLineIndex];
  const parts = mLine.split(' ');

  // Filtrar el H.264 payload de la lista
  const otherPayloads = parts.slice(3).filter(p => p !== h264Payload);

  // Reconstruir con H.264 primero
  const newMLine = `${parts[0]} ${parts[1]} ${parts[2]} ${h264Payload} ${otherPayloads.join(' ')}`;
  sdpLines[mLineIndex] = newMLine;

  const modifiedSdp = sdpLines.join('\r\n');
  console.log('✅ [iOS-FIX] SDP modificado - H.264 priorizado');

  return modifiedSdp;
};

const StudentLiveTab = ({ course, isMinimizedView = false }) => {
  const { user, activeLiveClass, setActiveLiveClass, updateActiveLiveClass, clearActiveLiveClass } = useStore();

  const [isLive, setIsLive] = useState(false);
  const [isJoined, setIsJoined] = useState(false);
  const isJoinedRef = useRef(false); // ✅ Ref para acceder al estado en cleanup
  const [viewers, setViewers] = useState(0);
  const [viewersList, setViewersList] = useState([]);
  const [loading, setLoading] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showChat, setShowChat] = useState(true);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [hasStream, setHasStream] = useState(false);
  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  const [toastType, setToastType] = useState('success');

  // Estados de clases programadas
  const [scheduledClasses, setScheduledClasses] = useState([]);
  const [loadingScheduled, setLoadingScheduled] = useState(false);
  const [currentClassIndex, setCurrentClassIndex] = useState(0);

  // Estado del modal de streaming
  const [showStreamModal, setShowStreamModal] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);

  // Estados para arrastre del modal minimizado
  const [minimizedPosition, setMinimizedPosition] = useState({ x: 20, y: 20 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });

  // ✅ Sincronizar isJoinedRef con isJoined
  useEffect(() => {
    isJoinedRef.current = isJoined;
  }, [isJoined]);

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

  // Estados para intercambio de videos (pin to main)
  const [pinnedParticipant, setPinnedParticipant] = useState(null); // null = docente, 'me' = yo, o ID de otro estudiante

  // Estados de paginación para panel de participantes (móvil)
  const [currentPage, setCurrentPage] = useState(0);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  const ITEMS_PER_PAGE_MOBILE = 1; // Mostrar 1 participante por página en móvil

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
      document.body.style.position = 'fixed';
      document.body.style.width = '100%';
      document.body.style.height = '100%';
    } else {
      document.body.style.overflow = 'unset';
      document.body.style.position = 'unset';
      document.body.style.width = 'auto';
      document.body.style.height = 'auto';
    }
    return () => {
      document.body.style.overflow = 'unset';
      document.body.style.position = 'unset';
      document.body.style.width = 'auto';
      document.body.style.height = 'auto';
    };
  }, [showStreamModal, isMinimized]);

  // Estados de pizarra
  const [showWhiteboard, setShowWhiteboard] = useState(false);
  const [isDrawing, setIsDrawing] = useState(false);
  const [drawColor, setDrawColor] = useState('#000000');
  const [drawWidth, setDrawWidth] = useState(2);
  const [drawTool, setDrawTool] = useState('pen');
  const canvasRef = useRef(null);
  const remoteDrawingRef = useRef({ isDrawing: false, ctx: null });

  // ✅ BIDIRECTIONAL VIDEO: Estados para cámara del estudiante (ANTES de useEffect)
  const [isCameraEnabled, setIsCameraEnabled] = useState(false);
  const [isMuted, setIsMuted] = useState(true); // Iniciar con micrófono apagado por defecto
  const [isForceMuted, setIsForceMuted] = useState(false); // Silenciado forzosamente por el docente
  const [myStream, setMyStream] = useState(null);
  const myStreamRef = useRef(null); // ✅ Ref para acceso inmediato al stream
  const [needsUserInteraction, setNeedsUserInteraction] = useState(false);

  // ✅ Effect to assign myStream to myVideoRef when camera is enabled
  useEffect(() => {
    if (isCameraEnabled && myStream && myVideoRef.current) {
      console.log('📹 [STUDENT] Asignando mi stream al videoRef');
      myVideoRef.current.srcObject = myStream;
      myVideoRef.current.play().catch(err => {
        console.warn('Error playing own video:', err);
      });
    }
  }, [isCameraEnabled, myStream]);

  // ✅ SCREEN SHARE: Estados para compartir pantalla
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const isScreenSharingRef = useRef(false); // ✅ Ref para acceso inmediato al estado de screen sharing
  const [screenSharePending, setScreenSharePending] = useState(false);
  const screenStreamRef = useRef(null); // ✅ Para guardar el stream de pantalla compartida


  // ✅ TEACHER CAMERA STATUS: Track if teacher's camera is on/off
  const [isTeacherCameraOn, setIsTeacherCameraOn] = useState(true);

  // ✅ TEACHER SCREEN SHARE STATUS: Track if teacher is sharing screen
  const [isTeacherScreenSharing, setIsTeacherScreenSharing] = useState(false);
  const [teacherScreenStream, setTeacherScreenStream] = useState(null); // ✅ DUAL STREAM: Stream de pantalla compartida del docente
  const teacherCameraPipRef = useRef(null); // ✅ Ref para el PIP de cámara del docente durante screen sharing

  // ✅ SCREEN SHARE BLOCK: Track if teacher has blocked screen sharing for students
  const [isScreenShareBlocked, setIsScreenShareBlocked] = useState(false);

  // ✅ Estado para forzar re-render cuando cambia el stream del docente
  const [teacherStreamVersion, setTeacherStreamVersion] = useState(0);

  // ✅ Effect to refresh video when minimize state changes or screen share changes
  useEffect(() => {
    if (videoRef.current && hasStream) {
      // ✅ FIX: Mostrar pantalla compartida si está disponible, sino cámara
      const streamToShow = teacherScreenStream || teacherStreamRef.current;
      if (streamToShow) {
        const videoEl = videoRef.current;

        console.log(`📺 [STUDENT-USEEFFECT] Asignando ${teacherScreenStream ? 'PANTALLA COMPARTIDA' : 'CÁMARA'} al videoRef`);
        console.log(`🎵 [STUDENT-USEEFFECT-AUDIO] Stream tiene ${streamToShow.getAudioTracks().length} audio tracks`);

        // ✅ FIX AUDIO: Logs de audio tracks
        streamToShow.getAudioTracks().forEach((track, idx) => {
          console.log(`🎵 [STUDENT-USEEFFECT-AUDIO] Audio track ${idx}:`, {
            id: track.id,
            label: track.label,
            enabled: track.enabled,
            muted: track.muted,
            readyState: track.readyState
          });
        });

        // ✅ SIEMPRE reasignar para asegurar que el audio se reproduce
        videoEl.srcObject = streamToShow;
        videoEl.setAttribute('playsinline', 'true');
        videoEl.setAttribute('autoplay', 'true');
        videoEl.muted = false; // ✅ CRITICAL: false para escuchar audio

        console.log(`🔊 [STUDENT-USEEFFECT-AUDIO] Video element muted: ${videoEl.muted}`);

        videoEl.play()
          .then(() => {
            console.log('✅ [STUDENT-USEEFFECT] Video/Audio reproduciéndose correctamente');
            console.log(`🔊 [STUDENT-USEEFFECT-AUDIO] Video volume: ${videoEl.volume}`);
            setNeedsUserInteraction(false);
          })
          .catch(err => {
            console.warn('⚠️ [STUDENT-USEEFFECT] Error al reproducir video/audio:', err);
            setNeedsUserInteraction(true);
          });
      }
    }
  }, [isMinimized, teacherScreenStream, hasStream, teacherStreamVersion]);

  // ✅ JOIN PREFERENCES: Modal and settings for joining with camera/mic
  const [showJoinPreferencesModal, setShowJoinPreferencesModal] = useState(false);
  const [joinWithCamera, setJoinWithCamera] = useState(false);
  const [joinWithAudio, setJoinWithAudio] = useState(true);

  const videoRef = useRef(null);
  const myVideoRef = useRef(null); // ✅ Video del estudiante (principal o panel)
  const socketRef = useRef(null);
  const peerConnectionRef = useRef(null);
  const studentPeerConnectionRef = useRef(null); // ✅ Conexión para enviar video del estudiante
  const containerRef = useRef(null);
  const chatEndRef = useRef(null);
  const keepAliveIntervalRef = useRef(null);
  const liveStatusCheckIntervalRef = useRef(null); // ✅ Para verificar periódicamente si la clase sigue activa
  const teacherStreamRef = useRef(null); // Para almacenar el stream del profesor temporalmente

  // ✅ STUDENT P2P: Conexiones y streams de otros estudiantes
  const peerStudentsRef = useRef(new Map()); // Map<viewerId, RTCPeerConnection>
  const [peerStudentStreams, setPeerStudentStreams] = useState({}); // Object<viewerId, MediaStream> - más fácil para React
  const [peerStudentScreenStreams, setPeerStudentScreenStreams] = useState({}); // Object<viewerId, MediaStream> - streams de pantalla compartida
  const [peerStudentCameraStates, setPeerStudentCameraStates] = useState({}); // Object<viewerId, boolean> - estado de cámara de peers
  const [peerStudentScreenSharingStates, setPeerStudentScreenSharingStates] = useState({}); // Object<viewerId, boolean> - estado de screen sharing de peers

  // ✅ FIX AUDIO: Refs para elementos de audio separados (para reproducir audio de peers)
  const peerAudioRefs = useRef({}); // Object<viewerId, HTMLAudioElement>
  const teacherAudioRef = useRef(null); // HTMLAudioElement para audio del docente

  // ✅ Ref para isMuted para evitar stale closure en socket listeners
  const isMutedRef = useRef(isMuted);
  const peerStudentScreenSharingStatesRef = useRef(peerStudentScreenSharingStates);

  // Mantener isMutedRef sincronizada con isMuted
  useEffect(() => {
    isMutedRef.current = isMuted;
  }, [isMuted]);

  // Mantener peerStudentScreenSharingStatesRef sincronizada con peerStudentScreenSharingStates
  useEffect(() => {
    peerStudentScreenSharingStatesRef.current = peerStudentScreenSharingStates;
  }, [peerStudentScreenSharingStates]);

  // Mantener myStreamRef sincronizada con myStream
  useEffect(() => {
    myStreamRef.current = myStream;
  }, [myStream]);

  // Mantener isScreenSharingRef sincronizada con isScreenSharing
  useEffect(() => {
    isScreenSharingRef.current = isScreenSharing;
  }, [isScreenSharing]);

  // ✅ FIX AUDIO: Reproducir audio del docente en elemento separado para asegurar que funcione
  useEffect(() => {
    if (!teacherStreamRef.current && !teacherScreenStream) {
      // No hay stream del docente, limpiar audio
      if (teacherAudioRef.current) {
        teacherAudioRef.current.srcObject = null;
        teacherAudioRef.current = null;
      }
      return;
    }

    const streamToUse = teacherScreenStream || teacherStreamRef.current;
    if (!streamToUse) return;

    const audioTracks = streamToUse.getAudioTracks();
    if (audioTracks.length === 0) {
      console.log('⚠️ [STUDENT-AUDIO-FIX] No hay audio tracks en el stream del docente');
      return;
    }

    console.log(`🔊 [STUDENT-AUDIO-FIX] Creando elemento de audio para docente con ${audioTracks.length} tracks`);

    // Crear o reutilizar elemento de audio
    if (!teacherAudioRef.current) {
      teacherAudioRef.current = new Audio();
      teacherAudioRef.current.autoplay = true;
      // ✅ iOS FIX: Atributos necesarios para Safari/iOS
      teacherAudioRef.current.playsInline = true;
      teacherAudioRef.current.setAttribute('playsinline', 'true');
      teacherAudioRef.current.setAttribute('webkit-playsinline', 'true');
      teacherAudioRef.current.muted = false; // Asegurar que no esté muted
    }

    teacherAudioRef.current.srcObject = streamToUse;

    // ✅ iOS FIX: Intentar play múltiples veces para iOS
    const tryPlay = () => {
      teacherAudioRef.current.play()
        .then(() => {
          console.log('✅ [STUDENT-AUDIO-FIX] Audio del docente reproduciéndose correctamente');
        })
        .catch(err => {
          console.warn('⚠️ [STUDENT-AUDIO-FIX] Error reproduciendo audio del docente:', err);

          // ✅ iOS FIX: Si falla, intentar de nuevo en 500ms (para iOS que requiere interacción)
          if (err.name === 'NotAllowedError') {
            console.log('📱 [STUDENT-AUDIO-FIX-iOS] Autoplay bloqueado, reintentando...');
            setTimeout(() => {
              teacherAudioRef.current.play().catch(e =>
                console.warn('⚠️ [STUDENT-AUDIO-FIX-iOS] Segundo intento falló:', e)
              );
            }, 500);
          }
        });
    };

    tryPlay();
  }, [teacherScreenStream, teacherStreamVersion]);

  // ✅ FIX AUDIO P2P: Reproducir audio de peer students en elementos separados
  useEffect(() => {
    console.log('🔊 [STUDENT-P2P-AUDIO-FIX] Actualizando audio de peer students...', Object.keys(peerStudentStreams));

    // Crear/actualizar elementos de audio para cada peer student
    Object.keys(peerStudentStreams).forEach(viewerId => {
      const stream = peerStudentStreams[viewerId];
      if (!stream) return;

      const audioTracks = stream.getAudioTracks();
      if (audioTracks.length === 0) {
        console.log(`⚠️ [STUDENT-P2P-AUDIO-FIX] No hay audio tracks para peer ${viewerId}`);
        return;
      }

      console.log(`🔊 [STUDENT-P2P-AUDIO-FIX] Configurando audio para peer ${viewerId} con ${audioTracks.length} tracks`);

      // Crear o reutilizar elemento de audio
      if (!peerAudioRefs.current[viewerId]) {
        peerAudioRefs.current[viewerId] = new Audio();
        peerAudioRefs.current[viewerId].autoplay = true;
        // ✅ iOS FIX: Atributos necesarios para Safari/iOS
        peerAudioRefs.current[viewerId].playsInline = true;
        peerAudioRefs.current[viewerId].setAttribute('playsinline', 'true');
        peerAudioRefs.current[viewerId].setAttribute('webkit-playsinline', 'true');
        peerAudioRefs.current[viewerId].muted = false;
      }

      const audioEl = peerAudioRefs.current[viewerId];

      // Solo actualizar si es un stream diferente
      if (audioEl.srcObject !== stream) {
        audioEl.srcObject = stream;
        audioEl.play()
          .then(() => {
            console.log(`✅ [STUDENT-P2P-AUDIO-FIX] Audio de peer ${viewerId} reproduciéndose correctamente`);
          })
          .catch(err => {
            console.warn(`⚠️ [STUDENT-P2P-AUDIO-FIX] Error reproduciendo audio de peer ${viewerId}:`, err);

            // ✅ iOS FIX: Reintentar si es error de autoplay
            if (err.name === 'NotAllowedError') {
              console.log(`📱 [STUDENT-P2P-AUDIO-FIX-iOS] Autoplay bloqueado para peer ${viewerId}, reintentando...`);
              setTimeout(() => {
                audioEl.play().catch(e =>
                  console.warn(`⚠️ [STUDENT-P2P-AUDIO-FIX-iOS] Segundo intento falló para peer ${viewerId}:`, e)
                );
              }, 500);
            }
          });
      }
    });

    // Limpiar elementos de audio de peers que ya no están
    Object.keys(peerAudioRefs.current).forEach(viewerId => {
      if (!peerStudentStreams[viewerId]) {
        console.log(`🗑️ [STUDENT-P2P-AUDIO-FIX] Limpiando audio de peer ${viewerId} que se desconectó`);
        if (peerAudioRefs.current[viewerId]) {
          peerAudioRefs.current[viewerId].srcObject = null;
          delete peerAudioRefs.current[viewerId];
        }
      }
    });
  }, [peerStudentStreams]);

  // ✅ Ref para video pinneado de estudiante P2P
  const pinnedStudentVideoRef = useRef(null);

  // ✅ FIX: Refs para videos de estudiantes en panel lateral (con claves compuestas)
  const peerVideoRefs = useRef({});

  // ✅ FIX: Effect para asignar CAMERA streams a videos P2P en panel lateral
  useEffect(() => {
    console.log('🔄 [STUDENT-P2P-CAMERA-USEEFFECT] Revisando camera streams P2P...', Object.keys(peerStudentStreams));
    console.log('🔄 [STUDENT-P2P-CAMERA-USEEFFECT] Video refs disponibles:', Object.keys(peerVideoRefs.current));

    Object.keys(peerStudentStreams).forEach(viewerId => {
      const videoKey = `${viewerId}-camera`;
      const videoEl = peerVideoRefs.current[videoKey];
      const stream = peerStudentStreams[viewerId];

      console.log(`🔍 [STUDENT-P2P-CAMERA-USEEFFECT] Procesando ${viewerId} (camera):`, {
        videoKey,
        hasVideoEl: !!videoEl,
        hasStream: !!stream,
        currentSrcObject: videoEl?.srcObject,
        streamId: stream?.id,
        needsAssignment: videoEl && stream && videoEl.srcObject !== stream
      });

      if (!videoEl) {
        console.warn(`⚠️ [STUDENT-P2P-CAMERA-USEEFFECT] No hay elemento video para ${videoKey}`);
        return;
      }

      if (!stream) {
        console.warn(`⚠️ [STUDENT-P2P-CAMERA-USEEFFECT] No hay stream para ${viewerId}`);
        return;
      }

      // ✅ FIX: Comparar por stream ID, no por referencia de objeto
      if (videoEl.srcObject && videoEl.srcObject.id === stream.id) {
        console.log(`⏭️ [STUDENT-P2P-CAMERA-USEEFFECT] Stream ya asignado para ${videoKey} (ID: ${stream.id})`);
        return;
      }

      console.log(`📺 [STUDENT-P2P-CAMERA-USEEFFECT] Asignando camera stream de ${viewerId}`);

      videoEl.pause();
      videoEl.srcObject = null;

      setTimeout(() => {
        if (!videoEl || !stream) {
          console.warn(`⚠️ [STUDENT-P2P-CAMERA-USEEFFECT] Elementos no disponibles después del timeout para ${videoKey}`);
          return;
        }

        videoEl.srcObject = stream;
        videoEl.setAttribute('playsinline', 'true');
        videoEl.setAttribute('autoplay', 'true');
        videoEl.muted = false;

        console.log(`▶️ [STUDENT-P2P-CAMERA-USEEFFECT] Intentando reproducir camera video de ${viewerId}...`);

        videoEl.play()
          .then(() => {
            console.log(`✅ [STUDENT-P2P-CAMERA-USEEFFECT] Camera video reproduciéndose exitosamente: ${viewerId}`);
          })
          .catch(err => {
            console.error(`❌ [STUDENT-P2P-CAMERA-USEEFFECT] Error al reproducir camera ${viewerId}:`, err);
          });
      }, 150);
    });
  }, [peerStudentStreams]);

  // ✅ FIX: Effect para asignar SCREEN SHARE streams a videos P2P en panel lateral
  useEffect(() => {
    console.log('🔄 [STUDENT-P2P-SCREEN-USEEFFECT] Revisando screen streams P2P...', Object.keys(peerStudentScreenStreams));
    console.log('🔄 [STUDENT-P2P-SCREEN-USEEFFECT] Video refs disponibles:', Object.keys(peerVideoRefs.current));

    Object.keys(peerStudentScreenStreams).forEach(viewerId => {
      const videoKey = `${viewerId}-screen`;
      const videoEl = peerVideoRefs.current[videoKey];
      const stream = peerStudentScreenStreams[viewerId];

      console.log(`🔍 [STUDENT-P2P-SCREEN-USEEFFECT] Procesando ${viewerId} (screen):`, {
        videoKey,
        hasVideoEl: !!videoEl,
        hasStream: !!stream,
        currentSrcObject: videoEl?.srcObject,
        streamId: stream?.id,
        needsAssignment: videoEl && stream && videoEl.srcObject !== stream
      });

      if (!videoEl) {
        console.warn(`⚠️ [STUDENT-P2P-SCREEN-USEEFFECT] No hay elemento video para ${videoKey}`);
        return;
      }

      if (!stream) {
        console.warn(`⚠️ [STUDENT-P2P-SCREEN-USEEFFECT] No hay stream para ${viewerId}`);
        return;
      }

      // ✅ FIX: Comparar por stream ID, no por referencia de objeto
      if (videoEl.srcObject && videoEl.srcObject.id === stream.id) {
        console.log(`⏭️ [STUDENT-P2P-SCREEN-USEEFFECT] Stream ya asignado para ${videoKey} (ID: ${stream.id})`);
        return;
      }

      console.log(`📺 [STUDENT-P2P-SCREEN-USEEFFECT] Asignando screen stream de ${viewerId}`);

      videoEl.pause();
      videoEl.srcObject = null;

      setTimeout(() => {
        if (!videoEl || !stream) {
          console.warn(`⚠️ [STUDENT-P2P-SCREEN-USEEFFECT] Elementos no disponibles después del timeout para ${videoKey}`);
          return;
        }

        videoEl.srcObject = stream;
        videoEl.setAttribute('playsinline', 'true');
        videoEl.setAttribute('autoplay', 'true');
        videoEl.muted = false;

        console.log(`▶️ [STUDENT-P2P-SCREEN-USEEFFECT] Intentando reproducir screen video de ${viewerId}...`);

        videoEl.play()
          .then(() => {
            console.log(`✅ [STUDENT-P2P-SCREEN-USEEFFECT] Screen video reproduciéndose exitosamente: ${viewerId}`);
          })
          .catch(err => {
            console.error(`❌ [STUDENT-P2P-SCREEN-USEEFFECT] Error al reproducir screen ${viewerId}:`, err);
          });
      }, 150);
    });
  }, [peerStudentScreenStreams]);

  // ✅ Effect para asignar stream al video pinneado cuando cambia
  useEffect(() => {
    if (!pinnedStudentVideoRef.current) return;
    if (!pinnedParticipant || pinnedParticipant === 'me' || pinnedParticipant === 'teacher-camera' || pinnedParticipant === 'teacher-screen') return;

    const screenStream = peerStudentScreenStreams[pinnedParticipant];
    const cameraStream = peerStudentStreams[pinnedParticipant];
    const streamToAssign = screenStream || cameraStream;

    if (streamToAssign && pinnedStudentVideoRef.current.srcObject !== streamToAssign) {
      console.log('📺 [STUDENT-P2P-EFFECT] Asignando stream de', pinnedParticipant, 'via useEffect');

      // ✅ FIX: Pequeño delay para evitar interrupciones cuando ambos streams llegan casi al mismo tiempo
      const timeoutId = setTimeout(() => {
        if (!pinnedStudentVideoRef.current) return;

        const videoEl = pinnedStudentVideoRef.current;

        // ✅ FIX: Pausar y limpiar antes de asignar nuevo stream
        videoEl.pause();
        videoEl.srcObject = null;

        // Pequeño delay adicional para que el navegador libere recursos
        setTimeout(() => {
          if (!pinnedStudentVideoRef.current) return;

          videoEl.srcObject = streamToAssign;
          videoEl.setAttribute('playsinline', 'true');
          videoEl.setAttribute('autoplay', 'true');
          videoEl.muted = false;

          videoEl.play()
            .then(() => console.log('✅ [STUDENT-P2P-EFFECT] Video reproduciéndose'))
            .catch(err => console.log('⚠️ [STUDENT-P2P-EFFECT] Autoplay prevented:', err));
        }, 50);
      }, 100);

      return () => clearTimeout(timeoutId);
    }
  }, [pinnedParticipant, peerStudentScreenStreams, peerStudentStreams]);

  // ✅ NAVIGATION GUARD: Proteger contra salidas accidentales durante la clase
  useNavigationGuard(
    isJoined,
    '¿Estás seguro de que quieres salir? Te desconectarás de la clase en vivo.',
    () => {
      // Cleanup al salir
      if (socketRef.current) {
        socketRef.current.emit('leave-viewer', { courseId: course.id });
      }
      if (peerConnectionRef.current) {
        peerConnectionRef.current.close();
      }
      if (studentPeerConnectionRef.current) {
        studentPeerConnectionRef.current.close();
      }
      if (myStream) {
        myStream.getTracks().forEach(track => track.stop());
      }
    }
  );

  // Cargar clases programadas del curso
  const loadScheduledClasses = async () => {
    try {
      setLoadingScheduled(true);
      const response = await fetch(`/api/courses/${course.id}/scheduled-classes`, {
        headers: {
          'Authorization': `Bearer ${getAuthToken()}`
        }
      });

      const data = await response.json();

      if (data.success) {
        const classes = data.classes || [];
        console.log(`✅ [STUDENT-LIVE-TAB] ${classes.length} clases programadas cargadas`);

        // Filtrar solo clases del día actual en adelante
        const now = new Date();
        const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()); // Inicio del día actual (00:00:00)

        const futureClasses = classes
          .filter(c => {
            if (!c.date || !c.time) return false;
            const classDate = new Date(c.date + 'T' + c.time);
            // Solo incluir clases de hoy en adelante (se eliminarán al día siguiente)
            return classDate >= todayStart;
          })
          .sort((a, b) => {
            // Ordenar por fecha más cercana primero
            const dateA = new Date(a.date + 'T' + a.time);
            const dateB = new Date(b.date + 'T' + b.time);
            return dateA - dateB;
          })
          .slice(0, 5); // Máximo 5 clases futuras

        setScheduledClasses(futureClasses);

        // Resetear el índice si es mayor que el número de clases
        if (currentClassIndex >= futureClasses.length && futureClasses.length > 0) {
          setCurrentClassIndex(0);
        }
      }
    } catch (error) {
      console.error('❌ [STUDENT-LIVE-TAB] Error al cargar clases programadas:', error);
      setScheduledClasses([]);
    } finally {
      setLoadingScheduled(false);
    }
  };

  // Cargar clases programadas al montar el componente
  useEffect(() => {
    loadScheduledClasses();
  }, [course.id]);

  // Auto-actualizar clases programadas cada minuto para eliminar las que ya pasaron
  useEffect(() => {
    const interval = setInterval(() => {
      console.log('🔄 [STUDENT-LIVE-TAB] Auto-actualizando clases programadas...');
      loadScheduledClasses();
    }, 60000); // 60 segundos

    return () => clearInterval(interval);
  }, [course.id]);

  // Funciones para navegación del carrusel
  const handleNextClass = () => {
    setCurrentClassIndex((prev) => (prev + 1) % scheduledClasses.length);
  };

  const handlePrevClass = () => {
    setCurrentClassIndex((prev) => (prev - 1 + scheduledClasses.length) % scheduledClasses.length);
  };

  useEffect(() => {
    // Conectar al servidor de WebRTC
    // IMPORTANTE: Socket.IO se conecta a la raíz del servidor, no a /api
    const socketUrl = import.meta.env.VITE_API_URL
      ? import.meta.env.VITE_API_URL.replace('/api', '')
      : 'http://localhost:5000';

    console.log('🔌 [STUDENT] Conectando a Socket.IO en:', socketUrl);
    const socket = io(socketUrl, {
      auth: { token: getAuthToken() }
    });

    socketRef.current = socket;

    // ✅ NUEVO: Verificar si ya hay una sesión en vivo cuando el componente se monta
    socket.on('connect', () => {
      socket.emit('check-live-status', { courseId: course.id });
    });

    socket.on('live-status', (data) => {
      console.log('📊 Estado de sesión en vivo:', data);

      // ✅ FIX CRÍTICO: Si el estudiante está unido pero la clase ya no está activa, desconectarlo
      if (!data.isLive && isJoinedRef.current) {
        console.log('⚠️ [STUDENT-CHECK] La clase ya no está activa, desconectando al estudiante...');
        setIsLive(false);
        setIsJoined(false);
        setHasStream(false);

        // Limpiar peer connections
        if (peerConnectionRef.current) {
          peerConnectionRef.current.close();
          peerConnectionRef.current = null;
        }
        if (studentPeerConnectionRef.current) {
          studentPeerConnectionRef.current.close();
          studentPeerConnectionRef.current = null;
        }

        // Limpiar video
        if (videoRef.current) {
          videoRef.current.srcObject = null;
        }

        showToastMessage('La clase ha finalizado', 'warning');
        return; // Salir temprano
      }

      setIsLive(data.isLive);

      // ✅ FIX: Recibir estado inicial de la cámara si hay una clase en vivo
      if (data.isLive && typeof data.cameraEnabled !== 'undefined') {
        console.log(`📹 [STUDENT] Estado de cámara al verificar live-status: ${data.cameraEnabled}`);
        setIsTeacherCameraOn(data.cameraEnabled);
      }

      // ✅ FIX: Recibir estado inicial de screen sharing si hay una clase en vivo
      if (data.isLive && typeof data.isScreenSharing !== 'undefined') {
        console.log(`📺 [STUDENT] Estado de screen sharing al verificar live-status: ${data.isScreenSharing}`);
        setIsTeacherScreenSharing(data.isScreenSharing);
      }

      if (data.isLive && !isJoinedRef.current) {
        showToastMessage('Hay una clase en vivo. Únete para participar.', 'info');
      }
    });

    socket.on('streaming-started', (data) => {
      console.log('📡 Transmisión iniciada', data);
      setIsLive(true);

      // ✅ FIX: Recibir estado inicial de la cámara del docente
      if (data && typeof data.cameraEnabled !== 'undefined') {
        console.log(`📹 [STUDENT] Estado inicial de cámara del docente: ${data.cameraEnabled}`);
        setIsTeacherCameraOn(data.cameraEnabled);
      }

      // ✅ FIX: Recibir estado inicial de screen sharing del docente
      if (data && typeof data.isScreenSharing !== 'undefined') {
        console.log(`📺 [STUDENT] Estado inicial de screen sharing del docente: ${data.isScreenSharing}`);
        setIsTeacherScreenSharing(data.isScreenSharing);
      }

      showToastMessage('La clase ha iniciado', 'success');
    });

    socket.on('streaming-stopped', () => {
      console.log('📴 Transmisión finalizada');
      setIsLive(false);
      setIsJoined(false);
      setHasStream(false);
      if (peerConnectionRef.current) {
        peerConnectionRef.current.close();
        peerConnectionRef.current = null;
      }
      if (videoRef.current) {
        videoRef.current.srcObject = null;
      }
      showToastMessage('La clase ha finalizado', 'info');
    });

    socket.on('viewer-count', (count) => {
      setViewers(count);
    });

    socket.on('viewers-list', async (viewers) => {
      console.log('👥 [STUDENT] Lista de espectadores actualizada:', viewers);
      setViewersList(viewers);

      // ✅ STUDENT P2P: Limpiar conexiones de estudiantes que ya no están
      const currentViewerIds = new Set(viewers.map(v => v.id));
      peerStudentsRef.current.forEach((pc, viewerId) => {
        if (!currentViewerIds.has(viewerId) && viewerId !== socketRef.current?.id) {
          console.log(`🧹 [STUDENT-P2P] Limpiando conexión de estudiante desconectado: ${viewerId}`);
          pc.close();
          peerStudentsRef.current.delete(viewerId);

          // Limpiar streams
          setPeerStudentStreams(prev => {
            const newStreams = { ...prev };
            delete newStreams[viewerId];
            return newStreams;
          });

          setPeerStudentScreenStreams(prev => {
            const newStreams = { ...prev };
            delete newStreams[viewerId];
            return newStreams;
          });

          // ✅ CRITICAL FIX: Limpiar estados de cámara y pantalla compartida
          setPeerStudentCameraStates(prev => {
            const newStates = { ...prev };
            delete newStates[viewerId];
            return newStates;
          });

          setPeerStudentScreenSharingStates(prev => {
            const newStates = { ...prev };
            delete newStates[viewerId];
            return newStates;
          });

          console.log(`✅ [STUDENT-P2P] Conexión y estados limpiados para ${viewerId}`);
        }
      });

      // ✅ CRITICAL FIX: Si tengo stream activo Y hay estudiantes con los que NO tengo conexión, enviar offer dirigido
      // Esto maneja el caso donde me uno DESPUÉS de que otros estudiantes ya activaron su cámara
      console.log(`📋 [STUDENT-P2P-VIEWERS] Mi stream: ${!!myStreamRef.current}, estudiantes: ${viewers.length}`);
      if (myStreamRef.current) {
        const myTracks = myStreamRef.current.getTracks();
        const hasActiveTracks = myTracks.some(track => track.enabled && track.readyState === 'live');

        console.log(`📋 [STUDENT-P2P-VIEWERS] Tracks activos: ${hasActiveTracks}, tracks: ${myTracks.map(t => `${t.kind}:${t.enabled}`).join(', ')}`);

        if (hasActiveTracks) {
          console.log(`📋 [STUDENT-P2P-VIEWERS] Revisando ${viewers.length} estudiantes para crear conexiones...`);
          for (const viewer of viewers) {
            // No enviar offer a mí mismo
            if (viewer.id === socketRef.current?.id) {
              console.log(`⏭️ [STUDENT-P2P-VIEWERS] Saltando ${viewer.name} (soy yo)`);
              continue;
            }

            // Si ya tengo conexión P2P con este estudiante, skip
            if (peerStudentsRef.current.has(viewer.id)) {
              console.log(`⏭️ [STUDENT-P2P-VIEWERS] Ya tengo conexión con ${viewer.name} (${viewer.id})`);
              continue;
            }

            console.log(`🆕 [STUDENT-P2P-INIT] Detectado estudiante sin conexión: ${viewer.name} (${viewer.id}), creando oferta dirigida...`);

            // Crear nueva peer connection para este estudiante
            try {
              const pc = new RTCPeerConnection({
                iceServers: [
                  { urls: 'stun:stun.l.google.com:19302' },
                  { urls: 'stun:stun1.l.google.com:19302' },
                  { urls: 'stun:stun2.l.google.com:19302' }
                ],
                iceCandidatePoolSize: 10
              });

              // Agregar mis tracks
              myStreamRef.current.getTracks().forEach(track => {
                pc.addTrack(track, myStreamRef.current);
                console.log(`➕ [STUDENT-P2P-INIT] Mi track agregado (${track.kind}) para ${viewer.id}`);
              });

              // Manejar stream remoto
              pc.ontrack = (event) => {
                console.log(`📺 [STUDENT-P2P-INIT] Stream recibido de ${viewer.id}:`, event.streams[0]);
                console.log(`🎵 [STUDENT-P2P-INIT] Tracks en stream: video=${event.streams[0].getVideoTracks().length}, audio=${event.streams[0].getAudioTracks().length}`);

                if (event.streams[0]) {
                  const stream = event.streams[0];
                  const videoTracks = stream.getVideoTracks();
                  const audioTracks = stream.getAudioTracks();

                  // ✅ FIX AUDIO: Log audio tracks para debugging
                  audioTracks.forEach((track, idx) => {
                    console.log(`🎵 [STUDENT-P2P-INIT] Audio track ${idx}:`, {
                      id: track.id,
                      label: track.label,
                      enabled: track.enabled,
                      muted: track.muted,
                      readyState: track.readyState
                    });
                  });

                  // ✅ DUAL STREAM: Detectar si es transmisión dual (cámara + pantalla)
                  if (videoTracks.length >= 2) {
                    console.log('🎥 [STUDENT-P2P-INIT] Transmisión dual detectada');

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
                      console.log('⚠️ [STUDENT-P2P-INIT] No se pudo identificar tracks por label, usando posición');
                      cameraTrack = videoTracks[0];
                      screenTrack = videoTracks[1];
                    }

                    console.log('📹 [STUDENT-P2P-INIT] Camera track:', cameraTrack.label, 'enabled:', cameraTrack.enabled);
                    console.log('📺 [STUDENT-P2P-INIT] Screen track:', screenTrack.label, 'enabled:', screenTrack.enabled);

                    const cameraStream = new MediaStream([cameraTrack, ...audioTracks]);
                    const screenStream = new MediaStream([screenTrack]);

                    setPeerStudentStreams(prev => ({ ...prev, [viewer.id]: cameraStream }));
                    setPeerStudentScreenStreams(prev => ({ ...prev, [viewer.id]: screenStream }));
                    console.log('✅ [STUDENT-P2P-INIT] Dual stream guardado para', viewer.id);
                  } else {
                    // ✅ CRITICAL FIX: Solo 1 video track - verificar si es pantalla o cámara
                    const isScreenSharing = peerStudentScreenSharingStatesRef.current[viewer.id] === true;

                    if (isScreenSharing) {
                      // Es pantalla compartida SIN cámara
                      console.log(`📺 [STUDENT-P2P-INIT] Stream de PANTALLA detectado para ${viewer.id}`);
                      setPeerStudentScreenStreams(prev => ({ ...prev, [viewer.id]: stream }));

                      // Limpiar stream de cámara si existe
                      setPeerStudentStreams(prev => {
                        const newStreams = { ...prev };
                        delete newStreams[viewer.id];
                        return newStreams;
                      });
                    } else {
                      // Es cámara SIN pantalla compartida
                      console.log(`📹 [STUDENT-P2P-INIT] Stream de CÁMARA detectado para ${viewer.id}`);
                      setPeerStudentStreams(prev => ({ ...prev, [viewer.id]: stream }));

                      // Limpiar stream de pantalla si existe
                      setPeerStudentScreenStreams(prev => {
                        const newStreams = { ...prev };
                        delete newStreams[viewer.id];
                        return newStreams;
                      });
                    }

                    console.log(`✅ [STUDENT-P2P-INIT] Stream único guardado para ${viewer.id} como ${isScreenSharing ? 'PANTALLA' : 'CÁMARA'}`);
                  }
                }
              };

              // ICE candidates
              pc.onicecandidate = (event) => {
                if (event.candidate) {
                  socketRef.current.emit('peer-student-ice-candidate', {
                    toViewerId: viewer.id,
                    candidate: event.candidate
                  });
                }
              };

              // ✅ FIX ANTI-FREEZE: Manejar estados de conexión ICE
              pc.oniceconnectionstatechange = () => {
                console.log(`🔌 [STUDENT-P2P-ICE] Estado ICE con ${viewer.id}: ${pc.iceConnectionState}`);

                if (pc.iceConnectionState === 'failed' || pc.iceConnectionState === 'disconnected') {
                  console.warn(`⚠️ [STUDENT-P2P-ICE] Conexión ${pc.iceConnectionState} con ${viewer.id}`);

                  // ✅ NO cerrar ni limpiar inmediatamente - dar tiempo para reconexión
                  // Solo limpiar streams de UI para evitar freeze visual
                  if (pc.iceConnectionState === 'failed') {
                    console.log(`🧹 [STUDENT-P2P-ICE] Limpiando streams de ${viewer.id} por fallo de conexión`);
                    setPeerStudentStreams(prev => {
                      const newStreams = { ...prev };
                      delete newStreams[viewer.id];
                      return newStreams;
                    });
                    setPeerStudentScreenStreams(prev => {
                      const newStreams = { ...prev };
                      delete newStreams[viewer.id];
                      return newStreams;
                    });
                  }
                } else if (pc.iceConnectionState === 'connected' || pc.iceConnectionState === 'completed') {
                  console.log(`✅ [STUDENT-P2P-ICE] Conexión establecida con ${viewer.id}`);
                }
              };

              // ✅ FIX: Manejar estado de conexión general
              pc.onconnectionstatechange = () => {
                console.log(`🔗 [STUDENT-P2P-CONN] Estado de conexión con ${viewer.id}: ${pc.connectionState}`);
              };

              // Guardar peer connection
              peerStudentsRef.current.set(viewer.id, pc);

              // Crear y enviar offer DIRIGIDO a este estudiante específico
              const offer = await pc.createOffer();
              await pc.setLocalDescription(offer);
              socketRef.current.emit('student-offer', {
                offer,
                targetViewerId: viewer.id // ✅ DIRIGIDO a este estudiante específico
              });

              console.log(`✅ [STUDENT-P2P-INIT] Offer dirigido enviado a ${viewer.name} (${viewer.id})`);
            } catch (error) {
              console.error(`❌ [STUDENT-P2P-INIT] Error creando conexión con ${viewer.id}:`, error);
            }
          }
        }
      }

      // ✅ Las nuevas conexiones P2P se crean automáticamente cuando:
      // 1. Este estudiante activa cámara/pantalla → envía offer broadcast
      // 2. Otro estudiante activa cámara/pantalla → recibe offer vía peer-student-offer
      // 3. Al recibir viewers-list, enviar offers dirigidos a estudiantes sin conexión (nuevo)
    });

    socket.on('offer', async ({ offer }) => {
      console.log('📥 Offer recibido del docente');
      // 🔍 DIAGNOSTIC: Log offer SDP to verify it contains media tracks
      console.log('🔍 [STUDENT] Offer SDP received:');
      console.log(offer.sdp);
      const videoLines = (offer.sdp.match(/m=video/g) || []).length;
      const audioLines = (offer.sdp.match(/m=audio/g) || []).length;
      console.log(`🔍 [STUDENT] Offer SDP contains ${videoLines} video track(s) and ${audioLines} audio track(s)`);
      await handleOffer(offer);
    });

    socket.on('ice-candidate', async ({ viewerId, candidate }) => {
      console.log('🧊 [STUDENT] ICE candidate recibido:', { viewerId, candidate });
      if (peerConnectionRef.current && candidate) {
        try {
          await peerConnectionRef.current.addIceCandidate(new RTCIceCandidate(candidate));
          console.log('✅ [STUDENT] ICE candidate agregado correctamente');
        } catch (error) {
          console.error('❌ [STUDENT] Error agregando ICE candidate:', error);
        }
      }
    });

    socket.on('chat-message', (message) => {
      setMessages(prev => [...prev, message]);
    });

    socket.on('mute-student', () => {
      console.log('🔇 [STUDENT] Docente ha silenciado a todos');
      console.log('🔇 [STUDENT] Estado actual isMuted (ref):', isMutedRef.current);
      setIsForceMuted(true); // Marcar como forzosamente silenciado

      if (!isMutedRef.current) {
        console.log('🔇 [STUDENT] Forzando silencio del micrófono');
        console.log('🔇 [STUDENT-FORCE] myStreamRef.current existe:', !!myStreamRef.current);

        // Detener audio físicamente usando REF para acceso inmediato
        if (myStreamRef.current) {
          const audioTracks = myStreamRef.current.getAudioTracks();
          console.log('🔇 [STUDENT-FORCE] Audio tracks encontrados:', audioTracks.length);
          audioTracks.forEach(track => {
            console.log('🔇 [STUDENT-FORCE] Deteniendo audio track:', track.id, 'readyState:', track.readyState);
            track.stop();
            console.log('🔇 [STUDENT-FORCE] Audio track detenido. Nuevo readyState:', track.readyState);
          });

          // Remove from peer connection with TEACHER
          if (studentPeerConnectionRef.current && studentPeerConnectionRef.current.connectionState !== 'closed') {
            const sender = studentPeerConnectionRef.current.getSenders().find(s => s.track?.kind === 'audio');
            if (sender) {
              sender.replaceTrack(null);
              console.log('🔇 [STUDENT-FORCE] Audio track removido de conexión con profesor');
            }
          }

          // Remove from P2P with other students
          peerStudentsRef.current.forEach((pc, viewerId) => {
            if (pc.connectionState !== 'closed') {
              const sender = pc.getSenders().find(s => s.track?.kind === 'audio');
              if (sender) {
                sender.replaceTrack(null);
                console.log('🔇 [STUDENT-FORCE] Audio track removido de estudiante', viewerId);
              }
            }
          });
        } else {
          console.warn('⚠️ [STUDENT-FORCE] myStreamRef.current es null, no se puede detener audio');
        }

        // Actualizar estado visual
        setIsMuted(true);
        isMutedRef.current = true; // ✅ Actualizar ref inmediatamente
        console.log('🔇 [STUDENT-FORCE] Estado cambiado a isMuted: true');
        showToastMessage('El docente ha silenciado tu micrófono', 'warning');
      } else {
        console.log('🔇 [STUDENT] Micrófono ya estaba silenciado');
      }
    });

    socket.on('unmute-student', () => {
      console.log('🎤 [STUDENT] Docente permite activar el micrófono');
      setIsForceMuted(false); // Desbloquear micrófono
      showToastMessage('Ahora puedes activar tu micrófono', 'success');
    });

    // ✅ SCREEN SHARE BLOCK: Docente bloquea compartir pantalla
    socket.on('screen-share-blocked', () => {
      console.log('🚫 [STUDENT] Docente ha bloqueado compartir pantalla');
      setIsScreenShareBlocked(true);
      // Si estaba compartiendo pantalla, detenerla
      if (isScreenSharing) {
        stopScreenShare();
      }
      showToastMessage('El docente ha bloqueado compartir pantalla', 'warning');
    });

    socket.on('screen-share-unblocked', () => {
      console.log('✅ [STUDENT] Docente permite compartir pantalla');
      setIsScreenShareBlocked(false);
      showToastMessage('Ahora puedes compartir pantalla', 'success');
    });

    // ✅ BIDIRECTIONAL VIDEO: Recibir answer del profesor cuando compartimos cámara
    socket.on('student-answer', async ({ answer }) => {
      if (studentPeerConnectionRef.current && answer) {
        await studentPeerConnectionRef.current.setRemoteDescription(new RTCSessionDescription(answer));
        console.log('✅ Answer del profesor recibido para cámara del estudiante');
      }
    });

    // ✅ BIDIRECTIONAL VIDEO: ICE candidates para cámara del estudiante
    socket.on('student-ice-candidate', async ({ candidate }) => {
      if (studentPeerConnectionRef.current && candidate) {
        await studentPeerConnectionRef.current.addIceCandidate(new RTCIceCandidate(candidate));
      }
    });

    // ✅ STUDENT P2P: Recibir offer de otro estudiante
    socket.on('peer-student-offer', async ({ fromViewerId, offer, viewerInfo }) => {
      console.log(`📥 [STUDENT-P2P-OFFER] Offer recibido de estudiante ${fromViewerId}:`, viewerInfo?.name);
      console.log(`📥 [STUDENT-P2P-OFFER] Offer SDP contains ${(offer.sdp.match(/m=video/g) || []).length} video, ${(offer.sdp.match(/m=audio/g) || []).length} audio`);

      try {
        let pc = peerStudentsRef.current.get(fromViewerId);

        // Si ya existe una conexión, es una renegociación
        if (pc) {
          console.log(`🔄 [STUDENT-P2P] Renegociando conexión existente con ${fromViewerId}, estado: ${pc.signalingState}`);

          // ✅ POLITE/IMPOLITE PATTERN para resolver GLARE
          const myId = socketRef.current?.id || '';
          const isPolite = myId < fromViewerId;
          console.log(`🤝 [STUDENT-P2P-GLARE] Negociación: isPolite=${isPolite} (myId: ${myId}, peerId: ${fromViewerId})`);

          // ✅ CRITICAL: Manejar GLARE (ofertas simultáneas)
          if (pc.signalingState === 'have-local-offer') {
            console.warn(`🔄 [STUDENT-P2P-GLARE] GLARE detectado! Ambos enviamos offers. isPolite=${isPolite}`);

            if (!isPolite) {
              // Soy IMPOLITE: ignoro la offer entrante y espero mi answer
              console.log(`🛑 [STUDENT-P2P-GLARE] Soy IMPOLITE, ignorando offer de ${fromViewerId}`);
              return;
            } else {
              // Soy POLITE: hago rollback de mi offer y acepto la entrante
              console.log(`🔄 [STUDENT-P2P-GLARE] Soy POLITE, haciendo rollback de mi offer`);
              await pc.setLocalDescription({ type: 'rollback' });
            }
          } else if (pc.signalingState !== 'stable' && pc.signalingState !== 'have-remote-offer') {
            console.warn(`⚠️ [STUDENT-P2P] Conexión en estado ${pc.signalingState}, ignorando offer`);
            return;
          }

          // Procesar offer de renegociación (IGUAL QUE DOCENTE - simplificado)
          await pc.setRemoteDescription(new RTCSessionDescription(offer));

          // ✅ CRITICAL: Verificar nuevamente el estado después de setRemoteDescription
          if (pc.signalingState !== 'have-remote-offer') {
            console.warn(`⚠️ [STUDENT-P2P] Estado incorrecto después de setRemoteDescription: ${pc.signalingState}`);
            return;
          }

          const answer = await pc.createAnswer();

          // ✅ iOS FIX: Forzar H.264 codec
          answer.sdp = forceH264Codec(answer.sdp);

          await pc.setLocalDescription(answer);

          // Enviar answer
          socketRef.current.emit('peer-student-answer', {
            toViewerId: fromViewerId,
            answer
          });

          console.log(`✅ [STUDENT-P2P] Answer de renegociación enviado a ${fromViewerId}`);
          return;
        }

        // NO existe conexión - crear nueva
        console.log(`🆕 [STUDENT-P2P] Creando nueva peer connection para ${fromViewerId}`);
        pc = new RTCPeerConnection({
          iceServers: [
            { urls: 'stun:stun.l.google.com:19302' },
            { urls: 'stun:stun1.l.google.com:19302' },
            { urls: 'stun:stun2.l.google.com:19302' }
          ],
          iceCandidatePoolSize: 10
        });

        // ✅ Si tengo mi propio stream, agregarlo a la conexión P2P
        if (myStreamRef.current) {
          const myTracks = myStreamRef.current.getTracks();
          console.log(`➕ [STUDENT-P2P-OFFER] Agregando mis ${myTracks.length} tracks a la conexión con ${fromViewerId}`);
          myTracks.forEach(track => {
            pc.addTrack(track, myStreamRef.current);
            console.log(`➕ [STUDENT-P2P-OFFER] Mi track agregado: ${track.kind}, enabled: ${track.enabled}, readyState: ${track.readyState}`);
          });
        } else {
          console.log(`ℹ️ [STUDENT-P2P-OFFER] No tengo stream propio para agregar a la conexión`);
        }

        // Manejar stream remoto
        pc.ontrack = (event) => {
          console.log(`📺 [STUDENT-P2P-DUAL] Stream recibido de ${fromViewerId}:`, event.streams[0]);

          if (event.streams[0]) {
            const stream = event.streams[0];
            const videoTracks = stream.getVideoTracks();
            const audioTracks = stream.getAudioTracks();

            console.log(`📺 [STUDENT-P2P-DUAL] Stream de estudiante ${fromViewerId}: ${videoTracks.length} video tracks, ${audioTracks.length} audio tracks`);

            // ✅ FIX AUDIO: Log audio tracks para debugging
            audioTracks.forEach((track, idx) => {
              console.log(`🎵 [STUDENT-P2P-DUAL] Audio track ${idx} de ${fromViewerId}:`, {
                id: track.id,
                label: track.label,
                enabled: track.enabled,
                muted: track.muted,
                readyState: track.readyState
              });
            });

            // ✅ DUAL STREAM: Detectar si es transmisión dual (cámara + pantalla)
            if (videoTracks.length >= 2) {
              console.log('🎥 [STUDENT-P2P-DUAL] Transmisión dual detectada');

              // Separar tracks: primer track = cámara, segundo = pantalla
              const cameraTrack = videoTracks[0];
              const screenTrack = videoTracks[1];

              // Crear stream de cámara con audio
              const cameraStream = new MediaStream();
              cameraStream.addTrack(cameraTrack);
              audioTracks.forEach(track => cameraStream.addTrack(track));

              // Crear stream de pantalla
              const screenStream = new MediaStream();
              screenStream.addTrack(screenTrack);

              // Guardar stream de cámara como principal
              setPeerStudentStreams(prev => ({
                ...prev,
                [fromViewerId]: cameraStream
              }));

              // Guardar stream de pantalla separado
              setPeerStudentScreenStreams(prev => ({
                ...prev,
                [fromViewerId]: screenStream
              }));

              console.log('✅ [STUDENT-P2P-DUAL] Streams separados para estudiante', fromViewerId);
              console.log('📹 [STUDENT-P2P-DUAL] Camera stream active:', cameraStream.active, 'tracks:', cameraStream.getTracks().map(t => `${t.kind}:${t.readyState}`));
              console.log('📺 [STUDENT-P2P-DUAL] Screen stream active:', screenStream.active, 'tracks:', screenStream.getTracks().map(t => `${t.kind}:${t.readyState}`));
            } else {
              // ✅ CRITICAL FIX: Solo 1 video track - verificar si es pantalla o cámara
              const isScreenSharing = peerStudentScreenSharingStatesRef.current[fromViewerId] === true;

              if (isScreenSharing) {
                // Es pantalla compartida SIN cámara
                console.log(`📺 [STUDENT-P2P] Stream de PANTALLA detectado para ${fromViewerId}`);
                setPeerStudentScreenStreams(prev => ({
                  ...prev,
                  [fromViewerId]: stream
                }));

                // Limpiar stream de cámara si existe
                setPeerStudentStreams(prev => {
                  const newStreams = { ...prev };
                  delete newStreams[fromViewerId];
                  return newStreams;
                });
              } else {
                // Es cámara SIN pantalla compartida
                console.log(`📹 [STUDENT-P2P] Stream de CÁMARA detectado para ${fromViewerId}`);
                setPeerStudentStreams(prev => ({
                  ...prev,
                  [fromViewerId]: stream
                }));

                // Limpiar stream de pantalla si existe
                setPeerStudentScreenStreams(prev => {
                  const newStreams = { ...prev };
                  delete newStreams[fromViewerId];
                  return newStreams;
                });
              }

              console.log(`✅ [STUDENT-P2P] Stream único guardado para ${fromViewerId} como ${isScreenSharing ? 'PANTALLA' : 'CÁMARA'}`);
            }
          }
        };

        // Manejar ICE candidates
        pc.onicecandidate = (event) => {
          if (event.candidate) {
            socketRef.current.emit('peer-student-ice-candidate', {
              toViewerId: fromViewerId,
              candidate: event.candidate
            });
          }
        };

        // ✅ FIX ANTI-FREEZE: Manejar estados de conexión ICE
        pc.oniceconnectionstatechange = () => {
          console.log(`🔌 [STUDENT-P2P-ICE-RECV] Estado ICE con ${fromViewerId}: ${pc.iceConnectionState}`);

          if (pc.iceConnectionState === 'failed' || pc.iceConnectionState === 'disconnected') {
            console.warn(`⚠️ [STUDENT-P2P-ICE-RECV] Conexión ${pc.iceConnectionState} con ${fromViewerId}`);

            // Solo limpiar streams de UI para evitar freeze visual
            if (pc.iceConnectionState === 'failed') {
              console.log(`🧹 [STUDENT-P2P-ICE-RECV] Limpiando streams de ${fromViewerId} por fallo de conexión`);
              setPeerStudentStreams(prev => {
                const newStreams = { ...prev };
                delete newStreams[fromViewerId];
                return newStreams;
              });
              setPeerStudentScreenStreams(prev => {
                const newStreams = { ...prev };
                delete newStreams[fromViewerId];
                return newStreams;
              });
            }
          } else if (pc.iceConnectionState === 'connected' || pc.iceConnectionState === 'completed') {
            console.log(`✅ [STUDENT-P2P-ICE-RECV] Conexión establecida con ${fromViewerId}`);
          }
        };

        // ✅ FIX: Manejar estado de conexión general
        pc.onconnectionstatechange = () => {
          console.log(`🔗 [STUDENT-P2P-CONN-RECV] Estado de conexión con ${fromViewerId}: ${pc.connectionState}`);
        };

        // Guardar peer connection
        peerStudentsRef.current.set(fromViewerId, pc);

        // Procesar offer y crear answer
        await pc.setRemoteDescription(new RTCSessionDescription(offer));
        const answer = await pc.createAnswer();

        // ✅ iOS FIX: Forzar H.264 codec
        answer.sdp = forceH264Codec(answer.sdp);

        await pc.setLocalDescription(answer);

        // Enviar answer
        socketRef.current.emit('peer-student-answer', {
          toViewerId: fromViewerId,
          answer
        });

        console.log(`✅ [STUDENT-P2P] Answer enviado a estudiante ${fromViewerId}`);
      } catch (error) {
        console.error(`❌ [STUDENT-P2P] Error procesando offer de ${fromViewerId}:`, error);
      }
    });

    // ✅ STUDENT P2P: Recibir answer de otro estudiante
    socket.on('peer-student-answer', async ({ fromViewerId, answer }) => {
      console.log(`📥 [STUDENT-P2P] Answer recibido de estudiante ${fromViewerId}`);
      const pc = peerStudentsRef.current.get(fromViewerId);
      if (pc && answer) {
        try {
          // Verificar que el peer connection esté en el estado correcto para recibir un answer
          if (pc.signalingState === 'have-local-offer') {
            await pc.setRemoteDescription(new RTCSessionDescription(answer));
            console.log(`✅ [STUDENT-P2P] Answer procesado de ${fromViewerId}`);
          } else {
            console.log(`ℹ️ [STUDENT-P2P] Ignorando answer de ${fromViewerId} - estado actual: ${pc.signalingState}`);
          }
        } catch (error) {
          console.error(`❌ [STUDENT-P2P] Error procesando answer de ${fromViewerId}:`, error);
        }
      }
    });

    // ✅ STUDENT P2P: Recibir ICE candidates de otros estudiantes
    socket.on('peer-student-ice-candidate', async ({ fromViewerId, candidate }) => {
      console.log(`🧊 [STUDENT-P2P] ICE candidate recibido de estudiante ${fromViewerId}`);
      const pc = peerStudentsRef.current.get(fromViewerId);
      if (pc && candidate) {
        try {
          await pc.addIceCandidate(new RTCIceCandidate(candidate));
          console.log(`✅ [STUDENT-P2P] ICE candidate agregado de ${fromViewerId}`);
        } catch (error) {
          console.error(`❌ [STUDENT-P2P] Error agregando ICE candidate de ${fromViewerId}:`, error);
        }
      }
    });

    // ✅ SCREEN SHARE AUTHORIZATION: Listen for approval/denial
    socket.on('screen-share-approved', () => {
      console.log('✅ [STUDENT] Screen share approved by teacher');
      setScreenSharePending(false);
      startScreenShare();
    });

    socket.on('screen-share-denied', () => {
      console.log('❌ [STUDENT] Screen share denied by teacher');
      setScreenSharePending(false);
      showToastMessage('El docente denegó el permiso para compartir pantalla', 'warning');
    });

    // ✅ TEACHER CAMERA STATUS: Listen for camera on/off
    socket.on('teacher-camera-status', ({ cameraEnabled }) => {
      console.log(`📹 [STUDENT] Teacher camera ${cameraEnabled ? 'enabled' : 'disabled'}`);
      setIsTeacherCameraOn(cameraEnabled);

      // ✅ FIX: Refrescar videoRef solo si NO hay screen sharing activo
      // Si hay screen sharing, el video principal muestra la pantalla, no la cámara
      if (cameraEnabled && !isTeacherScreenSharing) {
        setTimeout(() => {
          if (videoRef.current && videoRef.current.srcObject) {
            console.log('📹 [STUDENT] Refrescando videoRef del docente para evitar imagen congelada');
            const currentStream = videoRef.current.srcObject;

            // Forzar re-renderizado del video element
            videoRef.current.srcObject = null;
            videoRef.current.load();

            setTimeout(() => {
              if (videoRef.current) {
                videoRef.current.srcObject = currentStream;
                videoRef.current.play().catch(err => console.log('Autoplay prevented:', err));
              }
            }, 100);
          }
        }, 100);
      }

      // ✅ FIX: Refrescar PIP de cámara durante screen sharing
      if (cameraEnabled && isTeacherScreenSharing) {
        setTimeout(() => {
          if (teacherCameraPipRef.current && teacherCameraPipRef.current.srcObject) {
            console.log('📹 [STUDENT] Refrescando PIP de cámara del docente durante screen sharing');
            const currentStream = teacherCameraPipRef.current.srcObject;

            // Forzar re-renderizado del video element
            teacherCameraPipRef.current.srcObject = null;
            teacherCameraPipRef.current.load();

            setTimeout(() => {
              if (teacherCameraPipRef.current) {
                teacherCameraPipRef.current.srcObject = currentStream;
                teacherCameraPipRef.current.play().catch(err => console.log('Autoplay prevented:', err));
              }
            }, 100);
          }
        }, 100);
      }

      showToastMessage(
        cameraEnabled ? 'El docente activó su cámara' : 'El docente desactivó su cámara',
        'info'
      );
    });

    // ✅ CRITICAL FIX: Listen for stream refresh when teacher re-enables camera
    socket.on('teacher-stream-refresh', () => {
      console.log('🔄 [STUDENT] Teacher stream refresh requested');

      // Simply update the state - the video element already has the stream
      // We just need to make sure it's visible
      setIsTeacherCameraOn(true);

      console.log('✅ [STUDENT] Camera state updated to visible');
    });

    // ✅ Listener para cuando el docente comparte/deja de compartir pantalla
    socket.on('teacher-screen-share-status', ({ isSharing }) => {
      console.log(`📺 [STUDENT] Teacher screen share status changed: ${isSharing}`);
      setIsTeacherScreenSharing(isSharing);

      // ✅ FIX CRÍTICO: Limpiar stream de pantalla cuando el docente deja de compartir
      if (!isSharing) {
        console.log(`🗑️ [STUDENT] Limpiando stream de pantalla compartida del docente`);

        // Detener tracks del stream anterior
        setTeacherScreenStream(prev => {
          if (prev) {
            console.log(`🛑 [STUDENT] Deteniendo tracks de pantalla compartida del docente`);
            prev.getTracks().forEach(track => {
              track.stop();
              console.log(`🛑 [STUDENT] Track detenido: ${track.kind} - ${track.label}`);
            });
          }
          return null; // Limpiar el estado
        });

        console.log(`✅ [STUDENT] Stream de pantalla compartida limpiado, volviendo a mostrar cámara`);
      }

      // NO hacemos auto-pin - dejamos que el usuario controle qué ve en principal
    });

    // ✅ DUAL STREAM: Listen for when ANY participant (teacher or student) starts/stops screen sharing
    socket.on('screen-sharer-changed', ({ sharerId, sharerName, isSharing }) => {
      console.log(`📺 [STUDENT-DUAL] Screen sharer changed:`, { sharerId, sharerName, isSharing });

      if (isSharing) {
        // Someone started sharing screen
        if (sharerId === socket.id) {
          // I'm the one sharing - already handled in startScreenShare
          console.log('ℹ️ [STUDENT-DUAL] I am the one sharing screen');
        } else {
          // Another participant is sharing screen
          console.log(`📌 [STUDENT-DUAL] Auto-pinning participant ${sharerId} (${sharerName}) who is sharing screen`);

          // Check if it's the teacher or another student
          if (sharerName === 'Docente') {
            // Teacher is sharing - pin teacher's screen
            setPinnedParticipant('teacher-screen');
            console.log('📌 [STUDENT-DUAL] Pinned teacher screen to main panel');
          } else {
            // Another student is sharing - pin that student
            setPinnedParticipant(sharerId);
            console.log(`📌 [STUDENT-DUAL] Pinned student ${sharerId} to main panel`);
          }
        }
      } else {
        // Someone stopped sharing screen
        if (sharerId === socket.id) {
          // I stopped sharing - already handled in stopScreenShare
          console.log('ℹ️ [STUDENT-DUAL] I stopped sharing screen');
        } else {
          // Another participant stopped sharing
          console.log(`📌 [STUDENT-DUAL] Unpinning participant ${sharerId} who stopped sharing`);

          // Only unpin if the participant who stopped was the one pinned
          if (pinnedParticipant === sharerId || pinnedParticipant === 'teacher-screen') {
            setPinnedParticipant(null);
            console.log('📌 [STUDENT-DUAL] Unpinned - returning to teacher in main panel');
          }
        }
      }
    });

    // ✅ CAMERA STATUS: Listen for peer student camera on/off
    socket.on('peer-student-camera-status', ({ viewerId, cameraEnabled }) => {
      console.log(`📹 [STUDENT-P2P-CAMERA] Peer ${viewerId} camera: ${cameraEnabled ? 'ON' : 'OFF'}`);

      // ✅ IGUAL QUE EL DOCENTE: Solo actualizar estado, NO limpiar stream
      // El stream WebRTC sigue activo, el overlay se encarga de mostrar "Cámara apagada"
      setPeerStudentCameraStates(prev => ({
        ...prev,
        [viewerId]: cameraEnabled
      }));

      // ✅ FIX: Refrescar video cuando peer reactiva la cámara para evitar imagen congelada
      if (cameraEnabled) {
        // Esperar un poco para que el track se habilite completamente
        setTimeout(() => {
          const videoEl = peerVideoRefs.current[`${viewerId}-camera`];
          if (videoEl && videoEl.srcObject) {
            console.log(`📹 [STUDENT-P2P-CAMERA] Refrescando video de peer ${viewerId} para evitar imagen congelada`);
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

    // ✅ SCREEN SHARE STATUS: Listen for peer student screen sharing on/off
    socket.on('peer-student-screen-share-status', async ({ viewerId, viewerInfo, isSharing }) => {
      console.log(`📺 [STUDENT-P2P-SCREEN] Peer ${viewerId} (${viewerInfo?.name}) screen sharing: ${isSharing ? 'ON' : 'OFF'}`);

      // ✅ CRITICAL FIX: Actualizar estado de screen sharing del peer
      setPeerStudentScreenSharingStates(prev => ({
        ...prev,
        [viewerId]: isSharing
      }));

      if (isSharing) {
        // Un estudiante empezó a compartir pantalla - crear conexión P2P si no existe
        if (!peerStudentsRef.current.has(viewerId)) {
          console.log(`🆕 [STUDENT-P2P-SCREEN] Creando peer connection para ${viewerInfo?.name} que está compartiendo pantalla`);

          try {
            const pc = new RTCPeerConnection({
              iceServers: [{ urls: 'stun:stun.l.google.com:19302' }]
            });

            // Si tengo mi propio stream, agregarlo
            if (myStreamRef.current) {
              myStreamRef.current.getTracks().forEach(track => {
                pc.addTrack(track, myStreamRef.current);
                console.log(`➕ [STUDENT-P2P-SCREEN] Mi track agregado (${track.kind}) para responder a ${viewerId}`);
              });
            }

            // Manejar stream remoto con soporte dual
            pc.ontrack = (event) => {
              console.log(`📺 [STUDENT-P2P-DUAL-SCREEN] Stream recibido de ${viewerId}:`, event.streams[0]);

              if (event.streams[0]) {
                const stream = event.streams[0];
                const videoTracks = stream.getVideoTracks();
                const audioTracks = stream.getAudioTracks();

                console.log(`📺 [STUDENT-P2P-DUAL-SCREEN] ${videoTracks.length} video, ${audioTracks.length} audio tracks`);

                if (videoTracks.length >= 2) {
                  // Transmisión dual
                  const cameraStream = new MediaStream();
                  cameraStream.addTrack(videoTracks[0]);
                  audioTracks.forEach(track => cameraStream.addTrack(track));

                  const screenStream = new MediaStream();
                  screenStream.addTrack(videoTracks[1]);

                  setPeerStudentStreams(prev => ({
                    ...prev,
                    [viewerId]: cameraStream
                  }));

                  setPeerStudentScreenStreams(prev => ({
                    ...prev,
                    [viewerId]: screenStream
                  }));

                  console.log(`✅ [STUDENT-P2P-DUAL-SCREEN] Dual stream guardado para ${viewerId}`);
                } else if (videoTracks.length === 1) {
                  // ✅ CRITICAL FIX: Stream único - verificar si es pantalla o cámara
                  const isScreenSharing = peerStudentScreenSharingStatesRef.current[viewerId] === true;

                  if (isScreenSharing) {
                    // Es pantalla compartida SIN cámara
                    console.log(`📺 [STUDENT-P2P-SCREEN] Stream de PANTALLA detectado para ${viewerId}`);
                    setPeerStudentScreenStreams(prev => ({
                      ...prev,
                      [viewerId]: stream
                    }));

                    // Limpiar stream de cámara si existe
                    setPeerStudentStreams(prev => {
                      const newStreams = { ...prev };
                      delete newStreams[viewerId];
                      return newStreams;
                    });
                  } else {
                    // Es cámara SIN pantalla compartida
                    console.log(`📹 [STUDENT-P2P-SCREEN] Stream de CÁMARA detectado para ${viewerId}`);
                    setPeerStudentStreams(prev => ({
                      ...prev,
                      [viewerId]: stream
                    }));

                    // Limpiar stream de pantalla si existe
                    setPeerStudentScreenStreams(prev => {
                      const newStreams = { ...prev };
                      delete newStreams[viewerId];
                      return newStreams;
                    });
                  }

                  console.log(`✅ [STUDENT-P2P-SCREEN] Stream único guardado para ${viewerId} como ${isScreenSharing ? 'PANTALLA' : 'CÁMARA'}`);
                }
              }
            };

            // Manejar ICE candidates
            pc.onicecandidate = (event) => {
              if (event.candidate) {
                socketRef.current.emit('peer-student-ice-candidate', {
                  toViewerId: viewerId,
                  candidate: event.candidate
                });
              }
            };

            // Guardar peer connection
            peerStudentsRef.current.set(viewerId, pc);

            console.log(`✅ [STUDENT-P2P-SCREEN] Peer connection creado para ${viewerId}, esperando offer...`);
          } catch (error) {
            console.error(`❌ [STUDENT-P2P-SCREEN] Error creando conexión con ${viewerId}:`, error);
          }
        } else {
          console.log(`ℹ️ [STUDENT-P2P-SCREEN] Ya existe conexión P2P con ${viewerId}`);
        }
      } else {
        // Un estudiante dejó de compartir pantalla
        console.log(`ℹ️ [STUDENT-P2P-SCREEN] Peer ${viewerId} dejó de compartir pantalla`);

        // Limpiar stream de pantalla pero mantener stream de cámara si existe
        setPeerStudentScreenStreams(prev => {
          const newStreams = { ...prev };
          delete newStreams[viewerId];
          return newStreams;
        });
      }
    });

    // Listeners para whiteboard (recibir dibujos del docente y otros estudiantes)
    socket.on('whiteboard-start', ({ x, y, color, width, tool }) => {
      console.log('🎨 [STUDENT] Recibiendo whiteboard-start:', { x, y, color, width, tool });

      // ✅ CRITICAL FIX: Usar setTimeout para dar tiempo a que React renderice el canvas
      setTimeout(() => {
        if (!canvasRef.current) {
          console.warn('⚠️ [STUDENT] Canvas no disponible para dibujo remoto');
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
        console.log('✅ [STUDENT] Canvas configurado para dibujo remoto');
      }, 0);
    });

    socket.on('whiteboard-draw', ({ x, y }) => {
      if (!canvasRef.current || !remoteDrawingRef.current.isDrawing) {
        console.log('⚠️ [STUDENT] whiteboard-draw ignorado - canvas no listo o no está dibujando');
        return;
      }
      const ctx = remoteDrawingRef.current.ctx;
      ctx.lineTo(x, y);
      ctx.stroke();
      console.log('✏️ [STUDENT] Dibujando punto remoto:', x, y);
    });

    socket.on('whiteboard-stop', () => {
      if (!canvasRef.current || !remoteDrawingRef.current.isDrawing) {
        console.log('⚠️ [STUDENT] whiteboard-stop ignorado - no hay dibujo activo');
        return;
      }
      const ctx = remoteDrawingRef.current.ctx;
      ctx.closePath();
      ctx.globalCompositeOperation = 'source-over';
      remoteDrawingRef.current.isDrawing = false;
      remoteDrawingRef.current.ctx = null;
      console.log('🎨 [STUDENT] Dibujo remoto finalizado');
    });

    socket.on('whiteboard-clear', () => {
      if (!canvasRef.current) return;
      const canvas = canvasRef.current;
      const ctx = canvas.getContext('2d');
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      console.log('🗑️ [STUDENT] Pizarra limpiada remotamente');
    });

    return () => {
      if (keepAliveIntervalRef.current) {
        clearInterval(keepAliveIntervalRef.current);
      }
      // ✅ FIX: Limpiar interval de verificación de estado
      if (liveStatusCheckIntervalRef.current) {
        clearInterval(liveStatusCheckIntervalRef.current);
      }
      if (isJoined) {
        socket.emit('leave-viewer', { courseId: course.id });
      }
      socket.disconnect();
      if (peerConnectionRef.current) {
        peerConnectionRef.current.close();
      }
      if (studentPeerConnectionRef.current) {
        studentPeerConnectionRef.current.close();
      }
    };
  }, []);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // ✅ Cleanup de myStream cuando el componente se desmonte
  useEffect(() => {
    return () => {
      if (myStream) {
        console.log('🧹 [STUDENT] Limpiando stream al desmontar');
        myStream.getTracks().forEach(track => track.stop());
      }
    };
  }, [myStream]);

  // CRITICAL FIX: Efecto para asignar el stream cuando el videoRef esté listo
  // Este efecto se ejecuta cuando hasStream cambia a true, permitiendo que React renderice el elemento de video
  useEffect(() => {
    if (hasStream && (teacherStreamRef.current || teacherScreenStream)) {
      console.log('🔄 [STUDENT] hasStream es true, intentando asignar stream al videoRef');

      // Esperar un tick para que React renderice el elemento de video
      const assignStream = async () => {
        // Intentar varias veces con pequeños delays para manejar el timing de React
        for (let attempt = 0; attempt < 10; attempt++) {
          if (videoRef.current) {
            // ✅ FIX CRÍTICO: Priorizar pantalla compartida si existe, sino mostrar cámara
            const streamToShow = teacherScreenStream || teacherStreamRef.current;

            // ✅ FIX: Siempre actualizar si teacherScreenStream cambió
            const needsUpdate = videoRef.current.srcObject !== streamToShow;

            if (!needsUpdate && videoRef.current.srcObject) {
              console.log('✅ [STUDENT] videoRef ya tiene el srcObject correcto asignado');
              return; // Ya tiene el stream correcto
            }

            console.log(`✅ [STUDENT] videoRef disponible en intento ${attempt + 1}, asignando ${teacherScreenStream ? 'PANTALLA COMPARTIDA' : 'CÁMARA'}`);
            videoRef.current.srcObject = streamToShow;

            // Configurar atributos
            videoRef.current.setAttribute('playsinline', 'true');
            videoRef.current.setAttribute('autoplay', 'true');
            videoRef.current.muted = false;

            // Intentar reproducir
            try {
              await videoRef.current.play();
              console.log('✅ [STUDENT] Video reproduciéndose correctamente (asignación retrasada)');
              setNeedsUserInteraction(false);
              return; // Éxito, salir del loop
            } catch (err) {
              console.error('❌ [STUDENT] Error al reproducir video (asignación retrasada):', err);
              setNeedsUserInteraction(true);
              showToastMessage('Haz clic en el botón "Reproducir" para ver la transmisión.', 'info');
              return; // Error de reproducción, salir del loop
            }
          }

          // videoRef aún no disponible, esperar 50ms antes del siguiente intento
          await new Promise(resolve => setTimeout(resolve, 50));
        }

        console.error('❌ [STUDENT] videoRef no se hizo disponible después de 10 intentos');
      };

      assignStream();
    }
  }, [hasStream, teacherScreenStream]); // ✅ FIX: Agregar teacherScreenStream como dependencia

  const showToastMessage = (message, type = 'success') => {
    setToastMessage(message);
    setToastType(type);
    setShowToast(true);
  };

  // Función para intercambiar video con doble clic
  const handleSwapVideo = (participantId) => {
    console.log('🔄 [STUDENT] Intercambiando video con participante:', participantId);
    console.log('🔄 [STUDENT] pinnedParticipant actual:', pinnedParticipant);

    if (pinnedParticipant === participantId) {
      // Si ya está pinneado, volver al docente
      console.log('🔄 [STUDENT] Despinneando:', participantId);
      setPinnedParticipant(null);
      if (isTeacherScreenSharing) {
        showToastMessage('Cámara del docente en principal', 'info');
      } else {
        showToastMessage('Video del docente en principal', 'info');
      }
    } else {
      // Pinnear el participante
      console.log('🔄 [STUDENT] Pinneando:', participantId);
      setPinnedParticipant(participantId);
      if (participantId === 'me') {
        showToastMessage('Tu video en principal', 'info');
      } else if (participantId === 'teacher-camera') {
        showToastMessage('Cámara del docente en principal', 'info');
      } else if (participantId === 'teacher-screen') {
        showToastMessage('Pantalla compartida del docente en principal', 'info');
      } else if (participantId === 'teacher') {
        showToastMessage('Tu video en principal, docente en panel', 'info');
      } else {
        showToastMessage('Video intercambiado', 'info');
      }
    }

    console.log('🔄 [STUDENT] Nuevo pinnedParticipant será:', participantId === pinnedParticipant ? null : participantId);
  };

  // Funciones de pizarra
  const startDrawing = (e) => {
    if (!showWhiteboard) return;

    // ✅ iOS FIX: NO prevenir default en eventos touch para permitir scroll
    // Solo prevenir en eventos mouse
    if (e.type === 'mousedown') {
      e.preventDefault();
    }
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
    console.log('🎨 [STUDENT] Emitiendo whiteboard-start:', { x, y, color: drawColor, width: drawWidth, tool: drawTool });
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

    // ✅ iOS FIX: NO prevenir default en eventos touch para permitir scroll
    // Solo prevenir en eventos mouse
    if (e.type === 'mousemove') {
      e.preventDefault();
    }
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
      console.log('🎨 [STUDENT] Emitiendo whiteboard-stop');
      socketRef.current.emit('whiteboard-stop', {
        courseId: course.id
      });
    }
    setIsDrawing(false);
  };

  // Función para descargar la pizarra
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

      // Si hay video disponible, capturar el frame actual
      if (video && video.srcObject && hasStream) {
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
      console.log('💾 [STUDENT] Pizarra descargada');
    } catch (error) {
      console.error('❌ Error al descargar pizarra:', error);
      showToastMessage('Error al descargar la pizarra', 'error');
    }
  };

  // Función para limpiar la pizarra
  const clearWhiteboard = () => {
    if (!canvasRef.current) {
      showToastMessage('No hay pizarra disponible', 'warning');
      return;
    }

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Emitir evento para limpiar en todos los clientes
    if (socketRef.current) {
      socketRef.current.emit('whiteboard-clear', {
        courseId: course.id
      });
    }

    showToastMessage('Pizarra limpiada', 'info');
    console.log('🗑️ [STUDENT] Pizarra limpiada');
  };

  const handleOffer = async (offer) => {
    try {
      // ✅ CRITICAL FIX: Reutilizar peerConnection existente si ya hay uno
      // Solo crear uno nuevo si no existe
      let pc = peerConnectionRef.current;

      if (!pc) {
        console.log('🆕 [STUDENT] Creando nuevo peerConnection');
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

        peerConnectionRef.current = pc;

        // ✅ FIX: Guardar IDs de tracks procesados para detectar cambios REALES
        let lastProcessedTrackIds = new Set();
        let processTimeout = null;

        pc.ontrack = (event) => {
          console.log('📺 [STUDENT-DUAL] Track recibido del docente');
          console.log('📺 [STUDENT-DUAL] Track kind:', event.track.kind);
          console.log('📺 [STUDENT-DUAL] Track label:', event.track.label);
          console.log('📺 [STUDENT-DUAL] Track ID:', event.track.id);

          if (event.streams[0]) {
            const stream = event.streams[0];

            // ✅ FIX: Cancelar timeout anterior si existe
            if (processTimeout) {
              clearTimeout(processTimeout);
            }

            // Usar setTimeout para asegurar que todos los tracks han llegado
            processTimeout = setTimeout(() => {
              // ✅ CRITICAL FIX: Contar SOLO tracks activos (readyState === 'live')
              // Los tracks ended pueden quedar en el stream después de renegociaciones
              const allVideoTracks = stream.getVideoTracks();
              const liveVideoTracks = allVideoTracks.filter(t => t.readyState === 'live');
              const currentTrackIds = new Set(liveVideoTracks.map(t => t.id));

              console.log(`🔍 [STUDENT-DUAL] Tracks de video: ${allVideoTracks.length} total, ${liveVideoTracks.length} live`);
              console.log(`🔍 [STUDENT-DUAL] Track IDs actuales:`, Array.from(currentTrackIds));
              console.log(`🔍 [STUDENT-DUAL] Track IDs previamente procesados:`, Array.from(lastProcessedTrackIds));

              // ✅ CRITICAL FIX: Comparar los IDs de los tracks, NO solo la cantidad
              // Verificar si los tracks son EXACTAMENTE los mismos comparando sus IDs
              const sameTrackIds = currentTrackIds.size === lastProcessedTrackIds.size &&
                                   [...currentTrackIds].every(id => lastProcessedTrackIds.has(id));

              if (sameTrackIds && lastProcessedTrackIds.size > 0) {
                console.log(`⏭️ [STUDENT-DUAL] Ya procesados estos ${currentTrackIds.size} tracks (mismos IDs), skipping...`);
                return;
              }

              console.log(`🔄 [STUDENT-DUAL] Procesando cambio de tracks: ${lastProcessedTrackIds.size} IDs -> ${currentTrackIds.size} IDs (diferentes tracks)`);
              lastProcessedTrackIds = currentTrackIds;

              // ✅ CRITICAL FIX: Usar SOLO tracks activos, no todos
              const videoTracks = liveVideoTracks;
              const audioTracks = stream.getAudioTracks().filter(t => t.readyState === 'live');

              console.log(`📺 [STUDENT-DUAL] Total tracks: ${stream.getTracks().length}`);
              console.log(`📺 [STUDENT-DUAL] Video tracks: ${videoTracks.length}, Audio tracks: ${audioTracks.length}`);
              console.log(`📺 [STUDENT-DUAL] Todos los tracks:`, stream.getTracks().map(t => `${t.kind}: ${t.label}`));

              // ✅ DUAL STREAM: Separar los tracks de video
              if (videoTracks.length === 2) {
                console.log('✅ [STUDENT-DUAL] Transmisión DUAL detectada (2 video tracks)');
                console.log('🔍 [STUDENT-DUAL] Track 0:', videoTracks[0].label, '| enabled:', videoTracks[0].enabled, '| readyState:', videoTracks[0].readyState, '| id:', videoTracks[0].id);
                console.log('🔍 [STUDENT-DUAL] Track 1:', videoTracks[1].label, '| enabled:', videoTracks[1].enabled, '| readyState:', videoTracks[1].readyState, '| id:', videoTracks[1].id);

                // ✅ FIX CRÍTICO: Identificar tracks por su label, NO por posición
                // El orden puede variar al llegar por WebRTC
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
                  console.log('⚠️ [STUDENT-DUAL] No se pudo identificar tracks por label, usando posición');
                  cameraTrack = videoTracks[0];
                  screenTrack = videoTracks[1];
                }

                console.log('📹 [STUDENT-DUAL] Cámara identificada:', cameraTrack.label, '| enabled:', cameraTrack.enabled, '| id:', cameraTrack.id);
                console.log('📺 [STUDENT-DUAL] Pantalla identificada:', screenTrack.label, '| enabled:', screenTrack.enabled, '| id:', screenTrack.id);

                // Crear streams separados
                const cameraStream = new MediaStream();
                cameraStream.addTrack(cameraTrack);
                audioTracks.forEach(track => cameraStream.addTrack(track));

                const screenStream = new MediaStream();
                screenStream.addTrack(screenTrack);

                // Guardar en refs/states
                teacherStreamRef.current = cameraStream;
                setTeacherScreenStream(screenStream);
                setIsTeacherScreenSharing(true);
                setTeacherStreamVersion(v => v + 1); // ✅ FIX: Forzar re-render para reproducir audio

                console.log('✅ [STUDENT-DUAL] Streams separados exitosamente');
                console.log('📺 [STUDENT-DUAL] El useEffect asignará la pantalla compartida al videoRef automáticamente');

              } else if (videoTracks.length === 1) {
                console.log('📹 [STUDENT-DUAL] Solo 1 video track');

                // Solo hay un video track (cámara o pantalla)
                const videoTrack = videoTracks[0];
                const label = videoTrack.label.toLowerCase();
                console.log('🔍 [STUDENT-DUAL] Label del track:', videoTrack.label, '-> lowercase:', label);
                const isScreen = label.includes('screen') || label.includes('window') || label.includes('monitor') || label.includes('ubuntu') || label.includes('chrome');
                console.log('🔍 [STUDENT-DUAL] isScreen:', isScreen);

                if (isScreen) {
                  console.log('📺 [STUDENT-DUAL] Es pantalla compartida (sin cámara)');
                  // Solo pantalla, sin cámara
                  teacherStreamRef.current = null; // No hay cámara
                  setTeacherScreenStream(stream);
                  setIsTeacherScreenSharing(true);
                } else {
                  console.log('📹 [STUDENT-DUAL] Es cámara (docente dejó de compartir pantalla)');

                  // ✅ FIX: Detener y limpiar stream de pantalla anterior si existe
                  setTeacherScreenStream(prev => {
                    if (prev) {
                      console.log(`🛑 [STUDENT-DUAL] Deteniendo stream de pantalla anterior`);
                      prev.getTracks().forEach(track => {
                        track.stop();
                        console.log(`🛑 [STUDENT-DUAL] Track detenido: ${track.kind} - ${track.label}`);
                      });
                    }
                    return null;
                  });

                  teacherStreamRef.current = stream;
                  setIsTeacherScreenSharing(false);
                  setTeacherStreamVersion(v => v + 1); // ✅ FIX: Forzar re-render para reproducir audio
                }

                console.log('📺 [STUDENT-DUAL] El useEffect asignará el stream al videoRef automáticamente');

              } else {
                console.log('🎤 [STUDENT-DUAL] Solo audio');
                teacherStreamRef.current = stream;
                setTeacherScreenStream(null);
                setIsTeacherScreenSharing(false);
                setTeacherStreamVersion(v => v + 1); // ✅ FIX: Forzar re-render para reproducir audio
                console.log('📺 [STUDENT-DUAL] El useEffect asignará el stream de audio al videoRef automáticamente');
              }

              // Establecer hasStream
              setHasStream(true);
            }, 200); // Esperar 200ms para que lleguen todos los tracks
          }
        };

        pc.onicecandidate = (event) => {
          if (event.candidate) {
            console.log('🧊 [STUDENT] Enviando ICE candidate al docente');
            socketRef.current.emit('ice-candidate', {
              candidate: event.candidate
            });
          } else {
            console.log('🧊 [STUDENT] ICE gathering completado (null candidate)');
          }
        };

        pc.onconnectionstatechange = () => {
          console.log('🔗 Connection state:', pc.connectionState);
          if (pc.connectionState === 'connected') {
            showToastMessage('Conectado a la transmisión', 'success');
          }
          // ✅ REMOVED: No mostrar mensaje de "Conexión perdida" porque es parte del flujo normal
          // cuando el docente activa/desactiva la cámara (se recrean las peer connections)
        };
      } else {
        // ✅ RENEGOTIATION: PeerConnection ya existe, solo renegociar
        console.log('🔄 [STUDENT] Reutilizando peerConnection existente para renegociación');
        console.log(`🔍 [STUDENT] Peer connection state: connectionState=${pc.connectionState}, signalingState=${pc.signalingState}`);

        // ✅ CRITICAL FIX: Verificar signaling state antes de renegociar
        if (pc.signalingState !== 'stable' && pc.signalingState !== 'have-remote-offer') {
          console.warn(`⚠️ [STUDENT] Peer connection no está en estado válido (${pc.signalingState}), esperando...`);

          // Esperar a que esté en estado válido
          await new Promise((resolve) => {
            if (pc.signalingState === 'stable' || pc.signalingState === 'have-remote-offer') {
              resolve();
              return;
            }

            const checkState = () => {
              if (pc.signalingState === 'stable' || pc.signalingState === 'have-remote-offer') {
                pc.removeEventListener('signalingstatechange', checkState);
                resolve();
              }
            };

            pc.addEventListener('signalingstatechange', checkState);

            // Timeout de 3 segundos
            setTimeout(() => {
              pc.removeEventListener('signalingstatechange', checkState);
              console.error(`❌ [STUDENT] Timeout esperando signaling state válido`);
              resolve();
            }, 3000);
          });

          console.log(`✅ [STUDENT] Peer connection ahora en estado: ${pc.signalingState}`);
        }
      }

      console.log(`📥 [STUDENT] Configurando remote description (current state: ${pc.signalingState})...`);
      await pc.setRemoteDescription(new RTCSessionDescription(offer));
      console.log('✅ [STUDENT] Offer del docente configurado como RemoteDescription');

      console.log(`📝 [STUDENT] Creando answer (current state: ${pc.signalingState})...`);
      const answer = await pc.createAnswer();

      // ✅ iOS FIX: Forzar H.264 codec para compatibilidad con Safari iOS
      answer.sdp = forceH264Codec(answer.sdp);

      await pc.setLocalDescription(answer);
      console.log('✅ [STUDENT] Answer creado y configurado como LocalDescription');

      socketRef.current.emit('answer', { answer });
      console.log('📤 [STUDENT] Answer enviado al docente');
    } catch (error) {
      console.error('Error al manejar offer:', error);
      showToastMessage('Error al conectar con la transmisión', 'error');
    }
  };

  const joinClass = async () => {
    try {
      setLoading(true);
      setShowJoinPreferencesModal(false); // Cerrar modal de preferencias

      // ✅ DUAL STREAM FIX: SIEMPRE solicitar cámara para transmisión dual (aunque se desactive después)
      if (joinWithCamera || joinWithAudio) {
        console.log('🎥 [STUDENT-JOIN] Solicitando permisos de cámara/micrófono...');

        // Siempre solicitar video para tener el track disponible para dual streaming
        const stream = await navigator.mediaDevices.getUserMedia({
          video: true, // Siempre solicitar video
          audio: joinWithAudio ? {
            echoCancellation: true,
            noiseSuppression: true,
            autoGainControl: true
          } : false
        });
        console.log('✅ [STUDENT-JOIN] Stream obtenido con video (para dual stream)');

        // Si el usuario no quiere cámara, deshabilitar el track (NO eliminarlo)
        if (!joinWithCamera) {
          const videoTrack = stream.getVideoTracks()[0];
          if (videoTrack) {
            videoTrack.enabled = false;
            console.log('📹 [STUDENT-JOIN] Cámara deshabilitada pero track mantenido para dual stream');
          }
        }

        console.log('✅ [STUDENT-JOIN] Stream tracks:', stream.getTracks().map(t => `${t.kind}: ${t.label} (enabled: ${t.enabled})`));

        setMyStream(stream);
        setIsCameraEnabled(joinWithCamera);
        setIsMuted(!joinWithAudio);
        console.log(`📹 [STUDENT-JOIN] Estados: cámara=${joinWithCamera}, muted=${!joinWithAudio}`);

        // Crear peer connection para enviar al profesor (siempre, incluso si cámara está deshabilitada)
        console.log('🔗 [STUDENT-JOIN] Creando peer connection para enviar stream...');
        const pc = new RTCPeerConnection({
          iceServers: [
            { urls: 'stun:stun.l.google.com:19302' },
            { urls: 'stun:stun1.l.google.com:19302' }
          ]
        });

        studentPeerConnectionRef.current = pc;

        stream.getTracks().forEach(track => {
          console.log(`➕ [STUDENT-JOIN] Agregando track ${track.kind} (enabled: ${track.enabled}) al peer connection`);
          pc.addTrack(track, stream);
        });

        pc.onicecandidate = (event) => {
          if (event.candidate) {
            console.log('🧊 [STUDENT-JOIN] Enviando ICE candidate al docente');
            socketRef.current.emit('student-ice-candidate', {
              candidate: event.candidate
            });
          }
        };

        pc.onconnectionstatechange = () => {
          console.log(`🔗 [STUDENT-JOIN] Peer connection state: ${pc.connectionState}`);
        };
      }

      // Unirse a la sala
      socketRef.current.emit('join-viewer', {
        courseId: course.id,
        userInfo: {
          name: user?.name || 'Estudiante',
          email: user?.email || '',
          id: user?.id || null
        }
      });

      // ✅ CRITICAL FIX: Esperar confirmación y preparar para recibir stream del docente
      // SIEMPRE necesitamos estar listos para recibir, incluso sin cámara/audio
      console.log('⏳ [STUDENT-JOIN] Esperando confirmación del backend...');

      await new Promise((resolve) => {
        const readyHandler = () => {
          console.log('✅ [STUDENT-JOIN] Confirmación recibida del backend');
          socketRef.current.off('viewer-ready-to-connect', readyHandler);
          resolve();
        };
        socketRef.current.on('viewer-ready-to-connect', readyHandler);

        // Timeout de seguridad
        setTimeout(() => {
          console.warn('⚠️ [STUDENT-JOIN] Timeout esperando confirmación');
          socketRef.current.off('viewer-ready-to-connect', readyHandler);
          resolve();
        }, 3000);
      });

      // ✅ FIX: Enviar offer al docente SOLO si tenemos cámara/audio para compartir
      if (studentPeerConnectionRef.current) {
        console.log('📤 [STUDENT-JOIN] Creando y enviando offer al docente...');
        const offer = await studentPeerConnectionRef.current.createOffer();

        // ✅ iOS FIX: Forzar H.264 codec para compatibilidad con Safari iOS
        offer.sdp = forceH264Codec(offer.sdp);

        await studentPeerConnectionRef.current.setLocalDescription(offer);
        socketRef.current.emit('student-offer', { offer });
        console.log('✅ [STUDENT-JOIN] Offer enviado al docente');
      } else {
        console.log('ℹ️ [STUDENT-JOIN] No hay stream propio para enviar (solo espectador)');
      }

      // Iniciar keep-alive cada 4 minutos
      keepAliveIntervalRef.current = setInterval(() => {
        socketRef.current.emit('keep-alive', { courseId: course.id });
      }, 4 * 60 * 1000);

      // ✅ FIX CRÍTICO: Verificar periódicamente si la clase sigue activa (cada 30 segundos)
      // Esto previene que el estudiante se quede "colgado" si el docente cerró inesperadamente
      liveStatusCheckIntervalRef.current = setInterval(() => {
        console.log('🔍 [STUDENT-CHECK] Verificando si la clase sigue activa...');
        if (socketRef.current && socketRef.current.connected) {
          socketRef.current.emit('check-live-status', { courseId: course.id });
        } else {
          console.warn('⚠️ [STUDENT-CHECK] Socket desconectado, no se puede verificar estado');
        }
      }, 30 * 1000); // 30 segundos

      setIsJoined(true);
      setLoading(false);
      setShowStreamModal(true);

      // ✅ Activar estado de clase en vivo en el store
      setActiveLiveClass({
        courseId: course.id,
        type: 'student',
        isMinimized: false
      });

      showToastMessage('Te has unido a la clase', 'success');
    } catch (error) {
      console.error('❌ Error al unirse a la clase:', error);
      showToastMessage('Error al acceder a cámara/micrófono. Verifica los permisos.', 'error');
      setLoading(false);
    }
  };

  const leaveClass = () => {
    console.log('🚪 [STUDENT] Iniciando limpieza completa al salir de clase...');

    // ✅ CRITICAL: Limpiar intervalos
    if (keepAliveIntervalRef.current) {
      clearInterval(keepAliveIntervalRef.current);
      keepAliveIntervalRef.current = null;
    }

    if (liveStatusCheckIntervalRef.current) {
      clearInterval(liveStatusCheckIntervalRef.current);
      liveStatusCheckIntervalRef.current = null;
    }

    // ✅ CRITICAL: Detener y limpiar stream propio del estudiante
    if (myStream) {
      console.log('🛑 [STUDENT] Deteniendo stream propio...');
      myStream.getTracks().forEach(track => {
        track.stop();
        console.log(`🛑 [STUDENT] Track detenido: ${track.kind} - ${track.label}`);
      });
      setMyStream(null);
    }

    if (myVideoRef.current) {
      myVideoRef.current.srcObject = null;
    }

    // ✅ CRITICAL: Detener y limpiar screen stream propio si existe
    if (screenStreamRef.current) {
      console.log('🛑 [STUDENT] Deteniendo screen stream propio...');
      screenStreamRef.current.getTracks().forEach(track => {
        track.stop();
        console.log(`🛑 [STUDENT] Screen track detenido: ${track.kind} - ${track.label}`);
      });
      screenStreamRef.current = null;
    }

    // ✅ CRITICAL: Cerrar conexión peer con docente
    if (studentPeerConnectionRef.current) {
      console.log('🔌 [STUDENT] Cerrando conexión peer con docente...');
      studentPeerConnectionRef.current.close();
      studentPeerConnectionRef.current = null;
    }

    if (peerConnectionRef.current) {
      console.log('🔌 [STUDENT] Cerrando conexión peer principal...');
      peerConnectionRef.current.close();
      peerConnectionRef.current = null;
    }

    // ✅ CRITICAL: Cerrar todas las conexiones P2P con otros estudiantes
    if (peerStudentsRef.current && peerStudentsRef.current.size > 0) {
      console.log(`🔌 [STUDENT] Cerrando ${peerStudentsRef.current.size} conexiones P2P con estudiantes...`);
      peerStudentsRef.current.forEach((pc, viewerId) => {
        if (pc) {
          pc.close();
          console.log(`🔌 [STUDENT] Conexión cerrada con estudiante ${viewerId}`);
        }
      });
      peerStudentsRef.current.clear();
    }

    // ✅ CRITICAL: Limpiar elementos de video
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }

    // ✅ CRITICAL: Limpiar elementos de audio
    if (teacherAudioRef.current) {
      teacherAudioRef.current.srcObject = null;
      teacherAudioRef.current = null;
    }

    Object.keys(peerAudioRefs.current).forEach(viewerId => {
      if (peerAudioRefs.current[viewerId]) {
        peerAudioRefs.current[viewerId].srcObject = null;
        delete peerAudioRefs.current[viewerId];
      }
    });
    peerAudioRefs.current = {};

    // ✅ CRITICAL: Limpiar video refs de peers
    Object.keys(peerVideoRefs.current).forEach(viewerId => {
      if (peerVideoRefs.current[viewerId]) {
        peerVideoRefs.current[viewerId].srcObject = null;
        delete peerVideoRefs.current[viewerId];
      }
    });
    peerVideoRefs.current = {};

    // ✅ CRITICAL: Detener y limpiar teacher screen stream
    setTeacherScreenStream(prev => {
      if (prev) {
        console.log('🛑 [STUDENT] Deteniendo teacher screen stream...');
        prev.getTracks().forEach(track => {
          track.stop();
          console.log(`🛑 [STUDENT] Teacher screen track detenido: ${track.kind} - ${track.label}`);
        });
      }
      return null;
    });

    // ✅ CRITICAL: Limpiar teacher stream ref
    if (teacherStreamRef.current) {
      console.log('🛑 [STUDENT] Limpiando teacher stream ref...');
      teacherStreamRef.current.getTracks().forEach(track => track.stop());
      teacherStreamRef.current = null;
    }

    // ✅ CRITICAL: Resetear TODOS los estados a valores iniciales
    console.log('🔄 [STUDENT] Reseteando todos los estados...');
    setIsJoined(false);
    setIsLive(false);
    setHasStream(false);
    setIsCameraEnabled(false);
    setIsMuted(true);
    setIsForceMuted(false);
    setIsScreenSharing(false);
    setScreenSharePending(false);
    setIsScreenShareBlocked(false);
    setIsTeacherCameraOn(true);
    setIsTeacherScreenSharing(false);
    setNeedsUserInteraction(false);
    setShowStreamModal(false);
    setIsMinimized(false);
    setPinnedParticipant(null);
    setShowWhiteboard(false);
    setViewers(0);
    setViewersList([]);
    setMessages([]);
    setPeerStudentStreams({});
    setPeerStudentScreenStreams({});
    setPeerStudentCameraStates({});
    setPeerStudentScreenSharingStates({});
    setTeacherStreamVersion(0);

    // ✅ CRITICAL: Resetear TODOS los refs
    console.log('🔄 [STUDENT] Reseteando todos los refs...');
    isJoinedRef.current = false;
    myStreamRef.current = null;
    isScreenSharingRef.current = false;
    isMutedRef.current = true;
    peerStudentScreenSharingStatesRef.current = {};

    // ✅ CRITICAL: Emitir evento de salida al servidor
    if (socketRef.current) {
      console.log('📤 [STUDENT] Emitiendo leave-viewer al servidor...');
      socketRef.current.emit('leave-viewer', { courseId: course.id });
    }

    // ✅ CRITICAL: Limpiar estado de clase en vivo del store (Zustand)
    console.log('🗑️ [STUDENT] Limpiando activeLiveClass del store...');
    clearActiveLiveClass();

    console.log('✅ [STUDENT] Limpieza completa finalizada');
    showToastMessage('Has salido de la clase', 'info');
  };

  // ✅ BIDIRECTIONAL VIDEO: Activar/desactivar cámara del estudiante
  const toggleCamera = async () => {
    try {
      if (!isCameraEnabled) {
        // ENABLE: Reactivar cámara
        // ✅ FIX: Identificar ESPECÍFICAMENTE el track de cámara, NO el de pantalla
        const allVideoTracks = myStream?.getVideoTracks() || [];
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
        } else if (isScreenSharing && allVideoTracks.length === 1) {
          // ✅ FIX CRÍTICO: Si está compartiendo pantalla pero solo hay 1 track, ese track ES la pantalla
          // NO es la cámara. Dejamos cameraTrack como null para que se cree uno nuevo
          console.log('📹 [STUDENT-DUAL] Compartiendo pantalla sin cámara - track actual es pantalla, necesito crear cámara nueva');
          cameraTrack = null;
        } else {
          // No hay pantalla compartida, usar el primer track
          cameraTrack = allVideoTracks[0];
        }

        if (cameraTrack && cameraTrack.readyState === 'ended') {
          // El track fue detenido completamente, necesitamos crear uno nuevo
          const newStream = await navigator.mediaDevices.getUserMedia({
            video: true,
            audio: !isMuted ? {
              echoCancellation: true,
              noiseSuppression: true,
              autoGainControl: true
            } : false
          });
          const newVideoTrack = newStream.getVideoTracks()[0];
          console.log('📹 [STUDENT-DUAL] Nueva cámara obtenida (track anterior terminado)');

          // Reemplazar el track antiguo
          myStream.removeTrack(cameraTrack);
          myStream.addTrack(newVideoTrack);

          // Reemplazar en peer connection con docente
          if (studentPeerConnectionRef.current) {
            const senders = studentPeerConnectionRef.current.getSenders();
            const cameraSender = senders.find(s => {
              if (!s.track || s.track.kind !== 'video') return false;
              // Si está compartiendo pantalla, hay 2 senders de video
              // El de cámara es el que coincide con el track antiguo
              if (isScreenSharing) {
                return s.track.id === cameraTrack.id;
              }
              return true; // Si no hay screen share, cualquier video sender es la cámara
            });

            if (cameraSender) {
              await cameraSender.replaceTrack(newVideoTrack);
              console.log(`✅ [STUDENT-DUAL] Track de cámara reemplazado en conexión con docente`);
            }
          }

          // Reemplazar en conexiones P2P con otros estudiantes
          peerStudentsRef.current.forEach((pc, viewerId) => {
            const senders = pc.getSenders();
            const cameraSender = senders.find(s => s.track?.kind === 'video' && s.track.id === cameraTrack.id);
            if (cameraSender) {
              cameraSender.replaceTrack(newVideoTrack);
              console.log(`✅ [STUDENT-DUAL] Track de cámara reemplazado para estudiante ${viewerId}`);
            }
          });
        } else if (cameraTrack) {
          // El track existe y solo está deshabilitado, simplemente habilitarlo
          console.log('📹 [STUDENT-DUAL] Habilitando track de cámara existente');
          cameraTrack.enabled = true;
        } else {
          // No hay stream existente, crear uno nuevo
          console.log('📹 [STUDENT-DUAL] Creando nuevo stream de cámara');
          const stream = await navigator.mediaDevices.getUserMedia({
            video: true,
            audio: !isMuted ? {
              echoCancellation: true,
              noiseSuppression: true,
              autoGainControl: true
            } : false
          });

          // ✅ Si estamos compartiendo pantalla, agregar track de cámara al stream existente
          if (isScreenSharing && screenStreamRef.current) {
            console.log('📹 [STUDENT-DUAL] Compartiendo pantalla activa - agregando cámara al stream');
            const videoTrack = stream.getVideoTracks()[0];
            const audioTracks = stream.getAudioTracks();

            // ✅ FIX: Verificar que no haya duplicados antes de agregar
            const existingVideoTracks = myStreamRef.current.getVideoTracks();
            const videoTrackExists = existingVideoTracks.some(t => t.id === videoTrack.id);

            if (!videoTrackExists) {
              myStreamRef.current.addTrack(videoTrack);
              console.log('✅ [STUDENT-DUAL] Track de video de cámara agregado al stream');
            } else {
              console.log('⚠️ [STUDENT-DUAL] Track de video ya existe, no se duplica');
            }

            // Agregar audio tracks si no existen
            const existingAudioTracks = myStreamRef.current.getAudioTracks();
            audioTracks.forEach(track => {
              const audioTrackExists = existingAudioTracks.some(t => t.id === track.id);
              if (!audioTrackExists) {
                myStreamRef.current.addTrack(track);
              }
            });

            setMyStream(myStreamRef.current);

            // Actualizar conexión con docente
            if (studentPeerConnectionRef.current) {
              const pc = studentPeerConnectionRef.current;
              const senders = pc.getSenders();

              // ✅ FIX: Verificar que no haya duplicados antes de agregar
              const videoSenderExists = senders.some(s => s.track?.id === videoTrack.id);
              if (!videoSenderExists) {
                pc.addTrack(videoTrack, myStreamRef.current);
                console.log('✅ [STUDENT-DUAL] Track de cámara agregado a conexión con docente');
              } else {
                console.log('⚠️ [STUDENT-DUAL] Track de cámara ya existe en conexión, no se duplica');
              }

              // Agregar audio tracks si no existen
              audioTracks.forEach(track => {
                const audioSenderExists = senders.some(s => s.track?.id === track.id);
                if (!audioSenderExists) {
                  pc.addTrack(track, myStreamRef.current);
                  console.log('✅ [STUDENT-DUAL] Track de audio agregado a conexión con docente');
                }
              });

              // Renegociar
              const offer = await pc.createOffer();
              await pc.setLocalDescription(offer);
              socketRef.current.emit('student-offer', { offer });
              console.log('📤 [STUDENT-CAMERA] Offer de renegociación enviado (agregando cámara a pantalla)');
            }

            // Actualizar conexiones P2P con otros estudiantes
            peerStudentsRef.current.forEach(async (pc, viewerId) => {
              const senders = pc.getSenders();

              // ✅ FIX: Verificar duplicados antes de agregar
              const videoSenderExists = senders.some(s => s.track?.id === videoTrack.id);
              if (!videoSenderExists) {
                pc.addTrack(videoTrack, myStreamRef.current);
              }

              audioTracks.forEach(track => {
                const audioSenderExists = senders.some(s => s.track?.id === track.id);
                if (!audioSenderExists) {
                  pc.addTrack(track, myStreamRef.current);
                }
              });

              const offer = await pc.createOffer();
              await pc.setLocalDescription(offer);
              socketRef.current.emit('student-offer', { offer, targetViewerId: viewerId });
              console.log(`📤 [STUDENT-CAMERA-P2P] Offer enviado a estudiante ${viewerId} (agregando cámara)`);
            });

          } else {
            // No hay pantalla compartida, crear conexión normal
            setMyStream(stream);
            myStreamRef.current = stream;

            if (myVideoRef.current) {
              myVideoRef.current.srcObject = stream;
            }

            // Crear peer connection para enviar al profesor
            const pc = new RTCPeerConnection({
              iceServers: [
                { urls: 'stun:stun.l.google.com:19302' },
                { urls: 'stun:stun1.l.google.com:19302' }
              ]
            });

            studentPeerConnectionRef.current = pc;

            // Agregar tracks
            stream.getTracks().forEach(track => {
              pc.addTrack(track, stream);
            });

            pc.onicecandidate = (event) => {
              if (event.candidate) {
                socketRef.current.emit('student-ice-candidate', {
                  candidate: event.candidate
                });
              }
            };

            // ✅ Crear offer y enviar al docente
            const offer = await pc.createOffer();
            await pc.setLocalDescription(offer);
            socketRef.current.emit('student-offer', { offer });
            console.log('📤 [STUDENT-CAMERA] Offer enviado al docente');

            // ✅ CRITICAL FIX: Crear peer connections individuales para cada estudiante en la sala
            console.log('🔄 [STUDENT-CAMERA-P2P] Creando conexiones P2P con estudiantes actuales...', viewersList);
            for (const viewer of viewersList) {
              // No crear conexión conmigo mismo
              if (viewer.id === socketRef.current?.id) continue;

              // ✅ FIX: Si ya existe conexión, agregar tracks y renegociar
              if (peerStudentsRef.current.has(viewer.id)) {
                console.log(`🔄 [STUDENT-CAMERA-P2P] Conexión existente con ${viewer.name} (${viewer.id}) - agregando tracks`);

                try {
                  const pc = peerStudentsRef.current.get(viewer.id);
                  const existingSenders = pc.getSenders();

                  // Agregar tracks que no existan
                  for (const track of stream.getTracks()) {
                    const senderExists = existingSenders.find(s => s.track?.id === track.id);
                    if (!senderExists) {
                      pc.addTrack(track, stream);
                      console.log(`➕ [STUDENT-CAMERA-P2P] Track ${track.kind} agregado para renegociación con ${viewer.id}`);
                    } else {
                      console.log(`♻️ [STUDENT-CAMERA-P2P] Track ${track.kind} ya existe en conexión con ${viewer.id}`);
                    }
                  }

                  // Crear offer de renegociación
                  const offer = await pc.createOffer();
                  await pc.setLocalDescription(offer);

                  socketRef.current.emit('student-offer', {
                    offer,
                    targetViewerId: viewer.id
                  });

                  console.log(`✅ [STUDENT-CAMERA-P2P] Offer de renegociación enviado a ${viewer.name} (${viewer.id})`);
                } catch (error) {
                  console.error(`❌ [STUDENT-CAMERA-P2P] Error en renegociación con ${viewer.id}:`, error);
                }

                continue;
              }

              console.log(`🆕 [STUDENT-CAMERA-P2P] Creando conexión con ${viewer.name} (${viewer.id})`);

              try {
                const peerPc = new RTCPeerConnection({
                  iceServers: [
                    { urls: 'stun:stun.l.google.com:19302' },
                    { urls: 'stun:stun1.l.google.com:19302' }
                  ]
                });

                // Agregar mis tracks
                stream.getTracks().forEach(track => {
                  peerPc.addTrack(track, stream);
                  console.log(`➕ [STUDENT-CAMERA-P2P] Track ${track.kind} agregado para ${viewer.id}`);
                });

                // Manejar stream remoto
                peerPc.ontrack = (event) => {
                  console.log(`📺 [STUDENT-CAMERA-P2P] Stream recibido de ${viewer.id}:`, event.streams[0]);
                  if (event.streams[0]) {
                    const remoteStream = event.streams[0];
                    const videoTracks = remoteStream.getVideoTracks();
                    const audioTracks = remoteStream.getAudioTracks();

                    // ✅ DUAL STREAM: Detectar si es transmisión dual (cámara + pantalla)
                    if (videoTracks.length >= 2) {
                      console.log('🎥 [STUDENT-CAMERA-P2P] Transmisión dual detectada');

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
                        console.log('⚠️ [STUDENT-CAMERA-P2P] No se pudo identificar tracks por label, usando posición');
                        cameraTrack = videoTracks[0];
                        screenTrack = videoTracks[1];
                      }

                      console.log('📹 [STUDENT-CAMERA-P2P] Camera track:', cameraTrack.label, 'enabled:', cameraTrack.enabled);
                      console.log('📺 [STUDENT-CAMERA-P2P] Screen track:', screenTrack.label, 'enabled:', screenTrack.enabled);

                      const cameraStream = new MediaStream([cameraTrack, ...audioTracks]);
                      const screenStream = new MediaStream([screenTrack]);

                      setPeerStudentStreams(prev => ({ ...prev, [viewer.id]: cameraStream }));
                      setPeerStudentScreenStreams(prev => ({ ...prev, [viewer.id]: screenStream }));
                      console.log('✅ [STUDENT-CAMERA-P2P] Dual stream guardado para', viewer.id);
                    } else {
                      // ✅ CRITICAL FIX: Solo 1 video track - verificar si es pantalla o cámara
                      const isScreenSharing = peerStudentScreenSharingStatesRef.current[viewer.id] === true;

                      if (isScreenSharing) {
                        // Es pantalla compartida SIN cámara
                        console.log(`📺 [STUDENT-CAMERA-P2P] Stream de PANTALLA detectado para ${viewer.id}`);
                        setPeerStudentScreenStreams(prev => ({ ...prev, [viewer.id]: remoteStream }));

                        // Limpiar stream de cámara si existe
                        setPeerStudentStreams(prev => {
                          const newStreams = { ...prev };
                          delete newStreams[viewer.id];
                          return newStreams;
                        });
                      } else {
                        // Es cámara SIN pantalla compartida
                        console.log(`📹 [STUDENT-CAMERA-P2P] Stream de CÁMARA detectado para ${viewer.id}`);
                        setPeerStudentStreams(prev => ({ ...prev, [viewer.id]: remoteStream }));

                        // Limpiar stream de pantalla si existe
                        setPeerStudentScreenStreams(prev => {
                          const newStreams = { ...prev };
                          delete newStreams[viewer.id];
                          return newStreams;
                        });
                      }

                      console.log(`✅ [STUDENT-CAMERA-P2P] Stream único guardado para ${viewer.id} como ${isScreenSharing ? 'PANTALLA' : 'CÁMARA'}`);
                    }
                  }
                };

                // ICE candidates
                peerPc.onicecandidate = (event) => {
                  if (event.candidate) {
                    socketRef.current.emit('peer-student-ice-candidate', {
                      toViewerId: viewer.id,
                      candidate: event.candidate
                    });
                  }
                };

                // Guardar peer connection
                peerStudentsRef.current.set(viewer.id, peerPc);

                // Crear y enviar offer dirigido
                const peerOffer = await peerPc.createOffer();

                // ✅ iOS FIX: Forzar H.264 codec
                peerOffer.sdp = forceH264Codec(peerOffer.sdp);

                await peerPc.setLocalDescription(peerOffer);

                console.log(`📤 [STUDENT-CAMERA-P2P] ENVIANDO offer a ${viewer.name} (${viewer.id})`);
                console.log(`🔍 [STUDENT-CAMERA-P2P] Socket conectado:`, socketRef.current?.connected);
                console.log(`🔍 [STUDENT-CAMERA-P2P] Socket ID:`, socketRef.current?.id);

                socketRef.current.emit('student-offer', {
                  offer: peerOffer,
                  targetViewerId: viewer.id
                });

                console.log(`✅ [STUDENT-CAMERA-P2P] Offer enviado a ${viewer.name} (${viewer.id})`);
              } catch (error) {
                console.error(`❌ [STUDENT-CAMERA-P2P] Error creando conexión con ${viewer.id}:`, error);
              }
            }
          }

        } // Cierre del else (crear nuevo stream)

        setIsCameraEnabled(true);

        // ✅ Notificar a todos los participantes que la cámara está activada
        socketRef.current.emit('student-camera-status', { cameraEnabled: true });
        console.log('📤 [STUDENT-CAMERA] Notified: camera enabled');

        showToastMessage('Cámara activada', 'success');
      } else {
        // DISABLE: Desactivar cámara
        if (myStream) {
          // ✅ FIX: Identificar ESPECÍFICAMENTE el track de cámara, NO el de pantalla
          const allVideoTracks = myStream.getVideoTracks();
          let cameraTrack = null;

          if (isScreenSharing && allVideoTracks.length >= 2) {
            // Si está compartiendo pantalla, hay 2 tracks: cámara y pantalla
            cameraTrack = allVideoTracks.find(track => {
              const label = track.label.toLowerCase();
              return !label.includes('screen') && !label.includes('window') &&
                     !label.includes('monitor') && !label.includes('ubuntu') &&
                     !label.includes('chrome') && !label.includes('firefox');
            });

            if (!cameraTrack) {
              const screenTrack = screenStreamRef.current?.getVideoTracks()[0];
              cameraTrack = allVideoTracks.find(t => t.id !== screenTrack?.id);
            }
          } else {
            cameraTrack = allVideoTracks[0];
          }

          if (cameraTrack) {
            if (isScreenSharing) {
              // Si está compartiendo pantalla, solo deshabilitar (dual stream)
              console.log('📹 [STUDENT-DUAL] Deshabilitando cámara (manteniendo track para dual stream)');
              cameraTrack.enabled = false;
            } else {
              // Si NO está compartiendo pantalla, DETENER para liberar cámara física
              console.log('📹 [STUDENT] Deteniendo track de cámara para liberar cámara física');
              cameraTrack.stop();
              // Mantener el track en el stream para que las peer connections no se rompan
              // Solo lo marcamos como detenido
            }
            console.log('📹 [STUDENT] Cámara desactivada');
          }
          // NO hacer setMyStream(null) ni cerrar peer connections
        }

        setIsCameraEnabled(false);

        // ✅ Notificar a todos los participantes que la cámara está desactivada
        socketRef.current.emit('student-camera-status', { cameraEnabled: false });
        console.log('📤 [STUDENT-CAMERA] Notified: camera disabled');

        showToastMessage('Cámara desactivada', 'info');
      }
    } catch (error) {
      console.error('Error al activar/desactivar cámara:', error);
      showToastMessage('Error al acceder a la cámara. Verifica los permisos.', 'error');
    }
  };

  // ✅ BIDIRECTIONAL VIDEO: Silenciar/activar micrófono del estudiante
  const toggleMute = async () => {
    // Si está forzosamente silenciado por el docente, no permitir activar
    if (isForceMuted && isMuted) {
      showToastMessage('El docente te ha silenciado. No puedes activar el micrófono.', 'error');
      return;
    }

    try {
      if (!isMuted) {
        // DISABLE: Silenciar micrófono
        console.log('🔇 [STUDENT] Iniciando proceso de silenciar micrófono');
        console.log('🔇 [STUDENT] myStream existe:', !!myStream);
        if (myStream) {
          const audioTracks = myStream.getAudioTracks();
          console.log('🔇 [STUDENT] Audio tracks encontrados:', audioTracks.length);
          const audioTrack = audioTracks[0];
          if (audioTrack) {
            console.log('🔇 [STUDENT] Deteniendo audio track:', audioTrack.id, 'readyState:', audioTrack.readyState);
            audioTrack.stop();
            console.log('🔇 [STUDENT] Micrófono físicamente detenido. Nuevo readyState:', audioTrack.readyState);

            // Remove from peer connection with TEACHER ONLY if it's open
            if (studentPeerConnectionRef.current && studentPeerConnectionRef.current.connectionState !== 'closed') {
              const sender = studentPeerConnectionRef.current.getSenders().find(s => s.track?.kind === 'audio');
              if (sender) {
                try {
                  sender.replaceTrack(null);
                  console.log('🔇 [STUDENT] Audio track removido de conexión con profesor');
                } catch (err) {
                  console.warn('Could not replace track, connection may be closed:', err);
                }
              }
            }

            // ✅ También remover audio de conexiones P2P con otros estudiantes
            const peerEntries = Array.from(peerStudentsRef.current.entries());
            for (const [viewerId, pc] of peerEntries) {
              if (pc.connectionState !== 'closed' && pc.connectionState !== 'failed') {
                const sender = pc.getSenders().find(s => s.track?.kind === 'audio');
                if (sender) {
                  try {
                    await sender.replaceTrack(null);
                    console.log(`🔇 [STUDENT-P2P] Audio track removido de estudiante ${viewerId}`);

                    // ✅ CRITICAL FIX: NO renegociar al remover - replaceTrack(null) es suficiente
                    // Solo necesitamos renegociar si AGREGAMOS tracks nuevos
                    console.log(`✅ [STUDENT-P2P] Audio removido sin renegociación para ${viewerId}`);
                  } catch (err) {
                    console.warn(`Could not remove track for student ${viewerId}:`, err);
                  }
                }
              }
            }

            // Remove from stream
            myStream.removeTrack(audioTrack);
            console.log('🔇 [STUDENT] Audio track removido de myStream. Tracks restantes:', myStream.getTracks().map(t => t.kind));
          } else {
            console.warn('⚠️ [STUDENT] No se encontró audio track para detener');
          }
        } else {
          console.warn('⚠️ [STUDENT] myStream no existe, no se puede silenciar');
        }
        setIsMuted(true);
        isMutedRef.current = true; // ✅ Actualizar ref inmediatamente
        console.log('🔇 [STUDENT] Estado isMuted cambiado a:', true);
        showToastMessage('Micrófono silenciado', 'info');
      } else {
        // ENABLE: Activar micrófono
        const newStream = await navigator.mediaDevices.getUserMedia({
          audio: {
            echoCancellation: true,
            noiseSuppression: true,
            autoGainControl: true
          }
        });
        const newAudioTrack = newStream.getAudioTracks()[0];
        console.log('🎤 [STUDENT] Nuevo micrófono obtenido');

        // Si no hay stream, crear uno solo con audio
        if (!myStream) {
          const audioOnlyStream = new MediaStream([newAudioTrack]);
          setMyStream(audioOnlyStream);
          myStreamRef.current = audioOnlyStream; // ✅ Actualizar ref inmediatamente

          // Crear peer connection para enviar audio al profesor
          const pc = new RTCPeerConnection({
            iceServers: [
              { urls: 'stun:stun.l.google.com:19302' },
              { urls: 'stun:stun1.l.google.com:19302' }
            ]
          });

          studentPeerConnectionRef.current = pc;

          // Agregar audio track
          pc.addTrack(newAudioTrack, audioOnlyStream);

          pc.onicecandidate = (event) => {
            if (event.candidate) {
              socketRef.current.emit('student-ice-candidate', {
                candidate: event.candidate
              });
            }
          };

          // Crear offer
          const offer = await pc.createOffer();
          await pc.setLocalDescription(offer);
          socketRef.current.emit('student-offer', { offer });

          console.log('🎤 [STUDENT] Peer connection creada solo para audio');
        } else {
          // Add to myStream
          myStream.addTrack(newAudioTrack);

          // Replace in peer connection with TEACHER ONLY if it's open
          if (studentPeerConnectionRef.current && studentPeerConnectionRef.current.connectionState !== 'closed') {
            const sender = studentPeerConnectionRef.current.getSenders().find(s => s.track === null || s.track?.kind === 'audio');
            if (sender) {
              try {
                sender.replaceTrack(newAudioTrack);
                console.log('🎤 [STUDENT] Audio track agregado a conexión con profesor');
              } catch (err) {
                console.warn('Could not replace track, connection may be closed:', err);
              }
            } else {
              // If no sender exists, add the track
              try {
                studentPeerConnectionRef.current.addTrack(newAudioTrack, myStream);
                console.log('🎤 [STUDENT] Audio track agregado a conexión con profesor (nuevo sender)');
              } catch (err) {
                console.warn('Could not add track, connection may be closed:', err);
              }
            }
          }

          // ✅ También agregar audio a conexiones P2P con otros estudiantes
          console.log(`🎤 [STUDENT-P2P-AUDIO] Distribuyendo audio a ${peerStudentsRef.current.size} estudiantes conectados`);

          // ✅ CRITICAL FIX: Procesar conexiones P2P de forma secuencial para evitar race conditions
          const peerEntries = Array.from(peerStudentsRef.current.entries());
          for (const [viewerId, pc] of peerEntries) {
            console.log(`🎤 [STUDENT-P2P-AUDIO] Procesando estudiante ${viewerId}, estado: ${pc.connectionState}`);
            if (pc.connectionState !== 'closed' && pc.connectionState !== 'failed') {
              const senders = pc.getSenders();
              console.log(`🎤 [STUDENT-P2P-AUDIO] Senders actuales para ${viewerId}:`, senders.map(s => `${s.track?.kind || 'null'}`));

              const audioSender = senders.find(s => s.track?.kind === 'audio');
              const nullSender = senders.find(s => s.track === null);

              let needsRenegotiation = false;

              if (audioSender) {
                // Ya existe un sender de audio, reemplazar el track
                try {
                  await audioSender.replaceTrack(newAudioTrack);
                  console.log(`🎤 [STUDENT-P2P-AUDIO] Audio track REEMPLAZADO para estudiante ${viewerId}`);
                  needsRenegotiation = false; // replaceTrack no requiere renegociación
                } catch (err) {
                  console.warn(`Could not replace track for student ${viewerId}:`, err);
                }
              } else if (nullSender) {
                // Existe un sender vacío, reemplazar con audio
                try {
                  await nullSender.replaceTrack(newAudioTrack);
                  console.log(`🎤 [STUDENT-P2P-AUDIO] Audio track REEMPLAZADO (sender vacío) para estudiante ${viewerId}`);
                  needsRenegotiation = false;
                } catch (err) {
                  console.warn(`Could not replace null track for student ${viewerId}:`, err);
                }
              } else {
                // No existe sender de audio, agregar uno nuevo
                try {
                  pc.addTrack(newAudioTrack, myStream);
                  console.log(`🎤 [STUDENT-P2P-AUDIO] Audio track AGREGADO como nuevo sender para estudiante ${viewerId}`);
                  needsRenegotiation = true;
                } catch (err) {
                  console.warn(`Could not add track for student ${viewerId}:`, err);
                }
              }

              // ✅ CRITICAL FIX: Renegociar SOLO si agregamos un nuevo track
              if (needsRenegotiation) {
                try {
                  console.log(`🔄 [STUDENT-P2P-AUDIO] Esperando a que signaling esté en estado stable para ${viewerId}...`);
                  // Esperar a que el signaling esté en estado stable
                  if (pc.signalingState !== 'stable') {
                    console.warn(`⚠️ [STUDENT-P2P-AUDIO] Signaling state no es stable (${pc.signalingState}), esperando...`);
                    await new Promise(resolve => setTimeout(resolve, 100));
                  }

                  if (pc.signalingState === 'stable') {
                    const offer = await pc.createOffer();
                    await pc.setLocalDescription(offer);
                    socketRef.current.emit('student-offer', {
                      offer,
                      targetViewerId: viewerId
                    });
                    console.log(`📤 [STUDENT-P2P] Offer de renegociación enviado a ${viewerId} (audio activado)`);
                  } else {
                    console.warn(`⚠️ [STUDENT-P2P-AUDIO] No se pudo renegociar con ${viewerId}, signaling state: ${pc.signalingState}`);
                  }
                } catch (err) {
                  console.warn(`Could not renegotiate with student ${viewerId}:`, err);
                }
              }
            }
          }
        }

        setIsMuted(false);
        isMutedRef.current = false; // ✅ Actualizar ref inmediatamente
        showToastMessage('Micrófono activado', 'success');
      }
    } catch (error) {
      console.error('❌ Error al acceder al micrófono:', error);
      showToastMessage('Error al acceder al micrófono. Verifica los permisos.', 'error');
    }
  };

  // ✅ SCREEN SHARE: Request permission from teacher
  const requestScreenShare = () => {
    // ✅ MOBILE CHECK: Bloquear compartir pantalla en dispositivos móviles
    if (isMobile || /Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent)) {
      showToastMessage('Opción no disponible en móvil', 'warning');
      return;
    }

    setScreenSharePending(true);
    socketRef.current.emit('request-screen-share');
    showToastMessage('Solicitando permiso al docente...', 'info');
  };

  // ✅ SCREEN SHARE: Start screen sharing after teacher approval
  const startScreenShare = async () => {
    try {
      // ✅ DUAL STREAM: Request lock FIRST before asking for screen permission
      console.log('📺 [STUDENT-DUAL] Requesting screen share lock...');

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
        console.log('✅ [STUDENT-DUAL] Screen share lock acquired');

        // ✅ CRITICAL: Establecer el ref INMEDIATAMENTE después de adquirir el lock
        // para que si llega viewers-list mientras se obtiene el stream, ya sepa que estoy compartiendo
        isScreenSharingRef.current = true;
        console.log('✅ [STUDENT-DUAL] isScreenSharingRef establecido a true (temprano)');
      } catch (lockError) {
        console.log('❌ [STUDENT-DUAL] Lock denied:', lockError.message);
        setScreenSharePending(false); // Resetear estado de pending
        throw lockError; // Re-lanzar para que se maneje en el catch principal
      }

      // Solo si tenemos el lock, pedimos permiso al navegador
      const screenStream = await navigator.mediaDevices.getDisplayMedia({
        video: true,
        audio: false
      });

      const screenVideoTrack = screenStream.getVideoTracks()[0];

      // ✅ Guardar ref de pantalla para limpiar después
      screenStreamRef.current = screenStream;

      // ✅ DUAL STREAM: SIEMPRE crear/usar stream con cámara + pantalla (igual que el docente)
      let transmissionStream;

      if (myStreamRef.current && myStreamRef.current instanceof MediaStream) {
        // Caso 1: Ya hay stream con cámara/audio - agregar pantalla (DUAL STREAM)
        console.log('✅ [STUDENT-DUAL] Agregando track de pantalla al stream principal (cámara + pantalla)');
        myStreamRef.current.addTrack(screenVideoTrack);
        transmissionStream = myStreamRef.current;
        console.log('✅ [STUDENT-DUAL] Stream ahora tiene:', transmissionStream.getTracks().map(t => `${t.kind}: ${t.label} (enabled: ${t.enabled})`));
      } else {
        // Caso 2: NO hay stream - enviar solo pantalla
        console.log('⚠️ [STUDENT-DUAL] No hay stream de cámara, enviando solo pantalla compartida');
        transmissionStream = screenStream;
        myStreamRef.current = screenStream;
        setMyStream(screenStream);
        console.log('✅ [STUDENT-DUAL] Stream creado solo con pantalla:', transmissionStream.getTracks().map(t => `${t.kind}: ${t.label}`));
      }

      // ✅ CRITICAL FIX: AGREGAR el track de pantalla sin reemplazar el de cámara
      console.log('📤 [STUDENT-SCREEN] Agregando track de pantalla a peer connection con dual stream');

      if (studentPeerConnectionRef.current) {
        const pc = studentPeerConnectionRef.current;
        const senders = pc.getSenders();

        console.log(`🔄 [STUDENT-SCREEN] Senders actuales: ${senders.length}`);

        // ✅ Solo agregar el track de pantalla (NO reemplazar tracks existentes)
        const existingVideoSenderIds = senders
          .filter(s => s.track && s.track.kind === 'video')
          .map(s => s.track.id);

        console.log(`📹 [STUDENT-SCREEN] Video tracks existentes: ${existingVideoSenderIds.length}`);

        // Agregar solo el track de pantalla si no está ya agregado
        const alreadyAdded = existingVideoSenderIds.includes(screenVideoTrack.id);
        if (!alreadyAdded) {
          pc.addTrack(screenVideoTrack, transmissionStream);
          console.log(`➕ [STUDENT-SCREEN] Track de pantalla agregado: ${screenVideoTrack.label.substring(0, 30)}`);
        } else {
          console.log(`⏭️ [STUDENT-SCREEN] Track de pantalla ya estaba agregado`);
        }

        console.log('✅ [STUDENT-SCREEN] Tracks actualizados en peer connection con docente');

        // Renegociar
        const offer = await pc.createOffer();
        await pc.setLocalDescription(offer);
        socketRef.current.emit('student-offer', { offer });
        console.log('📤 [STUDENT-SCREEN] Offer de renegociación enviado al docente');
      } else {
        // ✅ FIX CRÍTICO: Si no hay peer connection (estudiante nunca activó cámara), crear una nueva
        console.log('🆕 [STUDENT-SCREEN] No hay peer connection existente, creando nueva para compartir pantalla');

        const pc = new RTCPeerConnection({
          iceServers: [
            { urls: 'stun:stun.l.google.com:19302' },
            { urls: 'stun:stun1.l.google.com:19302' }
          ]
        });

        studentPeerConnectionRef.current = pc;

        // Agregar todos los tracks del stream de transmisión
        transmissionStream.getTracks().forEach(track => {
          pc.addTrack(track, transmissionStream);
          console.log(`➕ [STUDENT-SCREEN] Track ${track.kind} agregado: ${track.label.substring(0, 30)}`);
        });

        pc.onicecandidate = (event) => {
          if (event.candidate) {
            socketRef.current.emit('student-ice-candidate', {
              candidate: event.candidate
            });
          }
        };

        // Crear offer y enviar al docente
        const offer = await pc.createOffer();
        await pc.setLocalDescription(offer);
        socketRef.current.emit('student-offer', { offer });
        console.log('📤 [STUDENT-SCREEN] Peer connection creada y offer enviado al docente');
      }

      // ✅ ACTUALIZAR CONEXIONES P2P CON OTROS ESTUDIANTES
      console.log('📤 [STUDENT-SCREEN-P2P] Actualizando tracks para otros estudiantes');
      for (const [viewerId, pc] of peerStudentsRef.current.entries()) {
        try {
          const senders = pc.getSenders();

          console.log(`🔄 [STUDENT-SCREEN-P2P] Actualizando para estudiante ${viewerId}: ${senders.length} senders`);

          // ✅ Solo agregar el track de pantalla (NO reemplazar tracks existentes)
          const existingVideoSenderIds = senders
            .filter(s => s.track && s.track.kind === 'video')
            .map(s => s.track.id);

          console.log(`📹 [STUDENT-SCREEN-P2P] Video tracks existentes para ${viewerId}: ${existingVideoSenderIds.length}`);

          // Agregar solo el track de pantalla si no está ya agregado
          const alreadyAdded = existingVideoSenderIds.includes(screenVideoTrack.id);
          if (!alreadyAdded) {
            pc.addTrack(screenVideoTrack, transmissionStream);
            console.log(`➕ [STUDENT-SCREEN-P2P] Track de pantalla agregado para ${viewerId}`);
          } else {
            console.log(`⏭️ [STUDENT-SCREEN-P2P] Track de pantalla ya estaba agregado para ${viewerId}`);
          }

          // Renegociar con este estudiante
          const offer = await pc.createOffer();
          await pc.setLocalDescription(offer);
          socketRef.current.emit('student-offer', { offer, targetViewerId: viewerId });
          console.log(`📤 [STUDENT-SCREEN-P2P] Offer enviado a estudiante ${viewerId}`);
        } catch (error) {
          console.error(`❌ [STUDENT-SCREEN-P2P] Error actualizando conexión con ${viewerId}:`, error);
        }
      }

      // Handle when user stops sharing via browser UI
      screenVideoTrack.onended = () => {
        stopScreenShare();
      };

      setIsScreenSharing(true);

      // ✅ CRITICAL FIX: Auto-pin student cuando comparte pantalla
      // Esto muestra la pantalla compartida en el panel principal (igual que el docente)
      if (pinnedParticipant !== 'me') {
        setPinnedParticipant('me');
        console.log('📌 [STUDENT-DUAL] Auto-pinned student to show screen share in main panel');
      }

      // ✅ Notificar al docente que el estudiante está compartiendo pantalla
      socketRef.current.emit('student-screen-share-status', {
        isSharing: true
      });
      console.log('📤 [STUDENT-DUAL] Notified teacher: screen sharing started');

      showToastMessage('Compartiendo pantalla + cámara', 'success');
    } catch (error) {
      console.error('Error al compartir pantalla:', error);

      // If we failed to get screen stream but acquired the lock, release it
      if (error.message && !error.message.includes('ya está compartiendo')) {
        socketRef.current.emit('stop-screen-share', { courseId: course.id });
      }

      showToastMessage(error.message || 'Error al compartir pantalla', 'error');
      setIsScreenSharing(false);
      isScreenSharingRef.current = false;
    }
  };

  // ✅ SCREEN SHARE: Stop screen sharing (EXACTO como docente)
  const stopScreenShare = async () => {
    try {
      console.log('🛑 [STUDENT-DUAL] Deteniendo pantalla compartida');

      // ✅ DUAL STREAM: Remover track de pantalla del stream principal
      const hadOnlyScreen = myStreamRef.current === screenStreamRef.current;

      if (screenStreamRef.current && myStreamRef.current) {
        const screenTrack = screenStreamRef.current.getVideoTracks()[0];
        if (screenTrack && !hadOnlyScreen) {
          // Solo remover si había dual stream (cámara + pantalla)
          myStreamRef.current.removeTrack(screenTrack);
          console.log('✅ [STUDENT-DUAL] Track de pantalla removido del stream principal');
          console.log('✅ [STUDENT-DUAL] Stream ahora tiene:', myStreamRef.current.getTracks().map(t => `${t.kind}: ${t.label}`));
        } else if (hadOnlyScreen) {
          // Si solo había pantalla, limpiar myStreamRef
          console.log('⚠️ [STUDENT-DUAL] Solo había pantalla compartida, limpiando myStreamRef');
          myStreamRef.current = null;
          setMyStream(null);
        }
      }

      // ✅ Remover sender de pantalla del docente y renegociar
      if (studentPeerConnectionRef.current && screenStreamRef.current) {
        const pc = studentPeerConnectionRef.current;
        const senders = pc.getSenders();
        const screenTrack = screenStreamRef.current.getVideoTracks()[0];

        const screenSender = senders.find(sender => {
          if (!sender.track || sender.track.kind !== 'video') return false;
          return sender.track.id === screenTrack.id;
        });

        if (screenSender) {
          pc.removeTrack(screenSender);
          console.log('✅ [STUDENT-SCREEN] Sender de pantalla removido del docente');

          // Renegociar con el docente
          const offer = await pc.createOffer();
          await pc.setLocalDescription(offer);
          socketRef.current.emit('student-offer', { offer });
          console.log('📤 [STUDENT-SCREEN] Offer enviado al docente sin pantalla');
        }
      }

      // ✅ Remover sender de pantalla de TODOS los peers P2P y renegociar
      if (screenStreamRef.current) {
        const screenTrack = screenStreamRef.current.getVideoTracks()[0];
        console.log('🔄 [STUDENT-SCREEN-P2P] Removiendo pantalla compartida de peers...');

        for (const [viewerId, pc] of peerStudentsRef.current.entries()) {
          try {
            const senders = pc.getSenders();
            const screenSender = senders.find(sender => {
              if (!sender.track || sender.track.kind !== 'video') return false;
              return sender.track.id === screenTrack.id;
            });

            if (screenSender) {
              pc.removeTrack(screenSender);
              console.log(`✅ [STUDENT-SCREEN-P2P] Sender de pantalla removido para ${viewerId}`);

              // Renegociar con este estudiante
              const offer = await pc.createOffer();
              await pc.setLocalDescription(offer);
              socketRef.current.emit('student-offer', { offer, targetViewerId: viewerId });
              console.log(`📤 [STUDENT-SCREEN-P2P] Offer enviado a ${viewerId} sin pantalla`);
            }
          } catch (error) {
            console.error(`❌ [STUDENT-SCREEN-P2P] Error removiendo pantalla de ${viewerId}:`, error);
          }
        }
      }

      // ✅ Detener y limpiar stream de pantalla compartida
      if (screenStreamRef.current) {
        screenStreamRef.current.getTracks().forEach(track => track.stop());
        screenStreamRef.current = null;
        console.log('✅ [STUDENT-DUAL] Screen stream stopped and cleared');
      }

      setIsScreenSharing(false);
      isScreenSharingRef.current = false;

      // ✅ CRITICAL FIX: Unpin student cuando deja de compartir pantalla
      if (pinnedParticipant === 'me') {
        setPinnedParticipant(null);
        console.log('📌 [STUDENT-DUAL] Unpinned student, returning to teacher in main panel');
      }

      // ✅ DUAL STREAM: Release screen share lock
      socketRef.current.emit('stop-screen-share', { courseId: course.id });

      // Notificar al docente que el estudiante dejó de compartir pantalla (backward compatibility)
      socketRef.current.emit('student-screen-share-status', {
        isSharing: false
      });

      showToastMessage('Pantalla dejada de compartir', 'info');
    } catch (error) {
      console.error('Error al detener compartir pantalla:', error);
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
        sender: user?.name || 'Estudiante',
        timestamp: new Date().toISOString()
      };
      socketRef.current.emit('chat-message', { courseId: course.id, message });
      // ✅ NO agregar aquí - se agregará cuando llegue por socket
      // Esto evita duplicación para el remitente
      setNewMessage('');
    }
  };

  // ✅ Si es vista minimizada, renderizar todo pero solo mostrar el video
  // No podemos hacer early return porque necesitamos que los useEffect se ejecuten

  // Vista principal de la pestaña
  return (
    <div className="space-y-6">
      {/* Próximas Clases Programadas - Carrusel */}
      {scheduledClasses.length > 0 && (
        <div className="bg-gradient-to-r from-blue-50 to-cyan-50/20/20 rounded-lg shadow-lg p-6 border border-blue-200">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-gradient-to-br from-blue-500 to-cyan-600 rounded-lg">
                <Calendar className="text-white" size={20} />
              </div>
              <div>
                <h3 className="text-lg font-bold text-gray-800">Próximas Clases</h3>
                <p className="text-sm text-gray-600">
                  {currentClassIndex + 1} de {scheduledClasses.length}
                </p>
              </div>
            </div>

            {/* Controles del carrusel */}
            {scheduledClasses.length > 1 && (
              <div className="flex items-center gap-2">
                <button
                  onClick={handlePrevClass}
                  className="p-2 bg-white hover:bg-gray-100:bg-gray-600 rounded-lg shadow transition"
                  aria-label="Clase anterior"
                >
                  <ChevronLeft size={20} className="text-gray-700" />
                </button>
                <button
                  onClick={handleNextClass}
                  className="p-2 bg-white hover:bg-gray-100:bg-gray-600 rounded-lg shadow transition"
                  aria-label="Siguiente clase"
                >
                  <ChevronRight size={20} className="text-gray-700" />
                </button>
              </div>
            )}
          </div>

          {/* Carrusel de clases */}
          <div className="relative overflow-hidden">
            <div
              className="flex transition-transform duration-500 ease-in-out"
              style={{ transform: `translateX(-${currentClassIndex * 100}%)` }}
            >
              {scheduledClasses.map((scheduledClass, index) => {
                const classDate = new Date(scheduledClass.date + 'T' + scheduledClass.time);
                const now = new Date();
                const isToday = classDate.toDateString() === now.toDateString();
                const isSoon = (classDate - now) / (1000 * 60) <= 30 && (classDate - now) > 0;

                return (
                  <div
                    key={scheduledClass.id}
                    className="w-full flex-shrink-0"
                  >
                    <div
                      className={`p-4 bg-white rounded-lg border-2 ${
                        isSoon
                          ? 'border-green-500 animate-pulse'
                          : isToday
                          ? 'border-blue-500'
                          : 'border-gray-200'
                      }`}
                    >
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex-1">
                          <h4 className="font-bold text-gray-800 text-base mb-1">
                            {scheduledClass.title}
                          </h4>
                          {scheduledClass.description && (
                            <p className="text-sm text-gray-600 line-clamp-2">
                              {scheduledClass.description}
                            </p>
                          )}
                        </div>
                        {isSoon && (
                          <span className="px-2 py-1 bg-green-100 text-green-700 text-xs font-semibold rounded flex items-center gap-1">
                            <Clock size={12} />
                            Pronto
                          </span>
                        )}
                        {isToday && !isSoon && (
                          <span className="px-2 py-1 bg-blue-100 text-blue-700 text-xs font-semibold rounded">
                            Hoy
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-4 text-sm text-gray-600">
                        <div className="flex items-center gap-2">
                          <Calendar size={16} />
                          <span>
                            {classDate.toLocaleDateString('es-ES', {
                              weekday: 'long',
                              month: 'long',
                              day: 'numeric'
                            })}
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Clock size={16} />
                          <span>
                            {classDate.toLocaleTimeString('es-ES', {
                              hour: '2-digit',
                              minute: '2-digit'
                            })}
                            {scheduledClass.duration && ` (${scheduledClass.duration} min)`}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Indicadores de paginación */}
          {scheduledClasses.length > 1 && (
            <div className="flex justify-center gap-2 mt-4">
              {scheduledClasses.map((_, index) => (
                <button
                  key={index}
                  onClick={() => setCurrentClassIndex(index)}
                  className={`h-2 rounded-full transition-all ${
                    index === currentClassIndex
                      ? 'w-8 bg-blue-600'
                      : 'w-2 bg-gray-300'
                  }`}
                  aria-label={`Ir a clase ${index + 1}`}
                />
              ))}
            </div>
          )}
        </div>
      )}

      {/* Estado de la clase */}
      {!isLive ? (
        <div className="bg-gradient-to-br from-cyan-50 to-blue-50/20/20 rounded-lg shadow-lg p-12 text-center">
          <div className="w-24 h-24 bg-gray-200 rounded-full mx-auto mb-6 flex items-center justify-center">
            <VideoOff size={48} className="text-gray-400" />
          </div>
          <h3 className="text-2xl font-bold text-gray-800 mb-3">
            No hay transmisión en este momento
          </h3>
          <p className="text-gray-600 mb-6">
            El docente no ha iniciado ninguna clase en vivo. Recibirás una notificación cuando comience.
          </p>
          <div className="flex items-center justify-center gap-2 text-cyan-600">
            <Clock size={20} />
            <span className="font-semibold">Esperando al docente...</span>
          </div>
        </div>
      ) : (
        <div className="bg-gradient-to-br from-green-50 to-cyan-50/20/20 rounded-lg shadow-lg p-12 text-center">
          <div className="w-24 h-24 bg-gradient-to-br from-red-500 to-pink-600 rounded-full mx-auto mb-6 flex items-center justify-center animate-pulse">
            <Video size={48} className="text-white" />
          </div>
          <h3 className="text-2xl font-bold text-gray-800 mb-3">
            Clase en Vivo Activa
          </h3>
          <p className="text-gray-600 mb-6">
            El docente está transmitiendo en este momento. Únete para participar.
          </p>
          <div className="flex items-center justify-center gap-2 mb-6">
            <Users size={20} className="text-cyan-600" />
            <span className="font-semibold text-gray-700">
              {viewers} estudiante{viewers !== 1 ? 's' : ''} conectado{viewers !== 1 ? 's' : ''}
            </span>
          </div>
          <button
            onClick={() => setShowJoinPreferencesModal(true)}
            disabled={loading || isJoined}
            className="px-8 py-3 bg-gradient-to-r from-cyan-600 to-blue-600 text-white rounded-lg hover:shadow-lg transition font-semibold disabled:opacity-50 flex items-center gap-2 mx-auto"
          >
            {loading ? (
              <>
                <Loader size={20} className="animate-spin" />
                Uniéndose...
              </>
            ) : isJoined ? (
              <>
                <Video size={20} />
                Ya estás en la clase
              </>
            ) : (
              <>
                <Video size={20} />
                Unirse a la Clase
              </>
            )}
          </button>
        </div>
      )}

      {/* Instrucciones */}
      <div className="bg-blue-50/20 border border-blue-200 rounded-lg p-6">
        <h3 className="font-bold text-blue-900 mb-3 flex items-center gap-2">
          <AlertCircle size={20} />
          Instrucciones
        </h3>
        <ul className="space-y-2 text-sm text-blue-800">
          <li>• Asegúrate de tener buena conexión a internet</li>
          <li>• Cuando el docente inicie la clase, podrás unirte haciendo clic en "Unirse a la clase"</li>
          <li>• Podrás ver la transmisión del docente y participar en el chat</li>
        </ul>
      </div>

      {/* Modal de Transmisión */}
      {showStreamModal && isJoined && (
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
              className="bg-gradient-to-r from-cyan-500 to-blue-600 text-white p-3 flex items-center justify-between flex-shrink-0"
              onMouseDown={handleMouseDown}
              style={isMinimized ? { cursor: isDragging ? 'grabbing' : 'grab' } : {}}
            >
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-white rounded-full animate-pulse"></div>
                <span className="font-bold text-sm">{isMinimized ? course.code.substring(0, 10) : `CLASE EN VIVO - ${course.code}`}</span>
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
                  onClick={leaveClass}
                  className="no-drag p-1.5 hover:bg-white/20 rounded transition"
                  title="Salir"
                >
                  <X size={16} />
                </button>
              </div>
            </div>
            )}

            {/* Contenido del modal */}
            {!isMinimized && (
              <div className="flex-1 overflow-auto bg-gray-900">
                {/* Sala estilo Zoom - IGUAL QUE EL DOCENTE */}
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

                      {/* Video del docente - SIEMPRE montado, ocultar si hay algo pinneado */}
                      <div className={`absolute inset-0 ${pinnedParticipant ? 'hidden' : 'block'}`}>
                        {/* ✅ DUAL STREAM: SIEMPRE mostrar pantalla compartida en panel principal (cuando está activa) */}
                        <video
                          ref={videoRef}
                          autoPlay={true}
                          muted={false}
                          playsInline={true}
                          className="w-full h-full object-contain"
                        />

                        {/* ✅ CRITICAL FIX: Verificar estados en el orden correcto */}
                        {/* ⚠️ DEFENSIVE CHECK: Solo mostrar placeholder si NO hay screen stream Y cámara OFF */}
                        {!isTeacherScreenSharing && !teacherScreenStream && !isTeacherCameraOn ? (
                          // Cámara desactivada Y NO compartiendo pantalla - Mostrar placeholder
                          <div className="absolute inset-0 flex flex-col items-center justify-center bg-gradient-to-br from-gray-800 to-gray-900 z-10">
                            <div className="relative">
                              <div className="absolute inset-0 bg-cyan-500/20 blur-3xl rounded-full"></div>
                              <div className="relative bg-gray-700/50 backdrop-blur-sm p-8 rounded-2xl border border-gray-600">
                                <VideoOff size={80} className="text-gray-400 mb-4 mx-auto" />
                                <p className="text-white text-xl font-semibold mb-2 text-center">Cámara desactivada</p>
                                <p className="text-gray-400 text-sm text-center">El docente ha desactivado su cámara</p>
                              </div>
                            </div>
                          </div>
                        ) : !hasStream ? (
                          // No hay stream aún - Conectando
                          <div className="absolute inset-0 flex flex-col items-center justify-center bg-gradient-to-br from-gray-800 to-gray-900">
                            <Loader className="animate-spin text-cyan-400 mb-4" size={48} />
                            <p className="text-white text-lg">
                              {isTeacherScreenSharing ? 'Cargando pantalla compartida...' : 'Conectando con el docente...'}
                            </p>
                            {isTeacherScreenSharing && (
                              <p className="text-gray-400 text-sm mt-2">Esto solo tomará un momento</p>
                            )}
                          </div>
                        ) : needsUserInteraction ? (
                          // Hay stream y cámara activa pero necesita interacción del usuario
                          <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/80 backdrop-blur-sm z-10">
                            <Play size={64} className="text-white mb-4" />
                            <p className="text-white text-lg mb-4">El navegador bloqueó la reproducción automática</p>
                            <button
                              onClick={async () => {
                                console.log('🔘 [STUDENT-IOS-FIX] Usuario presionó reproducir manualmente');

                                // ✅ CRITICAL FIX iOS: Reproducir video principal
                                if (videoRef.current) {
                                  try {
                                    await videoRef.current.play();
                                    console.log('✅ [STUDENT-IOS-FIX] Video principal reproduciendo');
                                  } catch (err) {
                                    console.error('❌ [STUDENT-IOS-FIX] Error al reproducir video:', err);
                                  }
                                }

                                // ✅ CRITICAL FIX iOS: Activar elemento de audio del docente
                                if (teacherAudioRef.current) {
                                  try {
                                    await teacherAudioRef.current.play();
                                    console.log('✅ [STUDENT-IOS-FIX] Audio del docente reproduciendo');
                                  } catch (err) {
                                    console.error('❌ [STUDENT-IOS-FIX] Error al reproducir audio docente:', err);
                                  }
                                }

                                // ✅ CRITICAL FIX iOS: Activar elementos de audio P2P de estudiantes
                                const audioPromises = [];
                                Object.keys(peerAudioRefs.current).forEach(viewerId => {
                                  const audioEl = peerAudioRefs.current[viewerId];
                                  if (audioEl) {
                                    console.log(`🔊 [STUDENT-IOS-FIX] Activando audio P2P de ${viewerId}`);
                                    audioPromises.push(
                                      audioEl.play()
                                        .then(() => console.log(`✅ [STUDENT-IOS-FIX] Audio P2P ${viewerId} activado`))
                                        .catch(err => console.warn(`⚠️ [STUDENT-IOS-FIX] Error audio P2P ${viewerId}:`, err))
                                    );
                                  }
                                });

                                // Esperar a que todos los audios se activen
                                await Promise.allSettled(audioPromises);

                                setNeedsUserInteraction(false);
                                showToastMessage('Transmisión iniciada', 'success');
                                console.log('✅ [STUDENT-IOS-FIX] Todos los medios activados');
                              }}
                              className="px-6 py-3 bg-gradient-to-r from-cyan-600 to-blue-600 text-white rounded-lg hover:shadow-lg transition font-semibold flex items-center gap-2"
                            >
                              <Play size={20} />
                              Reproducir Transmisión
                            </button>
                          </div>
                        ) : null}

                        {/* Nombre del docente / Indicador de screen sharing */}
                        {hasStream && (
                          <div className="absolute bottom-4 left-4 bg-black/60 backdrop-blur-sm px-3 py-1.5 rounded-lg z-20">
                            <span className="text-white text-sm font-semibold flex items-center gap-2">
                              {isTeacherScreenSharing ? (
                                <>
                                  <Monitor size={16} className="text-green-400" />
                                  Docente - Compartiendo pantalla
                                </>
                              ) : (
                                <>
                                  <UserCircle size={16} />
                                  Docente
                                </>
                              )}
                            </span>
                          </div>
                        )}
                      </div>

                      {/* Mi video pinneado - SIEMPRE montado si estoy pinneado */}
                      {pinnedParticipant === 'me' && (
                        <div className="absolute inset-0">
                          {isScreenSharing && screenStreamRef.current ? (
                            // ✅ CRITICAL FIX: Mostrar el stream REAL de pantalla compartida
                            <video
                              ref={(el) => {
                                if (el && screenStreamRef.current && el.srcObject !== screenStreamRef.current) {
                                  el.srcObject = screenStreamRef.current;
                                  el.play().catch(err => console.log('Autoplay prevented:', err));
                                }
                              }}
                              autoPlay={true}
                              muted={true}
                              playsInline={true}
                              className="w-full h-full object-contain"
                            />
                          ) : isCameraEnabled && myStream ? (
                            // Mostrar video de cámara
                            <video
                              ref={(el) => {
                                if (el && myStream && el.srcObject !== myStream) {
                                  el.srcObject = myStream;
                                  el.play().catch(err => console.log('Autoplay prevented:', err));
                                }
                              }}
                              autoPlay={true}
                              muted={true}
                              playsInline={true}
                              className="w-full h-full object-contain"
                            />
                          ) : (
                            // Placeholder cuando no hay cámara
                            <div className="w-full h-full flex flex-col items-center justify-center bg-gradient-to-br from-gray-800 to-gray-900">
                              <div className="w-32 h-32 bg-cyan-700/50 backdrop-blur-sm rounded-full flex items-center justify-center mb-4">
                                <UserCircle size={80} className="text-cyan-400" />
                              </div>
                              <p className="text-cyan-400 text-2xl font-semibold mb-2">{user?.name?.split(' ')[0] || 'Tú'}</p>
                              <p className="text-gray-400 text-sm">Cámara apagada</p>
                            </div>
                          )}

                          <div className="absolute bottom-4 left-4 bg-black/60 backdrop-blur-sm px-3 py-1.5 rounded-lg z-20">
                            <span className="text-white text-sm font-semibold flex items-center gap-2">
                              {isScreenSharing ? (
                                <>
                                  <Monitor size={16} className="text-green-400" />
                                  Tu pantalla compartida
                                </>
                              ) : (
                                <>
                                  <UserCircle size={16} />
                                  Tú
                                </>
                              )}
                            </span>
                          </div>
                        </div>
                      )}

                      {/* ✅ Cámara del docente pinneada (cuando está compartiendo pantalla y usuario hace doble clic) */}
                      {pinnedParticipant === 'teacher-camera' && teacherStreamRef.current && (
                        <div className="absolute inset-0">
                          <video
                            ref={(el) => {
                              if (el && teacherStreamRef.current && el.srcObject !== teacherStreamRef.current) {
                                console.log('📺 [STUDENT-DUAL] Mostrando CÁMARA en panel principal');
                                el.srcObject = teacherStreamRef.current;
                                el.play().catch(err => console.log('Autoplay prevented:', err));
                              }
                            }}
                            autoPlay={true}
                            muted={false}
                            playsInline={true}
                            className="w-full h-full object-contain"
                          />

                          {!isTeacherCameraOn && (
                            <div className="absolute inset-0 flex flex-col items-center justify-center bg-gradient-to-br from-gray-800 to-gray-900">
                              <div className="relative">
                                <div className="absolute inset-0 bg-cyan-500/20 blur-3xl rounded-full"></div>
                                <div className="relative bg-gray-700/50 backdrop-blur-sm p-8 rounded-2xl border border-gray-600">
                                  <VideoOff size={80} className="text-gray-400 mb-4 mx-auto" />
                                  <p className="text-white text-xl font-semibold mb-2 text-center">Cámara desactivada</p>
                                  <p className="text-gray-400 text-sm text-center">El docente ha desactivado su cámara</p>
                                </div>
                              </div>
                            </div>
                          )}

                          <div className="absolute bottom-4 left-4 bg-black/60 backdrop-blur-sm px-3 py-1.5 rounded-lg z-20">
                            <span className="text-white text-sm font-semibold flex items-center gap-2">
                              <Video size={16} className="text-cyan-400" />
                              Cámara del Docente
                            </span>
                          </div>
                        </div>
                      )}

                      {/* ✅ DUAL STREAM: Pantalla compartida del docente pinneada en panel principal */}
                      {pinnedParticipant === 'teacher-screen' && teacherScreenStream && (
                        <div className="absolute inset-0">
                          <video
                            ref={(el) => {
                              if (el && teacherScreenStream && el.srcObject !== teacherScreenStream) {
                                console.log('📺 [STUDENT-DUAL] Asignando pantalla compartida al panel principal');
                                el.srcObject = teacherScreenStream;
                                el.play().catch(err => console.log('Autoplay prevented:', err));
                              }
                            }}
                            autoPlay={true}
                            muted={false}
                            playsInline={true}
                            className="w-full h-full object-contain bg-black"
                          />

                          <div className="absolute bottom-4 left-4 bg-black/60 backdrop-blur-sm px-3 py-1.5 rounded-lg z-20">
                            <span className="text-white text-sm font-semibold flex items-center gap-2">
                              <Monitor size={16} className="text-green-400" />
                              Pantalla del Docente
                            </span>
                          </div>
                        </div>
                      )}

                      {/* ✅ OTRO ESTUDIANTE PINNEADO - Mostrar VIDEO REAL cuando se hace doble clic en otro alumno */}
                      {pinnedParticipant && pinnedParticipant !== 'me' && pinnedParticipant !== 'teacher-camera' && pinnedParticipant !== 'teacher-screen' && pinnedParticipant !== null && (() => {
                        const pinnedViewer = viewersList.find(v => v.id === pinnedParticipant);
                        const screenStream = peerStudentScreenStreams[pinnedParticipant];
                        const cameraStream = peerStudentStreams[pinnedParticipant];

                        // ✅ EXACTAMENTE IGUAL QUE DOCENTE: Si tiene pantalla, mostrar pantalla. Sino, mostrar cámara.
                        return (
                          <div className="absolute inset-0">
                            {(screenStream || cameraStream) ? (
                              <>
                                {/* Mostrar video del compañero (pantalla o cámara) */}
                                <video
                                  ref={pinnedStudentVideoRef}
                                  autoPlay
                                  muted
                                  playsInline
                                  className="w-full h-full object-contain"
                                />

                                {/* ✅ OVERLAY cuando la cámara está desactivada (solo si NO está compartiendo pantalla) */}
                                {!screenStream && peerStudentCameraStates[pinnedParticipant] === false && (
                                  <div className="absolute inset-0 flex flex-col items-center justify-center bg-gradient-to-br from-gray-800 to-gray-900 z-20">
                                    <div className="relative">
                                      <div className="absolute inset-0 bg-blue-500/20 blur-3xl rounded-full"></div>
                                      <div className="relative bg-gray-700/50 backdrop-blur-sm p-8 rounded-2xl border border-gray-600">
                                        <VideoOff size={80} className="text-gray-400 mb-4 mx-auto" />
                                        <p className="text-white text-xl font-semibold mb-2 text-center">Cámara desactivada</p>
                                        <p className="text-gray-400 text-sm text-center">{pinnedViewer?.name || 'Compañero'}</p>
                                      </div>
                                    </div>
                                  </div>
                                )}
                              </>
                            ) : (
                              // Sin stream
                              <div className="w-full h-full flex flex-col items-center justify-center bg-gradient-to-br from-gray-800 to-gray-900">
                                <div className="w-32 h-32 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-full flex items-center justify-center mb-4 shadow-2xl">
                                  <UserCircle size={64} className="text-white" />
                                </div>
                                <p className="text-white text-2xl font-bold mb-2">
                                  {pinnedViewer?.name?.split(' ')[0] || 'Compañero'}
                                </p>
                                <p className="text-gray-400 text-sm">Este compañero no tiene cámara activa</p>
                              </div>
                            )}

                            <div className="absolute bottom-4 left-4 bg-black/60 backdrop-blur-sm px-3 py-1.5 rounded-lg z-20">
                              <span className="text-white text-sm font-semibold flex items-center gap-2">
                                {screenStream ? (
                                  <>
                                    <Monitor size={16} className="text-green-400" />
                                    {pinnedViewer?.name?.split(' ')[0] || 'Compañero'} - Pantalla
                                  </>
                                ) : (
                                  <>
                                    <UserCircle size={16} />
                                    {pinnedViewer?.name?.split(' ')[0] || 'Compañero'}
                                  </>
                                )}
                              </span>
                            </div>
                          </div>
                        );
                      })()}

                      {/* Pizarra Overlay - SIEMPRE visible para mostrar dibujos remotos y locales */}
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
                          zIndex: 15,
                          pointerEvents: showWhiteboard ? 'auto' : 'none',
                          userSelect: 'none',
                          WebkitUserSelect: 'none',
                          MozUserSelect: 'none',
                          msUserSelect: 'none'
                          // ✅ CRITICAL FIX: Canvas SIEMPRE visible para mostrar dibujos remotos
                          // No usar opacity: 0 porque oculta los dibujos del docente
                        }}
                      />
                    </div>

                    {/* Panel de participantes - Diseño con paginación en móvil, scroll en desktop */}
                    <div className="flex flex-col gap-2 w-full md:w-auto" style={{
                      width: isMobile ? '100%' : (isFullscreen ? '320px' : '280px'),
                      minWidth: isMobile ? '100%' : (isFullscreen ? '320px' : '280px'),
                      height: isMobile ? 'auto' : 'auto',
                      maxHeight: isMobile ? 'none' : 'auto'
                    }}>
                      {/* Contenedor SOLO para los recuadros de participantes - SIN SCROLL en móvil, CON SCROLL en desktop */}
                      <div className={`flex gap-2 flex-col ${isMobile ? 'overflow-hidden' : 'overflow-x-hidden pr-1 scrollbar-thin scrollbar-thumb-gray-600 scrollbar-track-gray-800'}`} style={{
                        flex: isMobile ? 'none' : 1,
                        overflowY: isMobile ? 'hidden' : 'auto',
                        maxHeight: isMobile ? 'none' : (isFullscreen ? 'calc(100vh - 200px)' : 'calc(85vh - 200px)'),
                        WebkitOverflowScrolling: isMobile ? 'auto' : 'touch', // ✅ iOS FIX
                        touchAction: isMobile ? 'pan-y pinch-zoom' : 'auto' // ✅ iOS FIX: Permitir solo scroll vertical en móvil
                      }}>
                        {/* Todos los recuadros de participantes van aquí */}

                      {/* ✅ DUAL STREAM: Cuando hay pantalla compartida Y NO está pinneada, mostrar CÁMARA en panel lateral */}
                      {teacherScreenStream && !pinnedParticipant && teacherStreamRef.current && (
                        <div
                          className="bg-gray-800 rounded-lg overflow-hidden relative group cursor-pointer border-2 border-cyan-500"
                          style={{
                            height: isFullscreen ? '180px' : '157px',
                            minHeight: isFullscreen ? '180px' : '157px',
                            width: '100%',
                            flexShrink: 0
                          }}
                          onDoubleClick={() => {
                            console.log('🖱️ [STUDENT-DUAL] Doble clic en cámara del docente - mostrando cámara en principal');
                            handleSwapVideo('teacher-camera');
                          }}
                          title="Cámara del Docente - Doble clic para ver en principal"
                        >
                          <video
                            ref={(el) => {
                              teacherCameraPipRef.current = el;
                              if (el && teacherStreamRef.current && el.srcObject !== teacherStreamRef.current) {
                                console.log('📺 [STUDENT-DUAL] Asignando cámara al panel lateral');
                                el.srcObject = teacherStreamRef.current;
                                el.play().catch(err => console.log('Autoplay prevented:', err));
                              }
                            }}
                            autoPlay={true}
                            muted={false}
                            playsInline={true}
                            className="w-full h-full object-contain"
                          />

                          {!isTeacherCameraOn && (
                            <div className="absolute inset-0 flex flex-col items-center justify-center bg-gradient-to-br from-gray-800 to-gray-900 z-10">
                              <div className="w-16 h-16 bg-gray-700/50 backdrop-blur-sm rounded-full flex items-center justify-center mb-2">
                                <VideoOff size={32} className="text-gray-400" />
                              </div>
                              <p className="text-white text-xs font-semibold mb-1">Docente</p>
                              <p className="text-gray-400 text-xs">Cámara apagada</p>
                            </div>
                          )}

                          <div className="absolute bottom-1 left-1 right-1 bg-black/60 backdrop-blur-sm px-2 py-1 rounded text-center">
                            <span className="text-xs text-white truncate font-semibold flex items-center justify-center gap-1">
                              <Video size={12} className="text-cyan-400" />
                              Docente - Cámara
                            </span>
                          </div>

                          <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition rounded-lg"></div>
                        </div>
                      )}

                      {/* ✅ DUAL STREAM: Cuando la CÁMARA está pinneada, mostrar PANTALLA COMPARTIDA en panel lateral */}
                      {pinnedParticipant === 'teacher-camera' && teacherScreenStream && (
                        <div
                          className="bg-gray-800 rounded-lg overflow-hidden relative group cursor-pointer border-2 border-green-500"
                          style={{ height: isFullscreen ? '180px' : '157px', minHeight: isFullscreen ? '180px' : '157px', width: '100%' }}
                          onDoubleClick={() => {
                            console.log('🖱️ [STUDENT-DUAL] Doble clic en pantalla compartida - mostrando pantalla en principal');
                            setPinnedParticipant(null); // Volver a mostrar pantalla compartida en principal
                            showToastMessage('Pantalla compartida del docente en principal', 'info');
                          }}
                          title="Pantalla Compartida del Docente - Doble clic para ver en principal"
                        >
                          <video
                            ref={(el) => {
                              if (el && teacherScreenStream && el.srcObject !== teacherScreenStream) {
                                console.log('📺 [STUDENT-DUAL] Asignando pantalla compartida al panel lateral');
                                el.srcObject = teacherScreenStream;
                                el.play().catch(err => console.log('Autoplay prevented:', err));
                              }
                            }}
                            autoPlay={true}
                            muted={false}
                            playsInline={true}
                            className="w-full h-full object-contain"
                          />

                          <div className="absolute bottom-1 left-1 right-1 bg-black/60 backdrop-blur-sm px-2 py-1 rounded text-center">
                            <span className="text-xs text-white truncate font-semibold flex items-center justify-center gap-1">
                              <Monitor size={12} className="text-green-400" />
                              Docente - Compartiendo pantalla
                            </span>
                          </div>

                          <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition rounded-lg"></div>
                        </div>
                      )}

                      {/* ✅ CUANDO ESTOY PINNEADO: Mostrar el docente en el panel (+ mi cámara si estoy compartiendo pantalla) */}
                      {pinnedParticipant === 'me' && (
                        <>
                          {/* 1. Video del docente */}
                          <div
                            className="bg-gray-800 rounded-lg overflow-hidden relative group cursor-pointer border-2 border-red-500" style={{ height: isFullscreen ? '180px' : '157px', minHeight: isFullscreen ? '180px' : '157px', width: '100%' }}
                            onDoubleClick={() => handleSwapVideo('me')}
                            title="Doble clic para intercambiar"
                          >
                            {isTeacherCameraOn && teacherStreamRef.current ? (
                              <video
                                ref={(el) => {
                                  if (el && teacherStreamRef.current && el.srcObject !== teacherStreamRef.current) {
                                    el.srcObject = teacherStreamRef.current;
                                    el.play().catch(err => console.log('Autoplay prevented:', err));
                                  }
                                }}
                                autoPlay={true}
                                muted={false}
                                playsInline={true}
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              <div className="absolute inset-0 flex flex-col items-center justify-center bg-gradient-to-br from-gray-800 to-gray-900">
                                <div className="w-16 h-16 bg-gray-700/50 backdrop-blur-sm rounded-full flex items-center justify-center mb-2">
                                  <VideoOff size={32} className="text-gray-400" />
                                </div>
                                <p className="text-gray-400 text-xs">Cámara apagada</p>
                              </div>
                            )}

                            <div className="absolute bottom-1 left-1 right-1 bg-black/60 backdrop-blur-sm px-2 py-1 rounded text-center">
                              <span className="text-xs text-white truncate font-semibold">
                                {isTeacherScreenSharing ? 'Docente - Pantalla' : 'Docente'}
                              </span>
                            </div>

                            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition rounded-lg"></div>
                          </div>

                          {/* 2. Mi cámara (SOLO si estoy compartiendo pantalla) */}
                          {isScreenSharing && (
                            <div
                              className="bg-gray-800 rounded-lg overflow-hidden relative group border-2 border-cyan-500" style={{ height: isFullscreen ? '180px' : '157px', minHeight: isFullscreen ? '180px' : '157px', width: '100%' }}
                              title="Tu cámara"
                            >
                              {isCameraEnabled && myStream ? (
                                <video
                                  ref={(el) => {
                                    if (el && myStream) {
                                      // ✅ FIX: Crear stream solo con track de cámara (no incluir pantalla)
                                      const videoTracks = myStream.getVideoTracks();
                                      // El primer video track es la cámara, el segundo es la pantalla
                                      const cameraTrack = videoTracks[0];

                                      if (cameraTrack) {
                                        const cameraOnlyStream = new MediaStream([cameraTrack]);
                                        if (el.srcObject !== cameraOnlyStream) {
                                          el.srcObject = cameraOnlyStream;
                                          el.play().catch(err => console.log('Autoplay prevented:', err));
                                        }
                                      }
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
                                  <p className="text-gray-400 text-xs">Cámara apagada</p>
                                </div>
                              )}

                              <div className="absolute bottom-1 left-1 right-1 bg-black/60 backdrop-blur-sm px-2 py-1 rounded text-center">
                                <span className="text-xs text-white truncate font-semibold">Tu cámara</span>
                              </div>
                            </div>
                          )}
                        </>
                      )}

                      {/* ✅ CUANDO OTRO ESTUDIANTE ESTÁ PINNEADO: Mostrar el docente en el panel */}
                      {pinnedParticipant &&
                       pinnedParticipant !== 'me' &&
                       pinnedParticipant !== 'teacher-camera' &&
                       pinnedParticipant !== null && (
                        <div
                          className="bg-gray-800 rounded-lg overflow-hidden relative group cursor-pointer border-2 border-red-500" style={{ height: isFullscreen ? '180px' : '157px', minHeight: isFullscreen ? '180px' : '157px', width: '100%' }}
                          onDoubleClick={() => handleSwapVideo(pinnedParticipant)}
                          title="Docente - Doble clic para volver a ver en principal"
                        >
                          {isTeacherCameraOn && teacherStreamRef.current ? (
                            <video
                              ref={(el) => {
                                if (el && teacherStreamRef.current && el.srcObject !== teacherStreamRef.current) {
                                  el.srcObject = teacherStreamRef.current;
                                  el.play().catch(err => console.log('Autoplay prevented:', err));
                                }
                              }}
                              autoPlay={true}
                              muted={false}
                              playsInline={true}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <div className="absolute inset-0 flex flex-col items-center justify-center bg-gradient-to-br from-gray-800 to-gray-900">
                              <div className="w-16 h-16 bg-gray-700/50 backdrop-blur-sm rounded-full flex items-center justify-center mb-2">
                                <VideoOff size={32} className="text-gray-400" />
                              </div>
                              <p className="text-gray-400 text-xs">Cámara apagada</p>
                            </div>
                          )}

                          <div className="absolute bottom-1 left-1 right-1 bg-black/60 backdrop-blur-sm px-2 py-1 rounded text-center">
                            <span className="text-xs text-white truncate font-semibold">Docente</span>
                          </div>

                          <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition rounded-lg"></div>
                        </div>
                      )}

                      {/* ✅ PANEL DE PARTICIPANTES COMBINADO - Incluye "Tú" y otros estudiantes con paginación en móvil */}
                      {(() => {
                        // Crear array de participantes para paginación
                        const allParticipants = [];

                        // Agregar "Tú" si no estás pinneado
                        if (pinnedParticipant !== 'me') {
                          allParticipants.push({ type: 'me', id: 'me' });
                        }

                        // Agregar otros estudiantes
                        const filteredViewers = viewersList.filter(viewer => viewer.id !== socketRef.current?.id);
                        filteredViewers.forEach(viewer => {
                          allParticipants.push({ type: 'peer', data: viewer });
                        });

                        // En móvil, aplicar paginación al array completo
                        const participantsToShow = isMobile
                          ? allParticipants.slice(
                              currentPage * ITEMS_PER_PAGE_MOBILE,
                              (currentPage + 1) * ITEMS_PER_PAGE_MOBILE
                            )
                          : allParticipants;

                        return participantsToShow.map((participant, index) => {
                          // Renderizar "Tú"
                          if (participant.type === 'me') {
                            return (
                              <div key="me">
                          {/* Si está compartiendo pantalla, mostrar DOS recuadros: pantalla compartida y cámara */}
                          {isScreenSharing ? (
                            <>
                              {/* 1. Tu pantalla compartida - MOSTRAR VIDEO REAL */}
                              <div
                                className="bg-gray-800 rounded-lg overflow-hidden relative group cursor-pointer border-2 border-green-500" style={{ height: isFullscreen ? '180px' : '157px', minHeight: isFullscreen ? '180px' : '157px', width: '100%' }}
                                onDoubleClick={() => {
                                  console.log('🖱️ [STUDENT-CLICK] Doble clic en MI pantalla compartida del panel');
                                  handleSwapVideo('me');
                                }}
                                title="Doble clic para ver tu pantalla en principal"
                              >
                                {/* ✅ MOSTRAR VIDEO REAL DE PANTALLA COMPARTIDA */}
                                {screenStreamRef.current ? (
                                  <video
                                    ref={(el) => {
                                      if (el && screenStreamRef.current && el.srcObject !== screenStreamRef.current) {
                                        el.srcObject = screenStreamRef.current;
                                        el.play().catch(err => console.log('Autoplay prevented:', err));
                                      }
                                    }}
                                    autoPlay={true}
                                    muted={true}
                                    playsInline={true}
                                    className="w-full h-full object-contain"
                                  />
                                ) : (
                                  <div className="w-full h-full flex flex-col items-center justify-center bg-gradient-to-br from-green-800 to-green-900">
                                    <div className="w-16 h-16 bg-green-700/50 backdrop-blur-sm rounded-full flex items-center justify-center mb-2">
                                      <Monitor size={32} className="text-green-400" />
                                    </div>
                                    <p className="text-green-400 text-xs font-semibold">Cargando pantalla...</p>
                                  </div>
                                )}

                                <div className="absolute bottom-1 left-1 right-1 bg-black/60 backdrop-blur-sm px-2 py-1 rounded text-center">
                                  <span className="text-xs text-white truncate font-semibold flex items-center justify-center gap-1">
                                    <Monitor size={12} className="text-green-400" />
                                    Tu pantalla
                                  </span>
                                </div>

                                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition rounded-lg"></div>
                              </div>

                              {/* 2. Tu cámara (si está activa) o placeholder */}
                              <div
                                className="bg-gray-800 rounded-lg overflow-hidden relative group cursor-pointer border-2 border-cyan-500" style={{ height: isFullscreen ? '180px' : '157px', minHeight: isFullscreen ? '180px' : '157px', width: '100%' }}
                                title="Tu cámara"
                              >
                                {isCameraEnabled && myStream ? (
                                  <video
                                    ref={(el) => {
                                      if (el && myStream && el.srcObject !== myStream) {
                                        el.srcObject = myStream;
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
                                    <p className="text-gray-400 text-xs">Cámara apagada</p>
                                  </div>
                                )}

                                <div className="absolute bottom-1 left-1 right-1 bg-black/60 backdrop-blur-sm px-2 py-1 rounded text-center">
                                  <span className="text-xs text-white truncate font-semibold">
                                    Tu cámara
                                  </span>
                                </div>

                                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition rounded-lg"></div>
                              </div>
                            </>
                          ) : (
                            /* Si NO está compartiendo pantalla, mostrar UN recuadro: tu cámara o placeholder */
                            <div
                              className="bg-gray-800 rounded-lg overflow-hidden relative group cursor-pointer border-2 border-cyan-500" style={{ height: isFullscreen ? '180px' : '157px', minHeight: isFullscreen ? '180px' : '157px', width: '100%' }}
                              onDoubleClick={() => handleSwapVideo('me')}
                              title="Doble clic para verte en principal"
                            >
                              {isCameraEnabled && myStream ? (
                                <video
                                  ref={(el) => {
                                    if (el && myStream && el.srcObject !== myStream) {
                                      el.srcObject = myStream;
                                      el.play().catch(err => console.log('Autoplay prevented:', err));
                                    }
                                  }}
                                  autoPlay={true}
                                  muted={true}
                                  playsInline={true}
                                  className="w-full h-full object-cover"
                                />
                              ) : (
                                /* Placeholder cuando no hay cámara activa */
                                <div className="absolute inset-0 flex flex-col items-center justify-center bg-gradient-to-br from-gray-800 to-gray-900">
                                  <div className="w-16 h-16 bg-cyan-700/50 backdrop-blur-sm rounded-full flex items-center justify-center mb-2">
                                    <UserCircle size={32} className="text-cyan-400" />
                                  </div>
                                  <p className="text-cyan-400 text-xs font-semibold">{user?.name?.split(' ')[0] || 'Tú'}</p>
                                  <p className="text-gray-400 text-xs mt-1">Cámara apagada</p>
                                </div>
                              )}

                              <div className="absolute bottom-1 left-1 right-1 bg-black/60 backdrop-blur-sm px-2 py-1 rounded text-center">
                                <span className="text-xs text-white truncate font-semibold">
                                  Tú
                                </span>
                              </div>

                              <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition rounded-lg"></div>
                            </div>
                          )}
                              </div>
                            );
                          }

                          // Renderizar otros estudiantes (peers)
                          if (participant.type === 'peer') {
                            const viewer = participant.data;
                          const isThisViewerPinned = pinnedParticipant === viewer.id;
                          const peerCameraStream = peerStudentStreams[viewer.id];
                          const peerScreenStream = peerStudentScreenStreams[viewer.id];

                          // ✅ CRITICAL FIX: SIEMPRE renderizar elementos de video (aunque estén pinned)
                          // para que los useEffects puedan asignar streams. Si está pinned, solo ocultarlos visualmente.

                          // ✅ DUAL STREAM: Si tiene pantalla compartida, mostrar DOS recuadros
                          if (peerScreenStream) {
                            return (
                              <div key={viewer.id || index} className="flex flex-col gap-2 w-full">
                                {/* 1. Pantalla compartida - visible u oculto pero SIEMPRE renderizado */}
                                <div
                                  className={`bg-gray-800 rounded-lg overflow-hidden relative group cursor-pointer border-2 border-green-500 ${isThisViewerPinned ? 'hidden' : ''}`}
                                  style={{ height: isFullscreen ? '180px' : '157px', minHeight: isFullscreen ? '180px' : '157px', width: '100%' }}
                                  onDoubleClick={() => {
                                    console.log(`🖱️ [STUDENT-CLICK] Doble clic en pantalla de: ${viewer.name}`);
                                    handleSwapVideo(viewer.id);
                                  }}
                                  title={`${viewer.name?.split(' ')[0]} - Pantalla compartida`}
                                >
                                  <video
                                    ref={(el) => {
                                      if (el && viewer.id && el.srcObject !== peerStudentScreenStreams[viewer.id]) {
                                        peerVideoRefs.current[`${viewer.id}-screen`] = el;
                                        if (peerStudentScreenStreams[viewer.id]) {
                                          console.log(`📺 [STUDENT-P2P-SCREEN-REF] Asignando stream de pantalla de ${viewer.name}`);
                                          el.srcObject = peerStudentScreenStreams[viewer.id];
                                          el.setAttribute('playsinline', 'true');
                                          el.setAttribute('autoplay', 'true');
                                          el.muted = false;
                                          el.play()
                                            .then(() => console.log(`✅ [STUDENT-P2P-SCREEN-REF] Pantalla reproduciéndose: ${viewer.name}`))
                                            .catch(err => console.error(`❌ [STUDENT-P2P-SCREEN-REF] Error:`, err));
                                        }
                                      }
                                    }}
                                    autoPlay={true}
                                    muted={false}
                                    playsInline={true}
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

                                {/* 2. Cámara del compañero */}
                                <div
                                  className="bg-gray-800 rounded-lg overflow-hidden relative group cursor-pointer border-2 border-blue-500"
                                  style={{ height: isFullscreen ? '180px' : '157px', minHeight: isFullscreen ? '180px' : '157px', width: '100%' }}
                                  title={`${viewer.name?.split(' ')[0]} - Cámara`}
                                >
                                  <video
                                    ref={(el) => {
                                      if (el && viewer.id && el.srcObject !== peerStudentStreams[viewer.id]) {
                                        peerVideoRefs.current[`${viewer.id}-camera`] = el;
                                        if (peerStudentStreams[viewer.id]) {
                                          console.log(`📺 [STUDENT-P2P-DUAL-REF] Asignando stream de cámara de ${viewer.name}`);
                                          el.srcObject = peerStudentStreams[viewer.id];
                                          el.setAttribute('playsinline', 'true');
                                          el.setAttribute('autoplay', 'true');
                                          el.muted = false;
                                          el.play()
                                            .then(() => console.log(`✅ [STUDENT-P2P-DUAL-REF] Cámara reproduciéndose: ${viewer.name}`))
                                            .catch(err => console.error(`❌ [STUDENT-P2P-DUAL-REF] Error:`, err));
                                        }
                                      }
                                    }}
                                    autoPlay={true}
                                    muted={false}
                                    playsInline={true}
                                    className="w-full h-full object-cover"
                                  />

                                  {/* Overlay cuando cámara está apagada */}
                                  {peerStudentCameraStates[viewer.id] === false && (
                                    <div className="absolute inset-0 flex flex-col items-center justify-center bg-gradient-to-br from-gray-800 to-gray-900 z-10">
                                      <div className="w-16 h-16 bg-gray-700/50 backdrop-blur-sm rounded-full flex items-center justify-center mb-2">
                                        <VideoOff size={32} className="text-gray-400" />
                                      </div>
                                      <p className="text-white text-xs font-semibold mb-1">{viewer.name?.split(' ')[0] || 'Compañero'}</p>
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
                          return (
                            <div
                              key={viewer.id || index}
                              className={`bg-gray-800 rounded-lg overflow-hidden relative group cursor-pointer border-2 border-blue-500 hover:border-blue-400 ${isThisViewerPinned ? 'hidden' : ''}`}
                              style={{ height: isFullscreen ? '180px' : '157px', minHeight: isFullscreen ? '180px' : '157px', width: '100%' }}
                              onDoubleClick={() => {
                                console.log(`🖱️ [STUDENT-CLICK] Doble clic en estudiante: ${viewer.name}`);
                                handleSwapVideo(viewer.id);
                              }}
                              title={`${viewer.name?.split(' ')[0]} - Doble clic para ver en principal`}
                            >
                              {/* ✅ CRITICAL FIX: Asignar stream igual que el docente - en el ref callback */}
                              <video
                                key={`peer-video-${viewer.id}`}
                                ref={(el) => {
                                  if (el && viewer.id && el.srcObject !== peerStudentStreams[viewer.id]) {
                                    peerVideoRefs.current[`${viewer.id}-camera`] = el;
                                    if (peerStudentStreams[viewer.id]) {
                                      console.log(`📺 [STUDENT-P2P-REF] Asignando stream de ${viewer.name} (${viewer.id})`);
                                      el.srcObject = peerStudentStreams[viewer.id];

                                      // Configurar atributos (igual que el docente)
                                      el.setAttribute('playsinline', 'true');
                                      el.setAttribute('autoplay', 'true');
                                      el.muted = false;

                                      // Intentar reproducir
                                      el.play()
                                        .then(() => {
                                          console.log(`✅ [STUDENT-P2P-REF] Video reproduciéndose: ${viewer.name}`);
                                        })
                                        .catch(err => {
                                          console.error(`❌ [STUDENT-P2P-REF] Error reproduciendo video de ${viewer.name}:`, err);
                                        });
                                    }
                                  }
                                }}
                                autoPlay={true}
                                muted={false}
                                playsInline={true}
                                className="w-full h-full object-cover"
                              />

                              {/* ✅ OVERLAY cuando cámara está apagada (IGUAL QUE DOCENTE) */}
                              {peerStudentCameraStates[viewer.id] === false && (
                                <div className="absolute inset-0 flex flex-col items-center justify-center bg-gradient-to-br from-gray-800 to-gray-900 z-10">
                                  <div className="w-16 h-16 bg-gray-700/50 backdrop-blur-sm rounded-full flex items-center justify-center mb-2">
                                    <VideoOff size={32} className="text-gray-400" />
                                  </div>
                                  <p className="text-white text-xs font-semibold mb-1">{viewer.name?.split(' ')[0] || 'Compañero'}</p>
                                  <p className="text-gray-400 text-xs">Cámara apagada</p>
                                </div>
                              )}

                              {/* ✅ PLACEHOLDER cuando NO hay stream y cámara no está explícitamente apagada */}
                              {!peerCameraStream && peerStudentCameraStates[viewer.id] !== false && (
                                <div className="absolute inset-0 flex flex-col items-center justify-center bg-gradient-to-br from-gray-800 to-gray-900">
                                  <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-full flex items-center justify-center mb-2">
                                    <UserCircle size={32} className="text-white" />
                                  </div>
                                  <p className="text-white text-sm font-semibold truncate px-2 max-w-full">
                                    {viewer.name?.split(' ')[0] || `Estudiante ${index + 1}`}
                                  </p>
                                  <p className="text-gray-400 text-xs mt-1">Sin cámara</p>
                                </div>
                              )}

                              <div className="absolute bottom-1 left-1 right-1 bg-black/60 backdrop-blur-sm px-2 py-1 rounded text-center">
                                <span className="text-xs text-white truncate font-semibold">
                                  {viewer.name?.split(' ')[0] || `Estudiante ${index + 1}`}
                                </span>
                              </div>
                              <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition rounded-lg"></div>
                            </div>
                          );
                          }

                          return null; // No renderizar nada para tipos desconocidos
                        });
                      })()}
                      </div>
                      {/* Fin del contenedor */}

                      {/* Botones de paginación - Solo en móvil */}
                      {(() => {
                        // Calcular total de participantes para paginación
                        let totalParticipants = viewersList.filter(viewer => viewer.id !== socketRef.current?.id).length;
                        if (pinnedParticipant !== 'me') {
                          totalParticipants += 1; // Incluir "Tú"
                        }
                        const totalPages = Math.ceil(totalParticipants / ITEMS_PER_PAGE_MOBILE);

                        return isMobile && totalParticipants > ITEMS_PER_PAGE_MOBILE && (
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
                              {currentPage + 1} / {totalPages}
                            </span>

                            <button
                              onClick={() => setCurrentPage(Math.min(totalPages - 1, currentPage + 1))}
                              disabled={currentPage >= totalPages - 1}
                              className={`p-2 rounded-lg transition ${
                                currentPage >= totalPages - 1
                                  ? 'bg-gray-700 text-gray-500 cursor-not-allowed'
                                  : 'bg-blue-600 hover:bg-blue-700 text-white'
                              }`}
                              title="Página siguiente"
                            >
                              <ChevronRight className="w-5 h-5" />
                            </button>
                          </div>
                        );
                      })()}
                    </div>
                  </div>

                  {/* Controles */}
                  <div className="bg-gray-800 p-2 md:p-3 flex items-center justify-between gap-2 flex-wrap md:flex-nowrap">
                    {/* Indicador de participantes (solo visual) - Oculto en móvil pequeño */}
                    <div className="hidden md:flex items-center gap-2 px-3 py-2 bg-gray-700 rounded-lg">
                      <Users size={16} className="text-cyan-400 md:w-[18px] md:h-[18px]" />
                      <span className="text-white text-xs md:text-sm font-semibold">{viewers} participantes</span>
                    </div>

                <div className="flex gap-1 md:gap-2 flex-wrap md:flex-nowrap">
                  {/* Controles de video/audio del estudiante */}
                  <button
                    onClick={toggleMute}
                    disabled={isForceMuted && isMuted}
                    className={`p-2 md:p-3 rounded-lg transition ${
                      isMuted ? 'bg-red-500 hover:bg-red-600' : 'bg-gray-700 hover:bg-gray-600'
                    } text-white ${isForceMuted && isMuted ? 'opacity-50 cursor-not-allowed' : ''}`}
                    title={isForceMuted && isMuted ? 'El docente te ha silenciado' : (isMuted ? 'Activar micrófono' : 'Silenciar')}
                  >
                    {isMuted ? <MicOff className="w-4 h-4 md:w-5 md:h-5" /> : <Mic className="w-4 h-4 md:w-5 md:h-5" />}
                  </button>

                  <button
                    onClick={toggleCamera}
                    className={`p-2 md:p-3 rounded-lg transition ${
                      !isCameraEnabled ? 'bg-red-500 hover:bg-red-600' : 'bg-gray-700 hover:bg-gray-600'
                    } text-white`}
                    title={isCameraEnabled ? 'Desactivar cámara' : 'Activar cámara'}
                  >
                    {isCameraEnabled ? <Video className="w-4 h-4 md:w-5 md:h-5" /> : <VideoOff className="w-4 h-4 md:w-5 md:h-5" />}
                  </button>

                  <button
                    onClick={isScreenSharing ? stopScreenShare : requestScreenShare}
                    disabled={screenSharePending || isScreenShareBlocked}
                    className={`p-2 md:p-3 rounded-lg transition ${
                      isScreenSharing ? 'bg-blue-500 hover:bg-blue-600' : 'bg-gray-700 hover:bg-gray-600'
                    } text-white disabled:opacity-50 disabled:cursor-not-allowed`}
                    title={
                      isScreenShareBlocked
                        ? 'El docente ha bloqueado compartir pantalla'
                        : isScreenSharing
                        ? 'Dejar de compartir pantalla'
                        : 'Compartir pantalla'
                    }
                  >
                    {screenSharePending ? (
                      <Loader className="w-4 h-4 md:w-5 md:h-5 animate-spin" />
                    ) : isScreenSharing ? (
                      <MonitorOff className="w-4 h-4 md:w-5 md:h-5" />
                    ) : (
                      <Monitor className="w-4 h-4 md:w-5 md:h-5" />
                    )}
                  </button>

                  <div className="hidden md:block h-10 w-px bg-gray-600 mx-1"></div>

                  {/* Controles de Pizarra */}
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

                  {/* Botón de descarga SIEMPRE visible cuando hay pizarra o contenido */}
                  <button
                    onClick={downloadWhiteboard}
                    className="p-2 md:p-3 rounded-lg bg-blue-600 hover:bg-blue-700 text-white transition"
                    title="Descargar pizarra"
                  >
                    <Download className="w-4 h-4 md:w-5 md:h-5" />
                  </button>

                  <div className="hidden md:block h-10 w-px bg-gray-600 mx-1"></div>

                  <button
                    onClick={() => setShowChat(!showChat)}
                    className={`p-2 md:p-3 rounded-lg transition ${
                      showChat ? 'bg-cyan-500 hover:bg-cyan-600' : 'bg-gray-700 hover:bg-gray-600'
                    } text-white`}
                  >
                    <MessageCircle className="w-4 h-4 md:w-5 md:h-5" />
                  </button>

                  <button
                    onClick={toggleFullscreen}
                    className="p-2 md:p-3 rounded-lg bg-gray-700 hover:bg-gray-600 text-white transition"
                    title={isFullscreen ? 'Salir de pantalla completa' : 'Pantalla completa'}
                  >
                    {isFullscreen ? <Minimize className="w-4 h-4 md:w-5 md:h-5" /> : <Maximize className="w-4 h-4 md:w-5 md:h-5" />}
                  </button>

                  {/* Botón de Salir */}
                  <button
                    onClick={leaveClass}
                    className="p-2 md:p-3 rounded-lg bg-red-600 hover:bg-red-700 text-white transition"
                    title="Salir de la clase"
                  >
                    <LogOut className="w-4 h-4 md:w-5 md:h-5" />
                  </button>
                </div>
                  </div>

                </div>
              </div>
        )}

      {/* Contenido del modal - versión minimizada */}
      {isMinimized && (
        <div className="flex-1 bg-black relative aspect-video">
          <video
            ref={videoRef}
            autoPlay={true}
            muted={false}
            playsInline={true}
            className="w-full h-full object-contain"
          />
          {/* ✅ Overlay for minimized view when camera is off */}
          {!isTeacherCameraOn && (
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-gray-800 z-10">
              <VideoOff size={32} className="text-gray-400 mb-2" />
              <p className="text-gray-300 text-xs">Cámara desactivada</p>
            </div>
          )}
        </div>
      )}
      </div>
    </div>
  )}

  {/* Chat flotante */}
      {showChat && isJoined && !isMinimized && (
        <div className="fixed right-4 bottom-4 w-80 bg-white rounded-lg shadow-2xl flex flex-col h-96 z-50">
          <div className="p-4 bg-cyan-600 text-white rounded-t-lg flex items-center justify-between">
            <h3 className="font-bold">Chat de la clase</h3>
            <button onClick={() => setShowChat(false)} className="hover:bg-white/20 p-1 rounded">
              <X size={18} />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-4 space-y-3" style={{ WebkitOverflowScrolling: 'touch' }}>
            {messages.length === 0 ? (
              <div className="text-center text-gray-400 text-sm py-8">
                <MessageCircle className="mx-auto mb-2 opacity-50" size={32} />
                No hay mensajes aún
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
                className="flex-1 px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-500 text-sm"
              />
              <button
                type="submit"
                disabled={!newMessage.trim()}
                className="p-2 bg-cyan-600 text-white rounded-lg hover:bg-cyan-700 transition disabled:opacity-50"
              >
                <Send size={20} />
              </button>
            </div>
          </form>
        </div>
      )}

      {/* ✅ MODAL DE PREFERENCIAS AL UNIRSE */}
      {showJoinPreferencesModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-md w-full">
            {/* Header */}
            <div className="bg-gradient-to-r from-cyan-600 to-blue-600 text-white p-6 rounded-t-xl">
              <h3 className="text-xl font-bold">Preferencias de Unión</h3>
              <p className="text-sm text-white/80 mt-1">
                Configura cómo quieres unirte a la clase
              </p>
            </div>

            {/* Body */}
            <div className="p-6 space-y-4">
              <div className="bg-blue-50/20 border border-blue-200 rounded-lg p-4">
                <p className="text-sm text-blue-800">
                  <AlertCircle size={16} className="inline mr-1" />
                  Puedes unirte sin cámara ni micrófono y activarlos después.
                </p>
              </div>

              {/* Opción de Cámara */}
              <div className="flex items-center justify-between p-4 bg-gray-50/50 rounded-lg">
                <div className="flex items-center gap-3">
                  {joinWithCamera ? (
                    <Video size={24} className="text-cyan-600" />
                  ) : (
                    <VideoOff size={24} className="text-gray-400" />
                  )}
                  <div>
                    <p className="font-semibold text-gray-800">Cámara</p>
                    <p className="text-xs text-gray-500">
                      {joinWithCamera ? 'Unirse con cámara encendida' : 'Unirse con cámara apagada'}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setJoinWithCamera(!joinWithCamera)}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                    joinWithCamera ? 'bg-green-600' : 'bg-gray-300'
                  }`}
                >
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                      joinWithCamera ? 'translate-x-6' : 'translate-x-1'
                    }`}
                  />
                </button>
              </div>

              {/* Opción de Micrófono */}
              <div className="flex items-center justify-between p-4 bg-gray-50/50 rounded-lg">
                <div className="flex items-center gap-3">
                  {joinWithAudio ? (
                    <Mic size={24} className="text-cyan-600" />
                  ) : (
                    <MicOff size={24} className="text-gray-400" />
                  )}
                  <div>
                    <p className="font-semibold text-gray-800">Micrófono</p>
                    <p className="text-xs text-gray-500">
                      {joinWithAudio ? 'Unirse con micrófono encendido' : 'Unirse con micrófono apagado'}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setJoinWithAudio(!joinWithAudio)}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                    joinWithAudio ? 'bg-green-600' : 'bg-gray-300'
                  }`}
                >
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                      joinWithAudio ? 'translate-x-6' : 'translate-x-1'
                    }`}
                  />
                </button>
              </div>
            </div>

            {/* Footer */}
            <div className="bg-gray-50 px-6 py-4 flex gap-3 rounded-b-xl">
              <button
                onClick={() => setShowJoinPreferencesModal(false)}
                className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-100:bg-gray-700 transition font-semibold"
              >
                Cancelar
              </button>
              <button
                onClick={joinClass}
                disabled={loading}
                className="flex-1 px-4 py-2 bg-gradient-to-r from-cyan-600 to-blue-600 text-white rounded-lg hover:shadow-lg transition font-semibold disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {loading ? (
                  <>
                    <Loader size={20} className="animate-spin" />
                    Uniéndose...
                  </>
                ) : (
                  <>
                    <Video size={20} />
                    Unirse Ahora
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      <Toast
        isOpen={showToast}
        onClose={() => setShowToast(false)}
        message={toastMessage}
        type={toastType}
      />
    </div>
  );
};

export default StudentLiveTab;
