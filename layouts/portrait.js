/* ============================================================
   PORTRAIT — the photo engraved in white lines on black, like the
   faces of the die. It is drawn by a scan from top to bottom; the
   pointer becomes a lens that reveals the real photograph, and
   the lines part around it.
   ============================================================ */
(() => {
  "use strict";
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const smooth = (a, b, t) => { const x = clamp((t - a) / (b - a), 0, 1); return x * x * (3 - 2 * x); };

  window.initPortrait = function initPortrait(fig) {
    if (!fig) return null;
    const canvas = fig.querySelector("canvas");
    const ctx = canvas.getContext("2d");
    const img = new Image();
    img.src = fig.dataset.src;
    const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
    const DPR = Math.min(2, window.devicePixelRatio || 1);
    const STEP = 5;   // distance between engraved lines (css px)
    const COLW = 2;   // horizontal resolution of each line (css px)
    let W = 0, H = 0, rows = 0, cols = 0, lum = null;
    let raf = 0, t0 = 0, dirty = true;
    const P = { x: -1e4, y: -1e4, inside: false, lens: 0 };

    function layout() {
      if (!img.naturalWidth) return;
      W = fig.clientWidth;
      H = Math.round(W * img.naturalHeight / img.naturalWidth);
      canvas.width = Math.round(W * DPR);
      canvas.height = Math.round(H * DPR);
      canvas.style.height = H + "px";
      rows = Math.floor(H / STEP);
      cols = Math.floor(W / COLW);
      const s = document.createElement("canvas");
      s.width = cols; s.height = rows;
      const sx = s.getContext("2d", { willReadFrequently: true });
      sx.drawImage(img, 0, 0, cols, rows);
      const d = sx.getImageData(0, 0, cols, rows).data;
      lum = new Float32Array(cols * rows);
      for (let i = 0; i < cols * rows; i++) {
        const l = (d[i * 4] * 0.299 + d[i * 4 + 1] * 0.587 + d[i * 4 + 2] * 0.114) / 255;
        // darkness drives the line weight (a negative engraving): suit and hair glow,
        // the white studio background disappears into the page
        lum[i] = Math.pow(clamp((0.97 - l) / 0.93, 0, 1), 1.55);
      }
      dirty = true;
    }

    function draw(now) {
      raf = requestAnimationFrame(draw);
      if (!lum) return;
      const reveal = reduce ? 1 : smooth(0, 1, (now - t0) / 1800);
      P.lens += ((P.inside ? 1 : 0) - P.lens) * 0.16;
      const animating = reveal < 1 || Math.abs(P.lens - (P.inside ? 1 : 0)) > 0.002 || P.inside;
      if (!animating && !dirty) return;
      dirty = false;

      ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
      ctx.clearRect(0, 0, W, H);
      const front = reveal * (H + 40);
      const R = 92 * P.lens;
      ctx.fillStyle = "#f2f1ec";
      for (let r = 0; r < rows; r++) {
        const yc = r * STEP + STEP / 2;
        if (yc > front) break;
        const row = r * cols;
        for (let c = 0; c < cols; c++) {
          const k = lum[row + c];
          if (k < 0.04) continue;
          const x = c * COLW;
          let y = yc;
          if (R > 1) {
            // lines part around the lens
            const dx = x - P.x, dy = yc - P.y, dist = Math.hypot(dx, dy);
            if (dist < R * 1.6) {
              const f = 1 - dist / (R * 1.6);
              y += Math.sign(dy || 1) * f * f * 14;
              if (dist < R) continue; // inside the lens: the photograph
            }
          }
          const th = Math.max(0.3, k * (STEP - 1.5));
          ctx.fillRect(x, y - th / 2, COLW, th);
        }
      }
      // the scan line while it engraves
      if (reveal < 1) {
        ctx.fillStyle = "rgba(255,255,255,0.9)";
        ctx.shadowColor = "rgba(255,255,255,0.8)";
        ctx.shadowBlur = 12;
        ctx.fillRect(0, front, W, 1);
        ctx.shadowBlur = 0;
      }
      // the lens: the real photograph, inside a fine ring
      if (R > 1) {
        ctx.save();
        ctx.beginPath();
        ctx.arc(P.x, P.y, R, 0, Math.PI * 2);
        ctx.clip();
        ctx.drawImage(img, 0, 0, W, H);
        ctx.restore();
        ctx.strokeStyle = "rgba(255,255,255,0.9)";
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.arc(P.x, P.y, R + 0.5, 0, Math.PI * 2);
        ctx.stroke();
      }
    }

    const onMove = (e) => {
      const r = canvas.getBoundingClientRect();
      P.x = e.clientX - r.left;
      P.y = e.clientY - r.top;
      P.inside = P.x >= 0 && P.y >= 0 && P.x <= r.width && P.y <= r.height;
      fig.classList.toggle("is-looking", P.inside);
    };
    const onLeave = () => { P.inside = false; fig.classList.remove("is-looking"); };
    const onResize = () => layout();
    fig.addEventListener("pointermove", onMove);
    fig.addEventListener("pointerdown", onMove);
    fig.addEventListener("pointerleave", onLeave);
    addEventListener("resize", onResize);

    img.onload = () => { layout(); t0 = performance.now(); raf = requestAnimationFrame(draw); };
    if (img.complete && img.naturalWidth) img.onload();

    return () => {
      cancelAnimationFrame(raf);
      fig.removeEventListener("pointermove", onMove);
      fig.removeEventListener("pointerdown", onMove);
      fig.removeEventListener("pointerleave", onLeave);
      removeEventListener("resize", onResize);
    };
  };
})();
