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

  function html({ vip, projects, site, esc, pad }) {
    const name = vip.name || "";
    const g = GUESTS[name.toLowerCase()] || {};
    const note = g.note || T(
      `Gracias por sentarse a esta mesa. La he preparado para ${name}: tres proyectos, un dado y ninguna prisa. Si alguno le hace clic, la siguiente mano la jugamos juntos.`,
      `Thank you for taking a seat. I set this table for ${name}: three projects, one die and no hurry. If one of them clicks, we play the next hand together.`
    );
    const order = (g.order || projects.map((_, i) => i)).filter((i) => projects[i] && !/^PROJECT 0/.test(projects[i].title)).slice(0, 3);
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
        <footer class="vt3-foot">
          <span class="vt3-hint">${T("Arrastra para rodear la mesa · Lanza el dado o elige una casilla", "Drag to walk around the table · Roll the die or pick a box")}</span>
          <a class="vt-cta" href="mailto:${esc(site.email)}?subject=${subject}">${T("Hablemos", "Let’s talk")} <span>→</span></a>
        </footer>
        <div class="vt3-note" role="dialog" aria-hidden="true">
          <div class="vt3-note-card">
            <small>${T("Para", "For")} ${esc(name)}</small>
            <p>${esc(note)}</p>
            <em>— Carlos</em>
            <button type="button" class="vt3-note-close">${T("Cerrar", "Close")} ✕</button>
          </div>
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
    // monogram in the centre
    const words = ctx.name.split(/\s+/).filter(Boolean);
    const ini = (words.length > 1 ? words.map((w) => w[0]).join("").slice(0, 3) : (words[0] || "W")[0]).toUpperCase();
    x.lineWidth = 3;
    x.beginPath(); x.arc(W / 2, H / 2 - 60, 118, 0, Math.PI * 2); x.stroke();
    x.font = `600 ${ini.length > 1 ? 120 : 150}px ${SANS}`;
    x.fillText(ini, W / 2, H / 2 - 52);
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

  const loadScript = (src) => new Promise((res) => {
    if (THREE.RoomEnvironment) return res(true);
    const s = document.createElement("script");
    s.src = src; s.onload = () => res(true); s.onerror = () => res(false);
    document.head.appendChild(s);
  });

  /* ---------- the scene ---------- */
  function init(root) {
    const vt = root.querySelector(".vt3");
    if (!vt || !window.THREE || !ctx) return () => {};
    const canvas = vt.querySelector(".vt3-gl");
    const tip = vt.querySelector(".vt3-tip");
    const noteEl = vt.querySelector(".vt3-note");
    const small = innerWidth < 860;
    let disposed = false;
    const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: "high-performance" });
    renderer.setPixelRatio(Math.min(devicePixelRatio || 1, small ? 1.6 : 2));
    renderer.outputEncoding = THREE.sRGBEncoding;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.05;
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    const aniso = renderer.capabilities.getMaxAnisotropy();

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x050506);
    scene.fog = new THREE.FogExp2(0x050506, 0.075);
    const camera = new THREE.PerspectiveCamera(small ? 44 : 30, 1, 0.05, 60);

    // light: one lamp above the table, the room in darkness
    const lamp = new THREE.SpotLight(0xfff1d6, 3.1, 0, 0.62, 0.85, 1.2);
    lamp.position.set(0, 7.5, 0.4);
    lamp.target.position.set(0, 0, 0);
    lamp.castShadow = true;
    lamp.shadow.mapSize.set(small ? 1024 : 2048, small ? 1024 : 2048);
    lamp.shadow.bias = -0.0004;
    lamp.shadow.radius = 4;
    scene.add(lamp, lamp.target);
    scene.add(new THREE.AmbientLight(0x8fb0a0, 0.05));
    const fill = new THREE.PointLight(0xffe2b0, 0.35, 12, 2);
    fill.position.set(0, 1.4, 4.6);
    scene.add(fill);

    const pmrem = new THREE.PMREMGenerator(renderer);
    loadScript(ENV_URL).then((ok) => {
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
    const felt = new THREE.Mesh(normUV(new THREE.ShapeGeometry(ellipse(FA, FB), 160), FA, FB), new THREE.MeshPhysicalMaterial({
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
      new THREE.MeshPhysicalMaterial({
        color: 0x150805, roughness: 0.55, metalness: 0,
        normalMap: tex("assets/table/leather_n.jpg", false, 90, 2), normalScale: new THREE.Vector2(0.55, 0.55),
        clearcoat: 0.12, clearcoatRoughness: 0.5, envMapIntensity: 0.1,
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
    const bead = new THREE.Mesh(new THREE.TubeGeometry(new Oval(A + 0.405, B + 0.405, 0.1), 420, 0.014, 10, true), brass);
    bead.castShadow = true;
    scene.add(bead);
    const inlay = new THREE.Mesh(new THREE.TubeGeometry(new Oval(A + 0.68, B + 0.68, 0.1), 420, 0.007, 6, true), brass);
    scene.add(inlay);

    // lacquered wood: the drink ledge and the body of the table
    const woodMat = (dark) => new THREE.MeshPhysicalMaterial({
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

    // chips: stacks of black and ivory, their name on the gold ones
    const chipGeo = new THREE.CylinderGeometry(0.2, 0.2, 0.036, 64, 1);
    const chipMats = (base, insert, label) => {
      const side = new THREE.MeshPhysicalMaterial({ map: canvasTex(chipSide(base, insert)), roughness: 0.4, clearcoat: 0.5, clearcoatRoughness: 0.3, envMapIntensity: 0.3 });
      const top = new THREE.MeshPhysicalMaterial({ map: canvasTex(chipTop(base, insert, label)), roughness: 0.36, clearcoat: 0.6, clearcoatRoughness: 0.25, envMapIntensity: 0.3 });
      return [side, top, top];
    };
    const kinds = [chipMats("#0d0d0e", "#d8b56f", ctx.name.toUpperCase()), chipMats("#e9e4d8", "#0d0d0e", "woblo"), chipMats("#0d0d0e", "#8c7444", "1000")];
    const stack = (x, z, n, kind) => {
      const g = new THREE.Group();
      for (let k = 0; k < n; k++) {
        const m = new THREE.Mesh(chipGeo, kinds[kind]);
        m.position.set((Math.random() - 0.5) * 0.012, 0.018 + k * 0.037, (Math.random() - 0.5) * 0.012);
        m.rotation.y = Math.random() * Math.PI * 2;
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
    // one chip lying on the first bet
    const bet = new THREE.Mesh(chipGeo, kinds[0]);
    const b0 = toWorld(boxes[0].x + boxes[0].w * 0.82, boxes[0].y + boxes[0].h * 0.2);
    bet.position.set(b0.x, 0.019, b0.z); bet.rotation.y = 0.7;
    bet.castShadow = true;
    scene.add(bet);

    // the face-down card
    const cardMat = new THREE.MeshPhysicalMaterial({ map: canvasTex(cardBack()), roughness: 0.4, clearcoat: 0.4 });
    const edge = new THREE.MeshStandardMaterial({ color: 0xf1ede2, roughness: 0.6 });
    const card = new THREE.Mesh(new THREE.BoxGeometry(0.44, 0.004, 0.62), [edge, edge, cardMat, edge, edge, edge]);
    card.position.set(0.15, 0.004, -0.95);
    card.rotation.y = -0.32;
    card.castShadow = card.receiveShadow = true;
    scene.add(card);
    contacts.push([bet.position.x, bet.position.z, 0.26, 0.4], [card.position.x, card.position.z, 0.42, 0.35]);

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
    const plaqueMat = new THREE.MeshPhysicalMaterial({ map: canvasTex(plaqueFace(ctx.name)), roughness: 0.3, clearcoat: 1, clearcoatRoughness: 0.08, envMapIntensity: 0.3 });
    const black = new THREE.MeshPhysicalMaterial({ color: 0x020202, roughness: 0.6, clearcoat: 0, envMapIntensity: 0.02 });
    const plaqueGeo = new THREE.BoxGeometry(0.62, 0.22, 0.05);
    [[1.25, 1.02, 0], [-1.25, -1.02, Math.PI]].forEach(([x, z, ry]) => {
      const m = new THREE.Mesh(plaqueGeo, [black, black, black, black, plaqueMat, plaqueMat]); // printed on both faces: never a blank back
      m.position.set(x, 0.115, z);
      m.rotation.set(ry ? 0.22 : -0.22, ry, 0, "YXZ");
      m.castShadow = true;
      scene.add(m);
    });

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
    const die = new THREE.Mesh(dieGeo, FACE_VAL.map((n) => new THREE.MeshPhysicalMaterial({
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
    const DUST = small ? 160 : 320;
    const dustPos = new Float32Array(DUST * 3), dustSeed = new Float32Array(DUST);
    for (let k = 0; k < DUST; k++) {
      const r = Math.sqrt(Math.random()) * 2.6, a = Math.random() * Math.PI * 2;
      dustPos.set([Math.cos(a) * r, 0.2 + Math.random() * 3.2, Math.sin(a) * r * 0.7], k * 3);
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
      map: dustTex, size: 0.022, sizeAttenuation: true, transparent: true, opacity: 0.55,
      depthWrite: false, blending: THREE.AdditiveBlending, toneMapped: false, fog: true,
    }));
    scene.add(dust);
    const stepDust = (t, dt) => {
      for (let k = 0; k < DUST; k++) {
        const i = k * 3, s = dustSeed[k];
        dustPos[i] += Math.sin(t * 0.21 + s) * dt * 0.02;
        dustPos[i + 2] += Math.cos(t * 0.17 + s * 1.3) * dt * 0.02;
        dustPos[i + 1] += (Math.sin(t * 0.3 + s) * 0.5 + 0.15) * dt * 0.03;
        if (dustPos[i + 1] > 3.4) dustPos[i + 1] = 0.2;
      }
      dustGeo.attributes.position.needsUpdate = true;
    };
    const roll = { on: false, t: 0, dur: 1.7, p0: new THREE.Vector3(), p1: new THREE.Vector3(), q1: new THREE.Quaternion(), axis: new THREE.Vector3(), spins: 0, val: 0 };
    let chosen = -1;
    const WORDS = T(["Uno", "Dos", "Tres", "Cuatro", "Cinco", "Seis"], ["One", "Two", "Three", "Four", "Five", "Six"]);
    function throwDie() {
      if (roll.on) return;
      chosen = -1;
      roll.on = true; roll.t = 0;
      roll.p0.copy(die.position);
      // land somewhere free: between the monogram and the bets
      let x, z;
      do { x = (Math.random() * 2 - 1) * 1.5; z = -0.55 + Math.random() * 0.45; } while (Math.abs(x - die.position.x) < 0.6);
      roll.p1.set(x, DS / 2, z);
      roll.val = 1 + Math.floor(Math.random() * 6);
      roll.q1.copy(restQ(roll.val, Math.random() * Math.PI * 2));
      roll.axis.set(z - roll.p0.z, 0, -(x - roll.p0.x)).normalize(); // it tumbles in the direction it travels
      if (roll.axis.lengthSq() < 0.01) roll.axis.set(1, 0, 0);
      roll.spins = 2 + Math.floor(Math.random() * 2);
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
      tmpQ.setFromAxisAngle(roll.axis, (1 - e) * roll.spins * Math.PI * 2);
      die.quaternion.copy(tmpQ).multiply(roll.q1);
      if (t >= 1) {
        roll.on = false;
        chosen = (roll.val - 1) % boxes.length;
        const b = boxes[chosen];
        setTip(`${WORDS[roll.val - 1]}. ${b.title} — ${T("apostar", "place your bet")} →`);
      }
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
      if (ray.intersectObject(card, false).length) return { card: true };
      const hit = ray.intersectObject(felt, false)[0];
      if (!hit) return {};
      const px = (hit.point.x / (2 * A) + 0.5) * pw, py = (hit.point.z / (2 * B) + 0.5) * ph;
      return { box: boxes.findIndex((b) => px > b.x && px < b.x + b.w && py > b.y && py < b.y + b.h) };
    };
    const setTip = (txt) => { tip.textContent = txt || ""; tip.classList.toggle("on", !!txt); };

    const down = (e) => {
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
        view.th += view.vth;
        view.h = Math.min(H_MAX, Math.max(0.24, view.h + dy * 0.003));
        view.x0 = e.clientX; view.y0 = e.clientY;
        return;
      }
      if (roll.on) return;
      if (e.target !== canvas) { hoverBox = -1; if (chosen < 0) setTip(""); return; }
      const p = pick(e);
      hoverBox = p.box != null ? p.box : -1;
      canvas.classList.toggle("is-link", hoverBox >= 0 || !!p.card || !!p.die);
      if (hoverBox >= 0) { const b = boxes[hoverBox]; setTip(`${b.n} · ${b.title} — ${T("apostar", "place your bet")} →`); }
      else if (p.die) setTip(T("Lance el dado", "Roll the die"));
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
      if (p.die) { throwDie(); return; }
      if (p.card) { noteEl.classList.add("on"); noteEl.setAttribute("aria-hidden", "false"); return; }
      if (p.box != null && p.box >= 0) {
        const btn = vt.querySelector(`[data-next="${boxes[p.box].i}"]`);
        if (btn) btn.click();
      }
    };
    canvas.addEventListener("pointerdown", down);
    addEventListener("pointermove", move);
    addEventListener("pointerup", up);
    noteEl.addEventListener("click", (e) => {
      if (e.target === noteEl || e.target.closest(".vt3-note-close")) { noteEl.classList.remove("on"); noteEl.setAttribute("aria-hidden", "true"); }
    });

    const R = portrait ? 8.4 : small ? 6.6 : 7.4;
    let last = performance.now();
    const target = new THREE.Vector3(0, portrait ? 0.15 : small ? -0.1 : 0.32, 0);
    const frame = (now) => {
      const dt = Math.min(0.05, (now - last) / 1000); last = now;
      if (!view.drag) { view.vth *= Math.pow(0.04, dt); view.th += view.vth + dt * 0.045; }
      const th = view.th + rx * 0.08;
      const h = view.h - ry * 0.12;
      camera.position.set(Math.cos(th) * R, h, Math.sin(th) * R * 0.86);
      camera.lookAt(target);
      stepDie(dt);
      {
        const hgt = Math.max(0, die.position.y - DS / 2);
        dieAO.position.set(die.position.x, 0.0015, die.position.z);
        dieAO.scale.setScalar(1 + hgt * 1.6);
        dieAO.material.opacity = 0.85 / (1 + hgt * 9);
      }
      stepDust(now / 1000, dt);
      glows.forEach((g, k) => {
        const want = k === hoverBox ? 0.16 : k === chosen ? 0.1 + Math.sin(now / 260) * 0.04 : 0;
        g.material.opacity += (want - g.material.opacity) * Math.min(1, dt * 8);
      });
      renderer.render(scene, camera);
      raf = requestAnimationFrame(frame);
    };
    raf = requestAnimationFrame(frame);
    window.__vt = { scene, camera, view, renderer, throwDie, roll };

    return () => {
      disposed = true;
      cancelAnimationFrame(raf);
      removeEventListener("resize", resize);
      removeEventListener("pointermove", move);
      removeEventListener("pointerup", up);
      scene.traverse((o) => {
        if (o.geometry) o.geometry.dispose();
        const ms = o.material ? (Array.isArray(o.material) ? o.material : [o.material]) : [];
        ms.forEach((m) => { Object.values(m).forEach((v) => v && v.isTexture && v.dispose()); m.dispose(); });
      });
      if (scene.environment) scene.environment.dispose();
      pmrem.dispose();
      renderer.dispose();
      renderer.forceContextLoss();
      window.__vt = null;
    };
  }

  window.VIP_TABLE = { html, init };
})();
