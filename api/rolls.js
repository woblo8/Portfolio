// Vercel serverless function: counts every roll of the die, for all visitors.
// Storage: Upstash Redis (Vercel Marketplace → Storage → Upstash Redis → connect to this project).
// It reads either KV_REST_API_URL / KV_REST_API_TOKEN or UPSTASH_REDIS_REST_URL / UPSTASH_REDIS_REST_TOKEN.
const FACES = 6;
const KEY = "woblo:rolls";

module.exports = async (req, res) => {
  const url = process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN;
  res.setHeader("Cache-Control", "no-store");
  if (!url || !token) {
    res.status(503).json({ error: "storage-not-configured" });
    return;
  }
  const redis = async (command) => {
    const r = await fetch(url, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify(command),
    });
    if (!r.ok) throw new Error(`redis ${r.status}`);
    return (await r.json()).result;
  };
  try {
    if (req.method === "POST") {
      let body = req.body;
      if (typeof body === "string") { try { body = JSON.parse(body); } catch (e) { body = {}; } }
      const face = Number(body && body.face);
      if (!Number.isInteger(face) || face < 1 || face > FACES) {
        res.status(400).json({ error: "face must be 1–6" });
        return;
      }
      await redis(["HINCRBY", KEY, String(face), 1]);
      res.status(204).end();
      return;
    }
    if (req.method === "GET") {
      const flat = (await redis(["HGETALL", KEY])) || [];
      const counts = Array(FACES).fill(0);
      for (let i = 0; i < flat.length; i += 2) {
        const f = Number(flat[i]);
        if (f >= 1 && f <= FACES) counts[f - 1] = Number(flat[i + 1]) || 0;
      }
      res.status(200).json({ counts });
      return;
    }
    res.setHeader("Allow", "GET, POST");
    res.status(405).json({ error: "method not allowed" });
  } catch (e) {
    res.status(502).json({ error: "storage-unavailable" });
  }
};
