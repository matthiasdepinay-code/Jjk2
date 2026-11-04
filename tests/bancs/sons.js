// Banc d'essai : les nappes sonores des phénomènes et la voix des familiers
    Son.init(); Son.resume();
    const ess = (e) => { if (DATA.CORES[e] && !DATA.CORES[e].interne) return { core: e, mod: null }; for (const a in DATA.ASPECTS) if (DATA.ASPECTS[a].devient === e) return { core: DATA.ASPECTS[a].aspect, mod: a }; return null; };
    const recette = (cle, shape) => { const [a, b] = cle.split('|'); const A = ess(a), B = ess(b); return { taille: 'moyen', core: A.core, core2: B.core, mods: [A.mod, B.mod].filter(Boolean), shape, trigger: 'immediat' }; };
    banc(); World.phen.reset(); const err0 = window.__errs.length;
    for (const [k, dx] of [['feu|gravite', 120], ['eau|foudre', 220], ['gravite|lumiere', 320], ['gravite|temps', 60]]) { lance(recette(k, 'zone'), P0().x + dx, P0().y - 40); run(16); }
    run(30); const n = World.phen.nappes(st.cam.x + 640, st.cam.y + 360, 640);
    ok('Chaque phénomène a sa nappe sonore', n.length >= 4 && new Set(n.map((q) => q.type)).size >= 4, n.map((q) => q.type + ' ' + q.vol.toFixed(2)).join(', '));
    run(120); for (const e of DATA.ESSENCES) Son.voix(e);
    World.phen.reset(); run(80);
    ok('Les sons se jouent et s\'éteignent sans erreur', window.__errs.length === err0, (window.__errs.length - err0) + ' erreur(s)');
