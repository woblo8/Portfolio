/* ============================================================
   VIP — the private table.
   A link like woblo.io/?vip=Studio puts a gold chip with that name
   in the index. The chip opens this: a real casino table in 3D,
   seen from the height of a die, the camera circling it slowly
   from outside, in the dark.

   Per guest (optional): add an entry to GUESTS with the name in
   lower case. Anything left out uses the default.
     note:  the letter in the face-down card
     order: which projects sit on the table, by index (0 = SIDE A)
   ============================================================ */
(() => {
  "use strict";
  const GUESTS = {
    // studio: { note: bi("Texto en español…", "Text in English…"), order: [2, 0, 1] },
  };
  const ENV_URL = "https://cdn.jsdelivr.net/npm/three@0.147.0/examples/js/environments/RoomEnvironment.js";
  const A = 3.2, B = 1.75; // half axes of the felt oval
  const GOLD = "#d8b56f";

  let ctx = null; // what the open table needs: guest, projects…
  // a guest written from the private page (/mesas): fetched as soon as the link is opened,
  // so it is there by the time the chip is clicked; until then (or without it) the default letter
  const slugOf = (n) => String(n || "").toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
  // this file runs before main.js reads the link, so the guest's name is taken from the address here
  const linkName = (() => {
    try { return (new URLSearchParams(location.search).get("vip") || "").replace(/[^\p{L}\p{N} .&'’-]/gu, "").trim().slice(0, 40); } catch (e) { return ""; }
  })();
  if (linkName) {
    fetch(`/api/vip?guest=${encodeURIComponent(linkName)}`).then((r) => (r.ok ? r.json() : {})).then((g) => {
      if (g && (g.note || g.order)) GUESTS[slugOf(linkName)] = { note: g.note || undefined, order: g.order || undefined };
    }).catch(() => {});
  }
  // Carlos, previewing his own tables, does not get told about himself
  const isAdmin = () => { try { return localStorage.getItem("woblo:admin") === "1"; } catch (e) { return false; } };

  function html({ vip, projects, site, esc, pad }) {
    const name = vip.name || "";
    const g = GUESTS[slugOf(name)] || GUESTS[name.toLowerCase()] || {};
    // a guest's note may be plain text or bi("es", "en")
    const own = g.note && (typeof g.note === "string" ? g.note : T(g.note.es, g.note.en));
    const note = own || T(
      `Gracias por sentarse a esta mesa. La he preparado para ${name}: tres proyectos, un dado y ninguna prisa. Si alguno le hace clic, la siguiente mano la jugamos juntos.`,
      `Thank you for taking a seat. I set this table for ${name}: three projects, one die and no hurry. If one of them clicks, we play the next hand together.`
    );
    const order = (g.order || projects.map((_, i) => i)).filter((i) => projects[i] && !projects[i].kind).slice(0, 3);
    ctx = { name, note, order, projects, pad };
    const subject = encodeURIComponent(T(`Mesa privada · ${name}`, `Private table · ${name}`));
    return `
      <section class="vt3">
        <canvas class="vt3-gl" aria-hidden="true"></canvas>
        <div class="vt3-veil" aria-hidden="true"></div>
        <div class="vt3-grain" aria-hidden="true"></div>
        <header class="vt3-head">
          <span class="vt-k">${T("Mesa privada", "Private table")} · ${T("reservada", "reserved")}</span>
          <h1>${T("Bienvenidos", "Welcome")}, <em>${esc(name)}.</em></h1>
        </header>
        <div class="vt3-tip" aria-live="polite"></div>
        <button type="button" class="vt3-label" data-label="die" tabindex="-1"><b>${T("Lánzame", "Roll me")}</b></button>
        <button type="button" class="vt3-label" data-label="card" tabindex="-1"><b>${T("Ábrela", "Open me")}</b></button>
        <footer class="vt3-foot">
          <span class="vt3-hint">${T("Arrastra para rodear la mesa · Lanza el dado o elige una casilla", "Drag to walk around the table · Roll the die or pick a box")}</span>
          <div class="vt3-ctas">
            <a class="vt-cta" href="mailto:${esc(site.email)}?subject=${subject}">${T("Hablemos", "Let’s talk")} <span>→</span></a>
            ${site.calendly ? `<a class="vt-cta is-ghost" href="${esc(site.calendly)}" target="_blank" rel="noopener">${T("Reservar llamada", "Book a call")} <span>↗</span></a>` : ""}
          </div>
        </footer>
        <div class="vt3-note" role="dialog" aria-hidden="true" aria-label="${T("Una nota para usted", "A note for you")}">
          <p class="vt3-sr">${T("Para", "For")} ${esc(name)}. ${esc(note)} — Carlos</p>
          <button type="button" class="vt3-note-close">${T("Guardar en el sobre", "Back in the envelope")} ✕</button>
        </div>
        <div hidden>${order.map((i) => `<button data-next="${i}"></button>`).join("")}</div>
      </section>`;
  }

  /* ---------- canvases for print, chips, card, plaque ---------- */
  const mk = (w, h) => { const c = document.createElement("canvas"); c.width = w; c.height = h; return c; };
  const SANS = '"Neue Haas Grotesk", "Inter Tight", "Helvetica Neue", Arial, sans-serif';
  const MONO = '"Geist Mono", ui-monospace, monospace';

  // the layout printed on the felt, in gold
  function printCanvas(boxes, pw, ph) {
    const W = pw, H = ph;
    const c = mk(W, H), x = c.getContext("2d");
    x.strokeStyle = x.fillStyle = "#fff";
    x.textAlign = "center"; x.textBaseline = "middle";
    // inner line, a breath inside the rail
    x.lineWidth = 5;
    x.beginPath(); x.ellipse(W / 2, H / 2, W / 2 - 70, H / 2 - 70, 0, 0, Math.PI * 2); x.stroke();
    x.lineWidth = 2;
    x.beginPath(); x.ellipse(W / 2, H / 2, W / 2 - 92, H / 2 - 92, 0, 0, Math.PI * 2); x.stroke();
    // text that follows the oval
    const arcText = (txt, r, ry, mid, size, spacing) => {
      x.font = `500 ${size}px ${MONO}`;
      const chars = [...txt];
      const total = chars.reduce((s, ch) => s + x.measureText(ch).width + spacing, -spacing);
      let a = mid - total / r / 2;
      chars.forEach((ch) => {
        const w = x.measureText(ch).width;
        const ang = a + w / 2 / r;
        x.save();
        x.translate(W / 2 + Math.cos(ang) * r, H / 2 + Math.sin(ang) * ry);
        x.rotate(ang + Math.PI / 2);
        x.fillText(ch, 0, 0);
        x.restore();
        a += (w + spacing) / r;
      });
    };
    const N = ctx.name.toUpperCase();
    arcText(`WOBLO.IO · ${T("MESA PRIVADA", "PRIVATE TABLE")} · ${N}`, W / 2 - 150, H / 2 - 150, -Math.PI / 2, 46, 14);
    // the house rule, along the near curve, facing the guest
    {
      const txt = T("LA CASA SIEMPRE GANA · HOY GANA EL DISEÑO", "THE HOUSE ALWAYS WINS · TODAY DESIGN WINS");
      const r0 = W / 2 - 150, ry0 = H / 2 - 150, sp = 10;
      x.font = `500 30px ${MONO}`;
      const chars = [...txt];
      const total = chars.reduce((s2, ch) => s2 + x.measureText(ch).width + sp, -sp);
      let a = Math.PI / 2 + total / r0 / 2;
      chars.forEach((ch) => {
        const w = x.measureText(ch).width;
        const ang = a - w / 2 / r0;
        x.save();
        x.translate(W / 2 + Math.cos(ang) * r0, H / 2 + Math.sin(ang) * ry0);
        x.rotate(ang - Math.PI / 2);
        x.fillText(ch, 0, 0);
        x.restore();
        a -= (w + sp) / r0;
      });
    }
    // (no monogram in the centre any more: the envelope lies there)
    // the betting boxes: one per project
    boxes.forEach((b) => {
      x.lineWidth = 4;
      x.strokeRect(b.x, b.y, b.w, b.h);
      x.lineWidth = 1.5;
      x.strokeRect(b.x + 12, b.y + 12, b.w - 24, b.h - 24);
      x.font = `500 30px ${MONO}`;
      x.fillText(b.n, b.x + b.w / 2, b.y + 52);
      x.font = `600 ${b.title.length > 8 ? 56 : 66}px ${SANS}`;
      x.fillText(b.title.toUpperCase(), b.x + b.w / 2, b.y + b.h / 2 + 10);
      x.font = `500 22px ${MONO}`;
      x.fillText(b.sub.toUpperCase(), b.x + b.w / 2, b.y + b.h - 44);
    });
    return c;
  }

  function chipTop(base, insert, label) {
    const S = 512, c = mk(S, S), x = c.getContext("2d");
    x.fillStyle = base; x.fillRect(0, 0, S, S);
    for (let k = 0; k < 8; k++) {
      x.save(); x.translate(S / 2, S / 2); x.rotate((k / 8) * Math.PI * 2);
      x.fillStyle = insert; x.fillRect(-22, -S / 2, 44, 70);
      x.restore();
    }
    x.strokeStyle = GOLD; x.lineWidth = 6;
    x.beginPath(); x.arc(S / 2, S / 2, 150, 0, Math.PI * 2); x.stroke();
    x.lineWidth = 2;
    x.beginPath(); x.arc(S / 2, S / 2, 136, 0, Math.PI * 2); x.stroke();
    x.fillStyle = GOLD; x.textAlign = "center"; x.textBaseline = "middle";
    x.font = `600 ${label.length > 7 ? 40 : 56}px ${SANS}`;
    x.fillText(label.slice(0, 10), S / 2, S / 2 + 4);
    return c;
  }
  function chipSide(base, insert) {
    const c = mk(512, 32), x = c.getContext("2d");
    x.fillStyle = base; x.fillRect(0, 0, 512, 32);
    x.fillStyle = insert;
    for (let k = 0; k < 8; k++) x.fillRect(k * 64 + 20, 0, 24, 32);
    return c;
  }
  /* ---------- the envelope: cotton paper, a gold liner, a red wax seal ----------
     Drawn once on canvases; the same drawings dress the envelope on the table
     and the one that opens on screen. */
  // a pseudo-random that repeats: the seal looks the same every visit
  const prng = (seed) => () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
  function paperCanvas(w, h, base = [236, 229, 214]) {
    const c = mk(w, h), x = c.getContext("2d"), r = prng(11);
    x.fillStyle = `rgb(${base})`; x.fillRect(0, 0, w, h);
    const img = x.getImageData(0, 0, w, h), d = img.data;
    for (let i = 0; i < d.length; i += 4) {
      const p = i / 4, px = p % w, py = (p / w) | 0;
      // cotton: a soft mottle, and faint laid lines every few pixels
      const n = (r() - 0.5) * 10 + Math.sin(px * 0.045 + Math.sin(py * 0.02) * 3) * 2.2 + (py % 6 === 0 ? -2.5 : 0);
      d[i] += n; d[i + 1] += n; d[i + 2] += n * 0.9;
    }
    x.putImageData(img, 0, 0);
    for (let k = 0; k < (w * h) / 900; k++) { // a few longer fibres
      x.strokeStyle = `rgba(150,130,100,${0.05 + r() * 0.06})`; x.lineWidth = 0.6;
      const px = r() * w, py = r() * h, a = r() * Math.PI;
      x.beginPath(); x.moveTo(px, py); x.lineTo(px + Math.cos(a) * 9, py + Math.sin(a) * 9); x.stroke();
    }
    return c;
  }
  function waxSeal(S = 512, letter = "W") {
    const c = mk(S, S), x = c.getContext("2d"), r = prng(7), cx = S / 2, cy = S / 2, R = S * 0.4;
    // the poured wax: a circle that spread unevenly before it set
    const blob = () => {
      x.beginPath();
      for (let k = 0; k <= 96; k++) {
        const a = (k / 96) * Math.PI * 2;
        const rr = R * (1 + Math.sin(a * 5 + 1.3) * 0.025 + Math.sin(a * 11 + 0.4) * 0.018 + Math.sin(a * 3) * 0.03 + (k % 13 === 0 ? 0.035 : 0));
        k ? x.lineTo(cx + Math.cos(a) * rr, cy + Math.sin(a) * rr) : x.moveTo(cx + Math.cos(a) * rr, cy + Math.sin(a) * rr);
      }
      x.closePath();
    };
    x.save(); x.shadowColor = "rgba(0,0,0,0.45)"; x.shadowBlur = S * 0.03; x.shadowOffsetY = S * 0.012;
    blob(); x.fillStyle = "#7d0a10"; x.fill(); x.restore();
    blob(); x.save(); x.clip();
    // body: deep red, lit from the top left like the lamp over the table
    const g = x.createRadialGradient(cx - R * 0.35, cy - R * 0.4, R * 0.1, cx, cy, R * 1.15);
    g.addColorStop(0, "#c8222b"); g.addColorStop(0.55, "#9c1219"); g.addColorStop(1, "#5a050a");
    x.fillStyle = g; x.fillRect(0, 0, S, S);
    // the raised rim the stamp pushed out
    x.lineWidth = R * 0.12; x.strokeStyle = "rgba(255,120,120,0.16)";
    x.beginPath(); x.arc(cx - 2, cy - 2, R * 0.82, 0, Math.PI * 2); x.stroke();
    x.strokeStyle = "rgba(40,0,0,0.35)"; x.lineWidth = R * 0.05;
    x.beginPath(); x.arc(cx + 2, cy + 3, R * 0.74, 0, Math.PI * 2); x.stroke();
    // the stamp: a sunk disc, a fine border of beads, the letter in relief
    const disc = x.createRadialGradient(cx + R * 0.15, cy + R * 0.2, R * 0.05, cx, cy, R * 0.72);
    disc.addColorStop(0, "#a3141b"); disc.addColorStop(1, "#6e070d");
    x.fillStyle = disc; x.beginPath(); x.arc(cx, cy, R * 0.7, 0, Math.PI * 2); x.fill();
    for (let k = 0; k < 48; k++) {
      const a = (k / 48) * Math.PI * 2, bx = cx + Math.cos(a) * R * 0.6, by = cy + Math.sin(a) * R * 0.6;
      x.fillStyle = "rgba(255,150,150,0.35)"; x.beginPath(); x.arc(bx - 1, by - 1, R * 0.022, 0, Math.PI * 2); x.fill();
      x.fillStyle = "rgba(50,0,0,0.45)"; x.beginPath(); x.arc(bx + 1, by + 1, R * 0.02, 0, Math.PI * 2); x.fill();
    }
    x.textAlign = "center"; x.textBaseline = "middle";
    x.font = `600 ${R * 0.78}px "Times New Roman", Georgia, serif`;
    x.fillStyle = "rgba(40,0,0,0.55)"; x.fillText(letter, cx + R * 0.035, cy + R * 0.05);   // shadow side
    x.fillStyle = "rgba(255,170,170,0.55)"; x.fillText(letter, cx - R * 0.03, cy - R * 0.02);  // lit side
    x.fillStyle = "#a8161e"; x.fillText(letter, cx, cy + R * 0.015);
    // wet-looking highlights
    [[-0.42, -0.5, 0.2, 0.08], [0.3, -0.62, 0.08, 0.04], [-0.62, 0.15, 0.06, 0.12]].forEach(([u, v, a, b]) => {
      const hg = x.createRadialGradient(cx + u * R, cy + v * R, 0, cx + u * R, cy + v * R, R * a * 2);
      hg.addColorStop(0, "rgba(255,230,230,0.55)"); hg.addColorStop(1, "rgba(255,230,230,0)");
      x.fillStyle = hg; x.beginPath(); x.ellipse(cx + u * R, cy + v * R, R * a * 2, R * b * 2, -0.5, 0, Math.PI * 2); x.fill();
    });
    for (let k = 0; k < 600; k++) { x.fillStyle = `rgba(${r() < 0.5 ? "255,200,200" : "40,0,0"},0.06)`; x.fillRect(r() * S, r() * S, 2, 2); }
    x.restore();
    return c;
  }
  // the top of the envelope's body: the pocket's seams, and the dark liner in the V
  // that only shows once the flap is open. flapK = flap length / envelope depth
  function envelopeBody(w, h, flapK) {
    const c = mk(w, h), x = c.getContext("2d");
    x.drawImage(paperCanvas(w, h), 0, 0);
    const tipY = h * flapK;
    // the opening: liner seen inside
    x.save(); x.beginPath(); x.moveTo(0, 0); x.lineTo(w, 0); x.lineTo(w / 2, tipY * 0.92); x.closePath(); x.clip();
    x.drawImage(linerCanvas(w, h), 0, 0);
    const sh = x.createLinearGradient(0, 0, 0, tipY); sh.addColorStop(0, "rgba(0,0,0,0.55)"); sh.addColorStop(1, "rgba(0,0,0,0)");
    x.fillStyle = sh; x.fillRect(0, 0, w, tipY);
    x.restore();
    // the side flaps' and bottom flap's seams: paper over paper
    x.save();
    x.shadowColor = "rgba(70,52,30,0.45)"; x.shadowBlur = w * 0.01; x.shadowOffsetY = -w * 0.002;
    x.strokeStyle = "rgba(120,96,62,0.55)"; x.lineWidth = 2.5;
    x.beginPath(); x.moveTo(0, 0); x.lineTo(w * 0.47, h * 0.56); x.lineTo(w * 0.53, h * 0.56); x.lineTo(w, 0); x.stroke();
    x.beginPath(); x.moveTo(0, h); x.lineTo(w * 0.47, h * 0.56); x.moveTo(w, h); x.lineTo(w * 0.53, h * 0.56); x.stroke();
    x.restore();
    x.strokeStyle = "rgba(190,150,80,0.85)"; x.lineWidth = Math.max(3, w * 0.005); x.strokeRect(x.lineWidth / 2, x.lineWidth / 2, w - x.lineWidth, h - x.lineWidth);
    return c;
  }
  // the card inside: black lacquer, gilt border, the note set like an invitation
  function noteCardCanvas(w, h, name, note) {
    const c = mk(w, h), x = c.getContext("2d");
    const g = x.createRadialGradient(w / 2, 0, 0, w / 2, h * 0.2, w * 0.8);
    g.addColorStop(0, "#1c1913"); g.addColorStop(0.55, "#0c0c0d"); g.addColorStop(1, "#070708");
    x.fillStyle = g; x.fillRect(0, 0, w, h);
    x.strokeStyle = "rgba(216,181,111,0.05)"; x.lineWidth = 1.5;
    for (let k = -h; k < w; k += 22) { x.beginPath(); x.moveTo(k, 0); x.lineTo(k + h, h); x.stroke(); }
    x.strokeStyle = "rgba(216,181,111,0.9)"; x.lineWidth = 5; x.strokeRect(40, 40, w - 80, h - 80);
    x.strokeStyle = "rgba(216,181,111,0.35)"; x.lineWidth = 2; x.strokeRect(62, 62, w - 124, h - 124);
    const M = w * 0.09;
    x.textBaseline = "alphabetic";
    x.fillStyle = "#d8b56f"; x.font = `500 ${Math.round(w * 0.019)}px ${MONO}`;
    if ("letterSpacing" in x) x.letterSpacing = `${Math.round(w * 0.006)}px`;
    x.fillText(`${T("PARA", "FOR")} ${name.toUpperCase()}`, M, h * 0.2);
    if ("letterSpacing" in x) x.letterSpacing = "0px";
    // the note, wrapped, its paragraphs kept, the type as large as the card allows
    const top = h * 0.27, bottom = h * 0.78, maxW = w - M * 2;
    const paras = String(note).split(/\n+/).map((p) => p.trim()).filter(Boolean);
    let fs2 = Math.round(w * 0.036), lines, lh, gap;
    for (; fs2 > w * 0.016; fs2 -= 2) {
      x.font = `400 ${fs2}px ${SANS}`; lh = fs2 * 1.42; gap = fs2 * 0.6; lines = [];
      paras.forEach((p, k) => {
        let line = "";
        p.split(/\s+/).forEach((wd) => { const t = line ? line + " " + wd : wd; if (x.measureText(t).width > maxW && line) { lines.push([line, 0]); line = wd; } else line = t; });
        if (line) lines.push([line, k < paras.length - 1 ? 1 : 0]);
      });
      const height = lines.length * lh + lines.filter((l) => l[1]).length * gap;
      if (height <= bottom - top) break;
    }
    x.fillStyle = "#ecebe7"; x.font = `400 ${fs2}px ${SANS}`;
    const total = lines.length * lh + lines.filter((l) => l[1]).length * gap;
    let y = top + (bottom - top - total) / 2 + fs2;
    lines.forEach(([l, br]) => { x.fillText(l, M, y); y += lh + (br ? gap : 0); });
    x.fillStyle = "#f1d8a0"; x.font = `500 ${Math.round(w * 0.022)}px ${MONO}`;
    if ("letterSpacing" in x) x.letterSpacing = `${Math.round(w * 0.004)}px`;
    x.fillText("— Carlos", M, h * 0.86);
    x.textAlign = "right"; x.fillStyle = "rgba(216,181,111,0.6)"; x.font = `500 ${Math.round(w * 0.015)}px ${MONO}`;
    x.fillText("WOBLO.IO", w - M, h * 0.86);
    if ("letterSpacing" in x) x.letterSpacing = "0px";
    return c;
  }
  // the liner: black paper with a fine gold lattice, seen when the flap opens
  function linerCanvas(w, h) {
    const c = mk(w, h), x = c.getContext("2d");
    x.fillStyle = "#0d0c0b"; x.fillRect(0, 0, w, h);
    x.strokeStyle = "rgba(216,181,111,0.55)"; x.lineWidth = 1;
    for (let k = -h; k < w; k += 14) { x.beginPath(); x.moveTo(k, 0); x.lineTo(k + h, h); x.stroke(); x.beginPath(); x.moveTo(k + h, 0); x.lineTo(k, h); x.stroke(); }
    return c;
  }

  function cardBack() {
    const c = mk(512, 736), x = c.getContext("2d");
    x.fillStyle = "#0b0b0c"; x.fillRect(0, 0, 512, 736);
    x.strokeStyle = "rgba(216,181,111,0.35)"; x.lineWidth = 2;
    for (let k = -736; k < 736; k += 18) { x.beginPath(); x.moveTo(k, 0); x.lineTo(k + 736, 736); x.stroke(); }
    x.fillStyle = "#0b0b0c"; x.fillRect(150, 268, 212, 200);
    x.strokeStyle = GOLD; x.lineWidth = 6; x.strokeRect(22, 22, 468, 692);
    x.lineWidth = 2; x.strokeRect(38, 38, 436, 660);
    x.fillStyle = GOLD; x.textAlign = "center"; x.textBaseline = "middle";
    x.font = `120px ${SANS}`; x.fillText("♠", 256, 350);
    x.font = `500 22px ${MONO}`; x.fillText(T("UNA NOTA", "A NOTE"), 256, 440);
    return c;
  }
  function plaqueFace(name) {
    const c = mk(1024, 360), x = c.getContext("2d");
    x.fillStyle = "#070708"; x.fillRect(0, 0, 1024, 360);
    x.strokeStyle = GOLD; x.lineWidth = 4; x.strokeRect(18, 18, 988, 324);
    x.fillStyle = GOLD; x.textAlign = "center"; x.textBaseline = "middle";
    x.font = `500 44px ${MONO}`; x.fillText(T("R E S E R V A D O", "R E S E R V E D"), 512, 120);
    x.font = `600 ${name.length > 10 ? 80 : 104}px ${SANS}`; x.fillText(name.toUpperCase().slice(0, 16), 512, 236);
    return c;
  }

  const EX = "https://cdn.jsdelivr.net/npm/three@0.147.0/examples/js/";
  const POST_URLS = ["shaders/CopyShader.js", "shaders/LuminosityHighPassShader.js", "postprocessing/EffectComposer.js",
    "postprocessing/RenderPass.js", "postprocessing/ShaderPass.js", "postprocessing/UnrealBloomPass.js",
    "shaders/BokehShader.js", "postprocessing/BokehPass.js"].map((p) => EX + p);
  const loaded = new Set();
  const addScript = (src) => new Promise((res) => {
    if (loaded.has(src)) return res(true);
    const s = document.createElement("script");
    s.src = src; s.onload = () => { loaded.add(src); res(true); }; s.onerror = () => res(false);
    document.head.appendChild(s);
  });
  // all at once over the network, run in order (async = false keeps document order)
  const chains = new Map();
  const loadChain = (urls) => {
    const key = urls.join("|");
    if (!chains.has(key)) chains.set(key, Promise.all(urls.map((src) => new Promise((res) => {
      if (loaded.has(src)) return res(true);
      const el = document.createElement("script");
      el.src = src; el.async = false;
      el.onload = () => { loaded.add(src); res(true); }; el.onerror = () => res(false);
      document.head.appendChild(el);
    }))).then((r) => r.every(Boolean)));
    return chains.get(key);
  };
  // warm up: the table's extra files load while you look at the chip, not after you click it
  const warm = () => { if (!(window.PERF && window.PERF.lite)) loadChain(POST_URLS); loadScript(ENV_URL); };
  if (window.THREE) {
    const idle = window.requestIdleCallback || ((f) => setTimeout(f, 2500));
    idle(warm, { timeout: 6000 });
    addEventListener("pointerover", (e) => { if (e.target.closest && e.target.closest(".chip-vip")) warm(); }, { passive: true });
  }

  /* ---------- the lounge: a whole room, out of focus, far behind ----------
     Painted once on a canvas as a 360° strip (seamless left to right):
     other tables under their lamps, a backlit bar, chandeliers, columns,
     and the bokeh of a hundred small lights. Kept small, so the texture
     itself does the blurring when stretched. */
  function loungeStrip() {
    const W = 3072, H = 768, HZ = H * 0.58;
    const c = mk(W, H), x = c.getContext("2d");
    let seed = 7;
    const r = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
    const wrap = (fn) => { fn(0); x.save(); x.translate(-W, 0); fn(-W); x.restore(); x.save(); x.translate(W, 0); fn(W); x.restore(); };
    // the room in the dark: ceiling, a warm band at eye level, the floor
    const bg = x.createLinearGradient(0, 0, 0, H);
    bg.addColorStop(0, "#050506"); bg.addColorStop(0.42, "#0d0a09"); bg.addColorStop(0.58, "#1a120c");
    bg.addColorStop(0.7, "#0b0908"); bg.addColorStop(1, "#050505");
    x.fillStyle = bg; x.fillRect(0, 0, W, H);
    // paintings on the far wall: dark canvases in thin gilt frames,
    // each with a brass picture light washing down over it
    const paintings = [[0.15, 150, 104], [0.47, 96, 128], [0.665, 120, 86]];
    paintings.forEach(([u, w, h]) => wrap(() => {
      const cx = W * u, top = HZ - 255;
      x.fillStyle = "rgba(70,52,30,0.9)"; x.fillRect(cx - w / 2 - 5, top - 5, w + 10, h + 10);   // frame
      const art = x.createLinearGradient(cx - w / 2, top, cx + w / 2, top + h);
      art.addColorStop(0, "#1a1410"); art.addColorStop(0.5, "#2a1d14"); art.addColorStop(1, "#120f0d");
      x.fillStyle = art; x.fillRect(cx - w / 2, top, w, h);
      // a suggestion of a picture: a few soft strokes of muted colour
      for (let k = 0; k < 5; k++) {
        x.fillStyle = `rgba(${["120,70,40", "60,80,70", "150,120,80", "90,40,35", "40,50,60"][(k + Math.round(u * 10)) % 5]},${0.25 + r() * 0.2})`;
        x.beginPath(); x.ellipse(cx - w / 2 + r() * w, top + r() * h, 8 + r() * w * 0.25, 6 + r() * h * 0.2, r() * 3, 0, Math.PI * 2); x.fill();
      }
      x.fillStyle = "rgba(200,160,90,0.8)"; x.fillRect(cx - w * 0.22, top - 16, w * 0.44, 4);          // picture light
    }));
    // a low chesterfield against the wall, between two tables
    wrap(() => {
      const cx = W * 0.3, w = 230, base = HZ - 6;
      x.fillStyle = "#0d0907";
      x.beginPath();
      x.moveTo(cx - w / 2, base); x.lineTo(cx - w / 2, base - 44);
      x.quadraticCurveTo(cx - w / 2, base - 58, cx - w / 2 + 16, base - 58);                 // rolled arm
      x.lineTo(cx - w / 2 + 16, base - 70); x.lineTo(cx + w / 2 - 16, base - 70);           // the back
      x.lineTo(cx + w / 2 - 16, base - 58); x.quadraticCurveTo(cx + w / 2, base - 58, cx + w / 2, base - 44);
      x.lineTo(cx + w / 2, base); x.closePath(); x.fill();
      // the leather catching a lamp: a line along the back and the arms, buttons in rows
      x.strokeStyle = "rgba(150,80,45,0.55)"; x.lineWidth = 2;
      x.beginPath(); x.moveTo(cx - w / 2 + 16, base - 69); x.lineTo(cx + w / 2 - 16, base - 69); x.stroke();
      x.strokeStyle = "rgba(150,80,45,0.35)";
      x.beginPath(); x.moveTo(cx - w / 2 + 2, base - 46); x.quadraticCurveTo(cx - w / 2 + 2, base - 56, cx - w / 2 + 16, base - 56); x.stroke();
      x.beginPath(); x.moveTo(cx + w / 2 - 2, base - 46); x.quadraticCurveTo(cx + w / 2 - 2, base - 56, cx + w / 2 - 16, base - 56); x.stroke();
      x.fillStyle = "rgba(160,100,60,0.35)";
      for (let row = 0; row < 2; row++) for (let k = 0; k < 9; k++) x.fillRect(cx - w / 2 + 30 + k * 21 + (row % 2) * 10, base - 62 + row * 8, 2, 2);
      x.fillStyle = "rgba(120,70,40,0.4)"; x.fillRect(cx - w / 2 + 6, base - 28, w - 12, 2);   // the seat edge
    });

    x.globalCompositeOperation = "lighter";
    const glow = (cx, cy, rx, ry, col, a) => {
      x.save(); x.translate(cx, cy); x.scale(1, ry / rx);
      const g = x.createRadialGradient(0, 0, 0, 0, 0, rx);
      g.addColorStop(0, `rgba(${col},${a})`); g.addColorStop(1, `rgba(${col},0)`);
      x.fillStyle = g; x.beginPath(); x.arc(0, 0, rx, 0, Math.PI * 2); x.fill(); x.restore();
    };
    // a long bar, backlit shelves of bottles
    wrap(() => {
      const bx = W * 0.56, bw = W * 0.26;
      glow(bx + bw / 2, HZ - 40, bw * 0.6, 70, "255,170,90", 0.22);
      for (let row = 0; row < 3; row++) {
        const y = HZ - 92 + row * 26;
        for (let k = 0; k < 70; k++) {
          const px = bx + r() * bw, hh = 6 + r() * 12;
          x.fillStyle = `rgba(${r() < 0.2 ? "140,200,170" : "255,190,120"},${0.08 + r() * 0.16})`;
          x.fillRect(px, y - hh, 2 + r() * 3, hh);
        }
        x.fillStyle = "rgba(255,200,140,0.10)"; x.fillRect(bx, y + 1, bw, 2);
      }
      glow(bx + bw / 2, HZ + 6, bw * 0.55, 10, "255,200,140", 0.25); // the bar top catching light
    });
    // the picture lights wash warm over each canvas; a floor lamp beside the sofa
    paintings.forEach(([u, w, h]) => wrap(() => {
      const cx = W * u, top = HZ - 255;
      glow(cx, top + h * 0.25, w * 0.75, h * 0.7, "255,205,140", 0.16);
      glow(cx, top - 14, w * 0.3, 6, "255,225,170", 0.5);
    }));
    wrap(() => {
      const lx = W * 0.3 + 140, ly = HZ - 92;
      glow(lx, ly, 26, 18, "255,210,150", 0.45);
      glow(lx - 60, HZ - 40, 150, 50, "255,180,110", 0.1);   // its light on the sofa and the floor
    });
    // other tables, each under its own lamp
    [0.08, 0.24, 0.4, 0.9].forEach((u, i) => wrap(() => {
      const cx = W * u, s = 0.7 + (i % 2) * 0.35;
      const cone = x.createLinearGradient(0, HZ - 150 * s, 0, HZ);
      cone.addColorStop(0, "rgba(255,225,170,0.0)"); cone.addColorStop(1, "rgba(255,225,170,0.10)");
      x.fillStyle = cone;
      x.beginPath(); x.moveTo(cx - 14 * s, HZ - 150 * s); x.lineTo(cx + 14 * s, HZ - 150 * s); x.lineTo(cx + 95 * s, HZ); x.lineTo(cx - 95 * s, HZ); x.fill();
      glow(cx, HZ - 150 * s, 26 * s, 10 * s, "255,220,160", 0.5);
      glow(cx, HZ + 4, 105 * s, 16 * s, "40,160,95", 0.32);   // the green of the felt
      glow(cx, HZ + 2, 70 * s, 8 * s, "255,230,180", 0.14);
    }));
    // chandeliers: clusters of small flames high up
    [0.16, 0.48, 0.74].forEach((u) => wrap(() => {
      const cx = W * u, cy = H * 0.14;
      glow(cx, cy, 120, 60, "255,200,130", 0.12);
      for (let k = 0; k < 26; k++) { const a = r() * Math.PI * 2, rr = r() * 60; glow(cx + Math.cos(a) * rr, cy + Math.sin(a) * rr * 0.4, 5 + r() * 7, 5 + r() * 7, "255,215,150", 0.35); }
    }));
    // bokeh: out-of-focus lights read as discs with an edge, brighter at the rim
    const disc = (cx, cy, rad, col, a) => {
      const g = x.createRadialGradient(cx, cy, 0, cx, cy, rad);
      g.addColorStop(0, `rgba(${col},${a * 0.55})`); g.addColorStop(0.82, `rgba(${col},${a * 0.75})`);
      g.addColorStop(0.93, `rgba(${col},${a})`); g.addColorStop(1, `rgba(${col},0)`);
      x.fillStyle = g; x.beginPath(); x.arc(cx, cy, rad, 0, Math.PI * 2); x.fill();
    };
    for (let k = 0; k < 190; k++) {
      const px = r() * W, py = HZ - 200 + Math.pow(r(), 0.8) * 250, rad = 5 + Math.pow(r(), 2.4) * 30;
      const col = r() < 0.1 ? "150,200,255" : r() < 0.3 ? "255,238,205" : "255,180,100";
      const a = 0.1 + r() * 0.22;
      wrap(() => disc(px, py, rad, col, a));
    }
    // columns: dark shapes in front of the glow, a thin edge of light
    x.globalCompositeOperation = "source-over";
    [0.02, 0.32, 0.52, 0.86].forEach((u) => wrap(() => {
      const cx = W * u, w = 46;
      const g = x.createLinearGradient(cx - w / 2, 0, cx + w / 2, 0);
      g.addColorStop(0, "rgba(4,4,5,0.95)"); g.addColorStop(0.85, "rgba(8,7,7,0.95)"); g.addColorStop(1, "rgba(60,44,30,0.6)");
      x.fillStyle = g; x.fillRect(cx - w / 2, 0, w, H);
    }));
    // soften everything once more, where the browser can
    const out = mk(W, H), o = out.getContext("2d");
    if ("filter" in o) o.filter = "blur(2.5px)";
    o.drawImage(c, 0, 0);
    return out;
  }

  const scriptP = new Map(); // one request per file, however many times it is asked for
  const loadScript = (src) => {
    if (window.THREE && THREE.RoomEnvironment) return Promise.resolve(true);
    if (!scriptP.has(src)) scriptP.set(src, new Promise((res) => {
      const s = document.createElement("script");
      s.src = src; s.onload = () => res(true); s.onerror = () => res(false);
      document.head.appendChild(s);
    }));
    return scriptP.get(src);
  };


  // shaders compile on the GPU driver's own threads (KHR_parallel_shader_compile): three.js would
  // otherwise stop and wait for each one to check it for errors, freezing the page for a second or more.
  // Resolves when every program is linked (or after a few seconds; then the first frame finishes the job)
  function compileAsync(renderer, scene, camera) {
    const gl = renderer.getContext(), ext = gl.getExtension("KHR_parallel_shader_compile");
    renderer.debug.checkShaderErrors = false;
    try { renderer.compile(scene, camera); } catch (e) { return Promise.resolve(); }
    if (!ext) return Promise.resolve();
    const t0 = performance.now();
    return new Promise((res) => {
      const poll = () => {
        const pending = renderer.info.programs.some((p) => p.program && !gl.getProgramParameter(p.program, ext.COMPLETION_STATUS_KHR));
        if (!pending || performance.now() - t0 > 6000) res(); else setTimeout(poll, 30);
      };
      poll();
    });
  }
  const portraitView = () => innerHeight > innerWidth * 1.15;

  /* ---------- the scene ---------- */
  function init(root) {
    const vt = root.querySelector(".vt3");
    if (!vt || !window.THREE || !ctx) return () => {};
    const canvas = vt.querySelector(".vt3-gl");
    const tip = vt.querySelector(".vt3-tip");
    const noteEl = vt.querySelector(".vt3-note");
    const small = innerWidth < 860;
    let disposed = false;
    // the visit: one message when the guest sits down, one when they leave, with what they did
    const visit = { sid: [...crypto.getRandomValues(new Uint8Array(8))].map((b) => b.toString(16).padStart(2, "0")).join(""), t0: Date.now(), did: {}, ended: false };
    const report = (ev) => {
      if (isAdmin() || !ctx.name) return;
      const body = JSON.stringify({ op: "visit", ev, name: ctx.name, sid: visit.sid, secs: (Date.now() - visit.t0) / 1000, did: visit.did });
      if (ev === "end" && navigator.sendBeacon && navigator.sendBeacon("/api/vip", new Blob([body], { type: "application/json" }))) return;
      fetch("/api/vip", { method: "POST", headers: { "Content-Type": "application/json" }, body, keepalive: true }).catch(() => {});
    };
    const endVisit = () => { if (visit.ended) return; visit.ended = true; report("end"); };
    const onHidden = () => { if (document.visibilityState === "hidden") endVisit(); };
    addEventListener("pagehide", endVisit);
    document.addEventListener("visibilitychange", onHidden);
    // what they touch: a project, the mail, the call
    vt.addEventListener("click", (e) => {
      const nx = e.target.closest("[data-next]");
      if (nx) { const p = ctx.projects[+nx.dataset.next]; if (p) { visit.did.p = p.title; (window.WOBLO_TRACK && window.WOBLO_TRACK("open", p.title + " (desde la mesa)")); } }
      const cta = e.target.closest(".vt-cta");
      if (cta) { if (cta.classList.contains("is-ghost")) visit.did.c = 1; else visit.did.m = 1; }
    }, true);
    report("open");
    const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: "high-performance" });
    // integrated and software GPUs (on Windows, through ANGLE) take ages to compile rich shaders
    const gpu = (() => { try { const gl = renderer.getContext(), e = gl.getExtension("WEBGL_debug_renderer_info"); return e ? String(gl.getParameter(e.UNMASKED_RENDERER_WEBGL)) : ""; } catch (e) { return ""; } })();
    const weakGPU = /Intel|HD Graphics|UHD Graphics|Iris|SwiftShader|llvmpipe|Basic Render|Mali|Adreno \(TM\) [1-6]/i.test(gpu) && !/\bArc\b/i.test(gpu);
    const lite = !!(window.PERF && window.PERF.lite) || weakGPU || /[?&]lite\b/.test(location.search); // no lens effects, simpler materials, fewer particles
    // a physical material where the device can afford it; a standard one, same look in broad strokes, where not
    const PHYS_ONLY = ["clearcoat", "clearcoatRoughness", "clearcoatMap", "clearcoatNormalMap", "clearcoatNormalScale", "clearcoatRoughnessMap", "transmission", "transmissionMap",
      "thickness", "thicknessMap", "attenuationColor", "attenuationDistance", "ior", "reflectivity", "specularIntensity", "specularColor", "sheen", "sheenColor", "sheenRoughness", "iridescence"];
    const PHYS = (o) => {
      if (!lite) return new THREE.MeshPhysicalMaterial(o);
      const q = Object.assign({}, o);
      if (q.transmission) { q.transparent = true; q.opacity = Math.min(q.opacity == null ? 1 : q.opacity, 0.32); q.depthWrite = false; }
      if (q.clearcoat) q.roughness = Math.max(0.05, (q.roughness == null ? 1 : q.roughness) * 0.7);
      PHYS_ONLY.forEach((k) => delete q[k]);
      return new THREE.MeshStandardMaterial(q);
    };
    renderer.setPixelRatio(Math.min(devicePixelRatio || 1, lite ? 1.25 : small ? 1.6 : 2));
    renderer.outputEncoding = THREE.sRGBEncoding;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.05;
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = lite ? THREE.PCFShadowMap : THREE.PCFSoftShadowMap;
    const aniso = renderer.capabilities.getMaxAnisotropy();

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x050506);
    scene.fog = new THREE.FogExp2(0x050506, 0.075);
    const camera = new THREE.PerspectiveCamera(small ? 44 : 30, 1, 0.05, 60);

    // the lounge, far away and out of focus, barely there
    const lounge = new THREE.Mesh(new THREE.CylinderGeometry(24, 24, 9, 96, 1, true), new THREE.MeshBasicMaterial({
      // 4 rounds of the strip: its pixels come out square on a cylinder this wide
      map: (() => { const t = new THREE.CanvasTexture(loungeStrip()); t.encoding = THREE.sRGBEncoding; t.wrapS = THREE.RepeatWrapping; t.repeat.x = 4; return t; })(),
      side: THREE.BackSide, transparent: true, opacity: 0.3,
      color: new THREE.Color(2.4, 2.2, 2.0), // the strip is painted dark; lifted here
      fog: false, depthWrite: false, toneMapped: false,
    }));
    lounge.position.y = 1.2;
    lounge.renderOrder = -1;
    scene.add(lounge);

    // light: one lamp hanging over the table, the room in darkness.
    // A tighter cone than before: a bright centre that falls off to black at the rail.
    // hung so the glowing rim of the shade just enters the top of the frame,
    // behind the welcome: same camera numbers as the view below
    const LAMP_Y = (() => {
      const pv = portraitView(), h0 = pv ? 3.1 : 1.25, R0 = pv ? 8.4 : small ? 6.6 : 7.4, ty = pv ? 0.15 : small ? -0.1 : 0.32;
      const half = THREE.MathUtils.degToRad(small ? 44 : 30) / 2;
      const D = R0 * 0.86; // nearest point of the orbit, where the lamp sits highest on screen
      const ang = Math.atan((ty - h0) / D) + Math.atan(0.9 * Math.tan(half));
      return h0 + D * Math.tan(ang) + 0.25;
    })();
    const lamp = new THREE.SpotLight(0xffecc8, 3.8, 0, 0.86, 0.85, 1.2);
    lamp.position.set(0, LAMP_Y - 0.2, 0);
    lamp.target.position.set(0, 0, 0);
    lamp.castShadow = true;
    lamp.shadow.mapSize.set(lite ? 1024 : small ? 1024 : 2048, lite ? 1024 : small ? 1024 : 2048);
    lamp.shadow.bias = -0.0004;
    lamp.shadow.camera.near = 0.5;
    lamp.shadow.camera.far = 8;
    scene.add(lamp, lamp.target);
    scene.add(new THREE.AmbientLight(0x8fb0a0, 0.025));
    const fill = new THREE.PointLight(0xffe2b0, 0.16, 12, 2);
    fill.position.set(0, 1.4, 4.6);
    scene.add(fill);

    // the lamp itself: a black metal shade, warm inside, a hot disc of light below
    const lampGroup = new THREE.Group();
    {
      const shadeOut = PHYS({ color: new THREE.Color(0x0b0b0c).convertSRGBToLinear(), roughness: 0.35, metalness: 0.6, clearcoat: 0.6, envMapIntensity: 0.6, side: THREE.FrontSide });
      const shadeIn = new THREE.MeshBasicMaterial({ color: new THREE.Color(0xffd9a0).multiplyScalar(2.2), side: THREE.BackSide, fog: false });
      const g = new THREE.CylinderGeometry(0.28, 0.95, 0.5, 64, 1, true);
      const outer = new THREE.Mesh(g, shadeOut);
      const inner = new THREE.Mesh(g, shadeIn);
      inner.scale.setScalar(0.985);
      const rim = new THREE.Mesh(new THREE.TorusGeometry(0.95, 0.012, 8, 96), new THREE.MeshStandardMaterial({ color: 0xc9a465, metalness: 1, roughness: 0.3 }));
      rim.rotation.x = Math.PI / 2; rim.position.y = -0.25;
      const bulb = new THREE.Mesh(new THREE.CircleGeometry(0.88, 64), new THREE.MeshBasicMaterial({ color: new THREE.Color(0xfff1d8).multiplyScalar(2.6), side: THREE.DoubleSide, fog: false }));
      bulb.rotation.x = Math.PI / 2; bulb.position.y = -0.1;
      const cap = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.1, 0.12, 24), shadeOut);
      cap.position.y = 0.3;
      const cord = new THREE.Mesh(new THREE.CylinderGeometry(0.008, 0.008, 6, 6), shadeOut);
      cord.position.y = 3.3;
      [outer, inner, rim, bulb, cap, cord].forEach((m) => { m.castShadow = false; lampGroup.add(m); });
      lampGroup.position.y = -6.3; // hangs 6.3 below the ceiling hook
    }
    const lampPivot = new THREE.Group();
    lampPivot.position.y = LAMP_Y + 6.3;
    lampPivot.add(lampGroup);
    scene.add(lampPivot);
    const sway = { x: 0, z: 0, vx: 0, vz: 0 };
    const lampWorld = new THREE.Vector3(), lampDown = new THREE.Vector3();
    function stepLamp(t, dt) {
      // a pendulum: spring back to rest, lose a little each swing, a breath of air
      const k = 3.2, c = 0.35;
      sway.vx += (-k * sway.x - c * sway.vx) * dt + Math.sin(t * 0.7) * 0.0009;
      sway.vz += (-k * sway.z - c * sway.vz) * dt + Math.cos(t * 0.53) * 0.0007;
      sway.x += sway.vx * dt; sway.z += sway.vz * dt;
      lampPivot.rotation.set(sway.x, 0, sway.z);
      lampPivot.updateMatrixWorld();
      lampGroup.getWorldPosition(lampWorld);
      lampDown.set(0, -1, 0).applyQuaternion(lampPivot.quaternion);
      lamp.position.copy(lampWorld).addScaledVector(lampDown, 0.2);
      lamp.target.position.copy(lampWorld).addScaledVector(lampDown, LAMP_Y);
      lamp.target.updateMatrixWorld();
    }
    {
    }

    // bloom: the gold and the brass glow where the lamp catches them.
    // Rendered in half float so the highlights keep their energy; tone mapping
    // and sRGB are applied in the last pass, since render targets skip them.
    let composer = null, bloom = null, bokeh = null;
    const postReady = (lite ? Promise.resolve(false) : loadChain(POST_URLS)).then((ok) => {
      if (!ok || disposed || !THREE.EffectComposer || !THREE.UnrealBloomPass) return;
      const rt = new THREE.WebGLRenderTarget(2, 2, { type: THREE.HalfFloatType });
      composer = new THREE.EffectComposer(renderer, rt);
      composer.addPass(new THREE.RenderPass(scene, camera));
      // like a lens: the near rail and the far dark soften, the middle of the table stays sharp
      if (!small && THREE.BokehPass) {
        const bp = new THREE.BokehPass(scene, camera, { focus: 7, aperture: 0.0016, maxblur: 0.0065 });
        bokeh = { uniforms: bp.uniforms };
        composer.addPass(bp);
      }
      bloom = new THREE.UnrealBloomPass(new THREE.Vector2(2, 2), 0.3, 0.32, 0.95);
      composer.addPass(bloom);
      composer.addPass(new THREE.ShaderPass({
        uniforms: { tDiffuse: { value: null } },
        vertexShader: "varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }",
        // #include must start its own line
        fragmentShader: "uniform sampler2D tDiffuse;\nvarying vec2 vUv;\nvoid main() {\ngl_FragColor = texture2D(tDiffuse, vUv);\n#include <tonemapping_fragment>\n#include <encodings_fragment>\n}",
      }));
      resize();
    });

    const pmrem = new THREE.PMREMGenerator(renderer);
    const envReady = loadScript(ENV_URL).then((ok) => {
      if (!ok || !THREE.RoomEnvironment || disposed) return;
      scene.environment = pmrem.fromScene(new THREE.RoomEnvironment(), 0.04).texture;
    });

    const loader = new THREE.TextureLoader();
    const tex = (url, srgb, rx, ry) => {
      const t = loader.load(url);
      t.wrapS = t.wrapT = THREE.RepeatWrapping;
      t.repeat.set(rx, ry);
      t.anisotropy = aniso;
      if (srgb) t.encoding = THREE.sRGBEncoding;
      return t;
    };
    const canvasTex = (c, srgb = true) => {
      const t = new THREE.CanvasTexture(c);
      t.anisotropy = aniso;
      if (srgb) t.encoding = THREE.sRGBEncoding;
      return t;
    };

    const ellipse = (a, b) => { const s = new THREE.Shape(); s.absellipse(0, 0, a, b, 0, Math.PI * 2, false, 0); return s; };
    const normUV = (geo, a, b) => {
      const p = geo.attributes.position, uv = geo.attributes.uv;
      for (let i = 0; i < p.count; i++) uv.setXY(i, p.getX(i) / (2 * a) + 0.5, p.getY(i) / (2 * b) + 0.5);
      uv.needsUpdate = true;
      return geo;
    };

    // felt: tiles of 1.1 units, a fibre sharp at a few centimetres
    const FA = A + 0.12, FB = B + 0.12;
    const tileX = (2 * FA) / 1.1, tileY = (2 * FB) / 1.1;
    const felt = new THREE.Mesh(normUV(new THREE.ShapeGeometry(ellipse(FA, FB), 160), FA, FB), PHYS({
      map: tex("assets/table/felt.jpg", true, tileX, tileY),
      normalMap: tex("assets/table/felt_n.jpg", false, tileX, tileY),
      normalScale: new THREE.Vector2(0.9, 0.9),
      color: 0x9eaaa3, roughness: 0.96, metalness: 0, envMapIntensity: 0.2,
      // wool catches light at grazing angles, like velvet
      sheen: 0.15, sheenColor: new THREE.Color(0x0f2a1e), sheenRoughness: 0.8,
    }));
    felt.rotation.x = -Math.PI / 2;
    felt.receiveShadow = true;
    scene.add(felt);

    // the printed layout, gold leaf on felt
    const BOXW = 400, BOXH = 250;
    const pw = 2048, ph = Math.round((pw * B) / A);
    const boxes = ctx.order.map((i, k) => {
      const p = ctx.projects[i];
      const cx = pw / 2 + (k - (ctx.order.length - 1) / 2) * 470;
      return { i, n: ctx.pad(i), title: p.title, sub: `${p.category} · ${p.year}`, x: cx - BOXW / 2, y: ph * 0.6 - BOXH / 2 + 60, w: BOXW, h: BOXH };
    });
    const print = new THREE.Mesh(normUV(new THREE.ShapeGeometry(ellipse(A, B), 160), A, B), new THREE.MeshStandardMaterial({
      color: 0xd7b06a, alphaMap: canvasTex(printCanvas(boxes, pw, ph), false), transparent: true,
      metalness: 0.85, roughness: 0.42, envMapIntensity: 1.2, depthWrite: false,
      polygonOffset: true, polygonOffsetFactor: -2,
    }));
    print.rotation.x = -Math.PI / 2;
    print.position.y = 0.002;
    print.receiveShadow = true;
    scene.add(print);
    // canvas top = far side (−z): the layout reads upright from the start
    const toWorld = (px, py) => new THREE.Vector3((px / pw - 0.5) * 2 * A, 0, (py / ph - 0.5) * 2 * B);
    const glows = boxes.map((b) => {
      const c0 = toWorld(b.x + b.w / 2, b.y + b.h / 2);
      const m = new THREE.Mesh(new THREE.PlaneGeometry((b.w / pw) * 2 * A, (b.h / ph) * 2 * B),
        new THREE.MeshBasicMaterial({ color: 0xffd795, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false }));
      m.rotation.x = -Math.PI / 2;
      m.position.set(c0.x, 0.004, c0.z);
      scene.add(m);
      return m;
    });

    // padded leather rail
    class Oval extends THREE.Curve {
      constructor(a, b, y) { super(); this.a = a; this.b = b; this.y = y; }
      getPoint(t, out = new THREE.Vector3()) { const g = t * Math.PI * 2; return out.set(Math.cos(g) * this.a, this.y, Math.sin(g) * this.b); }
    }
    const rail = new THREE.Mesh(new THREE.TubeGeometry(new Oval(A + 0.2, B + 0.2, 0.06), 420, 0.19, 32, true),
      PHYS({
        // colours here are linear: an sRGB oxblood, converted, so it stays truly dark
        color: new THREE.Color(0x2a0d0a).convertSRGBToLinear(), roughness: 0.42, metalness: 0,
        normalMap: tex("assets/table/leather_n.jpg", false, 90, 2), normalScale: new THREE.Vector2(0.5, 0.5),
        clearcoat: 0.35, clearcoatRoughness: 0.35, envMapIntensity: 0.25,
      }));
    rail.scale.y = 0.72;
    rail.castShadow = rail.receiveShadow = true;
    scene.add(rail);

    // saddle stitching along both edges of the rail, in waxed tan thread
    {
      const RA = A + 0.2, RB = B + 0.2, RR = 0.19, STEP = 0.042;
      const rows = [0.95, 2.2]; // angle on the tube's section: inner edge, outer edge
      const per = Math.round((Math.PI * Math.sqrt(2 * (RA * RA + RB * RB))) / STEP);
      const st = new THREE.InstancedMesh(new THREE.BoxGeometry(0.024, 0.005, 0.0055),
        new THREE.MeshStandardMaterial({ color: 0x9c7a46, roughness: 0.7, envMapIntensity: 0.15 }), per * rows.length);
      const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler(), s1 = new THREE.Vector3(1, 1, 1), p = new THREE.Vector3();
      let n = 0;
      rows.forEach((phi) => {
        for (let k = 0; k < per; k++) {
          const g = (k / per) * Math.PI * 2;
          const nx = Math.cos(g) / RA, nz = Math.sin(g) / RB, nl = Math.hypot(nx, nz); // outward normal of the oval
          const out = -Math.cos(phi) * RR; // phi from the inside
          p.set(Math.cos(g) * RA + (nx / nl) * out, 0.06 * 0.72 + Math.sin(phi) * RR * 0.72 + 0.002, Math.sin(g) * RB + (nz / nl) * out);
          const tang = Math.atan2(Math.cos(g) * RB, -Math.sin(g) * RA);
          e.set(0, -tang, phi < 1.57 ? -0.6 : 0.6, "YXZ");
          q.setFromEuler(e);
          st.setMatrixAt(n++, m4.compose(p, q, s1));
        }
      });
      st.instanceMatrix.needsUpdate = true;
      scene.add(st);
    }
    // a brass bead between the leather and the wood
    const brass = new THREE.MeshStandardMaterial({ color: 0xc9a465, metalness: 1, roughness: 0.28, envMapIntensity: 1 });
    const bead = new THREE.Mesh(new THREE.TubeGeometry(new Oval(A + 0.405, B + 0.405, 0.118), 600, 0.014, 12, true), brass);
    bead.castShadow = true;
    scene.add(bead);

    // lacquered wood: the drink ledge and the body of the table
    const woodMat = (dark) => PHYS({
      map: tex("assets/table/wood.jpg", true, 0.42, 0.42), normalMap: tex("assets/table/wood_n.jpg", false, 0.42, 0.42),
      normalScale: new THREE.Vector2(0.35, 0.35), color: dark ? 0x2a2a2a : 0xd0d0d0,
      roughness: 0.38, clearcoat: dark ? 0.3 : 0.8, clearcoatRoughness: 0.18, envMapIntensity: dark ? 0.08 : 0.22,
    });
    const ring = ellipse(A + 0.78, B + 0.78);
    const hole = new THREE.Path(); hole.absellipse(0, 0, A + 0.3, B + 0.3, 0, Math.PI * 2, true, 0);
    ring.holes.push(hole);
    const ledge = new THREE.Mesh(new THREE.ExtrudeGeometry(ring, { depth: 0.1, bevelEnabled: true, bevelThickness: 0.035, bevelSize: 0.04, bevelSegments: 6, curveSegments: 160 }), woodMat(false));
    ledge.rotation.x = -Math.PI / 2;
    ledge.position.y = -0.03;
    ledge.castShadow = ledge.receiveShadow = true;
    scene.add(ledge);
    const body = new THREE.Mesh(new THREE.ExtrudeGeometry(ellipse(A + 0.7, B + 0.7), { depth: 0.85, bevelEnabled: false, curveSegments: 160 }), woodMat(true));
    body.rotation.x = -Math.PI / 2;
    body.position.y = -0.9;
    body.receiveShadow = true;
    scene.add(body);
    // the table stands on something: a pedestal on a dark carpet
    {
      const FLOOR = -2.4;
      const ped = new THREE.Mesh(new THREE.CylinderGeometry(0.75, 1.15, FLOOR * -1 - 0.9, 64), woodMat(true));
      ped.position.y = (FLOOR - 0.9) / 2;
      ped.scale.z = 0.62;
      ped.castShadow = ped.receiveShadow = true;
      const foot = new THREE.Mesh(new THREE.CylinderGeometry(1.5, 1.6, 0.12, 64), woodMat(true));
      foot.position.y = FLOOR + 0.06; foot.scale.z = 0.62;
      foot.receiveShadow = true;
      const floor = new THREE.Mesh(new THREE.CircleGeometry(14, 64), new THREE.MeshStandardMaterial({
        color: new THREE.Color(0x12100e).convertSRGBToLinear(), roughness: 0.95, envMapIntensity: 0,
      }));
      floor.rotation.x = -Math.PI / 2; floor.position.y = FLOOR;
      floor.receiveShadow = true;
      scene.add(ped, foot, floor);
    }

    // chips: stacks of black and ivory, their name on the gold ones
    const chipGeo = (() => {
      const g = new THREE.CylinderGeometry(0.2, 0.2, 0.036, 72, 8), p = g.attributes.position, hh = 0.018;
      for (let i = 0; i < p.count; i++) {
        const x = p.getX(i), y = p.getY(i), z = p.getZ(i), r = Math.hypot(x, z);
        if (r < 0.199) continue;
        const k = (0.2 - 0.006 * Math.pow(Math.abs(y) / hh, 5)) / r; // the edge rolls over, like moulded clay
        p.setX(i, x * k); p.setZ(i, z * k);
      }
      g.computeVertexNormals();
      return g;
    })();
    // relief: a raised ring around the inlay, the inlay sunk, the inserts pressed into the edge
    const chipTopBump = (() => {
      const S = 256, c = mk(S, S), x = c.getContext("2d");
      x.fillStyle = "#808080"; x.fillRect(0, 0, S, S);
      x.fillStyle = "#5a5a5a"; x.beginPath(); x.arc(S / 2, S / 2, 66, 0, Math.PI * 2); x.fill();
      x.strokeStyle = "#c8c8c8"; x.lineWidth = 7; x.beginPath(); x.arc(S / 2, S / 2, 72, 0, Math.PI * 2); x.stroke();
      x.strokeStyle = "#a0a0a0"; x.lineWidth = 3; x.beginPath(); x.arc(S / 2, S / 2, 118, 0, Math.PI * 2); x.stroke();
      return canvasTex(c, false);
    })();
    const chipSideBump = (() => {
      const c = mk(512, 32), x = c.getContext("2d");
      x.fillStyle = "#808080"; x.fillRect(0, 0, 512, 32);
      x.fillStyle = "#4c4c4c";
      for (let k = 0; k < 8; k++) { x.fillRect(k * 64 + 19, 0, 2, 32); x.fillRect(k * 64 + 43, 0, 2, 32); }
      x.fillStyle = "#6a6a6a"; x.fillRect(0, 0, 512, 3); x.fillRect(0, 29, 512, 3);
      return canvasTex(c, false);
    })();
    const chipMats = (base, insert, label) => {
      const side = PHYS({ map: canvasTex(chipSide(base, insert)), bumpMap: chipSideBump, bumpScale: 0.6, roughness: 0.42, clearcoat: 0.45, clearcoatRoughness: 0.3, envMapIntensity: 0.3 });
      const top = PHYS({ map: canvasTex(chipTop(base, insert, label)), bumpMap: chipTopBump, bumpScale: 0.8, roughness: 0.38, clearcoat: 0.55, clearcoatRoughness: 0.25, envMapIntensity: 0.3 });
      return [side, top, top];
    };
    const kinds = [chipMats("#0d0d0e", "#d8b56f", ctx.name.toUpperCase()), chipMats("#e9e4d8", "#0d0d0e", "woblo"), chipMats("#0d0d0e", "#8c7444", "1000")];
    const stack = (x, z, n, kind) => {
      const g = new THREE.Group(), lean = { x: 0, z: 0 };
      for (let k = 0; k < n; k++) {
        const m = new THREE.Mesh(chipGeo, kinds[kind]);
        // each chip a little off the one below, the column drifting as it rises
        lean.x += (Math.random() - 0.5) * 0.007; lean.z += (Math.random() - 0.5) * 0.007;
        m.position.set(lean.x, 0.018 + k * 0.0372, lean.z);
        m.rotation.set((Math.random() - 0.5) * 0.03, Math.random() * Math.PI * 2, (Math.random() - 0.5) * 0.03);
        m.castShadow = m.receiveShadow = true;
        g.add(m);
      }
      g.position.set(x, 0, z);
      scene.add(g);
      contacts.push([x, z, 0.3, 0.55]);
    };
    const contacts = [];
    stack(-2.05, -0.75, 12, 0);
    stack(-1.62, -0.92, 7, 1);
    stack(-1.9, -0.36, 4, 2);
    stack(2.1, -0.72, 9, 0);
    stack(1.72, -0.95, 3, 1);
    // a loose chip leaning against the ivory stack, another lying flat on its own
    {
      const lean1 = new THREE.Mesh(chipGeo, kinds[0]);
      // tilted 1 rad, its top edge resting on the ivory stack, its bottom edge on the felt
      const tilt = 1.0, rr = 0.2, hh = 0.018;
      lean1.rotation.set(0, 0, -tilt);
      lean1.position.set(-1.62 + rr + Math.cos(tilt) * rr + 0.012, Math.sin(tilt) * rr + Math.cos(tilt) * hh, -0.92);
      const flat = new THREE.Mesh(chipGeo, kinds[2]);
      flat.position.set(1.95, 0.019, -0.22); flat.rotation.y = 2.1; // clear of the die's landing area
      [lean1, flat].forEach((m) => { m.castShadow = m.receiveShadow = true; scene.add(m); });
      contacts.push([1.95, -0.22, 0.24, 0.35], [-1.39, -0.88, 0.18, 0.3]);
    }
    // one chip lying on the first bet
    const bet = new THREE.Mesh(chipGeo, kinds[0]);
    const b0 = toWorld(boxes[0].x + boxes[0].w * 0.82, boxes[0].y + boxes[0].h * 0.2);
    bet.position.set(b0.x, 0.019, b0.z); bet.rotation.y = 0.7;
    bet.castShadow = true;
    scene.add(bet);

    // the note, in an envelope on the felt: a real object. Its flap turns on a hinge and
    // the wax seal breaks in two. 0.88 × 0.58 at (0, −0.8): the largest that covers no
    // lettering or line (the die now lands a little further forward to leave it room).
    const ENV_W = 0.88, ENV_D = 0.58, ENV_T = 0.014, FLAP_L = ENV_D * 0.62, SEAL_R = 0.075;
    const card = new THREE.Group(); // where the envelope lies; called "card" by the picking, the label and the halo
    card.position.set(0, 0, -0.8);
    scene.add(card);
    const env = new THREE.Group();   // the envelope itself: it gets picked up off the felt
    card.add(env);
    const ivory = new THREE.Color(0xa49c8c); // ivory under a hot lamp, not white
    const paperTex = canvasTex(paperCanvas(1024, 680));
    const paperMat = (extra = {}) => new THREE.MeshStandardMaterial(Object.assign({ map: paperTex, color: ivory, roughness: 0.86, envMapIntensity: 0.08 }, extra));
    const bodyTop = paperMat({ map: canvasTex(envelopeBody(1408, 928, FLAP_L / ENV_D)) });
    // built in layers, like a real one: the back panel and sides, the liner at the bottom,
    // the card lying on it, and on top the pocket with its V cut, through which the card shows.
    // The top edge is open: the mouth the card comes out of
    const none = new THREE.MeshBasicMaterial({ visible: false });
    const envBody = new THREE.Mesh(new THREE.BoxGeometry(ENV_W, ENV_T, ENV_D), [paperMat(), paperMat(), none, paperMat(), paperMat(), none]);
    envBody.position.y = ENV_T / 2 + 0.001;
    envBody.castShadow = envBody.receiveShadow = true;
    env.add(envBody);
    const V_DEPTH = FLAP_L * 0.92; // how far the V of the pocket reaches down
    const liner = new THREE.Mesh(new THREE.PlaneGeometry(ENV_W - 0.004, ENV_D - 0.004), new THREE.MeshStandardMaterial({
      map: canvasTex((() => { const c = linerCanvas(704, 464), x = c.getContext("2d");
        const g = x.createLinearGradient(0, 0, 0, 464); g.addColorStop(0, "rgba(0,0,0,0.6)"); g.addColorStop(0.5, "rgba(0,0,0,0.1)"); g.addColorStop(1, "rgba(0,0,0,0)");
        x.fillStyle = g; x.fillRect(0, 0, 704, 464); return c; })()),
      roughness: 0.6, envMapIntensity: 0.15,
    }));
    liner.rotation.x = -Math.PI / 2; liner.position.y = 0.0042; liner.receiveShadow = true;
    env.add(liner);
    // the pocket: the rectangle less the V, as one outline (shape y = −z: far edge at +D/2)
    const pocketShape = new THREE.Shape();
    pocketShape.moveTo(-ENV_W / 2, ENV_D / 2); pocketShape.lineTo(0, ENV_D / 2 - V_DEPTH); pocketShape.lineTo(ENV_W / 2, ENV_D / 2);
    pocketShape.lineTo(ENV_W / 2, -ENV_D / 2); pocketShape.lineTo(-ENV_W / 2, -ENV_D / 2); pocketShape.closePath();
    const pocketGeo = new THREE.ShapeGeometry(pocketShape, 8);
    { const p = pocketGeo.attributes.position, uv = pocketGeo.attributes.uv;
      for (let i = 0; i < p.count; i++) uv.setXY(i, p.getX(i) / ENV_W + 0.5, p.getY(i) / ENV_D + 0.5); }
    const pocket = new THREE.Mesh(pocketGeo, bodyTop);
    pocket.rotation.x = -Math.PI / 2; pocket.position.y = ENV_T + 0.001;
    pocket.castShadow = pocket.receiveShadow = true;
    env.add(pocket);
    // the flap, hinged on the far edge as an envelope lies in front of you. Once the
    // envelope is held up, it opens back over the top and folds behind (225°): the card
    // then slides up out of the mouth in front of it, touching nothing
    const FLAP_OPEN = -1.25 * Math.PI;
    const HINGE_Y = 0.003, SPINE = ENV_T + 0.0026 - HINGE_Y; // from the bottom layer up over the edge
    const flapPivot = new THREE.Group();
    flapPivot.position.set(0, HINGE_Y, -ENV_D / 2 - 0.002);
    env.add(flapPivot);
    const spine = new THREE.Mesh(new THREE.PlaneGeometry(ENV_W, SPINE), paperMat({ side: THREE.DoubleSide }));
    spine.position.y = SPINE / 2;
    spine.castShadow = true;
    flapPivot.add(spine);
    const flapShape = new THREE.Shape();
    flapShape.moveTo(-ENV_W / 2, 0); flapShape.lineTo(ENV_W / 2, 0); flapShape.lineTo(0.04, FLAP_L - 0.022);
    flapShape.quadraticCurveTo(0, FLAP_L + 0.012, -0.04, FLAP_L - 0.022); flapShape.closePath();
    const flapGeo = new THREE.ShapeGeometry(flapShape, 16);
    { const p = flapGeo.attributes.position, uv = flapGeo.attributes.uv;
      for (let i = 0; i < p.count; i++) uv.setXY(i, p.getX(i) / ENV_W + 0.5, 1 - p.getY(i) / ENV_D); }
    // turned to lie on the envelope with its tip toward you: the shape's back faces up (paper),
    // its front faces down (the liner, seen once the flap is open)
    // its paper has a soft shadow along the two cut edges: it reads as a layer on top
    const flapTex = (() => {
      const w = 1408, h = 928, c = mk(w, h), x = c.getContext("2d");
      x.drawImage(paperCanvas(w, h, [242, 236, 222]), 0, 0);
      const tip = [w / 2, h * (FLAP_L / ENV_D)];
      x.save(); x.strokeStyle = "rgba(90,70,40,0.5)"; x.lineWidth = 10; x.filter = "blur(6px)";
      x.beginPath(); x.moveTo(0, 0); x.lineTo(tip[0], tip[1]); x.lineTo(w, 0); x.stroke(); x.restore();
      x.strokeStyle = "rgba(255,255,255,0.6)"; x.lineWidth = 2;
      x.beginPath(); x.moveTo(6, 0); x.lineTo(tip[0], tip[1] - 8); x.lineTo(w - 6, 0); x.stroke();
      return canvasTex(c);
    })();
    const flapOut = new THREE.Mesh(flapGeo, paperMat({ side: THREE.BackSide, map: flapTex }));
    const flapIn = new THREE.Mesh(flapGeo, new THREE.MeshStandardMaterial({ map: canvasTex(linerCanvas(704, 464)), roughness: 0.55, envMapIntensity: 0.2, side: THREE.FrontSide }));
    [flapOut, flapIn].forEach((m) => { m.rotation.x = Math.PI / 2; m.position.y = SPINE; m.castShadow = true; m.receiveShadow = true; flapPivot.add(m); });
    // the wax seal at the tip, poured across the edge: one half on the flap, one on the body
    const waxTex = canvasTex(waxSeal(1024));
    const waxCap = PHYS({ map: waxTex, bumpMap: waxTex, bumpScale: 0.18, transparent: true, alphaTest: 0.35, roughness: 0.36, clearcoat: 0.5, clearcoatRoughness: 0.22, envMapIntensity: 0.15, side: THREE.DoubleSide });
    const waxSide = PHYS({ color: new THREE.Color(0x6e0810).convertSRGBToLinear(), roughness: 0.4, clearcoat: 0.4, envMapIntensity: 0.12 });
    // both halves share one top: the wax was poured in one go, so closed it reads as one disc.
    // drop: how far the half reaches down to the paper under it (the body sits lower than the flap)
    const SEAL_TOP = 0.0072;
    const sealHalf = (towardViewer, drop) => {
      const g = new THREE.Group();
      // the top: the drawing of the wax (its edge irregular) on a half-disc
      const cap = new THREE.Mesh(new THREE.CircleGeometry(SEAL_R * 1.25, 48, towardViewer ? Math.PI : 0, Math.PI), waxCap);
      cap.rotation.x = -Math.PI / 2; cap.position.y = SEAL_TOP;
      // its thickness: an open half-cylinder of red (no lid of its own to fight the drawing on top),
      // stopping just under the top and reaching down to the paper
      const h = SEAL_TOP - 0.0004 + drop;
      const body = new THREE.Mesh(new THREE.CylinderGeometry(SEAL_R * 0.94, SEAL_R * 0.98, h, 40, 1, true, towardViewer ? -Math.PI / 2 : Math.PI / 2, Math.PI), waxSide);
      body.position.y = SEAL_TOP - 0.0004 - h / 2;
      // the broken face, where the two halves part: only there once the seal cracks
      const face = new THREE.Mesh(new THREE.PlaneGeometry(SEAL_R * 1.86, h), new THREE.MeshStandardMaterial({ color: waxSide.color, roughness: 0.55, side: THREE.DoubleSide }));
      face.position.y = body.position.y;
      face.visible = false;
      g.userData.face = face;
      g.add(cap, body, face);
      g.traverse((o) => { if (o.isMesh) o.castShadow = true; });
      return g;
    };
    const tipZ = -ENV_D / 2 + FLAP_L - 0.035;
    // the flap half sits on the flap; the body half at exactly the same height, reaching down past the flap to the pocket
    const FLAP_SEAL_Y = SPINE + 0.0004, BODY_SEAL_Y = HINGE_Y + FLAP_SEAL_Y;
    const sealBody = sealHalf(true, BODY_SEAL_Y - (ENV_T + 0.001)); sealBody.position.set(0, BODY_SEAL_Y, tipZ); env.add(sealBody);
    const sealFlap = sealHalf(false, 0.0004); sealFlap.position.set(0, FLAP_SEAL_Y, tipZ - flapPivot.position.z); flapPivot.add(sealFlap); // the very same spot as the body half: no gap
    // the card inside, with the note on it: a real texture, readable when it comes to you
    // the mouth of the envelope: whatever of the card is still behind it is not drawn
    renderer.localClippingEnabled = true;
    const mouth = new THREE.Plane(new THREE.Vector3(0, 0, -1), 0); // placed every frame at the envelope's top edge
    const clip = {}; // (no clipping: the pocket covers the card, the mouth is open)
    const noteTex = canvasTex(noteCardCanvas(2048, 1340, ctx.name, ctx.note));
    // satin black: no glare under the lamp. While it is read, its own light (below) and a faint
    // glow in the ink keep it legible however it faces the lamp
    const noteFace = new THREE.MeshStandardMaterial({ ...clip, map: noteTex, emissiveMap: noteTex, emissive: 0xffffff, emissiveIntensity: 0, roughness: 0.78, envMapIntensity: 0.05 });
    // a soft key light that comes with the card: from above your left shoulder, like a reading lamp
    const noteLight = new THREE.SpotLight(0xfff0d8, 0, 4, 0.55, 0.9, 1.2);
    noteLight.castShadow = false;
    scene.add(noteLight, noteLight.target);
    const gilt = new THREE.MeshStandardMaterial({ ...clip, color: 0xb08d4e, metalness: 0.9, roughness: 0.35 });
    const lacquer = new THREE.MeshStandardMaterial({ ...clip, color: 0x0a0a0b, roughness: 0.4 });
    const CARD_W = ENV_W - 0.06, CARD_D = ENV_D - 0.06;
    const noteCard = new THREE.Mesh(new THREE.BoxGeometry(CARD_W, 0.004, CARD_D), [gilt, gilt, noteFace, lacquer, gilt, gilt]);
    noteCard.castShadow = true;
    scene.add(noteCard);
    contacts.push([bet.position.x, bet.position.z, 0.26, 0.4], [card.position.x, card.position.z, 0.42, 0.35]);
    // a gold halo that breathes under the card: something is waiting there
    const cardHalo = new THREE.Mesh(new THREE.PlaneGeometry(1.35, 1.0), new THREE.MeshBasicMaterial({
      map: (() => { const c = mk(256, 256), x = c.getContext("2d"), g = x.createRadialGradient(128, 128, 30, 128, 128, 128);
        g.addColorStop(0, "rgba(255,215,150,0.9)"); g.addColorStop(0.5, "rgba(255,200,120,0.25)"); g.addColorStop(1, "rgba(255,200,120,0)");
        x.fillStyle = g; x.fillRect(0, 0, 256, 256); return canvasTex(c); })(),
      transparent: true, opacity: 0.2, blending: THREE.AdditiveBlending, depthWrite: false,
    }));
    cardHalo.rotation.set(-Math.PI / 2, 0, 0);
    cardHalo.position.set(card.position.x, 0.0015, card.position.z);
    cardHalo.renderOrder = 1;
    scene.add(cardHalo);

    const LEDGE_Y = 0.105;
    const onLedge = (g) => new THREE.Vector3(Math.cos(g) * (A + 0.54), LEDGE_Y, Math.sin(g) * (B + 0.54));
    const glassMat = (extra) => PHYS(Object.assign({
      color: 0xffffff, metalness: 0, roughness: 0.04, transmission: 1, thickness: 0.06, ior: 1.5,
      envMapIntensity: 0.22, clearcoat: 0.4, clearcoatRoughness: 0.05, specularIntensity: 0.8,
    }, extra));
    const lathe = (pts, seg = 64) => new THREE.LatheGeometry(pts.map(([x, y]) => new THREE.Vector2(x, y)), seg);
    // ashtray: heavy cut glass, a shallow bowl
    const ashPos = onLedge(1.08);
    const ash = new THREE.Mesh(lathe([[0, 0], [0.2, 0], [0.215, 0.012], [0.215, 0.062], [0.2, 0.066], [0.15, 0.058], [0.13, 0.03], [0, 0.03]]), glassMat({ thickness: 0.12, envMapIntensity: 0.7, clearcoat: 1, color: new THREE.Color(0xdfe6e2) }));
    ash.position.copy(ashPos);
    ash.castShadow = true;
    scene.add(ash);
    // the cigar resting on the rim, its end burning
    const cigar = new THREE.Group();
    {
      const leaf = new THREE.MeshStandardMaterial({ color: new THREE.Color(0x5a3418).convertSRGBToLinear(), roughness: 0.75 });
      const body = new THREE.Mesh(new THREE.CylinderGeometry(0.021, 0.021, 0.34, 20), leaf);
      body.rotation.z = Math.PI / 2;
      const band = new THREE.Mesh(new THREE.CylinderGeometry(0.0222, 0.0222, 0.03, 20), new THREE.MeshStandardMaterial({ color: 0xb08d4e, metalness: 0.8, roughness: 0.35 }));
      band.rotation.z = Math.PI / 2; band.position.x = 0.1;
      const ashTip = new THREE.Mesh(new THREE.CylinderGeometry(0.0205, 0.021, 0.035, 20), new THREE.MeshStandardMaterial({ color: 0x8d8a86, roughness: 1 }));
      ashTip.rotation.z = Math.PI / 2; ashTip.position.x = -0.187;
      const ember = new THREE.Mesh(new THREE.CircleGeometry(0.019, 20), new THREE.MeshBasicMaterial({ color: new THREE.Color(0xff5a1a).multiplyScalar(4) }));
      ember.rotation.y = -Math.PI / 2; ember.position.x = -0.2055;
      [body, band, ashTip, ember].forEach((m) => { m.castShadow = true; cigar.add(m); });
      cigar.userData.ember = ember;
    }
    cigar.position.copy(ashPos).add(new THREE.Vector3(0, 0.07, 0));
    cigar.rotation.set(0, 1.08 + Math.PI / 2, -0.12);
    cigar.translateX(-0.05);
    scene.add(cigar);
    const emberWorld = new THREE.Vector3();
    cigar.userData.ember.getWorldPosition(emberWorld);

    // the glass: a heavy tumbler, two fingers of whisky, three cubes of ice
    // further out on the wood, so the bigger glass clears the leather rail
    const glassPos = new THREE.Vector3(Math.cos(2.12) * (A + 0.63), LEDGE_Y, Math.sin(2.12) * (B + 0.63));
    const tumbler = new THREE.Group();
    {
      // a transparent shell (not transmission): transmissive objects cannot see each other,
      // and the ice inside must be visible through the glass
      const g = new THREE.Mesh(lathe([[0, 0], [0.13, 0], [0.135, 0.01], [0.14, 0.23], [0.132, 0.232], [0.125, 0.04], [0, 0.04]]), PHYS({
        color: 0xffffff, transparent: true, opacity: 0.1, roughness: 0.02, metalness: 0, depthWrite: false,
        clearcoat: 1, clearcoatRoughness: 0.02, envMapIntensity: 1.6, specularIntensity: 1, ior: 1.5,
      }));
      // the lip and the heavy base catch the light as bright lines
      const lip = new THREE.Mesh(new THREE.TorusGeometry(0.136, 0.0035, 8, 64), PHYS({ color: 0xffffff, transparent: true, opacity: 0.45, roughness: 0.02, clearcoat: 1, envMapIntensity: 2, depthWrite: false }));
      lip.rotation.x = Math.PI / 2; lip.position.y = 0.231; lip.renderOrder = 3;
      tumbler.add(lip);
      g.renderOrder = 3;
      const whisky = new THREE.Mesh(new THREE.CylinderGeometry(0.123, 0.121, 0.085, 48), PHYS({
        // opaque on purpose: glass only shows what is opaque behind it
        // deep amber in the body, lit from within where the lamp passes through it
        color: new THREE.Color(0x5a2208).convertSRGBToLinear(), emissive: new THREE.Color(0x8a3a0c).convertSRGBToLinear(), emissiveIntensity: 0.55,
        roughness: 0.1, clearcoat: 0.6, clearcoatRoughness: 0.05, envMapIntensity: 0.25,
      }));
      // the surface: brighter, glossy, a meniscus that catches the light
      const surface = new THREE.Mesh(new THREE.CircleGeometry(0.122, 48), PHYS({
        color: new THREE.Color(0x7a3a10).convertSRGBToLinear(), emissive: new THREE.Color(0x5a2406).convertSRGBToLinear(), emissiveIntensity: 0.35,
        roughness: 0.02, clearcoat: 1, clearcoatRoughness: 0.0, envMapIntensity: 1.2, specularIntensity: 1,
      }));
      surface.rotation.x = -Math.PI / 2; surface.position.y = 0.04 + 0.0855;
      tumbler.add(surface);
      whisky.position.y = 0.04 + 0.0425;
      whisky.renderOrder = 1;
      g.castShadow = true;
      tumbler.add(g, whisky);
      // every cube its own shape: rounded by melting, faces slightly dished, never quite square
      const cube = (seed, size = 0.075) => {
        const b = new THREE.BoxGeometry(1, 1, 1, 8, 8, 8), p = b.attributes.position, v = new THREE.Vector3(), cc = new THREE.Vector3(), r = 0.22, inner = 0.5 - r;
        const sx = 1 + Math.sin(seed * 3.1) * 0.12, sy = 0.86 + Math.cos(seed * 1.7) * 0.08, sz = 1 + Math.sin(seed * 5.3) * 0.1;
        for (let i = 0; i < p.count; i++) {
          v.fromBufferAttribute(p, i);
          cc.set(Math.max(-inner, Math.min(inner, v.x)), Math.max(-inner, Math.min(inner, v.y)), Math.max(-inner, Math.min(inner, v.z)));
          v.sub(cc).normalize().multiplyScalar(r).add(cc);
          const n = Math.sin(v.x * 11 + seed) * Math.cos(v.y * 9 - seed) * Math.sin(v.z * 13 + seed * 2) * 0.035; // melt ripples
          v.multiplyScalar(1 + n);
          p.setXYZ(i, v.x * size * sx, v.y * size * sy, v.z * size * sz);
        }
        b.computeVertexNormals();
        return b;
      };
      // a fine normal map: frost, tiny pits and the cracks that run through real ice
      const iceNormal = (() => {
        const S = 256, c = mk(S, S), x = c.getContext("2d");
        x.fillStyle = "rgb(128,128,255)"; x.fillRect(0, 0, S, S);
        for (let k = 0; k < 900; k++) { const px = Math.random() * S, py = Math.random() * S, rr = 1 + Math.random() * 3;
          x.fillStyle = `rgba(${100 + Math.random() * 56},${100 + Math.random() * 56},255,0.5)`; x.beginPath(); x.arc(px, py, rr, 0, Math.PI * 2); x.fill(); }
        x.strokeStyle = "rgba(170,110,255,0.6)"; x.lineWidth = 1.2;
        for (let k = 0; k < 7; k++) { x.beginPath(); let px = Math.random() * S, py = Math.random() * S; x.moveTo(px, py);
          for (let j = 0; j < 6; j++) { px += (Math.random() - 0.5) * 60; py += (Math.random() - 0.5) * 60; x.lineTo(px, py); } x.stroke(); }
        const t = canvasTex(c, false); t.wrapS = t.wrapT = THREE.RepeatWrapping; return t;
      })();
      const iceMat = PHYS({
        color: 0xffffff, transmission: 1, thickness: 0.07, ior: 1.31, roughness: 0.07, metalness: 0,
        attenuationColor: new THREE.Color(0xdcecf6), attenuationDistance: 0.35,
        normalMap: iceNormal, normalScale: new THREE.Vector2(0.35, 0.35),
        clearcoat: 1, clearcoatRoughness: 0.03, specularIntensity: 1, envMapIntensity: 0.9,
        depthWrite: false, // so the cloudy core and the bubbles inside still show
      });
      // the white heart of a frozen cube, where air got trapped
      const coreMat = new THREE.MeshStandardMaterial({ color: 0xf2f6f8, roughness: 0.9, transparent: true, opacity: 0.3, depthWrite: false });
      const bubbleMat = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.3, depthWrite: false });
      const bubbleGeo = new THREE.SphereGeometry(0.0016, 6, 4);
      tumbler.userData.ice = [[-0.04, 0.03, 0.4], [0.045, -0.02, 1.3], [0.0, 0.05, 2.2]].map(([x, z, r], k) => {
        const m = new THREE.Mesh(cube(k * 2.3 + 1), iceMat);
        m.renderOrder = 2;
        const core = new THREE.Mesh(cube(k * 5.1 + 3, 0.032), coreMat);
        core.renderOrder = 2;
        m.add(core);
        for (let j = 0; j < 9; j++) {
          const bb = new THREE.Mesh(bubbleGeo, bubbleMat);
          bb.position.set((Math.random() - 0.5) * 0.035, (Math.random() - 0.5) * 0.028, (Math.random() - 0.5) * 0.035); // clustered near the core, as trapped air is
          bb.scale.setScalar(0.5 + Math.random());
          bb.renderOrder = 2;
          m.add(bb);
        }
        m.position.set(x, 0.125 + k * 0.012, z);
        m.rotation.set(r * 0.3, r, r * 0.2);
        m.userData.rest = m.position.clone(); m.userData.rot = m.rotation.clone();
        tumbler.add(m);
        return m;
      });
    }
    tumbler.position.copy(glassPos);
    tumbler.scale.setScalar(1.4); // bigger: as wide as the wood between the brass bead and the edge allows
    scene.add(tumbler);
    let iceShake = 0;

    // ambient occlusion baked into the felt: darker where it meets the rail,
    // a soft pool under everything that rests on it
    {
      const W = 1024, H = Math.round((W * FB) / FA), c = mk(W, H), x = c.getContext("2d");
      x.save(); x.translate(W / 2, H / 2); x.scale(1, FB / FA);
      const g = x.createRadialGradient(0, 0, W * 0.3, 0, 0, W / 2);
      g.addColorStop(0, "rgba(0,0,0,0)"); g.addColorStop(0.72, "rgba(0,0,0,0.12)"); g.addColorStop(0.93, "rgba(0,0,0,0.55)"); g.addColorStop(1, "rgba(0,0,0,0.85)");
      x.fillStyle = g; x.beginPath(); x.arc(0, 0, W / 2, 0, Math.PI * 2); x.fill();
      x.restore();
      contacts.forEach(([wx, wz, r, a]) => {
        const px = (wx / (2 * FA) + 0.5) * W, py = (wz / (2 * FB) + 0.5) * H, pr = (r / (2 * FA)) * W;
        const gg = x.createRadialGradient(px, py, 0, px, py, pr);
        gg.addColorStop(0, `rgba(0,0,0,${a})`); gg.addColorStop(0.55, `rgba(0,0,0,${a * 0.45})`); gg.addColorStop(1, "rgba(0,0,0,0)");
        x.fillStyle = gg; x.fillRect(px - pr, py - pr, pr * 2, pr * 2);
      });
      const ao = new THREE.Mesh(normUV(new THREE.ShapeGeometry(ellipse(FA, FB), 120), FA, FB),
        new THREE.MeshBasicMaterial({ map: canvasTex(c, false), transparent: true, depthWrite: false, toneMapped: false, color: 0x000000 }));
      ao.rotation.x = -Math.PI / 2; ao.position.y = 0.001; ao.renderOrder = 1;
      scene.add(ao);
    }

    // reserved plaque, black acrylic, leaning back, readable from both sides
    const plaqueMat = PHYS({ map: canvasTex(plaqueFace(ctx.name)), roughness: 0.3, clearcoat: 1, clearcoatRoughness: 0.08, envMapIntensity: 0.3 });
    const black = PHYS({ color: 0x020202, roughness: 0.6, clearcoat: 0, envMapIntensity: 0.02 });
    const plaqueGeo = new THREE.BoxGeometry(0.62, 0.22, 0.05);
    // placed clear of the chips, the card and the betting boxes
    // a single plaque, standing on the far wooden ledge: readable from the front, covers nothing on the felt
    [[0, -(B + 0.54), 0]].forEach(([x, z, ry]) => {
      const m = new THREE.Mesh(plaqueGeo, [black, black, black, black, plaqueMat, plaqueMat]); // printed on both faces: never a blank back
      m.position.set(x, 0.105 + 0.115, z);
      m.rotation.set(Math.abs(ry) > 3 ? 0.22 : -0.22, ry, 0, "YXZ");
      m.castShadow = true;
      scene.add(m);
    });

    /* ---------- banknotes left on the felt ----------
       Dollar-like in size, paper and engraving, but a fictional house note
       ("WOBLO RESERVE · NOT LEGAL TENDER"), never a copy of a real currency.
       Scale: a chip is 0.4 across (≈ 39 mm), so a note is 1.56 × 0.66 (156 × 66 mm). */
    {
      const NW = 1.56, NH = 0.66;
      const SERIF = '"Times New Roman", Georgia, "Iowan Old Style", serif';
      const paper = (x, W, H, tint) => {
        x.fillStyle = tint; x.fillRect(0, 0, W, H);
        // fibres: short red and blue threads, like currency paper
        for (let k = 0; k < 900; k++) {
          const px = Math.random() * W, py = Math.random() * H, a = Math.random() * Math.PI, l = 6 + Math.random() * 14;
          x.strokeStyle = Math.random() < 0.5 ? "rgba(170,40,40,0.18)" : "rgba(40,60,160,0.16)"; x.lineWidth = 1;
          x.beginPath(); x.moveTo(px, py); x.quadraticCurveTo(px + Math.cos(a) * l * 0.5 + 3, py + Math.sin(a) * l * 0.5, px + Math.cos(a) * l, py + Math.sin(a) * l); x.stroke();
        }
        // grain
        const img = x.getImageData(0, 0, W, H), d = img.data;
        for (let i = 0; i < d.length; i += 4) { const n = (Math.random() - 0.5) * 14; d[i] += n; d[i + 1] += n; d[i + 2] += n; }
        x.putImageData(img, 0, 0);
      };
      const wear = (x, W, H) => {
        // handled: edges darker, a soft crease down the middle, a little grime
        const v = x.createRadialGradient(W / 2, H / 2, H * 0.3, W / 2, H / 2, W * 0.62);
        v.addColorStop(0, "rgba(60,55,35,0)"); v.addColorStop(1, "rgba(60,55,35,0.22)");
        x.fillStyle = v; x.fillRect(0, 0, W, H);
        const c = x.createLinearGradient(W / 2 - 24, 0, W / 2 + 24, 0);
        c.addColorStop(0, "rgba(0,0,0,0)"); c.addColorStop(0.48, "rgba(0,0,0,0.10)"); c.addColorStop(0.52, "rgba(255,255,255,0.12)"); c.addColorStop(1, "rgba(0,0,0,0)");
        x.fillStyle = c; x.fillRect(W / 2 - 24, 0, 48, H);
        for (let k = 0; k < 6; k++) { const px = Math.random() * W, py = Math.random() * H, r = 30 + Math.random() * 90; const g = x.createRadialGradient(px, py, 0, px, py, r); g.addColorStop(0, "rgba(70,60,40,0.07)"); g.addColorStop(1, "rgba(70,60,40,0)"); x.fillStyle = g; x.fillRect(px - r, py - r, r * 2, r * 2); }
      };
      // fine lathe work: the wavy bands that make money look like money
      const lathe = (x, x0, y0, w, h, ink, n = 9, amp = 0.35, waves = 26) => {
        x.save(); x.beginPath(); x.rect(x0, y0, w, h); x.clip();
        x.lineWidth = 1.1; x.strokeStyle = ink;
        for (let k = 0; k < n; k++) for (const s of [1, -1]) {
          x.beginPath();
          for (let t = 0; t <= 1.0001; t += 0.004) {
            const px = x0 + t * w, py = y0 + h / 2 + s * Math.sin(t * Math.PI * 2 * waves + k * 0.7) * h * amp + (k - n / 2) * (h / n) * 0.6;
            t === 0 ? x.moveTo(px, py) : x.lineTo(px, py);
          }
          x.stroke();
        }
        x.restore();
      };
      const rosette = (x, cx, cy, r, ink, petals = 36) => {
        x.save(); x.strokeStyle = ink; x.lineWidth = 1;
        for (let k = 0; k < petals; k++) {
          x.beginPath();
          for (let t = 0; t <= Math.PI * 2 + 0.01; t += 0.03) {
            const rr = r * (0.55 + 0.45 * Math.abs(Math.sin(t * 6 + (k / petals) * Math.PI)));
            const px = cx + Math.cos(t + k * 0.05) * rr, py = cy + Math.sin(t + k * 0.05) * rr;
            t === 0 ? x.moveTo(px, py) : x.lineTo(px, py);
          }
          x.stroke();
        }
        x.restore();
      };
      // engraved die, drawn with hatching instead of fills, like an intaglio vignette
      const engravedDie = (x, cx, cy, s, ink) => {
        x.save(); x.strokeStyle = ink; x.lineWidth = 1.2;
        const top = [[cx, cy - s * 0.9], [cx + s * 0.85, cy - s * 0.45], [cx, cy], [cx - s * 0.85, cy - s * 0.45]];
        const left = [[cx - s * 0.85, cy - s * 0.45], [cx, cy], [cx, cy + s], [cx - s * 0.85, cy + s * 0.55]];
        const right = [[cx, cy], [cx + s * 0.85, cy - s * 0.45], [cx + s * 0.85, cy + s * 0.55], [cx, cy + s]];
        const poly = (pts) => { x.beginPath(); pts.forEach(([a, b], i) => (i ? x.lineTo(a, b) : x.moveTo(a, b))); x.closePath(); };
        const hatch = (pts, gap, ang) => { x.save(); poly(pts); x.clip(); for (let k = -s * 3; k < s * 3; k += gap) { x.beginPath(); x.moveTo(cx - s * 2, cy + k); x.lineTo(cx + s * 2, cy + k + Math.tan(ang) * s * 4); x.stroke(); } x.restore(); };
        hatch(left, 5, 0.5); hatch(right, 9, -0.3); hatch(top, 16, 0.1);
        x.lineWidth = 2.4; [top, left, right].forEach((p) => { poly(p); x.stroke(); });
        x.fillStyle = ink;
        [[0, -0.45]].forEach(([u, v]) => { x.beginPath(); x.ellipse(cx + u * s, cy + v * s, s * 0.13, s * 0.07, 0, 0, Math.PI * 2); x.fill(); });
        [[-0.6, 0.0], [-0.25, 0.55]].forEach(([u, v]) => { x.beginPath(); x.ellipse(cx + u * s, cy + v * s, s * 0.08, s * 0.11, 0.5, 0, Math.PI * 2); x.fill(); });
        [[0.25, 0.0], [0.6, 0.55], [0.42, 0.28]].forEach(([u, v]) => { x.beginPath(); x.ellipse(cx + u * s, cy + v * s, s * 0.08, s * 0.11, -0.5, 0, Math.PI * 2); x.fill(); });
        x.restore();
      };
      const W = 2048, H = Math.round(W * NH / NW);
      const front = (() => {
        const c = mk(W, H), x = c.getContext("2d");
        paper(x, W, H, "#d5d8c4"); // the grey-green of worn currency paper
        const ink = "rgba(28,36,30,0.9)", inkL = "rgba(28,36,30,0.35)", green = "rgba(40,92,62,0.92)";
        // a pale green wash, as on newer notes
        const wash = x.createRadialGradient(W * 0.62, H * 0.5, 40, W * 0.62, H * 0.5, W * 0.5);
        wash.addColorStop(0, "rgba(150,190,150,0.18)"); wash.addColorStop(1, "rgba(150,190,150,0)");
        x.fillStyle = wash; x.fillRect(0, 0, W, H);
        // frame: outer rule, lathe band, inner rule
        x.strokeStyle = ink; x.lineWidth = 5; x.strokeRect(34, 34, W - 68, H - 68);
        lathe(x, 44, 44, W - 88, 46, inkL); lathe(x, 44, H - 90, W - 88, 46, inkL);
        lathe(x, 44, 90, 46, H - 180, inkL, 6, 0.3, 8);
        x.save(); x.translate(W - 90, 90); lathe(x, 0, 0, 46, H - 180, inkL, 6, 0.3, 8); x.restore();
        x.lineWidth = 2; x.strokeRect(96, 96, W - 192, H - 192);
        // microtext along the inner frame
        x.fillStyle = "rgba(28,36,30,0.55)"; x.font = `500 13px ${MONO}`; x.textBaseline = "middle";
        x.fillText("WOBLO RESERVE · NOT LEGAL TENDER · ".repeat(14), 110, 108);
        // the portrait oval, left of centre: an engraved die where a face would be
        const ox = W * 0.42, oy = H * 0.52;
        x.save(); x.beginPath(); x.ellipse(ox, oy, 230, 270, 0, 0, Math.PI * 2); x.clip();
        x.fillStyle = "rgba(214,218,198,1)"; x.fillRect(ox - 240, oy - 280, 480, 560);
        for (let k = 0; k < 80; k++) { x.strokeStyle = "rgba(28,36,30,0.12)"; x.beginPath(); x.ellipse(ox, oy, 230 - k * 2.6, 270 - k * 3, 0, 0, Math.PI * 2); x.stroke(); }
        engravedDie(x, ox, oy + 10, 120, ink);
        x.restore();
        x.strokeStyle = ink; x.lineWidth = 6; x.beginPath(); x.ellipse(ox, oy, 236, 276, 0, 0, Math.PI * 2); x.stroke();
        x.lineWidth = 2; x.beginPath(); x.ellipse(ox, oy, 250, 290, 0, 0, Math.PI * 2); x.stroke();
        // the blue security ribbon, woven into the paper
        {
          const rx = W * 0.285, rw = 30;
          const rg = x.createLinearGradient(rx - rw / 2, 0, rx + rw / 2, 0);
          rg.addColorStop(0, "rgba(40,90,170,0.55)"); rg.addColorStop(0.5, "rgba(90,150,230,0.85)"); rg.addColorStop(1, "rgba(40,90,170,0.55)");
          x.fillStyle = rg; x.fillRect(rx - rw / 2, 0, rw, H);
          x.fillStyle = "rgba(230,240,255,0.75)"; x.font = `700 16px ${SERIF}`; x.textAlign = "center";
          for (let y = 30; y < H; y += 60) x.fillText(y % 120 ? "◆" : "100", rx, y);
        }
        // the copper inkwell: a die in metallic ink, below the portrait
        {
          const cx = W * 0.72, cy = H * 0.6, s = 62; // where the green house seal was
          const cg = x.createLinearGradient(cx - s, cy - s, cx + s, cy + s);
          cg.addColorStop(0, "rgba(176,110,58,0.95)"); cg.addColorStop(0.5, "rgba(214,150,90,0.95)"); cg.addColorStop(1, "rgba(120,70,40,0.95)");
          x.fillStyle = cg; x.beginPath(); x.ellipse(cx, cy, s * 1.25, s, 0, 0, Math.PI * 2); x.fill();
          engravedDie(x, cx, cy - 4, s * 0.55, "rgba(70,38,18,0.9)");
        }
        // the seal, far left, and the house seal on the right
        rosette(x, W * 0.17, H * 0.5, 120, "rgba(28,36,30,0.55)");
        x.fillStyle = "rgba(214,218,198,0.95)"; x.beginPath(); x.arc(W * 0.17, H * 0.5, 62, 0, Math.PI * 2); x.fill();
        x.fillStyle = ink; x.font = `700 74px ${SERIF}`; x.textAlign = "center"; x.fillText("W", W * 0.17, H * 0.5 + 4);
        // lettering
        x.fillStyle = ink; x.textAlign = "center";
        x.font = `600 30px ${SERIF}`; if ("letterSpacing" in x) x.letterSpacing = "10px";
        x.fillText("WOBLO RESERVE NOTE", W * 0.5, 150);
        x.font = `700 84px ${SERIF}`; if ("letterSpacing" in x) x.letterSpacing = "6px";
        x.fillText("THE HOUSE OF WOBLO", W * 0.56, 236);
        x.font = `600 46px ${SERIF}`; if ("letterSpacing" in x) x.letterSpacing = "14px";
        x.fillText(T("CIEN FICHAS", "ONE HUNDRED CHIPS"), W * 0.58, H - 150);
        if ("letterSpacing" in x) x.letterSpacing = "0px";
        // corner denominations: three in ink, the big one in green
        x.font = `700 120px ${SERIF}`;
        x.fillText("100", 220, 210); x.fillText("100", W - 230, 210); x.fillText("100", 220, H - 170);
        x.fillStyle = green; x.font = `700 230px ${SERIF}`;
        x.fillText("100", W - 300, H - 150);
        // serials and signatures
        x.fillStyle = green; x.font = `600 44px ${MONO}`; if ("letterSpacing" in x) x.letterSpacing = "4px";
        x.fillText("WB 0618 2026 A", W * 0.24, H * 0.24); x.fillText("WB 0618 2026 A", W * 0.86, H * 0.38);
        if ("letterSpacing" in x) x.letterSpacing = "0px";
        x.fillStyle = ink; x.font = `italic 400 40px ${SERIF}`;
        x.fillText("C. Infanzón", W * 0.62, H * 0.79); x.fillText("The Croupier", W * 0.26, H * 0.79);
        x.fillRect(W * 0.53, H * 0.81, 220, 2); x.fillRect(W * 0.17, H * 0.81, 220, 2);
        wear(x, W, H);
        return c;
      })();
      const back = (() => {
        const c = mk(W, H), x = c.getContext("2d");
        paper(x, W, H, "#cdd4bf");
        const g = "rgba(38,92,60,0.9)", gL = "rgba(38,92,60,0.35)";
        x.strokeStyle = g; x.lineWidth = 5; x.strokeRect(34, 34, W - 68, H - 68);
        lathe(x, 44, 44, W - 88, 60, gL, 12); lathe(x, 44, H - 104, W - 88, 60, gL, 12);
        x.lineWidth = 2; x.strokeRect(110, 110, W - 220, H - 220);
        // a building on a real note; here, the lamp: TON 618, in line engraving
        const cx = W / 2, cy = H / 2 + 20;
        x.save(); x.beginPath(); x.rect(cx - 420, cy - 230, 840, 460); x.clip();
        for (let k = 0; k < 60; k++) { x.strokeStyle = "rgba(38,92,60,0.12)"; x.beginPath(); x.moveTo(cx - 420, cy - 230 + k * 8); x.lineTo(cx + 420, cy - 230 + k * 8); x.stroke(); }
        x.fillStyle = "rgba(205,212,191,1)"; x.beginPath(); x.arc(cx, cy, 150, 0, Math.PI * 2); x.fill();
        x.strokeStyle = g; x.lineWidth = 1.2;
        for (let k = 0; k < 40; k++) { x.beginPath(); x.arc(cx, cy, 150 - k * 3.6, Math.PI * (0.1 + k * 0.004), Math.PI * (0.9 - k * 0.004)); x.stroke(); }
        x.lineWidth = 5; x.beginPath(); x.ellipse(cx, cy, 300, 46, 0, 0, Math.PI * 2); x.stroke();
        x.lineWidth = 2; x.beginPath(); x.ellipse(cx, cy, 330, 58, 0, 0, Math.PI * 2); x.stroke();
        x.restore();
        x.strokeStyle = g; x.lineWidth = 3; x.strokeRect(cx - 420, cy - 230, 840, 460);
        x.fillStyle = g; x.textAlign = "center"; x.textBaseline = "middle";
        x.font = `700 84px ${SERIF}`; if ("letterSpacing" in x) x.letterSpacing = "8px";
        x.fillText("THE HOUSE OF WOBLO", W / 2, 200);
        x.font = `600 40px ${SERIF}`; if ("letterSpacing" in x) x.letterSpacing = "12px";
        x.fillText(T("EN EL DISEÑO CONFIAMOS", "IN DESIGN WE TRUST"), W / 2, H - 190);
        x.font = `600 30px ${SERIF}`;
        x.fillText(T("CIEN FICHAS", "ONE HUNDRED CHIPS"), W / 2, H - 140);
        if ("letterSpacing" in x) x.letterSpacing = "0px";
        x.font = `700 300px ${SERIF}`; x.fillText("100", 330, H / 2 + 20); x.fillText("100", W - 330, H / 2 + 20);
        x.font = `700 110px ${SERIF}`; x.fillText("100", 210, 200); x.fillText("100", W - 210, H - 190);
        wear(x, W, H);
        // seen from below, the back is mirrored: pre-flip it so it reads the right way round
        const m = mk(W, H), mx = m.getContext("2d");
        mx.translate(W, 0); mx.scale(-1, 1); mx.drawImage(c, 0, 0);
        return m;
      })();
      const tf = canvasTex(front), tb = canvasTex(back);
      const noFight = { polygonOffset: true, polygonOffsetFactor: -6, polygonOffsetUnits: -6 }; // the print is pulled forward too
      const matF = new THREE.MeshStandardMaterial({ ...noFight, map: tf, bumpMap: tf, bumpScale: 0.08, color: 0xc8c8c0, roughness: 0.86, envMapIntensity: 0.12, side: THREE.FrontSide });
      const matB = new THREE.MeshStandardMaterial({ ...noFight, map: tb, bumpMap: tb, bumpScale: 0.08, color: 0xc8c8c0, roughness: 0.86, envMapIntensity: 0.12, side: THREE.BackSide });
      // the paper: a soft curl along its length, and optionally folded in half
      const noteGeo = (fold, pressed) => {
        const g = new THREE.PlaneGeometry(NW, NH, 64, 10), p = g.attributes.position;
        for (let i = 0; i < p.count; i++) {
          const x0 = p.getX(i), y0 = p.getY(i), u = x0 / (NW / 2), v = y0 / (NH / 2);
          let x = x0, z = pressed ? Math.sin(u * 3.1 + v) * 0.0008 : u * u * 0.012 + v * v * 0.006 + Math.sin(u * 3.1 + v) * 0.003;
          if (fold && x0 > 0) {
            // the right half folded back over the left, not quite pressed flat
            const phi = pressed ? Math.PI - 0.004 : Math.PI - 0.035 - (1 - Math.abs(v)) * 0.012; // pressed nearly flat, as in a wallet
            x = Math.cos(phi) * x0; z = Math.sin(phi) * x0 + 0.004 + z * 0.4;
          }
          p.setXYZ(i, x, y0, z);
        }
        g.computeVertexNormals();
        return g;
      };
      const flat = noteGeo(false), folded = noteGeo(true), pressed = noteGeo(true, true);
      // the bank strap around each bundle: kraft paper, a gold rule, the amount
      const strapTex = (() => {
        const c = mk(512, 64), x = c.getContext("2d");
        x.fillStyle = "#b9925a"; x.fillRect(0, 0, 512, 64);
        x.fillStyle = "rgba(0,0,0,0.12)"; for (let k = 0; k < 260; k++) x.fillRect(Math.random() * 512, Math.random() * 64, 2, 1);
        x.fillStyle = "#6b4a22"; x.fillRect(0, 6, 512, 3); x.fillRect(0, 55, 512, 3);
        x.fillStyle = "#3b2812"; x.font = `700 26px ${SERIF}`; x.textAlign = "center"; x.textBaseline = "middle";
        x.fillText("WOBLO RESERVE  ·  $10,000  ·  WOBLO RESERVE", 256, 33);
        return canvasTex(c);
      })();
      const strapMat = new THREE.MeshStandardMaterial({ map: strapTex, roughness: 0.8, envMapIntensity: 0.1 });
      // [x, z, yaw] of each end, found by a check against every chip, card, plaque, betting box,
      // the lettering and the die's landing zone: the bundles sit where nothing else is
      const ENDS = [[2.58, 0.0, 1.4], [-2.6, 0.0, 1.75]];
      const notes = []; // [x, z, yaw, height, geometry]
      const STEP = 0.0062; // one pressed note
      ENDS.forEach(([ex, ez, ey], side) => {
        // the bundle: ten notes, squared up by a cashier's hands, not a machine
        const N = 10;
        for (let k = 0; k < N; k++) notes.push([ex + (Math.random() - 0.5) * 0.012, ez + (Math.random() - 0.5) * 0.012, ey + (Math.random() - 0.5) * 0.03, 0.004 + k * STEP, pressed]);
        const top = 0.004 + N * STEP;
        // its strap, across the short side of the folded notes
        const strap = new THREE.Mesh(new THREE.BoxGeometry(0.1, top + 0.004, NH + 0.012), strapMat);
        strap.position.set(ex, (top + 0.004) / 2, ez);
        strap.rotation.y = -ey;
        strap.castShadow = strap.receiveShadow = true;
        scene.add(strap);
        // and loose on top: two more, pulled out and dropped back askew
        notes.push([ex + 0.02, ez + 0.015, ey + (side ? 0.18 : 0.18), top + 0.006, pressed]);
        notes.push([ex - 0.015, ez - 0.01, ey + (side ? -0.12 : -0.17), top + 0.006 + STEP, folded]);
      });
      notes.forEach(([nx, nz, yaw, y, geo]) => {
        const isFolded = geo !== flat;
        [matF, matB].forEach((mt) => {
          const m = new THREE.Mesh(geo, mt);
          m.rotation.set(-Math.PI / 2, 0, -yaw); // same yaw convention as the placement check
          // a folded note lies on its left half: shift it so that half is centred where it was placed
          const off = isFolded ? NW / 4 : 0;
          m.position.set(nx + Math.cos(yaw) * off, y, nz + Math.sin(yaw) * off);
          m.castShadow = m.receiveShadow = true;
          scene.add(m);
        });
      });
    }

    /* ---------- the die: black lacquer, gold pips sunk into each face ---------- */
    const DS = 0.3; // edge length
    const dieGeo = (() => {
      const g = new THREE.BoxGeometry(1, 1, 1, 10, 10, 10), p = g.attributes.position;
      const r = 0.14, inner = 0.5 - r, v = new THREE.Vector3(), c = new THREE.Vector3();
      for (let i = 0; i < p.count; i++) {
        v.fromBufferAttribute(p, i);
        c.set(Math.max(-inner, Math.min(inner, v.x)), Math.max(-inner, Math.min(inner, v.y)), Math.max(-inner, Math.min(inner, v.z)));
        v.sub(c).normalize().multiplyScalar(r).add(c);
        p.setXYZ(i, v.x * DS, v.y * DS, v.z * DS);
      }
      g.computeVertexNormals();
      return g;
    })();
    const PIPS = { 1: [[0, 0]], 2: [[-1, -1], [1, 1]], 3: [[-1, -1], [0, 0], [1, 1]], 4: [[-1, -1], [1, -1], [-1, 1], [1, 1]],
      5: [[-1, -1], [1, -1], [0, 0], [-1, 1], [1, 1]], 6: [[-1, -1], [1, -1], [-1, 0], [1, 0], [-1, 1], [1, 1]] };
    const face = (n) => {
      const S = 512, c = mk(S, S), x = c.getContext("2d");
      x.fillStyle = "#0a0a0b"; x.fillRect(0, 0, S, S);
      PIPS[n].forEach(([u, w]) => {
        const cx = S / 2 + u * 128, cy = S / 2 + w * 128, rr = n === 1 ? 62 : 44;
        // a sunken cup: dark rim, gold floor, a lip of light on the lower edge
        const g = x.createRadialGradient(cx - rr * 0.25, cy - rr * 0.3, rr * 0.1, cx, cy, rr);
        g.addColorStop(0, "#f3d79a"); g.addColorStop(0.7, "#b8913f"); g.addColorStop(1, "#3b2a10");
        x.fillStyle = g;
        x.beginPath(); x.arc(cx, cy, rr, 0, Math.PI * 2); x.fill();
      });
      return canvasTex(c);
    };
    // BoxGeometry faces: +x, −x, +y, −y, +z, −z — opposite faces add up to seven
    const FACE_VAL = [3, 4, 1, 6, 2, 5];
    const FACE_N = [[1, 0, 0], [-1, 0, 0], [0, 1, 0], [0, -1, 0], [0, 0, 1], [0, 0, -1]].map((a) => new THREE.Vector3(...a));
    const die = new THREE.Mesh(dieGeo, FACE_VAL.map((n) => PHYS({
      map: face(n), roughness: 0.22, metalness: 0, clearcoat: 1, clearcoatRoughness: 0.06, envMapIntensity: 0.6,
    })));
    die.castShadow = true;
    const UP = new THREE.Vector3(0, 1, 0);
    const restQ = (val, yaw) => {
      const q = new THREE.Quaternion().setFromUnitVectors(FACE_N[FACE_VAL.indexOf(val)], UP);
      return new THREE.Quaternion().setFromAxisAngle(UP, yaw).multiply(q);
    };
    die.position.set(0.95, DS / 2, -0.32);
    die.quaternion.copy(restQ(5, 0.5));
    scene.add(die);
    // a contact shadow that follows it and fades as it leaves the felt
    const blobTex = (() => {
      const c = mk(256, 256), x = c.getContext("2d"), g = x.createRadialGradient(128, 128, 0, 128, 128, 128);
      g.addColorStop(0, "rgba(0,0,0,0.9)"); g.addColorStop(0.35, "rgba(0,0,0,0.55)"); g.addColorStop(1, "rgba(0,0,0,0)");
      x.fillStyle = g; x.fillRect(0, 0, 256, 256);
      return canvasTex(c, false);
    })();
    const dieAO = new THREE.Mesh(new THREE.PlaneGeometry(DS * 2.1, DS * 2.1),
      new THREE.MeshBasicMaterial({ map: blobTex, color: 0x000000, transparent: true, depthWrite: false, toneMapped: false }));
    dieAO.rotation.x = -Math.PI / 2; dieAO.renderOrder = 1;
    scene.add(dieAO);

    // dust hanging in the lamp's beam
    const DUST = lite ? 60 : small ? 160 : 320;
    const dustPos = new Float32Array(DUST * 3), dustSeed = new Float32Array(DUST);
    for (let k = 0; k < DUST; k++) {
      // only inside the cone of the lamp, where light would catch it
      const y = 0.25 + Math.random() * (LAMP_Y - 0.6), r = Math.sqrt(Math.random()) * (0.9 + (LAMP_Y - y) * 0.75), a = Math.random() * Math.PI * 2;
      dustPos.set([Math.cos(a) * r, y, Math.sin(a) * r * 0.7], k * 3);
      dustSeed[k] = Math.random() * 100;
    }
    const dustGeo = new THREE.BufferGeometry();
    dustGeo.setAttribute("position", new THREE.BufferAttribute(dustPos, 3));
    const dustTex = (() => {
      const c = mk(64, 64), x = c.getContext("2d"), g = x.createRadialGradient(32, 32, 0, 32, 32, 32);
      g.addColorStop(0, "rgba(255,240,215,1)"); g.addColorStop(0.4, "rgba(255,240,215,0.35)"); g.addColorStop(1, "rgba(255,240,215,0)");
      x.fillStyle = g; x.fillRect(0, 0, 64, 64);
      return canvasTex(c);
    })();
    const dust = new THREE.Points(dustGeo, new THREE.PointsMaterial({
      map: dustTex, size: 0.016, sizeAttenuation: true, transparent: true, opacity: 0.4,
      depthWrite: false, blending: THREE.AdditiveBlending, toneMapped: false, fog: true,
    }));
    scene.add(dust);
    // smoke: rises from the ember, curls, leans towards the warm air under the lamp
    const SMOKE = lite ? 50 : small ? 110 : 220;
    const smokeAge = new Float32Array(SMOKE), smokeSeed = new Float32Array(SMOKE), smokePos = new Float32Array(SMOKE * 3);
    for (let k = 0; k < SMOKE; k++) { smokeAge[k] = k / SMOKE; smokeSeed[k] = Math.random() * 100; }
    const smokeGeo = new THREE.BufferGeometry();
    smokeGeo.setAttribute("position", new THREE.BufferAttribute(smokePos, 3));
    smokeGeo.setAttribute("aAge", new THREE.BufferAttribute(smokeAge, 1));
    const smoke = new THREE.Points(smokeGeo, new THREE.ShaderMaterial({
      uniforms: { uScale: { value: 1 } },
      vertexShader: `attribute float aAge; varying float vA; uniform float uScale;
        void main(){ vec4 mv = modelViewMatrix * vec4(position,1.0); gl_Position = projectionMatrix * mv;
          gl_PointSize = uScale * (0.07 + aAge * 0.6) * 300.0 / -mv.z;
          vA = smoothstep(0.0, 0.06, aAge) * pow(1.0 - aAge, 1.5) * 0.075; }`,
      fragmentShader: `varying float vA;
        void main(){ vec2 p = gl_PointCoord - 0.5; float d = length(p); float a = pow(smoothstep(0.5, 0.0, d), 1.6);
          gl_FragColor = vec4(vec3(0.85, 0.83, 0.8), a * vA); }`,
      transparent: true, depthWrite: false, blending: THREE.NormalBlending,
    }));
    smoke.frustumCulled = false;
    scene.add(smoke);
    const stepSmoke = (t, dt) => {
      const toC = new THREE.Vector2(-emberWorld.x, -emberWorld.z).normalize();
      for (let k = 0; k < SMOKE; k++) {
        let a = smokeAge[k] + dt / 7;
        if (a >= 1) { a -= 1; smokeSeed[k] = Math.random() * 100; }
        smokeAge[k] = a;
        const s = smokeSeed[k], y = a * 2.1;
        const curl = Math.sin(t * 0.9 + s + y * 5) * 0.09 * (0.25 + a) + Math.sin(y * 9 + s) * 0.012;
        const drift = Math.pow(a, 1.6) * 1.4; // drawn towards the light as it climbs
        smokePos[k * 3] = emberWorld.x + toC.x * drift + curl;
        smokePos[k * 3 + 1] = emberWorld.y + y;
        smokePos[k * 3 + 2] = emberWorld.z + toC.y * drift + Math.cos(t * 0.7 + s + y * 4) * 0.04 * (0.3 + a);
      }
      smokeGeo.attributes.position.needsUpdate = true;
      smokeGeo.attributes.aAge.needsUpdate = true;
    };

    // marks in the felt where the die has landed, kept between visits
    const MARK_KEY = "woblo:vt-marks:" + ctx.name.toLowerCase();
    const markC = mk(1024, Math.round((1024 * FB) / FA)), markX = markC.getContext("2d");
    const markTex = canvasTex(markC, false);
    const markMesh = new THREE.Mesh(normUV(new THREE.ShapeGeometry(ellipse(FA, FB), 120), FA, FB),
      new THREE.MeshBasicMaterial({ map: markTex, color: 0x000000, transparent: true, depthWrite: false, toneMapped: false }));
    markMesh.rotation.x = -Math.PI / 2; markMesh.position.y = 0.0012; markMesh.renderOrder = 1;
    scene.add(markMesh);
    let marks = [];
    try { marks = JSON.parse(localStorage.getItem(MARK_KEY) || "[]").slice(-24); } catch (e) { marks = []; }
    const drawMark = ([wx, wz, yaw, dx, dz]) => {
      const W = markC.width, H = markC.height;
      const px = (wx / (2 * FA) + 0.5) * W, py = (wz / (2 * FB) + 0.5) * H, s = (DS / (2 * FA)) * W;
      markX.save(); markX.translate(px, py); markX.rotate(-yaw);
      // the fibres pressed flat under the die: a soft square
      const g = markX.createRadialGradient(0, 0, s * 0.1, 0, 0, s * 0.75);
      g.addColorStop(0, "rgba(0,0,0,0.13)"); g.addColorStop(0.7, "rgba(0,0,0,0.07)"); g.addColorStop(1, "rgba(0,0,0,0)");
      markX.fillStyle = g; markX.fillRect(-s * 0.8, -s * 0.8, s * 1.6, s * 1.6);
      markX.restore();
      // a faint scuff where it slid in
      const len = Math.hypot(dx, dz) || 1;
      markX.strokeStyle = "rgba(0,0,0,0.05)"; markX.lineWidth = s * 0.35; markX.lineCap = "round";
      markX.beginPath(); markX.moveTo(px, py);
      markX.lineTo(px - (dx / len) * s * 1.6, py - (dz / len) * s * 1.6 * (W / H) * (FB / FA)); markX.stroke();
    };
    marks.forEach(drawMark);
    markTex.needsUpdate = true;
    function addMark(x, z, yaw, dx, dz) {
      const m = [+x.toFixed(3), +z.toFixed(3), +yaw.toFixed(3), +dx.toFixed(3), +dz.toFixed(3)];
      marks.push(m); marks = marks.slice(-24);
      drawMark(m); markTex.needsUpdate = true;
      try { localStorage.setItem(MARK_KEY, JSON.stringify(marks)); } catch (e) { /* private mode */ }
    }

    const stepDust = (t, dt) => {
      for (let k = 0; k < DUST; k++) {
        const i = k * 3, s = dustSeed[k];
        dustPos[i] += Math.sin(t * 0.21 + s) * dt * 0.02;
        dustPos[i + 2] += Math.cos(t * 0.17 + s * 1.3) * dt * 0.02;
        dustPos[i + 1] += (Math.sin(t * 0.3 + s) * 0.5 + 0.15) * dt * 0.03;
        if (dustPos[i + 1] > LAMP_Y - 0.35) dustPos[i + 1] = 0.25;
      }
      dustGeo.attributes.position.needsUpdate = true;
    };
    const roll = { on: false, t: 0, dur: 1.7, p0: new THREE.Vector3(), p1: new THREE.Vector3(), q1: new THREE.Quaternion(), axis: new THREE.Vector3(), spins: 0, val: 0 };
    let chosen = -1;
    const rolls = []; // for the receipt
    const S = window.CASINO && window.CASINO.sound;
    // ice against glass: two bright partials, quickly gone
    function tinkle(v) {
      if (!S || !S.on) return;
      const a = S.audio(); if (!a) return;
      const n = 1 + Math.floor(v * 3);
      for (let i = 0; i < n; i++) {
        const t0 = a.currentTime + i * (0.05 + Math.random() * 0.06);
        [2900 + Math.random() * 900, 5200 + Math.random() * 1200].forEach((fq, j) => {
          const o = a.createOscillator(), g = a.createGain();
          o.type = "sine"; o.frequency.value = fq;
          g.gain.setValueAtTime(0.0001, t0);
          g.gain.exponentialRampToValueAtTime((j ? 0.025 : 0.05) * Math.min(1, v + 0.3), t0 + 0.003);
          g.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.35 - j * 0.15);
          o.connect(g).connect(a.destination); o.start(t0); o.stop(t0 + 0.4);
        });
      }
    }
    const WORDS = T(["Uno", "Dos", "Tres", "Cuatro", "Cinco", "Seis"], ["One", "Two", "Three", "Four", "Five", "Six"]);
    function throwDie() {
      if (roll.on) return;
      visit.did.r = (visit.did.r || 0) + 1;
      (window.WOBLO_TRACK && window.WOBLO_TRACK("viproll", `#${visit.did.r}`));
      chosen = -1;
      roll.on = true; roll.t = 0;
      roll.p0.copy(die.position);
      // land somewhere free: between the monogram and the bets
      let x, z;
      // land clear of the envelope behind it (which ends at z = -0.51)
      do { x = (Math.random() * 2 - 1) * 1.5; z = -0.3 + Math.random() * 0.35; } while (Math.abs(x - die.position.x) < 0.6);
      roll.p1.set(x, DS / 2, z);
      roll.val = 1 + Math.floor(Math.random() * 6);
      roll.q1.copy(restQ(roll.val, Math.random() * Math.PI * 2));
      roll.axis.set(z - roll.p0.z, 0, -(x - roll.p0.x)).normalize(); // it tumbles in the direction it travels
      if (roll.axis.lengthSq() < 0.01) roll.axis.set(1, 0, 0);
      roll.spins = 2 + Math.floor(Math.random() * 2);
      roll.bounce = 0;
      setTip("Rien ne va plus.");
    }
    const tmpQ = new THREE.Quaternion();
    function stepDie(dt) {
      if (!roll.on) return;
      roll.t = Math.min(1, roll.t + dt / roll.dur);
      const t = roll.t, e = 1 - Math.pow(1 - t, 3);
      die.position.lerpVectors(roll.p0, roll.p1, e);
      // three bounces, each lower than the last
      die.position.y = DS / 2 + Math.abs(Math.sin(t * Math.PI * 3.5)) * 0.55 * Math.pow(1 - t, 2.2);
      const bounce = Math.floor(t * 3.5);
      if (bounce > roll.bounce) {
        roll.bounce = bounce;
        const v = Math.pow(1 - t, 2.2) * 1.4;
        if (S) S.thud(Math.min(1, v + 0.15));
        const near = die.position.distanceTo(tumbler.position);
        iceShake = Math.max(iceShake, v * Math.max(0, 1 - near / 4.2));
        if (iceShake > 0.08) tinkle(iceShake);
      }
      tmpQ.setFromAxisAngle(roll.axis, (1 - e) * roll.spins * Math.PI * 2);
      die.quaternion.copy(tmpQ).multiply(roll.q1);
      if (t >= 1) {
        roll.on = false;
        chosen = (roll.val - 1) % boxes.length;
        const e2 = new THREE.Euler().setFromQuaternion(die.quaternion, "YXZ");
        addMark(die.position.x, die.position.z, e2.y, roll.p1.x - roll.p0.x, roll.p1.z - roll.p0.z);
        rolls.push({ val: roll.val, title: boxes[chosen].title, at: new Date() });
        const b = boxes[chosen];
        setTip(`${WORDS[roll.val - 1]}. ${b.title} — ${T("apostar", "place your bet")} →`);
      }
    }

    /* ---------- the room you cannot see: murmur, a far roulette, chips ---------- */
    const amb = { on: false, nodes: null, next: 0, roul: 0 };
    function ambStart() {
      const a = S && S.audio(); if (!a) return;
      const len = a.sampleRate * 3, buf = a.createBuffer(1, len, a.sampleRate), d = buf.getChannelData(0);
      let b0 = 0, b1 = 0; // brown-ish noise: the low hum of a full room
      for (let i = 0; i < len; i++) { const w = Math.random() * 2 - 1; b0 = 0.995 * b0 + w * 0.05; b1 = 0.9 * b1 + w * 0.1; d[i] = b0 * 0.7 + b1 * 0.3; }
      const src = a.createBufferSource(); src.buffer = buf; src.loop = true;
      const lp = a.createBiquadFilter(); lp.type = "lowpass"; lp.frequency.value = 650;
      const bp = a.createBiquadFilter(); bp.type = "peaking"; bp.frequency.value = 320; bp.gain.value = 6; bp.Q.value = 0.8;
      const g = a.createGain(); g.gain.setValueAtTime(0.0001, a.currentTime); g.gain.exponentialRampToValueAtTime(0.05, a.currentTime + 2.5);
      // voices rise and fall
      const lfo = a.createOscillator(), lg = a.createGain(); lfo.frequency.value = 0.13; lg.gain.value = 0.018;
      lfo.connect(lg).connect(g.gain);
      src.connect(lp).connect(bp).connect(g).connect(a.destination);
      src.start(); lfo.start();
      amb.nodes = { src, lfo, g, a };
      amb.on = true; amb.next = 0; amb.roul = 0;
    }
    function ambStop() {
      if (!amb.nodes) { amb.on = false; return; }
      const { src, lfo, g, a } = amb.nodes;
      try { g.gain.cancelScheduledValues(a.currentTime); g.gain.setTargetAtTime(0.0001, a.currentTime, 0.25); src.stop(a.currentTime + 1.2); lfo.stop(a.currentTime + 1.2); } catch (e) { /* already stopped */ }
      amb.nodes = null; amb.on = false;
    }
    // a roulette across the room: the ball ticking, slowing, settling
    function farRoulette() {
      const a = S.audio(); if (!a) return;
      let t = a.currentTime, gap = 0.07;
      for (let i = 0; i < 26; i++) {
        S.burst(a, t, { freq: 2400, type: "bandpass", q: 3, gain: 0.018, dur: 0.02 });
        t += gap; gap *= 1.09;
      }
      S.burst(a, t + 0.05, { freq: 1500, type: "bandpass", q: 2, gain: 0.03, dur: 0.06 });
    }
    function stepAmbience(t) {
      const want = !!(S && S.on);
      if (want && !amb.on) ambStart();
      if (!want && amb.on) ambStop();
      if (!amb.on) return;
      if (!amb.next) amb.next = t + 4 + Math.random() * 5;
      if (t > amb.next) { S.chip(0.25 + Math.random() * 0.2); if (Math.random() < 0.5) setTimeout(() => S.chip(0.18), 90 + Math.random() * 80); amb.next = t + 6 + Math.random() * 9; }
      if (!amb.roul) amb.roul = t + 14 + Math.random() * 10;
      if (t > amb.roul) { farRoulette(); amb.roul = t + 28 + Math.random() * 20; }
    }

    /* ---------- camera: the height of a die, walking around ---------- */
    const portrait = innerHeight > innerWidth * 1.15;
    // on a phone held upright the camera rises and steps back: more felt, less edge
    const H_MAX = portrait ? 3.6 : 1.6;
    const view = { th: Math.PI * 0.5, vth: 0, h: portrait ? 3.1 : 1.25, x0: 0, y0: 0, drag: false, moved: 0 };
    let rx = 0, ry = 0, raf = 0, hoverBox = -1;
    const resize = () => {
      const r = vt.getBoundingClientRect();
      renderer.setSize(r.width, r.height, false);
      if (composer) { composer.setPixelRatio(renderer.getPixelRatio()); composer.setSize(r.width, r.height); }
      camera.aspect = r.width / r.height;
      camera.updateProjectionMatrix();
    };
    resize();
    addEventListener("resize", resize);

    const ray = new THREE.Raycaster(), ndc = new THREE.Vector2();
    const pick = (e) => {
      const r = canvas.getBoundingClientRect();
      ndc.set(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
      ray.setFromCamera(ndc, camera);
      if (ray.intersectObject(die, false).length) return { die: true };
      if (ray.intersectObject(card, true).length) return { card: true };
      const hit = ray.intersectObject(felt, false)[0];
      if (!hit) return {};
      const px = (hit.point.x / (2 * A) + 0.5) * pw, py = (hit.point.z / (2 * B) + 0.5) * ph;
      return { box: boxes.findIndex((b) => px > b.x && px < b.x + b.w && py > b.y && py < b.y + b.h) };
    };
    const labels = { die: vt.querySelector("[data-label=die]"), card: vt.querySelector("[data-label=card]") };
    const lp = new THREE.Vector3(), sealAt = new THREE.Vector3();
    let noteSeen = false, rolledOnce = false;
    // the labels do what they say: the pill rolls the die, or opens the envelope
    labels.die.addEventListener("click", () => { if (!labels.die.classList.contains("on")) return; rolledOnce = true; throwDie(); });
    labels.card.addEventListener("click", () => { if (!labels.card.classList.contains("on")) return; noteSeen = true; openNote(); });
    const placeLabel = (el, obj, lift, show) => {
      lp.copy(obj.isVector3 ? obj : obj.position); lp.y += lift; lp.project(camera);
      const vis = show && lp.z < 1 && Math.abs(lp.x) < 0.95 && lp.y < 0.85 && lp.y > -0.95;
      el.classList.toggle("on", vis);
      if (!vis) return;
      const r = canvas.getBoundingClientRect();
      el.style.transform = `translate3d(${((lp.x + 1) / 2 * r.width).toFixed(1)}px, ${((1 - lp.y) / 2 * r.height).toFixed(1)}px, 0) translate(-50%, -100%)`;
    };
    const setTip = (txt) => { tip.textContent = txt || ""; tip.classList.toggle("on", !!txt); };

    const down = (e) => {
      if (NOTE.cam > 0) return;
      view.drag = true; view.moved = 0; view.x0 = e.clientX; view.y0 = e.clientY;
      canvas.classList.add("is-drag");
    };
    const move = (e) => {
      const r = vt.getBoundingClientRect();
      rx = (e.clientX - r.left) / r.width - 0.5; ry = (e.clientY - r.top) / r.height - 0.5;
      if (view.drag) {
        const dx = e.clientX - view.x0, dy = e.clientY - view.y0;
        view.moved += Math.abs(dx) + Math.abs(dy);
        view.vth = -dx * 0.0042;
        sway.vz += dx * 0.00035; sway.vx -= dy * 0.00025; // the air you move reaches the lamp
        view.th += view.vth;
        view.h = Math.min(H_MAX, Math.max(0.24, view.h + dy * 0.003));
        view.x0 = e.clientX; view.y0 = e.clientY;
        return;
      }
      if (roll.on || NOTE.cam > 0) return;
      if (e.target !== canvas) { hoverBox = -1; if (chosen < 0) setTip(""); return; }
      const p = pick(e);
      hoverBox = p.box != null ? p.box : -1;
      canvas.classList.toggle("is-link", hoverBox >= 0 || !!p.card || !!p.die);
      if (hoverBox >= 0) { const b = boxes[hoverBox]; setTip(`${b.n} · ${b.title} — ${T("apostar", "place your bet")} →`); }
      else if (p.die) setTip(T("Lanza el dado", "Roll the die"));
      else if (p.card) setTip(T("Una nota para usted", "A note for you"));
      else if (chosen >= 0) setTip(`${boxes[chosen].title} — ${T("apostar", "place your bet")} →`);
      else setTip("");
    };
    const up = (e) => {
      if (!view.drag) return;
      view.drag = false;
      canvas.classList.remove("is-drag");
      if (view.moved > 6) return;
      const p = pick(e);
      if (p.die) { rolledOnce = true; throwDie(); return; }
      if (p.card) { noteSeen = true; openNote(); return; }
      if (p.box != null && p.box >= 0) {
        const btn = vt.querySelector(`[data-next="${boxes[p.box].i}"]`);
        if (btn) btn.click();
      }
    };
    canvas.addEventListener("pointerdown", down);
    addEventListener("pointermove", move);
    addEventListener("pointerup", up);
    /* ---------- the envelope opens, in the scene itself ----------
       The camera comes down to the envelope, the seal breaks, the flap turns on its
       hinge, the card slides out of the top and rises to face you. Closing is the
       same story played backwards. Five numbers drive it all (0 → 1). */
    const motionK = matchMedia("(prefers-reduced-motion: reduce)").matches ? 0.35 : 1;
    const NOTE = { cam: 0, raise: 0, crack: 0, flap: 0, slide: 0, lift: 0, open: false, busy: false, tweens: [] };
    const easeIO = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
    const easeOut = (t) => 1 - Math.pow(1 - t, 3);
    const tweenTo = (key, to, dur, ease = easeIO) => new Promise((res) => {
      NOTE.tweens = NOTE.tweens.filter((t) => t.key !== key);
      NOTE.tweens.push({ key, from: NOTE[key], to, t: 0, dur: Math.max(0.01, dur * motionK), ease, res });
    });
    const stepTweens = (dt) => {
      NOTE.tweens = NOTE.tweens.filter((t) => {
        t.t = Math.min(1, t.t + dt / t.dur);
        NOTE[t.key] = t.from + (t.to - t.from) * t.ease(t.t);
        if (t.t >= 1) { t.res(); return false; }
        return true;
      });
    };
    const rustle = (v = 1) => {
      const S2 = window.CASINO && window.CASINO.sound;
      if (!S2 || !S2.on) return;
      const a = S2.audio(); if (!a) return;
      for (let k = 0; k < 5; k++) S2.burst(a, a.currentTime + k * 0.04 + Math.random() * 0.03, { freq: 2600 + Math.random() * 2400, type: "bandpass", q: 0.9, gain: 0.03 * v, dur: 0.06 });
    };
    async function openNote() {
      visit.did.n = 1;
      (window.WOBLO_TRACK && window.WOBLO_TRACK("note", "abre la carta"));
      if (NOTE.busy || NOTE.open) return;
      NOTE.busy = true; noteSeen = true;
      vt.classList.add("is-note"); setTip("");
      const wait = (ms) => new Promise((r) => setTimeout(r, ms * motionK));
      // each step starts a little before the last one ends: no dead stops
      const camDone = tweenTo("cam", 1, 1.7);
      await wait(500);
      const raiseDone = tweenTo("raise", 1, 1.6);         // the envelope is picked up and turned to you
      await wait(1350);
      tweenTo("crack", 1, 0.4, easeOut); rustle(0.6);    // the wax gives
      await wait(200);
      const flapDone = tweenTo("flap", 1, 1.5);           // the flap opens back over the top
      await wait(1250);
      rustle(1);
      await Promise.all([camDone, raiseDone]);
      await tweenTo("slide", 1, 1.4);                     // the card slides up out of the mouth
      await flapDone;
      await tweenTo("lift", 1, 1.5);                      // and comes to you
      noteEl.classList.add("on", "reading"); noteEl.setAttribute("aria-hidden", "false");
      noteEl.querySelector(".vt3-note-close").focus({ preventScroll: true });
      NOTE.open = true; NOTE.busy = false;
    }
    async function closeNote() {
      if (NOTE.busy || !NOTE.open) return;
      NOTE.busy = true;
      noteEl.classList.remove("on", "reading"); noteEl.setAttribute("aria-hidden", "true");
      const wait = (ms) => new Promise((r) => setTimeout(r, ms * motionK));
      await tweenTo("lift", 0, 1.4);                      // back above the envelope's mouth
      rustle(0.8);
      await tweenTo("slide", 0, 1.3);                     // slides back in
      const flapBack = tweenTo("flap", 0, 1.4);           // the flap folds down over it
      await wait(1150);
      tweenTo("crack", 0, 0.35, easeOut);                 // the seal closes on itself
      await flapBack;
      const lower = tweenTo("raise", 0, 1.5);             // the envelope goes back on the felt
      await wait(700);
      await Promise.all([lower, tweenTo("cam", 0, 1.7)]); // and the camera walks on
      vt.classList.remove("is-note");
      NOTE.open = false; NOTE.busy = false;
    }
    noteEl.addEventListener("click", (e) => { if (e.target === noteEl || e.target.closest(".vt3-note-close")) closeNote(); });
    const noteKey = (e) => { if (e.key === "Escape" && NOTE.open) closeNote(); };
    addEventListener("keydown", noteKey);

    // where the camera stands to watch the envelope, and where the card ends up to be read
    const notePose = (() => {
      const pos = new THREE.Vector3(), look = new THREE.Vector3(), readPos = new THREE.Vector3(), readQ = new THREE.Quaternion();
      const m = new THREE.Matrix4(), qx = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1, 0, 0), Math.PI / 2), up = new THREE.Vector3(0, 1, 0);
      return () => {
        const half = THREE.MathUtils.degToRad(camera.fov / 2), t = Math.tan(half), asp = camera.aspect;
        // the held envelope with the card rising out of it: about 1.1 wide, 1.25 tall,
        // seen nearly face on, a little from above
        const fitW = 1.15 / (2 * t * asp), fitH = 1.25 / (2 * t);
        const dist = Math.max(fitW, fitH) * 1.06, a = THREE.MathUtils.degToRad(14);
        look.set(card.position.x, HOLD.y + 0.22, card.position.z + HOLD.z);
        pos.set(look.x, look.y + Math.sin(a) * dist, look.z + Math.cos(a) * dist);
        // the card, square to the lens, filling most of the view
        const dir = look.clone().sub(pos).normalize();
        const rd = Math.max((CARD_W / 0.8) / (2 * t * asp), (CARD_D / 0.66) / (2 * t));
        readPos.copy(pos).addScaledVector(dir, rd);
        readQ.setFromRotationMatrix(m.lookAt(pos, readPos, up)); // its +Z points back at the camera
        readQ.multiply(qx);
        return { pos, look, readPos, readQ };
      };
    })();
    // how the envelope is held: lifted, brought forward, stood up to 72° facing you
    const HOLD = { y: 0.42, z: 0.22, tilt: THREE.MathUtils.degToRad(72) };
    const orbitPos = new THREE.Vector3(), orbitLook = new THREE.Vector3(), camLook = new THREE.Vector3();
    const mouthN = new THREE.Vector3(), mouthP = new THREE.Vector3();
    const cardIn = new THREE.Vector3(), cardOut = new THREE.Vector3(), envQ = new THREE.Quaternion();
    function stepNote(dt) {
      stepTweens(dt);
      const P = notePose();
      // camera: from the orbit to the envelope
      if (NOTE.cam > 0) {
        camera.position.lerpVectors(orbitPos, P.pos, NOTE.cam);
        camLook.lerpVectors(orbitLook, P.look, NOTE.cam);
        camera.lookAt(camLook);
      }
      // the envelope picked up: up, forward, and stood toward you (an arc, not a slide)
      const r = NOTE.raise;
      env.position.set(0, HOLD.y * r + Math.sin(r * Math.PI) * 0.06, HOLD.z * r);
      env.rotation.x = HOLD.tilt * easeIO(r);
      // the seal parts a hair, then the flap carries its half up and over
      sealFlap.position.y = FLAP_SEAL_Y + NOTE.crack * 0.002;
      sealBody.userData.face.visible = sealFlap.userData.face.visible = NOTE.crack > 0.01 || NOTE.flap > 0.01;
      sealFlap.rotation.x = -NOTE.crack * 0.06;
      flapPivot.rotation.x = NOTE.flap * FLAP_OPEN;
      // the card: inside → up out of the mouth (in front of the folded-back flap) → to the lens
      env.updateMatrixWorld(true);
      const lift0 = 0.0082; // between the liner and the pocket; the flap's hinge is below it, so the open flap is always behind
      cardIn.set(0, lift0, 0).applyMatrix4(env.matrixWorld);
      cardOut.set(0, lift0, -(ENV_D / 2 + CARD_D / 2 + 0.02) * NOTE.slide).applyMatrix4(env.matrixWorld);
      env.getWorldQuaternion(envQ);
      // the mouth: the plane of the envelope's top edge, facing out of it
      mouthN.set(0, 0, -1).applyQuaternion(envQ);
      mouthP.set(0, 0, -ENV_D / 2).applyMatrix4(env.matrixWorld);
      if (NOTE.lift > 0) {
        // up and over, in a curve: rises first, then comes forward to the lens
        const k = NOTE.lift, ctrl = cardOut.clone(); ctrl.y += 0.18; ctrl.z += 0.1; // a little higher first, then to you
        const a = (1 - k) * (1 - k), b = 2 * (1 - k) * k, c = k * k;
        noteCard.position.set(
          a * cardOut.x + b * ctrl.x + c * P.readPos.x,
          a * cardOut.y + b * ctrl.y + c * P.readPos.y,
          a * cardOut.z + b * ctrl.z + c * P.readPos.z);
        noteCard.quaternion.slerpQuaternions(envQ, P.readQ, easeIO(Math.min(1, k * 1.15)));

      } else {
        noteCard.position.copy(cardOut);
        noteCard.quaternion.copy(envQ);

      }
      noteCard.visible = true; // inside, it shows through the V of the pocket
      // light on the card as it comes up: the table lamp only grazes a card held upright
      const lit = Math.max(NOTE.slide * 0.45, NOTE.lift);
      noteLight.intensity = 2.0 * lit;
      noteLight.position.copy(camera.position).add(new THREE.Vector3(-0.35, 0.45, -0.1));
      noteLight.target.position.copy(noteCard.position);
      noteLight.target.updateMatrixWorld();
      noteFace.emissiveIntensity = 0.14 * NOTE.lift;
    }

    const R = portrait ? 8.4 : small ? 6.6 : 7.4;
    let last = performance.now();
    const target = new THREE.Vector3(0, portrait ? 0.15 : small ? -0.1 : 0.32, 0);
    const slow = { n: 0, t: performance.now() }; // judged after the first 4 s at the table
    const frame = (now) => {
      const raw = now - last;
      const dt = Math.min(0.05, raw / 1000); last = now;
      if (composer && now > 4000 + slow.t) {
        slow.n = raw > 34 ? slow.n + 1 : Math.max(0, slow.n - 1);
        if (slow.n > 75) { composer = null; renderer.setPixelRatio(Math.min(devicePixelRatio || 1, 1.25)); resize(); if (window.PERF) window.PERF.goLite(); }
      }
      // the slow walk round the table pauses while the note is out
      if (!view.drag && NOTE.cam === 0) { view.vth *= Math.pow(0.04, dt); view.th += view.vth + dt * 0.045; }
      const th = view.th + rx * 0.08 * (1 - NOTE.cam);
      const h = view.h - ry * 0.12 * (1 - NOTE.cam);
      orbitPos.set(Math.cos(th) * R, h, Math.sin(th) * R * 0.86);
      orbitLook.copy(target);
      camera.position.copy(orbitPos);
      camera.lookAt(target);
      stepNote(Math.min(0.25, raw / 1000)); // real time: the note takes as long on a slow device
      stepDie(dt);
      {
        const hgt = Math.max(0, die.position.y - DS / 2);
        dieAO.position.set(die.position.x, 0.0015, die.position.z);
        dieAO.scale.setScalar(1 + hgt * 1.6);
        dieAO.material.opacity = 0.85 / (1 + hgt * 9);
      }
      stepDust(now / 1000, dt);
      dust.material.opacity = 0.4 * (1 - NOTE.lift * 0.85); // the air clears while you read
      stepLamp(now / 1000, dt);
      cardHalo.material.opacity = noteSeen ? 0.06 : 0.14 + Math.sin(now / 520) * 0.08;
      // the labels stay until you have done the thing once
      // both labels hang on a thread that ends just above the object it names
      placeLabel(labels.die, die, DS / 2 + 0.05, !roll.on && !rolledOnce);
      placeLabel(labels.card, sealBody.getWorldPosition(sealAt), 0.04, !noteSeen && NOTE.cam === 0);
      if (NOTE.cam > 0) labels.die.classList.remove("on");
      stepSmoke(now / 1000, dt);
      smoke.material.uniforms.uScale.value = renderer.getPixelRatio();
      if (iceShake > 0.001) {
        iceShake *= Math.exp(-dt * 3.2);
        tumbler.userData.ice.forEach((m, k) => {
          const w = Math.sin(now / 1000 * (26 + k * 7) + k) * iceShake;
          m.position.set(m.userData.rest.x + w * 0.012, m.userData.rest.y + Math.abs(w) * 0.008, m.userData.rest.z - w * 0.01);
          m.rotation.set(m.userData.rot.x + w * 0.25, m.userData.rot.y + w * 0.4, m.userData.rot.z);
        });
      }
      if (bokeh) bokeh.uniforms.focus.value = NOTE.cam > 0
        ? camera.position.distanceTo(noteCard.visible ? noteCard.position : card.position) // the lens follows the note
        : camera.position.distanceTo(die.position) * 0.6 + camera.position.distanceTo(target) * 0.4;
      stepAmbience(now / 1000);
      glows.forEach((g, k) => {
        const want = k === hoverBox ? 0.16 : k === chosen ? 0.1 + Math.sin(now / 260) * 0.04 : 0;
        g.material.opacity += (want - g.material.opacity) * Math.min(1, dt * 8);
      });
      if (composer) composer.render(dt); else renderer.render(scene, camera);
      raf = requestAnimationFrame(frame);
    };
    // a veil while the table is set: wait for the room light and the lens (at most a few seconds),
    // compile every shader in one go, then lift the veil on the first real frame
    const veil = document.createElement("div");
    veil.className = "vt3-load";
    // a glass of whisky being poured: it fills while the table is set, and is full when it is ready
    veil.innerHTML = `
      <div class="wk" aria-hidden="true">
        <i class="wk-pour"></i>
        <div class="wk-glass">
          <div class="wk-level"><div class="wk-liquid"><i class="wk-wave"></i><i class="wk-ice"></i><i class="wk-ice is-b"></i><i class="wk-bub"></i><i class="wk-bub is-b"></i></div></div>
        </div>
        <svg class="wk-edge" viewBox="0 0 80 96"><path d="M3 2 L77 2 L70 94 L10 94 Z"/><path class="wk-base" d="M10.6 86 L69.4 86"/></svg>
      </div>
      <span role="status">${T("Sirviendo la mesa", "Pouring your table")}</span>`;
    vt.appendChild(veil);
    const ready = Promise.race([Promise.all([envReady, postReady]), new Promise((r) => setTimeout(r, 4000))]);
    ready.then(() => new Promise((r) => requestAnimationFrame(r))).then(() => (disposed ? null : compileAsync(renderer, scene, camera))).then(() => {
      if (disposed) return;
      last = performance.now(); slow.t = last;
      raf = requestAnimationFrame((now) => { frame(now); veil.classList.add("full"); setTimeout(() => veil.classList.add("off"), 650); setTimeout(() => veil.remove(), 1700); });
    });
    window.__vt = { scene, camera, view, renderer, throwDie, roll, openNote: () => openNote(), closeNote: () => closeNote(), note: NOTE, get composer() { return composer; } };

    return () => {
      disposed = true;
      endVisit();
      removeEventListener("pagehide", endVisit);
      document.removeEventListener("visibilitychange", onHidden);
      cancelAnimationFrame(raf);
      ambStop();
      if (rolls.length) showReceipt(ctx.name, rolls);
      removeEventListener("resize", resize);
      removeEventListener("pointermove", move);
      removeEventListener("pointerup", up);
      removeEventListener("keydown", noteKey);
      scene.traverse((o) => {
        if (o.geometry) o.geometry.dispose();
        const ms = o.material ? (Array.isArray(o.material) ? o.material : [o.material]) : [];
        ms.forEach((m) => { Object.values(m).forEach((v) => v && v.isTexture && v.dispose()); m.dispose(); });
      });
      if (composer) { composer.renderTarget1.dispose(); composer.renderTarget2.dispose(); if (bloom) bloom.dispose(); }
      if (scene.environment) scene.environment.dispose();
      pmrem.dispose();
      renderer.dispose();
      renderer.forceContextLoss();
      window.__vt = null;
    };
  }

  /* ---------- the receipt: what the house saw, to keep ---------- */
  function showReceipt(name, rolls) {
    const old = document.querySelector(".vt-receipt");
    if (old) old.remove();
    const V = window.VOUCHER;
    const sum = rolls.reduce((s, r) => s + r.val, 0);
    const v = V.make({
      sub: `${T("MESA PRIVADA", "PRIVATE TABLE")} · ${name.toUpperCase()}`,
      words: `${V.words(sum)} ${T(sum === 1 ? "PUNTO" : "PUNTOS", sum === 1 ? "POINT" : "POINTS")}`,
      amount: `${sum} PTS`,
      // the rolls in one line, and where the last one sent you
      detail: `${rolls.slice(-6).map((r) => r.val).join(" · ")}  →  ${rolls[rolls.length - 1].title.toUpperCase()}`,
    });
    const el = document.createElement("aside");
    el.className = "vt-receipt";
    el.setAttribute("role", "dialog");
    el.setAttribute("aria-label", T("Ticket de la mesa", "Table ticket"));
    el.innerHTML = `${V.html(v)}
      <div class="vtr-actions">
        <button type="button" class="vtr-dl">${T("Descargar", "Download")} ↓</button>
      </div>`;
    document.body.appendChild(el);
    requestAnimationFrame(() => el.classList.add("on"));
    let timer = setTimeout(close, 14000);
    el.addEventListener("pointerenter", () => clearTimeout(timer));
    el.addEventListener("pointerleave", () => { clearTimeout(timer); timer = setTimeout(close, 6000); });
    function close() { el.classList.remove("on"); setTimeout(() => el.remove(), 700); }
    el.querySelector(".vc-x").addEventListener("click", close);
    el.querySelector(".vtr-dl").addEventListener("click", async () => {
      const c = await V.canvas(v, 2);
      c.toBlob((blob) => {
        if (!blob) return;
        const link = document.createElement("a");
        link.href = URL.createObjectURL(blob);
        link.download = `woblo-ticket-${name.toLowerCase().replace(/[^a-z0-9]+/g, "-")}-${v.number}.png`;
        document.body.appendChild(link); link.click(); link.remove();
        setTimeout(() => URL.revokeObjectURL(link.href), 4000);
      }, "image/png");
    });
  }

  window.VIP_TABLE = { html, init };
})();
