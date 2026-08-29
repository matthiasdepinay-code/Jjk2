/* =========================================================================
   RITUEL — effets
   Cinq calques de toile empilés. Le sang qu'on prend reste à l'écran.
   ========================================================================= */
(function (root) {
  'use strict';
  const JJK = (root.JJK = root.JJK || {});
  const { clamp, lerp, ease, now, chaos, Rng } = JJK.core;

  const L = {};           /* calques */
  let W = 0, H = 0, DPR = 1;
  let raf = 0, t0 = 0;
  let mounted = false;

  const state = {
    intensity: 0.15,      /* densité du champ d'énergie maudite */
    hue: '#b31217',
    hue2: '#f2c14e',
    shake: 0,
    domain: null,         /* territoire ouvert : { spec, born, sigilSeed, geo } */
    pulses: [],
    slashes: [],
    reduced: false,
    dead: 0,              /* 0..1 : la vue se dégrade quand on meurt */
  };

  /* ---- bruit de valeur, haché : pas de dépendance, déterministe ------ */
  function h2(x, y) {
    let n = Math.imul(x | 0, 374761393) ^ Math.imul(y | 0, 668265263);
    n = Math.imul(n ^ (n >>> 13), 1274126177);
    return ((n ^ (n >>> 16)) >>> 0) / 4294967296;
  }
  function vnoise(x, y) {
    const xi = Math.floor(x), yi = Math.floor(y);
    const xf = x - xi, yf = y - yi;
    const u = xf * xf * (3 - 2 * xf), v = yf * yf * (3 - 2 * yf);
    return lerp(lerp(h2(xi, yi), h2(xi + 1, yi), u),
                lerp(h2(xi, yi + 1), h2(xi + 1, yi + 1), u), v);
  }
  /* champ de vecteurs par gradient tourné : les particules tournoient */
  function flow(x, y, t) {
    const s = 0.0016;
    const a = vnoise(x * s + t * 0.05, y * s) * 6.283185307179586 * 2;
    return a;
  }

  /* ---- montage -------------------------------------------------------- */
  function layer(id, z, cls) {
    let c = document.getElementById(id);
    if (!c) {
      c = document.createElement('canvas');
      c.id = id;
      c.className = 'fx-layer ' + (cls || '');
      c.style.zIndex = String(z);
      document.body.appendChild(c);
    }
    return { c, x: c.getContext('2d') };
  }

  function resize() {
    DPR = Math.min(2, root.devicePixelRatio || 1);
    W = root.innerWidth; H = root.innerHeight;
    ['veil', 'ink', 'dom', 'over'].forEach(k => {
      if (!L[k]) return;
      const keep = (k === 'ink') ? L.ink.c.toDataURL() : null;
      L[k].c.width = Math.floor(W * DPR);
      L[k].c.height = Math.floor(H * DPR);
      L[k].c.style.width = W + 'px';
      L[k].c.style.height = H + 'px';
      L[k].x.setTransform(DPR, 0, 0, DPR, 0, 0);
      if (keep) { const im = new Image(); im.onload = () => L.ink.x.drawImage(im, 0, 0, W, H); im.src = keep; }
    });
    seedParticles();
  }

  let P = [];
  function seedParticles() {
    const target = state.reduced ? 60 : clamp(Math.floor((W * H) / 5200), 90, 420);
    P = [];
    for (let i = 0; i < target; i++) {
      P.push({
        x: chaos.r(0, W), y: chaos.r(0, H),
        v: chaos.r(0.12, 0.85), life: chaos.r(0, 1),
        s: chaos.r(0.4, 2.4), a: chaos.r(0.05, 0.5),
        k: chaos.f() < 0.14 ? 1 : 0,     /* braises dorées */
      });
    }
  }

  function mount() {
    if (mounted) return;
    mounted = true;
    state.reduced = !!(root.matchMedia && root.matchMedia('(prefers-reduced-motion: reduce)').matches);
    L.veil = layer('fx-veil', 0);
    L.ink = layer('fx-ink', 3);
    L.dom = layer('fx-dom', 60, 'is-hidden');
    L.over = layer('fx-over', 70);
    resize();
    root.addEventListener('resize', resize);
    t0 = now();
    loop();
  }

  /* ---- boucle --------------------------------------------------------- */
  function loop() {
    raf = requestAnimationFrame(loop);
    const t = (now() - t0) / 1000;
    drawVeil(t);
    drawOver(t);
    if (state.domain) drawDomain(t);
    applyShake();
  }

  function drawVeil(t) {
    const x = L.veil.x;
    x.clearRect(0, 0, W, H);

    /* halo : une respiration lente au centre */
    const br = 0.5 + 0.5 * Math.sin(t * 0.42);
    const g = x.createRadialGradient(W * 0.5, H * 0.52, 0, W * 0.5, H * 0.52, Math.max(W, H) * 0.72);
    g.addColorStop(0, hexA(state.hue, 0.05 + state.intensity * 0.13 + br * 0.025));
    g.addColorStop(0.45, hexA(state.hue, 0.018 + state.intensity * 0.04));
    g.addColorStop(1, 'rgba(0,0,0,0)');
    x.fillStyle = g; x.fillRect(0, 0, W, H);

    /* particules d'énergie maudite : elles suivent le champ */
    const spd = 0.5 + state.intensity * 2.4;
    for (let i = 0; i < P.length; i++) {
      const p = P[i];
      const a = flow(p.x, p.y, t);
      p.x += Math.cos(a) * p.v * spd;
      p.y += Math.sin(a) * p.v * spd - 0.16 * spd;
      p.life -= 0.0022 * (0.5 + state.intensity);
      if (p.life <= 0 || p.x < -30 || p.x > W + 30 || p.y < -30 || p.y > H + 30) {
        p.x = chaos.r(0, W); p.y = H + chaos.r(0, 60); p.life = 1;
      }
      const al = p.a * p.life * (0.35 + state.intensity * 1.25);
      x.fillStyle = hexA(p.k ? state.hue2 : state.hue, clamp(al, 0, 0.9));
      const s = p.s * (0.6 + state.intensity);
      x.fillRect(p.x, p.y, s, s * (1 + state.intensity * 2.2));
    }

    /* ondes de choc */
    for (let i = state.pulses.length - 1; i >= 0; i--) {
      const pu = state.pulses[i];
      const k = (t - pu.t) / pu.dur;
      if (k >= 1) { state.pulses.splice(i, 1); continue; }
      const r = ease.out(k) * pu.r;
      x.strokeStyle = hexA(pu.col, (1 - k) * 0.75);
      x.lineWidth = clamp((1 - k) * 5 * pu.w, 0.4, 14);
      x.beginPath(); x.arc(pu.x, pu.y, r, 0, 6.283185307179586); x.stroke();
      if (pu.w > 1) {
        x.strokeStyle = hexA('#ffffff', (1 - k) * 0.28);
        x.lineWidth = clamp((1 - k) * 1.6, 0.2, 3);
        x.beginPath(); x.arc(pu.x, pu.y, r * 0.94, 0, 6.283185307179586); x.stroke();
      }
    }
  }

  function drawOver(t) {
    const x = L.over.x;
    x.clearRect(0, 0, W, H);

    /* entailles : traits blancs qui traversent l'écran */
    for (let i = state.slashes.length - 1; i >= 0; i--) {
      const s = state.slashes[i];
      const k = (t - s.t) / s.dur;
      if (k >= 1) { state.slashes.splice(i, 1); continue; }
      const grow = ease.out(clamp(k * 2.4, 0, 1));
      const fade = k < 0.35 ? 1 : 1 - (k - 0.35) / 0.65;
      const cx = W * 0.5, cy = H * 0.5;
      const dx = Math.cos(s.a), dy = Math.sin(s.a);
      const len = Math.max(W, H) * 1.25 * grow;
      x.save();
      x.globalCompositeOperation = 'lighter';
      x.strokeStyle = hexA(s.col, fade * 0.95);
      x.lineWidth = s.w * (1 - k * 0.6);
      x.beginPath();
      x.moveTo(cx - dx * len + s.o * -dy, cy - dy * len + s.o * dx);
      x.lineTo(cx + dx * len + s.o * -dy, cy + dy * len + s.o * dx);
      x.stroke();
      x.restore();
    }

    /* la mort salit l'objectif */
    if (state.dead > 0) {
      const g = x.createRadialGradient(W / 2, H / 2, Math.min(W, H) * (0.42 - state.dead * 0.3),
                                       W / 2, H / 2, Math.max(W, H) * 0.78);
      g.addColorStop(0, 'rgba(0,0,0,0)');
      g.addColorStop(1, 'rgba(0,0,0,' + (0.55 + state.dead * 0.45) + ')');
      x.fillStyle = g; x.fillRect(0, 0, W, H);
    }
  }

  function hexA(hex, a) {
    const h = String(hex || '#b31217').replace('#', '');
    const v = h.length === 3 ? h.split('').map(c => c + c).join('') : h;
    const n = parseInt(v, 16);
    return 'rgba(' + ((n >> 16) & 255) + ',' + ((n >> 8) & 255) + ',' + (n & 255) + ',' + clamp(a, 0, 1) + ')';
  }

  /* ---- secousse ------------------------------------------------------- */
  function applyShake() {
    const s = state.shake;
    const stage = document.getElementById('stage');
    if (!stage) return;
    if (s <= 0.01) { stage.style.transform = ''; state.shake = 0; return; }
    const a = s * 14;
    stage.style.transform = 'translate(' + chaos.r(-a, a).toFixed(2) + 'px,' + chaos.r(-a, a).toFixed(2) + 'px) rotate(' + chaos.r(-a * 0.09, a * 0.09).toFixed(3) + 'deg)';
    state.shake *= 0.88;
  }
  function shake(p) { state.shake = Math.max(state.shake, clamp(p, 0, 1.6)); }

  function pulse(x, y, r, col, w) {
    state.pulses.push({ x: x == null ? W / 2 : x, y: y == null ? H / 2 : y,
      r: r || Math.max(W, H) * 0.5, col: col || state.hue, w: w || 1,
      t: (now() - t0) / 1000, dur: 0.75 + Math.random() * 0.3 });
  }
  function slash(col, n) {
    const t = (now() - t0) / 1000;
    for (let i = 0; i < (n || 1); i++) {
      state.slashes.push({ a: chaos.r(-0.9, 0.9) + (i ? 1.6 : 0), o: chaos.r(-H * 0.22, H * 0.22),
        w: chaos.r(1.5, 5), col: col || '#fff6ee', t: t + i * 0.045, dur: 0.55 });
    }
  }

  /* ---- encre : ce qui coule ne s'efface pas -------------------------- */
  function ink(px, py, amount, col) {
    const x = L.ink.x;
    const cx = px == null ? W * chaos.r(0.2, 0.8) : px;
    const cy = py == null ? H * chaos.r(0.2, 0.8) : py;
    const n = Math.floor(4 + amount * 22);
    for (let i = 0; i < n; i++) {
      const a = chaos.r(0, 6.2832), d = Math.pow(chaos.f(), 1.7) * (30 + amount * 260);
      const r = chaos.r(1, 4 + amount * 16) * (1 - d / (40 + amount * 300));
      if (r <= 0.2) continue;
      x.fillStyle = hexA(col || state.hue, chaos.r(0.05, 0.30) * (0.4 + amount));
      x.beginPath();
      x.ellipse(cx + Math.cos(a) * d, cy + Math.sin(a) * d, r, r * chaos.r(0.6, 1.6), a, 0, 6.2832);
      x.fill();
    }
    /* coulures */
    for (let i = 0; i < Math.floor(amount * 6); i++) {
      const sx = cx + chaos.r(-60, 60), sy = cy + chaos.r(-20, 20);
      const len = chaos.r(20, 60 + amount * 220), w = chaos.r(0.8, 3.2);
      const g = x.createLinearGradient(sx, sy, sx, sy + len);
      g.addColorStop(0, hexA(col || state.hue, 0.28));
      g.addColorStop(1, hexA(col || state.hue, 0));
      x.fillStyle = g; x.fillRect(sx, sy, w, len);
    }
  }
  function inkFade(a) {
    const x = L.ink.x;
    x.save(); x.globalCompositeOperation = 'destination-out';
    x.fillStyle = 'rgba(0,0,0,' + clamp(a, 0, 1) + ')'; x.fillRect(0, 0, W, H); x.restore();
  }
  function inkClear() { L.ink.x.clearRect(0, 0, W, H); }

  /* ---- inversion : le monde se retourne ------------------------------ */
  function invert(ms) {
    document.documentElement.classList.add('is-inverted');
    setTimeout(() => document.documentElement.classList.remove('is-inverted'), ms || 120);
  }
  function flash(col, ms) {
    let f = document.getElementById('fx-flash');
    if (!f) { f = document.createElement('div'); f.id = 'fx-flash'; document.body.appendChild(f); }
    f.style.background = col || '#fff';
    f.style.transition = 'none'; f.style.opacity = '1';
    requestAnimationFrame(() => {
      f.style.transition = 'opacity ' + (ms || 400) + 'ms cubic-bezier(.2,.7,.3,1)';
      f.style.opacity = '0';
    });
  }

  /* ---- le sceau : ta géométrie, et celle de personne d'autre ---------- */
  function sigil(canvas, seed, opts) {
    const o = opts || {};
    const dpr = Math.min(2, root.devicePixelRatio || 1);
    const size = o.size || Math.min(canvas.clientWidth || 320, canvas.clientHeight || 320) || 320;
    canvas.width = Math.floor(size * dpr); canvas.height = Math.floor(size * dpr);
    const x = canvas.getContext('2d');
    x.setTransform(dpr, 0, 0, dpr, 0, 0);
    x.clearRect(0, 0, size, size);
    const R = new Rng('sceau:' + seed);
    const cx = size / 2, cy = size / 2, r = size * 0.44;
    const ink1 = o.ink || '#e9e2d4', ink2 = o.accent || '#b31217';
    x.lineCap = 'round'; x.lineJoin = 'round';

    /* un fond : sans lui, les traits fins flottent sans se tenir */
    const fond = x.createRadialGradient(cx, cy, 0, cx, cy, r * 1.15);
    fond.addColorStop(0, hexA(ink2, 0.14));
    fond.addColorStop(0.62, hexA(ink2, 0.05));
    fond.addColorStop(1, 'rgba(0,0,0,0)');
    x.fillStyle = fond; x.beginPath(); x.arc(cx, cy, r * 1.15, 0, 6.2832); x.fill();

    /* trait tremblé : trois passes légèrement décalées, comme un pinceau */
    function stroke(path, col, w, alpha, passes) {
      for (let p = 0; p < (passes || 3); p++) {
        x.save();
        x.translate(R.range(-0.7, 0.7), R.range(-0.7, 0.7));
        x.strokeStyle = hexA(col, (alpha || 0.9) / (p + 1.15));
        x.lineWidth = w * (1 - p * 0.16);
        x.beginPath(); path(x); x.stroke();
        x.restore();
      }
    }

    /* anneaux */
    const rings = R.intRange(2, 4);
    for (let i = 0; i < rings; i++) {
      const rr = r * (1 - i * R.range(0.09, 0.17));
      const broken = R.chance(0.45);
      stroke(c => {
        if (broken) {
          const seg = R.intRange(3, 9);
          for (let s = 0; s < seg; s++) {
            const a0 = (s / seg) * 6.2832 + R.range(0, 0.3);
            const a1 = a0 + (6.2832 / seg) * R.range(0.35, 0.85);
            c.moveTo(cx + Math.cos(a0) * rr, cy + Math.sin(a0) * rr);
            c.arc(cx, cy, rr, a0, a1);
          }
        } else { c.arc(cx, cy, rr, 0, 6.2832); }
      }, i === 0 ? ink1 : (R.chance(0.5) ? ink2 : ink1), R.range(1.1, 3.0), 0.95);
    }

    /* graduations : l'instrument de mesure d'une loi */
    const ticks = R.intRange(18, 72);
    x.save();
    for (let i = 0; i < ticks; i++) {
      const a = (i / ticks) * 6.2832;
      const long = i % R.intRange(3, 7) === 0;
      const r0 = r * 1.005, r1 = r * (long ? 1.075 : 1.035);
      x.strokeStyle = hexA(long ? ink2 : ink1, long ? 0.8 : 0.35);
      x.lineWidth = long ? 1.6 : 0.8;
      x.beginPath();
      x.moveTo(cx + Math.cos(a) * r0, cy + Math.sin(a) * r0);
      x.lineTo(cx + Math.cos(a) * r1, cy + Math.sin(a) * r1);
      x.stroke();
    }
    x.restore();

    /* polygone étoilé : le cœur de la figure */
    const n = R.intRange(5, 13);
    const step = R.intRange(2, Math.max(2, Math.floor(n / 2)));
    const pr = r * R.range(0.62, 0.86);
    const pts = [];
    const rot = R.range(0, 6.2832);
    for (let i = 0; i < n; i++) {
      const a = rot + (i / n) * 6.2832;
      pts.push([cx + Math.cos(a) * pr, cy + Math.sin(a) * pr]);
    }
    stroke(c => {
      let i = 0;
      c.moveTo(pts[0][0], pts[0][1]);
      for (let k = 0; k < n; k++) { i = (i + step) % n; c.lineTo(pts[i][0], pts[i][1]); }
      c.closePath();
    }, ink1, R.range(1.7, 3.4), 1.0);

    /* cordes secondaires */
    const chords = R.intRange(4, 12);
    for (let i = 0; i < chords; i++) {
      const a = R.pick(pts), b = R.pick(pts);
      stroke(c => { c.moveTo(a[0], a[1]); c.lineTo(b[0], b[1]); }, ink2, R.range(0.8, 2.0), 0.62, 2);
    }

    /* nœuds */
    pts.forEach(p => {
      if (!R.chance(0.7)) return;
      x.fillStyle = hexA(R.chance(0.35) ? ink2 : ink1, 0.85);
      x.beginPath(); x.arc(p[0], p[1], R.range(2.0, 4.8), 0, 6.2832); x.fill();
    });

    /* glyphe central : traits sur une grille, à la manière d'un caractère */
    const gs = size * R.range(0.16, 0.26);
    const gx = cx - gs / 2, gy = cy - gs / 2;
    const cells = R.intRange(3, 5);
    const strokes = R.intRange(7, 13);
    for (let i = 0; i < strokes; i++) {
      const hz = R.chance(0.55);
      const a0 = R.int(cells), b0 = R.int(cells), b1 = R.int(cells);
      const x0 = gx + (hz ? (b0 / (cells - 1)) * gs : (a0 / (cells - 1)) * gs);
      const y0 = gy + (hz ? (a0 / (cells - 1)) * gs : (b0 / (cells - 1)) * gs);
      const x1 = gx + (hz ? (b1 / (cells - 1)) * gs : (a0 / (cells - 1)) * gs);
      const y1 = gy + (hz ? (a0 / (cells - 1)) * gs : (b1 / (cells - 1)) * gs);
      stroke(c => {
        c.moveTo(x0, y0);
        c.quadraticCurveTo((x0 + x1) / 2 + R.range(-4, 4), (y0 + y1) / 2 + R.range(-4, 4), x1, y1);
      }, i === 0 ? ink2 : ink1, R.range(2.6, 6.4), 1.0, 2);
    }

    /* arcs isolés en marge */
    for (let i = 0; i < R.intRange(1, 5); i++) {
      const rr = r * R.range(0.9, 1.12), a0 = R.range(0, 6.2832), a1 = a0 + R.range(0.2, 1.3);
      stroke(c => c.arc(cx, cy, rr, a0, a1), ink2, R.range(0.8, 2.6), 0.6, 2);
    }
    return canvas;
  }

  /* ---- extension du territoire --------------------------------------- */
  function domainGeo(seed) {
    const R = new Rng('territoire:' + seed);
    const pillars = [];
    for (let i = 0; i < R.intRange(7, 16); i++) {
      pillars.push({ x: R.next(), w: R.range(0.01, 0.06), h: R.range(0.25, 0.95), d: R.range(0.15, 1) });
    }
    const rings = [];
    for (let i = 0; i < R.intRange(3, 8); i++) {
      rings.push({ x: R.range(0.05, 0.95), y: R.range(0.05, 0.7), r: R.range(0.03, 0.22), s: R.range(-1, 1), t: R.range(0, 6.28) });
    }
    return { pillars, rings, horizon: R.range(0.55, 0.78), grid: R.intRange(8, 22), tilt: R.range(-0.06, 0.06) };
  }

  function drawDomain(t) {
    const D = state.domain, x = L.dom.x;
    const age = t - D.born;
    const open = clamp(age / 1.6, 0, 1);
    x.clearRect(0, 0, W, H);

    /* fond : le territoire est un intérieur, il n'a pas de ciel */
    x.fillStyle = D.invert ? '#e9e2d4' : '#050506';
    x.globalAlpha = open;
    x.fillRect(0, 0, W, H);
    x.globalAlpha = 1;
    if (open < 1) return;

    const line = D.invert ? '#0a0a0c' : '#e9e2d4';
    const acc = D.accent || '#b31217';
    const g = D.geo, hy = H * g.horizon;

    /* sol en fuite */
    x.strokeStyle = hexA(line, 0.42); x.lineWidth = 1;
    for (let i = 0; i <= g.grid; i++) {
      const k = i / g.grid;
      const y = hy + Math.pow(k, 2.1) * (H - hy) * 1.3;
      x.globalAlpha = 0.85 - k * 0.45;
      x.beginPath(); x.moveTo(-W * 0.2, y); x.lineTo(W * 1.2, y + g.tilt * W); x.stroke();
    }
    for (let i = -6; i <= g.grid + 6; i++) {
      const k = i / g.grid;
      x.globalAlpha = 0.5;
      x.beginPath(); x.moveTo(W * 0.5 + (k - 0.5) * W * 0.35, hy);
      x.lineTo(W * 0.5 + (k - 0.5) * W * 3.2, H * 1.25); x.stroke();
    }
    x.globalAlpha = 1;

    /* l'horizon brûle : c'est la seule source de lumière du lieu */
    const hg = x.createLinearGradient(0, hy - H * 0.16, 0, hy + H * 0.05);
    hg.addColorStop(0, 'rgba(0,0,0,0)');
    hg.addColorStop(1, hexA(acc, D.invert ? 0.14 : 0.24));
    x.fillStyle = hg; x.fillRect(0, hy - H * 0.16, W, H * 0.21);
    x.strokeStyle = hexA(line, 0.85); x.lineWidth = 1.6;
    x.beginPath(); x.moveTo(0, hy); x.lineTo(W, hy + g.tilt * W); x.stroke();

    /* piliers : des colonnes sans toit */
    g.pillars.forEach((p, i) => {
      const px = p.x * W, pw = p.w * W * (0.4 + p.d);
      const ph = p.h * hy * (0.5 + p.d * 0.7);
      const drift = Math.sin(t * 0.12 + i) * 4 * p.d;
      x.fillStyle = D.invert ? 'rgba(233,226,212,.55)' : 'rgba(5,5,6,.72)';
      x.fillRect(px - pw / 2 + drift, hy - ph, pw, ph);
      x.strokeStyle = hexA(line, 0.22 + p.d * 0.55);
      x.lineWidth = 1.2;
      x.strokeRect(px - pw / 2 + drift, hy - ph, pw, ph);
      x.strokeStyle = hexA(acc, 0.28 * p.d);
      x.beginPath(); x.moveTo(px + drift, hy - ph); x.lineTo(px + drift, hy); x.stroke();
    });

    /* anneaux suspendus */
    g.rings.forEach((rg, i) => {
      const rr = rg.r * Math.min(W, H);
      const a = rg.t + t * rg.s * 0.22;
      x.save();
      x.translate(rg.x * W, rg.y * H + Math.sin(t * 0.3 + i) * 6);
      x.rotate(a);
      x.strokeStyle = hexA(i % 3 === 0 ? acc : line, 0.35);
      x.lineWidth = 1.2;
      x.beginPath(); x.ellipse(0, 0, rr, rr * (0.18 + 0.5 * Math.abs(Math.sin(a))), 0, 0, 6.2832); x.stroke();
      x.restore();
    });

    /* le sceau, immense, au fond */
    if (D.sigilCanvas) {
      const s = Math.min(W, H) * 0.86;
      x.save();
      x.globalAlpha = 0.20 + 0.07 * Math.sin(t * 0.5);
      x.translate(W / 2, hy * 0.72);
      x.rotate(t * 0.035);
      x.drawImage(D.sigilCanvas, -s / 2, -s / 2, s, s);
      x.restore();
    }

    /* vignettage : on ne sort pas d'ici par les bords */
    const vg = x.createRadialGradient(W / 2, H / 2, Math.min(W, H) * 0.28, W / 2, H / 2, Math.max(W, H) * 0.8);
    vg.addColorStop(0, 'rgba(0,0,0,0)');
    vg.addColorStop(1, D.invert ? 'rgba(233,226,212,0.78)' : 'rgba(0,0,0,0.80)');
    x.fillStyle = vg; x.fillRect(0, 0, W, H);
  }

  function domainOpen(spec) {
    const t = (now() - t0) / 1000;
    state.domain = {
      born: t, geo: domainGeo(spec.seed || 'x'),
      accent: spec.accent || state.hue,
      invert: !!spec.invert,
      sigilCanvas: spec.sigilCanvas || null,
    };
    L.dom.c.classList.remove('is-hidden');
    document.body.classList.add('in-domain');
  }
  function domainClose() {
    state.domain = null;
    L.dom.c.classList.add('is-hidden');
    L.dom.x.clearRect(0, 0, W, H);
    document.body.classList.remove('in-domain');
  }

  /* ---- machine à écrire ---------------------------------------------- */
  function type(node, text, opts) {
    const o = opts || {};
    const speed = o.speed || 26;
    node.textContent = '';
    node.classList.add('typing');
    let i = 0, stop = false;
    const p = new Promise(res => {
      function step() {
        if (stop) return res();
        if (i >= text.length) { node.classList.remove('typing'); return res(); }
        const ch = text.charAt(i++);
        node.textContent += ch;
        if (o.sound !== false && ch !== ' ' && i % 2 === 0 && JJK.audio) JJK.audio.tick(chaos.r(900, 2200), 0.012, 0.018);
        const pause = /[.,;:!?…—]/.test(ch) ? speed * 9 : (ch === ' ' ? speed * 0.6 : speed);
        setTimeout(step, pause * chaos.r(0.6, 1.5));
      }
      step();
    });
    p.skip = () => { stop = true; node.textContent = text; node.classList.remove('typing'); };
    return p;
  }

  /* ---- l'interface se mutile ------------------------------------------ */
  function mutilate(node, label) {
    if (!node) return;
    node.classList.add('mutilated');
    if (label) node.setAttribute('data-scar', label);
    slash('#b31217', 1);
    if (JJK.audio) JJK.audio.slash();
  }

  function setIntensity(v) { state.intensity = clamp(v, 0, 1); }
  function setHue(a, b) { if (a) state.hue = a; if (b) state.hue2 = b; }
  function setDead(v) { state.dead = clamp(v, 0, 1); }

  JJK.fx = {
    mount, resize, shake, pulse, slash, ink, inkFade, inkClear, invert, flash,
    sigil, domainOpen, domainClose, type, mutilate, setIntensity, setHue, setDead,
    hexA, state,
    get size() { return { W, H }; },
  };
})(window);
