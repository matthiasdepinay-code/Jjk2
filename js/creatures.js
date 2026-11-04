'use strict';
// ---------- Créatures : bêtes du monde et familiers ----------
// Extrait de world.js : le monde lui passe un contexte W (getters vers son état et ses fonctions).
function creerCreatures(W) {
  const CS = Sim.CS, M = Sim.M, P = Sim.P;
  const { GRAV } = W; // la pesanteur : déclarée une seule fois, dans world.js
  const { TAU, INK, clamp, lerp, dist } = U;
  function affinite(c, f) {
    if (c.sta.tame || c.t === 'familier' || c.t === 'gardien' || c.controlled) return;
    const A = DATA.AFFINITE[c.t] || {}; const sp = DATA.ESPECES[c.t];
    let gain = (A.gain || (sp && !sp.hostile ? 34 : 20)) * f;
    if (A.parJour) {
      const j = W.st.jour || 0; if (c.affJ !== j) { c.affJ = j; c.affDuJour = 0; }
      const reste = A.parJour - c.affDuJour;
      if (reste <= 0) { if (f >= 1 && (!c.affMsgT || W.time - c.affMsgT > 6)) { c.affMsgT = W.time; W.msg(W.nomCreature(c.t) + ' en a assez pour aujourd\'hui. Reviens demain.'); } return; }
      gain = Math.min(gain, reste); c.affDuJour += gain;
    }
    c.aff = Math.min(100, (c.aff || 0) + gain); c.affT = 3;
    if (f >= 1) W.part(c.x + c.w / 2, c.y - 6, '#c45a8a', 3, 30, 0.8, 2.5, -50, 'coeur');
    if (c.aff >= 100) tame(c);
    else if (f >= 1 && (!c.affMsgT || W.time - c.affMsgT > 4)) { c.affMsgT = W.time; W.msg(W.nomCreature(c.t) + ' te regarde autrement (affinité ' + Math.round(c.aff) + ' %).'); }
  }
  function tame(c) {
    c.sta.tame = true; const ccx = c.x + c.w / 2;
    W.part(ccx, c.y, '#c45a8a', 10, 60, 0.9, 3, -60, 'coeur');
    W.msg(W.nomCreature(c.t) + ' est apprivoisé(e). Il/elle te suit du regard.');
    if (!c.filDonne) { c.filDonne = true; W.dropPickup('fil', ccx, c.y - 10); }
    W.evt('tame', c.t);
  }
  function updateCreatures(dtG) {
    let dt = dtG;
    const p = W.st.p; const pcx = p.x + p.w / 2, pcy = p.y + p.h / 2;
    for (const c of W.st.crs) {
      dt = W.bullesT.length ? dtG * W.tempsDe(c.x + c.w / 2, c.y + c.h / 2) : dtG; if (dt <= 0) continue;
      if (c.hp <= 0 && c.orig) W.finMorph(c);
      if (c.hp <= 0) { c.respawn -= dt; if (c.respawn <= 0) { c.hp = c.hpMax; c.x = c.x0; c.y = c.y0; c.vx = 0; c.vy = 0; c.size = 1; c.sta.tame = false; if (c.t === 'limace') { c.w = 36; c.h = 24; } } continue; }
      if (c.carried) { c.sta.burn = 0; continue; }
      for (const k of ['burn', 'stun', 'sleep', 'wet', 'glisse', 'lent', 'gele']) if (c.sta[k] > 0) c.sta[k] = Math.max(0, c.sta[k] - dt);
      if (c.t === 'gardien') { W.GD.update(c, dt); continue; }
      if (c.morphT > 0) { c.morphT -= dt; if (c.morphT <= 0) W.finMorph(c); }
      if (c.affT > 0) c.affT -= dt;
      if (c.bebe > 0 && c.hp > 0) { c.bebe -= dt; const k = c.bebe > 0 ? 0.55 + 0.45 * (1 - c.bebe / 90) : 1; const bas = c.y + c.h, mil = c.x + c.w / 2; c.w = Math.round(c.wPlein * k); c.h = Math.round(c.hPlein * k); c.y = bas - c.h; c.x = mil - c.w / 2; }
      if (c.curieux) { c.curieux.t -= dt; if (c.curieux.t <= 0) c.curieux = null; }
      if (c.ench) { c.ench.t -= dt; c.ench.tick += dt; if (c.ench.t <= 0) c.ench = null; else { W.doContinuous(c.ench.spec, c.x + c.w / 2, c.y + c.h / 2, 50 * (c.ench.spec.prm.size || 1), dt, { noPlayer: true, noField: true }); if (Math.random() < 0.3) W.part(c.x + Math.random() * c.w, c.y + Math.random() * c.h, c.ench.spec.color, 1, 20, 0.5, 2, -40, 'spark'); } }
      if (c.t === 'familier') { updateFamilier(c, dt, p); continue; }
      // cadeaux des créatures apprivoisées
      if (c.sta.tame && DATA.ESPECES[c.t] && DATA.ESPECES[c.t].drop) { c.cadeauT += dt; if (c.cadeauT > 90) { c.cadeauT = 0; W.dropPickup(DATA.ESPECES[c.t].drop, c.x + c.w / 2, c.y - 8); W.evt('cadeau'); W.msg(W.nomCreature(c.t) + ' te fait un cadeau.'); } }
      // chaleur et grand froid
      { const tc = Sim.tempAt(c.x + c.w / 2, c.y + c.h * 0.6); const sp0 = DATA.ESPECES[c.t] || {};
        if (tc > 125 && !W.CHAUD_OK.includes(c.t)) { W.hurt(c, dt * (tc - 125) / 50); if (tc > 170) c.sta.burn = Math.max(c.sta.burn, 1); if (c.hp <= 0) continue; }
        else if (tc < 46 && !W.FROID_OK.includes(c.t)) { c.sta.lent = Math.max(c.sta.lent || 0, 0.4); if (tc < 28 && Math.random() < dt * 0.5) c.sta.gele = Math.max(c.sta.gele || 0, 1.5); } }
      if (c.generique) { updateGenerique(c, dt, p); continue; }
      if (!c.vu && W.inView(c.x, c.y)) { c.vu = true; W.evt('espece', c.t); }
      if (c.hurt > 0) c.hurt -= dt;
      if (c.sta.burn > 0) { W.hurt(c, dt * 0.7); if (Math.random() < 0.4) W.part(c.x + Math.random() * c.w, c.y, '#d9622b', 1, 30, 0.5, 3, -200); if (c.hp <= 0) continue; }
      const lq = W.liquidOf(c);
      if (lq === M.EAU) { c.sta.wet = 6; c.sta.burn = 0; if (c.t === 'follet') { W.hurt(c, dt * 2, 'eau'); if (c.hp <= 0) continue; } }
      if (lq === M.LAVE && c.t !== 'golem') { W.hurt(c, dt * 4); c.sta.burn = 2; if (c.hp <= 0) continue; }
      if (lq === M.ACIDE) { W.hurt(c, dt * 2); if (c.hp <= 0) continue; }
      if (Sim.rectHas(c, (m, i) => Sim.elec[i] > 0)) { c.sta.stun = Math.max(c.sta.stun, 1); if (Math.random() < dt * 2) W.hurt(c, 1); }
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
        { const z = W.gravOf(c); if (z && z.mag > 0) { c.vx += GRAV * z.mag * z.gx * dt * 0.5; c.vy += GRAV * z.mag * z.gy * dt * 0.5; } }
        c.canStep = false; W.moveBody(c, dt);
        if (Math.random() < 0.3) W.part(ccx, ccy, '#3f9c9b', 1, 20, 0.5, 2, -40, 'spark');
      } else {
        W.applyGrav(c, dt, 1);
        if (lq) W.flotter(c, dt, W.DENS[c.t] || 0.9);
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
            if (c.onGround && Math.abs(c.vx) > 20 && Math.random() < dt * 2) W.st.shake = 0.1;
          }
          c.vx *= lentMul === 1 ? 1 : (1 - (1 - lentMul) * Math.min(1, dt * 10));
        } else c.vx *= Math.max(0, 1 - 6 * dt);
        if (c.onGround) c.vx *= Math.max(0, 1 - (c.sta.glisse > 0 ? 0.2 : 2) * dt);
        c.hitX = false;
        W.moveBody(c, dt);
        if (c.y > W.L.h + 50) { c.hp = 0; c.respawn = 10; }
      }
      // contact joueur
      if (U.rectsOverlap(c, p) && actif && !c.sta.tame && !c.controlled && p.inv <= 0 && p.sta.geant <= 0 && !(p.pg && p.pg.enclume)) {
        const dx = Math.sign(pcx - ccx) || 1;
        p.vx = dx * 320; p.vy = -260; p.inv = 1;
        if (p.sta.stone <= 0 && p.sta.armure <= 0) { p.hp -= c.dmg; Son.sfx('hurt'); W.msg(W.nomCreature(c.t) + ' te bouscule !', 'warn'); W.evt('bouscule'); W.st.shake = 0.25; }
        else W.msg('Ton armure encaisse le choc.');
        c.vx = -dx * 150;
        if (p.trap) { W.doBurst(p.trap.spec, pcx, pcy, 80 * (p.trap.spec.prm.size || 1), { noPlayer: true }); p.trap = null; W.msg('Le sceau sur ta peau éclate !'); }
      } else if (U.rectsOverlap(c, p) && (p.sta.geant > 0 || (p.pg && p.pg.enclume)) && !c.sta.tame) { c.vx = Math.sign(ccx - pcx) * 300; c.vy = -200; }
    }
  }
  function updateGenerique(c, dt, p) {
    const sp = DATA.ESPECES[c.t]; const ccx = c.x + c.w / 2, ccy = c.y + c.h / 2; const pcx = p.x + p.w / 2, pcy = p.y + p.h / 2;
    const dpx = pcx - ccx, dpy = pcy - ccy, dp = Math.hypot(dpx, dpy);
    if (!c.vu && W.inView(ccx, ccy)) { c.vu = true; W.evt('espece', c.t); }
    // jour / nuit
    const nuit = W.daylight() < 0.3;
    const veutDormir = (sp.nocturne && !nuit) || (sp.diurne && nuit);
    if (veutDormir && !c.sta.tame && !c.fuite && c.hurt <= 0) c.dort = true; else if (!veutDormir) c.dort = false;
    if (c.fuite) { c.fuite.t -= dt; if (c.fuite.t <= 0) c.fuite = null; }
    const actif = c.sta.stun <= 0 && c.sta.sleep <= 0 && !c.dort;
    const lq = W.liquidOf(c);
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
      c.canStep = false; W.moveBody(c, dt);
    } else if (sp.mode === 'swim') {
      if (lq) {
        if (tx == null) { tx = c.x0 + Math.cos(c.phase * 0.5) * 60; ty = c.y0 + Math.sin(c.phase * 0.9) * 10; }
        if (actif) { c.vx += (tx - ccx) * 1.5 * dt * lentMul; c.vy += (ty - ccy) * 1.5 * dt * lentMul; c.dir = Math.sign(c.vx) || c.dir; }
        c.vx *= Math.max(0, 1 - 2 * dt); c.vy *= Math.max(0, 1 - 2 * dt);
        c.hors = 0;
      } else {
        W.applyGrav(c, dt, 1, 900); c.hors = (c.hors || 0) + dt;
        if (c.onGround && Math.random() < dt * 3) { c.vx = (Math.random() - 0.5) * 160; c.vy = -220; }
        if (c.hors > 12) { W.hurt(c, dt * 0.5); if (c.hp <= 0) return; }
      }
      c.canStep = false; W.moveBody(c, dt);
    } else {
      // hop / walk / crawl
      const sw = sp.lave && lq === M.LAVE;
      W.applyGrav(c, dt, 1);
      if (lq) W.flotter(c, dt, W.DENS[c.t] || 0.9);
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
      W.moveBody(c, dt);
    }
    if (c.y > W.L.h + 50) { c.hp = 0; c.respawn = 10; }
    // contact
    if (sp.hostile && U.rectsOverlap(c, p) && actif && !c.sta.tame && !c.controlled && p.inv <= 0 && p.sta.geant <= 0 && !(p.pg && p.pg.enclume)) {
      const dx = Math.sign(pcx - ccx) || 1; p.vx = dx * 280; p.vy = -240; p.inv = 1;
      if (p.sta.stone <= 0 && p.sta.armure <= 0 && c.dmg > 0) { p.hp -= c.dmg; Son.sfx('hurt'); W.msg(W.nomCreature(c.t) + ' te bouscule !', 'warn'); W.evt('bouscule'); }
      c.vx = -dx * 150;
    }
  }
  function nouveauFamilier(spec, esp, x, y, i = 0) {
    const F = DATA.FAMILIERS[esp], prm = spec.prm || {};
    const f = W.makeCreature({ t: 'familier', x, y });
    const k = clamp(1 + 0.25 * ((prm.size || 1) - 1), 0.75, 1.6);
    Object.assign(f, { spec, core: spec.core, espece: esp, life: 30 * (prm.duration || 1), max: 30 * (prm.duration || 1), hp: Math.round(F.pv * (1 + 0.3 * ((prm.power || 1) - 1))), dmg: 0, w: Math.round(F.w * k), h: Math.round(F.h * k), echelle: k, cd: 0.4 + i * 0.3, x0: x, y0: y, vole: F.mode === 'vol' || F.mode === 'orbite', portable: false, generique: false, age: 0, orbite: Math.random() * TAU });
    f.hpMax = f.hp; f.sta.tame = true; f.filDonne = true; f.porteur = !!spec.combo;
    return f;
  }
  function updateFamilier(c, dt, p) {
    if (!c.spec) { c.hp = 0; c.respawn = 1e9; c.mort = true; return; }
    const esp = c.espece || 'feu', F = DATA.FAMILIERS[esp] || DATA.FAMILIERS.feu, prm = c.spec.prm || {}, pw = prm.power || 1;
    c.life -= dt; c.cd -= dt; c.age += dt; c.phase += dt; if (c.hurt > 0) c.hurt -= dt; if (c.coup > 0) c.coup -= dt * 4; if (c.souffle > 0) c.souffle -= dt * 2;
    if (c.life <= 0 || c.hp <= 0) { c.hp = 0; c.respawn = 1e9; c.mort = true; W.part(c.x + c.w / 2, c.y + c.h / 2, W.colorOf(esp), 14, 60, 0.7, 2, 0, 'spark'); W.part(c.x + c.w / 2, c.y + c.h / 2, INK, 8, 40, 0.8, 3); if (c.hp <= 0 && c.life > 0) W.msg(F.nom + ' se dissout en encre.'); return; }
    // les créatures hostiles le blessent au contact
    for (const q of W.st.crs) if (q.hp > 0 && !q.sta.tame && q.t !== 'familier' && (q.dmg || 0) > 0 && q.sta.stun <= 0 && q.sta.sleep <= 0 && U.rectsOverlap(c, q) && W.time - (c.coupT || -9) > 1) { c.coupT = W.time; W.hurt(c, q.dmg * (esp === 'terre' ? 0.35 : 0.6), 'coup'); W.part(c.x + c.w / 2, c.y + c.h / 2, W.colorOf(esp), 6, 50, 0.4, 2); }
    // chacun sa place près de toi ; un porteur de phénomène se tient plus loin
    const fam = W.st.crs.filter((f) => f.t === 'familier' && f.hp > 0), k = Math.max(0, fam.indexOf(c));
    const garde = W.st.ordreFam === 'garder' && W.st.gardePt, pcx = garde ? W.st.gardePt.x : p.x + p.w / 2, pcy = garde ? W.st.gardePt.y : p.y + p.h * 0.45, loin = c.porteur ? 130 : 0;
    const jx = p.x + p.w / 2, jy = p.y + p.h * 0.45;
    // la cible : une créature hostile proche de toi ou de lui
    let cible = null, bd = 1e9;
    for (const q of W.st.crs) { if (q === c || q.hp <= 0 || q.sta.tame || q.t === 'familier' || q.carried) continue; if (esp === 'esprit' && (q.sta.sleep > 0 || q.dort)) continue; const dq = dist(c.x, c.y, q.x, q.y), dp = dist(pcx, pcy, q.x + q.w / 2, q.y + q.h / 2); if ((dq < 260 || dp < 320) && dq < bd) { bd = dq; cible = q; } }
    if (c.cibleForcee) { c.cibleT -= dt; if (c.cibleT <= 0 || c.cibleForcee.hp <= 0) c.cibleForcee = null; else cible = c.cibleForcee; }
    if (esp === 'metamorphose') { const T = c.age; c.stade = T < 8 ? 'chenille' : T < 10.5 ? 'cocon' : 'papillon'; c.stadeT = T - 8; c.vole = c.stade === 'papillon'; if (c.stade !== 'papillon') cible = null; if (c.stade === 'papillon' && !c.eclos) { c.eclos = true; c.w = Math.round(26 * (c.echelle || 1)); c.h = Math.round(16 * (c.echelle || 1)); W.part(c.x + c.w / 2, c.y, '#c06aa0', 16, 70, 0.8, 2, 0, 'spark'); W.msg('La chenille devient papillon !'); } }
    const cx = c.x + c.w / 2, cy = c.y + c.h / 2;
    const tcx = cible ? cible.x + cible.w / 2 : 0, tcy = cible ? cible.y + cible.h / 2 : 0, dcib = cible ? dist(cx, cy, tcx, tcy) : 1e9;
    // où aller
    let tx, ty;
    const place = () => { const cote = garde ? (k % 2 ? 1 : -1) : -(p.face || 1); tx = pcx + cote * (36 + 26 * k + loin); ty = pcy - 34 - (k % 2) * 16 - loin * 0.4 + Math.sin(c.phase * 2.2 + k) * 6; };
    if (esp === 'gravite') { c.orbite += dt * (cible ? 1.2 : 2.2); const R = 56 + 14 * k + loin; tx = pcx + Math.cos(c.orbite) * R; ty = pcy - 10 + Math.sin(c.orbite) * R * 0.55; if (cible && dcib < F.portee) { tx = tcx; ty = cible.y - 40; } }
    else if (esp === 'terre') { place(); const menace = cible && dist(pcx, pcy, tcx, tcy) < 260; if (menace) { tx = dcib < 80 ? tcx - Math.sign(tcx - pcx) * (cible.w / 2 + c.w / 2 - 4) : pcx + Math.sign(tcx - pcx) * 46; } }
    else if (cible && !(esp === 'metamorphose' && c.stade !== 'papillon')) { const garde = esp === 'eau' || esp === 'lumiere' || esp === 'temps' || esp === 'gravite' || esp === 'vie' || esp === 'foudre' || esp === 'metamorphose' ? F.portee * 0.6 : 0; const ang = Math.atan2(cy - tcy, cx - tcx); tx = tcx + Math.cos(ang) * garde; ty = (F.mode === 'vol' ? cible.y - 20 : tcy) + Math.sin(ang) * garde * 0.4; }
    else place();
    // allure
    const vmax = F.vitesse * ((esp === 'eau' && W.liquidOf(c)) ? 1.6 : 1) * (c.sta.lent > 0 ? 0.4 : 1);
    if (c.vole || F.mode === 'orbite') {
      if (!(c.dash > 0)) { c.vx += (tx - cx) * 4 * dt; c.vy += (ty - cy) * 4 * dt; c.vx *= Math.max(0, 1 - 2.8 * dt); c.vy *= Math.max(0, 1 - 2.8 * dt); const v = Math.hypot(c.vx, c.vy); if (v > vmax) { c.vx *= vmax / v; c.vy *= vmax / v; } }
      c.canStep = false; W.moveBody(c, dt); c.dir = Math.abs(c.vx) > 8 ? Math.sign(c.vx) : (cible ? Math.sign(tcx - cx) || c.dir : p.face || c.dir);
    } else if (esp === 'metamorphose' && c.stade === 'cocon') { W.applyGrav(c, dt); c.vx = 0; c.canStep = false; W.moveBody(c, dt); }
    else {
      W.applyGrav(c, dt); if (W.liquidOf(c)) W.flotter(c, dt, esp === 'feu' ? 0.6 : esp === 'terre' ? 2.4 : 0.8);
      const ddx = tx - cx, v = esp === 'metamorphose' ? F.vitesse : vmax;
      c.vx = Math.abs(ddx) > 10 ? Math.sign(ddx) * Math.min(v, Math.abs(ddx) * 4 + 30) : c.vx * 0.7;
      if (c.onGround && (c.hitX || ty < c.y - 60) && Math.abs(ddx) > 12 && esp !== 'metamorphose') c.vy = -(esp === 'terre' ? 330 : 430);
      if (!c.onGround && dist(cx, cy, pcx, pcy) > 520) { c.x = pcx - c.w / 2 - (p.face || 1) * 30; c.y = p.y + p.h - c.h; c.vx = c.vy = 0; W.part(c.x + c.w / 2, c.y + c.h / 2, W.colorOf(esp), 8, 40, 0.5, 2, 0, 'spark'); }
      c.canStep = true; W.moveBody(c, dt); if (Math.abs(c.vx) > 8) c.dir = Math.sign(c.vx);
      if (esp === 'transmutation') c.roule = (c.roule || 0) + c.vx * dt / (c.w * 0.4);
    }
    // perdu loin derrière : il te rejoint d'un saut de faille
    if (dist(cx, cy, pcx, pcy) > 900) { c.x = pcx - c.w / 2; c.y = pcy - c.h - 30; c.vx = c.vy = 0; }
    // le coup de chaque familier
    const frappe = (q, r = 24, kk = 1, effets = c.spec.cores, o2 = {}) => { for (const core of effets) W.applyEffect(core, q.x + q.w / 2, q.y + q.h / 2, r, { ...prm, power: pw * kk }, 'burst', Object.assign({ noPlayer: true, noField: true }, o2)); };
    if (cible && c.cd <= 0 && dcib < F.portee + Math.max(cible.w, cible.h) * 0.5) {
      c.cd = F.cadence; const dirc = Math.sign(tcx - cx) || 1; if (W.inView(cx, cy)) Son.voix(esp);
      switch (esp) {
        case 'feu': { c.souffle = 1; for (let s = 1; s <= 8; s++) { const fx = cx + (tcx - cx) * s / 8, fy = cy + (tcy - cy) * s / 8; W.part(fx, fy, s % 2 ? '#f0a040' : '#e0642a', 2, 30, 0.35, 3, -60, 'glow'); } frappe(cible, 22, 0.9, c.spec.cores, { noGrid: true }); cible.sta.burn = Math.max(cible.sta.burn || 0, 2); break; }
        case 'eau': { W.st.sp.push({ k: 'beam', core: 'eau', x1: cx, y1: cy, x2: tcx, y2: tcy, life: 0.25, max: 0.25, color: '#6aa0d8', w: 3 }); W.spawnLiquid(M.EAU, tcx, cible.y, 4, 16); frappe(cible, 24, 0.9); W.hurt(cible, 0.6 * pw); cible.vx += dirc * 260 / W.masse(cible); break; }
        case 'terre': { c.coup = 1; W.hurt(cible, 1.4 * pw); cible.sta.stun = Math.max(cible.sta.stun, 1); cible.vx += dirc * 520 / W.masse(cible); cible.vy -= 220; W.st.shake = Math.max(W.st.shake, 0.12); W.part(tcx, cible.y + cible.h, '#8a7a5a', 8, 80, 0.5, 2, 300); Son.sfx('burst', 'terre'); break; }
        case 'vent': { c.dash = 0.35; c.vx = dirc * 720; c.vy = (tcy - cy) * 2; c.touches = new Set(); break; }
        case 'vie': { cible.sta.lent = Math.max(cible.sta.lent || 0, 3.5); cible.sta.stun = Math.max(cible.sta.stun, 0.6); cible.vx = 0; const gx = Math.floor(tcx / CS), gy = Math.floor((cible.y + cible.h) / CS); for (let d = -2; d <= 2; d++) for (let e = 0; e < 3; e++) if (Sim.get(gx + d, gy - 1 - e) === M.AIR && Math.random() < 0.6) Sim.set(gx + d, gy - 1 - e, M.PLANTE); W.part(tcx, cible.y + cible.h, '#5c8f3e', 10, 50, 0.6, 2); break; }
        case 'lumiere': { W.st.flash = Math.max(W.st.flash, 0.05); for (const q of W.st.crs) if (q.hp > 0 && !q.sta.tame && q.t !== 'familier' && dist(cx, cy, q.x + q.w / 2, q.y + q.h / 2) < 120) { q.sta.stun = Math.max(q.sta.stun, 1.3); if (q.t === 'chauve' || q.t === 'limace') q.fuite = { x: cx, y: cy, t: 3 }; } frappe(cible, 30, 0.6); W.part(cx, cy, '#f6e080', 18, 140, 0.4, 2, 0, 'spark'); break; }
        case 'foudre': { W.st.eclairs.push({ x: tcx, y1: tcy, pts: FX.eclairPts(cx, cy, tcx, tcy, 0.25), branches: [], life: 0.2 }); W.hurt(cible, 1 * pw); cible.sta.stun = Math.max(cible.sta.stun, 0.6); frappe(cible, 18, 0.5); let b2 = null, bd2 = 140; for (const q of W.st.crs) if (q !== cible && q.hp > 0 && !q.sta.tame && q.t !== 'familier') { const d = dist(tcx, tcy, q.x + q.w / 2, q.y + q.h / 2); if (d < bd2) { bd2 = d; b2 = q; } } if (b2) { W.st.eclairs.push({ x: b2.x + b2.w / 2, y1: b2.y + b2.h / 2, pts: FX.eclairPts(tcx, tcy, b2.x + b2.w / 2, b2.y + b2.h / 2, 0.25), branches: [], life: 0.2 }); W.hurt(b2, 0.6 * pw); b2.sta.stun = Math.max(b2.sta.stun, 0.4); } Son.sfx('burst', 'foudre'); break; }
        case 'gravite': { cible.vy = -560 / Math.sqrt(W.masse(cible)); cible.vx *= 0.3; c.leve = { q: cible, t: 0.45 }; W.part(tcx, tcy, '#6c5ab8', 10, 60, 0.5, 2, 0, 'spark'); break; }
        case 'temps': { W.poserBulle('lent', tcx, tcy, 40 * (prm.size || 1), prm); cible.sta.lent = Math.max(cible.sta.lent || 0, 3); break; }
        case 'portail': { W.part(cx, cy, '#4fb0a0', 12, 60, 0.4, 2, 0, 'spark'); c.x = tcx - dirc * (cible.w / 2 + c.w / 2) - c.w / 2; c.y = cible.y + cible.h - c.h; c.vx = c.vy = 0; W.unstick(c); W.part(c.x + c.w / 2, c.y + c.h / 2, '#4fb0a0', 12, 60, 0.4, 2, 0, 'spark'); W.hurt(cible, 1 * pw); if (Math.random() < 0.25) W.applyEffect('saut', tcx, tcy, 26, { ...prm }, 'burst', { noPlayer: true }); Son.sfx('cast', 'portail'); break; }
        case 'esprit': { cible.sta.sleep = Math.max(cible.sta.sleep, 6 * (prm.duration || 1)); cible.fuite = null; cible.curieux = null; W.part(tcx, cible.y, '#b08ad8', 10, 30, 0.8, 2, -30, 'spark'); break; }
        case 'transmutation': { const gx = Math.floor(tcx / CS), gy = Math.floor((cible.y + cible.h) / CS); for (let d = -3; d <= 3; d++) for (let e = 0; e <= 2; e++) { const m = Sim.get(gx + d, gy + e); if (m === M.TERRE || m === M.MEUBLE || m === M.SABLE || m === M.HERBE) Sim.set(gx + d, gy + e, M.BOUE, 200); else if (m === M.PIERRE) Sim.set(gx + d, gy + e, M.SABLE); } cible.sta.lent = Math.max(cible.sta.lent || 0, 2.5); W.hurt(cible, 0.6 * pw); W.part(tcx, cible.y + cible.h, '#c08a3a', 10, 50, 0.5, 2, 0, 'spark'); break; }
        case 'contre': { cible.sta.stun = Math.max(cible.sta.stun, 1); if (cible.ench) cible.ench = null; cible.sta.burn = 0; if (!cible.vole_pie && Math.random() < 0.2 && DATA.ESPECES[cible.t] && DATA.ESPECES[cible.t].drop) { cible.vole_pie = true; c.butin = DATA.ESPECES[cible.t].drop; W.msg('La pie grise a chipé quelque chose !'); } W.part(tcx, tcy, '#a8a29a', 8, 50, 0.4, 2, 0, 'spark'); break; }
        case 'metamorphose': { W.metamorphoser(tcx, tcy, 22, prm); W.part(tcx, tcy, '#c06aa0', 12, 60, 0.6, 2, 0, 'spark'); break; }
      }
    }
    // effets qui durent
    if (c.dash > 0) { c.dash -= dt; for (const q of W.st.crs) if (q.hp > 0 && !q.sta.tame && q.t !== 'familier' && !c.touches.has(q) && U.rectsOverlap({ x: c.x - 6, y: c.y - 6, w: c.w + 12, h: c.h + 12 }, q)) { c.touches.add(q); q.vx += Math.sign(c.vx || 1) * 380 / Math.sqrt(W.masse(q)); q.vy -= 200 / Math.sqrt(W.masse(q)); frappe(q, 20, 0.7); } if (Math.random() < 0.6) W.part(cx, cy, '#a0d8d4', 1, 20, 0.4, 2, 0); }
    if (c.leve) { c.leve.t -= dt; if (c.leve.t <= 0) { const q = c.leve.q; c.leve = null; if (q.hp > 0) { q.vy = 1150; W.hurt(q, 0.8 * pw); } } }
    if (c.butin && dist(cx, cy, jx, jy) < 50) { W.dropPickup(c.butin, jx, p.y - 6); c.butin = null; }
    // les dons de chacun
    if (W.ev2(c, 'don', 0.4)) {
      const pres = dist(cx, cy, jx, jy) < 150;
      if (esp === 'feu' && pres && Sim.tempAt(pcx, pcy) < 50) Sim.chauffer(pcx, pcy, 40, 90, 0.4);
      if (esp === 'eau' && pres) { Sim.forRadius(pcx, pcy, 70, (x, y, i, m) => { if (m === M.FEU) Sim.set(x, y, M.VAPEUR, 30); }); p.sta.burning = 0; p.hp = Math.min(p.hpMax, p.hp + 0.05); }
      if (esp === 'vent' && pres) Sim.forRadius(pcx, pcy, 60, (x, y, i, m) => { if (m === M.FUMEE || m === M.GAZ) Sim.set(x, y, M.AIR); });
      if (esp === 'vie') { if (pres) p.hp = Math.min(p.hpMax, p.hp + 0.1); for (const q of W.st.crs) if (q.sta.tame && q.t !== 'familier' && q.hp > 0 && dist(cx, cy, q.x, q.y) < 120) q.hp = Math.min(q.hpMax, q.hp + 0.1); if (c.onGround) { const gx = Math.floor(cx / CS), gy = Math.floor((c.y + c.h) / CS); if (Sim.get(gx, gy) === M.TERRE && Sim.get(gx, gy - 1) === M.AIR && Math.random() < 0.5) Sim.set(gx, gy - 1, M.HERBE); } }
      if (esp === 'temps' && pres) p.ink = Math.min(p.inkMax, p.ink + 0.3);
      if (esp === 'contre' && pres) { p.sta.burning = 0; p.sta.lent = 0; p.sta.dissous = 0; }
    }
    if (Math.random() < 0.25) W.part(cx, cy, W.colorOf(esp), 1, 15, 0.5, 1.6, -20, 'spark');
  }
  function retenir() { for (const g of W.st.crs) { if (g.t !== 'familier' || g.espece !== 'terre' || g.hp <= 0) continue; for (const q of W.st.crs) if (q.hp > 0 && !q.sta.tame && q.t !== 'familier' && U.rectsOverlap(g, q)) { const s2 = Math.sign(q.x + q.w / 2 - g.x - g.w / 2) || 1; q.x += s2 * 2; if (Math.sign(q.vx) === -s2) q.vx *= 0.2; } } }
  function ordonner(o) {
    const fam = W.st.crs.filter((c) => c.t === 'familier' && c.hp > 0), p = W.st.p;
    if (!fam.length) { W.msg('Aucun familier pour t\'écouter.'); return; }
    if (o === 'garder') { if (W.st.ordreFam === 'garder') { W.st.ordreFam = 'suivre'; W.st.gardePt = null; W.msg('Tes familiers te suivent.'); } else { W.st.ordreFam = 'garder'; W.st.gardePt = { x: p.x + p.w / 2, y: p.y + p.h * 0.45 }; W.msg('Tes familiers gardent cet endroit (V pour qu\'ils te suivent).'); } }
    else if (o === 'attaquer') { const a = W.toWorld(W.game.inp.mouse.x, W.game.inp.mouse.y); let best = null, bd = 170; for (const q of W.st.crs) { if (q.hp <= 0 || q.sta.tame || q.t === 'familier') continue; const d = dist(a.x, a.y, q.x + q.w / 2, q.y + q.h / 2); if (d < bd) { bd = d; best = q; } } if (!best) { W.msg('Aucune créature sous la souris.'); return; } for (const f of fam) { f.cibleForcee = best; f.cibleT = 8; } W.msg('À l\'attaque !'); W.part(best.x + best.w / 2, best.y - 10, '#c45a8a', 10, 50, 0.5, 2, 0, 'spark'); }
    else if (o === 'congedier') { let enc = 0; for (const f of fam) { enc += 2.5 * Math.max(0, f.life) / (f.max || 30); f.life = 0; } p.ink = Math.min(p.inkMax, p.ink + enc); W.st.ordreFam = 'suivre'; W.st.gardePt = null; W.msg('Tes familiers s\'en retournent dans l\'encre (+' + Math.round(enc) + ' encre).'); }
    Son.voix(fam[0].espece); W.evt('ordre', o);
  }
  return { updateCreatures, updateGenerique, updateFamilier, nouveauFamilier, retenir, ordonner, affinite, tame };
}
