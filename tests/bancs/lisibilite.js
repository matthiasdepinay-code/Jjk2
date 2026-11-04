// Banc d'essai : leçons du maître, sceaux modèles, aperçus
    const p = game.progress; p.leconsVues = []; p.leconsFaites = []; p._evts = []; p.combos = {};
    banc(); run(70);
    ok('Les leçons paraissent avec ce qui est débloqué', p.leconsVues.length >= 10, p.leconsVues.length + ' leçons parues');
    lance({ core: 'feu', shape: 'zone', mods: ['puissance'], trigger: 'contact' }, P0().x + 150, P0().y); run(80);
    ok('Lancer un sceau valide « Le premier sceau », « Changer de forme », « Le second anneau », « Attendre le contact »', ['l_premier', 'l_forme', 'l_modif', 'l_contact'].every((id) => p.leconsFaites.includes(id)), p.leconsFaites.join(', '));
    lance({ taille: 'moyen', core: 'feu', core2: 'gravite', shape: 'zone', mods: [], trigger: 'immediat' }, P0().x + 150, P0().y - 60); run(80);
    ok('Une fusion valide « Deux essences » et « Faire naître un phénomène »', p.leconsFaites.includes('l_fusion') && p.leconsFaites.includes('l_phen'), p.leconsFaites.join(', ') + ' | vues ' + p.leconsVues.join(',') + ' | combos ' + Object.keys(p.combos).join(','));
    // modèles : copier une fusion découverte sur la table
    UI.openPanel('grimoire'); document.querySelector('#grim-tabs [data-tab="fusions"]').click();
    const b = [...document.querySelectorAll('#grim-content button')].find((x) => /Copier sur la table/.test(x.textContent));
    if (b) b.click();
    ok('Grimoire : « Copier sur la table » pose la fusion sur la table des sceaux', b && game.editSeal.core === 'feu' && game.editSeal.core2 === 'gravite' && !!document.querySelector('#seal-preview'), b ? game.editSeal.core + ' + ' + game.editSeal.core2 : 'pas de bouton');
    UI.close();
    // aperçus : ils se dessinent sans erreur, pour chaque fusion et chaque familier
    const err0 = window.__errs.length; let n = 0;
    p.combos = {}; for (const k of Object.keys(DATA.COMBOS)) p.combos[k] = 1;
    for (const k of Object.keys(DATA.COMBOS)) { const R = DATA.recetteCombo(k); if (!R) continue; game.editSeal = Seal.clone(Object.assign({ taille: 'moyen', shape: 'zone', trigger: 'immediat' }, R)); UI.openPanel('seal'); n++; }
    for (const e of DATA.ESSENCES) { game.editSeal = Seal.clone({ taille: 'moyen', core: e, shape: 'invocation', mods: [], trigger: 'immediat' }); UI.openPanel('seal'); n++; }
    UI.close();
    ok('Les aperçus des fusions et des familiers se dessinent sans erreur', window.__errs.length === err0, n + ' aperçus, ' + (window.__errs.length - err0) + ' erreur(s)');
