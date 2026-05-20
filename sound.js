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
  };
})();
