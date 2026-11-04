/* ============================================================
   LA CASA — ¿Dónde está el dado? The rounds, shared by the
   browser and the server. A round: which glass hides the die,
   the moves the croupier makes, and how fast. Given the same
   random numbers, both sides build exactly the same round.
   ============================================================ */
(function (root, make) {
  if (typeof module === "object" && module.exports) module.exports = make();
  else root.HouseEngine = make();
})(typeof self !== "undefined" ? self : this, function () {
  "use strict";
  // speed: the first round is gentle, then every round is quicker and longer
  const msFor = (r) => Math.max(150, Math.round(560 - (r - 1) * 34));
  const movesFor = (r) => Math.min(4 + r, 24);

  // rnd(): a float in [0, 1). A move is a permutation: the glass in slot k goes to slot p[k].
  function round(r, rnd) {
    const moves = [];
    for (let i = 0, n = movesFor(r); i < n; i++) {
      if (r >= 5 && rnd() < 0.25) moves.push(rnd() < 0.5 ? [1, 2, 0] : [2, 0, 1]); // all three at once
      else {
        const a = Math.floor(rnd() * 3); let b = Math.floor(rnd() * 2); if (b >= a) b += 1;
        const p = [0, 1, 2]; p[a] = b; p[b] = a; moves.push(p);
      }
    }
    return { r, d: Math.floor(rnd() * 3), moves, ms: msFor(r) };
  }
  return { round, msFor };
});
