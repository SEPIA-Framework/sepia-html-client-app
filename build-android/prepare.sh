#!/bin/sh
set -e
autoconfirm=
APP_PACKAGE=
BUILD_FOLDER="SepiaFW-P4-Android"
while getopts yp:h? opt; do
	case $opt in
		y) autoconfirm=1;;
		p) APP_PACKAGE="$OPTARG";;
		?|h) printf "Usage: %s [-y]\n" $0; exit 2;;
	esac
done
echo ""
echo "This script will prepare the build folder for the SEPIA Client."
#
# create build folder
if [ -d "$BUILD_FOLDER" ]; then
	echo ""
	if [ -z "$autoconfirm" ]; then
		echo "Old files will be removed!"
		read -p "Press any key to continue (CTRL+C to abort)."
	fi
	echo "Removing old project folder ..."
	rm -r "$BUILD_FOLDER"
else
	mkdir -p "$BUILD_FOLDER"
fi
#
# get config.xml and app folder
echo ""
echo "Copying data to '$BUILD_FOLDER' ..."
cp -r ../www "$BUILD_FOLDER"
cp -r plugin_mods "$BUILD_FOLDER"
cp -r resources "$BUILD_FOLDER"
cp -r hooks "$BUILD_FOLDER"
cp ../config.xml "$BUILD_FOLDER/"
cp build.sh "$BUILD_FOLDER/"
echo "Build path: $(realpath $BUILD_FOLDER)"
#
# DONE
echo ""
echo "#DONE"
echo "Next you should enter the build folder and run the build script."
