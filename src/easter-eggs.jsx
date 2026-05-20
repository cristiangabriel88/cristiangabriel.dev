(function () {
  /* global React, CHARACTER_FRAMES, PixelGrid, document */
  // ─────────────────────────────────────────────────────────────
  // Easter eggs:
  //  1. Leaf particles drift from cursor
  //  2. Tiny pixel character walks along bottom of viewport
  //  2½. Idle garden — pixel plants grow from the bottom after 10s of stillness
  //  3. Terminal overlay (type "cg" to open)
  //  4. Mini-game (catch falling leaves) — launched from terminal
  // ─────────────────────────────────────────────────────────────

  const { useState, useEffect, useLayoutEffect, useRef, useCallback } = React;

  // ─────────── 1. Leaf particles ───────────
  function LeafParticles({ enabled = true }) {
    const layerRef = useRef(null);
    const particlesRef = useRef([]);
    const lastEmitRef = useRef(0);
    const rafRef = useRef(null);
    useEffect(() => {
      if (!enabled) return;
      const layer = layerRef.current;
      if (!layer) return;
      let pos = {
        x: -100,
        y: -100,
      };
      function onMove(e) {
        pos = {
          x: e.clientX,
          y: e.clientY,
        };
        const now = performance.now();
        // Halved spawn rate (was 90ms) — 50% fewer leaves on the cursor trail.
        if (now - lastEmitRef.current > 180) {
          lastEmitRef.current = now;
          spawn(pos.x, pos.y, 1);
        }
      }
      // Per-particle SVG markup is identical except for the leaf color tints,
      // so we keep it as a template string and substitute in `spawn`.
      function spawn(x, y, intensity = 1) {
        for (let i = 0; i < intensity; i++) {
          const el = document.createElement("div");
          el.className = "leaf";
          const hue = 80 + Math.random() * 30;
          const sat = 30 + Math.random() * 25;
          const lite = 35 + Math.random() * 15;
          const size = 8 + Math.random() * 10;
          const left = x - size / 2;
          const top = y - size / 2;
          // Single style write — cheaper than four separate property assignments,
          // and avoids any chance of a style recalc between them.
          el.style.cssText = `width:${size}px;height:${size}px;left:${left}px;top:${top}px`;
          el.innerHTML = `<svg viewBox="0 0 16 16" width="100%" height="100%">
          <path d="M8 1 C 13 4, 14 10, 8 15 C 2 10, 3 4, 8 1 Z" fill="hsl(${hue},${sat}%,${lite}%)" opacity="0.85"/>
          <path d="M8 1 L 8 15" stroke="hsl(${hue},${sat}%,${lite - 12}%)" stroke-width="0.8" />
        </svg>`;
          layer.appendChild(el);
          particlesRef.current.push({
            el,
            x,
            y,
            // Transform baseline = un-shifted spawn coords. The CSS left/top is
            // offset by -size/2 to center the leaf on the cursor; using that as
            // the translate baseline made every leaf jump by (size/2, size/2)
            // on its first frame.
            ox: x,
            oy: y,
            vx: (Math.random() - 0.5) * 1.6,
            vy: 0.3 + Math.random() * 1.2,
            rot: Math.random() * 360,
            vr: (Math.random() - 0.5) * 8,
            life: 0,
            maxLife: 1500 + Math.random() * 1200,
            sway: Math.random() * Math.PI * 2,
            swayFreq: 0.002 + Math.random() * 0.003,
          });
        }
      }
      let last = performance.now();
      function tick(now) {
        // Clamp dt: after a long frame gap (tab blur, GC pause, scroll jank)
        // the next dt can be hundreds of ms, which makes particles teleport.
        // 50ms is a 20fps floor — the motion slows briefly instead of jumping.
        let dt = now - last;
        last = now;
        if (dt > 50) dt = 50;
        // Normalize per-frame velocities to a 60fps baseline so motion is
        // smooth at any framerate (the dt scaling makes 30fps look the same as
        // 120fps, just rendered at half the cadence).
        const tScale = dt / 16.67;
        const ps = particlesRef.current;
        for (let i = ps.length - 1; i >= 0; i--) {
          const p = ps[i];
          p.life += dt;
          p.sway += p.swayFreq * dt;
          p.x += (p.vx + Math.sin(p.sway) * 0.4) * tScale;
          p.y += p.vy * tScale;
          p.vy += 0.0003 * dt; // gentle gravity (already time-scaled)
          p.rot += p.vr * 0.02 * tScale;
          const alpha = Math.max(0, 1 - p.life / p.maxLife);
          p.el.style.transform = `translate3d(${p.x - p.ox}px, ${p.y - p.oy}px, 0) rotate(${p.rot}deg)`;
          p.el.style.opacity = alpha;
          if (p.life > p.maxLife) {
            p.el.remove();
            ps.splice(i, 1);
          }
        }
        rafRef.current = requestAnimationFrame(tick);
      }
      rafRef.current = requestAnimationFrame(tick);
      window.addEventListener("mousemove", onMove);
      return () => {
        window.removeEventListener("mousemove", onMove);
        cancelAnimationFrame(rafRef.current);
        particlesRef.current.forEach((p) => p.el.remove());
        particlesRef.current = [];
      };
    }, [enabled]);
    return <div ref={layerRef} className="leaf-layer" />;
  }

  // ─────────── 2. Pixel character ───────────
  function PixelCharacter({ enabled = true }) {
    const [x, setX] = useState(40);
    const [flip, setFlip] = useState(false);
    const [frame, setFrame] = useState(0);
    const [scrolling, setScrolling] = useState(false);
    const dirRef = useRef(1);

    // ###### WALK + SPRITE-FRAME LOOP ######
    useEffect(() => {
      if (!enabled) return;
      let raf;
      let last = performance.now();
      let frameAcc = 0;
      let stepAcc = 0;
      function loop(now) {
        const dt = now - last;
        last = now;
        stepAcc += dt;
        frameAcc += dt;
        if (stepAcc > 16) {
          stepAcc = 0;
          setX((prev) => {
            let next = prev + dirRef.current * 0.6;
            const maxX = window.innerWidth - 60;
            const minX = 220; // past sidebar
            if (next > maxX) {
              dirRef.current = -1;
              setFlip(true);
              next = maxX;
            }
            if (next < minX) {
              dirRef.current = 1;
              setFlip(false);
              next = minX;
            }
            return next;
          });
        }
        if (frameAcc > 220) {
          frameAcc = 0;
          setFrame((f) => (f + 1) % 2);
        }
        raf = requestAnimationFrame(loop);
      }
      raf = requestAnimationFrame(loop);
      return () => cancelAnimationFrame(raf);
    }, [enabled]);

    // ###### HIDE WHILE SCROLLING ######
    // Hide instantly on scroll, fade back in 800ms after the last scroll event.
    useEffect(() => {
      if (!enabled) return;
      let idleTimer;
      function onScroll() {
        setScrolling(true);
        clearTimeout(idleTimer);
        idleTimer = setTimeout(() => setScrolling(false), 800);
      }
      window.addEventListener("scroll", onScroll, {
        passive: true,
      });
      return () => {
        window.removeEventListener("scroll", onScroll);
        clearTimeout(idleTimer);
      };
    }, [enabled]);
    if (!enabled) return null;
    return (
      <div
        className={"pixel-character" + (scrolling ? " hidden" : "")}
        style={{
          transform: `translateX(${x}px) scaleX(${flip ? -1 : 1})`,
        }}
      >
        <PixelGrid rows={CHARACTER_FRAMES[frame]} scale={3} />
      </div>
    );
  }

  // ─────────── 2½. Idle garden ───────────
  // After 10s of stillness, leafy vector plants grow slowly up from the bottom
  // edge in irregular packs and sway in a gentle breeze. The moment the visitor
  // moves, types, scrolls or taps, the whole garden retreats back into the soil.
  //
  // Each plant is procedurally composed of smooth SVG leaves/blades (see the
  // vector plant kit below) and handed to <PlantSVG>. Growth is pure CSS: rather
  // than wiping a clip-path, each plant scales up organically from its base
  // (thin shoot → unfurling leaves → settle) on its own slow, randomized timer,
  // so they sprout in bursts. Retreat shrinks back into the seed state. Sway is a
  // separate, always-on CSS rotation about each plant's base.

  function rint(a, b) {
    return a + Math.floor(Math.random() * (b - a + 1));
  }
  function rfloat(a, b) {
    return a + Math.random() * (b - a);
  }
  function pick(arr) {
    return arr[Math.floor(Math.random() * arr.length)];
  }

  // ── Vector plant kit ──────────────────────────────────────────────────────
  // The idle garden is drawn in the SAME art language as the cursor-trail leaves
  // — smooth hsl-green SVG leaves with a soft midrib — rather than as pixel
  // blocks, so a still page grows the very foliage the cursor scatters, just
  // large and at rest. Each plant is composed from three primitives (broad
  // leaves, grass blades, a flower head) around a base at local (0,0) with
  // up = -y. We track the drawn extent so the SVG can size + centre on its base.

  function clamp(v, lo, hi) {
    return v < lo ? lo : v > hi ? hi : v;
  }

  // A pointed-lens leaf, mirrored about its own axis, pointing along +x with the
  // base at the origin — the grown-up cousin of the cursor leaf's bezier.
  function leafD(L, Wd) {
    const m = (L * 0.5).toFixed(1);
    return `M0 0Q${m} ${(-Wd).toFixed(1)} ${L.toFixed(1)} 0Q${m} ${Wd.toFixed(1)} 0 0Z`;
  }

  // A single grass blade: base centred at the origin, curving up to a leaning,
  // tapering tip. `lean` is the tip's horizontal travel, `wb` its base half-width.
  function bladeD(h, wb, lean) {
    const cLx = (lean * 0.3 - wb).toFixed(1);
    const cRx = (lean * 0.6 + wb).toFixed(1);
    return (
      `M${(-wb).toFixed(1)} 0Q${cLx} ${(-h * 0.6).toFixed(1)} ${lean.toFixed(1)} ${(-h).toFixed(1)}` +
      `Q${cRx} ${(-h * 0.5).toFixed(1)} ${wb.toFixed(1)} 0Z`
    );
  }

  // Foliage colour. Hues stay in the cursor-leaf green band (~80–112°, warm
  // yellow-green — capped before it drifts into cool emerald/blue) and are
  // fixed (not theme variables) so the garden reads identically in light + dark.
  // `t` runs 0 (shaded, near the soil) → 1 (sunlit tip): higher = lighter and a
  // touch more saturated, so a clump catches light through its upper leaves.
  function greenFill(baseHue, t) {
    const h = baseHue + rint(-7, 7);
    const s = clamp(34 + Math.round(t * 22) + rint(-4, 4), 26, 64);
    const l = clamp(25 + Math.round(t * 24) + rint(-3, 3), 20, 54);
    return `hsl(${h} ${s}% ${l}%)`;
  }

  // Grow one plant into a render spec: { w, h, cx, baseY, parts }. `parts` are
  // SVG path/circle descriptors in a base-at-origin frame; PlantSVG drops them
  // into a <g> translated to (cx, baseY) so the base sits centred on the soil
  // line. Varieties are biased toward leafy foliage and grass tufts.
  function makePlant() {
    const parts = [];
    let minY = 0;
    let maxAbsX = 5;
    const note = (x, y, reach = 0) => {
      if (y < minY) minY = y;
      const ax = Math.abs(x) + reach;
      if (ax > maxAbsX) maxAbsX = ax;
    };
    const finalize = () => {
      const padX = 7;
      const padTop = 7;
      const padBottom = 2;
      const cx = maxAbsX + padX;
      const baseY = Math.ceil(-minY) + padTop;
      return {
        w: Math.ceil(cx * 2),
        h: baseY + padBottom,
        cx,
        baseY,
        parts,
      };
    };

    // ── primitives ──
    const addLeaf = (bx, by, deg, L, Wd, baseHue, t) => {
      const tr = `translate(${bx.toFixed(1)} ${by.toFixed(1)}) rotate(${deg.toFixed(1)})`;
      parts.push({
        d: leafD(L, Wd),
        fill: greenFill(baseHue, t),
        opacity: rfloat(0.82, 0.96),
        transform: tr,
      });
      // Midrib — a hair darker, the same accent the cursor leaf carries.
      parts.push({
        d: `M0 0L${(L * 0.92).toFixed(1)} 0`,
        stroke: greenFill(baseHue, Math.max(0, t - 0.4)),
        sw: Math.max(0.6, Wd * 0.16).toFixed(1),
        cap: "round",
        opacity: 0.5,
        transform: tr,
      });
      const r = (deg * Math.PI) / 180;
      note(bx, by);
      note(bx + Math.cos(r) * L, by + Math.sin(r) * L, Wd);
    };
    const addBlade = (bx, h, wb, lean, baseHue, t) => {
      parts.push({
        d: bladeD(h, wb, lean),
        fill: greenFill(baseHue, t),
        opacity: rfloat(0.85, 0.97),
        transform: `translate(${bx.toFixed(1)} 0)`,
      });
      note(bx, 0);
      note(bx + lean, -h, wb);
    };
    const addStem = (bend, h) => {
      const topX = bend;
      const topY = -h;
      parts.push({
        d: `M0 0Q${(bend * 0.25).toFixed(1)} ${(-h * 0.5).toFixed(1)} ${topX.toFixed(1)} ${topY.toFixed(1)}`,
        stroke: "hsl(96 30% 24%)",
        sw: rfloat(1.6, 2.8).toFixed(1),
        cap: "round",
        opacity: 0.92,
      });
      note(0, 0);
      note(topX, topY);
      return {
        topX,
        topY,
      };
    };
    const addFlower = (cx, cy, baseHue) => {
      const petal = pick([
        "hsl(330 56% 78%)",
        "hsl(282 40% 80%)",
        "hsl(45 78% 74%)",
        "hsl(38 34% 92%)",
      ]);
      const n = rint(5, 8);
      const pr = rfloat(5, 8);
      for (let i = 0; i < n; i++) {
        const deg = (360 / n) * i + rfloat(-8, 8);
        parts.push({
          d: leafD(pr, pr * 0.52),
          fill: petal,
          opacity: 0.95,
          transform: `translate(${cx.toFixed(1)} ${cy.toFixed(1)}) rotate(${deg.toFixed(1)})`,
        });
      }
      parts.push({
        tag: "circle",
        cx,
        cy,
        r: rfloat(1.8, 3),
        fill: "hsl(46 80% 60%)",
      });
      note(cx, cy, pr * 1.3);
    };
    const baseHue = rint(80, 112);
    const variety = pick([
      "leafy",
      "leafy",
      "leafy",
      "grass",
      "grass",
      "grass",
      "fern",
      "fern",
      "flower",
      "bud",
    ]);
    if (variety === "grass") {
      // A loose tuft of curving blades at varied heights and leans.
      const H = rint(54, 150);
      const blades = rint(8, 15);
      const spread = H * 0.24;
      for (let b = 0; b < blades; b++) {
        addBlade(
          rfloat(-spread, spread),
          rfloat(H * 0.5, H),
          rfloat(1.6, 3.4),
          rfloat(-H * 0.3, H * 0.3),
          baseHue,
          rfloat(0.25, 1),
        );
      }
      return finalize();
    }
    const hasHead = variety === "flower" || variety === "bud";
    const H = rint(hasHead ? 90 : 78, hasHead ? 175 : 215);
    const { topX, topY } = addStem(rfloat(-H * 0.16, H * 0.16), H);
    if (variety === "fern") {
      // Paired leaflets marching up a curved rachis, longest near the base.
      const pairs = rint(8, 13);
      for (let i = 0; i < pairs; i++) {
        const t = i / (pairs - 1 || 1);
        const sx = topX * t;
        const sy = -H * t;
        const len = (1 - t) * rfloat(11, 20) + 5;
        addLeaf(sx, sy, -34 - t * 28, len, len * 0.26, baseHue, 0.4 + t * 0.5);
        addLeaf(sx, sy, -146 + t * 28, len, len * 0.26, baseHue, 0.4 + t * 0.5);
      }
      addLeaf(topX, topY, -90, rfloat(8, 14), rfloat(2.5, 4), baseHue, 0.95);
      return finalize();
    }

    // Leafy stem: broad leaves alternating up the stem, larger toward the base,
    // frequently paired for a full bush, crowned by an upright leaf.
    const nodes = rint(4, 7);
    for (let i = 0; i < nodes; i++) {
      const t = (i + 0.5) / nodes;
      const sx = topX * t;
      const sy = -H * t;
      const side = i % 2 === 0 ? 1 : -1;
      const L = (1 - t * 0.55) * rfloat(20, 36);
      const Wd = L * rfloat(0.4, 0.55);
      const deg = side > 0 ? -(20 + t * 30) : -(160 - t * 30);
      addLeaf(sx, sy, deg, L, Wd, baseHue, 0.3 + t * 0.6);
      if (Math.random() < 0.55) {
        addLeaf(
          sx,
          sy,
          side > 0 ? -(150 - t * 30) : -(30 + t * 30),
          L * 0.8,
          Wd * 0.8,
          baseHue,
          0.3 + t * 0.6,
        );
      }
    }
    addLeaf(topX, topY, -90, rfloat(16, 26), rfloat(7, 11), baseHue, 0.95);
    if (hasHead) addFlower(topX, topY + (variety === "bud" ? 2 : -2), baseHue);
    return finalize();
  }

  // Render a plant spec into crisp vector SVG. Parts carry an optional `tag`
  // ('circle'); everything else is a <path>. Stroked-only parts (stems, midribs)
  // have no `fill`, so we default fill to 'none' to avoid SVG's black default.
  function PlantSVG({ spec }) {
    const children = spec.parts.map((p, i) =>
      p.tag === "circle" ? (
        <circle key={i} cx={p.cx} cy={p.cy} r={p.r} fill={p.fill} />
      ) : (
        <path
          key={i}
          d={p.d}
          fill={p.fill || "none"}
          stroke={p.stroke}
          strokeWidth={p.sw}
          strokeLinecap={p.cap}
          opacity={p.opacity}
          transform={p.transform}
        />
      ),
    );
    return (
      <svg
        width={spec.w}
        height={spec.h}
        viewBox={`0 0 ${spec.w} ${spec.h}`}
        style={{
          display: "block",
          overflow: "visible",
        }}
      >
        <g transform={`translate(${spec.cx} ${spec.baseY})`}>{children}</g>
      </svg>
    );
  }

  // Build one plant placed at viewport x. Growth is deliberately slow and each
  // plant gets its own duration + delay so the garden emerges irregularly rather
  // than as a tidy left-to-right sweep. Retreat is a touch quicker but still soft.
  function makePlantObj(x) {
    return {
      x,
      spec: makePlant(),
      swayDur: rfloat(4, 8),
      swayDelay: -rfloat(0, 8),
      swayDeg: rfloat(1.2, 3),
      growDur: rfloat(6, 13),
      growDelay: rfloat(0, 8),
      retreatDur: rfloat(0.9, 1.8),
      retreatDelay: rfloat(0, 0.7),
      // Direction + amount each plant leans as it wilts, so a clump folds down
      // every-which-way rather than all tipping the same side.
      wiltLean: rfloat(2.5, 6) * (Math.random() < 0.5 ? -1 : 1),
    };
  }

  // Lay plants out in irregular packs separated by bare gaps, rather than evenly
  // spaced. A pack is a few plants crowded together (overlapping into a clump);
  // between packs there's a wide stretch of empty soil.
  function makePlantSet(width) {
    const plants = [];
    let x = rfloat(-12, 36);
    while (x < width + 12) {
      const packSize = rint(1, 5);
      for (let p = 0; p < packSize && x < width + 12; p++) {
        plants.push(makePlantObj(x));
        x += rfloat(16, 44); // tight, overlapping spacing inside a pack
      }
      x += rfloat(60, 260); // wide empty gap before the next pack
    }
    return plants;
  }
  function IdleGarden({ enabled = true, paused = false }) {
    const [active, setActive] = useState(false);
    const [plants, setPlants] = useState(() =>
      enabled ? makePlantSet(window.innerWidth) : [],
    );
    // True once the garden has grown at least once. Gates the wilt-retreat
    // animation so it never plays on the initial (never-grown) render — plants
    // should only wilt back down after they've actually risen.
    const hasGrownRef = useRef(false);

    // ###### IDLE WATCH ######
    // Re-arm a 20s timer on any interaction; firing it grows the garden. Any
    // interaction while grown retreats it. Backgrounded tabs retreat immediately.
    useEffect(() => {
      if (!enabled) return;
      if (paused) {
        setActive(false);
        return;
      }
      let timer;
      const arm = () => {
        clearTimeout(timer);
        timer = setTimeout(() => {
          hasGrownRef.current = true;
          setActive(true);
        }, 20000);
      };
      const onActivity = () => {
        setActive(false);
        arm();
      };
      const onVisibility = () => {
        if (document.hidden) {
          clearTimeout(timer);
          setActive(false);
        } else {
          arm();
        }
      };
      const evs = [
        "mousemove",
        "mousedown",
        "keydown",
        "wheel",
        "touchstart",
        "scroll",
      ];
      evs.forEach((e) =>
        window.addEventListener(e, onActivity, {
          passive: true,
        }),
      );
      document.addEventListener("visibilitychange", onVisibility);
      arm();
      return () => {
        clearTimeout(timer);
        evs.forEach((e) => window.removeEventListener(e, onActivity));
        document.removeEventListener("visibilitychange", onVisibility);
      };
    }, [enabled, paused]);

    // Re-flow the garden to a new viewport width (debounced).
    useEffect(() => {
      if (!enabled) return;
      let t;
      const onResize = () => {
        clearTimeout(t);
        t = setTimeout(() => setPlants(makePlantSet(window.innerWidth)), 250);
      };
      window.addEventListener("resize", onResize);
      return () => {
        clearTimeout(t);
        window.removeEventListener("resize", onResize);
      };
    }, [enabled]);
    if (!enabled) return null;
    return (
      <div className="idle-garden" aria-hidden="true">
        {plants.map((p, i) => (
          <div
            key={i}
            className={
              "idle-plant" +
              (active ? " grown" : hasGrownRef.current ? " retreating" : "")
            }
            style={{
              left: p.x + "px",
            }}
          >
            <div
              className="idle-plant-sway"
              style={{
                "--sway-dur": p.swayDur + "s",
                "--sway-delay": p.swayDelay + "s",
                "--sway-deg": p.swayDeg + "deg",
              }}
            >
              <div
                className="idle-plant-reveal"
                style={{
                  "--rev-dur": (active ? p.growDur : p.retreatDur) + "s",
                  "--rev-delay": (active ? p.growDelay : p.retreatDelay) + "s",
                  "--wilt-lean": p.wiltLean + "deg",
                }}
              >
                <PlantSVG spec={p.spec} />
              </div>
            </div>
          </div>
        ))}
      </div>
    );
  }

  // ─────────── 3. Terminal + 4. Mini-game ───────────

  // Lazy loader for the Forest Wanderer adventure module. The game's data + parser
  // is ~1000 LOC; we don't want to parse it on initial page load just to support a
  // rarely-typed command. The script is injected on demand the first time `forest`
  // is invoked; subsequent invocations resolve instantly (browser cache).
  let forestLoaderPromise = null;
  function loadForestAdventure() {
    if (window.ForestAdventure) return Promise.resolve(window.ForestAdventure);
    if (forestLoaderPromise) return forestLoaderPromise;
    forestLoaderPromise = new Promise((resolve, reject) => {
      const s = document.createElement("script");
      s.src = "forest-adventure.js";
      s.async = true;
      s.onload = () => resolve(window.ForestAdventure);
      s.onerror = () => {
        forestLoaderPromise = null;
        reject(new Error("load failed"));
      };
      document.head.appendChild(s);
    });
    return forestLoaderPromise;
  }
  const TERMINAL_BANNER = [
    " ___  ___  _ _ ",
    "|  _|/ __|| | |",
    "| |_ \\__ \\| | |",
    "|___||___/|_|_|",
    "",
    "┌── cg.term v1.0  ────────────────────────────────────────",
    "│  type `help` for commands. `exit` or Esc to close.",
    "└──────────────────────────────────────────────────────────",
    "",
  ];

  // 8-row figlet-style "Big" font for the `ascii` command. Each glyph is an
  // array of 8 strings, all the same width within a glyph. Letters are
  // concatenated row-by-row to form the rendered art.
  const BIG_FONT = {
    " ": ["    ", "    ", "    ", "    ", "    ", "    ", "    ", "    "],
    ".": ["   ", "   ", "   ", "   ", " _ ", "(_)", "   ", "   "],
    ",": ["   ", "   ", "   ", "   ", "   ", " _ ", "( )", "|/ "],
    "!": [" _ ", "| |", "| |", "| |", "|_|", "(_)", "   ", "   "],
    "?": [
      " ___  ",
      "|__ \\ ",
      "   ) |",
      "  / / ",
      " |_|  ",
      " (_)  ",
      "      ",
      "      ",
    ],
    "-": [
      "      ",
      "      ",
      "      ",
      " ____ ",
      "|____|",
      "      ",
      "      ",
      "      ",
    ],
    _: [
      "        ",
      "        ",
      "        ",
      "        ",
      "        ",
      "        ",
      "        ",
      " ______ ",
    ],
    ":": ["   ", "   ", " _ ", "(_)", " _ ", "(_)", "   ", "   "],
    "'": [" _ ", "( )", "|/ ", "   ", "   ", "   ", "   ", "   "],
    A: [
      "     _    ",
      "    / \\   ",
      "   / _ \\  ",
      "  / ___ \\ ",
      " /_/   \\_\\",
      "          ",
      "          ",
      "          ",
    ],
    B: [
      " ____  ",
      "|  _ \\ ",
      "| |_) |",
      "|  _ < ",
      "| |_) |",
      "|____/ ",
      "       ",
      "       ",
    ],
    C: [
      "  _____ ",
      " / ____|",
      "| |     ",
      "| |     ",
      "| |____ ",
      " \\_____|",
      "        ",
      "        ",
    ],
    D: [
      " _____  ",
      "|  __ \\ ",
      "| |  | |",
      "| |  | |",
      "| |__| |",
      "|_____/ ",
      "        ",
      "        ",
    ],
    E: [
      " ______ ",
      "|  ____|",
      "| |__   ",
      "|  __|  ",
      "| |____ ",
      "|______|",
      "        ",
      "        ",
    ],
    F: [
      " ______ ",
      "|  ____|",
      "| |__   ",
      "|  __|  ",
      "| |     ",
      "|_|     ",
      "        ",
      "        ",
    ],
    G: [
      "  _____ ",
      " / ____|",
      "| |  __ ",
      "| | |_ |",
      "| |__| |",
      " \\_____|",
      "        ",
      "        ",
    ],
    H: [
      " _    _ ",
      "| |  | |",
      "| |__| |",
      "|  __  |",
      "| |  | |",
      "|_|  |_|",
      "        ",
      "        ",
    ],
    I: [
      " _____ ",
      "|_   _|",
      "  | |  ",
      "  | |  ",
      " _| |_ ",
      "|_____|",
      "       ",
      "       ",
    ],
    J: [
      "       _ ",
      "      | |",
      "      | |",
      "  _   | |",
      " | |__| |",
      "  \\____/ ",
      "         ",
      "         ",
    ],
    K: [
      " _  __ ",
      "| |/ / ",
      "| ' /  ",
      "|  <   ",
      "| . \\  ",
      "|_|\\_\\ ",
      "       ",
      "       ",
    ],
    L: [
      " _      ",
      "| |     ",
      "| |     ",
      "| |     ",
      "| |____ ",
      "|______|",
      "        ",
      "        ",
    ],
    M: [
      " __  __ ",
      "|  \\/  |",
      "| \\  / |",
      "| |\\/| |",
      "| |  | |",
      "|_|  |_|",
      "        ",
      "        ",
    ],
    N: [
      " _   _ ",
      "| \\ | |",
      "|  \\| |",
      "| . ` |",
      "| |\\  |",
      "|_| \\_|",
      "       ",
      "       ",
    ],
    O: [
      "  ____  ",
      " / __ \\ ",
      "| |  | |",
      "| |  | |",
      "| |__| |",
      " \\____/ ",
      "        ",
      "        ",
    ],
    P: [
      " _____  ",
      "|  __ \\ ",
      "| |__) |",
      "|  ___/ ",
      "| |     ",
      "|_|     ",
      "        ",
      "        ",
    ],
    Q: [
      "  ____   ",
      " / __ \\  ",
      "| |  | | ",
      "| |  | | ",
      "| |__| | ",
      " \\___\\_\\ ",
      "         ",
      "         ",
    ],
    R: [
      " _____  ",
      "|  __ \\ ",
      "| |__) |",
      "|  _  / ",
      "| | \\ \\ ",
      "|_|  \\_\\",
      "        ",
      "        ",
    ],
    S: [
      "  _____ ",
      " / ____|",
      "| (___  ",
      " \\___ \\ ",
      " ____) |",
      "|_____/ ",
      "        ",
      "        ",
    ],
    T: [
      " _______ ",
      "|__   __|",
      "   | |   ",
      "   | |   ",
      "   | |   ",
      "   |_|   ",
      "         ",
      "         ",
    ],
    U: [
      " _    _ ",
      "| |  | |",
      "| |  | |",
      "| |  | |",
      "| |__| |",
      " \\____/ ",
      "        ",
      "        ",
    ],
    V: [
      "__      __",
      "\\ \\    / /",
      " \\ \\  / / ",
      "  \\ \\/ /  ",
      "   \\  /   ",
      "    \\/    ",
      "          ",
      "          ",
    ],
    W: [
      "__          __",
      "\\ \\        / /",
      " \\ \\  /\\  / / ",
      "  \\ \\/  \\/ /  ",
      "   \\  /\\  /   ",
      "    \\/  \\/    ",
      "              ",
      "              ",
    ],
    X: [
      "__   __",
      "\\ \\ / /",
      " \\ V / ",
      "  > <  ",
      " / . \\ ",
      "/_/ \\_\\",
      "       ",
      "       ",
    ],
    Y: [
      "__     __",
      "\\ \\   / /",
      " \\ \\_/ / ",
      "  \\   /  ",
      "   | |   ",
      "   |_|   ",
      "         ",
      "         ",
    ],
    Z: [
      " ______ ",
      "|___  / ",
      "   / /  ",
      "  / /   ",
      " / /__  ",
      "/_____| ",
      "        ",
      "        ",
    ],
    a: [
      "        ",
      "        ",
      "   __ _ ",
      "  / _` |",
      " | (_| |",
      "  \\__,_|",
      "        ",
      "        ",
    ],
    b: [
      " _      ",
      "| |     ",
      "| |__   ",
      "| '_ \\  ",
      "| |_) | ",
      "|_.__/  ",
      "        ",
      "        ",
    ],
    c: [
      "       ",
      "       ",
      "  ___  ",
      " / __| ",
      "| (__  ",
      " \\___| ",
      "       ",
      "       ",
    ],
    d: [
      "      _ ",
      "     | |",
      "   __| |",
      "  / _` |",
      " | (_| |",
      "  \\__,_|",
      "        ",
      "        ",
    ],
    e: [
      "       ",
      "       ",
      "  ___  ",
      " / _ \\ ",
      "|  __/ ",
      " \\___| ",
      "       ",
      "       ",
    ],
    f: [
      "   __ ",
      "  / _|",
      " | |_ ",
      " |  _|",
      " | |  ",
      " |_|  ",
      "      ",
      "      ",
    ],
    g: [
      "        ",
      "        ",
      "   __ _ ",
      "  / _` |",
      " | (_| |",
      "  \\__, |",
      "   __/ |",
      "  |___/ ",
    ],
    h: [
      " _      ",
      "| |     ",
      "| |__   ",
      "| '_ \\  ",
      "| | | | ",
      "|_| |_| ",
      "        ",
      "        ",
    ],
    i: [" _ ", "(_)", " _ ", "| |", "| |", "|_|", "   ", "   "],
    j: [
      "    _ ",
      "   (_)",
      "    _ ",
      "   | |",
      "   | |",
      "   | |",
      " _ | |",
      "|__/  ",
    ],
    k: [
      " _    ",
      "| |   ",
      "| | __",
      "| |/ /",
      "|   < ",
      "|_|\\_\\",
      "      ",
      "      ",
    ],
    l: [" _ ", "| |", "| |", "| |", "| |", "|_|", "   ", "   "],
    m: [
      "            ",
      "            ",
      " _ __ ___   ",
      "| '_ ` _ \\  ",
      "| | | | | | ",
      "|_| |_| |_| ",
      "            ",
      "            ",
    ],
    n: [
      "        ",
      "        ",
      " _ __   ",
      "| '_ \\  ",
      "| | | | ",
      "|_| |_| ",
      "        ",
      "        ",
    ],
    o: [
      "        ",
      "        ",
      "  ___   ",
      " / _ \\  ",
      "| (_) | ",
      " \\___/  ",
      "        ",
      "        ",
    ],
    p: [
      "        ",
      "        ",
      " _ __   ",
      "| '_ \\  ",
      "| |_) | ",
      "| .__/  ",
      "| |     ",
      "|_|     ",
    ],
    q: [
      "        ",
      "        ",
      "   __ _ ",
      "  / _` |",
      " | (_| |",
      "  \\__, |",
      "     | |",
      "     |_|",
    ],
    r: [
      "       ",
      "       ",
      " _ __  ",
      "| '__| ",
      "| |    ",
      "|_|    ",
      "       ",
      "       ",
    ],
    s: [
      "       ",
      "       ",
      "  ___  ",
      " / __| ",
      " \\__ \\ ",
      " |___/ ",
      "       ",
      "       ",
    ],
    t: [
      " _    ",
      "| |   ",
      "| |_  ",
      "| __| ",
      "| |_  ",
      " \\__| ",
      "      ",
      "      ",
    ],
    u: [
      "        ",
      "        ",
      " _   _  ",
      "| | | | ",
      "| |_| | ",
      " \\__,_| ",
      "        ",
      "        ",
    ],
    v: [
      "        ",
      "        ",
      "__   __ ",
      "\\ \\ / / ",
      " \\ V /  ",
      "  \\_/   ",
      "        ",
      "        ",
    ],
    w: [
      "           ",
      "           ",
      "__      __ ",
      "\\ \\ /\\ / / ",
      " \\ V  V /  ",
      "  \\_/\\_/   ",
      "           ",
      "           ",
    ],
    x: [
      "        ",
      "        ",
      "__   __ ",
      "\\ \\ / / ",
      " >   <  ",
      "/_/\\_\\  ",
      "        ",
      "        ",
    ],
    y: [
      "        ",
      "        ",
      " _   _  ",
      "| | | | ",
      "| |_| | ",
      " \\__, | ",
      "  __/ | ",
      " |___/  ",
    ],
    z: [
      "       ",
      "       ",
      " ____  ",
      "|_  / ",
      " / /   ",
      "/___|  ",
      "       ",
      "       ",
    ],
    0: [
      "  ___  ",
      " / _ \\ ",
      "| | | |",
      "| | | |",
      "| |_| |",
      " \\___/ ",
      "       ",
      "       ",
    ],
    1: [" __ ", "/_ |", " | |", " | |", " | |", " |_|", "    ", "    "],
    2: [
      " ___  ",
      "|__ \\ ",
      "   ) |",
      "  / / ",
      " / /_ ",
      "|____|",
      "      ",
      "      ",
    ],
    3: [
      " ____  ",
      "|___ \\ ",
      "  __) |",
      " |__ < ",
      " ___) |",
      "|____/ ",
      "       ",
      "       ",
    ],
    4: [
      " _  _   ",
      "| || |  ",
      "| || |_ ",
      "|__   _|",
      "   | |  ",
      "   |_|  ",
      "        ",
      "        ",
    ],
    5: [
      " _____ ",
      "| ____|",
      "| |__  ",
      "|___ \\ ",
      " ___) |",
      "|____/ ",
      "       ",
      "       ",
    ],
    6: [
      "   __  ",
      "  / /  ",
      " / /_  ",
      "|  _ \\ ",
      "| (_) |",
      " \\___/ ",
      "       ",
      "       ",
    ],
    7: [
      " ______ ",
      "|____  |",
      "    / / ",
      "   / /  ",
      "  / /   ",
      " /_/    ",
      "        ",
      "        ",
    ],
    8: [
      "  ___  ",
      " / _ \\ ",
      "| (_) |",
      " > _ < ",
      "| (_) |",
      " \\___/ ",
      "       ",
      "       ",
    ],
    9: [
      "  ___  ",
      " / _ \\ ",
      "| (_) |",
      " \\__, |",
      "   / / ",
      "  /_/  ",
      "       ",
      "       ",
    ],
  };
  function renderBigText(text) {
    const glyphs = [];
    for (const ch of text) {
      glyphs.push(
        BIG_FONT[ch] ||
          BIG_FONT[ch.toUpperCase()] ||
          BIG_FONT["?"] ||
          BIG_FONT[" "],
      );
    }
    if (!glyphs.length) return [];
    const lines = [];
    for (let r = 0; r < 8; r++) {
      let line = "";
      for (const g of glyphs) line += g[r] || "";
      lines.push(line.replace(/\s+$/, ""));
    }
    // Trim leading/trailing all-empty rows so words without descenders or
    // ascenders render compactly.
    while (lines.length && !lines[0].trim()) lines.shift();
    while (lines.length && !lines[lines.length - 1].trim()) lines.pop();
    return lines;
  }
  function Terminal({ open, onClose, autoLaunchGame = false }) {
    const [history, setHistory] = useState([]);
    const [gameOpen, setGameOpen] = useState(false);
    const [minimized, setMinimized] = useState(false);
    const [maximized, setMaximized] = useState(false);
    const [asciiMode, setAsciiMode] = useState(null); // null | 'text'
    const [gameMode, setGameMode] = useState(null); // null | 'forest' | 'forest-resume-prompt'
    const wasKonamiRef = useRef(false);
    const inputRef = useRef(null);
    const bodyRef = useRef(null);
    // Live forest-adventure state — ref'd (not state) so the per-turn updates
    // don't trigger React re-renders of the history list.
    const gameStateRef = useRef(null);
    // Typewriter controller: a queue of lines to type out, plus the current
    // skip function and intervalId so we can fast-forward or cancel cleanly.
    const typewriterCtrl = useRef({
      queue: [],
      busy: false,
      skipFn: null,
      started: null,
    });
    // Track which history indices have already kicked off their reveal so the
    // callback ref doesn't restart the animation on every re-render.
    const revealStartedRef = useRef(new Set());
    // Command-history recall. Past commands oldest->newest; a cursor into that list
    // (-1 = the live line, i.e. not navigating); and the draft we were typing before
    // pressing Up, restored when we navigate back down past the newest entry.
    const cmdHistoryRef = useRef([]);
    const histCursorRef = useRef(-1);
    const histDraftRef = useRef("");

    // Uncontrolled input: the <input> owns its value via the DOM. We only read
    // it on submit (via inputRef.current.value) and clear it the same way.
    // This avoids re-rendering the entire history list on every keystroke,
    // which is what causes the typing to feel sluggish.
    function clearInput() {
      if (inputRef.current) inputRef.current.value = "";
    }

    // Set the input value and drop the caret at the end (used by arrow recall).
    function setInputValue(v) {
      const el = inputRef.current;
      if (!el) return;
      el.value = v;
      el.setSelectionRange(v.length, v.length);
    }

    // Cancel any in-flight typewriter (e.g. on `clear` or terminal close).
    function cancelAllTypewriters() {
      if (typewriterCtrl.current.skipFn) typewriterCtrl.current.skipFn();
      typewriterCtrl.current.queue.length = 0;
      typewriterCtrl.current.busy = false;
      typewriterCtrl.current.skipFn = null;
    }

    // Append a batch of game-emitted lines to history all at once. The
    // forest adventure prints instantly — no typewriter reveal — so the
    // ASCII tables and room descriptions land legibly in one go.
    function enqueueGameLines(lines) {
      if (!lines || !lines.length) return;
      setHistory((h) => {
        const next = h.slice();
        for (const ln of lines) {
          next.push({
            kind: ln.kind || "ok",
            text: ln.text || "",
          });
        }
        return next;
      });
    }

    // Reveal `text` character-by-character on the given DOM element. Calls
    // onDone() when finished (either organically or via skipFn).
    function revealOnElement(el, text, lineIdx, onDone) {
      typewriterCtrl.current.busy = true;
      let i = 0;
      const id = setInterval(() => {
        i++;
        el.textContent = text.slice(0, i);
        if (i >= text.length) finalize();
      }, 25);
      function finalize() {
        clearInterval(id);
        el.textContent = text;
        typewriterCtrl.current.skipFn = null;
        typewriterCtrl.current.busy = false;
        // Mark the history line as no longer typing so the ref doesn't re-fire.
        setHistory((h) =>
          h.map((l, i2) =>
            i2 === lineIdx
              ? {
                  ...l,
                  text,
                  isTyping: false,
                  fullText: undefined,
                }
              : l,
          ),
        );
        // Process next queued reveal.
        const next = typewriterCtrl.current.queue.shift();
        if (next)
          revealOnElement(next.el, next.text, next.lineIdx, next.onDone);
        else if (onDone) onDone();
      }
      typewriterCtrl.current.skipFn = finalize;
    }

    // Start (or queue) a reveal for a freshly-mounted typing line.
    function startReveal(el, text, lineIdx) {
      if (typewriterCtrl.current.busy) {
        typewriterCtrl.current.queue.push({
          el,
          text,
          lineIdx,
        });
        return;
      }
      revealOnElement(el, text, lineIdx);
    }

    // Reset on open. If autoLaunchGame is true (Konami code path), jump straight into the game.
    useEffect(() => {
      if (open) {
        cancelAllTypewriters();
        revealStartedRef.current = new Set();
        setHistory(
          TERMINAL_BANNER.map((l) => ({
            kind: "ok",
            text: l,
          })),
        );
        clearInput();
        histCursorRef.current = -1;
        histDraftRef.current = "";
        setMinimized(false);
        setMaximized(false);
        setAsciiMode(null);
        setGameMode(null);
        gameStateRef.current = null;
        if (autoLaunchGame) {
          setGameOpen(true);
          wasKonamiRef.current = true;
        } else {
          setGameOpen(false);
          wasKonamiRef.current = false;
        }
        setTimeout(() => inputRef.current?.focus(), 30);
      }
    }, [open, autoLaunchGame]);

    // Auto-scroll — runs synchronously after DOM mutation so new lines and the
    // scroll-to-bottom happen in the same paint (no visible jump).
    useLayoutEffect(() => {
      if (bodyRef.current)
        bodyRef.current.scrollTop = bodyRef.current.scrollHeight;
    }, [history]);

    // Esc closes
    useEffect(() => {
      if (!open) return;
      const onKey = (e) => {
        if (e.key === "Escape") onClose();
      };
      window.addEventListener("keydown", onKey);
      return () => window.removeEventListener("keydown", onKey);
    }, [open, onClose]);
    function print(text, kind = "ok") {
      setHistory((h) =>
        h.concat([
          {
            kind,
            text,
          },
        ]),
      );
    }
    function run(raw) {
      const cmd = raw.trim().toLowerCase();
      print("$ " + raw, "cmd");
      if (!cmd) return;
      if (cmd === "help") {
        print("Available commands:");
        print("  about     · quick bio");
        print("  ascii     · ASCII art generator");
        print("  clear     · clear the screen");
        print("  contact   · how to reach me");
        print("  date      · current date");
        print("  exit      · close terminal");
        print("  forest    · explore the woods");
        print("  projects  · list of projects");
        print("  snake     · play snake");
        print("  stack     · tech stack");
        print("  whoami    · guess");
      } else if (cmd === "forest") {
        // Lazy-load + start. If a save exists, prompt to resume.
        const onReady = (F) => {
          const existing = F.load();
          if (existing) {
            print(
              "saved game found in these woods. type `yes` to resume, `no` to start fresh.",
              "dim",
            );
            setGameMode("forest-resume-prompt");
          } else {
            gameStateRef.current = null;
            const result = F.start();
            gameStateRef.current = result.state;
            setGameMode("forest");
            enqueueGameLines(result.lines);
          }
        };
        if (window.ForestAdventure) {
          onReady(window.ForestAdventure);
        } else {
          print("loading the woods…", "dim");
          loadForestAdventure()
            .then(onReady)
            .catch(() => {
              print("failed to load the woods. try again?", "err");
            });
        }
      } else if (cmd === "ascii" || cmd.startsWith("ascii ")) {
        const inline = raw.trim().slice(5).trim();
        if (inline) {
          print("");
          renderBigText(inline).forEach((line) => print(line, "art"));
          print("");
        } else {
          print("what should I render? (or `cancel`)");
          setAsciiMode("text");
        }
      } else if (cmd === "about") {
        print("Cristian Gabriel. Software developer, Bucharest, RO.");
        print("Works mostly with Java + Spring Boot. Likes plants.");
      } else if (cmd === "projects") {
        print("  1. Impostor            · social party game (live)");
        print("  2. Loopretto           · transcription tool for musicians");
        print(
          "  3. QuickPaste          · Chrome extension for clip-collecting",
        );
        print("  4. Trendalizer         · keyword interest grapher");
        print("  5. Furniture Boutique  · landing page");
      } else if (cmd === "stack") {
        print("Java · Spring Boot · Thymeleaf · PostgreSQL · MySQL");
        print("Linux · Git · GitHub · HTML · CSS · JS · Bootstrap");
      } else if (cmd === "contact") {
        print("email   : me@cristiangabriel.dev", "ok");
        print("github  : github.com/cristiangabriel88", "ok");
        print("linkedin: in/cristian-gabriel-constantinescu-781a6b237", "ok");
      } else if (cmd === "whoami") {
        print("guest@cristiangabriel.dev");
      } else if (cmd === "date") {
        print(new Date().toString());
      } else if (cmd === "snake") {
        print(
          "Launching snake... arrow keys / WASD to steer. Esc to exit.",
          "dim",
        );
        setTimeout(() => setGameOpen(true), 300);
      } else if (cmd === "clear") {
        cancelAllTypewriters();
        revealStartedRef.current = new Set();
        setHistory([]);
      } else if (cmd === "exit" || cmd === "close" || cmd === "q") {
        onClose();
      } else if (cmd === "sudo") {
        print("Nice try.", "err");
      } else if (cmd === "ls") {
        print("home/  about/  projects/  .secret/");
      } else if (cmd === "cat .secret") {
        print(
          "You found it. There's a tiny snake hungry for fruit. Try `game`.",
          "ok",
        );
      } else {
        print(`cg: command not found: ${cmd}`, "err");
        print("try `help`", "dim");
      }
    }
    function onInputKeyDown(e) {
      // Arrow recall only on the normal command line: not during the forest game,
      // the ASCII prompt, the snake overlay, or while a typewriter reveal runs.
      if (gameMode || asciiMode || gameOpen || typewriterCtrl.current.busy)
        return;
      const hist = cmdHistoryRef.current;
      if (e.key === "ArrowUp") {
        if (!hist.length) return;
        e.preventDefault();
        if (histCursorRef.current === -1) {
          histDraftRef.current = inputRef.current ? inputRef.current.value : "";
          histCursorRef.current = hist.length - 1;
        } else if (histCursorRef.current > 0) {
          histCursorRef.current -= 1;
        }
        setInputValue(hist[histCursorRef.current]);
      } else if (e.key === "ArrowDown") {
        if (histCursorRef.current === -1) return;
        e.preventDefault();
        if (histCursorRef.current < hist.length - 1) {
          histCursorRef.current += 1;
          setInputValue(hist[histCursorRef.current]);
        } else {
          histCursorRef.current = -1; // past the newest -> back to the draft
          setInputValue(histDraftRef.current);
        }
      }
    }
    function onSubmit(e) {
      e.preventDefault();

      // While the typewriter is mid-reveal, Enter skips the current paragraph
      // instead of submitting. The input value is left alone so the user can
      // keep typing through the reveal.
      if (typewriterCtrl.current.busy && typewriterCtrl.current.skipFn) {
        typewriterCtrl.current.skipFn();
        return;
      }
      const raw = inputRef.current ? inputRef.current.value : "";
      clearInput();

      // Forest adventure — resume prompt (yes/no after a save was detected).
      if (gameMode === "forest-resume-prompt") {
        print(">> " + raw, "cmd");
        const ans = raw.trim().toLowerCase();
        const F = window.ForestAdventure;
        if (ans === "yes" || ans === "y") {
          const loaded = F && F.load();
          if (loaded) {
            gameStateRef.current = loaded;
            setGameMode("forest");
            // Re-emit the current location so the player is reoriented.
            const ok = F.parse("look", gameStateRef.current);
            gameStateRef.current = ok.state;
            enqueueGameLines(
              [
                {
                  text: "(resumed.)",
                  kind: "dim",
                  instant: true,
                },
              ].concat(ok.lines),
            );
          } else {
            print("save was empty or corrupt. starting fresh.", "err");
            const result = F.start();
            gameStateRef.current = result.state;
            setGameMode("forest");
            enqueueGameLines(result.lines);
          }
        } else if (ans === "no" || ans === "n") {
          F.clearSave();
          const result = F.start();
          gameStateRef.current = result.state;
          setGameMode("forest");
          enqueueGameLines(result.lines);
        } else {
          print("please type `yes` or `no`.", "dim");
        }
        return;
      }

      // Forest adventure — main game loop.
      if (gameMode === "forest") {
        const F = window.ForestAdventure;
        print(">> " + raw, "cmd");
        const result = F.parse(raw, gameStateRef.current);
        gameStateRef.current = result.state;
        enqueueGameLines(result.lines);

        // Auto-save after each substantive turn (skip pure quit).
        if (!result.done) F.save(gameStateRef.current);

        // Handle game-end flows.
        if (result.ended) {
          // Story ending reached — clear save so the next `forest` starts fresh.
          F.clearSave();
          setGameMode(null);
          gameStateRef.current = null;
        } else if (result.done) {
          // Player quit cleanly.
          setGameMode(null);
          gameStateRef.current = null;
        }
        return;
      }

      // Interactive ASCII flow — collect text, then render.
      if (asciiMode === "text") {
        print("> " + raw, "cmd");
        const value = raw.trim();
        if (!value || value.toLowerCase() === "cancel") {
          print("cancelled.", "dim");
          setAsciiMode(null);
          return;
        }
        print("");
        renderBigText(value).forEach((line) => print(line, "art"));
        print("");
        setAsciiMode(null);
        return;
      }
      const entry = raw.trim();
      const hist = cmdHistoryRef.current;
      if (entry && hist[hist.length - 1] !== entry) {
        hist.push(entry);
        if (hist.length > 100) hist.shift();
      }
      histCursorRef.current = -1;
      histDraftRef.current = "";
      run(raw);
    }
    if (!open) return null;

    // ###### MINIMIZED PILL ######
    // Yellow button collapses the terminal to a small clickable pill at the bottom-right.
    if (minimized) {
      return (
        <button
          className="terminal-minimized-pill"
          onClick={() => setMinimized(false)}
          title="Restore terminal"
        >
          <span className="mp-dots">
            <span className="mp-dot" />
            <span className="mp-dot" />
            <span className="mp-dot" />
          </span>
          <span>cg.term ↑</span>
        </button>
      );
    }
    return (
      <div
        className={"terminal-backdrop" + (maximized ? " maximized" : "")}
        onMouseDown={(e) => {
          if (e.target === e.currentTarget) onClose();
        }}
      >
        <div
          className={"terminal" + (maximized ? " maximized" : "")}
          onMouseDown={(e) => e.stopPropagation()}
        >
          <div className="terminal-bar">
            <div className="dots">
              <button
                className="dot r"
                title="Close"
                aria-label="Close"
                onClick={onClose}
              />
              <button
                className="dot y"
                title="Minimize"
                aria-label="Minimize"
                onClick={() => setMinimized(true)}
              />
              <button
                className="dot g"
                title="Zoom"
                aria-label="Zoom"
                onClick={() => setMaximized((m) => !m)}
              />
            </div>
            <div className="title">cg@portfolio ~ %</div>
            <div
              style={{
                width: 56,
              }}
            />
          </div>
          {gameOpen ? (
            <MiniGame
              onExit={() => {
                // If the game was launched via Konami, exiting closes the whole terminal.
                // If launched via the `game` command, exiting drops back to the prompt.
                if (wasKonamiRef.current) {
                  onClose();
                } else {
                  setGameOpen(false);
                  setTimeout(() => inputRef.current?.focus(), 30);
                }
              }}
            />
          ) : (
            <React.Fragment>
              <div ref={bodyRef} className="terminal-body">
                {history.map((line, i) => (
                  <p
                    key={i}
                    className={line.kind + (line.isTyping ? " typing" : "")}
                    ref={
                      line.isTyping
                        ? (el) => {
                            if (el && !revealStartedRef.current.has(i)) {
                              revealStartedRef.current.add(i);
                              startReveal(el, line.fullText, i);
                            }
                          }
                        : null
                    }
                  >
                    {line.text}
                  </p>
                ))}
              </div>
              <form className="terminal-prompt" onSubmit={onSubmit}>
                <span className="ps">
                  {gameMode
                    ? window.ForestAdventure
                      ? window.ForestAdventure.PROMPT.trim()
                      : ">>"
                    : asciiMode
                      ? ">"
                      : "~ $"}
                </span>
                <input
                  ref={inputRef}
                  onKeyDown={onInputKeyDown}
                  defaultValue=""
                  autoFocus={true}
                  spellCheck={false}
                  autoComplete="off"
                  autoCorrect="off"
                  autoCapitalize="off"
                />
              </form>
            </React.Fragment>
          )}
        </div>
      </div>
    );
  }

  // ###### SNAKE ######
  // Canvas-rendered snake on a 32×20 board. Walls wrap (toroidal), so the snake
  // re-enters from the opposite edge. Game state lives in refs; only HUD/score
  // goes through React, so the tick loop never triggers a 600-cell re-render.
  //
  // Rendering: requestAnimationFrame drives the paint continuously and lerps each
  // segment between its previous cell and current cell over the tick interval, so
  // motion looks smooth at 60fps regardless of the (slower) logical tick rate.
  // Wrap-aware lerp: when a segment straddles the board edge, we split-draw it on
  // both sides so the wrap reads as a continuous slide rather than a teleport.
  function MiniGame({ onExit }) {
    const COLS = 32,
      ROWS = 20;
    const PX = 16; // logical pixel size per cell — large enough to fit textured sprites (eyes, shading, apple stem)
    const INIT_SNAKE = [
      {
        x: 16,
        y: 10,
      },
      {
        x: 15,
        y: 10,
      },
      {
        x: 14,
        y: 10,
      },
    ];
    const TICK_BASE = 110; // ms per cell at score 0
    const TICK_MIN = 60; // ms per cell at high score

    const canvasRef = useRef(null);
    const snakeRef = useRef(INIT_SNAKE);
    const prevSnakeRef = useRef(INIT_SNAKE); // snake positions *before* the current tick — used as the lerp "from"
    const foodRef = useRef({
      x: 22,
      y: 10,
    });
    const dirRef = useRef({
      dx: 1,
      dy: 0,
    });
    const lastAppliedDirRef = useRef({
      dx: 1,
      dy: 0,
    });
    const scoreRef = useRef(0);
    const runningRef = useRef(false);
    const tickIntervalRef = useRef(TICK_BASE);

    // ###### INPUT RESPONSIVENESS ######
    // dirQueue: pending direction changes (size ≤ 2) so a quick right→down isn't
    //   dropped when both keys land between ticks — each tick consumes one entry.
    // lastTickAt + tickFnRef + MIN_INPUT_GAP: lets a valid turn fire a tick
    //   immediately instead of waiting up to tick-time, capped so input spam can't
    //   make the snake move faster than ~22 cells/sec.
    const dirQueueRef = useRef([]);
    const lastTickAtRef = useRef(0);
    const tickFnRef = useRef(null);
    const MIN_INPUT_GAP = 45;
    const [score, setScore] = useState(0);
    const [length, setLength] = useState(INIT_SNAKE.length);
    const [running, setRunning] = useState(false);
    const [over, setOver] = useState(false);
    function spawnFood(currentSnake) {
      for (let i = 0; i < 200; i++) {
        const f = {
          x: Math.floor(Math.random() * COLS),
          y: Math.floor(Math.random() * ROWS),
        };
        if (!currentSnake.some((s) => s.x === f.x && s.y === f.y)) return f;
      }
      return {
        x: 0,
        y: 0,
      };
    }

    // ###### SPRITES ######
    // Each cell is PX×PX. Sprites use 1–2 pixel features (rim shade, highlight, eyes)
    // for a textured pixel-art read once the canvas is upscaled. Drawn in absolute
    // pixel coords so we can position at fractional cell offsets (for the lerp).
    function drawBackground(ctx) {
      ctx.fillStyle = "#0F1A07";
      ctx.fillRect(0, 0, COLS * PX, ROWS * PX);
      // Faint cross-hatch dots — gives the board a board feel without competing for attention.
      ctx.fillStyle = "rgba(122, 163, 85, 0.08)";
      for (let y = 0; y < ROWS; y++) {
        for (let x = 0; x < COLS; x++) {
          ctx.fillRect(x * PX + PX - 2, y * PX + PX - 2, 1, 1);
        }
      }
    }
    function drawBody(ctx, px, py) {
      // Rim (dark), main (mid green), highlight (light dot), shadow (bottom-right).
      ctx.fillStyle = "#2D5016";
      ctx.fillRect(px + 1, py + 1, PX - 2, PX - 2);
      ctx.fillStyle = "#5A8A3C";
      ctx.fillRect(px + 2, py + 2, PX - 4, PX - 4);
      ctx.fillStyle = "#7AA355";
      ctx.fillRect(px + 3, py + 3, 2, 2);
      ctx.fillStyle = "#2D5016";
      ctx.fillRect(px + PX - 5, py + PX - 5, 2, 2);
    }
    function drawHead(ctx, px, py, dir) {
      // Rim + brighter face so the head reads as distinct from the body.
      ctx.fillStyle = "#2D5016";
      ctx.fillRect(px + 1, py + 1, PX - 2, PX - 2);
      ctx.fillStyle = "#A8CC7A";
      ctx.fillRect(px + 2, py + 2, PX - 4, PX - 4);
      ctx.fillStyle = "#DFEFD2";
      ctx.fillRect(px + 3, py + 3, 3, 2);
      // Eyes — placed on the leading edge of the head based on direction.
      ctx.fillStyle = "#0F1A07";
      let ax, ay, bx, by;
      if (dir.dx === 1) {
        ax = px + PX - 5;
        ay = py + 4;
        bx = px + PX - 5;
        by = py + PX - 6;
      } else if (dir.dx === -1) {
        ax = px + 3;
        ay = py + 4;
        bx = px + 3;
        by = py + PX - 6;
      } else if (dir.dy === 1) {
        ax = px + 4;
        ay = py + PX - 5;
        bx = px + PX - 6;
        by = py + PX - 5;
      } else {
        ax = px + 4;
        ay = py + 3;
        bx = px + PX - 6;
        by = py + 3;
      }
      ctx.fillRect(ax, ay, 2, 2);
      ctx.fillRect(bx, by, 2, 2);
    }
    function drawFood(ctx, px, py) {
      // Apple silhouette: dark rim, red body, highlight dot, brown stem, leaf.
      ctx.fillStyle = "#5A1A0A";
      ctx.fillRect(px + 3, py + 5, PX - 6, PX - 7);
      ctx.fillStyle = "#C24A2A";
      ctx.fillRect(px + 4, py + 6, PX - 8, PX - 9);
      ctx.fillStyle = "#E8B19A";
      ctx.fillRect(px + 5, py + 7, 2, 2);
      ctx.fillStyle = "#3A2410";
      ctx.fillRect(px + (PX >> 1) - 1, py + 3, 2, 3);
      ctx.fillStyle = "#7AA355";
      ctx.fillRect(px + (PX >> 1) + 1, py + 2, 3, 2);
    }

    // ###### RAF DRAW ######
    // Lerp each segment from prev cell to current cell using (time-since-tick / tickInterval).
    // Wrap handling: if the segment travelled more than 1 cell in a tick (e.g. 31→0), we
    // know it wrapped. Adjust the delta so the lerp goes the short way (off the board), then
    // split-draw on the opposite edge so the wrap looks continuous.
    function draw() {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext("2d");
      ctx.imageSmoothingEnabled = false;
      drawBackground(ctx);
      drawFood(ctx, foodRef.current.x * PX, foodRef.current.y * PX);
      const snake = snakeRef.current;
      const prev = prevSnakeRef.current;
      const interval = tickIntervalRef.current;
      let t = (performance.now() - lastTickAtRef.current) / interval;
      if (t < 0) t = 0;
      else if (t > 1) t = 1;

      // Back-to-front so the head paints on top of the neck.
      for (let i = snake.length - 1; i >= 0; i--) {
        const to = snake[i];
        // On growth, the new tail-tip has no prev — anchor it at its current cell (no motion).
        const from = i < prev.length ? prev[i] : to;
        let dx = to.x - from.x;
        let dy = to.y - from.y;
        // Wrap-aware delta: any |d| > 1 means the segment crossed the board edge.
        if (dx > 1) dx -= COLS;
        else if (dx < -1) dx += COLS;
        if (dy > 1) dy -= ROWS;
        else if (dy < -1) dy += ROWS;
        const cx = (from.x + dx * t) * PX;
        const cy = (from.y + dy * t) * PX;
        const paint = (px, py) => {
          if (i === 0) drawHead(ctx, px, py, lastAppliedDirRef.current);
          else drawBody(ctx, px, py);
        };
        paint(cx, cy);
        // Split-draw across wrapped edges so the segment is visible on both sides during the slide.
        if (cx < 0) paint(cx + COLS * PX, cy);
        else if (cx > (COLS - 1) * PX) paint(cx - COLS * PX, cy);
        if (cy < 0) paint(cx, cy + ROWS * PX);
        else if (cy > (ROWS - 1) * PX) paint(cx, cy - ROWS * PX);
      }
    }
    function begin() {
      snakeRef.current = INIT_SNAKE;
      prevSnakeRef.current = INIT_SNAKE;
      foodRef.current = spawnFood(INIT_SNAKE);
      dirRef.current = {
        dx: 1,
        dy: 0,
      };
      lastAppliedDirRef.current = {
        dx: 1,
        dy: 0,
      };
      dirQueueRef.current = [];
      lastTickAtRef.current = performance.now();
      tickIntervalRef.current = TICK_BASE;
      scoreRef.current = 0;
      runningRef.current = true;
      setScore(0);
      setLength(INIT_SNAKE.length);
      setOver(false);
      setRunning(true);
    }

    // ###### TICK LOOP ######
    // Logical step only: snapshot prev positions, compute next snake, update interval.
    // Drawing happens in the RAF loop below, so a tick never touches the canvas directly.
    useEffect(() => {
      if (!running) return;
      let timer;
      let cancelled = false;
      function tick() {
        if (cancelled || !runningRef.current) return;
        // Cancel any scheduled tick — we might be called early from the key handler.
        clearTimeout(timer);

        // Consume one queued direction. Validated at enqueue, so always safe.
        if (dirQueueRef.current.length > 0) {
          dirRef.current = dirQueueRef.current.shift();
        }
        const d = dirRef.current;
        const snake = snakeRef.current;
        const head = snake[0];
        // Wall wrap — modular arithmetic, no death at the edge.
        const newHead = {
          x: (head.x + d.dx + COLS) % COLS,
          y: (head.y + d.dy + ROWS) % ROWS,
        };
        const food = foodRef.current;
        const ate = newHead.x === food.x && newHead.y === food.y;
        // Self collision: skip tail tip if not eating (tail vacates the cell this tick).
        const checkAgainst = ate ? snake : snake.slice(0, -1);
        for (let i = 0; i < checkAgainst.length; i++) {
          if (
            checkAgainst[i].x === newHead.x &&
            checkAgainst[i].y === newHead.y
          ) {
            runningRef.current = false;
            setRunning(false);
            setOver(true);
            return;
          }
        }
        lastAppliedDirRef.current = d;

        // Snapshot pre-tick positions so the RAF lerp has a "from" anchor.
        prevSnakeRef.current = snake;
        if (ate) {
          snakeRef.current = [newHead, ...snake];
          scoreRef.current += 1;
          foodRef.current = spawnFood(snakeRef.current);
          setScore(scoreRef.current);
          setLength(snakeRef.current.length);
        } else {
          snakeRef.current = [newHead, ...snake.slice(0, -1)];
        }
        lastTickAtRef.current = performance.now();
        tickIntervalRef.current = Math.max(
          TICK_MIN,
          TICK_BASE - scoreRef.current * 3,
        );
        timer = setTimeout(tick, tickIntervalRef.current);
      }
      tickFnRef.current = tick;
      timer = setTimeout(tick, TICK_BASE);
      return () => {
        cancelled = true;
        clearTimeout(timer);
        tickFnRef.current = null;
      };
    }, [running]);

    // ###### RAF RENDER LOOP ######
    // Runs from mount until unmount. Drawing every frame is cheap (a few dozen fillRects)
    // and keeps motion buttery at the display refresh rate while ticks fire at 9–17Hz.
    useEffect(() => {
      let raf;
      function frame() {
        draw();
        raf = requestAnimationFrame(frame);
      }
      raf = requestAnimationFrame(frame);
      return () => cancelAnimationFrame(raf);
    }, []);

    // ###### KEYBOARD ######
    useEffect(() => {
      function onKey(e) {
        if (e.key === "Escape") {
          onExit();
          return;
        }
        if (!runningRef.current) {
          if (e.key === " " || e.key === "Enter") {
            begin();
            e.preventDefault();
          }
          return;
        }
        let next = null;
        const k = e.key.toLowerCase();
        if (e.key === "ArrowUp" || k === "w")
          next = {
            dx: 0,
            dy: -1,
          };
        else if (e.key === "ArrowDown" || k === "s")
          next = {
            dx: 0,
            dy: 1,
          };
        else if (e.key === "ArrowLeft" || k === "a")
          next = {
            dx: -1,
            dy: 0,
          };
        else if (e.key === "ArrowRight" || k === "d")
          next = {
            dx: 1,
            dy: 0,
          };
        if (!next) return;
        e.preventDefault();

        // Validate against the last direction in the pipeline (queue tail, or
        // the snake's current heading if the queue is empty). This way a queued
        // turn can't be cancelled by an illegal 180° that came right after it.
        const q = dirQueueRef.current;
        const ref = q.length ? q[q.length - 1] : lastAppliedDirRef.current;
        if (next.dx === -ref.dx && next.dy === -ref.dy) return; // 180° reversal
        if (next.dx === ref.dx && next.dy === ref.dy) return; // duplicate

        q.push(next);
        if (q.length > 2) q.shift();

        // Fire a tick immediately if enough time has passed — this is what makes
        // turns feel instant. The MIN_INPUT_GAP cap stops input spam from
        // accelerating the snake beyond ~22 cells/sec.
        const now = performance.now();
        if (now - lastTickAtRef.current >= MIN_INPUT_GAP && tickFnRef.current) {
          tickFnRef.current();
        }
      }
      window.addEventListener("keydown", onKey);
      return () => window.removeEventListener("keydown", onKey);
    }, [onExit]);
    return (
      <div className="mini-game snake">
        <div className="mg-hud">
          <span>SCORE: {score}</span>
          <span>LEN: {length}</span>
          <span
            style={{
              cursor: "pointer",
            }}
            onClick={onExit}
          >
            [esc] exit
          </span>
        </div>
        <div className="snake-stage">
          <canvas
            ref={canvasRef}
            className="snake-canvas"
            width={COLS * PX}
            height={ROWS * PX}
          />
        </div>
        {!running && (
          <div className="mg-overlay">
            {over ? (
              <React.Fragment>
                <h4>GAME OVER</h4>
                <p>{`Score: ${score}. Length: ${length}.`}</p>
                <button className="mg-btn" onClick={begin}>
                  play again
                </button>
                <button
                  className="mg-btn"
                  onClick={onExit}
                  style={{
                    marginTop: 6,
                  }}
                >
                  back to terminal
                </button>
              </React.Fragment>
            ) : (
              <React.Fragment>
                <h4>SNAKE</h4>
                <p>
                  Arrows or WASD to steer. Walls wrap. Eat the fruit. Don't bite
                  yourself.
                </p>
                <button className="mg-btn" onClick={begin}>
                  start
                </button>
              </React.Fragment>
            )}
          </div>
        )}
      </div>
    );
  }

  // ─────────── Hook: keystroke listener for "cg" ───────────
  function useSecretShortcut(sequence, onMatch) {
    useEffect(() => {
      let buf = "";
      let resetTimer;
      function onKey(e) {
        // Ignore when typing inside inputs/textareas
        const t = e.target;
        if (
          t &&
          (t.tagName === "INPUT" ||
            t.tagName === "TEXTAREA" ||
            t.isContentEditable)
        )
          return;
        if (!/^[a-zA-Z0-9]$/.test(e.key)) return;
        buf = (buf + e.key.toLowerCase()).slice(-sequence.length);
        clearTimeout(resetTimer);
        resetTimer = setTimeout(() => {
          buf = "";
        }, 1500);
        if (buf === sequence) {
          buf = "";
          // Stop the matching keydown from also producing an input/keypress event,
          // which would otherwise land in the terminal input that's about to mount.
          e.preventDefault();
          onMatch();
        }
      }
      window.addEventListener("keydown", onKey);
      return () => {
        window.removeEventListener("keydown", onKey);
        clearTimeout(resetTimer);
      };
    }, [sequence, onMatch]);
  }

  // ###### HOOK: KONAMI CODE LISTENER ######
  // Sequence: ↑ ↑ ↓ ↓ ← → ← → B A. Matches Event.key values exactly.
  const KONAMI_SEQUENCE = [
    "ArrowUp",
    "ArrowUp",
    "ArrowDown",
    "ArrowDown",
    "ArrowLeft",
    "ArrowRight",
    "ArrowLeft",
    "ArrowRight",
    "b",
    "a",
  ];
  function useKonamiCode(onMatch) {
    useEffect(() => {
      let idx = 0;
      function onKey(e) {
        // Ignore while typing into form fields.
        const t = e.target;
        if (
          t &&
          (t.tagName === "INPUT" ||
            t.tagName === "TEXTAREA" ||
            t.isContentEditable)
        )
          return;
        const expected = KONAMI_SEQUENCE[idx];
        const key = e.key.length === 1 ? e.key.toLowerCase() : e.key;
        if (key === expected) {
          idx++;
          if (idx === KONAMI_SEQUENCE.length) {
            idx = 0;
            // Same focus-race fix as useSecretShortcut: stop the final 'a' from
            // being typed into the terminal input that's about to mount.
            e.preventDefault();
            onMatch();
          }
        } else {
          // Allow restart-from-start if the wrong key happened to be the first key of the sequence.
          idx = key === KONAMI_SEQUENCE[0] ? 1 : 0;
        }
      }
      window.addEventListener("keydown", onKey);
      return () => window.removeEventListener("keydown", onKey);
    }, [onMatch]);
  }
  Object.assign(window, {
    LeafParticles,
    PixelCharacter,
    IdleGarden,
    Terminal,
    useSecretShortcut,
    useKonamiCode,
  });
})();
