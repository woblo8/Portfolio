/* ============================================================
   SIDE A — a case study you listen to.
   The page is a session: a player at the bottom plays as you
   scroll, a record slides out of its sleeve, the statement lights
   up like synced lyrics, the sessions roll by, and the focus timer
   counts down until "Built."
   ============================================================ */
(() => {
  "use strict";
  window.LAYOUTS = window.LAYOUTS || {};

  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const smooth = (a, b, t) => { const x = clamp((t - a) / (b - a), 0, 1); return x * x * (3 - 2 * x); };
  const mmss = (s) => { s = Math.max(0, Math.round(s)); const m = Math.floor(s / 60); return `${String(m).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`; };
  const hhmmss = (s) => { s = Math.max(0, Math.round(s)); const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60); return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`; };

  function render(p, i, h) {
    const { esc, pad } = h;
    const d = p.sidea;
    const base = p.folder;
    const scr = (f) => `${base}/screens/${f}`;
    const cov = (f) => `${base}/covers/${f}`;
    const words = (txt) => esc(txt).split(" ").map((w) => `<span class="w">${w}</span>`).join(" ");
    const shot = (f, cap, cls = "") =>
      `<figure class="sa-frame ${cls}" data-zoom><img src="${scr(f)}" alt="${esc(cap)}" data-cap="${esc(cap)}" loading="lazy"></figure>`;
    let track = 0;
    const T = () => `data-track="${track++}"`;

    return `
<div class="sa">
  <section class="sa-hero" ${T()}>
    <div class="sa-hero-meta"><b>PROJECT ${pad(i)}</b><span>/</span><span>${esc(p.category)}</span><span>/</span><span>${esc(p.year)}</span></div>
    <h1 class="sa-title" aria-label="${esc(p.title)}"><span>SIDE</span><span>A</span></h1>
    <p class="sa-tag">${esc(p.intro)}</p>
    <div class="sa-record" aria-hidden="true">
      <div class="sa-vinyl"><div class="sa-disc"><div class="sa-label"><span>SIDE A</span><i></i><span>33⅓ RPM</span></div></div><div class="sa-sheen"></div></div>
      <div class="sa-sleeve"><img src="${cov(d.covers[0].file)}" alt=""><span>QUIET AMBITION · VOL. 01</span></div>
    </div>
    <dl class="sa-facts">
      <div><dt>Role</dt><dd>${esc(p.role)}</dd></div>
      <div><dt>Discipline</dt><dd>${p.tags.map(esc).join(" / ")}</dd></div>
      <div><dt>Year</dt><dd>${esc(p.year)}</dd></div>
    </dl>
  </section>

  <section class="sa-lyrics" data-sa="lyrics" ${T()}>
    <div class="sa-sticky">
      <span class="sa-kicker">Track 01 — Intention</span>
      <p class="sa-lyric">${words(d.statement)}</p>
      <p class="sa-story">${esc(d.story)}</p>
    </div>
  </section>

  ${d.chapters.map((c, k) => `
  <section class="sa-chapter ${c.screens ? "is-pair" : ""}" ${T()}>
    <header class="sa-chapter-head r">
      <span class="sa-kicker">Track ${String(k + 2).padStart(2, "0")} — ${esc(c.kicker)}</span>
      <h2>${esc(c.title)}</h2>
      <p>${esc(c.text)}</p>
    </header>
    <div class="sa-chapter-media r" data-rise>
      ${c.screens ? c.screens.map((f) => shot(f, c.caption)).join("") : shot(c.screen, c.caption, "is-hero")}
    </div>
  </section>
  ${k === 0 ? `
  <section class="sa-covers" data-sa="covers" ${T()}>
    <div class="sa-sticky">
      <header class="sa-covers-head">
        <span class="sa-kicker">Interlude — Sessions</span>
        <h2>Diez sesiones.<br>Diez bodegones.</h2>
        <p>Cada portada es un retrato de quien escucha: el coche, el reloj, el café. Blanco, negro y nada más.</p>
      </header>
      <div class="sa-track">
        ${d.covers.map((c, n) => `
        <article class="sa-cover">
          <figure data-zoom><img src="${cov(c.file)}" alt="${esc(c.title)}" data-cap="${esc(c.title)} — ${esc(c.line)}" loading="lazy"><span class="sa-time">${esc(c.time)}</span></figure>
          <span class="sa-cover-n">${String(n + 1).padStart(2, "0")}</span>
          <h3>${esc(c.title)}.</h3>
          <p>${esc(c.line)}</p>
          <small>${esc(c.genre)}</small>
        </article>`).join("")}
      </div>
      <div class="sa-covers-bar"><i></i></div>
    </div>
  </section>` : ""}`).join("")}

  <section class="sa-focus" data-sa="focus" ${T()}>
    <div class="sa-sticky">
      <span class="sa-kicker">Track ${String(d.chapters.length + 2).padStart(2, "0")} — Focus</span>
      <div class="sa-dial">
        <div class="sa-orbit o1"></div><div class="sa-orbit o2"></div><div class="sa-orbit o3"></div>
        <svg class="sa-ring" viewBox="0 0 200 200" aria-hidden="true">
          <circle cx="100" cy="100" r="96" class="sa-ring-bg"/>
          <circle cx="100" cy="100" r="96" class="sa-ring-fg"/>
        </svg>
        <div class="sa-face">
          <span>UNTIL ${esc(d.focus.until)}</span>
          <b class="sa-clock">${hhmmss(d.focus.seconds)}</b>
          <span>TIME REMAINING</span>
        </div>
        <div class="sa-built"><b>Built.</b><span>3 SESSIONS · 2 H 14 MIN</span></div>
      </div>
      <p class="sa-focus-line">${esc(d.focus.line)} <em>${esc(d.focus.sub)}</em></p>
    </div>
  </section>

  <section class="sa-chapter is-pair" ${T()}>
    <div class="sa-chapter-media r" data-rise>
      ${d.focus.screens.map((f) => shot(f, d.focus.caption)).join("")}
    </div>
  </section>

  <section class="sa-mobile" ${T()}>
    <header class="sa-chapter-head r">
      <span class="sa-kicker">Track ${String(d.chapters.length + 3).padStart(2, "0")} — Mobile</span>
      <h2>La misma calma, en el bolsillo.</h2>
    </header>
    <div class="sa-phones">
      ${d.mobile.map((f, k) => `<figure class="sa-phone r" data-zoom style="--k:${k}"><img src="${scr(f)}" alt="SIDE A mobile ${k + 1}" data-cap="SIDE A — móvil" loading="lazy"></figure>`).join("")}
    </div>
  </section>

  <section class="sa-outro" ${T()}>
    <p class="sa-outro-line">${esc(d.outro).replace(/\n/g, "<br>")}</p>
  </section>

  <div class="sa-player" role="group" aria-label="Session player">
    <img class="sa-player-cover" src="${cov(d.covers[0].file)}" alt="">
    <div class="sa-player-now"><b class="sa-np-title">${esc(d.tracks[0][0])}</b><span class="sa-np-artist">${esc(d.tracks[0][1])} · Quiet Ambition</span></div>
    <button class="sa-play" aria-label="Pause"><i></i><i></i></button>
    <div class="sa-progress"><span class="sa-t0">00:00</span><div class="sa-bar"><i></i></div><span>58:42</span></div>
    <span class="sa-np-count">Track 01 of 12</span>
  </div>
</div>`;
  }

  function init(scroller, root, h) {
    const d = h.project.sidea;
    const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
    const $ = (s) => root.querySelector(s);
    const hero = $(".sa-hero"), record = $(".sa-record"), vinyl = $(".sa-vinyl"), disc = $(".sa-disc"), sleeve = $(".sa-sleeve");
    const title = $(".sa-title");
    const lyrics = $('[data-sa="lyrics"]'), lyricWords = [...root.querySelectorAll(".sa-lyric .w")], story = $(".sa-story");
    const covers = $('[data-sa="covers"]'), track = $(".sa-track"), coversBar = $(".sa-covers-bar i");
    const focus = $('[data-sa="focus"]'), clock = $(".sa-clock"), ringFg = $(".sa-ring-fg"), dial = $(".sa-dial"), focusLine = $(".sa-focus-line");
    const rises = [...root.querySelectorAll("[data-rise]")];
    const sections = [...root.querySelectorAll("[data-track]")];
    const npTitle = $(".sa-np-title"), npArtist = $(".sa-np-artist"), npCount = $(".sa-np-count"), t0 = $(".sa-t0"), bar = $(".sa-bar i"), playBtn = $(".sa-play");
    const RING = 2 * Math.PI * 96;
    ringFg.style.strokeDasharray = `${RING}`;

    let playing = true, angle = 0, last = performance.now(), raf = 0, current = -1;
    playBtn.addEventListener("click", () => {
      playing = !playing;
      root.classList.toggle("is-paused", !playing);
      playBtn.setAttribute("aria-label", playing ? "Pause" : "Play");
    });

    // progress of a pinned (sticky) section: 0 when it reaches the top, 1 when it leaves
    const pinned = (el) => {
      const r = el.getBoundingClientRect();
      return clamp(-r.top / Math.max(1, r.height - innerHeight), 0, 1);
    };

    function frame(now) {
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      const vh = innerHeight;
      if (playing && !reduce) angle += dt * 42; // a slow, constant spin

      // hero: the record slides out of its sleeve as you start scrolling
      const hr = hero.getBoundingClientRect();
      const hp = clamp(-hr.top / (hr.height * 0.55), 0, 1);
      const out = 0.3 + smooth(0, 1, hp) * 0.36;
      vinyl.style.transform = `translate3d(${(out * 100).toFixed(2)}%, 0, 0)`;
      disc.style.transform = `rotate(${(angle + hp * 240).toFixed(2)}deg)`;
      record.style.transform = `translate3d(0, ${(-hp * 8).toFixed(2)}vh, 0)`;
      sleeve.style.transform = `rotate(${(-hp * 2.5).toFixed(2)}deg)`;
      title.style.transform = `translate3d(0, ${(hp * 6).toFixed(2)}vh, 0)`;
      title.style.opacity = (1 - hp * 0.6).toFixed(3);

      // the statement lights up word by word, like synced lyrics
      const lp = pinned(lyrics);
      const lit = Math.floor(smooth(0.05, 0.75, lp) * (lyricWords.length + 0.999));
      lyricWords.forEach((w, k) => w.classList.toggle("on", k < lit));
      story.style.opacity = smooth(0.7, 0.9, lp).toFixed(3);
      story.style.transform = `translate3d(0, ${((1 - smooth(0.7, 0.9, lp)) * 20).toFixed(1)}px, 0)`;

      // sessions roll by horizontally while the section is pinned
      const cp = pinned(covers);
      const travel = Math.max(0, track.scrollWidth - scroller.clientWidth);
      track.style.transform = `translate3d(${(-smooth(0.04, 0.96, cp) * travel).toFixed(1)}px, 0, 0)`;
      coversBar.style.transform = `scaleX(${cp.toFixed(3)})`;

      // focus: the timer counts down with the scroll, then everything resolves into "Built."
      const fp = pinned(focus);
      const run = smooth(0.06, 0.66, fp);
      const remain = d.focus.seconds * (1 - run);
      clock.textContent = hhmmss(remain);
      ringFg.style.strokeDashoffset = `${(RING * run).toFixed(1)}`;
      dial.classList.toggle("is-built", fp > 0.72);
      focusLine.classList.toggle("on", fp > 0.8);

      // screens rise and settle as they enter
      rises.forEach((el) => {
        const r = el.getBoundingClientRect();
        const k = clamp(1 - (r.top - vh * 0.15) / (vh * 0.85), 0, 1);
        el.style.setProperty("--rise", smooth(0, 1, k).toFixed(3));
      });

      // the player: the page is the session
      const sp = clamp(scroller.scrollTop / Math.max(1, scroller.scrollHeight - scroller.clientHeight), 0, 1);
      t0.textContent = mmss(sp * 3522);
      bar.style.transform = `scaleX(${sp.toFixed(4)})`;
      let idx = 0;
      sections.forEach((s, k) => { if (s.getBoundingClientRect().top < vh * 0.55) idx = k; });
      if (idx !== current) {
        current = idx;
        const tr = d.tracks[idx % d.tracks.length];
        npTitle.textContent = tr[0];
        npArtist.textContent = `${tr[1]} · Quiet Ambition`;
        npCount.textContent = `Track ${String(idx + 1).padStart(2, "0")} of 12`;
        npTitle.parentElement.classList.remove("swap");
        void npTitle.offsetWidth;
        npTitle.parentElement.classList.add("swap");
      }

      raf = requestAnimationFrame(frame);
    }
    raf = requestAnimationFrame(frame);
    return () => cancelAnimationFrame(raf);
  }

  window.LAYOUTS.sidea = { render, init };
})();
