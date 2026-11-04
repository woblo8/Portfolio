/* ============================================================
   TEXT — the letters play too.
   · Titles shuffle like a slot machine when you pass over them,
     then fall back into place, one reel at a time.
   · The accent of Infanzón weighs less than its letter: it floats
     and leans towards the cursor.
   ============================================================ */
(() => {
  "use strict";
  const calm = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const GLYPHS = "▚◆⌁∴▞◇⌗∷▙◈⌬※";
  const TITLES = ".info-title, .ph-title, .about-title, .contact-title, .page-inner h1, .page-inner h2, .brand-name";
  const running = new WeakMap();

  /* ---------- the slot machine ---------- */
  function textNodes(el) {
    const out = [];
    const w = document.createTreeWalker(el, NodeFilter.SHOW_TEXT, {
      acceptNode: (n) => (n.parentElement.closest(".acc-mark") || !n.data.trim() ? NodeFilter.FILTER_REJECT : NodeFilter.FILTER_ACCEPT),
    });
    while (w.nextNode()) out.push(w.currentNode);
    return out;
  }
  function scramble(el) {
    if (calm || !el || running.get(el)) return;
    const nodes = textNodes(el);
    if (!nodes.length) return;
    const orig = nodes.map((n) => n.data);
    const total = orig.reduce((s, t) => s + t.length, 0);
    const span = Math.min(620, 220 + total * 18); // longer titles take a little longer, never long
    const t0 = performance.now();
    // hold the box so the shuffling never pushes the layout around
    const r = el.getBoundingClientRect();
    const prev = { minWidth: el.style.minWidth, minHeight: el.style.minHeight };
    if (getComputedStyle(el).display !== "inline") { el.style.minHeight = `${r.height}px`; }
    running.set(el, true);
    let lastSwap = 0;
    const frame = (now) => {
      const t = now - t0;
      if (now - lastSwap > 45 || t >= span + 60) {
        lastSwap = now;
        let k = 0;
        nodes.forEach((n, j) => {
          let s = "";
          for (const ch of orig[j]) {
            const stop = 90 + (k / total) * span; // reels stop left to right
            k++;
            s += t >= stop || ch === " " || ch === "\n" ? ch : GLYPHS[(Math.random() * GLYPHS.length) | 0];
          }
          n.data = s;
        });
      }
      if (t < span + 90) requestAnimationFrame(frame);
      else {
        nodes.forEach((n, j) => { n.data = orig[j]; });
        el.style.minWidth = prev.minWidth; el.style.minHeight = prev.minHeight;
        running.delete(el);
      }
    };
    requestAnimationFrame(frame);
  }
  window.scrambleText = scramble;

  document.addEventListener("pointerover", (e) => {
    if (e.pointerType && e.pointerType !== "mouse") return;
    const el = e.target.closest && e.target.closest(TITLES);
    if (!el || (e.relatedTarget && el.contains(e.relatedTarget))) return;
    scramble(el);
  });

  // a new result on the table: its name rolls in the same way
  const iTitle = document.getElementById("iTitle");
  if (iTitle) new MutationObserver(() => scramble(iTitle)).observe(iTitle, { childList: true });

  /* ---------- the floating accent ---------- */
  const mark = document.querySelector(".acc-mark");
  if (!mark || calm) return;
  let tx = 0, ty = 0, x = 0, y = 0, vx = 0, vy = 0, near = 0;
  addEventListener("pointermove", (e) => {
    const r = mark.getBoundingClientRect();
    const dx = e.clientX - (r.left + r.width / 2 - x), dy = e.clientY - (r.top + r.height / 2 - y);
    const d = Math.hypot(dx, dy) || 1;
    const pull = Math.max(0, 1 - d / 420); // only a nearby cursor moves it
    near = pull;
    tx = (dx / d) * pull * 7;
    ty = (dy / d) * pull * 6 - pull * 2;
  }, { passive: true });
  document.addEventListener("pointerleave", () => { tx = 0; ty = 0; near = 0; });
  const tick = (now) => {
    const bob = Math.sin(now / 900) * 0.8 - 1.2; // it never quite rests on the o
    vx += (tx - x) * 0.06; vy += (ty + bob - y) * 0.06;
    vx *= 0.82; vy *= 0.82;
    x += vx; y += vy;
    mark.style.transform = `translate(calc(-50% + ${x.toFixed(2)}px), ${y.toFixed(2)}px) rotate(${(vx * 4).toFixed(2)}deg)`;
    mark.style.textShadow = near > 0.15 ? `0 0 ${(4 + near * 8).toFixed(1)}px rgba(255,255,255,${(0.3 + near * 0.5).toFixed(2)})` : "";
    requestAnimationFrame(tick);
  };
  requestAnimationFrame(tick);
})();
