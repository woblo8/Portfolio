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
  return { START, round, msFor, cupsFor, payFor, minBet, checkpoint };
});
