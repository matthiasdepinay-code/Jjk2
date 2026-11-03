'use strict';
// ---------- Génération du grand monde (dessiné à la main, en cellules) ----------
const Gen = (() => {
  const W = 900, H = 260;
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
  function tree(x, h, rx = 5, ry = 4) {
    const s = Math.floor(surfaceAt(x));
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
    R = U.mulberry32(seed);
    Sim.init(W, H);
    const surf = new Int16Array(W);
    // ---- terrain de base ----
    for (let x = 0; x < W; x++) {
      const s = Math.floor(surfaceAt(x)); surf[x] = s;
      const terreH = 9 + Math.floor(U.hash2(x, 1) * 6);
      for (let y = s; y < H; y++) {
        Sim.set(x, y, y < s + terreH ? M.TERRE : M.PIERRE);
      }
      if (U.hash2(x, 2) < 0.55 && x > 36) Sim.set(x, s - 1, M.HERBE);
    }
    // poches de sable, veines de métal et de cristal (en taches)
    for (let k = 0; k < 40; k++) { const x = 20 + R() * (W - 40), y = 150 + R() * 100; blob(x, y, 4 + R() * 6, 2 + R() * 3, M.SABLE, 0.4); }
    for (let k = 0; k < 18; k++) { const x = 20 + R() * (W - 40), y = 170 + R() * 85; blob(x, y, 2 + R() * 3, 1 + R() * 2, M.METAL, 0.4); }
    for (let k = 0; k < 14; k++) { const x = 20 + R() * (W - 40), y = 185 + R() * 70; blob(x, y, 1.5 + R() * 2, 1.5 + R() * 2, M.CRISTAL, 0.4); }
    fillRect(0, 0, 1, H, M.PIERRE); fillRect(W - 1, 0, 1, H, M.PIERRE);
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
    for (let x = 820; x < W - 1; x++) { const s = surf[x]; for (let y = s - 2; y < s + 8; y++) Sim.set(x, y, M.SABLE); if (Sim.get(x, s - 3) === M.HERBE) Sim.set(x, s - 3, M.AIR); if (Sim.get(x, s - 1) === M.HERBE) Sim.set(x, s - 1, M.AIR); }
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
    const sol = (t, x, h, extra = {}) => { let y = 64; while (y < H - 1 && (Sim.get(x, y) === M.AIR || Sim.get(x, y) === M.HERBE || Sim.get(x, y) === M.PLANTE || Sim.P[Sim.get(x, y)].gas)) y++; return Object.assign({ t, x: px(x), y: py(y) - h }, extra); };
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
    const zones = [
      { nom: 'Le Jardin', x: 0, w: 120 }, { nom: 'La Forêt', x: 120, w: 100 }, { nom: 'Le Lac', x: 220, w: 110 }, { nom: 'La Montagne', x: 330, w: 115 },
      { nom: 'Le Volcan', x: 445, w: 115 }, { nom: 'La Clairière', x: 560, w: 140 }, { nom: 'Les Ruines', x: 700, w: 120 }, { nom: 'Le Désert', x: 820, w: 80 },
    ].map((z) => ({ nom: z.nom, x: z.x * CS, w: z.w * CS }));
    Sim.surf = surf;
    Sim.dirtyAll();
    return { w: W * CS, h: H * CS, spawn: { x: px(12), y: py(surf[12]) - 60 }, zones, objs, crs, surf };
  }
  return { generate, W, H };
})();
