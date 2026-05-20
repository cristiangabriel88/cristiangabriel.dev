// ─────────────────────────────────────────────────────────────
// Editable site content surfaced through the terminal.
// `now`       → SITE_CONTENT.now (one sentence on current focus)
// `changelog` → SITE_CONTENT.changelog (most recent first)
// No build step, no logic. Just edit the strings below.
// ─────────────────────────────────────────────────────────────
window.SITE_CONTENT = {
  now: 'Currently polishing this portfolio and tinkering with the forest text-adventure. Type `forest` to play.',
  changelog: [
    { date: '2026-05-20', text: 'The whole top-left brand is now a single home link.' },
    { date: '2026-05-19', text: 'Added dark mode, the tweaks panel, and the ssh terminal.' },
    { date: '2026-05-01', text: 'Rebuilt the site on a parchment + forest design.' }
  ]
};
