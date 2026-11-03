'use strict';
// ---------- Sceaux : modèle, coût, validité, dessin des glyphes et du cercle ----------
const Seal = (() => {
  const { TAU, INK } = U;

  function create() {
    return { nom: '', core: null, shape: null, mods: [null, null, null], trigger: null };
  }
  function clone(s) {
    return { nom: s.nom, core: s.core, shape: s.shape, mods: s.mods.slice(), trigger: s.trigger };
  }
  function cost(s) {
    let c = 0;
    if (s.core) c += DATA.CORES[s.core].cout;
    if (s.shape) c += DATA.SHAPES[s.shape].cout;
    for (const m of s.mods) if (m) c += DATA.MODS[m].cout;
    if (s.trigger) c += DATA.TRIGGERS[s.trigger].cout;
    return c;
  }
  function count(s, mod) {
    return s.mods.filter((m) => m === mod).length;
  }
  // Un sceau sans glyphe d'effet est un pétard. Sans forme : effet faible sur soi.
  function etat(s) {
    if (!s.core) return { ok: false, raison: 'Pas de glyphe d\'effet : ce sceau ne fera qu\'un pétard de fumée.' };
    if (!s.shape) return { ok: false, raison: 'Pas de forme : l\'effet se répandra mollement autour de toi.' };
    return { ok: true, raison: s.trigger ? '' : 'Pas de déclencheur : l\'effet sera immédiat.' };
  }
  function autoNom(s) {
    if (!s.core) return 'Pétard';
    let n = DATA.CORES[s.core].nom;
    if (s.shape) n = DATA.SHAPES[s.shape].nom + ' de ' + n.toLowerCase();
    const mods = s.mods.filter(Boolean);
    if (mods.length) n += ' ' + mods.map((m) => DATA.MODS[m].nom.toLowerCase()).join(', ');
    if (s.trigger && s.trigger !== 'immediat') n += ' (' + DATA.TRIGGERS[s.trigger].nom.toLowerCase() + ')';
    return n;
  }
  function nom(s) {
    return s.nom || autoNom(s);
  }
  function params(s) {
    const n = (m) => count(s, m);
    return {
      power: 1 + 0.6 * n('puissance'),
      range: 1 + 0.5 * n('portee'),
      duration: 1 + 0.8 * n('duree'),
      size: 1 + 0.5 * n('taille'),
      bounces: n('rebond') * 2,
      persist: n('persistance'),
      speed: 1 + 0.4 * n('vitesse'),
      extra: n('double'),
    };
  }

  // ---------- Dessin des glyphes (icônes vectorielles) ----------
  function glyph(ctx, id, x, y, r, color = INK, seed = 1) {
    ctx.save();
    ctx.translate(x, y);
    ctx.strokeStyle = color;
    ctx.fillStyle = color;
    ctx.lineWidth = Math.max(1.2, r * 0.13);
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    const L = (a, b, c, d) => U.inkLine(ctx, a, b, c, d, seed, r * 0.04);
    const C = (cx, cy, rr) => U.inkCircle(ctx, cx, cy, rr, seed, r * 0.04);
    const P = (pts, close = true) => U.inkPoly(ctx, pts, seed, r * 0.04, close);
    const dot = (cx, cy, rr) => { ctx.beginPath(); ctx.arc(cx, cy, rr, 0, TAU); ctx.fill(); };
    switch (id) {
      // --- effets ---
      case 'feu': P([[0, -r], [r * 0.75, r * 0.6], [-r * 0.75, r * 0.6]]); L(0, -r * 0.2, 0, r * 0.45); dot(0, r * 0.2, r * 0.12); break;
      case 'vent': for (let i = -1; i <= 1; i++) { const yy = i * r * 0.45; ctx.beginPath(); ctx.moveTo(-r * 0.8, yy); ctx.quadraticCurveTo(0, yy - r * 0.35, r * 0.8, yy); ctx.stroke(); } break;
      case 'eau': for (let i = -1; i <= 1; i += 2) { const yy = i * r * 0.3; ctx.beginPath(); ctx.moveTo(-r * 0.8, yy); ctx.bezierCurveTo(-r * 0.4, yy - r * 0.5, r * 0.4, yy + r * 0.5, r * 0.8, yy); ctx.stroke(); } dot(0, -r * 0.85, r * 0.12); break;
      case 'terre': P([[-r * 0.85, r * 0.7], [-r * 0.3, -r * 0.6], [r * 0.1, r * 0.1], [r * 0.4, -r * 0.3], [r * 0.85, r * 0.7]]); L(-r * 0.85, r * 0.7, r * 0.85, r * 0.7); break;
      case 'lumiere': C(0, 0, r * 0.4); for (let i = 0; i < 8; i++) { const a = (i / 8) * TAU; L(Math.cos(a) * r * 0.58, Math.sin(a) * r * 0.58, Math.cos(a) * r * 0.95, Math.sin(a) * r * 0.95); } break;
      case 'ombre': ctx.beginPath(); ctx.arc(0, 0, r * 0.85, Math.PI * 0.2, Math.PI * 1.8); ctx.stroke(); ctx.beginPath(); ctx.arc(r * 0.35, 0, r * 0.6, Math.PI * 1.3, Math.PI * 0.7, true); ctx.stroke(); dot(-r * 0.2, -r * 0.1, r * 0.1); break;
      case 'vie': ctx.beginPath(); ctx.moveTo(0, r * 0.9); ctx.quadraticCurveTo(0, 0, r * 0.2, -r * 0.8); ctx.stroke(); ctx.beginPath(); ctx.moveTo(0, r * 0.3); ctx.quadraticCurveTo(-r * 0.9, r * 0.1, -r * 0.55, -r * 0.55); ctx.quadraticCurveTo(0, -r * 0.4, 0, r * 0.3); ctx.stroke(); ctx.beginPath(); ctx.moveTo(r * 0.1, -r * 0.1); ctx.quadraticCurveTo(r * 0.9, -r * 0.3, r * 0.6, -r * 0.9); ctx.quadraticCurveTo(r * 0.1, -r * 0.8, r * 0.1, -r * 0.1); ctx.stroke(); break;
      case 'force': ctx.beginPath(); for (let i = 0; i <= 40; i++) { const t = i / 40; const a = t * TAU * 2.2; const rr = r * 0.95 * (1 - t); const px = Math.cos(a) * rr, py = Math.sin(a) * rr; if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py); } ctx.stroke(); dot(0, 0, r * 0.12); break;
      // --- formes ---
      case 'projectile': L(-r * 0.8, r * 0.5, r * 0.6, -r * 0.5); P([[r * 0.8, -r * 0.7], [r * 0.15, -r * 0.6], [r * 0.7, -r * 0.05]], false); dot(-r * 0.8, r * 0.5, r * 0.18); break;
      case 'soi': C(0, -r * 0.45, r * 0.3); P([[-r * 0.6, r * 0.9], [0, -r * 0.1], [r * 0.6, r * 0.9]]); break;
      case 'zone': C(0, 0, r * 0.35); for (let i = 0; i < 6; i++) { const a = (i / 6) * TAU; dot(Math.cos(a) * r * 0.8, Math.sin(a) * r * 0.8, r * 0.12); } break;
      case 'trait': L(-r * 0.9, r * 0.6, r * 0.9, -r * 0.6); L(-r * 0.9, r * 0.9, -r * 0.5, r * 0.9); L(r * 0.5, -r * 0.9, r * 0.9, -r * 0.9); break;
      // --- modificateurs ---
      case 'puissance': L(-r * 0.7, 0, r * 0.7, 0); L(0, -r * 0.7, 0, r * 0.7); dot(r * 0.75, -r * 0.75, r * 0.12); dot(-r * 0.75, r * 0.75, r * 0.12); break;
      case 'portee': L(-r * 0.9, 0, r * 0.9, 0); P([[r * 0.9, 0], [r * 0.4, -r * 0.4]], false); P([[r * 0.9, 0], [r * 0.4, r * 0.4]], false); dot(-r * 0.9, 0, r * 0.15); break;
      case 'duree': P([[-r * 0.6, -r * 0.8], [r * 0.6, -r * 0.8], [-r * 0.6, r * 0.8], [r * 0.6, r * 0.8]]); ctx.globalAlpha *= 0.6; P([[-r * 0.25, r * 0.5], [r * 0.25, r * 0.5], [0, r * 0.15]]); break;
      case 'taille': C(0, 0, r * 0.3); ctx.setLineDash([r * 0.2, r * 0.18]); C(0, 0, r * 0.85); ctx.setLineDash([]); break;
      case 'rebond': P([[-r * 0.8, r * 0.6], [-r * 0.1, -r * 0.6], [r * 0.4, r * 0.3], [r * 0.9, -r * 0.4]], false); break;
      case 'persistance': ctx.beginPath(); ctx.moveTo(-r * 0.9, 0); ctx.bezierCurveTo(-r * 0.9, -r * 0.9, 0, -r * 0.5, 0, 0); ctx.bezierCurveTo(0, r * 0.5, r * 0.9, r * 0.9, r * 0.9, 0); ctx.bezierCurveTo(r * 0.9, -r * 0.9, 0, -r * 0.5, 0, 0); ctx.bezierCurveTo(0, r * 0.5, -r * 0.9, r * 0.9, -r * 0.9, 0); ctx.stroke(); break;
      case 'vitesse': P([[-r * 0.9, -r * 0.6], [-r * 0.3, 0], [-r * 0.9, r * 0.6]], false); P([[-r * 0.1, -r * 0.6], [r * 0.5, 0], [-r * 0.1, r * 0.6]], false); break;
      case 'double': dot(-r * 0.4, 0, r * 0.3); dot(r * 0.4, 0, r * 0.3); ctx.globalAlpha *= 0.6; C(0, 0, r * 0.9); break;
      // --- déclencheurs ---
      case 'immediat': for (let i = 0; i < 6; i++) { const a = (i / 6) * TAU + 0.3; L(Math.cos(a) * r * 0.25, Math.sin(a) * r * 0.25, Math.cos(a) * r * 0.9, Math.sin(a) * r * 0.9); } break;
      case 'contact': L(-r * 0.7, -r * 0.7, r * 0.7, r * 0.7); L(-r * 0.7, r * 0.7, r * 0.7, -r * 0.7); C(0, 0, r * 0.9); break;
      case 'retarde': C(0, 0, r * 0.9); L(0, 0, 0, -r * 0.6); L(0, 0, r * 0.45, r * 0.2); break;
      default: C(0, 0, r * 0.5);
    }
    ctx.restore();
  }

  // Positions des emplacements pour un sceau de rayon R
  function layout(cx, cy, R) {
    const slotAt = (rad, angDeg, r) => {
      const a = (angDeg * Math.PI) / 180;
      return { x: cx + Math.cos(a) * rad, y: cy + Math.sin(a) * rad, r };
    };
    return {
      core: { x: cx, y: cy, r: R * 0.27 },
      shape: slotAt(R * 0.5, -90, R * 0.11),
      mods: [slotAt(R * 0.74, 30, R * 0.1), slotAt(R * 0.74, 150, R * 0.1), slotAt(R * 0.74, 270, R * 0.1)],
      trigger: slotAt(R * 1.0, -90, R * 0.1),
    };
  }

  // Dessin complet du sceau. opts: {t (temps), slots (nb mods dispo), highlight (id slot), empty (afficher les vides), glow}
  function draw(ctx, s, cx, cy, R, opts = {}) {
    const t = opts.t || 0;
    const slots = opts.slots == null ? 3 : opts.slots;
    const st = etat(s);
    const coul = s.core ? DATA.CORES[s.core].couleur : '#8a7a5a';
    const lay = layout(cx, cy, R);
    ctx.save();
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    // halo si valide
    if (s.core && opts.glow !== false) {
      const g = ctx.createRadialGradient(cx, cy, R * 0.1, cx, cy, R * 1.15);
      g.addColorStop(0, U.hexA(coul, st.ok ? 0.35 : 0.15));
      g.addColorStop(1, U.hexA(coul, 0));
      ctx.fillStyle = g;
      ctx.beginPath(); ctx.arc(cx, cy, R * 1.15, 0, TAU); ctx.fill();
    }

    // cercles
    ctx.strokeStyle = INK;
    ctx.lineWidth = Math.max(1.5, R * 0.025);
    U.inkCircle(ctx, cx, cy, R, 11, R * 0.012);
    ctx.lineWidth = Math.max(1, R * 0.015);
    U.inkCircle(ctx, cx, cy, R * 0.86, 12, R * 0.01);
    U.inkCircle(ctx, cx, cy, R * 0.62, 13, R * 0.01);
    U.inkCircle(ctx, cx, cy, R * 0.36, 14, R * 0.01);

    // anneau tournant décoratif (petits tirets) si actif
    if (s.core) {
      ctx.save();
      ctx.translate(cx, cy);
      ctx.rotate(t * 0.3);
      ctx.strokeStyle = U.hexA(coul, 0.8);
      ctx.lineWidth = Math.max(1, R * 0.02);
      for (let i = 0; i < 24; i++) {
        const a = (i / 24) * TAU;
        const r1 = R * 0.93, r2 = R * (i % 3 === 0 ? 0.98 : 0.955);
        ctx.beginPath(); ctx.moveTo(Math.cos(a) * r1, Math.sin(a) * r1); ctx.lineTo(Math.cos(a) * r2, Math.sin(a) * r2); ctx.stroke();
      }
      ctx.restore();
    }

    // Anneau 1 (forme) : le glyphe répété 4 fois en filigrane + emplacement principal
    if (s.shape) {
      for (let i = 1; i < 4; i++) {
        const a = -Math.PI / 2 + (i / 4) * TAU;
        ctx.globalAlpha = 0.45;
        glyph(ctx, s.shape, cx + Math.cos(a) * R * 0.5, cy + Math.sin(a) * R * 0.5, R * 0.075, INK, 20 + i);
        ctx.globalAlpha = 1;
      }
    }
    // Pointes du déclencheur (3 triangles sur le cercle extérieur)
    for (let i = 0; i < 3; i++) {
      const a = -Math.PI / 2 + (i / 3) * TAU;
      const px = cx + Math.cos(a) * R, py = cy + Math.sin(a) * R;
      ctx.strokeStyle = INK;
      ctx.lineWidth = Math.max(1, R * 0.015);
      const tx = cx + Math.cos(a) * R * 1.12, ty = cy + Math.sin(a) * R * 1.12;
      const a1 = a + 0.14, a2 = a - 0.14;
      U.inkPoly(ctx, [[cx + Math.cos(a1) * R * 0.98, cy + Math.sin(a1) * R * 0.98], [tx, ty], [cx + Math.cos(a2) * R * 0.98, cy + Math.sin(a2) * R * 0.98]], 30 + i, R * 0.01, false);
      if (s.trigger && i > 0) {
        ctx.globalAlpha = 0.5;
        glyph(ctx, s.trigger, px, py, R * 0.06, INK, 40 + i);
        ctx.globalAlpha = 1;
      }
    }

    // emplacements
    const slot = (sl, id, kind, enabled, hl) => {
      ctx.save();
      // fond du slot
      ctx.fillStyle = U.hexA('#efe3c4', 0.9);
      ctx.beginPath(); ctx.arc(sl.x, sl.y, sl.r, 0, TAU); ctx.fill();
      ctx.strokeStyle = enabled ? INK : 'rgba(60,45,30,0.3)';
      ctx.lineWidth = Math.max(1, R * 0.014);
      if (!id) ctx.setLineDash([R * 0.03, R * 0.03]);
      if (hl) { ctx.strokeStyle = coul; ctx.lineWidth = Math.max(2, R * 0.03); ctx.setLineDash([]); }
      U.inkCircle(ctx, sl.x, sl.y, sl.r, 50 + sl.x, R * 0.01);
      ctx.setLineDash([]);
      if (id) {
        const col = kind === 'core' ? coul : INK;
        glyph(ctx, id, sl.x, sl.y, sl.r * 0.68, col, 60 + sl.x);
      } else if (opts.empty && !enabled) {
        ctx.strokeStyle = 'rgba(60,45,30,0.3)';
        U.inkLine(ctx, sl.x - sl.r * 0.4, sl.y - sl.r * 0.4, sl.x + sl.r * 0.4, sl.y + sl.r * 0.4, 1, 0.3);
        U.inkLine(ctx, sl.x - sl.r * 0.4, sl.y + sl.r * 0.4, sl.x + sl.r * 0.4, sl.y - sl.r * 0.4, 1, 0.3);
      }
      ctx.restore();
    };
    slot(lay.core, s.core, 'core', true, opts.highlight === 'core');
    slot(lay.shape, s.shape, 'shape', true, opts.highlight === 'shape');
    for (let i = 0; i < 3; i++) slot(lay.mods[i], s.mods[i], 'mod', i < slots, opts.highlight === 'mod' + i);
    slot(lay.trigger, s.trigger, 'trigger', true, opts.highlight === 'trigger');

    ctx.restore();
  }

  // Version compacte pour la barre / icônes : juste le centre coloré
  function drawMini(ctx, s, cx, cy, R, t = 0) {
    const coul = s.core ? DATA.CORES[s.core].couleur : '#8a7a5a';
    ctx.save();
    ctx.lineCap = 'round';
    ctx.strokeStyle = INK;
    ctx.lineWidth = 1.5;
    U.inkCircle(ctx, cx, cy, R, 7, 0.6);
    if (s.core) {
      ctx.save(); ctx.translate(cx, cy); ctx.rotate(t * 0.5);
      ctx.strokeStyle = U.hexA(coul, 0.9); ctx.lineWidth = 1.2;
      for (let i = 0; i < 12; i++) { const a = (i / 12) * TAU; ctx.beginPath(); ctx.moveTo(Math.cos(a) * R * 0.8, Math.sin(a) * R * 0.8); ctx.lineTo(Math.cos(a) * R * 0.92, Math.sin(a) * R * 0.92); ctx.stroke(); }
      ctx.restore();
      glyph(ctx, s.core, cx, cy, R * 0.5, coul, 3);
    }
    if (s.shape) glyph(ctx, s.shape, cx, cy - R * 0.7, R * 0.18, INK, 4);
    ctx.restore();
  }

  return { create, clone, cost, count, etat, autoNom, nom, params, glyph, layout, draw, drawMini };
})();
