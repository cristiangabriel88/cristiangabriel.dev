'use strict';
// One-shot: regenerate src/*.jsx from the CURRENT root *.js (createElement->JSX).
// Run once to seed editable JSX sources from the live code, then verify each
// compiles back to a behaviorally identical root file before anything is swapped.
const fs = require('fs');
const path = require('path');
const { toJsx, toCreate, normalize } = require('./jsx-tools');
const { ENTRIES } = require('./jsx-entries');

const ROOT = path.resolve(__dirname, '..');
let ok = true;
for (const [src, out] of ENTRIES) {
  const original = fs.readFileSync(path.join(ROOT, out), 'utf8');
  const jsx = toJsx(original);
  // Prove the generated JSX compiles back to the same behavior as today's file.
  if (normalize(toCreate(jsx)) !== normalize(original)) {
    console.error(`FAIL ${out}: generated JSX is NOT equivalent — not writing ${src}`);
    ok = false;
    continue;
  }
  fs.writeFileSync(path.join(ROOT, src), jsx);
  console.log(`wrote ${src}  (verified equivalent to ${out})`);
}
process.exit(ok ? 0 : 1);
