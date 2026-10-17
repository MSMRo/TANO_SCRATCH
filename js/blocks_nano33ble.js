/**
 * =============================================================================
 * iScratch - Arduino Nano 33 BLE Sense Blocks Definition & Generator
 * =============================================================================
 * Category: Arduino Nano 33 BLE Sense
 * Brand Color: #00878F (Arduino Teal)
 */

(function () {
  const ARDUINO_COLOR = '#00878F';
  const ARDUINO_DARK = '#006468';

  const Order = (window.javascript && window.javascript.Order) || (Blockly.JavaScript && Blockly.JavaScript.Order) || {
    ATOMIC: 0,
    NONE: 99
  };

  const registerGen = (name, fn) => {
    if (Blockly.JavaScript) {
      if (Blockly.JavaScript.forBlock) {
        Blockly.JavaScript.forBlock[name] = fn;
      }
      Blockly.JavaScript[name] = fn;
    }
  };

  // 1. Conectar Arduino
  Blockly.Blocks['nano33_connect'] = {
    init: function () {
      this.appendDummyInput()
        .appendField('🔌 conectar a Arduino Nano 33 BLE Sense a')
        .appendField(new Blockly.FieldNumber(115200, 1200, 2000000), 'BAUD')
        .appendField('baudios');
      this.setPreviousStatement(true, null);
      this.setNextStatement(true, null);
      this.setColour(ARDUINO_COLOR);
      this.setTooltip('Abre el cuadro de diálogo Web Serial para conectar con el Arduino Nano 33 BLE Sense.');
    }
  };

  registerGen('nano33_connect', function (block) {
    const baud = block.getFieldValue('BAUD') || 115200;
    return `await window.iScratchSerial.connect(${baud});\n`;
  });

  // 2. Desconectar Arduino
  Blockly.Blocks['nano33_disconnect'] = {
    init: function () {
      this.appendDummyInput()
        .appendField('🔌 desconectar Arduino');
      this.setPreviousStatement(true, null);
      this.setNextStatement(true, null);
      this.setColour(ARDUINO_COLOR);
      this.setTooltip('Cierra la conexión serial con el Arduino.');
    }
  };

  registerGen('nano33_disconnect', function () {
    return 'await window.iScratchSerial.disconnect();\n';
  });

  // 3. ¿Arduino conectado? (Booleano)
  Blockly.Blocks['nano33_is_connected'] = {
    init: function () {
      this.appendDummyInput()
        .appendField('¿Arduino conectado?');
      this.setOutput(true, 'Boolean');
      this.setColour(ARDUINO_COLOR);
      this.setTooltip('Retorna verdadero si hay una conexión serial activa con el Arduino.');
    }
  };

  registerGen('nano33_is_connected', function () {
    return ['window.iScratchSerial.connected', Order.ATOMIC];
  });

  // 4. Temperatura (°C)
  Blockly.Blocks['nano33_get_temp'] = {
    init: function () {
      this.appendDummyInput()
        .appendField('🌡️ temperatura (°C)');
      this.setOutput(true, 'Number');
      this.setColour(ARDUINO_COLOR);
      this.setTooltip('Lee la temperatura actual del sensor en grados Celsius.');
    }
  };

  registerGen('nano33_get_temp', function () {
    return ['((window.iScratchSerial.telemetry.t !== null && window.iScratchSerial.telemetry.t !== undefined) ? window.iScratchSerial.telemetry.t : 0)', Order.ATOMIC];
  });

  // 5. Humedad (%)
  Blockly.Blocks['nano33_get_hum'] = {
    init: function () {
      this.appendDummyInput()
        .appendField('💧 humedad (%)');
      this.setOutput(true, 'Number');
      this.setColour(ARDUINO_COLOR);
      this.setTooltip('Lee la humedad relativa del aire en porcentaje (%).');
    }
  };

  registerGen('nano33_get_hum', function () {
    return ['((window.iScratchSerial.telemetry.h !== null && window.iScratchSerial.telemetry.h !== undefined) ? window.iScratchSerial.telemetry.h : 0)', Order.ATOMIC];
  });

  // 6. Presión Barométrica (hPa)
  Blockly.Blocks['nano33_get_press'] = {
    init: function () {
      this.appendDummyInput()
        .appendField('⏲️ presión barométrica (hPa)');
      this.setOutput(true, 'Number');
      this.setColour(ARDUINO_COLOR);
      this.setTooltip('Lee la presión atmosférica del sensor LPS22HB en hectopascales (hPa).');
    }
  };

  registerGen('nano33_get_press', function () {
    return ['((window.iScratchSerial.telemetry.p !== null && window.iScratchSerial.telemetry.p !== undefined) ? window.iScratchSerial.telemetry.p : 0)', Order.ATOMIC];
  });

  // 7. Aceleración (X, Y, Z) en g
  Blockly.Blocks['nano33_get_accel'] = {
    init: function () {
      this.appendDummyInput()
        .appendField('📐 aceleración eje')
        .appendField(new Blockly.FieldDropdown([['X', 'x'], ['Y', 'y'], ['Z', 'z']]), 'AXIS')
        .appendField('(g)');
      this.setOutput(true, 'Number');
      this.setColour(ARDUINO_COLOR);
      this.setTooltip('Lee la aceleración en el eje seleccionado en unidades de g.');
    }
  };

  registerGen('nano33_get_accel', function (block) {
    const axis = block.getFieldValue('AXIS');
    return [`(window.iScratchSerial.telemetry.a${axis} || 0)`, Order.ATOMIC];
  });

  // 8. Giroscopio (X, Y, Z) en °/s
  Blockly.Blocks['nano33_get_gyro'] = {
    init: function () {
      this.appendDummyInput()
        .appendField('🔄 giroscopio eje')
        .appendField(new Blockly.FieldDropdown([['X', 'x'], ['Y', 'y'], ['Z', 'z']]), 'AXIS')
        .appendField('(°/s)');
      this.setOutput(true, 'Number');
      this.setColour(ARDUINO_COLOR);
      this.setTooltip('Lee la velocidad angular en el eje seleccionado en grados por segundo (°/s).');
    }
  };

  registerGen('nano33_get_gyro', function (block) {
    const axis = block.getFieldValue('AXIS');
    return [`(window.iScratchSerial.telemetry.g${axis} || 0)`, Order.ATOMIC];
  });

  // 9. Magnetómetro (X, Y, Z) en µT
  Blockly.Blocks['nano33_get_mag'] = {
    init: function () {
      this.appendDummyInput()
        .appendField('🧭 campo magnético eje')
        .appendField(new Blockly.FieldDropdown([['X', 'x'], ['Y', 'y'], ['Z', 'z']]), 'AXIS')
        .appendField('(µT)');
      this.setOutput(true, 'Number');
      this.setColour(ARDUINO_COLOR);
      this.setTooltip('Lee el campo magnético en microteslas (µT).');
    }
  };

  registerGen('nano33_get_mag', function (block) {
    const axis = block.getFieldValue('AXIS');
    return [`(window.iScratchSerial.telemetry.m${axis} || 0)`, Order.ATOMIC];
  });

  // 10. Sensor de Color (R, G, B, Luz ambiental)
  Blockly.Blocks['nano33_get_color'] = {
    init: function () {
      this.appendDummyInput()
        .appendField('🎨 sensor de color')
        .appendField(new Blockly.FieldDropdown([
          ['Rojo (R)', 'r'],
          ['Verde (G)', 'g'],
          ['Azul (B)', 'b'],
          ['Luz ambiente', 'light']
        ]), 'CHANNEL');
      this.setOutput(true, 'Number');
      this.setColour(ARDUINO_COLOR);
      this.setTooltip('Lee el canal de color del sensor APDS9960.');
    }
  };

  registerGen('nano33_get_color', function (block) {
    const ch = block.getFieldValue('CHANNEL');
    return [`(window.iScratchSerial.telemetry.${ch} || 0)`, Order.ATOMIC];
  });

  // 11. Proximidad (0-255)
  Blockly.Blocks['nano33_get_prox'] = {
    init: function () {
      this.appendDummyInput()
        .appendField('📏 proximidad (0 cerca - 255 lejos)');
      this.setOutput(true, 'Number');
      this.setColour(ARDUINO_COLOR);
      this.setTooltip('Lee la distancia de proximidad (0 muy cercano, 255 sin obstáculo).');
    }
  };

  registerGen('nano33_get_prox', function () {
    return ['(window.iScratchSerial.telemetry.prox !== undefined ? window.iScratchSerial.telemetry.prox : 255)', Order.ATOMIC];
  });

  // 12. Gesto detectado (UP, DOWN, LEFT, RIGHT, NONE)
  Blockly.Blocks['nano33_get_gesture'] = {
    init: function () {
      this.appendDummyInput()
        .appendField('👋 último gesto detectado');
      this.setOutput(true, 'String');
      this.setColour(ARDUINO_COLOR);
      this.setTooltip('Retorna el último gesto detectado: UP, DOWN, LEFT, RIGHT o NONE.');
    }
  };

  registerGen('nano33_get_gesture', function () {
    return ['window.iScratchSerial.getRecentGesture()', Order.ATOMIC];
  });

  // 13. Nivel de sonido / Micrófono
  Blockly.Blocks['nano33_get_sound'] = {
    init: function () {
      this.appendDummyInput()
        .appendField('🎤 nivel de sonido micrófono (0-100)');
      this.setOutput(true, 'Number');
      this.setColour(ARDUINO_COLOR);
      this.setTooltip('Lee la intensidad del sonido ambiente calculada por el micrófono digital PDM.');
    }
  };

  registerGen('nano33_get_sound', function () {
    return ['(window.iScratchSerial.telemetry.sound || 0)', Order.ATOMIC];
  });

  // 14. Deprecated D13 LED Block (Safe fallback for old projects)
  Blockly.Blocks['nano33_set_led'] = {
    init: function () {
      this.appendDummyInput()
        .appendField('⚠️ [Desactivado] LED D13');
      this.setPreviousStatement(true, null);
      this.setNextStatement(true, null);
      this.setColour('#94A3B8');
      this.setTooltip('El pin D13 está ahora dedicado exclusivamente al botón de la shield TinyML.');
    }
  };

  registerGen('nano33_set_led', function () {
    return '// Pin D13 asignado exclusivamente a boton TinyML\n';
  });

  // 15a. Actuador: Encender / Apagar LED RGB
  Blockly.Blocks['nano33_set_rgb_power'] = {
    init: function () {
      this.appendDummyInput()
        .appendField('💡 fijar LED RGB a')
        .appendField(new Blockly.FieldDropdown([
          ['encendido (blanco)', 'on'],
          ['apagado', 'off']
        ]), 'STATE');
      this.setPreviousStatement(true, null);
      this.setNextStatement(true, null);
      this.setColour(ARDUINO_COLOR);
      this.setTooltip('Enciende (blanco por defecto) o apaga completamente el LED RGB de la placa.');
    }
  };

  registerGen('nano33_set_rgb_power', function (block) {
    const state = block.getFieldValue('STATE');
    if (state === 'on') {
      return 'await window.iScratchSerial.setRgbLed(255, 255, 255);\n';
    } else {
      return 'await window.iScratchSerial.setRgbLed(0, 0, 0);\n';
    }
  });

  // 15b. Actuador: Fijar color predefinido de LED RGB
  Blockly.Blocks['nano33_set_rgb_color_palette'] = {
    init: function () {
      this.appendDummyInput()
        .appendField('🌈 fijar color LED RGB a')
        .appendField(new Blockly.FieldDropdown([
          ['🔴 Rojo', '255,0,0'],
          ['🟢 Verde', '0,255,0'],
          ['🔵 Azul', '0,0,255'],
          ['🟡 Amarillo', '255,255,0'],
          ['🔷 Cian', '0,255,255'],
          ['🟣 Magenta', '255,0,255'],
          ['⚪ Blanco', '255,255,255'],
          ['🟠 Naranja', '255,128,0'],
          ['⚫ Apagado', '0,0,0']
        ]), 'COLOR');
      this.setPreviousStatement(true, null);
      this.setNextStatement(true, null);
      this.setColour(ARDUINO_COLOR);
      this.setTooltip('Establece el color del LED RGB integrado a un color predefinido.');
    }
  };

  registerGen('nano33_set_rgb_color_palette', function (block) {
    const colorStr = block.getFieldValue('COLOR') || '255,0,0';
    const [r, g, b] = colorStr.split(',');
    return `await window.iScratchSerial.setRgbLed(${r}, ${g}, ${b});\n`;
  });

  // 15c. Actuador: LED RGB con canales R, G, B personalizados (0-255)
  Blockly.Blocks['nano33_set_rgb'] = {
    init: function () {
      this.appendValueInput('R')
        .setCheck('Number')
        .appendField('🌈 fijar LED RGB a R:');
      this.appendValueInput('G')
        .setCheck('Number')
        .appendField('G:');
      this.appendValueInput('B')
        .setCheck('Number')
        .appendField('B:');
      this.setInputsInline(true);
      this.setPreviousStatement(true, null);
      this.setNextStatement(true, null);
      this.setColour(ARDUINO_COLOR);
      this.setTooltip('Controla la intensidad de cada canal del LED RGB (0 a 255). 0,0,0 apaga el LED.');
    }
  };

  registerGen('nano33_set_rgb', function (block) {
    const r = Blockly.JavaScript.valueToCode(block, 'R', Order.ATOMIC) || '0';
    const g = Blockly.JavaScript.valueToCode(block, 'G', Order.ATOMIC) || '0';
    const b = Blockly.JavaScript.valueToCode(block, 'B', Order.ATOMIC) || '0';
    return `await window.iScratchSerial.setRgbLed(${r}, ${g}, ${b});\n`;
  });

  // 16. Enviar comando serial personalizado
  Blockly.Blocks['nano33_send_serial'] = {
    init: function () {
      this.appendValueInput('TEXT')
        .setCheck('String')
        .appendField('📤 enviar texto por serial:');
      this.setPreviousStatement(true, null);
      this.setNextStatement(true, null);
      this.setColour(ARDUINO_COLOR);
      this.setTooltip('Envía cualquier texto o comando serial al Arduino por USB.');
    }
  };

  registerGen('nano33_send_serial', function (block) {
    const text = Blockly.JavaScript.valueToCode(block, 'TEXT', Order.ATOMIC) || "''";
    return `await window.iScratchSerial.send(${text});\n`;
  });

  // 17. Evento: Al detectar gesto
  Blockly.Blocks['nano33_when_gesture'] = {
    init: function () {
      this.appendDummyInput()
        .appendField('👋 al detectar gesto')
        .appendField(new Blockly.FieldDropdown([
          ['ARRIBA', 'UP'],
          ['ABAJO', 'DOWN'],
          ['IZQUIERDA', 'LEFT'],
          ['DERECHA', 'RIGHT']
        ]), 'GESTURE');
      this.appendStatementInput('DO')
        .appendField('hacer');
      this.setColour(ARDUINO_COLOR);
      this.setTooltip('Ejecuta las instrucciones cuando se reconoce el gesto óptico indicado.');
    }
  };

  registerGen('nano33_when_gesture', function (block) {
    const gesture = block.getFieldValue('GESTURE');
    const branch = Blockly.JavaScript.statementToCode(block, 'DO');
    return `
      window.iScratchRuntime.registerEventListener('gesture_${gesture}', async () => {
        ${branch}
      });\n`;
  });

  // 18a. ¿Botón TinyML presionado? (Booleano)
  Blockly.Blocks['nano33_get_button'] = {
    init: function () {
      this.appendDummyInput()
        .appendField('🔘 ¿botón TinyML presionado?');
      this.setOutput(true, 'Boolean');
      this.setColour(ARDUINO_COLOR);
      this.setTooltip('Retorna verdadero (true) mientras el botón de la shield TinyML esté presionado.');
    }
  };

  registerGen('nano33_get_button', function () {
    return ['(window.iScratchSerial.telemetry.btn === 1)', Order.ATOMIC];
  });

  // 18b. Estado numérico del botón TinyML (1 o 0)
  Blockly.Blocks['nano33_get_button_state'] = {
    init: function () {
      this.appendDummyInput()
        .appendField('🔘 estado botón TinyML (1 presionado, 0 suelto)');
      this.setOutput(true, 'Number');
      this.setColour(ARDUINO_COLOR);
      this.setTooltip('Retorna 1 si el botón de la shield TinyML está presionado, o 0 si está liberado.');
    }
  };

  registerGen('nano33_get_button_state', function () {
    return ['(window.iScratchSerial.telemetry.btn || 0)', Order.ATOMIC];
  });

  // 19. Evento: Al presionar / soltar botón de la shield TinyML
  Blockly.Blocks['nano33_when_button'] = {
    init: function () {
      this.appendDummyInput()
        .appendField('🔘 al')
        .appendField(new Blockly.FieldDropdown([
          ['presionar botón TinyML', 'press'],
          ['soltar botón TinyML', 'release']
        ]), 'ACTION');
      this.appendStatementInput('DO')
        .appendField('hacer');
      this.setColour(ARDUINO_COLOR);
      this.setTooltip('Ejecuta las instrucciones cuando se presiona o suelta el botón de la shield TinyML.');
    }
  };

  registerGen('nano33_when_button', function (block) {
    const action = block.getFieldValue('ACTION') || 'press';
    const branch = Blockly.JavaScript.statementToCode(block, 'DO');
    return `
      window.iScratchRuntime.registerEventListener('button_${action}', async () => {
        ${branch}
      });\n`;
  });
})();
