/* ============================================================
   THE OBJECT — dado escultórico interactivo
   Render PBR + reflejo + sombras · física de cuerpo rígido real.
   El dado cae, rueda y se para solo; la cara de arriba es el
   resultado y el objeto se eleva para presentarla.
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
  const rand = (a, b) => a + Math.random() * (b - a);
  const damp = (a, b, k, dt) => lerp(a, b, 1 - Math.exp(-k * dt));
  const easeInOut = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
  const easeInOutSine = (t) => -(Math.cos(Math.PI * t) - 1) / 2;
  const easeOutQuint = (t) => 1 - Math.pow(1 - t, 5);
  const smooth = (a, b, t) => { const x = clamp((t - a) / (b - a), 0, 1); return x * x * (3 - 2 * x); };
  const pad = (n) => String(n + 1).padStart(2, "0");
  const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
  const body = document.body;
  const bus = {};
  const emit = (name, data) => (bus[name] || []).forEach((fn) => { try { fn(data); } catch (e) { /* never break the object */ } });

  /* ---------- static text ---------- */
  // the accent of Infanzón lives apart from its letter: it floats
  $("#brandName").innerHTML = esc(SITE.name).replace(/[óÓ]/, (c) => `<span class="acc">${c === "ó" ? "o" : "O"}<i class="acc-mark" aria-hidden="true">´</i></span>`);
  $("#brandRole").textContent = SITE.role;
  $("#tagline").textContent = SITE.tagline;

  // private table: a link like woblo.io/?vip=Acme greets that company by name
  const VIP = (() => {
    const q = new URLSearchParams(location.search);
    if (!q.has("vip")) return null;
    const name = (q.get("vip") || "").replace(/[^\p{L}\p{N} .&'’-]/gu, "").trim().slice(0, 40);
    return { name };
  })();
  window.VIP = VIP;
  if (VIP) {
    body.classList.add("vip");
    $("#brandVip").textContent = T("Mesa privada", "Private table") + (VIP.name ? ` · ${VIP.name}` : "");
  }
  document.title = `${SITE.name} — Portfolio`;

  /* ---------- renderer / scene ---------- */
  const canvas = $("#gl");
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: "high-performance" });
  const PR = Math.min(window.devicePixelRatio, 2);
  renderer.setPixelRatio(PR);
  renderer.outputEncoding = THREE.sRGBEncoding;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.0;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.VSMShadowMap;

  /* ---------- lite mode: a slow device gets a lighter picture, never a slow one ----------
     Starts lite on obviously small hardware; otherwise watches the frame time and steps
     down once if it stays slow. The private table reads the same flag. */
  const PERF = window.PERF = (() => {
    const cores = navigator.hardwareConcurrency || 8, mem = navigator.deviceMemory || 8;
    const forced = /[?&]lite(=|&|$)/.test(location.search); // ?lite forces it, for testing
    const p = { lite: forced || cores <= 4 || mem <= 3, subs: [], samples: [], since: 0 };
    p.on = (fn) => { p.subs.push(fn); if (p.lite) fn(); };
    p.goLite = () => { if (p.lite) return; p.lite = true; document.documentElement.classList.add("lite"); p.subs.forEach((fn) => fn()); };
    // feed with raw frame times; ignores the first seconds and hidden tabs
    p.sample = (ms, now) => {
      if (p.lite || document.hidden) return;
      if (!p.since) p.since = now + 2500;
      if (now < p.since) return;
      p.samples.push(ms);
      if (p.samples.length < 90) return;
      const sorted = p.samples.slice().sort((a, b) => a - b), median = sorted[45];
      p.samples.length = 0;
      if (median > 30) p.goLite(); // under ~33 fps for a sustained stretch
    };
    if (p.lite) document.documentElement.classList.add("lite");
    return p;
  })();

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x050506); // written straight to screen
  const BG_LIN = new THREE.Color(0x050506).convertSRGBToLinear(); // for materials (encoded on output)
  const camera = new THREE.PerspectiveCamera(30, 1, 0.1, 100);
  const CAM_Y = 0.55;
  let baseZ = 9;

  // Studio environment: black room with a few controlled softboxes.
  (function buildEnvironment() {
    const env = new THREE.Scene();
    env.add(new THREE.Mesh(
      new THREE.BoxGeometry(30, 30, 30),
      new THREE.MeshBasicMaterial({ color: 0x020202, side: THREE.BackSide })
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
    panel(12, 1.4, 0, 10, 1, 6);       // overhead strip
    panel(1.6, 10, -11, 1.5, 4, 2.4);  // left softbox
    panel(0.5, 8, 11, 0.5, -3, 4);     // right rim strip
    panel(0.25, 8, 9, 2, 6, 2.2);      // thin front-right kicker (edge highlight)
    panel(14, 0.6, 0, -4, 10, 0.5);    // faint front fill
    const pm = new THREE.PMREMGenerator(renderer);
    scene.environment = pm.fromScene(env, 0.025).texture;
    pm.dispose();
  })();

  const key = new THREE.DirectionalLight(0xffffff, 1.5);
  key.position.set(-2.5, 7, 3.5);
  key.castShadow = true;
  key.shadow.mapSize.set(1024, 1024);
  key.shadow.camera.left = key.shadow.camera.bottom = -5;
  key.shadow.camera.right = key.shadow.camera.top = 5;
  key.shadow.camera.near = 1;
  key.shadow.camera.far = 20;
  key.shadow.radius = 14;
  key.shadow.blurSamples = 16;
  key.shadow.bias = -0.0005;
  const rim = new THREE.DirectionalLight(0xffffff, 2.2);
  rim.position.set(5, 1, -6);
  scene.add(key, rim);

  /* ---------- geometry: precise rounded cube ---------- */
  const SIZE = 2, RADIUS = 0.15;

  function roundedBox(size, r, k = 10, inner = 2) {
    const N = 2 * k + inner;
    const g = new THREE.BoxGeometry(size, size, size, N, N, N);
    const pos = g.attributes.position, nor = g.attributes.normal, uv = g.attributes.uv;
    const s2 = size / 2, h = s2 - r, step = size / N;
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
  FACES.forEach((f) => {
    const r = new V3().crossVectors(f.up, f.n);
    const m = new THREE.Matrix4().makeBasis(r, f.up, f.n).transpose();
    f.q = new Q().setFromRotationMatrix(m);
  });
  const PROJECT_FACE = [4, 0, 2, 3, 1, 5]; // project index -> face index
  const FACE_PROJECT = [];
  PROJECT_FACE.forEach((f, p) => (FACE_PROJECT[f] = p));

  /* ---------- face textures: albedo, glow, engraving normals, roughness ---------- */
  const TEX = 1024;
  const mkCanvas = (s = TEX) => { const c = document.createElement("canvas"); c.width = c.height = s; return c; };
  const noise = (() => {
    const c = mkCanvas(256);
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
    ctx.lineWidth = 2.5;
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
        ctx.beginPath(); ctx.arc(cx - s * 0.8 + i * g, cy - s * 0.8 + j * g, 3.4, 0, Math.PI * 2); ctx.fill();
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
        ctx.save(); ctx.translate(cx, cy); ctx.rotate((Math.PI / 4) * (i % 2)); ctx.strokeRect(-a, -a, a * 2, a * 2); ctx.restore();
      }
    }
    ctx.restore();
  }

  const FALLBACK_FONT = `"Inter Tight", "Helvetica Neue", Arial, sans-serif`;
  let displayFont = FALLBACK_FONT;

  function drawDesign(ctx, p, i, frame = true) {
    const W = TEX, m = W * 0.135;
    ctx.clearRect(0, 0, W, W);
    ctx.fillStyle = ctx.strokeStyle = "#fff";
    if (frame) {
      ctx.globalAlpha = 0.28;
      ctx.lineWidth = 2;
      rr(ctx, m * 0.62, m * 0.62, W - m * 1.24, W - m * 1.24, 30);
      ctx.stroke();
    }
    ctx.globalAlpha = 0.95;
    ctx.textBaseline = "top";
    ctx.font = `500 30px "Geist Mono", monospace`;
    if ("letterSpacing" in ctx) ctx.letterSpacing = "6px";
    ctx.fillText(pad(i), m, m);
    ctx.textAlign = "right";
    ctx.globalAlpha = 0.6;
    ctx.fillText(p.category.toUpperCase(), W - m, m);
    ctx.textAlign = "left";
    motif(ctx, p.motif, W / 2, W * 0.4, W * 0.17);
    ctx.globalAlpha = 1;
    ctx.textBaseline = "alphabetic";
    if ("letterSpacing" in ctx) ctx.letterSpacing = "-3px";
    let fs = 150;
    do {
      ctx.font = `600 ${fs}px ${displayFont}`;
      fs -= 4;
    } while (ctx.measureText(p.title).width > W - m * 2 && fs > 40);
    ctx.fillText(p.title, m - 4, W * 0.735);
    ctx.fillRect(m, W * 0.735 + 34, W * 0.24, 3);
    ctx.globalAlpha = 0.7;
    ctx.textBaseline = "top";
    ctx.font = `400 26px "Geist Mono", monospace`;
    if ("letterSpacing" in ctx) ctx.letterSpacing = "4px";
    ctx.fillText(p.tags.join(" / ").toUpperCase(), m, W * 0.735 + 66);
    ctx.globalAlpha = 1;
    if ("letterSpacing" in ctx) ctx.letterSpacing = "0px";
  }

  const design = mkCanvas();
  // the engraving relief is computed at half size: four times less work, and a
  // soft normal map is all an engraving needs
  const NTEX = TEX / 2;
  const heightC = mkCanvas(NTEX);

  // Engraving: height = -design → tangent-space normal map
  function engraveNormals(out) {
    const W = NTEX;
    const hx = heightC.getContext("2d", { willReadFrequently: true });
    hx.filter = "none";
    hx.fillStyle = "#000";
    hx.fillRect(0, 0, W, W);
    hx.filter = "blur(0.6px)";
    hx.drawImage(design, 0, 0, W, W);
    hx.filter = "none";
    const src = hx.getImageData(0, 0, W, W).data;
    const ox = out.getContext("2d");
    const img = ox.createImageData(W, W);
    const d = img.data;
    const S = 1.5;
    for (let y = 0; y < W; y++) {
      const y0 = (y > 0 ? y - 1 : y) * W, y1 = (y < W - 1 ? y + 1 : y) * W, yr = y * W;
      for (let x = 0; x < W; x++) {
        const l = src[(yr + (x > 0 ? x - 1 : x)) * 4];
        const r = src[(yr + (x < W - 1 ? x + 1 : x)) * 4];
        const u = src[(y0 + x) * 4];
        const b = src[(y1 + x) * 4];
        const nx = ((r - l) / 255) * S;
        const ny = (-(b - u) / 255) * S;
        const inv = 1 / Math.sqrt(nx * nx + ny * ny + 1);
        const k = (yr + x) * 4;
        d[k] = (nx * inv * 0.5 + 0.5) * 255;
        d[k + 1] = (ny * inv * 0.5 + 0.5) * 255;
        d[k + 2] = (inv * 0.5 + 0.5) * 255;
        d[k + 3] = 255;
      }
    }
    ox.putImageData(img, 0, 0);
  }

  // smudges & satin etching → roughness variation
  const smudges = (() => {
    const c = mkCanvas(512);
    const x = c.getContext("2d");
    for (let i = 0; i < 60; i++) {
      const px = Math.random() * 512, py = Math.random() * 512, r = 20 + Math.random() * 120;
      const g = x.createRadialGradient(px, py, 0, px, py, r);
      const v = Math.random() < 0.5 ? 255 : 0;
      g.addColorStop(0, `rgba(${v},${v},${v},0.06)`);
      g.addColorStop(1, `rgba(${v},${v},${v},0)`);
      x.fillStyle = g;
      x.fillRect(px - r, py - r, r * 2, r * 2);
    }
    return c;
  })();

  function paintFace(mat) {
    const { p, i, alb, glow, nrm, rgh } = mat.userData;
    drawDesign(design.getContext("2d"), p, i);
    const a = alb.getContext("2d");
    const g = a.createLinearGradient(0, 0, TEX, TEX);
    g.addColorStop(0, "#1f1f22");
    g.addColorStop(1, "#141416");
    a.globalAlpha = 1;
    a.fillStyle = g;
    a.fillRect(0, 0, TEX, TEX);
    a.globalAlpha = 0.04;
    a.fillStyle = a.createPattern(noise, "repeat");
    a.fillRect(0, 0, TEX, TEX);
    a.globalAlpha = 0.16;
    a.drawImage(design, 0, 0);
    a.globalAlpha = 1;
    // glow layer: only the engraving lights up, never the frame of the face
    const e = glow.getContext("2d");
    e.fillStyle = "#000";
    e.fillRect(0, 0, TEX, TEX);
    drawDesign(design.getContext("2d"), p, i, false);
    e.drawImage(design, 0, 0);
    drawDesign(design.getContext("2d"), p, i, true);
    const r = rgh.getContext("2d");
    r.globalAlpha = 1;
    r.fillStyle = "rgb(70,70,70)";
    r.fillRect(0, 0, TEX, TEX);
    r.drawImage(smudges, 0, 0, TEX, TEX);
    r.globalAlpha = 0.03;
    r.fillStyle = r.createPattern(noise, "repeat");
    r.fillRect(0, 0, TEX, TEX);
    r.globalAlpha = 0.55;
    r.drawImage(design, 0, 0);
    r.globalAlpha = 1;
    [mat.map, mat.emissiveMap, mat.roughnessMap].forEach((t) => (t.needsUpdate = true));
    mat.userData.engrave = () => { drawDesign(design.getContext("2d"), p, i, true); engraveNormals(nrm); mat.normalMap.needsUpdate = true; };
    if (!mat.userData.soft) mat.userData.engrave();
  }

  const aniso = Math.min(8, renderer.capabilities.getMaxAnisotropy());
  const materials = FACES.map((f, fi) => {
    const pi = FACE_PROJECT[fi];
    const alb = mkCanvas(), glow = mkCanvas(), nrm = mkCanvas(NTEX), rgh = mkCanvas();
    const tex = (c, srgb) => {
      const t = new THREE.CanvasTexture(c);
      if (srgb) t.encoding = THREE.sRGBEncoding;
      t.anisotropy = aniso;
      return t;
    };
    const mat = new THREE.MeshPhysicalMaterial({
      map: tex(alb, true),
      emissiveMap: tex(glow, true),
      emissive: 0xffffff,
      emissiveIntensity: 0,
      normalMap: tex(nrm, false),
      normalScale: new THREE.Vector2(0.9, 0.9),
      roughnessMap: tex(rgh, false),
      roughness: 1,
      metalness: 0.12,
      clearcoat: 0.55,
      clearcoatRoughness: 0.16,
    });
    mat.userData = { p: P[pi], i: pi, alb, glow, nrm, rgh, g: 0, target: 0.03, dim: 1, dimTarget: 1 };
    return mat;
  });
  const faceCache = {};
  const repaint = () => { materials.forEach(paintFace); for (const k in faceCache) delete faceCache[k]; };
  // the faces are painted while the loader counts, one small task at a time:
  // a long single task would freeze the page on a slow phone
  const nextTask = () => new Promise((r) => setTimeout(r, 0));
  let painting = null;
  function repaintSoft() {
    if (painting) return painting;
    painting = (async () => {
      for (const m of materials) {
        m.userData.soft = true;
        paintFace(m); await nextTask();
        m.userData.engrave(); await nextTask();
        m.userData.soft = false;
      }
      for (const k in faceCache) delete faceCache[k];
    })();
    return painting;
  }

  /* fingerprints: each face has a small clear-coat roughness layer where touch leaves
     a matte mark; it fades back to polish after a few seconds */
  const PRINT = 256, PRINT_BASE = 40; // 40/255 ≈ the polished clear-coat roughness
  materials.forEach((mat) => {
    const c = mkCanvas(PRINT);
    const x = c.getContext("2d");
    x.fillStyle = `rgb(${PRINT_BASE},${PRINT_BASE},${PRINT_BASE})`;
    x.fillRect(0, 0, PRINT, PRINT);
    const t = new THREE.CanvasTexture(c);
    mat.clearcoatRoughnessMap = t;
    mat.clearcoatRoughness = 1;
    mat.needsUpdate = true;
    mat.userData.print = { c, x, t, dirty: 0 };
  });
  function pressPrint(fi, uv) {
    const pr = materials[fi] && materials[fi].userData.print;
    if (!pr) return;
    const px = uv.x * PRINT, py = (1 - uv.y) * PRINT;
    const { x } = pr;
    x.save();
    x.translate(px, py);
    x.rotate(Math.random() * Math.PI);
    const g = x.createRadialGradient(0, 0, 0, 0, 0, 13);
    g.addColorStop(0, "rgba(150,150,150,0.55)");
    g.addColorStop(1, "rgba(150,150,150,0)");
    x.fillStyle = g;
    x.beginPath(); x.ellipse(0, 0, 13, 10, 0, 0, Math.PI * 2); x.fill();
    x.strokeStyle = "rgba(190,190,190,0.35)";
    x.lineWidth = 0.8;
    for (let r = 2.5; r < 11; r += 1.6) { x.beginPath(); x.ellipse(0, 0, r * 1.25, r, 0, 0.3, Math.PI * 2 - 0.2); x.stroke(); }
    x.restore();
    pr.t.needsUpdate = true;
    pr.dirty = 4.5; // seconds until it is polished again
  }
  function fadePrints(dt) {
    materials.forEach((mat) => {
      const pr = mat.userData.print;
      if (!pr || pr.dirty <= 0) return;
      pr.dirty -= dt;
      pr.acc = (pr.acc || 0) + dt;
      if (pr.acc < 0.08) return;
      pr.acc = 0;
      pr.x.fillStyle = `rgba(${PRINT_BASE},${PRINT_BASE},${PRINT_BASE},0.07)`;
      pr.x.fillRect(0, 0, PRINT, PRINT);
      if (pr.dirty <= 0) { pr.x.fillStyle = `rgb(${PRINT_BASE},${PRINT_BASE},${PRINT_BASE})`; pr.x.fillRect(0, 0, PRINT, PRINT); }
      pr.t.needsUpdate = true;
    });
  }

  let fontsReady = false;
  const fontsLoaded = document.fonts
    ? Promise.all([
        document.fonts.load('600 100px "Neue Haas Grotesk"')
          .then((list) => {
            if (list.length && list.every((f) => f.status === "loaded")) displayFont = `"Neue Haas Grotesk", ${FALLBACK_FONT}`;
          })
          .catch(() => {}),
        document.fonts.load('600 100px "Inter Tight"').catch(() => {}),
        document.fonts.load('500 30px "Geist Mono"').catch(() => {}),
      ]).then(() => document.fonts.ready)
    : Promise.resolve();
  let introStarted = false;
  // the loader only reaches 100 once the faces are painted with the right fonts
  fontsLoaded.then(() => repaintSoft()).then(() => { fontsReady = true; });
  setTimeout(() => repaintSoft().then(() => (fontsReady = true)), 4500); // fonts that never arrive

  const geo = roundedBox(SIZE, RADIUS);
  const pivot = new THREE.Group();
  const die = new THREE.Mesh(geo, materials);
  die.castShadow = true;
  const outlineMat = new THREE.MeshBasicMaterial({ color: 0xffffff, side: THREE.BackSide, transparent: true, opacity: 0, depthWrite: false });
  const outline = new THREE.Mesh(geo, outlineMat);
  outline.scale.setScalar(1.016);
  die.add(outline);
  pivot.add(die);
  scene.add(pivot);

  /* ---------- floor: glossy black with reflection, shadows ---------- */
  const FLOOR_Y = -1.75;
  const REST_Y = FLOOR_Y + SIZE / 2;
  const mirror = new THREE.Mesh(geo, materials);
  mirror.matrixAutoUpdate = false;
  scene.add(mirror);
  const reflectM = new THREE.Matrix4().makeScale(1, -1, 1).premultiply(new THREE.Matrix4().makeTranslation(0, 2 * FLOOR_Y, 0));

  const radial = (stops) => {
    const c = mkCanvas(256);
    const x = c.getContext("2d");
    const g = x.createRadialGradient(128, 128, 0, 128, 128, 128);
    stops.forEach(([o, col]) => g.addColorStop(o, col));
    x.fillStyle = g;
    x.fillRect(0, 0, 256, 256);
    return new THREE.CanvasTexture(c);
  };
  const floorMat = new THREE.MeshBasicMaterial({
    color: BG_LIN,
    transparent: true,
    alphaMap: radial([[0, "rgb(214,214,214)"], [0.35, "rgb(232,232,232)"], [1, "rgb(255,255,255)"]]),
    depthWrite: true, // the backdrop never shows below the floor line
    toneMapped: false,
  });
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(30, 30), floorMat);
  floor.rotation.x = -Math.PI / 2;
  floor.position.y = FLOOR_Y;
  floor.renderOrder = 1;
  scene.add(floor);


  const shadowRecvMat = new THREE.ShadowMaterial({ opacity: 0.5, depthWrite: false });
  const shadowRecv = new THREE.Mesh(new THREE.PlaneGeometry(16, 16), shadowRecvMat);
  shadowRecv.rotation.x = -Math.PI / 2;
  shadowRecv.position.y = FLOOR_Y + 0.002;
  shadowRecv.receiveShadow = true;
  shadowRecv.renderOrder = 2;
  scene.add(shadowRecv);

  const blobMat = new THREE.MeshBasicMaterial({
    map: radial([[0, "rgba(0,0,0,0.9)"], [0.45, "rgba(0,0,0,0.35)"], [1, "rgba(0,0,0,0)"]]),
    transparent: true, depthWrite: false, opacity: 0,
  });
  const blob = new THREE.Mesh(new THREE.PlaneGeometry(3.4, 3.4), blobMat);
  blob.rotation.x = -Math.PI / 2;
  blob.position.y = FLOOR_Y + 0.004;
  blob.renderOrder = 3;
  scene.add(blob);

  /* ---------- state ---------- */
  const S = {
    mode: "loading",
    q: new Q(), from: new Q(), to: new Q(),
    y: 0, y0: 0, t0: 0, dur: 1,
    active: 0, target: 0,
    camZ: 9, camFrom: 9, camTo: 9,
    flash: 0,
    p0: new V3(),
  };
  // rigid body (world space)
  const B = { p: new V3(), v: new V3(), w: new V3(), still: 0, t: 0 };
  const basePos = new V3();
  let overlay = null;
  let hasInfo = false;
  let hovering = false;
  let outlinePulse = 0;
  let shake = 0;
  let wobAmp = 0;
  let dieX = 0, dieY = 0;
  let time = 0, last = performance.now();
  let pageOpened = false;
  let introDone = false;
  let wallX = 3.2;
  const WALL_Z = 2.2;

  const tmpQ = new Q(), tmpV = new V3(), wobQ = new Q(), euler = new THREE.Euler();

  /* ---------- layout ---------- */
  const isWide = () => innerWidth > 860;
  let halfW = 4;
  function layout() {
    const w = innerWidth, h = innerHeight;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    baseZ = w / h < 1 ? Math.max(9, 6.6 / (w / h)) : 9;
    if (!["enter", "project", "exit"].includes(S.mode)) S.camZ = baseZ;
    camera.updateProjectionMatrix();
    halfW = Math.tan(THREE.MathUtils.degToRad(camera.fov / 2)) * baseZ * camera.aspect;
    wallX = clamp(halfW - 1.3, 0.6, 3.4);
  }
  addEventListener("resize", layout);
  PERF.on(() => {
    renderer.setPixelRatio(Math.min(PR, 1.25));
    renderer.shadowMap.type = THREE.PCFShadowMap; // VSM blurs every frame; PCF is cheaper
    scene.traverse((o) => { if (o.material) [].concat(o.material).forEach((m) => (m.needsUpdate = true)); });
    if (key.shadow.map) { key.shadow.map.dispose(); key.shadow.map = null; }
    key.shadow.mapSize.set(512, 512);
    layout();
  });
  layout();

  /* ---------- DOM refs ---------- */
  const info = { code: $("#iCode"), title: $("#iTitle"), meta: $("#iMeta"), desc: $("#iDesc") };
  const indexNav = $("#index");
  const page = $("#page"), pageInner = $("#pageInner"), pageTag = $("#pageTag");
  const flash = $("#flash");
  const menu = $("#menu");

  P.forEach((p, i) => {
    const b = document.createElement("button");
    b.innerHTML = `<span class="chip-face">${pad(i)}</span><span class="chip-price">${pad(i)} · ${esc(p.year)} · ${esc(p.category).toUpperCase()}</span>`;
    b.setAttribute("aria-label", `${pad(i)} — ${p.title}`);
    b.title = p.title;
    b.addEventListener("click", () => goTo(i));
    indexNav.appendChild(b);
  });
  if (VIP && VIP.name) {
    const b = document.createElement("button");
    b.className = "chip-vip";
    const rim = `${VIP.name.toUpperCase()} · `.repeat(Math.max(1, Math.ceil(24 / (VIP.name.length + 3))));
    b.innerHTML = `<svg viewBox="0 0 60 60" aria-hidden="true"><defs><path id="vipRim" d="M30,30 m-23,0 a23,23 0 1,1 46,0 a23,23 0 1,1 -46,0"/></defs>
      <text><textPath href="#vipRim" textLength="144" lengthAdjust="spacingAndGlyphs">${esc(rim)}</textPath></text></svg>
      <span class="chip-face">★</span><span class="chip-price">${T("Su mesa", "Your table")} · ${esc(VIP.name)}</span>`;
    b.setAttribute("aria-label", T(`Mesa privada de ${VIP.name}`, `${VIP.name}'s private table`));
    b.addEventListener("click", openTable);
    indexNav.appendChild(b);
  }
  const setIndex = (i) => [...indexNav.children].forEach((b, j) => b.classList.toggle("is-active", j === i));

  function showInfo(i) {
    const p = P[i];
    S.active = i;
    info.code.textContent = pad(i);
    info.title.textContent = p.title;
    info.meta.textContent = p.meta || `${p.category} / ${p.year}`;
    info.desc.textContent = p.short;
    const eb = $("#enterBtn span");
    if (eb) {
      eb.dataset.es = p.kind === "cv" ? "Abrir PDF ↗" : p.kind ? "Abrir" : "Entrar al proyecto";
      eb.dataset.en = p.kind === "cv" ? "Open PDF ↗" : p.kind ? "Open" : "Enter project";
      eb.textContent = T(eb.dataset.es, eb.dataset.en);
    }
    hasInfo = true;
    body.classList.add("has-info");
    // the chosen face lights its neon edge; the rest of the object falls to deep grey
    materials.forEach((m) => {
      const on = m.userData.i === i;
      m.userData.target = on ? 0.8 : 0.0;
      m.userData.dimTarget = on ? 1 : 0.22;
    });
    setIndex(i);
  }
  function hideInfo() {
    hasInfo = false;
    body.classList.remove("has-info");
    materials.forEach((m) => { m.userData.target = 0.03; m.userData.dimTarget = 1; });
  }
  const played = () => body.classList.add("played");

  /* ============================================================
     RIGID BODY — a real die: gravity, corner contacts with the
     rounded edges, restitution, Coulomb friction, rest detection.
     ============================================================ */
  const R_IN = SIZE / 2 - RADIUS;
  const CORNERS = [];
  for (const sx of [-1, 1]) for (const sy of [-1, 1]) for (const sz of [-1, 1]) CORNERS.push(new V3(sx * R_IN, sy * R_IN, sz * R_IN));
  const GRAV = -20;
  const RESTITUTION = 0.22;
  const MU = 0.42;
  const INV_M = 1;
  const INV_I = 1 / ((1 / 6) * SIZE * SIZE); // solid cube, isotropic
  const UP = new V3(0, 1, 0);
  const ra = new V3(), vc = new V3(), rn = new V3(), vt = new V3(), rt = new V3();

  function stepBody(h) {
    B.v.y += GRAV * h;
    B.p.addScaledVector(B.v, h);
    const ang = B.w.length() * h;
    if (ang > 1e-8) {
      tmpQ.setFromAxisAngle(tmpV.copy(B.w).normalize(), ang);
      S.q.premultiply(tmpQ).normalize();
    }

    let grounded = false, maxPen = 0;
    for (const c of CORNERS) {
      ra.copy(c).applyQuaternion(S.q);
      ra.y -= RADIUS; // lowest point of the rounded corner
      const pen = FLOOR_Y - (B.p.y + ra.y);
      if (pen <= 0) continue;
      grounded = true;
      if (pen > maxPen) maxPen = pen;
      vc.crossVectors(B.w, ra).add(B.v);
      const vn = vc.y;
      if (vn >= 0) continue;
      rn.crossVectors(ra, UP);
      const jn = (-(1 + (vn < -1.4 ? RESTITUTION : 0)) * vn) / (INV_M + INV_I * rn.lengthSq());
      B.v.y += jn * INV_M;
      B.w.addScaledVector(rn, INV_I * jn);
      if (-vn > 2.2) impact(-vn);
      // friction
      vc.crossVectors(B.w, ra).add(B.v);
      vt.set(vc.x, 0, vc.z);
      const vtl = vt.length();
      if (vtl > 1e-6) {
        vt.divideScalar(vtl);
        rt.crossVectors(ra, vt);
        const jt = Math.min(vtl / (INV_M + INV_I * rt.lengthSq()), MU * jn);
        B.v.addScaledVector(vt, -jt * INV_M);
        B.w.addScaledVector(rt, -INV_I * jt);
      }
    }
    if (maxPen > 0) B.p.y += maxPen;

    // invisible walls keep the throw inside the frame
    if (B.p.x > wallX && B.v.x > 0) { B.v.x *= -0.35; B.w.multiplyScalar(0.7); }
    if (B.p.x < -wallX && B.v.x < 0) { B.v.x *= -0.35; B.w.multiplyScalar(0.7); }
    if (B.p.z > WALL_Z && B.v.z > 0) B.v.z *= -0.35;
    if (B.p.z < -WALL_Z && B.v.z < 0) B.v.z *= -0.35;

    // air drag + rolling resistance
    B.w.multiplyScalar(Math.exp(-(grounded ? 0.9 : 0.12) * h));
    if (grounded) { B.v.x *= Math.exp(-0.6 * h); B.v.z *= Math.exp(-0.6 * h); }
    return grounded;
  }

  // fixed time step: the motion is identical whatever the frame rate, no stutter
  const PH = 1 / 240;
  let physAcc = 0;
  function physics(dt, now) {
    physAcc = Math.min(physAcc + dt, 0.1);
    let grounded = false, n = 0;
    while (physAcc >= PH && n < 30) { grounded = stepBody(PH) || grounded; physAcc -= PH; n++; }
    B.t += dt;
    const calm = grounded && B.v.length() < 0.07 && B.w.length() < 0.1;
    B.still = calm ? B.still + dt : 0;
    if (B.still > 0.22 || B.t > 7) startPresent();
  }

  function launch(p, v, w) {
    emit("throw", { v: v.length() });
    hideInfo();
    B.p.copy(p);
    B.v.copy(v);
    B.w.copy(w);
    B.still = 0;
    B.t = 0;
    S.mode = "air";
  }

  // from the floating pose: bake the current visual position into the body
  function launchFromHere(v, w) {
    launch(pivot.position.clone(), v, w);
    dieX = 0;
    dieY = 0;
  }

  // the die has stopped: the face looking up is the result → it rises and presents it
  function startPresent() {
    let top = 0, best = -2;
    FACES.forEach((f, fi) => {
      const d = f.n.clone().applyQuaternion(S.q).y;
      if (d > best) { best = d; top = fi; }
    });
    S.from.copy(S.q);
    S.to.copy(FACES[top].q);
    S.target = FACE_PROJECT[top];
    S.p0.copy(B.p);
    S.mode = "present";
    S.t0 = performance.now();
    S.dur = reduce ? 500 : 1800;
    S.y = 0;
    S.shown = false;
  }

  const ripples = [];
  const rippleGeo = new THREE.RingGeometry(0.985, 1, 96);
  function spawnRipple(x, z, v) {
    const mat = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending, toneMapped: false });
    const ring = new THREE.Mesh(rippleGeo, mat);
    ring.rotation.x = -Math.PI / 2;
    ring.position.set(x, FLOOR_Y + 0.006, z);
    ring.renderOrder = 4;
    scene.add(ring);
    ripples.push({ ring, t: 0, v: clamp(v / 6, 0.25, 1) });
  }
  function updateRipples(dt) {
    for (let k = ripples.length - 1; k >= 0; k--) {
      const r = ripples[k];
      r.t += dt;
      const u = r.t / 1.8;
      r.ring.scale.setScalar(0.9 + u * 3.6);
      r.ring.material.opacity = 0.1 * r.v * Math.sin(Math.min(1, u) * Math.PI) * (1 - u);
      if (u >= 1) { scene.remove(r.ring); r.ring.material.dispose(); ripples.splice(k, 1); }
    }
  }
  let lastRipple = 0;
  function impact(v) {
    emit("impact", { v });
    const now = performance.now();
    if (!reduce && now - lastRipple > 140) { lastRipple = now; spawnRipple(B.p.x, B.p.z, v); }
    if (reduce) return;
    // the weight is in the physics; the camera stays still (a shake read as stutter)
  }

  /* ---------- floating motions ---------- */
  function nearestFace() {
    tmpV.copy(camera.position).sub(pivot.position).normalize();
    let best = 0, bestDot = -2;
    FACES.forEach((f, fi) => {
      const d = f.n.clone().applyQuaternion(S.q).dot(tmpV);
      if (d > bestDot) { bestDot = d; best = fi; }
    });
    return best;
  }

  function startLock(settle = 0) {
    S.settle = settle;
    const fi = nearestFace();
    S.from.copy(S.q);
    S.to.copy(FACES[fi].q);
    S.target = FACE_PROJECT[fi];
    S.y0 = S.y;
    S.mode = "lock";
    S.t0 = performance.now();
    S.dur = reduce ? 300 : 1000;
  }

  function goTo(i) {
    if (overlay || !["idle", "lock", "turn"].includes(S.mode)) return;
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

  function randomThrow() {
    if (overlay || !["idle", "lock", "turn"].includes(S.mode)) return;
    played();
    const dir = Math.random() < 0.5 ? -1 : 1;
    launchFromHere(
      new V3(rand(1.2, 2.6) * dir, rand(3.5, 4.5), rand(-0.8, 0.4)),
      new V3(rand(-6, 6), rand(-4, 4), -dir * rand(7, 11))
    );
  }

  /* ---------- enter / exit project ---------- */
  function enterProject() {
    if (S.mode !== "idle" || overlay || !hasInfo) return;
    // the CV face opens the PDF itself, in a new tab: there is no CV page in the site
    if (P[S.active].kind === "cv") { window.open(SITE.cv, "_blank", "noopener"); return; }
    hideInfo();
    S.mode = "enter";
    S.t0 = performance.now();
    S.dur = reduce ? 400 : 1400;
    S.camFrom = S.camZ;
    S.camTo = 3.3;
    pageOpened = false;
    overlay = "project";
    materials.forEach((m) => (m.userData.target = m.userData.i === S.active ? 1.1 : 0));
    emit("enter", { index: S.active });
  }

  function exitProject() {
    emit("exit", visitSummary());
    closePage();
    S.mode = "exit";
    S.t0 = performance.now();
    S.dur = reduce ? 400 : 1500;
    S.camFrom = S.camZ;
    S.camTo = baseZ;
  }

  /* ---------- pages ---------- */
  // the chosen face, flattened: becomes the background of the project hero
  const heroBg = $("#heroBg");
  function faceImage(i) {
    if (faceCache[i]) return faceCache[i];
    const m = materials.find((x) => x.userData.i === i);
    const c = mkCanvas();
    const x = c.getContext("2d");
    x.drawImage(m.userData.alb, 0, 0);
    x.globalCompositeOperation = "lighter";
    x.globalAlpha = 0.9;
    x.drawImage(m.userData.glow, 0, 0);
    return (faceCache[i] = c.toDataURL("image/jpeg", 0.88));
  }

  let io, settleTimer, layoutCleanup = null, visit = null;
  // what the receipt prints: project, time spent, and how far you got
  function visitSummary() {
    if (!visit) return null;
    const secs = Math.round((performance.now() - visit.t0) / 1000);
    let detail = layoutCleanup && layoutCleanup.receipt ? layoutCleanup.receipt() : "";
    if (!detail) {
      const pct = Math.round(100 * page.scrollTop / Math.max(1, page.scrollHeight - page.clientHeight));
      detail = T(`${pct}% leído`, `${pct}% read`);
    }
    return { index: visit.index, title: P[visit.index].title, secs, detail };
  }
  const scrollCueLabel = $("#scrollCue span");
  page.addEventListener("scroll", () => page.classList.toggle("scrolled", page.scrollTop > 60), { passive: true });
  function stopLayout() { if (layoutCleanup) { layoutCleanup(); layoutCleanup = null; } }

  /* ---------- smooth scroll on every page (Lenis) ----------
     It eases the real scroll position, so the pinned and scroll-driven sections of the
     case studies keep working exactly as before. Off with reduced motion. */
  let lenis = null, smoothRaf = 0;
  function startSmooth(kind) {
    stopSmooth();
    if (!window.Lenis || reduce || kind === "vip") return;
    lenis = new window.Lenis({ wrapper: page, content: pageInner, lerp: 0.085, smoothWheel: true, wheelMultiplier: 0.95 });
    const loop = (t) => { if (!lenis) return; lenis.raf(t); smoothRaf = requestAnimationFrame(loop); };
    smoothRaf = requestAnimationFrame(loop);
  }
  function stopSmooth() {
    cancelAnimationFrame(smoothRaf);
    if (lenis) { lenis.destroy(); lenis = null; }
  }
  window.SMOOTH = { get lenis() { return lenis; } }; // for the lightbox: pause while it is open
  const ROUTE_OF = { about: "sobre-mi", contact: "contacto", vip: null };
  const slugIndex = (slug) => P.findIndex((p) => p.slug === slug);
  let routing = false; // true while we are reacting to the back / forward buttons
  function route(slug) {
    if (routing) return;
    const want = slug ? "/" + slug : "/";
    if (location.pathname === want) return;
    history.pushState({ slug: slug || null }, "", want + location.search + location.hash);
  }
  addEventListener("popstate", () => {
    if (!introDone) return;
    const slug = location.pathname.replace(/^\/+|\/+$/g, "");
    const i = slug ? slugIndex(slug) : -1;
    routing = true;
    try {
      if (i < 0) { if (overlay === "project") exitProject(); else if (overlay) closePage(); }
      else if (!(overlay === "project" && S.active === i)) openFace(i);
    } finally { routing = false; }
  });
  // open a face's page directly, without the camera dive (deep links, back / forward)
  function openFace(i) {
    if (P[i].kind === "cv") { location.replace(SITE.cv); return; } // /cv is the PDF itself
    hideInfo();
    S.active = i;
    S.q.copy(FACES[PROJECT_FACE[i]].q);
    S.mode = "project";
    S.camZ = 3.3;
    setIndex(i);
    openPage(projectHTML(i), "project", `FACE ${pad(i)} / 06`);
  }

  function openPage(html, kind, tag) {
    stopLayout();
    overlay = kind;
    clearTimeout(settleTimer);
    heroBg.classList.remove("on", "settle"); // the project opens on clean black
    pageInner.innerHTML = html;
    hydrateMedia(pageInner);
    const lp = kind === "project" ? P[S.active] : null;
    const role = lp && lp.kind ? lp.kind : kind; // "about" whether it came from the menu or the die
    const L = lp && !lp.kind && lp.layout && window.LAYOUTS && window.LAYOUTS[lp.layout];
    route(kind === "project" ? lp.slug : ROUTE_OF[kind]);
    page.classList.toggle("has-layout", !!L);
    [...page.classList].filter((c) => c.startsWith("has-layout-")).forEach((c) => page.classList.remove(c));
    if (L) page.classList.add("has-layout-" + (lp.layout === "ton618" ? "tn" : lp.layout));
    page.classList.remove("scrolled");
    scrollCueLabel.textContent = L && lp.layout === "sidea" ? T("Desliza para escuchar", "Scroll to play") : T("Desliza", "Scroll");
    if (L) layoutCleanup = L.init(page, pageInner, { project: lp });
    visit = kind === "project" ? { index: S.active, t0: performance.now() } : null;
    if (role === "about" && window.initPortrait) layoutCleanup = window.initPortrait(pageInner.querySelector(".about-portrait"));
    if (role === "about" && window.CASINO) window.CASINO.mountOdds(pageInner.querySelector("#odds"));
    pageTag.textContent = tag || "";
    page.classList.add("open");
    page.setAttribute("aria-hidden", "false");
    page.scrollTop = 0;
    startSmooth(kind);
    [...menu.children].forEach((b) => b.classList.toggle("is-active", b.dataset.open === (kind === "project" ? "projects" : kind)));
    if (io) io.disconnect();
    io = new IntersectionObserver((entries) => entries.forEach((e) => {
      if (e.isIntersecting) { e.target.classList.add("in"); io.unobserve(e.target); }
    }), { root: page, threshold: 0.12 });
    pageInner.querySelectorAll(".r").forEach((el, k) => {
      if (k < 5) el.style.transitionDelay = `${0.25 + k * 0.12}s`;
      io.observe(el);
    });
    setTimeout(() => $("#backBtn").focus({ preventScroll: true }), 300);
  }

  function openTable() {
    if (!introDone || !window.VIP_TABLE || S.mode === "enter" || S.mode === "exit") return;
    if (overlay === "project") { S.mode = "idle"; S.camZ = baseZ; }
    hideInfo();
    openPage(window.VIP_TABLE.html({ vip: VIP, projects: P, site: SITE, esc, pad }), "vip", T("Mesa privada", "Private table"));
    layoutCleanup = window.VIP_TABLE.init(pageInner);
    emit("table");
  }

  function closePage() {
    route(null);
    stopSmooth();
    setTimeout(stopLayout, 800); // after the fade
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
    const cap = esc((p.captions && p.captions[k]) || "");
    const img = manual
      ? `<img src="${esc(manual)}" alt="${cap || alt}" data-cap="${cap}" loading="lazy">`
      : base ? `<img data-base="${esc(base)}" alt="${cap || alt}" data-cap="${cap}">` : "";
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
      img.addEventListener("load", () => img.closest("figure")?.classList.add("has-media"));
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
      v.addEventListener("loadeddata", () => v.closest("figure")?.classList.add("has-media"));
      v.addEventListener("error", () => fail(v));
      v.src = v.dataset.src;
    });
  }

  /* ---------- lightbox: examine a detail (01 / 04 + caption) ---------- */
  const lb = $("#lb"), lbImg = $("#lbImg"), lbCap = $("#lbCap"), lbCount = $("#lbCount");
  let lbList = [], lbIndex = 0;
  const lbIsOpen = () => lb.classList.contains("open");
  function lbShow(i) {
    lbIndex = (i + lbList.length) % lbList.length;
    const src = lbList[lbIndex];
    lbImg.classList.remove("ready");
    lbImg.onload = () => lbImg.classList.add("ready");
    lbImg.src = src.currentSrc || src.src;
    lbImg.alt = src.alt;
    lbCap.textContent = src.dataset.cap || "";
    lbCount.textContent = `${String(lbIndex + 1).padStart(2, "0")} / ${String(lbList.length).padStart(2, "0")}`;
    const many = lbList.length > 1 ? "visible" : "hidden";
    $("#lbPrev").style.visibility = many;
    $("#lbNext").style.visibility = many;
  }
  function lbOpenAt(img) {
    lbList = [...pageInner.querySelectorAll(".shot.has-media img, [data-zoom] img")];
    if (!lbList.length) return;
    lb.classList.add("open");
    lb.setAttribute("aria-hidden", "false");
    if (lenis) lenis.stop(); // the page behind stays put
    lbShow(Math.max(0, lbList.indexOf(img)));
    $("#lbClose").focus({ preventScroll: true });
  }
  function lbClose() {
    if (lenis) lenis.start();
    lb.classList.remove("open");
    lb.setAttribute("aria-hidden", "true");
  }
  pageInner.addEventListener("click", (e) => {
    const fig = e.target.closest(".shot.has-media, [data-zoom]");
    if (fig && fig.querySelector("img")) lbOpenAt(fig.querySelector("img"));
  });
  $("#lbClose").addEventListener("click", lbClose);
  $("#lbPrev").addEventListener("click", () => lbShow(lbIndex - 1));
  $("#lbNext").addEventListener("click", () => lbShow(lbIndex + 1));
  lb.addEventListener("click", (e) => { if (e.target === lb) lbClose(); });
  addEventListener("keydown", (e) => {
    if (!lbIsOpen()) return;
    if (e.key === "Escape") lbClose();
    else if (e.key === "ArrowRight") lbShow(lbIndex + 1);
    else if (e.key === "ArrowLeft") lbShow(lbIndex - 1);
    else return;
    e.preventDefault();
    e.stopImmediatePropagation();
  }, true);

  // what it is, who it is for, what I did: for whoever reads only the top of the page
  function tldrHTML(p) {
    const s = p.summary;
    if (!s) return "";
    return `
      <aside class="tldr r" aria-label="${T("En síntesis", "In brief")}">
        <span class="tldr-k">${T("En síntesis", "In brief")}</span>
        <dl>
          <div><dt>${T("Qué es", "What")}</dt><dd>${esc(s.what)}</dd></div>
          <div><dt>${T("Para quién", "For whom")}</dt><dd>${esc(s.who)}</dd></div>
          <div><dt>${T("Mi parte", "My part")}</dt><dd>${esc(s.me)}</dd></div>
        </dl>
      </aside>`;
  }

  function availHTML() {
    if (!SITE.availability) return "";
    // the hours, and the way to take one of them
    const book = SITE.calendly ? `<a class="avail-book" href="${esc(SITE.calendly)}" target="_blank" rel="noopener">${T("Reservar una llamada", "Book a call")} ↗</a>` : "";
    return `<p class="avail r"><i></i>${esc(SITE.availability)}${book}</p>`;
  }

  function projectHTML(i) {
    const p = P[i];
    let ni = (i + 1) % P.length;
    if (P[ni].kind === "cv") ni = (ni + 1) % P.length; // the CV is a PDF, not a page: "next" skips it
    const next = `<button class="next r" data-next="${ni}"><span>${T("Siguiente", "Next")} — ${pad(ni)}</span><strong>${esc(P[ni].title)}</strong></button>`;
    if (p.kind === "about") return aboutHTML() + next;
    if (p.kind === "contact") return contactHTML() + next;
    const L = p.layout && window.LAYOUTS && window.LAYOUTS[p.layout];
    if (L) {
      return tldrHTML(p) + L.render(p, i, { esc, pad }) +
        `<button class="next r" data-next="${ni}"><span>${T("Siguiente", "Next")} — ${pad(ni)}</span><strong>${esc(P[ni].title)}</strong></button>`;
    }
    return `
      <header class="ph">
        <div class="ph-code r"><b>PROJECT ${pad(i)}</b><span>/</span><span>${esc(p.category)}</span></div>
        <h1 class="ph-title r">${esc(p.title)}</h1>
        <div class="neon-line r"></div>
        <dl class="ph-meta r">
          <div><dt>${T("Año", "Year")}</dt><dd>${esc(p.year)}</dd></div>
          <div><dt>${T("Rol", "Role")}</dt><dd>${esc(p.role)}</dd></div>
          <div><dt>${T("Disciplina", "Discipline")}</dt><dd>${p.tags.map(esc).join(" / ")}</dd></div>
        </dl>
      </header>
      ${tldrHTML(p)}
      <p class="lead r">${esc(p.intro)}</p>
      ${videoBlock(p)}
      <div class="r">${shots(p, 0, 1)}</div>
      ${p.sections.map((s) => `<section class="block r"><h2>${esc(s.heading)}</h2><p>${esc(s.text)}</p></section>`).join("")}
      <div class="shots-2 r">${shots(p, 1, 2)}</div>
      <div class="gallery">${shots(p, 3, 9, true)}</div>
      <button class="next r" data-next="${ni}"><span>${T("Siguiente", "Next")} — ${pad(ni)}</span><strong>${esc(P[ni].title)}</strong></button>`;
  }

  function aboutHTML() {
    const portrait = SITE.portrait
      ? `<figure class="about-portrait r" data-src="${esc(SITE.portrait)}" aria-label="${esc(SITE.name)}">
          <div class="about-photo"><img src="${esc(SITE.portrait)}" alt="${esc(SITE.name)}"><i class="about-scan"></i></div>
          <figcaption><span>${esc(SITE.name)}</span><span>${T("Diseñador de producto", "Product Designer")}</span></figcaption>
        </figure>`
      : "";
    return `
      <section class="about">
        <div class="about-text">
          <div class="ph-code r"><b>${T("Sobre mí", "About")}</b><span>/</span><span>${esc(SITE.name)}</span></div>
          <h1 class="about-title r">${esc(SITE.aboutTitle)}</h1>
          <div class="neon-line r"></div>
          <p class="about-lead r">${esc(SITE.about).replace(/\n/g, "<br>")}</p>
          ${availHTML()}
        </div>
        ${portrait}
      </section>
      <section class="block r"><h2>${T("Disciplinas", "Disciplines")}</h2><p>${SITE.disciplines.map(esc).join("<br>")}</p></section>
      <section class="block r"><h2>${T("Herramientas", "Tools")}</h2><p>${SITE.tools.map(esc).join(" · ")}</p></section>
      <section class="odds r" id="odds"></section>`;
  }

  function contactHTML() {
    const card = (href, corner, label, value, ext) => `
      <a class="card r" href="${esc(href)}"${ext ? ' target="_blank" rel="noopener"' : ""}>
        <span class="card-inner">
          <span class="card-back"><i>C·I·C</i></span>
          <span class="card-front">
            <span class="card-corner">${corner}</span>
            <small>${label}</small>
            <b>${value}</b>
            <span class="card-corner is-bottom">${corner}</span>
          </span>
        </span>
      </a>`;
    const rows = `<div class="cards">${[
      SITE.email && card(`mailto:${SITE.email}`, "@", T("Correo", "Email"), esc(SITE.email), false),
      SITE.linkedin && card(SITE.linkedin, "in", "LinkedIn", T("Perfil ↗", "Profile ↗"), true),
      SITE.cv && card(SITE.cv, "CV", T("Currículum", "Curriculum"), T("Abrir PDF ↗", "Open PDF ↗"), true),
    ].filter(Boolean).join("")}</div>`;
    const title = esc(SITE.contactTitle || "Let’s talk.").replace(/\n/g, "<br>");
    return `
      <section class="contact">
        ${availHTML()}
        <h1 class="contact-title r">${title}</h1>
        <div class="neon-line r"></div>
        ${rows}
        <a class="print-link r" href="print.html" target="_blank" rel="noopener"><span>${T("¿Prefieres papel?", "Prefer paper?")}</span>${T("Versión imprimible", "Printable version")} ↗</a>
        <p class="fine r">${T("Ningún dado fue dañado en el diseño de esta web.", "No dice were harmed in the making of this website.")}</p>
      </section>`;
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
    if (!b || !b.dataset.open || !introDone) return;
    const kind = b.dataset.open;
    if (kind === "projects") { if (overlay === "project") exitProject(); else if (overlay) closePage(); return; }
    if (S.mode === "enter" || S.mode === "exit") return;
    if (overlay === "project") { S.mode = "idle"; S.camZ = baseZ; }
    hideInfo();
    const face = P.findIndex((p) => p.kind === kind);
    if (face >= 0) { openFace(face); return; }
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

  function printAt(e) {
    ndc.set((e.clientX / innerWidth) * 2 - 1, -(e.clientY / innerHeight) * 2 + 1);
    ray.setFromCamera(ndc, camera);
    const hit = ray.intersectObject(die, false)[0];
    if (hit && hit.uv && hit.face) pressPrint(hit.face.materialIndex, hit.uv);
  }
  let drag = null;
  canvas.addEventListener("pointerdown", (e) => {
    if (overlay || !introDone || !["idle", "lock", "turn", "ghost"].includes(S.mode)) return;
    if (!hitDie(e)) return;
    if (S.mode === "ghost") { materialize(); S.mode = "idle"; S.y = basePos.y; }
    const now = performance.now();
    drag = { x: e.clientX, y: e.clientY, t: now, lt: now, vx: 0, vy: 0, moved: 0, hadInfo: hasInfo && S.mode === "idle", lastPrint: 0 };
    printAt(e);
    S.mode = "drag";
    canvas.setPointerCapture(e.pointerId);
    canvas.style.cursor = "grabbing";
  });

  canvas.addEventListener("pointermove", (e) => {
    if (!drag) {
      hovering = !overlay && introDone && hitDie(e);
      canvas.style.cursor = hovering ? (hasInfo ? "pointer" : "grab") : "default";
      return;
    }
    const now = performance.now();
    const dx = e.clientX - drag.x, dy = e.clientY - drag.y;
    drag.x = e.clientX; drag.y = e.clientY;
    drag.moved += Math.abs(dx) + Math.abs(dy);
    if (drag.moved > 6 && hasInfo) { hideInfo(); played(); }
    const len = Math.hypot(dx, dy);
    if (len > 0) {
      tmpQ.setFromAxisAngle(tmpV.set(dy, dx, 0).normalize(), len * 0.0085);
      S.q.premultiply(tmpQ);
    }
    const dtm = Math.max(8, now - drag.lt);
    drag.vx = lerp(drag.vx, (dx / dtm) * 1000, 0.45);
    drag.vy = lerp(drag.vy, (dy / dtm) * 1000, 0.45);
    drag.lt = now;
    if (now - drag.lastPrint > 45) { drag.lastPrint = now; printAt(e); }
  });

  function release() {
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
    if (speed < 280) { startLock(0.22); return; } // a gentle release: it settles, then floats again
    // throw: the drag direction becomes the throw, the die spins in that direction
    const k = 0.0028;
    const v = new V3(clamp(d.vx * k, -5, 5), clamp(2.5 - d.vy * k, 1.5, 6), rand(-0.6, 0.3));
    const w = new V3(d.vy * 0.006, d.vx * 0.004, -d.vx * 0.006 + rand(-1, 1));
    w.multiplyScalar(clamp(w.length(), 5, 16) / Math.max(w.length(), 1e-3));
    launchFromHere(v, w);
  }
  canvas.addEventListener("pointerup", release);
  canvas.addEventListener("pointercancel", release);
  canvas.addEventListener("pointerleave", () => { if (!drag) hovering = false; });

  let wheelAcc = 0, lastWheel = 0;
  addEventListener("wheel", (e) => {
    if (overlay || S.mode !== "idle" || !introDone) return;
    const now = performance.now();
    wheelAcc += e.deltaY;
    if (Math.abs(wheelAcc) > 60 && now - lastWheel > 900) {
      goTo((S.active + (wheelAcc > 0 ? 1 : -1) + P.length) % P.length);
      lastWheel = now;
      wheelAcc = 0;
    }
  }, { passive: true });

  addEventListener("keydown", (e) => {
    if (!introDone) return;
    if (e.key === "Escape") {
      if (overlay === "project") exitProject();
      else if (overlay) closePage();
      return;
    }
    if (overlay) return;
    if (e.target.closest && e.target.closest("button, a") && (e.key === "Enter" || e.key === " ")) return;
    if (e.key === " ") { e.preventDefault(); if (S.mode === "ghost") { materialize(); S.mode = "idle"; } randomThrow(); }
    else if (e.key === "Enter") enterProject();
    else if (e.key === "ArrowRight" || e.key === "ArrowDown") goTo((S.active + 1) % P.length);
    else if (e.key === "ArrowLeft" || e.key === "ArrowUp") goTo((S.active - 1 + P.length) % P.length);
    else if (/^[1-6]$/.test(e.key)) goTo(+e.key - 1);
  });

  /* ---------- intro: 000 → 100, then the first throw ---------- */
  const loader = $("#loader"), loaderCount = $("#loaderCount"), loaderLine = $("#loaderLine");
  let loadStart = performance.now(), loadShown = 0;
  pivot.visible = false;

  /* ============================================================
     THE HAND — a skeletal hand in solid ivory bone, lit like the
     die. It sweeps in from the right holding the die, winds up,
     tosses it and flicks away. Built procedurally (anatomy in cm);
     the grip is solved so every bone rests on the die.
     ============================================================ */
  const CM = 0.34; // hand units: centimetres → world
  const HAND_MAT = new THREE.MeshPhysicalMaterial({
    color: 0xe6dfd2,
    roughness: 0.58,
    metalness: 0,
    clearcoat: 0.15,
    clearcoatRoughness: 0.5,
    sheen: 0.4,
    sheenRoughness: 0.8,
    sheenColor: new THREE.Color(0xfff8ec),
  });

  // a long bone along -y: slender shaft, flared ends (condyles), rounded caps
  const boneGeoCache = {};
  function boneGeo(L, r) {
    const key = `${L.toFixed(3)}_${r.toFixed(3)}`;
    if (boneGeoCache[key]) return boneGeoCache[key];
    const pts = [];
    pts.push(new THREE.Vector2(0, r * 0.62));
    pts.push(new THREE.Vector2(r * 0.62, r * 0.48));
    pts.push(new THREE.Vector2(r * 0.95, r * 0.12));
    const N = 18;
    for (let i = 0; i < N; i++) {
      const t = i / (N - 1), k = Math.abs(2 * t - 1);
      pts.push(new THREE.Vector2(r * (0.5 + 0.5 * Math.pow(k, 2.6)), -t * L));
    }
    pts.push(new THREE.Vector2(r * 0.9, -L - r * 0.12));
    pts.push(new THREE.Vector2(r * 0.6, -L - r * 0.46));
    pts.push(new THREE.Vector2(0, -L - r * 0.6));
    pts.reverse(); // bottom → top: outward normals
    const g = new THREE.LatheGeometry(pts, 18);
    g.computeVertexNormals();
    return (boneGeoCache[key] = g);
  }
  function addBone(parent, L, r) {
    const m = new THREE.Mesh(boneGeo(L * CM, r * CM), HAND_MAT);
    m.scale.z = 0.88;
    m.castShadow = true;
    parent.add(m);
    return m;
  }

  const hand = new THREE.Group();
  hand.visible = false;
  scene.add(hand);
  const palm = new THREE.Group(); // wrist origin; fingers point down (-y), palm faces +z
  hand.add(palm);

  // forearm: radius & ulna, running up and out of frame
  [[-1.0, 1.15, 0.0], [1.3, 0.9, -0.15]].forEach(([x, r, tilt]) => {
    const g = new THREE.Group();
    g.position.set(x * CM, 22 * CM, 0);
    g.rotation.z = tilt * 0.1;
    palm.add(g);
    addBone(g, 21.5, r);
  });
  // carpals: eight small rounded bones in two rows
  [[-1.6, -0.5, 0.75], [-0.45, -0.4, 0.7], [0.7, -0.45, 0.68], [1.75, -0.6, 0.6],
   [-1.8, -1.9, 0.72], [-0.6, -2.05, 0.74], [0.6, -2.05, 0.72], [1.75, -1.85, 0.66]].forEach(([x, y, r]) => {
    const c = new THREE.Mesh(new THREE.SphereGeometry(r * CM, 18, 14), HAND_MAT);
    c.position.set(x * CM, y * CM, 0);
    c.scale.set(1, 0.82, 0.85);
    c.castShadow = true;
    palm.add(c);
  });

  // digits: base on the carpus (cm), outward splay (rad), lengths (meta, prox, mid, dist), bone radii
  const DIGITS = [
    { name: "thumb", base: [-2.0, -2.5], splay: -0.6, L: [4.6, 3.2, 2.5], R: [0.62, 0.55, 0.48] },
    { name: "index", base: [-1.2, -3.0], splay: -0.1, L: [6.8, 4.1, 2.4, 1.9], R: [0.56, 0.5, 0.44, 0.38] },
    { name: "middle", base: [0.05, -3.1], splay: 0.0, L: [6.5, 4.6, 2.8, 2.0], R: [0.58, 0.52, 0.46, 0.39] },
    { name: "ring", base: [1.15, -3.0], splay: 0.1, L: [5.9, 4.3, 2.7, 1.9], R: [0.54, 0.49, 0.43, 0.37] },
    { name: "little", base: [2.1, -2.8], splay: 0.22, L: [5.3, 3.4, 2.0, 1.8], R: [0.48, 0.44, 0.38, 0.33] },
  ];
  const GAP = 0.32;
  DIGITS.forEach((d) => {
    const root = new THREE.Group();
    root.position.set(d.base[0] * CM, d.base[1] * CM, 0);
    // thumb: rolled so it curls across and in front of the palm (opposition)
    if (d.name === "thumb") root.rotation.set(0, 0.95, d.splay, "ZYX");
    else root.rotation.z = d.splay;
    palm.add(root);
    d.root = root;
    d.joints = [];
    let parent = root;
    d.L.forEach((L, k) => {
      const j = new THREE.Group();
      if (k > 0) j.position.y = -(d.L[k - 1] + GAP) * CM;
      parent.add(j);
      addBone(j, L, d.R[k]);
      d.joints.push(j);
      parent = j;
    });
  });
  // the radius used by the grip solver for each bone
  DIGITS.forEach((d) => (d.Rsolve = d.R.slice()));

  // curl: 0 = open hand, 1 = gripping the die (per joint angles, in radians).
  // GRIP is solved at start (solveGrip): each joint curls until the finger touches the die.
  const GRIP = {
    thumb: [0.25, 0.55, 0.6],
    index: [0.05, 0.95, 1.15, 0.6],
    middle: [0.05, 1.0, 1.2, 0.65],
    ring: [0.05, 1.05, 1.2, 0.6],
    little: [0.05, 1.1, 1.15, 0.55],
  };
  const MAX_CURL = {
    thumb: [0.9, 1.1, 1.0],
    index: [0.1, 1.5, 1.7, 1.2],
    middle: [0.1, 1.5, 1.7, 1.2],
    ring: [0.1, 1.5, 1.7, 1.2],
    little: [0.1, 1.5, 1.7, 1.2],
  };
  const OPEN = {
    thumb: [0.1, 0.12, 0.08],
    index: [0, 0.12, 0.08, 0.04],
    middle: [0, 0.1, 0.08, 0.04],
    ring: [0, 0.12, 0.1, 0.05],
    little: [0, 0.16, 0.12, 0.06],
  };
  // gripOf(digitIndex) → 0 open … 1 gripping; fingers can open one after another
  function poseHand(gripOf, spread) {
    DIGITS.forEach((d, di) => {
      const g = gripOf(di);
      d.root.rotation.z = d.splay * (1 + spread * 0.7);
      d.joints.forEach((j, k) => {
        j.rotation.x = -lerp(OPEN[d.name][k], GRIP[d.name][k], g); // curl towards the camera
      });
    });
  }

  // where the die sits in the grip (hand-local cm): cradled in the curl of the fingers,
  // its back face resting along the proximal phalanges
  const DIE_HALF_CM = SIZE / 2 / CM;
  const dieAnchor = new THREE.Object3D();
  dieAnchor.position.set(0.3 * CM, -7.4 * CM, (0.75 + DIE_HALF_CM) * CM);
  palm.add(dieAnchor);
  const HOLD_LOCAL = new Q().setFromEuler(new THREE.Euler(0, 0, 0.08));

  // curl every joint, from the knuckle out, until the finger meets the die — never through it
  function solveGrip() {
    const p = new V3(), inv = HOLD_LOCAL.clone().invert();
    hand.position.set(0, 0, 0);
    hand.quaternion.identity();
    const c = dieAnchor.position; // palm == hand space while the hand is at identity
    const touches = (d, from) => {
      hand.updateMatrixWorld(true);
      for (let k = from; k < d.joints.length; k++) {
        const L = d.L[k] * CM, r = d.Rsolve[k] * CM * 1.04, lim = SIZE / 2 + r;
        for (let s = 0; s <= 10; s++) {
          p.set(0, -L * (s / 10) - (s === 10 ? r * 0.5 : 0), 0);
          d.joints[k].localToWorld(p);
          p.sub(c).applyQuaternion(inv);
          if (L > 0.01 && Math.abs(p.x) < lim && Math.abs(p.y) < lim && Math.abs(p.z) < lim) return true;
        }
      }
      return false;
    };
    DIGITS.forEach((d) => {
      d.root.rotation.z = d.splay;
      const open = OPEN[d.name], max = MAX_CURL[d.name];
      d.joints.forEach((j, k) => (j.rotation.x = -open[k]));
      const sol = open.slice();
      for (let k = 0; k < d.joints.length; k++) {
        let a = open[k];
        while (a + 0.02 <= max[k]) {
          d.joints[k].rotation.x = -(a + 0.02);
          if (touches(d, k)) break;
          a += 0.02;
        }
        d.joints[k].rotation.x = -a;
        sol[k] = a;
      }
      GRIP[d.name] = sol;
    });
  }

  const X = { t0: 0, released: false, active: false };
  // debug: index.html?xray=0.4 freezes the radiograph at that second
  const XR_PARAM = new URLSearchParams(location.search).get("xray");
  const XR_FREEZE = XR_PARAM != null ? parseFloat(XR_PARAM) : null;
  if (XR_PARAM != null) window.__xr = { hand, pivot, camera, THREE };
  const HAND_REST = new V3();
  const HOLD_AT = new V3(0.9, 0.55, 0.2);           // held in the air, in front of the backdrop
  const HAND_BASE = new THREE.Euler(Math.PI / 2 - 0.08, 0, -Math.PI / 2); // fingers point left, palm faces the floor
  const qBase = new Q(), qMove = new Q(), Z_AXIS = new V3(0, 0, 1);

  // Choreography (seconds). Offsets are world units from the resting hold pose.
  // A smooth Hermite spline runs through the keys, so the motion never stops dead.
  const KEYS = [
    // one continuous gesture, small wrist angles: a rigid skeleton, not a rubber one
    { t: 0.0, v: [5.8, 1.2, -0.2, 0.12, 0.08, -0.05] },   // off-frame right
    { t: 0.66, v: [0.05, 0.02, 0.0, 0.01, 0.0, 0.0] },    // glides in and decelerates
    { t: 0.82, v: [0, 0, 0, 0, 0, 0] },                   // a beat
    { t: 0.97, v: [0.22, -0.3, -0.04, 0.1, -0.05, 0.02] }, // wind-up: dips, wrist cocks back
    { t: 1.16, v: [-0.55, 0.62, 0.08, -0.16, 0.06, -0.02] }, // the toss: up and forward
    { t: 1.32, v: [-0.48, 0.78, 0.04, -0.1, 0.03, -0.01] }, // follow-through, rising
    { t: 2.0, v: [6.2, 1.4, -0.2, 0.1, 0.06, 0.03] },     // withdraws to the right
  ];
  const CH = 6;
  const XR_END = 2.1;
  const RELEASE_AT = 1.09;
  const OPEN_AT = 1.03;

  function sampleKeys(t, out) {
    const n = KEYS.length;
    if (t <= KEYS[0].t) { for (let c = 0; c < CH; c++) out[c] = KEYS[0].v[c]; return out; }
    if (t >= KEYS[n - 1].t) { for (let c = 0; c < CH; c++) out[c] = KEYS[n - 1].v[c]; return out; }
    let i = 0;
    while (t > KEYS[i + 1].t) i++;
    const k0 = KEYS[i], k1 = KEYS[i + 1], h = k1.t - k0.t, u = (t - k0.t) / h;
    const h00 = 2 * u ** 3 - 3 * u ** 2 + 1, h10 = u ** 3 - 2 * u ** 2 + u, h01 = -2 * u ** 3 + 3 * u ** 2, h11 = u ** 3 - u ** 2;
    const tan = (j, c) => (j <= 0 || j >= n - 1 ? 0 : (KEYS[j + 1].v[c] - KEYS[j - 1].v[c]) / (KEYS[j + 1].t - KEYS[j - 1].t));
    for (let c = 0; c < CH; c++) {
      out[c] = h00 * k0.v[c] + h10 * h * tan(i, c) + h01 * k1.v[c] + h11 * h * tan(i + 1, c);
    }
    return out;
  }

  const kv = new Array(CH).fill(0);
  const eMove = new THREE.Euler();
  function placeHand(t) {
    sampleKeys(t, kv);
    hand.position.set(HAND_REST.x + kv[0], HAND_REST.y + kv[1], HAND_REST.z + kv[2]);
    qBase.setFromEuler(HAND_BASE);
    eMove.set(kv[4], kv[5], 0.24 + kv[3], "XYZ");
    qMove.setFromEuler(eMove);
    hand.quaternion.copy(qMove).multiply(qBase);
    // fingers stay locked on the die, then open crisply one after another
    // (a skeleton has no wobble), and settle half-closed as the hand leaves
    const release = (di) => smooth(OPEN_AT + di * 0.012, OPEN_AT + 0.11 + di * 0.012, t);
    poseHand((di) => {
      const opened = lerp(0.02, 0.32, smooth(1.35, XR_END, t));
      return lerp(1, opened, release(di));
    }, smooth(OPEN_AT, OPEN_AT + 0.12, t) * 0.5 * (1 - smooth(1.4, XR_END, t)));
    hand.updateMatrixWorld(true);
  }

  function startXray() {
    // rest pose: solve where the hand must be so the die sits at HOLD_AT
    solveGrip();
    HAND_REST.set(0, 0, 0);
    hand.position.set(0, 0, 0);
    qBase.setFromEuler(HAND_BASE);
    hand.quaternion.copy(qBase);
    poseHand(() => 1, 0);
    hand.updateMatrixWorld(true);
    HAND_REST.copy(HOLD_AT).sub(dieAnchor.getWorldPosition(new V3()));
    hand.visible = true;
    pivot.visible = true;
    S.mode = "hold";
    X.t0 = performance.now();
    X.released = false;
    X.active = true;
    introDone = true;
    body.classList.add("name-landed", "ui-in", "intro-done", "xray-on");
  }

  function releaseDie(t) {
    X.released = true;
    // the die leaves with the hand's own velocity, plus the roll of the fingers
    placeHand(t - 0.03);
    const a = dieAnchor.getWorldPosition(new V3());
    placeHand(t);
    const b = dieAnchor.getWorldPosition(new V3());
    // ballistic: pick the launch so the die rises ~1 unit and lands near the centre
    const vy = 5.6;
    const drop = b.y - REST_Y;                       // height above resting centre
    const T = (vy + Math.sqrt(vy * vy + 2 * -GRAV * drop)) / -GRAV; // time to touch down
    const landX = rand(0.5, 0.9), landZ = rand(-0.2, 0.25);
    const v = new V3((landX - b.x) / T, vy, (landZ - b.z) / T);
    launch(b, v, new V3(rand(-2.5, 2.5), rand(-2, 2), rand(5.5, 7.5))); // tumbling, rolling to the left
  }

  function updateXray(now) {
    if (!X.active) return;
    const t = XR_FREEZE != null ? XR_FREEZE : (now - X.t0) / 1000;
    placeHand(t);

    if (S.mode === "hold") {
      dieAnchor.getWorldPosition(basePos);
      S.q.copy(hand.quaternion).multiply(HOLD_LOCAL);
      if (t >= RELEASE_AT && !X.released) releaseDie(t);
    }
    if (t > XR_END && XR_FREEZE == null) {
      X.active = false;
      hand.visible = false;
      body.classList.remove("xray-on");
    }
  }

  // first visit: the hand. Returning: straight to the object. ?intro forces the hand again.
  const SEEN_KEY = "woblo:intro-seen";
  const RETURNING = false; // the hand plays on every visit

  // deep link: ?project=1 opens that project directly (shareable, and handy for testing)
  const DEEP = (() => {
    const slug = location.pathname.replace(/^\/+|\/+$/g, "");
    const bySlug = slug ? P.findIndex((p) => p.slug === slug) : -1;
    if (bySlug >= 0) return bySlug;
    const n = parseInt(new URLSearchParams(location.search).get("project"), 10);
    return n >= 1 && n <= P.length ? n - 1 : null;
  })();

  function introThrow() {
    if (DEEP != null) {
      pivot.visible = true;
      S.active = DEEP;
      S.q.copy(FACES[PROJECT_FACE[DEEP]].q);
      S.mode = "project";
      S.camZ = 3.3;
      introDone = true;
      body.classList.add("name-landed", "ui-in", "intro-done");
      setIndex(DEEP);
      openPage(projectHTML(DEEP), "project", `FACE ${pad(DEEP)} / 06`);
      return;
    }
    if (reduce) {
      // no theatre: the die simply drops in
      pivot.visible = true;
      S.q.setFromEuler(new THREE.Euler(0.4, 0.6, 0.2));
      launch(new V3(0, 1.5, 0.4), new V3(0.6, 0, 0.3), new V3(-2, 1, -3));
      introDone = true;
      body.classList.add("name-landed", "ui-in", "intro-done");
      return;
    }
    // returning visitors: no hand — the object is already there, it rises and presents 01
    if (RETURNING) {
      pivot.visible = true;
      S.from.setFromEuler(new THREE.Euler(-0.5, 0.9, 0.25));
      S.q.copy(S.from);
      S.to.copy(FACES[PROJECT_FACE[0]].q);
      S.target = 0;
      S.p0.set(0, -0.7, 0);
      S.mode = "present";
      S.t0 = performance.now();
      S.dur = 1500;
      S.shown = false;
      introDone = true;
      body.classList.add("name-landed", "ui-in", "intro-done");
      return;
    }
    try { localStorage.setItem(SEEN_KEY, "1"); } catch (e) { /* private mode: fine */ }
    startGhost();
  }

  function runLoader(rawDt) {
    const target = clamp((performance.now() - loadStart) / (RETURNING ? 700 : 1500), 0, fontsReady ? 1 : 0.92);
    loadShown = Math.min(target, loadShown + rawDt * (RETURNING ? 2.8 : 1.6));
    loaderCount.textContent = String(Math.round(loadShown * 100)).padStart(3, "0");
    loaderLine.style.transform = `scaleX(${loadShown})`;
    if (loadShown >= 1) {
      S.mode = "waiting";
      introStarted = true;
      loader.classList.add("done");
      setTimeout(introThrow, reduce ? 0 : RETURNING ? 450 : 900);
    }
  }

  /* ============================================================
     APPARITION — the die appears inside the light, in fragments.
     A broken line of light, a narrow beam that reveals pieces of its
     faces, edges that are never all visible at once (the back ones
     seen through it), engraving that arrives a moment later, and one
     faint echo of where it just was. It floats without support until
     you take it: then it gathers itself and becomes a physical object.
     ============================================================ */
  const G = { active: false, t0: 0, solid: 1, solidTarget: 1, materializing: false };
  const ghostLine = $("#ghostLine");

  // a narrow beam orbiting the object: only what it touches has volume
  const beam = new THREE.SpotLight(0xffffff, 0, 14, 0.13, 0.75, 1.1);
  beam.target = pivot;
  scene.add(beam);

  // edges that come and go; the back ones show through, much fainter
  const edgeGeo = new THREE.EdgesGeometry(new THREE.BoxGeometry(SIZE * 1.003, SIZE * 1.003, SIZE * 1.003));
  const edgeMat = new THREE.ShaderMaterial({
    uniforms: { uTime: { value: 0 }, uOpacity: { value: 0 } },
    vertexShader: `
      varying vec3 vLocal; varying float vDepth;
      void main() {
        vLocal = position;
        vec4 mv = modelViewMatrix * vec4(position, 1.0);
        vec4 c = modelViewMatrix * vec4(0.0, 0.0, 0.0, 1.0);
        vDepth = mv.z - c.z; // > 0: in front of the centre, < 0: behind
        gl_Position = projectionMatrix * mv;
      }`,
    fragmentShader: `
      uniform float uTime; uniform float uOpacity;
      varying vec3 vLocal; varying float vDepth;
      void main() {
        float w = 0.5 + 0.5 * sin(dot(vLocal, vec3(1.7, 1.1, 1.4)) * 1.35 + uTime * 0.9)
                * cos(dot(vLocal, vec3(-0.9, 1.6, 0.7)) * 0.8 - uTime * 0.55);
        float lit = smoothstep(0.45, 0.85, w);          // never the whole contour at once
        float front = smoothstep(-0.6, 0.6, vDepth);    // back edges: light passing through
        float a = lit * mix(0.18, 1.0, front) * uOpacity;
        gl_FragColor = vec4(vec3(1.0), a);
      }`,
    transparent: true, depthWrite: false, depthTest: false, blending: THREE.AdditiveBlending,
  });
  const edges = new THREE.LineSegments(edgeGeo, edgeMat);
  edges.renderOrder = 20;
  die.add(edges);

  // the late reflection: one faint echo that keeps the previous pose
  const echoMat = new THREE.LineBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0, depthWrite: false, depthTest: false });
  const echo = new THREE.LineSegments(edgeGeo, echoMat);
  echo.renderOrder = 19;
  scene.add(echo);
  const echoQ = new Q(), echoP = new V3();

  function startGhost() {
    G.active = true;
    G.t0 = performance.now();
    G.solid = 0;
    G.solidTarget = 0;
    G.materializing = false;
    pivot.visible = true;
    S.q.setFromEuler(new THREE.Euler(-0.5, 0.85, 0.2));
    S.mode = "ghost";
    echoQ.copy(S.q);
    echoP.set(0, 0, 0);
    introDone = true;
    body.classList.add("name-landed", "ui-in", "intro-done", "ghosting");
    ghostLine.classList.add("on");
  }

  // the key moment: it gathers itself and gains weight under your hand
  function materialize(then) {
    if (!G.active || G.materializing) return;
    G.materializing = true;
    G.solidTarget = 1;
    ghostLine.classList.remove("on");
    body.classList.remove("ghosting");
    if (then) then();
  }

  function updateGhost(now, dt) {
    if (!G.active) return;
    const t = (now - G.t0) / 1000;
    if (G.materializing) G.solid = damp(G.solid, 1, 4.5, dt);
    const ghost = 1 - G.solid;

    // appearance: line first, then the beam finds the object, then the engraving
    const appear = smooth(0.5, 2.6, t);
    edgeMat.uniforms.uTime.value = t;
    edgeMat.uniforms.uOpacity.value = smooth(0.7, 2.2, t) * Math.pow(ghost, 1.5) * (G.materializing ? 1 + 2 * ghost : 1);
    const a = t * 0.38;
    beam.position.set(pivot.position.x + Math.cos(a) * 5, pivot.position.y + 1.2 + Math.sin(a * 0.7) * 2.2, pivot.position.z + Math.sin(a) * 5 + 2.5);
    beam.intensity = 7 * appear * ghost;
    if (t > 3.2 && !G.materializing) ghostLine.classList.remove("on");

    // the echo lags behind, then rejoins
    const lag = G.materializing ? 14 : 5;
    echoQ.slerp(die.quaternion, 1 - Math.exp(-lag * dt));
    echoP.lerp(pivot.position, 1 - Math.exp(-lag * dt));
    echo.quaternion.copy(echoQ);
    echo.position.copy(echoP);
    const moving = die.quaternion.angleTo(echoQ) * 6 + echoP.distanceTo(pivot.position) * 3;
    echoMat.opacity = clamp(moving, 0, 1) * 0.12 * appear * ghost;

    // nobody took it: it gathers itself anyway and shows 01
    if (!G.materializing && t > 9 && S.mode === "ghost") materialize(() => startLock());
    if (G.materializing && G.solid > 0.995) {
      G.solid = 1;
      G.active = false;
      edgeMat.uniforms.uOpacity.value = 0;
      echoMat.opacity = 0;
      beam.intensity = 0;
    }
  }

  function throwPower(power) {
    if (overlay || !["idle", "lock", "turn", "ghost"].includes(S.mode)) return false;
    if (S.mode === "ghost") { materialize(); S.mode = "idle"; }
    played();
    const dir = Math.random() < 0.5 ? -1 : 1;
    launchFromHere(
      new V3(rand(1.2, 2.4) * dir * Math.min(power, 1.25), rand(3.6, 4.4) * power, rand(-0.6, 0.3)),
      new V3(rand(-6, 6) * power, rand(-4, 4) * power, -dir * rand(7, 11) * power)
    );
    return true;
  }
  window.DIE = {
    on: (name, fn) => (bus[name] = bus[name] || []).push(fn),
    goTo: (i) => goTo(i),
    throwPower,
    hitTest: (e) => hitDie(e),
    glow() {
      materials.forEach((m) => { if (m.userData.i === S.active) m.userData.g = 2.4; });
      outlinePulse = 0.6;
    },
    get state() { return { mode: S.mode, active: S.active, overlay, introDone, hasInfo }; },
    projects: P,
  };

  /* ---------- the die notices you: a degree or two towards the pointer ---------- */
  const LOOK = { x: 0, y: 0 };
  let lookAmp = 0, lookX = 0, lookY = 0;
  const lookQ = new Q(), lookE = new THREE.Euler();
  addEventListener("pointermove", (e) => { LOOK.x = (e.clientX / innerWidth) * 2 - 1; LOOK.y = (e.clientY / innerHeight) * 2 - 1; }, { passive: true });

  /* ---------- dust in the light: motes visible only inside the key light's beam ---------- */
  const DUST = 160;
  const dustPos = new Float32Array(DUST * 3), dustSeed = new Float32Array(DUST);
  for (let k = 0; k < DUST; k++) {
    dustPos[k * 3] = (Math.random() - 0.5) * 9;
    dustPos[k * 3 + 1] = Math.random() * 5.5 - 1.6;
    dustPos[k * 3 + 2] = (Math.random() - 0.5) * 5;
    dustSeed[k] = Math.random() * 100;
  }
  const dustGeo = new THREE.BufferGeometry();
  dustGeo.setAttribute("position", new THREE.BufferAttribute(dustPos, 3));
  dustGeo.setAttribute("seed", new THREE.BufferAttribute(dustSeed, 1));
  const dustMat = new THREE.ShaderMaterial({
    uniforms: { uTime: { value: 0 }, uLight: { value: new V3() }, uDir: { value: new V3() }, uAmt: { value: 0 }, uPR: { value: PR } },
    vertexShader: `
      attribute float seed; uniform float uTime; uniform vec3 uLight; uniform vec3 uDir; uniform float uPR;
      varying float vLit;
      void main() {
        vec3 p = position;
        p.x += sin(uTime * 0.11 + seed) * 0.35;
        p.y += sin(uTime * 0.07 + seed * 1.7) * 0.25 + mod(uTime * 0.03 + seed, 1.0) * 0.2;
        p.z += cos(uTime * 0.09 + seed * 0.6) * 0.3;
        vec3 d = p - uLight;
        float along = dot(d, uDir);
        float dist = length(d - uDir * along);       // distance to the beam's axis
        float radius = 0.35 + along * 0.22;          // the beam widens as it travels
        vLit = smoothstep(radius, radius * 0.35, dist) * step(0.0, along);
        vLit *= 0.55 + 0.45 * sin(uTime * 0.8 + seed * 3.0); // they catch the light and lose it
        vec4 mv = modelViewMatrix * vec4(p, 1.0);
        gl_PointSize = uPR * (1.6 + fract(seed) * 1.8) * (6.0 / -mv.z);
        gl_Position = projectionMatrix * mv;
      }`,
    fragmentShader: `
      uniform float uAmt; varying float vLit;
      void main() {
        float r = length(gl_PointCoord - 0.5);
        float a = smoothstep(0.5, 0.0, r) * vLit * uAmt;
        if (a < 0.003) discard;
        gl_FragColor = vec4(vec3(1.0), a);
      }`,
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
  });
  const dust = new THREE.Points(dustGeo, dustMat);
  dust.renderOrder = 6;
  dust.frustumCulled = false;
  scene.add(dust);

  /* ---------- real time: the studio light follows the visitor's hour ---------- */
  (function timeOfDay() {
    const now = new Date();
    const h = now.getHours() + now.getMinutes() / 60;
    // 0 = cool morning light, high; 1 = warm evening light, low
    const warm = clamp((h - 7) / 15, 0, 1) * (h < 5 ? 0 : 1) + (h < 5 ? 1 : 0);
    key.color.setRGB(lerp(0.92, 1.06, warm), lerp(0.97, 0.99, warm), lerp(1.07, 0.88, warm));
    rim.color.setRGB(lerp(0.94, 1.03, warm), 1, lerp(1.06, 0.93, warm));
    key.position.set(lerp(-2, -4.6, warm), lerp(8, 4.2, warm), lerp(3, 4, warm));
    renderer.toneMappingExposure = lerp(1.02, 0.95, warm);
    if (VIP) {
      outlineMat.color.setRGB(0.86, 0.7, 0.42);
      rim.color.setRGB(1.0, 0.95, 0.84); // only a hint of gold in the edge light
    }
  })();

  /* ---------- cursor ---------- */
  const cursorEl = $("#cursor");
  const fine = matchMedia("(hover: hover) and (pointer: fine)").matches;
  const CUR = { x: -100, y: -100, tx: -100, ty: -100, s: 0.1, link: false, seen: false };
  if (fine) {
    document.documentElement.classList.add("has-cursor");
    addEventListener("pointermove", (e) => {
      CUR.tx = e.clientX; CUR.ty = e.clientY;
      if (!CUR.seen) { CUR.x = CUR.tx; CUR.y = CUR.ty; CUR.seen = true; }
      CUR.link = !!(e.target.closest && e.target.closest("a, button, .shot.has-media, [data-zoom]"));
    }, { passive: true });
    document.addEventListener("pointerleave", () => cursorEl.classList.add("is-hidden"));
    document.addEventListener("pointerenter", () => cursorEl.classList.remove("is-hidden"));
  }
  function updateCursor(dt) {
    if (!fine) return;
    CUR.x = CUR.tx; // no lag: the point sits exactly on the pointer
    CUR.y = CUR.ty;
    const overDie = (hovering || drag) && !overlay;
    const target = cursorEl.classList.contains("is-roulette") ? 0.62 : drag ? 0.5 : overDie ? 1 : CUR.link ? 0.42 : 0.1;
    CUR.s = damp(CUR.s, target, 14, dt);
    cursorEl.classList.toggle("is-die", overDie && !drag);
    cursorEl.classList.toggle("is-link", !overDie && CUR.link);
    cursorEl.style.transform = `translate3d(${CUR.x.toFixed(1)}px, ${CUR.y.toFixed(1)}px, 0) scale(${CUR.s.toFixed(3)})`;
  }

  /* ---------- loop ---------- */
  function tick(now) {
    const rawDt = Math.max(0, (now - last) / 1000);
    PERF.sample(rawDt * 1000, now);
    const dt = Math.min(0.033, rawDt);
    last = now;
    time += dt;
    const t = clamp((now - S.t0) / S.dur, 0, 1);

    updateXray(now);
    updateGhost(now, dt);
    fadePrints(dt);
    updateRipples(dt);
    dustMat.uniforms.uTime.value = time;
    dustMat.uniforms.uLight.value.copy(key.position);
    dustMat.uniforms.uDir.value.copy(key.position).negate().normalize();
    dustMat.uniforms.uAmt.value = damp(dustMat.uniforms.uAmt.value, overlay ? 0 : 0.55 * G.solid, 1.5, dt);
    updateCursor(rawDt > 0 ? Math.min(rawDt, 0.05) : 0.016);

    switch (S.mode) {
      case "loading":
        runLoader(rawDt);
        break;
      case "ghost": {
        // suspended in a space without references: a minimal drift and a slow turn
        const tt = (now - G.t0) / 1000;
        tmpQ.setFromAxisAngle(tmpV.set(0.25, 1, 0.15).normalize(), dt * 0.22);
        S.q.premultiply(tmpQ);
        basePos.set(Math.sin(tt * 0.31) * 0.14, Math.sin(tt * 0.43) * 0.1 + 0.05, Math.sin(tt * 0.27) * 0.12);
        break;
      }
      case "hold":
        break; // the hand carries the die (updateXray)
      case "air":
        physics(dt, now);
        basePos.copy(B.p);
        break;
      case "present": {
        // rises from the floor, turns its result towards you, settles into the float
        const lift = easeInOutSine(clamp(t / 0.85, 0, 1));
        const turn = easeInOut(clamp((t - 0.12) / 0.88, 0, 1));
        S.q.slerpQuaternions(S.from, S.to, turn);
        basePos.set(lerp(S.p0.x, 0, lift), lerp(S.p0.y, 0, lift), lerp(S.p0.z, 0, lift));
        // the text comes back while the object is still rising
        if (t >= 0.45 && !S.shown) { S.shown = true; showInfo(S.target); emit("land", { index: S.target }); }
        if (t >= 1) {
          S.q.copy(S.to);
          S.mode = "idle";
          S.y = 0;
        }
        break;
      }
      case "turn":
      case "lock": {
        const e = S.mode === "lock" ? easeOutQuint(t) : easeInOut(t);
        S.q.slerpQuaternions(S.from, S.to, e);
        S.y = S.mode === "turn"
          ? Math.sin(Math.PI * e) * 0.3
          : lerp(S.y0, 0, e) - S.settle * Math.sin(Math.min(1, t * 1.7) * Math.PI) * (1 - t); // weight: a small settle
        if (t >= 1) {
          S.q.copy(S.to);
          S.y = 0;
          S.mode = "idle";
          outlinePulse = 0.25;
          showInfo(S.target);
        }
        basePos.set(0, S.y, 0);
        break;
      }
      case "drag":
        S.y = damp(S.y, 0.2, 8, dt);
        basePos.set(0, S.y, 0);
        break;
      case "enter": {
        const e = easeInOut(t);
        S.camZ = lerp(S.camFrom, S.camTo, e);
        S.flash = 0;
        if (t > 0.78 && !pageOpened) {
          pageOpened = true;
          openPage(projectHTML(S.active), "project", `FACE ${pad(S.active)} / 06`);
        }
        if (t >= 1) S.mode = "project";
        basePos.set(0, 0, 0);
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
        basePos.set(0, 0, 0);
        break;
      }
      case "idle":
        basePos.set(0, S.y, 0);
        break;
    }

    // composition: the object slides aside to make room for the reveal
    const showing = hasInfo && (S.mode === "idle" || S.mode === "present");
    const tx = ["enter", "project"].includes(S.mode) ? 0 : showing && isWide() ? 1.45 : 0;
    const ty = showing && !isWide() ? (camera.aspect < 0.8 ? 0.95 : 0.5) : 0;
    dieX = damp(dieX, tx, 3.6, dt);
    dieY = damp(dieY, ty, 3.6, dt);

    // idle: weightless float, barely breathing
    wobAmp = damp(wobAmp, S.mode === "idle" && !reduce ? 1 : 0, 1.5, dt);
    euler.set(Math.sin(time * 0.55) * 0.03 * wobAmp, Math.sin(time * 0.42) * 0.05 * wobAmp, 0, "XYZ");
    wobQ.setFromEuler(euler);
    lookAmp = damp(lookAmp, S.mode === "idle" && !overlay && !reduce ? 1 : 0, 2, dt);
    lookX = damp(lookX, -LOOK.y * 0.032 * lookAmp, 3, dt);
    lookY = damp(lookY, LOOK.x * 0.04 * lookAmp, 3, dt);
    lookQ.setFromEuler(lookE.set(lookX, lookY, 0));
    die.quaternion.copy(lookQ).multiply(wobQ).multiply(S.q);
    const bob = Math.sin(time * 0.9) * 0.05 * wobAmp;
    pivot.position.set(basePos.x + dieX, basePos.y + bob + dieY, basePos.z);

    // reflection
    pivot.updateMatrixWorld(true);
    mirror.visible = pivot.visible && G.solid > 0.6;
    mirror.matrix.multiplyMatrices(reflectM, die.matrixWorld);
    mirror.matrixWorldNeedsUpdate = true;

    // materials
    materials.forEach((m) => {
      const u = m.userData;
      u.g = damp(u.g, u.target, 3, dt);
      u.dim = damp(u.dim, u.dimTarget, 2.4, dt);
      m.emissiveIntensity = G.active ? u.g * G.solid + 0.16 * smooth(2.4, 4.0, (now - G.t0) / 1000) * (1 - G.solid) : u.g;
      m.color.setScalar(u.dim);
      m.envMapIntensity = (0.25 + 0.75 * u.dim) * (0.015 + 0.985 * G.solid);
      m.clearcoat = 0.55 * u.dim;
    });
    outlinePulse = damp(outlinePulse, 0, 2.2, dt);
    const hoverRim = Math.max(VIP && G.solid > 0.9 ? 0.07 : 0, hovering && (S.mode === "idle" || S.mode === "drag") ? 0.1 : 0);
    outlineMat.opacity = damp(outlineMat.opacity, Math.max(hoverRim, outlinePulse), 6, dt);

    // contact shadow follows the body and softens with height
    const hgt = Math.max(0, pivot.position.y - REST_Y);
    blob.position.set(pivot.position.x, FLOOR_Y + 0.004, pivot.position.z);
    blob.scale.setScalar(1.05 + hgt * 0.35);
    blobMat.opacity = pivot.visible ? (0.7 / (1 + hgt * 1.4)) * G.solid : 0;
    key.intensity = 1.5 * G.solid;
    rim.intensity = 2.2 * (0.15 + 0.85 * G.solid);
    shadowRecvMat.opacity = 0.5 * G.solid;
    outline.visible = G.solid > 0.5;

    // camera
    shake = damp(shake, 0, 8, dt);
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

  requestAnimationFrame(tick);
})();
