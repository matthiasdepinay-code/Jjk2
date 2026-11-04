'use strict';
// ---------- Utilitaires : maths, aléatoire déterministe, dessin "encre" ----------
const U = (() => {
  const TAU = Math.PI * 2;
  const INK = '#1f1a16';
  const PAPER = '#efe3c4';
  const SEPIA = '#6b4f2a';

  const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
  const lerp = (a, b, t) => a + (b - a) * t;
  const dist = (ax, ay, bx, by) => Math.hypot(bx - ax, by - ay);

  function mulberry32(a) {
    a |= 0;
    return function () {
      a = (a + 0x6d2b79f5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }
  function hash2(x, y) {
    let h = (Math.floor(x) * 374761393 + Math.floor(y) * 668265263) | 0;
    h = Math.imul(h ^ (h >>> 13), 1274126177);
    return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
  }

  // Trait d'encre avec un léger tremblement déterministe (seed)
  function inkLine(ctx, x1, y1, x2, y2, seed = 1, wob = 1.2) {
    const d = Math.hypot(x2 - x1, y2 - y1);
    if (d < 0.001) return;
    const n = Math.max(2, Math.ceil(d / 18));
    const r = mulberry32((seed * 1000 + x1 * 7 + y1 * 13) | 0);
    const nx = -(y2 - y1) / d, ny = (x2 - x1) / d;
    ctx.beginPath();
    ctx.moveTo(x1, y1);
    for (let i = 1; i < n; i++) {
      const t = i / n;
      const o = (r() - 0.5) * 2 * wob;
      ctx.lineTo(lerp(x1, x2, t) + nx * o, lerp(y1, y2, t) + ny * o);
    }
    ctx.lineTo(x2, y2);
    ctx.stroke();
  }

  function inkPolyPath(ctx, pts, seed = 1, wob = 1.2, close = true) {
    const r = mulberry32((seed * 7919) | 0);
    ctx.beginPath();
    const m = pts.length;
    const count = close ? m : m - 1;
    ctx.moveTo(pts[0][0], pts[0][1]);
    for (let k = 0; k < count; k++) {
      const [x1, y1] = pts[k];
      const [x2, y2] = pts[(k + 1) % m];
      const d = Math.hypot(x2 - x1, y2 - y1);
      const n = Math.max(2, Math.ceil(d / 18));
      const nx = -(y2 - y1) / d, ny = (x2 - x1) / d;
      for (let i = 1; i < n; i++) {
        const t = i / n;
        const o = (r() - 0.5) * 2 * wob;
        ctx.lineTo(lerp(x1, x2, t) + nx * o, lerp(y1, y2, t) + ny * o);
      }
      ctx.lineTo(x2, y2);
    }
    if (close) ctx.closePath();
  }
  function inkPoly(ctx, pts, seed = 1, wob = 1.2, close = true) {
    inkPolyPath(ctx, pts, seed, wob, close);
    ctx.stroke();
  }
  function inkRect(ctx, x, y, w, h, seed = 1, wob = 1.2) {
    inkPoly(ctx, [[x, y], [x + w, y], [x + w, y + h], [x, y + h]], seed, wob, true);
  }
  function inkCirclePath(ctx, cx, cy, rad, seed = 1, wob = 1.0) {
    const n = Math.max(14, Math.ceil(rad / 3));
    const r = mulberry32((seed * 3571 + rad * 11) | 0);
    ctx.beginPath();
    for (let i = 0; i <= n; i++) {
      const a = (i / n) * TAU;
      const rr = rad + (i === n ? 0 : (r() - 0.5) * 2 * wob);
      const x = cx + Math.cos(a) * rr, y = cy + Math.sin(a) * rr;
      if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
    }
    ctx.closePath();
  }
  function inkCircle(ctx, cx, cy, rad, seed = 1, wob = 1.0) {
    inkCirclePath(ctx, cx, cy, rad, seed, wob);
    ctx.stroke();
  }

  // Hachures dans un rectangle
  function hatch(ctx, x, y, w, h, spacing = 7, angle = Math.PI / 4, seed = 1, alpha = 0.35, color = INK) {
    ctx.save();
    ctx.beginPath();
    ctx.rect(x, y, w, h);
    ctx.clip();
    ctx.globalAlpha *= alpha;
    ctx.strokeStyle = color;
    ctx.lineWidth = 1;
    const r = mulberry32(seed | 0);
    const diag = Math.hypot(w, h);
    const cx = x + w / 2, cy = y + h / 2;
    const ca = Math.cos(angle), sa = Math.sin(angle);
    const n = Math.ceil(diag / spacing);
    ctx.beginPath();
    for (let i = -n; i <= n; i++) {
      const off = i * spacing + (r() - 0.5) * spacing * 0.5;
      // ligne perpendiculaire à (ca,sa), décalée de off
      const px = cx + -sa * off, py = cy + ca * off;
      ctx.moveTo(px - ca * diag, py - sa * diag);
      ctx.lineTo(px + ca * diag, py + sa * diag);
    }
    ctx.stroke();
    ctx.restore();
  }

  // Grain de parchemin pré-calculé
  function paper(w, h, seed = 3, base = PAPER) {
    const c = document.createElement('canvas');
    c.width = w; c.height = h;
    const g = c.getContext('2d');
    g.fillStyle = base;
    g.fillRect(0, 0, w, h);
    const r = mulberry32(seed);
    // taches
    for (let i = 0; i < (w * h) / 900; i++) {
      const x = r() * w, y = r() * h, rad = 6 + r() * 40;
      const grd = g.createRadialGradient(x, y, 0, x, y, rad);
      grd.addColorStop(0, 'rgba(120,90,40,' + (0.02 + r() * 0.05) + ')');
      grd.addColorStop(1, 'rgba(120,90,40,0)');
      g.fillStyle = grd;
      g.fillRect(x - rad, y - rad, rad * 2, rad * 2);
    }
    // fibres
    g.strokeStyle = 'rgba(90,70,40,0.08)';
    g.lineWidth = 1;
    for (let i = 0; i < (w * h) / 600; i++) {
      const x = r() * w, y = r() * h, a = r() * TAU, l = 3 + r() * 10;
      g.beginPath();
      g.moveTo(x, y);
      g.lineTo(x + Math.cos(a) * l, y + Math.sin(a) * l);
      g.stroke();
    }
    // points
    g.fillStyle = 'rgba(60,40,20,0.10)';
    for (let i = 0; i < (w * h) / 150; i++) {
      g.fillRect(r() * w, r() * h, 1, 1);
    }
    return c;
  }

  function txt(ctx, s, x, y, size = 16, align = 'left', color = INK, font = 'IM Fell English', style = '') {
    ctx.save();
    ctx.fillStyle = color;
    ctx.font = `${style} ${size}px "${font}", Georgia, serif`;
    ctx.textAlign = align;
    ctx.textBaseline = 'middle';
    ctx.fillText(s, x, y);
    ctx.restore();
  }

  function hexA(hex, a) {
    let h = hex.replace('#', '');
    if (h.length === 3 || h.length === 4) h = h.split('').map((c) => c + c).join(''); // la forme courte : #ddd = #dddddd
    const r = parseInt(h.substring(0, 2), 16), g = parseInt(h.substring(2, 4), 16), b = parseInt(h.substring(4, 6), 16);
    return `rgba(${r},${g},${b},${a})`;
  }

  function rectsOverlap(a, b) {
    return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
  }
  function circleRect(cx, cy, r, b) {
    const x = clamp(cx, b.x, b.x + b.w), y = clamp(cy, b.y, b.y + b.h);
    return dist(cx, cy, x, y) <= r;
  }

  return { TAU, INK, PAPER, SEPIA, clamp, lerp, dist, mulberry32, hash2, inkLine, inkPoly, inkPolyPath, inkRect, inkCircle, inkCirclePath, hatch, paper, txt, hexA, rectsOverlap, circleRect };
})();
