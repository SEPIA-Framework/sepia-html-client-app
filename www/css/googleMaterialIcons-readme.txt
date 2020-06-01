Fonts are not well maintained by Google!
- Get recent woff2 version from here:	https://fonts.googleapis.com/icon?family=Material+Icons
- Convert to woff e.g. with an online converter, e.g. (default settings): 	https://transfonter.org/ or https://font-converter.net/
- View new woff with e.g.:	http://torinak.com/font/lsfont.html or https://opentype.js.org
- Watch issue: 			https://github.com/google/material-design-icons/issues/786

After update:
- Get new glyph table (PostScript table) via:	https://opentype.js.org/font-inspector.html
- Remove broken ones, remove "uni..." and "u..." from entries and add new array to: googleMaterialIcons.js
