/* ============================================================
   PORTRAIT — the photograph exactly as it is. Only its entrance
   is designed: a line of white light scans down and reveals it.
   ============================================================ */
(() => {
  "use strict";
  window.initPortrait = function initPortrait(fig) {
    if (!fig) return null;
    const img = fig.querySelector("img");
    const start = () => requestAnimationFrame(() => fig.classList.add("is-revealed"));
    if (img.complete && img.naturalWidth) start();
    else img.addEventListener("load", start, { once: true });
    return () => fig.classList.remove("is-revealed");
  };
})();
