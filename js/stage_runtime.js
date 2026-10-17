/**
 * =============================================================================
 * iScratch - Stage & Sprite Virtual Machine Runtime
 * =============================================================================
 * Implements the Scratch Stage coordinates (-240..240, -180..180),
 * sprite rendering (Scratch Cat vector SVG), motion, speech bubbles,
 * Web Audio sound synthesizer, mouse dragging, and async block execution.
 */

class StageRuntime {
  constructor(canvasId) {
    this.canvas = document.getElementById(canvasId);
    this.ctx = this.canvas ? this.canvas.getContext('2d') : null;

    // Sprite State (Tano)
    this.sprite = {
      name: 'Tano',
      x: 0,
      y: 0,
      direction: 90, // 90 = facing right, 0 = up, 180 = down, -90/270 = left
      size: 100,     // percentage
      visible: true,
      sayText: '',
      sayTimeout: null,
      costumeImg: null
    };

    // Stage dimensions (Scratch 3.0 standard)
    this.stageWidth = 480;
    this.stageHeight = 360;

    // Execution control
    this.executionId = 0;
    this.isRunning = false;
    this.activeThreads = [];
    this.eventListeners = {};
    this.animFrameId = null;

    // Stopwatch & Timers
    this.timerStartTime = Date.now();
    this.activeTimers = [];

    // Interactive Dragging
    this.isDragging = false;
    this.dragOffset = { x: 0, y: 0 };

    // Web Audio Synthesizer
    this.audioCtx = null;

    this._loadSpriteCostume();
    this._startRenderLoop();
    this._setupTelemetryWatcher();
    this._setupCanvasInteraction();
  }

  _loadSpriteCostume() {
    this.sprite.costumeImg = new Image();
    this.sprite.costumeImg.src = 'assets/tano.png';
  }

  _getAudioContext() {
    if (!this.audioCtx) {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      this.audioCtx = new AudioContext();
    }
    if (this.audioCtx.state === 'suspended') {
      this.audioCtx.resume();
    }
    return this.audioCtx;
  }

  unlockAudio() {
    try {
      const ctx = this._getAudioContext();
      if (ctx.state === 'suspended') {
        ctx.resume();
      }
      // Play a short silent buffer to unlock Chrome audio
      const buffer = ctx.createBuffer(1, 1, 22050);
      const source = ctx.createBufferSource();
      source.buffer = buffer;
      source.connect(ctx.destination);
      source.start(0);
    } catch (e) {
      console.warn('Audio unlock warning:', e);
    }
  }

  playTone(freq = 440, duration = 0.2) {
    try {
      const ctx = this._getAudioContext();
      if (ctx.state === 'suspended') {
        ctx.resume();
      }

      const f = Math.max(20, Math.min(20000, Number(freq) || 440));
      const dur = Math.max(0.01, Math.min(10, Number(duration) || 0.2));
      const now = ctx.currentTime;

      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(f, now);

      gain.gain.setValueAtTime(0.2, now);
      // Gentle exponential decay to avoid click sound
      gain.gain.exponentialRampToValueAtTime(0.0001, now + dur);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(now);
      osc.stop(now + dur + 0.05);
    } catch (e) {
      console.warn('Error al reproducir tono:', e);
    }
  }

  registerEventListener(eventName, handler) {
    if (!this.eventListeners[eventName]) {
      this.eventListeners[eventName] = [];
    }
    this.eventListeners[eventName].push(handler);
  }

  async triggerEvent(eventName) {
    if (this.eventListeners[eventName]) {
      for (const fn of this.eventListeners[eventName]) {
        try {
          const res = fn();
          if (res && typeof res.catch === 'function') {
            res.catch((err) => console.error(`Error en manejador de evento ${eventName}:`, err));
          }
        } catch (e) {
          console.error(`Error en evento ${eventName}:`, e);
        }
      }
    }
  }

  _setupTelemetryWatcher() {
    let lastHandledGesture = 'NONE';
    let lastGestureTimestamp = 0;

    // Watch for incoming hardware events from Arduino
    if (window.iScratchSerial) {
      window.iScratchSerial.onTelemetry((data) => {
        // Watch for TinyML Shield button press & release events
        if (data.btn !== undefined && data.btn !== null) {
          if (data.btn === 1 && this._lastButtonState !== 1) {
            this._lastButtonState = 1;
            this.unlockAudio();
            this.triggerEvent('button_press');
          } else if (data.btn === 0 && this._lastButtonState === 1) {
            this._lastButtonState = 0;
            this.unlockAudio();
            this.triggerEvent('button_release');
          }
        }

        if (!this.isRunning) return;

        // Gestures
        const g = data.gesture;
        const now = Date.now();
        if (g && g !== 'NONE') {
          // Trigger once per distinct gesture swipe
          if (g !== lastHandledGesture || (now - lastGestureTimestamp > 600)) {
            lastHandledGesture = g;
            lastGestureTimestamp = now;
            this.triggerEvent(`gesture_${g}`);
          }
        } else {
          // Reset after swipe finishes
          if (now - lastGestureTimestamp > 250) {
            lastHandledGesture = 'NONE';
          }
        }
      });
    }

    // Watch for Teachable Machine predictions
    if (window.iScratchTM) {
      let lastTopClass = '';
      let lastTmTime = 0;
      window.iScratchTM.onPrediction((predictions, topClass, topConfidence) => {
        if (!this.isRunning) return;
        const now = Date.now();
        if (topClass && topConfidence > 65) {
          if (topClass !== lastTopClass || (now - lastTmTime > 1000)) {
            lastTopClass = topClass;
            lastTmTime = now;
            this.triggerEvent(`tm_${topClass.toLowerCase().trim()}`);
          }
        }
      });
    }
  }

  _setupCanvasInteraction() {
    if (!this.canvas) return;

    const getCanvasMouse = (e) => {
      const rect = this.canvas.getBoundingClientRect();
      const scaleX = this.canvas.width / rect.width;
      const scaleY = this.canvas.height / rect.height;
      return {
        x: (e.clientX - rect.left) * scaleX,
        y: (e.clientY - rect.top) * scaleY
      };
    };

    this.canvas.addEventListener('mousedown', (e) => {
      this.unlockAudio();
      const m = getCanvasMouse(e);
      const spriteCanvasX = this.canvas.width / 2 + this.sprite.x;
      const spriteCanvasY = this.canvas.height / 2 - this.sprite.y;
      const dist = Math.hypot(m.x - spriteCanvasX, m.y - spriteCanvasY);

      if (dist < 60) {
        this.isDragging = true;
        this.dragOffset = {
          x: spriteCanvasX - m.x,
          y: spriteCanvasY - m.y
        };
        this.canvas.style.cursor = 'grabbing';
      }
    });

    window.addEventListener('mousemove', (e) => {
      if (!this.isDragging) return;
      const m = getCanvasMouse(e);
      const newCanvasX = m.x + this.dragOffset.x;
      const newCanvasY = m.y + this.dragOffset.y;

      this.sprite.x = Math.max(-230, Math.min(230, Math.round(newCanvasX - this.canvas.width / 2)));
      this.sprite.y = Math.max(-170, Math.min(170, Math.round(this.canvas.height / 2 - newCanvasY)));
      this.updateSpriteInputsUI();
    });

    window.addEventListener('mouseup', () => {
      if (this.isDragging) {
        this.isDragging = false;
        if (this.canvas) this.canvas.style.cursor = 'default';
      }
    });
  }

  // --- Timer & Stopwatch Methods ---
  resetTimer() {
    this.timerStartTime = Date.now();
  }

  getTimer() {
    const elapsed = (Date.now() - (this.timerStartTime || Date.now())) / 1000;
    return Math.round(elapsed * 10) / 10;
  }

  registerTimerInterval(intervalSec, handler) {
    const ms = Math.max(50, Math.round((Number(intervalSec) || 1) * 1000));
    const currentExecId = this.executionId;
    let isExecuting = false;

    const timerId = setInterval(async () => {
      if (!this.isRunning || this.executionId !== currentExecId) {
        clearInterval(timerId);
        return;
      }
      if (isExecuting) return; // Prevent overlapping execution
      isExecuting = true;
      try {
        const res = handler();
        if (res && typeof res.then === 'function') {
          await res;
        }
      } catch (err) {
        if (err && (err.message === 'ExecutionAborted' || err.name === 'ExecutionAborted')) return;
        console.error('Error en temporizador de intervalo:', err);
      } finally {
        isExecuting = false;
      }
    }, ms);

    this.activeTimers.push(timerId);
    return timerId;
  }

  registerTimerTimeout(delaySec, handler) {
    const ms = Math.max(10, Math.round((Number(delaySec) || 1) * 1000));
    const currentExecId = this.executionId;

    const timeoutId = setTimeout(async () => {
      if (!this.isRunning || this.executionId !== currentExecId) return;
      try {
        const res = handler();
        if (res && typeof res.then === 'function') {
          await res;
        }
      } catch (err) {
        if (err && (err.message === 'ExecutionAborted' || err.name === 'ExecutionAborted')) return;
        console.error('Error en temporizador diferido:', err);
      }
    }, ms);

    this.activeTimers.push(timeoutId);
    return timeoutId;
  }

  registerTimerThreshold(thresholdSec, handler) {
    const th = Number(thresholdSec) || 0;
    const currentExecId = this.executionId;
    let triggered = false;

    const intervalId = setInterval(async () => {
      if (!this.isRunning || this.executionId !== currentExecId) {
        clearInterval(intervalId);
        return;
      }
      if (!triggered && this.getTimer() >= th) {
        triggered = true;
        try {
          const res = handler();
          if (res && typeof res.then === 'function') {
            await res;
          }
        } catch (err) {
          if (err && (err.message === 'ExecutionAborted' || err.name === 'ExecutionAborted')) return;
          console.error('Error en evento de cronómetro:', err);
        }
      }
    }, 100);

    this.activeTimers.push(intervalId);
    return intervalId;
  }

  start(compiledJs) {
    if (Array.isArray(compiledJs)) {
      this.startMulti(compiledJs);
    } else {
      this.startMulti([compiledJs]);
    }
  }

  startMulti(scripts) {
    this.stop();
    this.isRunning = true;
    this.executionId++;
    this.resetTimer();
    const currentExecId = this.executionId;
    this.eventListeners = {};
    this.unlockAudio();

    const AsyncFunction = Object.getPrototypeOf(async function(){}).constructor;

    // Launch each top block stack in its own concurrent async task
    for (const code of scripts) {
      if (!code || typeof code !== 'string' || !code.trim()) continue;
      const thread = (async () => {
        try {
          const fn = new AsyncFunction('runtime', code);
          await fn(this);
        } catch (err) {
          if (err && (err.message === 'ExecutionAborted' || err.name === 'ExecutionAborted')) {
            return;
          }
          console.error('Error durante la ejecución del hilo:', err);
        }
      })();
      this.activeThreads.push(thread);
    }

    this.triggerEvent('green_flag');
  }

  stop() {
    this.executionId++;
    this.isRunning = false;
    this.activeThreads = [];
    this.eventListeners = {};
    if (this.activeTimers && this.activeTimers.length > 0) {
      for (const id of this.activeTimers) {
        clearInterval(id);
        clearTimeout(id);
      }
      this.activeTimers = [];
    }
    if (this.sprite.sayTimeout) {
      clearTimeout(this.sprite.sayTimeout);
      this.sprite.sayTimeout = null;
    }
    this.sprite.sayText = '';
  }

  resetSprite() {
    this.sprite.x = 0;
    this.sprite.y = 0;
    this.sprite.direction = 90;
    this.sprite.size = 100;
    this.sprite.visible = true;
    this.sprite.sayText = '';
    this.updateSpriteInputsUI();
  }

  // --- Sprite Block Actions ---

  async wait(seconds) {
    const currentExecId = this.executionId;
    const ms = Math.max(0, (Number(seconds) || 0) * 1000);
    return new Promise((resolve, reject) => {
      setTimeout(() => {
        if (!this.isRunning || this.executionId !== currentExecId) {
          const err = new Error('ExecutionAborted');
          err.name = 'ExecutionAborted';
          reject(err);
        } else {
          resolve();
        }
      }, ms);
    });
  }

  clampStage() {
    const maxX = 220;
    const maxY = 160;
    this.sprite.x = Math.max(-maxX, Math.min(maxX, this.sprite.x));
    this.sprite.y = Math.max(-maxY, Math.min(maxY, this.sprite.y));
  }

  move(steps) {
    if (!this.isRunning) return;
    const s = Number(steps) || 0;
    // Scratch standard: 90° = right (cos 0), 0° = up (sin 0 in standard, but in Scratch 0 is North)
    const rad = (this.sprite.direction * Math.PI) / 180;
    this.sprite.x += Math.sin(rad) * s;
    this.sprite.y += Math.cos(rad) * s;
    this.clampStage();
    this.updateSpriteInputsUI();
  }

  turnRight(degrees) {
    if (!this.isRunning) return;
    const d = Number(degrees) || 0;
    this.sprite.direction = (this.sprite.direction + d) % 360;
    this.updateSpriteInputsUI();
  }

  turnLeft(degrees) {
    if (!this.isRunning) return;
    const d = Number(degrees) || 0;
    this.sprite.direction = (this.sprite.direction - d + 360) % 360;
    this.updateSpriteInputsUI();
  }

  goto(x, y) {
    if (!this.isRunning) return;
    this.sprite.x = Number(x) || 0;
    this.sprite.y = Number(y) || 0;
    this.clampStage();
    this.updateSpriteInputsUI();
  }

  pointInDirection(degrees) {
    if (!this.isRunning) return;
    this.sprite.direction = Number(degrees) || 90;
    this.updateSpriteInputsUI();
  }

  changeSize(delta) {
    if (!this.isRunning) return;
    const d = Number(delta) || 0;
    this.sprite.size = Math.max(5, Math.min(500, Math.round(this.sprite.size + d)));
    this.updateSpriteInputsUI();
  }

  setSize(size) {
    if (!this.isRunning) return;
    const s = Number(size) || 100;
    this.sprite.size = Math.max(5, Math.min(500, Math.round(s)));
    this.updateSpriteInputsUI();
  }

  getSize() {
    return this.sprite.size;
  }

  bounceOnEdge() {
    const halfW = 220;
    const halfH = 160;

    let bounced = false;
    if (this.sprite.x > halfW) {
      this.sprite.x = halfW;
      this.sprite.direction = -this.sprite.direction;
      bounced = true;
    } else if (this.sprite.x < -halfW) {
      this.sprite.x = -halfW;
      this.sprite.direction = -this.sprite.direction;
      bounced = true;
    }

    if (this.sprite.y > halfH) {
      this.sprite.y = halfH;
      this.sprite.direction = 180 - this.sprite.direction;
      bounced = true;
    } else if (this.sprite.y < -halfH) {
      this.sprite.y = -halfH;
      this.sprite.direction = 180 - this.sprite.direction;
      bounced = true;
    }

    if (bounced) {
      this.playTone(300, 0.05);
    }
    this.updateSpriteInputsUI();
  }

  say(text, seconds = 0) {
    if (!this.isRunning) return Promise.resolve();
    this.sprite.sayText = String(text);
    if (this.sprite.sayTimeout) {
      clearTimeout(this.sprite.sayTimeout);
      this.sprite.sayTimeout = null;
    }

    if (seconds > 0) {
      const currentExecId = this.executionId;
      return new Promise((resolve, reject) => {
        this.sprite.sayTimeout = setTimeout(() => {
          this.sprite.sayText = '';
          if (!this.isRunning || this.executionId !== currentExecId) {
            const err = new Error('ExecutionAborted');
            err.name = 'ExecutionAborted';
            reject(err);
          } else {
            resolve();
          }
        }, seconds * 1000);
      });
    }
    return Promise.resolve();
  }

  updateSpriteInputsUI() {
    const xInput = document.getElementById('sprite-x');
    const yInput = document.getElementById('sprite-y');
    const dirInput = document.getElementById('sprite-dir');
    const sizeInput = document.getElementById('sprite-size');

    if (xInput) xInput.value = Math.round(this.sprite.x);
    if (yInput) yInput.value = Math.round(this.sprite.y);
    if (dirInput) dirInput.value = Math.round(this.sprite.direction);
    if (sizeInput) sizeInput.value = Math.round(this.sprite.size);
  }

  _startRenderLoop() {
    const render = () => {
      this._renderStage();
      this.animFrameId = requestAnimationFrame(render);
    };
    this.animFrameId = requestAnimationFrame(render);
  }

  _renderStage() {
    if (!this.ctx || !this.canvas) return;
    const ctx = this.ctx;
    const w = this.canvas.width;
    const h = this.canvas.height;

    // Clear background (Scratch stage white with faint coordinate grid)
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(0, 0, w, h);

    // Subtle coordinate lines
    ctx.strokeStyle = '#F0F0F0';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(w / 2, 0);
    ctx.lineTo(w / 2, h);
    ctx.moveTo(0, h / 2);
    ctx.lineTo(w, h / 2);
    ctx.stroke();

    if (!this.sprite.visible) return;

    // Convert Scratch coordinates to Canvas coordinates
    // Scratch (0,0) is center: X [-240, 240], Y [-180, 180] (Y up is positive)
    const canvasX = w / 2 + this.sprite.x;
    const canvasY = h / 2 - this.sprite.y;

    ctx.save();
    ctx.translate(canvasX, canvasY);

    // Direction rotation: Scratch 90° = normal, 0° = pointing up
    const rad = ((this.sprite.direction - 90) * Math.PI) / 180;
    ctx.rotate(rad);

    const scale = (this.sprite.size / 100) * 0.8;
    ctx.scale(scale, scale);

    let spriteHeight = 110;
    let spriteWidth = 75;

    if (this.sprite.costumeImg && this.sprite.costumeImg.complete && this.sprite.costumeImg.naturalWidth > 0) {
      const aspect = this.sprite.costumeImg.naturalWidth / this.sprite.costumeImg.naturalHeight;
      spriteHeight = 110;
      spriteWidth = spriteHeight * aspect;
      ctx.drawImage(this.sprite.costumeImg, -spriteWidth / 2, -spriteHeight / 2, spriteWidth, spriteHeight);
    } else {
      // Fallback shape while image loads
      ctx.fillStyle = '#C89666';
      ctx.beginPath();
      ctx.arc(0, 0, 35, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.restore();

    // Render Speech Bubble if any
    if (this.sprite.sayText) {
      this._renderSpeechBubble(ctx, canvasX, canvasY - (spriteHeight * scale) / 2);
    }
  }

  _renderSpeechBubble(ctx, x, y) {
    const text = this.sprite.sayText;
    ctx.font = '13px "Segoe UI", sans-serif';
    const textMetrics = ctx.measureText(text);
    const padding = 12;
    const bubbleW = Math.max(textMetrics.width + padding * 2, 60);
    const bubbleH = 30;

    let bx = x - bubbleW / 2;
    let by = y - bubbleH - 14;

    // Clamp inside canvas
    if (bx < 10) bx = 10;
    if (bx + bubbleW > this.canvas.width - 10) bx = this.canvas.width - 10 - bubbleW;
    if (by < 10) by = 10;

    // Bubble body
    ctx.fillStyle = '#FFFFFF';
    ctx.strokeStyle = '#4C97FF';
    ctx.lineWidth = 2;
    ctx.beginPath();
    if (ctx.roundRect) {
      ctx.roundRect(bx, by, bubbleW, bubbleH, 8);
    } else {
      ctx.rect(bx, by, bubbleW, bubbleH);
    }
    ctx.fill();
    ctx.stroke();

    // Bubble pointer tail
    ctx.beginPath();
    ctx.moveTo(x - 5, by + bubbleH);
    ctx.lineTo(x, by + bubbleH + 8);
    ctx.lineTo(x + 5, by + bubbleH);
    ctx.fillStyle = '#FFFFFF';
    ctx.fill();
    ctx.strokeStyle = '#4C97FF';
    ctx.stroke();

    // Text inside
    ctx.fillStyle = '#2C3E50';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(text, bx + bubbleW / 2, by + bubbleH / 2);
  }
}

// Global runtime instance
window.iScratchRuntime = null;
