'use strict';
// Dev watcher: rebuild on any src/*.jsx change. `npm run watch`.
// Debounced so a burst of saves triggers a single build. Skips the git-HEAD
// gate (--no-git) since you're actively editing; `npm run verify` is the gate.
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const SRC = path.resolve(__dirname, '..', 'src');
let timer = null;

function build() {
  try {
    execFileSync(process.execPath, [path.join(__dirname, 'build.js'), '--no-git'], {
      stdio: 'inherit',
    });
  } catch {
    /* build.js already printed the error; keep watching */
  }
}

console.log('watching src/ — Ctrl-C to stop');
build();
fs.watch(SRC, { persistent: true }, (_event, file) => {
  if (!file || !file.endsWith('.jsx')) return;
  clearTimeout(timer);
  timer = setTimeout(build, 120);
});
