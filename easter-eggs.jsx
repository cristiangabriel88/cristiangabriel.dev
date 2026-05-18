/* global React, CHARACTER_FRAMES, PixelGrid */
// ─────────────────────────────────────────────────────────────
// Easter eggs:
//  1. Leaf particles drift from cursor
//  2. Tiny pixel character walks along bottom of viewport
//  3. Terminal overlay (type "cg" to open)
//  4. Mini-game (catch falling leaves) — launched from terminal
// ─────────────────────────────────────────────────────────────

const { useState, useEffect, useRef, useCallback } = React;

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

    let pos = { x: -100, y: -100 };

    function onMove(e) {
      pos = { x: e.clientX, y: e.clientY };
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
        const el = document.createElement('div');
        el.className = 'leaf';
        const hue = 80 + Math.random() * 30;
        const sat = 30 + Math.random() * 25;
        const lite = 35 + Math.random() * 15;
        const size = 8 + Math.random() * 10;
        const left = x - size / 2;
        const top  = y - size / 2;
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
          x, y,
          left, top,             // cached so the tick loop never reads layout
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
      let dt = now - last; last = now;
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
        p.vy += 0.0003 * dt;           // gentle gravity (already time-scaled)
        p.rot += p.vr * 0.02 * tScale;
        const alpha = Math.max(0, 1 - p.life / p.maxLife);
        // Cached spawn coords — no `parseFloat(p.el.style.left)` layout read.
        p.el.style.transform = `translate3d(${p.x - p.left}px, ${p.y - p.top}px, 0) rotate(${p.rot}deg)`;
        p.el.style.opacity = alpha;
        if (p.life > p.maxLife) {
          p.el.remove();
          ps.splice(i, 1);
        }
      }
      rafRef.current = requestAnimationFrame(tick);
    }
    rafRef.current = requestAnimationFrame(tick);
    window.addEventListener('mousemove', onMove);
    return () => {
      window.removeEventListener('mousemove', onMove);
      cancelAnimationFrame(rafRef.current);
      particlesRef.current.forEach(p => p.el.remove());
      particlesRef.current = [];
    };
  }, [enabled]);

  return React.createElement('div', { ref: layerRef, className: 'leaf-layer' });
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
      const dt = now - last; last = now;
      stepAcc += dt;
      frameAcc += dt;
      if (stepAcc > 16) {
        stepAcc = 0;
        setX(prev => {
          let next = prev + dirRef.current * 0.6;
          const maxX = window.innerWidth - 60;
          const minX = 220; // past sidebar
          if (next > maxX) { dirRef.current = -1; setFlip(true); next = maxX; }
          if (next < minX) { dirRef.current = 1;  setFlip(false); next = minX; }
          return next;
        });
      }
      if (frameAcc > 220) {
        frameAcc = 0;
        setFrame(f => (f + 1) % 2);
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
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => {
      window.removeEventListener('scroll', onScroll);
      clearTimeout(idleTimer);
    };
  }, [enabled]);

  if (!enabled) return null;

  return React.createElement('div', {
    className: 'pixel-character' + (scrolling ? ' hidden' : ''),
    style: {
      transform: `translateX(${x}px) scaleX(${flip ? -1 : 1})`,
    }
  },
    React.createElement(PixelGrid, {
      rows: CHARACTER_FRAMES[frame],
      scale: 3,
    })
  );
}

// ─────────── 3. Terminal + 4. Mini-game ───────────
const TERMINAL_BANNER = [
  ' ___  ___  _ _ ',
  '|  _|/ __|| | |',
  '| |_ \\__ \\| | |',
  '|___||___/|_|_|',
  '',
  '┌── cg.term v1.0  ────────────────────────────────────────',
  '│  type `help` for commands. `exit` or Esc to close.',
  '└──────────────────────────────────────────────────────────',
  '',
];

function Terminal({ open, onClose, autoLaunchGame = false }) {
  const [history, setHistory] = useState([]);
  const [input, setInput] = useState('');
  const [gameOpen, setGameOpen] = useState(false);
  const [minimized, setMinimized] = useState(false);
  const [maximized, setMaximized] = useState(false);
  const wasKonamiRef = useRef(false);
  const inputRef = useRef(null);
  const bodyRef = useRef(null);

  // Reset on open. If autoLaunchGame is true (Konami code path), jump straight into the game.
  useEffect(() => {
    if (open) {
      setHistory(TERMINAL_BANNER.map(l => ({ kind: 'ok', text: l })));
      setInput('');
      setMinimized(false);
      setMaximized(false);
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

  // Auto-scroll
  useEffect(() => {
    if (bodyRef.current) bodyRef.current.scrollTop = bodyRef.current.scrollHeight;
  }, [history]);

  // Esc closes
  useEffect(() => {
    if (!open) return;
    const onKey = (e) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  function print(text, kind = 'ok') {
    setHistory(h => h.concat([{ kind, text }]));
  }

  function run(raw) {
    const cmd = raw.trim().toLowerCase();
    print('$ ' + raw, 'cmd');
    if (!cmd) return;
    if (cmd === 'help') {
      print('Available commands:');
      print('  about     · quick bio');
      print('  projects  · list of projects');
      print('  stack     · tech stack');
      print('  contact   · how to reach me');
      print('  game      · play snake');
      print('  whoami    · guess');
      print('  date      · current date');
      print('  clear     · clear the screen');
      print('  exit      · close terminal');
    } else if (cmd === 'about') {
      print('Cristian Gabriel. Software engineer, Bucharest, RO.');
      print('Works mostly with Java + Spring Boot. Likes plants.');
    } else if (cmd === 'projects') {
      print('  1. Impostor            · social party game (live)');
      print('  2. Loopretto           · transcription tool for musicians');
      print('  3. QuickPaste          · Chrome extension for clip-collecting');
      print('  4. Trendalizer         · keyword interest grapher');
      print('  5. Furniture Boutique  · landing page');
    } else if (cmd === 'stack') {
      print('Java · Spring Boot · Thymeleaf · PostgreSQL · MySQL');
      print('Linux · Git · GitHub · HTML · CSS · JS · Bootstrap');
    } else if (cmd === 'contact') {
      print('email   : me@cristiangabriel.dev', 'ok');
      print('github  : github.com/cristiangabriel88', 'ok');
      print('linkedin: in/cristian-gabriel-constantinescu-781a6b237', 'ok');
    } else if (cmd === 'whoami') {
      print('guest@cristiangabriel.dev');
    } else if (cmd === 'date') {
      print(new Date().toString());
    } else if (cmd === 'game') {
      print('Launching snake... arrow keys / WASD to steer. Esc to exit.', 'dim');
      setTimeout(() => setGameOpen(true), 300);
    } else if (cmd === 'clear') {
      setHistory([]);
    } else if (cmd === 'exit' || cmd === 'close' || cmd === 'q') {
      onClose();
    } else if (cmd === 'sudo') {
      print('Nice try.', 'err');
    } else if (cmd === 'ls') {
      print('home/  about/  projects/  .secret/');
    } else if (cmd === 'cat .secret') {
      print('You found it. There\'s a tiny snake hungry for fruit. Try `game`.', 'ok');
    } else {
      print(`cg: command not found: ${cmd}`, 'err');
      print('try `help`', 'dim');
    }
  }

  function onSubmit(e) {
    e.preventDefault();
    run(input);
    setInput('');
  }

  if (!open) return null;

  // ###### MINIMIZED PILL ######
  // Yellow button collapses the terminal to a small clickable pill at the bottom-right.
  if (minimized) {
    return React.createElement('button', {
      className: 'terminal-minimized-pill',
      onClick: () => setMinimized(false),
      title: 'Restore terminal',
    },
      React.createElement('span', { className: 'mp-dots' },
        React.createElement('span', { className: 'mp-dot' }),
        React.createElement('span', { className: 'mp-dot' }),
        React.createElement('span', { className: 'mp-dot' }),
      ),
      React.createElement('span', null, 'cg.term ↑'),
    );
  }

  return React.createElement('div', {
    className: 'terminal-backdrop' + (maximized ? ' maximized' : ''),
    onMouseDown: (e) => { if (e.target === e.currentTarget) onClose(); }
  },
    React.createElement('div', {
      className: 'terminal' + (maximized ? ' maximized' : ''),
      onMouseDown: e => e.stopPropagation()
    },
      React.createElement('div', { className: 'terminal-bar' },
        React.createElement('div', { className: 'dots' },
          // ###### MAC-STYLE BUTTONS ######
          // Red = close, Yellow = minimize, Green = zoom/maximize.
          React.createElement('button', {
            className: 'dot r', title: 'Close', 'aria-label': 'Close',
            onClick: onClose,
          }),
          React.createElement('button', {
            className: 'dot y', title: 'Minimize', 'aria-label': 'Minimize',
            onClick: () => setMinimized(true),
          }),
          React.createElement('button', {
            className: 'dot g', title: 'Zoom', 'aria-label': 'Zoom',
            onClick: () => setMaximized(m => !m),
          }),
        ),
        React.createElement('div', { className: 'title' }, 'cg@portfolio ~ %'),
        React.createElement('div', { style: { width: 56 } }),
      ),
      gameOpen
        ? React.createElement(MiniGame, { onExit: () => {
            // If the game was launched via Konami, exiting closes the whole terminal.
            // If launched via the `game` command, exiting drops back to the prompt.
            if (wasKonamiRef.current) {
              onClose();
            } else {
              setGameOpen(false);
              setTimeout(() => inputRef.current?.focus(), 30);
            }
          } })
        : React.createElement(React.Fragment, null,
            React.createElement('div', { ref: bodyRef, className: 'terminal-body' },
              history.map((line, i) =>
                React.createElement('p', { key: i, className: line.kind }, line.text)
              )
            ),
            React.createElement('form', { className: 'terminal-prompt', onSubmit },
              React.createElement('span', { className: 'ps' }, '~ $'),
              React.createElement('input', {
                ref: inputRef,
                value: input,
                onChange: e => setInput(e.target.value),
                autoFocus: true,
                spellCheck: false,
                autoComplete: 'off',
              })
            )
          )
    )
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
  const COLS = 32, ROWS = 20;
  const PX = 16; // logical pixel size per cell — large enough to fit textured sprites (eyes, shading, apple stem)
  const INIT_SNAKE = [{ x: 16, y: 10 }, { x: 15, y: 10 }, { x: 14, y: 10 }];
  const TICK_BASE = 110; // ms per cell at score 0
  const TICK_MIN  = 60;  // ms per cell at high score

  const canvasRef = useRef(null);
  const snakeRef    = useRef(INIT_SNAKE);
  const prevSnakeRef = useRef(INIT_SNAKE); // snake positions *before* the current tick — used as the lerp "from"
  const foodRef  = useRef({ x: 22, y: 10 });
  const dirRef         = useRef({ dx: 1, dy: 0 });
  const lastAppliedDirRef = useRef({ dx: 1, dy: 0 });
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
      if (!currentSnake.some(s => s.x === f.x && s.y === f.y)) return f;
    }
    return { x: 0, y: 0 };
  }

  // ###### SPRITES ######
  // Each cell is PX×PX. Sprites use 1–2 pixel features (rim shade, highlight, eyes)
  // for a textured pixel-art read once the canvas is upscaled. Drawn in absolute
  // pixel coords so we can position at fractional cell offsets (for the lerp).
  function drawBackground(ctx) {
    ctx.fillStyle = '#0F1A07';
    ctx.fillRect(0, 0, COLS * PX, ROWS * PX);
    // Faint cross-hatch dots — gives the board a board feel without competing for attention.
    ctx.fillStyle = 'rgba(122, 163, 85, 0.08)';
    for (let y = 0; y < ROWS; y++) {
      for (let x = 0; x < COLS; x++) {
        ctx.fillRect(x * PX + PX - 2, y * PX + PX - 2, 1, 1);
      }
    }
  }

  function drawBody(ctx, px, py) {
    // Rim (dark), main (mid green), highlight (light dot), shadow (bottom-right).
    ctx.fillStyle = '#2D5016';
    ctx.fillRect(px + 1, py + 1, PX - 2, PX - 2);
    ctx.fillStyle = '#5A8A3C';
    ctx.fillRect(px + 2, py + 2, PX - 4, PX - 4);
    ctx.fillStyle = '#7AA355';
    ctx.fillRect(px + 3, py + 3, 2, 2);
    ctx.fillStyle = '#2D5016';
    ctx.fillRect(px + PX - 5, py + PX - 5, 2, 2);
  }

  function drawHead(ctx, px, py, dir) {
    // Rim + brighter face so the head reads as distinct from the body.
    ctx.fillStyle = '#2D5016';
    ctx.fillRect(px + 1, py + 1, PX - 2, PX - 2);
    ctx.fillStyle = '#A8CC7A';
    ctx.fillRect(px + 2, py + 2, PX - 4, PX - 4);
    ctx.fillStyle = '#DFEFD2';
    ctx.fillRect(px + 3, py + 3, 3, 2);
    // Eyes — placed on the leading edge of the head based on direction.
    ctx.fillStyle = '#0F1A07';
    let ax, ay, bx, by;
    if (dir.dx === 1)       { ax = px + PX - 5; ay = py + 4;       bx = px + PX - 5; by = py + PX - 6; }
    else if (dir.dx === -1) { ax = px + 3;      ay = py + 4;       bx = px + 3;      by = py + PX - 6; }
    else if (dir.dy === 1)  { ax = px + 4;      ay = py + PX - 5;  bx = px + PX - 6; by = py + PX - 5; }
    else                    { ax = px + 4;      ay = py + 3;       bx = px + PX - 6; by = py + 3; }
    ctx.fillRect(ax, ay, 2, 2);
    ctx.fillRect(bx, by, 2, 2);
  }

  function drawFood(ctx, px, py) {
    // Apple silhouette: dark rim, red body, highlight dot, brown stem, leaf.
    ctx.fillStyle = '#5A1A0A';
    ctx.fillRect(px + 3, py + 5, PX - 6, PX - 7);
    ctx.fillStyle = '#C24A2A';
    ctx.fillRect(px + 4, py + 6, PX - 8, PX - 9);
    ctx.fillStyle = '#E8B19A';
    ctx.fillRect(px + 5, py + 7, 2, 2);
    ctx.fillStyle = '#3A2410';
    ctx.fillRect(px + (PX >> 1) - 1, py + 3, 2, 3);
    ctx.fillStyle = '#7AA355';
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
    const ctx = canvas.getContext('2d');
    ctx.imageSmoothingEnabled = false;

    drawBackground(ctx);
    drawFood(ctx, foodRef.current.x * PX, foodRef.current.y * PX);

    const snake = snakeRef.current;
    const prev  = prevSnakeRef.current;
    const interval = tickIntervalRef.current;
    let t = (performance.now() - lastTickAtRef.current) / interval;
    if (t < 0) t = 0; else if (t > 1) t = 1;

    // Back-to-front so the head paints on top of the neck.
    for (let i = snake.length - 1; i >= 0; i--) {
      const to = snake[i];
      // On growth, the new tail-tip has no prev — anchor it at its current cell (no motion).
      const from = (i < prev.length) ? prev[i] : to;

      let dx = to.x - from.x;
      let dy = to.y - from.y;
      // Wrap-aware delta: any |d| > 1 means the segment crossed the board edge.
      if (dx >  1) dx -= COLS;
      else if (dx < -1) dx += COLS;
      if (dy >  1) dy -= ROWS;
      else if (dy < -1) dy += ROWS;

      const cx = (from.x + dx * t) * PX;
      const cy = (from.y + dy * t) * PX;

      const paint = (px, py) => {
        if (i === 0) drawHead(ctx, px, py, lastAppliedDirRef.current);
        else drawBody(ctx, px, py);
      };

      paint(cx, cy);
      // Split-draw across wrapped edges so the segment is visible on both sides during the slide.
      if (cx < 0)              paint(cx + COLS * PX, cy);
      else if (cx > (COLS - 1) * PX) paint(cx - COLS * PX, cy);
      if (cy < 0)              paint(cx, cy + ROWS * PX);
      else if (cy > (ROWS - 1) * PX) paint(cx, cy - ROWS * PX);
    }
  }

  function begin() {
    snakeRef.current = INIT_SNAKE;
    prevSnakeRef.current = INIT_SNAKE;
    foodRef.current = spawnFood(INIT_SNAKE);
    dirRef.current = { dx: 1, dy: 0 };
    lastAppliedDirRef.current = { dx: 1, dy: 0 };
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
        if (checkAgainst[i].x === newHead.x && checkAgainst[i].y === newHead.y) {
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
      tickIntervalRef.current = Math.max(TICK_MIN, TICK_BASE - scoreRef.current * 3);
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
      if (e.key === 'Escape') { onExit(); return; }
      if (!runningRef.current) {
        if (e.key === ' ' || e.key === 'Enter') { begin(); e.preventDefault(); }
        return;
      }
      let next = null;
      const k = e.key.toLowerCase();
      if (e.key === 'ArrowUp'    || k === 'w') next = { dx: 0, dy: -1 };
      else if (e.key === 'ArrowDown'  || k === 's') next = { dx: 0, dy: 1 };
      else if (e.key === 'ArrowLeft'  || k === 'a') next = { dx: -1, dy: 0 };
      else if (e.key === 'ArrowRight' || k === 'd') next = { dx: 1, dy: 0 };
      if (!next) return;
      e.preventDefault();

      // Validate against the last direction in the pipeline (queue tail, or
      // the snake's current heading if the queue is empty). This way a queued
      // turn can't be cancelled by an illegal 180° that came right after it.
      const q = dirQueueRef.current;
      const ref = q.length ? q[q.length - 1] : lastAppliedDirRef.current;
      if (next.dx === -ref.dx && next.dy === -ref.dy) return; // 180° reversal
      if (next.dx ===  ref.dx && next.dy ===  ref.dy) return; // duplicate

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
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onExit]);

  return React.createElement('div', { className: 'mini-game snake' },
    React.createElement('div', { className: 'mg-hud' },
      React.createElement('span', null, 'SCORE: ', score),
      React.createElement('span', null, 'LEN: ', length),
      React.createElement('span', { style: { cursor: 'pointer' }, onClick: onExit }, '[esc] exit'),
    ),
    React.createElement('div', { className: 'snake-stage' },
      React.createElement('canvas', {
        ref: canvasRef,
        className: 'snake-canvas',
        width: COLS * PX,
        height: ROWS * PX,
      })
    ),
    (!running) && React.createElement('div', { className: 'mg-overlay' },
      over
        ? React.createElement(React.Fragment, null,
            React.createElement('h4', null, 'GAME OVER'),
            React.createElement('p', null, `Score: ${score}. Length: ${length}.`),
            React.createElement('button', { className: 'mg-btn', onClick: begin }, 'play again'),
            React.createElement('button', { className: 'mg-btn', onClick: onExit, style: { marginTop: 6 } }, 'back to terminal'),
          )
        : React.createElement(React.Fragment, null,
            React.createElement('h4', null, 'SNAKE'),
            React.createElement('p', null, 'Arrows or WASD to steer. Walls wrap. Eat the fruit. Don\'t bite yourself.'),
            React.createElement('button', { className: 'mg-btn', onClick: begin }, 'start'),
          )
    )
  );
}

// ─────────── Hook: keystroke listener for "cg" ───────────
function useSecretShortcut(sequence, onMatch) {
  useEffect(() => {
    let buf = '';
    let resetTimer;
    function onKey(e) {
      // Ignore when typing inside inputs/textareas
      const t = e.target;
      if (t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.isContentEditable)) return;
      if (!/^[a-zA-Z0-9]$/.test(e.key)) return;
      buf = (buf + e.key.toLowerCase()).slice(-sequence.length);
      clearTimeout(resetTimer);
      resetTimer = setTimeout(() => { buf = ''; }, 1500);
      if (buf === sequence) {
        buf = '';
        // Stop the matching keydown from also producing an input/keypress event,
        // which would otherwise land in the terminal input that's about to mount.
        e.preventDefault();
        onMatch();
      }
    }
    window.addEventListener('keydown', onKey);
    return () => { window.removeEventListener('keydown', onKey); clearTimeout(resetTimer); };
  }, [sequence, onMatch]);
}

// ###### HOOK: KONAMI CODE LISTENER ######
// Sequence: ↑ ↑ ↓ ↓ ← → ← → B A. Matches Event.key values exactly.
const KONAMI_SEQUENCE = [
  'ArrowUp', 'ArrowUp', 'ArrowDown', 'ArrowDown',
  'ArrowLeft', 'ArrowRight', 'ArrowLeft', 'ArrowRight',
  'b', 'a',
];

function useKonamiCode(onMatch) {
  useEffect(() => {
    let idx = 0;
    function onKey(e) {
      // Ignore while typing into form fields.
      const t = e.target;
      if (t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.isContentEditable)) return;
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
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onMatch]);
}

Object.assign(window, { LeafParticles, PixelCharacter, Terminal, useSecretShortcut, useKonamiCode });
