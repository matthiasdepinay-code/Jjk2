'use strict';
// ---------- L'apprenti(e) : dessin à l'encre, poses, personnalisation ----------
const Perso = (() => {
  const { TAU, INK } = U;
  const PEAUX = ['#f3dcc0', '#e8c39e', '#c99a6e', '#9c6b45', '#6e4a30'];
  const TEINTES = ['#2a2521', '#6b4f2a', '#a3782e', '#d8b060', '#9a4a3a', '#e8e0d0', '#5a6b8a', '#c45a8a'];
  const ETOFFES = ['#6b3f73', '#2f4a7a', '#4a6b3a', '#9a4a3a', '#2a2521', '#a3782e', '#3f7a7a', '#c4a35a', '#8a3a5a', '#e8dcc0'];
  const CHAPEAUX = ['Pointu', 'Large', 'Tordu', 'Béret', 'Capuche', 'Couronne de fleurs', 'Aucun'];
  const COIFFURES = ['Court', 'Long', 'Tresse', 'Boucles', 'Chignon', 'Ras'];
  const OBJETS = ['Bâton', 'Plume', 'Grimoire', 'Baguette', 'Lanterne'];
  const ECHARPES = ['Aucune', 'Rouge', 'Moutarde', 'Vert', 'Bleu'];
  const ECH_C = [null, '#9a3a2a', '#c4a35a', '#4a6b3a', '#3a5a8a'];

  // complète un look (anciennes sauvegardes : chapeau, cape, acc seulement)
  function norm(l) {
    l = l || {};
    const capeC = (DATA.CAPES[l.cape] && DATA.CAPES[l.cape].c) || ETOFFES[0];
    return {
      nom: l.nom || '', chapeau: l.chapeau || 0, cape: l.cape || 0, acc: l.acc || 0,
      peau: l.peau != null ? l.peau : 0, coiffure: l.coiffure != null ? l.coiffure : 0, cheveux: l.cheveux != null ? l.cheveux : 1,
      chapeauC: l.chapeauC != null ? l.chapeauC : -1, robe: l.robe != null ? l.robe : -1, echarpe: l.echarpe || 0,
      _cape: capeC,
    };
  }
  const shade = (hex, k) => { const h = hex.replace('#', ''); const c = [0, 2, 4].map((i) => Math.max(0, Math.min(255, Math.round(parseInt(h.substr(i, 2), 16) * k)))); return '#' + c.map((v) => v.toString(16).padStart(2, '0')).join(''); };

  // pose : { t, vx, vy, air, cast (angle monde ou null), lumiere }
  function draw(ctx, x, y, h, look, face = 1, anim = 0, sta = null, moving = false, pose = {}) {
    const L = norm(look);
    const t = pose.t != null ? pose.t : performance.now() / 1000;
    const s = h / 50;
    ctx.save();
    ctx.translate(x, y);
    ctx.scale(s * face, s);
    ctx.lineWidth = 1.5 / Math.max(0.6, s * 0.9); ctx.strokeStyle = INK; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    if (sta && sta.invisible > 0) ctx.globalAlpha = 0.35;
    const capeC = L._cape, robeC = L.robe >= 0 ? ETOFFES[L.robe] : shade(capeC, 1.18), hatC = L.chapeauC >= 0 ? ETOFFES[L.chapeauC] : capeC;
    const peau = PEAUX[L.peau] || PEAUX[0], chev = TEINTES[L.cheveux] || TEINTES[1];
    const air = !!pose.air;
    const walk = moving && !air ? Math.sin(anim) : 0;
    const bob = moving && !air ? Math.abs(Math.sin(anim)) * 1.3 : Math.sin(t * 2.2) * 0.45;
    const vx = (pose.vx || 0) * face, vy = pose.vy || 0;
    const flot = Math.max(-1, Math.min(1, -vx / 260)) + (air ? Math.max(-0.6, Math.min(0.6, vy / 900)) : 0);
    const vague = Math.sin(t * 7 + anim * 0.5) * (0.6 + Math.abs(flot));
    const yb = bob; // décalage du buste

    // ----- cape (derrière) -----
    ctx.fillStyle = capeC;
    ctx.beginPath();
    ctx.moveTo(-4, -33 + yb);
    ctx.quadraticCurveTo(-10 + flot * 4, -24 + yb, -13 + flot * 9 + vague, -7 + (air ? -2 : 0));
    ctx.quadraticCurveTo(-6 + flot * 5, -5 + vague * 0.6, -1, -8);
    ctx.lineTo(4, -33 + yb); ctx.closePath(); ctx.fill(); ctx.stroke();
    ctx.save(); ctx.globalAlpha *= 0.5; ctx.beginPath(); ctx.moveTo(-3, -30 + yb); ctx.quadraticCurveTo(-8 + flot * 4, -20 + yb, -9 + flot * 7 + vague, -8); ctx.stroke(); ctx.restore();

    // ----- cheveux longs (derrière la tête) -----
    if (L.coiffure === 1 && L.chapeau !== 4) { ctx.fillStyle = chev; ctx.beginPath(); ctx.moveTo(-6, -44 + yb); ctx.quadraticCurveTo(-9 + flot * 2, -34 + yb, -7 + flot * 3, -27 + yb); ctx.lineTo(-1, -30 + yb); ctx.lineTo(1, -42 + yb); ctx.closePath(); ctx.fill(); ctx.stroke(); }
    if (L.coiffure === 2 && L.chapeau !== 4) { ctx.fillStyle = chev; for (let k = 0; k < 4; k++) { ctx.beginPath(); ctx.ellipse(-6 + flot * k * 0.8, -37 + yb + k * 3.4, 2.1, 2.3, 0.3, 0, TAU); ctx.fill(); ctx.stroke(); } ctx.fillStyle = '#9a3a2a'; ctx.beginPath(); ctx.arc(-6 + flot * 3, -24.5 + yb, 1.2, 0, TAU); ctx.fill(); }
    if (L.coiffure === 4 && L.chapeau !== 4) { ctx.fillStyle = chev; ctx.beginPath(); ctx.arc(-5.5, -44 + yb, 3.4, 0, TAU); ctx.fill(); ctx.stroke(); }

    // ----- bras arrière -----
    ctx.fillStyle = shade(robeC, 0.82);
    ctx.beginPath(); ctx.moveTo(-3, -31 + yb); ctx.quadraticCurveTo(-7 - walk * 3, -25 + yb, -6 - walk * 4, -19 + yb); ctx.lineTo(-3.5 - walk * 4, -19.5 + yb); ctx.quadraticCurveTo(-4, -25 + yb, -1, -30 + yb); ctx.closePath(); ctx.fill(); ctx.stroke();

    // ----- jambes et bottes -----
    const jambe = (x0, dx, lift) => { ctx.lineWidth *= 1.6; ctx.strokeStyle = '#3a2f28'; ctx.beginPath(); ctx.moveTo(x0, -12); ctx.lineTo(x0 + dx, -3 - lift); ctx.stroke(); ctx.lineWidth /= 1.6; ctx.strokeStyle = INK; ctx.fillStyle = '#4a3528'; ctx.beginPath(); ctx.ellipse(x0 + dx + 1.4, -1.6 - lift, 3.1, 1.9, 0, 0, TAU); ctx.fill(); ctx.stroke(); };
    if (air) { jambe(-2.5, -2.5, 3 + (vy < 0 ? 2 : 0)); jambe(2.5, 2, vy < 0 ? 5 : 1); }
    else { jambe(-2.5, walk * 4, Math.max(0, walk) * 1.5); jambe(2.5, -walk * 4, Math.max(0, -walk) * 1.5); }

    // ----- robe -----
    ctx.fillStyle = robeC;
    ctx.beginPath();
    ctx.moveTo(-5.5, -32 + yb); ctx.lineTo(5.5, -32 + yb);
    ctx.quadraticCurveTo(8, -20 + yb, 10.5 + flot * 1.5, -9);
    ctx.quadraticCurveTo(5, -6.5 + Math.sin(t * 5) * 0.4, 0, -8);
    ctx.quadraticCurveTo(-5, -6.5 - Math.sin(t * 5) * 0.4, -10.5 + flot * 2, -9);
    ctx.quadraticCurveTo(-8, -20 + yb, -5.5, -32 + yb);
    ctx.closePath(); ctx.fill(); ctx.stroke();
    ctx.save(); ctx.globalAlpha *= 0.45; ctx.beginPath(); ctx.moveTo(-1, -21 + yb); ctx.quadraticCurveTo(-2.5, -15, -4, -9); ctx.moveTo(3, -21 + yb); ctx.quadraticCurveTo(4.5, -15, 6, -9.5); ctx.stroke(); ctx.restore();
    // ceinture et boucle
    ctx.fillStyle = shade(robeC, 0.6); ctx.beginPath(); ctx.moveTo(-7, -23.5 + yb); ctx.lineTo(7.2, -23.5 + yb); ctx.lineTo(7.6, -21.2 + yb); ctx.lineTo(-7.4, -21.2 + yb); ctx.closePath(); ctx.fill(); ctx.stroke();
    ctx.fillStyle = '#d8a63a'; ctx.fillRect(1.2, -23.6 + yb, 2.4, 2.4); ctx.strokeRect(1.2, -23.6 + yb, 2.4, 2.4);
    // col
    ctx.fillStyle = shade(robeC, 0.75); ctx.beginPath(); ctx.moveTo(-4.5, -32 + yb); ctx.quadraticCurveTo(0, -28.5 + yb, 4.5, -32 + yb); ctx.lineTo(0, -30.5 + yb); ctx.closePath(); ctx.fill(); ctx.stroke();

    // ----- écharpe -----
    const ech = ECH_C[L.echarpe];
    if (ech) { ctx.fillStyle = ech; ctx.beginPath(); ctx.ellipse(0, -32.5 + yb, 5.6, 2.2, 0, 0, TAU); ctx.fill(); ctx.stroke(); ctx.beginPath(); ctx.moveTo(-3, -32 + yb); ctx.quadraticCurveTo(-8 + flot * 4, -31 + yb + vague * 0.6, -12 + flot * 7, -28 + yb + vague); ctx.lineTo(-11 + flot * 6, -25.5 + yb + vague); ctx.quadraticCurveTo(-7 + flot * 3, -29 + yb, -2, -30.5 + yb); ctx.closePath(); ctx.fill(); ctx.stroke(); }

    // ----- tête -----
    const hx = 0.6, hy = -40.5 + yb;
    ctx.fillStyle = peau; ctx.beginPath(); ctx.ellipse(hx, hy, 7.3, 7.6, 0, 0, TAU); ctx.fill(); ctx.stroke();
    // oreille
    ctx.beginPath(); ctx.ellipse(hx - 4.2, hy + 0.8, 1.4, 2, 0, 0, TAU); ctx.fill(); ctx.stroke();
    // visage
    const cligne = (t % 4.3) < 0.12;
    ctx.fillStyle = INK;
    if (cligne || (sta && sta.sleep > 0)) { ctx.beginPath(); ctx.moveTo(hx + 2.2, hy + 0.2); ctx.lineTo(hx + 4.6, hy + 0.2); ctx.stroke(); }
    else { ctx.beginPath(); ctx.ellipse(hx + 3.6, hy - 0.2, 1.2, 1.55, 0, 0, TAU); ctx.fill(); ctx.fillStyle = '#ffffff'; ctx.beginPath(); ctx.arc(hx + 4, hy - 0.8, 0.45, 0, TAU); ctx.fill(); }
    ctx.fillStyle = 'rgba(214,110,110,0.35)'; ctx.beginPath(); ctx.ellipse(hx + 3.6, hy + 2.9, 1.8, 1.1, 0, 0, TAU); ctx.fill();
    ctx.beginPath(); ctx.arc(hx + 4.2, hy + 3.8, 1.3, 0.2, Math.PI - 0.6); ctx.stroke();
    // cheveux devant
    if (L.chapeau !== 4 && L.coiffure !== 5) {
      ctx.fillStyle = chev; ctx.beginPath();
      if (L.coiffure === 3) { for (let k = 0; k < 6; k++) { const a = Math.PI * (0.95 + k * 0.17); ctx.moveTo(hx + Math.cos(a) * 7, hy + Math.sin(a) * 7); ctx.arc(hx + Math.cos(a) * 7, hy + Math.sin(a) * 7, 2.6, 0, TAU); } ctx.fill(); ctx.stroke(); }
      else { ctx.moveTo(hx - 7.4, hy + 1.5); ctx.quadraticCurveTo(hx - 7.5, hy - 8.5, hx + 1, hy - 8); ctx.quadraticCurveTo(hx + 7.2, hy - 7.6, hx + 7.4, hy - 2.5); ctx.quadraticCurveTo(hx + 4.5, hy - 4.6, hx + 2.6, hy - 3.4); ctx.quadraticCurveTo(hx + 1.2, hy - 5.4, hx - 1.4, hy - 3.8); ctx.quadraticCurveTo(hx - 3.5, hy - 3, hx - 4.6, hy + 2.4); ctx.closePath(); ctx.fill(); ctx.stroke(); }
    }
    if (L.coiffure === 5) { ctx.save(); ctx.globalAlpha *= 0.4; ctx.fillStyle = chev; ctx.beginPath(); ctx.arc(hx, hy - 3, 6.5, Math.PI * 1.05, Math.PI * 1.95); ctx.fill(); ctx.restore(); }

    // ----- chapeau -----
    ctx.fillStyle = hatC;
    const bande = shade(hatC, 0.6);
    const hb = hy - 5.5; // base du chapeau
    switch (L.chapeau) {
      case 0: // pointu, pointe repliée
        ctx.beginPath(); ctx.ellipse(hx, hb, 11.5, 2.6, -0.05, 0, TAU); ctx.fill(); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(hx - 6.5, hb - 0.5); ctx.quadraticCurveTo(hx - 3, hb - 12, hx - 1 + flot, hb - 18); ctx.quadraticCurveTo(hx - 5 + flot * 2, hb - 21, hx - 9 + flot * 3, hb - 18.5 + vague * 0.3); ctx.quadraticCurveTo(hx - 3, hb - 17, hx + 1.5, hb - 14); ctx.quadraticCurveTo(hx + 5, hb - 7, hx + 6.5, hb - 0.5); ctx.closePath(); ctx.fill(); ctx.stroke();
        ctx.fillStyle = bande; ctx.beginPath(); ctx.moveTo(hx - 6.3, hb - 1); ctx.lineTo(hx + 6.3, hb - 1); ctx.lineTo(hx + 5.6, hb - 3.6); ctx.lineTo(hx - 5.6, hb - 3.6); ctx.closePath(); ctx.fill(); ctx.stroke();
        break;
      case 1: // large bord
        ctx.beginPath(); ctx.ellipse(hx, hb + 0.5, 16, 3.2, -0.04, 0, TAU); ctx.fill(); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(hx - 6, hb); ctx.quadraticCurveTo(hx - 2, hb - 11, hx + 1, hb - 16); ctx.quadraticCurveTo(hx + 4, hb - 9, hx + 6, hb); ctx.closePath(); ctx.fill(); ctx.stroke();
        ctx.fillStyle = bande; ctx.fillRect(hx - 5.6, hb - 3.4, 11.2, 2.8); ctx.strokeRect(hx - 5.6, hb - 3.4, 11.2, 2.8);
        break;
      case 2: // tordu
        ctx.beginPath(); ctx.ellipse(hx, hb, 11, 2.5, 0.05, 0, TAU); ctx.fill(); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(hx - 6, hb); ctx.lineTo(hx - 3, hb - 8); ctx.lineTo(hx + 3, hb - 11); ctx.lineTo(hx - 1, hb - 15); ctx.lineTo(hx + 5 + flot * 2, hb - 21); ctx.lineTo(hx + 2.5, hb - 13.5); ctx.lineTo(hx + 6, hb - 9); ctx.lineTo(hx + 6, hb); ctx.closePath(); ctx.fill(); ctx.stroke();
        ctx.fillStyle = '#d8a63a'; ctx.beginPath(); ctx.arc(hx + 5 + flot * 2, hb - 21, 1.3, 0, TAU); ctx.fill(); ctx.stroke();
        break;
      case 3: // béret
        ctx.beginPath(); ctx.ellipse(hx - 1.5, hb - 1, 8.8, 3.6, -0.2, 0, TAU); ctx.fill(); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(hx - 1, hb - 4.5); ctx.lineTo(hx - 0.4, hb - 6.6); ctx.stroke();
        break;
      case 4: // capuche (avec la cape)
        ctx.fillStyle = capeC; ctx.beginPath(); ctx.moveTo(hx + 5.5, hy + 6.5); ctx.quadraticCurveTo(hx - 1, hy + 9, hx - 7.5, hy + 4); ctx.quadraticCurveTo(hx - 10.5 + flot * 2, hy - 4, hx - 5 + flot * 3, hy - 10.5); ctx.quadraticCurveTo(hx + 3, hy - 12, hx + 7.6, hy - 5); ctx.quadraticCurveTo(hx + 4.6, hy - 6.6, hx + 1.6, hy - 5.8); ctx.quadraticCurveTo(hx - 3.2, hy - 2, hx - 1.5, hy + 4.5); ctx.quadraticCurveTo(hx + 2, hy + 6.2, hx + 5.5, hy + 6.5); ctx.closePath(); ctx.fill(); ctx.stroke();
        break;
      case 5: // couronne de fleurs
        for (let k = 0; k < 7; k++) { const a = Math.PI * (1.0 + k * 0.155); const fx = hx + Math.cos(a) * 7.4, fy = hy - 1 + Math.sin(a) * 6.8; ctx.fillStyle = ['#e8a0b0', '#f6eed8', '#d8b060'][k % 3]; ctx.beginPath(); ctx.arc(fx, fy, 2, 0, TAU); ctx.fill(); ctx.stroke(); ctx.fillStyle = '#c4a35a'; ctx.beginPath(); ctx.arc(fx, fy, 0.7, 0, TAU); ctx.fill(); }
        ctx.fillStyle = '#5c8f3e'; ctx.beginPath(); ctx.ellipse(hx - 6.5, hy - 5.5, 2, 1, 0.8, 0, TAU); ctx.fill();
        break;
    }

    // ----- bras avant et objet -----
    let ax = 8.5, ay = -21 + yb + walk * 1.5; // main au repos
    const sx0 = 3.5, sy0 = -30.5 + yb;
    if (pose.cast != null) { let a = pose.cast; if (face < 0) a = Math.PI - a; ax = sx0 + Math.cos(a) * 10.5; ay = sy0 + Math.sin(a) * 10.5; }
    else if (air) { ax = 9.5; ay = -27 + yb; }
    ctx.fillStyle = robeC;
    ctx.beginPath(); ctx.moveTo(sx0 - 1.5, sy0 - 1); ctx.lineTo(sx0 + 1.8, sy0 - 1); ctx.lineTo(ax + 1.6, ay + 0.6); ctx.lineTo(ax - 1.8, ay + 1.8); ctx.closePath(); ctx.fill(); ctx.stroke();
    ctx.fillStyle = peau; ctx.beginPath(); ctx.arc(ax, ay, 1.9, 0, TAU); ctx.fill(); ctx.stroke();
    const glow = pose.glow || '#d8a63a';
    switch (L.acc) {
      case 0: { // bâton à cristal
        ctx.lineWidth *= 1.5; ctx.strokeStyle = '#6b4f2a'; ctx.beginPath(); ctx.moveTo(ax - 1.2, ay + 15); ctx.lineTo(ax + 1.4, ay - 17); ctx.stroke(); ctx.lineWidth /= 1.5; ctx.strokeStyle = INK;
        ctx.save(); ctx.globalCompositeOperation = 'lighter'; const g = ctx.createRadialGradient(ax + 1.6, ay - 19.5, 0.5, ax + 1.6, ay - 19.5, 7); g.addColorStop(0, U.hexA(glow, 0.55)); g.addColorStop(1, U.hexA(glow, 0)); ctx.fillStyle = g; ctx.fillRect(ax - 6, ay - 27, 15, 15); ctx.restore();
        ctx.fillStyle = glow; ctx.beginPath(); ctx.moveTo(ax + 1.6, ay - 23); ctx.lineTo(ax + 3.6, ay - 19.5); ctx.lineTo(ax + 1.6, ay - 16.5); ctx.lineTo(ax - 0.4, ay - 19.5); ctx.closePath(); ctx.fill(); ctx.stroke();
        break;
      }
      case 1: ctx.fillStyle = '#f6eed8'; ctx.beginPath(); ctx.moveTo(ax, ay); ctx.quadraticCurveTo(ax + 4, ay - 10, ax + 9, ay - 15); ctx.quadraticCurveTo(ax + 6, ay - 6, ax + 1.6, ay + 1); ctx.closePath(); ctx.fill(); ctx.stroke(); ctx.beginPath(); ctx.moveTo(ax + 0.8, ay - 0.5); ctx.lineTo(ax + 7, ay - 12); ctx.stroke(); break;
      case 2: ctx.fillStyle = '#9a4a3a'; ctx.save(); ctx.translate(ax + 2, ay - 2); ctx.rotate(-0.2); ctx.fillRect(-4, -5, 8, 10); ctx.strokeRect(-4, -5, 8, 10); ctx.fillStyle = '#efe3c4'; ctx.fillRect(-3.4, -4.4, 1.2, 8.8); ctx.fillStyle = '#d8a63a'; ctx.beginPath(); ctx.arc(1, 0, 1.4, 0, TAU); ctx.fill(); ctx.restore(); break;
      case 3: { const a = pose.cast != null ? (face < 0 ? Math.PI - pose.cast : pose.cast) : -1.1; ctx.lineWidth *= 1.2; ctx.strokeStyle = '#3a2a1e'; ctx.beginPath(); ctx.moveTo(ax, ay); ctx.lineTo(ax + Math.cos(a) * 9, ay + Math.sin(a) * 9); ctx.stroke(); ctx.lineWidth /= 1.2; ctx.fillStyle = glow; ctx.beginPath(); ctx.arc(ax + Math.cos(a) * 9.6, ay + Math.sin(a) * 9.6, 1.1, 0, TAU); ctx.fill(); ctx.strokeStyle = INK; break; }
      case 4: { // lanterne
        U.inkLine(ctx, ax, ay, ax, ay + 3, 1, 0.1);
        ctx.save(); ctx.globalCompositeOperation = 'lighter'; const g = ctx.createRadialGradient(ax, ay + 7, 1, ax, ay + 7, 12); g.addColorStop(0, 'rgba(240,190,90,0.6)'); g.addColorStop(1, 'rgba(240,190,90,0)'); ctx.fillStyle = g; ctx.fillRect(ax - 12, ay - 5, 24, 24); ctx.restore();
        ctx.fillStyle = 'rgba(240,200,110,0.85)'; ctx.fillRect(ax - 2.8, ay + 3, 5.6, 7); ctx.strokeRect(ax - 2.8, ay + 3, 5.6, 7); ctx.beginPath(); ctx.moveTo(ax - 3.4, ay + 3); ctx.lineTo(ax, ay + 1); ctx.lineTo(ax + 3.4, ay + 3); ctx.stroke();
        break;
      }
    }
    // pierre de peau
    if (sta && sta.stone > 0) { ctx.save(); ctx.globalAlpha *= 0.45; U.hatch(ctx, -11, -48, 22, 40, 3, Math.PI / 4, 1, 0.6, '#8a6b2f'); ctx.restore(); }
    ctx.restore();
  }

  return { draw, norm, PEAUX, TEINTES, ETOFFES, CHAPEAUX, COIFFURES, OBJETS, ECHARPES, ECH_C };
})();
