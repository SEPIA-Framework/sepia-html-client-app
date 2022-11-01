#!/bin/sh
set -e
autoconfirm=
GRADLE_VERSION="7.4.2"
while getopts yg:h? opt; do
	case $opt in
		y) autoconfirm=1;;
		g) GRADLE_VERSION="$OPTARG";;
		?|h) printf "Usage: %s [-y] [-g gradle_version]\n" $0; exit 2;;
	esac
done
echo ""
echo "This script will download Gradle v${GRADLE_VERSION}."
if [ -z "$autoconfirm" ]; then
	read -p "Press any key to continue (CTRL+C to abort)."
fi
if [ $(command -v unzip | wc -l) -eq 0 ]; then
	echo "Please install package 'unzip' before you continue."
	exit 1
fi
#
# download
GRADLE_FILE="gradle-${GRADLE_VERSION}-bin.zip"
echo "Downloading $GRADLE_FILE ..."
if [ -f "$GRADLE_FILE" ]; then
	echo "File already exists"
else
	wget "https://services.gradle.org/distributions/${GRADLE_FILE}"
fi
GRADLE_FOLDER="gradle-${GRADLE_VERSION}"
echo "Removing old Gradle folder(s) ..."
if [ -d "gradle" ]; then
	rm -rf "gradle"
fi
if [ -d "$GRADLE_FOLDER" ]; then
	rm -rf "$GRADLE_FOLDER"
fi
unzip "$GRADLE_FILE"
mv "$GRADLE_FOLDER" "gradle"
#
# test
export GRADLE_HOME="$(realpath ./gradle)"
export PATH="${GRADLE_HOME}"/bin:"${PATH}"
gradle -v
#
# DONE
echo ""
echo "#DONE"
