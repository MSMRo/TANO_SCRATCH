/**
 * =============================================================================
 * iScratch - Web Serial Manager for Arduino Nano 33 BLE Sense
 * =============================================================================
 * Manages USB CDC Serial communication directly from the browser using the
 * W3C Web Serial API (navigator.serial).
 * Works over HTTPS on GitHub Pages and over http://localhost.
 */

class WebSerialManager {
  constructor() {
    this.port = null;
    this.reader = null;
    this.writer = null;
    this.connected = false;
    this.isReading = false;
    this.baudRate = 115200;

    // Sensor telemetry cache with default resting states
    this.telemetry = {
      t: null,      // Temperature (°C)
      h: null,      // Humidity (%)
      p: null,      // Barometric Pressure (hPa)
      ax: 0.0,      // Accel X (g)
      ay: 0.0,      // Accel Y (g)
      az: 1.0,      // Accel Z (g, ~1g at rest)
      gx: 0.0,      // Gyro X (°/s)
      gy: 0.0,      // Gyro Y (°/s)
      gz: 0.0,      // Gyro Z (°/s)
      mx: 0.0,      // Mag X (µT)
      my: 0.0,      // Mag Y (µT)
      mz: 0.0,      // Mag Z (µT)
      r: 0,         // Color Red (0-255)
      g: 0,         // Color Green (0-255)
      b: 0,         // Color Blue (0-255)
      light: 0,     // Ambient Light
      prox: 255,    // Proximity (0-255, 255 = far)
      gesture: 'NONE',
      sound: 0      // Microphone RMS level (0-100)
    };

    this.lastGesture = 'NONE';
    this.gestureTime = 0;
    this.listeners = {
      telemetry: [],
      status: [],
      raw: []
    };

    // Listen to hardware unplug events
    if ('serial' in navigator) {
      navigator.serial.addEventListener('disconnect', (e) => {
        if (e.target === this.port) {
          console.warn('Arduino Nano 33 BLE Sense desconectado físicamente.');
          this.disconnect();
        }
      });
    }
  }

  isSupported() {
    return 'serial' in navigator;
  }

  onTelemetry(callback) {
    this.listeners.telemetry.push(callback);
  }

  onStatusChange(callback) {
    this.listeners.status.push(callback);
  }

  onRawLog(callback) {
    this.listeners.raw.push(callback);
  }

  _notifyStatus(status, details = '') {
    this.listeners.status.forEach((cb) => {
      try { cb(status, details); } catch (e) { console.error(e); }
    });
  }

  _notifyRaw(text, type = 'in') {
    this.listeners.raw.forEach((cb) => {
      try { cb(text, type); } catch (e) { console.error(e); }
    });
  }

  async connect(baudRate = 115200) {
    if (!this.isSupported()) {
      throw new Error('La Web Serial API no está soportada en este navegador. Por favor usa Google Chrome, Microsoft Edge u Opera.');
    }

    this.baudRate = Number(baudRate) || 115200;

    try {
      this._notifyStatus('connecting', 'Solicitando puerto COM...');
      // Request USB port from user dialog
      this.port = await navigator.serial.requestPort({
        filters: [
          { usbVendorId: 0x2341 } // Official Arduino USB Vendor ID
        ]
      }).catch(async (e) => {
        // If filter fails or user has a clone, fall back to unfiltered request
        return await navigator.serial.requestPort();
      });

      if (!this.port) {
        this._notifyStatus('disconnected', 'Selección cancelada');
        return false;
      }

      await this.port.open({
        baudRate: this.baudRate,
        dataBits: 8,
        stopBits: 1,
        parity: 'none',
        bufferSize: 8192
      });

      this.connected = true;
      this.isReading = true;
      this._notifyStatus('connected', `Conectado a ${this.baudRate} baudios`);

      // Start asynchronous read loop
      this._readLoop();
      return true;
    } catch (err) {
      console.error('Error al abrir puerto serial:', err);
      this.connected = false;
      this._notifyStatus('error', err.message);
      return false;
    }
  }

  async disconnect() {
    this.isReading = false;
    this.connected = false;

    if (this.reader) {
      try {
        await this.reader.cancel();
        this.reader.releaseLock();
      } catch (e) {}
      this.reader = null;
    }

    if (this.port) {
      try {
        await this.port.close();
      } catch (e) {}
      this.port = null;
    }

    this._notifyStatus('disconnected', 'Desconectado');
  }

  async _readLoop() {
    const textDecoder = new TextDecoderStream();
    const readableStreamClosed = this.port.readable.pipeTo(textDecoder.writable);
    this.reader = textDecoder.readable.getReader();

    let buffer = '';

    try {
      while (this.isReading) {
        const { value, done } = await this.reader.read();
        if (done) break;
        if (value) {
          buffer += value;
          const lines = buffer.split('\n');
          buffer = lines.pop(); // Keep uncompleted line in buffer

          for (const line of lines) {
            const trimmed = line.trim();
            if (!trimmed) continue;
            this._notifyRaw(trimmed, 'in');

            if (trimmed.startsWith('{') && trimmed.endsWith('}')) {
              try {
                const parsed = JSON.parse(trimmed);
                Object.assign(this.telemetry, parsed);

                // Track gestures (instantaneous per packet)
                if (parsed.gesture && parsed.gesture !== 'NONE') {
                  this.telemetry.gesture = parsed.gesture;
                  this.lastGesture = parsed.gesture;
                  this.gestureTime = Date.now();
                } else {
                  this.telemetry.gesture = 'NONE';
                }

                // Notify UI & Blocks
                this.listeners.telemetry.forEach((cb) => {
                  try { cb(this.telemetry); } catch (e) {}
                });
              } catch (jsonErr) {
                // Ignore incomplete json fragments
              }
            }
          }
        }
      }
    } catch (err) {
      if (this.isReading) {
        console.warn('Error en flujo serial:', err);
      }
    } finally {
      this.connected = false;
      this._notifyStatus('disconnected', 'Conexión serial finalizada');
    }
  }

  async send(data) {
    if (!this.connected || !this.port || !this.port.writable) {
      console.warn('No hay conexión serial activa para transmitir.');
      return false;
    }

    try {
      const encoder = new TextEncoder();
      const writer = this.port.writable.getWriter();
      const payload = typeof data === 'object' ? JSON.stringify(data) : String(data);
      await writer.write(encoder.encode(payload + '\n'));
      writer.releaseLock();
      this._notifyRaw(payload, 'out');
      return true;
    } catch (err) {
      console.error('Error escribiendo en serial:', err);
      return false;
    }
  }

  // Actuator helpers
  async setBuiltinLed(state) {
    return await this.send({ led: state ? 1 : 0 });
  }

  async setRgbLed(r, g, b) {
    return await this.send({
      rgb: [
        Math.max(0, Math.min(255, Math.round(r))),
        Math.max(0, Math.min(255, Math.round(g))),
        Math.max(0, Math.min(255, Math.round(b)))
      ]
    });
  }

  getRecentGesture() {
    if (Date.now() - this.gestureTime < 1500) {
      return this.lastGesture;
    }
    return 'NONE';
  }
}

// Global singleton instance
window.iScratchSerial = new WebSerialManager();
