// ============================================================================
// DIAGNÓSTICO WEBRTC - SNIPPET PARA DEVTOOLS
// ============================================================================
// Cómo usar:
// 1. DevTools → Sources → Snippets
// 2. Click en "+ New snippet"
// 3. Copiar este archivo completo
// 4. Ctrl+S para guardar
// 5. Click derecho → Run
// ============================================================================

(function() {
  console.clear();
  console.log('%c🔍 DIAGNÓSTICO WEBRTC INICIADO', 'background: #222; color: #bada55; font-size: 20px; padding: 10px;');

  // ========================================================================
  // 1. VERIFICAR RESOLUCIÓN DE VIDEO
  // ========================================================================
  console.log('\n%c📹 RESOLUCIÓN DE VIDEO', 'background: #3498db; color: white; font-size: 16px; padding: 5px;');

  const videos = document.querySelectorAll('video');
  console.log(`Total de elementos <video>: ${videos.length}`);

  let problemas = [];

  videos.forEach((video, index) => {
    if (video.srcObject) {
      const stream = video.srcObject;
      const videoTracks = stream.getVideoTracks();

      videoTracks.forEach((track, trackIndex) => {
        const settings = track.getSettings();

        console.log(`\n[Video #${index + 1}, Track #${trackIndex + 1}]`);
        console.log(`  Label: ${track.label}`);
        console.log(`  Resolución: ${settings.width}x${settings.height}`);
        console.log(`  Frame rate: ${settings.frameRate} fps`);

        // Verificar problemas
        if (settings.width > 1280 || settings.height > 720) {
          const msg = `⚠️ Video #${index + 1}: Resolución MUY ALTA (${settings.width}x${settings.height}) - Debería ser máximo 1280x720`;
          console.warn(msg);
          problemas.push(msg);
        } else {
          console.log(`  ✅ Resolución óptima`);
        }

        if (settings.frameRate > 30) {
          const msg = `⚠️ Video #${index + 1}: Frame rate MUY ALTO (${settings.frameRate}fps) - Debería ser máximo 30fps`;
          console.warn(msg);
          problemas.push(msg);
        } else {
          console.log(`  ✅ Frame rate óptimo`);
        }
      });
    } else {
      console.log(`[Video #${index + 1}]: Sin srcObject (vacío)`);
    }
  });

  // ========================================================================
  // 2. VERIFICAR STREAMS DUPLICADOS
  // ========================================================================
  console.log('\n%c🔗 CONEXIONES P2P', 'background: #e74c3c; color: white; font-size: 16px; padding: 5px;');

  const streamIds = new Set();
  let duplicados = 0;

  videos.forEach((video, index) => {
    if (video.srcObject) {
      const streamId = video.srcObject.id;
      if (streamIds.has(streamId)) {
        duplicados++;
        const msg = `❌ Stream duplicado en Video #${index + 1}: ${streamId}`;
        console.error(msg);
        problemas.push(msg);
      }
      streamIds.add(streamId);
    }
  });

  if (duplicados === 0) {
    console.log('✅ No hay streams duplicados');
  } else {
    console.error(`❌ PROBLEMA: ${duplicados} streams duplicados encontrados!`);
  }

  // ========================================================================
  // 3. USO DE MEMORIA
  // ========================================================================
  console.log('\n%c💾 USO DE MEMORIA', 'background: #9b59b6; color: white; font-size: 16px; padding: 5px;');

  if (performance.memory) {
    const memory = performance.memory;
    const usedMB = (memory.usedJSHeapSize / 1024 / 1024).toFixed(2);
    const totalMB = (memory.jsHeapSizeLimit / 1024 / 1024).toFixed(2);
    const percentUsed = (memory.usedJSHeapSize / memory.jsHeapSizeLimit) * 100;

    console.log(`Memoria JS usada: ${usedMB} MB / ${totalMB} MB`);
    console.log(`Porcentaje usado: ${percentUsed.toFixed(2)}%`);

    if (percentUsed > 70) {
      const msg = `⚠️ Uso de memoria alto (${percentUsed.toFixed(2)}%) - Posible memory leak`;
      console.warn(msg);
      problemas.push(msg);
    } else {
      console.log('✅ Uso de memoria normal');
    }
  } else {
    console.log('❌ performance.memory no disponible (usa Chrome con flag --enable-precise-memory-info)');
  }

  const totalElements = document.getElementsByTagName('*').length;
  console.log(`Total elementos DOM: ${totalElements}`);

  if (totalElements > 5000) {
    const msg = `⚠️ Muchos elementos DOM (${totalElements}) - Puede afectar rendimiento`;
    console.warn(msg);
    problemas.push(msg);
  }

  // ========================================================================
  // 4. VERIFICAR ANCHO DE BANDA ESTIMADO
  // ========================================================================
  console.log('\n%c📊 ESTIMACIÓN DE ANCHO DE BANDA', 'background: #27ae60; color: white; font-size: 16px; padding: 5px;');

  let totalBitrate = 0;
  videos.forEach((video, index) => {
    if (video.srcObject) {
      const videoTracks = video.srcObject.getVideoTracks();
      videoTracks.forEach(track => {
        const settings = track.getSettings();
        // Estimación: 640x480@24fps ≈ 1.5 Mbps, escala proporcionalmente
        const pixels = settings.width * settings.height;
        const estimatedBitrate = (pixels / (640 * 480)) * settings.frameRate / 24 * 1.5;
        totalBitrate += estimatedBitrate;
        console.log(`  Video #${index + 1}: ~${estimatedBitrate.toFixed(2)} Mbps estimado`);
      });
    }
  });

  console.log(`\nTotal ancho de banda estimado: ~${totalBitrate.toFixed(2)} Mbps`);

  if (totalBitrate > 10) {
    const msg = `⚠️ Ancho de banda muy alto (${totalBitrate.toFixed(2)} Mbps) - Puede causar lag`;
    console.warn(msg);
    problemas.push(msg);
  } else {
    console.log('✅ Ancho de banda razonable');
  }

  // ========================================================================
  // RESUMEN FINAL
  // ========================================================================
  console.log('\n%c═══════════════════════════════════════════════════════', 'color: #95a5a6; font-size: 14px;');
  console.log('%c📋 RESUMEN DEL DIAGNÓSTICO', 'background: #34495e; color: white; font-size: 18px; padding: 10px;');
  console.log('%c═══════════════════════════════════════════════════════', 'color: #95a5a6; font-size: 14px;');

  if (problemas.length === 0) {
    console.log('\n%c✅ ¡TODO ESTÁ BIEN! No se detectaron problemas', 'background: #27ae60; color: white; font-size: 16px; padding: 10px;');
  } else {
    console.log(`\n%c⚠️ SE DETECTARON ${problemas.length} PROBLEMA(S):`, 'background: #e74c3c; color: white; font-size: 16px; padding: 10px;');
    problemas.forEach((problema, i) => {
      console.log(`\n${i + 1}. ${problema}`);
    });
  }

  console.log('\n%c═══════════════════════════════════════════════════════', 'color: #95a5a6; font-size: 14px;');

  // ========================================================================
  // COMANDOS ADICIONALES DISPONIBLES
  // ========================================================================
  console.log('\n%c💡 COMANDOS ADICIONALES:', 'background: #f39c12; color: white; font-size: 14px; padding: 5px;');
  console.log('Para más información, visita: chrome://webrtc-internals');
  console.log('\nPara ver estadísticas detalladas en tiempo real:');
  console.log('%cnavigator.mediaDevices.getUserMedia({video: true}).then(s => console.log(s.getVideoTracks()[0].getSettings()))', 'background: #2c3e50; color: #ecf0f1; padding: 5px;');

})();
