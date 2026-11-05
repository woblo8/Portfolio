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
  function round(r, rnd) {
    const n = cupsFor(r), moves = [];
    const idx = () => Math.floor(rnd() * n);
    for (let i = 0, m = movesFor(r); i < m; i++) {
      const p = Array.from({ length: n }, (_, k) => k);
      if (r >= 5 && rnd() < 0.25) {
        // three glasses at once, round a little circle
        const a = idx(); let b = idx(); while (b === a) b = idx(); let c = idx(); while (c === a || c === b) c = idx();
        p[a] = b; p[b] = c; p[c] = a;
      } else {
        const a = idx(); let b = idx(); while (b === a) b = idx();
        p[a] = b; p[b] = a;
      }
      moves.push(p);
    }
    return { r, n, d: idx(), moves, ms: msFor(r), pay: payFor(n) };
  }
  // the smallest bet: a tenth of the stack (so nobody climbs the board without risk), at least 1
  const minBet = (chips) => Math.max(1, Math.min(chips, Math.ceil(chips / 10)));
  // where you sit back down after a game ends at round `last`: five rounds earlier (1 means no checkpoint)
  const checkpoint = (last) => Math.max(1, Math.floor(last) - 5);
  /* the shop: helps bought with chips from the table, one of each per round, for the next hand.
     Each one opens at a round; the price is a share of your chips, with a floor.
       double  · 3  · a hit pays twice, a miss costs twice
       hint    · 5  · when you choose, the house lifts one empty glass
       gold    · 8  · the golden die: a hit pays ×3
       slow    · 10 · the croupier shuffles at half speed
       insure  · 12 · a miss costs only half the bet
       pact    · 15 · the pact with the devil: a hit pays ×5, a miss takes every chip on the table
       glass   · 20 · crystal glasses: you see the die all the way (the dearest of all)
     And the safe: chips put there are yours for good. The score of a game is the safe,
     plus the table if you cash out; if you go broke you keep only the safe. */
  const SHOP = {
    double: { at: 3, pct: 0.25, min: 60 },
    hint: { at: 5, pct: 0.35, min: 150 },
    gold: { at: 8, pct: 0.45, min: 300 },
    slow: { at: 10, pct: 0.4, min: 400 },
    insure: { at: 12, pct: 0.35, min: 500 },
    pact: { at: 15, pct: 0.3, min: 666 },
    glass: { at: 20, pct: 0.85, min: 2500 },
  };
  const price = (item, chips) => Math.max(SHOP[item].min, Math.ceil(chips * SHOP[item].pct));
  const canBuy = (item, s) => !!SHOP[item] && !s.over && s.r >= SHOP[item].at && !(s.buy || {})[item] && s.chips - price(item, s.chips) >= 1;
  function buy(s, item) { const p = price(item, s.chips); s.chips -= p; s.buy = Object.assign({}, s.buy, { [item]: 1 }); return p; }
  const canSave = (s, amount) => !s.over && Number.isInteger(amount) && amount >= 1 && amount <= s.chips - 1;
  function save(s, amount) { s.chips -= amount; s.safe = (s.safe || 0) + amount; }
  // one hand: what the table pays or takes, with the helps bought for it
  const gainFor = (b, bet, pay) => bet * pay * (b.gold ? 3 : 1) * (b.double ? 2 : 1) * (b.pact ? 5 : 1);
  function lossFor(b, bet, chips) {
    if (b.pact) return chips;
    let l = bet * (b.double ? 2 : 1);
    if (b.insure) l = Math.ceil(l / 2);
    return Math.min(chips, l);
  }
  function settle(s, R, cup, bet) {
    const b = s.buy || {}, ok = cup === R.d;
    const delta = ok ? gainFor(b, bet, R.pay) : -lossFor(b, bet, s.chips);
    s.chips += delta;
    if (ok) s.won += 1;
    s.r += 1; s.buy = {};
    if (s.chips <= 0) { s.chips = 0; s.over = true; }
    s.best = Math.max(s.best, s.chips + (s.safe || 0));
    return { ok, delta };
  }
  const score = (s) => (s.safe || 0) + (s.cashed ? s.chips : 0);
  return { START, round, msFor, cupsFor, payFor, minBet, checkpoint, SHOP, price, canBuy, buy, canSave, save, gainFor, lossFor, settle, score };
});
