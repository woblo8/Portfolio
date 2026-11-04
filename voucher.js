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

  // the same slip on a canvas, for "Download": same order, same proportions
  async function canvas(v, scale = 2) {
    try { await document.fonts.load(`700 40px "Barlow Condensed"`); await document.fonts.load(`600 16px "Barlow Condensed"`); } catch (e) { /* fall back */ }
    const W = 520, H = v.detail ? 546 : 518; // ends one margin below the last line
    const c = document.createElement("canvas"); c.width = W * scale; c.height = H * scale;
    const x = c.getContext("2d"); x.scale(scale, scale);
    // paper, with the faint grain of thermal stock, and a perforated top and bottom edge
    x.fillStyle = "#f6f5f0"; x.fillRect(0, 0, W, H);
    for (let i = 0; i < 1800; i++) { x.fillStyle = `rgba(0,0,0,${Math.random() * 0.025})`; x.fillRect(Math.random() * W, Math.random() * H, 1, 1); }
    x.fillStyle = "#0b0b0c";
    for (let i = 0; i < W; i += 12) { x.beginPath(); x.arc(i + 6, 0, 3, 0, Math.PI); x.fill(); x.beginPath(); x.arc(i + 6, H, 3, Math.PI, 0); x.fill(); }
    const text = (t, py, size, weight = 600, spacing = 1, color = "#0b0b0c") => {
      x.fillStyle = color; x.font = `${weight} ${size}px ${FONT}`; x.textAlign = "center";
      if ("letterSpacing" in x) x.letterSpacing = `${spacing}px`;
      x.fillText(t, W / 2, py);
    };
    const rule = (py) => { x.fillStyle = "rgba(11,11,12,0.18)"; for (let i = 40; i < W - 40; i += 8) x.fillRect(i, py, 4, 1); };
    let y = 64;
    text("WOBLO.IO", y, 17, 600, 6, "#55555a");
    y += 52; text(T("TICKET DE SALIDA", "CASHOUT VOUCHER"), y, 50, 700, 2);
    y += 32; text(v.sub || "", y, 18, 600, 3, "#55555a");
    y += 26; rule(y);
    // the barcode, crisp and centred
    const total = v.bars.reduce((s, b) => s + b.w + b.gap, 0), bw = 360, k = bw / total;
    let bx = (W - bw) / 2; y += 24;
    x.fillStyle = "#0b0b0c"; v.bars.forEach((b) => { x.fillRect(Math.round(bx), y, Math.max(1, Math.round(b.w * k)), 64); bx += (b.w + b.gap) * k; });
    y += 88; text(v.validation, y, 16, 600, 3, "#55555a");
    y += 74; text(v.amount || "", y, 64, 700, 1);
    y += 32; text(v.words || "", y, 16, 600, 1.5, "#55555a");
    if (v.detail) { y += 28; text(v.detail, y, 16, 600, 1.5); }
    y += 28; rule(y);
    y += 36; text(`${v.date}   ·   ${v.time.slice(0, 5)}   ·   Nº ${v.number}`, y, 16, 600, 2, "#55555a");
    return c;
  }

  window.VOUCHER = { make, html, canvas, words };
})();
