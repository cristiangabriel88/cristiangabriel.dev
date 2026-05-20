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
  const SAVE_VERSION = 1;
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

  function has(state, itemId) { return state.inventory.indexOf(itemId) !== -1; }
  function inv(state) { return state.inventory.slice(); }
  function removeItem(state, itemId) {
    const i = state.inventory.indexOf(itemId);
    if (i !== -1) state.inventory.splice(i, 1);
  }
  function addItem(state, itemId) {
    if (!has(state, itemId)) state.inventory.push(itemId);
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
        if (!state.visits.edge_of_woods) {
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
        if (!state.visits.mossy_clearing) {
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
        if (!state.visits.brook_crossing) {
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
        if (!state.visits.pine_grove) {
          out.push(line("Pines so tall the sky narrows to a pale ribbon stitched between their crowns. The ground is a deep red quilt of fallen needles that breathes resin where you step. High in one trunk, a magpie shifts its head and fixes you with one mad, shining eye."));
          out.push(line("Below the nest, two pine paths fork: east, and a narrow one dropping north into a half-collapsed roof."));
        } else {
          out.push(line("Tall pines. The magpie watches."));
          out.push(dim("Paths lead east and north."));
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
      },
    },

    hermit_hollow: {
      id: 'hermit_hollow',
      title: "Hermit's Hollow",
      describe(state) {
        const out = [];
        out.push(room("— Hermit's Hollow —"));
        if (!state.visits.hermit_hollow) {
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
        if (!state.visits.echo_spring) {
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
        if (!state.visits.oracle_stone) {
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
        if (!state.visits.sunken_workshop) {
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
            dim("(ask the hermit about the melody, the forest, or yourself.)"),
          ];
        }
        if (ns.mood === 'wary')   return [npcSay("\"still walking, then.\" the hermit pokes at the fire.")];
        return [npcSay("the hermit gestures you to the fire. \"sit. it knows you now.\"")];
      },
      topics: {
        melody(state) {
          const ns = state.npc.hermit;
          ns.mood = 'friendly';
          ns.topicsAsked.push('melody');
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
          return [
            npcSay("\"i was a wanderer once. now i wait.\""),
            npcSay("\"the leaves on this robe are not from this year.\""),
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
            addItem(state, 'melody_pebble');
            return [
              line("the water shapes a hand. on your palm: a small pebble that hums the four notes."),
              dim("(you take a humming pebble.)"),
            ];
          }
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
            ending: "\"you may give the leaf, or keep the song. either way the woods remember.\"",
            default: "\"the stone considers a long time. the trend is uncertain.\"",
          };
          const ans = answers[topic] || answers.default;
          return [npcSay(ans)];
        },
      },
      onGive(itemId, state) {
        if (itemId === 'engraved_token') {
          state.flags.gaveTokenToOracle = true;
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
    //   here scenery (also ITEMS table — chest, signpost, etc.)
    //   here NPCs
    const loc = LOCATIONS[state.location];
    const hereItems = (loc.items || []).filter(id => !state.removedItems[loc.id + '/' + id]);
    const hereScenery = loc.scenery || [];
    const hereNpcIds = Object.keys(NPCS).filter(id => NPCS[id].location === state.location);
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
      const r2 = tryMatch(hereScenery, ITEMS, 'scenery');
      if (r2) return r2;
      const r3 = tryMatch(hereNpcIds, NPCS, 'npc');
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
        const dropped = droppable[Math.floor(Math.random() * droppable.length)];
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
    // Second death: real game over.
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

    // List visible items.
    const items = (loc.items || []).filter(id => !state.removedItems[loc.id + '/' + id]);
    const extras = state.locationItems[loc.id] || [];
    const visible = items.concat(extras);
    if (visible.length) {
      out.push(dim("you see: " + visible.map(id => ITEMS[id].name).join(', ') + "."));
    }
    const npcsHere = Object.keys(NPCS).filter(id => NPCS[id].location === state.location);
    if (npcsHere.length) {
      out.push(dim("here: " + npcsHere.map(id => NPCS[id].name).join(', ') + "."));
    }
    return out;
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
    if (!noun) return { lines: [err("you don't see anything like that here.")], state };
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

  function handleTake(rest, state) {
    if (rest.length === 0) return { lines: [err("take what?")], state };
    const noun = resolveNoun(rest, state, 'here');
    if (!noun) return { lines: [err("you don't see that here.")], state };

    if (noun.kind === 'npc')   return { lines: [err("you can't take " + NPCS[noun.id].name + ".")], state };
    if (noun.kind === 'scenery') {
      const it = ITEMS[noun.id];
      if (!it.takeable) return { lines: [err("you can't take that.")], state };
    }
    if (has(state, noun.id)) return { lines: [line("you already have it.")], state };

    addItem(state, noun.id);
    // Mark as removed from location (so it doesn't list again).
    state.removedItems[state.location + '/' + noun.id] = true;
    // Also remove from any `locationItems` extras (e.g. golden_locket from chest).
    const extras = state.locationItems[state.location];
    if (extras) {
      const i = extras.indexOf(noun.id);
      if (i !== -1) extras.splice(i, 1);
    }
    tickResources(state, { stamina: 2, daylight: 1 });
    return { lines: [line("taken: " + ITEMS[noun.id].name + ".")], state };
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
      out.push(dim("(you now have " + ITEMS[combo.result].name + ".)"));
    }
    if (combo.addItems) {
      for (const id of combo.addItems) {
        addItem(state, id);
        out.push(dim("(you take " + ITEMS[id].name + ".)"));
      }
    }
    if (combo.sets) {
      for (const k in combo.sets) state.flags[k] = combo.sets[k];
    }

    // Ending B trigger.
    if (state.flags.resonance && !state.flags.endedB) {
      state.flags.endedB = true;
      out.push(blank());
      out.push(line("the resonance does not stop. the four notes braid into eight, then sixteen, then a forest's worth."));
      out.push(line("you turn from the path, the song already with you, and walk deeper than the woods know how to be."));
      out.push(blank());
      out.push(room("— Ending B · The Wanderer's Choice —"));
      out.push(dim("(type `restart` to play again, or `quit` to leave.)"));
      return { lines: out, state, ended: 'B' };
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
    return { lines: npc.greet(state), state };
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
      const knownTopics = ['melody','hermit','forest','magpie','chest','workshop','key','spring','self','ending','myself','me'];
      let t = topicName;
      if (t === 'myself' || t === 'me') t = 'self';
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
      out.push(blank());
      out.push(line("the fire takes the gift quietly. the hermit's robe loses a leaf, and gains one."));
      out.push(line("\"sit,\" he says. \"it knows you now.\""));
      out.push(line("you sit. for the first time since you came into the woods, you are not walking."));
      out.push(blank());
      out.push(room("— Ending A · The Returned Path —"));
      out.push(dim("(type `restart` to play again, or `quit` to leave.)"));
      return { lines: out, state, ended: 'A' };
    }
    return { lines: out, state };
  }

  function handleGo(rest, state) {
    if (rest[0] === 'to' || rest[0] === 'into') rest = rest.slice(1);
    if (rest.length === 0) return { lines: [err("go where?")], state };
    const word = rest.join(' ');

    // Direction aliases first.
    const dirAliases = {
      north:'north', n:'north', up:'north',
      south:'south', s:'south', down:'south', back:'south',
      east:'east',   e:'east',
      west:'west',   w:'west',
    };
    let dir = dirAliases[word] || dirAliases[rest[0]];

    const loc = LOCATIONS[state.location];
    let destId = null;
    if (dir) destId = loc.exits[dir];
    else {
      // Try matching by destination location name keywords.
      for (const d in loc.exits) {
        const target = LOCATIONS[loc.exits[d]];
        const keys = [target.id.replace(/_/g, ' '), target.title.toLowerCase()];
        if (keys.some(k => k.indexOf(word) !== -1 || word.indexOf(k) !== -1)) {
          destId = loc.exits[d];
          break;
        }
      }
    }
    if (!destId) return { lines: [err("no path that way.")], state };

    // Light requirement at night.
    const dest = LOCATIONS[destId];
    if (dest.requiresLight && state.resources.daylight <= 0 && !has(state, 'lit_lantern')) {
      return { lines: [err("it is too dark to go that way without a light.")], state };
    }

    state.location = destId;
    state.visits[destId] = (state.visits[destId] || 0) + 1;
    tickResources(state, { stamina: 3, daylight: 2 });

    if (state.resources.stamina <= 0) {
      const death = handleDeath(state, 'stamina');
      return { lines: death.lines, state, done: death.done, pendingGameOver: death.pendingGameOver };
    }

    return { lines: emitLocation(state), state };
  }

  function handleInventory(rest, state) {
    if (state.inventory.length === 0) {
      return { lines: [line("your hands are empty. your pockets, emptier.")], state };
    }
    const n = state.inventory.length;
    const out = [room('· what you carry ·')];
    state.inventory.forEach(id => out.push(line("  · " + ITEMS[id].name)));
    out.push(dim("(" + n + (n === 1 ? " thing" : " things") + ".)"));
    return { lines: out, state };
  }

  function handleStats(rest, state) {
    const r = state.resources;
    const bar = (n) => {
      const filled = Math.round(n / 10);
      return '[' + '#'.repeat(filled) + '·'.repeat(10 - filled) + '] ' + n;
    };
    return { lines: [
      line("stamina:  " + bar(r.stamina)),
      line("daylight: " + bar(r.daylight)),
      dim("turn " + state.meta.turnCount + " · location: " + LOCATIONS[state.location].title),
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
    let rows = [
      [nd(22, 'oracle_stone')],
      [conn(28, '|', 'oracle_stone', 'brook_crossing')],
      [nd(2, 'sunken_workshop'), nd(22, 'brook_crossing'), conn(34, '------', 'brook_crossing', 'echo_spring'), nd(40, 'echo_spring')],
      [conn(8, '|', 'sunken_workshop', 'pine_grove'), conn(28, '|', 'brook_crossing', 'mossy_clearing')],
      [nd(2, 'pine_grove'), conn(14, '--------', 'pine_grove', 'mossy_clearing'), nd(22, 'mossy_clearing'), conn(34, '------', 'mossy_clearing', 'hermit_hollow'), nd(40, 'hermit_hollow')],
      [conn(28, '|', 'mossy_clearing', 'edge_of_woods')],
      [nd(22, 'edge_of_woods')],
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
      addItem(state, 'melody_pebble');
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
      row('stats',               'show stamina, daylight, turn'),
      row('listen · smell',      'perceive in another way'),
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
    reg(handleGo,        'go', 'walk', 'head', 'enter', 'follow', 'cross', 'leave', 'north', 'south', 'east', 'west', 'n', 's', 'e', 'w');
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
    return map;
  }
  const VERBS = buildVerbTable();

  // ────────────────────────────────────────────────────────────
  // Public parse() — terminal calls this with each line of input.
  // ────────────────────────────────────────────────────────────
  function parse(input, state) {
    state.meta.turnCount = (state.meta.turnCount || 0) + 1;

    const tokens = tokenize(input);
    if (tokens.length === 0) return { lines: [], state };

    // Compound-verb shortcuts.
    let verb = tokens[0];
    let rest = tokens.slice(1);
    if ((verb === 'pick' || verb === 'get') && rest[0] === 'up') rest = rest.slice(1);

    // Bare directional input (e.g. "north", "n") → go.
    if (rest.length === 0 && ['north','south','east','west','n','s','e','w'].indexOf(verb) !== -1) {
      return wrapDeath(handleGo([verb], state), state);
    }

    const handler = VERBS[verb];
    if (!handler) {
      return { lines: [
        err("i don't know how to \"" + verb + "\"."),
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
  function freshState() {
    return {
      v: SAVE_VERSION,
      location: 'edge_of_woods',
      inventory: [],
      visits: { edge_of_woods: 0 },
      removedItems: {},
      locationItems: {},
      npc: {
        hermit: { met: false, mood: 'wary', topicsAsked: [] },
        magpie: { met: false, traded: false },
        echo:   { met: false },
        oracle: { met: false, questionsLeft: 3 },
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
        deathSpent: false,
        duskWarned: false,
        nightFell: false,
        endedA: false,
        endedB: false,
      },
      resources: { stamina: 100, daylight: 100 },
      meta: { turnCount: 0, startedAt: Date.now() },
    };
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

  function start() {
    const state = freshState();
    state.visits.edge_of_woods = 1;
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

  // ────────────────────────────────────────────────────────────
  // Public API
  // ────────────────────────────────────────────────────────────
  window.ForestAdventure = {
    PROMPT,
    start,
    parse,
    save,
    load,
    clearSave,
  };
})();
