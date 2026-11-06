/* ============================================================
   JACKPOT STACK — from Nobody to Supreme Magnate.
   A board game (final degree project), told as something you
   can touch: the box turns in your hands, you open it and see
   what's inside, and you play a real round with the rules of
   the game — collect, build, bet, crack a trap, draw an event —
   while your casino grows and your status climbs.
   ============================================================ */
(() => {
  "use strict";
  window.LAYOUTS = window.LAYOUTS || {};
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const smooth = (a, b, t) => { const x = clamp((t - a) / (b - a), 0, 1); return x * x * (3 - 2 * x); };
  const fmtN = (n) => { const s = String(Math.abs(Math.round(n))).replace(/\B(?=(\d{3})+(?!\d))/g, T(".", ",")); return n < 0 ? "−" + s : s; };

  // the status ladder of the game (0–100 points)
  const RANKS = () => [
    { at: 0, n: T("Don Nadie", "Nobody") },
    { at: 11, n: T("Apostador Promedio", "Average Gambler") },
    { at: 26, n: T("Dueño de Casino", "Casino Owner") },
    { at: 51, n: T("Magnate Local", "Local Magnate") },
    { at: 76, n: T("Magnate Supremo", "Supreme Magnate") },
  ];
  const rankOf = (pts) => RANKS().reduce((r, x) => (pts >= x.at ? x : r), RANKS()[0]);
  const CODE = [6, 3, 3]; // Lucky Spin's trap code, floor 1

  // event cards from the printed deck, with what they do to you
  const EVENTS = () => [
    { n: T("Revisión fiscal", "Tax audit"), t: T("Pierdes el 10% de tus Stacks.", "You lose 10% of your Stacks."), fx: (s) => { s.stacks = Math.round(s.stacks * 0.9); } },
    { n: T("Estrella fugaz", "Shooting star"), t: T("Un VIP gratis: +5 de estatus.", "A free VIP: +5 status."), fx: (s) => { s.status += 5; } },
    { n: T("Escándalo público", "Public scandal"), t: T("Pierdes 10 de estatus.", "You lose 10 status."), fx: (s) => { s.status = Math.max(0, s.status - 10); } },
    { n: T("Fiebre del azar", "Gambling fever"), t: T("Tus máquinas pagan el doble esta ronda: +ingresos.", "Your machines pay double this round: +income."), fx: (s) => { s.stacks += s.income; } },
    { n: T("Tributo a la fama", "Tribute to fame"), t: T("Pagas 1.000 por máquina para mantener el prestigio.", "You pay 1,000 per machine to keep your prestige."), fx: (s) => { s.stacks -= 1000 * s.machines; } },
    { n: T("Expansión frenética", "Frantic expansion"), t: T("Construir cuesta la mitad la próxima ronda.", "Building costs half next round."), fx: (s) => { s.discount = true; } },
  ];

  function render(p, i, h) {
    const { esc, pad } = h;
    const f = (x) => `${p.folder}/images/${x}`;
    const img = (src, alt, cls = "") => `<figure class="jk-img ${cls}" data-zoom><img src="${f(src)}" alt="${esc(alt)}" data-cap="${esc(alt)}" loading="lazy"></figure>`;
    const ranks = RANKS();
    const phases = [
      { k: "income", n: T("Ingresos", "Income"), t: T("Tus máquinas te pagan desde la banca.", "Your machines pay you from the bank.") },
      { k: "build", n: T("Construcción", "Building"), t: T("Gasta Stacks en una máquina nueva y un hexágono más para tu casino.", "Spend Stacks on a new machine and one more hexagon for your casino.") },
      { k: "bet", n: T("Apuestas", "Betting"), t: T("Apuesta en Lucky Spin con su dado: D6, del 1 al 5 ganas ×1,1; con un 6 pierdes ×2.", "Bet on Lucky Spin with its die: D6, 1 to 5 you win ×1.1; a 6 and you lose ×2.") },
      { k: "inspect", n: T("Inspección", "Inspection"), t: T("Un rival tiene una trampa en Lucky Spin: descifra su código, un dígito por tirada.", "A rival has a trap on Lucky Spin: crack its code, one digit per roll.") },
      { k: "event", n: T("Eventos", "Events"), t: T("Se roba una carta de evento. Afecta a todos.", "An event card is drawn. It hits everyone.") },
    ];
    // the hotspots on the photo of the open box (in % of the photo)
    const inside = [
      [30, 20, T("Panel del jugador", "Player board"), T("Máquinas, ingresos y la secuencia del turno, a mano.", "Machines, income and the turn sequence, at hand.")],
      [79, 15, T("Cartas de máquina", "Machine cards"), T("Cada una con su coste, su dado de apuestas y su código secreto.", "Each with its cost, its betting die and its secret code.")],
      [80, 40, T("Cartas de mejora", "Upgrade cards"), T("El árbol de habilidades para trampas y estrategias.", "The skill tree for traps and strategies.")],
      [33, 74, T("Fichas de máquina", "Machine tokens"), T("Una por máquina construida, por piso.", "One per machine built, per floor.")],
      [76, 80, T("VIPs y seguridad", "VIPs and security"), T("Fichas de VIP, vigilantes y cámaras.", "VIP, guard and camera tokens.")],
    ];
    const hexes = Array.from({ length: 12 }, (_, k) => `<i class="hx" data-h="${k}"></i>`).join("");

    return `
<div class="jk">
  <!-- 1 · the box -->
  <section class="jk-hero" data-jk="hero">
    <div class="jk-sticky">
      <div class="jk-glow"></div>
      <img class="jk-box" src="${f("box-hero.jpg")}" alt="Jackpot Stack">
      <div class="jk-hero-meta"><b>PROJECT ${pad(i)}</b><span>/</span><span>${esc(p.category)}</span><span>/</span><span>${esc(p.year)}</span></div>
      <div class="jk-hero-text">
        <h1 class="jk-title">JACKPOT<br>STACK</h1>
        <p class="jk-sub">${T("De Don Nadie a Magnate Supremo.", "From Nobody to Supreme Magnate.")}</p>
        <ul class="jk-facts">
          <li><b>2–4</b><span>${T("Jugadores", "Players")}</span></li>
          <li><b>60–90′</b><span>${T("Por partida", "Per game")}</span></li>
          <li><b>+12</b><span>${T("Años", "Years")}</span></li>
          <li><b>10</b><span>${T("Rondas", "Rounds")}</span></li>
        </ul>
      </div>
    </div>
  </section>

  <!-- 2 · the premise -->
  <section class="jk-block jk-premise">
    <div class="jk-premise-grid">
      <div class="r">
        <span class="jk-kicker">${T("La premisa", "The premise")}</span>
        <h2>${T("Construye un casino.<br>Arruina el de los demás.", "Build a casino.<br>Ruin everyone else’s.")}</h2>
        <p class="jk-lead">${T("Cada jugador levanta su casino hexágono a hexágono alrededor de una banca central. Máquinas, VIPs, apuestas, sobornos y trampas con códigos secretos. Gana quien acaba sin deudas, o quien tiene más Stacks tras diez rondas.", "Each player builds a casino hexagon by hexagon around a central bank. Machines, VIPs, bets, bribes and traps with secret codes. The winner is whoever ends with no debt, or with the most Stacks after ten rounds.")}</p>
      </div>
      <figure class="jk-magnate r"><img src="${f("magnate.jpg")}" alt="${T("Un personaje: el magnate", "A character: the magnate")}" loading="lazy"></figure>
    </div>
  </section>

  <!-- 3 · open the box -->
  <section class="jk-block jk-open">
    <header class="jk-head r"><span class="jk-kicker">${T("Abre la caja", "Open the box")}</span><h2>${T("Todo lo que hay dentro.", "Everything inside.")}</h2></header>
    <div class="jk-inside r">
      <img src="${f("photo-inside.jpg")}" alt="${T("La caja abierta", "The open box")}" loading="lazy">
      ${inside.map(([x, y, n, t], k) => `<button type="button" class="jk-spot${x > 60 ? " is-r" : x < 40 ? " is-l" : ""}" style="left:${x}%;top:${y}%" data-spot="${k}" aria-label="${esc(n)}"><i></i><span><b>${esc(n)}</b><small>${esc(t)}</small></span></button>`).join("")}
    </div>
    <p class="jk-note r">${T("Pulsa los puntos.", "Tap the dots.")}</p>
  </section>

  <!-- 4 · play a round -->
  <section class="jk-block jk-play" data-jk="play">
    <header class="jk-head r"><span class="jk-kicker">${T("Las reglas, jugando", "The rules, played")}</span><h2>${T("Juega una ronda.", "Play a round.")}</h2></header>
    <div class="jk-game r">
      <div class="jk-hudbar">
        <div><small>Stacks</small><b data-g="stacks">15.000</b></div>
        <div><small>${T("Máquinas", "Machines")}</small><b data-g="machines">1</b></div>
        <div><small>${T("Estatus", "Status")}</small><b data-g="status">0</b></div>
        <div class="is-rank"><small>${T("Rango", "Rank")}</small><b data-g="rank">${esc(ranks[0].n)}</b></div>
        <div><small>${T("Ronda", "Round")}</small><b data-g="round">1/10</b></div>
        <div class="jk-ladder" aria-hidden="true"><i data-g="ladder"></i></div>
      </div>
      <ol class="jk-steps">${phases.map((ph, k) => `<li data-step="${k}"><span>${k + 1}</span>${esc(ph.n)}</li>`).join("")}</ol>
      <div class="jk-stage">
        <div class="jk-phase" data-phase="income">
          <p>${phases[0].t}</p>
          <div class="jk-casino">${hexes}</div>
          <button type="button" class="jk-act" data-act="income">${T("Cobrar ingresos", "Collect income")}</button>
        </div>
        <div class="jk-phase" data-phase="build">
          <p>${phases[1].t}</p>
          <div class="jk-buildcard"><b>Fruit Jackpot</b><span data-g="cost">12.000 Stacks</span><span>${T("+2.000 por ronda · +3 estatus", "+2,000 per round · +3 status")}</span></div>
          <div class="jk-row"><button type="button" class="jk-act" data-act="build">${T("Construir", "Build")}</button><button type="button" class="jk-act is-ghost" data-act="skip">${T("Pasar", "Pass")}</button></div>
        </div>
        <div class="jk-phase" data-phase="bet">
          <div class="jk-bet">
            <img src="${f("card-luckyspin.jpg")}" alt="Lucky Spin" loading="lazy">
            <div><p>${phases[2].t}</p><div class="jk-die" data-g="die"><b>–</b></div>
              <div class="jk-row"><button type="button" class="jk-act" data-act="bet">${T("Apostar 2.000", "Bet 2,000")}</button><button type="button" class="jk-act is-ghost" data-act="skip">${T("Pasar", "Pass")}</button></div></div>
          </div>
        </div>
        <div class="jk-phase" data-phase="inspect">
          <p>${phases[3].t}</p>
          <div class="jk-code">${CODE.map(() => `<i>?</i>`).join("")}</div>
          <div class="jk-row"><button type="button" class="jk-act" data-act="crack">${T("Dígito a dígito", "Digit by digit")}</button><button type="button" class="jk-act" data-act="gamble">${T("A una tirada", "One roll")}</button><button type="button" class="jk-act is-ghost" data-act="skip">${T("Dejarlo", "Leave it")}</button></div>
          <small class="jk-rule">${T("Dígito a dígito: aciertas el número o se acaba tu turno. A una tirada: 1–2 pierdes 3.000, 3–4 nada, 5–6 la desactivas.", "Digit by digit: hit the number or your turn ends. One roll: 1–2 you lose 3,000, 3–4 nothing, 5–6 you disarm it.")}</small>
        </div>
        <div class="jk-phase" data-phase="event">
          <p>${phases[4].t}</p>
          <div class="jk-event" data-g="event"><div class="jk-event-back">EVENTO</div><div class="jk-event-front"><b></b><span></span></div></div>
          <button type="button" class="jk-act" data-act="event">${T("Robar carta", "Draw a card")}</button>
        </div>
        <div class="jk-phase" data-phase="end">
          <p class="jk-end" data-g="end"></p>
          <button type="button" class="jk-act" data-act="again">${T("Otra ronda", "Another round")}</button>
        </div>
      </div>
      <p class="jk-log" data-g="log" aria-live="polite"></p>
    </div>
  </section>

  <!-- 5 · the cards -->
  <section class="jk-block jk-cards">
    <header class="jk-head r"><span class="jk-kicker">${T("Las cartas", "The cards")}</span><h2>${T("Personajes, castigos<br>y máquinas.", "Characters, punishments<br>and machines.")}</h2></header>
    <div class="jk-fan">
      ${[["card-padrino.jpg", T("El Padrino del Casino · personaje", "The Casino Godfather · character")], ["card-auditoria.jpg", T("Auditoría · evento", "Audit · event")], ["card-luckyspin.jpg", T("Lucky Spin · máquina", "Lucky Spin · machine")]]
        .map(([s, n]) => `<figure class="jk-card r" data-tilt data-zoom><img src="${f(s)}" alt="${esc(n)}" data-cap="${esc(n)}" loading="lazy"><figcaption>${esc(n)}</figcaption></figure>`).join("")}
    </div>
    <div class="jk-notes">
      ${img("note-stacks.jpg", T("Billete de 1.000.000 Stacks", "A 1,000,000 Stacks note"), "is-note r")}
      ${img("note-million.jpg", T("El reverso de la moneda de la casa", "The house currency, other side"), "is-note r")}
    </div>
  </section>

  <!-- 6 · process -->
  <section class="jk-block jk-process">
    <header class="jk-head r"><span class="jk-kicker">${T("Proceso", "Process")}</span><h2>${T("Del boceto<br>a la mesa.", "From sketch<br>to table.")}</h2></header>
    <div class="jk-strip" data-jk="strip">
      ${[
        ["sketch-cards.jpg", "01", T("Bocetos", "Sketches"), T("Cartas de máquina: cuatro maneras de ordenar nombre, imagen, ingresos y condiciones.", "Machine cards: four ways to lay out name, image, income and conditions.")],
        ["sketch-board.jpg", "02", T("La mesa", "The table"), T("Cómo se reparte el espacio entre la banca, los casinos y el panel de cada jugador.", "How the space is shared between the bank, the casinos and each player's board.")],
        ["mindmap.jpg", "03", T("Mapa de mecánicas", "Mechanics map"), T("Riesgo, recompensa, VIPs, trampas: todo conectado antes de dibujar nada.", "Risk, reward, VIPs, traps: all connected before drawing anything.")],
        ["paper-1.jpg", "04", T("Prototipo de papel", "Paper prototype"), T("Cartulina, hexágonos recortados y dados: las primeras partidas de verdad.", "Card, cut-out hexagons and dice: the first real games.")],
        ["tts-2.jpg", "05", "Tabletop Simulator", T("La versión digital para probar reglas rápido y en remoto.", "The digital version, to test rules fast and remotely.")],
        ["photo-panel.jpg", "06", T("El juego impreso", "The printed game"), T("Panel, billetes y banca, impresos y montados.", "Board, notes and bank, printed and assembled.")],
      ].map(([s, n, t, d]) => `<article class="jk-step"><figure class="jk-img" data-zoom><img src="${f(s)}" alt="${esc(t)}" data-cap="${esc(t + " — " + d)}" loading="lazy"></figure><span>${n}</span><h3>${esc(t)}</h3><p>${esc(d)}</p></article>`).join("")}
    </div>
    <p class="jk-note">${T("Desliza →", "Swipe →")}</p>
  </section>

  <!-- 7 · printed -->
  <section class="jk-block jk-printed">
    <header class="jk-head r"><span class="jk-kicker">${T("Impreso", "Printed")}</span><h2>${T("Más de 300 piezas.", "Over 300 pieces.")}</h2></header>
    <div class="jk-mosaic">
      ${img("photo-events.jpg", T("Cartas de evento", "Event cards"), "a r")}
      ${img("photo-charcards.jpg", T("Cartas de personaje", "Character cards"), "b r")}
      ${img("photo-machines.jpg", T("Fichas de máquina por piso", "Machine tokens by floor"), "c r")}
      ${img("photo-machinecards.jpg", T("Cartas de máquina", "Machine cards"), "d r")}
      ${img("photo-characters.jpg", T("Fichas de VIP y seguridad", "VIP and security tokens"), "e r")}
      ${img("photo-upgrades.jpg", T("Cartas de mejora", "Upgrade cards"), "f r")}
    </div>
  </section>

  <!-- 8 · the packaging, in your hands -->
  <section class="jk-block jk-pack">
    <div class="jk-pack-grid">
      <div class="r">
        <span class="jk-kicker">${T("Packaging", "Packaging")}</span>
        <h2>${T("Gírala.", "Turn it.")}</h2>
        <p class="jk-lead">${T("Capitoné morado, un coche negro, whisky y un fajo de Stacks: la caja promete lo que el juego cumple. Arrástrala para verla por todos los lados.", "Purple tufting, a black car, whisky and a wad of Stacks: the box promises what the game delivers. Drag it to see every side.")}</p>
      </div>
      <div class="jk-3d" data-jk="box" aria-label="${T("Caja en 3D, arrastra para girarla", "3D box, drag to turn it")}">
        <div class="jk-cube">
          <div class="f front" style="background-image:url('${f("box-front-flat.jpg")}')"></div>
          <div class="f back" style="background-image:url('${f("box-back-flat.jpg")}')"></div>
          <div class="f right"><i style="background-image:url('${f("box-side.jpg")}')"></i></div>
          <div class="f left"><i style="background-image:url('${f("box-side.jpg")}')"></i></div>
          <div class="f top" style="background-image:url('${f("logo.jpg")}')"></div>
          <div class="f bottom" style="background-image:url('${f("logo.jpg")}')"></div>
        </div>
      </div>
    </div>
    <ol class="jk-ladder-list">${ranks.map((r) => `<li class="r"><span>${String(r.at).padStart(2, "0")}</span>${esc(r.n)}</li>`).join("")}</ol>
  </section>

  <section class="jk-outro"><p class="jk-outro-line">${T("De Don Nadie<br>a Magnate Supremo.", "From Nobody<br>to Supreme Magnate.")}</p></section>
</div>`;
  }

  function init(scroller, root) {
    const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
    const $ = (s) => root.querySelector(s), $$ = (s) => [...root.querySelectorAll(s)];
    const g = (k) => root.querySelector(`[data-g="${k}"]`);
    const hero = $('[data-jk="hero"]'), box = $(".jk-box"), glow = $(".jk-glow"), text = $(".jk-hero-text"), meta = $(".jk-hero-meta");
    let raf = 0;
    const pinned = (el) => { const r = el.getBoundingClientRect(); return clamp(-r.top / Math.max(1, r.height - innerHeight), 0, 1); };

    // the hero: the box comes forward as you scroll
    function frame() {
      const k = reduce ? 0 : smooth(0, 1, pinned(hero));
      box.style.transform = `translate3d(${(k * 10).toFixed(2)}vw, ${(-k * 4).toFixed(2)}vh, 0) scale(${(0.92 + k * 0.26).toFixed(4)}) rotate(${(-k * 5).toFixed(2)}deg)`;
      glow.style.opacity = (0.5 + k * 0.5).toFixed(3);
      const out = smooth(0.1, 0.55, pinned(hero));
      text.style.opacity = meta.style.opacity = (1 - out).toFixed(3);
      raf = requestAnimationFrame(frame);
    }
    raf = requestAnimationFrame(frame);

    // open the box: one hotspot open at a time
    root.addEventListener("click", (e) => {
      const s = e.target.closest(".jk-spot");
      if (!s) return;
      const on = !s.classList.contains("on");
      $$(".jk-spot").forEach((x) => x.classList.remove("on"));
      s.classList.toggle("on", on);
    });

    // the cards lean towards the pointer
    $$("[data-tilt]").forEach((c) => {
      c.addEventListener("pointermove", (e) => { if (reduce) return; const r = c.getBoundingClientRect(); const x = (e.clientX - r.left) / r.width - 0.5, y = (e.clientY - r.top) / r.height - 0.5; c.style.transform = `perspective(900px) rotateY(${(x * 16).toFixed(2)}deg) rotateX(${(-y * 16).toFixed(2)}deg) translateY(-6px)`; c.style.setProperty("--gx", `${(x + 0.5) * 100}%`); c.style.setProperty("--gy", `${(y + 0.5) * 100}%`); });
      c.addEventListener("pointerleave", () => { c.style.transform = ""; });
    });

    // the box in 3D: drag to turn it, it keeps a slow spin of its own
    const cube = $(".jk-cube"), stage3d = $('[data-jk="box"]');
    let rx = -12, ry = -28, drag = null, spin = !reduce;
    const paintCube = () => { cube.style.transform = `rotateX(${rx}deg) rotateY(${ry}deg)`; };
    stage3d.addEventListener("pointerdown", (e) => { drag = { x: e.clientX, y: e.clientY, rx, ry }; spin = false; stage3d.setPointerCapture && stage3d.setPointerCapture(e.pointerId); });
    stage3d.addEventListener("pointermove", (e) => { if (!drag) return; ry = drag.ry + (e.clientX - drag.x) * 0.5; rx = clamp(drag.rx - (e.clientY - drag.y) * 0.4, -70, 70); paintCube(); });
    const endDrag = () => { drag = null; };
    stage3d.addEventListener("pointerup", endDrag); stage3d.addEventListener("pointercancel", endDrag);
    let spinRaf = 0;
    const spinLoop = () => { if (spin) { ry += 0.18; paintCube(); } spinRaf = requestAnimationFrame(spinLoop); };
    paintCube(); spinRaf = requestAnimationFrame(spinLoop);

    /* ---------- a round, with the game's rules ---------- */
    const ORDER = ["income", "build", "bet", "inspect", "event", "end"];
    const st = { stacks: 15000, machines: 1, income: 1000, status: 0, round: 1, step: 0, discount: false, code: 0 };
    let timer = 0;
    const say = (t) => { const l = g("log"); l.textContent = t; l.classList.remove("on"); void l.offsetWidth; l.classList.add("on"); };
    function paint() {
      g("stacks").textContent = fmtN(st.stacks);
      g("machines").textContent = st.machines;
      g("status").textContent = st.status;
      g("rank").textContent = rankOf(st.status).n;
      g("round").textContent = `${st.round}/10`;
      g("ladder").style.width = `${clamp(st.status, 0, 100)}%`;
      g("cost").textContent = `${fmtN(st.discount ? 6000 : 12000)} Stacks`;
      $$(".jk-casino .hx").forEach((h, k) => h.classList.toggle("on", k < 2 + st.machines));
      $$(".jk-steps li").forEach((li, k) => { li.classList.toggle("on", k === st.step); li.classList.toggle("done", k < st.step); });
      $$(".jk-phase").forEach((ph) => ph.classList.toggle("on", ph.dataset.phase === ORDER[st.step]));
      $$(".jk-code i").forEach((c, k) => { c.textContent = k < st.code ? CODE[k] : "?"; c.classList.toggle("ok", k < st.code); });
    }
    const nextStep = (delay = 900) => { clearTimeout(timer); timer = setTimeout(() => { st.step = Math.min(ORDER.length - 1, st.step + 1); paint(); if (ORDER[st.step] === "end") endRound(); }, delay); };
    function endRound() {
      const r = rankOf(st.status);
      g("end").innerHTML = T(`Fin de la ronda ${st.round}. Tienes <b>${fmtN(st.stacks)}</b> Stacks, ${st.machines} ${st.machines === 1 ? "máquina" : "máquinas"} y ${st.status} de estatus: <b>${r.n}</b>.`, `End of round ${st.round}. You have <b>${fmtN(st.stacks)}</b> Stacks, ${st.machines} ${st.machines === 1 ? "machine" : "machines"} and ${st.status} status: <b>${r.n}</b>.`);
    }
    const rollDie = (el, final, done) => {
      const b = el.querySelector("b"); let n = reduce ? 1 : 10;
      el.classList.add("rolling");
      const tick = () => { b.textContent = 1 + Math.floor(Math.random() * 6); if (--n > 0) { timer = setTimeout(tick, 55); return; } b.textContent = final; el.classList.remove("rolling"); done(); };
      tick();
    };
    let busy = false;
    root.addEventListener("click", (e) => {
      const a = e.target.closest("[data-act]"); if (!a || busy) return;
      const act = a.dataset.act;
      if (act === "income") { st.stacks += st.income; say(T(`Tus máquinas pagan ${fmtN(st.income)} Stacks.`, `Your machines pay ${fmtN(st.income)} Stacks.`)); paint(); nextStep(); }
      else if (act === "build") {
        const cost = st.discount ? 6000 : 12000;
        if (st.stacks < cost) { say(T("No te llega. La banca no fía.", "Not enough. The bank gives no credit.")); return; }
        st.stacks -= cost; st.machines += 1; st.income += 2000; st.status += 3; st.discount = false;
        say(T("Fruit Jackpot construida: un hexágono más para tu casino.", "Fruit Jackpot built: one more hexagon for your casino.")); paint(); nextStep();
      } else if (act === "skip") { say(T("Pasas.", "You pass.")); nextStep(300); }
      else if (act === "bet") {
        busy = true; const v = 1 + Math.floor(Math.random() * 6);
        rollDie(g("die"), v, () => {
          busy = false;
          if (v <= 5) { st.stacks += 200; st.status += 1; say(T(`${v}: ganas ×1,1 → +200 Stacks y +1 de estatus.`, `${v}: you win ×1.1 → +200 Stacks and +1 status.`)); }
          else { st.stacks -= 4000; say(T("6: pierdes ×2 → −4.000 Stacks. La casa sonríe.", "6: you lose ×2 → −4,000 Stacks. The house smiles.")); }
          paint(); nextStep(1300);
        });
      } else if (act === "crack") {
        busy = true; const v = 1 + Math.floor(Math.random() * 6), die = $(".jk-phase[data-phase=inspect] .jk-code");
        const fake = document.createElement("div"); fake.className = "jk-die is-mini"; fake.innerHTML = "<b>–</b>"; die.after(fake);
        rollDie(fake, v, () => {
          busy = false; setTimeout(() => fake.remove(), 900);
          if (v === CODE[st.code]) {
            st.code++;
            if (st.code === CODE.length) { st.status += 5; st.stacks += 5000; say(T("¡Trampa desactivada! El rival paga 5.000 y tú subes 5 de estatus.", "Trap disarmed! The rival pays 5,000 and you gain 5 status.")); paint(); nextStep(1300); }
            else { say(T(`${v}: dígito ${st.code} de 3. Sigue.`, `${v}: digit ${st.code} of 3. Keep going.`)); paint(); }
          } else { st.code = 0; say(T(`${v}: fallas el dígito. Tu turno de inspección acaba aquí.`, `${v}: wrong digit. Your inspection ends here.`)); paint(); nextStep(1300); }
        });
      } else if (act === "gamble") {
        busy = true; const v = 1 + Math.floor(Math.random() * 6), die = $(".jk-phase[data-phase=inspect] .jk-code");
        const fake = document.createElement("div"); fake.className = "jk-die is-mini"; fake.innerHTML = "<b>–</b>"; die.after(fake);
        rollDie(fake, v, () => {
          busy = false; setTimeout(() => fake.remove(), 900);
          if (v >= 5) { st.code = CODE.length; st.status += 5; st.stacks += 5000; say(T(`${v}: ¡trampa desactivada de un golpe! +5.000 y +5 de estatus.`, `${v}: trap disarmed in one go! +5,000 and +5 status.`)); }
          else if (v <= 2) { st.stacks -= 3000; say(T(`${v}: te pillan. −3.000 Stacks.`, `${v}: caught. −3,000 Stacks.`)); }
          else say(T(`${v}: ni fu ni fa. La trampa sigue ahí.`, `${v}: nothing happens. The trap is still there.`));
          paint(); nextStep(1500);
        });
      } else if (act === "event") {
        const ev = EVENTS()[Math.floor(Math.random() * EVENTS().length)], card = g("event");
        card.querySelector("b").textContent = ev.n; card.querySelector("span").textContent = ev.t;
        card.classList.add("flip"); ev.fx(st); st.stacks = Math.max(0, st.stacks);
        say(ev.n + ". " + ev.t); paint(); nextStep(2200);
      } else if (act === "again") {
        if (st.round >= 10) Object.assign(st, { stacks: 15000, machines: 1, income: 1000, status: 0, round: 0, discount: false });
        st.round += 1; st.step = 0; st.code = 0; g("event").classList.remove("flip"); g("die").querySelector("b").textContent = "–";
        say(st.round === 1 ? T("Partida nueva. Vuelves a ser Don Nadie.", "New game. You're Nobody again.") : T(`Ronda ${st.round}.`, `Round ${st.round}.`)); paint();
      }
    });
    paint();

    const stop = () => { cancelAnimationFrame(raf); cancelAnimationFrame(spinRaf); clearTimeout(timer); };
    stop.receipt = () => `Stacks ${fmtN(st.stacks)} · ${rankOf(st.status).n}`;
    return stop;
  }

  window.LAYOUTS.jackpot = { render, init };
})();
