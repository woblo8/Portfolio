/* ============================================================
   TRACK — what a visitor does, told to Carlos.
   One record per visit (per tab): where they came from, on what,
   and a timeline of what they did — the faces they landed, the
   projects they opened and for how long, the die, the private
   table, the game, the links they followed. Sent once when the
   visit starts (a notice) and again when the tab is left (the
   full record). Never for Carlos's own browser, never for robots.
   ============================================================ */
(() => {
  "use strict";
  const store = (s) => ({ get: (k) => { try { return s.getItem(k); } catch (e) { return null; } }, set: (k, v) => { try { s.setItem(k, v); } catch (e) {} } });
  const local = store(window.localStorage), session = store(window.sessionStorage);
  if (local.get("woblo:admin") === "1" || navigator.webdriver) return;
  const hex = (n) => [...crypto.getRandomValues(new Uint8Array(n))].map((b) => b.toString(16).padStart(2, "0")).join("");
  const API = "/api/vip";

  // who: an anonymous visitor id kept by this browser, and how many times it has come
  let vid = local.get("woblo:vid");
  if (!/^[a-f0-9]{12}$/.test(vid || "")) { vid = hex(6); local.set("woblo:vid", vid); }
  const fresh = !session.get("woblo:hit");
  const n = fresh ? (+local.get("woblo:visits") || 0) + 1 : +local.get("woblo:visits") || 1;
  if (fresh) local.set("woblo:visits", String(n));
  const sid = session.get("woblo:hit") || hex(8);
  session.set("woblo:hit", sid);

  const q = new URLSearchParams(location.search);
  const t0 = +session.get("woblo:t0") || Date.now();
  session.set("woblo:t0", String(t0));
  const conn = navigator.connection || {};
  const rec = {
    sid, vid, n, t0,
    path: location.pathname, ref: document.referrer, lang: window.LANG || "", vip: q.get("vip") || "",
    utm: { s: q.get("utm_source") || "", m: q.get("utm_medium") || "", c: q.get("utm_campaign") || "" },
    dev: {
      sw: screen.width, sh: screen.height, vw: innerWidth, vh: innerHeight, dpr: Math.round((devicePixelRatio || 1) * 100) / 100,
      tz: (() => { try { return Intl.DateTimeFormat().resolvedOptions().timeZone; } catch (e) { return ""; } })(),
      langs: (navigator.languages || [navigator.language]).slice(0, 3).join(", "),
      touch: navigator.maxTouchPoints > 0, cores: navigator.hardwareConcurrency || 0, mem: navigator.deviceMemory || 0,
      net: conn.effectiveType || "", dark: matchMedia("(prefers-color-scheme: dark)").matches,
      local: new Date().toLocaleTimeString("es-ES", { hour: "2-digit", minute: "2-digit" }),
    },
    ev: JSON.parse(session.get("woblo:ev") || "[]"),
    rolls: +session.get("woblo:rolls") || 0,
  };

  // the real phone model (Android hides it in the user agent as "K"): asked to the browser, when it can tell
  try {
    if (navigator.userAgentData && navigator.userAgentData.getHighEntropyValues)
      navigator.userAgentData.getHighEntropyValues(["model", "platformVersion"]).then((v) => { rec.dev.model = String(v.model || "").slice(0, 40); rec.dev.osv = String(v.platformVersion || "").slice(0, 12); }).catch(() => {});
  } catch (e) { /* not this browser */ }

  // the timeline: [seconds since arrival, what, detail]
  const secs = () => Math.round((Date.now() - t0) / 1000);
  function add(what, detail) {
    const last = rec.ev[rec.ev.length - 1];
    if (last && last[1] === what && last[2] === (detail || "")) return; // the same thing twice in a row is one thing
    rec.ev.push([secs(), what, String(detail || "").slice(0, 60)]);
    if (rec.ev.length > 120) rec.ev.splice(1, 1);
    session.set("woblo:ev", JSON.stringify(rec.ev));
  }
  window.WOBLO_TRACK = add; // the private table and the game report here too
  addEventListener("woblo:track", (e) => e.detail && add(e.detail.e, e.detail.d));

  const send = (body, beacon) => {
    const json = JSON.stringify(body);
    if (beacon && navigator.sendBeacon && navigator.sendBeacon(API, new Blob([json], { type: "application/json" }))) return;
    fetch(API, { method: "POST", headers: { "Content-Type": "application/json" }, body: json, keepalive: true }).catch(() => {});
  };

  // the arrival: one notice, a moment after the page is there
  if (fresh) {
    add("arrive", location.pathname + (location.search ? location.search.slice(0, 40) : ""));
    setTimeout(() => send(Object.assign({ op: "hit" }, rec, { ev: undefined })), 1500);
  }

  /* ---------- what happens on the page ---------- */
  const D = window.DIE;
  const P = window.PROJECTS || [];
  if (D && D.on) {
    D.on("throw", () => { rec.rolls += 1; session.set("woblo:rolls", String(rec.rolls)); add("roll", `#${rec.rolls}`); });
    D.on("land", ({ index }) => add("face", (P[index] || {}).title || index));
    D.on("enter", ({ index }) => add("open", (P[index] || {}).title || index));
    D.on("exit", (s) => { if (s) add("close", `${s.title} · ${s.secs}s · ${s.detail || ""}`); });
    D.on("table", () => add("vip", "abre su mesa privada"));
  }
  // the address changes as projects open and close
  const route = () => add("page", location.pathname);
  const push = history.pushState;
  history.pushState = function () { const r = push.apply(this, arguments); setTimeout(route, 0); return r; };
  addEventListener("popstate", route);

  // every link and button that means something
  document.addEventListener("click", (e) => {
    const el = e.target.closest("a, button, [role=button]");
    if (!el) return;
    const href = el.getAttribute("href") || "";
    if (href.startsWith("mailto:")) return add("mail", href.slice(7).split("?")[0]);
    if (/calendly\.com/.test(href)) return add("call", "Calendly");
    if (/linkedin\.com/.test(href)) return add("link", "LinkedIn");
    if (/\.pdf($|\?)|\/cv\b/.test(href)) return add("cv", "CV");
    if (/^https?:/.test(href) && !href.includes(location.host)) { try { return add("link", new URL(href).hostname.replace(/^www\./, "")); } catch (err) { return; } }
    if (el.id === "langBtn") return add("lang", window.LANG === "es" ? "EN" : "ES");
    if (el.classList.contains("house-open")) return add("house", "abre «La casa»");
    if (el.classList.contains("chip-vip")) return; // the table reports itself
    const label = (el.getAttribute("aria-label") || el.textContent || "").replace(/\s+/g, " ").trim().slice(0, 40);
    if (label && label.length > 1) add("click", label);
  }, true);

  // leaving the tab and coming back
  let away = 0;
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "hidden") { away = Date.now(); add("away", ""); report(false); }
    else if (away) { add("back", `${Math.round((Date.now() - away) / 1000)}s fuera`); away = 0; }
  });
  // the record: sent when the tab is hidden or closed (the server keeps the latest and writes once)
  function report(final) {
    send(Object.assign({ op: "session", secs: secs(), final }, rec), true);
  }
  addEventListener("pagehide", () => report(true));
})();
