// Banc d'essai : les quatre gardiens (sommeil, faiblesses, tours, attaques, victoire, sauvegarde)
    const GD = World.gardiens, gd = (g) => st.crs.find((c) => c.t === 'gardien' && c.g === g);
    const zones = World.level().zones, zoneDe = (c) => (zones.find((z) => c.x + c.w / 2 >= z.x && c.x + c.w / 2 < z.x + z.w) || {}).nom;
    const attendu = { ent: 'La Prairie', cerf: 'Les Collines', magma: 'La Plaine de cendres', automate: 'Le Marais' };
    ok('Un gardien dans chacune des quatre régions', Object.keys(attendu).every((g) => gd(g) && zoneDe(gd(g)) === attendu[g]), Object.keys(attendu).map((g) => g + ' : ' + (gd(g) ? zoneDe(gd(g)) : 'absent')).join(', '));
    const niv0 = game.niveau, xp0 = game.xp, niv = (n) => { game.niveau = n; game.xp = 0; };
    const place = (c, cellX) => { c.x = cellX * CS - c.w / 2; c.y = Y * CS - c.h; c.x0 = c.x; c.y0 = c.y; c.vx = c.vy = 0; c.hp = c.hpMax; c.engage = false; c.att = null; c.cd = 99; c.provoque = false; c.vaincu = false; c.dits = {}; for (const k of ['brule', 'croute', 'mouille', 'court', 'gel', 'etour', 'regenT']) c[k] = 0; };
    const ecarte = () => { for (const c of st.crs) if (c.t === 'gardien' && c.x > (X0 - 120) * CS && c.x < (X0 + 120) * CS) { c.x = c.x0 = 30 * CS; c.y = 40 * CS; c.engage = false; } };
    const zone = (core, c, extra = {}) => lance(Object.assign({ core, shape: 'zone', trigger: 'immediat', mods: [] }, extra), c.x + c.w / 2, c.y + c.h / 2);
    const cx = (c) => c.x + c.w / 2;
    // il dort tant qu'on n'a pas le niveau
    { banc(); ecarte(); const c = gd('ent'); place(c, X0 - 20); niv(1); run(30); const dort = !c.engage && c.sommeil; niv(6); run(10); ok('Un gardien dort tant qu\'on n\'a pas pris de forces, puis s\'éveille', dort && c.engage, 'niveau 1 : ' + (dort ? 'endormi' : 'éveillé') + ', niveau 6 : ' + (c.engage ? 'éveillé' : 'endormi')); }
    // l'Ent-ronce : le feu le blesse, l'eau le soigne
    { banc(); ecarte(); niv(6); const c = gd('ent'); place(c, X0 - 20); c.hp = c.hpMax - 15; let h0 = c.hp; zone('feu', c); run(80); const dFeu = h0 - c.hp; c.brule = 0; place(c, X0 - 20); c.hp = c.hpMax - 15; h0 = c.hp; zone('terre', c); run(70); const dTerre = h0 - c.hp; place(c, X0 - 20); c.hp = c.hpMax - 15; h0 = c.hp; zone('eau', c); run(70); const soin = c.hp - h0;
      ok('L\'Ent-ronce craint le feu (et la terre l\'entame à peine)', dFeu > 3 && dFeu > dTerre * 4, 'feu −' + dFeu.toFixed(1) + ', terre −' + dTerre.toFixed(1));
      ok('L\'eau soigne l\'Ent-ronce', soin > 0.5, '+' + soin.toFixed(1)); }
    // le Grand Cerf : rien ne l'entame quand il court, mais il s'assomme contre un mur
    { banc({ mur: -24 }); ecarte(); niv(6); const c = gd('cerf'); place(c, X0); c.provoque = true; c.cd = 0; let etour = false, h0 = c.hp; run(420, () => { if (c.etour > 0) etour = true; }); const perdu = h0 - c.hp;
      banc(); ecarte(); place(c, X0 - 20); h0 = c.hp; zone('feu', c); run(70); const dFeu = h0 - c.hp;
      ok('Le Grand Cerf charge, s\'assomme contre un mur et y perd gros', etour && perdu >= 5, (etour ? 'assommé' : 'jamais assommé') + ', −' + perdu.toFixed(1));
      ok('Le Grand Cerf encaisse les sorts quand il n\'est pas assommé', dFeu < 1.5, 'feu −' + dFeu.toFixed(1)); }
    // le Golem de magma : l'eau fige sa croûte, la lave le soigne
    { banc(); ecarte(); niv(6); const c = gd('magma'); place(c, X0 - 20); zone('eau', c); run(60); const croute = c.croute > 0; banc(); ecarte(); place(c, X0 - 20); c.hp = c.hpMax - 12; const h0 = c.hp; for (let x = Math.floor(c.x / CS) - 1; x <= Math.floor((c.x + c.w) / CS) + 1; x++) for (let y = Y + 1; y <= Y + 3; y++) S.set(x, y, M.LAVE); run(90); const soin = c.hp - h0;
      ok('L\'eau fige la croûte du Golem de magma', croute, croute ? 'croûte' : 'rien');
      ok('La lave soigne le Golem de magma', soin > 1.5, '+' + soin.toFixed(1)); }
    // l'Automate : la foudre glisse sur lui, sauf s'il est trempé
    { banc(); ecarte(); niv(6); const c = gd('automate'); place(c, X0 - 20); let h0 = c.hp; zone('foudre', c); run(70); const sec = h0 - c.hp; place(c, X0 - 20); zone('eau', c); run(60); const mouille = c.mouille > 0; h0 = c.hp; zone('foudre', c); run(70); const trempe = h0 - c.hp;
      ok('L\'Automate trempé fait court-circuit sous la foudre', mouille && trempe > sec * 3 && trempe > 2, 'sec −' + sec.toFixed(1) + ', trempé −' + trempe.toFixed(1) + (c.court > 0 || trempe > 2 ? ', court-circuit' : '')); }
    // on ne possède ni ne transforme un gardien
    { banc(); ecarte(); niv(6); const c = gd('automate'); place(c, X0 - 20); zone('esprit', c); run(60); const possede = !!st.control; zone('metamorphose', c); run(60); ok('Ni l\'Esprit ni la Métamorphose n\'ont prise sur un gardien', !possede && c.t === 'gardien' && !c.orig, (possede ? 'possédé' : 'libre') + ', ' + c.t); if (st.control) World.releaseControl(); }
    // ils attaquent pour de bon
    { const bilan = []; for (const g of ['ent', 'cerf', 'magma', 'automate']) { banc(); ecarte(); niv(6); const c = gd(g); place(c, X0 - 10); c.provoque = true; c.cd = 0.5; const p = st.p; p.hpMax = 99; p.hp = 99; run(480, () => { p.inv = Math.min(p.inv, 0.2); }); bilan.push(g + ' −' + (99 - p.hp).toFixed(1)); c.engage = false; p.hpMax = 10; p.hp = 10; ecarte(); }
      ok('Chaque gardien finit par toucher le joueur', bilan.every((b) => parseFloat(b.split('−')[1]) > 0.5), bilan.join(', ')); }
    // la victoire : récompenses, et le gardien ne revient pas
    { banc(); ecarte(); niv(6); const c = gd('ent'); place(c, X0 - 20); c.hp = 0.5; const pk = st.pickups.length; zone('feu', c); run(70);
      ok('Vaincre un gardien le note et laisse des présents', c.vaincu && game.progress.gardiens.ent && st.pickups.length > pk, (c.vaincu ? 'vaincu' : 'debout') + ', ' + (st.pickups.length - pk) + ' présents');
      const d = JSON.parse(JSON.stringify(World.serialize())); d.crs = d.crs.filter((q) => q.t !== 'gardien'); World.reset(); World.build(game, d); st = World.state(); run(3);
      const g2 = st.crs.filter((q) => q.t === 'gardien');
      ok('Une ancienne sauvegarde reçoit les gardiens, et l\'Ent-ronce vaincu le reste', g2.length === 4 && g2.find((q) => q.g === 'ent').vaincu && g2.filter((q) => !q.vaincu).length === 3, g2.map((q) => q.g + (q.vaincu ? '✝' : '')).join(', '));
      delete game.progress.gardiens.ent; game.niveau = niv0; game.xp = xp0; }
