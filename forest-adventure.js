/* ─────────────────────────────────────────────────────────────
   Forest Wanderer — a small parser-driven text adventure that
   lives inside the cg.term easter egg.

   Exposed as a single global so the terminal can lazy-load it:

     window.ForestAdventure = { start, parse, save, load, clearSave, PROMPT }

   Game flow: the terminal calls `start()` to mount the game, then
   passes each line of input to `parse(input, state)`. Each call
   returns { lines, state, done?, ended? } that the terminal prints
   through its typewriter pump.

   The module is self-contained: no React, no DOM, no globals other
   than `window.ForestAdventure` and `localStorage` (for save/load).
   ───────────────────────────────────────────────────────────── */

(function () {
  'use strict';

  // ────────────────────────────────────────────────────────────
  // Save key & version
  // ────────────────────────────────────────────────────────────
  const SAVE_KEY = 'forest-save-v1';
  const SAVE_VERSION = 2;
  const PROMPT = '>> ';

  // ────────────────────────────────────────────────────────────
  // Helpers used across the module
  // ────────────────────────────────────────────────────────────
  // Single object literal so handlers can return one element without
  // wrapping in `[{ ... }]` boilerplate.
  function line(text, kind, instant) {
    return { text, kind: kind || 'game', instant: !!instant };
  }
  function blank() { return line('', 'game', true); }
  function err(text)  { return line(text, 'err'); }
  function dim(text)  { return line(text, 'dim'); }
  function room(text) { return line(text, 'room'); }
  function npcSay(text) { return line(text, 'npc'); }

  // Inline emphasis tokens. The terminal renderer turns `§x{…}` into a coloured
  // <span>; everywhere else they read as the bare word. Used sparingly, only on
  // item names and exit directions, to make output easier to scan.
  function tItem(s)   { return '§i{' + s + '}'; }
  function tDir(s)    { return '§d{' + s + '}'; }
  function tSecret(s) { return '§s{' + s + '}'; }
  function iname(id)  { return tItem(ITEMS[id].name); }

  function has(state, itemId) { return state.inventory.indexOf(itemId) !== -1; }
  // An NPC's current location — dynamic for roamers (whose live position is
  // kept in `state.npc[id].location`), static for everyone else.
  function npcLocation(id, state) {
    const ns = state.npc && state.npc[id];
    return (ns && ns.location) || NPCS[id].location;
  }
  function npcsAt(state, locId) {
    return Object.keys(NPCS).filter(id => npcLocation(id, state) === locId);
  }
  // Whether a room should print its full first-arrival prose. The visit count
  // is already bumped to 1 by the time `describe` runs, so "first view" means
  // visits ≤ 1 — true on arrival and while you linger, false on a later return.
  // `brief` mode (player toggle) always takes the short text.
  function firstView(state, id) {
    if (state && state.descMode === 'brief') return false;
    return ((state.visits && state.visits[id]) || 0) <= 1;
  }
  function inv(state) { return state.inventory.slice(); }
  function removeItem(state, itemId) {
    const i = state.inventory.indexOf(itemId);
    if (i !== -1) state.inventory.splice(i, 1);
  }
  function addItem(state, itemId) {
    if (!has(state, itemId)) state.inventory.push(itemId);
    markFound(state, itemId);
  }

  // Mark an item as "discovered" for the end-of-game tally. Acquiring any
  // item (pickup, craft, reward) routes through addItem, so this is central.
  function markFound(state, itemId) {
    if (state && state.found && state.found.items) state.found.items[itemId] = true;
  }
  // Mark a story beat seen, for the same tally.
  function markSecret(state, key) {
    if (state && state.found && state.found.secrets) state.found.secrets[key] = true;
  }
  // The end-of-game "what the woods remember of you" tally — also shown by `journal`.
  function scoreLines(state) {
    const itemsFound = Object.keys((state.found && state.found.items) || {}).length;
    const roomsSeen = Object.keys(state.visits || {}).filter(id => LOCATIONS[id]).length;
    const totalRooms = Object.keys(LOCATIONS).length;
    const secrets = Object.keys((state.found && state.found.secrets) || {}).length;
    const events = (state.found && state.found.events) || 0;
    return [
      dim("— what the woods will remember of you —"),
      dim("  rooms walked:  " + roomsSeen + " / " + totalRooms),
      dim("  things found:  " + itemsFound),
      dim("  secrets seen:  " + secrets),
      dim("  small wonders: " + events),
      dim("  turns taken:   " + state.meta.turnCount),
    ];
  }

  // ── Seeded RNG (mulberry32) ─────────────────────────────────
  // A seed drives every random choice (weather, wandering events, the death
  // item-drop, magpie roaming) so a given seed replays identically. The
  // mutable cursor `state.rngState` is a plain int, so it survives save/load.
  function makeSeed() {
    return (Math.floor(Math.random() * 0xffffffff) >>> 0) || 1;
  }
  function nextRandom(state) {
    // mulberry32: advance the cursor, hash it to [0,1).
    state.rngState = (state.rngState + 0x6D2B79F5) | 0;
    let t = state.rngState;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }
  // Pick a uniform element from an array using the seeded stream.
  function pickFrom(state, arr) {
    return arr[Math.floor(nextRandom(state) * arr.length)];
  }

  // ── Weather & time-of-day ───────────────────────────────────
  // Weather is chosen once per life and gives the woods a mood; the
  // time-of-day is read off the daylight resource so dusk genuinely
  // changes how the place reads.
  const WEATHERS = ['clear', 'mist', 'rain'];
  function pickWeather(state) {
    return pickFrom(state, WEATHERS);
  }
  function timeOfDay(state) {
    const d = state.resources.daylight;
    if (d <= 0)  return 'night';
    if (d <= 30) return 'dusk';
    if (d <= 70) return 'afternoon';
    return 'morning';
  }
  // A single dim atmosphere line woven from weather + time of day. Returned
  // as one line() or null. Kept short so it sits under the room text.
  function weatherLine(state) {
    const tod = timeOfDay(state);
    const w = state.weather || 'clear';
    const TABLE = {
      clear: {
        morning:   "The morning light comes down clean and cold between the trunks.",
        afternoon: "The light is high and still; the woods hold their colour.",
        dusk:      "The light has gone amber and low, and the shadows have grown long arms.",
        night:     "A clear night. The dark between the trees is complete, and very old.",
      },
      mist: {
        morning:   "A low mist lies in the hollows, and the near trees stand in it like people half-remembered.",
        afternoon: "The mist has not lifted. The forest ends, in every direction, about thirty paces out.",
        dusk:      "Mist and dusk have agreed to meet; the world closes to a soft grey room around you.",
        night:     "Mist and night together — you walk by the feel of the ground more than the look of it.",
      },
      rain: {
        morning:   "A fine rain is falling, so light it is more a change in the air than a weather.",
        afternoon: "Rain ticks steadily through the canopy and gathers, cold, at the back of your collar.",
        dusk:      "The rain has settled in for the evening, patient as the trees that drink it.",
        night:     "Rain in the dark, everywhere and from no particular direction.",
      },
    };
    const text = (TABLE[w] || TABLE.clear)[tod];
    return text ? dim(text) : null;
  }

  // ────────────────────────────────────────────────────────────
  // ITEMS — every takeable / referenceable noun in the game.
  // `aliases` are checked for noun resolution; lower-case substring
  // match is used so "lantern" finds "moss_lantern" too, but exact
  // aliases take precedence.
  // ────────────────────────────────────────────────────────────
  const ITEMS = {
    compass: {
      name: 'a compass',
      aliases: ['compass', 'brass compass'],
      description: "An old brass compass. The needle wavers, then steadies on north — but the north it points to is not your north.",
      takeable: true,
    },
    raw_lantern: {
      name: 'a copper lantern',
      aliases: ['lantern', 'copper lantern', 'raw lantern'],
      description: "A plain copper lantern, empty. The wick has been removed. It will need something soft, and something hot.",
      takeable: true,
    },
    brass_key: {
      name: 'a brass key',
      aliases: ['key', 'brass key'],
      description: "A heavy brass key, half-eaten by green-blue patina. The bit is unusual — three notches and a curl.",
      takeable: true,
    },
    moss_handful: {
      name: 'a handful of moss',
      aliases: ['moss', 'handful of moss', 'green moss'],
      description: "A soft handful of forest moss. It smells of rain that fell long ago.",
      takeable: true,
    },
    river_stone: {
      name: 'a river stone',
      aliases: ['stone', 'river stone', 'flat stone'],
      description: "A flat, smoothed stone the colour of an old coin. It feels heavier than it looks.",
      takeable: true,
    },
    mirror_shard: {
      name: 'a mirror shard',
      aliases: ['shard', 'mirror', 'mirror shard', 'glass'],
      description: "A piece of a hand-mirror. It reflects your face one moment, the woods the next, as if undecided.",
      takeable: true,
    },
    ember: {
      name: 'a live ember',
      aliases: ['ember', 'coal', 'live ember'],
      description: "A live coal the hermit let you carry away. Warm in your pocket. It does not seem to be going out.",
      takeable: true,
    },
    moss_lantern: {
      name: 'a moss-wrapped lantern',
      aliases: ['lantern', 'moss lantern', 'mossy lantern', 'wrapped lantern'],
      description: "The lantern wrapped in moss. Held to light, it catches a green tint. It is not lit.",
      takeable: true,
    },
    lit_lantern: {
      name: 'a lit lantern',
      aliases: ['lantern', 'lit lantern', 'green lantern'],
      description: "The mossy lantern, lit. It throws a circle of green-gold around you.",
      takeable: true,
    },
    melody_pebble: {
      name: 'a humming pebble',
      aliases: ['pebble', 'humming pebble', 'melody pebble', 'melody'],
      description: "A small pebble. When you hold it, it hums the four-note melody back at you — and then again, and again.",
      takeable: true,
    },
    silver_leaf: {
      name: 'a silver leaf',
      aliases: ['leaf', 'silver leaf'],
      description: "A real leaf, somehow silver. Veined, perfect, warm. It does not weigh anything that matters.",
      takeable: true,
    },
    paper_scrap: {
      name: 'a paper scrap',
      aliases: ['paper', 'scrap', 'paper scrap', 'note'],
      description: "A torn scrap of paper. A few words in a small hand:\n   \"the woods remember what walks slowly.\"",
      takeable: true,
    },
    engraved_token: {
      name: 'an engraved token',
      aliases: ['token', 'engraved token'],
      description: "The river stone, polished to mirror-shine and engraved with a single rune. It is the kind of thing one gives.",
      takeable: true,
    },
    golden_locket: {
      name: 'a small golden locket',
      aliases: ['locket', 'golden locket'],
      description: "A small golden locket. Inside, a portrait so faded that you cannot tell whether it is of a person, or a place.",
      takeable: true,
    },
    wisp_ember: {
      name: 'a cold blue ember',
      aliases: ['ember', 'blue ember', 'cold ember', 'wisp ember', 'flame'],
      description: "A scrap of the wisp's own light, cupped in your hand. It is cold, and it does not flicker. It wants, very gently, to be carried somewhere.",
      takeable: true,
    },
    feather: {
      name: 'a long grey feather',
      aliases: ['feather', 'grey feather', 'pinion'],
      description: "A long pinion feather, grey going to silver at the tip. Held to the eye, the whole forest narrows into its vane.",
      takeable: true,
    },
    // ── Scenery / non-takeable references ──
    carved_chest: {
      name: 'a carved chest',
      aliases: ['chest', 'carved chest', 'box'],
      description: "A small chest beautifully carved with vines and birds — the kind of work a careful hand spent winter on. Locked.",
      takeable: false,
    },
    signpost: {
      name: 'an old signpost',
      aliases: ['signpost', 'sign', 'post'],
      description: "Worn wood, three words gouged deep into the grain. The middle word is illegible. A small \"cg\" rune is scratched into the back, neat as a signature.",
      takeable: false,
    },
    fire: {
      name: 'a small fire',
      aliases: ['fire', 'campfire', 'small fire'],
      description: "A small fire of pine cones and dry needles. It burns more politely than it should.",
      takeable: false,
    },
    nest: {
      name: 'a magpie\'s nest',
      aliases: ['nest', 'magpie nest', 'magpie\'s nest'],
      description: "A messy crown of twigs and shiny scraps high in a pine. The magpie watches whatever you do to it.",
      takeable: false,
    },
    spring: {
      name: 'a clear spring',
      aliases: ['spring', 'pool', 'water', 'clear spring'],
      description: "Water rises from the centre of a perfect ring of stones. The melody you have been hearing is here — clearer.",
      takeable: false,
    },
    stone: {
      name: 'the oracle stone',
      aliases: ['oracle stone', 'standing stone'],
      description: "A standing stone taller than you, marked with worn glyphs that crawl when you look away from them.",
      takeable: false,
    },
    workbench: {
      name: 'a workbench',
      aliases: ['workbench', 'bench', 'table'],
      description: "A long workbench, the wood softer than wood should be after this many seasons. Vines have grown the length of it.",
      takeable: false,
    },
    mire: {
      name: 'the black water',
      aliases: ['water', 'mire', 'bog', 'reeds', 'pool'],
      description: "Still black water, skinned with mist. It gives back no reflection at all — not the trees, not the sky, not you. Only, far out, the steady pale light.",
      takeable: false,
    },
    altar: {
      name: 'the stone altar',
      aliases: ['altar', 'stone', 'cup', 'offerings'],
      description: "A flat stone with a shallow cup worn into its centre, exactly the size of a small flame. The bark around it bristles with a hundred small kept things, each pressed in by someone who came this far carrying something they could not put down.",
      takeable: false,
    },
    view: {
      name: 'the view',
      aliases: ['view', 'woods', 'forest', 'canopy', 'horizon'],
      description: "The whole forest, laid open below. From here the paths make sense — clearing to brook to spring, the dark seam of the bog to the west. It is the kind of seeing that does not last once you climb back down.",
      takeable: false,
    },
  };

  // ────────────────────────────────────────────────────────────
  // LOCATIONS — the map. `describe` returns the lines printed on
  // `look` (or first arrival). `dynamicItems` is keyed by id of
  // items present at the location; they're moved to inventory on
  // `take`. Exits map a direction to a location id (or a function
  // that returns one + a guard message).
  // ────────────────────────────────────────────────────────────
  const LOCATIONS = {
    edge_of_woods: {
      id: 'edge_of_woods',
      title: 'Edge of the Woods',
      describe(state) {
        const out = [];
        out.push(room('— Edge of the Woods —'));
        if (firstView(state, 'edge_of_woods')) {
          out.push(line("The forest begins where the path narrows. The smell of cold soil rises to meet you, and the noise of the open road dies away behind, swallowed whole. An old wooden signpost stands knee-deep in fern, leaning, as though it has been listening for footsteps a very long time."));
          out.push(line("A single faint trail goes north, dim under the first of the trees."));
        } else {
          out.push(line("The signpost. The fern. The faint trail north."));
        }
        return out;
      },
      ambient: [
        "You stand still and let the place arrive. Behind you the road you came by has already gone soft at the edges, the way roads do once the trees begin paying attention.",
        "Fern crowds the signpost knee-high, beaded with the last of some old rain. The cold smell of turned earth sits beneath everything. Far ahead the trail gives one quiet breath of pine, and then holds it.",
      ],
      scenery: ['signpost'],
      items: ['compass', 'raw_lantern'],
      exits: { north: 'mossy_clearing' },
    },

    mossy_clearing: {
      id: 'mossy_clearing',
      title: 'Mossy Clearing',
      describe(state) {
        const out = [];
        out.push(room('— Mossy Clearing —'));
        if (firstView(state, 'mossy_clearing')) {
          out.push(line("A round, soft clearing carpeted in green-grey moss, deep enough to swallow the sound of your own steps. The trees lean inward on every side as if listening, and the light comes down in slow coins through the canopy."));
          out.push(line("Something metal glints near your foot."));
        } else {
          out.push(line("The moss-soft clearing. Trees leaning in."));
        }
        out.push(dim("Paths lead south, north, east, and west."));
        return out;
      },
      ambient: [
        "You turn slowly in the soft centre of the clearing. The moss takes your weight without a sound, green-grey and deep enough to lose a coin in and never hear it land.",
        "The trees crowd close on every side, patient as people gathered at a bedside. Four ways lead out from here, and the woods seem honestly curious which one you will choose.",
      ],
      scenery: [],
      items: ['brass_key', 'moss_handful'],
      exits: {
        south: 'edge_of_woods',
        north: 'brook_crossing',
        east:  'hermit_hollow',
        west:  'pine_grove',
      },
    },

    brook_crossing: {
      id: 'brook_crossing',
      title: 'Brook Crossing',
      describe(state) {
        const out = [];
        out.push(room('— Brook Crossing —'));
        if (firstView(state, 'brook_crossing')) {
          out.push(line("A clear brook chuckles over flat stones, bright and cold and never quite finishing a sentence. A mossy log, older than the crossing itself, offers a soft and certain way across."));
          out.push(line("From the west a melody loops in the air: four notes, then four again, folding back on itself."));
        } else {
          out.push(line("The brook. The log. The looping melody to the west."));
        }
        out.push(dim("Paths lead south, west, and north."));
        return out;
      },
      ambient: [
        "You watch the water a while. The brook moves over the flat stones in small bright sentences and abandons every one of them halfway through.",
        "The log across it gives gently underfoot, sure of itself. From the west the four-note melody keeps returning, near enough now that you find yourself humming it without deciding to.",
      ],
      scenery: [],
      items: ['river_stone'],
      exits: {
        south: 'mossy_clearing',
        west:  'echo_spring',
        north: 'oracle_stone',
      },
    },

    pine_grove: {
      id: 'pine_grove',
      title: 'Pine Grove',
      describe(state) {
        const out = [];
        out.push(room('— Pine Grove —'));
        if (firstView(state, 'pine_grove')) {
          out.push(line("Pines so tall the sky narrows to a pale ribbon stitched between their crowns. The ground is a deep red quilt of fallen needles that breathes resin where you step. High in one trunk, a magpie shifts its head and fixes you with one mad, shining eye."));
          out.push(line("Paths fork from the needle-floor: east the way you came, north into a half-collapsed roof, and west where the ground softens and the air goes white. Pegs hammered into the largest trunk climb up into the canopy."));
        } else {
          out.push(line("Tall pines. The magpie watches."));
          out.push(dim("Paths lead east, north, and west; pegs climb up the great trunk."));
        }
        return out;
      },
      ambient: [
        "You tip your head back until the trunks become a cathedral, climbing and climbing until the sky is only a thread.",
        "Underfoot the needles lie ankle-deep and warm with old resin. High above, the magpie turns its black eye on you and tilts its head, plainly weighing whatever you might be worth to it.",
      ],
      scenery: ['nest'],
      // mirror_shard and paper_scrap live in the nest — taken by trading with the magpie or by `take`
      items: [],
      exits: {
        east:  'mossy_clearing',
        north: 'sunken_workshop',
        west:  'misty_bog',
        up:    'treetop_roost',
      },
    },

    hermit_hollow: {
      id: 'hermit_hollow',
      title: "Hermit's Hollow",
      describe(state) {
        const out = [];
        out.push(room("— Hermit's Hollow —"));
        if (firstView(state, 'hermit_hollow')) {
          out.push(line("A hollow at the foot of a great oak, curved overhead like a cupped hand. A small fire of pine cones and dry needles keeps a careful, well-mannered light. An old man, his robe stitched of leaves, looks up at you, slowly, as though he had all the time the woods could spare."));
        } else {
          out.push(line("The oak. The polite little fire. The hermit waiting."));
        }
        out.push(dim("A path leads west."));
        return out;
      },
      ambient: [
        "You settle into the hush of the hollow. The great oak leans over the little fire, and the fire leans back, and neither is in any hurry.",
        "The hermit's robe is sewn from leaves of seasons that have not all happened yet. The air smells of pine cones and patience. He does not rush, and somehow, here, neither do you.",
      ],
      scenery: ['fire'],
      items: [],
      exits: { west: 'mossy_clearing' },
    },

    echo_spring: {
      id: 'echo_spring',
      title: 'Echo Spring',
      describe(state) {
        const out = [];
        out.push(room('— Echo Spring —'));
        if (firstView(state, 'echo_spring')) {
          out.push(line("A spring rises at the centre of a perfect ring of stones, clear over clear, as if the water were only pretending to be water. The melody you heard from the brook is here and unmistakable now: four ascending notes, repeating endlessly into themselves."));
          out.push(line("Something moves in the water that is not quite water."));
        } else {
          out.push(line("The ring. The four notes. The shape in the water."));
        }
        out.push(dim("The brook is east."));
        return out;
      },
      ambient: [
        "You crouch by the ring of stones and grow quiet. The spring lifts from its centre without a single ripple, patient and bottomless.",
        "The four notes climb out of it, low, lower, low, high, and begin again before you can quite decide how they made you feel. Below the surface something turns that is shaped a little too much like a face.",
      ],
      scenery: ['spring'],
      items: [],
      exits: { east: 'brook_crossing' },
    },

    oracle_stone: {
      id: 'oracle_stone',
      title: 'The Oracle Stone',
      describe(state) {
        const out = [];
        out.push(room('— The Oracle Stone —'));
        if (firstView(state, 'oracle_stone')) {
          out.push(line("A standing stone taller than you, marked with worn glyphs that crawl the instant your eye leaves them and are perfectly still the moment you look back. The air around it is older than the rest of the woods, the way the air in an empty church is older than the street outside. You sense it has questions to ask, or to answer, and is in no hurry about either."));
        } else {
          out.push(line("The standing stone. The watching glyphs."));
        }
        if (state.resources.daylight <= 0 && !has(state, 'lit_lantern')) {
          out.push(dim("It is night. The stone seems further away than it should."));
        }
        out.push(dim("The brook is south."));
        return out;
      },
      ambient: [
        "You walk the slow circle of the standing stone. The glyphs shift at the corner of your sight and settle whenever you face them, which is its own kind of answer.",
        "The quiet here has weight to it. The stone has been waiting a very long time, you feel, and would not mind waiting a great deal longer.",
      ],
      scenery: ['stone'],
      items: [],
      exits: { south: 'brook_crossing' },
      requiresLight: true,
    },

    sunken_workshop: {
      id: 'sunken_workshop',
      title: 'Sunken Workshop',
      describe(state) {
        const out = [];
        out.push(room('— Sunken Workshop —'));
        if (firstView(state, 'sunken_workshop')) {
          out.push(line("A workshop sunk into the earth at a tired angle, half its roof open to the trees and the other half still holding the smell of sawdust that should have faded a lifetime ago. Vines thread through ornate furniture half-buried in moss, as though the forest had once sat down here to learn the trade."));
          out.push(line("On a long workbench, a small carved chest sits as if it had been set down only yesterday, too clean for all the years around it."));
        } else {
          out.push(line("Sunken room. Ornate ghosts of chairs. The workbench. The chest."));
        }
        if (state.resources.daylight <= 0 && !has(state, 'lit_lantern')) {
          out.push(dim("It is far too dark in here to see the chest properly."));
        }
        out.push(dim("The pine grove is south."));
        return out;
      },
      ambient: [
        "You let your eyes adjust to the green dark. The room slumps around you, ruined chairs and ruined shelves, every joint of them stitched shut with vine.",
        "Sawdust ghosts the air, faint and impossible. In the middle of the wreck the carved chest waits, untouched by the rot, patient as the hand that must once have made it.",
      ],
      scenery: ['workbench', 'carved_chest'],
      items: [],
      exits: { south: 'pine_grove' },
      requiresLight: true,
    },

    misty_bog: {
      id: 'misty_bog',
      title: 'Misty Hollow',
      describe(state) {
        const out = [];
        out.push(room('— Misty Hollow —'));
        if (firstView(state, 'misty_bog')) {
          out.push(line("West of the pines the ground gives up being ground. A low hollow of black water and tussock grass lies under a standing mist that does not move with the wind, because there is no wind. Reeds lean at the edges. Somewhere out over the water, a single pale light hangs, patient, the size of a held breath."));
        } else {
          out.push(line("The black water. The standing mist. The pale light, waiting."));
        }
        if (state.flags.wispLed) {
          out.push(line("Where the mist had been a wall, it has thinned to a doorway: a path north, between two leaning oaks."));
        }
        out.push(dim("The pine grove is east." + (state.flags.wispLed ? " A path leads north." : "")));
        return out;
      },
      ambient: [
        "You stand at the lip of the water and let the mist come to you. It tastes of cold iron and old leaves. The pale light holds its distance, neither approaching nor fleeing — only attending.",
        "Frogs you cannot see keep a slow conversation going in the reeds. The mist hangs in a single sheet, as though the hollow were a room and someone had pulled a curtain across the far wall.",
      ],
      scenery: ['mire'],
      items: [],
      exits: {
        east: 'pine_grove',
        north(state) {
          if (state.flags.wispLed) return { to: 'oak_shrine' };
          return { to: null, msg: "the mist stands across the way like a wall. it is waiting to be given a reason to part." };
        },
      },
    },

    oak_shrine: {
      id: 'oak_shrine',
      title: 'The Hollow-Oak Shrine',
      describe(state) {
        const out = [];
        out.push(room('— The Hollow-Oak Shrine —'));
        if (firstView(state, 'oak_shrine')) {
          out.push(line("Beyond the mist, a single oak so old it has gone hollow, wide enough to walk into. Someone, long ago, made its hollow a shrine: a flat stone altar, a ring of guttered candle-stubs, and on the bark a hundred small offerings — buttons, teeth, rings — pressed in by hands the tree has long since grown around."));
          out.push(line("The altar has a shallow cup worn into its centre, the exact size of a held flame."));
        } else {
          out.push(line("The hollow oak. The altar. The offerings grown into the bark."));
        }
        if (state.resources.daylight <= 0 && !has(state, 'lit_lantern')) {
          out.push(dim("It is too dark under the oak to make out the altar."));
        }
        out.push(dim("The misty hollow is south."));
        return out;
      },
      ambient: [
        "You step inside the tree. The hollow holds you the way cupped hands hold water. The offerings catch what little light there is — a button here, a child's tooth there — each one a small thing someone could not keep, and would not throw away.",
        "The altar's cup is worn smooth as an old coin. Whoever made this place meant a flame to sit here, and meant someone, someday, to bring one.",
      ],
      scenery: ['altar'],
      items: [],
      exits: { south: 'misty_bog' },
      requiresLight: true,
    },

    treetop_roost: {
      id: 'treetop_roost',
      title: 'Treetop Roost',
      describe(state) {
        const out = [];
        out.push(room('— Treetop Roost —'));
        if (firstView(state, 'treetop_roost')) {
          out.push(line("The pegs end at a platform of weathered boards lashed high between three crowns — a watcher's roost, or a child's, abandoned to the wind a long time back. From up here the whole woods lie open below you, breathing, and you can see how the paths thread between the places you have walked."));
          out.push(line("A long grey feather is caught in a knot of the railing."));
        } else {
          out.push(line("The high platform. The woods spread out below, breathing."));
        }
        out.push(dim("The pegs lead back down."));
        return out;
      },
      ambient: [
        "You sit on the boards with your legs over the long drop and let the wind have you for a while. From here the forest is not a maze at all but a single slow animal, turning over in its sleep.",
        "Far below, the clearing, the brook, the pale smudge of the bog. Seen all at once, the woods seem less like somewhere you are lost and more like somewhere that is keeping you.",
      ],
      scenery: ['view'],
      items: ['feather'],
      exits: { down: 'pine_grove' },
    },
  };

  // ────────────────────────────────────────────────────────────
  // NPCS — characters the player can talk/ask/give to.
  // `topics` are simple string responses; richer ones can be
  // functions of state. `aliases` are matched against the noun.
  // ────────────────────────────────────────────────────────────
  const NPCS = {
    hermit: {
      id: 'hermit',
      name: 'the hermit',
      aliases: ['hermit', 'old man', 'old hermit'],
      location: 'hermit_hollow',
      greet(state) {
        const ns = state.npc.hermit;
        if (!ns.met) {
          ns.met = true;
          state.flags.metHermit = true;
          return [
            npcSay("\"who walks here?\" — slow, unsurprised."),
            line("the hermit eyes you for a long moment, then nods you toward the fire."),
            dim("(ask the hermit about the melody, the forest, the fire, or yourself.)"),
          ];
        }
        if (ns.mood === 'wary')   return [npcSay("\"still walking, then.\" the hermit pokes at the fire.")];
        if (state.flags.gaveTokenToOracle)
          return [npcSay("the hermit looks at you a moment longer than before. \"you carry the leaf now. you know what it is for.\"")];
        if (state.flags.learnedMelody)
          return [npcSay("the hermit hums four notes back at you, pleased. \"so the spring sang. sit.\"")];
        return [npcSay("the hermit gestures you to the fire. \"sit. it knows you now.\"")];
      },
      topics: {
        melody(state) {
          const ns = state.npc.hermit;
          ns.mood = 'friendly';
          ns.topicsAsked.push('melody');
          if (state.flags.learnedMelody) {
            return [npcSay("\"you found it. good. a song is only kept by being carried.\"")];
          }
          return [
            npcSay("\"the song the woods forgot. find it. bring it. or don't.\""),
            npcSay("\"the spring will sing for you if you sit and don't try.\""),
          ];
        },
        forest(state) {
          state.npc.hermit.topicsAsked.push('forest');
          return [
            npcSay("\"older than what speaks of it.\""),
            npcSay("\"it remembers what walks slowly.\""),
          ];
        },
        yourself(state) {
          state.npc.hermit.topicsAsked.push('self');
          if (state.flags.gaveTokenToOracle)
            return [npcSay("\"i gave the stone a token once, too. it gave me a leaf. i have been deciding what to do with it ever since.\"")];
          return [
            npcSay("\"i was a wanderer once. now i wait.\""),
            npcSay("\"the leaves on this robe are not from this year.\""),
          ];
        },
        fire(state) {
          if (has(state, 'ember') || state.flags.lampLit || has(state, 'lit_lantern')) {
            return [npcSay("\"you have a light of your own now. the fire is glad to have helped.\"")];
          }
          addItem(state, 'ember');
          markSecret(state, 'ember');
          if (window.cgSound && window.cgSound.isEnabled()) window.cgSound.chime();
          return [
            npcSay("\"cold ahead of you, where you're going.\" the hermit nods at the coals. \"take one. it won't go out while the woods still want you walking.\""),
            line("you lift a single live ember from his fire. it sits warm and patient in your pocket."),
            dim("(you take a live ember. something soft and something hot will wake a lantern.)"),
          ];
        },
        magpie(state) {
          return [npcSay("\"the magpie will trade. it likes the look of things, not the use of them.\"")];
        },
        oracle(state) {
          return [npcSay("\"the stone has three honest answers in it. it lies the rest of the time.\"")];
        },
        chest(state) {
          return [npcSay("\"the carpenter made one too many things. some of them are still here.\"")];
        },
        workshop(state) {
          return [npcSay("\"a carver lived north of the pines. his lock-work was famous in a town that is also gone.\"")];
        },
        wisp(state) {
          return [npcSay("\"a light out in the bog. it was someone's once. take it a flame and it will show you where it wants to go — west, and then north.\"")];
        },
        bog(state) {
          return [npcSay("\"west of the pines the ground gives up. don't go in dark. the bog keeps what comes to it without a light.\"")];
        },
        shrine(state) {
          return [npcSay("\"the hollow oak. the carver's wife waited there for a man who'd gone into the bog with the last lantern. she is still waiting, after a fashion.\"")];
        },
        weather(state) {
          const w = state.weather || 'clear';
          const says = {
            clear: "\"clear today. the woods show their whole face. rarer than you'd think.\"",
            mist:  "\"mist. the bog will be honest in this — it is the one weather that opens it.\"",
            rain:  "\"rain. good for walking slow, which is the only way the woods like to be walked.\"",
          };
          return [npcSay(says[w] || says.clear)];
        },
      },
      onGive(itemId, state) {
        if (itemId === 'silver_leaf') {
          state.flags.gaveSilverLeafToHermit = true;
          return [
            npcSay("the hermit takes the silver leaf in both hands. for a moment he looks like a young man."),
            npcSay("\"so. then you can stop walking.\""),
          ];
        }
        if (itemId === 'melody_pebble') {
          state.flags.gaveMelodyToHermit = true;
          return [
            npcSay("the hermit listens to the humming pebble for a long time."),
            npcSay("\"thank you,\" he says. \"the woods will hear that again now.\""),
          ];
        }
        return [npcSay("the hermit looks at " + ITEMS[itemId].name + ", then back at you. \"keep it.\"")];
      },
    },

    magpie: {
      id: 'magpie',
      name: 'the magpie',
      aliases: ['magpie', 'bird'],
      location: 'pine_grove',
      greet(state) {
        const ns = state.npc.magpie;
        if (!ns.met) {
          ns.met = true;
          return [
            npcSay("\"shiny? shiny!\" the magpie hops along its nest, head tilting wildly."),
            npcSay("\"quick — paste it in the nest!\""),
            dim("(it seems to want a shiny thing. try `give` something it would like.)"),
          ];
        }
        return [npcSay("the magpie chatters: \"quick, quick, paste it in!\"")];
      },
      topics: {
        nest(state) {
          return [npcSay("\"nest! nest holds shiny. shiny holds memory. memory holds nest.\"")];
        },
        melody(state) {
          return [npcSay("\"heard it. four notes. four notes again. boring,\" the magpie spits. \"shiny is better.\"")];
        },
        hermit(state) {
          return [npcSay("\"old man. used to be shiny. now leaves.\"")];
        },
        wisp(state) {
          return [npcSay("\"bog-light! not shiny — too cold. won't sit in a nest. won't sit anywhere. tried.\"")];
        },
      },
      onGive(itemId, state) {
        const it = ITEMS[itemId];
        const shiny = ['mirror_shard', 'brass_key', 'compass', 'silver_leaf', 'golden_locket', 'engraved_token'];
        if (shiny.indexOf(itemId) === -1) {
          return [npcSay("the magpie sniffs at " + it.name + " and turns its back. \"not shiny.\"")];
        }
        if (state.npc.magpie.traded) {
          return [npcSay("the magpie has already traded with you. it tucks the new thing into its nest without comment.")];
        }
        state.npc.magpie.traded = true;
        removeItem(state, itemId);
        // Reward: paper_scrap + mirror_shard (if they didn't give it)
        const rewards = [];
        if (itemId !== 'mirror_shard') { addItem(state, 'mirror_shard'); rewards.push('mirror_shard'); }
        addItem(state, 'paper_scrap'); rewards.push('paper_scrap');
        const out = [
          npcSay("\"oh!\" the magpie says. \"oh oh oh oh.\""),
          npcSay("it scrapes around in its nest and drops two things at your feet:"),
        ];
        rewards.forEach(r => out.push(line("  · " + ITEMS[r].name)));
        return out;
      },
    },

    echo: {
      id: 'echo',
      name: 'the spring',
      aliases: ['echo', 'spring', 'water', 'spirit'],
      location: 'echo_spring',
      greet(state) {
        const ns = state.npc.echo;
        if (!ns.met) {
          ns.met = true;
          return [
            line("the water shapes a face that is almost a face. four notes rise: low, lower, low, high."),
            line("then four again. then again."),
            dim("(try `listen` to the spring, or `ask` it about the melody.)"),
          ];
        }
        return [line("the water shapes the same face again. four notes. then four. then four.")];
      },
      topics: {
        melody(state) {
          if (!state.flags.learnedMelody) {
            state.flags.learnedMelody = true;
            markSecret(state, 'melody');
            addItem(state, 'melody_pebble');
            if (window.cgSound && window.cgSound.isEnabled()) window.cgSound.melody();
            return [
              line("the water shapes a hand. on your palm: a small pebble that hums the four notes."),
              dim("(you take a humming pebble.)"),
            ];
          }
          if (window.cgSound && window.cgSound.isEnabled()) window.cgSound.melody();
          return [line("the spring repeats the melody. it is already in your pocket.")];
        },
        water(state) {
          return [line("\"... loops ... like a memory ...\" — the words come without a mouth.")];
        },
        dream(state) {
          return [line("the spring shows you, for an instant, a forest with no trees. then it forgets.")];
        },
        forest(state) {
          return [line("\"older than the song. younger than the stone.\"")];
        },
        wisp(state) {
          return [line("the face in the water turns west, toward the bog. \"... a light that stayed too long ... it is only water, now, that forgot it was a flame ...\"")];
        },
        bog(state) {
          return [line("\"... the bog and i are sisters ...\" the water says. \"... it keeps. i return. that is the only difference ...\"")];
        },
      },
      onGive(itemId, state) {
        return [line("the water takes " + ITEMS[itemId].name + " and gives it back, washed of something you can't name.")];
      },
    },

    oracle: {
      id: 'oracle',
      name: 'the oracle stone',
      aliases: ['oracle', 'stone', 'oracle stone'],
      location: 'oracle_stone',
      greet(state) {
        const ns = state.npc.oracle;
        if (!ns.met) {
          ns.met = true;
          return [
            line("the glyphs on the stone arrange themselves into a sentence:"),
            npcSay("\"speak your question. i answer three times, then i sleep.\""),
            dim("(it is reading the trends of you. try `ask` it about a thing.)"),
          ];
        }
        if (ns.questionsLeft <= 0) return [line("the glyphs are still. the stone has spoken three times today.")];
        return [npcSay("\"you have " + ns.questionsLeft + " question" + (ns.questionsLeft === 1 ? '' : 's') + " left.\"")];
      },
      topics: {
        // Generic answer — uses questionsLeft. We make the topic detection broad in handleAsk.
        _any(state, topic) {
          const ns = state.npc.oracle;
          if (ns.questionsLeft <= 0) {
            return [line("the stone is silent. it has spoken three times today.")];
          }
          ns.questionsLeft -= 1;
          const answers = {
            melody: "\"the most-travelled path is rarely the truest. the song is at the slowest place.\"",
            hermit: "\"he wears the year on his shoulders. give him a year back.\"",
            forest: "\"it watches you in the way a slow animal watches a fast one.\"",
            magpie: "\"trade nothing you cannot lose. it will give you something you cannot keep.\"",
            chest:  "\"the carpenter locked the answer inside.\"",
            workshop: "\"the carpenter is in the room. the room is in the carpenter.\"",
            key:    "\"three notches and a curl. one for moss, one for light, one for the carpenter.\"",
            spring: "\"the spring is a kind of memory that has not happened yet.\"",
            self:   "\"you are walking. that is most of the answer.\"",
            ending: "\"three doors. give the leaf and rest. keep the song and wander. or carry a light west, and give the light a home.\"",
            wisp:   "\"a piece of someone's last lantern. it is looking for the place it was lit.\"",
            bog:    "\"west, where the ground forgets itself. take a light, or the light takes you.\"",
            shrine: "\"the carver's wife waited at the hollow oak. she is the offering grown deepest into the bark.\"",
            weather: "\"the woods wear the sky like a mood. the mist is the truest of its faces.\"",
            default: "\"the stone considers a long time. the trend is uncertain.\"",
          };
          const ans = answers[topic] || answers.default;
          return [npcSay(ans)];
        },
      },
      onGive(itemId, state) {
        if (itemId === 'engraved_token') {
          state.flags.gaveTokenToOracle = true;
          markSecret(state, 'silver_leaf');
          addItem(state, 'silver_leaf');
          return [
            line("the stone accepts the engraved token. for a long second, the glyphs read themselves."),
            line("on the ground, where there had been nothing, a leaf the colour of an old mirror."),
            dim("(you take a silver leaf.)"),
          ];
        }
        return [line("the stone takes " + ITEMS[itemId].name + ", considers it, and gives it back unchanged.")];
      },
    },

    wisp: {
      id: 'wisp',
      name: 'the wisp',
      aliases: ['wisp', 'light', 'glow', 'will o the wisp', 'will-o-wisp', 'flame', 'pale light'],
      location: 'misty_bog',
      greet(state) {
        const ns = state.npc.wisp;
        if (state.flags.wispLed) {
          return [line("the wisp hangs by the northern oaks, where the mist has parted for it. it has shown you what it had to show.")];
        }
        if (!has(state, 'lit_lantern')) {
          if (!ns.met) {
            ns.met = true;
            return [
              line("the pale light drifts a little nearer over the black water, then stops, as if let down."),
              npcSay("— a thought, not a voice — \"dark thing. you carry no light of your own.\""),
              dim("(it is drawn to flame. come back when something of yours is lit.)"),
            ];
          }
          return [line("the wisp keeps its distance over the water. it will not come to a dark hand.")];
        }
        // The player carries the lit lantern — the wisp comes, leads, and gives.
        ns.met = true; ns.led = true;
        state.flags.wispLed = true;
        markSecret(state, 'wisp');
        if (window.cgSound && window.cgSound.isEnabled()) window.cgSound.melody([392, 466, 587, 784], 130);
        addItem(state, 'wisp_ember');
        return [
          line("the wisp sees the green-gold light in your hand and comes to it the way a moth comes — but gladly, and unhurried, as if it had been waiting for exactly this lamp."),
          line("it circles the lantern once, twice, and a scrap of its own cold blue light comes away into your palm and settles there, patient."),
          line("then it drifts north, and the standing mist goes with it, opening a way between two leaning oaks."),
          dim("(you take a cold blue ember. a path north has opened.)"),
        ];
      },
      topics: {
        light(state) {
          return [npcSay("— \"all that is left of a lantern someone carried into the bog and did not carry out. it remembers being warm.\"")];
        },
        shrine(state) {
          return [npcSay("— \"north. the hollow oak. that is where it was lit. that is where it would like to rest.\"")];
        },
        bog(state) {
          return [npcSay("— \"the water keeps no faces. that is why the lost come here: to stop being looked for.\"")];
        },
        hermit(state) {
          return [npcSay("— \"the old man by the fire. he chose to rest. it is only one of the ways.\"")];
        },
        melody(state) {
          return [npcSay("— \"the song is the spring's. the bog has only the one note: stay.\"")];
        },
      },
      onGive(itemId, state) {
        if (itemId === 'lit_lantern') {
          return [line("you offer the lantern; the wisp shies back. it does not want to take the light. it wants to be near it.")];
        }
        return [line("the wisp draws away from " + ITEMS[itemId].name + ". it wants light, not things.")];
      },
    },
  };

  // ────────────────────────────────────────────────────────────
  // COMBINATIONS — keyed by sorted "itemA+itemB". Player runs
  // `use X on Y` or `combine X with Y` and the parser hands the
  // pair down here.
  // ────────────────────────────────────────────────────────────
  const COMBINATIONS = {
    'moss_handful+raw_lantern': {
      result: 'moss_lantern',
      message: "you wrap the moss around the lantern's frame. it sticks like it was waiting to.",
      consumes: ['moss_handful', 'raw_lantern'],
    },
    'ember+moss_lantern': {
      result: 'lit_lantern',
      message: "you press the ember into the moss. the lantern wakes — a slow green-gold light, the colour of leaves and brass.",
      consumes: ['ember', 'moss_lantern'],
      sets: { lampLit: true },
    },
    'mirror_shard+river_stone': {
      result: 'engraved_token',
      message: "you scrape the river stone against the mirror until it polishes to mirror-shine, then press a single rune into it with the shard's edge. the stone takes it, holds it.",
      consumes: ['mirror_shard', 'river_stone'],
    },
    'brass_key+carved_chest': {
      result: null, // doesn't produce an item — opens the chest
      message: "the brass key turns. the chest sighs open. inside, on a square of folded velvet, a small golden locket.",
      consumes: ['brass_key'],
      addItems: ['golden_locket'],
      sets: { chestOpen: true },
    },
    'golden_locket+melody_pebble': {
      result: null,
      message: "you press the humming pebble to the locket. they resonate. the four notes become eight, then four again, deeper this time.",
      consumes: [],
      sets: { resonance: true },
    },
    'altar+wisp_ember': {
      result: null,
      message: "you set the cold blue ember into the cup worn in the altar. it does not warm — it deepens, the way a held note deepens, and the hundred small kept things in the bark catch the light and, very faintly, answer.",
      consumes: ['wisp_ember'],
      sets: { shrineKindled: true },
    },
    'altar+golden_locket': {
      result: null,
      message: "you press the locket into the bark beside the other kept things, and let it open. the faded portrait turns toward the light as if it had been waiting on exactly this hour to be looked at again.",
      consumes: ['golden_locket'],
      sets: { locketGiven: true },
    },
  };

  function comboKey(a, b) {
    return a < b ? a + '+' + b : b + '+' + a;
  }

  // ────────────────────────────────────────────────────────────
  // PARSER
  // ────────────────────────────────────────────────────────────
  const ARTICLES = { the:1, a:1, an:1 };

  // Verbs that move the player. The noun (if present) is treated as
  // a direction or destination keyword.
  const MOVE_VERBS = { go:1, walk:1, head:1, enter:1, follow:1, cross:1, leave:1 };

  function tokenize(input) {
    return input.toLowerCase()
      .replace(/[`'"\.,;:!\?]/g, '')
      .split(/\s+/)
      .filter(Boolean)
      .filter(t => !ARTICLES[t]);
  }

  // Split tokens around a preposition: `tokens.split('on')` returns
  // { left, right } or null if not found.
  function splitOn(tokens, prep) {
    const i = tokens.indexOf(prep);
    if (i === -1) return null;
    return { left: tokens.slice(0, i), right: tokens.slice(i + 1) };
  }

  // Match a noun phrase against scenery / items / npcs in the current
  // scope. Returns { id, kind } where kind is 'item'|'npc'|'scenery'.
  function resolveNoun(phrase, state, scope) {
    if (!phrase) return null;
    const text = phrase.join(' ');
    if (!text) return null;

    // Search order:
    //   inventory (always)
    //   here items
    //   here NPCs   — before scenery, so naming a creature ("magpie", "spring")
    //                 resolves to it rather than to a scenery alias that merely
    //                 contains the word (e.g. the "magpie nest").
    //   here scenery (also ITEMS table — chest, signpost, etc.)
    const loc = LOCATIONS[state.location];
    const hereItems = (loc.items || []).filter(id => !state.removedItems[loc.id + '/' + id]);
    const hereScenery = loc.scenery || [];
    const hereNpcIds = npcsAt(state, state.location);
    // Items the player has acquired via combos or rewards (e.g. golden_locket) at this location:
    const extras = state.locationItems[loc.id] || [];

    function tryMatch(idList, table, kind) {
      for (const id of idList) {
        const entry = table[id];
        if (!entry) continue;
        const aliases = entry.aliases || [entry.name];
        for (const a of aliases) {
          if (a === text || a.indexOf(text) !== -1 || text.indexOf(a) !== -1) {
            return { id, kind };
          }
        }
      }
      return null;
    }

    if (scope === 'inventory' || scope === 'both') {
      const r = tryMatch(state.inventory, ITEMS, 'item');
      if (r) return r;
    }
    if (scope === 'here' || scope === 'both') {
      const r1 = tryMatch(hereItems.concat(extras), ITEMS, 'item');
      if (r1) return r1;
      const r2 = tryMatch(hereNpcIds, NPCS, 'npc');
      if (r2) return r2;
      const r3 = tryMatch(hereScenery, ITEMS, 'scenery');
      if (r3) return r3;
    }
    return null;
  }

  // ────────────────────────────────────────────────────────────
  // Resource ticking
  // ────────────────────────────────────────────────────────────
  // Tick stamina / daylight. Warnings are pushed onto state._pendingTickLines
  // and drained centrally at the end of parse(), so handlers don't have to
  // care whether they used the return value.
  function tickResources(state, costMap) {
    state.resources.stamina  = Math.max(0, state.resources.stamina  - (costMap.stamina  || 0));
    state.resources.daylight = Math.max(0, state.resources.daylight - (costMap.daylight || 0));

    if (!state._pendingTickLines) state._pendingTickLines = [];

    if (state.resources.daylight <= 30 && !state.flags.duskWarned && state.resources.daylight > 0) {
      state.flags.duskWarned = true;
      state._pendingTickLines.push(dim("the light is going thin. dusk soon."));
    }
    if (state.resources.daylight === 0 && !state.flags.nightFell) {
      state.flags.nightFell = true;
      state._pendingTickLines.push(dim("night falls. the woods rearrange themselves around the things that move."));
    }
  }

  function drainTickLines(state) {
    if (!state._pendingTickLines || !state._pendingTickLines.length) return [];
    return state._pendingTickLines.splice(0);
  }

  // Death handling. Returns { lines, done } — done only on second death.
  function handleDeath(state, reason) {
    if (!state.flags.deathSpent) {
      state.flags.deathSpent = true;
      // Drop a non-quest item.
      const questItems = ['melody_pebble', 'silver_leaf', 'golden_locket', 'lit_lantern', 'engraved_token'];
      const droppable = state.inventory.filter(id => questItems.indexOf(id) === -1);
      let droppedLine = null;
      if (droppable.length) {
        const dropped = pickFrom(state, droppable);
        removeItem(state, dropped);
        droppedLine = "somewhere along the rewind you lose " + ITEMS[dropped].name + ".";
      }
      state.location = 'edge_of_woods';
      state.resources.stamina  = 30;
      state.resources.daylight = Math.max(60, state.resources.daylight);
      const out = [
        blank(),
        line("the forest folds you back into its dream."),
        line("you wake at the edge of the woods. the wind is going the other way now."),
      ];
      if (droppedLine) out.push(dim(droppedLine));
      out.push(blank());
      out.push.apply(out, LOCATIONS[state.location].describe(state));
      state.visits[state.location] = (state.visits[state.location] || 0) + 1;
      return { lines: out, done: false };
    }
    // Second death: real game over. Latch a flag so parse() knows the run is
    // finished and only restart/load/quit are meaningful from here.
    state.flags.gameOver = true;
    return {
      lines: [
        blank(),
        line("the woods close. quietly, the way a book closes."),
        dim("(type `restart` to begin again, `load` to return to your save, or `quit` to leave.)"),
      ],
      done: false,
      pendingGameOver: true,
    };
  }

  // ────────────────────────────────────────────────────────────
  // Verb handlers. Each returns { lines, state, done?, ended? }.
  // ────────────────────────────────────────────────────────────

  function emitLocation(state) {
    const loc = LOCATIONS[state.location];
    const out = loc.describe(state);

    // A line of weather / time-of-day mood, unless it's too dark to perceive much.
    if (!(loc.requiresLight && state.resources.daylight <= 0 && !has(state, 'lit_lantern'))) {
      const wl = weatherLine(state);
      if (wl) out.push(wl);
    }

    // List visible items.
    const items = (loc.items || []).filter(id => !state.removedItems[loc.id + '/' + id]);
    const extras = state.locationItems[loc.id] || [];
    const visible = items.concat(extras);
    if (visible.length) {
      out.push(dim("you see: " + visible.map(id => tItem(ITEMS[id].name)).join(', ') + "."));
    }
    const npcsHere = npcsAt(state, state.location);
    if (npcsHere.length) {
      out.push(dim("here: " + npcsHere.map(id => NPCS[id].name).join(', ') + "."));
    }
    // A canonical, scannable list of the ways out (passable exits only).
    const dirs = exitDirs(state, loc);
    if (dirs.length) {
      out.push(dim("exits: " + dirs.map(tDir).join(', ') + "."));
    }
    return out;
  }

  // The currently-passable exit directions from a location, in a stable order.
  const DIR_ORDER = ['north', 'east', 'south', 'west', 'up', 'down'];
  function exitDirs(state, loc) {
    const present = Object.keys(loc.exits || {}).filter(d => resolveExit(loc.exits[d], state).destId);
    const ordered = DIR_ORDER.filter(d => present.indexOf(d) !== -1);
    const extra = present.filter(d => DIR_ORDER.indexOf(d) === -1);
    return ordered.concat(extra);
  }

  // A slower, deeper read of the current place — pure atmosphere, no item
  // list. Each location carries an `ambient` array of lines for this.
  function ambientLines(state) {
    const loc = LOCATIONS[state.location];
    if (loc.requiresLight && state.resources.daylight <= 0 && !has(state, 'lit_lantern')) {
      return [dim("it is too dark to take in much more than shapes and the cold.")];
    }
    const lines = loc.ambient || [];
    if (!lines.length) return [line("you take a slower look. the woods give up nothing new just now.")];
    return lines.map(t => line(t));
  }

  function handleLook(rest, state) {
    // "look around" / "look about" → the deeper, ambient read of the scene.
    if (rest.length && (rest[0] === 'around' || rest[0] === 'about' || rest[0] === 'round')) {
      tickResources(state, { stamina: 1, daylight: 1 });
      return { lines: ambientLines(state), state };
    }
    if (rest.length === 0) {
      tickResources(state, { stamina: 1, daylight: 1 });
      const out = emitLocation(state);
      return { lines: out, state };
    }
    // "look at X" — the "at" is already stripped by tokenize? actually not,
    // it's still there. Drop it if present.
    if (rest[0] === 'at' || rest[0] === 'into' || rest[0] === 'on') rest = rest.slice(1);
    const noun = resolveNoun(rest, state, 'both');
    tickResources(state, { stamina: 1, daylight: 1 });
    if (!noun) return { lines: [err("you don't see anything like that here." + nounSuggestion(rest, state, 'both'))], state };
    if (noun.kind === 'item' || noun.kind === 'scenery') {
      return { lines: [line(ITEMS[noun.id].description)], state };
    }
    if (noun.kind === 'npc') {
      const npc = NPCS[noun.id];
      // Reuse greet as "examine" — gentle reveal of state.
      return { lines: npc.greet(state), state };
    }
    return { lines: [err("you don't see anything like that here.")], state };
  }

  // Move one item id from the floor into the inventory. Returns the report line.
  function takeOne(itemId, state) {
    addItem(state, itemId);
    state.removedItems[state.location + '/' + itemId] = true;
    const extras = state.locationItems[state.location];
    if (extras) {
      const i = extras.indexOf(itemId);
      if (i !== -1) extras.splice(i, 1);
    }
    return line("taken: " + iname(itemId) + ".");
  }
  // The ids of takeable items lying in the open at the current location.
  function takeableHere(state) {
    const loc = LOCATIONS[state.location];
    const floor = (loc.items || []).filter(id => !state.removedItems[loc.id + '/' + id]);
    const extras = state.locationItems[loc.id] || [];
    return floor.concat(extras).filter(id => ITEMS[id] && ITEMS[id].takeable !== false);
  }

  function handleTake(rest, state) {
    if (rest.length === 0) return { lines: [err("take what?")], state };

    // `take all` / `take everything` — sweep up the open items here.
    if (rest[0] === 'all' || rest[0] === 'everything') {
      const ids = takeableHere(state).filter(id => !has(state, id));
      if (!ids.length) return { lines: [line("there is nothing here to take.")], state };
      const out = ids.map(id => takeOne(id, state));
      tickResources(state, { stamina: 2, daylight: 1 });
      if (window.cgSound && window.cgSound.isEnabled()) window.cgSound.chime();
      return { lines: out, state };
    }

    const noun = resolveNoun(rest, state, 'here');
    if (!noun) return { lines: [err("you don't see that here." + nounSuggestion(rest, state, 'here'))], state };

    if (noun.kind === 'npc')   return { lines: [err("you can't take " + NPCS[noun.id].name + ".")], state };
    if (noun.kind === 'scenery') {
      const it = ITEMS[noun.id];
      if (!it.takeable) return { lines: [err("you can't take that.")], state };
    }
    if (has(state, noun.id)) return { lines: [line("you already have it.")], state };

    const reportLine = takeOne(noun.id, state);
    tickResources(state, { stamina: 2, daylight: 1 });
    if (window.cgSound && window.cgSound.isEnabled()) window.cgSound.chime();
    return { lines: [reportLine], state };
  }

  function handleDrop(rest, state) {
    if (rest.length === 0) return { lines: [err("drop what?")], state };
    const noun = resolveNoun(rest, state, 'inventory');
    if (!noun) return { lines: [err("you don't have that.")], state };
    removeItem(state, noun.id);
    // Add to locationItems so it's recoverable.
    if (!state.locationItems[state.location]) state.locationItems[state.location] = [];
    state.locationItems[state.location].push(noun.id);
    delete state.removedItems[state.location + '/' + noun.id];
    tickResources(state, { stamina: 1, daylight: 1 });
    return { lines: [line("you set down " + ITEMS[noun.id].name + ".")], state };
  }

  function handleUse(rest, state) {
    // Forms: `use X` (no target), `use X on Y`, `use X with Y`,
    //        `combine X with Y`, `combine X and Y`.
    if (rest.length === 0) return { lines: [err("use what?")], state };
    let parts = splitOn(rest, 'on') || splitOn(rest, 'with') || splitOn(rest, 'and');
    if (!parts) return { lines: [err("use it on what? try `use X on Y`.")], state };

    const left  = resolveNoun(parts.left,  state, 'both');
    const right = resolveNoun(parts.right, state, 'both');
    if (!left)  return { lines: [err("you don't have " + parts.left.join(' ') + ".")], state };
    if (!right) return { lines: [err("you don't see " + parts.right.join(' ') + " here.")], state };

    // Both items: look up in COMBINATIONS.
    const key = comboKey(left.id, right.id);
    const combo = COMBINATIONS[key];
    tickResources(state, { stamina: 2, daylight: 1 });
    if (!combo) return { lines: [line("nothing in particular happens.")], state };

    const out = [line(combo.message)];
    if (combo.consumes) {
      for (const id of combo.consumes) {
        if (has(state, id)) removeItem(state, id);
      }
    }
    if (combo.result) {
      addItem(state, combo.result);
      out.push(dim("(you now have " + iname(combo.result) + ".)"));
    }
    if (combo.addItems) {
      for (const id of combo.addItems) {
        addItem(state, id);
        out.push(dim("(you take " + iname(id) + ".)"));
      }
    }
    if (combo.sets) {
      for (const k in combo.sets) state.flags[k] = combo.sets[k];
      // Story beats worth remembering at the end.
      if (combo.sets.chestOpen) markSecret(state, 'chest');
      if (combo.sets.resonance) markSecret(state, 'resonance');
      if (combo.sets.lampLit)   markSecret(state, 'lantern');
    }
    if (window.cgSound && window.cgSound.isEnabled()) window.cgSound.chime();

    // Ending B trigger.
    if (state.flags.resonance && !state.flags.endedB) {
      state.flags.endedB = true;
      markSecret(state, 'ending_b');
      recordEnding('B', state);
      out.push(blank());
      out.push(line("the resonance does not stop. the four notes braid into eight, then sixteen, then a forest's worth."));
      out.push(line("you turn from the path, the song already with you, and walk deeper than the woods know how to be."));
      out.push(blank());
      out.push(line("— Ending B · The Wanderer's Choice —", 'win'));
      out.push.apply(out, scoreLines(state));
      out.push(dim("(type `restart` to play again, or `quit` to leave.)"));
      if (window.cgSound && window.cgSound.isEnabled()) window.cgSound.melody([523, 587, 659, 880, 1047], 150);
      return { lines: out, state, ended: 'B' };
    }

    // Ending D — the true ending. A kindled shrine AND the carpenter's locket
    // given to it reunites the carver and the wife who waited in the bark.
    if (state.flags.shrineKindled && state.flags.locketGiven && !state.flags.endedD) {
      state.flags.endedD = true;
      markSecret(state, 'ending_d');
      recordEnding('D', state);
      out.push(blank());
      out.push(line("the ember's light and the portrait's face find each other across all the years between them."));
      out.push(line("the offering grown deepest into the bark — the shape that was almost a woman — loosens, the way a held breath loosens, and out of the hollow oak steps a man with sawdust still in his hair, as though he had only gone out for more wood."));
      out.push(line("they do not speak. they do not need to. the woods, which have been waiting longer than you can hold in your head, let them go."));
      out.push(line("you set down the last thing you were carrying. you are not lost. you were never the one who was lost."));
      out.push(blank());
      out.push(line("— Ending D · The Carpenter's Return —", 'win'));
      out.push(dim("(a true ending. the woods will remember this one.)"));
      out.push.apply(out, scoreLines(state));
      out.push(dim("(type `restart` to play again, or `quit` to leave.)"));
      if (window.cgSound && window.cgSound.isEnabled()) window.cgSound.melody([392, 523, 659, 784, 1047, 784, 659, 523], 150);
      return { lines: out, state, ended: 'D' };
    }

    // Ending C trigger — the cold ember given a home in the shrine. But if the
    // player is carrying the carpenter's locket, hold off and point them at the
    // truer ending instead of ending here.
    if (state.flags.shrineKindled && !state.flags.endedC && !state.flags.endedD) {
      if (has(state, 'golden_locket')) {
        out.push(blank());
        out.push(dim("the faded portrait in the locket catches the new light — the altar seems, somehow, to want it. (try `use locket on altar`.)"));
        return { lines: out, state };
      }
      state.flags.endedC = true;
      markSecret(state, 'ending_c');
      recordEnding('C', state);
      out.push(blank());
      out.push(line("the offerings in the bark glow, each one, a small held light — a button, a tooth, a ring — and last of all the wisp's own ember, home."));
      out.push(line("you did not rest, and you did not vanish into the song. you carried a light to where a light was needed, and left it. that is its own kind of arriving."));
      out.push(line("you walk back out under the oaks. behind you the mist does not close. it has a lamp to keep now."));
      out.push(blank());
      out.push(line("— Ending C · The Light Kept —", 'win'));
      out.push.apply(out, scoreLines(state));
      out.push(dim("(type `restart` to play again, or `quit` to leave.)"));
      if (window.cgSound && window.cgSound.isEnabled()) window.cgSound.melody([392, 466, 587, 784, 587, 392], 160);
      return { lines: out, state, ended: 'C' };
    }
    return { lines: out, state };
  }

  function handleTalk(rest, state) {
    // Forms: `talk to X`, `talk X`, `speak to X`, `greet X`.
    if (rest[0] === 'to' || rest[0] === 'with') rest = rest.slice(1);
    if (rest.length === 0) return { lines: [err("talk to whom?")], state };
    const noun = resolveNoun(rest, state, 'here');
    if (!noun || noun.kind !== 'npc') return { lines: [err("there is no one like that here.")], state };
    const npc = NPCS[noun.id];
    tickResources(state, { stamina: 2, daylight: 1 });
    const lines = npc.greet(state);
    // The hermit offers a branching reply you steer with a number.
    if (npc.id === 'hermit') return offerHermitChoices(state, lines);
    return { lines, state };
  }

  // ── Branching dialogue ──────────────────────────────────────
  // A choice prompt sets state.pending; parse() routes the next number here.
  function offerHermitChoices(state, greetLines) {
    const options = [
      { n: 1, label: 'sit with him a while',             action: 'sit' },
      { n: 2, label: 'ask why he waits',                  action: 'why' },
      { n: 3, label: 'say nothing, and watch the fire',   action: 'silent' },
    ];
    state.pending = { type: 'choice', npcId: 'hermit', options: options };
    const out = greetLines.slice();
    out.push(blank());
    options.forEach(o => out.push(line('  ' + o.n + ') ' + o.label, 'choice')));
    out.push(dim('(type a number, or `cancel`.)'));
    return { lines: out, state };
  }
  function resolveChoice(state, npcId, action) {
    if (npcId === 'hermit') return hermitChoice(state, action);
    return { lines: [dim('(nothing comes of it.)')], state };
  }
  function hermitChoice(state, action) {
    const ns = state.npc.hermit;
    if (action === 'sit') {
      ns.mood = 'friendly';
      ns.trust = (ns.trust || 0) + 1;
      return { lines: [
        npcSay('you sit. the fire is exactly as warm as it needs to be, and asks nothing of you.'),
        npcSay('"good," the hermit says, to no one in particular. "the woods trust a thing that knows how to stay a moment."'),
      ], state };
    }
    if (action === 'why') {
      ns.trust = (ns.trust || 0) + 1;
      return { lines: [
        npcSay('"i waited for someone. then i forgot who. then the waiting became the thing i did, and the someone stopped mattering."'),
        npcSay('"don\'t pity it. it is a good way to spend a forest."'),
      ], state };
    }
    if (action === 'silent') {
      ns.trust = Math.max(0, (ns.trust || 0) - 1);
      if (ns.trust === 0) ns.mood = 'wary';
      return { lines: [
        npcSay('you say nothing. the hermit nods, as though silence were also an answer, and turns back to the fire.'),
      ], state };
    }
    return { lines: [dim('(the moment passes.)')], state };
  }

  function handleAsk(rest, state) {
    // Form: `ask X about Y` (about may be omitted).
    if (rest.length === 0) return { lines: [err("ask whom about what?")], state };
    const parts = splitOn(rest, 'about');
    let npcName, topicName;
    if (parts) { npcName = parts.left.join(' '); topicName = parts.right.join(' '); }
    else       { npcName = rest[0];               topicName = rest.slice(1).join(' '); }

    const noun = resolveNoun(npcName.split(' '), state, 'here');
    if (!noun || noun.kind !== 'npc') return { lines: [err("there is no one like that here.")], state };
    const npc = NPCS[noun.id];
    tickResources(state, { stamina: 2, daylight: 1 });

    if (!topicName) return { lines: npc.greet(state), state };

    // Special: oracle handles any topic.
    if (npc.id === 'oracle') {
      const knownTopics = ['melody','hermit','forest','magpie','chest','workshop','key','spring','self','ending','myself','me','wisp','bog','shrine','weather'];
      let t = topicName.replace(/\s+/g, '_');
      if (t === 'myself' || t === 'me') t = 'self';
      if (t === 'light' || t === 'will-o-wisp') t = 'wisp';
      if (t === 'mire' || t === 'marsh' || t === 'swamp') t = 'bog';
      if (t === 'oak' || t === 'hollow_oak' || t === 'altar') t = 'shrine';
      if (knownTopics.indexOf(t) === -1) t = 'default';
      return { lines: npc.topics._any(state, t), state };
    }

    // Other NPCs: look up topic in topics map.
    let topicKey = topicName.replace(/\s+/g, '_');
    // Common aliases.
    const aliasMap = {
      myself: 'yourself', self: 'yourself', me: 'yourself',
      song: 'melody', tune: 'melody', music: 'melody',
      pebble: 'melody', humming_pebble: 'melody',
      woods: 'forest', trees: 'forest',
      will_o_wisp: 'light', glow: 'light', flame: 'light',
      mire: 'bog', marsh: 'bog', swamp: 'bog',
      oak: 'shrine', hollow_oak: 'shrine', altar: 'shrine',
      ember: 'fire', coal: 'fire', campfire: 'fire',
    };
    if (aliasMap[topicKey]) topicKey = aliasMap[topicKey];
    const topicFn = npc.topics[topicKey];
    if (typeof topicFn === 'function') return { lines: topicFn(state), state };
    return { lines: [npcSay("\"" + topicName + "?\" — " + npc.name + " gives you nothing.")], state };
  }

  function handleGive(rest, state) {
    // Form: `give X to Y`.
    const parts = splitOn(rest, 'to');
    if (!parts) return { lines: [err("give what, to whom? try `give X to Y`.")], state };
    const item = resolveNoun(parts.left,  state, 'inventory');
    const npc  = resolveNoun(parts.right, state, 'here');
    if (!item) return { lines: [err("you don't have " + parts.left.join(' ') + ".")], state };
    if (!npc || npc.kind !== 'npc') return { lines: [err("there is no one like that here.")], state };

    const npcObj = NPCS[npc.id];
    tickResources(state, { stamina: 2, daylight: 1 });
    const out = npcObj.onGive(item.id, state);

    // Ending A trigger: silver_leaf to hermit.
    if (state.flags.gaveSilverLeafToHermit && !state.flags.endedA) {
      state.flags.endedA = true;
      markSecret(state, 'ending_a');
      recordEnding('A', state);
      out.push(blank());
      out.push(line("the fire takes the gift quietly. the hermit's robe loses a leaf, and gains one."));
      out.push(line("\"sit,\" he says. \"it knows you now.\""));
      // A warmer farewell if you took the time to know him.
      if ((state.npc.hermit.trust || 0) >= 2) {
        out.push(line("\"i am glad it was you,\" he adds, which is not a thing he says to many. \"you sat. you asked. that is most of what waiting is for.\""));
      }
      out.push(line("you sit. for the first time since you came into the woods, you are not walking."));
      out.push(blank());
      out.push(line("— Ending A · The Returned Path —", 'win'));
      out.push.apply(out, scoreLines(state));
      out.push(dim("(type `restart` to play again, or `quit` to leave.)"));
      if (window.cgSound && window.cgSound.isEnabled()) window.cgSound.melody([523, 494, 440, 392], 170);
      return { lines: out, state, ended: 'A' };
    }
    return { lines: out, state };
  }

  // Resolve a raw exit value (string id, or a function returning
  // { to, msg }) into { destId, guardMsg }.
  function resolveExit(exitVal, state) {
    if (typeof exitVal === 'function') {
      const r = exitVal(state) || {};
      return { destId: r.to || null, guardMsg: r.msg || null };
    }
    return { destId: exitVal || null, guardMsg: null };
  }

  function handleGo(rest, state) {
    if (rest[0] === 'to' || rest[0] === 'into') rest = rest.slice(1);
    if (rest.length === 0) return { lines: [err("go where?")], state };
    const word = rest.join(' ');

    const loc = LOCATIONS[state.location];

    // `back` / `go back` — return the way you came, if it is still an exit.
    if (word === 'back') {
      const prev = state.meta.prevLocation;
      if (!prev) return { lines: [err("there is no back yet — you have only just arrived.")], state };
      const connected = Object.keys(loc.exits).some(d => resolveExit(loc.exits[d], state).destId === prev);
      if (!connected) return { lines: [err("the way back is not the way you would think. no path leads there from here.")], state };
      return moveTo(prev, state);
    }

    // Direction aliases first.
    const dirAliases = {
      north:'north', n:'north',
      south:'south', s:'south',
      east:'east',   e:'east',
      west:'west',   w:'west',
      up:'up', u:'up', climb:'up',
      down:'down', d:'down', descend:'down',
    };
    let dir = dirAliases[word] || dirAliases[rest[0]];

    let destId = null, guardMsg = null;
    if (dir && loc.exits[dir] != null) {
      const r = resolveExit(loc.exits[dir], state);
      destId = r.destId; guardMsg = r.guardMsg;
    } else if (!dir) {
      // Try matching by destination location name keywords.
      for (const d in loc.exits) {
        const r = resolveExit(loc.exits[d], state);
        if (!r.destId) continue;
        const target = LOCATIONS[r.destId];
        const keys = [target.id.replace(/_/g, ' '), target.title.toLowerCase()];
        if (keys.some(k => k.indexOf(word) !== -1 || word.indexOf(k) !== -1)) {
          destId = r.destId; guardMsg = r.guardMsg;
          break;
        }
      }
    }
    if (!destId) {
      if (guardMsg) return { lines: [err(guardMsg)], state };
      return { lines: [err("no path that way.")], state };
    }
    return moveTo(destId, state);
  }

  // Perform the actual move to destId, with light gating, resource tick,
  // death routing, and a chance of a wandering event.
  function moveTo(destId, state) {
    const dest = LOCATIONS[destId];
    if (dest.requiresLight && state.resources.daylight <= 0 && !has(state, 'lit_lantern')) {
      return { lines: [err("it is too dark to go that way without a light.")], state };
    }

    const firstVisit = !state.visits[destId];
    state.meta.prevLocation = state.location;
    state.location = destId;
    state.visits[destId] = (state.visits[destId] || 0) + 1;
    tickResources(state, { stamina: 3, daylight: 2 });

    if (state.resources.stamina <= 0) {
      const death = handleDeath(state, 'stamina');
      return { lines: death.lines, state, done: death.done, pendingGameOver: death.pendingGameOver };
    }

    // The magpie may have moved while you walked; resolve before describing.
    const roamNote = roamNpcs(state);
    const out = emitLocation(state);
    if (roamNote) out.push(roamNote);
    // A wandering event, sometimes, on a room you've seen before.
    if (!firstVisit) {
      const ev = maybeWanderingEvent(state);
      if (ev) out.push(ev);
    }
    return { lines: out, state };
  }

  // ── Roaming NPCs ────────────────────────────────────────────
  // The magpie wanders its corner of the woods (the pine hub) rather than
  // sitting in one tree. Its live position lives in state.npc.magpie.location.
  const MAGPIE_TERRITORY = ['pine_grove', 'mossy_clearing', 'treetop_roost', 'sunken_workshop'];
  function roamNpcs(state) {
    const ns = state.npc && state.npc.magpie;
    if (!ns || !ns.location) return null;
    // It stays on its nest until you've met it, so first discovery at the
    // pine grove is reliable; only then does it start wandering its corner.
    if (!ns.met) return null;
    // Less restless once it has its trinket from you.
    if (nextRandom(state) > (ns.traded ? 0.15 : 0.30)) return null;
    const from = ns.location;
    const opts = (buildAdjacency(state)[from] || []).filter(id => MAGPIE_TERRITORY.indexOf(id) !== -1);
    if (!opts.length) return null;
    const to = pickFrom(state, opts);
    if (to === from) return null;
    ns.location = to;
    if (to === state.location)   return dim("the magpie drops out of the canopy and lands nearby, eyeing you sidelong.");
    if (from === state.location) return dim("the magpie takes off in a clatter of wings and is gone through the pines.");
    return null;
  }

  // ── Wandering events ────────────────────────────────────────
  // Flavor-first interludes that fire on a fraction of moves into
  // already-seen rooms. Some are weather-gated. They never cost the
  // player anything; each one counted as a small wonder in the tally.
  const WANDER_EVENTS = [
    { weather: null,   line: "A deer steps onto the path ahead, regards you without alarm, and is gone between two breaths." },
    { weather: null,   line: "Somewhere close a branch settles with a sound like a held word finally let go." },
    { weather: null,   line: "A magpie — perhaps the magpie — crosses overhead, trailing one harsh remark." },
    { weather: 'mist', line: "The mist thickens for a moment into almost a shape, almost a face, then thins again into only weather." },
    { weather: 'mist', line: "Out in the white, something the size of a person passes, parallel to you, and does not come closer." },
    { weather: 'rain', line: "The rain finds a new way through the canopy and lays a cold line straight down your spine." },
    { weather: 'rain', line: "A run of rain over far leaves makes, for four notes, the melody — then forgets it." },
    { weather: 'clear', line: "A single coin of sun moves across the ground, slow as an hour, and you watch it the whole way." },
  ];
  function maybeWanderingEvent(state) {
    if (state.resources.stamina <= 0) return null;
    if (nextRandom(state) > 0.28) return null; // ~28% of revisited-room moves
    const w = state.weather || 'clear';
    const pool = WANDER_EVENTS.filter(e => !e.weather || e.weather === w);
    if (!pool.length) return null;
    const e = pickFrom(state, pool);
    state.found.events = (state.found.events || 0) + 1;
    return dim(e.line);
  }

  function handleInventory(rest, state) {
    if (state.inventory.length === 0) {
      return { lines: [line("your hands are empty. your pockets, emptier.")], state };
    }
    const n = state.inventory.length;
    const out = [room('· what you carry ·')];
    state.inventory.forEach(id => out.push(line("  · " + iname(id))));
    out.push(dim("(" + n + (n === 1 ? " thing" : " things") + ".)"));
    return { lines: out, state };
  }

  function handleStats(rest, state) {
    const r = state.resources;
    const bar = (n) => {
      const filled = Math.round(n / 10);
      return '[' + '#'.repeat(filled) + '·'.repeat(10 - filled) + '] ' + n;
    };
    const itemsFound = Object.keys((state.found && state.found.items) || {}).length;
    return { lines: [
      line("stamina:  " + bar(r.stamina)),
      line("daylight: " + bar(r.daylight) + "  (" + timeOfDay(state) + ", " + (state.weather || 'clear') + ")"),
      dim("turn " + state.meta.turnCount + " · location: " + LOCATIONS[state.location].title),
      dim("found " + itemsFound + " things · " + ((state.found && state.found.events) || 0) + " small wonders"),
      dim("seed " + (state.seed != null ? state.seed : '—')),
    ], state };
  }

  // ── Minimap ──────────────────────────────────────────────────
  // Short labels for the map cells. Anything not yet visited renders
  // as dots, so the map doubles as a record of where you have been.
  const MAP_SHORT = {
    edge_of_woods: 'edge',
    mossy_clearing: 'moss',
    brook_crossing: 'brook',
    pine_grove: 'pine',
    hermit_hollow: 'hermit',
    echo_spring: 'spring',
    oracle_stone: 'oracle',
    sunken_workshop: 'workshop',
    misty_bog: 'bog',
    oak_shrine: 'shrine',
    treetop_roost: 'treetop',
  };
  // A 12-char cell: "[ label__ ]". Current location uses < > instead of [ ].
  // Only ever called for rooms the player has visited.
  function mapNode(id, state) {
    const here = state.location === id;
    let label = (MAP_SHORT[id] || id).slice(0, 8);
    label = label + ' '.repeat(8 - label.length);
    return (here ? '<' : '[') + ' ' + label + ' ' + (here ? '>' : ']');
  }
  // Place [col, text] pieces onto one row, padding gaps with spaces.
  function placeRow(placements) {
    let row = '';
    placements.slice().sort((a, b) => a[0] - b[0]).forEach(p => {
      if (row.length < p[0]) row += ' '.repeat(p[0] - row.length);
      row += p[1];
    });
    return row;
  }
  function handleMap(rest, state) {
    const seen = id => !!state.visits[id];
    // A room cell only if visited; a connector only if both ends are visited.
    // So the map reveals nothing the player has not already walked to.
    const nd = (col, id) => seen(id) ? [col, mapNode(id, state)] : null;
    const conn = (col, text, a, b) => (seen(a) && seen(b)) ? [col, text] : null;
    const compact = arr => arr.filter(Boolean);
    // Four schematic columns: W(west wing) L(pine stack) C(spine) R(east wing).
    // Centres (col + 6) carry the vertical connectors.
    let rows = [
      [nd(36, 'oracle_stone')],
      [conn(42, '|', 'oracle_stone', 'brook_crossing')],
      [nd(2, 'oak_shrine'), nd(18, 'sunken_workshop'), nd(36, 'brook_crossing'), conn(48, '------', 'brook_crossing', 'echo_spring'), nd(54, 'echo_spring')],
      [conn(8, '|', 'oak_shrine', 'misty_bog'), conn(24, '|', 'sunken_workshop', 'pine_grove'), conn(42, '|', 'brook_crossing', 'mossy_clearing')],
      [nd(2, 'misty_bog'), conn(14, '----', 'misty_bog', 'pine_grove'), nd(18, 'pine_grove'), conn(30, '------', 'pine_grove', 'mossy_clearing'), nd(36, 'mossy_clearing'), conn(48, '------', 'mossy_clearing', 'hermit_hollow'), nd(54, 'hermit_hollow')],
      [conn(24, '|', 'pine_grove', 'treetop_roost'), conn(42, '|', 'mossy_clearing', 'edge_of_woods')],
      [nd(18, 'treetop_roost'), nd(36, 'edge_of_woods')],
    ].map(r => placeRow(compact(r)));
    // Trim blank rows from the top and bottom so the map stays compact.
    while (rows.length && rows[0].trim() === '') rows.shift();
    while (rows.length && rows[rows.length - 1].trim() === '') rows.pop();

    const out = [room('· the woods, so far ·'), blank()];
    rows.forEach(r => out.push(line(r, 'room', true)));
    out.push(blank());
    out.push(dim('< > here   [ ] walked'));
    out.push(dim('you are at: ' + LOCATIONS[state.location].title + '.'));
    return { lines: out, state };
  }

  function handleRest(rest, state) {
    state.resources.stamina  = Math.min(100, state.resources.stamina + 30);
    tickResources(state, { daylight: 5 });
    return { lines: [line("you sit on a stone and breathe. stamina returns a little.")], state };
  }

  function handleSleep(rest, state) {
    if (state.location !== 'hermit_hollow') {
      return { lines: [err("you cannot sleep here. you would dream the wrong dream.")], state };
    }
    state.resources.stamina = 100;
    state.resources.daylight = 100;
    state.flags.duskWarned = false;
    state.flags.nightFell = false;
    state.flags.usedSleep = true;
    return { lines: [
      line("the hermit hums, and you sleep beside his fire."),
      line("when you wake, the woods are new, and a full day waits for you."),
    ], state };
  }

  function handleWait(rest, state) {
    tickResources(state, { daylight: 5 });
    return { lines: [line("time passes. the trees do not.")], state };
  }

  function handleListen(rest, state) {
    if (state.location === 'echo_spring' && !state.flags.learnedMelody) {
      state.flags.learnedMelody = true;
      markSecret(state, 'melody');
      addItem(state, 'melody_pebble');
      if (window.cgSound && window.cgSound.isEnabled()) window.cgSound.melody();
      return { lines: [
        line("you sit. you do not try to listen. the four notes come."),
        line("the water shapes a hand and lays a small pebble on the moss beside you."),
        dim("(you take a humming pebble.)"),
      ], state };
    }
    return { lines: [line("you listen. the woods make their usual unhurried noise.")], state };
  }

  function handleSmell(rest, state) {
    return { lines: [line("cold earth, pine, the underside of leaves.")], state };
  }

  function handleSave(rest, state) {
    save(state);
    return { lines: [dim("(saved.)")], state };
  }

  function handleLoad(rest, state) {
    const loaded = load();
    if (!loaded) return { lines: [err("no save found.")], state };
    return { lines: [].concat([dim("(loaded.)")], emitLocation(loaded)), state: loaded };
  }

  function handleQuit(rest, state) {
    return { lines: [line("you turn back. the trees do not mind."), blank()], state, done: true };
  }

  function handleRestart(rest, state) {
    clearSave();
    const s = freshState();
    incPlays();
    return { lines: [].concat([dim("(restarted.)"), blank()], intro(s), emitLocation(s)), state: s };
  }

  function handleHelp(rest, state) {
    const W1 = 22, W2 = 35;
    const pad = (s, w) => s + ' '.repeat(Math.max(0, w - s.length));
    const row = (a, b) => line('│ ' + pad(a, W1) + ' │ ' + pad(b, W2) + ' │');
    const hbar = (lc, mc, rc) =>
      line(lc + '─'.repeat(W1 + 2) + mc + '─'.repeat(W2 + 2) + rc);
    return { lines: [
      room("— actions —"),
      hbar('┌', '┬', '┐'),
      row('action',              'what it does'),
      hbar('├', '┼', '┤'),
      row('look [at X]',         'examine the scene or a thing'),
      row('look around',         'take the place in slowly'),
      row('take X · drop X',     'pick up or set down an item'),
      row('use X on Y',          'combine two items'),
      row('talk to X',           'greet a character'),
      row('ask X about Y',       'ask a character about a topic'),
      row('give X to Y',         'offer an item to a character'),
      row('go <dir> · n s e w',  'move in a direction'),
      row('inventory · i',       'list what you carry'),
      row('map',                 'sketch the woods you have walked'),
      row('travel <place>',      'walk straight to a known place'),
      row('journal · j',         'what you have done and what waits'),
      row('endings',             'endings & achievements you have found'),
      row('stats',               'show stamina, daylight, turn, seed'),
      row('listen · smell',      'perceive in another way'),
      row('brief · verbose',     'shorter or fuller room text'),
      row('again · g',           'repeat your last action'),
      row('rest · sleep · wait', 'pass time, recover stamina'),
      row('save · load',         'persist or restore progress'),
      row('restart · quit',      'start over or leave the woods'),
      hbar('└', '┴', '┘'),
    ], state };
  }

  function handleHint(rest, state) {
    const hints = [];
    if (!state.flags.metHermit) hints.push("the east path from the moss-soft clearing leads to someone who has been waiting.");
    else if (!state.flags.learnedMelody) hints.push("there is a spring west of the brook. sit. do not try.");
    else if (!has(state, 'engraved_token')) hints.push("a river-stone, a mirror-shard — together they make a gift for old things.");
    else if (!state.flags.gaveTokenToOracle) hints.push("the stone north of the brook will take the token, and give back the colour of a forgotten leaf.");
    else if (!state.flags.gaveSilverLeafToHermit && !state.flags.resonance) {
      hints.push("the hermit waits for a leaf that is not from this year.");
      hints.push("(or — the locket in the carpenter's chest sings when held to a humming pebble.)");
    }
    else hints.push("you are very close. give what you've gathered, or keep it, and walk further.");
    return { lines: hints.map(h => dim('hint: ' + h)), state };
  }

  // The journal: a checklist of what has been done and what still waits.
  // Reads only from flags/inventory, so it never reveals a step before its time.
  function handleJournal(rest, state) {
    const f = state.flags;
    const box = (done) => done ? '[x] ' : '[ ] ';
    const item = (done, text) => line(box(done) + text, done ? 'dim' : 'game');
    const out = [room('· the journal ·'), blank()];

    out.push(dim("the walking, so far:"));
    out.push(item(f.metHermit, "find whoever waits in the woods"));
    out.push(item(f.learnedMelody, "learn the song the spring keeps"));
    out.push(item(f.lampLit || has(state, 'lit_lantern'), "wake a light of your own"));

    // The ways to end only surface once you've learned the song —
    // before that the woods have not yet shown you a choice.
    if (f.learnedMelody || f.endedA || f.endedB || f.endedC || f.endedD) {
      out.push(blank());
      out.push(dim("ways the walking can end:"));
      out.push(item(f.endedA, "the leaf — give the hermit a year back  (rest)"));
      out.push(item(f.endedB, "the song — make locket and pebble resonate  (wander)"));
      out.push(item(f.endedC, "the light — carry a flame to the hollow oak  (keep)"));
      // The true ending only hints itself once the bog has shown its path.
      if (f.wispLed || f.endedD) {
        out.push(item(f.endedD, "the reunion — bring the locket to the kindled shrine  (true)"));
      }
    }

    // A single, gentle current-objective pointer, borrowed from the hints.
    if (!f.endedA && !f.endedB && !f.endedC && !f.endedD) {
      const next = handleHint([], state).lines[0];
      if (next) { out.push(blank()); out.push(next); }
    }

    out.push(blank());
    out.push.apply(out, scoreLines(state));
    return { lines: out, state };
  }

  // In-game view of the durable gallery (also shown from the title menu).
  function handleGallery(rest, state) {
    return { lines: galleryLines(), state };
  }

  // `brief` / `verbose` — toggle how fully rooms describe themselves.
  function handleDesc(rest, state, input) {
    const v = (input || '').trim().toLowerCase().split(/\s+/)[0];
    state.descMode = (v === 'brief') ? 'brief' : 'full';
    return { lines: [dim(state.descMode === 'brief'
      ? "(brief: rooms will give you the short of it from now on.)"
      : "(verbose: rooms will describe themselves in full.)")], state };
  }

  // ── Fast travel ─────────────────────────────────────────────
  // Adjacency over currently-passable exits (guarded exits resolved against
  // state, so locked ways are excluded).
  function buildAdjacency(state) {
    const adj = {};
    Object.keys(LOCATIONS).forEach(id => {
      adj[id] = [];
      const exits = LOCATIONS[id].exits || {};
      Object.keys(exits).forEach(d => {
        const r = resolveExit(exits[d], state);
        if (r.destId) adj[id].push(r.destId);
      });
    });
    return adj;
  }
  // Shortest path between visited rooms only (you can't fast-travel through
  // somewhere you've never walked). Returns an array of room ids or null.
  function findPath(state, fromId, toId) {
    if (fromId === toId) return [fromId];
    const adj = buildAdjacency(state);
    const seen = id => !!state.visits[id];
    const queue = [[fromId]];
    const visited = { [fromId]: true };
    while (queue.length) {
      const path = queue.shift();
      const last = path[path.length - 1];
      for (const next of adj[last] || []) {
        if (visited[next] || !seen(next)) continue;
        const np = path.concat(next);
        if (next === toId) return np;
        visited[next] = true;
        queue.push(np);
      }
    }
    return null;
  }
  // Resolve a place phrase to a known location id (by short label or title).
  function resolvePlace(phrase) {
    const text = phrase.join(' ').toLowerCase();
    if (!text) return null;
    for (const id in LOCATIONS) {
      const keys = [
        (MAP_SHORT[id] || '').toLowerCase(),
        id.replace(/_/g, ' '),
        LOCATIONS[id].title.toLowerCase(),
      ];
      if (keys.some(k => k && (k === text || k.indexOf(text) !== -1 || text.indexOf(k) !== -1))) return id;
    }
    return null;
  }
  function handleTravel(rest, state) {
    if (rest[0] === 'to') rest = rest.slice(1);
    if (rest.length === 0) return { lines: [err("travel where? name a place you have walked.")], state };
    const destId = resolvePlace(rest);
    if (!destId) return { lines: [err("you don't know a place by that name.")], state };
    if (!state.visits[destId]) return { lines: [err("you have not walked there yet — you can only return to places you know.")], state };
    if (destId === state.location) return { lines: [line("you are already here.")], state };

    const path = findPath(state, state.location, destId);
    if (!path) return { lines: [err("you can't see a way there from here just now.")], state };

    // Walk it step by step so light-gates, costs, death, and roaming all apply.
    let out = [dim("you make your way back through the woods…")];
    let lastResult = null;
    for (let i = 1; i < path.length; i++) {
      lastResult = moveTo(path[i], state);
      if (lastResult.done || lastResult.pendingGameOver) {
        return { lines: out.concat(lastResult.lines), state, done: lastResult.done, pendingGameOver: lastResult.pendingGameOver };
      }
    }
    // Only show the final room (the intermediate rooms are already known).
    if (lastResult) out = out.concat(lastResult.lines);
    return { lines: out, state };
  }

  // `again` / `g` — re-run the last non-`again` command.
  function handleAgain(rest, state) {
    const last = state.meta.lastCommand;
    if (!last) return { lines: [err("there is nothing yet to do again.")], state };
    return parse(last, state);
  }

  // Map of verbs and their aliases → handler function.
  function buildVerbTable() {
    const map = Object.create(null);
    function reg(handler, ...verbs) { verbs.forEach(v => { map[v] = handler; }); }

    reg(handleLook,      'look', 'examine', 'inspect', 'read', 'check', 'search');
    reg(handleTake,      'take', 'get', 'pick', 'grab');
    reg(handleDrop,      'drop', 'place', 'put');
    reg(handleUse,       'use', 'combine', 'attach');
    reg(handleTalk,      'talk', 'speak', 'greet');
    reg(handleAsk,       'ask', 'tell');
    reg(handleGive,      'give', 'offer', 'hand');
    reg(handleGo,        'go', 'walk', 'head', 'enter', 'follow', 'cross', 'leave', 'climb', 'descend', 'north', 'south', 'east', 'west', 'up', 'down', 'n', 's', 'e', 'w');
    reg(handleInventory, 'inventory', 'inv', 'i');
    reg(handleMap,       'map');
    reg(handleStats,     'stats', 'status', 'state');
    reg(handleRest,      'rest', 'sit');
    reg(handleSleep,     'sleep');
    reg(handleWait,      'wait');
    reg(handleListen,    'listen', 'hear');
    reg(handleSmell,     'smell', 'sniff');
    reg(handleSave,      'save');
    reg(handleLoad,      'load');
    reg(handleQuit,      'quit', 'exit', 'q');
    reg(handleRestart,   'restart', 'reset');
    reg(handleHelp,      'help', '?');
    reg(handleHint,      'hint');
    reg(handleJournal,   'journal', 'log', 'quests', 'objectives', 'j');
    reg(handleAgain,     'again', 'g', 'repeat');
    reg(handleGallery,   'endings', 'achievements', 'gallery', 'trophies');
    reg(handleTravel,    'travel', 'goto', 'journey');
    reg(handleDesc,      'brief', 'verbose');
    return map;
  }
  const VERBS = buildVerbTable();

  // ────────────────────────────────────────────────────────────
  // Suggestions & completion (typo "did you mean", Tab-complete)
  // ────────────────────────────────────────────────────────────
  // Classic two-row Levenshtein.
  function levenshtein(a, b) {
    const m = a.length, n = b.length;
    if (!m) return n;
    if (!n) return m;
    let prev = [];
    for (let j = 0; j <= n; j++) prev[j] = j;
    for (let i = 1; i <= m; i++) {
      const cur = [i];
      for (let j = 1; j <= n; j++) {
        const cost = a.charCodeAt(i - 1) === b.charCodeAt(j - 1) ? 0 : 1;
        cur[j] = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + cost);
      }
      prev = cur;
    }
    return prev[n];
  }
  // Closest candidate within maxDist (inclusive), else null.
  function closest(word, candidates, maxDist) {
    if (!word) return null;
    let best = null, bestD = Infinity;
    for (const c of candidates) {
      const d = levenshtein(word, c);
      if (d < bestD) { bestD = d; best = c; }
    }
    return (best != null && bestD <= (maxDist == null ? 2 : maxDist)) ? best : null;
  }
  // Single-word nouns currently in scope (item/scenery/npc aliases).
  function scopeNouns(state, scope) {
    const words = new Set();
    const add = entry => (entry.aliases || []).forEach(a => { if (a.indexOf(' ') === -1) words.add(a); });
    if (scope === 'inventory' || scope === 'both') {
      state.inventory.forEach(id => ITEMS[id] && add(ITEMS[id]));
    }
    if (scope === 'here' || scope === 'both') {
      const loc = LOCATIONS[state.location];
      (loc.items || []).filter(id => !state.removedItems[loc.id + '/' + id]).forEach(id => ITEMS[id] && add(ITEMS[id]));
      (state.locationItems[loc.id] || []).forEach(id => ITEMS[id] && add(ITEMS[id]));
      (loc.scenery || []).forEach(id => ITEMS[id] && add(ITEMS[id]));
      npcsAt(state, state.location).forEach(id => add(NPCS[id]));
    }
    return Array.from(words);
  }
  // " did you mean "X"?" suffix, or '' — for a failed noun resolution.
  function nounSuggestion(phrase, state, scope) {
    const text = (phrase || []).join(' ');
    if (!text) return '';
    const cands = scopeNouns(state, scope);
    const c = closest(text, cands, 3) || closest(phrase[phrase.length - 1], cands, 2);
    return c ? "  (did you mean \"" + c + "\"?)" : '';
  }
  function commonPrefix(words) {
    if (!words.length) return '';
    let p = words[0];
    for (const w of words) {
      let i = 0;
      while (i < p.length && i < w.length && p[i] === w[i]) i++;
      p = p.slice(0, i);
      if (!p) break;
    }
    return p;
  }
  // Tab-completion. Given the raw input + state, returns
  // { completion, candidates }: completion is a full replacement line (or
  // null), candidates is the list to show when there are several.
  function complete(input, state) {
    const raw = input || '';
    const endsSpace = /\s$/.test(raw);
    const words = raw.trim().length ? raw.trim().split(/\s+/) : [];
    if (!words.length) return { completion: null, candidates: [] };

    const completingVerb = (words.length === 1 && !endsSpace);
    const prefix = (endsSpace ? '' : words[words.length - 1]).toLowerCase();

    let pool;
    if (completingVerb) {
      pool = Object.keys(VERBS);
    } else {
      pool = scopeNouns(state, 'both').concat(['north', 'south', 'east', 'west', 'up', 'down', 'back', 'all', 'around']);
    }
    const uniq = Array.from(new Set(pool.filter(w => w.indexOf(prefix) === 0))).sort();
    if (!uniq.length) return { completion: null, candidates: [] };

    const head = completingVerb ? '' : words.slice(0, endsSpace ? words.length : words.length - 1).join(' ');
    const withHead = w => (head ? head + ' ' : '') + w;

    if (uniq.length === 1) return { completion: withHead(uniq[0]), candidates: uniq };
    const common = commonPrefix(uniq);
    return {
      completion: common.length > prefix.length ? withHead(common) : null,
      candidates: uniq,
    };
  }

  // ────────────────────────────────────────────────────────────
  // Public parse() — terminal calls this with each line of input.
  // ────────────────────────────────────────────────────────────
  function parse(input, state) {
    state.meta.turnCount = (state.meta.turnCount || 0) + 1;

    const tokens = tokenize(input);
    if (tokens.length === 0) return { lines: [], state };

    // A pending numbered choice (branching dialogue) catches a bare number or
    // `cancel`. Any other command quietly dismisses the prompt and proceeds.
    if (state.pending && state.pending.type === 'choice') {
      const t0 = tokens[0];
      if (t0 === 'cancel' || t0 === 'nevermind') {
        state.pending = null;
        return { lines: [dim("(you let the moment pass.)")], state };
      }
      if (/^[0-9]+$/.test(t0)) {
        const opt = state.pending.options.filter(o => String(o.n) === t0)[0];
        if (!opt) {
          // Not one of the choices — keep the prompt open and re-show the
          // options so the player can see what to pick.
          const out = [err("that wasn't one of the choices.")];
          state.pending.options.forEach(o => out.push(line('  ' + o.n + ') ' + o.label, 'choice')));
          out.push(dim('(type a number, or `cancel`.)'));
          return { lines: out, state };
        }
        const npcId = state.pending.npcId;
        state.pending = null;
        return wrapDeath(resolveChoice(state, npcId, opt.action), state);
      }
      state.pending = null; // fall through to normal parsing
    }

    // After a real game over, the run is finished: only restart / load / quit
    // mean anything. Anything else just re-shows those options so the player is
    // never left typing into a closed book with no way forward.
    if (state.flags.gameOver) {
      const v = tokens[0];
      const tail = tokens.slice(1);
      if (v === 'restart' || v === 'reset') return handleRestart(tail, state, input);
      if (v === 'load')                      return handleLoad(tail, state, input);
      if (v === 'quit' || v === 'exit' || v === 'q') return handleQuit(tail, state, input);
      return { lines: [
        line("the woods have closed for this walk."),
        dim("(type `restart` to begin again, `load` to return to your save, or `quit` to leave.)"),
      ], state };
    }

    // Compound-verb shortcuts.
    let verb = tokens[0];
    let rest = tokens.slice(1);
    if ((verb === 'pick' || verb === 'get') && rest[0] === 'up') rest = rest.slice(1);

    // Remember the command for `again` — but never remember `again` itself,
    // or it would only ever repeat itself.
    if (verb !== 'again' && verb !== 'g' && verb !== 'repeat') {
      state.meta.lastCommand = input;
    }

    // Bare directional input (e.g. "north", "n") → go.
    if (rest.length === 0 && ['north','south','east','west','up','down','n','s','e','w','u','d'].indexOf(verb) !== -1) {
      return wrapDeath(handleGo([verb], state), state);
    }

    const handler = VERBS[verb];
    if (!handler) {
      const guess = closest(verb, Object.keys(VERBS), 2);
      return { lines: [
        err("i don't know how to \"" + verb + "\"." + (guess ? "  (did you mean \"" + guess + "\"?)" : '')),
        dim("(type `help` for actions.)"),
      ], state };
    }
    return wrapDeath(handler(rest, state, input), state);
  }

  // If a handler trips stamina to 0 mid-action, route through death.
  // Also drain any pending tick warnings (dusk/night) onto the result.
  function wrapDeath(result, state) {
    if (result.done || result.ended) {
      const tail = drainTickLines(state);
      if (tail.length) result.lines = (result.lines || []).concat(tail);
      return result;
    }
    if (state.resources.stamina <= 0 && !result.pendingGameOver) {
      const death = handleDeath(state, 'stamina');
      result.lines = (result.lines || []).concat(death.lines);
      result.done = death.done;
      result.pendingGameOver = death.pendingGameOver;
    }
    const tail = drainTickLines(state);
    if (tail.length) result.lines = (result.lines || []).concat(tail);
    return result;
  }

  // ────────────────────────────────────────────────────────────
  // Start / fresh state / intro
  // ────────────────────────────────────────────────────────────
  function freshState(opts) {
    opts = opts || {};
    const seed = (opts.seed != null && opts.seed >>> 0) || makeSeed();
    const state = {
      v: SAVE_VERSION,
      seed: seed,
      rngState: seed,
      location: 'edge_of_woods',
      inventory: [],
      visits: { edge_of_woods: 0 },
      removedItems: {},
      locationItems: {},
      descMode: 'full', // 'full' | 'brief' — verbose vs short room text
      pending: null,     // a pending numbered choice, see resolveChoice()
      npc: {
        hermit: { met: false, mood: 'wary', trust: 0, topicsAsked: [] },
        magpie: { met: false, traded: false, location: 'pine_grove' },
        echo:   { met: false },
        oracle: { met: false, questionsLeft: 3 },
        wisp:   { met: false, led: false },
      },
      flags: {
        metHermit: false,
        lampLit: false,
        learnedMelody: false,
        chestOpen: false,
        resonance: false,
        gaveTokenToOracle: false,
        gaveSilverLeafToHermit: false,
        gaveMelodyToHermit: false,
        wispLed: false,
        shrineKindled: false,
        locketGiven: false,
        usedSleep: false,
        deathSpent: false,
        gameOver: false,
        duskWarned: false,
        nightFell: false,
        endedA: false,
        endedB: false,
        endedC: false,
        endedD: false,
      },
      found: { items: {}, secrets: {}, events: 0 },
      resources: { stamina: 100, daylight: 100 },
      meta: { turnCount: 0, startedAt: Date.now(), lastCommand: null, prevLocation: null },
    };
    // Weather is the first draw off the seed, so a seed reproduces it.
    state.weather = pickWeather(state);
    return state;
  }

  function intro(state) {
    return [
      blank(),
      room("FOREST WANDERER"),
      dim("a small adventure. type `help` for actions, `quit` to leave."),
      blank(),
      line("you have walked a long way to be here."),
      line("the trees know it."),
      blank(),
    ];
  }

  function start(opts) {
    const state = freshState(opts);
    state.visits.edge_of_woods = 1;
    incPlays();
    const lines = intro(state).concat(emitLocation(state));
    return { lines, state };
  }

  // ────────────────────────────────────────────────────────────
  // Save / load — JSON in localStorage. Version-gated.
  // ────────────────────────────────────────────────────────────
  function save(state) {
    try { localStorage.setItem(SAVE_KEY, JSON.stringify(state)); return true; }
    catch (e) { return false; }
  }
  function load() {
    try {
      const raw = localStorage.getItem(SAVE_KEY);
      if (!raw) return null;
      const s = JSON.parse(raw);
      if (!s || s.v !== SAVE_VERSION) return null;
      return s;
    } catch (e) { return null; }
  }
  function clearSave() {
    try { localStorage.removeItem(SAVE_KEY); } catch (e) {}
  }
  function hasSave() { return !!load(); }

  // ────────────────────────────────────────────────────────────
  // META — a durable profile that OUTLIVES the per-run save (which is
  // cleared on every ending). Holds endings seen, achievements, play
  // count, and completed seeds, for the title screen / gallery.
  // ────────────────────────────────────────────────────────────
  const META_KEY = 'forest-meta-v1';
  const ENDINGS = {
    A: 'The Returned Path',
    B: "The Wanderer's Choice",
    C: 'The Light Kept',
    D: "The Carpenter's Return",
  };
  // key → { title, desc }. `desc` shows once unlocked; locked rows read "???".
  const ACHIEVEMENTS = {
    meet_hermit:  { title: 'First Steps',   desc: 'meet the one who waits by the fire.' },
    songkeeper:   { title: 'Songkeeper',    desc: 'learn the song the spring keeps.' },
    lightbearer:  { title: 'Lightbearer',   desc: 'wake a light of your own.' },
    ending_a:     { title: 'Rest',          desc: 'reach the Returned Path.' },
    ending_b:     { title: 'Wander',        desc: "reach the Wanderer's Choice." },
    ending_c:     { title: 'Keep',          desc: 'reach the Light Kept.' },
    ending_d:     { title: 'Reunion',       desc: "reach the Carpenter's Return." },
    all_endings:  { title: 'Every Door',    desc: 'reach all four endings.' },
    no_sleep:     { title: 'Unsleeping',    desc: 'reach an ending without once sleeping.' },
    collector:    { title: 'Magpie-Hearted', desc: 'hold ten different things in one walk.' },
  };

  function defaultMeta() {
    return { endings: {}, achievements: {}, plays: 0, seeds: [] };
  }
  function loadMeta() {
    try {
      const raw = localStorage.getItem(META_KEY);
      if (!raw) return defaultMeta();
      const m = JSON.parse(raw);
      if (!m || typeof m !== 'object') return defaultMeta();
      return {
        endings: m.endings || {},
        achievements: m.achievements || {},
        plays: m.plays || 0,
        seeds: Array.isArray(m.seeds) ? m.seeds : [],
      };
    } catch (e) { return defaultMeta(); }
  }
  function saveMeta(meta) {
    try { localStorage.setItem(META_KEY, JSON.stringify(meta)); } catch (e) {}
  }
  function incPlays() {
    const m = loadMeta();
    m.plays += 1;
    saveMeta(m);
  }
  function unlockAchievement(key) {
    if (!ACHIEVEMENTS[key]) return;
    const m = loadMeta();
    if (!m.achievements[key]) { m.achievements[key] = true; saveMeta(m); }
  }
  // Record an ending and evaluate every achievement against the finishing run.
  function recordEnding(letter, state) {
    const m = loadMeta();
    m.endings[letter] = true;
    if (state && state.seed != null && m.seeds.indexOf(state.seed) === -1) m.seeds.push(state.seed);
    // Per-ending + milestone achievements.
    m.achievements['ending_' + letter.toLowerCase()] = true;
    if (state) {
      if (state.flags.metHermit) m.achievements.meet_hermit = true;
      if (state.flags.learnedMelody) m.achievements.songkeeper = true;
      if (state.flags.lampLit || has(state, 'lit_lantern')) m.achievements.lightbearer = true;
      if (!state.flags.usedSleep) m.achievements.no_sleep = true;
      if (Object.keys((state.found && state.found.items) || {}).length >= 10) m.achievements.collector = true;
    }
    if (['A', 'B', 'C', 'D'].every(L => m.endings[L])) m.achievements.all_endings = true;
    saveMeta(m);
  }

  // The title-screen gallery: endings seen and achievements earned.
  function galleryLines() {
    const m = loadMeta();
    const out = [room('· the woods remember ·'), blank(), dim('endings found:')];
    ['A', 'B', 'C', 'D'].forEach(L => {
      const seen = !!m.endings[L];
      out.push(line('  ' + (seen ? '[x] ' + L + ' · ' + ENDINGS[L] : '[ ] ' + L + ' · ???'), seen ? 'room' : 'dim'));
    });
    out.push(blank());
    out.push(dim('achievements (' + Object.keys(m.achievements).filter(k => ACHIEVEMENTS[k]).length + ' / ' + Object.keys(ACHIEVEMENTS).length + '):'));
    Object.keys(ACHIEVEMENTS).forEach(k => {
      const got = !!m.achievements[k];
      const a = ACHIEVEMENTS[k];
      out.push(line('  ' + (got ? '★ ' + a.title + ' — ' + a.desc : '· ??? — locked'), got ? 'game' : 'dim'));
    });
    out.push(blank());
    out.push(dim('walks taken: ' + m.plays));
    return out;
  }
  // Static help, for the menu's "how to play" — reuses the in-game table.
  function helpLines() { return handleHelp([], null).lines; }

  // ────────────────────────────────────────────────────────────
  // Public API
  // ────────────────────────────────────────────────────────────
  window.ForestAdventure = {
    PROMPT,
    start,
    parse,
    complete,
    save,
    load,
    clearSave,
    hasSave,
    loadMeta,
    galleryLines,
    helpLines,
  };
})();
