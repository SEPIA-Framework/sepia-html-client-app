#!/bin/bash
# use this to convert keywords in binary format to Uint8 array
# usage: 
# - make folder next to this script and copy files to convert
# - make new folder for results with same name and add 'c', e.g. '1.5' -> '1.5c'
# - call this script with folder as argument, e.g.: bash [script.sh] 1.5
cd $1
for file in *
do
#	echo $file
	xxd -i -g 1 "$file" | sed '1d;$d' | sed '$d' > "../${1}c/$file"
done
