// Cache de credenciales ICE
let cachedIceServers = null;
let cacheExpiry = 0;
let initPromise = null;

// Servidores STUN principales (conexión directa, sin relay)
const stunServers = [
  { urls: 'stun:stun.l.google.com:19302' },
  { urls: 'stun:stun1.l.google.com:19302' }
];

/**
 * Separa y ordena los servidores ICE: STUN primero, TURN después (fallback)
 * Esto asegura que el navegador intente conexión directa antes de usar relay
 */
function orderIceServers(servers) {
  const stun = [];
  const turn = [];

  for (const server of servers) {
    const urls = Array.isArray(server.urls) ? server.urls : [server.urls];
    const isStun = urls.some(u => u.startsWith('stun:'));
    const isTurn = urls.some(u => u.startsWith('turn:') || u.startsWith('turns:'));

    if (isTurn) {
      turn.push(server);
    } else if (isStun) {
      stun.push(server);
    }
  }

  // STUN primero (conexión directa), TURN después (relay como fallback)
  return [...stunServers, ...stun, ...turn];
}

/**
 * Obtiene las credenciales ICE de metered.ca
 * STUN es principal (conexión directa), TURN es fallback (relay)
 * Las credenciales se cachean por 1 hora
 */
export async function getIceServers() {
  const now = Date.now();

  // Retornar cache si aún es válido
  if (cachedIceServers && now < cacheExpiry) {
    return cachedIceServers;
  }

  const apiKey = import.meta.env.VITE_METERED_API_KEY;

  if (!apiKey) {
    console.warn('⚠️ VITE_METERED_API_KEY no configurada, usando solo STUN');
    cachedIceServers = stunServers;
    return stunServers;
  }

  try {
    const response = await fetch(
      `https://plataforma-clases-tesis.metered.live/api/v1/turn/credentials?apiKey=${apiKey}`
    );

    if (!response.ok) {
      throw new Error(`Error ${response.status}`);
    }

    const servers = await response.json();
    cachedIceServers = orderIceServers(servers);
    cacheExpiry = now + (60 * 60 * 1000); // 1 hora

    console.log('✅ ICE servers configurados: STUN principal, TURN fallback');
    return cachedIceServers;
  } catch (error) {
    console.error('❌ Error obteniendo credenciales ICE:', error);
    cachedIceServers = stunServers;
    return stunServers;
  }
}

/**
 * Inicializa las credenciales TURN (llamar al inicio del componente)
 * Retorna una promesa que se resuelve cuando las credenciales están listas
 */
export async function initializeIceServers() {
  if (!initPromise) {
    initPromise = getIceServers();
  }
  return initPromise;
}

/**
 * Obtiene los iceServers de forma síncrona (debe llamar initializeIceServers primero)
 * Si no hay cache, retorna solo STUN (conexión directa)
 */
export function getIceServersSync() {
  return cachedIceServers || stunServers;
}

/**
 * Retorna la configuración completa para RTCPeerConnection de forma síncrona
 */
export function getRTCConfig() {
  return {
    iceServers: getIceServersSync(),
    iceCandidatePoolSize: 10
  };
}

/**
 * Crea configuración para RTCPeerConnection (versión async)
 */
export async function createPeerConnectionConfig() {
  const iceServers = await getIceServers();
  return {
    iceServers,
    iceCandidatePoolSize: 10
  };
}
