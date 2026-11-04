'use strict';
// ---------- Monde extérieur : entités sur grille de matières, effets, créatures, météo, rendu ----------
const World = (() => {
  const { TAU, INK, clamp, lerp, dist } = U;
  const GRAV = 1500;
  const CHAUD_OK = ['follet', 'salamandre', 'golem', 'familier'], FROID_OK = ['lapin', 'golem', 'familier', 'poisson'];
  // ---------- Masse et flottaison ----------
  const MASSE = { caisse: 0.8, rocher: 4, golem: 6, tortue: 1.6, lapin: 0.4, limace: 0.5, grenouille: 0.3, poisson: 0.2, corbeau: 0.2, follet: 0.1, salamandre: 0.5, chauve: 0.2, escargot: 0.4, familier: 0.2, gardien: 12 };
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
    Sim.ancrer(); PH.reset(); GD.reset();
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
    daylight: () => daylight(), revenir: (c) => finMorph(c), makeSpec: (s) => makeSpec(s), ventAt: (x, y) => Sim.ventAt(x, y), tient: (h) => tientMain(h), boire: (n) => { if (st.p.ink < n) return false; st.p.ink -= n; return true; },
    origine: () => ({ x: st.p.x + st.p.w / 2, y: st.p.y + st.p.h * 0.45 }), cible: (R) => { const p = st.p, o = { x: p.x + p.w / 2, y: p.y + p.h * 0.45 }, a = toWorld(game.inp.mouse.x, game.inp.mouse.y); const dx = a.x - o.x, dy = a.y - o.y, d = Math.hypot(dx, dy) || 1, k = Math.min(1, R / d); return { x: o.x + dx * k, y: o.y + dy * k }; }, addXp: (n) => { if (game && game.addXp) game.addXp(n); }, tempsDe: (x, y) => (bullesT.length ? tempsDe(x, y, 2) : 1),
  });
  // ---------- Gardiens (un par région, js/gardiens.js) ----------
  const GD = creerGardiens({
    get st() { return st; }, get L() { return L; }, game: () => game, part: (...a) => part(...a), msg: (...a) => msg(...a), evt: (...a) => evt(...a),
    son: (a, b) => Son.sfx(a, b), shake: (v) => { st.shake = Math.max(st.shake, v); }, flash: (v) => { st.flash = Math.max(st.flash, v); },
    moveBody: (b, dt) => moveBody(b, dt), applyGrav: (b, dt, k) => applyGrav(b, dt, k), dropPickup: (i, x, y) => dropPickup(i, x, y),
  });
  // ---------- Rendu du monde : ciel, nuit, objets, créatures, joueur, sorts (js/rendu.js) ----------
  const RD = creerRendu({ get VW() { return VW; }, get VH() { return VH; }, get GD() { return GD; }, get PH() { return PH; }, get colorOf() { return colorOf; }, get darkCv() { return darkCv; }, get daylight() { return daylight; }, get emetActif() { return emetActif; }, get findInteraction() { return findInteraction; }, get game() { return game; }, get groundBelow() { return groundBelow; }, get labelInteraction() { return labelInteraction; }, get part() { return part; }, get posMarque() { return posMarque; }, get rayonPrise() { return rayonPrise; }, get saison() { return saison; }, get st() { return st; }, get time() { return time; }, get toWorld() { return toWorld; } });
  function draw(...a) { return RD.draw(...a); }
  function drawApprenti(...a) { return RD.drawApprenti(...a); }
  // ---------- Créatures : bêtes du monde et familiers (js/creatures.js) ----------
  const CR = creerCreatures({ get GRAV() { return GRAV; }, get CHAUD_OK() { return CHAUD_OK; }, get DENS() { return DENS; }, get FROID_OK() { return FROID_OK; }, get GD() { return GD; }, get L() { return L; }, get applyEffect() { return applyEffect; }, get applyGrav() { return applyGrav; }, get bullesT() { return bullesT; }, get colorOf() { return colorOf; }, get daylight() { return daylight; }, get doBurst() { return doBurst; }, get doContinuous() { return doContinuous; }, get dropPickup() { return dropPickup; }, get ev2() { return ev2; }, get evt() { return evt; }, get finMorph() { return finMorph; }, get flotter() { return flotter; }, get game() { return game; }, get gravOf() { return gravOf; }, get hurt() { return hurt; }, get inView() { return inView; }, get liquidOf() { return liquidOf; }, get makeCreature() { return makeCreature; }, get masse() { return masse; }, get metamorphoser() { return metamorphoser; }, get moveBody() { return moveBody; }, get msg() { return msg; }, get nomCreature() { return nomCreature; }, get part() { return part; }, get poserBulle() { return poserBulle; }, get spawnLiquid() { return spawnLiquid; }, get st() { return st; }, get tempsDe() { return tempsDe; }, get time() { return time; }, get toWorld() { return toWorld; }, get unstick() { return unstick; } });
  function affinite(...a) { return CR.affinite(...a); }
  function nouveauFamilier(...a) { return CR.nouveauFamilier(...a); }
  function ordonner(...a) { return CR.ordonner(...a); }
  function retenir(...a) { return CR.retenir(...a); }
  function tame(...a) { return CR.tame(...a); }
  function updateCreatures(...a) { return CR.updateCreatures(...a); }
  // ---------- Sorts : lancer, voler, éclater, saisir, boucliers (js/sorts.js) ----------
  const SO = creerSorts({ get FLAM() { return FLAM; }, get L() { return L; }, get PH() { return PH; }, get applyEffect() { return applyEffect; }, get applySelf() { return applySelf; }, get bullesT() { return bullesT; }, get champForme() { return champForme; }, get colorOf() { return colorOf; }, get dropPickup() { return dropPickup; }, get dynSolids() { return dynSolids; }, get evt() { return evt; }, get game() { return game; }, get gravOf() { return gravOf; }, get gridEffect() { return gridEffect; }, get groundBelow() { return groundBelow; }, get hurt() { return hurt; }, get liquidOf() { return liquidOf; }, get makeObj() { return makeObj; }, get matiereCercle() { return matiereCercle; }, get matiereDe() { return matiereDe; }, get matiereLigne() { return matiereLigne; }, get matiereRect() { return matiereRect; }, get msg() { return msg; }, get murPoints() { return murPoints; }, get nouveauFamilier() { return nouveauFamilier; }, get part() { return part; }, get poserMatiere() { return poserMatiere; }, get potionBurst() { return potionBurst; }, get spawnLiquid() { return spawnLiquid; }, get spec0() { return spec0; }, set spec0(v) { spec0 = v; }, get st() { return st; }, get tempsDe() { return tempsDe; }, get time() { return time; }, get toWorld() { return toWorld; }, get unstick() { return unstick; }, get vieillir() { return vieillir; } });
  function castSeal(...a) { return SO.castSeal(...a); }
  function detoner(...a) { return SO.detoner(...a); }
  function doBurst(...a) { return SO.doBurst(...a); }
  function doContinuous(...a) { return SO.doContinuous(...a); }
  function ecraserPrise(...a) { return SO.ecraserPrise(...a); }
  function finBouclier(...a) { return SO.finBouclier(...a); }
  function lancerPrise(...a) { return SO.lancerPrise(...a); }
  function launch(...a) { return SO.launch(...a); }
  function makeSpec(...a) { return SO.makeSpec(...a); }
  function placeMarque(...a) { return SO.placeMarque(...a); }
  function posMarque(...a) { return SO.posMarque(...a); }
  function rayonPrise(...a) { return SO.rayonPrise(...a); }
  function selfCast(...a) { return SO.selfCast(...a); }
  function tientMain(...a) { return SO.tientMain(...a); }
  function updateSpells(...a) { return SO.updateSpells(...a); }
  // ---------- Effets des essences : sur la matière, les créatures et soi (js/effets.js) ----------
  const EF = creerEffets({ get CHAMPS() { return CHAMPS; }, get FLAM() { return FLAM; }, get FORMES() { return FORMES; }, get GD() { return GD; }, get HIST_DT() { return HIST_DT; }, get HIST_N() { return HIST_N; }, get MORPHS() { return MORPHS; }, get PH() { return PH; }, get addGField() { return addGField; }, get affinite() { return affinite; }, get attachLien() { return attachLien; }, get colorOf() { return colorOf; }, get controlCreature() { return controlCreature; }, get dropPickup() { return dropPickup; }, get ecraserPrise() { return ecraserPrise; }, get evt() { return evt; }, get finBouclier() { return finBouclier; }, get fxBurst() { return fxBurst; }, get game() { return game; }, get groundBelow() { return groundBelow; }, get growPlant() { return growPlant; }, get hurt() { return hurt; }, get makeCreature() { return makeCreature; }, get makeObj() { return makeObj; }, get masse() { return masse; }, get msg() { return msg; }, get nomCreature() { return nomCreature; }, get onSimEvent() { return onSimEvent; }, get part() { return part; }, get placeMarque() { return placeMarque; }, get placePortail() { return placePortail; }, get posMarque() { return posMarque; }, get releaseControl() { return releaseControl; }, get setPG() { return setPG; }, get snapDir() { return snapDir; }, get spec0() { return spec0; }, set spec0(v) { spec0 = v; }, get st() { return st; }, get tame() { return tame; }, get time() { return time; }, get unstick() { return unstick; } });
  function applyEffect(...a) { return EF.applyEffect(...a); }
  function applySelf(...a) { return EF.applySelf(...a); }
  function champForme(...a) { return EF.champForme(...a); }
  function finFormeSoi(...a) { return EF.finFormeSoi(...a); }
  function finMorph(...a) { return EF.finMorph(...a); }
  function gridEffect(...a) { return EF.gridEffect(...a); }
  function gridEffectOn(...a) { return EF.gridEffectOn(...a); }
  function matiereCercle(...a) { return EF.matiereCercle(...a); }
  function matiereDe(...a) { return EF.matiereDe(...a); }
  function matiereLigne(...a) { return EF.matiereLigne(...a); }
  function matiereRect(...a) { return EF.matiereRect(...a); }
  function memoriser(...a) { return EF.memoriser(...a); }
  function metamorphoser(...a) { return EF.metamorphoser(...a); }
  function murPoints(...a) { return EF.murPoints(...a); }
  function poserBulle(...a) { return EF.poserBulle(...a); }
  function poserMatiere(...a) { return EF.poserMatiere(...a); }
  function vieillir(...a) { return EF.vieillir(...a); }
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
  const MECA = ['levier', 'plaque', 'brasier', 'roue', 'moulin', 'lampe', 'grille', 'coffre', 'stele'];
  const EMETTEURS = ['levier', 'plaque', 'brasier', 'roue', 'moulin', 'lampe', 'stele'];
  function emetActif(o) {
    switch (o.t) {
      case 'levier': return o.voulu !== undefined ? o.etat === o.voulu : o.etat;
      case 'plaque': return o.actif;
      case 'brasier': return o.feu > 0;
      case 'roue': return o.eau > 0.75;
      case 'moulin': return o.spin > 0;
      case 'lampe': return o.charge > 0;
      case 'stele': return !!o.grave;
    }
    return false;
  }
  // ---------- Stèles de fusion : elles s'éveillent quand la fusion gravée naît près d'elles ----------
  function distPh(q, x, y) {
    if (q.ligne) { const L = q.ligne, vx = L.x2 - L.x1, vy = L.y2 - L.y1, l2 = vx * vx + vy * vy || 1, t = clamp(((x - L.x1) * vx + (y - L.y1) * vy) / l2, 0, 1); return dist(x, y, L.x1 + vx * t, L.y1 + vy * t); }
    if (q.rect) { const R = q.rect; return Math.hypot(Math.max(R.x0 - x, 0, x - R.x1), Math.max(R.y0 - y, 0, y - R.y1)); }
    return Math.max(0, dist(x, y, q.x, q.y) - q.r * 0.5);
  }
  const nomFusion = (k) => { const I = DATA.comboInfo(k), connu = game.progress.combos && game.progress.combos[k], parts = k.split('|').map((e) => (DATA.CORES[e] ? DATA.CORES[e].nom : e).toLowerCase()).join(' + '); return (connu && I ? I.nom + ' (' + parts + ')' : 'une fusion inconnue (' + parts + ')'); };
  function eveillerStele(o, id) {
    o.grave = true; o.par = id; const cx = o.x + o.w / 2;
    if (o.style === 'cloche') { part(cx, o.y + 18, '#cfe3ea', 26, 170, 1, 3, 300, 'spark'); Son.sfx('burst', 'son'); st.shake = Math.max(st.shake, 0.2); }
    else { part(cx, o.y + o.h / 2, '#e0b050', 18, 90, 1, 3, -40, 'etincelle'); part(cx, o.y + 10, '#fff0b0', 8, 40, 0.8, 6, -30, 'glow'); Son.sfx('unlock'); }
    msg((o.nom || 'La stèle') + ' s\'éveille : ' + (DATA.comboInfo(id) ? DATA.comboInfo(id).nom : id) + '.', 'unlock');
    evt('stele', id);
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
        case 'stele': {
          o.eveil += ((o.grave ? 1 : 0) - o.eveil) * Math.min(1, dt * 1.5);
          if (o.grave || !o.veut) break;
          o.chk -= dt; if (o.chk > 0) break; o.chk = 0.15;
          const cx = o.x + o.w / 2, cy = o.y + o.h / 2;
          const q = PH.liste.find((f) => !f.mort && o.veut.includes(f.id) && distPh(f, cx, cy) < 170);
          if (q) eveillerStele(o, q.id);
          break;
        }
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
      case 'stele': Object.assign(b, o.style === 'cloche' ? { w: 38, h: 60 } : { w: 30, h: 66 }, { grave: false, eveil: o.grave ? 1 : 0, chk: 0, veut: o.veut ? o.veut.slice() : null }); break;
      case 'grille': Object.assign(b, o.horiz ? { w: o.largeur || 54, h: 18, largeur: o.largeur } : { w: 18, h: 90 }, { solid: true, ouv: 0 }); break;
      case 'coffre': Object.assign(b, { w: 40, h: 30, ouvert: !!o.ouvert, couv: o.ouvert ? 1 : 0, sceau: 0 }); break;
    }
    for (const k of ['lit', 'stage', 'hauteur', 'hMax', 'racine', 'lu', 'revele', 'hits', 'pris', 'hp', 'lue', 'page', 'canal', 'etat', 'voulu', 'ouvert', 'recompense', 'nom', 'indice', 'horiz', 'toujours', 'largeur', 'veut', 'grave', 'style', 'par']) if (o[k] !== undefined) b[k] = o[k];
    return b;
  }
  function makeCreature(c) {
    const b = { t: c.t, x: c.x, y: c.y, vx: 0, vy: 0, dir: 1, onGround: false, seed: (c.x * 13) | 0, size: 1, canStep: true,
      sta: { burn: 0, stun: 0, sleep: 0, wet: 0, tame: !!c.tame, glisse: 0 }, hop: 0, filDonne: !!c.tame, x0: c.x0 || c.x, y0: c.y, phase: Math.random() * TAU, hurt: 0, hp: 0 };
    switch (c.t) {
      case 'limace': Object.assign(b, { w: 36, h: 24, hp: 3, hpMax: 3, dmg: 1, portable: true }); break;
      case 'follet': Object.assign(b, { w: 24, h: 24, hp: 2, hpMax: 2, dmg: 1, vole: true, portable: true }); break;
      case 'golem': Object.assign(b, { w: 50, h: 70, hp: 8, hpMax: 8, dmg: 2 }); break;
      case 'gardien': Object.assign(b, GD.stats(c.g)); if (game && game.progress && game.progress.gardiens && game.progress.gardiens[c.g]) { b.vaincu = true; b.respawn = 1e9; } break;
      default: { const sp = DATA.ESPECES[c.t]; if (sp) Object.assign(b, { w: sp.w, h: sp.h, hp: sp.hp, hpMax: sp.hp, dmg: sp.dmg, vole: sp.mode === 'fly', generique: true, portable: sp.w <= 36 }); }
    }
    b.cadeauT = 0;
    if (c.hp !== undefined) b.hp = c.hp;
    if (b.vaincu) b.hp = 0;
    if (c.aff) { b.aff = c.aff; b.affJ = c.affJ; b.affDuJour = c.affDuJour; }
    return b;
  }

  // ---------- Sauvegarde du monde ----------
  function serialize() {
    return {
      mat: Sim.serialize(), tod: st.tod, jour: st.jour || 0, meteo: st.meteo, mecaV: 1,
      objs: st.objs.filter((o) => !o.mort && o.t !== 'magie').map((o) => { const q = { t: o.t, x: Math.round(o.x), y: Math.round(o.y) }; for (const k of ['lit', 'stage', 'hauteur', 'hMax', 'racine', 'lu', 'revele', 'hits', 'pris', 'hp', 'lue', 'page', 'canal', 'etat', 'voulu', 'ouvert', 'recompense', 'nom', 'indice', 'horiz', 'toujours', 'largeur', 'veut', 'grave', 'style', 'par']) if (o[k] !== undefined) q[k] = o[k]; if (o.t === 'pancarte') q.texte = o.texte; return q; }),
      familiers: st.crs.filter((c) => c.t === 'familier' && c.hp > 0 && c.spec && c.spec.seal && c.life > 1).map((c) => ({ espece: c.espece, seal: c.spec.seal, x: Math.round(c.x), y: Math.round(c.y), life: Math.round(c.life), hp: c.hp, age: Math.round(c.age || 0) })),
      phen: PH.sauver(),
      crs: st.crs.filter((c) => c.t !== 'familier' && !c.temporaire).map((c) => ({ t: c.orig ? c.orig.t : c.t, g: c.g, x: Math.round(c.x), y: Math.round(c.y), x0: c.x0, hp: c.orig ? c.orig.hp : c.hp, tame: c.sta.tame, aff: c.aff ? Math.round(c.aff) : undefined, affJ: c.affJ, affDuJour: c.affDuJour })),
    };
  }
  let aRestaurer = null, nappeT = 0;
  function restore(d) {
    try {
      if (d.mat) Sim.deserialize(d.mat);
      if (d.objs) st.objs = d.objs.map(makeObj);
      if (d.objs && !d.mecaV) for (const q of L.objs) if (MECA.includes(q.t)) st.objs.push(makeObj(q));
      if (d.crs) st.crs = d.crs.map(makeCreature);
      if (d.objs) for (const q of L.objs) if (q.v === 2 && !st.objs.some((o) => o.t === q.t && Math.abs(o.x - q.x) < 3 && Math.abs(o.y - q.y) < 3)) st.objs.push(makeObj(q));
      if (d.crs) for (const q of L.crs) if (q.t === 'gardien' && !st.crs.some((c) => c.t === 'gardien' && c.g === q.g)) st.crs.push(makeCreature(q));
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

  // ---------- Effets sur la grille ----------

  // ---------- Effets sur les entités ----------
  // mode : 'burst' (instantané) ou un nombre dt (continu)
  // ---------- Effets nés des aspects ----------
  // ---------- Affinité : on gagne une créature avec le temps ----------
  // au plus 24 répétitions vivantes : la plus ancienne s'arrête
  // ---------- Champs en forme : la Gravité et le Temps épousent le rectangle d'une Colonne ou d'un Mur ----------
  const CHAMPS = ['gravite', 'poids', 'temps', 'ralentir', 'figer'];
  // ---------- Matière : l'effet devient solide ----------
  let spec0 = null;
  // le rectangle d'un mur : des éclats alignés sur son grand côté
  // ---------- Bulles de temps ----------
  // dt : la durée qui s'écoule dans la bulle à chaque image ; f : facteur
  // ---------- Métamorphose ----------
  const MORPHS = ['grenouille', 'lapin', 'escargot', 'tortue', 'salamandre', 'limace', 'corbeau', 'chauve'];
  // sur soi : une forme animale, choisie par le glyphe fusionné
  const FORMES = { grenouille: { nom: 'grenouille', sta: ['small', 'jump', 'branchies'] }, chauve: { nom: 'chauve-souris', sta: ['small', 'vol'] }, lapin: { nom: 'lapin', sta: ['small', 'vitesse', 'jump'] }, golem: { nom: 'golem', sta: ['geant', 'stone'] } };
  // ---------- Rembobinage ----------
  // le monde garde la trace des dernières secondes
  const HIST_DT = 0.5, HIST_N = 13;
  // ---------- Langages : effets propres aux créatures ----------
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
    if (c.t === 'gardien') { GD.hurt(c, dmg, source); return; }
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

  // ---------- Spécification d'un sceau au lancer ----------
  // le Maître d'un élément paie moins cher ses sceaux
  // ---------- Filtres de matière ----------
  // ---------- Cibles et marques ----------
  // la créature visée : d'abord celles qu'on voit (rien de solide entre elles et nous), hostiles avant les autres
  // ---------- Contre-sort ----------
  // ---------- Enchaînements ----------
  // Éclatement complet : chaque effet, la fusion, l'écho, les sous-sceaux
  // ---------- Encres spéciales ----------
  function groundBelow(x, y) { for (let yy = y; yy < L.h; yy += CS) if (Sim.solidAt(x, yy)) return yy - (yy % CS); return null; }

  // ---------- Lancer un sceau ----------
  // Lance un sceau depuis un point (joueur ou sous-sceau)
  // ---------- Déclencheur Maintenu : le sort vit tant qu'on tient le clic ----------

  // ---------- Esprit, Lien, Portails ----------
  function controlCreature(c, t) {
    if (c.t === 'gardien') { msg('Son esprit est bien trop vaste pour le tien.', 'warn'); GD.sort(c, 'esprit', { power: 1, k: 0, burst: true }); return; }
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
    if (o.t === 'stele') return true;
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
      case 'stele': return it.o.style === 'cloche' ? 'Examiner le carillon' : 'Examiner la stèle';
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
      case 'stele': { const o = it.o; Son.sfx('click'); if (o.grave) { msg((o.nom || 'La stèle') + ' est éveillée' + (o.par ? ' par ' + nomFusion(o.par) : '') + '.'); break; } msg((o.nom || 'Une stèle') + '. ' + (o.indice ? o.indice + ' ' : '') + 'Elle attend ' + (o.veut || []).map(nomFusion).join(', ou ') + '.'); evt('stele_lue'); break; }
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
    GD.majTirs(dt);
    retenir();
    if (Sim.ventVif) {
      const pousse = (e, k) => { const [vx, vy] = Sim.ventAt(e.x + e.w / 2, e.y + e.h / 2); if (Math.abs(vx) + Math.abs(vy) < 0.25) return; e.vx += vx * k * dt / masse(e); e.vy += vy * k * 0.7 * dt / masse(e); };
      for (const c of st.crs) if (c.hp > 0 && !c.carried && masse(c) < 2) pousse(c, 900);
      for (const o of st.objs) if (o.dyn && !o.mort && !o.carried) pousse(o, 700);
      pousse(p, p.sta.glide > 0 ? 700 : 260);
      for (const s of st.sp) if (s.k === 'proj' && !s.tenu) { const [vx, vy] = Sim.ventAt(s.x, s.y); s.vx += vx * 150 * dt; s.vy += vy * 150 * dt; }
    }
    // la brise du temps qu'il fait
    { const m = st.meteo && st.meteo.type; if (!st.briseDir || Math.random() < dt / 90) st.briseDir = Math.random() < 0.5 ? -1 : 1; const cible = m === 'orage' ? 0.55 : m === 'pluie' || m === 'neige' ? 0.22 : 0; Sim.brise += ((cible * st.briseDir) - Sim.brise) * Math.min(1, dt * 0.3); if (Math.abs(Sim.brise) < 0.02 && !cible) Sim.brise = 0; }
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


  // impact d'un projectile selon son déclencheur ; ent : créature touchée (pour coller la commande)
  // ---------- Prise : saisir et lancer la matière ----------
  // un clic pendant qu'on tient une prise la lance
  // ---------- Familiers : chacun sa créature, son allure, son coup ----------
  // le vent se voit : de longs traits d'encre qui filent dans son sens
  // ---------- Ordres aux familiers ----------
  function ev2(o, cle, per) { o.acc = o.acc || {}; o.acc[cle] = (o.acc[cle] || 0) + 1 / 60; if (o.acc[cle] >= per) { o.acc[cle] = 0; return true; } return false; }
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
  // calques précalculés : dégradé de profondeur et tache de lumière




  function objets() { return st ? st.objs : []; }
  function toWorld(mx, my) { return { x: mx + st.cam.x, y: my + st.cam.y }; }
  function state() { return st; }
  function level() { return L; }
  function throwCarried(aim) { if (st.p.carry) drop(aim); }

  return { build, ensure, reset, update, draw, castSeal, usePotion, useLiquid, interact, throwCarried, toWorld, state, level, drawApprenti, respawn, serialize, releaseControl, gridEffectOn, relacher, objets, detoner, lancerPrise, dig, saison, _effet: (...a) => applyEffect(...a), get phen() { return PH; }, get gardiens() { return GD; }, ordonner };
})();
