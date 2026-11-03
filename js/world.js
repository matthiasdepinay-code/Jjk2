'use strict';
// ---------- Monde extérieur : side-scroller, physique, effets, créatures, rendu ----------
const World = (() => {
  const { TAU, INK, clamp, lerp, dist } = U;
  const GRAV = 1500;
  const VW = 1280, VH = 720;
  let L = null;   // niveau
  let st = null;  // état courant
  let game = null;
  let darkCv = null;
  let time = 0;

  // ---------- Construction ----------
  function build(g) {
    game = g;
    L = DATA.LEVEL;
    time = 0;
    st = {
      p: makePlayer(L.spawn.x, L.spawn.y),
      objs: [], crs: [], sp: [], parts: [], pickups: [],
      cam: { x: 0, y: 0 },
      eaux: L.eaux.map((e) => ({ ...e })),
      shake: 0, msgTimer: 0,
      lastZone: '',
    };
    for (const o of L.objets) st.objs.push(makeObj(o));
    for (const c of L.creatures) st.crs.push(makeCreature(c));
    if (!darkCv) { darkCv = document.createElement('canvas'); darkCv.width = VW; darkCv.height = VH; }
  }
  function ensure(g) { if (!st) build(g); game = g; }
  function respawn() {
    const p = st.p;
    p.x = L.spawn.x; p.y = L.spawn.y; p.vx = 0; p.vy = 0;
    p.hp = p.hpMax;
    for (const k in p.sta) p.sta[k] = 0;
  }
  function makePlayer(x, y) {
    return { x, y, w: 26, h: 50, vx: 0, vy: 0, face: 1, onGround: false, coyote: 0, jumpBuf: 0, anim: 0,
      hp: 10, hpMax: 10, ink: 40, inkMax: 40, inv: 0, climbing: false, inWater: false,
      sta: { wet: 0, stone: 0, invisible: 0, lowgrav: 0, jump: 0, small: 0, vision: 0, burning: 0, glide: 0, lumiere: 0 },
      trap: null, selfTimer: null };
  }
  function makeObj(o) {
    const b = { t: o.t, x: o.x, y: o.y, seed: (o.x * 31 + o.y * 7) | 0 };
    switch (o.t) {
      case 'porte': Object.assign(b, { w: 64, h: 110 }); break;
      case 'mannequin': Object.assign(b, { w: 30, h: 70, hits: 0, wob: 0 }); break;
      case 'caisse': Object.assign(b, { w: 36, h: 36, vx: 0, vy: 0, solid: true, burning: 0, hp: 3, dyn: true }); break;
      case 'torche': Object.assign(b, { w: 14, h: 80, lit: false, flicker: 0 }); break;
      case 'graine': Object.assign(b, { w: 20, h: 10, stage: 0, hauteur: 0, hMax: 0, racine: true, regrow: 0 }); break;
      case 'buisson': Object.assign(b, { w: 48, h: 44, etat: 'vert', burning: 0 }); break;
      case 'pancarte': Object.assign(b, { w: 34, h: 70, texte: o.texte }); break;
      case 'rocher': Object.assign(b, { w: 56, h: 56, solid: true, fissure: 0 }); break;
      case 'glace': Object.assign(b, { w: 60, h: 110, solid: true, fonte: 0 }); break;
      case 'champignon': Object.assign(b, { w: 22, h: 26, pris: false }); break;
      case 'rune': Object.assign(b, { w: 40, h: 60, revele: 0, lu: false, cooldown: 0 }); break;
    }
    return b;
  }
  function makeCreature(c) {
    const b = { t: c.t, x: c.x, y: c.y, vx: 0, vy: 0, dir: 1, onGround: false, seed: (c.x * 13) | 0, size: 1,
      sta: { burn: 0, stun: 0, sleep: 0, wet: 0, tame: false }, hop: 0, flee: 0, filDonne: false, x0: c.x, phase: Math.random() * TAU, hurt: 0 };
    switch (c.t) {
      case 'limace': Object.assign(b, { w: 36, h: 24, hp: 3, hpMax: 3, dmg: 1 }); break;
      case 'follet': Object.assign(b, { w: 24, h: 24, hp: 2, hpMax: 2, dmg: 1, vole: true }); break;
      case 'golem': Object.assign(b, { w: 50, h: 70, hp: 8, hpMax: 8, dmg: 2 }); break;
    }
    return b;
  }

  // ---------- Collisions ----------
  function solids(exclude) {
    const arr = L.solides.slice();
    for (const o of st.objs) if (o.solid && o !== exclude) arr.push(o);
    return arr;
  }
  function moveBody(b, dt, sols) {
    // X
    b.x += b.vx * dt;
    for (const s of sols) {
      if (U.rectsOverlap(b, s)) {
        if (b.vx > 0) b.x = s.x - b.w; else if (b.vx < 0) b.x = s.x + s.w;
        else { // écrasé : pousser vers le côté le plus proche
          const cx = b.x + b.w / 2, sx = s.x + s.w / 2;
          b.x = cx < sx ? s.x - b.w : s.x + s.w;
        }
        b.hitX = true;
        b.vx = b.bounce ? -b.vx * 0.5 : 0;
      }
    }
    // Y
    b.y += b.vy * dt;
    b.onGround = false;
    for (const s of sols) {
      if (U.rectsOverlap(b, s)) {
        if (b.vy > 0) { b.y = s.y - b.h; b.onGround = true; b.vy = 0; if (s.dyn) b.sur = s; }
        else if (b.vy < 0) { b.y = s.y + s.h; b.vy = 0; }
        else { b.y = s.y - b.h; b.onGround = true; }
      }
    }
  }
  function inWater(b) {
    const cx = b.x + b.w / 2, cy = b.y + b.h * 0.6;
    for (const e of st.eaux) if (cx > e.x && cx < e.x + e.w && cy > e.y && cy < e.y + e.h) return true;
    return false;
  }
  function pointSolid(x, y) {
    for (const s of solids()) if (x >= s.x && x <= s.x + s.w && y >= s.y && y <= s.y + s.h) return s;
    return null;
  }
  function inGrotte(x, y) {
    for (const g of L.grottes) if (x >= g.x && x <= g.x + g.w && y >= g.y && y <= g.y + g.h) return true;
    return false;
  }

  // ---------- Particules ----------
  function part(x, y, color, n = 6, spd = 80, life = 0.6, size = 3, grav = 0, type = 'dot') {
    for (let i = 0; i < n; i++) {
      const a = Math.random() * TAU, s = spd * (0.3 + Math.random() * 0.7);
      st.parts.push({ x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s - spd * 0.2, life, max: life, color, size: size * (0.6 + Math.random() * 0.8), grav, type });
    }
    if (st.parts.length > 900) st.parts.splice(0, st.parts.length - 900);
  }
  function msg(s, kind) { if (game) game.toast(s, kind); }
  function evt(n, d) { if (game) game.progress.event(n, d); }

  // ---------- Lumières (grotte) ----------
  function lights() {
    const ls = [];
    const p = st.p;
    ls.push({ x: p.x + p.w / 2, y: p.y + p.h / 2, r: p.sta.lumiere > 0 ? 300 : 120 });
    for (const o of st.objs) {
      if (o.t === 'torche' && o.lit) ls.push({ x: o.x + o.w / 2, y: o.y + 6, r: 220 });
      if (o.burning > 0) ls.push({ x: o.x + o.w / 2, y: o.y + o.h / 2, r: 130 });
      if (o.t === 'rune' && o.revele > 0) ls.push({ x: o.x + o.w / 2, y: o.y + o.h / 2, r: 60 * o.revele });
    }
    for (const c of st.crs) if (c.t === 'follet' && c.hp > 0) ls.push({ x: c.x + c.w / 2, y: c.y + c.h / 2, r: 110 });
    for (const s of st.sp) {
      if (s.k === 'field' && (s.core === 'lumiere' || s.core === 'feu')) ls.push({ x: s.x, y: s.y, r: s.r * (s.core === 'lumiere' ? 2.2 : 1.4) });
      if (s.k === 'proj' && (s.core === 'lumiere' || s.core === 'feu')) ls.push({ x: s.x, y: s.y, r: s.core === 'lumiere' ? 160 : 80 });
      if (s.k === 'ring' && s.core === 'lumiere') ls.push({ x: s.x, y: s.y, r: s.r * 2 });
    }
    return ls;
  }

  // ---------- Effets ----------
  // mode : 'burst' (instantané) ou un nombre dt (continu)
  function applyEffect(core, cx, cy, rad, prm, mode, opts = {}) {
    const burst = mode === 'burst';
    const k = burst ? 1 : mode * 2.2;
    const power = prm.power || 1, dur = prm.duration || 1;
    const C = DATA.CORES[core].couleur;
    const inEau = st.eaux.some((e) => cx > e.x && cx < e.x + e.w && cy > e.y && cy < e.y + e.h);
    if (burst) { st.sp.push({ k: 'ring', core, x: cx, y: cy, r: rad, life: 0.4, max: 0.4, color: C }); }

    // --- créatures ---
    for (const c of st.crs) {
      if (c.hp <= 0) continue;
      if (!U.circleRect(cx, cy, rad, c)) continue;
      const ccx = c.x + c.w / 2, ccy = c.y + c.h / 2;
      let dx = ccx - cx, dy = ccy - cy; const d = Math.hypot(dx, dy) || 1; dx /= d; dy /= d;
      if (burst) evt('hit', 'creature:' + c.t);
      switch (core) {
        case 'feu':
          if (c.t === 'golem') { if (burst) part(ccx, ccy, '#aaa', 4, 40, 0.4); }
          else if (c.t === 'follet') { c.hp = Math.min(c.hpMax + 2, c.hp + 1 * k); c.size = Math.min(1.8, c.size + 0.15 * k); if (burst) part(ccx, ccy, C, 8, 90); }
          else { if (!c.sta.wet) { hurt(c, 2 * power * k); c.sta.burn = Math.max(c.sta.burn, 3 * dur); } else if (burst) part(ccx, ccy, '#ccc', 6, 60); }
          break;
        case 'vent': {
          const m = c.t === 'golem' ? 0.25 : c.vole ? 2 : 1;
          c.vx += dx * 520 * power * k * m; c.vy += (dy * 300 - 150) * power * k * m;
          if (c.t === 'golem' && burst) { evt('golemPousse'); }
          break;
        }
        case 'eau':
          c.sta.burn = 0; c.sta.wet = 6;
          if (c.t === 'follet') { hurt(c, 2 * power * k, 'eau'); if (burst) part(ccx, ccy, '#8fb8d8', 10, 80); }
          if (c.t === 'limace' && burst) { c.size = Math.min(2.2, c.size + 0.25); c.w = 36 * c.size; c.h = 24 * c.size; c.y -= 6; if (c.size >= 2.1) msg('La limace est énorme. Elle a l\'air ravie.'); }
          if (c.t === 'golem') { c.sta.stun = Math.max(c.sta.stun, 1.5 * k); }
          break;
        case 'terre':
          if (burst) { hurt(c, 1 * power); c.vx += dx * 200; c.vy -= 200; }
          break;
        case 'lumiere':
          c.sta.stun = Math.max(c.sta.stun, (burst ? 2.5 : 0.4) * dur * power);
          if (burst) part(ccx, ccy - 10, C, 6, 50, 0.5, 2, 0, 'spark');
          break;
        case 'ombre':
          c.sta.sleep = Math.max(c.sta.sleep, (burst ? 6 : 0.5) * dur);
          break;
        case 'vie':
          c.hp = Math.min(c.hpMax, c.hp + 2 * k); c.sta.burn = 0;
          if (!c.sta.tame && (burst || Math.random() < k * 0.5)) {
            c.sta.tame = true; part(ccx, ccy - 10, '#c45a8a', 10, 60, 0.9, 3, -60, 'coeur');
            msg(nomCreature(c.t) + ' est apprivoisé(e). Il/elle te regarde avec tendresse.');
            if (!c.filDonne) { c.filDonne = true; dropPickup('fil', ccx, c.y - 10); }
            evt('tame', c.t);
          }
          break;
        case 'force':
          c.vx -= dx * 700 * power * k; c.vy -= dy * 500 * power * k;
          if (burst) hurt(c, 0.5 * power);
          break;
      }
    }
    // --- objets ---
    for (const o of st.objs) {
      if (!U.circleRect(cx, cy, rad, o)) continue;
      const ocx = o.x + o.w / 2, ocy = o.y + o.h / 2;
      if (burst && o.t !== 'porte' && o.t !== 'pancarte') evt('hit', 'objet:' + o.t);
      switch (o.t) {
        case 'mannequin':
          if (burst) { o.hits++; o.wob = 1; evt('mannequin'); if (core === 'feu') o.burning = 2; if (core === 'eau') o.burning = 0; }
          break;
        case 'caisse':
          if (core === 'feu' && !inEau) { if (!o.burning) part(ocx, ocy, C, 6, 60); o.burning = Math.max(o.burning, 2.5); }
          if (core === 'eau') o.burning = 0;
          if (core === 'vent') { const dx = Math.sign(ocx - cx) || 1; o.vx += dx * 420 * power * k; o.vy -= 220 * power * k; }
          if (core === 'force') { o.vx -= (ocx - cx) * 6 * power * k; o.vy -= (ocy - cy) * 4 * power * k + 100 * k; }
          if (core === 'terre' && burst) { o.hp -= power; if (o.hp <= 0) { o.mort = true; part(ocx, ocy, '#8a6b2f', 12, 90); } }
          break;
        case 'torche':
          if (core === 'feu' && !o.lit) { o.lit = true; part(o.x + 7, o.y + 4, C, 10, 70); evt('torche'); }
          if ((core === 'eau' || core === 'vent') && o.lit) { o.lit = false; part(o.x + 7, o.y + 4, '#999', 8, 40); }
          break;
        case 'graine':
          if ((core === 'eau' || core === 'vie') && o.stage === 0) { growPlant(o); evt('graine'); }
          if (core === 'feu' && o.stage === 1 && !inEau) { o.stage = 0; o.hauteur = 0; part(ocx, o.y, C, 12, 80); msg('La vigne part en fumée. Oups.'); }
          if (core === 'vie' && o.stage === 1) { o.racine = true; o.regrow = 0; }
          break;
        case 'buisson':
          if (core === 'feu' && o.etat === 'vert' && !inEau) { o.burning = Math.max(o.burning, 2.5); }
          if (core === 'eau') o.burning = 0;
          if (core === 'vie' && o.etat === 'cendre') { o.etat = 'vert'; part(ocx, ocy, '#5c8f3e', 10, 60); }
          break;
        case 'rocher':
          if (burst && power >= 1.5 && (core === 'feu' || core === 'terre' || core === 'force' || core === 'vent')) {
            o.mort = true; part(ocx, ocy, '#8a6b2f', 16, 120, 0.8, 4, 600);
            dropPickup('poussiere', ocx, o.y - 10); msg('Le rocher éclate ! Il en tombe une poussière scintillante.');
          } else if (burst && (core === 'feu' || core === 'terre' || core === 'force' || core === 'vent')) { o.fissure = 0.5; if (!o.msgT || time - o.msgT > 4) { o.msgT = time; msg('Le rocher vibre. Il faudrait plus de puissance...'); } }
          break;
        case 'glace':
          if (core === 'feu') { o.fonte += 0.6 * power * k; part(ocx, ocy, '#bfe3f5', 3, 30, 0.5); if (o.fonte >= 1) { o.mort = true; st.eaux.push({ x: o.x - 10, y: o.y + o.h - 14, w: o.w + 20, h: 14, flaque: true }); part(ocx, ocy, '#8fb8d8', 20, 100); evt('glace'); msg('La glace fond en une flaque fumante.'); } }
          break;
        case 'rune':
          if (core === 'lumiere') { o.revele = Math.min(1, o.revele + (burst ? 1 : k * 0.5)); if (burst) part(ocx, ocy, C, 10, 60, 0.8, 2, 0, 'spark'); }
          break;
        case 'bloc':
          if (core === 'force' && burst) { o.life = Math.min(o.life, 0.5); }
          break;
      }
    }
    // --- champs persistants ---
    if (core === 'eau' || core === 'vent') {
      for (const s of st.sp) if (s.k === 'field' && s.core === 'feu' && dist(cx, cy, s.x, s.y) < rad + s.r) { s.life = Math.min(s.life, 0.2); part(s.x, s.y, '#bbb', 6, 40); }
    }
    // --- joueur (si pas lui-même l'origine protégée) ---
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
      }
    }
    // --- décor : particules ---
    if (burst) {
      const n = Math.round(10 + rad / 6);
      const type = core === 'lumiere' ? 'spark' : core === 'vie' ? 'feuille' : 'dot';
      part(cx, cy, C, n, 60 + rad, 0.7, 3, core === 'terre' ? 500 : core === 'eau' ? 400 : 0, type);
      Son.sfx('burst', core);
      // champ persistant
      if (prm.persist > 0 && core !== 'terre' && !inEau) {
        st.sp.push({ k: 'field', core, x: cx, y: cy, r: rad * 0.8, life: 4 * prm.persist * dur, max: 4 * prm.persist * dur, prm });
      } else if (core === 'lumiere' && !opts.noField) {
        st.sp.push({ k: 'field', core, x: cx, y: cy, r: rad * 0.8, life: 5 * dur, max: 5 * dur, prm, faible: true });
      }
      if (core === 'terre' && !opts.noBloc) makeBloc(cx, cy, prm);
      if (core === 'eau' && prm.persist > 0 && !inEau) {
        // flaque au sol la plus proche
        const g = groundBelow(cx, cy);
        if (g) st.eaux.push({ x: cx - rad * 0.8, y: g - 10, w: rad * 1.6, h: 10, flaque: true, life: 10 * dur });
      }
    }
  }
  function groundBelow(x, y) {
    for (let yy = y; yy < L.h; yy += 6) { const s = pointSolid(x, yy); if (s) return s.y; }
    return null;
  }
  function makeBloc(cx, cy, prm) {
    const s = 50 * (prm.size || 1);
    const b = { t: 'bloc', x: cx - s / 2, y: cy - s / 2, w: s, h: s, solid: true, life: prm.persist > 0 ? Infinity : 9 * (prm.duration || 1), max: 9 * (prm.duration || 1), seed: (cx * 3 + cy) | 0 };
    // ne pas enfermer le joueur / caisses : les pousser au-dessus
    const p = st.p;
    if (U.rectsOverlap(b, p)) { p.y = b.y - p.h - 1; p.vy = Math.min(p.vy, 0); }
    for (const c of st.crs) if (U.rectsOverlap(b, c)) { c.y = b.y - c.h - 1; }
    for (const o of st.objs) if (o.dyn && U.rectsOverlap(b, o)) { o.y = b.y - o.h - 1; }
    st.objs.push(b);
    part(cx, cy, '#8a6b2f', 14, 90, 0.6, 3, 500);
  }
  function growPlant(o) {
    o.stage = 1;
    // hauteur jusqu'au premier solide au-dessus, max 300
    let h = 0; const x = o.x + o.w / 2;
    while (h < 300 && !pointSolid(x, o.y - h - 8)) h += 4;
    o.hMax = Math.max(80, h); o.hauteur = 0; o.racine = true;
    part(x, o.y, '#5c8f3e', 12, 70, 0.8, 3, 0, 'feuille');
    msg('La graine s\'éveille et grimpe vers le ciel.');
  }
  function hurt(c, dmg, source) {
    c.hp -= dmg; c.hurt = 0.25;
    if (c.hp <= 0) {
      c.hp = 0; part(c.x + c.w / 2, c.y + c.h / 2, c.t === 'follet' ? '#3f9c9b' : '#1f1a16', 14, 90, 0.8);
      if (c.t === 'follet' && source === 'eau') { dropPickup('plume', c.x + c.w / 2, c.y); msg('Le feu follet se dissipe en laissant une plume.'); }
      else if (c.t === 'follet') msg('Le feu follet s\'éteint en soupirant.');
      else if (c.t === 'limace') msg('La limace d\'encre se résorbe en flaque. Elle reviendra.');
      else msg(nomCreature(c.t) + ' s\'effondre en gravats. Il se relèvera.');
      c.respawn = 25;
    }
  }
  function nomCreature(t) { return t === 'limace' ? 'La limace d\'encre' : t === 'follet' ? 'Le feu follet' : 'Le golem'; }
  function dropPickup(ing, x, y) { st.pickups.push({ ing, x, y, vy: -120, vx: (Math.random() - 0.5) * 80, bob: 0 }); }

  // Effet sur soi
  function applySelf(core, prm, aim) {
    const p = st.p; const pcx = p.x + p.w / 2, pcy = p.y + p.h / 2;
    const dur = prm.duration || 1, power = prm.power || 1;
    const C = DATA.CORES[core].couleur;
    st.sp.push({ k: 'ring', core, x: pcx, y: pcy, r: 50 * (prm.size || 1), life: 0.5, max: 0.5, color: C });
    Son.sfx('cast', core);
    switch (core) {
      case 'feu': if (p.sta.wet) { p.sta.wet = 0; msg('Tu te sèches en un nuage de vapeur.'); part(pcx, pcy, '#ccc', 10, 50); } else { p.sta.burning = 2; p.hp -= 0.5; msg('Tu t\'es mis(e) le feu. Classique.'); } applyEffect('feu', pcx, pcy, 60 * (prm.size || 1), prm, 'burst', { noPlayer: true }); break;
      case 'vent': p.vy = -560 * Math.sqrt(power); p.sta.glide = 1.6 * dur; p.onGround = false; part(pcx, p.y + p.h, C, 12, 80); applyEffect('vent', pcx, pcy, 70 * (prm.size || 1), prm, 'burst', { noPlayer: true }); break;
      case 'eau': p.sta.wet = 12 * dur; p.sta.burning = 0; msg('Tu es trempé(e), mais à l\'abri du feu.'); applyEffect('eau', pcx, pcy, 60 * (prm.size || 1), prm, 'burst', { noPlayer: true }); break;
      case 'terre': p.sta.stone = 12 * dur; msg('Ta peau devient pierre.'); break;
      case 'lumiere': p.sta.lumiere = 18 * dur; applyEffect('lumiere', pcx, pcy, 160 * (prm.size || 1), prm, 'burst', { noPlayer: true, noField: true }); msg('Tu rayonnes comme une lanterne.'); break;
      case 'ombre': p.sta.invisible = 10 * dur; msg('Tu te fonds dans l\'encre. Les créatures t\'ignorent.'); break;
      case 'vie': p.hp = Math.min(p.hpMax, p.hp + 4 * power); p.sta.burning = 0; applyEffect('vie', pcx, pcy, 80 * (prm.size || 1), prm, 'burst', { noPlayer: true }); break;
      case 'force': { let dx = aim.x - pcx, dy = aim.y - pcy; const d = Math.hypot(dx, dy) || 1; dx /= d; dy /= d; p.vx = dx * 650 * Math.sqrt(power); p.vy = dy * 500 * Math.sqrt(power) - 100; p.sta.glide = 0.6; p.inv = Math.max(p.inv, 0.5); break; }
    }
  }

  // ---------- Lancer un sceau ----------
  function castSeal(seal, aim) {
    const p = st.p;
    const cost = Seal.cost(seal);
    if (p.ink < cost) { msg('Plus assez d\'encre (' + Math.floor(p.ink) + '/' + cost + ').', 'warn'); Son.sfx('fail'); return false; }
    p.ink -= cost;
    const pcx = p.x + p.w / 2, pcy = p.y + p.h * 0.45;
    const prm = Seal.params(seal);
    const trig = seal.trigger || 'immediat';
    if (!seal.core) {
      part(pcx, pcy - 20, '#777', 14, 50, 1, 4);
      Son.sfx('fizzle'); msg('Pfft. Un pétard de fumée grise. Il manque un glyphe d\'effet.');
      p.ink = Math.min(p.inkMax, p.ink + cost - 1);
      return true;
    }
    if (!seal.shape) {
      applyEffect(seal.core, pcx, pcy, 45, { ...prm, power: 0.5 }, 'burst', { noPlayer: seal.core === 'feu' ? false : true, noBloc: true });
      msg('Sans forme, l\'effet se répand mollement autour de toi.');
      return true;
    }
    const C = DATA.CORES[seal.core].couleur;
    let dx = aim.x - pcx, dy = aim.y - pcy; const d = Math.hypot(dx, dy) || 1; dx /= d; dy /= d;
    Son.sfx('cast', seal.core);
    switch (seal.shape) {
      case 'projectile': {
        const n = 1 + prm.extra;
        for (let i = 0; i < n; i++) {
          const spread = n > 1 ? (i - (n - 1) / 2) * 0.22 : 0;
          const a = Math.atan2(dy, dx) + spread;
          const sp = 520 * prm.speed;
          st.sp.push({ k: 'proj', core: seal.core, x: pcx + Math.cos(a) * 20, y: pcy + Math.sin(a) * 20, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp,
            r: 8 * prm.size, prm, trig, bounces: prm.bounces, life: 1.1 * prm.range, grav: (seal.core === 'lumiere' || seal.core === 'vent' || seal.core === 'ombre') ? 60 : 420 / prm.speed, hits: new Set(), color: C, trail: 0 });
        }
        break;
      }
      case 'soi':
        if (trig === 'immediat') applySelf(seal.core, prm, aim);
        else if (trig === 'contact') { p.trap = { core: seal.core, prm }; msg('Le sceau attend sur ta peau. Il éclatera au premier contact.'); }
        else { p.selfTimer = { core: seal.core, prm, t: 2, aim: { ...aim } }; msg('Le sceau s\'enroule autour de toi... deux secondes.'); }
        break;
      case 'zone': {
        const range = 260 * prm.range;
        const dd = Math.min(d, range);
        const n = 1 + prm.extra;
        for (let i = 0; i < n; i++) {
          const off = n > 1 ? (i - (n - 1) / 2) * 90 * prm.size : 0;
          const tx = pcx + dx * dd + -dy * off, ty = pcy + dy * dd + dx * off;
          const r = 70 * prm.size;
          if (trig === 'immediat') applyEffect(seal.core, tx, ty, r, prm, 'burst');
          else if (trig === 'contact') st.sp.push({ k: 'trap', core: seal.core, x: tx, y: ty, r: r * 0.85, prm, life: 20 * prm.duration, color: C, t: 0 });
          else st.sp.push({ k: 'timer', core: seal.core, x: tx, y: ty, r, prm, t: 2, color: C });
        }
        break;
      }
      case 'trait': {
        if (trig === 'retarde') { st.sp.push({ k: 'beamtimer', core: seal.core, x: pcx, y: pcy, dx, dy, prm, t: 2, trig: 'immediat', color: C }); msg('Le trait se charge...'); }
        else fireBeam(seal.core, pcx, pcy, dx, dy, prm, trig, C);
        break;
      }
    }
    return true;
  }
  function fireBeam(core, x, y, dx, dy, prm, trig, C) {
    const len = 320 * prm.range;
    const sols = solids();
    let ex = x, ey = y, hitEnt = null;
    const touched = new Set();
    for (let t = 0; t < len; t += 6) {
      const px = x + dx * t, py = y + dy * t;
      if (sols.some((s) => px >= s.x && px <= s.x + s.w && py >= s.y && py <= s.y + s.h)) { ex = px; ey = py; break; }
      ex = px; ey = py;
      // entités
      let stop = false;
      for (const c of st.crs) if (c.hp > 0 && px >= c.x && px <= c.x + c.w && py >= c.y && py <= c.y + c.h) { if (!touched.has(c)) touched.add(c); if (trig === 'contact') { hitEnt = c; stop = true; } }
      for (const o of st.objs) if (o.t !== 'porte' && o.t !== 'pancarte' && px >= o.x && px <= o.x + o.w && py >= o.y && py <= o.y + o.h) { if (!touched.has(o)) touched.add(o); if (trig === 'contact' && (o.solid || o.t === 'mannequin')) { hitEnt = o; stop = true; } }
      if (stop) break;
    }
    st.sp.push({ k: 'beam', core, x1: x, y1: y, x2: ex, y2: ey, life: 0.35, max: 0.35, color: C, w: 6 * prm.size });
    Son.sfx('cast', core);
    if (trig === 'contact') {
      applyEffect(core, ex, ey, 55 * prm.size, prm, 'burst', { noPlayer: true });
    } else {
      // effet le long du trait : petits éclats sur chaque point touché
      for (const e of touched) {
        const ecx = e.x + e.w / 2, ecy = e.y + e.h / 2;
        applyEffect(core, ecx, ecy, Math.max(e.w, e.h) * 0.6, { ...prm, power: prm.power * 0.8 }, 'burst', { noPlayer: true, noBloc: true, noField: true });
      }
      if (core === 'terre') makeBloc(ex - dx * 20, ey - dy * 20, prm);
      if (core === 'lumiere') st.sp.push({ k: 'field', core, x: ex, y: ey, r: 60 * prm.size, life: 4 * prm.duration, max: 4 * prm.duration, prm, faible: true });
      if (touched.size === 0 && core !== 'terre') part(ex, ey, C, 8, 60);
    }
  }

  // Potions
  function usePotion(id, aim) {
    const P = DATA.POTIONS[id]; const p = st.p; const pcx = p.x + p.w / 2, pcy = p.y + p.h * 0.45;
    if (P.usage === 'boire') {
      Son.sfx('drink');
      part(pcx, pcy - 10, P.couleur, 10, 50, 0.8, 3, -80);
      switch (id) {
        case 'encre': p.ink = Math.min(p.inkMax, p.ink + 20); msg('L\'encre coule à nouveau dans tes veines.'); break;
        case 'soin': p.hp = p.hpMax; p.sta.burning = 0; msg('Tu te sens tout(e) neuf(ve).'); break;
        case 'saut': p.sta.jump = 25; msg('Tes jambes frétillent. Saute !'); break;
        case 'vision': p.sta.vision = 40; msg('Le monde se couvre de signes que tu ne voyais pas.'); break;
        case 'legerete': p.sta.lowgrav = 25; msg('Tu flottes presque.'); break;
        case 'petitesse': p.sta.small = 20; msg('Tu rétrécis ! Le monde est immense.'); break;
        case 'peau': p.sta.stone = 40; msg('Dur comme le roc.'); break;
      }
      return true;
    }
    let dx = aim.x - pcx, dy = aim.y - pcy; const d = Math.hypot(dx, dy) || 1; dx /= d; dy /= d;
    st.sp.push({ k: 'proj', potion: id, core: id === 'flamme' ? 'feu' : 'vie', x: pcx, y: pcy, vx: dx * 460, vy: dy * 460 - 80, r: 7, prm: { power: 1.6, size: 1.4, duration: 1, persist: 0 }, trig: 'contact', bounces: 0, life: 3, grav: 700, hits: new Set(), color: P.couleur });
    Son.sfx('cast', 'eau');
    return true;
  }
  function potionBurst(id, x, y) {
    const P = DATA.POTIONS[id];
    part(x, y, P.couleur, 16, 100, 0.8, 3, 200);
    if (id === 'flamme') applyEffect('feu', x, y, 70, { power: 1.6, size: 1.2, duration: 1, persist: 1 }, 'burst');
    else if (id === 'croissance') {
      applyEffect('vie', x, y, 130, { power: 1, size: 1, duration: 1, persist: 0 }, 'burst', { noPlayer: true });
      for (const c of st.crs) if (U.circleRect(x, y, 130, c) && c.t === 'limace') { c.size = Math.min(2.2, c.size + 0.3); c.w = 36 * c.size; c.h = 24 * c.size; }
      msg('Tout verdit alentour.');
    } else if (id === 'calme') {
      for (const c of st.crs) if (c.hp > 0 && U.circleRect(x, y, 140, c) && !c.sta.tame) { c.sta.tame = true; part(c.x + c.w / 2, c.y, '#c45a8a', 8, 60, 0.9, 3, -60, 'coeur'); if (!c.filDonne) { c.filDonne = true; dropPickup('fil', c.x + c.w / 2, c.y - 10); } evt('tame', c.t); }
      st.sp.push({ k: 'ring', core: 'vie', x, y, r: 140, life: 0.5, max: 0.5, color: P.couleur });
      msg('Un calme rose se répand.');
    }
    Son.sfx('burst', 'eau');
  }

  // ---------- Mise à jour ----------
  function update(dt, inp) {
    time += dt;
    const p = st.p;
    // statuts
    for (const k in p.sta) if (p.sta[k] > 0) p.sta[k] = Math.max(0, p.sta[k] - dt);
    p.inv = Math.max(0, (p.inv || 0) - dt);
    // taille
    const wantH = p.sta.small > 0 ? 26 : 50, wantW = p.sta.small > 0 ? 14 : 26;
    if (p.h !== wantH) { const bottom = p.y + p.h; p.h = wantH; p.w = wantW; p.y = bottom - p.h; if (solids().some((s) => U.rectsOverlap(p, s))) { p.y -= 30; } }
    // encre
    p.ink = Math.min(p.inkMax, p.ink + dt * 1.8);
    // brûlure
    if (p.sta.burning > 0 && !p.sta.stone) { p.hp -= dt * 0.8; if (Math.random() < 0.3) part(p.x + p.w / 2, p.y + p.h * 0.3, '#d9622b', 1, 40, 0.5, 3, -150); }
    if (p.sta.lumiere > 0 && Math.random() < 0.2) part(p.x + p.w / 2, p.y + p.h * 0.4, '#d8a63a', 1, 30, 0.6, 2, -40, 'spark');
    if (p.sta.invisible > 0 && Math.random() < 0.2) part(p.x + p.w / 2, p.y + p.h * 0.5, '#5a4a7d', 1, 30, 0.6, 2, -30);

    // déplacement
    p.inWater = inWater(p);
    const speed = (p.inWater ? 130 : 250) * (p.sta.small > 0 ? 0.8 : 1);
    const dir = (inp.right ? 1 : 0) - (inp.left ? 1 : 0);
    const accel = p.onGround ? 2200 : 1200;
    if (dir !== 0) { p.vx = clamp(p.vx + dir * accel * dt, -speed, speed); p.face = dir; p.anim += dt * 10; }
    else { p.vx = p.onGround ? p.vx * Math.max(0, 1 - 14 * dt) : p.vx * Math.max(0, 1 - 3 * dt); }
    if (Math.abs(p.vx) > speed) p.vx *= Math.max(0, 1 - 4 * dt);
    // échelle (vigne)
    p.climbing = false;
    for (const o of st.objs) {
      if (o.t === 'graine' && o.stage === 1 && o.hauteur > 20) {
        const vine = { x: o.x - 4, y: o.y - o.hauteur, w: o.w + 8, h: o.hauteur + 8 };
        if (U.rectsOverlap(p, vine) && (inp.up || (inp.down && !p.onGround))) { p.climbing = true; p.vy = inp.up ? -160 : 140; p.vx *= 0.5; if (inp.up) p.anim += dt * 8; }
      }
    }
    // gravité
    let g = GRAV;
    if (p.sta.lowgrav > 0) g *= 0.35;
    if (p.sta.glide > 0 && p.vy > 0) g *= 0.25;
    if (p.inWater) g *= 0.15;
    if (!p.climbing) p.vy = Math.min(p.vy + g * dt, p.inWater ? 120 : 1100);
    if (p.inWater) { p.vy *= Math.max(0, 1 - 1.5 * dt); p.sta.wet = 8; p.sta.burning = 0; }
    // saut
    if (p.onGround) p.coyote = 0.1; else p.coyote -= dt;
    if (inp.jump) p.jumpBuf = 0.12; else p.jumpBuf -= dt;
    if (p.jumpBuf > 0 && (p.coyote > 0 || p.inWater || p.climbing)) {
      const j = p.inWater ? 360 : 585 * (p.sta.jump > 0 ? 1.6 : 1);
      p.vy = -j; p.coyote = 0; p.jumpBuf = 0; p.climbing = false; Son.sfx('jump');
      if (!p.inWater) part(p.x + p.w / 2, p.y + p.h, '#8a7a5a', 4, 40, 0.3, 2);
    }
    if (!inp.jumpHeld && p.vy < -150 && !p.inWater && !p.climbing) p.vy += 800 * dt; // saut court si on relâche
    const sols = solids();
    p.sur = null; p.hitX = false;
    moveBody(p, dt, sols);
    if (p.sur && p.sur.dyn) { /* porté par une caisse */ p.x += p.sur.vx * dt; }
    // pousser une caisse
    if (dir !== 0) for (const o of st.objs) if (o.t === 'caisse' && !o.mort) {
      const probe = { x: p.x + dir * 2, y: p.y, w: p.w, h: p.h };
      if (U.rectsOverlap(probe, o) && o.onGround !== false) { o.vx = dir * 70; }
    }
    // hors écran bas
    if (p.y > L.h + 100) { msg('Tu tombes dans l\'encre noire... et te réveilles devant ta porte.'); respawn(); }
    p.x = clamp(p.x, 0, L.w - p.w);
    if (p.onGround && Math.abs(p.vx) > 30 && Math.random() < dt * 6) Son.sfx('step', 'terre');
    // piège sur soi / minuteur
    if (p.selfTimer) { p.selfTimer.t -= dt; if (p.selfTimer.t <= 0) { applySelf(p.selfTimer.core, p.selfTimer.prm, p.selfTimer.aim); p.selfTimer = null; } }
    // évanouissement
    if (p.hp <= 0) { msg('Tu t\'évanouis... et te réveilles devant ta porte, un peu honteux(se).', 'warn'); Son.sfx('hurt'); respawn(); }

    // zone courante
    const z = L.zones.find((z) => p.x >= z.x && p.x < z.x + z.w);
    if (z && z.nom !== st.lastZone) { st.lastZone = z.nom; game.zoneChange(z.nom); }

    updateObjs(dt);
    updateCreatures(dt);
    updateSpells(dt);
    updateParts(dt);
    updatePickups(dt);

    // caméra
    const tx = clamp(p.x + p.w / 2 - VW / 2, 0, L.w - VW);
    st.cam.x = lerp(st.cam.x, tx, Math.min(1, dt * 6));
    if (st.shake > 0) st.shake -= dt;
  }

  function updateObjs(dt) {
    const sols = solids();
    for (const o of st.objs) {
      switch (o.t) {
        case 'caisse':
          if (o.mort) break;
          o.vy = Math.min(o.vy + GRAV * dt, 1000);
          o.vx *= Math.max(0, 1 - (o.onGround ? 6 : 1) * dt);
          moveBody(o, dt, sols.filter((s) => s !== o));
          if (inWater(o)) { o.vy -= 1400 * dt; o.burning = 0; }
          if (o.burning > 0) { o.burning -= dt; o.hp -= dt; if (Math.random() < 0.5) part(o.x + Math.random() * o.w, o.y + 4, '#d9622b', 1, 40, 0.6, 3, -200); if (o.hp <= 0) { o.mort = true; part(o.x + 18, o.y + 18, '#555', 14, 60, 1, 4); msg('La caisse n\'est plus que cendres.'); } }
          if (o.y > L.h + 50) o.mort = true;
          break;
        case 'bloc':
          if (o.life !== Infinity) { o.life -= dt; if (o.life <= 0) { o.mort = true; part(o.x + o.w / 2, o.y + o.h / 2, '#8a6b2f', 10, 60, 0.6, 3, 400); } }
          break;
        case 'mannequin':
          if (o.wob > 0) o.wob -= dt * 1.5;
          if (o.burning > 0) { o.burning -= dt; if (Math.random() < 0.3) part(o.x + o.w / 2, o.y + 6, '#d9622b', 1, 30, 0.5, 3, -150); }
          break;
        case 'torche': o.flicker = time * 9 + o.seed; break;
        case 'buisson':
          if (o.burning > 0) { o.burning -= dt; if (Math.random() < 0.7) part(o.x + Math.random() * o.w, o.y + 10, '#d9622b', 1, 40, 0.7, 3, -220); if (o.burning <= 0) { o.etat = 'cendre'; part(o.x + o.w / 2, o.y + o.h / 2, '#555', 12, 50, 1, 4); dropPickup('braise', o.x + o.w / 2, o.y); msg('Le buisson se consume. Un pétale de braise s\'en échappe.'); } }
          break;
        case 'graine':
          if (o.stage === 1 && o.hauteur < o.hMax) o.hauteur = Math.min(o.hMax, o.hauteur + dt * 120);
          if (o.stage === 1 && !o.racine) { o.regrow += dt; if (o.regrow > 30) { o.racine = true; o.regrow = 0; } }
          break;
        case 'rocher': if (o.fissure > 0) o.fissure -= dt; break;
        case 'rune':
          if (st.p.sta.vision > 0 && dist(o.x + 20, o.y + 30, st.p.x, st.p.y) < 500) o.revele = Math.min(1, o.revele + dt);
          if (o.cooldown > 0) o.cooldown -= dt;
          break;
      }
    }
    st.objs = st.objs.filter((o) => !o.mort);
    // flaques temporaires
    for (const e of st.eaux) if (e.life != null) e.life -= dt;
    st.eaux = st.eaux.filter((e) => e.life == null || e.life > 0);
  }

  function updateCreatures(dt) {
    const p = st.p; const pcx = p.x + p.w / 2, pcy = p.y + p.h / 2;
    const sols = solids();
    for (const c of st.crs) {
      if (c.hp <= 0) { c.respawn -= dt; if (c.respawn <= 0) { c.hp = c.hpMax; c.x = c.x0; c.vx = 0; c.vy = 0; c.size = 1; c.sta.tame = false; if (c.t === 'limace') { c.w = 36; c.h = 24; } } continue; }
      for (const k of ['burn', 'stun', 'sleep', 'wet']) if (c.sta[k] > 0) c.sta[k] = Math.max(0, c.sta[k] - dt);
      if (c.hurt > 0) c.hurt -= dt;
      if (c.sta.burn > 0) { hurt(c, dt * 0.7); if (Math.random() < 0.4) part(c.x + Math.random() * c.w, c.y, '#d9622b', 1, 30, 0.5, 3, -200); if (c.hp <= 0) continue; }
      const ccx = c.x + c.w / 2, ccy = c.y + c.h / 2;
      const dpx = pcx - ccx, dpy = pcy - ccy, dp = Math.hypot(dpx, dpy);
      const actif = c.sta.stun <= 0 && c.sta.sleep <= 0;
      const aggro = actif && !c.sta.tame && p.sta.invisible <= 0 && dp < (c.t === 'golem' ? 260 : c.t === 'follet' ? 300 : 280);
      c.phase += dt;
      if (c.vole) {
        // follet : flotte
        const sinY = Math.sin(c.phase * 2) * 30;
        let tx = c.x0 + Math.cos(c.phase * 0.5) * 80, ty = (c.y0 || (c.y0 = c.y)) + sinY;
        if (aggro) { tx = p.x; ty = p.y - 20; }
        if (c.sta.burn > 0) { tx = c.x0; }
        if (actif) { c.vx += (tx - c.x) * 2 * dt * 60 * 0.02; c.vy += (ty - c.y) * 2 * dt * 60 * 0.02; }
        c.vx *= Math.max(0, 1 - 3 * dt); c.vy *= Math.max(0, 1 - 3 * dt);
        c.x += c.vx * dt; c.y += c.vy * dt;
        if (Math.random() < 0.3) part(ccx, ccy, '#3f9c9b', 1, 20, 0.5, 2, -40, 'spark');
      } else {
        c.vy = Math.min(c.vy + GRAV * dt, 1000);
        if (actif) {
          if (c.t === 'limace') {
            c.hop -= dt;
            if (c.onGround && c.hop <= 0) {
              c.hop = aggro ? 0.9 : 2 + Math.random() * 2;
              const dir = aggro ? Math.sign(dpx) : (Math.random() < 0.5 ? -1 : 1);
              if (c.sta.tame && dp > 80) { c.vx = Math.sign(dpx) * 80; } else c.vx = dir * (aggro ? 110 : 50);
              c.vy = -280; c.dir = Math.sign(c.vx) || c.dir;
            }
          } else if (c.t === 'golem') {
            const sp = aggro ? 95 : 35;
            if (aggro) c.dir = Math.sign(dpx) || c.dir;
            else if (Math.abs(c.x - c.x0) > 160 || c.hitX) c.dir = Math.sign(c.x0 - c.x) || -c.dir;
            if (c.sta.tame) { if (dp > 100) c.vx = Math.sign(dpx) * 40; else c.vx *= 0.8; }
            else c.vx = lerp(c.vx, c.dir * sp, Math.min(1, dt * 4));
            if (c.onGround && Math.abs(c.vx) > 20 && Math.random() < dt * 2) { st.shake = 0.1; }
          }
        } else { c.vx *= Math.max(0, 1 - 6 * dt); }
        if (c.onGround) c.vx *= Math.max(0, 1 - 2 * dt);
        c.hitX = false;
        moveBody(c, dt, sols);
        if (c.y > L.h + 50) { c.hp = 0; c.respawn = 10; }
      }
      // contact joueur
      if (U.rectsOverlap(c, p) && actif && !c.sta.tame && p.inv <= 0) {
        const dx = Math.sign(pcx - ccx) || 1;
        p.vx = dx * 320; p.vy = -260; p.inv = 1;
        if (p.sta.stone <= 0) { p.hp -= c.dmg; Son.sfx('hurt'); msg(nomCreature(c.t) + ' te bouscule !', 'warn'); st.shake = 0.25; }
        else { msg('Ta peau de pierre encaisse le choc.'); }
        c.vx = -dx * 150;
        // piège sur soi
        if (p.trap) { applyEffect(p.trap.core, pcx, pcy, 80 * (p.trap.prm.size || 1), p.trap.prm, 'burst', { noPlayer: true }); p.trap = null; msg('Le sceau sur ta peau éclate !'); }
      } else if (U.rectsOverlap(c, p) && p.trap && c.sta.tame) {
        // rien
      }
    }
  }

  function updateSpells(dt) {
    const sols = solids();
    for (const s of st.sp) {
      switch (s.k) {
        case 'proj': {
          s.life -= dt; if (s.life <= 0) { s.mort = true; part(s.x, s.y, s.color, 5, 30, 0.4); break; }
          s.vy += s.grav * dt;
          const nx = s.x + s.vx * dt, ny = s.y + s.vy * dt;
          // solide ?
          const hitS = sols.find((o) => nx >= o.x - s.r && nx <= o.x + o.w + s.r && ny >= o.y - s.r && ny <= o.y + o.h + s.r);
          if (hitS) {
            if (s.bounces > 0) {
              s.bounces--;
              // normal approx
              const cx = clamp(s.x, hitS.x, hitS.x + hitS.w), cy = clamp(s.y, hitS.y, hitS.y + hitS.h);
              if (Math.abs(s.x - cx) > Math.abs(s.y - cy)) s.vx = -s.vx * 0.9; else s.vy = -s.vy * 0.9;
              part(s.x, s.y, s.color, 4, 40, 0.3);
              if (hitS.t && hitS.t !== 'sol' && hitS.t !== 'roc') evt('hit', 'objet:' + hitS.t);
            } else if (s.potion) { potionBurst(s.potion, s.x, s.y); s.mort = true; }
            else if (s.trig === 'contact') { applyEffect(s.core, s.x, s.y, 50 * s.prm.size, s.prm, 'burst'); s.mort = true; if (hitS.t && hitS.t !== 'sol' && hitS.t !== 'roc') evt('hit', 'objet:' + hitS.t); }
            else if (s.trig === 'retarde') { s.k = 'timer'; s.t = 2; s.r = 60 * s.prm.size; if (hitS.t && hitS.t !== 'sol' && hitS.t !== 'roc') evt('hit', 'objet:' + hitS.t); }
            else { // immédiat : petite éclaboussure
              applyEffect(s.core, s.x, s.y, 28 * s.prm.size, { ...s.prm, power: s.prm.power * 0.6 }, 'burst', { noField: s.core !== 'lumiere' });
              if (hitS.t && hitS.t !== 'sol' && hitS.t !== 'roc') evt('hit', 'objet:' + hitS.t);
              s.mort = true;
            }
            break;
          }
          s.x = nx; s.y = ny;
          // eau
          if (s.core === 'feu' && st.eaux.some((e) => s.x > e.x && s.x < e.x + e.w && s.y > e.y && s.y < e.y + e.h)) { part(s.x, s.y, '#ccc', 8, 40, 0.7, 4, -100); s.mort = true; break; }
          // entités
          let touche = null;
          for (const c of st.crs) if (c.hp > 0 && U.circleRect(s.x, s.y, s.r, c) && !s.hits.has(c)) { touche = c; break; }
          if (!touche) for (const o of st.objs) if (o.t !== 'porte' && o.t !== 'pancarte' && !o.solid && U.circleRect(s.x, s.y, s.r, o) && !s.hits.has(o)) { touche = o; break; }
          if (touche) {
            if (s.potion) { potionBurst(s.potion, s.x, s.y); s.mort = true; }
            else if (s.trig === 'contact') { applyEffect(s.core, s.x, s.y, 50 * s.prm.size, s.prm, 'burst'); s.mort = true; }
            else if (s.trig === 'retarde') { s.k = 'timer'; s.t = 2; s.r = 60 * s.prm.size; s.vx = 0; s.vy = 0; }
            else { s.hits.add(touche); applyEffect(s.core, s.x, s.y, s.r + 10, { ...s.prm, power: s.prm.power * 0.9 }, 'burst', { noField: true, noPlayer: true, noBloc: true }); Son.sfx('hit', s.core); }
          }
          // traînée
          s.trail += dt; if (s.trail > 0.03) { s.trail = 0; part(s.x, s.y, s.color, 1, 10, 0.35, s.r * 0.5, 0, s.core === 'lumiere' ? 'spark' : 'dot'); }
          if (s.y > L.h + 50) s.mort = true;
          break;
        }
        case 'trap': {
          s.life -= dt; s.t += dt; if (s.life <= 0) { s.mort = true; break; }
          const hit = st.crs.some((c) => c.hp > 0 && U.circleRect(s.x, s.y, s.r, c)) || st.objs.some((o) => o.dyn && U.circleRect(s.x, s.y, s.r, o));
          if (hit) { applyEffect(s.core, s.x, s.y, s.r * 1.2, s.prm, 'burst'); s.mort = true; }
          break;
        }
        case 'timer': s.t -= dt; if (s.t <= 0) { applyEffect(s.core, s.x, s.y, s.r || 60 * s.prm.size, s.prm, 'burst'); s.mort = true; } break;
        case 'beamtimer': s.t -= dt; if (s.t <= 0) { const p = st.p; fireBeam(s.core, p.x + p.w / 2, p.y + p.h * 0.45, s.dx, s.dy, s.prm, 'immediat', s.color); s.mort = true; } break;
        case 'field': {
          s.life -= dt; if (s.life <= 0) { s.mort = true; break; }
          if (s.faible) break; // lumière seule : juste éclairer (et révéler)
          applyEffect(s.core, s.x, s.y, s.r, { ...s.prm, power: s.prm.power * 0.5 }, dt, { noBloc: true });
          if (Math.random() < 0.6) { const a = Math.random() * TAU, rr = Math.random() * s.r; part(s.x + Math.cos(a) * rr, s.y + Math.sin(a) * rr * 0.5, DATA.CORES[s.core].couleur, 1, 20, 0.7, 3, s.core === 'feu' ? -200 : s.core === 'eau' ? 100 : -30, s.core === 'lumiere' ? 'spark' : 'dot'); }
          break;
        }
        case 'ring': case 'beam': s.life -= dt; if (s.life <= 0) s.mort = true; break;
      }
      if (s.k === 'field' && s.faible) {
        // révéler les runes proches
        for (const o of st.objs) if (o.t === 'rune' && U.circleRect(s.x, s.y, s.r * 2, o)) o.revele = Math.min(1, o.revele + dt * 0.8);
      }
    }
    // lumière du joueur révèle aussi
    if (st.p.sta.lumiere > 0) for (const o of st.objs) if (o.t === 'rune' && dist(o.x + 20, o.y + 30, st.p.x, st.p.y) < 220) o.revele = Math.min(1, o.revele + dt * 0.8);
    st.sp = st.sp.filter((s) => !s.mort);
  }

  function updateParts(dt) {
    for (const q of st.parts) { q.life -= dt; q.vy += q.grav * dt; q.x += q.vx * dt; q.y += q.vy * dt; q.vx *= Math.max(0, 1 - 2 * dt); }
    st.parts = st.parts.filter((q) => q.life > 0);
  }
  function updatePickups(dt) {
    const p = st.p; const sols = solids();
    for (const k of st.pickups) {
      k.vy += 900 * dt; k.x += k.vx * dt; k.y += k.vy * dt; k.vx *= 0.98; k.bob += dt;
      const s = sols.find((s) => k.x >= s.x && k.x <= s.x + s.w && k.y >= s.y && k.y <= s.y + s.h);
      if (s && k.vy > 0) { k.y = s.y - 1; k.vy = 0; k.vx = 0; }
      if (dist(k.x, k.y, p.x + p.w / 2, p.y + p.h / 2) < 36) { k.pris = true; game.gainIngredient(k.ing); }
      if (k.y > L.h + 50) k.pris = true;
    }
    st.pickups = st.pickups.filter((k) => !k.pris);
  }

  // Interaction (E)
  function interact() {
    const p = st.p; const pcx = p.x + p.w / 2, pcy = p.y + p.h / 2;
    let best = null, bd = 90;
    for (const o of st.objs) { const d = dist(pcx, pcy, o.x + o.w / 2, o.y + o.h / 2); if (d < bd + Math.max(o.w, o.h) / 2 && interactible(o)) { best = o; bd = d; } }
    // mare : rosée
    for (const e of st.eaux) if (!e.flaque && pcx > e.x - 30 && pcx < e.x + e.w + 30 && pcy > e.y - 80 && pcy < e.y + e.h) { best = { t: 'mare', e }; }
    if (!best) return;
    switch (best.t) {
      case 'porte': Son.sfx('door'); game.goLab(); break;
      case 'mare': game.gainIngredient('rosee'); part(pcx, pcy + 10, '#6aa0d8', 8, 40, 0.6); break;
      case 'champignon': best.pris = true; best.mort = true; game.gainIngredient('champignon'); part(best.x + 11, best.y, '#5a4a7d', 8, 40); break;
      case 'graine': if (best.stage === 1 && best.racine) { best.racine = false; best.regrow = 0; game.gainIngredient('racine'); part(best.x + 10, best.y - 20, '#5c8f3e', 8, 40, 0.6, 3, 0, 'feuille'); } break;
      case 'rune': if (best.revele >= 1 && best.cooldown <= 0) { best.cooldown = 30; if (!best.lu) { best.lu = true; evt('rune'); msg('Tu déchiffres la rune. Elle te confie une lueur captive.'); } game.gainIngredient('lueur'); part(best.x + 20, best.y + 30, '#d8a63a', 12, 60, 0.9, 2, 0, 'spark'); } break;
      case 'torche': if (best.lit) { best.lit = false; part(best.x + 7, best.y + 4, '#999', 8, 40); } break;
    }
  }
  function interactible(o) {
    if (o.t === 'porte') return true;
    if (o.t === 'champignon') return !o.pris;
    if (o.t === 'graine') return o.stage === 1 && o.racine;
    if (o.t === 'rune') return o.revele >= 1 && o.cooldown <= 0;
    return false;
  }
  function nearInteract() {
    const p = st.p; const pcx = p.x + p.w / 2, pcy = p.y + p.h / 2;
    for (const o of st.objs) { if (interactible(o) && dist(pcx, pcy, o.x + o.w / 2, o.y + o.h / 2) < 90 + Math.max(o.w, o.h) / 2) return o.t === 'porte' ? 'Entrer au labo' : o.t === 'champignon' ? 'Cueillir le champignon' : o.t === 'graine' ? 'Cueillir une racine' : 'Lire la rune'; }
    for (const e of st.eaux) if (!e.flaque && pcx > e.x - 30 && pcx < e.x + e.w + 30 && pcy > e.y - 80 && pcy < e.y + e.h) return 'Recueillir de la rosée';
    return null;
  }

  // ---------- Rendu ----------
  function draw(ctx, paperPat, inp, selected) {
    const cam = st.cam; const p = st.p;
    const shx = st.shake > 0 ? (Math.random() - 0.5) * 6 : 0;
    ctx.save();
    // fond
    ctx.fillStyle = paperPat; ctx.fillRect(0, 0, VW, VH);
    drawBackground(ctx, cam);
    ctx.translate(-Math.round(cam.x) + shx, 0);

    // eaux
    for (const e of st.eaux) drawWater(ctx, e);
    // solides
    for (const s of L.solides) if (s.x + s.w > cam.x - 50 && s.x < cam.x + VW + 50) drawSolid(ctx, s);
    // objets
    for (const o of st.objs) if (o.x + o.w > cam.x - 100 && o.x < cam.x + VW + 100) drawObj(ctx, o);
    // pickups
    for (const k of st.pickups) { const ing = DATA.INGREDIENTS[k.ing]; const yy = k.y - 10 + Math.sin(k.bob * 4) * 3; ctx.save(); ctx.fillStyle = ing.couleur; ctx.strokeStyle = INK; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.arc(k.x, yy, 7, 0, TAU); ctx.fill(); ctx.stroke(); ctx.fillStyle = 'rgba(255,255,255,0.5)'; ctx.beginPath(); ctx.arc(k.x - 2, yy - 2, 2, 0, TAU); ctx.fill(); ctx.restore(); }
    // créatures
    for (const c of st.crs) if (c.hp > 0) drawCreature(ctx, c);
    // joueur
    drawPlayer(ctx, p);
    // sorts
    for (const s of st.sp) drawSpell(ctx, s);
    // particules
    for (const q of st.parts) drawPart(ctx, q);
    ctx.restore();

    // obscurité des grottes
    drawDark(ctx, cam);

    // réticule
    ctx.save();
    const mx = inp.mouse.x, my = inp.mouse.y;
    const col = selected && selected.type === 'seal' && selected.seal.core ? DATA.CORES[selected.seal.core].couleur : selected && selected.type === 'potion' ? DATA.POTIONS[selected.id].couleur : '#8a7a5a';
    ctx.strokeStyle = col; ctx.lineWidth = 1.5; ctx.globalAlpha = 0.9;
    U.inkCircle(ctx, mx, my, 10, 5, 0.5);
    ctx.beginPath(); ctx.arc(mx, my, 2, 0, TAU); ctx.fillStyle = col; ctx.fill();
    ctx.setLineDash([3, 5]); ctx.globalAlpha = 0.35;
    U.inkLine(ctx, p.x + p.w / 2 - cam.x, p.y + p.h * 0.45, mx, my, 2, 0.5);
    ctx.restore();
    // pancartes & interaction
    for (const o of st.objs) if (o.t === 'pancarte' && dist(o.x, o.y, p.x, p.y) < 120) {
      drawBubble(ctx, o.x + o.w / 2 - cam.x, o.y - 20, o.texte);
    }
    const ni = nearInteract();
    if (ni) drawBubble(ctx, p.x + p.w / 2 - cam.x, p.y - 26, '[E] ' + ni);
  }

  function drawBubble(ctx, x, y, text) {
    ctx.save();
    ctx.font = '16px "IM Fell English", Georgia, serif';
    const w = ctx.measureText(text).width + 24;
    const bx = clamp(x - w / 2, 8, VW - w - 8), by = y - 34;
    ctx.fillStyle = 'rgba(239,227,196,0.95)'; ctx.strokeStyle = INK; ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.roundRect(bx, by, w, 28, 6); ctx.fill(); ctx.stroke();
    U.txt(ctx, text, bx + w / 2, by + 14, 16, 'center');
    ctx.restore();
  }

  function drawBackground(ctx, cam) {
    // soleil doux
    ctx.save();
    ctx.globalAlpha = 0.5;
    const sx = 980 - cam.x * 0.05, sy = 110;
    const g = ctx.createRadialGradient(sx, sy, 10, sx, sy, 160);
    g.addColorStop(0, 'rgba(230,190,90,0.6)'); g.addColorStop(1, 'rgba(230,190,90,0)');
    ctx.fillStyle = g; ctx.fillRect(sx - 160, sy - 160, 320, 320);
    ctx.strokeStyle = INK; ctx.lineWidth = 1.2; ctx.globalAlpha = 0.5;
    U.inkCircle(ctx, sx, sy, 38, 9, 1.5);
    ctx.restore();
    // collines lointaines (parallaxe)
    ctx.save();
    ctx.strokeStyle = INK; ctx.lineWidth = 1.3; ctx.globalAlpha = 0.45;
    for (let layer = 0; layer < 2; layer++) {
      const par = 0.2 + layer * 0.15, base = 430 + layer * 60;
      ctx.beginPath();
      const off = cam.x * par;
      for (let x = -20; x <= VW + 20; x += 8) {
        const wx = x + off;
        const y = base - 60 * Math.sin(wx * 0.004 + layer) - 25 * Math.sin(wx * 0.011 + layer * 2) + U.hash2(wx / 8, layer) * 2;
        if (x === -20) ctx.moveTo(x, y); else ctx.lineTo(x, y);
      }
      ctx.stroke();
      // arbres schématiques
      for (let i = 0; i < 24; i++) {
        const wx = i * 260 + layer * 130;
        const x = wx - off;
        const sxm = ((x % (VW + 400)) + VW + 400) % (VW + 400) - 200;
        const y = base - 60 * Math.sin((sxm + off) * 0.004 + layer) - 25 * Math.sin((sxm + off) * 0.011 + layer * 2);
        ctx.globalAlpha = 0.3;
        U.inkLine(ctx, sxm, y, sxm, y - 26 - (i % 3) * 8, i, 0.6);
        U.inkCircle(ctx, sxm, y - 34 - (i % 3) * 8, 10 + (i % 4) * 2, i + 3, 1.2);
      }
      ctx.globalAlpha = 0.45;
    }
    // nuages
    ctx.globalAlpha = 0.35; ctx.lineWidth = 1.2;
    for (let i = 0; i < 6; i++) {
      const x = ((i * 420 + time * 6 - cam.x * 0.08) % (VW + 300) + VW + 300) % (VW + 300) - 150;
      const y = 80 + (i % 3) * 50;
      for (let k = 0; k < 4; k++) U.inkCircle(ctx, x + k * 22, y + (k % 2) * 6, 14 + (k % 2) * 6, i * 10 + k, 1.2);
    }
    ctx.restore();
  }

  function drawSolid(ctx, s) {
    ctx.save();
    const grotte = inGrotte(s.x + s.w / 2, s.y + s.h / 2) || (s.t === 'roc' && s.y < 200 && s.x >= 2650 && s.x < 3600);
    ctx.fillStyle = s.t === 'sol' ? 'rgba(170,140,90,0.25)' : grotte ? 'rgba(90,75,60,0.45)' : 'rgba(140,115,80,0.32)';
    ctx.fillRect(s.x, s.y, s.w, s.h);
    U.hatch(ctx, s.x, s.y, s.w, s.h, s.t === 'sol' ? 9 : 7, s.t === 'sol' ? Math.PI / 3 : Math.PI / 4, s.seed || (s.x | 0), 0.35);
    if (s.h > 60) U.hatch(ctx, s.x, s.y + s.h * 0.5, s.w, s.h * 0.5, 7, -Math.PI / 4, (s.x | 0) + 1, 0.25);
    ctx.strokeStyle = INK; ctx.lineWidth = 2.2;
    U.inkRect(ctx, s.x, s.y, s.w, s.h, (s.x * 3 + s.y) | 0, 1.5);
    if (s.t === 'sol') {
      // touffes d'herbe
      ctx.lineWidth = 1.3;
      const r = U.mulberry32(s.x | 0);
      for (let x = s.x + 6; x < s.x + s.w - 6; x += 14 + r() * 20) {
        const h = 6 + r() * 8;
        U.inkLine(ctx, x, s.y, x - 3, s.y - h, x | 0, 0.4);
        U.inkLine(ctx, x, s.y, x + 2, s.y - h * 0.8, (x | 0) + 1, 0.4);
      }
    } else {
      // fissures
      ctx.lineWidth = 1; ctx.globalAlpha = 0.6;
      const r = U.mulberry32((s.x + s.y) | 0);
      for (let i = 0; i < Math.max(1, (s.w * s.h) / 9000); i++) {
        const x = s.x + r() * s.w, y = s.y + r() * s.h;
        U.inkPoly(ctx, [[x, y], [x + (r() - 0.5) * 30, y + r() * 20], [x + (r() - 0.5) * 30, y + r() * 40]], i, 1, false);
      }
    }
    ctx.restore();
  }
  function drawWater(ctx, e) {
    ctx.save();
    ctx.fillStyle = 'rgba(80,130,190,0.35)';
    ctx.fillRect(e.x, e.y, e.w, e.h);
    ctx.strokeStyle = '#3b6fb6'; ctx.lineWidth = 1.5; ctx.globalAlpha = 0.8;
    for (let k = 0; k < (e.flaque ? 1 : 3); k++) {
      const yy = e.y + 4 + k * 22;
      ctx.beginPath();
      for (let x = e.x; x <= e.x + e.w; x += 6) { const y = yy + Math.sin(x * 0.08 + time * 3 + k) * 2.5; if (x === e.x) ctx.moveTo(x, y); else ctx.lineTo(x, y); }
      ctx.stroke();
    }
    ctx.restore();
  }

  function drawObj(ctx, o) {
    ctx.save();
    ctx.strokeStyle = INK; ctx.lineWidth = 2; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    const cx = o.x + o.w / 2;
    switch (o.t) {
      case 'porte': {
        // cadre de porte avec arche, écriteau "Labo"
        ctx.fillStyle = 'rgba(120,90,50,0.35)';
        ctx.beginPath(); ctx.moveTo(o.x, o.y + o.h); ctx.lineTo(o.x, o.y + 30); ctx.arc(cx, o.y + 30, o.w / 2, Math.PI, 0); ctx.lineTo(o.x + o.w, o.y + o.h); ctx.closePath(); ctx.fill(); ctx.stroke();
        U.hatch(ctx, o.x + 4, o.y + 4, o.w - 8, o.h - 4, 6, Math.PI / 2, 5, 0.3);
        ctx.beginPath(); ctx.arc(o.x + o.w - 16, o.y + 65, 3, 0, TAU); ctx.fill();
        // panneau
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
        // cible
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
        U.inkLine(ctx, o.x, o.y, o.x + o.w, o.y + o.h, o.seed + 1, 1);
        U.inkLine(ctx, o.x + o.w, o.y, o.x, o.y + o.h, o.seed + 2, 1);
        break;
      }
      case 'torche': {
        U.inkLine(ctx, cx, o.y + o.h, cx, o.y + 12, o.seed, 0.8);
        ctx.fillStyle = 'rgba(120,90,50,0.5)';
        ctx.beginPath(); ctx.moveTo(cx - 8, o.y + 14); ctx.lineTo(cx + 8, o.y + 14); ctx.lineTo(cx + 5, o.y + 26); ctx.lineTo(cx - 5, o.y + 26); ctx.closePath(); ctx.fill(); ctx.stroke();
        if (o.lit) {
          const f = Math.sin(o.flicker) * 3;
          const g = ctx.createRadialGradient(cx, o.y + 4, 2, cx, o.y + 4, 40);
          g.addColorStop(0, 'rgba(240,180,80,0.6)'); g.addColorStop(1, 'rgba(240,180,80,0)');
          ctx.fillStyle = g; ctx.fillRect(cx - 40, o.y - 40, 80, 80);
          ctx.fillStyle = '#d9622b'; ctx.strokeStyle = '#8a3a1b';
          ctx.beginPath(); ctx.moveTo(cx - 6, o.y + 14); ctx.quadraticCurveTo(cx - 8 + f, o.y - 4, cx, o.y - 14 + f); ctx.quadraticCurveTo(cx + 8 - f, o.y - 4, cx + 6, o.y + 14); ctx.closePath(); ctx.fill(); ctx.stroke();
          ctx.fillStyle = '#f0c060'; ctx.beginPath(); ctx.arc(cx, o.y + 6, 3, 0, TAU); ctx.fill();
          if (Math.random() < 0.15) part(cx, o.y, '#d9622b', 1, 20, 0.6, 2, -120);
        } else {
          ctx.fillStyle = '#444'; ctx.beginPath(); ctx.arc(cx, o.y + 10, 4, 0, TAU); ctx.fill();
        }
        break;
      }
      case 'graine': {
        if (o.stage === 0) {
          ctx.fillStyle = '#8a6b2f'; ctx.beginPath(); ctx.ellipse(cx, o.y + 6, 7, 5, 0.3, 0, TAU); ctx.fill(); ctx.stroke();
          U.inkLine(ctx, cx, o.y + 2, cx + 3, o.y - 6, o.seed, 0.4);
        } else {
          // vigne
          ctx.strokeStyle = '#3e6b2a'; ctx.lineWidth = 3;
          ctx.beginPath(); ctx.moveTo(cx, o.y + 8);
          for (let y = 0; y <= o.hauteur; y += 6) ctx.lineTo(cx + Math.sin(y * 0.08 + o.seed) * 5, o.y + 8 - y);
          ctx.stroke();
          ctx.strokeStyle = INK; ctx.lineWidth = 1.2; ctx.fillStyle = 'rgba(92,143,62,0.6)';
          for (let y = 14; y <= o.hauteur; y += 22) {
            const side = (Math.floor(y / 22) % 2) ? 1 : -1;
            const lx = cx + Math.sin(y * 0.08 + o.seed) * 5, ly = o.y + 8 - y;
            ctx.beginPath(); ctx.ellipse(lx + side * 10, ly, 11, 5, side * 0.5, 0, TAU); ctx.fill(); ctx.stroke();
          }
          if (o.racine && o.hauteur >= o.hMax) { ctx.fillStyle = '#c45a8a'; ctx.beginPath(); ctx.arc(cx + 6, o.y - o.hauteur + 4, 5, 0, TAU); ctx.fill(); ctx.stroke(); }
        }
        break;
      }
      case 'buisson': {
        if (o.etat === 'vert') {
          ctx.fillStyle = o.burning > 0 ? 'rgba(217,98,43,0.4)' : 'rgba(92,143,62,0.45)';
          for (const [dx, dy, r] of [[-12, 12, 16], [12, 12, 16], [0, 0, 18], [-6, 18, 12], [8, 20, 12]]) { ctx.beginPath(); ctx.arc(cx + dx, o.y + o.h / 2 + dy - 10, r, 0, TAU); ctx.fill(); }
          ctx.lineWidth = 1.8;
          for (const [dx, dy, r] of [[-12, 12, 16], [12, 12, 16], [0, 0, 18]]) U.inkCircle(ctx, cx + dx, o.y + o.h / 2 + dy - 10, r, o.seed + dx, 1.5);
          U.hatch(ctx, o.x, o.y + 10, o.w, o.h - 10, 6, Math.PI / 3, o.seed, 0.2);
        } else {
          ctx.lineWidth = 1.5; ctx.strokeStyle = '#444';
          U.inkLine(ctx, cx, o.y + o.h, cx - 4, o.y + 16, o.seed, 0.8); U.inkLine(ctx, cx - 4, o.y + 26, cx - 14, o.y + 14, o.seed + 1, 0.8); U.inkLine(ctx, cx - 2, o.y + 30, cx + 10, o.y + 18, o.seed + 2, 0.8);
          ctx.fillStyle = 'rgba(80,80,80,0.4)'; ctx.beginPath(); ctx.ellipse(cx, o.y + o.h - 2, 20, 5, 0, 0, TAU); ctx.fill();
        }
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
        ctx.lineWidth = 1.2;
        U.inkPoly(ctx, [[o.x + 20, o.y + 10], [o.x + 28, o.y + 26], [o.x + 22, o.y + 40], [o.x + 30, o.y + 54]], o.seed + 1, 1, false);
        if (o.fissure > 0) { ctx.strokeStyle = '#d9622b'; U.inkPoly(ctx, [[o.x + 20, o.y + 10], [o.x + 28, o.y + 26], [o.x + 22, o.y + 40]], o.seed + 1, 1, false); }
        break;
      }
      case 'glace': {
        ctx.fillStyle = 'rgba(170,215,240,0.55)';
        ctx.fillRect(o.x, o.y, o.w, o.h); ctx.strokeStyle = '#4a7fa8'; U.inkRect(ctx, o.x, o.y, o.w, o.h, o.seed, 1);
        ctx.lineWidth = 1; U.inkLine(ctx, o.x + 10, o.y + 10, o.x + 30, o.y + 60, o.seed + 1, 1); U.inkLine(ctx, o.x + 40, o.y + 20, o.x + 24, o.y + 90, o.seed + 2, 1);
        if (o.fonte > 0) { ctx.fillStyle = 'rgba(80,130,190,0.35)'; ctx.fillRect(o.x - 6, o.y + o.h - 6, o.w + 12, 6 + o.fonte * 6); }
        break;
      }
      case 'champignon': {
        ctx.fillStyle = '#efe3c4'; ctx.fillRect(cx - 4, o.y + 12, 8, 14); U.inkRect(ctx, cx - 4, o.y + 12, 8, 14, o.seed, 0.5);
        ctx.fillStyle = '#5a4a7d'; ctx.beginPath(); ctx.ellipse(cx, o.y + 12, 13, 9, 0, Math.PI, 0); ctx.closePath(); ctx.fill(); ctx.stroke();
        ctx.fillStyle = '#efe3c4'; ctx.beginPath(); ctx.arc(cx - 4, o.y + 7, 2, 0, TAU); ctx.arc(cx + 5, o.y + 9, 1.6, 0, TAU); ctx.fill();
        if (Math.random() < 0.05) part(cx, o.y, '#5a4a7d', 1, 15, 0.8, 2, -20);
        break;
      }
      case 'rune': {
        ctx.globalAlpha = 0.25 + o.revele * 0.75;
        ctx.strokeStyle = o.revele > 0.95 ? '#d8a63a' : 'rgba(80,60,40,0.5)';
        ctx.lineWidth = 2;
        const r = 18;
        U.inkCircle(ctx, cx, o.y + 30, r, o.seed, 0.8);
        Seal.glyph(ctx, o.lu ? 'lumiere' : 'retarde', cx, o.y + 30, r * 0.6, ctx.strokeStyle, o.seed);
        for (let i = 0; i < 3; i++) { const a = -Math.PI / 2 + (i / 3) * TAU; U.inkLine(ctx, cx + Math.cos(a) * r, o.y + 30 + Math.sin(a) * r, cx + Math.cos(a) * (r + 8), o.y + 30 + Math.sin(a) * (r + 8), i, 0.5); }
        if (o.revele >= 1) { const g = ctx.createRadialGradient(cx, o.y + 30, 5, cx, o.y + 30, 50); g.addColorStop(0, 'rgba(216,166,58,0.35)'); g.addColorStop(1, 'rgba(216,166,58,0)'); ctx.fillStyle = g; ctx.fillRect(cx - 50, o.y - 20, 100, 100); }
        break;
      }
      case 'bloc': {
        const a = o.life === Infinity ? 1 : clamp(o.life / 1.5, 0.3, 1);
        ctx.globalAlpha = a;
        ctx.fillStyle = 'rgba(138,107,47,0.45)'; ctx.fillRect(o.x, o.y, o.w, o.h);
        U.hatch(ctx, o.x, o.y, o.w, o.h, 6, Math.PI / 4, o.seed, 0.35);
        ctx.strokeStyle = '#5a4520'; ctx.lineWidth = 2.5; U.inkRect(ctx, o.x, o.y, o.w, o.h, o.seed, 2);
        Seal.glyph(ctx, 'terre', cx, o.y + o.h / 2, o.w * 0.22, 'rgba(60,45,20,0.5)', o.seed);
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
      case 'limace': {
        const sq = c.onGround ? 1 : 0.85;
        ctx.fillStyle = c.sta.tame ? 'rgba(196,90,138,0.55)' : 'rgba(31,26,22,0.75)';
        ctx.beginPath(); ctx.ellipse(cx, by - c.h * 0.45 * sq, c.w / 2, c.h * 0.45 * sq, 0, 0, TAU); ctx.fill(); ctx.stroke();
        // yeux
        ctx.fillStyle = '#efe3c4';
        const ex = cx + c.dir * c.w * 0.2;
        ctx.beginPath(); ctx.arc(ex, by - c.h * 0.6, 4 * c.size, 0, TAU); ctx.arc(ex + c.dir * 9 * c.size, by - c.h * 0.6, 4 * c.size, 0, TAU); ctx.fill();
        ctx.fillStyle = INK;
        if (c.sta.sleep > 0) { U.inkLine(ctx, ex - 3, by - c.h * 0.6, ex + 3, by - c.h * 0.6, 1, 0.3); U.inkLine(ctx, ex + c.dir * 9 * c.size - 3, by - c.h * 0.6, ex + c.dir * 9 * c.size + 3, by - c.h * 0.6, 1, 0.3); }
        else { ctx.beginPath(); ctx.arc(ex + c.dir, by - c.h * 0.6, 1.8 * c.size, 0, TAU); ctx.arc(ex + c.dir * 10 * c.size, by - c.h * 0.6, 1.8 * c.size, 0, TAU); ctx.fill(); }
        // gouttes d'encre
        if (Math.random() < 0.08) part(cx - c.dir * c.w * 0.4, by - 2, '#1f1a16', 1, 5, 0.8, 2, 200);
        break;
      }
      case 'follet': {
        const r = 10 * c.size;
        const g = ctx.createRadialGradient(cx, c.y + c.h / 2, 2, cx, c.y + c.h / 2, r * 3);
        g.addColorStop(0, 'rgba(120,220,210,0.5)'); g.addColorStop(1, 'rgba(120,220,210,0)');
        ctx.fillStyle = g; ctx.fillRect(cx - r * 3, c.y + c.h / 2 - r * 3, r * 6, r * 6);
        ctx.fillStyle = c.sta.tame ? '#c45a8a' : '#3f9c9b'; ctx.strokeStyle = '#1f1a16'; ctx.lineWidth = 1.5;
        ctx.beginPath(); ctx.moveTo(cx - r, c.y + c.h / 2 + r * 0.6); ctx.quadraticCurveTo(cx - r * 1.2, c.y - r * 0.4, cx, c.y - r + Math.sin(time * 8) * 3); ctx.quadraticCurveTo(cx + r * 1.2, c.y - r * 0.4, cx + r, c.y + c.h / 2 + r * 0.6); ctx.quadraticCurveTo(cx, c.y + c.h + 2, cx - r, c.y + c.h / 2 + r * 0.6); ctx.fill(); ctx.stroke();
        ctx.fillStyle = '#1f1a16'; ctx.beginPath(); ctx.arc(cx - 3, c.y + c.h / 2, 1.8, 0, TAU); ctx.arc(cx + 3, c.y + c.h / 2, 1.8, 0, TAU); ctx.fill();
        break;
      }
      case 'golem': {
        ctx.fillStyle = c.sta.tame ? 'rgba(196,90,138,0.35)' : 'rgba(138,107,47,0.45)';
        const walk = Math.sin(time * 6) * (Math.abs(c.vx) > 10 ? 1 : 0);
        // jambes
        ctx.fillStyle = 'rgba(138,107,47,0.5)';
        ctx.fillRect(cx - 20 + walk * 3, by - 22, 14, 22); ctx.fillRect(cx + 6 - walk * 3, by - 22, 14, 22);
        U.inkRect(ctx, cx - 20 + walk * 3, by - 22, 14, 22, c.seed, 1); U.inkRect(ctx, cx + 6 - walk * 3, by - 22, 14, 22, c.seed + 1, 1);
        // corps
        ctx.fillStyle = c.sta.tame ? 'rgba(196,90,138,0.4)' : 'rgba(138,107,47,0.55)';
        U.inkPolyPath(ctx, [[c.x + 4, by - 22], [c.x, by - 54], [c.x + 12, by - 66], [c.x + c.w - 10, by - 68], [c.x + c.w, by - 50], [c.x + c.w - 4, by - 22]], c.seed + 2, 1.5);
        ctx.fill(); ctx.stroke();
        U.hatch(ctx, c.x, by - 68, c.w, 46, 6, Math.PI / 4, c.seed, 0.25);
        // bras
        U.inkLine(ctx, c.x + 2, by - 50, c.x - 10 + walk * 4, by - 26, c.seed + 3, 1); U.inkLine(ctx, c.x + c.w - 2, by - 50, c.x + c.w + 10 - walk * 4, by - 26, c.seed + 4, 1);
        // yeux (runes)
        ctx.fillStyle = c.sta.sleep > 0 ? '#555' : c.sta.stun > 0 ? '#d8a63a' : '#d9622b';
        ctx.beginPath(); ctx.arc(cx - 8 + c.dir * 3, by - 56, 3, 0, TAU); ctx.arc(cx + 8 + c.dir * 3, by - 56, 3, 0, TAU); ctx.fill();
        break;
      }
    }
    // statuts
    if (c.sta.sleep > 0) U.txt(ctx, 'z z', cx + 14, c.y - 10 + Math.sin(time * 3) * 3, 14, 'left', '#5a4a7d', 'IM Fell English', 'italic');
    if (c.sta.stun > 0) { ctx.strokeStyle = '#d8a63a'; ctx.lineWidth = 1.5; for (let i = 0; i < 3; i++) { const a = time * 5 + (i / 3) * TAU; ctx.beginPath(); ctx.arc(cx + Math.cos(a) * 14, c.y - 8 + Math.sin(a) * 4, 2, 0, TAU); ctx.stroke(); } }
    if (c.sta.tame) { ctx.fillStyle = '#c45a8a'; ctx.font = '14px serif'; ctx.textAlign = 'center'; ctx.fillText('♥', cx, c.y - 8 + Math.sin(time * 3) * 2); }
    if (c.sta.wet > 0 && Math.random() < 0.05) part(cx, by - 4, '#6aa0d8', 1, 10, 0.6, 2, 300);
    if (c.hp < c.hpMax) { ctx.fillStyle = 'rgba(31,26,22,0.3)'; ctx.fillRect(c.x, c.y - 6, c.w, 3); ctx.fillStyle = '#9a4a3a'; ctx.fillRect(c.x, c.y - 6, c.w * c.hp / c.hpMax, 3); }
    ctx.restore();
  }

  // Apprenti(e) : utilisé aussi dans le labo
  function drawApprenti(ctx, x, y, h, look, face = 1, anim = 0, sta = null, moving = false) {
    // x,y = pieds (centre bas) ; h = hauteur
    ctx.save();
    ctx.translate(x, y);
    const s = h / 50;
    ctx.scale(s * face, s);
    ctx.lineWidth = 1.8 / s; ctx.strokeStyle = INK; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    const cape = DATA.CAPES[look.cape] ? DATA.CAPES[look.cape].c : '#6b3f73';
    if (sta && sta.invisible > 0) ctx.globalAlpha = 0.4;
    const bob = moving ? Math.sin(anim) * 1.5 : 0;
    const leg = moving ? Math.sin(anim) * 5 : 0;
    // jambes
    U.inkLine(ctx, -4, -14, -5 + leg, 0, 1, 0.3); U.inkLine(ctx, 4, -14, 5 - leg, 0, 2, 0.3);
    // cape / robe
    ctx.fillStyle = cape;
    U.inkPolyPath(ctx, [[-6, -34 + bob], [6, -34 + bob], [13, -8], [-13, -8]], 3, 0.6); ctx.fill(); ctx.stroke();
    if (sta && sta.stone > 0) { ctx.save(); ctx.globalAlpha = 0.5; U.hatch(ctx, -13, -34, 26, 26, 3, Math.PI / 4, 1, 0.5, '#8a6b2f'); ctx.restore(); }
    // bras + accessoire
    U.inkLine(ctx, 5, -30 + bob, 12, -22 + bob, 4, 0.3);
    if (look.acc === 0) { ctx.strokeStyle = '#6b4f2a'; ctx.lineWidth = 2.2 / s; U.inkLine(ctx, 12, -6, 15, -46 + bob, 5, 0.4); ctx.strokeStyle = INK; ctx.lineWidth = 1.8 / s; ctx.fillStyle = '#d8a63a'; ctx.beginPath(); ctx.arc(15.5, -48 + bob, 3, 0, TAU); ctx.fill(); ctx.stroke(); }
    else if (look.acc === 1) { ctx.fillStyle = '#efe3c4'; ctx.beginPath(); ctx.moveTo(12, -22 + bob); ctx.quadraticCurveTo(16, -34 + bob, 22, -40 + bob); ctx.quadraticCurveTo(18, -30 + bob, 14, -20 + bob); ctx.fill(); ctx.stroke(); }
    else { ctx.fillStyle = '#9a4a3a'; ctx.fillRect(10, -27 + bob, 9, 7); U.inkRect(ctx, 10, -27 + bob, 9, 7, 6, 0.3); }
    // tête
    ctx.fillStyle = '#efdcc0';
    ctx.beginPath(); ctx.arc(0, -40 + bob, 7, 0, TAU); ctx.fill(); ctx.stroke();
    ctx.fillStyle = INK; ctx.beginPath(); ctx.arc(3, -41 + bob, 1, 0, TAU); ctx.fill();
    // chapeau
    ctx.fillStyle = cape;
    if (look.chapeau === 0) { U.inkPolyPath(ctx, [[-11, -45 + bob], [11, -45 + bob], [2, -68 + bob]], 7, 0.5); ctx.fill(); ctx.stroke(); }
    else if (look.chapeau === 1) { U.inkPolyPath(ctx, [[-15, -45 + bob], [15, -45 + bob], [5, -50 + bob], [1, -62 + bob], [-5, -50 + bob]], 8, 0.5); ctx.fill(); ctx.stroke(); }
    else { U.inkPolyPath(ctx, [[-11, -45 + bob], [11, -45 + bob], [4, -58 + bob], [12, -70 + bob], [-2, -60 + bob]], 9, 0.5); ctx.fill(); ctx.stroke(); }
    ctx.restore();
  }
  function drawPlayer(ctx, p) {
    const moving = Math.abs(p.vx) > 20 && (p.onGround || p.climbing);
    if (p.inv > 0 && Math.floor(time * 20) % 2 === 0) return;
    if (p.sta.wet > 0 && Math.random() < 0.06) part(p.x + p.w / 2, p.y + p.h, '#6aa0d8', 1, 10, 0.6, 2, 300);
    if (p.sta.lumiere > 0) { const g = ctx.createRadialGradient(p.x + p.w / 2, p.y + p.h / 2, 5, p.x + p.w / 2, p.y + p.h / 2, 80); g.addColorStop(0, 'rgba(216,166,58,0.35)'); g.addColorStop(1, 'rgba(216,166,58,0)'); ctx.fillStyle = g; ctx.fillRect(p.x - 80, p.y - 60, 200, 200); }
    drawApprenti(ctx, p.x + p.w / 2, p.y + p.h, p.h, game.look, p.face, p.anim, p.sta, moving);
    if (p.trap) { ctx.save(); ctx.strokeStyle = DATA.CORES[p.trap.core].couleur; ctx.lineWidth = 1.5; ctx.setLineDash([4, 4]); ctx.beginPath(); ctx.arc(p.x + p.w / 2, p.y + p.h / 2, 30, time * 2, time * 2 + TAU); ctx.stroke(); ctx.restore(); }
    if (p.selfTimer) { ctx.save(); ctx.strokeStyle = DATA.CORES[p.selfTimer.core].couleur; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(p.x + p.w / 2, p.y + p.h / 2, 34, -Math.PI / 2, -Math.PI / 2 + TAU * (1 - p.selfTimer.t / 2)); ctx.stroke(); ctx.restore(); }
  }

  function drawSpell(ctx, s) {
    ctx.save();
    switch (s.k) {
      case 'proj': {
        const g = ctx.createRadialGradient(s.x, s.y, 1, s.x, s.y, s.r * 2.5);
        g.addColorStop(0, U.hexA(s.color, 0.5)); g.addColorStop(1, U.hexA(s.color, 0));
        ctx.fillStyle = g; ctx.fillRect(s.x - s.r * 2.5, s.y - s.r * 2.5, s.r * 5, s.r * 5);
        ctx.fillStyle = s.color; ctx.strokeStyle = INK; ctx.lineWidth = 1.5;
        ctx.beginPath(); ctx.arc(s.x, s.y, s.r, 0, TAU); ctx.fill(); ctx.stroke();
        if (s.core && !s.potion) Seal.glyph(ctx, s.core, s.x, s.y, s.r * 0.6, '#efe3c4', 1);
        break;
      }
      case 'trap': {
        ctx.strokeStyle = s.color; ctx.lineWidth = 1.5; ctx.globalAlpha = 0.6 + Math.sin(s.t * 4) * 0.2;
        ctx.setLineDash([6, 6]); ctx.beginPath(); ctx.ellipse(s.x, s.y, s.r, s.r * 0.5, 0, 0, TAU); ctx.stroke(); ctx.setLineDash([]);
        Seal.glyph(ctx, s.core, s.x, s.y, 10, s.color, 1);
        Seal.glyph(ctx, 'contact', s.x, s.y - 18, 5, s.color, 1);
        break;
      }
      case 'timer': {
        ctx.strokeStyle = s.color; ctx.lineWidth = 2;
        ctx.beginPath(); ctx.arc(s.x, s.y, 12, -Math.PI / 2, -Math.PI / 2 + TAU * (1 - s.t / 2)); ctx.stroke();
        ctx.fillStyle = s.color; ctx.beginPath(); ctx.arc(s.x, s.y, 5 + Math.sin(time * 20) * 1.5, 0, TAU); ctx.fill();
        break;
      }
      case 'beamtimer': { const p = st.p; const px = p.x + p.w / 2, py = p.y + p.h * 0.45; ctx.strokeStyle = s.color; ctx.lineWidth = 1 + (2 - s.t) * 2; ctx.globalAlpha = 0.5; ctx.setLineDash([4, 8]); ctx.beginPath(); ctx.moveTo(px, py); ctx.lineTo(px + s.dx * 300 * s.prm.range, py + s.dy * 300 * s.prm.range); ctx.stroke(); break; }
      case 'field': {
        const a = clamp(s.life / Math.max(0.1, s.max) * 2, 0, 1) * (s.faible ? 0.3 : 0.5);
        const C = DATA.CORES[s.core].couleur;
        const g = ctx.createRadialGradient(s.x, s.y, 2, s.x, s.y, s.r);
        g.addColorStop(0, U.hexA(C, a)); g.addColorStop(1, U.hexA(C, 0));
        ctx.fillStyle = g; ctx.beginPath(); ctx.ellipse(s.x, s.y, s.r, s.r * 0.6, 0, 0, TAU); ctx.fill();
        ctx.strokeStyle = U.hexA(C, a); ctx.lineWidth = 1.5; ctx.setLineDash([3, 6]); ctx.beginPath(); ctx.ellipse(s.x, s.y, s.r, s.r * 0.6, 0, 0, TAU); ctx.stroke();
        break;
      }
      case 'ring': {
        const t = 1 - s.life / s.max;
        ctx.strokeStyle = s.color; ctx.globalAlpha = 1 - t; ctx.lineWidth = 3 * (1 - t) + 0.5;
        U.inkCircle(ctx, s.x, s.y, s.r * (0.3 + t * 0.9), 3, 2);
        ctx.lineWidth = 1; U.inkCircle(ctx, s.x, s.y, s.r * (0.1 + t * 0.6), 4, 1.5);
        break;
      }
      case 'beam': {
        const t = s.life / s.max;
        ctx.strokeStyle = s.color; ctx.globalAlpha = t; ctx.lineWidth = s.w * t + 1; ctx.lineCap = 'round';
        ctx.beginPath(); ctx.moveTo(s.x1, s.y1); ctx.lineTo(s.x2, s.y2); ctx.stroke();
        ctx.strokeStyle = '#efe3c4'; ctx.lineWidth = Math.max(0.5, s.w * t * 0.3); ctx.beginPath(); ctx.moveTo(s.x1, s.y1); ctx.lineTo(s.x2, s.y2); ctx.stroke();
        break;
      }
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
  function drawDark(ctx, cam) {
    const vis = L.grottes.filter((g) => g.x + g.w > cam.x && g.x < cam.x + VW);
    if (!vis.length) return;
    const d = darkCv.getContext('2d');
    d.clearRect(0, 0, VW, VH);
    d.fillStyle = 'rgba(18,14,11,0.93)';
    for (const g of vis) {
      // bord doux de la grotte : dégradé sur 120px à l'entrée et la sortie
      const x0 = g.x - cam.x, x1 = g.x + g.w - cam.x;
      const grd = d.createLinearGradient(x0 - 80, 0, x1 + 80, 0);
      grd.addColorStop(0, 'rgba(18,14,11,0)'); grd.addColorStop(Math.min(0.5, 160 / (g.w + 160)), 'rgba(18,14,11,0.93)'); grd.addColorStop(Math.max(0.5, 1 - 160 / (g.w + 160)), 'rgba(18,14,11,0.93)'); grd.addColorStop(1, 'rgba(18,14,11,0)');
      d.fillStyle = grd;
      d.fillRect(x0 - 80, 0, g.w + 160, VH);
    }
    d.globalCompositeOperation = 'destination-out';
    for (const l of lights()) {
      const x = l.x - cam.x, y = l.y;
      if (x < -l.r || x > VW + l.r) continue;
      const fl = 1 + Math.sin(time * 7 + x) * 0.04;
      const g = d.createRadialGradient(x, y, l.r * 0.15, x, y, l.r * fl);
      g.addColorStop(0, 'rgba(0,0,0,1)'); g.addColorStop(0.6, 'rgba(0,0,0,0.7)'); g.addColorStop(1, 'rgba(0,0,0,0)');
      d.fillStyle = g; d.fillRect(x - l.r * 1.1, y - l.r * 1.1, l.r * 2.2, l.r * 2.2);
    }
    d.globalCompositeOperation = 'source-over';
    ctx.drawImage(darkCv, 0, 0);
  }

  function toWorld(mx, my) { return { x: mx + st.cam.x, y: my }; }
  function state() { return st; }

  return { build, ensure, update, draw, castSeal, usePotion, interact, toWorld, state, drawApprenti, respawn };
})();
