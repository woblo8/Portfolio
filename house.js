/* ============================================================
   LA CASA — double or nothing against the croupier.
   A small table that unfolds like an arcade cabinet.

   The rules live in house-engine.js. When the server is there,
   the game is played on it (api/house.js): every roll is made
   server-side, so the weekly ranking can be trusted. Without it
   the same rules run here, and the ranking simply hides.
   ============================================================ */
(() => {
  "use strict";
  const E = window.HouseEngine;
  if (!E) return;
  const store = {
    get(k) { try { return localStorage.getItem(k); } catch (e) { return null; } },
    set(k, v) { try { localStorage.setItem(k, v); } catch (e) { /* private mode */ } },
  };
  const BEST_KEY = "woblo:house-best", NAME_KEY = "woblo:house-name", PLAYER_KEY = "woblo:house-player";
  // who you are, without an account: a random id kept by this browser
  const PLAYER = (() => {
    let p = store.get(PLAYER_KEY);
    if (!/^[a-f0-9]{12}$/.test(p || "")) { const a = new Uint8Array(6); crypto.getRandomValues(a); p = [...a].map((x) => x.toString(16).padStart(2, "0")).join(""); store.set(PLAYER_KEY, p); }
    return p;
  })();
  const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const snd = () => { const s = window.CASINO && window.CASINO.sound; return s && s.on ? s : null; };
  const wait = (ms) => new Promise((r) => setTimeout(r, reduce ? ms * 0.35 : ms));
  const rnd6 = () => { const a = new Uint32Array(1); crypto.getRandomValues(a); return 1 + (a[0] % 6); };
  const API = "/api/house";
  const post = async (body) => {
    const r = await fetch(API, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    const j = await r.json().catch(() => ({}));
    if (!r.ok) { const e = new Error(j.error || `http ${r.status}`); e.status = r.status; throw e; }
    return j;
  };

  /* ---------- the die: a CSS cube with neon pips ---------- */
  const PIPS = { 1: [5], 2: [1, 9], 3: [1, 5, 9], 4: [1, 3, 7, 9], 5: [1, 3, 5, 7, 9], 6: [1, 3, 4, 6, 7, 9] };
  const face = (n, cls) => `<div class="hface ${cls}">${[1, 2, 3, 4, 5, 6, 7, 8, 9].map((c) => `<i${PIPS[n].includes(c) ? ' class="on"' : ""}></i>`).join("")}</div>`;
  const FRONT = { 1: [0, 0], 2: [-90, 0], 3: [0, -90], 4: [0, 90], 5: [90, 0], 6: [0, 180] };

  const btn = document.createElement("button");
  btn.type = "button";
  btn.className = "house-open";
  btn.setAttribute("aria-haspopup", "dialog");
  btn.innerHTML = `<i></i><span>${T("La casa", "The house")}</span><b>♠</b>`;

  const root = document.createElement("div");
  root.className = "house";
  root.setAttribute("role", "dialog");
  root.setAttribute("aria-modal", "true");
  root.setAttribute("aria-hidden", "true");
  root.setAttribute("aria-label", T("La casa: doble o nada", "The house: double or nothing"));
  root.innerHTML = `
    <div class="house-machine">
      <div class="house-scan" aria-hidden="true"></div>
      <header class="house-top">
        <div>
          <span class="house-k">${T("Mesa de la casa", "The house table")}</span>
          <h2>${T("Doble o nada", "Double or nothing")}</h2>
        </div>
        <div class="house-top-r">
          <button type="button" class="house-tab" data-view="board">${T("Ranking", "Ranking")}</button>
          <button type="button" class="house-x" aria-label="${T("Cerrar", "Close")}">✕</button>
        </div>
      </header>
      <div class="house-score">
        <div class="is-chips"><small>${T("Fichas", "Chips")}</small><b data-k="chips">${E.START}</b><span class="house-delta" data-k="delta"></span></div>
        <div><small>${T("Récord", "Best")}</small><b data-k="best">${E.START}</b></div>
        <div><small>${T("Mano", "Hand")}</small><b data-k="hand">1</b></div>
      </div>
      <section class="house-play">
        <div class="house-felt">
          <svg class="house-print" viewBox="0 0 400 120" preserveAspectRatio="none" aria-hidden="true"><path id="housePrintArc" d="M40 104 Q200 70 360 104" fill="none"/><text><textPath href="#housePrintArc" startOffset="50%" text-anchor="middle">${T("LA CASA PAGA 1 A 1 · DOBLE O NADA DE 4 A 6", "THE HOUSE PAYS 1 TO 1 · DOUBLE OR NOTHING ON 4 TO 6")}</textPath></text></svg>
          <div class="house-fx" aria-hidden="true"></div>
          <div class="house-lane" data-who="you">
            <small>${T("Tú", "You")}</small><b data-k="you">0</b><ol data-k="yourRolls"></ol>
          </div>
          <div class="house-stage">
            <div class="hdie" aria-hidden="true">
              ${face(1, "f1")}${face(6, "f6")}${face(3, "f3")}${face(4, "f4")}${face(2, "f2")}${face(5, "f5")}
            </div>
            <span class="house-bet" data-k="bet"></span>
          </div>
          <div class="house-lane" data-who="house">
            <small>${T("La casa", "The house")}</small><b data-k="house">—</b><ol data-k="houseRolls"></ol>
          </div>
        </div>
        <p class="house-say" aria-live="polite"></p>
        <p class="house-streak"></p>
        <div class="house-bets" role="group" aria-label="${T("Apuesta", "Bet")}">
          <button type="button" data-bet="10">10</button>
          <button type="button" data-bet="25">25</button>
          <button type="button" data-bet="50">50</button>
          <button type="button" data-bet="all">${T("Todo", "All in")}</button>
        </div>
        <div class="house-actions"></div>
        <form class="house-sign" hidden>
          <label for="houseName">${T("Tus iniciales para el ranking", "Your initials for the ranking")}</label>
          <div class="house-sign-row">
            <input id="houseName" maxlength="3" autocomplete="off" autocapitalize="characters" spellcheck="false" placeholder="AAA" aria-describedby="houseSignNote">
            <button type="submit" class="is-main">${T("Apuntar", "Sign")}</button>
          </div>
          <small id="houseSignNote"></small>
        </form>
        <p class="house-cashout"><button type="button" data-a="cashout">${T("Retirarme y apuntar mi marca", "Cash out and sign my score")}</button></p>
        <details class="house-rules">
          <summary><span>${T("Cómo se juega", "How to play")}</span><em>${T("30 segundos", "30 seconds")}</em></summary>
          <ol class="hr-steps">
            <li><b>01</b><div><strong>${T("Apuesta", "Bet")}</strong><p>${T("Elige una ficha: 10, 25, 50 o todo.", "Pick a chip: 10, 25, 50 or all in.")}</p></div></li>
            <li><b>02</b><div><strong>${T("Tira y suma", "Roll and add up")}</strong><p>${T("Cada dado suma a tu mano. Plántate cuando quieras.", "Every die adds to your hand. Stand whenever you like.")}</p>
              <p class="hr-row"><i class="hr-d is-bad">1</i><span>${T("pierdes la apuesta", "you lose the bet")}</span></p></div></li>
            <li><b>03</b><div><strong>${T("Juega la casa", "The house plays")}</strong><p>${T("Tira hasta superar tu mano.", "It rolls until it beats your hand.")}</p>
              <p class="hr-row"><i class="hr-d">1</i><span>${T("la casa se pasa: ganas tu apuesta", "the house busts: you win your bet")}</span></p></div></li>
            <li><b>04</b><div><strong>${T("¿Doble o nada?", "Double or nothing?")}</strong><p>${T("Si ganas, arriesga lo ganado a una tirada, o cobra.", "When you win, risk it on one roll, or collect.")}</p>
              <p class="hr-row"><i class="hr-d">4</i><i class="hr-d">5</i><i class="hr-d">6</i><span>${T("doblas", "doubled")}</span></p>
              <p class="hr-row"><i class="hr-d is-bad">1</i><i class="hr-d is-bad">2</i><i class="hr-d is-bad">3</i><span>${T("lo pierdes", "lost")}</span></p></div></li>
          </ol>
          <p class="hr-goal"><span>${T("Tu marca", "Your score")}</span>${T("El máximo de fichas que llegues a tener. Empiezas con 100.", "The most chips you ever hold. You start with 100.")}</p>
        </details>
      </section>
      <section class="house-board" hidden>
        <div class="house-me" data-k="me" hidden></div>
        <div class="house-board-head">
          <span class="house-k">${T("Esta semana", "This week")}</span>
          <span class="house-k" data-k="allBest"></span>
        </div>
        <ol data-k="week"></ol>
        <p class="house-board-note" data-k="boardNote"></p>
      </section>
    </div>`;
  document.body.append(btn, root);

  const $ = (q) => root.querySelector(q);
  const k = (name) => root.querySelector(`[data-k="${name}"]`);
  const die = $(".hdie"), say = $(".house-say"), actions = $(".house-actions");
  const sign = $(".house-sign"), nameIn = $("#houseName"), signNote = $("#houseSignNote");
  const betBtns = [...root.querySelectorAll("[data-bet]")];

  if (!store.get(BEST_KEY)) $(".house-rules").open = true;
  /* ---------- state ---------- */
  const G = {
    mode: null,           // "remote" (server, ranked) or "local"
    id: null, s: E.newGame(), betKey: "10", busy: false, signed: false, myRank: null,
    localBest: Math.max(E.START, +(store.get(BEST_KEY) || 0)),
  };
  let rot = { x: 0, y: 0 };

  const LINES = {
    welcome: () => T("Bienvenido a la casa. Elige tu apuesta y tira.", "Welcome to the house. Choose your bet and roll."),
    bust: (b) => pick(T([`Un uno. La casa se lleva ${b}.`, `El uno maldito. Adiós a ${b}.`, `Uno. La casa sonríe y se lleva ${b}.`], [`A one. The house takes ${b}.`, `The cursed one. Goodbye, ${b}.`, `One. The house smiles and takes ${b}.`])),
    more: () => pick(T(["¿Otra, o te plantas?", "La mano sigue viva. ¿Otra?", "Bien. ¿Tientas a la suerte otra vez?"], ["Another, or do you stand?", "The hand is still alive. Another?", "Nice. Tempt fate once more?"])),
    bold: () => T("Eso ya es mucho riesgo… o mucha fe.", "That's a lot of nerve… or faith."),
    houseBust: (b) => pick(T([`¡Un uno para la casa! Ganas ${b}.`, `¡La casa se pasa! +${b} para ti.`, `La banca rompe. Cobras ${b}.`], [`A one for the house! You win ${b}.`, `The house busts! +${b} for you.`, `The bank breaks. You take ${b}.`])),
    houseWins: (h, b) => T(`La casa hace ${h}. Se lleva ${b}.`, `The house makes ${h}. It takes ${b}.`),
    doubled: (v, b) => T(`Un ${v}. Doblas: +${b}.`, `A ${v}. Doubled: +${b}.`),
    lostDouble: (v, b) => T(`Un ${v}. La casa recupera ${b}.`, `A ${v}. The house wins back ${b}.`),
    collect: () => T("Sabia decisión. La casa respeta a quien se levanta a tiempo.", "Wise. The house respects those who know when to stop."),
    stand: (y) => T(`Te plantas con ${y}. Juega la casa.`, `You stand on ${y}. The house plays.`),
    over: (b) => T(`Sin fichas. Tu récord: ${b}.`, `Out of chips. Your best: ${b}.`),
    double: () => T("Doble o nada. Una sola tirada…", "Double or nothing. One roll…"),
    offline: () => T("Sin conexión con la casa: jugamos aquí, sin ranking.", "The house is offline: we play here, unranked."),
  };
  const pick = (l) => l[Math.floor(Math.random() * l.length)];
  function speak(text) { say.textContent = text; say.classList.remove("on"); void say.offsetWidth; say.classList.add("on"); }
  function pip(list, v, bust) { const li = document.createElement("li"); li.textContent = v; if (bust) li.className = "bust"; list.appendChild(li); }
  const best = () => Math.max(G.s.best, G.localBest);

  function render() {
    const s = G.s;
    k("chips").textContent = s.chips;
    k("best").textContent = best();
    k("hand").textContent = s.hand;
    k("you").textContent = s.you;
    k("house").textContent = s.house ? s.house : "—";
    k("bet").textContent = s.phase === "bet" || s.phase === "over" ? "" : `${T("Apuesta", "Bet")} ${s.bet}`;
    betBtns.forEach((b) => {
      b.classList.toggle("is-on", b.dataset.bet === G.betKey);
      b.disabled = s.phase !== "bet" || G.busy || (b.dataset.bet !== "all" && +b.dataset.bet > s.chips);
    });
    const A = {
      bet: [["roll", T("Tirar", "Roll"), true]],
      turn: [["roll", T("Tirar otra", "Roll again"), true], ["stand", T("Plantarse", "Stand"), false]],
      won: [["double", T("Doble o nada", "Double or nothing"), true], ["collect", T("Cobrar", "Collect"), false]],
      over: [["again", T("Otra partida", "Play again"), !canSign()]],
    }[s.phase] || [];
    actions.innerHTML = A.map(([a, label, main]) => `<button type="button" data-a="${a}" class="${main ? "is-main" : ""}"${G.busy ? " disabled" : ""}>${label}</button>`).join("");
    sign.hidden = !(s.phase === "over" && canSign());
    $(".house-cashout").hidden = !(G.mode === "remote" && s.phase === "bet" && s.hand > 1 && !G.signed);
    $(".house-tab").hidden = G.mode !== "remote";
  }
  const canSign = () => G.mode === "remote" && !G.signed && G.s.best > E.START - 1 && G.s.hand > 1;

  /* ---------- the roll: a tumble that lands on the value ---------- */
  async function show(v) {
    const [fx, fy] = FRONT[v];
    const turnsX = 2 + Math.floor(Math.random() * 2), turnsY = 1 + Math.floor(Math.random() * 2);
    rot = { x: Math.ceil(rot.x / 360) * 360 + turnsX * 360 + fx, y: Math.ceil(rot.y / 360) * 360 + turnsY * 360 + fy };
    die.classList.remove("landed");
    die.style.transform = `rotateX(${rot.x}deg) rotateY(${rot.y}deg)`;
    await wait(780);
    die.classList.add("landed");
    const s = snd(); if (s) s.thud(v === 1 ? 1 : 0.6);
  }

  /* ---------- a game: on the server if it is there, here if not ---------- */
  async function newGame() {
    G.signed = false; G.myRank = null; G.betKey = "10";
    k("yourRolls").innerHTML = ""; k("houseRolls").innerHTML = "";
    try {
      const j = await post({ op: "start" });
      G.mode = "remote"; G.id = j.id; G.s = j.s;
      fetchBoard().then((b) => paintMe(b.me)).catch(() => {});
    } catch (e) {
      G.mode = "local"; G.id = null; G.s = E.newGame();
      if (e.status !== 503) speak(LINES.offline());
    }
  }
  async function step(a) {
    if (G.mode === "remote") {
      const j = await post({ op: "act", id: G.id, a, bet: G.betKey });
      if (j.id) G.id = j.id;
      return { s: j.s, ev: j.ev, say: j.say };
    }
    return E.step(G.s, a, { bet: G.betKey }, rnd6);
  }

  let countFrom = null;
  async function act(a) {
    if (G.busy) return;
    countFrom = null;
    if (a === "again") { streak = 0; showStreak(); G.busy = true; render(); await newGame(); G.busy = false; speak(T("Fichas nuevas. Hagan juego.", "Fresh chips. Place your bets.")); render(); return; }
    if (a === "cashout") { G.s = Object.assign({}, G.s, { phase: "over" }); render(); nameIn.focus(); return; }
    G.busy = true; render();
    try {
      const startingHand = G.s.phase === "bet";
      if (startingHand) { k("yourRolls").innerHTML = ""; k("houseRolls").innerHTML = ""; const s = snd(); if (s) s.chip(0.8); }
      if (a === "stand") speak(LINES.stand(G.s.you));
      if (a === "double") speak(LINES.double());
      const out = await step(a);
      // play the rolls back one by one, the totals growing as they land
      let you = startingHand ? 0 : G.s.you, house = 0;
      for (const [who, v] of out.ev) {
        if (who === "house") await wait(380);
        await show(v);
        if (who === "you") { pip(k("yourRolls"), v, v === 1); if (v !== 1) you += v; k("you").textContent = you; }
        if (who === "house") { pip(k("houseRolls"), v, v === 1); if (v !== 1) house += v; k("house").textContent = house || "—"; }
      }
      const before = G.s.chips;
      G.s = out.s;
      if (G.mode === "local") { G.s.you = you; G.s.house = house; }
      const won = G.s.chips - before;
      if (won) { delta(won); countFrom = before; }
      if (won > 0) { streak += 1; burst((out.say || [])[0] === "doubled" || won >= 100); }
      else if (won < 0) { streak = 0; shake(); }
      showStreak();
      if (best() > G.localBest) { G.localBest = best(); store.set(BEST_KEY, String(G.localBest)); flashBest(); }
      const [key, ...args] = out.say || [];
      if (key && LINES[key]) speak(LINES[key](...args));
      if (G.s.phase === "over") speak(LINES.over(best()) + (canSign() ? " " + T("Apunta tus iniciales.", "Sign with your initials.") : ""));
      if (key === "houseBust" || key === "doubled") { const s = snd(); if (s) { s.chip(1); setTimeout(() => s.chip(0.7), 120); } }
      if (G.betKey !== "all" && +G.betKey > G.s.chips) G.betKey = "all";
    } catch (e) {
      speak(e.status === 429 ? T("La casa necesita un respiro. Vuelve en un rato.", "The house needs a breather. Come back in a while.")
        : T("Algo se ha caído de la mesa. Vuelve a intentarlo.", "Something fell off the table. Try again."));
    } finally {
      G.busy = false; render();
      if (countFrom != null) countTo(countFrom, G.s.chips);
      if (!sign.hidden) setTimeout(() => nameIn.focus({ preventScroll: true }), 200);
    }
  }
  let streak = 0;
  function countTo(from, to) {
    const el = k("chips"); if (from === to || reduce) { el.textContent = to; return; }
    const t0 = performance.now(), d = 650;
    const tick = (t) => { const p = Math.min(1, (t - t0) / d), e = 1 - Math.pow(1 - p, 3); el.textContent = Math.round(from + (to - from) * e); if (p < 1) requestAnimationFrame(tick); };
    requestAnimationFrame(tick);
  }
  function delta(n) {
    const el = k("delta"); el.textContent = (n > 0 ? "+" : "−") + Math.abs(n);
    el.className = "house-delta " + (n > 0 ? "is-up" : "is-down"); void el.offsetWidth; el.classList.add("on");
  }
  function burst(big) {
    const f = $(".house-felt"); f.classList.remove("is-win"); void f.offsetWidth; f.classList.add("is-win");
    if (reduce) return;
    const fx = $(".house-fx"), n = big ? 22 : 14;
    for (let i = 0; i < n; i++) {
      const c = document.createElement("i"), ang = (Math.PI * 2 * i) / n + Math.random() * 0.5, r = 70 + Math.random() * 90;
      c.style.setProperty("--x", Math.cos(ang) * r + "px"); c.style.setProperty("--y", Math.sin(ang) * r * 0.6 - 30 + "px");
      c.style.setProperty("--r", (Math.random() * 720 - 360) + "deg"); c.style.animationDelay = Math.random() * 80 + "ms";
      fx.appendChild(c); setTimeout(() => c.remove(), 1300);
    }
  }
  function shake() { const f = $(".house-felt"); f.classList.remove("is-bust"); void f.offsetWidth; f.classList.add("is-bust"); }
  function showStreak() {
    const el = $(".house-streak");
    if (streak >= 2) el.textContent = T(`Racha × ${streak}`, `Streak × ${streak}`);
    el.classList.toggle("on", streak >= 2); el.classList.toggle("is-hot", streak >= 4);
  }
  function flashBest() { const c = k("best").parentElement; c.classList.add("flash"); setTimeout(() => c.classList.remove("flash"), 900); }

  /* ---------- the ranking ---------- */
  nameIn.value = store.get(NAME_KEY) || "";
  nameIn.addEventListener("input", () => { nameIn.value = nameIn.value.toUpperCase().normalize("NFD").replace(/[^A-Z]/g, "").slice(0, 3); });
  sign.addEventListener("submit", async (e) => {
    e.preventDefault();
    const name = nameIn.value;
    if (!/^[A-Z]{3}$/.test(name)) { signNote.textContent = T("Tres letras, como en las recreativas.", "Three letters, arcade style."); return; }
    signNote.textContent = "…";
    try {
      const j = await post({ op: "submit", id: G.id, name, p: PLAYER });
      G.signed = true; G.myRank = j.rank; G.s = j.s; store.set(NAME_KEY, name);
      signNote.textContent = "";
      speak(j.rank ? T(`${name}: ${j.score} fichas. Puesto ${j.rank} de la semana.`, `${name}: ${j.score} chips. Number ${j.rank} this week.`) : T("Apuntado.", "Signed."));
      render();
      openBoard(name);
    } catch (err) {
      signNote.textContent = { "blocked-name": T("Esas iniciales no. Prueba otras.", "Not those initials. Try others."), "too-short": T("Juega alguna mano más antes de apuntarte.", "Play a few more hands first."), already: T("Esta partida ya está apuntada.", "This game is already signed.") }[err.message]
        || T("No se ha podido apuntar. Inténtalo otra vez.", "Couldn't sign it. Try again.");
    }
  });
  async function openBoard(mine) {
    $(".house-play").hidden = true; $(".house-board").hidden = false;
    $(".house-tab").textContent = T("Volver a la mesa", "Back to the table");
    const list = k("week");
    list.innerHTML = `<li class="is-empty">…</li>`;
    try {
      const j = await fetchBoard(!!mine);
      const rows = j.week || [], me = (j.me && j.me.week) || null;
      const row = (x, rank, cls) => `<li class="${cls}"><span>${String(rank).padStart(2, "0")}</span><b>${x.name}</b>${cls.includes("is-me") ? `<i>${T("tú", "you")}</i>` : ""}<em>${x.score}</em></li>`;
      let html = rows.map((x, i) => row(x, i + 1, x.me && me && i + 1 === me.rank ? "is-me" : x.me ? "is-mine" : "")).join("");
      // outside the top ten, your row still shows, under a gap
      if (me && me.rank > rows.length) html += `<li class="is-gap" aria-hidden="true">· · ·</li>` + row(me, me.rank, "is-me");
      list.innerHTML = html || `<li class="is-empty">${T("Nadie todavía. La mesa es tuya.", "Nobody yet. The table is yours.")}</li>`;
      paintMe(j.me);
      const top = (j.all || [])[0];
      k("allBest").textContent = top ? T(`Récord absoluto: ${top.name} · ${top.score}`, `All-time: ${top.name} · ${top.score}`) : "";
      k("boardNote").textContent = T("Se reinicia cada lunes. Las tiradas se hacen en el servidor: aquí no se hace trampa.", "Resets every Monday. Rolls are made on the server: no cheating here.");
    } catch (e) {
      list.innerHTML = `<li class="is-empty">${T("El ranking no responde ahora mismo.", "The ranking isn't answering right now.")}</li>`;
    }
  }
  async function fetchBoard(fresh) {
    const r = await fetch(`${API}?p=${PLAYER}${fresh ? "&fresh=1" : ""}`, { cache: "no-store" });
    return r.json();
  }
  // your initials, your best and your place: on the board, and on the tab that opens it
  function paintMe(me) {
    const el = k("me"), w = me && me.week, a = me && me.all, name = (w || a || {}).name || store.get(NAME_KEY);
    if (!w && !a) {
      el.hidden = false;
      el.innerHTML = `<span class="house-k">${T("Tú", "You")}</span><b>${name || "———"}</b><small>${T("Aún sin marca. Juega una mano y apúntate.", "No score yet. Play a hand and sign.")}</small>`;
      G.meTab = ""; return closeTabLabel();
    }
    el.hidden = false;
    el.innerHTML = `<span class="house-k">${T("Tú", "You")}</span><b>${name}</b>
      <div><small>${T("Esta semana", "This week")}</small><em>${w ? `#${w.rank} · ${w.score}` : "—"}</em></div>
      <div><small>${T("Histórico", "All time")}</small><em>${a ? `#${a.rank} · ${a.score}` : "—"}</em></div>`;
    G.meTab = w ? `${name} #${w.rank}` : name;
    closeTabLabel();
  }
  function closeTabLabel() {
    if ($(".house-board").hidden) $(".house-tab").innerHTML = G.meTab ? `${T("Ranking", "Ranking")} <b>${G.meTab}</b>` : T("Ranking", "Ranking");
  }
  function closeBoard() {
    $(".house-play").hidden = false; $(".house-board").hidden = true;
    closeTabLabel();
  }

  /* ---------- open and close: the cabinet unfolds ---------- */
  let lastFocus = null;
  async function open() {
    lastFocus = document.activeElement;
    root.classList.add("on"); root.setAttribute("aria-hidden", "false");
    document.documentElement.classList.add("house-open-now");
    { const s = snd(); if (s) s.chip(0.6); }
    if (!G.mode) {
      G.busy = true; render();
      await newGame();
      G.busy = false;
      if (!say.textContent) speak(LINES.welcome());
    }
    render();
    setTimeout(() => { const m = actions.querySelector(".is-main"); if (m) m.focus({ preventScroll: true }); }, 450);
  }
  function close() {
    root.classList.remove("on"); root.setAttribute("aria-hidden", "true");
    document.documentElement.classList.remove("house-open-now");
    if (lastFocus && lastFocus.focus) lastFocus.focus({ preventScroll: true });
  }
  btn.addEventListener("click", open);
  root.addEventListener("click", (e) => {
    if (e.target === root || e.target.closest(".house-x")) return close();
    if (e.target.closest(".house-tab")) return $(".house-board").hidden ? openBoard() : closeBoard();
    const b = e.target.closest("[data-bet]");
    if (b && !b.disabled) { G.betKey = b.dataset.bet; render(); const s = snd(); if (s) s.chip(0.5); return; }
    const a = e.target.closest("[data-a]");
    if (a && !a.disabled) act(a.dataset.a);
  });
  addEventListener("keydown", (e) => { if (root.classList.contains("on") && e.key === "Escape") close(); });
  // only on the main view: hidden while a page (project, about, the private table) is open
  const page = document.getElementById("page");
  const sync = () => btn.classList.toggle("is-away", !!(page && page.classList.contains("open")));
  if (page) new MutationObserver(sync).observe(page, { attributes: true, attributeFilter: ["class"] });
  sync();
  render();
})();
