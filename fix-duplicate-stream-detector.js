// ============================================================================
// 🔍 DETECTOR DE STREAMS DUPLICADOS
// ============================================================================
// Ejecutar en consola para identificar qué video está duplicado y por qué
// ============================================================================

(function() {
  console.clear();
  console.log('%c🔍 ANÁLISIS DE STREAMS DUPLICADOS', 'background: #e74c3c; color: white; font-size: 16px; padding: 10px;');

  const videos = document.querySelectorAll('video');
  const streamMap = new Map(); // streamId -> array de videos que lo usan

  console.log(`\nTotal de elementos <video>: ${videos.length}\n`);

  videos.forEach((video, index) => {
    if (!video.srcObject) {
      console.log(`Video #${index + 1}: Sin srcObject (vacío)`);
      return;
    }

    const stream = video.srcObject;
    const streamId = stream.id;
    const videoTrack = stream.getVideoTracks()[0];
    const audioTracks = stream.getAudioTracks();

    const info = {
      videoElement: video,
      index: index + 1,
      streamId: streamId,
      videoTrack: videoTrack ? {
        id: videoTrack.id,
        label: videoTrack.label,
        enabled: videoTrack.enabled,
        muted: videoTrack.muted,
        settings: videoTrack.getSettings()
      } : null,
      audioTrackCount: audioTracks.length,
      // Atributos del elemento
      elementInfo: {
        id: video.id,
        className: video.className,
        parentElement: video.parentElement?.className,
        width: video.clientWidth,
        height: video.clientHeight,
        displayStyle: window.getComputedStyle(video).display,
        visibility: window.getComputedStyle(video).visibility,
        position: window.getComputedStyle(video).position
      }
    };

    // Agregar al map
    if (!streamMap.has(streamId)) {
      streamMap.set(streamId, []);
    }
    streamMap.get(streamId).push(info);

    // Mostrar info básica
    console.log(`%cVideo #${index + 1}`, 'font-weight: bold; color: #3498db');
    console.log(`  Stream ID: ${streamId.slice(0, 8)}...`);
    if (videoTrack) {
      console.log(`  Track: ${videoTrack.label}`);
      console.log(`  Resolución: ${videoTrack.getSettings().width}x${videoTrack.getSettings().height}`);
    }
    console.log(`  Element ID: ${video.id || 'sin ID'}`);
    console.log(`  Class: ${video.className || 'sin clase'}`);
    console.log(`  Visible: ${window.getComputedStyle(video).display !== 'none' && window.getComputedStyle(video).visibility !== 'hidden'}`);
    console.log('');
  });

  // Analizar duplicados
  console.log('\n%c📊 ANÁLISIS DE DUPLICADOS', 'background: #f39c12; color: white; font-size: 14px; padding: 5px;');

  let duplicatesFound = 0;

  streamMap.forEach((videos, streamId) => {
    if (videos.length > 1) {
      duplicatesFound++;
      console.log(`\n%c❌ STREAM DUPLICADO #${duplicatesFound}`, 'background: #e74c3c; color: white; padding: 5px;');
      console.log(`Stream ID: ${streamId}`);
      console.log(`Usado en ${videos.length} elementos <video>:\n`);

      videos.forEach(v => {
        console.log(`  Video #${v.index}:`);
        console.log(`    Element ID: ${v.elementInfo.id || 'sin ID'}`);
        console.log(`    Class: ${v.elementInfo.className || 'sin clase'}`);
        console.log(`    Parent: ${v.elementInfo.parentElement || 'sin parent class'}`);
        console.log(`    Tamaño: ${v.elementInfo.width}x${v.elementInfo.height}`);
        console.log(`    Display: ${v.elementInfo.displayStyle}`);
        console.log(`    Visibility: ${v.elementInfo.visibility}`);
        console.log(`    Position: ${v.elementInfo.position}`);

        if (v.videoTrack) {
          console.log(`    Track Label: ${v.videoTrack.label}`);
          console.log(`    Resolución: ${v.videoTrack.settings.width}x${v.videoTrack.settings.height}`);
        }

        // Verificar si el video está realmente visible
        const isVisible = v.elementInfo.displayStyle !== 'none' &&
                         v.elementInfo.visibility !== 'hidden' &&
                         v.elementInfo.width > 0 &&
                         v.elementInfo.height > 0;

        if (isVisible) {
          console.log(`    ✅ VISIBLE en la UI`);
        } else {
          console.log(`    ⚠️ OCULTO (display: ${v.elementInfo.displayStyle}, visibility: ${v.elementInfo.visibility})`);
        }

        console.log('');
      });

      // Recomendación
      console.log(`%c💡 RECOMENDACIÓN:`, 'color: #27ae60; font-weight: bold');

      const visibleCount = videos.filter(v =>
        v.elementInfo.displayStyle !== 'none' &&
        v.elementInfo.visibility !== 'hidden' &&
        v.elementInfo.width > 0
      ).length;

      if (visibleCount > 1) {
        console.log(`  🔴 ${visibleCount} videos VISIBLES con el mismo stream`);
        console.log(`  → Esto causa procesamiento innecesario`);
        console.log(`  → Deberías renderizar solo UNO de ellos`);
        console.log(`  → Revisa tu lógica de render (probablemente en thumbnails/pinned area)`);
      } else if (visibleCount === 1) {
        console.log(`  ⚠️ Solo 1 visible, pero hay ${videos.length - 1} oculto(s)`);
        console.log(`  → El(los) oculto(s) debería(n) tener srcObject = null para liberar recursos`);
        console.log(`  → Revisa tu código de cleanup al ocultar videos`);
      } else {
        console.log(`  ⚠️ Todos están ocultos`);
        console.log(`  → Deberías limpiar todos: videoElement.srcObject = null`);
      }
    }
  });

  if (duplicatesFound === 0) {
    console.log('\n%c✅ No se encontraron streams duplicados', 'background: #27ae60; color: white; padding: 10px;');
  } else {
    console.log(`\n%c⚠️ Total de streams duplicados: ${duplicatesFound}`, 'background: #e74c3c; color: white; padding: 10px;');
  }

  console.log('\n%c═══════════════════════════════════════════════════════', 'color: #95a5a6');
  console.log('💡 Para limpiar un video: document.querySelector("#video-id").srcObject = null');
  console.log('%c═══════════════════════════════════════════════════════', 'color: #95a5a6');

})();
