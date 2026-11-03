'use strict';
// ---------- Sceaux : modèle, coût, validité, dessin des glyphes et du cercle ----------
const Seal = (() => {
  const { TAU, INK } = U;

  function create() {
    return { nom: '', core: null, core2: null, shape: null, mods: [null, null, null], trigger: null };
  }
  function clone(s) {
    return { nom: s.nom, core: s.core, core2: s.core2 || null, shape: s.shape, mods: s.mods.map((m) => (m && m.sub ? { sub: clone(m.sub) } : m)), trigger: s.trigger };
  }
  const isSub = (m) => !!(m && typeof m === 'object' && m.sub);
  function subs(s) { return s.mods.filter(isSub).map((m) => m.sub); }
  function depth(s) { let d = 0; for (const q of subs(s)) d = Math.max(d, 1 + depth(q)); return d; }
  function cost(s) {
    let c = 0;
    if (s.core) c += DATA.CORES[s.core].cout;
    if (s.core2) c += DATA.CORES[s.core2].cout + 2;
    if (s.shape) c += DATA.SHAPES[s.shape].cout;
    for (const m of s.mods) { if (!m) continue; c += isSub(m) ? cost(m.sub) : DATA.MODS[m].cout; }
    if (s.trigger) c += DATA.TRIGGERS[s.trigger].cout;
    return c;
  }
  function count(s, mod) {
    return s.mods.filter((m) => m === mod).length;
  }
  function modId(m) { return isSub(m) ? 'sous' : m; }
  // Un sceau sans glyphe d'effet est un pétard. Sans forme : effet faible sur soi.
  function etat(s) {
    if (!s.core) return { ok: false, raison: 'Pas de glyphe d\'effet : ce sceau ne fera qu\'un pétard de fumée.' };
    if (!s.shape) return { ok: false, raison: 'Pas de forme : l\'effet se répandra mollement autour de toi.' };
    return { ok: true, raison: s.trigger ? '' : 'Pas de déclencheur : l\'effet sera immédiat.' };
  }
  function comboName(s) {
    if (!s.core || !s.core2) return null;
    const k = [s.core, s.core2].sort().join('|');
    return DATA.COMBOS[k] ? DATA.COMBOS[k].nom : null;
  }
  function autoNom(s) {
    if (!s.core) return 'Pétard';
    let n = comboName(s) || (s.core2 ? DATA.CORES[s.core].nom + '-' + DATA.CORES[s.core2].nom.toLowerCase() : DATA.CORES[s.core].nom);
    if (s.shape) n = DATA.SHAPES[s.shape].nom + ' de ' + n.toLowerCase();
    const mods = s.mods.filter(Boolean);
    if (mods.length) n += ' ' + mods.map((m) => (isSub(m) ? '« ' + nom(m.sub) + ' »' : DATA.MODS[m].nom.toLowerCase())).join(', ');
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
      inverse: n('inverser') > 0,
      echo: n('echo') * 2,
      teleguide: n('teleguide') > 0,
      orbite: n('orbite') > 0,
      canalise: n('canalise') > 0,
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
      case 'froid': for (let i = 0; i < 6; i++) { const a = (i / 6) * TAU; L(0, 0, Math.cos(a) * r * 0.9, Math.sin(a) * r * 0.9); L(Math.cos(a) * r * 0.5, Math.sin(a) * r * 0.5, Math.cos(a + 0.5) * r * 0.7, Math.sin(a + 0.5) * r * 0.7); } break;
      case 'foudre': P([[r * 0.2, -r * 0.95], [-r * 0.4, r * 0.05], [r * 0.1, r * 0.05], [-r * 0.2, r * 0.95], [r * 0.5, -r * 0.1], [0, -r * 0.1]], true); break;
      case 'acide': ctx.beginPath(); ctx.moveTo(0, -r * 0.9); ctx.bezierCurveTo(r * 0.9, r * 0.1, r * 0.6, r * 0.9, 0, r * 0.9); ctx.bezierCurveTo(-r * 0.6, r * 0.9, -r * 0.9, r * 0.1, 0, -r * 0.9); ctx.stroke(); dot(-r * 0.25, r * 0.3, r * 0.1); dot(r * 0.2, r * 0.5, r * 0.08); break;
      case 'gravite': C(0, r * 0.3, r * 0.35); L(-r * 0.7, -r * 0.5, r * 0.7, -r * 0.5); P([[-r * 0.3, -r * 0.2], [0, -r * 0.6], [r * 0.3, -r * 0.2]], false); break;
      case 'temps': C(0, 0, r * 0.85); L(0, 0, 0, -r * 0.55); L(0, 0, r * 0.4, r * 0.25); for (let i = 0; i < 4; i++) { const a = (i / 4) * TAU; dot(Math.cos(a) * r * 0.7, Math.sin(a) * r * 0.7, r * 0.07); } break;
      case 'transmutation': P([[-r * 0.8, r * 0.3], [0, -r * 0.8], [r * 0.8, r * 0.3]], true); L(-r * 0.8, r * 0.3, r * 0.8, r * 0.3); C(0, r * 0.55, r * 0.3); break;
      case 'son': for (let i = 1; i <= 3; i++) { ctx.beginPath(); ctx.arc(-r * 0.4, 0, r * 0.3 * i, -Math.PI / 3, Math.PI / 3); ctx.stroke(); } dot(-r * 0.4, 0, r * 0.12); break;
      case 'esprit': C(0, -r * 0.2, r * 0.6); dot(-r * 0.2, -r * 0.3, r * 0.1); dot(r * 0.2, -r * 0.3, r * 0.1); ctx.beginPath(); ctx.moveTo(-r * 0.5, r * 0.5); ctx.quadraticCurveTo(0, r * 1.0, r * 0.5, r * 0.5); ctx.stroke(); break;
      case 'lien': C(-r * 0.45, 0, r * 0.3); C(r * 0.45, 0, r * 0.3); L(-r * 0.15, 0, r * 0.15, 0); break;
      case 'portail': ctx.beginPath(); ctx.ellipse(-r * 0.4, 0, r * 0.3, r * 0.8, 0, 0, TAU); ctx.stroke(); ctx.beginPath(); ctx.ellipse(r * 0.4, 0, r * 0.3, r * 0.8, 0, 0, TAU); ctx.stroke(); ctx.setLineDash([r * 0.15, r * 0.15]); L(-r * 0.4, 0, r * 0.4, 0); ctx.setLineDash([]); break;
      case 'metal': P([[-r * 0.6, r * 0.8], [-r * 0.6, -r * 0.3], [-r * 0.3, -r * 0.8], [r * 0.3, -r * 0.8], [r * 0.6, -r * 0.3], [r * 0.6, r * 0.8]], false); L(-r * 0.6, r * 0.8, -r * 0.6, r * 0.3); L(r * 0.6, r * 0.8, r * 0.6, r * 0.3); break;
      // --- pseudo-effets ---
      case 'creuser': L(-r * 0.8, r * 0.6, r * 0.2, -r * 0.6); P([[r * 0.2, -r * 0.6], [r * 0.8, -r * 0.9], [r * 0.6, -r * 0.2]], true); break;
      case 'fanaison': ctx.beginPath(); ctx.moveTo(0, r * 0.9); ctx.quadraticCurveTo(r * 0.2, 0, r * 0.6, -r * 0.5); ctx.stroke(); L(-r * 0.6, -r * 0.6, r * 0.2, r * 0.2); break;
      case 'neutraliser': C(0, 0, r * 0.7); L(-r * 0.5, 0, r * 0.5, 0); break;
      case 'poids': P([[-r * 0.7, r * 0.5], [r * 0.7, r * 0.5], [r * 0.3, -r * 0.5], [-r * 0.3, -r * 0.5]], true); L(0, -r * 0.5, 0, -r * 0.9); break;
      case 'secheresse': for (let i = 0; i < 3; i++) L(-r * 0.6 + i * r * 0.6, r * 0.6, -r * 0.4 + i * r * 0.6, -r * 0.4); ctx.setLineDash([r * 0.1, r * 0.1]); L(-r * 0.8, r * 0.8, r * 0.8, r * 0.8); ctx.setLineDash([]); break;
      case 'ralentir': C(0, 0, r * 0.85); L(0, 0, 0, -r * 0.55); L(0, 0, -r * 0.4, r * 0.25); break;
      case 'silence': for (let i = 1; i <= 2; i++) { ctx.beginPath(); ctx.arc(-r * 0.4, 0, r * 0.3 * i, -Math.PI / 3, Math.PI / 3); ctx.stroke(); } L(-r * 0.8, -r * 0.8, r * 0.8, r * 0.8); break;
      case 'rouille': P([[-r * 0.6, r * 0.8], [-r * 0.6, -r * 0.3], [-r * 0.3, -r * 0.8], [r * 0.3, -r * 0.8], [r * 0.6, -r * 0.3], [r * 0.6, r * 0.8]], false); dot(0, r * 0.2, r * 0.15); dot(r * 0.3, r * 0.5, r * 0.1); break;
      // --- formes ---
      case 'projectile': L(-r * 0.8, r * 0.5, r * 0.6, -r * 0.5); P([[r * 0.8, -r * 0.7], [r * 0.15, -r * 0.6], [r * 0.7, -r * 0.05]], false); dot(-r * 0.8, r * 0.5, r * 0.18); break;
      case 'soi': C(0, -r * 0.45, r * 0.3); P([[-r * 0.6, r * 0.9], [0, -r * 0.1], [r * 0.6, r * 0.9]]); break;
      case 'zone': C(0, 0, r * 0.35); for (let i = 0; i < 6; i++) { const a = (i / 6) * TAU; dot(Math.cos(a) * r * 0.8, Math.sin(a) * r * 0.8, r * 0.12); } break;
      case 'trait': L(-r * 0.9, r * 0.6, r * 0.9, -r * 0.6); L(-r * 0.9, r * 0.9, -r * 0.5, r * 0.9); L(r * 0.5, -r * 0.9, r * 0.9, -r * 0.9); break;
      case 'aura': C(0, -r * 0.45, r * 0.22); P([[-r * 0.45, r * 0.8], [0, -r * 0.15], [r * 0.45, r * 0.8]]); ctx.setLineDash([r * 0.12, r * 0.12]); C(0, r * 0.1, r * 0.9); ctx.setLineDash([]); break;
      case 'mur': for (let i = 0; i < 3; i++) U.inkRect(ctx, -r * 0.3, -r * 0.9 + i * r * 0.6, r * 0.6, r * 0.5, seed + i, r * 0.03); break;
      case 'totem': L(0, r * 0.9, 0, -r * 0.6); P([[-r * 0.3, -r * 0.6], [0, -r * 0.95], [r * 0.3, -r * 0.6]], true); for (let i = 1; i <= 2; i++) { ctx.beginPath(); ctx.arc(0, -r * 0.3, r * 0.35 * i, Math.PI * 0.15, Math.PI * 0.85, true); ctx.stroke(); } break;
      case 'chaine': dot(-r * 0.7, r * 0.5, r * 0.15); dot(0, -r * 0.5, r * 0.15); dot(r * 0.7, r * 0.3, r * 0.15); L(-r * 0.7, r * 0.5, 0, -r * 0.5); L(0, -r * 0.5, r * 0.7, r * 0.3); break;
      case 'pluie': ctx.beginPath(); for (let k = 0; k < 4; k++) U.inkCircle(ctx, -r * 0.5 + k * r * 0.33, -r * 0.45, r * 0.25, seed + k, r * 0.02); for (let k = 0; k < 3; k++) L(-r * 0.4 + k * r * 0.4, -r * 0.05, -r * 0.5 + k * r * 0.4, r * 0.6); break;
      case 'objet': U.inkRect(ctx, -r * 0.5, -r * 0.2, r, r, seed, r * 0.03); for (let i = 0; i < 4; i++) { const a = (i / 4) * TAU + 0.4; L(Math.cos(a) * r * 0.8, Math.sin(a) * r * 0.8 - r * 0.3, Math.cos(a) * r * 1.0, Math.sin(a) * r * 1.0 - r * 0.3); } break;
      case 'invocation': C(0, r * 0.1, r * 0.4); dot(-r * 0.12, 0, r * 0.07); dot(r * 0.12, 0, r * 0.07); L(0, -r * 0.3, 0, -r * 0.8); L(-r * 0.3, -r * 0.6, 0, -r * 0.8); L(r * 0.3, -r * 0.6, 0, -r * 0.8); break;
      // --- modificateurs ---
      case 'puissance': L(-r * 0.7, 0, r * 0.7, 0); L(0, -r * 0.7, 0, r * 0.7); dot(r * 0.75, -r * 0.75, r * 0.12); dot(-r * 0.75, r * 0.75, r * 0.12); break;
      case 'portee': L(-r * 0.9, 0, r * 0.9, 0); P([[r * 0.9, 0], [r * 0.4, -r * 0.4]], false); P([[r * 0.9, 0], [r * 0.4, r * 0.4]], false); dot(-r * 0.9, 0, r * 0.15); break;
      case 'duree': P([[-r * 0.6, -r * 0.8], [r * 0.6, -r * 0.8], [-r * 0.6, r * 0.8], [r * 0.6, r * 0.8]]); ctx.globalAlpha *= 0.6; P([[-r * 0.25, r * 0.5], [r * 0.25, r * 0.5], [0, r * 0.15]]); break;
      case 'taille': C(0, 0, r * 0.3); ctx.setLineDash([r * 0.2, r * 0.18]); C(0, 0, r * 0.85); ctx.setLineDash([]); break;
      case 'rebond': P([[-r * 0.8, r * 0.6], [-r * 0.1, -r * 0.6], [r * 0.4, r * 0.3], [r * 0.9, -r * 0.4]], false); break;
      case 'persistance': ctx.beginPath(); ctx.moveTo(-r * 0.9, 0); ctx.bezierCurveTo(-r * 0.9, -r * 0.9, 0, -r * 0.5, 0, 0); ctx.bezierCurveTo(0, r * 0.5, r * 0.9, r * 0.9, r * 0.9, 0); ctx.bezierCurveTo(r * 0.9, -r * 0.9, 0, -r * 0.5, 0, 0); ctx.bezierCurveTo(0, r * 0.5, -r * 0.9, r * 0.9, -r * 0.9, 0); ctx.stroke(); break;
      case 'vitesse': P([[-r * 0.9, -r * 0.6], [-r * 0.3, 0], [-r * 0.9, r * 0.6]], false); P([[-r * 0.1, -r * 0.6], [r * 0.5, 0], [-r * 0.1, r * 0.6]], false); break;
      case 'double': dot(-r * 0.4, 0, r * 0.3); dot(r * 0.4, 0, r * 0.3); ctx.globalAlpha *= 0.6; C(0, 0, r * 0.9); break;
      case 'inverser': ctx.beginPath(); ctx.arc(0, 0, r * 0.7, Math.PI * 0.1, Math.PI * 0.9); ctx.stroke(); ctx.beginPath(); ctx.arc(0, 0, r * 0.7, Math.PI * 1.1, Math.PI * 1.9); ctx.stroke(); P([[-r * 0.9, r * 0.1], [-r * 0.7, r * 0.4], [-r * 0.4, r * 0.15]], false); P([[r * 0.9, -r * 0.1], [r * 0.7, -r * 0.4], [r * 0.4, -r * 0.15]], false); break;
      case 'echo': for (let i = 1; i <= 3; i++) { ctx.globalAlpha = 1 - i * 0.25; C(0, 0, r * 0.3 * i); } break;
      case 'teleguide': ctx.beginPath(); ctx.moveTo(-r * 0.8, r * 0.6); ctx.bezierCurveTo(-r * 0.2, r * 0.6, 0, -r * 0.6, r * 0.6, -r * 0.6); ctx.stroke(); P([[r * 0.6, -r * 0.6], [r * 0.2, -r * 0.7], [r * 0.5, -r * 0.2]], false); C(r * 0.6, -r * 0.6, r * 0.12); break;
      case 'orbite': C(0, 0, r * 0.2); ctx.beginPath(); ctx.ellipse(0, 0, r * 0.9, r * 0.4, -0.5, 0, TAU); ctx.stroke(); dot(r * 0.7, -r * 0.4, r * 0.12); break;
      case 'canalise': L(-r * 0.9, 0, r * 0.3, 0); L(-r * 0.9, -r * 0.3, r * 0.1, -r * 0.3); L(-r * 0.9, r * 0.3, r * 0.1, r * 0.3); dot(r * 0.6, 0, r * 0.2); break;
      case 'sous': C(0, 0, r * 0.9); C(0, 0, r * 0.55); C(0, 0, r * 0.25); break;
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
      core2: slotAt(R * 0.5, 90, R * 0.11),
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
      if (s.core2) g.addColorStop(0, U.hexA(DATA.CORES[s.core2].couleur, 0.35));
      g.addColorStop(s.core2 ? 0.4 : 0, U.hexA(coul, st.ok ? 0.35 : 0.15));
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
        const col = kind === 'core' ? coul : kind === 'core2' ? DATA.CORES[id].couleur : INK;
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
    if (opts.fusion || s.core2) slot(lay.core2, s.core2, 'core2', !!opts.fusion, opts.highlight === 'core2');
    for (let i = 0; i < 3; i++) {
      const m = s.mods[i];
      if (m && m.sub) {
        const sl = lay.mods[i];
        ctx.save(); ctx.fillStyle = U.hexA('#efe3c4', 0.9); ctx.beginPath(); ctx.arc(sl.x, sl.y, sl.r, 0, TAU); ctx.fill(); ctx.restore();
        drawMini(ctx, m.sub, sl.x, sl.y, sl.r * 0.95, t);
        if (opts.highlight === 'mod' + i) { ctx.save(); ctx.strokeStyle = coul; ctx.lineWidth = Math.max(2, R * 0.03); U.inkCircle(ctx, sl.x, sl.y, sl.r, 50 + sl.x, R * 0.01); ctx.restore(); }
      } else slot(lay.mods[i], m, 'mod', i < slots, opts.highlight === 'mod' + i);
    }
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
    if (s.core2) glyph(ctx, s.core2, cx, cy + R * 0.7, R * 0.22, DATA.CORES[s.core2].couleur, 5);
    ctx.restore();
  }

  return { create, clone, cost, count, etat, autoNom, nom, params, glyph, layout, draw, drawMini, isSub, subs, depth, modId, comboName };
})();
