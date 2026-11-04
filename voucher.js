/* ============================================================
   VOUCHER — every slip the site hands you, printed like the
   ticket a slot machine gives you when you cash out: thermal
   paper, condensed type, a barcode, a validation number, the
   amount spelled out. One design, as HTML and as a canvas
   (for the download).
   ============================================================ */
(() => {
  "use strict";
  const pad = (n, l = 2) => String(n).padStart(l, "0");
  const rnd = (n) => Math.floor(Math.random() * n);
  const esc = (t) => String(t).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);

  // numbers in words, as the machine prints the amount
  const ES = { u: ["CERO", "UNO", "DOS", "TRES", "CUATRO", "CINCO", "SEIS", "SIETE", "OCHO", "NUEVE", "DIEZ", "ONCE", "DOCE", "TRECE", "CATORCE", "QUINCE", "DIECISÉIS", "DIECISIETE", "DIECIOCHO", "DIECINUEVE", "VEINTE", "VEINTIUNO", "VEINTIDÓS", "VEINTITRÉS", "VEINTICUATRO", "VEINTICINCO", "VEINTISÉIS", "VEINTISIETE", "VEINTIOCHO", "VEINTINUEVE"],
    t: ["", "", "", "TREINTA", "CUARENTA", "CINCUENTA", "SESENTA", "SETENTA", "OCHENTA", "NOVENTA"],
    h: ["", "CIENTO", "DOSCIENTOS", "TRESCIENTOS", "CUATROCIENTOS", "QUINIENTOS", "SEISCIENTOS", "SETECIENTOS", "OCHOCIENTOS", "NOVECIENTOS"] };
  const EN = { u: ["ZERO", "ONE", "TWO", "THREE", "FOUR", "FIVE", "SIX", "SEVEN", "EIGHT", "NINE", "TEN", "ELEVEN", "TWELVE", "THIRTEEN", "FOURTEEN", "FIFTEEN", "SIXTEEN", "SEVENTEEN", "EIGHTEEN", "NINETEEN"],
    t: ["", "", "TWENTY", "THIRTY", "FORTY", "FIFTY", "SIXTY", "SEVENTY", "EIGHTY", "NINETY"] };
  function words(n) {
    n = Math.max(0, Math.floor(n));
    if (T("es", "en") === "es") {
      const below100 = (x) => (x < 30 ? ES.u[x] : ES.t[Math.floor(x / 10)] + (x % 10 ? " Y " + ES.u[x % 10] : ""));
      const below1000 = (x) => (x === 100 ? "CIEN" : x < 100 ? below100(x) : ES.h[Math.floor(x / 100)] + (x % 100 ? " " + below100(x % 100) : ""));
      if (n < 1000) return below1000(n);
      const th = Math.floor(n / 1000);
      return (th === 1 ? "MIL" : below1000(th) + " MIL") + (n % 1000 ? " " + below1000(n % 1000) : "");
    }
    const below100 = (x) => (x < 20 ? EN.u[x] : EN.t[Math.floor(x / 10)] + (x % 10 ? "-" + EN.u[x % 10] : ""));
    const below1000 = (x) => (x < 100 ? below100(x) : EN.u[Math.floor(x / 100)] + " HUNDRED" + (x % 100 ? " " + below100(x % 100) : ""));
    if (n < 1000) return below1000(n);
    return below1000(Math.floor(n / 1000)) + " THOUSAND" + (n % 1000 ? " " + below1000(n % 1000) : "");
  }

  // a barcode that looks right: bars of 1–3 units, drawn from the validation digits
  function bars(code) {
    const out = [];
    const digits = code.replace(/\D/g, "");
    for (let i = 0; i < 46; i++) {
      const d = +digits[i % digits.length] + i;
      out.push({ w: 1 + (d % 3), gap: 1 + ((d * 7) % 3 === 0 ? 1 : 0) });
    }
    return out;
  }

  /* opts: { sub, amount, words, detail } */
  function make(opts) {
    const now = new Date();
    const validation = `51-${pad(rnd(1e4), 4)}-${pad(rnd(1e4), 4)}-${pad(rnd(1e4), 4)}-${pad(rnd(1e4), 4)}`;
    const date = `${pad(now.getDate())}/${pad(now.getMonth() + 1)}/${now.getFullYear()}`;
    const time = `${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(now.getSeconds())}`;
    const number = pad(rnd(1e4), 4);
    return Object.assign({ validation, date, time, number, bars: bars(validation) }, opts);
  }

  // a calm layout: the brand, the title, the table, the barcode, one big amount, one line of facts
  function html(v) {
    let x = 0; const rects = [];
    v.bars.forEach((b) => { rects.push(`<rect x="${x}" y="0" width="${b.w}" height="40"/>`); x += b.w + b.gap; });
    return `
      <div class="vc">
        <button type="button" class="vc-x" aria-label="${T("Cerrar", "Close")}">✕</button>
        <span class="vc-house">WOBLO.IO</span>
        <b class="vc-title">${T("Ticket de salida", "Cashout voucher")}</b>
        <span class="vc-sub">${esc(v.sub || "")}</span>
        <svg class="vc-bars" viewBox="0 0 ${x} 40" preserveAspectRatio="none" aria-hidden="true">${rects.join("")}</svg>
        <span class="vc-code">${v.validation}</span>
        <b class="vc-amount">${esc(v.amount || "")}</b>
        <span class="vc-words">${esc(v.words || "")}</span>
        ${v.detail ? `<span class="vc-detail">${esc(v.detail)}</span>` : ""}
        <span class="vc-meta"><span>${v.date}</span><span>${v.time.slice(0, 5)}</span><span>Nº ${v.number}</span></span>
      </div>`;
  }

  // the same slip on a canvas, for "Download": black glass, white ink, same order
  async function canvas(v, scale = 2) {
    const MONO = '"Geist Mono", ui-monospace, Menlo, monospace', SANS = '"Inter Tight", "Helvetica Neue", Arial, sans-serif';
    try { await document.fonts.load(`400 14px "Geist Mono"`); await document.fonts.load(`600 40px "Inter Tight"`); } catch (e) { /* fall back */ }
    const W = 416, H = v.detail ? 436 : 412;
    const c = document.createElement("canvas"); c.width = W * scale; c.height = H * scale;
    const x = c.getContext("2d"); x.scale(scale, scale);
    x.fillStyle = "#0a0a0c"; x.fillRect(0, 0, W, H);
    const g = x.createRadialGradient(W / 2, 0, 0, W / 2, 0, W * 0.8);
    g.addColorStop(0, "rgba(255,255,255,0.08)"); g.addColorStop(1, "rgba(255,255,255,0)");
    x.fillStyle = g; x.fillRect(0, 0, W, H);
    x.strokeStyle = "rgba(255,255,255,0.16)"; x.lineWidth = 1; x.strokeRect(0.5, 0.5, W - 1, H - 1);
    // perforated top and bottom
    x.save(); x.globalCompositeOperation = "destination-out";
    for (let i = 0; i < W; i += 20) { x.beginPath(); x.arc(i + 10, 0, 5, 0, Math.PI * 2); x.fill(); x.beginPath(); x.arc(i + 10, H, 5, 0, Math.PI * 2); x.fill(); }
    x.restore();
    const text = (t, py, size, font, spacing, color) => {
      x.fillStyle = color; x.font = font === SANS ? `600 ${size}px ${SANS}` : `400 ${size}px ${MONO}`; x.textAlign = "center";
      if ("letterSpacing" in x) x.letterSpacing = `${spacing}px`;
      x.fillText(t, W / 2, py);
    };
    const SMOKE = "#8c8c92", MIST = "#c4c3bf";
    let y = 48;
    text("WOBLO.IO", y, 16, MONO, 5, SMOKE);
    y += 38; text(T("Ticket de salida", "Cashout voucher"), y, 30, SANS, -0.3, "#fff");
    y += 28; text((v.sub || "").toUpperCase(), y, 16, MONO, 2.5, MIST);
    // barcode
    const total = v.bars.reduce((s, b) => s + b.w + b.gap, 0), bw = 300, k = bw / total;
    let bx = (W - bw) / 2; y += 24;
    x.fillStyle = "rgba(255,255,255,0.75)"; v.bars.forEach((b) => { x.fillRect(bx, y, Math.max(1, b.w * k), 36); bx += (b.w + b.gap) * k; });
    y += 58; text(v.validation, y, 14, MONO, 2, SMOKE);
    y += 64; x.shadowColor = "rgba(255,255,255,0.3)"; x.shadowBlur = 24;
    text(v.amount || "", y, 60, SANS, -2, "#fff"); x.shadowBlur = 0;
    y += 30; text(v.words || "", y, 13, MONO, 1.2, SMOKE);
    if (v.detail) { y += 24; text(v.detail, y, 15, MONO, 1.6, MIST); }
    y += 26; x.fillStyle = "rgba(255,255,255,0.14)"; for (let i = 32; i < W - 32; i += 8) x.fillRect(i, y, 4, 1);
    y += 30; text(`${v.date}   ${v.time.slice(0, 5)}   Nº ${v.number}`, y, 13, MONO, 2, SMOKE);
    return c;
  }

  window.VOUCHER = { make, html, canvas, words };
})();
