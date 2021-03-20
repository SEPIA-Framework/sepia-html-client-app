#!/bin/bash
set -e
v15="https://sepia-framework.github.io/files/porcupine/1.5/pv_porcupine.wasm"
v16="https://sepia-framework.github.io/files/porcupine/1.6/pv_porcupine.wasm"
v19="https://sepia-framework.github.io/files/porcupine/1.9/pv_porcupine.wasm"
echo "Downloading Porcupine keyword files for version 1.5, 1.6 and 1.9 ..."
echo
wget -O "pv_porcupine_1.5.wasm" "$v15"
wget -O "pv_porcupine_1.6.wasm" "$v16"
wget -O "pv_porcupine_1.9.wasm" "$v19"
echo "DONE"
ls -l | grep "\.wasm"
echo
echo "Please set 'SepiaFW.wakeTriggers.porcupineVersionsDownloaded = true;'"
echo "in your wakeWords.js now."
echo 
echo "Have fun!"
