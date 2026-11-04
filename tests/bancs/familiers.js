// Banc d'essai : familiers (corps exécuté dans la page, après tests/lib/banc.js)
    const fams = () => st.crs.filter((c) => c.t === 'familier' && c.hp > 0);
    const invoquer = (core, extra = {}) => { st.p.ink = 9999; lance(Object.assign({ core, shape: 'invocation', mods: [], trigger: 'immediat' }, extra), P0().x + 60, P0().y); run(16); return fams(); };
    const proie = (t2, cellX, hp = 30) => { const c = bete(t2, cellX); c.hp = c.hpMax = hp; c.sta.stun = 0; c.sta.tame = false; return c; };
    const vider = () => { for (const c of st.crs) if (c.t === 'familier') { c.hp = 0; c.mort = true; } run(1); st.crs = st.crs.filter((c) => c.t !== 'familier'); };
    // ---------- défauts corrigés ----------
    banc(); vider(); { invoquer('feu'); invoquer('foudre'); invoquer('eau'); invoquer('terre'); const l = proie('limace', X0 - 78); let n0 = fams().length; run(300); const vivants = fams().length; ok('Défaut corrigé : les familiers ne se blessent plus entre eux', n0 === 4 && vivants === 4, n0 + ' invoqués, ' + vivants + ' vivants après 5 s de combat, limace ' + l.hp.toFixed(1) + ' / 30'); libere(); }
    banc(); vider(); { invoquer('lumiere'); invoquer('temps'); invoquer('eau'); run(200); const f = fams(); let dmin = 1e9; for (let i = 0; i < f.length; i++) for (let j = i + 1; j < f.length; j++) dmin = Math.min(dmin, Math.hypot(f[i].x - f[j].x, f[i].y - f[j].y)); ok('Défaut corrigé : chacun sa place, plus de familiers empilés', dmin > 15, Math.round(dmin) + ' px entre les deux plus proches'); ok('Défaut corrigé : on ne peut plus porter un familier', f.every((c) => !c.portable), ''); }
    banc(); vider(); { const hp0 = st.p.hp = st.p.hpMax; lance({ core: 'feu', core2: 'gravite', shape: 'invocation', mods: [], trigger: 'immediat', taille: 'moyen' }, P0().x + 60, P0().y); run(320); const f = fams()[0]; ok('Défaut corrigé : un familier qui porte un petit soleil ne te brûle plus', st.p.hp >= hp0 - 0.3 && f && f.porteur, 'vitalité ' + hp0.toFixed(1) + ' → ' + st.p.hp.toFixed(1) + (f ? ', familier à ' + Math.round(Math.hypot(f.x - st.p.x, f.y - st.p.y)) + ' px' : '')); }
    banc(); vider(); { invoquer('foudre'); const l = proie('limace', X0 - 50 + 40); run(240); ok('Défaut corrigé : il défend jusqu\'à 300 px autour de toi', l.hp < 30, 'limace à 240 px : ' + l.hp.toFixed(1) + ' / 30'); libere(); }
    banc(); vider(); { invoquer('vie'); const g = proie('golem', X0 - 46, 99); g.sta.stun = 0; const f = fams()[0]; f.x = g.x + 10; f.y = g.y + g.h - f.h; const h0 = f.hp; run(150); ok('Les créatures hostiles blessent un familier au contact', f.hp < h0 || f.mort, h0 + ' → ' + Math.max(0, f.hp).toFixed(1) + ' PV'); libere(); }
    banc(); vider(); { const f = invoquer('terre', { mods: ['double'] }); ok('Double : deux familiers', f.length === 2, f.length + ' familiers'); }
    // ---------- chaque créature ----------
    const ESP = DATA.ESSENCES;
    for (const e of ESP) {
      banc(); vider(); const F = DATA.FAMILIERS[e];
      const l = proie(e === 'terre' ? 'limace' : 'limace', X0 - 70);
      const lx0 = l.x, ly0 = l.y; let ymin = l.y, dormi = false, lent = false, morph = false, plantes = 0, bulle = false, boue = false, flamme = false, stun = false;
      const f = invoquer(e)[0];
      const tmax = e === 'metamorphose' ? 1000 : 360;
      run(tmax, () => { ymin = Math.min(ymin, l.y); if (l.sta.sleep > 0) dormi = true; if (l.sta.lent > 0) lent = true; if (l.orig) morph = true; if (l.sta.stun > 0) stun = true; if (st.sp.some((q) => q.k === 'bulle')) bulle = true; });
      plantes = S.countRect(X0 - 80, Y - 10, X0 - 55, Y, M.PLANTE); boue = S.countRect(X0 - 80, Y - 2, X0 - 55, Y + 3, M.BOUE) > 0; flamme = S.countRect(X0 - 90, Y - 15, X0 - 50, Y, M.FEU) > 0;
      const blesse = l.hp < 30;
      const verdict = { feu: blesse, eau: blesse, terre: blesse && stun, vent: Math.abs(l.x - lx0) > 30 || blesse, vie: lent && plantes > 0, lumiere: stun, foudre: blesse, gravite: ly0 - ymin > 30, temps: bulle && lent, portail: blesse, esprit: dormi, transmutation: boue || lent, contre: stun, metamorphose: morph }[e];
      const det = { feu: 'limace ' + l.hp.toFixed(1) + '/30', eau: 'limace ' + l.hp.toFixed(1) + '/30', terre: 'limace ' + l.hp.toFixed(1) + '/30, assommée ' + stun, vent: 'repoussée de ' + Math.round(l.x - lx0) + ' px', vie: 'entravée ' + lent + ', ' + plantes + ' racines', lumiere: 'éblouie ' + stun, foudre: 'limace ' + l.hp.toFixed(1) + '/30', gravite: 'soulevée de ' + Math.round(ly0 - ymin) + ' px', temps: 'bulle ' + bulle + ', ralentie ' + lent, portail: 'limace ' + l.hp.toFixed(1) + '/30', esprit: 'endormie ' + dormi, transmutation: 'boue ' + boue + ', ralentie ' + lent, contre: 'étourdie ' + stun, metamorphose: 'changée ' + morph + (f ? ' (stade ' + f.stade + ')' : '') }[e];
      ok(F.nom + ' (' + DATA.CORES[e].nom + ')', verdict && f && !f.mort, det + (f && f.mort ? ' — le familier est mort' : ''));
      libere();
    }
    // ---------- dons ----------
    banc(); vider(); { invoquer('eau'); st.p.sta.burning = 3; run(60); ok('Ondine : elle éteint le feu sur toi', st.p.sta.burning <= 0, ''); }
    banc(); vider(); { invoquer('temps'); st.p.ink = 10; st.p.inkRegen = 0; const i0 = st.p.ink; run(120); ok('Chouette du temps : ton encre revient plus vite', st.p.ink > i0 + 0.5, (st.p.ink - i0).toFixed(1) + ' encre en 2 s'); st.p.inkRegen = 1; st.p.ink = 9999; }
    banc(); vider(); { invoquer('contre'); st.p.sta.lent = 5; run(60); ok('Pie grise : elle défait la lenteur qui t\'accable', st.p.sta.lent <= 0, ''); }
    banc(); vider(); { const f = invoquer('feu')[0]; f.x = (X0 - 30) * CS; const lv = []; for (let x = X0 - 40; x <= X0 - 20; x++) for (let y = Y - 3; y <= Y; y++) S.set(x, y, M.LAVE); run(120); ok('Salamandre : elle nage dans la lave sans brûler', f && !f.mort && f.hp === f.hpMax, f ? f.hp + ' / ' + f.hpMax + ' PV' : ''); }
    vider();
