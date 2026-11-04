'use strict';
// ---------- Effets des essences : sur la matière, les créatures et soi ----------
// Extrait de world.js (outils/extraire.js) : le monde lui passe un contexte W de getters vers son état et ses fonctions.
function creerEffets(W) {
  const { TAU, INK, clamp, lerp, dist } = U;
  const MainSim = Sim;
  const CS = Sim.CS, M = Sim.M, P = Sim.P;
  function gridEffect(core, cx, cy, rad, prm, burst, k) { return gridEffectOn(Sim, core, cx, cy, rad, prm, burst, k); }
  function gridEffectOn(Sim, core, cx, cy, rad, prm, burst, k) {
    const lgN = prm.lg ? prm.lg[core] || 0 : 0;
    if (lgN) prm = { ...prm, power: (prm.power || 1) * (1 + 0.3 * lgN) };
    const power = prm.power || 1;
    const pr = burst ? Math.min(1, 0.8 * power) : Math.min(1, 0.4 * power * k);
    const pcell = (b) => Sim === MainSim && W.st ? (U.rectsOverlap(b, W.st.p) || W.st.crs.some((c) => c.hp > 0 && U.rectsOverlap(b, c))) : false;
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
        if (r < pr * (m === M.OBSIDIENNE ? 0.05 : m === M.METAL ? 0.2 : 0.3)) { Sim.set(x, y, M.LAVE); if (r < 0.02 && Sim === MainSim) W.onSimEvent('magma', (x + 0.5) * CS, (y + 0.5) * CS); }
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
      if (Sim === MainSim) { W.evt('pousse'); W.msg('Un arbre jaillit du sol !'); }
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
          if (m === M.TERRE && Sim.get(x, y - 1) === M.AIR) { if (r < prv * 0.5) { Sim.set(x, y - 1, M.HERBE); W.evt('pousse'); } }
          else if (m === M.PLANTE && Sim.get(x, y - 1) === M.AIR) { if (r < prv * 0.5) { Sim.set(x, y - 1, M.PLANTE); W.evt('pousse'); } }
          else if (m === M.HERBE && Sim.get(x, y - 1) === M.AIR) { if (r < prv * 0.25) { Sim.set(x, y, M.PLANTE); W.evt('pousse'); } }
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
          if (m === M.EAU) { if (r < pr * 0.9) { Sim.set(x, y, M.GLACE); if (r < 0.02) W.onSimEvent('gel', (x + 0.5) * CS, (y + 0.5) * CS); } }
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
          else if (q.corrode > 0 && !q.liquid) { if (r < pr * q.corrode * 3 * (lgN ? 3 : 1)) { Sim.set(x, y, r < 0.5 ? M.FUMEE : M.AIR, 20); if (r < 0.03) W.onSimEvent('corrosion', (x + 0.5) * CS, (y + 0.5) * CS); } }
        });
        break;
      case 'lumiere':
        if (!lgN) break;
        Sim.forRadius(cx, cy, rad * 0.6, (x, y, i, m) => {
          const q = P[m], r = Math.random();
          if (W.FLAM(m) && Sim.aux[i] === 0) { if (r < pr * 0.25 * lgN) { Sim.aux[i] = q.burn; Sim.touch(i); } }
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
          if (W.FLAM(m) && Sim.aux[i] > 0) { Sim.aux[i] = 1; Sim.touch(i); }
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
          if (m === M.VERRE) { if (Math.random() < pr) { Sim.set(x, y, M.SABLE); if (Math.random() < 0.05) W.onSimEvent('verre_brise', (x + 0.5) * CS, (y + 0.5) * CS); } }
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
          else if (W.FLAM(m) && Sim.aux[i] > 0) { Sim.aux[i] = 0; Sim.touch(i); }
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
  function effetDerive(core, cx, cy, rad, prm, burst, k, mode, opts) {
    const power = prm.power || 1, dur = prm.duration || 1;
    const dans = (b) => U.circleRect(cx, cy, rad, b);
    switch (core) {
      case 'esprit': {
        if (!burst) return true;
        let best = null, bd = 1e9; for (const c of W.st.crs) if (c.hp > 0 && c.t !== 'familier' && !c.controlled && dans(c)) { const d = dist(cx, cy, c.x + c.w / 2, c.y + c.h / 2); if (d < bd) { bd = d; best = c; } }
        if (best) { if (W.st.control) W.releaseControl(); W.controlCreature(best, 12 * dur); }
        W.fxBurst('esprit', cx, cy, rad); return true;
      }
      case 'lecture': {
        if (!burst) return true;
        let n = 0;
        for (const c of W.st.crs) {
          if (c.hp <= 0 || c.t === 'familier' || !dans(c)) continue; const sp = DATA.ESPECES[c.t]; if (!sp) continue;
          W.evt('bestiaire', { t: c.t, k: 'aime' }); W.evt('bestiaire', { t: c.t, k: 'craint' }); c.affT = 6;
          W.st.sp.push({ k: 'label', txt: 'aime ' + DATA.nomEffet(sp.aime).toLowerCase() + ' · craint ' + DATA.nomEffet(sp.craint).toLowerCase() + (c.sta.tame ? ' · apprivoisé(e)' : ' · ' + Math.round(c.aff || 0) + ' %'), x: c.x + c.w / 2, y: c.y - 24, life: 3.5, petit: true });
          W.part(c.x + c.w / 2, c.y, '#b08ad8', 8, 40, 0.8, 2, -30, 'glow'); n++;
        }
        if (!n) W.msg('Aucun esprit à lire ici.');
        W.fxBurst('esprit', cx, cy, rad); return true;
      }
      case 'revelation': {
        if (!burst) return true;
        const R4 = rad * 5;
        W.game.explorer((cx - R4) / CS, (cy - R4) / CS, R4 * 2 / CS, R4 * 2 / CS);
        for (const o of W.st.objs) if (o.t === 'rune' && dist(cx, cy, o.x, o.y) < R4) o.revele = 1;
        W.st.revelation = { x: cx, y: cy, r: R4, t: 12 * (prm.duration || 1), max: 12 * (prm.duration || 1) };
        W.st.flash = 0.05; W.fxBurst('lumiere', cx, cy, rad * 2); Son.sfx('burst', 'lumiere');
        W.msg('La lumière traverse la roche : ce qui est caché luit un moment.');
        return true;
      }
      case 'peur':
        for (const c of W.st.crs) if (c.hp > 0 && c.t !== 'familier' && !c.sta.tame && dans(c)) { c.fuite = { x: cx, y: cy, t: 6 * dur }; c.sta.sleep = 0; c.dort = false; c.curieux = null; if (burst) W.part(c.x + c.w / 2, c.y - 6, '#8a5aa8', 5, 50, 0.6, 2, -40, 'glow'); }
        if (burst) { W.fxBurst('ombre', cx, cy, rad); Son.sfx('burst', 'ombre'); } return true;
      case 'repulsion': {
        if (!opts.noGrid) gridEffect('vent', cx, cy, rad, prm, burst, k);
        const pousse = (b, m = 1) => { const dx = b.x + b.w / 2 - cx, dy = b.y + b.h / 2 - cy, d = Math.hypot(dx, dy) || 1; b.vx += dx / d * 650 * power * k * m; b.vy += (dy / d * 450 - 120) * power * k * m; b.onGround = false; };
        for (const c of W.st.crs) if (c.hp > 0 && !c.carried && dans(c)) pousse(c, c.t === 'golem' ? 0.5 : 1);
        for (const o of W.st.objs) if (o.dyn && !o.carried && !o.mort && dans(o)) pousse(o);
        if (!opts.noPlayer && dans(W.st.p)) pousse(W.st.p, 0.6);
        if (burst) { W.fxBurst('gravite', cx, cy, rad); Son.sfx('burst', 'force'); } return true;
      }
      case 'fumee':
        if (!opts.noGrid) Sim.forRadius(cx, cy, rad * (burst ? 0.9 : 0.5), (x, y, i, m) => { if (m === M.AIR && Math.random() < (burst ? 0.55 : 0.1 * k)) Sim.set(x, y, M.FUMEE, 140 + (Math.random() * 110) | 0); else if (W.FLAM(m) && Sim.aux[i] > 0 && Math.random() < 0.3) { Sim.aux[i] = 0; Sim.touch(i); } else if (m === M.FEU && Math.random() < 0.5) Sim.set(x, y, M.FUMEE, 80); });
        for (const c of W.st.crs) if (c.hp > 0 && dans(c)) { c.sta.stun = Math.max(c.sta.stun, burst ? 2 * dur : 0.3); c.curieux = null; }
        if (burst) { W.part(cx, cy, '#6e6660', 18, 60 + rad * 0.5, 1.6, 6, -40, 'fumee'); Son.sfx('burst', 'vent'); } return true;
      case 'explosion': {
        if (!burst) { applyEffect('feu', cx, cy, rad * 0.6, prm, mode, opts); return true; }
        const R2 = rad * 0.5 * Math.sqrt(power);
        if (!opts.noGrid) {
          Sim.forRadius(cx, cy, R2, (x, y, i, m) => { if (!m || m === M.OBSIDIENNE || m === M.METAL || m === M.BULLE) return; if (Math.random() < 0.85) Sim.set(x, y, Math.random() < 0.25 ? M.FEU : M.AIR, 20); });
          Sim.forRadius(cx, cy, rad, (x, y, i, m) => { if (W.FLAM(m) && Sim.aux[i] === 0 && Math.random() < 0.3) { Sim.aux[i] = P[m].burn; Sim.touch(i); } else if (m === M.POUDRE) Sim.set(x, y, M.FEU, 6); });
        }
        const souffle = (b, f) => { const dx = b.x + b.w / 2 - cx, dy = b.y + b.h / 2 - cy, d = Math.hypot(dx, dy) || 1; if (d > rad * 1.3) return 0; const g = (1 - d / (rad * 1.3)) * f; b.vx += dx / d * 800 * g * power; b.vy += dy / d * 650 * g * power - 250 * g; b.onGround = false; return g; };
        for (const c of W.st.crs) if (c.hp > 0 && !c.carried) { const g = souffle(c, c.t === 'golem' ? 0.5 : 1); if (g) { W.hurt(c, 3 * g * power); c.sta.stun = Math.max(c.sta.stun, 1.2); } }
        for (const o of W.st.objs) if (o.dyn && !o.carried && !o.mort) { const g = souffle(o, 1); if (g && o.t === 'caisse') { o.hp -= 2 * g; if (o.hp <= 0) o.mort = true; } if (g > 0.4 && o.t === 'rocher') { o.mort = true; W.dropPickup('poussiere', o.x + o.w / 2, o.y); } }
        if (!opts.noPlayer) { const p = W.st.p; const g = souffle(p, 0.8); if (g && !(p.sta.stone > 0) && !(p.sta.armure > 0)) { p.hp -= 2 * g; W.msg('BOUM !', 'warn'); } }
        W.st.shake = Math.max(W.st.shake || 0, 0.6); W.st.flash = 0.08; Son.sfx('burst', 'feu');
        W.fxBurst('feu', cx, cy, rad * 1.4); W.part(cx, cy, '#5a524c', 20, 120, 1.4, 7, -60, 'fumee'); W.part(cx, cy, '#f0c060', 30, 400, 0.6, 2, 300, 'etincelle');
        W.st.sp.push({ k: 'ring', core: 'feu', x: cx, y: cy, r: rad * 1.4, life: 0.5, max: 0.5, color: '#f0a040' });
        W.game.observe('explosion');
        return true;
      }
      case 'courant': {
        const p = W.st.p; let dv = opts.dir; if (!dv) { const dx = cx - (p.x + p.w / 2); dv = { x: Math.sign(dx) || 1, y: 0 }; }
        const L2 = Math.hypot(dv.x, dv.y) || 1, ux = dv.x / L2, uy = dv.y / L2;
        if (!opts.noGrid) {
          let n = 0; Sim.forRadius(cx, cy, rad, (x, y, i, m) => { if (P[m].liquid) n++; });
          if (n < 30 && burst) gridEffect('eau', cx, cy, rad * 0.8, { ...prm, power: power * 1.2 }, true, 1);
          for (let pass = 0; pass < (burst ? 6 : 1); pass++) Sim.forRadius(cx, cy, rad * 1.2, (x, y, i, m) => { if (!P[m].liquid || m === M.LAVE || Math.random() > 0.7) return; const nx = x + Math.round(ux * 2), ny = y + Math.round(uy * 2); if (Sim.get(nx, ny) === M.AIR) Sim.swap(i, ny * Sim.W + nx); });
        }
        const emporte = (b, m = 1) => { b.vx += ux * 700 * power * k * m; b.vy += uy * 500 * power * k * m - 60 * k * m; };
        for (const c of W.st.crs) if (c.hp > 0 && !c.carried && dans(c)) { emporte(c, c.t === 'golem' ? 0.4 : 1); c.sta.wet = 6; c.sta.burn = 0; }
        for (const o of W.st.objs) if (o.dyn && !o.carried && !o.mort && dans(o)) { emporte(o); o.burning = 0; }
        if (burst) { W.fxBurst('eau', cx, cy, rad); for (let q = 0; q < 14; q++) W.st.parts.push({ x: cx - ux * rad * Math.random(), y: cy - uy * rad * Math.random() + (Math.random() - 0.5) * 20, vx: ux * 500, vy: uy * 500, life: 0.5, max: 0.5, color: '#5f9ad8', size: 2.4, grav: 300, type: 'goutte' }); }
        return true;
      }
      case 'seisme': {
        if (!burst) return true;
        const R3 = rad * 1.5; W.st.shake = Math.max(W.st.shake || 0, 0.7); Son.sfx('burst', 'terre');
        for (const c of W.st.crs) if (c.hp > 0 && !c.carried && dist(cx, cy, c.x + c.w / 2, c.y + c.h) < R3) { if (c.onGround) { c.vy -= 320 * power; c.onGround = false; } c.sta.stun = Math.max(c.sta.stun, 1.5 * dur); W.hurt(c, 0.5 * power); }
        for (const o of W.st.objs) if (!o.mort && dist(cx, cy, o.x + o.w / 2, o.y + o.h) < R3) { if (o.dyn && !o.carried) { o.vy -= 280; o.vx += (Math.random() - 0.5) * 200; } if (o.t === 'rocher' && power >= 1.2) { o.mort = true; W.part(o.x + o.w / 2, o.y + o.h / 2, '#8a6b2f', 16, 120, 0.8, 4, 600); W.dropPickup('poussiere', o.x + o.w / 2, o.y - 10); } }
        if (!opts.noGrid) Sim.forRadius(cx, cy, R3, (x, y, i, m) => { const r = Math.random(); if (m === M.VERRE && r < 0.5) Sim.set(x, y, M.SABLE); else if (m === M.GLACE && r < 0.3) Sim.set(x, y, M.NEIGE); else if (m === M.PIERRE && r < 0.04 * power && Sim.get(x, y + 1) === M.AIR) Sim.set(x, y, M.SABLE); else if (m && (P[m].powder || P[m].liquid)) Sim.touch(i); });
        if (!opts.noPlayer && W.st.p.onGround && dist(cx, cy, W.st.p.x, W.st.p.y + W.st.p.h) < R3) { W.st.p.vy -= 200; W.st.p.onGround = false; }
        for (let q = 0; q < 24; q++) W.st.parts.push({ x: cx + R3 * (Math.random() * 2 - 1), y: cy + 10, vx: (Math.random() - 0.5) * 80, vy: -120 - Math.random() * 160, life: 0.8, max: 0.8, color: '#a3844f', size: 3, grav: 900, type: 'eclat' });
        W.st.sp.push({ k: 'ring', core: 'terre', x: cx, y: cy, r: R3, life: 0.6, max: 0.6, color: '#8a6b2f' });
        return true;
      }
      case 'saut': {
        if (!burst) return true;
        const ailleurs = (b) => { for (let t = 0; t < 20; t++) { const a = Math.random() * TAU, d = 120 + Math.random() * 120; const nx = b.x + Math.cos(a) * d, ny = b.y + Math.sin(a) * d * 0.6 - 40; if (!Sim.rectBlocked({ x: nx, y: ny, w: b.w, h: b.h })) { W.part(b.x + b.w / 2, b.y + b.h / 2, '#4fb0a0', 10, 60, 0.5, 3, 0, 'glow'); b.x = nx; b.y = ny; b.vx = b.vy = 0; W.part(nx + b.w / 2, ny + b.h / 2, '#4fb0a0', 10, 60, 0.5, 3, 0, 'glow'); return; } } };
        for (const c of W.st.crs) if (c.hp > 0 && !c.carried && c.t !== 'familier' && dans(c)) ailleurs(c);
        for (const o of W.st.objs) if (o.dyn && !o.carried && !o.mort && dans(o)) ailleurs(o);
        Son.sfx('cast', 'portail'); W.fxBurst('portail', cx, cy, rad); return true;
      }
    }
    return false;
  }
  function champForme(spec, rect, dir) {
    const prm = spec.prm, dur = prm.duration || 1, cx = (rect.x0 + rect.x1) / 2, cy = (rect.y0 + rect.y1) / 2, r = Math.hypot(rect.x1 - rect.x0, rect.y1 - rect.y0) / 2;
    let fait = false;
    for (const core of spec.cores) {
      if (core === 'gravite' || core === 'poids') {
        const [gx, gy] = dir ? W.snapDir(dir.x, dir.y) : [0, 1];
        const lourd = 1.6 + 1.2 * Math.max(0, ((prm.power || 1) - 1) / 0.6) + ((prm.lg && prm.lg.gravite) || 0) * 0.8;
        if (prm.gInv) W.addGField(cx, cy, r, -gx, -gy, 1.3, 6 * dur, rect); else W.addGField(cx, cy, r, gx, gy, core === 'poids' ? lourd + 1 : lourd, 6 * dur, rect);
        fait = true;
      } else if (core === 'temps' || core === 'ralentir' || core === 'figer') {
        const mode = core === 'temps' ? 'vite' : core === 'ralentir' ? 'lent' : 'fige';
        W.st.sp.push({ k: 'bulle', mode, x: cx, y: cy, r, rect, life: 5 * dur, max: 5 * dur, f: mode === 'vite' ? 5 * (prm.power || 1) : 0.25 }); fait = true;
      }
    }
    if (fait) { Son.sfx('cast', spec.cores[0]); W.part(cx, cy, spec.color, 14, 80, 0.7, 3, 0, 'glow'); }
    return fait && spec.cores.every((c) => W.CHAMPS.includes(c));
  }
  function matiereDe(spec) { for (const c of spec.cores) { const m = DATA.MATIERE[c]; if (m) return M[m]; } return null; }
  function occupe(x, y) { const b = { x: x * CS, y: y * CS, w: CS, h: CS }; return U.rectsOverlap(b, W.st.p) || W.st.crs.some((c) => c.hp > 0 && U.rectsOverlap(b, c)); }
  function poserMatiere(m, cb) { let n = 0; cb((x, y) => { const q = Sim.get(x, y); if (m === M.AIR) { if (P[q].solid && q !== M.OBSIDIENNE && q !== M.METAL) { Sim.set(x, y, M.AIR); n++; } return; } if ((q === M.AIR || P[q].gas || (P[q].liquid && !P[m].liquid)) && !occupe(x, y)) { Sim.set(x, y, m, m === M.LAVE ? 0 : 0); if (m === M.METAL && W.spec0 && W.spec0.cores.includes('foudre')) { Sim.elec[y * Sim.W + x] = 60; } n++; } }); return n; }
  function matiereCercle(spec, x, y, r) { const m = matiereDe(spec); if (m == null) return 0; W.spec0 = spec; return poserMatiere(m, (put) => Sim.forRadius(x, y, r, (cx, cy) => put(cx, cy))); }
  function matiereRect(spec, rect) { const m = matiereDe(spec); if (m == null) return 0; W.spec0 = spec; return poserMatiere(m, (put) => { for (let y = Math.floor(rect.y0 / CS); y <= Math.floor(rect.y1 / CS); y++) for (let x = Math.floor(rect.x0 / CS); x <= Math.floor(rect.x1 / CS); x++) put(x, y); }); }
  function matiereLigne(spec, x1, y1, x2, y2, ep) { const m = matiereDe(spec); if (m == null) return 0; W.spec0 = spec; const L2 = Math.hypot(x2 - x1, y2 - y1); return poserMatiere(m, (put) => { for (let t = 0; t <= L2; t += CS * 0.7) { const x = x1 + (x2 - x1) * t / (L2 || 1), y = y1 + (y2 - y1) * t / (L2 || 1); Sim.forRadius(x, y, ep, (cx, cy) => put(cx, cy)); } }); }
  function murPoints(tx, ty, w, h) {
    const pts = [], rb = Math.max(12, Math.min(w, h) / 2 + 4), vert = h >= w, L = vert ? h : w, n = Math.max(2, Math.ceil(L / (rb * 1.4)));
    for (let k = 0; k < n; k++) { const f = n > 1 ? k / (n - 1) - 0.5 : 0; pts.push({ x: tx + (vert ? 0 : f * (w - rb)), y: ty + (vert ? f * (h - rb) : 0), r: rb }); }
    return pts;
  }
  function poserBulle(mode, cx, cy, rad, prm) {
    const dur = prm.duration || 1, r = Math.max(50, rad * 1.1);
    { const bulles = W.st.sp.filter((q) => q.k === 'bulle' && !q.mort); if (bulles.length >= 8) bulles[0].life = 0.01; }
    W.st.sp.push({ k: 'bulle', mode, x: cx, y: cy, r, life: 5 * dur * (1 + (prm.persist || 0)), max: 5 * dur * (1 + (prm.persist || 0)), f: mode === 'vite' ? 5 * (prm.power || 1) : 0.25 });
    Son.sfx('cast', 'temps'); W.part(cx, cy, mode === 'vite' ? '#c8ccd8' : '#8aa0d8', 16, 90, 0.7, 3, 0, 'glow');
  }
  function vieillir(mode, cx, cy, r, dt, f = 5, rect = null) {
    const dans = (b) => (rect ? U.rectsOverlap({ x: rect.x0, y: rect.y0, w: rect.x1 - rect.x0, h: rect.y1 - rect.y0 }, b) : U.circleRect(cx, cy, r, b));
    const Sim = rect ? Object.assign(Object.create(MainSim), { forRadius: (x, y, rr, cb) => { for (let yy = Math.floor(rect.y0 / CS); yy <= Math.floor(rect.y1 / CS); yy++) for (let xx = Math.floor(rect.x0 / CS); xx <= Math.floor(rect.x1 / CS); xx++) { if (xx < 0 || yy < 0 || xx >= MainSim.W || yy >= MainSim.H) continue; const i = yy * MainSim.W + xx; cb(xx, yy, i, MainSim.mat[i]); } } }) : MainSim;
    if (mode === 'vite') {
      const k = dt * f; // secondes « vécues » en plus
      Sim.forRadius(cx, cy, r, (x, y, i, m) => {
        if (!m) return; const q = Math.random(), haut = Sim.get(x, y - 1) === M.AIR;
        if (W.FLAM(m) && Sim.aux[i] > 0) { Sim.aux[i] = Math.max(1, Sim.aux[i] - Math.ceil(12 * k)); Sim.touch(i); }
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
      for (const o of W.st.objs) {
        if (o.mort || !dans(o)) continue;
        if (o.t === 'graine' && o.stage === 1) { o.gt = (o.gt || 0) + k; if (!o.racine) o.regrow += k; }
        if (o.burning > 0) o.burning = Math.max(0, o.burning - k);
        if (o.t === 'brasier' && o.feu > 0) o.feu = Math.max(0, o.feu - k);
        if (o.t === 'lampe' && o.charge > 0) o.charge = Math.max(0, o.charge - k);
        if (o.t === 'moulin' && o.spin > 0) o.spin = Math.max(0, o.spin - k);
      }
      const p = W.st.p;
      if (dans(p)) { for (const s2 in p.sta) if (p.sta[s2] > 0 && s2 !== 'forme') p.sta[s2] = Math.max(0, p.sta[s2] - k * 0.5); p.ink = Math.min(p.inkMax, p.ink + dt * (p.inkRegen || 1) * 2); }
    } else if (mode === 'fige') {
      // tout est déjà suspendu par le facteur de temps nul de la bulle
    } else {
      // temps lent : le facteur de temps de la bulle ralentit tout ce qui s'y trouve
    }
  }
  function finMorph(c) {
    if (!c.orig) return;
    const o = c.orig; c.orig = null; c.morphT = 0;
    const nb = W.makeCreature({ t: o.t, x: c.x, y: c.y + c.h - o.h, x0: c.x0 });
    const bas = c.y + c.h, mil = c.x + c.w / 2;
    for (const k of ['w', 'h', 'hpMax', 'dmg', 'vole', 'generique', 'portable']) c[k] = nb[k];
    c.t = o.t; c.y = bas - nb.h; c.x = mil - nb.w / 2; c.hp = c.hp > 0 ? Math.min(nb.hpMax, Math.max(1, o.hp)) : 0; c.size = 1;
    if (c.hp > 0) { W.unstick(c); W.part(c.x + c.w / 2, c.y + c.h / 2, '#c06aa0', 14, 90, 0.7, 3, 0, 'glow'); }
  }
  function metamorphoser(cx, cy, rad, prm) {
    const dur = prm.duration || 1; let n = 0;
    for (const c of W.st.crs) {
      if (c.hp <= 0 || c.t === 'familier' || c.t === 'gardien' || c.controlled || !U.circleRect(cx, cy, rad, c)) continue;
      if (prm.inverse || c.orig) { if (c.orig) { finMorph(c); n++; } continue; }
      if (c.t === 'follet') continue;
      const choix = W.MORPHS.filter((t) => t !== c.t); const T = choix[(Math.random() * choix.length) | 0];
      const nb = W.makeCreature({ t: T, x: c.x, y: c.y, x0: c.x0 });
      c.orig = { t: c.t, hp: c.hp, w: c.w, h: c.h };
      const bas = c.y + c.h;
      for (const k of ['w', 'h', 'hpMax', 'dmg', 'vole', 'generique', 'portable']) c[k] = nb[k];
      c.t = T; c.hp = nb.hp; c.y = bas - c.h; c.x += (c.orig.w - c.w) / 2; c.size = 1; c.morphT = 20 * dur; c.sta.stun = Math.max(c.sta.stun, 0.6);
      W.part(c.x + c.w / 2, c.y + c.h / 2, '#c06aa0', 18, 110, 0.8, 3, 0, 'glow'); W.part(c.x + c.w / 2, c.y + c.h / 2, '#f0d0e8', 10, 160, 0.5, 1.6, 0, 'etincelle');
      W.evt('espece', T); n++;
      if (c.orig.t === 'golem') W.msg('Le golem rapetisse... et devient ' + W.nomCreature(T).toLowerCase() + ' !');
    }
    // objets : caisse et rocher échangent leur nature
    for (const o of W.st.objs) {
      if (o.mort || o.carried || !U.circleRect(cx, cy, rad, o) || (o.t !== 'caisse' && o.t !== 'rocher')) continue;
      const nb = W.makeObj({ t: o.t === 'caisse' ? 'rocher' : 'caisse', x: o.x, y: o.y });
      const bas = o.y + o.h; for (const k in nb) if (k !== 'x' && k !== 'y') o[k] = nb[k]; o.y = bas - o.h; W.unstick(o); n++;
      W.part(o.x + o.w / 2, o.y + o.h / 2, '#c06aa0', 12, 90, 0.7, 3, 0, 'glow');
    }
    W.st.sp.push({ k: 'ring', core: 'metamorphose', x: cx, y: cy, r: rad, life: 0.5, max: 0.5, color: '#c06aa0' });
    Son.sfx('burst', 'vie');
    if (!n) W.part(cx, cy, '#c06aa0', 10, 60, 0.7, 3, -30, 'glow');
  }
  function formeDe(spec) {
    const autre = spec.cores.find((c) => c !== 'metamorphose') || (spec.seal && spec.seal.core2);
    const M2 = { eau: 'grenouille', froid: 'grenouille', vent: 'chauve', ombre: 'chauve', vie: 'lapin', foudre: 'lapin', terre: 'golem', metal: 'golem', force: 'golem' };
    if (M2[autre]) return M2[autre];
    const k = Object.keys(W.FORMES); return k[(Math.random() * 3) | 0];
  }
  function morphSoi(spec) {
    const p = W.st.p, prm = spec.prm;
    if (prm.inverse || p.forme) { finFormeSoi(); return; }
    const f = formeDe(spec), F = W.FORMES[f], d = 20 * (prm.duration || 1);
    p.forme = f; p.sta.forme = d; for (const k of F.sta) p.sta[k] = Math.max(p.sta[k] || 0, d);
    W.part(p.x + p.w / 2, p.y + p.h / 2, '#c06aa0', 22, 120, 0.8, 3, 0, 'glow'); Son.sfx('burst', 'vie');
    W.msg('Te voilà ' + (f === 'golem' ? 'golem' : f === 'chauve' ? 'chauve-souris' : f) + ' pour ' + Math.round(d) + ' s.' + (f === 'chauve' ? ' Tu voles sans dépenser d\'encre.' : f === 'golem' ? ' Lourd et dur comme la pierre.' : ''));
  }
  function finFormeSoi() {
    const p = W.st.p; if (!p.forme) return;
    for (const k of W.FORMES[p.forme].sta) p.sta[k] = 0;
    p.forme = null; p.sta.forme = 0; W.part(p.x + p.w / 2, p.y + p.h / 2, '#c06aa0', 14, 90, 0.7, 3, 0, 'glow'); W.msg('Tu reprends ta forme.');
  }
  function memoriser(dt) {
    W.st.histT = (W.st.histT || 0) + dt;
    if (W.st.histT < W.HIST_DT) return;
    W.st.histT = 0;
    const H = W.st.hist || (W.st.hist = []);
    const snap = H.length >= W.HIST_N ? H.shift() : { mat: new Uint8Array(Sim.mat.length), aux: new Uint8Array(Sim.aux.length) };
    snap.mat.set(Sim.mat); snap.aux.set(Sim.aux); snap.t = W.time; H.push(snap);
    const p = W.st.p; (p.hist || (p.hist = [])).push([p.x, p.y, p.hp, W.time]); if (p.hist.length > W.HIST_N) p.hist.shift();
    for (const c of W.st.crs) { (c.hist || (c.hist = [])).push([c.x, c.y, c.hp, W.time]); if (c.hist.length > W.HIST_N) c.hist.shift(); }
  }
  function passe(hist, back) { if (!hist || !hist.length) return null; let best = hist[0]; for (const h of hist) { const t = h.t !== undefined ? h.t : h[3]; if (t <= W.time - back) best = h; } return best; }
  function rembobiner(cx, cy, rad, prm) {
    const back = clamp(3 * (prm.duration || 1), 1, 6);
    const snap = passe(W.st.hist, back);
    let n = 0;
    if (snap) Sim.forRadius(cx, cy, rad, (x, y, i, m) => { const q = snap.mat[i]; if (q !== m && q !== M.BULLE && m !== M.BULLE) { Sim.set(x, y, q, snap.aux[i]); n++; } });
    for (const c of W.st.crs) {
      if (c.t === 'familier' || !c.hist || !c.hist.length) continue;
      const h = passe(c.hist, back); if (!h || dist(cx, cy, h[0] + c.w / 2, h[1] + c.h / 2) > rad + 30 && dist(cx, cy, c.x + c.w / 2, c.y + c.h / 2) > rad) continue;
      const mort = c.hp <= 0;
      if (h[2] > 0) { c.x = h[0]; c.y = h[1]; c.hp = Math.min(c.hpMax, h[2]); c.vx = c.vy = 0; if (mort) { c.respawn = 0; W.msg(W.nomCreature(c.t) + ' se relève, à rebours.'); } W.unstick(c); n++; W.part(c.x + c.w / 2, c.y + c.h / 2, '#7a8ad0', 10, 60, 0.6, 3, 0, 'glow'); }
    }
    const p = W.st.p; if (U.circleRect(cx, cy, rad, p)) W.unstick(p);
    for (const o of W.st.objs) if (o.dyn && !o.mort && U.circleRect(cx, cy, rad, o)) W.unstick(o);
    W.st.sp.push({ k: 'rembob', x: cx, y: cy, r: rad, life: 0.8, max: 0.8 });
    Son.sfx('cast', 'temps');
    if (n) W.evt('rembobinage');
  }
  function rembobinerSoi(prm) {
    const p = W.st.p, back = clamp(3 * (prm.duration || 1), 1, 6);
    const h = passe(p.hist, back); if (!h) { W.msg('Le temps n\'a pas encore de passé à te rendre.'); return; }
    const chemin = p.hist.filter((q) => q[3] >= h[3]).map((q) => [q[0] + p.w / 2, q[1] + p.h / 2]); chemin.push([p.x + p.w / 2, p.y + p.h / 2]);
    W.st.sp.push({ k: 'fantome', pts: chemin.reverse(), life: 0.9, max: 0.9 });
    p.x = h[0]; p.y = h[1]; p.vx = p.vy = 0; p.hp = Math.max(p.hp, Math.min(p.hpMax, h[2])); W.unstick(p);
    W.st.sp.push({ k: 'rembob', x: p.x + p.w / 2, y: p.y + p.h / 2, r: 60, life: 0.6, max: 0.6 });
    Son.sfx('cast', 'temps'); W.msg('Tu reviens ' + Math.round(W.time - h[3]) + ' s en arrière.');
  }
  function effetLangage(core, n, cx, cy, rad, prm, burst, k) {
    const power = prm.power || 1, dur = prm.duration || 1;
    const dans = (c) => c.hp > 0 && c.t !== 'familier' && U.circleRect(cx, cy, rad, c);
    switch (core) {
      case 'eau': for (const c of W.st.crs) if (dans(c)) { const dx = c.x + c.w / 2 - cx, dy = c.y + c.h / 2 - cy, d = Math.hypot(dx, dy) || 1; const m = c.t === 'golem' ? 0.35 : 1; c.vx += dx / d * 420 * n * k * m; c.vy += (dy / d * 200 - 160) * n * k * m; if (burst && n >= 2) W.hurt(c, 1 * power); } break;
      case 'froid': if (burst) for (const c of W.st.crs) if (dans(c) && !c.sta.tame) { c.sta.gele = Math.max(c.sta.gele || 0, 4 * n * dur); c.sta.stun = Math.max(c.sta.stun, c.sta.gele); c.vx = 0; c.sta.burn = 0; } break;
      case 'vent':
        for (const c of W.st.crs) if (dans(c)) { c.vy -= 380 * n * k * (c.t === 'golem' ? 0.4 : 1); c.onGround = false; }
        for (const o of W.st.objs) if (o.dyn && !o.carried && !o.mort && U.circleRect(cx, cy, rad, o)) o.vy -= 380 * n * k;
        if (burst && n >= 2) tornade(cx, cy, rad, dur);
        break;
      case 'foudre': if (burst) arcsTension(cx, cy, rad, n >= 2 ? 6 : 3, power, n >= 2); break;
      case 'vie': for (const c of W.st.crs) if (c.hp > 0 && U.circleRect(cx, cy, rad, c)) c.hp = Math.min(c.hpMax, c.hp + 2 * k); if (burst) W.part(cx, cy, '#e8a0c0', 10, 70 + rad, 1.2, 3, 60, 'feuille'); break;
      case 'lumiere': for (const c of W.st.crs) if (dans(c)) c.sta.stun = Math.max(c.sta.stun, (burst ? 2.5 : 0.4) * (1 + n) * dur); break;
      case 'ombre': if (burst && n >= 2) for (const c of W.st.crs) if (dans(c) && (c.sta.sleep > 0 || c.dort) && !c.sta.tame && c.t !== 'golem') { W.tame(c); W.part(c.x + c.w / 2, c.y, '#c45a8a', 4, 40, 0.8, 3, -60, 'coeur'); } break;
      case 'acide': if (burst) for (const c of W.st.crs) if (dans(c) && c.t === 'golem') W.hurt(c, 1.5 * n * power); break;
      case 'gravite': if (burst && n >= 2) W.st.sp.push({ k: 'singularite', x: cx, y: cy, r: rad * 1.8, life: 2.6 * dur, max: 2.6 * dur }); break;
    }
  }
  function tornade(cx, cy, rad, dur) {
    const g = W.groundBelow(cx, cy);
    W.st.sp.push({ k: 'tornade', x: cx, y: g != null ? Math.min(g, cy + 220) : cy + 40, r: Math.max(42, rad * 0.9), h: 270, life: 4 * dur, max: 4 * dur, ph: Math.random() * 9 });
    W.msg('Une tornade se lève !');
  }
  function arcsTension(cx, cy, rad, n, power, violet) {
    const col = violet ? '#b070e0' : '#e0c43a';
    const cand = W.st.crs.filter((c) => c.hp > 0 && c.t !== 'familier' && !c.sta.tame).map((c) => [dist(cx, cy, c.x + c.w / 2, c.y + c.h / 2), c]).filter((q) => q[0] < rad + 320).sort((a, b) => a[0] - b[0]).slice(0, n);
    let fx = cx, fy = cy;
    for (const [, c] of cand) {
      const tx = c.x + c.w / 2, ty = c.y + c.h / 2;
      W.st.sp.push({ k: 'zap', pts: FX.eclairPts(fx, fy, tx, ty, 0.22), life: 0.35, max: 0.35, color: col });
      W.hurt(c, 1.5 * power); c.sta.stun = Math.max(c.sta.stun, 1.5); if (violet && !c.sta.wet) c.sta.burn = Math.max(c.sta.burn, 3);
      W.part(tx, ty, col, 6, 120, 0.3, 2, 0, 'etincelle'); fx = tx; fy = ty;
    }
    if (!cand.length) for (let q = 0; q < 2; q++) { const a = Math.random() * TAU; W.st.sp.push({ k: 'zap', pts: FX.eclairPts(cx, cy, cx + Math.cos(a) * (rad + 80), cy + Math.sin(a) * (rad + 80), 0.3), life: 0.25, max: 0.25, color: col }); }
    if (violet) Sim.forRadius(cx, cy, rad * 1.5, (x, y, i, m) => { const q = P[m]; if (W.FLAM(m) && Sim.aux[i] === 0 && Math.random() < 0.25) { Sim.aux[i] = q.burn; Sim.touch(i); } else if ((m === M.HUILE || m === M.POUDRE || m === M.SEVE) && Math.random() < 0.4) Sim.set(x, y, M.FEU, 30); });
  }
  function applyEffect(core, cx, cy, rad, prm, mode, opts = {}) {
    if (prm && prm.ess && prm.ess[core]) prm = Object.assign({}, prm, { power: (prm.power || 1) * prm.ess[core].pk });
    const R = rad + 60, snap = [];
    for (const c of W.st.crs) if (c.hp > 0 && Math.abs(c.x + c.w / 2 - cx) < R + c.w && Math.abs(c.y + c.h / 2 - cy) < R + c.h) snap.push(c, c.vx, c.vy);
    for (const o of W.st.objs) if (o.dyn && !o.mort && !o.carried && Math.abs(o.x + o.w / 2 - cx) < R + o.w && Math.abs(o.y + o.h / 2 - cy) < R + o.h) snap.push(o, o.vx, o.vy);
    applyEffet0(core, cx, cy, rad, prm, mode, opts);
    if (!opts.phen) W.PH.reagir(core, cx, cy, rad, prm, mode);
    for (let k = 0; k < snap.length; k += 3) { const e = snap[k], m = W.masse(e); if (m === 1) continue; const f = clamp(Math.pow(m, -0.6), 0.25, 1.35); e.vx = snap[k + 1] + (e.vx - snap[k + 1]) * f; e.vy = snap[k + 2] + (e.vy - snap[k + 2]) * f; }
  }
  function applyEffet0(core, cx, cy, rad, prm, mode, opts = {}) {
    const burst = mode === 'burst';
    const k = burst ? 1 : mode * 2.2;
    if (core === 'marque') { if (burst) W.placeMarque(cx, cy, rad); return; }
    if (core === 'contre') { if (burst) dissiper(cx, cy, rad); return; }
    if (core === 'metamorphose') { if (burst) metamorphoser(cx, cy, rad, prm); return; }
    if (core === 'rembobinage') { if (burst) rembobiner(cx, cy, rad, prm); return; }
    if (core === 'figer') { if (burst) poserBulle('fige', cx, cy, rad, prm); return; }
    if (core === 'temps' || core === 'ralentir') { if (burst) poserBulle(core === 'temps' ? 'vite' : 'lent', cx, cy, rad, prm); else vieillir(core === 'temps' ? 'vite' : 'lent', cx, cy, rad, mode); return; }
    const lgN = prm.lg ? prm.lg[core] || 0 : 0;
    if (lgN) prm = { ...prm, power: (prm.power || 1) * (1 + 0.3 * lgN), duration: (prm.duration || 1) * (core === 'ombre' ? 2 : 1) };
    const power = prm.power || 1, dur = prm.duration || 1;
    // le vent qui reste : un souffle depuis le point, ou vers lui
    { const kk = burst ? 1 : Math.min(1, mode * 3); if (core === 'vent' || core === 'son') Sim.souffler(cx, cy, rad * 1.6, 0, 0, 1.6 * power * kk); else if (core === 'repulsion' || core === 'explosion') Sim.souffler(cx, cy, rad * 1.4, 0, 0, 1.1 * power * kk); else if (core === 'force') Sim.souffler(cx, cy, rad * 1.4, 0, 0, -1.0 * power * kk); }
    // la chaleur : le feu chauffe, le gel refroidit, l'explosion et la foudre échauffent
    { const kk = burst ? 1 : Math.min(1, mode * 3); const T = core === 'feu' ? 175 + 30 * lgN : core === 'explosion' ? 195 : core === 'froid' ? 18 - 8 * lgN : core === 'foudre' ? 150 : core === 'lumiere' && lgN ? 140 : core === 'secheresse' ? 120 : core === 'neutraliser' ? 48 : 0;
      if (T) Sim.chauffer(cx, cy, rad * (core === 'foudre' ? 0.4 : 0.9), T, clamp((core === 'froid' || core === 'feu' ? 0.55 : 0.35) * power * kk, 0, 1)); }
    const C = W.colorOf(core);
    if (burst) W.st.sp.push({ k: 'ring', core, x: cx, y: cy, r: rad, life: 0.4, max: 0.4, color: C });
    if (effetDerive(core, cx, cy, rad, prm, burst, k, mode, opts)) return;
    if (!opts.noGrid) gridEffect(core, cx, cy, rad, opts.mur ? { ...prm, mur: true } : prm, burst, k);

    // --- créatures ---
    for (const c of W.st.crs) {
      if (c.hp <= 0) continue;
      if (!U.circleRect(cx, cy, rad, c)) continue;
      const ccx = c.x + c.w / 2, ccy = c.y + c.h / 2;
      let dx = ccx - cx, dy = ccy - cy; const d = Math.hypot(dx, dy) || 1; dx /= d; dy /= d;
      if (burst) W.evt('hit', 'creature:' + c.t);
      if (c.t === 'gardien') { W.GD.sort(c, core, { power, k, burst, dur, dx, dy }); continue; }
      const sp = DATA.ESPECES[c.t];
      if (sp && burst) { if (core === sp.aime) W.evt('bestiaire', { t: c.t, k: 'aime' }); if (core === sp.craint) W.evt('bestiaire', { t: c.t, k: 'craint' }); }
      if (sp && !c.generique && core === sp.aime) { W.affinite(c, burst ? 1 : k * 0.3); c.hp = Math.min(c.hpMax, c.hp + k); if (c.t === 'follet') c.size = Math.min(1.8, c.size + 0.15 * k); continue; }
      if (c.generique && sp) {
        const immune = (sp.immune || []).includes(core), faible = (sp.faible || []).includes(core) ? 2 : 1;
        if (core === sp.aime) { c.hp = Math.min(c.hpMax, c.hp + 2 * k); W.affinite(c, burst ? 1 : k * 0.3); continue; }
        if (core === sp.craint) { c.fuite = { x: cx, y: cy, t: 5 }; c.sta.stun = 0; c.dort = false; if (!immune) W.hurt(c, 1 * power * k * faible); c.vx += dx * 400 * k; c.vy -= 200 * k; if (burst) W.part(ccx, ccy, C, 6, 60); continue; }
        if (immune) { if (burst) W.part(ccx, ccy, '#aaa', 4, 40, 0.4); continue; }
        switch (core) {
          case 'feu': if (!c.sta.wet) { W.hurt(c, 2 * power * k * faible); c.sta.burn = Math.max(c.sta.burn, 3 * dur); } break;
          case 'eau': c.sta.burn = 0; c.sta.wet = 6; if (c.t === 'poisson') c.hp = Math.min(c.hpMax, c.hp + 2 * k); break;
          case 'vent': case 'son': c.vx += dx * 500 * power * k; c.vy += (dy * 300 - 150) * power * k; c.dort = false; break;
          case 'terre': if (burst) { W.hurt(c, 1 * power * faible); c.vy -= 200; } break;
          case 'lumiere': c.sta.stun = Math.max(c.sta.stun, (burst ? 2 : 0.4) * dur); break;
          case 'silence': c.sta.sleep = Math.max(c.sta.sleep, (burst ? 6 : 0.5) * dur); break;
          case 'ombre': c.sta.stun = Math.max(c.sta.stun, (burst ? 1.5 : 0.3) * dur); c.curieux = null; c.fuite = null; break;
          case 'vie': c.hp = Math.min(c.hpMax, c.hp + 2 * k); break;
          case 'force': case 'metal': c.vx -= dx * 600 * power * k; c.vy -= dy * 400 * power * k; break;
          case 'froid': c.sta.stun = Math.max(c.sta.stun, (burst ? 3 : 0.5) * dur); c.sta.burn = 0; break;
          case 'foudre': W.hurt(c, 2 * power * k * faible); c.sta.stun = Math.max(c.sta.stun, 2 * dur); break;
          case 'acide': case 'fanaison': W.hurt(c, 1.5 * power * k * faible); break;
          case 'gravite': if (burst) c.onGround = false; break;
          case 'poids': c.vy += (burst ? 500 : 1500 * mode) * power; break;
          case 'temps': case 'ralentir': c.sta.lent = Math.max(c.sta.lent || 0, (burst ? 8 : 0.5) * dur); break;
          case 'esprit': if (burst) W.controlCreature(c, 12 * dur); break;
          case 'lien': if (burst) W.attachLien(c, cx, cy, dur); break;
        }
        continue;
      }
      switch (core) {
        case 'feu':
          if (c.t === 'golem') { if (lgN >= 2) { W.hurt(c, 1.5 * power * k); if (burst) W.part(ccx, ccy, '#5a90e0', 8, 80, 0.5, 2, 0, 'etincelle'); } else if (burst) W.part(ccx, ccy, '#aaa', 4, 40, 0.4); }
          else if (c.t === 'follet') { c.hp = Math.min(c.hpMax + 2, c.hp + 1 * k); c.size = Math.min(1.8, c.size + 0.15 * k); if (burst) W.part(ccx, ccy, C, 8, 90); }
          else { if (!c.sta.wet) { W.hurt(c, 2 * power * k); c.sta.burn = Math.max(c.sta.burn, 3 * dur); } else if (burst) W.part(ccx, ccy, '#ccc', 6, 60); }
          break;
        case 'vent': { const m = c.t === 'golem' ? 0.25 : c.vole ? 2 : 1; c.vx += dx * 520 * power * k * m; c.vy += (dy * 300 - 150) * power * k * m; if (c.t === 'golem' && burst) W.evt('golemPousse'); break; }
        case 'eau':
          c.sta.burn = 0; c.sta.wet = 6;
          if (c.t === 'follet') { W.hurt(c, 2 * power * k, 'eau'); if (burst) W.part(ccx, ccy, '#8fb8d8', 10, 80); }
          if (c.t === 'limace' && burst) { c.size = Math.min(2.2, c.size + 0.25); c.w = 36 * c.size; c.h = 24 * c.size; c.y -= 6; if (c.size >= 2.1) W.msg('La limace est énorme. Elle a l\'air ravie.'); }
          if (c.t === 'golem') c.sta.stun = Math.max(c.sta.stun, 1.5 * k);
          break;
        case 'terre': if (burst) { W.hurt(c, 1 * power); c.vx += dx * 200; c.vy -= 200; } break;
        case 'lumiere': c.sta.stun = Math.max(c.sta.stun, (burst ? 2.5 : 0.4) * dur * power); if (burst) W.part(ccx, ccy - 10, C, 6, 50, 0.5, 2, 0, 'spark'); break;
        case 'ombre': c.sta.stun = Math.max(c.sta.stun, (burst ? 1.5 : 0.3) * dur); c.curieux = null; break;
        case 'vie':
          c.hp = Math.min(c.hpMax, c.hp + 2 * k); c.sta.burn = 0;
          break;
        case 'force': c.vx -= dx * 700 * power * k; c.vy -= dy * 500 * power * k; if (burst) W.hurt(c, 0.5 * power); break;
        case 'froid': c.sta.stun = Math.max(c.sta.stun, (burst ? 3 : 0.5) * dur); c.sta.burn = 0; if (c.t === 'follet') W.hurt(c, 1.5 * power * k, 'eau'); if (burst) W.part(ccx, ccy, C, 8, 50, 0.6, 2, 0, 'spark'); break;
        case 'foudre': W.hurt(c, 2 * power * k); c.sta.stun = Math.max(c.sta.stun, 2 * dur); if (c.t === 'golem' && burst) { c.sta.stun += 2; } if (burst) W.part(ccx, ccy, C, 10, 120, 0.4, 2, 0, 'spark'); break;
        case 'acide': if (c.t !== 'golem') W.hurt(c, 1.5 * power * k); else if (burst) { W.hurt(c, 3 * power); W.part(ccx, ccy, '#8fbf2a', 8, 60); } break;
        case 'gravite': if (burst) c.onGround = false; break;
        case 'temps': case 'ralentir': c.sta.lent = Math.max(c.sta.lent || 0, (burst ? 8 : 0.5) * dur); if (burst) W.part(ccx, ccy, C, 6, 40, 0.6, 2); break;
        case 'son': c.vx += dx * 600 * power * k; c.vy -= 200 * power * k; c.sta.sleep = 0; c.sta.stun = Math.max(c.sta.stun, 0.5); c.curieux = { x: cx, y: cy, t: 6 }; break;
        case 'silence': c.sta.sleep = Math.max(c.sta.sleep, (burst ? 5 : 0.4) * dur); break;
        case 'esprit': if (burst && c.t !== 'familier') { W.controlCreature(c, 12 * dur); } break;
        case 'lien': if (burst) W.attachLien(c, cx, cy, dur); break;
        case 'metal': if (c.t === 'golem') { c.vx -= dx * 500 * power * k; c.vy -= dy * 300 * power * k; } break;
        case 'fanaison': W.hurt(c, 1.2 * power * k); break;
        case 'poids': c.vy += (burst ? 500 : 1500 * mode) * power; c.sta.stun = Math.max(c.sta.stun, 0.8); break;
        case 'secheresse': c.sta.wet = 0; if (c.t === 'limace') { c.size = Math.max(0.6, c.size - 0.2 * k); c.w = 36 * c.size; c.h = 24 * c.size; } break;
        case 'neutraliser': c.sta.burn = 0; c.sta.stun = 0; break;
        case 'rouille': if (c.t === 'golem') W.hurt(c, 1.5 * power * k); break;
      }
    }
    if (lgN) effetLangage(core, lgN, cx, cy, rad, prm, burst, k);
    // --- objets ---
    for (const o of W.st.objs) {
      if (o.mort || !U.circleRect(cx, cy, rad, o)) continue;
      const ocx = o.x + o.w / 2, ocy = o.y + o.h / 2;
      if (burst && o.t !== 'porte' && o.t !== 'pancarte') W.evt('hit', 'objet:' + o.t);
      switch (o.t) {
        case 'levier': if (burst && (core === 'force' || core === 'vent' || core === 'son' || core === 'terre' || core === 'gravite') && W.time - (o.tT || 0) > 0.6) { o.etat = !o.etat; o.tT = W.time; Son.sfx('click'); W.part(ocx, ocy, C, 6, 50); } break;
        case 'brasier': if (core === 'feu' || core === 'foudre' || (core === 'lumiere' && prm.lg && prm.lg.lumiere)) { if (!(o.feu > 0)) Son.sfx('burst', 'feu'); o.feu = 20 * (prm.duration || 1); } else if (core === 'eau' || core === 'froid' || (core === 'vent' && burst) || core === 'secheresse' || core === 'neutraliser') { if (o.feu > 0) W.part(ocx, o.y, '#bbb', 8, 40, 0.8, 4, -60, 'fumee'); o.feu = 0; } break;
        case 'lampe': if (core === 'foudre') { o.charge = 10 * (prm.duration || 1); W.part(ocx, ocy, '#fff2a0', 12, 120, 0.4, 2, 0, 'etincelle'); } break;
        case 'moulin': if (core === 'vent' || core === 'son' || core === 'force') { o.spin = Math.max(o.spin, (burst ? 8 : 2) * (prm.duration || 1)); } break;
        case 'roue': if (core === 'vent' || core === 'force') o.ang += burst ? 1.2 : 0.1; break;
        case 'mannequin': if (burst) { o.hits++; o.wob = 1; W.evt('mannequin'); if (core === 'feu') o.burning = 2; if (core === 'eau' || core === 'froid') o.burning = 0; } break;
        case 'caisse':
          if (core === 'feu') { if (!o.burning) W.part(ocx, ocy, C, 6, 60); o.burning = Math.max(o.burning, 2.5); }
          if (core === 'eau' || core === 'froid') o.burning = 0;
          if (core === 'vent') { const dx = Math.sign(ocx - cx) || 1; o.vx += dx * 420 * power * k; o.vy -= 220 * power * k; }
          if (core === 'force') { o.vx -= (ocx - cx) * 6 * power * k; o.vy -= (ocy - cy) * 4 * power * k + 100 * k; }

          if (core === 'metal' || core === 'son') { const sg = core === 'metal' ? -1 : 1; o.vx += sg * Math.sign(ocx - cx) * 420 * power * k; o.vy -= 150 * power * k; }
          if (core === 'poids') o.vy += (burst ? 400 : 1500 * mode) * power;
          if ((core === 'terre' || core === 'acide') && burst) { o.hp -= power; if (o.hp <= 0) { o.mort = true; W.part(ocx, ocy, '#8a6b2f', 12, 90); } }
          break;
        case 'torche':
          if ((core === 'feu' || core === 'foudre') && !o.lit) { o.lit = true; W.part(o.x + 7, o.y + 4, C, 10, 70); W.evt('torche'); }
          if ((core === 'eau' || core === 'vent' || core === 'froid' || core === 'ombre') && o.lit) { o.lit = false; W.part(o.x + 7, o.y + 4, '#999', 8, 40); }
          break;
        case 'graine':
          if ((core === 'eau' || core === 'vie') && o.stage === 0) { W.growPlant(o); W.evt('graine'); }
          if (core === 'vie' && o.stage === 1) { o.racine = true; o.regrow = 0; }
          break;
        case 'rocher':
          if (burst && power >= 1.5 && (core === 'feu' || core === 'terre' || core === 'force' || core === 'vent' || core === 'foudre' || core === 'acide')) {
            o.mort = true; W.part(ocx, ocy, '#8a6b2f', 16, 120, 0.8, 4, 600);
            W.dropPickup('poussiere', ocx, o.y - 10); W.msg('Le rocher éclate ! Il en tombe une poussière scintillante.');
          } else if (burst && (core === 'feu' || core === 'terre' || core === 'force' || core === 'vent' || core === 'foudre')) { o.fissure = 0.5; if (!o.msgT || W.time - o.msgT > 4) { o.msgT = W.time; W.msg('Le rocher vibre. Il faudrait plus de puissance...'); } }
          if (core === 'metal') { o.vx -= Math.sign(ocx - cx) * 300 * power * k; }
          break;
        case 'rune': if (core === 'lumiere') { o.revele = Math.min(1, o.revele + (burst ? 1 : k * 0.5)); if (burst) W.part(ocx, ocy, C, 10, 60, 0.8, 2, 0, 'spark'); } break;
      }
    }
    // --- champs ---
    if (core === 'eau' || core === 'vent' || core === 'froid') {
      for (const s of W.st.sp) if (s.k === 'field' && s.core === 'feu' && dist(cx, cy, s.x, s.y) < rad + s.r) { s.life = Math.min(s.life, 0.2); W.part(s.x, s.y, '#bbb', 6, 40); }
    }
    // --- joueur ---
    const p = W.st.p;
    if (!opts.noPlayer && U.circleRect(cx, cy, rad, p)) {
      const pcx = p.x + p.w / 2, pcy = p.y + p.h / 2;
      switch (core) {
        case 'feu': if (!p.sta.wet && !p.sta.stone) { p.sta.burning = Math.max(p.sta.burning, 1.5); if (burst && W.time - (p.msgFeu || -9) > 4) { p.msgFeu = W.time; W.msg('Tu t\'es roussi les sourcils.'); } } break;
        case 'vent': { const dx = Math.sign(pcx - cx) || 1; p.vx += dx * 350 * power * k; p.vy -= 250 * power * k; break; }
        case 'eau': p.sta.wet = 8; p.sta.burning = 0; break;
        case 'force': p.vx -= (pcx - cx) * 5 * power * k; p.vy -= (pcy - cy) * 4 * power * k; break;
        case 'vie': p.hp = Math.min(p.hpMax, p.hp + 2 * power * k); break;
        case 'lumiere': p.sta.lumiere = Math.max(p.sta.lumiere, 4 * dur); break;
        case 'foudre': if (!p.sta.vitesse && !p.sta.stone && burst) { p.hp -= 1; p.vy -= 200; W.msg('Tu es secoué(e) par ta propre foudre.', 'warn'); } break;
        case 'acide': if (!p.sta.stone && !p.sta.dissous) { p.hp -= (burst ? 1 : 1.5 * mode) * power; if (burst) W.msg('Ça pique !', 'warn'); } break;

        case 'froid': if (burst && !p.sta.patins) W.msg('Brrr.'); break;
        case 'son': { const dx = Math.sign(pcx - cx) || 1; p.vx += dx * 300 * power * k; p.vy -= 200 * power * k; break; }
        case 'poids': p.vy += (burst ? 400 : 1500 * mode) * power; break;
        case 'lien': if (burst && !opts.self) W.attachLien(null, cx, cy, dur); break;
      }
    }
    // --- décor ---
    if (burst) {
      W.fxBurst(core, cx, cy, rad, lgN);
      Son.sfx('burst', core);
      if (prm.persist > 0 && core !== 'terre' && core !== 'gravite' && core !== 'metal' && core !== 'esprit' && core !== 'lien' && core !== 'portail') W.st.sp.push({ k: 'field', core, x: cx, y: cy, r: rad * 0.8, life: 4 * prm.persist * dur, max: 4 * prm.persist * dur, prm });
      else if (core === 'lumiere' && !opts.noField) W.st.sp.push({ k: 'field', core, x: cx, y: cy, r: rad * 0.8, life: 5 * dur, max: 5 * dur, prm, faible: true });
      if (core === 'gravite' && !opts.noField) {
        const p = W.st.p; let dv = opts.dir;
        if (!dv) { const ddx = cx - (p.x + p.w / 2), ddy = cy - (p.y + p.h / 2); const dd = Math.hypot(ddx, ddy); dv = dd > 20 ? { x: ddx / dd, y: ddy / dd } : { x: 0, y: 1 }; }
        const [gx, gy] = W.snapDir(dv.x, dv.y);
        const mag = prm.gInv ? 0 : 1.2 + 0.9 * Math.max(0, (power - 1) / 0.6);
        W.addGField(cx, cy, rad * 1.3, gx, gy, mag, 6 * dur * (1 + (prm.persist || 0)));
        const lbl = mag === 0 ? 'Apesanteur' : gy === 1 ? (mag > 1.6 ? 'Pesanteur écrasante' : 'Pesanteur') : gy === -1 ? 'Chute vers le ciel' : 'Pesanteur latérale';
        W.st.sp.push({ k: 'label', x: cx, y: cy - rad, txt: lbl, life: 1.4, max: 1.4 });
        W.evt('gravite', lbl);
      }
      if (core === 'terre' || core === 'metal') { W.st.shake = 0.15; }
      if (core === 'portail' && !opts.self) W.placePortail(cx, cy);
    }
  }
  function applySelf(core, prm, aim, spec) {
    const p = W.st.p; const pcx = p.x + p.w / 2, pcy = p.y + p.h / 2;
    const dur = prm.duration || 1, power = prm.power || 1, size = prm.size || 1;
    const C = W.colorOf(core);
    W.st.sp.push({ k: 'ring', core, x: pcx, y: pcy, r: 50 * size, life: 0.5, max: 0.5, color: C });
    Son.sfx('cast', core);
    const around = (opts) => applyEffect(core, pcx, pcy, 60 * size, prm, 'burst', Object.assign({ noPlayer: true, self: true }, opts));
    switch (core) {
      case 'feu': if (p.sta.wet) { p.sta.wet = 0; W.msg('Tu te sèches en un nuage de vapeur.'); W.part(pcx, pcy, '#ccc', 10, 50); } else { p.sta.burning = 2; p.hp -= 0.5; W.msg('Tu t\'es mis(e) le feu. Classique.'); } around(); break;
      case 'vent': p.vy = -560 * Math.sqrt(power); p.sta.glide = 1.6 * dur; p.onGround = false; W.part(pcx, p.y + p.h, C, 12, 80); around(); break;
      case 'eau': p.sta.wet = 12 * dur; p.sta.branchies = Math.max(p.sta.branchies, 20 * dur); p.sta.burning = 0; W.msg('Trempé(e), à l\'abri du feu, et tu respires l\'eau un moment.'); around(); break;
      case 'terre': case 'transmutation': p.sta.stone = 12 * dur; W.msg('Ta peau devient pierre.'); break;
      case 'lumiere': p.sta.lumiere = 18 * dur; applyEffect('lumiere', pcx, pcy, 160 * size, prm, 'burst', { noPlayer: true, noField: true }); W.msg('Tu rayonnes comme une lanterne.'); break;
      case 'ombre': p.sta.invisible = 10 * dur; W.msg('Tu te fonds dans l\'encre. Les créatures t\'ignorent.'); break;
      case 'vie': p.hp = Math.min(p.hpMax, p.hp + 4 * power); p.sta.burning = 0; around(); break;
      case 'force': { let dx = aim.x - pcx, dy = aim.y - pcy; const d = Math.hypot(dx, dy) || 1; dx /= d; dy /= d; p.vx = dx * 650 * Math.sqrt(power); p.vy = dy * 500 * Math.sqrt(power) - 100; p.sta.glide = 0.6; p.inv = Math.max(p.inv, 0.5); break; }
      case 'froid': p.sta.patins = 12 * dur; p.sta.burning = 0; W.msg('Des patins de givre : tu marches sur l\'eau.'); around(); break;
      case 'foudre': p.sta.vitesse = 10 * dur; W.msg('Tes jambes crépitent !'); around({ noGrid: true }); break;
      case 'acide': p.sta.dissous = 8 * dur; W.msg('Tu dissous ce que tu touches. Attention où tu poses les mains.'); break;
      case 'gravite': {
        const heavy = power >= 1.5, T = 10 * dur;
        if (prm.gInv) { W.setPG(0, -1, heavy ? 2.2 : 1, T); W.msg('Ta pesanteur s\'inverse : tu tombes vers le ciel. Le plafond devient ton sol.'); W.evt('gravite', 'plafond'); break; }
        let dx = aim.x - pcx, dy = aim.y - pcy; const d = Math.hypot(dx, dy) || 1; dx /= d; dy /= d;
        const h = Sim.raycast(pcx, pcy, dx, dy, 280 * (prm.range || 1));
        if (h) {
          const [gx, gy] = W.snapDir(dx, dy);
          if (gx === 0 && gy === 1 && heavy) { W.setPG(0, 1, 2.8, T, { enclume: true }); W.msg('Tu deviens lourd(e) comme une enclume.'); W.evt('gravite', 'enclume'); }
          else { W.setPG(gx, gy, heavy ? 2.2 : 1, T); W.msg(gy === 1 ? 'Ta pesanteur se raffermit.' : gy === -1 ? 'Tu tombes vers le plafond visé.' : 'Ta pesanteur pointe vers le mur : marche dessus (↑ ↓ pour avancer).'); W.evt('gravite', 'mur'); }
        } else if (heavy) { W.setPG(0, 1, 2.8, T, { enclume: true }); W.msg('Tu deviens lourd(e) comme une enclume.'); W.evt('gravite', 'enclume'); }
        else { p.pg = null; p.sta.vol = Math.max(p.sta.vol, 8 * dur); p.onGround = false; W.msg('Tu vises le vide : ta pesanteur s\'annule. Vol libre (flèches ou ZQSD) ; ça consomme de l\'encre.'); W.evt('vol'); }
        break;
      }
      case 'temps': p.sta.hate = 10 * dur; W.msg('Tu vas plus vite que le monde : tes pas et ton encre s\'accélèrent.'); break;
      case 'ralentir': p.sta.lent = 6 * dur; W.msg('Tes jambes pèsent une tonne. Bien joué.'); break;
      case 'son': around({ noGrid: false }); W.st.shake = 0.3; W.msg('Un cri à réveiller les golems.'); break;
      case 'silence': around(); break;
      case 'esprit': { let best = null, bd = 220; for (const c of W.st.crs) if (c.hp > 0 && c.t !== 'familier') { const d = dist(pcx, pcy, c.x, c.y); if (d < bd) { bd = d; best = c; } } if (best) W.controlCreature(best, 12 * dur); else W.msg('Aucun esprit à portée.'); break; }
      case 'lien': { const h = Sim.raycast(pcx, pcy, (aim.x - pcx) / (dist(pcx, pcy, aim.x, aim.y) || 1), (aim.y - pcy) / (dist(pcx, pcy, aim.x, aim.y) || 1), 320 * (prm.range || 1)); if (h) W.attachLien(null, h.x, h.y, dur); else W.msg('La corde ne trouve rien à saisir.'); break; }
      case 'portail': { const q = W.st.portails[W.st.portails.length - 1]; if (q) { p.x = q.x - p.w / 2; p.y = q.y - p.h / 2; p.vx = 0; p.vy = 0; W.part(q.x, q.y, C, 14, 80); W.msg('Tu traverses jusqu\'à ton dernier portail.'); } else W.msg('Aucun portail n\'est ouvert.'); break; }
      case 'marque': W.placeMarque(pcx, pcy, 0); W.st.marques[W.st.marques.length - 1] = { x: pcx, y: pcy, t: 0 }; W.msg('Une marque luit à tes pieds.'); break;
      case 'contre': dissiper(pcx, pcy, 60 * size); break;
      case 'metamorphose': morphSoi(spec || { cores: [core], prm }); break;
      case 'saut': { let dx = aim.x - pcx, dy = aim.y - pcy; const d = Math.hypot(dx, dy) || 1; dx /= d; dy /= d; let L3 = Math.min(d, 320 * (prm.range || 1)); while (L3 > 10 && Sim.rectBlocked({ x: pcx + dx * L3 - p.w / 2, y: pcy + dy * L3 - p.h / 2, w: p.w, h: p.h })) L3 -= 6; W.part(pcx, pcy, '#4fb0a0', 14, 80, 0.5, 3, 0, 'glow'); p.x = pcx + dx * L3 - p.w / 2; p.y = pcy + dy * L3 - p.h / 2; p.vx = p.vy = 0; W.unstick(p); W.part(p.x + p.w / 2, p.y + p.h / 2, '#4fb0a0', 14, 80, 0.5, 3, 0, 'glow'); W.msg('L\'espace se plie : tu y es.'); break; }
      case 'peur': around(); W.msg('Une vague de peur part de toi.'); break;
      case 'repulsion': around(); break;
      case 'fumee': around(); p.sta.invisible = Math.max(p.sta.invisible || 0, 6 * dur); W.msg('Tu disparais dans la fumée.'); break;
      case 'explosion': p.vy = -720 * Math.sqrt(power); p.onGround = false; if (!(p.sta.stone > 0) && !(p.sta.armure > 0)) p.hp -= 1; around(); W.msg('Un bond à la poudre !'); break;
      case 'courant': { let dx = aim.x - pcx, dy = aim.y - pcy; const d = Math.hypot(dx, dy) || 1; const f = p.liq ? 1.5 : 1; p.vx = dx / d * 650 * f; p.vy = dy / d * 500 * f - 80; p.sta.wet = 8; W.part(pcx, pcy, '#5f9ad8', 14, 120, 0.6, 2.4, 300, 'goutte'); break; }
      case 'seisme': around(); W.st.shake = 0.6; break;
      case 'figer': poserBulle('fige', pcx, pcy, 110 * size, prm); W.msg('Le temps s\'arrête autour de toi.'); break;
      case 'rembobinage': rembobinerSoi(prm); break;
      case 'metal': p.sta.armure = 20 * dur; W.msg('Une armure de métal : rien ne te bouscule, la foudre glisse.'); break;
      case 'creuser': Sim.forRadius(pcx, p.y + p.h + 10, 40 * size, (x, y, i, m) => { if (P[m].solid && m !== M.OBSIDIENNE) Sim.set(x, y, M.AIR); }); W.msg('Le sol se dérobe sous tes pieds.'); break;
      case 'fanaison': p.hp -= 1; W.msg('Tu te sens flétrir. Mauvaise idée.', 'warn'); break;
      case 'neutraliser': p.sta.burning = 0; p.sta.dissous = 0; p.sta.lent = 0; W.msg('Tout redevient calme.'); break;
      case 'poids': p.vy += 600; p.sta.lent = 4 * dur; W.msg('Tu pèses une enclume.'); break;
      case 'secheresse': p.sta.wet = 0; around(); break;
      case 'rouille': p.sta.armure = 0; around(); break;
    }
  }
  function dissiper(x, y, rad) {
    const R = rad * 1.5; let n = 0; const p = W.st.p; const pin = dist(x, y, p.x + p.w / 2, p.y + p.h / 2) < R;
    for (const q of W.st.sp) if (q.k === 'prise' && !q.mort && dist(x, y, q.x, q.y) < R + 60) { q.tenue = false; W.ecraserPrise(q); n++; }
    const KINDS = ['field', 'trap', 'totem', 'timer', 'attente', 'repeat', 'expire', 'rain', 'orbit', 'canal', 'bouclier', 'beamtimer', 'echo', 'singularite', 'bulle', 'tornade', 'vague', 'colonne'];
    for (const q of W.st.sp) { if (!KINDS.includes(q.k)) continue; const attached = q.follow || q.k === 'bouclier' || q.k === 'orbit' || q.k === 'canal' || q.self; if ((attached && pin) || (q.x != null && dist(x, y, q.x, q.y) < R)) { q.mort = true; if (q.k === 'bouclier') W.finBouclier(q); n++; } }
    const avant = W.st.gz.length; W.st.gz = W.st.gz.filter((z) => dist(x, y, z.x, z.y) >= R + z.r * 0.5); n += avant - W.st.gz.length;
    const ap = W.st.portails.length; W.st.portails = W.st.portails.filter((q) => dist(x, y, q.x, q.y) >= R); if (W.st.portails.length !== ap) { n++; if (W.st.portails.length < 2) W.st.portails = []; }
    const am = W.st.marques.length; W.st.marques = W.st.marques.filter((mq) => { const q = W.posMarque(mq); return q && dist(x, y, q.x, q.y) >= R; }); n += am - W.st.marques.length;
    for (const c of W.st.crs) if (c.hp > 0 && dist(x, y, c.x + c.w / 2, c.y + c.h / 2) < R) { if (c.ench) { c.ench = null; n++; } if (c.controlled) { W.releaseControl(); n++; } }
    for (const o of W.st.objs) if (o.ench && dist(x, y, o.x + o.w / 2, o.y + o.h / 2) < R) { o.ench = null; n++; }
    if (pin) { if (p.pg) { p.pg = null; n++; } if (p.sta.vol > 0) { p.sta.vol = 0; n++; } if (p.trap) { p.trap = null; n++; } }
    Sim.forRadius(x, y, R, (cx, cy, i, m) => { if (Sim.elec[i] > 0) { Sim.elec[i] = 0; Sim.touch(i); } });
    n += W.PH.dissiper(x, y, R);
    W.st.sp.push({ k: 'ring', core: 'contre', x, y, r: R, life: 0.6, max: 0.6, color: '#a8a29a' });
    W.msg(n ? 'La magie se dissipe (' + n + ').' : 'Rien à dissiper ici.');
  }
  return { applyEffect, applyEffet0, gridEffect, gridEffectOn, effetDerive, applySelf, effetLangage, tornade, arcsTension, champForme, matiereDe, occupe, poserMatiere, matiereCercle, matiereRect, matiereLigne, murPoints, vieillir, metamorphoser, finMorph, morphSoi, finFormeSoi, formeDe, memoriser, passe, rembobiner, rembobinerSoi, dissiper, poserBulle };
}
