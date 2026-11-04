// Vercel serverless function: "La casa", played on the server so the ranking can be trusted.
// The browser only says what it does (roll, stand, double, collect); every roll is made
// here with crypto and the game state never leaves the server. Storage: Upstash Redis
// (KV_REST_API_URL / KV_REST_API_TOKEN or UPSTASH_REDIS_REST_URL / _TOKEN), or, without it,
// Vercel Blob with a signed game state (see below).
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
const board = (flat) => { const out = []; for (let i = 0; i < (flat || []).length; i += 2) { const [name, , p] = String(flat[i]).split("·"); out.push({ name, score: Number(flat[i + 1]), p: p || "" }); } return out; };

// ---------- without Redis: Vercel Blob, and a game that travels signed ----------
// The state goes to the browser sealed with an HMAC (the key never leaves the server),
// and every roll is derived from that seal: sending an old state back gives the same
// dice again, so there is nothing to win by replaying. Only signed scores reach the board,
// stored as tiny files whose names carry the score (listing them is the leaderboard).
const SECRET = () => crypto.createHash("sha256").update("woblo-house:" + (process.env.HOUSE_SECRET || process.env.BLOB_READ_WRITE_TOKEN || "")).digest();
const b64 = (b) => Buffer.from(b).toString("base64url");
function seal(s) {
  const body = b64(JSON.stringify(s));
  return `${body}.${b64(crypto.createHmac("sha256", SECRET()).update(body).digest()).slice(0, 32)}`;
}
function unseal(tok) {
  const [body, sig] = String(tok || "").split(".");
  if (!body || !sig || body.length > 2000) return null;
  const want = b64(crypto.createHmac("sha256", SECRET()).update(body).digest()).slice(0, 32);
  if (sig.length !== want.length || !crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(want))) return null;
  try { return JSON.parse(Buffer.from(body, "base64url").toString()); } catch (e) { return null; }
}
// one stream of dice per kind of roll, so a peek at your next roll says nothing about the house's
function dice(s, a) {
  const k = a === "stand" ? "h" : a === "double" ? "d" : "p";
  s.n = s.n || { p: 0, h: 0, d: 0 };
  return () => {
    const i = s.n[k]++;
    const h = crypto.createHmac("sha256", SECRET()).update(`${s.g}:${k}:${i}`).digest();
    return 1 + (h.readUInt32BE(0) % 6);
  };
}
// the player's id never leaves as such: rows only say whether they are yours
function player(req) {
  const q = String((req.query && req.query.p) || new URL(req.url || "/", "http://x").searchParams.get("p") || "");
  return /^[a-f0-9]{12}$/.test(q) ? q : "";
}
const strip = (l, p) => l.slice(0, 10).map((r) => (p && r.p === p ? { name: r.name, score: r.score, me: true } : { name: r.name, score: r.score }));
function mine(l, p) { const i = l.findIndex((r) => r.p === p); return i < 0 ? null : { name: l[i].name, score: l[i].score, rank: i + 1 }; }
let boardCache = { at: 0, data: null };
async function blobBoard(force) {
  if (!force && boardCache.data && Date.now() - boardCache.at < 20000) return boardCache.data;
  const { list } = await import("@vercel/blob");
  const read = async (prefix) => {
    const out = []; let cursor;
    do {
      const page = await list({ prefix, cursor, limit: 1000 });
      for (const b of page.blobs) {
        const m = b.pathname.slice(prefix.length).match(/^(\d{7})-([A-Z]{3})-([a-f0-9]{8})(?:-([a-f0-9]{12}))?/);
        if (m) out.push({ name: m[2], score: Number(m[1]), g: m[3], p: m[4] || "" });
      }
      cursor = page.hasMore ? page.cursor : undefined;
    } while (cursor);
    return out.sort((x, y) => y.score - x.score);
  };
  const [week, all] = await Promise.all([read(`house/w/${weekKey()}/`), read("house/a/")]);
  boardCache = { at: Date.now(), data: { week, all } };
  return boardCache.data;
}
async function blobHandler(req, res, body) {
  if (req.method === "GET") {
    const { week, all } = await blobBoard(/[?&]fresh=1/.test(req.url || ""));
    const p = player(req);
    res.status(200).json({ week: strip(week, p), all: strip(all, p), me: p ? { week: mine(week, p), all: mine(all, p) } : null, weekKey: weekKey() });
    return;
  }
  if (body.op === "start") {
    const s = Object.assign(E.newGame(), { g: crypto.randomBytes(4).toString("hex"), t: Date.now() });
    res.status(200).json({ id: seal(s), s: pub(s) });
    return;
  }
  const s = unseal(body.id);
  if (!s || !/^[a-f0-9]{8}$/.test(s.g || "")) { res.status(400).json({ error: "bad-id" }); return; }
  if (Date.now() - (s.t || 0) > GAME_TTL * 1000) { res.status(404).json({ error: "no-game" }); return; }
  if (body.op === "act") {
    if (s.submitted) { res.status(409).json({ error: "finished" }); return; }
    let out;
    try { out = E.step(s, String(body.a), { bet: body.bet }, dice(s, String(body.a))); }
    catch (e) { res.status(400).json({ error: e.message }); return; }
    out.s.n = s.n; out.s.g = s.g; out.s.t = s.t;
    res.status(200).json({ id: seal(out.s), s: pub(out.s), ev: out.ev, say: out.say });
    return;
  }
  if (body.op === "submit") {
    const name = String(body.name || "").toUpperCase().normalize("NFD").replace(/[̀-ͯ]/g, "");
    if (!/^[A-Z]{3}$/.test(name)) { res.status(400).json({ error: "bad-name" }); return; }
    if (BLOCKED.has(name)) { res.status(400).json({ error: "blocked-name" }); return; }
    if (s.acts < 3) { res.status(400).json({ error: "too-short" }); return; }
    const { put, list } = await import("@vercel/blob");
    const seen = await list({ prefix: `house/g/${s.g}`, limit: 1 });
    if (seen.blobs.length) { res.status(409).json({ error: "already" }); return; }
    const p = /^[a-f0-9]{12}$/.test(String(body.p || "")) ? body.p : "";
    const file = `${String(Math.min(9999999, s.best)).padStart(7, "0")}-${name}-${s.g}${p ? "-" + p : ""}.txt`;
    const opts = { access: "public", addRandomSuffix: false, contentType: "text/plain" };
    await Promise.all([
      put(`house/g/${s.g}.txt`, "1", opts),
      put(`house/w/${weekKey()}/${file}`, "1", opts),
      put(`house/a/${file}`, "1", opts),
    ]);
    const { week } = await blobBoard(true);
    const i = week.findIndex((r) => r.g === s.g);
    s.submitted = true; s.phase = "over";
    res.status(200).json({ rank: i < 0 ? null : i + 1, score: s.best, s: pub(s), id: seal(s) });
    return;
  }
  res.status(400).json({ error: "bad-op" });
}

module.exports = async (req, res) => {
  res.setHeader("Cache-Control", "no-store");
  const R = redis();
  if (!R) {
    if (!process.env.BLOB_READ_WRITE_TOKEN) { res.status(503).json({ error: "storage-not-configured" }); return; }
    let body = req.body;
    if (typeof body === "string") { try { body = JSON.parse(body); } catch (e) { body = {}; } }
    try { await blobHandler(req, res, body || {}); } catch (e) { res.status(502).json({ error: "storage-unavailable" }); }
    return;
  }
  try {
    if (req.method === "GET") {
      const [week, all] = (await Promise.all([
        R("ZREVRANGE", `house:week:${weekKey()}`, 0, 999, "WITHSCORES"),
        R("ZREVRANGE", "house:all", 0, 999, "WITHSCORES"),
      ])).map(board);
      const p = player(req);
      res.status(200).json({ week: strip(week, p), all: strip(all, p), me: p ? { week: mine(week, p), all: mine(all, p) } : null, weekKey: weekKey() });
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
        const p = /^[a-f0-9]{12}$/.test(String(body.p || "")) ? body.p : "";
        const member = `${name}·${id.slice(0, 8)}${p ? "·" + p : ""}`, wk = `house:week:${weekKey()}`;
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
