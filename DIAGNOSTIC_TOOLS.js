/**
 * 🔍 HERRAMIENTAS DE DIAGNÓSTICO WEBRTC
 *
 * Copia este código en la consola del navegador durante una clase en vivo
 * para diagnosticar problemas de rendimiento y lag.
 *
 * Uso: Pega todo el código en Console (DevTools) y ejecuta los comandos
 */

// ============================================================================
// 1. VERIFICAR RESOLUCIÓN DE VIDEO ACTUAL
// ============================================================================
window.checkVideoResolution = function() {
  console.log('\n📹 ===== DIAGNÓSTICO: RESOLUCIÓN DE VIDEO =====\n');

  const videos = document.querySelectorAll('video');
  console.log(`Total de elementos <video>: ${videos.length}`);

  videos.forEach((video, index) => {
    if (video.srcObject) {
      const stream = video.srcObject;
      const videoTracks = stream.getVideoTracks();

      videoTracks.forEach((track, trackIndex) => {
        const settings = track.getSettings();
        const constraints = track.getConstraints();

        console.log(`\n[Video #${index + 1}, Track #${trackIndex + 1}]`);
        console.log(`  Label: ${track.label}`);
        console.log(`  Resolución actual: ${settings.width}x${settings.height}`);
        console.log(`  Frame rate: ${settings.frameRate} fps`);
        console.log(`  Constraints aplicados:`, constraints);

        // Advertencias
        if (settings.width > 1280 || settings.height > 720) {
          console.warn(`  ⚠️ RESOLUCIÓN MUY ALTA! Debería ser máximo 1280x720`);
        }
        if (settings.frameRate > 30) {
          console.warn(`  ⚠️ FRAMERATE MUY ALTO! Debería ser máximo 30fps`);
        }
        if (!constraints || Object.keys(constraints).length === 0) {
          console.error(`  ❌ NO HAY CONSTRAINTS! El video usa resolución máxima de la cámara`);
        }
      });

      const audioTracks = stream.getAudioTracks();
      if (audioTracks.length > 0) {
        const audioSettings = audioTracks[0].getSettings();
        console.log(`  Audio: ${audioSettings.sampleRate} Hz, ${audioSettings.channelCount} canales`);
      }
    } else {
      console.log(`[Video #${index + 1}]: Sin srcObject`);
    }
  });

  console.log('\n===============================================\n');
};

// ============================================================================
// 2. CONTAR CONEXIONES PEER-TO-PEER ACTIVAS
// ============================================================================
window.checkPeerConnections = function() {
  console.log('\n🔗 ===== DIAGNÓSTICO: PEER CONNECTIONS =====\n');

  // Buscar en el componente React (puede variar según implementación)
  const rootElement = document.querySelector('#root')?._reactRootContainer?._internalRoot?.current;

  console.log('Total de elementos <video>:', document.querySelectorAll('video').length);
  console.log('Debería ser igual al número de usuarios (incluido tú mismo)');

  // Verificar si hay duplicados
  const videos = document.querySelectorAll('video');
  const streamIds = new Set();
  let duplicados = 0;

  videos.forEach(video => {
    if (video.srcObject) {
      const streamId = video.srcObject.id;
      if (streamIds.has(streamId)) {
        duplicados++;
        console.error(`❌ STREAM DUPLICADO: ${streamId}`);
      }
      streamIds.add(streamId);
    }
  });

  if (duplicados > 0) {
    console.error(`\n❌ PROBLEMA: ${duplicados} streams duplicados encontrados!`);
  } else {
    console.log('✅ No hay streams duplicados');
  }

  console.log('\n===============================================\n');
};

// ============================================================================
// 3. MONITOREAR ESTADÍSTICAS DE RED EN TIEMPO REAL
// ============================================================================
window.monitorWebRTCStats = async function(durationSeconds = 30) {
  console.log('\n📊 ===== MONITOREO DE ESTADÍSTICAS WEBRTC =====\n');
  console.log(`Monitoreando durante ${durationSeconds} segundos...`);
  console.log('Presiona Ctrl+C en la consola para detener antes\n');

  // Intentar acceder a las peer connections desde window
  // (necesitas exponer las peer connections en desarrollo)
  if (!window.peerConnections || window.peerConnections.size === 0) {
    console.error('❌ No se encontraron peer connections en window.peerConnections');
    console.log('💡 Agrega esto a tu código:');
    console.log('   window.peerConnections = peerStudentsRef.current; // en StudentLiveTab');
    console.log('   window.peerConnections = peerConnectionsRef.current; // en CourseLiveTab');
    return;
  }

  const interval = 2000; // Cada 2 segundos
  const iterations = Math.floor((durationSeconds * 1000) / interval);
  let currentIteration = 0;

  const statsInterval = setInterval(async () => {
    console.log(`\n--- [${new Date().toLocaleTimeString()}] Iteración ${currentIteration + 1}/${iterations} ---`);

    for (const [peerId, pc] of window.peerConnections) {
      console.log(`\nPeer: ${peerId}`);
      console.log(`  Estado ICE: ${pc.iceConnectionState}`);
      console.log(`  Estado Conexión: ${pc.connectionState}`);
      console.log(`  Estado Señalización: ${pc.signalingState}`);

      try {
        const stats = await pc.getStats();

        stats.forEach(report => {
          // Estadísticas de video entrante
          if (report.type === 'inbound-rtp' && report.kind === 'video') {
            console.log(`\n  📥 Video Entrante:`);
            console.log(`     Bytes recibidos: ${(report.bytesReceived / 1024).toFixed(2)} KB`);
            console.log(`     Paquetes perdidos: ${report.packetsLost}`);
            console.log(`     Jitter: ${report.jitter?.toFixed(4)} segundos`);
            console.log(`     Frames decodificados: ${report.framesDecoded}`);
            console.log(`     Frames perdidos: ${report.framesDropped || 0}`);

            if (report.packetsLost > 0) {
              const lossRate = (report.packetsLost / (report.packetsReceived + report.packetsLost)) * 100;
              if (lossRate > 5) {
                console.warn(`     ⚠️ Pérdida de paquetes: ${lossRate.toFixed(2)}% (>5% es problemático)`);
              }
            }
          }

          // Estadísticas de video saliente
          if (report.type === 'outbound-rtp' && report.kind === 'video') {
            console.log(`\n  📤 Video Saliente:`);
            console.log(`     Bytes enviados: ${(report.bytesSent / 1024).toFixed(2)} KB`);
            console.log(`     Paquetes enviados: ${report.packetsSent}`);
            console.log(`     Frames codificados: ${report.framesEncoded}`);

            // Calcular bitrate aproximado
            if (report.timestamp && report.bytesSent) {
              const bitrate = (report.bytesSent * 8) / (report.timestamp / 1000);
              console.log(`     Bitrate estimado: ${(bitrate / 1000).toFixed(2)} kbps`);

              if (bitrate > 2000000) { // > 2 Mbps
                console.warn(`     ⚠️ Bitrate muy alto: ${(bitrate / 1000000).toFixed(2)} Mbps`);
              }
            }
          }

          // Estado de candidatos ICE
          if (report.type === 'candidate-pair' && report.state === 'succeeded') {
            console.log(`\n  🌐 Conexión ICE:`);
            console.log(`     Tipo: ${report.candidateType || 'N/A'}`);
            console.log(`     RTT: ${report.currentRoundTripTime ? (report.currentRoundTripTime * 1000).toFixed(2) + ' ms' : 'N/A'}`);

            if (report.currentRoundTripTime && report.currentRoundTripTime > 0.15) { // > 150ms
              console.warn(`     ⚠️ Latencia alta: ${(report.currentRoundTripTime * 1000).toFixed(2)} ms`);
            }
          }
        });
      } catch (error) {
        console.error(`  ❌ Error obteniendo stats: ${error.message}`);
      }
    }

    currentIteration++;
    if (currentIteration >= iterations) {
      clearInterval(statsInterval);
      console.log('\n✅ Monitoreo completado\n');
      console.log('===============================================\n');
    }
  }, interval);

  // Guardar referencia para poder detener manualmente
  window.statsMonitorInterval = statsInterval;

  console.log('💡 Para detener antes: clearInterval(window.statsMonitorInterval)');
};

// ============================================================================
// 4. VERIFICAR MEMORY LEAKS
// ============================================================================
window.checkMemoryUsage = function() {
  console.log('\n💾 ===== DIAGNÓSTICO: USO DE MEMORIA =====\n');

  if (performance.memory) {
    const memory = performance.memory;

    console.log(`Memoria JS total: ${(memory.jsHeapSizeLimit / 1024 / 1024).toFixed(2)} MB`);
    console.log(`Memoria JS usada: ${(memory.usedJSHeapSize / 1024 / 1024).toFixed(2)} MB`);
    console.log(`Memoria JS allocada: ${(memory.totalJSHeapSize / 1024 / 1024).toFixed(2)} MB`);

    const percentUsed = (memory.usedJSHeapSize / memory.jsHeapSizeLimit) * 100;
    console.log(`Porcentaje usado: ${percentUsed.toFixed(2)}%`);

    if (percentUsed > 70) {
      console.warn('⚠️ Uso de memoria alto! Posible memory leak');
    } else {
      console.log('✅ Uso de memoria normal');
    }
  } else {
    console.log('❌ performance.memory no disponible en este navegador');
    console.log('💡 Usa Chrome/Edge con flag --enable-precise-memory-info');
  }

  // Contar objetos DOM
  const allElements = document.getElementsByTagName('*').length;
  console.log(`\nTotal de elementos DOM: ${allElements}`);

  if (allElements > 5000) {
    console.warn('⚠️ Muchos elementos DOM! Puede afectar rendimiento');
  }

  console.log('\n===============================================\n');
};

// ============================================================================
// 5. VERIFICAR CONFIGURACIÓN DE STUN/TURN
// ============================================================================
window.checkSTUNTURNConfig = async function() {
  console.log('\n🌐 ===== DIAGNÓSTICO: STUN/TURN CONFIG =====\n');

  // Crear peer connection de prueba
  const testConfig = {
    iceServers: [
      { urls: 'stun:stun.l.google.com:19302' },
      { urls: 'stun:stun1.l.google.com:19302' }
    ]
  };

  const pc = new RTCPeerConnection(testConfig);

  console.log('Configuración ICE:', pc.getConfiguration());

  // Verificar si puede obtener candidatos ICE
  const candidatesFound = [];

  pc.onicecandidate = (event) => {
    if (event.candidate) {
      candidatesFound.push(event.candidate);
      console.log(`Candidato ICE encontrado: ${event.candidate.type} - ${event.candidate.candidate}`);
    }
  };

  // Crear offer para triggear ICE gathering
  pc.createDataChannel('test');
  await pc.createOffer();
  await pc.setLocalDescription();

  // Esperar 5 segundos para recolectar candidatos
  await new Promise(resolve => setTimeout(resolve, 5000));

  console.log(`\nTotal candidatos ICE: ${candidatesFound.length}`);

  const hasHost = candidatesFound.some(c => c.type === 'host');
  const hasSrflx = candidatesFound.some(c => c.type === 'srflx');
  const hasRelay = candidatesFound.some(c => c.type === 'relay');

  console.log(`  Candidatos host: ${hasHost ? '✅' : '❌'}`);
  console.log(`  Candidatos srflx (STUN): ${hasSrflx ? '✅' : '❌'}`);
  console.log(`  Candidatos relay (TURN): ${hasRelay ? '✅' : '❌ NO CONFIGURADO'}`);

  if (!hasRelay) {
    console.warn('\n⚠️ NO hay TURN servers configurados!');
    console.warn('Las conexiones pueden fallar en redes restrictivas (NAT simétrico, firewall corporativo)');
  }

  pc.close();

  console.log('\n===============================================\n');
};

// ============================================================================
// 6. DIAGNÓSTICO COMPLETO (EJECUTAR TODO)
// ============================================================================
window.runFullDiagnostic = async function() {
  console.clear();
  console.log('🚀 ===== DIAGNÓSTICO COMPLETO WEBRTC =====\n');
  console.log('Ejecutando todas las pruebas...\n');

  checkVideoResolution();
  await new Promise(r => setTimeout(r, 1000));

  checkPeerConnections();
  await new Promise(r => setTimeout(r, 1000));

  checkMemoryUsage();
  await new Promise(r => setTimeout(r, 1000));

  await checkSTUNTURNConfig();

  console.log('\n✅ Diagnóstico completo finalizado\n');
  console.log('Para monitoreo en tiempo real, ejecuta: monitorWebRTCStats(60)');
};

// ============================================================================
// INSTRUCCIONES DE USO
// ============================================================================
console.log(`
╔════════════════════════════════════════════════════════════════╗
║  🔍 HERRAMIENTAS DE DIAGNÓSTICO WEBRTC CARGADAS               ║
╚════════════════════════════════════════════════════════════════╝

Comandos disponibles:

  1. checkVideoResolution()       - Verificar resolución de video actual
  2. checkPeerConnections()       - Contar conexiones P2P activas
  3. checkMemoryUsage()            - Verificar uso de memoria
  4. checkSTUNTURNConfig()         - Verificar configuración STUN/TURN
  5. monitorWebRTCStats(60)        - Monitorear stats en tiempo real (60 seg)
  6. runFullDiagnostic()           - Ejecutar TODAS las pruebas

💡 Recomendado: Primero ejecuta runFullDiagnostic() para ver todos los problemas

`);
