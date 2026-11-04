/* ============================================================
   THE OBJECT — dado escultórico interactivo
   Física de lanzamiento + lock-in coreografiado + transiciones.
   ============================================================ */
(() => {
  "use strict";

  const SITE = window.PORTFOLIO;
  const P = window.PROJECTS;
  const $ = (s, r = document) => r.querySelector(s);
  const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const V3 = THREE.Vector3, Q = THREE.Quaternion;
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const lerp = (a, b, t) => a + (b - a) * t;
  const damp = (a, b, k, dt) => lerp(a, b, 1 - Math.exp(-k * dt));
  const easeInOut = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
  const easeOut = (t) => 1 - Math.pow(1 - t, 3);
  const easeOutQuint = (t) => 1 - Math.pow(1 - t, 5);
  const smooth = (a, b, t) => { const x = clamp((t - a) / (b - a), 0, 1); return x * x * (3 - 2 * x); };
  const pad = (n) => String(n + 1).padStart(2, "0");
  const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));

  /* ---------- static text ---------- */
  $("#brandName").textContent = SITE.name;
  $("#brandRole").textContent = SITE.role;
  $("#tagline").textContent = SITE.tagline;

  /* ---------- renderer / scene ---------- */
  const canvas = $("#gl");
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: "high-performance" });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.outputEncoding = THREE.sRGBEncoding;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.0;

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x050506);
  const camera = new THREE.PerspectiveCamera(30, 1, 0.1, 100);
  const CAM_Y = 0.55;
  let baseZ = 9;

  // Studio environment: black room with a few controlled softboxes.
  (function buildEnvironment() {
    const env = new THREE.Scene();
    env.add(new THREE.Mesh(
      new THREE.BoxGeometry(30, 30, 30),
      new THREE.MeshBasicMaterial({ color: 0x030303, side: THREE.BackSide })
    ));
    const panel = (w, h, x, y, z, i) => {
      const m = new THREE.Mesh(
        new THREE.PlaneGeometry(w, h),
        new THREE.MeshBasicMaterial({ color: new THREE.Color(i, i, i), side: THREE.DoubleSide })
      );
      m.position.set(x, y, z);
      m.lookAt(0, 0, 0);
      env.add(m);
    };
    panel(12, 1.4, 0, 10, 1, 5);       // overhead strip — the raking white light
    panel(1.6, 10, -11, 1.5, 4, 2.2);  // left softbox
    panel(0.5, 8, 11, 0.5, -3, 3.4);   // right rim strip
    panel(14, 0.6, 0, -4, 10, 0.6);    // faint front fill
    const pm = new THREE.PMREMGenerator(renderer);
    scene.environment = pm.fromScene(env, 0.03).texture;
    pm.dispose();
  })();

  const key = new THREE.DirectionalLight(0xffffff, 0);
  key.position.set(-3, 6, 4);
  const rim = new THREE.DirectionalLight(0xffffff, 0);
  rim.position.set(5, 1, -6);
  scene.add(key, rim);
  const LIGHT = { key: 1.6, rim: 2.2 };

  /* ---------- geometry: precise rounded cube ---------- */
  const SIZE = 2, RADIUS = 0.15;

  function roundedBox(size, r, k = 10, inner = 2) {
    const N = 2 * k + inner;
    const g = new THREE.BoxGeometry(size, size, size, N, N, N);
    const pos = g.attributes.position, nor = g.attributes.normal, uv = g.attributes.uv;
    const s2 = size / 2, h = s2 - r, step = size / N;
    // concentrate vertices in the bevel band
    const remap = (a) => {
      const i = Math.round((a + s2) / step);
      if (i <= k) return -s2 + (i / k) * r;
      if (i >= N - k) return h + ((i - (N - k)) / k) * r;
      return -h + ((i - k) / inner) * (2 * h);
    };
    const v = new V3(), c = new V3(), n = new V3(), on = new V3();
    for (let i = 0; i < pos.count; i++) {
      v.fromBufferAttribute(pos, i);
      on.fromBufferAttribute(nor, i);
      v.set(remap(v.x), remap(v.y), remap(v.z));
      let u, w;
      if (on.x > 0.5) { u = (-v.z + s2) / size; w = (v.y + s2) / size; }
      else if (on.x < -0.5) { u = (v.z + s2) / size; w = (v.y + s2) / size; }
      else if (on.y > 0.5) { u = (v.x + s2) / size; w = (-v.z + s2) / size; }
      else if (on.y < -0.5) { u = (v.x + s2) / size; w = (v.z + s2) / size; }
      else if (on.z > 0.5) { u = (v.x + s2) / size; w = (v.y + s2) / size; }
      else { u = (-v.x + s2) / size; w = (v.y + s2) / size; }
      uv.setXY(i, u, w);
      c.set(clamp(v.x, -h, h), clamp(v.y, -h, h), clamp(v.z, -h, h));
      n.subVectors(v, c).normalize();
      v.copy(c).addScaledVector(n, r);
      pos.setXYZ(i, v.x, v.y, v.z);
      nor.setXYZ(i, n.x, n.y, n.z);
    }
    return g;
  }

  // BoxGeometry material order: +x, -x, +y, -y, +z, -z  (with the "up" of each texture)
  const FACES = [
    { n: new V3(1, 0, 0), up: new V3(0, 1, 0) },
    { n: new V3(-1, 0, 0), up: new V3(0, 1, 0) },
    { n: new V3(0, 1, 0), up: new V3(0, 0, -1) },
    { n: new V3(0, -1, 0), up: new V3(0, 0, 1) },
    { n: new V3(0, 0, 1), up: new V3(0, 1, 0) },
    { n: new V3(0, 0, -1), up: new V3(0, 1, 0) },
  ];
  // orientation that brings a face to the camera, upright
  FACES.forEach((f) => {
    const r = new V3().crossVectors(f.up, f.n);
    const m = new THREE.Matrix4().makeBasis(r, f.up, f.n).transpose();
    f.q = new Q().setFromRotationMatrix(m);
  });
  const PROJECT_FACE = [4, 0, 2, 3, 1, 5]; // project index -> face index (01 front, 06 back)
  const FACE_PROJECT = [];
  PROJECT_FACE.forEach((f, p) => (FACE_PROJECT[f] = p));

  /* ---------- face textures (drawn, engraved, glowing) ---------- */
  const TEX = 1024;
  const noise = (() => {
    const c = document.createElement("canvas");
    c.width = c.height = 256;
    const x = c.getContext("2d");
    const d = x.createImageData(256, 256);
    for (let i = 0; i < d.data.length; i += 4) {
      const v = Math.random() * 255;
      d.data[i] = d.data[i + 1] = d.data[i + 2] = v;
      d.data[i + 3] = 255;
    }
    x.putImageData(d, 0, 0);
    return c;
  })();

  function rr(ctx, x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
  }

  function motif(ctx, kind, cx, cy, s) {
    ctx.save();
    ctx.lineWidth = 2;
    ctx.strokeStyle = "#fff";
    ctx.fillStyle = "#fff";
    if (kind === "cross") {
      ctx.globalAlpha = 0.9;
      ctx.beginPath(); ctx.arc(cx, cy, s * 0.62, 0, Math.PI * 2); ctx.stroke();
      ctx.globalAlpha = 0.5;
      ctx.beginPath(); ctx.moveTo(cx - s, cy); ctx.lineTo(cx + s, cy); ctx.moveTo(cx, cy - s); ctx.lineTo(cx, cy + s); ctx.stroke();
      ctx.globalAlpha = 1;
      ctx.fillRect(cx - 5, cy - 5, 10, 10);
    } else if (kind === "rings") {
      for (let i = 0; i < 6; i++) {
        ctx.globalAlpha = 0.9 - i * 0.14;
        ctx.beginPath(); ctx.arc(cx, cy, s * 0.22 + i * s * 0.13, 0, Math.PI * 2); ctx.stroke();
      }
      ctx.globalAlpha = 0.75;
      ctx.beginPath(); ctx.ellipse(cx, cy, s * 1.15, s * 0.12, -0.18, 0, Math.PI * 2); ctx.stroke();
    } else if (kind === "grid") {
      const n = 5, g = (s * 1.6) / (n - 1);
      for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) {
        ctx.globalAlpha = 0.65;
        ctx.beginPath(); ctx.arc(cx - s * 0.8 + i * g, cy - s * 0.8 + j * g, 3.2, 0, Math.PI * 2); ctx.fill();
      }
      ctx.globalAlpha = 1;
      ctx.strokeRect(cx - s * 0.8 + g - 16, cy - s * 0.8 + g - 16, g * 2 + 32, g + 32);
    } else if (kind === "cube") {
      const a = s * 0.62, d = s * 0.36;
      ctx.globalAlpha = 0.9;
      ctx.strokeRect(cx - a - d / 2, cy - a + d / 2, a * 2, a * 2);
      ctx.globalAlpha = 0.45;
      ctx.strokeRect(cx - a + d / 2, cy - a - d / 2, a * 2, a * 2);
      ctx.beginPath();
      [[-1, -1], [1, -1], [1, 1], [-1, 1]].forEach(([x, y]) => {
        ctx.moveTo(cx + x * a - d / 2, cy + y * a + d / 2);
        ctx.lineTo(cx + x * a + d / 2, cy + y * a - d / 2);
      });
      ctx.stroke();
    } else if (kind === "dot") {
      ctx.globalAlpha = 0.5;
      ctx.beginPath(); ctx.moveTo(cx - s, cy); ctx.lineTo(cx + s, cy); ctx.stroke();
      ctx.globalAlpha = 1;
      ctx.beginPath(); ctx.arc(cx, cy, 9, 0, Math.PI * 2); ctx.fill();
    } else if (kind === "square") {
      for (let i = 0; i < 3; i++) {
        ctx.globalAlpha = 0.9 - i * 0.28;
        const a = s * (0.75 - i * 0.22);
        ctx.save(); ctx.translate(cx, cy); ctx.rotate(Math.PI / 4 * (i % 2)); ctx.strokeRect(-a, -a, a * 2, a * 2); ctx.restore();
      }
    }
    ctx.restore();
  }

  function drawDesign(ctx, p, i) {
    const W = TEX, m = W * 0.135;
    ctx.clearRect(0, 0, W, W);
    ctx.fillStyle = ctx.strokeStyle = "#fff";
    // hairline frame
    ctx.globalAlpha = 0.28;
    ctx.lineWidth = 2;
    rr(ctx, m * 0.62, m * 0.62, W - m * 1.24, W - m * 1.24, 30);
    ctx.stroke();
    // code + category
    ctx.globalAlpha = 0.95;
    ctx.textBaseline = "top";
    ctx.font = `500 30px "Geist Mono", monospace`;
    if ("letterSpacing" in ctx) ctx.letterSpacing = "6px";
    ctx.fillText(pad(i), m, m);
    ctx.textAlign = "right";
    ctx.globalAlpha = 0.6;
    ctx.fillText(p.category.toUpperCase(), W - m, m);
    ctx.textAlign = "left";
    // geometry
    motif(ctx, p.motif, W / 2, W * 0.4, W * 0.17);
    // title
    ctx.globalAlpha = 1;
    ctx.textBaseline = "alphabetic";
    if ("letterSpacing" in ctx) ctx.letterSpacing = "-3px";
    let fs = 150;
    do {
      ctx.font = `600 ${fs}px "Neue Haas Grotesk", "Inter Tight", "Helvetica Neue", Arial, sans-serif`;
      fs -= 4;
    } while (ctx.measureText(p.title).width > W - m * 2 && fs > 40);
    ctx.fillText(p.title, m - 4, W * 0.735);
    // neon line
    ctx.fillRect(m, W * 0.735 + 34, W * 0.24, 3);
    // tags
    ctx.globalAlpha = 0.7;
    ctx.textBaseline = "top";
    ctx.font = `400 26px "Geist Mono", monospace`;
    if ("letterSpacing" in ctx) ctx.letterSpacing = "4px";
    ctx.fillText(p.tags.join(" / ").toUpperCase(), m, W * 0.735 + 66);
    ctx.globalAlpha = 1;
  }

  const design = document.createElement("canvas");
  design.width = design.height = TEX;

  function paintFace(mat) {
    const { p, i, alb, glow } = mat.userData;
    drawDesign(design.getContext("2d"), p, i);
    // albedo: polished graphite with faint engraving
    const a = alb.getContext("2d");
    const g = a.createLinearGradient(0, 0, TEX, TEX);
    g.addColorStop(0, "#202023");
    g.addColorStop(1, "#141416");
    a.globalAlpha = 1;
    a.fillStyle = g;
    a.fillRect(0, 0, TEX, TEX);
    a.globalAlpha = 0.045;
    a.fillStyle = a.createPattern(noise, "repeat");
    a.fillRect(0, 0, TEX, TEX);
    a.globalAlpha = 0.2;
    a.drawImage(design, 0, 0);
    // emissive: pure white line-work on black
    const e = glow.getContext("2d");
    e.globalAlpha = 1;
    e.fillStyle = "#000";
    e.fillRect(0, 0, TEX, TEX);
    e.drawImage(design, 0, 0);
    mat.map.needsUpdate = true;
    mat.emissiveMap.needsUpdate = true;
  }

  const aniso = renderer.capabilities.getMaxAnisotropy();
  const materials = FACES.map((f, fi) => {
    const pi = FACE_PROJECT[fi];
    const alb = document.createElement("canvas");
    const glow = document.createElement("canvas");
    alb.width = alb.height = glow.width = glow.height = TEX;
    const map = new THREE.CanvasTexture(alb);
    const emap = new THREE.CanvasTexture(glow);
    [map, emap].forEach((t) => { t.encoding = THREE.sRGBEncoding; t.anisotropy = aniso; });
    const mat = new THREE.MeshPhysicalMaterial({
      map,
      emissiveMap: emap,
      emissive: 0xffffff,
      emissiveIntensity: 0,
      bumpMap: emap,
      bumpScale: -0.06,
      roughness: 0.36,
      metalness: 0.1,
      clearcoat: 0.75,
      clearcoatRoughness: 0.22,
      envMapIntensity: 0,
    });
    mat.userData = { p: P[pi], i: pi, alb, glow, g: 0, target: 0.05 };
    paintFace(mat);
    return mat;
  });
  const repaint = () => materials.forEach(paintFace);
  if (document.fonts) {
    Promise.all([
      document.fonts.load('600 100px "Neue Haas Grotesk"'),
      document.fonts.load('500 30px "Geist Mono"'),
      document.fonts.load('600 100px "Inter Tight"'),
    ]).then(repaint, () => {});
    document.fonts.ready.then(repaint);
  }

  const geo = roundedBox(SIZE, RADIUS);
  const pivot = new THREE.Group();
  const die = new THREE.Mesh(geo, materials);
  const outlineMat = new THREE.MeshBasicMaterial({ color: 0xffffff, side: THREE.BackSide, transparent: true, opacity: 0, depthWrite: false });
  const outline = new THREE.Mesh(geo, outlineMat);
  outline.scale.setScalar(1.016);
  die.add(outline);
  pivot.add(die);
  scene.add(pivot);

  // soft contact shadow
  const shadowTex = (() => {
    const c = document.createElement("canvas");
    c.width = c.height = 256;
    const x = c.getContext("2d");
    const g = x.createRadialGradient(128, 128, 0, 128, 128, 128);
    g.addColorStop(0, "rgba(0,0,0,0.85)");
    g.addColorStop(0.45, "rgba(0,0,0,0.35)");
    g.addColorStop(1, "rgba(0,0,0,0)");
    x.fillStyle = g;
    x.fillRect(0, 0, 256, 256);
    return new THREE.CanvasTexture(c);
  })();
  const shadowMat = new THREE.MeshBasicMaterial({ map: shadowTex, transparent: true, depthWrite: false, opacity: 0 });
  const shadow = new THREE.Mesh(new THREE.PlaneGeometry(3.6, 3.6), shadowMat);
  shadow.rotation.x = -Math.PI / 2;
  shadow.position.y = -1.7;
  scene.add(shadow);

  // faint horizon line of light on the floor
  const floorLineMat = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0 });
  const floorLine = new THREE.Mesh(new THREE.PlaneGeometry(9, 0.004), floorLineMat);
  floorLine.position.set(0, -1.72, -1.6);
  scene.add(floorLine);

  /* ---------- state ---------- */
  const S = {
    mode: "intro",
    q: new Q(),
    from: new Q(),
    to: new Q(),
    w: new V3(),
    y: 0, vy: 0, y0: 0,
    t0: 0, dur: 1,
    active: 0, target: 0,
    light: 0,
    camZ: 9, camFrom: 9, camTo: 9,
    flash: 0,
  };
  let overlay = null;      // null | "project" | "about" | "contact"
  let hasInfo = false;
  let hovering = false;
  let outlinePulse = 0;
  let shake = 0;
  let wobAmp = 0;
  let dieX = 0, dieY = 0;
  let time = 0, last = performance.now();
  let pageOpened = false;

  const tmpQ = new Q(), tmpV = new V3(), wobQ = new Q(), euler = new THREE.Euler();

  /* ---------- layout ---------- */
  const isWide = () => innerWidth > 860;
  function layout() {
    const w = innerWidth, h = innerHeight;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    baseZ = w / h < 1 ? Math.max(9, 6.6 / (w / h)) : 9;
    if (S.mode !== "enter" && S.mode !== "project" && S.mode !== "exit") S.camZ = baseZ;
    camera.updateProjectionMatrix();
  }
  addEventListener("resize", layout);
  layout();

  /* ---------- DOM refs ---------- */
  const body = document.body;
  const info = { code: $("#iCode"), cat: $("#iCat"), title: $("#iTitle"), desc: $("#iDesc") };
  const indexNav = $("#index");
  const page = $("#page"), pageInner = $("#pageInner"), pageTag = $("#pageTag");
  const flash = $("#flash");
  const menu = $("#menu");

  P.forEach((p, i) => {
    const b = document.createElement("button");
    b.textContent = pad(i);
    b.title = p.title;
    b.addEventListener("click", () => goTo(i));
    indexNav.appendChild(b);
  });

  function setIndex(i) {
    [...indexNav.children].forEach((b, j) => b.classList.toggle("is-active", j === i));
  }

  function showInfo(i) {
    const p = P[i];
    S.active = i;
    info.code.textContent = `PROJECT ${pad(i)}`;
    $("#iFace").textContent = `FACE ${pad(i)} / ${String(P.length).padStart(2, "0")}`;
    info.cat.textContent = p.category;
    info.title.textContent = p.title;
    info.desc.textContent = p.short;
    hasInfo = true;
    body.classList.add("has-info");
    materials.forEach((m) => (m.userData.target = m.userData.i === i ? 0.85 : 0.04));
    setIndex(i);
  }
  function hideInfo() {
    hasInfo = false;
    body.classList.remove("has-info");
    materials.forEach((m) => (m.userData.target = 0.04));
  }
  const played = () => body.classList.add("played");

  /* ---------- motions ---------- */
  function nearestFace() {
    tmpV.copy(camera.position).sub(pivot.position).normalize();
    let best = 0, bestDot = -2;
    FACES.forEach((f, fi) => {
      const d = f.n.clone().applyQuaternion(S.q).dot(tmpV);
      if (d > bestDot) { bestDot = d; best = fi; }
    });
    return best;
  }

  function startLock() {
    const fi = nearestFace();
    S.from.copy(S.q);
    S.to.copy(FACES[fi].q);
    S.target = FACE_PROJECT[fi];
    S.y0 = S.y;
    S.vy = 0;
    S.w.set(0, 0, 0);
    S.mode = "lock";
    S.t0 = performance.now();
    S.dur = reduce ? 300 : 950;
  }

  function goTo(i) {
    if (overlay) return;
    if (!["idle", "lock", "turn"].includes(S.mode)) return;
    played();
    if (i === S.active && S.mode === "idle") { if (!hasInfo) showInfo(i); return; }
    hideInfo();
    S.from.copy(S.q);
    S.to.copy(FACES[PROJECT_FACE[i]].q);
    S.target = i;
    S.mode = "turn";
    S.t0 = performance.now();
    S.dur = reduce ? 300 : 1150;
    setIndex(i);
  }

  function throwDie(w, vy) {
    hideInfo();
    played();
    S.w.copy(w);
    S.vy = vy;
    S.mode = "air";
    S.t0 = performance.now();
  }

  function randomThrow() {
    if (overlay || !["idle", "lock", "turn"].includes(S.mode)) return;
    const a = Math.random() * Math.PI * 2;
    throwDie(new V3(Math.cos(a), Math.sin(a), (Math.random() - 0.5) * 0.5).normalize().multiplyScalar(15), 6.2);
  }

  function impact(v) {
    if (reduce) return;
    shake = Math.max(shake, clamp(v * 0.006, 0, 0.045));
    outlinePulse = Math.max(outlinePulse, clamp(v * 0.035, 0, 0.28));
  }

  const G = 17;
  function physics(dt, now) {
    const sub = 4, h = dt / sub;
    for (let s = 0; s < sub; s++) {
      S.vy -= G * h;
      S.y += S.vy * h;
      if (S.y < 0) {
        S.y = 0;
        if (S.vy < -1.5) {
          impact(-S.vy);
          S.vy = -S.vy * 0.33;
          S.w.multiplyScalar(0.6);
          S.w.z *= 0.5;
        } else S.vy = 0;
      }
      const grounded = S.y === 0 && S.vy === 0;
      S.w.multiplyScalar(Math.exp(-(grounded ? 3.4 : 0.3) * h));
      const ang = S.w.length() * h;
      if (ang > 1e-6) {
        tmpQ.setFromAxisAngle(tmpV.copy(S.w).normalize(), ang);
        S.q.premultiply(tmpQ);
      }
    }
    S.q.normalize();
    if ((S.y === 0 && S.vy === 0 && S.w.length() < 3.4) || now - S.t0 > 3400) startLock();
  }

  /* ---------- enter / exit project ---------- */
  function enterProject() {
    if (S.mode !== "idle" || overlay || !hasInfo) return;
    hideInfo();
    S.mode = "enter";
    S.t0 = performance.now();
    S.dur = reduce ? 400 : 1400;
    S.camFrom = S.camZ;
    S.camTo = 3.3;
    pageOpened = false;
    overlay = "project";
    // fully light the face we're travelling into
    materials.forEach((m) => (m.userData.target = m.userData.i === S.active ? 1.6 : 0));
  }

  function exitProject() {
    closePage();
    S.mode = "exit";
    S.t0 = performance.now();
    S.dur = reduce ? 400 : 1500;
    S.camFrom = S.camZ;
    S.camTo = baseZ;
  }

  /* ---------- pages ---------- */
  let io;
  function openPage(html, kind, tag) {
    overlay = kind;
    pageInner.innerHTML = html;
    hydrateMedia(pageInner);
    pageTag.textContent = tag || "";
    page.classList.add("open");
    page.setAttribute("aria-hidden", "false");
    page.scrollTop = 0;
    [...menu.children].forEach((b) => b.classList.toggle("is-active", b.dataset.open === (kind === "project" ? "projects" : kind)));
    if (io) io.disconnect();
    io = new IntersectionObserver((entries) => entries.forEach((e) => {
      if (e.isIntersecting) { e.target.classList.add("in"); io.unobserve(e.target); }
    }), { root: page, threshold: 0.12 });
    pageInner.querySelectorAll(".r").forEach((el, k) => {
      el.style.transitionDelay = k < 5 ? `${0.25 + k * 0.12}s` : "0s";
      io.observe(el);
    });
    setTimeout(() => $("#backBtn").focus({ preventScroll: true }), 300);
  }

  function closePage() {
    page.classList.remove("open");
    page.setAttribute("aria-hidden", "true");
    [...menu.children].forEach((b) => b.classList.toggle("is-active", b.dataset.open === "projects"));
    const was = overlay;
    overlay = null;
    if (was !== "project" && S.mode === "idle") showInfo(S.active);
  }

  /* Media: se busca automáticamente en projects/<carpeta>/images/01.jpg, 02.png...
     y projects/<carpeta>/video/video.mp4. Lo que no exista simplemente no aparece. */
  const EXTS = ["jpg", "jpeg", "png", "webp", "gif", "JPG", "PNG"];

  function shot(p, k, optional) {
    const nn = String(k + 1).padStart(2, "0");
    const manual = p.images && p.images[k];
    const base = !manual && p.folder ? `${p.folder}/images/${nn}` : "";
    if (optional && !manual && !base) return "";
    const alt = `${esc(p.title)} — ${nn}`;
    const img = manual
      ? `<img src="${esc(manual)}" alt="${alt}" loading="lazy">`
      : base ? `<img data-base="${esc(base)}" alt="${alt}">` : "";
    return `<figure class="shot"${optional ? " data-optional" : ""}>${img}<span>${alt}</span></figure>`;
  }
  function shots(p, from, count, optional) {
    let out = "";
    for (let k = from; k < from + count; k++) out += shot(p, k, optional);
    return out;
  }
  function videoBlock(p) {
    const src = p.video || (p.folder ? `${p.folder}/video/video.mp4` : "");
    return src ? `<figure class="shot shot-video r" data-optional><video data-src="${esc(src)}" muted loop playsinline autoplay preload="metadata"></video></figure>` : "";
  }

  function hydrateMedia(root) {
    const fail = (el) => {
      const fig = el.closest("figure");
      if (fig && fig.hasAttribute("data-optional")) fig.remove();
      else el.remove();
    };
    root.querySelectorAll("img").forEach((img) => {
      img.addEventListener("load", () => img.closest("figure").classList.add("has-media"));
      if (!img.dataset.base) { img.addEventListener("error", () => fail(img)); return; }
      let n = 0;
      const tryNext = () => {
        if (n >= EXTS.length) return fail(img);
        img.src = `${img.dataset.base}.${EXTS[n++]}`;
      };
      img.addEventListener("error", tryNext);
      tryNext();
    });
    root.querySelectorAll("video[data-src]").forEach((v) => {
      v.addEventListener("loadeddata", () => v.closest("figure").classList.add("has-media"));
      v.addEventListener("error", () => fail(v));
      v.src = v.dataset.src;
    });
  }

  function projectHTML(i) {
    const p = P[i];
    const ni = (i + 1) % P.length;
    return `
      <header class="ph">
        <div class="ph-code r"><b>PROJECT ${pad(i)}</b><span>/</span><span>${esc(p.category)}</span></div>
        <h1 class="ph-title r">${esc(p.title)}</h1>
        <div class="neon-line r"></div>
        <dl class="ph-meta r">
          <div><dt>Year</dt><dd>${esc(p.year)}</dd></div>
          <div><dt>Role</dt><dd>${esc(p.role)}</dd></div>
          <div><dt>Discipline</dt><dd>${p.tags.map(esc).join(" / ")}</dd></div>
        </dl>
      </header>
      <p class="lead r">${esc(p.intro)}</p>
      ${videoBlock(p)}
      <div class="r">${shots(p, 0, 1)}</div>
      ${p.sections.map((s) => `<section class="block r"><h2>${esc(s.heading)}</h2><p>${esc(s.text)}</p></section>`).join("")}
      <div class="shots-2 r">${shots(p, 1, 2)}</div>
      <div class="gallery">${shots(p, 3, 9, true)}</div>
      <button class="next r" data-next="${ni}"><span>Next — ${pad(ni)}</span><strong>${esc(P[ni].title)}</strong></button>`;
  }

  function aboutHTML() {
    return `
      <header class="ph">
        <div class="ph-code r"><b>About</b><span>/</span><span>${esc(SITE.name)}</span></div>
        <h1 class="ph-title r">${esc(SITE.aboutTitle)}</h1>
        <div class="neon-line r"></div>
      </header>
      <p class="lead r">${esc(SITE.about)}</p>
      <section class="block r"><h2>Disciplines</h2><p>${SITE.disciplines.map(esc).join("<br>")}</p></section>
      <section class="block r"><h2>Tools</h2><p>${SITE.tools.map(esc).join(" · ")}</p></section>`;
  }

  function contactHTML() {
    const rows = [
      SITE.email && `<a class="row r" href="mailto:${esc(SITE.email)}"><span>Email</span><strong>${esc(SITE.email)}</strong></a>`,
      SITE.linkedin && `<a class="row r" href="${esc(SITE.linkedin)}" target="_blank" rel="noopener"><span>LinkedIn</span><strong>Profile ↗</strong></a>`,
      SITE.cv && `<a class="row r" href="${esc(SITE.cv)}" download><span>CV</span><strong>Download ↓</strong></a>`,
    ].filter(Boolean).join("");
    return `
      <header class="ph">
        <div class="ph-code r"><b>Contact</b></div>
        <h1 class="ph-title r"><a href="mailto:${esc(SITE.email)}">Let’s talk.</a></h1>
        <div class="neon-line r"></div>
      </header>
      <div class="rows">${rows}</div>`;
  }

  pageInner.addEventListener("click", (e) => {
    const n = e.target.closest("[data-next]");
    if (!n) return;
    const i = +n.dataset.next;
    S.active = i;
    S.q.copy(FACES[PROJECT_FACE[i]].q);
    setIndex(i);
    page.classList.remove("open");
    setTimeout(() => openPage(projectHTML(i), "project", `FACE ${pad(i)} / 06`), 450);
  });

  $("#backBtn").addEventListener("click", () => (overlay === "project" ? exitProject() : closePage()));
  $("#enterBtn").addEventListener("click", enterProject);
  $("#brand").addEventListener("click", (e) => { e.preventDefault(); if (overlay === "project") exitProject(); else if (overlay) closePage(); });

  menu.addEventListener("click", (e) => {
    const b = e.target.closest("button");
    if (!b) return;
    const kind = b.dataset.open;
    if (kind === "projects") { if (overlay === "project") exitProject(); else if (overlay) closePage(); return; }
    if (S.mode === "enter" || S.mode === "exit") return;
    if (overlay === "project") { S.mode = "idle"; S.camZ = baseZ; }
    hideInfo();
    openPage(kind === "about" ? aboutHTML() : contactHTML(), kind, kind);
  });

  /* ---------- input: drag / throw / inspect ---------- */
  const ray = new THREE.Raycaster();
  const ndc = new THREE.Vector2();
  function hitDie(e) {
    ndc.set((e.clientX / innerWidth) * 2 - 1, -(e.clientY / innerHeight) * 2 + 1);
    ray.setFromCamera(ndc, camera);
    return ray.intersectObject(die, false).length > 0;
  }

  let drag = null;
  canvas.addEventListener("pointerdown", (e) => {
    if (overlay || !["idle", "lock", "turn", "air"].includes(S.mode)) return;
    if (!hitDie(e)) return;
    const now = performance.now();
    drag = { x: e.clientX, y: e.clientY, t: now, lt: now, vx: 0, vy: 0, moved: 0, hadInfo: hasInfo && S.mode === "idle" };
    S.mode = "drag";
    S.w.set(0, 0, 0);
    S.vy = 0;
    canvas.setPointerCapture(e.pointerId);
    canvas.style.cursor = "grabbing";
  });

  canvas.addEventListener("pointermove", (e) => {
    if (!drag) {
      hovering = !overlay && hitDie(e);
      canvas.style.cursor = hovering ? (hasInfo ? "pointer" : "grab") : "default";
      return;
    }
    const now = performance.now();
    const dx = e.clientX - drag.x, dy = e.clientY - drag.y;
    drag.x = e.clientX; drag.y = e.clientY;
    drag.moved += Math.abs(dx) + Math.abs(dy);
    if (drag.moved > 6 && hasInfo) hideInfo();
    const len = Math.hypot(dx, dy);
    if (len > 0) {
      tmpQ.setFromAxisAngle(tmpV.set(dy, dx, 0).normalize(), len * 0.0085);
      S.q.premultiply(tmpQ);
    }
    const dtm = Math.max(8, now - drag.lt);
    drag.vx = lerp(drag.vx, (dx / dtm) * 1000, 0.45);
    drag.vy = lerp(drag.vy, (dy / dtm) * 1000, 0.45);
    drag.lt = now;
  });

  function release(e) {
    if (!drag) return;
    const now = performance.now();
    const d = drag;
    drag = null;
    canvas.style.cursor = hovering ? "grab" : "default";
    if (d.moved < 6 && now - d.t < 400) {
      if (d.hadInfo) { S.mode = "idle"; enterProject(); }
      else startLock();
      return;
    }
    const held = now - d.lt > 90;
    const speed = held ? 0 : Math.hypot(d.vx, d.vy);
    if (speed < 280) { startLock(); return; }
    const k = 0.011;
    const w = new V3(d.vy * k, d.vx * k, (Math.random() - 0.5) * 4);
    w.multiplyScalar(clamp(w.length(), 8, 22) / w.length());
    throwDie(w, clamp(3.4 + speed / 700, 4, 7.5));
  }
  canvas.addEventListener("pointerup", release);
  canvas.addEventListener("pointercancel", release);
  canvas.addEventListener("pointerleave", () => { if (!drag) hovering = false; });

  // controlled rotation with the wheel
  let wheelAcc = 0, lastWheel = 0;
  addEventListener("wheel", (e) => {
    if (overlay || S.mode !== "idle") return;
    const now = performance.now();
    wheelAcc += e.deltaY;
    if (Math.abs(wheelAcc) > 60 && now - lastWheel > 900) {
      goTo((S.active + (wheelAcc > 0 ? 1 : -1) + P.length) % P.length);
      lastWheel = now;
      wheelAcc = 0;
    }
  }, { passive: true });

  addEventListener("keydown", (e) => {
    if (e.key === "Escape") {
      if (overlay === "project") exitProject();
      else if (overlay) closePage();
      return;
    }
    if (overlay) return;
    if (e.target.closest && e.target.closest("button, a") && (e.key === "Enter" || e.key === " ")) return;
    if (e.key === " ") { e.preventDefault(); randomThrow(); }
    else if (e.key === "Enter") enterProject();
    else if (e.key === "ArrowRight" || e.key === "ArrowDown") goTo((S.active + 1) % P.length);
    else if (e.key === "ArrowLeft" || e.key === "ArrowUp") goTo((S.active - 1 + P.length) % P.length);
    else if (/^[1-6]$/.test(e.key)) goTo(+e.key - 1);
  });

  /* ---------- loop ---------- */
  function tick(now) {
    const dt = Math.min(0.05, (now - last) / 1000);
    last = now;
    time += dt;
    const t = clamp((now - S.t0) / S.dur, 0, 1);

    switch (S.mode) {
      case "intro": {
        const e = easeInOut(t);
        S.q.slerpQuaternions(S.from, S.to, e);
        S.y = lerp(-0.5, 0, easeOut(t));
        S.light = easeInOut(clamp(t * 1.2, 0, 1));
        if (t >= 1) { S.mode = "idle"; S.q.copy(S.to); showInfo(0); }
        break;
      }
      case "turn":
      case "lock": {
        const e = S.mode === "lock" ? easeOutQuint(t) : easeInOut(t);
        S.q.slerpQuaternions(S.from, S.to, e);
        S.y = S.mode === "turn" ? Math.sin(Math.PI * e) * 0.3 : lerp(S.y0, 0, e);
        if (t >= 1) {
          S.q.copy(S.to);
          S.y = 0;
          S.mode = "idle";
          outlinePulse = 0.3;
          showInfo(S.target);
        }
        break;
      }
      case "air":
        physics(dt, now);
        break;
      case "drag":
        S.y = damp(S.y, 0.2, 8, dt);
        break;
      case "enter": {
        const e = easeInOut(t);
        S.camZ = lerp(S.camFrom, S.camTo, e);
        S.flash = smooth(0.55, 0.92, t) * 0.55;
        if (t > 0.78 && !pageOpened) {
          pageOpened = true;
          openPage(projectHTML(S.active), "project", `FACE ${pad(S.active)} / 06`);
        }
        if (t >= 1) S.mode = "project";
        break;
      }
      case "project":
        S.flash = damp(S.flash, 0, 4, dt);
        break;
      case "exit": {
        const e = easeInOut(t);
        S.camZ = lerp(S.camFrom, S.camTo, e);
        S.flash = 0;
        if (t >= 1) { S.mode = "idle"; S.camZ = baseZ; showInfo(S.active); }
        break;
      }
    }

    // composition: die slides aside to make room for the reveal
    const showing = hasInfo && S.mode === "idle";
    const tx = S.mode === "enter" || S.mode === "project" ? 0 : showing && isWide() ? 1.45 : 0;
    const ty = showing && !isWide() ? 0.75 : 0;
    dieX = damp(dieX, tx, 3.2, dt);
    dieY = damp(dieY, ty, 3.2, dt);

    // idle: weightless float, barely breathing
    wobAmp = damp(wobAmp, S.mode === "idle" && !reduce ? 1 : 0, 2, dt);
    euler.set(Math.sin(time * 0.55) * 0.03 * wobAmp, Math.sin(time * 0.42) * 0.05 * wobAmp, 0);
    wobQ.setFromEuler(euler);
    die.quaternion.copy(wobQ).multiply(S.q);
    const bob = Math.sin(time * 0.9) * 0.05 * wobAmp;
    pivot.position.set(dieX, S.y + bob + dieY, 0);

    // light & materials
    key.intensity = LIGHT.key * S.light;
    rim.intensity = LIGHT.rim * S.light;
    materials.forEach((m) => {
      m.userData.g = damp(m.userData.g, m.userData.target, 3, dt);
      m.emissiveIntensity = m.userData.g * S.light;
      m.envMapIntensity = S.light;
    });
    outlinePulse = damp(outlinePulse, 0, 2.2, dt);
    const hoverRim = hovering && (S.mode === "idle" || S.mode === "drag") ? 0.12 : 0;
    outlineMat.opacity = damp(outlineMat.opacity, Math.max(hoverRim, outlinePulse) * S.light, 6, dt);

    // shadow reacts to height
    const hgt = Math.max(0, S.y);
    shadow.position.x = dieX;
    shadow.position.y = -1.7 + dieY;
    shadow.scale.setScalar(1 + hgt * 0.35);
    shadowMat.opacity = 0.75 * S.light / (1 + hgt * 1.3);
    floorLine.position.y = -1.72 + dieY;
    floorLineMat.opacity = 0.07 * S.light;

    // camera
    shake = damp(shake, 0, 7, dt);
    camera.position.set(
      (Math.random() - 0.5) * shake,
      lerp(CAM_Y, 0, clamp((baseZ - S.camZ) / (baseZ - 3.3), 0, 1)) + (Math.random() - 0.5) * shake,
      S.camZ
    );
    camera.lookAt(0, 0, 0);

    flash.style.opacity = S.flash.toFixed(3);

    if (!(S.mode === "project" && S.flash < 0.01)) renderer.render(scene, camera);
    requestAnimationFrame(tick);
  }

  /* ---------- intro ---------- */
  S.from.setFromEuler(new THREE.Euler(-0.9, 2.4, 0.5));
  S.to.copy(FACES[PROJECT_FACE[0]].q);
  S.q.copy(S.from);
  S.t0 = performance.now() + 250;
  S.dur = reduce ? 600 : 3600;
  requestAnimationFrame(() => body.classList.add("ready"));
  requestAnimationFrame(tick);
})();
