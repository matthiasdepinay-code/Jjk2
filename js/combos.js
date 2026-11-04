'use strict';
// ---------- Phénomènes : ce que deux essences font naître ensemble ----------
// Un phénomène dure, a sa propre physique et épouse la forme du sceau :
// point (zone, projectile, totem...), rectangle (mur, colonne), ligne (trait), ou attaché (sur soi, aura, objet, invocation).
function creerPhenomenes(W) {
  const Sim = W.Sim, M = Sim.M, P = Sim.P, CS = Sim.CS, TAU = Math.PI * 2;
  const rnd = Math.random, clamp = (v, a, b) => (v < a ? a : v > b ? b : v), dist = (a, b, c, d) => Math.hypot(c - a, d - b);
  let liste = [], dtC = 1 / 60;
  const st = () => W.st;

  // ---------- géométrie ----------
  function lier(ph, q) { (ph.liens = ph.liens || []).push(q); return q; }
  function deplacer(ph, dx, dy) {
    ph.x += dx; ph.y += dy;
    if (ph.liens) for (const q of ph.liens) { q.x += dx; q.y += dy; if (q.rect) { q.rect.x0 += dx; q.rect.x1 += dx; q.rect.y0 += dy; q.rect.y1 += dy; } }
    if (ph.rect) { ph.rect.x0 += dx; ph.rect.x1 += dx; ph.rect.y0 += dy; ph.rect.y1 += dy; }
    if (ph.ligne) { ph.ligne.x1 += dx; ph.ligne.x2 += dx; ph.ligne.y1 += dy; ph.ligne.y2 += dy; }
  }
  function dSeg(px, py, L) { const vx = L.x2 - L.x1, vy = L.y2 - L.y1, l2 = vx * vx + vy * vy || 1; const t = clamp(((px - L.x1) * vx + (py - L.y1) * vy) / l2, 0, 1); return Math.hypot(px - (L.x1 + vx * t), py - (L.y1 + vy * t)); }
  function contient(ph, px, py, marge = 0, k = 1) {
    if (ph.rect) { const R = ph.rect, cx = (R.x0 + R.x1) / 2, cy = (R.y0 + R.y1) / 2, hw = (R.x1 - R.x0) / 2 * k + marge, hh = (R.y1 - R.y0) / 2 * k + marge; return Math.abs(px - cx) <= hw && Math.abs(py - cy) <= hh; }
    if (ph.ligne) return dSeg(px, py, ph.ligne) <= ph.ligne.w * k + marge;
    return dist(px, py, ph.x, ph.y) <= ph.r * k + marge;
  }
  function touche(ph, e, marge = 0, k = 1) { return contient(ph, e.x + e.w / 2, e.y + e.h / 2, marge + Math.max(e.w, e.h) * 0.4, k); }
  function cells(ph, fn, k = 1) {
    if (ph.rect) { const R = ph.rect, cx = (R.x0 + R.x1) / 2, cy = (R.y0 + R.y1) / 2, hw = (R.x1 - R.x0) / 2 * k, hh = (R.y1 - R.y0) / 2 * k; const x0 = Math.max(0, Math.floor((cx - hw) / CS)), x1 = Math.min(Sim.W - 1, Math.floor((cx + hw) / CS)), y0 = Math.max(0, Math.floor((cy - hh) / CS)), y1 = Math.min(Sim.H - 1, Math.floor((cy + hh) / CS)); for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) { const i = y * Sim.W + x; fn(x, y, i, Sim.mat[i]); } return; }
    if (ph.ligne) { const L = ph.ligne, w = L.w * k; const x0 = Math.max(0, Math.floor((Math.min(L.x1, L.x2) - w) / CS)), x1 = Math.min(Sim.W - 1, Math.floor((Math.max(L.x1, L.x2) + w) / CS)), y0 = Math.max(0, Math.floor((Math.min(L.y1, L.y2) - w) / CS)), y1 = Math.min(Sim.H - 1, Math.floor((Math.max(L.y1, L.y2) + w) / CS)); for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) if (dSeg((x + 0.5) * CS, (y + 0.5) * CS, L) <= w) { const i = y * Sim.W + x; fn(x, y, i, Sim.mat[i]); } return; }
    Sim.forRadius(ph.x, ph.y, ph.r * k, fn);
  }
  // un point au hasard dans la forme
  function auHasard(ph, k = 1) {
    if (ph.rect) { const R = ph.rect, cx = (R.x0 + R.x1) / 2, cy = (R.y0 + R.y1) / 2; return { x: cx + (rnd() - 0.5) * (R.x1 - R.x0) * k, y: cy + (rnd() - 0.5) * (R.y1 - R.y0) * k }; }
    if (ph.ligne) { const L = ph.ligne, t = rnd(); return { x: L.x1 + (L.x2 - L.x1) * t + (rnd() - 0.5) * L.w, y: L.y1 + (L.y2 - L.y1) * t + (rnd() - 0.5) * L.w }; }
    const a = rnd() * TAU, d = Math.sqrt(rnd()) * ph.r * k; return { x: ph.x + Math.cos(a) * d, y: ph.y + Math.sin(a) * d };
  }
  const creatures = (ph, marge = 0, k = 1) => st().crs.filter((c) => c.hp > 0 && c.t !== 'familier' && !c.glaise && touche(ph, c, marge, k));
  const hostiles = (ph, marge = 0, k = 1) => creatures(ph, marge, k).filter((c) => !c.sta.tame);
  const objets = (ph, marge = 0, k = 1) => st().objs.filter((o) => o.dyn && !o.mort && !o.carried && touche(ph, o, marge, k));
  const joueurDans = (ph, marge = 0, k = 1) => touche(ph, st().p, marge, k);
  function ev(ph, cle, periode) { ph.acc[cle] = (ph.acc[cle] || 0) + dtC; if (ph.acc[cle] >= periode) { ph.acc[cle] -= periode; return true; } return false; }
  const pr = (ph, k = 1) => ({ power: ph.pw * k, size: ph.sz, duration: 1, persist: 0, range: 1, speed: 1, lg: {}, asp: {} });
  function effet(ph, core, x, y, r, k = 1, mode = 'burst', o = {}) { W.applyEffect(core, x, y, r, pr(ph, k), mode, Object.assign({ noPlayer: true, noField: true, noGrid: false, phen: true }, o)); }
  const fade = (ph) => clamp(Math.min(ph.t / 0.3, ph.life / Math.min(1, ph.max * 0.25)), 0, 1);
  // le sol sous un point ; si le point est dans la roche, on remonte jusqu'à la surface
  const sol = (x, y) => { if (Sim.solidAt(x, y)) { let yy = y; for (let k = 0; k < 60 && Sim.solidAt(x, yy - CS); k++) yy -= CS; return yy - (yy % CS); } const g = W.groundBelow(x, y); return g == null ? y : g; };
  const air = (m) => m === M.AIR || P[m].gas;
  function zap(x1, y1, x2, y2, couleur) { st().eclairs.push({ x: x2, y1: y2, pts: FX.eclairPts(x1, y1, x2, y2, 0.2), branches: [], life: 0.22, couleur }); }
  function attirer(ph, R, force, dt, cx = ph.x, cy = ph.y, joueur = 0.35) {
    const tire = (e, f) => { const ex = e.x + e.w / 2, ey = e.y + e.h / 2, d = Math.hypot(cx - ex, cy - ey) || 1; if (d > R) return; const k = force * (1 - d / R) * dt / W.masse(e) * f; e.vx += (cx - ex) / d * k; e.vy += (cy - ey) / d * k; };
    for (const c of st().crs) if (c.hp > 0 && c.t !== 'familier') tire(c, 1);
    for (const o of st().objs) if (o.dyn && !o.mort && !o.carried) tire(o, 1);
    if (joueur) tire(st().p, joueur);
  }
  function repousser(ph, R, force, cx = ph.x, cy = ph.y, joueur = 0.5) {
    const pousse = (e, f) => { const ex = e.x + e.w / 2, ey = e.y + e.h / 2, d = Math.hypot(ex - cx, ey - cy) || 1; if (d > R) return; const k = force * (1 - d / R) / W.masse(e) * f; e.vx += (ex - cx) / d * k; e.vy += (ey - cy) / d * k - k * 0.3; };
    for (const c of st().crs) if (c.hp > 0 && c.t !== 'familier') pousse(c, 1);
    for (const o of st().objs) if (o.dyn && !o.mort && !o.carried) pousse(o, 1);
    if (joueur) pousse(st().p, joueur);
  }
  function blesser(c, d) { if (c && c.hp > 0) W.hurt(c, d); }
  let phCourant = null;
  function blesserJoueur(d, txt) { if (phCourant && phCourant.follow && phCourant.follow.t === 'familier') return; const p = st().p; if (p.sta.stone > 0 || p.sta.garde > 0) return; p.hp -= d; if (txt && W.time() - (p.phenT || -9) > 2) { p.phenT = W.time(); W.msg(txt, 'warn'); } }
  function nuage(ctx, x, y, r, couleur, a, t) { ctx.save(); ctx.fillStyle = couleur; for (let k = 0; k < 7; k++) { const ox = Math.cos(k * 1.7 + t * 0.3) * r * 0.7, oy = Math.sin(k * 2.3) * r * 0.22; ctx.globalAlpha = a * (0.6 + 0.4 * Math.sin(k + t)); ctx.beginPath(); ctx.arc(x + ox, y + oy, r * (0.38 + 0.12 * Math.sin(k * 3.1)), 0, TAU); ctx.fill(); } ctx.restore(); }
  // plateformes solides (arc-en-ciel, air solide, miroir) : des objets invisibles que le monde traite comme solides
  function plateforme(ph, x, y, w, h) { const o = { t: 'magie', x, y, w, h, solid: true, ph }; st().objs.push(o); (ph.objs = ph.objs || []).push(o); return o; }
  function retirerPlateformes(ph) { if (ph.objs) for (const o of ph.objs) o.mort = true; ph.objs = null; }
  // pousser un arbre : tronc et feuillage, en cases
  function arbre(cx, gy, h, rx, ry, q) {
    const out = q || [];
    for (let k = 0; k < h; k++) { out.push([cx, gy - 1 - k, M.BOIS]); if (k < 2) { out.push([cx - 1, gy - 1 - k, M.BOIS]); } }
    for (let yy = -ry; yy <= ry; yy++) for (let xx = -rx; xx <= rx; xx++) if ((xx * xx) / (rx * rx) + (yy * yy) / (ry * ry) <= 1 && rnd() < 0.88) out.push([cx + xx, gy - h - ry + 1 + yy, M.PLANTE]);
    return out;
  }
  function pousserFile(ph, n) { const q = ph.data.q; if (!q) return; for (let k = 0; k < n && q.length; k++) { const [x, y, m] = q.shift(); const g = Sim.get(x, y); if (air(g) || (m === M.PLANTE && g === M.HERBE) || (ph.data.remplace && P[g].powder)) Sim.set(x, y, m); } }

  // ---------- les phénomènes ----------
  const DEFS = {};
  const def = (k, d) => { DEFS[k] = Object.assign({ r: 50, life: 6, couleur: '#c08a3a', bouge: 'fixe' }, d); };
  // nuages : au-dessus du point visé, ils dérivent
  const enCiel = (h) => (ph) => { if (ph.g === 'point' && !ph.follow) { const g = sol(ph.x, ph.y - 20); ph.y = Math.max(40, Math.min(ph.y, g) - h); } if (!ph.vx) ph.vx = (ph.dir.x >= 0 ? 1 : -1) * (ph.D.vitesse || 35); };
  const auSol = (ph) => { if (ph.g === 'point' && !ph.follow) ph.y = sol(ph.x, ph.y - 20); };
  function nuee(ph, mat, taux, largeur = 1.3) { const R = ph.rect ? (ph.rect.x1 - ph.rect.x0) / 2 : ph.r * largeur; const y = ph.rect ? ph.rect.y1 : ph.y + ph.r * 0.25; for (let k = 0; k < taux; k++) { const x = ph.x + (rnd() * 2 - 1) * R; const cx = Math.floor(x / CS), cy = Math.floor(y / CS); if (Sim.get(cx, cy) === M.AIR) Sim.set(cx, cy, mat); } }

  // FEU + GRAVITÉ : le petit soleil
  def('feu|gravite', { r: 20, explose: true, life: 10, lum: 460, couleur: '#f0a040', bouge: 'flotte', eteint: 0.6, nourrit: true,
    init(ph) { if (ph.g === 'point' && !ph.follow) { const g = sol(ph.x, ph.y - 10); if (g - ph.y < 50) ph.y = g - 60; } ph.R = (ph.rect ? Math.max(ph.rect.x1 - ph.rect.x0, ph.rect.y1 - ph.rect.y0) * 0.6 : ph.r * 6.5); },
    tick(ph, dt) {
      const R = ph.R * (0.6 + 0.4 * fade(ph));
      if (ev(ph, 'h', 0.12)) { Sim.chauffer(ph.x, ph.y, R, 150 + 18 * ph.pw, 0.22); Sim.chauffer(ph.x, ph.y, ph.r * 1.5, 250, 0.7); }
      if (ev(ph, 'g', 0.06)) effet(ph, 'force', ph.x, ph.y, R * 0.75, 0.45, 0.06);
      attirer(ph, R, 1500 * ph.pw, dt, ph.x, ph.y, 0.25);
      if (ev(ph, 'n', 0.2)) { let n = 0; Sim.forRadius(ph.x, ph.y, ph.r * 1.4, (x, y, i, m) => { if (m === M.HUILE || m === M.BOIS || m === M.FEU || m === M.POUDRE || m === M.PLANTE || m === M.SEVE) { Sim.set(x, y, M.AIR); n++; } }); if (n) { ph.life = Math.min(ph.max * 1.6, ph.life + n * 0.06); ph.r = Math.min(ph.r0 * 1.6, ph.r + n * 0.05); } }
      for (const c of creatures(ph, 6)) { blesser(c, dt * 2.4 * ph.pw); c.sta.burn = Math.max(c.sta.burn, 1); }
      if (joueurDans(ph, 4)) blesserJoueur(dt * 1.5, 'Le petit soleil te brûle !');
      if (rnd() < 0.6) { const a = rnd() * TAU; W.part(ph.x + Math.cos(a) * ph.r * 1.6, ph.y + Math.sin(a) * ph.r * 1.6, rnd() < 0.5 ? '#f0d070' : '#e0642a', 1, 30, 0.6, 2, -20, 'spark'); }
    },
    fin(ph) { effet(ph, 'explosion', ph.x, ph.y, ph.r * 2.2, 0.8); W.flash(0.1); W.part(ph.x, ph.y, '#fff0b0', 30, 260, 0.8, 3, 0, 'spark'); },
    draw(ctx, ph, t) { const a = fade(ph), r = ph.r * (1 + 0.06 * Math.sin(t * 9)); FX.glow(ctx, ph.x, ph.y, r * 7, '#f0a040', 0.35 * a); FX.glow(ctx, ph.x, ph.y, r * 3, '#fff0b0', 0.6 * a); ctx.save(); ctx.globalAlpha = a; ctx.fillStyle = '#fff6d8'; ctx.beginPath(); ctx.arc(ph.x, ph.y, r, 0, TAU); ctx.fill(); ctx.strokeStyle = '#e0642a'; ctx.lineWidth = 2; for (let k = 0; k < 10; k++) { const an = k / 10 * TAU + t * 0.8, l = r * (1.4 + 0.35 * Math.sin(t * 6 + k * 2)); ctx.beginPath(); ctx.moveTo(ph.x + Math.cos(an) * r * 1.05, ph.y + Math.sin(an) * r * 1.05); ctx.lineTo(ph.x + Math.cos(an) * l, ph.y + Math.sin(an) * l); ctx.stroke(); } ctx.restore(); },
  });
  // EAU + FEU : geyser
  def('eau|feu', { r: 24, sol: true, life: 5, couleur: '#dcdcdc', init(ph) { auSol(ph); ph.H = ph.rect ? ph.rect.y1 - ph.rect.y0 : 220 * ph.sz; if (ph.rect) { ph.x = (ph.rect.x0 + ph.rect.x1) / 2; ph.y = ph.rect.y1; } },
    tick(ph, dt) {
      const w = ph.rect ? (ph.rect.x1 - ph.rect.x0) / 2 : ph.r * 0.6, top = ph.y - ph.H * fade(ph);
      if (ev(ph, 'v', 0.03)) for (let k = 0; k < 3; k++) { const x = ph.x + (rnd() * 2 - 1) * w, y = ph.y - rnd() * (ph.y - top); const cx = Math.floor(x / CS), cy = Math.floor(y / CS); if (Sim.get(cx, cy) === M.AIR) { Sim.set(cx, cy, M.VAPEUR, 50 + (rnd() * 40) | 0); Sim.temp[cy * Sim.W + cx] = 150; } }
      if (ev(ph, 'h', 0.15)) Sim.chauffer(ph.x, (ph.y + top) / 2, w * 1.4, 140, 0.25);
      const col = { x: ph.x - w, y: top, w: w * 2, h: ph.y - top };
      const leve = (e, k) => { const h = clamp((e.y + e.h - top) / (ph.y - top + 1), 0, 1); e.vy = Math.max(e.vy - 3400 * dt * k, -460 * k * (0.35 + 0.65 * h)); };
      for (const c of st().crs) if (c.hp > 0 && U.rectsOverlap(col, c)) { leve(c, Math.sqrt(ph.pw) / Math.sqrt(W.masse(c))); if (!W.chaudOk(c)) blesser(c, dt * 1.2); }
      for (const o of st().objs) if (o.dyn && !o.mort && U.rectsOverlap(col, o)) leve(o, 1 / Math.sqrt(W.masse(o)));
      const p = st().p; if (U.rectsOverlap(col, p)) { leve(p, 1.2); p.onGround = false; }
      if (rnd() < 0.7) W.part(ph.x + (rnd() - 0.5) * w * 2, ph.y - rnd() * (ph.y - top), '#f2f2f2', 1, 40, 0.8, 5, -260);
    },
    draw(ctx, ph, t) { const w = ph.rect ? (ph.rect.x1 - ph.rect.x0) / 2 : ph.r * 0.6, top = ph.y - ph.H * fade(ph); ctx.save(); ctx.globalAlpha = 0.35 * fade(ph); ctx.fillStyle = '#ffffff'; for (let y = ph.y; y > top; y -= 16) { const k = (ph.y - y) / (ph.H || 1); ctx.beginPath(); ctx.arc(ph.x + Math.sin(y * 0.05 + t * 6) * 4, y, w * (0.6 + k * 0.7), 0, TAU); ctx.fill(); } ctx.restore(); },
  });
  // FEU + TERRE : magma
  def('feu|terre', { r: 26, sol: true, life: 4, lum: 220, couleur: '#e0622b', init(ph) { auSol(ph); ph.data.n = Math.round(70 * ph.sz * ph.pw); },
    tick(ph, dt) {
      if (ev(ph, 'l', 0.05) && ph.data.n > 0) for (let k = 0; k < 3; k++) { const q = auHasard(ph, ph.rect ? 1 : 0.4); const x = Math.floor(q.x / CS), y0 = Math.floor((ph.rect ? q.y : ph.y) / CS) - 1 - Math.floor(rnd() * 6); if (Sim.get(x, y0) === M.AIR) { Sim.set(x, y0, M.LAVE); ph.data.n--; } }
      if (ev(ph, 's', 0.3)) { W.shake(0.15); W.part(ph.x, ph.y, '#e0622b', 6, 160, 0.7, 3, 700); }
    },
    draw(ctx, ph, t) { FX.glow(ctx, ph.x, ph.y, ph.r * 2.5, '#e0622b', 0.5 * fade(ph)); ctx.save(); ctx.strokeStyle = '#f0a040'; ctx.lineWidth = 2; ctx.globalAlpha = fade(ph); for (let k = -2; k <= 2; k++) { ctx.beginPath(); ctx.moveTo(ph.x + k * 8, ph.y); ctx.lineTo(ph.x + k * 11 + Math.sin(t * 4 + k) * 3, ph.y + 6); ctx.stroke(); } ctx.restore(); },
  });
  // FEU + VENT : tornade de feu
  def('feu|vent', { r: 34, life: 6, lum: 260, couleur: '#e8842a', bouge: 'roule', hSol: 1, vitesse: 80, eteint: 0.4,
    init(ph) { auSol(ph); ph.H = 150 * ph.sz; ph.vx = (ph.dir.x >= 0 ? 1 : -1) * 80; },
    tick(ph, dt) {
      const cible = ph.tenu ? null : hostiles({ x: ph.x, y: ph.y - ph.H / 2, r: 260, g: 'point' }, 0)[0]; if (cible) ph.vx += (Math.sign(cible.x - ph.x) * 110 - ph.vx) * dt;
      const col = { x: ph.x - ph.r, y: ph.y - ph.H, w: ph.r * 2, h: ph.H };
      if (ev(ph, 'f', 0.04)) for (let k = 0; k < 3; k++) { const x = Math.floor((ph.x + (rnd() - 0.5) * ph.r * 1.6) / CS), y = Math.floor((ph.y - rnd() * ph.H) / CS); if (Sim.get(x, y) === M.AIR) Sim.setFeu(x, y, 25, 0); }
      if (ev(ph, 'e', 0.12)) effet(ph, 'feu', ph.x, ph.y - 20, ph.r * 1.2, 0.7, 0.12);
      for (const e of st().crs.concat(st().objs.filter((o) => o.dyn && !o.mort))) { if (!(e.hp > 0) && e.hp !== undefined && !e.dyn) continue; if (!U.rectsOverlap(col, e) || W.masse(e) > 2) continue; e.vy -= 1500 * dt; e.vx += (ph.x - e.x - e.w / 2) * 4 * dt + Math.sin(ph.t * 8) * 400 * dt; if (e.sta && !W.chaudOk(e)) { e.sta.burn = Math.max(e.sta.burn, 1.5); } }
      if (U.rectsOverlap(col, st().p)) { st().p.sta.burning = Math.max(st().p.sta.burning, 1); st().p.vy -= 900 * dt; }
    },
    draw(ctx, ph, t) { ctx.save(); ctx.globalAlpha = 0.75 * fade(ph); for (let k = 0; k < 9; k++) { const y = ph.y - (k / 9) * ph.H, w = ph.r * (0.4 + k / 9), a = t * 9 + k; ctx.strokeStyle = k % 2 ? '#f0a040' : '#e0642a'; ctx.lineWidth = 3; ctx.beginPath(); ctx.ellipse(ph.x + Math.sin(a * 0.7) * 6, y, w, 5, 0, a, a + 4.2); ctx.stroke(); } ctx.restore(); FX.glow(ctx, ph.x, ph.y - ph.H / 2, ph.H * 0.6, '#e0642a', 0.3 * fade(ph)); },
  });
  // FEU + VIE : brûlis
  def('feu|vie', { r: 70, sol: true, life: 7, couleur: '#8aa040', init: auSol,
    tick(ph, dt) {
      if (ph.t < 2.4) { if (ev(ph, 'b', 0.08)) { const rr = ph.t / 2.4; cells(ph, (x, y, i, m) => { if ((m === M.HERBE || m === M.PLANTE || m === M.MOUSSE) && Sim.aux[i] === 0 && rnd() < 0.5) { Sim.aux[i] = 12; Sim.touch(i); } }, rr); } }
      else if (ph.t > 3) { if (ev(ph, 'p', 0.12)) cells(ph, (x, y, i, m) => { const up = Sim.get(x, y - 1); if (m === M.CENDRE && rnd() < 0.4) Sim.set(x, y, M.TERRE); else if (m === M.TERRE && up === M.AIR && rnd() < 0.35) Sim.set(x, y - 1, M.HERBE); else if (m === M.HERBE && up === M.AIR && rnd() < 0.08) Sim.set(x, y - 1, M.PLANTE); }); for (const c of creatures(ph, 10)) c.hp = Math.min(c.hpMax, c.hp + dt * 0.5); }
    },
    draw(ctx, ph, t) { ctx.save(); ctx.globalAlpha = 0.5 * fade(ph); ctx.strokeStyle = ph.t < 2.6 ? '#e0642a' : '#6a9a45'; ctx.lineWidth = 2; ctx.setLineDash([3, 6]); U.inkCircle(ctx, ph.x, ph.y, ph.r * Math.min(1, ph.t / 2.4 + 0.1), 3, 1); ctx.restore(); },
  });
  // FEU + LUMIÈRE : rayon ardent
  def('feu|lumiere', { r: 12, life: 4, lum: 240, couleur: '#fff0b0',
    init(ph) { if (!ph.ligne) { const g = sol(ph.x, ph.y - 10); ph.ligne = { x1: ph.x + 60, y1: Math.max(0, g - 520), x2: ph.x, y2: g + 3, w: 8 * ph.sz }; ph.g = 'ligne'; ph.data.ciel = true; } else { const L = ph.ligne; L.w = 7 * ph.sz; } ph.spot = { x: ph.ligne.x2, y: ph.ligne.y2 }; },
    viser(ph, tx, ty, dt) { const L = ph.ligne, k = Math.min(1, dt * 7); if (ph.data.ciel) { const g = sol(tx, ty - 10); L.x2 += (tx - L.x2) * k; L.y2 += (g + 3 - L.y2) * k; L.x1 = L.x2 + 60; L.y1 = Math.max(0, L.y2 - 520); } else visLigne(ph, tx, ty, k); },
    tick(ph, dt) {
      ph.spot = { x: ph.ligne.x2, y: ph.ligne.y2 }; const S = ph.spot;
      if (ev(ph, 'h', 0.05)) { Sim.chauffer(S.x, S.y, 14 * ph.sz, 252, 0.55); cells(ph, (x, y, i, m) => { if (P[m].flam && Sim.aux[i] === 0 && rnd() < 0.2) { Sim.aux[i] = P[m].burn || 20; Sim.touch(i); } }); }
      for (const c of creatures(ph, 4)) { if (!W.chaudOk(c)) { blesser(c, dt * 3 * ph.pw); c.sta.burn = Math.max(c.sta.burn, 1); } }
      if (joueurDans(ph, 2) && ph.t > 0.3) blesserJoueur(dt * 2, 'Le rayon te brûle !');
      if (rnd() < 0.7) W.part(S.x, S.y, '#fff0b0', 1, 60, 0.4, 2, 200, 'spark');
    },
    draw(ctx, ph, t) { const L = ph.ligne, a = fade(ph) * (0.8 + 0.2 * Math.sin(t * 30)); ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.strokeStyle = '#f6d080'; ctx.globalAlpha = 0.35 * a; ctx.lineWidth = L.w * 2.5; ctx.beginPath(); ctx.moveTo(L.x1, L.y1); ctx.lineTo(L.x2, L.y2); ctx.stroke(); ctx.strokeStyle = '#fffbe8'; ctx.globalAlpha = 0.9 * a; ctx.lineWidth = L.w * 0.6; ctx.stroke(); ctx.restore(); FX.glow(ctx, ph.spot.x, ph.spot.y, 40, '#fff0b0', 0.7 * a); },
  });
  // FEU + FOUDRE : foudre en boule
  def('feu|foudre', { r: 12, explose: true, point: true, life: 8, lum: 170, couleur: '#e8d060', bouge: 'erre', eteint: 0.5,
    tick(ph, dt) {
      if (ev(ph, 'z', 0.45)) { let best = null, bd = 130; for (const c of st().crs) if (c.hp > 0 && !c.sta.tame && c.t !== 'familier') { const d = dist(ph.x, ph.y, c.x + c.w / 2, c.y + c.h / 2); if (d < bd) { bd = d; best = c; } } if (best) { zap(ph.x, ph.y, best.x + best.w / 2, best.y + best.h / 2); blesser(best, 1 * ph.pw); best.sta.stun = Math.max(best.sta.stun, 0.6); W.son('burst', 'foudre'); } }
      const m = Sim.matAt(ph.x, ph.y); if (m === M.EAU || m === M.SAUMURE || m === M.METAL) { effet(ph, 'foudre', ph.x, ph.y, 90, 1.4); ph.life = 0; }
      if (m === M.HUILE || m === M.BOIS || m === M.PLANTE || m === M.HERBE) effet(ph, 'feu', ph.x, ph.y, 16, 0.6, 0.05);
      for (const c of creatures(ph, 2)) { effet(ph, 'foudre', ph.x, ph.y, 30, 1); ph.life = 0; break; }
    },
    fin(ph) { effet(ph, 'explosion', ph.x, ph.y, 36, 0.7); effet(ph, 'foudre', ph.x, ph.y, 50, 1); },
    draw(ctx, ph, t) { FX.glow(ctx, ph.x, ph.y, ph.r * 4, '#e8d060', 0.6 * fade(ph)); ctx.save(); ctx.fillStyle = '#fffbe8'; ctx.globalAlpha = fade(ph); ctx.beginPath(); ctx.arc(ph.x, ph.y, ph.r * (0.8 + 0.2 * Math.sin(t * 25)), 0, TAU); ctx.fill(); ctx.restore(); if (rnd() < 0.5) FX.eclair(ctx, FX.eclairPts(ph.x, ph.y, ph.x + (rnd() - 0.5) * 50, ph.y + (rnd() - 0.5) * 50, 0.3), '#e8d060', 1.2, 0.8); },
  });
  // FEU + TEMPS : feu éternel
  def('feu|temps', { r: 16, sol: true, life: 60, lum: 280, couleur: '#f0a040', init: auSol,
    tick(ph, dt) {
      if (ev(ph, 'h', 0.2)) { Sim.chauffer(ph.x, ph.y - 10, 65 * ph.sz, 122, 0.18); Sim.chauffer(ph.x, ph.y - 8, 12, 160, 0.3); }
      const p = st().p; if (dist(ph.x, ph.y, p.x + p.w / 2, p.y + p.h / 2) < 90) { p.hp = Math.min(p.hpMax, p.hp + dt * 0.25); p.ink = Math.min(p.inkMax, p.ink + dt * 0.8); p.sta.wet = 0; }
      for (const c of creatures(ph, 70)) { c.sta.gele = 0; c.sta.lent = 0; }
    },
    draw(ctx, ph, t) { FX.flamme(ctx, ph.x, ph.y, 34 * ph.sz, 16 * ph.sz, t, 1, fade(ph)); FX.flamme(ctx, ph.x - 6, ph.y, 22 * ph.sz, 10 * ph.sz, t + 1.3, 0, 0.8 * fade(ph)); FX.glow(ctx, ph.x, ph.y - 14, 70, '#f0a040', 0.45 * fade(ph)); ctx.save(); ctx.strokeStyle = '#8a8f9a'; ctx.globalAlpha = 0.5; U.inkCircle(ctx, ph.x, ph.y - 12, 22, 5, 1); ctx.restore(); },
  });
  // FEU + TRANSMUTATION : forge
  def('feu|transmutation', { r: 50, life: 4, lum: 150, couleur: '#c08a3a',
    tick(ph, dt) {
      if (ev(ph, 'c', 0.1)) { const rr = Math.min(1, ph.t / 1.5 + 0.2); cells(ph, (x, y, i, m) => { const r = rnd(); if (m === M.PIERRE && r < 0.08) Sim.set(x, y, M.METAL); else if (m === M.SABLE && r < 0.15) Sim.set(x, y, M.VERRE); else if ((m === M.TERRE || m === M.MEUBLE) && r < 0.1) Sim.set(x, y, M.PIERRE); else if ((m === M.GLACE || m === M.NEIGE) && r < 0.3) Sim.set(x, y, M.EAU); else return; Sim.temp[i] = 200; }, rr); Sim.chauffer(ph.x, ph.y, ph.r, 170, 0.15); }
      if (rnd() < 0.5) { const q = auHasard(ph); W.part(q.x, q.y, '#f0a040', 1, 90, 0.4, 2, 400, 'spark'); }
    },
    draw(ctx, ph, t) { ctx.save(); ctx.strokeStyle = '#c08a3a'; ctx.globalAlpha = 0.6 * fade(ph); ctx.lineWidth = 2; U.inkCircle(ctx, ph.x, ph.y, ph.r, 2, 1); ctx.restore(); FX.glow(ctx, ph.x, ph.y, ph.r * 1.2, '#e0642a', 0.25 * fade(ph)); },
  });
  // EAU + TERRE : marécage
  def('eau|terre', { r: 60, statique: true, life: 12, couleur: '#6b5330',
    init(ph) { auSol(ph); cells(ph, (x, y, i, m) => { const s = Sim.surf ? 0 : 0; if ((m === M.TERRE || m === M.SABLE || m === M.MEUBLE) && y * CS >= ph.y - 6 && y * CS <= ph.y + ph.r * 0.5) Sim.set(x, y, M.BOUE, 250); else if ((m === M.HERBE || m === M.PLANTE) && y * CS >= ph.y - 12) Sim.set(x, y, M.AIR); }); },
    tick(ph, dt) {
      if (ev(ph, 'w', 0.8)) nuee({ x: ph.x, y: ph.y - 20, r: ph.r * 0.6, g: 'point' }, M.EAU, 3, 1);
      for (const c of creatures(ph, 0)) { if (Sim.matAt(c.x + c.w / 2, c.y + c.h - 2) === M.BOUE) c.sta.lent = Math.max(c.sta.lent || 0, 0.5); }
      if (rnd() < 0.3) { const q = auHasard(ph, 0.8); W.part(q.x, ph.y - 2, '#8a7050', 1, 10, 0.8, 3, -20); }
    },
  });
  // EAU + VENT : nuée de pluie
  def('eau|vent', { r: 50, life: 10, couleur: '#8aa0b8', bouge: 'derive', vitesse: 40, init: enCiel(150),
    tick(ph, dt) { if (ev(ph, 'p', 0.04)) nuee(ph, M.EAU, 2); if (ev(ph, 'f', 0.2)) { const g = sol(ph.x, ph.y + 10); Sim.chauffer(ph.x, (ph.y + g) / 2, ph.r * 1.2, 55, 0.2); for (const c of st().crs) if (c.hp > 0 && Math.abs(c.x + c.w / 2 - ph.x) < ph.r * 1.3 && c.y > ph.y) { c.sta.wet = 6; c.sta.burn = 0; if (c.t === 'follet') blesser(c, 0.5); } } },
    draw(ctx, ph, t) { nuage(ctx, ph.x, ph.y, ph.r, '#7a8ea6', 0.55 * fade(ph), t); },
  });
  // EAU + VIE : source vive
  def('eau|vie', { r: 30, sol: true, life: 15, lum: 90, couleur: '#6ab8a0', init(ph) { auSol(ph); ph.data.n = Math.round(80 * ph.sz); },
    tick(ph, dt) {
      if (ev(ph, 'e', 0.25) && ph.data.n > 0) { W.spawnLiquid(M.EAU, ph.x, ph.y - 4, 2, 30); ph.data.n -= 2; }
      const p = st().p; if (dist(ph.x, ph.y, p.x + p.w / 2, p.y + p.h / 2) < ph.r * 2.5) { p.hp = Math.min(p.hpMax, p.hp + dt * 0.6); p.sta.burning = 0; }
      for (const c of creatures(ph, ph.r * 1.5)) { c.hp = Math.min(c.hpMax, c.hp + dt * 0.5); c.sta.burn = 0; }
      if (ev(ph, 'v', 1.2)) effet(ph, 'vie', ph.x, ph.y - 10, ph.r * 2.2, 0.6, 1.2);
      if (rnd() < 0.4) W.part(ph.x + (rnd() - 0.5) * ph.r * 2, ph.y - 4, '#9ad8c0', 1, 20, 0.8, 2, -40, 'spark');
    },
  });
  // EAU + LUMIÈRE : arc-en-ciel praticable
  def('eau|lumiere', { r: 20, statique: true, life: 12, lum: 120, couleur: '#c8a0e0',
    init(ph) {
      const p = st().p; let L = ph.ligne;
      if (!L) { const px = p.x + p.w / 2, py = p.y + p.h; L = { x1: px + Math.sign(ph.x - px || 1) * 12, y1: py - 2, x2: ph.x, y2: ph.y, w: 8 }; }
      const lx = L.x2 - L.x1, ly = L.y2 - L.y1, len = Math.hypot(lx, ly) || 1, bosse = Math.min(180, len * 0.28);
      ph.arc = []; const n = Math.max(4, Math.round(len / 14));
      for (let k = 0; k <= n; k++) { const t = k / n; const x = L.x1 + lx * t, y = L.y1 + ly * t - Math.sin(t * Math.PI) * bosse; ph.arc.push([x, y]); }
      for (let k = 0; k < ph.arc.length - 1; k++) { const [x, y] = ph.arc[k], [x2, y2] = ph.arc[k + 1]; plateforme(ph, Math.min(x, x2) - 2, Math.min(y, y2), Math.abs(x2 - x) + 4, Math.max(6, Math.abs(y2 - y))); }
      ph.ligne = { x1: L.x1, y1: L.y1, x2: L.x2, y2: L.y2, w: bosse + 10 }; ph.g = 'ligne'; ph.x = (L.x1 + L.x2) / 2; ph.y = (L.y1 + L.y2) / 2 - bosse;
    },
    fin: retirerPlateformes,
    draw(ctx, ph, t) { if (!ph.arc) return; const cols = ['#d9622b', '#e0b050', '#e8d060', '#6a9a45', '#3b6fb6', '#7a5ab8']; ctx.save(); ctx.lineCap = 'round'; cols.forEach((c, k) => { ctx.strokeStyle = c; ctx.globalAlpha = 0.6 * fade(ph); ctx.lineWidth = 2.2; ctx.beginPath(); ph.arc.forEach(([x, y], i) => (i ? ctx.lineTo(x, y + k * 2 - 2) : ctx.moveTo(x, y + k * 2 - 2))); ctx.stroke(); }); ctx.restore(); },
  });
  // EAU + FOUDRE : orage
  def('eau|foudre', { r: 55, life: 10, couleur: '#5a6478', bouge: 'derive', vitesse: 25, init: enCiel(170),
    tick(ph, dt) {
      if (ev(ph, 'p', 0.08)) nuee(ph, M.EAU, 1);
      if (ev(ph, 'z', 0.9)) { let best = null, bd = ph.r * 2.6; for (const c of st().crs) if (c.hp > 0 && !c.sta.tame && c.t !== 'familier' && c.y > ph.y) { const d = Math.abs(c.x + c.w / 2 - ph.x); if (d < bd) { bd = d; best = c; } } const x = best ? best.x + best.w / 2 : ph.x + (rnd() - 0.5) * ph.r * 2; const g = best ? best.y + best.h / 2 : sol(x, ph.y + 20); zap(x + (rnd() - 0.5) * 20, ph.y + 10, x, g); effet(ph, 'foudre', x, g, 42, 1.2); if (best) { blesser(best, 1.5 * ph.pw); best.sta.stun = Math.max(best.sta.stun, 1); } W.flash(0.06); W.son('burst', 'foudre'); }
    },
    draw(ctx, ph, t) { nuage(ctx, ph.x, ph.y, ph.r, '#3c4252', 0.65 * fade(ph), t); },
  });
  // EAU + GRAVITÉ : sphère d'eau
  def('eau|gravite', { r: 38, point: true, life: 10, couleur: '#3b6fb6', bouge: 'flotte', init(ph) { ph.data.eau = Math.round(30 * ph.sz); if (ph.g === 'point' && !ph.follow) { const g = sol(ph.x, ph.y - 10); if (g - ph.y < ph.r) ph.y = g - ph.r - 6; } },
    tick(ph, dt) {
      if (ev(ph, 'a', 0.08) && ph.data.eau < 400) Sim.forRadius(ph.x, ph.y, ph.r * 1.5, (x, y, i, m) => { if (P[m].liquid && m !== M.LAVE && ph.data.eau < 400) { Sim.set(x, y, M.AIR); ph.data.eau++; } else if (m === M.FEU) Sim.set(x, y, M.VAPEUR, 30); });
      for (const c of creatures(ph, 0)) { c.vx *= 1 - 3 * dt; c.vy = c.vy * (1 - 3 * dt) - 1500 * dt; c.x += (ph.x - c.x - c.w / 2) * 2 * dt; c.y += (ph.y - c.y - c.h / 2) * 2 * dt; c.sta.burn = 0; c.sta.wet = 6; if (c.t !== 'poisson' && c.t !== 'grenouille') blesser(c, dt * 0.35); }
      for (const o of objets(ph, 0)) { o.vy = o.vy * (1 - 3 * dt) - 1500 * dt; o.vx *= 1 - 3 * dt; o.burning = 0; }
      const p = st().p; if (joueurDans(ph, 0)) { p.vy = p.vy * (1 - 4 * dt) - 1450 * dt; p.sta.burning = 0; p.sta.wet = 8; }
      ph.r = ph.r0 * (0.8 + 0.4 * Math.min(1, ph.data.eau / 200));
    },
    fin(ph) { W.spawnLiquid(M.EAU, ph.x, ph.y, ph.data.eau, 90); W.part(ph.x, ph.y, '#3f7ab8', 20, 160, 0.7, 3, 600, 'goutte'); },
    draw(ctx, ph, t) { const a = fade(ph); ctx.save(); ctx.globalAlpha = 0.35 * a; ctx.fillStyle = '#3f7ab8'; ctx.beginPath(); for (let k = 0; k <= 24; k++) { const an = k / 24 * TAU, rr = ph.r * (1 + 0.05 * Math.sin(an * 3 + t * 4)); const x = ph.x + Math.cos(an) * rr, y = ph.y + Math.sin(an) * rr; k ? ctx.lineTo(x, y) : ctx.moveTo(x, y); } ctx.fill(); ctx.globalAlpha = 0.8 * a; ctx.strokeStyle = '#3b6fb6'; ctx.lineWidth = 1.5; ctx.stroke(); ctx.globalAlpha = 0.5 * a; ctx.fillStyle = '#ffffff'; ctx.beginPath(); ctx.ellipse(ph.x - ph.r * 0.35, ph.y - ph.r * 0.4, ph.r * 0.25, ph.r * 0.12, -0.6, 0, TAU); ctx.fill(); ctx.restore(); },
  });
  // EAU + TEMPS : érosion
  def('eau|temps', { r: 60, life: 6, couleur: '#6a8aa8',
    init(ph) { W.spawnLiquid(M.EAU, ph.x, ph.y, Math.round(40 * ph.sz), ph.r); },
    tick(ph, dt) { if (ev(ph, 'e', 0.05)) { let eau = 0; cells(ph, (x, y, i, m) => { if (m !== M.EAU && m !== M.SAUMURE) return; eau++; for (const [dx, dy] of [[0, 1], [1, 0], [-1, 0], [1, 1], [-1, 1]]) { const n = Sim.get(x + dx, y + dy), r = rnd(); if ((n === M.TERRE || n === M.SABLE || n === M.MEUBLE || n === M.CENDRE || n === M.BOUE) && r < 0.12) { Sim.set(x + dx, y + dy, r < 0.04 ? M.SABLE : M.AIR); break; } if (n === M.PIERRE && r < 0.025) { Sim.set(x + dx, y + dy, M.SABLE); break; } } }); if (eau < 25 * ph.sz && ph.t < ph.max * 0.7) W.spawnLiquid(M.EAU, ph.x, ph.y, 6, ph.r * 0.5); } },
    draw(ctx, ph, t) { ctx.save(); ctx.strokeStyle = '#8a8f9a'; ctx.globalAlpha = 0.5 * fade(ph); ctx.setLineDash([2, 5]); U.inkCircle(ctx, ph.x, ph.y, ph.r, 4, 1); ctx.beginPath(); ctx.moveTo(ph.x, ph.y); ctx.lineTo(ph.x + Math.cos(t * 3) * ph.r * 0.6, ph.y + Math.sin(t * 3) * ph.r * 0.6); ctx.stroke(); ctx.restore(); },
  });
  // EAU + TRANSMUTATION : liquéfaction
  def('eau|transmutation', { r: 50, statique: true, life: 6, couleur: '#7a6040',
    init(ph) { ph.data.c = []; cells(ph, (x, y, i, m) => { if ((m === M.TERRE || m === M.SABLE || m === M.MEUBLE || (m === M.PIERRE && rnd() < 0.7) || m === M.CENDRE) && ph.data.c.length < 700) { Sim.set(x, y, M.BOUE, 250); ph.data.c.push(i); } else if (m === M.HERBE) Sim.set(x, y, M.AIR); }); },
    tick(ph, dt) { for (const c of creatures(ph, 0)) c.sta.lent = Math.max(c.sta.lent || 0, 0.4); },
    fin(ph) { let n = 0; for (const i of ph.data.c) if (Sim.mat[i] === M.BOUE) { const x = i % Sim.W; Sim.set(x, (i - x) / Sim.W, M.PIERRE); n++; } for (const c of st().crs) if (c.hp > 0 && Sim.rectHas(c, (m) => m === M.PIERRE) && touche(ph, c, 10)) { c.sta.stun = Math.max(c.sta.stun, 4); W.part(c.x + c.w / 2, c.y, '#a8977a', 8, 40, 0.6, 2); } if (n) W.msg('La boue se fige en pierre.'); },
  });
  // TERRE + VENT : tempête de sable
  def('terre|vent', { r: 60, life: 7, couleur: '#c8a868', bouge: 'roule', vitesse: 95, init(ph) { auSol(ph); ph.y -= ph.r * 0.6; ph.vx = (ph.dir.x >= 0 ? 1 : -1) * 95; },
    tick(ph, dt) {
      const sg = Math.sign(ph.vx) || 1;
      if (ev(ph, 's', 0.06)) nuee({ x: ph.x, y: ph.y - ph.r * 0.5, r: ph.r * 0.7, g: 'point' }, M.SABLE, 2, 1);
      for (const e of creatures(ph, 0)) { e.vx += sg * 700 * dt / W.masse(e); if (ev(ph, 'a' + (e.seed || 0), 1)) { e.sta.stun = Math.max(e.sta.stun, 0.6); } blesser(e, dt * 0.3 * ph.pw); }
      for (const o of objets(ph, 0)) o.vx += sg * 500 * dt / W.masse(o);
      if (joueurDans(ph, 0)) st().p.vx += sg * 300 * dt;
      for (let k = 0; k < 3; k++) { const q = auHasard(ph); W.part(q.x, q.y, '#c8a868', 1, 30, 0.6, 2, 0); }
    },
    draw(ctx, ph, t) { nuage(ctx, ph.x, ph.y, ph.r, '#c8a868', 0.4 * fade(ph), t * 3); },
  });
  // TERRE + VIE : racines
  def('terre|vie', { r: 55, statique: true, life: 3, couleur: '#6b4f2a',
    init(ph) {
      const q = []; ph.data.q = q; ph.data.remplace = true;
      if (ph.ligne) { const L = ph.ligne, n = Math.ceil(Math.hypot(L.x2 - L.x1, L.y2 - L.y1) / CS); for (let k = 0; k <= n; k++) { const x = Math.floor((L.x1 + (L.x2 - L.x1) * k / n) / CS), y = Math.floor((L.y1 + (L.y2 - L.y1) * k / n) / CS) + 1; q.push([x, y, M.BOIS], [x, y + 1, M.BOIS]); } }
      else { const g = sol(ph.x, ph.y - 10), gx = Math.floor(ph.x / CS), gy = Math.floor(g / CS); for (let r = 0; r < 6; r++) { let x = gx + Math.round((r - 2.5) * ph.r / CS / 3), y = gy; const dx = (r - 2.5) * 0.25; for (let k = 0; k < Math.round(ph.r / CS * 0.9); k++) { q.push([x, y, M.BOIS]); y -= 1; x += Math.round(dx + (rnd() - 0.5)); } } }
      for (const c of hostiles(ph, 20)) { c.sta.lent = Math.max(c.sta.lent || 0, 6); c.sta.stun = Math.max(c.sta.stun, 2.5); c.vx = 0; W.part(c.x + c.w / 2, c.y + c.h, '#6b4f2a', 8, 40, 0.6, 2); }
    },
    tick(ph) { pousserFile(ph, 6); },
  });
  // LUMIÈRE + TERRE : géode
  def('lumiere|terre', { r: 50, statique: true, life: 1, lum: 160, couleur: '#b58fd8',
    init(ph) { const q = []; ph.data.q = q; const n = 4 + Math.round(ph.sz * 2); for (let s = 0; s < n; s++) { const x0 = ph.x + (s / (n - 1) - 0.5) * ph.r * 2, g = sol(x0, ph.y - 10), gx = Math.floor(x0 / CS), gy = Math.floor(g / CS) - 1, h = 5 + Math.floor(rnd() * 9 * ph.sz), pen = (rnd() - 0.5) * 0.5; for (let k = 0; k < h; k++) { const x = gx + Math.round(k * pen); q.push([x, gy - k, M.CRISTAL]); if (k < h * 0.5) q.push([x + 1, gy - k, M.CRISTAL]); } }
      for (const c of hostiles(ph, 10)) { blesser(c, 2 * ph.pw); c.vy = -520 / Math.sqrt(W.masse(c)); c.sta.stun = Math.max(c.sta.stun, 1); } W.son('burst', 'terre'); },
    tick(ph) { pousserFile(ph, 14); },
  });
  // FOUDRE + TERRE : fulgurite
  def('foudre|terre', { r: 30, statique: true, life: 0.9, lum: 200, couleur: '#e0c43a',
    init(ph) {
      const q = []; ph.data.chemin = q; let x = ph.x, y = ph.ligne ? ph.ligne.y1 : sol(ph.x, ph.y - 10); const L = ph.ligne; const n = Math.round(28 * ph.sz);
      for (let k = 0; k < n; k++) { if (L) { x = L.x1 + (L.x2 - L.x1) * k / n; y = L.y1 + (L.y2 - L.y1) * k / n; } else { y += CS; x += (rnd() - 0.5) * CS * 1.6; } q.push([x, y]); }
      zap(ph.x + (rnd() - 0.5) * 40, Math.max(0, (ph.ligne ? ph.ligne.y1 : ph.y) - 400), q[0][0], q[0][1]); W.flash(0.1); W.son('burst', 'foudre');
      for (const c of st().crs) if (c.hp > 0 && !c.sta.tame && c.t !== 'familier' && dist(q[0][0], q[0][1], c.x + c.w / 2, c.y + c.h / 2) < 70) { blesser(c, 2.5 * ph.pw); c.sta.stun = Math.max(c.sta.stun, 1.5); }
    },
    tick(ph) { const q = ph.data.chemin; for (let k = 0; k < 4 && q.length; k++) { const [x, y] = q.shift(); Sim.forRadius(x, y, 9, (cx, cy, i, m) => { const d = dist(x, y, (cx + 0.5) * CS, (cy + 0.5) * CS); if (m === M.METAL || m === M.OBSIDIENNE) return; if (d < 5 && m !== M.AIR) Sim.set(cx, cy, M.AIR); else if (d >= 5 && (m === M.SABLE || m === M.TERRE || m === M.MEUBLE || m === M.PIERRE || m === M.NEIGE)) Sim.set(cx, cy, M.VERRE); if (P[Sim.mat[i]].cond) { Sim.elec[i] = 40; Sim.touch(i); } }); W.part(x, y, '#fff4a0', 3, 60, 0.3, 2, 0, 'spark'); } },
  });
  // GRAVITÉ + TERRE : météore (et COMÈTE DE GLACE avec le gel)
  const chute = (matiere, froid) => ({ point: true, statique: true, r: 14, life: 4, lum: froid ? 120 : 200, couleur: froid ? '#bfe0f2' : '#e0622b', bouge: 'tombe',
    init(ph) { const tx = ph.x, ty = ph.y; ph.x = tx - (ph.dir.x >= 0 ? 1 : -1) * 160; ph.y = Math.max(-60, st().cam.y - 60); const T = Math.sqrt(2 * Math.max(60, ty - ph.y) / 1500); ph.vx = (tx - ph.x) / T; ph.vy = 0; ph.r = ph.r0 * Math.sqrt(ph.sz); },
    trace(ph) { if (rnd() < 0.8) W.part(ph.x, ph.y, froid ? '#e4f2fa' : rnd() < 0.5 ? '#f0a040' : '#e0642a', 2, 30, 0.5, 4, -80); if (!froid && rnd() < 0.3) Sim.chauffer(ph.x, ph.y, 14, 200, 0.4); },
    impact(ph) {
      const R = ph.r * 2.4; Sim.forRadius(ph.x, ph.y, R, (x, y, i, m) => { if (m === M.METAL || m === M.OBSIDIENNE || m === M.AIR) return; if (rnd() < 0.75) Sim.set(x, y, P[m].liquid ? M.AIR : rnd() < 0.5 ? M.AIR : froid ? M.NEIGE : M.SABLE); });
      Sim.forRadius(ph.x, ph.y - 2, ph.r * 0.9, (x, y, i, m) => { if (air(m)) Sim.set(x, y, matiere); });
      if (froid) { Sim.chauffer(ph.x, ph.y, R * 2.2, 8, 0.8); effet(ph, 'froid', ph.x, ph.y, R * 1.8, 1.4); } else Sim.chauffer(ph.x, ph.y, R * 1.3, 205, 0.6);
      repousser(ph, R * 3.5, 900 * ph.pw); for (const c of st().crs) if (c.hp > 0 && c.t !== 'familier' && dist(ph.x, ph.y, c.x + c.w / 2, c.y + c.h / 2) < R * 2) { blesser(c, (froid ? 3 : 4) * ph.pw / Math.sqrt(W.masse(c))); c.sta.stun = Math.max(c.sta.stun, 1.5); if (froid) c.sta.gele = Math.max(c.sta.gele || 0, 4); }
      const p = st().p; if (dist(ph.x, ph.y, p.x + p.w / 2, p.y + p.h / 2) < R * 1.5) blesserJoueur(2, 'Le ciel te tombe dessus !');
      W.shake(0.7); W.flash(0.08); W.son('burst', 'terre'); W.part(ph.x, ph.y, froid ? '#e4f2fa' : '#8a7a5a', 30, 260, 0.9, 4, 700, 'eclat'); ph.life = 0;
    },
    draw(ctx, ph, t) { const a = Math.atan2(ph.vy, ph.vx); ctx.save(); ctx.globalAlpha = 0.5; ctx.strokeStyle = froid ? '#e4f2fa' : '#f0a040'; ctx.lineWidth = ph.r * 1.2; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(ph.x, ph.y); ctx.lineTo(ph.x - Math.cos(a) * 60, ph.y - Math.sin(a) * 60); ctx.stroke(); ctx.globalAlpha = 1; ctx.fillStyle = froid ? '#bfe0f2' : '#6b5a4a'; ctx.strokeStyle = U.INK; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(ph.x, ph.y, ph.r, 0, TAU); ctx.fill(); ctx.stroke(); ctx.restore(); if (!froid) FX.glow(ctx, ph.x, ph.y, ph.r * 3, '#e0642a', 0.5); },
  });
  def('gravite|terre', chute(M.PIERRE, false));
  def('froid|gravite', chute(M.GLACE, true));
  // TEMPS + TERRE : pétrification
  def('temps|terre', { r: 60, statique: true, life: 6, couleur: '#a8977a',
    init(ph) { ph.data.statues = hostiles(ph, 10, 1.2); for (const c of ph.data.statues) { c.sta.stun = Math.max(c.sta.stun, ph.max); c.vx = 0; } cells(ph, (x, y, i, m) => { if (m === M.BOIS && rnd() < 0.85) Sim.set(x, y, M.PIERRE); else if (m === M.PLANTE && rnd() < 0.6) Sim.set(x, y, M.PIERRE); else if (m === M.MIEL) Sim.set(x, y, M.CRISTAL); else if (m === M.HERBE || m === M.MOUSSE) Sim.set(x, y, M.SABLE); }); W.son('burst', 'terre'); },
    tick(ph) { for (const c of ph.data.statues) if (c.hp > 0) { c.sta.stun = Math.max(c.sta.stun, 0.1); c.vx = 0; } },
    draw(ctx, ph, t) { for (const c of ph.data.statues) if (c.hp > 0) { ctx.save(); ctx.globalAlpha = 0.6 * fade(ph); ctx.fillStyle = '#a8977a'; ctx.fillRect(c.x, c.y, c.w, c.h); ctx.strokeStyle = U.INK; ctx.globalAlpha = 0.5; ctx.strokeRect(c.x, c.y, c.w, c.h); ctx.restore(); } },
  });
  // TERRE + TRANSMUTATION : golem de glaise
  def('terre|transmutation', { r: 50, life: 25, couleur: '#8a6b2f',
    init(ph) {
      let n = 0; const g = sol(ph.x, ph.y - 10); Sim.forRadius(ph.x, g + ph.r * 0.3, ph.r * 0.8, (x, y, i, m) => { if ((m === M.TERRE || m === M.SABLE || m === M.MEUBLE || m === M.BOUE || m === M.PIERRE) && n < 60) { Sim.set(x, y, M.AIR); n++; } });
      ph.data.n = n; if (n < 12) { W.msg('Pas assez de terre ici pour lever un golem.'); ph.life = 0; return; }
      const c = W.makeCreature({ t: 'golem', x: ph.x - 25, y: g - 80, tame: true }); c.glaise = true; c.temporaire = true; c.sta.tame = true; c.filDonne = true; c.hpMax = c.hp = Math.round(6 * ph.pw); st().crs.push(c); ph.data.g = c; ph.follow = c; W.msg('La glaise se lève et te suit.'); W.son('burst', 'terre');
    },
    tick(ph, dt) {
      const c = ph.data.g; if (!c || c.hp <= 0) { ph.life = 0; return; }
      let best = null, bd = 320; for (const e of st().crs) if (e !== c && e.hp > 0 && !e.sta.tame && e.t !== 'familier') { const d = dist(c.x, c.y, e.x, e.y); if (d < bd) { bd = d; best = e; } }
      if (best) { c.vx = Math.sign(best.x - c.x) * 130; c.dir = Math.sign(c.vx) || 1; if (U.rectsOverlap({ x: c.x - 8, y: c.y, w: c.w + 16, h: c.h }, best) && ev(ph, 'coup', 0.8)) { blesser(best, 1.5 * ph.pw); best.vx += Math.sign(best.x - c.x) * 420 / W.masse(best); best.vy -= 200; W.shake(0.15); W.son('burst', 'terre'); } }
    },
    fin(ph) { const c = ph.data.g; if (c) { const k = st().crs.indexOf(c); if (k >= 0) st().crs.splice(k, 1); let n = ph.data.n; Sim.forRadius(c.x + c.w / 2, c.y + c.h * 0.6, 36, (x, y, i, m) => { if (n > 0 && m === M.AIR) { Sim.set(x, y, M.MEUBLE); n--; } }); W.part(c.x + c.w / 2, c.y + c.h / 2, '#8a6b2f', 16, 90, 0.7, 3, 300); } },
  });
  // VENT + VIE : pollen
  def('vent|vie', { r: 50, life: 8, couleur: '#d8c860', bouge: 'roule', vitesse: 50, init(ph) { auSol(ph); ph.y -= ph.r * 0.5; ph.vx = (ph.dir.x >= 0 ? 1 : -1) * 50; },
    tick(ph, dt) {
      if (ev(ph, 'g', 0.12)) cells(ph, (x, y, i, m) => { const up = Sim.get(x, y - 1); if (m === M.TERRE && up === M.AIR && rnd() < 0.3) Sim.set(x, y - 1, M.HERBE); else if (m === M.HERBE && up === M.AIR && rnd() < 0.05) Sim.set(x, y - 1, M.PLANTE); }, 1.4);
      for (const c of hostiles(ph, 0)) c.sta.sleep = Math.max(c.sta.sleep, 3);
      if (joueurDans(ph, 0)) st().p.hp = Math.min(st().p.hpMax, st().p.hp + dt * 0.2);
      for (let k = 0; k < 2; k++) { const q = auHasard(ph); W.part(q.x, q.y, rnd() < 0.5 ? '#e8d060' : '#c8e080', 1, 15, 1, 2, 10, 'spark'); }
    },
  });
  // LUMIÈRE + VENT : lucioles
  def('lumiere|vent', { r: 40, life: 25, couleur: '#f0e080',
    init(ph) { ph.motes = []; for (let k = 0; k < 10; k++) ph.motes.push({ x: ph.x + (rnd() - 0.5) * 60, y: ph.y + (rnd() - 0.5) * 60, vx: 0, vy: 0, ph: rnd() * TAU }); },
    tick(ph, dt) {
      for (const m of ph.motes) { m.ph += dt; m.vx += (Math.cos(m.ph * 1.3) * 60 + (ph.x - m.x) * 0.8) * dt; m.vy += (Math.sin(m.ph * 1.7) * 60 + (ph.y - m.y) * 0.8) * dt; m.vx *= 1 - dt; m.vy *= 1 - dt; m.x += m.vx * dt; m.y += m.vy * dt; }
      if (ev(ph, 'c', 0.5)) for (const c of st().crs) if (c.hp > 0 && !c.sta.tame && c.t !== 'familier' && dist(ph.x, ph.y, c.x, c.y) < 320) { c.curieux = ph.motes[(c.seed & 7) % ph.motes.length]; }
    },
    lumieres(ph) { const a = fade(ph); return ph.motes.map((m) => ({ x: m.x, y: m.y, r: 110 * a })); },
    fin(ph) { for (const c of st().crs) if (ph.motes.includes(c.curieux)) c.curieux = null; },
    draw(ctx, ph, t) { for (const m of ph.motes) { const b = 0.6 + 0.4 * Math.sin(t * 5 + m.ph * 3); FX.glow(ctx, m.x, m.y, 14, '#f0e080', 0.8 * b * fade(ph)); } },
  });
  // FOUDRE + VENT : front d'orage
  def('foudre|vent', { r: 30, life: 2.6, couleur: '#c8c060', bouge: 'roule', vitesse: 320,
    init(ph) { if (!ph.rect) { const g = sol(ph.x, ph.y - 10); ph.rect = { x0: ph.x - 16, x1: ph.x + 16, y0: g - 170 * ph.sz, y1: g }; ph.g = 'rect'; ph.y = (ph.rect.y0 + ph.rect.y1) / 2; } ph.vx = (ph.dir.x >= 0 ? 1 : -1) * 320; ph.data.hits = new Set(); ph.vy = 0; },
    tick(ph, dt) {
      const sg = Math.sign(ph.vx);
      for (const c of creatures(ph, 8)) { c.vx += sg * 1800 * dt / W.masse(c); c.vy -= 300 * dt; if (!ph.data.hits.has(c) && !c.sta.tame) { ph.data.hits.add(c); zap(ph.x, ph.rect.y0, c.x + c.w / 2, c.y + c.h / 2); blesser(c, 1.4 * ph.pw); c.sta.stun = Math.max(c.sta.stun, 1); } }
      for (const o of objets(ph, 8)) o.vx += sg * 1400 * dt / W.masse(o);
      if (joueurDans(ph, 0)) st().p.vx += sg * 500 * dt;
      if (ev(ph, 'e', 0.1)) cells(ph, (x, y, i, m) => { if (P[m].cond) { Sim.elec[i] = 30; Sim.touch(i); } else if (P[m].gas && rnd() < 0.5) { const j = i + sg; if (Sim.mat[j] === M.AIR) Sim.swap(i, j); } });
      if (Sim.solidAt(ph.x + sg * 20, ph.y)) ph.life = Math.min(ph.life, 0.2);
    },
    draw(ctx, ph, t) { const R = ph.rect; ctx.save(); ctx.globalAlpha = 0.25 * fade(ph); ctx.fillStyle = '#c8c060'; ctx.fillRect(R.x0, R.y0, R.x1 - R.x0, R.y1 - R.y0); ctx.restore(); if (rnd() < 0.6) FX.eclair(ctx, FX.eclairPts(ph.x, R.y0, ph.x + (rnd() - 0.5) * 30, R.y1, 0.25), '#e8d060', 1.5, 0.8); },
  });
  // GRAVITÉ + VENT : cyclone
  def('gravite|vent', { r: 40, life: 6, couleur: '#6c5ab8',
    init(ph) { if (!ph.rect) { const g = sol(ph.x, ph.y - 10); ph.rect = { x0: ph.x - ph.r, x1: ph.x + ph.r, y0: g - 260 * ph.sz, y1: g }; ph.g = 'rect'; } { const z = W.addGField(ph.x, (ph.rect.y0 + ph.rect.y1) / 2, ph.r * 3, 0, -1, 1.05, ph.max, { ...ph.rect }); if (z) lier(ph, z); } ph.data.top = ph.rect.y0; },
    tick(ph, dt) { const R = ph.rect, cx = (R.x0 + R.x1) / 2; for (const e of creatures(ph, 60).concat(objets(ph, 60))) { e.vx += (cx - e.x - e.w / 2) * 3 * dt; if (e.y < R.y0 + 30) { e.vx += (e.x > cx ? 1 : -1) * 900 * dt; } } if (rnd() < 0.8) { const q = auHasard(ph); W.part(q.x, q.y, '#9a8ad8', 1, 20, 0.6, 2, -300); } },
    draw(ctx, ph, t) { const R = ph.rect, cx = (R.x0 + R.x1) / 2, h = R.y1 - R.y0; ctx.save(); ctx.strokeStyle = '#6c5ab8'; ctx.globalAlpha = 0.5 * fade(ph); ctx.lineWidth = 1.5; for (let k = 0; k < 12; k++) { const y = R.y1 - ((k / 12 + t * 0.6) % 1) * h, w = (R.x1 - R.x0) / 2 * (0.5 + 0.5 * (R.y1 - y) / h); ctx.beginPath(); ctx.ellipse(cx, y, w, 4, 0, 0, TAU); ctx.stroke(); } ctx.restore(); },
  });
  // TEMPS + VENT : souffle des âges
  def('temps|vent', { r: 40, life: 3, couleur: '#c8b070', bouge: 'roule', vitesse: 220, init(ph) { auSol(ph); ph.y -= ph.r * 0.6; ph.vx = (ph.dir.x >= 0 ? 1 : -1) * 220; },
    tick(ph, dt) { W.vieillir('vite', ph.x, ph.y, ph.r, dt * 3, 8); if (ev(ph, 'r', 0.1)) cells(ph, (x, y, i, m) => { const r = rnd(); if (m === M.METAL && r < 0.05) Sim.set(x, y, M.SABLE); else if (m === M.BOIS && r < 0.03) Sim.set(x, y, M.MOUSSE); else if (m === M.PIERRE && r < 0.01) Sim.set(x, y, M.SABLE); }); for (const c of creatures(ph, 0)) c.sta.lent = Math.max(c.sta.lent || 0, 2); if (rnd() < 0.8) { const q = auHasard(ph); W.part(q.x, q.y, '#c8b070', 1, 40, 0.6, 2, 0); } },
    draw(ctx, ph, t) { nuage(ctx, ph.x, ph.y, ph.r, '#c8b070', 0.25 * fade(ph), t * 4); },
  });
  // TRANSMUTATION + VENT : air solide
  def('transmutation|vent', { r: 50, statique: true, life: 8, couleur: '#cfe3ea',
    init(ph) {
      if (ph.ligne) { const L = ph.ligne, n = Math.max(2, Math.round(Math.hypot(L.x2 - L.x1, L.y2 - L.y1) / 16)); for (let k = 0; k < n; k++) { const x = L.x1 + (L.x2 - L.x1) * k / n, y = L.y1 + (L.y2 - L.y1) * k / n, x2 = L.x1 + (L.x2 - L.x1) * (k + 1) / n, y2 = L.y1 + (L.y2 - L.y1) * (k + 1) / n; plateforme(ph, Math.min(x, x2), Math.min(y, y2), Math.abs(x2 - x) + 2, Math.max(8, Math.abs(y2 - y))); } }
      else if (ph.rect) { const R = ph.rect; plateforme(ph, R.x0, R.y0, R.x1 - R.x0, R.y1 - R.y0); }
      else { const w = ph.r * 2.4; ph.rect = { x0: ph.x - w / 2, x1: ph.x + w / 2, y0: ph.y - 5, y1: ph.y + 5 }; ph.g = 'rect'; plateforme(ph, ph.rect.x0, ph.rect.y0, w, 10); }
    },
    fin: retirerPlateformes,
    draw(ctx, ph, t) { if (!ph.objs) return; ctx.save(); ctx.strokeStyle = '#9ac8d8'; ctx.fillStyle = '#e4f2fa'; for (const o of ph.objs) { ctx.globalAlpha = 0.25 * fade(ph); ctx.fillRect(o.x, o.y, o.w, o.h); ctx.globalAlpha = 0.6 * fade(ph); ctx.lineWidth = 1; ctx.strokeRect(o.x, o.y, o.w, o.h); } ctx.restore(); },
  });
  // LUMIÈRE + VIE : arbre de lumière
  def('lumiere|vie', { r: 40, statique: true, life: 40, lum: 300, couleur: '#c8e080',
    init(ph) { const g = sol(ph.x, ph.y - 10); const gx = Math.floor(ph.x / CS), gy = Math.floor(g / CS); const h = Math.round(12 + 4 * ph.sz); ph.data.q = arbre(gx, gy, h, Math.round(6 * ph.sz), Math.round(4 * ph.sz)); ph.x = gx * CS; ph.y = (gy - h - 3) * CS; },
    tick(ph, dt) { pousserFile(ph, 12); const p = st().p; if (Math.abs(p.x + p.w / 2 - ph.x) < 60 && p.y > ph.y - 30) p.hp = Math.min(p.hpMax, p.hp + dt * 0.3); for (const c of st().crs) if (c.hp > 0 && Math.abs(c.x + c.w / 2 - ph.x) < 60 && c.y > ph.y - 30) c.hp = Math.min(c.hpMax, c.hp + dt * 0.3); if (rnd() < 0.2) W.part(ph.x + (rnd() - 0.5) * 70, ph.y + (rnd() - 0.5) * 30, '#f0e080', 1, 10, 1, 2, 30, 'spark'); },
    draw(ctx, ph, t) { FX.glow(ctx, ph.x, ph.y, 90, '#f0e080', 0.35 * fade(ph)); },
  });
  // FOUDRE + VIE : ronces électriques
  def('foudre|vie', { r: 45, statique: true, life: 10, couleur: '#a0c040',
    init(ph) { const q = []; ph.data.q = q; ph.data.remplace = false; if (ph.g === 'point') { const g = sol(ph.x, ph.y - 10); ph.y = g - ph.r * 0.5; } cells(ph, (x, y, i, m) => { if (air(m) && (ph.rect || ph.ligne || (y + 1) * CS > ph.y - ph.r * 0.1) && rnd() < 0.55) q.push([x, y, M.PLANTE]); }); },
    tick(ph, dt) { pousserFile(ph, 20); if (ev(ph, 'z', 0.3)) for (const c of hostiles(ph, 4)) { if (!Sim.rectHas(c, (m) => m === M.PLANTE)) continue; blesser(c, 0.8 * ph.pw); c.sta.stun = Math.max(c.sta.stun, 0.6); const q = auHasard(ph); zap(q.x, q.y, c.x + c.w / 2, c.y + c.h / 2); } if (joueurDans(ph, -4) && Sim.rectHas(st().p, (m) => m === M.PLANTE) && ev(ph, 'j', 0.6)) blesserJoueur(0.4, 'Les ronces crépitent !'); if (rnd() < 0.3) { const q = auHasard(ph); W.part(q.x, q.y, '#fff4a0', 1, 30, 0.2, 2, 0, 'spark'); } },
  });
  // GRAVITÉ + VIE : îlot flottant
  def('gravite|vie', { r: 50, statique: true, life: 30, couleur: '#6c5ab8',
    init(ph) { const cx = Math.floor(ph.x / CS), cy = Math.floor(ph.y / CS), rx = Math.round(ph.r * 1.1 / CS), ry = Math.max(2, Math.round(rx * 0.45)); ph.data.c = []; for (let y = -1; y <= ry; y++) for (let x = -rx; x <= rx; x++) { if ((x * x) / (rx * rx) + (y * y) / (ry * ry) > 1 && y > 0) continue; if (y < 0 && Math.abs(x) > rx) continue; const X = cx + x, Y = cy + y; if (!air(Sim.get(X, Y))) continue; const m = y < 0 ? M.HERBE : M.TERRE; Sim.set(X, Y, m); const i = Y * Sim.W + X; if (m === M.TERRE) { Sim.ancrerCase(i, 1); ph.data.c.push(i); } } for (let k = 0; k < 3; k++) { const X = cx + Math.round((rnd() - 0.5) * rx * 1.4); if (Sim.get(X, cy - 2) === M.AIR) Sim.set(X, cy - 2, M.PLANTE); } W.son('burst', 'terre'); },
    fin(ph) { for (const i of ph.data.c) { Sim.ancrerCase(i, 0); } if (ph.data.c.length) Sim.fissurer(ph.data.c[0]); W.msg('L\'îlot retombe !'); },
    draw(ctx, ph, t) { FX.glow(ctx, ph.x, ph.y + ph.r * 0.5, ph.r * 1.2, '#6c5ab8', 0.25 * fade(ph)); },
  });
  // TEMPS + VIE : forêt instantanée
  def('temps|vie', { r: 70, statique: true, life: 2.2, couleur: '#5c8f3e',
    init(ph) { const q = []; ph.data.q = q; const n = 2 + Math.round(ph.sz); for (let k = 0; k < n; k++) { const x0 = ph.x + (n > 1 ? (k / (n - 1) - 0.5) : 0) * ph.r * 1.8; const g = sol(x0, ph.y - 10); arbre(Math.floor(x0 / CS), Math.floor(g / CS), 10 + Math.floor(rnd() * 7), 5 + Math.floor(rnd() * 2), 3 + Math.floor(rnd() * 2), q); } q.sort((a, b) => b[1] - a[1]); effet(ph, 'vie', ph.x, ph.y, ph.r * 1.4, 1); },
    tick(ph) { pousserFile(ph, 18); },
  });
  // TRANSMUTATION + VIE : bois vivant
  def('transmutation|vie', { r: 55, life: 1.4, couleur: '#8d6a3c',
    tick(ph) { const rr = Math.min(1, ph.t / 1.1); if (ev(ph, 'c', 0.06)) cells(ph, (x, y, i, m) => { const r = rnd(); if (m === M.PIERRE && r < 0.5) Sim.set(x, y, M.BOIS); else if (m === M.TERRE && r < 0.3) Sim.set(x, y, M.BOIS); else if ((m === M.SABLE || m === M.MEUBLE) && r < 0.3) Sim.set(x, y, M.TERRE); if (Sim.mat[i] === M.BOIS && Sim.get(x, y - 1) === M.AIR && r < 0.15) Sim.set(x, y - 1, M.MOUSSE); }, rr); },
  });
  // FOUDRE + LUMIÈRE : prisme
  def('foudre|lumiere', { r: 14, point: true, life: 10, lum: 180, couleur: '#e8e0a0', bouge: 'flotte', init(ph) { if (ph.g === 'point' && !ph.follow) { const g = sol(ph.x, ph.y - 10); if (g - ph.y < 60) ph.y = g - 70; } },
    tick(ph, dt) { if (ev(ph, 'z', 0.65)) { let best = null, bd = 260; for (const c of st().crs) if (c.hp > 0 && !c.sta.tame && c.t !== 'familier') { const d = dist(ph.x, ph.y, c.x + c.w / 2, c.y + c.h / 2); if (d < bd && !Sim.raycast(ph.x, ph.y, (c.x + c.w / 2 - ph.x) / d, (c.y + c.h / 2 - ph.y) / d, d - 10)) { bd = d; best = c; } } if (best) { st().sp.push({ k: 'beam', core: 'lumiere', x1: ph.x, y1: ph.y, x2: best.x + best.w / 2, y2: best.y + best.h / 2, life: 0.2, max: 0.2, color: '#f6e8a0', w: 3 }); blesser(best, 1.2 * ph.pw); best.sta.stun = Math.max(best.sta.stun, 0.5); W.son('cast', 'lumiere'); } } },
    draw(ctx, ph, t) { FX.glow(ctx, ph.x, ph.y, 40, '#f6e8a0', 0.5 * fade(ph)); ctx.save(); ctx.translate(ph.x, ph.y); ctx.rotate(t * 1.5); ctx.globalAlpha = fade(ph); ctx.fillStyle = 'rgba(240,236,200,0.6)'; ctx.strokeStyle = U.INK; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(0, -ph.r); ctx.lineTo(ph.r * 0.87, ph.r * 0.5); ctx.lineTo(-ph.r * 0.87, ph.r * 0.5); ctx.closePath(); ctx.fill(); ctx.stroke(); ctx.restore(); },
  });
  // GRAVITÉ + LUMIÈRE : trou noir
  def('gravite|lumiere', { r: 14, explose: true, point: true, life: 5, couleur: '#2a2040', sombre: 260,
    init(ph) { ph.data.masse = 0; ph.R = ph.r * 8; },
    tick(ph, dt) {
      attirer(ph, ph.R, 1500 * ph.pw, dt, ph.x, ph.y, 0.45);
      if (ev(ph, 'f', 0.05)) effet(ph, 'force', ph.x, ph.y, ph.R * 0.7, 0.8, 0.05);
      if (ev(ph, 'a', 0.05)) Sim.forRadius(ph.x, ph.y, ph.r * 1.3, (x, y, i, m) => { if (m !== M.AIR && m !== M.METAL && m !== M.OBSIDIENNE) { Sim.set(x, y, M.AIR); ph.data.masse++; } });
      for (const c of creatures(ph, 4)) { blesser(c, dt * 3 * ph.pw); c.sta.stun = Math.max(c.sta.stun, 0.5); }
      for (const s of st().sp) if (s.k === 'proj' && !s.mort && s.spec !== ph.spec) { const d = dist(s.x, s.y, ph.x, ph.y); if (d < ph.R) { s.vx += (ph.x - s.x) / d * 1400 * dt; s.vy += (ph.y - s.y) / d * 1400 * dt; if (d < ph.r * 1.5) s.mort = true; } }
      if (joueurDans(ph, 2)) blesserJoueur(dt * 1.5, 'Le trou noir t\'aspire !');
    },
    fin(ph) { repousser(ph, ph.R, 700); W.flash(0.12); W.part(ph.x, ph.y, '#efe3c4', 26, 220, 0.8, 3, 0, 'spark'); let n = Math.min(60, Math.floor(ph.data.masse / 3)); Sim.forRadius(ph.x, ph.y, 30, (x, y, i, m) => { if (n > 0 && m === M.AIR) { Sim.set(x, y, M.SABLE); n--; } }); },
    draw(ctx, ph, t) { const a = fade(ph); ctx.save(); const g = ctx.createRadialGradient(ph.x, ph.y, ph.r * 0.5, ph.x, ph.y, ph.R * 0.7); g.addColorStop(0, 'rgba(10,6,20,' + 0.95 * a + ')'); g.addColorStop(0.3, 'rgba(30,20,50,' + 0.5 * a + ')'); g.addColorStop(1, 'rgba(30,20,50,0)'); ctx.fillStyle = g; ctx.beginPath(); ctx.arc(ph.x, ph.y, ph.R * 0.7, 0, TAU); ctx.fill(); ctx.strokeStyle = '#e0b050'; ctx.globalAlpha = 0.7 * a; ctx.lineWidth = 2; ctx.beginPath(); ctx.ellipse(ph.x, ph.y, ph.r * 2.4, ph.r * 0.7, t * 0.5, 0, TAU); ctx.stroke(); ctx.fillStyle = '#000'; ctx.globalAlpha = a; ctx.beginPath(); ctx.arc(ph.x, ph.y, ph.r, 0, TAU); ctx.fill(); ctx.restore(); },
  });
  // LUMIÈRE + TEMPS : aube (ou crépuscule)
  def('lumiere|temps', { r: 30, statique: true, point: true, life: 3, lum: 200, couleur: '#f0c070',
    init(ph) { const tod = st().tod, jour = W.daylight() > 0.45; ph.data.de = tod; ph.data.vers = jour ? 0.8 : 0.28; if (ph.data.vers < tod && !jour) ph.data.vers += 1; W.msg(jour ? 'Le jour tombe en crépuscule.' : 'La nuit se lève en aube.'); },
    tick(ph) { const k = Math.min(1, ph.t / ph.max); st().tod = (ph.data.de + (ph.data.vers - ph.data.de) * k) % 1; },
    draw(ctx, ph, t) { ctx.save(); ctx.strokeStyle = '#f0c070'; ctx.globalAlpha = 0.6 * fade(ph); ctx.lineWidth = 2; for (let k = 0; k < 8; k++) { const a = k / 8 * TAU + t; ctx.beginPath(); ctx.moveTo(ph.x + Math.cos(a) * 14, ph.y + Math.sin(a) * 14); ctx.lineTo(ph.x + Math.cos(a) * 34, ph.y + Math.sin(a) * 34); ctx.stroke(); } ctx.restore(); },
  });
  // LUMIÈRE + TRANSMUTATION : miroir
  def('lumiere|transmutation', { r: 40, life: 10, lum: 80, couleur: '#cfe3ea',
    init(ph) { if (!ph.rect) { const p = st().p, vert = Math.abs(ph.dir.x) >= Math.abs(ph.dir.y); ph.rect = vert ? { x0: ph.x - 4, x1: ph.x + 4, y0: ph.y - ph.r * 1.4, y1: ph.y + ph.r * 1.4 } : { x0: ph.x - ph.r * 1.4, x1: ph.x + ph.r * 1.4, y0: ph.y - 4, y1: ph.y + 4 }; ph.g = 'rect'; } ph.data.vert = (ph.rect.y1 - ph.rect.y0) >= (ph.rect.x1 - ph.rect.x0); },
    tick(ph) { const R = ph.rect; for (const s of st().sp) { if (s.k !== 'proj' || s.mort || s.spec === ph.spec) continue; if (s.x > R.x0 - s.r - 4 && s.x < R.x1 + s.r + 4 && s.y > R.y0 - s.r - 4 && s.y < R.y1 + s.r + 4 && W.time() - (s.reflet || -9) > 0.15) { s.reflet = W.time(); if (ph.data.vert) { s.vx = -s.vx; s.x = s.vx > 0 ? R.x1 + s.r + 5 : R.x0 - s.r - 5; } else { s.vy = -s.vy; s.y = s.vy > 0 ? R.y1 + s.r + 5 : R.y0 - s.r - 5; } W.part(s.x, s.y, '#ffffff', 6, 60, 0.3, 2, 0, 'spark'); W.son('click'); } } for (const c of creatures(ph, 2)) { const cx = (R.x0 + R.x1) / 2; if (ph.data.vert) { c.x += c.x + c.w / 2 < cx ? -3 : 3; c.vx = 0; } } },
    draw(ctx, ph, t) { const R = ph.rect; ctx.save(); ctx.globalAlpha = 0.75 * fade(ph); const g = ctx.createLinearGradient(R.x0, R.y0, R.x1, R.y1); g.addColorStop(0, '#e4f2fa'); g.addColorStop(0.5, '#ffffff'); g.addColorStop(1, '#9ac8d8'); ctx.fillStyle = g; ctx.fillRect(R.x0, R.y0, R.x1 - R.x0, R.y1 - R.y0); ctx.strokeStyle = U.INK; ctx.lineWidth = 1.5; ctx.strokeRect(R.x0, R.y0, R.x1 - R.x0, R.y1 - R.y0); ctx.restore(); },
  });
  // FOUDRE + GRAVITÉ : aimant
  def('foudre|gravite', { r: 30, point: true, life: 8, lum: 90, couleur: '#a080d0',
    init(ph) { ph.R = ph.r * 5; ph.data.orb = []; },
    tick(ph, dt) {
      const tire = (e, f) => { const ex = e.x + e.w / 2, ey = e.y + e.h / 2, d = Math.hypot(ph.x - ex, ph.y - ey) || 1; if (d > ph.R) return; const k = 900 * f * ph.pw * dt * (1 - d / ph.R); e.vx += (ph.x - ex) / d * k; e.vy += (ph.y - ey) / d * k; };
      for (const c of st().crs) if (c.hp > 0 && c.t !== 'familier') tire(c, c.t === 'golem' ? 2.5 : 0.4);
      for (const o of st().objs) if (o.dyn && !o.mort && !o.carried) tire(o, o.t === 'rocher' ? 2 : 1);
      for (const s of st().sp) if (s.k === 'proj' && !s.mort && !ph.data.orb.includes(s) && s.spec !== ph.spec && dist(s.x, s.y, ph.x, ph.y) < ph.R) { ph.data.orb.push(s); s.life = 99; s.grav = 0; }
      ph.data.orb = ph.data.orb.filter((s) => !s.mort); ph.data.orb.forEach((s, k) => { const a = ph.t * 4 + k / ph.data.orb.length * TAU, rr = ph.r * 1.6; const tx = ph.x + Math.cos(a) * rr, ty = ph.y + Math.sin(a) * rr; s.vx = (tx - s.x) * 10; s.vy = (ty - s.y) * 10; });
      if (ev(ph, 'e', 0.3)) Sim.forRadius(ph.x, ph.y, ph.R, (x, y, i, m) => { if (m === M.METAL) { Sim.elec[i] = 40; Sim.touch(i); } });
    },
    fin(ph) { for (const s of ph.data.orb) { let best = null, bd = 600; for (const c of st().crs) if (c.hp > 0 && !c.sta.tame && c.t !== 'familier') { const d = dist(s.x, s.y, c.x, c.y); if (d < bd) { bd = d; best = c; } } const a = best ? Math.atan2(best.y + best.h / 2 - s.y, best.x + best.w / 2 - s.x) : Math.atan2(s.y - ph.y, s.x - ph.x); s.vx = Math.cos(a) * 700; s.vy = Math.sin(a) * 700; s.life = 1.2; } },
    draw(ctx, ph, t) { ctx.save(); ctx.strokeStyle = '#a080d0'; ctx.lineWidth = 1.2; ctx.globalAlpha = 0.5 * fade(ph); for (let k = 1; k <= 3; k++) { ctx.beginPath(); ctx.ellipse(ph.x, ph.y, ph.r * k * 0.9, ph.r * k * 0.45, 0, 0, TAU); ctx.stroke(); } ctx.fillStyle = '#737e86'; ctx.globalAlpha = fade(ph); ctx.fillRect(ph.x - 8, ph.y - 8, 16, 16); ctx.restore(); },
  });
  // FOUDRE + TEMPS : foudre suspendue
  def('foudre|temps', { r: 10, life: 6, lum: 150, couleur: '#e8d060',
    init(ph) { if (!ph.ligne) { if (ph.rect) { const R = ph.rect, cx = (R.x0 + R.x1) / 2; ph.ligne = { x1: cx, y1: R.y0, x2: cx, y2: R.y1, w: 9 }; } else { const g = sol(ph.x, ph.y - 10); ph.ligne = { x1: ph.x, y1: g - 220 * ph.sz, x2: ph.x, y2: g, w: 9 }; ph.data.vertical = true; } ph.g = 'ligne'; } ph.data.pts = FX.eclairPts(ph.ligne.x1, ph.ligne.y1, ph.ligne.x2, ph.ligne.y2, 0.12); },
    tick(ph) { if (ev(ph, 'r', 0.15)) ph.data.pts = FX.eclairPts(ph.ligne.x1, ph.ligne.y1, ph.ligne.x2, ph.ligne.y2, 0.12); if (ev(ph, 'z', 0.25)) { for (const c of creatures(ph, 2)) { blesser(c, 1 * ph.pw); c.sta.stun = Math.max(c.sta.stun, 0.8); W.part(c.x + c.w / 2, c.y + c.h / 2, '#fff4a0', 6, 60, 0.3, 2, 0, 'spark'); } if (joueurDans(ph, 0)) blesserJoueur(0.5, 'Zzzt !'); cells(ph, (x, y, i, m) => { if (P[m].cond) { Sim.elec[i] = 40; Sim.touch(i); } }); } },
    viser(ph, tx, ty, dt) { const L = ph.ligne, k = Math.min(1, dt * 7); if (ph.data.vertical) { const g = sol(tx, ty - 10), H = L.y2 - L.y1; L.x1 = L.x2 = L.x2 + (tx - L.x2) * k; L.y2 += (g - L.y2) * k; L.y1 = L.y2 - H; } else visLigne(ph, tx, ty, k); ph.data.pts = FX.eclairPts(L.x1, L.y1, L.x2, L.y2, 0.12); },
    draw(ctx, ph) { FX.eclair(ctx, ph.data.pts, '#e8d060', 2.2, fade(ph)); },
  });
  // FOUDRE + TRANSMUTATION : électrolyse (l'eau devient un gaz qui explose)
  def('foudre|transmutation', { r: 50, life: 3, couleur: '#c8e0a0',
    tick(ph) { if (ev(ph, 'g', 0.05)) { let n = 0; cells(ph, (x, y, i, m) => { if ((m === M.EAU || m === M.SAUMURE) && rnd() < 0.15 && n < 20) { Sim.set(x, y, M.GAZ, 200); n++; } }); } if (rnd() < 0.5) { const q = auHasard(ph); W.part(q.x, q.y, '#fff4a0', 1, 30, 0.2, 2, 0, 'spark'); } },
  });
  // GRAVITÉ + TEMPS : horizon
  def('gravite|temps', { r: 40, point: true, life: 8, couleur: '#7a7090',
    init(ph) { for (const [k, f] of [[1, 0.08], [2, 0.3], [3.2, 0.6]]) { const b = { k: 'bulle', mode: 'lent', x: ph.x, y: ph.y, r: ph.r * k, life: ph.max, max: ph.max, fx: f, horizon: true }; st().sp.push(b); lier(ph, b); } },
    tick(ph, dt) { attirer(ph, ph.r * 3.2, 380 * ph.pw, dt, ph.x, ph.y, 0.25); },
    draw(ctx, ph, t) { ctx.save(); ctx.strokeStyle = '#7a7090'; ctx.globalAlpha = 0.4 * fade(ph); for (let k = 1; k <= 3; k++) { ctx.beginPath(); ctx.arc(ph.x, ph.y, ph.r * k * (1 - 0.05 * Math.sin(t * 2 + k)), 0, TAU); ctx.stroke(); } ctx.restore(); },
  });
  // GRAVITÉ + TRANSMUTATION : presse
  def('gravite|transmutation', { r: 34, point: true, life: 4, couleur: '#6a6a8a',
    tick(ph, dt) {
      if (ev(ph, 'f', 0.06)) effet(ph, 'force', ph.x, ph.y, ph.r * 3, 0.7, 0.06);
      attirer(ph, ph.r * 3, 600 * ph.pw, dt);
      if (ev(ph, 'c', 0.1)) Sim.forRadius(ph.x, ph.y, ph.r, (x, y, i, m) => { const d = dist(ph.x, ph.y, (x + 0.5) * CS, (y + 0.5) * CS), r = rnd(); if ((m === M.SABLE || m === M.MEUBLE || m === M.TERRE || m === M.CENDRE || m === M.NEIGE || m === M.BOUE) && r < 0.2) Sim.set(x, y, M.PIERRE); else if (m === M.PIERRE && d < ph.r * 0.5 && r < 0.05) Sim.set(x, y, M.CRISTAL); else if (m === M.NEIGE && r < 0.3) Sim.set(x, y, M.GLACE); });
      for (const c of creatures(ph, 0, 0.6)) blesser(c, dt * 1.5 * ph.pw);
    },
    draw(ctx, ph, t) { ctx.save(); ctx.strokeStyle = '#6a6a8a'; ctx.globalAlpha = 0.5 * fade(ph); for (let k = 0; k < 6; k++) { const a = k / 6 * TAU; const r1 = ph.r * 1.8 * (1 - (t * 0.8 % 1)); ctx.beginPath(); ctx.moveTo(ph.x + Math.cos(a) * r1, ph.y + Math.sin(a) * r1); ctx.lineTo(ph.x + Math.cos(a) * (r1 - 10), ph.y + Math.sin(a) * (r1 - 10)); ctx.stroke(); } ctx.restore(); },
  });
  // TEMPS + TRANSMUTATION : origine
  const ORIGINE = []; ORIGINE[M.VERRE] = M.SABLE; ORIGINE[M.OBSIDIENNE] = M.LAVE; ORIGINE[M.CENDRE] = M.BOIS; ORIGINE[M.METAL] = M.PIERRE; ORIGINE[M.GLACE] = M.EAU; ORIGINE[M.NEIGE] = M.EAU; ORIGINE[M.VAPEUR] = M.EAU; ORIGINE[M.BOUE] = M.TERRE; ORIGINE[M.MEUBLE] = M.TERRE; ORIGINE[M.CRISTAL] = M.PIERRE; ORIGINE[M.FUMEE] = M.AIR; ORIGINE[M.SAUMURE] = M.EAU; ORIGINE[M.MOUSSE] = M.AIR;
  def('temps|transmutation', { r: 60, life: 1.3, couleur: '#b8a070',
    init(ph) { ph.data.fait = new Set(); for (const c of creatures(ph, 10)) { c.hp = c.hpMax; if (c.orig) W.revenir(c); } for (const o of objets(ph, 10)) if (o.t === 'caisse') o.hp = 3; },
    tick(ph) { const rr = Math.min(1, ph.t / 1.1 + 0.1); if (ev(ph, 'c', 0.05)) cells(ph, (x, y, i, m) => { if (ph.data.fait.has(i)) return; const o = ORIGINE[m]; if (o === undefined) return; ph.data.fait.add(i); Sim.set(x, y, o); }, rr); },
    draw(ctx, ph, t) { ctx.save(); ctx.strokeStyle = '#b8a070'; ctx.globalAlpha = 0.6 * fade(ph); ctx.setLineDash([4, 4]); U.inkCircle(ctx, ph.x, ph.y, ph.r * Math.min(1, ph.t / 1.1 + 0.1), 6, 1); ctx.restore(); },
  });
  // ---- avec les aspects ----
  def('froid|vent', { r: 55, life: 8, couleur: '#cfe8f6', bouge: 'derive', vitesse: 45, init: enCiel(120),
    tick(ph, dt) { if (ev(ph, 'n', 0.05)) nuee(ph, M.NEIGE, 2); if (ev(ph, 'f', 0.2)) { const g = sol(ph.x, ph.y + 10); Sim.chauffer(ph.x, (ph.y + g) / 2, ph.r * 1.3, 22, 0.35); } for (const c of st().crs) if (c.hp > 0 && !W.froidOk(c) && Math.abs(c.x + c.w / 2 - ph.x) < ph.r * 1.3 && c.y > ph.y) c.sta.lent = Math.max(c.sta.lent || 0, 0.5); },
    draw(ctx, ph, t) { nuage(ctx, ph.x, ph.y, ph.r, '#dde8f0', 0.6 * fade(ph), t); },
  });
  def('feu|froid', { r: 50, life: 0.8, couleur: '#c87080',
    init(ph) { cells(ph, (x, y, i, m) => { const r = rnd(); if ((m === M.PIERRE || m === M.OBSIDIENNE) && r < 0.5) Sim.set(x, y, M.SABLE); else if ((m === M.VERRE || m === M.CRISTAL) && r < 0.8) Sim.set(x, y, M.SABLE); else if (m === M.GLACE && r < 0.7) Sim.set(x, y, M.NEIGE); else if (m === M.EAU && r < 0.3) Sim.set(x, y, M.VAPEUR, 40); }); for (const c of hostiles(ph, 10)) { blesser(c, (c.t === 'golem' ? 4 : 2) * ph.pw); c.sta.stun = Math.max(c.sta.stun, 1); } W.son('burst', 'terre'); W.shake(0.3); W.part(ph.x, ph.y, '#c87080', 20, 160, 0.6, 3, 300, 'eclat'); },
    draw(ctx, ph) { FX.glow(ctx, ph.x, ph.y, ph.r * 1.5, ph.t < 0.4 ? '#e0642a' : '#7fb4d8', 0.6 * fade(ph)); },
  });
  def('froid|temps', { r: 55, life: 1, couleur: '#9ad0f0',
    init(ph) { for (const c of hostiles(ph, 10, 1.3)) { const x0 = Math.floor(c.x / CS) - 1, x1 = Math.floor((c.x + c.w) / CS) + 1, y0 = Math.floor(c.y / CS) - 1, y1 = Math.floor((c.y + c.h) / CS) + 1; for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) if (Sim.get(x, y) === M.AIR && (x === x0 || x === x1 || y === y0 || y === y1)) { Sim.set(x, y, M.GLACE); Sim.temp[y * Sim.W + x] = 5; } c.sta.gele = Math.max(c.sta.gele || 0, 10); c.sta.stun = Math.max(c.sta.stun, 10); c.vx = c.vy = 0; } cells(ph, (x, y, i, m) => { if (m === M.EAU || m === M.SAUMURE) { Sim.set(x, y, M.GLACE); Sim.temp[i] = 4; } }); Sim.chauffer(ph.x, ph.y, ph.r, 10, 0.6); W.son('burst', 'eau'); },
    draw(ctx, ph) { FX.glow(ctx, ph.x, ph.y, ph.r * 1.4, '#cfe8f6', 0.6 * fade(ph)); },
  });
  def('foudre|metal', { r: 45, life: 10, lum: 120, couleur: '#c8c070',
    init(ph) { let n = 0; Sim.forRadius(ph.x, ph.y, ph.r, (x, y, i, m) => { if (m === M.METAL) n++; }); if (n < 4) { const g = sol(ph.x, ph.y - 10), gx = Math.floor(ph.x / CS), gy = Math.floor(g / CS); for (let k = 1; k <= 10; k++) { Sim.set(gx, gy - k, M.METAL); if (k < 4) { Sim.set(gx - 1, gy - k, M.METAL); Sim.set(gx + 1, gy - k, M.METAL); } } ph.y = g - 30; } },
    tick(ph) { if (ev(ph, 'e', 0.25)) { const met = []; Sim.forRadius(ph.x, ph.y, ph.r * 2, (x, y, i, m) => { if (m === M.METAL) { Sim.elec[i] = 60; Sim.touch(i); if (rnd() < 0.05) met.push([(x + 0.5) * CS, (y + 0.5) * CS]); } }); if (met.length && ev(ph, 'a', 0.5)) for (const c of st().crs) if (c.hp > 0 && !c.sta.tame && c.t !== 'familier') { const [mx, my] = met[(rnd() * met.length) | 0]; if (dist(mx, my, c.x + c.w / 2, c.y + c.h / 2) < 130) { zap(mx, my, c.x + c.w / 2, c.y + c.h / 2); blesser(c, 1 * ph.pw); c.sta.stun = Math.max(c.sta.stun, 0.6); W.son('burst', 'foudre'); break; } } } },
  });
  def('feu|metal', { r: 45, life: 8, lum: 140, couleur: '#e0642a',
    init(ph) { let n = 0; Sim.forRadius(ph.x, ph.y, ph.r, (x, y, i, m) => { if (m === M.METAL) n++; }); if (n < 4) { const g = sol(ph.x, ph.y - 10), gy = Math.floor(g / CS); for (let x = Math.floor((ph.x - ph.r) / CS); x <= Math.floor((ph.x + ph.r) / CS); x++) { Sim.set(x, gy - 1, M.METAL); } ph.y = g; } },
    tick(ph) { if (ev(ph, 'h', 0.1)) Sim.forRadius(ph.x, ph.y, ph.r * 1.3, (x, y, i, m) => { if (m === M.METAL) { Sim.temp[i] = Math.max(Sim.temp[i], 215); Sim.touch(i); } }); },
  });
  def('acide|feu', { r: 50, life: 8, couleur: '#7a8a40', bouge: 'roule', vitesse: 25, init(ph) { auSol(ph); ph.y -= ph.r * 0.6; ph.vx = (ph.dir.x >= 0 ? 1 : -1) * 25; },
    tick(ph, dt) { if (ev(ph, 's', 0.1)) { const q = auHasard(ph); const x = Math.floor(q.x / CS), y = Math.floor(q.y / CS); if (Sim.get(x, y) === M.AIR) Sim.set(x, y, M.FUMEE, 80); } for (const c of hostiles(ph, 0)) { blesser(c, dt * 0.5 * ph.pw); if (rnd() < dt * 0.5) c.sta.sleep = Math.max(c.sta.sleep, 3); } if (joueurDans(ph, 0)) blesserJoueur(dt * 0.3, 'Tu tousses dans la fumée âcre.'); },
    draw(ctx, ph, t) { nuage(ctx, ph.x, ph.y, ph.r, '#7a8a40', 0.35 * fade(ph), t); },
  });
  def('acide|eau', { r: 50, life: 6, couleur: '#8fbf2a', bouge: 'derive', vitesse: 30, init: enCiel(150),
    tick(ph) { if (ev(ph, 'p', 0.07)) nuee(ph, M.ACIDE, 1); },
    draw(ctx, ph, t) { nuage(ctx, ph.x, ph.y, ph.r, '#6a7a3a', 0.6 * fade(ph), t); },
  });
  def('foudre|son', { r: 50, life: 0.7, couleur: '#e8e0c0',
    init(ph) { const R = ph.r * 4; Sim.forRadius(ph.x, ph.y, R, (x, y, i, m) => { const r = rnd(); if ((m === M.VERRE || m === M.CRISTAL) && r < 0.6) Sim.set(x, y, r < 0.3 ? M.AIR : M.SABLE); else if (m === M.GLACE && r < 0.5) Sim.set(x, y, M.NEIGE); }); repousser(ph, R, 800 * ph.pw); for (const c of st().crs) if (c.hp > 0 && dist(ph.x, ph.y, c.x, c.y) < R) { c.sta.stun = Math.max(c.sta.stun, 2); c.sta.sleep = 0; c.dort = false; } effet(ph, 'foudre', ph.x, ph.y, ph.r, 1); W.shake(0.8); W.flash(0.15); W.son('burst', 'foudre'); W.son('burst', 'terre'); ph.R = R; },
    draw(ctx, ph) { FX.onde(ctx, ph.x, ph.y, ph.R * Math.min(1, ph.t / 0.5), 1 - ph.t / ph.max, '#e8e0c0'); },
  });
  def('explosion|gravite', { r: 40, point: true, life: 1.5, couleur: '#c86040',
    tick(ph, dt) { if (ph.t < 1.2 || ph.tenu) { attirer(ph, ph.r * 5, 2000 * ph.pw, dt, ph.x, ph.y, 0.5); if (ev(ph, 'f', 0.05)) effet(ph, 'force', ph.x, ph.y, ph.r * 4, 0.9, 0.05); } else if (!ph.data.boum) this.relache(ph); },
    relache(ph) { if (ph.data.boum) return; ph.data.boum = true; effet(ph, 'explosion', ph.x, ph.y, ph.r * 1.8, 1.4); repousser(ph, ph.r * 5, 1000 * ph.pw); W.shake(0.7); },
    draw(ctx, ph, t) { if (ph.t < 1.2 || ph.tenu) { ctx.save(); ctx.strokeStyle = '#c86040'; ctx.globalAlpha = 0.6; const r = ph.r * 4 * (1 - (ph.tenu ? (t * 0.8) % 1 : ph.t / 1.2)); ctx.beginPath(); ctx.arc(ph.x, ph.y, Math.max(2, r), 0, TAU); ctx.stroke(); ctx.restore(); } },
  });
  def('fumee|vent', { r: 50, life: 10, couleur: '#5a524c', bouge: 'roule', vitesse: 20, init(ph) { auSol(ph); ph.y -= ph.r * 0.7; ph.vx = (ph.dir.x >= 0 ? 1 : -1) * 20; },
    tick(ph, dt) { if (ev(ph, 's', 0.06)) for (let k = 0; k < 2; k++) { const q = auHasard(ph); const x = Math.floor(q.x / CS), y = Math.floor(q.y / CS); if (Sim.get(x, y) === M.AIR) Sim.set(x, y, M.FUMEE, 90); } if (joueurDans(ph, 10)) st().p.sta.invisible = Math.max(st().p.sta.invisible, 0.5); for (const c of creatures(ph, 0)) c.fuite = null; },
    draw(ctx, ph, t) { nuage(ctx, ph.x, ph.y, ph.r, '#5a524c', 0.4 * fade(ph), t); },
  });
  def('force|terre', { r: 55, life: 0.6, couleur: '#8a6b2f',
    init(ph) { cells(ph, (x, y, i, m) => { const r = rnd(); if (m === M.TERRE && r < 0.6) Sim.set(x, y, M.MEUBLE); else if (m === M.PIERRE && r < 0.45) Sim.set(x, y, M.SABLE); }); W.shake(0.5); W.son('burst', 'terre'); for (const c of hostiles(ph, 20)) c.sta.stun = Math.max(c.sta.stun, 1.5); },
  });
  def('foudre|lien', { r: 8, life: 10, couleur: '#e0c060',
    init(ph) { if (!ph.ligne) { const p = st().p; ph.ligne = { x1: p.x + p.w / 2, y1: p.y + p.h * 0.4, x2: ph.x, y2: ph.y, w: 8 }; ph.g = 'ligne'; } },
    tick(ph) { if (ev(ph, 'z', 0.2)) for (const c of creatures(ph, 2)) { blesser(c, 1 * ph.pw); c.sta.stun = Math.max(c.sta.stun, 0.8); W.part(c.x + c.w / 2, c.y + c.h / 2, '#fff4a0', 6, 60, 0.3, 2, 0, 'spark'); } },
    draw(ctx, ph, t) { const L = ph.ligne; ctx.save(); ctx.strokeStyle = '#c9a63a'; ctx.globalAlpha = fade(ph); ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(L.x1, L.y1); ctx.quadraticCurveTo((L.x1 + L.x2) / 2, (L.y1 + L.y2) / 2 + 10, L.x2, L.y2); ctx.stroke(); ctx.restore(); if (rnd() < 0.3) { const t2 = rnd(); W.part(L.x1 + (L.x2 - L.x1) * t2, L.y1 + (L.y2 - L.y1) * t2, '#fff4a0', 1, 30, 0.2, 2, 0, 'spark'); } },
  });
  def('eau|froid', { r: 50, life: 0.6, couleur: '#bfe0f2',
    init(ph) { let n = 0; const R = ph.r * 3; Sim.forRadius(ph.x, ph.y, R, (x, y, i, m) => { if ((m === M.EAU || m === M.SAUMURE) && !P[Sim.get(x, y - 1)].liquid && Sim.get(x, y - 1) !== M.GLACE) { for (let d = 0; d < 3; d++) if (P[Sim.get(x, y + d)].liquid) { Sim.set(x, y + d, M.GLACE); Sim.temp[(y + d) * Sim.W + x] = 20; n++; } } }); if (n < 10) Sim.forRadius(ph.x, ph.y, ph.r * 0.6, (x, y, i, m) => { if (air(m) || P[m].liquid) Sim.set(x, y, M.GLACE); }); W.son('burst', 'eau'); },
  });
  def('eau|seisme', { r: 40, life: 3, couleur: '#3b6fb6', bouge: 'roule', hSol: 1, vitesse: 260, init(ph) { auSol(ph); ph.vx = (ph.dir.x >= 0 ? 1 : -1) * 260; ph.H = Math.round(9 * ph.sz); },
    tick(ph, dt) { const sg = Math.sign(ph.vx); if (ev(ph, 'w', 0.04)) { const x = Math.floor((ph.x + sg * 12) / CS), g = Math.floor(sol(ph.x + sg * 12, ph.y - 30) / CS); for (let k = 1; k <= ph.H; k++) if (Sim.get(x, g - k) === M.AIR) Sim.set(x, g - k, M.EAU); } const box = { x: ph.x - 30, y: ph.y - ph.H * CS - 20, w: 60, h: ph.H * CS + 20 }; for (const e of st().crs.concat(st().objs.filter((o) => o.dyn && !o.mort))) { if ((e.hp !== undefined && e.hp <= 0 && !e.dyn) || !U.rectsOverlap(box, e)) continue; e.vx += sg * 2200 * dt / W.masse(e); e.vy -= 500 * dt; if (e.sta) e.sta.wet = 6; } if (U.rectsOverlap(box, st().p)) { st().p.vx += sg * 900 * dt; } },
    draw(ctx, ph, t) { const sg = Math.sign(ph.vx); ctx.save(); ctx.strokeStyle = '#3b6fb6'; ctx.globalAlpha = 0.7 * fade(ph); ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(ph.x - sg * 40, ph.y); ctx.quadraticCurveTo(ph.x, ph.y - ph.H * CS * 1.4, ph.x + sg * 20, ph.y - ph.H * CS * 0.7); ctx.stroke(); ctx.restore(); },
  });
  def('force|gravite', { r: 40, point: true, life: 3, couleur: '#9a4a8c',
    tick(ph, dt) { if (ph.t < 2.4 || ph.tenu) { attirer(ph, ph.r * 5, 1600 * ph.pw, dt, ph.x, ph.y, 0.4); if (ev(ph, 'f', 0.05)) effet(ph, 'force', ph.x, ph.y, ph.r * 4, 1, 0.05); } else if (!ph.data.boum) this.relache(ph); },
    relache(ph) { if (ph.data.boum) return; ph.data.boum = true; repousser(ph, ph.r * 5, 1100 * ph.pw); effet(ph, 'repulsion', ph.x, ph.y, ph.r * 3, 1.2); W.shake(0.5); },
    draw(ctx, ph, t) { ctx.save(); ctx.strokeStyle = '#9a4a8c'; ctx.globalAlpha = 0.6 * fade(ph); for (let k = 0; k < 3; k++) { ctx.beginPath(); ctx.arc(ph.x, ph.y, ph.r * (1 + k) * (1 - (t * 1.5 % 1) * 0.5), t * 3 + k, t * 3 + k + 4); ctx.stroke(); } ctx.restore(); },
  });

  // ---------- fusions à trois (grand sceau) ----------
  // Étoile : le petit soleil hors du temps, plus grand, plus long, et qui finit en nova
  def('feu|gravite|temps', Object.assign({}, DEFS['feu|gravite'], { r: 30, life: 45, lum: 640, couleur: '#f6d080', explose: true,
    fin(ph) { effet(ph, 'explosion', ph.x, ph.y, ph.r * 3.2, 1.6); repousser(ph, ph.r * 9, 950); Sim.chauffer(ph.x, ph.y, ph.r * 4, 245, 0.8); W.flash(0.25); W.shake(0.8); W.part(ph.x, ph.y, '#fff6d8', 50, 360, 1, 4, 0, 'spark'); W.son('burst', 'feu'); } }));
  // Ouragan : un orage qui marche, foudroie, aspire et soulève sous lui
  def('eau|foudre|vent', { r: 80, life: 16, couleur: '#3c4252', bouge: 'derive', vitesse: 55, init: enCiel(210),
    tick(ph, dt) {
      DEFS['eau|foudre'].tick(ph, dt);
      if (ev(ph, 'p2', 0.05)) nuee(ph, M.EAU, 2);
      const g = sol(ph.x, ph.y + 10), col = { x: ph.x - ph.r * 0.6, y: ph.y, w: ph.r * 1.2, h: g - ph.y };
      for (const e of st().crs.concat(st().objs.filter((o) => o.dyn && !o.mort))) { if ((e.hp !== undefined && e.hp <= 0 && !e.dyn) || !U.rectsOverlap(col, e) || e.t === 'familier') continue; e.vy -= 1650 * dt / Math.sqrt(W.masse(e)); e.vx += ((ph.x - e.x - e.w / 2) * 3 + Math.sin(ph.t * 3) * 300) * dt; }
      if (U.rectsOverlap(col, st().p)) { st().p.vy -= 900 * dt; st().p.vx += (ph.x - st().p.x) * 1.5 * dt; }
      if (ev(ph, 'w', 0.15)) { Sim.souffler(ph.x, g - 40, ph.r * 1.6, 0, 0, -1.4); Sim.souffler(ph.x, (ph.y + g) / 2, ph.r * 0.8, 0, -1.6); }
    },
    draw(ctx, ph, t) { const g = sol(ph.x, ph.y + 10); ctx.save(); ctx.globalAlpha = 0.35 * fade(ph); ctx.strokeStyle = '#5a6478'; ctx.lineWidth = 2; for (let k = 0; k < 10; k++) { const u = k / 10, y = ph.y + (g - ph.y) * u, w = ph.r * (0.9 - u * 0.6); ctx.beginPath(); ctx.ellipse(ph.x + Math.sin(t * 3 + k) * 8 * u, y, w, 5, 0, t * 4 + k, t * 4 + k + 4.4); ctx.stroke(); } ctx.restore(); nuage(ctx, ph.x, ph.y, ph.r * 1.2, '#2c3242', 0.7 * fade(ph), t); },
  });
  // Volcan : un cône de pierre jaillit et crache la lave
  def('feu|gravite|terre', { r: 40, life: 14, lum: 260, couleur: '#e0622b', statique: true,
    init(ph) {
      const g = sol(ph.x, ph.y - 10), gx = Math.floor(ph.x / CS), gy = Math.floor(g / CS), H = Math.round(14 * Math.sqrt(ph.sz));
      for (let h = 0; h < H; h++) { const w = Math.round((H - h) * 1.2); for (let x = gx - w; x <= gx + w; x++) { if (Math.abs(x - gx) <= 1 && h > H - 4) continue; const y = gy - 1 - h; if (air(Sim.get(x, y)) || P[Sim.get(x, y)].powder) Sim.set(x, y, Math.abs(x - gx) <= 1 ? M.LAVE : M.PIERRE); } }
      ph.data.cx = gx; ph.data.cy = gy - H; ph.x = gx * CS; ph.y = (gy - H) * CS; ph.data.n = Math.round(160 * ph.sz); W.shake(0.6); W.son('burst', 'terre');
    },
    tick(ph, dt) {
      const { cx, cy } = ph.data;
      if (ev(ph, 'l', 0.05) && ph.data.n > 0) for (let k = 0; k < 2; k++) { const x = cx + Math.round((rnd() - 0.5) * 3), y = cy - 1 - Math.floor(rnd() * 5); if (Sim.get(x, y) === M.AIR) { Sim.set(x, y, M.LAVE); ph.data.n--; } }
      if (ev(ph, 'b', 1.1)) { const x = cx + Math.round((rnd() - 0.5) * 40), y = cy - 10 - Math.floor(rnd() * 12); for (let d = 0; d < 5; d++) if (Sim.get(x + (d % 2), y + (d >> 1)) === M.AIR) Sim.set(x + (d % 2), y + (d >> 1), M.LAVE); W.shake(0.25); W.part(cx * CS, cy * CS, '#e0622b', 12, 220, 0.8, 3, 700); }
      if (ev(ph, 'h', 0.3)) Sim.chauffer(cx * CS, cy * CS, 50, 210, 0.4);
    },
    draw(ctx, ph, t) { FX.glow(ctx, ph.x, ph.y, 70, '#e0622b', 0.5 * fade(ph)); },
  });
  // Jardin suspendu : un îlot, son arbre, sa source
  def('eau|gravite|vie', { r: 55, life: 45, couleur: '#5c8f3e', statique: true,
    init(ph) { DEFS['gravite|vie'].init(ph); const gx = Math.floor(ph.x / CS), gy = Math.floor(ph.y / CS) - 1; ph.data.q = arbre(gx - 2, gy, 8, 4, 3); ph.data.src = { x: (gx + 3) * CS, y: (gy - 1) * CS }; },
    tick(ph) { pousserFile(ph, 8); if (ev(ph, 'e', 0.7)) { const s = ph.data.src; const x = Math.floor(s.x / CS), y = Math.floor(s.y / CS); if (Sim.get(x, y) === M.AIR) Sim.set(x, y, M.EAU); } },
    fin(ph) { DEFS['gravite|vie'].fin(ph); },
    draw(ctx, ph, t) { FX.glow(ctx, ph.x, ph.y + ph.r * 0.4, ph.r * 1.3, '#6aa070', 0.25 * fade(ph)); },
  });
  // Pulsar : deux rayons qui tournent et frappent
  def('foudre|gravite|lumiere', { r: 14, life: 10, lum: 320, couleur: '#e8e0a0', bouge: 'flotte', point: true,
    init(ph) { if (ph.g === 'point' && !ph.follow) { const g = sol(ph.x, ph.y - 10); if (g - ph.y < 70) ph.y = g - 80; } ph.data.a = 0; ph.L = 280 * Math.sqrt(ph.sz); },
    tick(ph, dt) {
      ph.data.a += dt * 1.7;
      for (const s of [0, Math.PI]) { const a = ph.data.a + s, L = ph.L; const seg = { x1: ph.x, y1: ph.y, x2: ph.x + Math.cos(a) * L, y2: ph.y + Math.sin(a) * L, w: 10 };
        for (const c of st().crs) if (c.hp > 0 && !c.sta.tame && c.t !== 'familier' && dSeg(c.x + c.w / 2, c.y + c.h / 2, seg) < 10 + Math.max(c.w, c.h) * 0.4) { blesser(c, dt * 2.4 * ph.pw); c.sta.stun = Math.max(c.sta.stun, 0.3); }
        if (ev(ph, 'h' + s, 0.15)) { const u = 0.3 + rnd() * 0.7; Sim.chauffer(ph.x + Math.cos(a) * L * u, ph.y + Math.sin(a) * L * u, 10, 180, 0.4); } }
    },
    draw(ctx, ph, t) { ctx.save(); ctx.globalCompositeOperation = 'lighter'; for (const s of [0, Math.PI]) { const a = ph.data.a + s; ctx.strokeStyle = '#f6e8a0'; ctx.globalAlpha = 0.55 * fade(ph); ctx.lineWidth = 5; ctx.beginPath(); ctx.moveTo(ph.x, ph.y); ctx.lineTo(ph.x + Math.cos(a) * ph.L, ph.y + Math.sin(a) * ph.L); ctx.stroke(); ctx.strokeStyle = '#fffbe8'; ctx.lineWidth = 1.5; ctx.stroke(); } ctx.restore(); FX.glow(ctx, ph.x, ph.y, 40, '#fff6d8', 0.7 * fade(ph)); ctx.save(); ctx.fillStyle = '#fffbe8'; ctx.globalAlpha = fade(ph); ctx.beginPath(); ctx.arc(ph.x, ph.y, ph.r * 0.7, 0, TAU); ctx.fill(); ctx.restore(); },
  });
  // Canyon : un ravin s'ouvre, une rivière y coule
  def('eau|temps|terre', { r: 40, life: 3, couleur: '#6a8aa8', statique: true,
    init(ph) {
      const g = sol(ph.x, ph.y - 10), gx = Math.floor(ph.x / CS), gy = Math.floor(g / CS), D = Math.round(26 * Math.sqrt(ph.sz)), q = [];
      for (let d = 0; d < D; d++) { const w = Math.max(2, Math.round(8 - d * 0.22)); for (let x = gx - w; x <= gx + w; x++) q.push([x, gy + d]); }
      ph.data.creuse = q; ph.data.fond = { x: gx * CS, y: (gy + D - 2) * CS };
    },
    tick(ph) { const q = ph.data.creuse; for (let k = 0; k < 40 && q.length; k++) { const [x, y] = q.shift(); const m = Sim.get(x, y); if (m !== M.METAL && m !== M.OBSIDIENNE && m !== M.AIR && !P[m].liquid) Sim.set(x, y, M.AIR); } if (!q.length && !ph.data.eau) { ph.data.eau = true; W.spawnLiquid(M.EAU, ph.data.fond.x, ph.data.fond.y, Math.round(80 * ph.sz), 60); W.shake(0.3); } },
    draw(ctx, ph, t) { ctx.save(); ctx.strokeStyle = '#8a8f9a'; ctx.globalAlpha = 0.5 * fade(ph); U.inkCircle(ctx, ph.x, ph.y, ph.r, 4, 1); ctx.restore(); },
  });
  // Trou blanc : il recrache matière et lumière, et repousse tout
  def('gravite|lumiere|temps', { r: 16, life: 6, lum: 420, couleur: '#fffbe8', point: true,
    tick(ph, dt) {
      if (ev(ph, 'r', 0.1)) { repousser(ph, ph.r * 8, 260 * ph.pw, ph.x, ph.y, 0.4); Sim.souffler(ph.x, ph.y, ph.r * 7, 0, 0, 1.2); }
      if (ev(ph, 's', 0.06)) for (let k = 0; k < 2; k++) { const a = rnd() * TAU, d = ph.r * 1.6; const x = Math.floor((ph.x + Math.cos(a) * d) / CS), y = Math.floor((ph.y + Math.sin(a) * d) / CS); if (Sim.get(x, y) === M.AIR) Sim.set(x, y, rnd() < 0.25 ? M.CRISTAL : M.SABLE); }
      for (const c of creatures(ph, 6, 3)) c.sta.stun = Math.max(c.sta.stun, 0.3);
    },
    draw(ctx, ph, t) { FX.glow(ctx, ph.x, ph.y, ph.r * 9, '#fffbe8', 0.45 * fade(ph)); ctx.save(); ctx.strokeStyle = '#e0b050'; ctx.globalAlpha = 0.6 * fade(ph); for (let k = 0; k < 12; k++) { const a = k / 12 * TAU + t * 0.6, r1 = ph.r * (1.4 + ((t * 1.5 + k * 0.3) % 1) * 4); ctx.beginPath(); ctx.moveTo(ph.x + Math.cos(a) * r1, ph.y + Math.sin(a) * r1); ctx.lineTo(ph.x + Math.cos(a) * (r1 + 10), ph.y + Math.sin(a) * (r1 + 10)); ctx.stroke(); } ctx.fillStyle = '#ffffff'; ctx.globalAlpha = fade(ph); ctx.beginPath(); ctx.arc(ph.x, ph.y, ph.r, 0, TAU); ctx.fill(); ctx.restore(); },
  });
  // Printemps éternel : tout pousse longtemps, des fleurs qui luisent, on guérit
  def('lumiere|temps|vie', { r: 150, life: 40, couleur: '#c8e080', init(ph) { auSol(ph); ph.data.q = []; ph.data.fleurs = []; },
    tick(ph, dt) {
      if (ev(ph, 'g', 0.3)) cells(ph, (x, y, i, m) => { const up = Sim.get(x, y - 1), r = rnd(); if (m === M.TERRE && up === M.AIR && r < 0.25) Sim.set(x, y - 1, M.HERBE); else if (m === M.CENDRE && r < 0.4) Sim.set(x, y, M.TERRE); else if (m === M.HERBE && up === M.AIR && r < 0.03) { Sim.set(x, y - 1, M.PLANTE); if (ph.data.fleurs.length < 14 && rnd() < 0.3) ph.data.fleurs.push({ x: (x + 0.5) * CS, y: (y - 0.5) * CS, p: rnd() * TAU }); } });
      if (ev(ph, 'a', 4)) { const x0 = ph.x + (rnd() - 0.5) * ph.r * 1.6, g = sol(x0, ph.y - 40); arbre(Math.floor(x0 / CS), Math.floor(g / CS), 8 + Math.floor(rnd() * 5), 4, 3, ph.data.q); }
      pousserFile(ph, 10);
      const p = st().p; if (joueurDans(ph, 0)) p.hp = Math.min(p.hpMax, p.hp + dt * 0.3);
      for (const c of st().crs) if (c.hp > 0 && touche(ph, c, 0)) c.hp = Math.min(c.hpMax, c.hp + dt * 0.3);
      if (rnd() < 0.4) { const q = auHasard(ph, 0.8); W.part(q.x, q.y, rnd() < 0.5 ? '#f0b0d8' : '#f6e080', 1, 15, 1.2, 2, 20, 'spark'); }
    },
    lumieres(ph) { const a = fade(ph); return ph.data.fleurs.map((f) => ({ x: f.x, y: f.y, r: 70 * a })); },
    draw(ctx, ph, t) { for (const f of ph.data.fleurs) FX.glow(ctx, f.x, f.y, 10, '#f6e080', (0.5 + 0.3 * Math.sin(t * 3 + f.p)) * fade(ph)); },
  });

  // ---------- familles : Espace, Esprit, Contre-sort, Métamorphose avec n'importe quel effet ----------
  const FAILLE = { feu: M.FEU, eau: M.EAU, terre: M.SABLE, froid: M.NEIGE, acide: M.ACIDE, fumee: M.FUMEE, metal: M.SABLE };
  const COULEUR = (e) => W.colorOf(e);
  const ABSORBE = { feu: [M.FEU], eau: [M.EAU, M.SAUMURE], terre: [M.TERRE, M.SABLE, M.MEUBLE, M.BOUE], vent: [M.FUMEE, M.VAPEUR, M.GAZ], froid: [M.GLACE, M.NEIGE], acide: [M.ACIDE], metal: [M.METAL], vie: [M.PLANTE, M.HERBE, M.MOUSSE], lumiere: [M.CRISTAL], fumee: [M.FUMEE], transmutation: [M.VERRE] };
  function famille(cle) {
    const info = DATA.comboInfo(cle); if (!info || !info.genre) return null;
    const x = info.effet, g = info.genre, C = COULEUR(x);
    if (g === 'portail') return { r: 22, life: 6, couleur: C, lum: x === 'lumiere' || x === 'feu' ? 150 : 60,
      tick(ph, dt) {
        const m = FAILLE[x];
        if (m != null && ev(ph, 'm', 0.04)) for (let k = 0; k < 2; k++) { const a = rnd() * TAU, d = ph.r * (0.6 + rnd() * 0.6); const cx = Math.floor((ph.x + Math.cos(a) * d) / CS), cy = Math.floor((ph.y + Math.sin(a) * d) / CS); if (Sim.get(cx, cy) === M.AIR) { if (m === M.FEU) Sim.setFeu(cx, cy, 25, 0); else Sim.set(cx, cy, m, m === M.FUMEE ? 80 : 0); } }
        if (x === 'vent' || x === 'son' || x === 'repulsion') repousser(ph, ph.r * 5, 500 * dt * 60 * 0.02 * ph.pw);
        else if (x === 'gravite' || x === 'force') attirer(ph, ph.r * 5, 800 * ph.pw, dt);
        else if (x === 'temps' && !ph.data.b) { ph.data.b = true; { const b = { k: 'bulle', mode: 'vite', x: ph.x, y: ph.y, r: ph.r * 3, life: ph.max, max: ph.max, fx: 4 }; st().sp.push(b); lier(ph, b); } }
        else if (m == null && ev(ph, 'e', 0.5)) effet(ph, x, ph.x, ph.y, ph.r * 2.5, 0.8);
        if (rnd() < 0.5) W.part(ph.x + (rnd() - 0.5) * ph.r, ph.y + (rnd() - 0.5) * ph.r * 2, C, 1, 40, 0.5, 2, 0, 'spark');
      },
      draw(ctx, ph, t) { ctx.save(); ctx.strokeStyle = '#4fb0a0'; ctx.lineWidth = 3; ctx.globalAlpha = 0.9 * fade(ph); ctx.beginPath(); ctx.ellipse(ph.x, ph.y, ph.r * 0.5, ph.r, 0, 0, TAU); ctx.stroke(); ctx.strokeStyle = C; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.ellipse(ph.x, ph.y, ph.r * 0.28, ph.r * 0.7, t * 2, 0, TAU); ctx.stroke(); ctx.restore(); FX.glow(ctx, ph.x, ph.y, ph.r * 2, C, 0.4 * fade(ph)); },
    };
    if (g === 'esprit') return { point: true, r: 12, life: 20, couleur: C, lum: 90, bouge: 'chasse',
      tick(ph, dt) {
        let best = null, bd = 340; for (const c of st().crs) if (c.hp > 0 && !c.sta.tame && c.t !== 'familier' && !c.glaise) { const d = dist(ph.x, ph.y, c.x + c.w / 2, c.y + c.h / 2); if (d < bd) { bd = d; best = c; } }
        const p = st().p; const tx = best ? best.x + best.w / 2 : p.x + p.w / 2 - p.face * 40, ty = best ? best.y + best.h / 2 : p.y - 20;
        if (!ph.tenu) { ph.vx += (tx - ph.x) * 3 * dt; ph.vy += (ty - ph.y) * 3 * dt; ph.vx *= 1 - 2 * dt; ph.vy *= 1 - 2 * dt; }
        if (best && bd < (ph.tenu ? 40 : 30) && ev(ph, 'h', 0.6)) { effet(ph, x, ph.x, ph.y, 32, 0.9); W.part(ph.x, ph.y, C, 8, 80, 0.4, 2); }
        if (rnd() < 0.5) W.part(ph.x, ph.y, C, 1, 15, 0.5, 2, -20, 'spark');
      },
      draw(ctx, ph, t) { FX.glow(ctx, ph.x, ph.y, ph.r * 3, C, 0.6 * fade(ph)); ctx.save(); ctx.fillStyle = C; ctx.globalAlpha = fade(ph); ctx.beginPath(); ctx.arc(ph.x, ph.y, ph.r * (0.8 + 0.15 * Math.sin(t * 7)), 0, TAU); ctx.fill(); ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(ph.x - 3, ph.y - 2, 2, 0, TAU); ctx.arc(ph.x + 3, ph.y - 2, 2, 0, TAU); ctx.fill(); ctx.restore(); },
    };
    if (g === 'contre') return { r: 60, life: 0.8, couleur: '#a8a29a',
      init(ph) {
        let n = 0; const mats = ABSORBE[x] || [];
        cells(ph, (cx, cy, i, m) => { if (mats.includes(m)) { Sim.set(cx, cy, M.AIR); n++; } else if (x === 'feu' && P[m].flam && Sim.aux[i] > 0) { Sim.aux[i] = 0; Sim.touch(i); n++; } else if (x === 'foudre' && Sim.elec[i] > 0) { Sim.elec[i] = 0; n++; } });
        if (x === 'feu' || x === 'froid') Sim.chauffer(ph.x, ph.y, ph.r, Sim.AMB, 0.9);
        if (x === 'gravite') { const a = st().gz.length; st().gz = st().gz.filter((z) => dist(ph.x, ph.y, z.x, z.y) > ph.r * 1.5); n += (a - st().gz.length) * 20; }
        if (x === 'temps' || x === 'figer') for (const q of st().sp) if (q.k === 'bulle' && dist(ph.x, ph.y, q.x, q.y) < ph.r * 1.5) { q.life = 0.01; n += 20; }
        for (const c of creatures(ph, 10)) { if (x === 'feu') c.sta.burn = 0; if (x === 'froid') { c.sta.gele = 0; c.sta.lent = 0; } }
        const p = st().p; if (joueurDans(ph, 10)) { if (x === 'feu') p.sta.burning = 0; if (x === 'eau') p.sta.wet = 0; }
        const gain = Math.min(12, n / 15); p.ink = Math.min(p.inkMax, p.ink + gain);
        W.msg(n ? 'Absorbé : ' + n + ' parcelles' + (gain >= 1 ? ', +' + Math.floor(gain) + ' encre.' : '.') : 'Rien de cette nature à absorber ici.');
      },
      draw(ctx, ph, t) { ctx.save(); ctx.strokeStyle = C; ctx.globalAlpha = 0.6 * fade(ph); for (let k = 0; k < 10; k++) { const a = k / 10 * TAU + t * 4, r1 = ph.r * (1 - ph.t / ph.max); ctx.beginPath(); ctx.moveTo(ph.x + Math.cos(a) * r1, ph.y + Math.sin(a) * r1); ctx.lineTo(ph.x + Math.cos(a + 0.3) * r1 * 0.6, ph.y + Math.sin(a + 0.3) * r1 * 0.6); ctx.stroke(); } ctx.restore(); },
    };
    if (g === 'metamorphose') return { r: 60, life: 20, couleur: C,
      init(ph) {
        const specX = Object.assign({}, ph.spec, { cores: [x], core: x, combo: null, color: C, subs: [], repeat: 0, expire: false, encre: null, prm: Object.assign({}, ph.spec.prm, { power: (ph.spec.prm.power || 1) * 0.7 }) });
        if (ph.follow === st().p) { ph.data.soi = true; W.msg('Tu prends la nature ' + DATA.comboInfo(cle).nom.replace('Chimère ', '') + '.'); return; }
        let best = null, bd = ph.r * 1.5; for (const c of st().crs) if (c.hp > 0 && c.t !== 'familier') { const d = dist(ph.x, ph.y, c.x + c.w / 2, c.y + c.h / 2); if (d < bd) { bd = d; best = c; } }
        if (!best) { W.msg('Aucune créature à changer ici.'); ph.life = 0; return; }
        best.ench = { spec: specX, t: ph.max, tick: 0 }; ph.follow = best; W.part(best.x + best.w / 2, best.y, C, 16, 80, 0.8, 3, 0, 'spark'); W.msg('La créature devient ' + DATA.comboInfo(cle).nom.toLowerCase().replace('chimère ', 'chimère ') + '.');
      },
      tick(ph, dt) { if (!ph.data.soi) return; const p = st().p; const s = p.sta; const T = 0.3; if (x === 'feu' || x === 'explosion') s.garde = Math.max(s.garde || 0, T); else if (x === 'eau' || x === 'courant') s.branchies = Math.max(s.branchies || 0, T); else if (x === 'terre' || x === 'metal' || x === 'seisme') s.armure = Math.max(s.armure || 0, T); else if (x === 'vent' || x === 'son') s.glide = Math.max(s.glide || 0, T); else if (x === 'foudre') s.vitesse = Math.max(s.vitesse || 0, T); else if (x === 'froid') s.patins = Math.max(s.patins || 0, T); else if (x === 'lumiere') s.lumiere = Math.max(s.lumiere || 0, T); else if (x === 'vie') s.regen = Math.max(s.regen || 0, T); else if (x === 'gravite') s.lowgrav = Math.max(s.lowgrav || 0, T); if (rnd() < 0.4) W.part(p.x + rnd() * p.w, p.y + rnd() * p.h, C, 1, 20, 0.5, 2, -30, 'spark'); },
      fin(ph) { if (ph.tenu && ph.follow && ph.follow !== st().p && ph.follow.ench) ph.follow.ench = null; },
      draw(ctx, ph, t) { const e = ph.follow; if (!e) return; FX.glow(ctx, e.x + e.w / 2, e.y + e.h / 2, Math.max(e.w, e.h), C, 0.35 * fade(ph)); },
    };
    return null;
  }

  // le bruit de chaque phénomène
  const SONS = { 'feu|gravite': 'soleil', 'eau|feu': 'eau', 'feu|terre': 'feu', 'feu|vent': 'vent', 'feu|vie': 'feu', 'feu|lumiere': 'feu', 'feu|foudre': 'foudre', 'feu|temps': 'feu', 'feu|transmutation': 'feu',
    'eau|terre': 'eau', 'eau|vent': 'eau', 'eau|vie': 'eau', 'eau|lumiere': 'magie', 'eau|foudre': 'orage', 'eau|gravite': 'eau', 'eau|temps': 'eau', 'terre|vent': 'vent', 'gravite|vent': 'vent', 'foudre|vent': 'orage', 'temps|vent': 'vent', 'transmutation|vent': 'magie',
    'lumiere|vent': 'magie', 'lumiere|vie': 'magie', 'foudre|vie': 'foudre', 'foudre|lumiere': 'foudre', 'gravite|lumiere': 'trounoir', 'lumiere|transmutation': 'magie', 'foudre|gravite': 'foudre', 'foudre|temps': 'foudre', 'foudre|transmutation': 'eau',
    'gravite|temps': 'temps', 'gravite|transmutation': 'terre', 'froid|vent': 'vent', 'foudre|metal': 'foudre', 'feu|metal': 'feu', 'acide|feu': 'vent', 'acide|eau': 'eau', 'explosion|gravite': 'trounoir', 'fumee|vent': 'vent', 'foudre|lien': 'foudre', 'eau|seisme': 'eau', 'force|gravite': 'trounoir', 'terre|transmutation': 'terre',
    'feu|gravite|temps': 'soleil', 'eau|foudre|vent': 'orage', 'feu|gravite|terre': 'feu', 'eau|gravite|vie': 'eau', 'foudre|gravite|lumiere': 'foudre', 'eau|temps|terre': 'eau', 'gravite|lumiere|temps': 'magie', 'lumiere|temps|vie': 'magie' };
  const GENRE_SON = { portail: 'magie', esprit: 'magie' };
  function sonDe(ph) { if (SONS[ph.id]) return SONS[ph.id]; const I = DATA.comboInfo(ph.id); return I && GENRE_SON[I.genre] || null; }
  let uid = 0;
  function nappes(cx, cy, demiL) { const out = []; for (const ph of liste) { if (ph.mort) continue; const ty = sonDe(ph); if (!ty) continue; if (!ph.uid) ph.uid = ++uid; const d = dist(ph.x, ph.y, cx, cy); const vol = clamp(1 - d / (demiL * 1.6), 0, 1) * Math.min(1, 0.4 + 0.3 * ph.sz) * fade(ph); if (vol > 0.02) out.push({ id: ph.uid, type: ty, vol, pan: clamp((ph.x - cx) / demiL, -1, 1) }); } return out.sort((a, b) => b.vol - a.vol); }
  // ce qui survit à une sauvegarde : les phénomènes qui durent ; l'îlot, lui, retombera au chargement
  const GARDE = ['feu|gravite|temps', 'eau|foudre|vent', 'foudre|gravite|lumiere', 'lumiere|temps|vie', 'feu|gravite', 'feu|temps', 'eau|vent', 'eau|foudre', 'eau|gravite', 'eau|vie', 'lumiere|vent', 'foudre|lumiere', 'foudre|gravite', 'foudre|temps', 'gravite|temps', 'gravite|vent', 'froid|vent', 'acide|eau', 'acide|feu', 'fumee|vent', 'foudre|metal', 'feu|metal', 'terre|vent', 'vent|vie', 'feu|vent', 'feu|lumiere', 'foudre|lien'];
  function sauver() {
    const out = { phen: [], ilots: [] };
    for (const ph of liste) {
      if (ph.mort) continue;
      if ((ph.id === 'gravite|vie' || ph.id === 'eau|gravite|vie') && ph.data.c && ph.data.c.length) { out.ilots.push(ph.data.c.slice()); continue; }
      const I = DATA.comboInfo(ph.id), famille = I && (I.genre === 'portail' || I.genre === 'esprit');
      if (!(GARDE.includes(ph.id) || famille) || ph.tenu || ph.life < 2 || (ph.follow && ph.follow !== st().p) || !ph.spec.seal) continue;
      out.phen.push({ id: ph.id, seal: ph.spec.seal, x: Math.round(ph.x), y: Math.round(ph.y), rect: ph.rect || null, ligne: ph.ligne || null, life: Math.round(ph.life * 10) / 10, joueur: ph.follow === st().p, eau: ph.data.eau });
    }
    return out;
  }
  function restaurer(d) {
    if (!d) return;
    for (const c of d.ilots || []) { for (const i of c) Sim.ancrerCase(i, 0); if (c.length) Sim.fissurer(c[0]); }
    for (const q of d.phen || []) { try { const spec = W.makeSpec(Seal.clone(q.seal)); spec.combo = q.id; const ph = deployer(spec, q.x, q.y, 50, { rect: q.rect, ligne: q.ligne, follow: q.joueur ? st().p : null, silencieux: true }, null); if (ph) { ph.life = Math.min(q.life, ph.max * 1.6); if (q.eau != null) ph.data.eau = q.eau; } } catch (e) { console.warn('phénomène non restauré', q.id, e); } }
  }
  // ---------- déploiement ----------
  function defDe(id) { if (DEFS[id]) return DEFS[id]; const f = famille(id); if (f) DEFS[id] = Object.assign({ r: 50, life: 6, couleur: '#c08a3a', bouge: 'fixe' }, f); return DEFS[id] || null; }
  function decouvrir(id) {
    const pg = W.game().progress; if (!pg.combos) pg.combos = {};
    if (pg.combos[id]) { pg.combos[id]++; return; }
    pg.combos[id] = 1; const info = DATA.comboInfo(id);
    W.msg('Découverte : ' + info.nom + ' ! ' + info.desc); W.addXp(info.trio ? 50 : 20); pg.nouveau = true; W.evt('combo_decouvert', id); if (info.trio) W.evt('combo_decouvert_trio', id);
  }
  function deployer(spec, x, y, r, o = {}, dir = null) {
    const id = spec.combo; const D = id && defDe(id); if (!D) return null;
    const shape = spec.shape;
    if (shape === 'trait' && !o.ligne) return null;
    const pr0 = spec.prm || {}, sz = pr0.size || 1, pw = pr0.power || 1, du = pr0.duration || 1;
    // même lancer : on rafraîchit plutôt que d'empiler (écho, répétition, totem, rafale...)
    const memes = liste.filter((q) => q.castId === spec.castId && q.id === id && !q.mort);
    const proche = memes.find((q) => dist(q.x, q.y, x, y) < Math.max(80, q.r * 2));
    if (proche || memes.length >= (shape === 'pluie' ? 5 : 3)) { const q = proche || memes[0]; q.life = Math.max(q.life, q.max * 0.8); return q; }
    const mini = shape === 'pluie';
    const ph = { id, D, spec, x, y, vx: 0, vy: 0, r: D.r * sz * (mini ? 0.55 : 1), life: D.life * du * (mini ? 0.45 : 1), max: 0, pw, sz: sz * (mini ? 0.6 : 1), t: 0, g: 'point', castId: spec.castId, dir: dir || o.dir || { x: 1, y: 0 }, data: {}, acc: {} };
    ph.r0 = ph.r; ph.max = ph.life;
    if (o.rect) { ph.rect = { ...o.rect }; ph.g = 'rect'; ph.x = (o.rect.x0 + o.rect.x1) / 2; ph.y = (o.rect.y0 + o.rect.y1) / 2; }
    else if (shape === 'mur' && o.mur) { const mw = 30 * sz * (pr0.dimL || 1), mh = 180 * sz * (pr0.dimH || 1); ph.rect = { x0: x - mw / 2, x1: x + mw / 2, y0: y - mh / 2, y1: y + mh / 2 }; ph.g = 'rect'; }
    if (o.ligne) { ph.ligne = { ...o.ligne }; ph.g = 'ligne'; ph.x = (o.ligne.x1 + o.ligne.x2) / 2; ph.y = (o.ligne.y1 + o.ligne.y2) / 2; }
    if (o.follow) ph.follow = o.follow;
    if (o.tenu && D.life >= 2) ph.tenu = o.tenu;
    if (D.point && ph.g !== 'point') { if (ph.ligne) { ph.x = ph.ligne.x2; ph.y = ph.ligne.y2; } ph.rect = null; ph.ligne = null; ph.g = 'point'; }
    if (!ph.dir.x && !ph.dir.y) ph.dir = { x: 1, y: 0 };
    if (liste.length >= 28) { const v = liste.shift(); finir(v); }
    liste.push(ph);
    if (D.init) D.init(ph, o);
    if (!o.silencieux) { st().sp.push({ k: 'label', x: ph.x, y: ph.y - 40, txt: DATA.comboInfo(id).nom, life: 1.6, max: 1.6 }); decouvrir(id); }
    return ph;
  }
  function finir(ph, doux) { if (ph.fini) return; ph.fini = true; ph.mort = true; if (doux) { W.part(ph.x, ph.y, ph.D.couleur, 16, 70, 0.5, 3, 0, 'spark'); W.son('fizzle'); } if (ph.D.fin && !(doux && ph.D.explose)) { try { ph.D.fin(ph); } catch (e) { console.warn(e); } } if (ph.liens) for (const q of ph.liens) q.life = Math.min(q.life, 0.01); if (ph.objs) retirerPlateformes(ph); }
  // tenu : le phénomène suit la souris
  function visLigne(ph, tx, ty, k) { const L = ph.ligne, o = W.origine(); L.x1 = o.x; L.y1 = o.y; const dx = tx - o.x, dy = ty - o.y, d = Math.hypot(dx, dy) || 1; const hit = Sim.raycast(o.x + dx / d * 20, o.y + dy / d * 20, dx / d, dy / d, d - 20); const ex = hit ? hit.x : tx, ey = hit ? hit.y : ty; L.x2 += (ex - L.x2) * k; L.y2 += (ey - L.y2) * k; ph.x = (L.x1 + L.x2) / 2; ph.y = (L.y1 + L.y2) / 2; }
  function viser(ph, dt) {
    const D = ph.D; if (D.statique) return;
    const c = W.cible(ph.tenu.portee || 300), k = Math.min(1, dt * 6);
    if (D.viser) return D.viser(ph, c.x, c.y, dt);
    if (ph.ligne) return visLigne(ph, c.x, c.y, k);
    if (D.bouge === 'roule' || D.bouge === 'derive') { ph.vx = clamp((c.x - ph.x) * 3.5, -320, 320); if (Math.abs(c.x - ph.x) < 4) ph.vx = 0;
      // ce qui roule au sol monte ou descend vers le sol que vise la souris
      if (D.bouge === 'roule' && !ph.rect) { const h = D.hSol != null ? D.hSol : ph.r * 0.6, g = sol(ph.x, c.y - 10) - h; if (Math.abs(g - ph.y) < 260) deplacer(ph, 0, (g - ph.y) * k); }
      return; }
    if (ph.rect) { const R = ph.rect, cx = (R.x0 + R.x1) / 2; const dy = ph.spec.shape === 'colonne' || D.sol ? (sol(c.x, c.y - 10) - R.y1) * k : (c.y - (R.y0 + R.y1) / 2) * k; deplacer(ph, (c.x - cx) * k, dy); return; }
    if (D.sol) { const g = sol(c.x, c.y - 10); deplacer(ph, (c.x - ph.x) * k, (g - ph.y) * k); return; }
    ph.vx *= 0.5; ph.vy *= 0.5; deplacer(ph, (c.x - ph.x) * k, (c.y - ph.y) * k);
  }
  function update(dt) {
    dtC = dt;
    for (const ph of liste) {
      if (ph.mort) continue;
      const f = W.tempsDe ? W.tempsDe(ph.x, ph.y) : 1; const d = dt * f; dtC = d; if (d <= 0) continue;
      ph.t += d; ph.life -= d;
      if (ph.tenu) { if (!W.tient(ph.tenu.hand) || !W.boire(ph.tenu.drain * d)) { if (ph.D.relache) { try { ph.D.relache(ph); } catch (e) { console.warn(e); } } finir(ph, !ph.D.relache); continue; } ph.life = Math.max(ph.life, 0.6); if (ph.liens) for (const q of ph.liens) q.life = Math.max(q.life, 0.6); if (!ph.follow) viser(ph, d); }
      if (ph.follow) { const e = ph.follow; if (e.mort || (e.hp !== undefined && e.hp <= 0 && e !== st().p) || (e.life !== undefined && e.k && e.life <= 0)) { ph.life = 0; } else { const nx = e.w ? e.x + e.w / 2 : e.x, ny = e.h ? e.y + e.h / 2 : e.y; deplacer(ph, nx - ph.x, ny - ph.y); } }
      else bouger(ph, d);
      phCourant = ph;
      try { if (ph.D.tick) ph.D.tick(ph, d); } catch (e) { console.warn('phénomène', ph.id, e); ph.life = 0; }
      if (ph.life <= 0) finir(ph);
    }
    dtC = dt;
    if (liste.some((q) => q.mort)) liste = liste.filter((q) => !q.mort);
  }
  function bouger(ph, dt) {
    const b = ph.D.bouge;
    if (b === 'fixe') return;
    if ((b === 'flotte' || b === 'derive' || b === 'erre') && !ph.tenu && W.ventAt) { const [vx, vy] = W.ventAt(ph.x, ph.y); if (Math.abs(vx) + Math.abs(vy) > 0.2) { ph.vx += vx * 140 * dt; if (b !== 'derive') ph.vy += vy * 100 * dt; } }
    if (b === 'flotte') { ph.vx *= 1 - 1.2 * dt; ph.vy *= 1 - 1.2 * dt; const nx = ph.x + ph.vx * dt, ny = ph.y + ph.vy * dt; if (Sim.solidAt(nx, ny)) { ph.vx = -ph.vx * 0.5; ph.vy = -ph.vy * 0.5; } else deplacer(ph, nx - ph.x, ny - ph.y); return; }
    if (b === 'derive') { const nx = ph.x + ph.vx * dt; if (Sim.solidAt(nx + Math.sign(ph.vx) * ph.r, ph.y)) ph.vx = -ph.vx; else deplacer(ph, nx - ph.x, 0); ph.vx = clamp(ph.vx, -220, 220); return; }
    if (b === 'roule') { const nx = ph.x + ph.vx * dt; const h = ph.rect ? (ph.rect.y1 - ph.y) : ph.D.hSol != null ? ph.D.hSol : ph.r * 0.6; if (ph.vx && Sim.solidAt(nx + Math.sign(ph.vx) * 10, ph.y - Math.max(h, 14))) { ph.vx = ph.tenu ? 0 : -ph.vx * 0.6; return; } const g = W.groundBelow(nx, ph.y - 40); deplacer(ph, nx - ph.x, g != null && Math.abs(g - h - ph.y) < 80 ? (g - h - ph.y) * Math.min(1, dt * 6) : 0); return; }
    if (b === 'erre') { ph.vx += (rnd() - 0.5) * 900 * dt; ph.vy += (rnd() - 0.5) * 900 * dt - 30 * dt; ph.vx = clamp(ph.vx, -140, 140); ph.vy = clamp(ph.vy, -140, 140); const nx = ph.x + ph.vx * dt, ny = ph.y + ph.vy * dt; if (Sim.solidAt(nx, ny)) { ph.vx = -ph.vx; ph.vy = -ph.vy; } else deplacer(ph, nx - ph.x, ny - ph.y); return; }
    if (b === 'chasse') { deplacer(ph, ph.vx * dt, ph.vy * dt); return; }
    if (b === 'tombe') { ph.vy += 1500 * dt; const nx = ph.x + ph.vx * dt, ny = ph.y + ph.vy * dt; if (ph.D.trace) ph.D.trace(ph); const hit = Sim.solidAt(nx, ny + ph.r * 0.6) || st().crs.some((c) => c.hp > 0 && c.t !== 'familier' && U.circleRect(nx, ny, ph.r, c)); deplacer(ph, nx - ph.x, ny - ph.y); if (hit || ny > Sim.H * CS) { if (ph.D.impact) ph.D.impact(ph); else ph.life = 0; } }
  }
  // ---------- interactions avec les autres sorts ----------
  function reagir(core, x, y, r, prm, mode) {
    if (!liste.length) return;
    const burst = mode === 'burst', k = burst ? 1 : Math.min(1, mode * 3), pw = prm.power || 1;
    for (const ph of liste) {
      if (ph.mort || dist(x, y, ph.x, ph.y) > r + ph.r + 20) continue;
      const mobile = ph.D.bouge && ph.D.bouge !== 'fixe' && ph.D.bouge !== 'tombe' && !ph.follow;
      const dx = ph.x - x, dy = ph.y - y, d = Math.hypot(dx, dy) || 1;
      if (mobile && (core === 'vent' || core === 'son' || core === 'repulsion')) { ph.vx += dx / d * 420 * pw * k; ph.vy += dy / d * 300 * pw * k; }
      if (mobile && core === 'force') { ph.vx -= dx / d * 360 * pw * k; ph.vy -= dy / d * 300 * pw * k; }
      if (ph.D.eteint && (core === 'eau' || core === 'froid')) { ph.life -= ph.max * ph.D.eteint * 0.25 * k; W.part(ph.x, ph.y, '#dcdcdc', 6, 50, 0.6, 4, -150); if (burst) W.son('fizzle'); }
      if (ph.D.nourrit && (core === 'feu' || core === 'explosion')) { ph.life = Math.min(ph.max * 1.6, ph.life + 0.5 * k); }
      if (ph.id === 'eau|gravite' && core === 'feu') { ph.data.eau = Math.max(0, ph.data.eau - 10 * k); W.part(ph.x, ph.y, '#dcdcdc', 4, 40, 0.6, 4, -150); }
    }
  }
  function dissiper(x, y, R) { let n = 0; for (const ph of liste) if (!ph.mort && ph.t > 0.05 && dist(x, y, ph.x, ph.y) < R + ph.r) { finir(ph); n++; } return n; }
  // un projectile qui porte un combo laisse la trace du phénomène
  function trainee(s, dt) { if (!s.spec || !s.spec.combo) return; const D = defDe(s.spec.combo); if (!D) return; if (rnd() < 0.7) W.part(s.x, s.y, rnd() < 0.5 ? D.couleur : s.color, 1, 25, 0.5, 3, 0, 'spark'); }
  function lumieres() { const out = []; for (const ph of liste) { if (ph.mort) continue; if (ph.D.lumieres) { for (const l of ph.D.lumieres(ph)) out.push(l); } else if (ph.D.lum) out.push({ x: ph.x, y: ph.y, r: ph.D.lum * Math.sqrt(ph.sz) * fade(ph) }); } return out; }
  function draw(ctx, t) { for (const ph of liste) { if (ph.mort) continue; if (ph.tenu && !ph.follow) { const o = W.origine(); ctx.save(); ctx.strokeStyle = ph.D.couleur; ctx.globalAlpha = 0.45; ctx.lineWidth = 1.5; ctx.setLineDash([4, 6]); ctx.lineDashOffset = -t * 30; ctx.beginPath(); ctx.moveTo(o.x, o.y); ctx.lineTo(ph.x, ph.y); ctx.stroke(); ctx.restore(); } try { if (ph.D.draw) ph.D.draw(ctx, ph, t); else { FX.glow(ctx, ph.x, ph.y, ph.r * 1.5, ph.D.couleur, 0.35 * fade(ph)); } } catch (e) { console.warn(e); } } }
  function reset() { for (const ph of liste) if (ph.objs) retirerPlateformes(ph); liste = []; }
  return { deployer, update, draw, reagir, dissiper, trainee, lumieres, reset, defDe, nappes, sauver, restaurer, get liste() { return liste; }, DEFS };
}
