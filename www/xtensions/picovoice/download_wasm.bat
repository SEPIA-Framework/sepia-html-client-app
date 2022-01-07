@echo off
setlocal enabledelayedexpansion
echo.
SET thispath=%~dp0
SET v15="https://sepia-framework.github.io/files/porcupine/1.5/pv_porcupine.wasm"
SET v16="https://sepia-framework.github.io/files/porcupine/1.6/pv_porcupine.wasm"
SET v19="https://sepia-framework.github.io/files/porcupine/1.9/pv_porcupine.wasm"
SET v20en="https://sepia-framework.github.io/files/porcupine/2.0_en/pv_porcupine.wasm"
SET v20de="https://sepia-framework.github.io/files/porcupine/2.0_de/pv_porcupine.wasm"
echo Downloading Porcupine keyword files for version 1.5, 1.6, 1.9 and 2.0 (en, de) ...
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
powershell.exe -command "[Net.ServicePointManager]::SecurityProtocol = [System.Net.SecurityProtocolType]::Tls12; (new-object System.Net.WebClient).DownloadFile('%v19%','pv_porcupine_1.9.wasm')"
if "%errorlevel%" == "1" (
	echo Download of v1.9 failed!
) else (
	echo v1.9 OK
)
powershell.exe -command "[Net.ServicePointManager]::SecurityProtocol = [System.Net.SecurityProtocolType]::Tls12; (new-object System.Net.WebClient).DownloadFile('%v20en%','pv_porcupine_2.0_en.wasm')"
if "%errorlevel%" == "1" (
	echo Download of v2.0_en failed!
) else (
	echo v2.0_en OK
)
powershell.exe -command "[Net.ServicePointManager]::SecurityProtocol = [System.Net.SecurityProtocolType]::Tls12; (new-object System.Net.WebClient).DownloadFile('%v20de%','pv_porcupine_2.0_de.wasm')"
if "%errorlevel%" == "1" (
	echo Download of v2.0_de failed!
) else (
	echo v2.0_de OK
)
echo.
echo Please set 'SepiaFW.wakeTriggers.porcupineVersionsDownloaded = true;'
echo in your wakeWords.js now. 
echo.
echo Have fun!
pause
exit