# 📊 GUÍA COMPLETA DE MONITOREO WEBRTC

Esta guía te explica cómo usar las herramientas de monitoreo para diagnosticar problemas de lag y rendimiento en las clases en vivo.

---

## 🎯 HERRAMIENTAS DISPONIBLES

Hemos creado **3 herramientas de monitoreo** con diferentes propósitos:

| Herramienta | Archivo | Propósito | Uso Recomendado |
|-------------|---------|-----------|-----------------|
| **Diagnóstico Básico** | `webrtc-diagnostic-snippet.js` | Verificación rápida | Primer diagnóstico |
| **Monitor Completo** | `webrtc-advanced-monitoring.js` | Monitoreo en tiempo real | Análisis profundo |
| **Monitor de Transmisión** | `webrtc-transmission-monitor.js` | Análisis de codecs y calidad | Problemas de calidad |

---

## 📝 CÓMO USAR LOS SNIPPETS EN DEVTOOLS

### Paso 1: Abrir DevTools Snippets

1. Presiona **F12** para abrir DevTools
2. Ve a la pestaña **Sources** (Fuentes)
3. En el panel izquierdo, busca **Snippets** (puede estar dentro de >>)
4. Click en **+ New snippet**

### Paso 2: Cargar el código

1. Abre uno de los archivos `.js` de monitoreo
2. **Copia TODO el contenido** (Ctrl+A, Ctrl+C)
3. Pégalo en el snippet que creaste
4. Presiona **Ctrl+S** para guardar
5. Renómbralo (click derecho → Rename)

### Paso 3: Ejecutar

1. Únete a una clase en vivo
2. En DevTools → Sources → Snippets
3. Click derecho en tu snippet → **Run** (o Ctrl+Enter)

### Nota sobre "allow pasting"

Si ves el mensaje de advertencia al pegar en la consola:
1. Escribe exactamente: `allow pasting`
2. Presiona Enter
3. Ahora podrás pegar código normalmente

---

## 🔍 HERRAMIENTA 1: DIAGNÓSTICO BÁSICO

**Archivo:** `webrtc-diagnostic-snippet.js`

### ¿Cuándo usarla?

- Primera vez diagnosticando el sistema
- Verificación rápida antes/después de cambios
- Chequeo de rutina

### ¿Qué verifica?

- ✅ Resolución de video actual
- ✅ Detección de streams duplicados
- ✅ Uso de memoria
- ✅ Ancho de banda estimado

### Ejemplo de salida:

```
📋 RESUMEN DEL DIAGNÓSTICO
═══════════════════════════════════════

✅ ¡TODO ESTÁ BIEN! No se detectaron problemas

O

⚠️ SE DETECTARON 2 PROBLEMA(S):

1. ⚠️ Video #1: Resolución MUY ALTA (1920x1080) - Debería ser máximo 1280x720
2. ⚠️ Uso de memoria alto (75%) - Posible memory leak
```

---

## 📊 HERRAMIENTA 2: MONITOR COMPLETO

**Archivo:** `webrtc-advanced-monitoring.js`

### ¿Cuándo usarla?

- Necesitas monitoreo en tiempo real
- Quieres ver tendencias a lo largo del tiempo
- Necesitas análisis de Socket.IO
- Quieres exportar datos para análisis posterior

### ¿Qué monitorea?

- 📡 **WebRTC:** Packet loss, jitter, RTT, bitrate, estado de conexiones
- 🔌 **Socket.IO:** Estado, latencia, eventos, reconexiones
- ⚡ **Performance:** CPU, RAM, FPS, elementos DOM
- 🌐 **Red:** Tipo de conexión, velocidad, latencia

### Comandos:

```javascript
// Iniciar monitoreo en tiempo real (actualiza cada 2 segundos)
monitor.start()

// Detener monitoreo
monitor.stop()

// Exportar datos a JSON
monitor.export()

// Limpiar historial
monitor.resetHistory()
```

### Ejemplo de Dashboard:

```
╔═══════════════════════════════════════════════════════════════════╗
║   🚀 DASHBOARD DE MONITOREO WEBRTC + SOCKET.IO + PERFORMANCE    ║
╚═══════════════════════════════════════════════════════════════════╝

⏱️  Uptime: 45s  |  🔄 Actualizado: 14:32:15

⚠️  PROBLEMAS DETECTADOS
🟠 [WEBRTC] Packet Loss alto: 8.5%
🟡 [WEBRTC] Jitter alto: 35ms

📊 ESTADÍSTICAS WEBRTC
┌─────────────────────┬─────────┐
│ Conexiones Totales  │ 4       │
│ Conectadas          │ 4 ✅    │
│ Packet Loss         │ 8.5%    │
│ Jitter Promedio     │ 35ms    │
│ RTT Promedio        │ 45ms    │
│ Bitrate Recibido    │ 5.2 Mbps│
└─────────────────────┴─────────┘

[... más métricas]
```

### Interpretar los resultados:

#### Packet Loss (Pérdida de paquetes)
- ✅ **0-2%:** Excelente
- ⚠️ **2-5%:** Aceptable
- 🔴 **>5%:** Problemático - Causa lag

#### Jitter (Variación de latencia)
- ✅ **0-20ms:** Excelente
- ⚠️ **20-30ms:** Aceptable
- 🔴 **>30ms:** Problemático - Audio/video entrecortado

#### RTT (Round-Trip Time)
- ✅ **0-100ms:** Excelente
- ⚠️ **100-200ms:** Aceptable
- 🔴 **>200ms:** Alta latencia

---

## 📡 HERRAMIENTA 3: MONITOR DE TRANSMISIÓN

**Archivo:** `webrtc-transmission-monitor.js`

### ¿Cuándo usarla?

- Problemas de calidad de video/audio
- Video pixelado o borroso
- Quieres ver qué codecs se están usando
- Necesitas análisis detallado de cada track

### ¿Qué analiza?

- 📹 **Video Tracks:** Resolución, FPS, constraints, capabilities, calidad
- 🎤 **Audio Tracks:** Sample rate, canales, echo cancellation, noise suppression
- 🎛️ **Codecs:** VP8, VP9, H.264, Opus, etc.
- 📊 **Estadísticas RTP:** Inbound/Outbound por cada SSRC
- 🔄 **Retransmisiones:** NACK, PLI, FIR
- ⚙️ **Quality Limitation:** Bandwidth, CPU, otros

### Comandos:

```javascript
// Análisis único (snapshot)
transmissionMonitor.displayTransmissionDashboard()

// Monitoreo continuo (actualiza cada 3 segundos)
transmissionMonitor.startContinuousMonitoring()

// Con intervalo personalizado (5 segundos)
transmissionMonitor.startContinuousMonitoring(5000)

// Detener monitoreo
transmissionMonitor.stopMonitoring()
```

### Ejemplo de salida:

```
╔═══════════════════════════════════════════════════════════════════╗
║              📡 ANÁLISIS DE TRANSMISIÓN WEBRTC                   ║
╚═══════════════════════════════════════════════════════════════════╝

📊 RESUMEN
┌──────────────────┬─────┐
│ Total Tracks     │ 8   │
│ Tracks Activos   │ 8   │
│ Bitrate Total    │ 6.2 │
│ Video Tracks     │ 4   │
│ Audio Tracks     │ 4   │
└──────────────────┴─────┘

📹 VIDEO TRACKS
✅ Track 1: video:camera-1234

  📐 Configuración Actual:
  ┌──────────────┬───────────┐
  │ Resolución   │ 640x480   │
  │ Frame Rate   │ 24 fps    │
  │ Aspect Ratio │ 1.333     │
  │ Estado       │ live      │
  │ Habilitado   │ true      │
  └──────────────┴───────────┘

  ⚙️ Constraints Aplicados:
  ✅ width: {ideal: 640, max: 1280}
  ✅ height: {ideal: 480, max: 720}
  ✅ frameRate: {ideal: 24, max: 30}

  🎬 Calidad de Reproducción:
  ┌─────────────────┬────────┐
  │ Video Real      │ 640x480│
  │ Display         │ 320x240│
  │ Frames Totales  │ 1450   │
  │ Frames Perdidos │ 2 (0.1%)│
  └─────────────────┴────────┘

❌ ⚠️ Track 2: video:camera-5678

  📐 Configuración Actual:
  ┌──────────────┬───────────┐
  │ Resolución   │ 1920x1080 │ ⚠️
  │ Frame Rate   │ 30 fps    │
  └──────────────┴───────────┘

  ❌ No hay constraints aplicados - usando resolución máxima de cámara

  ⚠️ Problemas Detectados:
  🔴 Resolución muy alta: 1920x1080
     💡 Limitar a 1280x720 para mejor rendimiento P2P
  🔴 No hay constraints de resolución aplicados
     💡 Aplicar constraints para optimizar bandwidth

🔗 ANÁLISIS DE TRANSMISIÓN POR CONEXIÓN
🔗 teacher

  🎛️ Codecs:
    video/VP8 (payload: 96)
      a=fmtp:96 x-google-max-bitrate=2000000

  📥 Video Recibido:
  ┌─────────────┬────────────┐
  │ SSRC        │ 123456789  │
  │ Resolución  │ 640x480    │
  │ FPS         │ 24         │
  │ Bitrate     │ 1.5 Mbps   │
  │ Packet Loss │ 0.8%       │
  │ Jitter      │ 12ms       │
  │ Frames Lost │ 2          │
  │ NACK        │ 5          │
  │ PLI         │ 0          │
  │ Freezes     │ 0          │
  └─────────────┴────────────┘

  📤 Video Enviado:
  ┌─────────────────┬────────────┐
  │ SSRC            │ 987654321  │
  │ Resolución      │ 640x480    │
  │ FPS             │ 24         │
  │ Bitrate         │ 1.2 Mbps   │
  │ Keyframes       │ 45         │
  │ Limitación      │ none       │ ✅
  │ Retransmisiones │ 3          │
  └─────────────────┴────────────┘
```

### Problemas comunes y soluciones:

#### ❌ "No hay constraints aplicados"
**Problema:** El video usa resolución máxima de la cámara
**Impacto:** Alto consumo de bandwidth, lag
**Solución:** ✅ Ya corregido en las optimizaciones aplicadas

#### ⚠️ "Calidad limitada por: bandwidth"
**Problema:** La conexión no soporta el bitrate deseado
**Impacto:** Video de menor calidad, reducción automática de resolución/FPS
**Solución:** Reducir resolución inicial o implementar simulcast

#### ⚠️ "Frames Perdidos: >5%"
**Problema:** El decoder no puede procesar todos los frames
**Impacto:** Video entrecortado
**Solución:** Reducir FPS o resolución, verificar CPU

#### ⚠️ "NACK > 50" o "PLI > 10"
**Problema:** Muchas retransmisiones (red inestable)
**Impacto:** Latencia adicional, posible lag
**Solución:** Verificar calidad de red, considerar TURN server

---

## 🎯 FLUJO DE DIAGNÓSTICO RECOMENDADO

### 1. Verificación Inicial (2 minutos)

```javascript
// Ejecutar diagnóstico básico
// (Usar webrtc-diagnostic-snippet.js)
```

**Revisar:**
- ¿Resolución de video ≤ 720p?
- ¿Hay streams duplicados?
- ¿Memoria estable?

**Si todo está bien:** ✅ Las optimizaciones están funcionando

**Si hay problemas:** → Ir al paso 2

---

### 2. Análisis Profundo (5-10 minutos)

```javascript
// Cargar monitor completo
monitor.start()

// Dejar correr por 2-3 minutos mientras usas la clase
// Observar el dashboard en tiempo real
```

**Revisar:**
- Packet Loss: ¿<5%?
- Jitter: ¿<30ms?
- RTT: ¿<200ms?
- Conexiones: ¿Todas en estado "connected"?
- Memoria: ¿Estable o crece?

**Identificar problemas:**
- 🔴 Packet Loss alto → Problema de red o bandwidth
- 🔴 Jitter alto → Red inestable
- 🔴 Conexiones "failed" → Problema de firewall o NAT
- 🔴 Memoria crece → Memory leak

---

### 3. Análisis de Transmisión (Solo si hay problemas de calidad)

```javascript
// Cargar monitor de transmisión
transmissionMonitor.displayTransmissionDashboard()
```

**Revisar:**
- ¿Todos los tracks tienen constraints aplicados?
- ¿Quality limitation reason es "none"?
- ¿Codec usado es eficiente (VP8/VP9)?
- ¿Frames perdidos < 2%?

---

## 📤 EXPORTAR DATOS PARA ANÁLISIS

Si necesitas compartir los resultados para análisis más profundo:

```javascript
// Con monitor completo
monitor.start()

// Dejar correr por 5-10 minutos

// Exportar datos
monitor.export()

// Se descargará un archivo JSON con todo el historial
```

El archivo JSON incluye:
- Historial completo de métricas WebRTC
- Eventos de Socket.IO
- Métricas de performance
- Métricas de red

---

## 🔧 HERRAMIENTA INTEGRADA EN chrome://webrtc-internals

Chrome tiene una herramienta integrada muy poderosa:

1. Abre una nueva pestaña
2. Navega a: `chrome://webrtc-internals`
3. Únete a la clase en otra pestaña
4. Regresa a webrtc-internals

**Verás:**
- Todas las peer connections activas
- Gráficos en tiempo real de bitrate, packet loss, RTT
- SDP completo (offer/answer)
- Estadísticas detalladas por SSRC
- Logs de eventos ICE

**Cómo usar:**
- Click en una peer connection para expandir
- Buscar "ssrc" para ver estadísticas por stream
- Buscar "googAvailable" para ver bandwidth disponible
- Exportar stats con el botón "Download the PeerConnection updates and stats data"

---

## 📊 MÉTRICAS IMPORTANTES Y SUS UMBRALES

### WebRTC

| Métrica | Excelente | Aceptable | Problemático |
|---------|-----------|-----------|--------------|
| **Packet Loss** | 0-2% | 2-5% | >5% 🔴 |
| **Jitter** | 0-20ms | 20-30ms | >30ms 🔴 |
| **RTT** | 0-100ms | 100-200ms | >200ms 🔴 |
| **Bitrate** | Estable | Variaciones <20% | Variaciones >50% 🔴 |
| **FPS** | >24 | 20-24 | <20 🔴 |

### Performance

| Métrica | Excelente | Aceptable | Problemático |
|---------|-----------|-----------|--------------|
| **Memoria** | <50% | 50-70% | >70% 🔴 |
| **CPU** | <50% | 50-70% | >70% 🔴 |
| **FPS Browser** | 60 | 30-60 | <30 🔴 |
| **DOM Elements** | <3000 | 3000-5000 | >5000 🔴 |

### Red

| Tipo Conexión | Velocidad | Recomendación |
|---------------|-----------|---------------|
| **4G** | ~10 Mbps | ✅ OK para 4-6 usuarios |
| **WiFi** | >20 Mbps | ✅ OK para 10+ usuarios |
| **Ethernet** | >50 Mbps | ✅ Óptimo |
| **3G** | ~3 Mbps | ⚠️ Solo 1-2 usuarios |

---

## 🚨 SOLUCIÓN DE PROBLEMAS COMUNES

### Problema: Packet Loss >5%

**Causas posibles:**
1. Red inestable o saturada
2. Bandwidth insuficiente
3. Firewall bloqueando paquetes UDP

**Soluciones:**
1. Verificar conexión a internet (speed test)
2. Cerrar otras aplicaciones que usen internet
3. Configurar TURN server para usar TCP/TLS
4. Reducir bitrate máximo

### Problema: Jitter >30ms

**Causas posibles:**
1. Red inalámbrica con interferencia
2. ISP con mala calidad de servicio
3. Congestión en la red

**Soluciones:**
1. Usar conexión cableada (Ethernet)
2. Cambiar canal WiFi
3. Reducir bitrate para adaptarse a la red

### Problema: Conexiones en estado "failed"

**Causas posibles:**
1. Firewall bloqueando WebRTC
2. NAT simétrico
3. Sin TURN server configurado

**Soluciones:**
1. Verificar configuración de firewall
2. Configurar TURN server
3. Usar hotspot de celular para probar (bypass firewall)

### Problema: Memoria crece constantemente

**Causas posibles:**
1. Memory leak - conexiones no se cierran
2. Streams no se detienen

**Soluciones:**
✅ Ya corregido en las optimizaciones aplicadas

### Problema: Video pixelado o borroso

**Causas posibles:**
1. Resolución demasiado baja
2. Bitrate limitado por bandwidth
3. Calidad limitada por CPU

**Soluciones:**
1. Verificar constraints de resolución
2. Ver "qualityLimitationReason" en monitor de transmisión
3. Si es "bandwidth": Mejorar conexión
4. Si es "cpu": Reducir FPS o resolución

---

## 💡 CONSEJOS PRO

### 1. Usar múltiples herramientas simultáneamente

```javascript
// En una pestaña
monitor.start()

// En otra consola (o después)
transmissionMonitor.startContinuousMonitoring()

// En otra pestaña
chrome://webrtc-internals
```

### 2. Comparar antes/después de cambios

```javascript
// Antes del cambio
monitor.start()
// Esperar 2 minutos
monitor.export() // Guardar como "antes.json"
monitor.stop()

// Aplicar cambio

// Después del cambio
monitor.start()
// Esperar 2 minutos
monitor.export() // Guardar como "despues.json"

// Comparar ambos archivos JSON
```

### 3. Monitoreo en producción

Considera implementar telemetría automática:
- Capturar packet loss, jitter, RTT cada 10 segundos
- Enviar a servicio de analytics (Datadog, New Relic, etc.)
- Crear alertas cuando métricas exceden umbrales
- Dashboard en tiempo real para soporte

---

## 📚 REFERENCIAS ADICIONALES

- [WebRTC Stats Specification](https://www.w3.org/TR/webrtc-stats/)
- [RTCPeerConnection API](https://developer.mozilla.org/en-US/docs/Web/API/RTCPeerConnection)
- [Chrome WebRTC Internals](https://webrtc.github.io/samples/)
- [Diagnóstico PDF Original](./diagnostico-lag-webrtc.pdf)
- [Correcciones Aplicadas](./CORRECCIONES_LAG_P2P.md)

---

## 🎯 RESUMEN EJECUTIVO

**Para diagnóstico rápido:**
1. Ejecutar `webrtc-diagnostic-snippet.js`
2. Verificar que resolución sea ≤720p
3. Verificar que no haya streams duplicados

**Para análisis profundo:**
1. Ejecutar `webrtc-advanced-monitoring.js`
2. Usar `monitor.start()`
3. Observar packet loss, jitter, RTT
4. Exportar datos si es necesario

**Para problemas de calidad:**
1. Ejecutar `webrtc-transmission-monitor.js`
2. Usar `transmissionMonitor.displayTransmissionDashboard()`
3. Verificar constraints, codecs, quality limitation

**¡Con estas herramientas puedes diagnosticar y resolver cualquier problema de WebRTC!** 🚀
