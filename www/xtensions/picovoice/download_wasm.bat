@echo off
setlocal enabledelayedexpansion
echo.
SET thispath=%~dp0
SET v15="https://sepia-framework.github.io/files/porcupine/1.5/pv_porcupine.wasm"
SET v16="https://sepia-framework.github.io/files/porcupine/1.6/pv_porcupine.wasm"
echo Downloading Porcupine keyword files for version 1.5 and 1.6 ...
echo.
powershell.exe -command "[Net.ServicePointManager]::SecurityProtocol = [System.Net.SecurityProtocolType]::Tls12; (new-object System.Net.WebClient).DownloadFile('%v15%','pv_porcupine_1.5.wasm')"
if "%errorlevel%" == "1" (
	echo Download of v1.5 failed!
) else (
	echo v1.5 OK
)
powershell.exe -command "[Net.ServicePointManager]::SecurityProtocol = [System.Net.SecurityProtocolType]::Tls12; (new-object System.Net.WebClient).DownloadFile('%v16%','pv_porcupine_1.6.wasm')"
if "%errorlevel%" == "1" (
	echo Download of v1.6 failed!
) else (
	echo v1.6 OK
)
echo.
echo Please set 'SepiaFW.wakeTriggers.porcupineVersionsDownloaded = true;'
echo in your wakeWords.js now. 
echo.
echo Have fun!
pause
exit