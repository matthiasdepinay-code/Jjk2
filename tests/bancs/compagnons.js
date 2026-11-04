// Banc d'essai : Gribouille et Grum, les compagnons
    const CP = World.compagnons, R = game.compagnons; R.actif = true;
    const qui = (q) => CP.liste.find((c) => c.qui === q);
    const prise = (c) => { for (let y = c.y + 2; y < c.y + c.h - 2; y += 5) for (let x = c.x + 2; x < c.x + c.w - 2; x += 5) if (S.solidAt(x, y)) return true; return false; };
    const pres = (c) => Math.abs(c.x + c.w / 2 - (st.p.x + st.p.w / 2));
    banc(); run(5);
    ok('Gribouille et Grum sont là, près de l\'apprenti(e), jamais dans la roche', CP.liste.length === 2 && CP.liste.every((c) => pres(c) < 160 && !prise(c)), CP.liste.map((c) => c.qui + ' à ' + Math.round(pres(c)) + ' px').join(', '));
    // ils suivent quand on marche
    { const inp = window.__inp; inp.right = true; run(90); inp.right = false; run(60); ok('Ils suivent quand l\'apprenti(e) marche', CP.liste.every((c) => pres(c) < 130), CP.liste.map((c) => c.qui + ' à ' + Math.round(pres(c)) + ' px').join(', ')); }
    // trop loin : ramenés d'un pouf d'encre
    { st.p.x -= 1400; run(4); ok('Trop loin, ils reviennent d\'un pouf d\'encre', CP.liste.every((c) => pres(c) < 160 && !prise(c)), CP.liste.map((c) => Math.round(pres(c)) + ' px').join(', ')); banc(); run(5); }
    // les petits sorts de Gribouille
    const limace = () => { const l = bete('limace', X0 - 20); l.hp = l.hpMax = 30; l.sta.stun = 999; return l; };
    const grumAuRepos = () => { qui('grum').cd = 999; };
    { banc(); run(5); grumAuRepos(); const l = limace(); CP.forcer('gribouille', 'reussi', 'foudre'); run(150); const d1 = 30 - l.hp; libere();
      banc(); run(5); grumAuRepos(); const l2 = limace(); CP.forcer('gribouille', 'genial', 'foudre'); run(150); const d2 = 30 - l2.hp; libere();
      ok('Gribouille lance un petit sort sur une bête hostile', d1 > 0.3, 'limace −' + d1.toFixed(1));
      ok('Un sort génial frappe plus fort', d2 > d1 * 1.3, 'réussi −' + d1.toFixed(1) + ', génial −' + d2.toFixed(1)); }
    { banc(); run(5); const l = limace(); const hp0 = st.p.hp; let chute = false, vus = new Set(); for (let k = 0; k < 6; k++) { grumAuRepos(); CP.forcer('gribouille', 'gaffe'); run(80, () => { const g = qui('gribouille'); vus.add(g.etat); if (g.etat === 'chute') chute = true; }); }
      ok('Ses gaffes ne blessent personne', l.hp >= 29.99 && st.p.hp >= hp0, 'limace ' + l.hp.toFixed(1) + ', apprenti(e) ' + st.p.hp.toFixed(1) + (chute ? ', il est tombé à la renverse' : '') + ' (' + [...vus].join(', ') + ')'); libere(); }
    // ils n'abîment pas le monde
    { banc(); run(5); const avant = S.countRect(X0 - 80, Y - 45, X0 + 80, Y + 8, M.PIERRE), herbe = []; for (let x = X0 - 40; x < X0 + 20; x++) { S.set(x, Y, M.HERBE); herbe.push(x); }
      const l = limace(); for (let k = 0; k < 4; k++) { CP.forcer('gribouille', 'reussi'); run(70); } const brule = herbe.filter((x) => S.get(x, Y) !== M.HERBE).length; libere();
      ok('Ses sorts ne touchent que les bêtes, pas la matière', S.countRect(X0 - 80, Y - 45, X0 + 80, Y + 8, M.PIERRE) === avant && brule <= 3, brule + ' cases d\'herbe touchées'); }
    // Grum protège et frappe ; il laisse les bêtes paisibles tranquilles
    { banc(); run(5); qui('grum').cd = 0; const l = bete('limace', X0 - 40); l.hp = l.hpMax = 30; l.sta.stun = 999; const g = qui('gribouille'); g.cd = 999; run(240); const d = 30 - l.hp; libere();
      ok('Grum frappe la bête hostile qui approche', d >= 1.5, 'limace −' + d.toFixed(1)); }
    { banc(); run(5); const lp = bete('lapin', X0 - 40); lp.sta.stun = 999; const hp0 = lp.hp; run(240); ok('Ils laissent les bêtes paisibles tranquilles', lp.hp === hp0, 'lapin ' + lp.hp + ' / ' + hp0); libere(); }
    // un gardien endormi, on ne le réveille pas
    { banc(); run(5); const gd = st.crs.find((c) => c.t === 'gardien' && c.g === 'automate'); const sauv = { x: gd.x, y: gd.y, x0: gd.x0, y0: gd.y0 }; gd.x = gd.x0 = (X0 - 25) * CS - gd.w / 2; gd.y = gd.y0 = Y * CS - gd.h; gd.engage = false; gd.provoque = false; game.niveau = 1; game.xp = 0; gd.hp = gd.hpMax;
      CP.forcer('gribouille', 'reussi'); run(200); ok('Ils ne réveillent pas un gardien endormi', !gd.engage && gd.hp === gd.hpMax, gd.engage ? 'éveillé !' : 'il dort encore'); Object.assign(gd, sauv); }
    // Giga Gribouille
    { banc(); run(5); const l = limace(); l.x = (X0 - 45) * CS; let etats = new Set(); CP.forcer('gribouille', 'giga'); run(420, () => etats.add(qui('gribouille').etat)); const d = 30 - l.hp; libere();
      ok('Giga Gribouille se gonfle, frappe deux fois, puis s\'endort épuisé', etats.has('giga') && etats.has('epuise') && d >= 4, [...etats].join(' → ') + ', limace −' + d.toFixed(1)); }
    // le gâteau de Grum
    { banc(); run(5); ok('Le gâteau se brasse au chaudron (miel, rosée ; remuer, chauffer)', DATA.POTIONS.gateau && DATA.POTIONS.gateau.ingr.join() === 'miel,rosee');
      const gr = qui('grum'); gr.cd = 0; World.usePotion('gateau', { x: 0, y: 0 }); const mange = gr.etat === 'manger'; run(200);
      ok('Offert à Grum, le gâteau le rend heureux un moment', mange && gr.heureux > 100, 'mange : ' + mange + ', heureux ' + Math.round(gr.heureux) + ' s');
      const l = bete('limace', X0 - 40); l.hp = l.hpMax = 30; l.sta.stun = 999; qui('gribouille').cd = 999; run(150); const d = 30 - l.hp; libere();
      ok('Heureux, Grum frappe deux fois plus fort', d >= 3, 'limace −' + d.toFixed(1)); }
    // quand on ne fait rien, ils lisent puis s'endorment ; on bouge, ils se réveillent
    { banc(); run(5); run(60 * 40); const dort = CP.liste.every((c) => c.expr === 'endormi'); window.__inp.right = true; run(5); window.__inp.right = false; run(5);
      ok('Sans rien faire, ils s\'endorment ; on bouge, ils se réveillent', dort && CP.liste.every((c) => c.expr !== 'endormi'), dort ? 'endormis, puis réveillés' : 'pas endormis'); }
    // l'option et les tenues
    { R.actif = false; run(3); const aucun = CP.liste.length === 0; R.actif = true; run(3); ok('L\'option les laisse au labo, puis les rappelle', aucun && CP.liste.length === 2); }
    { const p = game.progress; const avant = p.tenues.slice(); for (const k of ['feu|gravite', 'eau|vent', 'eau|lumiere', 'feu|terre', 'feu|vent', 'eau|feu', 'terre|vie', 'gravite|terre', 'foudre|vent', 'lumiere|vie']) p.combos[k] = 1; game.checkTenues();
      ok('Découvrir dix fusions offre la tenue Arcaniste', p.tenues.includes('gribouille:arcaniste'), p.tenues.filter((k) => !avant.includes(k)).join(', ') || 'rien');
      R.gribouille = 'arcaniste'; const sv = JSON.parse(localStorage.getItem(Object.keys(localStorage).find((k) => /sceaux/i.test(k) && !/monde|world/i.test(k)) || 'null') || 'null'); game.save();
      const k2 = Object.keys(localStorage).find((k) => { try { return JSON.parse(localStorage.getItem(k)).compagnons; } catch (e) { return false; } });
      ok('La tenue choisie est gardée dans la sauvegarde', k2 && JSON.parse(localStorage.getItem(k2)).compagnons.gribouille === 'arcaniste'); R.gribouille = 'classique'; }
    // tous les dessins, sans erreur
    { const cv = document.createElement('canvas'); cv.width = cv.height = 200; const ctx = cv.getContext('2d'); let n = 0, err = 0;
      const posesG = ['neutre', 'marche', 'course', 'saut', 'sort', 'chute', 'victoire', 'lecture', 'dormir', 'levite', 'effraye', 'transfo', 'giga'], posesR = ['neutre', 'marche', 'course', 'saut', 'frappe', 'manger', 'aide', 'repos'];
      const exprs = ['neutre', 'curieux', 'excite', 'surpris', 'inquiet', 'agace', 'gene', 'content', 'endormi', 'malicieux', 'effraye', 'triomphant', 'reflechi', 'determine', 'joyeux', 'heureux', 'gourmand', 'fatigue', 'blesse', 'etonne'];
      for (const t in Mascottes.TENUES.gribouille) for (const po of posesG) for (const ex of exprs) { try { Mascottes.dessiner(ctx, 'gribouille', 100, 150, { tenue: t, pose: po, expr: ex, prog: 0.6, t: 1.2, dir: n % 2 ? 1 : -1 }, 1.5); n++; } catch (e) { err++; } }
      for (const t in Mascottes.TENUES.grum) for (const po of posesR) for (const ex of exprs) { try { Mascottes.dessiner(ctx, 'grum', 100, 150, { tenue: t, pose: po, expr: ex, prog: 0.6, t: 1.2, dir: 1, heureux: n % 3 === 0 }, 1.5); n++; } catch (e) { err++; } }
      for (const b of ['!', '?', '…', 'gateau', 'zzz', 'colere', 'coeur', 'note']) { try { Mascottes.bulle(ctx, 50, 50, b, 1); n++; } catch (e) { err++; } }
      ok('Toutes les poses, humeurs, tenues et bulles se dessinent', err === 0, n + ' dessins, ' + err + ' erreur(s)'); }
