module.exports = function (context) {
    const fs = require('fs');
    const _ = require('lodash');

    const scheme = 'flowkey';
    const insertIntent = `
    <intent-filter>
		<action android:name="android.intent.action.ASSIST" />
		<category android:name="android.intent.category.DEFAULT" />
	</intent-filter>
	<intent-filter>
		<action android:name="android.intent.action.VOICE_COMMAND" />
		<category android:name="android.intent.category.DEFAULT" />
	</intent-filter>
    `;
    let manifestPath = context.opts.projectRoot + '/platforms/android/AndroidManifest.xml';
	if (!fs.existsSync(manifestPath)){
		//new path
		manifestPath = context.opts.projectRoot + '/platforms/android/app/src/main/AndroidManifest.xml';
	}
    const androidManifest = fs.readFileSync(manifestPath).toString();
    if (!androidManifest.includes(`android:scheme="${scheme}"`)) {
        const manifestLines = androidManifest.split(/\r?\n/);
        const lineNo = _.findIndex(manifestLines, (line) => line.includes('@string/activity_name'));
        manifestLines.splice(lineNo + 1, 0, insertIntent);
        fs.writeFileSync(manifestPath, manifestLines.join('\n'));
    }
};
