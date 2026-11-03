'use strict';
// ---------- Monde extérieur : entités sur grille de matières, effets, créatures, météo, rendu ----------
const World = (() => {
  const { TAU, INK, clamp, lerp, dist } = U;
  const GRAV = 1500;
  const VW = 1280, VH = 720;
  const CS = Sim.CS, M = Sim.M, P = Sim.P;
  let L = null, st = null, game = null, darkCv = null, time = 0;
  const DAY = 420; // secondes par jour
  const LIQ_ING = { [M.EAU]: 'eau', [M.HUILE]: 'huile', [M.ACIDE]: 'acide', [M.LAVE]: 'lave', [M.SEVE]: 'seve' };
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
      tod: 0.32, meteo: { type: 'clair', t: 120 }, foudreT: 4, rainT: 0, obsT: {}, ileT: 0, pluieT: 0,
      control: null, lien: null, portails: [], gz: [], defiT: 0, lac: null, lacSec: false, vuSommet: false, maxDepth: 0,
    };
    for (const o of L.objs) st.objs.push(makeObj(o));
    for (const c of L.crs) st.crs.push(makeCreature(c));
    if (saved) restore(saved);
    st.cam.x = clamp(st.p.x - VW / 2, 0, L.w - VW); st.cam.y = clamp(st.p.y - VH / 2, 0, L.h - VH);
    if (!darkCv) { darkCv = document.createElement('canvas'); darkCv.width = VW; darkCv.height = VH; }
    Sim.onEvent = onSimEvent;
  }
  function ensure(g, saved) { if (!st) build(g, saved); game = g; }
  function respawn() {
    const p = st.p;
    p.x = L.spawn.x; p.y = L.spawn.y; p.vx = 0; p.vy = 0; p.hp = p.hpMax; p.pg = null; p.w = 26; p.h = 50;
    for (const k in p.sta) p.sta[k] = 0;
    if (p.carry) drop();
  }
  function makePlayer(x, y) {
    return { x, y, w: 26, h: 50, vx: 0, vy: 0, face: 1, onGround: false, coyote: 0, jumpBuf: 0, anim: 0, canStep: true,
      hp: 10, hpMax: 10, ink: 40, inkMax: 40, inkRegen: 1.8, inv: 0, climbing: false, liq: 0,
      sta: { wet: 0, stone: 0, invisible: 0, lowgrav: 0, jump: 0, small: 0, vision: 0, burning: 0, glide: 0, lumiere: 0, patins: 0, vitesse: 0, dissous: 0, vol: 0, branchies: 0, geant: 0, glisse: 0, hate: 0, lent: 0, armure: 0, hoquet: 0, glouglou: 0, boussole: 0 },
      trap: null, selfTimer: null, carry: null, digT: 0 };
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
    }
    for (const k of ['lit', 'stage', 'hauteur', 'hMax', 'racine', 'lu', 'revele', 'hits', 'pris', 'hp', 'lue', 'page']) if (o[k] !== undefined) b[k] = o[k];
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
    return b;
  }

  // ---------- Sauvegarde du monde ----------
  function serialize() {
    return {
      mat: Sim.serialize(), tod: st.tod, meteo: st.meteo,
      objs: st.objs.filter((o) => !o.mort).map((o) => { const q = { t: o.t, x: Math.round(o.x), y: Math.round(o.y) }; for (const k of ['lit', 'stage', 'hauteur', 'hMax', 'racine', 'lu', 'revele', 'hits', 'pris', 'hp', 'lue', 'page']) if (o[k] !== undefined) q[k] = o[k]; if (o.t === 'pancarte') q.texte = o.texte; return q; }),
      crs: st.crs.map((c) => ({ t: c.t, x: Math.round(c.x), y: Math.round(c.y), x0: c.x0, hp: c.hp, tame: c.sta.tame })),
    };
  }
  function restore(d) {
    try {
      if (d.mat) Sim.deserialize(d.mat);
      if (d.objs) st.objs = d.objs.map(makeObj);
      if (d.crs) st.crs = d.crs.map(makeCreature);
      if (d.tod != null) st.tod = d.tod;
      if (d.meteo) st.meteo = d.meteo;
    } catch (e) { console.warn('monde illisible, régénéré', e); }
  }
  function reset() { st = null; }
  function relacher(t) { if (!st) return; const c = makeCreature({ t, x: L.spawn.x + 80, y: L.spawn.y, tame: true }); c.filDonne = true; st.crs.push(c); }

  // ---------- Collisions sur grille ----------
  function dynSolids(exclude) { const a = []; for (const o of st.objs) if (o.solid && !o.mort && o !== exclude && o !== (st.p.carry || null)) a.push(o); return a; }
  function blockedBy(r, sols) { if (Sim.rectBlocked(r)) return true; for (const s of sols) if (U.rectsOverlap(r, s)) return true; return false; }
  function moveBody(b, dt, exclude) {
    const sols = dynSolids(exclude);
    let dx = b.vx * dt; b.hitX = false;
    while (Math.abs(dx) > 0.01) {
      const s = Math.abs(dx) < 3 ? dx : Math.sign(dx) * 3;
      if (!blockedBy({ x: b.x + s, y: b.y, w: b.w, h: b.h }, sols)) { b.x += s; dx -= s; continue; }
      let ok = false;
      if (b.canStep) for (let up = 1; up <= CS * 1.6; up += 1) { if (!blockedBy({ x: b.x + s, y: b.y - up, w: b.w, h: b.h }, sols) && !blockedBy({ x: b.x, y: b.y - up, w: b.w, h: b.h }, sols)) { b.y -= up; b.x += s; dx -= s; ok = true; break; } }
      if (!ok) { b.hitX = true; b.vx = b.bounce ? -b.vx * 0.4 : 0; break; }
    }
    let dy = b.vy * dt; b.onGround = false;
    while (Math.abs(dy) > 0.01) {
      const s = Math.abs(dy) < 3 ? dy : Math.sign(dy) * 3;
      if (!blockedBy({ x: b.x, y: b.y + s, w: b.w, h: b.h }, sols)) { b.y += s; dy -= s; }
      else { if (s > 0) b.onGround = true; b.vy = b.bounce && s > 0 && Math.abs(b.vy) > 200 ? -b.vy * 0.3 : 0; break; }
    }
    if (!b.onGround && b.vy >= 0 && blockedBy({ x: b.x, y: b.y + 1, w: b.w, h: b.h }, sols)) b.onGround = true;
    // décoincement (une cellule est apparue sur nous)
    if (blockedBy(b, sols)) { for (let up = 1; up <= CS * 6; up++) { if (!blockedBy({ x: b.x, y: b.y - up, w: b.w, h: b.h }, sols)) { b.y -= up; break; } } }
    b.x = clamp(b.x, 0, L.w - b.w);
    if (b.y > L.h + 100) b.y = L.h + 100;
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
  function liquidOf(b) { const m = Sim.matAt(b.x + b.w / 2, b.y + b.h * 0.55); return P[m].liquid ? m : 0; }

  // ---------- Particules / messages / événements ----------
  function part(x, y, color, n = 6, spd = 80, life = 0.6, size = 3, grav = 0, type = 'dot') {
    for (let i = 0; i < n; i++) {
      const a = Math.random() * TAU, s = spd * (0.3 + Math.random() * 0.7);
      st.parts.push({ x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s - spd * 0.2, life, max: life, color, size: size * (0.6 + Math.random() * 0.8), grav, type });
    }
    if (st.parts.length > 900) st.parts.splice(0, st.parts.length - 900);
  }
  function msg(s, kind) { if (game) game.toast(s, kind); }
  function evt(n, d) { if (game) game.progress.event(n, d); }
  function inView(x, y) { return x > st.cam.x - 40 && x < st.cam.x + VW + 40 && y > st.cam.y - 40 && y < st.cam.y + VH + 40; }
  function onSimEvent(kind, x, y) {
    if (!st) return;
    if (kind === 'brule') { evt('brule'); return; }
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
    for (const o of st.objs) {
      if (o.t === 'torche' && o.lit) ls.push({ x: o.x + o.w / 2, y: o.y + 6, r: 230 });
      if (o.burning > 0) ls.push({ x: o.x + o.w / 2, y: o.y + o.h / 2, r: 130 });
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
    switch (core) {
      case 'feu':
        Sim.forRadius(cx, cy, rad, (x, y, i, m) => {
          const q = P[m]; const r = Math.random();
          if ((m === M.BOIS || m === M.PLANTE || m === M.HERBE) && Sim.aux[i] === 0) { if (r < pr * q.flam * 10) { Sim.aux[i] = q.burn; Sim.touch(i); } }
          else if (m === M.HUILE || m === M.SEVE) { if (r < pr) Sim.set(x, y, M.FEU, 30); }
          else if (m === M.EAU) { if (r < pr * 0.25) { Sim.set(x, y, M.VAPEUR, 50); } }
          else if (m === M.GLACE || m === M.NEIGE) { if (r < pr * 0.8) { Sim.set(x, y, M.EAU); } }
          else if (m === M.SABLE && power >= 1.6) { if (r < pr * 0.15) Sim.set(x, y, M.VERRE); }
          else if (m === M.AIR && burst) { const d = dist(cx, cy, (x + 0.5) * CS, (y + 0.5) * CS); if (d < rad * 0.6 && r < 0.35) Sim.set(x, y, M.FEU, 15 + (Math.random() * 15) | 0); }
        });
        break;
      case 'eau':
        Sim.forRadius(cx, cy, rad, (x, y, i, m) => {
          const r = Math.random();
          if (m === M.AIR) { const d = dist(cx, cy, (x + 0.5) * CS, (y + 0.5) * CS); if (d < rad * 0.75 && cap > 0 && r < pr * 0.6 && !pcell(cellRect(x, y))) { Sim.set(x, y, M.EAU); cap--; } }
          else if (m === M.FEU) Sim.set(x, y, M.VAPEUR, 30);
          else if ((m === M.BOIS || m === M.PLANTE || m === M.HERBE) && Sim.aux[i] > 0) { Sim.aux[i] = 0; Sim.touch(i); }
          else if (m === M.LAVE) { if (r < pr) Sim.set(x, y, M.OBSIDIENNE); }
          else if (m === M.ACIDE) { if (r < pr * 0.4) Sim.set(x, y, M.EAU); }
        });
        break;
      case 'vent':
        Sim.forRadius(cx, cy, rad, (x, y, i, m) => {
          const q = P[m]; if (m === M.AIR) return;
          if (m === M.FEU) { if (Math.random() < pr * 0.7) Sim.set(x, y, M.AIR); return; }
          if (q.gas || q.powder || (q.liquid && m !== M.LAVE)) { if (Math.random() < pr * 0.6) { const [nx, ny] = towards(x, y, -1); if (Sim.get(nx, ny) === M.AIR) Sim.swap(i, ny * Sim.W + nx); } }
        });
        break;
      case 'terre':
        if (!burst) break;
        Sim.forRadius(cx, cy, rad * 0.85, (x, y, i, m) => {
          const q = P[m]; if (q.solid) return;
          if (Math.random() < pr && !pcell(cellRect(x, y))) Sim.set(x, y, prm.persist > 0 ? M.PIERRE : M.TERRE);
        });
        break;
      case 'vie':
        Sim.forRadius(cx, cy, rad, (x, y, i, m) => {
          const r = Math.random();
          if (m === M.TERRE && Sim.get(x, y - 1) === M.AIR) { if (r < pr * 0.5) { Sim.set(x, y - 1, M.HERBE); evt('pousse'); } }
          else if (m === M.PLANTE && Sim.get(x, y - 1) === M.AIR) { if (r < pr * 0.5) { Sim.set(x, y - 1, M.PLANTE); evt('pousse'); } }
          else if (m === M.HERBE && Sim.get(x, y - 1) === M.AIR) { if (r < pr * 0.25) { Sim.set(x, y, M.PLANTE); evt('pousse'); } }
          else if (m === M.CENDRE) { if (r < pr * 0.4) Sim.set(x, y, M.TERRE); }
          if ((m === M.BOIS || m === M.PLANTE || m === M.HERBE) && Sim.aux[i] > 0) { Sim.aux[i] = 0; Sim.touch(i); }
        });
        break;
      case 'force':
        Sim.forRadius(cx, cy, rad, (x, y, i, m) => {
          const q = P[m]; if (m === M.AIR || q.solid && !q.powder) return;
          if (Math.random() < pr * 0.6) { const [nx, ny] = towards(x, y, 1); if (Sim.get(nx, ny) === M.AIR) Sim.swap(i, ny * Sim.W + nx); }
        });
        break;
      case 'froid':
        Sim.forRadius(cx, cy, rad, (x, y, i, m) => {
          const r = Math.random();
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
          else if (q.corrode > 0 && !q.liquid) { if (r < pr * q.corrode * 3) { Sim.set(x, y, r < 0.5 ? M.FUMEE : M.AIR, 20); if (r < 0.03) onSimEvent('corrosion', (x + 0.5) * CS, (y + 0.5) * CS); } }
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
  function applyEffect(core, cx, cy, rad, prm, mode, opts = {}) {
    const burst = mode === 'burst';
    const k = burst ? 1 : mode * 2.2;
    const power = prm.power || 1, dur = prm.duration || 1;
    const C = colorOf(core);
    if (burst) st.sp.push({ k: 'ring', core, x: cx, y: cy, r: rad, life: 0.4, max: 0.4, color: C });
    if (!opts.noGrid) gridEffect(core, cx, cy, rad, prm, burst, k);

    // --- créatures ---
    for (const c of st.crs) {
      if (c.hp <= 0) continue;
      if (!U.circleRect(cx, cy, rad, c)) continue;
      const ccx = c.x + c.w / 2, ccy = c.y + c.h / 2;
      let dx = ccx - cx, dy = ccy - cy; const d = Math.hypot(dx, dy) || 1; dx /= d; dy /= d;
      if (burst) evt('hit', 'creature:' + c.t);
      const sp = DATA.ESPECES[c.t];
      if (sp && burst) { if (core === sp.aime) evt('bestiaire', { t: c.t, k: 'aime' }); if (core === sp.craint) evt('bestiaire', { t: c.t, k: 'craint' }); }
      if (c.generique && sp) {
        const immune = (sp.immune || []).includes(core), faible = (sp.faible || []).includes(core) ? 2 : 1;
        if (core === sp.aime) { c.hp = Math.min(c.hpMax, c.hp + 2 * k); if (!c.sta.tame && (burst || Math.random() < k)) tame(c); if (burst) part(ccx, ccy - 8, '#c45a8a', 6, 50, 0.8, 3, -60, 'coeur'); continue; }
        if (core === sp.craint) { c.fuite = { x: cx, y: cy, t: 5 }; c.sta.stun = 0; c.dort = false; if (!immune) hurt(c, 1 * power * k * faible); c.vx += dx * 400 * k; c.vy -= 200 * k; if (burst) part(ccx, ccy, C, 6, 60); continue; }
        if (immune) { if (burst) part(ccx, ccy, '#aaa', 4, 40, 0.4); continue; }
        switch (core) {
          case 'feu': if (!c.sta.wet) { hurt(c, 2 * power * k * faible); c.sta.burn = Math.max(c.sta.burn, 3 * dur); } break;
          case 'eau': c.sta.burn = 0; c.sta.wet = 6; if (c.t === 'poisson') c.hp = Math.min(c.hpMax, c.hp + 2 * k); break;
          case 'vent': case 'son': c.vx += dx * 500 * power * k; c.vy += (dy * 300 - 150) * power * k; c.dort = false; break;
          case 'terre': if (burst) { hurt(c, 1 * power * faible); c.vy -= 200; } break;
          case 'lumiere': c.sta.stun = Math.max(c.sta.stun, (burst ? 2 : 0.4) * dur); break;
          case 'ombre': case 'silence': c.sta.sleep = Math.max(c.sta.sleep, (burst ? 6 : 0.5) * dur); break;
          case 'vie': c.hp = Math.min(c.hpMax, c.hp + 2 * k); if (!c.sta.tame && (burst || Math.random() < k * 0.5)) tame(c); break;
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
          if (c.t === 'golem') { if (burst) part(ccx, ccy, '#aaa', 4, 40, 0.4); }
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
        case 'ombre': c.sta.sleep = Math.max(c.sta.sleep, (burst ? 6 : 0.5) * dur); break;
        case 'vie':
          c.hp = Math.min(c.hpMax, c.hp + 2 * k); c.sta.burn = 0;
          if (!c.sta.tame && (burst || Math.random() < k * 0.5)) tame(c);
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
    // --- objets ---
    for (const o of st.objs) {
      if (o.mort || !U.circleRect(cx, cy, rad, o)) continue;
      const ocx = o.x + o.w / 2, ocy = o.y + o.h / 2;
      if (burst && o.t !== 'porte' && o.t !== 'pancarte') evt('hit', 'objet:' + o.t);
      switch (o.t) {
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
          if ((core === 'eau' || core === 'vent' || core === 'froid') && o.lit) { o.lit = false; part(o.x + 7, o.y + 4, '#999', 8, 40); }
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
      const n = Math.round(10 + rad / 6);
      const type = core === 'lumiere' || core === 'foudre' ? 'spark' : core === 'vie' ? 'feuille' : 'dot';
      part(cx, cy, C, n, 60 + rad, 0.7, 3, core === 'terre' ? 500 : core === 'eau' ? 400 : 0, type);
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
    c.hp -= dmg; c.hurt = 0.25;
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
      case 'temps': p.sta.hate = 10 * dur; msg('Le monde ralentit autour de toi.'); break;
      case 'ralentir': p.sta.lent = 6 * dur; msg('Tes jambes pèsent une tonne. Bien joué.'); break;
      case 'son': around({ noGrid: false }); st.shake = 0.3; msg('Un cri à réveiller les golems.'); break;
      case 'silence': around(); break;
      case 'esprit': { let best = null, bd = 220; for (const c of st.crs) if (c.hp > 0 && c.t !== 'familier') { const d = dist(pcx, pcy, c.x, c.y); if (d < bd) { bd = d; best = c; } } if (best) controlCreature(best, 12 * dur); else msg('Aucun esprit à portée.'); break; }
      case 'lien': { const h = Sim.raycast(pcx, pcy, (aim.x - pcx) / (dist(pcx, pcy, aim.x, aim.y) || 1), (aim.y - pcy) / (dist(pcx, pcy, aim.x, aim.y) || 1), 320 * (prm.range || 1)); if (h) attachLien(null, h.x, h.y, dur); else msg('La corde ne trouve rien à saisir.'); break; }
      case 'portail': { const q = st.portails[st.portails.length - 1]; if (q) { p.x = q.x - p.w / 2; p.y = q.y - p.h / 2; p.vx = 0; p.vy = 0; part(q.x, q.y, C, 14, 80); msg('Tu traverses jusqu\'à ton dernier portail.'); } else msg('Aucun portail n\'est ouvert.'); break; }
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
  function makeSpec(seal, depth = 0) {
    const prm = Seal.params(seal);
    let cores = [seal.core]; if (seal.core2) cores.push(seal.core2);
    if (prm.inverse) { prm.gInv = cores.includes('gravite'); cores = cores.map((c) => (c === 'gravite' ? c : DATA.INVERSE[c] || c)); }
    const combo = seal.core2 && !prm.inverse ? [seal.core, seal.core2].sort().join('|') : null;
    return { cores, prm, trig: seal.trigger || 'immediat', subs: depth < 2 ? Seal.subs(seal) : [], combo, color: colorOf(cores[0]), core: cores[0], depth, nom: Seal.nom(seal) };
  }
  // Éclatement complet : chaque effet, la fusion, l'écho, les sous-sceaux
  function doBurst(spec, x, y, r, opts = {}, dir = null) {
    const pm = spec.cores.length > 1 ? 0.85 : 1;
    for (const core of spec.cores) applyEffect(core, x, y, r, { ...spec.prm, power: spec.prm.power * pm }, 'burst', opts);
    if (spec.combo) comboEffect(spec.combo, x, y, r, spec.prm);
    if (spec.prm.echo > 0 && !opts.noEcho) st.sp.push({ k: 'echo', spec, x, y, r, opts: { ...opts, noEcho: true }, t: 0.5, left: spec.prm.echo });
    for (const sub of spec.subs) launch(sub, { x, y }, { x: x + (dir ? dir.x : 0) * 100, y: y + (dir ? dir.y : -1) * 100 }, { depth: spec.depth + 1 });
  }
  function doContinuous(spec, x, y, r, dt, opts = {}) {
    for (const core of spec.cores) applyEffect(core, x, y, r, { ...spec.prm, power: spec.prm.power * 0.5 }, dt, opts);
  }
  function comboEffect(key, x, y, r, prm) {
    const C = DATA.COMBOS[key]; const size = prm.size || 1, dur = prm.duration || 1;
    if (C && C.nom) st.sp.push({ k: 'label', x, y: y - 40, txt: C.nom, life: 1.6, max: 1.6 });
    evt('combo', key);
    switch (key) {
      case 'feu|vent': st.sp.push({ k: 'field', core: 'feu', x, y, r: r * 0.7, life: 5 * dur, max: 5 * dur, prm, vx: (Math.random() < 0.5 ? -1 : 1) * 60 }); break;
      case 'feu|terre': { let cap = 25 * size; Sim.forRadius(x, y, r * 0.6, (cx, cy, i, m) => { if (cap > 0 && (m === M.TERRE || m === M.PIERRE || m === M.SABLE) && Math.random() < 0.7) { Sim.set(cx, cy, M.LAVE); cap--; } }); break; }
      case 'eau|feu': Sim.forRadius(x, y, r * 1.2, (cx, cy, i, m) => { if (m === M.AIR && Math.random() < 0.5) Sim.set(cx, cy, M.VAPEUR, 80 + (Math.random() * 60) | 0); }); break;
      case 'eau|froid': Sim.forRadius(x, y, r * 0.7, (cx, cy, i, m) => { if ((m === M.AIR || m === M.EAU) && !U.rectsOverlap({ x: cx * CS, y: cy * CS, w: CS, h: CS }, st.p)) Sim.set(cx, cy, M.GLACE); }); break;
      case 'eau|foudre': Sim.forRadius(x, y, r * 2.2, (cx, cy, i, m) => { if (P[m].cond) { Sim.elec[i] = 60; Sim.touch(i); } }); for (let k = 0; k < 30; k++) { const cx = Math.floor((x - r + Math.random() * 2 * r) / CS), cy = Math.floor(y / CS) - 20 - Math.floor(Math.random() * 10); if (Sim.get(cx, cy) === M.AIR) Sim.set(cx, cy, M.EAU); } break;
      case 'froid|vent': { let cap = 40 * size; Sim.forRadius(x, y - r * 0.5, r, (cx, cy, i, m) => { if (cap > 0 && m === M.AIR && Math.random() < 0.3) { Sim.set(cx, cy, M.NEIGE); cap--; } }); break; }
      case 'eau|vie': for (let k = 0; k < 3; k++) gridEffect('vie', x, y, r * 1.3, prm, true, 1); break;
      case 'lumiere|ombre': msg('Lumière et ombre s\'annulent dans un silence gêné.'); break;
      case 'force|terre': st.shake = 0.6; for (const c of st.crs) if (c.hp > 0 && dist(x, y, c.x, c.y) < r * 3) { c.sta.stun = Math.max(c.sta.stun, 3); c.vy -= 200; } break;
      case 'gravite|vent': addGField(x, y - r, r * 1.5, 0, -1, 1.1, 12 * dur); break;
      case 'force|gravite': st.sp.push({ k: 'singularite', x, y, r: r * 2.2, life: 3 * dur, max: 3 * dur }); break;
      case 'gravite|terre': { const g = Math.floor(x / CS), top = 2; for (let yy = top; yy < top + 6; yy++) for (let xx = g - 3; xx <= g + 3; xx++) if (Sim.get(xx, yy) === M.AIR && Math.hypot(xx - g, yy - top - 3) < 3.3) Sim.set(xx, yy, M.PIERRE); addGField(x, (top + 3) * CS, 40, 0, 1, 3, 3); msg('Un météore se détache du ciel...'); break; }
      case 'eau|gravite': { spawnLiquid(M.EAU, x, y - 30, 40); addGField(x, y - 30, r, 0, 1, 0, 10 * dur); break; }
      case 'gravite|temps': addGField(x, y, r * 1.4, 0, 1, 0.25, 10 * dur); break;
      case 'feu|froid': Sim.forRadius(x, y, r, (cx, cy, i, m) => { if (m === M.PIERRE && Math.random() < 0.5) Sim.set(cx, cy, M.SABLE); else if (m === M.AIR && Math.random() < 0.3) Sim.set(cx, cy, M.VAPEUR, 40); }); break;
      case 'acide|feu': Sim.forRadius(x, y, r * 1.3, (cx, cy, i, m) => { if (m === M.AIR && Math.random() < 0.5) Sim.set(cx, cy, M.FUMEE, 120); }); for (const c of st.crs) if (c.hp > 0 && dist(x, y, c.x, c.y) < r * 1.5) c.sta.sleep = Math.max(c.sta.sleep, 8 * dur); break;
      case 'ombre|vie': { const g = groundBelow(x, y); if (g != null) { for (let k = 0; k < 2; k++) st.objs.push(makeObj({ t: 'champignon', x: x - 20 + k * 30, y: g - 26 })); } break; }
      case 'eau|terre': Sim.forRadius(x, y, r, (cx, cy, i, m) => { if (m === M.TERRE && Math.random() < 0.8) Sim.set(cx, cy, M.SABLE); }); break;
      case 'feu|lumiere': st.sp.push({ k: 'field', core: 'lumiere', x, y, r: r * 3, life: 12 * dur, max: 12 * dur, prm, faible: true }); break;
      case 'foudre|metal': Sim.forRadius(x, y, r * 2, (cx, cy, i, m) => { if (m === M.METAL) { Sim.elec[i] = 250; Sim.touch(i); } }); break;
      case 'temps|vie': for (let k = 0; k < 4; k++) gridEffect('vie', x, y, r * 1.5, prm, true, 1); for (let k = 0; k < 3; k++) gridEffect('temps', x, y, r * 1.5, prm, true, 1); break;
      case 'portail|eau': { const q = st.portails[0]; if (q) spawnLiquid(M.EAU, q.x, q.y, 40); break; }
    }
  }
  function groundBelow(x, y) { for (let yy = y; yy < L.h; yy += CS) if (Sim.solidAt(x, yy)) return yy - (yy % CS); return null; }

  // ---------- Lancer un sceau ----------
  function castSeal(seal, aim, gratuit) {
    const p = st.p;
    const cost = gratuit ? 0 : Seal.cost(seal);
    if (p.ink < cost) { msg('Plus assez d\'encre (' + Math.floor(p.ink) + '/' + cost + ').', 'warn'); Son.sfx('fail'); return false; }
    p.ink -= cost;
    if (gratuit) part(p.x + p.w / 2, p.y + p.h * 0.4, '#efe3c4', 8, 40, 0.6, 3, 60);
    const pcx = p.x + p.w / 2, pcy = p.y + p.h * 0.45;
    if (!seal.core) { part(pcx, pcy - 20, '#777', 14, 50, 1, 4); Son.sfx('fizzle'); msg('Pfft. Un pétard de fumée grise. Il manque un glyphe d\'effet.'); p.ink = Math.min(p.inkMax, p.ink + cost - 1); return true; }
    if (!seal.shape) { applyEffect(seal.core, pcx, pcy, 45, { ...Seal.params(seal), power: 0.5 }, 'burst', { noPlayer: seal.core !== 'feu' }); msg('Sans forme, l\'effet se répand mollement autour de toi.'); return true; }
    if (seal.core === 'terre' || seal.core2 === 'terre') evt('terre');
    launch(seal, { x: pcx, y: pcy }, aim, { depth: 0, player: true });
    return true;
  }
  // Lance un sceau depuis un point (joueur ou sous-sceau)
  function launch(seal, origin, aim, o = {}) {
    if (!seal.core || !seal.shape) return;
    const p = st.p;
    const spec = makeSpec(seal, o.depth || 0);
    const prm = spec.prm, trig = spec.trig, C = spec.color;
    const ox = origin.x, oy = origin.y;
    let dx = aim.x - ox, dy = aim.y - oy; const d = Math.hypot(dx, dy) || 1; dx /= d; dy /= d;
    if (o.player) Son.sfx('cast', spec.core);
    const canal = prm.canalise && o.player;
    if (canal && seal.shape !== 'projectile' && seal.shape !== 'soi' && seal.shape !== 'chaine') {
      st.sp.push({ k: 'canal', spec, t: 0, tick: 0, range: 260 * prm.range, r: 50 * prm.size, cost: Math.max(1, Seal.cost(seal) * 0.25) });
      msg('Maintiens le clic pour canaliser.');
      return;
    }
    switch (seal.shape) {
      case 'projectile': case 'chaine': {
        if (prm.orbite && o.player) {
          for (let i = 0; i < 3; i++) st.sp.push({ k: 'orbit', spec, a: (i / 3) * TAU, r: 10 * prm.size, life: 6 * prm.duration, hits: new Map(), color: C });
          break;
        }
        const n = 1 + prm.extra;
        for (let i = 0; i < n; i++) {
          const spread = n > 1 ? (i - (n - 1) / 2) * 0.22 : 0;
          const a = Math.atan2(dy, dx) + spread;
          const sp = (spec.core === 'foudre' ? 800 : 520) * prm.speed;
          const floats = ['lumiere', 'vent', 'ombre', 'foudre', 'gravite', 'son', 'esprit', 'temps'].includes(spec.core);
          st.sp.push({ k: 'proj', spec, core: spec.core, x: ox + Math.cos(a) * 20, y: oy + Math.sin(a) * 20, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp,
            r: 8 * prm.size, prm, trig, bounces: prm.bounces, life: 1.1 * prm.range, grav: floats ? 40 : 420 / prm.speed, hits: new Set(), color: C, trail: 0,
            chain: seal.shape === 'chaine' ? 3 + (prm.extra ? 2 : 0) : 0, guide: prm.teleguide && o.player });
        }
        break;
      }
      case 'soi':
        if (!o.player) { doBurst(spec, ox, oy, 60 * prm.size, { noPlayer: true }); break; }
        if (trig === 'immediat') selfCast(spec, aim);
        else if (trig === 'contact') { p.trap = { spec }; msg('Le sceau attend sur ta peau. Il éclatera au premier contact.'); }
        else { p.selfTimer = { spec, t: 2, aim: { ...aim } }; msg('Le sceau s\'enroule autour de toi... deux secondes.'); }
        break;
      case 'zone': case 'mur': {
        const range = 260 * prm.range; const dd = Math.min(d, range); const n = 1 + prm.extra;
        for (let i = 0; i < n; i++) {
          const off = n > 1 ? (i - (n - 1) / 2) * 90 * prm.size : 0;
          const tx = ox + dx * dd + -dy * off, ty = oy + dy * dd + dx * off;
          if (seal.shape === 'mur') {
            for (let k = -2; k <= 2; k++) { const yy = ty + k * 36 * prm.size; if (trig === 'immediat') doBurst(spec, tx, yy, 24 * prm.size, { noField: k !== 0, noEcho: k !== 0 }); else st.sp.push({ k: 'timer', spec, x: tx, y: yy, r: 24 * prm.size, t: trig === 'retarde' ? 2 : 0.1 + Math.abs(k) * 0.1, color: C, noField: k !== 0 }); }
          } else {
            const r = 70 * prm.size;
            if (trig === 'immediat') doBurst(spec, tx, ty, r, {}, { x: dx, y: dy });
            else if (trig === 'contact') st.sp.push({ k: 'trap', spec, x: tx, y: ty, r: r * 0.85, prm, life: 20 * prm.duration, color: C, t: 0 });
            else st.sp.push({ k: 'timer', spec, x: tx, y: ty, r, t: 2, color: C });
          }
        }
        break;
      }
      case 'trait':
        if (trig === 'retarde') { st.sp.push({ k: 'beamtimer', spec, x: ox, y: oy, dx, dy, prm, t: 2, color: C }); if (o.player) msg('Le trait se charge...'); }
        else fireBeam(spec, ox, oy, dx, dy, trig);
        break;
      case 'aura': st.sp.push({ k: 'field', spec, core: spec.core, x: ox, y: oy, r: 70 * prm.size, life: 6 * prm.duration, max: 6 * prm.duration, prm, follow: true }); if (o.player) msg('L\'effet t\'enveloppe un moment.'); break;
      case 'totem': { const range = 260 * prm.range; const dd = Math.min(d, range); const tx = ox + dx * dd, ty = oy + dy * dd; const g = groundBelow(tx, ty); st.sp.push({ k: 'totem', spec, x: tx, y: g != null ? g : ty, r: 60 * prm.size, life: 20 * prm.duration, max: 20 * prm.duration, t: 0.5, color: C }); break; }
      case 'pluie': { const range = 320 * prm.range; const dd = Math.min(d, range); const tx = ox + dx * dd; st.sp.push({ k: 'rain', spec, x: tx, w: 120 * prm.size, yTop: Math.max(30, oy - 320), life: 3 * prm.duration, t: 0, color: C }); break; }
      case 'objet': {
        const range = 260 * prm.range; const dd = Math.min(d, range); const tx = ox + dx * dd, ty = oy + dy * dd;
        let best = null, bd = 140;
        for (const q of st.objs) if ((q.t === 'caisse' || q.t === 'rocher') && !q.mort) { const dq = dist(tx, ty, q.x + q.w / 2, q.y + q.h / 2); if (dq < bd) { bd = dq; best = q; } }
        for (const c of st.crs) if (c.hp > 0) { const dq = dist(tx, ty, c.x + c.w / 2, c.y + c.h / 2); if (dq < bd) { bd = dq; best = c; } }
        if (best) { best.ench = { spec, t: 15 * prm.duration, tick: 0 }; part(best.x + best.w / 2, best.y, C, 12, 60, 0.8, 3, 0, 'spark'); if (o.player) msg('L\'objet porte maintenant l\'effet.'); }
        else if (o.player) msg('Rien à enchanter par ici.');
        break;
      }
      case 'invocation': {
        const f = makeCreature({ t: 'familier', x: ox, y: oy - 30 });
        f.spec = spec; f.core = spec.core; f.life = 30 * prm.duration; f.sta.tame = true; f.filDonne = true; f.vole = true; f.hp = 4; f.hpMax = 4; f.dmg = 0; f.w = 20; f.h = 20; f.cd = 0; f.x0 = ox; f.y0 = oy - 40;
        st.crs.push(f); if (o.player) msg('Un petit familier de ' + (DATA.CORES[spec.core] || DATA.PSEUDO[spec.core]).nom.toLowerCase() + ' t\'accompagne.');
        break;
      }
    }
  }
  function selfCast(spec, aim) {
    for (const core of spec.cores) applySelf(core, spec.prm, aim, spec);
    if (spec.combo) comboEffect(spec.combo, st.p.x + st.p.w / 2, st.p.y + st.p.h / 2, 60 * (spec.prm.size || 1), spec.prm);
    for (const sub of spec.subs) launch(sub, { x: st.p.x + st.p.w / 2, y: st.p.y + st.p.h / 2 }, aim, { depth: spec.depth + 1 });
  }
  function fireBeam(spec, x, y, dx, dy, trig) {
    const prm = spec.prm, C = spec.color, core = spec.core;
    const len = 320 * prm.range;
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
    st.sp.push({ k: 'beam', core, x1: x, y1: y, x2: ex, y2: ey, life: 0.35, max: 0.35, color: C, w: 6 * prm.size });
    Son.sfx('cast', core);
    if (trig === 'contact') doBurst(spec, ex, ey, 55 * prm.size, { noPlayer: true }, { x: dx, y: dy });
    else {
      for (let t = 10; t < Math.hypot(ex - x, ey - y); t += 14) for (const c of spec.cores) gridEffect(c, x + dx * t, y + dy * t, 9 * prm.size, { ...prm, power: prm.power * 0.6 }, true, 1);
      for (const e of touched) for (const c of spec.cores) applyEffect(c, e.x + e.w / 2, e.y + e.h / 2, Math.max(e.w, e.h) * 0.6, { ...prm, power: prm.power * 0.8 }, 'burst', { noPlayer: true, noField: true, noGrid: true });
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
  function spawnLiquid(m, x, y, n) {
    let left = n;
    for (let r = 4; r <= 40 && left > 0; r += 6) Sim.forRadius(x, y - 6, r, (cx, cy, i, q) => { if (left > 0 && q === M.AIR) { Sim.set(cx, cy, m); left--; } });
  }
  function potionBurst(id, x, y, forte) {
    const Pn = DATA.POTIONS[id];
    part(x, y, Pn.couleur, 16, 100, 0.8, 3, 200);
    const F = forte ? 1.6 : 1;
    const prm = { power: 1.6 * F, size: 1.2 * F, duration: F, persist: 0 };
    switch (id) {
      case 'flamme': applyEffect('feu', x, y, 70, { ...prm, persist: 1 }, 'burst'); break;
      case 'croissance': applyEffect('vie', x, y, 130, { ...prm, power: 1 }, 'burst', { noPlayer: true }); for (const c of st.crs) if (U.circleRect(x, y, 130, c) && c.t === 'limace') { c.size = Math.min(2.2, c.size + 0.3); c.w = 36 * c.size; c.h = 24 * c.size; } msg('Tout verdit alentour.'); break;
      case 'calme': for (const c of st.crs) if (c.hp > 0 && U.circleRect(x, y, 140, c) && !c.sta.tame) tame(c); st.sp.push({ k: 'ring', core: 'vie', x, y, r: 140, life: 0.5, max: 0.5, color: Pn.couleur }); msg('Un calme rose se répand.'); break;
      case 'gel': applyEffect('froid', x, y, 80, prm, 'burst'); break;
      case 'orage': applyEffect('foudre', x, y, 80, prm, 'burst'); break;
      case 'vitriol': applyEffect('acide', x, y, 60, { ...prm, size: 1.6 }, 'burst'); break;
      case 'gregeois': spawnLiquid(M.HUILE, x, y, 40); setTimeout(() => {}, 0); Sim.forRadius(x, y - 10, 30, (cx, cy, i, q) => { if (q === M.AIR && Math.random() < 0.3) Sim.set(cx, cy, M.FEU, 30); }); applyEffect('feu', x, y, 50, { ...prm, power: 1 }, 'burst', { noGrid: true }); break;
      case 'glu': spawnLiquid(M.SEVE, x, y, 30); msg('Une flaque de sève. Qui va marcher dedans ?'); break;
      case 'petard': Sim.forRadius(x, y, 60, (cx, cy, i, q) => { if (q === M.AIR && Math.random() < 0.5) Sim.set(cx, cy, M.FUMEE, 90); }); Son.sfx('fizzle'); for (const c of st.crs) if (U.circleRect(x, y, 160, c)) { c.sta.sleep = 0; c.curieux = { x, y, t: 6 }; } msg('Pof. Un bruit ridicule, et beaucoup de fumée.'); break;
      case 'savon': { const ps = st.p; if (U.circleRect(x, y, 120, ps)) ps.sta.glisse = 15; for (const c of st.crs) if (U.circleRect(x, y, 120, c)) c.sta.glisse = 15; part(x, y, '#ffffff', 30, 90, 1.2, 4, -80); st.sp.push({ k: 'ring', core: 'eau', x, y, r: 120, life: 0.5, max: 0.5, color: '#e8e0c0' }); msg('Tout glisse ! Même toi.'); break; }
    }
    Son.sfx('burst', 'eau');
  }

  // ---------- Mains : interagir, creuser, porter ----------
  function nearestLiquid(px, py, r) {
    let best = null, bd = 1e9;
    Sim.forRadius(px, py, r, (x, y, i, m) => { if (P[m].liquid) { const d = dist(px, py, (x + 0.5) * CS, (y + 0.5) * CS); if (d < bd) { bd = d; best = { x, y, m }; } } });
    return best;
  }
  function interactible(o) {
    if (o.mort) return false;
    if (o.t === 'porte') return true;
    if (o.t === 'champignon') return !o.pris;
    if (o.t === 'graine') return o.stage === 1 && o.racine && o.hauteur >= o.hMax;
    if (o.t === 'rune') return o.revele >= 1 && o.cooldown <= 0;
    if (o.t === 'page') return !o.lue;
    return false;
  }
  function findInteraction() {
    const p = st.p; const pcx = p.x + p.w / 2, pcy = p.y + p.h / 2;
    for (const o of st.objs) { if (interactible(o) && dist(pcx, pcy, o.x + o.w / 2, o.y + o.h / 2) < 70 + Math.max(o.w, o.h) / 2) return { t: o.t, o }; }
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
    Sim.forRadius(tx, ty, 11, (x, y, i, m) => {
      if (n >= 3 || !P[m].dig) return;
      if (m === M.CRISTAL && Math.random() > 0.25) return;
      Sim.set(x, y, M.AIR); n++;
      const r = Math.random();
      if (m === M.NEIGE && r < 0.12) got.push('flocon');
      else if (m === M.CRISTAL && r < 0.6) got.push('eclat');
      else if ((m === M.HERBE || m === M.PLANTE) && r < 0.12) got.push('rosee');
      part((x + 0.5) * CS, (y + 0.5) * CS, P[m].color, 1, 40, 0.5, 2, 300);
    });
    for (const g of got) game.gainIngredient(g);
    if (n > 0) { p.anim += 0.5; if (Math.random() < 0.3) Son.sfx('step', 'terre'); }
  }

  // ---------- Mise à jour ----------
  function update(dt, inp, aim) {
    time += dt;
    const p = st.p;
    updateGFields(dt);
    Sim.step();
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
    p.ink = Math.min(p.inkMax, p.ink + dt * p.inkRegen);
    // statuts qui blessent / coûtent
    if (p.sta.burning > 0 && !p.sta.stone) { p.hp -= dt * 0.8; if (Math.random() < 0.3) part(p.x + p.w / 2, p.y + p.h * 0.3, '#d9622b', 1, 40, 0.5, 3, -150); }
    if (p.sta.lumiere > 0 && Math.random() < 0.2) part(p.x + p.w / 2, p.y + p.h * 0.4, '#d8a63a', 1, 30, 0.6, 2, -40, 'spark');
    if (p.sta.invisible > 0 && Math.random() < 0.2) part(p.x + p.w / 2, p.y + p.h * 0.5, '#5a4a7d', 1, 30, 0.6, 2, -30);
    if (p.sta.hoquet > 0 && Math.random() < dt * 2) { const cx = Math.floor((p.x + p.w / 2) / CS), cy = Math.floor(p.y / CS) - 1; if (Sim.get(cx, cy) === M.AIR) Sim.set(cx, cy, M.FUMEE, 60); Son.sfx('click'); }
    if (p.sta.glouglou > 0 && Math.random() < dt * 6) { const cx = Math.floor((p.x + Math.random() * p.w) / CS), cy = Math.floor((p.y + p.h) / CS); if (Sim.get(cx, cy) === M.AIR) Sim.set(cx, cy, M.EAU); }
    if (p.sta.vol > 0) { p.ink -= dt * 1.2; if (p.ink <= 0) { p.ink = 0; p.sta.vol = 0; msg('Plus d\'encre : tu retombes.', 'warn'); } if (Math.random() < 0.3) part(p.x + p.w / 2, p.y + p.h, '#6c5ab8', 1, 30, 0.6, 2, 60, 'spark'); }
    // liquide où l'on se trouve
    p.liq = liquidOf(p);
    const inWater = p.liq === M.EAU || p.liq === M.HUILE || p.liq === M.ACIDE || p.liq === M.SEVE;
    if (p.liq === M.EAU) { p.sta.wet = 8; p.sta.burning = 0; }
    if (p.liq === M.LAVE && !p.sta.stone) { p.hp -= dt * 3; p.sta.burning = 2; if (Math.random() < 0.5) part(p.x + p.w / 2, p.y + p.h, '#e0622b', 2, 60, 0.5, 3, -200); }
    if (p.liq === M.ACIDE && !p.sta.stone && !p.sta.dissous) { p.hp -= dt * 1.2; if (Math.random() < 0.3) part(p.x + p.w / 2, p.y + p.h * 0.6, '#8fbf2a', 1, 40, 0.5, 3, -100); }
    if (p.liq === M.EAU && p.sta.branchies <= 0 && Sim.matAt(p.x + p.w / 2, p.y + 4) === M.EAU) { p.air = (p.air || 8) - dt; if (p.air <= 0) { p.hp -= dt * 1.5; if (Math.random() < 0.05) msg('Tu manques d\'air !', 'warn'); } } else p.air = 8;
    // patins de givre : geler l'eau sous les pieds
    if (p.sta.patins > 0) { Sim.forRadius(p.x + p.w / 2, p.y + p.h + 3, 16, (x, y, i, m) => { if (m === M.EAU && Math.random() < 0.5) Sim.set(x, y, M.GLACE); }); }
    // acide sur soi : dissoudre autour
    if (p.sta.dissous > 0) { Sim.forRadius(p.x + p.w / 2, p.y + p.h / 2, p.h * 0.7, (x, y, i, m) => { const q = P[m]; if (q.corrode > 0 && !q.liquid && Math.random() < q.corrode * 0.6) Sim.set(x, y, Math.random() < 0.5 ? M.FUMEE : M.AIR, 15); }); }

    // --- déplacement ---
    const speedMul = (p.sta.vitesse > 0 || p.sta.hate > 0 ? 1.7 : 1) * (p.sta.lent > 0 ? 0.4 : 1) * (p.sta.small > 0 ? 0.8 : 1) * (p.liq === M.SEVE ? 0.25 : 1);
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
    updateLien(dt, inp);
    updatePortails(dt);
    // pousser une caisse
    if (dirX !== 0) for (const o of st.objs) if (o.t === 'caisse' && !o.mort && !o.carried) { const probe = { x: p.x + dirX * 2, y: p.y, w: p.w, h: p.h }; if (U.rectsOverlap(probe, o)) o.vx = dirX * (p.sta.geant > 0 ? 160 : 70); }
    if (p.y > L.h + 50) { msg('Tu tombes dans l\'encre noire... et te réveilles devant ta porte.'); respawn(); }
    if (p.onGround && Math.abs(p.vx) > 30 && Math.random() < dt * 6) Son.sfx('step', 'terre');
    if (p.selfTimer) { p.selfTimer.t -= dt; if (p.selfTimer.t <= 0) { const q = p.selfTimer; p.selfTimer = null; selfCast(q.spec, q.aim); } }
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
    if (p.onGround && p.y < 85 * CS) { if (st.ileT <= 0) { st.ileT = 120; game.observe('ile'); } const idx = [110, 300, 520, 730].reduce((b, cx, i, a) => (Math.abs(cx * CS - p.x) < Math.abs(a[b] * CS - p.x) ? i : b), 0); evt('ile', idx); } if (st.ileT > 0) st.ileT -= dt;
    // défis : lac sec, sommet, profondeur
    { const lx0 = 222 * CS, lx1 = 328 * CS; const px = p.x + p.w / 2;
      if (px < lx0) st.lac = { wet: false, from: 'ouest' };
      else if (px > lx1) { if (st.lac && st.lac.from === 'ouest' && !st.lac.wet) st.lacSec = true; st.lac = null; }
      else if (st.lac && (p.sta.wet > 0 || p.liq)) st.lac.wet = true; }
    if (p.x > 380 * CS && p.x < 420 * CS && p.y < 90 * CS) st.vuSommet = true;
    st.maxDepth = Math.max(st.maxDepth, (p.y + p.h) / CS);
    st.defiT -= dt; if (st.defiT <= 0) { st.defiT = 1; game.checkDefis(defiInfo()); }
    // zone courante
    const z = L.zones.find((z) => p.x >= z.x && p.x < z.x + z.w);
    if (z && z.nom !== st.lastZone) { st.lastZone = z.nom; game.zoneChange(z.nom); }

    updateObjs(dt);
    updateCreatures(dt);
    updateSpells(dt);
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
  function addGField(x, y, r, gx, gy, mag, life) {
    st.gz.push({ x, y, r, gx, gy, mag, life, max: life });
    part(x, y, '#6c5ab8', 14, 60, 0.8, 2, 0, 'spark');
  }
  function gravOf(b) {
    const cx = b.x + b.w / 2, cy = b.y + b.h / 2;
    for (const z of st.gz) if ((cx - z.x) * (cx - z.x) + (cy - z.y) * (cy - z.y) <= z.r * z.r) return z;
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
    for (const z of st.gz) z.life -= dt;
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

  function updateMeteo(dt) {
    st.tod = (st.tod + dt / DAY) % 1;
    const m = st.meteo; m.t -= dt;
    if (m.t <= 0) {
      const r = Math.random();
      if (m.type === 'clair') { m.type = 'nuages'; m.t = 30 + Math.random() * 40; }
      else if (m.type === 'nuages') { if (r < 0.4) { m.type = 'pluie'; m.t = 40 + Math.random() * 40; } else if (r < 0.65) { m.type = 'orage'; m.t = 35 + Math.random() * 30; msg('Le ciel gronde...'); } else { m.type = 'clair'; m.t = 90 + Math.random() * 120; } }
      else { m.type = r < 0.5 ? 'clair' : 'nuages'; m.t = 60 + Math.random() * 120; }
    }
    Sim.sunny = m.type === 'clair' && daylight() > 0.4;
    if (m.type === 'pluie' || m.type === 'orage') {
      st.rainT += dt;
      if (st.p.y < (Sim.surf ? Sim.surf[clamp(Math.floor(st.p.x / CS), 0, Sim.W - 1)] * CS + 20 : 1e9)) { st.pluieT += dt; if (st.pluieT > 4) { st.pluieT = -120; game.observe('pluie'); } }
      const n = m.type === 'orage' ? 2 : 1;
      for (let k = 0; k < n; k++) {
        const x = Math.floor((st.cam.x - 300 + Math.random() * (VW + 600)) / CS);
        if (x > 0 && x < Sim.W - 1 && Sim.get(x, 1) === M.AIR) Sim.set(x, 1, M.EAU);
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
    st.eclairs.push({ x: sx, y1: sy, pts, life: 0.35 });
    st.flash = 0.12; Son.sfx('burst', 'foudre'); st.shake = 0.2;
    applyEffect('foudre', sx, sy, 40, { power: 1.5, size: 1, duration: 1, persist: 0 }, 'burst', { noField: true });
    onSimEvent('foudre', sx, sy);
  }

  function updateObjs(dt) {
    for (const o of st.objs) {
      if (o.mort) continue;
      switch (o.t) {
        case 'caisse': case 'rocher':
          if (o.ench) { o.ench.t -= dt; if (o.ench.t <= 0) o.ench = null; else { doContinuous(o.ench.spec, o.x + o.w / 2, o.y + o.h / 2, 50 * (o.ench.spec.prm.size || 1), dt, { noPlayer: true, noField: true }); if (Math.random() < 0.3) part(o.x + Math.random() * o.w, o.y + Math.random() * o.h, o.ench.spec.color, 1, 20, 0.5, 2, -40, 'spark'); } }
          if (o.carried) break;
          applyGrav(o, dt);
          o.vx *= Math.max(0, 1 - (o.onGround ? 6 : 1) * dt);
          moveBody(o, dt, o);
          { const lq = liquidOf(o); if (lq === M.EAU || lq === M.HUILE) { o.vy -= 1400 * dt; if (o.t === 'caisse') o.burning = 0; } if (lq === M.LAVE && o.t === 'caisse') o.burning = 3; }
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
        case 'rune': if (st.p.sta.vision > 0 && dist(o.x + 20, o.y + 30, st.p.x, st.p.y) < 500) o.revele = Math.min(1, o.revele + dt); if (o.cooldown > 0) o.cooldown -= dt; break;
      }
    }
    st.objs = st.objs.filter((o) => !o.mort);
  }

  function updateCreatures(dt) {
    const p = st.p; const pcx = p.x + p.w / 2, pcy = p.y + p.h / 2;
    for (const c of st.crs) {
      if (c.hp <= 0) { c.respawn -= dt; if (c.respawn <= 0) { c.hp = c.hpMax; c.x = c.x0; c.y = c.y0; c.vx = 0; c.vy = 0; c.size = 1; c.sta.tame = false; if (c.t === 'limace') { c.w = 36; c.h = 24; } } continue; }
      if (c.carried) { c.sta.burn = 0; continue; }
      for (const k of ['burn', 'stun', 'sleep', 'wet', 'glisse', 'lent']) if (c.sta[k] > 0) c.sta[k] = Math.max(0, c.sta[k] - dt);
      if (c.curieux) { c.curieux.t -= dt; if (c.curieux.t <= 0) c.curieux = null; }
      if (c.ench) { c.ench.t -= dt; c.ench.tick += dt; if (c.ench.t <= 0) c.ench = null; else { doContinuous(c.ench.spec, c.x + c.w / 2, c.y + c.h / 2, 50 * (c.ench.spec.prm.size || 1), dt, { noPlayer: true, noField: true }); if (Math.random() < 0.3) part(c.x + Math.random() * c.w, c.y + Math.random() * c.h, c.ench.spec.color, 1, 20, 0.5, 2, -40, 'spark'); } }
      if (c.t === 'familier') { updateFamilier(c, dt, p); continue; }
      // cadeaux des créatures apprivoisées
      if (c.sta.tame && DATA.ESPECES[c.t] && DATA.ESPECES[c.t].drop) { c.cadeauT += dt; if (c.cadeauT > 90) { c.cadeauT = 0; dropPickup(DATA.ESPECES[c.t].drop, c.x + c.w / 2, c.y - 8); evt('cadeau'); msg(nomCreature(c.t) + ' te fait un cadeau.'); } }
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
        applyGrav(c, dt, lq ? 0.2 : 1);
        if (lq) c.vy *= Math.max(0, 1 - 1.5 * dt);
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
        if (p.sta.stone <= 0 && p.sta.armure <= 0) { p.hp -= c.dmg; Son.sfx('hurt'); msg(nomCreature(c.t) + ' te bouscule !', 'warn'); st.shake = 0.25; }
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
      applyGrav(c, dt, lq ? 0.2 : 1);
      if (lq) c.vy *= Math.max(0, 1 - 1.5 * dt);
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
      if (p.sta.stone <= 0 && p.sta.armure <= 0 && c.dmg > 0) { p.hp -= c.dmg; Son.sfx('hurt'); msg(nomCreature(c.t) + ' te bouscule !', 'warn'); }
      c.vx = -dx * 150;
    }
  }
  function updateFamilier(c, dt, p) {
    c.life -= dt; c.cd -= dt;
    if (c.life <= 0 || c.hp <= 0) { c.hp = 0; c.respawn = 1e9; c.mort = true; part(c.x + c.w / 2, c.y + c.h / 2, c.spec.color, 10, 60); return; }
    // cible : créature hostile proche ; sinon suit le joueur
    let target = null, bd = 220;
    for (const q of st.crs) if (q !== c && q.hp > 0 && !q.sta.tame && q.t !== 'familier') { const d = dist(c.x, c.y, q.x, q.y); if (d < bd) { bd = d; target = q; } }
    const tx = target ? target.x + target.w / 2 : p.x + p.w / 2 - p.face * 40, ty = target ? target.y : p.y - 30 + Math.sin(c.phase * 3) * 10;
    c.phase += dt;
    c.vx += (tx - c.x - c.w / 2) * 3 * dt; c.vy += (ty - c.y) * 3 * dt;
    c.vx *= Math.max(0, 1 - 2.5 * dt); c.vy *= Math.max(0, 1 - 2.5 * dt);
    c.canStep = false; moveBody(c, dt);
    if (target && c.cd <= 0 && dist(c.x, c.y, target.x, target.y) < 40) { c.cd = 1.2; doBurst(c.spec, target.x + target.w / 2, target.y + target.h / 2, 40, { noPlayer: true, noField: true, noEcho: true }); }
    if (Math.random() < 0.4) part(c.x + c.w / 2, c.y + c.h / 2, c.spec.color, 1, 20, 0.5, 2, -30, 'spark');
  }
  function updateSpells(dt) {
    const sols = dynSolids();
    for (const s of st.sp) {
      switch (s.k) {
        case 'proj': {
          s.life -= dt; if (s.life <= 0) { s.mort = true; part(s.x, s.y, s.color, 5, 30, 0.4); break; }
          { const z = st.gz.length ? gravOf({ x: s.x - 1, y: s.y - 1, w: 2, h: 2 }) : null; if (z) { s.vx += 900 * z.mag * z.gx * dt; s.vy += 900 * z.mag * z.gy * dt; } else s.vy += s.grav * dt; }
          const nx = s.x + s.vx * dt, ny = s.y + s.vy * dt;
          if (s.guide) { const aim = toWorld(game.inp.mouse.x, game.inp.mouse.y); const want = Math.atan2(aim.y - s.y, aim.x - s.x), cur = Math.atan2(s.vy, s.vx); let da = want - cur; while (da > Math.PI) da -= TAU; while (da < -Math.PI) da += TAU; const na = cur + clamp(da, -4 * dt, 4 * dt); const sp = Math.hypot(s.vx, s.vy); s.vx = Math.cos(na) * sp; s.vy = Math.sin(na) * sp; }
          const dirv = { x: s.vx / (Math.hypot(s.vx, s.vy) || 1), y: s.vy / (Math.hypot(s.vx, s.vy) || 1) };
          const hitS = Sim.solidAt(nx, ny) ? { t: P[Sim.matAt(nx, ny)].nom } : sols.find((o) => nx >= o.x - s.r && nx <= o.x + o.w + s.r && ny >= o.y - s.r && ny <= o.y + o.h + s.r);
          if (hitS) {
            if (s.bounces > 0) {
              s.bounces--;
              if (Sim.solidAt(s.x + s.vx * dt, s.y)) s.vx = -s.vx * 0.9; else s.vy = -s.vy * 0.9;
              part(s.x, s.y, s.color, 4, 40, 0.3);
            } else if (s.potion) { potionBurst(s.potion, s.x, s.y, s.forte); s.mort = true; }
            else if (s.liquide) { spawnLiquid(s.liquide, s.x, s.y, 26); part(s.x, s.y, s.color, 10, 60, 0.6); Son.sfx('burst', 'eau'); s.mort = true; }
            else if (s.trig === 'contact') { doBurst(s.spec, s.x, s.y, 50 * s.prm.size, {}, dirv); s.mort = true; }
            else if (s.trig === 'retarde') { s.k = 'timer'; s.t = 2; s.r = 60 * s.prm.size; }
            else { doBurst(s.spec, s.x, s.y, 28 * s.prm.size, { noField: s.core !== 'lumiere' }, dirv); s.mort = true; }
            if (hitS.t) evt('hit', 'objet:' + hitS.t);
            break;
          }
          s.x = nx; s.y = ny;
          const lm = Sim.matAt(s.x, s.y);
          if (P[lm].liquid) {
            if (s.core === 'feu' && lm === M.EAU && !s.potion && !s.liquide) { Sim.forRadius(s.x, s.y, 10, (x, y, i, m) => { if (m === M.EAU && Math.random() < 0.5) Sim.set(x, y, M.VAPEUR, 40); }); part(s.x, s.y, '#ccc', 8, 40, 0.7, 4, -100); s.mort = true; break; }
            if (s.core === 'froid' && lm === M.EAU && !s.potion && !s.liquide) { applyEffect('froid', s.x, s.y, 36 * s.prm.size, s.prm, 'burst'); s.mort = true; break; }
            if (s.core === 'foudre' && lm === M.EAU && !s.potion && !s.liquide) { applyEffect('foudre', s.x, s.y, 60 * s.prm.size, s.prm, 'burst'); s.mort = true; break; }
            s.vx *= Math.max(0, 1 - 4 * dt); s.vy *= Math.max(0, 1 - 4 * dt);
            if ((s.potion || s.liquide) && Math.abs(s.vx) + Math.abs(s.vy) < 100) { if (s.potion) potionBurst(s.potion, s.x, s.y, s.forte); else spawnLiquid(s.liquide, s.x, s.y, 26); s.mort = true; break; }
          }
          let touche = null;
          for (const c of st.crs) if (c.hp > 0 && U.circleRect(s.x, s.y, s.r, c) && !s.hits.has(c)) { touche = c; break; }
          if (!touche) for (const o of st.objs) if (!o.mort && o.t !== 'porte' && o.t !== 'pancarte' && !o.solid && U.circleRect(s.x, s.y, s.r, o) && !s.hits.has(o)) { touche = o; break; }
          if (touche) {
            if (touche.hp !== undefined && touche.t) evt('creatureTouchee');
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
            else if (s.trig === 'contact') { doBurst(s.spec, s.x, s.y, 50 * s.prm.size, {}, dirv); s.mort = true; }
            else if (s.trig === 'retarde') { s.k = 'timer'; s.t = 2; s.r = 60 * s.prm.size; s.vx = 0; s.vy = 0; }
            else { s.hits.add(touche); for (const c of s.spec.cores) applyEffect(c, s.x, s.y, s.r + 10, { ...s.prm, power: s.prm.power * 0.9 }, 'burst', { noField: true, noPlayer: true, noGrid: true }); Son.sfx('hit', s.core); }
          }
          if (s.trig === 'immediat' && !s.potion && !s.liquide && Math.random() < 0.5) for (const c of s.spec.cores) gridEffect(c, s.x, s.y, s.r + 4, { ...s.prm, power: s.prm.power * 0.5 }, false, dt * 3);
          s.trail += dt; if (s.trail > 0.03) { s.trail = 0; part(s.x, s.y, s.color, 1, 10, 0.35, s.r * 0.5, 0, s.core === 'lumiere' || s.core === 'foudre' ? 'spark' : 'dot'); }
          if (s.y > L.h + 50 || s.y < -50) s.mort = true;
          break;
        }
        case 'trap': {
          s.life -= dt; s.t += dt; if (s.life <= 0) { s.mort = true; break; }
          const hit = st.crs.some((c) => c.hp > 0 && U.circleRect(s.x, s.y, s.r, c)) || st.objs.some((o) => o.dyn && !o.carried && U.circleRect(s.x, s.y, s.r, o));
          if (hit) { doBurst(s.spec, s.x, s.y, s.r * 1.2); s.mort = true; }
          break;
        }
        case 'timer': s.t -= dt; if (s.t <= 0) { doBurst(s.spec, s.x, s.y, s.r || 60 * s.spec.prm.size, s.noField ? { noField: true, noEcho: true } : {}); s.mort = true; } break;
        case 'beamtimer': s.t -= dt; if (s.t <= 0) { const p = st.p; fireBeam(s.spec, p.x + p.w / 2, p.y + p.h * 0.45, s.dx, s.dy, 'immediat'); s.mort = true; } break;
        case 'echo': s.t -= dt; if (s.t <= 0) { doBurst(s.spec, s.x, s.y, s.r, s.opts); s.left--; s.t = 0.5; if (s.left <= 0) s.mort = true; } break;
        case 'canal': {
          s.t += dt; s.tick -= dt;
          if (!game.inp.mouse.down || s.t > 6 || st.p.ink < s.cost) { s.mort = true; break; }
          const p = st.p; const pcx = p.x + p.w / 2, pcy = p.y + p.h * 0.45; const aim = toWorld(game.inp.mouse.x, game.inp.mouse.y);
          let ddx = aim.x - pcx, ddy = aim.y - pcy; const dd = Math.hypot(ddx, ddy) || 1; const k = Math.min(dd, s.range) / dd; s.x = pcx + ddx * k; s.y = pcy + ddy * k;
          if (s.tick <= 0) { s.tick = 0.2; p.ink -= s.cost * 0.2; doBurst(s.spec, s.x, s.y, s.r, { noEcho: true, noField: true }); }
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
          s.life -= dt; s.t -= dt; if (s.life <= 0) { s.mort = true; part(s.x, s.y - 20, s.color, 10, 50); break; }
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
            if (MAT[core] && Sim.get(cx, cy) === M.AIR) { Sim.set(cx, cy, MAT[core], core === 'feu' ? 40 : 0); }
            else st.sp.push({ k: 'proj', spec: s.spec, core, x, y: s.yTop, vx: 0, vy: 200, r: 5, prm: s.spec.prm, trig: 'contact', bounces: 0, life: 3, grav: 500, hits: new Set(), color: s.color, trail: 0, petit: true });
          }
          break;
        }
        case 'label': s.life -= dt; s.y -= 20 * dt; if (s.life <= 0) s.mort = true; break;
        case 'singularite': {
          s.life -= dt; const ph = s.life > 0.6;
          const pull = (b, k) => { const bx = b.x + b.w / 2, by = b.y + b.h / 2; const dx = s.x - bx, dy = s.y - by; const d = Math.hypot(dx, dy) || 1; if (d > s.r) return; if (ph) { b.vx += dx / d * 1800 * dt * k; b.vy += dy / d * 1800 * dt * k; } else { b.vx -= dx / d * 900 * k; b.vy -= dy / d * 900 * k - 200; } };
          if (s.life <= 0.6 && !s.recrache) { s.recrache = true; for (const c of st.crs) if (c.hp > 0) pull(c, 1); for (const o of st.objs) if (o.dyn && !o.carried) pull(o, 1); pull(st.p, 0.6); st.shake = 0.4; Son.sfx('burst', 'force'); }
          if (ph) { for (const c of st.crs) if (c.hp > 0) pull(c, 1); for (const o of st.objs) if (o.dyn && !o.carried) pull(o, 1); pull(st.p, 0.5); Sim.forRadius(s.x, s.y, s.r * 0.7, (x, y, i, m) => { const q = P[m]; if ((q.liquid || q.powder || q.gas) && Math.random() < 0.3) { const dx = Math.sign(Math.floor(s.x / CS) - x), dy = Math.sign(Math.floor(s.y / CS) - y); const j = (y + dy) * Sim.W + x + dx; if (Sim.get(x + dx, y + dy) === M.AIR) Sim.swap(i, j); } }); }
          if (s.life <= 0) s.mort = true;
          break;
        }
        case 'field': {
          s.life -= dt; if (s.life <= 0) { s.mort = true; break; }
          if (s.follow) { const p = st.p; s.x = p.x + p.w / 2; s.y = p.y + p.h / 2; }
          if (s.vx) { s.x += s.vx * dt; if (Sim.solidAt(s.x + Math.sign(s.vx) * s.r * 0.5, s.y)) s.vx = -s.vx; }
          if (s.faible) break;
          if (s.spec) { doContinuous(s.spec, s.x, s.y, s.r, dt, { noField: true, noPlayer: !!s.follow }); }
          else applyEffect(s.core, s.x, s.y, s.r, { ...s.prm, power: s.prm.power * 0.5 }, dt, { noField: true });
          if (Math.random() < 0.6) { const a = Math.random() * TAU, rr = Math.random() * s.r; part(s.x + Math.cos(a) * rr, s.y + Math.sin(a) * rr * 0.5, colorOf(s.core), 1, 20, 0.7, 3, s.core === 'feu' ? -200 : s.core === 'eau' ? 100 : -30, s.core === 'lumiere' ? 'spark' : 'dot'); }
          break;
        }
        case 'ring': case 'beam': s.life -= dt; if (s.life <= 0) s.mort = true; break;
      }
      if (s.k === 'field' && s.faible) for (const o of st.objs) if (o.t === 'rune' && U.circleRect(s.x, s.y, s.r * 2, o)) o.revele = Math.min(1, o.revele + dt * 0.8);
    }
    if (st.p.sta.lumiere > 0) for (const o of st.objs) if (o.t === 'rune' && dist(o.x + 20, o.y + 30, st.p.x, st.p.y) < 220) o.revele = Math.min(1, o.revele + dt * 0.8);
    st.sp = st.sp.filter((s) => !s.mort);
    st.crs = st.crs.filter((c) => !c.mort);
  }
  function updateParts(dt) {
    for (const q of st.parts) { q.life -= dt; q.vy += q.grav * dt; q.x += q.vx * dt; q.y += q.vy * dt; q.vx *= Math.max(0, 1 - 2 * dt); }
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
    for (const s of st.sp) drawSpell(ctx, s);
    for (const q of st.parts) drawPart(ctx, q);
    for (const e of st.eclairs) { ctx.save(); ctx.strokeStyle = '#fff8d0'; ctx.lineWidth = 4 * e.life / 0.35 + 1; ctx.globalAlpha = Math.min(1, e.life * 4); ctx.lineJoin = 'round'; ctx.beginPath(); e.pts.forEach(([x, y], i) => i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)); ctx.stroke(); ctx.strokeStyle = '#e0c43a'; ctx.lineWidth = 1.5; ctx.stroke(); ctx.restore(); }
    ctx.restore();
    drawRain(ctx);
    drawDark(ctx, camI);
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
    ctx.restore();
    for (const o of st.objs) if (o.t === 'pancarte' && dist(o.x, o.y, p.x, p.y) < 120) drawBubble(ctx, o.x + o.w / 2 - camI.x, o.y - 20 - camI.y, o.texte);
    const ni = labelInteraction(findInteraction());
    if (ni) drawBubble(ctx, p.x + p.w / 2 - camI.x, p.y - 26 - camI.y, '[E] ' + ni);
    ctx.restore();
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
    ctx.save(); ctx.strokeStyle = '#3b6fb6'; ctx.globalAlpha = 0.35; ctx.lineWidth = 1;
    const n = st.meteo.type === 'orage' ? 120 : 70;
    ctx.beginPath();
    for (let i = 0; i < n; i++) { const x = (U.hash2(i, 9) * VW + time * 300 * (0.7 + U.hash2(i, 2) * 0.6)) % VW, y = (U.hash2(i, 4) * VH + time * 700 * (0.8 + U.hash2(i, 6) * 0.4)) % VH; ctx.moveTo(x, y); ctx.lineTo(x - 3, y + 14); }
    ctx.stroke(); ctx.restore();
  }
  function drawDark(ctx, cam) {
    const d = darkCv.getContext('2d');
    d.clearRect(0, 0, VW, VH);
    const nightA = (1 - daylight()) * 0.62;
    if (nightA > 0.01) { d.fillStyle = 'rgba(14,12,22,' + nightA + ')'; d.fillRect(0, 0, VW, VH); }
    // profondeur : plus sombre sous la surface
    const surf = Sim.surf;
    if (surf) {
      for (let sx = 0; sx < VW; sx += 8) {
        const cx = clamp(Math.floor((cam.x + sx + 4) / CS), 0, Sim.W - 1);
        let acc = 0, n = 0; for (let k = -5; k <= 5; k++) { const q = cx + k; if (q >= 0 && q < Sim.W) { acc += surf[q]; n++; } }
        const sy = (acc / n) * CS - cam.y;
        const g = d.createLinearGradient(0, sy + 60, 0, sy + 240);
        g.addColorStop(0, 'rgba(18,14,11,0)'); g.addColorStop(1, 'rgba(18,14,11,0.93)');
        d.fillStyle = g; d.fillRect(sx, sy + 60, 8, VH);
      }
    }
    d.globalCompositeOperation = 'destination-out';
    for (const l of lights()) {
      const x = l.x - cam.x, y = l.y - cam.y;
      if (x < -l.r || x > VW + l.r || y < -l.r || y > VH + l.r) continue;
      const fl = 1 + Math.sin(time * 7 + x) * 0.04;
      const g = d.createRadialGradient(x, y, l.r * 0.15, x, y, l.r * fl);
      g.addColorStop(0, 'rgba(0,0,0,1)'); g.addColorStop(0.6, 'rgba(0,0,0,0.7)'); g.addColorStop(1, 'rgba(0,0,0,0)');
      d.fillStyle = g; d.fillRect(x - l.r * 1.1, y - l.r * 1.1, l.r * 2.2, l.r * 2.2);
    }
    d.globalCompositeOperation = 'source-over';
    ctx.drawImage(darkCv, 0, 0);
  }

  function drawObj(ctx, o) {
    ctx.save();
    ctx.strokeStyle = INK; ctx.lineWidth = 2; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    const cx = o.x + o.w / 2;
    switch (o.t) {
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
      case 'familier': { const r = 9; const g = ctx.createRadialGradient(cx, c.y + c.h / 2, 2, cx, c.y + c.h / 2, r * 3); g.addColorStop(0, U.hexA(c.spec.color, 0.5)); g.addColorStop(1, U.hexA(c.spec.color, 0)); ctx.fillStyle = g; ctx.fillRect(cx - r * 3, c.y + c.h / 2 - r * 3, r * 6, r * 6); ctx.fillStyle = c.spec.color; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.arc(cx, c.y + c.h / 2 + Math.sin(c.phase * 4) * 2, r, 0, TAU); ctx.fill(); ctx.stroke(); Seal.glyph(ctx, c.core, cx, c.y + c.h / 2 + Math.sin(c.phase * 4) * 2, r * 0.6, '#efe3c4', 1); ctx.fillStyle = INK; ctx.beginPath(); ctx.arc(cx - 3, c.y + c.h / 2 - 2, 1.3, 0, TAU); ctx.arc(cx + 3, c.y + c.h / 2 - 2, 1.3, 0, TAU); ctx.fill(); break; }
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
    if (c.sta.stun > 0) { ctx.strokeStyle = '#d8a63a'; ctx.lineWidth = 1.5; for (let i = 0; i < 3; i++) { const a = time * 5 + (i / 3) * TAU; ctx.beginPath(); ctx.arc(cx + Math.cos(a) * 14, c.y - 8 + Math.sin(a) * 4, 2, 0, TAU); ctx.stroke(); } }
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
  function drawApprenti(ctx, x, y, h, look, face = 1, anim = 0, sta = null, moving = false) {
    ctx.save();
    ctx.translate(x, y);
    const s = h / 50;
    ctx.scale(s * face, s);
    ctx.lineWidth = 1.8 / s; ctx.strokeStyle = INK; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    const cape = DATA.CAPES[look.cape] ? DATA.CAPES[look.cape].c : '#6b3f73';
    if (sta && sta.invisible > 0) ctx.globalAlpha = 0.4;
    const bob = moving ? Math.sin(anim) * 1.5 : 0;
    const leg = moving ? Math.sin(anim) * 5 : 0;
    U.inkLine(ctx, -4, -14, -5 + leg, 0, 1, 0.3); U.inkLine(ctx, 4, -14, 5 - leg, 0, 2, 0.3);
    ctx.fillStyle = cape;
    U.inkPolyPath(ctx, [[-6, -34 + bob], [6, -34 + bob], [13, -8], [-13, -8]], 3, 0.6); ctx.fill(); ctx.stroke();
    if (sta && sta.stone > 0) { ctx.save(); ctx.globalAlpha = 0.5; U.hatch(ctx, -13, -34, 26, 26, 3, Math.PI / 4, 1, 0.5, '#8a6b2f'); ctx.restore(); }
    U.inkLine(ctx, 5, -30 + bob, 12, -22 + bob, 4, 0.3);
    if (look.acc === 0) { ctx.strokeStyle = '#6b4f2a'; ctx.lineWidth = 2.2 / s; U.inkLine(ctx, 12, -6, 15, -46 + bob, 5, 0.4); ctx.strokeStyle = INK; ctx.lineWidth = 1.8 / s; ctx.fillStyle = '#d8a63a'; ctx.beginPath(); ctx.arc(15.5, -48 + bob, 3, 0, TAU); ctx.fill(); ctx.stroke(); }
    else if (look.acc === 1) { ctx.fillStyle = '#efe3c4'; ctx.beginPath(); ctx.moveTo(12, -22 + bob); ctx.quadraticCurveTo(16, -34 + bob, 22, -40 + bob); ctx.quadraticCurveTo(18, -30 + bob, 14, -20 + bob); ctx.fill(); ctx.stroke(); }
    else { ctx.fillStyle = '#9a4a3a'; ctx.fillRect(10, -27 + bob, 9, 7); U.inkRect(ctx, 10, -27 + bob, 9, 7, 6, 0.3); }
    ctx.fillStyle = '#efdcc0';
    ctx.beginPath(); ctx.arc(0, -40 + bob, 7, 0, TAU); ctx.fill(); ctx.stroke();
    ctx.fillStyle = INK; ctx.beginPath(); ctx.arc(3, -41 + bob, 1, 0, TAU); ctx.fill();
    ctx.fillStyle = cape;
    if (look.chapeau === 0) { U.inkPolyPath(ctx, [[-11, -45 + bob], [11, -45 + bob], [2, -68 + bob]], 7, 0.5); ctx.fill(); ctx.stroke(); }
    else if (look.chapeau === 1) { U.inkPolyPath(ctx, [[-15, -45 + bob], [15, -45 + bob], [5, -50 + bob], [1, -62 + bob], [-5, -50 + bob]], 8, 0.5); ctx.fill(); ctx.stroke(); }
    else { U.inkPolyPath(ctx, [[-11, -45 + bob], [11, -45 + bob], [4, -58 + bob], [12, -70 + bob], [-2, -60 + bob]], 9, 0.5); ctx.fill(); ctx.stroke(); }
    ctx.restore();
  }
  function drawPlayer(ctx, p) {
    const moving = (Math.abs(p.vx) > 20 && (p.onGround || p.climbing)) || p.sta.vol > 0;
    if (p.inv > 0 && Math.floor(time * 20) % 2 === 0) return;
    if (p.sta.wet > 0 && Math.random() < 0.06) part(p.x + p.w / 2, p.y + p.h, '#6aa0d8', 1, 10, 0.6, 2, 300);
    if (p.sta.lumiere > 0) { const g = ctx.createRadialGradient(p.x + p.w / 2, p.y + p.h / 2, 5, p.x + p.w / 2, p.y + p.h / 2, 80); g.addColorStop(0, 'rgba(216,166,58,0.35)'); g.addColorStop(1, 'rgba(216,166,58,0)'); ctx.fillStyle = g; ctx.fillRect(p.x - 80, p.y - 60, 200, 200); }
    if (p.sta.vol > 0) { ctx.save(); ctx.strokeStyle = '#6c5ab8'; ctx.lineWidth = 1.5; ctx.globalAlpha = 0.6; U.inkCircle(ctx, p.x + p.w / 2, p.y + p.h / 2, p.h * 0.7, 3 + Math.floor(time * 4), 2); ctx.restore(); }
    const G = p.G;
    if (G && G.mag > 0 && !(G.gx === 0 && G.gy === 1) && p.sta.vol <= 0) {
      const th = Math.atan2(G.gy, G.gx) - Math.PI / 2; const hs = Math.max(p.w, p.h);
      ctx.save(); ctx.translate(p.x + p.w / 2, p.y + p.h / 2); ctx.rotate(th);
      drawApprenti(ctx, 0, hs / 2, hs, game.look, p.face, p.anim, p.sta, moving || (Math.abs(p.vx) + Math.abs(p.vy) > 30 && p.onGround));
      ctx.restore();
      ctx.save(); ctx.strokeStyle = '#6c5ab8'; ctx.globalAlpha = 0.5; ctx.lineWidth = 1.5; const cx = p.x + p.w / 2, cy = p.y + p.h / 2; ctx.beginPath(); ctx.moveTo(cx, cy); ctx.lineTo(cx + G.gx * 34, cy + G.gy * 34); ctx.stroke(); ctx.restore();
    } else {
      if (p.pg && p.pg.enclume) { ctx.save(); ctx.globalAlpha = 0.5; ctx.fillStyle = '#4a4a55'; ctx.beginPath(); ctx.ellipse(p.x + p.w / 2, p.y + p.h, p.w * 0.9, 4, 0, 0, TAU); ctx.fill(); ctx.restore(); }
      drawApprenti(ctx, p.x + p.w / 2, p.y + p.h, p.h, game.look, p.face, p.anim, p.sta, moving);
    }
    if (p.trap) { ctx.save(); ctx.strokeStyle = p.trap.spec.color; ctx.lineWidth = 1.5; ctx.setLineDash([4, 4]); ctx.beginPath(); ctx.arc(p.x + p.w / 2, p.y + p.h / 2, 30, time * 2, time * 2 + TAU); ctx.stroke(); ctx.restore(); }
    if (p.selfTimer) { ctx.save(); ctx.strokeStyle = p.selfTimer.spec.color; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(p.x + p.w / 2, p.y + p.h / 2, 34, -Math.PI / 2, -Math.PI / 2 + TAU * (1 - p.selfTimer.t / 2)); ctx.stroke(); ctx.restore(); }
    if (p.air !== undefined && p.air < 8 && p.liq === M.EAU) { ctx.save(); ctx.fillStyle = 'rgba(31,26,22,0.4)'; ctx.fillRect(p.x - 6, p.y - 14, p.w + 12, 4); ctx.fillStyle = '#3b6fb6'; ctx.fillRect(p.x - 6, p.y - 14, (p.w + 12) * clamp(p.air / 8, 0, 1), 4); ctx.restore(); }
  }
  function drawSpell(ctx, s) {
    ctx.save();
    switch (s.k) {
      case 'proj': {
        const g = ctx.createRadialGradient(s.x, s.y, 1, s.x, s.y, s.r * 2.5); g.addColorStop(0, U.hexA(s.color, 0.5)); g.addColorStop(1, U.hexA(s.color, 0)); ctx.fillStyle = g; ctx.fillRect(s.x - s.r * 2.5, s.y - s.r * 2.5, s.r * 5, s.r * 5);
        ctx.fillStyle = s.color; ctx.strokeStyle = INK; ctx.lineWidth = 1.5;
        if (s.potion || s.liquide) { ctx.beginPath(); ctx.moveTo(s.x - 4, s.y - 8); ctx.lineTo(s.x - 4, s.y - 3); ctx.quadraticCurveTo(s.x - 9, s.y + 3, s.x - 7, s.y + 7); ctx.lineTo(s.x + 7, s.y + 7); ctx.quadraticCurveTo(s.x + 9, s.y + 3, s.x + 4, s.y - 3); ctx.lineTo(s.x + 4, s.y - 8); ctx.closePath(); ctx.fill(); ctx.stroke(); }
        else if (s.petit) { ctx.beginPath(); ctx.arc(s.x, s.y, s.r, 0, TAU); ctx.fill(); }
        else { ctx.beginPath(); ctx.arc(s.x, s.y, s.r, 0, TAU); ctx.fill(); ctx.stroke(); Seal.glyph(ctx, s.core, s.x, s.y, s.r * 0.6, '#efe3c4', 1); }
        break;
      }
      case 'trap': ctx.strokeStyle = s.color; ctx.lineWidth = 1.5; ctx.globalAlpha = 0.6 + Math.sin(s.t * 4) * 0.2; ctx.setLineDash([6, 6]); ctx.beginPath(); ctx.ellipse(s.x, s.y, s.r, s.r * 0.5, 0, 0, TAU); ctx.stroke(); ctx.setLineDash([]); Seal.glyph(ctx, s.core, s.x, s.y, 10, s.color, 1); Seal.glyph(ctx, 'contact', s.x, s.y - 18, 5, s.color, 1); break;
      case 'timer': ctx.strokeStyle = s.color; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(s.x, s.y, 12, -Math.PI / 2, -Math.PI / 2 + TAU * (1 - s.t / 2)); ctx.stroke(); ctx.fillStyle = s.color; ctx.beginPath(); ctx.arc(s.x, s.y, 5 + Math.sin(time * 20) * 1.5, 0, TAU); ctx.fill(); break;
      case 'beamtimer': { const p = st.p; const px = p.x + p.w / 2, py = p.y + p.h * 0.45; ctx.strokeStyle = s.color; ctx.lineWidth = 1 + (2 - s.t) * 2; ctx.globalAlpha = 0.5; ctx.setLineDash([4, 8]); ctx.beginPath(); ctx.moveTo(px, py); ctx.lineTo(px + s.dx * 300 * s.prm.range, py + s.dy * 300 * s.prm.range); ctx.stroke(); break; }
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
      case 'singularite': { const t = 1 - s.life / s.max; ctx.strokeStyle = '#9a4a8c'; ctx.lineWidth = 2; for (let k = 0; k < 4; k++) { ctx.globalAlpha = 0.6; ctx.beginPath(); ctx.arc(s.x, s.y, (s.r * 0.6) * (1 - ((t * 3 + k * 0.25) % 1)), 0, TAU); ctx.stroke(); } ctx.fillStyle = '#1f1a16'; ctx.globalAlpha = 1; ctx.beginPath(); ctx.arc(s.x, s.y, 6 + Math.sin(time * 20) * 2, 0, TAU); ctx.fill(); break; }
      case 'label': ctx.globalAlpha = Math.min(1, s.life * 2); U.txt(ctx, s.txt, s.x, s.y, 20, 'center', INK, 'IM Fell English SC'); break;
      case 'ring': { const t = 1 - s.life / s.max; ctx.strokeStyle = s.color; ctx.globalAlpha = 1 - t; ctx.lineWidth = 3 * (1 - t) + 0.5; U.inkCircle(ctx, s.x, s.y, s.r * (0.3 + t * 0.9), 3, 2); ctx.lineWidth = 1; U.inkCircle(ctx, s.x, s.y, s.r * (0.1 + t * 0.6), 4, 1.5); break; }
      case 'beam': { const t = s.life / s.max; ctx.strokeStyle = s.color; ctx.globalAlpha = t; ctx.lineWidth = s.w * t + 1; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(s.x1, s.y1); ctx.lineTo(s.x2, s.y2); ctx.stroke(); ctx.strokeStyle = '#efe3c4'; ctx.lineWidth = Math.max(0.5, s.w * t * 0.3); ctx.beginPath(); ctx.moveTo(s.x1, s.y1); ctx.lineTo(s.x2, s.y2); ctx.stroke(); break; }
    }
    ctx.restore();
  }
  function drawGField(ctx, z) {
    ctx.save();
    const a = clamp(z.life / Math.max(0.1, z.max) * 3, 0, 1);
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
    const a = clamp(q.life / q.max, 0, 1);
    ctx.save(); ctx.globalAlpha = a; ctx.fillStyle = q.color; ctx.strokeStyle = q.color;
    if (q.type === 'spark') { ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(q.x - q.size, q.y); ctx.lineTo(q.x + q.size, q.y); ctx.moveTo(q.x, q.y - q.size); ctx.lineTo(q.x, q.y + q.size); ctx.stroke(); }
    else if (q.type === 'feuille') { ctx.beginPath(); ctx.ellipse(q.x, q.y, q.size * 1.4, q.size * 0.7, q.life * 3, 0, TAU); ctx.fill(); }
    else if (q.type === 'coeur') { ctx.font = (q.size * 4) + 'px serif'; ctx.textAlign = 'center'; ctx.fillText('♥', q.x, q.y); }
    else { ctx.beginPath(); ctx.arc(q.x, q.y, q.size * (0.5 + a * 0.5), 0, TAU); ctx.fill(); }
    ctx.restore();
  }

  function toWorld(mx, my) { return { x: mx + st.cam.x, y: my + st.cam.y }; }
  function state() { return st; }
  function level() { return L; }
  function throwCarried(aim) { if (st.p.carry) drop(aim); }

  return { build, ensure, reset, update, draw, castSeal, usePotion, useLiquid, interact, throwCarried, toWorld, state, level, drawApprenti, respawn, serialize, releaseControl, gridEffectOn, relacher };
})();
