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
    streak: 0, played: 0, allinWins: 0, low: E.START, tier: 0, got: new Set(),
    lastR: 0, cp: 1, cpId: null, // the checkpoint: where a finished game lets you sit back down
    record: Math.max(E.START, +(store.get(BEST_KEY) || 0)), // your best ever, in this browser
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
  async function newGame(fromCp) {
    const cp = fromCp ? G.cp : 1, cpId = fromCp ? G.cpId : null, wasLocal = G.mode === "local";
    Object.assign(G, { signed: false, chips: E.START, best: E.START, won: 0, bet: 25, recordShown: false, streak: 0, played: 0, allinWins: 0, low: E.START, tier: 0, got: new Set() });
    try {
      if (cp > 1 && (wasLocal || !cpId)) throw Object.assign(new Error("local"), { status: 503 });
      const j = await post(cp > 1 ? { op: "start", from: cpId } : { op: "start" });
      G.mode = "remote"; G.id = j.id; G.round = j.round;
      fetchBoard().then((b) => paintMe(b.me)).catch(() => {});
    } catch (e) {
      G.mode = "local"; G.id = null; G.round = E.round(cp, Math.random);
      if (e.status !== 503) speak(LINES.offline());
    }
    buildCups(G.round.n); slotOf = cups.map((_, i) => i); place();
  }
  function toBet() {
    G.phase = "bet";
    buildCups(G.round.n); slotOf = cups.map((_, i) => i); place();
    render();
    const r = G.round.r;
    [[5, "r5"], [10, "r10"], [15, "r15"], [20, "r20"], [30, "r30"]].forEach(([n, id]) => { if (r >= n) award(id); });
    const extra = r % 4 === 0 ? skillLine() : r % 3 === 0 ? stackLine() : null;
    speak(r > 1 && G.round.n > 3 && r % 10 === 0 ? T(`Ronda ${r}: entra un vaso más. La mesa paga ×${G.round.pay}.`, `Round ${r}: one more glass. The table pays ×${G.round.pay}.`) : extra || LINES.bet());
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
    const R = G.round, bet = G.bet, before = G.chips, wasAllIn = allIn();
    G.lastR = R.r;
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
    G.played++;
    G.streak = res.ok ? Math.max(1, G.streak + 1) : Math.min(-1, G.streak - 1);
    if (res.ok) {
      if (s) { s.chip(1); setTimeout(() => s.chip(0.7), 120); }
      burst(diff >= 100 || G.streak >= 3); delta(diff);
      if (wasAllIn) G.allinWins++;
      const st = G.streak;
      speak(wasAllIn && G.allinWins === 1 ? (G.tier >= 4 ? T(`Un acto de fe… y el cielo paga. +${fmt(diff)}.`, `An act of faith… and heaven pays. +${fmt(diff)}.`) : G.tier === 3 ? T(`Le ha vendido el alma al vaso correcto. +${fmt(diff)}.`, `You sold your soul to the right glass. +${fmt(diff)}.`) : T(`¡Todo o nada… y es todo! +${fmt(diff)}.`, `All or nothing… and it's all! +${fmt(diff)}.`))
        : st === 3 ? T(`Tres seguidas. Está en llamas. +${fmt(diff)}.`, `Three in a row. You're on fire. +${fmt(diff)}.`)
        : st === 5 ? T(`Cinco seguidas. La casa llama al encargado. +${fmt(diff)}.`, `Five in a row. The house calls the manager. +${fmt(diff)}.`)
        : st === 8 ? T(`Ocho seguidas. Esto ya no es normal. +${fmt(diff)}.`, `Eight in a row. This isn't normal. +${fmt(diff)}.`)
        : st >= 10 && st % 2 === 0 && G.tier >= 4 ? T(`${st} seguidas. Ya no es suerte: es fe. +${fmt(diff)}.`, `${st} in a row. Not luck anymore: faith. +${fmt(diff)}.`)
        : st >= 10 && st % 2 === 0 ? T(`${st} seguidas. ¿Ha hecho usted un pacto? +${fmt(diff)}.`, `${st} in a row. Did you make a pact? +${fmt(diff)}.`)
        : G.low < 20 && before < 100 && G.chips >= 100 ? T(`De las cenizas. Vuelve a las ${fmt(G.chips)}.`, `From the ashes. Back to ${fmt(G.chips)}.`)
        : LINES.right(fmt(diff)));
    } else {
      if (s) s.thud(1);
      shake(); delta(diff);
      await wait(520);
      lift(cups[res.d], true);
      const st = -G.streak;
      speak(G.chips > 0 && st === 3 ? T(`Tres fallos. Respire hondo. −${fmt(-diff)}.`, `Three misses. Breathe. −${fmt(-diff)}.`)
        : G.chips > 0 && st >= 5 ? T(`La casa le invita a una copa. Y se queda ${fmt(-diff)}.`, `The house buys you a drink. And keeps ${fmt(-diff)}.`)
        : LINES.wrong(fmt(-diff)));
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
      G.phase = "over"; keepCheckpoint();
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
      2: T("Entra un vaso más · la mesa arde", "One more glass · the table burns"),
      4: T("Modo diablo", "Devil mode"),
      5: r === 20 ? T("Modo dios", "God mode") : r === 30 ? T("Omnisciente", "Omniscient") : T("El cielo se rinde", "Heaven gives in"),
    }[lv]);
    toBet();
  }

  // a finished game leaves a checkpoint five rounds before where it ended (only for this visit)
  function keepCheckpoint() { G.cp = E.checkpoint(G.lastR); G.cpId = G.id; }
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
      G.bet = clampBet(+betIn.value || G.bet);
      return playRound();
    }
    if (a === "cashout" && G.phase === "bet") {
      try { if (G.mode === "remote") { const j = await post({ op: "cashout", id: G.id }); G.id = j.id; } } catch (e) { /* the score is the best held; the server keeps it */ }
      G.phase = "over"; keepCheckpoint();
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
  if (/^(localhost|127.0.0.1)$/.test(location.hostname)) { window.__houseRain = rain; window.__house = { G, E, render, award, jump: (r) => { G.round = E.round(r, Math.random); toBet(); } }; }

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
