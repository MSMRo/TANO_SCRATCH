/**
 * =============================================================================
 * TanoScratch - Timer & Stopwatch Blocks (Temporizadores)
 * =============================================================================
 * Implements interval timers, timeout events, and Scratch-standard stopwatch.
 */

(function () {
  const TIMER_COLOR = '#00B4D8';

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

  // 1. Hat Block: Cada (N) segundos hacer
  Blockly.Blocks['timer_every'] = {
    init: function () {
      this.appendValueInput('INTERVAL')
        .setCheck('Number')
        .appendField('⏰ cada');
      this.appendDummyInput()
        .appendField('segundos');
      this.appendStatementInput('DO')
        .appendField('hacer');
      this.setColour(TIMER_COLOR);
      this.setTooltip('Ejecuta repetidamente las instrucciones cada cierto intervalo de segundos de forma independiente sin bloquear otros bloques.');
    }
  };

  registerGen('timer_every', function (block) {
    const interval = Blockly.JavaScript.valueToCode(block, 'INTERVAL', Order.ATOMIC) || '1';
    const branch = Blockly.JavaScript.statementToCode(block, 'DO');
    return `
      runtime.registerTimerInterval(${interval}, async () => {
        ${branch}
      });\n`;
  });

  // 2. Hat Block: Después de (N) segundos hacer
  Blockly.Blocks['timer_after'] = {
    init: function () {
      this.appendValueInput('SECS')
        .setCheck('Number')
        .appendField('⏳ después de');
      this.appendDummyInput()
        .appendField('segundos');
      this.appendStatementInput('DO')
        .appendField('hacer');
      this.setColour(TIMER_COLOR);
      this.setTooltip('Ejecuta las instrucciones una sola vez tras transcurrir los segundos especificados desde que inicia el programa.');
    }
  };

  registerGen('timer_after', function (block) {
    const secs = Blockly.JavaScript.valueToCode(block, 'SECS', Order.ATOMIC) || '2';
    const branch = Blockly.JavaScript.statementToCode(block, 'DO');
    return `
      runtime.registerTimerTimeout(${secs}, async () => {
        ${branch}
      });\n`;
  });

  // 3. Hat Block: Al cronómetro > (N) segundos
  Blockly.Blocks['timer_when_greater'] = {
    init: function () {
      this.appendValueInput('THRESHOLD')
        .setCheck('Number')
        .appendField('⏱️ al cronómetro >');
      this.appendDummyInput()
        .appendField('segundos');
      this.appendStatementInput('DO')
        .appendField('hacer');
      this.setColour(TIMER_COLOR);
      this.setTooltip('Se activa cuando el cronómetro supera el tiempo indicado.');
    }
  };

  registerGen('timer_when_greater', function (block) {
    const threshold = Blockly.JavaScript.valueToCode(block, 'THRESHOLD', Order.ATOMIC) || '5';
    const branch = Blockly.JavaScript.statementToCode(block, 'DO');
    return `
      runtime.registerTimerThreshold(${threshold}, async () => {
        ${branch}
      });\n`;
  });

  // 4. Statement Block: Reiniciar cronómetro
  Blockly.Blocks['timer_reset'] = {
    init: function () {
      this.appendDummyInput()
        .appendField('⏱️ reiniciar cronómetro');
      this.setPreviousStatement(true, null);
      this.setNextStatement(true, null);
      this.setColour(TIMER_COLOR);
      this.setTooltip('Restablece el valor del cronómetro a 0 segundos.');
    }
  };

  registerGen('timer_reset', function () {
    return 'runtime.resetTimer();\n';
  });

  // 5. Reporter Block: Cronómetro (segundos)
  Blockly.Blocks['timer_get'] = {
    init: function () {
      this.appendDummyInput()
        .appendField('⏱️ cronómetro');
      this.setOutput(true, 'Number');
      this.setColour(TIMER_COLOR);
      this.setTooltip('Retorna el valor actual del cronómetro en segundos con decimales.');
    }
  };

  registerGen('timer_get', function () {
    return ['runtime.getTimer()', Order.ATOMIC];
  });

  // 6. Statement Block: Esperar (N) segundos
  Blockly.Blocks['timer_wait'] = {
    init: function () {
      this.appendValueInput('SECS')
        .setCheck('Number')
        .appendField('⏱️ esperar');
      this.appendDummyInput()
        .appendField('segundos');
      this.setPreviousStatement(true, null);
      this.setNextStatement(true, null);
      this.setColour(TIMER_COLOR);
      this.setTooltip('Pausa la ejecución de este hilo durante los segundos indicados.');
    }
  };

  registerGen('timer_wait', function (block) {
    const secs = Blockly.JavaScript.valueToCode(block, 'SECS', Order.ATOMIC) || '1';
    return `await runtime.wait(${secs});\n`;
  });
})();
