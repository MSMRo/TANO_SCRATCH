/**
 * =============================================================================
 * iScratch - Teachable Machine Blocks Definition & Generator
 * =============================================================================
 * Category: Teachable Machine
 * Brand Color: #4285F4 (Google Blue)
 */

(function () {
  const TM_COLOR = '#4285F4';

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

  // 1. Cargar modelo Teachable Machine
  Blockly.Blocks['tm_load_model'] = {
    init: function () {
      this.appendValueInput('URL')
        .setCheck('String')
        .appendField('🧠 cargar modelo Teachable Machine desde URL');
      this.setPreviousStatement(true, null);
      this.setNextStatement(true, null);
      this.setColour(TM_COLOR);
      this.setTooltip('Descarga e inicializa un modelo entrenado en Google Teachable Machine.');
    }
  };

  registerGen('tm_load_model', function (block) {
    const url = Blockly.JavaScript.valueToCode(block, 'URL', Order.ATOMIC) || "''";
    return `await window.iScratchTM.loadModel(${url});\n`;
  });

  // 2. Iniciar cámara y clasificación
  Blockly.Blocks['tm_start_webcam'] = {
    init: function () {
      this.appendDummyInput()
        .appendField('📷 iniciar cámara web y clasificador continuo');
      this.setPreviousStatement(true, null);
      this.setNextStatement(true, null);
      this.setColour(TM_COLOR);
      this.setTooltip('Enciende la cámara web y comienza a predecir imágenes en tiempo real.');
    }
  };

  registerGen('tm_start_webcam', function () {
    return 'await window.iScratchTM.startWebcam(document.getElementById("tm-webcam-canvas"));\n';
  });

  // 2b. Iniciar cámara OV7675 (TinyML Shield) y clasificación
  Blockly.Blocks['tm_start_ov7675'] = {
    init: function () {
      this.appendDummyInput()
        .appendField('👁️ iniciar cámara OV7675 y clasificador continuo');
      this.setPreviousStatement(true, null);
      this.setNextStatement(true, null);
      this.setColour(TM_COLOR);
      this.setTooltip('Conecta por Web Serial con el TinyML Shield (OV7675) en el Arduino Nano 33 BLE y clasifica el video en vivo.');
    }
  };

  registerGen('tm_start_ov7675', function () {
    return 'await window.iScratchTM.startOV7675(document.getElementById("tm-webcam-canvas"));\n';
  });

  // 2c. Cambiar resolución cámara OV7675
  Blockly.Blocks['tm_set_ov7675_res'] = {
    init: function () {
      this.appendDummyInput()
        .appendField('resolución OV7675')
        .appendField(new Blockly.FieldDropdown([
          ['80x60 (Ultra Fluido ~18 FPS)', '80x60'],
          ['96x96 (Estándar TinyML)', '96x96'],
          ['160x120 (QQVGA)', '160x120'],
          ['176x144 (QCIF)', '176x144'],
          ['320x240 (QVGA)', '320x240']
        ]), 'RES');
      this.setPreviousStatement(true, null);
      this.setNextStatement(true, null);
      this.setColour(TM_COLOR);
      this.setTooltip('Configura la resolución y tasa de fotogramas de la cámara OV7675.');
    }
  };

  registerGen('tm_set_ov7675_res', function (block) {
    const res = block.getFieldValue('RES') || '80x60';
    return `window.iScratchTM.setOV7675Resolution('${res}');\n`;
  });

  // 3. Detener cámara y clasificador (Webcam u OV7675)
  Blockly.Blocks['tm_stop_camera'] = {
    init: function () {
      this.appendDummyInput()
        .appendField('⏹️ detener cámara y clasificador');
      this.setPreviousStatement(true, null);
      this.setNextStatement(true, null);
      this.setColour(TM_COLOR);
      this.setTooltip('Apaga la cámara (Webcam u OV7675) y detiene la inferencia de Teachable Machine.');
    }
  };

  registerGen('tm_stop_camera', function () {
    return 'await window.iScratchTM.stopCamera();\n';
  });

  // Alias para retrocompatibilidad
  Blockly.Blocks['tm_stop_webcam'] = Blockly.Blocks['tm_stop_camera'];
  registerGen('tm_stop_webcam', function () {
    return 'await window.iScratchTM.stopCamera();\n';
  });

  // 4. ¿Modelo cargado? (Booleano)
  Blockly.Blocks['tm_is_model_loaded'] = {
    init: function () {
      this.appendDummyInput()
        .appendField('¿modelo IA cargado?');
      this.setOutput(true, 'Boolean');
      this.setColour(TM_COLOR);
      this.setTooltip('Verdadero si el modelo de Teachable Machine está cargado en memoria.');
    }
  };

  registerGen('tm_is_model_loaded', function () {
    return ['window.iScratchTM.isLoaded', Order.ATOMIC];
  });

  // 5. Clase predicha más probable (Reporter)
  Blockly.Blocks['tm_get_top_class'] = {
    init: function () {
      this.appendDummyInput()
        .appendField('🏆 clase predicha más probable');
      this.setOutput(true, 'String');
      this.setColour(TM_COLOR);
      this.setTooltip('Retorna el nombre de la clase con mayor probabilidad actual.');
    }
  };

  registerGen('tm_get_top_class', function () {
    return ['(window.iScratchTM.topClass || "")', Order.ATOMIC];
  });

  // 6. Confianza de predicción (%) (Reporter)
  Blockly.Blocks['tm_get_top_confidence'] = {
    init: function () {
      this.appendDummyInput()
        .appendField('📊 confianza de predicción (%)');
      this.setOutput(true, 'Number');
      this.setColour(TM_COLOR);
      this.setTooltip('Retorna el porcentaje de certeza (0-100%) de la clase ganadora.');
    }
  };

  registerGen('tm_get_top_confidence', function () {
    return ['(window.iScratchTM.topConfidence || 0)', Order.ATOMIC];
  });

  // 7. Confianza para una clase específica (%) (Reporter)
  Blockly.Blocks['tm_get_class_confidence'] = {
    init: function () {
      this.appendValueInput('CLASS_NAME')
        .setCheck('String')
        .appendField('confianza para clase');
      this.appendDummyInput()
        .appendField('(%)');
      this.setOutput(true, 'Number');
      this.setColour(TM_COLOR);
      this.setTooltip('Retorna la probabilidad de una clase específica en porcentaje (0-100%).');
    }
  };

  registerGen('tm_get_class_confidence', function (block) {
    const className = Blockly.JavaScript.valueToCode(block, 'CLASS_NAME', Order.ATOMIC) || "''";
    return [`window.iScratchTM.getConfidence(${className})`, Order.ATOMIC];
  });

  // 8. ¿Es la clase predicha X? (Booleano)
  Blockly.Blocks['tm_is_class'] = {
    init: function () {
      this.appendValueInput('CLASS_NAME')
        .setCheck('String')
        .appendField('¿clase predicha es');
      this.appendDummyInput()
        .appendField('?');
      this.setOutput(true, 'Boolean');
      this.setColour(TM_COLOR);
      this.setTooltip('Verdadero si la clase ganadora coincide con el texto indicado con confianza superior al 65%.');
    }
  };

  registerGen('tm_is_class', function (block) {
    const className = Blockly.JavaScript.valueToCode(block, 'CLASS_NAME', Order.ATOMIC) || "''";
    return [
      `((window.iScratchTM.topClass || "").toLowerCase() === String(${className}).toLowerCase().trim() && window.iScratchTM.topConfidence > 65)`,
      Order.ATOMIC
    ];
  });

  // 9. Evento: Cuando la clase sea X
  Blockly.Blocks['tm_when_class'] = {
    init: function () {
      this.appendValueInput('CLASS_NAME')
        .setCheck('String')
        .appendField('🎯 cuando la clase sea');
      this.appendStatementInput('DO')
        .appendField('hacer');
      this.setColour(TM_COLOR);
      this.setTooltip('Dispara las instrucciones cuando se detecta la clase especificada por la cámara.');
    }
  };

  registerGen('tm_when_class', function (block) {
    const className = Blockly.JavaScript.valueToCode(block, 'CLASS_NAME', Order.ATOMIC) || "'Clase 1'";
    const branch = Blockly.JavaScript.statementToCode(block, 'DO');
    return `
      window.iScratchRuntime.registerEventListener('tm_' + String(${className}).toLowerCase().trim(), async () => {
        ${branch}
      });\n`;
  });
})();
