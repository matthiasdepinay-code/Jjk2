'use strict';
// ---------- Gribouille & Grum, les mascottes : dessin à l'encre, d'après la planche de design ----------
// Gribouille : un petit mage d'encre à un seul grand œil, théâtral et curieux, sous un grand chapeau magenta rapiécé (étiquette « G »).
// Grum : un golem de pierre simple, loyal et gourmand, coiffé de mousse, yeux dorés, une rune sur la poitrine.
// Chaque dessin a son repère au pied, tourné vers la droite (on retourne le contexte pour la gauche).
const Mascottes = (() => {
  const TAU = Math.PI * 2, INK = U.INK;
  const trait = (ctx, pts, close = false) => { ctx.beginPath(); pts.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y))); if (close) ctx.closePath(); };
  const etoile = (ctx, x, y, r, n = 4) => { ctx.beginPath(); for (let i = 0; i < n * 2; i++) { const a = i / (n * 2) * TAU - Math.PI / 2, q = i % 2 ? r * 0.38 : r; ctx.lineTo(x + Math.cos(a) * q, y + Math.sin(a) * q); } ctx.closePath(); };

  // ---------- tenues (couleurs et attributs) ----------
  const TENUES = {
    gribouille: {
      classique:   { nom: 'Gribouille classique', corps: '#1f1a22', reflet: '#3d3348', chapeau: '#a8307e', ombre: '#6e1d55', dessous: '#4e1440', pieces: '#e8d4a8' },
      arcaniste:   { nom: 'Arcaniste', corps: '#1f1a22', reflet: '#3d3348', chapeau: '#2c4290', ombre: '#1b2a60', dessous: '#131d44', etoiles: '#e8c858', bande: '#d8b040' },
      alchimiste:  { nom: 'Alchimiste', corps: '#1f1a22', reflet: '#3d3348', chapeau: '#9a6230', ombre: '#6a4020', dessous: '#4a2c16', pieces: '#d8843a', lunettes: true, fiole: '#6ac46a' },
      explorateur: { nom: 'Explorateur', corps: '#1f1a22', reflet: '#3d3348', chapeau: '#66733e', ombre: '#454f28', dessous: '#30381a', plume: '#b8502a', sac: true },
      ceruleen:    { nom: 'Céruléen', rare: true, corps: '#2f7fc0', reflet: '#8fd0f4', chapeau: '#7ccfee', ombre: '#3f97c8', dessous: '#2a6f9e', etoiles: '#ffffff', lueur: '#9fe0ff', translucide: true },
    },
    grum: {
      classique:  { nom: 'Grum classique', pierre: '#c8925a', ombre: '#9a6a3a', fonce: '#6e4a2a', mousse: '#b8c43a', mousseF: '#7d8a24', yeux: '#ffd23a', rune: '#f4ead0' },
      runique:    { nom: 'Runique', pierre: '#93a0ad', ombre: '#6b7682', fonce: '#4a525c', mousse: '#5f7a5a', mousseF: '#3f523c', yeux: '#7ae8f6', rune: '#7ae8f6', runes: true },
      forgeron:   { nom: 'Forgeron', pierre: '#74747c', ombre: '#55555c', fonce: '#38383e', mousse: null, yeux: '#ffa040', rune: '#ffc070', fer: true },
      forestier:  { nom: 'Forestier', pierre: '#b08850', ombre: '#86643a', fonce: '#5e4426', mousse: '#6aa83a', mousseF: '#3f7a24', yeux: '#ffe060', rune: '#f4ead0', fleurs: '#e88ab0', lierre: true },
      cristallin: { nom: 'Cristallin', rare: true, pierre: '#a8949e', ombre: '#7e6a76', fonce: '#5a4854', mousse: null, yeux: '#f0d8ff', rune: '#e8c8ff', cristaux: '#b48ae8' },
    },
  };

  // ---------- bulles au-dessus de la tête ----------
  function bulle(ctx, x, y, type, t, a = 1) {
    ctx.save(); ctx.globalAlpha *= a; ctx.lineWidth = 1.3; ctx.strokeStyle = INK;
    if (type === 'zzz') { for (let i = 0; i < 3; i++) { const u = (t * 0.6 + i / 3) % 1; ctx.globalAlpha = a * Math.sin(u * Math.PI); U.txt(ctx, 'z', x + u * 14, y - u * 20, 9 + u * 6, 'center', INK, 'IM Fell English', 'italic'); } ctx.restore(); return; }
    ctx.fillStyle = 'rgba(250,245,232,0.96)';
    ctx.beginPath(); ctx.ellipse(x, y - 10, 10.5, 8.5, 0, 0, TAU); ctx.fill(); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(x - 3, y - 2.6); ctx.lineTo(x - 1, y + 3); ctx.lineTo(x + 2.4, y - 2.4); ctx.fill(); ctx.stroke();
    ctx.fillStyle = 'rgba(250,245,232,0.96)'; ctx.fillRect(x - 3, y - 4.5, 6, 3);
    const cy = y - 10;
    switch (type) {
      case '!': ctx.fillStyle = '#c0392b'; ctx.fillRect(x - 1.3, cy - 6, 2.6, 8); ctx.beginPath(); ctx.arc(x, cy + 4.6, 1.5, 0, TAU); ctx.fill(); break;
      case '?': U.txt(ctx, '?', x, cy + 0.5, 14, 'center', INK, 'IM Fell English'); break;
      case '…': ctx.fillStyle = INK; for (let i = -1; i <= 1; i++) { ctx.beginPath(); ctx.arc(x + i * 4, cy + 1, 1.4, 0, TAU); ctx.fill(); } break;
      case 'gateau': // une part de gâteau à la cerise
        ctx.fillStyle = '#f0d8a0'; trait(ctx, [[x - 6, cy + 4], [x + 6, cy + 4], [x + 5, cy - 1], [x - 5, cy - 3]], true); ctx.fill(); ctx.stroke();
        ctx.fillStyle = '#f3b6c8'; trait(ctx, [[x - 5, cy - 3], [x + 5, cy - 1], [x + 5, cy - 3], [x - 4, cy - 5]], true); ctx.fill(); ctx.stroke();
        ctx.fillStyle = '#c0392b'; ctx.beginPath(); ctx.arc(x, cy - 5.6, 1.8, 0, TAU); ctx.fill(); break;
      case 'colere': ctx.strokeStyle = '#c0392b'; ctx.lineWidth = 1.8; for (let i = 0; i < 4; i++) { ctx.save(); ctx.translate(x, cy); ctx.rotate(i * Math.PI / 2 + Math.PI / 4); ctx.beginPath(); ctx.moveTo(1.6, 1.6); ctx.quadraticCurveTo(5, 0.6, 5.4, 4.4); ctx.stroke(); ctx.restore(); } break;
      case 'coeur': ctx.fillStyle = '#d0506a'; ctx.beginPath(); ctx.moveTo(x, cy + 4.5); ctx.bezierCurveTo(x - 8, cy - 1, x - 3.5, cy - 7, x, cy - 2.5); ctx.bezierCurveTo(x + 3.5, cy - 7, x + 8, cy - 1, x, cy + 4.5); ctx.fill(); break;
      case 'note': ctx.fillStyle = INK; ctx.beginPath(); ctx.ellipse(x - 2, cy + 3, 2.4, 1.7, -0.4, 0, TAU); ctx.fill(); ctx.fillRect(x - 0.2, cy - 6, 1.3, 9); ctx.beginPath(); ctx.moveTo(x + 1, cy - 6); ctx.quadraticCurveTo(x + 5, cy - 4, x + 4, cy - 1); ctx.stroke(); break;
    }
    ctx.restore();
  }

  // ---------- Gribouille ----------
  // e : { pose, prog (0-1), expr, t, regard {x,y}, tenue, dir, vx }
  function gribouille(ctx, e) {
    const T = TENUES.gribouille[e.tenue] || TENUES.gribouille.classique, t = e.t || 0, pose = e.pose || 'neutre', expr = e.expr || 'neutre';
    if (pose === 'giga' || pose === 'transfo') return giga(ctx, e, T);
    ctx.save(); ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    const marche = pose === 'marche' || pose === 'course', pas = marche ? Math.sin(t * (pose === 'course' ? 18 : 11)) : 0;
    let bob = marche ? Math.abs(pas) * -1.6 : Math.sin(t * 2.2) * 0.6;
    if (pose === 'levite') bob = -4 + Math.sin(t * 3) * 2;
    if (pose === 'chute') { ctx.translate(-2, -4); ctx.rotate(-1.35); }
    if (pose === 'effraye') ctx.translate(Math.sin(t * 40) * 0.8, 0);
    if (pose === 'saut') ctx.scale(0.92, 1.1);
    if (pose === 'lecture' || pose === 'dormir') bob = 1;
    if (T.lueur) FX.glow(ctx, 0, -16, 30, T.lueur, 0.35);
    // lévitation : un petit cercle de magie sous lui
    if (pose === 'levite') { ctx.save(); ctx.strokeStyle = 'rgba(160,80,200,0.8)'; ctx.lineWidth = 1.2; ctx.beginPath(); ctx.ellipse(0, 1, 13, 3, 0, 0, TAU); ctx.stroke(); ctx.rotate(t); ctx.restore(); FX.glow(ctx, 0, 0, 18, '#b070e0', 0.4); }
    ctx.translate(0, bob);
    // sac de l'explorateur, derrière
    if (T.sac) { ctx.fillStyle = '#8a5a2a'; ctx.strokeStyle = INK; ctx.lineWidth = 1.3; ctx.beginPath(); ctx.roundRect ? ctx.roundRect(-15, -19, 8, 11, 2) : ctx.rect(-15, -19, 8, 11); ctx.fill(); ctx.stroke(); ctx.fillStyle = '#6b4520'; ctx.fillRect(-15, -15, 8, 2); }
    // la queue d'encre qui s'enroule en volute
    ctx.strokeStyle = T.corps; ctx.lineWidth = 4.2; ctx.beginPath(); ctx.moveTo(-6, -4); ctx.bezierCurveTo(-14, -2 + pas, -20, -6, -19, -12); ctx.stroke();
    ctx.lineWidth = 2.6; ctx.beginPath(); ctx.moveTo(-19, -12); ctx.bezierCurveTo(-18.5, -16.5, -13.5, -16.5, -13.5, -13); ctx.stroke();
    ctx.lineWidth = 1.6; ctx.beginPath(); ctx.moveTo(-13.5, -13); ctx.quadraticCurveTo(-14, -11, -16, -11.6); ctx.stroke();
    // pieds
    if (pose !== 'levite' && pose !== 'chute') { ctx.fillStyle = T.corps; for (const [px, o] of [[-3.5, pas], [4, -pas]]) { ctx.beginPath(); ctx.ellipse(px + o * 2.5, -1.4 - Math.max(0, o) * 1.6, 3.4, 2, 0, 0, TAU); ctx.fill(); } }
    // bras de derrière
    const brasLeve = pose === 'sort' || pose === 'victoire' || pose === 'theatral';
    ctx.strokeStyle = T.corps; ctx.lineWidth = 2.6;
    if (pose === 'victoire') { trait(ctx, [[-5, -14], [-9, -21], [-10, -25]]); ctx.stroke(); }
    else if (pose !== 'lecture') { trait(ctx, [[-6, -11], [-10, -8 + pas], [-11, -6 + pas]]); ctx.stroke(); }
    // le corps : une goutte d'encre penchée en avant
    const g = ctx.createRadialGradient(3, -17, 1, 0, -12, 15); g.addColorStop(0, T.reflet); g.addColorStop(1, T.corps);
    ctx.fillStyle = g; ctx.globalAlpha = T.translucide ? 0.88 : 1;
    ctx.beginPath(); ctx.moveTo(-8, -2); ctx.bezierCurveTo(-12.5, -10, -10.5, -23, -2, -26.5); ctx.bezierCurveTo(5, -28.5, 11.5, -22, 11.5, -14); ctx.bezierCurveTo(11.5, -6, 7, -2, 0, -1.5); ctx.closePath(); ctx.fill();
    ctx.globalAlpha = 1; ctx.strokeStyle = INK; ctx.lineWidth = 1.4; ctx.stroke();
    if (T.translucide) { ctx.fillStyle = 'rgba(255,255,255,0.7)'; for (let i = 0; i < 3; i++) { const a = t * 1.5 + i * 2.1; ctx.beginPath(); ctx.arc(Math.cos(a) * 5 - 1, -12 + Math.sin(a) * 4, 0.9, 0, TAU); ctx.fill(); } }
    if (T.fiole) { ctx.fillStyle = T.fiole; ctx.strokeStyle = INK; ctx.lineWidth = 1; ctx.beginPath(); ctx.arc(-6, -6, 2.4, 0, TAU); ctx.fill(); ctx.stroke(); ctx.fillRect(-6.6, -10, 1.2, 2); }
    // le visage : un seul grand œil, au milieu, selon l'humeur
    visageGribouille(ctx, e, expr, t);
    // bras de devant
    ctx.strokeStyle = T.corps; ctx.lineWidth = 2.6;
    if (pose === 'sort') { const k = Math.min(1, (e.prog || 0) * 2); trait(ctx, [[6, -13], [11, -17 - k * 4], [13, -21 - k * 4]]); ctx.stroke(); ctx.fillStyle = T.corps; ctx.beginPath(); ctx.arc(13, -21 - k * 4, 1.8, 0, TAU); ctx.fill();
      // le petit sceau qui se forme au bout de la main
      ctx.save(); ctx.translate(15, -25 - k * 4); ctx.rotate(t * 4); ctx.strokeStyle = e.couleur || '#b070e0'; ctx.lineWidth = 1.2; ctx.globalAlpha = 0.5 + 0.5 * k; ctx.beginPath(); ctx.arc(0, 0, 5 + k * 2, 0, TAU); ctx.stroke(); etoile(ctx, 0, 0, 3 + k * 1.5, 4); ctx.stroke(); ctx.restore(); FX.glow(ctx, 15, -25 - k * 4, 14, e.couleur || '#b070e0', 0.5 * k); }
    else if (pose === 'victoire') { trait(ctx, [[6, -14], [10, -22], [11, -26]]); ctx.stroke(); }
    else if (pose === 'lecture') { // un grimoire ouvert entre les mains
      ctx.fillStyle = '#7a3a2a'; ctx.strokeStyle = INK; ctx.lineWidth = 1.1; trait(ctx, [[3, -9], [14, -11], [14, -4], [3, -2]], true); ctx.fill(); ctx.stroke();
      ctx.fillStyle = '#efe3c4'; trait(ctx, [[4, -9], [8.5, -10.5], [8.5, -4], [4, -3]], true); ctx.fill(); trait(ctx, [[8.5, -10.5], [13, -10.6], [13, -4.6], [8.5, -4]], true); ctx.fill(); ctx.stroke();
      ctx.strokeStyle = 'rgba(31,26,22,0.4)'; ctx.lineWidth = 0.6; for (let i = 0; i < 3; i++) { trait(ctx, [[5, -8 + i * 1.6], [8, -9 + i * 1.6]]); ctx.stroke(); trait(ctx, [[9.5, -9 + i * 1.6], [12.5, -9.2 + i * 1.6]]); ctx.stroke(); } }
    else { trait(ctx, [[8, -10], [12, -7.5 - pas], [13.5, -5.5 - pas]]); ctx.stroke(); ctx.fillStyle = T.corps; ctx.beginPath(); ctx.arc(13.5, -5.5 - pas, 1.5, 0, TAU); ctx.fill(); }
    // le chapeau
    chapeau(ctx, T, t, marche ? pas : 0, e);
    ctx.restore();
    // l'étoile et la couronne de la victoire, les étoiles de la chute (non retournées)
    if (expr === 'triomphant') { ctx.save(); ctx.fillStyle = '#e8c040'; ctx.strokeStyle = INK; ctx.lineWidth = 1; const y = -62 + Math.sin(t * 4) * 1.5; trait(ctx, [[-6, y + 4], [-6, y - 1], [-3, y + 1.5], [0, y - 3], [3, y + 1.5], [6, y - 1], [6, y + 4]], true); ctx.fill(); ctx.stroke(); ctx.restore(); }
    if (pose === 'chute') { ctx.save(); ctx.fillStyle = '#e8c040'; ctx.strokeStyle = INK; ctx.lineWidth = 0.8; for (let i = 0; i < 3; i++) { const a = t * 5 + i * TAU / 3; etoile(ctx, -4 + Math.cos(a) * 10, -22 + Math.sin(a) * 3, 2.6, 5); ctx.fill(); ctx.stroke(); } ctx.restore(); }
  }
  function visageGribouille(ctx, e, expr, t) {
    // un seul œil, bien au milieu du visage ; la pupille suit le regard
    const rx = (e.regard && e.regard.x) || 0.6, ry = (e.regard && e.regard.y) || 0;
    const ox = -0.5, oy = -16.5;
    ctx.save();
    const blanc = '#f4efe6';
    const clignote = (t % 4.3) < 0.12 && expr !== 'surpris' && expr !== 'effraye';
    const ferme = expr === 'endormi' || expr === 'content' || expr === 'triomphant' || clignote;
    if (ferme) {
      ctx.strokeStyle = blanc; ctx.lineWidth = 1.8; ctx.beginPath();
      if (expr === 'endormi' || clignote) { ctx.moveTo(ox - 4, oy + 1); ctx.quadraticCurveTo(ox, oy + 3, ox + 4, oy + 1); }
      else { ctx.moveTo(ox - 4.5, oy + 2); ctx.quadraticCurveTo(ox, oy - 4, ox + 4.5, oy + 2); }
      ctx.stroke();
    } else {
      const grand = expr === 'surpris' || expr === 'excite' || expr === 'effraye' || expr === 'curieux';
      const erx = grand ? 7 : 6.2, ery = grand ? 8 : 7.2;
      ctx.fillStyle = blanc; ctx.beginPath(); ctx.ellipse(ox, oy, erx, ery, 0, 0, TAU); ctx.fill();
      const pr = expr === 'effraye' || expr === 'surpris' ? 1.6 : expr === 'excite' || expr === 'curieux' ? 3.2 : 2.6;
      ctx.fillStyle = INK; ctx.beginPath(); ctx.arc(ox + rx * 2.4, oy + 0.5 + ry * 2.4 + (expr === 'reflechi' ? -2.5 : 0), pr, 0, TAU); ctx.fill();
      ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(ox + rx * 2.4 + pr * 0.4, oy + ry * 2.4 - pr * 0.3, Math.max(0.6, pr * 0.32), 0, TAU); ctx.fill();
      // paupières : agacé (sourcil en biais), malicieux (mi-clos), gêné ou inquiet (paupière tombante)
      ctx.fillStyle = (TENUES.gribouille[e.tenue] || TENUES.gribouille.classique).corps;
      if (expr === 'agace' || expr === 'colere' || expr === 'determine') { trait(ctx, [[ox - erx - 1, oy - ery - 1], [ox + erx + 1, oy - ery - 1], [ox + erx + 1, oy - ery * 0.15]], true); ctx.fill(); }
      if (expr === 'malicieux') { ctx.fillRect(ox - erx - 1, oy - ery - 1, erx * 2 + 2, ery * 0.95); }
      if (expr === 'inquiet' || expr === 'gene') { trait(ctx, [[ox - erx - 1, oy - ery * 0.2], [ox - erx - 1, oy - ery - 1], [ox + erx + 1, oy - ery - 1]], true); ctx.fill(); }
    }
    // bouche (blanche sur l'encre)
    ctx.strokeStyle = blanc; ctx.fillStyle = blanc; ctx.lineWidth = 1.1;
    const bx = ox, by = -6.6;
    if (expr === 'content' || expr === 'triomphant' || expr === 'excite') { ctx.beginPath(); ctx.moveTo(bx - 2.6, by); ctx.quadraticCurveTo(bx, by + 2.4, bx + 2.6, by); ctx.stroke(); }
    else if (expr === 'malicieux') { ctx.beginPath(); ctx.moveTo(bx - 3, by - 0.3); ctx.quadraticCurveTo(bx + 0.5, by + 3, bx + 3.4, by - 0.8); ctx.lineTo(bx - 3, by - 0.3); ctx.fill(); ctx.strokeStyle = INK; ctx.lineWidth = 0.6; for (let i = 0; i < 3; i++) { ctx.beginPath(); ctx.moveTo(bx - 1.6 + i * 1.6, by - 0.2); ctx.lineTo(bx - 1.2 + i * 1.6, by + 1.2); ctx.stroke(); } }
    else if (expr === 'surpris' || expr === 'effraye') { ctx.beginPath(); ctx.moveTo(bx - 1.6, by + 0.6); ctx.quadraticCurveTo(bx, by - 1.4, bx + 1.6, by + 0.6); ctx.quadraticCurveTo(bx, by + 1.8, bx - 1.6, by + 0.6); ctx.stroke(); }
    else if (expr === 'agace' || expr === 'colere') { ctx.beginPath(); ctx.moveTo(bx - 2.5, by + 0.4); ctx.lineTo(bx + 2.5, by - 0.4); ctx.stroke(); }
    // goutte de sueur
    if (expr === 'inquiet' || expr === 'effraye' || expr === 'gene') { ctx.fillStyle = '#8ec8ec'; ctx.strokeStyle = INK; ctx.lineWidth = 0.7; const y = -21 + ((t * 2) % 1) * 2; ctx.beginPath(); ctx.moveTo(9.5, y - 3); ctx.quadraticCurveTo(12, y + 1, 9.5, y + 1.6); ctx.quadraticCurveTo(7, y + 1, 9.5, y - 3); ctx.fill(); ctx.stroke(); }
    ctx.restore();
  }
  function chapeau(ctx, T, t, pas, e) {
    const sw = Math.sin(t * 2.6) * 1.4 + pas * 1.6;
    ctx.save(); ctx.strokeStyle = INK; ctx.lineWidth = 1.5;
    // le cône, plus haut que le corps, dont la pointe retombe vers l'arrière
    const g = ctx.createLinearGradient(-10, -55, 12, -28); g.addColorStop(0, T.chapeau); g.addColorStop(1, T.ombre);
    ctx.fillStyle = g;
    ctx.beginPath(); ctx.moveTo(-11, -28); ctx.quadraticCurveTo(-9, -43, -4 + sw * 0.3, -51); ctx.quadraticCurveTo(-11 + sw, -58.5, -21 + sw, -51.5);
    ctx.quadraticCurveTo(-14 + sw * 0.7, -50.5, -9 + sw * 0.5, -51.2); ctx.quadraticCurveTo(-3, -50, 1, -47); ctx.quadraticCurveTo(8, -38, 13, -28); ctx.closePath(); ctx.fill(); ctx.stroke();
    ctx.strokeStyle = 'rgba(31,26,22,0.35)'; ctx.lineWidth = 0.8; ctx.beginPath(); ctx.moveTo(-2, -47); ctx.quadraticCurveTo(2, -38, 3, -29); ctx.stroke(); ctx.strokeStyle = INK; ctx.lineWidth = 1.5;
    if (T.bande) { ctx.fillStyle = T.bande; trait(ctx, [[-10.4, -31.5], [12.2, -31.5], [12.8, -28.6], [-10.8, -28.6]], true); ctx.fill(); ctx.stroke(); }
    // pièces cousues sur le cône
    if (T.pieces) {
      ctx.fillStyle = T.pieces; trait(ctx, [[-6.5, -43], [0, -44], [0.8, -37.5], [-6, -36.8]], true); ctx.fill(); ctx.stroke();
      ctx.strokeStyle = 'rgba(122,90,58,0.7)'; ctx.lineWidth = 0.6; ctx.setLineDash([0.9, 1.8]); trait(ctx, [[-5.6, -42.2], [-0.6, -43], [0, -38.3], [-5.2, -37.6]], true); ctx.stroke(); ctx.setLineDash([]);
      ctx.fillStyle = T.pieces; ctx.strokeStyle = INK; ctx.lineWidth = 1.2; trait(ctx, [[5.5, -35], [9.5, -35.6], [10.4, -31.4], [6.2, -31]], true); ctx.fill(); ctx.stroke(); ctx.lineWidth = 1.5;
    }
    if (T.etoiles) { ctx.fillStyle = T.etoiles; for (const [x, y, r] of [[-3, -41, 2.8], [5, -34, 2], [-6.5, -34, 1.6]]) { etoile(ctx, x, y, r, 4); ctx.fill(); } ctx.beginPath(); ctx.arc(-17 + sw, -51.5, 1.8, 0, TAU); ctx.fill(); }
    if (T.plume) { ctx.strokeStyle = T.plume; ctx.lineWidth = 2.4; ctx.beginPath(); ctx.moveTo(-9, -31); ctx.quadraticCurveTo(-17, -40, -14, -48); ctx.stroke(); ctx.strokeStyle = INK; ctx.lineWidth = 0.6; ctx.beginPath(); ctx.moveTo(-9, -31); ctx.quadraticCurveTo(-16.4, -39.5, -14, -48); ctx.stroke(); ctx.lineWidth = 1.5; }
    // le bord, très large, un peu de travers
    ctx.save(); ctx.translate(1, -27.5); ctx.rotate(-0.06);
    ctx.fillStyle = T.dessous; ctx.beginPath(); ctx.ellipse(0, 1, 21, 4.8, 0, 0, Math.PI); ctx.fill();
    ctx.fillStyle = T.chapeau; ctx.beginPath(); ctx.ellipse(0, 0, 21, 4.4, 0, Math.PI, TAU); ctx.ellipse(0, 0, 21, 1.4, 0, 0, Math.PI); ctx.fill();
    ctx.beginPath(); ctx.ellipse(0, 0.2, 21, 4.8, 0, 0, TAU); ctx.stroke();
    if (T.pieces) { ctx.fillStyle = T.pieces; trait(ctx, [[10, -1.8], [16, -1.2], [15.4, 1.8], [9.6, 1.4]], true); ctx.fill(); ctx.lineWidth = 1.1; ctx.stroke(); ctx.lineWidth = 1.5; }
    if (T.lunettes) { ctx.fillStyle = '#a8d8e8'; ctx.strokeStyle = '#7a5a20'; ctx.lineWidth = 1.5; for (const x of [4, 10.5]) { ctx.beginPath(); ctx.arc(x, -3.6, 3, 0, TAU); ctx.fill(); ctx.stroke(); } ctx.strokeStyle = INK; ctx.lineWidth = 1.5; }
    ctx.restore();
    // l'étiquette « G » (ou la fiole de l'alchimiste) qui pend derrière
    const bal = Math.sin(t * 3.1) * 0.25 + pas * 0.15;
    ctx.save(); ctx.translate(-18, -27); ctx.rotate(bal);
    ctx.strokeStyle = '#6b4f2a'; ctx.lineWidth = 0.9; ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(-0.5, 5.5); ctx.stroke();
    if (T.fiole) { ctx.fillStyle = T.fiole; ctx.strokeStyle = INK; ctx.lineWidth = 1; ctx.beginPath(); ctx.arc(-0.5, 9.5, 3.4, 0, TAU); ctx.fill(); ctx.stroke(); ctx.fillStyle = '#d8c8a0'; ctx.fillRect(-1.6, 5, 2.2, 2.2); }
    else { ctx.fillStyle = '#e8d8b0'; ctx.strokeStyle = INK; ctx.lineWidth = 1.1; trait(ctx, [[-4.4, 5.5], [3.4, 5.5], [3.4, 13.5], [-4.4, 13.5]], true); ctx.fill(); ctx.stroke();
      ctx.scale(e && e.dir < 0 ? -1 : 1, 1); U.txt(ctx, 'G', 0, 9.6, 8, 'center', '#6b3a2a', 'IM Fell English'); }
    ctx.restore();
    ctx.restore();
  }
  // Giga Gribouille : la forme amplifiée, un colosse d'encre violette, et ses « ゴゴゴ »
  function goGlyphe(ctx, x, y, s) {
    const tracer = () => { ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + s, y); ctx.lineTo(x + s, y + s); ctx.lineTo(x - s * 0.05, y + s); ctx.moveTo(x + s * 1.15, y - s * 0.45); ctx.lineTo(x + s * 1.3, y - s * 0.05); ctx.moveTo(x + s * 1.45, y - s * 0.55); ctx.lineTo(x + s * 1.6, y - s * 0.15); };
    ctx.lineCap = 'square'; ctx.strokeStyle = INK; ctx.lineWidth = s * 0.42; tracer(); ctx.stroke(); ctx.strokeStyle = '#a24ad8'; ctx.lineWidth = s * 0.22; tracer(); ctx.stroke(); ctx.lineCap = 'round';
  }
  function giga(ctx, e, T) {
    const t = e.t || 0, k = e.pose === 'transfo' ? Math.min(1, e.prog || 0) : 1, S = 1 + 1.6 * (e.pose === 'transfo' ? k * k : 1), frappe = e.frappe || 0;
    ctx.save(); ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    FX.glow(ctx, 0, -30 * S, 60 * S, '#9a40d0', 0.35 + 0.15 * Math.sin(t * 8));
    ctx.save(); ctx.scale(S, S);
    const viol = '#2a1838', violC = '#6a2c98';
    const g = ctx.createRadialGradient(4, -22, 2, 0, -16, 24); g.addColorStop(0, violC); g.addColorStop(1, viol);
    ctx.fillStyle = g; ctx.strokeStyle = INK; ctx.lineWidth = 1.4 / S * 1.6;
    // jambes trapues
    for (const s of [-1, 1]) { ctx.beginPath(); ctx.ellipse(s * 6, -3, 5, 4, 0, 0, TAU); ctx.fill(); ctx.stroke(); }
    // bras énormes (le poing s'abat pendant la frappe)
    for (const s of [-1, 1]) { const lev = frappe > 0 ? -Math.sin(frappe * Math.PI) * 10 : Math.sin(t * 3 + s) * 1.2; ctx.beginPath(); ctx.ellipse(s * 15, -18 + lev, 7, 9, s * 0.3, 0, TAU); ctx.fill(); ctx.stroke(); ctx.beginPath(); ctx.arc(s * 18, -9 + lev, 6, 0, TAU); ctx.fill(); ctx.stroke(); }
    // torse musclé
    ctx.beginPath(); ctx.moveTo(-12, -6); ctx.bezierCurveTo(-16, -18, -12, -30, 0, -31); ctx.bezierCurveTo(12, -30, 16, -18, 12, -6); ctx.closePath(); ctx.fill(); ctx.stroke();
    ctx.strokeStyle = 'rgba(180,120,230,0.55)'; ctx.lineWidth = 0.8; ctx.beginPath(); ctx.moveTo(0, -24); ctx.lineTo(0, -10); ctx.moveTo(-7, -20); ctx.quadraticCurveTo(-3, -17, 0, -19); ctx.moveTo(7, -20); ctx.quadraticCurveTo(3, -17, 0, -19); ctx.stroke();
    // l'œil, blanc et furieux
    ctx.fillStyle = '#fff6ff'; ctx.beginPath(); ctx.ellipse(0, -23.5, 4.2, 3, 0, 0, TAU); ctx.fill(); ctx.fillStyle = INK; ctx.beginPath(); ctx.arc(0.8, -23.5, 1.3, 0, TAU); ctx.fill();
    ctx.fillStyle = viol; trait(ctx, [[-4.6, -27.6], [4.6, -27.6], [4.6, -25.2]], true); ctx.fill();
    ctx.restore();
    // le chapeau, resté petit sur le colosse
    ctx.save(); ctx.translate(0, -31 * S + 30); chapeau(ctx, T, t, 0, e); ctx.restore();
    ctx.restore();
    // ゴゴゴ, non retourné
    ctx.save(); if (e.dir < 0) ctx.scale(-1, 1);
    const a = e.pose === 'transfo' ? k : 1;
    ctx.globalAlpha = a * (0.75 + 0.25 * Math.sin(t * 10));
    for (let i = 0; i < 3; i++) goGlyphe(ctx, -40 * S * 0.5 + i * 13 + Math.sin(t * 20 + i) * 0.8, -52 * S * 0.62 - i * 3, 8);
    ctx.restore();
  }

  // ---------- Grum ----------
  function grum(ctx, e) {
    const T = TENUES.grum[e.tenue] || TENUES.grum.classique, t = e.t || 0, pose = e.pose || 'neutre', expr = e.expr || 'neutre';
    ctx.save(); ctx.lineCap = 'round'; ctx.lineJoin = 'round'; ctx.strokeStyle = INK; ctx.lineWidth = 1.5;
    const marche = pose === 'marche' || pose === 'course', pas = marche ? Math.sin(t * (pose === 'course' ? 14 : 8)) : 0;
    let bob = marche ? -Math.abs(pas) * 1.4 : 0;
    if (pose === 'saut') ctx.scale(1.06, 0.95);
    if (pose === 'repos' || pose === 'dormir') bob = 3;
    if (e.heureux) FX.glow(ctx, 0, -18, 34, '#ffd060', 0.25 + 0.1 * Math.sin(t * 5));
    // pieds de pierre
    ctx.fillStyle = T.ombre;
    for (const [px, o] of [[-9, pas], [8, -pas]]) { const lift = Math.max(0, o) * 2.5; ctx.beginPath(); ctx.ellipse(px + o * 2, -3 - lift, 5.5, 3.4, 0, 0, TAU); ctx.fill(); ctx.stroke(); }
    ctx.translate(0, bob);
    const frappe = pose === 'frappe' ? Math.sin(Math.min(1, e.prog || 0) * Math.PI) : 0, mange = pose === 'manger', aide = pose === 'aide';
    // la main de derrière
    ctx.fillStyle = T.ombre; U.inkCirclePath(ctx, -18, -9 - (mange ? 6 : 0), 7.6, 11, 0.9); ctx.fill(); ctx.stroke();
    // le grand dôme de pierre
    const dome = () => { ctx.beginPath(); ctx.moveTo(-20, -6); ctx.bezierCurveTo(-23.5, -21, -14, -36.5, 0, -37); ctx.bezierCurveTo(14, -36.5, 23.5, -21, 20, -6); ctx.quadraticCurveTo(0, -1.5, -20, -6); ctx.closePath(); };
    const gp = ctx.createRadialGradient(-6, -28, 3, 0, -18, 26); gp.addColorStop(0, T.pierre); gp.addColorStop(1, T.ombre);
    ctx.fillStyle = gp; dome(); ctx.fill(); ctx.stroke();
    ctx.save(); dome(); ctx.clip(); ctx.fillStyle = 'rgba(255,240,210,0.18)'; ctx.beginPath(); ctx.ellipse(-8, -27, 8, 5, -0.4, 0, TAU); ctx.fill(); U.hatch(ctx, -20, -15, 40, 13, 4, Math.PI / 4, 5, 0.2); ctx.restore();
    // joints entre les pierres et fissures
    ctx.strokeStyle = T.fonce; ctx.lineWidth = 1; trait(ctx, [[-19, -15], [-11, -13.5], [-6, -15], [3, -13.5], [11, -15], [19.5, -13.5]]); ctx.stroke();
    trait(ctx, [[-8, -13.8], [-9, -6]]); ctx.stroke(); trait(ctx, [[7, -14], [8, -5]]); ctx.stroke(); trait(ctx, [[-14, -31], [-11, -28.5], [-12, -25]]); ctx.stroke();
    if (T.fer) { ctx.fillStyle = '#4a4a52'; ctx.strokeStyle = INK; ctx.lineWidth = 1.1; trait(ctx, [[-21, -15], [21, -15], [20.6, -11.5], [-20.6, -11.5]], true); ctx.fill(); ctx.stroke(); ctx.fillStyle = '#9a9aa4'; for (let x = -17; x <= 17; x += 6) { ctx.beginPath(); ctx.arc(x, -13.2, 0.9, 0, TAU); ctx.fill(); } }
    if (T.runes) { ctx.strokeStyle = T.rune; ctx.lineWidth = 1.1; ctx.globalAlpha = 0.6 + 0.4 * Math.sin(t * 2); for (const [x, y] of [[-13, -20], [13, -9], [-12, -9], [12, -20]]) { trait(ctx, [[x - 2, y - 2], [x, y + 2], [x + 2, y - 2]]); ctx.stroke(); } ctx.globalAlpha = 1; FX.glow(ctx, 0, -14, 18, T.rune, 0.22); }
    // la visière sombre et les yeux dorés
    ctx.fillStyle = '#2a1e14'; ctx.strokeStyle = INK; ctx.lineWidth = 1.2; ctx.beginPath(); ctx.moveTo(-19, -25); ctx.quadraticCurveTo(0, -30, 19.5, -25); ctx.lineTo(19.8, -17.5); ctx.quadraticCurveTo(0, -21.5, -19.2, -17.5); ctx.closePath(); ctx.fill(); ctx.stroke();
    yeuxGrum(ctx, e, T, expr, t);
    // la mousse, en touffes, sur le dessus (ou les cristaux du Cristallin)
    if (T.mousse) {
      const touffes = [[-14, -31, 4.6], [-8, -35.5, 5.6], [0, -37.5, 6.2], [8, -35.8, 5.8], [14.5, -31.5, 4.8], [-18, -26, 3.2], [18.5, -26.5, 3.2], [-3, -33, 4.4], [5, -32.5, 4.2]];
      for (const [x, y, r] of touffes) { ctx.fillStyle = T.mousseF; ctx.beginPath(); ctx.arc(x, y + 1, r, 0, TAU); ctx.fill(); }
      for (const [x, y, r] of touffes) { ctx.fillStyle = T.mousse; U.inkCirclePath(ctx, x, y, r * 0.86, x * 3 + 2, 0.8); ctx.fill(); ctx.strokeStyle = INK; ctx.lineWidth = 1; ctx.stroke(); }
      ctx.strokeStyle = T.mousseF; ctx.lineWidth = 0.9; for (let i = 0; i < 6; i++) { const x = -12 + i * 5; ctx.beginPath(); ctx.moveTo(x, -40 + (i % 2) * 2); ctx.lineTo(x + Math.sin(t * 2 + i) * 0.9, -44 + (i % 2) * 2); ctx.stroke(); }
      if (T.fleurs) for (const [x, y] of [[-8, -40], [6, -41], [15, -34]]) { ctx.fillStyle = T.fleurs; for (let k = 0; k < 5; k++) { const a = k / 5 * TAU; ctx.beginPath(); ctx.arc(x + Math.cos(a) * 1.6, y + Math.sin(a) * 1.6, 1.1, 0, TAU); ctx.fill(); } ctx.fillStyle = '#f8e070'; ctx.beginPath(); ctx.arc(x, y, 0.9, 0, TAU); ctx.fill(); }
      if (T.lierre) { ctx.strokeStyle = '#3f7a24'; ctx.lineWidth = 1.2; ctx.beginPath(); ctx.moveTo(16, -27); ctx.quadraticCurveTo(19, -18, 15, -9); ctx.stroke(); ctx.fillStyle = '#6aa83a'; for (const [x, y] of [[18, -20], [16.5, -13]]) { ctx.beginPath(); ctx.ellipse(x, y, 2, 1.2, 0.6, 0, TAU); ctx.fill(); } }
    }
    if (T.cristaux) {
      for (const [x, y, h, a] of [[-9, -35, 10, -0.35], [0, -37, 13, 0], [9, -35, 9, 0.4], [-18, -25, 7, -0.9], [19, -23, 6, 0.9]]) { ctx.save(); ctx.translate(x, y); ctx.rotate(a); ctx.fillStyle = T.cristaux; trait(ctx, [[-2.6, 0], [-2, -h * 0.75], [0, -h], [2, -h * 0.75], [2.6, 0]], true); ctx.fill(); ctx.strokeStyle = INK; ctx.lineWidth = 1; ctx.stroke(); ctx.fillStyle = 'rgba(255,255,255,0.55)'; trait(ctx, [[-1.2, -1], [-0.8, -h * 0.7], [0, -h * 0.9], [0, -1]], true); ctx.fill(); ctx.restore(); }
      FX.glow(ctx, 0, -36, 18, T.cristaux, 0.3 + 0.1 * Math.sin(t * 3));
    }
    if (T.fer) { ctx.fillStyle = '#5a5a62'; ctx.strokeStyle = INK; ctx.lineWidth = 1.2; ctx.beginPath(); ctx.moveTo(-16, -29); ctx.quadraticCurveTo(0, -43, 17, -29); ctx.quadraticCurveTo(0, -32, -16, -29); ctx.fill(); ctx.stroke(); }
    // la main de devant : poing qui frappe, gâteau, pioche
    const hx = 17 + frappe * 9, hy = -8.5 - (mange ? 8 : 0) - frappe * 2;
    if (aide) { // la pioche qui s'abat
      const a = -1.2 + Math.abs(Math.sin(t * 7)) * 1.6; ctx.save(); ctx.translate(hx, hy); ctx.rotate(a);
      ctx.strokeStyle = '#7a5530'; ctx.lineWidth = 2.2; ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(0, -16); ctx.stroke();
      ctx.fillStyle = '#8a8a92'; ctx.strokeStyle = INK; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(-7, -14); ctx.quadraticCurveTo(0, -19.5, 7, -14); ctx.quadraticCurveTo(0, -16.5, -7, -14); ctx.fill(); ctx.stroke(); ctx.restore();
    }
    ctx.fillStyle = T.pierre; U.inkCirclePath(ctx, hx, hy, 8.2, 13, 0.9); ctx.fill(); ctx.strokeStyle = INK; ctx.lineWidth = 1.5; ctx.stroke();
    ctx.save(); ctx.globalAlpha = 0.35; U.hatch(ctx, hx - 2, hy + 1, 9, 6, 3, Math.PI / 4, 9, 0.5); ctx.restore();
    // la rune : un losange dans un losange
    ctx.save(); ctx.translate(hx, hy); ctx.strokeStyle = e.heureux ? '#ffd060' : T.rune; ctx.lineWidth = 1.4; trait(ctx, [[0, -4.6], [4.6, 0], [0, 4.6], [-4.6, 0]], true); ctx.stroke(); ctx.lineWidth = 1; trait(ctx, [[0, -2.2], [2.2, 0], [0, 2.2], [-2.2, 0]], true); ctx.stroke(); ctx.restore();
    if (e.heureux) FX.glow(ctx, hx, hy, 12, '#ffd060', 0.5);
    if (frappe > 0.5) { ctx.strokeStyle = 'rgba(31,26,22,0.5)'; ctx.lineWidth = 1; for (let i = -1; i <= 1; i++) { ctx.beginPath(); ctx.moveTo(hx + 8, hy + i * 4); ctx.lineTo(hx + 13, hy + i * 5); ctx.stroke(); } }
    if (mange) { // le gâteau entre les mains, et ses miettes
      ctx.fillStyle = '#f0d8a0'; ctx.strokeStyle = INK; ctx.lineWidth = 1; trait(ctx, [[2, -16], [14, -16], [14, -22], [2, -22]], true); ctx.fill(); ctx.stroke();
      ctx.fillStyle = '#f3b6c8'; trait(ctx, [[2, -22], [14, -22], [13.4, -24.5], [2.6, -24.5]], true); ctx.fill(); ctx.stroke();
      ctx.fillStyle = '#c0392b'; ctx.beginPath(); ctx.arc(8, -26, 1.6, 0, TAU); ctx.fill();
      ctx.fillStyle = '#e8c880'; for (let i = 0; i < 3; i++) { const u = (t * 1.6 + i / 3) % 1; ctx.fillRect(6 + i * 3, -15 + u * 14, 1.2, 1.2); }
    }
    ctx.restore();
    if (expr === 'triomphant' || e.heureux) { ctx.save(); ctx.fillStyle = '#e8c040'; for (let i = 0; i < 3; i++) { const a = t * 2 + i * 2.1; etoile(ctx, Math.cos(a) * 22, -26 + Math.sin(a) * 9, 2.2 + (i === 0 ? 0.8 : 0), 4); ctx.fill(); } ctx.restore(); }
  }
  function yeuxGrum(ctx, e, T, expr, t) {
    const rx = (e.regard && e.regard.x) || 0.6, ry = (e.regard && e.regard.y) || 0;
    const clignote = (t % 5.1) < 0.13 && expr !== 'surpris' && expr !== 'etonne';
    ctx.save(); ctx.fillStyle = T.yeux; ctx.strokeStyle = T.yeux;
    FX.glow(ctx, 1, -22, 20, T.yeux, 0.45);
    for (const x0 of [-5, 7]) {
      const x = x0 * 1.25 + rx * 1.4, y = -21.8 + ry * 0.8;
      if (expr === 'endormi' || expr === 'repos' || clignote) { ctx.lineWidth = 1.3; ctx.beginPath(); ctx.moveTo(x - 2.6, y + 0.6); ctx.lineTo(x + 2.6, y + 0.6); ctx.stroke(); }
      else if (expr === 'content' || expr === 'joyeux' || expr === 'heureux' || expr === 'triomphant' || expr === 'gourmand') { ctx.lineWidth = 1.6; ctx.beginPath(); ctx.moveTo(x - 2.8, y + 1.2); ctx.quadraticCurveTo(x, y - 2.8, x + 2.8, y + 1.2); ctx.stroke(); }
      else if (expr === 'surpris' || expr === 'etonne') { ctx.beginPath(); ctx.arc(x, y, 2.4, 0, TAU); ctx.fill(); }
      else if (expr === 'fatigue') { ctx.fillRect(x - 2.6, y, 5.2, 1.6); }
      else if (expr === 'agace' || expr === 'determine') { trait(ctx, [[x - 2.8, y - 1.6 + (x0 < 0 ? 0 : 1.4)], [x + 2.8, y - 1.6 + (x0 < 0 ? 1.4 : 0)], [x + 2.8, y + 1.6], [x - 2.8, y + 1.6]], true); ctx.fill(); }
      else { ctx.beginPath(); ctx.roundRect ? ctx.roundRect(x - 3.2, y - 2, 6.4, 4, 1.4) : ctx.rect(x - 3.2, y - 2, 6.4, 4); ctx.fill(); }
    }
    if (expr === 'blesse') { ctx.fillStyle = '#e8d8b0'; ctx.strokeStyle = INK; ctx.lineWidth = 0.8; ctx.save(); ctx.translate(-5, -23); ctx.rotate(0.5); ctx.fillRect(-5, -1.4, 10, 2.8); ctx.strokeRect(-5, -1.4, 10, 2.8); ctx.restore(); }
    ctx.restore();
  }

  // dessin dans un aperçu : retourné selon la direction
  function dessiner(ctx, qui, x, y, e, echelle = 1) {
    ctx.save(); ctx.translate(x, y); ctx.scale(echelle * (e.dir < 0 ? -1 : 1), echelle);
    (qui === 'grum' ? grum : gribouille)(ctx, e); ctx.restore();
  }
  return { gribouille, grum, bulle, dessiner, TENUES };
})();

// ---------- Les compagnons dehors : Gribouille et Grum suivent l'apprenti(e) ----------
// Ils ne sont pas des créatures du monde : les sorts, les créatures et les phénomènes ne les touchent pas.
function creerCompagnons(W) {
  const { TAU, clamp, dist } = U;
  const M = Sim.M, CS = Sim.CS;
  const st = () => W.st;
  let liste = [], tirs = [], idleT = 0, gigaCd = 45, hpVu = null, gourmandT = 12;
  const ESS = ['lumiere', 'vent', 'eau', 'foudre', 'feu'];
  const COUL = { lumiere: '#e0c050', vent: '#5fb8b0', eau: '#5a90d8', foudre: '#e8d040', feu: '#e07030' };
  const reglages = () => { const g = W.game(); if (!g.compagnons) g.compagnons = { actif: true, gribouille: 'classique', grum: 'classique' }; return g.compagnons; };
  const actifs = () => reglages().actif !== false;
  function creer(qui, x, y) {
    const S = qui === 'gribouille' ? { w: 22, h: 30 } : { w: 36, h: 36 };
    return { qui, x, y: y - S.h, w: S.w, h: S.h, vx: 0, vy: 0, dir: 1, onGround: false, canStep: true, etat: 'suivre', et: 0, expr: 'neutre', exprT: 0, bulle: null, bulleT: 0, cd: 3 + Math.random() * 2, anim: Math.random() * 10, coince: 0, regard: { x: 0.7, y: 0 }, heureux: 0, cible: null, frappe: 0 };
  }
  // une boîte prise dans la matière ?
  function dansLaMatiere(x, y, w, h) { for (let yy = y + 1; yy <= y + h - 1; yy += 5) for (let xx = x + 1; xx <= x + w - 1; xx += 5) if (Sim.solidAt(xx, yy)) return true; return Sim.solidAt(x + w - 1, y + h - 1) || Sim.solidAt(x + 1, y + h - 1); }
  // une place libre près de l'apprenti(e) : derrière d'abord, puis devant, à côté, un peu plus haut
  function placeLibre(c, decal) {
    const p = st().p, face = p.face || 1, pied = p.y + p.h, cx0 = p.x + p.w / 2;
    for (const dy of [0, -6, -12, -18, -30]) for (const k of [-1, 1, -0.5, 0.5, 0]) {
      const x = cx0 + k * face * decal - c.w / 2, y = pied - c.h - 2 + dy;
      if (x > 6 && !dansLaMatiere(x, y, c.w, c.h)) return { x, y };
    }
    return { x: p.x + p.w / 2 - c.w / 2, y: p.y + p.h - c.h - 2 };
  }
  function ramener(c) {
    W.part(c.x + c.w / 2, c.y + c.h / 2, '#1f1a16', 10, 60, 0.6, 3, -20);
    const q = placeLibre(c, c.qui === 'gribouille' ? 38 : 74); c.x = q.x; c.y = q.y; c.vx = c.vy = 0; c.coince = 0;
    W.part(c.x + c.w / 2, c.y + c.h / 2, '#1f1a16', 10, 60, 0.6, 3, -20);
  }
  function placer() {
    liste = []; tirs = [];
    if (!actifs() || !st()) return;
    for (const qui of ['gribouille', 'grum']) { const c = creer(qui, 0, 0); const q = placeLibre(c, qui === 'gribouille' ? 38 : 74); c.x = q.x; c.y = q.y; liste.push(c); }
  }
  function trouver(qui) { return liste.find((c) => c.qui === qui) || null; }
  function humeur(c, expr, duree = 2, bulle = null) { if (!c) return; c.expr = expr; c.exprT = duree; if (bulle) { c.bulle = bulle; c.bulleT = Math.min(2.4, duree + 0.4); } }
  // une créature qu'on peut combattre : hostile, éveillée, pas à nous
  const hostile = (c) => c.hp > 0 && c.t !== 'familier' && !c.sta.tame && !c.controlled && !c.carried && !c.vaincu
    && (c.t === 'gardien' ? c.engage : DATA.ESPECES[c.t] ? !!DATA.ESPECES[c.t].hostile : true);
  function plusProche(x, y, R) { let best = null, bd = R; for (const c of st().crs) { if (!hostile(c)) continue; const d = dist(x, y, c.x + c.w / 2, c.y + c.h / 2); if (d < bd) { bd = d; best = c; } } return best; }
  const centre = (e) => ({ x: e.x + e.w / 2, y: e.y + e.h / 2 });

  // ---------- les événements du monde : ils réagissent ----------
  function surEvt(n, d) {
    const G = trouver('gribouille'), R = trouver('grum');
    switch (n) {
      case 'combo_decouvert': case 'combo_decouvert_trio': humeur(G, 'excite', 2.5, '!'); humeur(R, 'content', 2); break;
      case 'coffre': humeur(G, 'triomphant', 2.5, 'coeur'); humeur(R, 'joyeux', 2.5); break;
      case 'gardien_vu': humeur(G, 'effraye', 3, '!'); humeur(R, 'agace', 3, '!'); break;
      case 'gardien': humeur(G, 'triomphant', 3.5); humeur(R, 'triomphant', 3.5); if (G) { G.etat = 'victoire'; G.et = 0; } break;
      case 'stele': humeur(G, 'curieux', 2.5, '?'); break;
      case 'bouscule': humeur(G, 'inquiet', 2, null); humeur(R, 'agace', 2.4, 'colere'); break;
      case 'recette': if (d === 'gateau') humeur(R, 'gourmand', 3, 'gateau'); break;
    }
  }

  // ---------- les petits sorts de Gribouille : souvent réussis, parfois des gaffes, rarement géniaux ----------
  function lancerSort(c, cible) {
    c.etat = 'sort'; c.et = 0; c.cible = cible; c.ess = c.forceEss || ESS[(Math.random() * ESS.length) | 0]; c.forceEss = null; c.couleur = COUL[c.ess];
    const r = Math.random(); c.issue = c.force || (r < 0.12 ? 'genial' : r < 0.4 ? 'gaffe' : 'reussi'); c.force = null;
    humeur(c, c.issue === 'gaffe' ? 'determine' : 'excite', 0.8);
  }
  function finirSort(c) {
    const cible = c.cible, o = { x: c.x + c.w / 2 + c.dir * 14, y: c.y - 6 };
    if (c.issue === 'gaffe') {
      const g = Math.random();
      if (g < 0.4) { // le sort lui éclate au nez : il tombe à la renverse
        W.part(o.x, o.y, '#6e6660', 12, 60, 0.9, 4, -40, 'fumee'); W.part(o.x, o.y, c.couleur, 8, 90, 0.4, 2, 0, 'etincelle'); W.son('fizzle');
        c.etat = 'chute'; c.et = 0; humeur(c, 'gene', 1.8); humeur(trouver('grum'), 'etonne', 1.4, '…');
      } else if (g < 0.7) { // une bouffée de fumée sort du chapeau
        W.part(c.x + c.w / 2, c.y - 24, '#8a8078', 14, 40, 1.2, 5, -50, 'fumee'); W.son('fizzle'); c.etat = 'suivre'; humeur(c, 'agace', 2, 'colere');
      } else { // il vise bien... mais ce sont des fleurs qui partent
        tirs.push({ x: o.x, y: o.y, cible, ess: 'fleurs', k: 1, vie: 2.2, couleur: '#e88ab0' }); c.etat = 'suivre'; humeur(c, 'gene', 2, '…');
      }
      return;
    }
    tirs.push({ x: o.x, y: o.y, cible, ess: c.ess, k: c.issue === 'genial' ? 2.2 : 1, vie: 2.2, couleur: c.couleur });
    W.son('cast', c.ess); c.etat = 'suivre';
    if (c.issue === 'genial') humeur(c, 'malicieux', 1.6, '!');
  }
  function majTirs(dt) {
    for (const q of tirs) {
      q.vie -= dt; const c = q.cible; const alive = c && c.hp > 0;
      const tx = alive ? c.x + c.w / 2 : q.x + (q.vx || 0), ty = alive ? c.y + c.h / 2 : q.y + (q.vy || 0);
      const dx = tx - q.x, dy = ty - q.y, d = Math.hypot(dx, dy) || 1, v = 430;
      q.vx = dx / d * v * dt; q.vy = dy / d * v * dt; q.x += q.vx; q.y += q.vy;
      if (Math.random() < 0.6) W.part(q.x, q.y, q.couleur, 1, 15, 0.35, 2, 0, q.ess === 'fleurs' ? 'feuille' : 'spark');
      if (d < 14 || q.vie <= 0) {
        q.mort = true;
        if (q.ess === 'fleurs') { W.part(q.x, q.y, '#e88ab0', 12, 70, 1, 3, 60, 'feuille'); W.part(q.x, q.y, '#f8e070', 6, 50, 0.8, 2, 40, 'feuille'); continue; }
        if (!alive) continue;
        const hp0 = c.hp;
        W.applyEffect(q.ess, q.x, q.y, 34 * Math.sqrt(q.k), { power: 0.8 * q.k, duration: 1, size: 1, range: 1 }, 'burst', { noPlayer: true, noGrid: true, noField: true });
        if (c.hp <= 0 && hp0 > 0) { const G = trouver('gribouille'); if (G && G.etat === 'suivre') { G.etat = 'victoire'; G.et = 0; humeur(G, 'triomphant', 1.6); } }
      }
    }
    tirs = tirs.filter((q) => !q.mort);
  }

  // ---------- Giga Gribouille : quand ça tourne mal, rarement, il se gonfle d'encre ----------
  function danger(p) {
    const GD = W.GD && W.GD.actif;
    if (GD && GD.engage && !GD.vaincu && dist(GD.x + GD.w / 2, GD.y, p.x, p.y) < 420) return true;
    if (p.hp > p.hpMax * 0.35) return false;
    return !!plusProche(p.x + p.w / 2, p.y + p.h / 2, 300);
  }
  function gigaFrappe(c) {
    const cx = c.x + c.w / 2, by = c.y + c.h;
    W.shake(0.55); W.son('burst', 'terre'); W.part(cx, by, '#9a40d0', 26, 220, 0.8, 4, 300, 'spark'); W.part(cx, by, '#2a1838', 16, 160, 0.7, 4, 400);
    st().sp.push({ k: 'ring', core: 'force', x: cx, y: by - 6, r: 190, life: 0.5, max: 0.5, color: '#9a40d0' });
    for (const q of st().crs) { if (!hostile(q)) continue; const qx = q.x + q.w / 2, qy = q.y + q.h / 2; const d = dist(cx, by - 20, qx, qy); if (d > 190) continue; const dx = Math.sign(qx - cx) || 1; W.hurt(q, 3.5, 'coup'); q.vx += dx * 520 / Math.sqrt(W.masse(q)); q.vy -= 260 / Math.sqrt(W.masse(q)); q.sta.stun = Math.max(q.sta.stun || 0, 1.2); }
  }

  // ---------- mise à jour ----------
  function update(dt) {
    if (!actifs()) { if (liste.length) liste = []; return; }
    if (!liste.length) placer();
    const p = st().p, inp = W.inp() || {};
    const actif = inp.left || inp.right || inp.up || inp.down || inp.jumpHeld || inp.dig || (inp.mouse && (inp.mouse.down || inp.mouse.rdown)) || inp.interact;
    if (actif || Math.abs(p.vx) > 30) { if (idleT > 30) for (const c of liste) humeur(c, 'surpris', 0.8, '!'); idleT = 0; } else idleT += dt;
    if (hpVu != null && p.hp < hpVu - 0.4) surEvt('bouscule');
    hpVu = p.hp;
    gigaCd -= dt; gourmandT -= dt;
    if (gourmandT <= 0) { gourmandT = 25 + Math.random() * 20; const inv = W.game().inv; if (inv && inv.potions && inv.potions.gateau > 0) humeur(trouver('grum'), 'gourmand', 2.5, 'gateau'); }
    const pcx = p.x + p.w / 2, pied = p.y + p.h, face = p.face || 1;
    for (const c of liste) {
      c.anim += dt; c.et += dt;
      if (c.exprT > 0) { c.exprT -= dt; if (c.exprT <= 0) c.expr = 'neutre'; }
      if (c.bulleT > 0) { c.bulleT -= dt; if (c.bulleT <= 0) c.bulle = null; }
      if (c.heureux > 0) { c.heureux -= dt; if (Math.random() < dt * 4) W.part(c.x + Math.random() * c.w, c.y + Math.random() * c.h, '#ffd060', 1, 20, 0.6, 2, -30, 'spark'); }
      c.cd -= dt;
      const ccx = c.x + c.w / 2, d = dist(ccx, c.y + c.h, pcx, pied);
      // trop loin ou coincé : un pouf d'encre, et le voilà revenu
      if (d > 700 || c.coince > 1.6 || dansLaMatiere(c.x, c.y, c.w, c.h)) {
        ramener(c);
        if (c.qui === 'gribouille' && /giga|transfo/.test(c.etat)) c.etat = 'suivre';
      }
      if (c.qui === 'gribouille') majGribouille(c, dt, p, idleT); else majGrum(c, dt, p, inp, idleT);
      // le regard : vers la cible, sinon vers la souris de l'apprenti(e)
      const vise = c.cible && c.cible.hp > 0 ? centre(c.cible) : null;
      if (vise) { const dx = vise.x - ccx, dy = vise.y - (c.y + c.h / 2), dd = Math.hypot(dx, dy) || 1; c.regard = { x: Math.abs(dx / dd) * 0.9, y: dy / dd * 0.6 }; if (Math.abs(c.vx) < 20) c.dir = Math.sign(dx) || c.dir; }
      else c.regard = { x: 0.7, y: 0 };
      // physique : pesanteur (sauf en lévitation ou en colosse), collisions avec la matière
      const enEau = Sim.P[Sim.get(Math.floor(ccx / CS), Math.floor((c.y + c.h - 3) / CS))].liquid;
      if (c.etat !== 'levite') W.applyGrav(c, dt, enEau && c.qui === 'gribouille' ? 0.2 : 1);
      if (enEau && c.qui === 'gribouille') c.vy = Math.min(c.vy, -60);
      const x0 = c.x, voulait = Math.abs(c.vx) > 40; W.moveBody(c, dt);
      if (voulait && Math.abs(c.x - x0) < 0.2) c.coince += dt; else c.coince = Math.max(0, c.coince - dt * 0.5);
    }
    majTirs(dt);
  }
  // marcher jusqu'à sa place, derrière l'apprenti(e) ; sauter les marches ; vmax selon la distance
  function suivre(c, dt, p, vmax, decal) {
    const tx = p.x + p.w / 2 - (p.face || 1) * decal, dx = tx - (c.x + c.w / 2), loin = Math.abs(dx) > 260;
    if (Math.abs(dx) > 14) { c.vx += (Math.sign(dx) * vmax * (loin ? 1.6 : 1) - c.vx) * Math.min(1, dt * 6); c.dir = Math.sign(dx); }
    else { c.vx *= Math.max(0, 1 - dt * 10); c.dir = p.face || c.dir; }
    if (c.onGround && (c.hitX || (p.y + p.h < c.y + c.h - 44 && Math.abs(dx) < 160 && p.onGround))) c.vy = c.qui === 'gribouille' ? -470 : -430;
    return dx;
  }
  function majGribouille(c, dt, p, idle) {
    switch (c.etat) {
      case 'sort': c.vx *= Math.max(0, 1 - dt * 10); if (c.et > 0.55) finirSort(c); return;
      case 'chute': c.vx *= Math.max(0, 1 - dt * 6); if (c.et > 1.3) { c.etat = 'suivre'; } return;
      case 'victoire': c.vx *= Math.max(0, 1 - dt * 8); if (c.et > 1.2) c.etat = 'suivre'; return;
      case 'transfo': c.vx = 0; if (c.et > 0.9) { c.etat = 'giga'; c.et = 0; c.frappes = 0; } return;
      case 'giga': {
        c.vx = 0; const cible = plusProche(c.x + c.w / 2, c.y, 400); if (cible) c.dir = Math.sign(cible.x - c.x) || c.dir;
        c.frappe = Math.max(0, (c.frappe || 0) - dt * 2.5);
        if ((c.frappes === 0 && c.et > 1.0) || (c.frappes === 1 && c.et > 2.8)) { c.frappes++; c.frappe = 1; gigaFrappe(c); }
        if (c.et > 4.6) { c.etat = 'degonfle'; c.et = 0; } return;
      }
      case 'degonfle': c.vx = 0; if (c.et > 0.6) { c.etat = 'epuise'; c.et = 0; humeur(c, 'endormi', 6, 'zzz'); } return;
      case 'epuise': c.vx *= Math.max(0, 1 - dt * 8); if (c.et > 6) c.etat = 'suivre'; return;
    }
    // Giga Gribouille, au secours
    if (gigaCd <= 0 && danger(p)) { gigaCd = 150; c.etat = 'transfo'; c.et = 0; humeur(c, 'determine', 6); W.son('burst', 'magie'); W.flash(0.12); st().sp.push({ k: 'label', x: c.x + c.w / 2, y: c.y - 70, txt: 'Giga Gribouille !', life: 2, max: 2 }); humeur(trouver('grum'), 'etonne', 2, '!'); return; }
    // lévitation si l'apprenti(e) vole loin au-dessus
    const hautDessus = p.y + p.h < c.y - 90 && Math.abs(p.x - c.x) < 300;
    if (hautDessus || c.etat === 'levite') {
      c.etat = hautDessus || !c.onGround ? 'levite' : 'suivre';
      if (c.etat === 'levite') { const ty = p.y + p.h - c.h - 4; c.vy += ((ty - c.y) * 3 - c.vy) * Math.min(1, dt * 4); if (!hautDessus && Math.abs(ty - c.y) < 10) c.etat = 'suivre'; }
    }
    // lire, puis s'endormir, quand on ne fait rien
    if (idle > 35) { c.vx *= 0.9; if (c.expr !== 'endormi') humeur(c, 'endormi', 99, 'zzz'); c.bulle = 'zzz'; c.bulleT = 1; return; }
    if (idle > 12) { c.vx *= 0.9; c.lit = true; if (Math.random() < dt * 0.15) humeur(c, 'reflechi', 2, '…'); return; }
    c.lit = false; if (c.expr === 'endormi' && c.exprT > 50) c.expr = 'neutre';
    // un ennemi à portée : un petit sort
    if (c.cd <= 0 && c.onGround !== null) {
      const cible = plusProche(c.x + c.w / 2, c.y + c.h / 2, 290);
      if (cible && W.inView(cible.x, cible.y)) { lancerSort(c, cible); c.cd = 4.5 + Math.random() * 3; return; }
      c.cd = 0.5;
    }
    suivre(c, dt, p, 230, 38);
  }
  function majGrum(c, dt, p, inp, idle) {
    const vmax = c.heureux > 0 ? 250 : 190;
    if (c.etat === 'manger') { c.vx *= Math.max(0, 1 - dt * 8); if (c.et > 2.6) { c.etat = 'suivre'; c.heureux = 120; humeur(c, 'heureux', 3, 'coeur'); W.son('pickup'); } return; }
    if (c.etat === 'frappe') {
      c.vx *= Math.max(0, 1 - dt * 10);
      if (!c.frappeFaite && c.et > 0.3) { c.frappeFaite = true; const q = c.cible; if (q && q.hp > 0 && Math.abs(q.x + q.w / 2 - (c.x + c.w / 2)) < c.w / 2 + q.w / 2 + 18) { W.hurt(q, c.heureux > 0 ? 3.2 : 1.6, 'coup'); const m = Math.sqrt(W.masse(q)); q.vx += c.dir * 420 / m; q.vy -= 180 / m; q.sta.stun = Math.max(q.sta.stun || 0, 0.7); W.part(q.x + q.w / 2, q.y + q.h / 2, '#a8977a', 8, 90, 0.4, 3, 200); W.son('burst', 'terre'); W.shake(0.12); } }
      if (c.et > 0.65) { c.etat = 'suivre'; c.cd = c.heureux > 0 ? 0.8 : 1.3; } return;
    }
    // aider à creuser : il manie la pioche à côté de l'apprenti(e)
    c.aide = !!inp.dig && dist(c.x + c.w / 2, c.y, p.x + p.w / 2, p.y) < 150;
    if (c.aide) { W.aiderCreuser(dt); suivre(c, dt, p, vmax, 30); return; }
    // protéger : une bête hostile près de l'apprenti(e), il fonce et frappe
    const cible = plusProche(p.x + p.w / 2, p.y + p.h / 2, 220);
    if (cible && dist(cible.x, cible.y, c.x, c.y) < 300) {
      c.cible = cible; const dx = cible.x + cible.w / 2 - (c.x + c.w / 2), portee = c.w / 2 + cible.w / 2 + 6;
      c.dir = Math.sign(dx) || c.dir;
      if (Math.abs(dx) > portee) { c.vx += (Math.sign(dx) * vmax * 1.2 - c.vx) * Math.min(1, dt * 6); if (c.onGround && c.hitX) c.vy = -430; }
      else { c.vx *= 0.7; if (c.cd <= 0) { c.etat = 'frappe'; c.et = 0; c.frappeFaite = false; humeur(c, 'agace', 0.9); } }
      return;
    }
    c.cible = null;
    if (idle > 35) { c.vx *= 0.9; if (c.expr !== 'endormi') humeur(c, 'endormi', 99, 'zzz'); c.bulle = 'zzz'; c.bulleT = 1; return; }
    if (c.expr === 'endormi' && c.exprT > 50) c.expr = 'neutre';
    suivre(c, dt, p, vmax, 74);
  }
  // un gâteau pour Grum : il accourt, le mange, et le voilà heureux et plus fort deux minutes
  function offrirGateau() {
    const c = trouver('grum'); if (!c) return false;
    const p = st().p; if (dist(c.x, c.y, p.x, p.y) > 500) ramener(c);
    c.etat = 'manger'; c.et = 0; humeur(c, 'gourmand', 3, 'gateau'); W.son('pickup');
    humeur(trouver('gribouille'), 'content', 2, 'coeur');
    return true;
  }

  // ---------- dessin ----------
  function pose(c) {
    if (c.qui === 'gribouille') {
      if (/^(sort|chute|victoire|transfo|giga|levite)$/.test(c.etat)) return c.etat === 'victoire' ? 'victoire' : c.etat;
      if (c.etat === 'degonfle') return 'transfo';
      if (c.etat === 'epuise' || c.expr === 'endormi') return 'dormir';
      if (c.lit) return 'lecture';
    } else {
      if (c.etat === 'frappe' || c.etat === 'manger') return c.etat;
      if (c.aide) return 'aide';
      if (c.expr === 'endormi') return 'repos';
    }
    if (!c.onGround) return 'saut';
    return Math.abs(c.vx) > 150 ? 'course' : Math.abs(c.vx) > 18 ? 'marche' : 'neutre';
  }
  function dessiner(ctx, t) {
    const R = reglages();
    for (const c of liste) {
      const cx = c.x + c.w / 2, by = c.y + c.h, ps = pose(c);
      ctx.save(); ctx.fillStyle = 'rgba(31,26,22,0.16)'; ctx.beginPath(); ctx.ellipse(cx, by, c.w * 0.55, 3, 0, 0, TAU); ctx.fill(); ctx.restore();
      const prog = c.etat === 'sort' ? c.et / 0.55 : c.etat === 'frappe' ? c.et / 0.65 : c.etat === 'transfo' ? c.et / 0.9 : c.etat === 'degonfle' ? 1 - c.et / 0.6 : 0;
      Mascottes.dessiner(ctx, c.qui, cx, by, { pose: ps, prog, expr: c.expr, t: c.anim, regard: c.regard, tenue: R[c.qui] || 'classique', dir: c.dir, vx: c.vx, heureux: c.heureux > 0, couleur: c.couleur, frappe: c.frappe });
      if (c.bulle) { const haut = c.qui === 'gribouille' ? (/giga|transfo/.test(ps) ? by - 130 : by - 60) : by - 46; Mascottes.bulle(ctx, cx + 8, haut, c.bulle, c.anim, Math.min(1, c.bulleT * 2)); }
    }
    for (const q of tirs) { FX.glow(ctx, q.x, q.y, 12 * Math.sqrt(q.k), q.couleur, 0.7); ctx.save(); ctx.fillStyle = q.couleur; ctx.strokeStyle = U.INK; ctx.lineWidth = 1; ctx.beginPath(); for (let i = 0; i < 10; i++) { const a = i / 10 * TAU + q.vie * 6, r = i % 2 ? 2 : 4.5 * Math.sqrt(q.k); ctx.lineTo(q.x + Math.cos(a) * r, q.y + Math.sin(a) * r); } ctx.closePath(); ctx.fill(); ctx.stroke(); ctx.restore(); }
  }
  function lumieres(ls) {
    for (const c of liste) {
      if (c.qui === 'grum') ls.push({ x: c.x + c.w / 2, y: c.y + 12, r: c.heureux > 0 ? 90 : 55 });
      else if (/giga|transfo/.test(c.etat)) ls.push({ x: c.x + c.w / 2, y: c.y - 30, r: 170 });
      else if ((reglages().gribouille || '') === 'ceruleen') ls.push({ x: c.x + c.w / 2, y: c.y, r: 60 });
    }
    for (const q of tirs) ls.push({ x: q.x, y: q.y, r: 50 });
  }
  function reset() { liste = []; tirs = []; idleT = 0; hpVu = null; }
  // pour les tests
  function forcer(qui, quoi, ess) { const c = trouver(qui); if (!c) return; if (quoi === 'giga') { gigaCd = 0; c.etat = 'transfo'; c.et = 0; } else { c.force = quoi; c.forceEss = ess || null; } c.cd = 0; }
  return { update, dessiner, lumieres, reset, placer, surEvt, offrirGateau, forcer, get liste() { return liste; }, get tirs() { return tirs; }, reglages };
}
