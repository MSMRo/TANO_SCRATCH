/*
  Nano33BLE_OV7675_Streamer
  -------------------------------------------------------------
  Firmware de Alta Velocidad para Arduino Nano 33 BLE Sense + TinyML Shield (OV7675)
  Diseñado para comunicarse con Web Serial API (Navegador Web / GitHub Pages)
  y con clientes Python / Processing para Teachable Machine.

  Optimización de FPS:
  - Inicialización directa a 5 FPS (máximo validado por el driver de Harvard)
  - Control de registro de reloj REG_CLKRC (0x11) vía I2C para alcanzar 10, 15 y 20+ FPS
  - Modos de resolución con decimación y recorte in-place
*/

#include <TinyMLShield.h>
#define HAS_TINYML_SHIELD 1
#include <Wire.h>

// LED indicador de estado
#ifndef LED_BUILTIN
#define LED_BUILTIN 13
#endif

// Configuración de resoluciones
enum ResIndex {
  RES_QQVGA = 0, // 160x120 - Fluido
  RES_QCIF  = 1, // 176x144 - Tamaño nativo TinyML Shield
  RES_QVGA  = 2, // 320x240 - Mayor resolución
  RES_96x96 = 3, // 96x96   - Tamaño estándar TinyML / MobileNet
  RES_80x60 = 4, // 80x60   - Ultra Fluidez (9.6 KB por fotograma)
  RES_64x64 = 5  // 64x64   - Ultra Rápido (8.1 KB por fotograma)
};

// Modos de velocidad de cuadros (FPS)
enum FpsSpeed {
  FPS_SAFE   = 0, // 5 FPS (Estándar de la biblioteca)
  FPS_FAST   = 1, // 10-12 FPS (Excelente fluidez)
  FPS_ULTRA  = 2  // 15-20 FPS (Máxima fluidez para resoluciones reducidas)
};

// Modos de protocolo de transmisión
enum ProtocolMode {
  MODE_PACKET = 1, // Paquetes con encabezado de sincronización (Web Serial / Python)
  MODE_RAW    = 0  // Bytes crudos directos (Compatible con Processing clásico)
};

// Magic bytes de sincronización: 0xAA, 0x55, 0xAA, 0x55
const uint8_t MAGIC_HEADER[4] = { 0xAA, 0x55, 0xAA, 0x55 };
const uint8_t MAGIC_FOOTER[2] = { 0x55, 0xAA };

// Buffer de imagen en memoria estática
#define MAX_FRAME_BYTES (320 * 240 * 2)
static uint8_t frameBuffer[MAX_FRAME_BYTES];

// Estado de la cámara
int currentRes = RES_80x60; // Por defecto 80x60 para máxima fluidez
int currentFormat = RGB565; // RGB565 o GRAYSCALE
int currentWidth = 80;
int currentHeight = 60;
int currentBytesPerPixel = 2;
int bytesPerFrame = 80 * 60 * 2;
int hwRes = QQVGA;
int currentFpsMode = FPS_ULTRA; // Por defecto Ultra FPS
bool isStreaming = true;
bool testPatternActive = false;
bool hFlip = false;
bool vFlip = false;
int protocolMode = MODE_PACKET;
uint32_t frameCounter = 0;

// Escribe un registro SCCB / I2C directamente al sensor OV7675 (dirección 0x21)
bool writeOV7675Reg(uint8_t reg, uint8_t val) {
  Wire.beginTransmission(0x21);
  Wire.write(reg);
  Wire.write(val);
  return (Wire.endTransmission() == 0);
}

// Configura el preescalador de reloj del sensor OV7675 (REG_CLKRC = 0x11)
// Fórmula de la biblioteca: clkrc = (80 / target_fps) - 1
void applySensorClock(int speedMode, int resolution) {
  uint8_t clkrc = 15; // 5 FPS por defecto

  if (resolution == RES_QVGA) {
    // Para 320x240, 5 a 8 FPS es lo más seguro para el bucle de muestreo del CPU
    clkrc = (speedMode == FPS_SAFE) ? 15 : 9;
  } else if (resolution == RES_QCIF) {
    // 176x144 soporta entre 5 y 12 FPS
    if (speedMode == FPS_SAFE) clkrc = 15;
    else if (speedMode == FPS_FAST) clkrc = 9;
    else clkrc = 6; // ~11 FPS
  } else {
    // Para resoluciones basadas en QQVGA (160x120, 96x96, 80x60, 64x64):
    // La cámara escala y reduce la tasa de PCLK automáticamente, permitiendo mayor frecuencia
    if (speedMode == FPS_SAFE) {
      clkrc = 15; // 5 FPS
    } else if (speedMode == FPS_FAST) {
      clkrc = 7;  // 10 FPS
    } else {
      clkrc = 4;  // ~16 FPS (Ultra fluido)
    }
  }

  writeOV7675Reg(0x11, clkrc);
}

// Inicializa o reconfigura la cámara OV7675
bool reinitCamera(int resIdx, int format, int speedMode = FPS_ULTRA) {
  currentRes = resIdx;
  currentFormat = format;
  currentFpsMode = speedMode;
  currentBytesPerPixel = (format == GRAYSCALE) ? 1 : 2;

  switch (resIdx) {
    case RES_80x60:
      hwRes = QQVGA;
      currentWidth = 80;
      currentHeight = 60;
      break;

    case RES_64x64:
      hwRes = QQVGA;
      currentWidth = 64;
      currentHeight = 64;
      break;

    case RES_96x96:
      hwRes = QQVGA;
      currentWidth = 96;
      currentHeight = 96;
      break;

    case RES_QQVGA:
      hwRes = QQVGA;
      currentWidth = 160;
      currentHeight = 120;
      break;

    case RES_QCIF:
      hwRes = QCIF;
      currentWidth = 176;
      currentHeight = 144;
      break;

    case RES_QVGA:
      hwRes = QVGA;
      currentWidth = 320;
      currentHeight = 240;
      break;

    default:
      return false;
  }

  bytesPerFrame = currentWidth * currentHeight * currentBytesPerPixel;

  Camera.end();
  delay(40);

  // Inicializar SIEMPRE a 5 FPS (el valor máximo válido en la biblioteca Harvard)
  // IMPORTANTE: NO pasar 30 aquí porque la biblioteca solo acepta 1 y 5, y si falla caía a 1 FPS.
  int ok = Camera.begin(hwRes, format, 5, OV7675);
  if (!ok) {
    ok = Camera.begin(hwRes, format, 1, OV7675);
  }

  if (ok) {
    // Aplicar reloj acelerado para alcanzar alta tasa de cuadros
    applySensorClock(currentFpsMode, currentRes);

    if (testPatternActive) {
      Camera.testPattern(2);
    } else {
      Camera.noTestPattern();
    }
    if (hFlip) Camera.horizontalFlip(); else Camera.noHorizontalFlip();
    if (vFlip) Camera.verticalFlip(); else Camera.noVerticalFlip();
    return true;
  }
  return false;
}

// Procesa transformaciones in-place para resoluciones reducidas
void processSubResolution() {
  if (currentRes == RES_80x60) {
    // Decimación 2x desde 160x120 a 80x60 in-place
    if (currentFormat == RGB565) {
      uint16_t* p = (uint16_t*)frameBuffer;
      int outIdx = 0;
      for (int y = 0; y < 120; y += 2) {
        int row = y * 160;
        for (int x = 0; x < 160; x += 2) {
          p[outIdx++] = p[row + x];
        }
      }
    } else {
      uint8_t* p = (uint8_t*)frameBuffer;
      int outIdx = 0;
      for (int y = 0; y < 120; y += 2) {
        int row = y * 160;
        for (int x = 0; x < 160; x += 2) {
          p[outIdx++] = p[row + x];
        }
      }
    }
  }
  else if (currentRes == RES_96x96) {
    // Recorte centrado 96x96 desde 160x120 in-place
    int startX = (160 - 96) / 2; // 32
    int startY = (120 - 96) / 2; // 12
    if (currentFormat == RGB565) {
      uint16_t* p = (uint16_t*)frameBuffer;
      int outIdx = 0;
      for (int y = 0; y < 96; y++) {
        int row = (startY + y) * 160 + startX;
        for (int x = 0; x < 96; x++) {
          p[outIdx++] = p[row + x];
        }
      }
    } else {
      uint8_t* p = (uint8_t*)frameBuffer;
      int outIdx = 0;
      for (int y = 0; y < 96; y++) {
        int row = (startY + y) * 160 + startX;
        for (int x = 0; x < 96; x++) {
          p[outIdx++] = p[row + x];
        }
      }
    }
  }
  else if (currentRes == RES_64x64) {
    // Recorte centrado 64x64 desde 160x120 in-place
    int startX = (160 - 64) / 2; // 48
    int startY = (120 - 64) / 2; // 28
    if (currentFormat == RGB565) {
      uint16_t* p = (uint16_t*)frameBuffer;
      int outIdx = 0;
      for (int y = 0; y < 64; y++) {
        int row = (startY + y) * 160 + startX;
        for (int x = 0; x < 64; x++) {
          p[outIdx++] = p[row + x];
        }
      }
    } else {
      uint8_t* p = (uint8_t*)frameBuffer;
      int outIdx = 0;
      for (int y = 0; y < 64; y++) {
        int row = (startY + y) * 160 + startX;
        for (int x = 0; x < 64; x++) {
          p[outIdx++] = p[row + x];
        }
      }
    }
  }
}

// Envía la trama con cabecera de sincronización
void sendFramePacket() {
  uint8_t header[16];
  header[0] = 0xAA;
  header[1] = 0x55;
  header[2] = 0xAA;
  header[3] = 0x55;
  header[4] = 0x01; // Frame packet
  header[5] = (uint8_t)currentRes;
  header[6] = (uint8_t)((currentWidth >> 8) & 0xFF);
  header[7] = (uint8_t)(currentWidth & 0xFF);
  header[8] = (uint8_t)((currentHeight >> 8) & 0xFF);
  header[9] = (uint8_t)(currentHeight & 0xFF);
  header[10] = (currentFormat == GRAYSCALE) ? 0x01 : 0x00;
  header[11] = (uint8_t)((bytesPerFrame >> 24) & 0xFF);
  header[12] = (uint8_t)((bytesPerFrame >> 16) & 0xFF);
  header[13] = (uint8_t)((bytesPerFrame >> 8) & 0xFF);
  header[14] = (uint8_t)(bytesPerFrame & 0xFF);

  uint8_t chk = 0;
  for (int i = 0; i < 15; i++) {
    chk += header[i];
  }
  header[15] = chk;

  Serial.write(header, 16);
  Serial.write(frameBuffer, bytesPerFrame);
  Serial.write(MAGIC_FOOTER, 2);
}

// Envía estado en formato JSON
void sendStatusJson() {
  Serial.print("{\"status\":\"ok\",\"firmware\":\"Nano33BLE_OV7675_Fast\",\"res\":");
  Serial.print(currentRes);
  Serial.print(",\"width\":");
  Serial.print(currentWidth);
  Serial.print(",\"height\":");
  Serial.print(currentHeight);
  Serial.print(",\"format\":\"");
  Serial.print((currentFormat == GRAYSCALE) ? "GRAYSCALE" : "RGB565");
  Serial.print("\",\"fps_mode\":");
  Serial.print(currentFpsMode);
  Serial.print(",\"streaming\":");
  Serial.print(isStreaming ? "true" : "false");
  Serial.print(",\"frames\":");
  Serial.print(frameCounter);
  Serial.println("}");
}

// Procesa comandos recibidos por el puerto serial
void processSerialCommands() {
  while (Serial.available()) {
    char cmd = (char)Serial.read();

    switch (cmd) {
      case 'S':
      case 's':
        isStreaming = true;
        break;

      case 'P':
      case 'p':
        isStreaming = false;
        break;

      case 'C':
      case 'c':
        Camera.readFrame(frameBuffer);
        processSubResolution();
        frameCounter++;
        if (protocolMode == MODE_PACKET) {
          sendFramePacket();
        } else {
          Serial.write(frameBuffer, bytesPerFrame);
        }
        break;

      case '1': // QQVGA (160x120)
        reinitCamera(RES_QQVGA, currentFormat, currentFpsMode);
        break;

      case '2': // QCIF (176x144)
        reinitCamera(RES_QCIF, currentFormat, currentFpsMode);
        break;

      case '3': // QVGA (320x240)
        reinitCamera(RES_QVGA, currentFormat, currentFpsMode);
        break;

      case '4': // 96x96 (TinyML Standard)
        reinitCamera(RES_96x96, currentFormat, currentFpsMode);
        break;

      case '5': // 80x60 (Ultra Fluido)
        reinitCamera(RES_80x60, currentFormat, currentFpsMode);
        break;

      case '6': // 64x64 (Micro Square)
        reinitCamera(RES_64x64, currentFormat, currentFpsMode);
        break;

      // Modos de velocidad de cuadros (FPS)
      case 'A': // Modo Seguro (5 FPS)
      case 'a':
        currentFpsMode = FPS_SAFE;
        applySensorClock(currentFpsMode, currentRes);
        break;

      case 'B': // Modo Rápido (10 FPS)
      case 'b':
        currentFpsMode = FPS_FAST;
        applySensorClock(currentFpsMode, currentRes);
        break;

      case 'F': // Modo Ultra FPS (15-20 FPS)
      case 'f':
        currentFpsMode = FPS_ULTRA;
        applySensorClock(currentFpsMode, currentRes);
        break;

      case 'G':
      case 'g':
        reinitCamera(currentRes, GRAYSCALE, currentFpsMode);
        break;

      case 'K':
      case 'k':
        reinitCamera(currentRes, RGB565, currentFpsMode);
        break;

      case 'T':
      case 't':
        testPatternActive = !testPatternActive;
        if (testPatternActive) Camera.testPattern(2); else Camera.noTestPattern();
        break;

      case 'H':
      case 'h':
        hFlip = !hFlip;
        if (hFlip) Camera.horizontalFlip(); else Camera.noHorizontalFlip();
        break;

      case 'V':
      case 'v':
        vFlip = !vFlip;
        if (vFlip) Camera.verticalFlip(); else Camera.noVerticalFlip();
        break;

      case 'M':
        protocolMode = (protocolMode == MODE_PACKET) ? MODE_RAW : MODE_PACKET;
        break;

      case '?':
      case 'I':
      case 'i':
        sendStatusJson();
        break;
    }
  }
}

void setup() {
  pinMode(LED_BUILTIN, OUTPUT);
  digitalWrite(LED_BUILTIN, LOW);

  Serial.begin(115200);
  initializeShield();

  unsigned long startWait = millis();
  while (!Serial && (millis() - startWait < 1500));

  // Iniciar en 80x60 en modo Ultra FPS para fluidez instantánea
  if (!reinitCamera(RES_80x60, RGB565, FPS_ULTRA)) {
    while (1) {
      digitalWrite(LED_BUILTIN, HIGH);
      delay(100);
      digitalWrite(LED_BUILTIN, LOW);
      delay(100);
    }
  }

  digitalWrite(LED_BUILTIN, HIGH);
}

void loop() {
  processSerialCommands();

  if (readShieldButton()) {
    isStreaming = !isStreaming;
    digitalWrite(LED_BUILTIN, isStreaming ? HIGH : LOW);
    delay(200);
  }

  if (isStreaming) {
    Camera.readFrame(frameBuffer);
    processSubResolution();
    frameCounter++;

    if (protocolMode == MODE_PACKET) {
      sendFramePacket();
    } else {
      Serial.write(frameBuffer, bytesPerFrame);
    }
  }
}
