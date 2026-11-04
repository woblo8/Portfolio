// Vercel serverless function: "La casa — ¿Dónde está el dado?"
// The server deals every round (which glass hides the die, the moves, the speed) and checks
// every pick, so a score on the board means those rounds were really played. The game state
// travels to the browser sealed with an HMAC (the key never leaves the server).
// The board lives in Upstash Redis when it is configured (KV_REST_API_URL / _TOKEN or
// UPSTASH_REDIS_REST_URL / _TOKEN) and otherwise in Vercel Blob (BLOB_READ_WRITE_TOKEN).
//
//   GET  /api/house?p=<player>            → { week, all, me }   top 10s, and where you stand
//   POST /api/house { op: "start" }        → { id, round }
//   POST /api/house { op: "pick", id, cup } → { ok, d, score, id, round? }
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
const deal = (s) => E.round(s.r, rng(`${s.g}:${s.r}`));
const pub = (R) => ({ r: R.r, d: R.d, moves: R.moves, ms: R.ms });

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
      const [w, a] = await Promise.all([R("ZREVRANGE", `shell:week:${weekKey()}`, 0, 999, "WITHSCORES"), R("ZREVRANGE", "shell:all", 0, 999, "WITHSCORES")]);
      return { week: parse(w), all: parse(a) };
    },
    async claim(g) { return (await R("SET", `shell:sub:${g}`, "1", "NX", "EX", 60 * 60 * 24 * 30)) === "OK"; },
    async add({ name, g, p, score }) {
      const member = `${name}·${g}·${p}`, wk = `shell:week:${weekKey()}`;
      await Promise.all([R("ZADD", wk, score, member), R("ZADD", "shell:all", score, member), R("EXPIRE", wk, 60 * 60 * 24 * 21)]);
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
          const m = b.pathname.slice(prefix.length).match(/^(\d{5})-([A-Z]{3})-([a-f0-9]{8})(?:-([a-f0-9]{12}))?/);
          if (m) out.push({ score: Number(m[1]), name: m[2], g: m[3], p: m[4] || "" });
        }
        cursor = page.hasMore ? page.cursor : undefined;
      } while (cursor);
      return out.sort((x, y) => y.score - x.score);
    };
    const [week, all] = await Promise.all([folder(`shell/w/${weekKey()}/`), folder("shell/a/")]);
    blobCache = { at: Date.now(), data: { week, all } };
    return blobCache.data;
  };
  const opts = { access: "public", addRandomSuffix: false, contentType: "text/plain" };
  return {
    read,
    async claim(g) {
      const { list, put } = await import("@vercel/blob");
      if ((await list({ prefix: `shell/g/${g}`, limit: 1 })).blobs.length) return false;
      await put(`shell/g/${g}.txt`, "1", opts);
      return true;
    },
    async add({ name, g, p, score }) {
      const { put } = await import("@vercel/blob");
      const file = `${String(Math.min(99999, score)).padStart(5, "0")}-${name}-${g}${p ? "-" + p : ""}.txt`;
      await Promise.all([put(`shell/w/${weekKey()}/${file}`, "1", opts), put(`shell/a/${file}`, "1", opts)]);
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
      const s = { g: crypto.randomBytes(4).toString("hex"), t: Date.now(), r: 1, score: 0, over: false };
      res.status(200).json({ id: seal(s), round: pub(deal(s)) });
      return;
    }
    const s = unseal(body.id);
    if (!s || !/^[a-f0-9]{8}$/.test(s.g || "")) { res.status(400).json({ error: "bad-id" }); return; }
    if (Date.now() - (s.t || 0) > GAME_TTL) { res.status(404).json({ error: "no-game" }); return; }

    if (body.op === "pick") {
      if (s.over) { res.status(409).json({ error: "finished" }); return; }
      const cup = Number(body.cup);
      if (![0, 1, 2].includes(cup)) { res.status(400).json({ error: "bad-cup" }); return; }
      const R = deal(s), ok = cup === R.d;
      if (ok) { s.score = s.r; s.r += 1; } else s.over = true;
      res.status(200).json({ ok, d: R.d, score: s.score, id: seal(s), round: ok ? pub(deal(s)) : null });
      return;
    }
    if (body.op === "submit") {
      const name = String(body.name || "").toUpperCase().normalize("NFD").replace(/[̀-ͯ]/g, "");
      if (!/^[A-Z]{3}$/.test(name)) { res.status(400).json({ error: "bad-name" }); return; }
      if (BLOCKED.has(name)) { res.status(400).json({ error: "blocked-name" }); return; }
      if (!(s.score >= 1)) { res.status(400).json({ error: "too-short" }); return; }
      if (!(await store.claim(s.g))) { res.status(409).json({ error: "already" }); return; }
      const p = /^[a-f0-9]{12}$/.test(String(body.p || "")) ? body.p : "";
      await store.add({ name, g: s.g, p, score: s.score });
      const { week } = await store.read(true);
      const i = week.findIndex((r) => r.g === s.g);
      res.status(200).json({ rank: i < 0 ? null : i + 1, score: s.score });
      return;
    }
    res.status(400).json({ error: "bad-op" });
  } catch (e) {
    res.status(502).json({ error: "storage-unavailable" });
  }
};
