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
  const BEST_KEY = "woblo:house-best", NAME_KEY = "woblo:house-name";
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
        <div><small>${T("Fichas", "Chips")}</small><b data-k="chips">${E.START}</b></div>
        <div><small>${T("Récord", "Best")}</small><b data-k="best">${E.START}</b></div>
        <div><small>${T("Mano", "Hand")}</small><b data-k="hand">1</b></div>
      </div>
      <section class="house-play">
        <div class="house-felt">
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
          <summary>${T("Reglas", "Rules")}</summary>
          <ul>
            <li>${T("Apuestas antes de cada mano. Cada tirada suma a tu mano.", "Bet before each hand. Every roll adds to your hand.")}</li>
            <li>${T("Un 1 y pierdes la mano. Plántate cuando quieras.", "A 1 and the hand is lost. Stand whenever you like.")}</li>
            <li>${T("La casa tira hasta superarte. Si le sale un 1, ganas tú.", "The house rolls until it beats you. A 1 and you win.")}</li>
            <li>${T("Ganas 1 a 1. Luego, doble o nada: 4–6 dobla, 1–3 lo pierde.", "Wins pay 1:1. Then double or nothing: 4–6 doubles, 1–3 loses it.")}</li>
            <li>${T("Tu marca es el máximo de fichas que llegues a tener. Las tiradas se hacen en el servidor.", "Your score is the most chips you ever hold. The rolls are made on the server.")}</li>
          </ul>
        </details>
      </section>
      <section class="house-board" hidden>
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

  /* ---------- state ---------- */
  const G = {
    mode: null,           // "remote" (server, ranked) or "local"
    id: null, s: E.newGame(), betKey: "10", busy: false, signed: false, myRank: null,
    localBest: Math.max(E.START, +(store.get(BEST_KEY) || 0)),
  };
  let rot = { x: 0, y: 0 };

  const LINES = {
    welcome: () => T("Bienvenido a la casa. Elige tu apuesta y tira.", "Welcome to the house. Choose your bet and roll."),
    bust: (b) => T(`Un uno. La casa se lleva ${b}.`, `A one. The house takes ${b}.`),
    more: () => T("¿Otra, o te plantas?", "Another, or do you stand?"),
    bold: () => T("Eso ya es mucho riesgo… o mucha fe.", "That's a lot of nerve… or faith."),
    houseBust: (b) => T(`¡Un uno para la casa! Ganas ${b}.`, `A one for the house! You win ${b}.`),
    houseWins: (h, b) => T(`La casa hace ${h}. Se lleva ${b}.`, `The house makes ${h}. It takes ${b}.`),
    doubled: (v, b) => T(`Un ${v}. Doblas: +${b}.`, `A ${v}. Doubled: +${b}.`),
    lostDouble: (v, b) => T(`Un ${v}. La casa recupera ${b}.`, `A ${v}. The house wins back ${b}.`),
    collect: () => T("Sabia decisión. La casa respeta a quien se levanta a tiempo.", "Wise. The house respects those who know when to stop."),
    stand: (y) => T(`Te plantas con ${y}. Juega la casa.`, `You stand on ${y}. The house plays.`),
    over: (b) => T(`Sin fichas. Tu récord: ${b}.`, `Out of chips. Your best: ${b}.`),
    double: () => T("Doble o nada. Una sola tirada…", "Double or nothing. One roll…"),
    offline: () => T("Sin conexión con la casa: jugamos aquí, sin ranking.", "The house is offline: we play here, unranked."),
  };
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
    } catch (e) {
      G.mode = "local"; G.id = null; G.s = E.newGame();
      if (e.status !== 503) speak(LINES.offline());
    }
  }
  async function step(a) {
    if (G.mode === "remote") {
      const j = await post({ op: "act", id: G.id, a, bet: G.betKey });
      return { s: j.s, ev: j.ev, say: j.say };
    }
    return E.step(G.s, a, { bet: G.betKey }, rnd6);
  }

  async function act(a) {
    if (G.busy) return;
    if (a === "again") { G.busy = true; render(); await newGame(); G.busy = false; speak(T("Fichas nuevas. Hagan juego.", "Fresh chips. Place your bets.")); render(); return; }
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
      G.s = out.s;
      if (G.mode === "local") { G.s.you = you; G.s.house = house; }
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
      if (!sign.hidden) setTimeout(() => nameIn.focus({ preventScroll: true }), 200);
    }
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
      const j = await post({ op: "submit", id: G.id, name });
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
      const r = await fetch(API, { cache: "no-store" });
      const j = await r.json();
      const rows = j.week || [];
      list.innerHTML = rows.length
        ? rows.map((x, i) => `<li class="${mine && x.name === mine && i + 1 === G.myRank ? "is-me" : ""}"><span>${String(i + 1).padStart(2, "0")}</span><b>${x.name}</b><em>${x.score}</em></li>`).join("")
        : `<li class="is-empty">${T("Nadie todavía. La mesa es tuya.", "Nobody yet. The table is yours.")}</li>`;
      const top = (j.all || [])[0];
      k("allBest").textContent = top ? T(`Récord absoluto: ${top.name} · ${top.score}`, `All-time: ${top.name} · ${top.score}`) : "";
      k("boardNote").textContent = T("Se reinicia cada lunes. Las tiradas se hacen en el servidor: aquí no se hace trampa.", "Resets every Monday. Rolls are made on the server: no cheating here.");
    } catch (e) {
      list.innerHTML = `<li class="is-empty">${T("El ranking no responde ahora mismo.", "The ranking isn't answering right now.")}</li>`;
    }
  }
  function closeBoard() {
    $(".house-play").hidden = false; $(".house-board").hidden = true;
    $(".house-tab").textContent = T("Ranking", "Ranking");
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
