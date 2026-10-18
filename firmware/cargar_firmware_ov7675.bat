@echo off
setlocal enabledelayedexpansion
chcp 65001 >nul
title TanoScratch - Cargador de Firmware OV7675 Streamer (TinyML Shield)

echo =====================================================================
echo    TanoScratch - Cargador de Firmware OV7675 Streamer (TinyML Shield)
echo =====================================================================
echo.

REM 1. Localizar binario del firmware (.bin)
set "BIN_FILE=%~dp0Nano33BLE_OV7675_Streamer.ino.bin"
if not exist "%BIN_FILE%" (
    set "BIN_FILE=%~dp0bin\Nano33BLE_OV7675_Streamer.ino.bin"
)
if not exist "%BIN_FILE%" (
    set "BIN_FILE=%~dp0Nano33BLE_OV7675_Streamer\Nano33BLE_OV7675_Streamer.ino.bin"
)
if not exist "%BIN_FILE%" (
    echo [ERROR] No se encontro el archivo binario compilado:
    echo         Nano33BLE_OV7675_Streamer.ino.bin
    echo.
    pause
    exit /b 1
)

echo [OK] Archivo binario encontrado:
echo      %BIN_FILE%
echo.

REM 2. Localizar arduino-cli ejecutable
set "CLI_PATH="

REM Buscar en PATH
where arduino-cli >nul 2>&1
if %errorlevel% equ 0 (
    for /f "delims=" %%I in ('where arduino-cli') do (
        if not defined CLI_PATH set "CLI_PATH=%%I"
    )
)

REM Buscar en rutas conocidas de Arduino IDE 2.x y Arduino15
if not defined CLI_PATH (
    if exist "%LOCALAPPDATA%\Programs\arduino-ide\resources\app\lib\backend\resources\arduino-cli.exe" (
        set "CLI_PATH=%LOCALAPPDATA%\Programs\arduino-ide\resources\app\lib\backend\resources\arduino-cli.exe"
    )
)
if not defined CLI_PATH (
    if exist "E:\OPT\ARDUINO\Arduino IDE\resources\app\lib\backend\resources\arduino-cli.exe" (
        set "CLI_PATH=E:\OPT\ARDUINO\Arduino IDE\resources\app\lib\backend\resources\arduino-cli.exe"
    )
)
if not defined CLI_PATH (
    if exist "%LOCALAPPDATA%\Arduino15\bin\arduino-cli.exe" (
        set "CLI_PATH=%LOCALAPPDATA%\Arduino15\bin\arduino-cli.exe"
    )
)
if not defined CLI_PATH (
    if exist "%LOCALAPPDATA%\Programs\Arduino IDE\resources\app\lib\backend\resources\arduino-cli.exe" (
        set "CLI_PATH=%LOCALAPPDATA%\Programs\Arduino IDE\resources\app\lib\backend\resources\arduino-cli.exe"
    )
)
if not defined CLI_PATH (
    if exist "C:\Program Files\Arduino IDE\resources\app\lib\backend\resources\arduino-cli.exe" (
        set "CLI_PATH=C:\Program Files\Arduino IDE\resources\app\lib\backend\resources\arduino-cli.exe"
    )
)

if not defined CLI_PATH (
    echo [ERROR] No se pudo encontrar arduino-cli.exe en las rutas estandar ni en PATH.
    echo Asegurate de tener instalado Arduino IDE 2.x o arduino-cli.
    echo.
    pause
    exit /b 1
)

echo [OK] Herramienta Arduino CLI:
echo      %CLI_PATH%
echo.

REM 3. Detectar puerto COM del Arduino Nano 33 BLE
echo [*] Buscando puerto COM conectado al Arduino Nano 33 BLE Sense...
set "DETECTED_PORT="
for /f "usebackq delims=" %%P in (`powershell -NoProfile -Command "(& '%CLI_PATH%' board list --json | ConvertFrom-Json).detected_ports | Where-Object { ($_.matching_boards.name -like '*Nano 33 BLE*') -or ($_.port.properties.vid -eq '0x2341') } | Select-Object -ExpandProperty port -First 1 | Select-Object -ExpandProperty address" 2^>nul`) do (
    set "DETECTED_PORT=%%P"
)

if defined DETECTED_PORT (
    echo [OK] Placa detectada automaticamente en: %DETECTED_PORT%
    set "PORT=%DETECTED_PORT%"
) else (
    echo [!] No se detecto automaticamente el puerto.
    set /p "PORT=Introduce el puerto COM del Arduino (ejemplo COM4): "
)

if not defined PORT (
    set "PORT=COM4"
)

echo.
echo =====================================================================
echo  Destino: %PORT% ^| Placa: arduino:mbed_nano:nano33ble
echo  Firmware: Nano33BLE_OV7675_Streamer (Video Streaming USB)
echo =====================================================================
echo.
echo [IMPORTANTE ANTES DE CARGAR]:
echo Si tienes abierto el Monitor Serial o la interfaz de TanoScratch
echo conectada al puerto %PORT%, desconectala momentaneamente.
echo.
echo Presiona cualquier tecla para comenzar la grabacion del firmware...
pause >nul

echo.
echo [*] Cargando firmware de camara OV7675 al Arduino Nano 33 BLE...
echo.

"%CLI_PATH%" upload -b arduino:mbed_nano:nano33ble -p %PORT% --input-file "%BIN_FILE%" --discovery-timeout 15s -v
if %errorlevel% equ 0 goto :UPLOAD_SUCCESS
goto :UPLOAD_FAIL

:UPLOAD_SUCCESS
echo.
echo =====================================================================
echo  [EXITO] Firmware OV7675 cargado correctamente en el Arduino!
echo =====================================================================
echo  Ya puedes abrir TanoScratch, ir a la pestana Teachable Machine
echo  y pulsar 'Iniciar OV7675' para ver el video en vivo y clasificar con IA.
goto :END

:UPLOAD_FAIL
echo.
echo =====================================================================
echo  [AVISO] Hubo un problema al comunicarse con el puerto %PORT%.
echo =====================================================================
echo  Causas comunes:
echo   1. El puerto COM esta ocupado por el Monitor Serial o el navegador.
echo   2. El Arduino requiere entrar manualmente en modo Bootloader.
echo.
echo  SOLUCION FACIL Y RAPIDA:
echo   1. Cierra o desconecta el puerto COM en TanoScratch / Arduino IDE.
echo   2. Pulsa DOS veces seguidas y rapidas el boton fisico RESET del Arduino.
echo      El LED naranja parpadeara suavemente en modo Bootloader.
echo   3. Vuelve a ejecutar este archivo .bat.
echo =====================================================================
goto :END

:END
echo.
pause
