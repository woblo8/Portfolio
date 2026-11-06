/* ============================================================
   LA CASA — the music. A slow, smoky mafia-lounge beat played
   live by the browser (Web Audio, no files): soft lo-fi drums,
   minor piano chords through a tape wobble, a plucked upright
   bass (no sub: nothing that rumbles), vinyl crackle, and a
   muted trumpet that drifts in now and then.
   It follows the table: mellow at first, a little faster when
   the table burns, dark and slow in devil mode, dreamy with
   bells in god mode; busier while the croupier shuffles.
   It only plays when the site's sound is on.
   ============================================================ */
(() => {
  "use strict";
  const snd = () => { const s = window.CASINO && window.CASINO.sound; return s && s.on ? s : null; };
  const hz = (m) => 440 * Math.pow(2, (m - 69) / 12);

  // [bass root, chord voicing] per bar, four bars per mood
  const MOODS = [
    { bpm: 76, swing: 0.62, tone: 2200, chords: [[48, [55, 60, 63, 71]], [44, [55, 60, 63, 67]], [41, [56, 60, 63, 67]], [43, [53, 59, 62, 68]]], lead: [67, 68, 71, 72, 74, 75, 79] },              // tourist: Cm(maj7) Abmaj7 Fm9 G7b9 (harmonic minor)
    { bpm: 78, swing: 0.62, tone: 2400, chords: [[45, [55, 60, 64, 67]], [38, [53, 57, 60, 65]], [40, [56, 59, 62, 65]], [45, [55, 60, 64, 71]]], lead: [69, 71, 72, 74, 76, 77, 80] },                // gambler: Am7 Dm7 E7b9 Am(maj7)
    { bpm: 84, swing: 0.6, tone: 2600, chords: [[38, [53, 56, 60, 65]], [43, [53, 59, 62, 68]], [48, [55, 60, 63, 70]], [44, [55, 60, 63, 67]]], lead: [67, 68, 71, 72, 74, 75, 79], extraKick: true }, // shark: Dm7b5 G7b9 Cm7 Abmaj7, a touch faster
    { bpm: 68, swing: 0.6, tone: 1500, chords: [[48, [54, 60, 63, 66]], [44, [55, 60, 62, 67]], [41, [56, 59, 62, 68]], [43, [53, 59, 62, 68]]], lead: [60, 61, 63, 66, 67, 68, 71], sub: 36, dark: true }, // devil: Cdim Abmaj7#11 Fm(maj7) G7b9
    { bpm: 68, swing: 0.58, tone: 3400, chords: [[37, [53, 56, 60, 63]], [39, [55, 58, 62, 65]], [41, [56, 60, 63, 67]], [42, [58, 61, 65, 68]]], lead: [80, 82, 84, 85, 87, 89], pad: true, bells: true }, // god: dreamy, bright
  ];

  const M = { ctx: null, out: null, rev: null, keys: null, on: false, mood: 0, busy: 0, bar: 0, step: 0, next: 0, timer: 0, sub: null, pad: null, crackle: null };

  function build(ctx) {
    const out = ctx.createGain(); out.gain.value = 0;
    // the whole mix a little dull at the top, like an old record
    const lp = ctx.createBiquadFilter(); lp.type = "lowpass"; lp.frequency.value = 9000;
    const hp = ctx.createBiquadFilter(); hp.type = "highpass"; hp.frequency.value = 75; hp.Q.value = 0.7;
    const shelf = ctx.createBiquadFilter(); shelf.type = "lowshelf"; shelf.frequency.value = 160; shelf.gain.value = -6;
    const comp = ctx.createDynamicsCompressor(); comp.threshold.value = -20; comp.ratio.value = 4; comp.attack.value = 0.005; comp.release.value = 0.2;
    out.connect(hp); hp.connect(shelf); shelf.connect(lp); lp.connect(comp); comp.connect(ctx.destination);
    // a room
    const rev = ctx.createConvolver(), len = ctx.sampleRate * 1.8, ir = ctx.createBuffer(2, len, ctx.sampleRate);
    for (let c = 0; c < 2; c++) { const d = ir.getChannelData(c); for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 3); }
    rev.buffer = ir;
    const rg = ctx.createGain(); rg.gain.value = 0.3; rev.connect(rg); rg.connect(out);
    // the keys go through a filter (the mood's colour) and a slow tape wobble
    const keys = ctx.createBiquadFilter(); keys.type = "lowpass"; keys.frequency.value = 2400; keys.Q.value = 0.4;
    const wob = ctx.createDelay(0.05); wob.delayTime.value = 0.012;
    const lfo = ctx.createOscillator(), lg = ctx.createGain(); lfo.frequency.value = 0.55; lg.gain.value = 0.0022; lfo.connect(lg); lg.connect(wob.delayTime); lfo.start();
    keys.connect(wob);
    const kd = ctx.createGain(); kd.gain.value = 1; wob.connect(kd); kd.connect(out);
    const kw = ctx.createGain(); kw.gain.value = 0.4; wob.connect(kw); kw.connect(rev);
    const noise = ctx.createBuffer(1, ctx.sampleRate * 1, ctx.sampleRate);
    { const d = noise.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1; }
    Object.assign(M, { ctx, out, rev, keys, noise });
  }
  const send = (node, dry, wet) => { const g = M.ctx.createGain(); g.gain.value = dry; node.connect(g); g.connect(M.out); if (wet) { const w = M.ctx.createGain(); w.gain.value = wet; node.connect(w); w.connect(M.rev); } };

  // ---------- the instruments ----------
  function piano(m, t, dur, vel) {
    const c = M.ctx, g = c.createGain();
    [[1, "triangle", 0.09], [2, "sine", 0.03], [3.01, "sine", 0.012]].forEach(([r, type, a]) => {
      const o = c.createOscillator(); o.type = type; o.frequency.value = hz(m) * r; o.detune.value = (Math.random() - 0.5) * 8;
      const og = c.createGain(); og.gain.value = a; o.connect(og); og.connect(g); o.start(t); o.stop(t + dur + 0.1);
    });
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(vel, t + 0.015); g.gain.exponentialRampToValueAtTime(vel * 0.35, t + 0.5); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    g.connect(M.keys);
  }
  // an upright bass, plucked: the body of the note sits in the mids, nothing to rumble
  function subBass(m, t, dur) {
    const c = M.ctx, o = c.createOscillator(), o2 = c.createOscillator(), f = c.createBiquadFilter(), g = c.createGain();
    o.type = "triangle"; o.frequency.value = hz(m); o2.type = "sine"; o2.frequency.value = hz(m) * 2;
    f.type = "lowpass"; f.frequency.setValueAtTime(1400, t); f.frequency.exponentialRampToValueAtTime(420, t + 0.25);
    const g2 = c.createGain(); g2.gain.value = 0.35;
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.2, t + 0.012); g.gain.exponentialRampToValueAtTime(0.06, t + 0.3); g.gain.exponentialRampToValueAtTime(0.0001, t + Math.min(dur, 1.1));
    o.connect(f); o2.connect(g2); g2.connect(f); f.connect(g); send(g, 1, 0.08);
    o.start(t); o2.start(t); o.stop(t + 1.2); o2.stop(t + 1.2);
  }
  function kick(t, vel) {
    const c = M.ctx, o = c.createOscillator(), g = c.createGain();
    o.frequency.setValueAtTime(130, t); o.frequency.exponentialRampToValueAtTime(68, t + 0.09);
    g.gain.setValueAtTime(0.26 * vel, t); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.18);
    o.connect(g); send(g, 1, 0); o.start(t); o.stop(t + 0.4);
  }
  function snare(t, vel) {
    const c = M.ctx, s = c.createBufferSource(), f = c.createBiquadFilter(), g = c.createGain();
    s.buffer = M.noise; f.type = "bandpass"; f.frequency.value = 1700; f.Q.value = 0.8;
    g.gain.setValueAtTime(0.22 * vel, t); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.22);
    s.connect(f); f.connect(g); send(g, 1, 0.25); s.start(t, Math.random() * 0.5); s.stop(t + 0.25);
    const o = c.createOscillator(), og = c.createGain(); o.frequency.value = 190;
    og.gain.setValueAtTime(0.08 * vel, t); og.gain.exponentialRampToValueAtTime(0.0001, t + 0.1);
    o.connect(og); send(og, 1, 0); o.start(t); o.stop(t + 0.12);
  }
  function hat(t, vel) {
    const c = M.ctx, s = c.createBufferSource(), f = c.createBiquadFilter(), g = c.createGain();
    s.buffer = M.noise; f.type = "highpass"; f.frequency.value = 7500;
    g.gain.setValueAtTime(0.045 * vel, t); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.045);
    s.connect(f); f.connect(g); send(g, 1, 0); s.start(t, Math.random() * 0.5); s.stop(t + 0.06);
  }
  // a muted trumpet: a soft reedy tone that swells in, with a late vibrato
  function lead(m, t, vel, dur = 1.1) {
    const c = M.ctx, o = c.createOscillator(), f = c.createBiquadFilter(), g = c.createGain(), vib = c.createOscillator(), vg = c.createGain();
    o.type = "sawtooth"; o.frequency.value = hz(m);
    vib.frequency.value = 5.2; vg.gain.setValueAtTime(0, t); vg.gain.linearRampToValueAtTime(hz(m) * 0.012, t + 0.35); vib.connect(vg); vg.connect(o.frequency);
    f.type = "bandpass"; f.frequency.value = 1150; f.Q.value = 2.2;
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.06 * vel, t + 0.12); g.gain.setValueAtTime(0.06 * vel, t + dur * 0.7); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(f); f.connect(g); send(g, 0.8, 0.55);
    o.start(t); vib.start(t); o.stop(t + dur + 0.05); vib.stop(t + dur + 0.05);
  }
  function bell(m, t) {
    const c = M.ctx, g = c.createGain();
    [1, 2.76, 5.4].forEach((r, i) => { const o = c.createOscillator(); o.frequency.value = hz(m) * r; const gg = c.createGain(); gg.gain.value = [0.04, 0.015, 0.008][i]; o.connect(gg); gg.connect(g); o.start(t); o.stop(t + 2.5); });
    g.gain.setValueAtTime(1, t); g.gain.exponentialRampToValueAtTime(0.0001, t + 2.4);
    send(g, 0.5, 0.8);
  }
  // the record's crackle: always there, quietly
  function startCrackle() {
    const c = M.ctx, len = c.sampleRate * 2, buf = c.createBuffer(1, len, c.sampleRate), d = buf.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * 0.02 + (Math.random() < 0.0006 ? (Math.random() * 2 - 1) * 0.8 : 0);
    const s = c.createBufferSource(), f = c.createBiquadFilter(), g = c.createGain();
    s.buffer = buf; s.loop = true; f.type = "bandpass"; f.frequency.value = 3000; f.Q.value = 0.5; g.gain.value = 0.35;
    s.connect(f); f.connect(g); g.connect(M.out); s.start();
    M.crackle = s;
  }
  // long sounds under the beat: the devil's sub drone, god's pad
  function setSub(m) {
    const c = M.ctx;
    if (M.sub) { const d = M.sub; d.g.gain.setTargetAtTime(0.0001, c.currentTime, 0.6); setTimeout(() => { try { d.o.stop(); d.lfo.stop(); } catch (e) {} }, 3000); M.sub = null; }
    if (m == null) return;
    const o = c.createOscillator(), f = c.createBiquadFilter(), g = c.createGain(), lfo = c.createOscillator(), lg = c.createGain();
    o.type = "sawtooth"; o.frequency.value = hz(m); f.type = "lowpass"; f.frequency.value = 420; f.Q.value = 3;
    lfo.frequency.value = 0.1; lg.gain.value = 160; lfo.connect(lg); lg.connect(f.frequency);
    g.gain.value = 0.0001; g.gain.setTargetAtTime(0.03, c.currentTime, 1.2);
    o.connect(f); f.connect(g); send(g, 1, 0.2); o.start(); lfo.start();
    M.sub = { o, g, lfo };
  }
  function setPad(on) {
    const c = M.ctx;
    if (M.pad) { const p = M.pad; p.g.gain.setTargetAtTime(0.0001, c.currentTime, 0.8); setTimeout(() => p.os.forEach((o) => { try { o.stop(); } catch (e) {} }), 4000); M.pad = null; }
    if (!on) return;
    const g = c.createGain(), f = c.createBiquadFilter(); f.type = "lowpass"; f.frequency.value = 1800;
    const os = [61, 65, 68, 72].flatMap((m) => [-7, 7].map((dt) => { const o = c.createOscillator(); o.type = "sawtooth"; o.frequency.value = hz(m); o.detune.value = dt; o.connect(f); o.start(); return o; }));
    g.gain.value = 0.0001; g.gain.setTargetAtTime(0.014, c.currentTime, 1.5);
    f.connect(g); send(g, 0.6, 0.9);
    M.pad = { g, os };
  }

  // ---------- the beat: sixteen steps a bar, scheduled a little ahead ----------
  function playStep(t) {
    const mood = MOODS[M.mood], [root, chord] = mood.chords[M.bar % 4];
    const s16 = 60 / mood.bpm / 4, st = M.step;
    // swing: the off-beat sixteenths come late
    const at = t + (st % 2 ? s16 * (mood.swing - 0.5) * 2 : 0);
    // boom … bap: kick on 1 and the "and" of 3, snare on 2 and 4 (a ghost kick when the table burns)
    if (st === 0 || st === 10 || (mood.extraKick && st === 7) || (M.busy > 1 && st === 14)) kick(at, st === 0 ? 1 : 0.75);
    if (st === 4 || st === 12) snare(at, 1);
    if (M.busy && st === 15) snare(at, 0.3);
    // hats on the eighths, sixteenths while the croupier shuffles
    if (st % 2 === 0 || M.busy) hat(at, st % 4 === 0 ? 0.9 : st % 2 ? 0.45 : 0.65);
    // the chord on one, held; a small stab before three
    if (st === 0) chord.forEach((m, i) => piano(m, at + i * 0.018, 60 / mood.bpm * 3.6, 0.13));
    if (st === 7 && Math.random() < 0.6) chord.slice(1).forEach((m) => piano(m + 12, at, 60 / mood.bpm * 0.8, 0.06));
    // the upright walks on the quarters: root, fifth, a note of the chord, a step into the next bar
    if (st % 4 === 0) {
      const next = mood.chords[(M.bar + 1) % 4][0], q = st / 4;
      const walk = [root, root + 7, root + (Math.random() < 0.5 ? 3 : 10), next + (next > root ? -1 : 1)];
      subBass(walk[q] < 40 ? walk[q] + 12 : walk[q], at, 60 / mood.bpm);
    }
    // the muted trumpet: a short phrase every other bar, a held note to end it
    if (M.bar % 2 === 1 && (st === 2 || st === 6 || st === 10) && Math.random() < (M.busy ? 0.7 : 0.55)) {
      const L = mood.lead, n = L[Math.floor(Math.random() * L.length)];
      lead(n, at, 1, st === 10 ? 60 / mood.bpm * 2.4 : 60 / mood.bpm * 0.9);
    }
    if (mood.bells && st === 8 && Math.random() < 0.5) bell(mood.lead[Math.floor(Math.random() * mood.lead.length)], at);
    M.step = (st + 1) % 16; if (M.step === 0) M.bar++;
    return s16;
  }
  function tick() {
    if (!snd()) { stop(); return; } // the site's sound was turned off
    while (M.next < M.ctx.currentTime + 0.2) M.next += playStep(M.next);
  }

  function start() {
    const s = snd(); if (!s || M.on) return;
    const ctx = s.audio(); if (!ctx) return;
    if (M.ctx !== ctx) build(ctx);
    M.on = true; M.bar = 0; M.step = 0; M.next = ctx.currentTime + 0.1;
    M.out.gain.cancelScheduledValues(ctx.currentTime);
    M.out.gain.setTargetAtTime(0.8, ctx.currentTime, 0.8);
    if (!M.crackle) startCrackle();
    applyMood();
    M.timer = setInterval(tick, 50);
  }
  function stop() {
    if (!M.on) return;
    M.on = false; clearInterval(M.timer);
    if (M.ctx) M.out.gain.setTargetAtTime(0.0001, M.ctx.currentTime, 0.35);
    setTimeout(() => { if (!M.on) { setSub(null); setPad(false); if (M.crackle) { try { M.crackle.stop(); } catch (e) {} M.crackle = null; } } }, 700);
  }
  function applyMood() {
    if (!M.on) return;
    const m = MOODS[M.mood];
    M.keys.frequency.setTargetAtTime(m.tone, M.ctx.currentTime, 0.8);
    setSub(m.sub != null ? m.sub : null);
    setPad(!!m.pad);
    M.bar = 0;
  }
  window.HOUSE_MUSIC = {
    start, stop,
    // the table's rank: 0 tourist … 3 devil, 4+ god
    mood(t) { const m = Math.max(0, Math.min(MOODS.length - 1, t | 0)); if (m === M.mood) return; M.mood = m; applyMood(); },
    // 0 calm, 1 shuffling, 2 a boss round
    busy(b) { M.busy = b; },
    get on() { return M.on; },
  };
})();
