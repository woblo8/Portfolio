/* ============================================================
   TON 618 — absurd scale. The case study is a fall towards the
   quasar: the camera dives into the black sphere, the luminosity
   is written out digit by digit, the object explodes into its
   parts, the drawings plot themselves, and words recede into depth.
   ============================================================ */
(() => {
  "use strict";
  window.LAYOUTS = window.LAYOUTS || {};
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const smooth = (a, b, t) => { const x = clamp((t - a) / (b - a), 0, 1); return x * x * (3 - 2 * x); };

  function render(p, i, h) {
    const { esc, pad } = h;
    const d = p.ton;
    const f = (x) => `${p.folder}/${x}`;
    const cap = (k) => esc((p.captions && p.captions[k]) || p.title);
    const zoomImg = (src, k, cls = "") => `<figure class="tn-img ${cls}" data-zoom><img src="${f(src)}" alt="${cap(k)}" data-cap="${cap(k)}" loading="lazy"></figure>`;
    // 10^40 written out: 1 followed by forty zeros, grouped in thousands
    const big = "10" + " 000".repeat(13);

    return `
<div class="tn">
  <section class="tn-hero" data-tn="hero">
    <div class="tn-sticky">
      <div class="tn-zoom"><img src="${f(d.hero)}" alt="${cap(0)}"></div>
      <div class="tn-hero-meta"><b>PROJECT ${pad(i)}</b><span>/</span><span>${esc(p.category)}</span><span>/</span><span>${esc(p.year)}</span></div>
      <h1 class="tn-title">TON&nbsp;618</h1>
      <p class="tn-sub">${esc(p.short)}</p>
      <p class="tn-fact">${esc(d.fact)}</p>
    </div>
  </section>

  <section class="tn-power" data-tn="power">
    <div class="tn-sticky">
      <span class="tn-kicker">${T("Luminosidad", "Luminosity")}</span>
      <p class="tn-power-lead">${esc(d.power)}</p>
      <div class="tn-number"><span class="tn-digits">${big}</span><b>W</b></div>
      <div class="tn-power-foot">
        <p class="tn-sun">${esc(d.powerSun)}</p>
        <p class="tn-exp">10<sup>40</sup>&thinsp;W</p>
      </div>
    </div>
  </section>

  <section class="tn-statement">
    <p class="tn-recede" data-recede>${esc(d.object)}</p>
  </section>

  <section class="tn-film">
    <figure class="tn-video"><video src="${f(d.video)}" muted loop playsinline autoplay preload="metadata"></video></figure>
    <p class="tn-caption"><span>${T("Película", "Film")}</span>${esc(p.intro)}</p>
  </section>

  <section class="tn-exploded" data-tn="exploded">
    <div class="tn-sticky">
      <header class="tn-head">
        <span class="tn-kicker">${T("Vista explosionada", "Exploded view")}</span>
        <h2>${T("Tres piezas.<br>Un solo gesto.", "Three parts.<br>One gesture.")}</h2>
      </header>
      <div class="tn-ex-stage">
        <figure class="tn-ex-img" data-zoom><img src="${f(d.exploded)}" alt="${cap(3)}" data-cap="${cap(3)}"></figure>
        ${d.parts.map((pt, k) => `
        <div class="tn-part" style="--y:${pt.y}%" data-k="${k}">
          <i></i><span class="tn-part-n">${String(k + 1).padStart(2, "0")}</span>
          <span class="tn-part-l"><b>${esc(pt.label)}</b><small>${esc(pt.note)}</small></span>
        </div>`).join("")}
      </div>
    </div>
  </section>

  <section class="tn-detail">
    <header class="tn-head r">
      <span class="tn-kicker">${T("Luz", "Light")}</span>
      <h2 class="tn-recede" data-recede>${T("La luz escapa<br>por la retícula.", "Light escapes<br>through the grid.")}</h2>
    </header>
    <div class="tn-pair">
      ${d.details.map((src, k) => `<div class="tn-par" data-depth="${k ? 0.18 : -0.12}">${zoomImg(src, k + 1)}</div>`).join("")}
    </div>
  </section>

  <section class="tn-profile">
    ${zoomImg(d.profile, 4, "is-wide")}
    <p class="tn-caption"><span>${T("Perfil", "Profile")}</span>${cap(4)}</p>
  </section>

  <section class="tn-drawings">
    <header class="tn-head r">
      <span class="tn-kicker">${T("Planos", "Drawings")}</span>
      <h2>${T("Planos.", "Drawings.")}</h2>
    </header>
    <div class="tn-plot-grid">
      ${d.drawings.map((src, k) => `<div class="tn-plot" data-plot>${zoomImg(src, k + 5)}<i class="tn-pen"></i></div>`).join("")}
    </div>
  </section>

  <section class="tn-quote">
    <p class="tn-recede" data-recede>${esc(d.quote).replace(/\n/g, "<br>")}</p>
  </section>

  <div class="tn-hud" aria-hidden="true">
    <span><b>TON 618</b> · Quasar</span>
    <span>Luminosity ≈ 10<sup>40</sup> W</span>
    <span class="tn-depth">Depth <b class="tn-depth-v">000.0</b>%</span>
    <div class="tn-hud-bar"><i></i></div>
  </div>
</div>`;
  }

  function init(scroller, root) {
    const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
    const $ = (s) => root.querySelector(s);
    const $$ = (s) => [...root.querySelectorAll(s)];
    const hero = $('[data-tn="hero"]'), zoom = $(".tn-zoom"), title = $(".tn-title"), sub = $(".tn-sub"), meta = $(".tn-hero-meta"), fact = $(".tn-fact");
    const power = $('[data-tn="power"]'), digits = $(".tn-number"), sun = $(".tn-sun"), exp = $(".tn-exp"), lead = $(".tn-power-lead");
    const exploded = $('[data-tn="exploded"]'), parts = $$(".tn-part"), exImg = $(".tn-ex-img");
    const recede = $$("[data-recede]"), pars = $$("[data-depth]"), plots = $$("[data-plot]");
    const depthV = $(".tn-depth-v"), hudBar = $(".tn-hud-bar i");
    let raf = 0;

    const pinned = (el) => {
      const r = el.getBoundingClientRect();
      return clamp(-r.top / Math.max(1, r.height - innerHeight), 0, 1);
    };
    const seen = (el) => {
      const r = el.getBoundingClientRect();
      return clamp(1 - (r.top - innerHeight * 0.1) / (innerHeight * 0.9), 0, 1);
    };

    function frame() {
      const vh = innerHeight;

      // hero: dive into the black sphere until there is nothing but black
      const hp = pinned(hero);
      const dive = reduce ? 0 : smooth(0.02, 0.84, hp);
      zoom.style.transform = `scale(${Math.pow(20, Math.pow(dive, 1.4)).toFixed(3)})`; // exponential: it feels like falling
      zoom.style.opacity = (1 - smooth(0.78, 0.9, hp)).toFixed(3);
      const out = smooth(0, 0.25, hp);
      title.style.transform = `translate3d(0, ${(-out * 6).toFixed(2)}vh, 0) scale(${(1 + out * 0.08).toFixed(3)})`;
      title.style.opacity = (1 - out).toFixed(3);
      sub.style.opacity = meta.style.opacity = (1 - smooth(0, 0.15, hp)).toFixed(3);
      fact.classList.toggle("on", hp > 0.86);

      // the number: 10^40 written out, sliding past at an absurd scale
      const pp = pinned(power);
      const travel = Math.max(0, digits.scrollWidth - scroller.clientWidth * 0.86);
      digits.style.transform = `translate3d(${(-smooth(0.08, 0.82, pp) * travel).toFixed(1)}px, 0, 0)`;
      lead.style.opacity = (1 - smooth(0.7, 0.85, pp) * 0.6).toFixed(3);
      sun.classList.toggle("on", pp > 0.55);
      exp.classList.toggle("on", pp > 0.8);

      // exploded view: parts are named one after another
      const ep = pinned(exploded);
      parts.forEach((el, k) => el.classList.toggle("on", ep > 0.12 + k * 0.14));
      exImg.style.transform = `scale(${(0.94 + smooth(0, 0.6, ep) * 0.06).toFixed(3)})`;

      // words recede into depth as they leave
      recede.forEach((el) => {
        const r = el.getBoundingClientRect();
        const k = clamp((vh * 0.45 - r.top) / (vh * 0.6), 0, 1);
        const kin = clamp((vh - r.top) / (vh * 0.5), 0, 1);
        el.style.transform = `perspective(900px) translate3d(0, 0, ${(-k * 420).toFixed(1)}px)`;
        el.style.opacity = (smooth(0, 1, kin) * (1 - smooth(0.2, 1, k))).toFixed(3);
      });

      // detail photographs drift at different depths
      pars.forEach((el) => {
        const r = el.getBoundingClientRect();
        const c = (r.top + r.height / 2 - vh / 2) / vh;
        el.style.transform = `translate3d(0, ${(c * parseFloat(el.dataset.depth) * 100).toFixed(2)}vh, 0)`;
      });

      // drawings plot themselves from left to right
      plots.forEach((el) => {
        const k = reduce ? 1 : smooth(0.1, 0.75, seen(el));
        el.style.setProperty("--plot", k.toFixed(4));
      });

      // HUD: how deep we are
      const sp = clamp(scroller.scrollTop / Math.max(1, scroller.scrollHeight - scroller.clientHeight), 0, 1);
      depthV.textContent = (sp * 100).toFixed(1).padStart(5, "0");
      hudBar.style.transform = `scaleX(${sp.toFixed(4)})`;

      raf = requestAnimationFrame(frame);
    }
    raf = requestAnimationFrame(frame);
    const stop = () => cancelAnimationFrame(raf);
    stop.receipt = () => `Depth ${depthV.textContent}%`;
    return stop;
  }

  window.LAYOUTS.ton618 = { render, init };
})();
