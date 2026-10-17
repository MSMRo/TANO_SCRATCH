# Firmware iScratch para Arduino Nano 33 BLE Sense

Este firmware convierte la placa **Arduino Nano 33 BLE Sense** en un dispositivo periférico de adquisición y control para **iScratch** a través de **Web Serial API** (ejecutado directamente en el navegador web moderno).

---

## Características Soportadas

- **IMU 9 Ejes**:
  - Acelerómetro triaxial (\(X, Y, Z\) en \(g\))
  - Giroscopio triaxial (\(X, Y, Z\) en \(^\circ/\text{s}\))
  - Magnetómetro triaxial (\(X, Y, Z\) en \(\mu\text{T}\))
  - *Soporta LSM9DS1 (Rev 1) y BMI270 / BMM150 (Rev 2).*
- **Sensores Ambientales**:
  - Temperatura (\(^\circ\text{C}\)) y Humedad Relativa (\(\%\)) vía HTS221 (Rev 1) o HS3003 (Rev 2)
  - Presión Barométrica (\(\text{hPa}\)) vía LPS22HB
- **Sensor Óptico APDS9960**:
  - Color RGBC (Rojo, Verde, Azul y Luz Ambiental)
  - Proximidad (\(0\) muy cerca a \(255\) lejos)
  - Reconocimiento de Gestos (`UP`, `DOWN`, `LEFT`, `RIGHT`, `NONE`)
- **Micrófono Digital PDM**:
  - Muestreo a 16 kHz vía PDM / MP34DT05/06J con cálculo RMS de volumen en tiempo real (\(0 - 100\%\)).
- **Actuadores**:
  - LED naranja incorporado en pin D13 (`{"led": 1}` o `{"led": 0}`)
  - LED RGB de la placa (`{"rgb": [R, G, B]}`) con lógica active-low corregida.

---

## Formato de Comunicación Serial (115200 Baudios)

### Telemetría enviada por el Arduino (a 20 Hz, cada 50 ms):
```json
{
  "t": 24.5,
  "h": 46.2,
  "p": 1013.2,
  "ax": 0.02,
  "ay": -0.01,
  "az": 0.98,
  "gx": 0.1,
  "gy": -0.3,
  "gz": 0.0,
  "mx": -15.2,
  "my": 32.1,
  "mz": -44.0,
  "r": 120,
  "g": 85,
  "b": 35,
  "light": 190,
  "prox": 255,
  "gesture": "NONE",
  "sound": 18
}
```

### Comandos recibidos desde iScratch:
- Control de LED D13: `{"led": 1}\n` o `{"led": 0}\n`
- Control de LED RGB: `{"rgb": [255, 0, 0]}\n` (Rojo), `{"rgb": [0, 255, 0]}\n` (Verde), etc.
- Tasa de telemetría: `{"rate": 50}\n` (milisegundos entre muestras)
- Prueba de conexión (Ping): `{"ping": 1}\n`

---

## Cómo Grabar el Firmware

### Opción 1: Un solo clic con el archivo `.bat` (Recomendado)
1. Conecta tu **Arduino Nano 33 BLE Sense** a un puerto USB de la computadora.
2. Si tienes abierto el Monitor Serial (en Arduino IDE o en TanoScratch), asegúrate de cerrarlo o desconectarlo temporalmente para no bloquear el puerto COM.
3. Haz doble clic en el archivo [`cargar_firmware.bat`](file:///e:/PROJECTS/IA_SCRATCH/firmware/cargar_firmware.bat) o [`cargar_firmware_nano33ble.bat`](file:///e:/PROJECTS/IA_SCRATCH/firmware/cargar_firmware_nano33ble.bat).
4. El script detectará automáticamente el puerto COM del Arduino y grabará el binario precompilado inmediatamente.

> **Nota:** Si la placa no responde al reinicio automático, pulsa dos veces rápidamente el botón físico **RESET** del Arduino Nano (el LED naranja parpadeará suavemente indicando modo *Bootloader*) y vuelve a ejecutar el `.bat`.

### Opción 2: Con Arduino CLI
```bash
# Grabar directamente el binario compilado
arduino-cli upload -b arduino:mbed_nano:nano33ble -p COM4 --input-file firmware/iScratch_Nano33BLE_Sense.ino.bin

# O recompilar y subir desde el código fuente
arduino-cli compile --fqbn arduino:mbed_nano:nano33ble -u -p COM4 firmware/iScratch_Nano33BLE_Sense
```

### Opción 3: Con Arduino IDE 2.x
1. Abre el archivo `iScratch_Nano33BLE_Sense.ino` en el Arduino IDE.
2. Selecciona la placa **Arduino Nano 33 BLE** en **Herramientas > Placa**.
3. Selecciona el puerto COM correspondiente (ej. `COM4`).
4. Haz clic en **Subir** (ícono de flecha).
5. Abre TanoScratch en tu navegador (Chrome o Edge) y haz clic en **Conectar Arduino** a 115200 baudios.
