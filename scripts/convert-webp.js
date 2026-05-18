// One-off: convert project thumbnails and botanical backgrounds to WebP.
// Run from repo root:
//   npm install --no-save sharp
//   node scripts/convert-webp.js
// Originals are kept in place; .webp siblings are written next to them.

const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

const targets = [
  'resources/images/Projects/impostorGame.png',
  'resources/images/Projects/Looptube.png',
  'resources/images/Projects/Trendalizer.png',
  'resources/images/Projects/QuickPaste/ScreenShot2.jpg',
  'resources/images/projects.png',
  'resources/images/about.png',
  'resources/images/home.png',
  'resources/images/contact2.png',
];

(async () => {
  for (const src of targets) {
    if (!fs.existsSync(src)) { console.warn(`skip (missing): ${src}`); continue; }
    const out = src.replace(/\.(png|jpg|jpeg)$/i, '.webp');
    const meta = await sharp(src).metadata();
    const longest = Math.max(meta.width, meta.height);
    let img = sharp(src);
    if (longest > 1600) {
      img = img.resize({
        width:  meta.width  >= meta.height ? 1600 : null,
        height: meta.height >  meta.width  ? 1600 : null,
        fit: 'inside',
      });
    }
    await img.webp({ quality: 82, effort: 5 }).toFile(out);
    const before = fs.statSync(src).size;
    const after  = fs.statSync(out).size;
    const pct = ((1 - after / before) * 100).toFixed(0);
    console.log(`${path.basename(src).padEnd(22)} ${(before/1024)|0} KB -> ${(after/1024)|0} KB  (-${pct}%)`);
  }
})();
