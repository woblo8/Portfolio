// Vercel serverless function: "La casa", played on the server so the ranking can be trusted.
// The browser only says what it does (roll, stand, double, collect); every roll is made
// here with crypto and the game state never leaves the server. Storage: Upstash Redis
// (KV_REST_API_URL / KV_REST_API_TOKEN or UPSTASH_REDIS_REST_URL / _TOKEN).
//
//   GET  /api/house                 → { week: [...], all: [...] }   top 10 of the week and of all time
//   POST /api/house { op: "start" } → { id, s }
//   POST /api/house { op: "act", id, a, bet } → { s, ev, say }
//   POST /api/house { op: "submit", id, name } → { rank, score }   name: three letters A–Z
const crypto = require("crypto");
const E = require("../house-engine.js");

const GAME_TTL = 6 * 3600;           // an abandoned game disappears after six hours
const STARTS_PER_HOUR = 40;          // per address: enough to play, too few to farm
const BLOCKED = new Set(["ASS", "FUK", "FUC", "FCK", "SEX", "PUT", "PTA", "CUL", "NAZ", "KKK", "COÑ", "POL", "PIS", "CAC", "MRD", "HDP", "FAG", "DIK", "DIC", "COK", "CUM", "TIT", "WTF"]);

function redis() {
  const url = process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token) return null;
  return async (...command) => {
    const r = await fetch(url, { method: "POST", headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" }, body: JSON.stringify(command) });
    if (!r.ok) throw new Error(`redis ${r.status}`);
    return (await r.json()).result;
  };
}
// the ISO week, so the weekly board turns over on Monday
function weekKey(d = new Date()) {
  const t = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
  const day = t.getUTCDay() || 7;
  t.setUTCDate(t.getUTCDate() + 4 - day);
  const y = t.getUTCFullYear(), w = Math.ceil(((t - Date.UTC(y, 0, 1)) / 864e5 + 1) / 7);
  return `${y}-W${String(w).padStart(2, "0")}`;
}
const roll = () => crypto.randomInt(1, 7);
const pub = (s) => ({ chips: s.chips, best: s.best, hand: s.hand, phase: s.phase, bet: s.bet, you: s.you, house: s.house, submitted: !!s.submitted });
const board = (flat) => { const out = []; for (let i = 0; i < (flat || []).length; i += 2) out.push({ name: String(flat[i]).split("·")[0], score: Number(flat[i + 1]) }); return out; };

module.exports = async (req, res) => {
  res.setHeader("Cache-Control", "no-store");
  const R = redis();
  if (!R) { res.status(503).json({ error: "storage-not-configured" }); return; }
  try {
    if (req.method === "GET") {
      const [week, all] = await Promise.all([
        R("ZREVRANGE", `house:week:${weekKey()}`, 0, 9, "WITHSCORES"),
        R("ZREVRANGE", "house:all", 0, 9, "WITHSCORES"),
      ]);
      res.status(200).json({ week: board(week), all: board(all), weekKey: weekKey() });
      return;
    }
    if (req.method !== "POST") { res.setHeader("Allow", "GET, POST"); res.status(405).json({ error: "method not allowed" }); return; }
    let body = req.body;
    if (typeof body === "string") { try { body = JSON.parse(body); } catch (e) { body = {}; } }
    body = body || {};

    if (body.op === "start") {
      const ip = String(req.headers["x-forwarded-for"] || "").split(",")[0].trim() || "anon";
      const hour = `house:ip:${crypto.createHash("sha256").update(ip).digest("hex").slice(0, 16)}:${Math.floor(Date.now() / 36e5)}`;
      const n = await R("INCR", hour);
      if (n === 1) await R("EXPIRE", hour, 3600);
      if (n > STARTS_PER_HOUR) { res.status(429).json({ error: "too-many-games" }); return; }
      const id = crypto.randomBytes(12).toString("hex");
      const s = E.newGame();
      await R("SET", `house:g:${id}`, JSON.stringify(s), "EX", GAME_TTL);
      res.status(200).json({ id, s: pub(s) });
      return;
    }

    const id = String(body.id || "");
    if (!/^[a-f0-9]{24}$/.test(id)) { res.status(400).json({ error: "bad-id" }); return; }
    // one request at a time per game: nobody gets to see two futures
    const lock = `house:lock:${id}`;
    if ((await R("SET", lock, "1", "NX", "PX", 4000)) !== "OK") { res.status(409).json({ error: "busy" }); return; }
    try {
      const raw = await R("GET", `house:g:${id}`);
      if (!raw) { res.status(404).json({ error: "no-game" }); return; }
      const s = JSON.parse(raw);

      if (body.op === "act") {
        if (s.submitted) { res.status(409).json({ error: "finished" }); return; }
        let out;
        try { out = E.step(s, String(body.a), { bet: body.bet }, roll); }
        catch (e) { res.status(400).json({ error: e.message }); return; }
        await R("SET", `house:g:${id}`, JSON.stringify(out.s), "EX", GAME_TTL);
        res.status(200).json({ s: pub(out.s), ev: out.ev, say: out.say });
        return;
      }

      if (body.op === "submit") {
        const name = String(body.name || "").toUpperCase().normalize("NFD").replace(/[̀-ͯ]/g, "");
        if (!/^[A-Z]{3}$/.test(name)) { res.status(400).json({ error: "bad-name" }); return; }
        if (BLOCKED.has(name)) { res.status(400).json({ error: "blocked-name" }); return; }
        if (s.submitted) { res.status(409).json({ error: "already" }); return; }
        if (s.acts < 3) { res.status(400).json({ error: "too-short" }); return; }
        // submitting ends the game: the score is the most chips held
        s.submitted = true; s.phase = "over";
        const member = `${name}·${id.slice(0, 8)}`, wk = `house:week:${weekKey()}`;
        await Promise.all([
          R("SET", `house:g:${id}`, JSON.stringify(s), "EX", GAME_TTL),
          R("ZADD", wk, s.best, member),
          R("ZADD", "house:all", s.best, member),
          R("EXPIRE", wk, 60 * 60 * 24 * 21),
        ]);
        const rank = await R("ZREVRANK", wk, member);
        res.status(200).json({ rank: rank == null ? null : rank + 1, score: s.best, s: pub(s) });
        return;
      }
      res.status(400).json({ error: "bad-op" });
    } finally {
      await R("DEL", lock).catch(() => {});
    }
  } catch (e) {
    res.status(502).json({ error: "storage-unavailable" });
  }
};
