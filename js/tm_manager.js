/**
 * =============================================================================
 * iScratch - Teachable Machine Manager
 * =============================================================================
 * Interfaces with Google Teachable Machine image classification models
 * using TensorFlow.js in the browser.
 * Supports both:
 *  1. Computer WebCam (navigator.mediaDevices)
 *  2. OmniVision OV7675 Camera (TinyML Shield + Arduino Nano 33 BLE via Web Serial)
 */

class TeachableMachineManager {
  constructor() {
    this.model = null;
    this.webcam = null;
    this.ov7675 = null;
    this.modelUrl = '';
    this.isLoaded = false;
    this.isClassifying = false;
    this.currentSource = null; // 'webcam' | 'ov7675' | null
    this.classes = [];
    this.predictions = [];
    this.topClass = '';
    this.topConfidence = 0;
    this.lastLatencyMs = 0;

    this.listeners = {
      prediction: [],
      status: [],
      metrics: []
    };
  }

  onPrediction(callback) {
    this.listeners.prediction.push(callback);
  }

  onStatusChange(callback) {
    this.listeners.status.push(callback);
  }

  onMetrics(callback) {
    this.listeners.metrics.push(callback);
  }

  _notifyStatus(status, details = '') {
    this.listeners.status.forEach((cb) => {
      try { cb(status, details); } catch (e) { console.error(e); }
    });
  }

  _notifyMetrics(metrics) {
    this.listeners.metrics.forEach((cb) => {
      try { cb(metrics); } catch (e) { console.error(e); }
    });
  }

  async loadModel(url) {
    if (!url) throw new Error('Se requiere la URL del modelo');

    let cleanUrl = url.trim();
    if (!cleanUrl.endsWith('/')) {
      cleanUrl += '/';
    }
    this.modelUrl = cleanUrl;
    this._notifyStatus('loading', 'Descargando modelo Teachable Machine...');

    try {
      const modelURL = cleanUrl + 'model.json';
      const metadataURL = cleanUrl + 'metadata.json';

      if (!window.tmImage) {
        throw new Error('La librería Teachable Machine Image no se encuentra cargada');
      }

      this.model = await window.tmImage.load(modelURL, metadataURL);
      this.classes = this.model.getClassLabels();
      this.isLoaded = true;
      this._notifyStatus('loaded', `Modelo cargado con ${this.classes.length} clases: ${this.classes.join(', ')}`);
      return true;
    } catch (err) {
      console.error('Error al cargar modelo TM:', err);
      this.isLoaded = false;
      this._notifyStatus('error', 'Error al cargar: ' + err.message);
      return false;
    }
  }

  // ==========================================
  // Cámara Web (PC)
  // ==========================================

  async startWebcam(targetCanvas) {
    // Si la cámara OV7675 está activa, detenerla primero
    if (this.currentSource === 'ov7675') {
      await this.stopOV7675();
    }

    if (this.isClassifying && this.currentSource === 'webcam') return;

    try {
      this._notifyStatus('loading', 'Iniciando cámara web...');
      const flip = true;
      this.webcam = new window.tmImage.Webcam(240, 240, flip);
      await this.webcam.setup();
      await this.webcam.play();
      this.isClassifying = true;
      this.currentSource = 'webcam';
      this._notifyStatus('classifying', 'Cámara Web activa y clasificador listo');

      const loop = async () => {
        if (!this.isClassifying || this.currentSource !== 'webcam') return;
        this.webcam.update();

        // Renderizar video de la webcam en el canvas si fue provisto
        if (targetCanvas) {
          const ctx = targetCanvas.getContext('2d');
          ctx.drawImage(this.webcam.canvas, 0, 0, targetCanvas.width, targetCanvas.height);
        }

        if (this.model) {
          const t0 = performance.now();
          const prediction = await this.model.predict(this.webcam.canvas);
          this.lastLatencyMs = Math.round(performance.now() - t0);
          this.predictions = prediction;

          let highest = { className: '', probability: 0 };
          for (let i = 0; i < prediction.length; i++) {
            if (prediction[i].probability > highest.probability) {
              highest = prediction[i];
            }
          }

          this.topClass = highest.className;
          this.topConfidence = Math.round(highest.probability * 100);

          this.listeners.prediction.forEach((cb) => {
            try { cb(this.predictions, this.topClass, this.topConfidence, this.lastLatencyMs); } catch (e) {}
          });
        }

        window.requestAnimationFrame(loop);
      };

      window.requestAnimationFrame(loop);
      return true;
    } catch (err) {
      console.error('Error al iniciar cámara web:', err);
      this.isClassifying = false;
      this.currentSource = null;
      this._notifyStatus('error', 'Error de cámara web: ' + err.message);
      return false;
    }
  }

  stopWebcam() {
    if (this.webcam) {
      try {
        this.webcam.stop();
      } catch (e) {}
      this.webcam = null;
    }
    if (this.currentSource === 'webcam') {
      this.isClassifying = false;
      this.currentSource = null;
      this._notifyStatus('stopped', 'Cámara Web detenida');
    }
  }

  // ==========================================
  // Cámara OV7675 (TinyML Shield + Nano 33 BLE)
  // ==========================================

  async startOV7675(targetCanvas, baudRate = 115200) {
    if (typeof WebSerialCamera === 'undefined') {
      throw new Error('El controlador WebSerialCamera no está cargado');
    }

    // Si la cámara web está activa, detenerla primero
    if (this.currentSource === 'webcam') {
      this.stopWebcam();
    }

    // Si el gestor de telemetría por Web Serial está conectado, desconectarlo para liberar el puerto COM
    if (window.iScratchSerial && window.iScratchSerial.connected) {
      console.log('Liberando conexión serial de telemetría para permitir streaming de cámara OV7675...');
      await window.iScratchSerial.disconnect();
    }

    try {
      this._notifyStatus('loading', 'Conectando con cámara OV7675 (TinyML Shield)...');

      if (!this.ov7675) {
        this.ov7675 = new WebSerialCamera(targetCanvas);
      } else {
        this.ov7675.setCanvas(targetCanvas);
      }

      // Configurar callback cuando se recibe y decodifica un nuevo fotograma
      this.ov7675.onFrameCallback = async (offscreenCanvas, w, h, format) => {
        if (!this.isClassifying || this.currentSource !== 'ov7675') return;

        // Si hay modelo cargado, inferir sobre el fotograma nativo del OV7675
        if (this.model) {
          try {
            const t0 = performance.now();
            const prediction = await this.model.predict(offscreenCanvas);
            this.lastLatencyMs = Math.round(performance.now() - t0);
            this.predictions = prediction;

            let highest = { className: '', probability: 0 };
            for (let i = 0; i < prediction.length; i++) {
              if (prediction[i].probability > highest.probability) {
                highest = prediction[i];
              }
            }

            this.topClass = highest.className;
            this.topConfidence = Math.round(highest.probability * 100);

            this.listeners.prediction.forEach((cb) => {
              try { cb(this.predictions, this.topClass, this.topConfidence, this.lastLatencyMs); } catch (e) {}
            });
          } catch (predErr) {
            console.warn('Advertencia en inferencia OV7675:', predErr);
          }
        }
      };

      // Callback de telemetría y FPS
      this.ov7675.onMetricsCallback = (metrics) => {
        this._notifyMetrics(metrics);
      };

      // Callback de estado de conexión
      this.ov7675.onStatusChangeCallback = (statusText, isConnected) => {
        if (isConnected) {
          this._notifyStatus('classifying', `OV7675 Conectada (${statusText})`);
        } else {
          this._notifyStatus('stopped', `OV7675 Desconectada (${statusText})`);
        }
      };

      const connected = await this.ov7675.connect(baudRate);
      if (connected) {
        this.isClassifying = true;
        this.currentSource = 'ov7675';
        this._notifyStatus('classifying', 'Cámara OV7675 conectada y transmitiendo en vivo');
        return true;
      } else {
        this.isClassifying = false;
        this.currentSource = null;
        this._notifyStatus('stopped', 'Conexión con OV7675 cancelada');
        return false;
      }
    } catch (err) {
      console.error('Error al iniciar cámara OV7675:', err);
      this.isClassifying = false;
      this.currentSource = null;
      this._notifyStatus('error', 'Error al conectar OV7675: ' + err.message);
      return false;
    }
  }

  async stopOV7675() {
    if (this.ov7675 && this.ov7675.isConnected) {
      try {
        await this.ov7675.disconnect();
      } catch (e) {}
    }
    if (this.currentSource === 'ov7675') {
      this.isClassifying = false;
      this.currentSource = null;
      this._notifyStatus('stopped', 'Cámara OV7675 detenida');
    }
  }

  // Detiene cualquier cámara activa
  async stopCamera() {
    if (this.currentSource === 'webcam') {
      this.stopWebcam();
    } else if (this.currentSource === 'ov7675') {
      await this.stopOV7675();
    } else {
      this.stopWebcam();
      if (this.ov7675) await this.stopOV7675();
    }
    this.isClassifying = false;
    this.currentSource = null;
    this._notifyStatus('stopped', 'Cámara y clasificación detenidas');
  }

  // Métodos de control para OV7675
  setOV7675Resolution(resKey) {
    if (this.ov7675) {
      this.ov7675.setResolution(resKey);
    }
  }

  setOV7675ColorMode(isGrayscale) {
    if (this.ov7675) {
      this.ov7675.setColorMode(isGrayscale);
    }
  }

  setOV7675FpsMode(mode) {
    if (this.ov7675) {
      this.ov7675.setFpsMode(mode);
    }
  }

  toggleOV7675Stream() {
    if (this.ov7675) {
      this.ov7675.toggleStreaming();
    }
  }

  getOV7675Snapshot() {
    if (this.ov7675) {
      return this.ov7675.getSnapshotDataUrl();
    }
    return null;
  }

  getConfidence(className) {
    if (!className) return 0;
    const item = this.predictions.find(
      (p) => p.className.toLowerCase() === className.toLowerCase().trim()
    );
    return item ? Math.round(item.probability * 100) : 0;
  }
}

// Global singleton instance
window.iScratchTM = new TeachableMachineManager();
