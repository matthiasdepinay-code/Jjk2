'use strict';
// ---------- Familiers : une créature par essence, dessinée à l'encre ----------
// Le dessin seul vit ici ; leur comportement est dans world.js (updateFamilier).
const Familiers = (() => {
  const TAU = Math.PI * 2, INK = U.INK;
  const oeil = (ctx, x, y, r = 2.4, iris = INK, fond = '#efe3c4') => { ctx.fillStyle = fond; ctx.beginPath(); ctx.arc(x, y, r, 0, TAU); ctx.fill(); ctx.fillStyle = iris; ctx.beginPath(); ctx.arc(x + r * 0.3, y, r * 0.48, 0, TAU); ctx.fill(); };
  const trait = (ctx, pts, close = false) => { ctx.beginPath(); pts.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y))); if (close) ctx.closePath(); };

  // chaque dessin : repère au pied de la créature, tourné vers la droite (le monde retourne selon c.dir)
  const D = {
    // Salamandre de braise : un lézard couleur de braise, la queue terminée par une flamme
    feu(ctx, c, t, w, h) {
      const pas = Math.abs(c.vx) > 15 ? Math.sin(t * 16) : 0;
      ctx.lineWidth = 1.6;
      for (const [lx, s] of [[-w * 0.2, 1], [w * 0.18, -1]]) { const o = pas * s * 3; trait(ctx, [[lx, -h * 0.35], [lx - 3 + o, -1], [lx - 6 + o, 0]]); ctx.stroke(); trait(ctx, [[lx + 4, -h * 0.35], [lx + 6 - o, -1], [lx + 9 - o, 0]]); ctx.stroke(); }
      // queue
      ctx.lineWidth = 3.2; ctx.strokeStyle = '#a8401c'; ctx.beginPath(); ctx.moveTo(-w * 0.32, -h * 0.5); ctx.quadraticCurveTo(-w * 0.6, -h * 0.25 + pas * 2, -w * 0.78, -h * 0.75); ctx.stroke(); ctx.lineWidth = 1.4; ctx.strokeStyle = c.hurt > 0 ? '#9a2a2a' : INK; ctx.stroke();
      FX.flamme(ctx, -w * 0.8, -h * 0.72, 11, 6, t * 1.3 + c.seed, 0, 0.95);
      // corps et tête
      const g = ctx.createLinearGradient(0, -h, 0, 0); g.addColorStop(0, '#e07a34'); g.addColorStop(1, '#a8401c'); ctx.fillStyle = g;
      ctx.beginPath(); ctx.ellipse(0, -h * 0.48, w * 0.36, h * 0.3, 0, 0, TAU); ctx.fill(); ctx.stroke();
      ctx.beginPath(); ctx.ellipse(w * 0.38, -h * 0.58, w * 0.16, h * 0.24, -0.2, 0, TAU); ctx.fill(); ctx.stroke();
      // taches de braise qui pulsent
      for (let k = 0; k < 4; k++) { ctx.fillStyle = 'rgba(246,208,128,' + (0.55 + 0.4 * Math.sin(t * 5 + k * 1.7)) + ')'; ctx.beginPath(); ctx.arc(-w * 0.22 + k * w * 0.13, -h * 0.6 + (k % 2) * 2, 1.6, 0, TAU); ctx.fill(); }
      ctx.lineWidth = 1; trait(ctx, [[-w * 0.3, -h * 0.75], [-w * 0.15, -h * 0.82], [0, -h * 0.79], [w * 0.15, -h * 0.84]]); ctx.stroke();
      oeil(ctx, w * 0.44, -h * 0.66, 2, '#5a1a0a', '#f6d080');
      if (c.souffle > 0) FX.flamme(ctx, w * 0.62, -h * 0.5, 8, 5, t * 3, 1, c.souffle);
    },
    // Ondine : une goutte qui a une âme, chevelure d'eau, sans pieds
    eau(ctx, c, t, w, h) {
      const fl = Math.sin(t * 3), r = w * 0.42, cy = -h * 0.62;
      ctx.save(); ctx.globalAlpha = 0.9;
      // queue d'eau qui ondule sous elle
      ctx.fillStyle = 'rgba(90,150,210,0.45)'; ctx.strokeStyle = '#2a4a7a'; ctx.lineWidth = 1.3;
      ctx.beginPath(); ctx.moveTo(-r * 0.8, cy + r * 0.5); ctx.quadraticCurveTo(-r * 0.2 + fl * 3, -h * 0.15, -r * 0.6 + fl * 5, 0); ctx.quadraticCurveTo(r * 0.3 + fl * 2, -h * 0.2, r * 0.8, cy + r * 0.5); ctx.closePath(); ctx.fill(); ctx.stroke();
      // chevelure : mèches d'eau qui flottent vers l'arrière
      ctx.strokeStyle = '#3b6fb6'; ctx.lineWidth = 1.6;
      for (let k = 0; k < 4; k++) { ctx.beginPath(); ctx.moveTo(-r * 0.2, cy - r * 0.75 + k * 2.5); for (let i = 1; i <= 6; i++) ctx.lineTo(-r * 0.2 - i * 3.4, cy - r * 0.75 + k * 2.5 + i * 2.4 + Math.sin(t * 4 + i * 0.9 + k) * 2); ctx.stroke(); }
      // tête-goutte, pointe vers le haut
      const g = ctx.createRadialGradient(-r * 0.3, cy - r * 0.3, 1, 0, cy, r * 1.3); g.addColorStop(0, 'rgba(200,228,248,0.95)'); g.addColorStop(1, 'rgba(70,130,200,0.7)'); ctx.fillStyle = g;
      ctx.beginPath(); ctx.moveTo(0, cy - r * 1.55); ctx.bezierCurveTo(r * 0.35, cy - r * 1.0, r, cy - r * 0.55, r, cy); ctx.arc(0, cy, r, 0, Math.PI); ctx.bezierCurveTo(-r, cy - r * 0.55, -r * 0.35, cy - r * 1.0, 0, cy - r * 1.55); ctx.closePath(); ctx.fill();
      ctx.strokeStyle = c.hurt > 0 ? '#9a2a2a' : '#2a4a7a'; ctx.lineWidth = 1.5; ctx.stroke();
      // bras en volutes
      ctx.lineWidth = 1.3; for (const s of [-1, 1]) { ctx.beginPath(); ctx.moveTo(s * r * 0.85, cy + r * 0.3); ctx.quadraticCurveTo(s * r * 1.5, cy + r * 0.2 + Math.sin(t * 3 + s) * 2, s * r * 1.35, cy - r * 0.3); ctx.stroke(); }
      ctx.restore();
      ctx.fillStyle = 'rgba(255,255,255,0.75)'; ctx.beginPath(); ctx.ellipse(r * 0.4, cy - r * 0.5, 1.5, 3.4, 0.5, 0, TAU); ctx.fill();
      oeil(ctx, r * 0.35, cy, 1.8, '#1f3a66', '#f2f8fc'); oeil(ctx, -r * 0.25, cy, 1.8, '#1f3a66', '#f2f8fc');
      ctx.strokeStyle = '#2a4a7a'; ctx.lineWidth = 1; ctx.beginPath(); ctx.arc(r * 0.05, cy + r * 0.35, 2, 0.2, Math.PI - 0.2); ctx.stroke();
    },
    // Petit golem : des blocs de pierre hachurés, une touffe de mousse, deux yeux d'ambre
    terre(ctx, c, t, w, h) {
      const pas = Math.abs(c.vx) > 10 ? Math.sin(t * 8) : 0, coup = c.coup > 0 ? c.coup : 0;
      ctx.lineWidth = 1.7; ctx.fillStyle = '#a8977a';
      // jambes
      U.inkPolyPath(ctx, [[-w * 0.32 + pas * 2, -h * 0.3], [-w * 0.08 + pas * 2, -h * 0.3], [-w * 0.1 + pas * 2, 0], [-w * 0.34 + pas * 2, 0]], c.seed, 0.5); ctx.fill(); ctx.stroke();
      U.inkPolyPath(ctx, [[w * 0.06 - pas * 2, -h * 0.3], [w * 0.3 - pas * 2, -h * 0.3], [w * 0.32 - pas * 2, 0], [w * 0.08 - pas * 2, 0]], c.seed + 1, 0.5); ctx.fill(); ctx.stroke();
      // torse et tête
      ctx.fillStyle = '#b3a283'; U.inkPolyPath(ctx, [[-w * 0.45, -h * 0.28], [-w * 0.5, -h * 0.62], [-w * 0.3, -h * 0.72], [w * 0.32, -h * 0.74], [w * 0.5, -h * 0.6], [w * 0.44, -h * 0.28]], c.seed + 2, 0.8); ctx.fill(); ctx.stroke();
      U.hatch(ctx, -w * 0.5, -h * 0.74, w, h * 0.46, 4, Math.PI / 4, c.seed, 0.28);
      ctx.fillStyle = '#a8977a'; U.inkPolyPath(ctx, [[-w * 0.26, -h * 0.72], [-w * 0.22, -h * 0.98], [w * 0.24, -h], [w * 0.28, -h * 0.73]], c.seed + 3, 0.6); ctx.fill(); ctx.stroke();
      // bras : celui de devant frappe
      ctx.fillStyle = '#a8977a';
      U.inkPolyPath(ctx, [[-w * 0.5, -h * 0.66], [-w * 0.66, -h * 0.6], [-w * 0.62, -h * 0.3], [-w * 0.46, -h * 0.32]], c.seed + 4, 0.5); ctx.fill(); ctx.stroke();
      const ax = w * 0.5 + coup * 10; U.inkPolyPath(ctx, [[w * 0.44, -h * 0.66], [ax + w * 0.16, -h * 0.6 - coup * 6], [ax + w * 0.14, -h * 0.34 - coup * 8], [ax - w * 0.02, -h * 0.34]], c.seed + 5, 0.5); ctx.fill(); ctx.stroke();
      // fissure, mousse, yeux
      ctx.lineWidth = 1; U.inkLine(ctx, -w * 0.1, -h * 0.7, w * 0.05, -h * 0.5, c.seed + 6, 0.6);
      ctx.fillStyle = '#6a9a45'; for (let k = 0; k < 5; k++) { ctx.beginPath(); ctx.ellipse(-w * 0.15 + k * w * 0.08, -h - 1.5 - (k % 2) * 1.5, 2.6, 1.8, 0, 0, TAU); ctx.fill(); }
      ctx.fillStyle = '#e8a040'; ctx.beginPath(); ctx.arc(-w * 0.06, -h * 0.86, 2, 0, TAU); ctx.arc(w * 0.14, -h * 0.86, 2, 0, TAU); ctx.fill();
      FX.glow(ctx, w * 0.04, -h * 0.86, 9, '#e8a040', 0.35);
    },
    // Sylphe : une hirondelle tracée en quelques traits de vent
    vent(ctx, c, t, w, h) {
      const bat = Math.sin(t * 15) * 0.6;
      ctx.save(); ctx.globalAlpha = 0.35; ctx.strokeStyle = '#3f9c9b'; ctx.lineWidth = 1.2;
      for (let k = 0; k < 3; k++) { ctx.beginPath(); ctx.moveTo(-w * 0.4, -h * 0.4 + k * 3); ctx.quadraticCurveTo(-w * 0.9, -h * 0.5 + k * 3 + Math.sin(t * 6 + k) * 3, -w * 1.3, -h * 0.35 + k * 4); ctx.stroke(); }
      ctx.restore();
      ctx.fillStyle = 'rgba(160,215,212,0.9)'; ctx.lineWidth = 1.5;
      // queue fourchue
      trait(ctx, [[-w * 0.3, -h * 0.45], [-w * 0.62, -h * 0.2], [-w * 0.4, -h * 0.45], [-w * 0.66, -h * 0.62], [-w * 0.3, -h * 0.5]], true); ctx.fill(); ctx.stroke();
      // corps
      ctx.beginPath(); ctx.ellipse(0, -h * 0.48, w * 0.34, h * 0.18, 0, 0, TAU); ctx.fill(); ctx.stroke();
      // ailes en croissant
      for (const s of [1, -0.6]) { ctx.beginPath(); ctx.moveTo(-w * 0.05, -h * 0.5); ctx.quadraticCurveTo(w * 0.05, -h * (0.5 + 0.9 * (bat * s + 0.6)), -w * 0.5, -h * (0.5 + 0.7 * (bat * s + 0.5))); ctx.quadraticCurveTo(-w * 0.1, -h * (0.5 + 0.3 * (bat * s + 0.6)), -w * 0.05, -h * 0.5); ctx.fill(); ctx.stroke(); }
      // tête, œil, spirale de vent sur la poitrine
      ctx.beginPath(); ctx.arc(w * 0.32, -h * 0.55, h * 0.16, 0, TAU); ctx.fill(); ctx.stroke();
      trait(ctx, [[w * 0.45, -h * 0.58], [w * 0.56, -h * 0.54], [w * 0.45, -h * 0.5]]); ctx.stroke();
      oeil(ctx, w * 0.35, -h * 0.58, 1.5);
      ctx.strokeStyle = '#3f9c9b'; ctx.lineWidth = 1; ctx.beginPath(); for (let i = 0; i <= 14; i++) { const a = i / 14 * TAU * 1.5, r = 0.5 + i * 0.25; const x = Math.cos(a) * r, y = -h * 0.45 + Math.sin(a) * r * 0.6; i ? ctx.lineTo(x, y) : ctx.moveTo(x, y); } ctx.stroke();
    },
    // Pousse : une graine qui marche, deux feuilles sur la tête, des racines pour pieds
    vie(ctx, c, t, w, h) {
      const pas = Math.abs(c.vx) > 10 ? Math.sin(t * 12) : 0;
      ctx.lineWidth = 1.4; ctx.strokeStyle = '#6b4f2a';
      for (const [x, s] of [[-w * 0.18, 1], [w * 0.16, -1]]) { ctx.beginPath(); ctx.moveTo(x, -h * 0.2); ctx.quadraticCurveTo(x + pas * s * 3, -h * 0.08, x - 3 + pas * s * 4, 0); ctx.stroke(); ctx.beginPath(); ctx.moveTo(x, -h * 0.15); ctx.lineTo(x + 3, 0); ctx.stroke(); }
      ctx.strokeStyle = c.hurt > 0 ? '#9a2a2a' : INK; ctx.lineWidth = 1.6;
      const g = ctx.createRadialGradient(-w * 0.1, -h * 0.55, 1, 0, -h * 0.45, w * 0.5); g.addColorStop(0, '#c8c070'); g.addColorStop(1, '#8a8a40'); ctx.fillStyle = g;
      ctx.beginPath(); ctx.ellipse(0, -h * 0.42, w * 0.42, h * 0.3, 0, 0, TAU); ctx.fill(); ctx.stroke();
      // tige et feuilles qui se balancent
      const bal = Math.sin(t * 2.5) * 0.25;
      ctx.strokeStyle = '#4e7a2a'; ctx.beginPath(); ctx.moveTo(0, -h * 0.7); ctx.quadraticCurveTo(1, -h * 0.85, 0, -h * 0.95); ctx.stroke(); ctx.strokeStyle = INK;
      ctx.fillStyle = '#78a24a';
      for (const s of [-1, 1]) { ctx.save(); ctx.translate(0, -h * 0.95); ctx.rotate(s * (-0.35 + bal * s)); ctx.beginPath(); ctx.moveTo(0, 0); ctx.quadraticCurveTo(s * w * 0.25, -h * 0.22, s * w * 0.62, -h * 0.08); ctx.quadraticCurveTo(s * w * 0.3, h * 0.08, 0, 0); ctx.closePath(); ctx.fill(); ctx.stroke(); ctx.beginPath(); ctx.moveTo(0, 0); ctx.quadraticCurveTo(s * w * 0.3, -h * 0.08, s * w * 0.55, -h * 0.07); ctx.lineWidth = 0.8; ctx.stroke(); ctx.restore(); }
      oeil(ctx, w * 0.12, -h * 0.48, 1.8); oeil(ctx, -w * 0.12, -h * 0.48, 1.8);
      ctx.fillStyle = 'rgba(217,98,43,0.35)'; ctx.beginPath(); ctx.arc(w * 0.26, -h * 0.36, 2, 0, TAU); ctx.arc(-w * 0.26, -h * 0.36, 2, 0, TAU); ctx.fill();
    },
    // Luciole : un corps sombre, un abdomen qui palpite de lumière, des ailes de verre
    lumiere(ctx, c, t, w, h) {
      const pul = 0.65 + 0.35 * Math.sin(t * 4), bat = Math.sin(t * 30);
      FX.glow(ctx, -w * 0.2, -h * 0.4, 30, '#f6e080', 0.55 * pul);
      ctx.fillStyle = 'rgba(240,236,220,0.45)'; ctx.lineWidth = 1;
      for (const s of [1, 0.7]) { ctx.beginPath(); ctx.ellipse(w * 0.02, -h * 0.75, w * 0.32, h * 0.18 * (0.4 + 0.6 * Math.abs(bat * s)), -0.4, 0, TAU); ctx.fill(); ctx.stroke(); }
      ctx.fillStyle = 'rgba(246,224,128,' + pul + ')'; ctx.lineWidth = 1.4; ctx.beginPath(); ctx.ellipse(-w * 0.22, -h * 0.4, w * 0.26, h * 0.26, 0.2, 0, TAU); ctx.fill(); ctx.stroke();
      ctx.lineWidth = 0.8; for (let k = 1; k <= 2; k++) { ctx.beginPath(); ctx.moveTo(-w * 0.22 - k * 3, -h * 0.62); ctx.lineTo(-w * 0.22 - k * 3, -h * 0.18); ctx.stroke(); }
      ctx.lineWidth = 1.4; ctx.fillStyle = '#4a3a22'; ctx.beginPath(); ctx.ellipse(w * 0.16, -h * 0.45, w * 0.2, h * 0.2, 0, 0, TAU); ctx.fill(); ctx.stroke();
      ctx.lineWidth = 1; trait(ctx, [[w * 0.3, -h * 0.55], [w * 0.42, -h * 0.85], [w * 0.5, -h * 0.9]]); ctx.stroke(); trait(ctx, [[w * 0.26, -h * 0.58], [w * 0.3, -h * 0.9], [w * 0.36, -h]]); ctx.stroke();
      oeil(ctx, w * 0.26, -h * 0.48, 1.3, INK, '#f6e080');
    },
    // Oiseau-tonnerre : un petit oiseau jaune aux ailes en zigzag, une crête d'étincelles
    foudre(ctx, c, t, w, h) {
      const bat = Math.sin(t * 18);
      ctx.fillStyle = '#e8d060'; ctx.lineWidth = 1.5;
      trait(ctx, [[-w * 0.3, -h * 0.45], [-w * 0.62, -h * 0.3], [-w * 0.5, -h * 0.45], [-w * 0.68, -h * 0.55], [-w * 0.3, -h * 0.55]], true); ctx.fill(); ctx.stroke();
      ctx.beginPath(); ctx.ellipse(0, -h * 0.5, w * 0.32, h * 0.24, 0, 0, TAU); ctx.fill(); ctx.stroke();
      // aile en éclair
      const a = bat * h * 0.5;
      ctx.fillStyle = '#f0e090'; trait(ctx, [[-w * 0.1, -h * 0.55], [w * 0.05, -h * 0.75 - a * 0.4], [-w * 0.1, -h * 0.78 - a * 0.6], [w * 0.02, -h * 0.98 - a], [-w * 0.35, -h * 0.7 - a * 0.5], [-w * 0.2, -h * 0.68 - a * 0.3], [-w * 0.3, -h * 0.55]], true); ctx.fill(); ctx.stroke();
      ctx.fillStyle = '#e8d060'; ctx.beginPath(); ctx.arc(w * 0.3, -h * 0.62, h * 0.2, 0, TAU); ctx.fill(); ctx.stroke();
      ctx.fillStyle = '#d8a63a'; trait(ctx, [[w * 0.44, -h * 0.66], [w * 0.6, -h * 0.6], [w * 0.44, -h * 0.55]], true); ctx.fill(); ctx.stroke();
      ctx.strokeStyle = '#f6e8a0'; ctx.lineWidth = 1.2; for (let k = 0; k < 3; k++) { const x = w * (0.2 + k * 0.08); trait(ctx, [[x, -h * 0.8], [x - 2, -h * 0.92], [x + 1, -h * 0.95], [x - 1, -h * 1.08]]); ctx.stroke(); }
      ctx.strokeStyle = INK; oeil(ctx, w * 0.33, -h * 0.66, 1.6);
    },
    // Petite lune : un disque grêlé de cratères, un anneau, un caillou qui tourne autour
    gravite(ctx, c, t, w, h) {
      const r = w * 0.45, cy = -h * 0.5;
      const pa = t * 2.4, px = Math.cos(pa) * r * 1.8, py = cy + Math.sin(pa) * r * 0.55;
      const caillou = () => { ctx.fillStyle = '#7a7090'; ctx.beginPath(); ctx.arc(px, py, 2.2, 0, TAU); ctx.fill(); ctx.stroke(); };
      ctx.lineWidth = 1;
      if (Math.sin(pa) < 0) caillou();
      ctx.strokeStyle = 'rgba(108,90,184,0.6)'; ctx.beginPath(); ctx.ellipse(0, cy, r * 1.6, r * 0.45, -0.25, Math.PI, TAU); ctx.stroke();
      ctx.strokeStyle = c.hurt > 0 ? '#9a2a2a' : INK; ctx.lineWidth = 1.6;
      const g = ctx.createRadialGradient(-r * 0.4, cy - r * 0.4, 1, 0, cy, r); g.addColorStop(0, '#d8d2e8'); g.addColorStop(1, '#8a80b0'); ctx.fillStyle = g;
      ctx.beginPath(); ctx.arc(0, cy, r, 0, TAU); ctx.fill(); ctx.stroke();
      ctx.lineWidth = 0.9; for (const [x, y, rr] of [[-r * 0.35, -r * 0.1, r * 0.22], [r * 0.3, r * 0.35, r * 0.16], [r * 0.25, -r * 0.4, r * 0.12]]) { ctx.beginPath(); ctx.arc(x, cy + y, rr, 0, TAU); ctx.stroke(); }
      ctx.fillStyle = 'rgba(60,50,90,0.25)'; ctx.beginPath(); ctx.arc(0, cy, r, -Math.PI / 2, Math.PI / 2); ctx.arc(r * 0.35, cy, r * 0.95, Math.PI / 2, -Math.PI / 2, true); ctx.fill();
      ctx.lineWidth = 1.2; ctx.beginPath(); ctx.arc(-r * 0.25, cy + r * 0.05, 2, Math.PI * 0.1, Math.PI * 0.9); ctx.stroke(); ctx.beginPath(); ctx.arc(r * 0.2, cy + r * 0.05, 2, Math.PI * 0.1, Math.PI * 0.9); ctx.stroke();
      ctx.strokeStyle = 'rgba(108,90,184,0.6)'; ctx.lineWidth = 1; ctx.beginPath(); ctx.ellipse(0, cy, r * 1.6, r * 0.45, -0.25, 0, Math.PI); ctx.stroke(); ctx.strokeStyle = INK;
      if (Math.sin(pa) >= 0) caillou();
    },
    // Chouette du temps : deux cadrans pour yeux, un sablier sur le ventre
    temps(ctx, c, t, w, h) {
      const bat = c.vole ? Math.sin(t * 9) * 0.5 : 0;
      ctx.lineWidth = 1.6; ctx.fillStyle = '#9a9faa';
      for (const s of [-1, 1]) { ctx.beginPath(); ctx.moveTo(s * w * 0.3, -h * 0.65); ctx.quadraticCurveTo(s * w * (0.75 + bat * 0.3), -h * (0.5 + bat * 0.5), s * w * 0.32, -h * 0.15); ctx.closePath(); ctx.fill(); ctx.stroke(); }
      ctx.fillStyle = '#a8adb6'; ctx.beginPath(); ctx.ellipse(0, -h * 0.45, w * 0.36, h * 0.42, 0, 0, TAU); ctx.fill(); ctx.stroke();
      trait(ctx, [[-w * 0.3, -h * 0.78], [-w * 0.34, -h * 1.02], [-w * 0.14, -h * 0.84]]); ctx.fill(); ctx.stroke(); trait(ctx, [[w * 0.3, -h * 0.78], [w * 0.34, -h * 1.02], [w * 0.14, -h * 0.84]]); ctx.fill(); ctx.stroke();
      // yeux-cadrans
      for (const s of [-1, 1]) { const ex = s * w * 0.15, ey = -h * 0.62; ctx.fillStyle = '#f2ead0'; ctx.beginPath(); ctx.arc(ex, ey, w * 0.14, 0, TAU); ctx.fill(); ctx.stroke(); ctx.lineWidth = 1; for (let k = 0; k < 4; k++) { const a = k * Math.PI / 2; ctx.beginPath(); ctx.moveTo(ex + Math.cos(a) * w * 0.11, ey + Math.sin(a) * w * 0.11); ctx.lineTo(ex + Math.cos(a) * w * 0.14, ey + Math.sin(a) * w * 0.14); ctx.stroke(); } const am = t * 2 * s, ah = t * 0.2 * s; ctx.lineWidth = 1.2; ctx.beginPath(); ctx.moveTo(ex, ey); ctx.lineTo(ex + Math.cos(am) * w * 0.11, ey + Math.sin(am) * w * 0.11); ctx.moveTo(ex, ey); ctx.lineTo(ex + Math.cos(ah) * w * 0.07, ey + Math.sin(ah) * w * 0.07); ctx.stroke(); ctx.lineWidth = 1.6; }
      ctx.fillStyle = '#d8a63a'; trait(ctx, [[-2, -h * 0.5], [2, -h * 0.5], [0, -h * 0.42]], true); ctx.fill(); ctx.stroke();
      ctx.lineWidth = 1; trait(ctx, [[-w * 0.1, -h * 0.34], [w * 0.1, -h * 0.34], [-w * 0.1, -h * 0.12], [w * 0.1, -h * 0.12]], true); ctx.stroke();
      ctx.fillStyle = '#d9c48a'; const sb = (t * 0.15) % 1; ctx.beginPath(); ctx.moveTo(-w * 0.06 * (1 - sb), -h * 0.3); ctx.lineTo(w * 0.06 * (1 - sb), -h * 0.3); ctx.lineTo(0, -h * 0.23); ctx.closePath(); ctx.fill(); ctx.beginPath(); ctx.moveTo(-w * 0.07 * sb, -h * 0.13); ctx.lineTo(w * 0.07 * sb, -h * 0.13); ctx.lineTo(0, -h * 0.13 - h * 0.08 * sb); ctx.closePath(); ctx.fill();
    },
    // Renard des failles : un renard taillé dans un ciel de nuit, la queue cerclée d'une faille
    portail(ctx, c, t, w, h) {
      const pas = Math.abs(c.vx) > 15 ? Math.sin(t * 14) : 0;
      ctx.lineWidth = 1.6;
      const corps = () => { ctx.beginPath(); ctx.moveTo(-w * 0.3, -h * 0.35); ctx.quadraticCurveTo(-w * 0.1, -h * 0.72, w * 0.2, -h * 0.6); ctx.lineTo(w * 0.3, -h * 0.82); ctx.lineTo(w * 0.34, -h * 1.05); ctx.lineTo(w * 0.4, -h * 0.84); ctx.lineTo(w * 0.47, -h * 1.02); ctx.lineTo(w * 0.5, -h * 0.8); ctx.lineTo(w * 0.62, -h * 0.62); ctx.lineTo(w * 0.46, -h * 0.54); ctx.quadraticCurveTo(w * 0.3, -h * 0.25, w * 0.15, -h * 0.25); ctx.lineTo(-w * 0.25, -h * 0.25); ctx.closePath(); };
      for (const [x, s] of [[-w * 0.2, 1], [-w * 0.05, -1], [w * 0.1, 1], [w * 0.2, -1]]) { ctx.beginPath(); ctx.moveTo(x, -h * 0.3); ctx.lineTo(x + pas * s * 3, 0); ctx.stroke(); }
      // queue touffue
      ctx.fillStyle = '#25404e'; ctx.beginPath(); ctx.moveTo(-w * 0.28, -h * 0.4); ctx.quadraticCurveTo(-w * 0.6, -h * 0.3 + pas, -w * 0.72, -h * 0.85); ctx.quadraticCurveTo(-w * 0.5, -h * 0.6, -w * 0.25, -h * 0.5); ctx.closePath(); ctx.fill(); ctx.stroke();
      ctx.strokeStyle = '#4fb0a0'; ctx.lineWidth = 1.4; ctx.beginPath(); ctx.ellipse(-w * 0.68, -h * 0.8, 3, 6, 0.5, 0, TAU); ctx.stroke(); ctx.strokeStyle = c.hurt > 0 ? '#9a2a2a' : INK; ctx.lineWidth = 1.6;
      ctx.fillStyle = '#25404e'; corps(); ctx.fill();
      // étoiles dans le pelage
      ctx.save(); corps(); ctx.clip(); for (let k = 0; k < 9; k++) { const sx = -w * 0.3 + U.hash2(k, c.seed) * w * 0.9, sy = -h * 0.25 - U.hash2(c.seed, k) * h * 0.7; ctx.fillStyle = 'rgba(239,227,196,' + (0.4 + 0.5 * Math.sin(t * 3 + k)) + ')'; ctx.beginPath(); ctx.arc(sx, sy, 0.9, 0, TAU); ctx.fill(); } ctx.restore();
      corps(); ctx.stroke();
      oeil(ctx, w * 0.42, -h * 0.68, 1.5, INK, '#9ae0d0');
    },
    // Chat d'ombre : une silhouette d'encre, deux yeux violets, une fumée qui s'effiloche
    esprit(ctx, c, t, w, h) {
      const pas = Math.abs(c.vx) > 15 ? Math.sin(t * 12) : 0;
      ctx.save(); ctx.globalAlpha = 0.25; ctx.fillStyle = '#5a4a7d'; for (let k = 0; k < 4; k++) { const a = t * 1.5 + k * 1.6; ctx.beginPath(); ctx.arc(-w * 0.2 + Math.cos(a) * w * 0.35, -h * 0.5 + Math.sin(a) * h * 0.3 - (t * 8 + k * 4) % 8, 2.5, 0, TAU); ctx.fill(); } ctx.restore();
      ctx.fillStyle = '#2a2230'; ctx.lineWidth = 1.5;
      for (const [x, s] of [[-w * 0.22, 1], [-w * 0.08, -1], [w * 0.14, 1], [w * 0.24, -1]]) { ctx.beginPath(); ctx.moveTo(x, -h * 0.3); ctx.lineTo(x + pas * s * 2.5, 0); ctx.stroke(); }
      ctx.lineWidth = 3; ctx.strokeStyle = '#2a2230'; ctx.beginPath(); ctx.moveTo(-w * 0.3, -h * 0.45); ctx.bezierCurveTo(-w * 0.6, -h * 0.4, -w * 0.45, -h * 1.05 + Math.sin(t * 2) * 2, -w * 0.62, -h * 1.0 + Math.sin(t * 2) * 3); ctx.stroke();
      ctx.lineWidth = 1.5; ctx.strokeStyle = c.hurt > 0 ? '#9a2a2a' : INK;
      ctx.beginPath(); ctx.ellipse(-w * 0.02, -h * 0.45, w * 0.32, h * 0.2, 0, 0, TAU); ctx.fill(); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(w * 0.18, -h * 0.55); ctx.lineTo(w * 0.22, -h * 0.95); ctx.lineTo(w * 0.32, -h * 0.75); ctx.lineTo(w * 0.42, -h * 0.75); ctx.lineTo(w * 0.5, -h * 0.95); ctx.lineTo(w * 0.52, -h * 0.55); ctx.quadraticCurveTo(w * 0.35, -h * 0.4, w * 0.18, -h * 0.55); ctx.closePath(); ctx.fill(); ctx.stroke();
      const cl = (Math.sin(t * 0.9 + c.seed) > 0.96) ? 0.2 : 1;
      ctx.fillStyle = '#c8a0f0'; for (const ex of [w * 0.3, w * 0.42]) { ctx.beginPath(); ctx.ellipse(ex, -h * 0.68, 1.8, 1.3 * cl, 0, 0, TAU); ctx.fill(); }
      FX.glow(ctx, w * 0.36, -h * 0.68, 7, '#c8a0f0', 0.4);
    },
    // Ouroboros : le serpent qui se mord la queue, roulé en anneau d'or
    transmutation(ctx, c, t, w, h) {
      const r = w * 0.36, cy = -h * 0.48;
      ctx.save(); ctx.translate(0, cy); ctx.rotate(c.roule || 0);
      ctx.lineWidth = 6; ctx.strokeStyle = '#a8742a'; ctx.beginPath(); ctx.arc(0, 0, r, -Math.PI / 2 + 0.5, Math.PI * 1.5 - 0.15); ctx.stroke();
      ctx.lineWidth = 3; ctx.strokeStyle = '#e0b050'; ctx.stroke();
      ctx.strokeStyle = c.hurt > 0 ? '#9a2a2a' : INK; ctx.lineWidth = 0.9;
      for (let k = 0; k < 12; k++) { const a = -Math.PI / 2 + 0.6 + k * (TAU - 0.8) / 12; ctx.beginPath(); ctx.arc(Math.cos(a) * r, Math.sin(a) * r, 1.6, a, a + Math.PI); ctx.stroke(); }
      ctx.lineWidth = 1.3; ctx.beginPath(); ctx.arc(0, 0, r + 2.6, -Math.PI / 2 + 0.5, Math.PI * 1.5 - 0.15); ctx.stroke(); ctx.beginPath(); ctx.arc(0, 0, r - 2.6, -Math.PI / 2 + 0.5, Math.PI * 1.5 - 0.15); ctx.stroke();
      // la tête mord la queue
      ctx.fillStyle = '#d8a040'; ctx.lineWidth = 1.4; ctx.beginPath(); ctx.moveTo(-r * 0.3, -r - 2.5); ctx.quadraticCurveTo(r * 0.2, -r - 8, r * 0.75, -r - 3); ctx.lineTo(r * 0.55, -r + 0.5); ctx.quadraticCurveTo(r * 0.1, -r + 3.5, -r * 0.3, -r + 2.5); ctx.closePath(); ctx.fill(); ctx.stroke();
      ctx.fillStyle = '#9a2a2a'; ctx.beginPath(); ctx.moveTo(r * 0.72, -r - 1.5); ctx.lineTo(r * 1.05, -r - 2.5); ctx.lineTo(r * 0.98, -r - 0.5); ctx.closePath(); ctx.fill();
      oeil(ctx, r * 0.25, -r - 3, 1.3, INK, '#f6e080');
      ctx.restore();
    },
    // Pie grise : noir, gris, une tache blanche, une longue queue
    contre(ctx, c, t, w, h) {
      const bat = Math.sin(t * 13);
      ctx.lineWidth = 1.5; ctx.fillStyle = '#2a2a2e';
      trait(ctx, [[-w * 0.28, -h * 0.48], [-w * 0.95, -h * 0.36], [-w * 1.0, -h * 0.46], [-w * 0.95, -h * 0.54], [-w * 0.28, -h * 0.58]], true); ctx.fill(); ctx.stroke(); ctx.strokeStyle = '#6a7a9a'; ctx.lineWidth = 0.8; trait(ctx, [[-w * 0.4, -h * 0.5], [-w * 0.9, -h * 0.45]]); ctx.stroke(); ctx.strokeStyle = c.hurt > 0 ? '#9a2a2a' : INK; ctx.lineWidth = 1.5;
      ctx.fillStyle = '#d8d4cc'; ctx.beginPath(); ctx.ellipse(-w * 0.02, -h * 0.45, w * 0.3, h * 0.24, 0, 0, TAU); ctx.fill(); ctx.stroke();
      { const a = bat * 0.5; ctx.fillStyle = '#2a2a2e'; ctx.beginPath(); ctx.moveTo(w * 0.1, -h * 0.58); ctx.quadraticCurveTo(-w * 0.1, -h * (0.95 + a), -w * 0.55, -h * (0.72 + a * 0.6)); ctx.quadraticCurveTo(-w * 0.35, -h * 0.5, w * 0.1, -h * 0.5); ctx.closePath(); ctx.fill(); ctx.stroke();
      ctx.fillStyle = '#efe3c4'; ctx.beginPath(); ctx.ellipse(-w * 0.12, -h * (0.66 + a * 0.3), 3.2, 1.7, -0.3, 0, TAU); ctx.fill(); }
      ctx.fillStyle = '#2a2a2e'; ctx.beginPath(); ctx.arc(w * 0.28, -h * 0.62, h * 0.2, 0, TAU); ctx.fill(); ctx.stroke();
      trait(ctx, [[w * 0.42, -h * 0.66], [w * 0.62, -h * 0.6], [w * 0.42, -h * 0.56]], true); ctx.fill(); ctx.stroke();
      oeil(ctx, w * 0.31, -h * 0.66, 1.4, INK, '#a8a29a');
      if (c.butin) { ctx.fillStyle = '#d8a63a'; ctx.beginPath(); ctx.arc(w * 0.62, -h * 0.58, 2.4, 0, TAU); ctx.fill(); ctx.stroke(); FX.glow(ctx, w * 0.62, -h * 0.58, 8, '#f0d070', 0.6); }
    },
    // Métamorphose : chenille, puis cocon, puis papillon
    metamorphose(ctx, c, t, w, h) {
      const st = c.stade || 'chenille';
      if (st === 'chenille') {
        ctx.lineWidth = 1.3;
        for (let k = 4; k >= 0; k--) { const x = -w * 0.4 + k * w * 0.2, y = -h * 0.45 - Math.max(0, Math.sin(t * 6 - k * 0.9)) * 3; ctx.fillStyle = k % 2 ? '#c890b8' : '#a8d070'; ctx.beginPath(); ctx.arc(x, y, h * 0.42, 0, TAU); ctx.fill(); ctx.stroke(); ctx.beginPath(); ctx.moveTo(x, y + h * 0.4); ctx.lineTo(x - 1, 0); ctx.stroke(); }
        oeil(ctx, w * 0.45, -h * 0.55, 1.4);
        ctx.beginPath(); ctx.moveTo(w * 0.42, -h * 0.85); ctx.lineTo(w * 0.36, -h * 1.25); ctx.moveTo(w * 0.5, -h * 0.85); ctx.lineTo(w * 0.56, -h * 1.25); ctx.stroke();
      } else if (st === 'cocon') {
        ctx.lineWidth = 1.5; ctx.fillStyle = '#d8c8a0'; const tr = Math.sin(t * 20) * (c.stadeT > 1.5 ? 1.5 : 0.3);
        ctx.beginPath(); ctx.ellipse(tr, -h * 1.1, w * 0.22, h * 1.0, 0, 0, TAU); ctx.fill(); ctx.stroke();
        U.hatch(ctx, -w * 0.25 + tr, -h * 2.1, w * 0.5, h * 2, 3, -Math.PI / 5, c.seed, 0.3);
        ctx.beginPath(); ctx.moveTo(tr, -h * 2.1); ctx.lineTo(tr, -h * 2.5); ctx.stroke();
      } else {
        const bat = Math.abs(Math.sin(t * 9)) * 0.75 + 0.25;
        ctx.save(); ctx.translate(0, -h * 0.9); ctx.lineWidth = 1.3;
        for (const s of [-1, 1]) { ctx.save(); ctx.scale(s * bat, 1);
          const g = ctx.createRadialGradient(w * 0.3, -h * 0.5, 1, w * 0.3, -h * 0.4, w * 0.6); g.addColorStop(0, '#f0b0d8'); g.addColorStop(1, '#a050a0'); ctx.fillStyle = g;
          ctx.beginPath(); ctx.moveTo(0, 0); ctx.bezierCurveTo(w * 0.2, -h * 1.6, w * 0.9, -h * 1.4, w * 0.6, -h * 0.1); ctx.closePath(); ctx.fill(); ctx.stroke();
          ctx.fillStyle = '#e8c0e0'; ctx.beginPath(); ctx.moveTo(0, h * 0.1); ctx.bezierCurveTo(w * 0.5, h * 0.2, w * 0.55, h * 0.9, w * 0.15, h * 0.7); ctx.closePath(); ctx.fill(); ctx.stroke();
          ctx.fillStyle = '#efe3c4'; ctx.beginPath(); ctx.arc(w * 0.42, -h * 0.65, 1.8, 0, TAU); ctx.fill(); ctx.stroke();
          ctx.restore(); }
        ctx.fillStyle = '#3a2a3a'; ctx.beginPath(); ctx.ellipse(0, 0, 1.8, h * 0.6, 0, 0, TAU); ctx.fill();
        ctx.lineWidth = 0.9; ctx.beginPath(); ctx.moveTo(0, -h * 0.55); ctx.lineTo(-3, -h * 1.1); ctx.moveTo(0, -h * 0.55); ctx.lineTo(3, -h * 1.1); ctx.stroke();
        ctx.restore();
      }
    },
  };

  // dessin complet : la créature, son sceau d'appartenance, ses états
  function dessiner(ctx, c, t) {
    const esp = c.espece || 'feu', fn = D[esp] || D.feu, F = DATA.FAMILIERS[esp] || {};
    const cx = c.x + c.w / 2, by = c.y + c.h, k = c.echelle || 1;
    const fin = c.life != null && c.life < 1.5 ? (Math.floor(t * 12) % 2 ? 0.35 : 0.85) : 1;
    ctx.save(); ctx.globalAlpha *= fin;
    ctx.translate(cx, by); ctx.scale((c.dir || 1) * k, k);
    ctx.strokeStyle = c.hurt > 0 ? '#9a2a2a' : INK; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    try { fn(ctx, c, t + (c.seed || 0) * 0.37, (F.w || c.w) , (F.h || c.h)); } catch (e) { /* un dessin raté ne doit jamais casser le jeu */ }
    ctx.restore();
    // le petit sceau qui flotte au-dessus : c'est un familier, il est à toi
    const col = (DATA.CORES[esp] || {}).couleur || '#c08a3a', sy = c.y - 9 + Math.sin(t * 2.5 + (c.seed || 0)) * 2;
    ctx.save(); ctx.globalAlpha = 0.75 * fin; ctx.strokeStyle = col; ctx.lineWidth = 1; ctx.beginPath(); ctx.arc(cx, sy, 5.5, 0, TAU); ctx.stroke();
    Seal.glyph(ctx, esp, cx, sy, 3.6, col, 1); ctx.restore();
  }
  return { dessiner, D };
})();
