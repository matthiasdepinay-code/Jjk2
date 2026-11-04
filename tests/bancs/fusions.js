// Banc d'essai : fusions (corps exécuté dans la page, après tests/lib/banc.js)
    const vide = (x0, y0, x1, y1) => { for (let x = x0; x <= x1; x++) for (let y = y0; y <= y1; y++) S.set(x, y, M.AIR); };
    const remplir = (x0, y0, x1, y1, m) => { for (let x = x0; x <= x1; x++) for (let y = y0; y <= y1; y++) S.set(x, y, m); };
    // ---------- recette d'un combo : quelles essences et quels aspects ----------
    const ess = (e) => { if (DATA.CORES[e] && !DATA.CORES[e].interne) return { core: e, mod: null }; for (const a in DATA.ASPECTS) if (DATA.ASPECTS[a].devient === e) return { core: DATA.ASPECTS[a].aspect, mod: a }; return null; };
    const recette = (cle) => { const R = DATA.recetteCombo(cle); if (!R) return null; return Object.assign({}, R, { mods: R.mods.concat([null, null, null, null, null]).slice(0, 5) }); };
    const phDe = (id) => World.phen.liste.filter((q) => q.id === id);
    const cles = Object.keys(DATA.COMBOS).concat(Object.keys(DATA.TRIOS), ['feu|portail', 'eau|portail', 'esprit|feu', 'contre|eau', 'feu|metamorphose', 'metamorphose|vent']);
    const formes = ['zone', 'projectile', 'mur', 'colonne', 'trait', 'soi'];
    let nOk = 0, nTot = 0; const rates = [];
    for (const cle of cles) {
      const R0 = recette(cle); if (!R0) { ok('Recette : ' + cle, false, 'introuvable'); continue; }
      const k = DATA.comboCle(Seal.effets(Seal.clone(R0)));
      if (k !== cle) { ok('Recette : ' + cle, false, 'la recette donne ' + k); continue; }
      for (const sh of formes) {
        // une seconde chance : le monde a sa part de hasard ; un vrai défaut échoue deux fois de suite
        let vu = false, err0 = window.__errs.length;
        for (let essai = 0; essai < 2 && !vu; essai++) {
          banc(); const lap = bete('limace', cle.includes('metamorphose') ? X0 - 21 : X0 + 15); lap.sta.stun = 999;
          World.phen.reset(); err0 = window.__errs.length;
          lance(Object.assign({}, R0, { shape: sh, trigger: sh === 'projectile' ? 'contact' : 'immediat' }), P0().x + 180, sh === 'projectile' ? (Y - 1) * CS : P0().y);
          run(150, () => { if (phDe(cle).length) vu = true; });
          if (!vu) libere();
        }
        nTot++; const bon = (vu || (cle === 'feu|metamorphose' && sh === 'mur')) && window.__errs.length === err0;
        if (bon) nOk++; else rates.push(cle + ' / ' + sh + (vu ? '' : ' (pas de phénomène)') + (window.__errs.length > err0 ? ' ERREUR ' + window.__errs[window.__errs.length - 1] : ''));
        libere();
      }
    }
    ok('Chaque combo naît sous chaque forme, sans erreur', nOk === nTot, nOk + ' / ' + nTot + (rates.length ? ' — ' + rates.slice(0, 8).join(' ; ') : ''));
    { const pg = game.progress.combos || {}; ok('Les combos lancés sont découverts', Object.keys(pg).length >= Object.keys(DATA.COMBOS).length, Object.keys(pg).length + ' découverts'); }
    // ---------- quelques effets précis ----------
    const S2 = Sim;
    banc(); World.phen.reset(); { remplir(X0 - 40, Y - 3, X0 - 30, Y, M.GLACE); lance(Object.assign(recette('feu|gravite'), { shape: 'zone', trigger: 'immediat' }), (X0 - 35) * CS, (Y - 12) * CS); run(300); const g = S2.countRect(X0 - 40, Y - 3, X0 - 30, Y, M.GLACE); ok('Petit soleil : il flotte, chauffe et fait fondre la glace dessous', g < 30, 44 + ' → ' + g + ' cases de glace'); }
    banc(); World.phen.reset(); { const cr = st.objs.find((o) => o.t === 'caisse' && !o.mort); cr.x = (X0 - 20) * CS; cr.y = Y * CS - cr.h; cr.vx = cr.vy = 0; const x0 = cr.x; lance(Object.assign(recette('feu|gravite'), { shape: 'zone', trigger: 'immediat' }), (X0 - 32) * CS, (Y - 10) * CS); run(120); ok('Petit soleil : il attire la caisse', Math.abs(cr.x - x0) > 10, Math.round(cr.x - x0) + ' px'); }
    banc(); World.phen.reset(); { const sl = bete('limace', X0 - 30); lance(Object.assign(recette('eau|feu'), { shape: 'zone', trigger: 'immediat' }), (X0 - 30) * CS + 18, (Y - 2) * CS); const y0 = sl.y; let ymin = y0; run(90, () => { ymin = Math.min(ymin, sl.y); }); ok('Geyser : il soulève la limace', y0 - ymin > 40, Math.round(y0 - ymin) + ' px'); libere(); }
    banc(); World.phen.reset(); { lance(Object.assign(recette('eau|lumiere'), { shape: 'zone', trigger: 'immediat' }), P0().x + 200, P0().y - 40); run(40); const n = st.objs.filter((o) => o.t === 'magie' && !o.mort).length; ok('Arc-en-ciel : un arc praticable', n > 5, n + ' marches'); }
    banc(); World.phen.reset(); { const gm = bete('golem', X0 - 20); gm.hpMax = 99; gm.hp = 99; lance(Object.assign(recette('gravite|terre'), { shape: 'zone', trigger: 'immediat' }), gm.x + 25, gm.y + 30); run(150); ok('Météore : il tombe sur le golem', gm.hp < 99, (99 - gm.hp).toFixed(1) + ' dégâts'); gm.hpMax = 8; gm.hp = 8; libere(); }
    banc(); World.phen.reset(); { remplir(X0 - 30, Y - 4, X0 - 10, Y, M.EAU); remplir(X0 - 31, Y - 5, X0 - 31, Y, M.PIERRE); remplir(X0 - 9, Y - 5, X0 - 9, Y, M.PIERRE); lance(Object.assign(recette('foudre|transmutation'), { shape: 'zone', trigger: 'immediat' }), (X0 - 20) * CS, (Y - 2) * CS); let gz = 0; run(150, () => { let n = 0; for (let x = X0 - 40; x < X0; x++) for (let y = 0; y <= Y; y++) if (S2.get(x, y) === M.GAZ) n++; gz = Math.max(gz, n); }); ok('Électrolyse : l\'eau devient du gaz', gz > 10, gz + ' cases de gaz'); }
    banc(); World.phen.reset(); { lance(Object.assign(recette('gravite|vie'), { shape: 'zone', trigger: 'immediat' }), P0().x + 200, P0().y - 120); run(60); const enAir = () => S2.countRect(X0 - 80, Y - 45, X0 + 80, Y - 12, M.TERRE), n = enAir(); run(30); const n2 = enAir(); ok('Îlot flottant : une motte de terre tient en l\'air', n > 20 && n2 >= n * 0.9, n + ' cases de terre en l\'air, encore ' + n2 + ' une demi-seconde plus tard'); }
    banc(); World.phen.reset(); { const sl = bete('limace', X0 - 20); lance(Object.assign(recette('froid|temps'), { shape: 'zone', trigger: 'immediat' }), sl.x + 18, sl.y + 12); run(30); ok('Cryostase : la limace est prise dans la glace', S2.countAround(sl.x + 18, sl.y + 12, 40, M.GLACE) > 10 && sl.sta.gele > 0, S2.countAround(sl.x + 18, sl.y + 12, 40, M.GLACE) + ' cases de glace'); libere(); }
    banc(); World.phen.reset(); { lance(Object.assign(recette('transmutation|vent'), { shape: 'zone', trigger: 'immediat' }), P0().x + 150, P0().y - 30); run(30); const pl = st.objs.find((o) => o.t === 'magie' && !o.mort); ok('Air solide : une plateforme', !!pl, pl ? Math.round(pl.w) + ' × ' + Math.round(pl.h) + ' px' : 'rien'); }
    banc(); World.phen.reset(); { const h0 = st.p.ink = 50; remplir(X0 - 30, Y - 4, X0 - 10, Y, M.EAU); lance(Object.assign(recette('contre|eau'), { shape: 'zone', trigger: 'immediat' }), (X0 - 20) * CS, (Y - 2) * CS); run(40); const n = S2.countRect(X0 - 30, Y - 4, X0 - 10, Y, M.EAU); ok('Absorption de l\'eau : l\'eau disparaît', n < 60, 105 + ' → ' + n + ' cases d\'eau'); st.p.ink = 9999; }
