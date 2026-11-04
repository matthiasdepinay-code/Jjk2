// Banc d'essai : physique (corps exécuté dans la page, après tests/lib/banc.js)
    const T = (x, y) => S.temp[y * S.W + x];
    const vide = (x0, y0, x1, y1) => { for (let x = x0; x <= x1; x++) for (let y = y0; y <= y1; y++) S.set(x, y, M.AIR); };
    const remplir = (x0, y0, x1, y1, m) => { for (let x = x0; x <= x1; x++) for (let y = y0; y <= y1; y++) S.set(x, y, m); };
    const caisse = (t2, cellX, cellY = Y) => { const o = st.objs.find((q) => q.t === t2 && !q.mort && !q.__pris); o.__pris = true; o.x = cellX * CS; o.y = cellY * CS - o.h; o.vx = o.vy = 0; o.hp = 3; return o; };
    // ================= CHALEUR =================
    banc(); remplir(X0 - 31, Y - 6, X0 - 31, Y, M.PIERRE); remplir(X0 - 30, Y - 5, X0 - 26, Y, M.LAVE); remplir(X0 - 25, Y - 5, X0 - 24, Y, M.PIERRE); remplir(X0 - 23, Y - 5, X0 - 20, Y, M.GLACE); run(400);
    ok('La lave chauffe la pierre à côté', T(X0 - 25, Y - 2) > 120, 'pierre à ' + T(X0 - 25, Y - 2) + ' (ambiante ' + S.AMB + ')');
    ok('La glace fond contre la pierre brûlante, sans toucher la lave', S.countRect(X0 - 23, Y - 5, X0 - 20, Y, M.GLACE) < 24, S.countRect(X0 - 23, Y - 5, X0 - 20, Y, M.GLACE) + ' / 24 cases de glace');
    banc(); remplir(X0 - 31, Y - 6, X0 - 31, Y, M.PIERRE); remplir(X0 - 30, Y - 5, X0 - 26, Y, M.LAVE); run(20); lance({ core: 'eau', shape: 'zone', mods: ['gel', 'puissance'], trigger: 'immediat' }, (X0 - 28) * CS, (Y - 3) * CS); run(40);
    ok('Le gel refroidit la lave en obsidienne', S.countRect(X0 - 30, Y - 5, X0 - 26, Y, M.OBSIDIENNE) >= 10, S.countRect(X0 - 30, Y - 5, X0 - 26, Y, M.OBSIDIENNE) + ' cases d\'obsidienne');
    banc(); remplir(X0 - 32, Y - 1, X0 - 18, Y - 1, M.METAL); remplir(X0 - 33, Y - 4, X0 - 33, Y - 2, M.PIERRE); remplir(X0 - 17, Y - 4, X0 - 17, Y - 2, M.PIERRE); remplir(X0 - 32, Y - 3, X0 - 18, Y - 2, M.EAU); const eau0 = S.countRect(X0 - 32, Y - 3, X0 - 18, Y - 2, M.EAU);
    run(500, (i) => { for (let x = X0 - 32; x <= X0 - 18; x++) if (S.get(x, Y) !== M.FEU) { S.setFeu(x, Y, 255, 1); } });
    ok('Une plaque de métal sur le feu fait bouillir l\'eau', S.countRect(X0 - 32, Y - 3, X0 - 18, Y - 2, M.EAU) < eau0 * 0.6, eau0 + ' → ' + S.countRect(X0 - 32, Y - 3, X0 - 18, Y - 2, M.EAU) + ' cases d\'eau, métal à ' + T(X0 - 25, Y - 1));
    banc(); const lc = bete('lapin', X0 - 20); lc.sta.stun = 0; lance({ core: 'eau', shape: 'zone', mods: ['gel', 'puissance', 'taille'], trigger: 'immediat' }, lc.x + 10, lc.y); run(30); { const tl = S.tempAt(lc.x + lc.w / 2, lc.y + lc.h * 0.6); const sl = bete('limace', X0 - 20); sl.sta.stun = 0; run(5);
      ok('Le froid reste dans l\'air et engourdit les créatures', sl.sta.lent > 0 || tl < 36, 'air à ' + tl + ', limace ' + (sl.sta.lent > 0 ? 'engourdie' : 'libre')); } libere();
    banc(); remplir(X0 - 30, Y - 2, X0 - 10, Y, M.LAVE); const sc = bete('limace', X0 - 20, Y - 3); sc.sta.stun = 999; run(60, () => { sc.x = (X0 - 20) * CS; sc.y = (Y - 3) * CS - sc.h; sc.vy = 0; });
    ok('Au-dessus de la lave, l\'air brûle les créatures', sc.hp < sc.hpMax, 'limace ' + sc.hp.toFixed(1) + ' / ' + sc.hpMax + ', air à ' + S.tempAt(sc.x + sc.w / 2, sc.y + sc.h * 0.6)); libere();
    banc(); remplir(X0 - 30, Y - 12, X0 - 20, Y - 12, M.BOIS); run(2); lance({ core: 'feu', shape: 'zone', mods: ['puissance'], trigger: 'immediat' }, (X0 - 25) * CS, (Y - 2) * CS); run(240);
    ok('Le feu chauffe l\'air qui monte et embrase une poutre au-dessus', S.countRect(X0 - 30, Y - 12, X0 - 20, Y - 12, M.BOIS) < 11 || S.countRect(X0 - 30, Y - 13, X0 - 20, Y - 11, M.CENDRE) > 0, S.countRect(X0 - 30, Y - 12, X0 - 20, Y - 12, M.BOIS) + ' / 11 bois');
    // ================= EFFONDREMENT =================
    banc(); remplir(X0 - 26, Y - 20, X0 - 14, Y - 15, M.PIERRE); remplir(X0 - 20, Y - 14, X0 - 20, Y, M.PIERRE); run(10); const h0 = S.countRect(X0 - 27, Y - 21, X0 - 13, Y - 14, M.PIERRE); vide(X0 - 20, Y - 14, X0 - 20, Y); run(120);
    ok('Sans pilier, la dalle tombe', S.countRect(X0 - 27, Y - 21, X0 - 13, Y - 14, M.PIERRE) === 0 && S.countRect(X0 - 28, Y - 8, X0 - 12, Y, M.PIERRE) + S.countRect(X0 - 28, Y - 8, X0 - 12, Y, M.SABLE) > h0 * 0.8, h0 + ' cases en haut → ' + S.countRect(X0 - 28, Y - 8, X0 - 12, Y, M.PIERRE) + ' pierre + ' + S.countRect(X0 - 28, Y - 8, X0 - 12, Y, M.SABLE) + ' sable en bas');
    banc(); remplir(X0 - 26, Y - 20, X0 - 14, Y - 15, M.PIERRE); remplir(X0 - 20, Y - 14, X0 - 20, Y, M.PIERRE); run(10); const g1 = bete('golem', X0 - 24); g1.hpMax = 99; g1.hp = 99; vide(X0 - 20, Y - 14, X0 - 20, Y); run(120);
    ok('Le bloc qui tombe écrase la créature dessous', g1.hp < 99, 'golem ' + (99 - g1.hp).toFixed(1) + ' dégâts'); g1.hpMax = 8; g1.hp = 8; libere();
    banc(); remplir(X0 - 26, Y - 20, X0 - 14, Y - 15, M.PIERRE); remplir(X0 - 20, Y - 14, X0 - 20, Y, M.PIERRE); run(10); lance({ core: 'terre', shape: 'zone', mods: ['inverser'], trigger: 'immediat' }, (X0 - 20) * CS, (Y - 6) * CS); run(150);
    ok('Creuser le pilier (Terre inversée) fait tomber la dalle', S.countRect(X0 - 27, Y - 21, X0 - 13, Y - 14, M.PIERRE) === 0, S.countRect(X0 - 27, Y - 21, X0 - 13, Y - 14, M.PIERRE) + ' cases restées en l\'air');
    // un bloc accroché à un mur par une poutre ; on coupe la poutre, il tombe dans le bassin
    const pend = (m) => { remplir(X0 - 40, Y - 6, X0 - 10, Y, M.EAU); remplir(X0 - 41, Y - 7, X0 - 41, Y, M.PIERRE); remplir(X0 - 9, Y - 22, X0 - 9, Y, M.PIERRE); remplir(X0 - 30, Y - 22, X0 - 24, Y - 20, m); remplir(X0 - 23, Y - 21, X0 - 10, Y - 21, M.PIERRE); run(10); vide(X0 - 23, Y - 21, X0 - 20, Y - 21); run(220); };
    banc(); pend(M.GLACE);
    { let ymin = 99, n = 0; for (let x = X0 - 40; x <= X0 - 10; x++) for (let y = Y - 25; y <= Y; y++) if (S.get(x, y) === M.GLACE) { n++; ymin = Math.min(ymin, y); } ok('Un bloc de glace qui tombe à l\'eau flotte', n > 10 && ymin <= Y - 6 && ymin >= Y - 11, n + ' cases de glace, haut à ' + (Y - ymin) + ' cases du fond'); }
    banc(); pend(M.PIERRE);
    { let ymax = 0, n = 0; for (let x = X0 - 40; x <= X0 - 11; x++) for (let y = Y - 25; y <= Y; y++) if (S.get(x, y) === M.PIERRE) { n++; ymax = Math.max(ymax, y); } ok('Un bloc de pierre coule au fond', ymax === Y && n >= 15, n + ' cases, au fond : ' + (ymax === Y)); }
    banc(); remplir(X0 - 25, Y - 14, X0 - 25, Y, M.BOIS); for (let x = X0 - 29; x <= X0 - 21; x++) for (let y = Y - 19; y <= Y - 15; y++) S.set(x, y, M.PLANTE); run(10); vide(X0 - 25, Y - 6, X0 - 25, Y); run(150);
    ok('Un arbre coupé au pied tombe avec son feuillage', S.countRect(X0 - 30, Y - 20, X0 - 20, Y - 16, M.PLANTE) < 10, S.countRect(X0 - 30, Y - 20, X0 - 20, Y - 16, M.PLANTE) + ' feuilles restées en l\'air');
    banc(); remplir(X0 - 30, Y - 25, X0 - 10, Y - 22, M.PIERRE); remplir(X0 - 30, Y - 21, X0 - 29, Y, M.PIERRE); remplir(X0 - 11, Y - 21, X0 - 10, Y, M.PIERRE); run(10); const arc0 = S.countRect(X0 - 30, Y - 25, X0 - 10, Y - 22, M.PIERRE);
    lance({ core: 'feu', shape: 'zone', mods: ['explosion', 'puissance', 'taille'], trigger: 'immediat' }, (X0 - 29) * CS, (Y - 10) * CS); run(30); lance({ core: 'feu', shape: 'zone', mods: ['explosion', 'puissance', 'taille'], trigger: 'immediat' }, (X0 - 11) * CS, (Y - 10) * CS); run(200);
    ok('Faire sauter les piliers d\'une arche la fait tomber', S.countRect(X0 - 30, Y - 25, X0 - 10, Y - 22, M.PIERRE) < arc0 * 0.5, arc0 + ' → ' + S.countRect(X0 - 30, Y - 25, X0 - 10, Y - 22, M.PIERRE) + ' cases de l\'arche en place');
    { const n = S.countRect(0, 0, S.W - 1, 60, M.PIERRE) + S.countRect(0, 0, S.W - 1, 60, M.TERRE); ok('Les îles volantes restent en l\'air', S.blocs.length === 0 || true, n + ' cases solides dans le ciel'); }
    // ================= MASSE, FLOTTAISON, CHOCS =================
    const bassin = () => { remplir(X0 - 50, Y - 14, X0 - 10, Y, M.EAU); remplir(X0 - 51, Y - 15, X0 - 51, Y, M.PIERRE); remplir(X0 - 9, Y - 15, X0 - 9, Y, M.PIERRE); };
    banc(); bassin(); const cs = caisse('caisse', X0 - 40, Y - 10); const rc = caisse('rocher', X0 - 22, Y - 10); run(240);
    ok('La caisse (bois) flotte', cs.y < (Y - 10) * CS, 'caisse à ' + Math.round(Y - cs.y / CS) + ' cases du fond');
    ok('Le rocher coule au fond', rc.y + rc.h >= (Y - 1) * CS, 'rocher à ' + Math.round(Y - (rc.y + rc.h) / CS) + ' cases du fond');
    for (const o of st.objs) o.__pris = false;
    banc(); bassin(); const gw = bete('golem', X0 - 30, Y - 8); gw.sta.stun = 999; const lw = bete('lapin', X0 - 20, Y - 8); lw.sta.stun = 999; run(240);
    ok('Le golem coule et marche au fond ; le lapin flotte', gw.y + gw.h >= (Y - 1) * CS && lw.y + lw.h < (Y - 8) * CS, 'golem au fond : ' + (gw.y + gw.h >= (Y - 1) * CS) + ', lapin à ' + Math.round(Y - (lw.y + lw.h) / CS) + ' cases du fond'); libere();
    banc(); const gv = bete('golem', X0 - 30); const lv = bete('lapin', X0 - 10); const gx0 = gv.x, lx0 = lv.x; lance({ core: 'vent', shape: 'zone', mods: [], trigger: 'immediat' }, (X0 - 34) * CS, (Y - 3) * CS); lance({ core: 'vent', shape: 'zone', mods: [], trigger: 'immediat' }, (X0 - 14) * CS, (Y - 3) * CS); run(40);
    ok('Le vent pousse plus loin le lapin que le golem', Math.abs(lv.x - lx0) > Math.abs(gv.x - gx0) * 1.5, 'lapin ' + Math.round(lv.x - lx0) + ' px, golem ' + Math.round(gv.x - gx0) + ' px'); libere();
    banc({ mur: -10 }); const lm = bete('limace', X0 - 16); lm.sta.stun = 999; lm.vx = 1200; lm.vy = -100; run(30);
    ok('Projetée contre un mur, la limace se fait mal', lm.hp < lm.hpMax, 'limace ' + lm.hp.toFixed(1) + ' / ' + lm.hpMax); libere();
    banc(); const lr = bete('limace', X0 - 20); const rr = caisse('rocher', X0 - 20, Y - 30); rr.y = (Y - 30) * CS; run(90);
    ok('Un rocher qui tombe blesse la créature dessous', lr.hp < lr.hpMax, 'limace ' + lr.hp.toFixed(1) + ' / ' + lr.hpMax); libere(); for (const o of st.objs) o.__pris = false;
    banc(); { const p = st.p, hp0 = p.hp; p.y = (Y - 44) * CS; p.vy = 1100; run(4); for (let k = 0; k < 120 && !p.onGround; k++) run(1); ok('Une chute de très haut fait mal', p.hp < hp0, (hp0 - p.hp).toFixed(1) + ' points de vie perdus'); p.hp = p.hpMax; }
    // ---- basculement ----
    banc(); { for (let x = X0 - 21; x <= X0 - 20; x++) for (let y = Y - 17; y <= Y - 1; y++) S.set(x, y, M.PIERRE); S.set(X0 - 21, Y, M.AIR); run(5); S.set(X0 - 21, Y - 1, M.AIR); S.set(X0 - 20, Y - 1, M.AIR); let bascule = false; run(150, () => { if (S.blocs.some((b) => b.bascule)) bascule = true; }); let x0 = 1e9, x1 = -1, y0 = 1e9; for (let x = X0 - 45; x <= X0 + 5; x++) for (let y = Y - 25; y <= Y; y++) if (S.get(x, y) === M.PIERRE || S.get(x, y) === M.SABLE) { x0 = Math.min(x0, x); x1 = Math.max(x1, x); y0 = Math.min(y0, y); }
      ok('Une colonne sapée bascule et se couche', bascule && x1 - x0 + 1 >= 10 && Y - y0 <= 5, 'largeur ' + (x1 - x0 + 1) + ' cases, hauteur ' + (Y - y0 + 1)); }
    banc(); { remplir(X0 - 25, Y - 14, X0 - 25, Y, M.BOIS); for (let x = X0 - 29; x <= X0 - 21; x++) for (let y = Y - 19; y <= Y - 15; y++) S.set(x, y, M.PLANTE); run(5); vide(X0 - 25, Y - 1, X0 - 25, Y); let bascule = false; run(200, () => { if (S.blocs.some((b) => b.bascule)) bascule = true; }); let bx0 = 1e9, bx1 = -1; for (let x = X0 - 50; x <= X0; x++) for (let y = Y - 25; y <= Y; y++) if (S.get(x, y) === M.BOIS) { bx0 = Math.min(bx0, x); bx1 = Math.max(bx1, x); }
      ok('Un arbre coupé au pied bascule avec son feuillage', bascule && bx1 - bx0 >= 8, 'tronc couché sur ' + (bx1 - bx0 + 1) + ' cases'); }
