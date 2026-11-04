/* ============================================================
   LA CASA — double or nothing against the croupier.
   A small table that unfolds like an arcade cabinet.

   Rules
   · You start with 100 chips and bet before each hand.
   · Your turn: every roll adds to your hand. A 1 and the hand
     is lost (and the bet with it). Stand whenever you like.
   · The house then rolls until it beats your total; a 1 and
     the house loses.
   · A win pays 1:1, then you may go double or nothing on one
     roll: 4–6 doubles the winnings, 1–3 loses them.
   · Your score is the most chips you ever held.
   ============================================================ */
(() => {
  "use strict";
  const store = {
    get(k) { try { return localStorage.getItem(k); } catch (e) { return null; } },
    set(k, v) { try { localStorage.setItem(k, v); } catch (e) { /* private mode */ } },
  };
  const BEST_KEY = "woblo:house-best";
  const START = 100;
  const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const snd = () => (window.CASINO && window.CASINO.sound) || null;
  const rnd6 = () => {
    const a = new Uint32Array(1);
    (window.crypto || window.msCrypto).getRandomValues(a);
    return 1 + (a[0] % 6);
  };
  const wait = (ms) => new Promise((r) => setTimeout(r, reduce ? ms * 0.35 : ms));

  /* ---------- the die: a CSS cube with neon pips ---------- */
  const PIPS = { 1: [5], 2: [1, 9], 3: [1, 5, 9], 4: [1, 3, 7, 9], 5: [1, 3, 5, 7, 9], 6: [1, 3, 4, 6, 7, 9] };
  const face = (n, cls) => `<div class="hface ${cls}">${[1, 2, 3, 4, 5, 6, 7, 8, 9].map((c) => `<i${PIPS[n].includes(c) ? ' class="on"' : ""}></i>`).join("")}</div>`;
  // which rotation brings each value to the front
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
        <button type="button" class="house-x" aria-label="${T("Cerrar", "Close")}">✕</button>
      </header>
      <div class="house-score">
        <div><small>${T("Fichas", "Chips")}</small><b data-k="chips">${START}</b></div>
        <div><small>${T("Récord", "Best")}</small><b data-k="best">${START}</b></div>
        <div><small>${T("Mano", "Hand")}</small><b data-k="hand">1</b></div>
      </div>
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
      <details class="house-rules">
        <summary>${T("Reglas", "Rules")}</summary>
        <ul>
          <li>${T("Apuestas antes de cada mano. Cada tirada suma a tu mano.", "Bet before each hand. Every roll adds to your hand.")}</li>
          <li>${T("Un 1 y pierdes la mano. Plántate cuando quieras.", "A 1 and the hand is lost. Stand whenever you like.")}</li>
          <li>${T("La casa tira hasta superarte. Si le sale un 1, gana tú.", "The house rolls until it beats you. A 1 and you win.")}</li>
          <li>${T("Ganas 1 a 1. Luego, doble o nada: 4–6 dobla, 1–3 lo pierde.", "Wins pay 1:1. Then double or nothing: 4–6 doubles, 1–3 loses it.")}</li>
          <li>${T("Tu marca es el máximo de fichas que llegues a tener.", "Your score is the most chips you ever hold.")}</li>
        </ul>
      </details>
    </div>`;
  document.body.append(btn, root);

  const $ = (q) => root.querySelector(q);
  const k = (name) => root.querySelector(`[data-k="${name}"]`);
  const die = $(".hdie"), say = $(".house-say"), actions = $(".house-actions");
  const betBtns = [...root.querySelectorAll("[data-bet]")];

  /* ---------- state ---------- */
  const G = { chips: START, best: Math.max(START, +(store.get(BEST_KEY) || 0)), hand: 1, bet: 10, betKey: "10",
    you: 0, house: 0, phase: "bet", busy: false };
  let rot = { x: 0, y: 0 };

  function speak(text) { say.textContent = text; say.classList.remove("on"); void say.offsetWidth; say.classList.add("on"); }
  function pip(list, v, bust) { const li = document.createElement("li"); li.textContent = v; if (bust) li.className = "bust"; list.appendChild(li); }
  function betAmount() { return G.betKey === "all" ? G.chips : Math.min(G.chips, +G.betKey); }
  function render() {
    k("chips").textContent = G.chips;
    k("best").textContent = G.best;
    k("hand").textContent = G.hand;
    k("you").textContent = G.you;
    k("house").textContent = G.phase === "house" || G.house ? G.house : "—";
    k("bet").textContent = G.phase === "bet" ? "" : `${T("Apuesta", "Bet")} ${G.bet}`;
    betBtns.forEach((b) => {
      b.classList.toggle("is-on", b.dataset.bet === G.betKey);
      b.disabled = G.phase !== "bet" || G.busy || (b.dataset.bet !== "all" && +b.dataset.bet > G.chips);
    });
    const A = {
      bet: [["roll", T("Tirar", "Roll"), true]],
      turn: [["roll", T("Tirar otra", "Roll again"), true], ["stand", T("Plantarse", "Stand"), false]],
      won: [["double", T("Doble o nada", "Double or nothing"), true], ["collect", T("Cobrar", "Collect"), false]],
      over: [["again", T("Otra partida", "Play again"), true]],
    }[G.phase] || [];
    actions.innerHTML = A.map(([a, label, main]) => `<button type="button" data-a="${a}" class="${main ? "is-main" : ""}"${G.busy ? " disabled" : ""}>${label}</button>`).join("");
  }
  function setBest() {
    if (G.chips > G.best) { G.best = G.chips; store.set(BEST_KEY, String(G.best)); k("best").parentElement.classList.add("flash"); setTimeout(() => k("best").parentElement.classList.remove("flash"), 900); }
  }

  /* ---------- the roll: a tumble that lands on the value ---------- */
  async function roll() {
    const v = rnd6(), [fx, fy] = FRONT[v];
    // always tumble forward, a couple of full turns more than last time
    const turnsX = 2 + Math.floor(Math.random() * 2), turnsY = 1 + Math.floor(Math.random() * 2);
    const baseX = Math.ceil(rot.x / 360) * 360 + turnsX * 360, baseY = Math.ceil(rot.y / 360) * 360 + turnsY * 360;
    rot = { x: baseX + fx, y: baseY + fy };
    die.classList.remove("landed");
    die.style.transform = `rotateX(${rot.x}deg) rotateY(${rot.y}deg)`;
    await wait(780);
    die.classList.add("landed");
    const s = snd(); if (s && s.on) s.thud(v === 1 ? 1 : 0.6);
    return v;
  }

  /* ---------- the game ---------- */
  async function act(a) {
    if (G.busy) return;
    G.busy = true; render();
    try {
      if (a === "roll") {
        if (G.phase === "bet") {
          G.bet = betAmount(); G.you = 0; G.house = 0;
          k("yourRolls").innerHTML = ""; k("houseRolls").innerHTML = "";
          const s = snd(); if (s && s.on) s.chip(0.8);
          G.phase = "turn";
        }
        const v = await roll();
        if (v === 1) {
          pip(k("yourRolls"), v, true);
          G.chips -= G.bet;
          speak(T(`Un uno. La casa se lleva ${G.bet}.`, `A one. The house takes ${G.bet}.`));
          endHand();
        } else {
          G.you += v; pip(k("yourRolls"), v);
          speak(G.you >= 18 ? T("Eso ya es mucho riesgo… o mucha fe.", "That's a lot of nerve… or faith.") : T("¿Otra, o te plantas?", "Another, or do you stand?"));
        }
      } else if (a === "stand") {
        G.phase = "house"; render();
        speak(T(`Te plantas con ${G.you}. Juega la casa.`, `You stand on ${G.you}. The house plays.`));
        await wait(500);
        while (true) {
          const v = await roll();
          if (v === 1) {
            pip(k("houseRolls"), v, true);
            G.chips += G.bet; setBest();
            speak(T(`¡Un uno para la casa! Ganas ${G.bet}.`, `A one for the house! You win ${G.bet}.`));
            const s = snd(); if (s && s.on) { s.chip(1); setTimeout(() => s.chip(0.7), 120); }
            G.phase = "won"; break;
          }
          G.house += v; pip(k("houseRolls"), v); render();
          if (G.house > G.you) {
            G.chips -= G.bet;
            speak(T(`La casa hace ${G.house}. Se lleva ${G.bet}.`, `The house makes ${G.house}. It takes ${G.bet}.`));
            endHand(); break;
          }
          await wait(380);
        }
      } else if (a === "double") {
        speak(T("Doble o nada. Una sola tirada…", "Double or nothing. One roll…"));
        const v = await roll();
        if (v >= 4) {
          G.chips += G.bet; setBest();
          speak(T(`Un ${v}. Doblas: +${G.bet}.`, `A ${v}. Doubled: +${G.bet}.`));
          const s = snd(); if (s && s.on) { s.chip(1); setTimeout(() => s.chip(0.8), 110); setTimeout(() => s.chip(0.6), 220); }
          G.bet *= 2; G.phase = "won"; // and again, if you dare
        } else {
          G.chips -= G.bet;
          speak(T(`Un ${v}. La casa recupera ${G.bet}.`, `A ${v}. The house wins back ${G.bet}.`));
          endHand();
        }
      } else if (a === "collect") {
        speak(T("Sabia decisión. La casa respeta a quien se levanta a tiempo.", "Wise. The house respects those who know when to stop."));
        endHand();
      } else if (a === "again") {
        Object.assign(G, { chips: START, hand: 1, you: 0, house: 0, phase: "bet", betKey: "10" });
        k("yourRolls").innerHTML = ""; k("houseRolls").innerHTML = "";
        speak(T("Fichas nuevas. Hagan juego.", "Fresh chips. Place your bets."));
      }
    } finally {
      G.busy = false; render();
    }
  }
  function endHand() {
    G.you = G.you; // the totals stay on the table until the next hand
    if (G.chips <= 0) {
      G.chips = 0; G.phase = "over";
      speak(T(`Sin fichas. Tu récord: ${G.best}.`, `Out of chips. Your best: ${G.best}.`));
      return;
    }
    G.hand += 1; G.phase = "bet";
    if (G.betKey !== "all" && +G.betKey > G.chips) G.betKey = "all";
  }

  /* ---------- open and close: the cabinet unfolds ---------- */
  let lastFocus = null;
  function open() {
    lastFocus = document.activeElement;
    root.classList.add("on"); root.setAttribute("aria-hidden", "false");
    document.documentElement.classList.add("house-open-now");
    if (!say.textContent) speak(T("Bienvenido a la casa. Elige tu apuesta y tira.", "Welcome to the house. Choose your bet and roll."));
    render();
    setTimeout(() => { const m = actions.querySelector(".is-main"); if (m) m.focus({ preventScroll: true }); }, 450);
    const s = snd(); if (s && s.on) s.chip(0.6);
  }
  function close() {
    root.classList.remove("on"); root.setAttribute("aria-hidden", "true");
    document.documentElement.classList.remove("house-open-now");
    if (lastFocus && lastFocus.focus) lastFocus.focus({ preventScroll: true });
  }
  btn.addEventListener("click", open);
  root.addEventListener("click", (e) => {
    if (e.target === root || e.target.closest(".house-x")) return close();
    const b = e.target.closest("[data-bet]");
    if (b && !b.disabled) { G.betKey = b.dataset.bet; render(); const s = snd(); if (s && s.on) s.chip(0.5); return; }
    const a = e.target.closest("[data-a]");
    if (a && !a.disabled) act(a.dataset.a);
  });
  addEventListener("keydown", (e) => {
    if (!root.classList.contains("on")) return;
    if (e.key === "Escape") close();
  });
  // only on the main view: hidden while a page (project, about, the private table) is open
  const page = document.getElementById("page");
  const sync = () => btn.classList.toggle("is-away", !!(page && page.classList.contains("open")));
  if (page) new MutationObserver(sync).observe(page, { attributes: true, attributeFilter: ["class"] });
  sync();
  render();
})();
