'use strict';
// Proves a root .js file can become JSX and compile back to the SAME thing.
//   node scripts/jsx-roundtrip-test.js app.js
// Reads the file, converts createElement->JSX, compiles JSX->createElement,
// then compares normalized(original) vs normalized(roundtrip). Exit 0 = identical.
const fs = require('fs');
const path = require('path');
const { toJsx, toCreate, normalize } = require('./jsx-tools');

const file = process.argv[2];
if (!file) { console.error('usage: node scripts/jsx-roundtrip-test.js <file.js>'); process.exit(2); }

const ROOT = path.resolve(__dirname, '..');
const original = fs.readFileSync(path.join(ROOT, file), 'utf8');

const jsx = toJsx(original);
const back = toCreate(jsx);

const a = normalize(original);
const b = normalize(back);

if (a === b) {
  console.log(`OK  ${file}: round-trip is behaviorally identical`);
  process.exit(0);
}

// Show the first divergence to make debugging easy.
const la = a.split('\n'), lb = b.split('\n');
for (let i = 0; i < Math.max(la.length, lb.length); i++) {
  if (la[i] !== lb[i]) {
    console.error(`DIFF ${file} at normalized line ${i + 1}:`);
    console.error('  original : ' + JSON.stringify(la[i]));
    console.error('  roundtrip: ' + JSON.stringify(lb[i]));
    break;
  }
}
// Also dump the generated JSX near nothing—just fail.
process.exit(1);
