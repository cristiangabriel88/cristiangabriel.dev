# Recommendations

A numbered idea-list for the portfolio site. Reference any item by its number
(e.g. "do 1.1, 3.4"). Effort tags: `S` = an afternoon, `M` = a weekend,
`L` = a real project. None of this is load-bearing — cherry-pick freely.

---

## 0. What's already here (so we don't reinvent it)

- **0.1** — Single-page React app from UMD scripts: Home / About / Projects,
  with a persistent sidebar, top nav, per-page botanical photo, and footer.
- **0.2** — **Terminal**: type `ssh` (or legacy `cg`) anywhere to toggle a
  shell. Commands: `help`, `about`, `projects`, `stack`, `contact`, `whoami`,
  `date`, `ascii`, `snake`, `forest`, `clear`, `exit`; plus undocumented `sudo`,
  `ls`, `cat .secret`.
- **0.3** — **Forest**: a lazy-loaded text adventure with save/resume.
- **0.4** — **Snake**: via the `snake` command or the **Konami code**
  (↑↑↓↓←→←→BA), which opens the terminal straight into the game.
- **0.5** — **Tweaks panel**: type `tweak` for live design controls (accent
  palette, headline scale, pixel-art toggle, walking-character toggle, leaf
  particles).
- **0.6** — Leaf particles trailing the cursor, a (currently disabled) walking
  pixel character, and a hidden unlabeled **dark-mode toggle** in the sidebar.

---

## 1. New features

- **1.1** `M` — **`projects.json` as a single source of truth.** Projects are
  described in three places (Projects page, terminal `projects` command,
  prefetch hints in `index.html`); drive all of them from one data file.
  *Why: kills drift between the terminal list and the visible page.*
- **1.2** `S` — **Deep links / shareable routes.** Back page state with the URL
  hash (`#about`, `#projects`) so sections are linkable and the back button
  works. *Why: right now every view is `/` and nothing is shareable.*
- **1.3** `M` — **Per-project detail view.** A case-study panel (problem →
  approach → result → stack → links) instead of just a card. *Why: recruiters
  skim cards but hire on stories.*
- **1.4** `S` — **"Now" / changelog line.** A one-sentence "currently building
  X" pulled from a tiny file, plus a short site changelog. *Why: signals the
  site is alive.*
- **1.5** `S` — **Contact affordance.** The terminal has `contact`, but the main
  UI relies on the sidebar mail link. Add a lightweight form (Formspree/Netlify
  Forms, no backend) or a prominent "Email me" CTA on Home.

## 2. Cool things to add

- **2.1** `M` — **Command palette (⌘/Ctrl-K).** Fuzzy-jump to pages, projects,
  theme toggle, and terminal commands. *Why: makes the whole site
  keyboard-drivable; a natural sibling to the terminal.*
- **2.2** `M` — **`forest` map / inventory polish.** An ASCII minimap, a `map`
  command, richer room descriptions. *Why: the adventure is the site's
  signature — invest where it's loved.*
- **2.3** `S` — **Terminal history + autocomplete.** ↑/↓ to recall commands, Tab
  to complete. *Why: the terminal already feels real; this makes it finished.*
- **2.4** `S` — **Theme-aware botanical art.** Swap or tint the per-page plant
  photos in dark mode so they don't glow against the dark parchment.
- **2.5** `S` — **Sound, opt-in.** A quiet typewriter tick in the terminal and a
  soft chime on Snake fruit, gated behind a toggle (default off). *Why: delight
  without ambushing anyone.*
- **2.6** `S` — **Respect `prefers-reduced-motion` + `prefers-color-scheme`.**
  Calm the particles/fades for reduced motion; seed the initial theme from the
  OS preference. *Why: accessibility and polish in one move.*

## 3. Improvements

- **3.1** `M` — **Build step for the JS.** The `.js` files are pre-compiled
  (React `createElement`, UMD CDN). Move to a small Vite/esbuild + JSX setup so
  source is editable and the `?v=` cache-busting is automated. *Why:
  hand-editing `createElement` trees is the main friction in this repo.*
- **3.2** `S` — **Self-host React.** The unpkg `<script>` tags are a third-party
  runtime dependency and an availability/privacy risk. Bundle React locally.
  *Why: the site shouldn't break if a CDN does.*
- **3.3** `S` — **Performance pass.** Lighthouse audit; lazy-load below-the-fold
  project images, confirm the `webp` + `prefetch` hints match real usage, drop
  prefetch for images that no longer exist.
- **3.4** `S` — **SEO / sharing.** Verify the OG image (`og-preview.jpg`) exists
  and renders. Add `sitemap.xml` next to the existing `robots.txt` and a JSON-LD
  `Person` block. *Why: cheap wins for how the site shows up when shared.*
- **3.5** `M` — **Accessibility sweep.** Keyboard focus states on nav and the
  brand link, `:focus-visible` outlines, contrast check on `--ink-mute` text, a
  "skip to content" link. *Why: the terminal is keyboard-first; the rest should
  match.*
- **3.6** `S` — **Consolidate the two identity/copyright spots.** A `©` year
  still lives in the sidebar footer (the page-footer one was removed). Decide on
  one treatment so they don't drift.

## 4. More hidden things (beyond the terminal)

The terminal sets a high bar — these keep the "reward the curious" spirit
without cluttering the default experience.

- **4.1** `S` — **Idle-state surprise.** After ~30s of no input, a pixel critter
  ambles across the footer, or a leaf drifts down and settles. *Why: rewards
  lingering.*
- **4.2** `S` — **Konami variants.** Add a second secret sequence (e.g. typing
  `plant` grows an ASCII sapling in the corner, or `rain` for a leaf shower).
- **4.3** `S` — **`whoami` that knows the visitor.** Riff on time of day, or
  count commands run this session ("you've typed 7 commands — curious one").
  *Why: makes the egg feel responsive, not canned.*
- **4.4** `S` — **Console message for devs.** A styled `console.log` greeting
  (with a hint about `ssh`) for anyone who opens DevTools. *Why: your audience
  is mostly developers; meet them where they snoop.*
- **4.5** `S` — **A deeper `.secret` thread.** `cat .secret` already teases the
  snake. Add `cd .secret`, a `resume`/`cv` command that prints or downloads a
  CV, and a `coffee` command that ASCII-pours a cup. *Why: extends a thread
  visitors are already pulling.*
- **4.6** `S` — **Logo long-press / triple-click.** A playful micro-interaction
  on the leaf mark (now that the whole brand is a home link): triple-click spins
  the leaf or toggles a "wireframe" inspect overlay.
- **4.7** `S` — **Seasonal touches.** Date-aware flourishes (a snowflake or two
  in December, falling petals in spring) layered on the existing particles.
- **4.8** `M` — **A second mini-game.** The Snake canvas plumbing is already
  here; a tiny "tend the garden" clicker or a Pong reskin reuses it.

---

## 5. Suggested first picks

If you only do three things: **1.2** (deep-link routes — shareable, quick),
**3.2** (self-host React — removes a real risk), and **3.1** (build step with
JSX — makes every other item dramatically easier).
