'use strict';
// ---------- Le laboratoire : scène dessinée, postes cliquables ----------
const Lab = (() => {
  const { TAU, INK } = U;
  const VW = 1280, VH = 720;
  const FLOOR = 580;
  let time = 0, hover = null, game = null;

  const SPOTS = [
    { id: 'miroir', nom: 'Miroir : changer d\'apparence', x: 70, y: 300, w: 90, h: 200 },
    { id: 'table', nom: 'Table des sceaux', x: 230, y: 380, w: 300, h: 200 },
    { id: 'chaudron', nom: 'Chaudron', x: 600, y: 390, w: 200, h: 190 },
    { id: 'grimoire', nom: 'Grimoire des découvertes', x: 860, y: 360, w: 150, h: 220 },
    { id: 'lettre', nom: 'Lettre du maître (aide)', x: 560, y: 120, w: 120, h: 90 },
    { id: 'porte', nom: 'Sortir sur le terrain d\'essai', x: 1090, y: 300, w: 130, h: 280 },
    { id: 'bac', nom: 'Bac d\'essai', x: 30, y: 70, w: 160, h: 120, labo: true },
    { id: 'alambic', nom: 'Alambic : distiller les potions', x: 200, y: 110, w: 110, h: 110, labo: true },
    { id: 'presse', nom: 'Presse à glyphes : parchemins sans encre', x: 700, y: 240, w: 150, h: 110, labo: true },
    { id: 'terrarium', nom: 'Terrarium : créatures apprivoisées', x: 1010, y: 200, w: 180, h: 100, labo: true },
  ];

  function init(g) { game = g; }
  function spotAt(x, y) { return SPOTS.find((s) => x >= s.x && x <= s.x + s.w && y >= s.y && y <= s.y + s.h) || null; }
  function locked(id) { return !(game.progress.labo && game.progress.labo[id]); }
  function update(dt, inp) {
    time += dt;
    hover = spotAt(inp.mouse.x, inp.mouse.y);
  }
  function click(x, y) { const s = spotAt(x, y); return s ? s.id : null; }

  function draw(ctx, paperPat, inp, sealEnCours) {
    ctx.save();
    ctx.fillStyle = paperPat; ctx.fillRect(0, 0, VW, VH);
    ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    // mur du fond : hachures légères + pierres
    U.hatch(ctx, 0, 0, VW, FLOOR, 14, Math.PI / 2.2, 2, 0.08);
    ctx.strokeStyle = INK; ctx.lineWidth = 1; ctx.globalAlpha = 0.25;
    const r = U.mulberry32(42);
    for (let i = 0; i < 40; i++) { const x = r() * VW, y = r() * (FLOOR - 40), w = 50 + r() * 60, h = 22 + r() * 16; U.inkRect(ctx, x, y, w, h, i, 1.2); }
    ctx.globalAlpha = 1;
    // sol
    ctx.fillStyle = 'rgba(150,120,80,0.25)'; ctx.fillRect(0, FLOOR, VW, VH - FLOOR);
    U.hatch(ctx, 0, FLOOR, VW, VH - FLOOR, 10, Math.PI / 5, 3, 0.3);
    ctx.lineWidth = 2.5; ctx.strokeStyle = INK; U.inkLine(ctx, 0, FLOOR, VW, FLOOR, 1, 1.5);
    for (let x = 60; x < VW; x += 140) { ctx.lineWidth = 1; U.inkLine(ctx, x, FLOOR, x - 30, VH, x, 1); }

    // fenêtre
    const wx = 330, wy = 100;
    const g = ctx.createRadialGradient(wx + 70, wy + 80, 10, wx + 70, wy + 80, 260);
    g.addColorStop(0, 'rgba(240,200,110,0.35)'); g.addColorStop(1, 'rgba(240,200,110,0)');
    ctx.fillStyle = g; ctx.fillRect(wx - 200, wy - 150, 560, 560);
    ctx.fillStyle = 'rgba(200,220,235,0.5)';
    ctx.beginPath(); ctx.moveTo(wx, wy + 160); ctx.lineTo(wx, wy + 60); ctx.arc(wx + 70, wy + 60, 70, Math.PI, 0); ctx.lineTo(wx + 140, wy + 160); ctx.closePath(); ctx.fill();
    ctx.lineWidth = 2.5; ctx.stroke();
    ctx.lineWidth = 1.5; U.inkLine(ctx, wx + 70, wy - 10, wx + 70, wy + 160, 5, 0.8); U.inkLine(ctx, wx, wy + 80, wx + 140, wy + 80, 6, 0.8);
    // collines derrière la fenêtre
    ctx.save(); ctx.beginPath(); ctx.moveTo(wx, wy + 160); ctx.lineTo(wx, wy + 60); ctx.arc(wx + 70, wy + 60, 70, Math.PI, 0); ctx.lineTo(wx + 140, wy + 160); ctx.closePath(); ctx.clip();
    ctx.globalAlpha = 0.5; ctx.lineWidth = 1.2;
    ctx.beginPath(); for (let x = wx; x <= wx + 140; x += 6) { const y = wy + 110 - 20 * Math.sin(x * 0.03) - 8 * Math.sin(x * 0.09); if (x === wx) ctx.moveTo(x, y); else ctx.lineTo(x, y); } ctx.stroke();
    U.inkCircle(ctx, wx + 100, wy + 30, 14, 7, 1.2);
    ctx.restore();

    // étagères avec fioles (potions en stock)
    drawShelf(ctx, 180, 230, 260);
    drawShelf(ctx, 1000, 180, 200);
    const potions = Object.entries(game.inv.potions).filter(([, n]) => n > 0);
    let px = 190;
    for (const [id, n] of potions) { const P = DATA.POTIONS[id]; for (let i = 0; i < Math.min(n, 3); i++) { drawFlask(ctx, px, 230, P.couleur, (px | 0)); px += 26; } px += 10; if (px > 420) break; }
    // bocaux d'ingrédients
    let ix = 1010;
    for (const [id, n] of Object.entries(game.inv.ingredients)) { if (n <= 0) continue; const I = DATA.INGREDIENTS[id]; drawJar(ctx, ix, 180, I.couleur, ix | 0, n); ix += 34; if (ix > 1180) break; }
    drawJar(ctx, 1150, 180, '#3b6fb6', 99, '∞'); drawJar(ctx, 1185, 180, '#555049', 98, '∞');

    // miroir
    drawSpot(ctx, 'miroir', () => {
      ctx.fillStyle = 'rgba(200,220,235,0.4)';
      ctx.beginPath(); ctx.ellipse(115, 390, 40, 85, 0, 0, TAU); ctx.fill(); ctx.lineWidth = 3; ctx.stroke();
      ctx.lineWidth = 1.5; U.inkLine(ctx, 115, 475, 115, FLOOR, 1, 0.8); U.inkLine(ctx, 95, FLOOR, 135, FLOOR, 2, 0.6);
      ctx.save(); ctx.globalAlpha = 0.5; World.drawApprenti(ctx, 115, 450, 50, game.look, -1, time, null, false); ctx.restore();
    });

    // table des sceaux
    drawSpot(ctx, 'table', () => {
      ctx.fillStyle = 'rgba(150,110,60,0.45)';
      ctx.fillRect(240, 480, 280, 16); U.inkRect(ctx, 240, 480, 280, 16, 11, 1.2);
      U.hatch(ctx, 240, 480, 280, 16, 5, 0, 12, 0.3);
      ctx.lineWidth = 2; U.inkLine(ctx, 256, 496, 250, FLOOR, 13, 0.8); U.inkLine(ctx, 504, 496, 510, FLOOR, 14, 0.8);
      // parchemin avec sceau
      ctx.fillStyle = '#f4ead2'; ctx.save(); ctx.translate(380, 470); ctx.rotate(-0.08);
      ctx.fillRect(-90, -70, 180, 80); U.inkRect(ctx, -90, -70, 180, 80, 15, 1);
      ctx.restore();
      const s = sealEnCours && sealEnCours.core ? sealEnCours : { core: 'feu', shape: 'projectile', mods: ['puissance', null, null], trigger: 'contact' };
      ctx.save(); ctx.translate(380, 430); ctx.scale(1, 0.45); Seal.draw(ctx, s, 0, 0, 60, { t: time, slots: 3, glow: true }); ctx.restore();
      // encrier et plume
      ctx.fillStyle = INK; ctx.beginPath(); ctx.arc(480, 474, 7, 0, TAU); ctx.fill();
      ctx.lineWidth = 1.5; U.inkLine(ctx, 480, 470, 500, 430, 16, 0.5);
      // bougie
      ctx.fillStyle = '#efe3c4'; ctx.fillRect(268, 452, 10, 28); U.inkRect(ctx, 268, 452, 10, 28, 17, 0.5);
      drawFlame(ctx, 273, 448, 1);
    });

    // chaudron
    drawSpot(ctx, 'chaudron', () => {
      const cx = 700, cy = 500;
      // feu
      ctx.lineWidth = 2; U.inkLine(ctx, cx - 50, FLOOR - 4, cx + 50, FLOOR - 10, 21, 1); U.inkLine(ctx, cx - 40, FLOOR - 12, cx + 44, FLOOR - 2, 22, 1);
      drawFlame(ctx, cx - 14, FLOOR - 16, 1.6); drawFlame(ctx, cx + 10, FLOOR - 14, 1.3); drawFlame(ctx, cx - 2, FLOOR - 20, 1.9);
      // pieds et cuve
      ctx.lineWidth = 3; U.inkLine(ctx, cx - 50, cy + 40, cx - 60, FLOOR - 14, 23, 0.8); U.inkLine(ctx, cx + 50, cy + 40, cx + 60, FLOOR - 14, 24, 0.8);
      ctx.fillStyle = 'rgba(40,34,30,0.85)';
      ctx.beginPath(); ctx.moveTo(cx - 80, cy - 40); ctx.quadraticCurveTo(cx - 90, cy + 60, cx, cy + 62); ctx.quadraticCurveTo(cx + 90, cy + 60, cx + 80, cy - 40); ctx.closePath(); ctx.fill(); ctx.lineWidth = 2.5; ctx.stroke();
      ctx.lineWidth = 1; ctx.strokeStyle = 'rgba(239,227,196,0.35)'; U.inkLine(ctx, cx - 60, cy - 10, cx - 50, cy + 40, 25, 1); ctx.strokeStyle = INK;
      // rebord
      ctx.fillStyle = 'rgba(60,52,46,0.9)'; ctx.beginPath(); ctx.ellipse(cx, cy - 40, 84, 14, 0, 0, TAU); ctx.fill(); ctx.lineWidth = 2.5; ctx.stroke();
      // liquide
      const coul = game.lastPotion ? DATA.POTIONS[game.lastPotion].couleur : '#5c8f3e';
      ctx.fillStyle = coul; ctx.globalAlpha = 0.85; ctx.beginPath(); ctx.ellipse(cx, cy - 40, 72, 9, 0, 0, TAU); ctx.fill(); ctx.globalAlpha = 1;
      // bulles
      for (let i = 0; i < 5; i++) { const t = (time * 0.7 + i * 0.37) % 1; const bx = cx - 50 + ((i * 37) % 100), by = cy - 40 - t * 30; ctx.globalAlpha = 1 - t; ctx.strokeStyle = coul; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.arc(bx, by, 3 + t * 4, 0, TAU); ctx.stroke(); }
      ctx.globalAlpha = 1; ctx.strokeStyle = INK;
      // louche
      ctx.lineWidth = 2; U.inkLine(ctx, cx + 30, cy - 46, cx + 70, cy - 120, 26, 0.6); ctx.fillStyle = '#6b4f2a'; ctx.beginPath(); ctx.arc(cx + 72, cy - 124, 6, 0, TAU); ctx.fill();
    });

    // grimoire sur lutrin
    drawSpot(ctx, 'grimoire', () => {
      const cx = 935;
      ctx.lineWidth = 2.5; U.inkLine(ctx, cx, FLOOR, cx, 470, 31, 0.8); U.inkLine(ctx, cx - 30, FLOOR, cx + 30, FLOOR, 32, 0.6);
      ctx.fillStyle = 'rgba(150,110,60,0.5)';
      ctx.save(); ctx.translate(cx, 470); ctx.rotate(-0.25);
      ctx.fillRect(-60, -12, 120, 12); U.inkRect(ctx, -60, -12, 120, 12, 33, 0.8);
      // livre ouvert
      ctx.fillStyle = '#f4ead2';
      ctx.beginPath(); ctx.moveTo(-56, -14); ctx.quadraticCurveTo(-28, -24, 0, -14); ctx.quadraticCurveTo(28, -24, 56, -14); ctx.lineTo(56, -70); ctx.quadraticCurveTo(28, -80, 0, -70); ctx.quadraticCurveTo(-28, -80, -56, -70); ctx.closePath(); ctx.fill(); ctx.lineWidth = 2; ctx.stroke();
      U.inkLine(ctx, 0, -14, 0, -70, 34, 0.5);
      ctx.lineWidth = 1; ctx.globalAlpha = 0.6;
      for (let i = 0; i < 5; i++) { U.inkLine(ctx, -48, -62 + i * 10, -8, -60 + i * 10, 35 + i, 0.4); U.inkLine(ctx, 8, -60 + i * 10, 48, -62 + i * 10, 40 + i, 0.4); }
      ctx.globalAlpha = 1;
      const nb = game.progress.done.length;
      Seal.glyph(ctx, 'lumiere', -28, -40, 8, '#d8a63a', 1);
      ctx.restore();
      if (game.progress.nouveau) { ctx.fillStyle = '#d8a63a'; ctx.beginPath(); ctx.arc(cx + 50, 390 + Math.sin(time * 4) * 4, 7, 0, TAU); ctx.fill(); ctx.stroke(); U.txt(ctx, '!', cx + 50, 390 + Math.sin(time * 4) * 4, 13, 'center', INK); }
      U.txt(ctx, nb + ' / ' + DATA.UNLOCKS.length + ' découvertes', cx, FLOOR + 18, 13, 'center', '#6b4f2a', 'IM Fell English', 'italic');
    });

    // lettre du maître
    drawSpot(ctx, 'lettre', () => {
      ctx.save(); ctx.translate(620, 165); ctx.rotate(0.06);
      ctx.fillStyle = '#f4ead2'; ctx.fillRect(-50, -36, 100, 72); U.inkRect(ctx, -50, -36, 100, 72, 51, 1);
      ctx.lineWidth = 1; ctx.globalAlpha = 0.6; for (let i = 0; i < 5; i++) U.inkLine(ctx, -38, -22 + i * 11, 30 + (i % 2) * 8, -22 + i * 11, 52 + i, 0.4);
      ctx.globalAlpha = 1; ctx.fillStyle = '#9a4a3a'; ctx.beginPath(); ctx.arc(34, 24, 6, 0, TAU); ctx.fill();
      ctx.restore();
      ctx.fillStyle = INK; ctx.beginPath(); ctx.arc(620, 124, 3, 0, TAU); ctx.fill();
    });

    // porte
    drawSpot(ctx, 'porte', () => {
      const x = 1110, y = 310, w = 100, h = FLOOR - 310;
      ctx.fillStyle = 'rgba(120,90,50,0.45)';
      ctx.beginPath(); ctx.moveTo(x, y + h); ctx.lineTo(x, y + 40); ctx.arc(x + w / 2, y + 40, w / 2, Math.PI, 0); ctx.lineTo(x + w, y + h); ctx.closePath(); ctx.fill(); ctx.lineWidth = 3; ctx.stroke();
      U.hatch(ctx, x + 6, y + 6, w - 12, h - 6, 7, Math.PI / 2, 61, 0.3);
      ctx.lineWidth = 1.5; U.inkLine(ctx, x + w / 2, y + 2, x + w / 2, y + h, 62, 0.8);
      ctx.fillStyle = '#d8a63a'; ctx.beginPath(); ctx.arc(x + w / 2 - 12, y + h / 2 + 20, 4, 0, TAU); ctx.fill(); ctx.stroke();
      // lumière du jour qui filtre
      ctx.fillStyle = 'rgba(240,200,110,0.25)'; ctx.fillRect(x + w / 2 - 1, y + 40, 2, h - 40);
    });

    // --- postes de l'étape 6 (scellés : estompés avec un cadenas) ---
    const sealed = (id, fn) => { const lk = locked(id); ctx.save(); if (lk) ctx.globalAlpha = 0.35; drawSpot(ctx, id, fn); ctx.restore(); if (lk) { const sp = SPOTS.find((q) => q.id === id); ctx.save(); ctx.strokeStyle = INK; ctx.lineWidth = 1.5; ctx.fillStyle = '#efe3c4'; const lx = sp.x + sp.w / 2, ly = sp.y + sp.h / 2; ctx.fillRect(lx - 7, ly - 2, 14, 11); U.inkRect(ctx, lx - 7, ly - 2, 14, 11, 1, 0.4); ctx.beginPath(); ctx.arc(lx, ly - 3, 5, Math.PI, 0); ctx.stroke(); ctx.restore(); } };
    sealed('bac', () => {
      const x = 40, y = 80, w = 140, h = 100;
      ctx.fillStyle = 'rgba(200,220,235,0.35)'; ctx.fillRect(x, y, w, h); ctx.lineWidth = 2.5; U.inkRect(ctx, x, y, w, h, 81, 1);
      ctx.fillStyle = 'rgba(163,132,79,0.5)'; ctx.fillRect(x + 4, y + h - 30, w - 8, 26); U.hatch(ctx, x + 4, y + h - 30, w - 8, 26, 5, Math.PI / 4, 82, 0.3);
      ctx.fillStyle = 'rgba(80,130,190,0.4)'; ctx.fillRect(x + 20, y + h - 46, 50, 16);
      ctx.lineWidth = 1.5; U.inkLine(ctx, x + 100, y + h - 30, x + 100, y + h - 60, 83, 0.5); ctx.fillStyle = 'rgba(92,143,62,0.5)'; ctx.beginPath(); ctx.arc(x + 100, y + h - 66, 12, 0, TAU); ctx.fill(); ctx.stroke();
      U.txt(ctx, 'bac d\'essai', x + w / 2, y + 12, 12, 'center', '#6b4f2a', 'IM Fell English', 'italic');
    });
    sealed('alambic', () => {
      const x = 255, y = 200;
      ctx.fillStyle = 'rgba(200,220,235,0.4)'; ctx.beginPath(); ctx.arc(x - 25, y - 20, 22, 0, TAU); ctx.fill(); ctx.lineWidth = 2; ctx.stroke();
      ctx.fillRect(x - 30, y - 62, 10, 22); U.inkRect(ctx, x - 30, y - 62, 10, 22, 84, 0.5);
      ctx.beginPath(); ctx.moveTo(x - 25, y - 62); ctx.quadraticCurveTo(x + 10, y - 80, x + 30, y - 40); ctx.lineTo(x + 30, y - 10); ctx.stroke();
      ctx.fillStyle = '#efe3c4'; ctx.beginPath(); ctx.moveTo(x + 24, y - 14); ctx.lineTo(x + 36, y - 14); ctx.lineTo(x + 40, y + 2); ctx.lineTo(x + 20, y + 2); ctx.closePath(); ctx.fill(); ctx.stroke();
      const coul = game.lastPotion ? DATA.POTIONS[game.lastPotion].couleur : '#c45a5a'; ctx.fillStyle = coul; ctx.globalAlpha = 0.7; ctx.beginPath(); ctx.arc(x - 25, y - 14, 14, 0, Math.PI); ctx.fill(); ctx.globalAlpha = 1;
      drawFlame(ctx, x - 25, y + 10, 0.8);
      U.inkLine(ctx, x - 55, y + 12, x + 45, y + 12, 85, 0.8);
    });
    sealed('presse', () => {
      const x = 775, y = 300;
      ctx.fillStyle = 'rgba(150,110,60,0.5)'; ctx.fillRect(x - 60, y + 30, 120, 12); U.inkRect(ctx, x - 60, y + 30, 120, 12, 86, 1);
      ctx.fillRect(x - 50, y - 50, 12, 80); U.inkRect(ctx, x - 50, y - 50, 12, 80, 87, 0.8); ctx.fillRect(x + 38, y - 50, 12, 80); U.inkRect(ctx, x + 38, y - 50, 12, 80, 88, 0.8);
      ctx.fillRect(x - 50, y - 50, 100, 10); U.inkRect(ctx, x - 50, y - 50, 100, 10, 89, 0.8);
      ctx.lineWidth = 3; U.inkLine(ctx, x, y - 40, x, y - 5, 90, 0.5); ctx.lineWidth = 2;
      ctx.fillStyle = 'rgba(60,52,46,0.8)'; ctx.fillRect(x - 30, y - 8, 60, 10); U.inkRect(ctx, x - 30, y - 8, 60, 10, 91, 0.6);
      ctx.fillStyle = '#f6eed8'; ctx.fillRect(x - 26, y + 6, 52, 22); U.inkRect(ctx, x - 26, y + 6, 52, 22, 92, 0.6);
      Seal.glyph(ctx, 'sous', x, y + 17, 7, '#6b4f2a', 1);
      ctx.beginPath(); ctx.arc(x, y - 44, 6, 0, TAU); ctx.fillStyle = '#d8a63a'; ctx.fill(); ctx.stroke();
    });
    sealed('terrarium', () => {
      const x = 1020, y = 212, w = 160, h = 85;
      ctx.fillStyle = 'rgba(200,220,235,0.3)'; ctx.fillRect(x, y, w, h); ctx.lineWidth = 2.5; U.inkRect(ctx, x, y, w, h, 93, 1);
      ctx.fillStyle = 'rgba(163,132,79,0.5)'; ctx.fillRect(x + 4, y + h - 22, w - 8, 18); U.hatch(ctx, x + 4, y + h - 22, w - 8, 18, 5, Math.PI / 4, 94, 0.3);
      ctx.fillStyle = 'rgba(92,143,62,0.5)'; ctx.beginPath(); ctx.arc(x + 30, y + h - 30, 10, 0, TAU); ctx.fill(); ctx.stroke();
      const terr = game.inv.terrarium || [];
      terr.slice(0, 4).forEach((q, i) => { const sp = DATA.ESPECES[q.t]; if (!sp) return; const cx = x + 50 + i * 32, by = y + h - 22; ctx.fillStyle = sp.couleur || '#1f1a16'; ctx.beginPath(); ctx.ellipse(cx, by - 8 + Math.sin(time * 2 + i) * 2, 10, 7, 0, 0, TAU); ctx.fill(); ctx.stroke(); ctx.fillStyle = '#efe3c4'; ctx.beginPath(); ctx.arc(cx + 4, by - 10, 2, 0, TAU); ctx.fill(); });
      U.txt(ctx, 'terrarium', x + w / 2, y + 12, 12, 'center', '#6b4f2a', 'IM Fell English', 'italic');
    });
    // l'apprenti(e), debout au milieu, qui respire
    World.drawApprenti(ctx, 570, FLOOR, 84, game.look, hover && hover.x > 570 ? 1 : -1, 0, null, false);

    // bougies au mur
    drawFlame(ctx, 150, 150, 1.1); ctx.fillStyle = '#efe3c4'; ctx.fillRect(145, 154, 10, 24); U.inkRect(ctx, 145, 154, 10, 24, 71, 0.5);
    drawFlame(ctx, 1230, 200, 1.1); ctx.fillStyle = '#efe3c4'; ctx.fillRect(1225, 204, 10, 24); U.inkRect(ctx, 1225, 204, 10, 24, 72, 0.5);

    // étiquette au survol
    if (hover) {
      ctx.save();
      ctx.font = '18px "IM Fell English", Georgia, serif';
      const w = ctx.measureText(hover.labo && locked(hover.id) ? hover.nom + ' (scellé)' : hover.nom).width + 28;
      const bx = U.clamp(inp.mouse.x - w / 2, 8, VW - w - 8), by = inp.mouse.y - 48;
      ctx.fillStyle = 'rgba(239,227,196,0.96)'; ctx.strokeStyle = INK; ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.roundRect(bx, by, w, 32, 6); ctx.fill(); ctx.stroke();
      U.txt(ctx, hover.labo && locked(hover.id) ? hover.nom + ' (scellé)' : hover.nom, bx + w / 2, by + 16, 18, 'center');
      ctx.restore();
    }
    ctx.restore();
  }

  function drawSpot(ctx, id, fn) {
    const s = SPOTS.find((q) => q.id === id);
    ctx.save();
    if (hover && hover.id === id) {
      const g = ctx.createRadialGradient(s.x + s.w / 2, s.y + s.h / 2, 10, s.x + s.w / 2, s.y + s.h / 2, Math.max(s.w, s.h) * 0.8);
      g.addColorStop(0, 'rgba(216,166,58,0.28)'); g.addColorStop(1, 'rgba(216,166,58,0)');
      ctx.fillStyle = g; ctx.fillRect(s.x - 80, s.y - 80, s.w + 160, s.h + 160);
    }
    ctx.strokeStyle = INK; ctx.lineWidth = 2;
    fn();
    ctx.restore();
  }
  function drawShelf(ctx, x, y, w) {
    ctx.save(); ctx.fillStyle = 'rgba(150,110,60,0.45)'; ctx.fillRect(x, y, w, 10); ctx.strokeStyle = INK; ctx.lineWidth = 2; U.inkRect(ctx, x, y, w, 10, x, 1);
    ctx.lineWidth = 1.5; U.inkLine(ctx, x + 10, y + 10, x + 4, y + 28, x + 1, 0.5); U.inkLine(ctx, x + w - 10, y + 10, x + w - 4, y + 28, x + 2, 0.5); ctx.restore();
  }
  function drawFlask(ctx, x, y, color, seed) {
    ctx.save(); ctx.strokeStyle = INK; ctx.lineWidth = 1.5;
    ctx.fillStyle = color; ctx.globalAlpha = 0.85;
    ctx.beginPath(); ctx.moveTo(x - 3, y - 26); ctx.lineTo(x - 3, y - 16); ctx.quadraticCurveTo(x - 11, y - 8, x - 10, y - 1); ctx.lineTo(x + 10, y - 1); ctx.quadraticCurveTo(x + 11, y - 8, x + 3, y - 16); ctx.lineTo(x + 3, y - 26); ctx.closePath(); ctx.fill(); ctx.globalAlpha = 1; ctx.stroke();
    ctx.fillStyle = '#6b4f2a'; ctx.fillRect(x - 4, y - 30, 8, 5);
    ctx.restore();
  }
  function drawJar(ctx, x, y, color, seed, n) {
    ctx.save(); ctx.strokeStyle = INK; ctx.lineWidth = 1.5;
    ctx.fillStyle = 'rgba(220,230,240,0.4)'; ctx.fillRect(x - 11, y - 26, 22, 26); U.inkRect(ctx, x - 11, y - 26, 22, 26, seed, 0.6);
    ctx.fillStyle = color; ctx.globalAlpha = 0.8; ctx.fillRect(x - 9, y - 14, 18, 13); ctx.globalAlpha = 1;
    ctx.fillStyle = '#6b4f2a'; ctx.fillRect(x - 12, y - 30, 24, 5);
    U.txt(ctx, String(n), x, y - 36, 11, 'center', '#6b4f2a');
    ctx.restore();
  }
  function drawFlame(ctx, x, y, s) {
    const f = Math.sin(time * 9 + x) * 2 * s;
    ctx.save();
    const g = ctx.createRadialGradient(x, y - 6 * s, 1, x, y - 6 * s, 26 * s);
    g.addColorStop(0, 'rgba(240,180,80,0.5)'); g.addColorStop(1, 'rgba(240,180,80,0)');
    ctx.fillStyle = g; ctx.fillRect(x - 26 * s, y - 32 * s, 52 * s, 52 * s);
    ctx.fillStyle = '#d9622b'; ctx.strokeStyle = '#8a3a1b'; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(x - 4 * s, y); ctx.quadraticCurveTo(x - 6 * s + f, y - 10 * s, x, y - 16 * s + f); ctx.quadraticCurveTo(x + 6 * s - f, y - 10 * s, x + 4 * s, y); ctx.closePath(); ctx.fill(); ctx.stroke();
    ctx.fillStyle = '#f0c060'; ctx.beginPath(); ctx.arc(x, y - 4 * s, 2 * s, 0, TAU); ctx.fill();
    ctx.restore();
  }

  return { init, update, draw, click, SPOTS };
})();
