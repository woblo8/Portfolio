/* ============================================================
   LA CASA — the rules, shared by the browser and the server.
   One pure function: (state, action, a roll()) → new state,
   the rolls that happened, and what the croupier says.
   On the server the rolls come from crypto, so the ranking
   cannot be faked; in the browser the same rules run offline.
   ============================================================ */
(function (root, make) {
  if (typeof module === "object" && module.exports) module.exports = make();
  else root.HouseEngine = make();
})(typeof self !== "undefined" ? self : this, function () {
  "use strict";
  const START = 100;
  const BETS = ["10", "25", "50", "all"];

  function newGame() {
    return { chips: START, best: START, hand: 1, phase: "bet", bet: 0, you: 0, house: 0, acts: 0 };
  }
  function endHand(s) {
    if (s.chips <= 0) { s.chips = 0; s.phase = "over"; }
    else { s.hand += 1; s.phase = "bet"; }
  }
  const raiseBest = (s) => { if (s.chips > s.best) s.best = s.chips; };

  // a: "roll" | "stand" | "double" | "collect"; opt.bet: "10" | "25" | "50" | "all"
  function step(prev, a, opt, roll) {
    const s = Object.assign({}, prev);
    const ev = []; // [who, value]: who is "you", "house" or "double"
    let say;
    if (a === "roll") {
      if (s.phase === "bet") {
        const key = String(opt && opt.bet);
        if (BETS.indexOf(key) < 0) throw new Error("bad-bet");
        const b = key === "all" ? s.chips : Math.min(s.chips, Number(key));
        if (!(b >= 1)) throw new Error("bad-bet");
        s.bet = b; s.you = 0; s.house = 0; s.phase = "turn";
      } else if (s.phase !== "turn") throw new Error("bad-phase");
      const v = roll();
      ev.push(["you", v]);
      if (v === 1) { s.chips -= s.bet; say = ["bust", s.bet]; endHand(s); }
      else { s.you += v; say = [s.you >= 18 ? "bold" : "more"]; }
    } else if (a === "stand") {
      if (s.phase !== "turn") throw new Error("bad-phase");
      for (let guard = 0; guard < 60; guard++) {
        const v = roll();
        ev.push(["house", v]);
        if (v === 1) { s.chips += s.bet; raiseBest(s); say = ["houseBust", s.bet]; s.phase = "won"; break; }
        s.house += v;
        if (s.house > s.you) { s.chips -= s.bet; say = ["houseWins", s.house, s.bet]; endHand(s); break; }
      }
    } else if (a === "double") {
      if (s.phase !== "won") throw new Error("bad-phase");
      const v = roll();
      ev.push(["double", v]);
      if (v >= 4) { s.chips += s.bet; raiseBest(s); say = ["doubled", v, s.bet]; s.bet *= 2; s.phase = "won"; }
      else { s.chips -= s.bet; say = ["lostDouble", v, s.bet]; endHand(s); }
    } else if (a === "collect") {
      if (s.phase !== "won") throw new Error("bad-phase");
      say = ["collect"]; endHand(s);
    } else throw new Error("bad-action");
    s.acts += 1;
    return { s, ev, say };
  }

  return { START, BETS, newGame, step };
});
