/**
 * =============================================================================
 * iScratch - Teachable Machine Manager
 * =============================================================================
 * Interfaces with Google Teachable Machine image classification models
 * using TensorFlow.js in the browser.
 */

class TeachableMachineManager {
  constructor() {
    this.model = null;
    this.webcam = null;
    this.modelUrl = '';
    this.isLoaded = false;
    this.isClassifying = false;
    this.classes = [];
    this.predictions = [];
    this.topClass = '';
    this.topConfidence = 0;

    this.listeners = {
      prediction: [],
      status: []
    };
  }

  onPrediction(callback) {
    this.listeners.prediction.push(callback);
  }

  onStatusChange(callback) {
    this.listeners.status.push(callback);
  }

  _notifyStatus(status, details = '') {
    this.listeners.status.forEach((cb) => {
      try { cb(status, details); } catch (e) { console.error(e); }
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

  async startWebcam(targetCanvas) {
    if (!this.model) {
      throw new Error('Primero debes cargar un modelo de Teachable Machine');
    }
    if (this.isClassifying) return;

    try {
      const flip = true;
      this.webcam = new window.tmImage.Webcam(240, 240, flip);
      await this.webcam.setup();
      await this.webcam.play();
      this.isClassifying = true;
      this._notifyStatus('classifying', 'Clasificador activo');

      const loop = async () => {
        if (!this.isClassifying) return;
        this.webcam.update();

        // Render webcam video to UI canvas if provided
        if (targetCanvas) {
          const ctx = targetCanvas.getContext('2d');
          ctx.drawImage(this.webcam.canvas, 0, 0, targetCanvas.width, targetCanvas.height);
        }

        if (this.model) {
          const prediction = await this.model.predict(this.webcam.canvas);
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
            try { cb(this.predictions, this.topClass, this.topConfidence); } catch (e) {}
          });
        }

        window.requestAnimationFrame(loop);
      };

      window.requestAnimationFrame(loop);
    } catch (err) {
      console.error('Error al iniciar cámara web:', err);
      this.isClassifying = false;
      this._notifyStatus('error', 'Error de cámara: ' + err.message);
    }
  }

  stopWebcam() {
    this.isClassifying = false;
    if (this.webcam) {
      try {
        this.webcam.stop();
      } catch (e) {}
      this.webcam = null;
    }
    this._notifyStatus('stopped', 'Cámara y clasificación detenidas');
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
