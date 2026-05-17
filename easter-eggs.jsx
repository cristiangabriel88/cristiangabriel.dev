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
      if (now - lastEmitRef.current > 90) {
        lastEmitRef.current = now;
        spawn(pos.x, pos.y, 1);
      }
    }
    function spawn(x, y, intensity = 1) {
      for (let i = 0; i < intensity; i++) {
        const el = document.createElement('div');
        el.className = 'leaf';
        const hue = 80 + Math.random() * 30;
        const sat = 30 + Math.random() * 25;
        const lite = 35 + Math.random() * 15;
        const size = 8 + Math.random() * 10;
        el.style.width = size + 'px';
        el.style.height = size + 'px';
        el.style.left = (x - size / 2) + 'px';
        el.style.top  = (y - size / 2) + 'px';
        el.innerHTML = `<svg viewBox="0 0 16 16" width="100%" height="100%">
          <path d="M8 1 C 13 4, 14 10, 8 15 C 2 10, 3 4, 8 1 Z" fill="hsl(${hue},${sat}%,${lite}%)" opacity="0.85"/>
          <path d="M8 1 L 8 15" stroke="hsl(${hue},${sat}%,${lite - 12}%)" stroke-width="0.8" />
        </svg>`;
        layer.appendChild(el);
        particlesRef.current.push({
          el,
          x, y,
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

    // Burst on demand (project hover)
    burstRef.current = (originEl) => {
      if (!originEl) return;
      const r = originEl.getBoundingClientRect();
      const ox = r.left + r.width / 2;
      const oy = r.top + r.height / 2;
      for (let i = 0; i < 14; i++) {
        const angle = Math.random() * Math.PI * 2;
        const dist = Math.random() * 40;
        spawn(ox + Math.cos(angle) * dist, oy + Math.sin(angle) * dist, 1);
      }
    };

    let last = performance.now();
    function tick(now) {
      const dt = now - last; last = now;
      const ps = particlesRef.current;
      for (let i = ps.length - 1; i >= 0; i--) {
        const p = ps[i];
        p.life += dt;
        p.sway += p.swayFreq * dt;
        p.x += p.vx + Math.sin(p.sway) * 0.4;
        p.y += p.vy;
        p.vy += 0.005 * dt * 0.06; // gentle gravity
        p.rot += p.vr * 0.02;
        const alpha = Math.max(0, 1 - p.life / p.maxLife);
        p.el.style.transform = `translate3d(${p.x - parseFloat(p.el.style.left)}px, ${p.y - parseFloat(p.el.style.top)}px, 0) rotate(${p.rot}deg)`;
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
  const wasKonamiRef = useRef(false);
  const inputRef = useRef(null);
  const bodyRef = useRef(null);

  // Reset on open. If autoLaunchGame is true (Konami code path), jump straight into the game.
  useEffect(() => {
    if (open) {
      setHistory(TERMINAL_BANNER.map(l => ({ kind: 'ok', text: l })));
      setInput('');
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
      print('  about     — quick bio');
      print('  projects  — list of projects');
      print('  stack     — tech stack');
      print('  contact   — how to reach me');
      print('  game      — play a mini-game');
      print('  whoami    — guess');
      print('  date      — current date');
      print('  clear     — clear the screen');
      print('  exit      — close terminal');
    } else if (cmd === 'about') {
      print('Cristian Gabriel — software engineer, Bucharest, RO.');
      print('Works mostly with Java + Spring Boot. Likes plants.');
    } else if (cmd === 'projects') {
      print('  1. Impostor       — social party game (live)');
      print('  2. Loopretto      — transcription tool for musicians');
      print('  3. QuickPaste     — Chrome extension for clip-collecting');
      print('  4. Trendalizer    — keyword interest grapher');
      print('  5. Furniture Boutique — landing page');
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
      print('Launching mini-game... use ← → to move. Esc to exit.', 'dim');
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
      print('You found it. There\'s a basket of leaves to catch — try `game`.', 'ok');
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

  return React.createElement('div', {
    className: 'terminal-backdrop',
    onMouseDown: (e) => { if (e.target === e.currentTarget) onClose(); }
  },
    React.createElement('div', { className: 'terminal', onMouseDown: e => e.stopPropagation() },
      React.createElement('div', { className: 'terminal-bar' },
        React.createElement('div', { className: 'dots' },
          React.createElement('span', { className: 'dot r' }),
          React.createElement('span', { className: 'dot y' }),
          React.createElement('span', { className: 'dot g' }),
        ),
        React.createElement('div', { className: 'title' }, 'cg@portfolio ~ %'),
        React.createElement('div', { style: { width: 40 } }),
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

function MiniGame({ onExit }) {
  const [score, setScore] = useState(0);
  const [lives, setLives] = useState(3);
  const [running, setRunning] = useState(false);
  const [over, setOver] = useState(false);
  const [items, setItems] = useState([]);
  const [bx, setBx] = useState(0.5);
  const areaRef = useRef(null);

  // Start
  function begin() {
    setScore(0); setLives(3); setItems([]); setOver(false); setRunning(true);
    if (areaRef.current) areaRef.current.focus();
  }

  // Game loop
  useEffect(() => {
    if (!running) return;
    let raf, last = performance.now(), spawnAcc = 0;
    function loop(now) {
      const dt = now - last; last = now;
      spawnAcc += dt;
      if (spawnAcc > 600) {
        spawnAcc = 0;
        setItems(it => it.concat([{
          id: Math.random(),
          x: 0.05 + Math.random() * 0.9,
          y: 0,
          vy: 0.0003 + Math.random() * 0.0004,
          kind: Math.random() < 0.85 ? 'leaf' : 'rock',
        }]));
      }
      setItems(it => it.map(o => ({ ...o, y: o.y + o.vy * dt })));
      raf = requestAnimationFrame(loop);
    }
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [running]);

  // Collision detect & cleanup
  useEffect(() => {
    if (!running) return;
    setItems(it => {
      const kept = [];
      let scoreDelta = 0, lifeDelta = 0;
      for (const o of it) {
        const catchY = 0.93;
        if (o.y >= catchY && Math.abs(o.x - bx) < 0.09) {
          if (o.kind === 'leaf') scoreDelta += 1;
          else lifeDelta -= 1;
        } else if (o.y >= 1) {
          if (o.kind === 'leaf') lifeDelta -= 1;
        } else {
          kept.push(o);
        }
      }
      if (scoreDelta) setScore(s => s + scoreDelta);
      if (lifeDelta) setLives(l => Math.max(0, l + lifeDelta));
      return kept;
    });
  }, [items, bx, running]);

  // Game over
  useEffect(() => {
    if (running && lives <= 0) {
      setRunning(false);
      setOver(true);
    }
  }, [lives, running]);

  // Keyboard
  useEffect(() => {
    function onKey(e) {
      if (e.key === 'Escape') { onExit(); return; }
      if (!running) return;
      if (e.key === 'ArrowLeft')  setBx(x => Math.max(0.05, x - 0.05));
      if (e.key === 'ArrowRight') setBx(x => Math.min(0.95, x + 0.05));
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [running, onExit]);

  return React.createElement('div', { className: 'mini-game', ref: areaRef, tabIndex: 0 },
    React.createElement('div', { className: 'mg-hud' },
      React.createElement('span', null, 'SCORE: ', score),
      React.createElement('span', null, 'LIVES: ', '♥'.repeat(lives) + '·'.repeat(Math.max(0, 3 - lives))),
      React.createElement('span', { style: { cursor: 'pointer' }, onClick: onExit }, '[esc] exit'),
    ),
    items.map(o =>
      React.createElement('div', {
        key: o.id,
        className: 'mg-falling',
        style: {
          left: `calc(${o.x * 100}% - 6px)`,
          top:  `calc(${o.y * 100}% - 6px)`,
        }
      },
        o.kind === 'leaf'
          ? React.createElement('svg', { viewBox: '0 0 16 16', width: 14, height: 14 },
              React.createElement('path', { d: 'M8 1 C 13 4, 14 10, 8 15 C 2 10, 3 4, 8 1 Z', fill: '#7AA355' })
            )
          : React.createElement('div', { style: { width: 12, height: 8, background: '#8A847A', borderRadius: 2, marginTop: 2 } })
      )
    ),
    React.createElement('div', {
      className: 'mg-basket',
      style: { left: `calc(${bx * 100}% - 30px)` }
    }),
    (!running) && React.createElement('div', { className: 'mg-overlay' },
      over
        ? React.createElement(React.Fragment, null,
            React.createElement('h4', null, 'GAME OVER'),
            React.createElement('p', null, `You caught ${score} leaves. The wind takes the rest.`),
            React.createElement('button', { className: 'mg-btn', onClick: begin }, 'play again'),
            React.createElement('button', { className: 'mg-btn', onClick: onExit, style: { marginTop: 6 } }, 'back to terminal'),
          )
        : React.createElement(React.Fragment, null,
            React.createElement('h4', null, 'CATCH THE LEAVES'),
            React.createElement('p', null, 'Move with ← →. Catch the green leaves. Avoid the stones. Don\'t let leaves fall.'),
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
