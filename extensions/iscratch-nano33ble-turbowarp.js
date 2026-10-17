// Name: Arduino Nano 33 BLE Sense
// ID: iscratchnano33ble
// Description: Connect to Arduino Nano 33 BLE Sense via Web Serial API and read all onboard sensors (IMU, Barometer, Temp/Humidity, APDS9960 Color/Gesture/Proximity, Microphone).
// Author: iScratch Project

(function (Scratch) {
  'use strict';

  if (!Scratch.extensions.unsandboxed) {
    throw new Error('Arduino Nano 33 BLE Sense extension must run unsandboxed to access Web Serial');
  }

  class Nano33BLESenseExtension {
    constructor() {
      this.port = null;
      this.reader = null;
      this.writer = null;
      this.connected = false;
      this.keepReading = false;

      // Telemetry store
      this.data = {
        t: 0.0,
        h: 0.0,
        p: 1013.2,
        ax: 0.0,
        ay: 0.0,
        az: 1.0,
        gx: 0.0,
        gy: 0.0,
        gz: 0.0,
        mx: 0.0,
        my: 0.0,
        mz: 0.0,
        r: 0,
        g: 0,
        b: 0,
        light: 0,
        prox: 255,
        gesture: 'NONE',
        sound: 0
      };

      this.lastGesture = 'NONE';
      this.gestureTimestamp = 0;
    }

    getInfo() {
      return {
        id: 'iscratchnano33ble',
        name: 'Arduino Nano 33 BLE Sense',
        color1: '#00878F', // Official Arduino Teal
        color2: '#006468',
        color3: '#00474A',
        menuIconURI: 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="%23FFFFFF"><circle cx="7" cy="12" r="3"/><circle cx="17" cy="12" r="3"/><path d="M7 11h10v2H7z"/></svg>',
        blocks: [
          {
            opcode: 'connectBoard',
            blockType: Scratch.BlockType.COMMAND,
            text: 'conectar Arduino Nano 33 BLE Sense a [BAUD] baudios',
            arguments: {
              BAUD: {
                type: Scratch.ArgumentType.NUMBER,
                defaultValue: 115200
              }
            }
          },
          {
            opcode: 'disconnectBoard',
            blockType: Scratch.BlockType.COMMAND,
            text: 'desconectar Arduino'
          },
          {
            opcode: 'isConnected',
            blockType: Scratch.BlockType.BOOLEAN,
            text: '¿Arduino conectado?'
          },
          '---',
          {
            opcode: 'getTemperature',
            blockType: Scratch.BlockType.REPORTER,
            text: 'temperatura actual (°C)'
          },
          {
            opcode: 'getHumidity',
            blockType: Scratch.BlockType.REPORTER,
            text: 'humedad actual (%)'
          },
          {
            opcode: 'getPressure',
            blockType: Scratch.BlockType.REPORTER,
            text: 'presión barométrica (hPa)'
          },
          '---',
          {
            opcode: 'getAccel',
            blockType: Scratch.BlockType.REPORTER,
            text: 'aceleración eje [AXIS] (g)',
            arguments: {
              AXIS: {
                type: Scratch.ArgumentType.STRING,
                menu: 'axisMenu',
                defaultValue: 'x'
              }
            }
          },
          {
            opcode: 'getGyro',
            blockType: Scratch.BlockType.REPORTER,
            text: 'giroscopio eje [AXIS] (°/s)',
            arguments: {
              AXIS: {
                type: Scratch.ArgumentType.STRING,
                menu: 'axisMenu',
                defaultValue: 'x'
              }
            }
          },
          {
            opcode: 'getMag',
            blockType: Scratch.BlockType.REPORTER,
            text: 'campo magnético eje [AXIS] (µT)',
            arguments: {
              AXIS: {
                type: Scratch.ArgumentType.STRING,
                menu: 'axisMenu',
                defaultValue: 'x'
              }
            }
          },
          '---',
          {
            opcode: 'getColor',
            blockType: Scratch.BlockType.REPORTER,
            text: 'sensor de color [CHANNEL]',
            arguments: {
              CHANNEL: {
                type: Scratch.ArgumentType.STRING,
                menu: 'colorChannelMenu',
                defaultValue: 'r'
              }
            }
          },
          {
            opcode: 'getProximity',
            blockType: Scratch.BlockType.REPORTER,
            text: 'proximidad (0 muy cerca - 255 lejos)'
          },
          {
            opcode: 'getGesture',
            blockType: Scratch.BlockType.REPORTER,
            text: 'último gesto detectado'
          },
          {
            opcode: 'getSoundLevel',
            blockType: Scratch.BlockType.REPORTER,
            text: 'nivel de sonido / micrófono (0-100)'
          },
          '---',
          {
            opcode: 'setBuiltinLed',
            blockType: Scratch.BlockType.COMMAND,
            text: 'establecer LED incorporado (D13) a [STATE]',
            arguments: {
              STATE: {
                type: Scratch.ArgumentType.STRING,
                menu: 'ledStateMenu',
                defaultValue: 'encendido'
              }
            }
          },
          {
            opcode: 'setRgbLed',
            blockType: Scratch.BlockType.COMMAND,
            text: 'establecer LED RGB a R: [R] G: [G] B: [B]',
            arguments: {
              R: { type: Scratch.ArgumentType.NUMBER, defaultValue: 255 },
              G: { type: Scratch.ArgumentType.NUMBER, defaultValue: 0 },
              B: { type: Scratch.ArgumentType.NUMBER, defaultValue: 0 }
            }
          },
          {
            opcode: 'sendCustomSerial',
            blockType: Scratch.BlockType.COMMAND,
            text: 'enviar por serial texto [TEXT]',
            arguments: {
              TEXT: {
                type: Scratch.ArgumentType.STRING,
                defaultValue: '{"ping":1}'
              }
            }
          },
          '---',
          {
            opcode: 'whenGestureDetected',
            blockType: Scratch.BlockType.HAT,
            text: 'al detectar gesto [GESTURE]',
            arguments: {
              GESTURE: {
                type: Scratch.ArgumentType.STRING,
                menu: 'gestureMenu',
                defaultValue: 'UP'
              }
            }
          },
          {
            opcode: 'whenSoundLevelExceeds',
            blockType: Scratch.BlockType.HAT,
            text: 'cuando el sonido sea > [THRESHOLD]',
            arguments: {
              THRESHOLD: {
                type: Scratch.ArgumentType.NUMBER,
                defaultValue: 60
              }
            }
          }
        ],
        menus: {
          axisMenu: {
            acceptReporters: false,
            items: [
              { text: 'X', value: 'x' },
              { text: 'Y', value: 'y' },
              { text: 'Z', value: 'z' }
            ]
          },
          colorChannelMenu: {
            acceptReporters: false,
            items: [
              { text: 'Rojo (R)', value: 'r' },
              { text: 'Verde (G)', value: 'g' },
              { text: 'Azul (B)', value: 'b' },
              { text: 'Luz ambiental', value: 'light' }
            ]
          },
          ledStateMenu: {
            acceptReporters: false,
            items: [
              { text: 'encendido', value: 'encendido' },
              { text: 'apagado', value: 'apagado' }
            ]
          },
          gestureMenu: {
            acceptReporters: false,
            items: [
              { text: 'ARRIBA', value: 'UP' },
              { text: 'ABAJO', value: 'DOWN' },
              { text: 'IZQUIERDA', value: 'LEFT' },
              { text: 'DERECHA', value: 'RIGHT' }
            ]
          }
        }
      };
    }

    async connectBoard(args) {
      if (!('serial' in navigator)) {
        alert('Web Serial API no es soportada en este navegador. Utiliza Google Chrome, Microsoft Edge u Opera.');
        return;
      }

      const baudRate = Number(args.BAUD) || 115200;

      try {
        this.port = await navigator.serial.requestPort();
        await this.port.open({ baudRate: baudRate });
        this.connected = true;
        this.keepReading = true;

        this._startReadLoop();
      } catch (err) {
        console.error('Error al conectar con Arduino Nano 33 BLE Sense:', err);
        this.connected = false;
      }
    }

    async disconnectBoard() {
      this.keepReading = false;
      if (this.reader) {
        try {
          await this.reader.cancel();
          this.reader.releaseLock();
        } catch (e) {}
      }
      if (this.port) {
        try {
          await this.port.close();
        } catch (e) {}
      }
      this.connected = false;
      this.port = null;
    }

    async _startReadLoop() {
      const textDecoder = new TextDecoderStream();
      const readableStreamClosed = this.port.readable.pipeTo(textDecoder.writable);
      this.reader = textDecoder.readable.getReader();

      let lineBuffer = '';

      try {
        while (this.keepReading) {
          const { value, done } = await this.reader.read();
          if (done) break;
          if (value) {
            lineBuffer += value;
            let lines = lineBuffer.split('\n');
            lineBuffer = lines.pop(); // keep remainder

            for (const line of lines) {
              const clean = line.trim();
              if (clean.startsWith('{') && clean.endsWith('}')) {
                try {
                  const parsed = JSON.parse(clean);
                  Object.assign(this.data, parsed);

                  if (parsed.gesture && parsed.gesture !== 'NONE') {
                    this.lastGesture = parsed.gesture;
                    this.gestureTimestamp = Date.now();
                  }
                } catch (jsonErr) {}
              }
            }
          }
        }
      } catch (err) {
        console.warn('Lectura serial interrumpida:', err);
      } finally {
        this.connected = false;
      }
    }

    async _writeSerial(text) {
      if (!this.port || !this.port.writable) return;
      try {
        const encoder = new TextEncoder();
        const writer = this.port.writable.getWriter();
        await writer.write(encoder.encode(text + '\n'));
        writer.releaseLock();
      } catch (err) {
        console.error('Error enviando datos seriales:', err);
      }
    }

    isConnected() {
      return this.connected;
    }

    getTemperature() {
      return this.data.t || 0.0;
    }

    getHumidity() {
      return this.data.h || 0.0;
    }

    getPressure() {
      return this.data.p || 0.0;
    }

    getAccel(args) {
      const axis = (args.AXIS || 'x').toLowerCase();
      return this.data['a' + axis] || 0.0;
    }

    getGyro(args) {
      const axis = (args.AXIS || 'x').toLowerCase();
      return this.data['g' + axis] || 0.0;
    }

    getMag(args) {
      const axis = (args.AXIS || 'x').toLowerCase();
      return this.data['m' + axis] || 0.0;
    }

    getColor(args) {
      const ch = (args.CHANNEL || 'r').toLowerCase();
      return this.data[ch] || 0;
    }

    getProximity() {
      return this.data.prox !== undefined ? this.data.prox : 255;
    }

    getGesture() {
      // Return last detected gesture if within last 1.5 seconds, otherwise NONE
      if (Date.now() - this.gestureTimestamp < 1500) {
        return this.lastGesture;
      }
      return 'NONE';
    }

    getSoundLevel() {
      return this.data.sound || 0;
    }

    setBuiltinLed(args) {
      const val = args.STATE === 'encendido' ? 1 : 0;
      this._writeSerial(JSON.stringify({ led: val }));
    }

    setRgbLed(args) {
      const r = Math.max(0, Math.min(255, Math.round(Number(args.R) || 0)));
      const g = Math.max(0, Math.min(255, Math.round(Number(args.G) || 0)));
      const b = Math.max(0, Math.min(255, Math.round(Number(args.B) || 0)));
      this._writeSerial(JSON.stringify({ rgb: [r, g, b] }));
    }

    sendCustomSerial(args) {
      this._writeSerial(String(args.TEXT || ''));
    }

    whenGestureDetected(args) {
      const target = (args.GESTURE || 'UP').toUpperCase();
      return this.lastGesture === target && (Date.now() - this.gestureTimestamp < 300);
    }

    whenSoundLevelExceeds(args) {
      const thresh = Number(args.THRESHOLD) || 50;
      return (this.data.sound || 0) > thresh;
    }
  }

  Scratch.extensions.register(new Nano33BLESenseExtension());
})(Scratch);
