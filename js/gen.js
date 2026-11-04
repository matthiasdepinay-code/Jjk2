'use strict';
// ---------- Génération du grand monde (dessiné à la main, en cellules) ----------
const Gen = (() => {
  const W0 = 900, W = 1800, H = 260;
  // Étirement du monde : chaque région garde son dessin, ×1,5 en largeur, et des transitions s'intercalent
  const SEG = [
    { o: [0, 40], n: 40 }, { o: [40, 120], n: 120 },
    { t: 'prairie', n: 60, nom: 'La Prairie', mood: 'Le Jardin' },
    { o: [120, 220], n: 150 },
    { t: 'riviere', n: 60, nom: 'La Rivière', mood: 'Le Lac' },
    { o: [220, 330], n: 165 },
    { t: 'collines', n: 64, nom: 'Les Collines', mood: 'La Montagne' },
    { o: [330, 445], n: 172 },
    { t: 'gorge', n: 62, nom: 'La Gorge', mood: 'La Montagne' },
    { o: [445, 560], n: 172 },
    { t: 'cendres', n: 62, nom: 'La Plaine de cendres', mood: 'Le Volcan' },
    { o: [560, 700], n: 210 },
    { t: 'marais', n: 64, nom: 'Le Marais', mood: 'Les Ruines' },
    { o: [700, 820], n: 180 },
    { t: 'dunes', n: 60, nom: 'Les Dunes', mood: 'Le Désert' },
    { o: [820, 900], n: 0 },
  ];
  { let a = 0; for (const g of SEG) { g.a = a; a += g.n; } const last = SEG[SEG.length - 1]; last.n = W - last.a; }
  // ancienne abscisse (cellules) → nouvelle
  function X(x) {
    for (const g of SEG) if (g.o && x >= g.o[0] && (x < g.o[1] || (g.o[1] === 900 && x <= 900))) return g.a + (x - g.o[0]) * g.n / (g.o[1] - g.o[0]);
    return x >= 900 ? W : 0;
  }
  const kAt = (x) => { for (const g of SEG) if (g.o && x >= g.o[0] && x < g.o[1]) return g.n / (g.o[1] - g.o[0]); return 1; };
  const M = Sim.M;
  const CS = Sim.CS;
  let R = null;

  const smooth = (t) => t * t * (3 - 2 * t);
  // Profil de surface : points de contrôle (x, y) en cellules, interpolés
  const PROFILE = [[0, 130], [40, 130], [60, 131], [120, 128], [160, 125], [215, 129], [225, 131], [330, 131], [345, 125], [365, 108], [385, 88], [400, 72], [412, 70], [425, 78], [445, 100], [465, 120], [478, 118], [492, 100], [505, 90], [518, 102], [535, 118], [552, 126], [600, 128], [650, 127], [700, 131], [760, 133], [800, 130], [830, 124], [850, 132], [870, 122], [900, 128]];
  function surfaceAt(x) {
    for (let k = 0; k < PROFILE.length - 1; k++) {
      const [x0, y0] = PROFILE[k], [x1, y1] = PROFILE[k + 1];
      if (x >= x0 && x <= x1) { const t = smooth((x - x0) / (x1 - x0)); return y0 + (y1 - y0) * t + Math.sin(x * 0.7) * 0.6 + Math.sin(x * 0.23) * 0.9; }
    }
    return 130;
  }

  function fillRect(x, y, w, h, m, a = 0) { for (let yy = y; yy < y + h; yy++) for (let xx = x; xx < x + w; xx++) Sim.set(xx, yy, m, a); }
  function fillEllipse(cx, cy, rx, ry, m, a = 0) {
    for (let y = Math.floor(cy - ry); y <= Math.ceil(cy + ry); y++) for (let x = Math.floor(cx - rx); x <= Math.ceil(cx + rx); x++) {
      const dx = (x - cx) / rx, dy = (y - cy) / ry; if (dx * dx + dy * dy <= 1) Sim.set(x, y, m, a);
    }
  }
  function blob(cx, cy, rx, ry, m, rough = 0.25) {
    for (let y = Math.floor(cy - ry - 2); y <= Math.ceil(cy + ry + 2); y++) for (let x = Math.floor(cx - rx - 2); x <= Math.ceil(cx + rx + 2); x++) {
      const dx = (x - cx) / rx, dy = (y - cy) / ry; const n = (U.hash2(x * 0.5, y * 0.5) - 0.5) * rough * 2;
      if (dx * dx + dy * dy <= 1 + n) Sim.set(x, y, m);
    }
  }
  function tunnel(x0, y0, x1, y1, r) {
    const n = Math.ceil(Math.hypot(x1 - x0, y1 - y0) / 2);
    let wx = 0, wy = 0;
    for (let k = 0; k <= n; k++) {
      const t = k / n; wx += (R() - 0.5) * 1.5; wy += (R() - 0.5) * 1.5; wx *= 0.9; wy *= 0.9;
      const x = x0 + (x1 - x0) * t + wx, y = y0 + (y1 - y0) * t + wy;
      fillEllipse(x, y, r, r * 0.8, M.AIR);
    }
  }
  let ARBRES = [];
  function tree(x, h, rx = 5, ry = 4) {
    const s = Math.floor(surfaceAt(x)); ARBRES.push({ x, h, rx, ry });
    fillRect(x, s - h, 2, h + 1, M.BOIS);
    blob(x + 1, s - h - ry + 1, rx, ry, M.PLANTE, 0.35);
  }
  function bush(x, rx = 3, ry = 2) { const s = Math.floor(surfaceAt(x)); blob(x, s - ry + 1, rx, ry, M.PLANTE, 0.3); }
  function pond(cx, w, depth) { const s = Math.floor(surfaceAt(cx)); fillEllipse(cx, s + 1, w / 2, depth + 1, M.AIR); fillEllipse(cx, s + 1, w / 2 - 1, depth, M.EAU); }
  function island(cx, cy, rx, ry) {
    blob(cx, cy + 1, rx, ry, M.PIERRE, 0.3);
    blob(cx, cy - ry * 0.4, rx * 0.95, ry * 0.6, M.TERRE, 0.2);
    for (let x = Math.floor(cx - rx); x <= cx + rx; x++) { for (let y = cy - ry - 3; y < cy + ry; y++) { if (Sim.get(x, y) !== M.AIR && Sim.get(x, y - 1) === M.AIR) { if (U.hash2(x, y) < 0.7) Sim.set(x, y - 1, M.HERBE); break; } } }
  }
  function surfaceTop(x) { for (let y = 0; y < H; y++) { const m = Sim.get(x, y); if (m !== M.AIR && m !== M.HERBE && m !== M.PLANTE && !Sim.P[m].gas) return y; } return H; }
  const px = (x) => x * CS, py = (y) => y * CS;
  const onGround = (x, h) => ({ x: px(x), y: py(surfaceTop(x)) - h });

  function generate(seed = 7) {
    ARBRES = [];
    R = U.mulberry32(seed);
    Sim.init(W0, H);
    const surf = new Int16Array(W0);
    // ---- terrain de base ----
    for (let x = 0; x < W0; x++) {
      const s = Math.floor(surfaceAt(x)); surf[x] = s;
      const terreH = 9 + Math.floor(U.hash2(x, 1) * 6);
      for (let y = s; y < H; y++) {
        Sim.set(x, y, y < s + terreH ? M.TERRE : M.PIERRE);
      }
      if (U.hash2(x, 2) < 0.55 && x > 36) Sim.set(x, s - 1, M.HERBE);
    }
    // poches de sable, veines de métal et de cristal (en taches)
    for (let k = 0; k < 40; k++) { const x = 20 + R() * (W0 - 40), y = 150 + R() * 100; blob(x, y, 4 + R() * 6, 2 + R() * 3, M.SABLE, 0.4); }
    for (let k = 0; k < 18; k++) { const x = 20 + R() * (W0 - 40), y = 170 + R() * 85; blob(x, y, 2 + R() * 3, 1 + R() * 2, M.METAL, 0.4); }
    for (let k = 0; k < 14; k++) { const x = 20 + R() * (W0 - 40), y = 185 + R() * 70; blob(x, y, 1.5 + R() * 2, 1.5 + R() * 2, M.CRISTAL, 0.4); }
    fillRect(0, 0, 1, H, M.PIERRE); fillRect(W0 - 1, 0, 1, H, M.PIERRE);
    // ---- Labo : plateau et mur ----
    fillRect(0, 60, 9, 71, M.PIERRE);
    for (let x = 0; x < 14; x++) Sim.set(x, surf[x] - 1, M.AIR);
    // ---- Jardin (40-120) ----
    pond(96, 12, 4);
    bush(70); bush(108, 2, 2);
    // puits vers la grotte A
    fillRect(116, surf[116] - 1, 3, 1, M.AIR); fillRect(116, surf[116], 3, 42, M.AIR); fillRect(115, surf[115] - 1, 1, 44, M.PIERRE); fillRect(119, surf[119] - 1, 1, 44, M.PIERRE);
    for (let y = surf[116]; y < surf[116] + 42; y++) if (y % 2 === 0) Sim.set(118, y, M.PLANTE);
    // ---- Forêt (120-220) ----
    for (const [x, h] of [[128, 12], [142, 16], [156, 11], [170, 18], [186, 13], [200, 15], [212, 10]]) tree(x, h, 5 + (h > 14 ? 2 : 0), 4);
    bush(135); bush(178); bush(206, 2, 2);
    // sève au pied du grand arbre
    { const s = surf[170]; fillRect(173, s - 1, 4, 1, M.SEVE); fillRect(164, s - 1, 3, 1, M.SEVE); }
    // ---- Lac (220-330) ----
    fillEllipse(275, 136, 52, 26, M.AIR);
    fillEllipse(275, 134, 50, 24, M.EAU);
    fillRect(222, 132, 106, 2, M.AIR);
    // fond de sable + pierres de gué
    fillEllipse(275, 160, 44, 6, M.SABLE);
    for (const x of [248, 268, 290, 306]) fillRect(x, 128 + (x % 3), 4, 8, M.PIERRE);
    fillRect(256, 150, 6, 3, M.PIERRE);
    // ---- Montagne enneigée (330-445) ----
    for (let x = 350; x < 450; x++) { const s = surf[x]; if (s < 105) { const d = Math.min(3, Math.floor((105 - s) / 8) + 1); for (let k = 1; k <= d; k++) Sim.set(x, s - k, M.NEIGE); } }
    // mare gelée au sommet, blocs de glace
    fillEllipse(400, 76, 9, 4, M.AIR); fillEllipse(400, 76, 8, 3, M.EAU); fillRect(391, 73, 18, 2, M.GLACE);
    fillRect(372, surf[372] - 8, 5, 8, M.GLACE); fillRect(436, surf[436] - 6, 4, 6, M.GLACE);
    // entrée de grotte sur le flanc est → poche d'acide
    tunnel(452, surf[452] + 2, 440, 150, 3); tunnel(440, 150, 445, 185, 3);
    // ---- Volcan (445-560) ----
    fillEllipse(505, 92, 14, 7, M.OBSIDIENNE);
    fillEllipse(505, 92, 11, 5, M.AIR);
    fillEllipse(505, 95, 10, 3, M.LAVE);
    fillRect(503, 97, 4, 90, M.OBSIDIENNE); fillRect(504, 97, 2, 90, M.LAVE);
    fillEllipse(505, 195, 22, 9, M.OBSIDIENNE); fillEllipse(505, 195, 19, 7, M.LAVE); fillEllipse(505, 188, 19, 4, M.AIR);
    for (let x = 545; x < 580; x++) { const s = surf[x]; for (let y = s; y < s + 6; y++) Sim.set(x, y, M.SABLE); }
    // ---- Clairière (560-700) ----
    pond(640, 16, 4); bush(600); bush(612, 2, 2); bush(690);
    tree(665, 14, 6, 4);
    fillRect(676, surf[676] - 1, 3, 1, M.SEVE);
    // ---- Marais et ruines (700-820) ----
    pond(715, 10, 3); pond(745, 14, 3); pond(790, 10, 2);
    for (const x of [760, 772, 808]) { const s = surf[x]; fillRect(x, s - 10, 2, 10, M.METAL); }
    fillRect(760, surf[766] - 19, 14, 1, M.METAL); fillRect(760, surf[766] - 18, 1, 8, M.METAL); fillRect(773, surf[766] - 18, 1, 8, M.METAL);
    { const s = surf[766]; fillRect(762, s - 10, 10, 6, M.VERRE); fillRect(764, s - 9, 6, 4, M.AIR); }
    // ---- Désert (820-900) ----
    for (let x = 820; x < W0 - 1; x++) { const s = surf[x]; for (let y = s - 2; y < s + 8; y++) Sim.set(x, y, M.SABLE); if (Sim.get(x, s - 3) === M.HERBE) Sim.set(x, s - 3, M.AIR); if (Sim.get(x, s - 1) === M.HERBE) Sim.set(x, s - 1, M.AIR); }
    for (let x = 864; x < 892; x++) { const s0 = surfaceTop(x); for (let k = 0; k < 2; k++) if (Sim.get(x, s0 + k) === M.SABLE) Sim.set(x, s0 + k, M.SEL); }
    blob(856, surf[856] - 2, 4, 3, M.CRISTAL, 0.3);
    blob(885, surf[885] - 1, 3, 2, M.CRISTAL, 0.3);
    // ---- Souterrains ----
    // A : grotte de la forêt, cristaux au plafond
    fillEllipse(150, 178, 34, 13, M.AIR);
    for (let k = 0; k < 10; k++) { const x = 122 + Math.floor(R() * 56); blob(x, 166 + Math.floor(R() * 3), 2, 2, M.CRISTAL, 0.4); }
    fillRect(116, surf[116] + 40, 3, 3, M.AIR);
    // B : lac souterrain
    fillEllipse(275, 208, 42, 18, M.AIR); fillEllipse(275, 215, 40, 10, M.EAU);
    tunnel(180, 182, 236, 200, 3);
    // C : poche d'acide
    fillEllipse(455, 198, 28, 12, M.AIR); fillEllipse(455, 206, 24, 5, M.OBSIDIENNE); fillEllipse(455, 205, 22, 4, M.ACIDE);
    fillRect(430, 196, 3, 3, M.PIERRE);
    tunnel(316, 205, 428, 195, 3);
    // D : nappe d'huile sous la forêt
    fillEllipse(205, 232, 22, 8, M.AIR); fillEllipse(205, 236, 20, 4, M.HUILE);
    tunnel(160, 190, 190, 226, 2);
    // E : tunnels sous la clairière avec champignons, vers le désert
    fillEllipse(650, 190, 36, 10, M.AIR); tunnel(560, 170, 616, 188, 3); tunnel(540, surf[540] + 3, 560, 170, 3);
    tunnel(684, 190, 760, 210, 3); fillEllipse(790, 212, 30, 12, M.AIR); for (let k = 0; k < 8; k++) blob(768 + Math.floor(R() * 44), 202 + Math.floor(R() * 3), 2, 2, M.CRISTAL, 0.4);
    tunnel(818, 210, 850, surf[850] + 4, 3);
    // poche de poudre oubliée sous les ruines
    fillEllipse(745, 226, 7, 3, M.AIR); fillEllipse(745, 228, 6, 2, M.POUDRE); tunnel(745, 222, 742, 210, 2);
    // mousse sur les pierres humides du lac souterrain
    for (let x = 240; x < 312; x++) for (let y = 196; y < 222; y++) if (Sim.get(x, y) === M.PIERRE && Sim.get(x, y - 1) === M.AIR && U.hash2(x, y) < 0.35) Sim.set(x, y - 1, M.MOUSSE);
    // cave scellée du désert : une trappe à grille, ouverte par le moulin à vent
    const T_CAVE = surfaceTop(843);
    for (let x = 830; x <= 856; x++) for (let y = T_CAVE; y <= T_CAVE + 15; y++) Sim.set(x, y, M.PIERRE);
    for (let x = 833; x <= 853; x++) for (let y = T_CAVE + 3; y <= T_CAVE + 12; y++) Sim.set(x, y, M.AIR);
    for (let x = 840; x <= 848; x++) for (let y = T_CAVE; y <= T_CAVE + 2; y++) Sim.set(x, y, M.AIR);
    // ---- Îles volantes ----
    island(110, 48, 15, 6);
    island(300, 36, 22, 8); fillEllipse(300, 30, 7, 3, M.AIR); fillEllipse(300, 30, 6, 2, M.EAU); Sim.set(300, 33, M.AIR); Sim.set(300, 34, M.AIR);
    island(520, 56, 13, 5);
    island(730, 44, 17, 6);

    // ---- Objets et créatures (pixels) ----
    const o = (t, x, h, extra = {}) => Object.assign({ t }, onGround(x, h), extra);
    const objs = [
      o('porte', 4, 110), o('pancarte', 22, 70, { texte: 'Terrain d\'essai. Vise à la souris, lance avec le clic. X pour creuser, E pour agir.' }),
      o('mannequin', 56, 70), o('caisse', 64, 36), o('torche', 80, 80), o('graine', 86, 10), o('graine', 112, 10),
      o('pancarte', 113, 70, { texte: 'Un puits. La vigne descend vers une grotte.' }),
      // forêt
      o('torche', 150, 80), o('champignon', 163, 26), o('caisse', 195, 36), o('graine', 218, 10),
      // lac
      o('pancarte', 232, 70, { texte: 'Le lac. On nage, on gèle, on bout.' }), o('torche', 324, 80),
      // montagne
      o('pancarte', 352, 70, { texte: 'Il neige là-haut. Une grotte s\'ouvre sur l\'autre flanc.' }), o('rocher', 380, 56), o('graine', 420, 10),
      // volcan
      o('pancarte', 470, 70, { texte: 'Le volcan dort. Sa lave coule jusqu\'au fond.' }), o('rocher', 540, 56),
      // clairière
      o('mannequin', 590, 70), o('torche', 622, 80), o('graine', 655, 10), o('caisse', 684, 36), o('rune', 585, 60),
      // marais
      o('pancarte', 705, 70, { texte: 'Les ruines de métal. La foudre les aime.' }), o('torche', 780, 80),
      // désert
      o('pancarte', 830, 70, { texte: 'Le sable chauffé devient verre, dit-on.' }), o('rocher', 872, 56), o('rune', 892, 60),
    ];
    // ---- Mécanismes et énigmes : chaque coffre scellé s'ouvre quand tout son circuit est actif ----
    const sol = (t, x, h, extra = {}) => { const xi = Math.round(x); let y = 64; while (y < H - 1 && (Sim.get(xi, y) === M.AIR || Sim.get(xi, y) === M.HERBE || Sim.get(xi, y) === M.PLANTE || Sim.P[Sim.get(xi, y)].gas)) y++; return Object.assign({ t, x: px(x), y: py(y) - h }, extra); };
    objs.push(
      // jardin : le levier
      sol('levier', 32, 34, { canal: 'j1' }), sol('coffre', 40, 30, { canal: 'j1', nom: 'Le coffre du jardin', indice: 'Un levier, tout près.', recompense: { xp: 20, ing: { nacre: 1, ambre: 1 } } }),
      // forêt : la plaque
      sol('plaque', 176, 8, { canal: 'f1' }), sol('coffre', 186, 30, { canal: 'f1', nom: 'Le coffre de la forêt', indice: 'La plaque veut un poids qui reste.', recompense: { xp: 30, ing: { coeur_braise: 1, pollen: 1 } } }),
      // lac : la roue à aubes, à sec
      sol('pancarte', 199, 70, { texte: 'La roue à aubes est à sec. Il faudrait lui amener l\'eau du lac.' }), sol('roue', 205, 44, { canal: 'l1' }), sol('coffre', 212, 30, { canal: 'l1', nom: 'Le coffre du meunier', indice: 'La roue tourne quand l\'eau la baigne.', recompense: { xp: 40, ing: { larme_lune: 1 }, encre: { encre_nacre: 8 } } }),
      // volcan : deux brasiers, un seul souffle
      sol('pancarte', 486, 70, { texte: 'Deux feux, un seul souffle.' }), sol('brasier', 494, 30, { canal: 'v1' }), sol('brasier', 530, 30, { canal: 'v1' }), sol('coffre', 512, 30, { canal: 'v1', nom: 'Le coffre des braises', indice: 'Les deux brasiers doivent brûler ensemble.', recompense: { xp: 50, ing: { plume_phenix: 1, coeur_braise: 2 } } }),
      // clairière : trois leviers, une combinaison
      sol('pancarte', 626, 70, { texte: 'Bas, haut, haut.' }), sol('levier', 634, 34, { canal: 'c1', etat: true, voulu: false }), sol('levier', 640, 34, { canal: 'c1', etat: false, voulu: true }), sol('levier', 646, 34, { canal: 'c1', etat: false, voulu: true }),
      sol('coffre', 664, 30, { canal: 'c1', nom: 'Le coffre à secret', indice: 'Les leviers, dans le bon ordre.', recompense: { xp: 50, ing: { coeur_chene: 1, pollen: 2 } } }),
      // ruines : la lampe d'éclair et la plaque
      sol('lampe', 716, 36, { canal: 'r1' }), sol('plaque', 728, 8, { canal: 'r1' }), sol('coffre', 744, 30, { canal: 'r1', nom: 'Le coffre des ruines', indice: 'La lampe veut la foudre, la plaque un poids. Ensemble.', recompense: { xp: 60, ing: { sable_temps: 1, poudre_or: 2 } } }),
      // désert : le moulin à vent ouvre la trappe
      sol('moulin', 824, 76, { canal: 'd1' }), sol('pancarte', 834, 70, { texte: 'Le vent fait tourner le moulin. Le moulin ouvre la trappe.' }),
      // énigmes de fusion : chaque stèle attend une fusion précise (ses essences y sont gravées)
      sol('stele', 69, 66, { canal: 'e1', nom: 'La stèle de la source', indice: 'L\'eau qui soigne.', veut: ['eau|vie'] }),
      sol('coffre', 73.5, 30, { v: 2, canal: 'e1', nom: 'Le coffre de la source', indice: 'La stèle veut une fusion. Ses deux essences y sont gravées.', recompense: { xp: 40, ing: { larme_lune: 1, pollen: 1 } } }),
      sol('pancarte', 393, 70, { v: 2, texte: 'Le passeur ne bâtit pas de pont : il le fait naître de rien.' }),
      sol('stele', 403, 66, { canal: 'e2', nom: 'La stèle du passeur', indice: 'Un pont qui ne tient à rien.', veut: ['eau|lumiere', 'transmutation|vent', 'terre|vie'] }),
      sol('coffre', 407, 30, { v: 2, canal: 'e2', nom: 'Le coffre du passeur', indice: 'Un pont de lumière, d\'air figé ou de racines, près de la stèle.', recompense: { xp: 60, ing: { plume_phenix: 1 }, encre: { encre_nacre: 6 } } }),
      sol('stele', 552, 66, { canal: 'e3', nom: 'Le cœur du volcan', indice: 'Le feu, la pierre et la pesanteur, ensemble : une fusion à trois.', veut: ['feu|gravite|terre'] }),
      sol('coffre', 555.7, 30, { v: 2, canal: 'e3', nom: 'Le coffre du cœur', indice: 'Fais naître une montagne qui crache, au grand sceau.', recompense: { xp: 120, ing: { coeur_braise: 2, sable_temps: 1 }, encre: { encre_or: 6 } } }),
      sol('pancarte', 754, 70, { v: 2, texte: 'Le carillon chante depuis mille ans. Qui le brise trouvera.' }),
      sol('stele', 760, 60, { canal: 'e4', style: 'cloche', nom: 'Le carillon de verre', indice: 'Un fracas d\'orage, ou un choc de chaud et de froid.', veut: ['foudre|son', 'feu|froid'] }),
      sol('coffre', 767, 30, { v: 2, canal: 'e4', nom: 'Le coffre du carillon', indice: 'Le carillon doit se briser, d\'une fusion.', recompense: { xp: 80, ing: { poudre_or: 2, eclat: 2 } } }),
    );
    objs.push({ t: 'grille', x: px(840), y: py(T_CAVE), horiz: true, canal: 'd1' }, { t: 'coffre', x: px(841), y: py(T_CAVE + 13) - 30, nom: 'Le coffre de la cave', recompense: { xp: 70, encre: { encre_or: 8 }, ing: { sable_chantant: 2 } } });
    // objets placés dans les grottes / îles (positions explicites)
    const at = (t, x, y, extra = {}) => Object.assign({ t, x: px(x), y: py(y) }, extra);
    objs.push(at('ruche', 137, surfaceTop(137) - 14), at('ruche', 181.5, surfaceTop(182) - 11), at('ruche', 660, surfaceTop(661) - 12), o('pancarte', 738, 70, { texte: 'Sous les ruines dort une vieille réserve de poudre. Pas de torche !' }));
    objs.push(at('champignon', 134, 189 - 4.5), at('champignon', 158, 189 - 4.5), at('champignon', 172, 189 - 4.5), at('rune', 150, 171), at('torche', 270, 205 - 13.3));
    objs.push(at('champignon', 640, 198 - 4.5), at('champignon', 660, 198 - 4.5), at('champignon', 785, 221 - 4.5), at('champignon', 800, 221 - 4.5), at('rune', 790, 203));
    objs.push(at('graine', 104, 41 - 1.7), at('torche', 522, 50 - 13.3), at('rune', 515, 44), at('champignon', 730, 37 - 4.5), at('graine', 736, 37 - 1.7));
    // pages déchirées
    objs.push(at('page', 150, 189 - 4, { page: 'p_puits' }), at('page', 275, 158 - 4, { page: 'p_lac' }), at('page', 400, 70 - 4, { page: 'p_sommet' }), at('page', 512, 192 - 4, { page: 'p_volcan' }));
    objs.push(at('page', 112, 41 - 4, { page: 'p_ile1' }), at('page', 312, 29 - 4, { page: 'p_ile2' }), at('page', 528, 50 - 4, { page: 'p_ile3' }), at('page', 740, 37 - 4, { page: 'p_ile4' }));
    objs.push(at('page', 470, 200 - 4, { page: 'p_acide' }), at('page', 220, 231 - 4, { page: 'p_huile' }), o('page', 48, 24, { page: 'p_crepes' }), o('page', 896, 24, { page: 'p_desert' }), at('page', 450, 256, { page: 'p_fond' }));
    const c = (t, x, h) => Object.assign({ t }, onGround(x, h));
    const crs = [
      c('limace', 74, 24), c('limace', 190, 24), c('follet', 140, 24), c('limace', 310, 24), c('golem', 380, 70), c('follet', 456, 24),
      c('golem', 575, 70), c('limace', 630, 24), c('limace', 740, 24), c('golem', 800, 70), c('limace', 870, 24),
      { t: 'follet', x: px(150), y: py(172) }, { t: 'follet', x: px(255), y: py(200) }, { t: 'follet', x: px(650), y: py(185) }, { t: 'limace', x: px(790), y: py(220) },
      { t: 'follet', x: px(300), y: py(26) },
      // écosystème
      c('grenouille', 232, 18), c('grenouille', 322, 18), c('grenouille', 716, 18), c('grenouille', 748, 18),
      { t: 'corbeau', x: px(140), y: py(100) }, { t: 'corbeau', x: px(650), y: py(100) }, { t: 'corbeau', x: px(790), y: py(95) },
      c('salamandre', 492, 16), { t: 'salamandre', x: px(500), y: py(186) },
      { t: 'poisson', x: px(262), y: py(142) }, { t: 'poisson', x: px(288), y: py(148) }, { t: 'poisson', x: px(300), y: py(140) }, { t: 'poisson', x: px(270), y: py(214) },
      { t: 'chauve', x: px(140), y: py(170) }, { t: 'chauve', x: px(290), y: py(196) }, { t: 'chauve', x: px(650), y: py(184) },
      { t: 'escargot', x: px(166), y: py(189) - 16 }, { t: 'escargot', x: px(778), y: py(221) - 16 },
      c('tortue', 838, 18), c('tortue', 880, 18),
      c('lapin', 390, 20), c('lapin', 421, 20),
    ];
    for (const q of crs) if (q.t === 'follet') q.y -= 60;
    const zones0 = [
      { nom: 'Le Jardin', x: 0, w: 120 }, { nom: 'La Forêt', x: 120, w: 100 }, { nom: 'Le Lac', x: 220, w: 110 }, { nom: 'La Montagne', x: 330, w: 115 },
      { nom: 'Le Volcan', x: 445, w: 115 }, { nom: 'La Clairière', x: 560, w: 140 }, { nom: 'Les Ruines', x: 700, w: 120 }, { nom: 'Le Désert', x: 820, w: 80 },
    ];
    // ---------- étirement et transitions ----------
    const mat0 = Sim.mat.slice(), aux0 = Sim.aux.slice();
    const get0 = (x, y) => (x < 0 || x >= W0 || y < 0 || y >= H ? M.PIERRE : mat0[y * W0 + x]);
    Sim.init(W, H);
    const surfN = new Int16Array(W);
    const mat = Sim.mat, aux = Sim.aux;
    for (const g of SEG) {
      if (g.o) {
        const L0 = g.o[1] - g.o[0];
        for (let i = 0; i < g.n; i++) { const xo = Math.min(g.o[1] - 1, g.o[0] + Math.floor((i + 0.5) * L0 / g.n)); const X1 = g.a + i; surfN[X1] = surf[xo]; for (let y = 0; y < H; y++) { mat[y * W + X1] = mat0[y * W0 + xo]; aux[y * W + X1] = aux0[y * W0 + xo]; } }
        continue;
      }
      // transition : relief interpolé entre les deux régions voisines
      const iG = SEG.indexOf(g), xl = SEG[iG - 1].o[1] - 1, xr = SEG[iG + 1].o[0];
      const sL = surf[xl], sR = surf[xr];
      // un tunnel ne se prolonge que s'il traverse vraiment la frontière (ouvert des deux côtés, et pas un puits vertical)
      const vide = (q) => q === M.AIR || Sim.P[q].liquid || Sim.P[q].gas;
      const ouvert = new Uint8Array(H); for (let y = Math.max(sL, sR) + 3; y < H; y++) ouvert[y] = vide(get0(xl, y)) || vide(get0(xr, y)) ? 1 : 0;
      for (let y = 0; y < H;) { if (!ouvert[y]) { y++; continue; } let e = y; while (e < H && ouvert[e]) e++; if (e - y > 30) for (let k = y; k < e; k++) ouvert[k] = vide(get0(xl, k)) && vide(get0(xr, k)) ? 1 : 0; y = e; }
      for (let i = 0; i < g.n; i++) {
        const t = (i + 0.5) / g.n, X1 = g.a + i, k = smooth(t);
        let sf = sL + (sR - sL) * k + Math.sin(X1 * 0.31) * 0.7 + Math.sin(X1 * 0.11) * 1.1;
        if (g.t === 'prairie') sf -= Math.sin(t * Math.PI) * 3;
        if (g.t === 'collines') sf -= Math.abs(Math.sin(t * Math.PI * 2)) * 9 + Math.sin(t * Math.PI) * 4;
        if (g.t === 'marais') sf += Math.sin(t * Math.PI) * 3;
        if (g.t === 'dunes') sf -= Math.abs(Math.sin(t * Math.PI * 3)) * 6;
        if (g.t === 'cendres') sf -= Math.sin(t * Math.PI * 2) * 2;
        const S0 = Math.floor(sf); surfN[X1] = S0;
        const xb = t < 0.5 ? xl : xr, base = Math.max(S0, surf[xb]) + 12, terreH = 9 + Math.floor(U.hash2(X1, 1) * 5);
        for (let y = 0; y < H; y++) {
          let m;
          if (y < S0) m = M.AIR;
          else if (ouvert[y]) { const q = get0(xb, y), q2 = get0(xb === xl ? xr : xl, y); m = vide(q) && q !== M.AIR ? q : vide(q2) && q2 !== M.AIR ? q2 : M.AIR; }
          else { const q = get0(xb, y); m = y > base && !vide(q) ? q : y < S0 + terreH ? M.TERRE : M.PIERRE; }
          mat[y * W + X1] = m; aux[y * W + X1] = 0;
        }
      }
    }
    for (let i = 0; i < mat.length; i++) if (mat[i]) Sim.touch(i);
    const sAt = (x) => surfN[Math.max(0, Math.min(W - 1, Math.round(x)))];
    const herbe = (x) => { const y = sAt(x); if (Sim.get(x, y - 1) === M.AIR && Sim.get(x, y) === M.TERRE) Sim.set(x, y - 1, M.HERBE); };
    const arbreN = (x, h, rx, ry) => { const y = sAt(x); for (let k = 0; k <= h; k++) { Sim.set(x, y - k, M.BOIS); Sim.set(x + 1, y - k, M.BOIS); } blob(x + 1, y - h - ry + 1, rx, ry, M.PLANTE, 0.35); ARBRES.push({ x, h, rx, ry, nouveau: true }); };
    const objsN = [], crsN = [];
    const oN = (t, x, h, extra = {}) => Object.assign({ t, x: px(x), y: py(sAt(x)) - h }, extra);
    for (const g of SEG) {
      if (g.o) continue;
      const a = g.a, b = g.a + g.n, mid = Math.floor((a + b) / 2);
      switch (g.t) {
        case 'prairie':
          for (let x = a; x < b; x++) if (U.hash2(x, 7) < 0.8) herbe(x);
          for (const x of [a + 10, a + 26, a + 44]) { const y = sAt(x); blob(x, y - 2, 3, 2, M.PLANTE, 0.3); }
          for (let x = a + 4; x < b - 4; x += 5) if (U.hash2(x, 3) < 0.5) { const y = sAt(x); Sim.set(x, y - 2, M.PLANTE); }
          arbreN(a + 36, 9, 4, 3);
          objsN.push(oN('graine', a + 18, 10), oN('pancarte', a + 52, 70, { texte: 'La prairie. Les lapins y font leurs petits au printemps.' }), oN('pancarte', a + 4, 70, { v: 2, texte: 'L\'Ent-ronce garde l\'orée. Le bois vivant craint la flamme.' }));
          crsN.push({ t: 'gardien', g: 'ent', x: px(mid + 4), y: py(sAt(mid + 4)) - 125 });
          crsN.push(oN('lapin', a + 20, 20), oN('lapin', a + 30, 20), oN('escargot', a + 46, 16));
          break;
        case 'riviere': {
          // un ruisseau qui descend vers le lac, et un pont de bois
          for (let x = mid - 9; x <= mid + 9; x++) { const d = 1 - Math.abs(x - mid) / 10; const y0 = sAt(x); for (let k = 0; k < Math.ceil(5 * d); k++) Sim.set(x, y0 + k, M.AIR); }
          const niveau = Math.min(sAt(mid - 10), sAt(mid + 10)) + 1;
          for (let x = mid - 9; x <= mid + 9; x++) for (let y = niveau; y < H; y++) { if (Sim.get(x, y) !== M.AIR) break; Sim.set(x, y, M.EAU); }
          for (let x = mid - 11; x <= mid + 11; x++) Sim.set(x, niveau - 3, M.BOIS);
          for (const x of [mid - 11, mid + 11]) { Sim.set(x, niveau - 2, M.BOIS); Sim.set(x, niveau - 1, M.BOIS); }
          for (let x = a; x < b; x++) if (Math.abs(x - mid) > 12 && U.hash2(x, 5) < 0.7) herbe(x);
          for (const x of [mid - 15, mid + 14, mid + 16]) { const y = sAt(x); Sim.set(x, y - 1, M.PLANTE); Sim.set(x, y - 2, M.PLANTE); Sim.set(x, y - 3, M.PLANTE); }
          arbreN(a + 6, 12, 5, 4); arbreN(b - 8, 10, 4, 3);
          objsN.push(oN('pancarte', a + 14, 70, { texte: 'La rivière descend vers le lac. Le pont est en bois...' }));
          crsN.push(oN('grenouille', mid - 14, 18), { t: 'poisson', x: px(mid), y: py(niveau + 2) });
          break;
        }
        case 'collines':
          crsN.push({ t: 'gardien', g: 'cerf', x: px(mid - 4), y: py(sAt(mid - 4)) - 100 });
          objsN.push(oN('pancarte', a + 50, 70, { v: 2, texte: 'Le Grand Cerf charge tout droit. Il ne voit pas les murs.' }));
          for (let x = a; x < b; x++) if (U.hash2(x, 9) < 0.5) herbe(x);
          for (const x of [a + 14, a + 40]) { const y = sAt(x); blob(x, y, 4, 3, M.PIERRE, 0.4); }
          { const y = sAt(mid); fillEllipse(mid, y + 14, 10, 5, M.AIR); for (let k = 0; k < 4; k++) blob(mid - 6 + k * 4, y + 18, 1.5, 1.5, M.CRISTAL, 0.4); tunnel(mid + 14, sAt(mid + 14) + 1, mid + 6, y + 13, 2); }
          objsN.push(oN('rocher', a + 26, 56), oN('rocher', b - 12, 56), oN('pancarte', a + 6, 70, { texte: 'Les collines. Un trou mène à une petite grotte.' }));
          crsN.push(oN('lapin', a + 34, 20), oN('golem', b - 20, 70));
          break;
        case 'gorge': {
          // une gorge profonde, enjambée par un pont de bois ; des vignes pour remonter
          const y0 = Math.max(sAt(mid - 14), sAt(mid + 14));
          for (let x = mid - 10; x <= mid + 10; x++) { const w = Math.abs(x - mid) <= 7 ? 46 : 46 - (Math.abs(x - mid) - 7) * 10; for (let y = sAt(x); y < y0 + w; y++) Sim.set(x, y, M.AIR); }
          for (let x = mid - 7; x <= mid + 7; x++) for (let y = y0 + 40; y < y0 + 46; y++) Sim.set(x, y, M.EAU);
          for (let x = mid - 12; x <= mid + 12; x++) { Sim.set(x, y0 - 1, M.BOIS); }
          for (const x of [mid - 12, mid + 12]) for (let y = y0; y < y0 + 3; y++) Sim.set(x, y, M.BOIS);
          for (let y = y0 + 2; y < y0 + 40; y++) if (y % 2 === 0) { Sim.set(mid - 8, y, M.PLANTE); Sim.set(mid + 8, y, M.PLANTE); }
          for (let x = a; x < b; x++) if (Math.abs(x - mid) > 12 && U.hash2(x, 4) < 0.4) herbe(x);
          objsN.push(oN('pancarte', mid - 18, 70, { texte: 'La gorge. Le pont tient encore. Ne joue pas avec le feu.' }));
          crsN.push({ t: 'chauve', x: px(mid), y: py(y0 + 20) }, { t: 'corbeau', x: px(mid + 4), y: py(y0 - 30) });
          break;
        }
        case 'cendres':
          crsN.push({ t: 'gardien', g: 'magma', x: px(mid - 3) - 37, y: py(sAt(mid - 3)) - 110 });
          for (let x = a; x < b; x++) { const y = sAt(x); for (let k = 0; k < 2; k++) Sim.set(x, y + k, M.CENDRE); }
          for (const x of [a + 12, a + 30, b - 14]) { const y = sAt(x); blob(x, y - 1, 3, 2, M.OBSIDIENNE, 0.4); }
          for (const x of [a + 20, a + 44]) { const y = sAt(x); for (let k = 1; k <= 7; k++) Sim.set(x, y - k, M.BOIS); Sim.set(x + 1, y - 5, M.BOIS); Sim.set(x - 1, y - 6, M.BOIS); }
          { const y = sAt(mid + 6); fillEllipse(mid + 6, y + 1, 4, 2, M.AIR); fillEllipse(mid + 6, y + 2, 3, 1.5, M.LAVE); }
          objsN.push(oN('pancarte', a + 4, 70, { texte: 'La plaine de cendres. Le sol est encore tiède. Ce qui coule ici se fige au froid.' }));
          crsN.push(oN('salamandre', mid + 2, 16), { t: 'follet', x: px(a + 36), y: py(sAt(a + 36)) - 90 });
          break;
        case 'marais':
          crsN.push({ t: 'gardien', g: 'automate', x: px(mid + 6), y: py(sAt(mid + 6)) - 100 });
          for (const [x, w, m] of [[a + 10, 8, M.BOUE], [a + 26, 10, M.EAU], [a + 42, 8, M.BOUE], [b - 10, 7, M.EAU]]) { const y = sAt(x); fillEllipse(x, y + 1, w / 2, 3, M.AIR); fillEllipse(x, y + 2, w / 2 - 0.5, 2.5, m); }
          for (let x = a; x < b; x++) { if (U.hash2(x, 6) < 0.25) { const y = sAt(x); if (Sim.get(x, y - 1) === M.AIR) for (let k = 1; k <= 2 + (x % 3); k++) Sim.set(x, y - k, M.PLANTE); } if (U.hash2(x, 8) < 0.3) { const y = sAt(x); if (Sim.get(x, y) === M.TERRE) Sim.set(x, y, M.MOUSSE); } }
          arbreN(a + 18, 8, 3, 2); arbreN(b - 20, 11, 4, 3);
          objsN.push(oN('pancarte', a + 2, 70, { texte: 'Le marais. La boue colle aux bottes. L\'eau conduit la foudre.' }));
          crsN.push(oN('grenouille', a + 24, 18), oN('grenouille', a + 30, 18), oN('limace', a + 36, 24), oN('escargot', b - 16, 16));
          break;
        case 'dunes':
          for (let x = a; x < b; x++) { const y = sAt(x); for (let k = -1; k < 7; k++) if (Sim.get(x, y + k) !== M.AIR || k >= 0) Sim.set(x, y + k, M.SABLE); }
          for (const x of [a + 16, a + 38]) { const y = sAt(x) - 1; for (let k = 1; k <= 6; k++) Sim.set(x, y - k, M.PLANTE); Sim.set(x - 1, y - 4, M.PLANTE); Sim.set(x + 1, y - 3, M.PLANTE); }
          objsN.push(oN('pancarte', a + 4, 70, { texte: 'Les dunes. Le désert commence ici.' }));
          crsN.push(oN('tortue', a + 28, 18));
          break;
      }
    }
    // toutes les positions suivent l'étirement
    const remap = (q) => { q.x = X(q.x / CS) * CS; if (q.x0 !== undefined) q.x0 = X(q.x0 / CS) * CS; return q; };
    for (const q of objs) remap(q);
    for (const q of crs) remap(q);
    { const gr = objs.find((q) => q.t === 'grille' && q.horiz); if (gr) gr.largeur = (X(849) - X(840)) * CS; }
    for (const q of crsN) delete q.y0;
    for (const a of ARBRES) if (!a.nouveau) { const k = kAt(a.x); a.x = Math.round(X(a.x)); a.rx = Math.round(a.rx * k); }
    const zones = zones0.map((z) => { const g0 = SEG.find((g) => g.o && g.o[0] === z.x), g1 = SEG.find((g) => g.o && g.o[1] === z.x + z.w); return { nom: z.nom, x: g0.a * CS, w: (g1.a + g1.n - g0.a) * CS }; });
    for (const g of SEG) if (g.t) zones.push({ nom: g.nom, mood: g.mood, x: g.a * CS, w: g.n * CS });
    zones.sort((p, q) => p.x - q.x);
    // les bords du monde
    for (let y = 0; y < H; y++) { Sim.set(0, y, M.PIERRE); Sim.set(W - 1, y, M.PIERRE); }
    Sim.surf = surfN;
    Sim.dirtyAll();
    return { w: W * CS, h: H * CS, spawn: { x: px(12), y: py(surfN[12]) - 60 }, zones, objs: objs.concat(objsN), crs: crs.concat(crsN), surf: surfN, arbres: ARBRES.slice() };
  }
  return { generate, W, H, X };
})();
