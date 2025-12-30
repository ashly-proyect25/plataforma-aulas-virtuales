/**
 * ⚙️ CONFIGURACIÓN WEBRTC OPTIMIZADA PARA P2P
 *
 * Este archivo centraliza la configuración de WebRTC para garantizar
 * rendimiento óptimo con 4-10 usuarios en modo mesh P2P.
 *
 * Basado en diagnóstico y recomendaciones del PDF: diagnostico-lag-webrtc.pdf
 */

// ============================================================================
// 1. CONSTRAINTS DE MEDIA (Resolución y Calidad)
// ============================================================================

/**
 * Constraints optimizados para cámara
 * - Resolución: 640x480 (ideal), máximo 1280x720
 * - Frame rate: 24fps (ideal), máximo 30fps
 * - Esto reduce el ancho de banda de ~5-10 Mbps a ~1-2 Mbps por conexión
 */
export const VIDEO_CONSTRAINTS = {
  width: { ideal: 640, max: 1280 },
  height: { ideal: 480, max: 720 },
  frameRate: { ideal: 24, max: 30 }
};

/**
 * Constraints optimizados para audio
 * - Echo cancellation: Elimina eco
 * - Noise suppression: Reduce ruido de fondo
 * - Auto gain control: Normaliza volumen
 */
export const AUDIO_CONSTRAINTS = {
  echoCancellation: true,
  noiseSuppression: true,
  autoGainControl: true,
  sampleRate: 44100
};

/**
 * Constraints para pantalla compartida
 * - Resolución: 1280x720 (ideal), máximo 1920x1080
 * - Frame rate: 15fps para presentaciones, 30fps para videos
 */
export const SCREEN_SHARE_CONSTRAINTS = {
  video: {
    width: { ideal: 1280, max: 1920 },
    height: { ideal: 720, max: 1080 },
    frameRate: { ideal: 15, max: 30 }
  },
  audio: false // Pantalla compartida sin audio por defecto
};

// ============================================================================
// 2. CONFIGURACIÓN DE ICE SERVERS (STUN/TURN)
// ============================================================================

/**
 * Configuración de ICE servers para conectividad
 * - STUN servers: Para descubrir IP pública y tipo de NAT
 * - TURN servers: Para relay cuando P2P directo falla (no configurados aún)
 *
 * IMPORTANTE: Los TURN servers requieren infraestructura propia o servicio de pago.
 * Para producción, se recomienda usar servicios como:
 * - Twilio TURN (https://www.twilio.com/stun-turn)
 * - Xirsys (https://xirsys.com/)
 * - coturn (servidor propio)
 */
export const ICE_SERVERS_CONFIG = {
  iceServers: [
    // Google STUN servers (gratis)
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
    { urls: 'stun:stun2.l.google.com:19302' },
    { urls: 'stun:stun3.l.google.com:19302' },
    { urls: 'stun:stun4.l.google.com:19302' }

    // TURN servers (descomentar cuando configures tu propio servidor)
    // {
    //   urls: 'turn:tu-servidor.com:3478',
    //   username: 'usuario',
    //   credential: 'contraseña'
    // },
    // {
    //   urls: 'turns:tu-servidor.com:5349', // TURN sobre TLS
    //   username: 'usuario',
    //   credential: 'contraseña'
    // }
  ],
  iceCandidatePoolSize: 10, // Pre-generar candidatos ICE
  iceTransportPolicy: 'all' // Usar STUN/TURN si están disponibles
};

// ============================================================================
// 3. LIMITACIONES DE BITRATE
// ============================================================================

/**
 * Bitrate máximo para video (en bits/segundo)
 * - 1 Mbps es suficiente para video de 640x480 @ 24fps
 * - Previene saturación de ancho de banda en conexiones lentas
 */
export const MAX_VIDEO_BITRATE = 1000000; // 1 Mbps

/**
 * Bitrate máximo para audio (en bits/segundo)
 * - 128 Kbps es suficiente para voz de alta calidad
 */
export const MAX_AUDIO_BITRATE = 128000; // 128 Kbps

/**
 * Aplicar limitaciones de bitrate a un RTCPeerConnection
 * Debe llamarse DESPUÉS de agregar tracks al peer connection
 *
 * @param {RTCPeerConnection} peerConnection - La peer connection a limitar
 */
export async function applyBitrateLimits(peerConnection) {
  if (!peerConnection || !peerConnection.getSenders) {
    console.warn('⚠️ applyBitrateLimits: peer connection inválida');
    return;
  }

  const senders = peerConnection.getSenders();

  for (const sender of senders) {
    if (!sender.track) continue;

    const parameters = sender.getParameters();

    if (!parameters.encodings || parameters.encodings.length === 0) {
      parameters.encodings = [{}];
    }

    // Aplicar límite según tipo de track
    if (sender.track.kind === 'video') {
      parameters.encodings[0].maxBitrate = MAX_VIDEO_BITRATE;
      console.log(`🎬 [BITRATE] Video limitado a ${MAX_VIDEO_BITRATE / 1000} Kbps`);
    } else if (sender.track.kind === 'audio') {
      parameters.encodings[0].maxBitrate = MAX_AUDIO_BITRATE;
      console.log(`🎤 [BITRATE] Audio limitado a ${MAX_AUDIO_BITRATE / 1000} Kbps`);
    }

    try {
      await sender.setParameters(parameters);
    } catch (error) {
      console.error(`❌ Error aplicando límites de bitrate:`, error);
    }
  }
}

// ============================================================================
// 4. FUNCIONES HELPER PARA getUserMedia
// ============================================================================

/**
 * Obtener stream de cámara y micrófono con constraints optimizados
 *
 * @param {boolean} enableVideo - Activar video
 * @param {boolean} enableAudio - Activar audio
 * @returns {Promise<MediaStream>}
 */
export async function getOptimizedUserMedia(enableVideo = true, enableAudio = true) {
  const constraints = {
    video: enableVideo ? VIDEO_CONSTRAINTS : false,
    audio: enableAudio ? AUDIO_CONSTRAINTS : false
  };

  try {
    const stream = await navigator.mediaDevices.getUserMedia(constraints);
    console.log('✅ Stream obtenido con constraints optimizados');

    // Log de configuración real
    if (enableVideo) {
      const videoTrack = stream.getVideoTracks()[0];
      const settings = videoTrack.getSettings();
      console.log(`📹 Video: ${settings.width}x${settings.height} @ ${settings.frameRate}fps`);
    }

    if (enableAudio) {
      const audioTrack = stream.getAudioTracks()[0];
      const settings = audioTrack.getSettings();
      console.log(`🎤 Audio: ${settings.sampleRate}Hz, ${settings.channelCount} canales`);
    }

    return stream;
  } catch (error) {
    console.error('❌ Error obteniendo media:', error);
    throw error;
  }
}

/**
 * Obtener stream de pantalla compartida con constraints optimizados
 *
 * @returns {Promise<MediaStream>}
 */
export async function getOptimizedScreenShare() {
  try {
    const stream = await navigator.mediaDevices.getDisplayMedia(SCREEN_SHARE_CONSTRAINTS);
    console.log('✅ Pantalla compartida obtenida con constraints optimizados');

    const videoTrack = stream.getVideoTracks()[0];
    const settings = videoTrack.getSettings();
    console.log(`🖥️ Screen: ${settings.width}x${settings.height} @ ${settings.frameRate}fps`);

    return stream;
  } catch (error) {
    console.error('❌ Error obteniendo screen share:', error);
    throw error;
  }
}

// ============================================================================
// 5. MONITOREO Y DIAGNÓSTICO
// ============================================================================

/**
 * Agregar listeners de diagnóstico a una peer connection
 * Útil para debugging en desarrollo
 *
 * @param {RTCPeerConnection} pc - Peer connection
 * @param {string} label - Etiqueta para identificar la conexión en logs
 */
export function addDiagnosticListeners(pc, label = 'Peer') {
  if (!pc) return;

  pc.oniceconnectionstatechange = () => {
    console.log(`[${label}] ICE Connection State: ${pc.iceConnectionState}`);

    if (pc.iceConnectionState === 'failed') {
      console.error(`❌ [${label}] Conexión FALLIDA - revisar firewall/STUN`);
    } else if (pc.iceConnectionState === 'connected') {
      console.log(`✅ [${label}] Conexión P2P establecida`);
    }
  };

  pc.onconnectionstatechange = () => {
    console.log(`[${label}] Connection State: ${pc.connectionState}`);
  };

  pc.onsignalingstatechange = () => {
    console.log(`[${label}] Signaling State: ${pc.signalingState}`);
  };

  // Monitorear stats cada 10 segundos (solo en desarrollo)
  if (process.env.NODE_ENV === 'development') {
    const statsInterval = setInterval(async () => {
      if (pc.connectionState === 'closed') {
        clearInterval(statsInterval);
        return;
      }

      try {
        const stats = await pc.getStats();
        let packetsLost = 0;
        let packetsReceived = 0;
        let bytesReceived = 0;

        stats.forEach(report => {
          if (report.type === 'inbound-rtp' && report.kind === 'video') {
            packetsLost += report.packetsLost || 0;
            packetsReceived += report.packetsReceived || 0;
            bytesReceived += report.bytesReceived || 0;
          }
        });

        if (packetsReceived > 0) {
          const lossRate = (packetsLost / (packetsReceived + packetsLost)) * 100;
          if (lossRate > 5) {
            console.warn(`⚠️ [${label}] Pérdida de paquetes: ${lossRate.toFixed(2)}% (>5% es problemático)`);
          }
        }
      } catch (error) {
        // Ignorar errores de stats
      }
    }, 10000);
  }
}

// ============================================================================
// 6. CONFIGURACIÓN POR DEFECTO RECOMENDADA
// ============================================================================

/**
 * Configuración completa recomendada para crear RTCPeerConnection
 */
export const RECOMMENDED_RTC_CONFIG = {
  ...ICE_SERVERS_CONFIG,

  // Configuración adicional para mejor rendimiento
  bundlePolicy: 'max-bundle', // Agrupar todos los medios en un solo puerto
  rtcpMuxPolicy: 'require', // Multiplexar RTP y RTCP

  // Configuración de codec preferido (VP8 es más eficiente en algunos navegadores)
  // sdpSemantics: 'unified-plan' // Default en navegadores modernos
};

/**
 * Crear RTCPeerConnection con configuración optimizada
 *
 * @param {string} label - Etiqueta para debugging (opcional)
 * @returns {RTCPeerConnection}
 */
export function createOptimizedPeerConnection(label = 'Peer') {
  const pc = new RTCPeerConnection(RECOMMENDED_RTC_CONFIG);

  // Agregar listeners de diagnóstico en desarrollo
  if (process.env.NODE_ENV === 'development') {
    addDiagnosticListeners(pc, label);
  }

  console.log(`🔗 [${label}] Peer connection creada con configuración optimizada`);

  return pc;
}

// ============================================================================
// EXPORTACIONES
// ============================================================================

export default {
  // Constraints
  VIDEO_CONSTRAINTS,
  AUDIO_CONSTRAINTS,
  SCREEN_SHARE_CONSTRAINTS,

  // ICE Config
  ICE_SERVERS_CONFIG,
  RECOMMENDED_RTC_CONFIG,

  // Bitrate
  MAX_VIDEO_BITRATE,
  MAX_AUDIO_BITRATE,
  applyBitrateLimits,

  // Helpers
  getOptimizedUserMedia,
  getOptimizedScreenShare,
  createOptimizedPeerConnection,
  addDiagnosticListeners
};
