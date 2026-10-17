/**
 * =============================================================================
 * iScratch - Standard Scratch Core Blocks (Motion, Looks, Sound, Events, Control)
 * =============================================================================
 * Classic Scratch 3.0 blocks mapped to the iScratch virtual machine runtime.
 */

(function () {
  const COLOR_MOTION = '#4C97FF';
  const COLOR_LOOKS = '#9966FF';
  const COLOR_SOUND = '#CF63CF';
  const COLOR_EVENTS = '#FFBF00';
  const COLOR_CONTROL = '#FFAB19';

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

  // --- EVENTS ---
  Blockly.Blocks['scratch_when_flag'] = {
    init: function () {
      this.appendDummyInput()
        .appendField('🚩 al hacer clic en bandera verde');
      this.appendStatementInput('STACK')
        .appendField('hacer');
      this.setColour(COLOR_EVENTS);
      this.setTooltip('Inicia este programa cuando se pulsa la bandera verde.');
    }
  };

  registerGen('scratch_when_flag', function (block) {
    const stack = Blockly.JavaScript.statementToCode(block, 'STACK');
    return `// Al hacer clic en bandera verde\n${stack}\n`;
  });

  // --- MOTION ---
  Blockly.Blocks['scratch_move'] = {
    init: function () {
      this.appendValueInput('STEPS')
        .setCheck('Number')
        .appendField('mover');
      this.appendDummyInput()
        .appendField('pasos');
      this.setPreviousStatement(true, null);
      this.setNextStatement(true, null);
      this.setColour(COLOR_MOTION);
      this.setTooltip('Mueve el objeto hacia adelante en su dirección actual.');
    }
  };

  registerGen('scratch_move', function (block) {
    const steps = Blockly.JavaScript.valueToCode(block, 'STEPS', Order.ATOMIC) || '10';
    return `runtime.move(${steps});\n`;
  });

  Blockly.Blocks['scratch_turn_right'] = {
    init: function () {
      this.appendValueInput('DEGREES')
        .setCheck('Number')
        .appendField('girar ↷');
      this.appendDummyInput()
        .appendField('grados');
      this.setPreviousStatement(true, null);
      this.setNextStatement(true, null);
      this.setColour(COLOR_MOTION);
      this.setTooltip('Gira el objeto hacia la derecha.');
    }
  };

  registerGen('scratch_turn_right', function (block) {
    const deg = Blockly.JavaScript.valueToCode(block, 'DEGREES', Order.ATOMIC) || '15';
    return `runtime.turnRight(${deg});\n`;
  });

  Blockly.Blocks['scratch_turn_left'] = {
    init: function () {
      this.appendValueInput('DEGREES')
        .setCheck('Number')
        .appendField('girar ↶');
      this.appendDummyInput()
        .appendField('grados');
      this.setPreviousStatement(true, null);
      this.setNextStatement(true, null);
      this.setColour(COLOR_MOTION);
      this.setTooltip('Gira el objeto hacia la izquierda.');
    }
  };

  registerGen('scratch_turn_left', function (block) {
    const deg = Blockly.JavaScript.valueToCode(block, 'DEGREES', Order.ATOMIC) || '15';
    return `runtime.turnLeft(${deg});\n`;
  });

  Blockly.Blocks['scratch_goto'] = {
    init: function () {
      this.appendValueInput('X')
        .setCheck('Number')
        .appendField('ir a x:');
      this.appendValueInput('Y')
        .setCheck('Number')
        .appendField('y:');
      this.setInputsInline(true);
      this.setPreviousStatement(true, null);
      this.setNextStatement(true, null);
      this.setColour(COLOR_MOTION);
      this.setTooltip('Posiciona el objeto en las coordenadas (X, Y) especificadas.');
    }
  };

  registerGen('scratch_goto', function (block) {
    const x = Blockly.JavaScript.valueToCode(block, 'X', Order.ATOMIC) || '0';
    const y = Blockly.JavaScript.valueToCode(block, 'Y', Order.ATOMIC) || '0';
    return `runtime.goto(${x}, ${y});\n`;
  });

  Blockly.Blocks['scratch_point_dir'] = {
    init: function () {
      this.appendValueInput('DIRECTION')
        .setCheck('Number')
        .appendField('apuntar en dirección');
      this.setPreviousStatement(true, null);
      this.setNextStatement(true, null);
      this.setColour(COLOR_MOTION);
      this.setTooltip('Establece la orientación del objeto en grados (90=derecha, -90=izquierda, 0=arriba).');
    }
  };

  registerGen('scratch_point_dir', function (block) {
    const dir = Blockly.JavaScript.valueToCode(block, 'DIRECTION', Order.ATOMIC) || '90';
    return `runtime.pointInDirection(${dir});\n`;
  });

  // --- LOOKS ---
  Blockly.Blocks['scratch_say_for_secs'] = {
    init: function () {
      this.appendValueInput('TEXT')
        .setCheck('String')
        .appendField('decir');
      this.appendValueInput('SECS')
        .setCheck('Number')
        .appendField('durante');
      this.appendDummyInput()
        .appendField('segundos');
      this.setInputsInline(true);
      this.setPreviousStatement(true, null);
      this.setNextStatement(true, null);
      this.setColour(COLOR_LOOKS);
      this.setTooltip('Muestra un bocadillo de diálogo con el texto durante unos segundos.');
    }
  };

  registerGen('scratch_say_for_secs', function (block) {
    const text = Blockly.JavaScript.valueToCode(block, 'TEXT', Order.ATOMIC) || "''";
    const secs = Blockly.JavaScript.valueToCode(block, 'SECS', Order.ATOMIC) || '2';
    return `await runtime.say(${text}, ${secs});\n`;
  });

  Blockly.Blocks['scratch_say'] = {
    init: function () {
      this.appendValueInput('TEXT')
        .setCheck('String')
        .appendField('decir');
      this.setPreviousStatement(true, null);
      this.setNextStatement(true, null);
      this.setColour(COLOR_LOOKS);
      this.setTooltip('Muestra un bocadillo de diálogo con el texto indefinidamente.');
    }
  };

  registerGen('scratch_say', function (block) {
    const text = Blockly.JavaScript.valueToCode(block, 'TEXT', Order.ATOMIC) || "''";
    return `runtime.say(${text});\n`;
  });

  Blockly.Blocks['scratch_change_size'] = {
    init: function () {
      this.appendValueInput('CHANGE')
        .setCheck('Number')
        .appendField('cambiar tamaño por');
      this.setPreviousStatement(true, null);
      this.setNextStatement(true, null);
      this.setColour(COLOR_LOOKS);
      this.setTooltip('Aumenta o disminuye el tamaño de Tano (valores positivos agrandan, negativos reducen).');
    }
  };

  registerGen('scratch_change_size', function (block) {
    const change = Blockly.JavaScript.valueToCode(block, 'CHANGE', Order.ATOMIC) || '10';
    return `runtime.changeSize(${change});\n`;
  });

  Blockly.Blocks['scratch_set_size'] = {
    init: function () {
      this.appendValueInput('SIZE')
        .setCheck('Number')
        .appendField('fijar tamaño al');
      this.appendDummyInput()
        .appendField('%');
      this.setInputsInline(true);
      this.setPreviousStatement(true, null);
      this.setNextStatement(true, null);
      this.setColour(COLOR_LOOKS);
      this.setTooltip('Establece el tamaño de Tano en porcentaje (100% es el tamaño original).');
    }
  };

  registerGen('scratch_set_size', function (block) {
    const size = Blockly.JavaScript.valueToCode(block, 'SIZE', Order.ATOMIC) || '100';
    return `runtime.setSize(${size});\n`;
  });

  Blockly.Blocks['scratch_get_size'] = {
    init: function () {
      this.appendDummyInput()
        .appendField('tamaño');
      this.setOutput(true, 'Number');
      this.setColour(COLOR_LOOKS);
      this.setTooltip('Retorna el tamaño actual de Tano en porcentaje.');
    }
  };

  registerGen('scratch_get_size', function () {
    return ['runtime.getSize()', Order.ATOMIC];
  });

  // --- SOUND ---
  Blockly.Blocks['scratch_play_sound'] = {
    init: function () {
      this.appendValueInput('FREQ')
        .setCheck('Number')
        .appendField('🔊 tocar tono');
      this.appendValueInput('DURATION')
        .setCheck('Number')
        .appendField('Hz por');
      this.appendDummyInput()
        .appendField('seg');
      this.setInputsInline(true);
      this.setPreviousStatement(true, null);
      this.setNextStatement(true, null);
      this.setColour(COLOR_SOUND);
      this.setTooltip('Genera un tono sonoro con la frecuencia y duración especificadas.');
    }
  };

  registerGen('scratch_play_sound', function (block) {
    const freq = Blockly.JavaScript.valueToCode(block, 'FREQ', Order.ATOMIC) || '440';
    const dur = Blockly.JavaScript.valueToCode(block, 'DURATION', Order.ATOMIC) || '0.2';
    return `runtime.playTone(${freq}, ${dur});\nawait runtime.wait(${dur});\n`;
  });

  // --- CONTROL ---
  Blockly.Blocks['scratch_wait'] = {
    init: function () {
      this.appendValueInput('SECS')
        .setCheck('Number')
        .appendField('esperar');
      this.appendDummyInput()
        .appendField('segundos');
      this.setPreviousStatement(true, null);
      this.setNextStatement(true, null);
      this.setColour(COLOR_CONTROL);
      this.setTooltip('Pausa la ejecución del hilo durante los segundos indicados.');
    }
  };

  registerGen('scratch_wait', function (block) {
    const secs = Blockly.JavaScript.valueToCode(block, 'SECS', Order.ATOMIC) || '1';
    return `await runtime.wait(${secs});\n`;
  });

  Blockly.Blocks['scratch_forever'] = {
    init: function () {
      this.appendDummyInput()
        .appendField('por siempre');
      this.appendStatementInput('DO')
        .appendField('hacer');
      this.setPreviousStatement(true, null);
      this.setColour(COLOR_CONTROL);
      this.setTooltip('Ejecuta repetidamente las instrucciones contenidas.');
    }
  };

  registerGen('scratch_forever', function (block) {
    const branch = Blockly.JavaScript.statementToCode(block, 'DO');
    return `{\n  const __fId = runtime.executionId;\n  while (runtime.isRunning && runtime.executionId === __fId) {\n${branch}    await runtime.wait(0.01);\n  }\n}\n`;
  });

  Blockly.Blocks['scratch_repeat'] = {
    init: function () {
      this.appendValueInput('TIMES')
        .setCheck('Number')
        .appendField('repetir');
      this.appendDummyInput()
        .appendField('veces');
      this.appendStatementInput('DO')
        .appendField('hacer');
      this.setPreviousStatement(true, null);
      this.setNextStatement(true, null);
      this.setColour(COLOR_CONTROL);
      this.setTooltip('Repite las instrucciones el número de veces indicado.');
    }
  };

  registerGen('scratch_repeat', function (block) {
    const times = Blockly.JavaScript.valueToCode(block, 'TIMES', Order.ATOMIC) || '10';
    const branch = Blockly.JavaScript.statementToCode(block, 'DO');
    return `{\n  const __rId = runtime.executionId;\n  for (let i = 0; i < ${times} && runtime.isRunning && runtime.executionId === __rId; i++) {\n${branch}    await runtime.wait(0.01);\n  }\n}\n`;
  });
})();
