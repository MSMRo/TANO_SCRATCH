/**
 * =============================================================================
 * iScratch - Main Application Orchestration
 * =============================================================================
 */

document.addEventListener('DOMContentLoaded', () => {
  // Compatibility bridge for Blockly JavaScript generator (v10+)
  if (window.Blockly && window.Blockly.JavaScript) {
    const jsGen = window.Blockly.JavaScript;
    if (!jsGen.forBlock) jsGen.forBlock = Object.create(null);
    const Order = (window.javascript && window.javascript.Order) || {};
    for (const key in Order) {
      jsGen['ORDER_' + key] = Order[key];
    }
    if (jsGen.ORDER_ATOMIC === undefined) jsGen.ORDER_ATOMIC = 0;
    if (jsGen.ORDER_NONE === undefined) jsGen.ORDER_NONE = 99;
  }

  // 1. Initialize Stage Runtime
  window.iScratchRuntime = new StageRuntime('stageCanvas');

  // 2. Define Toolbox XML for Blockly
  const toolboxXml = `
    <xml xmlns="https://developers.google.com/blockly/xml" id="toolbox" style="display: none">
      <!-- 🔵 MOVIMIENTO -->
      <category name="Movimiento" colour="#4C97FF">
        <block type="scratch_move">
          <value name="STEPS"><shadow type="math_number"><field name="NUM">10</field></shadow></value>
        </block>
        <block type="scratch_turn_right">
          <value name="DEGREES"><shadow type="math_number"><field name="NUM">15</field></shadow></value>
        </block>
        <block type="scratch_turn_left">
          <value name="DEGREES"><shadow type="math_number"><field name="NUM">15</field></shadow></value>
        </block>
        <block type="scratch_goto">
          <value name="X"><shadow type="math_number"><field name="NUM">0</field></shadow></value>
          <value name="Y"><shadow type="math_number"><field name="NUM">0</field></shadow></value>
        </block>
        <block type="scratch_point_dir">
          <value name="DIRECTION"><shadow type="math_number"><field name="NUM">90</field></shadow></value>
        </block>
      </category>

      <!-- 🟣 APARIENCIA -->
      <category name="Apariencia" colour="#9966FF">
        <block type="scratch_say_for_secs">
          <value name="TEXT"><shadow type="text"><field name="TEXT">¡Hola!</field></shadow></value>
          <value name="SECS"><shadow type="math_number"><field name="NUM">2</field></shadow></value>
        </block>
        <block type="scratch_say">
          <value name="TEXT"><shadow type="text"><field name="TEXT">¡Hola Mundo!</field></shadow></value>
        </block>
        <block type="scratch_change_size">
          <value name="CHANGE"><shadow type="math_number"><field name="NUM">10</field></shadow></value>
        </block>
        <block type="scratch_set_size">
          <value name="SIZE"><shadow type="math_number"><field name="NUM">100</field></shadow></value>
        </block>
        <block type="scratch_get_size"></block>
      </category>

      <!-- 🔊 SONIDO -->
      <category name="Sonido" colour="#CF63CF">
        <block type="scratch_play_sound">
          <value name="FREQ"><shadow type="math_number"><field name="NUM">440</field></shadow></value>
          <value name="DURATION"><shadow type="math_number"><field name="NUM">0.2</field></shadow></value>
        </block>
      </category>

      <!-- 🟡 EVENTOS -->
      <category name="Eventos" colour="#FFBF00">
        <block type="scratch_when_flag"></block>
        <block type="nano33_when_button"></block>
        <block type="nano33_when_gesture"></block>
        <block type="tm_when_class">
          <value name="CLASS_NAME"><shadow type="text"><field name="TEXT">Clase 1</field></shadow></value>
        </block>
      </category>

      <!-- ⏱️ TEMPORIZADORES -->
      <category name="Temporizadores" colour="#00B4D8">
        <block type="timer_every">
          <value name="INTERVAL"><shadow type="math_number"><field name="NUM">1</field></shadow></value>
        </block>
        <block type="timer_after">
          <value name="SECS"><shadow type="math_number"><field name="NUM">2</field></shadow></value>
        </block>
        <block type="timer_when_greater">
          <value name="THRESHOLD"><shadow type="math_number"><field name="NUM">5</field></shadow></value>
        </block>
        <block type="timer_reset"></block>
        <block type="timer_get"></block>
        <block type="timer_wait">
          <value name="SECS"><shadow type="math_number"><field name="NUM">1</field></shadow></value>
        </block>
      </category>

      <!-- 🟠 CONTROL -->
      <category name="Control" colour="#FFAB19">
        <block type="scratch_wait">
          <value name="SECS"><shadow type="math_number"><field name="NUM">1</field></shadow></value>
        </block>
        <block type="scratch_repeat">
          <value name="TIMES"><shadow type="math_number"><field name="NUM">10</field></shadow></value>
        </block>
        <block type="scratch_forever"></block>
        <block type="controls_if"></block>
        <block type="controls_ifelse"></block>
      </category>

      <!-- 🔷 SENSORES Y CONDICIONES -->
      <category name="Sensores" colour="#5CB1D6">
        <block type="nano33_get_button"></block>
        <block type="timer_get"></block>
        <block type="timer_reset"></block>
        <block type="logic_boolean"></block>
        <block type="logic_compare"></block>
        <block type="logic_operation"></block>
        <block type="logic_negate"></block>
      </category>

      <!-- 🟢 OPERADORES MATEMÁTICOS -->
      <category name="Operadores" colour="#59C059">
        <block type="math_number"><field name="NUM">0</field></block>
        <block type="math_arithmetic"></block>
        <block type="math_random_int">
          <value name="FROM"><shadow type="math_number"><field name="NUM">1</field></shadow></value>
          <value name="TO"><shadow type="math_number"><field name="NUM">10</field></shadow></value>
        </block>
        <block type="text"><field name="TEXT"></field></block>
        <block type="text_join"></block>
      </category>

      <!-- 🟧 VARIABLES -->
      <category name="Variables" colour="#FF8C1A" custom="VARIABLE"></category>

      <!-- 🔴 ARDUINO NANO 33 BLE SENSE -->
      <category name="Arduino Nano 33 BLE" colour="#00878F">
        <block type="nano33_connect">
          <field name="BAUD">115200</field>
        </block>
        <block type="nano33_disconnect"></block>
        <block type="nano33_is_connected"></block>
        <block type="nano33_get_button"></block>
        <block type="nano33_get_button_state"></block>
        <block type="nano33_when_button"></block>
        <block type="nano33_get_temp"></block>
        <block type="nano33_get_hum"></block>
        <block type="nano33_get_press"></block>
        <block type="nano33_get_accel"></block>
        <block type="nano33_get_gyro"></block>
        <block type="nano33_get_mag"></block>
        <block type="nano33_get_color"></block>
        <block type="nano33_get_prox"></block>
        <block type="nano33_get_gesture"></block>
        <block type="nano33_get_sound"></block>
        <block type="nano33_set_rgb_power"></block>
        <block type="nano33_set_rgb_color_palette"></block>
        <block type="nano33_set_rgb">
          <value name="R"><shadow type="math_number"><field name="NUM">255</field></shadow></value>
          <value name="G"><shadow type="math_number"><field name="NUM">0</field></shadow></value>
          <value name="B"><shadow type="math_number"><field name="NUM">0</field></shadow></value>
        </block>
        <block type="nano33_send_serial">
          <value name="TEXT"><shadow type="text"><field name="TEXT">{"ping":1}</field></shadow></value>
        </block>
        <block type="nano33_when_gesture"></block>
      </category>

      <!-- 🧠 TEACHABLE MACHINE -->
      <category name="Teachable Machine" colour="#4285F4">
        <block type="tm_load_model">
          <value name="URL"><shadow type="text"><field name="TEXT">https://teachablemachine.withgoogle.com/models/v1/</field></shadow></value>
        </block>
        <block type="tm_start_webcam"></block>
        <block type="tm_start_ov7675"></block>
        <block type="tm_set_ov7675_res"></block>
        <block type="tm_stop_camera"></block>
        <block type="tm_is_model_loaded"></block>
        <block type="tm_get_top_class"></block>
        <block type="tm_get_top_confidence"></block>
        <block type="tm_get_class_confidence">
          <value name="CLASS_NAME"><shadow type="text"><field name="TEXT">Clase 1</field></shadow></value>
        </block>
        <block type="tm_is_class">
          <value name="CLASS_NAME"><shadow type="text"><field name="TEXT">Clase 1</field></shadow></value>
        </block>
        <block type="tm_when_class">
          <value name="CLASS_NAME"><shadow type="text"><field name="TEXT">Clase 1</field></shadow></value>
        </block>
      </category>
    </xml>
  `;

  // 3. Inject Blockly Workspace
  const blocklyDiv = document.getElementById('blocklyDiv');
  const workspace = Blockly.inject(blocklyDiv, {
    toolbox: toolboxXml,
    media: 'https://unpkg.com/blockly/media/',
    scrollbars: true,
    trashcan: true,
    zoom: {
      controls: true,
      wheel: true,
      startScale: 0.9,
      maxScale: 2.0,
      minScale: 0.4,
      scaleSpeed: 1.1
    },
    grid: {
      spacing: 20,
      length: 2,
      colour: '#E2E8F0',
      snap: true
    }
  });
  window.iScratchWorkspace = workspace;

  // Window resize handler
  window.addEventListener('resize', () => {
    Blockly.svgResize(workspace);
  });

  // 4. Setup Execution Buttons (Green Flag & Red Stop)
  const flagBtn = document.getElementById('btn-run');
  const stopBtn = document.getElementById('btn-stop');

  // Global audio unlock on any user click
  document.addEventListener('click', () => {
    if (window.iScratchRuntime) {
      window.iScratchRuntime.unlockAudio();
    }
  }, { passive: true });

  const syncWorkspaceEventListeners = () => {
    try {
      if (!window.iScratchRuntime || window.iScratchRuntime.isRunning) return;
      const code = Blockly.JavaScript.workspaceToCode(workspace);
      const AsyncFunction = Object.getPrototypeOf(async function(){}).constructor;
      const fn = new AsyncFunction('runtime', code);
      fn(window.iScratchRuntime).catch(() => {});
    } catch (e) {}
  };
  workspace.addChangeListener((e) => {
    if (e.isUiEvent) return;
    syncWorkspaceEventListeners();
  });
  setTimeout(syncWorkspaceEventListeners, 800);

  flagBtn.addEventListener('click', () => {
    try {
      if (window.iScratchRuntime) {
        window.iScratchRuntime.unlockAudio();
      }
      flagBtn.classList.add('running');

      // Use standard workspaceToCode: properly initializes nameDB_ and all variable definitions,
      // and registers each stack (green_flag, button, timer, gestures) into concurrent event handlers!
      const code = Blockly.JavaScript.workspaceToCode(workspace);
      console.log('--- TanoScratch: Ejecutando Programa ---\n', code);
      window.iScratchRuntime.start(code);
    } catch (err) {
      console.error('Error al generar o ejecutar código:', err);
      flagBtn.classList.remove('running');
      alert('Error en los bloques de código: ' + err.message);
    }
  });

  stopBtn.addEventListener('click', () => {
    flagBtn.classList.remove('running');
    window.iScratchRuntime.stop();
  });

  const btnResetSprite = document.getElementById('btn-reset-sprite');
  if (btnResetSprite) {
    btnResetSprite.addEventListener('click', () => {
      window.iScratchRuntime.resetSprite();
    });
  }

  const spriteSizeInput = document.getElementById('sprite-size');
  if (spriteSizeInput) {
    spriteSizeInput.removeAttribute('readonly');
    spriteSizeInput.addEventListener('change', () => {
      const val = parseInt(spriteSizeInput.value, 10);
      if (!isNaN(val) && window.iScratchRuntime) {
        window.iScratchRuntime.setSize(val);
      }
    });
  }

  // 5. Connect Arduino Nano 33 BLE Sense
  const connectBtn = document.getElementById('btn-connect-arduino');
  const serialDot = document.getElementById('serial-status-dot');
  const serialStatusText = document.getElementById('serial-status-text');
  const baudSelect = document.getElementById('baud-select');

  connectBtn.addEventListener('click', async () => {
    if (window.iScratchSerial.connected) {
      await window.iScratchSerial.disconnect();
    } else {
      // Si la cámara OV7675 está usando el puerto serial, detenerla primero
      if (window.iScratchTM && window.iScratchTM.currentSource === 'ov7675') {
        await window.iScratchTM.stopOV7675();
        const btnToggleOv7675 = document.getElementById('btn-toggle-ov7675');
        const tmOv7675Bar = document.getElementById('tm-ov7675-bar');
        const tmCameraBadge = document.getElementById('tm-camera-badge');
        if (btnToggleOv7675) {
          btnToggleOv7675.textContent = '👁️ Iniciar OV7675';
          btnToggleOv7675.style.background = '#00878F';
        }
        if (tmOv7675Bar) tmOv7675Bar.style.display = 'none';
        if (tmCameraBadge) tmCameraBadge.style.display = 'none';
      }
      const baud = baudSelect ? baudSelect.value : 115200;
      await window.iScratchSerial.connect(baud);
    }
  });

  window.iScratchSerial.onStatusChange((status, details) => {
    if (status === 'connected') {
      serialDot.className = 'serial-status-dot connected';
      serialStatusText.textContent = 'Nano 33 BLE Conectado';
      connectBtn.textContent = 'Desconectar Arduino';
      connectBtn.classList.add('accent-btn');
    } else if (status === 'connecting') {
      serialDot.className = 'serial-status-dot connecting';
      serialStatusText.textContent = 'Conectando...';
    } else {
      serialDot.className = 'serial-status-dot';
      serialStatusText.textContent = 'Desconectado';
      connectBtn.textContent = 'Conectar Arduino';
      connectBtn.classList.remove('accent-btn');
    }
  });

  // 6. Live Telemetry HUD Updates
  const valTemp = document.getElementById('val-temp');
  const valHum = document.getElementById('val-hum');
  const valPress = document.getElementById('val-press');
  const valSound = document.getElementById('val-sound');
  const soundFill = document.getElementById('sound-fill');
  const valProx = document.getElementById('val-prox');
  const proxFill = document.getElementById('prox-fill');
  const valGesture = document.getElementById('val-gesture');
  const valBtn = document.getElementById('val-btn');
  const colorSwatch = document.getElementById('color-swatch');
  const valColorText = document.getElementById('val-color-text');
  const cube = document.getElementById('cube-3d');
  const axVal = document.getElementById('ax-val');
  const ayVal = document.getElementById('ay-val');
  const azVal = document.getElementById('az-val');

  window.iScratchSerial.onTelemetry((t) => {
    if (valTemp) valTemp.textContent = (t.t !== null && t.t !== undefined && !isNaN(t.t)) ? Number(t.t).toFixed(1) : '--';
    if (valHum) {
      if (t.h === -1) {
        valHum.textContent = 'N/D';
        valHum.title = 'No disponible en Nano 33 BLE Sense Lite (hardware omitido de fábrica)';
      } else if (t.h !== null && t.h !== undefined && !isNaN(t.h)) {
        valHum.textContent = Number(t.h).toFixed(1);
        valHum.title = '';
      } else {
        valHum.textContent = '--';
      }
    }
    if (valPress) valPress.textContent = (t.p !== null && t.p !== undefined && !isNaN(t.p)) ? Number(t.p).toFixed(1) : '--';

    // TinyML Shield Pushbutton
    if (valBtn && t.btn !== undefined) {
      if (t.btn === 1) {
        valBtn.textContent = 'PRESIONADO';
        valBtn.style.color = '#10B981';
        valBtn.style.fontWeight = 'bold';
      } else {
        valBtn.textContent = 'NO PRESIONADO';
        valBtn.style.color = '#64748B';
        valBtn.style.fontWeight = 'normal';
      }
    }

    // Sound Meter
    if (valSound) valSound.textContent = t.sound !== undefined ? t.sound : 0;
    if (soundFill) soundFill.style.width = Math.min(100, Math.max(0, t.sound || 0)) + '%';

    // Proximity
    if (valProx) valProx.textContent = t.prox !== undefined ? t.prox : '--';
    if (proxFill) {
      // 0 is closest (100%), 255 is far (0%)
      const pVal = (t.prox !== undefined) ? t.prox : 255;
      const pct = Math.max(0, Math.min(100, Math.round(((255 - pVal) / 255) * 100)));
      proxFill.style.width = pct + '%';
    }

    // Color Swatch
    if (colorSwatch && (t.r !== undefined)) {
      colorSwatch.style.backgroundColor = `rgb(${t.r}, ${t.g}, ${t.b})`;
    }
    if (valColorText && (t.r !== undefined)) {
      valColorText.textContent = `R:${t.r} G:${t.g} B:${t.b}`;
    }

    // Gesture
    if (valGesture) {
      const g = window.iScratchSerial.getRecentGesture();
      valGesture.textContent = g;
      if (g !== 'NONE') {
        valGesture.classList.add('active');
      } else {
        valGesture.classList.remove('active');
      }
    }

    // 3D Attitude Cube (Calculate pitch and roll from accelerometer)
    if (cube && t.ax !== undefined) {
      const pitch = Math.atan2(t.ay, Math.sqrt(t.ax * t.ax + t.az * t.az)) * (180 / Math.PI);
      const roll = Math.atan2(-t.ax, t.az) * (180 / Math.PI);
      cube.style.transform = `rotateX(${pitch.toFixed(1)}deg) rotateY(${roll.toFixed(1)}deg)`;

      if (axVal) axVal.textContent = t.ax.toFixed(2);
      if (ayVal) ayVal.textContent = t.ay.toFixed(2);
      if (azVal) azVal.textContent = t.az.toFixed(2);
    }
  });

  // 7. Actuator Quick Test Controls: Onboard RGB LED (Pin D13 dedicated exclusively to TinyML shield button)
  let rgbLedPower = false;
  let lastRgbHex = '#00FF88';
  const btnToggleRgb = document.getElementById('btn-toggle-rgb');
  const rgbColorPicker = document.getElementById('rgb-color-picker');

  if (btnToggleRgb && rgbColorPicker) {
    btnToggleRgb.addEventListener('click', () => {
      rgbLedPower = !rgbLedPower;
      if (rgbLedPower) {
        btnToggleRgb.classList.add('active');
        btnToggleRgb.textContent = 'LED RGB: ON';
        rgbColorPicker.disabled = false;
        rgbColorPicker.style.cursor = 'pointer';
        rgbColorPicker.style.opacity = '1';
        rgbColorPicker.value = lastRgbHex;
        const r = parseInt(lastRgbHex.slice(1, 3), 16);
        const g = parseInt(lastRgbHex.slice(3, 5), 16);
        const b = parseInt(lastRgbHex.slice(5, 7), 16);
        window.iScratchSerial.setRgbLed(r, g, b);
      } else {
        btnToggleRgb.classList.remove('active');
        btnToggleRgb.textContent = 'LED RGB: OFF';
        rgbColorPicker.disabled = true;
        rgbColorPicker.style.cursor = 'not-allowed';
        rgbColorPicker.style.opacity = '0.45';
        rgbColorPicker.value = '#000000';
        window.iScratchSerial.setRgbLed(0, 0, 0);
      }
    });

    rgbColorPicker.addEventListener('input', (e) => {
      if (!rgbLedPower) return;
      const hex = e.target.value;
      lastRgbHex = hex;
      const r = parseInt(hex.slice(1, 3), 16);
      const g = parseInt(hex.slice(3, 5), 16);
      const b = parseInt(hex.slice(5, 7), 16);
      window.iScratchSerial.setRgbLed(r, g, b);
    });
  }

  // 8. Serial Monitor Console
  const terminalLog = document.getElementById('serial-terminal-log');
  const serialSendInput = document.getElementById('serial-send-input');
  const btnSerialSend = document.getElementById('btn-serial-send');
  const btnClearLog = document.getElementById('btn-clear-log');

  window.iScratchSerial.onRawLog((text, type) => {
    if (!terminalLog) return;
    const line = document.createElement('div');
    line.className = type === 'out' ? 'log-out' : 'log-in';
    const time = new Date().toLocaleTimeString();
    line.textContent = `[${time}] ${type === 'out' ? '>> ' : '<< '} ${text}`;
    terminalLog.appendChild(line);

    // Keep log reasonable in size (max 200 lines)
    if (terminalLog.children.length > 200) {
      terminalLog.removeChild(terminalLog.firstChild);
    }
    terminalLog.scrollTop = terminalLog.scrollHeight;
  });

  if (btnSerialSend && serialSendInput) {
    const doSend = () => {
      const msg = serialSendInput.value.trim();
      if (msg) {
        window.iScratchSerial.send(msg);
        serialSendInput.value = '';
      }
    };
    btnSerialSend.addEventListener('click', doSend);
    serialSendInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') doSend();
    });
  }

  if (btnClearLog && terminalLog) {
    btnClearLog.addEventListener('click', () => {
      terminalLog.innerHTML = '';
    });
  }

  // 9. Teachable Machine Controls (Webcam & OV7675 Camera Streamer)
  const tmModelUrlInput = document.getElementById('tm-model-url');
  const btnLoadTmModel = document.getElementById('btn-load-tm-model');
  const btnToggleWebcam = document.getElementById('btn-toggle-webcam');
  const btnToggleOv7675 = document.getElementById('btn-toggle-ov7675');
  const tmOv7675Bar = document.getElementById('tm-ov7675-bar');
  const tmOv7675Res = document.getElementById('tm-ov7675-res');
  const btnOv7675Color = document.getElementById('btn-ov7675-color');
  const btnOv7675Snap = document.getElementById('btn-ov7675-snap');
  const tmOv7675Fps = document.getElementById('tm-ov7675-fps');
  const tmOv7675ResLabel = document.getElementById('tm-ov7675-res-label');
  const tmOv7675Bw = document.getElementById('tm-ov7675-bw');
  const tmCameraBadge = document.getElementById('tm-camera-badge');
  const tmStatusMsg = document.getElementById('tm-status-msg');
  const tmClassesList = document.getElementById('tm-classes-list');
  const tmCanvas = document.getElementById('tm-webcam-canvas');

  if (btnLoadTmModel) {
    btnLoadTmModel.addEventListener('click', async () => {
      const url = tmModelUrlInput.value.trim();
      if (!url) return alert('Ingresa una URL válida de Teachable Machine');
      btnLoadTmModel.disabled = true;
      btnLoadTmModel.textContent = 'Cargando...';
      const success = await window.iScratchTM.loadModel(url);
      btnLoadTmModel.disabled = false;
      btnLoadTmModel.textContent = 'Cargar Modelo';
      if (success) {
        tmStatusMsg.textContent = `Modelo cargado con ${window.iScratchTM.classes.length} clases.`;
        _renderTmClassRows(window.iScratchTM.classes);
      }
    });
  }

  // --- Botón Iniciar / Detener Cámara Web ---
  if (btnToggleWebcam) {
    btnToggleWebcam.addEventListener('click', async () => {
      if (window.iScratchTM.isClassifying && window.iScratchTM.currentSource === 'webcam') {
        window.iScratchTM.stopWebcam();
        btnToggleWebcam.textContent = '📷 Iniciar Cámara Web';
        btnToggleWebcam.style.background = '';
        if (tmCameraBadge) tmCameraBadge.style.display = 'none';
      } else {
        // Reset interfaz OV7675 si estaba activa
        if (btnToggleOv7675) {
          btnToggleOv7675.textContent = '👁️ Iniciar OV7675';
          btnToggleOv7675.style.background = '#00878F';
        }
        if (tmOv7675Bar) tmOv7675Bar.style.display = 'none';

        btnToggleWebcam.textContent = 'Iniciando...';
        const ok = await window.iScratchTM.startWebcam(tmCanvas);
        if (ok) {
          btnToggleWebcam.textContent = '⏹️ Detener Cámara Web';
          btnToggleWebcam.style.background = '#DC2626';
          if (tmCameraBadge) {
            tmCameraBadge.textContent = 'Webcam PC';
            tmCameraBadge.style.background = '#2563EB';
            tmCameraBadge.style.display = 'inline-block';
          }
        } else {
          btnToggleWebcam.textContent = '📷 Iniciar Cámara Web';
          btnToggleWebcam.style.background = '';
        }
      }
    });
  }

  // --- Botón Iniciar / Detener Cámara OV7675 (TinyML Shield) ---
  if (btnToggleOv7675) {
    btnToggleOv7675.addEventListener('click', async () => {
      if (window.iScratchTM.isClassifying && window.iScratchTM.currentSource === 'ov7675') {
        await window.iScratchTM.stopOV7675();
        btnToggleOv7675.textContent = '👁️ Iniciar OV7675';
        btnToggleOv7675.style.background = '#00878F';
        if (tmOv7675Bar) tmOv7675Bar.style.display = 'none';
        if (tmCameraBadge) tmCameraBadge.style.display = 'none';
      } else {
        // Reset interfaz Cámara Web si estaba activa
        if (btnToggleWebcam) {
          btnToggleWebcam.textContent = '📷 Iniciar Cámara Web';
          btnToggleWebcam.style.background = '';
        }

        btnToggleOv7675.textContent = 'Conectando...';
        const baud = baudSelect ? baudSelect.value : 115200;
        const ok = await window.iScratchTM.startOV7675(tmCanvas, baud);
        if (ok) {
          btnToggleOv7675.textContent = '⏹️ Detener OV7675';
          btnToggleOv7675.style.background = '#DC2626';
          if (tmOv7675Bar) tmOv7675Bar.style.display = 'block';
          if (tmCameraBadge) {
            tmCameraBadge.textContent = 'OV7675';
            tmCameraBadge.style.background = '#00878F';
            tmCameraBadge.style.display = 'inline-block';
          }
        } else {
          btnToggleOv7675.textContent = '👁️ Iniciar OV7675';
          btnToggleOv7675.style.background = '#00878F';
          if (tmOv7675Bar) tmOv7675Bar.style.display = 'none';
          if (tmCameraBadge) tmCameraBadge.style.display = 'none';
        }
      }
    });
  }

  // Controles OV7675: Cambio dinámico de resolución
  if (tmOv7675Res) {
    tmOv7675Res.addEventListener('change', () => {
      const res = tmOv7675Res.value;
      window.iScratchTM.setOV7675Resolution(res);
      if (tmOv7675ResLabel) tmOv7675ResLabel.textContent = `${res} RGB`;
    });
  }

  // Controles OV7675: Alternar RGB / Blanco y Negro
  let ov7675IsGray = false;
  if (btnOv7675Color) {
    btnOv7675Color.addEventListener('click', () => {
      ov7675IsGray = !ov7675IsGray;
      window.iScratchTM.setOV7675ColorMode(ov7675IsGray);
      btnOv7675Color.textContent = ov7675IsGray ? '⚪ Grises' : '🎨 RGB';
      btnOv7675Color.style.background = ov7675IsGray ? '#64748B' : '#E2E8F0';
      btnOv7675Color.style.color = ov7675IsGray ? '#FFF' : '#0F172A';
      if (tmOv7675ResLabel) {
        tmOv7675ResLabel.textContent = `${tmOv7675Res ? tmOv7675Res.value : '80x60'} ${ov7675IsGray ? 'GRIS' : 'RGB'}`;
      }
    });
  }

  // Controles OV7675: Captura instantánea PNG
  if (btnOv7675Snap) {
    btnOv7675Snap.addEventListener('click', () => {
      const dataUrl = window.iScratchTM.getOV7675Snapshot();
      if (dataUrl) {
        const a = document.createElement('a');
        a.href = dataUrl;
        a.download = `captura_ov7675_${Date.now()}.png`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
      }
    });
  }

  // Métricas en tiempo real de la cámara OV7675 (FPS, resolución, KB/s)
  window.iScratchTM.onMetrics((m) => {
    if (tmOv7675Fps) tmOv7675Fps.textContent = `${m.fps} FPS`;
    if (tmOv7675ResLabel) tmOv7675ResLabel.textContent = `${m.width}x${m.height} ${m.format}`;
    if (tmOv7675Bw) tmOv7675Bw.textContent = `${m.bandwidth} KB/s`;
  });

  // Estado general de Teachable Machine
  window.iScratchTM.onStatusChange((status, details) => {
    if (tmStatusMsg) {
      if (status === 'loaded' || status === 'classifying') {
        tmStatusMsg.textContent = details;
        tmStatusMsg.style.color = '#10B981';
      } else if (status === 'error') {
        tmStatusMsg.textContent = details;
        tmStatusMsg.style.color = '#EF4444';
      } else {
        tmStatusMsg.textContent = details;
        tmStatusMsg.style.color = '#64748B';
      }
    }
  });

  function _renderTmClassRows(classes) {
    if (!tmClassesList) return;
    tmClassesList.innerHTML = '';
    classes.forEach((c) => {
      const row = document.createElement('div');
      row.className = 'tm-class-row';
      row.innerHTML = `
        <div class="tm-class-info">
          <span>${c}</span>
          <span id="tm-val-${c}">0%</span>
        </div>
        <div class="tm-bar-bg">
          <div class="tm-bar-fill" id="tm-bar-${c}"></div>
        </div>
      `;
      tmClassesList.appendChild(row);
    });
  }

  window.iScratchTM.onPrediction((predictions) => {
    predictions.forEach((p) => {
      const valEl = document.getElementById(`tm-val-${p.className}`);
      const barEl = document.getElementById(`tm-bar-${p.className}`);
      const pct = Math.round(p.probability * 100);
      if (valEl) valEl.textContent = `${pct}%`;
      if (barEl) barEl.style.width = `${pct}%`;
    });
  });

  // 10. Tab Switching for Lower Right
  const tabBtns = document.querySelectorAll('.panel-tab-btn');
  const tabPanes = document.querySelectorAll('.tab-pane');

  tabBtns.forEach((btn) => {
    btn.addEventListener('click', () => {
      tabBtns.forEach((b) => b.classList.remove('active'));
      tabPanes.forEach((p) => p.classList.remove('active'));

      btn.classList.add('active');
      const targetPane = document.getElementById(btn.dataset.tab);
      if (targetPane) targetPane.classList.add('active');
    });
  });

  // 11. Project Save / Load & Example Projects
  const btnSave = document.getElementById('btn-save-project');
  const btnLoad = document.getElementById('btn-load-project');
  const fileInput = document.getElementById('project-file-input');
  const examplesSelect = document.getElementById('examples-select');

  if (btnSave) {
    btnSave.addEventListener('click', () => {
      const xml = Blockly.Xml.workspaceToDom(workspace);
      const xmlText = Blockly.Xml.domToPrettyText(xml);
      const projectData = {
        name: 'TanoScratch_Project',
        version: '1.0',
        date: new Date().toISOString(),
        xml: xmlText
      };
      const blob = new Blob([JSON.stringify(projectData, null, 2)], { type: 'application/json' });
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = `tanoscratch_project_${Date.now()}.tanoscratch`;
      a.click();
      URL.revokeObjectURL(a.href);
    });
  }

  if (btnLoad && fileInput) {
    btnLoad.addEventListener('click', () => fileInput.click());
    fileInput.addEventListener('change', (e) => {
      const file = e.target.files[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = (event) => {
        try {
          const data = JSON.parse(event.target.result);
          if (data.xml) {
            workspace.clear();
            const dom = Blockly.utils.xml.textToDom(data.xml);
            Blockly.Xml.domToWorkspace(dom, workspace);
          }
        } catch (err) {
          alert('Error al abrir el archivo de proyecto: ' + err.message);
        }
      };
      reader.readAsText(file);
    });
  }

  // Load Example Projects
  const EXAMPLES = {
    'starter': `<xml xmlns="https://developers.google.com/blockly/xml">
      <block type="scratch_when_flag" x="50" y="50">
        <statement name="STACK">
          <block type="scratch_say_for_secs">
            <value name="TEXT"><shadow type="text"><field name="TEXT">¡Hola! Soy Tano, bienvenido a TanoScratch</field></shadow></value>
            <value name="SECS"><shadow type="math_number"><field name="NUM">2</field></shadow></value>
            <next>
              <block type="scratch_repeat">
                <value name="TIMES"><shadow type="math_number"><field name="NUM">10</field></shadow></value>
                <statement name="DO">
                  <block type="scratch_move">
                    <value name="STEPS"><shadow type="math_number"><field name="NUM">10</field></shadow></value>
                    <next>
                      <block type="scratch_wait">
                        <value name="SECS"><shadow type="math_number"><field name="NUM">0.1</field></shadow></value>
                      </block>
                    </next>
                  </block>
                </statement>
                <next>
                  <block type="scratch_play_sound">
                    <value name="FREQ"><shadow type="math_number"><field name="NUM">523</field></shadow></value>
                    <value name="DURATION"><shadow type="math_number"><field name="NUM">0.3</field></shadow></value>
                  </block>
                </next>
              </block>
            </next>
          </block>
        </statement>
      </block>
    </xml>`,

    'button_grow': `<xml xmlns="https://developers.google.com/blockly/xml">
      <block type="scratch_when_flag" x="50" y="50">
        <statement name="STACK">
          <block type="scratch_set_size">
            <value name="SIZE"><shadow type="math_number"><field name="NUM">100</field></shadow></value>
            <next>
              <block type="scratch_say_for_secs">
                <value name="TEXT"><shadow type="text"><field name="TEXT">¡Mantén presionado el botón de la shield para agrandarme!</field></shadow></value>
                <value name="SECS"><shadow type="math_number"><field name="NUM">2</field></shadow></value>
                <next>
                  <block type="scratch_forever">
                    <statement name="DO">
                      <block type="controls_if">
                        <value name="IF0">
                          <block type="nano33_get_button"></block>
                        </value>
                        <statement name="DO0">
                          <block type="scratch_change_size">
                            <value name="CHANGE"><shadow type="math_number"><field name="NUM">5</field></shadow></value>
                          </block>
                        </statement>
                      </block>
                    </statement>
                  </block>
                </next>
              </block>
            </next>
          </block>
        </statement>
      </block>
      <block type="nano33_when_button" x="50" y="320">
        <field name="ACTION">release</field>
        <statement name="DO">
          <block type="scratch_play_sound">
            <value name="FREQ"><shadow type="math_number"><field name="NUM">659</field></shadow></value>
            <value name="DURATION"><shadow type="math_number"><field name="NUM">0.15</field></shadow></value>
          </block>
        </statement>
      </block>
    </xml>`,

    'imu_tilt': `<xml xmlns="https://developers.google.com/blockly/xml">
      <block type="scratch_when_flag" x="50" y="50">
        <statement name="STACK">
          <block type="scratch_say_for_secs">
            <value name="TEXT"><shadow type="text"><field name="TEXT">¡Inclina el Nano 33 BLE para mover a Tano!</field></shadow></value>
            <value name="SECS"><shadow type="math_number"><field name="NUM">2</field></shadow></value>
            <next>
              <block type="scratch_forever">
                <statement name="DO">
                  <block type="scratch_goto">
                    <value name="X">
                      <block type="math_arithmetic">
                        <field name="OP">MULTIPLY</field>
                        <value name="A"><block type="nano33_get_accel"><field name="AXIS">x</field></block></value>
                        <value name="B"><shadow type="math_number"><field name="NUM">200</field></shadow></value>
                      </block>
                    </value>
                    <value name="Y">
                      <block type="math_arithmetic">
                        <field name="OP">MULTIPLY</field>
                        <value name="A"><block type="nano33_get_accel"><field name="AXIS">y</field></block></value>
                        <value name="B"><shadow type="math_number"><field name="NUM">200</field></shadow></value>
                      </block>
                    </value>
                  </block>
                </statement>
              </block>
            </next>
          </block>
        </statement>
      </block>
    </xml>`,

    'gesture_sound': `<xml xmlns="https://developers.google.com/blockly/xml">
      <block type="scratch_when_flag" x="50" y="50">
        <statement name="STACK">
          <block type="scratch_say">
            <value name="TEXT"><shadow type="text"><field name="TEXT">Haz gestos sobre el sensor APDS9960</field></shadow></value>
          </block>
        </statement>
      </block>
      <block type="nano33_when_gesture" x="50" y="160">
        <field name="GESTURE">UP</field>
        <statement name="DO">
          <block type="scratch_say_for_secs">
            <value name="TEXT"><shadow type="text"><field name="TEXT">¡Gesto ARRIBA detectado!</field></shadow></value>
            <value name="SECS"><shadow type="math_number"><field name="NUM">1</field></shadow></value>
            <next>
              <block type="scratch_play_sound">
                <value name="FREQ"><shadow type="math_number"><field name="NUM">880</field></shadow></value>
                <value name="DURATION"><shadow type="math_number"><field name="NUM">0.2</field></shadow></value>
              </block>
            </next>
          </block>
        </statement>
      </block>
      <block type="nano33_when_gesture" x="50" y="320">
        <field name="GESTURE">DOWN</field>
        <statement name="DO">
          <block type="scratch_say_for_secs">
            <value name="TEXT"><shadow type="text"><field name="TEXT">¡Gesto ABAJO detectado!</field></shadow></value>
            <value name="SECS"><shadow type="math_number"><field name="NUM">1</field></shadow></value>
            <next>
              <block type="scratch_play_sound">
                <value name="FREQ"><shadow type="math_number"><field name="NUM">330</field></shadow></value>
                <value name="DURATION"><shadow type="math_number"><field name="NUM">0.2</field></shadow></value>
              </block>
            </next>
          </block>
        </statement>
      </block>
    </xml>`,

    'color_lamp': `<xml xmlns="https://developers.google.com/blockly/xml">
      <block type="scratch_when_flag" x="50" y="50">
        <statement name="STACK">
          <block type="scratch_say_for_secs">
            <value name="TEXT"><shadow type="text"><field name="TEXT">Copia el color detectado al LED RGB</field></shadow></value>
            <value name="SECS"><shadow type="math_number"><field name="NUM">2</field></shadow></value>
            <next>
              <block type="scratch_forever">
                <statement name="DO">
                  <block type="nano33_set_rgb">
                    <value name="R"><block type="nano33_get_color"><field name="CHANNEL">r</field></block></value>
                    <value name="G"><block type="nano33_get_color"><field name="CHANNEL">g</field></block></value>
                    <value name="B"><block type="nano33_get_color"><field name="CHANNEL">b</field></block></value>
                    <next>
                      <block type="scratch_wait">
                        <value name="SECS"><shadow type="math_number"><field name="NUM">0.1</field></shadow></value>
                      </block>
                    </next>
                  </block>
                </statement>
              </block>
            </next>
          </block>
        </statement>
      </block>
    </xml>`
  };

  if (examplesSelect) {
    examplesSelect.addEventListener('change', (e) => {
      const selected = e.target.value;
      if (selected && EXAMPLES[selected]) {
        workspace.clear();
        const dom = Blockly.utils.xml.textToDom(EXAMPLES[selected]);
        Blockly.Xml.domToWorkspace(dom, workspace);
      }
    });
  }

  // Load default welcome blocks
  if (EXAMPLES['starter']) {
    const dom = Blockly.utils.xml.textToDom(EXAMPLES['starter']);
    Blockly.Xml.domToWorkspace(dom, workspace);
  }
});
