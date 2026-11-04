'use strict';
// ---------- Les gardiens : un par région, chacun a son tour à trouver ----------
// Comportement, projectiles, dessin et barre de vie vivent ici ; world.js leur passe un contexte W
// (comme pour les phénomènes) et ne garde que quelques points d'accroche.
function creerGardiens(W) {
  const { TAU, INK, clamp, dist } = U;
  const M = Sim.M, CS = Sim.CS;
  const st = () => W.st;
  let tirs = [], actif = null;

  // ---------- caractéristiques ----------
  const STATS = {
    ent:      { w: 70, h: 120, hp: 45, dmg: 2, vit: 26 },
    cerf:     { w: 96, h: 92,  hp: 38, dmg: 3, vit: 62 },
    magma:    { w: 74, h: 104, hp: 50, dmg: 3, vit: 36 },
    automate: { w: 62, h: 96,  hp: 42, dmg: 2, vit: 46 },
  };
  function stats(g) {
    const s = STATS[g] || STATS.ent;
    return { w: s.w, h: s.h, hp: s.hp, hpMax: s.hp, dmg: s.dmg, portable: false, g, etat: 'veille', cd: 1.5, att: null, brule: 0, croute: 0, mouille: 0, court: 0, gel: 0, etour: 0, regenT: 0, engage: false, anim: 0, dits: {} };
  }
  // ce que chaque essence fait à chaque gardien : un facteur de dégâts (négatif : il soigne)
  const REAC = {
    ent:      { feu: 3, foudre: 1.3, acide: 1.6, fanaison: 2.2, froid: 0.8, eau: -1.2, vie: -2.5, terre: 0.25, vent: 0.4, lumiere: 0.6, _: 0.6 },
    cerf:     { froid: 0.8, foudre: 0.7, _: 0.45 },
    magma:    { eau: 2.6, froid: 3, feu: -2, terre: 0.4, vent: 0.3, foudre: 0.7, _: 0.6 },
    automate: { acide: 2.4, rouille: 2.6, foudre: 0.5, eau: 0, froid: 0.4, terre: 0.5, force: 0.5, lumiere: 0.2, _: 0.35 },
  };
  const nom = (c) => DATA.GARDIENS[c.g].nom;
  const nomEss = (e) => (DATA.CORES[e] ? DATA.CORES[e].nom.toLowerCase() : e);
  const leE = (e) => (/^[aeiouéèh]/i.test(nomEss(e)) ? 'l\'' : 'le ') + nomEss(e);
  const maj = (s) => s.charAt(0).toUpperCase() + s.slice(1), bas = (s) => s.charAt(0).toLowerCase() + s.slice(1);
  // une seule fois par combat : ce que le gardien craint, ce qui le soigne
  function dire(c, cle, txt) { if (c.dits[cle]) return; c.dits[cle] = true; W.msg(txt); }

  // ---------- coups reçus ----------
  // tant qu'on n'a pas pris assez de forces, le gardien dort (sauf si on le provoque)
  const NIV = { ent: 3, cerf: 4, magma: 5, automate: 6 };
  function engager(c) {
    if (c.vaincu) return;
    c.provoque = true; c.sommeil = false;
    if (!c.engage) { c.engage = true; c.cd = Math.max(c.cd, 1.2); if (!c.vu) { c.vu = true; W.msg('⚔ ' + nom(c) + ' se dresse devant toi.', 'warn'); W.evt('gardien_vu', c.g); const pr = W.game().progress; pr.gardiensVus = pr.gardiensVus || []; if (!pr.gardiensVus.includes(c.g)) pr.gardiensVus.push(c.g); } }
    actif = c;
  }
  function blesser(c, dmg, source) {
    if (c.vaincu || c.hp <= 0 || !(dmg > 0)) return;
    if (c.g === 'magma' && c.croute > 0) dmg *= 1.5;
    if (c.g === 'cerf' && c.etour > 0) dmg *= 1.6;
    if (c.g === 'automate' && c.court > 0) dmg *= 1.5;
    c.hp -= dmg; c.hurt = 0.25; engager(c);
    if (c.hp <= 0) vaincre(c);
  }
  // les dégâts génériques (phénomènes, chocs, familiers...) : un gardien encaisse
  function hurt(c, dmg, source) { blesser(c, dmg * (source === 'coup' ? 0.6 : 0.5), source); }
  // un sort d'essence touche le gardien
  function sort(c, core, o) {
    if (c.vaincu || c.hp <= 0) return;
    const R = REAC[c.g] || {}; let f = R[core] !== undefined ? R[core] : R._;
    const base = (o.burst ? 1.4 : 0.7 * (o.k || 0)) * (o.power || 1), cx = c.x + c.w / 2, cy = c.y + c.h / 2;
    engager(c);
    if (c.g === 'ent' && core === 'feu') c.brule = Math.max(c.brule, 4 * (o.dur || 1));
    if (c.g === 'magma' && (core === 'eau' || core === 'froid')) { const avant = c.croute; c.croute = Math.min(8, c.croute + (o.burst ? (core === 'froid' ? 3 : 2) : (o.k || 0) * 1.5)); if (avant <= 0 && c.croute > 0) { W.part(cx, c.y + 10, '#ddd', 14, 60, 1.2, 5, -80, 'fumee'); dire(c, 'croute', 'Sa lave se fige en croûte : il ralentit, et se brise plus facilement.'); } }
    if (c.g === 'automate') {
      if (core === 'eau') { c.mouille = 8; dire(c, 'mouille', nom(c) + ' ruisselle. Sa coque luit, trempée.'); }
      if (core === 'foudre' && c.mouille > 0) { f = 4; if (o.burst && c.court <= 0) { c.court = 2.6; W.part(cx, c.y + 20, '#fff2a0', 24, 160, 0.6, 2, 0, 'etincelle'); dire(c, 'court', 'Court-circuit ! L\'eau a conduit la foudre jusqu\'à ses rouages.'); } }
      if (core === 'froid' && c.mouille > 0 && o.burst) { c.gel = 2.2; W.part(cx, cy, '#cfe3ea', 14, 80, 0.8, 3, 0, 'spark'); }
    }
    if (c.g === 'cerf' && c.etour > 0) f = Math.max(f, 2.5);
    if (f < 0) { c.hp = Math.min(c.hpMax, c.hp - f * base); if (o.burst) { W.part(cx, cy, '#7ac46a', 10, 60, 0.8, 3, -40, 'coeur'); dire(c, 'soin_' + core, maj(leE(core)) + ' soigne ' + bas(nom(c)) + ' !'); } return; }
    if (f === 0) { if (o.burst) W.part(cx, cy, '#aaa', 5, 40, 0.4); return; }
    if (o.burst && f >= 2) dire(c, 'faible_' + core, nom(c) + ' craint ' + leE(core) + ' !');
    else if (o.burst && f <= 0.5 && !(c.g === 'cerf' && c.etour > 0)) dire(c, 'resiste', DATA.GARDIENS[c.g].indice);
    blesser(c, base * f, core);
  }
  function vaincre(c) {
    c.hp = 0; c.vaincu = true; c.respawn = 1e9; c.engage = false; c.att = null; if (actif === c) actif = null;
    const D = DATA.GARDIENS[c.g], cx = c.x + c.w / 2, cy = c.y + c.h / 2, game = W.game();
    W.part(cx, cy, D.couleur, 44, 220, 1.2, 4, 0, 'spark'); W.part(cx, cy, '#fff0b0', 16, 90, 1, 6, -40, 'glow'); W.part(cx, c.y + c.h, INK, 20, 120, 0.9, 3, 200);
    if (c.g === 'magma') Sim.forRadius(cx, c.y + c.h - 10, 26, (x, y, i, m) => { if (m === M.AIR && Math.random() < 0.5) Sim.set(x, y, M.OBSIDIENNE); });
    W.shake(0.6); W.flash(0.15); W.son('unlock');
    const pr = game.progress; pr.gardiens = pr.gardiens || {}; pr.gardiens[c.g] = true;
    const R = D.recompense || {}, recu = [];
    if (R.ing) for (const id in R.ing) { for (let i = 0; i < R.ing[id]; i++) W.dropPickup(id, cx + (Math.random() - 0.5) * 70, c.y + 10); recu.push(DATA.INGREDIENTS[id].nom + (R.ing[id] > 1 ? ' ×' + R.ing[id] : '')); }
    if (R.encre) for (const id in R.encre) { game.inv.encres[id] = (game.inv.encres[id] || 0) + R.encre[id]; recu.push(R.encre[id] + ' gouttes d\'' + DATA.ENCRES[id].nom.toLowerCase()); }
    if (R.xp) game.addXp(R.xp);
    W.msg('✦ ' + D.nom + ' est vaincu ! ' + D.fin + (recu.length ? ' (' + recu.join(', ') + ')' : ''), 'unlock');
    W.evt('gardien', c.g); game.save();
  }
  // le joueur prend un coup
  function frapper(dmg, dir, kbx = 320, kby = -260) {
    const p = st().p; if (p.inv > 0 || p.hp <= 0 || p.sta.geant > 0) return false;
    p.vx = dir * kbx; p.vy = kby; p.onGround = false; p.inv = 0.9;
    if (p.sta.stone > 0 || p.sta.armure > 0) dmg *= 0.3;
    p.hp -= dmg; W.son('hurt'); W.evt('bouscule'); return true;
  }
  const solA = (x, y0) => { for (let y = y0; y < y0 + 400; y += CS) if (Sim.solidAt(x, y)) return y - (y % CS); return y0 + 400; };

  // ---------- attaques : une annonce (prep), puis le coup ----------
  function commencer(c, type, prep, extra = {}) { c.att = Object.assign({ type, t: 0, prep, fait: false }, extra); }
  const DUREE = { racines: 0.6, rayon: 0.35, seisme: 0.3 };
  const RECHARGE = { racines: 2.6, graines: 2.4, balai: 1.6, brame: 1.8, jet: 2.8, seisme: 2.2, rayon: 2.6, salve: 2.2 };
  function avancer(c, dt, p) {
    const a = c.att; a.t += dt;
    if (a.type === 'rayon' && a.t < a.prep - 0.3) { a.cx = p.x + p.w / 2; a.cy = p.y + p.h / 2; }
    if (!a.fait && a.t >= a.prep) { a.fait = true; COUP[a.type](c, a, p); }
    if (a.fait && a.type === 'racines' && a.t < a.prep + DUREE.racines) {
      if (Math.abs(p.x + p.w / 2 - a.x) < 38 && Math.abs(p.y + p.h - a.y) < 44 && frapper(2, Math.sign(p.x + p.w / 2 - a.x) || 1, 120, -540)) W.msg('Les racines jaillissent sous tes pieds !', 'warn');
    }
    if (a.fait && a.type === 'rayon' && a.t < a.prep + DUREE.rayon && !a.touche) {
      const L = a.L; const vx = L.x2 - L.x1, vy = L.y2 - L.y1, l2 = vx * vx + vy * vy || 1, pcx = p.x + p.w / 2, pcy = p.y + p.h / 2;
      const t = clamp(((pcx - L.x1) * vx + (pcy - L.y1) * vy) / l2, 0, 1);
      if (dist(pcx, pcy, L.x1 + vx * t, L.y1 + vy * t) < 22 && frapper(2, Math.sign(vx) || 1, 300, -200)) a.touche = true;
    }
    if (a.t >= a.prep + (DUREE[a.type] || 0.25)) { c.att = null; c.cd = RECHARGE[a.type] || 2; }
  }
  // un projectile en cloche qui retombe sur le joueur en T secondes
  function lob(x, y, tx, ty, T, g) { return { vx: (tx - x) / T, vy: (ty - y - 0.5 * g * T * T) / T }; }
  const COUP = {
    racines(c, a) { W.son('burst', 'terre'); W.part(a.x, a.y, '#5a4022', 14, 120, 0.7, 3, 500); W.shake(0.15); },
    graines(c, a, p) {
      const x = c.x + c.w / 2 + c.dir * 20, y = c.y + 26;
      for (let i = -1; i <= 1; i++) { const T = 0.9 + i * 0.12, v = lob(x, y, p.x + p.w / 2 + i * 30, p.y + p.h / 2, T, 700); tirs.push({ type: 'epine', x, y, vx: v.vx, vy: v.vy, g: 700, r: 6, life: 3, rot: 0 }); }
      W.son('burst', 'vie');
    },
    balai(c, a, p) { const dx = p.x + p.w / 2 - (c.x + c.w / 2); if (Math.abs(dx) < 120 && Math.abs(p.y + p.h / 2 - (c.y + c.h / 2)) < 80 && frapper(2, Math.sign(dx) || c.dir, 460, -300)) W.msg(nom(c) + ' te balaie de ses branches !', 'warn'); W.part(c.x + c.w / 2 + c.dir * 50, c.y + c.h * 0.5, '#5c8f3e', 10, 140, 0.5, 3, 0, 'feuille'); },
    brame(c, a, p) {
      const cx = c.x + c.w / 2, dx = p.x + p.w / 2 - cx; st().sp.push({ k: 'ring', core: 'son', x: cx + c.dir * 40, y: c.y + 20, r: 170, life: 0.5, max: 0.5, color: '#8a6a44' });
      Sim.souffler(cx, c.y + 30, 180, 0, 0, 1.4); W.son('burst', 'son');
      if (Math.abs(dx) < 170 && Math.abs(p.y - c.y) < 120 && frapper(1, Math.sign(dx) || 1, 500, -280)) W.msg('Le brame du cerf te renverse !', 'warn');
    },
    jet(c, a, p) {
      const x = c.x + c.w / 2 + c.dir * 26, y = c.y + 14;
      for (let i = -1; i <= 1; i++) { const T = 1 + i * 0.15, v = lob(x, y, p.x + p.w / 2 + i * 50, p.y + p.h, T, 800); tirs.push({ type: 'lave', x, y, vx: v.vx, vy: v.vy, g: 800, r: 7, life: 3.5 }); }
      W.son('burst', 'feu');
    },
    seisme(c, a, p) {
      const cx = c.x + c.w / 2, by = c.y + c.h; W.shake(0.55); W.son('burst', 'terre');
      W.part(cx, by, '#3a3230', 20, 200, 0.7, 3, 500); W.part(cx, by, '#f08a30', 12, 160, 0.6, 2, 400, 'etincelle'); Sim.chauffer(cx, by, 70, 190, 0.5);
      st().sp.push({ k: 'ring', core: 'terre', x: cx, y: by - 4, r: 180, life: 0.45, max: 0.45, color: '#e0622b' });
      const dx = p.x + p.w / 2 - cx; if (p.onGround && Math.abs(dx) < 185 && Math.abs(p.y + p.h - by) < 50 && frapper(2, Math.sign(dx) || 1, 260, -440)) W.msg('Le sol tremble sous le poing du golem !', 'warn');
    },
    rayon(c, a) {
      const x1 = c.x + c.w / 2 + c.dir * 12, y1 = c.y + 20; let dx = a.cx - x1, dy = a.cy - y1; const d = Math.hypot(dx, dy) || 1; dx /= d; dy /= d;
      const h = Sim.raycast(x1, y1, dx, dy, 640), l = h ? h.t : 640;
      a.L = { x1, y1, x2: x1 + dx * l, y2: y1 + dy * l };
      if (h) { Sim.chauffer(h.x, h.y, 14, 200, 0.6); W.part(h.x, h.y, '#ffb080', 8, 90, 0.4, 2, 0, 'etincelle'); }
      W.son('burst', 'lumiere');
    },
    salve(c, a, p) {
      const x = c.x + c.w / 2 + c.dir * 24, y = c.y + 40; let dx = p.x + p.w / 2 - x, dy = p.y + p.h / 2 - y; const d = Math.hypot(dx, dy) || 1;
      for (let i = -1; i <= 1; i++) { const an = Math.atan2(dy, dx) + i * 0.16; tirs.push({ type: 'orbe', x, y, vx: Math.cos(an) * 330, vy: Math.sin(an) * 330, g: 0, r: 7, life: 2.4 }); }
      W.son('burst', 'foudre');
    },
  };
  // ---------- les quatre façons de se battre ----------
  const IA = {
    ent(c, dt, p, dx, dy, d) {
      if (c.att) { avancer(c, dt, p); c.vx *= Math.max(0, 1 - 6 * dt); return; }
      c.dir = Math.sign(dx) || c.dir; c.vx = Math.abs(dx) > 120 ? c.dir * STATS.ent.vit : 0;
      if (c.cd <= 0) {
        if (d < 115) commencer(c, 'balai', 0.55);
        else if (Math.random() < 0.55) { const x = p.x + p.w / 2; commencer(c, 'racines', 1.0, { x, y: solA(x, p.y + p.h - 4) }); }
        else commencer(c, 'graines', 0.75);
      }
    },
    cerf(c, dt, p, dx, dy, d) {
      const a = c.att;
      if (a && a.type === 'charge') {
        a.t += dt;
        if (a.t < a.prep) { c.vx *= Math.max(0, 1 - 8 * dt); if (Math.random() < 0.35) W.part(c.x + c.w / 2 + a.dir * 30, c.y + c.h, '#8a7a5a', 2, 50, 0.4, 2, 200); return; }
        if (!a.lance) { a.lance = true; W.son('burst', 'terre'); }
        c.vx = a.dir * 600; c.dir = a.dir;
        if (Math.random() < 0.6) W.part(c.x + c.w / 2 - a.dir * 30, c.y + c.h, '#8a7a5a', 1, 40, 0.5, 3, 100);
        if (c.hitX && a.t > a.prep + 0.06) {
          c.etour = 3.2; c.att = null; c.cd = 1.6; c.vx = -a.dir * 140; c.vy = -180; W.shake(0.5); W.son('burst', 'terre');
          casser(c, a.dir); blesser(c, 5, 'choc');
          if (!c.vaincu) dire(c, 'assomme', nom(c) + ' s\'assomme contre l\'obstacle ! C\'est le moment.');
          return;
        }
        if (U.rectsOverlap(c, p) && frapper(3, a.dir, 640, -360)) W.msg(nom(c) + ' te charge de plein fouet !', 'warn');
        if (a.t > a.prep + 1.6 || Math.abs(c.x - c.x0) > 520) { c.att = null; c.cd = 1.4; }
        return;
      }
      if (a) { avancer(c, dt, p); c.vx *= Math.max(0, 1 - 6 * dt); return; }
      c.dir = Math.sign(dx) || c.dir;
      c.vx = Math.abs(dx) > 280 ? c.dir * STATS.cerf.vit : Math.abs(dx) < 150 ? -c.dir * STATS.cerf.vit * 0.8 : c.vx * 0.9;
      if (Math.abs(dx) < 150) c.dir = Math.sign(dx) || c.dir;
      if (c.cd <= 0) { if (d < 125) commencer(c, 'brame', 0.6); else c.att = { type: 'charge', t: 0, prep: 0.9, dir: Math.sign(dx) || 1 }; }
    },
    magma(c, dt, p, dx, dy, d) {
      const lent = c.croute > 0 ? 0.35 : 1;
      if (c.att) { avancer(c, dt * lent, p); c.vx *= Math.max(0, 1 - 6 * dt); return; }
      c.dir = Math.sign(dx) || c.dir; c.vx = Math.abs(dx) > 100 ? c.dir * STATS.magma.vit * lent : 0;
      if (c.cd <= 0 && c.croute <= 0) { if (d < 150) commencer(c, 'seisme', 0.8); else commencer(c, 'jet', 0.7); }
    },
    automate(c, dt, p, dx, dy, d) {
      if (c.att) { avancer(c, dt, p); c.vx *= Math.max(0, 1 - 6 * dt); return; }
      c.dir = Math.sign(dx) || c.dir; const v = STATS.automate.vit * (c.mouille > 0 ? 0.7 : 1);
      c.vx = Math.abs(dx) > 220 ? c.dir * v : Math.abs(dx) < 90 ? -c.dir * v : 0;
      if (c.cd <= 0) { if (Math.random() < 0.55) commencer(c, 'rayon', 1.1, { cx: p.x + p.w / 2, cy: p.y + p.h / 2 }); else commencer(c, 'salve', 0.6); }
    },
  };
  // le cerf qui s'assomme fend ce qu'il a heurté
  function casser(c, dir) {
    const x0 = dir > 0 ? c.x + c.w : c.x - 3 * CS, cx0 = Math.floor(x0 / CS), cy0 = Math.floor(c.y / CS), cy1 = Math.floor((c.y + c.h) / CS);
    const FRAG = [M.TERRE, M.SABLE, M.GLACE, M.VERRE, M.BOIS, M.NEIGE, M.CRISTAL, M.PLANTE, M.MOUSSE, M.CENDRE];
    for (let x = cx0; x < cx0 + 4; x++) for (let y = cy0; y < cy1; y++) { const m = Sim.get(x, y); if (FRAG.includes(m) && Math.random() < 0.55) { Sim.set(x, y, M.AIR); if (Math.random() < 0.3) W.part((x + 0.5) * CS, (y + 0.5) * CS, Sim.P[m].color, 2, 80, 0.5, 2, 400); } else if (m === M.PIERRE && Math.random() < 0.12) Sim.set(x, y, M.SABLE); }
    for (const o of st().objs) if (o.t === 'rocher' && !o.mort && Math.abs(o.x + o.w / 2 - (c.x + c.w / 2 + dir * c.w * 0.6)) < 70) { o.vx = dir * 260; o.vy = -120; }
  }

  // ---------- mise à jour ----------
  function update(c, dt) {
    if (c.vaincu) { c.hp = 0; return; }
    const p = st().p, S = STATS[c.g] || STATS.ent;
    // on ne dompte, n'endort, ne possède ni ne transforme un gardien
    c.sta.tame = false; c.sta.sleep = 0; c.controlled = false; c.dort = false; if (c.sta.stun > 0.4) c.sta.stun = 0.4;
    for (const k of ['brule', 'croute', 'mouille', 'court', 'gel', 'etour', 'cd', 'hurt']) if (c[k] > 0) c[k] = Math.max(0, c[k] - dt);
    c.anim += dt;
    const ccx = c.x + c.w / 2, pcx = p.x + p.w / 2, pcy = p.y + p.h / 2;
    const dxp = pcx - ccx, dyp = pcy - (c.y + c.h / 2), dp = Math.hypot(dxp, dyp);
    // combat : il s'éveille quand on approche, renonce quand on s'éloigne de son domaine
    if (c.engage && (p.hp <= 0 || Math.abs(pcx - (c.x0 + c.w / 2)) > 760)) { c.engage = false; c.att = null; if (actif === c) actif = null; }
    else if (!c.engage && p.hp > 0 && dp < 330 && Math.abs(dyp) < 240) {
      const niv = W.game().niveau || 1;
      if (c.provoque || niv >= (NIV[c.g] || 1)) engager(c);
      else { c.sommeil = true; if (dp < 220 && !c.dits.dort) { const pr = W.game().progress; pr.gardiensVus = pr.gardiensVus || []; if (!pr.gardiensVus.includes(c.g)) pr.gardiensVus.push(c.g); } if (dp < 220) dire(c, 'dort', nom(c) + ' dort. Mieux vaut ne pas le réveiller avant d\'avoir pris des forces (niveau ' + NIV[c.g] + ').'); }
    }
    if (!c.engage && !c.provoque) c.sommeil = (W.game().niveau || 1) < (NIV[c.g] || 1);
    // le milieu : chaleur, liquides, électricité
    const lq = Sim.get(Math.floor(ccx / CS), Math.floor((c.y + c.h - 4) / CS));
    if (c.g === 'magma') {
      if (lq === M.LAVE) c.hp = Math.min(c.hpMax, c.hp + dt * 2.5);
      if (lq === M.EAU) c.croute = Math.max(c.croute, 2);
      if (c.croute <= 0 && Math.random() < dt * 3) Sim.chauffer(ccx, c.y + c.h * 0.6, 40, 175, 0.25);
      if (c.croute <= 0 && Math.random() < dt * 4) W.part(c.x + Math.random() * c.w, c.y + c.h * (0.3 + Math.random() * 0.5), '#f08a30', 1, 20, 0.6, 2, 300, 'goutte');
    }
    if (c.g === 'ent') {
      if (lq === M.LAVE || Sim.tempAt(ccx, c.y + c.h * 0.5) > 160) c.brule = Math.max(c.brule, 1.5);
      if (c.brule > 0) { c.hp -= dt * 0.9; c.regenT = 5; if (Math.random() < dt * 8) W.part(c.x + Math.random() * c.w, c.y + Math.random() * c.h * 0.6, '#d9622b', 1, 30, 0.5, 3, -200, 'flamme'); if (c.hp <= 0) { vaincre(c); return; } }
      else if (c.regenT > 0) c.regenT -= dt; else if (c.hp < c.hpMax) c.hp = Math.min(c.hpMax, c.hp + dt * 0.6);
    }
    if (c.g === 'automate') {
      if (lq === M.EAU || lq === M.BOUE) c.mouille = Math.max(c.mouille, 4);
      if (c.mouille > 0 && Sim.rectHas(c, (m, i) => Sim.elec[i] > 0)) { blesser(c, dt * 3, 'foudre'); c.court = Math.max(c.court, 0.6); if (c.vaincu) return; }
      if (c.mouille > 0 && Math.random() < dt * 6) W.part(c.x + Math.random() * c.w, c.y + c.h * 0.4, '#6aa0d8', 1, 20, 0.6, 2, 400, 'goutte');
      if (c.court > 0 && Math.random() < dt * 10) W.part(c.x + Math.random() * c.w, c.y + Math.random() * c.h * 0.6, '#fff2a0', 2, 120, 0.3, 1.6, 0, 'etincelle');
    }
    // décision
    if (!c.engage) {
      c.att = null; const d0 = c.x0 - c.x;
      if (Math.abs(d0) > 24) { c.dir = Math.sign(d0); c.vx = c.dir * S.vit; } else c.vx *= Math.max(0, 1 - 6 * dt);
      c.hp = Math.min(c.hpMax, c.hp + dt * 4); if (dp > 500) c.dits = {};
    } else if (c.etour > 0 || c.gel > 0 || c.court > 0) { c.vx *= Math.max(0, 1 - 5 * dt); if (c.att && c.att.type !== 'charge') c.att = null; }
    else IA[c.g](c, dt, p, dxp, dyp, dp);
    // il ne quitte pas son domaine
    if (Math.abs(c.x - c.x0) > 520 && Math.sign(c.vx) === Math.sign(c.x - c.x0)) c.vx = 0;
    // au contact, il bouscule
    if (c.engage && !(c.att && c.att.type === 'charge') && c.etour <= 0 && c.court <= 0 && U.rectsOverlap(c, p) && frapper(c.dmg, Math.sign(dxp) || 1, 340, -260)) W.msg(nom(c) + ' te bouscule !', 'warn');
    W.applyGrav(c, dt, 1); c.canStep = true; W.moveBody(c, dt);
    if (c.y > W.L.h + 50) { c.x = c.x0; c.y = c.y0 - 40; c.vx = c.vy = 0; }
  }
  // ---------- projectiles ----------
  function majTirs(dt) {
    if (!tirs.length) return;
    const p = st().p;
    for (const t of tirs) {
      t.life -= dt; t.vy += t.g * dt; t.x += t.vx * dt; t.y += t.vy * dt; t.rot = (t.rot || 0) + dt * 9;
      if (t.type === 'lave' && Math.random() < 0.5) W.part(t.x, t.y, '#f08a30', 1, 10, 0.3, 2, 0, 'flamme');
      if (t.type === 'orbe' && Math.random() < 0.3) W.part(t.x, t.y, '#fff2a0', 1, 40, 0.2, 1.4, 0, 'etincelle');
      // un bouclier de sceau arrête les projectiles
      if (st().sp.some((q) => q.k === 'bouclier' && dist(q.x, q.y, t.x, t.y) < q.r + t.r)) { t.mort = true; W.part(t.x, t.y, '#e0b050', 6, 70, 0.3, 2, 0, 'spark'); continue; }
      if (U.circleRect(t.x, t.y, t.r, p)) {
        const dir = Math.sign(t.vx) || 1;
        if (t.type === 'epine' && frapper(1, dir, 200, -160)) W.msg('Une graine épineuse te pique !', 'warn');
        if (t.type === 'lave' && frapper(1.5, dir, 220, -200)) { if (!(p.sta.wet > 0)) p.sta.burning = 2; W.msg('Un boulet de lave t\'éclabousse !', 'warn'); }
        if (t.type === 'orbe' && frapper(1, dir, 180, -140)) W.msg('Une décharge te secoue !', 'warn');
        t.mort = true; continue;
      }
      const m = Sim.get(Math.floor(t.x / CS), Math.floor(t.y / CS));
      if (Sim.solidAt(t.x, t.y) || (m && Sim.P[m].liquid)) { impact(t, m); t.mort = true; continue; }
      if (t.life <= 0 || t.y > W.L.h) t.mort = true;
    }
    tirs = tirs.filter((t) => !t.mort);
  }
  function impact(t, m) {
    const x = t.x - t.vx * 0.016, y = t.y - t.vy * 0.016;
    if (t.type === 'lave') { if (m === M.EAU) { W.part(x, y, '#ddd', 6, 40, 0.8, 4, -60, 'fumee'); return; } let n = 0; Sim.forRadius(x, y, 10, (cx, cy, i, q) => { if (q === M.AIR && n < 4) { Sim.set(cx, cy, M.LAVE); n++; } }); W.part(x, y, '#f08a30', 8, 80, 0.5, 2, 300, 'etincelle'); }
    if (t.type === 'epine') { const cx = Math.floor(x / CS), cy = Math.floor(y / CS); if (Sim.get(cx, cy) === M.AIR && Math.random() < 0.6) Sim.set(cx, cy, M.PLANTE); W.part(x, y, '#5c8f3e', 4, 40, 0.4, 2, 200, 'feuille'); }
    if (t.type === 'orbe') { Sim.forRadius(x, y, 14, (cx, cy, i, q) => { if (Sim.P[q].cond) { Sim.elec[i] = 90; Sim.touch(i); } }); W.part(x, y, '#fff2a0', 8, 100, 0.3, 1.6, 0, 'etincelle'); }
  }

  // ---------- dessin ----------
  const trait = (ctx, pts, close = false) => { ctx.beginPath(); pts.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y))); if (close) ctx.closePath(); };
  const oeil = (ctx, x, y, r, coul, a = 1) => { FX.glow(ctx, x, y, r * 4, coul, 0.45 * a); ctx.fillStyle = coul; ctx.beginPath(); ctx.arc(x, y, r, 0, TAU); ctx.fill(); };
  const ART = {
    // L'Ent-ronce : un tronc qui marche sur ses racines, des bras de ronces, une couronne de feuilles et d'épines
    ent(ctx, c, t, w, h) {
      const pas = Math.abs(c.vx) > 5 ? Math.sin(c.anim * 5) : 0, sw = Math.sin(c.anim * 1.3) * 0.03, br = c.brule > 0;
      const a = c.att, prepK = a ? clamp(a.t / a.prep, 0, 1) : 0;
      ctx.rotate(sw);
      // racines-jambes
      ctx.fillStyle = br ? '#4a3420' : '#6b4f2a'; ctx.lineWidth = 2;
      for (const [s, o] of [[-1, pas], [1, -pas]]) { const lx = s * w * 0.16; U.inkPolyPath(ctx, [[lx - 9, -h * 0.22], [lx + 9, -h * 0.22], [lx + 8 + o * 5, -4], [lx + 16 + o * 6, 0], [lx - 14 + o * 6, 0], [lx - 8 + o * 5, -4]], c.seed + s, 0.8); ctx.fill(); ctx.stroke(); }
      // tronc
      const g = ctx.createLinearGradient(-w * 0.3, 0, w * 0.3, 0); g.addColorStop(0, br ? '#3e2c1c' : '#5e4426'); g.addColorStop(0.5, br ? '#5a3e24' : '#8a6a3c'); g.addColorStop(1, br ? '#3e2c1c' : '#5e4426'); ctx.fillStyle = g;
      U.inkPolyPath(ctx, [[-w * 0.3, -h * 0.18], [-w * 0.26, -h * 0.55], [-w * 0.22, -h * 0.8], [w * 0.22, -h * 0.82], [w * 0.27, -h * 0.55], [w * 0.31, -h * 0.18]], c.seed + 3, 1); ctx.fill(); ctx.stroke();
      ctx.save(); ctx.globalAlpha = 0.5; ctx.lineWidth = 1; for (let i = -3; i <= 3; i++) { const x = i * w * 0.07; trait(ctx, [[x, -h * 0.2], [x + Math.sin(i * 2.1) * 3, -h * 0.45], [x - Math.sin(i * 1.3) * 2, -h * 0.75]]); ctx.stroke(); } ctx.restore();
      // le visage : deux creux, un regard d'ambre, une bouche fendue
      ctx.fillStyle = '#2a1c10'; ctx.beginPath(); ctx.ellipse(w * 0.02, -h * 0.66, 6, 8, 0, 0, TAU); ctx.fill(); ctx.beginPath(); ctx.ellipse(w * 0.17, -h * 0.665, 5, 7, 0, 0, TAU); ctx.fill();
      const reg = c.etour > 0 || c.sommeil ? 0.25 : 1; oeil(ctx, w * 0.04, -h * 0.66, 2.2, '#e0b050', reg); oeil(ctx, w * 0.18, -h * 0.665, 2, '#e0b050', reg);
      ctx.lineWidth = 1.6; trait(ctx, [[-w * 0.02, -h * 0.55], [w * 0.05, -h * 0.53], [w * 0.1, -h * 0.56], [w * 0.15, -h * 0.53], [w * 0.21, -h * 0.55]]); ctx.stroke();
      // bras de ronces : le balai lève le bras puis le rabat, les racines le plantent au sol
      for (const s of [-1, 1]) {
        let ang = s * 0.5 + Math.sin(c.anim * 1.7 + s) * 0.08;
        if (a && a.type === 'balai' && s === 1) ang = a.fait ? 1.4 : -1.2 * prepK;
        if (a && a.type === 'racines') ang = s * 0.15 + 0.1;
        if (a && a.type === 'graines' && s === 1) ang = a.fait ? 0.8 : -0.6 * prepK;
        ctx.save(); ctx.translate(s * w * 0.24, -h * 0.72); ctx.rotate(ang);
        ctx.strokeStyle = br ? '#2e2216' : '#5a4022'; ctx.lineWidth = 6; trait(ctx, [[0, 0], [s * 10, 18], [s * 12, 40], [s * 6, 58]]); ctx.stroke();
        ctx.lineWidth = 2; trait(ctx, [[s * 12, 40], [s * 22, 50]]); ctx.stroke(); trait(ctx, [[s * 6, 58], [s * 2, 66]]); ctx.stroke(); trait(ctx, [[s * 6, 58], [s * 14, 64]]); ctx.stroke();
        ctx.fillStyle = INK; for (let k = 0; k < 5; k++) { const y = 8 + k * 11, x = s * (7 + k * 1.2); ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x - s * 5, y - 2); ctx.lineTo(x, y + 3); ctx.closePath(); ctx.fill(); }
        ctx.restore(); ctx.strokeStyle = c.hurt > 0 ? '#9a2a2a' : INK;
      }
      // couronne de feuilles, de ronces et de baies
      const feuilles = [[-0.2, -0.86, 16], [0.08, -0.92, 19], [0.28, -0.84, 14], [-0.05, -1.02, 15], [0.22, -1.0, 13], [-0.3, -0.98, 11]];
      for (const [fx, fy, r] of feuilles) { ctx.fillStyle = br ? '#5a4a2a' : (fy < -0.95 ? '#4a7a34' : '#5c8f3e'); U.inkCirclePath(ctx, fx * w, fy * h, r, c.seed + fx * 10, 1.4); ctx.fill(); ctx.stroke(); }
      ctx.lineWidth = 1.4; for (let k = 0; k < 4; k++) { const x0 = (-0.25 + k * 0.17) * w; ctx.beginPath(); ctx.moveTo(x0, -h * 0.9); ctx.quadraticCurveTo(x0 + 10, -h * 1.08, x0 + 2 * Math.sin(c.anim + k), -h * 1.12); ctx.stroke(); }
      if (!br) { ctx.fillStyle = '#9a2a3a'; for (const [bx, by] of [[-0.12, -0.92], [0.18, -0.95], [0.3, -0.88], [-0.25, -1.0]]) { ctx.beginPath(); ctx.arc(bx * w, by * h, 2.4, 0, TAU); ctx.fill(); } }
      else for (const [fx, fy] of [[-0.15, -1.0], [0.12, -1.06], [0.3, -0.92]]) FX.flamme(ctx, fx * w, fy * h, 22, 11, t * 1.3 + fx * 7, 0, 0.9);
    },
    // Le Grand Cerf : quatre longues pattes, des bois de branches moussues
    cerf(ctx, c, t, w, h) {
      const a = c.att, ch = a && a.type === 'charge', court = ch && a.t >= a.prep, vit = Math.abs(c.vx);
      const cyc = c.anim * (court ? 22 : vit > 10 ? 9 : 0), et = c.etour > 0;
      const tete = ch || et ? 1 : 0; // la tête baissée
      // pattes : deux segments, le jarret des pattes arrière plié vers l'arrière
      ctx.strokeStyle = '#4a3420'; ctx.lineCap = 'round';
      const pattes = [[-w * 0.3, 0, -1], [-w * 0.2, 1.6, -1], [w * 0.2, 3.1, 1], [w * 0.29, 4.7, 1]];
      for (const [px, ph, av] of pattes) {
        const mv = vit > 10 || court ? 1 : 0, o = Math.sin(cyc + ph) * (court ? 13 : 7) * mv, gr = ch && !court && av > 0 && ph > 4 ? Math.sin(c.anim * 14) * 7 : 0;
        const gx = px + o * 0.35 + (av < 0 ? -6 : 3), gy = -h * 0.24, fx = px + o + gr;
        ctx.lineWidth = 6; trait(ctx, [[px, -h * 0.5], [gx, gy]]); ctx.stroke(); ctx.lineWidth = 3.4; trait(ctx, [[gx, gy], [fx, -3]]); ctx.stroke();
        ctx.fillStyle = INK; ctx.beginPath(); ctx.moveTo(fx - 3.5, -4); ctx.lineTo(fx + 4, -4); ctx.lineTo(fx + 3, 0); ctx.lineTo(fx - 3, 0); ctx.closePath(); ctx.fill();
      }
      ctx.strokeStyle = c.hurt > 0 ? '#9a2a2a' : INK; ctx.lineWidth = 2;
      // corps : la croupe, le dos, le garrot haut, le poitrail profond
      const g = ctx.createLinearGradient(0, -h * 0.78, 0, -h * 0.4); g.addColorStop(0, '#8a6a40'); g.addColorStop(0.6, '#a8865a'); g.addColorStop(1, '#d8c4a0'); ctx.fillStyle = g;
      ctx.beginPath(); ctx.moveTo(-w * 0.4, -h * 0.6); ctx.quadraticCurveTo(-w * 0.38, -h * 0.72, -w * 0.22, -h * 0.72); ctx.quadraticCurveTo(0, -h * 0.7, w * 0.2, -h * 0.78);
      ctx.quadraticCurveTo(w * 0.36, -h * 0.66, w * 0.33, -h * 0.5); ctx.quadraticCurveTo(w * 0.1, -h * 0.4, -w * 0.2, -h * 0.44); ctx.quadraticCurveTo(-w * 0.42, -h * 0.46, -w * 0.4, -h * 0.6); ctx.closePath(); ctx.fill(); ctx.stroke();
      U.hatch(ctx, -w * 0.32, -h * 0.7, w * 0.6, h * 0.12, 5, Math.PI / 5, c.seed, 0.22);
      ctx.fillStyle = 'rgba(239,227,196,0.7)'; for (const [sx, sy] of [[-0.2, -0.62], [-0.08, -0.6], [0.04, -0.63], [-0.14, -0.55]]) { ctx.beginPath(); ctx.arc(sx * w, sy * h, 2, 0, TAU); ctx.fill(); }
      ctx.fillStyle = '#5c8f3e'; for (const [mx, my, r] of [[-0.2, -0.72, 7], [0.0, -0.73, 8], [0.17, -0.79, 6]]) { U.inkCirclePath(ctx, mx * w, my * h, r, c.seed + mx * 9, 1.2); ctx.fill(); ctx.stroke(); }
      ctx.fillStyle = '#efe3c4'; ctx.beginPath(); ctx.ellipse(-w * 0.41, -h * 0.64, 4.5, 6.5, -0.5, 0, TAU); ctx.fill(); ctx.stroke();
      // cou et tête
      const hx = w * 0.46 + tete * 8, hy = -h * (0.86 - tete * 0.3);
      ctx.fillStyle = '#9a7a50'; trait(ctx, [[w * 0.14, -h * 0.76], [hx - 10, hy - 4], [hx + 4, hy + 9], [w * 0.33, -h * 0.52]], true); ctx.fill(); ctx.stroke(); ctx.strokeStyle = 'rgba(31,26,22,0.4)'; ctx.lineWidth = 1; trait(ctx, [[w * 0.26, -h * 0.62], [hx - 2, hy + 4]]); ctx.stroke(); ctx.strokeStyle = c.hurt > 0 ? '#9a2a2a' : INK; ctx.lineWidth = 2;
      ctx.save(); ctx.translate(hx, hy); ctx.rotate(tete * 0.7 + (et ? Math.sin(c.anim * 3) * 0.15 : 0));
      ctx.fillStyle = '#a8865a'; trait(ctx, [[-12, -9], [6, -8], [23, 1], [22, 8], [-7, 9]], true); ctx.fill(); ctx.stroke();
      ctx.fillStyle = INK; ctx.beginPath(); ctx.arc(22, 4, 2.4, 0, TAU); ctx.fill();
      if (et || c.sommeil) { ctx.lineWidth = 1.2; trait(ctx, [[0, -4], [4, 0]]); ctx.stroke(); trait(ctx, [[4, -4], [0, 0]]); ctx.stroke(); } else { ctx.fillStyle = '#1f1a16'; ctx.beginPath(); ctx.arc(3, -2, 2.2, 0, TAU); ctx.fill(); ctx.fillStyle = '#efe3c4'; ctx.beginPath(); ctx.arc(3.7, -2.6, 0.8, 0, TAU); ctx.fill(); }
      ctx.fillStyle = '#c8b08a'; trait(ctx, [[-8, -7], [-16, -14], [-6, -9]], true); ctx.fill(); ctx.stroke();
      // les bois : deux ramures de branches, de la mousse et quelques feuilles
      ctx.lineWidth = 3.4; ctx.strokeStyle = '#5a4022';
      for (const [s, dx0] of [[0.7, -4], [1, 0]]) {
        ctx.save(); ctx.globalAlpha = s; ctx.translate(dx0, -6); ctx.scale(1.35, 1.35);
        const R = [[0, 0, -10, -20], [-10, -20, -14, -40], [-14, -40, -10, -58], [-10, -20, 4, -30], [-14, -40, -28, -48], [-14, -40, -2, -52], [-10, -58, -20, -66], [-10, -58, 0, -68], [-12, -30, -26, -32]];
        for (const [x1, y1, x2, y2] of R) { ctx.beginPath(); ctx.moveTo(x1, y1); ctx.quadraticCurveTo((x1 + x2) / 2 + 3, (y1 + y2) / 2, x2, y2); ctx.stroke(); }
        ctx.restore();
      }
      ctx.lineWidth = 1.2; ctx.strokeStyle = c.hurt > 0 ? '#9a2a2a' : INK;
      ctx.fillStyle = '#6a9c4a'; for (const [lx, ly] of [[-19, -62], [-32, -70], [3, -76], [-27, -94], [5, -97], [-36, -46]]) { ctx.beginPath(); ctx.ellipse(lx, ly, 4, 2.4, 0.6, 0, TAU); ctx.fill(); ctx.stroke(); }
      ctx.restore();
    },
    // Le Golem de magma : des blocs de basalte que la lave tient ensemble
    magma(ctx, c, t, w, h) {
      const cr = c.croute > 0, a = c.att, prepK = a ? clamp(a.t / a.prep, 0, 1) : 0, pas = Math.abs(c.vx) > 5 ? Math.sin(c.anim * 5) : 0;
      const roche = cr ? '#7a726a' : '#3a3230', fente = cr ? 'rgba(120,110,100,0.8)' : 'rgba(246,' + (140 + Math.round(60 * Math.sin(t * 4))) + ',60,1)';
      if (!cr) FX.glow(ctx, 0, -h * 0.5, w * 0.9, '#f08a30', 0.28);
      ctx.fillStyle = roche;
      for (const [s, o] of [[-1, pas], [1, -pas]]) { U.inkPolyPath(ctx, [[s * w * 0.2 - 10, -h * 0.3], [s * w * 0.2 + 10, -h * 0.3], [s * w * 0.2 + 12 + o * 4, 0], [s * w * 0.2 - 12 + o * 4, 0]], c.seed + s, 0.8); ctx.fill(); ctx.stroke(); }
      U.inkPolyPath(ctx, [[-w * 0.42, -h * 0.3], [-w * 0.48, -h * 0.62], [-w * 0.3, -h * 0.82], [w * 0.3, -h * 0.84], [w * 0.5, -h * 0.6], [w * 0.42, -h * 0.28]], c.seed + 2, 1.2); ctx.fill(); ctx.stroke();
      ctx.strokeStyle = fente; ctx.lineWidth = 2.4;
      for (const pts of [[[-w * 0.3, -h * 0.4], [-w * 0.12, -h * 0.55], [-w * 0.18, -h * 0.72]], [[w * 0.05, -h * 0.35], [w * 0.15, -h * 0.5], [w * 0.32, -h * 0.58]], [[-w * 0.05, -h * 0.8], [w * 0.02, -h * 0.62]]]) { trait(ctx, pts); ctx.stroke(); }
      ctx.strokeStyle = c.hurt > 0 ? '#9a2a2a' : INK; ctx.lineWidth = 2;
      if (cr) { ctx.save(); ctx.globalAlpha = 0.5; U.hatch(ctx, -w * 0.45, -h * 0.84, w * 0.9, h * 0.55, 5, -Math.PI / 4, c.seed, 0.4, '#efe3c4'); ctx.restore(); }
      // tête
      ctx.fillStyle = roche; U.inkPolyPath(ctx, [[-w * 0.16, -h * 0.82], [-w * 0.18, -h * 0.98], [w * 0.16, -h], [w * 0.2, -h * 0.83]], c.seed + 4, 0.8); ctx.fill(); ctx.stroke();
      const dim = cr || c.sommeil; oeil(ctx, w * 0.02, -h * 0.9, 2.6, dim ? '#c8b8a0' : '#fff0a0', dim ? 0.3 : 1); oeil(ctx, w * 0.14, -h * 0.9, 2.4, dim ? '#c8b8a0' : '#fff0a0', dim ? 0.3 : 1);
      if (!cr) FX.flamme(ctx, 0, -h * 0.98, 18, 10, t * 1.2 + c.seed, 0, 0.85);
      // bras : le jet lève le poing chargé de lave, le séisme lève les deux bras
      for (const s of [-1, 1]) {
        let ang = s * 0.25 + Math.sin(c.anim * 2 + s) * 0.05;
        if (a && a.type === 'jet' && s === 1) ang = a.fait ? 0.9 : -2.2 * prepK;
        if (a && a.type === 'seisme') ang = a.fait ? s * 0.1 : -s * 2.6 * prepK + (s < 0 ? 0 : 0);
        ctx.save(); ctx.translate(s * w * 0.42, -h * 0.72); ctx.rotate(ang);
        ctx.fillStyle = roche; U.inkPolyPath(ctx, [[-9, 0], [9, 0], [11, 34], [-11, 34]], c.seed + 7 + s, 0.8); ctx.fill(); ctx.stroke();
        U.inkCirclePath(ctx, 0, 42, 12, c.seed + 9 + s, 1.2); ctx.fill(); ctx.stroke();
        if (!cr && a && a.type === 'jet' && s === 1 && !a.fait) { FX.glow(ctx, 0, 42, 22, '#f08a30', 0.6); ctx.fillStyle = '#f6a040'; ctx.beginPath(); ctx.arc(0, 42, 7, 0, TAU); ctx.fill(); }
        ctx.restore();
      }
    },
    // L'Automate des ruines : coque de cuivre rivetée, un rouage qui tourne, un œil unique
    automate(ctx, c, t, w, h) {
      const a = c.att, vise = a && a.type === 'rayon' && !a.fait, mou = c.mouille > 0, hs = c.court > 0;
      const pas = Math.abs(c.vx) > 5 ? Math.sin(c.anim * 7) : 0, tass = hs ? 6 : 0;
      ctx.translate(0, tass);
      // jambes à pistons
      ctx.fillStyle = '#8a4f24';
      for (const [s, o] of [[-1, pas], [1, -pas]]) { const lx = s * w * 0.2; ctx.fillRect(lx - 6, -h * 0.34, 12, h * 0.2); ctx.strokeRect(lx - 6, -h * 0.34, 12, h * 0.2); ctx.fillStyle = '#5f9e8a'; ctx.fillRect(lx - 4 + o * 3, -h * 0.15, 8, h * 0.13); ctx.strokeRect(lx - 4 + o * 3, -h * 0.15, 8, h * 0.13); ctx.fillStyle = '#8a4f24'; ctx.fillRect(lx - 10 + o * 3, -4, 20, 4); ctx.strokeRect(lx - 10 + o * 3, -4, 20, 4); }
      // torse
      const g = ctx.createLinearGradient(-w * 0.4, 0, w * 0.4, 0); g.addColorStop(0, mou ? '#7a4a28' : '#9a5a2c'); g.addColorStop(0.45, mou ? '#c88a58' : '#d8945a'); g.addColorStop(1, mou ? '#6a3e20' : '#8a4f24'); ctx.fillStyle = g;
      ctx.beginPath(); ctx.moveTo(-w * 0.4, -h * 0.34); ctx.lineTo(-w * 0.44, -h * 0.72); ctx.quadraticCurveTo(0, -h * 0.8, w * 0.44, -h * 0.72); ctx.lineTo(w * 0.4, -h * 0.34); ctx.closePath(); ctx.fill(); ctx.stroke();
      ctx.fillStyle = 'rgba(95,158,138,0.55)'; ctx.beginPath(); ctx.ellipse(-w * 0.24, -h * 0.45, 7, 4, 0.3, 0, TAU); ctx.fill();
      ctx.fillStyle = INK; for (let k = 0; k < 6; k++) { ctx.beginPath(); ctx.arc(-w * 0.34 + k * w * 0.136, -h * 0.68, 1.2, 0, TAU); ctx.fill(); ctx.beginPath(); ctx.arc(-w * 0.32 + k * w * 0.128, -h * 0.37, 1.2, 0, TAU); ctx.fill(); }
      // rouage
      ctx.save(); ctx.translate(w * 0.06, -h * 0.53); ctx.rotate(hs ? 0 : c.anim * (Math.abs(c.vx) > 5 ? 3 : 1)); ctx.fillStyle = '#c8a060';
      ctx.beginPath(); for (let k = 0; k < 16; k++) { const r = k % 2 ? 9 : 12, an = k / 16 * TAU; ctx.lineTo(Math.cos(an) * r, Math.sin(an) * r); } ctx.closePath(); ctx.fill(); ctx.stroke(); ctx.beginPath(); ctx.arc(0, 0, 3, 0, TAU); ctx.stroke(); ctx.restore();
      // cheminée et tête
      ctx.fillStyle = '#6a3e20'; ctx.fillRect(-w * 0.34, -h * 0.86, 8, h * 0.14); ctx.strokeRect(-w * 0.34, -h * 0.86, 8, h * 0.14);
      ctx.fillStyle = '#b8733a'; ctx.beginPath(); ctx.arc(w * 0.04, -h * 0.8, w * 0.2, Math.PI, 0); ctx.closePath(); ctx.fill(); ctx.stroke();
      const coul = hs ? (Math.random() < 0.5 ? '#3a3230' : '#fff2a0') : vise ? '#e04030' : c.sommeil ? '#6a5a40' : '#e0c070';
      ctx.fillStyle = '#2a2420'; ctx.beginPath(); ctx.arc(w * 0.12, -h * 0.86, 6.5, 0, TAU); ctx.fill(); ctx.stroke(); oeil(ctx, w * 0.12, -h * 0.86, 3.4, coul, hs ? 0.4 : 1);
      ctx.beginPath(); ctx.moveTo(w * 0.04, -h * 0.98); ctx.lineTo(w * 0.04, -h * 1.08); ctx.stroke(); ctx.fillStyle = hs ? '#fff2a0' : '#5f9e8a'; ctx.beginPath(); ctx.arc(w * 0.04, -h * 1.1, 3, 0, TAU); ctx.fill(); ctx.stroke();
      // bras-pince, tendu pendant la salve
      const tendu = a && a.type === 'salve' ? -1.3 * clamp(a.t / a.prep, 0, 1) : 0;
      ctx.save(); ctx.translate(w * 0.42, -h * 0.66); ctx.rotate(0.3 + tendu + Math.sin(c.anim * 2) * 0.05); ctx.fillStyle = '#8a4f24'; ctx.fillRect(-4, 0, 8, 26); ctx.strokeRect(-4, 0, 8, 26);
      ctx.beginPath(); ctx.moveTo(-5, 26); ctx.lineTo(-8, 36); ctx.moveTo(5, 26); ctx.lineTo(8, 36); ctx.stroke(); if (a && a.type === 'salve' && !a.fait) FX.glow(ctx, 0, 34, 14, '#fff2a0', 0.7); ctx.restore();
      ctx.save(); ctx.translate(-w * 0.42, -h * 0.66); ctx.rotate(-0.25); ctx.fillStyle = '#8a4f24'; ctx.fillRect(-4, 0, 8, 24); ctx.strokeRect(-4, 0, 8, 24); ctx.restore();
      if (mou) { ctx.strokeStyle = 'rgba(255,255,255,0.6)'; ctx.lineWidth = 1.2; trait(ctx, [[-w * 0.3, -h * 0.66], [-w * 0.33, -h * 0.45]]); ctx.stroke(); }
    },
  };
  function etoiles(ctx, x, y, t) {
    ctx.save(); ctx.strokeStyle = '#c08a2a'; ctx.lineWidth = 1.5;
    for (let i = 0; i < 3; i++) { const a = t * 3 + i * TAU / 3, sx = x + Math.cos(a) * 18, sy = y + Math.sin(a) * 5; ctx.beginPath(); ctx.moveTo(sx - 4, sy); ctx.lineTo(sx + 4, sy); ctx.moveTo(sx, sy - 4); ctx.lineTo(sx, sy + 4); ctx.stroke(); }
    ctx.restore();
  }
  // ce que le gardien prépare se voit, pour qu'on puisse l'esquiver
  function annonce(ctx, c, t) {
    const a = c.att; if (!a) return;
    if (a.type === 'racines') {
      const k = clamp(a.t / a.prep, 0, 1);
      ctx.save();
      if (!a.fait) { ctx.strokeStyle = 'rgba(90,64,34,' + (0.3 + 0.6 * k) + ')'; ctx.lineWidth = 2; for (let i = -3; i <= 3; i++) { ctx.beginPath(); ctx.moveTo(a.x + i * 8, a.y); ctx.lineTo(a.x + i * 11 + Math.sin(i * 3) * 4, a.y - 3 - k * 4); ctx.stroke(); } FX.glow(ctx, a.x, a.y, 30, '#5a4022', 0.25 * k); }
      else { const u = clamp((a.t - a.prep) / DUREE.racines, 0, 1), hh = Math.sin(u * Math.PI) * 58; ctx.fillStyle = '#5a4022'; ctx.strokeStyle = INK; ctx.lineWidth = 1.5; for (let i = -2; i <= 2; i++) { const bx = a.x + i * 12, hi = hh * (1 - Math.abs(i) * 0.22); ctx.beginPath(); ctx.moveTo(bx - 5, a.y); ctx.lineTo(bx + Math.sin(i) * 3, a.y - hi); ctx.lineTo(bx + 5, a.y); ctx.closePath(); ctx.fill(); ctx.stroke(); } }
      ctx.restore();
    }
    if (a.type === 'rayon') {
      const x1 = c.x + c.w / 2 + c.dir * 12, y1 = c.y + 20;
      ctx.save();
      if (!a.fait) { const k = clamp(a.t / a.prep, 0, 1); ctx.strokeStyle = 'rgba(224,64,48,' + (0.25 + 0.5 * k) + ')'; ctx.lineWidth = 1.4; ctx.setLineDash([6, 6]); ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x1 + (a.cx - x1) * 1.6, y1 + (a.cy - y1) * 1.6); ctx.stroke(); ctx.setLineDash([]); }
      else if (a.L) { const u = 1 - clamp((a.t - a.prep) / DUREE.rayon, 0, 1); ctx.strokeStyle = 'rgba(255,120,80,' + u + ')'; ctx.lineWidth = 7 * u + 2; ctx.beginPath(); ctx.moveTo(a.L.x1, a.L.y1); ctx.lineTo(a.L.x2, a.L.y2); ctx.stroke(); ctx.strokeStyle = 'rgba(255,240,200,' + u + ')'; ctx.lineWidth = 2; ctx.stroke(); FX.glow(ctx, a.L.x2, a.L.y2, 30, '#ff8050', 0.6 * u); }
      ctx.restore();
    }
  }
  function dessiner(ctx, c, t) {
    if (c.vaincu) return;
    annonce(ctx, c, t);
    const cx = c.x + c.w / 2, by = c.y + c.h;
    ctx.save(); ctx.translate(cx, by); if (c.dir < 0) ctx.scale(-1, 1);
    ctx.strokeStyle = c.hurt > 0 ? '#9a2a2a' : INK; ctx.lineWidth = 2; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    (ART[c.g] || ART.ent)(ctx, c, t, c.w, c.h);
    ctx.restore();
    if (c.etour > 0 || c.court > 0 || c.gel > 0) etoiles(ctx, cx, c.y - 6, t);
    if (c.sommeil) for (let i = 0; i < 3; i++) { const u = (t * 0.5 + i / 3) % 1; ctx.save(); ctx.globalAlpha = Math.sin(u * Math.PI) * 0.7; U.txt(ctx, 'z', cx + 16 + u * 22, c.y - 4 - u * 34, 12 + u * 8, 'center', INK, 'IM Fell English', 'italic'); ctx.restore(); }
    if (c.gel > 0) { ctx.save(); ctx.globalAlpha = 0.35; ctx.fillStyle = '#cfe3ea'; ctx.fillRect(c.x, c.y, c.w, c.h); ctx.restore(); }
  }
  function dessinerTirs(ctx, t) {
    for (const q of tirs) {
      ctx.save(); ctx.translate(q.x, q.y);
      if (q.type === 'epine') { ctx.rotate(q.rot); ctx.fillStyle = '#6b4f2a'; ctx.strokeStyle = INK; ctx.lineWidth = 1.2; ctx.beginPath(); ctx.ellipse(0, 0, 5, 3.5, 0, 0, TAU); ctx.fill(); ctx.stroke(); for (let k = 0; k < 5; k++) { const a = k / 5 * TAU; ctx.beginPath(); ctx.moveTo(Math.cos(a) * 4, Math.sin(a) * 3); ctx.lineTo(Math.cos(a) * 8, Math.sin(a) * 6); ctx.stroke(); } }
      if (q.type === 'lave') { FX.glow(ctx, 0, 0, 18, '#f08a30', 0.6); ctx.fillStyle = '#f6a040'; ctx.strokeStyle = '#7a2a10'; ctx.lineWidth = 1.4; U.inkCirclePath(ctx, 0, 0, q.r, 3, 1.2); ctx.fill(); ctx.stroke(); }
      if (q.type === 'orbe') { FX.glow(ctx, 0, 0, 16, '#fff2a0', 0.7); ctx.fillStyle = '#fff6c0'; ctx.beginPath(); ctx.arc(0, 0, 4.5, 0, TAU); ctx.fill(); ctx.strokeStyle = '#e0c43a'; ctx.lineWidth = 1.2; for (let k = 0; k < 3; k++) { const a = t * 9 + k * 2.1; ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(Math.cos(a) * 9, Math.sin(a) * 9); ctx.stroke(); } }
      ctx.restore();
    }
  }
  // la barre de vie du gardien qu'on affronte, au-dessus de la barre des sceaux
  function hud(ctx, VW, VH, t) {
    const c = actif; if (!c || !c.engage || c.vaincu) return;
    const D = DATA.GARDIENS[c.g], w = Math.min(420, VW - 80), x = (VW - w) / 2, y = VH - 132;
    ctx.save();
    U.txt(ctx, D.nom, VW / 2, y - 8, 18, 'center', INK, 'IM Fell English', 'italic');
    ctx.fillStyle = 'rgba(239,227,196,0.92)'; ctx.fillRect(x, y, w, 12);
    ctx.fillStyle = c.croute > 0 ? '#8a827a' : c.court > 0 ? '#e0c43a' : D.couleur; ctx.fillRect(x + 2, y + 2, (w - 4) * clamp(c.hp / c.hpMax, 0, 1), 8);
    ctx.strokeStyle = INK; ctx.lineWidth = 1.6; U.inkRect(ctx, x, y, w, 12, 5, 0.6); ctx.stroke();
    const etat = c.etour > 0 ? 'étourdi' : c.court > 0 ? 'court-circuit' : c.croute > 0 ? 'figé' : c.brule > 0 ? 'en feu' : c.mouille > 0 ? 'trempé' : '';
    if (etat) U.txt(ctx, etat, x + w, y - 8, 13, 'right', '#7a5a2a', 'IM Fell English', 'italic');
    ctx.restore();
  }
  function lumieres(ls) { for (const c of st().crs) if (c.t === 'gardien' && !c.vaincu && c.hp > 0) { if (c.g === 'magma' && c.croute <= 0) ls.push({ x: c.x + c.w / 2, y: c.y + c.h / 2, r: 200 }); if (c.g === 'automate') ls.push({ x: c.x + c.w / 2, y: c.y + 16, r: 70 }); } }
  function reset() { tirs = []; actif = null; }
  return { stats, update, sort, hurt, blesser, majTirs, dessiner, dessinerTirs, hud, lumieres, reset, REAC, STATS, get tirs() { return tirs; }, get actif() { return actif; } };
}
