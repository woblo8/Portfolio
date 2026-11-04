/* ============================================================
   CASINO — a quiet layer of table games around the object.
   The croupier, chips as the index, double or nothing, streaks,
   the cursor roulette, the real odds of every roll and the sound
   of it all (off by default).
   ============================================================ */
(() => {
  "use strict";
  const D = window.DIE;
  if (!D) return;
  const $ = (s) => document.querySelector(s);
  const body = document.body;
  const P = D.projects;
  const WORDS = T(["Uno", "Dos", "Tres", "Cuatro", "Cinco", "Seis"], ["One", "Two", "Three", "Four", "Five", "Six"]);
  const store = {
    get(k) { try { return localStorage.getItem(k); } catch (e) { return null; } },
    set(k, v) { try { localStorage.setItem(k, v); } catch (e) { /* private mode */ } },
  };

  /* ---------- sound: synthesised, never automatic ---------- */
  const SND = { on: store.get("woblo:sound") === "1", ctx: null, noise: null };
  const soundBtn = $("#soundBtn");
  function audio() {
    if (!SND.on) return null;
    if (!SND.ctx) {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return null;
      SND.ctx = new AC();
      const len = SND.ctx.sampleRate * 0.25;
      SND.noise = SND.ctx.createBuffer(1, len, SND.ctx.sampleRate);
      const d = SND.noise.getChannelData(0);
      for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
    }
    if (SND.ctx.state === "suspended") SND.ctx.resume();
    return SND.ctx;
  }
  function burst(a, t, { freq, q = 4, type = "bandpass", gain, dur }) {
    const src = a.createBufferSource();
    src.buffer = SND.noise;
    const f = a.createBiquadFilter();
    f.type = type; f.frequency.value = freq; f.Q.value = q;
    const g = a.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(gain, t + 0.002);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    src.connect(f).connect(g).connect(a.destination);
    src.start(t); src.stop(t + dur + 0.02);
  }
  // ceramic chips clacking together
  function chip(v = 1) {
    const a = audio(); if (!a) return;
    const t = a.currentTime;
    burst(a, t, { freq: 3300 + Math.random() * 700, q: 7, gain: 0.32 * v, dur: 0.045 });
    burst(a, t + 0.03 + Math.random() * 0.02, { freq: 2600 + Math.random() * 600, q: 7, gain: 0.22 * v, dur: 0.05 });
  }
  // the die landing on felt: low, dry, short
  function thud(v = 1) {
    const a = audio(); if (!a) return;
    const t = a.currentTime;
    const o = a.createOscillator(), g = a.createGain();
    o.type = "sine";
    o.frequency.setValueAtTime(110, t);
    o.frequency.exponentialRampToValueAtTime(46, t + 0.18);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(0.5 * v, t + 0.005);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.24);
    o.connect(g).connect(a.destination);
    o.start(t); o.stop(t + 0.26);
    burst(a, t, { freq: 900, type: "lowpass", q: 0.7, gain: 0.25 * v, dur: 0.07 });
  }
  // the roulette ball ticking over the frets
  function tick(v = 1) {
    const a = audio(); if (!a) return;
    burst(a, a.currentTime, { freq: 5200, type: "highpass", q: 0.8, gain: 0.12 * v, dur: 0.018 });
  }
  // a glass tick for every button and link: two bright partials, gone in a few milliseconds
  function glass(v = 1) {
    const a = audio(); if (!a) return;
    const t = a.currentTime, base = 3400 + Math.random() * 500;
    [[base, 0.022], [base * 2.76, 0.009]].forEach(([f, g]) => {
      const o = a.createOscillator(), gn = a.createGain();
      o.type = "sine"; o.frequency.setValueAtTime(f, t);
      gn.gain.setValueAtTime(0.0001, t);
      gn.gain.exponentialRampToValueAtTime(g * v, t + 0.002);
      gn.gain.exponentialRampToValueAtTime(0.0001, t + 0.09);
      o.connect(gn).connect(a.destination); o.start(t); o.stop(t + 0.1);
    });
    burst(a, t, { freq: 7000, type: "highpass", q: 0.7, gain: 0.012 * v, dur: 0.012 }); // the click of the touch
  }
  document.addEventListener("pointerdown", (e) => {
    if (!SND.on || e.button > 0) return;
    const el = e.target.closest && e.target.closest("button, a, [role=button], summary, label[for]");
    if (!el || el.id === "soundBtn" || el.disabled) return;
    glass(el.closest(".index") ? 0.8 : 1);
  }, { capture: true, passive: true });

  function setSound(on) {
    SND.on = on;
    soundBtn.setAttribute("aria-pressed", String(on));
    soundBtn.querySelector("b").textContent = on ? T("sí", "on") : T("no", "off");
    store.set("woblo:sound", on ? "1" : "0");
  }
  setSound(SND.on);
  soundBtn.addEventListener("click", () => { setSound(!SND.on); if (SND.on) chip(0.8); });

  /* ---------- the invisible croupier ---------- */
  const croupier = $("#croupier");
  let sayTimer = 0;
  function say(text, hold = 2600) {
    croupier.textContent = text;
    croupier.classList.remove("on");
    void croupier.offsetWidth;
    croupier.classList.add("on");
    clearTimeout(sayTimer);
    sayTimer = setTimeout(() => croupier.classList.remove("on"), hold);
  }

  /* ---------- streaks ---------- */
  const streakEl = $("#streak");
  let last = -1, streak = 1, streakTimer = 0;
  function showStreak(n) {
    streakEl.textContent = `${T("Racha", "Streak")} ×${n}`;
    streakEl.classList.remove("on");
    void streakEl.offsetWidth;
    streakEl.classList.add("on");
    clearTimeout(streakTimer);
    streakTimer = setTimeout(() => streakEl.classList.remove("on"), 2800);
    D.glow();
    chip(1); setTimeout(() => chip(0.8), 120); setTimeout(() => chip(0.6), 240);
  }

  /* ---------- double or nothing ---------- */
  let doubling = false;
  $("#againBtn").addEventListener("click", () => {
    doubling = true;
    if (D.throwPower(1.55)) say(T("Doble o nada.", "Double or nothing."), 1800);
  });

  /* ---------- the table reacts to the object ---------- */
  D.on("throw", (e) => {
    body.classList.remove("can-again");
    const hard = !doubling && e && e.v > 6.6; // a wild drag, not the double or nothing
    doubling = false;
    say(hard ? T("Con calma. Es de cristal.", "Easy. It’s glass.") : "Rien ne va plus.", hard ? 2400 : 1700);
  });
  D.on("impact", ({ v }) => thud(Math.min(1, v / 7)));
  D.on("enter", () => { say("Les jeux sont faits.", 2200); chip(0.7); });
  D.on("exit", (s) => { if (s) printReceipt(s); });

  /* ---------- the receipt: a tiny slip that sums up the visit ---------- */
  const receipt = $("#receipt");
  let receiptTimer = 0;
  const mmss = (s) => `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;
  function printReceipt({ index, title, secs, detail }) {
    // printed like a slot machine's cash-out ticket: what you spent here is time
    const V = window.VOUCHER, n = String(index + 1).padStart(2, "0");
    const m = Math.floor(secs / 60), sec = secs % 60;
    const spelled = T(
      `${V.words(m)} ${m === 1 ? "MINUTO" : "MINUTOS"} Y ${V.words(sec)} ${sec === 1 ? "SEGUNDO" : "SEGUNDOS"}`,
      `${V.words(m)} ${m === 1 ? "MINUTE" : "MINUTES"} AND ${V.words(sec)} ${sec === 1 ? "SECOND" : "SECONDS"}`);
    receipt.innerHTML = V.html(V.make({
      sub: `${T("MESA", "TABLE")} ${n} · ${title}`,
      words: spelled, amount: mmss(secs), detail,
    }));
    receipt.classList.remove("on");
    void receipt.offsetWidth;
    receipt.classList.add("on");
    clearTimeout(receiptTimer);
    receiptTimer = setTimeout(() => receipt.classList.remove("on"), 5200);
    chip(0.4);
  }
  D.on("land", ({ index }) => {
    say(`${WORDS[index]}. ${P[index].title}.`, 3400);
    body.classList.add("can-again");
    if (index === last) { streak += 1; showStreak(streak); } else streak = 1;
    last = index;
    record(index);
  });

  /* ---------- chips as the index ---------- */
  const index = $("#index");
  [...index.children].forEach((b) => {
    b.addEventListener("pointerenter", () => chip(0.55));
    b.addEventListener("click", () => { body.classList.remove("can-again"); chip(0.9); });
  });

  /* ---------- the real odds ---------- */
  const LOCAL = "woblo:rolls";
  const local = (() => {
    try { const a = JSON.parse(store.get(LOCAL) || "[]"); return P.map((_, i) => Number(a[i]) || 0); } catch (e) { return P.map(() => 0); }
  })();
  function record(i) {
    local[i] += 1;
    store.set(LOCAL, JSON.stringify(local));
    fetch("/api/rolls", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ face: i + 1 }), keepalive: true }).catch(() => {});
  }
  async function mountOdds(el) {
    if (!el) return;
    let counts = null, scope = "every visitor";
    try {
      const r = await fetch("/api/rolls", { cache: "no-store" });
      if (r.ok) { const j = await r.json(); if (Array.isArray(j.counts)) counts = j.counts.map(Number); }
    } catch (e) { /* offline or not configured */ }
    if (!counts) { counts = local.slice(); scope = "this device"; }
    const total = counts.reduce((s, n) => s + n, 0);
    const pct = counts.map((n) => (total ? (n / total) * 100 : 0));
    const scale = Math.max(30, ...pct);
    const fair = 100 / 6;
    el.innerHTML = `
      <div class="odds-head">
        <span class="odds-k">${T("Las probabilidades", "The odds")}</span>
        <h2>${T("Ninguna al azar.<br>O todas.", "None by chance.<br>Or all of them.")}</h2>
        <p>${scope === "every visitor"
          ? T("Cada tirada del dado, contada entre todos los visitantes.", "Every roll of the die, counted across all visitors.")
          : T("Cada tirada del dado en este dispositivo.", "Every roll of the die on this device.")} ${T("Un dado justo da a cada cara", "A fair die gives each face")} 1/6 = ${fair.toFixed(1)} %.</p>
      </div>
      <div class="odds-table" role="table" aria-label="Rolls per project">
        <div class="odds-row is-head" role="row"><span>${T("Cara", "Face")}</span><span>${T("Entrada", "Entry")}</span><span></span><span>${T("Tiradas", "Rolls")}</span><span>%</span></div>
        ${P.map((p, i) => `
        <div class="odds-row" role="row">
          <span>${String(i + 1).padStart(2, "0")}</span>
          <span>${p.title}</span>
          <span class="odds-bar" style="--w:${(pct[i] / scale) * 100}%;--fair:${(fair / scale) * 100}%"><i></i></span>
          <span>${counts[i]}</span>
          <span>${pct[i].toFixed(1)}</span>
        </div>`).join("")}
        <div class="odds-row is-foot" role="row"><span></span><span>Total</span><span></span><span>${total}</span><span>100</span></div>
      </div>`;
    requestAnimationFrame(() => el.classList.add("is-drawn"));
  }
  // the private table borrows the same synthesiser (and the same on/off)
  window.CASINO = { mountOdds, sound: { audio, burst, chip, thud, tick, glass, get on() { return SND.on; } } };

  /* ---------- private table ---------- */
  if (window.VIP) {
    const n = window.VIP.name;
    setTimeout(() => say(n
      ? T(`Bienvenidos, ${n}. Su ficha le espera.`, `Welcome, ${n}. Your chip is waiting.`)
      : T("Bienvenido a la mesa privada.", "Welcome to the private table."), 4200), 3200);
    D.on("table", () => { say(T("Su mesa está lista.", "Your table is ready."), 2400); chip(1); setTimeout(() => chip(0.7), 110); });
  }

  /* ---------- ES / EN ---------- */
  const langBtn = $("#langBtn");
  if (langBtn) langBtn.addEventListener("click", () => window.setLang(window.LANG === "es" ? "en" : "es"));

  /* ---------- the cursor roulette: hold outside the die, release, land ---------- */
  const canvas = $("#gl"), cursorEl = $("#cursor");
  let hold = null;
  canvas.addEventListener("pointerdown", (e) => {
    const s = D.state;
    if (e.pointerType !== "mouse" || s.overlay || !s.introDone) return;
    if (!["idle", "lock", "turn"].includes(s.mode) || D.hitTest(e)) return;
    hold = { timer: setTimeout(spin, 240), spinning: false, ticks: 0 };
  });
  function spin() {
    if (!hold) return;
    hold.spinning = true;
    cursorEl.classList.add("is-roulette");
    say("Faites vos jeux.", 1500);
    hold.ticks = setInterval(() => tick(0.7), 95);
  }
  addEventListener("pointerup", () => {
    if (!hold) return;
    clearTimeout(hold.timer);
    if (hold.spinning) {
      clearInterval(hold.ticks);
      cursorEl.classList.add("is-landing");
      let k = 0;
      const slow = () => { tick(0.55); if (++k < 6) setTimeout(slow, 120 + k * 70); };
      slow();
      const cur = D.state.active;
      let i;
      do { i = Math.floor(Math.random() * P.length); } while (i === cur && P.length > 1);
      setTimeout(() => {
        cursorEl.classList.remove("is-roulette", "is-landing");
        body.classList.remove("can-again");
        D.goTo(i);
        say(`${WORDS[i]}. ${P[i].title}.`, 3000);
        chip(0.8);
      }, 1050);
    }
    hold = null;
  });
})();
