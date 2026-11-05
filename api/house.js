// Vercel serverless function: "La casa — ¿Dónde está el dado?"
// The server deals every round (how many glasses, which one hides the die, the moves, the speed),
// checks every bet and every pick and keeps the chips, so a score on the board means that game
// was really played. The game state travels to the browser sealed with an HMAC (the key never
// leaves the server). The score is the table when you cash out; going broke scores 0.
// The board lives in Upstash Redis when it is configured (KV_REST_API_URL / _TOKEN or
// UPSTASH_REDIS_REST_URL / _TOKEN) and otherwise in Vercel Blob (BLOB_READ_WRITE_TOKEN).
//
//   GET  /api/house?p=<player>            → { week, all, me }   top 10s, and where you stand
//   POST /api/house { op: "start" }        → { id, round }
//   POST /api/house { op: "pick", id, cup, bet } → { ok, d, chips, best, id, round? }
//   POST /api/house { op: "buy", id, item } → { id, chips, paid, buy }   a help for the next hand
//   POST /api/house { op: "cashout", id } → { id, score }   stop and keep the table too
//   POST /api/house { op: "submit", id, name, p } → { rank, score }   name: three letters A–Z
const crypto = require("crypto");
const E = require("../house-engine.js");

const GAME_TTL = 6 * 3600 * 1000;    // an abandoned game expires after six hours
const BLOCKED = new Set(["ASS", "FUK", "FUC", "FCK", "SEX", "PUT", "PTA", "CUL", "NAZ", "KKK", "POL", "PIS", "CAC", "MRD", "HDP", "FAG", "DIK", "DIC", "COK", "CUM", "TIT", "WTF"]);

// ---------- the seal ----------
const SECRET = () => crypto.createHash("sha256").update("woblo-house:" + (process.env.HOUSE_SECRET || process.env.BLOB_READ_WRITE_TOKEN || process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN || "")).digest();
const mac = (t) => crypto.createHmac("sha256", SECRET()).update(t).digest();
function seal(s) { const body = Buffer.from(JSON.stringify(s)).toString("base64url"); return `${body}.${mac(body).toString("base64url").slice(0, 32)}`; }
function unseal(tok) {
  const [body, sig] = String(tok || "").split(".");
  if (!body || !sig || body.length > 1000) return null;
  const want = mac(body).toString("base64url").slice(0, 32);
  if (sig.length !== want.length || !crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(want))) return null;
  try { return JSON.parse(Buffer.from(body, "base64url").toString()); } catch (e) { return null; }
}
// the dealer's random numbers: a stream per game and round, so a round is always the same round
function rng(seed) { let i = 0; return () => mac(`${seed}:${i++}`).readUInt32BE(0) / 4294967296; }
const deal = (s) => E.round(s.r, rng(`${s.g}:${s.r}`), s.add);
const pub = (R) => ({ r: R.r, n: R.n, d: R.d, x: R.x, moves: R.moves, ms: R.ms, pay: R.pay });

// ---------- the board ----------
function weekKey(d = new Date()) {
  const t = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
  const day = t.getUTCDay() || 7;
  t.setUTCDate(t.getUTCDate() + 4 - day);
  const y = t.getUTCFullYear(), w = Math.ceil(((t - Date.UTC(y, 0, 1)) / 864e5 + 1) / 7);
  return `${y}-W${String(w).padStart(2, "0")}`;
}
function redisStore() {
  const url = process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token) return null;
  const R = async (...command) => {
    const r = await fetch(url, { method: "POST", headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" }, body: JSON.stringify(command) });
    if (!r.ok) throw new Error(`redis ${r.status}`);
    return (await r.json()).result;
  };
  const parse = (flat) => { const out = []; for (let i = 0; i < (flat || []).length; i += 2) { const [name, g, p] = String(flat[i]).split("·"); out.push({ name, g, p: p || "", score: Number(flat[i + 1]) }); } return out; };
  return {
    async read() {
      const [w, a] = await Promise.all([R("ZREVRANGE", `shell3:week:${weekKey()}`, 0, 999, "WITHSCORES"), R("ZREVRANGE", "shell3:all", 0, 999, "WITHSCORES")]);
      return { week: parse(w), all: parse(a) };
    },
    async claim(g) { return (await R("SET", `shell3:sub:${g}`, "1", "NX", "EX", 60 * 60 * 24 * 30)) === "OK"; },
    async add({ name, g, p, score }) {
      const member = `${name}·${g}·${p}`, wk = `shell3:week:${weekKey()}`;
      await Promise.all([R("ZADD", wk, score, member), R("ZADD", "shell3:all", score, member), R("EXPIRE", wk, 60 * 60 * 24 * 21)]);
    },
  };
}
let blobCache = { at: 0, data: null };
function blobStore() {
  if (!process.env.BLOB_READ_WRITE_TOKEN) return null;
  // every score is a tiny file whose name carries it: listing the folder is the board
  const read = async (fresh) => {
    if (!fresh && blobCache.data && Date.now() - blobCache.at < 20000) return blobCache.data;
    const { list } = await import("@vercel/blob");
    const folder = async (prefix) => {
      const out = []; let cursor;
      do {
        const page = await list({ prefix, cursor, limit: 1000 });
        for (const b of page.blobs) {
          const m = b.pathname.slice(prefix.length).match(/^(\d{9,41})-([A-Z]{3})-([a-f0-9]{8})(?:-([a-f0-9]{12}))?/);
          if (m) out.push({ score: Number(m[1]), name: m[2], g: m[3], p: m[4] || "" });
        }
        cursor = page.hasMore ? page.cursor : undefined;
      } while (cursor);
      return out.sort((x, y) => y.score - x.score);
    };
    const [week, all] = await Promise.all([folder(`shell3/w/${weekKey()}/`), folder("shell3/a/")]);
    blobCache = { at: Date.now(), data: { week, all } };
    return blobCache.data;
  };
  const opts = { access: "public", addRandomSuffix: false, contentType: "text/plain" };
  return {
    read,
    async claim(g) {
      const { list, put } = await import("@vercel/blob");
      if ((await list({ prefix: `shell3/g/${g}`, limit: 1 })).blobs.length) return false;
      await put(`shell3/g/${g}.txt`, "1", opts);
      return true;
    },
    async add({ name, g, p, score }) {
      const { put } = await import("@vercel/blob");
      const file = `${BigInt(Math.round(Math.min(score, 1e40))).toString().padStart(16, "0")}-${name}-${g}${p ? "-" + p : ""}.txt`;
      await Promise.all([put(`shell3/w/${weekKey()}/${file}`, "1", opts), put(`shell3/a/${file}`, "1", opts)]);
      blobCache.at = 0;
    },
  };
}
// rows only say whether they are yours; the player id itself never goes back out
const strip = (l, p) => l.slice(0, 10).map((r) => (p && r.p === p ? { name: r.name, score: r.score, me: true } : { name: r.name, score: r.score }));
function mine(l, p) { const i = l.findIndex((r) => r.p === p); return i < 0 ? null : { name: l[i].name, score: l[i].score, rank: i + 1 }; }
const query = (req) => new URL(req.url || "/", "http://x").searchParams;

module.exports = async (req, res) => {
  res.setHeader("Cache-Control", "no-store");
  const store = redisStore() || blobStore();
  if (!store) { res.status(503).json({ error: "storage-not-configured" }); return; }
  try {
    if (req.method === "GET") {
      const q = query(req), p = /^[a-f0-9]{12}$/.test(q.get("p") || "") ? q.get("p") : "";
      const { week, all } = await store.read(q.get("fresh") === "1");
      res.status(200).json({ week: strip(week, p), all: strip(all, p), me: p ? { week: mine(week, p), all: mine(all, p) } : null, weekKey: weekKey() });
      return;
    }
    if (req.method !== "POST") { res.setHeader("Allow", "GET, POST"); res.status(405).json({ error: "method not allowed" }); return; }
    let body = req.body;
    if (typeof body === "string") { try { body = JSON.parse(body); } catch (e) { body = {}; } }
    body = body || {};

    if (body.op === "start") {
      // a checkpoint: a game that just ended lets you sit back down five rounds before where it ended,
      // with a fresh 100 chips. Only from a finished game, sealed by us, within its six hours.
      let r = 1;
      if (body.from) {
        const prev = unseal(body.from);
        if (!prev || !prev.over || Date.now() - (prev.t || 0) > GAME_TTL) { res.status(400).json({ error: "bad-checkpoint" }); return; }
        r = E.checkpoint(prev.r - 1);
        if (r < 2) { res.status(400).json({ error: "bad-checkpoint" }); return; }
      }
      const s = { g: crypto.randomBytes(4).toString("hex"), t: Date.now(), r, cp: r > 1 ? r : undefined, chips: E.START, safe: 0, best: E.START, won: 0, over: false, mult: 1, add: 0 };
      res.status(200).json({ id: seal(s), round: pub(deal(s)), chips: s.chips, best: s.best });
      return;
    }
    const s = unseal(body.id);
    if (!s || !/^[a-f0-9]{8}$/.test(s.g || "")) { res.status(400).json({ error: "bad-id" }); return; }
    if (Date.now() - (s.t || 0) > GAME_TTL) { res.status(404).json({ error: "no-game" }); return; }

    if (body.op === "pick") {
      if (s.over) { res.status(409).json({ error: "finished" }); return; }
      const R = deal(s), mode = String(body.mode || "one");
      const picks = Array.isArray(body.cups) ? body.cups.map(Number) : [Number(body.cup)];
      if (!picks.length || picks.length > 2 || picks.some((c) => !Number.isInteger(c) || c < 0 || c >= R.n)) { res.status(400).json({ error: "bad-cup" }); return; }
      if (!E.diceOk(mode, s, R)) { res.status(400).json({ error: "bad-mode" }); return; }
      const { ok, dm, delta } = E.settle(s, R, picks, mode);
      res.status(200).json({ ok, dm, delta, d: R.d, x: R.x, chips: s.chips, safe: s.safe || 0, mult: s.mult, best: s.best, won: s.won, id: seal(s), round: s.over ? null : pub(deal(s)) });
      return;
    }
    // one more glass on the table, for good: the multiplier grows ×1.5 and the round is dealt again
    if (body.op === "glass") {
      if (!E.canAddGlass(s)) { res.status(400).json({ error: "cannot-add" }); return; }
      E.addGlass(s);
      res.status(200).json({ id: seal(s), mult: s.mult, round: pub(deal(s)) });
      return;
    }
    // the wheel, every five rounds: it only multiplies
    if (body.op === "spin") {
      if (!E.wheelDue(s)) { res.status(400).json({ error: "no-spin" }); return; }
      const w = E.spin(s, rng(`${s.g}:wheel:${s.r}`));
      res.status(200).json({ id: seal(s), mult: s.mult, i: w.i, m: w.m, frac: w.frac });
      return;
    }
    // the shop: one help per kind and round, paid from the table
    if (body.op === "buy") {
      const item = String(body.item || "");
      if (!E.canBuy(item, s)) { res.status(400).json({ error: "cannot-buy" }); return; }
      const paid = E.buy(s, item);
      res.status(200).json({ id: seal(s), chips: s.chips, safe: s.safe || 0, paid, buy: s.buy });
      return;
    }
    // the safe is gone: always refused
    if (body.op === "save") {
      const amount = Math.floor(Number(body.amount));
      if (!E.canSave(s, amount)) { res.status(400).json({ error: "cannot-save" }); return; }
      E.save(s, amount);
      res.status(200).json({ id: seal(s), chips: s.chips, safe: s.safe });
      return;
    }
    if (body.op === "cashout") {
      if (!s.over) { s.over = true; s.cashed = true; }
      res.status(200).json({ id: seal(s), chips: s.chips, safe: s.safe || 0, score: E.score(s) });
      return;
    }
    if (body.op === "submit") {
      const name = String(body.name || "").toUpperCase().normalize("NFD").replace(/[̀-ͯ]/g, "");
      if (!/^[A-Z]{3}$/.test(name)) { res.status(400).json({ error: "bad-name" }); return; }
      if (BLOCKED.has(name)) { res.status(400).json({ error: "blocked-name" }); return; }
      const score = E.score(s);
      if (!s.over || !(s.won >= 1) || !(score > E.START)) { res.status(400).json({ error: "too-short" }); return; }
      if (!(await store.claim(s.g))) { res.status(409).json({ error: "already" }); return; }
      const p = /^[a-f0-9]{12}$/.test(String(body.p || "")) ? body.p : "";
      await store.add({ name, g: s.g, p, score });
      // the place on the board that never resets
      const { all } = await store.read(true);
      const i = all.findIndex((r) => r.g === s.g);
      res.status(200).json({ rank: i < 0 ? null : i + 1, score });
      return;
    }
    res.status(400).json({ error: "bad-op" });
  } catch (e) {
    res.status(502).json({ error: "storage-unavailable" });
  }
};
