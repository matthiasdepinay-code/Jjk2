'use strict';
// ---------- Rendu du monde : ciel, nuit, objets, créatures, joueur, sorts ----------
// Extrait de world.js : le monde lui passe un contexte W (getters vers son état et ses fonctions).
function creerRendu(W) {
  const VW = 1280, VH = 720;
  const { TAU, INK, clamp, lerp, dist } = U;
  const CS = Sim.CS, M = Sim.M, P = Sim.P;
  function liensCircuit(ctx, o) {
    const C = W.st.circuits && W.st.circuits[o.canal]; if (!C || o.ouvert) return;
    const p = W.st.p; const d = dist(p.x, p.y, o.x, o.y); if (d > 520) return;
    ctx.save(); ctx.setLineDash([3, 6]); ctx.lineWidth = 1.3;
    for (const e of C.em) { const on = W.emetActif(e); ctx.strokeStyle = on ? '#e0b050' : 'rgba(31,26,22,0.35)'; ctx.globalAlpha = Math.min(1, (520 - d) / 200); ctx.beginPath(); const ax = e.x + e.w / 2, ay = e.y + e.h - 2, bx = o.x + o.w / 2, by = o.y + o.h - 2; ctx.moveTo(ax, ay); ctx.quadraticCurveTo((ax + bx) / 2, Math.max(ay, by) + 14, bx, by); ctx.stroke(); }
    ctx.restore();
  }
  function lights() {
    const ls = Sim.lights(W.st.cam, VW, VH);
    const p = W.st.p;
    ls.push({ x: p.x + p.w / 2, y: p.y + p.h / 2, r: p.sta.lumiere > 0 ? 320 : 130 });
    for (const l of W.PH.lumieres()) ls.push(l);
    for (const c of W.st.crs) if (c.t === 'familier' && c.hp > 0) { const F = DATA.FAMILIERS[c.espece]; if (F && F.lum) ls.push({ x: c.x + c.w / 2, y: c.y + c.h / 2, r: F.lum }); }
    for (const o of W.st.objs) {
      if (o.t === 'torche' && o.lit) ls.push({ x: o.x + o.w / 2, y: o.y + 6, r: 230 });
      if (o.burning > 0) ls.push({ x: o.x + o.w / 2, y: o.y + o.h / 2, r: 130 });
      if (o.t === 'brasier' && o.feu > 0) ls.push({ x: o.x + o.w / 2, y: o.y, r: 200 });
      if (o.t === 'lampe' && o.charge > 0) ls.push({ x: o.x + o.w / 2, y: o.y + 12, r: 180 });
      if (o.t === 'coffre' && !o.ouvert) ls.push({ x: o.x + o.w / 2, y: o.y + 10, r: 40 });
      if (o.t === 'rune' && o.revele > 0) ls.push({ x: o.x + o.w / 2, y: o.y + o.h / 2, r: 60 * o.revele });
    }
    W.GD.lumieres(ls);
    for (const c of W.st.crs) { if (c.t === 'follet' && c.hp > 0) ls.push({ x: c.x + c.w / 2, y: c.y + c.h / 2, r: 110 }); else if (c.hp > 0 && DATA.ESPECES[c.t] && DATA.ESPECES[c.t].lumineux) ls.push({ x: c.x + c.w / 2, y: c.y + c.h / 2, r: 70 }); else if (c.t === 'familier' && c.hp > 0) ls.push({ x: c.x + c.w / 2, y: c.y + c.h / 2, r: 90 }); }
    for (const s of W.st.sp) {
      if (s.k === 'field' && (s.core === 'lumiere' || s.core === 'feu')) ls.push({ x: s.x, y: s.y, r: s.r * (s.core === 'lumiere' ? 2.2 : 1.4) });
      if (s.k === 'proj' && (s.core === 'lumiere' || s.core === 'feu' || s.core === 'foudre')) ls.push({ x: s.x, y: s.y, r: s.core === 'lumiere' ? 160 : 80 });
      if (s.k === 'ring' && s.core === 'lumiere') ls.push({ x: s.x, y: s.y, r: s.r * 2 });
      if (s.k === 'beam') ls.push({ x: (s.x1 + s.x2) / 2, y: (s.y1 + s.y2) / 2, r: 120 });
    }
    for (const e of W.st.eclairs) ls.push({ x: e.x, y: e.y1, r: 400 * e.life / 0.35 });
    return ls;
  }
  function dessinerVent(ctx) {
    ctx.save(); ctx.strokeStyle = '#7aa8a8'; ctx.lineWidth = 1; ctx.lineCap = 'round';
    const pas = 48;
    for (let y = Math.floor(W.st.cam.y / pas) * pas; y < W.st.cam.y + VH; y += pas) for (let x = Math.floor(W.st.cam.x / pas) * pas; x < W.st.cam.x + VW; x += pas) {
      const ox = x + U.hash2(x, y) * pas, oy = y + U.hash2(y, x) * pas; if (Sim.solidAt(ox, oy)) continue;
      const [vx, vy] = Sim.ventAt(ox, oy), sp = Math.hypot(vx, vy); if (sp < 0.35) continue;
      const ph = (W.time * 1.2 + U.hash2(x + 7, y)) % 1, L = 14 + sp * 10, ux = vx / sp, uy = vy / sp, bx = ox + ux * (ph - 0.5) * 40, by = oy + uy * (ph - 0.5) * 40;
      ctx.globalAlpha = Math.min(0.5, (sp - 0.3) * 0.5) * Math.sin(ph * Math.PI);
      ctx.beginPath(); ctx.moveTo(bx, by); ctx.quadraticCurveTo(bx + ux * L * 0.5 - uy * 3, by + uy * L * 0.5 + ux * 3, bx + ux * L, by + uy * L); ctx.stroke();
    }
    ctx.restore();
  }
  function draw(ctx, paperPat, inp, selected) {
    const cam = W.st.cam; const p = W.st.p;
    const shx = W.st.shake > 0 ? (Math.random() - 0.5) * 6 : 0;
    const camI = { x: Math.round(cam.x) + shx, y: Math.round(cam.y) };
    ctx.save();
    ctx.fillStyle = paperPat; ctx.fillRect(0, 0, VW, VH);
    drawSky(ctx, camI);
    ctx.save(); ctx.translate(-camI.x, -camI.y);
    Sim.draw(ctx, camI, VW, VH);
    for (const o of W.st.objs) if (o.x + o.w > cam.x - 100 && o.x < cam.x + VW + 100 && o.y + o.h > cam.y - 100 && o.y < cam.y + VH + 100) drawObj(ctx, o);
    for (const k of W.st.pickups) { const ing = DATA.INGREDIENTS[k.ing]; const yy = k.y - 10 + Math.sin(k.bob * 4) * 3; ctx.save(); ctx.fillStyle = ing.couleur; ctx.strokeStyle = INK; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.arc(k.x, yy, 7, 0, TAU); ctx.fill(); ctx.stroke(); ctx.fillStyle = 'rgba(255,255,255,0.5)'; ctx.beginPath(); ctx.arc(k.x - 2, yy - 2, 2, 0, TAU); ctx.fill(); ctx.restore(); }
    for (const c of W.st.crs) if (c.hp > 0) drawCreature(ctx, c);
    W.GD.dessinerTirs(ctx, W.time);
    drawPlayer(ctx, p);
    for (const q of W.st.portails) { ctx.save(); ctx.strokeStyle = '#4fb0a0'; ctx.lineWidth = 3; ctx.globalAlpha = 0.9; ctx.beginPath(); ctx.ellipse(q.x, q.y, q.r * 0.55, q.r, 0, 0, TAU); ctx.stroke(); ctx.lineWidth = 1.2; ctx.globalAlpha = 0.5; ctx.beginPath(); ctx.ellipse(q.x, q.y, q.r * 0.3, q.r * 0.7, W.time * 2, 0, TAU); ctx.stroke(); ctx.restore(); if (Math.random() < 0.3) W.part(q.x + (Math.random() - 0.5) * 20, q.y + (Math.random() - 0.5) * 40, '#4fb0a0', 1, 10, 0.5, 2, 0, 'spark'); }
    if (W.st.lien) { ctx.save(); ctx.strokeStyle = '#c9a63a'; ctx.lineWidth = 2.5; U.inkLine(ctx, p.x + p.w / 2, p.y + p.h * 0.4, W.st.lien.x, W.st.lien.y, Math.floor(W.time * 3), 2); ctx.fillStyle = '#c9a63a'; ctx.beginPath(); ctx.arc(W.st.lien.x, W.st.lien.y, 4, 0, TAU); ctx.fill(); ctx.restore(); }
    if (W.st.control) { const c = W.st.control.c; ctx.save(); ctx.strokeStyle = '#b08ad8'; ctx.lineWidth = 2; ctx.setLineDash([4, 4]); U.inkCircle(ctx, c.x + c.w / 2, c.y + c.h / 2, Math.max(c.w, c.h) * 0.8, 2, 1.5); ctx.setLineDash([]); ctx.globalAlpha = 0.5; U.inkLine(ctx, p.x + p.w / 2, p.y + 10, c.x + c.w / 2, c.y, 3, 3); ctx.restore(); }
    for (const z of W.st.gz) drawGField(ctx, z);
    W.st.marques.forEach((mq, i) => { const q = W.posMarque(mq); if (!q) return; const last = i === W.st.marques.length - 1; ctx.save(); ctx.globalAlpha = last ? 0.95 : 0.5; const g = ctx.createRadialGradient(q.x, q.y, 2, q.x, q.y, 26); g.addColorStop(0, 'rgba(224,176,80,0.45)'); g.addColorStop(1, 'rgba(224,176,80,0)'); ctx.fillStyle = g; ctx.fillRect(q.x - 26, q.y - 26, 52, 52); ctx.translate(q.x, q.y - (mq.ent ? mq.ent.h / 2 + 12 : 0)); ctx.rotate(W.time * 0.8); Seal.glyph(ctx, 'marque', 0, 0, last ? 9 : 7, '#c08a2a', 3); ctx.restore(); });
    W.PH.draw(ctx, W.time);
    if (Sim.ventVif) dessinerVent(ctx);
    if (W.st.ordreFam === 'garder' && W.st.gardePt) { const g = W.st.gardePt, gy = W.groundBelow(g.x, g.y) || g.y; ctx.save(); ctx.strokeStyle = INK; ctx.lineWidth = 1.6; U.inkLine(ctx, g.x, gy, g.x, gy - 30, 5, 0.4); ctx.fillStyle = '#c45a8a'; ctx.beginPath(); ctx.moveTo(g.x, gy - 30); ctx.lineTo(g.x + 14 + Math.sin(W.time * 4) * 2, gy - 25); ctx.lineTo(g.x, gy - 20); ctx.closePath(); ctx.fill(); ctx.stroke(); ctx.restore(); }
    for (const s of W.st.sp) drawSpell(ctx, s);
    for (const q of W.st.parts) drawPart(ctx, q);
    // halos : feu, lave, torches, cristaux
    for (const l of Sim.lights(camI, VW, VH)) FX.glow(ctx, l.x, l.y, l.r * 0.55, l.r > 80 ? '#e0642a' : '#f0a040', 0.16);
    for (const o of W.st.objs) if (o.t === 'torche' && o.lit) FX.glow(ctx, o.x + o.w / 2, o.y + 2, 46 + Math.sin(W.time * 9 + o.seed) * 4, '#f0a040', 0.45);
    for (const e of W.st.eclairs) { FX.eclair(ctx, e.pts, '#e8d060', 3 * e.life / 0.35 + 1.2, Math.min(1, e.life * 4), e.branches); FX.glow(ctx, e.x, e.y1, 120, '#fff6c0', e.life * 2); }
    ctx.restore();
    drawRain(ctx);
    drawDark(ctx, camI);
    if (W.st.revelation && W.st.revelation.t > 0) {
      const Rv = W.st.revelation; Rv.t -= 1 / 60; const kk = Math.min(1, Rv.t / 2);
      const VIS = ['coffre', 'page', 'champignon', 'ruche', 'graine', 'rune', 'levier', 'plaque', 'brasier', 'lampe', 'roue', 'moulin', 'grille', 'stele'];
      ctx.save(); ctx.translate(-camI.x, -camI.y);
      for (const o of W.st.objs) { if (o.mort || !VIS.includes(o.t) || (o.t === 'coffre' && o.ouvert) || (o.t === 'page' && o.lue) || dist(Rv.x, Rv.y, o.x, o.y) > Rv.r) continue; const ox = o.x + o.w / 2, oy = o.y + o.h / 2; FX.glow(ctx, ox, oy, 26 + Math.sin(W.time * 4) * 4, '#f0d070', 0.55 * kk); ctx.strokeStyle = '#c08a2a'; ctx.globalAlpha = 0.8 * kk; ctx.lineWidth = 1.5; U.inkCircle(ctx, ox, oy, Math.max(o.w, o.h) * 0.7 + 6, 3, 1); ctx.globalAlpha = 1; }
      for (const q of W.st.pickups) if (dist(Rv.x, Rv.y, q.x, q.y) < Rv.r) FX.glow(ctx, q.x, q.y, 18, '#f0d070', 0.5 * kk);
      ctx.restore();
    }
    FX.vignette(ctx, VW, VH);
    W.GD.hud(ctx, VW, VH, W.time);
    { const S = W.saison(); U.txt(ctx, { printemps: '❀ Printemps', ete: '☀ Été', automne: '❧ Automne', hiver: '❄ Hiver' }[S] + ' · jour ' + ((W.st.jour || 0) + 1), VW - 20, 62, 15, 'right', 'rgba(31,26,22,0.7)', 'IM Fell English', 'italic'); }
    if (W.st.flash > 0) { ctx.fillStyle = 'rgba(255,250,220,' + (W.st.flash * 4) + ')'; ctx.fillRect(0, 0, VW, VH); }
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
    for (const o of W.st.objs) if (o.t === 'pancarte' && dist(o.x, o.y, p.x, p.y) < 120) drawBubble(ctx, o.x + o.w / 2 - camI.x, o.y - 20 - camI.y, o.texte);
    const ni = W.labelInteraction(W.findInteraction());
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
    else if (sel.type === 'parchemin') { const q = W.game.inv.parchemins[sel.nom]; return q ? trajectoire({ type: 'seal', seal: q.seal }, ax, ay) : null; }
    else return null;
    const p = W.st.p; let x = p.x + p.w / 2, y = p.y + p.h * 0.45; let dx = ax - x, dy = ay - y; const d = Math.hypot(dx, dy) || 1;
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
    const dl = W.daylight();
    ctx.save();
    // teinte du ciel : chaleur le jour, bleu nuit la nuit
    const horizon = (Sim.surf ? 125 * CS : 750) - cam.y;
    const g = ctx.createLinearGradient(0, 0, 0, Math.max(10, horizon));
    g.addColorStop(0, `rgba(${Math.round(60 + 160 * dl)},${Math.round(70 + 150 * dl)},${Math.round(120 + 90 * dl)},${0.22 + 0.2 * (1 - dl)})`);
    g.addColorStop(1, 'rgba(240,210,150,0)');
    ctx.fillStyle = g; ctx.fillRect(0, 0, VW, Math.max(10, horizon));
    // soleil / lune
    const a = (W.st.tod - 0.25) * TAU; const sx = VW * 0.5 + Math.cos(a) * VW * 0.55 - cam.x * 0.03, sy = 420 - Math.sin(a) * 380 - cam.y * 0.15;
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
    const nb = W.st.meteo.type === 'clair' ? 4 : 9;
    ctx.globalAlpha = W.st.meteo.type === 'orage' ? 0.6 : 0.3; ctx.lineWidth = 1.2;
    for (let i = 0; i < nb; i++) {
      const x = ((i * 380 + W.time * 8 - cam.x * 0.08) % (VW + 300) + VW + 300) % (VW + 300) - 150;
      const y = 60 + (i % 3) * 50 - cam.y * 0.1;
      if (W.st.meteo.type !== 'clair') { ctx.fillStyle = 'rgba(100,95,90,0.25)'; for (let k = 0; k < 5; k++) { ctx.beginPath(); ctx.arc(x + k * 22, y + (k % 2) * 6, 16, 0, TAU); ctx.fill(); } }
      for (let k = 0; k < 5; k++) U.inkCircle(ctx, x + k * 22, y + (k % 2) * 6, 14 + (k % 2) * 6, i * 10 + k, 1.2);
    }
    ctx.restore();
  }
  function drawRain(ctx) {
    if (W.st.meteo.type !== 'pluie' && W.st.meteo.type !== 'orage') return;
    if (W.saison() === 'hiver') { ctx.save(); ctx.fillStyle = '#ffffff'; ctx.strokeStyle = 'rgba(31,26,22,0.25)'; ctx.lineWidth = 0.6; const n = W.st.meteo.type === 'orage' ? 140 : 90; for (let i = 0; i < n; i++) { const x = (U.hash2(i, 9) * VW + Math.sin(W.time * 0.8 + i) * 30 + W.time * 40) % VW, y = (U.hash2(i, 4) * VH + W.time * 70 * (0.6 + U.hash2(i, 6) * 0.6)) % VH; const r = 1.4 + U.hash2(i, 3) * 1.6; ctx.beginPath(); ctx.arc(x, y, r, 0, TAU); ctx.fill(); ctx.stroke(); } ctx.restore(); return; }
    ctx.save(); ctx.strokeStyle = '#3b6fb6'; ctx.globalAlpha = 0.35; ctx.lineWidth = 1;
    const n = W.st.meteo.type === 'orage' ? 120 : 70;
    ctx.beginPath();
    for (let i = 0; i < n; i++) { const x = (U.hash2(i, 9) * VW + W.time * 300 * (0.7 + U.hash2(i, 2) * 0.6)) % VW, y = (U.hash2(i, 4) * VH + W.time * 700 * (0.8 + U.hash2(i, 6) * 0.4)) % VH; ctx.moveTo(x, y); ctx.lineTo(x - 3, y + 14); }
    ctx.stroke(); ctx.restore();
  }
  let gradProf = null, tacheLum = null;
  function calquesNuit() {
    gradProf = document.createElement('canvas'); gradProf.width = 1; gradProf.height = 180;
    { const g = gradProf.getContext('2d'); const gr = g.createLinearGradient(0, 0, 0, 180); gr.addColorStop(0, 'rgba(18,14,11,0)'); gr.addColorStop(1, 'rgba(18,14,11,0.93)'); g.fillStyle = gr; g.fillRect(0, 0, 1, 180); }
    tacheLum = document.createElement('canvas'); tacheLum.width = tacheLum.height = 128;
    { const g = tacheLum.getContext('2d'); const gr = g.createRadialGradient(64, 64, 64 * 0.15 / 1.1, 64, 64, 64 / 1.1); gr.addColorStop(0, 'rgba(0,0,0,1)'); gr.addColorStop(0.6, 'rgba(0,0,0,0.7)'); gr.addColorStop(1, 'rgba(0,0,0,0)'); g.fillStyle = gr; g.fillRect(0, 0, 128, 128); }
  }
  function drawDark(ctx, cam) {
    if (!gradProf) calquesNuit();
    const nightA = (1 - W.daylight()) * 0.62;
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
    const d = W.darkCv.getContext('2d');
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
    for (const l of cases.values()) { const R = l.r * (1 + Math.sin(W.time * 7 + l.x) * 0.04) * 1.1; d.drawImage(tacheLum, l.x - R, l.y - R, R * 2, R * 2); }
    d.globalCompositeOperation = 'source-over';
    ctx.drawImage(W.darkCv, 0, 0, VW, VH);
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
        if (o.feu > 0) { const k = Math.min(1, o.feu / 2); FX.glow(ctx, cx, o.y, 40 * k, '#f08a30', 0.5 * k); FX.flamme(ctx, cx, o.y + 7, 26 * k, 14, W.time, 0, 0.95); FX.flamme(ctx, cx - 6, o.y + 7, 14 * k, 8, W.time + 1, 0, 0.8); FX.flamme(ctx, cx + 6, o.y + 7, 16 * k, 8, W.time + 2, 0, 0.8); }
        break;
      }
      case 'roue': {
        const r = o.w / 2, cy = o.y + r; ctx.save(); ctx.translate(cx, cy); ctx.rotate(o.ang); ctx.fillStyle = 'rgba(141,106,60,0.35)';
        ctx.beginPath(); ctx.arc(0, 0, r, 0, TAU); ctx.fill(); ctx.stroke(); ctx.beginPath(); ctx.arc(0, 0, r * 0.25, 0, TAU); ctx.stroke();
        for (let i = 0; i < 8; i++) { const a = i / 8 * TAU; ctx.beginPath(); ctx.moveTo(Math.cos(a) * r * 0.25, Math.sin(a) * r * 0.25); ctx.lineTo(Math.cos(a) * r, Math.sin(a) * r); ctx.stroke(); ctx.fillStyle = '#8d6a3c'; ctx.fillRect(Math.cos(a) * r - 4, Math.sin(a) * r - 4, 8, 8); }
        ctx.restore(); ctx.strokeStyle = INK; ctx.beginPath(); ctx.moveTo(cx, cy); ctx.lineTo(cx - 10, o.y + o.h + 4); ctx.moveTo(cx, cy); ctx.lineTo(cx + 10, o.y + o.h + 4); ctx.stroke();
        if (o.eau > 0.3 && Math.random() < 0.3) W.part(cx + (Math.random() - 0.5) * o.w, o.y + o.h, '#6aa0d8', 1, 40, 0.5, 2, 400, 'goutte');
        break;
      }
      case 'moulin': {
        ctx.fillStyle = 'rgba(168,151,122,0.5)'; ctx.beginPath(); ctx.moveTo(o.x + 8, o.y + o.h); ctx.lineTo(o.x + 14, o.y + 22); ctx.lineTo(o.x + o.w - 14, o.y + 22); ctx.lineTo(o.x + o.w - 8, o.y + o.h); ctx.closePath(); ctx.fill(); ctx.stroke();
        U.hatch(ctx, o.x + 12, o.y + 26, o.w - 24, o.h - 28, 5, Math.PI / 4, 5, 0.3);
        ctx.save(); ctx.translate(cx, o.y + 20); ctx.rotate(o.ang);
        for (let i = 0; i < 4; i++) { ctx.rotate(TAU / 4); ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(0, -34); ctx.stroke(); ctx.fillStyle = 'rgba(239,227,196,0.9)'; ctx.fillRect(1, -34, 9, 24); ctx.strokeRect(1, -34, 9, 24); }
        ctx.restore(); ctx.fillStyle = INK; ctx.beginPath(); ctx.arc(cx, o.y + 20, 3, 0, TAU); ctx.fill();
        if (o.spin > 0 && Math.random() < 0.2) W.part(cx + (Math.random() - 0.5) * 60, o.y + 20 + (Math.random() - 0.5) * 50, '#bfe8e8', 1, 60, 0.5, 2, 0, 'vent');
        break;
      }
      case 'lampe': {
        const on = o.charge > 0;
        ctx.beginPath(); ctx.moveTo(cx, o.y + o.h); ctx.lineTo(cx, o.y + 24); ctx.stroke(); ctx.fillStyle = '#737e86'; ctx.fillRect(cx - 8, o.y + o.h - 4, 16, 4);
        ctx.fillStyle = on ? '#fff6c0' : 'rgba(207,227,234,0.6)'; ctx.beginPath(); ctx.moveTo(cx, o.y); ctx.lineTo(cx + 9, o.y + 12); ctx.lineTo(cx, o.y + 24); ctx.lineTo(cx - 9, o.y + 12); ctx.closePath(); ctx.fill(); ctx.stroke();
        if (on) { FX.glow(ctx, cx, o.y + 12, 34, '#e0c43a', 0.6); if (Math.random() < 0.15) W.st.sp.push({ k: 'zap', pts: FX.eclairPts(cx, o.y + 12, cx + (Math.random() - 0.5) * 40, o.y + 12 + (Math.random() - 0.5) * 40, 0.4), life: 0.1, max: 0.1 }); }
        break;
      }
      case 'stele': {
        const k = o.eveil, cle = (o.grave && o.par) || (o.veut ? o.veut[Math.floor(W.time / 2.5) % o.veut.length] : null), ess = cle ? cle.split('|') : [];
        if (o.style === 'cloche') {
          // le carillon de verre : un portique de bois, une cloche de verre qui chante... puis se brise
          ctx.strokeStyle = '#6b4f2a'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(o.x + 2, o.y + o.h); ctx.lineTo(o.x + 6, o.y + 2); ctx.lineTo(o.x + o.w - 6, o.y + 2); ctx.lineTo(o.x + o.w - 2, o.y + o.h); ctx.stroke(); ctx.lineWidth = 1.5; ctx.strokeStyle = INK;
          if (k < 0.5) {
            const sw = Math.sin(W.time * 1.7) * 0.06; ctx.save(); ctx.translate(cx, o.y + 4); ctx.rotate(sw);
            ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(0, 6); ctx.stroke();
            ctx.fillStyle = 'rgba(207,227,234,0.55)'; ctx.beginPath(); ctx.moveTo(-5, 8); ctx.quadraticCurveTo(-7, 20, -13, 32); ctx.lineTo(13, 32); ctx.quadraticCurveTo(7, 20, 5, 8); ctx.closePath(); ctx.fill(); ctx.stroke();
            ctx.strokeStyle = 'rgba(255,255,255,0.7)'; ctx.beginPath(); ctx.moveTo(-3, 12); ctx.quadraticCurveTo(-5, 22, -8, 29); ctx.stroke(); ctx.strokeStyle = INK;
            ess.forEach((e, i) => Seal.glyph(ctx, e, (i - (ess.length - 1) / 2) * 8, 24, 3.4, 'rgba(31,26,22,0.6)', i + 1));
            ctx.restore();
          } else {
            ctx.fillStyle = 'rgba(207,227,234,0.6)';
            for (let i = 0; i < 7; i++) { const fx = o.x + 6 + ((o.seed * (i + 3)) % (o.w - 12)), fy = o.y + o.h - 2 - (i % 3) * 2; ctx.beginPath(); ctx.moveTo(fx, fy); ctx.lineTo(fx + 4, fy - 3 - (i % 2) * 2); ctx.lineTo(fx + 6, fy); ctx.closePath(); ctx.fill(); ctx.stroke(); }
            ctx.beginPath(); ctx.moveTo(cx, o.y + 4); ctx.lineTo(cx, o.y + 10); ctx.stroke(); FX.glow(ctx, cx, o.y + o.h - 6, 26, '#cfe3ea', 0.3 * k);
          }
          break;
        }
        // la stèle : une dalle de pierre dressée, les essences de la fusion gravées dessus
        ctx.fillStyle = '#9b958b'; ctx.beginPath(); ctx.moveTo(o.x, o.y + o.h); ctx.lineTo(o.x + 1, o.y + 12); ctx.quadraticCurveTo(o.x + 2, o.y, cx, o.y); ctx.quadraticCurveTo(o.x + o.w - 2, o.y, o.x + o.w - 1, o.y + 12); ctx.lineTo(o.x + o.w, o.y + o.h); ctx.closePath(); ctx.fill(); ctx.stroke();
        U.hatch(ctx, o.x + 3, o.y + o.h - 16, o.w - 6, 14, 5, Math.PI / 4, o.seed, 0.25);
        ctx.fillStyle = '#7d776d'; ctx.fillRect(o.x - 4, o.y + o.h - 5, o.w + 8, 5); ctx.strokeRect(o.x - 4, o.y + o.h - 5, o.w + 8, 5);
        if (k > 0.02) FX.glow(ctx, cx, o.y + o.h * 0.4, 34 + Math.sin(W.time * 2) * 3, '#e0b050', 0.45 * k);
        const col = k > 0.5 ? '#c08a2a' : 'rgba(31,26,22,0.62)';
        ess.forEach((e, i) => { const gy = o.y + 14 + i * 15; Seal.glyph(ctx, e, cx, gy, 5, col, i + 1); if (i < ess.length - 1) { ctx.strokeStyle = col; ctx.beginPath(); ctx.moveTo(cx - 2, gy + 7.5); ctx.lineTo(cx + 2, gy + 7.5); ctx.moveTo(cx, gy + 5.5); ctx.lineTo(cx, gy + 9.5); ctx.stroke(); ctx.strokeStyle = INK; } });
        if (!o.grave && o.veut && o.veut.length > 1) for (let i = 0; i < o.veut.length; i++) { ctx.fillStyle = o.veut[i] === cle ? col : 'rgba(31,26,22,0.25)'; ctx.beginPath(); ctx.arc(cx + (i - (o.veut.length - 1) / 2) * 5, o.y + o.h - 9, 1.4, 0, TAU); ctx.fill(); }
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
        if (!o.ouvert && o.canal) { const C = W.st.circuits && W.st.circuits[o.canal]; const n = C ? C.em.filter(W.emetActif).length : 0, tot = C ? C.em.length : 1; ctx.save(); ctx.translate(cx, o.y + 18); ctx.rotate(W.time * 0.6); ctx.strokeStyle = '#c08a2a'; ctx.lineWidth = 1.4; U.inkCircle(ctx, 0, 0, 9, 3, 0.6); for (let i = 0; i < tot; i++) { const a = i / tot * TAU; ctx.fillStyle = i < n ? '#e0b050' : 'rgba(31,26,22,0.35)'; ctx.beginPath(); ctx.arc(Math.cos(a) * 9, Math.sin(a) * 9, 2.4, 0, TAU); ctx.fill(); } ctx.restore(); }
        else if (k > 0.9) FX.glow(ctx, cx, o.y + 8, 22, '#e0b050', 0.25 + 0.1 * Math.sin(W.time * 3));
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
        const wob = Math.sin(W.time * 14) * o.wob * 6;
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
          if (Math.random() < 0.15) W.part(cx, o.y, '#d9622b', 1, 20, 0.6, 2, -120);
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
        if (Math.random() < 0.05) W.part(cx, o.y, '#5a4a7d', 1, 15, 0.8, 2, -20);
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
        const fl = Math.sin(W.time * 3 + o.seed) * 3;
        ctx.save(); ctx.translate(cx, o.y + 12 + fl); ctx.rotate(Math.sin(W.time * 2 + o.seed) * 0.15);
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
      case 'familier': Familiers.dessiner(ctx, c, W.time); break;
      case 'gardien': W.GD.dessiner(ctx, c, W.time); break;
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
        if (Math.random() < 0.08) W.part(cx - c.dir * c.w * 0.4, by - 2, '#1f1a16', 1, 5, 0.8, 2, 200);
        break;
      }
      case 'follet': {
        const r = 10 * c.size;
        const g = ctx.createRadialGradient(cx, c.y + c.h / 2, 2, cx, c.y + c.h / 2, r * 3); g.addColorStop(0, 'rgba(120,220,210,0.5)'); g.addColorStop(1, 'rgba(120,220,210,0)'); ctx.fillStyle = g; ctx.fillRect(cx - r * 3, c.y + c.h / 2 - r * 3, r * 6, r * 6);
        ctx.fillStyle = c.sta.tame ? '#c45a8a' : '#3f9c9b'; ctx.strokeStyle = '#1f1a16'; ctx.lineWidth = 1.5;
        ctx.beginPath(); ctx.moveTo(cx - r, c.y + c.h / 2 + r * 0.6); ctx.quadraticCurveTo(cx - r * 1.2, c.y - r * 0.4, cx, c.y - r + Math.sin(W.time * 8) * 3); ctx.quadraticCurveTo(cx + r * 1.2, c.y - r * 0.4, cx + r, c.y + c.h / 2 + r * 0.6); ctx.quadraticCurveTo(cx, c.y + c.h + 2, cx - r, c.y + c.h / 2 + r * 0.6); ctx.fill(); ctx.stroke();
        ctx.fillStyle = '#1f1a16'; ctx.beginPath(); ctx.arc(cx - 3, c.y + c.h / 2, 1.8, 0, TAU); ctx.arc(cx + 3, c.y + c.h / 2, 1.8, 0, TAU); ctx.fill();
        break;
      }
      case 'golem': {
        const walk = Math.sin(W.time * 6) * (Math.abs(c.vx) > 10 ? 1 : 0);
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
    if (c.sta.sleep > 0 || c.dort) U.txt(ctx, 'z z', cx + 14, c.y - 10 + Math.sin(W.time * 3) * 3, 14, 'left', '#5a4a7d', 'IM Fell English', 'italic');
    if (c.sta.gele > 0) { ctx.save(); ctx.globalAlpha = 0.45 * Math.min(1, c.sta.gele); ctx.fillStyle = '#cfe8f6'; ctx.fillRect(c.x - 4, c.y - 6, c.w + 8, c.h + 8); ctx.globalAlpha = Math.min(1, c.sta.gele); ctx.strokeStyle = '#7fb4d8'; ctx.lineWidth = 1.4; ctx.strokeRect(c.x - 4, c.y - 6, c.w + 8, c.h + 8); ctx.beginPath(); ctx.moveTo(c.x + 2, c.y); ctx.lineTo(c.x + c.w * 0.4, c.y + c.h * 0.3); ctx.stroke(); ctx.restore(); }
    if (c.sta.stun > 0) { ctx.strokeStyle = '#d8a63a'; ctx.lineWidth = 1.5; for (let i = 0; i < 3; i++) { const a = W.time * 5 + (i / 3) * TAU; ctx.beginPath(); ctx.arc(cx + Math.cos(a) * 14, c.y - 8 + Math.sin(a) * 4, 2, 0, TAU); ctx.stroke(); } }
    if (!c.sta.tame && c.aff > 0 && (c.affT > 0 || dist(W.st.p.x, W.st.p.y, c.x, c.y) < 150)) { ctx.save(); const w = Math.max(24, c.w), bx = cx - w / 2, by2 = c.y - 16; ctx.fillStyle = 'rgba(239,227,196,0.85)'; ctx.fillRect(bx, by2, w, 5); ctx.fillStyle = '#c45a8a'; ctx.fillRect(bx, by2, w * c.aff / 100, 5); ctx.strokeStyle = INK; ctx.lineWidth = 1; ctx.strokeRect(bx, by2, w, 5); ctx.fillStyle = '#c45a8a'; ctx.font = '11px serif'; ctx.textAlign = 'right'; ctx.fillText('♥', bx - 2, by2 + 5); ctx.restore(); }
    if (c.sta.tame && c.t !== 'familier' && !c.controlled) { ctx.fillStyle = '#c45a8a'; ctx.font = '14px serif'; ctx.textAlign = 'center'; ctx.fillText('♥', cx, c.y - 8 + Math.sin(W.time * 3) * 2); }
    if (c.sta.lent > 0) { ctx.strokeStyle = '#8a8f9a'; ctx.lineWidth = 1; ctx.setLineDash([2, 3]); U.inkCircle(ctx, cx, c.y + c.h / 2, Math.max(c.w, c.h) * 0.7, 1, 1); ctx.setLineDash([]); }
    if (c.sta.wet > 0 && Math.random() < 0.05) W.part(cx, by - 4, '#6aa0d8', 1, 10, 0.6, 2, 300);
    if (c.hp < c.hpMax && c.t !== 'gardien') { ctx.fillStyle = 'rgba(31,26,22,0.3)'; ctx.fillRect(c.x, c.y - 6, c.w, 3); ctx.fillStyle = '#9a4a3a'; ctx.fillRect(c.x, c.y - 6, c.w * c.hp / c.hpMax, 3); }
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
    if (c.dort) U.txt(ctx, 'z', cx + c.w * 0.5, c.y - 4 + Math.sin(W.time * 2) * 2, 12, 'left', '#5a4a7d', 'IM Fell English', 'italic');
  }
  function drawApprenti(ctx, x, y, h, look, face = 1, anim = 0, sta = null, moving = false, pose = {}) { Perso.draw(ctx, x, y, h, look, face, anim, sta, moving, pose); }
  function poseJoueur(p) {
    const g = p.gestes && (p.gestes.R || p.gestes.L);
    const ch = W.game.charging && (W.game.charging.R || W.game.charging.L);
    let cast = null, glow = null;
    if (g) { cast = Math.atan2(g.aim.y - (p.y + p.h * 0.4), g.aim.x - (p.x + p.w / 2)); glow = g.color; }
    else if (ch) { const aim = W.toWorld(W.game.inp.mouse.x, W.game.inp.mouse.y); cast = Math.atan2(aim.y - (p.y + p.h * 0.4), aim.x - (p.x + p.w / 2)); glow = ch.color; }
    else if (p.lastCast && W.time - p.lastCast.t < 0.35) { cast = p.lastCast.a; glow = p.lastCast.c; }
    if (g || ch) { const d = Math.cos(cast); if (Math.abs(d) > 0.2) p.face = d > 0 ? 1 : -1; }
    const sel = W.game.hotbar[W.game.selected];
    return { t: W.time, vx: p.vx, vy: p.vy, air: !p.onGround && !p.climbing && p.liq === 0, cast, glow: glow || (sel && sel.type === 'seal' && sel.seal.core ? W.colorOf(sel.seal.core) : '#d8a63a') };
  }
  function drawForme(ctx, p) {
    const t = p.forme === 'chauve' ? 'chauve' : p.forme;
    const fake = { t, x: p.x, y: p.y, w: p.w, h: p.h, dir: p.face, face: p.face, vx: p.vx, vy: p.vy, onGround: p.onGround, sta: {}, hurt: 0, hp: 1, hpMax: 1, phase: W.time * 3, size: 1, seed: 7, hop: 0, anim: p.anim };
    ctx.save(); drawCreature(ctx, fake); ctx.restore();
    if (p.sta.forme < 3 && Math.floor(W.time * 6) % 2 === 0) FX.glow(ctx, p.x + p.w / 2, p.y + p.h / 2, p.h, '#c06aa0', 0.35);
  }
  function drawPlayer(ctx, p) {
    for (const h of ['R', 'L']) { const g = p.gestes && p.gestes[h]; const c = W.game.charging && W.game.charging[h]; if (g) FX.cercle(ctx, p.x + p.w / 2, p.y + p.h, 22 + (1 - g.t / Math.max(0.01, g.max)) * 8, W.time, g.color, 1); else if (c) { const k = Math.min(1, (performance.now() - c.t0) / 1500); if (k > 0.08) FX.cercle(ctx, p.x + p.w / 2, p.y + p.h, 18 + k * 20, W.time * (1 + k * 2), c.color || '#d8a63a', 0.5 + k * 0.5); } }
    const moving = (Math.abs(p.vx) > 20 && (p.onGround || p.climbing)) || p.sta.vol > 0;
    if (p.inv > 0 && Math.floor(W.time * 20) % 2 === 0) return;
    if (p.sta.wet > 0 && Math.random() < 0.06) W.part(p.x + p.w / 2, p.y + p.h, '#6aa0d8', 1, 10, 0.6, 2, 300);
    if (p.sta.lumiere > 0) { const g = ctx.createRadialGradient(p.x + p.w / 2, p.y + p.h / 2, 5, p.x + p.w / 2, p.y + p.h / 2, 80); g.addColorStop(0, 'rgba(216,166,58,0.35)'); g.addColorStop(1, 'rgba(216,166,58,0)'); ctx.fillStyle = g; ctx.fillRect(p.x - 80, p.y - 60, 200, 200); }
    if (p.sta.vol > 0) { ctx.save(); ctx.strokeStyle = '#6c5ab8'; ctx.lineWidth = 1.5; ctx.globalAlpha = 0.6; U.inkCircle(ctx, p.x + p.w / 2, p.y + p.h / 2, p.h * 0.7, 3 + Math.floor(W.time * 4), 2); ctx.restore(); }
    if (p.forme) { drawForme(ctx, p); return; }
    const G = p.G;
    if (G && G.mag > 0 && !(G.gx === 0 && G.gy === 1) && p.sta.vol <= 0) {
      const th = Math.atan2(G.gy, G.gx) - Math.PI / 2; const hs = Math.max(p.w, p.h);
      ctx.save(); ctx.translate(p.x + p.w / 2, p.y + p.h / 2); ctx.rotate(th);
      drawApprenti(ctx, 0, hs / 2, hs, W.game.look, p.face, p.anim, p.sta, moving || (Math.abs(p.vx) + Math.abs(p.vy) > 30 && p.onGround), poseJoueur(p));
      ctx.restore();
      ctx.save(); ctx.strokeStyle = '#6c5ab8'; ctx.globalAlpha = 0.5; ctx.lineWidth = 1.5; const cx = p.x + p.w / 2, cy = p.y + p.h / 2; ctx.beginPath(); ctx.moveTo(cx, cy); ctx.lineTo(cx + G.gx * 34, cy + G.gy * 34); ctx.stroke(); ctx.restore();
    } else {
      if (p.pg && p.pg.enclume) { ctx.save(); ctx.globalAlpha = 0.5; ctx.fillStyle = '#4a4a55'; ctx.beginPath(); ctx.ellipse(p.x + p.w / 2, p.y + p.h, p.w * 0.9, 4, 0, 0, TAU); ctx.fill(); ctx.restore(); }
      drawApprenti(ctx, p.x + p.w / 2, p.y + p.h, p.h, W.game.look, p.face, p.anim, p.sta, moving, poseJoueur(p));
    }
    for (const g of p.gestes ? [p.gestes.R, p.gestes.L] : []) {
      if (!g) continue;
      const k = 1 - g.t / Math.max(0.001, g.max); const aim = g.aim;
      const cx = p.x + p.w / 2, cy = p.y + p.h * 0.45; let dx = aim.x - cx, dy = aim.y - cy; const d = Math.hypot(dx, dy) || 1;
      const gx = cx + dx / d * 30, gy = cy + dy / d * 30;
      ctx.save(); ctx.globalAlpha = 0.4 + k * 0.6; ctx.translate(gx, gy); ctx.rotate(k * 3);
      Seal.drawMini(ctx, g.seal, 0, 0, (6 + k * 12) * (1 + (g.charge || 0) * 0.6), W.time);
      ctx.strokeStyle = g.color; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(0, 0, 8 + k * 14, -Math.PI / 2, -Math.PI / 2 + TAU * k); ctx.stroke();
      ctx.restore();
    }
    if (W.game.charging) for (const h of ['R', 'L']) { const c = W.game.charging[h]; if (!c) continue; const k = Math.min(1, (performance.now() - c.t0) / 1500); if (k < 0.1) continue; ctx.save(); ctx.strokeStyle = c.color || '#8a7a5a'; ctx.lineWidth = 2 + k * 3; ctx.globalAlpha = 0.5 + k * 0.5; const R0 = 26 + k * 22 + (h === 'L' ? 8 : 0); ctx.beginPath(); ctx.arc(p.x + p.w / 2, p.y + p.h / 2, R0, -Math.PI / 2, -Math.PI / 2 + TAU * k); ctx.stroke(); if (k >= 1) { ctx.globalAlpha = 0.3 + Math.sin(W.time * 20) * 0.2; U.inkCircle(ctx, p.x + p.w / 2, p.y + p.h / 2, R0 + 4, 3, 1.5); } ctx.restore(); }
    if (p.trap) { ctx.save(); ctx.strokeStyle = p.trap.spec.color; ctx.lineWidth = 1.5; ctx.setLineDash([4, 4]); ctx.beginPath(); ctx.arc(p.x + p.w / 2, p.y + p.h / 2, 30, W.time * 2, W.time * 2 + TAU); ctx.stroke(); ctx.restore(); }
    if (p.selfTimer) { ctx.save(); ctx.strokeStyle = p.selfTimer.spec.color; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(p.x + p.w / 2, p.y + p.h / 2, 34, -Math.PI / 2, -Math.PI / 2 + TAU * (1 - p.selfTimer.t / 2)); ctx.stroke(); ctx.restore(); }
    if (p.air !== undefined && p.air < 8 && p.liq === M.EAU) { ctx.save(); ctx.fillStyle = 'rgba(31,26,22,0.4)'; ctx.fillRect(p.x - 6, p.y - 14, p.w + 12, 4); ctx.fillStyle = '#3b6fb6'; ctx.fillRect(p.x - 6, p.y - 14, (p.w + 12) * clamp(p.air / 8, 0, 1), 4); ctx.restore(); }
  }
  function drawSpell(ctx, s) {
    ctx.save();
    switch (s.k) {
      case 'proj': {
        if (s.potion || s.liquide) {
          ctx.fillStyle = s.color; ctx.strokeStyle = INK; ctx.lineWidth = 1.5; ctx.translate(s.x, s.y); ctx.rotate(W.time * 8);
          ctx.beginPath(); ctx.moveTo(-4, -8); ctx.lineTo(-4, -3); ctx.quadraticCurveTo(-9, 3, -7, 7); ctx.lineTo(7, 7); ctx.quadraticCurveTo(9, 3, 4, -3); ctx.lineTo(4, -8); ctx.closePath(); ctx.fill(); ctx.stroke();
          ctx.fillStyle = '#6b4f2a'; ctx.fillRect(-4.5, -11, 9, 3.5); break;
        }
        if (s.matiere != null) { const a = Math.atan2(s.vy, s.vx), col = P[s.matiere].color, L2 = s.r * 2.6, W2 = s.r * 0.75; FX.ruban(ctx, s.tr, col, s.r * 0.9, 0.4); ctx.save(); ctx.translate(s.x, s.y); ctx.rotate(a); ctx.fillStyle = col; ctx.strokeStyle = INK; ctx.lineWidth = 1.4; ctx.beginPath(); ctx.moveTo(L2, 0); ctx.lineTo(0, -W2); ctx.lineTo(-L2 * 0.8, 0); ctx.lineTo(0, W2); ctx.closePath(); ctx.fill(); ctx.stroke(); ctx.globalAlpha = 0.7; ctx.strokeStyle = '#ffffff'; ctx.beginPath(); ctx.moveTo(L2 * 0.7, -1); ctx.lineTo(-L2 * 0.3, -W2 * 0.4); ctx.stroke(); ctx.restore(); break; }
        FX.ruban(ctx, s.tr, s.color, s.r * 1.4, 0.55);
        FX.glow(ctx, s.x, s.y, s.r * 3.2, s.color, 0.55);
        if (s.traj === 'boomerang') { ctx.save(); ctx.translate(s.x, s.y); ctx.rotate(W.time * 16); ctx.strokeStyle = s.color; ctx.lineWidth = 2.5; ctx.beginPath(); ctx.arc(0, 0, s.r * 1.9, 0.3, 2.6); ctx.stroke(); ctx.strokeStyle = INK; ctx.lineWidth = 1; ctx.beginPath(); ctx.arc(0, 0, s.r * 2.2, 3.4, 5.6); ctx.stroke(); ctx.restore(); }
        const ang = Math.atan2(s.vy, s.vx);
        if (s.core === 'feu') { ctx.translate(s.x, s.y); ctx.rotate(ang + Math.PI / 2); FX.flamme(ctx, 0, s.r * 0.6, s.r * 3, s.r * 1.6, W.time, s.chaud || 0); }
        else if (s.core === 'foudre') { const pts = FX.eclairPts(s.x - Math.cos(ang) * s.r * 2.5, s.y - Math.sin(ang) * s.r * 2.5, s.x + Math.cos(ang) * s.r, s.y + Math.sin(ang) * s.r, 0.45); FX.eclair(ctx, pts, '#e0c43a', 1.6); FX.glow(ctx, s.x, s.y, s.r * 1.6, '#fff6c0', 0.9); }
        else if (s.core === 'eau' || s.core === 'acide') { ctx.translate(s.x, s.y); ctx.rotate(ang); ctx.fillStyle = s.color; ctx.strokeStyle = INK; ctx.lineWidth = 1.3; ctx.beginPath(); ctx.moveTo(s.r * 1.3, 0); ctx.quadraticCurveTo(0, -s.r, -s.r * 1.1, 0); ctx.quadraticCurveTo(0, s.r, s.r * 1.3, 0); ctx.fill(); ctx.stroke(); ctx.fillStyle = 'rgba(255,255,255,0.6)'; ctx.beginPath(); ctx.arc(s.r * 0.3, -s.r * 0.3, s.r * 0.25, 0, TAU); ctx.fill(); }
        else if (s.petit) { ctx.fillStyle = s.color; ctx.beginPath(); ctx.arc(s.x, s.y, s.r, 0, TAU); ctx.fill(); }
        else { ctx.fillStyle = s.color; ctx.strokeStyle = INK; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.arc(s.x, s.y, s.r, 0, TAU); ctx.fill(); ctx.stroke(); FX.glow(ctx, s.x, s.y, s.r * 1.2, '#ffffff', 0.35); ctx.save(); ctx.translate(s.x, s.y); ctx.rotate(W.time * 4); Seal.glyph(ctx, s.core, 0, 0, s.r * 0.6, '#efe3c4', 1); ctx.restore(); }
        break;
      }
      case 'trap': ctx.strokeStyle = s.color; ctx.lineWidth = 1.5; ctx.globalAlpha = 0.6 + Math.sin(s.t * 4) * 0.2; ctx.setLineDash([6, 6]); ctx.beginPath(); ctx.ellipse(s.x, s.y, s.r, s.r * 0.5, 0, 0, TAU); ctx.stroke(); ctx.setLineDash([]); Seal.glyph(ctx, s.core, s.x, s.y, 10, s.color, 1); Seal.glyph(ctx, 'contact', s.x, s.y - 18, 5, s.color, 1); break;
      case 'timer': ctx.strokeStyle = s.color; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(s.x, s.y, 12, -Math.PI / 2, -Math.PI / 2 + TAU * (1 - s.t / (s.max || 2))); ctx.stroke(); ctx.fillStyle = s.color; ctx.beginPath(); ctx.arc(s.x, s.y, 5 + Math.sin(W.time * 20) * 1.5, 0, TAU); ctx.fill(); break;
      case 'beamtimer': { const p = W.st.p; const px = p.x + p.w / 2, py = p.y + p.h * 0.45; ctx.strokeStyle = s.color; ctx.lineWidth = 1 + (1 - s.t / (s.max || 2)) * 4; ctx.globalAlpha = 0.5; ctx.setLineDash([4, 8]); ctx.beginPath(); ctx.moveTo(px, py); ctx.lineTo(px + s.dx * 300 * s.prm.range, py + s.dy * 300 * s.prm.range); ctx.stroke(); break; }
      case 'field': {
        const a = clamp(s.life / Math.max(0.1, s.max) * 2, 0, 1) * (s.faible ? 0.3 : 0.5);
        const C = W.colorOf(s.core);
        const g = ctx.createRadialGradient(s.x, s.y, 2, s.x, s.y, s.r); g.addColorStop(0, U.hexA(C, a)); g.addColorStop(1, U.hexA(C, 0));
        ctx.fillStyle = g; ctx.beginPath(); ctx.ellipse(s.x, s.y, s.r, s.r * (s.grav ? 1 : 0.6), 0, 0, TAU); ctx.fill();
        ctx.strokeStyle = U.hexA(C, a); ctx.lineWidth = 1.5; ctx.setLineDash([3, 6]); ctx.beginPath(); ctx.ellipse(s.x, s.y, s.r, s.r * (s.grav ? 1 : 0.6), 0, 0, TAU); ctx.stroke();
        if (s.grav) { for (let i = 0; i < 5; i++) { const yy = s.y + s.r - ((W.time * 60 + i * s.r * 0.4) % (s.r * 2)); const xx = s.x + Math.sin(i * 2.1) * s.r * 0.6; ctx.beginPath(); ctx.moveTo(xx, yy + 6); ctx.lineTo(xx, yy - 4); ctx.moveTo(xx - 3, yy - 1); ctx.lineTo(xx, yy - 4); ctx.lineTo(xx + 3, yy - 1); ctx.setLineDash([]); ctx.stroke(); } }
        break;
      }
      case 'canal': ctx.strokeStyle = s.spec.color; ctx.lineWidth = 2; ctx.globalAlpha = 0.6 + Math.sin(W.time * 12) * 0.2; ctx.setLineDash([5, 5]); U.inkCircle(ctx, s.x, s.y, s.r, 3 + Math.floor(W.time * 6), 2); ctx.setLineDash([]); { const p = W.st.p; ctx.globalAlpha = 0.4; ctx.beginPath(); ctx.moveTo(p.x + p.w / 2, p.y + p.h * 0.45); ctx.lineTo(s.x, s.y); ctx.stroke(); } break;
      case 'orbit': ctx.fillStyle = s.color; ctx.strokeStyle = INK; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.arc(s.x, s.y, s.r, 0, TAU); ctx.fill(); ctx.stroke(); Seal.glyph(ctx, s.spec.core, s.x, s.y, s.r * 0.6, '#efe3c4', 1); break;
      case 'totem': { ctx.strokeStyle = INK; ctx.lineWidth = 2.5; U.inkLine(ctx, s.x, s.y, s.x, s.y - 44, 3, 0.8); ctx.fillStyle = s.color; ctx.strokeStyle = INK; U.inkPolyPath(ctx, [[s.x - 10, s.y - 44], [s.x + 10, s.y - 44], [s.x, s.y - 60]], 4, 0.6); ctx.fill(); ctx.stroke(); Seal.glyph(ctx, s.spec.core, s.x, s.y - 30, 7, s.color, 2); const pulse = 1 - s.t / 2; ctx.globalAlpha = 0.35 * (1 - pulse); ctx.strokeStyle = s.color; ctx.lineWidth = 2; ctx.beginPath(); ctx.ellipse(s.x, s.y - 20, s.r * pulse, s.r * 0.5 * pulse, 0, 0, TAU); ctx.stroke(); break; }
      case 'rain': ctx.strokeStyle = s.color; ctx.lineWidth = 1.2; ctx.globalAlpha = 0.5; for (let k = 0; k < 5; k++) U.inkCircle(ctx, s.x - s.w / 2 + k * s.w / 4, s.yTop - 10 + (k % 2) * 6, 14, k, 1.2); break;
      case 'prise': {
        const R = W.rayonPrise(s);
        FX.glow(ctx, s.x, s.y, R * 1.8, s.color, 0.35);
        let k = 0;
        for (const m in s.mats) {
          const c = P[m].color, nb = Math.min(14, 2 + Math.round(s.mats[m] / 25));
          for (let i = 0; i < nb; i++) { const a = (i / nb) * TAU + W.time * (1.2 + k * 0.4) + k; const rr = R * (0.25 + 0.55 * U.hash2(i, k + 3)); const bx = s.x + Math.cos(a) * rr, by = s.y + Math.sin(a) * rr * 0.85; ctx.fillStyle = c; ctx.globalAlpha = P[m].liquid ? 0.75 : 0.9; ctx.beginPath(); ctx.arc(bx, by, R * 0.32 + Math.sin(W.time * 6 + i) * 1.5, 0, TAU); ctx.fill(); }
          k++;
        }
        ctx.globalAlpha = 0.9; ctx.strokeStyle = INK; ctx.lineWidth = 1.6; U.inkCircle(ctx, s.x, s.y, R * 0.95 + Math.sin(W.time * 5) * 2, Math.floor(W.time * 6), 2);
        ctx.strokeStyle = s.color; ctx.lineWidth = 2; ctx.setLineDash([5, 7]); ctx.beginPath(); ctx.arc(s.x, s.y, R * 1.15, W.time * 2, W.time * 2 + TAU); ctx.stroke(); ctx.setLineDash([]);
        if (s.tenue) { const p = W.st.p; ctx.globalAlpha = 0.45; ctx.strokeStyle = s.color; ctx.lineWidth = 2; U.inkLine(ctx, p.x + p.w / 2, p.y + p.h * 0.4, s.x, s.y, Math.floor(W.time * 8), 3); }
        break;
      }
      case 'attente': { const x = s.x != null ? s.x : W.st.p.x, y = s.y != null ? s.y : W.st.p.y; ctx.strokeStyle = s.spec.color; ctx.lineWidth = 2; ctx.globalAlpha = 0.6 + Math.sin(W.time * 6) * 0.3; U.inkCircle(ctx, x, y, s.self ? 34 : 14, 3, 1); ctx.globalAlpha = 1; if (!s.self) Seal.glyph(ctx, s.spec.core, x, y, 7, s.spec.color, 1); U.txt(ctx, 'F', x + (s.self ? 26 : 14), y - (s.self ? 26 : 14), 12, 'center', INK); break; }
      case 'repeat': { const k = 1 - s.t / s.max; ctx.strokeStyle = s.spec.color; ctx.globalAlpha = 0.5; ctx.lineWidth = 1.5; const x = s.self ? W.st.p.x + W.st.p.w / 2 : s.x, y = s.self ? W.st.p.y + W.st.p.h / 2 : s.y; ctx.beginPath(); ctx.arc(x, y, 16, -Math.PI / 2, -Math.PI / 2 + TAU * k); ctx.stroke(); U.txt(ctx, '×' + s.left, x + 18, y - 16, 10, 'left', '#6b4f2a'); break; }
      case 'expire': { ctx.globalAlpha = 0.35; Seal.glyph(ctx, 'expiration', s.x, s.y - 22, 6, s.spec.color, 2); break; }
      case 'bouclier': { const span = 1.05; ctx.lineCap = 'round'; ctx.strokeStyle = s.spec.color; ctx.globalAlpha = 0.35 + 0.5 * Math.min(1, s.life / 0.5); ctx.lineWidth = 9 * s.spec.prm.size; ctx.beginPath(); ctx.arc(s.x, s.y, s.r, s.a - span, s.a + span); ctx.stroke(); ctx.globalAlpha = 0.9; ctx.strokeStyle = INK; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.arc(s.x, s.y, s.r + 5 * s.spec.prm.size, s.a - span, s.a + span); ctx.stroke(); ctx.beginPath(); ctx.arc(s.x, s.y, s.r - 5 * s.spec.prm.size, s.a - span, s.a + span); ctx.stroke(); Seal.glyph(ctx, s.spec.core, s.x + Math.cos(s.a) * s.r, s.y + Math.sin(s.a) * s.r, 7, '#efe3c4', 2); break; }
      case 'vague': { const r = s.r, d = s.dir; ctx.save(); FX.glow(ctx, s.x, s.y - r * 0.5, r * 1.6, s.color, 0.4); ctx.strokeStyle = s.color; ctx.lineCap = 'round'; ctx.lineWidth = 4; ctx.globalAlpha = 0.85;
        ctx.beginPath(); ctx.moveTo(s.x - d * r * 1.3, s.y); ctx.quadraticCurveTo(s.x - d * r * 0.2, s.y - r * 1.7, s.x + d * r * 0.7, s.y - r * 0.9); ctx.quadraticCurveTo(s.x + d * r * 0.35, s.y - r * 0.55, s.x + d * r * 0.55, s.y - r * 0.2); ctx.stroke();
        ctx.lineWidth = 1.5; ctx.strokeStyle = INK; ctx.globalAlpha = 0.6; ctx.beginPath(); ctx.moveTo(s.x - d * r * 1.1, s.y - 2); ctx.quadraticCurveTo(s.x - d * r * 0.3, s.y - r * 1.3, s.x + d * r * 0.4, s.y - r * 0.8); ctx.stroke(); ctx.restore(); break; }
      case 'colonne': { const k = Math.min(1, s.life / 0.4, (s.max - s.life) / 0.2); ctx.save(); FX.glow(ctx, s.x, s.y - s.h * 0.5, s.w * 3, s.color, 0.35 * k); ctx.globalAlpha = 0.35 * k; ctx.fillStyle = s.color;
        ctx.beginPath(); ctx.moveTo(s.x - s.w, s.y); for (let i = 0; i <= 12; i++) { const f = i / 12; ctx.lineTo(s.x - s.w * (1 - f * 0.3) + Math.sin(W.time * 9 + f * 8) * 3, s.y - f * s.h); } for (let i = 12; i >= 0; i--) { const f = i / 12; ctx.lineTo(s.x + s.w * (1 - f * 0.3) + Math.sin(W.time * 9 + f * 8 + 2) * 3, s.y - f * s.h); } ctx.closePath(); ctx.fill();
        ctx.globalAlpha = 0.8 * k; ctx.strokeStyle = s.color; ctx.lineWidth = 1.5; for (let j = -1; j <= 1; j += 2) { ctx.beginPath(); for (let i = 0; i <= 12; i++) { const f = i / 12; const xx = s.x + j * s.w * 0.5 + Math.sin(W.time * 12 + f * 10 + j) * 4, yy = s.y - ((f + W.time * 1.5) % 1) * s.h; if (i) ctx.lineTo(xx, yy); else ctx.moveTo(xx, yy); } ctx.stroke(); } ctx.restore(); break; }
      case 'bulle': {
        if (s.rect) { const kk = Math.min(1, s.life / 0.5, (s.max - s.life) / 0.3), R2 = s.rect, w = R2.x1 - R2.x0, h = R2.y1 - R2.y0, C2 = s.mode === 'vite' ? '#9aa0ae' : s.mode === 'fige' ? '#9aa8c8' : '#6a80c0';
          ctx.save(); ctx.globalAlpha = 0.13 * kk; ctx.fillStyle = s.mode === 'vite' ? '#e8e4d8' : '#a8b8e8'; ctx.fillRect(R2.x0, R2.y0, w, h); ctx.globalAlpha = 0.7 * kk; ctx.strokeStyle = C2; ctx.lineWidth = 2; ctx.strokeRect(R2.x0, R2.y0, w, h);
          const nc = Math.max(1, Math.round(Math.max(w, h) / 90)); for (let i = 0; i < nc; i++) { const f = (i + 0.5) / nc, cx2 = w > h ? R2.x0 + f * w : R2.x0 + w / 2, cy2 = w > h ? R2.y0 + h / 2 : R2.y0 + f * h, rr = Math.min(w, h) * 0.32; ctx.lineWidth = 1.2; U.inkCircle(ctx, cx2, cy2, rr, 5 + i, 1); const t2 = s.mode === 'vite' ? W.time * 9 : s.mode === 'fige' ? 0.6 : W.time * 0.15; ctx.beginPath(); ctx.moveTo(cx2, cy2); ctx.lineTo(cx2 + Math.cos(t2 - Math.PI / 2) * rr * 0.8, cy2 + Math.sin(t2 - Math.PI / 2) * rr * 0.8); ctx.stroke(); }
          ctx.restore(); break; }
        const kk = Math.min(1, s.life / 0.5, (s.max - s.life) / 0.3), vite = s.mode === 'vite', C = vite ? '#9aa0ae' : '#6a80c0';
        ctx.save(); ctx.globalAlpha = 0.12 * kk; ctx.fillStyle = vite ? '#e8e4d8' : '#a8b8e8'; ctx.beginPath(); ctx.arc(s.x, s.y, s.r, 0, TAU); ctx.fill();
        ctx.globalAlpha = 0.75 * kk; ctx.strokeStyle = C; ctx.lineWidth = 2; U.inkCircle(ctx, s.x, s.y, s.r, 4, 1.2); ctx.lineWidth = 1; U.inkCircle(ctx, s.x, s.y, s.r * 0.88, 5, 1);
        for (let i = 0; i < 12; i++) { const a = i / 12 * TAU; ctx.beginPath(); ctx.moveTo(s.x + Math.cos(a) * s.r * 0.88, s.y + Math.sin(a) * s.r * 0.88); ctx.lineTo(s.x + Math.cos(a) * s.r * (i % 3 ? 0.82 : 0.76), s.y + Math.sin(a) * s.r * (i % 3 ? 0.82 : 0.76)); ctx.stroke(); }
        const t = vite ? W.time * 9 : s.mode === 'fige' ? 0.6 : W.time * 0.15; ctx.lineWidth = 2.4; ctx.beginPath(); ctx.moveTo(s.x, s.y); ctx.lineTo(s.x + Math.cos(t - Math.PI / 2) * s.r * 0.6, s.y + Math.sin(t - Math.PI / 2) * s.r * 0.6); ctx.stroke();
        ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(s.x, s.y); ctx.lineTo(s.x + Math.cos(t / 12 - Math.PI / 2) * s.r * 0.38, s.y + Math.sin(t / 12 - Math.PI / 2) * s.r * 0.38); ctx.stroke();
        if (!vite) { ctx.lineWidth = 1; ctx.globalAlpha = 0.35 * kk; for (let w = 1; w <= 2; w++) { ctx.beginPath(); for (let i = 0; i <= 40; i++) { const a = i / 40 * TAU; const rr = s.r * (0.5 + w * 0.15) + Math.sin(a * 6 + W.time * 0.8) * 3; if (i) ctx.lineTo(s.x + Math.cos(a) * rr, s.y + Math.sin(a) * rr); else ctx.moveTo(s.x + Math.cos(a) * rr, s.y + Math.sin(a) * rr); } ctx.stroke(); } }
        ctx.restore(); break; }
      case 'tornade': { const kk = Math.min(1, s.life / 0.6, (s.max - s.life) / 0.4); ctx.lineCap = 'round';
        for (let i = 0; i < 16; i++) { const f = i / 16; const yy = s.y - f * s.h; const w = s.r * (0.22 + f * 0.95); const ph = W.time * 8 + i * 0.55; const ox = Math.sin(W.time * 2 + f * 4 + s.ph) * 10 * f;
          ctx.globalAlpha = (0.25 + 0.45 * (1 - f)) * kk; ctx.strokeStyle = i % 3 ? '#9fd0cc' : '#3f9c9b'; ctx.lineWidth = 1.2 + (1 - f) * 1.5;
          ctx.beginPath(); ctx.ellipse(s.x + ox, yy, w, w * 0.2, 0, ph % TAU, ph % TAU + 3.8); ctx.stroke(); }
        break; }
      case 'singularite': { const t = 1 - s.life / s.max; ctx.strokeStyle = '#9a4a8c'; ctx.lineWidth = 2; for (let k = 0; k < 4; k++) { ctx.globalAlpha = 0.6; ctx.beginPath(); ctx.arc(s.x, s.y, (s.r * 0.6) * (1 - ((t * 3 + k * 0.25) % 1)), 0, TAU); ctx.stroke(); } ctx.fillStyle = '#1f1a16'; ctx.globalAlpha = 1; ctx.beginPath(); ctx.arc(s.x, s.y, 6 + Math.sin(W.time * 20) * 2, 0, TAU); ctx.fill(); break; }
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
      for (let i = 0; i < n; i++) { const u = U.hash2(i, 3), v = (W.time * (0.4 + z.mag * 0.35) + U.hash2(i, 5)) % 1; const ax = R2.x0 + (z.gx === 0 ? u * w : (z.gx > 0 ? v : 1 - v) * w), ay = R2.y0 + (z.gy === 0 ? u * h : (z.gy > 0 ? v : 1 - v) * h); if (z.mag === 0) { ctx.beginPath(); ctx.arc(ax, ay, 2.5, 0, TAU); ctx.stroke(); continue; } const px = -z.gy, py = z.gx; ctx.beginPath(); ctx.moveTo(ax - z.gx * 9, ay - z.gy * 9); ctx.lineTo(ax, ay); ctx.moveTo(ax - z.gx * 4 + px * 3, ay - z.gy * 4 + py * 3); ctx.lineTo(ax, ay); ctx.lineTo(ax - z.gx * 4 - px * 3, ay - z.gy * 4 - py * 3); ctx.stroke(); }
      ctx.restore(); return;
    }
    ctx.strokeStyle = '#6c5ab8'; ctx.globalAlpha = 0.55 * a; ctx.lineWidth = 1.5; ctx.setLineDash([4, 6]);
    U.inkCircle(ctx, z.x, z.y, z.r, 7, 2); ctx.setLineDash([]);
    ctx.globalAlpha = 0.08 * a; ctx.fillStyle = '#6c5ab8'; ctx.beginPath(); ctx.arc(z.x, z.y, z.r, 0, TAU); ctx.fill();
    ctx.globalAlpha = 0.6 * a; ctx.lineWidth = 1.5;
    const n = 7;
    for (let i = 0; i < n; i++) {
      const u = U.hash2(i, 3) * 2 - 1, v = ((W.time * (0.3 + z.mag * 0.25) + i / n) % 1) * 2 - 1;
      if (z.mag === 0) { const ax = z.x + Math.cos(i * 2.4 + W.time * 0.5) * z.r * 0.6, ay = z.y + Math.sin(i * 1.7 + W.time * 0.7) * z.r * 0.6; ctx.beginPath(); ctx.arc(ax, ay, 3, 0, TAU); ctx.stroke(); continue; }
      const px = -z.gy, py = z.gx;
      const ax = z.x + px * u * z.r * 0.7 + z.gx * v * z.r * 0.7, ay = z.y + py * u * z.r * 0.7 + z.gy * v * z.r * 0.7;
      ctx.beginPath(); ctx.moveTo(ax - z.gx * 8, ay - z.gy * 8); ctx.lineTo(ax + z.gx * 4, ay + z.gy * 4);
      ctx.moveTo(ax + z.gx * 4 + px * 3 - z.gx * 4, ay + z.gy * 4 + py * 3 - z.gy * 4); ctx.lineTo(ax + z.gx * 4, ay + z.gy * 4); ctx.lineTo(ax + z.gx * 4 - px * 3 - z.gx * 4, ay + z.gy * 4 - py * 3 - z.gy * 4);
      ctx.stroke();
    }
    ctx.restore();
  }
  function drawPart(ctx, q) {
    if (FX.particule(ctx, q, W.time) !== false) return;
    const a = clamp(q.life / q.max, 0, 1);
    ctx.save(); ctx.globalAlpha = a; ctx.fillStyle = q.color; ctx.strokeStyle = q.color;
    if (q.type === 'spark') { ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(q.x - q.size, q.y); ctx.lineTo(q.x + q.size, q.y); ctx.moveTo(q.x, q.y - q.size); ctx.lineTo(q.x, q.y + q.size); ctx.stroke(); }
    else if (q.type === 'feuille') { ctx.beginPath(); ctx.ellipse(q.x, q.y, q.size * 1.4, q.size * 0.7, q.life * 3, 0, TAU); ctx.fill(); }
    else if (q.type === 'coeur') { ctx.font = (q.size * 4) + 'px serif'; ctx.textAlign = 'center'; ctx.fillText('♥', q.x, q.y); }
    else { ctx.beginPath(); ctx.arc(q.x, q.y, q.size * (0.5 + a * 0.5), 0, TAU); ctx.fill(); }
    ctx.restore();
  }
  return { draw, trajectoire, drawBubble, drawSky, drawRain, calquesNuit, drawDark, drawObj, drawCreature, drawEspece, drawApprenti, poseJoueur, drawForme, drawPlayer, drawSpell, drawGField, drawPart, liensCircuit, dessinerVent, lights };
}
