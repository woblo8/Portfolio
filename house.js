/* ============================================================
   LA CASA — ¿Dónde está el dado? The croupier hides the die
   under one of three glasses and shuffles them, every round
   with more moves and faster. Find it, or the game is over.
   Rounds are dealt and checked by the server (/api/house), so
   the ranking holds; without it the same rounds are dealt here,
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
  const BEST_KEY = "woblo:shell-best", NAME_KEY = "woblo:house-name", PLAYER_KEY = "woblo:house-player";
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
        <div class="is-chips"><small>${T("Ronda", "Round")}</small><b data-k="round">1</b><span class="house-delta" data-k="delta"></span></div>
        <div><small>${T("Récord", "Best")}</small><b data-k="best">0</b></div>
        <div><small>${T("Velocidad", "Speed")}</small><b data-k="speed">×1.0</b></div>
      </div>
      <section class="house-play">
        <div class="house-felt">
          <svg class="house-print" viewBox="0 0 400 120" preserveAspectRatio="none" aria-hidden="true"><path id="housePrintArc" d="M40 108 Q200 76 360 108" fill="none"/><text><textPath href="#housePrintArc" startOffset="50%" text-anchor="middle">${T("LA CASA NUNCA PIERDE DE VISTA EL DADO", "THE HOUSE NEVER LOSES SIGHT OF THE DIE")}</textPath></text></svg>
          <div class="house-fx" aria-hidden="true"></div>
          <div class="shell-stage">
            <div class="shell-die" aria-hidden="true">${"<i></i>".repeat(9)}</div>
            ${cupHTML(0)}${cupHTML(1)}${cupHTML(2)}
          </div>
        </div>
        <p class="house-say" aria-live="polite"></p>
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
          <summary><span>${T("Cómo se juega", "How to play")}</span><em>${T("10 segundos", "10 seconds")}</em></summary>
          <ol class="hr-steps is-three">
            <li><b>01</b><div><strong>${T("Mira", "Watch")}</strong><p>${T("El dado aparece bajo uno de los tres vasos.", "The die shows up under one of three glasses.")}</p></div></li>
            <li><b>02</b><div><strong>${T("Sigue", "Follow")}</strong><p>${T("La casa baraja los vasos. Cada ronda, más movimientos y más rápido.", "The house shuffles the glasses. Every round, more moves, and faster.")}</p></div></li>
            <li><b>03</b><div><strong>${T("Elige", "Pick")}</strong><p>${T("Toca el vaso, o pulsa 1, 2 o 3. Aciertas y sigues; fallas y se acaba.", "Tap the glass, or press 1, 2 or 3. Right and you go on; wrong and it's over.")}</p></div></li>
          </ol>
          <p class="hr-goal"><span>${T("Tu marca", "Your score")}</span>${T("Las rondas seguidas que aguantes sin perder el dado de vista.", "How many rounds in a row you keep your eye on the die.")}</p>
        </details>
      </section>
      <section class="house-board" hidden>
        <div class="house-me" data-k="me" hidden></div>
        <div class="house-board-head">
          <span class="house-k">${T("De siempre · rondas", "All time · rounds")}</span>
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
  const cups = [...root.querySelectorAll(".shell-cup")];
  const sign = $(".house-sign"), nameIn = $("#houseName"), signNote = $("#houseSignNote");
  if (!store.get(BEST_KEY)) $(".house-rules").open = true;

  /* ---------- state ---------- */
  // phase: idle → show → shuffle → pick → reveal → (show … | over)
  const G = { mode: null, id: null, round: null, score: 0, phase: "idle", signed: false, meTab: "", best: +(store.get(BEST_KEY) || 0) };
  let slotOf = [0, 1, 2]; // slotOf[cup] = where that glass stands now

  const LINES = {
    welcome: () => T("Un dado, tres vasos. No lo pierdas de vista.", "One die, three glasses. Don't lose sight of it."),
    watch: () => pick(T(["Mira bien. Está aquí.", "Aquí está. Por ahora.", "Fíjate. Solo lo verás un momento."], ["Look closely. It's here.", "Here it is. For now.", "Watch. You'll only see it for a moment."])),
    shuffle: () => pick(T(["La casa baraja…", "Sigue el vaso…", "No parpadees…"], ["The house shuffles…", "Follow the glass…", "Don't blink…"])),
    ask: () => pick(T(["¿Dónde está el dado?", "¿Cuál es?", "Tú dirás."], ["Where is the die?", "Which one?", "Your call."])),
    right: (n) => pick(T([`Bien visto. Ronda ${n}.`, `Ojo de halcón. Vamos a por la ${n}.`, `Ahí estaba. La casa acelera.`], [`Well spotted. Round ${n}.`, `Hawk eye. On to round ${n}.`, `There it was. The house speeds up.`])),
    wrong: (n) => n ? pick(T([`Estaba aquí. Aguantaste ${n} ${n === 1 ? "ronda" : "rondas"}.`, `La casa gana esta vez. ${n} ${n === 1 ? "ronda" : "rondas"}.`], [`It was here. You lasted ${n} ${n === 1 ? "round" : "rounds"}.`, `The house wins this time. ${n} ${n === 1 ? "round" : "rounds"}.`]))
      : T("Estaba aquí. La casa siempre mira.", "It was here. The house is always watching."),
    offline: () => T("Sin conexión con la casa: jugamos aquí, sin ranking.", "The house is offline: we play here, unranked."),
  };
  function speak(text) { say.textContent = text; say.classList.remove("on"); void say.offsetWidth; say.classList.add("on"); }

  const canSign = () => G.mode === "remote" && !G.signed && G.score >= 1 && G.phase === "over";
  function render() {
    k("round").textContent = G.round ? G.round.r : 1;
    k("best").textContent = G.best;
    k("speed").textContent = `×${(E.msFor(1) / (G.round ? G.round.ms : E.msFor(1))).toFixed(1)}`;
    const A = { idle: [["start", T("Empezar", "Start")]], over: [["again", T("Otra partida", "Play again")]] }[G.phase] || [];
    actions.innerHTML = A.map(([a, label]) => `<button type="button" data-a="${a}" class="${a === "again" && canSign() ? "" : "is-main"}">${label}</button>`).join("");
    cups.forEach((c) => { c.disabled = G.phase !== "pick"; });
    root.classList.toggle("is-picking", G.phase === "pick");
    sign.hidden = !canSign();
    $(".house-tab").hidden = G.mode !== "remote";
  }

  /* ---------- the table: where each slot is, glasses and die placed in pixels ---------- */
  const gap = () => Math.min(150, stage.clientWidth * 0.31);
  const xOf = (slot) => (slot - 1) * gap();
  function place() {
    cups.forEach((c, i) => { c.style.transform = `translateX(${xOf(slotOf[i])}px)`; c.style.zIndex = 2; });
  }
  function dieUnder(cup) { die.style.transform = `translateX(${xOf(slotOf[cup])}px)`; }
  addEventListener("resize", () => { place(); if (G.round) dieUnder(G.round.d); });

  // one move of the croupier: the glasses that change slot travel in an arc, one in front, one behind
  async function move(p, ms) {
    const next = slotOf.map((s) => p[s]);
    const travelling = cups.map((c, i) => [c, i]).filter(([, i]) => next[i] !== slotOf[i]);
    const s = snd(); if (s) s.glass(0.35);
    await Promise.all(travelling.map(([c, i]) => {
      const x0 = xOf(slotOf[i]), x1 = xOf(next[i]), front = x1 > x0;
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
    G.signed = false; G.score = 0;
    try {
      const j = await post({ op: "start" });
      G.mode = "remote"; G.id = j.id; G.round = j.round;
      fetchBoard().then((b) => paintMe(b.me)).catch(() => {});
    } catch (e) {
      G.mode = "local"; G.id = null; G.round = E.round(1, Math.random);
      if (e.status !== 503) speak(LINES.offline());
    }
  }

  async function playRound() {
    const R = G.round;
    G.phase = "show"; render();
    slotOf = [0, 1, 2]; place(); dieUnder(R.d);
    // the glasses rise, the die is there, the glasses come down
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
    const R = G.round;
    let res;
    try {
      if (G.mode === "remote") { res = await post({ op: "pick", id: G.id, cup }); G.id = res.id; }
      else { const ok = cup === R.d; res = { ok, d: R.d, score: ok ? R.r : G.score, round: ok ? E.round(R.r + 1, Math.random) : null }; }
    } catch (e) {
      speak(T("Algo se ha caído de la mesa. Vuelve a intentarlo.", "Something fell off the table. Try again."));
      G.phase = "over"; render(); return;
    }
    dieUnder(res.d); die.classList.add("on");
    lift(cups[cup], true);
    const s = snd();
    if (res.ok) {
      G.score = res.score;
      if (s) { s.chip(1); setTimeout(() => s.chip(0.7), 120); }
      burst(G.score >= 8); delta(1);
      if (G.score > G.best) { G.best = G.score; store.set(BEST_KEY, String(G.best)); flashBest(); }
      G.round = res.round;
      speak(LINES.right(G.round.r));
      render();
      await wait(1300);
      cups.forEach((c) => lift(c, false));
      await wait(380);
      die.classList.remove("on");
      await wait(200);
      return playRound();
    }
    if (s) s.thud(1);
    shake();
    await wait(520);
    lift(cups[res.d], true);
    G.phase = "over";
    (window.WOBLO_TRACK && window.WOBLO_TRACK("game", `«La casa»: ${G.score} ${G.score === 1 ? "ronda" : "rondas"}`));
    speak(LINES.wrong(G.score) + (canSign() ? " " + T("Apunta tus iniciales.", "Sign with your initials.") : ""));
    render();
    if (!sign.hidden) setTimeout(() => nameIn.focus({ preventScroll: true }), 200);
  }

  async function act(a) {
    if (a === "start" || a === "again") {
      actions.innerHTML = "";
      cups.forEach((c) => lift(c, false)); die.classList.remove("on");
      if (a === "again" || !G.mode) await newGame();
      return playRound();
    }
  }

  /* ---------- feel: a delta that floats up, chips that fly, a shake on a miss ---------- */
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
      G.signed = true; store.set(NAME_KEY, name);
      (window.WOBLO_TRACK && window.WOBLO_TRACK("rank", `firma como ${name} · puesto ${j.rank || "?"}`));
      signNote.textContent = "";
      speak(j.rank ? T(`${name}: ${j.score} ${j.score === 1 ? "ronda" : "rondas"}. Puesto ${j.rank} del ranking.`, `${name}: ${j.score} ${j.score === 1 ? "round" : "rounds"}. Number ${j.rank} on the board.`) : T("Apuntado.", "Signed."));
      render();
      openBoard(true);
    } catch (err) {
      signNote.textContent = { "blocked-name": T("Esas iniciales no. Prueba otras.", "Not those initials. Try others."), "too-short": T("Acierta al menos una ronda para apuntarte.", "Win at least one round to sign."), already: T("Esta partida ya está apuntada.", "This game is already signed.") }[err.message]
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
    const row = (x, rank, isMe) => `<li class="${isMe ? "is-me" : ""}"><span>${String(rank).padStart(2, "0")}</span><b>${x.name}</b>${isMe ? `<i>${T("tú", "you")}</i>` : ""}<em>${x.score}</em></li>`;
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
      const row = (x, rank, cls) => `<li class="${cls}"><span>${String(rank).padStart(2, "0")}</span><b>${x.name}</b>${cls.includes("is-me") ? `<i>${T("tú", "you")}</i>` : ""}<em>${x.score}</em></li>`;
      let html = rows.map((x, i) => row(x, i + 1, x.me && me && i + 1 === me.rank ? "is-me" : x.me ? "is-mine" : "")).join("");
      // outside the top ten, your row still shows, under a gap
      if (me && me.rank > rows.length) html += `<li class="is-gap" aria-hidden="true">· · ·</li>` + row(me, me.rank, "is-me");
      list.innerHTML = html || `<li class="is-empty">${T("Nadie todavía. La mesa es tuya.", "Nobody yet. The table is yours.")}</li>`;
      paintMe(j.me);
      const top = (j.all || [])[0];
      k("allBest").textContent = top ? T(`Récord: ${top.name} · ${top.score}`, `Record: ${top.name} · ${top.score}`) : "";
      k("boardNote").textContent = T("El ranking no se reinicia nunca. Las rondas las reparte y las comprueba el servidor.", "The board never resets. Rounds are dealt and checked by the server.");
    } catch (e) {
      list.innerHTML = `<li class="is-empty">${T("El ranking no responde ahora mismo.", "The ranking isn't answering right now.")}</li>`;
    }
  }
  // your initials, your best and your place: on the board, and on the tab that opens it
  function paintMe(me) {
    const el = k("me"), a = me && me.all, name = (a || {}).name || store.get(NAME_KEY);
    el.hidden = false;
    if (!a) {
      el.innerHTML = `<span class="house-k">${T("Tú", "You")}</span><b>${name || "———"}</b><small>${T("Aún sin marca. Acierta una ronda y apúntate.", "No score yet. Win a round and sign.")}</small>`;
      G.meTab = "";
    } else {
      el.innerHTML = `<span class="house-k">${T("Tú", "You")}</span><b>${name}</b>
        <div><small>${T("Puesto", "Place")}</small><em>#${a.rank}</em></div>
        <div><small>${T("Tu récord", "Your best")}</small><em>${a.score} ${a.score === 1 ? T("ronda", "round") : T("rondas", "rounds")}</em></div>`;
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
    requestAnimationFrame(place);
    $(".house-machine").scrollTop = 0;
    if (!G.mode) {
      render();
      await newGame();
      if (!say.textContent) speak(LINES.welcome());
    }
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
    // 1, 2, 3 pick the glass standing in that place, left to right
    if (G.phase === "pick" && /^[123]$/.test(e.key) && e.target !== nameIn) { const slot = +e.key - 1; choose(slotOf.indexOf(slot)); }
  });
  // only on the main view: hidden while a page (project, about, the private table) is open
  const page = document.getElementById("page");
  const sync = () => btn.classList.toggle("is-away", !!(page && page.classList.contains("open")));
  if (page) new MutationObserver(sync).observe(page, { attributes: true, attributeFilter: ["class"] });
  sync();
  place();
  render();
})();
