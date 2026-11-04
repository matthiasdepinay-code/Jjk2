// Banc d'essai : sauvegarde et chargement des phénomènes, des familiers et de l'îlot flottant
    const ess = (e) => { if (DATA.CORES[e] && !DATA.CORES[e].interne) return { core: e, mod: null }; for (const a in DATA.ASPECTS) if (DATA.ASPECTS[a].devient === e) return { core: DATA.ASPECTS[a].aspect, mod: a }; return null; };
    const recette = (cle, shape) => { const [a, b] = cle.split('|'); const A = ess(a), B = ess(b); return { taille: 'moyen', core: A.core, core2: B.core, mods: [A.mod, B.mod].filter(Boolean), shape, trigger: 'immediat' }; };
    banc(); World.phen.reset();
    lance(recette('feu|gravite', 'zone'), P0().x + 150, P0().y - 60); run(20);
    lance(recette('gravite|vie', 'zone'), P0().x + 260, P0().y - 140); run(20);
    st.p.ink = 9999; lance({ core: 'eau', shape: 'invocation', mods: [], trigger: 'immediat' }, P0().x + 60, P0().y); run(20);
    const ilot0 = World.phen.liste.find((q) => q.id === 'gravite|vie'), cellsIlot = ilot0 ? ilot0.data.c.slice() : [];
    const avant = { soleil: World.phen.liste.filter((q) => q.id === 'feu|gravite').length, familiers: st.crs.filter((c) => c.t === 'familier' && c.hp > 0).length, ilot: cellsIlot.length };
    const d = JSON.parse(JSON.stringify(World.serialize()));
    World.reset(); World.build(game, d); st = World.state();
    run(5);
    const apres = { soleil: World.phen.liste.filter((q) => q.id === 'feu|gravite').length, familiers: st.crs.filter((c) => c.t === 'familier' && c.hp > 0).length };
    ok('Un petit soleil survit à la sauvegarde', avant.soleil === 1 && apres.soleil === 1, avant.soleil + ' → ' + apres.soleil);
    ok('Un familier survit à la sauvegarde', avant.familiers === 1 && apres.familiers === 1 && st.crs.find((c) => c.t === 'familier').espece === 'eau', avant.familiers + ' → ' + apres.familiers);
    let tombe = false; run(240, () => { if (S.blocs.length) tombe = true; }); const restent = cellsIlot.filter((i) => S.mat[i] === M.TERRE).length;
    ok('Au chargement, l\'îlot flottant retombe', avant.ilot > 20 && tombe && restent < avant.ilot * 0.3, avant.ilot + ' cases, ' + restent + ' encore à leur place');
