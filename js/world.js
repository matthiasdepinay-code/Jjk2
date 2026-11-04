'use strict';
// ---------- Monde extérieur : entités sur grille de matières, effets, créatures, météo, rendu ----------
const World = (() => {
  const { TAU, INK, clamp, lerp, dist } = U;
  const GRAV = 1500;
  const CHAUD_OK = ['follet', 'salamandre', 'golem', 'familier'], FROID_OK = ['lapin', 'golem', 'familier', 'poisson'];
  // ---------- Masse et flottaison ----------
  const MASSE = { caisse: 0.8, rocher: 4, golem: 6, tortue: 1.6, lapin: 0.4, limace: 0.5, grenouille: 0.3, poisson: 0.2, corbeau: 0.2, follet: 0.1, salamandre: 0.5, chauve: 0.2, escargot: 0.4, familier: 0.2 };
  const DENS = { caisse: 0.5, rocher: 2.6, golem: 2.4, tortue: 1.05, escargot: 1.2, salamandre: 0.95, limace: 0.9, lapin: 0.8, grenouille: 0.85 };
  function masse(e) { return e === (st && st.p) ? 1 : (e && MASSE[e.t]) || 1; }
  const VW = 1280, VH = 720;
  const CS = Sim.CS, M = Sim.M, P = Sim.P;
  let L = null, st = null, game = null, darkCv = null, time = 0;
  const DAY = 420; // secondes par jour
  const LIQ_ING = { [M.EAU]: 'eau', [M.SAUMURE]: 'eau', [M.HUILE]: 'huile', [M.ACIDE]: 'acide', [M.LAVE]: 'lave', [M.SEVE]: 'seve', [M.MIEL]: 'miel' };
  const MainSim = Sim;
  const colorOf = (core) => (DATA.CORES[core] || DATA.PSEUDO[core] || { couleur: '#8a7a5a' }).couleur;
  const FLAM = (m) => m === M.BOIS || m === M.PLANTE || m === M.HERBE;

  // ---------- Construction ----------
  function build(g, saved) {
    game = g;
    time = 0;
    L = Gen.generate(7);
    st = {
      p: makePlayer(L.spawn.x, L.spawn.y),
      objs: [], crs: [], sp: [], parts: [], pickups: [], eclairs: [],
      cam: { x: 0, y: 0 }, shake: 0, lastZone: '', flash: 0,
      tod: 0.32, jour: 0, meteo: { type: 'clair', t: 120 }, foudreT: 4, rainT: 0, obsT: {}, ileT: 0, pluieT: 0,
      control: null, lien: null, portails: [], gz: [], marques: [], lastBurst: null, defiT: 0, lac: null, lacSec: false, vuSommet: false, maxDepth: 0,
    };
    for (const o of L.objs) st.objs.push(makeObj(o));
    for (const c of L.crs) st.crs.push(makeCreature(c));
    if (saved) restore(saved);
    Sim.ancrer(); PH.reset();
    if (aRestaurer) { const R = aRestaurer; aRestaurer = null; try { for (const q of R.familiers) { if (!DATA.FAMILIERS[q.espece]) continue; const spec = makeSpec(Seal.clone(q.seal)); const f = nouveauFamilier(spec, q.espece, q.x, q.y); f.life = q.life; f.hp = Math.min(f.hpMax, q.hp); f.age = q.age || 0; st.crs.push(f); } PH.restaurer(R.phen); } catch (e) { console.warn('restauration des familiers et phénomènes', e); } }
    st.cam.x = clamp(st.p.x - VW / 2, 0, L.w - VW); st.cam.y = clamp(st.p.y - VH / 2, 0, L.h - VH);
    if (!darkCv) { darkCv = document.createElement('canvas'); darkCv.width = VW / 2; darkCv.height = VH / 2; } // l'obscurité, toute en dégradés, se calcule à demi-résolution
    Sim.onEvent = onSimEvent;
  }
  function ensure(g, saved) { if (!st) build(g, saved); game = g; }
  // ---------- Phénomènes (combos d'essences) ----------
  const PH = creerPhenomenes({
    Sim, get st() { return st; }, game: () => game, time: () => time,
    applyEffect: (...a) => applyEffect(...a), hurt: (...a) => hurt(...a), part: (...a) => part(...a), msg: (...a) => msg(...a), evt: (...a) => evt(...a),
    groundBelow: (...a) => groundBelow(...a), spawnLiquid: (...a) => spawnLiquid(...a), addGField: (...a) => addGField(...a), vieillir: (...a) => vieillir(...a),
    makeCreature: (c) => makeCreature(c), masse: (e) => masse(e), chaudOk: (c) => CHAUD_OK.includes(c.t), froidOk: (c) => FROID_OK.includes(c.t),
    flash: (v) => { st.flash = Math.max(st.flash, v); }, shake: (v) => { st.shake = Math.max(st.shake, v); }, son: (a, b) => Son.sfx(a, b), colorOf: (c) => colorOf(c),
    daylight: () => daylight(), revenir: (c) => finMorph(c), makeSpec: (s) => makeSpec(s), tient: (h) => tientMain(h), boire: (n) => { if (st.p.ink < n) return false; st.p.ink -= n; return true; },
    origine: () => ({ x: st.p.x + st.p.w / 2, y: st.p.y + st.p.h * 0.45 }), cible: (R) => { const p = st.p, o = { x: p.x + p.w / 2, y: p.y + p.h * 0.45 }, a = toWorld(game.inp.mouse.x, game.inp.mouse.y); const dx = a.x - o.x, dy = a.y - o.y, d = Math.hypot(dx, dy) || 1, k = Math.min(1, R / d); return { x: o.x + dx * k, y: o.y + dy * k }; }, addXp: (n) => { if (game && game.addXp) game.addXp(n); }, tempsDe: (x, y) => (bullesT.length ? tempsDe(x, y, 2) : 1),
  });
  function respawn() {
    const p = st.p;
    p.x = L.spawn.x; p.y = L.spawn.y; p.vx = 0; p.vy = 0; p.hp = p.hpMax; p.pg = null; p.w = 26; p.h = 50;
    for (const k in p.sta) p.sta[k] = 0;
    if (p.carry) drop();
  }
  function makePlayer(x, y) {
    return { x, y, w: 26, h: 50, vx: 0, vy: 0, face: 1, onGround: false, coyote: 0, jumpBuf: 0, anim: 0, canStep: true,
      hp: 10, hpMax: 10, ink: 40, inkMax: 40, inkRegen: 1.8, inv: 0, climbing: false, liq: 0,
      sta: { wet: 0, stone: 0, invisible: 0, lowgrav: 0, jump: 0, small: 0, vision: 0, burning: 0, glide: 0, lumiere: 0, patins: 0, vitesse: 0, dissous: 0, vol: 0, branchies: 0, geant: 0, glisse: 0, hate: 0, lent: 0, armure: 0, hoquet: 0, glouglou: 0, boussole: 0, phenix: 0, regen: 0, garde: 0 },
      trap: null, selfTimer: null, carry: null, digT: 0 };
  }
  const MECA = ['levier', 'plaque', 'brasier', 'roue', 'moulin', 'lampe', 'grille', 'coffre'];
  const EMETTEURS = ['levier', 'plaque', 'brasier', 'roue', 'moulin', 'lampe'];
  function emetActif(o) {
    switch (o.t) {
      case 'levier': return o.voulu !== undefined ? o.etat === o.voulu : o.etat;
      case 'plaque': return o.actif;
      case 'brasier': return o.feu > 0;
      case 'roue': return o.eau > 0.75;
      case 'moulin': return o.spin > 0;
      case 'lampe': return o.charge > 0;
    }
    return false;
  }
  // ---------- Mécanismes : mise à jour des émetteurs et des circuits ----------
  function majMecanismes(dt) {
    const circuits = {};
    for (const o of st.objs) {
      if (o.mort || !o.canal) continue;
      const k = circuits[o.canal] || (circuits[o.canal] = { em: [], rec: [] });
      if (EMETTEURS.includes(o.t)) k.em.push(o); else k.rec.push(o);
      switch (o.t) {
        case 'levier': o.anim += ((o.etat ? 1 : 0) - o.anim) * Math.min(1, dt * 10); break;
        case 'plaque': {
          const zone = { x: o.x + 2, y: o.y - 6, w: o.w - 4, h: 10 };
          let poids = U.rectsOverlap(zone, st.p) && !st.p.sta.vol;
          if (!poids) poids = st.crs.some((c) => c.hp > 0 && (c.sta.tame || c.controlled || c.carried) && U.rectsOverlap(zone, c)) || st.objs.some((q) => q.dyn && !q.carried && !q.mort && U.rectsOverlap(zone, q));
          if (!poids) { let n = 0; const x0 = Math.floor(o.x / CS), x1 = Math.floor((o.x + o.w) / CS), y0 = Math.floor((o.y - 18) / CS), y1 = Math.floor(o.y / CS); for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) { const m = Sim.get(x, y); if (m && !P[m].gas && m !== M.BULLE && m !== M.NEIGE && m !== M.EAU) n++; } poids = n >= 8; }
          if (poids && !o.actif) Son.sfx('click');
          o.actif = poids; o.press += ((poids ? 1 : 0) - o.press) * Math.min(1, dt * 12);
          break;
        }
        case 'brasier': {
          if (o.feu > 0) { o.feu -= dt; if (Math.random() < 0.5) part(o.x + o.w / 2 + (Math.random() - 0.5) * 12, o.y + 4, '#f08a30', 1, 20, 0.5, 2.6, -260, 'flamme'); if (o.feu <= 0) { part(o.x + o.w / 2, o.y, '#6e6660', 6, 30, 1, 4, -60, 'fumee'); } }
          else if (Sim.rectHas({ x: o.x, y: o.y - 8, w: o.w, h: 14 }, (m) => m === M.FEU || m === M.LAVE)) { o.feu = 20; Son.sfx('burst', 'feu'); }
          if (o.feu > 0 && st.meteo && (st.meteo.type === 'pluie' || st.meteo.type === 'orage') && Math.random() < dt * 0.3) o.feu = Math.max(0, o.feu - 4);
          break;
        }
        case 'roue': {
          let n = 0; const x0 = Math.floor(o.x / CS), x1 = Math.floor((o.x + o.w) / CS), y0 = Math.floor(o.y / CS), y1 = Math.floor((o.y + o.h + 6) / CS);
          for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) { const m = Sim.get(x, y); if (P[m].liquid && m !== M.LAVE && m !== M.MIEL) n++; }
          const cible = Math.min(1, n / 10); o.eau += (cible - o.eau) * Math.min(1, dt * 2); o.ang += o.eau * dt * 3;
          break;
        }
        case 'moulin': if (o.spin > 0) o.spin -= dt; o.ang += (o.spin > 0 ? 4 : 0.15) * dt; break;
        case 'lampe': {
          if (o.charge > 0) o.charge -= dt;
          const x0 = Math.floor(o.x / CS), x1 = Math.floor((o.x + o.w) / CS), y = Math.floor((o.y + o.h + 3) / CS);
          for (let x = x0; x <= x1; x++) if (Sim.elec[y * Sim.W + x] > 0) o.charge = Math.max(o.charge, 2);
          break;
        }
        case 'grille': { const a = o.puissant ? 1 : 0; o.ouv += (a - o.ouv) * Math.min(1, dt * 3); o.solid = o.ouv < 0.6; break; }
        case 'coffre': o.couv += ((o.ouvert ? 1 : 0) - o.couv) * Math.min(1, dt * 4); break;
      }
    }
    for (const k in circuits) {
      const C = circuits[k]; const on = C.em.length > 0 && C.em.every(emetActif);
      for (const r of C.rec) {
        if (r.t === 'grille') { if (on && !r.puissant) { Son.sfx('door'); if (inView(r.x, r.y)) msg('Une grille s\'ouvre.'); } r.puissant = on; }
        if (r.t === 'coffre' && on && !r.ouvert) ouvrirCoffre(r);
      }
      C.on = on;
    }
    st.circuits = circuits;
  }
  // fils d'encre entre un récepteur et ses émetteurs, visibles de près
  function liensCircuit(ctx, o) {
    const C = st.circuits && st.circuits[o.canal]; if (!C || o.ouvert) return;
    const p = st.p; const d = dist(p.x, p.y, o.x, o.y); if (d > 520) return;
    ctx.save(); ctx.setLineDash([3, 6]); ctx.lineWidth = 1.3;
    for (const e of C.em) { const on = emetActif(e); ctx.strokeStyle = on ? '#e0b050' : 'rgba(31,26,22,0.35)'; ctx.globalAlpha = Math.min(1, (520 - d) / 200); ctx.beginPath(); const ax = e.x + e.w / 2, ay = e.y + e.h - 2, bx = o.x + o.w / 2, by = o.y + o.h - 2; ctx.moveTo(ax, ay); ctx.quadraticCurveTo((ax + bx) / 2, Math.max(ay, by) + 14, bx, by); ctx.stroke(); }
    ctx.restore();
  }
  function ouvrirCoffre(o) {
    o.ouvert = true; const R0 = o.recompense || {}; const recu = [];
    if (R0.ing) for (const id in R0.ing) for (let i = 0; i < R0.ing[id]; i++) { game.gainIngredient(id); if (!i) recu.push(DATA.INGREDIENTS[id].nom + (R0.ing[id] > 1 ? ' ×' + R0.ing[id] : '')); }
    if (R0.encre) for (const id in R0.encre) { game.inv.encres[id] = (game.inv.encres[id] || 0) + R0.encre[id]; recu.push(R0.encre[id] + ' gouttes d\'' + DATA.ENCRES[id].nom.toLowerCase()); }
    if (R0.xp) game.addXp(R0.xp);
    part(o.x + o.w / 2, o.y, '#e0b050', 24, 140, 1, 3, -60, 'etincelle'); part(o.x + o.w / 2, o.y, '#fff0b0', 10, 60, 0.8, 6, -40, 'glow');
    st.shake = 0.15; Son.sfx('unlock');
    msg('✦ ' + (o.nom || 'Un coffre') + ' s\'ouvre ! ' + (recu.length ? 'Dedans : ' + recu.join(', ') + '.' : ''), 'unlock');
    evt('coffre'); game.save();
  }
  function makeObj(o) {
    const b = { t: o.t, x: o.x, y: o.y, seed: (o.x * 31 + o.y * 7) | 0 };
    switch (o.t) {
      case 'porte': Object.assign(b, { w: 64, h: 110 }); break;
      case 'mannequin': Object.assign(b, { w: 30, h: 70, hits: 0, wob: 0 }); break;
      case 'caisse': Object.assign(b, { w: 36, h: 36, vx: 0, vy: 0, solid: true, burning: 0, hp: 3, dyn: true, portable: true, bounce: true }); break;
      case 'torche': Object.assign(b, { w: 14, h: 80, lit: false, flicker: 0 }); break;
      case 'graine': Object.assign(b, { w: 20, h: 10, stage: 0, hauteur: 0, hMax: 0, racine: true, regrow: 0, cells: [] }); break;
      case 'pancarte': Object.assign(b, { w: 34, h: 70, texte: o.texte }); break;
      case 'rocher': Object.assign(b, { w: 56, h: 56, solid: true, fissure: 0, vy: 0, vx: 0, dyn: true }); break;
      case 'champignon': Object.assign(b, { w: 22, h: 26, pris: false }); break;
      case 'rune': Object.assign(b, { w: 40, h: 60, revele: 0, lu: false, cooldown: 0 }); break;
      case 'page': Object.assign(b, { w: 20, h: 24, page: o.page, lue: false }); break;
      case 'ruche': Object.assign(b, { w: 22, h: 30, drip: 4, enfume: 0 }); break;
      // mécanismes
      case 'levier': Object.assign(b, { w: 20, h: 34, etat: !!o.etat, anim: o.etat ? 1 : 0 }); break;
      case 'plaque': Object.assign(b, { w: 44, h: 8, actif: false, press: 0 }); break;
      case 'brasier': Object.assign(b, { w: 26, h: 30, feu: 0 }); break;
      case 'roue': Object.assign(b, { w: 44, h: 44, ang: 0, eau: 0 }); break;
      case 'moulin': Object.assign(b, { w: 40, h: 76, ang: 0, spin: 0 }); break;
      case 'lampe': Object.assign(b, { w: 22, h: 36, charge: 0 }); break;
      case 'grille': Object.assign(b, o.horiz ? { w: o.largeur || 54, h: 18, largeur: o.largeur } : { w: 18, h: 90 }, { solid: true, ouv: 0 }); break;
      case 'coffre': Object.assign(b, { w: 40, h: 30, ouvert: !!o.ouvert, couv: o.ouvert ? 1 : 0, sceau: 0 }); break;
    }
    for (const k of ['lit', 'stage', 'hauteur', 'hMax', 'racine', 'lu', 'revele', 'hits', 'pris', 'hp', 'lue', 'page', 'canal', 'etat', 'voulu', 'ouvert', 'recompense', 'nom', 'indice', 'horiz', 'toujours', 'largeur']) if (o[k] !== undefined) b[k] = o[k];
    return b;
  }
  function makeCreature(c) {
    const b = { t: c.t, x: c.x, y: c.y, vx: 0, vy: 0, dir: 1, onGround: false, seed: (c.x * 13) | 0, size: 1, canStep: true,
      sta: { burn: 0, stun: 0, sleep: 0, wet: 0, tame: !!c.tame, glisse: 0 }, hop: 0, filDonne: !!c.tame, x0: c.x0 || c.x, y0: c.y, phase: Math.random() * TAU, hurt: 0, hp: 0 };
    switch (c.t) {
      case 'limace': Object.assign(b, { w: 36, h: 24, hp: 3, hpMax: 3, dmg: 1, portable: true }); break;
      case 'follet': Object.assign(b, { w: 24, h: 24, hp: 2, hpMax: 2, dmg: 1, vole: true, portable: true }); break;
      case 'golem': Object.assign(b, { w: 50, h: 70, hp: 8, hpMax: 8, dmg: 2 }); break;
      default: { const sp = DATA.ESPECES[c.t]; if (sp) Object.assign(b, { w: sp.w, h: sp.h, hp: sp.hp, hpMax: sp.hp, dmg: sp.dmg, vole: sp.mode === 'fly', generique: true, portable: sp.w <= 36 }); }
    }
    b.cadeauT = 0;
    if (c.hp !== undefined) b.hp = c.hp;
    if (c.aff) { b.aff = c.aff; b.affJ = c.affJ; b.affDuJour = c.affDuJour; }
    return b;
  }

  // ---------- Sauvegarde du monde ----------
  function serialize() {
    return {
      mat: Sim.serialize(), tod: st.tod, jour: st.jour || 0, meteo: st.meteo, mecaV: 1,
      objs: st.objs.filter((o) => !o.mort && o.t !== 'magie').map((o) => { const q = { t: o.t, x: Math.round(o.x), y: Math.round(o.y) }; for (const k of ['lit', 'stage', 'hauteur', 'hMax', 'racine', 'lu', 'revele', 'hits', 'pris', 'hp', 'lue', 'page', 'canal', 'etat', 'voulu', 'ouvert', 'recompense', 'nom', 'indice', 'horiz', 'toujours', 'largeur']) if (o[k] !== undefined) q[k] = o[k]; if (o.t === 'pancarte') q.texte = o.texte; return q; }),
      familiers: st.crs.filter((c) => c.t === 'familier' && c.hp > 0 && c.spec && c.spec.seal && c.life > 1).map((c) => ({ espece: c.espece, seal: c.spec.seal, x: Math.round(c.x), y: Math.round(c.y), life: Math.round(c.life), hp: c.hp, age: Math.round(c.age || 0) })),
      phen: PH.sauver(),
      crs: st.crs.filter((c) => c.t !== 'familier' && !c.temporaire).map((c) => ({ t: c.orig ? c.orig.t : c.t, x: Math.round(c.x), y: Math.round(c.y), x0: c.x0, hp: c.orig ? c.orig.hp : c.hp, tame: c.sta.tame, aff: c.aff ? Math.round(c.aff) : undefined, affJ: c.affJ, affDuJour: c.affDuJour })),
    };
  }
  let aRestaurer = null, nappeT = 0;
  function restore(d) {
    try {
      if (d.mat) Sim.deserialize(d.mat);
      if (d.objs) st.objs = d.objs.map(makeObj);
      if (d.objs && !d.mecaV) for (const q of L.objs) if (MECA.includes(q.t)) st.objs.push(makeObj(q));
      if (d.crs) st.crs = d.crs.map(makeCreature);
      if (d.tod != null) st.tod = d.tod;
      if (d.jour != null) st.jour = d.jour;
      if (d.meteo) st.meteo = d.meteo;
      aRestaurer = { familiers: d.familiers || [], phen: d.phen || null };
    } catch (e) { console.warn('monde illisible, régénéré', e); }
  }
  function reset() { st = null; }
  function relacher(t) { if (!st) return; const c = makeCreature({ t, x: L.spawn.x + 80, y: L.spawn.y, tame: true }); c.filDonne = true; st.crs.push(c); }

  // ---------- Collisions sur grille ----------
  function dynSolids(exclude) { const a = []; for (const o of st.objs) if (o.solid && !o.mort && o !== exclude && o !== (st.p.carry || null)) a.push(o); return a; }
  function blockedBy(r, sols) { if (Sim.rectBlocked(r)) return true; for (const s of sols) if (U.rectsOverlap(r, s)) return true; return false; }
  function moveBody(b, dt, exclude) {
    const sols = dynSolids(exclude);
    let dx = b.vx * dt; b.hitX = false; b.choc = 0;
    while (Math.abs(dx) > 0.01) {
      const s = Math.abs(dx) < 3 ? dx : Math.sign(dx) * 3;
      if (!blockedBy({ x: b.x + s, y: b.y, w: b.w, h: b.h }, sols)) { b.x += s; dx -= s; continue; }
      let ok = false;
      if (b.canStep) for (let up = 1; up <= CS * 1.6; up += 1) { if (!blockedBy({ x: b.x + s, y: b.y - up, w: b.w, h: b.h }, sols) && !blockedBy({ x: b.x, y: b.y - up, w: b.w, h: b.h }, sols)) { b.y -= up; b.x += s; dx -= s; ok = true; break; } }
      if (!ok) { b.hitX = true; b.choc = Math.abs(b.vx); b.vx = b.bounce ? -b.vx * 0.4 : 0; break; }
    }
    let dy = b.vy * dt; b.onGround = false;
    while (Math.abs(dy) > 0.01) {
      const s = Math.abs(dy) < 3 ? dy : Math.sign(dy) * 3;
      if (!blockedBy({ x: b.x, y: b.y + s, w: b.w, h: b.h }, sols)) { b.y += s; dy -= s; }
      else { if (s > 0) b.onGround = true; b.choc = Math.max(b.choc, Math.abs(b.vy)); b.vy = b.bounce && s > 0 && Math.abs(b.vy) > 200 ? -b.vy * 0.3 : 0; break; }
    }
    if (!b.onGround && b.vy >= 0 && blockedBy({ x: b.x, y: b.y + 1, w: b.w, h: b.h }, sols)) b.onGround = true;
    // décoincement (une cellule est apparue sur nous)
    if (blockedBy(b, sols)) { for (let up = 1; up <= CS * 6; up++) { if (!blockedBy({ x: b.x, y: b.y - up, w: b.w, h: b.h }, sols)) { b.y -= up; break; } } }
    b.x = clamp(b.x, 0, L.w - b.w);
    if (b.y > L.h + 100) b.y = L.h + 100;
    // une créature projetée contre un mur ou qui tombe de haut se fait mal
    if (b.choc > 720 && b !== st.p && b.hp > 0 && DATA.ESPECES[b.t] && b.t !== 'familier') { hurt(b, Math.min(4, (b.choc - 720) / 240) / Math.sqrt(masse(b))); b.sta.stun = Math.max(b.sta.stun || 0, 0.6); part(b.x + b.w / 2, b.y + b.h, '#8a7a5a', 6, 60, 0.4, 2, 200); }
    if (b.choc > 820 && b.t === 'caisse') { b.hp -= 1; part(b.x + b.w / 2, b.y + b.h / 2, '#8d6a3c', 6, 90, 0.5, 2, 400, 'eclat'); if (b.hp <= 0) { b.mort = true; Son.sfx('burst', 'terre'); } }
  }
  function unstick(b) {
    const sols = dynSolids(b);
    if (!blockedBy(b, sols)) return;
    for (let r = 2; r <= 40; r += 2) for (const [dx, dy] of [[0, -1], [0, 1], [-1, 0], [1, 0], [-1, -1], [1, -1], [-1, 1], [1, 1]]) {
      const t = { x: b.x + dx * r, y: b.y + dy * r, w: b.w, h: b.h };
      if (!blockedBy(t, sols)) { b.x = t.x; b.y = t.y; return; }
    }
  }
  function crush(p) {
    const cx = p.x + p.w / 2, cy = p.y + p.h; let n = 0;
    Sim.forRadius(cx, cy + 8, 22, (x, y, i, m) => {
      if (m === M.VERRE) { Sim.set(x, y, M.SABLE); n++; } else if (m === M.GLACE) { Sim.set(x, y, M.NEIGE); n++; }
      else if ((m === M.NEIGE || m === M.SABLE || m === M.CENDRE || m === M.HERBE || m === M.PLANTE || m === M.TERRE) && Math.random() < 0.55) { Sim.set(x, y, M.AIR); n++; }
    });
    for (const c of st.crs) if (c.hp > 0 && dist(cx, cy, c.x + c.w / 2, c.y + c.h / 2) < 80) { c.sta.stun = Math.max(c.sta.stun, 2); c.vy -= 260; }
    for (const o of st.objs) if (o.dyn && !o.carried && dist(cx, cy, o.x + o.w / 2, o.y + o.h / 2) < 80) o.vy -= 300;
    st.shake = 0.4; part(cx, cy, '#8a7a5a', 16, 130, 0.6, 3, 500); Son.sfx('burst', 'terre');
    if (n > 6) msg('Boum. Le sol cède sous ton poids.');
  }
  // les blocs qui s'effondrent écrasent ce qui se trouve dessous
  function blocsTombants() {
    for (const b of Sim.blocs) {
      if (b.pose || b.vy < 0.35) continue;
      const r = { x: b.x0 * CS, y: b.y0 * CS, w: (b.x1 - b.x0 + 1) * CS, h: (b.y1 - b.y0 + 1) * CS + b.vy * CS };
      b.touche = b.touche || new Set();
      const ents = st.crs.filter((c) => c.hp > 0 && c.t !== 'familier'); ents.push(st.p);
      for (const e of ents) {
        if (b.touche.has(e) || !U.rectsOverlap(r, e) || e.y + e.h * 0.5 < r.y) continue;
        b.touche.add(e); const dmg = Math.min(8, 1 + b.n / 40 * b.vy);
        const cote = e.x + e.w / 2 < r.x + r.w / 2 ? -1 : 1;
        if (e === st.p) { if (!(e.sta.stone > 0)) { e.hp -= dmg * 0.6; msg('Un bloc te tombe dessus !', 'warn'); } }
        else { hurt(e, dmg / Math.sqrt(masse(e))); e.sta.stun = Math.max(e.sta.stun || 0, 1.5); }
        e.vx = cote * 320; e.vy = -120; part(e.x + e.w / 2, e.y, '#8a7a5a', 8, 90, 0.5, 2, 300);
      }
    }
  }
  function liquidOf(b) { const m = Sim.matAt(b.x + b.w / 2, b.y + b.h * 0.55); return P[m].liquid ? m : 0; }
  const DENS_LIQ = []; DENS_LIQ[M.EAU] = 1; DENS_LIQ[M.SAUMURE] = 1.2; DENS_LIQ[M.HUILE] = 0.85; DENS_LIQ[M.ACIDE] = 1.1; DENS_LIQ[M.BOUE] = 1.7; DENS_LIQ[M.MIEL] = 1.4; DENS_LIQ[M.SEVE] = 1; DENS_LIQ[M.LAVE] = 3;
  // poussée d'Archimède : ce qui est plus léger que le liquide flotte, le reste coule plus lentement
  function flotter(b, dt, dens) {
    let n = 0, rho = 0;
    for (const f of [0.2, 0.5, 0.8]) { const m = Sim.matAt(b.x + b.w / 2, b.y + b.h * f); if (P[m].liquid) { n++; rho = Math.max(rho, DENS_LIQ[m] || 1); } }
    if (!n) return 0; const frac = n / 3;
    b.vy -= GRAV * frac * (rho / dens) * dt;
    const visc = rho > 1.3 ? 4.5 : 2.2;
    b.vx *= Math.max(0, 1 - frac * visc * dt); b.vy *= Math.max(0, 1 - frac * visc * dt);
    return frac;
  }

  // ---------- Particules / messages / événements ----------
  function part(x, y, color, n = 6, spd = 80, life = 0.6, size = 3, grav = 0, type = 'dot') {
    for (let i = 0; i < n; i++) {
      const a = Math.random() * TAU, s = spd * (0.3 + Math.random() * 0.7);
      st.parts.push({ x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s - spd * 0.2, life, max: life, color, size: size * (0.6 + Math.random() * 0.8), grav, type });
    }
    if (st.parts.length > 1400) st.parts.splice(0, st.parts.length - 1400);
  }
  // éclatement visuel d'un élément
  function fxBurst(core, x, y, rad, lg = 0) {
    const C = colorOf(core), n = Math.round(8 + rad / 7);
    const P2 = (col, k, spd, life, size, grav, type) => part(x, y, col, Math.round(n * k), spd, life, size, grav, type);
    switch (core) {
      case 'feu': { const b0 = st.parts.length; P2(lg >= 2 ? '#5a90e0' : lg ? '#f6e0a0' : '#f08a30', 1 + lg * 0.4, 70 + rad, 0.6, 3.2, -260, 'flamme'); if (lg) { for (let i = b0; i < st.parts.length; i++) st.parts[i].chaud = lg; P2(lg >= 2 ? '#8ab8f0' : '#fff0b0', 0.6, 40, 0.5, 6, 0, 'glow'); } } P2('#6e6660', 0.4, 40, 1.2, 4, -60, 'fumee'); P2('#f0c060', 0.5, 160 + rad, 0.5, 2, 200, 'etincelle'); break;
      case 'eau': P2('#5f9ad8', 1.4, 160 + rad * 1.2, 0.8, 2.2, 700, 'goutte'); P2('#bfe0ff', 0.4, 60, 0.4, 4, 0, 'glow'); break;
      case 'froid': P2('#dff0ff', 1, 70 + rad * 0.6, 1.2, 3, 40, 'flocon'); P2('#bfe0ff', 0.5, 40, 0.5, 5, 0, 'glow'); break;
      case 'foudre': P2('#fff2a0', 1.4, 320 + rad * 2, 0.35, 2, 0, 'etincelle'); for (let k = 0; k < 3; k++) { const a = Math.random() * TAU; st.sp.push({ k: 'zap', pts: FX.eclairPts(x, y, x + Math.cos(a) * rad * 1.2, y + Math.sin(a) * rad * 1.2, 0.3), life: 0.18, max: 0.18, color: lg >= 2 ? '#b070e0' : null }); } break;
      case 'terre': case 'metal': P2(core === 'metal' ? '#9aa4ac' : '#a3844f', 1, 140 + rad, 0.9, 3, 900, 'eclat'); P2('#a3844f', 0.5, 40, 1, 5, -30, 'fumee'); break;
      case 'vent': P2('#bfe8e8', 1, 220 + rad, 0.5, 2, 0, 'vent'); break;
      case 'lumiere': P2('#ffe7a0', 1, 120 + rad, 0.7, 4, -20, 'glow'); P2('#fff6d8', 0.7, 200 + rad, 0.45, 1.8, 0, 'etincelle'); break;
      case 'ombre': P2('#3a2f4a', 1, 50 + rad * 0.5, 1.3, 5, -50, 'fumee'); P2('#8a6ab8', 0.4, 60, 0.7, 3, 0, 'glow'); break;
      case 'vie': P2('#6a9a45', 1, 90 + rad, 1.1, 3, 80, 'feuille'); P2('#a0e070', 0.5, 50, 0.7, 4, -40, 'glow'); break;
      case 'acide': P2('#9ccf3a', 1, 120 + rad, 0.8, 2, 700, 'goutte'); P2('#8fbf2a', 0.6, 30, 1.2, 4, -50, 'fumee'); break;
      case 'gravite': for (let i = 0; i < n; i++) { const a = Math.random() * TAU, rr = rad * (0.8 + Math.random() * 0.6); st.parts.push({ x: x + Math.cos(a) * rr, y: y + Math.sin(a) * rr, vx: -Math.cos(a) * rr * 1.6, vy: -Math.sin(a) * rr * 1.6, life: 0.55, max: 0.55, color: '#a090e0', size: 3, grav: 0, type: 'glow' }); } break;
      case 'son': for (let k = 1; k <= 3; k++) st.sp.push({ k: 'ring', core, x, y, r: rad * (0.5 + k * 0.4), life: 0.3 + k * 0.12, max: 0.3 + k * 0.12, color: C }); break;
      default: P2(C, 1, 60 + rad, 0.7, 3.5, 0, 'glow'); P2(C, 0.5, 140 + rad, 0.45, 1.8, 0, 'etincelle');
    }
  }
  function msg(s, kind) { if (game) game.toast(s, kind); }
  function evt(n, d) { if (game) game.progress.event(n, d); }
  function inView(x, y) { return x > st.cam.x - 40 && x < st.cam.x + VW + 40 && y > st.cam.y - 40 && y < st.cam.y + VH + 40; }
  function onSimEvent(kind, x, y) {
    if (!st) return;
    if (kind === 'brule') { evt('brule'); return; }
    if (kind === 'effondrement') { if (inView(x, y)) { Son.sfx('burst', 'terre'); part(x, y, '#8a7a5a', 10, 50, 0.6, 2, 100); if (time - (st.effT || -9) > 5) { st.effT = time; msg('Ça s\'effondre !'); } } evt('effondrement'); }
    if (kind === 'eboulement') { if (inView(x, y)) { st.shake = Math.max(st.shake, 0.35); Son.sfx('burst', 'terre'); part(x, y, '#8a7a5a', 18, 140, 0.7, 3, 400); } }
    if (kind === 'explosion') {
      const R = 90;
      const souffle = (b, dmg) => { const bx = b.x + b.w / 2, by = b.y + b.h / 2; const dx = bx - x, dy = by - y; const d = Math.hypot(dx, dy) || 1; if (d > R) return false; const f = 1 - d / R; b.vx += dx / d * 700 * f; b.vy += dy / d * 600 * f - 200 * f; return f; };
      for (const c of st.crs) if (c.hp > 0) { const f = souffle(c); if (f) { hurt(c, 3 * f); c.sta.stun = Math.max(c.sta.stun, 1.5); } }
      for (const o of st.objs) if (o.dyn && !o.carried && !o.mort) { const f = souffle(o); if (f && o.t === 'caisse') { o.hp -= 2 * f; if (o.hp <= 0) o.mort = true; } if (f && o.t === 'rocher' && f > 0.4) { o.mort = true; dropPickup('poussiere', o.x + o.w / 2, o.y); } }
      const p = st.p; const f = souffle(p); if (f && p.sta.stone <= 0 && p.sta.armure <= 0) { p.hp -= 3 * f; msg('BOUM !', 'warn'); }
      if (inView(x, y)) { st.shake = 0.5; st.flash = 0.06; Son.sfx('burst', 'feu'); part(x, y, '#e8842a', 24, 220, 0.7, 4, 200); }
    }
    if (!inView(x, y)) return;
    const t = st.obsT[kind] || -9;
    if (time - t < (kind === 'incendie' ? 3 : 0.8)) return;
    st.obsT[kind] = time;
    game.observe(kind);
  }

  // ---------- Lumières ----------
  function lights() {
    const ls = Sim.lights(st.cam, VW, VH);
    const p = st.p;
    ls.push({ x: p.x + p.w / 2, y: p.y + p.h / 2, r: p.sta.lumiere > 0 ? 320 : 130 });
    for (const l of PH.lumieres()) ls.push(l);
    for (const c of st.crs) if (c.t === 'familier' && c.hp > 0) { const F = DATA.FAMILIERS[c.espece]; if (F && F.lum) ls.push({ x: c.x + c.w / 2, y: c.y + c.h / 2, r: F.lum }); }
    for (const o of st.objs) {
      if (o.t === 'torche' && o.lit) ls.push({ x: o.x + o.w / 2, y: o.y + 6, r: 230 });
      if (o.burning > 0) ls.push({ x: o.x + o.w / 2, y: o.y + o.h / 2, r: 130 });
      if (o.t === 'brasier' && o.feu > 0) ls.push({ x: o.x + o.w / 2, y: o.y, r: 200 });
      if (o.t === 'lampe' && o.charge > 0) ls.push({ x: o.x + o.w / 2, y: o.y + 12, r: 180 });
      if (o.t === 'coffre' && !o.ouvert) ls.push({ x: o.x + o.w / 2, y: o.y + 10, r: 40 });
      if (o.t === 'rune' && o.revele > 0) ls.push({ x: o.x + o.w / 2, y: o.y + o.h / 2, r: 60 * o.revele });
    }
    for (const c of st.crs) { if (c.t === 'follet' && c.hp > 0) ls.push({ x: c.x + c.w / 2, y: c.y + c.h / 2, r: 110 }); else if (c.hp > 0 && DATA.ESPECES[c.t] && DATA.ESPECES[c.t].lumineux) ls.push({ x: c.x + c.w / 2, y: c.y + c.h / 2, r: 70 }); else if (c.t === 'familier' && c.hp > 0) ls.push({ x: c.x + c.w / 2, y: c.y + c.h / 2, r: 90 }); }
    for (const s of st.sp) {
      if (s.k === 'field' && (s.core === 'lumiere' || s.core === 'feu')) ls.push({ x: s.x, y: s.y, r: s.r * (s.core === 'lumiere' ? 2.2 : 1.4) });
      if (s.k === 'proj' && (s.core === 'lumiere' || s.core === 'feu' || s.core === 'foudre')) ls.push({ x: s.x, y: s.y, r: s.core === 'lumiere' ? 160 : 80 });
      if (s.k === 'ring' && s.core === 'lumiere') ls.push({ x: s.x, y: s.y, r: s.r * 2 });
      if (s.k === 'beam') ls.push({ x: (s.x1 + s.x2) / 2, y: (s.y1 + s.y2) / 2, r: 120 });
    }
    for (const e of st.eclairs) ls.push({ x: e.x, y: e.y1, r: 400 * e.life / 0.35 });
    return ls;
  }

  // ---------- Effets sur la grille ----------
  function gridEffect(core, cx, cy, rad, prm, burst, k) { return gridEffectOn(Sim, core, cx, cy, rad, prm, burst, k); }
  function gridEffectOn(Sim, core, cx, cy, rad, prm, burst, k) {
    const lgN = prm.lg ? prm.lg[core] || 0 : 0;
    if (lgN) prm = { ...prm, power: (prm.power || 1) * (1 + 0.3 * lgN) };
    const power = prm.power || 1;
    const pr = burst ? Math.min(1, 0.8 * power) : Math.min(1, 0.4 * power * k);
    const pcell = (b) => Sim === MainSim && st ? (U.rectsOverlap(b, st.p) || st.crs.some((c) => c.hp > 0 && U.rectsOverlap(b, c))) : false;
    let cap = Math.round(40 * power * (prm.size || 1));
    const cellRect = (x, y) => ({ x: x * CS, y: y * CS, w: CS, h: CS });
    const towards = (x, y, sign) => { // index de la cellule voisine vers (sign=+1) ou à l'opposé (sign=-1) du centre
      const dx = cx - (x + 0.5) * CS, dy = cy - (y + 0.5) * CS;
      const ax = Math.abs(dx), ay = Math.abs(dy);
      let nx = x, ny = y;
      if (ax > ay) nx += Math.sign(dx) * sign; else ny += Math.sign(dy) * sign;
      return [nx, ny];
    };
    const dC = (x, y) => dist(cx, cy, (x + 0.5) * CS, (y + 0.5) * CS);
    // langages : chaque élément a ses mots
    const feuLg = (x, y, i, m) => {
      const r = Math.random();
      if (m === M.GLACE || m === M.NEIGE) { Sim.set(x, y, r < 0.3 ? M.VAPEUR : M.EAU, 40); return true; }
      if (m === M.SABLE) { if (r < pr * 0.3 * lgN) Sim.set(x, y, M.VERRE); return true; }
      if (m === M.EAU) { if (r < pr * 0.4 * lgN) Sim.set(x, y, M.VAPEUR, 50); return true; }
      if (lgN >= 2 && dC(x, y) < rad * 0.75 && (m === M.PIERRE || m === M.TERRE || m === M.METAL || m === M.VERRE || m === M.CRISTAL || m === M.SEL || m === M.OBSIDIENNE)) {
        if (r < pr * (m === M.OBSIDIENNE ? 0.05 : m === M.METAL ? 0.2 : 0.3)) { Sim.set(x, y, M.LAVE); if (r < 0.02 && Sim === MainSim) onSimEvent('magma', (x + 0.5) * CS, (y + 0.5) * CS); }
        return true;
      }
      return false;
    };
    const eauLg = (x, y, i, m) => {
      if (dC(x, y) > rad * 0.8) return false; const r = Math.random();
      if (m === M.TERRE || m === M.SABLE || m === M.BOUE || m === M.NEIGE || m === M.CENDRE || m === M.POUDRE || m === M.SEL || m === M.HERBE || m === M.MOUSSE) { if (r < pr * 0.55) Sim.set(x, y, r < pr * 0.15 ? M.EAU : M.AIR); return true; }
      if (lgN >= 2 && (m === M.BOIS || m === M.PIERRE || m === M.GLACE || m === M.PLANTE)) { if (r < pr * (m === M.PIERRE ? 0.12 : 0.3)) Sim.set(x, y, M.AIR); return true; }
      return false;
    };
    const froidLg = (x, y, i, m) => {
      const r = Math.random();
      if (m === M.LAVE) { Sim.set(x, y, M.OBSIDIENNE); return true; }
      if (m === M.EAU) { Sim.set(x, y, M.GLACE); return true; }
      if (lgN >= 2) {
        if (m === M.ACIDE) { if (r < pr) Sim.set(x, y, M.CRISTAL); return true; }
        if (m === M.SAUMURE) { Sim.set(x, y, r < 0.5 ? M.SEL : M.GLACE); return true; }
        if (m === M.VAPEUR || m === M.FUMEE) { Sim.set(x, y, M.NEIGE); return true; }
        if (m === M.AIR && burst && r < 0.22 && dC(x, y) < rad * 0.8 && !pcell(cellRect(x, y))) { Sim.set(x, y, M.NEIGE); return true; }
      }
      return false;
    };
    const arbre = () => {
      const gx = Math.floor(cx / CS); let gy = Math.floor(cy / CS);
      for (let t = 0; t < 40 && gy < Sim.H - 1 && !P[Sim.get(gx, gy + 1)].solid; t++) gy++;
      if (gy >= Sim.H - 1) return;
      const h = 10 + ((Math.random() * 6) | 0);
      for (let q = 1; q <= h; q++) for (const xx of [gx, gx + 1]) { const m = Sim.get(xx, gy + 1 - q); if ((m === M.AIR || m === M.HERBE || m === M.PLANTE) && !pcell(cellRect(xx, gy + 1 - q))) Sim.set(xx, gy + 1 - q, M.BOIS); }
      const R2 = 5; for (let yy = -R2; yy <= R2; yy++) for (let xx = -R2 - 1; xx <= R2 + 1; xx++) { if (xx * xx * 0.7 + yy * yy > R2 * R2) continue; const X = gx + xx, Y = gy - h + yy; if (Sim.get(X, Y) === M.AIR && Math.random() < 0.85 && !pcell(cellRect(X, Y))) Sim.set(X, Y, M.PLANTE); }
      if (Sim === MainSim) { evt('pousse'); msg('Un arbre jaillit du sol !'); }
    };
    switch (core) {
      case 'feu':
        Sim.forRadius(cx, cy, rad, (x, y, i, m) => {
          const q = P[m]; const r = Math.random();
          if (lgN && feuLg(x, y, i, m)) return;
          if ((m === M.BOIS || m === M.PLANTE || m === M.HERBE) && Sim.aux[i] === 0) { if (r < pr * q.flam * 10) { Sim.aux[i] = q.burn; Sim.touch(i); } }
          else if (m === M.HUILE || m === M.SEVE) { if (r < pr) Sim.set(x, y, M.FEU, 30); }
          else if (m === M.EAU) { if (r < pr * 0.25) { Sim.set(x, y, M.VAPEUR, 50); } }
          else if (m === M.GLACE || m === M.NEIGE) { if (r < pr * 0.8) { Sim.set(x, y, M.EAU); } }
          else if (m === M.SABLE && power >= 1.6) { if (r < pr * 0.15) Sim.set(x, y, M.VERRE); }
          else if (m === M.AIR && burst) { const d = dist(cx, cy, (x + 0.5) * CS, (y + 0.5) * CS); if (d < rad * 0.6 && r < 0.35) { if (lgN) Sim.setFeu(x, y, 25 + (Math.random() * 20) | 0, lgN); else Sim.set(x, y, M.FEU, 15 + (Math.random() * 15) | 0); } }
        });
        break;
      case 'eau':
        Sim.forRadius(cx, cy, rad, (x, y, i, m) => {
          const r = Math.random();
          if (lgN && burst && eauLg(x, y, i, m)) return;
          if (m === M.AIR) { const d = dist(cx, cy, (x + 0.5) * CS, (y + 0.5) * CS); if (d < rad * 0.75 && cap > 0 && r < pr * 0.6 && !pcell(cellRect(x, y))) { Sim.set(x, y, M.EAU); cap--; } }
          else if (m === M.FEU) Sim.set(x, y, M.VAPEUR, 30);
          else if ((m === M.BOIS || m === M.PLANTE || m === M.HERBE) && Sim.aux[i] > 0) { Sim.aux[i] = 0; Sim.touch(i); }
          else if (m === M.LAVE) { if (r < pr) Sim.set(x, y, M.OBSIDIENNE); }
          else if (m === M.ACIDE) { if (r < pr * 0.4) Sim.set(x, y, M.EAU); }
          else if (m === M.TERRE && burst && r < pr * 0.12) Sim.set(x, y, M.BOUE, 160);
          else if (m === M.POUDRE && r < pr * 0.6) Sim.set(x, y, M.CENDRE);
        });
        break;
      case 'vent':
        Sim.forRadius(cx, cy, rad, (x, y, i, m) => {
          const q = P[m]; if (m === M.AIR) return;
          if (m === M.FEU) { if (Math.random() < pr * 0.7) Sim.set(x, y, M.AIR); return; }
          if (lgN && (q.gas || q.powder || (q.liquid && m !== M.LAVE))) { if (Math.random() < pr * 0.7 && y > 0 && Sim.get(x, y - 1) === M.AIR) Sim.swap(i, (y - 1) * Sim.W + x); return; }
          if (q.gas || q.powder || (q.liquid && m !== M.LAVE)) { if (Math.random() < pr * 0.6) { const [nx, ny] = towards(x, y, -1); if (Sim.get(nx, ny) === M.AIR) Sim.swap(i, ny * Sim.W + nx); } }
        });
        break;
      case 'terre':
        if (!burst) break;
        // un mur reste debout ; ailleurs la terre surgit en tas et tombe (elle se tasse au repos)
        Sim.forRadius(cx, cy, rad * (prm.mur ? 0.85 : 0.5), (x, y, i, m) => {
          const q = P[m]; if (q.solid) return;
          if (Math.random() < pr && !pcell(cellRect(x, y))) Sim.set(x, y, lgN >= 2 ? M.CRISTAL : prm.persist > 0 || lgN ? M.PIERRE : prm.mur ? M.TERRE : M.MEUBLE);
        });
        break;
      case 'vie': {
        const prv = Math.min(1, pr * (1 + lgN));
        Sim.forRadius(cx, cy, rad, (x, y, i, m) => {
          const r = Math.random();
          if (m === M.TERRE && Sim.get(x, y - 1) === M.AIR) { if (r < prv * 0.5) { Sim.set(x, y - 1, M.HERBE); evt('pousse'); } }
          else if (m === M.PLANTE && Sim.get(x, y - 1) === M.AIR) { if (r < prv * 0.5) { Sim.set(x, y - 1, M.PLANTE); evt('pousse'); } }
          else if (m === M.HERBE && Sim.get(x, y - 1) === M.AIR) { if (r < prv * 0.25) { Sim.set(x, y, M.PLANTE); evt('pousse'); } }
          else if (m === M.CENDRE) { if (r < prv * 0.4) Sim.set(x, y, M.TERRE); }
          if ((m === M.BOIS || m === M.PLANTE || m === M.HERBE) && Sim.aux[i] > 0) { Sim.aux[i] = 0; Sim.touch(i); }
        });
        if (lgN >= 2 && burst) arbre();
        break;
      }
      case 'force':
        Sim.forRadius(cx, cy, rad, (x, y, i, m) => {
          const q = P[m]; if (m === M.AIR || q.solid && !q.powder) return;
          if (Math.random() < pr * 0.6) { const [nx, ny] = towards(x, y, 1); if (Sim.get(nx, ny) === M.AIR) Sim.swap(i, ny * Sim.W + nx); }
        });
        break;
      case 'froid':
        Sim.forRadius(cx, cy, rad, (x, y, i, m) => {
          const r = Math.random();
          if (lgN && froidLg(x, y, i, m)) return;
          if (m === M.EAU) { if (r < pr * 0.9) { Sim.set(x, y, M.GLACE); if (r < 0.02) onSimEvent('gel', (x + 0.5) * CS, (y + 0.5) * CS); } }
          else if (m === M.LAVE) { if (r < pr * 0.7) Sim.set(x, y, M.OBSIDIENNE); }
          else if (m === M.VAPEUR) Sim.set(x, y, M.EAU);
          else if (m === M.FEU) Sim.set(x, y, M.AIR);
          else if ((m === M.BOIS || m === M.PLANTE || m === M.HERBE) && Sim.aux[i] > 0) { Sim.aux[i] = 0; Sim.touch(i); }
          else if (m === M.AIR && burst) { const d = dist(cx, cy, (x + 0.5) * CS, (y + 0.5) * CS); if (d < rad * 0.5 && r < 0.12 && !pcell(cellRect(x, y))) Sim.set(x, y, M.NEIGE); }
        });
        break;
      case 'foudre':
        Sim.forRadius(cx, cy, rad, (x, y, i, m) => {
          const q = P[m]; const r = Math.random();
          if (q.cond) { Sim.elec[i] = Math.max(Sim.elec[i], 50); Sim.touch(i); }
          else if (m === M.HUILE) { if (r < pr * 0.5) Sim.set(x, y, M.FEU, 30); }
          else if (m === M.SABLE) { if (r < pr * 0.08) Sim.set(x, y, M.VERRE); }
          else if ((m === M.BOIS || m === M.PLANTE || m === M.HERBE) && Sim.aux[i] === 0) { if (r < pr * q.flam * 3) { Sim.aux[i] = q.burn; Sim.touch(i); } }
        });
        break;
      case 'acide':
        Sim.forRadius(cx, cy, rad, (x, y, i, m) => {
          const q = P[m]; const r = Math.random();
          if (m === M.AIR) { const d = dist(cx, cy, (x + 0.5) * CS, (y + 0.5) * CS); if (d < rad * 0.7 && cap > 0 && r < pr * 0.5 && !pcell(cellRect(x, y))) { Sim.set(x, y, M.ACIDE); cap--; } }
          else if (lgN >= 2 && (m === M.OBSIDIENNE || m === M.METAL || m === M.VERRE || m === M.CRISTAL)) { if (r < pr * 0.2) Sim.set(x, y, M.FUMEE, 20); }
          else if (q.corrode > 0 && !q.liquid) { if (r < pr * q.corrode * 3 * (lgN ? 3 : 1)) { Sim.set(x, y, r < 0.5 ? M.FUMEE : M.AIR, 20); if (r < 0.03) onSimEvent('corrosion', (x + 0.5) * CS, (y + 0.5) * CS); } }
        });
        break;
      case 'lumiere':
        if (!lgN) break;
        Sim.forRadius(cx, cy, rad * 0.6, (x, y, i, m) => {
          const q = P[m], r = Math.random();
          if (FLAM(m) && Sim.aux[i] === 0) { if (r < pr * 0.25 * lgN) { Sim.aux[i] = q.burn; Sim.touch(i); } }
          else if (lgN >= 2 && m === M.SABLE) { if (r < pr * 0.2) Sim.set(x, y, M.VERRE); }
          else if (lgN >= 2 && (m === M.NEIGE || m === M.GLACE)) { if (r < pr * 0.5) Sim.set(x, y, M.EAU); }
        });
        break;
      case 'gravite':
        if (Sim !== MainSim) Sim.forRadius(cx, cy, rad, (x, y, i, m) => { const q = P[m]; if (m === M.AIR || (q.solid && !q.powder)) return; if (Math.random() < pr * 0.5 && y > 0 && Sim.get(x, y - 1) === M.AIR) Sim.swap(i, (y - 1) * Sim.W + x); });
        break;
      case 'temps':
        Sim.forRadius(cx, cy, rad, (x, y, i, m) => {
          const r = Math.random();
          if (FLAM(m) && Sim.aux[i] > 0) { Sim.aux[i] = 1; Sim.touch(i); }
          else if (m === M.PLANTE && Sim.get(x, y - 1) === M.AIR) { if (r < pr * 0.6) Sim.set(x, y - 1, M.PLANTE); }
          else if (m === M.HERBE && Sim.get(x, y - 1) === M.AIR) { if (r < pr * 0.3) Sim.set(x, y, M.PLANTE); }
          else if (m === M.LAVE) { if (r < pr * 0.8) Sim.set(x, y, M.OBSIDIENNE); }
          else if (m === M.GLACE || m === M.NEIGE) { if (r < pr * 0.6) Sim.set(x, y, M.EAU); }
          else if (m === M.FEU || m === M.VAPEUR || m === M.FUMEE) Sim.set(x, y, M.AIR);
          else if (m === M.CENDRE) { if (r < pr * 0.5) Sim.set(x, y, M.TERRE); }
        });
        break;
      case 'ralentir': break;
      case 'fumee': if (Sim !== MainSim) Sim.forRadius(cx, cy, rad * 0.9, (x, y, i, m) => { if (m === M.AIR && Math.random() < 0.5) Sim.set(x, y, M.FUMEE, 160); else if (m === M.FEU) Sim.set(x, y, M.FUMEE, 80); }); break;
      case 'explosion': if (Sim !== MainSim) Sim.forRadius(cx, cy, rad * 0.6, (x, y, i, m) => { if (m && m !== M.OBSIDIENNE && m !== M.METAL && Math.random() < 0.85) Sim.set(x, y, Math.random() < 0.25 ? M.FEU : M.AIR, 20); }); break;
      case 'courant': if (Sim !== MainSim) { Sim.forRadius(cx, cy, rad * 0.6, (x, y, i, m) => { if (m === M.AIR && Math.random() < 0.4) Sim.set(x, y, M.EAU); }); for (let k2 = 0; k2 < 6; k2++) Sim.forRadius(cx, cy, rad * 1.2, (x, y, i, m) => { if (P[m].liquid && m !== M.LAVE && Sim.get(x + 2, y) === M.AIR && Math.random() < 0.7) Sim.swap(i, y * Sim.W + x + 2); }); } break;
      case 'seisme': if (Sim !== MainSim) Sim.forRadius(cx, cy, rad * 1.5, (x, y, i, m) => { const r = Math.random(); if (m === M.VERRE && r < 0.5) Sim.set(x, y, M.SABLE); else if (m === M.GLACE && r < 0.3) Sim.set(x, y, M.NEIGE); else if (m === M.PIERRE && r < 0.05 && Sim.get(x, y + 1) === M.AIR) Sim.set(x, y, M.SABLE); }); break;
      case 'repulsion': return gridEffectOn(Sim, 'vent', cx, cy, rad, prm, burst, k);
      case 'transmutation': {
        const MAP = { [M.PIERRE]: M.SABLE, [M.SABLE]: M.TERRE, [M.TERRE]: M.PIERRE, [M.BOIS]: M.PIERRE, [M.EAU]: M.HUILE, [M.HUILE]: M.EAU, [M.GLACE]: M.VERRE, [M.VERRE]: M.SABLE, [M.CENDRE]: M.TERRE, [M.NEIGE]: M.SABLE, [M.METAL]: M.OBSIDIENNE, [M.OBSIDIENNE]: M.METAL, [M.PLANTE]: M.BOIS, [M.SEVE]: M.ACIDE, [M.ACIDE]: M.SEVE };
        Sim.forRadius(cx, cy, rad, (x, y, i, m) => { const t = MAP[m]; if (t !== undefined && Math.random() < pr * 0.9) Sim.set(x, y, t); });
        break;
      }
      case 'son':
        Sim.forRadius(cx, cy, rad, (x, y, i, m) => {
          const q = P[m];
          if (m === M.VERRE) { if (Math.random() < pr) { Sim.set(x, y, M.SABLE); if (Math.random() < 0.05) onSimEvent('verre_brise', (x + 0.5) * CS, (y + 0.5) * CS); } }
          else if (q.gas || q.powder) { if (Math.random() < pr * 0.4) { const [nx, ny] = towards(x, y, -1); if (Sim.get(nx, ny) === M.AIR) Sim.swap(i, ny * Sim.W + nx); } }
        });
        break;
      case 'silence': break;
      case 'metal':
        if (!burst) break;
        Sim.forRadius(cx, cy, rad * 0.7, (x, y, i, m) => { const q = P[m]; if (q.solid) return; if (Math.random() < pr && !pcell(cellRect(x, y))) Sim.set(x, y, M.METAL); });
        break;
      case 'rouille':
        Sim.forRadius(cx, cy, rad, (x, y, i, m) => { if (m === M.METAL && Math.random() < pr * 0.6) Sim.set(x, y, Math.random() < 0.5 ? M.SABLE : M.CENDRE); });
        break;
      case 'creuser':
        Sim.forRadius(cx, cy, rad, (x, y, i, m) => { const q = P[m]; if (!q.solid || m === M.OBSIDIENNE) return; if (Math.random() < pr * (m === M.METAL ? 0.2 : 0.9) && !pcell(cellRect(x, y))) Sim.set(x, y, M.AIR); });
        break;
      case 'fanaison':
        Sim.forRadius(cx, cy, rad, (x, y, i, m) => { if ((m === M.PLANTE || m === M.HERBE) && Math.random() < pr * 0.8) Sim.set(x, y, Math.random() < 0.5 ? M.CENDRE : M.AIR); else if (m === M.BOIS && Math.random() < pr * 0.3) Sim.set(x, y, M.CENDRE); });
        break;
      case 'neutraliser':
        Sim.forRadius(cx, cy, rad, (x, y, i, m) => {
          if (m === M.ACIDE) Sim.set(x, y, M.EAU); else if (m === M.LAVE && Math.random() < pr) Sim.set(x, y, M.OBSIDIENNE); else if (m === M.FEU) Sim.set(x, y, M.AIR);
          else if (FLAM(m) && Sim.aux[i] > 0) { Sim.aux[i] = 0; Sim.touch(i); }
          if (Sim.elec[i] > 0) { Sim.elec[i] = 0; Sim.touch(i); }
        });
        break;
      case 'poids':
        Sim.forRadius(cx, cy, rad, (x, y, i, m) => { const q = P[m]; if (q.gas) Sim.set(x, y, M.AIR); else if ((q.liquid || q.powder) && Math.random() < pr * 0.5 && Sim.get(x, y + 1) === M.AIR) Sim.swap(i, (y + 1) * Sim.W + x); });
        break;
      case 'secheresse':
        Sim.forRadius(cx, cy, rad, (x, y, i, m) => {
          const r = Math.random();
          if (m === M.EAU && cap > 0) { if (r < pr * 0.7) { Sim.set(x, y, r < 0.1 ? M.VAPEUR : M.AIR, 20); cap--; } }
          else if (m === M.PLANTE) { if (r < pr * 0.3) Sim.set(x, y, M.HERBE); }
          else if (m === M.HERBE) { if (r < pr * 0.3) Sim.set(x, y, M.CENDRE); }
          else if (m === M.TERRE && Sim.get(x, y - 1) === M.AIR) { if (r < pr * 0.2) Sim.set(x, y, M.SABLE); }
        });
        break;
    }
  }

  // ---------- Effets sur les entités ----------
  // mode : 'burst' (instantané) ou un nombre dt (continu)
  // ---------- Effets nés des aspects ----------
  function effetDerive(core, cx, cy, rad, prm, burst, k, mode, opts) {
    const power = prm.power || 1, dur = prm.duration || 1;
    const dans = (b) => U.circleRect(cx, cy, rad, b);
    switch (core) {
      case 'esprit': {
        if (!burst) return true;
        let best = null, bd = 1e9; for (const c of st.crs) if (c.hp > 0 && c.t !== 'familier' && !c.controlled && dans(c)) { const d = dist(cx, cy, c.x + c.w / 2, c.y + c.h / 2); if (d < bd) { bd = d; best = c; } }
        if (best) { if (st.control) releaseControl(); controlCreature(best, 12 * dur); }
        fxBurst('esprit', cx, cy, rad); return true;
      }
      case 'lecture': {
        if (!burst) return true;
        let n = 0;
        for (const c of st.crs) {
          if (c.hp <= 0 || c.t === 'familier' || !dans(c)) continue; const sp = DATA.ESPECES[c.t]; if (!sp) continue;
          evt('bestiaire', { t: c.t, k: 'aime' }); evt('bestiaire', { t: c.t, k: 'craint' }); c.affT = 6;
          st.sp.push({ k: 'label', txt: 'aime ' + DATA.nomEffet(sp.aime).toLowerCase() + ' · craint ' + DATA.nomEffet(sp.craint).toLowerCase() + (c.sta.tame ? ' · apprivoisé(e)' : ' · ' + Math.round(c.aff || 0) + ' %'), x: c.x + c.w / 2, y: c.y - 24, life: 3.5, petit: true });
          part(c.x + c.w / 2, c.y, '#b08ad8', 8, 40, 0.8, 2, -30, 'glow'); n++;
        }
        if (!n) msg('Aucun esprit à lire ici.');
        fxBurst('esprit', cx, cy, rad); return true;
      }
      case 'revelation': {
        if (!burst) return true;
        const R4 = rad * 5;
        game.explorer((cx - R4) / CS, (cy - R4) / CS, R4 * 2 / CS, R4 * 2 / CS);
        for (const o of st.objs) if (o.t === 'rune' && dist(cx, cy, o.x, o.y) < R4) o.revele = 1;
        st.revelation = { x: cx, y: cy, r: R4, t: 12 * (prm.duration || 1), max: 12 * (prm.duration || 1) };
        st.flash = 0.05; fxBurst('lumiere', cx, cy, rad * 2); Son.sfx('burst', 'lumiere');
        msg('La lumière traverse la roche : ce qui est caché luit un moment.');
        return true;
      }
      case 'peur':
        for (const c of st.crs) if (c.hp > 0 && c.t !== 'familier' && !c.sta.tame && dans(c)) { c.fuite = { x: cx, y: cy, t: 6 * dur }; c.sta.sleep = 0; c.dort = false; c.curieux = null; if (burst) part(c.x + c.w / 2, c.y - 6, '#8a5aa8', 5, 50, 0.6, 2, -40, 'glow'); }
        if (burst) { fxBurst('ombre', cx, cy, rad); Son.sfx('burst', 'ombre'); } return true;
      case 'repulsion': {
        if (!opts.noGrid) gridEffect('vent', cx, cy, rad, prm, burst, k);
        const pousse = (b, m = 1) => { const dx = b.x + b.w / 2 - cx, dy = b.y + b.h / 2 - cy, d = Math.hypot(dx, dy) || 1; b.vx += dx / d * 650 * power * k * m; b.vy += (dy / d * 450 - 120) * power * k * m; b.onGround = false; };
        for (const c of st.crs) if (c.hp > 0 && !c.carried && dans(c)) pousse(c, c.t === 'golem' ? 0.5 : 1);
        for (const o of st.objs) if (o.dyn && !o.carried && !o.mort && dans(o)) pousse(o);
        if (!opts.noPlayer && dans(st.p)) pousse(st.p, 0.6);
        if (burst) { fxBurst('gravite', cx, cy, rad); Son.sfx('burst', 'force'); } return true;
      }
      case 'fumee':
        if (!opts.noGrid) Sim.forRadius(cx, cy, rad * (burst ? 0.9 : 0.5), (x, y, i, m) => { if (m === M.AIR && Math.random() < (burst ? 0.55 : 0.1 * k)) Sim.set(x, y, M.FUMEE, 140 + (Math.random() * 110) | 0); else if (FLAM(m) && Sim.aux[i] > 0 && Math.random() < 0.3) { Sim.aux[i] = 0; Sim.touch(i); } else if (m === M.FEU && Math.random() < 0.5) Sim.set(x, y, M.FUMEE, 80); });
        for (const c of st.crs) if (c.hp > 0 && dans(c)) { c.sta.stun = Math.max(c.sta.stun, burst ? 2 * dur : 0.3); c.curieux = null; }
        if (burst) { part(cx, cy, '#6e6660', 18, 60 + rad * 0.5, 1.6, 6, -40, 'fumee'); Son.sfx('burst', 'vent'); } return true;
      case 'explosion': {
        if (!burst) { applyEffect('feu', cx, cy, rad * 0.6, prm, mode, opts); return true; }
        const R2 = rad * 0.5 * Math.sqrt(power);
        if (!opts.noGrid) {
          Sim.forRadius(cx, cy, R2, (x, y, i, m) => { if (!m || m === M.OBSIDIENNE || m === M.METAL || m === M.BULLE) return; if (Math.random() < 0.85) Sim.set(x, y, Math.random() < 0.25 ? M.FEU : M.AIR, 20); });
          Sim.forRadius(cx, cy, rad, (x, y, i, m) => { if (FLAM(m) && Sim.aux[i] === 0 && Math.random() < 0.3) { Sim.aux[i] = P[m].burn; Sim.touch(i); } else if (m === M.POUDRE) Sim.set(x, y, M.FEU, 6); });
        }
        const souffle = (b, f) => { const dx = b.x + b.w / 2 - cx, dy = b.y + b.h / 2 - cy, d = Math.hypot(dx, dy) || 1; if (d > rad * 1.3) return 0; const g = (1 - d / (rad * 1.3)) * f; b.vx += dx / d * 800 * g * power; b.vy += dy / d * 650 * g * power - 250 * g; b.onGround = false; return g; };
        for (const c of st.crs) if (c.hp > 0 && !c.carried) { const g = souffle(c, c.t === 'golem' ? 0.5 : 1); if (g) { hurt(c, 3 * g * power); c.sta.stun = Math.max(c.sta.stun, 1.2); } }
        for (const o of st.objs) if (o.dyn && !o.carried && !o.mort) { const g = souffle(o, 1); if (g && o.t === 'caisse') { o.hp -= 2 * g; if (o.hp <= 0) o.mort = true; } if (g > 0.4 && o.t === 'rocher') { o.mort = true; dropPickup('poussiere', o.x + o.w / 2, o.y); } }
        if (!opts.noPlayer) { const p = st.p; const g = souffle(p, 0.8); if (g && !(p.sta.stone > 0) && !(p.sta.armure > 0)) { p.hp -= 2 * g; msg('BOUM !', 'warn'); } }
        st.shake = Math.max(st.shake || 0, 0.6); st.flash = 0.08; Son.sfx('burst', 'feu');
        fxBurst('feu', cx, cy, rad * 1.4); part(cx, cy, '#5a524c', 20, 120, 1.4, 7, -60, 'fumee'); part(cx, cy, '#f0c060', 30, 400, 0.6, 2, 300, 'etincelle');
        st.sp.push({ k: 'ring', core: 'feu', x: cx, y: cy, r: rad * 1.4, life: 0.5, max: 0.5, color: '#f0a040' });
        game.observe('explosion');
        return true;
      }
      case 'courant': {
        const p = st.p; let dv = opts.dir; if (!dv) { const dx = cx - (p.x + p.w / 2); dv = { x: Math.sign(dx) || 1, y: 0 }; }
        const L2 = Math.hypot(dv.x, dv.y) || 1, ux = dv.x / L2, uy = dv.y / L2;
        if (!opts.noGrid) {
          let n = 0; Sim.forRadius(cx, cy, rad, (x, y, i, m) => { if (P[m].liquid) n++; });
          if (n < 30 && burst) gridEffect('eau', cx, cy, rad * 0.8, { ...prm, power: power * 1.2 }, true, 1);
          for (let pass = 0; pass < (burst ? 6 : 1); pass++) Sim.forRadius(cx, cy, rad * 1.2, (x, y, i, m) => { if (!P[m].liquid || m === M.LAVE || Math.random() > 0.7) return; const nx = x + Math.round(ux * 2), ny = y + Math.round(uy * 2); if (Sim.get(nx, ny) === M.AIR) Sim.swap(i, ny * Sim.W + nx); });
        }
        const emporte = (b, m = 1) => { b.vx += ux * 700 * power * k * m; b.vy += uy * 500 * power * k * m - 60 * k * m; };
        for (const c of st.crs) if (c.hp > 0 && !c.carried && dans(c)) { emporte(c, c.t === 'golem' ? 0.4 : 1); c.sta.wet = 6; c.sta.burn = 0; }
        for (const o of st.objs) if (o.dyn && !o.carried && !o.mort && dans(o)) { emporte(o); o.burning = 0; }
        if (burst) { fxBurst('eau', cx, cy, rad); for (let q = 0; q < 14; q++) st.parts.push({ x: cx - ux * rad * Math.random(), y: cy - uy * rad * Math.random() + (Math.random() - 0.5) * 20, vx: ux * 500, vy: uy * 500, life: 0.5, max: 0.5, color: '#5f9ad8', size: 2.4, grav: 300, type: 'goutte' }); }
        return true;
      }
      case 'seisme': {
        if (!burst) return true;
        const R3 = rad * 1.5; st.shake = Math.max(st.shake || 0, 0.7); Son.sfx('burst', 'terre');
        for (const c of st.crs) if (c.hp > 0 && !c.carried && dist(cx, cy, c.x + c.w / 2, c.y + c.h) < R3) { if (c.onGround) { c.vy -= 320 * power; c.onGround = false; } c.sta.stun = Math.max(c.sta.stun, 1.5 * dur); hurt(c, 0.5 * power); }
        for (const o of st.objs) if (!o.mort && dist(cx, cy, o.x + o.w / 2, o.y + o.h) < R3) { if (o.dyn && !o.carried) { o.vy -= 280; o.vx += (Math.random() - 0.5) * 200; } if (o.t === 'rocher' && power >= 1.2) { o.mort = true; part(o.x + o.w / 2, o.y + o.h / 2, '#8a6b2f', 16, 120, 0.8, 4, 600); dropPickup('poussiere', o.x + o.w / 2, o.y - 10); } }
        if (!opts.noGrid) Sim.forRadius(cx, cy, R3, (x, y, i, m) => { const r = Math.random(); if (m === M.VERRE && r < 0.5) Sim.set(x, y, M.SABLE); else if (m === M.GLACE && r < 0.3) Sim.set(x, y, M.NEIGE); else if (m === M.PIERRE && r < 0.04 * power && Sim.get(x, y + 1) === M.AIR) Sim.set(x, y, M.SABLE); else if (m && (P[m].powder || P[m].liquid)) Sim.touch(i); });
        if (!opts.noPlayer && st.p.onGround && dist(cx, cy, st.p.x, st.p.y + st.p.h) < R3) { st.p.vy -= 200; st.p.onGround = false; }
        for (let q = 0; q < 24; q++) st.parts.push({ x: cx + R3 * (Math.random() * 2 - 1), y: cy + 10, vx: (Math.random() - 0.5) * 80, vy: -120 - Math.random() * 160, life: 0.8, max: 0.8, color: '#a3844f', size: 3, grav: 900, type: 'eclat' });
        st.sp.push({ k: 'ring', core: 'terre', x: cx, y: cy, r: R3, life: 0.6, max: 0.6, color: '#8a6b2f' });
        return true;
      }
      case 'saut': {
        if (!burst) return true;
        const ailleurs = (b) => { for (let t = 0; t < 20; t++) { const a = Math.random() * TAU, d = 120 + Math.random() * 120; const nx = b.x + Math.cos(a) * d, ny = b.y + Math.sin(a) * d * 0.6 - 40; if (!Sim.rectBlocked({ x: nx, y: ny, w: b.w, h: b.h })) { part(b.x + b.w / 2, b.y + b.h / 2, '#4fb0a0', 10, 60, 0.5, 3, 0, 'glow'); b.x = nx; b.y = ny; b.vx = b.vy = 0; part(nx + b.w / 2, ny + b.h / 2, '#4fb0a0', 10, 60, 0.5, 3, 0, 'glow'); return; } } };
        for (const c of st.crs) if (c.hp > 0 && !c.carried && c.t !== 'familier' && dans(c)) ailleurs(c);
        for (const o of st.objs) if (o.dyn && !o.carried && !o.mort && dans(o)) ailleurs(o);
        Son.sfx('cast', 'portail'); fxBurst('portail', cx, cy, rad); return true;
      }
    }
    return false;
  }
  // ---------- Affinité : on gagne une créature avec le temps ----------
  function affinite(c, f) {
    if (c.sta.tame || c.t === 'familier' || c.controlled) return;
    const A = DATA.AFFINITE[c.t] || {}; const sp = DATA.ESPECES[c.t];
    let gain = (A.gain || (sp && !sp.hostile ? 34 : 20)) * f;
    if (A.parJour) {
      const j = st.jour || 0; if (c.affJ !== j) { c.affJ = j; c.affDuJour = 0; }
      const reste = A.parJour - c.affDuJour;
      if (reste <= 0) { if (f >= 1 && (!c.affMsgT || time - c.affMsgT > 6)) { c.affMsgT = time; msg(nomCreature(c.t) + ' en a assez pour aujourd\'hui. Reviens demain.'); } return; }
      gain = Math.min(gain, reste); c.affDuJour += gain;
    }
    c.aff = Math.min(100, (c.aff || 0) + gain); c.affT = 3;
    if (f >= 1) part(c.x + c.w / 2, c.y - 6, '#c45a8a', 3, 30, 0.8, 2.5, -50, 'coeur');
    if (c.aff >= 100) tame(c);
    else if (f >= 1 && (!c.affMsgT || time - c.affMsgT > 4)) { c.affMsgT = time; msg(nomCreature(c.t) + ' te regarde autrement (affinité ' + Math.round(c.aff) + ' %).'); }
  }
  // au plus 24 répétitions vivantes : la plus ancienne s'arrête
  function capRepetitions() { const R = st.sp.filter((q) => q.k === 'repeat' && !q.mort); if (R.length >= 24) R[0].mort = true; }
  // ---------- Champs en forme : la Gravité et le Temps épousent le rectangle d'une Colonne ou d'un Mur ----------
  const CHAMPS = ['gravite', 'poids', 'temps', 'ralentir', 'figer'];
  function champForme(spec, rect, dir) {
    const prm = spec.prm, dur = prm.duration || 1, cx = (rect.x0 + rect.x1) / 2, cy = (rect.y0 + rect.y1) / 2, r = Math.hypot(rect.x1 - rect.x0, rect.y1 - rect.y0) / 2;
    let fait = false;
    for (const core of spec.cores) {
      if (core === 'gravite' || core === 'poids') {
        const [gx, gy] = dir ? snapDir(dir.x, dir.y) : [0, 1];
        const lourd = 1.6 + 1.2 * Math.max(0, ((prm.power || 1) - 1) / 0.6) + ((prm.lg && prm.lg.gravite) || 0) * 0.8;
        if (prm.gInv) addGField(cx, cy, r, -gx, -gy, 1.3, 6 * dur, rect); else addGField(cx, cy, r, gx, gy, core === 'poids' ? lourd + 1 : lourd, 6 * dur, rect);
        fait = true;
      } else if (core === 'temps' || core === 'ralentir' || core === 'figer') {
        const mode = core === 'temps' ? 'vite' : core === 'ralentir' ? 'lent' : 'fige';
        st.sp.push({ k: 'bulle', mode, x: cx, y: cy, r, rect, life: 5 * dur, max: 5 * dur, f: mode === 'vite' ? 5 * (prm.power || 1) : 0.25 }); fait = true;
      }
    }
    if (fait) { Son.sfx('cast', spec.cores[0]); part(cx, cy, spec.color, 14, 80, 0.7, 3, 0, 'glow'); }
    return fait && spec.cores.every((c) => CHAMPS.includes(c));
  }
  // ---------- Matière : l'effet devient solide ----------
  function matiereDe(spec) { for (const c of spec.cores) { const m = DATA.MATIERE[c]; if (m) return M[m]; } return null; }
  function occupe(x, y) { const b = { x: x * CS, y: y * CS, w: CS, h: CS }; return U.rectsOverlap(b, st.p) || st.crs.some((c) => c.hp > 0 && U.rectsOverlap(b, c)); }
  function poserMatiere(m, cb) { let n = 0; cb((x, y) => { const q = Sim.get(x, y); if (m === M.AIR) { if (P[q].solid && q !== M.OBSIDIENNE && q !== M.METAL) { Sim.set(x, y, M.AIR); n++; } return; } if ((q === M.AIR || P[q].gas || (P[q].liquid && !P[m].liquid)) && !occupe(x, y)) { Sim.set(x, y, m, m === M.LAVE ? 0 : 0); if (m === M.METAL && spec0 && spec0.cores.includes('foudre')) { Sim.elec[y * Sim.W + x] = 60; } n++; } }); return n; }
  let spec0 = null;
  function matiereCercle(spec, x, y, r) { const m = matiereDe(spec); if (m == null) return 0; spec0 = spec; return poserMatiere(m, (put) => Sim.forRadius(x, y, r, (cx, cy) => put(cx, cy))); }
  function matiereRect(spec, rect) { const m = matiereDe(spec); if (m == null) return 0; spec0 = spec; return poserMatiere(m, (put) => { for (let y = Math.floor(rect.y0 / CS); y <= Math.floor(rect.y1 / CS); y++) for (let x = Math.floor(rect.x0 / CS); x <= Math.floor(rect.x1 / CS); x++) put(x, y); }); }
  function matiereLigne(spec, x1, y1, x2, y2, ep) { const m = matiereDe(spec); if (m == null) return 0; spec0 = spec; const L2 = Math.hypot(x2 - x1, y2 - y1); return poserMatiere(m, (put) => { for (let t = 0; t <= L2; t += CS * 0.7) { const x = x1 + (x2 - x1) * t / (L2 || 1), y = y1 + (y2 - y1) * t / (L2 || 1); Sim.forRadius(x, y, ep, (cx, cy) => put(cx, cy)); } }); }
  // le rectangle d'un mur : des éclats alignés sur son grand côté
  function murPoints(tx, ty, w, h) {
    const pts = [], rb = Math.max(12, Math.min(w, h) / 2 + 4), vert = h >= w, L = vert ? h : w, n = Math.max(2, Math.ceil(L / (rb * 1.4)));
    for (let k = 0; k < n; k++) { const f = n > 1 ? k / (n - 1) - 0.5 : 0; pts.push({ x: tx + (vert ? 0 : f * (w - rb)), y: ty + (vert ? f * (h - rb) : 0), r: rb }); }
    return pts;
  }
  // ---------- Bulles de temps ----------
  function poserBulle(mode, cx, cy, rad, prm) {
    const dur = prm.duration || 1, r = Math.max(50, rad * 1.1);
    { const bulles = st.sp.filter((q) => q.k === 'bulle' && !q.mort); if (bulles.length >= 8) bulles[0].life = 0.01; }
    st.sp.push({ k: 'bulle', mode, x: cx, y: cy, r, life: 5 * dur * (1 + (prm.persist || 0)), max: 5 * dur * (1 + (prm.persist || 0)), f: mode === 'vite' ? 5 * (prm.power || 1) : 0.25 });
    Son.sfx('cast', 'temps'); part(cx, cy, mode === 'vite' ? '#c8ccd8' : '#8aa0d8', 16, 90, 0.7, 3, 0, 'glow');
  }
  // dt : la durée qui s'écoule dans la bulle à chaque image ; f : facteur
  function vieillir(mode, cx, cy, r, dt, f = 5, rect = null) {
    const dans = (b) => (rect ? U.rectsOverlap({ x: rect.x0, y: rect.y0, w: rect.x1 - rect.x0, h: rect.y1 - rect.y0 }, b) : U.circleRect(cx, cy, r, b));
    const Sim = rect ? Object.assign(Object.create(MainSim), { forRadius: (x, y, rr, cb) => { for (let yy = Math.floor(rect.y0 / CS); yy <= Math.floor(rect.y1 / CS); yy++) for (let xx = Math.floor(rect.x0 / CS); xx <= Math.floor(rect.x1 / CS); xx++) { if (xx < 0 || yy < 0 || xx >= MainSim.W || yy >= MainSim.H) continue; const i = yy * MainSim.W + xx; cb(xx, yy, i, MainSim.mat[i]); } } }) : MainSim;
    if (mode === 'vite') {
      const k = dt * f; // secondes « vécues » en plus
      Sim.forRadius(cx, cy, r, (x, y, i, m) => {
        if (!m) return; const q = Math.random(), haut = Sim.get(x, y - 1) === M.AIR;
        if (FLAM(m) && Sim.aux[i] > 0) { Sim.aux[i] = Math.max(1, Sim.aux[i] - Math.ceil(12 * k)); Sim.touch(i); }
        else if (m === M.FEU) { if (q < 0.25 * k) Sim.set(x, y, M.AIR); }
        else if (m === M.HERBE) { if (haut && q < 0.05 * k) Sim.set(x, y - 1, M.PLANTE); }
        else if (m === M.PLANTE) { if (haut && q < 0.03 * k) Sim.set(x, y - 1, M.PLANTE); else if (q < 0.01 * k && Sim.get(x + 1, y) === M.AIR) Sim.set(x + 1, y, M.PLANTE); }
        else if (m === M.TERRE) { if (haut && q < 0.04 * k) Sim.set(x, y - 1, M.HERBE); }
        else if (m === M.CENDRE) { if (q < 0.05 * k) Sim.set(x, y, M.TERRE); }
        else if (m === M.GLACE || m === M.NEIGE) { if (q < 0.08 * k) Sim.set(x, y, M.EAU); }
        else if (m === M.LAVE) { if (q < 0.06 * k) Sim.set(x, y, M.OBSIDIENNE); }
        else if (m === M.EAU) { if (haut && q < 0.004 * k) Sim.set(x, y, M.VAPEUR, 40); }
        else if (m === M.VAPEUR || m === M.FUMEE) { if (q < 0.2 * k) Sim.set(x, y, M.AIR); }
        else if (m === M.PIERRE) { if (haut && q < 0.004 * k && Sim.get(x, y + 1) !== M.AIR) Sim.set(x, y - 1, M.MOUSSE); }
        else if (m === M.METAL) { if (q < 0.004 * k) Sim.set(x, y, M.SABLE); }
        else if (m === M.BOIS) { if (haut && q < 0.002 * k) Sim.set(x, y - 1, M.MOUSSE); }
      });
      // créatures, objets mobiles, sorts et particules vivent déjà au rythme de la bulle (facteur de temps)
      for (const o of st.objs) {
        if (o.mort || !dans(o)) continue;
        if (o.t === 'graine' && o.stage === 1) { o.gt = (o.gt || 0) + k; if (!o.racine) o.regrow += k; }
        if (o.burning > 0) o.burning = Math.max(0, o.burning - k);
        if (o.t === 'brasier' && o.feu > 0) o.feu = Math.max(0, o.feu - k);
        if (o.t === 'lampe' && o.charge > 0) o.charge = Math.max(0, o.charge - k);
        if (o.t === 'moulin' && o.spin > 0) o.spin = Math.max(0, o.spin - k);
      }
      const p = st.p;
      if (dans(p)) { for (const s2 in p.sta) if (p.sta[s2] > 0 && s2 !== 'forme') p.sta[s2] = Math.max(0, p.sta[s2] - k * 0.5); p.ink = Math.min(p.inkMax, p.ink + dt * (p.inkRegen || 1) * 2); }
    } else if (mode === 'fige') {
      // tout est déjà suspendu par le facteur de temps nul de la bulle
    } else {
      // temps lent : le facteur de temps de la bulle ralentit tout ce qui s'y trouve
    }
  }
  // ---------- Métamorphose ----------
  const MORPHS = ['grenouille', 'lapin', 'escargot', 'tortue', 'salamandre', 'limace', 'corbeau', 'chauve'];
  function finMorph(c) {
    if (!c.orig) return;
    const o = c.orig; c.orig = null; c.morphT = 0;
    const nb = makeCreature({ t: o.t, x: c.x, y: c.y + c.h - o.h, x0: c.x0 });
    const bas = c.y + c.h, mil = c.x + c.w / 2;
    for (const k of ['w', 'h', 'hpMax', 'dmg', 'vole', 'generique', 'portable']) c[k] = nb[k];
    c.t = o.t; c.y = bas - nb.h; c.x = mil - nb.w / 2; c.hp = c.hp > 0 ? Math.min(nb.hpMax, Math.max(1, o.hp)) : 0; c.size = 1;
    if (c.hp > 0) { unstick(c); part(c.x + c.w / 2, c.y + c.h / 2, '#c06aa0', 14, 90, 0.7, 3, 0, 'glow'); }
  }
  function metamorphoser(cx, cy, rad, prm) {
    const dur = prm.duration || 1; let n = 0;
    for (const c of st.crs) {
      if (c.hp <= 0 || c.t === 'familier' || c.controlled || !U.circleRect(cx, cy, rad, c)) continue;
      if (prm.inverse || c.orig) { if (c.orig) { finMorph(c); n++; } continue; }
      if (c.t === 'follet') continue;
      const choix = MORPHS.filter((t) => t !== c.t); const T = choix[(Math.random() * choix.length) | 0];
      const nb = makeCreature({ t: T, x: c.x, y: c.y, x0: c.x0 });
      c.orig = { t: c.t, hp: c.hp, w: c.w, h: c.h };
      const bas = c.y + c.h;
      for (const k of ['w', 'h', 'hpMax', 'dmg', 'vole', 'generique', 'portable']) c[k] = nb[k];
      c.t = T; c.hp = nb.hp; c.y = bas - c.h; c.x += (c.orig.w - c.w) / 2; c.size = 1; c.morphT = 20 * dur; c.sta.stun = Math.max(c.sta.stun, 0.6);
      part(c.x + c.w / 2, c.y + c.h / 2, '#c06aa0', 18, 110, 0.8, 3, 0, 'glow'); part(c.x + c.w / 2, c.y + c.h / 2, '#f0d0e8', 10, 160, 0.5, 1.6, 0, 'etincelle');
      evt('espece', T); n++;
      if (c.orig.t === 'golem') msg('Le golem rapetisse... et devient ' + nomCreature(T).toLowerCase() + ' !');
    }
    // objets : caisse et rocher échangent leur nature
    for (const o of st.objs) {
      if (o.mort || o.carried || !U.circleRect(cx, cy, rad, o) || (o.t !== 'caisse' && o.t !== 'rocher')) continue;
      const nb = makeObj({ t: o.t === 'caisse' ? 'rocher' : 'caisse', x: o.x, y: o.y });
      const bas = o.y + o.h; for (const k in nb) if (k !== 'x' && k !== 'y') o[k] = nb[k]; o.y = bas - o.h; unstick(o); n++;
      part(o.x + o.w / 2, o.y + o.h / 2, '#c06aa0', 12, 90, 0.7, 3, 0, 'glow');
    }
    st.sp.push({ k: 'ring', core: 'metamorphose', x: cx, y: cy, r: rad, life: 0.5, max: 0.5, color: '#c06aa0' });
    Son.sfx('burst', 'vie');
    if (!n) part(cx, cy, '#c06aa0', 10, 60, 0.7, 3, -30, 'glow');
  }
  // sur soi : une forme animale, choisie par le glyphe fusionné
  const FORMES = { grenouille: { nom: 'grenouille', sta: ['small', 'jump', 'branchies'] }, chauve: { nom: 'chauve-souris', sta: ['small', 'vol'] }, lapin: { nom: 'lapin', sta: ['small', 'vitesse', 'jump'] }, golem: { nom: 'golem', sta: ['geant', 'stone'] } };
  function formeDe(spec) {
    const autre = spec.cores.find((c) => c !== 'metamorphose') || (spec.seal && spec.seal.core2);
    const M2 = { eau: 'grenouille', froid: 'grenouille', vent: 'chauve', ombre: 'chauve', vie: 'lapin', foudre: 'lapin', terre: 'golem', metal: 'golem', force: 'golem' };
    if (M2[autre]) return M2[autre];
    const k = Object.keys(FORMES); return k[(Math.random() * 3) | 0];
  }
  function morphSoi(spec) {
    const p = st.p, prm = spec.prm;
    if (prm.inverse || p.forme) { finFormeSoi(); return; }
    const f = formeDe(spec), F = FORMES[f], d = 20 * (prm.duration || 1);
    p.forme = f; p.sta.forme = d; for (const k of F.sta) p.sta[k] = Math.max(p.sta[k] || 0, d);
    part(p.x + p.w / 2, p.y + p.h / 2, '#c06aa0', 22, 120, 0.8, 3, 0, 'glow'); Son.sfx('burst', 'vie');
    msg('Te voilà ' + (f === 'golem' ? 'golem' : f === 'chauve' ? 'chauve-souris' : f) + ' pour ' + Math.round(d) + ' s.' + (f === 'chauve' ? ' Tu voles sans dépenser d\'encre.' : f === 'golem' ? ' Lourd et dur comme la pierre.' : ''));
  }
  function finFormeSoi() {
    const p = st.p; if (!p.forme) return;
    for (const k of FORMES[p.forme].sta) p.sta[k] = 0;
    p.forme = null; p.sta.forme = 0; part(p.x + p.w / 2, p.y + p.h / 2, '#c06aa0', 14, 90, 0.7, 3, 0, 'glow'); msg('Tu reprends ta forme.');
  }
  // ---------- Rembobinage ----------
  // le monde garde la trace des dernières secondes
  const HIST_DT = 0.5, HIST_N = 13;
  function memoriser(dt) {
    st.histT = (st.histT || 0) + dt;
    if (st.histT < HIST_DT) return;
    st.histT = 0;
    const H = st.hist || (st.hist = []);
    const snap = H.length >= HIST_N ? H.shift() : { mat: new Uint8Array(Sim.mat.length), aux: new Uint8Array(Sim.aux.length) };
    snap.mat.set(Sim.mat); snap.aux.set(Sim.aux); snap.t = time; H.push(snap);
    const p = st.p; (p.hist || (p.hist = [])).push([p.x, p.y, p.hp, time]); if (p.hist.length > HIST_N) p.hist.shift();
    for (const c of st.crs) { (c.hist || (c.hist = [])).push([c.x, c.y, c.hp, time]); if (c.hist.length > HIST_N) c.hist.shift(); }
  }
  function passe(hist, back) { if (!hist || !hist.length) return null; let best = hist[0]; for (const h of hist) { const t = h.t !== undefined ? h.t : h[3]; if (t <= time - back) best = h; } return best; }
  function rembobiner(cx, cy, rad, prm) {
    const back = clamp(3 * (prm.duration || 1), 1, 6);
    const snap = passe(st.hist, back);
    let n = 0;
    if (snap) Sim.forRadius(cx, cy, rad, (x, y, i, m) => { const q = snap.mat[i]; if (q !== m && q !== M.BULLE && m !== M.BULLE) { Sim.set(x, y, q, snap.aux[i]); n++; } });
    for (const c of st.crs) {
      if (c.t === 'familier' || !c.hist || !c.hist.length) continue;
      const h = passe(c.hist, back); if (!h || dist(cx, cy, h[0] + c.w / 2, h[1] + c.h / 2) > rad + 30 && dist(cx, cy, c.x + c.w / 2, c.y + c.h / 2) > rad) continue;
      const mort = c.hp <= 0;
      if (h[2] > 0) { c.x = h[0]; c.y = h[1]; c.hp = Math.min(c.hpMax, h[2]); c.vx = c.vy = 0; if (mort) { c.respawn = 0; msg(nomCreature(c.t) + ' se relève, à rebours.'); } unstick(c); n++; part(c.x + c.w / 2, c.y + c.h / 2, '#7a8ad0', 10, 60, 0.6, 3, 0, 'glow'); }
    }
    const p = st.p; if (U.circleRect(cx, cy, rad, p)) unstick(p);
    for (const o of st.objs) if (o.dyn && !o.mort && U.circleRect(cx, cy, rad, o)) unstick(o);
    st.sp.push({ k: 'rembob', x: cx, y: cy, r: rad, life: 0.8, max: 0.8 });
    Son.sfx('cast', 'temps');
    if (n) evt('rembobinage');
  }
  function rembobinerSoi(prm) {
    const p = st.p, back = clamp(3 * (prm.duration || 1), 1, 6);
    const h = passe(p.hist, back); if (!h) { msg('Le temps n\'a pas encore de passé à te rendre.'); return; }
    const chemin = p.hist.filter((q) => q[3] >= h[3]).map((q) => [q[0] + p.w / 2, q[1] + p.h / 2]); chemin.push([p.x + p.w / 2, p.y + p.h / 2]);
    st.sp.push({ k: 'fantome', pts: chemin.reverse(), life: 0.9, max: 0.9 });
    p.x = h[0]; p.y = h[1]; p.vx = p.vy = 0; p.hp = Math.max(p.hp, Math.min(p.hpMax, h[2])); unstick(p);
    st.sp.push({ k: 'rembob', x: p.x + p.w / 2, y: p.y + p.h / 2, r: 60, life: 0.6, max: 0.6 });
    Son.sfx('cast', 'temps'); msg('Tu reviens ' + Math.round(time - h[3]) + ' s en arrière.');
  }
  // ---------- Langages : effets propres aux créatures ----------
  function effetLangage(core, n, cx, cy, rad, prm, burst, k) {
    const power = prm.power || 1, dur = prm.duration || 1;
    const dans = (c) => c.hp > 0 && c.t !== 'familier' && U.circleRect(cx, cy, rad, c);
    switch (core) {
      case 'eau': for (const c of st.crs) if (dans(c)) { const dx = c.x + c.w / 2 - cx, dy = c.y + c.h / 2 - cy, d = Math.hypot(dx, dy) || 1; const m = c.t === 'golem' ? 0.35 : 1; c.vx += dx / d * 420 * n * k * m; c.vy += (dy / d * 200 - 160) * n * k * m; if (burst && n >= 2) hurt(c, 1 * power); } break;
      case 'froid': if (burst) for (const c of st.crs) if (dans(c) && !c.sta.tame) { c.sta.gele = Math.max(c.sta.gele || 0, 4 * n * dur); c.sta.stun = Math.max(c.sta.stun, c.sta.gele); c.vx = 0; c.sta.burn = 0; } break;
      case 'vent':
        for (const c of st.crs) if (dans(c)) { c.vy -= 380 * n * k * (c.t === 'golem' ? 0.4 : 1); c.onGround = false; }
        for (const o of st.objs) if (o.dyn && !o.carried && !o.mort && U.circleRect(cx, cy, rad, o)) o.vy -= 380 * n * k;
        if (burst && n >= 2) tornade(cx, cy, rad, dur);
        break;
      case 'foudre': if (burst) arcsTension(cx, cy, rad, n >= 2 ? 6 : 3, power, n >= 2); break;
      case 'vie': for (const c of st.crs) if (c.hp > 0 && U.circleRect(cx, cy, rad, c)) c.hp = Math.min(c.hpMax, c.hp + 2 * k); if (burst) part(cx, cy, '#e8a0c0', 10, 70 + rad, 1.2, 3, 60, 'feuille'); break;
      case 'lumiere': for (const c of st.crs) if (dans(c)) c.sta.stun = Math.max(c.sta.stun, (burst ? 2.5 : 0.4) * (1 + n) * dur); break;
      case 'ombre': if (burst && n >= 2) for (const c of st.crs) if (dans(c) && (c.sta.sleep > 0 || c.dort) && !c.sta.tame && c.t !== 'golem') { tame(c); part(c.x + c.w / 2, c.y, '#c45a8a', 4, 40, 0.8, 3, -60, 'coeur'); } break;
      case 'acide': if (burst) for (const c of st.crs) if (dans(c) && c.t === 'golem') hurt(c, 1.5 * n * power); break;
      case 'gravite': if (burst && n >= 2) st.sp.push({ k: 'singularite', x: cx, y: cy, r: rad * 1.8, life: 2.6 * dur, max: 2.6 * dur }); break;
    }
  }
  function tornade(cx, cy, rad, dur) {
    const g = groundBelow(cx, cy);
    st.sp.push({ k: 'tornade', x: cx, y: g != null ? Math.min(g, cy + 220) : cy + 40, r: Math.max(42, rad * 0.9), h: 270, life: 4 * dur, max: 4 * dur, ph: Math.random() * 9 });
    msg('Une tornade se lève !');
  }
  function arcsTension(cx, cy, rad, n, power, violet) {
    const col = violet ? '#b070e0' : '#e0c43a';
    const cand = st.crs.filter((c) => c.hp > 0 && c.t !== 'familier' && !c.sta.tame).map((c) => [dist(cx, cy, c.x + c.w / 2, c.y + c.h / 2), c]).filter((q) => q[0] < rad + 320).sort((a, b) => a[0] - b[0]).slice(0, n);
    let fx = cx, fy = cy;
    for (const [, c] of cand) {
      const tx = c.x + c.w / 2, ty = c.y + c.h / 2;
      st.sp.push({ k: 'zap', pts: FX.eclairPts(fx, fy, tx, ty, 0.22), life: 0.35, max: 0.35, color: col });
      hurt(c, 1.5 * power); c.sta.stun = Math.max(c.sta.stun, 1.5); if (violet && !c.sta.wet) c.sta.burn = Math.max(c.sta.burn, 3);
      part(tx, ty, col, 6, 120, 0.3, 2, 0, 'etincelle'); fx = tx; fy = ty;
    }
    if (!cand.length) for (let q = 0; q < 2; q++) { const a = Math.random() * TAU; st.sp.push({ k: 'zap', pts: FX.eclairPts(cx, cy, cx + Math.cos(a) * (rad + 80), cy + Math.sin(a) * (rad + 80), 0.3), life: 0.25, max: 0.25, color: col }); }
    if (violet) Sim.forRadius(cx, cy, rad * 1.5, (x, y, i, m) => { const q = P[m]; if (FLAM(m) && Sim.aux[i] === 0 && Math.random() < 0.25) { Sim.aux[i] = q.burn; Sim.touch(i); } else if ((m === M.HUILE || m === M.POUDRE || m === M.SEVE) && Math.random() < 0.4) Sim.set(x, y, M.FEU, 30); });
  }
  function applyEffect(core, cx, cy, rad, prm, mode, opts = {}) {
    const R = rad + 60, snap = [];
    for (const c of st.crs) if (c.hp > 0 && Math.abs(c.x + c.w / 2 - cx) < R + c.w && Math.abs(c.y + c.h / 2 - cy) < R + c.h) snap.push(c, c.vx, c.vy);
    for (const o of st.objs) if (o.dyn && !o.mort && !o.carried && Math.abs(o.x + o.w / 2 - cx) < R + o.w && Math.abs(o.y + o.h / 2 - cy) < R + o.h) snap.push(o, o.vx, o.vy);
    applyEffet0(core, cx, cy, rad, prm, mode, opts);
    if (!opts.phen) PH.reagir(core, cx, cy, rad, prm, mode);
    for (let k = 0; k < snap.length; k += 3) { const e = snap[k], m = masse(e); if (m === 1) continue; const f = clamp(Math.pow(m, -0.6), 0.25, 1.35); e.vx = snap[k + 1] + (e.vx - snap[k + 1]) * f; e.vy = snap[k + 2] + (e.vy - snap[k + 2]) * f; }
  }
  function applyEffet0(core, cx, cy, rad, prm, mode, opts = {}) {
    const burst = mode === 'burst';
    const k = burst ? 1 : mode * 2.2;
    if (core === 'marque') { if (burst) placeMarque(cx, cy, rad); return; }
    if (core === 'contre') { if (burst) dissiper(cx, cy, rad); return; }
    if (core === 'metamorphose') { if (burst) metamorphoser(cx, cy, rad, prm); return; }
    if (core === 'rembobinage') { if (burst) rembobiner(cx, cy, rad, prm); return; }
    if (core === 'figer') { if (burst) poserBulle('fige', cx, cy, rad, prm); return; }
    if (core === 'temps' || core === 'ralentir') { if (burst) poserBulle(core === 'temps' ? 'vite' : 'lent', cx, cy, rad, prm); else vieillir(core === 'temps' ? 'vite' : 'lent', cx, cy, rad, mode); return; }
    const lgN = prm.lg ? prm.lg[core] || 0 : 0;
    if (lgN) prm = { ...prm, power: (prm.power || 1) * (1 + 0.3 * lgN), duration: (prm.duration || 1) * (core === 'ombre' ? 2 : 1) };
    const power = prm.power || 1, dur = prm.duration || 1;
    // la chaleur : le feu chauffe, le gel refroidit, l'explosion et la foudre échauffent
    { const kk = burst ? 1 : Math.min(1, mode * 3); const T = core === 'feu' ? 175 + 30 * lgN : core === 'explosion' ? 195 : core === 'froid' ? 18 - 8 * lgN : core === 'foudre' ? 150 : core === 'lumiere' && lgN ? 140 : core === 'secheresse' ? 120 : core === 'neutraliser' ? 48 : 0;
      if (T) Sim.chauffer(cx, cy, rad * (core === 'foudre' ? 0.4 : 0.9), T, clamp((core === 'froid' || core === 'feu' ? 0.55 : 0.35) * power * kk, 0, 1)); }
    const C = colorOf(core);
    if (burst) st.sp.push({ k: 'ring', core, x: cx, y: cy, r: rad, life: 0.4, max: 0.4, color: C });
    if (effetDerive(core, cx, cy, rad, prm, burst, k, mode, opts)) return;
    if (!opts.noGrid) gridEffect(core, cx, cy, rad, opts.mur ? { ...prm, mur: true } : prm, burst, k);

    // --- créatures ---
    for (const c of st.crs) {
      if (c.hp <= 0) continue;
      if (!U.circleRect(cx, cy, rad, c)) continue;
      const ccx = c.x + c.w / 2, ccy = c.y + c.h / 2;
      let dx = ccx - cx, dy = ccy - cy; const d = Math.hypot(dx, dy) || 1; dx /= d; dy /= d;
      if (burst) evt('hit', 'creature:' + c.t);
      const sp = DATA.ESPECES[c.t];
      if (sp && burst) { if (core === sp.aime) evt('bestiaire', { t: c.t, k: 'aime' }); if (core === sp.craint) evt('bestiaire', { t: c.t, k: 'craint' }); }
      if (sp && !c.generique && core === sp.aime) { affinite(c, burst ? 1 : k * 0.3); c.hp = Math.min(c.hpMax, c.hp + k); if (c.t === 'follet') c.size = Math.min(1.8, c.size + 0.15 * k); continue; }
      if (c.generique && sp) {
        const immune = (sp.immune || []).includes(core), faible = (sp.faible || []).includes(core) ? 2 : 1;
        if (core === sp.aime) { c.hp = Math.min(c.hpMax, c.hp + 2 * k); affinite(c, burst ? 1 : k * 0.3); continue; }
        if (core === sp.craint) { c.fuite = { x: cx, y: cy, t: 5 }; c.sta.stun = 0; c.dort = false; if (!immune) hurt(c, 1 * power * k * faible); c.vx += dx * 400 * k; c.vy -= 200 * k; if (burst) part(ccx, ccy, C, 6, 60); continue; }
        if (immune) { if (burst) part(ccx, ccy, '#aaa', 4, 40, 0.4); continue; }
        switch (core) {
          case 'feu': if (!c.sta.wet) { hurt(c, 2 * power * k * faible); c.sta.burn = Math.max(c.sta.burn, 3 * dur); } break;
          case 'eau': c.sta.burn = 0; c.sta.wet = 6; if (c.t === 'poisson') c.hp = Math.min(c.hpMax, c.hp + 2 * k); break;
          case 'vent': case 'son': c.vx += dx * 500 * power * k; c.vy += (dy * 300 - 150) * power * k; c.dort = false; break;
          case 'terre': if (burst) { hurt(c, 1 * power * faible); c.vy -= 200; } break;
          case 'lumiere': c.sta.stun = Math.max(c.sta.stun, (burst ? 2 : 0.4) * dur); break;
          case 'silence': c.sta.sleep = Math.max(c.sta.sleep, (burst ? 6 : 0.5) * dur); break;
          case 'ombre': c.sta.stun = Math.max(c.sta.stun, (burst ? 1.5 : 0.3) * dur); c.curieux = null; c.fuite = null; break;
          case 'vie': c.hp = Math.min(c.hpMax, c.hp + 2 * k); break;
          case 'force': case 'metal': c.vx -= dx * 600 * power * k; c.vy -= dy * 400 * power * k; break;
          case 'froid': c.sta.stun = Math.max(c.sta.stun, (burst ? 3 : 0.5) * dur); c.sta.burn = 0; break;
          case 'foudre': hurt(c, 2 * power * k * faible); c.sta.stun = Math.max(c.sta.stun, 2 * dur); break;
          case 'acide': case 'fanaison': hurt(c, 1.5 * power * k * faible); break;
          case 'gravite': if (burst) c.onGround = false; break;
          case 'poids': c.vy += (burst ? 500 : 1500 * mode) * power; break;
          case 'temps': case 'ralentir': c.sta.lent = Math.max(c.sta.lent || 0, (burst ? 8 : 0.5) * dur); break;
          case 'esprit': if (burst) controlCreature(c, 12 * dur); break;
          case 'lien': if (burst) attachLien(c, cx, cy, dur); break;
        }
        continue;
      }
      switch (core) {
        case 'feu':
          if (c.t === 'golem') { if (lgN >= 2) { hurt(c, 1.5 * power * k); if (burst) part(ccx, ccy, '#5a90e0', 8, 80, 0.5, 2, 0, 'etincelle'); } else if (burst) part(ccx, ccy, '#aaa', 4, 40, 0.4); }
          else if (c.t === 'follet') { c.hp = Math.min(c.hpMax + 2, c.hp + 1 * k); c.size = Math.min(1.8, c.size + 0.15 * k); if (burst) part(ccx, ccy, C, 8, 90); }
          else { if (!c.sta.wet) { hurt(c, 2 * power * k); c.sta.burn = Math.max(c.sta.burn, 3 * dur); } else if (burst) part(ccx, ccy, '#ccc', 6, 60); }
          break;
        case 'vent': { const m = c.t === 'golem' ? 0.25 : c.vole ? 2 : 1; c.vx += dx * 520 * power * k * m; c.vy += (dy * 300 - 150) * power * k * m; if (c.t === 'golem' && burst) evt('golemPousse'); break; }
        case 'eau':
          c.sta.burn = 0; c.sta.wet = 6;
          if (c.t === 'follet') { hurt(c, 2 * power * k, 'eau'); if (burst) part(ccx, ccy, '#8fb8d8', 10, 80); }
          if (c.t === 'limace' && burst) { c.size = Math.min(2.2, c.size + 0.25); c.w = 36 * c.size; c.h = 24 * c.size; c.y -= 6; if (c.size >= 2.1) msg('La limace est énorme. Elle a l\'air ravie.'); }
          if (c.t === 'golem') c.sta.stun = Math.max(c.sta.stun, 1.5 * k);
          break;
        case 'terre': if (burst) { hurt(c, 1 * power); c.vx += dx * 200; c.vy -= 200; } break;
        case 'lumiere': c.sta.stun = Math.max(c.sta.stun, (burst ? 2.5 : 0.4) * dur * power); if (burst) part(ccx, ccy - 10, C, 6, 50, 0.5, 2, 0, 'spark'); break;
        case 'ombre': c.sta.stun = Math.max(c.sta.stun, (burst ? 1.5 : 0.3) * dur); c.curieux = null; break;
        case 'vie':
          c.hp = Math.min(c.hpMax, c.hp + 2 * k); c.sta.burn = 0;
          break;
        case 'force': c.vx -= dx * 700 * power * k; c.vy -= dy * 500 * power * k; if (burst) hurt(c, 0.5 * power); break;
        case 'froid': c.sta.stun = Math.max(c.sta.stun, (burst ? 3 : 0.5) * dur); c.sta.burn = 0; if (c.t === 'follet') hurt(c, 1.5 * power * k, 'eau'); if (burst) part(ccx, ccy, C, 8, 50, 0.6, 2, 0, 'spark'); break;
        case 'foudre': hurt(c, 2 * power * k); c.sta.stun = Math.max(c.sta.stun, 2 * dur); if (c.t === 'golem' && burst) { c.sta.stun += 2; } if (burst) part(ccx, ccy, C, 10, 120, 0.4, 2, 0, 'spark'); break;
        case 'acide': if (c.t !== 'golem') hurt(c, 1.5 * power * k); else if (burst) { hurt(c, 3 * power); part(ccx, ccy, '#8fbf2a', 8, 60); } break;
        case 'gravite': if (burst) c.onGround = false; break;
        case 'temps': case 'ralentir': c.sta.lent = Math.max(c.sta.lent || 0, (burst ? 8 : 0.5) * dur); if (burst) part(ccx, ccy, C, 6, 40, 0.6, 2); break;
        case 'son': c.vx += dx * 600 * power * k; c.vy -= 200 * power * k; c.sta.sleep = 0; c.sta.stun = Math.max(c.sta.stun, 0.5); c.curieux = { x: cx, y: cy, t: 6 }; break;
        case 'silence': c.sta.sleep = Math.max(c.sta.sleep, (burst ? 5 : 0.4) * dur); break;
        case 'esprit': if (burst && c.t !== 'familier') { controlCreature(c, 12 * dur); } break;
        case 'lien': if (burst) attachLien(c, cx, cy, dur); break;
        case 'metal': if (c.t === 'golem') { c.vx -= dx * 500 * power * k; c.vy -= dy * 300 * power * k; } break;
        case 'fanaison': hurt(c, 1.2 * power * k); break;
        case 'poids': c.vy += (burst ? 500 : 1500 * mode) * power; c.sta.stun = Math.max(c.sta.stun, 0.8); break;
        case 'secheresse': c.sta.wet = 0; if (c.t === 'limace') { c.size = Math.max(0.6, c.size - 0.2 * k); c.w = 36 * c.size; c.h = 24 * c.size; } break;
        case 'neutraliser': c.sta.burn = 0; c.sta.stun = 0; break;
        case 'rouille': if (c.t === 'golem') hurt(c, 1.5 * power * k); break;
      }
    }
    if (lgN) effetLangage(core, lgN, cx, cy, rad, prm, burst, k);
    // --- objets ---
    for (const o of st.objs) {
      if (o.mort || !U.circleRect(cx, cy, rad, o)) continue;
      const ocx = o.x + o.w / 2, ocy = o.y + o.h / 2;
      if (burst && o.t !== 'porte' && o.t !== 'pancarte') evt('hit', 'objet:' + o.t);
      switch (o.t) {
        case 'levier': if (burst && (core === 'force' || core === 'vent' || core === 'son' || core === 'terre' || core === 'gravite') && time - (o.tT || 0) > 0.6) { o.etat = !o.etat; o.tT = time; Son.sfx('click'); part(ocx, ocy, C, 6, 50); } break;
        case 'brasier': if (core === 'feu' || core === 'foudre' || (core === 'lumiere' && prm.lg && prm.lg.lumiere)) { if (!(o.feu > 0)) Son.sfx('burst', 'feu'); o.feu = 20 * (prm.duration || 1); } else if (core === 'eau' || core === 'froid' || (core === 'vent' && burst) || core === 'secheresse' || core === 'neutraliser') { if (o.feu > 0) part(ocx, o.y, '#bbb', 8, 40, 0.8, 4, -60, 'fumee'); o.feu = 0; } break;
        case 'lampe': if (core === 'foudre') { o.charge = 10 * (prm.duration || 1); part(ocx, ocy, '#fff2a0', 12, 120, 0.4, 2, 0, 'etincelle'); } break;
        case 'moulin': if (core === 'vent' || core === 'son' || core === 'force') { o.spin = Math.max(o.spin, (burst ? 8 : 2) * (prm.duration || 1)); } break;
        case 'roue': if (core === 'vent' || core === 'force') o.ang += burst ? 1.2 : 0.1; break;
        case 'mannequin': if (burst) { o.hits++; o.wob = 1; evt('mannequin'); if (core === 'feu') o.burning = 2; if (core === 'eau' || core === 'froid') o.burning = 0; } break;
        case 'caisse':
          if (core === 'feu') { if (!o.burning) part(ocx, ocy, C, 6, 60); o.burning = Math.max(o.burning, 2.5); }
          if (core === 'eau' || core === 'froid') o.burning = 0;
          if (core === 'vent') { const dx = Math.sign(ocx - cx) || 1; o.vx += dx * 420 * power * k; o.vy -= 220 * power * k; }
          if (core === 'force') { o.vx -= (ocx - cx) * 6 * power * k; o.vy -= (ocy - cy) * 4 * power * k + 100 * k; }

          if (core === 'metal' || core === 'son') { const sg = core === 'metal' ? -1 : 1; o.vx += sg * Math.sign(ocx - cx) * 420 * power * k; o.vy -= 150 * power * k; }
          if (core === 'poids') o.vy += (burst ? 400 : 1500 * mode) * power;
          if ((core === 'terre' || core === 'acide') && burst) { o.hp -= power; if (o.hp <= 0) { o.mort = true; part(ocx, ocy, '#8a6b2f', 12, 90); } }
          break;
        case 'torche':
          if ((core === 'feu' || core === 'foudre') && !o.lit) { o.lit = true; part(o.x + 7, o.y + 4, C, 10, 70); evt('torche'); }
          if ((core === 'eau' || core === 'vent' || core === 'froid' || core === 'ombre') && o.lit) { o.lit = false; part(o.x + 7, o.y + 4, '#999', 8, 40); }
          break;
        case 'graine':
          if ((core === 'eau' || core === 'vie') && o.stage === 0) { growPlant(o); evt('graine'); }
          if (core === 'vie' && o.stage === 1) { o.racine = true; o.regrow = 0; }
          break;
        case 'rocher':
          if (burst && power >= 1.5 && (core === 'feu' || core === 'terre' || core === 'force' || core === 'vent' || core === 'foudre' || core === 'acide')) {
            o.mort = true; part(ocx, ocy, '#8a6b2f', 16, 120, 0.8, 4, 600);
            dropPickup('poussiere', ocx, o.y - 10); msg('Le rocher éclate ! Il en tombe une poussière scintillante.');
          } else if (burst && (core === 'feu' || core === 'terre' || core === 'force' || core === 'vent' || core === 'foudre')) { o.fissure = 0.5; if (!o.msgT || time - o.msgT > 4) { o.msgT = time; msg('Le rocher vibre. Il faudrait plus de puissance...'); } }
          if (core === 'metal') { o.vx -= Math.sign(ocx - cx) * 300 * power * k; }
          break;
        case 'rune': if (core === 'lumiere') { o.revele = Math.min(1, o.revele + (burst ? 1 : k * 0.5)); if (burst) part(ocx, ocy, C, 10, 60, 0.8, 2, 0, 'spark'); } break;
      }
    }
    // --- champs ---
    if (core === 'eau' || core === 'vent' || core === 'froid') {
      for (const s of st.sp) if (s.k === 'field' && s.core === 'feu' && dist(cx, cy, s.x, s.y) < rad + s.r) { s.life = Math.min(s.life, 0.2); part(s.x, s.y, '#bbb', 6, 40); }
    }
    // --- joueur ---
    const p = st.p;
    if (!opts.noPlayer && U.circleRect(cx, cy, rad, p)) {
      const pcx = p.x + p.w / 2, pcy = p.y + p.h / 2;
      switch (core) {
        case 'feu': if (!p.sta.wet && !p.sta.stone) { p.sta.burning = Math.max(p.sta.burning, 1.5); if (burst && time - (p.msgFeu || -9) > 4) { p.msgFeu = time; msg('Tu t\'es roussi les sourcils.'); } } break;
        case 'vent': { const dx = Math.sign(pcx - cx) || 1; p.vx += dx * 350 * power * k; p.vy -= 250 * power * k; break; }
        case 'eau': p.sta.wet = 8; p.sta.burning = 0; break;
        case 'force': p.vx -= (pcx - cx) * 5 * power * k; p.vy -= (pcy - cy) * 4 * power * k; break;
        case 'vie': p.hp = Math.min(p.hpMax, p.hp + 2 * power * k); break;
        case 'lumiere': p.sta.lumiere = Math.max(p.sta.lumiere, 4 * dur); break;
        case 'foudre': if (!p.sta.vitesse && !p.sta.stone && burst) { p.hp -= 1; p.vy -= 200; msg('Tu es secoué(e) par ta propre foudre.', 'warn'); } break;
        case 'acide': if (!p.sta.stone && !p.sta.dissous) { p.hp -= (burst ? 1 : 1.5 * mode) * power; if (burst) msg('Ça pique !', 'warn'); } break;

        case 'froid': if (burst && !p.sta.patins) msg('Brrr.'); break;
        case 'son': { const dx = Math.sign(pcx - cx) || 1; p.vx += dx * 300 * power * k; p.vy -= 200 * power * k; break; }
        case 'poids': p.vy += (burst ? 400 : 1500 * mode) * power; break;
        case 'lien': if (burst && !opts.self) attachLien(null, cx, cy, dur); break;
      }
    }
    // --- décor ---
    if (burst) {
      fxBurst(core, cx, cy, rad, lgN);
      Son.sfx('burst', core);
      if (prm.persist > 0 && core !== 'terre' && core !== 'gravite' && core !== 'metal' && core !== 'esprit' && core !== 'lien' && core !== 'portail') st.sp.push({ k: 'field', core, x: cx, y: cy, r: rad * 0.8, life: 4 * prm.persist * dur, max: 4 * prm.persist * dur, prm });
      else if (core === 'lumiere' && !opts.noField) st.sp.push({ k: 'field', core, x: cx, y: cy, r: rad * 0.8, life: 5 * dur, max: 5 * dur, prm, faible: true });
      if (core === 'gravite' && !opts.noField) {
        const p = st.p; let dv = opts.dir;
        if (!dv) { const ddx = cx - (p.x + p.w / 2), ddy = cy - (p.y + p.h / 2); const dd = Math.hypot(ddx, ddy); dv = dd > 20 ? { x: ddx / dd, y: ddy / dd } : { x: 0, y: 1 }; }
        const [gx, gy] = snapDir(dv.x, dv.y);
        const mag = prm.gInv ? 0 : 1.2 + 0.9 * Math.max(0, (power - 1) / 0.6);
        addGField(cx, cy, rad * 1.3, gx, gy, mag, 6 * dur * (1 + (prm.persist || 0)));
        const lbl = mag === 0 ? 'Apesanteur' : gy === 1 ? (mag > 1.6 ? 'Pesanteur écrasante' : 'Pesanteur') : gy === -1 ? 'Chute vers le ciel' : 'Pesanteur latérale';
        st.sp.push({ k: 'label', x: cx, y: cy - rad, txt: lbl, life: 1.4, max: 1.4 });
        evt('gravite', lbl);
      }
      if (core === 'terre' || core === 'metal') { st.shake = 0.15; }
      if (core === 'portail' && !opts.self) placePortail(cx, cy);
    }
  }
  function tame(c) {
    c.sta.tame = true; const ccx = c.x + c.w / 2;
    part(ccx, c.y, '#c45a8a', 10, 60, 0.9, 3, -60, 'coeur');
    msg(nomCreature(c.t) + ' est apprivoisé(e). Il/elle te suit du regard.');
    if (!c.filDonne) { c.filDonne = true; dropPickup('fil', ccx, c.y - 10); }
    evt('tame', c.t);
  }
  function growPlant(o) {
    o.stage = 1;
    let h = 0; const x = Math.floor((o.x + o.w / 2) / CS), y0 = Math.floor(o.y / CS);
    while (h < 50 && !P[Sim.get(x, y0 - 1 - h)].solid) h++;
    o.hMax = Math.max(12, h); o.hauteur = 0; o.racine = true; o.cx = x; o.cy = y0;
    part(o.x + o.w / 2, o.y, '#5c8f3e', 12, 70, 0.8, 3, 0, 'feuille');
    msg('La graine s\'éveille et grimpe vers le ciel.');
  }
  function hurt(c, dmg, source) {
    if (c.t === 'familier' && source !== 'coup') return;
    c.hp -= dmg; c.hurt = 0.25; if (!c.sta.tame && c.aff > 0) c.aff = Math.max(0, c.aff - (c.t === 'golem' ? 30 : 10));
    if (c.hp <= 0) {
      c.hp = 0; part(c.x + c.w / 2, c.y + c.h / 2, c.t === 'follet' ? '#3f9c9b' : '#1f1a16', 14, 90, 0.8);
      if (c.t === 'follet' && source === 'eau') { dropPickup('plume', c.x + c.w / 2, c.y); msg('Le feu follet se dissipe en laissant une plume.'); }
      else if (c.t === 'follet') msg('Le feu follet s\'éteint en soupirant.');
      else if (c.t === 'limace') msg('La limace d\'encre se résorbe en flaque. Elle reviendra.');
      else msg('Le golem s\'effondre en gravats. Il se relèvera.');
      c.respawn = 30;
      if (st.p.carry === c) st.p.carry = null;
    }
  }
  function nomCreature(t) { const sp = DATA.ESPECES[t]; if (t === 'limace') return 'La limace d\'encre'; if (t === 'follet') return 'Le feu follet'; if (t === 'golem') return 'Le golem'; return sp ? (/^[aeiouéè]/i.test(sp.nom) ? 'L\'' : (sp.nom.endsWith('e') && !/corbeau|poisson|lapin|escargot|familier/.test(t) ? 'La ' : 'Le ')) + sp.nom.toLowerCase() : 'La créature'; }
  function dropPickup(ing, x, y) { st.pickups.push({ ing, x, y, vy: -120, vx: (Math.random() - 0.5) * 80, bob: 0 }); }

  // ---------- Sur soi ----------
  function applySelf(core, prm, aim, spec) {
    const p = st.p; const pcx = p.x + p.w / 2, pcy = p.y + p.h / 2;
    const dur = prm.duration || 1, power = prm.power || 1, size = prm.size || 1;
    const C = colorOf(core);
    st.sp.push({ k: 'ring', core, x: pcx, y: pcy, r: 50 * size, life: 0.5, max: 0.5, color: C });
    Son.sfx('cast', core);
    const around = (opts) => applyEffect(core, pcx, pcy, 60 * size, prm, 'burst', Object.assign({ noPlayer: true, self: true }, opts));
    switch (core) {
      case 'feu': if (p.sta.wet) { p.sta.wet = 0; msg('Tu te sèches en un nuage de vapeur.'); part(pcx, pcy, '#ccc', 10, 50); } else { p.sta.burning = 2; p.hp -= 0.5; msg('Tu t\'es mis(e) le feu. Classique.'); } around(); break;
      case 'vent': p.vy = -560 * Math.sqrt(power); p.sta.glide = 1.6 * dur; p.onGround = false; part(pcx, p.y + p.h, C, 12, 80); around(); break;
      case 'eau': p.sta.wet = 12 * dur; p.sta.branchies = Math.max(p.sta.branchies, 20 * dur); p.sta.burning = 0; msg('Trempé(e), à l\'abri du feu, et tu respires l\'eau un moment.'); around(); break;
      case 'terre': case 'transmutation': p.sta.stone = 12 * dur; msg('Ta peau devient pierre.'); break;
      case 'lumiere': p.sta.lumiere = 18 * dur; applyEffect('lumiere', pcx, pcy, 160 * size, prm, 'burst', { noPlayer: true, noField: true }); msg('Tu rayonnes comme une lanterne.'); break;
      case 'ombre': p.sta.invisible = 10 * dur; msg('Tu te fonds dans l\'encre. Les créatures t\'ignorent.'); break;
      case 'vie': p.hp = Math.min(p.hpMax, p.hp + 4 * power); p.sta.burning = 0; around(); break;
      case 'force': { let dx = aim.x - pcx, dy = aim.y - pcy; const d = Math.hypot(dx, dy) || 1; dx /= d; dy /= d; p.vx = dx * 650 * Math.sqrt(power); p.vy = dy * 500 * Math.sqrt(power) - 100; p.sta.glide = 0.6; p.inv = Math.max(p.inv, 0.5); break; }
      case 'froid': p.sta.patins = 12 * dur; p.sta.burning = 0; msg('Des patins de givre : tu marches sur l\'eau.'); around(); break;
      case 'foudre': p.sta.vitesse = 10 * dur; msg('Tes jambes crépitent !'); around({ noGrid: true }); break;
      case 'acide': p.sta.dissous = 8 * dur; msg('Tu dissous ce que tu touches. Attention où tu poses les mains.'); break;
      case 'gravite': {
        const heavy = power >= 1.5, T = 10 * dur;
        if (prm.gInv) { setPG(0, -1, heavy ? 2.2 : 1, T); msg('Ta pesanteur s\'inverse : tu tombes vers le ciel. Le plafond devient ton sol.'); evt('gravite', 'plafond'); break; }
        let dx = aim.x - pcx, dy = aim.y - pcy; const d = Math.hypot(dx, dy) || 1; dx /= d; dy /= d;
        const h = Sim.raycast(pcx, pcy, dx, dy, 280 * (prm.range || 1));
        if (h) {
          const [gx, gy] = snapDir(dx, dy);
          if (gx === 0 && gy === 1 && heavy) { setPG(0, 1, 2.8, T, { enclume: true }); msg('Tu deviens lourd(e) comme une enclume.'); evt('gravite', 'enclume'); }
          else { setPG(gx, gy, heavy ? 2.2 : 1, T); msg(gy === 1 ? 'Ta pesanteur se raffermit.' : gy === -1 ? 'Tu tombes vers le plafond visé.' : 'Ta pesanteur pointe vers le mur : marche dessus (↑ ↓ pour avancer).'); evt('gravite', 'mur'); }
        } else if (heavy) { setPG(0, 1, 2.8, T, { enclume: true }); msg('Tu deviens lourd(e) comme une enclume.'); evt('gravite', 'enclume'); }
        else { p.pg = null; p.sta.vol = Math.max(p.sta.vol, 8 * dur); p.onGround = false; msg('Tu vises le vide : ta pesanteur s\'annule. Vol libre (flèches ou ZQSD) ; ça consomme de l\'encre.'); evt('vol'); }
        break;
      }
      case 'temps': p.sta.hate = 10 * dur; msg('Tu vas plus vite que le monde : tes pas et ton encre s\'accélèrent.'); break;
      case 'ralentir': p.sta.lent = 6 * dur; msg('Tes jambes pèsent une tonne. Bien joué.'); break;
      case 'son': around({ noGrid: false }); st.shake = 0.3; msg('Un cri à réveiller les golems.'); break;
      case 'silence': around(); break;
      case 'esprit': { let best = null, bd = 220; for (const c of st.crs) if (c.hp > 0 && c.t !== 'familier') { const d = dist(pcx, pcy, c.x, c.y); if (d < bd) { bd = d; best = c; } } if (best) controlCreature(best, 12 * dur); else msg('Aucun esprit à portée.'); break; }
      case 'lien': { const h = Sim.raycast(pcx, pcy, (aim.x - pcx) / (dist(pcx, pcy, aim.x, aim.y) || 1), (aim.y - pcy) / (dist(pcx, pcy, aim.x, aim.y) || 1), 320 * (prm.range || 1)); if (h) attachLien(null, h.x, h.y, dur); else msg('La corde ne trouve rien à saisir.'); break; }
      case 'portail': { const q = st.portails[st.portails.length - 1]; if (q) { p.x = q.x - p.w / 2; p.y = q.y - p.h / 2; p.vx = 0; p.vy = 0; part(q.x, q.y, C, 14, 80); msg('Tu traverses jusqu\'à ton dernier portail.'); } else msg('Aucun portail n\'est ouvert.'); break; }
      case 'marque': placeMarque(pcx, pcy, 0); st.marques[st.marques.length - 1] = { x: pcx, y: pcy, t: 0 }; msg('Une marque luit à tes pieds.'); break;
      case 'contre': dissiper(pcx, pcy, 60 * size); break;
      case 'metamorphose': morphSoi(spec || { cores: [core], prm }); break;
      case 'saut': { let dx = aim.x - pcx, dy = aim.y - pcy; const d = Math.hypot(dx, dy) || 1; dx /= d; dy /= d; let L3 = Math.min(d, 320 * (prm.range || 1)); while (L3 > 10 && Sim.rectBlocked({ x: pcx + dx * L3 - p.w / 2, y: pcy + dy * L3 - p.h / 2, w: p.w, h: p.h })) L3 -= 6; part(pcx, pcy, '#4fb0a0', 14, 80, 0.5, 3, 0, 'glow'); p.x = pcx + dx * L3 - p.w / 2; p.y = pcy + dy * L3 - p.h / 2; p.vx = p.vy = 0; unstick(p); part(p.x + p.w / 2, p.y + p.h / 2, '#4fb0a0', 14, 80, 0.5, 3, 0, 'glow'); msg('L\'espace se plie : tu y es.'); break; }
      case 'peur': around(); msg('Une vague de peur part de toi.'); break;
      case 'repulsion': around(); break;
      case 'fumee': around(); p.sta.invisible = Math.max(p.sta.invisible || 0, 6 * dur); msg('Tu disparais dans la fumée.'); break;
      case 'explosion': p.vy = -720 * Math.sqrt(power); p.onGround = false; if (!(p.sta.stone > 0) && !(p.sta.armure > 0)) p.hp -= 1; around(); msg('Un bond à la poudre !'); break;
      case 'courant': { let dx = aim.x - pcx, dy = aim.y - pcy; const d = Math.hypot(dx, dy) || 1; const f = p.liq ? 1.5 : 1; p.vx = dx / d * 650 * f; p.vy = dy / d * 500 * f - 80; p.sta.wet = 8; part(pcx, pcy, '#5f9ad8', 14, 120, 0.6, 2.4, 300, 'goutte'); break; }
      case 'seisme': around(); st.shake = 0.6; break;
      case 'figer': poserBulle('fige', pcx, pcy, 110 * size, prm); msg('Le temps s\'arrête autour de toi.'); break;
      case 'rembobinage': rembobinerSoi(prm); break;
      case 'metal': p.sta.armure = 20 * dur; msg('Une armure de métal : rien ne te bouscule, la foudre glisse.'); break;
      case 'creuser': Sim.forRadius(pcx, p.y + p.h + 10, 40 * size, (x, y, i, m) => { if (P[m].solid && m !== M.OBSIDIENNE) Sim.set(x, y, M.AIR); }); msg('Le sol se dérobe sous tes pieds.'); break;
      case 'fanaison': p.hp -= 1; msg('Tu te sens flétrir. Mauvaise idée.', 'warn'); break;
      case 'neutraliser': p.sta.burning = 0; p.sta.dissous = 0; p.sta.lent = 0; msg('Tout redevient calme.'); break;
      case 'poids': p.vy += 600; p.sta.lent = 4 * dur; msg('Tu pèses une enclume.'); break;
      case 'secheresse': p.sta.wet = 0; around(); break;
      case 'rouille': p.sta.armure = 0; around(); break;
    }
  }

  // ---------- Spécification d'un sceau au lancer ----------
  let castSeq = 0;
  const PRIM = ['tenu', 'immediat', 'contact', 'retarde', 'commande', 'proximite'];
  function couleurLg(core, lg) { if (core === 'feu' && lg.feu) return lg.feu >= 2 ? '#4a86e0' : '#f0d070'; if (core === 'foudre' && lg.foudre >= 2) return '#b070e0'; return colorOf(core); }
  // le Maître d'un élément paie moins cher ses sceaux
  function maitreMul(seal) { const M2 = (game && game.progress.maitrise) || {}; const els = [seal.core, seal.taille !== 'petit' ? seal.core2 : null].filter(Boolean); return els.length && els.every((e) => DATA.LANGAGES[e] && DATA.niveauMaitrise(M2[e] || 0) >= 3) ? 0.8 : 1; }
  function chainOk(seal) { return seal.shape === 'projectile'; }
  function makeSpec(seal, depth = 0, charge = 0) {
    const prm = Seal.params(seal);
    if (charge > 0) { prm.power *= 1 + 0.8 * charge; prm.range *= 1 + 0.5 * charge; prm.size *= 1 + 0.4 * charge; prm.duration *= 1 + 0.3 * charge; }
    let cores = Seal.effets(seal);
    for (const e in prm.asp) for (const A of prm.asp[e]) if (A.n > 1) { prm.lg[A.devient] = 2; prm.power *= 1.3; }
    const effets0 = cores.slice();
    if (prm.inverse) { prm.gInv = cores.includes('gravite'); cores = cores.map((c) => (c === 'gravite' ? c : DATA.INVERSE[c] || c)); }
    const lg = prm.lg || {};
    if (lg.gravite && cores.includes('gravite')) { prm.size *= 1 + 0.3 * lg.gravite; prm.power *= 1 + 0.4 * lg.gravite; }
    const combo = !prm.inverse ? DATA.comboCle(effets0) : null;
    const trs = Seal.triggers(seal);
    const proj = seal.shape === 'projectile' || seal.shape === 'chaine';
    const trig = trs.find((t) => PRIM.includes(t)) || (trs.includes('repetition') && proj ? 'contact' : 'immediat');
    const big = seal.taille !== 'petit';
    return { cores, prm, trig, subs: depth < 2 ? Seal.subs(seal) : [], combo, color: couleurLg(cores[0], lg), chaud: cores.includes('feu') ? lg.feu || 0 : 0, core: cores[0], depth, nom: Seal.nom(seal),
      repeat: trs.includes('repetition') ? (seal.periode || 2) : 0, expire: trs.includes('expiration'), delai: seal.delai || 2,
      filtre: big ? seal.filtre || null : null, cible: big ? seal.cible || 'souris' : 'souris', castId: ++castSeq, shape: seal.shape, seal, charge };
  }
  // ---------- Filtres de matière ----------
  const filtreSets = {};
  function filtreSet(f) { if (!filtreSets[f]) filtreSets[f] = new Set((DATA.FILTRES[f] ? DATA.FILTRES[f].mats : []).map((n) => M[n])); return filtreSets[f]; }
  function filtreTouche(f, x, y, r) {
    if (f === 'creature') return st.crs.find((c) => c.hp > 0 && c.t !== 'familier' && U.circleRect(x, y, r, c)) || null;
    if (f === 'objet') return st.objs.find((o) => !o.mort && OBJ_CIBLES.includes(o.t) && U.circleRect(x, y, r, o)) || null;
    const set = filtreSet(f); let hit = null;
    Sim.forRadius(x, y, r, (cx, cy, i, m) => { if (!hit && set.has(m)) hit = { cell: true }; });
    return hit;
  }
  const OBJ_CIBLES = ['brasier', 'lampe', 'levier', 'moulin', 'roue', 'caisse', 'rocher', 'torche', 'graine', 'mannequin'];
  function objetProche(x, y, R = 520) { let best = null, bd = R; for (const o of st.objs) { if (o.mort || o.carried || !OBJ_CIBLES.includes(o.t)) continue; const d = dist(x, y, o.x + o.w / 2, o.y + o.h / 2); if (d < bd) { bd = d; best = o; } } return best; }
  function filtreCompte(f, x, y, r) { if (f === 'objet') return st.objs.filter((o) => !o.mort && OBJ_CIBLES.includes(o.t) && U.circleRect(x, y, r, o)).length; if (f === 'creature') return st.crs.filter((c) => c.hp > 0 && U.circleRect(x, y, r, c)).length; const set = filtreSet(f); let n = 0; Sim.forRadius(x, y, r, (cx, cy, i, m) => { if (set.has(m)) n++; }); return n; }
  // ---------- Cibles et marques ----------
  // la créature visée : d'abord celles qu'on voit (rien de solide entre elles et nous), hostiles avant les autres
  function creatureProche(x, y, R = 520) {
    const vue = (c) => { const cx = c.x + c.w / 2, cy = c.y + c.h / 2, d = dist(x, y, cx, cy) || 1; const h = Sim.raycast(x, y, (cx - x) / d, (cy - y) / d, d); return !h || h.t > d - Math.max(c.w, c.h) * 0.6; };
    const choisir = (filtre) => { let best = null, bd = R; for (const c of st.crs) { if (c.hp <= 0 || c.sta.tame || c.t === 'familier' || c.controlled || !filtre(c)) continue; const d = dist(x, y, c.x + c.w / 2, c.y + c.h / 2); if (d < bd) { bd = d; best = c; } } return best; };
    const hostile = (c) => { const sp = DATA.ESPECES[c.t]; return !(sp && !sp.hostile && c.generique); };
    return choisir((c) => hostile(c) && vue(c)) || choisir(vue) || choisir(hostile) || choisir(() => true);
  }
  function posMarque(mq) { return mq.ent ? (mq.ent.hp > 0 && !mq.ent.mort ? { x: mq.ent.x + mq.ent.w / 2, y: mq.ent.y + mq.ent.h / 2 } : null) : { x: mq.x, y: mq.y }; }
  function marqueRecente() { for (let i = st.marques.length - 1; i >= 0; i--) { const q = posMarque(st.marques[i]); if (q) return { pos: q, mq: st.marques[i] }; } return null; }
  function placeMarque(x, y, rad) {
    let ent = null, bd = rad + 10;
    for (const c of st.crs) if (c.hp > 0) { const d = dist(x, y, c.x + c.w / 2, c.y + c.h / 2); if (d < bd) { bd = d; ent = c; } }
    st.marques.push(ent ? { ent, t: 0 } : { x, y, t: 0 });
    while (st.marques.length > 3) st.marques.shift();
    part(x, y, '#e0b050', 12, 60, 0.8, 2, 0, 'spark'); Son.sfx('pickup');
  }
  // ---------- Contre-sort ----------
  function dissiper(x, y, rad) {
    const R = rad * 1.5; let n = 0; const p = st.p; const pin = dist(x, y, p.x + p.w / 2, p.y + p.h / 2) < R;
    for (const q of st.sp) if (q.k === 'prise' && !q.mort && dist(x, y, q.x, q.y) < R + 60) { q.tenue = false; ecraserPrise(q); n++; }
    const KINDS = ['field', 'trap', 'totem', 'timer', 'attente', 'repeat', 'expire', 'rain', 'orbit', 'canal', 'bouclier', 'beamtimer', 'echo', 'singularite', 'bulle', 'tornade', 'vague', 'colonne'];
    for (const q of st.sp) { if (!KINDS.includes(q.k)) continue; const attached = q.follow || q.k === 'bouclier' || q.k === 'orbit' || q.k === 'canal' || q.self; if ((attached && pin) || (q.x != null && dist(x, y, q.x, q.y) < R)) { q.mort = true; if (q.k === 'bouclier') finBouclier(q); n++; } }
    const avant = st.gz.length; st.gz = st.gz.filter((z) => dist(x, y, z.x, z.y) >= R + z.r * 0.5); n += avant - st.gz.length;
    const ap = st.portails.length; st.portails = st.portails.filter((q) => dist(x, y, q.x, q.y) >= R); if (st.portails.length !== ap) { n++; if (st.portails.length < 2) st.portails = []; }
    const am = st.marques.length; st.marques = st.marques.filter((mq) => { const q = posMarque(mq); return q && dist(x, y, q.x, q.y) >= R; }); n += am - st.marques.length;
    for (const c of st.crs) if (c.hp > 0 && dist(x, y, c.x + c.w / 2, c.y + c.h / 2) < R) { if (c.ench) { c.ench = null; n++; } if (c.controlled) { releaseControl(); n++; } }
    for (const o of st.objs) if (o.ench && dist(x, y, o.x + o.w / 2, o.y + o.h / 2) < R) { o.ench = null; n++; }
    if (pin) { if (p.pg) { p.pg = null; n++; } if (p.sta.vol > 0) { p.sta.vol = 0; n++; } if (p.trap) { p.trap = null; n++; } }
    Sim.forRadius(x, y, R, (cx, cy, i, m) => { if (Sim.elec[i] > 0) { Sim.elec[i] = 0; Sim.touch(i); } });
    n += PH.dissiper(x, y, R);
    st.sp.push({ k: 'ring', core: 'contre', x, y, r: R, life: 0.6, max: 0.6, color: '#a8a29a' });
    msg(n ? 'La magie se dissipe (' + n + ').' : 'Rien à dissiper ici.');
  }
  // ---------- Enchaînements ----------
  function enchainement(spec, x, y, r) {
    const prev = st.lastBurst; const core = spec.cores[0];
    st.lastBurst = { core, x, y, t: time, castId: spec.castId };
    if (!prev || prev.castId === spec.castId || time - prev.t > 1 || dist(prev.x, prev.y, x, y) > 150) return;
    const key = prev.core + '>' + core; const E = DATA.ENCHAINEMENTS[key]; if (!E) return;
    st.lastBurst = null;
    st.sp.push({ k: 'label', x, y: y - 50, txt: E.nom, life: 1.8, max: 1.8 });
    if (!game.progress.enchainements.includes(key)) msg('✦ Enchaînement découvert : ' + E.nom + '. ' + E.desc, 'unlock');
    evt('enchainement', key);
    const R = Math.max(r, 60);
    switch (key) {
      case 'eau>froid': for (const c of st.crs) if (c.hp > 0 && dist(x, y, c.x + c.w / 2, c.y + c.h / 2) < R * 2) { c.sta.stun = Math.max(c.sta.stun, 6); c.vx = 0; Sim.forRadius(c.x + c.w / 2, c.y + c.h, c.w * 0.7, (cx, cy, i, m) => { if (m === M.AIR || m === M.EAU) Sim.set(cx, cy, M.GLACE); }); } break;
      case 'feu>vent': Sim.forRadius(x, y, R * 2.6, (cx, cy, i, m) => { if ((FLAM(m) && Sim.aux[i] === 0 && Math.random() < 0.3)) { Sim.aux[i] = P[m].burn; Sim.touch(i); } else if (m === M.HUILE && Math.random() < 0.5) Sim.set(cx, cy, M.FEU, 30); }); break;
      case 'terre>force': { const aim = toWorld(game.inp.mouse.x, game.inp.mouse.y); const o = makeObj({ t: 'rocher', x: x - 28, y: y - 70 }); let dx = aim.x - x, dy = aim.y - y; const d = Math.hypot(dx, dy) || 1; o.vx = dx / d * 760; o.vy = dy / d * 760 - 150; o.boulet = 1.5; st.objs.push(o); unstick(o); break; }
      case 'eau>foudre': Sim.forRadius(x, y, R * 3, (cx, cy, i, m) => { if (P[m].cond) { Sim.elec[i] = 150; Sim.touch(i); } }); for (const c of st.crs) if (c.hp > 0 && dist(x, y, c.x, c.y) < R * 3 && (c.sta.wet > 0 || liquidOf(c))) { hurt(c, 3); c.sta.stun = Math.max(c.sta.stun, 3); } st.flash = 0.08; break;
      case 'lumiere>ombre': for (const c of st.crs) if (c.hp > 0 && dist(x, y, c.x, c.y) < R * 4) c.sta.sleep = Math.max(c.sta.sleep, 10); st.flash = 0.1; break;
      case 'froid>feu': Sim.forRadius(x, y, R * 1.2, (cx, cy, i, m) => { if ((m === M.PIERRE || m === M.OBSIDIENNE) && Math.random() < 0.6) Sim.set(cx, cy, M.SABLE); }); for (const o of st.objs) if (o.t === 'rocher' && !o.mort && dist(x, y, o.x + o.w / 2, o.y + o.h / 2) < R * 1.8) { o.mort = true; dropPickup('poussiere', o.x + o.w / 2, o.y); } break;
      case 'vie>eau': for (let k = 0; k < 4; k++) gridEffect('vie', x, y, R * 2.2, spec.prm, true, 1); break;
      case 'gravite>terre': Sim.forRadius(x, y - R, R * 2, (cx, cy, i, m) => { if ((m === M.PIERRE || m === M.TERRE) && (cy + 0.5) * CS < y && Math.random() < 0.5) Sim.set(cx, cy, M.SABLE); }); st.shake = 0.6; break;
      case 'vent>vent': for (const b of [...st.crs, ...st.objs.filter((o) => o.dyn && !o.carried)]) { const bx = b.x + b.w / 2, by = b.y + b.h / 2, d = dist(x, y, bx, by); if (d < R * 3.5 && d > 1) { b.vx += (bx - x) / d * 900; b.vy += (by - y) / d * 600 - 250; } } break;
      case 'foudre>foudre': { st.sp.push({ k: 'beam', core: 'foudre', x1: prev.x, y1: prev.y, x2: x, y2: y, life: 0.5, max: 0.5, color: '#e0c43a', w: 8 }); const L2 = dist(prev.x, prev.y, x, y); for (let t = 0; t <= L2; t += 10) { const px = prev.x + (x - prev.x) * t / (L2 || 1), py = prev.y + (y - prev.y) * t / (L2 || 1); for (const c of st.crs) if (c.hp > 0 && U.circleRect(px, py, 14, c)) { hurt(c, 1.5); c.sta.stun = Math.max(c.sta.stun, 2); } } Son.sfx('burst', 'foudre'); break; }
    }
  }
  // Éclatement complet : chaque effet, la fusion, l'écho, les sous-sceaux
  // ---------- Encres spéciales ----------
  function appliquerEncre(spec, id) {
    const prm = spec.prm; spec.encre = id; spec.encreC = DATA.ENCRES[id].couleur;
    if (id === 'encre_braise' && spec.cores.includes('feu')) prm.power *= 1.3;
    else if (id === 'encre_nacre') { prm.bounces = (prm.bounces || 0) + 2; prm.duration *= 1.3; }
    else if (id === 'encre_ambre') prm.duration *= 1.5;
    else if (id === 'encre_chantante') prm.echo = (prm.echo || 0) + 1;
  }
  function encreBurst(spec, x, y, r) {
    const pr = { power: 0.55, size: 1, duration: 1, persist: 0 }, o2 = { noPlayer: true, noField: true };
    switch (spec.encre) {
      case 'encre_braise': applyEffect('feu', x, y, r * 0.8, pr, 'burst', o2); break;
      case 'encre_givre': applyEffect('froid', x, y, r * 0.9, pr, 'burst', o2); for (const c of st.crs) if (c.hp > 0 && U.circleRect(x, y, r, c)) c.sta.lent = Math.max(c.sta.lent || 0, 4); break;
      case 'encre_ambre': for (const c of st.crs) if (c.hp > 0 && c.t !== 'familier' && U.circleRect(x, y, r, c)) { c.sta.lent = Math.max(c.sta.lent || 0, 6); c.sta.stun = Math.max(c.sta.stun, 1); } part(x, y, '#d8a03a', 12, 80, 0.9, 3, 300, 'goutte'); break;
      case 'encre_chantante': applyEffect('son', x, y, r * 1.2, pr, 'burst', o2); break;
      case 'encre_pollen': applyEffect('vie', x, y, r, pr, 'burst', o2); { const p = st.p; p.hp = Math.min(p.hpMax, p.hp + 0.5); } break;
    }
    part(x, y, spec.encreC || '#e0b050', 10, 130, 0.6, 2, 0, 'etincelle');
  }
  function gerbe(spec, x, y) {
    const prm2 = { ...spec.prm, gerbe: 0, size: (spec.prm.size || 1) * 0.55, power: (spec.prm.power || 1) * 0.6, traj: null, percant: false };
    const spec2 = { ...spec, prm: prm2, repeat: 0, expire: false, subs: [], combo: null, depth: (spec.depth || 0) + 1, player: false, encre: null };
    for (let i = 0; i < 5; i++) { const a = -Math.PI / 2 + (i - 2) * 0.55; st.sp.push({ k: 'proj', spec: spec2, core: spec.core, x, y: y - 6, vx: Math.cos(a) * 330, vy: Math.sin(a) * 330, r: 5, prm: prm2, trig: 'contact', bounces: 0, life: 0.9, grav: 600, hits: new Set(), color: spec.color, trail: 0, chain: 0, petit: true, off: 0, ph: 0 }); }
  }
  function doBurst(spec, x, y, r, opts = {}, dir = null) {
    if (spec.prm.gerbe && !opts.noGerbe && (spec.depth || 0) < 2) gerbe(spec, x, y);
    if (spec.prm.matiere && !opts.noMatiere && !opts.ent && spec.shape !== 'projectile' && spec.shape !== 'chaine' && spec.shape !== 'trait') matiereCercle(spec, x, y, r * 0.7);
    const pm = spec.cores.length > 1 ? 0.85 : 1;
    if (spec.player && !opts.noCombo && spec.depth === 0) enchainement(spec, x, y, r);
    if (spec.repeat && !opts.noRepeat) capRepetitions();
    if (spec.repeat && !opts.noRepeat) st.sp.push({ k: 'repeat', spec, x, y, r, ent: opts.ent || null, opts: { ...opts, noRepeat: true, noExpire: true, noEcho: true, noCombo: true }, t: spec.repeat, max: spec.repeat, left: clamp(Math.round(8 * spec.prm.duration / spec.repeat), 2, 8) });
    if (spec.expire && !opts.noExpire) { const T = (spec.repeat ? spec.repeat * clamp(Math.round(8 * spec.prm.duration / spec.repeat), 2, 8) : 0) + 4 * spec.prm.duration * (1 + (spec.prm.persist || 0)); st.sp.push({ k: 'expire', spec, x, y, r, t: T, max: T }); }
    // une fusion nommée fait naître son phénomène à la place des deux effets de base
    if (!spec.combo) for (const core of spec.cores) applyEffect(core, x, y, r, { ...spec.prm, power: spec.prm.power * pm }, 'burst', opts);
    if (spec.encre && !opts.noEncre) encreBurst(spec, x, y, r);
    if (spec.combo && !opts.noCombo) PH.deployer(spec, x, y, r, opts, dir);
    if (spec.prm.echo > 0 && !opts.noEcho) st.sp.push({ k: 'echo', spec, x, y, r, opts: { ...opts, noEcho: true }, t: 0.5, left: spec.prm.echo });
    for (const sub of spec.subs) launch(sub, { x, y }, { x: x + (dir ? dir.x : 0) * 100, y: y + (dir ? dir.y : -1) * 100 }, { depth: spec.depth + 1 });
  }
  function doContinuous(spec, x, y, r, dt, opts = {}) {
    for (const core of spec.cores) applyEffect(core, x, y, r, { ...spec.prm, power: spec.prm.power * 0.5 }, dt, opts);
  }
  function groundBelow(x, y) { for (let yy = y; yy < L.h; yy += CS) if (Sim.solidAt(x, yy)) return yy - (yy % CS); return null; }

  // ---------- Lancer un sceau ----------
  function castSeal(seal, aim, gratuit, charge = 0, hand = 'R') {
    const p = st.p;
    if (!p.gestes) p.gestes = { R: null, L: null };
    if (p.gestes[hand]) return false;
    let encre = null;
    if (seal.encre && DATA.ENCRES[seal.encre]) { if (((game.inv.encres || {})[seal.encre] || 0) > 0) encre = seal.encre; else if (!gratuit) msg('Plus d\'' + DATA.ENCRES[seal.encre].nom.toLowerCase() + ' : le sceau s\'écrit à l\'encre ordinaire.', 'warn'); }
    const cost = gratuit ? 0 : Math.max(1, Math.round(Seal.cost(seal) * (game.opt ? game.opt.cout : 1) * (1 + charge) * maitreMul(seal) * (encre === 'encre_or' ? 0.6 : 1)));
    if (p.ink < cost) { msg('Plus assez d\'encre (' + Math.floor(p.ink) + '/' + cost + ').', 'warn'); Son.sfx('fail'); return false; }
    p.ink -= cost;
    if (gratuit) part(p.x + p.w / 2, p.y + p.h * 0.4, '#efe3c4', 8, 40, 0.6, 3, 60);
    const pcx = p.x + p.w / 2, pcy = p.y + p.h * 0.45;
    if (!seal.core) { part(pcx, pcy - 20, '#777', 14, 50, 1, 4); Son.sfx('fizzle'); msg('Pfft. Un pétard de fumée grise. Il manque un glyphe d\'effet.'); p.ink = Math.min(p.inkMax, p.ink + cost - 1); return true; }
    if (!seal.shape) { applyEffect(seal.core, pcx, pcy, 45, { ...Seal.params(seal), power: 0.5 }, 'burst', { noPlayer: seal.core !== 'feu' }); msg('Sans forme, l\'effet se répand mollement autour de toi.'); return true; }
    if (seal.core === 'terre' || seal.core2 === 'terre') evt('terre');
    if (Seal.triggers(seal).includes('retarde')) evt('retarde');
    const gt = Seal.taille(seal).geste * (1 + charge * 0.5);
    if (encre) { game.inv.encres[encre]--; if (game.inv.encres[encre] === 0) msg('C\'était la dernière goutte d\'' + DATA.ENCRES[encre].nom.toLowerCase() + '.'); }
    p.gestes[hand] = { seal, aim: { x: aim.x, y: aim.y }, t: gt, max: gt, color: encre ? DATA.ENCRES[encre].couleur : colorOf(seal.core), charge, hand, encre, cost };
    if (charge > 0.6) msg('Sort chargé : ' + Math.round(100 + charge * 80) + ' % de puissance.');
    return true;
  }
  // Lance un sceau depuis un point (joueur ou sous-sceau)
  function launch(seal, origin, aim, o = {}) {
    if (!seal.core || !seal.shape) return;
    const p = st.p;
    const spec = makeSpec(seal, o.depth || 0, o.charge || 0);
    spec.player = !!o.player;
    if (o.encre) appliquerEncre(spec, o.encre);
    const prm = spec.prm, trig = spec.trig, C = spec.color;
    const ox = origin.x, oy = origin.y;
    // ciblage
    let homing = null, horsPortee = false;
    if (spec.cible === 'creature' && seal.shape !== 'soi') { const c = creatureProche(ox, oy); if (c) { aim = { x: c.x + c.w / 2, y: c.y + c.h / 2 }; homing = c; horsPortee = true; } else if (o.player) msg('Aucune créature à cibler : le sort part vers la souris.'); }
    else if (spec.cible === 'objet' && seal.shape !== 'soi') { const ob = objetProche(aim.x, aim.y); if (ob) { aim = { x: ob.x + ob.w / 2, y: ob.y + ob.h / 2 }; homing = ob; horsPortee = true; } else if (o.player) msg('Aucun objet près de la souris : le sort y part tout droit.'); }
    else if (spec.cible === 'marque' && seal.shape !== 'soi') { const m = marqueRecente(); if (m) { aim = m.pos; homing = m.mq.ent || { x: m.pos.x - 1, y: m.pos.y - 1, w: 2, h: 2, hp: 1, point: true }; horsPortee = true; } else if (o.player) msg('Aucune marque posée : le sort part vers la souris.'); }
    let dx = aim.x - ox, dy = aim.y - oy; const d = Math.hypot(dx, dy) || 1; dx /= d; dy /= d;
    const portee = (base) => (horsPortee ? d : Math.min(d, base));
    if (o.tenu && o.player) { lancerTenu(spec, seal, ox, oy, aim, dx, dy, d, o); return; }
    // sur commande : formes posées
    if (trig === 'commande' && !['projectile', 'chaine', 'soi', 'trait', 'zone', 'mur'].includes(seal.shape)) {
      const dd = portee(260 * prm.range); st.sp.push({ k: 'attente', spec, x: ox + dx * dd, y: oy + dy * dd, life: 40, relance: true });
      if (o.player) msg('Le sort attend. Touche F pour le libérer.'); return;
    }
    if (o.player) Son.sfx('cast', spec.core);
    const canal = prm.canalise && o.player;
    if (canal && seal.shape !== 'projectile' && seal.shape !== 'soi' && seal.shape !== 'chaine' && seal.shape !== 'prise') {
      st.sp.push({ k: 'canal', spec, t: 0, tick: 0, range: 260 * prm.range, r: 50 * prm.size, cost: Math.max(1, Seal.cost(seal) * 0.25) });
      msg('Maintiens le clic pour canaliser.');
      return;
    }
    switch (seal.shape) {
      case 'projectile': case 'chaine': {
        if (prm.rafale && !o.suiteRafale) st.sp.push({ k: 'rafale', seal, o: { ...o, suiteRafale: true }, origin, aim: { ...aim }, left: prm.rafale > 1 ? 4 : 2, t: 0.12 });
        if (prm.orbite && o.player) {
          for (let i = 0; i < 3; i++) st.sp.push({ k: 'orbit', spec, a: (i / 3) * TAU, r: 10 * prm.size, life: 6 * prm.duration, hits: new Map(), color: C });
          break;
        }
        const n = 1 + prm.extra;
        for (let i = 0; i < n; i++) {
          const spread = n > 1 ? (i - (n - 1) / 2) * 0.22 : 0;
          const a = Math.atan2(dy, dx) + spread;
          const sp = (spec.core === 'foudre' ? 800 : 520) * prm.speed;
          const floats = ['lumiere', 'vent', 'ombre', 'foudre', 'gravite', 'son', 'esprit', 'temps', 'metamorphose', 'rembobinage'].includes(spec.core) || prm.traj === 'boomerang' || prm.traj === 'rasesol';
          st.sp.push({ k: 'proj', spec, core: spec.core, x: ox + Math.cos(a) * 20, y: oy + Math.sin(a) * 20, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp,
            r: 8 * prm.size, prm, trig, bounces: prm.bounces, life: 1.1 * prm.range * (prm.traj === 'boomerang' ? 2.2 : prm.traj === 'rasesol' ? 1.7 : 1), grav: prm.traj === 'boomerang' || prm.traj === 'rasesol' ? 0 : floats ? 40 : 420 / prm.speed, traj: chainOk(seal) ? prm.traj : null, off: 0, ph: 0, hits: new Set(), color: C, trail: 0, chaud: spec.chaud || 0,
            chain: seal.shape === 'chaine' ? 3 + (prm.extra ? 2 : 0) : 0, guide: prm.teleguide && o.player && !homing, homing });
          if (spec.filtre) st.sp[st.sp.length - 1].grav = 0;
          if (prm.matiere) { const q = st.sp[st.sp.length - 1], m = matiereDe(spec); if (m != null && m !== M.AIR) { q.matiere = m; q.vx *= 1.25; q.vy *= 1.25; q.grav = Math.min(q.grav, 150); } }
          if (prm.traj === 'cloche' && seal.shape === 'projectile') { const q = st.sp[st.sp.length - 1]; const D = Math.min(d, 420 * prm.range), tx = ox + dx * D + (n > 1 ? (i - (n - 1) / 2) * 50 : 0), ty = oy + dy * D; const g = 900, Hc = Math.max(200, Math.abs(tx - ox) * 0.7) + Math.max(0, q.y - ty), T = clamp(Math.sqrt(2 * Hc / g) + Math.sqrt(2 * Math.max(20, Hc - (q.y - ty)) / g), 0.6, 2.2); q.x = ox; q.y = oy - 10; q.vx = (tx - ox) / T; q.vy = (ty - q.y - 0.5 * g * T * T) / T; q.grav = g; q.life = T + 0.8; }
          if (homing) { const q = st.sp[st.sp.length - 1]; q.life *= spec.cible === 'marque' ? 4 : 2; q.grav = 0; }
        }
        break;
      }
      case 'soi':
        if (!o.player) { doBurst(spec, ox, oy, 60 * prm.size, { noPlayer: true }); break; }
        if (trig === 'immediat') selfCast(spec, aim);
        else if (trig === 'contact') { p.trap = { spec }; msg('Le sceau attend sur ta peau. Il éclatera au premier contact.'); }
        else if (trig === 'commande') { st.sp.push({ k: 'attente', spec, self: true, aim: { ...aim }, life: 40 }); msg('Le sceau attend sur toi. Touche F pour le libérer.'); }
        else { p.selfTimer = { spec, t: spec.delai, aim: { ...aim } }; msg('Le sceau s\'enroule autour de toi... ' + spec.delai + ' s.'); }
        break;
      case 'zone': case 'mur': {
        const range = 260 * prm.range; const dd = portee(range); const n = 1 + prm.extra;
        for (let i = 0; i < n; i++) {
          const off = n > 1 ? (i - (n - 1) / 2) * 90 * prm.size : 0;
          const tx = ox + dx * dd + -dy * off, ty = oy + dy * dd + dx * off;
          if (trig === 'commande') { st.sp.push({ k: 'attente', spec, x: tx, y: ty, life: 40, mur: seal.shape === 'mur', dir: { x: dx, y: dy } }); continue; }
          if (seal.shape === 'mur') {
            const mw = 30 * prm.size * (prm.dimL || 1), mh = 180 * prm.size * (prm.dimH || 1), rect = { x0: tx - mw / 2, x1: tx + mw / 2, y0: ty - mh / 2, y1: ty + mh / 2 };
            if (trig === 'immediat' && spec.combo) PH.deployer(spec, tx, ty, mw / 2, { rect, mur: true }, { x: dx, y: dy });
            if (trig === 'immediat' && !spec.combo && champForme(spec, rect, { x: dx, y: dy })) continue;
            if (trig === 'immediat' && prm.matiere) matiereRect(spec, rect);
            const pts = murPoints(tx, ty, mw, mh);
            pts.forEach((q, k) => { const pr = k === Math.floor(pts.length / 2); if (trig === 'immediat') doBurst(spec, q.x, q.y, q.r, { mur: true, noMatiere: true, noField: !pr, noEcho: !pr, noRepeat: !pr, noExpire: !pr, noCombo: !pr }); else st.sp.push({ k: 'timer', spec, x: q.x, y: q.y, r: q.r, t: trig === 'retarde' ? spec.delai : 0.1 + Math.abs(k - pts.length / 2) * 0.05, max: trig === 'retarde' ? spec.delai : 0.5, color: C, noField: !pr, mur: true }); });
          } else {
            const r = 70 * prm.size * (prm.dimL || 1);
            if (trig === 'immediat') doBurst(spec, tx, ty, r, {}, { x: dx, y: dy });
            else if (trig === 'contact' || trig === 'proximite') st.sp.push({ k: 'trap', prox: trig === 'proximite', spec, x: tx, y: ty, r: r * (trig === 'proximite' ? 1.3 : 0.85), prm, life: 20 * prm.duration, color: C, t: 0, base: spec.filtre ? filtreCompte(spec.filtre, tx, ty, r * 0.6) : 0, chk: 0 });
            else st.sp.push({ k: 'timer', spec, x: tx, y: ty, r, t: spec.delai, max: spec.delai, color: C });
          }
        }
        if (trig === 'commande' && o.player) msg('Le sort attend. Touche F pour le libérer.');
        break;
      }
      case 'trait':
        if (prm.rafale && !o.suiteRafale && trig !== 'retarde' && trig !== 'commande') st.sp.push({ k: 'rafale', seal, o: { ...o, suiteRafale: true }, origin, aim: { ...aim }, left: prm.rafale > 1 ? 4 : 2, t: 0.15 });
        if (trig === 'retarde') { st.sp.push({ k: 'beamtimer', spec, x: ox, y: oy, dx, dy, prm, t: spec.delai, max: spec.delai, color: C }); if (o.player) msg('Le trait se charge...'); }
        else if (trig === 'commande') { st.sp.push({ k: 'attente', spec, trait: true, self: true, life: 40 }); if (o.player) msg('Le trait attend. Touche F pour le tirer vers la souris.'); }
        else { const n = 1 + prm.extra, a0 = Math.atan2(dy, dx); for (let i = 0; i < n; i++) { const a = a0 + (n > 1 ? (i - (n - 1) / 2) * 0.18 : 0); fireBeam(spec, ox, oy, Math.cos(a), Math.sin(a), trig); } }
        break;
      case 'aura': if (!spec.combo) st.sp.push({ k: 'field', spec, core: spec.core, x: ox, y: oy, r: 70 * prm.size * (prm.dimL || 1), life: 6 * prm.duration, max: 6 * prm.duration, prm, follow: true }); if (spec.combo && o.player) PH.deployer(spec, ox, oy, 70 * prm.size, { follow: p }, { x: dx, y: dy }); if (o.player) msg('L\'effet t\'enveloppe un moment.'); break;
      case 'prise': {
        const dd = portee(300 * prm.range); const tx = ox + dx * dd, ty = oy + dy * dd;
        saisir(spec, tx, ty, !!o.player);
        break;
      }
      case 'bouclier': st.sp.push({ k: 'bouclier', spec, self: !!o.player, x: ox, y: oy, a: Math.atan2(dy, dx), life: 4 * prm.duration, max: 4 * prm.duration, r: 46 * prm.size * (prm.dimL || 1), color: C }); if (o.player) msg('Un bouclier de ' + (DATA.CORES[spec.core] || DATA.PSEUDO[spec.core]).nom.toLowerCase() + ' se lève devant toi.'); break;
      case 'totem': { const range = 260 * prm.range; const dd = portee(range); const tx = ox + dx * dd, ty = oy + dy * dd; const g = groundBelow(tx, ty); st.sp.push({ k: 'totem', spec, x: tx, y: g != null ? g : ty, r: 60 * prm.size * (prm.dimL || 1), life: 20 * prm.duration, max: 20 * prm.duration, t: 0.5, color: C }); break; }
      case 'pluie': { const range = 320 * prm.range; const dd = portee(range); const tx = ox + dx * dd; st.sp.push({ k: 'rain', spec, x: tx, w: 120 * prm.size * (prm.dimL || 1), yTop: Math.max(30, oy - 320), life: 3 * prm.duration, t: 0, color: C }); break; }
      case 'objet': {
        const range = 260 * prm.range; const dd = Math.min(d, range); const tx = ox + dx * dd, ty = oy + dy * dd;
        let best = null, bd = 140;
        for (const q of st.objs) if ((q.t === 'caisse' || q.t === 'rocher') && !q.mort) { const dq = dist(tx, ty, q.x + q.w / 2, q.y + q.h / 2); if (dq < bd) { bd = dq; best = q; } }
        for (const c of st.crs) if (c.hp > 0) { const dq = dist(tx, ty, c.x + c.w / 2, c.y + c.h / 2); if (dq < bd) { bd = dq; best = c; } }
        if (best && spec.combo) PH.deployer(spec, best.x + best.w / 2, best.y + best.h / 2, 50 * prm.size, { follow: best }, { x: dx, y: dy });
        if (best && !spec.combo) { best.ench = { spec, t: 15 * prm.duration, tick: 0 }; part(best.x + best.w / 2, best.y, C, 12, 60, 0.8, 3, 0, 'spark'); if (o.player) msg('L\'objet porte maintenant l\'effet.'); }
        else if (!best && o.player) msg('Rien à enchanter par ici.');
        break;
      }
      case 'vague': {
        const sx = ox + (Math.sign(dx) || 1) * 30, g = groundBelow(sx, oy - 10);
        st.sp.push({ k: 'vague', spec, x: sx, y: g != null ? g : oy + 20, dir: Math.sign(dx) || 1, v: 280 * prm.speed, life: 1.4 * prm.range * (prm.dimL || 1), max: 1.4 * prm.range * (prm.dimL || 1), r: 34 * prm.size * (prm.dimH || 1), color: C, tick: 0 });
        break;
      }
      case 'colonne': {
        const dd = portee(260 * prm.range); const tx = ox + dx * dd, ty = oy + dy * dd; const g = groundBelow(tx, ty - 20);
        const cw = 22 * prm.size * (prm.dimL || 1), ch = 200 * prm.size * (prm.dimH || 1), gy0 = g != null ? g : ty, rect = { x0: tx - cw, x1: tx + cw, y0: gy0 - ch, y1: gy0 };
        if (spec.combo) { PH.deployer(spec, tx, gy0 - ch / 2, cw, { rect }, { x: dx, y: dy }); break; }
        if (champForme(spec, rect, null)) break;
        if (prm.matiere) { matiereRect(spec, { x0: tx - cw * 0.6, x1: tx + cw * 0.6, y0: gy0 - ch, y1: gy0 - 1 }); Son.sfx('burst', 'terre'); part(tx, gy0, spec.color, 14, 120, 0.6, 3, 300, 'eclat'); break; }
        st.sp.push({ k: 'colonne', spec, x: tx, y: gy0, h: ch, w: cw, life: 2 * prm.duration, max: 2 * prm.duration, color: C, tick: 0 });
        break;
      }
      case 'invocation': {
        const esp = DATA.FAMILIERS[seal.core] ? seal.core : 'feu', F = DATA.FAMILIERS[esp], n = 1 + Math.min(2, prm.extra || 0);
        // pas plus de six familiers à la fois : le plus ancien s'en va
        const vieux = st.crs.filter((c) => c.t === 'familier' && c.hp > 0); while (vieux.length + n > 6) { const v = vieux.shift(); v.life = 0; }
        for (let i = 0; i < n; i++) {
          const f = nouveauFamilier(spec, esp, ox - F.w / 2 + i * 14, oy - F.h - 6, i);
          st.crs.push(f); if (spec.combo && i === 0) PH.deployer(spec, ox, oy - 30, 30 * prm.size, { follow: f }, { x: dx, y: dy });
        }
        Son.voix(esp);
        if (o.player) { const pg = game.progress; if (!pg.familiers) pg.familiers = {}; const neuf = !pg.familiers[esp]; pg.familiers[esp] = (pg.familiers[esp] || 0) + 1; msg((neuf ? 'Nouveau familier : ' : '') + F.nom + (n > 1 ? ' (×' + n + ')' : '') + (neuf ? '. ' + F.desc : ' t\'accompagne.')); if (neuf) pg.nouveau = true; }
        break;
      }
    }
  }
  // ---------- Déclencheur Maintenu : le sort vit tant qu'on tient le clic ----------
  function tientMain(h) { const m = game && game.inp && game.inp.mouse; return !!(m && (h === 'L' ? m.rdown : m.down)); }
  function lancerTenu(spec, seal, ox, oy, aim, dx, dy, d, o) {
    const prm = spec.prm, sz = prm.size || 1, hand = o.tenu;
    const tenu = { hand, drain: Math.max(0.6, Seal.cost(seal) * 0.3), portee: 300 * (prm.range || 1), t: -1 };
    Son.sfx('cast', spec.core);
    const dd = Math.min(d, tenu.portee), tx = ox + dx * dd, ty = oy + dy * dd, dir = { x: dx, y: dy };
    if (spec.combo) {
      let ph = null;
      switch (seal.shape) {
        case 'mur': { const mw = 30 * sz * (prm.dimL || 1), mh = 180 * sz * (prm.dimH || 1); ph = PH.deployer(spec, tx, ty, mw / 2, { rect: { x0: tx - mw / 2, x1: tx + mw / 2, y0: ty - mh / 2, y1: ty + mh / 2 }, tenu }, dir); break; }
        case 'colonne': { const g = groundBelow(tx, ty - 20), cw = 22 * sz * (prm.dimL || 1), ch = 200 * sz * (prm.dimH || 1), gy0 = g != null ? g : ty; ph = PH.deployer(spec, tx, gy0 - ch / 2, cw, { rect: { x0: tx - cw, x1: tx + cw, y0: gy0 - ch, y1: gy0 }, tenu }, dir); break; }
        case 'trait': ph = PH.deployer(spec, tx, ty, 30 * sz, { ligne: { x1: ox + dx * 20, y1: oy + dy * 20, x2: tx, y2: ty, w: 14 * sz * (prm.dimL || 1) }, tenu }, dir); break;
        case 'soi': case 'aura': ph = PH.deployer(spec, ox, oy, 60 * sz, { follow: st.p, tenu }, dir); break;
        case 'projectile': case 'chaine': ph = PH.deployer(spec, ox + dx * 40, oy + dy * 40, 50 * sz, { tenu }, dir); break;
        default: ph = PH.deployer(spec, tx, ty, 70 * sz, { tenu }, dir);
      }
      if (ph && ph.tenu) msg('Tant que tu tiens le clic, ' + DATA.comboInfo(spec.combo).nom.toLowerCase() + ' suit ta souris.');
      return;
    }
    if (seal.shape === 'projectile' || seal.shape === 'chaine') {
      // un projectile tenu : guidé par la souris, il se défait quand on lâche
      const n0 = st.sp.length; launch(seal, { x: ox, y: oy }, aim, Object.assign({}, o, { tenu: null }));
      for (let k = n0; k < st.sp.length; k++) if (st.sp[k].k === 'proj') { const q = st.sp[k]; q.tenu = tenu; q.guide = false; q.grav = 0; q.traj = null; }
      return;
    }
    // le reste : l'effet est canalisé là où pointe la souris (ou sur toi), tant qu'on tient
    const soi = seal.shape === 'soi' || seal.shape === 'aura';
    st.sp.push({ k: 'canal', spec, t: 0, tick: 0, range: tenu.portee, r: (soi ? 70 : 50) * sz * (seal.shape === 'zone' || seal.shape === 'aura' ? prm.dimL || 1 : 1), cost: tenu.drain, tenu, soi, trait: seal.shape === 'trait' });
  }
  function selfCast(spec, aim, noRepeat) {
    if (!spec.combo) for (const core of spec.cores) applySelf(core, spec.prm, aim, spec);
    if (spec.repeat && !noRepeat) capRepetitions();
    if (spec.repeat && !noRepeat) st.sp.push({ k: 'repeat', self: true, spec, aim, t: spec.repeat, max: spec.repeat, left: clamp(Math.round(8 * spec.prm.duration / spec.repeat), 2, 8) });
    if (noRepeat) return;
    if (spec.combo) PH.deployer(spec, st.p.x + st.p.w / 2, st.p.y + st.p.h / 2, 60 * (spec.prm.size || 1), { follow: st.p }, aim ? { x: Math.sign(aim.x - st.p.x) || 1, y: 0 } : null);
    for (const sub of spec.subs) launch(sub, { x: st.p.x + st.p.w / 2, y: st.p.y + st.p.h / 2 }, aim, { depth: spec.depth + 1 });
  }
  function fireBeam(spec, x, y, dx, dy, trig) {
    const prm = spec.prm, C = spec.color, core = spec.core;
    const len = 320 * prm.range * (prm.dimH || 1);
    const sols = dynSolids();
    let ex = x, ey = y;
    const touched = new Set();
    for (let t = 0; t < len; t += 5) {
      const px = x + dx * t, py = y + dy * t;
      if (Sim.solidAt(px, py) || sols.some((s) => px >= s.x && px <= s.x + s.w && py >= s.y && py <= s.y + s.h)) { ex = px; ey = py; break; }
      ex = px; ey = py;
      let stop = false;
      for (const c of st.crs) if (c.hp > 0 && px >= c.x && px <= c.x + c.w && py >= c.y && py <= c.y + c.h) { touched.add(c); if (trig === 'contact') stop = true; }
      for (const o of st.objs) if (!o.mort && o.t !== 'porte' && o.t !== 'pancarte' && px >= o.x && px <= o.x + o.w && py >= o.y && py <= o.y + o.h) { touched.add(o); if (trig === 'contact' && (o.solid || o.t === 'mannequin')) stop = true; }
      if (stop) break;
    }
    st.sp.push({ k: 'beam', core, x1: x, y1: y, x2: ex, y2: ey, life: 0.35, max: 0.35, color: C, w: 6 * prm.size * (prm.dimL || 1) });
    if (prm.matiere) matiereLigne(spec, x + dx * 24, y + dy * 24, ex, ey, 5 * prm.size * (prm.dimL || 1));
    Son.sfx('cast', core);
    if (spec.combo) PH.deployer(spec, ex, ey, 30 * prm.size, { ligne: { x1: x + dx * 20, y1: y + dy * 20, x2: ex, y2: ey, w: 14 * prm.size * (prm.dimL || 1) } }, { x: dx, y: dy });
    if (trig === 'contact') doBurst(spec, ex, ey, 55 * prm.size, { noPlayer: true }, { x: dx, y: dy });
    else {
      if (!spec.combo) for (let t = 10; t < Math.hypot(ex - x, ey - y); t += 14) for (const c of spec.cores) gridEffect(c, x + dx * t, y + dy * t, 9 * prm.size * (prm.dimL || 1), { ...prm, power: prm.power * 0.6 }, true, 1);
      if (!spec.combo) for (const e of touched) for (const c of spec.cores) applyEffect(c, e.x + e.w / 2, e.y + e.h / 2, Math.max(e.w, e.h) * 0.6, { ...prm, power: prm.power * 0.8 }, 'burst', { noPlayer: true, noField: true, noGrid: true });
      doBurst(spec, ex - dx * 6, ey - dy * 6, 24 * prm.size, { noPlayer: true, noField: core !== 'lumiere' }, { x: dx, y: dy });
    }
  }

  // ---------- Esprit, Lien, Portails ----------
  function controlCreature(c, t) {
    st.control = { c, t }; c.sta.tame = true; c.controlled = true;
    msg('Tu es dans la tête de ' + nomCreature(c.t).toLowerCase() + '. Flèches pour bouger, E pour revenir.');
    part(c.x + c.w / 2, c.y, '#b08ad8', 14, 60, 0.9, 2, 0, 'spark');
  }
  function releaseControl() {
    if (!st.control) return;
    const c = st.control.c; c.controlled = false; c.sta.tame = false; c.sta.stun = 2;
    part(c.x + c.w / 2, c.y, '#b08ad8', 8, 40); st.control = null; msg('Tu reviens dans ton corps, un peu étourdi(e).');
  }
  function attachLien(ent, x, y, dur) {
    st.lien = { ent, x, y, t: 8 * dur, len: Math.max(40, dist(st.p.x + st.p.w / 2, st.p.y + st.p.h / 2, x, y)) };
    Son.sfx('cast', 'lien'); msg('La corde tient. Espace pour lâcher.');
  }
  function placePortail(x, y) {
    if (st.portails.length >= 2) { st.portails = []; msg('Les anciens portails se referment.'); }
    st.portails.push({ x, y, r: 26, cd: new Map() });
    part(x, y, '#4fb0a0', 16, 80, 0.8, 2, 0, 'spark');
    msg(st.portails.length === 1 ? 'Premier portail ouvert. Lance-en un second.' : 'Le passage est ouvert.');
  }
  function updatePortails(dt) {
    if (st.portails.length < 2) return;
    const [A, B] = st.portails;
    const tp = (b, from, to) => { b.x = to.x - b.w / 2; b.y = to.y - b.h / 2; part(from.x, from.y, '#4fb0a0', 6, 50); part(to.x, to.y, '#4fb0a0', 6, 50); };
    const bodies = [st.p, ...st.crs.filter((c) => c.hp > 0), ...st.objs.filter((o) => o.dyn && !o.mort && !o.carried)];
    for (const b of bodies) {
      for (const [from, to] of [[A, B], [B, A]]) {
        const now = time;
        if (U.circleRect(from.x, from.y, from.r, b)) { const last = b.portT || -9; if (now - last > 0.6) { tp(b, from, to); b.portT = now; if (b === st.p) Son.sfx('door'); } }
      }
    }
    for (const s of st.sp) if (s.k === 'proj') for (const [from, to] of [[A, B], [B, A]]) if (dist(s.x, s.y, from.x, from.y) < from.r && time - (s.portT || -9) > 0.6) { s.x = to.x + (s.x - from.x); s.y = to.y + (s.y - from.y); s.portT = time; }
    // matières : liquides et poudres
    Sim.forRadius(A.x, A.y, A.r, (x, y, i, m) => { const q = P[m]; if ((q.liquid || q.powder) && Math.random() < 0.5) { const tx = x + Math.round((B.x - A.x) / CS), ty = y + Math.round((B.y - A.y) / CS); if (Sim.get(tx, ty) === M.AIR) { Sim.set(tx, ty, m); Sim.set(x, y, M.AIR); if (m === M.EAU) evt('portailEau'); } } });
    Sim.forRadius(B.x, B.y, B.r, (x, y, i, m) => { const q = P[m]; if ((q.liquid || q.powder) && Math.random() < 0.5) { const tx = x + Math.round((A.x - B.x) / CS), ty = y + Math.round((A.y - B.y) / CS); if (Sim.get(tx, ty) === M.AIR) { Sim.set(tx, ty, m); Sim.set(x, y, M.AIR); } } });
  }
  function updateLien(dt, inp) {
    const l = st.lien; if (!l) return;
    l.t -= dt; const p = st.p;
    if (l.ent) { if (l.ent.hp <= 0 || l.ent.mort) { st.lien = null; return; } l.x = l.ent.x + l.ent.w / 2; l.y = l.ent.y + l.ent.h / 2; }
    if (l.t <= 0 || inp.jump) { st.lien = null; msg('La corde se dissipe.'); return; }
    const pcx = p.x + p.w / 2, pcy = p.y + p.h / 2;
    let dx = l.x - pcx, dy = l.y - pcy; const d = Math.hypot(dx, dy) || 1; dx /= d; dy /= d;
    if (inp.up) l.len = Math.max(30, l.len - 160 * dt);
    if (inp.down) l.len += 120 * dt;
    if (d > l.len) { const pull = (d - l.len) * 40; p.vx += dx * pull * dt * 10; p.vy += dy * pull * dt * 10; const vr = p.vx * dx + p.vy * dy; if (vr < 0) { p.vx -= dx * vr; p.vy -= dy * vr; } }
    if (l.ent && !l.ent.controlled) { l.ent.vx -= dx * 200 * dt; l.ent.vy -= dy * 150 * dt; }
    if (Math.random() < 0.2) part(pcx + dx * d * Math.random(), pcy + dy * d * Math.random(), '#c9a63a', 1, 10, 0.3, 1.5);
  }

  // ---------- Potions et fioles ----------
  function usePotion(id, aim, forte) {
    const Pn = DATA.POTIONS[id]; const p = st.p; const pcx = p.x + p.w / 2, pcy = p.y + p.h * 0.45;
    const F = forte ? 2 : 1;
    if (Pn.usage === 'boire') {
      Son.sfx('drink'); part(pcx, pcy - 10, Pn.couleur, 10, 50, 0.8, 3, -80);
      if (forte) msg('Distillée : l\'effet est doublé.');
      switch (id) {
        case 'encre': p.ink = Math.min(p.inkMax, p.ink + 25 * F); msg('L\'encre coule à nouveau dans tes veines.'); break;
        case 'soin': p.hp = p.hpMax; p.sta.burning = 0; msg('Tu te sens tout(e) neuf(ve).'); break;
        case 'saut': p.sta.jump = 30 * F; msg('Tes jambes frétillent. Saute !'); break;
        case 'vision': p.sta.vision = 40 * F; msg('Le monde se couvre de signes que tu ne voyais pas.'); break;
        case 'legerete': p.sta.lowgrav = 30 * F; msg('Tu flottes presque.'); break;
        case 'petitesse': p.sta.small = 25 * F; p.sta.geant = 0; msg('Tu rétrécis ! Le monde est immense.'); break;
        case 'peau': p.sta.stone = 45 * F; msg('Dur comme le roc.'); break;
        case 'vol': p.sta.vol = 35 * F; p.onGround = false; msg('Tu t\'élèves ! Flèches ou ZQSD dans toutes les directions.'); evt('vol'); break;
        case 'respiration': p.sta.branchies = 60 * F; msg('Des branchies ! L\'eau devient ton élément.'); break;
        case 'geant': p.sta.geant = 25 * F; p.sta.small = 0; msg('Tu grandis, tu grandis...'); break;
        case 'hoquet': p.sta.hoquet = 30 * F; msg('Hic. Hic. De la fumée ?'); break;
        case 'baume_mousse': p.sta.regen = 40 * F; msg('Une chaleur verte te parcourt.'); break;
        case 'hydromel': p.hp = Math.min(p.hpMax, p.hp + 4 * F); p.sta.regen = 40 * F; msg('Doux et sucré.'); break;
        case 'sel_garde': p.sta.garde = 45 * F; p.sta.burning = 0; msg('Une croûte de sel te protège des flammes.'); break;
        case 'encre_eternelle': game.bonusPermanent('encre', 6 * F); p.ink = p.inkMax; msg('L\'encre s\'approfondit en toi, pour toujours.'); break;
        case 'vitalite': game.bonusPermanent('vie', 2 * F); p.hp = p.hpMax; msg('Ton cœur bat plus fort, pour toujours.'); break;
        case 'sablier': p.sta.hate = 30 * F; msg('Les secondes s\'étirent autour de toi.'); break;
        case 'phenix': p.sta.phenix = 300 * F; msg('Une chaleur de plume te traverse. Elle veille sur toi.'); break;
        case 'grenouille': p.sta.small = 25 * F; p.sta.jump = 25 * F; p.sta.geant = 0; msg('Coa. Tu es toute petite, et tu bondis.'); break;
        case 'glouglou': p.sta.glouglou = 20 * F; msg('Tu fuis de partout. Littéralement.'); break;
        case 'ballon': p.sta.geant = 20 * F; p.sta.lowgrav = 20 * F; p.sta.small = 0; msg('Tu gonfles comme une baudruche.'); break;
        case 'boussole': p.sta.boussole = 15 * F; msg('La gauche est à droite. Ou l\'inverse.'); break;
        case 'luciole': p.sta.lumiere = 40 * F; msg('Tu brilles. Les runes n\'ont qu\'à bien se tenir.'); break;
      }
      return true;
    }
    let dx = aim.x - pcx, dy = aim.y - pcy; const d = Math.hypot(dx, dy) || 1; dx /= d; dy /= d;
    st.sp.push({ k: 'proj', potion: id, forte: !!forte, core: 'vie', x: pcx, y: pcy, vx: dx * 460, vy: dy * 460 - 80, r: 7, prm: { power: 1.6, size: 1.4, duration: 1, persist: 0 }, trig: 'contact', bounces: 0, life: 3, grav: 700, hits: new Set(), color: Pn.couleur });
    Son.sfx('cast', 'eau');
    return true;
  }
  function useLiquid(ing, aim) {
    const I = DATA.INGREDIENTS[ing]; const p = st.p; const pcx = p.x + p.w / 2, pcy = p.y + p.h * 0.45;
    let dx = aim.x - pcx, dy = aim.y - pcy; const d = Math.hypot(dx, dy) || 1; dx /= d; dy /= d;
    st.sp.push({ k: 'proj', liquide: M[I.liquide], core: 'eau', x: pcx, y: pcy, vx: dx * 440, vy: dy * 440 - 80, r: 7, prm: { power: 1, size: 1, duration: 1, persist: 0 }, trig: 'contact', bounces: 0, life: 3, grav: 700, hits: new Set(), color: I.couleur });
    Son.sfx('cast', 'eau');
    return true;
  }
  function spawnLiquid(m, x, y, n, maxR = 40) {
    let left = n;
    for (let r = 4; r <= maxR && left > 0; r += 6) Sim.forRadius(x, y - 6, r, (cx, cy, i, q) => { if (left > 0 && q === M.AIR) { Sim.set(cx, cy, m); left--; } });
  }
  function potionBurst(id, x, y, forte) {
    const Pn = DATA.POTIONS[id];
    part(x, y, Pn.couleur, 16, 100, 0.8, 3, 200);
    const F = forte ? 1.6 : 1;
    const prm = { power: 1.6 * F, size: 1.2 * F, duration: F, persist: 0 };
    switch (id) {
      case 'flamme': applyEffect('feu', x, y, 70, { ...prm, persist: 1 }, 'burst'); break;
      case 'croissance': applyEffect('vie', x, y, 130, { ...prm, power: 1 }, 'burst', { noPlayer: true }); for (const c of st.crs) if (U.circleRect(x, y, 130, c) && c.t === 'limace') { c.size = Math.min(2.2, c.size + 0.3); c.w = 36 * c.size; c.h = 24 * c.size; } msg('Tout verdit alentour.'); break;
      case 'calme': for (const c of st.crs) if (c.hp > 0 && U.circleRect(x, y, 140, c) && !c.sta.tame) affinite(c, 4); st.sp.push({ k: 'ring', core: 'vie', x, y, r: 140, life: 0.5, max: 0.5, color: Pn.couleur }); msg('Un calme rose se répand.'); break;
      case 'gel': applyEffect('froid', x, y, 80, prm, 'burst'); break;
      case 'orage': applyEffect('foudre', x, y, 80, prm, 'burst'); break;
      case 'vitriol': applyEffect('acide', x, y, 60, { ...prm, size: 1.6 }, 'burst'); break;
      case 'gregeois': spawnLiquid(M.HUILE, x, y, 40); setTimeout(() => {}, 0); Sim.forRadius(x, y - 10, 30, (cx, cy, i, q) => { if (q === M.AIR && Math.random() < 0.3) Sim.set(cx, cy, M.FEU, 30); }); applyEffect('feu', x, y, 50, { ...prm, power: 1 }, 'burst', { noGrid: true }); break;
      case 'poudre': spawnLiquid(M.POUDRE, x, y, 34); msg('Un tas de poudre. Recule avant d\'y mettre le feu.'); break;
      case 'glu': spawnLiquid(M.SEVE, x, y, 30); msg('Une flaque de sève. Qui va marcher dedans ?'); break;
      case 'petard': Sim.forRadius(x, y, 60, (cx, cy, i, q) => { if (q === M.AIR && Math.random() < 0.5) Sim.set(cx, cy, M.FUMEE, 90); }); Son.sfx('fizzle'); for (const c of st.crs) if (U.circleRect(x, y, 160, c)) { c.sta.sleep = 0; c.curieux = { x, y, t: 6 }; } msg('Pof. Un bruit ridicule, et beaucoup de fumée.'); break;
      case 'savon': { const ps = st.p; if (U.circleRect(x, y, 120, ps)) ps.sta.glisse = 15; for (const c of st.crs) if (U.circleRect(x, y, 120, c)) c.sta.glisse = 15; part(x, y, '#ffffff', 30, 90, 1.2, 4, -80); st.sp.push({ k: 'ring', core: 'eau', x, y, r: 120, life: 0.5, max: 0.5, color: '#e8e0c0' }); msg('Tout glisse ! Même toi.'); break; }
    }
    Son.sfx('burst', 'eau');
  }

  // ---------- Mains : interagir, creuser, porter ----------
  function nearestLiquid(px, py, r) {
    let best = null, bd = 1e9;
    Sim.forRadius(px, py, r, (x, y, i, m) => { if (P[m].liquid && LIQ_ING[m]) { const d = dist(px, py, (x + 0.5) * CS, (y + 0.5) * CS); if (d < bd) { bd = d; best = { x, y, m }; } } });
    return best;
  }
  function interactible(o) {
    if (o.mort) return false;
    if (o.t === 'porte') return true;
    if (o.t === 'champignon') return !o.pris;
    if (o.t === 'graine') return o.stage === 1 && o.racine && o.hauteur >= o.hMax;
    if (o.t === 'rune') return o.revele >= 1 && o.cooldown <= 0;
    if (o.t === 'page') return !o.lue;
    if (o.t === 'ruche') return true;
    if (o.t === 'levier') return true;
    if (o.t === 'coffre') return !o.ouvert;
    return false;
  }
  function findInteraction() {
    const p = st.p; const pcx = p.x + p.w / 2, pcy = p.y + p.h / 2;
    { let best = null, bd = 1e9; for (const o of st.objs) { if (!interactible(o)) continue; const d = dist(pcx, pcy, o.x + o.w / 2, o.y + o.h / 2); if (d < 70 + Math.max(o.w, o.h) / 2 && d < bd) { bd = d; best = o; } } if (best) return { t: best.t, o: best }; }
    const liq = nearestLiquid(pcx, pcy + 10, 42);
    if (liq && !p.carry) return { t: 'liquide', liq };
    if (p.carry) return { t: 'poser' };
    for (const o of st.objs) if (o.portable && !o.mort && dist(pcx, pcy, o.x + o.w / 2, o.y + o.h / 2) < 60) return { t: 'porter', o };
    for (const c of st.crs) if (c.portable && c.hp > 0 && c.sta.tame && dist(pcx, pcy, c.x + c.w / 2, c.y + c.h / 2) < 60) return { t: 'porter', o: c };
    return null;
  }
  function labelInteraction(it) {
    if (!it) return null;
    switch (it.t) {
      case 'porte': return st.p.carry && st.p.carry.hp !== undefined && game.progress.labo && game.progress.labo.terrarium ? 'Entrer au labo avec ' + nomCreature(st.p.carry.t).toLowerCase() : 'Entrer au labo';
      case 'champignon': return 'Cueillir le champignon';
      case 'graine': return 'Cueillir une racine';
      case 'rune': return 'Lire la rune';
      case 'page': return 'Lire la page déchirée';
      case 'levier': return 'Basculer le levier';
      case 'coffre': return it.o.canal ? 'Examiner le coffre scellé' : 'Ouvrir le coffre';
      case 'ruche': return it.o.enfume > 0 ? 'Prendre du miel (les abeilles dorment)' : 'Prendre du miel (attention aux abeilles)';
      case 'liquide': return 'Remplir une fiole (' + P[it.liq.m].nom + ')';
      case 'poser': return 'Poser (clic droit : lancer)';
      case 'porter': return 'Porter';
    }
    return null;
  }
  function interact() {
    if (st.control) { releaseControl(); return; }
    const it = findInteraction(); if (!it) return;
    const p = st.p; const pcx = p.x + p.w / 2, pcy = p.y + p.h / 2;
    switch (it.t) {
      case 'porte': Son.sfx('door'); if (p.carry && p.carry.hp !== undefined && game.progress.labo && game.progress.labo.terrarium) { const c = p.carry; p.carry = null; c.carried = false; c.hp = 0; c.respawn = 1e9; c.mort = true; game.terrariumAjoute(c.t); } game.goLab(); break;
      case 'champignon': it.o.pris = true; it.o.mort = true; game.gainIngredient('champignon'); part(it.o.x + 11, it.o.y, '#5a4a7d', 8, 40); break;
      case 'graine': it.o.racine = false; it.o.regrow = 0; game.gainIngredient('racine'); part(it.o.x + 10, it.o.y - it.o.hauteur * CS, '#5c8f3e', 8, 40, 0.6, 3, 0, 'feuille'); break;
      case 'ruche': if (it.o.enfume > 0) { game.gainIngredient('miel'); part(it.o.x + 11, it.o.y + 20, '#d8a03a', 8, 40); } else { if (p.sta.stone <= 0 && p.sta.armure <= 0) p.hp -= 1.5; p.vx = -p.face * 300; p.vy = -200; Son.sfx('hurt'); msg('Les abeilles n\'apprécient pas. Enfume-les d\'abord.', 'warn'); } break;
      case 'levier': it.o.etat = !it.o.etat; Son.sfx('click'); part(it.o.x + 10, it.o.y + 8, '#8d6a3c', 4, 30); break;
      case 'coffre': { const o = it.o; if (!o.canal) { ouvrirCoffre(o); break; } const C = st.circuits && st.circuits[o.canal]; const n = C ? C.em.filter(emetActif).length : 0, tot = C ? C.em.length : 0; msg((o.nom || 'Un coffre') + ', scellé par un sceau de verrou. ' + (o.indice || '') + ' (' + n + '/' + tot + ' actifs)'); Son.sfx('click'); break; }
      case 'page': it.o.lue = true; game.lirePage(it.o.page); part(it.o.x + 10, it.o.y, '#efe3c4', 10, 50, 0.8, 3, -40); break;
      case 'rune': { const o = it.o; o.cooldown = 30; if (!o.lu) { o.lu = true; evt('rune'); msg('Tu déchiffres la rune. Elle te confie une lueur captive.'); } game.gainIngredient('lueur'); part(o.x + 20, o.y + 30, '#d8a63a', 12, 60, 0.9, 2, 0, 'spark'); break; }
      case 'liquide': {
        const m = it.liq.m; let n = 0;
        Sim.forRadius((it.liq.x + 0.5) * CS, (it.liq.y + 0.5) * CS, 18, (x, y, i, q) => { if (q === m && n < 10) { Sim.set(x, y, M.AIR); n++; } });
        game.gainIngredient(LIQ_ING[m]); part(pcx, pcy + 10, P[m].color, 8, 40, 0.6);
        if (m === M.LAVE && !p.sta.stone) { p.hp -= 1; p.sta.burning = 1; msg('La fiole est brûlante !', 'warn'); }
        if (m === M.ACIDE && !p.sta.stone) { p.hp -= 0.5; msg('Ça fume... attention aux doigts.', 'warn'); }
        break;
      }
      case 'porter': p.carry = it.o; it.o.carried = true; Son.sfx('pickup'); evt('porte'); break;
      case 'poser': drop(); break;
    }
  }
  function drop(throwTo) {
    const p = st.p; const o = p.carry; if (!o) return;
    p.carry = null; o.carried = false;
    o.x = p.x + p.w / 2 - o.w / 2; o.y = p.y - o.h - 2;
    if (throwTo) { let dx = throwTo.x - (p.x + p.w / 2), dy = throwTo.y - p.y; const d = Math.hypot(dx, dy) || 1; o.vx = dx / d * 420; o.vy = dy / d * 420 - 120; Son.sfx('cast', 'vent'); evt('lancer'); }
    else { o.vx = p.face * 60; o.vy = -60; }
  }
  function dig(aim, dt) {
    const p = st.p; p.digT -= dt; if (p.digT > 0) return;
    p.digT = 0.06;
    const pcx = p.x + p.w / 2, pcy = p.y + p.h * 0.5;
    let dx = aim.x - pcx, dy = aim.y - pcy; const d = Math.hypot(dx, dy) || 1; dx /= d; dy /= d;
    const tx = pcx + dx * 26, ty = pcy + dy * 26;
    let n = 0; const got = [];
    const zn = (L.zones.find((z) => tx >= z.x && tx < z.x + z.w) || {}).nom, ZI = DATA.ENCRE_ZONES[zn];
    Sim.forRadius(tx, ty, 11, (x, y, i, m) => {
      if (n >= 3 || !P[m].dig) return;
      if (ZI && ZI.mats.some((q) => M[q] === m) && (!ZI.eau || p.liq) && Math.random() < ZI.p && !got.includes(ZI.ing)) got.push(ZI.ing);
      if (m === M.CRISTAL && Math.random() > 0.25) return;
      Sim.set(x, y, M.AIR); n++;
      const r = Math.random();
      if (m === M.NEIGE && r < 0.12) got.push('flocon');
      else if (m === M.CRISTAL && r < 0.6) got.push('eclat');
      else if ((m === M.HERBE || m === M.PLANTE) && r < 0.12) got.push('rosee');
      else if (m === M.MOUSSE && r < 0.35) got.push('mousse');
      else if (m === M.SEL && r < 0.3) got.push('sel');
      else if (m === M.POUDRE && r < 0.4) got.push('poudre');
      part((x + 0.5) * CS, (y + 0.5) * CS, P[m].color, 1, 40, 0.5, 2, 300);
    });
    for (const g of got) game.gainIngredient(g);
    if (n > 0) { p.anim += 0.5; if (Math.random() < 0.3) Son.sfx('step', 'terre'); }
  }

  const CAPS_SORTS = { trap: 30, expire: 40, totem: 12, field: 40, attente: 20, orbit: 9, bulle: 8, repeat: 24, timer: 30, beamtimer: 20, tornade: 6, singularite: 6, rain: 10, echo: 30, vague: 10, colonne: 10, rafale: 6 };
  // ---------- Mise à jour ----------
  function update(dt, inp, aim) {
    time += dt;
    const p = st.p;
    memoriser(dt);
    // plafond des sorts posés : au-delà, le plus ancien s'éteint
    { const vus = {}; for (let i = st.sp.length - 1; i >= 0; i--) { const q = st.sp[i]; const c = CAPS_SORTS[q.k]; if (!c || q.mort) continue; vus[q.k] = (vus[q.k] || 0) + 1; if (vus[q.k] > c) q.mort = true; } }
    if (p.forme && !(p.sta.forme > 0)) finFormeSoi();
    updateGFields(dt);
    majMecanismes(dt);
    Sim.step({ x0: Math.floor((st.cam.x - VW) / (Sim.CS * Sim.CH)), x1: Math.floor((st.cam.x + VW * 2) / (Sim.CS * Sim.CH)), y0: Math.floor((st.cam.y - VH) / (Sim.CS * Sim.CH)), y1: Math.floor((st.cam.y + VH * 2) / (Sim.CS * Sim.CH)) });
    blocsTombants();
    updateMeteo(dt);
    for (const k in p.sta) if (p.sta[k] > 0) p.sta[k] = Math.max(0, p.sta[k] - dt);
    p.inv = Math.max(0, (p.inv || 0) - dt);
    // pesanteur personnelle
    if (p.pg) { p.pg.t -= dt; if (p.pg.t <= 0) { p.pg = null; msg('Ta pesanteur redevient normale.'); } }
    const G = playerGrav();
    const Gstd = !G || (G.gx === 0 && G.gy === 1);
    const Gvol = p.sta.vol > 0 || (G && G.mag === 0);
    const enclume = !!(p.pg && p.pg.enclume);
    p.G = G;
    // taille (couché(e) contre un mur : la boîte pivote)
    const wantH = p.sta.small > 0 ? 26 : p.sta.geant > 0 ? 84 : 50, wantW = p.sta.small > 0 ? 14 : p.sta.geant > 0 ? 42 : 26;
    const horiz = G && G.gx !== 0 && !Gvol;
    const W2 = horiz ? wantH : wantW, H2 = horiz ? wantW : wantH;
    if (p.h !== H2 || p.w !== W2) {
      if (!horiz && p.w <= p.h) { const bottom = p.y + p.h, cx = p.x + p.w / 2; p.h = H2; p.w = W2; p.y = bottom - p.h; p.x = cx - p.w / 2; }
      else { const cx = p.x + p.w / 2, cy = p.y + p.h / 2; p.w = W2; p.h = H2; p.x = cx - p.w / 2; p.y = cy - p.h / 2; }
      unstick(p);
    }
    p.ink = Math.min(p.inkMax, p.ink + dt * p.inkRegen * (game.opt ? game.opt.regen : 1));
    // statuts qui blessent / coûtent
    if (p.sta.burning > 0 && !p.sta.stone) { p.hp -= dt * 0.8; if (Math.random() < 0.3) part(p.x + p.w / 2, p.y + p.h * 0.3, '#d9622b', 1, 40, 0.5, 3, -150); }
    if (p.sta.lumiere > 0 && Math.random() < 0.2) part(p.x + p.w / 2, p.y + p.h * 0.4, '#d8a63a', 1, 30, 0.6, 2, -40, 'spark');
    if (p.sta.invisible > 0 && Math.random() < 0.2) part(p.x + p.w / 2, p.y + p.h * 0.5, '#5a4a7d', 1, 30, 0.6, 2, -30);
    if (p.sta.hoquet > 0 && Math.random() < dt * 2) { const cx = Math.floor((p.x + p.w / 2) / CS), cy = Math.floor(p.y / CS) - 1; if (Sim.get(cx, cy) === M.AIR) Sim.set(cx, cy, M.FUMEE, 60); Son.sfx('click'); }
    if (p.sta.glouglou > 0 && Math.random() < dt * 6) { const cx = Math.floor((p.x + Math.random() * p.w) / CS), cy = Math.floor((p.y + p.h) / CS); if (Sim.get(cx, cy) === M.AIR) Sim.set(cx, cy, M.EAU); }
    if (p.sta.vol > 0 && p.forme !== 'chauve') { p.ink -= dt * 1.2; if (p.ink <= 0) { p.ink = 0; p.sta.vol = 0; msg('Plus d\'encre : tu retombes.', 'warn'); } if (Math.random() < 0.3) part(p.x + p.w / 2, p.y + p.h, '#6c5ab8', 1, 30, 0.6, 2, 60, 'spark'); }
    // liquide où l'on se trouve
    { const lq = liquidOf(p); if (lq && !p.liq && Math.abs(p.vy) > 250) part(p.x + p.w / 2, p.y + p.h * 0.6, P[lq].color, 18, 260, 0.8, 2.2, 900, 'goutte'); p.liq = lq; }
    const inWater = p.liq === M.EAU || p.liq === M.SAUMURE || p.liq === M.HUILE || p.liq === M.ACIDE || p.liq === M.SEVE || p.liq === M.MIEL || p.liq === M.BOUE;
    if (p.liq === M.MIEL) p.hp = Math.min(p.hpMax, p.hp + dt * 0.4);
    if (p.sta.regen > 0) p.hp = Math.min(p.hpMax, p.hp + dt * 0.35);
    if (p.liq === M.EAU || p.liq === M.SAUMURE) { p.sta.wet = 8; p.sta.burning = 0; }
    if (p.sta.garde > 0) p.sta.burning = 0;
    { const tp = Sim.tempAt(p.x + p.w / 2, p.y + p.h * 0.5);
      if (tp > 140 && !p.sta.stone && !(p.sta.garde > 0)) { p.hp -= dt * (tp - 140) / 70; if (time - (p.chaudT || -99) > 6) { p.chaudT = time; msg('Il fait brûlant ici !', 'warn'); } }
      else if (tp < 40 && !(p.sta.garde > 0) && p.forme !== 'lapin') { p.sta.lent = Math.max(p.sta.lent || 0, 0.3); if (time - (p.froidT || -99) > 8) { p.froidT = time; msg('Le froid t\'engourdit.', 'warn'); } } }
    if (p.liq === M.LAVE && !p.sta.stone) { p.hp -= dt * (p.sta.garde > 0 ? 0.4 : 3); p.sta.burning = 2; if (Math.random() < 0.5) part(p.x + p.w / 2, p.y + p.h, '#e0622b', 2, 60, 0.5, 3, -200); }
    if (p.liq === M.ACIDE && !p.sta.stone && !p.sta.dissous) { p.hp -= dt * 1.2; if (Math.random() < 0.3) part(p.x + p.w / 2, p.y + p.h * 0.6, '#8fbf2a', 1, 40, 0.5, 3, -100); }
    if (p.liq === M.EAU && p.sta.branchies <= 0 && Sim.matAt(p.x + p.w / 2, p.y + 4) === M.EAU) { p.air = (p.air || 8) - dt; if (p.air <= 0) { p.hp -= dt * 1.5; if (Math.random() < 0.05) msg('Tu manques d\'air !', 'warn'); } } else p.air = 8;
    // patins de givre : geler l'eau sous les pieds
    if (p.sta.patins > 0) { Sim.forRadius(p.x + p.w / 2, p.y + p.h + 3, 16, (x, y, i, m) => { if (m === M.EAU && Math.random() < 0.5) Sim.set(x, y, M.GLACE); }); }
    // acide sur soi : dissoudre autour
    if (p.sta.dissous > 0) { Sim.forRadius(p.x + p.w / 2, p.y + p.h / 2, p.h * 0.7, (x, y, i, m) => { const q = P[m]; if (q.corrode > 0 && !q.liquid && Math.random() < q.corrode * 0.6) Sim.set(x, y, Math.random() < 0.5 ? M.FUMEE : M.AIR, 15); }); }

    // --- déplacement ---
    const speedMul = (p.sta.vitesse > 0 || p.sta.hate > 0 ? 1.7 : 1) * (p.sta.lent > 0 ? 0.4 : 1) * (p.sta.small > 0 ? 0.8 : 1) * (p.liq === M.SEVE || p.liq === M.MIEL ? 0.25 : p.liq === M.BOUE ? 0.4 : 1);
    if (p.sta.hate > 0) { p.ink = Math.min(p.inkMax, p.ink + dt * p.inkRegen * 2); st.tod = (st.tod + dt / DAY * 3) % 1; }
    const speed = (inWater ? (p.sta.branchies > 0 ? 220 : 130) : 250) * speedMul;
    const dirX = ((inp.right ? 1 : 0) - (inp.left ? 1 : 0)) * (p.sta.boussole > 0 ? -1 : 1);
    const dirY = (inp.down ? 1 : 0) - (inp.up ? 1 : 0);
    const friction = p.sta.glisse > 0 ? 0.6 : 14;
    if (Gvol) {
      // vol libre (sort sur soi) ou apesanteur d'un champ (plus mou)
      const fs = p.sta.vol > 0 ? 270 : 170;
      p.vx = lerp(p.vx, dirX * fs, Math.min(1, dt * 6)); p.vy = lerp(p.vy, dirY * fs - (inp.jumpHeld ? fs : 0), Math.min(1, dt * 6));
      if (dirX) p.face = dirX; p.anim += dt * 4;
      p.climbing = false;
    } else if (!Gstd) {
      // pesanteur latérale ou inversée : on marche sur la surface visée
      const gx = G.gx, gy = G.gy, mag = G.mag;
      const tx = gy !== 0 ? 1 : 0, ty = gy !== 0 ? 0 : 1;
      const dirT = gy !== 0 ? dirX : dirY;
      let vA = p.vx * gx + p.vy * gy, vT = p.vx * tx + p.vy * ty;
      const grounded = blockedBy({ x: p.x + gx * 2, y: p.y + gy * 2, w: p.w, h: p.h }, dynSolids());
      const accel = grounded ? 2200 : 1200;
      if (dirT) {
        vT = clamp(vT + dirT * accel * dt, -speed, speed); p.anim += dt * 10;
        const th = Math.atan2(gy, gx) - Math.PI / 2; const rx = Math.cos(th), ry = Math.sin(th);
        p.face = Math.sign((tx * rx + ty * ry) * dirT) || p.face;
      } else vT *= grounded ? Math.max(0, 1 - friction * dt) : Math.max(0, 1 - 3 * dt);
      vA = Math.min(vA + GRAV * mag * dt * (inWater ? 0.15 : 1), inWater ? 120 : 1100);
      if (grounded) p.coyote = 0.1; else p.coyote -= dt;
      if (inp.jump) p.jumpBuf = 0.12; else p.jumpBuf -= dt;
      if (p.jumpBuf > 0 && (p.coyote > 0 || inWater)) { vA = -(inWater ? 360 : 585); p.coyote = 0; p.jumpBuf = 0; Son.sfx('jump'); }
      if (!inp.jumpHeld && vA < -150) vA += 800 * dt;
      p.vx = vA * gx + vT * tx; p.vy = vA * gy + vT * ty;
      p.climbing = false;
    } else {
      const accel = p.onGround ? (p.sta.glisse > 0 ? 300 : 2200) : 1200;
      if (dirX !== 0) { p.vx = clamp(p.vx + dirX * accel * dt, -speed, speed); p.face = dirX; p.anim += dt * 10; }
      else { p.vx = p.onGround ? p.vx * Math.max(0, 1 - friction * dt) : p.vx * Math.max(0, 1 - 3 * dt); }
      if (Math.abs(p.vx) > speed) p.vx *= Math.max(0, 1 - 4 * dt);
      // grimper (plantes)
      p.climbing = false;
      if ((inp.up || (inp.down && !p.onGround)) && Sim.rectHas(p, (m) => P[m].climb)) { p.climbing = true; p.vy = inp.up ? -160 : 140; p.vx *= 0.5; if (inp.up) p.anim += dt * 8; }
      let g = GRAV * (G ? G.mag : 1);
      const nage = inWater && !enclume;
      if (p.sta.lowgrav > 0) g *= 0.35;
      if (p.sta.glide > 0 && p.vy > 0) g *= 0.25;
      if (nage) g *= 0.15;
      if (!p.climbing) p.vy = Math.min(p.vy + g * dt, nage ? 120 : 1100 * (enclume ? 1.4 : 1));
      if (nage) p.vy *= Math.max(0, 1 - 1.5 * dt);
      if (p.onGround) p.coyote = 0.1; else p.coyote -= dt;
      if (inp.jump) p.jumpBuf = 0.12; else p.jumpBuf -= dt;
      if (p.jumpBuf > 0 && (p.coyote > 0 || nage || p.climbing)) {
        const j = inWater ? 360 : 585 * (p.sta.jump > 0 ? 1.6 : 1);
        p.vy = -j; p.coyote = 0; p.jumpBuf = 0; p.climbing = false; Son.sfx('jump');
        if (!inWater) part(p.x + p.w / 2, p.y + p.h, '#8a7a5a', 4, 40, 0.3, 2);
      }
      if (!inp.jumpHeld && p.vy < -150 && !inWater && !p.climbing) p.vy += 800 * dt;
    }
    if (st.control) { p.vx = 0; }
    p.canStep = Gstd && !Gvol;
    const vyAvant = p.vy;
    moveBody(p, dt);
    if (!Gstd && !Gvol) p.onGround = blockedBy({ x: p.x + G.gx * 2, y: p.y + G.gy * 2, w: p.w, h: p.h }, dynSolids());
    if (enclume && p.onGround && vyAvant > 420) crush(p);
    else if (Gstd && p.onGround && vyAvant > 1000 && !inWater && !(p.sta.glide > 0) && !(p.sta.vol > 0) && !(p.sta.lowgrav > 0) && !(p.sta.stone > 0)) { p.hp -= (vyAvant - 950) / 120; st.shake = 0.25; part(p.x + p.w / 2, p.y + p.h, '#8a7a5a', 10, 90, 0.5, 2, 300); msg('Aïe ! La chute fait mal.', 'warn'); }
    updateLien(dt, inp);
    updatePortails(dt);
    // pousser une caisse
    if (dirX !== 0) for (const o of st.objs) if (o.t === 'caisse' && !o.mort && !o.carried) { const probe = { x: p.x + dirX * 2, y: p.y, w: p.w, h: p.h }; if (U.rectsOverlap(probe, o)) o.vx = dirX * (p.sta.geant > 0 ? 160 : 70); }
    if (p.y > L.h + 50) { msg('Tu tombes dans l\'encre noire... et te réveilles devant ta porte.'); respawn(); }
    if (p.onGround && Math.abs(p.vx) > 30 && Math.random() < dt * 6) Son.sfx('step', 'terre');
    if (p.gestes) for (const h of ['R', 'L']) { const g = p.gestes[h]; if (!g) continue; g.t -= dt; if (g.t <= 0) { p.gestes[h] = null; const tient = Seal.triggers(g.seal).includes('tenu'); if (tient && !tientMain(h)) { p.ink = Math.min(p.inkMax, p.ink + (g.cost || 0) * 0.8); msg('Tu as lâché trop tôt : le sceau se défait. Garde le clic enfoncé.'); part(p.x + p.w / 2, p.y + p.h * 0.4, g.color, 8, 40, 0.5, 2, 0, 'spark'); continue; } const aimL = tient ? toWorld(game.inp.mouse.x, game.inp.mouse.y) : g.aim; p.lastCast = { t: time, a: Math.atan2(aimL.y - (p.y + p.h * 0.4), aimL.x - (p.x + p.w / 2)), c: g.color }; launch(g.seal, { x: p.x + p.w / 2, y: p.y + p.h * 0.45 }, aimL, { depth: 0, player: true, charge: g.charge, encre: g.encre, tenu: tient ? h : null }); } }
    if (p.selfTimer) { p.selfTimer.t -= dt; if (p.selfTimer.t <= 0) { const q = p.selfTimer; p.selfTimer = null; selfCast(q.spec, q.aim); } }
    if (p.hp <= 0 && p.sta.phenix > 0) { p.sta.phenix = 0; p.hp = p.hpMax; p.inv = 2; p.sta.burning = 0; part(p.x + p.w / 2, p.y + p.h / 2, '#e8842a', 30, 140, 1, 4, -120); Son.sfx('unlock'); msg('Tu te relèves dans un battement d\'ailes de feu.'); }
    if (p.hp <= 0) { msg('Tu t\'évanouis... et te réveilles devant ta porte, un peu honteux(se).', 'warn'); Son.sfx('hurt'); respawn(); }
    // objet porté
    if (p.carry) { const o = p.carry; const g = p.G && p.G.mag > 0 ? p.G : { gx: 0, gy: 1 }; const cx = p.x + p.w / 2 - g.gx * (p.w / 2 + o.w / 2 + 4), cy = p.y + p.h / 2 - g.gy * (p.h / 2 + o.h / 2 + 4); o.x = cx - o.w / 2; o.y = cy - o.h / 2; o.vx = 0; o.vy = 0; }
    // creuser
    if (inp.dig) dig(aim, dt);
    // électricité sur le joueur
    if (p.sta.vitesse <= 0 && !p.sta.stone && !p.sta.armure && Sim.rectHas(p, (m, i) => Sim.elec[i] > 0) && p.inv <= 0) { p.hp -= 1; p.inv = 1; p.vy -= 250; msg('Zap !', 'warn'); Son.sfx('hurt'); part(p.x + p.w / 2, p.y + p.h / 2, '#e0c43a', 10, 100, 0.4, 2, 0, 'spark'); }
    // contrôle d'une créature
    if (st.control) { st.control.t -= dt; const c = st.control.c; if (st.control.t <= 0 || c.hp <= 0) releaseControl(); else { c.ctl = { dirX, jump: inp.jump, dirY }; } }
    // observation : île volante (et laquelle)
    if (p.onGround && p.y < 85 * CS) { if (st.ileT <= 0) { st.ileT = 120; game.observe('ile'); } const idx = [110, 300, 520, 730].map(Gen.X).reduce((b, cx, i, a) => (Math.abs(cx * CS - p.x) < Math.abs(a[b] * CS - p.x) ? i : b), 0); evt('ile', idx); } if (st.ileT > 0) st.ileT -= dt;
    // défis : lac sec, sommet, profondeur
    { const lx0 = Gen.X(222) * CS, lx1 = Gen.X(328) * CS; const px = p.x + p.w / 2;
      if (px < lx0) st.lac = { wet: false, from: 'ouest' };
      else if (px > lx1) { if (st.lac && st.lac.from === 'ouest' && !st.lac.wet) st.lacSec = true; st.lac = null; }
      else if (st.lac && (p.sta.wet > 0 || p.liq)) st.lac.wet = true; }
    if (p.x > Gen.X(380) * CS && p.x < Gen.X(420) * CS && p.y < 90 * CS) st.vuSommet = true;
    st.maxDepth = Math.max(st.maxDepth, (p.y + p.h) / CS);
    st.defiT -= dt; if (st.defiT <= 0) { st.defiT = 1; game.checkDefis(defiInfo()); }
    // ambiance musicale et exploration de la carte
    st.ambT = (st.ambT || 0) - dt;
    if (st.ambT <= 0) {
      st.ambT = 0.5;
      const pcx = clamp(Math.floor((p.x + p.w / 2) / CS), 0, Sim.W - 1), pcy = (p.y + p.h / 2) / CS;
      const sous = Sim.surf && pcy > Sim.surf[pcx] + 14, ciel = pcy < 85;
      const zq = L.zones.find((z) => p.x >= z.x && p.x < z.x + z.w) || {}; const zn = zq.mood || zq.nom;
      Son.setMood(sous ? 'souterrain' : ciel ? 'ciel' : zn || 'Le Jardin', daylight() < 0.3);
      game.explorer(st.cam.x / CS, st.cam.y / CS, VW / CS, VH / CS);
    }
    // zone courante
    const z = L.zones.find((z) => p.x >= z.x && p.x < z.x + z.w);
    if (z && z.nom !== st.lastZone) { st.lastZone = z.nom; game.zoneChange(z.nom); }

    majBulles();
    updateObjs(dt);
    updateCreatures(dt);
    retenir();
    updateSpells(dt);
    PH.update(dt);
    if ((nappeT = (nappeT || 0) + 1) % 3 === 0) Son.nappes(PH.nappes(st.cam.x + VW / 2, st.cam.y + VH / 2, VW / 2));
    updateParts(dt);
    updatePickups(dt);
    // caméra
    const foc = st.control ? st.control.c : p;
    const tx = clamp(foc.x + foc.w / 2 - VW / 2, 0, L.w - VW), ty = clamp(foc.y + foc.h / 2 - VH * 0.66, 0, L.h - VH);
    st.cam.x = lerp(st.cam.x, tx, Math.min(1, dt * 6)); st.cam.y = lerp(st.cam.y, ty, Math.min(1, dt * 5));
    if (st.shake > 0) st.shake -= dt;
    if (st.flash > 0) st.flash -= dt;
  }
  function defiInfo() {
    let vigneMax = 0, torches = 0, golemTame = false;
    for (const o of st.objs) { if (o.t === 'torche' && o.lit) torches++; if (o.t === 'graine') vigneMax = Math.max(vigneMax, o.hauteur || 0); }
    for (const c of st.crs) if (c.t === 'golem' && c.hp > 0 && c.sta.tame) golemTame = true;
    return { torches, vigneMax, golemTame, lacSec: st.lacSec, vuSommet: st.vuSommet, profondeur: st.maxDepth,
      glaceLac: Sim.countRect(223, 125, 327, 165, M.GLACE), glaceSommet: Sim.countRect(385, 65, 415, 82, M.GLACE) };
  }
  // ---- Gravité : champs locaux (st.gz, partagés avec la simulation) ----
  function snapDir(dx, dy) { return Math.abs(dx) > Math.abs(dy) ? [Math.sign(dx) || 1, 0] : [0, Math.sign(dy) || 1]; }
  function addGField(x, y, r, gx, gy, mag, life, rect = null) {
    const z = { x, y, r, gx, gy, mag, life, max: life, rect };
    st.gz.push(z);
    part(x, y, '#6c5ab8', 14, 60, 0.8, 2, 0, 'spark');
    return z;
  }
  const dansZone = (z, x, y) => (z.rect ? x >= z.rect.x0 && x <= z.rect.x1 && y >= z.rect.y0 && y <= z.rect.y1 : (x - z.x) * (x - z.x) + (y - z.y) * (y - z.y) <= z.r * z.r);
  function gravOf(b) {
    const cx = b.x + b.w / 2, cy = b.y + b.h / 2;
    for (const z of st.gz) if (dansZone(z, cx, cy)) return z;
    return null;
  }
  function gravField(b) { const z = gravOf(b); return !!(z && (z.mag === 0 || z.gy < 0)); }
  // applique la pesanteur (locale ou normale) à un corps ; k : facteur (liquides...)
  function applyGrav(b, dt, k = 1, vmax = 1000) {
    const z = gravOf(b);
    if (!z) { b.vy = Math.min(b.vy + GRAV * dt * k, vmax); return; }
    if (z.mag === 0) { b.vx *= Math.max(0, 1 - 0.6 * dt); b.vy *= Math.max(0, 1 - 0.6 * dt); b.vy -= 25 * dt; return; }
    b.vx = clamp(b.vx + GRAV * z.mag * z.gx * dt * k, -vmax, vmax);
    b.vy = clamp(b.vy + GRAV * z.mag * z.gy * dt * k, -vmax, vmax);
    if (z.gy !== 1) b.onGround = false;
  }
  function updateGFields(dt) {
    for (const z of st.gz) {
      z.life -= dt;
      if (z.mag >= 2.2 && z.gy === 1) {
        for (const c of st.crs) if (c.hp > 0 && c.onGround && gravOf(c) === z) { hurt(c, dt * 0.9 * z.mag * (c.t === 'golem' ? 0.5 : 1)); c.sta.stun = Math.max(c.sta.stun, 0.3); if (Math.random() < dt * 6) part(c.x + c.w / 2, c.y + c.h, '#8a7a6a', 2, 40, 0.5, 2, 200); }
        for (const o of st.objs) if (o.t === 'caisse' && !o.mort && o.onGround && gravOf(o) === z) { o.hp -= dt * z.mag * 0.4; if (o.hp <= 0) { o.mort = true; part(o.x + o.w / 2, o.y + o.h / 2, '#8a6b2f', 12, 90); } }
        const p = st.p; if (p.onGround && gravOf(p) === z && !(p.sta.stone > 0) && !(p.sta.armure > 0)) p.hp -= dt * 0.4 * z.mag;
      }
    }
    st.gz = st.gz.filter((z) => z.life > 0);
    Sim.gzones = st.gz;
  }
  // gravité personnelle (sort sur soi) ou du champ où l'on se trouve ; null = normale
  function playerGrav() {
    const p = st.p;
    if (p.pg && p.pg.t > 0) return p.pg;
    const z = gravOf(p);
    return z ? { gx: z.gx, gy: z.gy, mag: z.mag } : null;
  }
  function setPG(gx, gy, mag, t, extra = {}) { st.p.pg = Object.assign({ gx, gy, mag, t }, extra); st.p.onGround = false; }

  // ---------- Monde vivant : saisons, repousse, naissances ----------
  const JOURS_SAISON = 2;
  const SAISONS = ['printemps', 'ete', 'automne', 'hiver'];
  const NOM_SAISON = { printemps: 'Le printemps', ete: 'L\'été', automne: 'L\'automne', hiver: 'L\'hiver' };
  const TEINTES = {
    printemps: { herbe: '#78a24a', plante: '#6a9a45', mousse: '#7a9a4a' },
    ete:       { herbe: '#8aa840', plante: '#5a8a35', mousse: '#7a9a3a' },
    automne:   { herbe: '#b0943a', plante: '#c0702a', mousse: '#8a8a3a' },
    hiver:     { herbe: '#a0aa92', plante: '#7f8f78', mousse: '#8a9a88' },
  };
  function saison() { return SAISONS[Math.floor((st.jour || 0) / JOURS_SAISON) % 4]; }
  function teinterSaison() {
    const T = TEINTES[saison()]; Sim.P[M.HERBE].color = T.herbe; Sim.P[M.PLANTE].color = T.plante; Sim.P[M.MOUSSE].color = T.mousse; Sim.dirtyAll(); st.saisonVue = saison();
  }
  function surfaceY(x) { for (let y = 0; y < Sim.H; y++) { const m = Sim.get(x, y); if (m !== M.AIR && !P[m].gas) return y; } return -1; }
  function zoneDe(px) { return (L.zones.find((z) => px >= z.x && px < z.x + z.w) || {}).nom; }
  function repousseArbre(a) {
    const sy = surfaceY(a.x); if (sy < 0) return false;
    let bois = 0; for (let y = sy - a.h; y <= sy; y++) for (const x of [a.x, a.x + 1]) if (Sim.get(x, y) === M.BOIS) bois++;
    if (bois >= a.h) return false;
    const base = Sim.get(a.x, sy); if (base !== M.TERRE && base !== M.HERBE && base !== M.BOIS && base !== M.CENDRE) return false;
    const h = Math.max(5, Math.round(a.h * 0.7));
    for (let k = 1; k <= h; k++) for (const x of [a.x, a.x + 1]) { const m = Sim.get(x, sy - k); if (m === M.AIR || m === M.HERBE || m === M.PLANTE || m === M.CENDRE) Sim.set(x, sy - k, M.BOIS); }
    const rx = Math.max(3, a.rx - 1), ry = Math.max(2, a.ry - 1);
    for (let yy = -ry; yy <= ry; yy++) for (let xx = -rx; xx <= rx; xx++) { if ((xx * xx) / (rx * rx) + (yy * yy) / (ry * ry) > 1) continue; const X = a.x + 1 + xx, Y = sy - h - ry + 1 + yy; if (Sim.get(X, Y) === M.AIR && Math.random() < 0.85) Sim.set(X, Y, M.PLANTE); }
    return true;
  }
  function vivant(dt) {
    if (st.saisonVue !== saison()) { const premiere = !st.saisonVue; teinterSaison(); if (!premiere) { game.zoneChange(NOM_SAISON[saison()]); msg({ printemps: 'Le printemps revient : tout repousse, les bêtes font des petits.', ete: 'L\'été : l\'herbe est haute et le soleil sèche les mares.', automne: 'L\'automne : les feuilles tombent, la forêt rougit.', hiver: 'L\'hiver : la neige tombe, les lacs gèlent en surface.' }[saison()]); evt('saison', saison()); } }
    const S = saison();
    // feuilles d'automne
    if (S === 'automne' && L.arbres && Math.random() < dt * 6) { const a = L.arbres[(Math.random() * L.arbres.length) | 0]; const x = (a.x + 1) * CS; if (inView(x, st.cam.y + 300)) { const sy = surfaceY(a.x); st.parts.push({ x: x + (Math.random() - 0.5) * a.rx * CS * 2, y: (sy - a.h - a.ry) * CS, vx: 20 + Math.random() * 30, vy: 20, life: 3, max: 3, color: Math.random() < 0.5 ? '#c0702a' : '#d8a03a', size: 3, grav: 30, type: 'feuille' }); } }
    st.vivT = (st.vivT || 0) + dt; if (st.vivT < 1.5) return; st.vivT = 0;
    const pousse = { printemps: 0.5, ete: 0.25, automne: 0.08, hiver: 0 }[S];
    for (let k = 0; k < 40; k++) {
      const x = 1 + ((Math.random() * (Sim.W - 2)) | 0), y = surfaceY(x); if (y <= 1) continue;
      const m = Sim.get(x, y), zn = zoneDe(x * CS), r = Math.random();
      if (inView(x * CS, y * CS) && S !== 'hiver' && m !== M.EAU) continue; // la repousse se fait hors de vue
      if (m === M.TERRE && zn !== 'Le Désert' && Sim.get(x, y - 1) === M.AIR && r < pousse) Sim.set(x, y - 1, M.HERBE);
      else if (m === M.CENDRE && S !== 'hiver' && r < 0.3) Sim.set(x, y, M.TERRE);
      else if (S === 'hiver' && (m === M.EAU) && r < 0.3) { Sim.set(x, y, M.GLACE); if (Math.random() < 0.1 && inView(x * CS, y * CS)) onSimEvent('gel', x * CS, y * CS); }
      else if (S !== 'hiver' && (m === M.GLACE || (m === M.NEIGE && zn !== 'La Montagne')) && r < (S === 'printemps' ? 0.35 : 0.2)) Sim.set(x, y, M.EAU);
      else if (S === 'hiver' && (m === M.HERBE) && r < 0.1 && Sim.get(x, y - 1) === M.AIR) Sim.set(x, y - 1, M.NEIGE);
    }
    // les arbres brûlés repoussent, hors de vue
    if (S !== 'hiver' && L.arbres && L.arbres.length && Math.random() < (S === 'printemps' ? 0.5 : 0.2)) { const a = L.arbres[(Math.random() * L.arbres.length) | 0]; if (!inView((a.x + 1) * CS, (surfaceY(a.x) - a.h) * CS)) repousseArbre(a); }
    // naissances : deux bêtes de la même espèce, en bonne santé, côte à côte
    st.naisT = (st.naisT || 0) + 1.5;
    if (st.naisT > 20 && S !== 'hiver') {
      st.naisT = 0;
      const comptes = {}; for (const c of st.crs) if (c.hp > 0) comptes[c.t] = (comptes[c.t] || 0) + 1;
      for (const c of st.crs) {
        if (!c.generique || c.hp < c.hpMax || c.bebe > 0 || (c.pondT || 0) > time || (comptes[c.t] || 0) >= 6 || c.t === 'familier' || c.orig || c.controlled) continue;
        const q = st.crs.find((o) => o !== c && o.t === c.t && o.hp >= o.hpMax && !(o.bebe > 0) && !o.orig && dist(c.x, c.y, o.x, o.y) < 220);
        if (!q || Math.random() > (S === 'printemps' ? 0.8 : 0.4)) continue;
        const b = makeCreature({ t: c.t, x: (c.x + q.x) / 2, y: Math.min(c.y, q.y), tame: c.sta.tame && q.sta.tame });
        b.wPlein = b.w; b.hPlein = b.h; b.bebe = 90; b.w = Math.round(b.wPlein * 0.55); b.h = Math.round(b.hPlein * 0.55); b.y = Math.min(c.y + c.h, q.y + q.h) - b.h; b.filDonne = true;
        st.crs.push(b); c.pondT = q.pondT = time + 120;
        if (inView(b.x, b.y)) { part(b.x + b.w / 2, b.y, '#c45a8a', 6, 40, 1, 3, -60, 'coeur'); msg('Un petit ' + (DATA.ESPECES[c.t].nom || c.t).toLowerCase() + ' est né !'); }
        evt('naissance', c.t);
        break;
      }
    }
  }
  function updateMeteo(dt) {
    { const t0 = st.tod; st.tod = (st.tod + dt / DAY) % 1; if (st.tod < t0) st.jour = (st.jour || 0) + 1; }
    vivant(dt);
    const m = st.meteo; m.t -= dt;
    if (m.t <= 0) {
      const r = Math.random();
      if (m.type === 'clair') { m.type = 'nuages'; m.t = 30 + Math.random() * 40; }
      else if (m.type === 'nuages') { const pl = game.opt ? game.opt.pluie : 1; if (r < 0.4 * pl) { m.type = 'pluie'; m.t = 40 + Math.random() * 40; } else if (r < 0.65 * pl && pl > 0) { m.type = 'orage'; m.t = 35 + Math.random() * 30; msg('Le ciel gronde...'); } else { m.type = 'clair'; m.t = 90 + Math.random() * 120; } }
      else { m.type = r < 0.5 ? 'clair' : 'nuages'; m.t = 60 + Math.random() * 120; }
    }
    Sim.sunny = m.type === 'clair' && daylight() > 0.4;
    if (m.type === 'pluie' || m.type === 'orage') {
      st.rainT += dt;
      if (st.p.y < (Sim.surf ? Sim.surf[clamp(Math.floor(st.p.x / CS), 0, Sim.W - 1)] * CS + 20 : 1e9)) { st.pluieT += dt; if (st.pluieT > 4) { st.pluieT = -120; game.observe('pluie'); } }
      const n = m.type === 'orage' ? 2 : 1;
      for (let k = 0; k < n; k++) {
        const x = Math.floor((st.cam.x - 300 + Math.random() * (VW + 600)) / CS);
        if (x > 0 && x < Sim.W - 1 && Sim.get(x, 1) === M.AIR && (saison() !== 'hiver' || Math.random() < 0.35)) Sim.set(x, 1, saison() === 'hiver' ? M.NEIGE : M.EAU);
      }
    }
    if (m.type === 'orage') {
      st.foudreT -= dt;
      if (st.foudreT <= 0) { st.foudreT = 2.5 + Math.random() * 4; lightning(st.cam.x + Math.random() * VW); }
    }
    for (const e of st.eclairs) e.life -= dt;
    st.eclairs = st.eclairs.filter((e) => e.life > 0);
  }
  function daylight() { return clamp(0.5 + 0.9 * Math.cos((st.tod - 0.5) * TAU), 0, 1); }
  function lightning(px) {
    const x = Math.floor(px / CS);
    // attirée par le métal proche
    for (let dx = -30; dx <= 30; dx++) { const xx = x + dx; if (xx > 0 && xx < Sim.W) for (let y = 0; y < 150; y++) if (Sim.get(xx, y) === M.METAL) { return strike(xx, y); } }
    let y = 1; while (y < Sim.H - 1 && Sim.get(x, y) === M.AIR) y++;
    strike(x, y);
  }
  function strike(x, y) {
    const sx = (x + 0.5) * CS, sy = y * CS;
    const pts = []; let px = sx; for (let yy = 0; yy < sy; yy += 24) { px += (Math.random() - 0.5) * 30; pts.push([px, yy]); } pts.push([sx, sy]);
    const branches = []; for (let k = 0; k < 3; k++) { const i = 1 + Math.floor(Math.random() * (pts.length - 2)); const [bx, by] = pts[i]; branches.push(FX.eclairPts(bx, by, bx + (Math.random() - 0.5) * 160, by + 40 + Math.random() * 90, 0.25)); }
    st.eclairs.push({ x: sx, y1: sy, pts, branches, life: 0.35 });
    st.flash = 0.12; Son.sfx('burst', 'foudre'); st.shake = 0.2;
    applyEffect('foudre', sx, sy, 40, { power: 1.5, size: 1, duration: 1, persist: 0 }, 'burst', { noField: true });
    onSimEvent('foudre', sx, sy);
  }

  // facteur de temps à un endroit : 1 dehors, 0 figé, < 1 ralenti, > 1 accéléré (le lanceur n'y est pas soumis)
  let bullesT = [];
  function majBulles() { bullesT = []; for (const b of st.sp) if (b.k === 'bulle' && !b.mort) bullesT.push({ x: b.x, y: b.y, r: b.r, rect: b.rect || null, f: b.fx != null ? b.fx : b.mode === 'vite' ? 3 : b.mode === 'lent' ? 0.3 : 0 }); Sim.tzones = bullesT; }
  function tempsDe(x, y, vite = 3) { for (const z of bullesT) if (dansZone(z, x, y)) return z.f > 1 ? vite : z.f; return 1; }
  function updateObjs(dtG) {
    let dt = dtG;
    for (const o of st.objs) {
      if (o.mort) continue;
      dt = bullesT.length && o.dyn ? dtG * tempsDe(o.x + o.w / 2, o.y + o.h / 2) : dtG; if (dt <= 0) continue;
      switch (o.t) {
        case 'caisse': case 'rocher':
          if (o.ench) { o.ench.t -= dt; if (o.ench.t <= 0) o.ench = null; else { doContinuous(o.ench.spec, o.x + o.w / 2, o.y + o.h / 2, 50 * (o.ench.spec.prm.size || 1), dt, { noPlayer: true, noField: true }); if (Math.random() < 0.3) part(o.x + Math.random() * o.w, o.y + Math.random() * o.h, o.ench.spec.color, 1, 20, 0.5, 2, -40, 'spark'); } }
          if (o.carried) break;
          applyGrav(o, dt);
          if (o.boulet > 0) { o.boulet -= dt; for (const c of st.crs) if (c.hp > 0 && !c.sta.tame && U.rectsOverlap(o, c) && Math.hypot(o.vx, o.vy) > 250) { hurt(c, 2.5); c.vx += o.vx * 0.6; c.vy -= 250; o.vx *= 0.6; } }
          o.vx *= Math.max(0, 1 - (o.onGround ? 6 : 1) * dt * (o.boulet > 0 ? 0.1 : 1));
          moveBody(o, dt, o);
          { const lq = liquidOf(o); flotter(o, dt, DENS[o.t] || 1); if ((lq === M.EAU || lq === M.SAUMURE) && o.t === 'caisse') o.burning = 0; if (lq === M.LAVE && o.t === 'caisse') o.burning = 3; }
          // ce qui tombe lourd blesse ce qu'il heurte
          { const v = Math.hypot(o.vx, o.vy), ms = masse(o); if (v > (ms > 2 ? 330 : 480) && !(o.boulet > 0)) { o.chocT = o.chocT || new Map(); for (const c of st.crs) if (c.hp > 0 && !c.sta.tame && U.rectsOverlap(o, c) && time - (o.chocT.get(c) || -9) > 0.6) { o.chocT.set(c, time); hurt(c, Math.min(5, ms * v / 900) / Math.sqrt(masse(c))); c.vx += o.vx * 0.4 / masse(c); c.vy -= 120; part(c.x + c.w / 2, c.y, '#8a7a5a', 6, 80, 0.4, 2, 300); Son.sfx('burst', 'terre'); }
            const p = st.p; if (o.vy > 380 && ms > 2 && U.rectsOverlap(o, p) && p.y > o.y && time - (o.chocT.get(p) || -9) > 0.8 && !(p.sta.stone > 0)) { o.chocT.set(p, time); p.hp -= Math.min(3, ms * o.vy / 1400); p.vx += (p.x + p.w / 2 < o.x + o.w / 2 ? -1 : 1) * 260; msg('Aïe ! Ça tombe lourd.', 'warn'); } } }
          if (o.t === 'caisse') {
            if (!o.burning && Sim.rectHas({ x: o.x - 4, y: o.y - 4, w: o.w + 8, h: o.h + 8 }, (m) => m === M.FEU || m === M.LAVE)) o.burning = 2.5;
            if (o.burning > 0) { o.burning -= dt; o.hp -= dt; if (Math.random() < 0.5) part(o.x + Math.random() * o.w, o.y + 4, '#d9622b', 1, 40, 0.6, 3, -200); if (Math.random() < 0.1) { const cx = Math.floor((o.x + Math.random() * o.w) / CS), cy = Math.floor(o.y / CS) - 1; if (Sim.get(cx, cy) === M.AIR) Sim.set(cx, cy, M.FEU, 20); } if (o.hp <= 0) { o.mort = true; part(o.x + 18, o.y + 18, '#555', 14, 60, 1, 4); msg('La caisse n\'est plus que cendres.'); if (st.p.carry === o) st.p.carry = null; } }
          }
          if (o.y > L.h + 50) o.mort = true;
          break;
        case 'mannequin': if (o.wob > 0) o.wob -= dt * 1.5; if (o.burning > 0) { o.burning -= dt; if (Math.random() < 0.3) part(o.x + o.w / 2, o.y + 6, '#d9622b', 1, 30, 0.5, 3, -150); } break;
        case 'torche': o.flicker = time * 9 + o.seed; if (!o.lit && Sim.rectHas({ x: o.x - 6, y: o.y - 8, w: o.w + 12, h: 24 }, (m) => m === M.FEU || m === M.LAVE)) { o.lit = true; evt('torche'); } break;
        case 'graine':
          if (o.stage === 1 && o.hauteur < o.hMax) {
            o.gt = (o.gt || 0) + dt;
            if (o.gt > 0.08) { o.gt = 0; const y = o.cy - 1 - o.hauteur; if (!P[Sim.get(o.cx, y)].solid) { Sim.set(o.cx, y, M.PLANTE); if (o.hauteur % 3 === 1) { const side = (o.hauteur % 2) ? 1 : -1; if (Sim.get(o.cx + side, y) === M.AIR) Sim.set(o.cx + side, y, M.PLANTE); } o.hauteur++; } else o.hMax = o.hauteur; }
          }
          if (o.stage === 1 && !o.racine) { o.regrow += dt; if (o.regrow > 30) { o.racine = true; o.regrow = 0; } }
          if (o.stage === 1 && o.hauteur >= 4 && Sim.get(o.cx, o.cy - 1) !== M.PLANTE && Sim.get(o.cx, o.cy - 2) !== M.PLANTE) { o.stage = 0; o.hauteur = 0; msg('La vigne a disparu. La graine attend de nouveau.'); }
          break;
        case 'ruche': {
          o.drip -= dt; if (o.enfume > 0) o.enfume -= dt;
          if (Sim.rectHas({ x: o.x - 20, y: o.y - 20, w: o.w + 40, h: o.h + 40 }, (m) => m === M.FUMEE)) o.enfume = 12;
          if (Sim.rectHas(o, (m) => m === M.FEU)) { o.mort = true; part(o.x + 11, o.y + 15, '#d8a03a', 14, 60, 0.8, 3, 200); spawnLiquid(M.MIEL, o.x + 11, o.y + o.h, 12); msg('La ruche tombe en flammes. Les abeilles ne te le pardonneront pas.'); break; }
          if (o.drip <= 0) { o.drip = 7 + Math.random() * 6; const cx = Math.floor((o.x + o.w / 2) / CS), cy = Math.floor((o.y + o.h) / CS) + 1; if (Sim.get(cx, cy) === M.AIR) Sim.set(cx, cy, M.MIEL); }
          if (Math.random() < 0.3 && o.enfume <= 0) part(o.x + o.w / 2 + (Math.random() - 0.5) * 40, o.y + o.h / 2 + (Math.random() - 0.5) * 30, '#1f1a16', 1, 20, 0.4, 1.2, 0, 'dot');
          break;
        }
        case 'rune': if (st.p.sta.vision > 0 && dist(o.x + 20, o.y + 30, st.p.x, st.p.y) < 500) o.revele = Math.min(1, o.revele + dt); if (o.cooldown > 0) o.cooldown -= dt; break;
      }
    }
    st.objs = st.objs.filter((o) => !o.mort);
  }

  function updateCreatures(dtG) {
    let dt = dtG;
    const p = st.p; const pcx = p.x + p.w / 2, pcy = p.y + p.h / 2;
    for (const c of st.crs) {
      dt = bullesT.length ? dtG * tempsDe(c.x + c.w / 2, c.y + c.h / 2) : dtG; if (dt <= 0) continue;
      if (c.hp <= 0 && c.orig) finMorph(c);
      if (c.hp <= 0) { c.respawn -= dt; if (c.respawn <= 0) { c.hp = c.hpMax; c.x = c.x0; c.y = c.y0; c.vx = 0; c.vy = 0; c.size = 1; c.sta.tame = false; if (c.t === 'limace') { c.w = 36; c.h = 24; } } continue; }
      if (c.carried) { c.sta.burn = 0; continue; }
      for (const k of ['burn', 'stun', 'sleep', 'wet', 'glisse', 'lent', 'gele']) if (c.sta[k] > 0) c.sta[k] = Math.max(0, c.sta[k] - dt);
      if (c.morphT > 0) { c.morphT -= dt; if (c.morphT <= 0) finMorph(c); }
      if (c.affT > 0) c.affT -= dt;
      if (c.bebe > 0 && c.hp > 0) { c.bebe -= dt; const k = c.bebe > 0 ? 0.55 + 0.45 * (1 - c.bebe / 90) : 1; const bas = c.y + c.h, mil = c.x + c.w / 2; c.w = Math.round(c.wPlein * k); c.h = Math.round(c.hPlein * k); c.y = bas - c.h; c.x = mil - c.w / 2; }
      if (c.curieux) { c.curieux.t -= dt; if (c.curieux.t <= 0) c.curieux = null; }
      if (c.ench) { c.ench.t -= dt; c.ench.tick += dt; if (c.ench.t <= 0) c.ench = null; else { doContinuous(c.ench.spec, c.x + c.w / 2, c.y + c.h / 2, 50 * (c.ench.spec.prm.size || 1), dt, { noPlayer: true, noField: true }); if (Math.random() < 0.3) part(c.x + Math.random() * c.w, c.y + Math.random() * c.h, c.ench.spec.color, 1, 20, 0.5, 2, -40, 'spark'); } }
      if (c.t === 'familier') { updateFamilier(c, dt, p); continue; }
      // cadeaux des créatures apprivoisées
      if (c.sta.tame && DATA.ESPECES[c.t] && DATA.ESPECES[c.t].drop) { c.cadeauT += dt; if (c.cadeauT > 90) { c.cadeauT = 0; dropPickup(DATA.ESPECES[c.t].drop, c.x + c.w / 2, c.y - 8); evt('cadeau'); msg(nomCreature(c.t) + ' te fait un cadeau.'); } }
      // chaleur et grand froid
      { const tc = Sim.tempAt(c.x + c.w / 2, c.y + c.h * 0.6); const sp0 = DATA.ESPECES[c.t] || {};
        if (tc > 125 && !CHAUD_OK.includes(c.t)) { hurt(c, dt * (tc - 125) / 50); if (tc > 170) c.sta.burn = Math.max(c.sta.burn, 1); if (c.hp <= 0) continue; }
        else if (tc < 46 && !FROID_OK.includes(c.t)) { c.sta.lent = Math.max(c.sta.lent || 0, 0.4); if (tc < 28 && Math.random() < dt * 0.5) c.sta.gele = Math.max(c.sta.gele || 0, 1.5); } }
      if (c.generique) { updateGenerique(c, dt, p); continue; }
      if (!c.vu && inView(c.x, c.y)) { c.vu = true; evt('espece', c.t); }
      if (c.hurt > 0) c.hurt -= dt;
      if (c.sta.burn > 0) { hurt(c, dt * 0.7); if (Math.random() < 0.4) part(c.x + Math.random() * c.w, c.y, '#d9622b', 1, 30, 0.5, 3, -200); if (c.hp <= 0) continue; }
      const lq = liquidOf(c);
      if (lq === M.EAU) { c.sta.wet = 6; c.sta.burn = 0; if (c.t === 'follet') { hurt(c, dt * 2, 'eau'); if (c.hp <= 0) continue; } }
      if (lq === M.LAVE && c.t !== 'golem') { hurt(c, dt * 4); c.sta.burn = 2; if (c.hp <= 0) continue; }
      if (lq === M.ACIDE) { hurt(c, dt * 2); if (c.hp <= 0) continue; }
      if (Sim.rectHas(c, (m, i) => Sim.elec[i] > 0)) { c.sta.stun = Math.max(c.sta.stun, 1); if (Math.random() < dt * 2) hurt(c, 1); }
      if (c.t !== 'golem' && !c.sta.burn && Sim.rectHas({ x: c.x - 3, y: c.y - 3, w: c.w + 6, h: c.h + 6 }, (m) => m === M.FEU)) { c.sta.burn = 2; }
      const ccx = c.x + c.w / 2, ccy = c.y + c.h / 2;
      const dpx = pcx - ccx, dpy = pcy - ccy, dp = Math.hypot(dpx, dpy);
      const actif = c.sta.stun <= 0 && c.sta.sleep <= 0;
      const aggro = actif && !c.sta.tame && p.sta.invisible <= 0 && dp < (c.t === 'golem' ? 260 : c.t === 'follet' ? 300 : 280);
      const lentMul = c.sta.lent > 0 ? 0.3 : 1;
      c.phase += dt;
      if (c.vole) {
        const sinY = Math.sin(c.phase * 2) * 30;
        let tx = c.x0 + Math.cos(c.phase * 0.5) * 80, ty = c.y0 + sinY;
        if (aggro) { tx = p.x; ty = p.y - 20; }
        if (c.sta.tame) { tx = p.x - p.face * 50; ty = p.y - 30; }
        if (c.sta.burn > 0) tx = c.x0;
        if (c.curieux && !aggro) { tx = c.curieux.x; ty = c.curieux.y - 30; }
        if (c.controlled && c.ctl) { c.vx += c.ctl.dirX * 900 * dt; c.vy += c.ctl.dirY * 900 * dt; if (c.ctl.dirX) c.dir = c.ctl.dirX; }
        else if (actif) { c.vx += (tx - c.x) * 2.4 * dt * lentMul; c.vy += (ty - c.y) * 2.4 * dt * lentMul; }
        c.vx *= Math.max(0, 1 - 3 * dt); c.vy *= Math.max(0, 1 - 3 * dt);
        { const z = gravOf(c); if (z && z.mag > 0) { c.vx += GRAV * z.mag * z.gx * dt * 0.5; c.vy += GRAV * z.mag * z.gy * dt * 0.5; } }
        c.canStep = false; moveBody(c, dt);
        if (Math.random() < 0.3) part(ccx, ccy, '#3f9c9b', 1, 20, 0.5, 2, -40, 'spark');
      } else {
        applyGrav(c, dt, 1);
        if (lq) flotter(c, dt, DENS[c.t] || 0.9);
        if (c.controlled && c.ctl) {
          const sp = c.t === 'golem' ? 150 : 200; c.vx = c.ctl.dirX * sp; if (c.ctl.dirX) c.dir = c.ctl.dirX; if (c.ctl.jump && c.onGround) c.vy = -420; c.ctl.jump = false;
        } else if (actif) {
          if (c.curieux && !aggro && c.t !== 'follet') { const ddx = c.curieux.x - ccx; if (Math.abs(ddx) > 30) { if (c.t === 'limace') { if (c.onGround && c.hop <= 0) { c.hop = 0.8; c.vx = Math.sign(ddx) * 90; c.vy = -260; c.dir = Math.sign(ddx); } c.hop -= dt; } else c.vx = lerp(c.vx, Math.sign(ddx) * 60, Math.min(1, dt * 4)); } }
          else if (c.t === 'limace') {
            c.hop -= dt;
            if (c.onGround && c.hop <= 0) {
              c.hop = aggro ? 0.9 : 2 + Math.random() * 2;
              const dir = aggro ? Math.sign(dpx) : (Math.random() < 0.5 ? -1 : 1);
              if (c.sta.tame) { if (dp > 90) c.vx = Math.sign(dpx) * 90; } else c.vx = dir * (aggro ? 110 : 50);
              c.vy = -280; c.dir = Math.sign(c.vx) || c.dir;
            }
          } else if (c.t === 'golem') {
            const sp = aggro ? 95 : 35;
            if (aggro) c.dir = Math.sign(dpx) || c.dir;
            else if (Math.abs(c.x - c.x0) > 160 || c.hitX) c.dir = Math.sign(c.x0 - c.x) || -c.dir;
            if (c.sta.tame) { if (dp > 110) c.vx = Math.sign(dpx) * 45; else c.vx *= 0.8; }
            else c.vx = lerp(c.vx, c.dir * sp, Math.min(1, dt * 4));
            if (c.hitX && c.onGround && Math.random() < 0.3) c.vy = -300;
            if (c.onGround && Math.abs(c.vx) > 20 && Math.random() < dt * 2) st.shake = 0.1;
          }
          c.vx *= lentMul === 1 ? 1 : (1 - (1 - lentMul) * Math.min(1, dt * 10));
        } else c.vx *= Math.max(0, 1 - 6 * dt);
        if (c.onGround) c.vx *= Math.max(0, 1 - (c.sta.glisse > 0 ? 0.2 : 2) * dt);
        c.hitX = false;
        moveBody(c, dt);
        if (c.y > L.h + 50) { c.hp = 0; c.respawn = 10; }
      }
      // contact joueur
      if (U.rectsOverlap(c, p) && actif && !c.sta.tame && !c.controlled && p.inv <= 0 && p.sta.geant <= 0 && !(p.pg && p.pg.enclume)) {
        const dx = Math.sign(pcx - ccx) || 1;
        p.vx = dx * 320; p.vy = -260; p.inv = 1;
        if (p.sta.stone <= 0 && p.sta.armure <= 0) { p.hp -= c.dmg; Son.sfx('hurt'); msg(nomCreature(c.t) + ' te bouscule !', 'warn'); evt('bouscule'); st.shake = 0.25; }
        else msg('Ton armure encaisse le choc.');
        c.vx = -dx * 150;
        if (p.trap) { doBurst(p.trap.spec, pcx, pcy, 80 * (p.trap.spec.prm.size || 1), { noPlayer: true }); p.trap = null; msg('Le sceau sur ta peau éclate !'); }
      } else if (U.rectsOverlap(c, p) && (p.sta.geant > 0 || (p.pg && p.pg.enclume)) && !c.sta.tame) { c.vx = Math.sign(ccx - pcx) * 300; c.vy = -200; }
    }
  }

  function updateGenerique(c, dt, p) {
    const sp = DATA.ESPECES[c.t]; const ccx = c.x + c.w / 2, ccy = c.y + c.h / 2; const pcx = p.x + p.w / 2, pcy = p.y + p.h / 2;
    const dpx = pcx - ccx, dpy = pcy - ccy, dp = Math.hypot(dpx, dpy);
    if (!c.vu && inView(ccx, ccy)) { c.vu = true; evt('espece', c.t); }
    // jour / nuit
    const nuit = daylight() < 0.3;
    const veutDormir = (sp.nocturne && !nuit) || (sp.diurne && nuit);
    if (veutDormir && !c.sta.tame && !c.fuite && c.hurt <= 0) c.dort = true; else if (!veutDormir) c.dort = false;
    if (c.fuite) { c.fuite.t -= dt; if (c.fuite.t <= 0) c.fuite = null; }
    const actif = c.sta.stun <= 0 && c.sta.sleep <= 0 && !c.dort;
    const lq = liquidOf(c);
    const peur = sp.peur || 0;
    const fuitJoueur = actif && !c.sta.tame && peur > 0 && dp < peur && p.sta.invisible <= 0;
    const aggro = actif && sp.hostile && !c.sta.tame && p.sta.invisible <= 0 && dp < 240;
    const lentMul = c.sta.lent > 0 ? 0.3 : 1;
    let tx = null, ty = null;
    if (c.fuite) { tx = ccx + Math.sign(ccx - c.fuite.x || 1) * 200; ty = ccy - 40; }
    else if (fuitJoueur) { tx = ccx - Math.sign(dpx || 1) * 200; ty = ccy - 60; }
    else if (aggro) { tx = pcx; ty = pcy; }
    else if (c.sta.tame && dp > 110) { tx = pcx - p.face * 50; ty = pcy; }
    else if (c.controlled && c.ctl) { tx = ccx + c.ctl.dirX * 100; ty = ccy + (c.ctl.dirY || 0) * 100; }
    c.phase += dt;
    if (sp.mode === 'fly') {
      if (tx == null) { tx = c.x0 + Math.cos(c.phase * 0.4) * 120; ty = c.y0 + Math.sin(c.phase * 1.3) * 30; }
      if (actif || c.controlled) { c.vx += (tx - ccx) * 2 * dt * lentMul; c.vy += (ty - ccy) * 2 * dt * lentMul; c.dir = Math.sign(c.vx) || c.dir; }
      else if (c.dort) { c.vy += GRAV * 0.3 * dt; }
      c.vx *= Math.max(0, 1 - 2.5 * dt); c.vy *= Math.max(0, 1 - 2.5 * dt);
      c.canStep = false; moveBody(c, dt);
    } else if (sp.mode === 'swim') {
      if (lq) {
        if (tx == null) { tx = c.x0 + Math.cos(c.phase * 0.5) * 60; ty = c.y0 + Math.sin(c.phase * 0.9) * 10; }
        if (actif) { c.vx += (tx - ccx) * 1.5 * dt * lentMul; c.vy += (ty - ccy) * 1.5 * dt * lentMul; c.dir = Math.sign(c.vx) || c.dir; }
        c.vx *= Math.max(0, 1 - 2 * dt); c.vy *= Math.max(0, 1 - 2 * dt);
        c.hors = 0;
      } else {
        applyGrav(c, dt, 1, 900); c.hors = (c.hors || 0) + dt;
        if (c.onGround && Math.random() < dt * 3) { c.vx = (Math.random() - 0.5) * 160; c.vy = -220; }
        if (c.hors > 12) { hurt(c, dt * 0.5); if (c.hp <= 0) return; }
      }
      c.canStep = false; moveBody(c, dt);
    } else {
      // hop / walk / crawl
      const sw = sp.lave && lq === M.LAVE;
      applyGrav(c, dt, 1);
      if (lq) flotter(c, dt, DENS[c.t] || 0.9);
      if (sw && actif) { c.vy -= 900 * dt * (Math.sin(c.phase * 2) > 0 ? 1 : 0.3); }
      if (actif || c.controlled) {
        const dir = tx != null ? Math.sign(tx - ccx) || c.dir : (Math.random() < dt * 0.4 ? -c.dir : c.dir);
        if (tx == null && Math.abs(c.x - c.x0) > 140) c.dir = Math.sign(c.x0 - c.x) || c.dir; else c.dir = dir;
        if (sp.mode === 'hop') { c.hop -= dt; if (c.onGround && c.hop <= 0) { c.hop = tx != null ? 0.7 : 1.5 + Math.random() * 2; c.vx = c.dir * (tx != null ? 140 : 60) * lentMul; c.vy = -(c.t === 'grenouille' ? 380 : 280); } }
        else { const sp2 = (sp.mode === 'crawl' ? 18 : 55) * (tx != null ? 1.6 : 1) * lentMul; c.vx = lerp(c.vx, c.dir * sp2 * (tx == null && Math.random() < 0.3 ? 0 : 1), Math.min(1, dt * 4)); }
        if (c.hitX && c.onGround && sp.mode !== 'crawl' && Math.random() < 0.3) c.vy = -260;
      } else c.vx *= Math.max(0, 1 - 6 * dt);
      if (c.onGround) c.vx *= Math.max(0, 1 - (c.sta.glisse > 0 ? 0.2 : 2) * dt);
      c.hitX = false;
      moveBody(c, dt);
    }
    if (c.y > L.h + 50) { c.hp = 0; c.respawn = 10; }
    // contact
    if (sp.hostile && U.rectsOverlap(c, p) && actif && !c.sta.tame && !c.controlled && p.inv <= 0 && p.sta.geant <= 0 && !(p.pg && p.pg.enclume)) {
      const dx = Math.sign(pcx - ccx) || 1; p.vx = dx * 280; p.vy = -240; p.inv = 1;
      if (p.sta.stone <= 0 && p.sta.armure <= 0 && c.dmg > 0) { p.hp -= c.dmg; Son.sfx('hurt'); msg(nomCreature(c.t) + ' te bouscule !', 'warn'); evt('bouscule'); }
      c.vx = -dx * 150;
    }
  }
  // impact d'un projectile selon son déclencheur ; ent : créature touchée (pour coller la commande)
  function impactProj(s, ent) {
    const dirv = { x: s.vx / (Math.hypot(s.vx, s.vy) || 1), y: s.vy / (Math.hypot(s.vx, s.vy) || 1) };
    if (s.trig === 'retarde') { s.k = 'timer'; s.t = s.spec.delai; s.max = s.spec.delai; s.r = 60 * s.prm.size; s.vx = 0; s.vy = 0; return; }
    if (s.trig === 'commande') { st.sp.push({ k: 'attente', spec: s.spec, x: s.x, y: s.y, ent, life: 40 }); s.mort = true; return; }
    let rad = 50 * s.prm.size;
    if (s.matiere != null) { const m = s.matiere; spec0 = s.spec; poserMatiere(m, (put) => Sim.forRadius(s.x - s.vx * 0.01, s.y - s.vy * 0.01, 7 * (s.prm.size || 1), (cx, cy) => { if (Math.random() < 0.7) put(cx, cy); })); part(s.x, s.y, P[m].color, 10, 140, 0.6, 2.4, 700, 'eclat'); }
    if (s.trig === 'proximite' && ent && ent.w) rad = Math.max(rad, dist(s.x, s.y, ent.x + ent.w / 2, ent.y + ent.h / 2) + Math.max(ent.w, ent.h) * 0.3);
    doBurst(s.spec, s.x, s.y, rad, { ent }, dirv); s.mort = true;
  }
  function collision(a, b) {
    const x = (a.x + b.x) / 2, y = (a.y + b.y) / 2;
    const ca = a.spec.cores[0], cb = b.spec.cores[0];
    const key = [ca, cb].sort().join('|'); const nomme = DATA.comboInfo(key);
    const pw = ((a.prm.power + b.prm.power) / 2) * (nomme ? 1.3 : 1.1), r = 60 * Math.max(a.prm.size, b.prm.size);
    for (const core of new Set([ca, cb])) applyEffect(core, x, y, r, { ...a.prm, power: pw }, 'burst');
    if (ca !== cb && DATA.comboInfo(key)) PH.deployer({ ...a.spec, combo: key, castId: a.spec.castId * 1000 + 7, shape: 'zone' }, x, y, r, {}, { x: Math.sign(a.vx) || 1, y: 0 });
    st.sp.push({ k: 'label', x, y: y - 46, txt: 'Collision' + (nomme ? ' : ' + nomme.nom : ''), life: 1.6, max: 1.6 });
    st.shake = 0.25; a.mort = true; b.mort = true; evt('collision');
  }
  function majBouclier(s, dt) {
    s.life -= dt; if (s.life <= 0 || s.mort) { s.mort = true; finBouclier(s); if (s.spec.expire) doBurst(s.spec, s.x, s.y, s.r, { noExpire: true, noRepeat: true, noCombo: true }); return; }
    const p = st.p;
    if (s.self) { s.x = p.x + p.w / 2; s.y = p.y + p.h / 2; const aim = toWorld(game.inp.mouse.x, game.inp.mouse.y); s.a = Math.atan2(aim.y - s.y, aim.x - s.x); }
    const span = 1.05, core = s.spec.core, dur = (core === 'terre' || core === 'metal' || core === 'froid');
    s.tick = (s.tick || 0) - dt;
    if (s.tick <= 0) { s.tick = 0.1; for (let k = -3; k <= 3; k++) { const an = s.a + k * span / 3; doContinuous(s.spec, s.x + Math.cos(an) * s.r, s.y + Math.sin(an) * s.r, 14 * s.spec.prm.size, 0.1, { noPlayer: true, noField: true }); } }
    const dans = (px, py, rin, rout) => { const dx = px - s.x, dy = py - s.y, d = Math.hypot(dx, dy); if (d < rin || d > rout) return false; let da = Math.atan2(dy, dx) - s.a; while (da > Math.PI) da -= TAU; while (da < -Math.PI) da += TAU; return Math.abs(da) <= span; };
    // paroi magique : les matières ne la traversent pas (les êtres, si) ; ce qu'elle chasse est rendu à la fin
    if (!s.ring) { s.ring = new Set(); s.stash = {}; }
    if (!s.plonge && s.self) { let n = 0; Sim.forRadius(s.x, s.y, s.r, (cx, cy, i, m) => { if (P[m].liquid && m !== M.LAVE) n++; }); if (liquidOf(p) || n > 20) s.plonge = true; }
    const plonge = !!s.plonge;
    const garde = (q) => q.liquid || q.gas || q.powder;
    const want = new Set(), inter = [];
    Sim.forRadius(s.x, s.y, s.r + 4, (cx, cy, i, m) => {
      const px = (cx + 0.5) * CS, py = (cy + 0.5) * CS, d = Math.hypot(px - s.x, py - s.y);
      const secteur = plonge || dans(px, py, 0, s.r + 4);
      if (!secteur) return;
      if (d >= s.r - 3) { if (m === M.AIR || m === M.BULLE || garde(P[m])) want.add(i); }
      else if (plonge || d > s.r * 0.55) inter.push(i);
    });
    for (const i of s.ring) if (!want.has(i) && Sim.mat[i] === M.BULLE) Sim.touch(i), (Sim.mat[i] = M.AIR);
    for (const i of want) { const m = Sim.mat[i]; if (m !== M.BULLE) { if (m !== M.AIR && m !== M.LAVE) s.stash[m] = (s.stash[m] || 0) + 1; if (m !== M.LAVE) { Sim.mat[i] = M.BULLE; Sim.aux[i] = 0; Sim.touch(i); } } }
    for (const i of inter) { const m = Sim.mat[i]; if (m !== M.AIR && m !== M.BULLE && m !== M.LAVE && garde(P[m])) { s.stash[m] = (s.stash[m] || 0) + 1; Sim.mat[i] = M.AIR; Sim.touch(i); } }
    s.ring = want;
    for (const b of [...st.crs.filter((c) => c.hp > 0 && !c.sta.tame && c.t !== 'familier'), ...st.objs.filter((o) => o.dyn && !o.carried && !o.mort)]) {
      const bx = b.x + b.w / 2, by = b.y + b.h / 2;
      if (!dans(bx, by, 0, s.r + Math.max(b.w, b.h) / 2 + 6)) continue;
      const dx = bx - s.x, dy = by - s.y, d = Math.hypot(dx, dy) || 1;
      const f = core === 'vent' ? 900 : dur ? 520 : 380;
      const vr = b.vx * dx / d + b.vy * dy / d;
      if (vr < f * 0.5) { b.vx += dx / d * (f * 0.5 - vr); b.vy += dy / d * (f * 0.5 - vr) - (core === 'vent' ? 120 : 0); }
    }
  }
  // ---------- Prise : saisir et lancer la matière ----------
  const PRISE_EFFET = { [M.EAU]: 'eau', [M.SAUMURE]: 'eau', [M.LAVE]: 'feu', [M.ACIDE]: 'acide', [M.SABLE]: 'terre', [M.TERRE]: 'terre', [M.BOUE]: 'terre', [M.NEIGE]: 'froid', [M.CENDRE]: 'terre', [M.POUDRE]: 'feu', [M.MIEL]: 'vie' };
  function saisir(spec, x, y, joueur) {
    const prm = spec.prm, R = 62 * prm.size, cap = Math.round(240 * prm.power * prm.size * (spec.cores.some((q) => q === 'gravite' || q === 'force') ? 1.3 : 1));
    const mats = {}; let n = 0;
    // on aspire d'abord vers le centre (les cases les plus proches d'abord)
    const cells = []; Sim.forRadius(x, y, R, (cx, cy, i, m) => { const q = P[m]; if ((q.liquid || q.powder || q.gas) && m !== M.BULLE) cells.push([Math.hypot((cx + 0.5) * CS - x, (cy + 0.5) * CS - y), cx, cy, m]); });
    cells.sort((a, b) => a[0] - b[0]);
    for (const [, cx, cy, m] of cells) { if (n >= cap) break; if (P[m].gas) { Sim.set(cx, cy, M.AIR); continue; } mats[m] = (mats[m] || 0) + 1; n++; Sim.set(cx, cy, M.AIR); }
    const ents = [];
    for (const c of st.crs) if (c.hp > 0 && !c.carried && c.t !== 'familier' && U.circleRect(x, y, R, c) && (c.t !== 'golem' || prm.power >= 1.5 || spec.cores.some((q) => q === 'gravite' || q === 'force'))) { c.carried = true; c.prise = true; ents.push(c); }
    for (const o of st.objs) if (o.dyn && !o.carried && !o.mort && o !== st.p.carry && U.circleRect(x, y, R, o)) { o.carried = true; o.prise = true; ents.push(o); }
    if (!n && !ents.length) { msg('La prise se referme sur du vide.'); part(x, y, spec.color, 10, 60, 0.5, 3, 0, 'glow'); return; }
    for (const e of ents) { e.ox = e.x + e.w / 2 - x; e.oy = e.y + e.h / 2 - y; }
    st.sp.push({ k: 'prise', spec, x, y, vx: 0, vy: 0, mats, n, ents, tenue: joueur, life: 10 * prm.duration, t: 0, color: spec.color, hist: [] });
    Son.sfx('cast', 'force'); st.shake = Math.min(0.4, 0.1 + n / 800);
    for (let k = 0; k < 18; k++) { const a = Math.random() * TAU, rr = R * (0.6 + Math.random() * 0.6); st.parts.push({ x: x + Math.cos(a) * rr, y: y + Math.sin(a) * rr, vx: -Math.cos(a) * rr * 2.5, vy: -Math.sin(a) * rr * 2.5, life: 0.4, max: 0.4, color: spec.color, size: 3, grav: 0, type: 'glow' }); }
    if (joueur) msg('Tu tiens ' + (n ? n + ' grains de matière' : '') + (n && ents.length ? ' et ' : '') + (ents.length ? ents.length + ' prise(s)' : '') + '. Clique pour lancer.');
  }
  function rayonPrise(s) { return Math.max(10, Math.sqrt(s.n) * CS * 0.55 + s.ents.length * 6); }
  function majPrise(s, dt) {
    const p = st.p; s.t += dt; s.life -= dt;
    if (s.tenue) {
      const aim = toWorld(game.inp.mouse.x, game.inp.mouse.y);
      // laisse : pas plus loin que 380 px de toi
      let tx = aim.x, ty = aim.y; const pcx = p.x + p.w / 2, pcy = p.y + p.h / 2; const d = dist(pcx, pcy, tx, ty); if (d > 380) { tx = pcx + (tx - pcx) / d * 380; ty = pcy + (ty - pcy) / d * 380; }
      const nvx = (tx - s.x) * 9, nvy = (ty - s.y) * 9;
      s.vx = clamp(nvx, -1400, 1400); s.vy = clamp(nvy, -1400, 1400);
      s.x += s.vx * dt; s.y += s.vy * dt;
      s.hist.push([s.vx, s.vy]); if (s.hist.length > 6) s.hist.shift();
      p.ink -= dt * (1 + s.n / 300); if (p.ink <= 0) { p.ink = 0; s.tenue = false; msg('Plus d\'encre : la prise t\'échappe.', 'warn'); }
      if (s.life <= 0) { s.tenue = false; msg('La prise se relâche.'); }
    } else {
      const g = s.spec.cores.some((q) => q === 'gravite' || q === 'force') ? 450 : 900;
      s.vy += g * dt; s.x += s.vx * dt; s.y += s.vy * dt;
      const R = rayonPrise(s) * 0.6;
      const touche = Sim.solidAt(s.x + Math.sign(s.vx) * R * 0.5, s.y + Math.sign(s.vy) * R * 0.5) || st.crs.some((c) => c.hp > 0 && !c.carried && U.circleRect(s.x, s.y, R, c)) || s.y > L.h - 10 || s.x < 0 || s.x > L.w;
      if (touche || s.t > 6) { ecraserPrise(s); return; }
    }
    // la matière portée suit
    for (const e of s.ents) { if (e.mort || (e.hp !== undefined && e.hp <= 0)) continue; const a = s.t * 2 + (e.seed || 0); const ox = e.ox * 0.4 + Math.cos(a) * 6, oy = e.oy * 0.4 + Math.sin(a) * 6; e.x = s.x + ox - e.w / 2; e.y = s.y + oy - e.h / 2; e.vx = s.vx; e.vy = s.vy; }
    if (Math.random() < 0.5) { const m = +Object.keys(s.mats)[0]; if (!isNaN(m)) part(s.x + (Math.random() - 0.5) * rayonPrise(s), s.y + (Math.random() - 0.5) * rayonPrise(s), P[m].color, 1, 20, 0.5, 2, 300, P[m].liquid ? 'goutte' : 'dot'); }
  }
  function lacherEntites(s, vx, vy) {
    for (const e of s.ents) { e.carried = false; e.prise = false; e.vx = vx; e.vy = vy; unstick(e); }
    s.ents = [];
  }
  function ecraserPrise(s) {
    s.mort = true;
    const R = rayonPrise(s); const v = Math.hypot(s.vx, s.vy);
    // remonter légèrement hors du solide
    let x = s.x - s.vx / (v || 1) * R * 0.4, y = s.y - s.vy / (v || 1) * R * 0.4;
    const force = 1 + s.n / 120 + v / 600;
    for (const c of st.crs) if (c.hp > 0 && !c.carried && dist(x, y, c.x + c.w / 2, c.y + c.h / 2) < R + 60 + Math.max(c.w, c.h) / 2) {
      hurt(c, Math.min(7, 1 + s.n / 70 + v / 500)); c.sta.stun = Math.max(c.sta.stun, 1.5);
      const dx = c.x + c.w / 2 - x, dy = c.y + c.h / 2 - y, d = Math.hypot(dx, dy) || 1; c.vx += dx / d * 300 * force + s.vx * 0.3; c.vy += dy / d * 200 * force - 150;
    }
    // l'effet de la matière dominante
    let dom = null, dn = 0; for (const m in s.mats) if (s.mats[m] > dn) { dn = s.mats[m]; dom = +m; }
    if (dom != null && PRISE_EFFET[dom]) applyEffect(PRISE_EFFET[dom], x, y, R + 30, { power: Math.min(3, force), size: 1, duration: 1, persist: 0 }, 'burst', { noGrid: true, noField: true, noPlayer: true });
    for (const core of s.spec.cores) if (core !== 'force' && core !== 'gravite') applyEffect(core, x, y, R + 20, s.spec.prm, 'burst', { noField: true });
    lacherEntites(s, s.vx * 0.6, s.vy * 0.6 - 150);
    for (const m in s.mats) { spawnLiquid(+m, x, y, s.mats[m], 300); part(x, y, P[m].color, Math.min(40, 8 + s.mats[m] / 8), 260 + v * 0.3, 0.9, 2.4, 900, P[m].liquid ? 'goutte' : 'eclat'); }
    st.sp.push({ k: 'ring', core: 'force', x, y, r: R + 40, life: 0.5, max: 0.5, color: s.color });
    st.shake = Math.min(0.7, 0.2 + s.n / 400); Son.sfx('burst', 'terre');
    if (s.n > 150) msg('SPLASH !');
    evt('prise', s.n);
  }
  // un clic pendant qu'on tient une prise la lance
  function lancerPrise() {
    const s = st.sp.find((q) => q.k === 'prise' && q.tenue && !q.mort);
    if (!s) return false;
    s.tenue = false;
    let vx = 0, vy = 0; for (const [a, b] of s.hist) { vx += a; vy += b; } vx /= s.hist.length || 1; vy /= s.hist.length || 1;
    const p = st.p; const pcx = p.x + p.w / 2, pcy = p.y + p.h / 2;
    if (Math.hypot(vx, vy) < 260) { const d = dist(pcx, pcy, s.x, s.y) || 1; vx = (s.x - pcx) / d * 700; vy = (s.y - pcy) / d * 700 - 120; }
    const k = Math.min(1.4, 1100 / Math.max(1, Math.hypot(vx, vy))); s.vx = vx * Math.max(1, k); s.vy = vy * Math.max(1, k);
    s.t = 0; Son.sfx('cast', 'vent');
    return true;
  }
  function finBouclier(s) {
    if (s.ring) for (const i of s.ring) if (Sim.mat[i] === M.BULLE) { Sim.mat[i] = M.AIR; Sim.touch(i); }
    if (s.stash) for (const m in s.stash) spawnLiquid(+m, s.x, s.y, s.stash[m], 400);
    s.ring = null; s.stash = null;
  }
  function detoner() {
    const att = st.sp.filter((q) => q.k === 'attente' && !q.mort);
    if (!att.length) { msg('Aucun sort en attente.'); return 0; }
    const p = st.p; const pc = { x: p.x + p.w / 2, y: p.y + p.h * 0.45 }; const aim = toWorld(game.inp.mouse.x, game.inp.mouse.y);
    for (const a of att) {
      a.mort = true; const sp = a.spec;
      if (a.trait) { let dx = aim.x - pc.x, dy = aim.y - pc.y; const d = Math.hypot(dx, dy) || 1; fireBeam(sp, pc.x, pc.y, dx / d, dy / d, 'immediat'); }
      else if (a.self) selfCast(sp, a.aim || aim);
      else if (a.relance) { const q = Seal.clone(sp.seal); q.trigger = 'immediat'; if (q.trigger2 === 'commande') q.trigger2 = null; launch(q, pc, { x: a.x, y: a.y }, { depth: sp.depth, player: true, charge: sp.charge }); }
      else if (a.mur) { const mw = 30 * sp.prm.size * (sp.prm.dimL || 1), mh = 180 * sp.prm.size * (sp.prm.dimH || 1); const rect = { x0: a.x - mw / 2, x1: a.x + mw / 2, y0: a.y - mh / 2, y1: a.y + mh / 2 }; if (!champForme(sp, rect, a.dir)) { if (sp.prm.matiere) matiereRect(sp, rect); for (const q of murPoints(a.x, a.y, mw, mh)) doBurst(sp, q.x, q.y, q.r, { mur: true, noMatiere: true, noEcho: true, noRepeat: true, noExpire: true, noCombo: true }); } } else if (false) { for (let k = -2; k <= 2; k++) doBurst(sp, a.x, a.y + k * 36 * sp.prm.size, 24 * sp.prm.size, { mur: true, noField: k !== 0, noEcho: k !== 0, noRepeat: k !== 0, noExpire: k !== 0, noCombo: k !== 0 }); }
      else doBurst(sp, a.x, a.y, (a.ent ? 50 : 70) * sp.prm.size, { ent: a.ent }, a.dir || null);
    }
    Son.sfx('burst', 'force'); return att.length;
  }
  // ---------- Familiers : chacun sa créature, son allure, son coup ----------
  function nouveauFamilier(spec, esp, x, y, i = 0) {
    const F = DATA.FAMILIERS[esp], prm = spec.prm || {};
    const f = makeCreature({ t: 'familier', x, y });
    const k = clamp(1 + 0.25 * ((prm.size || 1) - 1), 0.75, 1.6);
    Object.assign(f, { spec, core: spec.core, espece: esp, life: 30 * (prm.duration || 1), max: 30 * (prm.duration || 1), hp: Math.round(F.pv * (1 + 0.3 * ((prm.power || 1) - 1))), dmg: 0, w: Math.round(F.w * k), h: Math.round(F.h * k), echelle: k, cd: 0.4 + i * 0.3, x0: x, y0: y, vole: F.mode === 'vol' || F.mode === 'orbite', portable: false, generique: false, age: 0, orbite: Math.random() * TAU });
    f.hpMax = f.hp; f.sta.tame = true; f.filDonne = true; f.porteur = !!spec.combo;
    return f;
  }
  function updateFamilier(c, dt, p) {
    if (!c.spec) { c.hp = 0; c.respawn = 1e9; c.mort = true; return; }
    const esp = c.espece || 'feu', F = DATA.FAMILIERS[esp] || DATA.FAMILIERS.feu, prm = c.spec.prm || {}, pw = prm.power || 1;
    c.life -= dt; c.cd -= dt; c.age += dt; c.phase += dt; if (c.hurt > 0) c.hurt -= dt; if (c.coup > 0) c.coup -= dt * 4; if (c.souffle > 0) c.souffle -= dt * 2;
    if (c.life <= 0 || c.hp <= 0) { c.hp = 0; c.respawn = 1e9; c.mort = true; part(c.x + c.w / 2, c.y + c.h / 2, colorOf(esp), 14, 60, 0.7, 2, 0, 'spark'); part(c.x + c.w / 2, c.y + c.h / 2, INK, 8, 40, 0.8, 3); if (c.hp <= 0 && c.life > 0) msg(F.nom + ' se dissout en encre.'); return; }
    // les créatures hostiles le blessent au contact
    for (const q of st.crs) if (q.hp > 0 && !q.sta.tame && q.t !== 'familier' && (q.dmg || 0) > 0 && q.sta.stun <= 0 && q.sta.sleep <= 0 && U.rectsOverlap(c, q) && time - (c.coupT || -9) > 1) { c.coupT = time; hurt(c, q.dmg * (esp === 'terre' ? 0.35 : 0.6), 'coup'); part(c.x + c.w / 2, c.y + c.h / 2, colorOf(esp), 6, 50, 0.4, 2); }
    // chacun sa place près de toi ; un porteur de phénomène se tient plus loin
    const fam = st.crs.filter((f) => f.t === 'familier' && f.hp > 0), k = Math.max(0, fam.indexOf(c));
    const pcx = p.x + p.w / 2, pcy = p.y + p.h * 0.45, loin = c.porteur ? 130 : 0;
    // la cible : une créature hostile proche de toi ou de lui
    let cible = null, bd = 1e9;
    for (const q of st.crs) { if (q === c || q.hp <= 0 || q.sta.tame || q.t === 'familier' || q.carried) continue; if (esp === 'esprit' && (q.sta.sleep > 0 || q.dort)) continue; const dq = dist(c.x, c.y, q.x, q.y), dp = dist(pcx, pcy, q.x + q.w / 2, q.y + q.h / 2); if ((dq < 260 || dp < 320) && dq < bd) { bd = dq; cible = q; } }
    if (esp === 'metamorphose') { const T = c.age; c.stade = T < 8 ? 'chenille' : T < 10.5 ? 'cocon' : 'papillon'; c.stadeT = T - 8; c.vole = c.stade === 'papillon'; if (c.stade !== 'papillon') cible = null; if (c.stade === 'papillon' && !c.eclos) { c.eclos = true; c.w = Math.round(26 * (c.echelle || 1)); c.h = Math.round(16 * (c.echelle || 1)); part(c.x + c.w / 2, c.y, '#c06aa0', 16, 70, 0.8, 2, 0, 'spark'); msg('La chenille devient papillon !'); } }
    const cx = c.x + c.w / 2, cy = c.y + c.h / 2;
    const tcx = cible ? cible.x + cible.w / 2 : 0, tcy = cible ? cible.y + cible.h / 2 : 0, dcib = cible ? dist(cx, cy, tcx, tcy) : 1e9;
    // où aller
    let tx, ty;
    const place = () => { const cote = -(p.face || 1); tx = pcx + cote * (36 + 26 * k + loin); ty = pcy - 34 - (k % 2) * 16 - loin * 0.4 + Math.sin(c.phase * 2.2 + k) * 6; };
    if (esp === 'gravite') { c.orbite += dt * (cible ? 1.2 : 2.2); const R = 56 + 14 * k + loin; tx = pcx + Math.cos(c.orbite) * R; ty = pcy - 10 + Math.sin(c.orbite) * R * 0.55; if (cible && dcib < F.portee) { tx = tcx; ty = cible.y - 40; } }
    else if (esp === 'terre') { place(); const menace = cible && dist(pcx, pcy, tcx, tcy) < 260; if (menace) { tx = dcib < 80 ? tcx - Math.sign(tcx - pcx) * (cible.w / 2 + c.w / 2 - 4) : pcx + Math.sign(tcx - pcx) * 46; } }
    else if (cible && !(esp === 'metamorphose' && c.stade !== 'papillon')) { const garde = esp === 'eau' || esp === 'lumiere' || esp === 'temps' || esp === 'gravite' || esp === 'vie' || esp === 'foudre' || esp === 'metamorphose' ? F.portee * 0.6 : 0; const ang = Math.atan2(cy - tcy, cx - tcx); tx = tcx + Math.cos(ang) * garde; ty = (F.mode === 'vol' ? cible.y - 20 : tcy) + Math.sin(ang) * garde * 0.4; }
    else place();
    // allure
    const vmax = F.vitesse * ((esp === 'eau' && liquidOf(c)) ? 1.6 : 1) * (c.sta.lent > 0 ? 0.4 : 1);
    if (c.vole || F.mode === 'orbite') {
      if (!(c.dash > 0)) { c.vx += (tx - cx) * 4 * dt; c.vy += (ty - cy) * 4 * dt; c.vx *= Math.max(0, 1 - 2.8 * dt); c.vy *= Math.max(0, 1 - 2.8 * dt); const v = Math.hypot(c.vx, c.vy); if (v > vmax) { c.vx *= vmax / v; c.vy *= vmax / v; } }
      c.canStep = false; moveBody(c, dt); c.dir = Math.abs(c.vx) > 8 ? Math.sign(c.vx) : (cible ? Math.sign(tcx - cx) || c.dir : p.face || c.dir);
    } else if (esp === 'metamorphose' && c.stade === 'cocon') { applyGrav(c, dt); c.vx = 0; c.canStep = false; moveBody(c, dt); }
    else {
      applyGrav(c, dt); if (liquidOf(c)) flotter(c, dt, esp === 'feu' ? 0.6 : esp === 'terre' ? 2.4 : 0.8);
      const ddx = tx - cx, v = esp === 'metamorphose' ? F.vitesse : vmax;
      c.vx = Math.abs(ddx) > 10 ? Math.sign(ddx) * Math.min(v, Math.abs(ddx) * 4 + 30) : c.vx * 0.7;
      if (c.onGround && (c.hitX || ty < c.y - 60) && Math.abs(ddx) > 12 && esp !== 'metamorphose') c.vy = -(esp === 'terre' ? 330 : 430);
      if (!c.onGround && dist(cx, cy, pcx, pcy) > 520) { c.x = pcx - c.w / 2 - (p.face || 1) * 30; c.y = p.y + p.h - c.h; c.vx = c.vy = 0; part(c.x + c.w / 2, c.y + c.h / 2, colorOf(esp), 8, 40, 0.5, 2, 0, 'spark'); }
      c.canStep = true; moveBody(c, dt); if (Math.abs(c.vx) > 8) c.dir = Math.sign(c.vx);
      if (esp === 'transmutation') c.roule = (c.roule || 0) + c.vx * dt / (c.w * 0.4);
    }
    // perdu loin derrière : il te rejoint d'un saut de faille
    if (dist(cx, cy, pcx, pcy) > 900) { c.x = pcx - c.w / 2; c.y = p.y - c.h - 10; c.vx = c.vy = 0; }
    // le coup de chaque familier
    const frappe = (q, r = 24, kk = 1, effets = c.spec.cores, o2 = {}) => { for (const core of effets) applyEffect(core, q.x + q.w / 2, q.y + q.h / 2, r, { ...prm, power: pw * kk }, 'burst', Object.assign({ noPlayer: true, noField: true }, o2)); };
    if (cible && c.cd <= 0 && dcib < F.portee + Math.max(cible.w, cible.h) * 0.5) {
      c.cd = F.cadence; const dirc = Math.sign(tcx - cx) || 1; if (inView(cx, cy)) Son.voix(esp);
      switch (esp) {
        case 'feu': { c.souffle = 1; for (let s = 1; s <= 8; s++) { const fx = cx + (tcx - cx) * s / 8, fy = cy + (tcy - cy) * s / 8; part(fx, fy, s % 2 ? '#f0a040' : '#e0642a', 2, 30, 0.35, 3, -60, 'glow'); } frappe(cible, 22, 0.9, c.spec.cores, { noGrid: true }); cible.sta.burn = Math.max(cible.sta.burn || 0, 2); break; }
        case 'eau': { st.sp.push({ k: 'beam', core: 'eau', x1: cx, y1: cy, x2: tcx, y2: tcy, life: 0.25, max: 0.25, color: '#6aa0d8', w: 3 }); spawnLiquid(M.EAU, tcx, cible.y, 4, 16); frappe(cible, 24, 0.9); hurt(cible, 0.6 * pw); cible.vx += dirc * 260 / masse(cible); break; }
        case 'terre': { c.coup = 1; hurt(cible, 1.4 * pw); cible.sta.stun = Math.max(cible.sta.stun, 1); cible.vx += dirc * 520 / masse(cible); cible.vy -= 220; st.shake = Math.max(st.shake, 0.12); part(tcx, cible.y + cible.h, '#8a7a5a', 8, 80, 0.5, 2, 300); Son.sfx('burst', 'terre'); break; }
        case 'vent': { c.dash = 0.35; c.vx = dirc * 720; c.vy = (tcy - cy) * 2; c.touches = new Set(); break; }
        case 'vie': { cible.sta.lent = Math.max(cible.sta.lent || 0, 3.5); cible.sta.stun = Math.max(cible.sta.stun, 0.6); cible.vx = 0; const gx = Math.floor(tcx / CS), gy = Math.floor((cible.y + cible.h) / CS); for (let d = -2; d <= 2; d++) for (let e = 0; e < 3; e++) if (Sim.get(gx + d, gy - 1 - e) === M.AIR && Math.random() < 0.6) Sim.set(gx + d, gy - 1 - e, M.PLANTE); part(tcx, cible.y + cible.h, '#5c8f3e', 10, 50, 0.6, 2); break; }
        case 'lumiere': { st.flash = Math.max(st.flash, 0.05); for (const q of st.crs) if (q.hp > 0 && !q.sta.tame && q.t !== 'familier' && dist(cx, cy, q.x + q.w / 2, q.y + q.h / 2) < 120) { q.sta.stun = Math.max(q.sta.stun, 1.3); if (q.t === 'chauve' || q.t === 'limace') q.fuite = { x: cx, y: cy, t: 3 }; } frappe(cible, 30, 0.6); part(cx, cy, '#f6e080', 18, 140, 0.4, 2, 0, 'spark'); break; }
        case 'foudre': { st.eclairs.push({ x: tcx, y1: tcy, pts: FX.eclairPts(cx, cy, tcx, tcy, 0.25), branches: [], life: 0.2 }); hurt(cible, 1 * pw); cible.sta.stun = Math.max(cible.sta.stun, 0.6); frappe(cible, 18, 0.5); let b2 = null, bd2 = 140; for (const q of st.crs) if (q !== cible && q.hp > 0 && !q.sta.tame && q.t !== 'familier') { const d = dist(tcx, tcy, q.x + q.w / 2, q.y + q.h / 2); if (d < bd2) { bd2 = d; b2 = q; } } if (b2) { st.eclairs.push({ x: b2.x + b2.w / 2, y1: b2.y + b2.h / 2, pts: FX.eclairPts(tcx, tcy, b2.x + b2.w / 2, b2.y + b2.h / 2, 0.25), branches: [], life: 0.2 }); hurt(b2, 0.6 * pw); b2.sta.stun = Math.max(b2.sta.stun, 0.4); } Son.sfx('burst', 'foudre'); break; }
        case 'gravite': { cible.vy = -560 / Math.sqrt(masse(cible)); cible.vx *= 0.3; c.leve = { q: cible, t: 0.45 }; part(tcx, tcy, '#6c5ab8', 10, 60, 0.5, 2, 0, 'spark'); break; }
        case 'temps': { poserBulle('lent', tcx, tcy, 40 * (prm.size || 1), prm); cible.sta.lent = Math.max(cible.sta.lent || 0, 3); break; }
        case 'portail': { part(cx, cy, '#4fb0a0', 12, 60, 0.4, 2, 0, 'spark'); c.x = tcx - dirc * (cible.w / 2 + c.w / 2) - c.w / 2; c.y = cible.y + cible.h - c.h; c.vx = c.vy = 0; unstick(c); part(c.x + c.w / 2, c.y + c.h / 2, '#4fb0a0', 12, 60, 0.4, 2, 0, 'spark'); hurt(cible, 1 * pw); if (Math.random() < 0.25) applyEffect('saut', tcx, tcy, 26, { ...prm }, 'burst', { noPlayer: true }); Son.sfx('cast', 'portail'); break; }
        case 'esprit': { cible.sta.sleep = Math.max(cible.sta.sleep, 6 * (prm.duration || 1)); cible.fuite = null; cible.curieux = null; part(tcx, cible.y, '#b08ad8', 10, 30, 0.8, 2, -30, 'spark'); break; }
        case 'transmutation': { const gx = Math.floor(tcx / CS), gy = Math.floor((cible.y + cible.h) / CS); for (let d = -3; d <= 3; d++) for (let e = 0; e <= 2; e++) { const m = Sim.get(gx + d, gy + e); if (m === M.TERRE || m === M.MEUBLE || m === M.SABLE || m === M.HERBE) Sim.set(gx + d, gy + e, M.BOUE, 200); else if (m === M.PIERRE) Sim.set(gx + d, gy + e, M.SABLE); } cible.sta.lent = Math.max(cible.sta.lent || 0, 2.5); hurt(cible, 0.6 * pw); part(tcx, cible.y + cible.h, '#c08a3a', 10, 50, 0.5, 2, 0, 'spark'); break; }
        case 'contre': { cible.sta.stun = Math.max(cible.sta.stun, 1); if (cible.ench) cible.ench = null; cible.sta.burn = 0; if (!cible.vole_pie && Math.random() < 0.2 && DATA.ESPECES[cible.t] && DATA.ESPECES[cible.t].drop) { cible.vole_pie = true; c.butin = DATA.ESPECES[cible.t].drop; msg('La pie grise a chipé quelque chose !'); } part(tcx, tcy, '#a8a29a', 8, 50, 0.4, 2, 0, 'spark'); break; }
        case 'metamorphose': { metamorphoser(tcx, tcy, 22, prm); part(tcx, tcy, '#c06aa0', 12, 60, 0.6, 2, 0, 'spark'); break; }
      }
    }
    // effets qui durent
    if (c.dash > 0) { c.dash -= dt; for (const q of st.crs) if (q.hp > 0 && !q.sta.tame && q.t !== 'familier' && !c.touches.has(q) && U.rectsOverlap({ x: c.x - 6, y: c.y - 6, w: c.w + 12, h: c.h + 12 }, q)) { c.touches.add(q); q.vx += Math.sign(c.vx || 1) * 380 / Math.sqrt(masse(q)); q.vy -= 200 / Math.sqrt(masse(q)); frappe(q, 20, 0.7); } if (Math.random() < 0.6) part(cx, cy, '#a0d8d4', 1, 20, 0.4, 2, 0); }
    if (c.leve) { c.leve.t -= dt; if (c.leve.t <= 0) { const q = c.leve.q; c.leve = null; if (q.hp > 0) { q.vy = 1150; hurt(q, 0.8 * pw); } } }
    if (c.butin && dist(cx, cy, pcx, pcy) < 50) { dropPickup(c.butin, pcx, p.y - 6); c.butin = null; }
    // les dons de chacun
    if (ev2(c, 'don', 0.4)) {
      const pres = dist(cx, cy, pcx, pcy) < 150;
      if (esp === 'feu' && pres && Sim.tempAt(pcx, pcy) < 50) Sim.chauffer(pcx, pcy, 40, 90, 0.4);
      if (esp === 'eau' && pres) { Sim.forRadius(pcx, pcy, 70, (x, y, i, m) => { if (m === M.FEU) Sim.set(x, y, M.VAPEUR, 30); }); p.sta.burning = 0; p.hp = Math.min(p.hpMax, p.hp + 0.05); }
      if (esp === 'vent' && pres) Sim.forRadius(pcx, pcy, 60, (x, y, i, m) => { if (m === M.FUMEE || m === M.GAZ) Sim.set(x, y, M.AIR); });
      if (esp === 'vie') { if (pres) p.hp = Math.min(p.hpMax, p.hp + 0.1); for (const q of st.crs) if (q.sta.tame && q.t !== 'familier' && q.hp > 0 && dist(cx, cy, q.x, q.y) < 120) q.hp = Math.min(q.hpMax, q.hp + 0.1); if (c.onGround) { const gx = Math.floor(cx / CS), gy = Math.floor((c.y + c.h) / CS); if (Sim.get(gx, gy) === M.TERRE && Sim.get(gx, gy - 1) === M.AIR && Math.random() < 0.5) Sim.set(gx, gy - 1, M.HERBE); } }
      if (esp === 'temps' && pres) p.ink = Math.min(p.inkMax, p.ink + 0.3);
      if (esp === 'contre' && pres) { p.sta.burning = 0; p.sta.lent = 0; p.sta.dissous = 0; }
    }
    if (Math.random() < 0.25) part(cx, cy, colorOf(esp), 1, 15, 0.5, 1.6, -20, 'spark');
  }
  function retenir() { for (const g of st.crs) { if (g.t !== 'familier' || g.espece !== 'terre' || g.hp <= 0) continue; for (const q of st.crs) if (q.hp > 0 && !q.sta.tame && q.t !== 'familier' && U.rectsOverlap(g, q)) { const s2 = Math.sign(q.x + q.w / 2 - g.x - g.w / 2) || 1; q.x += s2 * 2; if (Math.sign(q.vx) === -s2) q.vx *= 0.2; } } }
  function ev2(o, cle, per) { o.acc = o.acc || {}; o.acc[cle] = (o.acc[cle] || 0) + 1 / 60; if (o.acc[cle] >= per) { o.acc[cle] = 0; return true; } return false; }
  function updateSpells(dtG) {
    let dt = dtG;
    const sols = dynSolids();
    for (const s of st.sp) {
      dt = bullesT.length && s.k !== 'bulle' && s.x !== undefined ? dtG * tempsDe(s.x, s.y, 2) : dtG; if (dt <= 0) continue;
      switch (s.k) {
        case 'proj': {
          if (s.tenu) { if (!tientMain(s.tenu.hand) || st.p.ink < s.tenu.drain * dt) { s.mort = true; part(s.x, s.y, s.color, 8, 50, 0.4, 2, 0, 'spark'); Son.sfx('fizzle'); break; } if (s.tenu.t !== time) { s.tenu.t = time; st.p.ink -= s.tenu.drain * dt; } s.life = Math.max(s.life, 0.3);
            // il file vers la souris et s'y tient, au bout de la main
            { const pp = st.p, o2 = { x: pp.x + pp.w / 2, y: pp.y + pp.h * 0.45 }, a2 = toWorld(game.inp.mouse.x, game.inp.mouse.y); let tx = a2.x - o2.x, ty = a2.y - o2.y; const td = Math.hypot(tx, ty) || 1, kk = Math.min(1, s.tenu.portee / td); tx = o2.x + tx * kk; ty = o2.y + ty * kk; const vmax = 560 * (s.prm.speed || 1); let wx = (tx - s.x) * 7, wy = (ty - s.y) * 7; const wv = Math.hypot(wx, wy); if (wv > vmax) { wx *= vmax / wv; wy *= vmax / wv; } const ka = Math.min(1, dt * 9); s.vx += (wx - s.vx) * ka; s.vy += (wy - s.vy) * ka; } }
          s.life -= dt; if (s.life <= 0) { if (s.spec && s.trig === 'commande' && !s.potion && !s.liquide) { impactProj(s, null); break; } s.mort = true; part(s.x, s.y, s.color, 5, 30, 0.4); break; }
          { const z = st.gz.length ? gravOf({ x: s.x - 1, y: s.y - 1, w: 2, h: 2 }) : null; if (z) { s.vx += 900 * z.mag * z.gx * dt; s.vy += 900 * z.mag * z.gy * dt; } else s.vy += s.grav * dt; }
          if (s.homing) { const h = s.homing; if ((h.hp !== undefined && h.hp <= 0) || h.mort) s.homing = null; else { const want = Math.atan2(h.y + h.h / 2 - s.y, h.x + h.w / 2 - s.x), cur = Math.atan2(s.vy, s.vx); let da = want - cur; while (da > Math.PI) da -= TAU; while (da < -Math.PI) da += TAU; const na = cur + clamp(da, -5 * dt, 5 * dt); const sp = Math.hypot(s.vx, s.vy); s.vx = Math.cos(na) * sp; s.vy = Math.sin(na) * sp; if (h.point && dist(s.x, s.y, h.x + 1, h.y + 1) < s.r + 14 && !s.potion && !s.liquide) { impactProj(s, null); break; } } }
          // filtre de matière : le sort traverse tout sauf la matière choisie
          if (s.spec && s.spec.filtre && !s.potion && !s.liquide) {
            s.x += s.vx * dt; s.y += s.vy * dt;
            if (Math.random() < 0.5) part(s.x, s.y, DATA.FILTRES[s.spec.filtre].couleur, 1, 10, 0.3, 2);
            const h = filtreTouche(s.spec.filtre, s.x, s.y, s.r + 4);
            if (h) { evt('hit', 'filtre:' + s.spec.filtre); impactProj(s, h.cell ? null : h); }
            if (s.y > L.h + 50 || s.y < -50) s.mort = true;
            break;
          }
          // trajectoires
          if (s.traj === 'boomerang') {
            s.bt = (s.bt || 0) + dt;
            const pp = st.p, px = pp.x + pp.w / 2, py = pp.y + pp.h * 0.4;
            if (!s.retour && s.bt > 0.42 * s.prm.range) { s.retour = true; s.hits.clear(); }
            if (s.retour) { const sp = Math.max(460, Math.hypot(s.vx, s.vy)); const ddx = px - s.x, ddy = py - s.y, dd = Math.hypot(ddx, ddy) || 1; const kk = Math.min(1, 5 * dt); s.vx += (ddx / dd * sp - s.vx) * kk; s.vy += (ddy / dd * sp - s.vy) * kk; if (dd < 28) { s.mort = true; part(px, py, s.color, 8, 50, 0.4, 2, 0, 'glow'); Son.sfx('pickup'); break; } }
            else { s.vx *= 1 - 0.8 * dt; s.vy *= 1 - 0.8 * dt; }
          } else if (s.traj === 'rasesol') {
            const g = groundBelow(s.x, s.y - 24);
            if (g != null && g - s.y < 140) s.vy = clamp((g - 9 - s.y) * 12, -700, 700); else s.vy += 900 * dt;
            if (Math.abs(s.vx) < 200) s.vx = Math.sign(s.vx || 1) * 200;
          }
          let nx = s.x + s.vx * dt, ny = s.y + s.vy * dt;
          if (s.traj === 'zigzag') { s.ph += dt * 17; const A = 15 * (s.prm.size || 1); const off = (2 / Math.PI) * Math.asin(Math.sin(s.ph)) * A; const vv = Math.hypot(s.vx, s.vy) || 1; nx += -s.vy / vv * (off - s.off); ny += s.vx / vv * (off - s.off); s.off = off; }
          if (s.traj === 'spirale') { s.ph += dt * 26; const A = Math.min(22, s.ph * 6) * (s.prm.size || 1); const off = Math.sin(s.ph) * A; const vv = Math.hypot(s.vx, s.vy) || 1; nx += -s.vy / vv * (off - s.off); ny += s.vx / vv * (off - s.off); s.off = off; }
          if (s.traj === 'rasesol' && Sim.solidAt(nx, ny)) { for (let kk = 1; kk <= 6; kk++) if (!Sim.solidAt(nx, ny - kk * CS)) { ny -= kk * CS; break; } }
          if (s.guide) { const aim = toWorld(game.inp.mouse.x, game.inp.mouse.y); const want = Math.atan2(aim.y - s.y, aim.x - s.x), cur = Math.atan2(s.vy, s.vx); let da = want - cur; while (da > Math.PI) da -= TAU; while (da < -Math.PI) da += TAU; const na = cur + clamp(da, -4 * dt, 4 * dt); const sp = Math.hypot(s.vx, s.vy); s.vx = Math.cos(na) * sp; s.vy = Math.sin(na) * sp; }
          const dirv = { x: s.vx / (Math.hypot(s.vx, s.vy) || 1), y: s.vy / (Math.hypot(s.vx, s.vy) || 1) };
          const traverse = s.traj === 'boomerang' && s.retour;
          const hitS = traverse ? null : Sim.solidAt(nx, ny) ? { t: P[Sim.matAt(nx, ny)].nom } : sols.find((o) => nx >= o.x - s.r && nx <= o.x + o.w + s.r && ny >= o.y - s.r && ny <= o.y + o.h + s.r);
          if (hitS && s.traj === 'boomerang' && !s.potion && !s.liquide) { s.retour = true; s.hits.clear(); s.vx = -s.vx * 0.6; s.vy = -s.vy * 0.6; part(s.x, s.y, s.color, 5, 50, 0.3); if (s.trig !== 'immediat') doBurst(s.spec, s.x, s.y, 28 * s.prm.size, { noPlayer: true, noField: true, noEcho: true }, dirv); break; }
          if (hitS) {
            if (s.bounces > 0) {
              s.bounces--;
              if (Sim.solidAt(s.x + s.vx * dt, s.y)) s.vx = -s.vx * 0.9; else s.vy = -s.vy * 0.9;
              part(s.x, s.y, s.color, 4, 40, 0.3);
            } else if (s.potion) { potionBurst(s.potion, s.x, s.y, s.forte); s.mort = true; }
            else if (s.liquide) { spawnLiquid(s.liquide, s.x, s.y, 26); part(s.x, s.y, s.color, 10, 60, 0.6); Son.sfx('burst', 'eau'); s.mort = true; }
            else if (s.trig === 'contact' || s.trig === 'retarde' || s.trig === 'commande' || s.trig === 'proximite') impactProj(s, null);
            else { doBurst(s.spec, s.x, s.y, 28 * s.prm.size, { noField: s.core !== 'lumiere' }, dirv); s.mort = true; }
            if (hitS.t) evt('hit', 'objet:' + hitS.t);
            break;
          }
          s.x = nx; s.y = ny;
          if (s.spec && s.spec.combo) PH.trainee(s, dt);
          const lm = Sim.matAt(s.x, s.y);
          if (P[lm].liquid && !s.plouf) { s.plouf = true; part(s.x, s.y - 4, P[lm].color, 12, 220, 0.7, 2, 900, 'goutte'); }
          if (P[lm].liquid) {
            if (s.core === 'feu' && lm === M.EAU && !s.potion && !s.liquide) { Sim.forRadius(s.x, s.y, 10, (x, y, i, m) => { if (m === M.EAU && Math.random() < 0.5) Sim.set(x, y, M.VAPEUR, 40); }); part(s.x, s.y, '#ccc', 8, 40, 0.7, 4, -100); s.mort = true; break; }
            if (s.core === 'froid' && lm === M.EAU && !s.potion && !s.liquide) { applyEffect('froid', s.x, s.y, 36 * s.prm.size, s.prm, 'burst'); s.mort = true; break; }
            if (s.core === 'foudre' && lm === M.EAU && !s.potion && !s.liquide) { applyEffect('foudre', s.x, s.y, 60 * s.prm.size, s.prm, 'burst'); s.mort = true; break; }
            s.vx *= Math.max(0, 1 - 4 * dt); s.vy *= Math.max(0, 1 - 4 * dt);
            if ((s.potion || s.liquide) && Math.abs(s.vx) + Math.abs(s.vy) < 100) { if (s.potion) potionBurst(s.potion, s.x, s.y, s.forte); else spawnLiquid(s.liquide, s.x, s.y, 26); s.mort = true; break; }
          }
          if (s.trig === 'proximite' && !s.potion && !s.liquide) { const cp = st.crs.find((c) => c.hp > 0 && !c.sta.tame && c.t !== 'familier' && !s.hits.has(c) && U.circleRect(s.x, s.y, s.r + 55, c)); if (cp) { impactProj(s, cp); break; } }
          let touche = null;
          for (const c of st.crs) if (c.hp > 0 && U.circleRect(s.x, s.y, s.r, c) && !s.hits.has(c)) { touche = c; break; }
          if (!touche) for (const o of st.objs) if (!o.mort && o.t !== 'porte' && o.t !== 'pancarte' && !o.solid && U.circleRect(s.x, s.y, s.r, o) && !s.hits.has(o)) { touche = o; break; }
          if (touche && (s.traj === 'boomerang' || s.prm.percant) && !s.potion && !s.liquide) {
            if (touche.hp !== undefined && touche.t) evt('creatureTouchee');
            s.hits.add(touche); doBurst(s.spec, s.x, s.y, 30 * s.prm.size, { noPlayer: true, noField: true, noEcho: true }, dirv); Son.sfx('hit', s.core);
            if (s.traj === 'boomerang' && !s.retour) { s.retour = true; s.hits.clear(); s.hits.add(touche); }
            break;
          }
          if (touche) {
            if (touche.hp !== undefined && touche.t) evt('creatureTouchee');
            if (s.matiere != null && touche.hp !== undefined && !s.hits.has(touche)) { hurt(touche, 1.5 + 1.5 * (s.prm.power || 1)); touche.vx += s.vx * 0.25; touche.vy -= 80; part(s.x, s.y, P[s.matiere].color, 8, 120, 0.5, 2.4, 600, 'eclat'); }
            if (s.potion) { potionBurst(s.potion, s.x, s.y, s.forte); s.mort = true; }
            else if (s.liquide) { spawnLiquid(s.liquide, s.x, s.y, 26); s.mort = true; }
            else if (s.chain > 0) {
              s.hits.add(touche); s.chain--;
              doBurst(s.spec, s.x, s.y, 36 * s.prm.size, { noPlayer: true, noField: true, noEcho: true }, dirv); Son.sfx('hit', s.core);
              let next = null, bd = 180;
              for (const c of st.crs) if (c.hp > 0 && !s.hits.has(c)) { const d = dist(s.x, s.y, c.x + c.w / 2, c.y + c.h / 2); if (d < bd) { bd = d; next = c; } }
              if (!next) for (const o of st.objs) if (!o.mort && !s.hits.has(o) && (o.t === 'caisse' || o.t === 'mannequin' || o.t === 'torche')) { const d = dist(s.x, s.y, o.x + o.w / 2, o.y + o.h / 2); if (d < bd) { bd = d; next = o; } }
              if (next && s.chain > 0) { const ddx = next.x + next.w / 2 - s.x, ddy = next.y + next.h / 2 - s.y; const dd = Math.hypot(ddx, ddy) || 1; const sp = 520; s.vx = ddx / dd * sp; s.vy = ddy / dd * sp; s.grav = 0; s.life = 1.5; }
              else { s.mort = true; }
            }
            else if (s.trig === 'contact' || s.trig === 'retarde' || s.trig === 'commande' || s.trig === 'proximite') impactProj(s, touche.hp !== undefined ? touche : null);
            else { s.hits.add(touche); for (const c of s.spec.cores) applyEffect(c, s.x, s.y, s.r + 10, { ...s.prm, power: s.prm.power * 0.9 }, 'burst', { noField: true, noPlayer: true, noGrid: true }); Son.sfx('hit', s.core); }
          }
          if (s.trig === 'immediat' && !s.potion && !s.liquide && Math.random() < 0.5) for (const c of s.spec.cores) gridEffect(c, s.x, s.y, s.r + 4, { ...s.prm, power: s.prm.power * 0.5 }, false, dt * 3);
          (s.tr || (s.tr = [])).push([s.x, s.y]); if (s.tr.length > 14) s.tr.shift();
          if (s.spec && s.spec.encreC && Math.random() < 0.45) part(s.x, s.y, s.spec.encreC, 1, 30, 0.45, 1.6, 0, 'etincelle');
          s.trail += dt; if (s.trail > 0.035) { s.trail = 0; if (s.core === 'feu') { part(s.x, s.y, s.chaud >= 2 ? '#5a90e0' : s.chaud ? '#f6e0a0' : '#f08a30', 1, 20, 0.35, s.r * 0.35, -200, 'flamme'); if (s.chaud) st.parts[st.parts.length - 1].chaud = s.chaud; } else if (s.core === 'foudre' || s.core === 'lumiere') part(s.x, s.y, s.color, 1, 60, 0.3, 1.4, 0, 'etincelle'); else if (s.core === 'eau' || s.core === 'acide') part(s.x, s.y, s.color, 1, 30, 0.5, 1.6, 600, 'goutte'); else if (s.core === 'froid') part(s.x, s.y, '#dff0ff', 1, 20, 0.8, 2.2, 30, 'flocon'); else part(s.x, s.y, s.color, 1, 10, 0.35, s.r * 0.5, 0, 'glow'); }
          if (s.y > L.h + 50 || s.y < -50) s.mort = true;
          break;
        }
        case 'trap': {
          s.life -= dt; s.t += dt; if (s.life <= 0) { s.mort = true; break; }
          let hit = false;
          if (s.spec.filtre) { s.chk -= dt; if (s.chk <= 0) { s.chk = 0.2; hit = s.spec.filtre === 'creature' ? filtreCompte('creature', s.x, s.y, s.r) > 0 : filtreCompte(s.spec.filtre, s.x, s.y, s.r * 0.6) > s.base + 2; } }
          else hit = st.crs.some((c) => c.hp > 0 && (!s.prox || (!c.sta.tame && c.t !== 'familier')) && U.circleRect(s.x, s.y, s.r, c)) || (!s.prox && st.objs.some((o) => o.dyn && !o.carried && U.circleRect(s.x, s.y, s.r, o)));
          if (hit) { doBurst(s.spec, s.x, s.y, s.r * 1.2); s.mort = true; }
          break;
        }
        case 'timer': s.t -= dt; if (s.t <= 0) { doBurst(s.spec, s.x, s.y, s.r || 60 * s.spec.prm.size, Object.assign(s.noField ? { noField: true, noEcho: true } : {}, s.mur ? { mur: true } : {})); s.mort = true; } break;
        case 'beamtimer': s.t -= dt; if (s.t <= 0) { const p = st.p; const n = 1 + (s.prm.extra || 0), a0 = Math.atan2(s.dy, s.dx); for (let i = 0; i < n; i++) { const a = a0 + (n > 1 ? (i - (n - 1) / 2) * 0.18 : 0); fireBeam(s.spec, p.x + p.w / 2, p.y + p.h * 0.45, Math.cos(a), Math.sin(a), 'immediat'); } s.mort = true; } break;
        case 'echo': s.t -= dt; if (s.t <= 0) { doBurst(s.spec, s.x, s.y, s.r, s.opts); s.left--; s.t = 0.5; if (s.left <= 0) s.mort = true; } break;
        case 'attente': {
          s.life -= dt; if (s.life <= 0) { s.mort = true; part(s.x || st.p.x, s.y || st.p.y, '#777', 6, 30, 0.6); break; }
          if (s.ent) { if (s.ent.hp <= 0 || s.ent.mort) s.ent = null; else { s.x = s.ent.x + s.ent.w / 2; s.y = s.ent.y + s.ent.h / 2; } }
          if (s.self) { const p = st.p; s.x = p.x + p.w / 2; s.y = p.y + p.h / 2; }
          break;
        }
        case 'repeat': {
          if (s.ent) { if (s.ent.hp <= 0 || s.ent.mort) s.ent = null; else { s.x = s.ent.x + s.ent.w / 2; s.y = s.ent.y + s.ent.h / 2; } }
          s.t -= dt; if (s.t > 0) break;
          s.t = s.max; s.left--;
          if (s.self) selfCast(s.spec, s.aim, true); else doBurst(s.spec, s.x, s.y, s.r, s.opts);
          if (s.left <= 0) s.mort = true;
          break;
        }
        case 'expire': s.t -= dt; if (s.t <= 0) { doBurst(s.spec, s.x, s.y, s.r, { noExpire: true, noRepeat: true, noEcho: true, noCombo: true }); st.sp.push({ k: 'label', x: s.x, y: s.y - 30, txt: 'Dernier éclat', life: 1, max: 1 }); s.mort = true; } break;
        case 'bouclier': majBouclier(s, dt); break;
        case 'prise': majPrise(s, dt); break;
        case 'canal': {
          s.t += dt; s.tick -= dt;
          const tient = s.tenu ? tientMain(s.tenu.hand) : game.inp.mouse.down;
          if (!tient || (!s.tenu && s.t > 6) || st.p.ink < s.cost * 0.2) { s.mort = true; if (s.tenu && s.x != null) { part(s.x, s.y, s.spec.color, 10, 60, 0.4, 2, 0, 'spark'); Son.sfx('fizzle'); } break; }
          const p = st.p; const pcx = p.x + p.w / 2, pcy = p.y + p.h * 0.45; const aim = toWorld(game.inp.mouse.x, game.inp.mouse.y);
          let ddx = aim.x - pcx, ddy = aim.y - pcy; const dd = Math.hypot(ddx, ddy) || 1; const k = Math.min(dd, s.range) / dd;
          if (s.soi) { s.x = pcx; s.y = pcy; } else { s.x = pcx + ddx * k; s.y = pcy + ddy * k; }
          if (s.tick <= 0) { const per = s.trait ? 0.12 : 0.2; s.tick = per; p.ink -= s.cost * per; if (s.trait) fireBeam(s.spec, pcx, pcy, ddx / dd, ddy / dd, 'immediat'); else doBurst(s.spec, s.x, s.y, s.r, { noEcho: true, noField: true, noPlayer: s.soi }); }
          break;
        }
        case 'orbit': {
          s.life -= dt; if (s.life <= 0) { s.mort = true; break; }
          const p = st.p; s.a += dt * 3.5; s.x = p.x + p.w / 2 + Math.cos(s.a) * 70; s.y = p.y + p.h / 2 + Math.sin(s.a) * 70;
          for (const c of st.crs) if (c.hp > 0 && !c.sta.tame && U.circleRect(s.x, s.y, s.r + 6, c) && (s.hits.get(c) || -9) < time - 0.8) { s.hits.set(c, time); doBurst(s.spec, s.x, s.y, 30 * s.spec.prm.size, { noPlayer: true, noField: true, noEcho: true }); }
          for (const c of s.spec.cores) if (Math.random() < 0.3) gridEffect(c, s.x, s.y, s.r + 4, { ...s.spec.prm, power: s.spec.prm.power * 0.4 }, false, dt * 3);
          if (Math.random() < 0.5) part(s.x, s.y, s.color, 1, 10, 0.3, 3);
          break;
        }
        case 'totem': {
          s.life -= dt; s.t -= dt; if (s.life <= 0) { s.mort = true; part(s.x, s.y - 20, s.color, 10, 50); if (s.spec.expire) doBurst(s.spec, s.x, s.y - 20, s.r * 1.3, { noExpire: true, noRepeat: true, noCombo: true }); break; }
          if (s.t <= 0) { s.t = 2; doBurst(s.spec, s.x, s.y - 20, s.r, { noPlayer: true, noEcho: true }); }
          break;
        }
        case 'rain': {
          s.life -= dt; s.t -= dt; if (s.life <= 0) { s.mort = true; break; }
          if (s.t <= 0) {
            s.t = 0.05;
            const x = s.x - s.w / 2 + Math.random() * s.w;
            const core = s.spec.cores[Math.floor(Math.random() * s.spec.cores.length)];
            const cx = Math.floor(x / CS), cy = Math.floor(s.yTop / CS);
            const MAT = { eau: M.EAU, acide: M.ACIDE, froid: M.NEIGE, feu: M.FEU, terre: M.SABLE, metal: M.SABLE, vie: null };
            const mg = s.spec.prm.matiere ? matiereDe(s.spec) : null;
            if (mg != null && mg !== M.AIR && Math.random() < 0.35) st.sp.push({ k: 'proj', spec: { ...s.spec, prm: { ...s.spec.prm, matiere: false, gerbe: 0, size: 0.6 } }, core, x, y: s.yTop, vx: (Math.random() - 0.5) * 40, vy: 300, r: 4, prm: { ...s.spec.prm, matiere: false, gerbe: 0, size: 0.6, power: (s.spec.prm.power || 1) * 0.5 }, trig: 'contact', bounces: 0, life: 2, grav: 700, hits: new Set(), color: P[mg].color, trail: 0, chain: 0, matiere: mg, off: 0, ph: 0 });
            else if (MAT[core] && Sim.get(cx, cy) === M.AIR) { Sim.set(cx, cy, MAT[core], core === 'feu' ? 40 : 0); }
            else st.sp.push({ k: 'proj', spec: s.spec, core, x, y: s.yTop, vx: 0, vy: 200, r: 5, prm: s.spec.prm, trig: 'contact', bounces: 0, life: 3, grav: 500, hits: new Set(), color: s.color, trail: 0, petit: true });
          }
          break;
        }
        case 'label': s.life -= dt; s.y -= 20 * dt; if (s.life <= 0) s.mort = true; break;
        case 'rafale': {
          s.t -= dt; if (s.t > 0) break;
          s.t = 0.12; s.left--;
          const p = st.p; const org = s.o.player ? { x: p.x + p.w / 2, y: p.y + p.h * 0.45 } : s.origin; const am = s.o.player ? toWorld(game.inp.mouse.x, game.inp.mouse.y) : s.aim;
          launch(s.seal, org, am, s.o); if (s.left <= 0) s.mort = true;
          break;
        }
        case 'vague': {
          s.life -= dt; if (s.life <= 0) { s.mort = true; break; }
          s.x += s.dir * s.v * dt;
          const g = groundBelow(s.x, s.y - 60); if (g == null || g - s.y > 140) { s.mort = true; break; }
          s.y += (g - s.y) * Math.min(1, dt * 12);
          if (Sim.solidAt(s.x + s.dir * s.r * 0.7, s.y - s.r * 0.7)) { doBurst(s.spec, s.x, s.y - s.r * 0.5, s.r * 1.2, { noEcho: true }); s.mort = true; break; }
          s.tick -= dt; if (s.tick <= 0) { s.tick = 0.1; for (const core of s.spec.cores) applyEffect(core, s.x, s.y - s.r * 0.5, s.r, { ...s.spec.prm, power: s.spec.prm.power * 0.6 }, 0.1, { noPlayer: true, noField: true }); }
          for (const c of st.crs) if (c.hp > 0 && !c.carried && U.circleRect(s.x, s.y - s.r * 0.5, s.r, c)) { c.vx += (s.dir * 420 - c.vx) * Math.min(1, dt * 6); if (c.onGround) c.vy -= 160; }
          for (const o of st.objs) if (o.dyn && !o.carried && !o.mort && U.circleRect(s.x, s.y - s.r * 0.5, s.r, o)) o.vx += (s.dir * 360 - o.vx) * Math.min(1, dt * 6);
          if (Math.random() < 0.6) st.parts.push({ x: s.x + (Math.random() - 0.5) * s.r, y: s.y - Math.random() * s.r, vx: s.dir * 120, vy: -80, life: 0.4, max: 0.4, color: s.color, size: 2, grav: 300, type: 'glow' });
          break;
        }
        case 'colonne': {
          s.life -= dt; if (s.life <= 0) { s.mort = true; break; }
          s.tick -= dt; if (s.tick <= 0) { s.tick = 0.1; for (let q = 0; q < 4; q++) for (const core of s.spec.cores) applyEffect(core, s.x, s.y - (q + 0.5) * s.h / 4, s.w * 1.4, { ...s.spec.prm, power: s.spec.prm.power * 0.5 }, 0.1, { noPlayer: true, noField: true }); }
          const souleve = (b, f) => { const bx = b.x + b.w / 2; if (Math.abs(bx - s.x) > s.w + b.w / 2 || b.y + b.h < s.y - s.h || b.y > s.y + 4) return; b.vy -= 2600 * dt * f; if (b.vy < -480) b.vy = -480; b.onGround = false; };
          for (const c of st.crs) if (c.hp > 0 && !c.carried) souleve(c, c.t === 'golem' ? 0.5 : 1);
          for (const o of st.objs) if (o.dyn && !o.carried && !o.mort) souleve(o, 1);
          souleve(st.p, 0.8);
          if (Math.random() < 0.8) st.parts.push({ x: s.x + (Math.random() - 0.5) * s.w * 1.5, y: s.y - Math.random() * s.h * 0.3, vx: (Math.random() - 0.5) * 40, vy: -260 - Math.random() * 200, life: 0.7, max: 0.7, color: s.color, size: 2.4, grav: 0, type: s.spec.core === 'eau' ? 'goutte' : s.spec.core === 'feu' ? 'flamme' : 'glow' });
          break;
        }
        case 'bulle': {
          s.life -= dt; if (s.life <= 0) { s.mort = true; if (s.mode === 'fige') for (const q of st.sp) if (q.gelV) { [q.vx, q.vy, q.grav] = q.gelV; q.gelV = null; } break; }
          if (s.mode !== 'vite') vieillir(s.mode, s.x, s.y, s.r, dt, s.f, s.rect);
          else { s.acc = (s.acc || 0) + dt; if (s.acc >= 0.05) { vieillir(s.mode, s.x, s.y, s.r, s.acc, s.f, s.rect); s.acc = 0; } } // 20 fois par seconde suffit
          if (Math.random() < 0.5) { const a = Math.random() * TAU, rr = s.r * (0.3 + Math.random() * 0.7); st.parts.push({ x: s.x + Math.cos(a) * rr, y: s.y + Math.sin(a) * rr, vx: s.mode === 'vite' ? -Math.sin(a) * 160 : -Math.sin(a) * 12, vy: s.mode === 'vite' ? Math.cos(a) * 160 : Math.cos(a) * 12, life: 0.6, max: 0.6, color: s.mode === 'vite' ? '#c8ccd8' : '#8aa0d8', size: 2, grav: 0, type: 'glow' }); }
          break;
        }
        case 'tornade': {
          s.life -= dt; if (s.life <= 0) { s.mort = true; break; }
          s.x += Math.sin(time * 0.9 + s.ph) * 50 * dt;
          const g2 = groundBelow(s.x, s.y - 40); if (g2 != null) s.y += (g2 - s.y) * Math.min(1, dt * 4);
          const kk = Math.min(1, s.life / 0.6);
          const lift = (b, f) => { const bx = b.x + b.w / 2, by = b.y + b.h / 2; if (Math.abs(bx - s.x) > s.r + b.w / 2 || by > s.y + 10 || by < s.y - s.h) return; const dx = s.x - bx; b.vx += dx * 5 * dt * f + Math.cos(time * 6 + by * 0.05) * 600 * dt * f; b.vy -= 1700 * dt * f * kk; if (b.vy < -380) b.vy = -380; b.onGround = false; };
          for (const c of st.crs) if (c.hp > 0 && !c.carried) lift(c, c.t === 'golem' ? 0.45 : 1);
          for (const o of st.objs) if (o.dyn && !o.carried && !o.mort) lift(o, 1);
          lift(st.p, 0.55);
          const x0 = Math.floor((s.x - s.r) / CS), x1 = Math.floor((s.x + s.r) / CS), y0 = Math.max(1, Math.floor((s.y - s.h) / CS)), y1 = Math.floor(s.y / CS);
          for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) { const m = Sim.get(x, y); if (!m) continue; const q = P[m]; if (!(q.liquid || q.powder || q.gas) || m === M.BULLE || m === M.LAVE) continue; if (Math.random() < 0.35 * kk) { const nx = x + (Math.random() < 0.4 ? (Math.random() < 0.5 ? -1 : 1) : 0); if (Sim.get(nx, y - 1) === M.AIR) Sim.swap(y * Sim.W + x, (y - 1) * Sim.W + nx); } }
          if (Math.random() < 0.7) { const f = Math.random(); st.parts.push({ x: s.x + (Math.random() - 0.5) * s.r * (0.4 + f), y: s.y - f * s.h, vx: (Math.random() - 0.5) * 200, vy: -120, life: 0.5, max: 0.5, color: '#bfe8e8', size: 2, grav: 0, type: 'vent' }); }
          break;
        }
        case 'singularite': {
          s.life -= dt; const ph = s.life > 0.6;
          const pull = (b, k) => { const bx = b.x + b.w / 2, by = b.y + b.h / 2; const dx = s.x - bx, dy = s.y - by; const d = Math.hypot(dx, dy) || 1; if (d > s.r) return; if (ph) { b.vx += dx / d * 1800 * dt * k; b.vy += dy / d * 1800 * dt * k; } else { b.vx -= dx / d * 900 * k; b.vy -= dy / d * 900 * k - 200; } };
          if (s.life <= 0.6 && !s.recrache) { s.recrache = true; for (const c of st.crs) if (c.hp > 0) pull(c, 1); for (const o of st.objs) if (o.dyn && !o.carried) pull(o, 1); pull(st.p, 0.6); st.shake = 0.4; Son.sfx('burst', 'force'); }
          if (ph) { for (const c of st.crs) if (c.hp > 0) pull(c, 1); for (const o of st.objs) if (o.dyn && !o.carried) pull(o, 1); pull(st.p, 0.5); Sim.forRadius(s.x, s.y, s.r * 0.7, (x, y, i, m) => { const q = P[m]; if ((q.liquid || q.powder || q.gas) && Math.random() < 0.3) { const dx = Math.sign(Math.floor(s.x / CS) - x), dy = Math.sign(Math.floor(s.y / CS) - y); const j = (y + dy) * Sim.W + x + dx; if (Sim.get(x + dx, y + dy) === M.AIR) Sim.swap(i, j); } }); }
          if (s.life <= 0) s.mort = true;
          break;
        }
        case 'field': {
          s.life -= dt; if (s.life <= 0) { s.mort = true; if (s.spec && s.spec.expire && s.follow) doBurst(s.spec, s.x, s.y, s.r * 1.2, { noExpire: true, noRepeat: true, noCombo: true }); break; }
          if (s.follow) { const p = st.p; s.x = p.x + p.w / 2; s.y = p.y + p.h / 2; }
          if (s.vx) { s.x += s.vx * dt; if (Sim.solidAt(s.x + Math.sign(s.vx) * s.r * 0.5, s.y)) s.vx = -s.vx; }
          if (s.faible) break;
          if (s.spec) { doContinuous(s.spec, s.x, s.y, s.r, dt, { noField: true, noPlayer: !!s.follow }); }
          else applyEffect(s.core, s.x, s.y, s.r, { ...s.prm, power: s.prm.power * 0.5 }, dt, { noField: true });
          if (Math.random() < 0.6) { const a = Math.random() * TAU, rr = Math.random() * s.r; part(s.x + Math.cos(a) * rr, s.y + Math.sin(a) * rr * 0.5, colorOf(s.core), 1, 20, 0.7, 3, s.core === 'feu' ? -200 : s.core === 'eau' ? 100 : -30, s.core === 'lumiere' ? 'spark' : 'dot'); }
          break;
        }
        case 'ring': case 'beam': case 'zap': case 'rembob': case 'fantome': s.life -= dt; if (s.life <= 0) s.mort = true; break;
      }
      if (s.k === 'field' && s.faible) for (const o of st.objs) if (o.t === 'rune' && U.circleRect(s.x, s.y, s.r * 2, o)) o.revele = Math.min(1, o.revele + dt * 0.8);
    }
    if (st.p.sta.lumiere > 0) for (const o of st.objs) if (o.t === 'rune' && dist(o.x + 20, o.y + 30, st.p.x, st.p.y) < 220) o.revele = Math.min(1, o.revele + dt * 0.8);
    // collisions entre projectiles : fusion forcée au point de rencontre
    const pj = st.sp.filter((q) => q.k === 'proj' && !q.mort && q.spec && !q.potion && !q.liquide);
    for (let i = 0; i < pj.length; i++) for (let j = i + 1; j < pj.length; j++) {
      const a = pj[i], b = pj[j]; if (a.mort || b.mort || a.spec.castId === b.spec.castId) continue;
      if (dist(a.x, a.y, b.x, b.y) < a.r + b.r + 6) collision(a, b);
    }
    for (const mq of st.marques) mq.t += dt;
    st.sp = st.sp.filter((s) => !s.mort);
    st.crs = st.crs.filter((c) => !c.mort);
  }
  function updateParts(dtG) {
    for (const q of st.parts) { const dt = bullesT.length ? dtG * tempsDe(q.x, q.y, 2) : dtG; if (dt <= 0) continue; q.life -= dt; q.vy += q.grav * dt; q.x += q.vx * dt; q.y += q.vy * dt; q.vx *= Math.max(0, 1 - 2 * dt); }
    st.parts = st.parts.filter((q) => q.life > 0);
  }
  function updatePickups(dt) {
    const p = st.p;
    for (const k of st.pickups) {
      { const z = st.gz.length ? gravOf({ x: k.x - 1, y: k.y - 1, w: 2, h: 2 }) : null; if (z) { k.vx += 900 * z.mag * z.gx * dt; k.vy += 900 * z.mag * z.gy * dt; if (z.mag === 0) { k.vx *= 0.98; k.vy *= 0.98; } } else k.vy += 900 * dt; } k.x += k.vx * dt; k.y += k.vy * dt; k.vx *= 0.98; k.bob += dt;
      if (k.vy > 0 && Sim.solidAt(k.x, k.y + 2)) { k.vy = 0; k.vx = 0; while (Sim.solidAt(k.x, k.y)) k.y -= 1; }
      if (dist(k.x, k.y, p.x + p.w / 2, p.y + p.h / 2) < 40) { k.pris = true; game.gainIngredient(k.ing); }
      if (k.y > L.h + 50) k.pris = true;
    }
    st.pickups = st.pickups.filter((k) => !k.pris);
  }

  // ---------- Rendu ----------
  function draw(ctx, paperPat, inp, selected) {
    const cam = st.cam; const p = st.p;
    const shx = st.shake > 0 ? (Math.random() - 0.5) * 6 : 0;
    const camI = { x: Math.round(cam.x) + shx, y: Math.round(cam.y) };
    ctx.save();
    ctx.fillStyle = paperPat; ctx.fillRect(0, 0, VW, VH);
    drawSky(ctx, camI);
    ctx.save(); ctx.translate(-camI.x, -camI.y);
    Sim.draw(ctx, camI, VW, VH);
    for (const o of st.objs) if (o.x + o.w > cam.x - 100 && o.x < cam.x + VW + 100 && o.y + o.h > cam.y - 100 && o.y < cam.y + VH + 100) drawObj(ctx, o);
    for (const k of st.pickups) { const ing = DATA.INGREDIENTS[k.ing]; const yy = k.y - 10 + Math.sin(k.bob * 4) * 3; ctx.save(); ctx.fillStyle = ing.couleur; ctx.strokeStyle = INK; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.arc(k.x, yy, 7, 0, TAU); ctx.fill(); ctx.stroke(); ctx.fillStyle = 'rgba(255,255,255,0.5)'; ctx.beginPath(); ctx.arc(k.x - 2, yy - 2, 2, 0, TAU); ctx.fill(); ctx.restore(); }
    for (const c of st.crs) if (c.hp > 0) drawCreature(ctx, c);
    drawPlayer(ctx, p);
    for (const q of st.portails) { ctx.save(); ctx.strokeStyle = '#4fb0a0'; ctx.lineWidth = 3; ctx.globalAlpha = 0.9; ctx.beginPath(); ctx.ellipse(q.x, q.y, q.r * 0.55, q.r, 0, 0, TAU); ctx.stroke(); ctx.lineWidth = 1.2; ctx.globalAlpha = 0.5; ctx.beginPath(); ctx.ellipse(q.x, q.y, q.r * 0.3, q.r * 0.7, time * 2, 0, TAU); ctx.stroke(); ctx.restore(); if (Math.random() < 0.3) part(q.x + (Math.random() - 0.5) * 20, q.y + (Math.random() - 0.5) * 40, '#4fb0a0', 1, 10, 0.5, 2, 0, 'spark'); }
    if (st.lien) { ctx.save(); ctx.strokeStyle = '#c9a63a'; ctx.lineWidth = 2.5; U.inkLine(ctx, p.x + p.w / 2, p.y + p.h * 0.4, st.lien.x, st.lien.y, Math.floor(time * 3), 2); ctx.fillStyle = '#c9a63a'; ctx.beginPath(); ctx.arc(st.lien.x, st.lien.y, 4, 0, TAU); ctx.fill(); ctx.restore(); }
    if (st.control) { const c = st.control.c; ctx.save(); ctx.strokeStyle = '#b08ad8'; ctx.lineWidth = 2; ctx.setLineDash([4, 4]); U.inkCircle(ctx, c.x + c.w / 2, c.y + c.h / 2, Math.max(c.w, c.h) * 0.8, 2, 1.5); ctx.setLineDash([]); ctx.globalAlpha = 0.5; U.inkLine(ctx, p.x + p.w / 2, p.y + 10, c.x + c.w / 2, c.y, 3, 3); ctx.restore(); }
    for (const z of st.gz) drawGField(ctx, z);
    st.marques.forEach((mq, i) => { const q = posMarque(mq); if (!q) return; const last = i === st.marques.length - 1; ctx.save(); ctx.globalAlpha = last ? 0.95 : 0.5; const g = ctx.createRadialGradient(q.x, q.y, 2, q.x, q.y, 26); g.addColorStop(0, 'rgba(224,176,80,0.45)'); g.addColorStop(1, 'rgba(224,176,80,0)'); ctx.fillStyle = g; ctx.fillRect(q.x - 26, q.y - 26, 52, 52); ctx.translate(q.x, q.y - (mq.ent ? mq.ent.h / 2 + 12 : 0)); ctx.rotate(time * 0.8); Seal.glyph(ctx, 'marque', 0, 0, last ? 9 : 7, '#c08a2a', 3); ctx.restore(); });
    PH.draw(ctx, time);
    for (const s of st.sp) drawSpell(ctx, s);
    for (const q of st.parts) drawPart(ctx, q);
    // halos : feu, lave, torches, cristaux
    for (const l of Sim.lights(camI, VW, VH)) FX.glow(ctx, l.x, l.y, l.r * 0.55, l.r > 80 ? '#e0642a' : '#f0a040', 0.16);
    for (const o of st.objs) if (o.t === 'torche' && o.lit) FX.glow(ctx, o.x + o.w / 2, o.y + 2, 46 + Math.sin(time * 9 + o.seed) * 4, '#f0a040', 0.45);
    for (const e of st.eclairs) { FX.eclair(ctx, e.pts, '#e8d060', 3 * e.life / 0.35 + 1.2, Math.min(1, e.life * 4), e.branches); FX.glow(ctx, e.x, e.y1, 120, '#fff6c0', e.life * 2); }
    ctx.restore();
    drawRain(ctx);
    drawDark(ctx, camI);
    if (st.revelation && st.revelation.t > 0) {
      const Rv = st.revelation; Rv.t -= 1 / 60; const kk = Math.min(1, Rv.t / 2);
      const VIS = ['coffre', 'page', 'champignon', 'ruche', 'graine', 'rune', 'levier', 'plaque', 'brasier', 'lampe', 'roue', 'moulin', 'grille'];
      ctx.save(); ctx.translate(-camI.x, -camI.y);
      for (const o of st.objs) { if (o.mort || !VIS.includes(o.t) || (o.t === 'coffre' && o.ouvert) || (o.t === 'page' && o.lue) || dist(Rv.x, Rv.y, o.x, o.y) > Rv.r) continue; const ox = o.x + o.w / 2, oy = o.y + o.h / 2; FX.glow(ctx, ox, oy, 26 + Math.sin(time * 4) * 4, '#f0d070', 0.55 * kk); ctx.strokeStyle = '#c08a2a'; ctx.globalAlpha = 0.8 * kk; ctx.lineWidth = 1.5; U.inkCircle(ctx, ox, oy, Math.max(o.w, o.h) * 0.7 + 6, 3, 1); ctx.globalAlpha = 1; }
      for (const q of st.pickups) if (dist(Rv.x, Rv.y, q.x, q.y) < Rv.r) FX.glow(ctx, q.x, q.y, 18, '#f0d070', 0.5 * kk);
      ctx.restore();
    }
    FX.vignette(ctx, VW, VH);
    { const S = saison(); U.txt(ctx, { printemps: '❀ Printemps', ete: '☀ Été', automne: '❧ Automne', hiver: '❄ Hiver' }[S] + ' · jour ' + ((st.jour || 0) + 1), VW - 20, 62, 15, 'right', 'rgba(31,26,22,0.7)', 'IM Fell English', 'italic'); }
    if (st.flash > 0) { ctx.fillStyle = 'rgba(255,250,220,' + (st.flash * 4) + ')'; ctx.fillRect(0, 0, VW, VH); }
    // réticule
    ctx.save();
    const mx = inp.mouse.x, my = inp.mouse.y;
    const col = selected && selected.type === 'seal' && selected.seal.core ? DATA.CORES[selected.seal.core].couleur : selected && selected.type === 'potion' ? DATA.POTIONS[selected.id].couleur : selected && selected.type === 'liquide' ? DATA.INGREDIENTS[selected.id].couleur : '#8a7a5a';
    ctx.strokeStyle = col; ctx.lineWidth = 1.5; ctx.globalAlpha = 0.9;
    U.inkCircle(ctx, mx, my, 10, 5, 0.5);
    ctx.beginPath(); ctx.arc(mx, my, 2, 0, TAU); ctx.fillStyle = col; ctx.fill();
    ctx.setLineDash([3, 5]); ctx.globalAlpha = 0.35;
    U.inkLine(ctx, p.x + p.w / 2 - camI.x, p.y + p.h * 0.45 - camI.y, mx, my, 2, 0.5);
    if (inp.dig) { ctx.setLineDash([]); ctx.globalAlpha = 0.7; ctx.strokeStyle = '#8a6b2f'; U.inkCircle(ctx, mx, my, 16, 6, 1); }
    // trajectoire en pointillés courts
    { const tr = trajectoire(selected, mx + camI.x, my + camI.y); if (tr) { ctx.setLineDash([]); ctx.fillStyle = col; for (let i = 0; i < tr.length; i++) { ctx.globalAlpha = 0.75 * (1 - i / tr.length); ctx.beginPath(); ctx.arc(tr[i][0] - camI.x, tr[i][1] - camI.y, 2.6, 0, TAU); ctx.fill(); } } }
    ctx.restore();
    for (const o of st.objs) if (o.t === 'pancarte' && dist(o.x, o.y, p.x, p.y) < 120) drawBubble(ctx, o.x + o.w / 2 - camI.x, o.y - 20 - camI.y, o.texte);
    const ni = labelInteraction(findInteraction());
    if (ni) drawBubble(ctx, p.x + p.w / 2 - camI.x, p.y - 26 - camI.y, '[E] ' + ni);
    ctx.restore();
  }
  function trajectoire(sel, ax, ay) {
    if (!sel) return null;
    let v = 0, grav = 0, dvy = 0;
    if (sel.type === 'seal') {
      const s = sel.seal; if (!s.core || (s.shape !== 'projectile' && s.shape !== 'chaine')) return null;
      const prm = Seal.params(s); if (prm.orbite) return null;
      v = (s.core === 'foudre' ? 800 : 520) * prm.speed;
      grav = ['lumiere', 'vent', 'ombre', 'foudre', 'gravite', 'son', 'esprit', 'temps'].includes(s.core) ? 40 : 420 / prm.speed;
    } else if (sel.type === 'potion') { if (DATA.POTIONS[sel.id].usage !== 'lancer') return null; v = 460; grav = 700; dvy = -80; }
    else if (sel.type === 'liquide') { v = 440; grav = 700; dvy = -80; }
    else if (sel.type === 'parchemin') { const q = game.inv.parchemins[sel.nom]; return q ? trajectoire({ type: 'seal', seal: q.seal }, ax, ay) : null; }
    else return null;
    const p = st.p; let x = p.x + p.w / 2, y = p.y + p.h * 0.45; let dx = ax - x, dy = ay - y; const d = Math.hypot(dx, dy) || 1;
    let vx = dx / d * v, vy = dy / d * v + dvy; const pts = [];
    for (let i = 0; i < 9; i++) { for (let k = 0; k < 3; k++) { const h = 0.014; vy += grav * h; x += vx * h; y += vy * h; } if (Sim.solidAt(x, y)) break; if (i > 0) pts.push([x, y]); }
    return pts;
  }
  function drawBubble(ctx, x, y, text) {
    ctx.save();
    ctx.font = '16px "IM Fell English", Georgia, serif';
    const w = ctx.measureText(text).width + 24;
    const bx = clamp(x - w / 2, 8, VW - w - 8), by = clamp(y - 34, 8, VH - 40);
    ctx.fillStyle = 'rgba(239,227,196,0.95)'; ctx.strokeStyle = INK; ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.roundRect(bx, by, w, 28, 6); ctx.fill(); ctx.stroke();
    U.txt(ctx, text, bx + w / 2, by + 14, 16, 'center');
    ctx.restore();
  }
  function drawSky(ctx, cam) {
    const dl = daylight();
    ctx.save();
    // teinte du ciel : chaleur le jour, bleu nuit la nuit
    const horizon = (Sim.surf ? 125 * CS : 750) - cam.y;
    const g = ctx.createLinearGradient(0, 0, 0, Math.max(10, horizon));
    g.addColorStop(0, `rgba(${Math.round(60 + 160 * dl)},${Math.round(70 + 150 * dl)},${Math.round(120 + 90 * dl)},${0.22 + 0.2 * (1 - dl)})`);
    g.addColorStop(1, 'rgba(240,210,150,0)');
    ctx.fillStyle = g; ctx.fillRect(0, 0, VW, Math.max(10, horizon));
    // soleil / lune
    const a = (st.tod - 0.25) * TAU; const sx = VW * 0.5 + Math.cos(a) * VW * 0.55 - cam.x * 0.03, sy = 420 - Math.sin(a) * 380 - cam.y * 0.15;
    if (dl > 0.05) { const gg = ctx.createRadialGradient(sx, sy, 10, sx, sy, 180); gg.addColorStop(0, `rgba(230,190,90,${0.6 * dl})`); gg.addColorStop(1, 'rgba(230,190,90,0)'); ctx.fillStyle = gg; ctx.fillRect(sx - 180, sy - 180, 360, 360); ctx.strokeStyle = INK; ctx.lineWidth = 1.2; ctx.globalAlpha = 0.5 * dl; U.inkCircle(ctx, sx, sy, 38, 9, 1.5); ctx.globalAlpha = 1; }
    const ma = a + Math.PI; const mx = VW * 0.5 + Math.cos(ma) * VW * 0.55 - cam.x * 0.03, my = 420 - Math.sin(ma) * 380 - cam.y * 0.15;
    if (dl < 0.95) { ctx.globalAlpha = 0.8 * (1 - dl); ctx.fillStyle = '#efe3c4'; ctx.strokeStyle = INK; ctx.lineWidth = 1.2; ctx.beginPath(); ctx.arc(mx, my, 26, 0, TAU); ctx.fill(); U.inkCircle(ctx, mx, my, 26, 4, 1); ctx.beginPath(); ctx.arc(mx + 10, my - 4, 20, 0, TAU); ctx.fillStyle = 'rgba(31,26,22,0.15)'; ctx.fill(); ctx.globalAlpha = 1; }
    // étoiles
    if (dl < 0.5) { ctx.fillStyle = INK; ctx.globalAlpha = (0.5 - dl) * 1.4; for (let i = 0; i < 60; i++) { const x = (U.hash2(i, 3) * 2600 - cam.x * 0.05) % VW, y = U.hash2(i, 5) * Math.max(10, horizon - 40); ctx.fillRect(((x % VW) + VW) % VW, y, 1.5, 1.5); } ctx.globalAlpha = 1; }
    // collines lointaines
    ctx.strokeStyle = INK; ctx.lineWidth = 1.3; ctx.globalAlpha = 0.35;
    for (let layer = 0; layer < 2; layer++) {
      const par = 0.15 + layer * 0.12, base = horizon - 80 + layer * 50;
      ctx.beginPath();
      const off = cam.x * par;
      for (let x = -20; x <= VW + 20; x += 8) { const wx = x + off; const y = base - 60 * Math.sin(wx * 0.004 + layer) - 25 * Math.sin(wx * 0.011 + layer * 2); if (x === -20) ctx.moveTo(x, y); else ctx.lineTo(x, y); }
      ctx.stroke();
    }
    // nuages
    const nb = st.meteo.type === 'clair' ? 4 : 9;
    ctx.globalAlpha = st.meteo.type === 'orage' ? 0.6 : 0.3; ctx.lineWidth = 1.2;
    for (let i = 0; i < nb; i++) {
      const x = ((i * 380 + time * 8 - cam.x * 0.08) % (VW + 300) + VW + 300) % (VW + 300) - 150;
      const y = 60 + (i % 3) * 50 - cam.y * 0.1;
      if (st.meteo.type !== 'clair') { ctx.fillStyle = 'rgba(100,95,90,0.25)'; for (let k = 0; k < 5; k++) { ctx.beginPath(); ctx.arc(x + k * 22, y + (k % 2) * 6, 16, 0, TAU); ctx.fill(); } }
      for (let k = 0; k < 5; k++) U.inkCircle(ctx, x + k * 22, y + (k % 2) * 6, 14 + (k % 2) * 6, i * 10 + k, 1.2);
    }
    ctx.restore();
  }
  function drawRain(ctx) {
    if (st.meteo.type !== 'pluie' && st.meteo.type !== 'orage') return;
    if (saison() === 'hiver') { ctx.save(); ctx.fillStyle = '#ffffff'; ctx.strokeStyle = 'rgba(31,26,22,0.25)'; ctx.lineWidth = 0.6; const n = st.meteo.type === 'orage' ? 140 : 90; for (let i = 0; i < n; i++) { const x = (U.hash2(i, 9) * VW + Math.sin(time * 0.8 + i) * 30 + time * 40) % VW, y = (U.hash2(i, 4) * VH + time * 70 * (0.6 + U.hash2(i, 6) * 0.6)) % VH; const r = 1.4 + U.hash2(i, 3) * 1.6; ctx.beginPath(); ctx.arc(x, y, r, 0, TAU); ctx.fill(); ctx.stroke(); } ctx.restore(); return; }
    ctx.save(); ctx.strokeStyle = '#3b6fb6'; ctx.globalAlpha = 0.35; ctx.lineWidth = 1;
    const n = st.meteo.type === 'orage' ? 120 : 70;
    ctx.beginPath();
    for (let i = 0; i < n; i++) { const x = (U.hash2(i, 9) * VW + time * 300 * (0.7 + U.hash2(i, 2) * 0.6)) % VW, y = (U.hash2(i, 4) * VH + time * 700 * (0.8 + U.hash2(i, 6) * 0.4)) % VH; ctx.moveTo(x, y); ctx.lineTo(x - 3, y + 14); }
    ctx.stroke(); ctx.restore();
  }
  // calques précalculés : dégradé de profondeur et tache de lumière
  let gradProf = null, tacheLum = null;
  function calquesNuit() {
    gradProf = document.createElement('canvas'); gradProf.width = 1; gradProf.height = 180;
    { const g = gradProf.getContext('2d'); const gr = g.createLinearGradient(0, 0, 0, 180); gr.addColorStop(0, 'rgba(18,14,11,0)'); gr.addColorStop(1, 'rgba(18,14,11,0.93)'); g.fillStyle = gr; g.fillRect(0, 0, 1, 180); }
    tacheLum = document.createElement('canvas'); tacheLum.width = tacheLum.height = 128;
    { const g = tacheLum.getContext('2d'); const gr = g.createRadialGradient(64, 64, 64 * 0.15 / 1.1, 64, 64, 64 / 1.1); gr.addColorStop(0, 'rgba(0,0,0,1)'); gr.addColorStop(0.6, 'rgba(0,0,0,0.7)'); gr.addColorStop(1, 'rgba(0,0,0,0)'); g.fillStyle = gr; g.fillRect(0, 0, 128, 128); }
  }
  function drawDark(ctx, cam) {
    if (!gradProf) calquesNuit();
    const nightA = (1 - daylight()) * 0.62;
    // profondeur : plus sombre sous la surface (colonnes de 8 px, fusionnées quand elles se suivent)
    const surf = Sim.surf, cols = [];
    let sous = false;
    if (surf) {
      for (let sx = 0; sx < VW; sx += 8) {
        const cx = clamp(Math.floor((cam.x + sx + 4) / CS), 0, Sim.W - 1);
        let acc = 0, n = 0; for (let k = -5; k <= 5; k++) { const q = cx + k; if (q >= 0 && q < Sim.W) { acc += surf[q]; n++; } }
        const sy = Math.round((acc / n) * CS - cam.y + 60);
        if (sy < VH) sous = true;
        const last = cols[cols.length - 1];
        if (last && Math.abs(last.sy - sy) <= 1) last.w += 8; else cols.push({ sx, sy, w: 8 });
      }
    }
    if (nightA <= 0.01 && !sous) return; // plein jour, à l'air libre : rien à assombrir
    const d = darkCv.getContext('2d');
    d.setTransform(0.5, 0, 0, 0.5, 0, 0);
    d.clearRect(0, 0, VW, VH);
    if (nightA > 0.01) { d.fillStyle = 'rgba(14,12,22,' + nightA + ')'; d.fillRect(0, 0, VW, VH); }
    if (sous) { d.fillStyle = 'rgba(18,14,11,0.93)'; for (const c of cols) { if (c.sy >= VH) continue; d.drawImage(gradProf, c.sx, c.sy, c.w, 180); if (c.sy + 180 < VH) d.fillRect(c.sx, c.sy + 180, c.w, VH - c.sy - 180); } }
    d.globalCompositeOperation = 'destination-out';
    // lumières : regroupées par cases de 40 px (on garde la plus grande)
    const cases = new Map();
    for (const l of lights()) {
      const x = l.x - cam.x, y = l.y - cam.y;
      if (x < -l.r || x > VW + l.r || y < -l.r || y > VH + l.r) continue;
      const key = ((x / 40) | 0) * 4096 + ((y / 40) | 0); const q = cases.get(key);
      if (!q || q.r < l.r) cases.set(key, { x, y, r: l.r });
    }
    for (const l of cases.values()) { const R = l.r * (1 + Math.sin(time * 7 + l.x) * 0.04) * 1.1; d.drawImage(tacheLum, l.x - R, l.y - R, R * 2, R * 2); }
    d.globalCompositeOperation = 'source-over';
    ctx.drawImage(darkCv, 0, 0, VW, VH);
  }

  function drawObj(ctx, o) {
    ctx.save();
    ctx.strokeStyle = INK; ctx.lineWidth = 2; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    const cx = o.x + o.w / 2;
    switch (o.t) {
      case 'levier': {
        ctx.fillStyle = '#a8977a'; U.inkRect(ctx, o.x, o.y + o.h - 10, o.w, 10, o.seed, 0.6); ctx.fill(); ctx.stroke();
        const a = -0.7 + o.anim * 1.4, bx = o.x + o.w / 2, by = o.y + o.h - 8; const ex = bx + Math.sin(a) * 26, ey = by - Math.cos(a) * 26;
        ctx.strokeStyle = '#6b4f2a'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(bx, by); ctx.lineTo(ex, ey); ctx.stroke();
        ctx.fillStyle = o.voulu !== undefined && o.etat === o.voulu ? '#e0b050' : '#9a4a3a'; ctx.strokeStyle = INK; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.arc(ex, ey, 4.5, 0, TAU); ctx.fill(); ctx.stroke();
        break;
      }
      case 'plaque': {
        const dy = o.press * 3; ctx.fillStyle = o.actif ? '#d8b860' : '#a8977a'; ctx.fillRect(o.x, o.y + dy, o.w, o.h - dy); ctx.strokeRect(o.x, o.y + dy, o.w, o.h - dy);
        Seal.glyph(ctx, 'poids', o.x + o.w / 2, o.y + 4 + dy, 3.5, o.actif ? '#6b3f00' : 'rgba(31,26,22,0.5)', 1);
        if (o.actif) FX.glow(ctx, o.x + o.w / 2, o.y, 26, '#e0b050', 0.35);
        break;
      }
      case 'brasier': {
        ctx.fillStyle = '#5a524c'; ctx.beginPath(); ctx.moveTo(o.x, o.y + 6); ctx.lineTo(o.x + o.w, o.y + 6); ctx.lineTo(o.x + o.w - 6, o.y + 16); ctx.lineTo(o.x + 6, o.y + 16); ctx.closePath(); ctx.fill(); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(cx, o.y + 16); ctx.lineTo(cx, o.y + o.h - 3); ctx.moveTo(cx - 8, o.y + o.h); ctx.lineTo(cx + 8, o.y + o.h); ctx.stroke();
        if (o.feu > 0) { const k = Math.min(1, o.feu / 2); FX.glow(ctx, cx, o.y, 40 * k, '#f08a30', 0.5 * k); FX.flamme(ctx, cx, o.y + 7, 26 * k, 14, time, 0, 0.95); FX.flamme(ctx, cx - 6, o.y + 7, 14 * k, 8, time + 1, 0, 0.8); FX.flamme(ctx, cx + 6, o.y + 7, 16 * k, 8, time + 2, 0, 0.8); }
        break;
      }
      case 'roue': {
        const r = o.w / 2, cy = o.y + r; ctx.save(); ctx.translate(cx, cy); ctx.rotate(o.ang); ctx.fillStyle = 'rgba(141,106,60,0.35)';
        ctx.beginPath(); ctx.arc(0, 0, r, 0, TAU); ctx.fill(); ctx.stroke(); ctx.beginPath(); ctx.arc(0, 0, r * 0.25, 0, TAU); ctx.stroke();
        for (let i = 0; i < 8; i++) { const a = i / 8 * TAU; ctx.beginPath(); ctx.moveTo(Math.cos(a) * r * 0.25, Math.sin(a) * r * 0.25); ctx.lineTo(Math.cos(a) * r, Math.sin(a) * r); ctx.stroke(); ctx.fillStyle = '#8d6a3c'; ctx.fillRect(Math.cos(a) * r - 4, Math.sin(a) * r - 4, 8, 8); }
        ctx.restore(); ctx.strokeStyle = INK; ctx.beginPath(); ctx.moveTo(cx, cy); ctx.lineTo(cx - 10, o.y + o.h + 4); ctx.moveTo(cx, cy); ctx.lineTo(cx + 10, o.y + o.h + 4); ctx.stroke();
        if (o.eau > 0.3 && Math.random() < 0.3) part(cx + (Math.random() - 0.5) * o.w, o.y + o.h, '#6aa0d8', 1, 40, 0.5, 2, 400, 'goutte');
        break;
      }
      case 'moulin': {
        ctx.fillStyle = 'rgba(168,151,122,0.5)'; ctx.beginPath(); ctx.moveTo(o.x + 8, o.y + o.h); ctx.lineTo(o.x + 14, o.y + 22); ctx.lineTo(o.x + o.w - 14, o.y + 22); ctx.lineTo(o.x + o.w - 8, o.y + o.h); ctx.closePath(); ctx.fill(); ctx.stroke();
        U.hatch(ctx, o.x + 12, o.y + 26, o.w - 24, o.h - 28, 5, Math.PI / 4, 5, 0.3);
        ctx.save(); ctx.translate(cx, o.y + 20); ctx.rotate(o.ang);
        for (let i = 0; i < 4; i++) { ctx.rotate(TAU / 4); ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(0, -34); ctx.stroke(); ctx.fillStyle = 'rgba(239,227,196,0.9)'; ctx.fillRect(1, -34, 9, 24); ctx.strokeRect(1, -34, 9, 24); }
        ctx.restore(); ctx.fillStyle = INK; ctx.beginPath(); ctx.arc(cx, o.y + 20, 3, 0, TAU); ctx.fill();
        if (o.spin > 0 && Math.random() < 0.2) part(cx + (Math.random() - 0.5) * 60, o.y + 20 + (Math.random() - 0.5) * 50, '#bfe8e8', 1, 60, 0.5, 2, 0, 'vent');
        break;
      }
      case 'lampe': {
        const on = o.charge > 0;
        ctx.beginPath(); ctx.moveTo(cx, o.y + o.h); ctx.lineTo(cx, o.y + 24); ctx.stroke(); ctx.fillStyle = '#737e86'; ctx.fillRect(cx - 8, o.y + o.h - 4, 16, 4);
        ctx.fillStyle = on ? '#fff6c0' : 'rgba(207,227,234,0.6)'; ctx.beginPath(); ctx.moveTo(cx, o.y); ctx.lineTo(cx + 9, o.y + 12); ctx.lineTo(cx, o.y + 24); ctx.lineTo(cx - 9, o.y + 12); ctx.closePath(); ctx.fill(); ctx.stroke();
        if (on) { FX.glow(ctx, cx, o.y + 12, 34, '#e0c43a', 0.6); if (Math.random() < 0.15) st.sp.push({ k: 'zap', pts: FX.eclairPts(cx, o.y + 12, cx + (Math.random() - 0.5) * 40, o.y + 12 + (Math.random() - 0.5) * 40, 0.4), life: 0.1, max: 0.1 }); }
        break;
      }
      case 'grille': {
        liensCircuit(ctx, o);
        const k = o.ouv;
        ctx.strokeStyle = '#4a4a55'; ctx.lineWidth = 3;
        if (o.horiz) { const off = k * o.w; ctx.save(); ctx.beginPath(); ctx.rect(o.x, o.y - 4, o.w, o.h + 8); ctx.clip(); for (let x = o.x + 4 + off; x < o.x + o.w + off; x += 9) { ctx.beginPath(); ctx.moveTo(x, o.y); ctx.lineTo(x, o.y + o.h); ctx.stroke(); } ctx.beginPath(); ctx.moveTo(o.x + off, o.y + 3); ctx.lineTo(o.x + o.w + off, o.y + 3); ctx.moveTo(o.x + off, o.y + o.h - 3); ctx.lineTo(o.x + o.w + off, o.y + o.h - 3); ctx.stroke(); ctx.restore(); }
        else { const off = k * o.h; for (let x = o.x + 3; x < o.x + o.w; x += 6) { ctx.beginPath(); ctx.moveTo(x, o.y - off); ctx.lineTo(x, o.y + o.h - off); ctx.stroke(); } ctx.beginPath(); ctx.moveTo(o.x, o.y + 10 - off); ctx.lineTo(o.x + o.w, o.y + 10 - off); ctx.moveTo(o.x, o.y + o.h - 10 - off); ctx.lineTo(o.x + o.w, o.y + o.h - 10 - off); ctx.stroke(); }
        break;
      }
      case 'coffre': {
        liensCircuit(ctx, o);
        const k = o.couv;
        ctx.fillStyle = '#9a6a34'; U.inkRect(ctx, o.x, o.y + 10, o.w, o.h - 10, o.seed, 0.6); ctx.fill(); ctx.stroke();
        ctx.strokeStyle = '#5a3a1a'; ctx.beginPath(); ctx.moveTo(o.x + 6, o.y + 10); ctx.lineTo(o.x + 6, o.y + o.h); ctx.moveTo(o.x + o.w - 6, o.y + 10); ctx.lineTo(o.x + o.w - 6, o.y + o.h); ctx.stroke(); ctx.strokeStyle = INK;
        ctx.save(); ctx.translate(o.x, o.y + 10); ctx.rotate(-k * 1.9); ctx.fillStyle = '#b07a3a'; ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(0, -8); ctx.quadraticCurveTo(o.w / 2, -16, o.w, -8); ctx.lineTo(o.w, 0); ctx.closePath(); ctx.fill(); ctx.stroke(); ctx.restore();
        if (!o.ouvert && o.canal) { const C = st.circuits && st.circuits[o.canal]; const n = C ? C.em.filter(emetActif).length : 0, tot = C ? C.em.length : 1; ctx.save(); ctx.translate(cx, o.y + 18); ctx.rotate(time * 0.6); ctx.strokeStyle = '#c08a2a'; ctx.lineWidth = 1.4; U.inkCircle(ctx, 0, 0, 9, 3, 0.6); for (let i = 0; i < tot; i++) { const a = i / tot * TAU; ctx.fillStyle = i < n ? '#e0b050' : 'rgba(31,26,22,0.35)'; ctx.beginPath(); ctx.arc(Math.cos(a) * 9, Math.sin(a) * 9, 2.4, 0, TAU); ctx.fill(); } ctx.restore(); }
        else if (k > 0.9) FX.glow(ctx, cx, o.y + 8, 22, '#e0b050', 0.25 + 0.1 * Math.sin(time * 3));
        break;
      }
      case 'porte': {
        ctx.fillStyle = 'rgba(120,90,50,0.35)';
        ctx.beginPath(); ctx.moveTo(o.x, o.y + o.h); ctx.lineTo(o.x, o.y + 30); ctx.arc(cx, o.y + 30, o.w / 2, Math.PI, 0); ctx.lineTo(o.x + o.w, o.y + o.h); ctx.closePath(); ctx.fill(); ctx.stroke();
        U.hatch(ctx, o.x + 4, o.y + 4, o.w - 8, o.h - 4, 6, Math.PI / 2, 5, 0.3);
        ctx.beginPath(); ctx.arc(o.x + o.w - 16, o.y + 65, 3, 0, TAU); ctx.fill();
        ctx.fillStyle = '#efe3c4'; ctx.fillRect(cx - 28, o.y - 26, 56, 20); U.inkRect(ctx, cx - 28, o.y - 26, 56, 20, 3, 0.6);
        U.txt(ctx, 'Labo', cx, o.y - 16, 15, 'center');
        break;
      }
      case 'mannequin': {
        const wob = Math.sin(time * 14) * o.wob * 6;
        ctx.save(); ctx.translate(cx, o.y + o.h); ctx.rotate(wob * 0.03);
        U.inkLine(ctx, 0, 0, 0, -o.h + 14, o.seed, 0.8);
        ctx.fillStyle = 'rgba(170,140,90,0.5)';
        ctx.beginPath(); ctx.ellipse(0, -o.h + 30, 13, 20, 0, 0, TAU); ctx.fill(); ctx.stroke();
        U.inkCircle(ctx, 0, -o.h + 2, 10, o.seed + 1, 0.6);
        U.inkLine(ctx, -18, -o.h + 24, 18, -o.h + 24, o.seed + 2, 0.6);
        ctx.strokeStyle = '#9a4a3a'; U.inkCircle(ctx, 0, -o.h + 30, 6, o.seed + 3, 0.4);
        ctx.restore();
        if (o.hits > 0) U.txt(ctx, o.hits + ' coups', cx, o.y - 12, 13, 'center', '#6b4f2a');
        if (o.burning > 0) { ctx.fillStyle = 'rgba(217,98,43,0.4)'; ctx.beginPath(); ctx.arc(cx, o.y + 10, 12, 0, TAU); ctx.fill(); }
        break;
      }
      case 'caisse': {
        ctx.fillStyle = o.burning > 0 ? 'rgba(217,98,43,0.35)' : 'rgba(170,130,70,0.4)';
        ctx.fillRect(o.x, o.y, o.w, o.h);
        U.hatch(ctx, o.x, o.y, o.w, o.h, 5, Math.PI / 2, o.seed, 0.3);
        U.inkRect(ctx, o.x, o.y, o.w, o.h, o.seed, 1);
        U.inkLine(ctx, o.x, o.y, o.x + o.w, o.y + o.h, o.seed + 1, 1); U.inkLine(ctx, o.x + o.w, o.y, o.x, o.y + o.h, o.seed + 2, 1);
        break;
      }
      case 'torche': {
        U.inkLine(ctx, cx, o.y + o.h, cx, o.y + 12, o.seed, 0.8);
        ctx.fillStyle = 'rgba(120,90,50,0.5)';
        ctx.beginPath(); ctx.moveTo(cx - 8, o.y + 14); ctx.lineTo(cx + 8, o.y + 14); ctx.lineTo(cx + 5, o.y + 26); ctx.lineTo(cx - 5, o.y + 26); ctx.closePath(); ctx.fill(); ctx.stroke();
        if (o.lit) {
          const f = Math.sin(o.flicker) * 3;
          const g = ctx.createRadialGradient(cx, o.y + 4, 2, cx, o.y + 4, 40); g.addColorStop(0, 'rgba(240,180,80,0.6)'); g.addColorStop(1, 'rgba(240,180,80,0)'); ctx.fillStyle = g; ctx.fillRect(cx - 40, o.y - 40, 80, 80);
          ctx.fillStyle = '#d9622b'; ctx.strokeStyle = '#8a3a1b';
          ctx.beginPath(); ctx.moveTo(cx - 6, o.y + 14); ctx.quadraticCurveTo(cx - 8 + f, o.y - 4, cx, o.y - 14 + f); ctx.quadraticCurveTo(cx + 8 - f, o.y - 4, cx + 6, o.y + 14); ctx.closePath(); ctx.fill(); ctx.stroke();
          ctx.fillStyle = '#f0c060'; ctx.beginPath(); ctx.arc(cx, o.y + 6, 3, 0, TAU); ctx.fill();
          if (Math.random() < 0.15) part(cx, o.y, '#d9622b', 1, 20, 0.6, 2, -120);
        } else { ctx.fillStyle = '#444'; ctx.beginPath(); ctx.arc(cx, o.y + 10, 4, 0, TAU); ctx.fill(); }
        break;
      }
      case 'graine': {
        if (o.stage === 0) { ctx.fillStyle = '#8a6b2f'; ctx.beginPath(); ctx.ellipse(cx, o.y + 6, 7, 5, 0.3, 0, TAU); ctx.fill(); ctx.stroke(); U.inkLine(ctx, cx, o.y + 2, cx + 3, o.y - 6, o.seed, 0.4); }
        else if (o.racine && o.hauteur >= o.hMax) { ctx.fillStyle = '#c45a8a'; ctx.beginPath(); ctx.arc((o.cx + 0.5) * CS + 4, (o.cy - o.hauteur) * CS, 5, 0, TAU); ctx.fill(); ctx.stroke(); }
        break;
      }
      case 'pancarte': {
        U.inkLine(ctx, cx, o.y + o.h, cx, o.y + 24, o.seed, 0.8);
        ctx.fillStyle = 'rgba(200,170,110,0.6)'; ctx.fillRect(o.x - 10, o.y, o.w + 20, 26); U.inkRect(ctx, o.x - 10, o.y, o.w + 20, 26, o.seed, 0.8);
        U.inkLine(ctx, o.x - 2, o.y + 9, o.x + o.w + 2, o.y + 9, o.seed + 1, 0.5); U.inkLine(ctx, o.x - 2, o.y + 16, o.x + o.w - 6, o.y + 16, o.seed + 2, 0.5);
        break;
      }
      case 'rocher': {
        ctx.fillStyle = 'rgba(140,115,80,0.5)';
        U.inkPolyPath(ctx, [[o.x + 4, o.y + o.h], [o.x, o.y + 24], [o.x + 14, o.y + 4], [o.x + 40, o.y], [o.x + o.w, o.y + 20], [o.x + o.w - 4, o.y + o.h]], o.seed, 1.5);
        ctx.fill(); ctx.stroke();
        ctx.lineWidth = 1.2; U.inkPoly(ctx, [[o.x + 20, o.y + 10], [o.x + 28, o.y + 26], [o.x + 22, o.y + 40], [o.x + 30, o.y + 54]], o.seed + 1, 1, false);
        if (o.fissure > 0) { ctx.strokeStyle = '#d9622b'; U.inkPoly(ctx, [[o.x + 20, o.y + 10], [o.x + 28, o.y + 26], [o.x + 22, o.y + 40]], o.seed + 1, 1, false); }
        break;
      }
      case 'champignon': {
        ctx.fillStyle = '#efe3c4'; ctx.fillRect(cx - 4, o.y + 12, 8, 14); U.inkRect(ctx, cx - 4, o.y + 12, 8, 14, o.seed, 0.5);
        ctx.fillStyle = '#5a4a7d'; ctx.beginPath(); ctx.ellipse(cx, o.y + 12, 13, 9, 0, Math.PI, 0); ctx.closePath(); ctx.fill(); ctx.stroke();
        ctx.fillStyle = '#efe3c4'; ctx.beginPath(); ctx.arc(cx - 4, o.y + 7, 2, 0, TAU); ctx.arc(cx + 5, o.y + 9, 1.6, 0, TAU); ctx.fill();
        if (Math.random() < 0.05) part(cx, o.y, '#5a4a7d', 1, 15, 0.8, 2, -20);
        break;
      }
      case 'ruche': {
        U.inkLine(ctx, cx, o.y - 10, cx, o.y, o.seed, 0.4);
        ctx.fillStyle = '#d8a03a';
        for (let k = 0; k < 4; k++) { const ww = o.w * (0.6 + 0.4 * Math.sin((k + 0.5) / 4 * Math.PI)); ctx.beginPath(); ctx.ellipse(cx, o.y + 4 + k * 7, ww / 2, 4.5, 0, 0, TAU); ctx.fill(); ctx.stroke(); }
        ctx.fillStyle = INK; ctx.beginPath(); ctx.arc(cx, o.y + 22, 2.5, 0, TAU); ctx.fill();
        if (o.enfume > 0) U.txt(ctx, 'z', cx + 14, o.y, 12, 'left', '#5a4a7d', 'IM Fell English', 'italic');
        break;
      }
      case 'page': {
        if (o.lue) break;
        const fl = Math.sin(time * 3 + o.seed) * 3;
        ctx.save(); ctx.translate(cx, o.y + 12 + fl); ctx.rotate(Math.sin(time * 2 + o.seed) * 0.15);
        ctx.fillStyle = '#f6eed8'; ctx.fillRect(-9, -12, 18, 24); U.inkRect(ctx, -9, -12, 18, 24, o.seed, 0.8);
        ctx.lineWidth = 1; ctx.globalAlpha = 0.6; for (let i = 0; i < 4; i++) U.inkLine(ctx, -6, -7 + i * 5, 5 - (i % 2) * 3, -7 + i * 5, o.seed + i, 0.3);
        ctx.restore();
        const g = ctx.createRadialGradient(cx, o.y + 12, 2, cx, o.y + 12, 30); g.addColorStop(0, 'rgba(216,166,58,0.25)'); g.addColorStop(1, 'rgba(216,166,58,0)'); ctx.fillStyle = g; ctx.fillRect(cx - 30, o.y - 18, 60, 60);
        break;
      }
      case 'rune': {
        ctx.globalAlpha = 0.25 + o.revele * 0.75;
        ctx.strokeStyle = o.revele > 0.95 ? '#d8a63a' : 'rgba(80,60,40,0.5)'; ctx.lineWidth = 2;
        const r = 18;
        U.inkCircle(ctx, cx, o.y + 30, r, o.seed, 0.8);
        Seal.glyph(ctx, o.lu ? 'lumiere' : 'retarde', cx, o.y + 30, r * 0.6, ctx.strokeStyle, o.seed);
        for (let i = 0; i < 3; i++) { const a = -Math.PI / 2 + (i / 3) * TAU; U.inkLine(ctx, cx + Math.cos(a) * r, o.y + 30 + Math.sin(a) * r, cx + Math.cos(a) * (r + 8), o.y + 30 + Math.sin(a) * (r + 8), i, 0.5); }
        if (o.revele >= 1) { const g = ctx.createRadialGradient(cx, o.y + 30, 5, cx, o.y + 30, 50); g.addColorStop(0, 'rgba(216,166,58,0.35)'); g.addColorStop(1, 'rgba(216,166,58,0)'); ctx.fillStyle = g; ctx.fillRect(cx - 50, o.y - 20, 100, 100); }
        break;
      }
    }
    ctx.restore();
  }

  function drawCreature(ctx, c) {
    ctx.save();
    ctx.strokeStyle = c.hurt > 0 ? '#9a2a2a' : INK; ctx.lineWidth = 2; ctx.lineCap = 'round';
    const cx = c.x + c.w / 2, by = c.y + c.h;
    switch (c.t) {
      case 'familier': Familiers.dessiner(ctx, c, time); break;
      case 'grenouille': case 'corbeau': case 'salamandre': case 'poisson': case 'chauve': case 'escargot': case 'tortue': case 'lapin': drawEspece(ctx, c, cx, by); break;
      case 'limace': {
        const sq = c.onGround ? 1 : 0.85;
        ctx.fillStyle = c.sta.tame ? 'rgba(196,90,138,0.55)' : 'rgba(31,26,22,0.75)';
        ctx.beginPath(); ctx.ellipse(cx, by - c.h * 0.45 * sq, c.w / 2, c.h * 0.45 * sq, 0, 0, TAU); ctx.fill(); ctx.stroke();
        ctx.fillStyle = '#efe3c4';
        const ex = cx + c.dir * c.w * 0.2;
        ctx.beginPath(); ctx.arc(ex, by - c.h * 0.6, 4 * c.size, 0, TAU); ctx.arc(ex + c.dir * 9 * c.size, by - c.h * 0.6, 4 * c.size, 0, TAU); ctx.fill();
        ctx.fillStyle = INK;
        if (c.sta.sleep > 0) { U.inkLine(ctx, ex - 3, by - c.h * 0.6, ex + 3, by - c.h * 0.6, 1, 0.3); U.inkLine(ctx, ex + c.dir * 9 * c.size - 3, by - c.h * 0.6, ex + c.dir * 9 * c.size + 3, by - c.h * 0.6, 1, 0.3); }
        else { ctx.beginPath(); ctx.arc(ex + c.dir, by - c.h * 0.6, 1.8 * c.size, 0, TAU); ctx.arc(ex + c.dir * 10 * c.size, by - c.h * 0.6, 1.8 * c.size, 0, TAU); ctx.fill(); }
        if (Math.random() < 0.08) part(cx - c.dir * c.w * 0.4, by - 2, '#1f1a16', 1, 5, 0.8, 2, 200);
        break;
      }
      case 'follet': {
        const r = 10 * c.size;
        const g = ctx.createRadialGradient(cx, c.y + c.h / 2, 2, cx, c.y + c.h / 2, r * 3); g.addColorStop(0, 'rgba(120,220,210,0.5)'); g.addColorStop(1, 'rgba(120,220,210,0)'); ctx.fillStyle = g; ctx.fillRect(cx - r * 3, c.y + c.h / 2 - r * 3, r * 6, r * 6);
        ctx.fillStyle = c.sta.tame ? '#c45a8a' : '#3f9c9b'; ctx.strokeStyle = '#1f1a16'; ctx.lineWidth = 1.5;
        ctx.beginPath(); ctx.moveTo(cx - r, c.y + c.h / 2 + r * 0.6); ctx.quadraticCurveTo(cx - r * 1.2, c.y - r * 0.4, cx, c.y - r + Math.sin(time * 8) * 3); ctx.quadraticCurveTo(cx + r * 1.2, c.y - r * 0.4, cx + r, c.y + c.h / 2 + r * 0.6); ctx.quadraticCurveTo(cx, c.y + c.h + 2, cx - r, c.y + c.h / 2 + r * 0.6); ctx.fill(); ctx.stroke();
        ctx.fillStyle = '#1f1a16'; ctx.beginPath(); ctx.arc(cx - 3, c.y + c.h / 2, 1.8, 0, TAU); ctx.arc(cx + 3, c.y + c.h / 2, 1.8, 0, TAU); ctx.fill();
        break;
      }
      case 'golem': {
        const walk = Math.sin(time * 6) * (Math.abs(c.vx) > 10 ? 1 : 0);
        ctx.fillStyle = 'rgba(138,107,47,0.5)';
        ctx.fillRect(cx - 20 + walk * 3, by - 22, 14, 22); ctx.fillRect(cx + 6 - walk * 3, by - 22, 14, 22);
        U.inkRect(ctx, cx - 20 + walk * 3, by - 22, 14, 22, c.seed, 1); U.inkRect(ctx, cx + 6 - walk * 3, by - 22, 14, 22, c.seed + 1, 1);
        ctx.fillStyle = c.sta.tame ? 'rgba(196,90,138,0.4)' : 'rgba(138,107,47,0.55)';
        U.inkPolyPath(ctx, [[c.x + 4, by - 22], [c.x, by - 54], [c.x + 12, by - 66], [c.x + c.w - 10, by - 68], [c.x + c.w, by - 50], [c.x + c.w - 4, by - 22]], c.seed + 2, 1.5);
        ctx.fill(); ctx.stroke();
        U.hatch(ctx, c.x, by - 68, c.w, 46, 6, Math.PI / 4, c.seed, 0.25);
        U.inkLine(ctx, c.x + 2, by - 50, c.x - 10 + walk * 4, by - 26, c.seed + 3, 1); U.inkLine(ctx, c.x + c.w - 2, by - 50, c.x + c.w + 10 - walk * 4, by - 26, c.seed + 4, 1);
        ctx.fillStyle = c.sta.sleep > 0 ? '#555' : c.sta.stun > 0 ? '#d8a63a' : '#d9622b';
        ctx.beginPath(); ctx.arc(cx - 8 + c.dir * 3, by - 56, 3, 0, TAU); ctx.arc(cx + 8 + c.dir * 3, by - 56, 3, 0, TAU); ctx.fill();
        break;
      }
    }
    if (c.sta.sleep > 0 || c.dort) U.txt(ctx, 'z z', cx + 14, c.y - 10 + Math.sin(time * 3) * 3, 14, 'left', '#5a4a7d', 'IM Fell English', 'italic');
    if (c.sta.gele > 0) { ctx.save(); ctx.globalAlpha = 0.45 * Math.min(1, c.sta.gele); ctx.fillStyle = '#cfe8f6'; ctx.fillRect(c.x - 4, c.y - 6, c.w + 8, c.h + 8); ctx.globalAlpha = Math.min(1, c.sta.gele); ctx.strokeStyle = '#7fb4d8'; ctx.lineWidth = 1.4; ctx.strokeRect(c.x - 4, c.y - 6, c.w + 8, c.h + 8); ctx.beginPath(); ctx.moveTo(c.x + 2, c.y); ctx.lineTo(c.x + c.w * 0.4, c.y + c.h * 0.3); ctx.stroke(); ctx.restore(); }
    if (c.sta.stun > 0) { ctx.strokeStyle = '#d8a63a'; ctx.lineWidth = 1.5; for (let i = 0; i < 3; i++) { const a = time * 5 + (i / 3) * TAU; ctx.beginPath(); ctx.arc(cx + Math.cos(a) * 14, c.y - 8 + Math.sin(a) * 4, 2, 0, TAU); ctx.stroke(); } }
    if (!c.sta.tame && c.aff > 0 && (c.affT > 0 || dist(st.p.x, st.p.y, c.x, c.y) < 150)) { ctx.save(); const w = Math.max(24, c.w), bx = cx - w / 2, by2 = c.y - 16; ctx.fillStyle = 'rgba(239,227,196,0.85)'; ctx.fillRect(bx, by2, w, 5); ctx.fillStyle = '#c45a8a'; ctx.fillRect(bx, by2, w * c.aff / 100, 5); ctx.strokeStyle = INK; ctx.lineWidth = 1; ctx.strokeRect(bx, by2, w, 5); ctx.fillStyle = '#c45a8a'; ctx.font = '11px serif'; ctx.textAlign = 'right'; ctx.fillText('♥', bx - 2, by2 + 5); ctx.restore(); }
    if (c.sta.tame && c.t !== 'familier' && !c.controlled) { ctx.fillStyle = '#c45a8a'; ctx.font = '14px serif'; ctx.textAlign = 'center'; ctx.fillText('♥', cx, c.y - 8 + Math.sin(time * 3) * 2); }
    if (c.sta.lent > 0) { ctx.strokeStyle = '#8a8f9a'; ctx.lineWidth = 1; ctx.setLineDash([2, 3]); U.inkCircle(ctx, cx, c.y + c.h / 2, Math.max(c.w, c.h) * 0.7, 1, 1); ctx.setLineDash([]); }
    if (c.sta.wet > 0 && Math.random() < 0.05) part(cx, by - 4, '#6aa0d8', 1, 10, 0.6, 2, 300);
    if (c.hp < c.hpMax) { ctx.fillStyle = 'rgba(31,26,22,0.3)'; ctx.fillRect(c.x, c.y - 6, c.w, 3); ctx.fillStyle = '#9a4a3a'; ctx.fillRect(c.x, c.y - 6, c.w * c.hp / c.hpMax, 3); }
    ctx.restore();
  }

  function drawEspece(ctx, c, cx, by) {
    const sp = DATA.ESPECES[c.t]; const col = sp.couleur; const d = c.dir || 1; const w = c.w, h = c.h;
    ctx.save(); ctx.translate(cx, by); ctx.scale(d, 1); ctx.fillStyle = col; ctx.strokeStyle = c.hurt > 0 ? '#9a2a2a' : INK; ctx.lineWidth = 1.8; ctx.lineCap = 'round';
    const eye = (x, y) => { ctx.fillStyle = '#efe3c4'; ctx.beginPath(); ctx.arc(x, y, 2.6, 0, TAU); ctx.fill(); ctx.fillStyle = INK; ctx.beginPath(); ctx.arc(x + 0.8, y, 1.2, 0, TAU); ctx.fill(); ctx.fillStyle = col; };
    const bob = Math.sin(c.phase * 6) * (Math.abs(c.vx) > 10 ? 2 : 0);
    switch (c.t) {
      case 'grenouille': ctx.beginPath(); ctx.ellipse(0, -h * 0.5, w * 0.5, h * 0.45, 0, 0, TAU); ctx.fill(); ctx.stroke(); U.inkLine(ctx, -w * 0.4, -2, -w * 0.55, 0, 1, 0.3); U.inkLine(ctx, w * 0.3, -2, w * 0.5, 0, 2, 0.3); eye(w * 0.25, -h * 0.85); eye(w * 0.05, -h * 0.9); break;
      case 'corbeau': { const fl = Math.sin(c.phase * 14) * 8; ctx.beginPath(); ctx.ellipse(0, -h * 0.5, w * 0.45, h * 0.4, 0, 0, TAU); ctx.fill(); ctx.stroke(); ctx.beginPath(); ctx.moveTo(-w * 0.2, -h * 0.6); ctx.quadraticCurveTo(-w * 0.6, -h * 0.9 - fl, -w * 0.9, -h * 0.5 - fl); ctx.lineTo(-w * 0.1, -h * 0.4); ctx.closePath(); ctx.fill(); ctx.stroke(); ctx.fillStyle = '#d8a63a'; ctx.beginPath(); ctx.moveTo(w * 0.4, -h * 0.55); ctx.lineTo(w * 0.7, -h * 0.45); ctx.lineTo(w * 0.4, -h * 0.35); ctx.closePath(); ctx.fill(); ctx.stroke(); eye(w * 0.25, -h * 0.65); break; }
      case 'salamandre': ctx.beginPath(); ctx.ellipse(0, -h * 0.5, w * 0.42, h * 0.4, 0, 0, TAU); ctx.fill(); ctx.stroke(); ctx.beginPath(); ctx.moveTo(-w * 0.4, -h * 0.5); ctx.quadraticCurveTo(-w * 0.7, -h * 0.3 + bob, -w * 0.85, -h * 0.9); ctx.stroke(); ctx.beginPath(); ctx.arc(w * 0.45, -h * 0.55, h * 0.3, 0, TAU); ctx.fill(); ctx.stroke(); for (const lx of [-w * 0.25, w * 0.2]) { U.inkLine(ctx, lx, -h * 0.2, lx - 3 + bob, 0, 1, 0.3); } ctx.fillStyle = '#f0c060'; for (let i = 0; i < 3; i++) { ctx.beginPath(); ctx.arc(-w * 0.2 + i * w * 0.2, -h * 0.55, 1.5, 0, TAU); ctx.fill(); } ctx.fillStyle = col; eye(w * 0.5, -h * 0.65); break;
      case 'poisson': ctx.beginPath(); ctx.ellipse(0, -h * 0.5, w * 0.42, h * 0.45, 0, 0, TAU); ctx.fill(); ctx.stroke(); ctx.beginPath(); ctx.moveTo(-w * 0.35, -h * 0.5); ctx.lineTo(-w * 0.6, -h * 0.9 + Math.sin(c.phase * 8) * 2); ctx.lineTo(-w * 0.6, -h * 0.1); ctx.closePath(); ctx.fill(); ctx.stroke(); ctx.strokeStyle = 'rgba(31,26,22,0.4)'; ctx.lineWidth = 1; for (let i = 0; i < 3; i++) { ctx.beginPath(); ctx.arc(-w * 0.1 + i * 4, -h * 0.5, 3, -1, 1); ctx.stroke(); } ctx.strokeStyle = INK; eye(w * 0.22, -h * 0.6); break;
      case 'chauve': { const fl = c.dort ? 0 : Math.sin(c.phase * 18) * 7; if (c.dort) { ctx.beginPath(); ctx.ellipse(0, -h * 0.4, w * 0.25, h * 0.55, 0, 0, TAU); ctx.fill(); ctx.stroke(); U.inkLine(ctx, 0, -h, 0, -h - 6, 1, 0.3); } else { ctx.beginPath(); ctx.ellipse(0, -h * 0.5, w * 0.2, h * 0.4, 0, 0, TAU); ctx.fill(); ctx.stroke(); for (const sg of [-1, 1]) { ctx.beginPath(); ctx.moveTo(sg * w * 0.15, -h * 0.5); ctx.quadraticCurveTo(sg * w * 0.5, -h * 0.9 - fl, sg * w * 0.95, -h * 0.5 - fl); ctx.quadraticCurveTo(sg * w * 0.6, -h * 0.4 - fl * 0.5, sg * w * 0.15, -h * 0.3); ctx.closePath(); ctx.fill(); ctx.stroke(); } eye(w * 0.05, -h * 0.6); } break; }
      case 'escargot': ctx.beginPath(); ctx.ellipse(w * 0.1, -h * 0.2, w * 0.45, h * 0.2, 0, 0, TAU); ctx.fill(); ctx.stroke(); ctx.fillStyle = U.hexA(col, 0.9); ctx.beginPath(); ctx.arc(-w * 0.1, -h * 0.55, h * 0.42, 0, TAU); ctx.fill(); ctx.stroke(); ctx.beginPath(); for (let i = 0; i <= 30; i++) { const t = i / 30, a = t * TAU * 1.8, rr = h * 0.4 * (1 - t); const px = -w * 0.1 + Math.cos(a) * rr, py = -h * 0.55 + Math.sin(a) * rr; if (i) ctx.lineTo(px, py); else ctx.moveTo(px, py); } ctx.stroke(); ctx.strokeStyle = '#efe3c4'; ctx.lineWidth = 1; U.inkLine(ctx, -w * 0.3, -h * 0.5, -w * 0.05, -h * 0.75, 1, 0.3); ctx.strokeStyle = INK; U.inkLine(ctx, w * 0.45, -h * 0.35, w * 0.55, -h * 0.75, 2, 0.3); U.inkLine(ctx, w * 0.35, -h * 0.35, w * 0.38, -h * 0.7, 3, 0.3); break;
      case 'tortue': ctx.beginPath(); ctx.arc(0, -h * 0.25, w * 0.42, Math.PI, 0); ctx.closePath(); ctx.fill(); ctx.stroke(); U.hatch(ctx, -w * 0.42, -h, w * 0.84, h * 0.75, 4, Math.PI / 3, c.seed, 0.3); ctx.fillStyle = '#8a9a5a'; ctx.beginPath(); ctx.arc(w * 0.5, -h * 0.3, h * 0.25, 0, TAU); ctx.fill(); ctx.stroke(); for (const lx of [-w * 0.3, w * 0.25]) U.inkLine(ctx, lx, -h * 0.2, lx + bob, 0, 1, 0.3); ctx.fillStyle = col; eye(w * 0.55, -h * 0.38); break;
      case 'lapin': ctx.beginPath(); ctx.ellipse(0, -h * 0.4, w * 0.45, h * 0.38, 0, 0, TAU); ctx.fill(); ctx.stroke(); ctx.beginPath(); ctx.arc(w * 0.3, -h * 0.7, h * 0.25, 0, TAU); ctx.fill(); ctx.stroke(); for (const ex of [w * 0.2, w * 0.38]) { ctx.beginPath(); ctx.ellipse(ex, -h * 1.05, 2.5, h * 0.3, 0, 0, TAU); ctx.fill(); ctx.stroke(); } ctx.fillStyle = '#efe3c4'; ctx.beginPath(); ctx.arc(-w * 0.45, -h * 0.45, 3, 0, TAU); ctx.fill(); ctx.stroke(); ctx.fillStyle = col; eye(w * 0.38, -h * 0.75); break;
    }
    ctx.restore();
    if (c.dort) U.txt(ctx, 'z', cx + c.w * 0.5, c.y - 4 + Math.sin(time * 2) * 2, 12, 'left', '#5a4a7d', 'IM Fell English', 'italic');
  }
  function drawApprenti(ctx, x, y, h, look, face = 1, anim = 0, sta = null, moving = false, pose = {}) { Perso.draw(ctx, x, y, h, look, face, anim, sta, moving, pose); }
  function poseJoueur(p) {
    const g = p.gestes && (p.gestes.R || p.gestes.L);
    const ch = game.charging && (game.charging.R || game.charging.L);
    let cast = null, glow = null;
    if (g) { cast = Math.atan2(g.aim.y - (p.y + p.h * 0.4), g.aim.x - (p.x + p.w / 2)); glow = g.color; }
    else if (ch) { const aim = toWorld(game.inp.mouse.x, game.inp.mouse.y); cast = Math.atan2(aim.y - (p.y + p.h * 0.4), aim.x - (p.x + p.w / 2)); glow = ch.color; }
    else if (p.lastCast && time - p.lastCast.t < 0.35) { cast = p.lastCast.a; glow = p.lastCast.c; }
    if (g || ch) { const d = Math.cos(cast); if (Math.abs(d) > 0.2) p.face = d > 0 ? 1 : -1; }
    const sel = game.hotbar[game.selected];
    return { t: time, vx: p.vx, vy: p.vy, air: !p.onGround && !p.climbing && p.liq === 0, cast, glow: glow || (sel && sel.type === 'seal' && sel.seal.core ? colorOf(sel.seal.core) : '#d8a63a') };
  }
  function drawForme(ctx, p) {
    const t = p.forme === 'chauve' ? 'chauve' : p.forme;
    const fake = { t, x: p.x, y: p.y, w: p.w, h: p.h, dir: p.face, face: p.face, vx: p.vx, vy: p.vy, onGround: p.onGround, sta: {}, hurt: 0, hp: 1, hpMax: 1, phase: time * 3, size: 1, seed: 7, hop: 0, anim: p.anim };
    ctx.save(); drawCreature(ctx, fake); ctx.restore();
    if (p.sta.forme < 3 && Math.floor(time * 6) % 2 === 0) FX.glow(ctx, p.x + p.w / 2, p.y + p.h / 2, p.h, '#c06aa0', 0.35);
  }
  function drawPlayer(ctx, p) {
    for (const h of ['R', 'L']) { const g = p.gestes && p.gestes[h]; const c = game.charging && game.charging[h]; if (g) FX.cercle(ctx, p.x + p.w / 2, p.y + p.h, 22 + (1 - g.t / Math.max(0.01, g.max)) * 8, time, g.color, 1); else if (c) { const k = Math.min(1, (performance.now() - c.t0) / 1500); if (k > 0.08) FX.cercle(ctx, p.x + p.w / 2, p.y + p.h, 18 + k * 20, time * (1 + k * 2), c.color || '#d8a63a', 0.5 + k * 0.5); } }
    const moving = (Math.abs(p.vx) > 20 && (p.onGround || p.climbing)) || p.sta.vol > 0;
    if (p.inv > 0 && Math.floor(time * 20) % 2 === 0) return;
    if (p.sta.wet > 0 && Math.random() < 0.06) part(p.x + p.w / 2, p.y + p.h, '#6aa0d8', 1, 10, 0.6, 2, 300);
    if (p.sta.lumiere > 0) { const g = ctx.createRadialGradient(p.x + p.w / 2, p.y + p.h / 2, 5, p.x + p.w / 2, p.y + p.h / 2, 80); g.addColorStop(0, 'rgba(216,166,58,0.35)'); g.addColorStop(1, 'rgba(216,166,58,0)'); ctx.fillStyle = g; ctx.fillRect(p.x - 80, p.y - 60, 200, 200); }
    if (p.sta.vol > 0) { ctx.save(); ctx.strokeStyle = '#6c5ab8'; ctx.lineWidth = 1.5; ctx.globalAlpha = 0.6; U.inkCircle(ctx, p.x + p.w / 2, p.y + p.h / 2, p.h * 0.7, 3 + Math.floor(time * 4), 2); ctx.restore(); }
    if (p.forme) { drawForme(ctx, p); return; }
    const G = p.G;
    if (G && G.mag > 0 && !(G.gx === 0 && G.gy === 1) && p.sta.vol <= 0) {
      const th = Math.atan2(G.gy, G.gx) - Math.PI / 2; const hs = Math.max(p.w, p.h);
      ctx.save(); ctx.translate(p.x + p.w / 2, p.y + p.h / 2); ctx.rotate(th);
      drawApprenti(ctx, 0, hs / 2, hs, game.look, p.face, p.anim, p.sta, moving || (Math.abs(p.vx) + Math.abs(p.vy) > 30 && p.onGround), poseJoueur(p));
      ctx.restore();
      ctx.save(); ctx.strokeStyle = '#6c5ab8'; ctx.globalAlpha = 0.5; ctx.lineWidth = 1.5; const cx = p.x + p.w / 2, cy = p.y + p.h / 2; ctx.beginPath(); ctx.moveTo(cx, cy); ctx.lineTo(cx + G.gx * 34, cy + G.gy * 34); ctx.stroke(); ctx.restore();
    } else {
      if (p.pg && p.pg.enclume) { ctx.save(); ctx.globalAlpha = 0.5; ctx.fillStyle = '#4a4a55'; ctx.beginPath(); ctx.ellipse(p.x + p.w / 2, p.y + p.h, p.w * 0.9, 4, 0, 0, TAU); ctx.fill(); ctx.restore(); }
      drawApprenti(ctx, p.x + p.w / 2, p.y + p.h, p.h, game.look, p.face, p.anim, p.sta, moving, poseJoueur(p));
    }
    for (const g of p.gestes ? [p.gestes.R, p.gestes.L] : []) {
      if (!g) continue;
      const k = 1 - g.t / Math.max(0.001, g.max); const aim = g.aim;
      const cx = p.x + p.w / 2, cy = p.y + p.h * 0.45; let dx = aim.x - cx, dy = aim.y - cy; const d = Math.hypot(dx, dy) || 1;
      const gx = cx + dx / d * 30, gy = cy + dy / d * 30;
      ctx.save(); ctx.globalAlpha = 0.4 + k * 0.6; ctx.translate(gx, gy); ctx.rotate(k * 3);
      Seal.drawMini(ctx, g.seal, 0, 0, (6 + k * 12) * (1 + (g.charge || 0) * 0.6), time);
      ctx.strokeStyle = g.color; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(0, 0, 8 + k * 14, -Math.PI / 2, -Math.PI / 2 + TAU * k); ctx.stroke();
      ctx.restore();
    }
    if (game.charging) for (const h of ['R', 'L']) { const c = game.charging[h]; if (!c) continue; const k = Math.min(1, (performance.now() - c.t0) / 1500); if (k < 0.1) continue; ctx.save(); ctx.strokeStyle = c.color || '#8a7a5a'; ctx.lineWidth = 2 + k * 3; ctx.globalAlpha = 0.5 + k * 0.5; const R0 = 26 + k * 22 + (h === 'L' ? 8 : 0); ctx.beginPath(); ctx.arc(p.x + p.w / 2, p.y + p.h / 2, R0, -Math.PI / 2, -Math.PI / 2 + TAU * k); ctx.stroke(); if (k >= 1) { ctx.globalAlpha = 0.3 + Math.sin(time * 20) * 0.2; U.inkCircle(ctx, p.x + p.w / 2, p.y + p.h / 2, R0 + 4, 3, 1.5); } ctx.restore(); }
    if (p.trap) { ctx.save(); ctx.strokeStyle = p.trap.spec.color; ctx.lineWidth = 1.5; ctx.setLineDash([4, 4]); ctx.beginPath(); ctx.arc(p.x + p.w / 2, p.y + p.h / 2, 30, time * 2, time * 2 + TAU); ctx.stroke(); ctx.restore(); }
    if (p.selfTimer) { ctx.save(); ctx.strokeStyle = p.selfTimer.spec.color; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(p.x + p.w / 2, p.y + p.h / 2, 34, -Math.PI / 2, -Math.PI / 2 + TAU * (1 - p.selfTimer.t / 2)); ctx.stroke(); ctx.restore(); }
    if (p.air !== undefined && p.air < 8 && p.liq === M.EAU) { ctx.save(); ctx.fillStyle = 'rgba(31,26,22,0.4)'; ctx.fillRect(p.x - 6, p.y - 14, p.w + 12, 4); ctx.fillStyle = '#3b6fb6'; ctx.fillRect(p.x - 6, p.y - 14, (p.w + 12) * clamp(p.air / 8, 0, 1), 4); ctx.restore(); }
  }
  function drawSpell(ctx, s) {
    ctx.save();
    switch (s.k) {
      case 'proj': {
        if (s.potion || s.liquide) {
          ctx.fillStyle = s.color; ctx.strokeStyle = INK; ctx.lineWidth = 1.5; ctx.translate(s.x, s.y); ctx.rotate(time * 8);
          ctx.beginPath(); ctx.moveTo(-4, -8); ctx.lineTo(-4, -3); ctx.quadraticCurveTo(-9, 3, -7, 7); ctx.lineTo(7, 7); ctx.quadraticCurveTo(9, 3, 4, -3); ctx.lineTo(4, -8); ctx.closePath(); ctx.fill(); ctx.stroke();
          ctx.fillStyle = '#6b4f2a'; ctx.fillRect(-4.5, -11, 9, 3.5); break;
        }
        if (s.matiere != null) { const a = Math.atan2(s.vy, s.vx), col = P[s.matiere].color, L2 = s.r * 2.6, W2 = s.r * 0.75; FX.ruban(ctx, s.tr, col, s.r * 0.9, 0.4); ctx.save(); ctx.translate(s.x, s.y); ctx.rotate(a); ctx.fillStyle = col; ctx.strokeStyle = INK; ctx.lineWidth = 1.4; ctx.beginPath(); ctx.moveTo(L2, 0); ctx.lineTo(0, -W2); ctx.lineTo(-L2 * 0.8, 0); ctx.lineTo(0, W2); ctx.closePath(); ctx.fill(); ctx.stroke(); ctx.globalAlpha = 0.7; ctx.strokeStyle = '#ffffff'; ctx.beginPath(); ctx.moveTo(L2 * 0.7, -1); ctx.lineTo(-L2 * 0.3, -W2 * 0.4); ctx.stroke(); ctx.restore(); break; }
        FX.ruban(ctx, s.tr, s.color, s.r * 1.4, 0.55);
        FX.glow(ctx, s.x, s.y, s.r * 3.2, s.color, 0.55);
        if (s.traj === 'boomerang') { ctx.save(); ctx.translate(s.x, s.y); ctx.rotate(time * 16); ctx.strokeStyle = s.color; ctx.lineWidth = 2.5; ctx.beginPath(); ctx.arc(0, 0, s.r * 1.9, 0.3, 2.6); ctx.stroke(); ctx.strokeStyle = INK; ctx.lineWidth = 1; ctx.beginPath(); ctx.arc(0, 0, s.r * 2.2, 3.4, 5.6); ctx.stroke(); ctx.restore(); }
        const ang = Math.atan2(s.vy, s.vx);
        if (s.core === 'feu') { ctx.translate(s.x, s.y); ctx.rotate(ang + Math.PI / 2); FX.flamme(ctx, 0, s.r * 0.6, s.r * 3, s.r * 1.6, time, s.chaud || 0); }
        else if (s.core === 'foudre') { const pts = FX.eclairPts(s.x - Math.cos(ang) * s.r * 2.5, s.y - Math.sin(ang) * s.r * 2.5, s.x + Math.cos(ang) * s.r, s.y + Math.sin(ang) * s.r, 0.45); FX.eclair(ctx, pts, '#e0c43a', 1.6); FX.glow(ctx, s.x, s.y, s.r * 1.6, '#fff6c0', 0.9); }
        else if (s.core === 'eau' || s.core === 'acide') { ctx.translate(s.x, s.y); ctx.rotate(ang); ctx.fillStyle = s.color; ctx.strokeStyle = INK; ctx.lineWidth = 1.3; ctx.beginPath(); ctx.moveTo(s.r * 1.3, 0); ctx.quadraticCurveTo(0, -s.r, -s.r * 1.1, 0); ctx.quadraticCurveTo(0, s.r, s.r * 1.3, 0); ctx.fill(); ctx.stroke(); ctx.fillStyle = 'rgba(255,255,255,0.6)'; ctx.beginPath(); ctx.arc(s.r * 0.3, -s.r * 0.3, s.r * 0.25, 0, TAU); ctx.fill(); }
        else if (s.petit) { ctx.fillStyle = s.color; ctx.beginPath(); ctx.arc(s.x, s.y, s.r, 0, TAU); ctx.fill(); }
        else { ctx.fillStyle = s.color; ctx.strokeStyle = INK; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.arc(s.x, s.y, s.r, 0, TAU); ctx.fill(); ctx.stroke(); FX.glow(ctx, s.x, s.y, s.r * 1.2, '#ffffff', 0.35); ctx.save(); ctx.translate(s.x, s.y); ctx.rotate(time * 4); Seal.glyph(ctx, s.core, 0, 0, s.r * 0.6, '#efe3c4', 1); ctx.restore(); }
        break;
      }
      case 'trap': ctx.strokeStyle = s.color; ctx.lineWidth = 1.5; ctx.globalAlpha = 0.6 + Math.sin(s.t * 4) * 0.2; ctx.setLineDash([6, 6]); ctx.beginPath(); ctx.ellipse(s.x, s.y, s.r, s.r * 0.5, 0, 0, TAU); ctx.stroke(); ctx.setLineDash([]); Seal.glyph(ctx, s.core, s.x, s.y, 10, s.color, 1); Seal.glyph(ctx, 'contact', s.x, s.y - 18, 5, s.color, 1); break;
      case 'timer': ctx.strokeStyle = s.color; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(s.x, s.y, 12, -Math.PI / 2, -Math.PI / 2 + TAU * (1 - s.t / (s.max || 2))); ctx.stroke(); ctx.fillStyle = s.color; ctx.beginPath(); ctx.arc(s.x, s.y, 5 + Math.sin(time * 20) * 1.5, 0, TAU); ctx.fill(); break;
      case 'beamtimer': { const p = st.p; const px = p.x + p.w / 2, py = p.y + p.h * 0.45; ctx.strokeStyle = s.color; ctx.lineWidth = 1 + (1 - s.t / (s.max || 2)) * 4; ctx.globalAlpha = 0.5; ctx.setLineDash([4, 8]); ctx.beginPath(); ctx.moveTo(px, py); ctx.lineTo(px + s.dx * 300 * s.prm.range, py + s.dy * 300 * s.prm.range); ctx.stroke(); break; }
      case 'field': {
        const a = clamp(s.life / Math.max(0.1, s.max) * 2, 0, 1) * (s.faible ? 0.3 : 0.5);
        const C = colorOf(s.core);
        const g = ctx.createRadialGradient(s.x, s.y, 2, s.x, s.y, s.r); g.addColorStop(0, U.hexA(C, a)); g.addColorStop(1, U.hexA(C, 0));
        ctx.fillStyle = g; ctx.beginPath(); ctx.ellipse(s.x, s.y, s.r, s.r * (s.grav ? 1 : 0.6), 0, 0, TAU); ctx.fill();
        ctx.strokeStyle = U.hexA(C, a); ctx.lineWidth = 1.5; ctx.setLineDash([3, 6]); ctx.beginPath(); ctx.ellipse(s.x, s.y, s.r, s.r * (s.grav ? 1 : 0.6), 0, 0, TAU); ctx.stroke();
        if (s.grav) { for (let i = 0; i < 5; i++) { const yy = s.y + s.r - ((time * 60 + i * s.r * 0.4) % (s.r * 2)); const xx = s.x + Math.sin(i * 2.1) * s.r * 0.6; ctx.beginPath(); ctx.moveTo(xx, yy + 6); ctx.lineTo(xx, yy - 4); ctx.moveTo(xx - 3, yy - 1); ctx.lineTo(xx, yy - 4); ctx.lineTo(xx + 3, yy - 1); ctx.setLineDash([]); ctx.stroke(); } }
        break;
      }
      case 'canal': ctx.strokeStyle = s.spec.color; ctx.lineWidth = 2; ctx.globalAlpha = 0.6 + Math.sin(time * 12) * 0.2; ctx.setLineDash([5, 5]); U.inkCircle(ctx, s.x, s.y, s.r, 3 + Math.floor(time * 6), 2); ctx.setLineDash([]); { const p = st.p; ctx.globalAlpha = 0.4; ctx.beginPath(); ctx.moveTo(p.x + p.w / 2, p.y + p.h * 0.45); ctx.lineTo(s.x, s.y); ctx.stroke(); } break;
      case 'orbit': ctx.fillStyle = s.color; ctx.strokeStyle = INK; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.arc(s.x, s.y, s.r, 0, TAU); ctx.fill(); ctx.stroke(); Seal.glyph(ctx, s.spec.core, s.x, s.y, s.r * 0.6, '#efe3c4', 1); break;
      case 'totem': { ctx.strokeStyle = INK; ctx.lineWidth = 2.5; U.inkLine(ctx, s.x, s.y, s.x, s.y - 44, 3, 0.8); ctx.fillStyle = s.color; ctx.strokeStyle = INK; U.inkPolyPath(ctx, [[s.x - 10, s.y - 44], [s.x + 10, s.y - 44], [s.x, s.y - 60]], 4, 0.6); ctx.fill(); ctx.stroke(); Seal.glyph(ctx, s.spec.core, s.x, s.y - 30, 7, s.color, 2); const pulse = 1 - s.t / 2; ctx.globalAlpha = 0.35 * (1 - pulse); ctx.strokeStyle = s.color; ctx.lineWidth = 2; ctx.beginPath(); ctx.ellipse(s.x, s.y - 20, s.r * pulse, s.r * 0.5 * pulse, 0, 0, TAU); ctx.stroke(); break; }
      case 'rain': ctx.strokeStyle = s.color; ctx.lineWidth = 1.2; ctx.globalAlpha = 0.5; for (let k = 0; k < 5; k++) U.inkCircle(ctx, s.x - s.w / 2 + k * s.w / 4, s.yTop - 10 + (k % 2) * 6, 14, k, 1.2); break;
      case 'prise': {
        const R = rayonPrise(s);
        FX.glow(ctx, s.x, s.y, R * 1.8, s.color, 0.35);
        let k = 0;
        for (const m in s.mats) {
          const c = P[m].color, nb = Math.min(14, 2 + Math.round(s.mats[m] / 25));
          for (let i = 0; i < nb; i++) { const a = (i / nb) * TAU + time * (1.2 + k * 0.4) + k; const rr = R * (0.25 + 0.55 * U.hash2(i, k + 3)); const bx = s.x + Math.cos(a) * rr, by = s.y + Math.sin(a) * rr * 0.85; ctx.fillStyle = c; ctx.globalAlpha = P[m].liquid ? 0.75 : 0.9; ctx.beginPath(); ctx.arc(bx, by, R * 0.32 + Math.sin(time * 6 + i) * 1.5, 0, TAU); ctx.fill(); }
          k++;
        }
        ctx.globalAlpha = 0.9; ctx.strokeStyle = INK; ctx.lineWidth = 1.6; U.inkCircle(ctx, s.x, s.y, R * 0.95 + Math.sin(time * 5) * 2, Math.floor(time * 6), 2);
        ctx.strokeStyle = s.color; ctx.lineWidth = 2; ctx.setLineDash([5, 7]); ctx.beginPath(); ctx.arc(s.x, s.y, R * 1.15, time * 2, time * 2 + TAU); ctx.stroke(); ctx.setLineDash([]);
        if (s.tenue) { const p = st.p; ctx.globalAlpha = 0.45; ctx.strokeStyle = s.color; ctx.lineWidth = 2; U.inkLine(ctx, p.x + p.w / 2, p.y + p.h * 0.4, s.x, s.y, Math.floor(time * 8), 3); }
        break;
      }
      case 'attente': { const x = s.x != null ? s.x : st.p.x, y = s.y != null ? s.y : st.p.y; ctx.strokeStyle = s.spec.color; ctx.lineWidth = 2; ctx.globalAlpha = 0.6 + Math.sin(time * 6) * 0.3; U.inkCircle(ctx, x, y, s.self ? 34 : 14, 3, 1); ctx.globalAlpha = 1; if (!s.self) Seal.glyph(ctx, s.spec.core, x, y, 7, s.spec.color, 1); U.txt(ctx, 'F', x + (s.self ? 26 : 14), y - (s.self ? 26 : 14), 12, 'center', INK); break; }
      case 'repeat': { const k = 1 - s.t / s.max; ctx.strokeStyle = s.spec.color; ctx.globalAlpha = 0.5; ctx.lineWidth = 1.5; const x = s.self ? st.p.x + st.p.w / 2 : s.x, y = s.self ? st.p.y + st.p.h / 2 : s.y; ctx.beginPath(); ctx.arc(x, y, 16, -Math.PI / 2, -Math.PI / 2 + TAU * k); ctx.stroke(); U.txt(ctx, '×' + s.left, x + 18, y - 16, 10, 'left', '#6b4f2a'); break; }
      case 'expire': { ctx.globalAlpha = 0.35; Seal.glyph(ctx, 'expiration', s.x, s.y - 22, 6, s.spec.color, 2); break; }
      case 'bouclier': { const span = 1.05; ctx.lineCap = 'round'; ctx.strokeStyle = s.spec.color; ctx.globalAlpha = 0.35 + 0.5 * Math.min(1, s.life / 0.5); ctx.lineWidth = 9 * s.spec.prm.size; ctx.beginPath(); ctx.arc(s.x, s.y, s.r, s.a - span, s.a + span); ctx.stroke(); ctx.globalAlpha = 0.9; ctx.strokeStyle = INK; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.arc(s.x, s.y, s.r + 5 * s.spec.prm.size, s.a - span, s.a + span); ctx.stroke(); ctx.beginPath(); ctx.arc(s.x, s.y, s.r - 5 * s.spec.prm.size, s.a - span, s.a + span); ctx.stroke(); Seal.glyph(ctx, s.spec.core, s.x + Math.cos(s.a) * s.r, s.y + Math.sin(s.a) * s.r, 7, '#efe3c4', 2); break; }
      case 'vague': { const r = s.r, d = s.dir; ctx.save(); FX.glow(ctx, s.x, s.y - r * 0.5, r * 1.6, s.color, 0.4); ctx.strokeStyle = s.color; ctx.lineCap = 'round'; ctx.lineWidth = 4; ctx.globalAlpha = 0.85;
        ctx.beginPath(); ctx.moveTo(s.x - d * r * 1.3, s.y); ctx.quadraticCurveTo(s.x - d * r * 0.2, s.y - r * 1.7, s.x + d * r * 0.7, s.y - r * 0.9); ctx.quadraticCurveTo(s.x + d * r * 0.35, s.y - r * 0.55, s.x + d * r * 0.55, s.y - r * 0.2); ctx.stroke();
        ctx.lineWidth = 1.5; ctx.strokeStyle = INK; ctx.globalAlpha = 0.6; ctx.beginPath(); ctx.moveTo(s.x - d * r * 1.1, s.y - 2); ctx.quadraticCurveTo(s.x - d * r * 0.3, s.y - r * 1.3, s.x + d * r * 0.4, s.y - r * 0.8); ctx.stroke(); ctx.restore(); break; }
      case 'colonne': { const k = Math.min(1, s.life / 0.4, (s.max - s.life) / 0.2); ctx.save(); FX.glow(ctx, s.x, s.y - s.h * 0.5, s.w * 3, s.color, 0.35 * k); ctx.globalAlpha = 0.35 * k; ctx.fillStyle = s.color;
        ctx.beginPath(); ctx.moveTo(s.x - s.w, s.y); for (let i = 0; i <= 12; i++) { const f = i / 12; ctx.lineTo(s.x - s.w * (1 - f * 0.3) + Math.sin(time * 9 + f * 8) * 3, s.y - f * s.h); } for (let i = 12; i >= 0; i--) { const f = i / 12; ctx.lineTo(s.x + s.w * (1 - f * 0.3) + Math.sin(time * 9 + f * 8 + 2) * 3, s.y - f * s.h); } ctx.closePath(); ctx.fill();
        ctx.globalAlpha = 0.8 * k; ctx.strokeStyle = s.color; ctx.lineWidth = 1.5; for (let j = -1; j <= 1; j += 2) { ctx.beginPath(); for (let i = 0; i <= 12; i++) { const f = i / 12; const xx = s.x + j * s.w * 0.5 + Math.sin(time * 12 + f * 10 + j) * 4, yy = s.y - ((f + time * 1.5) % 1) * s.h; if (i) ctx.lineTo(xx, yy); else ctx.moveTo(xx, yy); } ctx.stroke(); } ctx.restore(); break; }
      case 'bulle': {
        if (s.rect) { const kk = Math.min(1, s.life / 0.5, (s.max - s.life) / 0.3), R2 = s.rect, w = R2.x1 - R2.x0, h = R2.y1 - R2.y0, C2 = s.mode === 'vite' ? '#9aa0ae' : s.mode === 'fige' ? '#9aa8c8' : '#6a80c0';
          ctx.save(); ctx.globalAlpha = 0.13 * kk; ctx.fillStyle = s.mode === 'vite' ? '#e8e4d8' : '#a8b8e8'; ctx.fillRect(R2.x0, R2.y0, w, h); ctx.globalAlpha = 0.7 * kk; ctx.strokeStyle = C2; ctx.lineWidth = 2; ctx.strokeRect(R2.x0, R2.y0, w, h);
          const nc = Math.max(1, Math.round(Math.max(w, h) / 90)); for (let i = 0; i < nc; i++) { const f = (i + 0.5) / nc, cx2 = w > h ? R2.x0 + f * w : R2.x0 + w / 2, cy2 = w > h ? R2.y0 + h / 2 : R2.y0 + f * h, rr = Math.min(w, h) * 0.32; ctx.lineWidth = 1.2; U.inkCircle(ctx, cx2, cy2, rr, 5 + i, 1); const t2 = s.mode === 'vite' ? time * 9 : s.mode === 'fige' ? 0.6 : time * 0.15; ctx.beginPath(); ctx.moveTo(cx2, cy2); ctx.lineTo(cx2 + Math.cos(t2 - Math.PI / 2) * rr * 0.8, cy2 + Math.sin(t2 - Math.PI / 2) * rr * 0.8); ctx.stroke(); }
          ctx.restore(); break; }
        const kk = Math.min(1, s.life / 0.5, (s.max - s.life) / 0.3), vite = s.mode === 'vite', C = vite ? '#9aa0ae' : '#6a80c0';
        ctx.save(); ctx.globalAlpha = 0.12 * kk; ctx.fillStyle = vite ? '#e8e4d8' : '#a8b8e8'; ctx.beginPath(); ctx.arc(s.x, s.y, s.r, 0, TAU); ctx.fill();
        ctx.globalAlpha = 0.75 * kk; ctx.strokeStyle = C; ctx.lineWidth = 2; U.inkCircle(ctx, s.x, s.y, s.r, 4, 1.2); ctx.lineWidth = 1; U.inkCircle(ctx, s.x, s.y, s.r * 0.88, 5, 1);
        for (let i = 0; i < 12; i++) { const a = i / 12 * TAU; ctx.beginPath(); ctx.moveTo(s.x + Math.cos(a) * s.r * 0.88, s.y + Math.sin(a) * s.r * 0.88); ctx.lineTo(s.x + Math.cos(a) * s.r * (i % 3 ? 0.82 : 0.76), s.y + Math.sin(a) * s.r * (i % 3 ? 0.82 : 0.76)); ctx.stroke(); }
        const t = vite ? time * 9 : s.mode === 'fige' ? 0.6 : time * 0.15; ctx.lineWidth = 2.4; ctx.beginPath(); ctx.moveTo(s.x, s.y); ctx.lineTo(s.x + Math.cos(t - Math.PI / 2) * s.r * 0.6, s.y + Math.sin(t - Math.PI / 2) * s.r * 0.6); ctx.stroke();
        ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(s.x, s.y); ctx.lineTo(s.x + Math.cos(t / 12 - Math.PI / 2) * s.r * 0.38, s.y + Math.sin(t / 12 - Math.PI / 2) * s.r * 0.38); ctx.stroke();
        if (!vite) { ctx.lineWidth = 1; ctx.globalAlpha = 0.35 * kk; for (let w = 1; w <= 2; w++) { ctx.beginPath(); for (let i = 0; i <= 40; i++) { const a = i / 40 * TAU; const rr = s.r * (0.5 + w * 0.15) + Math.sin(a * 6 + time * 0.8) * 3; if (i) ctx.lineTo(s.x + Math.cos(a) * rr, s.y + Math.sin(a) * rr); else ctx.moveTo(s.x + Math.cos(a) * rr, s.y + Math.sin(a) * rr); } ctx.stroke(); } }
        ctx.restore(); break; }
      case 'tornade': { const kk = Math.min(1, s.life / 0.6, (s.max - s.life) / 0.4); ctx.lineCap = 'round';
        for (let i = 0; i < 16; i++) { const f = i / 16; const yy = s.y - f * s.h; const w = s.r * (0.22 + f * 0.95); const ph = time * 8 + i * 0.55; const ox = Math.sin(time * 2 + f * 4 + s.ph) * 10 * f;
          ctx.globalAlpha = (0.25 + 0.45 * (1 - f)) * kk; ctx.strokeStyle = i % 3 ? '#9fd0cc' : '#3f9c9b'; ctx.lineWidth = 1.2 + (1 - f) * 1.5;
          ctx.beginPath(); ctx.ellipse(s.x + ox, yy, w, w * 0.2, 0, ph % TAU, ph % TAU + 3.8); ctx.stroke(); }
        break; }
      case 'singularite': { const t = 1 - s.life / s.max; ctx.strokeStyle = '#9a4a8c'; ctx.lineWidth = 2; for (let k = 0; k < 4; k++) { ctx.globalAlpha = 0.6; ctx.beginPath(); ctx.arc(s.x, s.y, (s.r * 0.6) * (1 - ((t * 3 + k * 0.25) % 1)), 0, TAU); ctx.stroke(); } ctx.fillStyle = '#1f1a16'; ctx.globalAlpha = 1; ctx.beginPath(); ctx.arc(s.x, s.y, 6 + Math.sin(time * 20) * 2, 0, TAU); ctx.fill(); break; }
      case 'label': ctx.globalAlpha = Math.min(1, s.life * 2); if (s.petit) { const w = ctx.measureText ? s.txt.length * 6.2 + 14 : 120; ctx.fillStyle = 'rgba(239,227,196,0.9)'; ctx.fillRect(s.x - w / 2, s.y - 11, w, 18); ctx.strokeStyle = INK; ctx.lineWidth = 1; ctx.strokeRect(s.x - w / 2, s.y - 11, w, 18); U.txt(ctx, s.txt, s.x, s.y - 1, 13, 'center', INK, 'IM Fell English', 'italic'); } else U.txt(ctx, s.txt, s.x, s.y, 20, 'center', INK, 'IM Fell English SC'); break;
      case 'ring': FX.onde(ctx, s.x, s.y, s.r, 1 - s.life / s.max, s.color); break;
      case 'rembob': { const k = 1 - s.life / s.max; ctx.save(); ctx.strokeStyle = '#7a8ad0'; ctx.globalAlpha = 1 - k; ctx.lineWidth = 2.5;
        U.inkCircle(ctx, s.x, s.y, s.r * (1.1 - k * 0.9), 5, 1.4); ctx.lineWidth = 1.2; U.inkCircle(ctx, s.x, s.y, s.r * (0.8 - k * 0.6), 6, 1);
        ctx.translate(s.x, s.y); ctx.rotate(-k * 12); ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(0, -s.r * 0.5); ctx.moveTo(0, 0); ctx.rotate(-k * 30); ctx.lineTo(0, -s.r * 0.3); ctx.stroke(); ctx.restore();
        FX.glow(ctx, s.x, s.y, s.r * (1 - k * 0.5), '#9aa8e8', (1 - k) * 0.4); break; }
      case 'fantome': { const k = s.life / s.max; ctx.save(); ctx.strokeStyle = '#7a8ad0'; ctx.setLineDash([4, 6]); ctx.lineWidth = 2; ctx.globalAlpha = k; ctx.beginPath(); s.pts.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y))); ctx.stroke(); ctx.setLineDash([]);
        for (let i = 0; i < s.pts.length; i += 2) { const [x, y] = s.pts[i]; ctx.globalAlpha = k * 0.35 * (1 - i / s.pts.length); ctx.fillStyle = '#9aa8e8'; ctx.beginPath(); ctx.ellipse(x, y, 10, 22, 0, 0, TAU); ctx.fill(); } ctx.restore(); break; }
      case 'zap': FX.eclair(ctx, s.pts, s.color || '#e0c43a', s.color ? 2.2 : 1.4, s.life / s.max, null, s.color === '#b070e0' ? '#ead2ff' : '#fffbe8'); break;
      case 'beam': { const t = s.life / s.max;
        if (s.core === 'foudre') { FX.eclair(ctx, FX.eclairPts(s.x1, s.y1, s.x2, s.y2, 0.12), '#e0c43a', s.w * 0.45 * t + 1, t); break; }
        ctx.globalCompositeOperation = 'lighter'; ctx.lineCap = 'round'; ctx.strokeStyle = s.color; ctx.globalAlpha = t * 0.35; ctx.lineWidth = s.w * 3 * t + 2; ctx.beginPath(); ctx.moveTo(s.x1, s.y1); ctx.lineTo(s.x2, s.y2); ctx.stroke();
        ctx.globalAlpha = t; ctx.lineWidth = s.w * t + 1; ctx.stroke(); ctx.strokeStyle = '#fffbe8'; ctx.lineWidth = Math.max(0.5, s.w * t * 0.35); ctx.stroke();
        ctx.globalCompositeOperation = 'source-over'; FX.glow(ctx, s.x2, s.y2, 26 * t + 6, s.color, t); break; }
    }
    ctx.restore();
  }
  function drawGField(ctx, z) {
    ctx.save();
    const a = clamp(z.life / Math.max(0.1, z.max) * 3, 0, 1);
    if (z.rect) {
      const R2 = z.rect, w = R2.x1 - R2.x0, h = R2.y1 - R2.y0;
      ctx.globalAlpha = (0.08 + 0.04 * Math.min(2, z.mag)) * a; ctx.fillStyle = '#6c5ab8'; ctx.fillRect(R2.x0, R2.y0, w, h);
      ctx.globalAlpha = 0.6 * a; ctx.strokeStyle = '#6c5ab8'; ctx.lineWidth = 1.5; ctx.setLineDash([5, 6]); ctx.strokeRect(R2.x0, R2.y0, w, h); ctx.setLineDash([]);
      const n = Math.max(4, Math.round(w * h / 2500));
      for (let i = 0; i < n; i++) { const u = U.hash2(i, 3), v = (time * (0.4 + z.mag * 0.35) + U.hash2(i, 5)) % 1; const ax = R2.x0 + (z.gx === 0 ? u * w : (z.gx > 0 ? v : 1 - v) * w), ay = R2.y0 + (z.gy === 0 ? u * h : (z.gy > 0 ? v : 1 - v) * h); if (z.mag === 0) { ctx.beginPath(); ctx.arc(ax, ay, 2.5, 0, TAU); ctx.stroke(); continue; } const px = -z.gy, py = z.gx; ctx.beginPath(); ctx.moveTo(ax - z.gx * 9, ay - z.gy * 9); ctx.lineTo(ax, ay); ctx.moveTo(ax - z.gx * 4 + px * 3, ay - z.gy * 4 + py * 3); ctx.lineTo(ax, ay); ctx.lineTo(ax - z.gx * 4 - px * 3, ay - z.gy * 4 - py * 3); ctx.stroke(); }
      ctx.restore(); return;
    }
    ctx.strokeStyle = '#6c5ab8'; ctx.globalAlpha = 0.55 * a; ctx.lineWidth = 1.5; ctx.setLineDash([4, 6]);
    U.inkCircle(ctx, z.x, z.y, z.r, 7, 2); ctx.setLineDash([]);
    ctx.globalAlpha = 0.08 * a; ctx.fillStyle = '#6c5ab8'; ctx.beginPath(); ctx.arc(z.x, z.y, z.r, 0, TAU); ctx.fill();
    ctx.globalAlpha = 0.6 * a; ctx.lineWidth = 1.5;
    const n = 7;
    for (let i = 0; i < n; i++) {
      const u = U.hash2(i, 3) * 2 - 1, v = ((time * (0.3 + z.mag * 0.25) + i / n) % 1) * 2 - 1;
      if (z.mag === 0) { const ax = z.x + Math.cos(i * 2.4 + time * 0.5) * z.r * 0.6, ay = z.y + Math.sin(i * 1.7 + time * 0.7) * z.r * 0.6; ctx.beginPath(); ctx.arc(ax, ay, 3, 0, TAU); ctx.stroke(); continue; }
      const px = -z.gy, py = z.gx;
      const ax = z.x + px * u * z.r * 0.7 + z.gx * v * z.r * 0.7, ay = z.y + py * u * z.r * 0.7 + z.gy * v * z.r * 0.7;
      ctx.beginPath(); ctx.moveTo(ax - z.gx * 8, ay - z.gy * 8); ctx.lineTo(ax + z.gx * 4, ay + z.gy * 4);
      ctx.moveTo(ax + z.gx * 4 + px * 3 - z.gx * 4, ay + z.gy * 4 + py * 3 - z.gy * 4); ctx.lineTo(ax + z.gx * 4, ay + z.gy * 4); ctx.lineTo(ax + z.gx * 4 - px * 3 - z.gx * 4, ay + z.gy * 4 - py * 3 - z.gy * 4);
      ctx.stroke();
    }
    ctx.restore();
  }
  function drawPart(ctx, q) {
    if (FX.particule(ctx, q, time) !== false) return;
    const a = clamp(q.life / q.max, 0, 1);
    ctx.save(); ctx.globalAlpha = a; ctx.fillStyle = q.color; ctx.strokeStyle = q.color;
    if (q.type === 'spark') { ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(q.x - q.size, q.y); ctx.lineTo(q.x + q.size, q.y); ctx.moveTo(q.x, q.y - q.size); ctx.lineTo(q.x, q.y + q.size); ctx.stroke(); }
    else if (q.type === 'feuille') { ctx.beginPath(); ctx.ellipse(q.x, q.y, q.size * 1.4, q.size * 0.7, q.life * 3, 0, TAU); ctx.fill(); }
    else if (q.type === 'coeur') { ctx.font = (q.size * 4) + 'px serif'; ctx.textAlign = 'center'; ctx.fillText('♥', q.x, q.y); }
    else { ctx.beginPath(); ctx.arc(q.x, q.y, q.size * (0.5 + a * 0.5), 0, TAU); ctx.fill(); }
    ctx.restore();
  }

  function objets() { return st ? st.objs : []; }
  function toWorld(mx, my) { return { x: mx + st.cam.x, y: my + st.cam.y }; }
  function state() { return st; }
  function level() { return L; }
  function throwCarried(aim) { if (st.p.carry) drop(aim); }

  return { build, ensure, reset, update, draw, castSeal, usePotion, useLiquid, interact, throwCarried, toWorld, state, level, drawApprenti, respawn, serialize, releaseControl, gridEffectOn, relacher, objets, detoner, lancerPrise, dig, saison, _effet: (...a) => applyEffect(...a), get phen() { return PH; } };
})();
