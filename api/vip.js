// Vercel serverless function: who comes in, and the private tables (?vip=Name).
//
// 0. Every visit to the site: an email to Carlos (NOTIFY_EMAIL, sent through Resend: RESEND_API_KEY),
//    and Telegram if it is ever configured.
//    POST /api/vip { op: "hit", sid, path, ref, lang, vip } → 204
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

// one notice, every channel that is set up: email (Resend) and Telegram
const plain = (t) => String(t).replace(/<[^>]+>/g, "").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&amp;/g, "&");
// the letter the house sends, in the language of the portfolio: black, white with a little glow,
// a tight grotesk headline, mono for the small print, a die for a seal. Tables and inline styles,
// because that is all an inbox reliably keeps.
// card: { kicker, title, em, lead, big, bigLabel, rows: [[label, value]], marks: [text] }
const SANS = "'Neue Haas Grotesk Display Pro','Neue Haas Grotesk','Helvetica Neue',Helvetica,Arial,sans-serif";
const MONO = "'Geist Mono','SF Mono',Menlo,Consolas,'Courier New',monospace";
function letter(card) {
  const e = (t) => html(String(t == null ? "" : t));
  const when = new Date().toLocaleString("es-ES", { timeZone: "Europe/Madrid", weekday: "long", day: "numeric", month: "long", hour: "2-digit", minute: "2-digit" });
  const label = (t, c = "#8c8c92") => `font-family:${MONO};font-size:10px;letter-spacing:3px;text-transform:uppercase;color:${c}`;
  const rows = (card.rows || []).filter((r) => r && r[1]).map(([k, v], i, all) => {
    const line = i < all.length - 1 ? "border-bottom:1px solid #1c1c20;" : "";
    return `<tr>
      <td style="padding:16px 0;${line}${label()};vertical-align:top;width:40%">${e(k)}</td>
      <td style="padding:14px 0;${line}font-family:${SANS};font-size:16px;line-height:1.4;color:#ecebe7;text-align:right">${e(v)}</td>
    </tr>`;
  }).join("");
  const marks = (card.marks || []).map((m) => `<span style="display:inline-block;margin:0 3px 8px;padding:8px 14px;border:1px solid #3a3a40;border-radius:99px;${label("#ffffff")};font-size:9.5px;letter-spacing:2.5px">${e(m)}</span>`).join("");
  // the seal: one face of the die, five points of light
  const pip = (on) => `<td width="12" height="12" align="center" valign="middle" style="width:12px;height:12px;font-size:0;line-height:0">${on ? `<div style="width:6px;height:6px;border-radius:50%;background:#ffffff;box-shadow:0 0 6px #ffffff"></div>` : ""}</td>`;
  const die = `<table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:0 auto;border:1px solid #ecebe7;border-radius:12px;padding:8px;box-shadow:0 0 18px rgba(255,255,255,0.18)">
    <tr>${pip(1)}${pip(0)}${pip(1)}</tr><tr>${pip(0)}${pip(1)}${pip(0)}</tr><tr>${pip(1)}${pip(0)}${pip(1)}</tr></table>`;
  return `<!doctype html>
<html lang="es"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="color-scheme" content="dark only"><meta name="supported-color-schemes" content="dark only"><title>${e(card.title)}</title></head>
<body style="margin:0;padding:0;background:#050506" bgcolor="#050506">
<div style="display:none;max-height:0;overflow:hidden;opacity:0">${e(card.lead || "")}</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" bgcolor="#050506" style="background:#050506">
<tr><td align="center" style="padding:40px 12px">
  <table role="presentation" width="560" cellpadding="0" cellspacing="0" border="0" bgcolor="#0a0a0b" style="width:100%;max-width:560px;background:#0a0a0b;border:1px solid #232328;border-radius:18px">
    <tr><td style="padding:26px 32px 0">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"><tr>
        <td style="${label("#ecebe7")};letter-spacing:4px">woblo.io</td>
        <td align="right" style="${label()};letter-spacing:4px">La casa</td>
      </tr></table>
    </td></tr>
    <tr><td align="center" style="padding:52px 32px 0">${die}</td></tr>
    <tr><td style="padding:40px 40px 0">
      <div style="${label()};letter-spacing:4px">${e(card.kicker)}</div>
      <h1 style="margin:16px 0 0;font-family:${SANS};font-weight:600;font-size:44px;line-height:0.98;letter-spacing:-2px;color:#ffffff;text-shadow:0 0 22px rgba(255,255,255,0.18)">${e(card.title)}<br><span style="color:#8c8c92">${e(card.em)}</span></h1>
      ${card.lead ? `<p style="margin:20px 0 0;font-family:${SANS};font-size:16px;line-height:1.55;color:#c4c3bf">${e(card.lead)}</p>` : ""}
    </td></tr>
    ${card.big ? `<tr><td style="padding:34px 40px 0">
      <div style="font-family:${SANS};font-weight:600;font-size:76px;line-height:1;letter-spacing:-3px;color:#ffffff;text-shadow:0 0 26px rgba(255,255,255,0.22)">${e(card.big)}</div>
      <div style="margin-top:10px;${label()};letter-spacing:4px">${e(card.bigLabel || "")}</div>
    </td></tr>` : ""}
    ${marks ? `<tr><td style="padding:26px 37px 0">${marks}</td></tr>` : ""}
    ${rows ? `<tr><td style="padding:30px 40px 0"><div style="border-top:1px solid #ecebe7;opacity:0.9;font-size:0;line-height:0;box-shadow:0 0 10px rgba(255,255,255,0.35)">&nbsp;</div>
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">${rows}</table></td></tr>` : ""}
    <tr><td style="padding:38px 40px 0">
      <a href="https://www.woblo.io/mesas" style="display:inline-block;padding:16px 26px;border-radius:99px;background:#ecebe7;font-family:${MONO};font-size:11px;letter-spacing:3.5px;text-transform:uppercase;color:#050506;text-decoration:none">Abrir el despacho &nbsp;&rarr;</a>
    </td></tr>
    <tr><td style="padding:46px 40px 30px">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"><tr>
        <td style="${label("#5a5a60")};font-size:9px">La casa siempre gana</td>
        <td align="right" style="${label("#5a5a60")};font-size:9px;letter-spacing:2px">${e(when)}</td>
      </tr></table>
    </td></tr>
  </table>
</td></tr></table>
</body></html>`;
}

// email through Resend (RESEND_API_KEY; the free plan sends to the account owner from onboarding@resend.dev)
async function email(subject, text, card) {
  const to = process.env.NOTIFY_EMAIL, key = process.env.RESEND_API_KEY;
  if (!to || !key) return false;
  const r = await fetch("https://api.resend.com/emails", {
    method: "POST", headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
    body: JSON.stringify({ from: process.env.RESEND_FROM || "woblo.io <onboarding@resend.dev>", to: [to], subject, text, html: card ? letter(card) : undefined }),
  });
  if (!r.ok) console.error("resend", r.status, (await r.text()).slice(0, 300));
  else console.log("resend ok", subject);
  return r.ok;
}
async function notify(subject, htmlText, card) {
  const text = plain(htmlText);
  await Promise.all([telegram(htmlText).catch(() => false), email(subject, text, card).catch(() => false)]);
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

// Spanish to English, through Google Translate's public endpoint (no key); null if it fails
async function translate(text) {
  try {
    const r = await fetch(`https://translate.googleapis.com/translate_a/single?client=gtx&sl=es&tl=en&dt=t&q=${encodeURIComponent(text)}`);
    if (!r.ok) return null;
    const j = await r.json();
    return (j[0] || []).map((p) => p[0]).join("").trim() || null;
  } catch (e) { return null; }
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

    if (body.op === "hit") {
      const sid = clean(body.sid, 24), ua = String(req.headers["user-agent"] || "");
      // no robots, no previews, no speed tests: only people
      if (!/^[a-z0-9]{8,24}$/.test(sid) || /bot|crawl|spider|headless|lighthouse|preview|facebookexternalhit|slurp|vercel/i.test(ua) || !once(`hit:${sid}`)) return res.status(204).end();
      const city = decodeURIComponent(String(req.headers["x-vercel-ip-city"] || "")), country = String(req.headers["x-vercel-ip-country"] || "");
      const where = [city, country].filter(Boolean).join(", ");
      const device = /iPad|Tablet/i.test(ua) ? "Tablet" : /Mobi|Android|iPhone/i.test(ua) ? "Móvil" : "Ordenador";
      const browser = /Edg\//.test(ua) ? "Edge" : /Chrome\//.test(ua) ? "Chrome" : /Firefox\//.test(ua) ? "Firefox" : /Safari\//.test(ua) ? "Safari" : "";
      const vip = clean(body.vip, 40), path = clean(body.path, 60) || "/", lang = clean(body.lang, 5);
      let ref = clean(body.ref, 120);
      try { if (ref) { const u = new URL(ref); ref = /woblo\.io$/.test(u.hostname) ? "" : u.hostname.replace(/^www\./, "") + (u.pathname.length > 1 ? u.pathname : ""); } } catch (e) { ref = ""; }
      const lines = [
        vip ? `🎲 <b>${html(vip)}</b> ha abierto su enlace privado.` : "👀 Alguien ha entrado en woblo.io.",
        `${device === "Móvil" ? "📱" : "💻"} ${device}${browser ? " · " + browser : ""}${where ? " · " + html(where) : ""}`,
        path !== "/" ? `📄 Entró por ${html(path)}` : "",
        ref ? `↩︎ Viene de ${html(ref)}` : "↩︎ Entrada directa",
        lang ? `🌐 Idioma: ${lang.toUpperCase()}` : "",
      ].filter(Boolean);
      const countryName = (() => { try { return new Intl.DisplayNames(["es"], { type: "region" }).of(String(req.headers["x-vercel-ip-country"] || "")) || ""; } catch (e) { return ""; } })();
      const place = [city, countryName].filter(Boolean).join(", ");
      const card = vip
        ? { kicker: "Mesa privada · ahora", title: vip, em: "ha abierto su mesa.", lead: "El enlace que le enviaste acaba de abrirse. La mesa está servida." }
        : { kicker: "Aviso de la sala · ahora", title: "Alguien ha cruzado", em: "la puerta.", lead: place ? `Llega desde ${place}.` : "No ha dejado rastro de dónde viene." };
      card.rows = [["Desde", place], ["Dispositivo", [device, browser].filter(Boolean).join(" · ")], ["Entró por", path !== "/" ? path : "La portada"], ["Viene de", ref || "Entrada directa"], ["Idioma", lang === "en" ? "Inglés" : lang === "es" ? "Español" : lang]];
      await notify(vip ? `✦ ${vip} ha abierto su mesa privada` : `✦ Alguien ha cruzado la puerta${city ? " · " + city : ""}`, lines.join("\n"), card);
      return res.status(204).end();
    }

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
        ev === "end" ? notify(`✦ ${name} se levanta de la mesa · ${mmss(secs)}`, text, {
          kicker: "Mesa privada · se cierra", title: name, em: "se levanta de la mesa.",
          lead: did.c ? "Ha pulsado «Reservar llamada». Es buen momento para escribirle." : did.n ? "Leyó tu carta antes de marcharse." : "Se marcha sin abrir la carta.",
          big: mmss(secs), bigLabel: "en la mesa",
          rows: [["Desde", where], ["Dispositivo", phone ? "Móvil" : "Ordenador"]],
          marks: [did.n && "Abrió la carta", did.r && `Dado × ${did.r}`, did.p && `Entró en ${clean(did.p, 40)}`, did.c && "Reservar llamada", did.m && "Hablemos"].filter(Boolean),
        }) : telegram(text).catch(() => false),
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
      // the letter is written in Spanish; the English one is translated here, once, for guests who read the site in English
      const es = clean(body.note && body.note.es, 600);
      const en = es ? (await translate(es)) || es : "";
      const order = (Array.isArray(body.order) ? body.order : []).map(Number).filter((i) => Number.isInteger(i) && i >= 0 && i < 20).slice(0, 3);
      const g = { name, slug, note: es ? { es, en } : null, order: order.length ? order : null, at: Date.now() };
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
