/* ============================================================
   LA CASA — the music. A small lounge band played live by the
   browser (Web Audio, no files): electric piano, walking bass,
   brushes and a vibraphone that improvises over the chords.
   It follows the table: casino jazz, warmer when the table
   burns, a dark minor drone in devil mode, a bright lydian
   glow with bells in god mode; busier while the croupier
   shuffles. It only plays when the site's sound is on.
   ============================================================ */
(() => {
  "use strict";
  const snd = () => { const s = window.CASINO && window.CASINO.sound; return s && s.on ? s : null; };
  const hz = (m) => 440 * Math.pow(2, (m - 69) / 12);

  // [bass root, chord voicing] per bar, four bars per mood
  const MOODS = [
    { bpm: 96, swing: 0.6, chords: [[38, [53, 57, 60, 64]], [43, [53, 59, 64, 69]], [36, [52, 55, 59, 62]], [45, [55, 61, 64, 70]]], scale: [60, 62, 64, 67, 69, 72, 74, 76], kick: false, hat: 0.5 },             // the house: ii–V–I in C
    { bpm: 96, swing: 0.62, chords: [[41, [57, 60, 64, 67]], [43, [53, 59, 62, 65]], [36, [52, 55, 59, 62]], [45, [55, 60, 64, 67]]], scale: [60, 62, 64, 67, 69, 72, 74], kick: false, hat: 0.55 },           // gambler
    { bpm: 104, swing: 0.62, chords: [[38, [53, 57, 60, 64]], [43, [53, 59, 64, 68]], [36, [52, 55, 59, 62]], [44, [55, 60, 63, 67]]], scale: [60, 63, 65, 67, 70, 72, 75], kick: true, hat: 0.7 },             // shark: the table burns
    { bpm: 84, swing: 0.58, chords: [[36, [51, 55, 62]], [44, [55, 60, 62]], [41, [56, 60, 67]], [43, [53, 59, 68]]], scale: [60, 62, 63, 66, 67, 68, 71, 72], kick: true, hat: 0.45, drone: 24 },              // devil: C minor, a drone under it
    { bpm: 76, swing: 0.54, chords: [[36, [52, 59, 66, 67]], [36, [54, 57, 62, 69]], [47, [62, 66, 69, 74]], [43, [59, 62, 66, 69]]], scale: [72, 74, 76, 78, 79, 81, 83, 84], kick: false, hat: 0.3, pad: true, bells: true }, // god: lydian light
  ];

  const M = { ctx: null, out: null, rev: null, on: false, mood: 0, busy: 0, bar: 0, beat: 0, next: 0, timer: 0, drone: null, pad: null };

  function build(ctx) {
    const out = ctx.createGain(); out.gain.value = 0;
    const comp = ctx.createDynamicsCompressor(); comp.threshold.value = -18; comp.ratio.value = 3;
    out.connect(comp); comp.connect(ctx.destination);
    // a room: a short reverb made from decaying noise
    const rev = ctx.createConvolver(), len = ctx.sampleRate * 2.2, ir = ctx.createBuffer(2, len, ctx.sampleRate);
    for (let c = 0; c < 2; c++) { const d = ir.getChannelData(c); for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 2.6); }
    rev.buffer = ir;
    const revGain = ctx.createGain(); revGain.gain.value = 0.28;
    rev.connect(revGain); revGain.connect(out);
    const noise = ctx.createBuffer(1, ctx.sampleRate * 0.5, ctx.sampleRate);
    { const d = noise.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1; }
    Object.assign(M, { ctx, out, rev, noise });
  }
  const send = (node, dry, wet) => { const g = M.ctx.createGain(); g.gain.value = dry; node.connect(g); g.connect(M.out); if (wet) { const w = M.ctx.createGain(); w.gain.value = wet; node.connect(w); w.connect(M.rev); } };

  // ---------- the band ----------
  function epiano(m, t, dur, vel) {
    const c = M.ctx, g = c.createGain(), o = c.createOscillator(), o2 = c.createOscillator(), g2 = c.createGain();
    o.type = "sine"; o.frequency.value = hz(m);
    o2.type = "sine"; o2.frequency.value = hz(m) * 4.01; g2.gain.setValueAtTime(0.25 * vel, t); g2.gain.exponentialRampToValueAtTime(0.001, t + 0.25);
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.11 * vel, t + 0.012); g.gain.exponentialRampToValueAtTime(0.03 * vel, t + 0.6); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g); o2.connect(g2); g2.connect(g); send(g, 1, 0.35);
    o.start(t); o2.start(t); o.stop(t + dur + 0.05); o2.stop(t + 0.3);
  }
  function bass(m, t, dur, vel) {
    const c = M.ctx, o = c.createOscillator(), f = c.createBiquadFilter(), g = c.createGain();
    o.type = "triangle"; o.frequency.value = hz(m);
    f.type = "lowpass"; f.frequency.value = 520;
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.32 * vel, t + 0.02); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(f); f.connect(g); send(g, 1, 0.05);
    o.start(t); o.stop(t + dur + 0.05);
  }
  function hat(t, vel, open) {
    const c = M.ctx, s = c.createBufferSource(), f = c.createBiquadFilter(), g = c.createGain();
    s.buffer = M.noise; f.type = "highpass"; f.frequency.value = open ? 6000 : 8200;
    g.gain.setValueAtTime(0.05 * vel, t); g.gain.exponentialRampToValueAtTime(0.0001, t + (open ? 0.18 : 0.05));
    s.connect(f); f.connect(g); send(g, 1, 0.1);
    s.start(t, Math.random() * 0.3); s.stop(t + 0.2);
  }
  function kick(t, vel) {
    const c = M.ctx, o = c.createOscillator(), g = c.createGain();
    o.frequency.setValueAtTime(110, t); o.frequency.exponentialRampToValueAtTime(42, t + 0.18);
    g.gain.setValueAtTime(0.32 * vel, t); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.3);
    o.connect(g); send(g, 1, 0); o.start(t); o.stop(t + 0.32);
  }
  function vibe(m, t, vel) {
    const c = M.ctx, o = c.createOscillator(), g = c.createGain(), trem = c.createOscillator(), tg = c.createGain();
    o.type = "sine"; o.frequency.value = hz(m);
    trem.frequency.value = 5.5; tg.gain.value = 0.25; trem.connect(tg); tg.connect(g.gain);
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.07 * vel, t + 0.01); g.gain.exponentialRampToValueAtTime(0.0001, t + 1.6);
    o.connect(g); send(g, 0.8, 0.6);
    o.start(t); trem.start(t); o.stop(t + 1.7); trem.stop(t + 1.7);
  }
  function bell(m, t) {
    const c = M.ctx, g = c.createGain();
    [1, 2.76, 5.4].forEach((r, i) => { const o = c.createOscillator(); o.frequency.value = hz(m) * r; const gg = c.createGain(); gg.gain.value = [0.05, 0.02, 0.01][i]; o.connect(gg); gg.connect(g); o.start(t); o.stop(t + 2.5); });
    g.gain.setValueAtTime(1, t); g.gain.exponentialRampToValueAtTime(0.0001, t + 2.4);
    send(g, 0.6, 0.8);
  }
  // long sounds that stay under the music: the devil's drone and god's pad
  function setDrone(m) {
    const c = M.ctx;
    if (M.drone) { const d = M.drone; d.g.gain.setTargetAtTime(0.0001, c.currentTime, 0.6); setTimeout(() => { try { d.o.stop(); d.lfo.stop(); } catch (e) {} }, 3000); M.drone = null; }
    if (m == null) return;
    const o = c.createOscillator(), f = c.createBiquadFilter(), g = c.createGain(), lfo = c.createOscillator(), lg = c.createGain();
    o.type = "sawtooth"; o.frequency.value = hz(m); f.type = "lowpass"; f.frequency.value = 180; f.Q.value = 6;
    lfo.frequency.value = 0.12; lg.gain.value = 120; lfo.connect(lg); lg.connect(f.frequency);
    g.gain.value = 0.0001; g.gain.setTargetAtTime(0.09, c.currentTime, 1.2);
    o.connect(f); f.connect(g); send(g, 1, 0.3); o.start(); lfo.start();
    M.drone = { o, g, lfo };
  }
  function setPad(on) {
    const c = M.ctx;
    if (M.pad) { const p = M.pad; p.g.gain.setTargetAtTime(0.0001, c.currentTime, 0.8); setTimeout(() => p.os.forEach((o) => { try { o.stop(); } catch (e) {} }), 4000); M.pad = null; }
    if (!on) return;
    const g = c.createGain(), f = c.createBiquadFilter(); f.type = "lowpass"; f.frequency.value = 1600;
    const os = [60, 64, 66, 71].flatMap((m) => [-6, 6].map((dt) => { const o = c.createOscillator(); o.type = "sawtooth"; o.frequency.value = hz(m); o.detune.value = dt; o.connect(f); o.start(); return o; }));
    g.gain.value = 0.0001; g.gain.setTargetAtTime(0.018, c.currentTime, 1.5);
    f.connect(g); send(g, 0.7, 0.9);
    M.pad = { g, os };
  }

  // ---------- the score: one beat at a time, scheduled a little ahead ----------
  function playBeat(t) {
    const mood = MOODS[M.mood], [root, chord] = mood.chords[M.bar % 4], next = mood.chords[(M.bar + 1) % 4][0];
    const spb = 60 / mood.bpm, b = M.beat, sw = spb * mood.swing;
    // walking bass: root, fifth, a passing note, a step into the next chord
    const walk = [root, root + 7, root + (Math.random() < 0.5 ? 9 : 4), next + (next > root ? -1 : 1)];
    bass(walk[b], t, spb * 0.92, b === 0 ? 1 : 0.8);
    // the piano comps on one and on the "and" of two
    if (b === 0) chord.forEach((m) => epiano(m, t + Math.random() * 0.012, spb * 2.2, 0.9));
    if (b === 1) chord.forEach((m) => epiano(m, t + sw + Math.random() * 0.012, spb * 1.2, 0.6));
    // brushes: two and four, swung eighths when the table is busy
    if (b === 1 || b === 3) hat(t, mood.hat, b === 3 && Math.random() < 0.25);
    if (M.busy) hat(t + sw, mood.hat * 0.6, false);
    if (M.busy > 1) { hat(t + spb * 0.25, mood.hat * 0.35); hat(t + spb * 0.75, mood.hat * 0.35); }
    if (mood.kick && (b === 0 || (b === 2 && M.busy))) kick(t, 0.8);
    // the vibraphone improvises a little; bells ring in god mode
    if (Math.random() < (M.busy ? 0.42 : 0.28)) vibe(mood.scale[Math.floor(Math.random() * mood.scale.length)], t + (Math.random() < 0.5 ? 0 : sw), 0.8);
    if (mood.bells && b === 0 && Math.random() < 0.6) bell(mood.scale[Math.floor(Math.random() * mood.scale.length)] + 12, t + spb * 0.5);
    M.beat = (b + 1) % 4; if (M.beat === 0) M.bar++;
    return spb;
  }
  function tick() {
    const s = snd();
    if (!s) { stop(); return; } // the site's sound was turned off
    while (M.next < M.ctx.currentTime + 0.25) M.next += playBeat(M.next);
  }

  function start() {
    const s = snd(); if (!s || M.on) return;
    const ctx = s.audio(); if (!ctx) return;
    if (M.ctx !== ctx) build(ctx);
    M.on = true; M.bar = 0; M.beat = 0; M.next = ctx.currentTime + 0.1;
    M.out.gain.cancelScheduledValues(ctx.currentTime);
    M.out.gain.setTargetAtTime(0.5, ctx.currentTime, 0.8);
    applyMood(true);
    M.timer = setInterval(tick, 60);
  }
  function stop() {
    if (!M.on) return;
    M.on = false; clearInterval(M.timer);
    if (M.ctx) M.out.gain.setTargetAtTime(0.0001, M.ctx.currentTime, 0.35);
    setTimeout(() => { if (!M.on) { setDrone(null); setPad(false); } }, 600);
  }
  function applyMood(fresh) {
    if (!M.on) return;
    const m = MOODS[M.mood];
    setDrone(m.drone != null ? m.drone : null);
    setPad(!!m.pad);
    if (fresh) M.bar = 0;
  }
  window.HOUSE_MUSIC = {
    start, stop,
    // the table's rank: 0 tourist … 3 devil, 4+ god
    mood(t) { const m = Math.max(0, Math.min(MOODS.length - 1, t | 0)); if (m === M.mood) return; M.mood = m; applyMood(true); },
    // 0 calm, 1 shuffling, 2 a boss round
    busy(b) { M.busy = b; },
    get on() { return M.on; },
  };
})();
