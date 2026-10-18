@echo off
setlocal enabledelayedexpansion
chcp 65001 >nul
title TinyML Cam - Compilar Firmware Nano 33 BLE

echo =====================================================================
echo   TinyML Cam: Compilador de Firmware (arduino-cli)
echo =====================================================================
echo.

set "CLI_PATH="
where arduino-cli >nul 2>&1
if %errorlevel% equ 0 (
    for /f "delims=" %%I in ('where arduino-cli') do (
        if not defined CLI_PATH set "CLI_PATH=%%I"
    )
)

if not defined CLI_PATH (
    if exist "%LOCALAPPDATA%\Programs\arduino-ide\resources\app\lib\backend\resources\arduino-cli.exe" (
        set "CLI_PATH=%LOCALAPPDATA%\Programs\arduino-ide\resources\app\lib\backend\resources\arduino-cli.exe"
    )
)
if not defined CLI_PATH (
    if exist "%LOCALAPPDATA%\Arduino15\bin\arduino-cli.exe" (
        set "CLI_PATH=%LOCALAPPDATA%\Arduino15\bin\arduino-cli.exe"
    )
)
if not defined CLI_PATH (
    if exist "C:\Program Files\Arduino IDE\resources\app\lib\backend\resources\arduino-cli.exe" (
        set "CLI_PATH=C:\Program Files\Arduino IDE\resources\app\lib\backend\resources\arduino-cli.exe"
    )
)

if not defined CLI_PATH (
    echo [ERROR] No se pudo encontrar arduino-cli.exe.
    echo.
    pause
    exit /b 1
)

echo [*] Utilizando compilador: %CLI_PATH%
echo [*] Compilando sketch Nano33BLE_OV7675_Streamer...
echo.

set "SKETCH_DIR=%~dp0Nano33BLE_OV7675_Streamer"
set "OUT_DIR=%~dp0bin"

if not exist "%OUT_DIR%" mkdir "%OUT_DIR%"

"%CLI_PATH%" compile -b arduino:mbed_nano:nano33ble "%SKETCH_DIR%" --output-dir "%OUT_DIR%"
if %errorlevel% equ 0 (
    echo.
    echo =====================================================================
    echo  [EXITO] Compilacion finalizada correctamente!
    echo  Archivos generados en: %OUT_DIR%
    echo =====================================================================
) else (
    echo.
    echo [ERROR] Fallo la compilacion. Revisa los mensajes anteriores.
)

echo.
pause
