// Banc d'essai : maintenu (corps exécuté dans la page, après tests/lib/banc.js)
    const remplir = (x0, y0, x1, y1, m) => { for (let x = x0; x <= x1; x++) for (let y = y0; y <= y1; y++) S.set(x, y, m); };
    const ess = (e) => { if (DATA.CORES[e] && !DATA.CORES[e].interne) return { core: e, mod: null }; for (const a in DATA.ASPECTS) if (DATA.ASPECTS[a].devient === e) return { core: DATA.ASPECTS[a].aspect, mod: a }; return null; };
    const recette = (cle, shape) => { const [a, b] = cle.split('|'); const A = ess(a), B = ess(b); return { taille: 'moyen', core: A.core, core2: B.core, mods: [A.mod, B.mod].filter(Boolean), shape, trigger: 'tenu' }; };
    const M0 = game.inp.mouse;
    const tenir = (v, h = 'R') => { if (h === 'L') M0.rdown = v; else M0.down = v; };
    const phs = (id) => World.phen.liste.filter((q) => q.id === id && !q.mort);
    // la caméra bouge pendant le tracé : on garde la souris sur le point visé
    const lanceT = (seal, wx, wy) => { lance(seal, wx, wy); for (let i = 0; i < 16; i++) { souris(wx, wy); run(1); } };
    const deplacerSouris = (dx, dy, n) => { for (let i = 0; i < n; i++) { M0.x += dx / n; M0.y += dy / n; run(1); } };
    // ---------- Petit soleil tenu ----------
    banc(); World.phen.reset(); tenir(true); lanceT(recette('feu|gravite', 'zone'), P0().x + 150, P0().y - 60); run(30);
    { const ph = phs('feu|gravite')[0]; ok('Petit soleil maintenu : il naît à l\'appui', !!(ph && ph.tenu), ph ? 'tenu par la main ' + ph.tenu.hand : 'absent');
      const x0 = ph ? ph.x : 0, ink0 = st.p.ink; deplacerSouris(160, -20, 60); ok('Petit soleil maintenu : il suit la souris', ph && ph.x - x0 > 80, ph ? Math.round(ph.x - x0) + ' px' : '');
      ok('Petit soleil maintenu : il boit de l\'encre', st.p.ink < ink0, (ink0 - st.p.ink).toFixed(1) + ' encre en 1 s');
      run(660); ok('Petit soleil maintenu : il dure tant qu\'on tient (12 s, au-delà de ses 10 s)', phs('feu|gravite').length === 1, phs('feu|gravite').length ? 'toujours là' : 'disparu');
      const sx = ph.x, sy = ph.y; tenir(false); run(2); let feu = 0; Sim.forRadius(sx, sy, 50, (x, y, i, m) => { if (m === M.FEU) feu++; });
      ok('Petit soleil maintenu : on lâche, il disparaît sans exploser', phs('feu|gravite').length === 0 && feu < 6, phs('feu|gravite').length ? 'encore là' : 'disparu, ' + feu + ' cases de feu'); }
    // ---------- Tornade de feu tenue ----------
    banc(); World.phen.reset(); tenir(true); lanceT(recette('feu|vent', 'zone'), P0().x + 120, P0().y); run(25);
    { const ph = phs('feu|vent')[0]; const x0 = ph ? ph.x : 0; deplacerSouris(220, 0, 90); ok('Tornade maintenue : elle suit la souris au sol', ph && ph.x - x0 > 120, ph ? Math.round(ph.x - x0) + ' px' : 'absente');
      deplacerSouris(-200, 0, 90); ok('Tornade maintenue : elle revient quand la souris revient', ph && ph.x - x0 < 100, ph ? Math.round(ph.x - x0) + ' px' : '');
      tenir(false); run(2); ok('Tornade maintenue : pouf, elle disparaît', phs('feu|vent').length === 0, phs('feu|vent').length ? 'encore là' : 'disparue'); }
    // ---------- Rayon ardent tenu (trait) ----------
    banc(); World.phen.reset(); tenir(true); lanceT(recette('feu|lumiere', 'trait'), P0().x + 200, P0().y + 20); run(25);
    { const ph = phs('feu|lumiere')[0]; const x0 = ph ? ph.ligne.x2 : 0; deplacerSouris(-120, 30, 50); ok('Rayon ardent maintenu : son point brûlant suit la souris', ph && Math.abs(ph.ligne.x2 - x0) > 60, ph ? Math.round(ph.ligne.x2 - x0) + ' px' : 'absent'); tenir(false); run(2); ok('Rayon ardent maintenu : il s\'éteint au relâchement', phs('feu|lumiere').length === 0, ''); }
    // ---------- Sphère d'eau : on la porte, on la lâche ----------
    banc(); World.phen.reset(); remplir(X0 - 30, Y - 3, X0 - 22, Y, M.EAU); remplir(X0 - 31, Y - 4, X0 - 31, Y, M.PIERRE); remplir(X0 - 21, Y - 4, X0 - 21, Y, M.PIERRE); tenir(true); lanceT(recette('eau|gravite', 'zone'), (X0 - 26) * CS, (Y - 6) * CS); run(80);
    { const ph = phs('eau|gravite')[0]; deplacerSouris(220, -40, 80); const eau = ph ? ph.data.eau : 0; tenir(false); run(40); let n = 0; Sim.forRadius((X0 + 12) * CS, (Y - 6) * CS, 120, (x, y, i, m) => { if (m === M.EAU) n++; }); ok('Sphère d\'eau maintenue : on emporte l\'eau et on la lâche ailleurs', eau > 20 && n > 15, eau + ' cases portées, ' + n + ' versées plus loin'); }
    // ---------- Singularité : on rassemble, on lâche, elle éclate ----------
    banc(); World.phen.reset(); { const lp = bete('lapin', X0 - 5); lp.sta.stun = 999; tenir(true); lanceT(recette('force|gravite', 'zone'), (X0 - 10) * CS, (Y - 6) * CS); run(200); const ph = phs('force|gravite')[0]; const pasEclate = ph && !ph.data.boum; const vx0 = Math.abs(lp.vx); tenir(false); run(2); ok('Singularité maintenue : elle ne fait que rassembler tant qu\'on tient', pasEclate, pasEclate ? '3 s sans éclater' : 'a éclaté'); ok('Singularité maintenue : elle éclate quand on lâche', phs('force|gravite').length === 0 && Math.abs(lp.vx) + Math.abs(lp.vy) > 100, 'lapin projeté à ' + Math.round(Math.hypot(lp.vx, lp.vy)) + ' px/s'); libere(); }
    // ---------- Encre épuisée ----------
    banc(); World.phen.reset(); tenir(true); lanceT(recette('feu|gravite', 'zone'), P0().x + 150, P0().y - 60); run(30); st.p.ink = 2; run(90); ok('Sans encre, le sort tenu se défait', phs('feu|gravite').length === 0, phs('feu|gravite').length ? 'encore là' : 'défait'); st.p.ink = 9999; tenir(false);
    // ---------- Lâché trop tôt ----------
    banc(); World.phen.reset(); { st.p.ink = 500; tenir(true); lance(recette('feu|gravite', 'zone'), P0().x + 150, P0().y - 60); const i1 = st.p.ink; tenir(false); run(40); ok('Lâché pendant le tracé : rien ne naît, l\'encre est presque rendue', phs('feu|gravite').length === 0 && st.p.ink > i1 + 5, 'encre ' + Math.round(i1) + ' → ' + Math.round(st.p.ink)); st.p.ink = 9999; }
    // ---------- Main gauche ----------
    banc(); World.phen.reset(); { st.p.gestes = { R: null, L: null }; souris(P0().x + 150, P0().y - 60); tenir(true, 'L'); World.castSeal(Seal.clone(recette('feu|gravite', 'zone')), { x: P0().x + 150, y: P0().y - 60 }, false, 0, 'L'); run(30); const a = phs('feu|gravite').length; tenir(false, 'L'); run(2); ok('Main gauche : clic droit tenu, le soleil vit ; lâché, il part', a === 1 && phs('feu|gravite').length === 0, a + ' → ' + phs('feu|gravite').length); }
    // ---------- Sorts simples tenus ----------
    banc(); World.phen.reset(); tenir(true); lanceT({ core: 'feu', shape: 'projectile', mods: [], trigger: 'tenu' }, P0().x + 200, P0().y - 40); run(20);
    { const q = projs().find((s) => s.tenu); const y0 = q ? q.y : 0; for (let i = 0; i < 40; i++) { souris(P0().x + 120, P0().y - 200); run(1); } ok('Projectile maintenu : guidé par la souris', q && !q.mort && q.y < y0 - 40, q ? Math.round(y0 - q.y) + ' px vers le haut' : 'pas de projectile'); run(120); for (let i = 0; i < 120; i++) { souris(P0().x + 120, P0().y - 200); run(1); } ok('Projectile maintenu : il se tient au bout de la main tant qu\'on tient', q && !q.mort && Math.hypot(q.vx, q.vy) < 80, q && !q.mort ? 'toujours là' : 'disparu'); tenir(false); run(2); ok('Projectile maintenu : lâché, il se défait', q && q.mort, ''); }
    banc(); World.phen.reset(); tenir(true); lanceT({ core: 'eau', shape: 'zone', mods: [], trigger: 'tenu' }, P0().x + 150, P0().y); run(20);
    { const c = st.sp.find((s) => s.k === 'canal' && s.tenu); run(60); ok('Zone maintenue : l\'eau coule là où pointe la souris', c && !c.mort && S.countRect(X0 - 80, Y - 45, X0 + 80, Y, M.EAU) > 10, S.countRect(X0 - 80, Y - 45, X0 + 80, Y, M.EAU) + ' cases d\'eau'); tenir(false); run(2); ok('Zone maintenue : lâchée, elle s\'arrête', c && c.mort, ''); }
    banc(); World.phen.reset(); tenir(true); lanceT({ core: 'foudre', shape: 'trait', mods: [], trigger: 'tenu' }, P0().x + 200, P0().y); { let nb = 0; const vus2 = new WeakSet(); run(80, () => { for (const s of st.sp) if (s.k === 'beam' && !vus2.has(s)) { vus2.add(s); nb++; } }); tenir(false); run(5); let apres = 0; run(30, () => { for (const s of st.sp) if (s.k === 'beam' && !vus2.has(s)) { vus2.add(s); apres++; } }); ok('Trait maintenu : un rayon continu tant qu\'on tient, rien après', nb >= 5 && apres === 0, nb + ' rayons, ' + apres + ' après'); }
    { const u = DATA.UNLOCKS.find((q) => q.item === 'tenu'); ok('Déblocage : à la première fusion découverte', u && u.cond({ combos: { 'feu|gravite': 1 }, compteurs: { niveau: 1 } }) && !u.cond({ combos: {}, compteurs: { niveau: 1 } }), u ? u.indice : 'absent'); }
    tenir(false);
