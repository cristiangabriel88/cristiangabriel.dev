'use strict';
// PostToolUse hook: when a src/*.jsx file is edited/written, rebuild the root
// *.js so the generated files never go stale. Wired in .claude/settings.json.
// Reads the hook payload (JSON on stdin), runs scripts/build.js only for
// src/*.jsx edits, and reports back via systemMessage. Build output is captured
// (not echoed) so stdout stays valid JSON for the hook framework.
const path = require('path');
const { execFileSync } = require('child_process');

let input = '';
process.stdin.setEncoding('utf8');
process.stdin.on('data', (d) => (input += d));
process.stdin.on('end', () => {
  let file = '';
  try {
    file = (JSON.parse(input).tool_input || {}).file_path || '';
  } catch {
    return; // not our payload; do nothing
  }
  const norm = file.replace(/\\/g, '/');
  if (!/(^|\/)src\/[^/]+\.jsx$/.test(norm)) return; // only react to src/*.jsx

  const root = path.resolve(__dirname, '..');
  try {
    execFileSync(process.execPath, [path.join(root, 'scripts', 'build.js')], {
      cwd: root,
      stdio: ['ignore', 'pipe', 'pipe'],
    });
    process.stdout.write(JSON.stringify({
      systemMessage: 'JSX build: rebuilt root *.js from src/ (cache-busting re-stamped).',
    }));
  } catch (e) {
    const detail = String(e.stderr || e.stdout || e.message || '').trim().split('\n').slice(-3).join(' ');
    process.stdout.write(JSON.stringify({
      systemMessage: 'JSX build hook FAILED — run `npm run build` manually. ' + detail,
    }));
  }
});
