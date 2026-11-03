'use strict';
// ---------- Effets visuels : halos, flammes, traînées, ondes, éclairs, cercles magiques ----------
const FX = (() => {
  const { TAU, INK, clamp } = U;
  // sprites de halo par couleur (dégradé radial pré-calculé)
  const sprites = new Map();
  function sprite(color) {
    let c = sprites.get(color);
    if (c) return c;
    c = document.createElement('canvas'); c.width = c.height = 64;
    const g = c.getContext('2d'); const gr = g.createRadialGradient(32, 32, 0, 32, 32, 32);
    gr.addColorStop(0, U.hexA(color, 1)); gr.addColorStop(0.25, U.hexA(color, 0.55)); gr.addColorStop(1, U.hexA(color, 0));
    g.fillStyle = gr; g.fillRect(0, 0, 64, 64);
    sprites.set(color, c);
    return c;
  }
  // halo additif
  function glow(ctx, x, y, r, color, alpha = 0.5) {
    if (r <= 0 || alpha <= 0) return;
    ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = Math.min(1, alpha);
    ctx.drawImage(sprite(color), x - r, y - r, r * 2, r * 2);
    ctx.restore();
  }
  // langue de flamme (pointe vers le haut) ; chaud : 0 orange, 1 blanc, 2 bleu
  function flamme(ctx, x, y, h, w, t, chaud = 0, alpha = 1) {
    const f = Math.sin(t * 17 + x * 0.7) * w * 0.25;
    const ext = chaud >= 2 ? '#3a7ad8' : chaud >= 1 ? '#f0d070' : '#e0642a';
    const mid = chaud >= 2 ? '#8ab8f0' : chaud >= 1 ? '#fff0b0' : '#f0a040';
    const cur = chaud >= 2 ? '#eef6ff' : '#fff6d8';
    ctx.save(); ctx.globalAlpha = alpha;
    const tongue = (hh, ww, col) => { ctx.fillStyle = col; ctx.beginPath(); ctx.moveTo(x + f, y - hh); ctx.quadraticCurveTo(x + ww, y - hh * 0.35, x + ww * 0.55, y); ctx.quadraticCurveTo(x, y + ww * 0.35, x - ww * 0.55, y); ctx.quadraticCurveTo(x - ww, y - hh * 0.35, x + f, y - hh); ctx.fill(); };
    tongue(h, w, ext); tongue(h * 0.68, w * 0.66, mid); tongue(h * 0.38, w * 0.36, cur);
    ctx.restore();
  }
  // traînée en ruban effilé
  function ruban(ctx, pts, color, w, alpha = 0.8) {
    if (!pts || pts.length < 2) return;
    ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.lineCap = 'round'; ctx.strokeStyle = color;
    for (let i = 1; i < pts.length; i++) { const k = i / pts.length; ctx.globalAlpha = alpha * k * k; ctx.lineWidth = w * k; ctx.beginPath(); ctx.moveTo(pts[i - 1][0], pts[i - 1][1]); ctx.lineTo(pts[i][0], pts[i][1]); ctx.stroke(); }
    ctx.restore();
  }
  // onde de choc : anneau d'encre + éclat lumineux
  function onde(ctx, x, y, r, k, color) {
    ctx.save();
    if (k < 0.35) glow(ctx, x, y, r * (0.6 + k), color, (0.35 - k) * 2.2);
    ctx.strokeStyle = color; ctx.globalAlpha = (1 - k) * 0.9; ctx.lineWidth = 4 * (1 - k) + 0.6;
    U.inkCircle(ctx, x, y, r * (0.25 + k * 0.95), 3, 1.6);
    ctx.globalAlpha = (1 - k) * 0.55; ctx.lineWidth = 1.2; U.inkCircle(ctx, x, y, r * (0.1 + k * 0.65), 4, 1.2);
    // rayons
    if (k < 0.5) { ctx.globalAlpha = (0.5 - k) * 1.4; ctx.lineWidth = 1.3; for (let i = 0; i < 8; i++) { const a = i / 8 * TAU + x * 0.01; const r1 = r * (0.2 + k * 0.8), r2 = r1 + r * 0.25; ctx.beginPath(); ctx.moveTo(x + Math.cos(a) * r1, y + Math.sin(a) * r1); ctx.lineTo(x + Math.cos(a) * r2, y + Math.sin(a) * r2); ctx.stroke(); } }
    ctx.restore();
  }
  // éclair ramifié entre deux points ; renvoie les points (pour les réutiliser une image)
  function eclairPts(x1, y1, x2, y2, rough = 0.18, prof = 0) {
    const pts = [[x1, y1]]; const n = Math.max(4, Math.round(Math.hypot(x2 - x1, y2 - y1) / 16));
    const nx = -(y2 - y1), ny = x2 - x1, L = Math.hypot(nx, ny) || 1;
    for (let i = 1; i < n; i++) { const t = i / n; const o = (Math.random() - 0.5) * 2 * rough * Math.hypot(x2 - x1, y2 - y1) * Math.sin(t * Math.PI); pts.push([x1 + (x2 - x1) * t + nx / L * o, y1 + (y2 - y1) * t + ny / L * o]); }
    pts.push([x2, y2]);
    return pts;
  }
  function eclair(ctx, pts, color, w, alpha = 1, branches = null, coeur = '#fffbe8') {
    const trace = (P, lw, col, a) => { ctx.globalAlpha = a; ctx.strokeStyle = col; ctx.lineWidth = lw; ctx.beginPath(); P.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y))); ctx.stroke(); };
    ctx.save(); ctx.lineJoin = 'round'; ctx.lineCap = 'round';
    ctx.globalCompositeOperation = 'lighter';
    trace(pts, w * 3.5, color, alpha * 0.25); if (branches) for (const b of branches) trace(b, w * 2, color, alpha * 0.18);
    trace(pts, w, coeur, alpha); if (branches) for (const b of branches) trace(b, w * 0.55, coeur, alpha * 0.8);
    ctx.restore();
  }
  // cercle magique au sol (ellipse aplatie) pendant le tracé d'un sort
  function cercle(ctx, x, y, r, t, color, k = 1) {
    ctx.save(); ctx.translate(x, y); ctx.scale(1, 0.32);
    glow(ctx, 0, 0, r * 1.3, color, 0.25 * k);
    ctx.strokeStyle = color; ctx.globalAlpha = 0.85 * k; ctx.lineWidth = 2.2;
    ctx.beginPath(); ctx.arc(0, 0, r, 0, TAU); ctx.stroke();
    ctx.lineWidth = 1.2; ctx.beginPath(); ctx.arc(0, 0, r * 0.72, 0, TAU); ctx.stroke();
    ctx.rotate(t * 1.6);
    for (let i = 0; i < 12; i++) { const a = i / 12 * TAU; ctx.beginPath(); ctx.moveTo(Math.cos(a) * r * 0.74, Math.sin(a) * r * 0.74); ctx.lineTo(Math.cos(a) * r * (i % 3 ? 0.86 : 0.98), Math.sin(a) * r * (i % 3 ? 0.86 : 0.98)); ctx.stroke(); }
    for (let i = 0; i < 3; i++) { const a = i / 3 * TAU; ctx.beginPath(); ctx.moveTo(Math.cos(a) * r * 0.72, Math.sin(a) * r * 0.72); ctx.lineTo(Math.cos(a + TAU / 3) * r * 0.72, Math.sin(a + TAU / 3) * r * 0.72); ctx.stroke(); }
    ctx.restore();
  }
  // vignette de bord, encre brûlée
  let vig = null;
  function vignette(ctx, W, H) {
    if (!vig) {
      vig = document.createElement('canvas'); vig.width = W; vig.height = H; const g = vig.getContext('2d');
      const gr = g.createRadialGradient(W / 2, H / 2, Math.min(W, H) * 0.42, W / 2, H / 2, Math.max(W, H) * 0.72);
      gr.addColorStop(0, 'rgba(60,40,20,0)'); gr.addColorStop(1, 'rgba(60,40,20,0.32)'); g.fillStyle = gr; g.fillRect(0, 0, W, H);
    }
    ctx.drawImage(vig, 0, 0);
  }
  // particules : rendu par type
  function particule(ctx, q, t) {
    const a = clamp(q.life / q.max, 0, 1), k = 1 - a;
    switch (q.type) {
      case 'flamme': flamme(ctx, q.x, q.y, q.size * 3.2 * (0.4 + a * 0.6), q.size * 1.5 * (0.4 + a * 0.6), t, q.chaud || 0, Math.min(1, a * 1.6)); glow(ctx, q.x, q.y - q.size, q.size * 4, q.chaud >= 2 ? '#5a90e0' : '#f08a30', a * 0.25); return;
      case 'fumee': { const r = q.size * (1.4 + k * 3.2); ctx.save(); ctx.globalAlpha = a * 0.3; ctx.drawImage(sprite(q.color), q.x - r, q.y - r, r * 2, r * 2); ctx.restore(); return; }
      case 'goutte': { ctx.save(); ctx.globalAlpha = Math.min(1, a * 1.5); ctx.strokeStyle = q.color; ctx.lineCap = 'round'; ctx.lineWidth = q.size * 0.9; ctx.beginPath(); ctx.moveTo(q.x, q.y); ctx.lineTo(q.x - q.vx * 0.025, q.y - q.vy * 0.025); ctx.stroke(); ctx.fillStyle = '#ffffff'; ctx.globalAlpha *= 0.6; ctx.beginPath(); ctx.arc(q.x, q.y, q.size * 0.3, 0, TAU); ctx.fill(); ctx.restore(); return; }
      case 'etincelle': { ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = a; ctx.strokeStyle = q.color; ctx.lineCap = 'round'; ctx.lineWidth = Math.max(1, q.size * 0.6); ctx.beginPath(); ctx.moveTo(q.x, q.y); ctx.lineTo(q.x - q.vx * 0.04, q.y - q.vy * 0.04); ctx.stroke(); ctx.restore(); glow(ctx, q.x, q.y, q.size * 3, q.color, a * 0.5); return; }
      case 'eclat': { ctx.save(); ctx.globalAlpha = Math.min(1, a * 2); ctx.translate(q.x, q.y); ctx.rotate((q.rot || 0) + t * (q.spin || 6)); ctx.fillStyle = q.color; ctx.strokeStyle = INK; ctx.lineWidth = 0.8; ctx.beginPath(); ctx.moveTo(-q.size, -q.size * 0.6); ctx.lineTo(q.size * 0.8, -q.size * 0.9); ctx.lineTo(q.size, q.size * 0.7); ctx.lineTo(-q.size * 0.6, q.size); ctx.closePath(); ctx.fill(); ctx.stroke(); ctx.restore(); return; }
      case 'flocon': { ctx.save(); ctx.globalAlpha = a; ctx.strokeStyle = q.color; ctx.lineWidth = 1; ctx.translate(q.x, q.y); ctx.rotate(t * 1.5 + q.size); for (let i = 0; i < 3; i++) { ctx.rotate(Math.PI / 3); ctx.beginPath(); ctx.moveTo(-q.size, 0); ctx.lineTo(q.size, 0); ctx.stroke(); } ctx.restore(); glow(ctx, q.x, q.y, q.size * 2.5, '#cfe8ff', a * 0.3); return; }
      case 'vent': { ctx.save(); ctx.globalAlpha = a * 0.7; ctx.strokeStyle = q.color; ctx.lineWidth = 1.3; ctx.lineCap = 'round'; const ang = Math.atan2(q.vy, q.vx); ctx.beginPath(); ctx.arc(q.x - Math.cos(ang) * 8, q.y - Math.sin(ang) * 8, 8 + q.size * 2, ang - 0.9, ang + 0.2); ctx.stroke(); ctx.restore(); return; }
      case 'glow': glow(ctx, q.x, q.y, q.size * (2 + k * 2), q.color, a * 0.8); return;
    }
    return false;
  }
  return { glow, flamme, ruban, onde, eclairPts, eclair, cercle, vignette, particule, sprite };
})();
