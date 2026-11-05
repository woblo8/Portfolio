/* ============================================================
   LA CASA — ¿Dónde está el dado? You sit down with 100 chips.
   Every round you bet (10, 25, 50, all of it, or any amount),
   the croupier hides the die under a glass and shuffles; find
   it and the bet is paid by the table (3 glasses ×1, 4 ×2…),
   miss and the house keeps it. One more glass every ten rounds,
   faster every round. The score is the most chips you held.
   Rounds are dealt and checked by the server (/api/house), so
   the ranking holds; without it the same rules run here,
   unranked.
   ============================================================ */
(() => {
  "use strict";
  const E = window.HouseEngine;
  if (!E) return;
  const store = {
    get(k) { try { return localStorage.getItem(k); } catch (e) { return null; } },
    set(k, v) { try { localStorage.setItem(k, v); } catch (e) { /* private mode */ } },
  };
  const BEST_KEY = "woblo:shell2-best", NAME_KEY = "woblo:house-name", PLAYER_KEY = "woblo:house-player";
  const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
  // who you are, without an account: a random id kept by this browser
  const PLAYER = (() => {
    let p = store.get(PLAYER_KEY);
    if (!/^[a-f0-9]{12}$/.test(p || "")) { const a = new Uint8Array(6); crypto.getRandomValues(a); p = [...a].map((x) => x.toString(16).padStart(2, "0")).join(""); store.set(PLAYER_KEY, p); }
    return p;
  })();
  const snd = () => { const s = window.CASINO && window.CASINO.sound; return s && s.on ? s : null; };
  const wait = (ms) => new Promise((r) => setTimeout(r, ms));
  const pick = (l) => l[Math.floor(Math.random() * l.length)];
  const fmt = (n) => Math.round(n).toLocaleString(T("es-ES", "en-GB"));
  const API = "/api/house";
  const post = async (body) => {
    const r = await fetch(API, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    const j = await r.json().catch(() => ({}));
    if (!r.ok) { const e = new Error(j.error || `http ${r.status}`); e.status = r.status; throw e; }
    return j;
  };

  const btn = document.createElement("button");
  btn.type = "button";
  btn.className = "house-open";
  btn.setAttribute("aria-haspopup", "dialog");
  btn.innerHTML = `<i></i><span>${T("La casa", "The house")}</span><b>♠</b>`;

  const cupHTML = (i) => `
    <button type="button" class="shell-cup" data-cup="${i}" aria-label="${T("Vaso", "Glass")} ${i + 1}" disabled>
      <span class="shell-glass"></span><span class="shell-key">${i + 1}</span>
    </button>`;
  const root = document.createElement("div");
  root.className = "house";
  root.setAttribute("role", "dialog");
  root.setAttribute("aria-modal", "true");
  root.setAttribute("aria-hidden", "true");
  root.setAttribute("aria-label", T("La casa: ¿dónde está el dado?", "The house: where is the die?"));
  root.innerHTML = `
    <div class="house-machine">
      <div class="house-scan" aria-hidden="true"></div>
      <header class="house-top">
        <div>
          <span class="house-k">${T("Mesa de la casa", "The house table")}</span>
          <h2>${T("¿Dónde está el dado?", "Where is the die?")}</h2>
        </div>
        <div class="house-top-r">
          <button type="button" class="house-tab" data-view="board" hidden>${T("Ranking", "Ranking")}</button>
          <button type="button" class="house-x" aria-label="${T("Cerrar", "Close")}">✕</button>
        </div>
      </header>
      <div class="house-score">
        <div class="is-bank"><span class="bank-chip" aria-hidden="true"></span><div><small>${T("Tus fichas", "Your chips")}</small><b data-k="chips">${E.START}</b></div><span class="house-delta" data-k="delta"></span></div>
        <div><small>${T("Ronda", "Round")}</small><b data-k="round">1</b></div>
        <div><small>${T("Récord", "Best")}</small><b data-k="best">${E.START}</b></div>
      </div>
      <section class="house-play">
        <div class="house-felt">
          <svg class="house-print" viewBox="0 0 400 120" preserveAspectRatio="none" aria-hidden="true"><path id="housePrintArc" d="M40 108 Q200 76 360 108" fill="none"/><text><textPath href="#housePrintArc" startOffset="50%" text-anchor="middle">${T("LA CASA NUNCA PIERDE DE VISTA EL DADO", "THE HOUSE NEVER LOSES SIGHT OF THE DIE")}</textPath></text></svg>
          <div class="house-fx" aria-hidden="true"></div>
          <div class="shell-stage">
            <div class="shell-die" aria-hidden="true">${"<i></i>".repeat(9)}</div>
          </div>
          <span class="house-pot" data-k="pot" aria-live="polite"></span>
        </div>
        <p class="house-say" aria-live="polite"></p>
        <!-- the bet: quick chips, or any amount; "all" turns the table red -->
        <div class="house-bet" hidden>
          <div class="hb-chips" role="group" aria-label="${T("Apuesta", "Bet")}">
            <button type="button" data-bet="10"><span>10</span></button>
            <button type="button" data-bet="25"><span>25</span></button>
            <button type="button" data-bet="50"><span>50</span></button>
            <button type="button" data-bet="all" class="is-all"><span>${T("Todo", "All")}</span></button>
          </div>
          <div class="hb-amount">
            <button type="button" data-step="-1" aria-label="${T("Menos", "Less")}">−</button>
            <label><span>${T("Tu apuesta", "Your bet")}</span><input id="betIn" type="text" inputmode="numeric" autocomplete="off" spellcheck="false" aria-describedby="betInfo"></label>
            <button type="button" data-step="1" aria-label="${T("Más", "More")}">+</button>
          </div>
          <small class="hb-info" id="betInfo" data-k="betInfo"></small>
        </div>
        <div class="house-actions"></div>
        <section class="house-mini" hidden>
          <header><span class="house-k">${T("Ranking · de siempre", "Ranking · all time")}</span><button type="button" class="house-more">${T("Ver todo", "See all")} →</button></header>
          <ol data-k="mini"></ol>
        </section>
        <form class="house-sign" hidden>
          <label for="houseName">${T("Tus iniciales para el ranking", "Your initials for the ranking")}</label>
          <div class="house-sign-row">
            <input id="houseName" maxlength="3" autocomplete="off" autocapitalize="characters" spellcheck="false" placeholder="AAA" aria-describedby="houseSignNote">
            <button type="submit" class="is-main">${T("Apuntar", "Sign")}</button>
          </div>
          <small id="houseSignNote"></small>
        </form>
        <details class="house-rules">
          <summary><span>${T("Cómo se juega", "How to play")}</span><em>${T("20 segundos", "20 seconds")}</em></summary>
          <ol class="hr-steps">
            <li><b>01</b><div><strong>${T("Apuesta", "Bet")}</strong><p>${T("Empiezas con 100 fichas. Elige 10, 25, 50, todo, o la cantidad que quieras.", "You start with 100 chips. Pick 10, 25, 50, all of it, or any amount.")}</p></div></li>
            <li><b>02</b><div><strong>${T("Mira y sigue", "Watch and follow")}</strong><p>${T("El dado aparece bajo un vaso. La casa los baraja, cada ronda más rápido.", "The die shows under a glass. The house shuffles them, faster every round.")}</p></div></li>
            <li><b>03</b><div><strong>${T("Elige", "Pick")}</strong><p>${T("Aciertas y cobras; fallas y la casa se queda tu apuesta. Sigues mientras te queden fichas.", "Right and you get paid; wrong and the house keeps your bet. You play on while you have chips.")}</p></div></li>
            <li><b>04</b><div><strong>${T("Más vasos", "More glasses")}</strong><p>${T("Cada 10 rondas entra un vaso más, y la mesa paga más: 3 vasos ×1, 4 ×2, 5 ×3.", "Every 10 rounds one more glass comes in, and the table pays more: 3 glasses ×1, 4 ×2, 5 ×3.")}</p></div></li>
          </ol>
          <p class="hr-goal"><span>${T("Tu marca", "Your score")}</span>${T("El máximo de fichas que llegues a tener. Retírate cuando quieras para apuntarla.", "The most chips you ever hold. Cash out whenever you like to sign it.")}</p>
        </details>
      </section>
      <section class="house-board" hidden>
        <div class="house-me" data-k="me" hidden></div>
        <div class="house-board-head">
          <span class="house-k">${T("De siempre · fichas", "All time · chips")}</span>
          <span class="house-k" data-k="allBest"></span>
        </div>
        <ol data-k="week"></ol>
        <p class="house-board-note" data-k="boardNote"></p>
      </section>
    </div>`;
  document.body.append(btn, root);

  const $ = (q) => root.querySelector(q);
  const k = (name) => root.querySelector(`[data-k="${name}"]`);
  const say = $(".house-say"), actions = $(".house-actions"), stage = $(".shell-stage"), die = $(".shell-die");
  const betBox = $(".house-bet"), betIn = $("#betIn");
  let cups = [];
  const sign = $(".house-sign"), nameIn = $("#houseName"), signNote = $("#houseSignNote");
  if (!store.get(BEST_KEY)) $(".house-rules").open = true;

  /* ---------- state ---------- */
  // phase: idle → bet → show → shuffle → pick → reveal → (bet … | over)
  const G = {
    mode: null, id: null, round: null, phase: "idle", signed: false, meTab: "",
    chips: E.START, best: E.START, won: 0, bet: 25, recordShown: false,
    record: Math.max(E.START, +(store.get(BEST_KEY) || 0)), // your best ever, in this browser
  };
  let slotOf = [0, 1, 2]; // slotOf[cup] = where that glass stands now

  const LINES = {
    welcome: () => T("100 fichas, un dado, tres vasos. Haga su apuesta.", "100 chips, one die, three glasses. Place your bet."),
    bet: () => pick(T(["Haga su apuesta.", "¿Cuánto se juega?", "Las fichas sobre la mesa."], ["Place your bet.", "How much are you playing?", "Chips on the table."])),
    allin: () => pick(T(["Todo o nada. Que Dios reparta suerte.", "Todo a una mano. Valiente.", "Todo sobre la mesa. La casa contiene la respiración."], ["All or nothing. Good luck to you.", "Everything on one hand. Brave.", "All on the table. The house holds its breath."])),
    watch: () => pick(T(["Mira bien. Está aquí.", "Aquí está. Por ahora.", "Fíjate. Solo lo verás un momento."], ["Look closely. It's here.", "Here it is. For now.", "Watch. You'll only see it for a moment."])),
    shuffle: () => pick(T(["La casa baraja…", "Sigue el vaso…", "No parpadees…"], ["The house shuffles…", "Follow the glass…", "Don't blink…"])),
    ask: () => pick(T(["¿Dónde está el dado?", "¿Cuál es?", "Tú dirás."], ["Where is the die?", "Which one?", "Your call."])),
    right: (w) => pick(T([`Bien visto. +${w} fichas.`, `Ojo de halcón. La casa paga ${w}.`, `Ahí estaba. Cobra ${w}.`], [`Well spotted. +${w} chips.`, `Hawk eye. The house pays ${w}.`, `There it was. Collect ${w}.`])),
    wrong: (l) => pick(T([`Estaba aquí. La casa se queda ${l}.`, `Esta vez no. −${l} fichas.`, `La casa gana esta mano: ${l}.`], [`It was here. The house keeps ${l}.`, `Not this time. −${l} chips.`, `The house takes this hand: ${l}.`])),
    broke: () => T("Sin fichas. La casa siempre gana… casi siempre.", "Out of chips. The house always wins… almost always."),
    cashed: (b) => T(`Se retira con estilo. Su mejor marca: ${fmt(b)} fichas.`, `You leave in style. Your best: ${fmt(b)} chips.`),
    offline: () => T("Sin conexión con la casa: jugamos aquí, sin ranking.", "The house is offline: we play here, unranked."),
  };
  function speak(text) { say.textContent = text; say.classList.remove("on"); void say.offsetWidth; say.classList.add("on"); }

  const canSign = () => G.mode === "remote" && !G.signed && G.phase === "over" && G.won >= 1 && G.best > E.START;
  const allIn = () => G.bet >= G.chips && G.chips > 0;
  const clampBet = (v) => Math.max(E.minBet(G.chips), Math.min(G.chips, Math.floor(v) || 0));
  function setBet(v) { G.bet = clampBet(v); render(); }

  function render() {
    const R = G.round;
    k("chips").textContent = fmt(G.chips);
    k("round").textContent = R ? R.r : 1;
    k("best").textContent = fmt(Math.max(G.best, G.record));
    const betting = G.phase === "bet";
    betBox.hidden = !betting;
    if (betting) {
      G.bet = clampBet(G.bet);
      if (document.activeElement !== betIn) betIn.value = G.bet;
      root.querySelectorAll("[data-bet]").forEach((b) => {
        const v = b.dataset.bet === "all" ? G.chips : +b.dataset.bet;
        b.disabled = v > G.chips || v < E.minBet(G.chips);
        b.classList.toggle("is-on", b.dataset.bet === "all" ? allIn() : v === G.bet && !allIn());
      });
      const n = R ? R.n : 3, pay = R ? R.pay : 1;
      k("betInfo").textContent = T(`${n} vasos · la mesa paga ×${pay} · ganarías ${fmt(G.bet * pay)}`, `${n} glasses · the table pays ×${pay} · you'd win ${fmt(G.bet * pay)}`);
    }
    // the stake on the felt while the round plays
    const playing = ["show", "shuffle", "pick", "reveal"].includes(G.phase);
    k("pot").textContent = playing ? T(`Apuesta ${fmt(G.bet)}`, `Bet ${fmt(G.bet)}`) : "";
    root.classList.toggle("is-allin", (betting || playing) && allIn());
    const A = {
      idle: [["start", T("Sentarse con 100 fichas", "Sit down with 100 chips"), true]],
      bet: [["bet", allIn() ? T("Todo o nada", "All or nothing") + " →" : `${T("Apostar", "Bet")} ${fmt(G.bet)} →`, true], ...(G.won ? [["cashout", T("Retirarse", "Cash out"), false]] : [])],
      over: [["again", T("Otra partida", "Play again"), !canSign()]],
    }[G.phase] || [];
    actions.innerHTML = A.map(([a, label, main]) => `<button type="button" data-a="${a}" class="${main ? "is-main" : ""}${a === "bet" && allIn() ? " is-allin" : ""}">${label}</button>`).join("");
    cups.forEach((c) => { c.disabled = G.phase !== "pick"; });
    root.classList.toggle("is-picking", G.phase === "pick");
    sign.hidden = !canSign();
    $(".house-tab").hidden = G.mode !== "remote";
  }

  /* ---------- the table: as many glasses as the round has, placed in pixels ---------- */
  function buildCups(n) {
    if (cups.length === n) return;
    cups.forEach((c) => c.remove());
    stage.insertAdjacentHTML("beforeend", Array.from({ length: n }, (_, i) => cupHTML(i)).join(""));
    cups = [...stage.querySelectorAll(".shell-cup")];
    root.style.setProperty("--cups", n);
  }
  const gap = () => Math.min(150, (stage.clientWidth * 0.94) / cups.length);
  const xOf = (slot) => (slot - (cups.length - 1) / 2) * gap();
  function place() { cups.forEach((c, i) => { c.style.transform = `translateX(${xOf(slotOf[i])}px)`; c.style.zIndex = 2; }); }
  function dieUnder(cup) { die.style.transform = `translateX(${xOf(slotOf[cup])}px)`; }
  addEventListener("resize", () => { place(); if (G.round) dieUnder(G.round.d); });

  // one move of the croupier: the glasses that change slot travel in an arc, one in front, one behind
  async function move(p, ms) {
    const next = slotOf.map((s) => p[s]);
    const travelling = cups.map((c, i) => [c, i]).filter(([, i]) => next[i] !== slotOf[i]);
    const s = snd(); if (s) s.glass(0.35);
    await Promise.all(travelling.map(([c, i], j) => {
      const x0 = xOf(slotOf[i]), x1 = xOf(next[i]), front = j % 2 === 0 ? x1 > x0 : x1 < x0;
      const lift = reduce ? 0 : (front ? 10 : -16), scale = reduce ? 1 : (front ? 1.07 : 0.93);
      c.style.zIndex = front ? 3 : 1;
      const a = c.animate([
        { transform: `translateX(${x0}px)` },
        { transform: `translate(${(x0 + x1) / 2}px, ${lift}px) scale(${scale})`, offset: 0.5 },
        { transform: `translateX(${x1}px)` },
      ], { duration: ms, easing: "cubic-bezier(0.45, 0, 0.25, 1)" });
      return a.finished.catch(() => {}).then(() => { c.style.transform = `translateX(${x1}px)`; });
    }));
    slotOf = next;
  }
  const lift = (c, on) => c.classList.toggle("up", on);

  /* ---------- a game ---------- */
  async function newGame() {
    Object.assign(G, { signed: false, chips: E.START, best: E.START, won: 0, bet: 25, recordShown: false });
    try {
      const j = await post({ op: "start" });
      G.mode = "remote"; G.id = j.id; G.round = j.round;
      fetchBoard().then((b) => paintMe(b.me)).catch(() => {});
    } catch (e) {
      G.mode = "local"; G.id = null; G.round = E.round(1, Math.random);
      if (e.status !== 503) speak(LINES.offline());
    }
    buildCups(G.round.n); slotOf = cups.map((_, i) => i); place();
  }
  function toBet() {
    G.phase = "bet";
    buildCups(G.round.n); slotOf = cups.map((_, i) => i); place();
    render();
    speak(G.round.r > 1 && G.round.n > 3 && G.round.r % 10 === 0 ? T(`Ronda ${G.round.r}: entra un vaso más. La mesa paga ×${G.round.pay}.`, `Round ${G.round.r}: one more glass. The table pays ×${G.round.pay}.`) : LINES.bet());
  }

  async function playRound() {
    const R = G.round;
    if (allIn()) { speak(LINES.allin()); await wait(reduce ? 200 : 900); }
    G.phase = "show"; render();
    slotOf = cups.map((_, i) => i); place(); dieUnder(R.d);
    die.classList.add("on");
    cups.forEach((c) => lift(c, true));
    speak(LINES.watch());
    await wait(R.r === 1 ? 1300 : 950);
    cups.forEach((c) => lift(c, false));
    { const s = snd(); if (s) s.thud(0.5); }
    await wait(420);
    die.classList.remove("on");
    G.phase = "shuffle"; render(); speak(LINES.shuffle());
    await wait(260);
    for (const p of R.moves) await move(p, R.ms);
    G.phase = "pick"; render(); speak(LINES.ask());
  }

  async function choose(cup) {
    if (G.phase !== "pick") return;
    G.phase = "reveal"; render();
    const R = G.round, bet = G.bet, before = G.chips;
    let res;
    try {
      if (G.mode === "remote") { res = await post({ op: "pick", id: G.id, cup, bet }); G.id = res.id; }
      else {
        const ok = cup === R.d, chips = Math.max(0, before + (ok ? bet * R.pay : -bet));
        res = { ok, d: R.d, chips, best: Math.max(G.best, chips), won: G.won + (ok ? 1 : 0), round: chips > 0 ? E.round(R.r + 1, Math.random) : null };
      }
    } catch (e) {
      speak(T("Algo se ha caído de la mesa. Vuelve a intentarlo.", "Something fell off the table. Try again."));
      G.phase = "over"; render(); return;
    }
    dieUnder(res.d); die.classList.add("on");
    lift(cups[cup], true);
    G.chips = res.chips; G.best = res.best; G.won = res.won;
    const s = snd();
    const diff = G.chips - before;
    countTo(before, G.chips);
    if (res.ok) {
      if (s) { s.chip(1); setTimeout(() => s.chip(0.7), 120); }
      burst(diff >= 100); delta(diff);
      speak(LINES.right(fmt(diff)));
    } else {
      if (s) s.thud(1);
      shake(); delta(diff);
      await wait(520);
      lift(cups[res.d], true);
      speak(LINES.wrong(fmt(-diff)));
    }
    // a new personal best: the great rain, once a game
    if (G.best > G.record) {
      G.record = G.best; store.set(BEST_KEY, String(G.record)); flashBest();
      if (!G.recordShown) { G.recordShown = true; await wait(500); rain(3, T("Nuevo récord", "New record"), T(`${fmt(G.best)} fichas`, `${fmt(G.best)} chips`)); }
    }
    G.round = res.round;
    render();
    await wait(1300);
    cups.forEach((c) => lift(c, false));
    await wait(380);
    die.classList.remove("on");
    if (!G.round) {
      G.phase = "over";
      (window.WOBLO_TRACK && window.WOBLO_TRACK("game", `«La casa»: ${fmt(G.best)} fichas`));
      speak(LINES.broke() + (canSign() ? " " + T("Apunta tus iniciales.", "Sign with your initials.") : ""));
      render();
      if (!sign.hidden) setTimeout(() => nameIn.focus({ preventScroll: true }), 200);
      return;
    }
    // the milestones: a rain of chips at 5, 10, 15, 20, and every ten after, each grander than the last
    const r = G.round.r, lv = r === 5 ? 1 : r === 10 ? 2 : r === 15 ? 4 : r >= 20 && r % 10 === 0 ? 5 : 0;
    if (lv) await rain(lv, T(`Ronda ${r}`, `Round ${r}`), {
      1: T("La casa empieza a sudar", "The house starts to sweat"),
      2: T("Entra un vaso más", "One more glass comes in"),
      4: T("Ojo de halcón", "Hawk eye"),
      5: r === 20 ? T("Leyenda de la casa", "Legend of the house") : T("La casa se rinde", "The house gives in"),
    }[lv]);
    toBet();
  }

  async function act(a) {
    if (a === "start" || a === "again") {
      actions.innerHTML = "";
      cups.forEach((c) => lift(c, false)); die.classList.remove("on");
      if (a === "again" || !G.mode) await newGame();
      return toBet();
    }
    if (a === "bet" && G.phase === "bet") {
      G.bet = clampBet(+betIn.value || G.bet);
      return playRound();
    }
    if (a === "cashout" && G.phase === "bet") {
      try { if (G.mode === "remote") { const j = await post({ op: "cashout", id: G.id }); G.id = j.id; } } catch (e) { /* the score is the best held; the server keeps it */ }
      G.phase = "over";
      (window.WOBLO_TRACK && window.WOBLO_TRACK("game", `«La casa»: se retira con ${fmt(G.best)} fichas`));
      speak(LINES.cashed(G.best) + (canSign() ? " " + T("Apunta tus iniciales.", "Sign with your initials.") : ""));
      render();
      if (!sign.hidden) setTimeout(() => nameIn.focus({ preventScroll: true }), 200);
    }
  }

  // the bet controls
  root.addEventListener("click", (e) => {
    const b = e.target.closest("[data-bet]");
    if (b && !b.disabled && G.phase === "bet") { setBet(b.dataset.bet === "all" ? G.chips : +b.dataset.bet); const s = snd(); if (s) s.chip(b.dataset.bet === "all" ? 1 : 0.5); return; }
    const st = e.target.closest("[data-step]");
    if (st && G.phase === "bet") { const step = Math.max(1, Math.round(G.chips / 20)); setBet(G.bet + +st.dataset.step * step); }
  });
  betIn.addEventListener("input", () => { betIn.value = betIn.value.replace(/\D/g, "").slice(0, 12); const v = +betIn.value; if (v) { G.bet = Math.min(G.chips, v); render(); } });
  betIn.addEventListener("change", () => setBet(+betIn.value || G.bet));
  betIn.addEventListener("keydown", (e) => { if (e.key === "Enter") { e.preventDefault(); act("bet"); } });

  /* ---------- feel: counting chips, a delta that floats up, chips that fly, a shake on a miss ---------- */
  function countTo(from, to) {
    const el = k("chips"); if (from === to || reduce) { el.textContent = fmt(to); return; }
    const t0 = performance.now(), d = 700;
    const tick = (t) => { const p = Math.min(1, (t - t0) / d), e = 1 - Math.pow(1 - p, 3); el.textContent = fmt(from + (to - from) * e); if (p < 1) requestAnimationFrame(tick); };
    requestAnimationFrame(tick);
  }
  function delta(n) {
    const el = k("delta"); el.textContent = (n >= 0 ? "+" : "−") + fmt(Math.abs(n));
    el.className = "house-delta " + (n >= 0 ? "is-up" : "is-down"); void el.offsetWidth; el.classList.add("on");
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
  function flashBest() { const c = k("best").parentElement; c.classList.add("flash"); setTimeout(() => c.classList.remove("flash"), 900); }

  /* ---------- the rains: chips falling, grander at every milestone ----------
     1 · round 5: a light rain over the table, white and grey
     2 · round 10: denser, gold among them, the felt glows
     3 · a new record: the whole screen, gold and red, a flash, the chips spin
     4 · round 15: the whole screen, a sweep of light, chips burst out from the centre
     5 · round 20 (and every ten after): everything at once, twice, with the title in neon */
  const RAIN = {
    1: { n: 34, full: false, colors: ["#ecebe7", "#8c8c92"], burst: 0, flash: false, ms: 2600 },
    2: { n: 56, full: false, colors: ["#ecebe7", "#8c8c92", "#d8b56f"], burst: 0, flash: false, ms: 3000 },
    3: { n: 90, full: true, colors: ["#d8b56f", "#f1d8a0", "#c0262f", "#ecebe7", "#0c0c0e"], burst: 0, flash: true, ms: 3800 },
    4: { n: 110, full: true, colors: ["#d8b56f", "#ecebe7", "#c0262f", "#2f6b4a", "#0c0c0e"], burst: 36, flash: true, ms: 4200 },
    5: { n: 160, full: true, colors: ["#d8b56f", "#f1d8a0", "#c0262f", "#2f6b4a", "#ecebe7", "#0c0c0e"], burst: 60, flash: true, ms: 5200 },
  };
  function rain(level, title, sub) {
    const cfg = RAIN[level];
    const host = cfg.full ? document.body : $(".house-machine");
    const layer = document.createElement("div");
    layer.className = `house-rain lv${level}${cfg.full ? " is-full" : ""}`;
    layer.setAttribute("aria-hidden", "true");
    const chip = (cls, styles) => { const c = document.createElement("i"); c.className = cls; Object.entries(styles).forEach(([p, v]) => c.style.setProperty(p, v)); layer.appendChild(c); };
    if (!reduce) {
      for (let i = 0; i < cfg.n; i++) {
        const col = cfg.colors[i % cfg.colors.length];
        chip("rc", { "--x": `${Math.random() * 100}%`, "--s": `${(cfg.full ? 22 : 16) + Math.random() * (cfg.full ? 26 : 14)}px`, "--c": col,
          "--d": `${(cfg.full ? 1.6 : 1.3) + Math.random() * 1.4}s`, "--w": `${Math.random() * (level > 2 ? 1.6 : 0.9)}s`,
          "--sway": `${(Math.random() - 0.5) * 120}px`, "--spin": `${(Math.random() - 0.5) * (level > 2 ? 1440 : 540)}deg`, "--tilt": `${Math.random() * 70}deg` });
      }
      for (let i = 0; i < cfg.burst; i++) {
        const a = Math.random() * Math.PI * 2, r = 30 + Math.random() * 45;
        chip("rb", { "--bx": `${Math.cos(a) * r}vw`, "--by": `${Math.sin(a) * r * 0.9}vh`, "--s": `${20 + Math.random() * 28}px`, "--c": cfg.colors[i % cfg.colors.length],
          "--w": `${level === 5 && i % 2 ? 1.1 : 0.05 + Math.random() * 0.2}s`, "--spin": `${(Math.random() - 0.5) * 1080}deg` });
      }
    }
    if (cfg.flash) layer.insertAdjacentHTML("afterbegin", `<span class="rf"></span>`);
    if (level >= 4) layer.insertAdjacentHTML("afterbegin", `<span class="rs"></span>`);
    layer.insertAdjacentHTML("beforeend", `<div class="house-banner"><small>${sub || ""}</small><b>${title}</b></div>`);
    host.appendChild(layer);
    const s = snd();
    if (s) { const ticks = 3 + level * 2; for (let i = 0; i < ticks; i++) setTimeout(() => s.chip(0.5 + Math.random() * 0.5), i * (110 - level * 10)); if (level >= 3) setTimeout(() => s.burst && s.burst(), 80); }
    return new Promise((res) => setTimeout(() => { layer.classList.add("off"); setTimeout(() => { layer.remove(); }, 700); res(); }, reduce ? 1400 : cfg.ms));
  }

  // on a local server only: the rains can be called by hand, to look at them
  if (/^(localhost|127.0.0.1)$/.test(location.hostname)) window.__houseRain = rain;

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
      G.signed = true; store.set(NAME_KEY, name);
      (window.WOBLO_TRACK && window.WOBLO_TRACK("rank", `firma como ${name} · puesto ${j.rank || "?"}`));
      signNote.textContent = "";
      speak(j.rank ? T(`${name}: ${fmt(j.score)} fichas. Puesto ${j.rank} del ranking.`, `${name}: ${fmt(j.score)} chips. Number ${j.rank} on the board.`) : T("Apuntado.", "Signed."));
      render();
      openBoard(true);
    } catch (err) {
      signNote.textContent = { "blocked-name": T("Esas iniciales no. Prueba otras.", "Not those initials. Try others."), "too-short": T("Gana al menos una mano y supera las 100 fichas para apuntarte.", "Win at least one hand and beat 100 chips to sign."), already: T("Esta partida ya está apuntada.", "This game is already signed.") }[err.message]
        || T("No se ha podido apuntar. Inténtalo otra vez.", "Couldn't sign it. Try again.");
    }
  });
  async function fetchBoard(fresh) {
    const r = await fetch(`${API}?p=${PLAYER}${fresh ? "&fresh=1" : ""}`, { cache: "no-store" });
    const j = await r.json();
    paintMini(j);
    return j;
  }
  // the short version on the table: three rows, and yours if you are further down
  function paintMini(j) {
    const box = $(".house-mini"), list = k("mini"), rows = (j && j.all) || [], me = j && j.me && j.me.all;
    box.hidden = false;
    const row = (x, rank, isMe) => `<li class="${isMe ? "is-me" : ""}"><span>${String(rank).padStart(2, "0")}</span><b>${x.name}</b>${isMe ? `<i>${T("tú", "you")}</i>` : ""}<em>${fmt(x.score)}</em></li>`;
    let html = rows.slice(0, 3).map((x, i) => row(x, i + 1, me && i + 1 === me.rank)).join("");
    if (me && me.rank > 3) html += row(me, me.rank, true);
    list.innerHTML = html || `<li class="is-empty">${T("Nadie todavía. El primer puesto es tuyo.", "Nobody yet. First place is yours.")}</li>`;
  }
  async function openBoard(fresh) {
    $(".house-play").hidden = true; $(".house-board").hidden = false;
    $(".house-tab").textContent = T("Volver a la mesa", "Back to the table");
    const list = k("week");
    list.innerHTML = `<li class="is-empty">…</li>`;
    try {
      const j = await fetchBoard(fresh);
      const rows = j.all || [], me = (j.me && j.me.all) || null;
      const row = (x, rank, cls) => `<li class="${cls}"><span>${String(rank).padStart(2, "0")}</span><b>${x.name}</b>${cls.includes("is-me") ? `<i>${T("tú", "you")}</i>` : ""}<em>${fmt(x.score)}</em></li>`;
      let html = rows.map((x, i) => row(x, i + 1, x.me && me && i + 1 === me.rank ? "is-me" : x.me ? "is-mine" : "")).join("");
      // outside the top ten, your row still shows, under a gap
      if (me && me.rank > rows.length) html += `<li class="is-gap" aria-hidden="true">· · ·</li>` + row(me, me.rank, "is-me");
      list.innerHTML = html || `<li class="is-empty">${T("Nadie todavía. La mesa es tuya.", "Nobody yet. The table is yours.")}</li>`;
      paintMe(j.me);
      const top = (j.all || [])[0];
      k("allBest").textContent = top ? T(`Récord: ${top.name} · ${fmt(top.score)}`, `Record: ${top.name} · ${fmt(top.score)}`) : "";
      k("boardNote").textContent = T("El ranking no se reinicia nunca. Cuenta el máximo de fichas de cada partida; las rondas las reparte y las comprueba el servidor.", "The board never resets. It counts the most chips of each game; rounds are dealt and checked by the server.");
    } catch (e) {
      list.innerHTML = `<li class="is-empty">${T("El ranking no responde ahora mismo.", "The ranking isn't answering right now.")}</li>`;
    }
  }
  // your initials, your best and your place: on the board, and on the tab that opens it
  function paintMe(me) {
    const el = k("me"), a = me && me.all, name = (a || {}).name || store.get(NAME_KEY);
    el.hidden = false;
    if (!a) {
      el.innerHTML = `<span class="house-k">${T("Tú", "You")}</span><b>${name || "———"}</b><small>${T("Aún sin marca. Gana fichas y apúntate.", "No score yet. Win chips and sign.")}</small>`;
      G.meTab = "";
    } else {
      el.innerHTML = `<span class="house-k">${T("Tú", "You")}</span><b>${name}</b>
        <div><small>${T("Puesto", "Place")}</small><em>#${a.rank}</em></div>
        <div><small>${T("Tu récord", "Your best")}</small><em>${fmt(a.score)} ${T("fichas", "chips")}</em></div>`;
      G.meTab = `${name} #${a.rank}`;
    }
    tabLabel();
  }
  function tabLabel() {
    if ($(".house-board").hidden) $(".house-tab").innerHTML = G.meTab ? `${T("Ranking", "Ranking")} <b>${G.meTab}</b>` : T("Ranking", "Ranking");
  }
  function closeBoard() {
    $(".house-play").hidden = false; $(".house-board").hidden = true;
    $(".house-machine").scrollTop = 0;
    tabLabel();
  }

  /* ---------- open and close: the cabinet unfolds ---------- */
  let lastFocus = null;
  async function open() {
    lastFocus = document.activeElement;
    root.classList.add("on"); root.setAttribute("aria-hidden", "false");
    document.documentElement.classList.add("house-open-now");
    { const s = snd(); if (s) s.chip(0.6); }
    $(".house-machine").scrollTop = 0;
    if (!G.mode) {
      buildCups(3); slotOf = [0, 1, 2];
      render();
      await newGame();
      if (!say.textContent) speak(LINES.welcome());
    }
    requestAnimationFrame(place);
    render();
    setTimeout(() => { const m = actions.querySelector(".is-main"); if (m) m.focus({ preventScroll: true }); $(".house-machine").scrollTop = 0; }, 450);
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
    if (e.target.closest(".house-more")) return openBoard();
    const c = e.target.closest(".shell-cup");
    if (c && !c.disabled) return choose(+c.dataset.cup);
    const a = e.target.closest("[data-a]");
    if (a && !a.disabled) act(a.dataset.a);
  });
  addEventListener("keydown", (e) => {
    if (!root.classList.contains("on")) return;
    if (e.key === "Escape") return close();
    // 1…n pick the glass standing in that place, left to right
    if (G.phase === "pick" && /^[1-6]$/.test(e.key) && e.target !== nameIn && e.target !== betIn) {
      const slot = +e.key - 1; const cup = slotOf.indexOf(slot); if (cup >= 0) choose(cup);
    }
  });
  // only on the main view: hidden while a page (project, about, the private table) is open
  const page = document.getElementById("page");
  const sync = () => btn.classList.toggle("is-away", !!(page && page.classList.contains("open")));
  if (page) new MutationObserver(sync).observe(page, { attributes: true, attributeFilter: ["class"] });
  sync();
  buildCups(3);
  place();
  render();
})();
