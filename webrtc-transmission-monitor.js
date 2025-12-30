// ============================================================================
// 📡 MONITOREO AVANZADO DE TRANSMISIÓN WEBRTC
// ============================================================================
// Módulo especializado en análisis profundo de transmisión de media
// Incluye: Codecs, Bitrate, Calidad, Bandwidth Adaptation, Retransmisiones
// ============================================================================

(function() {
  'use strict';

  class TransmissionMonitor {
    constructor() {
      this.tracks = new Map();
      this.codecInfo = new Map();
      this.qualityHistory = [];
      this.bitrateHistory = [];
      this.isMonitoring = false;
    }

    // ======================================================================
    // ANALIZAR TODOS LOS MEDIA TRACKS
    // ======================================================================
    async analyzeAllTracks() {
      const analysis = {
        timestamp: Date.now(),
        videoTracks: [],
        audioTracks: [],
        summary: {
          totalTracks: 0,
          activeTracks: 0,
          mutedTracks: 0,
          endedTracks: 0,
          totalBitrate: 0,
          codecs: new Set()
        }
      };

      // Analizar videos en el DOM
      const videos = document.querySelectorAll('video');

      for (const video of videos) {
        if (!video.srcObject) continue;

        const stream = video.srcObject;

        // Analizar video tracks
        for (const track of stream.getVideoTracks()) {
          const trackAnalysis = await this.analyzeVideoTrack(track, video);
          analysis.videoTracks.push(trackAnalysis);
          analysis.summary.totalTracks++;

          if (track.enabled) analysis.summary.activeTracks++;
          if (track.muted) analysis.summary.mutedTracks++;
          if (track.readyState === 'ended') analysis.summary.endedTracks++;
        }

        // Analizar audio tracks
        for (const track of stream.getAudioTracks()) {
          const trackAnalysis = this.analyzeAudioTrack(track);
          analysis.audioTracks.push(trackAnalysis);
          analysis.summary.totalTracks++;

          if (track.enabled) analysis.summary.activeTracks++;
          if (track.muted) analysis.summary.mutedTracks++;
          if (track.readyState === 'ended') analysis.summary.endedTracks++;
        }
      }

      // Calcular bitrate total
      analysis.videoTracks.forEach(t => {
        if (t.bitrate) analysis.summary.totalBitrate += parseFloat(t.bitrate);
      });

      return analysis;
    }

    // ======================================================================
    // ANALIZAR VIDEO TRACK EN DETALLE
    // ======================================================================
    async analyzeVideoTrack(track, videoElement) {
      const settings = track.getSettings();
      const constraints = track.getConstraints();
      const capabilities = track.getCapabilities ? track.getCapabilities() : {};

      const analysis = {
        id: track.id,
        label: track.label,
        kind: track.kind,
        enabled: track.enabled,
        muted: track.muted,
        readyState: track.readyState,

        // Configuración actual
        current: {
          width: settings.width,
          height: settings.height,
          frameRate: settings.frameRate,
          aspectRatio: settings.aspectRatio,
          facingMode: settings.facingMode,
          resizeMode: settings.resizeMode,
          deviceId: settings.deviceId
        },

        // Constraints aplicados
        constraints: {
          width: constraints.width,
          height: constraints.height,
          frameRate: constraints.frameRate,
          aspectRatio: constraints.aspectRatio,
          facingMode: constraints.facingMode
        },

        // Capacidades del dispositivo
        capabilities: {
          widthRange: capabilities.width,
          heightRange: capabilities.height,
          frameRateRange: capabilities.frameRate,
          aspectRatioRange: capabilities.aspectRatio,
          facingModes: capabilities.facingMode
        },

        // Análisis de calidad
        quality: await this.analyzeVideoQuality(videoElement),

        // Estadísticas de encoder/decoder
        codec: null,
        bitrate: null,
        packetLoss: null,
        jitter: null,
        keyframeInterval: null,

        // Problemas detectados
        issues: []
      };

      // Detectar problemas
      if (settings.width > 1280 || settings.height > 720) {
        analysis.issues.push({
          severity: 'warning',
          message: `Resolución muy alta: ${settings.width}x${settings.height}`,
          recommendation: 'Limitar a 1280x720 para mejor rendimiento P2P'
        });
      }

      if (settings.frameRate > 30) {
        analysis.issues.push({
          severity: 'warning',
          message: `Frame rate muy alto: ${settings.frameRate}fps`,
          recommendation: 'Limitar a 24-30fps'
        });
      }

      if (!constraints.width && !constraints.height) {
        analysis.issues.push({
          severity: 'critical',
          message: 'No hay constraints de resolución aplicados',
          recommendation: 'Aplicar constraints para optimizar bandwidth'
        });
      }

      if (track.readyState === 'ended') {
        analysis.issues.push({
          severity: 'error',
          message: 'Track terminado (ended)',
          recommendation: 'Recrear el track'
        });
      }

      if (track.muted) {
        analysis.issues.push({
          severity: 'info',
          message: 'Track silenciado (muted)',
          recommendation: 'Verificar si es intencional'
        });
      }

      return analysis;
    }

    // ======================================================================
    // ANALIZAR CALIDAD DE VIDEO
    // ======================================================================
    async analyzeVideoQuality(videoElement) {
      const quality = {
        videoWidth: videoElement.videoWidth,
        videoHeight: videoElement.videoHeight,
        displayWidth: videoElement.clientWidth,
        displayHeight: videoElement.clientHeight,
        scaled: false,
        scaleRatio: 1,
        paused: videoElement.paused,
        currentTime: videoElement.currentTime,
        buffered: videoElement.buffered.length,
        playbackRate: videoElement.playbackRate
      };

      // Detectar si el video está escalado
      if (quality.videoWidth > 0 && quality.displayWidth > 0) {
        quality.scaleRatio = (quality.displayWidth / quality.videoWidth).toFixed(2);
        quality.scaled = Math.abs(quality.scaleRatio - 1) > 0.1;

        if (quality.scaled) {
          if (quality.scaleRatio > 1.5) {
            quality.scalingIssue = 'Video upscaled (se ve pixelado)';
          } else if (quality.scaleRatio < 0.7) {
            quality.scalingIssue = 'Video downscaled (desperdicio de bandwidth)';
          }
        }
      }

      // Obtener estadísticas de calidad del video
      if (videoElement.getVideoPlaybackQuality) {
        const playbackQuality = videoElement.getVideoPlaybackQuality();
        quality.totalVideoFrames = playbackQuality.totalVideoFrames;
        quality.droppedVideoFrames = playbackQuality.droppedVideoFrames;
        quality.corruptedVideoFrames = playbackQuality.corruptedVideoFrames;

        if (quality.totalVideoFrames > 0) {
          quality.droppedFramesPercent =
            ((quality.droppedVideoFrames / quality.totalVideoFrames) * 100).toFixed(2);

          if (quality.droppedFramesPercent > 5) {
            quality.qualityIssue = `${quality.droppedFramesPercent}% frames perdidos`;
          }
        }
      }

      return quality;
    }

    // ======================================================================
    // ANALIZAR AUDIO TRACK
    // ======================================================================
    analyzeAudioTrack(track) {
      const settings = track.getSettings();
      const constraints = track.getConstraints();
      const capabilities = track.getCapabilities ? track.getCapabilities() : {};

      const analysis = {
        id: track.id,
        label: track.label,
        kind: track.kind,
        enabled: track.enabled,
        muted: track.muted,
        readyState: track.readyState,

        current: {
          sampleRate: settings.sampleRate,
          sampleSize: settings.sampleSize,
          channelCount: settings.channelCount,
          echoCancellation: settings.echoCancellation,
          noiseSuppression: settings.noiseSuppression,
          autoGainControl: settings.autoGainControl,
          latency: settings.latency,
          deviceId: settings.deviceId
        },

        constraints: {
          sampleRate: constraints.sampleRate,
          channelCount: constraints.channelCount,
          echoCancellation: constraints.echoCancellation,
          noiseSuppression: constraints.noiseSuppression,
          autoGainControl: constraints.autoGainControl
        },

        capabilities: {
          sampleRateRange: capabilities.sampleRate,
          channelCountRange: capabilities.channelCount
        },

        issues: []
      };

      // Detectar problemas
      if (!settings.echoCancellation) {
        analysis.issues.push({
          severity: 'warning',
          message: 'Echo cancellation deshabilitado',
          recommendation: 'Habilitar para mejor calidad de audio'
        });
      }

      if (!settings.noiseSuppression) {
        analysis.issues.push({
          severity: 'info',
          message: 'Noise suppression deshabilitado',
          recommendation: 'Habilitar para reducir ruido de fondo'
        });
      }

      if (track.readyState === 'ended') {
        analysis.issues.push({
          severity: 'error',
          message: 'Track terminado (ended)',
          recommendation: 'Recrear el track'
        });
      }

      return analysis;
    }

    // ======================================================================
    // ANALIZAR ESTADÍSTICAS DE PEER CONNECTION PARA TRANSMISIÓN
    // ======================================================================
    async analyzeTransmissionStats(peerConnection, label = 'Unknown') {
      if (!peerConnection || !peerConnection.getStats) {
        return null;
      }

      const stats = await peerConnection.getStats();
      const analysis = {
        label,
        timestamp: Date.now(),
        inbound: {
          video: [],
          audio: []
        },
        outbound: {
          video: [],
          audio: []
        },
        codecs: [],
        candidates: [],
        transport: null
      };

      stats.forEach(report => {
        // ====================================================================
        // CODECS
        // ====================================================================
        if (report.type === 'codec') {
          analysis.codecs.push({
            mimeType: report.mimeType,
            payloadType: report.payloadType,
            clockRate: report.clockRate,
            channels: report.channels,
            sdpFmtpLine: report.sdpFmtpLine
          });
        }

        // ====================================================================
        // INBOUND RTP (Recepción)
        // ====================================================================
        if (report.type === 'inbound-rtp') {
          const inboundStats = {
            ssrc: report.ssrc,
            kind: report.kind,
            codecId: report.codecId,

            // Packets
            packetsReceived: report.packetsReceived,
            packetsLost: report.packetsLost,
            packetsDiscarded: report.packetsDiscarded,
            packetLossPercent: 0,

            // Bytes
            bytesReceived: report.bytesReceived,
            headerBytesReceived: report.headerBytesReceived,

            // Timing
            jitter: report.jitter ? (report.jitter * 1000).toFixed(2) : 0,
            jitterBufferDelay: report.jitterBufferDelay,
            jitterBufferEmittedCount: report.jitterBufferEmittedCount,

            // Retransmisiones
            nackCount: report.nackCount || 0,
            pliCount: report.pliCount || 0,
            firCount: report.firCount || 0,

            // Específico de video
            ...(report.kind === 'video' && {
              framesReceived: report.framesReceived,
              framesDecoded: report.framesDecoded,
              framesDropped: report.framesDropped,
              frameWidth: report.frameWidth,
              frameHeight: report.frameHeight,
              framesPerSecond: report.framesPerSecond,
              keyFramesDecoded: report.keyFramesDecoded,
              totalDecodeTime: report.totalDecodeTime,
              totalInterFrameDelay: report.totalInterFrameDelay,
              freezeCount: report.freezeCount,
              pauseCount: report.pauseCount,
              totalFreezesDuration: report.totalFreezesDuration,
              totalPausesDuration: report.totalPausesDuration
            }),

            // Específico de audio
            ...(report.kind === 'audio' && {
              totalSamplesReceived: report.totalSamplesReceived,
              concealedSamples: report.concealedSamples,
              silentConcealedSamples: report.silentConcealedSamples,
              audioLevel: report.audioLevel,
              totalAudioEnergy: report.totalAudioEnergy,
              totalSamplesDuration: report.totalSamplesDuration
            })
          };

          // Calcular packet loss %
          if (inboundStats.packetsReceived > 0) {
            const total = inboundStats.packetsReceived + inboundStats.packetsLost;
            inboundStats.packetLossPercent = ((inboundStats.packetsLost / total) * 100).toFixed(2);
          }

          // Calcular bitrate
          if (this.lastInboundStats && this.lastInboundStats[report.ssrc]) {
            const last = this.lastInboundStats[report.ssrc];
            const timeDiff = (report.timestamp - last.timestamp) / 1000; // segundos

            if (timeDiff > 0) {
              const bytesDiff = report.bytesReceived - last.bytesReceived;
              inboundStats.bitrate = ((bytesDiff * 8) / timeDiff / 1000000).toFixed(2); // Mbps
            }
          }

          // Guardar para próximo cálculo
          if (!this.lastInboundStats) this.lastInboundStats = {};
          this.lastInboundStats[report.ssrc] = {
            timestamp: report.timestamp,
            bytesReceived: report.bytesReceived
          };

          if (report.kind === 'video') {
            analysis.inbound.video.push(inboundStats);
          } else {
            analysis.inbound.audio.push(inboundStats);
          }
        }

        // ====================================================================
        // OUTBOUND RTP (Envío)
        // ====================================================================
        if (report.type === 'outbound-rtp') {
          const outboundStats = {
            ssrc: report.ssrc,
            kind: report.kind,
            codecId: report.codecId,

            // Packets
            packetsSent: report.packetsSent,
            bytesSent: report.bytesSent,
            headerBytesSent: report.headerBytesSent,

            // Retransmisiones
            retransmittedPacketsSent: report.retransmittedPacketsSent || 0,
            retransmittedBytesSent: report.retransmittedBytesSent || 0,
            nackCount: report.nackCount || 0,
            pliCount: report.pliCount || 0,
            firCount: report.firCount || 0,

            // Quality Limitation
            qualityLimitationReason: report.qualityLimitationReason,
            qualityLimitationDurations: report.qualityLimitationDurations,
            qualityLimitationResolutionChanges: report.qualityLimitationResolutionChanges,

            // Específico de video
            ...(report.kind === 'video' && {
              framesSent: report.framesSent,
              framesEncoded: report.framesEncoded,
              keyFramesEncoded: report.keyFramesEncoded,
              frameWidth: report.frameWidth,
              frameHeight: report.frameHeight,
              framesPerSecond: report.framesPerSecond,
              totalEncodeTime: report.totalEncodeTime,
              totalPacketSendDelay: report.totalPacketSendDelay,
              hugeFramesSent: report.hugeFramesSent
            }),

            // Específico de audio
            ...(report.kind === 'audio' && {
              totalSamplesSent: report.totalSamplesSent
            })
          };

          // Calcular bitrate
          if (this.lastOutboundStats && this.lastOutboundStats[report.ssrc]) {
            const last = this.lastOutboundStats[report.ssrc];
            const timeDiff = (report.timestamp - last.timestamp) / 1000; // segundos

            if (timeDiff > 0) {
              const bytesDiff = report.bytesSent - last.bytesSent;
              outboundStats.bitrate = ((bytesDiff * 8) / timeDiff / 1000000).toFixed(2); // Mbps

              // Calcular tasa de retransmisión
              if (report.retransmittedPacketsSent) {
                const retransDiff = report.retransmittedPacketsSent - (last.retransmittedPacketsSent || 0);
                const packetsDiff = report.packetsSent - last.packetsSent;
                outboundStats.retransmissionRate =
                  ((retransDiff / packetsDiff) * 100).toFixed(2);
              }
            }
          }

          // Guardar para próximo cálculo
          if (!this.lastOutboundStats) this.lastOutboundStats = {};
          this.lastOutboundStats[report.ssrc] = {
            timestamp: report.timestamp,
            bytesSent: report.bytesSent,
            retransmittedPacketsSent: report.retransmittedPacketsSent
          };

          if (report.kind === 'video') {
            analysis.outbound.video.push(outboundStats);
          } else {
            analysis.outbound.audio.push(outboundStats);
          }
        }

        // ====================================================================
        // ICE CANDIDATES
        // ====================================================================
        if (report.type === 'local-candidate' || report.type === 'remote-candidate') {
          analysis.candidates.push({
            type: report.type,
            candidateType: report.candidateType,
            protocol: report.protocol,
            address: report.address,
            port: report.port,
            priority: report.priority,
            relayProtocol: report.relayProtocol
          });
        }

        // ====================================================================
        // TRANSPORT
        // ====================================================================
        if (report.type === 'transport') {
          analysis.transport = {
            bytesSent: report.bytesSent,
            bytesReceived: report.bytesReceived,
            packetsSent: report.packetsSent,
            packetsReceived: report.packetsReceived,
            selectedCandidatePairChanges: report.selectedCandidatePairChanges,
            dtlsState: report.dtlsState,
            iceState: report.iceState,
            tlsVersion: report.tlsVersion,
            dtlsCipher: report.dtlsCipher,
            srtpCipher: report.srtpCipher
          };
        }
      });

      return analysis;
    }

    // ======================================================================
    // DASHBOARD DE TRANSMISIÓN
    // ======================================================================
    async displayTransmissionDashboard() {
      console.clear();

      console.log('%c╔═══════════════════════════════════════════════════════════════════╗', 'color: #e74c3c');
      console.log('%c║              📡 ANÁLISIS DE TRANSMISIÓN WEBRTC                   ║', 'color: #e74c3c; font-weight: bold');
      console.log('%c╚═══════════════════════════════════════════════════════════════════╝', 'color: #e74c3c');

      // Analizar todos los tracks
      const trackAnalysis = await this.analyzeAllTracks();

      console.log(`\n⏱️  ${new Date().toLocaleTimeString()}\n`);

      // Resumen
      console.log('%c📊 RESUMEN', 'background: #3498db; color: white; padding: 5px;');
      console.table({
        'Total Tracks': trackAnalysis.summary.totalTracks,
        'Tracks Activos': trackAnalysis.summary.activeTracks,
        'Tracks Silenciados': trackAnalysis.summary.mutedTracks,
        'Tracks Terminados': trackAnalysis.summary.endedTracks,
        'Bitrate Total': `${trackAnalysis.summary.totalBitrate.toFixed(2)} Mbps`,
        'Video Tracks': trackAnalysis.videoTracks.length,
        'Audio Tracks': trackAnalysis.audioTracks.length
      });

      // Video Tracks
      if (trackAnalysis.videoTracks.length > 0) {
        console.log('\n%c📹 VIDEO TRACKS', 'background: #e74c3c; color: white; padding: 5px;');

        trackAnalysis.videoTracks.forEach((track, index) => {
          const status = track.enabled ? '✅' : '❌';
          const hasIssues = track.issues.length > 0 ? '⚠️' : '';

          console.groupCollapsed(`${status} ${hasIssues} Track ${index + 1}: ${track.label || track.id.slice(0, 8)}`);

          console.log('📐 Configuración Actual:');
          console.table({
            'Resolución': `${track.current.width}x${track.current.height}`,
            'Frame Rate': `${track.current.frameRate} fps`,
            'Aspect Ratio': track.current.aspectRatio,
            'Estado': track.readyState,
            'Habilitado': track.enabled,
            'Silenciado': track.muted
          });

          if (track.constraints.width || track.constraints.height) {
            console.log('⚙️ Constraints Aplicados:');
            console.table(track.constraints);
          } else {
            console.warn('❌ No hay constraints aplicados - usando resolución máxima de cámara');
          }

          if (track.quality) {
            console.log('🎬 Calidad de Reproducción:');
            console.table({
              'Video Real': `${track.quality.videoWidth}x${track.quality.videoHeight}`,
              'Display': `${track.quality.displayWidth}x${track.quality.displayHeight}`,
              'Escalado': track.quality.scaled ? `Sí (${track.quality.scaleRatio}x)` : 'No',
              'Frames Totales': track.quality.totalVideoFrames,
              'Frames Perdidos': `${track.quality.droppedVideoFrames} (${track.quality.droppedFramesPercent}%)`,
              'Frames Corruptos': track.quality.corruptedVideoFrames
            });

            if (track.quality.scalingIssue) {
              console.warn(`⚠️ ${track.quality.scalingIssue}`);
            }
            if (track.quality.qualityIssue) {
              console.warn(`⚠️ ${track.quality.qualityIssue}`);
            }
          }

          if (track.issues.length > 0) {
            console.log('\n⚠️ Problemas Detectados:');
            track.issues.forEach(issue => {
              const icon = issue.severity === 'critical' ? '🔴' :
                          issue.severity === 'error' ? '❌' :
                          issue.severity === 'warning' ? '⚠️' : 'ℹ️';
              console.log(`${icon} ${issue.message}`);
              console.log(`   💡 ${issue.recommendation}`);
            });
          }

          console.groupEnd();
        });
      }

      // Audio Tracks
      if (trackAnalysis.audioTracks.length > 0) {
        console.log('\n%c🎤 AUDIO TRACKS', 'background: #9b59b6; color: white; padding: 5px;');

        trackAnalysis.audioTracks.forEach((track, index) => {
          const status = track.enabled ? '✅' : '❌';
          const hasIssues = track.issues.length > 0 ? '⚠️' : '';

          console.groupCollapsed(`${status} ${hasIssues} Track ${index + 1}: ${track.label || track.id.slice(0, 8)}`);

          console.table({
            'Sample Rate': `${track.current.sampleRate} Hz`,
            'Canales': track.current.channelCount,
            'Echo Cancellation': track.current.echoCancellation ? '✅' : '❌',
            'Noise Suppression': track.current.noiseSuppression ? '✅' : '❌',
            'Auto Gain': track.current.autoGainControl ? '✅' : '❌',
            'Latencia': `${track.current.latency}ms`,
            'Estado': track.readyState,
            'Habilitado': track.enabled
          });

          if (track.issues.length > 0) {
            console.log('\n⚠️ Problemas:');
            track.issues.forEach(issue => {
              console.log(`${issue.severity}: ${issue.message}`);
              console.log(`💡 ${issue.recommendation}`);
            });
          }

          console.groupEnd();
        });
      }

      // Analizar peer connections
      const peerConnections = this.detectPeerConnections();

      if (peerConnections.size > 0) {
        console.log('\n%c🔗 ANÁLISIS DE TRANSMISIÓN POR CONEXIÓN', 'background: #27ae60; color: white; padding: 5px;');

        for (const [label, pc] of peerConnections) {
          if (!pc || !pc.getStats) continue;

          const analysis = await this.analyzeTransmissionStats(pc, label);

          if (!analysis) continue;

          console.groupCollapsed(`🔗 ${label}`);

          // Codecs
          if (analysis.codecs.length > 0) {
            console.log('🎛️ Codecs:');
            analysis.codecs.forEach(codec => {
              console.log(`  ${codec.mimeType} (payload: ${codec.payloadType})`);
              if (codec.sdpFmtpLine) {
                console.log(`    ${codec.sdpFmtpLine}`);
              }
            });
          }

          // Inbound Video
          if (analysis.inbound.video.length > 0) {
            console.log('\n📥 Video Recibido:');
            analysis.inbound.video.forEach((v, i) => {
              console.table({
                SSRC: v.ssrc,
                Resolución: `${v.frameWidth}x${v.frameHeight}`,
                FPS: v.framesPerSecond,
                Bitrate: v.bitrate ? `${v.bitrate} Mbps` : 'Calculando...',
                'Packet Loss': `${v.packetLossPercent}%`,
                Jitter: `${v.jitter}ms`,
                'Frames Perdidos': v.framesDropped,
                'NACK': v.nackCount,
                'PLI': v.pliCount,
                'FIR': v.firCount,
                'Freezes': v.freezeCount,
                'Pausas': v.pauseCount
              });

              if (v.freezeCount > 0) {
                console.warn(`⚠️ Video congelado ${v.freezeCount} veces (${v.totalFreezesDuration}s total)`);
              }
              if (parseFloat(v.packetLossPercent) > 5) {
                console.error(`🔴 Packet loss alto: ${v.packetLossPercent}%`);
              }
            });
          }

          // Outbound Video
          if (analysis.outbound.video.length > 0) {
            console.log('\n📤 Video Enviado:');
            analysis.outbound.video.forEach((v, i) => {
              console.table({
                SSRC: v.ssrc,
                Resolución: `${v.frameWidth}x${v.frameHeight}`,
                FPS: v.framesPerSecond,
                Bitrate: v.bitrate ? `${v.bitrate} Mbps` : 'Calculando...',
                'Keyframes': v.keyFramesEncoded,
                'Limitación': v.qualityLimitationReason,
                'Retransmisiones': v.retransmittedPacketsSent,
                'Tasa Retrans': v.retransmissionRate ? `${v.retransmissionRate}%` : 'N/A',
                'NACK': v.nackCount,
                'PLI': v.pliCount,
                'FIR': v.firCount
              });

              if (v.qualityLimitationReason && v.qualityLimitationReason !== 'none') {
                console.warn(`⚠️ Calidad limitada por: ${v.qualityLimitationReason}`);
                if (v.qualityLimitationDurations) {
                  console.log('Duración de limitaciones:', v.qualityLimitationDurations);
                }
              }
            });
          }

          // Transport
          if (analysis.transport) {
            console.log('\n🌐 Transporte:');
            console.table({
              'Bytes Enviados': `${(analysis.transport.bytesSent / 1024 / 1024).toFixed(2)} MB`,
              'Bytes Recibidos': `${(analysis.transport.bytesReceived / 1024 / 1024).toFixed(2)} MB`,
              'Estado DTLS': analysis.transport.dtlsState,
              'Estado ICE': analysis.transport.iceState,
              'Cipher SRTP': analysis.transport.srtpCipher,
              'Cambios de Candidato': analysis.transport.selectedCandidatePairChanges
            });
          }

          console.groupEnd();
        }
      }

      console.log('\n%c═══════════════════════════════════════════════════════════════════', 'color: #95a5a6');
      console.log('💡 Para más detalles: chrome://webrtc-internals');
      console.log('%c═══════════════════════════════════════════════════════════════════', 'color: #95a5a6');
    }

    // ======================================================================
    // DETECTAR PEER CONNECTIONS
    // ======================================================================
    detectPeerConnections() {
      const connections = new Map();

      if (window.peerConnectionRef?.current) {
        connections.set('teacher', window.peerConnectionRef.current);
      }
      if (window.studentPeerConnectionRef?.current) {
        connections.set('student-main', window.studentPeerConnectionRef.current);
      }
      if (window.peerStudentsRef?.current) {
        window.peerStudentsRef.current.forEach((pc, id) => {
          connections.set(`student-${id}`, pc);
        });
      }

      return connections;
    }

    // ======================================================================
    // MONITOREO CONTINUO
    // ======================================================================
    startContinuousMonitoring(interval = 3000) {
      if (this.isMonitoring) {
        console.warn('⚠️ El monitoreo ya está activo');
        return;
      }

      this.isMonitoring = true;
      console.log('🚀 Iniciando monitoreo continuo de transmisión...');

      this.monitoringInterval = setInterval(() => {
        this.displayTransmissionDashboard();
      }, interval);

      // Primera ejecución inmediata
      this.displayTransmissionDashboard();
    }

    stopMonitoring() {
      if (!this.isMonitoring) {
        console.warn('⚠️ El monitoreo no está activo');
        return;
      }

      clearInterval(this.monitoringInterval);
      this.isMonitoring = false;
      console.log('🛑 Monitoreo de transmisión detenido');
    }
  }

  // ========================================================================
  // INICIALIZACIÓN
  // ========================================================================
  window.transmissionMonitor = new TransmissionMonitor();

  console.log('%c✅ Monitor de transmisión cargado', 'background: #27ae60; color: white; padding: 10px;');
  console.log('\n📖 Comandos:');
  console.log('  transmissionMonitor.displayTransmissionDashboard()  - Ver análisis completo');
  console.log('  transmissionMonitor.startContinuousMonitoring()     - Monitoreo continuo');
  console.log('  transmissionMonitor.stopMonitoring()                - Detener monitoreo\n');

})();
