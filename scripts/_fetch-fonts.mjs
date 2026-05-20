// One-shot helper: turn the Google Fonts CSS into self-hosted woff2 + a local
// fonts.css. Keeps only the latin / latin-ext subsets. Safe to delete after run.
import { writeFileSync, mkdirSync } from "node:fs";
import { join } from "node:path";

// The exact Google Fonts request the site used before self-hosting. Edit this
// if the type ramp (families / weights / axes) changes, then re-run.
const GF_URL =
  "https://fonts.googleapis.com/css2?family=Fraunces:ital,opsz,wght,SOFT,WONK@0,9..144,300..600,30..100,0..1;1,9..144,300..600,30..100,0..1&family=Inter:wght@300;400;500;600&family=VT323&display=swap";

// A modern browser UA makes Google serve woff2 (older UAs get ttf).
const css = await (
  await fetch(GF_URL, {
    headers: {
      "User-Agent":
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36",
    },
  })
).text();

const outDir = join(process.cwd(), "vendor", "fonts");
mkdirSync(outDir, { recursive: true });

// Match: /* subset */ @font-face { ... }
const re = /\/\*\s*([\w-]+)\s*\*\/\s*@font-face\s*\{([^}]*)\}/g;
const KEEP = new Set(["latin", "latin-ext"]);
const urlToName = new Map();
const faces = [];

let m;
while ((m = re.exec(css))) {
  const subset = m[1];
  if (!KEEP.has(subset)) continue;
  const body = m[2];
  const family = (body.match(/font-family:\s*'([^']+)'/) || [])[1];
  const style = (body.match(/font-style:\s*([^;]+);/) || [])[1].trim();
  const weight = (body.match(/font-weight:\s*([^;]+);/) || [])[1].trim();
  const url = (body.match(/url\(([^)]+)\)/) || [])[1];
  const range = (body.match(/unicode-range:\s*([^;]+);/) || [])[1].trim();

  if (!urlToName.has(url)) {
    const w = weight.replace(/\s+/g, "-");
    const name = `${family.toLowerCase()}-${style}-${w}-${subset}.woff2`;
    urlToName.set(url, name);
  }
  faces.push({ family, style, weight, range, local: urlToName.get(url) });
}

// Download every unique file.
for (const [url, name] of urlToName) {
  const res = await fetch(url, {
    headers: { "User-Agent": "Mozilla/5.0" },
  });
  const buf = Buffer.from(await res.arrayBuffer());
  writeFileSync(join(outDir, name), buf);
  console.log(`downloaded ${name}  (${buf.length} bytes)`);
}

// Emit fonts.css mirroring the original faces, pointing at local files.
const out = [
  "/* Self-hosted Google Fonts (latin + latin-ext subsets only).",
  "   Generated from the Google Fonts CSS — no CDN dependency at runtime,",
  "   matching the self-hosted React in vendor/. Regenerate with",
  "   scripts/_fetch-fonts.mjs if the type ramp changes. */",
  "",
];
for (const f of faces) {
  out.push("@font-face {");
  out.push(`  font-family: '${f.family}';`);
  out.push(`  font-style: ${f.style};`);
  out.push(`  font-weight: ${f.weight};`);
  out.push("  font-display: swap;");
  out.push(`  src: url(${f.local}) format('woff2');`);
  out.push(`  unicode-range: ${f.range};`);
  out.push("}");
}
writeFileSync(join(outDir, "fonts.css"), out.join("\n") + "\n");
console.log(`\nwrote vendor/fonts/fonts.css with ${faces.length} faces, ${urlToName.size} files`);
