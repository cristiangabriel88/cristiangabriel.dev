// ─────────────────────────────────────────────────────────────
// cgSound: tiny opt-in Web Audio blips. Default OFF.
//   window.cgSound.setEnabled(bool)  toggled from the tweaks panel
//   window.cgSound.tick()            terminal typewriter blip
//   window.cgSound.chime()           snake fruit pickup
// Everything is synthesised, so there are no audio files to load.
// ─────────────────────────────────────────────────────────────
(function () {
  'use strict';
  let enabled = false;
  let ctx = null;
  let lastTickAt = 0;

  function audio() {
    if (ctx) return ctx;
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return null;
    ctx = new AC();
    return ctx;
  }

  // A short, quiet blip. freq in Hz, dur in seconds, peak gain, wave type.
  function blip(freq, dur, peak, type) {
    if (!enabled) return;
    const ac = audio();
    if (!ac) return;
    if (ac.state === 'suspended') ac.resume();
    const t0 = ac.currentTime;
    const osc = ac.createOscillator();
    const g = ac.createGain();
    osc.type = type || 'sine';
    osc.frequency.value = freq;
    g.gain.setValueAtTime(0, t0);
    g.gain.linearRampToValueAtTime(peak, t0 + 0.005);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    osc.connect(g).connect(ac.destination);
    osc.start(t0);
    osc.stop(t0 + dur + 0.02);
  }

  window.cgSound = {
    setEnabled(v) { enabled = !!v; },
    isEnabled() { return enabled; },
    // Typewriter key: very short, very quiet, rate-limited so a fast reveal
    // does not turn into a buzz.
    tick() {
      if (!enabled) return;
      const now = (typeof performance !== 'undefined' ? performance.now() : Date.now());
      if (now - lastTickAt < 28) return;
      lastTickAt = now;
      // A little pitch wobble so it reads as organic, not metronomic.
      blip(1500 + Math.random() * 400, 0.03, 0.022, 'square');
    },
    // Snake fruit: a soft two-note rise.
    chime() {
      if (!enabled) return;
      blip(660, 0.09, 0.06, 'sine');
      setTimeout(function () { blip(990, 0.11, 0.05, 'sine'); }, 70);
    },
    // A single soft note — used by the forest game for pickups and cues.
    // peak defaults low so it stays in the same gentle register as chime().
    note(freq, durSec, peak) {
      if (!enabled) return;
      blip(freq, durSec || 0.12, peak || 0.05, 'sine');
    },
    // Play a sequence of notes, staggered. Defaults to the forest's
    // recurring four ascending notes (low, lower, low, high → here rendered
    // as a gentle rising run). `freqs` is an array of Hz; `gapMs` the spacing.
    melody(freqs, gapMs) {
      if (!enabled) return;
      const seq = (freqs && freqs.length) ? freqs : [392, 440, 523, 659];
      const gap = gapMs || 140;
      seq.forEach(function (f, i) {
        setTimeout(function () { blip(f, 0.18, 0.05, 'sine'); }, i * gap);
      });
    },
  };
})();
