# CLAUDE.md — project workflow

## ⚠️ After EVERY code change: run `npm run build`

The site has a build step. The **editable source** is `src/*.jsx`; the **served files**
are the root `*.js` (`app.js`, `chrome.js`, `pages.js`, `pixel-art.js`, `easter-eggs.js`,
`tweaks-panel.compiled.js`), which are **generated**.

So after changing any component code:

```
npm run build
```

This (1) recompiles `src/*.jsx` → root `*.js` and (2) re-stamps the `?v=` cache-busting
hashes in `index.html`. **The deployed site reads the root `*.js`, not `src/`** — if you
skip the build, your edits won't show up live.

- **Never hand-edit the root `*.js`** — they're overwritten by the build. Edit `src/*.jsx`.
- `npm run watch` — auto-rebuild on save while developing.
- `npm run verify` — fails if any root `*.js` is out of sync with its source.
- Plain-JS files are NOT part of the build and ARE edited directly:
  `site-content.js`, `sound.js`, `forest-adventure.js`.
- **Auto-build hook (local):** `.claude/settings.json` runs `.claude/build-on-jsx.js`
  after any `src/*.jsx` edit, so Claude Code sessions rebuild automatically. This is
  local-only (gitignored) and only fires inside Claude Code — if you edit `src/*.jsx`
  by hand in another editor, you still run `npm run build` yourself.
- Line endings are pinned to LF via `.gitattributes`; the build also forces LF output,
  so rebuilds are byte-stable and don't churn cache-busting hashes.

## Deploy

Static site, deployed by **drag-and-drop of this folder onto Netlify** — Netlify runs
no build and installs nothing. Therefore the build must be run **locally first** (see
above) so the root `*.js` are current before dragging.

The live site only needs: `index.html`, root `*.js`, `vendor/`, `*.css`, `resources/`,
`favicon.svg`, `robots.txt`, `sitemap.xml`, and the project subfolders. `node_modules/`,
`src/`, and `scripts/` are not used at runtime (fine to upload, just larger).

## Domain & sharing

- Canonical domain: **https://cristiangabriel.dev/** (custom domain on Netlify). All
  absolute URLs (canonical, OG/Twitter, JSON-LD, sitemap, robots) point here.
- React is self-hosted in `vendor/` (no CDN).
- Social/WhatsApp share card: `resources/images/og-card.png` — regenerate with
  `npm run card` (edit `scripts/make-og-card.js`). After changing it, re-scrape via
  Facebook's Sharing Debugger to bust the WhatsApp/social preview cache.
