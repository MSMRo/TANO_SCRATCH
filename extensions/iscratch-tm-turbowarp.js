// Name: Teachable Machine (iScratch)
// ID: iscratchteachablemachine
// Description: Load and run Google Teachable Machine models (Image/Vision) in Scratch / TurboWarp.
// Author: iScratch Project

(function (Scratch) {
  'use strict';

  if (!Scratch.extensions.unsandboxed) {
    throw new Error('Teachable Machine extension must run unsandboxed to access camera and TensorFlow');
  }

  class TeachableMachineExtension {
    constructor() {
      this.model = null;
      this.webcam = null;
      this.modelLoaded = false;
      this.isClassifying = false;
      this.predictions = [];
      this.topClass = '';
      this.topConfidence = 0;
      this.labels = [];

      this._ensureLibraries();
    }

    _loadScript(url) {
      return new Promise((resolve, reject) => {
        if (document.querySelector(`script[src="${url}"]`)) {
          resolve();
          return;
        }
        const s = document.createElement('script');
        s.src = url;
        s.onload = () => resolve();
        s.onerror = (e) => reject(e);
        document.head.appendChild(s);
      });
    }

    async _ensureLibraries() {
      if (!window.tf) {
        await this._loadScript('https://cdn.jsdelivr.net/npm/@tensorflow/tfjs@latest/dist/tf.min.js');
      }
      if (!window.tmImage) {
        await this._loadScript('https://cdn.jsdelivr.net/npm/@teachablemachine/image@latest/dist/teachablemachine-image.min.js');
      }
    }

    getInfo() {
      return {
        id: 'iscratchteachablemachine',
        name: 'Teachable Machine',
        color1: '#4285F4', // Google Blue
        color2: '#3367D6',
        color3: '#2A56C6',
        menuIconURI: 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="%23FFFFFF"><circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/></svg>',
        blocks: [
          {
            opcode: 'loadModel',
            blockType: Scratch.BlockType.COMMAND,
            text: 'cargar modelo Teachable Machine desde URL [URL]',
            arguments: {
              URL: {
                type: Scratch.ArgumentType.STRING,
                defaultValue: 'https://teachablemachine.withgoogle.com/models/v1/'
              }
            }
          },
          {
            opcode: 'startWebcam',
            blockType: Scratch.BlockType.COMMAND,
            text: 'iniciar cámara web y clasificador continuo'
          },
          {
            opcode: 'stopWebcam',
            blockType: Scratch.BlockType.COMMAND,
            text: 'detener clasificador y cámara'
          },
          '---',
          {
            opcode: 'isModelLoaded',
            blockType: Scratch.BlockType.BOOLEAN,
            text: '¿modelo cargado?'
          },
          {
            opcode: 'getTopClass',
            blockType: Scratch.BlockType.REPORTER,
            text: 'clase predicha más probable'
          },
          {
            opcode: 'getTopConfidence',
            blockType: Scratch.BlockType.REPORTER,
            text: 'confianza de la predicción (%)'
          },
          {
            opcode: 'getClassConfidence',
            blockType: Scratch.BlockType.REPORTER,
            text: 'confianza para la clase [CLASS_NAME] (%)',
            arguments: {
              CLASS_NAME: {
                type: Scratch.ArgumentType.STRING,
                defaultValue: 'Clase 1'
              }
            }
          },
          {
            opcode: 'isClassDetected',
            blockType: Scratch.BlockType.BOOLEAN,
            text: '¿clase predicha es [CLASS_NAME]?',
            arguments: {
              CLASS_NAME: {
                type: Scratch.ArgumentType.STRING,
                defaultValue: 'Clase 1'
              }
            }
          },
          '---',
          {
            opcode: 'whenClassDetected',
            blockType: Scratch.BlockType.HAT,
            text: 'cuando la clase sea [CLASS_NAME]',
            arguments: {
              CLASS_NAME: {
                type: Scratch.ArgumentType.STRING,
                defaultValue: 'Clase 1'
              }
            }
          }
        ]
      };
    }

    async loadModel(args) {
      await this._ensureLibraries();
      let modelURL = String(args.URL || '').trim();
      if (!modelURL.endsWith('/')) {
        modelURL += '/';
      }
      const modelJson = modelURL + 'model.json';
      const metadataJson = modelURL + 'metadata.json';

      try {
        this.model = await window.tmImage.load(modelJson, metadataJson);
        this.labels = this.model.getClassLabels();
        this.modelLoaded = true;
        console.log('Modelo cargado con éxito. Clases:', this.labels);
      } catch (err) {
        console.error('Error al cargar modelo Teachable Machine:', err);
        this.modelLoaded = false;
      }
    }

    async startWebcam() {
      if (!this.model) {
        console.warn('Primero debes cargar un modelo Teachable Machine');
        return;
      }
      if (this.isClassifying) return;

      const flip = true;
      this.webcam = new window.tmImage.Webcam(200, 200, flip);
      await this.webcam.setup();
      await this.webcam.play();
      this.isClassifying = true;

      const loop = async () => {
        if (!this.isClassifying) return;
        this.webcam.update();
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
        }
        window.requestAnimationFrame(loop);
      };

      window.requestAnimationFrame(loop);
    }

    stopWebcam() {
      this.isClassifying = false;
      if (this.webcam) {
        try {
          this.webcam.stop();
        } catch (e) {}
        this.webcam = null;
      }
    }

    isModelLoaded() {
      return this.modelLoaded;
    }

    getTopClass() {
      return this.topClass || '';
    }

    getTopConfidence() {
      return this.topConfidence || 0;
    }

    getClassConfidence(args) {
      const target = String(args.CLASS_NAME || '').toLowerCase();
      const item = this.predictions.find(p => p.className.toLowerCase() === target);
      return item ? Math.round(item.probability * 100) : 0;
    }

    isClassDetected(args) {
      const target = String(args.CLASS_NAME || '').toLowerCase();
      return (this.topClass || '').toLowerCase() === target && this.topConfidence > 65;
    }

    whenClassDetected(args) {
      const target = String(args.CLASS_NAME || '').toLowerCase();
      return (this.topClass || '').toLowerCase() === target && this.topConfidence > 65;
    }
  }

  Scratch.extensions.register(new TeachableMachineExtension());
})(Scratch);
