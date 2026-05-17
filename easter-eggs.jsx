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
function LeafParticles({ enabled = true, burstRef }) {
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
    function spawn(x, y, intensity = 1, fragment = null) {
      const target = fragment || layer;
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
        target.appendChild(el);
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

    // Burst on demand (project hover) — batch all 14 appends through a single
    // DocumentFragment so we hit the DOM once instead of fourteen times.
    burstRef.current = (originEl) => {
      if (!originEl) return;
      const r = originEl.getBoundingClientRect();
      const ox = r.left + r.width / 2;
      const oy = r.top + r.height / 2;
      const frag = document.createDocumentFragment();
      for (let i = 0; i < 14; i++) {
        const angle = Math.random() * Math.PI * 2;
        const dist = Math.random() * 40;
        spawn(ox + Math.cos(angle) * dist, oy + Math.sin(angle) * dist, 1, frag);
      }
      layer.appendChild(frag);
    };

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
  }, [enabled, burstRef]);

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
// Grid-based snake on a 24×16 board. Arrow keys / WASD to steer, eat the fruit,
// don't bite yourself or hit a wall. Tick speeds up slightly as you grow.
function MiniGame({ onExit }) {
  const COLS = 24, ROWS = 16;
  const INIT_SNAKE = [{ x: 12, y: 8 }, { x: 11, y: 8 }, { x: 10, y: 8 }];

  const [snake, setSnake] = useState(INIT_SNAKE);
  const [food, setFood] = useState({ x: 18, y: 8 });
  const [score, setScore] = useState(0);
  const [running, setRunning] = useState(false);
  const [over, setOver] = useState(false);

  // ###### REFS FOR TICK LOOP ######
  // The tick reads direction from a ref so it always sees the latest input
  // without restarting the loop on every key press.
  const dirRef = useRef({ dx: 1, dy: 0 });
  const lastAppliedDirRef = useRef({ dx: 1, dy: 0 });

  function spawnFood(currentSnake) {
    // Find an empty cell. Bounded retry — board is tiny so this is fine.
    for (let i = 0; i < 200; i++) {
      const f = {
        x: Math.floor(Math.random() * COLS),
        y: Math.floor(Math.random() * ROWS),
      };
      if (!currentSnake.some(s => s.x === f.x && s.y === f.y)) return f;
    }
    return { x: 0, y: 0 };
  }

  function begin() {
    setSnake(INIT_SNAKE);
    setFood(spawnFood(INIT_SNAKE));
    setScore(0);
    setOver(false);
    setRunning(true);
    dirRef.current = { dx: 1, dy: 0 };
    lastAppliedDirRef.current = { dx: 1, dy: 0 };
  }

  // ###### TICK LOOP ######
  useEffect(() => {
    if (!running) return;
    let timer;
    function tick() {
      setSnake(prev => {
        const d = dirRef.current;
        const head = prev[0];
        const newHead = { x: head.x + d.dx, y: head.y + d.dy };

        // Wall collision
        if (newHead.x < 0 || newHead.x >= COLS || newHead.y < 0 || newHead.y >= ROWS) {
          setRunning(false); setOver(true);
          return prev;
        }
        // Self collision (skip the tail tip because it moves out of the way)
        const checkAgainst = (newHead.x === food.x && newHead.y === food.y) ? prev : prev.slice(0, -1);
        if (checkAgainst.some(s => s.x === newHead.x && s.y === newHead.y)) {
          setRunning(false); setOver(true);
          return prev;
        }

        lastAppliedDirRef.current = d;

        if (newHead.x === food.x && newHead.y === food.y) {
          const grown = [newHead, ...prev];
          setScore(s => s + 1);
          setFood(spawnFood(grown));
          return grown;
        }
        return [newHead, ...prev.slice(0, -1)];
      });
      // Speed up gradually with score; floor at 70ms.
      const speed = Math.max(70, 140 - score * 4);
      timer = setTimeout(tick, speed);
    }
    timer = setTimeout(tick, 140);
    return () => clearTimeout(timer);
  }, [running, food, score]);

  // ###### KEYBOARD ######
  useEffect(() => {
    function onKey(e) {
      if (e.key === 'Escape') { onExit(); return; }
      if (!running) {
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
      // Prevent a 180° turn into the snake's own neck.
      const last = lastAppliedDirRef.current;
      if (next.dx === -last.dx && next.dy === -last.dy) return;
      dirRef.current = next;
      e.preventDefault();
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [running, onExit]);

  // ###### RENDER ######
  const cells = [];
  for (let y = 0; y < ROWS; y++) {
    for (let x = 0; x < COLS; x++) {
      let kind = '';
      if (snake[0].x === x && snake[0].y === y) kind = 'head';
      else if (snake.some(s => s.x === x && s.y === y)) kind = 'body';
      else if (food.x === x && food.y === y) kind = 'food';
      cells.push(React.createElement('div', {
        key: `${x},${y}`,
        className: 'snake-cell' + (kind ? ' ' + kind : ''),
      }));
    }
  }

  return React.createElement('div', { className: 'mini-game snake' },
    React.createElement('div', { className: 'mg-hud' },
      React.createElement('span', null, 'SCORE: ', score),
      React.createElement('span', null, 'LEN: ', snake.length),
      React.createElement('span', { style: { cursor: 'pointer' }, onClick: onExit }, '[esc] exit'),
    ),
    React.createElement('div', {
      className: 'snake-board',
      style: { gridTemplateColumns: `repeat(${COLS}, 1fr)`, gridTemplateRows: `repeat(${ROWS}, 1fr)` },
    }, cells),
    (!running) && React.createElement('div', { className: 'mg-overlay' },
      over
        ? React.createElement(React.Fragment, null,
            React.createElement('h4', null, 'GAME OVER'),
            React.createElement('p', null, `Score: ${score}. Length: ${snake.length}.`),
            React.createElement('button', { className: 'mg-btn', onClick: begin }, 'play again'),
            React.createElement('button', { className: 'mg-btn', onClick: onExit, style: { marginTop: 6 } }, 'back to terminal'),
          )
        : React.createElement(React.Fragment, null,
            React.createElement('h4', null, 'SNAKE'),
            React.createElement('p', null, 'Arrow keys or WASD to steer. Eat the red fruit. Don\'t bite yourself.'),
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
