// Banc d'essai : le système de cercles (position, équilibre, traits, tailles souples, tracé visible)
    const G = (o) => Seal.clone(Object.assign({ taille: 'grand', core: 'feu', shape: 'projectile', mods: [null, null, null, null, null], trigger: 'contact' }, o));
    // ---------- 7. la position compte ----------
    { const m = Seal.slotList(0, 0, 100, 'moyen').filter((q) => /^mod/.test(q.id)), g = Seal.slotList(0, 0, 100, 'grand').filter((q) => /^mod/.test(q.id)), p = Seal.slotList(0, 0, 100, 'petit').filter((q) => /^mod/.test(q.id));
      const meme = (a, b) => Math.abs(a.x - b.x) < 0.01 && Math.abs(a.y - b.y) < 0.01;
      ok('Chaque taille prolonge la précédente : en grandissant, les modificateurs ne bougent pas', meme(p[0], m[0]) && m.every((q, i) => meme(q, g[i])), Seal.MOD_ANGLES.grand.join('°, ') + '°'); }
    { const lie = G({ core2: 'gravite', mods: ['puissance', null, null, null, null] }), libre = G({ core2: 'gravite', mods: [null, 'puissance', null, null, null] });
      const A = Seal.params(lie), B = Seal.params(libre);
      ok('Puissance posée juste sous la Gravité ne sert qu\'elle', A.liaisons[0] === 'core2' && A.ess.gravite && A.ess.gravite.pk > 1.2 && A.power < B.power && !Object.keys(B.liaisons).length, 'liée : gravité ×' + (A.ess.gravite ? A.ess.gravite.pk.toFixed(2) : '?') + ', sort ×' + A.power.toFixed(2) + ' ; ailleurs : sort ×' + B.power.toFixed(2));
      const t3 = Seal.params(G({ core2: 'gravite', core3: 'eau', mods: [null, null, null, 'puissance', null] }));
      ok('À 165°, face à la troisième essence, il ne sert qu\'elle', t3.liaisons[3] === 'core3' && t3.ess.eau && t3.ess.eau.pk > 1.2, JSON.stringify(t3.liaisons)); }
    { const s = Seal.clone({ taille: 'moyen', core: 'feu', core2: 'eau', shape: 'zone', mods: ['inverser', null, null], trigger: 'immediat' }); const sp = World.makeSpec(s);
      ok('Inverser posé sous une essence n\'inverse qu\'elle', !sp.prm.inverse && sp.cores.includes('feu') && sp.cores.includes(DATA.INVERSE.eau || 'eau') && !sp.cores.includes('eau') && sp.combo == null, sp.cores.join(' + ')); }
    { banc(); const avant = World.phen.liste.length; lance({ core: 'feu', core2: 'gravite', shape: 'zone', trigger: 'immediat', mods: ['puissance', null, null] }, (X0 + 20) * CS, (Y - 10) * CS); run(60);
      const ph = World.phen.liste.slice(avant).find((q) => q.essK); ok('Dans une fusion, la Gravité garde sa part de Puissance', ph && ph.essK.gravite > 1.2 && !ph.essK.feu, ph ? JSON.stringify(ph.essK) : 'aucun phénomène'); World.phen.reset && World.phen.reset(); }
    { banc(); const l = bete('limace', X0 + 10); l.hp = l.hpMax = 60; const prm = Seal.params(Seal.clone({ taille: 'moyen', core: 'foudre', shape: 'zone', mods: [], trigger: 'immediat' })); const cx = (X0 + 10) * CS, cy = Y * CS - 10;
      World._effet('foudre', cx, cy, 40, prm, 'burst'); const d1 = 60 - l.hp; l.hp = 60; World._effet('foudre', cx, cy, 40, Object.assign({}, prm, { ess: { foudre: { n: 1, pk: 2 } } }), 'burst'); const d2 = 60 - l.hp; libere();
      ok('La part d\'une essence passe jusqu\'à son effet', d1 > 0 && d2 > d1 * 1.4, '−' + d1.toFixed(1) + ' puis −' + d2.toFixed(1)); }
    // ---------- 8. l'équilibre ----------
    { const eq = G({ mods: ['duree', 'taille', 'portee', null, null] }), ne = G({ mods: ['duree', null, null, 'taille', 'portee'] }), ba = G({ mods: ['duree', null, null, 'taille', null] });
      const E = [eq, ne, ba].map((s) => Seal.equilibre(s).etat);
      ok('Modificateurs répartis : équilibré ; serrés d\'un côté : bancal', E.join() === 'equilibre,neutre,bancal', E.join(', '));
      const c1 = Seal.cost(eq), c2 = Seal.cost(ne), g1 = Seal.geste(eq), g2 = Seal.geste(ne);
      ok('Équilibré : un dixième d\'encre en moins, un tracé plus vif', c1 < c2 && c1 >= c2 * 0.85 && g1 < g2, c1 + ' / ' + c2 + ' encre, ' + g1.toFixed(2) + ' / ' + g2.toFixed(2) + ' s');
      const pw = (s) => { const L = []; for (let i = 0; i < 40; i++) L.push(World.makeSpec(Seal.clone(s)).prm.power); return Math.max(...L) - Math.min(...L); };
      const vb = pw(ba), ve = pw(eq); ok('Bancal, la puissance vacille d\'un sort à l\'autre', vb > 0.15 && ve < 1e-9, 'écart bancal ' + vb.toFixed(2) + ', équilibré ' + ve.toFixed(2)); }
    // ---------- tracé selon les glyphes ----------
    { const peu = Seal.clone({ taille: 'moyen', core: 'feu', shape: 'zone', mods: [null, null, null], trigger: null }), beaucoup = Seal.clone({ taille: 'moyen', core: 'feu', core2: 'eau', shape: 'zone', mods: ['duree', 'taille', 'echo'], trigger: 'contact', filtre: Object.keys(DATA.FILTRES)[0] });
      ok('Le tracé dure selon le nombre de glyphes posés', Seal.geste(peu) < Seal.geste(beaucoup), Seal.geste(peu).toFixed(2) + ' s pour 2 glyphes, ' + Seal.geste(beaucoup).toFixed(2) + ' s pour ' + Seal.nGlyphes(beaucoup)); }
    // ---------- 9. un trait pour le second déclencheur ----------
    { const s = G({ core2: 'gravite', mods: ['puissance', 'duree', null, null, null], trigger2: 'retarde', lien2: 'core2' }); const [A, B] = Seal.scinder(s);
      ok('Un trait relie le second déclencheur à la Gravité : deux sorts, chacun le sien', Seal.enDeuxTemps(s) && A.core === 'feu' && !A.core2 && A.trigger === 'contact' && B.core === 'gravite' && B.trigger === 'retarde' && B.mods.includes('puissance') && !A.mods.includes('puissance') && A.mods.includes('duree') && B.mods.includes('duree'),
        'feu (' + A.trigger + ', ' + A.mods.filter(Boolean).join() + ') + gravité (' + B.trigger + ', ' + B.mods.filter(Boolean).join() + ')');
      banc(); lance(s, (X0 + 60) * CS, (Y - 20) * CS); let n = 0; run(50, () => { n = Math.max(n, projs().length); });
      ok('Lancé, le sceau part en deux projectiles', n >= 2, n + ' projectile(s)');
      const s3 = G({ core2: 'gravite', core3: 'eau', mods: ['puissance', null, null, 'puissance', null], trigger2: 'retarde', lien2: 'core2' }); const [A3] = Seal.scinder(s3);
      ok('La Puissance liée à l\'Eau la suit dans l\'autre sort', A3.core2 === 'eau' && Seal.liaisons(A3)[0] === 'core2', A3.core + '/' + A3.core2 + ' ' + JSON.stringify(Seal.liaisons(A3))); }
    // ---------- 10. les tailles souples ----------
    { const T = ['petit', 'moyen', 'grand'], tm = (o, t = T, n = 3) => Seal.tailleMin(Seal.clone(Object.assign({ taille: 'grand', core: 'feu', shape: 'zone', mods: [] }, o)), t, n);
      const r = [tm({}), tm({ core2: 'eau' }), tm({ mods: [null, 'duree'] }), tm({ mods: [null, null, null, 'duree'] }), tm({ trigger2: 'retarde' }), tm({ mods: [null, 'duree'] }, T, 1), tm({}, ['moyen', 'grand'])];
      ok('La taille juste : la plus petite qui tient tout', r.join() === 'petit,moyen,moyen,grand,grand,grand,moyen', r.join(', ')); }
    { const p = game.progress; game.editSeal = Seal.create('moyen'); UI.openPanel('seal'); const T = UI._table;
      T.poserEn('core', 'core', 'feu'); T.poserEn('shape', 'shape', 'projectile'); UI.refreshSeal(); const t1 = game.editSeal.taille, cr1 = T.croissance().map((q) => q.id);
      T.poserEn('mod1', 'mod', 'duree'); UI.refreshSeal(); const t2 = game.editSeal.taille; const xy = () => { const q = T.cases().find((c) => c.id === 'mod1'); return Math.round(q.x) + ',' + Math.round(q.y); }; const xy2 = xy();
      T.poserEn('mod3', 'mod', 'taille'); UI.refreshSeal(); const t3 = game.editSeal.taille, xy3 = xy(), cr3 = T.croissance().length;
      T.retirer('mod3'); UI.refreshSeal(); const t4 = game.editSeal.taille;
      ok('À la table, le sceau grandit quand on pose sur une case en pointillés, et rapetisse quand on retire', t1 === 'petit' && cr1.includes('mod1') && cr1.includes('core2') && t2 === 'moyen' && game.editSeal.mods[1] === 'duree' && t3 === 'grand' && cr3 === 0 && t4 === 'moyen', [t1, t2, t3, t4].join(' → ') + ' ; pointillés au petit : ' + cr1.join(' '));
      ok('Un glyphe posé ne bouge pas quand le sceau grandit', xy2 === xy3, xy2 + ' / ' + xy3);
      // le trait se choisit à la table
      T.poserEn('core2', 'core', 'gravite'); T.poserEn('trigger', 'trigger', 'contact'); T.poserEn('trigger2', 'trigger', 'retarde'); UI.refreshSeal();
      const bt = [...document.querySelectorAll('#seal-params button')].find((b) => b.textContent === DATA.CORES.gravite.nom); if (bt) bt.click(); const l1 = game.editSeal.lien2;
      T.retirer('trigger2'); UI.refreshSeal(); const l2 = game.editSeal.lien2;
      ok('À la table, on relie le second déclencheur à une essence ; sans lui, le trait tombe', !!bt && l1 === 'core2' && l2 == null, 'trait : ' + l1 + ' puis ' + l2);
      game.editSeal = Seal.clone({ taille: 'grand', core: 'feu', shape: 'zone', mods: ['duree', 'taille', 'portee', null, null], trigger: 'immediat' }); UI.refreshSeal();
      const eqTxt = document.getElementById('seal-equilibre').textContent, detail = document.getElementById('seal-cout-detail').textContent;
      ok('La table dit quand un sceau est équilibré, et le compte dans le coût', /Équilibré/.test(eqTxt) && /−?-?10 %/.test(detail), eqTxt.slice(0, 40) + ' | ' + detail.slice(-30));
      UI.close(); }
    // ---------- 11. le tracé visible, lâcher en plein tracé ----------
    { const s = G({ core2: 'gravite', mods: ['duree', 'taille', 'portee', null, null], trigger2: 'retarde' }); const tr = Seal.geste(s);
      const c = document.createElement('canvas'); c.width = c.height = 120; const ctx = c.getContext('2d'); let err = 0; for (let k = 0; k <= 10; k++) try { Seal.drawTrace(ctx, s, 60, 60, 40, k / 10, k); } catch (e) { err++; }
      ok('Le sceau se dessine anneau par anneau, sans accroc', err === 0 && Seal.anneaux(s).length === 4 && Seal.partiel(s, 0.2) === null && Seal.partiel(s, 0.6).shape && !Seal.partiel(s, 0.6).mods.some(Boolean), 'tracé ' + tr.toFixed(2) + ' s');
      const tenir = (held) => { banc(); souris((X0 + 60) * CS, (Y - 20) * CS); const ink0 = st.p.ink; game.charging.R = { t0: performance.now() - held * 1000, color: '#f00', seal: Seal.clone(s), trace: tr }; game.relacherMain('R'); let n = 0; run(3, () => { n = Math.max(n, projs().length); }); return { n, encre: ink0 - st.p.ink }; };
      const plein = tenir(tr + 0.05), moitie = tenir(tr * 0.6);
      // un sceau plus chargé, plus long à tracer : lâché tout au début, il n'est qu'esquissé
      const gros = G({ core2: 'gravite', core3: 'eau', mods: ['duree', 'taille', 'portee', 'echo', 'rebond'], trigger2: 'retarde', filtre: Object.keys(DATA.FILTRES)[0], cible: Object.keys(DATA.CIBLES)[1] }); const trG = Seal.geste(gros);
      const esquisse = (() => { banc(); const ink0 = st.p.ink; game.charging.R = { t0: performance.now() - 0.2 * 1000, color: '#f00', seal: Seal.clone(gros), trace: trG }; game.relacherMain('R'); let n = 0; run(3, () => { n = Math.max(n, projs().length); }); return { n, encre: ink0 - st.p.ink, prog: 0.2 / trG }; })();
      st.p.gestes = { R: null, L: null }; banc(); lance(s, (X0 + 60) * CS, (Y - 20) * CS); const sansTenir = projs().length; run(3); const apres = projs().length;
      ok('Tenu jusqu\'au bout du tracé, le sort part dès qu\'on lâche', plein.n >= 1 && sansTenir + apres === 0, plein.n + ' projectile(s) en 3 images ; un clic bref attend son tracé (' + apres + ')');
      ok('Lâché en plein tracé : seuls les anneaux finis partent, pour moins d\'encre', moitie.n >= 1 && moitie.encre > 0 && moitie.encre < plein.encre, 'encre ' + moitie.encre.toFixed(1) + ' au lieu de ' + plein.encre.toFixed(1));
      ok('À peine esquissé, rien ne part et rien n\'est payé', esquisse.n === 0 && esquisse.encre === 0, esquisse.n + ' projectile, ' + esquisse.encre + ' encre (tracé à ' + Math.round(esquisse.prog * 100) + ' %)'); }
    // les sceaux consignés suivent la nouvelle règle à leur chargement
    { const vieux = Seal.clone({ taille: 'grand', core: 'feu', shape: 'zone', mods: ['duree', null, null, null, null], trigger: 'immediat' });
      ok('Un ancien grand sceau qui n\'en demande pas tant devient petit', Seal.tailleMin(vieux, ['petit', 'moyen', 'grand'], 3) === 'petit'); }
