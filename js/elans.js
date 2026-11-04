'use strict';
// ---------- Les élans : ce que chaque essence fait de toi, sur soi ----------
// Le cercle décide : Puissance pousse plus fort, Portée va plus loin, Durée fait durer, Taille élargit les traces,
// Rafale (ou Double) garde des élans d'avance, Téléguidé courbe l'élan vers la souris, Maintenu fait durer le
// mouvement tant qu'on tient le clic, une seconde essence teinte le mouvement (sa trace, son arrivée), une cible le dirige.
function creerElans(W) {
  const { TAU, clamp, lerp, dist } = U;
  const CS = Sim.CS, M = Sim.M, P = Sim.P;
  const st = () => W.st;
  let actif = null, tenu = null, esprit = null, visee = null, ombres = [], etaitFantome = false;

  // ---------- outils ----------
  const centre = (b) => ({ x: b.x + b.w / 2, y: b.y + b.h / 2 });
  const hostile = (c) => c.hp > 0 && !c.sta.tame && c.t !== 'familier' && !c.controlled;
  const D = (prm) => prm.duration || 1, S = (prm) => prm.size || 1;
  function direction(p, aim) { const c = centre(p); const dx = aim.x - c.x, dy = aim.y - c.y, d = Math.hypot(dx, dy); if (d < 24) return { dx: 0, dy: -1, d: 0 }; return { dx: dx / d, dy: dy / d, d }; }
  const dansMonde = (b) => b.x >= 0 && b.y >= 0 && b.x + b.w <= W.L.w && b.y + b.h <= W.L.h;
  const libre = (b) => dansMonde(b) && !Sim.rectBlocked(b) && !W.blockedBy(b, W.dynSolids(st().p));
  function placeLibre(x, y, w, h, R = 72) {
    for (let r = 0; r <= R; r += 6) { const n = r ? 12 : 1; for (let k = 0; k < n; k++) { const a = k / n * TAU; const b = { x: x + Math.cos(a) * r - w / 2, y: y + Math.sin(a) * r - h / 2, w, h }; if (libre(b)) return b; } }
    return null;
  }
  // la dernière place libre le long d'une ligne, sans traverser les murs
  function jusquAuMur(p, dx, dy, L) { const c = centre(p); let best = 0; for (let t = 4; t <= L; t += 4) { if (!libre({ x: c.x + dx * t - p.w / 2, y: c.y + dy * t - p.h / 2, w: p.w, h: p.h })) break; best = t; } return best; }
  function creatureSous(pt, marge = 30) { let best = null, bd = 1e9; for (const c of st().crs) { if (c.hp <= 0 || c.t === 'familier') continue; const cc = centre(c), d = dist(pt.x, pt.y, cc.x, cc.y); if (d < Math.max(c.w, c.h) / 2 + marge && d < bd) { bd = d; best = c; } } return best; }
  const signature = (s) => s ? [s.taille, s.core, s.core2, s.core3, s.shape, (s.mods || []).map((m) => (m && m.sub ? 'sous' : m)).join(','), s.trigger, s.trigger2].join('|') : '';
  const aimSouris = () => W.toWorld(W.game.inp.mouse.x, W.game.inp.mouse.y);

  // ---------- ce qu'une essence fait aux bêtes que l'élan traverse ----------
  function frapper(c, core, prm, dir) {
    const pw = prm.power || 1, cc = centre(c);
    switch (core) {
      case 'feu': c.sta.burn = Math.max(c.sta.burn || 0, 2); W.hurt(c, 0.8 * pw, 'feu'); break;
      case 'eau': c.vx += dir.dx * 320; c.vy += dir.dy * 200 - 90; break;
      case 'terre': W.hurt(c, 1 * pw, 'terre'); c.vy = -320; break;
      case 'vent': c.vx += dir.dx * 460; c.vy += dir.dy * 300 - 170; break;
      case 'vie': c.sta.stun = Math.max(c.sta.stun || 0, 1.5 * pw); W.part(cc.x, cc.y, '#5c8f3e', 6, 40, 0.6, 2, 0, 'feuille'); break;
      case 'lumiere': c.sta.stun = Math.max(c.sta.stun || 0, 1.2 * pw); W.part(cc.x, cc.y, '#f0d070', 6, 50, 0.4, 2, 0, 'spark'); break;
      case 'foudre': W.hurt(c, 2 * pw, 'foudre'); c.sta.stun = Math.max(c.sta.stun || 0, 0.5); W.part(cc.x, cc.y, '#e0c43a', 8, 90, 0.3, 2, 0, 'spark'); break;
      case 'gravite': c.vy = -420 * Math.sqrt(pw); break;
      case 'temps': c.sta.stun = Math.max(c.sta.stun || 0, 1 * pw); break;
      case 'esprit': W.applyEffect('peur', cc.x, cc.y, 16, prm, 'burst', { noPlayer: true, noGrid: true, noField: true }); break;
      case 'transmutation': W.hurt(c, 0.8 * pw, 'acide'); break;
      case 'contre': c.ench = null; break;
      case 'metamorphose': W.applyEffect('metamorphose', cc.x, cc.y, 14, prm, 'burst', { noPlayer: true, noGrid: true, noField: true }); break;
    }
  }
  // la trace qu'une essence laisse derrière l'élan (sur la matière)
  const TRACE = new Set(['feu', 'eau', 'vie', 'lumiere', 'foudre']);
  function tracer(a, x, y) {
    const prm = a.prm, faible = { ...prm, power: (prm.power || 1) * 0.5 };
    for (const n of a.nu) {
      if (TRACE.has(n)) W.gridEffect(n, x, y, 10 * S(prm), faible, true, 1);
      if (n === 'contre') W.dissiper(x, y, 30 * S(prm), true);
      W.part(x, y, W.colorOf(n), 3, 40, 0.5, 2, 0, n === 'feu' ? 'flamme' : 'spark');
    }
    if (a.core === 'feu') W.part(x, y, '#f08a30', 3, 60, 0.4, 2.5, -80, 'flamme');
    if (a.core === 'eau' && Math.random() < 0.6) { const cx = Math.floor(x / CS), cy = Math.floor(y / CS) + 3; if (Sim.get(cx, cy) === M.AIR) Sim.set(cx, cy, M.EAU); }
    if (a.core === 'foudre') W.part(x, y, '#f4e070', 4, 80, 0.25, 2, 0, 'spark');
  }
  // l'arrivée : chaque essence de la teinte y éclate
  const GRILLE_ARRIVEE = new Set(['feu', 'eau', 'vie', 'lumiere', 'foudre', 'vent', 'gravite']);
  function arrivee(core, x, y, prm) {
    if (core === 'terre') { choc(x, y + 20, prm, 0.6); return; }
    if (core === 'portail') return;
    if (core === 'contre') { W.dissiper(x, y, 50 * S(prm), true); return; }
    W.applyEffect(core, x, y, 40 * S(prm), { ...prm, power: (prm.power || 1) * 0.7 }, 'burst', { noPlayer: true, noField: true, noGrid: !GRILLE_ARRIVEE.has(core) });
    st().sp.push({ k: 'ring', core, x, y, r: 40 * S(prm), life: 0.4, max: 0.4, color: W.colorOf(core) });
  }
  // une onde de choc au sol
  function choc(x, y, prm, k = 1) {
    const pw = prm.power || 1, R = 95 * S(prm) * k;
    for (const c of st().crs) { if (!hostile(c)) continue; const cc = centre(c), d = dist(x, y, cc.x, cc.y); if (d > R) continue; const f = 1 - d / R; W.hurt(c, (2 * pw * f + 0.5) * k, 'terre'); c.vx += Math.sign(cc.x - x || 1) * 380 * f; c.vy = -300 * f - 100; c.sta.stun = Math.max(c.sta.stun || 0, 0.6); }
    W.part(x, y, '#8a6b2f', Math.round(18 * k), 160, 0.6, 3, 500, 'eclat'); W.shake(0.35 * k); Son.sfx('burst', 'terre');
    st().sp.push({ k: 'ring', core: 'terre', x, y, r: R, life: 0.45, max: 0.45, color: '#8a6b2f' });
  }

  // ---------- la teinte : ce que les autres essences du sceau font au mouvement ----------
  function teinte(nu, prm, p, T, aim, spec) {
    const d = D(prm);
    for (const n of nu) switch (n) {
      case 'vent': p.sta.glide = Math.max(p.sta.glide || 0, 1.2 * d); break;
      case 'foudre': p.inv = Math.max(p.inv || 0, T + 0.3); p.sta.vitesse = Math.max(p.sta.vitesse || 0, 2 * d); break;
      case 'gravite': p.sta.lowgrav = Math.max(p.sta.lowgrav || 0, 1.5 * d); break;
      case 'temps': { const c = centre(p); st().sp.push({ k: 'bulle', mode: 'lent', x: c.x, y: c.y, r: 150 * S(prm), life: 1.6 * d, max: 1.6 * d, f: 0.25, suit: p }); p.sta.hate = Math.max(p.sta.hate || 0, 3 * d); break; }
      case 'transmutation': p.sta.fantome = Math.max(p.sta.fantome || 0, T + 0.4); break;
      case 'eau': p.sta.wet = Math.max(p.sta.wet || 0, 6 * d); p.sta.branchies = Math.max(p.sta.branchies || 0, 10 * d); p.sta.burning = 0; break;
      case 'vie': p.hp = Math.min(p.hpMax, p.hp + 2 * (prm.power || 1)); p.sta.burning = 0; break;
      case 'lumiere': p.sta.lumiere = Math.max(p.sta.lumiere || 0, 6 * d); break;
      case 'terre': p.sta.stone = Math.max(p.sta.stone || 0, 2 * d); break;
      case 'contre': p.sta.miroir = Math.max(p.sta.miroir || 0, 2 * d); break;
      case 'feu': if (p.sta.wet > 0) p.sta.wet = 0; break;
      case 'portail': case 'esprit': case 'metamorphose': break;
      // un aspect ou un effet inversé : son effet sur soi, comme avant
      default: W.applySelf(n, prm, aim, spec);
    }
  }
  // lancer l'élan : une poussée (vol) ou une course forcée (dash) que l'on suit image par image
  function depart(p, core, prm, spec, nu, mode, vx, vy, T, o = {}) {
    let k = 1; if (nu.includes('foudre')) k *= 1.35; if (nu.includes('feu')) k *= 1.15; if (nu.includes('vent')) k *= 1.1;
    vx *= k; vy *= k; if (nu.includes('vent') && mode === 'vol') vy -= 100;
    const c = centre(p);
    actif = Object.assign({ core, prm, spec, nu, mode, vx, vy, t: T, max: T, hits: new Set(), lx: c.x, ly: c.y, x0: c.x, y0: c.y, fy: Math.floor((p.y + p.h) / CS) }, o);
    p.sta.amorti = Math.max(p.sta.amorti || 0, T + 0.8);
    if (mode === 'vol') { p.vx = vx; p.vy = vy; p.onGround = false; }
    // teinté d'Espace : l'élan devient un clin d'œil, on est aussitôt au bout
    if (nu.includes('portail')) {
      const L = Math.hypot(vx, vy) * (mode === 'dash' ? T : 0.3), dr = { dx: vx / (Math.hypot(vx, vy) || 1), dy: vy / (Math.hypot(vx, vy) || 1) };
      const b = placeLibre(c.x + dr.dx * L, c.y + dr.dy * L, p.w, p.h) || { x: c.x + dr.dx * jusquAuMur(p, dr.dx, dr.dy, L) - p.w / 2, y: c.y + dr.dy * jusquAuMur(p, dr.dx, dr.dy, L) - p.h / 2, w: p.w, h: p.h };
      const a = actif; actif = null; sauter(p, b, a);
      if (mode === 'vol') { p.vx = vx * 0.6; p.vy = vy * 0.6; }
    }
  }
  // un déplacement instantané le long d'une ligne : ce qu'on traverse est touché, la trace est laissée
  function sauter(p, b, a) {
    const c0 = centre(p), c1 = { x: b.x + b.w / 2, y: b.y + b.h / 2 }, L = dist(c0.x, c0.y, c1.x, c1.y), dr = { dx: (c1.x - c0.x) / (L || 1), dy: (c1.y - c0.y) / (L || 1) };
    for (const c of st().crs) { if (!hostile(c) || a.hits.has(c)) continue; for (let t = 0; t <= L; t += 8) { const x = c0.x + dr.dx * t, y = c0.y + dr.dy * t; if (U.circleRect(x, y, 14, c)) { a.hits.add(c); frapper(c, a.core, a.prm, dr); for (const n of a.nu) frapper(c, n, a.prm, dr); break; } } }
    for (let t = 30; t < L; t += 34) tracer(a, c0.x + dr.dx * t, c0.y + dr.dy * t);
    W.part(c0.x, c0.y, W.colorOf(a.core), 14, 80, 0.5, 3, 0, 'glow');
    st().sp.push({ k: 'beam', core: a.core, x1: c0.x, y1: c0.y, x2: c1.x, y2: c1.y, life: 0.3, max: 0.3, color: W.colorOf(a.core), w: 5 });
    p.x = b.x; p.y = b.y; p.vx = 0; p.vy = 0; W.unstick(p);
    W.part(c1.x, c1.y, W.colorOf(a.core), 14, 80, 0.5, 3, 0, 'glow');
    p.sta.amorti = Math.max(p.sta.amorti || 0, 0.8); p.inv = Math.max(p.inv || 0, 0.2);
    arriver(a);
  }
  function arriver(a) {
    const p = st().p, c = centre(p), prm = a.prm;
    if (a.slam) choc(c.x, p.y + p.h, prm, 1);
    if (a.core === 'foudre') { W.gridEffect('foudre', c.x, c.y, 26 * S(prm), prm, true, 1); W.part(c.x, c.y, '#f4e070', 10, 120, 0.3, 2, 0, 'spark'); }
    for (const n of a.nu) arrivee(n, c.x, c.y, prm);
    if (a.mode === 'dash') { p.vx = a.vx * 0.25; p.vy = a.slam ? 0 : a.vy * 0.25; }
    if (a.liane || a.nu.includes('contre')) { p.vx = 0; p.vy = 0; }
  }

  // ---------- les élans immédiats, essence par essence ----------
  function liane(x, y, n = 10) { let cx = Math.floor(x / CS), cy = Math.floor(y / CS); for (let i = 0; i < n; i++) { const m = Sim.get(cx, cy + i); if (m === M.AIR) Sim.set(cx, cy + i, M.PLANTE); else if (P[m].solid && i > 0) break; } }
  const IMM = {
    feu(p, prm, aim, nu, spec) {
      const dr = direction(p, aim), pw = Math.sqrt(prm.power || 1), c = centre(p);
      if (p.sta.wet > 0) { p.sta.wet = 0; W.part(c.x, c.y, '#ccc', 10, 50); }
      W.applyEffect('feu', c.x - dr.dx * 22, c.y - dr.dy * 22 + 10, 34 * S(prm), { ...prm, power: (prm.power || 1) * 0.7 }, 'burst', { noPlayer: true, noField: true });
      W.part(c.x - dr.dx * 10, c.y - dr.dy * 10, '#f08a30', 24, 260, 0.5, 3, -100, 'flamme');
      depart(p, 'feu', prm, spec, nu, 'vol', dr.dx * 640 * pw, dr.dy * 640 * pw - 140, 0.55);
      W.msg('Une gerbe de flammes te propulse !');
    },
    eau(p, prm, aim, nu, spec) {
      const dr = direction(p, aim), pw = Math.sqrt(prm.power || 1), c = centre(p), dans = !!p.liq, v = (dans ? 780 : 540) * pw;
      for (let i = 0; i < 8; i++) { const x = Math.floor((c.x - dr.dx * (18 + i * 3) + (Math.random() - 0.5) * 10) / CS), y = Math.floor((c.y - dr.dy * (18 + i * 3) + (Math.random() - 0.5) * 10) / CS); if (Sim.get(x, y) === M.AIR) Sim.set(x, y, M.EAU); }
      p.sta.wet = Math.max(p.sta.wet || 0, 6 * D(prm)); p.sta.branchies = Math.max(p.sta.branchies || 0, 20 * D(prm)); p.sta.burning = 0;
      W.part(c.x, c.y, '#5f9ad8', 14, 120, 0.6, 2.4, 300, 'goutte');
      depart(p, 'eau', prm, spec, nu, 'vol', dr.dx * v, dr.dy * v - 80, 0.5);
      W.msg(dans ? 'Un jet d\'eau : tu files comme un dauphin.' : 'Un jet d\'eau te pousse, et tu respires l\'eau un moment.');
    },
    vent(p, prm, aim, nu, spec) {
      const dr = direction(p, aim), pw = Math.sqrt(prm.power || 1), c = centre(p), v = 600 * pw;
      W.applyEffect('vent', c.x, c.y, 60 * S(prm), prm, 'burst', { noPlayer: true, self: true });
      p.sta.glide = Math.max(p.sta.glide || 0, 1.6 * D(prm));
      W.part(c.x, p.y + p.h, '#3f9c9b', 12, 80);
      depart(p, 'vent', prm, spec, nu, 'vol', dr.dx * v, dr.d ? dr.dy * v - 60 : -560 * pw, 0.45);
    },
    terre(p, prm, aim, nu, spec) {
      const dr = direction(p, aim), pw = Math.sqrt(prm.power || 1);
      p.sta.stone = Math.max(p.sta.stone || 0, 6 * D(prm));
      if (!p.onGround && dr.dy > 0.45) { depart(p, 'terre', prm, spec, nu, 'dash', dr.dx * 260, 1250 * pw, 1.2, { slam: true }); W.msg('Tu t\'abats sur le sol comme un rocher !'); return; }
      // un pilier surgit sous tes pieds et te lance (de pierre avec Persistance : il reste)
      const v = 700 * pw;
      depart(p, 'terre', prm, spec, nu, 'vol', (dr.d ? dr.dx : 0) * v * 0.55, -v, 0.3, { pilier: prm.persist > 0 ? M.PIERRE : M.TERRE });
      W.part(p.x + p.w / 2, p.y + p.h, '#8a6b2f', 14, 120, 0.6, 3, 400, 'eclat'); Son.sfx('burst', 'terre');
      W.msg(prm.persist > 0 ? 'Un pilier de pierre te soulève, et reste.' : 'La terre te soulève !');
    },
    vie(p, prm, aim, nu, spec) {
      const dr = direction(p, aim), c = centre(p);
      p.hp = Math.min(p.hpMax, p.hp + 4 * (prm.power || 1)); p.sta.burning = 0;
      W.applyEffect('vie', c.x, c.y, 60 * S(prm), prm, 'burst', { noPlayer: true, self: true });
      if (!dr.d) { W.msg('La vie te répare.'); return; }
      const h = Sim.raycast(c.x, c.y, dr.dx, dr.dy, Math.min(dr.d + 40, 340 * (prm.range || 1)));
      if (!h) { W.msg('La vie te répare ; la liane ne trouve rien où s\'accrocher.'); return; }
      const ax = h.x - dr.dx * CS, ay = h.y - dr.dy * CS; liane(ax, ay);
      const L = Math.max(0, h.t - 24);
      if (L < 8) { W.msg('Une liane pousse contre le mur : grimpe (↑).'); return; }
      depart(p, 'vie', prm, spec, nu, 'dash', dr.dx * 760, dr.dy * 760, L / 760, { liane: { x: ax, y: ay } });
      W.msg('Une liane t\'emporte : accroche-toi (↑).');
    },
    lumiere(p, prm, aim, nu, spec) {
      const dr = direction(p, aim), c = centre(p);
      p.sta.lumiere = Math.max(p.sta.lumiere || 0, 10 * D(prm));
      if (!dr.d) { W.applyEffect('lumiere', c.x, c.y, 160 * S(prm), prm, 'burst', { noPlayer: true, noField: true }); W.msg('Tu rayonnes comme une lanterne.'); return; }
      const L = jusquAuMur(p, dr.dx, dr.dy, Math.min(dr.d, 320 * (prm.range || 1)));
      const a = { core: 'lumiere', prm, spec, nu, mode: 'saut', hits: new Set() };
      sauter(p, { x: c.x + dr.dx * L - p.w / 2, y: c.y + dr.dy * L - p.h / 2, w: p.w, h: p.h }, a);
      p.vx = dr.dx * 200; p.vy = dr.dy * 200;
      W.msg('Tu files en un rayon de lumière.');
    },
    foudre(p, prm, aim, nu, spec, o = {}) {
      const dr = direction(p, aim), pw = prm.power || 1, v = 1500;
      let L = (o.court ? 190 : 270) * (prm.range || 1) * Math.sqrt(pw); if (o.cible) L = dr.d + 30; // la bête visée : jusqu'à elle
      if (!o.court) p.sta.vitesse = Math.max(p.sta.vitesse || 0, 4 * D(prm));
      p.inv = Math.max(p.inv || 0, L / v + 0.3);
      depart(p, 'foudre', prm, spec, nu, 'dash', dr.dx * v, dr.dy * v, L / v);
      W.part(p.x + p.w / 2, p.y + p.h / 2, '#f4e070', 12, 140, 0.3, 2, 0, 'spark'); Son.sfx('cast', 'foudre');
      if (!o.court) W.msg('Un éclair : tu y es déjà.');
    },
    portail(p, prm, aim, nu, spec, o = {}) {
      const c = centre(p), dr = direction(p, aim), Rg = (o.loin ? 480 : 320) * (prm.range || 1), P2 = st().portails;
      const a = { core: 'portail', prm, spec, nu, mode: 'saut', hits: new Set() };
      // vers un de tes portails : tu ressors par l'autre ; sur toi : ton dernier portail
      if (P2.length === 2) for (const [q, r] of [[P2[0], P2[1]], [P2[1], P2[0]]]) if (dist(aim.x, aim.y, q.x, q.y) < 60) { const b = placeLibre(r.x, r.y, p.w, p.h); if (b) { sauter(p, b, a); W.msg('Tu passes par tes portails.'); return; } }
      if (!dr.d) { const q = P2[P2.length - 1]; const b = q && placeLibre(q.x, q.y, p.w, p.h); if (b) { sauter(p, b, a); W.msg('Tu traverses jusqu\'à ton dernier portail.'); } else W.msg('Vise un endroit : l\'Espace t\'y pose.'); return; }
      // sur une créature : vous échangez vos places
      const cr = o.cible || creatureSous(aim, 12);
      if (cr && cr.t !== 'gardien' && dist(c.x, c.y, cr.x + cr.w / 2, cr.y + cr.h / 2) <= Rg + 40) {
        const ox = p.x, oy = p.y + p.h; const b = placeLibre(cr.x + cr.w / 2, cr.y + cr.h - p.h / 2, p.w, p.h);
        if (b) { cr.x = ox + p.w / 2 - cr.w / 2; cr.y = oy - cr.h; cr.vx = cr.vy = 0; W.unstick(cr); sauter(p, b, a); W.msg('Vous échangez vos places !'); return; }
      }
      // là où pointe la souris, à travers les murs, dans la portée (une marque : à n'importe quelle distance)
      const k = o.loin && o.marque ? 1 : Math.min(1, Rg / Math.max(1, dr.d));
      const b = placeLibre(c.x + (aim.x - c.x) * k, c.y + (aim.y - c.y) * k, p.w, p.h);
      if (!b) { W.msg('Pas de place pour toi là-bas.'); return; }
      sauter(p, b, a); W.msg(o.marque ? 'Tu reviens à ta marque.' : 'L\'espace se plie : tu y es.');
    },
    esprit(p, prm, aim, nu, spec, o = {}) {
      const c = centre(p), dr = direction(p, aim), Rg = 420 * (prm.range || 1);
      const cr = o.cible || creatureSous(aim, 40);
      if (cr && dist(c.x, c.y, cr.x + cr.w / 2, cr.y + cr.h / 2) <= Rg) { W.controlCreature(cr, 12 * D(prm)); return; }
      // sinon ton esprit file vers la souris, à travers les murs, et entre dans la première bête qu'il touche
      const v = 700; esprit = { x: c.x, y: c.y - 10, vx: (dr.d ? dr.dx : 0) * v, vy: (dr.d ? dr.dy : -1) * v, t: Rg / v, prm, vu: new Set(), tenu: false };
      W.msg('Ton esprit s\'élance hors de ton corps...');
    },
    transmutation(p, prm) {
      p.sta.fantome = Math.max(p.sta.fantome || 0, 5 * D(prm));
      W.part(p.x + p.w / 2, p.y + p.h / 2, '#c08a3a', 18, 80, 0.7, 2.5, 200, 'eclat');
      W.msg('Ton corps devient sable fin : tu passes à travers la roche (↓ pour t\'enfoncer dans le sol).');
    },
    contre(p, prm, aim, nu, spec) {
      p.vx = 0; p.vy = 0; p.sta.suspendu = 0.8 * D(prm); p.sta.miroir = Math.max(p.sta.miroir || 0, 5 * D(prm)); p.sta.lent = 0; p.sta.burning = 0;
      W.applySelf('contre', prm, aim, spec);
      W.msg('Tout s\'arrête autour de toi. Les tirs qui te visent te reviennent dessus... renvoyés.');
    },
  };
  // la cible dirige l'élan : la bête hostile la plus proche, ou ta dernière marque (même au bout du monde)
  function viser(spec, aim) {
    const p = st().p, c = centre(p);
    if (spec.cible === 'creature') { let best = null, bd = 520 * (spec.prm.range || 1); for (const cr of st().crs) if (hostile(cr)) { const d = dist(c.x, c.y, cr.x + cr.w / 2, cr.y + cr.h / 2); if (d < bd) { bd = d; best = cr; } } if (best) return { aim: centre(best), cible: best }; W.msg('Aucune bête à viser : l\'élan suit la souris.'); }
    if (spec.cible === 'marque') { const m = st().marques[st().marques.length - 1]; const pos = m && W.posMarque(m); if (pos) return { aim: { x: pos.x, y: pos.y }, loin: true, marque: true }; W.msg('Aucune marque posée : l\'élan suit la souris.'); }
    return { aim };
  }
  // lancé sur soi : l'élan de l'essence du centre, teinté des autres. Faux si l'essence n'a pas d'élan propre.
  function lancer(spec, aim) {
    const p = st().p, prm = spec.prm, prim = spec.cores[0];
    if (!IMM[prim]) return false;
    const v = viser(spec, aim), nu = [...new Set(spec.cores.slice(1))].filter((c) => c !== prim);
    actif = null;
    IMM[prim](p, prm, v.aim, nu, spec, v);
    teinte(nu, prm, p, actif ? actif.max : 0.3, v.aim, spec);
    // Rafale (ou Double) : des élans d'avance, à relancer aussitôt et sans encre
    const n = (prm.rafale ? (prm.rafale > 1 ? 4 : 2) : 0) + (prm.extra || 0);
    if (n && !spec.avance) p.avance = { sig: signature(spec.seal), n, fin: W.time + 4, core: prim };
    W.evt('elan', prim);
    return true;
  }
  // un élan d'avance est-il prêt pour ce sceau ? (le consomme)
  function avance(seal) {
    const a = st().p.avance; if (!a || a.n <= 0 || W.time > a.fin || a.sig !== signature(seal)) return false;
    a.n--; a.fin = W.time + 4; if (a.n <= 0) st().p.avance = null; return true;
  }

  // ---------- les élans maintenus : tant que l'on tient le clic ----------
  function voler(p, dt, v, k = 5) { const dr = direction(p, aimSouris()); if (!dr.d) { p.vy = lerp(p.vy, -v * 0.3, Math.min(1, dt * k)); return dr; } p.vx = lerp(p.vx, dr.dx * v, Math.min(1, dt * k)); p.vy = lerp(p.vy, dr.dy * v, Math.min(1, dt * k)); p.onGround = false; return dr; }
  const TENIR = {
    feu: { msg: 'Des flammes jaillissent de tes pieds : tu voles où pointe la souris.', pas(t, p, dt) {
      const dr = voler(p, dt, 480 * Math.sqrt(t.prm.power || 1)), c = centre(p), bx = c.x - dr.dx * 26, by = c.y - dr.dy * 26 + 12;
      W.part(bx, by, '#f08a30', 3, 160, 0.35, 3, -60, 'flamme');
      if ((t.tick -= dt) <= 0) { t.tick = 0.15; for (const cr of st().crs) if (hostile(cr) && U.circleRect(bx, by, 26, cr)) frapper(cr, 'feu', t.prm, dr); if (Math.random() < 0.3) W.gridEffect('feu', bx, by + 6, 8, t.prm, true, 1); }
    } },
    eau: { msg: 'Un jet d\'eau te porte : vise pour te diriger.', pas(t, p, dt) {
      const dr = voler(p, dt, (p.liq ? 650 : 420) * Math.sqrt(t.prm.power || 1)), c = centre(p);
      p.sta.wet = Math.max(p.sta.wet || 0, 1); p.sta.branchies = Math.max(p.sta.branchies || 0, 1); p.sta.burning = 0;
      if (Math.random() < 0.35) { const x = Math.floor((c.x - dr.dx * 22) / CS), y = Math.floor((c.y - dr.dy * 22 + 10) / CS); if (Sim.get(x, y) === M.AIR) Sim.set(x, y, M.EAU); }
      W.part(c.x - dr.dx * 18, c.y - dr.dy * 18, '#5f9ad8', 2, 120, 0.4, 2, 300, 'goutte');
    } },
    vent: { msg: 'Le vent te porte : tu voles où pointe la souris.', pas(t, p, dt) {
      voler(p, dt, 400 * Math.sqrt(t.prm.power || 1)); p.sta.glide = Math.max(p.sta.glide || 0, 0.3);
      if ((t.tick -= dt) <= 0) { t.tick = 0.25; const c = centre(p); W.applyEffect('vent', c.x, c.y, 50 * S(t.prm), { ...t.prm, power: (t.prm.power || 1) * 0.5 }, 'burst', { noPlayer: true, self: true, noField: true }); }
      if (Math.random() < 0.4) W.part(p.x + p.w / 2, p.y + p.h, '#3f9c9b', 1, 60, 0.4, 2);
    } },
    gravite: { msg: 'Plus rien ne pèse : tu lévites vers la souris.', pas(t, p, dt) { voler(p, dt, 300, 4); if (Math.random() < 0.3) W.part(p.x + p.w / 2, p.y + p.h, '#6c5ab8', 1, 30, 0.6, 2, 60, 'spark'); } },
    lumiere: { msg: 'Tu deviens lumière : rien ne te touche, tu files où tu vises.', pas(t, p, dt) {
      const dr = voler(p, dt, 620, 10); p.inv = Math.max(p.inv || 0, 0.15); p.sta.lumiere = Math.max(p.sta.lumiere || 0, 1);
      for (const cr of st().crs) if (hostile(cr) && U.rectsOverlap({ x: p.x - 8, y: p.y - 8, w: p.w + 16, h: p.h + 16 }, cr) && (t.vus.get(cr) || -9) < W.time - 1) { t.vus.set(cr, W.time); frapper(cr, 'lumiere', t.prm, dr); }
    } },
    terre: { msg: 'Tu creuses comme une taupe : vise où aller.', pas(t, p, dt) {
      const dr = direction(p, aimSouris()), c = centre(p), v = 230 * Math.sqrt(t.prm.power || 1), pw = t.prm.power || 1;
      if (dr.d) { p.vx = dr.dx * v; p.vy = dr.dy * v; } else { p.vx *= 0.8; p.vy = Math.min(p.vy, 0); }
      p.onGround = false; let n = 0;
      // la terre et le sable cèdent aussitôt, la pierre plus lentement (tout de suite avec Puissance)
      const av = Math.abs(dr.dx) * p.w / 2 + Math.abs(dr.dy) * p.h / 2; // au front du corps
      Sim.forRadius(c.x + dr.dx * av, c.y + dr.dy * av, 22 * S(t.prm), (x, y, i, m) => { const q = P[m]; if (q.solid && m !== M.OBSIDIENNE && (q.dig || pw >= 1.5 || Math.random() < 0.3)) { Sim.set(x, y, M.AIR); n++; } });
      if (n && Math.random() < 0.5) W.part(c.x + dr.dx * 14, c.y + dr.dy * 14, '#8a6b2f', 2, 90, 0.4, 2, 500, 'eclat');
    } },
    vie: { msg: 'La liane tient tant que tu tiens le clic ; la vie te répare.', debut(t, p) {
      const dr = direction(p, aimSouris()), c = centre(p); if (!dr.d) return;
      const h = Sim.raycast(c.x, c.y, dr.dx, dr.dy, 340 * (t.prm.range || 1)); if (!h) return;
      liane(h.x - dr.dx * CS, h.y - dr.dy * CS); W.attachLien(null, h.x, h.y, 99); t.corde = true;
    }, pas(t, p) { p.sta.regen = Math.max(p.sta.regen || 0, 0.3); }, fin(t) { if (t.corde) st().lien = null; } },
    foudre: { msg: 'Une tempête d\'éclairs : tu bondis d\'éclair en éclair vers la souris.', pas(t, p, dt) {
      if ((t.tick -= dt) > 0 || actif) return; t.tick = 0.3;
      IMM.foudre(p, t.prm, aimSouris(), [], t.spec, { court: true });
    } },
    temps: { msg: 'Le monde ralentit autour de toi ; toi, non.', debut(t, p) { const c = centre(p); t.bulle = { k: 'bulle', mode: 'lent', x: c.x, y: c.y, r: 340 * S(t.prm), life: 1, max: 1, f: 0.25, suit: p }; st().sp.push(t.bulle); },
      pas(t) { if (t.bulle) t.bulle.life = 0.5; }, fin(t) { if (t.bulle) t.bulle.life = 0.3; } },
    portail: { msg: 'Vise où paraître, puis lâche : tu y es.', pas(t, p) {
      const c = centre(p), a = aimSouris(), dr = direction(p, a), Rg = 480 * (t.prm.range || 1), k = Math.min(1, Rg / Math.max(1, dr.d));
      visee = { x: c.x + (a.x - c.x) * k, y: c.y + (a.y - c.y) * k, w: p.w, h: p.h, ok: !!placeLibre(c.x + (a.x - c.x) * k, c.y + (a.y - c.y) * k, p.w, p.h) };
    }, fin(t, p) { visee = null; if (t.lache) IMM.portail(p, t.prm, aimSouris(), [], t.spec, { loin: true }); } },
    esprit: { msg: 'Ton esprit quitte ton corps : promène-le, touche une bête pour y entrer. Lâche pour revenir.', debut(t, p) { const c = centre(p); esprit = { x: c.x, y: c.y - 10, vx: 0, vy: 0, t: 99, prm: t.prm, vu: new Set(), tenu: true }; },
      fin() { if (esprit && esprit.tenu) { esprit = null; W.msg('Ton esprit regagne ton corps.'); } } },
    transmutation: { msg: 'Tu es sable fin tant que tu tiens : passe à travers la roche.', pas(t, p) { p.sta.fantome = Math.max(p.sta.fantome || 0, 0.25); } },
    contre: { msg: 'Rien ne t\'atteint : tu restes suspendu(e), et les tirs te reviennent dessus... renvoyés.', pas(t, p) { p.sta.suspendu = Math.max(p.sta.suspendu || 0, 0.15); p.sta.miroir = Math.max(p.sta.miroir || 0, 0.3); } },
    metamorphose: { msg: 'Tu gardes ta forme tant que tu tiens le clic.', debut(t, p) { if (!p.forme) W.applySelf('metamorphose', t.prm, aimSouris(), t.spec); },
      pas(t, p) { if (!p.forme) return; p.sta.forme = Math.max(p.sta.forme || 0, 0.5); for (const k of W.FORMES[p.forme].sta) p.sta[k] = Math.max(p.sta[k] || 0, 0.5); },
      fin(t, p) { if (p.forme) W.applySelf('metamorphose', t.prm, aimSouris(), t.spec); } },
  };
  function tenir(spec, hand, drain) {
    const prim = spec.cores[0], T = TENIR[prim]; if (!T) return false;
    arreter(false);
    const p = st().p;
    tenu = { core: prim, spec, prm: spec.prm, hand, drain, t: 0, tick: 0, T, vus: new Map() };
    if (T.debut) T.debut(tenu, p);
    W.msg(T.msg); W.evt('elan', prim);
    return true;
  }
  function arreter(lache = true) { if (!tenu) return; const t = tenu; tenu = null; t.lache = lache; if (t.T.fin) t.T.fin(t, st().p); }

  // ---------- chaque image : piloter le corps avant qu'il ne bouge ----------
  // 0 : rien ; 1 : vitesses imposées (le corps bouge normalement) ; 2 : le corps est déjà déplacé (passe-muraille)
  function piloter(p, dt, inp) {
    if (tenu) {
      const tient = W.tient(tenu.hand);
      p.ink -= (tenu.drain + (p.inkRegen || 0) * ((W.game.opt && W.game.opt.regen) || 1)) * dt;
      if (!tient || p.ink <= 0) { if (p.ink <= 0) { p.ink = 0; W.msg('Plus d\'encre : l\'élan retombe.', 'warn'); } arreter(tient ? false : true); }
      else { tenu.t += dt; if (tenu.T.pas) tenu.T.pas(tenu, p, dt, inp); p.sta.amorti = Math.max(p.sta.amorti || 0, 0.5); }
    }
    if (esprit) { p.vx = 0; return 1; }
    if (actif && actif.mode === 'dash') {
      if (actif.prm.teleguide && !actif.slam) { const dr = direction(p, aimSouris()), v = Math.hypot(actif.vx, actif.vy); if (dr.d) { actif.vx = lerp(actif.vx, dr.dx * v, Math.min(1, dt * 8)); actif.vy = lerp(actif.vy, dr.dy * v, Math.min(1, dt * 8)); } }
      p.vx = actif.vx; p.vy = actif.vy; p.climbing = false; return 1;
    }
    if (p.sta.fantome > 0) return fantome(p, dt, inp);
    if (p.sta.suspendu > 0 && !(tenu && tenu.core !== 'contre')) { p.vy = 0; p.vx *= Math.max(0, 1 - 6 * dt); return 1; }
    return tenu ? 1 : 0;
  }
  // passe-muraille : dans la roche, on nage ; dehors, le sol porte, sauf si l'on appuie sur ↓
  function fantome(p, dt, inp) {
    const dedans = Sim.rectBlocked(p), dirX = (inp.right ? 1 : 0) - (inp.left ? 1 : 0), dirY = (inp.down ? 1 : 0) - (inp.up ? 1 : 0);
    const avant = { x: p.x, y: p.y };
    if (dedans) { p.vx = lerp(p.vx, dirX * 190, Math.min(1, dt * 8)); p.vy = lerp(p.vy, dirY * 190 - (inp.jumpHeld ? 190 : 0), Math.min(1, dt * 8)); p.x += p.vx * dt; p.y += p.vy * dt; p.onGround = false; }
    else {
      const vx = p.vx; p.vx = 0; if (inp.down) { p.y += Math.max(p.vy, 140) * dt; } else W.moveBody(p, dt); p.vx = vx; p.x += vx * dt;
    }
    p.x = clamp(p.x, 0, W.L.w - p.w); p.y = clamp(p.y, 0, W.L.h - p.h);
    if (Sim.rectHas(p, (m) => m === M.OBSIDIENNE)) { p.x = avant.x; p.y = avant.y; p.vx = 0; p.vy = 0; }
    if (Math.random() < 0.25) W.part(p.x + Math.random() * p.w, p.y + Math.random() * p.h, '#c08a3a', 1, 20, 0.5, 2, 100);
    return 2;
  }
  function sortirDeLaRoche(p) {
    if (!Sim.rectBlocked(p)) return;
    const c = centre(p), b = placeLibre(c.x, c.y, p.w, p.h, 400);
    if (b) { p.x = b.x; p.y = b.y; p.vx = p.vy = 0; W.msg('Le sable redevient chair : tu sors de la roche.'); }
    else W.respawn();
  }
  // après le mouvement : suivre l'élan, l'esprit, les bulles qui suivent, la fin du passe-muraille
  function apres(p, dt) {
    if (actif) suivre(p, dt);
    if (esprit) majEsprit(p, dt);
    if (etaitFantome && !(p.sta.fantome > 0)) sortirDeLaRoche(p);
    etaitFantome = p.sta.fantome > 0;
    for (const q of st().sp) if (q.suit && !q.mort) { q.x = q.suit.x + q.suit.w / 2; q.y = q.suit.y + q.suit.h / 2; }
    if (actif || (tenu && ['feu', 'eau', 'vent', 'lumiere', 'gravite', 'foudre'].includes(tenu.core))) { if (Math.random() < 0.7) ombres.push({ x: p.x, y: p.y, w: p.w, h: p.h, t: 0.25, c: W.colorOf(actif ? actif.core : tenu.core) }); }
    for (const o of ombres) o.t -= dt; ombres = ombres.filter((o) => o.t > 0).slice(-14);
  }
  function suivre(p, dt) {
    const a = actif; a.t -= dt; const c = centre(p), v = Math.hypot(p.vx, p.vy) || 1, dr = { dx: p.vx / v, dy: p.vy / v };
    // le pilier monte sous les pieds
    if (a.pilier) { const fy = Math.floor((p.y + p.h) / CS) + 1, x0 = Math.floor((p.x + 2) / CS), x1 = Math.floor((p.x + p.w - 2) / CS); for (let y = fy; y <= a.fy; y++) for (let x = x0; x <= x1; x++) if (Sim.get(x, y) === M.AIR) Sim.set(x, y, a.pilier); a.fy = Math.min(a.fy, fy); }
    const box = { x: p.x - 6, y: p.y - 6, w: p.w + 12, h: p.h + 12 };
    for (const cr of st().crs) if (hostile(cr) && !a.hits.has(cr) && U.rectsOverlap(box, cr)) { a.hits.add(cr); frapper(cr, a.core, a.prm, dr); for (const n of a.nu) frapper(cr, n, a.prm, dr); }
    if (dist(c.x, c.y, a.lx, a.ly) > 34) { a.lx = c.x; a.ly = c.y; tracer(a, c.x, c.y); }
    // arrêté par un mur, ou par le sol (le plafond) quand l'élan y fonce ; un élan rasant glisse le long du sol
    const bloque = a.mode === 'dash' && ((p.hitX && Math.abs(a.vx) > 60) || (p.vy === 0 && Math.abs(a.vy) > 1 && Math.abs(a.vy) > Math.abs(a.vx) * 0.6));
    if ((a.slam && p.onGround) || a.t <= 0 || bloque || (a.pilier && a.t <= 0)) { actif = null; arriver(a); }
  }
  // l'esprit hors du corps : il passe les murs, révèle les bêtes, entre dans la première qu'il touche
  function majEsprit(p, dt) {
    if (st().control) { esprit = null; return; }
    const e = esprit, c = centre(p);
    if (e.tenu) { const a = aimSouris(); const dx = a.x - e.x, dy = a.y - e.y, d = Math.hypot(dx, dy) || 1; const v = Math.min(360, d * 4); e.vx = lerp(e.vx, dx / d * v, Math.min(1, dt * 6)); e.vy = lerp(e.vy, dy / d * v, Math.min(1, dt * 6)); }
    else { e.t -= dt; if (e.t <= 0) { esprit = null; W.msg('Ton esprit revient, bredouille.'); return; } }
    e.x += e.vx * dt; e.y += e.vy * dt;
    const Rmax = 700 * (e.prm.range || 1), d0 = dist(e.x, e.y, c.x, c.y); if (d0 > Rmax) { e.x = c.x + (e.x - c.x) * Rmax / d0; e.y = c.y + (e.y - c.y) * Rmax / d0; }
    e.x = clamp(e.x, 0, W.L.w); e.y = clamp(e.y, 0, W.L.h);
    if (Math.random() < 0.4) W.part(e.x, e.y, '#b08ad8', 1, 20, 0.6, 2, -20, 'glow');
    for (const cr of st().crs) {
      if (cr.hp <= 0 || cr.t === 'familier' || cr.controlled) continue; const cc = centre(cr), d = dist(e.x, e.y, cc.x, cc.y);
      if (d < 70 && !e.vu.has(cr)) { e.vu.add(cr); W.applyEffect('lecture', cc.x, cc.y, 12, e.prm, 'burst', { noPlayer: true, noGrid: true, noField: true }); }
      if (U.circleRect(e.x, e.y, 10, cr)) { esprit = null; W.controlCreature(cr, 12 * D(e.prm)); if (tenu && tenu.core === 'esprit') tenu = null; return; }
    }
  }
  const focus = () => (esprit ? { x: esprit.x - 10, y: esprit.y - 10, w: 20, h: 20 } : null);

  // ---------- dessin ----------
  function dessiner(ctx, t, couche) {
    const p = st().p;
    if (couche === 'avant') {
      // les traînées : une silhouette d'encre qui s'efface, et des traits de vitesse
      for (let i = 0; i < ombres.length; i++) { const o = ombres[i], k = Math.max(0, o.t / 0.25), cx = o.x + o.w / 2, cy = o.y + o.h / 2; ctx.save(); ctx.globalAlpha = k * 0.3; ctx.fillStyle = o.c; ctx.beginPath(); ctx.ellipse(cx, cy + 3, o.w * 0.42, o.h * 0.46, 0, 0, TAU); ctx.fill();
        const q = ombres[i + 1]; if (q) { ctx.globalAlpha = k * 0.7; ctx.strokeStyle = o.c; ctx.lineWidth = 1.6; for (const dy of [-12, 0, 12]) { ctx.beginPath(); ctx.moveTo(cx, cy + dy); ctx.lineTo(q.x + q.w / 2, q.y + q.h / 2 + dy); ctx.stroke(); } } ctx.restore(); }
      if (actif && actif.liane) { ctx.save(); ctx.strokeStyle = '#4f7f35'; ctx.lineWidth = 2.5; U.inkLine(ctx, p.x + p.w / 2, p.y + p.h * 0.4, actif.liane.x, actif.liane.y, Math.floor(t * 3), 2); ctx.restore(); }
      return;
    }
    if (p.sta.miroir > 0) { ctx.save(); ctx.translate(p.x + p.w / 2, p.y + p.h / 2); ctx.rotate(t * 1.6); ctx.fillStyle = 'rgba(220,230,240,0.18)'; ctx.beginPath(); ctx.arc(0, 0, p.h * 0.78, 0, TAU); ctx.fill(); ctx.strokeStyle = '#7d8a96'; ctx.globalAlpha = 0.75 + 0.2 * Math.sin(t * 6); ctx.lineWidth = 2.6; ctx.beginPath(); for (let i = 0; i <= 6; i++) { const a = i / 6 * TAU, r = p.h * 0.78; ctx.lineTo(Math.cos(a) * r, Math.sin(a) * r); } ctx.stroke(); ctx.restore(); }
    if (p.sta.fantome > 0) { ctx.save(); ctx.globalAlpha = 0.35; ctx.fillStyle = '#d9c48a'; U.inkRect(ctx, p.x, p.y, p.w, p.h, 5, 0.6); ctx.fill(); ctx.restore(); }
    if (tenu && tenu.core === 'lumiere') { const g = ctx.createRadialGradient(p.x + p.w / 2, p.y + p.h / 2, 4, p.x + p.w / 2, p.y + p.h / 2, 46); g.addColorStop(0, 'rgba(255,246,200,0.95)'); g.addColorStop(1, 'rgba(240,208,112,0)'); ctx.fillStyle = g; ctx.beginPath(); ctx.arc(p.x + p.w / 2, p.y + p.h / 2, 46, 0, TAU); ctx.fill(); }
    if (visee) { ctx.save(); ctx.strokeStyle = visee.ok ? '#4fb0a0' : '#b04a3a'; ctx.lineWidth = 2; ctx.setLineDash([4, 4]); ctx.globalAlpha = 0.8; U.inkRect(ctx, visee.x - visee.w / 2, visee.y - visee.h / 2, visee.w, visee.h, 2, 0.6); ctx.stroke(); ctx.setLineDash([]); U.inkCircle(ctx, visee.x, visee.y, 26 + Math.sin(t * 5) * 3, 2, 1); ctx.restore(); }
    if (esprit) {
      const c = centre(p); ctx.save(); ctx.strokeStyle = '#b08ad8'; ctx.globalAlpha = 0.5; ctx.setLineDash([3, 5]); ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(c.x, c.y - 10); ctx.lineTo(esprit.x, esprit.y); ctx.stroke(); ctx.setLineDash([]);
      ctx.globalAlpha = 0.8; const g = ctx.createRadialGradient(esprit.x, esprit.y, 2, esprit.x, esprit.y, 22); g.addColorStop(0, 'rgba(230,210,255,0.95)'); g.addColorStop(1, 'rgba(176,138,216,0)'); ctx.fillStyle = g; ctx.beginPath(); ctx.arc(esprit.x, esprit.y, 22, 0, TAU); ctx.fill();
      ctx.fillStyle = 'rgba(176,138,216,0.85)'; ctx.beginPath(); ctx.moveTo(esprit.x - 8, esprit.y + 10); ctx.quadraticCurveTo(esprit.x - 9, esprit.y - 12, esprit.x, esprit.y - 13); ctx.quadraticCurveTo(esprit.x + 9, esprit.y - 12, esprit.x + 8, esprit.y + 10); for (let i = 0; i < 3; i++) ctx.lineTo(esprit.x + 8 - (i + 0.5) * 16 / 3, esprit.y + 10 + (i % 2 ? -3 : 3) + Math.sin(t * 8 + i) * 1.5); ctx.closePath(); ctx.fill();
      ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(esprit.x - 3, esprit.y - 4, 1.8, 0, TAU); ctx.arc(esprit.x + 3, esprit.y - 4, 1.8, 0, TAU); ctx.fill(); ctx.restore();
    }
    // les élans d'avance : des points au-dessus de la tête
    const a = p.avance; if (a && a.n > 0 && W.time <= a.fin) { ctx.save(); ctx.fillStyle = W.colorOf(a.core); ctx.strokeStyle = U.INK; ctx.lineWidth = 1; for (let i = 0; i < a.n; i++) { ctx.beginPath(); ctx.arc(p.x + p.w / 2 + (i - (a.n - 1) / 2) * 9, p.y - 12, 3, 0, TAU); ctx.fill(); ctx.stroke(); } ctx.restore(); }
  }
  function reset() { actif = null; tenu = null; esprit = null; visee = null; ombres = []; etaitFantome = false; }
  return { lancer, tenir, avance, piloter, apres, dessiner, focus, reset, arreter, IMM, TENIR, get actif() { return actif; }, get tenu() { return tenu; }, get esprit() { return esprit; } };
}
