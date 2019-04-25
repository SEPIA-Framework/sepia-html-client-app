#!/usr/bin/env node

'use strict';

const fs = require('fs');
const _ = require('lodash');
const xml2js = require('xml2js');

// here add/remove permissions you need for Android app
let permissions = [
  'com.android.alarm.permission.SET_ALARM'
];

module.exports = function (context) {
  const parseString = xml2js.parseString;
  const builder = new xml2js.Builder();
  const manifestPath = context.opts.projectRoot + '/platforms/android/AndroidManifest.xml';
  const androidManifest = fs.readFileSync(manifestPath).toString();

  let manifestRoot,
    missedPermissions;

  if (androidManifest && permissions.length > 0) {
    parseString(androidManifest, (err, manifest) => {
      if (err) return console.error(err);

      manifestRoot = manifest['manifest'];

      if (!manifestRoot['uses-permission']) {
        manifestRoot['uses-permission'] = [];
      }

      missedPermissions = _.difference(permissions, _.map(manifestRoot['uses-permission'], `$['android:name']`));

      if (missedPermissions.length > 0) {
        missedPermissions.forEach(perm => manifestRoot['uses-permission'].push({'$': {'android:name': perm}}));

        fs.writeFileSync(manifestPath, builder.buildObject(manifest));

        console.log(`Added ${missedPermissions.length} permissions:`);
        missedPermissions.forEach(perm => console.log(` - ${perm}`));
      }
    });
  }
};
