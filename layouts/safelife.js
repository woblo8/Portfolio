/* ============================================================
   SAFELIFE — light where the city needs it.
   A technical page where you direct the light: the arm of the
   streetlight turns as you scroll and its beam follows, the three
   verbs light up one by one, a diagram compares fixed and adaptive
   light, the dimensioned drawing plots itself while its parts are
   named, and an orientation HUD reads the angle of the arm.
   ============================================================ */
(() => {
  "use strict";
  window.LAYOUTS = window.LAYOUTS || {};
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const smooth = (a, b, t) => { const x = clamp((t - a) / (b - a), 0, 1); return x * x * (3 - 2 * x); };
  const lerp = (a, b, t) => a + (b - a) * t;

  // where the light ring sits in each rotation frame (fractions of the frame)
  const RING = [
    { x: 0.886, y: 0.15, a: 0 },     // rot-a: arm to the right
    { x: 0.76, y: 0.44, a: -55 },    // rot-b: arm towards us
    { x: 0.235, y: 0.57, a: -125 },  // rot-c: arm to the left
  ];

  function render(p, i, h) {
    const { esc, pad } = h;
    const d = p.safe;
    const f = (x) => `${p.folder}/${x}`;
    const fig = (src, alt, cls = "") => `<figure class="sl-img ${cls}" data-zoom><img src="${f(src)}" alt="${esc(alt)}" data-cap="${esc(alt)}" loading="lazy"></figure>`;

    return `
<div class="sl">
  <section class="sl-hero" data-sl="hero">
    <div class="sl-sticky">
      <div class="sl-stage">
        <div class="sl-beam"></div>
        <div class="sl-pool"></div>
        <img class="sl-frame" data-f="0" src="${f("frames/rot-a.webp")}" alt="SAFELIFE">
        <img class="sl-frame" data-f="1" src="${f("frames/rot-b.webp")}" alt="">
        <img class="sl-frame" data-f="2" src="${f("frames/rot-c.webp")}" alt="">
      </div>
      <div class="sl-hero-meta"><b>PROJECT ${pad(i)}</b><span>/</span><span>${esc(p.category)}</span><span>/</span><span>${esc(p.year)}</span></div>
      <div class="sl-hero-text">
        <h1 class="sl-title">SAFELIFE</h1>
        <p class="sl-sub">${esc(p.intro)}</p>
      </div>
      <p class="sl-problem">${esc(d.problem)}</p>
    </div>
  </section>

  <section class="sl-verbs" data-sl="verbs">
    <div class="sl-sticky">
      <span class="sl-kicker">${T("Concepto", "Concept")}</span>
      <p class="sl-idea">${esc(d.idea)}</p>
      <ol class="sl-verb-list">
        ${d.verbs.map((v) => `<li><b>${esc(v.w)}</b><span>${esc(v.t)}</span></li>`).join("")}
      </ol>
    </div>
  </section>

  <section class="sl-compare" data-sl="compare">
    <div class="sl-sticky">
      <header class="sl-head">
        <span class="sl-kicker">${T("De fija a adaptable", "From fixed to responsive")}</span>
        <h2>${T("Una dirección fija.<br>O la que haga falta.", "One fixed direction.<br>Or whichever it takes.")}</h2>
      </header>
      <div class="sl-diagrams">
        <figure class="sl-diagram">
          <svg viewBox="0 0 400 300" aria-hidden="true">
            <path class="sl-cone" d="M300 70 L240 270 L360 270 Z"/>
            <path class="sl-draw" d="M120 270 V70 H300"/>
            <circle class="sl-draw" cx="300" cy="70" r="12"/>
            <path class="sl-ground" d="M40 270 H380"/>
          </svg>
          <figcaption><span>01</span>${T("Luz fija — una dirección permanente", "Fixed lighting — one permanent direction")}</figcaption>
        </figure>
        <figure class="sl-diagram is-adaptive">
          <svg viewBox="0 0 400 300" aria-hidden="true">
            <g class="sl-arm">
              <path class="sl-cone" d="M300 70 L240 270 L360 270 Z"/>
              <path class="sl-draw" d="M120 70 H300"/>
              <circle class="sl-draw" cx="300" cy="70" r="12"/>
            </g>
            <path class="sl-draw" d="M120 270 V70"/>
            <circle class="sl-pivot" cx="120" cy="70" r="5"/>
            <path class="sl-ground" d="M40 270 H380"/>
          </svg>
          <figcaption><span>02</span>${T("Concepto adaptable — orientación ajustable", "Adaptive concept — adjustable orientation")}</figcaption>
        </figure>
      </div>
    </div>
  </section>

  <section class="sl-block">
    <header class="sl-head r">
      <span class="sl-kicker">${T("Desarrollo de concepto", "Concept development")}</span>
      <h2>${T("Tres caminos.<br>Un brazo que gira.", "Three paths.<br>One arm that turns.")}</h2>
    </header>
    <div class="sl-cards">
      ${d.concept.map((c, k) => `
      <article class="sl-card r ${k === d.concept.length - 1 ? "is-selected" : ""}">
        ${fig(c.img, c.label)}
        <h3>${esc(c.label)}</h3>
        <p>${esc(c.text)}</p>
      </article>`).join("")}
    </div>
  </section>

  <section class="sl-block">
    <header class="sl-head r">
      <span class="sl-kicker">${T("Prototipado físico", "Physical prototyping")}</span>
      <h2>${T("Del render<br>a la mano.", "From render<br>to hand.")}</h2>
    </header>
    <div class="sl-proto">
      ${d.prototype.map((c) => `
      <article class="sl-proto-item r">
        ${fig(c.img, c.label)}
        <h3>${esc(c.label)}</h3>
        <p>${esc(c.text)}</p>
      </article>`).join("")}
    </div>
  </section>

  <section class="sl-axis" data-sl="axis">
    <div class="sl-sticky">
      <div class="sl-axis-grid">
        <div class="sl-axis-text">
          <span class="sl-kicker">${T("Construida sobre un eje", "Built around one axis")}</span>
          <h2>${T("Cuatro piezas.<br>Un solo giro.", "Four parts.<br>One turn.")}</h2>
          <ol class="sl-parts">
            ${d.parts.map((pt) => `<li><span>${esc(pt.n)}</span><b>${esc(pt.label)}</b><small>${esc(pt.text)}</small></li>`).join("")}
          </ol>
        </div>
        <figure class="sl-plot" data-zoom><img src="${f("drawings/dimensions.png")}" alt="Dimensioned drawing" data-cap="${T("Alzado acotado: 700 cm de altura, cimentación de 175 cm.", "Dimensioned elevation: 700 cm high, 175 cm foundation.")}"><i class="sl-pen"></i></figure>
        <figure class="sl-plot is-top" data-zoom><img src="${f("drawings/topview.png")}" alt="Top view" data-cap="${T("Vista superior: el brazo de 250 cm gira alrededor del soporte vertical.", "Top view: the 250 cm arm turns around the vertical support.")}"><i class="sl-pen"></i></figure>
      </div>
    </div>
  </section>

  <section class="sl-block">
    <div class="sl-views">
      ${fig("renders/above.webp", T("Vista superior del brazo y el anillo LED", "Top view of the arm and LED ring"), "is-clear")}
      ${fig("renders/below.webp", T("Vista inferior: el anillo de luz", "Bottom view: the ring of light"), "is-clear")}
    </div>
  </section>

  <section class="sl-wide">
    ${fig("process/disassembly.jpg", T("Despiece: soporte, brazo, anillo y uniones", "Disassembly: support, arm, ring and joints"), "is-wide")}
  </section>

  <section class="sl-urban">
    <figure class="sl-urban-img" data-zoom><img src="${f("process/urban.jpg")}" alt="SAFELIFE in the city" data-cap="Urban application: adaptive lighting in context." loading="lazy"></figure>
    <div class="sl-urban-text">
      <span class="sl-kicker">${T("Aplicación urbana", "Urban application")}</span>
      <ol>${d.verbs.map((v, k) => `<li class="r"><span>${String(k + 1).padStart(2, "0")}</span>${esc(v.w)}</li>`).join("")}</ol>
    </div>
  </section>

  <section class="sl-outro">
    <p class="sl-outro-line">${esc(d.outro).replace(/\n/g, "<br>")}</p>
  </section>

  <div class="sl-hud" aria-hidden="true">
    <span><b>SAFELIFE</b> · Streetlight</span>
    <span>Orientation <b class="sl-angle">000°</b></span>
    <span class="sl-state">Light · <b>Directed</b></span>
    <div class="sl-hud-bar"><i></i></div>
  </div>
</div>`;
  }

  function init(scroller, root) {
    const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
    const $ = (s) => root.querySelector(s);
    const $$ = (s) => [...root.querySelectorAll(s)];
    const hero = $('[data-sl="hero"]'), frames = $$(".sl-frame"), stage = $(".sl-stage"), beam = $(".sl-beam"), pool = $(".sl-pool");
    const title = $(".sl-hero-text"), problem = $(".sl-problem"), meta = $(".sl-hero-meta");
    const verbs = $('[data-sl="verbs"]'), verbItems = $$(".sl-verb-list li"), idea = $(".sl-idea");
    const compare = $('[data-sl="compare"]'), arm = $(".sl-arm"), draws = $$(".sl-draw"), diagrams = $$(".sl-diagram");
    const axis = $('[data-sl="axis"]'), plots = $$(".sl-plot"), parts = $$(".sl-parts li");
    const angleEl = $(".sl-angle"), hudBar = $(".sl-hud-bar i");
    draws.forEach((el) => { const L = el.getTotalLength(); el.style.strokeDasharray = L; el.style.strokeDashoffset = L; el.dataset.len = L; });
    let raf = 0, angle = 0;

    const pinned = (el) => { const r = el.getBoundingClientRect(); return clamp(-r.top / Math.max(1, r.height - innerHeight), 0, 1); };
    const seen = (el) => { const r = el.getBoundingClientRect(); return clamp(1 - (r.top - innerHeight * 0.1) / (innerHeight * 0.85), 0, 1); };

    function frame() {
      // hero: the arm turns with the scroll, the beam and its pool of light follow
      const hp = pinned(hero);
      const k = reduce ? 0 : smooth(0.08, 0.9, hp) * 2; // 0 → 2 across the three frames
      const i0 = Math.min(1, Math.floor(k)), u = k - i0;
      frames.forEach((im, n) => {
        const w = n === i0 ? 1 - u : n === i0 + 1 ? u : 0;
        im.style.opacity = w.toFixed(3);
      });
      const r0 = RING[i0], r1 = RING[i0 + 1];
      const rx = lerp(r0.x, r1.x, u), ry = lerp(r0.y, r1.y, u);
      angle = lerp(r0.a, r1.a, u);
      const sw = stage.clientWidth, sh = stage.clientHeight;
      // the stage is 16:9 "contain"-fitted into the viewport
      const fw = Math.min(sw, sh * 16 / 9), fh = fw * 9 / 16, ox = (sw - fw) / 2, oy = (sh - fh) / 2;
      const bx = ox + rx * fw, by = oy + ry * fh;
      const groundY = oy + fh * 0.98;
      beam.style.left = `${bx}px`;
      beam.style.top = `${by}px`;
      beam.style.height = `${Math.max(0, groundY - by)}px`;
      pool.style.left = `${bx}px`;
      pool.style.top = `${groundY}px`;
      const glow = smooth(0, 0.12, hp) * 0.4 + 0.6;
      beam.style.opacity = pool.style.opacity = glow.toFixed(3);
      const out = smooth(0, 0.2, hp);
      title.style.opacity = (1 - out).toFixed(3);
      title.style.transform = `translate3d(0, ${(-out * 5).toFixed(2)}vh, 0)`;
      meta.style.opacity = (1 - out).toFixed(3);
      problem.classList.toggle("on", hp > 0.35);

      // three verbs, lit one after another like a beam moving across them
      const vp = pinned(verbs);
      verbItems.forEach((li, n) => li.classList.toggle("on", vp > 0.18 + n * 0.22));
      idea.style.opacity = (0.35 + smooth(0, 0.15, vp) * 0.65).toFixed(3);

      // fixed vs adaptive: the drawing traces itself, then the adaptive arm sweeps
      const cp = pinned(compare);
      const trace = smooth(0.02, 0.4, cp);
      draws.forEach((el) => { el.style.strokeDashoffset = (parseFloat(el.dataset.len) * (1 - trace)).toFixed(1); });
      diagrams.forEach((dg) => dg.classList.toggle("on", trace > 0.85));
      const sweep = Math.sin(smooth(0.45, 1, cp) * Math.PI * 2) * -38;
      arm.setAttribute("transform", `rotate(${sweep.toFixed(2)} 120 70)`);

      // one axis: the drawings plot themselves while the parts are named
      const ap = pinned(axis);
      plots.forEach((pl, n) => pl.style.setProperty("--plot", (reduce ? 1 : smooth(0.02 + n * 0.25, 0.5 + n * 0.25, ap)).toFixed(4)));
      parts.forEach((li, n) => li.classList.toggle("on", ap > 0.12 + n * 0.17));

      // HUD
      const sp = clamp(scroller.scrollTop / Math.max(1, scroller.scrollHeight - scroller.clientHeight), 0, 1);
      angleEl.textContent = `${String(Math.round(Math.abs(angle))).padStart(3, "0")}°`;
      hudBar.style.transform = `scaleX(${sp.toFixed(4)})`;
      raf = requestAnimationFrame(frame);
    }
    raf = requestAnimationFrame(frame);
    const stop = () => cancelAnimationFrame(raf);
    stop.receipt = () => `Orientation ${angleEl.textContent}`;
    return stop;
  }

  window.LAYOUTS.safelife = { render, init };
})();
