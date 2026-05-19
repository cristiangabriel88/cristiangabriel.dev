# Forest Wanderer — Upgrade Ideas

A grab-bag of directions to push the terminal adventure further. Each section
is ordered roughly cheap-to-build → ambitious. Pick what excites; ignore the
rest.

## Content expansion

- **Impostor NPC** — a character who appears in a familiar location wearing
  another NPC's aliases. Reveals itself if the player asks about something
  only the real NPC would know. Pure-text shapeshifter — fits the verb-noun
  parser perfectly.
- **Carpenter's ghost** — a spirit in `sunken_workshop` who taught a single
  lullaby to the woods (ties to Echo Spring). Asks the player to play the
  melody back.
- **Lost child** — a younger wanderer who got further than you did. They
  give clues; eventually you find their bones, then later their handprint
  in dew.
- **Raven king** — an unfriendly fourth NPC who blocks the path to a hidden
  endings if you've collected too many items (Wanderer's Choice variant:
  travel light).
- **Three more locations** — a Cave Of Names (whispers your past commands
  back at you), a Pine Cathedral (silent location; non-action verbs only),
  a Rope Bridge (cross with stamina cost; can break).
- **Side quests** — small loops independent of the main path (e.g., gather
  three feathers for the magpie's brood; refill the spring with collected
  rainwater).
- **Readable items** — letters, diary pages, gravestone rubbings, signposts
  with full inscriptions revealed via `read X`.
- **More items** — rope (cross the bridge), berries (heal a little), oil
  flask (refuel lantern), a tooth (gives Oracle a "real" question).
- **Item alchemy chains** — combinations that require two prior combinations
  (e.g., `oil + lantern + ember + moss` for a long-lasting lantern).
- **Multiple endings** — extend beyond two: a Wanderer-Forever ending
  (refuse all NPCs), a False-Hermit ending (Impostor wins), a Cosmic ending
  (combine all artifacts at the Oracle Stone).
- **Newgame+** — finishing once unlocks a "you have walked these woods
  before" flag; NPCs remember; some items pre-located.

## Parser & command improvements

- **Pronoun resolution** — "take it", "drop them" referring to the last
  noun. Track `state.lastNoun`.
- **Multi-object commands** — `take key and compass`, `drop everything`.
- **`again` / `g`** — repeats the last command. Cheap quality-of-life win.
- **`undo`** — revert the last turn. Useful with the resource pressure; cap
  to N undos per session.
- **Better disambiguation** — exact match > prefix > substring. Currently
  ambiguous nouns ("lantern" with both raw and moss in inventory) resolve
  by inventory order. Score matches by length.
- **Smart "you can't do that" messages** — instead of generic "i don't see
  that", suggest the closest match: "did you mean `signpost`?"
- **Verb aliases beyond English** — `unlock` for `use key on chest`,
  `light` for `use ember on lantern` (shortcuts for common combos).
- **Compound verb forms** — `pick up the key` works; could also accept
  `grab it` (with pronoun resolution).
- **`go back`** — return to previous location without naming it.

## Game mechanics

- **Tab autocomplete** — verbs and known nouns. Big perceived-polish win.
- **Command history with ↑ / ↓** — terminals always do this; the player
  will reach for it.
- **Patience / wisdom gauge** — a hidden stat that rises when the player
  uses `listen`, `wait`, `smell`. Unlocks subtle dialog branches.
- **Weather** — rain dims daylight faster but refills the spring; fog
  hides exits until the player `look`s. Cycles deterministically per turn.
- **Time-of-day descriptions** — morning/noon/dusk/night variants of room
  text. The Pine Grove at dusk is a different place than the Pine Grove at
  noon.
- **Encumbrance** — inventory has a soft cap; over-cap drains stamina
  faster per move. Trades depth for slight tedium — test carefully.
- **Lantern fuel** — `lit_lantern` consumes one charge per N turns of
  movement at night; oil flask refills it. Adds tension to the night phase.
- **Hunger / thirst as a third resource** — only the player can pick up on
  the resource gauges; the world doesn't comment. Or skip — two resources
  already enough.
- **Companion** — once you trade with the magpie, it can flit to other
  locations and drop one-liners (low-priority barks).

## Atmosphere & polish

- **Per-character typewriter speed** — `speed slow|normal|fast|instant` in
  the in-game help.
- **Ambient lines** — once every N turns, the room emits a flavor line:
  "a branch creaks somewhere behind you." Pool of 30+ lines per location.
- **WebAudio ambience** — very low-volume brook, fire, wind tones tied to
  location. Hide behind a `sound on|off` command (off by default).
- **Chiptune theme** — a tiny looping melody when in `forest` mode; mute
  on `quit`. Built with WebAudio oscillators, no asset files.
- **Day/night palette shift** — at night, swap a couple of CSS variables
  so the terminal's body tone shifts cooler. Subtle, single CSS change.
- **CRT scanline overlay** — optional, behind a `crt` command. Pure CSS
  via `background: repeating-linear-gradient(...)`.
- **Color-coded NPCs** — each NPC's dialog gets its own subtle hue (hermit
  warm cream, magpie cooler grey-green, echo near-white, oracle ash).
- **Inline ASCII art for special items** — when you `look at` the silver
  leaf, render it with the existing big-font renderer. One per quest item.
- **Italics via Unicode** — for thought / dream lines, use the small set
  of italic Latin code points. Looks distinctive without HTML.
- **Glitch effects** — during the rewind ("the forest folds you back"),
  briefly render lines with random char substitutions before settling.

## Persistence & shareability

- **Multiple save slots** — `save 1`, `save 2`, `save 3`. Listed with
  `saves`.
- **Save metadata** — last-saved timestamp + a one-line auto-summary
  ("at the Oracle Stone with the engraved token").
- **Export save as a base64 string** — `export` prints a code; `import
  <code>` loads it. Lets you move runs between browsers/devices.
- **Run summary card** — at ending, render a ~10-line postcard of your
  run (turns played, items found, NPCs met, ending reached) as ASCII.
- **Achievement system** — tracked across all runs in localStorage. Hidden
  by default; viewable with `achievements`. Examples below.
- **Speedrun timer** — display real-time-elapsed in `stats` once you've
  beaten the game once.

### Achievement ideas

- **Slow walker** — finish in 200+ turns.
- **Light-footed** — finish in <50 turns.
- **Pacifist** — finish without taking anything from the Oracle.
- **Hermit's friend** — ask every topic before completing.
- **Magpie's accomplice** — trade twice (requires extra logic; magpie
  currently trades once).
- **Cartographer** — visit every location.
- **The wanderer's vow** — finish Ending B without ever giving an item.
- **First death** — survive the hybrid rewind. (the message is the reward)
- **Both endings** — see them both across separate runs.

## Replayability

- **Multiple difficulty modes**:
  - *Reverie* — no death, all resources doubled. For atmosphere-only
    players.
  - *Wanderer* (default) — current behaviour.
  - *Iron* — single save, no rewinds, items lost on death.
- **Daily seed** — once per real-day, a deterministic variant. Item
  locations and weather shift. Encourages return visits.
- **Hidden third ending** — unlocked only via daily-seed AND giving the
  oracle a specific item it asks for that day.

## Storytelling depth

- **Scattered letters** — five pages of a wanderer-before-you's diary,
  hidden across locations. Reading all five unlocks a fourth ending.
- **Flashbacks** — picking up the golden_locket triggers a 3-line
  remembered scene. Different per playthrough (seeded).
- **Cross-NPC awareness** — if the hermit knows you talked to the oracle,
  he says so. Cheap richness: each NPC's `greet` checks foreign flags.
- **The forest watches** — random events in late game where the player's
  earlier action gets quoted back. ("a voice — your voice, three turns
  ago: 'take compass'.")
- **Branching prologue** — first turn asks the player a single dialog
  question that flavors later text. ("are you walking *to* or *from*?")

## Easter eggs / portfolio integration

- **`cv` command** — typing it in the forest reveals a small in-character
  CV / about line ("the wanderer was once a software engineer in
  Bucharest"). Same content as the terminal's existing `about`, but
  framed.
- **Snake reference** — meet a black grass-snake in the Pine Grove that
  asks if you want to play. `yes` exits to the actual Snake mini-game;
  beating it gives you an in-game item.
- **Hidden `konami`** — Konami code inside `forest` triggers a "developer
  commentary" overlay that briefly describes how each NPC was built.
- **GitHub references** — a moss-grown stone in `mossy_clearing` is
  inscribed with a star-count number from one of your real repos
  (fetched lazily, with a fallback).
- **QuickPaste call-out** — magpie's nest contains a tiny clipboard
  shaped from twigs. Examining it: "it tries to remember the last thing
  you copied. fails."
- **Loopretto call-out** — Echo Spring's melody is rendered in a small
  monospace "score": four notes laid out on a five-line staff.
- **Trendalizer call-out** — the Oracle's three answers, when re-read at
  game-end, sketch a moving-average graph of your playthrough's
  decisions.

## Accessibility

- **`aria-live="polite"`** on the terminal body so screen readers
  announce new lines as they appear.
- **High-contrast theme** — `contrast high` swaps text colors for a
  brighter palette.
- **Reduced motion** — auto-detect `prefers-reduced-motion`; default
  typewriter speed to instant.
- **Larger font option** — `font big|normal|small`.
- **Skip-typewriter shortcut** in the in-game help text (currently only
  surfaced via behaviour, not docs).

## Technical / architecture

- **Split data from logic** — move `LOCATIONS`, `ITEMS`, `NPCS`,
  `COMBINATIONS` into a separate `forest-data.js` (still lazy-loaded,
  loaded together). Makes editing content less scary.
- **JSON content** — eventually move plain content to a JSON file the
  module fetches; allows non-coder edits.
- **Schema validation on save load** — currently `v: 1` gate only.
  Add field-level checks so a malformed save doesn't crash the parser.
- **Save migrations** — when `SAVE_VERSION` bumps, transform old saves
  rather than discard. Even a stub migration table is a good habit.
- **Tests** — small pure-function tests for `tokenize`, `comboKey`,
  `resolveNoun`. Drop them in a `forest-adventure.test.js`; run with
  `node --test` or in browser via a hidden `test` command.
- **i18n-readiness** — content tables keyed by string IDs, lookup
  resolves through a `STRINGS` map. Future language packs become
  feasible.
- **Bundle the module** — once it grows, run a single esbuild pass to
  minify; the lazy-load script tag fetches the minified version.

## Quality-of-life commands

- **`journal`** — auto-recorded log of significant events (taking
  items, meeting NPCs, hearing the melody). One-screen summary.
- **`map`** — ASCII map of visited locations, current location marked.
  Re-drawn each call so it grows with exploration.
- **`recap`** — a 3-line "previously, on Forest Wanderer…" summary
  when resuming a save. Helps when coming back the next day.
- **`hint`** — already present; could become smarter by checking flag
  combinations and offering increasingly explicit pushes.
- **`whisper X`** — soft, hidden conversations: try `whisper hermit`
  for a poem-line per NPC. Pure flavor.
- **`look around` vs `look`** — they're aliased; could differentiate:
  `look` returns to brief mode, `look around` always gives the full
  first-visit-style description.

## Visual flourishes (text only, no images)

- **Centered titles** — room titles padded to centre across the
  terminal's effective width.
- **Box-drawn callouts** — important lines wrapped in `┌──┐ │ │ └──┘`
  for emphasis. Use sparingly.
- **Per-NPC indent** — magpie dialog indented (mimics its perch),
  oracle dialog full-width (it speaks from the ground up).
- **Subtle text emphasis** — UPPER-CASE only for sound effects and
  the wind. Lowercase elsewhere preserves the quiet tone you already
  have.

## Bigger swings

- **Procedural side-paths** — between fixed locations, generate small
  side-corridors with random encounters. Keep main quest hand-written.
- **Inverted-camera ending** — the player IS the forest in a final
  scene. The verbs change: `remember`, `grow`, `breathe`.
- **A second wanderer playable in newgame+** — same map, different
  goal (find the first wanderer, not the melody). Same engine, almost
  no new code beyond a story branch.
- **In-engine puzzle creator** — a hidden `compose` command that lets
  the player chain a 5-line poem from collected words; the poem
  becomes the player's epitaph in their next death.
- **Companion mode** — let the player invite the magpie or echo to
  follow. NPCs in tow speak back in other rooms. (Complex; the data
  model would need a per-NPC `currentLocation` rather than a static
  one.)

## Tiny polish ideas

- Save the player's preferred typewriter speed across sessions.
- Add a `pause` command that halts the in-game timer (so leaving the
  tab doesn't tick daylight if you ever switch to real-time mode).
- When the inventory is empty, print "you carry nothing — yet." (the
  "yet" warmth is the whole point).
- Make `i` work as an alias for `inventory` everywhere — confirm it
  does (it should; double-check `VERBS` table).
- Pretty-print the `stats` bar with `█▓▒░` shaded blocks instead of
  `#·` for a richer look.
- After an ending, auto-`save` a special "won" flag so the next
  session can show a quiet acknowledgement at the banner.

## What NOT to add (probably)

- **Combat** — explicitly out of scope per the design pass; would
  shift the tone away from contemplative.
- **Inline ASCII art for every room** — you opted out; pixel typewriter
  text is doing the visual work already.
- **Real-money anything** — obviously.
- **Multi-language UI now** — the writing is the voice. Localize once
  the English is fully settled, not before.
