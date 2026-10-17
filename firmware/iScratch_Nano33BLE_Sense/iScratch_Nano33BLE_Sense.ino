/*
  =============================================================================
  iScratch Firmware for Arduino Nano 33 BLE Sense (Rev 1 & Rev 2 Auto-Detect)
  =============================================================================
  This firmware turns your Arduino Nano 33 BLE Sense into a high-speed telemetry
  and control peripheral for iScratch via Web Serial (browser-based).

  Auto-detects:
    - Rev 1: LSM9DS1 IMU + HTS221 Temperature/Humidity
    - Rev 2: BMI270/BMM150 IMU + HS3003 Temperature/Humidity
    - Both: LPS22HB Barometer, APDS9960 Optical, PDM Microphone, Onboard LEDs

  Serial Protocol:
    - Baud Rate: 115200
    - Output: Compact JSON telemetry frame (~20 Hz)
    - Input: JSON command packets for LED and actuators
  =============================================================================
*/

#include <Arduino.h>
#include <ArduinoJson.h>
#include "sensors_interface.h"

#include <Arduino_LPS22HB.h>
#include <Arduino_APDS9960.h>
#include <PDM.h>
#include "nrf_gpio.h"

// --- Configuration & Timing ---
unsigned long telemetryIntervalMs = 50; // 20 Hz
unsigned long lastTelemetryTime = 0;

// Sensor availability flags (failsafe auto-detection)
bool isRev2Board = false;
bool imuAvailable = false;
bool htsAvailable = false;
bool baroAvailable = false;
bool apdsAvailable = false;
bool pdmAvailable = false;

// --- Microphone (PDM) Buffer & Variables ---
static const char channels = 1;
static const int frequency = 16000;
short sampleBuffer[256];
volatile int samplesRead = 0;
volatile float soundRmsLevel = 0.0;

void onPDMdata() {
  int bytesAvailable = PDM.available();
  PDM.read(sampleBuffer, bytesAvailable);
  samplesRead = bytesAvailable / 2;

  // Compute RMS
  if (samplesRead > 0) {
    long long sumSquares = 0;
    for (int i = 0; i < samplesRead; i++) {
      sumSquares += ((long long)sampleBuffer[i] * (long long)sampleBuffer[i]);
    }
    float rms = sqrt((float)sumSquares / samplesRead);
    // Normalize roughly to 0 - 100 scale (clip to 100)
    float normalized = (rms / 300.0f);
    if (normalized > 100.0f) normalized = 100.0f;
    soundRmsLevel = normalized;
  }
}

// --- RGB LED Logic ---
// Note: Nano 33 BLE Sense onboard RGB LED is active-LOW (LOW = ON, HIGH = OFF)
void setRgbLed(uint8_t r, uint8_t g, uint8_t b) {
  #if defined(LEDR) && defined(LEDG) && defined(LEDB)
    analogWrite(LEDR, 255 - r);
    analogWrite(LEDG, 255 - g);
    analogWrite(LEDB, 255 - b);
  #endif
}

void parseSerialCommands() {
  while (Serial.available()) {
    String line = Serial.readStringUntil('\n');
    line.trim();
    if (line.length() == 0) continue;

    StaticJsonDocument<256> doc;
    DeserializationError error = deserializeJson(doc, line);
    if (error) {
      continue;
    }

    // Handle RGB LED: {"rgb": [255, 0, 0]}
    if (doc.containsKey("rgb")) {
      JsonArray rgb = doc["rgb"];
      if (rgb.size() >= 3) {
        uint8_t r = rgb[0];
        uint8_t g = rgb[1];
        uint8_t b = rgb[2];
        setRgbLed(r, g, b);
      }
    }

    // Handle Telemetry Rate: {"rate": 50}
    if (doc.containsKey("rate")) {
      unsigned long rate = doc["rate"];
      if (rate >= 10 && rate <= 1000) {
        telemetryIntervalMs = rate;
      }
    }

    // Ping / Query status
    if (doc.containsKey("ping")) {
      StaticJsonDocument<128> reply;
      reply["pong"] = 1;
      reply["board"] = isRev2Board ? "Nano33BLE_Sense_Rev2" : "Nano33BLE_Sense_Rev1";
      reply["fw"] = "TanoScratch_2.0";
      serializeJson(reply, Serial);
      Serial.println();
    }
  }
}

// --- TinyML Shield Pushbutton Driver ---
// On Arduino Nano 33 BLE / Sense, Pin 13 is shared with the built-in amber LED.
// A standard INPUT_PULLUP gets pulled down by the LED circuit to ~0.5V (logic LOW),
// making digitalRead(13) read 0 (pressed) perpetually.
// To fix this, we use the Harvard TinyML configuration:
// configure Pin 13 with output buffer driving HIGH + input buffer connected + pull-up.
// When released, the pin reads 1 (HIGH). When pressed, the button pulls it to GND (0, LOW).
void initTinyMLButton() {
  pinMode(13, OUTPUT);
  digitalWrite(13, HIGH);
  nrf_gpio_cfg(
    digitalPinToPinName(13),
    NRF_GPIO_PIN_DIR_OUTPUT,
    NRF_GPIO_PIN_INPUT_CONNECT,
    NRF_GPIO_PIN_PULLUP,
    NRF_GPIO_PIN_S0S1,
    NRF_GPIO_PIN_NOSENSE
  );
  pinMode(12, INPUT_PULLUP);
}

bool readTinyMLButton() {
  // Read D13 using direct nRF GPIO input register:
  // 0 = pressed to GND, 1 = released
  uint32_t pinName13 = digitalPinToPinName(13);
  bool p13Pressed = (nrf_gpio_pin_read(pinName13) == 0);

  // Also support D12 as alternate button pin
  bool p12Pressed = (digitalRead(12) == LOW);

  return p13Pressed || p12Pressed;
}

void setup() {
  // Initialize Serial
  Serial.begin(115200);
  delay(1000);

  #if defined(LEDR) && defined(LEDG) && defined(LEDB)
    pinMode(LEDR, OUTPUT);
    pinMode(LEDG, OUTPUT);
    pinMode(LEDB, OUTPUT);
    setRgbLed(0, 0, 0); // Turn OFF RGB LED
  #endif

  // 1 & 2. Auto-detect IMU and Temperature & Humidity (Rev 1 vs Rev 2)
  if (initRev1Sensors(imuAvailable, htsAvailable)) {
    isRev2Board = false;
  } else if (initRev2Sensors(imuAvailable, htsAvailable)) {
    isRev2Board = true;
  }

  // 3. Initialize Barometer
  if (BARO.begin()) {
    baroAvailable = true;
  }

  // 4. Initialize APDS9960 (Color, Proximity, Gesture)
  if (APDS.begin()) {
    apdsAvailable = true;
  }

  // 5. Initialize Microphone (PDM)
  PDM.onReceive(onPDMdata);
  if (PDM.begin(channels, frequency)) {
    pdmAvailable = true;
  }

  // Blink faint green RGB LED 3 times quickly to indicate boot completion
  for (int i = 0; i < 3; i++) {
    setRgbLed(0, 50, 0); // faint green
    delay(100);
    setRgbLed(0, 0, 0);
    delay(100);
  }

  // Initialize TinyML Shield Pushbutton (D13 and D12)
  initTinyMLButton();
}

void loop() {
  // 1. Handle incoming commands from iScratch Web App
  parseSerialCommands();

  // 2. Check if it's time to send telemetry
  unsigned long currentMillis = millis();
  if (currentMillis - lastTelemetryTime >= telemetryIntervalMs) {
    lastTelemetryTime = currentMillis;

    // Read IMU
    float ax = 0, ay = 0, az = 0;
    float gx = 0, gy = 0, gz = 0;
    float mx = 0, my = 0, mz = 0;
    if (imuAvailable) {
      if (!isRev2Board) {
        readImuRev1(ax, ay, az, gx, gy, gz, mx, my, mz);
      } else {
        readImuRev2(ax, ay, az, gx, gy, gz, mx, my, mz);
      }
    }

    // Read Temperature & Humidity
    float temperature = 0.0;
    float humidity = 0.0;
    bool hasTemp = false;
    bool hasHum = false;

    if (htsAvailable) {
      if (!isRev2Board) {
        readTempHumRev1(temperature, humidity);
      } else {
        readTempHumRev2(temperature, humidity);
      }
      hasTemp = true;
      hasHum = true;
    }

    // Read Barometer (LPS22HB reads in kPa, we convert to hPa: 1 kPa = 10 hPa)
    float pressureHpa = 0.0;
    if (baroAvailable) {
      pressureHpa = BARO.readPressure() * 10.0f;
      // On Nano 33 BLE Sense Lite, HTS221/HS3003 is omitted by hardware design.
      // We read ambient temperature from the LPS22HB Barometer on-chip thermometer:
      if (!hasTemp) {
        temperature = BARO.readTemperature();
        hasTemp = true;
      }
    }

    // Read Color & Proximity & Gesture
    int r = 0, g = 0, b = 0, ambient = 0;
    static int filteredProximity = 255;
    const char* gestureStr = "NONE";

    if (apdsAvailable) {
      if (APDS.proximityAvailable()) {
        int rawP = APDS.readProximity(); // 0 is closest (touching), 255 is farthest
        if (rawP >= 0 && rawP <= 255) {
          // Low-pass exponential filter to eliminate sudden spikes or alternating 0/255:
          filteredProximity = (filteredProximity * 2 + rawP) / 3;
        }
      }
      if (APDS.colorAvailable()) {
        APDS.readColor(r, g, b, ambient);
      }
      if (APDS.gestureAvailable()) {
        int gesture = APDS.readGesture();
        switch (gesture) {
          case GESTURE_UP:    gestureStr = "UP"; break;
          case GESTURE_DOWN:  gestureStr = "DOWN"; break;
          case GESTURE_LEFT:  gestureStr = "LEFT"; break;
          case GESTURE_RIGHT: gestureStr = "RIGHT"; break;
          default:            gestureStr = "NONE"; break;
        }
      }
    }

    // Prepare JSON Telemetry packet
    StaticJsonDocument<384> doc;
    if (hasTemp) {
      doc["t"] = (float)((int)(temperature * 10)) / 10.0f;
    }
    if (hasHum) {
      doc["h"] = (float)((int)(humidity * 10)) / 10.0f;
    } else {
      doc["h"] = -1; // -1 indicates physical humidity chip is not fitted (Lite board)
    }
    if (baroAvailable) {
      doc["p"] = (float)((int)(pressureHpa * 10)) / 10.0f;
    }
    if (imuAvailable) {
      doc["ax"] = (float)((int)(ax * 100)) / 100.0f;
      doc["ay"] = (float)((int)(ay * 100)) / 100.0f;
      doc["az"] = (float)((int)(az * 100)) / 100.0f;
      doc["gx"] = (float)((int)(gx * 10)) / 10.0f;
      doc["gy"] = (float)((int)(gy * 10)) / 10.0f;
      doc["gz"] = (float)((int)(gz * 10)) / 10.0f;
      doc["mx"] = (float)((int)(mx * 10)) / 10.0f;
      doc["my"] = (float)((int)(my * 10)) / 10.0f;
      doc["mz"] = (float)((int)(mz * 10)) / 10.0f;
    }
    doc["r"]  = r;
    doc["g"]  = g;
    doc["b"]  = b;
    doc["light"] = ambient;
    doc["prox"] = filteredProximity;
    if (strcmp(gestureStr, "NONE") != 0) {
      doc["gesture"] = gestureStr;
    }
    doc["sound"] = (int)soundRmsLevel;

    // Read TinyML Shield Pushbutton (D13 or D12)
    bool btnPressed = readTinyMLButton();
    doc["btn"] = btnPressed ? 1 : 0;

    // Send single line JSON
    serializeJson(doc, Serial);
    Serial.println();
  }
}
