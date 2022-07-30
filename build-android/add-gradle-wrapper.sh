#!/bin/bash
BUILD_FOLDER="SepiaFW-P4-Android"
GRADLE_WRAPPER="7.4.2"
if [ -d "./gradle" ]; then
	export GRADLE_HOME="$(realpath ./gradle)"
	export PATH="${GRADLE_HOME}"/bin:"${PATH}"
	echo ""
	echo "Adding Gradle wrapper v${GRADLE_WRAPPER} ..."
	cd "$BUILD_FOLDER/platforms/android"
	gradle wrapper --gradle-version "$GRADLE_WRAPPER"
else
	echo ""
	echo "Gradle not found"
fi
