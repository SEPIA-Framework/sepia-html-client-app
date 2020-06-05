#!/bin/bash
# arg1 e.g.: 1.5
cd $1
for file in *
do
#	echo $file
	xxd -i -g 1 "$file" | sed '1d;$d' | sed '$d' > "../${1}c/$file"
done
