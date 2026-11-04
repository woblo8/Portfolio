/* ============================================================
   VIP — the private table.
   A link like woblo.io/?vip=Studio puts a gold chip with that name
   in the index. The chip opens this: a green felt table set for them.

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


  function html({ vip, projects, site, esc, pad }) {
    const name = vip.name || "";
    const g = GUESTS[name.toLowerCase()] || {};
    const note = g.note || T(
      `Gracias por sentarse a esta mesa. La he preparado para ${name}: tres proyectos, un dado y ninguna prisa. Si alguno le hace clic, la siguiente mano la jugamos juntos.`,
      `Thank you for taking a seat. I set this table for ${name}: three projects, one die and no hurry. If one of them clicks, we play the next hand together.`
    );
    const order = (g.order || projects.map((_, i) => i)).filter((i) => projects[i] && !/^PROJECT 0/.test(projects[i].title)).slice(0, 3);
    const N = esc(name.toUpperCase());
    const arc = `WOBLO.IO · ${T("MESA PRIVADA", "PRIVATE TABLE")} · ${N}`;
    const subject = encodeURIComponent(T(`Mesa privada · ${name}`, `Private table · ${name}`));
    const chips = Array.from({ length: 5 }, (_, k) => `<i style="--k:${k}"></i>`).join("");
    return `
      <section class="vt">
        <div class="vt-lamp" aria-hidden="true"></div>
        <div class="vt-felt" aria-hidden="true">
          <svg class="vt-marks" viewBox="0 0 1000 560" preserveAspectRatio="none">
            <ellipse cx="500" cy="280" rx="470" ry="250" class="m-rail"/>
            <ellipse cx="500" cy="280" rx="452" ry="234" class="m-rail2"/>
            <path id="vtArc" d="M270,334 A260,42 0 0 0 730,334" fill="none"/>
            <text class="m-arc"><textPath href="#vtArc" startOffset="50%" text-anchor="middle">${arc}</textPath></text>
            
          </svg>
        </div>

        <div class="vt-plaque r" aria-hidden="true"><span>${T("Reservado", "Reserved")}</span><b>${N}</b></div>

        <header class="vt-head r">
          <span class="vt-k">${T("Mesa privada", "Private table")} · Nº ${String((name.length * 7) % 90 + 10)}</span>
          <h1>${T("Bienvenidos", "Welcome")},<br><em>${esc(name)}.</em></h1>
          <p>${T("La mesa es suya. Elija dónde apostar.", "The table is yours. Place your bet.")}</p>
        </header>

        <div class="vt-boxes r">
          ${order.map((i) => {
            const p = projects[i];
            return `<button class="vt-box" data-next="${i}">
              <span class="vt-n">${pad(i)}</span>
              <b>${esc(p.title)}</b>
              <small>${esc(p.category)} · ${esc(p.year)}</small>
              <span class="vt-go">${T("Apostar", "Bet")} →</span>
            </button>`;
          }).join("")}
        </div>

        <div class="vt-bottom r">
          <button class="vt-card" type="button" aria-label="${T("Abrir la nota", "Open the note")}">
            <span class="vt-card-in">
              <span class="vt-card-back"><i>♠</i><small>${T("Una nota para", "A note for")} ${esc(name)}</small></span>
              <span class="vt-card-front"><small>${T("Para", "For")} ${esc(name)}</small><p>${esc(note)}</p><em>— Carlos</em></span>
            </span>
          </button>

          <div class="vt-stack">
            <div class="vt-chips" aria-hidden="true">${chips}<span>${N.slice(0, 10)}</span></div>
            <a class="vt-cta" href="mailto:${esc(site.email)}?subject=${subject}">${T("Hablemos", "Let’s talk")} <span>→</span></a>
            <small>${T("La casa invita", "On the house")}</small>
          </div>
        </div>
      </section>`;
  }

  function init(root) {
    const card = root.querySelector(".vt-card");
    if (card) card.addEventListener("click", () => card.classList.toggle("is-open"));
    const vt = root.querySelector(".vt");
    if (!vt) return;
    // the lamp follows the guest, a little
    const move = (e) => {
      const r = vt.getBoundingClientRect();
      vt.style.setProperty("--lx", `${(((e.clientX - r.left) / r.width) * 100).toFixed(1)}%`);
      vt.style.setProperty("--ly", `${(((e.clientY - r.top) / r.height) * 100).toFixed(1)}%`);
    };
    vt.addEventListener("pointermove", move);
  }

  window.VIP_TABLE = { html, init };
})();
