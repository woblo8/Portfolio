/* ============================================================
   LA CASA — ¿Dónde está el dado? The rules, shared by the
   browser and the server. A round: how many glasses, which one
   hides the die, the moves the croupier makes, how fast, and
   what a right guess pays. Given the same random numbers, both
   sides build exactly the same round.
   ============================================================ */
(function (root, make) {
  if (typeof module === "object" && module.exports) module.exports = make();
  else root.HouseEngine = make();
})(typeof self !== "undefined" ? self : this, function () {
  "use strict";
  const START = 100;                                                   // chips at the start of a game
  // one more glass every ten rounds (4 from round 10, 5 from 20…), up to six
  const cupsFor = (r) => Math.min(6, 3 + Math.floor(r / 10));
  // a right guess pays the bet times this: harder table, better odds
  const payFor = (n) => n - 2;
  // a smooth curve: every round a little quicker (−4.5%) and a little longer, never a cliff
  //   round 1: 430 ms, 7 passes · round 10: 286 ms, 13 · round 20: 180 ms, 19 · round 30: 160 ms, 25
  const msFor = (r) => Math.max(160, Math.round(430 * Math.pow(0.955, r - 1)));
  const movesFor = (r) => Math.min(26, 7 + Math.floor(r * 0.6));
  // every glass on the table beyond three: each move 7% quicker
  const glassSpeed = (n) => Math.pow(0.93, Math.max(0, n - 3));

  // rnd(): a float in [0, 1). A move is a permutation: the glass in slot k goes to slot p[k].
  // add: glasses the player has added to the table (they stay for the rest of the game)
  // the player can add glasses (up to ten) or take them away (down to three)
  const MAX_CUPS = 10, MIN_CUPS = 3;
  const cupsAt = (r, add) => Math.max(MIN_CUPS, Math.min(MAX_CUPS, cupsFor(r) + (add || 0)));
  function round(r, rnd, add) {
    const n = cupsAt(r, add), moves = [];
    const idx = () => Math.floor(rnd() * n);
    // every glass on the table makes it harder, step by step: one more pass per glass, and from
    // four glasses on, more swaps at once and longer reaches (see stepMove)
    for (let i = 0, m = Math.min(44, movesFor(r) + (n - 3) * 2); i < m; i++) {
      const p = Array.from({ length: n }, (_, k) => k);
      if (n >= 4) {
        stepMove(p, n, r, rnd);
      } else if (r >= 2 && rnd() < 0.3) {
        // three glasses at once, round a little circle
        const a = idx(); let b = idx(); while (b === a) b = idx(); let c = idx(); while (c === a || c === b) c = idx();
        p[a] = b; p[b] = c; p[c] = a;
      } else {
        const a = idx(); let b = idx(); while (b === a) b = idx();
        p[a] = b; p[b] = a;
      }
      moves.push(p);
    }
    // where the dice sit: d is the white die; x holds the glasses of the other dice, used by the dice modes
    const d = idx();
    let x0 = idx(); while (x0 === d) x0 = idx();
    let x1 = idx(); while (x1 === d || x1 === x0) x1 = idx();
    return { r, n, d, x: [x0, x1], moves, ms: Math.max(130, Math.round(msFor(r) * glassSpeed(n))), pay: payFor(cupsFor(r)) };
  }
  /* four glasses or more. Every extra glass makes it considerably harder, four ways at once:
       swaps at once:  4–5 → 2 · 6–7 → 3 · 8–9 → 4 · 10 → 5 (almost every glass moves every pass)
       reach (how far a glass can jump): up to 5 glasses → 3 places · from 6 → anywhere on the table
       two more passes per glass, and each move 7% quicker (glassSpeed)
     Sometimes one swap becomes a little circle of three; on a crowded table the whole row
     sometimes slides one place. Every glass moves at most once per pass, so it can always be followed. */
  function stepMove(p, n, r, rnd) {
    if (n >= 7 && rnd() < 0.14) { const dir = rnd() < 0.5 ? 1 : -1; for (let k = 0; k < n; k++) p[k] = (k + dir + n) % n; return; }
    const swaps = Math.ceil((n - 1) / 2), reach = n <= 5 ? 3 : n - 1;
    const used = new Set();
    let circle = r >= 3 && rnd() < 0.25;
    for (let tries = 0, done = 0; done < swaps && tries < 80; tries++) {
      const a = Math.floor(rnd() * n), b = a + 1 + Math.floor(rnd() * reach);
      if (b >= n || used.has(a) || used.has(b)) continue;
      if (circle) {
        const c = b + 1 <= n - 1 && b + 1 - a <= reach ? b + 1 : a - 1 >= 0 && b - (a - 1) <= reach ? a - 1 : -1;
        if (c >= 0 && !used.has(c)) { used.add(a); used.add(b); used.add(c); p[a] = b; p[b] = c; p[c] = a; circle = false; done++; continue; }
      }
      used.add(a); used.add(b); p[a] = b; p[b] = a; done++;
    }
  }
  // the least time a round takes to be shown (the server refuses faster picks): half the shuffle, plus the peek
  const minPlayMs = (R) => Math.round(0.5 * R.moves.length * R.ms + 900);
  // a boss round every ten rounds: tricks on the felt, and a hit doubles the game multiplier
  const isBoss = (r) => r > 0 && r % 10 === 0;
  // kept for old clients; the stake is no longer chosen
  const minBet = (chips) => Math.max(1, Math.min(chips, Math.ceil(chips / 10)));
  // the stake is fixed: a quarter of the table (at least 10, or all of it when less is left)
  const stakeFor = (chips) => (chips <= 10 ? chips : Math.max(10, Math.ceil(chips * 0.25)));
  // where you sit back down after a game ends at round `last`: five rounds earlier (1 means no checkpoint)
  const checkpoint = (last) => Math.max(1, Math.floor(last) - 5);

  /* ---------- multipliers ----------
     The game multiplier starts at ×1 and only grows:
       · every glass you add to the table: ×1.3, for good (up to ten glasses)
       · the wheel, every five rounds: ×1.2 to ×10, it never takes anything away
     The dice of each round (a choice before each round, unlocked as you go):
       one    · 1  · one white die                                     ×1
       decoy  · 3  · two identical dice: the real one glints for a moment, remember it ×3
       pair   · 6  · two white dice: you pick two glasses, both must hit ×6
       trio   · 10 · three dice: you pick three glasses, all three must hit (6 glasses or more) ×15 */
  const GLASS_MULT = 1.3;
  const DICE = {
    one: { at: 1, mult: 1 },
    decoy: { at: 3, mult: 3 },
    pair: { at: 6, mult: 6 },
    trio: { at: 10, mult: 15, cups: 6 },
  };
  const COLORS = [1, 2, 5]; // (the old coloured dice, kept for old clients)
  const diceOk = (mode, s, R) => !!DICE[mode] && s.r >= DICE[mode].at && R.n >= (DICE[mode].cups || 3);
  const canAddGlass = (s) => !s.over && cupsAt(s.r, s.add) < MAX_CUPS;
  function addGlass(s) { s.add = (s.add || 0) + 1; s.mult = round2((s.mult || 1) * GLASS_MULT); }
  // taking a glass away divides the multiplier by the same 1.5 (it can drop under ×1)
  const canRemoveGlass = (s) => !s.over && cupsAt(s.r, s.add) > MIN_CUPS;
  function removeGlass(s) { s.add = (s.add || 0) - 1; s.mult = Math.max(0.01, round2((s.mult || 1) / GLASS_MULT)); }
  const round2 = (v) => Math.round(v * 100) / 100;
  // the wheel: equal slices except the big ones, which are narrow
  const WHEEL = [[1.2, 1], [2, 1], [1.5, 1], [3, 0.7], [1.2, 1], [5, 0.45], [1.5, 1], [2, 1], [1.2, 1], [10, 0.22]];
  const wheelDue = (s) => !s.over && s.r > 1 && (s.r - 1) % 5 === 0 && s.spun !== s.r;
  function spin(s, rnd) {
    const total = WHEEL.reduce((a, w) => a + w[1], 0);
    let t = rnd() * total, i = 0;
    while (t >= WHEEL[i][1] && i < WHEEL.length - 1) { t -= WHEEL[i][1]; i++; }
    s.spun = s.r; s.mult = round2((s.mult || 1) * WHEEL[i][0]);
    return { i, m: WHEEL[i][0], frac: (t / WHEEL[i][1]) };
  }

  /* the shop: helps bought with chips from the table, one of each per round, for the next hand.
     Each one opens at a round; the price is a share of your chips, with a floor.
       hint    · 5  · when you choose, the house lifts one empty glass
       lucky   · 8  · the charm: a hit pays ×3
       slow    · 10 · the croupier shuffles at half speed
       insure  · 12 · Plan B: a miss does not take a life
       pact    · 15 · the pact with the devil: a hit pays ×5, a miss takes every chip on the table
       glass   · 20 · crystal glasses: you see the dice all the way (the dearest of all)
     The score of a game is the table when you cash out; if you go broke it is 0. */
  // cd: once bought, rounds before it can be bought again (crystal: once every ten rounds)
  const SHOP = {
    hint: { at: 5, pct: 0.35, min: 150, cd: 3 },
    lucky: { at: 8, pct: 0.45, min: 300, cd: 4 },
    slow: { at: 10, pct: 0.4, min: 400, cd: 3 },
    insure: { at: 12, pct: 0.35, min: 500, cd: 5 },
    pact: { at: 15, pct: 0.3, min: 666, cd: 5 },
    glass: { at: 20, pct: 0.85, min: 2500, cd: 10 },
  };
  const readyAt = (item, s) => Math.max(SHOP[item].at, (s.cd || {})[item] || 0);
  const price = (item, chips) => Math.max(SHOP[item].min, Math.ceil(chips * SHOP[item].pct));
  const canBuy = (item, s) => !!SHOP[item] && !s.over && s.r >= readyAt(item, s) && !(s.buy || {})[item] && s.chips - price(item, s.chips) >= 1;
  function buy(s, item) {
    const p = price(item, s.chips); s.chips -= p;
    s.buy = Object.assign({}, s.buy, { [item]: 1 });
    s.cd = Object.assign({}, s.cd, { [item]: s.r + SHOP[item].cd });
    return p;
  }

  /* names on the board: three letters, and not these. Digits and symbols that stand for letters
     (0→O, 1→I, 3→E, 4→A, 5→S, 7→T, 8→B, @→A, $→S) are read as letters before checking. */
  const BAD = new Set(("ASS ARS FUK FUC FCK FUQ FUX SEX SXX XXX PUT PTA PTO CUL CLO ANL NAZ NZI KKK HTL ISI " +
    "POL POY PNE PEN PNS VRG VGA VRA CAC CCA MRD HDP HJP FAG NIG NGR NGA NGG MNG RAC " +
    "DIK DIC DCK COK COC CUM CUN CNT TIT TET TTA VAG VAJ CHT CNO CNY JOD JDR " +
    "WTF STF KYS KMS BBC BJS SUK SUC SCK PIJ PJA CPN SLT TWT HOE CAG CGO CBR PRN " +
    "GAY GEI GAI GAE HMO MRC MRK MKN TRL SXY BCH BTC WHR").trim().split(" "));
  const LEET = { 0: "O", 1: "I", 3: "E", 4: "A", 5: "S", 7: "T", 8: "B", "@": "A", $: "S", "!": "I", "|": "I" };
  function nameCheck(raw) {
    const up = String(raw || "").toUpperCase().normalize("NFD").replace(/[̀-ͯ]/g, "");
    const read = up.replace(/[0134578@$!|]/g, (c) => LEET[c]);
    if (/[^A-Z]/.test(up)) return { ok: false, why: /[0-9@$!|]/.test(up) ? "digits" : "letters" };
    if (up.length !== 3) return { ok: false, why: "length" };
    if (BAD.has(read) || (read[0] === read[1] && read[1] === read[2])) return { ok: false, why: "blocked" };
    return { ok: true, name: up };
  }
  // the safe is gone: nothing can be put away any more (kept so old clients get a clear no)
  const canSave = () => false;
  function save(s, amount) { s.chips -= amount; s.safe = (s.safe || 0) + amount; }

  // one hand: picks is a list of glasses (two for the pair), mode the dice of the round
  function judge(mode, R, picks) {
    const p = picks.map(Number);
    if (mode === "pair") return p.length === 2 && p[0] !== p[1] && p.includes(R.d) && p.includes(R.x[0]) ? DICE.pair.mult : 0;
    if (mode === "trio") return p.length === 3 && new Set(p).size === 3 && [R.d, R.x[0], R.x[1]].every((c) => p.includes(c)) ? DICE.trio.mult : 0;
    return p[0] === R.d ? DICE[mode].mult : 0;
  }
  const gainFor = (b, stake, pay, diceMult, mult) => Math.round(stake * pay * diceMult * (mult || 1) * (b.lucky ? 3 : 1) * (b.pact ? 5 : 1));
  /* three lives: a miss takes one life and half the table. The third miss ends the game, and the
     table goes with it (a game you don't cash out scores 0). Plan B keeps the life (you still lose
     half); the infernal pact takes the whole table, and with it the game. */
  const LIVES = 3;
  function lossFor(b, stake, chips) {
    if (b.pact) return chips;
    return Math.min(chips, Math.ceil(chips / 2));
  }
  function settle(s, R, picks, mode) {
    const b = s.buy || {}, stake = stakeFor(s.chips), dm = judge(mode, R, picks), ok = dm > 0;
    if (s.lives == null) s.lives = LIVES;
    const delta = ok ? gainFor(b, stake, R.pay, dm, s.mult) : -lossFor(b, stake, s.chips);
    s.chips += delta;
    if (ok) { s.won += 1; if (isBoss(R.r)) s.mult = round2((s.mult || 1) * 2); }
    else if (!b.insure) s.lives -= 1;
    s.r += 1; s.buy = {};
    if (s.lives <= 0) s.chips = 0;
    if (s.chips <= 0) { s.chips = 0; s.over = true; }
    s.best = Math.max(s.best, s.chips);
    return { ok, delta, dm, stake, lives: s.lives };
  }
  const score = (s) => (s.cashed ? s.chips : 0);
  return { minPlayMs, isBoss, MIN_CUPS, canRemoveGlass, removeGlass, readyAt, nameCheck, START, LIVES, round, msFor, cupsFor, cupsAt, MAX_CUPS, payFor, minBet, stakeFor, checkpoint, GLASS_MULT, DICE, COLORS, diceOk, canAddGlass, addGlass, WHEEL, wheelDue, spin, SHOP, price, canBuy, buy, canSave, save, judge, gainFor, lossFor, settle, score };
});
