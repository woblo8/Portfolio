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

// ---------- the despacho: the board can be looked after with the admin key ----------
function isAdmin(req) {
  const want = process.env.VIP_ADMIN_KEY || "";
  const got = String((req.headers && req.headers["x-admin-key"]) || "");
  if (!want || got.length !== want.length) return false;
  return crypto.timingSafeEqual(Buffer.from(got), Buffer.from(want));
}

// ---------- states already played ----------
// Every move answers with a new sealed state; the old one is remembered here (by its signature) and
// refused if it comes back. Kept in the memory of the running function: cheap, and enough to stop
// the replay of a missed pick in the same session.
const MOVES = new Set(["pick", "buy", "glass", "unglass", "spin", "cashout"]);
const SPENT = new Map();
const sigOf = (id) => String(id).split(".")[1] || String(id);
const spent = (id) => SPENT.has(sigOf(id));
function spend(id) {
  const sig = sigOf(id), now = Date.now();
  SPENT.set(sig, now + GAME_TTL);
  if (SPENT.size > 20000) for (const [k, t] of SPENT) if (t < now || SPENT.size > 15000) SPENT.delete(k);
  return true;
}

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
  const parse = (flat) => { const out = []; for (let i = 0; i < (flat || []).length; i += 2) { const [name, g, p, rd] = String(flat[i]).split("·"); out.push({ name, g, p: p || "", round: +rd || 0, score: Number(flat[i + 1]) }); } return out; };
  return {
    async read() {
      const [w, a] = await Promise.all([R("ZREVRANGE", `shell4:week:${weekKey()}`, 0, 999, "WITHSCORES"), R("ZREVRANGE", "shell4:all", 0, 999, "WITHSCORES")]);
      return { week: parse(w), all: parse(a) };
    },
    async claim(g) { return (await R("SET", `shell4:sub:${g}`, "1", "NX", "EX", 60 * 60 * 24 * 30)) === "OK"; },
    async add({ name, g, p, score, round }) {
      const member = `${name}·${g}·${p}·${round || 0}`, wk = `shell4:week:${weekKey()}`;
      await Promise.all([R("ZADD", wk, score, member), R("ZADD", "shell4:all", score, member), R("EXPIRE", wk, 60 * 60 * 24 * 21)]);
    },
    // admin: every board where this game appears, its member renamed or removed
    async edit(g, name) {
      for (const key of ["shell4:all", `shell4:week:${weekKey()}`]) {
        const flat = await R("ZRANGE", key, 0, -1, "WITHSCORES");
        for (let i = 0; i < (flat || []).length; i += 2) {
          const m = String(flat[i]), [, mg, mp] = m.split("·");
          if (mg !== g) continue;
          await R("ZREM", key, m);
          if (name) { const [, , , rd] = m.split("·"); await R("ZADD", key, flat[i + 1], `${name}·${mg}·${mp || ""}·${rd || 0}`); }
        }
      }
    },
    async reset() {
      const keys = (await R("KEYS", "shell4:*")) || [];
      if (keys.length) await R("DEL", ...keys);
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
          const m = b.pathname.slice(prefix.length).match(/^(\d{9,41})-([A-Z]{3})-([a-f0-9]{8})(?:-([a-f0-9]{12}))?(?:-r(\d+))?/);
          if (m) out.push({ score: Number(m[1]), name: m[2], g: m[3], p: m[4] || "", round: +m[5] || 0, path: b.pathname });
        }
        cursor = page.hasMore ? page.cursor : undefined;
      } while (cursor);
      return out.sort((x, y) => y.score - x.score);
    };
    const [week, all] = await Promise.all([folder(`shell4/w/${weekKey()}/`), folder("shell4/a/")]);
    blobCache = { at: Date.now(), data: { week, all } };
    return blobCache.data;
  };
  const opts = { access: "public", addRandomSuffix: false, contentType: "text/plain" };
  return {
    read,
    async claim(g) {
      const { list, put } = await import("@vercel/blob");
      if ((await list({ prefix: `shell4/g/${g}`, limit: 1 })).blobs.length) return false;
      await put(`shell4/g/${g}.txt`, "1", opts);
      return true;
    },
    async add({ name, g, p, score, round }) {
      const { put } = await import("@vercel/blob");
      const file = `${BigInt(Math.round(Math.min(score, 1e40))).toString().padStart(16, "0")}-${name}-${g}${p ? "-" + p : ""}-r${round || 0}.txt`;
      await Promise.all([put(`shell4/w/${weekKey()}/${file}`, "1", opts), put(`shell4/a/${file}`, "1", opts)]);
      blobCache.at = 0;
    },
    // admin: rename (a new file with the new name, the old one deleted) or remove (name empty)
    async edit(g, name) {
      const { put, del } = await import("@vercel/blob");
      const { week, all } = await read(true);
      const hits = [...week, ...all].filter((r) => r.g === g);
      for (const r of hits) {
        if (name) await put(r.path.replace(`-${r.name}-${g}`, `-${name}-${g}`), "1", opts);
        await del(r.path);
      }
      blobCache.at = 0;
    },
    async reset() {
      const { list, del } = await import("@vercel/blob");
      let cursor;
      do {
        const page = await list({ prefix: "shell4/", cursor, limit: 1000 });
        if (page.blobs.length) await del(page.blobs.map((b) => b.url));
        cursor = page.hasMore ? page.cursor : undefined;
      } while (cursor);
      blobCache.at = 0;
    },
  };
}
// rows only say whether they are yours; the player id itself never goes back out
// a name that is not allowed (signed before the rule) keeps its place but shows as another name
const clean = (l) => l.map((r) => (E.nameCheck(r.name).ok ? r : Object.assign({}, r, { name: "???" })));
const strip = (l, p) => l.slice(0, 10).map((r) => (p && r.p === p ? { name: r.name, score: r.score, round: r.round, me: true } : { name: r.name, score: r.score, round: r.round }));
function mine(l, p) { const i = l.findIndex((r) => r.p === p); return i < 0 ? null : { name: l[i].name, score: l[i].score, round: l[i].round, rank: i + 1 }; }
const query = (req) => new URL(req.url || "/", "http://x").searchParams;

module.exports = async (req, res) => {
  res.setHeader("Cache-Control", "no-store");
  const store = redisStore() || blobStore();
  if (!store) { res.status(503).json({ error: "storage-not-configured" }); return; }
  try {
    if (req.method === "GET") {
      const q = query(req), p = /^[a-f0-9]{12}$/.test(q.get("p") || "") ? q.get("p") : "";
      const read = await store.read(q.get("fresh") === "1"), week = clean(read.week), all = clean(read.all);
      res.status(200).json({ week: strip(week, p), all: strip(all, p), me: p ? { week: mine(week, p), all: mine(all, p) } : null, weekKey: weekKey() });
      return;
    }
    if (req.method !== "POST") { res.setHeader("Allow", "GET, POST"); res.status(405).json({ error: "method not allowed" }); return; }
    let body = req.body;
    if (typeof body === "string") { try { body = JSON.parse(body); } catch (e) { body = {}; } }
    body = body || {};

    // the despacho: list the whole board, rename or remove a name, or reset everything
    if (body.op === "admin") {
      if (!isAdmin(req)) { res.status(401).json({ error: "no-key" }); return; }
      const g = String(body.g || "");
      if (body.action === "rename") {
        const nc = E.nameCheck(body.name);
        if (!/^[a-f0-9]{8}$/.test(g) || !nc.ok) { res.status(400).json({ error: "bad-name", why: nc.why }); return; }
        await store.edit(g, nc.name);
      } else if (body.action === "remove") {
        if (!/^[a-f0-9]{8}$/.test(g)) { res.status(400).json({ error: "bad-id" }); return; }
        await store.edit(g, "");
      } else if (body.action === "seed") {
        // the house record: an entry placed by hand from the despacho (a score to beat)
        const nc = E.nameCheck(body.name), score = Math.round(Number(body.score)), round = Math.round(Number(body.round));
        if (!nc.ok || !(score > 0 && score < 1e30) || !(round >= 1 && round <= 200)) { res.status(400).json({ error: "bad-seed" }); return; }
        await store.add({ name: nc.name, g: crypto.randomBytes(4).toString("hex"), p: "", score, round });
      } else if (body.action === "reset") {
        if (body.confirm !== "RESET") { res.status(400).json({ error: "confirm" }); return; }
        await store.reset();
      }
      const { all } = await store.read(true);
      res.status(200).json({ all: all.map((r) => ({ name: r.name, score: r.score, round: r.round, g: r.g, ok: E.nameCheck(r.name).ok })) });
      return;
    }
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
      const s = { g: crypto.randomBytes(4).toString("hex"), t: Date.now(), r, cp: r > 1 ? r : undefined, chips: E.START, safe: 0, best: E.START, won: 0, over: false, mult: 1, add: 0, lives: E.LIVES, dt: Date.now() };
      res.status(200).json({ id: seal(s), round: pub(deal(s)), chips: s.chips, best: s.best });
      return;
    }
    const s = unseal(body.id);
    if (!s || !/^[a-f0-9]{8}$/.test(s.g || "")) { res.status(400).json({ error: "bad-id" }); return; }
    if (Date.now() - (s.t || 0) > GAME_TTL) { res.status(404).json({ error: "no-game" }); return; }
    // a state can be played once: sending an older one again (to retry a missed pick) is refused
    if (MOVES.has(body.op)) {
      if (spent(body.id)) { res.status(409).json({ error: "used" }); return; }
      // only a move that went through spends the state (a refused one can be tried again)
      let code = 200; const st = res.status.bind(res), js = res.json.bind(res);
      res.status = (c) => { code = c; st(c); return res; };
      res.json = (b) => { if (code === 200) spend(body.id); return js(b); };
    }

    if (body.op === "pick") {
      if (s.over) { res.status(409).json({ error: "finished" }); return; }
      const R = deal(s), mode = String(body.mode || "one");
      // nobody follows a shuffle faster than it can be shown
      if (s.dt && Date.now() - s.dt < E.minPlayMs(R)) { res.status(400).json({ error: "too-fast" }); return; }
      const picks = Array.isArray(body.cups) ? body.cups.map(Number) : [Number(body.cup)];
      if (!picks.length || picks.length > 3 || picks.some((c) => !Number.isInteger(c) || c < 0 || c >= R.n)) { res.status(400).json({ error: "bad-cup" }); return; }
      if (!E.diceOk(mode, s, R)) { res.status(400).json({ error: "bad-mode" }); return; }
      const { ok, dm, delta } = E.settle(s, R, picks, mode);
      s.dt = Date.now();
      res.status(200).json({ ok, dm, delta, lives: s.lives, d: R.d, x: R.x, chips: s.chips, safe: s.safe || 0, mult: s.mult, best: s.best, won: s.won, id: seal(s), round: s.over ? null : pub(deal(s)) });
      return;
    }
    // one more glass on the table, for good: the multiplier grows ×1.5 and the round is dealt again
    if (body.op === "glass") {
      if (!E.canAddGlass(s)) { res.status(400).json({ error: "cannot-add" }); return; }
      E.addGlass(s); s.dt = Date.now();
      res.status(200).json({ id: seal(s), mult: s.mult, round: pub(deal(s)) });
      return;
    }
    // one glass less (down to three): the multiplier is divided by 1.5
    if (body.op === "unglass") {
      if (!E.canRemoveGlass(s)) { res.status(400).json({ error: "cannot-remove" }); return; }
      E.removeGlass(s); s.dt = Date.now();
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
      // three letters, and nothing offensive or odd: the board is on a portfolio
      const nc = E.nameCheck(body.name);
      if (!nc.ok) { res.status(400).json({ error: nc.why === "blocked" ? "blocked-name" : "bad-name", why: nc.why }); return; }
      const name = nc.name;
      const score = E.score(s);
      if (!s.over || !(s.won >= 1) || !(score > E.START)) { res.status(400).json({ error: "too-short" }); return; }
      if (!(await store.claim(s.g))) { res.status(409).json({ error: "already" }); return; }
      const p = /^[a-f0-9]{12}$/.test(String(body.p || "")) ? body.p : "";
      // the round the game reached (the last one played)
      const round = Math.max(1, (s.r || 1) - 1);
      await store.add({ name, g: s.g, p, score, round });
      // the place on the board that never resets
      const all = clean((await store.read(true)).all);
      const i = all.findIndex((r) => r.g === s.g);
      res.status(200).json({ rank: i < 0 ? null : i + 1, score, round });
      return;
    }
    res.status(400).json({ error: "bad-op" });
  } catch (e) {
    res.status(502).json({ error: "storage-unavailable" });
  }
};
