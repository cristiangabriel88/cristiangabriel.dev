'use strict';
// Generates the 1200x630 branded social/WhatsApp share card.
//   node scripts/make-og-card.js  ->  resources/images/og-card.png
// Text is laid out glyph-by-glyph into vector paths (Fraunces for the name,
// Inter for the rest) so rendering never depends on system-installed fonts.
// Palette + leaf mark are lifted from styles.css / favicon.svg.
const fs = require('fs');
const path = require('path');
const opentype = require('opentype.js');
const sharp = require('sharp');

const ROOT = path.resolve(__dirname, '..');
const W = 1200, H = 630;

// ---- brand palette (from styles.css) ----
const C = {
  parchment: '#FAF7F2',
  parchment2: '#F2EDE2',
  ink: '#1A1A1A',
  inkSoft: '#4A4A4A',
  forest: '#2D5016',
  moss: '#7AA355',
  mossSoft: '#B5DFAA',
};

// ---- fonts ----
function load(file) {
  const b = fs.readFileSync(path.join(__dirname, 'fonts', file));
  return opentype.parse(b.buffer.slice(b.byteOffset, b.byteOffset + b.byteLength));
}
const fraunces = load('Fraunces.ttf');
const interSemi = load('Inter-600.ttf');
const interReg = load('Inter-400.ttf');

// Manual glyph layout -> single SVG path `d`. Avoids opentype getPath()'s GSUB
// pass (Inter's GSUB trips opentype.js) and gives us letter-spacing control.
function textPath(font, text, sizePx, x, yBaseline, { letterSpacing = 0, kern = true } = {}) {
  const scale = sizePx / font.unitsPerEm;
  let penX = x;
  let d = '';
  let prev = null;
  for (const ch of text) {
    const glyph = font.charToGlyph(ch);
    if (kern && prev) penX += (font.getKerningValue(prev, glyph) || 0) * scale;
    d += glyph.getPath(penX, yBaseline, sizePx).toPathData(2) + ' ';
    penX += glyph.advanceWidth * scale + letterSpacing;
    prev = glyph;
  }
  return { d: d.trim(), width: penX - x - letterSpacing };
}

// ---- leaf mark (from favicon.svg, 32x32 coordinate space) ----
const LEAF = {
  stem: 'M 16 29 C 16 23 15 19 14.5 15',
  primary: 'M 14.5 15 C 3.5 11.5 2.5 4 5 1.5 C 15 3 18.5 9.5 14.5 15 Z',
  secondary: 'M 16 20 C 25.5 17.5 29 11 28 5.5 C 19 7 15 14.5 16 20 Z',
};
function leafMark(tx, ty, scale, fill) {
  return `<g transform="translate(${tx} ${ty}) scale(${scale})" stroke-linecap="round" stroke-linejoin="round">
    <path d="${LEAF.stem}" stroke="${fill}" stroke-width="${1.6}" fill="none"/>
    <path d="${LEAF.primary}" fill="${fill}"/>
    <path d="${LEAF.secondary}" stroke="${fill}" stroke-width="${1.5}" fill="none"/>
    <circle cx="16" cy="29" r="1.3" fill="${fill}"/>
  </g>`;
}

// ---- layout ----
const PAD = 96;
const name = textPath(fraunces, 'Cristian Gabriel', 104, PAD, 330);
const tagline = textPath(interReg, 'Full-stack developer · Bucharest', 40, PAD, 410);
const url = textPath(interSemi, 'cristiangabriel.dev', 28, PAD, 560, { letterSpacing: 2 });

const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
  <rect width="${W}" height="${H}" fill="${C.parchment}"/>
  <!-- faint oversized leaf watermark, bleeding off the right edge -->
  <g opacity="0.16">${leafMark(W - 250, 70, 17, C.moss)}</g>
  <!-- left brand spine -->
  <rect x="0" y="0" width="12" height="${H}" fill="${C.forest}"/>
  <!-- logo leaf -->
  ${leafMark(PAD, 96, 3.4, C.forest)}
  <!-- name -->
  <path d="${name.d}" fill="${C.ink}"/>
  <!-- accent rule under the name -->
  <rect x="${PAD}" y="356" width="120" height="4" rx="2" fill="${C.forest}"/>
  <!-- tagline -->
  <path d="${tagline.d}" fill="${C.inkSoft}"/>
  <!-- url -->
  <path d="${url.d}" fill="${C.forest}"/>
</svg>`;

const outPng = path.join(ROOT, 'resources', 'images', 'og-card.png');
sharp(Buffer.from(svg))
  .png({ quality: 90 })
  .toFile(outPng)
  .then((info) => console.log(`wrote ${path.relative(ROOT, outPng)} (${info.width}x${info.height}, ${Math.round(info.size / 1024)}KB)`))
  .catch((e) => { console.error(e); process.exit(1); });
