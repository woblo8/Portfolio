/* ============================================================
   LANGUAGE — ES / EN.
   Content is written once in both languages as { es, en } (see bi()
   in projects.js); this file picks one and resolves everything, so
   the rest of the code only ever sees plain text.
   Choice order: ?lang=es|en  →  the visitor's last choice  →  browser.
   ============================================================ */
(() => {
  "use strict";
  const KEY = "woblo:lang";
  let lang = null;
  try { lang = new URLSearchParams(location.search).get("lang") || localStorage.getItem(KEY); } catch (e) { /* private mode */ }
  if (lang !== "es" && lang !== "en") lang = (navigator.language || "en").toLowerCase().startsWith("es") ? "es" : "en";
  window.LANG = lang;
  document.documentElement.lang = lang;

  // inline pick: T("Hola", "Hello")
  window.T = (es, en) => (lang === "es" ? es : en);
  // content helper used in projects.js
  window.bi = (es, en) => ({ es, en });
  // resolve every { es, en } inside a structure
  window.L10N = function walk(v) {
    if (Array.isArray(v)) return v.map(walk);
    if (v && typeof v === "object") {
      const keys = Object.keys(v);
      if (keys.length && keys.every((k) => k === "es" || k === "en")) return v[lang] !== undefined ? v[lang] : v.en;
      const out = {};
      for (const k of keys) out[k] = walk(v[k]);
      return out;
    }
    return v;
  };
  window.setLang = (l) => {
    try { localStorage.setItem(KEY, l); } catch (e) { /* private mode */ }
    const u = new URL(location.href);
    u.searchParams.delete("lang");
    location.replace(u.toString());
  };
  // static markup: <span data-es="…" data-en="…">
  const apply = () => document.querySelectorAll("[data-en]").forEach((el) => { el.innerHTML = el.dataset[lang]; });
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", apply);
  else apply();
})();
