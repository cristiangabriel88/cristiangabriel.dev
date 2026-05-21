'use strict';
// JSX build (rec 3.1 + 3.2 cache-busting):
//   1. Compile src/*.jsx -> root *.js (JSX -> React.createElement).
//   2. Stamp content-hash ?v= cache-busting onto local assets in index.html.
//
// Flags:
//   --check   don't write; instead fail if any root *.js is out of sync with
//             its src (guards against hand-editing the generated files — the
//             drift that this migration fixed). Used by `npm run verify`.
//   --no-git  accepted for backwards-compat (no effect; used by the watcher).
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { toCreate, normalize } = require('./jsx-tools');
const { ENTRIES } = require('./jsx-entries');
const { writeFeed } = require('./build-feed');

const ROOT = path.resolve(__dirname, '..');
const CHECK = process.argv.includes('--check');

let failed = false;
for (const [src, out] of ENTRIES) {
  const jsx = fs.readFileSync(path.join(ROOT, src), 'utf8');
  // Always emit LF so output bytes (and the cache-bust hashes derived from them)
  // are identical regardless of the source's line endings / git autocrlf state.
  const compiled = toCreate(jsx).replace(/\r\n/g, '\n') + '\n';

  if (CHECK) {
    const onDisk = fs.readFileSync(path.join(ROOT, out), 'utf8');
    if (normalize(compiled) !== normalize(onDisk)) {
      console.error(`OUT OF SYNC ${out}: differs from src/${path.basename(src)} — run \`npm run build\``);
      failed = true;
    } else {
      console.log(`in sync ${out}`);
    }
  } else {
    fs.writeFileSync(path.join(ROOT, out), compiled);
    console.log(`built ${out}`);
  }
}
if (failed) process.exit(1);
if (CHECK) process.exit(0);

// ---- cache-busting: stamp ?v=<contenthash> on local css/js in index.html ----
const indexPath = path.join(ROOT, 'index.html');
let html = fs.readFileSync(indexPath, 'utf8');
const hash = (file) => {
  const p = path.join(ROOT, file);
  if (!fs.existsSync(p)) return null;
  return crypto.createHash('sha256').update(fs.readFileSync(p)).digest('hex').slice(0, 8);
};
// Match src="file.js?v=..." / href="file.css?v=..." for same-origin (no http) assets.
html = html.replace(/\b(src|href)="([^"?:]+\.(?:js|css))(\?v=[^"]*)?"/g, (m, attr, file) => {
  const h = hash(file);
  return h ? `${attr}="${file}?v=${h}"` : m;
});
fs.writeFileSync(indexPath, html.replace(/\r\n/g, '\n'));
console.log('stamped cache-busting hashes in index.html');

// ---- RSS feed (rec 6.7): regenerate feed.xml from the changelog ----
writeFeed();
console.log('built feed.xml');
