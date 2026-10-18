/**
 * webserial_camera.js
 * Controlador de comunicación Web Serial para Arduino Nano 33 BLE Sense + OV7675.
 * Decodifica flujo RGB565 / Grayscale de alta velocidad directamente a HTML5 Canvas.
 */

class WebSerialCamera {
  constructor(canvasElement = null) {
    this.canvas = canvasElement;
    this.ctx = canvasElement ? canvasElement.getContext('2d') : null;
    
    // Canvas auxiliar para mantener la resolución nativa antes del reescalado
    this.offscreenCanvas = document.createElement('canvas');
    this.offscreenCtx = this.offscreenCanvas.getContext('2d');

    this.port = null;
    this.reader = null;
    this.writer = null;
    this.isConnected = false;
    this.isStreaming = false;

    // Métricas y estado
    this.width = 160;
    this.height = 120;
    this.format = 'RGB565';
    this.fps = 0;
    this.frameCount = 0;
    this.bytesReceived = 0;
    this.lastFpsUpdate = performance.now();
    this.framesThisSecond = 0;
    this.bandwidthKBps = 0;
    this.bytesThisSecond = 0;

    // Buffer de recepción deslizante
    this.rxBuffer = new Uint8Array(0);

    // Callbacks
    this.onFrameCallback = null;
    this.onStatusChangeCallback = null;
    this.onMetricsCallback = null;
    this.onErrorCallback = null;

    // Magic bytes: 0xAA 0x55 0xAA 0x55 y Footer: 0x55 0xAA
    this.MAGIC = [0xAA, 0x55, 0xAA, 0x55];
  }

  isSupported() {
    return 'serial' in navigator;
  }

  setCanvas(canvasElement) {
    this.canvas = canvasElement;
    this.ctx = canvasElement ? canvasElement.getContext('2d') : null;
  }

  async connect(baudRate = 115200) {
    if (!this.isSupported()) {
      throw new Error('Web Serial API no es compatible con este navegador. Por favor usa Google Chrome, Microsoft Edge u Opera.');
    }

    try {
      // Solicitar selección de puerto al usuario
      this.port = await navigator.serial.requestPort({
        filters: [
          { usbVendorId: 0x2341 } // Arduino VID
        ]
      }).catch(err => {
        // Si el usuario cancela o no filtra, permitir cualquier puerto
        return navigator.serial.requestPort();
      });

      if (!this.port) return false;

      // Abrir puerto serial con tamaño de búfer optimizado
      await this.port.open({
        baudRate: parseInt(baudRate, 10),
        bufferSize: 65536
      });

      this.isConnected = true;
      this.isStreaming = true;
      this._updateStatus('Conectado');

      // Escuchar desconexión física de USB
      navigator.serial.addEventListener('disconnect', (event) => {
        if (event.target === this.port) {
          this.disconnect();
          this._updateStatus('Desconectado (Dispositivo retirado)');
        }
      });

      // Iniciar bucle de lectura asíncrono
      this._startReadLoop();

      // Enviar comando para arrancar streaming en Nano 33 BLE
      await this.sendCommand('S');

      return true;
    } catch (err) {
      this._updateStatus('Error al conectar: ' + err.message);
      if (this.onErrorCallback) this.onErrorCallback(err);
      throw err;
    }
  }

  async disconnect() {
    this.isConnected = false;
    this.isStreaming = false;

    try {
      if (this.reader) {
        await this.reader.cancel();
        this.reader.releaseLock();
        this.reader = null;
      }
    } catch (e) {
      console.warn('Error cerrando reader:', e);
    }

    try {
      if (this.port) {
        await this.port.close();
        this.port = null;
      }
    } catch (e) {
      console.warn('Error cerrando port:', e);
    }

    this._updateStatus('Desconectado');
  }

  async sendCommand(cmdChar) {
    if (!this.port || !this.port.writable) return;
    try {
      const writer = this.port.writable.getWriter();
      const encoder = new TextEncoder();
      await writer.write(encoder.encode(cmdChar));
      writer.releaseLock();
    } catch (err) {
      console.error('Error al enviar comando:', err);
    }
  }

  setResolution(resKey) {
    // '5' = 80x60 (Ultra Fluido), '6' = 64x64, '4' = 96x96 (TinyML), '1' = 160x120, '2' = 176x144, '3' = 320x240
    const cmdMap = {
      '80x60': '5',
      '64x64': '6',
      '96x96': '4',
      '160x120': '1',
      '176x144': '2',
      '320x240': '3',
      0: '1',
      1: '2',
      2: '3',
      3: '4',
      4: '5',
      5: '6'
    };
    const char = cmdMap[resKey] || '5';
    this.sendCommand(char);
  }

  setColorMode(isGrayscale) {
    this.sendCommand(isGrayscale ? 'G' : 'K');
  }

  toggleTestPattern() {
    this.sendCommand('T');
  }

  toggleHFlip() {
    this.sendCommand('H');
  }

  toggleVFlip() {
    this.sendCommand('V');
  }

  toggleStreaming() {
    this.isStreaming = !this.isStreaming;
    this.sendCommand(this.isStreaming ? 'S' : 'P');
  }

  requestSnapshot() {
    this.sendCommand('C');
  }

  async _startReadLoop() {
    while (this.port && this.port.readable && this.isConnected) {
      try {
        this.reader = this.port.readable.getReader();
        while (true) {
          const { value, done } = await this.reader.read();
          if (done) break;
          if (value && value.length > 0) {
            this._handleIncomingBytes(value);
          }
        }
      } catch (err) {
        if (this.isConnected) {
          console.error('Excepción en lectura serial:', err);
        }
        break;
      } finally {
        if (this.reader) {
          try { this.reader.releaseLock(); } catch (e) {}
          this.reader = null;
        }
      }
    }
  }

  _handleIncomingBytes(chunk) {
    this.bytesReceived += chunk.length;
    this.bytesThisSecond += chunk.length;

    // Concatenar el nuevo chunk al búfer acumulado
    const newBuffer = new Uint8Array(this.rxBuffer.length + chunk.length);
    newBuffer.set(this.rxBuffer);
    newBuffer.set(chunk, this.rxBuffer.length);
    this.rxBuffer = newBuffer;

    // Procesar todos los paquetes completos contenidos en el búfer
    this._processBuffer();
    this._calculateMetrics();
  }

  _processBuffer() {
    const HEADER_SIZE = 16;
    const FOOTER_SIZE = 2;

    while (this.rxBuffer.length >= HEADER_SIZE) {
      // Buscar el patrón Magic: 0xAA 0x55 0xAA 0x55
      let syncIndex = -1;
      for (let i = 0; i <= this.rxBuffer.length - 4; i++) {
        if (this.rxBuffer[i] === this.MAGIC[0] &&
            this.rxBuffer[i + 1] === this.MAGIC[1] &&
            this.rxBuffer[i + 2] === this.MAGIC[2] &&
            this.rxBuffer[i + 3] === this.MAGIC[3]) {
          syncIndex = i;
          break;
        }
      }

      // Si no hay magic bytes, descartar bytes inservibles
      if (syncIndex === -1) {
        // Guardar sólo los últimos 3 bytes en caso de que el magic empiece ahí
        this.rxBuffer = this.rxBuffer.slice(Math.max(0, this.rxBuffer.length - 3));
        return;
      }

      // Descartar basura previa al syncIndex
      if (syncIndex > 0) {
        this.rxBuffer = this.rxBuffer.slice(syncIndex);
      }

      // Verificar si tenemos al menos el header completo
      if (this.rxBuffer.length < HEADER_SIZE) {
        return; // Esperar más bytes
      }

      // Parsear encabezado
      const pktType = this.rxBuffer[4];
      const resId = this.rxBuffer[5];
      const w = (this.rxBuffer[6] << 8) | this.rxBuffer[7];
      const h = (this.rxBuffer[8] << 8) | this.rxBuffer[9];
      const isGray = this.rxBuffer[10] === 0x01;
      const payloadLen = (this.rxBuffer[11] << 24) |
                         (this.rxBuffer[12] << 16) |
                         (this.rxBuffer[13] << 8) |
                         this.rxBuffer[14];
      const chk = this.rxBuffer[15];

      // Validación de seguridad para payloadLen (hasta 320x240x2 = 153600)
      if (payloadLen <= 0 || payloadLen > 320 * 240 * 2) {
        // Cabecera corrupta, avanzar 4 bytes para re-sincronizar
        this.rxBuffer = this.rxBuffer.slice(4);
        continue;
      }

      const totalPacketSize = HEADER_SIZE + payloadLen + FOOTER_SIZE;

      // Esperar a tener el payload completo y el footer
      if (this.rxBuffer.length < totalPacketSize) {
        return; // Aún faltan datos para completar el fotograma
      }

      // Extraer datos del fotograma
      const payload = this.rxBuffer.subarray(HEADER_SIZE, HEADER_SIZE + payloadLen);

      // Decodificar y renderizar
      this.width = w;
      this.height = h;
      this.format = isGray ? 'GRAYSCALE' : 'RGB565';
      this._renderFrame(payload, w, h, isGray);

      // Descartar el paquete procesado
      this.rxBuffer = this.rxBuffer.slice(totalPacketSize);
    }
  }

  setFpsMode(mode) {
    // 'F' = Ultra (15-20 FPS), 'B' = Rápido (10 FPS), 'A' = Seguro (5 FPS)
    if (mode === 'ultra' || mode === '2') {
      this.sendCommand('F');
    } else if (mode === 'fast' || mode === '1') {
      this.sendCommand('B');
    } else {
      this.sendCommand('A');
    }
  }

  _renderFrame(payload, w, h, isGray) {
    if (this.offscreenCanvas.width !== w || this.offscreenCanvas.height !== h) {
      this.offscreenCanvas.width = w;
      this.offscreenCanvas.height = h;
      this.cachedImgData = null;
    }

    if (!this.cachedImgData || this.cachedImgData.width !== w || this.cachedImgData.height !== h) {
      this.cachedImgData = this.offscreenCtx.createImageData(w, h);
    }

    const imgData = this.cachedImgData;
    const totalPixels = w * h;

    // Vista de enteros de 32 bits para escritura directa de píxeles RGBA en 1 sola operación
    const rgba32 = new Uint32Array(imgData.data.buffer);

    if (!isGray) {
      // Decodificación RGB565 ultra-rápida (MSB primero)
      let pIdx = 0;
      for (let i = 0; i < totalPixels; i++) {
        const b1 = payload[pIdx++];
        const b2 = payload[pIdx++];
        const pixel = (b1 << 8) | b2;

        const r = (pixel >> 8) & 0xF8;
        const g = (pixel >> 3) & 0xFC;
        const b = (pixel << 3) & 0xF8;

        // En arquitectura Little-Endian x86/ARM: 0xAABBGGRR
        rgba32[i] = 0xFF000000 | (b << 16) | (g << 8) | r;
      }
    } else {
      // Decodificación Escala de Grises
      let pIdx = 0;
      for (let i = 0; i < totalPixels; i++) {
        const v = payload[pIdx++];
        rgba32[i] = 0xFF000000 | (v << 16) | (v << 8) | v;
      }
    }

    // Dibujar en el canvas offscreen a resolución nativa
    this.offscreenCtx.putImageData(imgData, 0, 0);

    // Dibujar en el canvas principal con suavizado o píxel nítido si está presente
    if (this.canvas && this.ctx) {
      this.ctx.imageSmoothingEnabled = false;
      this.ctx.drawImage(this.offscreenCanvas, 0, 0, this.canvas.width, this.canvas.height);
    }

    this.frameCount++;
    this.framesThisSecond++;

    // Notificar a Teachable Machine o cualquier módulo externo
    if (this.onFrameCallback) {
      this.onFrameCallback(this.offscreenCanvas, w, h, this.format);
    }
  }

  _calculateMetrics() {
    const now = performance.now();
    const elapsed = now - this.lastFpsUpdate;
    if (elapsed >= 1000) {
      this.fps = ((this.framesThisSecond * 1000) / elapsed).toFixed(1);
      this.bandwidthKBps = ((this.bytesThisSecond / 1024) / (elapsed / 1000)).toFixed(1);

      this.framesThisSecond = 0;
      this.bytesThisSecond = 0;
      this.lastFpsUpdate = now;

      if (this.onMetricsCallback) {
        this.onMetricsCallback({
          fps: this.fps,
          bandwidth: this.bandwidthKBps,
          width: this.width,
          height: this.height,
          format: this.format,
          frameCount: this.frameCount,
          bytesReceived: this.bytesReceived
        });
      }
    }
  }

  _updateStatus(msg) {
    if (this.onStatusChangeCallback) {
      this.onStatusChangeCallback(msg, this.isConnected);
    }
  }

  getSnapshotDataUrl() {
    return this.offscreenCanvas.toDataURL('image/png');
  }
}

window.WebSerialCamera = WebSerialCamera;
