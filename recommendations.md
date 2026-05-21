# Recommendations

A numbered idea-list for the portfolio site. Reference any item by its number
(e.g. "do 2.3, 4.1"). Effort tags: `S` = an afternoon, `M` = a weekend,
`L` = a real project. None of this is load-bearing, cherry-pick freely.

The guiding taste for the whole site: _quiet, green, occasionally pixelated._
Parchment and forest. Reward the curious without ambushing anyone. Every idea
below should pass the "does this stay calm?" test before it ships.

---

## 0. What's already here (so we don't reinvent it)

Updated to reflect what actually shipped since the first draft of this file.

- **0.1** - Single-page React app, now built from `src/*.jsx` via a local
  esbuild step (`npm run build`) and self-hosted React in `vendor/`. Home /
  About / Projects, persistent sidebar, top nav, per-page botanical art, footer.
- **0.2** - **Deep-link routes.** Page state is backed by the URL hash
  (`#about`, `#projects`), so views are shareable and the back button works.
- **0.3** - **Terminal**: type `ssh` (or legacy `cg`) anywhere to toggle a
  shell. Commands: `help`, `about`, `projects`, `stack`, `contact`, `whoami`,
  `date`, `ascii`, `snake`, `forest`, `clear`, `exit`; plus undocumented `sudo`,
  `ls`, `cat .secret`. Has **command history** (up/down), **Tab autocomplete**,
  and **ghost-text suggestions** (right-arrow to accept).
- **0.4** - **Forest**: a lazy-loaded text adventure with save/resume, its own
  title menu, and Tab-completion of in-game verbs.
- **0.5** - **Snake**: via the `snake` command or the **Konami code**
  (up up down down left right left right B A), which opens the terminal straight
  into the game.
- **0.6** - **Tweaks panel**: type `tweak` for live design controls (accent
  palette, headline scale, pixel-art toggle, walking-character toggle, leaf
  particles).
- **0.7** - **Idle botanicals**: after a stretch of no activity, pixel plants
  grow along the footer. Leaf particles trail the cursor. There is a hidden,
  unlabeled **dark-mode toggle** in the sidebar.
- **0.8** - **Content surfaces**: `site-content.js` holds `now` and `changelog`
  strings (no build step), ready to be wired to terminal commands or the UI.
- **0.9** - **SEO/sharing baseline**: `sitemap.xml`, `robots.txt`, JSON-LD
  `Person` block, OG card (`npm run card`), canonical domain
  `cristiangabriel.dev`. Reduced-motion is respected in several places.

---

## 1. The "off the clock" section (camping, the van, bike rides)

Your main ask: a short passions section at the end of **About**, in a way that
is humble, not opulent, not braggy, and that fits the parchment-and-forest mood.
Good news: camping, van trips, and cycling are _exactly_ on-theme. The site is
already about quiet, green, and being a little offline. This belongs.

The trick to "not braggy" is restraint: small, plain language, no gear flexing,
no scenic-influencer photos, no "adventurer" branding. Frame it as _how you
recharge and how you think_, not _look where I've been_.

### 1.1 Where it lives

- **1.1.1** `S` - **End of About, after the timeline.** A new section labeled
  the same way the others are (`section-label` with an `<em>` word). It reads as
  the natural human coda after the professional timeline.
- **1.1.2** `S` - **Terminal-native companion.** Add an `outside` (or `afk`)
  command that prints the same three lines in the shell. This honors the
  "route new content through the terminal" instinct and rewards anyone poking
  around. Can ship instead of, or alongside, the on-page version.

### 1.2 Heading options (pick one)

- **1.2.1** - `Away from the keyboard`
- **1.2.2** - `Off the clock`
- **1.2.3** - `When the laptop closes`
- **1.2.4** - `Outside the terminal` (nice wink at the site's gimmick)
- **1.2.5** - `Field notes`
- **1.2.6** - `afk` (lowercase, dev-humble, sits well next to a terminal site)
- **1.2.7** - `Somewhere with worse Wi-Fi`

### 1.3 Copy drafts (short, plain, swap freely)

- **1.3.1** - **Intro line:** "When I'm not at a keyboard I'm usually somewhere
  with worse signal. A lot of what I like about building software (quiet focus,
  small repairs, figuring out how a system fits together) I also like away from
  the screen."
- **1.3.2** - **Camping:** "Camping. Nothing elaborate. A tent, a fire, and a
  night with nothing to refresh."
- **1.3.3** - **The van:** "The van. Half workshop, half escape hatch. My
  favorite way to lose a weekend and a bit of cell coverage."
- **1.3.4** - **Bike rides:** "Bike rides. The cheapest debugger I own; most
  stuck problems come unstuck a few kilometers in."
- **1.3.5** - **Closing tie-in (optional):** "Most of my better ideas turn up
  when I'm not looking for them, usually somewhere off a trail."

### 1.4 Layout options (pick the one that stays calmest)

- **1.4.1** `S` - **Three "field note" lines.** Just the intro plus three short
  rows, no images. Maximum restraint, zero new assets, reuses timeline styling.
- **1.4.2** `S` - **Pixel-icon trio.** A tent, a van, and a bicycle rendered
  through the existing `PixelIcon`/`PixelGrid` system, one per item. Pixel art is
  inherently humble and playful and already lives on the site, so it reads as
  _charming_, not _bragging_. Add a campfire and a pine to the sprite set while
  you're in there (also feeds 4.x easter eggs).
- **1.4.3** `M` - **Muted polaroids.** Two or three small, desaturated,
  slightly-rotated snapshots with handwritten-style captions, sized down so they
  read as marginalia, not a gallery. Tint them in dark mode like the botanicals.
- **1.4.4** `M` - **A single hand-drawn trail line.** A thin SVG contour/route
  line threading between the three items, like a topo map. Subtle, on-theme,
  ties into the map ideas in 4.6.

### 1.5 What to avoid (the "non-braggy" guardrails)

- **1.5.1** - No gear lists, brand names, or specs. "A tent" not "my MSR Hubba."
- **1.5.2** - No drone shots or summit-pose photos. If photos at all, keep them
  small, plain, and a little imperfect.
- **1.5.3** - No "adventurer/explorer" self-labeling. Let the verbs do it.
- **1.5.4** - Three things, max. Restraint is the whole aesthetic.

---

## 2. A new page

You floated maybe adding a page. Three candidates, in order of fit:

- **2.1** `M` - **Colophon / "How this site is made."** A page that explains the
  parchment palette, the self-hosted React, the JSX build step, the terminal,
  the forest engine, the pixel-art system. Developers love a colophon, it doubles
  as proof of craft, and this site has an unusually good story to tell. Pure
  on-brand for "occasionally pixelated."
- **2.2** `M` - **Logbook / "Field notes."** A lightweight digital-garden page
  of short, dated notes (a few sentences each), driven from a tiny data file or
  Markdown. Could merge with the camping/van/bike theme: a literal logbook of
  small trips _and_ small builds, same voice. Pairs with an RSS feed (6.7).
- **2.3** `S` - **Uses / "The setup."** The classic `/uses` page: editor,
  hardware, the van's little 12V workspace, the bike. Cheap to write, very
  shareable in dev circles, and it lets the passions and the tooling sit in one
  honest place.
- **2.4** `M` - **Trail map.** A stylized, hand-drawn map page (not a real
  embedded map, to stay calm and private) marking a few favorite regions or
  routes as illustrated pins. The most "memorable" option and the riskiest to
  keep humble; treat regions, not exact spots.
- **2.5** `S` - **Guestbook.** A tiny terminal-style `sign` command or a
  Netlify-Forms-backed wall of short notes from visitors. Nostalgic, warm, and
  it makes the site feel inhabited.

---

## 3. New features

- **3.1** `M` - **`projects.json` as single source of truth.** Projects are
  described in three places (Projects page, terminal `projects`, prefetch hints
  in `index.html`). Drive all of them from one data file. Kills drift, and makes
  the per-project detail view (3.2) almost free.
- **3.2** `M` - **Per-project detail view.** A case-study panel (problem,
  approach, result, stack, links) reachable from each card and via deep link
  (`#projects/tapedeck`). Recruiters skim cards but hire on stories.
- **3.3** `S` - **Wire up `now` + `changelog`.** The data already exists in
  `site-content.js`. Add `now` and `changelog` terminal commands, and surface a
  one-line "currently building X" somewhere quiet on Home. Signals the site is
  alive.
- **3.4** `S` - **Contact affordance on Home.** The terminal has `contact`, but
  the main UI leans on the sidebar mail link. Add a prominent "Email me" CTA or a
  no-backend form (Netlify Forms / Formspree).
- **3.5** `M` - **Command palette (Ctrl/Cmd-K).** Fuzzy-jump to pages, projects,
  the theme toggle, and terminal commands. A natural sibling to the terminal that
  makes the whole site keyboard-drivable.
- **3.6** `S` - **`resume` / `cv` command + printable resume.** A terminal
  command that prints a tidy CV and offers a download, backed by a dedicated
  print stylesheet so the page itself prints cleanly to PDF.
- **3.7** `S` - **Romanian / English toggle.** You're in Bucharest; a small `ro`
  switch (or `lang` terminal command) is a tasteful, locally-honest touch.

---

## 4. Hidden features and easter eggs

The terminal sets a high bar. These keep the "reward the curious" spirit without
cluttering the default view.

### 4.1 More terminal commands (`S` each, batch them)

- **4.1.1** - `coffee` ASCII-pours a steaming cup; `tea` for the patient.
- **4.1.2** - `campfire` renders a flickering ASCII fire (animated frames),
  perfect bridge to the passions theme. `tent`, `van`, `bike` print tiny pixel
  scenes.
- **4.1.3** - `fortune` prints a rotating dev/trail aphorism; `cowsay <text>`.
- **4.1.4** - `weather` quips about Bucharest (canned lines, no API needed).
- **4.1.5** - `neofetch` prints a system-info card with a small ASCII portrait
  and your stack as the "specs." Extremely on-brand for this site.
- **4.1.6** - `theme dark|light`, `man <cmd>`, `history`, `echo`, `uptime`
  (session time), `pwd`, `tree`, `open <project>` (actually navigates).
- **4.1.7** - `vim` that "can't be exited" (joke), `sl` steam locomotive,
  `42` answers the ultimate question, `sudo make me a sandwich` (xkcd).
- **4.1.8** - `whoami` that knows the visitor: riff on time of day or count
  commands run this session ("you've run 7 commands, curious one").

### 4.2 The `.secret` thread, deeper

- **4.2.1** `S` - `cd .secret` actually "enters" a directory (prompt changes),
  with new files to `cat`. A breadcrumb trail that ends somewhere small and warm
  (a thank-you, a hidden line about the van, a `forest` shortcut).

### 4.3 Typed-word triggers (beyond Konami)

- **4.3.1** `S` - Type `plant` to grow an ASCII sapling in a corner; `rain` for
  a leaf shower; `night` to nudge dark mode; `campfire` to glow the footer warm.

### 4.4 Ambient surprises

- **4.4.1** `S` - **Console greeting for devs.** A styled `console.log` welcome
  with a hint about `ssh`, for anyone who opens DevTools.
- **4.4.2** `S` - **Idle critter.** After a long idle, a pixel critter ambles
  across the footer past the growing plants, or a single leaf drifts and settles.
- **4.4.3** `S` - **Seasonal/time touches.** A snowflake or two in December,
  petals in spring, a dimmer warmer palette after dark (local time), layered
  lightly on the existing particles.
- **4.4.4** `S` - **Logo micro-interaction.** Triple-click or long-press the leaf
  mark to spin it, or briefly reveal a "wireframe" inspect overlay.
- **4.4.5** `M` - **Constellation at night.** After dark, a faint, slow star
  field behind the footer, with one constellation that spells a letter or a leaf.

### 4.5 A second mini-game

- **4.5.1** `M` - The Snake canvas plumbing already exists. A tiny "tend the
  garden" clicker, a Pong reskin, or a `breakout` reuses it. Keep it one screen.

---

## 5. Standout and beautiful polish

Higher-risk, higher-reward atmosphere ideas. Each must still feel calm.

- **5.1** `M` - **Day/night palette drift.** Shift the parchment warmth subtly by
  local time of day (cooler at midday, amber at dusk). Quiet, alive, memorable.
- **5.2** `S` - **Wax-seal / stamp motif.** A small pressed-seal flourish on
  project cards or the footer, like a field journal. Reinforces the paper theme.
- **5.3** `M` - **View Transitions API.** Soft cross-fades between Home / About /
  Projects, gated behind `prefers-reduced-motion`. Modern, smooth, cheap once the
  hash routing is in place.
- **5.4** `S` - **Theme-aware botanical art.** Tint or swap the per-page plant
  photos in dark mode so they don't glow against the dark parchment.
- **5.5** `S` - **Marginalia type detail.** A handwritten-style accent font for
  one or two small captions (the passions section, a footer note), used sparingly
  so it stays elegant.
- **5.6** `S` - **Opt-in sound.** A quiet typewriter tick in the terminal and a
  soft chime on Snake fruit, behind a toggle, default off. (`sound.js` already
  exists to build on.)
- **5.7** `M` - **Custom cursor / leaf cursor.** A tiny leaf or ink-nib cursor on
  interactive elements, respecting reduced-motion and falling back gracefully.

---

## 6. Improvements and infrastructure

- **6.1** `S` - **Performance pass.** Lighthouse audit; confirm `webp` +
  `prefetch` hints match real usage; drop prefetch for images that no longer
  exist; lazy-load below-the-fold project images.
- **6.2** `M` - **Accessibility sweep.** `:focus-visible` outlines on nav and the
  brand link, a "skip to content" link, contrast check on `--ink-mute`. The
  terminal is keyboard-first; the rest should match.
- **6.3** `S` - **Consolidate identity/copyright.** Decide on one treatment for
  the year/identity so the sidebar and any footer copy don't drift.
- **6.4** `S` - **Seed theme from OS preference.** Initialize light/dark from
  `prefers-color-scheme` on first load (the meta tags already react; the app
  state should too), then let the manual toggle override.
- **6.5** `S` - **Per-project Open Graph.** Once 3.2 exists, give each project
  detail view its own OG title/description so deep links share well.
- **6.6** `M` - **PWA / offline.** A small service worker so the site installs
  and works offline. Fits a site that's literally about going off-grid.

- **6.7** `S` - **RSS for `changelog` / logbook.** A tiny feed so the "site is
  alive" signal is subscribable. Pairs with 2.2 and 3.3.
- **6.8** `S` - **Privacy-friendly analytics (optional).** GoatCounter or
  Plausible if you ever want to know what people poke at, no cookies, no creep.

---

## 7. Suggested first picks

If you only do three things right now:

1. **1.1.1 + 1.3** - ship the "off the clock" passions section on About. It's
   your stated goal, it's on-theme, and it's an afternoon of work.
2. **3.1 + 3.2** - `projects.json` plus per-project detail views. This is the
   single biggest jump in how the site reads to a recruiter.
3. **4.1 (a handful) + 4.1.2** - add `outside`/`campfire`/`neofetch` and friends.
   Cheap, delightful, and ties the terminal to the new passions theme.

If you want one _memorable_ swing on top of that: **5.1** (day/night palette
drift) or **2.1** (the colophon page).
