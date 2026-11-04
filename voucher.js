/* ============================================================
   VOUCHER — every slip the site hands you, printed like the
   ticket a slot machine gives you when you cash out: thermal
   paper, condensed type, a barcode, a validation number, the
   amount spelled out. One design, as HTML and as a canvas
   (for the download).
   ============================================================ */
(() => {
  "use strict";
  const FONT = '"Barlow Condensed", "Arial Narrow", "Roboto Condensed", sans-serif';
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

  /* opts: { sub, amount, words, rows: [[label, value]], asset } */
  function make(opts) {
    const now = new Date();
    const validation = `51-${pad(rnd(1e4), 4)}-${pad(rnd(1e4), 4)}-${pad(rnd(1e4), 4)}-${pad(rnd(1e4), 4)}`;
    const date = `${pad(now.getDate())}/${pad(now.getMonth() + 1)}/${now.getFullYear()}`;
    const time = `${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(now.getSeconds())}`;
    const number = pad(rnd(1e4), 4);
    return Object.assign({ validation, date, time, number, bars: bars(validation) }, opts);
  }

  function html(v) {
    const barsSvg = (() => {
      let x = 0; const rects = [];
      v.bars.forEach((b) => { rects.push(`<rect x="${x}" y="0" width="${b.w}" height="40"/>`); x += b.w + b.gap; });
      return `<svg class="vc-bars" viewBox="0 0 ${x} 40" preserveAspectRatio="none" aria-hidden="true">${rects.join("")}</svg>`;
    })();
    return `
      <div class="vc">
        <span class="vc-side vc-left">${T("INTRODUCIR POR ESTE LADO", "INSERT THIS SIDE UP")}<small>WOBLO · DESIGN CONTROLS</small></span>
        <div class="vc-body">
          <b class="vc-house">WOBLO.IO</b>
          <span class="vc-sub">${esc(v.sub || "")}</span>
          <b class="vc-title">${T("TICKET DE SALIDA", "CASHOUT VOUCHER")}</b>
          ${barsSvg}
          <div class="vc-line"><span>${T("VALIDACIÓN", "VALIDATION")}</span><span>${v.validation}</span></div>
          <div class="vc-line"><span>${v.date}</span><span>${v.time}</span><span>${T("TICKET", "VOUCHER")} # ${v.number}</span></div>
          ${(v.rows || []).map(([a, b]) => `<div class="vc-line vc-row"><span>${esc(a)}</span><span>${esc(b)}</span></div>`).join("")}
          <span class="vc-words">${esc(v.words || "")}</span>
          <b class="vc-amount">${esc(v.amount || "")}</b>
          <div class="vc-line vc-foot"><span>${T("Caduca a los 180 días", "Void after 180 days")}</span><span>${esc(v.asset || "")}</span></div>
        </div>
        <span class="vc-side vc-right">${v.validation}<small>WOBLO.IO</small></span>
      </div>`;
  }

  // the same slip on a canvas, for "Download"
  async function canvas(v, scale = 2) {
    try { await document.fonts.load(`700 40px "Barlow Condensed"`); await document.fonts.load(`600 16px "Barlow Condensed"`); } catch (e) { /* fall back */ }
    const W = 640, rowsH = (v.rows || []).length * 22, H = 360 + rowsH;
    const c = document.createElement("canvas"); c.width = W * scale; c.height = H * scale;
    const x = c.getContext("2d"); x.scale(scale, scale);
    x.fillStyle = "#f4f3ee"; x.fillRect(0, 0, W, H);
    // a little grain of thermal paper
    for (let i = 0; i < 2600; i++) { x.fillStyle = `rgba(0,0,0,${Math.random() * 0.035})`; x.fillRect(Math.random() * W, Math.random() * H, 1, 1); }
    x.fillStyle = "#0b0b0c"; x.textBaseline = "alphabetic";
    const text = (t, px, py, size, weight = 600, align = "center", spacing = 1) => {
      x.font = `${weight} ${size}px ${FONT}`; x.textAlign = align;
      if ("letterSpacing" in x) x.letterSpacing = `${spacing}px`;
      x.fillText(t, px, py);
    };
    const mid = W / 2;
    text("WOBLO.IO", mid, 52, 34, 700, "center", 2);
    text(v.sub || "", mid, 76, 16, 600, "center", 1.5);
    text(T("TICKET DE SALIDA", "CASHOUT VOUCHER"), mid, 124, 50, 700, "center", 2);
    // the barcode
    let total = v.bars.reduce((s, b) => s + b.w + b.gap, 0), bx = mid - 190, k = 380 / total;
    v.bars.forEach((b) => { x.fillRect(bx, 138, b.w * k, 56); bx += (b.w + b.gap) * k; });
    let y = 220;
    text(T("VALIDACIÓN", "VALIDATION"), 150, y, 19, 700, "left", 1.5); text(v.validation, 490, y, 19, 600, "right", 1.5);
    y += 24;
    text(v.date, 150, y, 19, 600, "left", 1.5); text(v.time, mid - 22, y, 19, 600, "center", 1.5); text(`${T("TICKET", "VOUCHER")} # ${v.number}`, 490, y, 19, 700, "right", 1.5);
    (v.rows || []).forEach(([a, b]) => { y += 22; text(a, 150, y, 16, 600, "left", 1.2); text(b, 490, y, 16, 600, "right", 1.2); });
    y += 26; text(v.words || "", mid, y, 15, 700, "center", 1);
    y += 46; text(v.amount || "", mid, y, 44, 700, "center", 1);
    y += 34; text(T("Caduca a los 180 días", "Void after 180 days"), 150, y, 16, 600, "left", 0.6); text(v.asset || "", 490, y, 16, 700, "right", 1);
    // the vertical lines on both edges
    x.save(); x.translate(48, H / 2); x.rotate(-Math.PI / 2); text(T("INTRODUCIR POR ESTE LADO", "INSERT THIS SIDE UP"), 0, 0, 20, 600, "center", 1); text("WOBLO · DESIGN CONTROLS", 0, 18, 10, 600, "center", 0.5); x.restore();
    x.save(); x.translate(W - 44, H / 2); x.rotate(Math.PI / 2); text(v.validation, 0, 0, 17, 700, "center", 1); text("WOBLO.IO", 0, 22, 14, 600, "center", 1); x.restore();
    return c;
  }

  window.VOUCHER = { make, html, canvas, words };
})();
