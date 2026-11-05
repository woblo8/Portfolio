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
  const BEST_KEY = "woblo:shell3-best", NAME_KEY = "woblo:house-name", PLAYER_KEY = "woblo:house-player";
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
  // from a thousand million up, the big words: 1 Billion, 2,5 Trillion…
  const BIG = [[1e100, "Googol"], [1e33, "Decillion"], [1e30, "Nonillion"], [1e27, "Octillion"], [1e24, "Septillion"], [1e21, "Sextillion"],
    [1e18, "Quintillion"], [1e15, "Quadrillion"], [1e12, "Trillion"], [1e9, "Billion"]];
  const fmt = (n) => {
    const v = Math.round(n), big = BIG.find(([at]) => Math.abs(v) >= at);
    if (!big) return v.toLocaleString(T("es-ES", "en-GB"));
    return `${(v / big[0]).toLocaleString(T("es-ES", "en-GB"), { maximumFractionDigits: 2 })} ${big[1]}`;
  };
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
        <div class="is-bank"><span class="bank-chip" aria-hidden="true"></span><div><small>${T("Tus fichas", "Your chips")}</small><b data-k="chips">${E.START}</b><span class="house-lives" data-k="lives" aria-label="${T("Vidas", "Lives")}"></span></div><span class="house-delta" data-k="delta"></span></div>
        <div><small>${T("Ronda", "Round")}</small><b data-k="round">1</b></div>
        <div><small>${T("Récord", "Best")}</small><b data-k="best">0</b></div>
      </div>
      <div class="house-rank">
        <span class="rk-sigil" data-k="sigil" aria-hidden="true">♠</span>
        <div class="rk-name"><small>${T("Rango", "Rank")}</small><b data-k="rank">${T("Turista", "Tourist")}</b></div>
        <div class="rk-heat" data-k="heat" title="${T("Racha", "Streak")}" aria-hidden="true">${"<i></i>".repeat(5)}</div>
        <div class="rk-meta"><small>${T("Acierto", "Hit rate")}</small><b data-k="acc">—</b></div>
        <div class="rk-meta"><small>${T("Logros", "Awards")}</small><b data-k="awards">0</b></div>
        <div class="house-toasts" data-k="toasts" aria-live="polite"></div>
      </div>
      <section class="house-play">
        <div class="house-felt">
          <svg class="house-print" viewBox="0 0 400 120" preserveAspectRatio="none" aria-hidden="true"><path id="housePrintArc" d="M40 108 Q200 76 360 108" fill="none"/><text><textPath href="#housePrintArc" startOffset="50%" text-anchor="middle">${T("LA CASA NUNCA PIERDE DE VISTA EL DADO", "THE HOUSE NEVER LOSES SIGHT OF THE DIE")}</textPath></text></svg>
          <div class="house-fx" aria-hidden="true"></div>
          <div class="house-hell" aria-hidden="true">${"<i></i>".repeat(14)}</div>
          <div class="shell-stage">
            <div class="shell-die" aria-hidden="true">${"<i></i>".repeat(9)}</div>
            <div class="shell-die is-x" data-x="0" aria-hidden="true">${"<i></i>".repeat(9)}</div>
            <div class="shell-die is-x" data-x="1" aria-hidden="true">${"<i></i>".repeat(9)}</div>
          </div>
          <span class="house-pot" data-k="pot" aria-live="polite"></span>
          <div class="house-mult" aria-label="${T("Multiplicador", "Multiplier")}"><small>${T("Multi", "Multi")}</small><b data-k="mult">×1</b></div>
        </div>
        <p class="house-say" aria-live="polite"></p>
        <!-- before each round: which dice, a glass more, the shop -->
        <div class="house-bet" hidden>
          <div class="hb-dice" data-k="dice" role="radiogroup" aria-label="${T("Dados", "Dice")}"></div>
          <button type="button" class="hb-glass" data-glass>
            <span class="hb-glass-ico" aria-hidden="true"></span>
            <span><b>${T("Añadir un vaso", "Add a glass")}</b><small data-k="glassInfo"></small></span>
            <em>×${String(E.GLASS_MULT).replace(".", T(",", "."))}</em>
          </button>
          <small class="hb-info" id="betInfo" data-k="betInfo"></small>
          <div class="house-shop" data-k="shop" role="group" aria-label="${T("Ayudas", "Helps")}"></div>
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
        <button type="button" class="house-guide-open"><i aria-hidden="true">?</i><span>${T("Cómo se juega", "How to play")}</span><em>${T("9 láminas · 40 s", "9 plates · 40 s")}</em><b aria-hidden="true">→</b></button>
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
  /* ---------- how to play: seven plates, drawn in lines ---------- */
  const glassAt = (x, y, w = 26, h = 34, cls = "") => `<path class="${cls}" d="M${x - w * 0.36} ${y} H${x + w * 0.36} L${x + w / 2} ${y + h} H${x - w / 2} Z"/><ellipse class="${cls}" cx="${x}" cy="${y + h}" rx="${w / 2 + 1}" ry="3"/>`;
  const dieAt = (x, y, sz = 12, cls = "g-die") => `<rect class="${cls}" x="${x - sz / 2}" y="${y - sz / 2}" width="${sz}" height="${sz}" rx="2.5"/><circle class="g-pip" cx="${x - sz / 4}" cy="${y - sz / 4}" r="1.2"/><circle class="g-pip" cx="${x}" cy="${y}" r="1.2"/><circle class="g-pip" cx="${x + sz / 4}" cy="${y + sz / 4}" r="1.2"/>`;
  // a stack of chips seen from the side, n high
  const stackAt = (x, y, n) => Array.from({ length: n }, (_, i) => { const c = y - i * 7; return `<path class="g-solid" d="M${x - 18} ${c} V${c + 4} A18 6 0 0 0 ${x + 18} ${c + 4} V${c}"/><ellipse class="g-solid" cx="${x}" cy="${c}" rx="18" ry="6"/><ellipse class="g-dash" cx="${x}" cy="${c}" rx="11" ry="3.5"/>`; }).join("");
  const chipAt = (x, y, r = 14) => `<circle cx="${x}" cy="${y}" r="${r}"/><circle class="g-dash" cx="${x}" cy="${y}" r="${r - 3.5}"/>`;
  const PLATES = [
    { k: T("En juego", "At stake"), t: T("Empiezas con 100 fichas. Cada ronda te juegas un cuarto de la mesa: no hay que elegir cuánto.", "You start with 100 chips. Each round a quarter of the table is at stake: no amount to pick."),
      svg: `${stackAt(84, 76, 4)}<text x="84" y="100" class="g-t">100</text><path class="g-arrow g-move" d="M110 64 H140"/><path class="g-arrow" d="M134 58 L140 64 L134 70"/>${stackAt(166, 76, 1)}<text x="164" y="96" class="g-t">${T("apuesta", "bet")}</text>` },
    { k: T("Mira y sigue", "Watch and follow"), t: T("El dado se ve un instante bajo un vaso. Luego la casa baraja, cada ronda más rápido.", "The die shows for a moment under a glass. Then the house shuffles, faster every round."),
      svg: `${glassAt(70, 40)}${glassAt(120, 26, 26, 34, "g-up")}${glassAt(170, 40)}${dieAt(120, 68)}<path class="g-arrow g-move" d="M74 92 C96 108 144 108 166 92"/><path class="g-arrow g-move" d="M160 88 L166 92 L159 96"/>` },
    { k: T("Elige", "Pick"), t: T("Aciertas y cobras. Fallas y la casa se queda tu apuesta. Sigues mientras te queden fichas.", "Hit and you get paid. Miss and the house keeps your bet. You play on while you have chips."),
      svg: `${glassAt(70, 40)}${glassAt(170, 40)}<g class="g-lift">${glassAt(120, 16)}</g>${dieAt(120, 68)}<path class="g-ok" d="M146 70 L152 76 L164 62"/>` },
    { k: T("Más vasos, más premio", "More glasses, bigger pay"), t: T("Cada 10 rondas entra un vaso más y la mesa paga más.", "Every 10 rounds one more glass comes in and the table pays more."),
      svg: [[3, 30, "×1", "1"], [4, 62, "×2", "10"], [5, 94, "×3", "20"]].map(([n, y, p, r]) => Array.from({ length: n }, (_, i) => glassAt(70 + i * 18, y - 10, 13, 17)).join("") + `<text x="196" y="${y + 6}" class="g-t g-big">${p}</text><text x="40" y="${y + 6}" class="g-t">R${r}</text>`).join("") },
    { k: T("Dados", "Dice"), t: T("Antes de cada ronda eliges los dados: uno (×1), con señuelo negro (×2), una pareja que hay que acertar entera (×3) o colores: blanco ×1, rojo ×3, oro ×10.", "Before each round you pick the dice: one (×1), with a black decoy (×2), a pair you must find both of (×3) or colours: white ×1, red ×3, gold ×10."),
      svg: `${dieAt(40, 60, 16)}<text x="40" y="92" class="g-t">×1</text>${dieAt(88, 60, 16)}${dieAt(108, 60, 16, "g-die g-decoy")}<text x="98" y="92" class="g-t">×2</text>${dieAt(150, 60, 16)}${dieAt(170, 60, 16)}<text x="160" y="92" class="g-t">×3</text>${dieAt(204, 46, 12)}${dieAt(204, 62, 12, "g-die g-redd")}${dieAt(204, 78, 12, "g-die g-goldd")}<text x="204" y="100" class="g-t">×10</text>` },
    { k: T("El multiplicador", "The multiplier"), t: T("Todo lo que ganas pasa por él. Súbelo añadiendo vasos (×1,5 cada uno, para siempre) y con la ruleta, que sale cada 5 rondas y nunca resta.", "Everything you win goes through it. Raise it by adding glasses (×1.5 each, for good) and with the wheel, every 5 rounds, which never takes away."),
      svg: `${glassAt(40, 40, 22, 30)}${glassAt(66, 40, 22, 30)}<path class="g-arrow" d="M84 50 H96 M90 44 V56"/>${glassAt(114, 40, 22, 30, "g-glow")}<circle cx="186" cy="58" r="34"/>${Array.from({ length: 10 }, (_, i) => { const a = (i * 36 * Math.PI) / 180; return `<path d="M186 58 L${(186 + Math.cos(a) * 34).toFixed(1)} ${(58 + Math.sin(a) * 34).toFixed(1)}" class="g-dash"/>`; }).join("")}<circle cx="186" cy="58" r="6"/><path d="M186 18 L182 10 H190 Z" class="g-glow"/><text x="78" y="100" class="g-t g-big">×1,5</text><text x="186" y="106" class="g-t g-big">×1,2 – ×10</text>` },
    { k: T("Tres vidas", "Three lives"), t: T("Cada fallo te quita una vida y la mitad de la mesa. Al tercero, la partida vale 0: retírate a tiempo, tu marca son las fichas con las que te vas.", "Each miss takes a life and half the table. At the third, the game is worth 0: cash out in time, your score is the chips you leave with."),
      svg: `<path class="g-heart" d="M70 66 C54 54 58 42 70 50 C82 42 86 54 70 66 Z"/><path class="g-heart" d="M120 66 C104 54 108 42 120 50 C132 42 136 54 120 66 Z"/><path class="g-dash" d="M170 66 C154 54 158 42 170 50 C182 42 186 54 170 66 Z"/><path class="g-arrow" d="M156 40 L184 68 M184 40 L156 68"/><text x="120" y="96" class="g-t">${T("cada fallo: −1 vida · −50% mesa", "each miss: −1 life · −50% table")}</text>` },
    { k: T("Ayudas", "Helps"), t: T("Canjea fichas de la mesa por ayudas. Cada pocas rondas se desbloquea una nueva, cada vez más cara.", "Trade table chips for helps. Every few rounds a new one unlocks, each dearer than the last."),
      svg: `<path d="M20 70 H220" class="g-dash"/>` + Object.keys(E.SHOP).map((id, i) => { const x = 36 + i * 34, y = 70 - 8 - i * 5; return `<path d="M${x} 70 V${y}" class="g-dash"/><circle cx="${x}" cy="${y - 9}" r="9" class="${id === "glass" ? "g-glow" : id === "pact" ? "g-red" : ""}"/><text x="${x}" y="${y - 6}" class="g-t g-icon">${({ hint: "◉", lucky: "♣", slow: "⧗", insure: "☂", pact: "♅", glass: "◇" })[id]}</text><text x="${x}" y="86" class="g-t">${E.SHOP[id].at}</text>`; }).join("") + `<text x="120" y="104" class="g-t">${T("ronda", "round")}</text>` },
    { k: T("Rangos", "Ranks"), t: T("Cuanto más aguantas, más cambia la mesa: de turista a diablo, a dios… y más allá.", "The longer you last, the more the table changes: from tourist to devil, to god… and beyond."),
      svg: [[1, "♠"], [5, "♣"], [10, "♦"], [15, "♥"], [20, "☀"], [30, "✺"]].map(([r, g], i) => { const x = 30 + i * 36, y = 92 - i * 13; return `<path d="M${x - 16} ${y} H${x + 16} V${y + 14}" class="${i === 3 ? "g-red" : i >= 4 ? "g-glow" : ""}"/><text x="${x}" y="${y - 6}" class="g-t g-icon ${i === 3 ? "g-red-t" : i >= 4 ? "g-gold-t" : ""}">${g}</text><text x="${x}" y="${y + 11}" class="g-t">${r}</text>`; }).join("") },
  ];
  const guide = document.createElement("section");
  guide.className = "house-guide";
  guide.hidden = true;
  guide.setAttribute("aria-label", T("Cómo se juega", "How to play"));
  guide.innerHTML = `
    <header><span class="house-k">${T("Cómo se juega", "How to play")}</span><button type="button" class="hg-x" aria-label="${T("Cerrar", "Close")}">✕</button></header>
    <div class="hg-track">${PLATES.map((p, i) => `
      <article class="hg-plate" data-i="${i}">
        <svg viewBox="0 0 240 120" aria-hidden="true">${p.svg}</svg>
        <div class="hg-text"><b>${String(i + 1).padStart(2, "0")}</b><h3>${p.k}</h3><p>${p.t}</p></div>
      </article>`).join("")}</div>
    <footer>
      <button type="button" class="hg-prev" aria-label="${T("Anterior", "Previous")}">←</button>
      <div class="hg-dots">${PLATES.map((_, i) => `<i data-go="${i}"></i>`).join("")}</div>
      <button type="button" class="hg-next">${T("Siguiente", "Next")} →</button>
    </footer>`;
  root.querySelector(".house-machine").appendChild(guide);
  let plate = 0;
  function showPlate(i) {
    plate = Math.max(0, Math.min(PLATES.length - 1, i));
    guide.style.setProperty("--p", plate);
    guide.querySelectorAll(".hg-plate").forEach((el, j) => el.classList.toggle("on", j === plate));
    guide.querySelectorAll(".hg-dots i").forEach((el, j) => el.classList.toggle("on", j === plate));
    guide.querySelector(".hg-prev").disabled = plate === 0;
    guide.querySelector(".hg-next").textContent = plate === PLATES.length - 1 ? T("A jugar", "Let's play") + " →" : T("Siguiente", "Next") + " →";
  }
  function openGuide() {
    const m = root.querySelector(".house-machine"); m.scrollTop = 0; m.classList.add("is-guide");
    guide.hidden = false; requestAnimationFrame(() => guide.classList.add("on"));
    showPlate(0); store.set("woblo:house-guide", "1"); root.querySelector(".house-guide-open").classList.remove("is-new");
    guide.querySelector(".hg-next").focus({ preventScroll: true });
  }
  function closeGuide() {
    guide.classList.remove("on"); root.querySelector(".house-machine").classList.remove("is-guide");
    setTimeout(() => { guide.hidden = true; }, 350);
  }
  guide.addEventListener("click", (e) => {
    e.stopPropagation();
    if (e.target.closest(".hg-x")) return closeGuide();
    if (e.target.closest(".hg-prev")) return showPlate(plate - 1);
    if (e.target.closest(".hg-next")) return plate === PLATES.length - 1 ? closeGuide() : showPlate(plate + 1);
    const d = e.target.closest("[data-go]"); if (d) showPlate(+d.dataset.go);
  });
  guide.addEventListener("keydown", (e) => {
    if (e.key === "ArrowRight") { e.preventDefault(); showPlate(plate + 1); }
    if (e.key === "ArrowLeft") { e.preventDefault(); showPlate(plate - 1); }
    if (e.key === "Escape") { e.preventDefault(); e.stopPropagation(); closeGuide(); }
  });
  // swipe on a phone
  { let x0 = null; guide.addEventListener("pointerdown", (e) => { x0 = e.clientX; }); guide.addEventListener("pointerup", (e) => { if (x0 == null) return; const dx = e.clientX - x0; x0 = null; if (Math.abs(dx) > 40) showPlate(plate + (dx < 0 ? 1 : -1)); }); }
  root.addEventListener("click", (e) => { if (e.target.closest(".house-guide-open")) openGuide(); });

  document.body.append(btn, root);

  const $ = (q) => root.querySelector(q);
  const k = (name) => root.querySelector(`[data-k="${name}"]`);
  const say = $(".house-say"), actions = $(".house-actions"), stage = $(".shell-stage"), die = $(".shell-die");
  const betBox = $(".house-bet"), betIn = null;
  const xDice = [...root.querySelectorAll(".shell-die.is-x")];
  let cups = [];
  const sign = $(".house-sign"), nameIn = $("#houseName"), signNote = $("#houseSignNote");
  if (!store.get("woblo:house-guide")) $(".house-guide-open").classList.add("is-new");

  /* ---------- state ---------- */
  // phase: idle → bet → show → shuffle → pick → reveal → (bet … | over)
  const G = {
    mode: null, id: null, round: null, phase: "idle", signed: false, meTab: "",
    chips: E.START, best: E.START, won: 0, bet: 25, recordShown: false,
    streak: 0, played: 0, allinWins: 0, low: E.START, tier: 0, got: new Set(),
    safe: 0, buy: {}, shown: {}, cashed: false,
    mult: 1, add: 0, spun: 0, dice: "one", picks: [], wheelBusy: false, lives: E.LIVES,
    lastR: 0, cp: 1, cpId: null, // the checkpoint: where a finished game lets you sit back down
    record: +(store.get(BEST_KEY) || 0), // your best score ever, in this browser
  };
  let slotOf = [0, 1, 2]; // slotOf[cup] = where that glass stands now

  /* ---------- the ladder: every few rounds a new rank, and the table changes with it ----------
     0 Tourist · 1 Gambler (5) · 2 Shark (10, the table warms up) · 3 Devil (15, devil mode)
     4 God (20, god mode: gold, light, a halo) · 5 Omniscient (30, the light goes white) */
  const TIERS = [
    { at: 1, n: () => T("Turista", "Tourist"), sigil: "♠" },
    { at: 5, n: () => T("Jugador", "Gambler"), sigil: "♣" },
    { at: 10, n: () => T("Tiburón", "Shark"), sigil: "♦" },
    { at: 15, n: () => T("Diablo", "Devil"), sigil: "♥" },
    { at: 20, n: () => T("Dios", "God"), sigil: "☀" },
    { at: 30, n: () => T("Omnisciente", "Omniscient"), sigil: "✺" },
  ];
  const tierOf = (r) => TIERS.reduce((t, x, i) => (r >= x.at ? i : t), 0);
  // a line for this tier: each tier has its own list, the last one covers everything deeper
  const byTier = (lists) => { const l = lists[Math.min(G.tier, lists.length - 1)]; return pick(T(l[0], l[1])); };

  const TALK = {
    bet: [
      [["Haga su apuesta.", "¿Cuánto se juega?", "Las fichas sobre la mesa.", "La casa invita a la primera… no, era broma. Apueste."], ["Place your bet.", "How much are you playing?", "Chips on the table.", "The first one's on the house… no, kidding. Bet."]],
      [["Ya le ha cogido el gusto. ¿Cuánto?", "La casa le escucha.", "Se le ve cómodo. Apueste.", "Ronda a ronda, la mesa se acuerda de usted."], ["You've got a taste for it. How much?", "The house is listening.", "You look comfortable. Bet.", "Round by round, the table remembers you."]],
      [["¿Cuánto vale su ojo hoy?", "La mesa se calienta. Apueste.", "El encargado ya le mira desde la barra.", "Huele a quemado. Debe de ser usted."], ["What's your eye worth today?", "The table is warming up. Bet.", "The manager is watching you from the bar.", "Something's burning. Must be you."]],
      [["Apueste, si se atreve.", "El diablo espera su ofrenda.", "Las fichas arden. ¿Cuántas?", "Aquí abajo nadie apuesta poco.", "Firme aquí… quiero decir, apueste."], ["Bet, if you dare.", "The devil awaits your offering.", "The chips are burning. How many?", "Down here nobody bets small.", "Sign here… I mean, bet."]],
      [["Hágase su apuesta.", "Los mortales apuestan. Usted decide.", "El cielo abre la banca. ¿Cuánto?", "Ni el diablo se atreve a mirarle. Apueste.", "Dios no juega a los dados… salvo hoy."], ["Let there be a bet.", "Mortals bet. You decide.", "Heaven opens the bank. How much?", "Not even the devil dares look at you. Bet.", "God doesn't play dice… except today."]],
      [["Ya lo sabe todo. Apueste por costumbre.", "El universo espera su cifra.", "Más allá de Dios solo queda usted.", "Nadie había llegado aquí. Nadie."], ["You already know everything. Bet out of habit.", "The universe awaits your number.", "Beyond God there is only you.", "Nobody had come this far. Nobody."]],
    ],
    watch: [
      [["Mira bien. Está aquí.", "Aquí está. Por ahora.", "Fíjate. Solo lo verás un momento."], ["Look closely. It's here.", "Here it is. For now.", "Watch. You'll only see it for a moment."]],
      [["Aquí. No lo pierda.", "Un vistazo. No habrá otro."], ["Here. Don't lose it.", "One look. There won't be another."]],
      [["Míralo. La casa ya no se lo pone fácil.", "Último vistazo antes del baile."], ["Look. The house won't make it easy now.", "Last look before the dance."]],
      [["Ahí arde el dado. Mírelo bien.", "Mírelo. Puede que sea la última vez.", "El dado brilla como una brasa."], ["There the die burns. Look closely.", "Look. It may be the last time.", "The die glows like an ember."]],
      [["Que se haga la luz: ahí está.", "Lo ve antes de que aparezca.", "Un milagro: el dado, a la vista."], ["Let there be light: there it is.", "You see it before it appears.", "A miracle: the die, in plain sight."]],
    ],
    shuffle: [
      [["La casa baraja…", "Sigue el vaso…", "No parpadees…"], ["The house shuffles…", "Follow the glass…", "Don't blink…"]],
      [["Más rápido…", "Siga, siga…", "La mano es más rápida que el ojo…"], ["Faster…", "Keep up, keep up…", "The hand is quicker than the eye…"]],
      [["El crupier se arremanga…", "Esto ya va en serio…", "Ni el encargado lo sigue…"], ["The croupier rolls up his sleeves…", "Now it's serious…", "Not even the manager can follow…"]],
      [["El diablo baraja…", "Las manos del infierno no tiemblan…", "Arde la mesa…"], ["The devil shuffles…", "Hell's hands don't shake…", "The table is on fire…"]],
      [["La casa reza mientras baraja…", "Los ángeles mueven los vasos…", "Ni la luz va tan rápido…"], ["The house prays as it shuffles…", "Angels move the glasses…", "Not even light is this fast…"]],
    ],
    ask: [
      [["¿Dónde está el dado?", "¿Cuál es?", "Tú dirás."], ["Where is the die?", "Which one?", "Your call."]],
      [["¿Cuál? Sin prisa… o sí.", "Elija."], ["Which? No rush… or yes.", "Choose."]],
      [["Demuestre que es un tiburón.", "¿Cuál, tiburón?"], ["Prove you're a shark.", "Which one, shark?"]],
      [["Elija. Con cuidado.", "¿Dónde está su alma? Digo… el dado.", "El diablo espera."], ["Choose. Carefully.", "Where is your soul? I mean… the die.", "The devil waits."]],
      [["Señale, y será.", "Su voluntad, por favor.", "¿Cuál bendice?"], ["Point, and so it shall be.", "Your will, please.", "Which one do you bless?"]],
    ],
    right: [
      [["Bien visto. +{w} fichas.", "Principiante con suerte. +{w}.", "Ahí estaba. Cobra {w}.", "La casa toma nota. +{w}."], ["Well spotted. +{w} chips.", "Beginner's luck. +{w}.", "There it was. Collect {w}.", "The house takes note. +{w}."]],
      [["Ya no es suerte. +{w}.", "Tiene ojo. La casa paga {w}.", "Así se juega. +{w}.", "El crupier frunce el ceño. +{w}."], ["That's not luck anymore. +{w}.", "You've got an eye. The house pays {w}.", "That's how it's played. +{w}.", "The croupier frowns. +{w}."]],
      [["Tiburón en la mesa. +{w}.", "La casa empieza a sudar: {w} para usted.", "Ni yo sé dónde lo puse. Usted sí. +{w}.", "Esto ya es personal. +{w}."], ["Shark at the table. +{w}.", "The house starts to sweat: {w} for you.", "Even I don't know where I put it. You do. +{w}.", "Now it's personal. +{w}."]],
      [["El diablo aplaude. +{w}.", "Ese ojo no es humano. +{w}.", "Arde la mesa: {w} para usted.", "Hasta el infierno paga sus deudas. +{w}."], ["The devil applauds. +{w}.", "That eye isn't human. +{w}.", "The table burns: {w} for you.", "Even hell pays its debts. +{w}."]],
      [["Milagro. +{w}.", "Lo vio desde el cielo. +{w}.", "Aleluya: la casa paga {w}.", "Omnipotente. +{w} fichas.", "El cielo llueve fichas: {w}."], ["Miracle. +{w}.", "You saw it from heaven. +{w}.", "Hallelujah: the house pays {w}.", "Almighty. +{w} chips.", "Heaven rains chips: {w}."]],
    ],
    wrong: [
      [["Estaba aquí. La casa se queda {l}.", "Esta vez no. −{l} fichas.", "Tranquilo, a todos nos pasa. −{l}."], ["It was here. The house keeps {l}.", "Not this time. −{l} chips.", "Relax, it happens to everyone. −{l}."]],
      [["Casi. La casa se queda {l}.", "Era el de al lado. −{l}.", "Un parpadeo de más. −{l}."], ["Close. The house keeps {l}.", "It was the next one. −{l}.", "One blink too many. −{l}."]],
      [["El tiburón muerde el anzuelo. −{l}.", "La casa respira: {l} para nosotros.", "Hasta los mejores fallan. −{l}."], ["The shark bites the hook. −{l}.", "The house breathes: {l} for us.", "Even the best miss. −{l}."]],
      [["El diablo cobra su parte: {l}.", "Las llamas se tragan {l} fichas.", "Cerca, pero el infierno no perdona. −{l}."], ["The devil takes his cut: {l}.", "The flames swallow {l} chips.", "Close, but hell doesn't forgive. −{l}."]],
      [["Hasta Dios descansa el séptimo día. −{l}.", "Un misterio divino. −{l}.", "Los caminos del dado son inescrutables. −{l}."], ["Even God rests on the seventh day. −{l}.", "A divine mystery. −{l}.", "The die moves in mysterious ways. −{l}."]],
    ],
    broke: [
      [["Sin fichas. La casa siempre gana… casi siempre.", "Se acabó. La próxima, con más calma."], ["Out of chips. The house always wins… almost always.", "That's it. Next time, calmer."]],
      [["Sin fichas. Pero se le daba bien.", "Fin de la partida. La casa respira."], ["Out of chips. You were good at it.", "Game over. The house breathes again."]],
      [["Cae el tiburón. Qué partida.", "Sin fichas. La casa lo celebrará en voz baja."], ["The shark falls. What a game.", "Out of chips. The house will celebrate quietly."]],
      [["El infierno se queda sus fichas. Vuelva cuando quiera… siempre vuelven.", "El diablo cierra la mesa. Por esta noche."], ["Hell keeps your chips. Come back any time… they always do.", "The devil closes the table. For tonight."]],
      [["Cae un dios. La casa le levantará un altar.", "Hasta los dioses vuelven a la tierra. Qué partida."], ["A god falls. The house will build you an altar.", "Even gods return to earth. What a game."]],
    ],
  };
  const fill = (str, o) => str.replace(/\{(\w)\}/g, (_, x) => o[x]);

  /* ---------- awards: cosmetic, kept in this browser, a toast when one is won ---------- */
  const AWARD_KEY = "woblo:house-awards";
  const AWARDS = {
    first: [() => T("Primera mano", "First hand"), () => T("La casa le saluda", "The house greets you")],
    hot3: [() => T("En llamas", "On fire"), () => T("3 aciertos seguidos", "3 in a row")],
    hot5: [() => T("Imparable", "Unstoppable"), () => T("5 seguidos", "5 in a row")],
    hot8: [() => T("Intocable", "Untouchable"), () => T("8 seguidos", "8 in a row")],
    hot12: [() => T("Pacto firmado", "Pact signed"), () => T("12 seguidos", "12 in a row")],
    allin: [() => T("Todo o nada", "All or nothing"), () => T("Ganó apostándolo todo", "Won betting it all")],
    allin3: [() => T("Kamikaze", "Kamikaze"), () => T("Tres veces todo o nada", "All in, three times")],
    phoenix: [() => T("Resurrección", "Resurrection"), () => T("De menos de 20 a más de 100", "From under 20 back over 100")],
    c200: [() => T("Doble", "Double"), () => T("200 fichas", "200 chips")],
    c500: [() => T("Quinientas", "Five hundred"), () => T("500 fichas", "500 chips")],
    c1000: [() => T("Mil fichas", "A thousand"), () => T("1.000 fichas", "1,000 chips")],
    c5000: [() => T("Fortuna", "Fortune"), () => T("5.000 fichas", "5,000 chips")],
    c25000: [() => T("Magnate", "Magnate"), () => T("25.000 fichas", "25,000 chips")],
    c100000: [() => T("Banca rota", "Broke the bank"), () => T("100.000: la casa no tiene más", "100,000: the house has no more")],
    beast: [() => T("La bestia", "The beast"), () => T("Exactamente 666 fichas", "Exactly 666 chips")],
    perfect: [() => T("Sin un fallo", "Flawless"), () => T("10 rondas, 10 aciertos", "10 rounds, 10 hits")],
    r5: [() => T("Jugador", "Gambler"), () => T("Llegó a la ronda 5", "Reached round 5")],
    r10: [() => T("Tiburón", "Shark"), () => T("Llegó a la ronda 10", "Reached round 10")],
    r15: [() => T("Diablo", "Devil"), () => T("Llegó a la ronda 15", "Reached round 15")],
    r20: [() => T("Dios", "God"), () => T("Llegó a la ronda 20", "Reached round 20")],
    r30: [() => T("Omnisciente", "Omniscient"), () => T("Llegó a la ronda 30", "Reached round 30")],
  };
  const everGot = (() => { try { return new Set(JSON.parse(store.get(AWARD_KEY) || "[]")); } catch (e) { return new Set(); } })();
  const toastQ = [];
  let toasting = false;
  function award(id) {
    if (G.got.has(id) || !AWARDS[id]) return;
    G.got.add(id);
    const fresh = !everGot.has(id);
    if (fresh) { everGot.add(id); store.set(AWARD_KEY, JSON.stringify([...everGot])); }
    toastQ.push({ id, fresh });
    paintRank();
    if (!toasting) nextToast();
  }
  function nextToast() {
    const t = toastQ.shift();
    if (!t) { toasting = false; return; }
    toasting = true;
    const box = k("toasts"), el = document.createElement("div");
    el.className = "house-toast" + (t.fresh ? " is-new" : "");
    el.innerHTML = `<i aria-hidden="true">✦</i><div><b>${AWARDS[t.id][0]()}</b><small>${AWARDS[t.id][1]()}</small></div>${t.fresh ? `<em>${T("Nuevo", "New")}</em>` : ""}`;
    box.appendChild(el);
    const s = snd(); if (s) { s.chip(0.8); setTimeout(() => s.chip(1), 110); }
    setTimeout(() => { el.classList.add("off"); setTimeout(() => { el.remove(); nextToast(); }, 450); }, reduce ? 1600 : 2300);
  }

  // the rank bar and the table's mood
  function paintRank() {
    const r = G.round ? G.round.r : 1;
    const t = tierOf(r);
    if (t !== G.tier) { G.tier = t; }
    k("rank").textContent = TIERS[G.tier].n();
    k("sigil").textContent = TIERS[G.tier].sigil;
    const heat = Math.max(0, Math.min(5, G.streak));
    [...k("heat").children].forEach((x, i) => x.classList.toggle("on", i < heat));
    k("heat").classList.toggle("is-max", G.streak >= 5);
    k("acc").textContent = G.played ? Math.round((G.won / G.played) * 100) + "%" : "—";
    k("awards").textContent = `${everGot.size}/${Object.keys(AWARDS).length}`;
    root.classList.toggle("is-warm", G.tier === 2);
    root.classList.toggle("is-hell", G.tier === 3);
    root.classList.toggle("is-god", G.tier >= 4);
    root.classList.toggle("is-beyond", G.tier >= 5);
    const hell = G.tier === 3, god = G.tier >= 4;
    $(".house-top .house-k").textContent = god ? T("Mesa divina", "The divine table") : hell ? T("Mesa del diablo", "The devil's table") : G.tier === 2 ? T("La mesa arde", "The table burns") : T("Mesa de la casa", "The house table");
    $(".house-top h2").textContent = god ? T("Hágase el dado", "Let there be dice") : hell ? T("¿Dónde está el alma?", "Where is the soul?") : T("¿Dónde está el dado?", "Where is the die?");
    $(".is-bank small").textContent = god ? T("Fichas sagradas", "Holy chips") : hell ? T("Fichas malditas", "Cursed chips") : T("Tus fichas", "Your chips");
    k("round").previousElementSibling.textContent = god ? T("Cielo", "Heaven") : hell ? T("Círculo", "Circle") : T("Ronda", "Round");
    $(".house-print textPath").textContent = god ? T("DIOS NO JUEGA A LOS DADOS · SALVO EN ESTA MESA", "GOD DOES NOT PLAY DICE · EXCEPT AT THIS TABLE") : hell ? T("EL DIABLO NUNCA PIERDE DE VISTA EL DADO", "THE DEVIL NEVER LOSES SIGHT OF THE DIE") : T("LA CASA NUNCA PIERDE DE VISTA EL DADO", "THE HOUSE NEVER LOSES SIGHT OF THE DIE");
  }

  // a word on your play, now and then: how good your eye is
  function skillLine() {
    if (G.played < 4) return null;
    const a = G.won / G.played;
    if (a >= 0.95) return T(`${G.won} de ${G.played}. La casa empieza a sospechar de usted.`, `${G.won} of ${G.played}. The house is starting to suspect you.`);
    if (a >= 0.8) return T(`Acierta el ${Math.round(a * 100)}%. Un ojo así no se ve todos los días.`, `You hit ${Math.round(a * 100)}%. An eye like that is rare.`);
    if (a >= 0.6) return T(`${Math.round(a * 100)}% de aciertos. Mejor que la media de la casa.`, `${Math.round(a * 100)}% hits. Better than the house average.`);
    return T(`${Math.round(a * 100)}% de aciertos. La suerte le debe una.`, `${Math.round(a * 100)}% hits. Luck owes you one.`);
  }
  // what the croupier says about your stack
  function stackLine() {
    if (G.chips >= 25000) return T("Con esa montaña, la casa le trata de usted… y de señor.", "With that mountain, the house calls you sir.");
    if (G.chips >= 5000) return T("Esa pila ya hace sombra en la mesa.", "That stack casts a shadow on the table.");
    if (G.chips >= 1000) return T("Más de mil fichas. La mesa ya nota el peso.", "Over a thousand chips. The table feels the weight.");
    if (G.chips <= 10) return T("Le quedan las justas. Cada ficha cuenta.", "You're down to the last few. Every chip counts.");
    return null;
  }

  const LINES = {
    welcome: () => T("100 fichas, un dado, tres vasos. Haga su apuesta.", "100 chips, one die, three glasses. Place your bet."),
    bet: () => byTier(TALK.bet),
    allin: () => G.tier >= 4 ? pick(T(["Todo o nada. Los ángeles contienen la respiración.", "Lo apuesta todo. Como haría un dios.", "Todo sobre la mesa: que se haga su voluntad."], ["All or nothing. The angels hold their breath.", "You bet it all. As a god would.", "All on the table: thy will be done."])) : G.tier === 3 ? pick(T(["Todo al fuego. El diablo se frota las manos.", "Todo o nada en el infierno. Así me gusta.", "Se lo juega todo. Hasta el alma."], ["Everything into the fire. The devil rubs his hands.", "All or nothing in hell. That's the spirit.", "You're betting it all. Even your soul."])) : pick(T(["Todo o nada. Que Dios reparta suerte.", "Todo a una mano. Valiente.", "Todo sobre la mesa. La casa contiene la respiración."], ["All or nothing. Good luck to you.", "Everything on one hand. Brave.", "All on the table. The house holds its breath."])),
    watch: () => byTier(TALK.watch),
    shuffle: () => byTier(TALK.shuffle),
    ask: () => byTier(TALK.ask),
    right: (w) => fill(byTier(TALK.right), { w }),
    wrong: (l) => fill(byTier(TALK.wrong), { l }),
    broke: () => byTier(TALK.broke),
    cashed: (b) => T(`Se retira con estilo: ${fmt(b)} fichas.`, `You leave in style: ${fmt(b)} chips.`),
    offline: () => T("Sin conexión con la casa: jugamos aquí, sin ranking.", "The house is offline: we play here, unranked."),
  };
  function speak(text) { say.textContent = text; say.classList.remove("on"); void say.offsetWidth; say.classList.add("on"); }

  const scoreNow = () => E.score({ chips: G.chips, cashed: G.cashed });
  const canSign = () => G.mode === "remote" && !G.signed && G.phase === "over" && G.won >= 1 && scoreNow() > E.START;

  /* ---------- the shop: helps bought with table chips, unlocked as the rounds go by ---------- */
  // each help: its neon colour, a line drawing, a name, what it does in a word and in full
  const ICON = {
    hint: '<circle cx="24" cy="24" r="6"/><path d="M4 24 C11 13 37 13 44 24 C37 35 11 35 4 24 Z"/><path d="M24 6 V2 M12 9 L10 5 M36 9 L38 5"/>',
    lucky: '<circle cx="18" cy="18" r="7"/><circle cx="30" cy="18" r="7"/><circle cx="18" cy="30" r="7"/><circle cx="30" cy="30" r="7"/><path d="M24 30 C26 38 30 42 34 44"/>',
    slow: '<path d="M13 5 H35 M13 43 H35 M15 5 C15 17 33 19 33 24 C33 29 15 31 15 43 M33 5 C33 17 15 19 15 24 C15 29 33 31 33 43"/><path d="M20 38 H28"/>',
    insure: '<path d="M5 24 C5 13 14 6 24 6 C34 6 43 13 43 24 C39 21 35 21 31 24 C28 21 20 21 17 24 C13 21 9 21 5 24 Z"/><path d="M24 24 V38 C24 42 18 42 18 38"/>',
    pact: '<path d="M14 18 C10 12 8 7 9 3 C13 7 16 10 19 13 M34 18 C38 12 40 7 39 3 C35 7 32 10 29 13"/><path d="M24 44 C14 44 10 36 12 28 C14 22 19 19 24 19 C29 19 34 22 36 28 C38 36 34 44 24 44 Z"/><path d="M19 30 L22 33 M29 30 L26 33"/>',
    glass: '<path d="M14 6 H34 L38 40 C38 43 10 43 10 40 Z"/><path d="M18 12 L16 34 M30 10 L33 20" class="ic-shine"/><rect x="19" y="27" width="10" height="10" rx="2"/>',
  };
  const ITEMS = {
    hint: { c: "#6ff2ff", n: () => T("Tercer Ojo", "Third Eye"), t: () => T("Levanta un vaso vacío", "Lifts an empty glass"),
      long: () => T("Cuando llega el momento de elegir, la casa levanta uno de los vasos vacíos y lo deja fuera de juego. Una opción menos para equivocarse.", "When it's time to choose, the house lifts one of the empty glasses and leaves it out of play. One fewer way to be wrong.") },
    lucky: { c: "#5dff9c", n: () => T("Trébol Negro", "Black Clover"), t: () => T("El acierto paga ×3", "A hit pays ×3"),
      long: () => T("Un trébol sobre el tapete. Si aciertas esta ronda, el premio se multiplica por tres, encima de tu multiplicador.", "A clover on the felt. Hit this round and the prize is tripled, on top of your multiplier.") },
    slow: { c: "#b98cff", n: () => T("Tiempo Bala", "Bullet Time"), t: () => T("Barajan a media velocidad", "Shuffled at half speed"),
      long: () => T("El crupier baraja a la mitad de velocidad durante una ronda. Ideal cuando la mesa ya va demasiado rápida.", "The croupier shuffles at half speed for one round. Just right when the table is getting too fast.") },
    insure: { c: "#58a8ff", n: () => T("Plan B", "Plan B"), t: () => T("Si fallas, no pierdes vida", "Miss and keep your life"),
      long: () => T("Si fallas esta ronda, pierdes la mitad de la mesa como siempre, pero no la vida. Un fallo gratis.", "If you miss this round you lose half the table as usual, but not a life. A free miss.") },
    pact: { c: "#ff3b4a", n: () => T("Pacto Infernal", "Infernal Pact"), t: () => T("×5, o pierdes toda la mesa", "×5, or lose the whole table"),
      long: () => T("Firma y el acierto paga cinco veces más. Pero si fallas, el diablo se lleva todas las fichas de la mesa. La partida se acaba ahí.", "Sign and a hit pays five times more. But miss, and the devil takes every chip on the table. He doesn't touch the safe.") },
    glass: { c: "#e9f7ff", n: () => T("Visión de Cristal", "Crystal Vision"), t: () => T("Ves los dados todo el rato", "You see the dice all along"),
      long: () => T("Los vasos se vuelven de cristal durante una ronda: ves los dados moverse con ellos de principio a fin. Lo más caro de la casa.", "The glasses turn to crystal for one round: you watch the dice move with them from start to end. The dearest thing in the house.") },
  };
  const svgIcon = (id, size = 48) => `<svg viewBox="0 0 48 48" width="${size}" height="${size}" aria-hidden="true">${ICON[id]}</svg>`;
  const BOUGHT = {
    hint: () => T("Tercer Ojo abierto. Cuando elija, la casa le quitará un vaso vacío.", "Tip-off bought. When you choose, the house will remove an empty glass."),
    lucky: () => T("Trébol Negro sobre el tapete. Si acierta, paga triple.", "Charm on the table. Hit it and it pays triple."),
    slow: () => T("Tiempo Bala. El crupier bostezará barajando.", "Slow motion. The croupier will yawn as he shuffles."),
    insure: () => T("Plan B activado. Si falla, conserva la vida.", "Plan B on. Miss and you keep your life."),
    pact: () => T("Pacto firmado. Quíntuple… o nada. Ni una ficha en la mesa.", "Pact signed. Five times… or nothing. Not one chip left on the table."),
    glass: () => T("Visión de Cristal. Lo más caro de la casa: no los pierda de vista.", "Crystal glasses. The dearest thing in the house: don't lose sight of them."),
  };
  const unlocking = (r) => Object.keys(E.SHOP).filter((id) => E.SHOP[id].at === r);
  const shopState = (id) => {
    const r = G.round ? G.round.r : 1, at = E.SHOP[id].at;
    const ok = E.canBuy(id, { r, chips: G.chips, buy: G.buy, over: false });
    return { at, locked: r < at, got: !!G.buy[id], ok, p: E.price(id, G.chips) };
  };
  // the shop: a row of neon icons; the icon buys, the little corner opens the card
  function paintShop() {
    k("shop").innerHTML = Object.keys(E.SHOP).map((id) => {
      const it = ITEMS[id], st = shopState(id);
      const cls = ["hs-n", st.locked ? "is-locked" : "", st.got ? "is-got" : "", !st.locked && !st.got && !st.ok ? "is-poor" : ""].join(" ");
      const tail = st.locked ? T(`R${st.at}`, `R${st.at}`) : st.got ? "✓" : fmt(st.p);
      return `<div class="${cls}" style="--c:${it.c}">
        <button type="button" class="hs-buy" data-buy="${id}" ${st.ok ? "" : "disabled"} aria-label="${it.n()} · ${it.t()} · ${tail}">${svgIcon(id, 30)}</button>
        <b class="hs-name">${it.n()}</b>
        <em>${tail}</em>
        <button type="button" class="hs-more" data-info="${id}" aria-label="${T("Info", "Info")}: ${it.n()}"><svg viewBox="0 0 20 20" aria-hidden="true"><circle cx="10" cy="10" r="8.2"/><path d="M10 9 V14.2"/><circle cx="10" cy="6" r="0.9" class="dot"/></svg></button>
      </div>`;
    }).join("");
  }
  // the card of a help: big, in its colour, like the plates of the guide
  const card = document.createElement("section");
  card.className = "house-card"; card.hidden = true;
  function openCard(id) {
    const it = ITEMS[id], st = shopState(id);
    card.style.setProperty("--c", it.c);
    card.innerHTML = `
      <header><span class="house-k">${T("Ayuda", "Help")} · ${T("ronda", "round")} ${st.at}+</span><button type="button" class="hc-x" aria-label="${T("Cerrar", "Close")}">✕</button></header>
      <div class="hc-body">
        <div class="hc-ico">${svgIcon(id, 150)}</div>
        <h3>${it.n()}</h3>
        <p class="hc-t">${it.t()}</p>
        <p class="hc-long">${it.long()}</p>
      </div>
      <footer>
        <div class="hc-price"><small>${T("Precio ahora", "Price now")}</small><b>${fmt(st.p)}</b><em>${Math.round(E.SHOP[id].pct * 100)}% ${T("de la mesa · mín.", "of the table · min.")} ${fmt(E.SHOP[id].min)}</em></div>
        <button type="button" class="hc-buy" data-cardbuy="${id}" ${st.ok && G.phase === "bet" ? "" : "disabled"}>${st.locked ? T(`Ronda ${st.at}`, `Round ${st.at}`) : st.got ? T("Activa", "Active") : !st.ok ? T("Sin fichas", "Not enough") : T("Comprar", "Buy")}</button>
      </footer>`;
    const m = root.querySelector(".house-machine"); m.scrollTop = 0; m.classList.add("is-guide");
    card.hidden = false; requestAnimationFrame(() => card.classList.add("on"));
  }
  function closeCard() {
    card.classList.remove("on"); root.querySelector(".house-machine").classList.remove("is-guide");
    setTimeout(() => { card.hidden = true; }, 350);
  }
  card.addEventListener("click", (e) => {
    e.stopPropagation();
    if (e.target.closest(".hc-x")) return closeCard();
    const b = e.target.closest("[data-cardbuy]");
    if (b && !b.disabled) { closeCard(); buyItem(b.dataset.cardbuy); }
  });
  root.querySelector(".house-machine").appendChild(card);
  async function buyItem(id) {
    if (G.phase !== "bet" || !E.canBuy(id, { r: G.round.r, chips: G.chips, buy: G.buy, over: false })) return;
    const before = G.chips;
    try {
      if (G.mode === "remote") { const j = await post({ op: "buy", id: G.id, item: id }); G.id = j.id; G.chips = j.chips; G.buy = j.buy || {}; }
      else { const st = { chips: G.chips, buy: G.buy }; E.buy(st, id); G.chips = st.chips; G.buy = st.buy; }
    } catch (e) { speak(T("La casa no le vende eso ahora.", "The house won't sell you that now.")); return; }
    countTo(before, G.chips); delta(G.chips - before);
    const sn = snd(); if (sn) { sn.chip(0.9); setTimeout(() => sn.chip(0.6), 90); }
    speak(BOUGHT[id]());
    render();
  }
  // the stake is no longer chosen: a quarter of the table; "all in" is only the last few chips
  const allIn = () => G.chips > 0 && E.stakeFor(G.chips) >= G.chips;
  const fmtMult = (m) => "×" + (Math.round(m * 100) / 100).toLocaleString(T("es-ES", "en-GB"), { maximumFractionDigits: 2 });

  /* ---------- the dice of the round ---------- */
  const DICE_UI = {
    one: { n: () => T("Un dado", "One die"), t: () => T("El de siempre", "The usual"), m: "×1" },
    decoy: { n: () => T("Señuelo", "Decoy"), t: () => T("Un dado negro de engaño", "A black decoy die"), m: "×2" },
    pair: { n: () => T("Pareja", "Pair"), t: () => T("Dos dados: acierta los dos", "Two dice: find both"), m: "×3" },
    colors: { n: () => T("Colores", "Colours"), t: () => T("Blanco ×1 · rojo ×3 · oro ×10", "White ×1 · red ×3 · gold ×10"), m: "×10" },
  };
  // which dice are on the felt this round: [element, glass, look]
  function diceOn(R, mode) {
    const l = [[die, R.d, ""]];
    if (mode === "decoy") l.push([xDice[0], R.x[0], "is-decoy"]);
    if (mode === "pair") l.push([xDice[0], R.x[0], ""]);
    if (mode === "colors") l.push([xDice[0], R.x[0], "is-red"], [xDice[1], R.x[1], "is-gold"]);
    return l;
  }
  function paintDice() {
    const R = G.round, st = { r: R.r };
    if (!E.diceOk(G.dice, st, R)) G.dice = "one";
    k("dice").innerHTML = Object.keys(E.DICE).map((id) => {
      const d = E.DICE[id], ui = DICE_UI[id], ok = E.diceOk(id, st, R), on = G.dice === id;
      const why = R.r < d.at ? T(`Ronda ${d.at}`, `Round ${d.at}`) : !ok ? T(`${d.cups} vasos`, `${d.cups} glasses`) : ui.m;
      return `<button type="button" role="radio" aria-checked="${on}" class="hd-${id}${on ? " is-on" : ""}${ok ? "" : " is-locked"}" data-dice="${id}" ${ok ? "" : "disabled"}>
        <span class="hd-ico" aria-hidden="true">${id === "colors" ? "<i></i><i></i><i></i>" : id === "pair" || id === "decoy" ? "<i></i><i></i>" : "<i></i>"}</span>
        <b>${ui.n()}</b><small>${ok ? ui.t() : T("Se desbloquea", "Unlocks")}</small><em>${why}</em></button>`;
    }).join("");
    const n = R.n, can = E.canAddGlass({ r: R.r, add: G.add, over: false });
    const gb = root.querySelector("[data-glass]");
    gb.disabled = !can;
    k("glassInfo").textContent = can ? T(`${n} → ${n + 1} vasos, para toda la partida`, `${n} → ${n + 1} glasses, for the rest of the game`) : T(`Mesa llena: ${E.MAX_CUPS} vasos`, `Table full: ${E.MAX_CUPS} glasses`);
  }
  function paintMult(bump) {
    const el = k("mult");
    el.textContent = fmtMult(G.mult);
    const box = el.parentElement;
    box.classList.toggle("is-hot", G.mult >= 5); box.classList.toggle("is-wild", G.mult >= 25);
    if (bump) { box.classList.remove("bump"); void box.offsetWidth; box.classList.add("bump"); }
  }
  async function addGlass() {
    if (G.phase !== "bet" || !E.canAddGlass({ r: G.round.r, add: G.add, over: false })) return;
    try {
      if (G.mode === "remote") { const j = await post({ op: "glass", id: G.id }); G.id = j.id; G.mult = j.mult; G.round = j.round; G.add += 1; }
      else { const st = { add: G.add, mult: G.mult }; E.addGlass(st); G.add = st.add; G.mult = st.mult; G.round = E.round(G.round.r, Math.random, G.add); }
    } catch (e) { speak(T("No cabe ni un vaso más.", "Not one more glass fits.")); return; }
    buildCups(G.round.n); slotOf = cups.map((_, i) => i); place();
    const sn = snd(); if (sn) sn.glass(0.8);
    paintMult(true);
    speak(pick(T([`Un vaso más sobre la mesa. Multiplicador ${fmtMult(G.mult)}.`, `${G.round.n} vasos. Más difícil… y ${fmtMult(G.mult)}.`, `La casa sonríe: otro vaso. ${fmtMult(G.mult)}.`], [`One more glass on the table. Multiplier ${fmtMult(G.mult)}.`, `${G.round.n} glasses. Harder… and ${fmtMult(G.mult)}.`, `The house smiles: another glass. ${fmtMult(G.mult)}.`])));
    render();
  }

  function render() {
    const R = G.round;
    k("chips").textContent = fmt(G.chips);
    k("round").textContent = R ? R.r : 1;
    k("best").textContent = fmt(G.record);
    k("lives").innerHTML = Array.from({ length: E.LIVES }, (_, i) => `<i class="${i < G.lives ? "on" : ""}">♥</i>`).join("");
    ["chips", "best"].forEach((x) => k(x).classList.toggle("is-long", k(x).textContent.length > 9));
    const fx = Object.assign({}, G.shown, G.buy); // what this round bought, until its reveal is over
    root.classList.toggle("is-crystal", !!fx.glass);
    root.classList.toggle("is-lucky", !!fx.lucky);
    // with the coloured dice the white one stays white, whatever the mode (in god mode it would look gold)
    root.classList.toggle("is-colors", G.dice === "colors" || G.dice === "pair");
    const betting = G.phase === "bet";
    betBox.hidden = !betting;
    if (betting) {
      G.bet = E.stakeFor(G.chips);
      const pay = R ? R.pay : 1, top = G.dice === "colors" ? 10 : E.DICE[G.dice].mult;
      const win = E.gainFor(G.buy, G.bet, pay, top, G.mult), lose = E.lossFor(G.buy, G.bet, G.chips);
      k("betInfo").textContent = T(`Te juegas ${fmt(G.bet)} · ganarías ${G.dice === "colors" ? "hasta " : ""}${fmt(win)} · si fallas −${fmt(lose)}${G.buy.insure ? "" : " y una vida"}`, `You stake ${fmt(G.bet)} · you'd win ${G.dice === "colors" ? "up to " : ""}${fmt(win)} · a miss costs ${fmt(lose)}${G.buy.insure ? "" : " and a life"}`);
      paintDice();
      paintShop();
    }
    paintMult();
    // the stake on the felt while the round plays
    const playing = ["show", "shuffle", "pick", "reveal"].includes(G.phase);
    const tags = Object.keys(G.buy).filter((id) => G.buy[id] && ITEMS[id]).map((id) => ITEMS[id].n()).join(" · ");
    k("pot").textContent = playing ? T(`En juego ${fmt(G.bet)}`, `At stake ${fmt(G.bet)}`) + (G.dice !== "one" ? " · " + DICE_UI[G.dice].n() : "") + (tags ? " · " + tags : "") : "";
    root.classList.toggle("is-allin", (betting || playing) && allIn());
    const A = {
      idle: [["start", T("Sentarse con 100 fichas", "Sit down with 100 chips"), true]],
      bet: [["bet", allIn() ? T("Últimas fichas", "Last chips") + " →" : T("Jugar ronda", "Play the round") + " →", true], ...(G.won ? [["cashout", T("Retirarse", "Cash out"), false]] : [])],
      over: [
        ...(G.cp > 1 ? [["resume", T(`Volver a la ronda ${G.cp}`, `Back to round ${G.cp}`) + " ↺", !canSign()]] : []),
        ["again", G.cp > 1 ? T("Desde cero", "From scratch") : T("Otra partida", "Play again"), !canSign() && !(G.cp > 1)],
      ],
    }[G.phase] || [];
    actions.innerHTML = A.map(([a, label, main]) => `<button type="button" data-a="${a}" class="${main ? "is-main" : ""}${a === "bet" && allIn() ? " is-allin" : ""}">${label}</button>`).join("");
    cups.forEach((c) => { c.disabled = G.phase !== "pick"; });
    root.classList.toggle("is-picking", G.phase === "pick");
    sign.hidden = !canSign();
    paintRank();
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
  function dieUnder(cup, el = die) { el.style.transform = `translateX(${xOf(slotOf[cup])}px)`; }
  function placeDice(R, mode) {
    xDice.forEach((x) => { x.className = "shell-die is-x"; });
    diceOn(R, mode).forEach(([el, cup, look]) => { if (look) el.classList.add(look); dieUnder(cup, el); });
  }
  const diceShow = (on) => { die.classList.toggle("on", on); xDice.forEach((x) => x.classList.toggle("on", on && x.classList.length > 2)); };
  addEventListener("resize", () => { place(); if (G.round) placeDice(G.round, G.dice); });

  // one move of the croupier: the glasses that change slot travel in an arc, one in front, one behind
  // one move of the croupier. To keep a crowded table readable:
  //  · glasses going right always pass in front (lower, bigger), glasses going left behind (higher, smaller)
  //  · the longer the trip, the wider the arc, so the paths don't overlap
  //  · the more glasses move at once, the longer the move takes, with a breath between passes
  async function move(p, ms) {
    const next = slotOf.map((s) => p[s]);
    const travelling = cups.map((c, i) => [c, i]).filter(([, i]) => next[i] !== slotOf[i]);
    const crowd = travelling.length;
    const dur = Math.round(ms * Math.min(1.8, 1 + 0.16 * Math.max(0, crowd - 2)));
    const s = snd(); if (s) s.glass(0.35);
    // crystal glasses: every die travels with its glass
    if (G.buy.glass && G.round) diceOn(G.round, G.dice).forEach(([el, cup]) => {
      if (next[cup] === slotOf[cup]) return;
      const x0 = xOf(slotOf[cup]), x1 = xOf(next[cup]);
      el.animate([{ transform: `translateX(${x0}px)` }, { transform: `translateX(${x1}px)` }], { duration: dur, easing: "cubic-bezier(0.45, 0, 0.25, 1)" })
        .finished.catch(() => {}).then(() => { el.style.transform = `translateX(${x1}px)`; });
    });
    const step = gap();
    await Promise.all(travelling.map(([c, i]) => {
      const x0 = xOf(slotOf[i]), x1 = xOf(next[i]), front = x1 > x0;
      const reach = Math.abs(x1 - x0) / step; // how many glasses it travels
      const lift = reduce ? 0 : (front ? 1 : -1) * (6 + reach * 7);
      const scale = reduce ? 1 : (front ? 1.03 + reach * 0.02 : 0.97 - reach * 0.02);
      c.style.zIndex = front ? 3 : 1;
      const a = c.animate([
        { transform: `translateX(${x0}px)` },
        { transform: `translate(${(x0 + x1) / 2}px, ${lift}px) scale(${scale})`, offset: 0.5 },
        { transform: `translateX(${x1}px)` },
      ], { duration: dur, easing: "cubic-bezier(0.45, 0, 0.25, 1)" });
      return a.finished.catch(() => {}).then(() => { c.style.transform = `translateX(${x1}px)`; });
    }));
    slotOf = next;
    if (crowd >= 4 && !reduce) await wait(Math.min(140, 40 + crowd * 14));
  }
  const lift = (c, on) => c.classList.toggle("up", on);

  /* ---------- a game ---------- */
  async function newGame(fromCp) {
    const cp = fromCp ? G.cp : 1, cpId = fromCp ? G.cpId : null, wasLocal = G.mode === "local";
    Object.assign(G, { signed: false, chips: E.START, best: E.START, won: 0, bet: 25, recordShown: false, safe: 0, buy: {}, shown: {}, cashed: false, mult: 1, add: 0, spun: 0, dice: "one", picks: [], lives: E.LIVES, streak: 0, played: 0, allinWins: 0, low: E.START, tier: 0, got: new Set() });
    try {
      if (cp > 1 && (wasLocal || !cpId)) throw Object.assign(new Error("local"), { status: 503 });
      const j = await post(cp > 1 ? { op: "start", from: cpId } : { op: "start" });
      G.mode = "remote"; G.id = j.id; G.round = j.round;
      fetchBoard().then((b) => paintMe(b.me)).catch(() => {});
    } catch (e) {
      G.mode = "local"; G.id = null; G.round = E.round(cp, Math.random, 0);
      if (e.status !== 503) speak(LINES.offline());
    }
    buildCups(G.round.n); slotOf = cups.map((_, i) => i); place();
  }
  function toBet() {
    G.phase = "bet"; G.picks = [];
    // the wheel: every five rounds, free, it only multiplies
    if (E.wheelDue({ r: G.round.r, spun: G.spun, over: false })) setTimeout(openWheel, 700);
    buildCups(G.round.n); slotOf = cups.map((_, i) => i); place();
    render();
    const r = G.round.r;
    [[5, "r5"], [10, "r10"], [15, "r15"], [20, "r20"], [30, "r30"]].forEach(([n, id]) => { if (r >= n) award(id); });
    const opens = unlocking(r);
    const extra = opens.length ? T(`Nueva ayuda en la tienda: ${ITEMS[opens[0]].n()}.`, `New help in the shop: ${ITEMS[opens[0]].n()}.`) : r % 4 === 0 ? skillLine() : r % 3 === 0 ? stackLine() : null;
    speak(r > 1 && G.round.n > 3 && r % 10 === 0 ? T(`Ronda ${r}: entra un vaso más. La mesa paga ×${G.round.pay}.`, `Round ${r}: one more glass. The table pays ×${G.round.pay}.`) : extra || LINES.bet());
  }

  async function playRound() {
    const R = G.round;
    if (allIn()) { speak(LINES.allin()); await wait(reduce ? 200 : 900); }
    G.phase = "show"; render();
    slotOf = cups.map((_, i) => i); place(); placeDice(R, G.dice);
    diceShow(true);
    cups.forEach((c) => lift(c, true));
    speak(LINES.watch());
    await wait(R.r === 1 ? 1300 : 950);
    cups.forEach((c) => lift(c, false));
    { const s = snd(); if (s) s.thud(0.5); }
    await wait(420);
    if (!G.buy.glass) diceShow(false);
    G.phase = "shuffle"; render(); speak(LINES.shuffle());
    await wait(260);
    for (const p of R.moves) await move(p, G.buy.slow ? R.ms * 2 : R.ms);
    G.phase = "pick"; render();
    // the tip-off: the house lifts one empty glass and leaves it up
    if (G.buy.hint) {
      const busy = diceOn(R, G.dice).map(([, c]) => c);
      const empty = cups.map((_, i) => i).filter((i) => !busy.includes(i));
      const out = empty[Math.floor(Math.random() * empty.length)];
      lift(cups[out], true); cups[out].disabled = true; cups[out].classList.add("is-out");
      speak(T("El Tercer Ojo lo ha visto: ese no es.", "The Third Eye saw it: not that one."));
    } else speak(G.dice === "pair" ? T("Dos vasos. Los dos con dado.", "Two glasses. Both with a die.") : G.dice === "colors" ? T("¿El blanco, el rojo… o el de oro?", "The white, the red… or the gold?") : G.dice === "decoy" ? T("El blanco. No el negro.", "The white one. Not the black.") : LINES.ask());
  }

  async function choose(cup) {
    if (G.phase !== "pick" || (cups[cup] && cups[cup].classList.contains("is-out"))) return;
    // the pair: two glasses, one after the other
    if (G.dice === "pair") {
      if (G.picks.includes(cup)) { G.picks = G.picks.filter((c) => c !== cup); cups[cup].classList.remove("is-chosen"); return; }
      G.picks.push(cup); cups[cup].classList.add("is-chosen");
      if (G.picks.length < 2) { speak(T("Uno. Falta el otro.", "One. Now the other.")); return; }
    } else G.picks = [cup];
    G.phase = "reveal"; render();
    const R = G.round, bet = E.stakeFor(G.chips), before = G.chips, wasAllIn = allIn(), mode = G.dice, picks = G.picks.slice();
    G.lastR = R.r;
    let res;
    try {
      if (G.mode === "remote") { res = await post({ op: "pick", id: G.id, cups: picks, mode }); G.id = res.id; }
      else {
        const st = { r: R.r, chips: G.chips, best: G.best, won: G.won, buy: G.buy, over: false, mult: G.mult, add: G.add, lives: G.lives };
        const { ok, dm } = E.settle(st, R, picks, mode);
        res = { ok, dm, lives: st.lives, d: R.d, x: R.x, chips: st.chips, safe: 0, best: st.best, won: st.won, mult: st.mult, round: st.over ? null : E.round(R.r + 1, Math.random, G.add) };
      }
    } catch (e) {
      speak(T("Algo se ha caído de la mesa. Vuelve a intentarlo.", "Something fell off the table. Try again."));
      G.phase = "over"; render(); return;
    }
    placeDice(R, mode); diceShow(true);
    cups.forEach((c) => c.classList.remove("is-chosen"));
    picks.forEach((c) => lift(cups[c], true));
    const livesBefore = G.lives; if (res.lives != null) G.lives = res.lives;
    G.chips = res.chips; G.best = res.best; G.won = res.won; G.safe = res.safe != null ? res.safe : G.safe;
    G.shown = G.buy; G.buy = {};
    const s = snd();
    const diff = G.chips - before;
    countTo(before, G.chips);
    G.played++;
    G.streak = res.ok ? Math.max(1, G.streak + 1) : Math.min(-1, G.streak - 1);
    if (res.ok) {
      if (s) { s.chip(1); setTimeout(() => s.chip(0.7), 120); }
      burst(diff >= 100 || G.streak >= 3); delta(diff);
      if (wasAllIn) G.allinWins++;
      const st = G.streak;
      if (mode === "colors" && res.dm >= 3) rain(res.dm === 10 ? 4 : 2, res.dm === 10 ? T("×10 · Dado de oro", "×10 · Golden die") : T("×3 · Dado rojo", "×3 · Red die"), "+" + fmt(diff));
      speak(mode === "colors" && res.dm === 10 ? T(`¡El dorado! ×10. +${fmt(diff)}.`, `The gold one! ×10. +${fmt(diff)}.`)
        : mode === "colors" && res.dm === 3 ? T(`El rojo: ×3. +${fmt(diff)}.`, `The red one: ×3. +${fmt(diff)}.`)
        : wasAllIn && G.allinWins === 1 ? (G.tier >= 4 ? T(`Un acto de fe… y el cielo paga. +${fmt(diff)}.`, `An act of faith… and heaven pays. +${fmt(diff)}.`) : G.tier === 3 ? T(`Le ha vendido el alma al vaso correcto. +${fmt(diff)}.`, `You sold your soul to the right glass. +${fmt(diff)}.`) : T(`¡Todo o nada… y es todo! +${fmt(diff)}.`, `All or nothing… and it's all! +${fmt(diff)}.`))
        : st === 3 ? T(`Tres seguidas. Está en llamas. +${fmt(diff)}.`, `Three in a row. You're on fire. +${fmt(diff)}.`)
        : st === 5 ? T(`Cinco seguidas. La casa llama al encargado. +${fmt(diff)}.`, `Five in a row. The house calls the manager. +${fmt(diff)}.`)
        : st === 8 ? T(`Ocho seguidas. Esto ya no es normal. +${fmt(diff)}.`, `Eight in a row. This isn't normal. +${fmt(diff)}.`)
        : st >= 10 && st % 2 === 0 && G.tier >= 4 ? T(`${st} seguidas. Ya no es suerte: es fe. +${fmt(diff)}.`, `${st} in a row. Not luck anymore: faith. +${fmt(diff)}.`)
        : st >= 10 && st % 2 === 0 ? T(`${st} seguidas. ¿Ha hecho usted un pacto? +${fmt(diff)}.`, `${st} in a row. Did you make a pact? +${fmt(diff)}.`)
        : G.low < 20 && before < 100 && G.chips >= 100 ? T(`De las cenizas. Vuelve a las ${fmt(G.chips)}.`, `From the ashes. Back to ${fmt(G.chips)}.`)
        : mode === "colors" && res.dm === 10 ? T(`¡El dorado! ×10. +${fmt(diff)}.`, `The gold one! ×10. +${fmt(diff)}.`)
        : mode === "colors" && res.dm === 3 ? T(`El rojo: ×3. +${fmt(diff)}.`, `The red one: ×3. +${fmt(diff)}.`)
        : mode === "pair" ? T(`Los dos. ×3. +${fmt(diff)}.`, `Both of them. ×3. +${fmt(diff)}.`)
        : LINES.right(fmt(diff)));
    } else {
      if (s) s.thud(1);
      shake(); delta(diff);
      await wait(520);
      diceOn(R, mode).forEach(([, c]) => lift(cups[c], true));
      const st = -G.streak;
      speak(G.chips > 0 && st === 3 ? T(`Tres fallos. Respire hondo. −${fmt(-diff)}.`, `Three misses. Breathe. −${fmt(-diff)}.`)
        : G.chips > 0 && st >= 5 ? T(`La casa le invita a una copa. Y se queda ${fmt(-diff)}.`, `The house buys you a drink. And keeps ${fmt(-diff)}.`)
        : LINES.wrong(fmt(-diff)));
      if (G.lives < livesBefore && G.lives > 0) setTimeout(() => speak(G.lives === 1 ? T("Última vida. Piénselo bien.", "Last life. Think hard.") : T(`Le quedan ${G.lives} vidas.`, `${G.lives} lives left.`)), 1400);
      else if (G.lives === livesBefore && G.lives > 0) setTimeout(() => speak(T("El Plan B le salva la vida.", "Plan B saves your life.")), 1400);
    }
    G.low = Math.min(G.low, G.chips);
    if (res.ok) {
      award("first");
      if (G.streak >= 3) award("hot3"); if (G.streak >= 5) award("hot5"); if (G.streak >= 8) award("hot8"); if (G.streak >= 12) award("hot12");
      if (wasAllIn) award("allin"); if (G.allinWins >= 3) award("allin3");
      if (G.low < 20 && G.chips >= 100) award("phoenix");
      if (G.played === 10 && G.won === 10) award("perfect");
    }
    [[200, "c200"], [500, "c500"], [1000, "c1000"], [5000, "c5000"], [25000, "c25000"], [100000, "c100000"]].forEach(([n, id]) => { if (G.chips >= n) award(id); });
    if (G.chips === 666) award("beast");

    G.round = res.round;
    render();
    await wait(1300);
    cups.forEach((c) => lift(c, false));
    await wait(380);
    diceShow(false);
    cups.forEach((c) => { c.classList.remove("is-out", "is-chosen"); });
    G.shown = {}; root.classList.remove("is-crystal", "is-lucky");
    if (!G.round) {
      G.phase = "over"; keepCheckpoint();
      const sc = await finalScore();
      (window.WOBLO_TRACK && window.WOBLO_TRACK("game", `«La casa»: ${fmt(sc)} fichas (ronda ${G.lastR})`));
      speak(LINES.broke() + (canSign() ? " " + T("Apunta tus iniciales.", "Sign with your initials.") : ""));
      render();
      if (!sign.hidden) setTimeout(() => nameIn.focus({ preventScroll: true }), 200);
      return;
    }
    // the milestones: a rain of chips at 5, 10, 15, 20, and every ten after, each grander than the last
    const r = G.round.r, lv = r === 5 ? 1 : r === 10 ? 2 : r === 15 ? 4 : r >= 20 && r % 10 === 0 ? 5 : 0;
    if (lv) await rain(lv, T(`Ronda ${r}`, `Round ${r}`), {
      1: T("La casa empieza a sudar", "The house starts to sweat"),
      2: T("Entra un vaso más · la mesa arde", "One more glass · the table burns"),
      4: T("Modo diablo", "Devil mode"),
      5: r === 20 ? T("Modo dios", "God mode") : r === 30 ? T("Omnisciente", "Omniscient") : T("El cielo se rinde", "Heaven gives in"),
    }[lv]);
    toBet();
  }

  /* ---------- the wheel: every five rounds, free; it only multiplies ---------- */
  const wheel = document.createElement("section");
  wheel.className = "house-wheel"; wheel.hidden = true;
  {
    const total = E.WHEEL.reduce((a, w) => a + w[1], 0);
    let a0 = 0;
    const slices = E.WHEEL.map(([m, w], i) => {
      const a1 = a0 + (w / total) * 360, mid = (a0 + a1) / 2, rad = (d) => ((d - 90) * Math.PI) / 180, R = 100;
      const p = (d, r) => `${(120 + Math.cos(rad(d)) * r).toFixed(2)} ${(120 + Math.sin(rad(d)) * r).toFixed(2)}`;
      const big = a1 - a0 > 180 ? 1 : 0;
      const cls = m >= 10 ? "is-gold" : m >= 5 ? "is-hot" : i % 2 ? "is-b" : "is-a";
      const out = { a0, a1, html: `<path class="${cls}" d="M120 120 L${p(a0, R)} A${R} ${R} 0 ${big} 1 ${p(a1, R)} Z"/><text class="${cls}" x="${p(mid, 72).split(" ")[0]}" y="${p(mid, 72).split(" ")[1]}" transform="rotate(${mid} ${p(mid, 72)})">${fmtMult(m)}</text>` };
      a0 = a1; return out;
    });
    wheel._slices = slices;
    wheel.innerHTML = `
      <header><span class="house-k">${T("La ruleta de la casa", "The house wheel")}</span></header>
      <div class="hw-stage">
        <i class="hw-pin" aria-hidden="true"></i>
        <svg viewBox="0 0 240 240" aria-hidden="true"><g class="hw-disc">${slices.map((x) => x.html).join("")}<circle cx="120" cy="120" r="100" class="hw-rim"/><circle cx="120" cy="120" r="16" class="hw-hub"/></g></svg>
      </div>
      <p class="hw-say">${T("Cada cinco rondas, la casa le deja girar. Aquí nada resta: todo multiplica.", "Every five rounds the house lets you spin. Nothing here takes away: it all multiplies.")}</p>
      <footer><button type="button" class="hw-go is-main">${T("Girar", "Spin")}</button></footer>`;
  }
  async function openWheel() {
    if (G.phase !== "bet" || !wheel.hidden) return;
    const m = root.querySelector(".house-machine"); m.scrollTop = 0; m.classList.add("is-guide");
    wheel.hidden = false; requestAnimationFrame(() => wheel.classList.add("on"));
    wheel.querySelector(".hw-disc").style.transition = "none"; wheel.querySelector(".hw-disc").style.transform = "rotate(0deg)";
    const go = wheel.querySelector(".hw-go"); go.disabled = false; go.textContent = T("Girar", "Spin"); go.dataset.state = "spin";
    wheel.querySelector(".hw-say").textContent = T("Cada cinco rondas, la casa le deja girar. Aquí nada resta: todo multiplica.", "Every five rounds the house lets you spin. Nothing here takes away: it all multiplies.");
    go.focus({ preventScroll: true });
  }
  async function spinWheel() {
    const go = wheel.querySelector(".hw-go");
    if (go.dataset.state === "done") { closeWheel(); return; }
    if (G.wheelBusy) return;
    G.wheelBusy = true; go.disabled = true;
    let w;
    try {
      if (G.mode === "remote") { const j = await post({ op: "spin", id: G.id }); G.id = j.id; w = j; }
      else { const st = { r: G.round.r, spun: G.spun, mult: G.mult, over: false }; const x = E.spin(st, Math.random); w = Object.assign(x, { mult: st.mult }); }
    } catch (e) { G.wheelBusy = false; G.spun = G.round.r; closeWheel(); return; }
    G.spun = G.round.r;
    const sl = wheel._slices[w.i], at = sl.a0 + (sl.a1 - sl.a0) * Math.min(0.85, Math.max(0.15, w.frac || 0.5));
    const disc = wheel.querySelector(".hw-disc");
    const sn = snd();
    if (sn) for (let i = 0; i < 14; i++) setTimeout(() => sn.chip(0.4), i * (60 + i * 18));
    void disc.getBoundingClientRect();
    disc.style.transition = reduce ? "none" : "transform 4.2s cubic-bezier(0.12, 0.7, 0.1, 1)";
    disc.style.transform = `rotate(${360 * 6 - at}deg)`;
    await wait(reduce ? 200 : 4400);
    G.mult = w.mult; G.wheelBusy = false;
    paintMult(true);
    if (sn && sn.burst && w.m >= 5) sn.burst();
    wheel.querySelector(".hw-say").textContent = w.m >= 10 ? T(`¡La dorada! ${fmtMult(w.m)}. Su multiplicador: ${fmtMult(G.mult)}.`, `The golden one! ${fmtMult(w.m)}. Your multiplier: ${fmtMult(G.mult)}.`)
      : T(`${fmtMult(w.m)}. Su multiplicador ahora es ${fmtMult(G.mult)}.`, `${fmtMult(w.m)}. Your multiplier is now ${fmtMult(G.mult)}.`);
    go.disabled = false; go.dataset.state = "done"; go.textContent = T("Seguir jugando", "Keep playing") + " →";
    if (w.m >= 5) rain(w.m >= 10 ? 4 : 2, fmtMult(w.m), T("La ruleta multiplica", "The wheel multiplies"));
    render();
  }
  function closeWheel() {
    wheel.classList.remove("on"); root.querySelector(".house-machine").classList.remove("is-guide");
    setTimeout(() => { wheel.hidden = true; }, 350);
    speak(T(`Multiplicador ${fmtMult(G.mult)}. A jugar.`, `Multiplier ${fmtMult(G.mult)}. Let's play.`));
  }
  wheel.addEventListener("click", (e) => { e.stopPropagation(); if (e.target.closest(".hw-go")) spinWheel(); });
  root.querySelector(".house-machine").appendChild(wheel);

  // a finished game leaves a checkpoint five rounds before where it ended (only for this visit)
  function keepCheckpoint() { G.cp = E.checkpoint(G.lastR); G.cpId = G.id; }
  // the end of a game: the score, and the great rain if it beats your best
  async function finalScore() {
    const sc = scoreNow();
    if (sc > G.record && sc > 0) {
      G.record = sc; store.set(BEST_KEY, String(sc)); flashBest(); render();
      await wait(400); rain(3, T("Nuevo récord", "New record"), T(`${fmt(sc)} fichas`, `${fmt(sc)} chips`));
    }
    return sc;
  }
  async function act(a) {
    if (a === "resume" && G.phase === "over" && G.cp > 1) {
      actions.innerHTML = "";
      cups.forEach((c) => lift(c, false)); die.classList.remove("on");
      await newGame(true);
      toBet();
      speak(T(`De vuelta en la ronda ${G.round.r}, con 100 fichas. La mesa paga ×${G.round.pay}.`, `Back at round ${G.round.r}, with 100 chips. The table pays ×${G.round.pay}.`));
      return;
    }
    if (a === "start" || a === "again") {
      actions.innerHTML = "";
      cups.forEach((c) => lift(c, false)); die.classList.remove("on");
      if (a === "again" || !G.mode) await newGame();
      return toBet();
    }
    if (a === "bet" && G.phase === "bet") {
      return playRound();
    }
    if (a === "cashout" && G.phase === "bet") {
      try { if (G.mode === "remote") { const j = await post({ op: "cashout", id: G.id }); G.id = j.id; } } catch (e) { /* the server keeps the game */ }
      G.cashed = true; G.phase = "over"; keepCheckpoint(); render();
      const sc = await finalScore();
      (window.WOBLO_TRACK && window.WOBLO_TRACK("game", `«La casa»: se retira con ${fmt(sc)} fichas (ronda ${G.lastR})`));
      speak(LINES.cashed(sc) + (canSign() ? " " + T("Apunta tus iniciales.", "Sign with your initials.") : ""));
      render();
      if (!sign.hidden) setTimeout(() => nameIn.focus({ preventScroll: true }), 200);
    }
  }

  // the bet controls
  root.addEventListener("click", (e) => {
    const inf = e.target.closest("[data-info]");
    if (inf) { openCard(inf.dataset.info); return; }
    const it = e.target.closest("[data-buy]");
    if (it && !it.disabled) { buyItem(it.dataset.buy); return; }
    const dc = e.target.closest("[data-dice]");
    if (dc && !dc.disabled && G.phase === "bet") { G.dice = dc.dataset.dice; const sn = snd(); if (sn) sn.chip(0.5); render(); return; }
    if (e.target.closest("[data-glass]") && G.phase === "bet") { addGlass(); return; }
  });

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
  if (/^(localhost|127.0.0.1)$/.test(location.hostname)) { window.__houseRain = rain; window.__house = { G, E, render, award, jump: (r) => { G.round = E.round(r, Math.random, G.add); toBet(); } }; }

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
      k("boardNote").textContent = T("El ranking no se reinicia nunca. Cuenta las fichas con las que te retiras de cada partida. Las rondas, los dados, la ruleta y las ayudas las comprueba el servidor.", "The board never resets. It counts the chips you cash out with in each game. Rounds, dice, the wheel and the helps are checked by the server.");
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
    if (e.key === "Escape") { if (!guide.hidden) return closeGuide(); if (!card.hidden) return closeCard(); return close(); }
    // 1…n pick the glass standing in that place, left to right
    if (G.phase === "pick" && /^[1-6]$/.test(e.key) && e.target !== nameIn) {
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
