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
  // speed: the first round is gentle, then every round is quicker and longer (a new glass eases it a little)
  const msFor = (r) => Math.max(150, Math.round(560 - (r - 1) * 30 + (cupsFor(r) - 3) * 60));
  const movesFor = (r) => Math.min(4 + r, 26);

  // rnd(): a float in [0, 1). A move is a permutation: the glass in slot k goes to slot p[k].
  // add: glasses the player has added to the table (they stay for the rest of the game)
  const MAX_CUPS = 7;
  const cupsAt = (r, add) => Math.min(MAX_CUPS, cupsFor(r) + (add || 0));
  function round(r, rnd, add) {
    const n = cupsAt(r, add), moves = [];
    const idx = () => Math.floor(rnd() * n);
    for (let i = 0, m = movesFor(r); i < m; i++) {
      const p = Array.from({ length: n }, (_, k) => k);
      if (n >= 4) {
        // four glasses or more: every glass moves on every move, so more glasses really is harder.
        // Either they all swap in pairs at once (an odd one out joins a little circle of three),
        // or they all go round one big circle (a cycle through every glass, none stays put).
        const order = p.slice();
        for (let k = n - 1; k > 0; k--) { const j = Math.floor(rnd() * (k + 1)); [order[k], order[j]] = [order[j], order[k]]; }
        if (rnd() < 0.65) {
          let k = 0;
          if (n % 2) { const [a, b, c] = order; p[a] = b; p[b] = c; p[c] = a; k = 3; }
          for (; k < n; k += 2) { const a = order[k], b = order[k + 1]; p[a] = b; p[b] = a; }
        } else {
          for (let k = 0; k < n; k++) p[order[k]] = order[(k + 1) % n];
        }
      } else if (r >= 5 && rnd() < 0.25) {
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
    return { r, n, d, x: [x0, x1], moves, ms: msFor(r), pay: payFor(cupsFor(r)) };
  }
  // kept for old clients; the stake is no longer chosen
  const minBet = (chips) => Math.max(1, Math.min(chips, Math.ceil(chips / 10)));
  // the stake is fixed: a quarter of the table (at least 10, or all of it when less is left)
  const stakeFor = (chips) => (chips <= 10 ? chips : Math.max(10, Math.ceil(chips * 0.25)));
  // where you sit back down after a game ends at round `last`: five rounds earlier (1 means no checkpoint)
  const checkpoint = (last) => Math.max(1, Math.floor(last) - 5);

  /* ---------- multipliers ----------
     The game multiplier starts at ×1 and only grows:
       · every glass you add to the table: ×1.5, for good (up to seven glasses)
       · the wheel, every five rounds: ×1.2 to ×10, it never takes anything away
     The dice of each round (a choice before each round, unlocked as you go):
       one    · 1  · one white die                                     ×1
       decoy  · 3  · a black decoy die too: pick it and you miss        ×2
       pair   · 6  · two white dice: you pick two glasses, both must hit ×3
       colors · 10 · white ×1, red ×3, gold ×10 under three glasses; needs 5 glasses or more */
  const GLASS_MULT = 1.5;
  const DICE = {
    one: { at: 1, mult: 1 },
    decoy: { at: 3, mult: 2 },
    pair: { at: 6, mult: 3 },
    colors: { at: 10, mult: 1, cups: 5 },
  };
  const COLORS = [1, 3, 10]; // white, red, gold
  const diceOk = (mode, s, R) => !!DICE[mode] && s.r >= DICE[mode].at && R.n >= (DICE[mode].cups || 3);
  const canAddGlass = (s) => !s.over && cupsAt(s.r, s.add) < MAX_CUPS;
  function addGlass(s) { s.add = (s.add || 0) + 1; s.mult = round2((s.mult || 1) * GLASS_MULT); }
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
       insure  · 12 · a miss costs only half the stake
       pact    · 15 · the pact with the devil: a hit pays ×5, a miss takes every chip on the table
       glass   · 20 · crystal glasses: you see the dice all the way (the dearest of all)
     The score of a game is the table when you cash out; if you go broke it is 0. */
  const SHOP = {
    hint: { at: 5, pct: 0.35, min: 150 },
    lucky: { at: 8, pct: 0.45, min: 300 },
    slow: { at: 10, pct: 0.4, min: 400 },
    insure: { at: 12, pct: 0.35, min: 500 },
    pact: { at: 15, pct: 0.3, min: 666 },
    glass: { at: 20, pct: 0.85, min: 2500 },
  };
  const price = (item, chips) => Math.max(SHOP[item].min, Math.ceil(chips * SHOP[item].pct));
  const canBuy = (item, s) => !!SHOP[item] && !s.over && s.r >= SHOP[item].at && !(s.buy || {})[item] && s.chips - price(item, s.chips) >= 1;
  function buy(s, item) { const p = price(item, s.chips); s.chips -= p; s.buy = Object.assign({}, s.buy, { [item]: 1 }); return p; }
  // the safe is gone: nothing can be put away any more (kept so old clients get a clear no)
  const canSave = () => false;
  function save(s, amount) { s.chips -= amount; s.safe = (s.safe || 0) + amount; }

  // one hand: picks is a list of glasses (two for the pair), mode the dice of the round
  function judge(mode, R, picks) {
    const p = picks.map(Number);
    if (mode === "pair") return p.length === 2 && p[0] !== p[1] && p.includes(R.d) && p.includes(R.x[0]) ? 3 : 0;
    if (mode === "colors") { const c = p[0]; return c === R.d ? COLORS[0] : c === R.x[0] ? COLORS[1] : c === R.x[1] ? COLORS[2] : 0; }
    return p[0] === R.d ? DICE[mode].mult : 0;
  }
  const gainFor = (b, stake, pay, diceMult, mult) => Math.round(stake * pay * diceMult * (mult || 1) * (b.lucky ? 3 : 1) * (b.pact ? 5 : 1));
  function lossFor(b, stake, chips) {
    if (b.pact) return chips;
    return Math.min(chips, b.insure ? Math.ceil(stake / 2) : stake);
  }
  function settle(s, R, picks, mode) {
    const b = s.buy || {}, stake = stakeFor(s.chips), dm = judge(mode, R, picks), ok = dm > 0;
    const delta = ok ? gainFor(b, stake, R.pay, dm, s.mult) : -lossFor(b, stake, s.chips);
    s.chips += delta;
    if (ok) s.won += 1;
    s.r += 1; s.buy = {};
    if (s.chips <= 0) { s.chips = 0; s.over = true; }
    s.best = Math.max(s.best, s.chips + (s.safe || 0));
    return { ok, delta, dm, stake };
  }
  const score = (s) => (s.cashed ? s.chips : 0);
  return { START, round, msFor, cupsFor, cupsAt, MAX_CUPS, payFor, minBet, stakeFor, checkpoint, GLASS_MULT, DICE, COLORS, diceOk, canAddGlass, addGlass, WHEEL, wheelDue, spin, SHOP, price, canBuy, buy, canSave, save, judge, gainFor, lossFor, settle, score };
});
