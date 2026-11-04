'use strict';
// ---------- Sorts : lancer, voler, éclater, saisir, boucliers ----------
// Extrait de world.js (outils/extraire.js) : le monde lui passe un contexte W de getters vers son état et ses fonctions.
function creerSorts(W) {
  const { TAU, INK, clamp, lerp, dist } = U;
  const CS = Sim.CS, M = Sim.M, P = Sim.P;
  function capRepetitions() { const R = W.st.sp.filter((q) => q.k === 'repeat' && !q.mort); if (R.length >= 24) R[0].mort = true; }
  let castSeq = 0;
  const PRIM = ['tenu', 'immediat', 'contact', 'retarde', 'commande', 'proximite'];
  function couleurLg(core, lg) { if (core === 'feu' && lg.feu) return lg.feu >= 2 ? '#4a86e0' : '#f0d070'; if (core === 'foudre' && lg.foudre >= 2) return '#b070e0'; return W.colorOf(core); }
  function maitreMul(seal) { const M2 = (W.game && W.game.progress.maitrise) || {}; const els = [seal.core, seal.taille !== 'petit' ? seal.core2 : null].filter(Boolean); return els.length && els.every((e) => DATA.LANGAGES[e] && DATA.niveauMaitrise(M2[e] || 0) >= 3) ? 0.8 : 1; }
  function chainOk(seal) { return seal.shape === 'projectile'; }
  function makeSpec(seal, depth = 0, charge = 0) {
    const prm = Seal.params(seal);
    if (charge > 0) { prm.power *= 1 + 0.8 * charge; prm.range *= 1 + 0.5 * charge; prm.size *= 1 + 0.4 * charge; prm.duration *= 1 + 0.3 * charge; }
    let cores = Seal.effets(seal);
    for (const e in prm.asp) for (const A of prm.asp[e]) if (A.n > 1) { prm.lg[A.devient] = 2; prm.power *= 1.3; }
    const effets0 = cores.slice();
    if (prm.inverse) { prm.gInv = cores.includes('gravite'); cores = cores.map((c) => (c === 'gravite' ? c : DATA.INVERSE[c] || c)); }
    else if (prm.invEss && prm.invEss.length) { cores = cores.map((c) => (prm.invEss.includes(c) && c !== 'gravite' ? DATA.INVERSE[c] || c : c)); if (prm.invEss.includes('gravite')) prm.gInv = true; }
    // un sceau bancal : la puissance vacille d'un sort à l'autre
    if (Seal.equilibre(seal).etat === 'bancal') prm.power *= 0.8 + Math.random() * 0.4;
    const lg = prm.lg || {};
    if (lg.gravite && cores.includes('gravite')) { prm.size *= 1 + 0.3 * lg.gravite; prm.power *= 1 + 0.4 * lg.gravite; }
    const combo = !prm.inverse && !(prm.invEss && prm.invEss.length) ? DATA.comboCle(effets0) : null;
    const trs = Seal.triggers(seal);
    const proj = seal.shape === 'projectile' || seal.shape === 'chaine';
    const trig = trs.find((t) => PRIM.includes(t)) || (trs.includes('repetition') && proj ? 'contact' : 'immediat');
    const big = seal.taille !== 'petit';
    return { cores, prm, trig, subs: depth < 2 ? Seal.subs(seal) : [], combo, color: couleurLg(cores[0], lg), chaud: cores.includes('feu') ? lg.feu || 0 : 0, core: cores[0], depth, nom: Seal.nom(seal),
      repeat: trs.includes('repetition') ? (seal.periode || 2) : 0, expire: trs.includes('expiration'), delai: seal.delai || 2,
      filtre: big ? seal.filtre || null : null, cible: big ? seal.cible || 'souris' : 'souris', castId: ++castSeq, shape: seal.shape, seal, charge };
  }
  const filtreSets = {};
  function filtreSet(f) { if (!filtreSets[f]) filtreSets[f] = new Set((DATA.FILTRES[f] ? DATA.FILTRES[f].mats : []).map((n) => M[n])); return filtreSets[f]; }
  function filtreTouche(f, x, y, r) {
    if (f === 'creature') return W.st.crs.find((c) => c.hp > 0 && c.t !== 'familier' && U.circleRect(x, y, r, c)) || null;
    if (f === 'objet') return W.st.objs.find((o) => !o.mort && OBJ_CIBLES.includes(o.t) && U.circleRect(x, y, r, o)) || null;
    const set = filtreSet(f); let hit = null;
    Sim.forRadius(x, y, r, (cx, cy, i, m) => { if (!hit && set.has(m)) hit = { cell: true }; });
    return hit;
  }
  const OBJ_CIBLES = ['brasier', 'lampe', 'levier', 'moulin', 'roue', 'caisse', 'rocher', 'torche', 'graine', 'mannequin'];
  function objetProche(x, y, R = 520) { let best = null, bd = R; for (const o of W.st.objs) { if (o.mort || o.carried || !OBJ_CIBLES.includes(o.t)) continue; const d = dist(x, y, o.x + o.w / 2, o.y + o.h / 2); if (d < bd) { bd = d; best = o; } } return best; }
  function filtreCompte(f, x, y, r) { if (f === 'objet') return W.st.objs.filter((o) => !o.mort && OBJ_CIBLES.includes(o.t) && U.circleRect(x, y, r, o)).length; if (f === 'creature') return W.st.crs.filter((c) => c.hp > 0 && U.circleRect(x, y, r, c)).length; const set = filtreSet(f); let n = 0; Sim.forRadius(x, y, r, (cx, cy, i, m) => { if (set.has(m)) n++; }); return n; }
  function creatureProche(x, y, R = 520) {
    const vue = (c) => { const cx = c.x + c.w / 2, cy = c.y + c.h / 2, d = dist(x, y, cx, cy) || 1; const h = Sim.raycast(x, y, (cx - x) / d, (cy - y) / d, d); return !h || h.t > d - Math.max(c.w, c.h) * 0.6; };
    const choisir = (filtre) => { let best = null, bd = R; for (const c of W.st.crs) { if (c.hp <= 0 || c.sta.tame || c.t === 'familier' || c.controlled || !filtre(c)) continue; const d = dist(x, y, c.x + c.w / 2, c.y + c.h / 2); if (d < bd) { bd = d; best = c; } } return best; };
    const hostile = (c) => { const sp = DATA.ESPECES[c.t]; return !(sp && !sp.hostile && c.generique); };
    return choisir((c) => hostile(c) && vue(c)) || choisir(vue) || choisir(hostile) || choisir(() => true);
  }
  function posMarque(mq) { return mq.ent ? (mq.ent.hp > 0 && !mq.ent.mort ? { x: mq.ent.x + mq.ent.w / 2, y: mq.ent.y + mq.ent.h / 2 } : null) : { x: mq.x, y: mq.y }; }
  function marqueRecente() { for (let i = W.st.marques.length - 1; i >= 0; i--) { const q = posMarque(W.st.marques[i]); if (q) return { pos: q, mq: W.st.marques[i] }; } return null; }
  function placeMarque(x, y, rad) {
    let ent = null, bd = rad + 10;
    for (const c of W.st.crs) if (c.hp > 0) { const d = dist(x, y, c.x + c.w / 2, c.y + c.h / 2); if (d < bd) { bd = d; ent = c; } }
    W.st.marques.push(ent ? { ent, t: 0 } : { x, y, t: 0 });
    while (W.st.marques.length > 3) W.st.marques.shift();
    W.part(x, y, '#e0b050', 12, 60, 0.8, 2, 0, 'spark'); Son.sfx('pickup');
  }
  function enchainement(spec, x, y, r) {
    const prev = W.st.lastBurst; const core = spec.cores[0];
    W.st.lastBurst = { core, x, y, t: W.time, castId: spec.castId };
    if (!prev || prev.castId === spec.castId || W.time - prev.t > 1 || dist(prev.x, prev.y, x, y) > 150) return;
    const key = prev.core + '>' + core; const E = DATA.ENCHAINEMENTS[key]; if (!E) return;
    W.st.lastBurst = null;
    W.st.sp.push({ k: 'label', x, y: y - 50, txt: E.nom, life: 1.8, max: 1.8 });
    if (!W.game.progress.enchainements.includes(key)) W.msg('✦ Enchaînement découvert : ' + E.nom + '. ' + E.desc, 'unlock');
    W.evt('enchainement', key);
    const R = Math.max(r, 60);
    switch (key) {
      case 'eau>froid': for (const c of W.st.crs) if (c.hp > 0 && dist(x, y, c.x + c.w / 2, c.y + c.h / 2) < R * 2) { c.sta.stun = Math.max(c.sta.stun, 6); c.vx = 0; Sim.forRadius(c.x + c.w / 2, c.y + c.h, c.w * 0.7, (cx, cy, i, m) => { if (m === M.AIR || m === M.EAU) Sim.set(cx, cy, M.GLACE); }); } break;
      case 'feu>vent': Sim.forRadius(x, y, R * 2.6, (cx, cy, i, m) => { if ((W.FLAM(m) && Sim.aux[i] === 0 && Math.random() < 0.3)) { Sim.aux[i] = P[m].burn; Sim.touch(i); } else if (m === M.HUILE && Math.random() < 0.5) Sim.set(cx, cy, M.FEU, 30); }); break;
      case 'terre>force': { const aim = W.toWorld(W.game.inp.mouse.x, W.game.inp.mouse.y); const o = W.makeObj({ t: 'rocher', x: x - 28, y: y - 70 }); let dx = aim.x - x, dy = aim.y - y; const d = Math.hypot(dx, dy) || 1; o.vx = dx / d * 760; o.vy = dy / d * 760 - 150; o.boulet = 1.5; W.st.objs.push(o); W.unstick(o); break; }
      case 'eau>foudre': Sim.forRadius(x, y, R * 3, (cx, cy, i, m) => { if (P[m].cond) { Sim.elec[i] = 150; Sim.touch(i); } }); for (const c of W.st.crs) if (c.hp > 0 && dist(x, y, c.x, c.y) < R * 3 && (c.sta.wet > 0 || W.liquidOf(c))) { W.hurt(c, 3); c.sta.stun = Math.max(c.sta.stun, 3); } W.st.flash = 0.08; break;
      case 'lumiere>ombre': for (const c of W.st.crs) if (c.hp > 0 && dist(x, y, c.x, c.y) < R * 4) c.sta.sleep = Math.max(c.sta.sleep, 10); W.st.flash = 0.1; break;
      case 'froid>feu': Sim.forRadius(x, y, R * 1.2, (cx, cy, i, m) => { if ((m === M.PIERRE || m === M.OBSIDIENNE) && Math.random() < 0.6) Sim.set(cx, cy, M.SABLE); }); for (const o of W.st.objs) if (o.t === 'rocher' && !o.mort && dist(x, y, o.x + o.w / 2, o.y + o.h / 2) < R * 1.8) { o.mort = true; W.dropPickup('poussiere', o.x + o.w / 2, o.y); } break;
      case 'vie>eau': for (let k = 0; k < 4; k++) W.gridEffect('vie', x, y, R * 2.2, spec.prm, true, 1); break;
      case 'gravite>terre': Sim.forRadius(x, y - R, R * 2, (cx, cy, i, m) => { if ((m === M.PIERRE || m === M.TERRE) && (cy + 0.5) * CS < y && Math.random() < 0.5) Sim.set(cx, cy, M.SABLE); }); W.st.shake = 0.6; break;
      case 'vent>vent': for (const b of [...W.st.crs, ...W.st.objs.filter((o) => o.dyn && !o.carried)]) { const bx = b.x + b.w / 2, by = b.y + b.h / 2, d = dist(x, y, bx, by); if (d < R * 3.5 && d > 1) { b.vx += (bx - x) / d * 900; b.vy += (by - y) / d * 600 - 250; } } break;
      case 'foudre>foudre': { W.st.sp.push({ k: 'beam', core: 'foudre', x1: prev.x, y1: prev.y, x2: x, y2: y, life: 0.5, max: 0.5, color: '#e0c43a', w: 8 }); const L2 = dist(prev.x, prev.y, x, y); for (let t = 0; t <= L2; t += 10) { const px = prev.x + (x - prev.x) * t / (L2 || 1), py = prev.y + (y - prev.y) * t / (L2 || 1); for (const c of W.st.crs) if (c.hp > 0 && U.circleRect(px, py, 14, c)) { W.hurt(c, 1.5); c.sta.stun = Math.max(c.sta.stun, 2); } } Son.sfx('burst', 'foudre'); break; }
    }
  }
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
      case 'encre_braise': W.applyEffect('feu', x, y, r * 0.8, pr, 'burst', o2); break;
      case 'encre_givre': W.applyEffect('froid', x, y, r * 0.9, pr, 'burst', o2); for (const c of W.st.crs) if (c.hp > 0 && U.circleRect(x, y, r, c)) c.sta.lent = Math.max(c.sta.lent || 0, 4); break;
      case 'encre_ambre': for (const c of W.st.crs) if (c.hp > 0 && c.t !== 'familier' && U.circleRect(x, y, r, c)) { c.sta.lent = Math.max(c.sta.lent || 0, 6); c.sta.stun = Math.max(c.sta.stun, 1); } W.part(x, y, '#d8a03a', 12, 80, 0.9, 3, 300, 'goutte'); break;
      case 'encre_chantante': W.applyEffect('son', x, y, r * 1.2, pr, 'burst', o2); break;
      case 'encre_pollen': W.applyEffect('vie', x, y, r, pr, 'burst', o2); { const p = W.st.p; p.hp = Math.min(p.hpMax, p.hp + 0.5); } break;
    }
    W.part(x, y, spec.encreC || '#e0b050', 10, 130, 0.6, 2, 0, 'etincelle');
  }
  function gerbe(spec, x, y) {
    const prm2 = { ...spec.prm, gerbe: 0, size: (spec.prm.size || 1) * 0.55, power: (spec.prm.power || 1) * 0.6, traj: null, percant: false };
    const spec2 = { ...spec, prm: prm2, repeat: 0, expire: false, subs: [], combo: null, depth: (spec.depth || 0) + 1, player: false, encre: null };
    for (let i = 0; i < 5; i++) { const a = -Math.PI / 2 + (i - 2) * 0.55; W.st.sp.push({ k: 'proj', spec: spec2, core: spec.core, x, y: y - 6, vx: Math.cos(a) * 330, vy: Math.sin(a) * 330, r: 5, prm: prm2, trig: 'contact', bounces: 0, life: 0.9, grav: 600, hits: new Set(), color: spec.color, trail: 0, chain: 0, petit: true, off: 0, ph: 0 }); }
  }
  function doBurst(spec, x, y, r, opts = {}, dir = null) {
    if (spec.prm.gerbe && !opts.noGerbe && (spec.depth || 0) < 2) gerbe(spec, x, y);
    if (spec.prm.matiere && !opts.noMatiere && !opts.ent && spec.shape !== 'projectile' && spec.shape !== 'chaine' && spec.shape !== 'trait') W.matiereCercle(spec, x, y, r * 0.7);
    const pm = spec.cores.length > 1 ? 0.85 : 1;
    if (spec.player && !opts.noCombo && spec.depth === 0) enchainement(spec, x, y, r);
    if (spec.repeat && !opts.noRepeat) capRepetitions();
    if (spec.repeat && !opts.noRepeat) W.st.sp.push({ k: 'repeat', spec, x, y, r, ent: opts.ent || null, opts: { ...opts, noRepeat: true, noExpire: true, noEcho: true, noCombo: true }, t: spec.repeat, max: spec.repeat, left: clamp(Math.round(8 * spec.prm.duration / spec.repeat), 2, 8) });
    if (spec.expire && !opts.noExpire) { const T = (spec.repeat ? spec.repeat * clamp(Math.round(8 * spec.prm.duration / spec.repeat), 2, 8) : 0) + 4 * spec.prm.duration * (1 + (spec.prm.persist || 0)); W.st.sp.push({ k: 'expire', spec, x, y, r, t: T, max: T }); }
    // une fusion nommée fait naître son phénomène à la place des deux effets de base
    if (!spec.combo) for (const core of spec.cores) W.applyEffect(core, x, y, r, { ...spec.prm, power: spec.prm.power * pm }, 'burst', opts);
    if (spec.encre && !opts.noEncre) encreBurst(spec, x, y, r);
    if (spec.combo && !opts.noCombo) W.PH.deployer(spec, x, y, r, opts, dir);
    if (spec.prm.echo > 0 && !opts.noEcho) W.st.sp.push({ k: 'echo', spec, x, y, r, opts: { ...opts, noEcho: true }, t: 0.5, left: spec.prm.echo });
    for (const sub of spec.subs) launch(sub, { x, y }, { x: x + (dir ? dir.x : 0) * 100, y: y + (dir ? dir.y : -1) * 100 }, { depth: spec.depth + 1 });
  }
  function doContinuous(spec, x, y, r, dt, opts = {}) {
    for (const core of spec.cores) W.applyEffect(core, x, y, r, { ...spec.prm, power: spec.prm.power * 0.5 }, dt, opts);
  }
  function castSeal(seal, aim, gratuit, charge = 0, hand = 'R', o = {}) {
    const p = W.st.p;
    if (!p.gestes) p.gestes = { R: null, L: null };
    if (p.gestes[hand]) return false;
    let encre = null;
    if (seal.encre && DATA.ENCRES[seal.encre]) { if (((W.game.inv.encres || {})[seal.encre] || 0) > 0) encre = seal.encre; else if (!gratuit) W.msg('Plus d\'' + DATA.ENCRES[seal.encre].nom.toLowerCase() + ' : le sceau s\'écrit à l\'encre ordinaire.', 'warn'); }
    const cost = gratuit ? 0 : Math.max(1, Math.round(Seal.cost(seal) * (W.game.opt ? W.game.opt.cout : 1) * (1 + charge) * maitreMul(seal) * (encre === 'encre_or' ? 0.6 : 1)));
    if (p.ink < cost) { W.msg('Plus assez d\'encre (' + Math.floor(p.ink) + '/' + cost + ').', 'warn'); Son.sfx('fail'); return false; }
    p.ink -= cost;
    if (gratuit) W.part(p.x + p.w / 2, p.y + p.h * 0.4, '#efe3c4', 8, 40, 0.6, 3, 60);
    const pcx = p.x + p.w / 2, pcy = p.y + p.h * 0.45;
    if (!seal.core) { W.part(pcx, pcy - 20, '#777', 14, 50, 1, 4); Son.sfx('fizzle'); W.msg('Pfft. Un pétard de fumée grise. Il manque un glyphe d\'effet.'); p.ink = Math.min(p.inkMax, p.ink + cost - 1); return true; }
    if (!seal.shape) { W.applyEffect(seal.core, pcx, pcy, 45, { ...Seal.params(seal), power: 0.5 }, 'burst', { noPlayer: seal.core !== 'feu' }); W.msg('Sans forme, l\'effet se répand mollement autour de toi.'); return true; }
    if (seal.core === 'terre' || seal.core2 === 'terre') W.evt('terre');
    if (Seal.triggers(seal).includes('retarde')) W.evt('retarde');
    // tracé déjà fait en tenant le clic (o.sansGeste) : le sort part aussitôt
    const gt = o.sansGeste ? 0.001 : Seal.geste(seal) * (1 + charge * 0.5);
    if (encre) { W.game.inv.encres[encre]--; if (W.game.inv.encres[encre] === 0) W.msg('C\'était la dernière goutte d\'' + DATA.ENCRES[encre].nom.toLowerCase() + '.'); }
    p.gestes[hand] = { seal, aim: { x: aim.x, y: aim.y }, t: gt, max: gt, color: encre ? DATA.ENCRES[encre].couleur : W.colorOf(seal.core), charge, hand, encre, cost };
    if (charge > 0.6) W.msg('Sort chargé : ' + Math.round(100 + charge * 80) + ' % de puissance.');
    W.evt('sort', seal);
    return true;
  }
  let fratries = 0;
  function launch(seal, origin, aim, o = {}) {
    if (!seal.core || !seal.shape) return;
    // un trait relie le second déclencheur à une essence : deux sorts, chacun son déclencheur
    // les deux moitiés partent ensemble sans se heurter (fratrie)
    if (!o.scinde && Seal.enDeuxTemps(seal)) { const [A, B] = Seal.scinder(seal), fratrie = ++fratries; launch(A, origin, aim, { ...o, scinde: true, fratrie }); launch(B, origin, aim, { ...o, scinde: true, fratrie }); return; }
    const p = W.st.p;
    const spec = makeSpec(seal, o.depth || 0, o.charge || 0);
    spec.player = !!o.player; if (o.fratrie) spec.fratrie = o.fratrie;
    if (o.encre) appliquerEncre(spec, o.encre);
    const prm = spec.prm, trig = spec.trig, C = spec.color;
    const ox = origin.x, oy = origin.y;
    // ciblage
    let homing = null, horsPortee = false;
    if (spec.cible === 'creature' && seal.shape !== 'soi') { const c = creatureProche(ox, oy); if (c) { aim = { x: c.x + c.w / 2, y: c.y + c.h / 2 }; homing = c; horsPortee = true; } else if (o.player) W.msg('Aucune créature à cibler : le sort part vers la souris.'); }
    else if (spec.cible === 'objet' && seal.shape !== 'soi') { const ob = objetProche(aim.x, aim.y); if (ob) { aim = { x: ob.x + ob.w / 2, y: ob.y + ob.h / 2 }; homing = ob; horsPortee = true; } else if (o.player) W.msg('Aucun objet près de la souris : le sort y part tout droit.'); }
    else if (spec.cible === 'marque' && seal.shape !== 'soi') { const m = marqueRecente(); if (m) { aim = m.pos; homing = m.mq.ent || { x: m.pos.x - 1, y: m.pos.y - 1, w: 2, h: 2, hp: 1, point: true }; horsPortee = true; } else if (o.player) W.msg('Aucune marque posée : le sort part vers la souris.'); }
    let dx = aim.x - ox, dy = aim.y - oy; const d = Math.hypot(dx, dy) || 1; dx /= d; dy /= d;
    const portee = (base) => (horsPortee ? d : Math.min(d, base));
    if (o.tenu && o.player) { lancerTenu(spec, seal, ox, oy, aim, dx, dy, d, o); return; }
    // sur commande : formes posées
    if (trig === 'commande' && !['projectile', 'chaine', 'soi', 'trait', 'zone', 'mur'].includes(seal.shape)) {
      const dd = portee(260 * prm.range); W.st.sp.push({ k: 'attente', spec, x: ox + dx * dd, y: oy + dy * dd, life: 40, relance: true });
      if (o.player) W.msg('Le sort attend. Touche F pour le libérer.'); return;
    }
    if (o.player) Son.sfx('cast', spec.core);
    const canal = prm.canalise && o.player;
    if (canal && seal.shape !== 'projectile' && seal.shape !== 'soi' && seal.shape !== 'chaine' && seal.shape !== 'prise') {
      W.st.sp.push({ k: 'canal', spec, t: 0, tick: 0, range: 260 * prm.range, r: 50 * prm.size, cost: Math.max(1, Seal.cost(seal) * 0.25) });
      W.msg('Maintiens le clic pour canaliser.');
      return;
    }
    switch (seal.shape) {
      case 'projectile': case 'chaine': {
        if (prm.rafale && !o.suiteRafale) W.st.sp.push({ k: 'rafale', seal, o: { ...o, suiteRafale: true }, origin, aim: { ...aim }, left: prm.rafale > 1 ? 4 : 2, t: 0.12 });
        if (prm.orbite && o.player) {
          for (let i = 0; i < 3; i++) W.st.sp.push({ k: 'orbit', spec, a: (i / 3) * TAU, r: 10 * prm.size, life: 6 * prm.duration, hits: new Map(), color: C });
          break;
        }
        const n = 1 + prm.extra;
        for (let i = 0; i < n; i++) {
          const spread = n > 1 ? (i - (n - 1) / 2) * 0.22 : 0;
          const a = Math.atan2(dy, dx) + spread;
          const sp = (spec.core === 'foudre' ? 800 : 520) * prm.speed;
          const floats = ['lumiere', 'vent', 'ombre', 'foudre', 'gravite', 'son', 'esprit', 'temps', 'metamorphose', 'rembobinage'].includes(spec.core) || prm.traj === 'boomerang' || prm.traj === 'rasesol';
          W.st.sp.push({ k: 'proj', spec, core: spec.core, x: ox + Math.cos(a) * 20, y: oy + Math.sin(a) * 20, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp,
            r: 8 * prm.size, prm, trig, bounces: prm.bounces, life: 1.1 * prm.range * (prm.traj === 'boomerang' ? 2.2 : prm.traj === 'rasesol' ? 1.7 : 1), grav: prm.traj === 'boomerang' || prm.traj === 'rasesol' ? 0 : floats ? 40 : 420 / prm.speed, traj: chainOk(seal) ? prm.traj : null, off: 0, ph: 0, hits: new Set(), color: C, trail: 0, chaud: spec.chaud || 0,
            chain: seal.shape === 'chaine' ? 3 + (prm.extra ? 2 : 0) : 0, guide: prm.teleguide && o.player && !homing, homing });
          if (spec.filtre) W.st.sp[W.st.sp.length - 1].grav = 0;
          if (prm.matiere) { const q = W.st.sp[W.st.sp.length - 1], m = W.matiereDe(spec); if (m != null && m !== M.AIR) { q.matiere = m; q.vx *= 1.25; q.vy *= 1.25; q.grav = Math.min(q.grav, 150); } }
          if (prm.traj === 'cloche' && seal.shape === 'projectile') { const q = W.st.sp[W.st.sp.length - 1]; const D = Math.min(d, 420 * prm.range), tx = ox + dx * D + (n > 1 ? (i - (n - 1) / 2) * 50 : 0), ty = oy + dy * D; const g = 900, Hc = Math.max(200, Math.abs(tx - ox) * 0.7) + Math.max(0, q.y - ty), T = clamp(Math.sqrt(2 * Hc / g) + Math.sqrt(2 * Math.max(20, Hc - (q.y - ty)) / g), 0.6, 2.2); q.x = ox; q.y = oy - 10; q.vx = (tx - ox) / T; q.vy = (ty - q.y - 0.5 * g * T * T) / T; q.grav = g; q.life = T + 0.8; }
          if (homing) { const q = W.st.sp[W.st.sp.length - 1]; q.life *= spec.cible === 'marque' ? 4 : 2; q.grav = 0; }
        }
        break;
      }
      case 'soi':
        if (!o.player) { doBurst(spec, ox, oy, 60 * prm.size, { noPlayer: true }); break; }
        if (trig === 'immediat') selfCast(spec, aim);
        else if (trig === 'contact') { p.trap = { spec }; W.msg('Le sceau attend sur ta peau. Il éclatera au premier contact.'); }
        else if (trig === 'commande') { W.st.sp.push({ k: 'attente', spec, self: true, aim: { ...aim }, life: 40 }); W.msg('Le sceau attend sur toi. Touche F pour le libérer.'); }
        else { p.selfTimer = { spec, t: spec.delai, aim: { ...aim } }; W.msg('Le sceau s\'enroule autour de toi... ' + spec.delai + ' s.'); }
        break;
      case 'zone': case 'mur': {
        const range = 260 * prm.range; const dd = portee(range); const n = 1 + prm.extra;
        for (let i = 0; i < n; i++) {
          const off = n > 1 ? (i - (n - 1) / 2) * 90 * prm.size : 0;
          const tx = ox + dx * dd + -dy * off, ty = oy + dy * dd + dx * off;
          if (trig === 'commande') { W.st.sp.push({ k: 'attente', spec, x: tx, y: ty, life: 40, mur: seal.shape === 'mur', dir: { x: dx, y: dy } }); continue; }
          if (seal.shape === 'mur') {
            const mw = 30 * prm.size * (prm.dimL || 1), mh = 180 * prm.size * (prm.dimH || 1), rect = { x0: tx - mw / 2, x1: tx + mw / 2, y0: ty - mh / 2, y1: ty + mh / 2 };
            if (trig === 'immediat' && spec.combo) W.PH.deployer(spec, tx, ty, mw / 2, { rect, mur: true }, { x: dx, y: dy });
            if (trig === 'immediat' && !spec.combo && W.champForme(spec, rect, { x: dx, y: dy })) continue;
            if (trig === 'immediat' && prm.matiere) W.matiereRect(spec, rect);
            const pts = W.murPoints(tx, ty, mw, mh);
            pts.forEach((q, k) => { const pr = k === Math.floor(pts.length / 2); if (trig === 'immediat') doBurst(spec, q.x, q.y, q.r, { mur: true, noMatiere: true, noField: !pr, noEcho: !pr, noRepeat: !pr, noExpire: !pr, noCombo: !pr }); else W.st.sp.push({ k: 'timer', spec, x: q.x, y: q.y, r: q.r, t: trig === 'retarde' ? spec.delai : 0.1 + Math.abs(k - pts.length / 2) * 0.05, max: trig === 'retarde' ? spec.delai : 0.5, color: C, noField: !pr, mur: true }); });
          } else {
            const r = 70 * prm.size * (prm.dimL || 1);
            if (trig === 'immediat') doBurst(spec, tx, ty, r, {}, { x: dx, y: dy });
            else if (trig === 'contact' || trig === 'proximite') W.st.sp.push({ k: 'trap', prox: trig === 'proximite', spec, x: tx, y: ty, r: r * (trig === 'proximite' ? 1.3 : 0.85), prm, life: 20 * prm.duration, color: C, t: 0, base: spec.filtre ? filtreCompte(spec.filtre, tx, ty, r * 0.6) : 0, chk: 0 });
            else W.st.sp.push({ k: 'timer', spec, x: tx, y: ty, r, t: spec.delai, max: spec.delai, color: C });
          }
        }
        if (trig === 'commande' && o.player) W.msg('Le sort attend. Touche F pour le libérer.');
        break;
      }
      case 'trait':
        if (prm.rafale && !o.suiteRafale && trig !== 'retarde' && trig !== 'commande') W.st.sp.push({ k: 'rafale', seal, o: { ...o, suiteRafale: true }, origin, aim: { ...aim }, left: prm.rafale > 1 ? 4 : 2, t: 0.15 });
        if (trig === 'retarde') { W.st.sp.push({ k: 'beamtimer', spec, x: ox, y: oy, dx, dy, prm, t: spec.delai, max: spec.delai, color: C }); if (o.player) W.msg('Le trait se charge...'); }
        else if (trig === 'commande') { W.st.sp.push({ k: 'attente', spec, trait: true, self: true, life: 40 }); if (o.player) W.msg('Le trait attend. Touche F pour le tirer vers la souris.'); }
        else { const n = 1 + prm.extra, a0 = Math.atan2(dy, dx); for (let i = 0; i < n; i++) { const a = a0 + (n > 1 ? (i - (n - 1) / 2) * 0.18 : 0); fireBeam(spec, ox, oy, Math.cos(a), Math.sin(a), trig); } }
        break;
      case 'aura': if (!spec.combo) W.st.sp.push({ k: 'field', spec, core: spec.core, x: ox, y: oy, r: 70 * prm.size * (prm.dimL || 1), life: 6 * prm.duration, max: 6 * prm.duration, prm, follow: true }); if (spec.combo && o.player) W.PH.deployer(spec, ox, oy, 70 * prm.size, { follow: p }, { x: dx, y: dy }); if (o.player) W.msg('L\'effet t\'enveloppe un moment.'); break;
      case 'prise': {
        const dd = portee(300 * prm.range); const tx = ox + dx * dd, ty = oy + dy * dd;
        saisir(spec, tx, ty, !!o.player);
        break;
      }
      case 'bouclier': W.st.sp.push({ k: 'bouclier', spec, self: !!o.player, x: ox, y: oy, a: Math.atan2(dy, dx), life: 4 * prm.duration, max: 4 * prm.duration, r: 46 * prm.size * (prm.dimL || 1), color: C }); if (o.player) W.msg('Un bouclier de ' + (DATA.CORES[spec.core] || DATA.PSEUDO[spec.core]).nom.toLowerCase() + ' se lève devant toi.'); break;
      case 'totem': { const range = 260 * prm.range; const dd = portee(range); const tx = ox + dx * dd, ty = oy + dy * dd; const g = W.groundBelow(tx, ty); W.st.sp.push({ k: 'totem', spec, x: tx, y: g != null ? g : ty, r: 60 * prm.size * (prm.dimL || 1), life: 20 * prm.duration, max: 20 * prm.duration, t: 0.5, color: C }); break; }
      case 'pluie': { const range = 320 * prm.range; const dd = portee(range); const tx = ox + dx * dd; W.st.sp.push({ k: 'rain', spec, x: tx, w: 120 * prm.size * (prm.dimL || 1), yTop: Math.max(30, oy - 320), life: 3 * prm.duration, t: 0, color: C }); break; }
      case 'objet': {
        const range = 260 * prm.range; const dd = Math.min(d, range); const tx = ox + dx * dd, ty = oy + dy * dd;
        let best = null, bd = 140;
        for (const q of W.st.objs) if ((q.t === 'caisse' || q.t === 'rocher') && !q.mort) { const dq = dist(tx, ty, q.x + q.w / 2, q.y + q.h / 2); if (dq < bd) { bd = dq; best = q; } }
        for (const c of W.st.crs) if (c.hp > 0) { const dq = dist(tx, ty, c.x + c.w / 2, c.y + c.h / 2); if (dq < bd) { bd = dq; best = c; } }
        if (best && spec.combo) W.PH.deployer(spec, best.x + best.w / 2, best.y + best.h / 2, 50 * prm.size, { follow: best }, { x: dx, y: dy });
        if (best && !spec.combo) { best.ench = { spec, t: 15 * prm.duration, tick: 0 }; W.part(best.x + best.w / 2, best.y, C, 12, 60, 0.8, 3, 0, 'spark'); if (o.player) W.msg('L\'objet porte maintenant l\'effet.'); }
        else if (!best && o.player) W.msg('Rien à enchanter par ici.');
        break;
      }
      case 'vague': {
        const sx = ox + (Math.sign(dx) || 1) * 30, g = W.groundBelow(sx, oy - 10);
        W.st.sp.push({ k: 'vague', spec, x: sx, y: g != null ? g : oy + 20, dir: Math.sign(dx) || 1, v: 280 * prm.speed, life: 1.4 * prm.range * (prm.dimL || 1), max: 1.4 * prm.range * (prm.dimL || 1), r: 34 * prm.size * (prm.dimH || 1), color: C, tick: 0 });
        break;
      }
      case 'colonne': {
        const dd = portee(260 * prm.range); const tx = ox + dx * dd, ty = oy + dy * dd; const g = W.groundBelow(tx, ty - 20);
        const cw = 22 * prm.size * (prm.dimL || 1), ch = 200 * prm.size * (prm.dimH || 1), gy0 = g != null ? g : ty, rect = { x0: tx - cw, x1: tx + cw, y0: gy0 - ch, y1: gy0 };
        if (spec.combo) { W.PH.deployer(spec, tx, gy0 - ch / 2, cw, { rect }, { x: dx, y: dy }); break; }
        if (W.champForme(spec, rect, null)) break;
        if (prm.matiere) { W.matiereRect(spec, { x0: tx - cw * 0.6, x1: tx + cw * 0.6, y0: gy0 - ch, y1: gy0 - 1 }); Son.sfx('burst', 'terre'); W.part(tx, gy0, spec.color, 14, 120, 0.6, 3, 300, 'eclat'); break; }
        W.st.sp.push({ k: 'colonne', spec, x: tx, y: gy0, h: ch, w: cw, life: 2 * prm.duration, max: 2 * prm.duration, color: C, tick: 0 });
        break;
      }
      case 'invocation': {
        const esp = DATA.FAMILIERS[seal.core] ? seal.core : 'feu', F = DATA.FAMILIERS[esp], n = 1 + Math.min(2, prm.extra || 0);
        // pas plus de six familiers à la fois : le plus ancien s'en va
        const vieux = W.st.crs.filter((c) => c.t === 'familier' && c.hp > 0); while (vieux.length + n > 6) { const v = vieux.shift(); v.life = 0; }
        for (let i = 0; i < n; i++) {
          const f = W.nouveauFamilier(spec, esp, ox - F.w / 2 + i * 14, oy - F.h - 6, i);
          W.st.crs.push(f); if (spec.combo && i === 0) W.PH.deployer(spec, ox, oy - 30, 30 * prm.size, { follow: f }, { x: dx, y: dy });
        }
        Son.voix(esp);
        if (o.player) { const pg = W.game.progress; if (!pg.familiers) pg.familiers = {}; const neuf = !pg.familiers[esp]; pg.familiers[esp] = (pg.familiers[esp] || 0) + 1; W.msg((neuf ? 'Nouveau familier : ' : '') + F.nom + (n > 1 ? ' (×' + n + ')' : '') + (neuf ? '. ' + F.desc : ' t\'accompagne.')); if (neuf) pg.nouveau = true; }
        break;
      }
    }
  }
  function tientMain(h) { const m = W.game && W.game.inp && W.game.inp.mouse; return !!(m && (h === 'L' ? m.rdown : m.down)); }
  function lancerTenu(spec, seal, ox, oy, aim, dx, dy, d, o) {
    const prm = spec.prm, sz = prm.size || 1, hand = o.tenu;
    const tenu = { hand, drain: Math.max(0.6, Seal.cost(seal) * 0.3), portee: 300 * (prm.range || 1), t: -1 };
    Son.sfx('cast', spec.core);
    const dd = Math.min(d, tenu.portee), tx = ox + dx * dd, ty = oy + dy * dd, dir = { x: dx, y: dy };
    if (spec.combo) {
      let ph = null;
      switch (seal.shape) {
        case 'mur': { const mw = 30 * sz * (prm.dimL || 1), mh = 180 * sz * (prm.dimH || 1); ph = W.PH.deployer(spec, tx, ty, mw / 2, { rect: { x0: tx - mw / 2, x1: tx + mw / 2, y0: ty - mh / 2, y1: ty + mh / 2 }, tenu }, dir); break; }
        case 'colonne': { const g = W.groundBelow(tx, ty - 20), cw = 22 * sz * (prm.dimL || 1), ch = 200 * sz * (prm.dimH || 1), gy0 = g != null ? g : ty; ph = W.PH.deployer(spec, tx, gy0 - ch / 2, cw, { rect: { x0: tx - cw, x1: tx + cw, y0: gy0 - ch, y1: gy0 }, tenu }, dir); break; }
        case 'trait': ph = W.PH.deployer(spec, tx, ty, 30 * sz, { ligne: { x1: ox + dx * 20, y1: oy + dy * 20, x2: tx, y2: ty, w: 14 * sz * (prm.dimL || 1) }, tenu }, dir); break;
        case 'soi': case 'aura': ph = W.PH.deployer(spec, ox, oy, 60 * sz, { follow: W.st.p, tenu }, dir); break;
        case 'projectile': case 'chaine': ph = W.PH.deployer(spec, ox + dx * 40, oy + dy * 40, 50 * sz, { tenu }, dir); break;
        default: ph = W.PH.deployer(spec, tx, ty, 70 * sz, { tenu }, dir);
      }
      if (ph && ph.tenu) W.msg('Tant que tu tiens le clic, ' + DATA.comboInfo(spec.combo).nom.toLowerCase() + ' suit ta souris.');
      return;
    }
    if (seal.shape === 'projectile' || seal.shape === 'chaine') {
      // un projectile tenu : guidé par la souris, il se défait quand on lâche
      const n0 = W.st.sp.length; launch(seal, { x: ox, y: oy }, aim, Object.assign({}, o, { tenu: null }));
      for (let k = n0; k < W.st.sp.length; k++) if (W.st.sp[k].k === 'proj') { const q = W.st.sp[k]; q.tenu = tenu; q.guide = false; q.grav = 0; q.traj = null; }
      return;
    }
    // le reste : l'effet est canalisé là où pointe la souris (ou sur toi), tant qu'on tient
    const soi = seal.shape === 'soi' || seal.shape === 'aura';
    W.st.sp.push({ k: 'canal', spec, t: 0, tick: 0, range: tenu.portee, r: (soi ? 70 : 50) * sz * (seal.shape === 'zone' || seal.shape === 'aura' ? prm.dimL || 1 : 1), cost: tenu.drain, tenu, soi, trait: seal.shape === 'trait' });
  }
  function selfCast(spec, aim, noRepeat) {
    if (!spec.combo) for (const core of spec.cores) W.applySelf(core, spec.prm, aim, spec);
    if (spec.repeat && !noRepeat) capRepetitions();
    if (spec.repeat && !noRepeat) W.st.sp.push({ k: 'repeat', self: true, spec, aim, t: spec.repeat, max: spec.repeat, left: clamp(Math.round(8 * spec.prm.duration / spec.repeat), 2, 8) });
    if (noRepeat) return;
    if (spec.combo) W.PH.deployer(spec, W.st.p.x + W.st.p.w / 2, W.st.p.y + W.st.p.h / 2, 60 * (spec.prm.size || 1), { follow: W.st.p }, aim ? { x: Math.sign(aim.x - W.st.p.x) || 1, y: 0 } : null);
    for (const sub of spec.subs) launch(sub, { x: W.st.p.x + W.st.p.w / 2, y: W.st.p.y + W.st.p.h / 2 }, aim, { depth: spec.depth + 1 });
  }
  function fireBeam(spec, x, y, dx, dy, trig) {
    const prm = spec.prm, C = spec.color, core = spec.core;
    const len = 320 * prm.range * (prm.dimH || 1);
    const sols = W.dynSolids();
    let ex = x, ey = y;
    const touched = new Set();
    for (let t = 0; t < len; t += 5) {
      const px = x + dx * t, py = y + dy * t;
      if (Sim.solidAt(px, py) || sols.some((s) => px >= s.x && px <= s.x + s.w && py >= s.y && py <= s.y + s.h)) { ex = px; ey = py; break; }
      ex = px; ey = py;
      let stop = false;
      for (const c of W.st.crs) if (c.hp > 0 && px >= c.x && px <= c.x + c.w && py >= c.y && py <= c.y + c.h) { touched.add(c); if (trig === 'contact') stop = true; }
      for (const o of W.st.objs) if (!o.mort && o.t !== 'porte' && o.t !== 'pancarte' && px >= o.x && px <= o.x + o.w && py >= o.y && py <= o.y + o.h) { touched.add(o); if (trig === 'contact' && (o.solid || o.t === 'mannequin')) stop = true; }
      if (stop) break;
    }
    W.st.sp.push({ k: 'beam', core, x1: x, y1: y, x2: ex, y2: ey, life: 0.35, max: 0.35, color: C, w: 6 * prm.size * (prm.dimL || 1) });
    if (prm.matiere) W.matiereLigne(spec, x + dx * 24, y + dy * 24, ex, ey, 5 * prm.size * (prm.dimL || 1));
    Son.sfx('cast', core);
    if (spec.combo) W.PH.deployer(spec, ex, ey, 30 * prm.size, { ligne: { x1: x + dx * 20, y1: y + dy * 20, x2: ex, y2: ey, w: 14 * prm.size * (prm.dimL || 1) } }, { x: dx, y: dy });
    if (trig === 'contact') doBurst(spec, ex, ey, 55 * prm.size, { noPlayer: true }, { x: dx, y: dy });
    else {
      if (!spec.combo) for (let t = 10; t < Math.hypot(ex - x, ey - y); t += 14) for (const c of spec.cores) W.gridEffect(c, x + dx * t, y + dy * t, 9 * prm.size * (prm.dimL || 1), { ...prm, power: prm.power * 0.6 }, true, 1);
      if (!spec.combo) for (const e of touched) for (const c of spec.cores) W.applyEffect(c, e.x + e.w / 2, e.y + e.h / 2, Math.max(e.w, e.h) * 0.6, { ...prm, power: prm.power * 0.8 }, 'burst', { noPlayer: true, noField: true, noGrid: true });
      doBurst(spec, ex - dx * 6, ey - dy * 6, 24 * prm.size, { noPlayer: true, noField: core !== 'lumiere' }, { x: dx, y: dy });
    }
  }
  function impactProj(s, ent) {
    const dirv = { x: s.vx / (Math.hypot(s.vx, s.vy) || 1), y: s.vy / (Math.hypot(s.vx, s.vy) || 1) };
    if (s.trig === 'retarde') { s.k = 'timer'; s.t = s.spec.delai; s.max = s.spec.delai; s.r = 60 * s.prm.size; s.vx = 0; s.vy = 0; return; }
    if (s.trig === 'commande') { W.st.sp.push({ k: 'attente', spec: s.spec, x: s.x, y: s.y, ent, life: 40 }); s.mort = true; return; }
    let rad = 50 * s.prm.size;
    if (s.matiere != null) { const m = s.matiere; W.spec0 = s.spec; W.poserMatiere(m, (put) => Sim.forRadius(s.x - s.vx * 0.01, s.y - s.vy * 0.01, 7 * (s.prm.size || 1), (cx, cy) => { if (Math.random() < 0.7) put(cx, cy); })); W.part(s.x, s.y, P[m].color, 10, 140, 0.6, 2.4, 700, 'eclat'); }
    if (s.trig === 'proximite' && ent && ent.w) rad = Math.max(rad, dist(s.x, s.y, ent.x + ent.w / 2, ent.y + ent.h / 2) + Math.max(ent.w, ent.h) * 0.3);
    doBurst(s.spec, s.x, s.y, rad, { ent }, dirv); s.mort = true;
  }
  function collision(a, b) {
    const x = (a.x + b.x) / 2, y = (a.y + b.y) / 2;
    const ca = a.spec.cores[0], cb = b.spec.cores[0];
    const key = [ca, cb].sort().join('|'); const nomme = DATA.comboInfo(key);
    const pw = ((a.prm.power + b.prm.power) / 2) * (nomme ? 1.3 : 1.1), r = 60 * Math.max(a.prm.size, b.prm.size);
    for (const core of new Set([ca, cb])) W.applyEffect(core, x, y, r, { ...a.prm, power: pw }, 'burst');
    if (ca !== cb && DATA.comboInfo(key)) W.PH.deployer({ ...a.spec, combo: key, castId: a.spec.castId * 1000 + 7, shape: 'zone' }, x, y, r, {}, { x: Math.sign(a.vx) || 1, y: 0 });
    W.st.sp.push({ k: 'label', x, y: y - 46, txt: 'Collision' + (nomme ? ' : ' + nomme.nom : ''), life: 1.6, max: 1.6 });
    W.st.shake = 0.25; a.mort = true; b.mort = true; W.evt('collision');
  }
  function majBouclier(s, dt) {
    s.life -= dt; if (s.life <= 0 || s.mort) { s.mort = true; finBouclier(s); if (s.spec.expire) doBurst(s.spec, s.x, s.y, s.r, { noExpire: true, noRepeat: true, noCombo: true }); return; }
    const p = W.st.p;
    if (s.self) { s.x = p.x + p.w / 2; s.y = p.y + p.h / 2; const aim = W.toWorld(W.game.inp.mouse.x, W.game.inp.mouse.y); s.a = Math.atan2(aim.y - s.y, aim.x - s.x); }
    const span = 1.05, core = s.spec.core, dur = (core === 'terre' || core === 'metal' || core === 'froid');
    s.tick = (s.tick || 0) - dt;
    if (s.tick <= 0) { s.tick = 0.1; for (let k = -3; k <= 3; k++) { const an = s.a + k * span / 3; doContinuous(s.spec, s.x + Math.cos(an) * s.r, s.y + Math.sin(an) * s.r, 14 * s.spec.prm.size, 0.1, { noPlayer: true, noField: true }); } }
    const dans = (px, py, rin, rout) => { const dx = px - s.x, dy = py - s.y, d = Math.hypot(dx, dy); if (d < rin || d > rout) return false; let da = Math.atan2(dy, dx) - s.a; while (da > Math.PI) da -= TAU; while (da < -Math.PI) da += TAU; return Math.abs(da) <= span; };
    // paroi magique : les matières ne la traversent pas (les êtres, si) ; ce qu'elle chasse est rendu à la fin
    if (!s.ring) { s.ring = new Set(); s.stash = {}; }
    if (!s.plonge && s.self) { let n = 0; Sim.forRadius(s.x, s.y, s.r, (cx, cy, i, m) => { if (P[m].liquid && m !== M.LAVE) n++; }); if (W.liquidOf(p) || n > 20) s.plonge = true; }
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
    for (const b of [...W.st.crs.filter((c) => c.hp > 0 && !c.sta.tame && c.t !== 'familier'), ...W.st.objs.filter((o) => o.dyn && !o.carried && !o.mort)]) {
      const bx = b.x + b.w / 2, by = b.y + b.h / 2;
      if (!dans(bx, by, 0, s.r + Math.max(b.w, b.h) / 2 + 6)) continue;
      const dx = bx - s.x, dy = by - s.y, d = Math.hypot(dx, dy) || 1;
      const f = core === 'vent' ? 900 : dur ? 520 : 380;
      const vr = b.vx * dx / d + b.vy * dy / d;
      if (vr < f * 0.5) { b.vx += dx / d * (f * 0.5 - vr); b.vy += dy / d * (f * 0.5 - vr) - (core === 'vent' ? 120 : 0); }
    }
  }
  const PRISE_EFFET = { [M.EAU]: 'eau', [M.SAUMURE]: 'eau', [M.LAVE]: 'feu', [M.ACIDE]: 'acide', [M.SABLE]: 'terre', [M.TERRE]: 'terre', [M.BOUE]: 'terre', [M.NEIGE]: 'froid', [M.CENDRE]: 'terre', [M.POUDRE]: 'feu', [M.MIEL]: 'vie' };
  function saisir(spec, x, y, joueur) {
    const prm = spec.prm, R = 62 * prm.size, cap = Math.round(240 * prm.power * prm.size * (spec.cores.some((q) => q === 'gravite' || q === 'force') ? 1.3 : 1));
    const mats = {}; let n = 0;
    // on aspire d'abord vers le centre (les cases les plus proches d'abord)
    const cells = []; Sim.forRadius(x, y, R, (cx, cy, i, m) => { const q = P[m]; if ((q.liquid || q.powder || q.gas) && m !== M.BULLE) cells.push([Math.hypot((cx + 0.5) * CS - x, (cy + 0.5) * CS - y), cx, cy, m]); });
    cells.sort((a, b) => a[0] - b[0]);
    for (const [, cx, cy, m] of cells) { if (n >= cap) break; if (P[m].gas) { Sim.set(cx, cy, M.AIR); continue; } mats[m] = (mats[m] || 0) + 1; n++; Sim.set(cx, cy, M.AIR); }
    const ents = [];
    for (const c of W.st.crs) if (c.hp > 0 && !c.carried && c.t !== 'familier' && U.circleRect(x, y, R, c) && (c.t !== 'golem' || prm.power >= 1.5 || spec.cores.some((q) => q === 'gravite' || q === 'force'))) { c.carried = true; c.prise = true; ents.push(c); }
    for (const o of W.st.objs) if (o.dyn && !o.carried && !o.mort && o !== W.st.p.carry && U.circleRect(x, y, R, o)) { o.carried = true; o.prise = true; ents.push(o); }
    if (!n && !ents.length) { W.msg('La prise se referme sur du vide.'); W.part(x, y, spec.color, 10, 60, 0.5, 3, 0, 'glow'); return; }
    for (const e of ents) { e.ox = e.x + e.w / 2 - x; e.oy = e.y + e.h / 2 - y; }
    W.st.sp.push({ k: 'prise', spec, x, y, vx: 0, vy: 0, mats, n, ents, tenue: joueur, life: 10 * prm.duration, t: 0, color: spec.color, hist: [] });
    Son.sfx('cast', 'force'); W.st.shake = Math.min(0.4, 0.1 + n / 800);
    for (let k = 0; k < 18; k++) { const a = Math.random() * TAU, rr = R * (0.6 + Math.random() * 0.6); W.st.parts.push({ x: x + Math.cos(a) * rr, y: y + Math.sin(a) * rr, vx: -Math.cos(a) * rr * 2.5, vy: -Math.sin(a) * rr * 2.5, life: 0.4, max: 0.4, color: spec.color, size: 3, grav: 0, type: 'glow' }); }
    if (joueur) W.msg('Tu tiens ' + (n ? n + ' grains de matière' : '') + (n && ents.length ? ' et ' : '') + (ents.length ? ents.length + ' prise(s)' : '') + '. Clique pour lancer.');
  }
  function rayonPrise(s) { return Math.max(10, Math.sqrt(s.n) * CS * 0.55 + s.ents.length * 6); }
  function majPrise(s, dt) {
    const p = W.st.p; s.t += dt; s.life -= dt;
    if (s.tenue) {
      const aim = W.toWorld(W.game.inp.mouse.x, W.game.inp.mouse.y);
      // laisse : pas plus loin que 380 px de toi
      let tx = aim.x, ty = aim.y; const pcx = p.x + p.w / 2, pcy = p.y + p.h / 2; const d = dist(pcx, pcy, tx, ty); if (d > 380) { tx = pcx + (tx - pcx) / d * 380; ty = pcy + (ty - pcy) / d * 380; }
      const nvx = (tx - s.x) * 9, nvy = (ty - s.y) * 9;
      s.vx = clamp(nvx, -1400, 1400); s.vy = clamp(nvy, -1400, 1400);
      s.x += s.vx * dt; s.y += s.vy * dt;
      s.hist.push([s.vx, s.vy]); if (s.hist.length > 6) s.hist.shift();
      p.ink -= dt * (1 + s.n / 300); if (p.ink <= 0) { p.ink = 0; s.tenue = false; W.msg('Plus d\'encre : la prise t\'échappe.', 'warn'); }
      if (s.life <= 0) { s.tenue = false; W.msg('La prise se relâche.'); }
    } else {
      const g = s.spec.cores.some((q) => q === 'gravite' || q === 'force') ? 450 : 900;
      s.vy += g * dt; s.x += s.vx * dt; s.y += s.vy * dt;
      const R = rayonPrise(s) * 0.6;
      const touche = Sim.solidAt(s.x + Math.sign(s.vx) * R * 0.5, s.y + Math.sign(s.vy) * R * 0.5) || W.st.crs.some((c) => c.hp > 0 && !c.carried && U.circleRect(s.x, s.y, R, c)) || s.y > W.L.h - 10 || s.x < 0 || s.x > W.L.w;
      if (touche || s.t > 6) { ecraserPrise(s); return; }
    }
    // la matière portée suit
    for (const e of s.ents) { if (e.mort || (e.hp !== undefined && e.hp <= 0)) continue; const a = s.t * 2 + (e.seed || 0); const ox = e.ox * 0.4 + Math.cos(a) * 6, oy = e.oy * 0.4 + Math.sin(a) * 6; e.x = s.x + ox - e.w / 2; e.y = s.y + oy - e.h / 2; e.vx = s.vx; e.vy = s.vy; }
    if (Math.random() < 0.5) { const m = +Object.keys(s.mats)[0]; if (!isNaN(m)) W.part(s.x + (Math.random() - 0.5) * rayonPrise(s), s.y + (Math.random() - 0.5) * rayonPrise(s), P[m].color, 1, 20, 0.5, 2, 300, P[m].liquid ? 'goutte' : 'dot'); }
  }
  function lacherEntites(s, vx, vy) {
    for (const e of s.ents) { e.carried = false; e.prise = false; e.vx = vx; e.vy = vy; W.unstick(e); }
    s.ents = [];
  }
  function ecraserPrise(s) {
    s.mort = true;
    const R = rayonPrise(s); const v = Math.hypot(s.vx, s.vy);
    // remonter légèrement hors du solide
    let x = s.x - s.vx / (v || 1) * R * 0.4, y = s.y - s.vy / (v || 1) * R * 0.4;
    const force = 1 + s.n / 120 + v / 600;
    for (const c of W.st.crs) if (c.hp > 0 && !c.carried && dist(x, y, c.x + c.w / 2, c.y + c.h / 2) < R + 60 + Math.max(c.w, c.h) / 2) {
      W.hurt(c, Math.min(7, 1 + s.n / 70 + v / 500)); c.sta.stun = Math.max(c.sta.stun, 1.5);
      const dx = c.x + c.w / 2 - x, dy = c.y + c.h / 2 - y, d = Math.hypot(dx, dy) || 1; c.vx += dx / d * 300 * force + s.vx * 0.3; c.vy += dy / d * 200 * force - 150;
    }
    // l'effet de la matière dominante
    let dom = null, dn = 0; for (const m in s.mats) if (s.mats[m] > dn) { dn = s.mats[m]; dom = +m; }
    if (dom != null && PRISE_EFFET[dom]) W.applyEffect(PRISE_EFFET[dom], x, y, R + 30, { power: Math.min(3, force), size: 1, duration: 1, persist: 0 }, 'burst', { noGrid: true, noField: true, noPlayer: true });
    for (const core of s.spec.cores) if (core !== 'force' && core !== 'gravite') W.applyEffect(core, x, y, R + 20, s.spec.prm, 'burst', { noField: true });
    lacherEntites(s, s.vx * 0.6, s.vy * 0.6 - 150);
    for (const m in s.mats) { W.spawnLiquid(+m, x, y, s.mats[m], 300); W.part(x, y, P[m].color, Math.min(40, 8 + s.mats[m] / 8), 260 + v * 0.3, 0.9, 2.4, 900, P[m].liquid ? 'goutte' : 'eclat'); }
    W.st.sp.push({ k: 'ring', core: 'force', x, y, r: R + 40, life: 0.5, max: 0.5, color: s.color });
    W.st.shake = Math.min(0.7, 0.2 + s.n / 400); Son.sfx('burst', 'terre');
    if (s.n > 150) W.msg('SPLASH !');
    W.evt('prise', s.n);
  }
  function lancerPrise() {
    const s = W.st.sp.find((q) => q.k === 'prise' && q.tenue && !q.mort);
    if (!s) return false;
    s.tenue = false;
    let vx = 0, vy = 0; for (const [a, b] of s.hist) { vx += a; vy += b; } vx /= s.hist.length || 1; vy /= s.hist.length || 1;
    const p = W.st.p; const pcx = p.x + p.w / 2, pcy = p.y + p.h / 2;
    if (Math.hypot(vx, vy) < 260) { const d = dist(pcx, pcy, s.x, s.y) || 1; vx = (s.x - pcx) / d * 700; vy = (s.y - pcy) / d * 700 - 120; }
    const k = Math.min(1.4, 1100 / Math.max(1, Math.hypot(vx, vy))); s.vx = vx * Math.max(1, k); s.vy = vy * Math.max(1, k);
    s.t = 0; Son.sfx('cast', 'vent');
    return true;
  }
  function finBouclier(s) {
    if (s.ring) for (const i of s.ring) if (Sim.mat[i] === M.BULLE) { Sim.mat[i] = M.AIR; Sim.touch(i); }
    if (s.stash) for (const m in s.stash) W.spawnLiquid(+m, s.x, s.y, s.stash[m], 400);
    s.ring = null; s.stash = null;
  }
  function detoner() {
    const att = W.st.sp.filter((q) => q.k === 'attente' && !q.mort);
    if (!att.length) { W.msg('Aucun sort en attente.'); return 0; }
    const p = W.st.p; const pc = { x: p.x + p.w / 2, y: p.y + p.h * 0.45 }; const aim = W.toWorld(W.game.inp.mouse.x, W.game.inp.mouse.y);
    for (const a of att) {
      a.mort = true; const sp = a.spec;
      if (a.trait) { let dx = aim.x - pc.x, dy = aim.y - pc.y; const d = Math.hypot(dx, dy) || 1; fireBeam(sp, pc.x, pc.y, dx / d, dy / d, 'immediat'); }
      else if (a.self) selfCast(sp, a.aim || aim);
      else if (a.relance) { const q = Seal.clone(sp.seal); q.trigger = 'immediat'; if (q.trigger2 === 'commande') q.trigger2 = null; launch(q, pc, { x: a.x, y: a.y }, { depth: sp.depth, player: true, charge: sp.charge }); }
      else if (a.mur) { const mw = 30 * sp.prm.size * (sp.prm.dimL || 1), mh = 180 * sp.prm.size * (sp.prm.dimH || 1); const rect = { x0: a.x - mw / 2, x1: a.x + mw / 2, y0: a.y - mh / 2, y1: a.y + mh / 2 }; if (!W.champForme(sp, rect, a.dir)) { if (sp.prm.matiere) W.matiereRect(sp, rect); for (const q of W.murPoints(a.x, a.y, mw, mh)) doBurst(sp, q.x, q.y, q.r, { mur: true, noMatiere: true, noEcho: true, noRepeat: true, noExpire: true, noCombo: true }); } } else if (false) { for (let k = -2; k <= 2; k++) doBurst(sp, a.x, a.y + k * 36 * sp.prm.size, 24 * sp.prm.size, { mur: true, noField: k !== 0, noEcho: k !== 0, noRepeat: k !== 0, noExpire: k !== 0, noCombo: k !== 0 }); }
      else doBurst(sp, a.x, a.y, (a.ent ? 50 : 70) * sp.prm.size, { ent: a.ent }, a.dir || null);
    }
    Son.sfx('burst', 'force'); return att.length;
  }
  function updateSpells(dtG) {
    let dt = dtG;
    const sols = W.dynSolids();
    for (const s of W.st.sp) {
      dt = W.bullesT.length && s.k !== 'bulle' && s.x !== undefined ? dtG * W.tempsDe(s.x, s.y, 2) : dtG; if (dt <= 0) continue;
      switch (s.k) {
        case 'proj': {
          if (s.tenu) { if (!tientMain(s.tenu.hand) || W.st.p.ink < s.tenu.drain * dt) { s.mort = true; W.part(s.x, s.y, s.color, 8, 50, 0.4, 2, 0, 'spark'); Son.sfx('fizzle'); break; } if (s.tenu.t !== W.time) { s.tenu.t = W.time; W.st.p.ink -= s.tenu.drain * dt; } s.life = Math.max(s.life, 0.3);
            // il file vers la souris et s'y tient, au bout de la main
            { const pp = W.st.p, o2 = { x: pp.x + pp.w / 2, y: pp.y + pp.h * 0.45 }, a2 = W.toWorld(W.game.inp.mouse.x, W.game.inp.mouse.y); let tx = a2.x - o2.x, ty = a2.y - o2.y; const td = Math.hypot(tx, ty) || 1, kk = Math.min(1, s.tenu.portee / td); tx = o2.x + tx * kk; ty = o2.y + ty * kk; const vmax = 560 * (s.prm.speed || 1); let wx = (tx - s.x) * 7, wy = (ty - s.y) * 7; const wv = Math.hypot(wx, wy); if (wv > vmax) { wx *= vmax / wv; wy *= vmax / wv; } const ka = Math.min(1, dt * 9); s.vx += (wx - s.vx) * ka; s.vy += (wy - s.vy) * ka; } }
          s.life -= dt; if (s.life <= 0) { if (s.spec && s.trig === 'commande' && !s.potion && !s.liquide) { impactProj(s, null); break; } s.mort = true; W.part(s.x, s.y, s.color, 5, 30, 0.4); break; }
          { const z = W.st.gz.length ? W.gravOf({ x: s.x - 1, y: s.y - 1, w: 2, h: 2 }) : null; if (z) { s.vx += 900 * z.mag * z.gx * dt; s.vy += 900 * z.mag * z.gy * dt; } else s.vy += s.grav * dt; }
          if (s.homing) { const h = s.homing; if ((h.hp !== undefined && h.hp <= 0) || h.mort) s.homing = null; else { const want = Math.atan2(h.y + h.h / 2 - s.y, h.x + h.w / 2 - s.x), cur = Math.atan2(s.vy, s.vx); let da = want - cur; while (da > Math.PI) da -= TAU; while (da < -Math.PI) da += TAU; const na = cur + clamp(da, -5 * dt, 5 * dt); const sp = Math.hypot(s.vx, s.vy); s.vx = Math.cos(na) * sp; s.vy = Math.sin(na) * sp; if (h.point && dist(s.x, s.y, h.x + 1, h.y + 1) < s.r + 14 && !s.potion && !s.liquide) { impactProj(s, null); break; } } }
          // filtre de matière : le sort traverse tout sauf la matière choisie
          if (s.spec && s.spec.filtre && !s.potion && !s.liquide) {
            s.x += s.vx * dt; s.y += s.vy * dt;
            if (Math.random() < 0.5) W.part(s.x, s.y, DATA.FILTRES[s.spec.filtre].couleur, 1, 10, 0.3, 2);
            const h = filtreTouche(s.spec.filtre, s.x, s.y, s.r + 4);
            if (h) { W.evt('hit', 'filtre:' + s.spec.filtre); impactProj(s, h.cell ? null : h); }
            if (s.y > W.L.h + 50 || s.y < -50) s.mort = true;
            break;
          }
          // trajectoires
          if (s.traj === 'boomerang') {
            s.bt = (s.bt || 0) + dt;
            const pp = W.st.p, px = pp.x + pp.w / 2, py = pp.y + pp.h * 0.4;
            if (!s.retour && s.bt > 0.42 * s.prm.range) { s.retour = true; s.hits.clear(); }
            if (s.retour) { const sp = Math.max(460, Math.hypot(s.vx, s.vy)); const ddx = px - s.x, ddy = py - s.y, dd = Math.hypot(ddx, ddy) || 1; const kk = Math.min(1, 5 * dt); s.vx += (ddx / dd * sp - s.vx) * kk; s.vy += (ddy / dd * sp - s.vy) * kk; if (dd < 28) { s.mort = true; W.part(px, py, s.color, 8, 50, 0.4, 2, 0, 'glow'); Son.sfx('pickup'); break; } }
            else { s.vx *= 1 - 0.8 * dt; s.vy *= 1 - 0.8 * dt; }
          } else if (s.traj === 'rasesol') {
            const g = W.groundBelow(s.x, s.y - 24);
            if (g != null && g - s.y < 140) s.vy = clamp((g - 9 - s.y) * 12, -700, 700); else s.vy += 900 * dt;
            if (Math.abs(s.vx) < 200) s.vx = Math.sign(s.vx || 1) * 200;
          }
          let nx = s.x + s.vx * dt, ny = s.y + s.vy * dt;
          if (s.traj === 'zigzag') { s.ph += dt * 17; const A = 15 * (s.prm.size || 1); const off = (2 / Math.PI) * Math.asin(Math.sin(s.ph)) * A; const vv = Math.hypot(s.vx, s.vy) || 1; nx += -s.vy / vv * (off - s.off); ny += s.vx / vv * (off - s.off); s.off = off; }
          if (s.traj === 'spirale') { s.ph += dt * 26; const A = Math.min(22, s.ph * 6) * (s.prm.size || 1); const off = Math.sin(s.ph) * A; const vv = Math.hypot(s.vx, s.vy) || 1; nx += -s.vy / vv * (off - s.off); ny += s.vx / vv * (off - s.off); s.off = off; }
          if (s.traj === 'rasesol' && Sim.solidAt(nx, ny)) { for (let kk = 1; kk <= 6; kk++) if (!Sim.solidAt(nx, ny - kk * CS)) { ny -= kk * CS; break; } }
          if (s.guide) { const aim = W.toWorld(W.game.inp.mouse.x, W.game.inp.mouse.y); const want = Math.atan2(aim.y - s.y, aim.x - s.x), cur = Math.atan2(s.vy, s.vx); let da = want - cur; while (da > Math.PI) da -= TAU; while (da < -Math.PI) da += TAU; const na = cur + clamp(da, -4 * dt, 4 * dt); const sp = Math.hypot(s.vx, s.vy); s.vx = Math.cos(na) * sp; s.vy = Math.sin(na) * sp; }
          const dirv = { x: s.vx / (Math.hypot(s.vx, s.vy) || 1), y: s.vy / (Math.hypot(s.vx, s.vy) || 1) };
          const traverse = s.traj === 'boomerang' && s.retour;
          const hitS = traverse ? null : Sim.solidAt(nx, ny) ? { t: P[Sim.matAt(nx, ny)].nom } : sols.find((o) => nx >= o.x - s.r && nx <= o.x + o.w + s.r && ny >= o.y - s.r && ny <= o.y + o.h + s.r);
          if (hitS && s.traj === 'boomerang' && !s.potion && !s.liquide) { s.retour = true; s.hits.clear(); s.vx = -s.vx * 0.6; s.vy = -s.vy * 0.6; W.part(s.x, s.y, s.color, 5, 50, 0.3); if (s.trig !== 'immediat') doBurst(s.spec, s.x, s.y, 28 * s.prm.size, { noPlayer: true, noField: true, noEcho: true }, dirv); break; }
          if (hitS) {
            if (s.bounces > 0) {
              s.bounces--;
              if (Sim.solidAt(s.x + s.vx * dt, s.y)) s.vx = -s.vx * 0.9; else s.vy = -s.vy * 0.9;
              W.part(s.x, s.y, s.color, 4, 40, 0.3);
            } else if (s.potion) { W.potionBurst(s.potion, s.x, s.y, s.forte); s.mort = true; }
            else if (s.liquide) { W.spawnLiquid(s.liquide, s.x, s.y, 26); W.part(s.x, s.y, s.color, 10, 60, 0.6); Son.sfx('burst', 'eau'); s.mort = true; }
            else if (s.trig === 'contact' || s.trig === 'retarde' || s.trig === 'commande' || s.trig === 'proximite') impactProj(s, null);
            else { doBurst(s.spec, s.x, s.y, 28 * s.prm.size, { noField: s.core !== 'lumiere' }, dirv); s.mort = true; }
            if (hitS.t) W.evt('hit', 'objet:' + hitS.t);
            break;
          }
          s.x = nx; s.y = ny;
          if (s.spec && s.spec.combo) W.PH.trainee(s, dt);
          const lm = Sim.matAt(s.x, s.y);
          if (P[lm].liquid && !s.plouf) { s.plouf = true; W.part(s.x, s.y - 4, P[lm].color, 12, 220, 0.7, 2, 900, 'goutte'); }
          if (P[lm].liquid) {
            if (s.core === 'feu' && lm === M.EAU && !s.potion && !s.liquide) { Sim.forRadius(s.x, s.y, 10, (x, y, i, m) => { if (m === M.EAU && Math.random() < 0.5) Sim.set(x, y, M.VAPEUR, 40); }); W.part(s.x, s.y, '#ccc', 8, 40, 0.7, 4, -100); s.mort = true; break; }
            if (s.core === 'froid' && lm === M.EAU && !s.potion && !s.liquide) { W.applyEffect('froid', s.x, s.y, 36 * s.prm.size, s.prm, 'burst'); s.mort = true; break; }
            if (s.core === 'foudre' && lm === M.EAU && !s.potion && !s.liquide) { W.applyEffect('foudre', s.x, s.y, 60 * s.prm.size, s.prm, 'burst'); s.mort = true; break; }
            s.vx *= Math.max(0, 1 - 4 * dt); s.vy *= Math.max(0, 1 - 4 * dt);
            if ((s.potion || s.liquide) && Math.abs(s.vx) + Math.abs(s.vy) < 100) { if (s.potion) W.potionBurst(s.potion, s.x, s.y, s.forte); else W.spawnLiquid(s.liquide, s.x, s.y, 26); s.mort = true; break; }
          }
          if (s.trig === 'proximite' && !s.potion && !s.liquide) { const cp = W.st.crs.find((c) => c.hp > 0 && !c.sta.tame && c.t !== 'familier' && !s.hits.has(c) && U.circleRect(s.x, s.y, s.r + 55, c)); if (cp) { impactProj(s, cp); break; } }
          let touche = null;
          for (const c of W.st.crs) if (c.hp > 0 && U.circleRect(s.x, s.y, s.r, c) && !s.hits.has(c)) { touche = c; break; }
          if (!touche) for (const o of W.st.objs) if (!o.mort && o.t !== 'porte' && o.t !== 'pancarte' && !o.solid && U.circleRect(s.x, s.y, s.r, o) && !s.hits.has(o)) { touche = o; break; }
          if (touche && (s.traj === 'boomerang' || s.prm.percant) && !s.potion && !s.liquide) {
            if (touche.hp !== undefined && touche.t) W.evt('creatureTouchee');
            s.hits.add(touche); doBurst(s.spec, s.x, s.y, 30 * s.prm.size, { noPlayer: true, noField: true, noEcho: true }, dirv); Son.sfx('hit', s.core);
            if (s.traj === 'boomerang' && !s.retour) { s.retour = true; s.hits.clear(); s.hits.add(touche); }
            break;
          }
          if (touche) {
            if (touche.hp !== undefined && touche.t) W.evt('creatureTouchee');
            if (s.matiere != null && touche.hp !== undefined && !s.hits.has(touche)) { W.hurt(touche, 1.5 + 1.5 * (s.prm.power || 1)); touche.vx += s.vx * 0.25; touche.vy -= 80; W.part(s.x, s.y, P[s.matiere].color, 8, 120, 0.5, 2.4, 600, 'eclat'); }
            if (s.potion) { W.potionBurst(s.potion, s.x, s.y, s.forte); s.mort = true; }
            else if (s.liquide) { W.spawnLiquid(s.liquide, s.x, s.y, 26); s.mort = true; }
            else if (s.chain > 0) {
              s.hits.add(touche); s.chain--;
              doBurst(s.spec, s.x, s.y, 36 * s.prm.size, { noPlayer: true, noField: true, noEcho: true }, dirv); Son.sfx('hit', s.core);
              let next = null, bd = 180;
              for (const c of W.st.crs) if (c.hp > 0 && !s.hits.has(c)) { const d = dist(s.x, s.y, c.x + c.w / 2, c.y + c.h / 2); if (d < bd) { bd = d; next = c; } }
              if (!next) for (const o of W.st.objs) if (!o.mort && !s.hits.has(o) && (o.t === 'caisse' || o.t === 'mannequin' || o.t === 'torche')) { const d = dist(s.x, s.y, o.x + o.w / 2, o.y + o.h / 2); if (d < bd) { bd = d; next = o; } }
              if (next && s.chain > 0) { const ddx = next.x + next.w / 2 - s.x, ddy = next.y + next.h / 2 - s.y; const dd = Math.hypot(ddx, ddy) || 1; const sp = 520; s.vx = ddx / dd * sp; s.vy = ddy / dd * sp; s.grav = 0; s.life = 1.5; }
              else { s.mort = true; }
            }
            else if (s.trig === 'contact' || s.trig === 'retarde' || s.trig === 'commande' || s.trig === 'proximite') impactProj(s, touche.hp !== undefined ? touche : null);
            else { s.hits.add(touche); for (const c of s.spec.cores) W.applyEffect(c, s.x, s.y, s.r + 10, { ...s.prm, power: s.prm.power * 0.9 }, 'burst', { noField: true, noPlayer: true, noGrid: true }); Son.sfx('hit', s.core); }
          }
          if (s.trig === 'immediat' && !s.potion && !s.liquide && Math.random() < 0.5) for (const c of s.spec.cores) W.gridEffect(c, s.x, s.y, s.r + 4, { ...s.prm, power: s.prm.power * 0.5 }, false, dt * 3);
          (s.tr || (s.tr = [])).push([s.x, s.y]); if (s.tr.length > 14) s.tr.shift();
          if (s.spec && s.spec.encreC && Math.random() < 0.45) W.part(s.x, s.y, s.spec.encreC, 1, 30, 0.45, 1.6, 0, 'etincelle');
          s.trail += dt; if (s.trail > 0.035) { s.trail = 0; if (s.core === 'feu') { W.part(s.x, s.y, s.chaud >= 2 ? '#5a90e0' : s.chaud ? '#f6e0a0' : '#f08a30', 1, 20, 0.35, s.r * 0.35, -200, 'flamme'); if (s.chaud) W.st.parts[W.st.parts.length - 1].chaud = s.chaud; } else if (s.core === 'foudre' || s.core === 'lumiere') W.part(s.x, s.y, s.color, 1, 60, 0.3, 1.4, 0, 'etincelle'); else if (s.core === 'eau' || s.core === 'acide') W.part(s.x, s.y, s.color, 1, 30, 0.5, 1.6, 600, 'goutte'); else if (s.core === 'froid') W.part(s.x, s.y, '#dff0ff', 1, 20, 0.8, 2.2, 30, 'flocon'); else W.part(s.x, s.y, s.color, 1, 10, 0.35, s.r * 0.5, 0, 'glow'); }
          if (s.y > W.L.h + 50 || s.y < -50) s.mort = true;
          break;
        }
        case 'trap': {
          s.life -= dt; s.t += dt; if (s.life <= 0) { s.mort = true; break; }
          let hit = false;
          if (s.spec.filtre) { s.chk -= dt; if (s.chk <= 0) { s.chk = 0.2; hit = s.spec.filtre === 'creature' ? filtreCompte('creature', s.x, s.y, s.r) > 0 : filtreCompte(s.spec.filtre, s.x, s.y, s.r * 0.6) > s.base + 2; } }
          else hit = W.st.crs.some((c) => c.hp > 0 && (!s.prox || (!c.sta.tame && c.t !== 'familier')) && U.circleRect(s.x, s.y, s.r, c)) || (!s.prox && W.st.objs.some((o) => o.dyn && !o.carried && U.circleRect(s.x, s.y, s.r, o)));
          if (hit) { doBurst(s.spec, s.x, s.y, s.r * 1.2); s.mort = true; }
          break;
        }
        case 'timer': s.t -= dt; if (s.t <= 0) { doBurst(s.spec, s.x, s.y, s.r || 60 * s.spec.prm.size, Object.assign(s.noField ? { noField: true, noEcho: true } : {}, s.mur ? { mur: true } : {})); s.mort = true; } break;
        case 'beamtimer': s.t -= dt; if (s.t <= 0) { const p = W.st.p; const n = 1 + (s.prm.extra || 0), a0 = Math.atan2(s.dy, s.dx); for (let i = 0; i < n; i++) { const a = a0 + (n > 1 ? (i - (n - 1) / 2) * 0.18 : 0); fireBeam(s.spec, p.x + p.w / 2, p.y + p.h * 0.45, Math.cos(a), Math.sin(a), 'immediat'); } s.mort = true; } break;
        case 'echo': s.t -= dt; if (s.t <= 0) { doBurst(s.spec, s.x, s.y, s.r, s.opts); s.left--; s.t = 0.5; if (s.left <= 0) s.mort = true; } break;
        case 'attente': {
          s.life -= dt; if (s.life <= 0) { s.mort = true; W.part(s.x || W.st.p.x, s.y || W.st.p.y, '#777', 6, 30, 0.6); break; }
          if (s.ent) { if (s.ent.hp <= 0 || s.ent.mort) s.ent = null; else { s.x = s.ent.x + s.ent.w / 2; s.y = s.ent.y + s.ent.h / 2; } }
          if (s.self) { const p = W.st.p; s.x = p.x + p.w / 2; s.y = p.y + p.h / 2; }
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
        case 'expire': s.t -= dt; if (s.t <= 0) { doBurst(s.spec, s.x, s.y, s.r, { noExpire: true, noRepeat: true, noEcho: true, noCombo: true }); W.st.sp.push({ k: 'label', x: s.x, y: s.y - 30, txt: 'Dernier éclat', life: 1, max: 1 }); s.mort = true; } break;
        case 'bouclier': majBouclier(s, dt); break;
        case 'prise': majPrise(s, dt); break;
        case 'canal': {
          s.t += dt; s.tick -= dt;
          const tient = s.tenu ? tientMain(s.tenu.hand) : W.game.inp.mouse.down;
          if (!tient || (!s.tenu && s.t > 6) || W.st.p.ink < s.cost * 0.2) { s.mort = true; if (s.tenu && s.x != null) { W.part(s.x, s.y, s.spec.color, 10, 60, 0.4, 2, 0, 'spark'); Son.sfx('fizzle'); } break; }
          const p = W.st.p; const pcx = p.x + p.w / 2, pcy = p.y + p.h * 0.45; const aim = W.toWorld(W.game.inp.mouse.x, W.game.inp.mouse.y);
          let ddx = aim.x - pcx, ddy = aim.y - pcy; const dd = Math.hypot(ddx, ddy) || 1; const k = Math.min(dd, s.range) / dd;
          if (s.soi) { s.x = pcx; s.y = pcy; } else { s.x = pcx + ddx * k; s.y = pcy + ddy * k; }
          if (s.tick <= 0) { const per = s.trait ? 0.12 : 0.2; s.tick = per; p.ink -= s.cost * per; if (s.trait) fireBeam(s.spec, pcx, pcy, ddx / dd, ddy / dd, 'immediat'); else doBurst(s.spec, s.x, s.y, s.r, { noEcho: true, noField: true, noPlayer: s.soi }); }
          break;
        }
        case 'orbit': {
          s.life -= dt; if (s.life <= 0) { s.mort = true; break; }
          const p = W.st.p; s.a += dt * 3.5; s.x = p.x + p.w / 2 + Math.cos(s.a) * 70; s.y = p.y + p.h / 2 + Math.sin(s.a) * 70;
          for (const c of W.st.crs) if (c.hp > 0 && !c.sta.tame && U.circleRect(s.x, s.y, s.r + 6, c) && (s.hits.get(c) || -9) < W.time - 0.8) { s.hits.set(c, W.time); doBurst(s.spec, s.x, s.y, 30 * s.spec.prm.size, { noPlayer: true, noField: true, noEcho: true }); }
          for (const c of s.spec.cores) if (Math.random() < 0.3) W.gridEffect(c, s.x, s.y, s.r + 4, { ...s.spec.prm, power: s.spec.prm.power * 0.4 }, false, dt * 3);
          if (Math.random() < 0.5) W.part(s.x, s.y, s.color, 1, 10, 0.3, 3);
          break;
        }
        case 'totem': {
          s.life -= dt; s.t -= dt; if (s.life <= 0) { s.mort = true; W.part(s.x, s.y - 20, s.color, 10, 50); if (s.spec.expire) doBurst(s.spec, s.x, s.y - 20, s.r * 1.3, { noExpire: true, noRepeat: true, noCombo: true }); break; }
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
            const mg = s.spec.prm.matiere ? W.matiereDe(s.spec) : null;
            if (mg != null && mg !== M.AIR && Math.random() < 0.35) W.st.sp.push({ k: 'proj', spec: { ...s.spec, prm: { ...s.spec.prm, matiere: false, gerbe: 0, size: 0.6 } }, core, x, y: s.yTop, vx: (Math.random() - 0.5) * 40, vy: 300, r: 4, prm: { ...s.spec.prm, matiere: false, gerbe: 0, size: 0.6, power: (s.spec.prm.power || 1) * 0.5 }, trig: 'contact', bounces: 0, life: 2, grav: 700, hits: new Set(), color: P[mg].color, trail: 0, chain: 0, matiere: mg, off: 0, ph: 0 });
            else if (MAT[core] && Sim.get(cx, cy) === M.AIR) { Sim.set(cx, cy, MAT[core], core === 'feu' ? 40 : 0); }
            else W.st.sp.push({ k: 'proj', spec: s.spec, core, x, y: s.yTop, vx: 0, vy: 200, r: 5, prm: s.spec.prm, trig: 'contact', bounces: 0, life: 3, grav: 500, hits: new Set(), color: s.color, trail: 0, petit: true });
          }
          break;
        }
        case 'label': s.life -= dt; s.y -= 20 * dt; if (s.life <= 0) s.mort = true; break;
        case 'rafale': {
          s.t -= dt; if (s.t > 0) break;
          s.t = 0.12; s.left--;
          const p = W.st.p; const org = s.o.player ? { x: p.x + p.w / 2, y: p.y + p.h * 0.45 } : s.origin; const am = s.o.player ? W.toWorld(W.game.inp.mouse.x, W.game.inp.mouse.y) : s.aim;
          launch(s.seal, org, am, s.o); if (s.left <= 0) s.mort = true;
          break;
        }
        case 'vague': {
          s.life -= dt; if (s.life <= 0) { s.mort = true; break; }
          s.x += s.dir * s.v * dt;
          const g = W.groundBelow(s.x, s.y - 60); if (g == null || g - s.y > 140) { s.mort = true; break; }
          s.y += (g - s.y) * Math.min(1, dt * 12);
          if (Sim.solidAt(s.x + s.dir * s.r * 0.7, s.y - s.r * 0.7)) { doBurst(s.spec, s.x, s.y - s.r * 0.5, s.r * 1.2, { noEcho: true }); s.mort = true; break; }
          s.tick -= dt; if (s.tick <= 0) { s.tick = 0.1; for (const core of s.spec.cores) W.applyEffect(core, s.x, s.y - s.r * 0.5, s.r, { ...s.spec.prm, power: s.spec.prm.power * 0.6 }, 0.1, { noPlayer: true, noField: true }); }
          for (const c of W.st.crs) if (c.hp > 0 && !c.carried && U.circleRect(s.x, s.y - s.r * 0.5, s.r, c)) { c.vx += (s.dir * 420 - c.vx) * Math.min(1, dt * 6); if (c.onGround) c.vy -= 160; }
          for (const o of W.st.objs) if (o.dyn && !o.carried && !o.mort && U.circleRect(s.x, s.y - s.r * 0.5, s.r, o)) o.vx += (s.dir * 360 - o.vx) * Math.min(1, dt * 6);
          if (Math.random() < 0.6) W.st.parts.push({ x: s.x + (Math.random() - 0.5) * s.r, y: s.y - Math.random() * s.r, vx: s.dir * 120, vy: -80, life: 0.4, max: 0.4, color: s.color, size: 2, grav: 300, type: 'glow' });
          break;
        }
        case 'colonne': {
          s.life -= dt; if (s.life <= 0) { s.mort = true; break; }
          s.tick -= dt; if (s.tick <= 0) { s.tick = 0.1; for (let q = 0; q < 4; q++) for (const core of s.spec.cores) W.applyEffect(core, s.x, s.y - (q + 0.5) * s.h / 4, s.w * 1.4, { ...s.spec.prm, power: s.spec.prm.power * 0.5 }, 0.1, { noPlayer: true, noField: true }); }
          const souleve = (b, f) => { const bx = b.x + b.w / 2; if (Math.abs(bx - s.x) > s.w + b.w / 2 || b.y + b.h < s.y - s.h || b.y > s.y + 4) return; b.vy -= 2600 * dt * f; if (b.vy < -480) b.vy = -480; b.onGround = false; };
          for (const c of W.st.crs) if (c.hp > 0 && !c.carried) souleve(c, c.t === 'golem' ? 0.5 : 1);
          for (const o of W.st.objs) if (o.dyn && !o.carried && !o.mort) souleve(o, 1);
          souleve(W.st.p, 0.8);
          if (Math.random() < 0.8) W.st.parts.push({ x: s.x + (Math.random() - 0.5) * s.w * 1.5, y: s.y - Math.random() * s.h * 0.3, vx: (Math.random() - 0.5) * 40, vy: -260 - Math.random() * 200, life: 0.7, max: 0.7, color: s.color, size: 2.4, grav: 0, type: s.spec.core === 'eau' ? 'goutte' : s.spec.core === 'feu' ? 'flamme' : 'glow' });
          break;
        }
        case 'bulle': {
          s.life -= dt; if (s.life <= 0) { s.mort = true; if (s.mode === 'fige') for (const q of W.st.sp) if (q.gelV) { [q.vx, q.vy, q.grav] = q.gelV; q.gelV = null; } break; }
          if (s.mode !== 'vite') W.vieillir(s.mode, s.x, s.y, s.r, dt, s.f, s.rect);
          else { s.acc = (s.acc || 0) + dt; if (s.acc >= 0.05) { W.vieillir(s.mode, s.x, s.y, s.r, s.acc, s.f, s.rect); s.acc = 0; } } // 20 fois par seconde suffit
          if (Math.random() < 0.5) { const a = Math.random() * TAU, rr = s.r * (0.3 + Math.random() * 0.7); W.st.parts.push({ x: s.x + Math.cos(a) * rr, y: s.y + Math.sin(a) * rr, vx: s.mode === 'vite' ? -Math.sin(a) * 160 : -Math.sin(a) * 12, vy: s.mode === 'vite' ? Math.cos(a) * 160 : Math.cos(a) * 12, life: 0.6, max: 0.6, color: s.mode === 'vite' ? '#c8ccd8' : '#8aa0d8', size: 2, grav: 0, type: 'glow' }); }
          break;
        }
        case 'tornade': {
          s.life -= dt; if (s.life <= 0) { s.mort = true; break; }
          s.x += Math.sin(W.time * 0.9 + s.ph) * 50 * dt;
          const g2 = W.groundBelow(s.x, s.y - 40); if (g2 != null) s.y += (g2 - s.y) * Math.min(1, dt * 4);
          const kk = Math.min(1, s.life / 0.6);
          const lift = (b, f) => { const bx = b.x + b.w / 2, by = b.y + b.h / 2; if (Math.abs(bx - s.x) > s.r + b.w / 2 || by > s.y + 10 || by < s.y - s.h) return; const dx = s.x - bx; b.vx += dx * 5 * dt * f + Math.cos(W.time * 6 + by * 0.05) * 600 * dt * f; b.vy -= 1700 * dt * f * kk; if (b.vy < -380) b.vy = -380; b.onGround = false; };
          for (const c of W.st.crs) if (c.hp > 0 && !c.carried) lift(c, c.t === 'golem' ? 0.45 : 1);
          for (const o of W.st.objs) if (o.dyn && !o.carried && !o.mort) lift(o, 1);
          lift(W.st.p, 0.55);
          const x0 = Math.floor((s.x - s.r) / CS), x1 = Math.floor((s.x + s.r) / CS), y0 = Math.max(1, Math.floor((s.y - s.h) / CS)), y1 = Math.floor(s.y / CS);
          for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) { const m = Sim.get(x, y); if (!m) continue; const q = P[m]; if (!(q.liquid || q.powder || q.gas) || m === M.BULLE || m === M.LAVE) continue; if (Math.random() < 0.35 * kk) { const nx = x + (Math.random() < 0.4 ? (Math.random() < 0.5 ? -1 : 1) : 0); if (Sim.get(nx, y - 1) === M.AIR) Sim.swap(y * Sim.W + x, (y - 1) * Sim.W + nx); } }
          if (Math.random() < 0.7) { const f = Math.random(); W.st.parts.push({ x: s.x + (Math.random() - 0.5) * s.r * (0.4 + f), y: s.y - f * s.h, vx: (Math.random() - 0.5) * 200, vy: -120, life: 0.5, max: 0.5, color: '#bfe8e8', size: 2, grav: 0, type: 'vent' }); }
          break;
        }
        case 'singularite': {
          s.life -= dt; const ph = s.life > 0.6;
          const pull = (b, k) => { const bx = b.x + b.w / 2, by = b.y + b.h / 2; const dx = s.x - bx, dy = s.y - by; const d = Math.hypot(dx, dy) || 1; if (d > s.r) return; if (ph) { b.vx += dx / d * 1800 * dt * k; b.vy += dy / d * 1800 * dt * k; } else { b.vx -= dx / d * 900 * k; b.vy -= dy / d * 900 * k - 200; } };
          if (s.life <= 0.6 && !s.recrache) { s.recrache = true; for (const c of W.st.crs) if (c.hp > 0) pull(c, 1); for (const o of W.st.objs) if (o.dyn && !o.carried) pull(o, 1); pull(W.st.p, 0.6); W.st.shake = 0.4; Son.sfx('burst', 'force'); }
          if (ph) { for (const c of W.st.crs) if (c.hp > 0) pull(c, 1); for (const o of W.st.objs) if (o.dyn && !o.carried) pull(o, 1); pull(W.st.p, 0.5); Sim.forRadius(s.x, s.y, s.r * 0.7, (x, y, i, m) => { const q = P[m]; if ((q.liquid || q.powder || q.gas) && Math.random() < 0.3) { const dx = Math.sign(Math.floor(s.x / CS) - x), dy = Math.sign(Math.floor(s.y / CS) - y); const j = (y + dy) * Sim.W + x + dx; if (Sim.get(x + dx, y + dy) === M.AIR) Sim.swap(i, j); } }); }
          if (s.life <= 0) s.mort = true;
          break;
        }
        case 'field': {
          s.life -= dt; if (s.life <= 0) { s.mort = true; if (s.spec && s.spec.expire && s.follow) doBurst(s.spec, s.x, s.y, s.r * 1.2, { noExpire: true, noRepeat: true, noCombo: true }); break; }
          if (s.follow) { const p = W.st.p; s.x = p.x + p.w / 2; s.y = p.y + p.h / 2; }
          if (s.vx) { s.x += s.vx * dt; if (Sim.solidAt(s.x + Math.sign(s.vx) * s.r * 0.5, s.y)) s.vx = -s.vx; }
          if (s.faible) break;
          if (s.spec) { doContinuous(s.spec, s.x, s.y, s.r, dt, { noField: true, noPlayer: !!s.follow }); }
          else W.applyEffect(s.core, s.x, s.y, s.r, { ...s.prm, power: s.prm.power * 0.5 }, dt, { noField: true });
          if (Math.random() < 0.6) { const a = Math.random() * TAU, rr = Math.random() * s.r; W.part(s.x + Math.cos(a) * rr, s.y + Math.sin(a) * rr * 0.5, W.colorOf(s.core), 1, 20, 0.7, 3, s.core === 'feu' ? -200 : s.core === 'eau' ? 100 : -30, s.core === 'lumiere' ? 'spark' : 'dot'); }
          break;
        }
        case 'ring': case 'beam': case 'zap': case 'rembob': case 'fantome': s.life -= dt; if (s.life <= 0) s.mort = true; break;
      }
      if (s.k === 'field' && s.faible) for (const o of W.st.objs) if (o.t === 'rune' && U.circleRect(s.x, s.y, s.r * 2, o)) o.revele = Math.min(1, o.revele + dt * 0.8);
    }
    if (W.st.p.sta.lumiere > 0) for (const o of W.st.objs) if (o.t === 'rune' && dist(o.x + 20, o.y + 30, W.st.p.x, W.st.p.y) < 220) o.revele = Math.min(1, o.revele + dt * 0.8);
    // collisions entre projectiles : fusion forcée au point de rencontre
    const pj = W.st.sp.filter((q) => q.k === 'proj' && !q.mort && q.spec && !q.potion && !q.liquide);
    for (let i = 0; i < pj.length; i++) for (let j = i + 1; j < pj.length; j++) {
      const a = pj[i], b = pj[j]; if (a.mort || b.mort || a.spec.castId === b.spec.castId || (a.spec.fratrie && a.spec.fratrie === b.spec.fratrie)) continue;
      if (dist(a.x, a.y, b.x, b.y) < a.r + b.r + 6) collision(a, b);
    }
    for (const mq of W.st.marques) mq.t += dt;
    W.st.sp = W.st.sp.filter((s) => !s.mort);
    W.st.crs = W.st.crs.filter((c) => !c.mort);
  }
  return { castSeal, launch, updateSpells, impactProj, collision, fireBeam, lancerTenu, selfCast, detoner, enchainement, doBurst, doContinuous, gerbe, majBouclier, finBouclier, saisir, majPrise, lacherEntites, ecraserPrise, lancerPrise, rayonPrise, tientMain, makeSpec, filtreSet, filtreTouche, objetProche, filtreCompte, creatureProche, posMarque, marqueRecente, placeMarque, appliquerEncre, encreBurst, capRepetitions, chainOk, maitreMul, couleurLg };
}
