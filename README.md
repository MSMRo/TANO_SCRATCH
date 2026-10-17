# TanoScratch 🦙🚀

> **Plataforma abierta basada en Scratch para Arduino Nano 33 BLE Sense y Google Teachable Machine con Tano la mascota de la UPCH y conectividad nativa Web Serial.**

---

## 📋 Tabla de Contenidos

1. [Visión General](#-visión-general)
2. [Estado del Arte: Proyectos Libres Derivados de Scratch](#-estado-del-arte-proyectos-libres-derivados-de-scratch)
3. [Arquitectura del Sistema TanoScratch](#-arquitectura-del-sistema-tanoscratch)
4. [Bloques Especializados para Arduino Nano 33 BLE Sense](#-bloques-especializados-para-arduino-nano-33-ble-sense)
5. [Bloques para Google Teachable Machine](#-bloques-para-google-teachable-machine)
6. [Firmware Especializado para Nano 33 BLE Sense](#-firmware-especializado-para-nano-33-ble-sense)
7. [Validación en Localhost](#-validación-en-localhost)
8. [Despliegue en GitHub Pages](#-despliegue-en-github-pages)
9. [Uso Alternativo como Extensión Unsandboxed en TurboWarp](#-uso-alternativo-como-extensión-unsandboxed-en-turbowarp)

---

## 🌟 Visión General

**TanoScratch** es un entorno de programación visual por bloques protagonizado por **Tano**, desarrollado para integrar hardware físico de vanguardia y modelos de Inteligencia Artificial en una interfaz moderna y accesible. Permite:

- Conectar una placa **Arduino Nano 33 BLE Sense** directamente desde el navegador web mediante **Web Serial API** (\(115200\) baudios), **sin necesidad de instalar agentes externos como Scratch Link**.
- Leer en tiempo real todos los sensores integrados en la placa:
  - **IMU 9-Ejes**: Acelerómetro (\(g\)), Giroscopio (\(^\circ/\text{s}\)) y Magnetómetro (\(\mu\text{T}\)).
  - **Sensores Ambientales**: Temperatura (\(^\circ\text{C}\)), Humedad (\(\%\)) y Presión Barométrica (\(\text{hPa}\)).
  - **Sensor Óptico APDS9960**: Color RGBC, Proximidad (\(0-255\)) y Reconocimiento de Gestos (`UP`, `DOWN`, `LEFT`, `RIGHT`).
  - **Micrófono Digital PDM**: Intensidad sonora RMS (\(0-100\%\)).
  - **Actuadores**: LED incorporado (pin D13) y LED RGB multicolor.
- Cargar modelos de visión por computadora entrenados en **Google Teachable Machine** y clasificar imágenes de la cámara web en tiempo real.
- Visualizar un **Dashboard de Telemetría en Vivo** con cubo 3D de actitud orientable, medidores tipo gauge, selector de color, VU-meter de sonido y un monitor serial interactivo.

---

## 🔍 Estado del Arte: Proyectos Libres Derivados de Scratch

Para fundamentar la concepción de **iScratch**, se analizaron los principales ecosistemas y variantes de código abierto desarrollados sobre la arquitectura de Scratch:

| Proyecto | Creador / Organización | Enfoque Principal | Mecanismo de Conexión de Hardware | Integración con IA / Machine Learning |
| :--- | :--- | :--- | :--- | :--- |
| **Scratch 3.0** | MIT Media Lab (LLK) | Educación básica estándar | Requiere *Scratch Link* (agente nativo de escritorio por WebSocket/BLE) | No nativa (bloques básicos de texto a voz y traducción) |
| **TurboWarp** | GarboMuffin | Rendimiento extremo, compilador JIT a JS, 60 FPS, extensiones personalizadas | Extensiones *Unsandboxed* con **Web Serial**, Web Bluetooth y Gamepads | Soporta extensiones comunitarias de TensorFlow.js y Teachable Machine |
| **Stretch3 / Xcratch** | Junya Ishihara / Champierre | Proyectos educativos con extensiones avanzadas | Micro:bit, LEGO, etc. | Creador del estándar **TM2Scratch**, **TMPose2Scratch** y **ML2Scratch** |
| **OpenBlock** | OpenBlock CC | Robótica y microcontroladores (Arduino, ESP32, K210) | Servidor local OpenBlock Link con puente serial y carga directa de firmware | Modelos embebidos en hardware (K210/Maixduino) |
| **Adacraft** | Nicolas Decoster / Ada | Creatividad computacional, Scratch + Python | Web Serial API directa | Teachable Machine, PoseNet y modelos de clasificación |
| **PictoBlox** | STEMpedia | Robótica educativa y STEM | Agente de comunicación serial propietario | Reconocimiento facial, visión artificial y Teachable Machine |
| **mBlock 5** | Makeblock | Robótica modular (mBot, CyberPi, Arduino) | mLink (software puente de escritorio) | Cognitive Services y Teachable Machine vía nube |

### Conclusión y Decisión de Diseño para iScratch
La dependencia tradicional de Scratch en **Scratch Link** (un software instalable de escritorio) crea fricción de usuario y problemas de compatibilidad entre sistemas operativos. **iScratch adopta el estándar de Web Serial API**, lo que permite:
1. Ejecución nativa tanto en `http://localhost` como sobre **HTTPS en GitHub Pages**.
2. Lectura directa de streams seriales USB a alta velocidad (\(115200\) baudios) con latencia mínima (\(<5\text{ ms}\)).
3. Cero instalaciones de drivers adicionales ni software puente.

---

## 🏗️ Arquitectura del Sistema iScratch

El proyecto se compone de los siguientes módulos:

```
e:\PROJECTS\IA_SCRATCH/
├── index.html                 # Aplicación web completa de iScratch
├── css/
│   ├── iscratch.css           # Estilos de interfaz Scratch 3.0 / TurboWarp
│   └── telemetry.css          # Estilos del HUD de sensores, cubo 3D y monitor serial
├── js/
│   ├── blocks_scratch_core.js # Bloques básicos de Scratch (Movimiento, Apariencia, Sonido, Control)
│   ├── blocks_nano33ble.js    # Definición y generador de bloques para Arduino Nano 33 BLE Sense
│   ├── blocks_tm.js           # Definición y generador de bloques para Teachable Machine
│   ├── webserial_manager.js   # Administrador de Web Serial API y protocolo JSON
│   ├── tm_manager.js          # Motor de inferencia TensorFlow.js / Teachable Machine
│   ├── stage_runtime.js       # Entorno de ejecución visual del escenario y gato Scratch
│   └── app.js                 # Inicialización de Blockly, telemetría y UI
├── assets/
│   ├── iscratch-logo.svg      # Logotipo vectorial de iScratch
│   └── scratch-cat.svg        # Objeto clásico Scratch Cat en vector SVG
├── vendor/                    # Librerías locales integradas para funcionamiento offline
│   ├── blockly/               # Google Blockly core + bloques + generador JS + español
│   ├── tfjs/                  # TensorFlow.js v1.3.1
│   └── teachablemachine/      # @teachablemachine/image
├── examples/                  # Proyectos de ejemplo en formato .iscratch
│   ├── 01_imu_tilt_cat.iscratch
│   ├── 02_gesture_controller.iscratch
│   ├── 03_magic_color_lamp.iscratch
│   └── 04_ai_smart_alarm.iscratch
├── extensions/                # Extensiones unsandboxed listas para TurboWarp
│   ├── iscratch-nano33ble-turbowarp.js
│   └── iscratch-tm-turbowarp.js
├── firmware/
│   └── iScratch_Nano33BLE_Sense/
│       ├── iScratch_Nano33BLE_Sense.ino  # Firmware C++ especializado
│       └── README.md
└── server.py                  # Servidor local de desarrollo en Python
```

---

## 🔴 Bloques Especializados para Arduino Nano 33 BLE Sense

La categoría **Arduino Nano 33 BLE** (color `#00878F`) ofrece los siguientes bloques:

### Conectividad
- `[🔌 conectar a Arduino Nano 33 BLE Sense a (115200) baudios]`: Inicia el diálogo de conexión Web Serial del navegador.
- `[🔌 desconectar Arduino]`: Cierra el puerto serial.
- `<¿Arduino conectado?>`: Reporter booleano de estado de la conexión.

### Sensores de Inercia (IMU 9-Ejes)
- `(📐 aceleración eje [X | Y | Z] (g))`: Lectura en tiempo real del acelerómetro.
- `(🔄 giroscopio eje [X | Y | Z] (°/s))`: Lectura de velocidad angular.
- `(🧭 campo magnético eje [X | Y | Z] (µT))`: Lectura del magnetómetro triaxial.

### Sensores Ambientales
- `(🌡️ temperatura (°C))`: Temperatura ambiental vía HTS221 / HS3003.
- `(💧 humedad (%))`: Humedad relativa ambiental.
- `(⏲️ presión barométrica (hPa))`: Presión atmosférica vía LPS22HB.

### Sensores Ópticos y Sonoros
- `(🎨 sensor de color [Rojo | Verde | Azul | Luz ambiente])`: Valores RGB y luminosidad del APDS9960.
- `(📏 proximidad (0 cerca - 255 lejos))`: Distancia de proximidad física.
- `(👋 último gesto detectado)`: Reporta `UP`, `DOWN`, `LEFT`, `RIGHT` o `NONE`.
- `(🎤 nivel de sonido micrófono (0-100))`: Nivel de intensidad sonora calculado por el micrófono PDM.

### Actuadores
- `[💡 fijar LED incorporado (D13) a [encendido | apagado]]`: Controla el LED naranja del pin 13.
- `[🌈 fijar LED RGB a R: ( ) G: ( ) B: ( )]`: Ajusta el color del LED RGB de la placa.
- `[📤 enviar texto por serial: ( )]`: Envía comandos seriales arbitrarios.

### Bloques de Eventos de Hardware
- `[👋 al detectar gesto [ARRIBA | ABAJO | IZQUIERDA | DERECHA]]`: Se activa automáticamente cuando se realiza un gesto con la mano sobre la tarjeta.

---

## 🧠 Bloques para Google Teachable Machine

La categoría **Teachable Machine** (color `#4285F4`) permite integrar visión artificial:

- `[🧠 cargar modelo Teachable Machine desde URL [ ... ]]`: Descarga el archivo `model.json` y `metadata.json` exportados desde [teachablemachine.withgoogle.com](https://teachablemachine.withgoogle.com/).
- `[📷 iniciar cámara web y clasificador continuo]`: Activa la cámara en el panel lateral e inicia la inferencia a 30 FPS.
- `[⏹️ detener cámara web y clasificador]`: Apaga la cámara y el clasificador.
- `<¿modelo IA cargado?>`: Indica si el modelo está listo para predecir.
- `(🏆 clase predicha más probable)`: Nombre de la clase ganadora.
- `(📊 confianza de predicción (%))`: Certeza de la predicción (\(0-100\%\)).
- `(confianza para clase [nombre] (%))`: Certeza de una etiqueta particular.
- `<¿clase predicha es [nombre]?>`: Condición booleana evaluada con umbral del \(65\%\).
- `[🎯 cuando la clase sea [nombre]]`: Bloque de evento que se dispara cuando la IA reconoce el objeto.

---

## ⚡ Firmware Especializado para Nano 33 BLE Sense

El archivo `firmware/iScratch_Nano33BLE_Sense/iScratch_Nano33BLE_Sense.ino` está optimizado para transmitir los datos de todos los sensores a \(20\text{ Hz}\) (\(50\text{ ms}\)) en formato JSON compacto:

```json
{"t":24.5,"h":46.2,"p":1013.2,"ax":0.02,"ay":-0.01,"az":0.98,"gx":0.1,"gy":-0.3,"gz":0.0,"mx":-15.2,"my":32.1,"mz":-44.0,"r":120,"g":85,"b":35,"light":190,"prox":255,"gesture":"NONE","sound":18}
```

### Grabación del Firmware:
1. Conecta tu **Arduino Nano 33 BLE Sense** por USB.
2. Abre el archivo en **Arduino IDE** (o compila con `arduino-cli`).
3. Selecciona la placa **Arduino Nano 33 BLE** y el puerto correspondiente (ejemplo: `COM4`).
4. Haz clic en **Subir**.

---

## 💻 Validación en Localhost

Para probar la plataforma en tu computadora:

1. Ejecuta el servidor local de desarrollo incluido:
   ```bash
   python server.py 3000
   ```
2. Tu navegador abrirá automáticamente `http://localhost:3000`.
3. Haz clic en el botón superior **🔌 Conectar Arduino** a **115200 Baud**.
4. Selecciona tu puerto (ej. `Arduino Nano 33 BLE - COM4`) en el cuadro del navegador y pulsa **Conectar**.
5. ¡Observa cómo los medidores del panel de sensores, la orientación 3D y los bloques responden en tiempo real!

---

## 🚀 Despliegue en GitHub Pages

Dado que iScratch es una aplicación web estática pura y utiliza librerías locales empaquetadas en `vendor/`, su publicación en GitHub Pages es inmediata:

1. **Inicializar el repositorio Git y hacer commit:**
   ```bash
   git init
   git add .
   git commit -m "Initial commit of iScratch with Arduino Nano 33 BLE Sense and Teachable Machine"
   ```

2. **Crear el repositorio en GitHub y subir los archivos:**
   ```bash
   git branch -M main
   git remote add origin https://github.com/<tu-usuario>/iscratch.git
   git push -u origin main
   ```

3. **Activar GitHub Pages:**
   - En tu repositorio de GitHub, dirígete a **Settings > Pages**.
   - En **Build and deployment > Source**, selecciona **Deploy from a branch**.
   - Selecciona la rama `main` y la carpeta `/ (root)`.
   - Haz clic en **Save**.

4. **Acceder a la aplicación:**
   - En aproximadamente 1 minuto, tu sitio estará disponible en:
     `https://<tu-usuario>.github.io/iscratch/`
   - **Nota sobre Web Serial**: La API Web Serial requiere un contexto seguro (`HTTPS` o `localhost`). Dado que GitHub Pages sirve automáticamente mediante HTTPS, **la conexión serial USB funcionará de forma totalmente nativa en la web pública** usando Chrome, Edge u Opera.

---

## 🧩 Uso Alternativo como Extensión Unsandboxed en TurboWarp

Si además deseas utilizar estos bloques dentro de la versión oficial de **TurboWarp** (online o desktop):

1. Abre [https://turbowarp.org/editor](https://turbowarp.org/editor).
2. Haz clic en el botón azul de **Extensiones** (esquina inferior izquierda).
3. Selecciona **Custom Extension** (Extensión personalizada).
4. Activa la casilla **Unsandboxed extension** (requerido para Web Serial y Cámara).
5. Selecciona el archivo `extensions/iscratch-nano33ble-turbowarp.js` o `extensions/iscratch-tm-turbowarp.js`.
6. ¡Los bloques de Arduino Nano 33 BLE Sense y Teachable Machine se agregarán a tu paleta de TurboWarp!
