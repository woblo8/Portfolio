/* ============================================================
   JACKPOT STACK — from Nobody to Supreme Magnate.
   A board game (final degree project). The page climbs the
   status ladder as you scroll: the HUD counts Stacks and names
   your rank, the five phases of a round light up one by one,
   and a trap code can be cracked with the Risk Die (D6), as in
   the rules.
   ============================================================ */
(() => {
  "use strict";
  window.LAYOUTS = window.LAYOUTS || {};
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const smooth = (a, b, t) => { const x = clamp((t - a) / (b - a), 0, 1); return x * x * (3 - 2 * x); };

  // the status ladder of the game (0–100 points)
  const RANKS = () => [
    { at: 0, n: T("Don Nadie", "Nobody") },
    { at: 11, n: T("Apostador Promedio", "Average Gambler") },
    { at: 26, n: T("Dueño de Casino", "Casino Owner") },
    { at: 51, n: T("Magnate Local", "Local Magnate") },
    { at: 76, n: T("Magnate Supremo", "Supreme Magnate") },
  ];
  const CODE = [6, 3, 3]; // Lucky Spin, floor 1

  function render(p, i, h) {
    const { esc, pad } = h;
    const d = p.jackpot;
    const f = (x) => `${p.folder}/images/${x}`;
    const fig = (src, alt, cls = "") => `<figure class="jk-img ${cls}" data-zoom><img src="${f(src)}" alt="${esc(alt)}" data-cap="${esc(alt)}" loading="lazy"></figure>`;
    const ranks = RANKS();

    return `
<div class="jk">
  <section class="jk-hero" data-jk="hero">
    <div class="jk-sticky">
      <div class="jk-glow"></div>
      <img class="jk-box" src="${f("box.jpg")}" alt="Jackpot Stack">
      <div class="jk-hero-meta"><b>PROJECT ${pad(i)}</b><span>/</span><span>${esc(p.category)}</span><span>/</span><span>${esc(p.year)}</span></div>
      <div class="jk-hero-text">
        <h1 class="jk-title">JACKPOT<br>STACK</h1>
        <p class="jk-sub">${esc(p.intro)}</p>
      </div>
      <ul class="jk-facts">
        ${d.facts.map((x) => `<li><b>${esc(x.v)}</b><span>${esc(x.k)}</span></li>`).join("")}
      </ul>
    </div>
  </section>

  <section class="jk-block jk-concept">
    <header class="jk-head r">
      <span class="jk-kicker">${T("El juego", "The game")}</span>
      <h2>${T("Construye un casino.<br>Arruina el de los demás.", "Build a casino.<br>Ruin everyone else’s.")}</h2>
    </header>
    <p class="jk-lead r">${esc(d.idea)}</p>
    <ol class="jk-moves">
      ${d.moves.map((m, k) => `<li class="r"><span>${String(k + 1).padStart(2, "0")}</span><b>${esc(m.w)}</b><small>${esc(m.t)}</small></li>`).join("")}
    </ol>
  </section>

  <section class="jk-phases" data-jk="phases">
    <div class="jk-sticky">
      <span class="jk-kicker">${T("Una ronda · cinco fases · diez rondas", "One round · five phases · ten rounds")}</span>
      <ol class="jk-phase-list">
        ${d.phases.map((ph, k) => `<li><span>${k + 1}</span><b>${esc(ph.w)}</b><small>${esc(ph.t)}</small></li>`).join("")}
      </ol>
    </div>
  </section>

  <section class="jk-block jk-trap">
    <div class="jk-trap-grid">
      <div class="jk-trap-text r">
        <span class="jk-kicker">${T("Fase de inspección", "Inspection phase")}</span>
        <h2>${T("Cada máquina<br>esconde un código.", "Every machine<br>hides a code.")}</h2>
        <p>${esc(d.trap)}</p>
      </div>
      <div class="jk-safe r" aria-live="polite">
        <div class="jk-safe-top"><span>Lucky Spin · ${T("Piso 1", "Floor 1")}</span><span class="jk-tries">${T("Intentos", "Attempts")} <b>0</b></span></div>
        <div class="jk-code">${CODE.map(() => `<i>?</i>`).join("")}</div>
        <div class="jk-die" aria-hidden="true"><b>–</b></div>
        <p class="jk-msg">${T("Tira el Dado de Riesgo: un dígito por tirada.", "Roll the Risk Die: one digit per roll.")}</p>
        <div class="jk-safe-btns">
          <button type="button" class="jk-roll" data-mode="code">${T("Descifrar dígito", "Crack a digit")}</button>
          <button type="button" class="jk-roll is-alt" data-mode="once">${T("Tirada única", "Single roll")}</button>
        </div>
      </div>
    </div>
  </section>

  <section class="jk-block">
    <header class="jk-head r">
      <span class="jk-kicker">${T("Componentes", "Components")}</span>
      <h2>${T("Todo lo que cabe<br>en la caja.", "Everything<br>in the box.")}</h2>
    </header>
    <div class="jk-parts">
      ${d.parts.map((c, k) => `
      <article class="jk-part r">
        ${fig(c.img, c.label)}
        <h3><span>${String(k + 1).padStart(2, "0")}</span>${esc(c.label)}</h3>
        <p>${esc(c.text)}</p>
      </article>`).join("")}
    </div>
  </section>

  <section class="jk-wide">
    ${fig("cards.jpg", T("Cartas de evento impresas: crisis, auditorías, fiestas y traiciones", "Printed event cards: crises, audits, parties and betrayals"), "is-wide")}
  </section>

  <section class="jk-block">
    <header class="jk-head r">
      <span class="jk-kicker">${T("Proceso", "Process")}</span>
      <h2>${T("Del boceto<br>a la mesa.", "From sketch<br>to table.")}</h2>
    </header>
    <ol class="jk-process">
      ${d.process.map((s, k) => `
      <li class="jk-step r">
        <div class="jk-step-text"><span>${String(k + 1).padStart(2, "0")}</span><h3>${esc(s.label)}</h3><p>${esc(s.text)}</p></div>
        <div class="jk-step-imgs">${s.imgs.map((im) => fig(im, s.label)).join("")}</div>
      </li>`).join("")}
    </ol>
  </section>

  <section class="jk-block jk-final">
    <header class="jk-head r">
      <span class="jk-kicker">${T("El juego impreso", "The printed game")}</span>
      <h2>${T("Fichas, billetes<br>y mucho morado.", "Tokens, banknotes<br>and a lot of purple.")}</h2>
    </header>
    <div class="jk-mosaic">
      ${fig("final-1.jpg", T("Fichas de máquina por piso", "Machine tokens by floor"), "a")}
      ${fig("final-2.jpg", T("Fichas de VIP, vigilantes y cámaras", "VIP, guard and camera tokens"), "b")}
      ${fig("final-3.jpg", T("Cartas de personaje: cada jugador, una habilidad", "Character cards: one ability per player"), "c")}
      ${fig("final-4.jpg", T("Dentro de la caja: panel del jugador, mazos y fichas", "Inside the box: player board, decks and tokens"), "d")}
      ${fig("final-5.jpg", T("Cartas de mejora: el árbol de habilidades", "Upgrade cards: the skill tree"), "e")}
    </div>
  </section>

  <section class="jk-pack">
    <figure class="jk-pack-img" data-zoom><img src="${f("box-2.jpg")}" alt="Packaging" data-cap="${T("Packaging: capitoné morado, coche negro, whisky y un fajo de Stacks.", "Packaging: purple tufting, a black car, whisky and a wad of Stacks.")}" loading="lazy"></figure>
    <div class="jk-pack-text">
      <span class="jk-kicker">${T("Escalera de estatus", "Status ladder")}</span>
      <ol>${ranks.map((r, k) => `<li class="r"><span>${String(r.at).padStart(2, "0")}</span>${esc(r.n)}</li>`).join("")}</ol>
    </div>
  </section>

  <section class="jk-outro">
    <p class="jk-outro-line">${esc(d.outro).replace(/\n/g, "<br>")}</p>
  </section>

  <div class="jk-hud" aria-hidden="true">
    <span><b>JACKPOT STACK</b></span>
    <span>Stacks <b class="jk-stacks">15,000</b></span>
    <span class="jk-rank">${T("Estatus", "Status")} · <b>${esc(ranks[0].n)}</b></span>
    <div class="jk-hud-bar"><i></i></div>
  </div>
</div>`;
  }

  function init(scroller, root) {
    const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
    const $ = (s) => root.querySelector(s);
    const $$ = (s) => [...root.querySelectorAll(s)];
    const hero = $('[data-jk="hero"]'), box = $(".jk-box"), glow = $(".jk-glow"), text = $(".jk-hero-text"), facts = $(".jk-facts"), meta = $(".jk-hero-meta");
    const phases = $('[data-jk="phases"]'), phaseItems = $$(".jk-phase-list li");
    const stacksEl = $(".jk-stacks"), rankEl = $(".jk-rank b"), bar = $(".jk-hud-bar i");
    const ranks = RANKS();
    let raf = 0, lastRank = -1;

    const pinned = (el) => { const r = el.getBoundingClientRect(); return clamp(-r.top / Math.max(1, r.height - innerHeight), 0, 1); };

    function frame() {
      // hero: the box comes forward and turns a little, the title steps aside for the facts
      const hp = pinned(hero);
      const k = reduce ? 0 : smooth(0, 1, hp);
      box.style.transform = `translate3d(${(k * 14).toFixed(2)}vw, ${(-k * 3).toFixed(2)}vh, 0) scale(${(0.9 + k * 0.22).toFixed(4)}) rotate(${(-k * 4).toFixed(2)}deg)`;
      glow.style.opacity = (0.55 + k * 0.45).toFixed(3);
      const out = smooth(0.05, 0.4, hp);
      text.style.opacity = (1 - out).toFixed(3);
      meta.style.opacity = (1 - out).toFixed(3);
      text.style.transform = `translate3d(0, ${(-out * 5).toFixed(2)}vh, 0)`;
      facts.classList.toggle("on", hp > 0.35);

      // the five phases of a round, one after another
      const pp = pinned(phases);
      phaseItems.forEach((li, n) => li.classList.toggle("on", pp > 0.08 + n * 0.17));

      // HUD: the further you go, the richer you get
      const sp = clamp(scroller.scrollTop / Math.max(1, scroller.scrollHeight - scroller.clientHeight), 0, 1);
      const money = Math.round((15000 + Math.pow(sp, 2.2) * 985000) / 1000) * 1000;
      stacksEl.textContent = money.toLocaleString("en-US");
      const pts = sp * 100;
      let r = 0; ranks.forEach((x, n) => { if (pts >= x.at) r = n; });
      if (r !== lastRank) { lastRank = r; rankEl.textContent = ranks[r].n; rankEl.parentElement.classList.remove("up"); void rankEl.offsetWidth; rankEl.parentElement.classList.add("up"); }
      bar.style.transform = `scaleX(${sp.toFixed(4)})`;
      raf = requestAnimationFrame(frame);
    }
    raf = requestAnimationFrame(frame);

    // the trap: crack 6-3-3 with the Risk Die, digit by digit, or gamble on a single roll
    const cells = $$(".jk-code i"), die = $(".jk-die"), dieN = $(".jk-die b"), msg = $(".jk-msg"), triesEl = $(".jk-tries b"), safe = $(".jk-safe");
    let at = 0, tries = 0, busy = false, timer = 0;
    const say = (t, cls = "") => { msg.textContent = t; msg.className = "jk-msg " + cls; };
    const reset = () => { at = 0; cells.forEach((c) => { c.textContent = "?"; c.className = ""; }); };
    function roll(mode) {
      if (busy) return;
      if (safe.classList.contains("is-open")) { safe.classList.remove("is-open"); reset(); }
      busy = true; tries++; triesEl.textContent = tries;
      die.classList.remove("hit", "miss"); die.classList.add("rolling");
      let spins = reduce ? 1 : 9;
      const tick = () => {
        const v = 1 + Math.floor(Math.random() * 6);
        dieN.textContent = v;
        if (--spins > 0) { timer = setTimeout(tick, 55); return; }
        die.classList.remove("rolling");
        busy = false;
        if (mode === "once") {
          if (v >= 5) { cells.forEach((c, n) => { c.textContent = CODE[n]; c.className = "ok"; }); open(); }
          else if (v <= 2) { die.classList.add("miss"); say(T(`${v}: fallas y pagas la multa.`, `${v}: you fail and pay the fine.`), "bad"); }
          else { die.classList.add("miss"); say(T(`${v}: no pasa nada.`, `${v}: nothing happens.`)); }
          return;
        }
        if (v === CODE[at]) {
          die.classList.add("hit");
          cells[at].textContent = v; cells[at].className = "ok"; at++;
          if (at === CODE.length) open();
          else say(T(`¡${v}! Dígito ${at} de ${CODE.length}. Sigue.`, `${v}! Digit ${at} of ${CODE.length}. Keep going.`), "good");
        } else {
          die.classList.add("miss");
          if (cells[at]) cells[at].className = "bad";
          say(T(`${v}. Fallas el dígito: se acaba tu turno.`, `${v}. Wrong digit: your turn is over.`), "bad");
          setTimeout(reset, 900);
        }
      };
      tick();
    }
    function open() {
      safe.classList.add("is-open");
      say(T("Trampa desactivada. El dueño pierde 5 de estatus.", "Trap disarmed. The owner loses 5 status."), "good");
    }
    const onClick = (e) => { const b = e.target.closest(".jk-roll"); if (b) roll(b.dataset.mode); };
    safe.addEventListener("click", onClick);

    const stop = () => { cancelAnimationFrame(raf); clearTimeout(timer); safe.removeEventListener("click", onClick); };
    stop.receipt = () => `Stacks ${stacksEl.textContent} · ${rankEl.textContent}`;
    return stop;
  }

  window.LAYOUTS.jackpot = { render, init };
})();
