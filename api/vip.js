// Vercel serverless function: the private tables (?vip=Name).
//
// 1. Visits: the table reports when a guest sits down and when they leave, and Carlos gets a
//    Telegram message (TELEGRAM_BOT_TOKEN + TELEGRAM_CHAT_ID). Every visit is also kept as a
//    tiny file in Vercel Blob, so the private page can list them.
// 2. Guests: the letter and the projects of each table, written from the private page
//    (/mesas) and read by the table when it opens. Kept in Vercel Blob.
// 3. Admin: everything that writes guests or reads visits needs VIP_ADMIN_KEY (x-admin-key).
//
//   GET  /api/vip?guest=acme                     → { note, order } | {}
//   POST /api/vip { op: "visit", ev: "open"|"end", name, sid, secs, did }   → 204
//   GET  /api/vip?admin=guests|visits  (key)      → { guests } | { visits }
//   POST /api/vip { op: "save", name, note, order }  (key) → { slug, link }
//   POST /api/vip { op: "delete", slug }            (key) → { ok }
const crypto = require("crypto");

const SITE = "https://www.woblo.io";
const slugOf = (name) => String(name || "").toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 40);
const clean = (t, n) => String(t || "").replace(/[\u0000-\u001f]/g, " ").trim().slice(0, n);
const html = (t) => String(t).replace(/[&<>]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;" })[c]);
const blob = () => import("@vercel/blob");
const putOpts = { access: "public", addRandomSuffix: false, contentType: "application/json", cacheControlMaxAge: 60 };

function isAdmin(req) {
  const want = process.env.VIP_ADMIN_KEY || "";
  const got = String(req.headers["x-admin-key"] || "");
  if (!want || got.length !== want.length) return false;
  return crypto.timingSafeEqual(Buffer.from(got), Buffer.from(want));
}

async function telegram(text) {
  const token = process.env.TELEGRAM_BOT_TOKEN, chat = process.env.TELEGRAM_CHAT_ID;
  if (!token || !chat) return false;
  const r = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
    method: "POST", headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ chat_id: chat, text, parse_mode: "HTML", disable_web_page_preview: true }),
  });
  return r.ok;
}

// what the guest did, in a few words: n = note opened, r = rolls, p = project, c = call, m = mail
function summary(did) {
  const d = did || {}, out = [];
  if (d.n) out.push("✉️ Abrió la carta");
  if (d.r) out.push(`🎲 Lanzó el dado ${d.r} ${d.r === 1 ? "vez" : "veces"}`);
  if (d.p) out.push(`→ Entró en ${html(clean(d.p, 40))}`);
  if (d.c) out.push("📅 Pulsó «Reservar llamada»");
  if (d.m) out.push("✉️ Pulsó «Hablemos»");
  return out;
}
const mmss = (s) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, "0")}`;

// a warm instance remembers which visits it has already announced: one "open" and one "end" each
const seen = new Map();
const once = (k) => { if (seen.has(k)) return false; seen.set(k, Date.now()); if (seen.size > 500) seen.delete(seen.keys().next().value); return true; };

async function readGuest(slug) {
  const { list } = await blob();
  const { blobs } = await list({ prefix: `vip/guests/${slug}.json`, limit: 1 });
  if (!blobs.length) return null;
  const r = await fetch(`${blobs[0].url}?v=${new Date(blobs[0].uploadedAt).getTime()}`);
  return r.ok ? r.json() : null;
}

module.exports = async (req, res) => {
  res.setHeader("Cache-Control", "no-store");
  const hasBlob = !!process.env.BLOB_READ_WRITE_TOKEN;
  const q = new URL(req.url || "/", "http://x").searchParams;
  try {
    if (req.method === "GET") {
      // a table asks for its letter
      if (q.has("guest")) {
        if (!hasBlob) return res.status(200).json({});
        const g = await readGuest(slugOf(q.get("guest")));
        return res.status(200).json(g ? { note: g.note, order: g.order } : {});
      }
      if (!isAdmin(req)) return res.status(401).json({ error: "no-key", configured: !!process.env.VIP_ADMIN_KEY });
      const { list } = await blob();
      if (q.get("admin") === "guests") {
        const { blobs } = await list({ prefix: "vip/guests/", limit: 200 });
        const guests = (await Promise.all(blobs.map(async (b) => {
          const r = await fetch(`${b.url}?v=${new Date(b.uploadedAt).getTime()}`);
          return r.ok ? r.json() : null;
        }))).filter(Boolean).sort((a, b) => (b.at || 0) - (a.at || 0));
        return res.status(200).json({ guests, telegram: !!(process.env.TELEGRAM_BOT_TOKEN && process.env.TELEGRAM_CHAT_ID) });
      }
      if (q.get("admin") === "visits") {
        const { blobs } = await list({ prefix: "vip/visits/", limit: 1000 });
        const visits = blobs.map((b) => {
          const m = b.pathname.match(/^vip\/visits\/(\d+)__([a-z0-9-]+)__([a-z]+)__(\d+)__([a-z0-9]*)/);
          return m && { at: +m[1], slug: m[2], ev: m[3], secs: +m[4], did: m[5] };
        }).filter(Boolean).sort((a, b) => b.at - a.at).slice(0, 100);
        return res.status(200).json({ visits });
      }
      return res.status(400).json({ error: "bad-query" });
    }
    if (req.method !== "POST") { res.setHeader("Allow", "GET, POST"); return res.status(405).json({ error: "method not allowed" }); }
    let body = req.body;
    if (typeof body === "string") { try { body = JSON.parse(body); } catch (e) { body = {}; } }
    body = body || {};

    if (body.op === "visit") {
      const name = clean(body.name, 40), slug = slugOf(name), sid = clean(body.sid, 24);
      const ev = body.ev === "end" ? "end" : "open";
      if (!slug || !/^[a-z0-9]{8,24}$/.test(sid) || !once(`${sid}:${ev}`)) return res.status(204).end();
      const secs = Math.max(0, Math.min(36000, Math.round(+body.secs || 0)));
      const did = body.did && typeof body.did === "object" ? body.did : {};
      const city = decodeURIComponent(String(req.headers["x-vercel-ip-city"] || "")), country = String(req.headers["x-vercel-ip-country"] || "");
      const where = [city, country].filter(Boolean).join(", ");
      const phone = /Mobi|Android|iPhone/i.test(String(req.headers["user-agent"] || ""));
      let text;
      if (ev === "open") {
        text = `🎲 <b>${html(name)}</b> acaba de sentarse en su mesa privada.\n${phone ? "📱 Móvil" : "💻 Ordenador"}${where ? ` · ${html(where)}` : ""}`;
      } else {
        // a visit of a few seconds with nothing done is not news
        if (secs < 8 && !summary(did).length) return res.status(204).end();
        text = [`🃏 <b>${html(name)}</b> se levanta de la mesa tras <b>${mmss(secs)}</b>.`, ...summary(did)].join("\n");
      }
      await Promise.all([
        telegram(text).catch(() => false),
        hasBlob ? blob().then(({ put }) => {
          const flags = `${did.n ? "n" : ""}${did.r ? "r" + Math.min(99, +did.r) : ""}${did.c ? "c" : ""}${did.m ? "m" : ""}${did.p ? "p" : ""}`;
          return put(`vip/visits/${Date.now()}__${slug}__${ev}__${secs}__${flags}.txt`, "1", Object.assign({}, putOpts, { contentType: "text/plain" }));
        }).catch(() => null) : null,
      ]);
      return res.status(204).end();
    }

    if (!isAdmin(req)) return res.status(401).json({ error: "no-key", configured: !!process.env.VIP_ADMIN_KEY });
    if (!hasBlob) return res.status(503).json({ error: "storage-not-configured" });
    const { put, del, list } = await blob();
    if (body.op === "save") {
      const name = clean(body.name, 40), slug = slugOf(name);
      if (!slug) return res.status(400).json({ error: "bad-name" });
      const es = clean(body.note && body.note.es, 600), en = clean(body.note && body.note.en, 600);
      const order = (Array.isArray(body.order) ? body.order : []).map(Number).filter((i) => Number.isInteger(i) && i >= 0 && i < 20).slice(0, 3);
      const g = { name, slug, note: es || en ? { es: es || en, en: en || es } : null, order: order.length ? order : null, at: Date.now() };
      await put(`vip/guests/${slug}.json`, JSON.stringify(g), putOpts);
      return res.status(200).json({ slug, link: `${SITE}/?vip=${encodeURIComponent(name)}` });
    }
    if (body.op === "delete") {
      const slug = slugOf(body.slug);
      const { blobs } = await list({ prefix: `vip/guests/${slug}.json`, limit: 1 });
      if (blobs.length) await del(blobs[0].url);
      return res.status(200).json({ ok: true });
    }
    return res.status(400).json({ error: "bad-op" });
  } catch (e) {
    return res.status(502).json({ error: "unavailable" });
  }
};
