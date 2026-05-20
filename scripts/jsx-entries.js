'use strict';
// The src/*.jsx -> root *.js mapping for the JSX build (rec 3.1).
// Only React component files belong here; site-content.js / sound.js /
// forest-adventure.js are plain JS and are edited directly (no JSX, no build).
module.exports.ENTRIES = [
  ['src/app.jsx', 'app.js'],
  ['src/chrome.jsx', 'chrome.js'],
  ['src/pages.jsx', 'pages.js'],
  ['src/pixel-art.jsx', 'pixel-art.js'],
  ['src/easter-eggs.jsx', 'easter-eggs.js'],
  ['src/tweaks-panel.jsx', 'tweaks-panel.compiled.js'],
];
