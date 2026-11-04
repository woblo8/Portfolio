// Vercel serverless function: counts every roll of the die, for all visitors.
// Storage, in order of preference:
//   1. Upstash Redis   (KV_REST_API_URL / KV_REST_API_TOKEN or UPSTASH_REDIS_REST_URL / _TOKEN)
//   2. Vercel Blob     (BLOB_READ_WRITE_TOKEN) — each roll is a tiny marker file, counted by listing
const FACES = 6;
const KEY = "woblo:rolls";
const PREFIX = "rolls/";
let cache = { at: 0, counts: null }; // a warm instance answers repeated reads for a few seconds

async function redisBackend(url, token) {
  const call = async (command) => {
    const r = await fetch(url, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify(command),
    });
    if (!r.ok) throw new Error(`redis ${r.status}`);
    return (await r.json()).result;
  };
  return {
    async add(face) { await call(["HINCRBY", KEY, String(face), 1]); },
    async counts() {
      const flat = (await call(["HGETALL", KEY])) || [];
      const c = Array(FACES).fill(0);
      for (let i = 0; i < flat.length; i += 2) {
        const f = Number(flat[i]);
        if (f >= 1 && f <= FACES) c[f - 1] = Number(flat[i + 1]) || 0;
      }
      return c;
    },
  };
}

async function blobBackend() {
  const { put, list } = await import("@vercel/blob");
  return {
    async add(face) {
      await put(`${PREFIX}${face}/r.txt`, "1", { access: "public", addRandomSuffix: true, contentType: "text/plain" });
    },
    async counts() {
      const c = Array(FACES).fill(0);
      let cursor;
      do {
        const page = await list({ prefix: PREFIX, cursor, limit: 1000 });
        for (const b of page.blobs) {
          const f = Number(b.pathname.slice(PREFIX.length).split("/")[0]);
          if (f >= 1 && f <= FACES) c[f - 1] += 1;
        }
        cursor = page.hasMore ? page.cursor : undefined;
      } while (cursor);
      return c;
    },
  };
}

async function backend() {
  const url = process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN;
  if (url && token) return redisBackend(url, token);
  if (process.env.BLOB_READ_WRITE_TOKEN) return blobBackend();
  return null;
}

module.exports = async (req, res) => {
  res.setHeader("Cache-Control", "no-store");
  const store = await backend();
  if (!store) {
    res.status(503).json({ error: "storage-not-configured" });
    return;
  }
  try {
    if (req.method === "POST") {
      let body = req.body;
      if (typeof body === "string") { try { body = JSON.parse(body); } catch (e) { body = {}; } }
      const face = Number(body && body.face);
      if (!Number.isInteger(face) || face < 1 || face > FACES) {
        res.status(400).json({ error: "face must be 1–6" });
        return;
      }
      await store.add(face);
      if (cache.counts) cache.counts[face - 1] += 1;
      res.status(204).end();
      return;
    }
    if (req.method === "GET") {
      if (!cache.counts || Date.now() - cache.at > 15000) cache = { at: Date.now(), counts: await store.counts() };
      res.status(200).json({ counts: cache.counts });
      return;
    }
    res.setHeader("Allow", "GET, POST");
    res.status(405).json({ error: "method not allowed" });
  } catch (e) {
    res.status(502).json({ error: "storage-unavailable" });
  }
};
