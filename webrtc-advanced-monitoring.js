// ============================================================================
// 🚀 SISTEMA AVANZADO DE MONITOREO WEBRTC + SOCKET.IO + PERFORMANCE
// ============================================================================
// Versión: 2.0
// Uso: Ejecutar como snippet en DevTools durante una clase en vivo
// ============================================================================

(function() {
  'use strict';

  // ========================================================================
  // CONFIGURACIÓN
  // ========================================================================
  const CONFIG = {
    updateInterval: 2000,        // Actualizar métricas cada 2 segundos
    maxHistorySize: 30,          // Guardar últimos 30 registros
    warningThresholds: {
      packetLoss: 5,             // % de packet loss
      jitter: 30,                // ms de jitter
      rtt: 200,                  // ms de round-trip time
      cpuUsage: 70,              // % de CPU
      memoryUsage: 70,           // % de memoria
      fps: 20                    // FPS mínimo aceptable
    }
  };

  // ========================================================================
  // CLASE PRINCIPAL DE MONITOREO
  // ========================================================================
  class WebRTCMonitor {
    constructor() {
      this.isMonitoring = false;
      this.monitoringInterval = null;
      this.history = {
        webrtc: [],
        socket: [],
        performance: [],
        network: []
      };
      this.startTime = Date.now();
      this.peerConnections = new Map();
      this.socketMetrics = {
        connected: false,
        events: [],
        reconnections: 0,
        latency: 0
      };
    }

    // ======================================================================
    // DETECCIÓN AUTOMÁTICA DE PEER CONNECTIONS
    // ======================================================================
    detectPeerConnections() {
      const connections = new Map();

      // Intentar encontrar peer connections en window
      if (window.peerConnections) {
        connections.set('teacher', window.peerConnections);
      }
      if (window.peerStudentsRef?.current) {
        window.peerStudentsRef.current.forEach((pc, id) => {
          connections.set(`student-${id}`, pc);
        });
      }
      if (window.peerConnectionRef?.current) {
        connections.set('main', window.peerConnectionRef.current);
      }
      if (window.studentPeerConnectionRef?.current) {
        connections.set('student-main', window.studentPeerConnectionRef.current);
      }

      // Buscar en elementos de video
      document.querySelectorAll('video').forEach((video, index) => {
        if (video.srcObject) {
          // Intentar rastrear la peer connection desde el stream
          const streamId = video.srcObject.id;
          connections.set(`video-${index}-${streamId.slice(0, 8)}`, null);
        }
      });

      this.peerConnections = connections;
      return connections;
    }

    // ======================================================================
    // ESTADÍSTICAS DE WEBRTC
    // ======================================================================
    async collectWebRTCStats() {
      const stats = {
        timestamp: Date.now(),
        connections: [],
        summary: {
          totalConnections: 0,
          connected: 0,
          disconnected: 0,
          failed: 0,
          totalPacketLoss: 0,
          avgJitter: 0,
          avgRTT: 0,
          totalBytesReceived: 0,
          totalBytesSent: 0,
          avgBitrate: 0
        }
      };

      this.detectPeerConnections();

      for (const [label, pc] of this.peerConnections) {
        if (!pc || !pc.getStats) continue;

        stats.summary.totalConnections++;

        const connectionStats = {
          label,
          iceState: pc.iceConnectionState,
          connectionState: pc.connectionState,
          signalingState: pc.signalingState,
          video: { inbound: {}, outbound: {} },
          audio: { inbound: {}, outbound: {} },
          connection: {}
        };

        // Estados de conexión
        if (pc.iceConnectionState === 'connected' || pc.iceConnectionState === 'completed') {
          stats.summary.connected++;
        } else if (pc.iceConnectionState === 'disconnected') {
          stats.summary.disconnected++;
        } else if (pc.iceConnectionState === 'failed') {
          stats.summary.failed++;
        }

        try {
          const pcStats = await pc.getStats();

          pcStats.forEach(report => {
            // ============================================================
            // VIDEO ENTRANTE
            // ============================================================
            if (report.type === 'inbound-rtp' && report.kind === 'video') {
              connectionStats.video.inbound = {
                bytesReceived: report.bytesReceived || 0,
                packetsReceived: report.packetsReceived || 0,
                packetsLost: report.packetsLost || 0,
                jitter: report.jitter ? (report.jitter * 1000).toFixed(2) : 0,
                framesDecoded: report.framesDecoded || 0,
                framesDropped: report.framesDropped || 0,
                frameWidth: report.frameWidth || 0,
                frameHeight: report.frameHeight || 0,
                framesPerSecond: report.framesPerSecond || 0
              };

              // Calcular packet loss %
              if (report.packetsReceived > 0) {
                const total = report.packetsReceived + report.packetsLost;
                connectionStats.video.inbound.packetLossPercent =
                  ((report.packetsLost / total) * 100).toFixed(2);

                stats.summary.totalPacketLoss += parseFloat(connectionStats.video.inbound.packetLossPercent);
              }

              stats.summary.totalBytesReceived += report.bytesReceived || 0;
              stats.summary.avgJitter += parseFloat(connectionStats.video.inbound.jitter);
            }

            // ============================================================
            // VIDEO SALIENTE
            // ============================================================
            if (report.type === 'outbound-rtp' && report.kind === 'video') {
              connectionStats.video.outbound = {
                bytesSent: report.bytesSent || 0,
                packetsSent: report.packetsSent || 0,
                framesEncoded: report.framesEncoded || 0,
                frameWidth: report.frameWidth || 0,
                frameHeight: report.frameHeight || 0,
                framesPerSecond: report.framesPerSecond || 0,
                qualityLimitationReason: report.qualityLimitationReason || 'none'
              };

              stats.summary.totalBytesSent += report.bytesSent || 0;
            }

            // ============================================================
            // AUDIO ENTRANTE
            // ============================================================
            if (report.type === 'inbound-rtp' && report.kind === 'audio') {
              connectionStats.audio.inbound = {
                bytesReceived: report.bytesReceived || 0,
                packetsReceived: report.packetsReceived || 0,
                packetsLost: report.packetsLost || 0,
                jitter: report.jitter ? (report.jitter * 1000).toFixed(2) : 0
              };
            }

            // ============================================================
            // AUDIO SALIENTE
            // ============================================================
            if (report.type === 'outbound-rtp' && report.kind === 'audio') {
              connectionStats.audio.outbound = {
                bytesSent: report.bytesSent || 0,
                packetsSent: report.packetsSent || 0
              };
            }

            // ============================================================
            // INFORMACIÓN DE CONEXIÓN (RTT, Bandwidth)
            // ============================================================
            if (report.type === 'candidate-pair' && report.state === 'succeeded') {
              connectionStats.connection = {
                rtt: report.currentRoundTripTime
                  ? (report.currentRoundTripTime * 1000).toFixed(2)
                  : 0,
                availableOutgoingBitrate: report.availableOutgoingBitrate
                  ? (report.availableOutgoingBitrate / 1000000).toFixed(2)
                  : 0,
                availableIncomingBitrate: report.availableIncomingBitrate
                  ? (report.availableIncomingBitrate / 1000000).toFixed(2)
                  : 0,
                localCandidateType: report.localCandidateType || 'unknown',
                remoteCandidateType: report.remoteCandidateType || 'unknown'
              };

              if (report.currentRoundTripTime) {
                stats.summary.avgRTT += report.currentRoundTripTime * 1000;
              }
            }

            // ============================================================
            // TRANSPORTE
            // ============================================================
            if (report.type === 'transport') {
              connectionStats.transport = {
                bytesSent: report.bytesSent || 0,
                bytesReceived: report.bytesReceived || 0,
                selectedCandidatePairChanges: report.selectedCandidatePairChanges || 0
              };
            }
          });

          stats.connections.push(connectionStats);

        } catch (error) {
          console.warn(`Error obteniendo stats de ${label}:`, error);
        }
      }

      // Calcular promedios
      const connCount = stats.summary.connected || 1;
      stats.summary.avgJitter = (stats.summary.avgJitter / connCount).toFixed(2);
      stats.summary.avgRTT = (stats.summary.avgRTT / connCount).toFixed(2);
      stats.summary.totalPacketLoss = (stats.summary.totalPacketLoss / connCount).toFixed(2);

      // Calcular bitrate (bytes/segundo a Mbps)
      if (this.history.webrtc.length > 0) {
        const lastStats = this.history.webrtc[this.history.webrtc.length - 1];
        const timeDiff = (stats.timestamp - lastStats.timestamp) / 1000; // segundos

        if (timeDiff > 0) {
          const bytesDiff = stats.summary.totalBytesReceived - lastStats.summary.totalBytesReceived;
          stats.summary.avgBitrate = ((bytesDiff * 8) / timeDiff / 1000000).toFixed(2); // Mbps
        }
      }

      return stats;
    }

    // ======================================================================
    // ESTADÍSTICAS DE SOCKET.IO
    // ======================================================================
    collectSocketStats() {
      const socketStats = {
        timestamp: Date.now(),
        connected: false,
        id: null,
        transport: null,
        reconnections: this.socketMetrics.reconnections,
        eventCount: this.socketMetrics.events.length,
        recentEvents: this.socketMetrics.events.slice(-10),
        latency: this.socketMetrics.latency
      };

      // Intentar encontrar socket
      const socket = window.socket || window.socketRef?.current || window.io?.sockets?.[0];

      if (socket) {
        socketStats.connected = socket.connected;
        socketStats.id = socket.id;
        socketStats.transport = socket.io?.engine?.transport?.name || 'unknown';

        // Medir latencia con ping
        if (socket.connected) {
          const start = Date.now();
          socket.emit('ping', {}, () => {
            this.socketMetrics.latency = Date.now() - start;
          });
        }
      }

      return socketStats;
    }

    // ======================================================================
    // ESTADÍSTICAS DE RENDIMIENTO DEL NAVEGADOR
    // ======================================================================
    collectPerformanceStats() {
      const perfStats = {
        timestamp: Date.now(),
        memory: {},
        timing: {},
        fps: 0,
        domElements: document.getElementsByTagName('*').length,
        videoElements: document.querySelectorAll('video').length,
        activeStreams: 0
      };

      // Memoria
      if (performance.memory) {
        perfStats.memory = {
          usedJSHeapSize: (performance.memory.usedJSHeapSize / 1024 / 1024).toFixed(2),
          totalJSHeapSize: (performance.memory.totalJSHeapSize / 1024 / 1024).toFixed(2),
          jsHeapSizeLimit: (performance.memory.jsHeapSizeLimit / 1024 / 1024).toFixed(2),
          usagePercent: ((performance.memory.usedJSHeapSize / performance.memory.jsHeapSizeLimit) * 100).toFixed(2)
        };
      }

      // Timing de navegación
      if (performance.timing) {
        const timing = performance.timing;
        perfStats.timing = {
          loadTime: timing.loadEventEnd - timing.navigationStart,
          domReadyTime: timing.domContentLoadedEventEnd - timing.navigationStart,
          connectTime: timing.responseEnd - timing.requestStart
        };
      }

      // Contar streams activos
      document.querySelectorAll('video').forEach(video => {
        if (video.srcObject && video.srcObject.active) {
          perfStats.activeStreams++;
        }
      });

      // Calcular FPS (aproximado)
      if (this.lastFrameTime) {
        const now = performance.now();
        perfStats.fps = Math.round(1000 / (now - this.lastFrameTime));
      }
      this.lastFrameTime = performance.now();

      return perfStats;
    }

    // ======================================================================
    // ESTADÍSTICAS DE RED (NAVEGADOR)
    // ======================================================================
    async collectNetworkStats() {
      const networkStats = {
        timestamp: Date.now(),
        effectiveType: 'unknown',
        downlink: 0,
        rtt: 0,
        saveData: false
      };

      // Navigator Connection API
      const connection = navigator.connection || navigator.mozConnection || navigator.webkitConnection;

      if (connection) {
        networkStats.effectiveType = connection.effectiveType || 'unknown';
        networkStats.downlink = connection.downlink || 0; // Mbps
        networkStats.rtt = connection.rtt || 0; // ms
        networkStats.saveData = connection.saveData || false;
      }

      return networkStats;
    }

    // ======================================================================
    // FUNCIÓN PRINCIPAL DE RECOLECCIÓN
    // ======================================================================
    async collect() {
      const data = {
        timestamp: Date.now(),
        uptime: ((Date.now() - this.startTime) / 1000).toFixed(0),
        webrtc: await this.collectWebRTCStats(),
        socket: this.collectSocketStats(),
        performance: this.collectPerformanceStats(),
        network: await this.collectNetworkStats()
      };

      // Guardar en historial
      this.history.webrtc.push(data.webrtc);
      this.history.socket.push(data.socket);
      this.history.performance.push(data.performance);
      this.history.network.push(data.network);

      // Limitar tamaño del historial
      if (this.history.webrtc.length > CONFIG.maxHistorySize) {
        this.history.webrtc.shift();
        this.history.socket.shift();
        this.history.performance.shift();
        this.history.network.shift();
      }

      return data;
    }

    // ======================================================================
    // DETECTAR PROBLEMAS
    // ======================================================================
    detectProblems(data) {
      const problems = [];

      // Problemas de WebRTC
      if (parseFloat(data.webrtc.summary.totalPacketLoss) > CONFIG.warningThresholds.packetLoss) {
        problems.push({
          severity: 'high',
          category: 'webrtc',
          message: `Packet Loss alto: ${data.webrtc.summary.totalPacketLoss}%`,
          value: data.webrtc.summary.totalPacketLoss,
          threshold: CONFIG.warningThresholds.packetLoss
        });
      }

      if (parseFloat(data.webrtc.summary.avgJitter) > CONFIG.warningThresholds.jitter) {
        problems.push({
          severity: 'medium',
          category: 'webrtc',
          message: `Jitter alto: ${data.webrtc.summary.avgJitter}ms`,
          value: data.webrtc.summary.avgJitter,
          threshold: CONFIG.warningThresholds.jitter
        });
      }

      if (parseFloat(data.webrtc.summary.avgRTT) > CONFIG.warningThresholds.rtt) {
        problems.push({
          severity: 'medium',
          category: 'webrtc',
          message: `RTT alto: ${data.webrtc.summary.avgRTT}ms`,
          value: data.webrtc.summary.avgRTT,
          threshold: CONFIG.warningThresholds.rtt
        });
      }

      // Problemas de conexión
      if (data.webrtc.summary.failed > 0) {
        problems.push({
          severity: 'critical',
          category: 'webrtc',
          message: `${data.webrtc.summary.failed} conexiones FALLIDAS`,
          value: data.webrtc.summary.failed
        });
      }

      // Problemas de rendimiento
      if (data.performance.memory.usagePercent > CONFIG.warningThresholds.memoryUsage) {
        problems.push({
          severity: 'high',
          category: 'performance',
          message: `Uso de memoria alto: ${data.performance.memory.usagePercent}%`,
          value: data.performance.memory.usagePercent,
          threshold: CONFIG.warningThresholds.memoryUsage
        });
      }

      if (data.performance.fps < CONFIG.warningThresholds.fps && data.performance.fps > 0) {
        problems.push({
          severity: 'medium',
          category: 'performance',
          message: `FPS bajo: ${data.performance.fps}`,
          value: data.performance.fps,
          threshold: CONFIG.warningThresholds.fps
        });
      }

      // Problemas de socket
      if (!data.socket.connected) {
        problems.push({
          severity: 'critical',
          category: 'socket',
          message: 'Socket desconectado',
          value: false
        });
      }

      if (data.socket.reconnections > 3) {
        problems.push({
          severity: 'high',
          category: 'socket',
          message: `Múltiples reconexiones: ${data.socket.reconnections}`,
          value: data.socket.reconnections
        });
      }

      return problems;
    }

    // ======================================================================
    // MOSTRAR DASHBOARD EN CONSOLA
    // ======================================================================
    displayDashboard(data, problems) {
      console.clear();

      // Header
      console.log('%c╔═══════════════════════════════════════════════════════════════════╗', 'color: #3498db');
      console.log('%c║   🚀 DASHBOARD DE MONITOREO WEBRTC + SOCKET.IO + PERFORMANCE    ║', 'color: #3498db; font-weight: bold');
      console.log('%c╚═══════════════════════════════════════════════════════════════════╝', 'color: #3498db');
      console.log(`\n⏱️  Uptime: ${data.uptime}s  |  🔄 Actualizado: ${new Date().toLocaleTimeString()}\n`);

      // Problemas detectados
      if (problems.length > 0) {
        console.log('%c⚠️  PROBLEMAS DETECTADOS', 'background: #e74c3c; color: white; font-size: 14px; padding: 5px;');
        problems.forEach(p => {
          const icon = p.severity === 'critical' ? '🔴' : p.severity === 'high' ? '🟠' : '🟡';
          console.log(`${icon} [${p.category.toUpperCase()}] ${p.message}`);
        });
        console.log('');
      } else {
        console.log('%c✅ Todo funcionando correctamente', 'background: #27ae60; color: white; padding: 5px;');
        console.log('');
      }

      // WebRTC Stats
      console.log('%c📊 ESTADÍSTICAS WEBRTC', 'background: #3498db; color: white; font-size: 14px; padding: 5px;');
      console.table({
        'Conexiones Totales': data.webrtc.summary.totalConnections,
        'Conectadas': `${data.webrtc.summary.connected} ✅`,
        'Desconectadas': data.webrtc.summary.disconnected,
        'Fallidas': data.webrtc.summary.failed,
        'Packet Loss': `${data.webrtc.summary.totalPacketLoss}%`,
        'Jitter Promedio': `${data.webrtc.summary.avgJitter}ms`,
        'RTT Promedio': `${data.webrtc.summary.avgRTT}ms`,
        'Bitrate Recibido': `${data.webrtc.summary.avgBitrate} Mbps`,
        'Datos Recibidos': `${(data.webrtc.summary.totalBytesReceived / 1024 / 1024).toFixed(2)} MB`,
        'Datos Enviados': `${(data.webrtc.summary.totalBytesSent / 1024 / 1024).toFixed(2)} MB`
      });

      // Detalles por conexión
      if (data.webrtc.connections.length > 0) {
        console.log('\n📹 Detalles por Conexión:');
        data.webrtc.connections.forEach(conn => {
          const status = conn.iceState === 'connected' || conn.iceState === 'completed' ? '✅' : '❌';
          console.groupCollapsed(`${status} ${conn.label} - ${conn.iceState}`);

          if (conn.video.inbound.bytesReceived) {
            console.log('📥 Video Entrante:', {
              Resolución: `${conn.video.inbound.frameWidth}x${conn.video.inbound.frameHeight}`,
              FPS: conn.video.inbound.framesPerSecond,
              'Packet Loss': `${conn.video.inbound.packetLossPercent}%`,
              Jitter: `${conn.video.inbound.jitter}ms`,
              'Frames Perdidos': conn.video.inbound.framesDropped
            });
          }

          if (conn.video.outbound.bytesSent) {
            console.log('📤 Video Saliente:', {
              Resolución: `${conn.video.outbound.frameWidth}x${conn.video.outbound.frameHeight}`,
              FPS: conn.video.outbound.framesPerSecond,
              'Limitación': conn.video.outbound.qualityLimitationReason
            });
          }

          if (conn.connection.rtt) {
            console.log('🌐 Conexión:', {
              RTT: `${conn.connection.rtt}ms`,
              'Ancho Saliente': `${conn.connection.availableOutgoingBitrate} Mbps`,
              'Ancho Entrante': `${conn.connection.availableIncomingBitrate} Mbps`,
              'Tipo Local': conn.connection.localCandidateType,
              'Tipo Remoto': conn.connection.remoteCandidateType
            });
          }

          console.groupEnd();
        });
      }

      // Socket.IO Stats
      console.log('\n%c🔌 SOCKET.IO', 'background: #9b59b6; color: white; font-size: 14px; padding: 5px;');
      console.table({
        'Estado': data.socket.connected ? '✅ Conectado' : '❌ Desconectado',
        'Socket ID': data.socket.id || 'N/A',
        'Transporte': data.socket.transport,
        'Latencia': `${data.socket.latency}ms`,
        'Reconexiones': data.socket.reconnections,
        'Eventos Recientes': data.socket.eventCount
      });

      if (data.socket.recentEvents.length > 0) {
        console.log('Últimos eventos:', data.socket.recentEvents.slice(-5));
      }

      // Performance Stats
      console.log('\n%c⚡ RENDIMIENTO', 'background: #f39c12; color: white; font-size: 14px; padding: 5px;');
      console.table({
        'Memoria Usada': `${data.performance.memory.usedJSHeapSize} MB (${data.performance.memory.usagePercent}%)`,
        'Memoria Total': `${data.performance.memory.totalJSHeapSize} MB`,
        'Límite Memoria': `${data.performance.memory.jsHeapSizeLimit} MB`,
        'FPS': data.performance.fps,
        'Elementos DOM': data.performance.domElements,
        'Videos Activos': `${data.performance.activeStreams}/${data.performance.videoElements}`
      });

      // Network Stats
      console.log('\n%c🌐 RED', 'background: #27ae60; color: white; font-size: 14px; padding: 5px;');
      console.table({
        'Tipo de Conexión': data.network.effectiveType,
        'Velocidad Estimada': `${data.network.downlink} Mbps`,
        'RTT Red': `${data.network.rtt}ms`,
        'Modo Ahorro': data.network.saveData ? 'Sí' : 'No'
      });

      console.log('\n%c═══════════════════════════════════════════════════════════════════', 'color: #95a5a6');
      console.log('💡 Comandos: monitor.stop() | monitor.export() | monitor.resetHistory()');
      console.log('%c═══════════════════════════════════════════════════════════════════', 'color: #95a5a6');
    }

    // ======================================================================
    // CONTROL DE MONITOREO
    // ======================================================================
    async start() {
      if (this.isMonitoring) {
        console.warn('⚠️ El monitoreo ya está activo');
        return;
      }

      console.log('🚀 Iniciando monitoreo...');
      this.isMonitoring = true;
      this.startTime = Date.now();

      // Interceptar eventos de socket si está disponible
      this.setupSocketMonitoring();

      // Bucle de actualización
      this.monitoringInterval = setInterval(async () => {
        const data = await this.collect();
        const problems = this.detectProblems(data);
        this.displayDashboard(data, problems);
      }, CONFIG.updateInterval);

      // Primera actualización inmediata
      const data = await this.collect();
      const problems = this.detectProblems(data);
      this.displayDashboard(data, problems);
    }

    stop() {
      if (!this.isMonitoring) {
        console.warn('⚠️ El monitoreo no está activo');
        return;
      }

      clearInterval(this.monitoringInterval);
      this.isMonitoring = false;
      console.log('🛑 Monitoreo detenido');
    }

    // ======================================================================
    // MONITOREO DE SOCKET.IO
    // ======================================================================
    setupSocketMonitoring() {
      const socket = window.socket || window.socketRef?.current;

      if (!socket) {
        console.warn('⚠️ No se detectó socket.io, monitoreo de socket deshabilitado');
        return;
      }

      // Interceptar eventos
      const originalOn = socket.on.bind(socket);
      const originalEmit = socket.emit.bind(socket);

      socket.on = (event, handler) => {
        return originalOn(event, (...args) => {
          this.socketMetrics.events.push({
            type: 'received',
            event,
            timestamp: Date.now()
          });
          return handler(...args);
        });
      };

      socket.emit = (event, ...args) => {
        this.socketMetrics.events.push({
          type: 'sent',
          event,
          timestamp: Date.now()
        });
        return originalEmit(event, ...args);
      };

      // Rastrear reconexiones
      socket.on('reconnect', () => {
        this.socketMetrics.reconnections++;
      });

      this.socketMetrics.connected = socket.connected;
    }

    // ======================================================================
    // EXPORTAR DATOS
    // ======================================================================
    export() {
      const data = {
        exportTime: new Date().toISOString(),
        uptime: (Date.now() - this.startTime) / 1000,
        config: CONFIG,
        history: this.history
      };

      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `webrtc-monitoring-${Date.now()}.json`;
      a.click();
      URL.revokeObjectURL(url);

      console.log('✅ Datos exportados correctamente');
    }

    resetHistory() {
      this.history = {
        webrtc: [],
        socket: [],
        performance: [],
        network: []
      };
      console.log('🗑️ Historial limpiado');
    }
  }

  // ========================================================================
  // INICIALIZACIÓN GLOBAL
  // ========================================================================
  window.monitor = new WebRTCMonitor();

  console.log('%c🎉 Monitor cargado correctamente!', 'background: #27ae60; color: white; font-size: 16px; padding: 10px;');
  console.log('\n📖 Comandos disponibles:');
  console.log('  monitor.start()         - Iniciar monitoreo');
  console.log('  monitor.stop()          - Detener monitoreo');
  console.log('  monitor.export()        - Exportar datos a JSON');
  console.log('  monitor.resetHistory()  - Limpiar historial\n');
  console.log('💡 Ejecuta monitor.start() para comenzar\n');

})();
