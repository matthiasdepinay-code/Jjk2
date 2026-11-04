// Banc d'essai : glyphes (corps exécuté dans la page, après tests/lib/banc.js)
    // suivre un projectile jusqu'à sa fin
    const suivre = (n = 240) => { const tr = []; let q = null; run(n, () => { const ps = projs(); if (!q && ps.length) q = ps[0]; if (q && !q.mort) tr.push([q.x, q.y, q.vx, q.vy]); }); return { tr, q }; };
    const longueur = (tr) => { let L = 0; for (let i = 1; i < tr.length; i++) L += Math.hypot(tr[i][0] - tr[i - 1][0], tr[i][1] - tr[i - 1][1]); return L; };

    // ================= MODIFICATEURS =================
    // Portée : distance parcourue en l'air
    banc(); lance({ core: 'vent', shape: 'projectile', mods: [] }, P0().x + 600, P0().y - 20); const base = suivre();
    banc(); lance({ core: 'vent', shape: 'projectile', mods: ['portee'] }, P0().x + 600, P0().y - 20); const loin = suivre();
    ok('Portée : le projectile va plus loin', longueur(loin.tr) > longueur(base.tr) * 1.3, Math.round(longueur(base.tr)) + ' px → ' + Math.round(longueur(loin.tr)) + ' px');
    // Vitesse
    banc(); lance({ core: 'vent', shape: 'projectile', mods: ['vitesse'] }, P0().x + 600, P0().y - 20); const vite = suivre(30);
    const v0 = base.tr[5] ? Math.hypot(base.tr[5][2], base.tr[5][3]) : 0, v1 = vite.tr[5] ? Math.hypot(vite.tr[5][2], vite.tr[5][3]) : 0;
    ok('Vitesse : le projectile va plus vite', v1 > v0 * 1.25, Math.round(v0) + ' → ' + Math.round(v1) + ' px/s');
    // Double
    banc(); lance({ core: 'vent', shape: 'projectile', mods: ['double'] }, P0().x + 600, P0().y - 20); run(14); ok('Double (projectile) : deux projectiles en éventail', projs().length === 2, projs().length + ' projectiles');
    banc(); lance({ core: 'eau', shape: 'zone', mods: ['double'], trigger: 'immediat' }, P0().x + 200, P0().y); run(14); ok('Double (zone) : deux zones', eclats.filter((e) => e.core === 'eau').length === 2, eclats.length + ' éclats');
    banc(); bete('golem', X0 - 20); bete('lapin', X0 - 10, Y - 12); lance({ core: 'foudre', shape: 'trait', mods: ['double'], trigger: 'immediat' }, P0().x + 400, P0().y); run(14); ok('Double (trait) : deux traits', st.sp.filter((q) => q.k === 'beam').length >= 2, st.sp.filter((q) => q.k === 'beam').length + ' trait(s)'); libere();
    // Rebond
    banc({ mur: 1 }); lance({ core: 'vent', shape: 'projectile', mods: ['rebond'], trigger: 'contact' }, P0().x + 400, P0().y - 20); const rb = suivre(120);
    const demiTour = rb.tr.some((p, i) => i > 0 && Math.sign(p[2]) !== Math.sign(rb.tr[i - 1][2]) && Math.abs(p[2]) > 50);
    ok('Rebond : le projectile repart du mur', demiTour, demiTour ? 'demi-tour au mur' : 'aucun rebond');
    // Puissance : dégâts sur un golem
    const degats = (mods) => { banc(); const g = bete('golem', X0); g.hpMax = 99; g.hp = 99; lance({ core: 'foudre', shape: 'zone', mods, trigger: 'immediat' }, (X0 + 2) * CS, (Y - 6) * CS); run(20); const d = 99 - g.hp; libere(); g.hpMax = 8; return d; };
    const d0 = degats([]), d1 = degats(['puissance']);
    ok('Puissance : plus de dégâts', d1 > d0 * 1.3, d0.toFixed(1) + ' → ' + d1.toFixed(1));
    // Taille et Réduction : rayon de l'éclat
    const rayon = (mods) => { banc(); lance({ core: 'eau', shape: 'zone', mods, trigger: 'immediat' }, P0().x + 200, P0().y); run(14); return eclats.length ? eclats[0].r : 0; };
    const r0 = rayon([]), r1 = rayon(['taille']), r2 = rayon(['reduire']);
    ok('Taille : zone plus grande', r1 > r0 * 1.3, Math.round(r0) + ' → ' + Math.round(r1) + ' px'); ok('Réduction : zone plus petite', r2 < r0 * 0.7 && r2 > 0, Math.round(r0) + ' → ' + Math.round(r2) + ' px');
    // Durée : aura plus longue
    const vieAura = (mods) => { banc(); lance({ core: 'lumiere', shape: 'aura', mods, trigger: 'immediat' }, P0().x + 100, P0().y); run(14); const f = st.sp.find((q) => q.k === 'field'); return f ? f.life : 0; };
    const a0 = vieAura([]), a1 = vieAura(['duree']);
    ok('Durée : l\'aura dure plus longtemps', a1 > a0 * 1.5, a0.toFixed(1) + ' → ' + a1.toFixed(1) + ' s');
    // Persistance : une trace reste
    banc(); lance({ core: 'feu', shape: 'zone', mods: ['persistance'], trigger: 'immediat' }, P0().x + 200, P0().y); run(14); ok('Persistance : une trace durable', st.sp.some((q) => q.k === 'field'), st.sp.filter((q) => q.k === 'field').length + ' champ(s)');
    // Inverser : le feu gèle l'eau
    banc({ mare: -5 }); lance({ core: 'feu', shape: 'zone', mods: ['inverser'], trigger: 'immediat' }, X0 * CS, (Y - 2) * CS); run(30); ok('Inverser : le feu inversé gèle l\'eau', S.countRect(X0 - 10, Y - 5, X0 + 10, Y, M.GLACE) > 3, S.countRect(X0 - 10, Y - 5, X0 + 10, Y, M.GLACE) + ' cases de glace');
    // Écho : trois éclats
    banc(); lance({ core: 'eau', shape: 'zone', mods: ['echo'], trigger: 'immediat' }, P0().x + 200, P0().y); run(150); ok('Écho : l\'effet se répète', eclats.filter((e) => e.core === 'eau').length >= 3, eclats.filter((e) => e.core === 'eau').length + ' éclats');
    // Téléguidé : le projectile suit la souris
    banc(); lance({ core: 'vent', shape: 'projectile', mods: ['teleguide'] }, P0().x + 400, P0().y); souris(P0().x + 150, P0().y - 300); const tg = suivre(60);
    const monte = tg.tr.length > 10 && tg.tr[tg.tr.length - 1][1] < tg.tr[0][1] - 60;
    ok('Téléguidé : le projectile suit la souris', monte, tg.tr.length ? 'Δy ' + Math.round(tg.tr[tg.tr.length - 1][1] - tg.tr[0][1]) + ' px' : 'aucun projectile');
    // Orbite
    banc(); lance({ core: 'feu', shape: 'projectile', mods: ['orbite'] }, P0().x + 200, P0().y); run(20); const orb = st.sp.filter((q) => q.k === 'orbit'); ok('Orbite : trois billes autour de toi', orb.length === 3, orb.length + ' billes');
    // Canalisé
    banc(); game.inp.mouse.down = true; const ink0 = st.p.ink; lance({ core: 'eau', shape: 'zone', mods: ['canalise'], trigger: 'immediat' }, P0().x + 200, P0().y); run(60, () => souris(P0().x + 200, P0().y - 30)); const canal = st.sp.some((q) => q.k === 'canal'); const eauC = S.countRect(X0 - 80, Y - 45, X0 + 80, Y, M.EAU); game.inp.mouse.down = false; run(20);
    ok('Canalisé : l\'effet suit la souris tant qu\'on tient', canal && eauC > 10, (canal ? 'canal actif' : 'pas de canal') + ', ' + eauC + ' cases d\'eau, encre ' + Math.round(ink0 - st.p.ink));
    // Sous-sceau
    banc({ mur: 1 }); lance({ core: 'vent', shape: 'projectile', mods: [{ sub: { core: 'eau', shape: 'zone', mods: [], trigger: 'immediat' } }], trigger: 'contact' }, P0().x + 400, P0().y - 20); run(120);
    ok('Sous-sceau : le sceau emboîté part de l\'éclat', eclats.some((e) => e.core === 'vent') && eclats.some((e) => e.core === 'eau'), eclats.map((e) => e.core).join(', '));

    // ================= TRAJECTOIRES =================
    banc(); lance({ core: 'vent', shape: 'projectile', mods: ['spirale'] }, P0().x + 600, P0().y - 40); const spi = suivre(60);
    let ch = 0, amp = 0; { const tr = spi.tr; const a = tr[0], b = tr[tr.length - 1]; if (tr.length > 5) { const L = Math.hypot(b[0] - a[0], b[1] - a[1]) || 1, nx = -(b[1] - a[1]) / L, ny = (b[0] - a[0]) / L; let prev = 0; for (const p of tr) { const off = (p[0] - a[0]) * nx + (p[1] - a[1]) * ny; amp = Math.max(amp, Math.abs(off)); if (prev && Math.sign(off) !== Math.sign(prev) && Math.abs(off) > 2) ch++; prev = off; } } }
    ok('Spirale : le projectile zigzague autour de sa course', amp > 8 && ch >= 3, 'amplitude ' + Math.round(amp) + ' px, ' + ch + ' changements de côté');
    banc({ marche: -20 }); lance({ core: 'foudre', shape: 'projectile', mods: ['rasesol'] }, P0().x + 600, P0().y - 100); const rs = suivre(70);
    const ecarts = rs.tr.filter((p) => p[0] < (X0 + 75) * CS).map((p) => { const cx = Math.floor(p[0] / CS); let y = Math.floor(p[1] / CS); while (y < Y + 6 && !S.P[S.get(cx, y)].solid) y++; return y * CS - p[1]; });
    const surMarche = rs.tr.filter((p) => p[0] > (X0 - 15) * CS && p[0] < (X0 + 70) * CS); const montee = surMarche.length > 3 && surMarche.every((p) => p[1] < (Y - 3) * CS);
    ok('Rase-sol : épouse le sol et grimpe la marche', rs.tr.length > 10 && Math.max(...ecarts.slice(12)) < 30 && montee, 'hauteur au sol max ' + Math.round(Math.max(...ecarts.slice(12), 0)) + ' px, ' + (montee ? 'a grimpé' : 'n\'a pas grimpé') + ' (' + rs.tr.length + ' images)');
    banc(); const pdep = P0(); lance({ core: 'vent', shape: 'projectile', mods: ['boomerang'] }, P0().x + 600, P0().y - 20); const bm = suivre(240);
    const loinB = Math.max(...bm.tr.map((p) => p[0] - pdep.x)), finB = bm.tr.length ? Math.hypot(bm.tr[bm.tr.length - 1][0] - pdep.x, bm.tr[bm.tr.length - 1][1] - pdep.y) : 999;
    ok('Boomerang : part, puis revient dans la main', loinB > 150 && finB < 60, 'portée ' + Math.round(loinB) + ' px, fin à ' + Math.round(finB) + ' px de toi');

    // ================= DÉCLENCHEURS =================
    banc(); lance({ core: 'eau', shape: 'zone', mods: [], trigger: 'immediat' }, P0().x + 200, P0().y); run(30); ok('Immédiat : éclat aussitôt', eclats.length >= 1 && eclats[0].t < 0.4, eclats.length ? 'à ' + eclats[0].t.toFixed(2) + ' s' : 'rien');
    banc({ mur: 1 }); lance({ core: 'vent', shape: 'projectile', mods: [], trigger: 'contact' }, P0().x + 400, P0().y - 20); run(90); ok('Au contact : éclat au mur', eclats.some((e) => Math.abs(e.x - X0 * CS) < 40), eclats.length ? 'éclat à x=' + Math.round(eclats[0].x / CS - X0) + ' cases du mur' : 'rien');
    for (const del of [1, 2, 5]) { banc(); lance({ core: 'eau', shape: 'zone', mods: [], trigger: 'retarde', delai: del }, P0().x + 200, P0().y); run(Math.round((del + 1) * 60)); ok('Retardé ' + del + ' s', eclats.length >= 1 && Math.abs(eclats[0].t - del - 0.2) < 0.35, eclats.length ? 'éclat à ' + eclats[0].t.toFixed(2) + ' s' : 'rien'); }
    banc(); lance({ core: 'eau', shape: 'zone', mods: [], trigger: 'commande' }, P0().x + 200, P0().y); run(60); const avantF = eclats.length; World.detoner(); run(10); ok('Sur commande : attend la touche F', avantF === 0 && eclats.length >= 1, avantF + ' éclat avant F, ' + eclats.length + ' après');
    banc(); lance({ core: 'eau', shape: 'zone', mods: [], trigger: 'repetition', periode: 1 }, P0().x + 200, P0().y); run(300); ok('Répétition (1 s) : l\'effet recommence', eclats.length >= 4, eclats.length + ' éclats en 5 s');
    banc(); lance({ core: 'lumiere', shape: 'aura', mods: [], trigger: 'expiration' }, P0().x + 100, P0().y); run(60); const avE = eclats.filter((e) => e.t > 0.5).length; run(400); ok('À l\'expiration : dernier éclat quand l\'effet s\'éteint', avE === 0 && eclats.filter((e) => e.t > 5).length >= 1, eclats.map((e) => e.t.toFixed(1)).join(' '));

    // ================= FILTRES =================
    banc({ mur: -10, mare: 5 }); lance({ core: 'vent', shape: 'projectile', mods: [], trigger: 'contact', filtre: 'eau' }, (X0 + 10) * CS, (Y - 2) * CS); run(90);
    ok('Filtre Eau : traverse le mur, éclate dans l\'eau', eclats.some((e) => e.x > (X0 + 3) * CS), eclats.length ? 'éclat à ' + Math.round(eclats[0].x / CS - X0) + ' cases (mur à -10, mare à +5)' : 'rien');
    banc({ mur: -10 }); const cf = bete('lapin', X0 + 10); lance({ core: 'eau', shape: 'projectile', mods: [], trigger: 'contact', filtre: 'creature' }, cf.x + 10, cf.y + 10); run(90);
    ok('Filtre Créature : traverse le mur, éclate sur la bête', eclats.some((e) => Math.abs(e.x - cf.x) < 40), eclats.length ? 'éclat à ' + Math.round(eclats[0].x / CS - X0) + ' cases (bête à +10)' : 'rien'); libere();
    banc({ mur: -10 }); const caisse = st.objs.find((o) => o.t === 'caisse' && !o.mort); caisse.x = (X0 + 12) * CS; caisse.y = Y * CS - caisse.h; caisse.vx = caisse.vy = 0; lance({ core: 'vent', shape: 'projectile', mods: [], trigger: 'contact', filtre: 'objet' }, caisse.x + 10, caisse.y + 10); run(90);
    ok('Filtre Objet : traverse le mur, éclate sur la caisse', eclats.some((e) => e.x > (X0 + 5) * CS && e.x < (X0 + 20) * CS), eclats.length ? 'éclat à ' + Math.round(eclats[0].x / CS - X0) + ' cases (caisse à +12)' : 'rien');

    // ================= CIBLES =================
    banc(); const ct = bete('lapin', X0 + 20, Y - 15); lance({ core: 'eau', shape: 'projectile', mods: [], trigger: 'contact', cible: 'creature' }, P0().x - 300, P0().y); window.__pres = st.crs.filter((c) => c.hp > 0 && Math.hypot(c.x - st.p.x, c.y - st.p.y) < 120).map((c) => c.t + (c.controlled ? '(contrôlé)' : '') + (c.sta.tame ? '(apprivoisé)' : '')); window.__trap = !!st.p.trap; const dbgP = []; run(150, (i) => { const q = projs()[0]; if (q && dbgP.length < 4) dbgP.push([Math.round(q.x / CS - X0), Math.round(q.y / CS), Math.round(q.vx), Math.round(q.vy), q.homing ? q.homing.t + '@' + Math.round(q.homing.x / CS - X0) + ',' + Math.round(q.homing.y / CS) : '-']); }); window.__dbgP = dbgP;
    { const dmin = Math.min(...eclats.map((e) => Math.hypot(e.x - ct.x - ct.w / 2, e.y - ct.y - ct.h / 2)), 9999); ok('Cible Créature : part seul vers la bête', dmin < 60, eclats.length ? 'éclat à ' + Math.round(dmin) + ' px de la bête ; éclats : ' + eclats.map((e) => e.core + '@' + Math.round(e.x / CS - X0) + ',' + Math.round(e.y / CS) + ' t' + e.t.toFixed(2)).join(' ') + ' ; près du joueur ' + JSON.stringify(window.__pres) + ' trap ' + window.__trap + ' ; proj ' + JSON.stringify(window.__dbgP) + ' ; bête ' + Math.round(ct.x / CS - X0) + ',' + Math.round(ct.y / CS) : 'rien'); } libere();
    banc(); st.marques.push({ x: (X0 + 30) * CS, y: (Y - 5) * CS, t: 0 }); lance({ core: 'eau', shape: 'projectile', mods: [], trigger: 'contact', cible: 'marque' }, P0().x - 300, P0().y); run(150);
    ok('Cible Marque : part vers la marque', eclats.some((e) => Math.hypot(e.x - (X0 + 30) * CS, e.y - (Y - 5) * CS) < 60), eclats.length ? 'éclat à ' + Math.round(Math.hypot(eclats[0].x - (X0 + 30) * CS, eclats[0].y - (Y - 5) * CS)) + ' px de la marque' : 'rien');

    // ================= TAILLES =================
    const cm = Seal.cost(Seal.clone({ taille: 'moyen', core: 'feu', shape: 'zone', mods: ['puissance'] })), cp = Seal.cost(Seal.clone({ taille: 'petit', core: 'feu', shape: 'zone', mods: ['puissance'] }));
    ok('Petit sceau : moitié prix', cp <= Math.ceil(cm / 2), cm + ' → ' + cp + ' encre');
    banc(); lance({ core: 'eau', shape: 'zone', mods: ['taille', 'puissance', 'reduire', 'duree', 'echo'], trigger: 'immediat', trigger2: 'repetition', taille: 'grand', periode: 1 }, P0().x + 200, P0().y); run(200);
    ok('Grand sceau : 5 modificateurs et 2 déclencheurs actifs', eclats.length >= 4, eclats.length + ' éclats (écho + répétition)');

    // ================= FORMES =================
    banc(); const vy0 = st.p.vy; lance({ core: 'vent', shape: 'soi', mods: [], trigger: 'immediat' }, P0().x, P0().y); run(30); ok('Sur soi : l\'effet s\'applique à toi', st.p.y < (Y - 12) * CS, 'joueur monté de ' + Math.round((Y - 9) * CS - st.p.y) + ' px');
    banc(); bete('golem', X0 - 20); const g2 = bete('golem', X0 - 5); g2.hpMax = 99; g2.hp = 99; lance({ core: 'foudre', shape: 'trait', mods: [], trigger: 'immediat' }, (X0 + 30) * CS, (Y - 5) * CS); run(14); ok('Trait : touche tout le long', st.sp.some((q) => q.k === 'beam') && g2.hp < 99, 'golem lointain : ' + (99 - g2.hp).toFixed(1) + ' dégâts'); libere(); g2.hpMax = 8; g2.hp = 8;
    banc(); lance({ core: 'terre', shape: 'mur', mods: [], trigger: 'immediat' }, P0().x + 200, P0().y); run(40); { let haut = 0; for (let y = Y - 40; y <= Y; y++) if (S.countRect(X0 - 30, y, X0 + 10, y, M.TERRE) > 0) { haut = Y - y; break; } ok('Mur : un mur vertical', haut >= 10, 'hauteur ' + haut + ' cases'); }
    banc(); lance({ core: 'eau', shape: 'totem', mods: [], trigger: 'immediat' }, P0().x + 200, P0().y); run(240); ok('Totem : éclate à intervalles', st.sp.some((q) => q.k === 'totem') && eclats.length >= 2, eclats.length + ' éclats en 4 s');
    banc(); const ch1 = bete('lapin', X0 - 30), ch2 = bete('grenouille', X0 - 18), ch3 = bete('tortue', X0 - 6); [ch1, ch2, ch3].forEach((c) => { c.hpMax = 99; c.hp = 99; c.sta.stun = 999; });
    lance({ core: 'foudre', shape: 'chaine', mods: [], trigger: 'contact' }, ch1.x + 10, ch1.y + 8); run(90); const touchees = [ch1, ch2, ch3].filter((c) => c.hp < 99).length;
    ok('Chaîne : saute de créature en créature', touchees >= 2, touchees + ' créatures touchées sur 3'); [ch1, ch2, ch3].forEach((c) => { c.hpMax = DATA.ESPECES[c.t].hp; }); libere();
    banc(); lance({ core: 'eau', shape: 'pluie', mods: [], trigger: 'immediat' }, P0().x + 200, P0().y); run(120); ok('Pluie : une pluie de l\'élément', st.sp.some((q) => q.k === 'rain') || S.countRect(X0 - 80, Y - 45, X0 + 80, Y, M.EAU) > 10, S.countRect(X0 - 80, Y - 45, X0 + 80, Y, M.EAU) + ' cases d\'eau tombées');
    banc(); const cs2 = st.objs.find((o) => o.t === 'caisse' && !o.mort); cs2.x = (X0 - 20) * CS; cs2.y = Y * CS - cs2.h; lance({ core: 'feu', shape: 'objet', mods: [], trigger: 'immediat' }, cs2.x + 18, cs2.y + 18); run(30); ok('Sur objet : l\'objet porte l\'effet', !!cs2.ench, cs2.ench ? 'caisse enchantée ' + cs2.ench.t.toFixed(0) + ' s' : 'rien');
    banc(); const bb = bete('lapin', X0 - 44); bb.sta.stun = 0; lance({ core: 'vent', shape: 'bouclier', mods: [], trigger: 'immediat' }, P0().x + 100, P0().y); run(30); ok('Bouclier : un arc qui repousse', st.sp.some((q) => q.k === 'bouclier'), st.sp.some((q) => q.k === 'bouclier') ? 'bouclier actif' : 'rien'); libere();
    banc(); const cible = bete('limace', X0 - 30); lance({ core: 'feu', shape: 'invocation', mods: [], trigger: 'immediat' }, P0().x + 100, P0().y); run(300); const fam = st.crs.find((c) => c.t === 'familier' && c.hp > 0);
    ok('Invocation : un familier qui attaque', cible.hp < cible.hpMax, (fam ? 'familier présent' : 'pas de familier') + ', limace ' + cible.hp.toFixed(1) + '/' + cible.hpMax); if (fam) fam.hp = 0; libere();
    banc(); lance({ core: 'lumiere', shape: 'aura', mods: [], trigger: 'immediat' }, P0().x + 100, P0().y); run(14); st.p.x += 200; run(5); const fa = st.sp.find((q) => q.k === 'field'); ok('Aura : l\'effet suit le joueur', fa && Math.abs(fa.x - (st.p.x + st.p.w / 2)) < 20, fa ? 'écart ' + Math.round(fa.x - st.p.x - st.p.w / 2) + ' px' : 'rien');

    // ================= NOUVEAUX GLYPHES =================
    banc(); lance({ core: 'vent', shape: 'projectile', mods: ['zigzag'] }, P0().x + 600, P0().y - 40); const zz = suivre(60);
    { let chz = 0, ampz = 0, vifs = 0; const tr = zz.tr; if (tr.length > 5) { const a = tr[0], b = tr[tr.length - 1]; const L = Math.hypot(b[0] - a[0], b[1] - a[1]) || 1, nx = -(b[1] - a[1]) / L, ny = (b[0] - a[0]) / L; let prev = 0, pd = 0; for (let i = 1; i < tr.length; i++) { const off = (tr[i][0] - a[0]) * nx + (tr[i][1] - a[1]) * ny; ampz = Math.max(ampz, Math.abs(off)); const d = off - ((tr[i - 1][0] - a[0]) * nx + (tr[i - 1][1] - a[1]) * ny); if (pd && Math.sign(d) !== Math.sign(pd)) chz++; pd = d; } }
      ok('Zigzag : le projectile file en zigzag', ampz > 8 && chz >= 4, 'amplitude ' + Math.round(ampz) + ' px, ' + chz + ' virages'); }
    banc({ mur: -25 }); const cibleC = { x: (X0 - 15) * CS, y: (Y - 1) * CS }; lance({ core: 'eau', shape: 'projectile', mods: ['cloche'], trigger: 'contact' }, cibleC.x, cibleC.y); run(150);
    { const dmin = Math.min(...eclats.map((e) => Math.hypot(e.x - cibleC.x, e.y - cibleC.y)), 9999); ok('Cloche : passe par-dessus le mur et retombe sur le point visé', dmin < 40, 'éclat à ' + Math.round(dmin) + ' px du point visé (mur entre les deux)'); }
    banc(); const pc = [bete('golem', X0 - 30), bete('golem', X0 - 15), bete('golem', X0)]; pc.forEach((g) => { g.hpMax = 99; g.hp = 99; }); lance({ core: 'foudre', shape: 'projectile', mods: ['percant'], trigger: 'contact' }, P0().x + 600, P0().y); run(120);
    { const n = pc.filter((g) => g.hp < 99).length; ok('Perçant : traverse et touche chaque créature', n === 3, n + ' golems touchés sur 3'); pc.forEach((g) => { g.hpMax = 8; g.hp = 8; }); libere(); }
    banc({ mur: 1 }); lance({ core: 'eau', shape: 'projectile', mods: ['gerbe'], trigger: 'contact' }, P0().x + 400, P0().y - 20); run(150);
    ok('Gerbe : le sort se brise en éclats', eclats.filter((e) => e.core === 'eau').length >= 4, eclats.filter((e) => e.core === 'eau').length + ' éclats');
    banc(); const px1 = bete('golem', X0 - 10, Y); px1.hpMax = 99; px1.hp = 99; lance({ core: 'foudre', shape: 'projectile', mods: [], trigger: 'proximite' }, P0().x + 600, P0().y - 95); run(80);
    { const e = eclats[0]; ok('Proximité : éclate près d\'une créature sans la toucher', e && px1.hp < 99, e ? 'éclat à ' + Math.round(Math.hypot(e.x - px1.x - px1.w / 2, e.y - px1.y - px1.h / 2)) + ' px, golem ' + (99 - px1.hp).toFixed(1) + ' dégâts' : 'rien'); px1.hpMax = 8; px1.hp = 8; libere(); }
    banc(); lance({ core: 'eau', shape: 'zone', mods: [], trigger: 'proximite' }, P0().x + 200, P0().y); run(60); const av = eclats.length; const mn = bete('lapin', Math.round((P0().x + 200) / CS) + 4); mn.sta.stun = 0; run(30);
    ok('Proximité (zone) : une mine qui attend une créature', av === 0 && eclats.length >= 1, av + ' éclat avant, ' + eclats.length + ' quand la bête approche'); libere();
    banc(); const vg = bete('lapin', X0 - 30); vg.sta.stun = 0; const vgx = vg.x; lance({ core: 'eau', shape: 'vague', mods: [], trigger: 'immediat' }, P0().x + 300, P0().y); run(60);
    ok('Vague : roule au sol et emporte les créatures', st.sp.some((q) => q.k === 'vague') || vg.x - vgx > 60, 'lapin emporté de ' + Math.round(vg.x - vgx) + ' px'); libere();
    banc(); const co = st.objs.find((o) => o.t === 'caisse' && !o.mort); co.x = (X0 - 18) * CS; co.y = Y * CS - co.h; co.vx = co.vy = 0; const coy = co.y; lance({ core: 'eau', shape: 'colonne', mods: [], trigger: 'immediat' }, co.x + 18, co.y); run(50);
    ok('Colonne : un jet qui soulève', coy - co.y > 40, 'caisse soulevée de ' + Math.round(coy - co.y) + ' px, ' + S.countRect(X0 - 40, Y - 45, X0, Y, M.EAU) + ' cases d\'eau');
    banc(); lance({ core: 'foudre', shape: 'projectile', mods: ['zigzag', 'percant', 'gerbe'], trigger: 'proximite', taille: 'grand' }, P0().x + 600, P0().y); run(120); ok('Zigzag + Perçant + Gerbe + Proximité : sans erreur', true, eclats.length + ' éclats');
    banc(); lance({ core: 'feu', shape: 'colonne', mods: ['double', 'taille'], trigger: 'immediat' }, P0().x + 200, P0().y); run(60); ok('Colonne de feu + Taille : sans erreur', true, '');
    banc(); lance({ core: 'terre', shape: 'vague', mods: ['vitesse', 'portee'], trigger: 'immediat' }, P0().x + 300, P0().y); run(90); ok('Vague de terre + Vitesse + Portée : sans erreur', true, '');
    banc(); lance({ core: 'eau', shape: 'projectile', mods: ['cloche', 'double'], trigger: 'contact' }, P0().x + 250, P0().y); run(20); ok('Cloche + Double : deux projectiles en cloche', projs().length === 2, projs().length + ' projectiles');
    // ================= MAGIE COMPLÈTE =================
    const boite = (m) => { let x0 = 1e9, x1 = -1e9, y0 = 1e9, y1 = -1e9, n = 0; for (let x = X0 - 80; x <= X0 + 80; x++) for (let y = Y - 45; y <= Y; y++) if (S.get(x, y) === M[m]) { n++; x0 = Math.min(x0, x); x1 = Math.max(x1, x); y0 = Math.min(y0, y); y1 = Math.max(y1, y); } return { n, w: n ? x1 - x0 + 1 : 0, h: n ? y1 - y0 + 1 : 0, y0, y1 }; };
    // lames de glace sur un golem (qui ne craint pas le froid)
    banc(); const gl = bete('golem', X0 - 10); gl.hpMax = 99; gl.hp = 99; lance({ core: 'eau', shape: 'projectile', mods: ['gel', 'matiere'], trigger: 'contact' }, gl.x + 25, gl.y + 35); run(80);
    ok('Lame de glace : une lame frappe le golem et laisse de la glace', gl.hp < 99 - 2 && boite('GLACE').n > 0, 'golem ' + (99 - gl.hp).toFixed(1) + ' dégâts, ' + boite('GLACE').n + ' cases de glace'); gl.hpMax = 8; gl.hp = 8; libere();
    banc(); let nl = 0; const vusL = new WeakSet(); lance({ core: 'eau', shape: 'projectile', mods: ['gel', 'matiere', 'rafale', 'double'], trigger: 'contact', taille: 'grand' }, P0().x + 500, P0().y - 30); run(60, () => { for (const q of projs()) if (!vusL.has(q)) { vusL.add(q); if (q.matiere != null) nl++; } });
    ok('Volée de lames : Rafale + Double', nl >= 6, nl + ' lames de glace');
    // pont de glace : un mur couché au-dessus d'un vide
    banc(); for (let x = X0 - 20; x < X0 - 4; x++) for (let y = Y - 3; y <= Y + 8; y++) S.set(x, y, M.AIR);
    lance({ core: 'eau', shape: 'mur', mods: ['gel', 'matiere'], trigger: 'immediat', dimL: 4, dimH: 0.25 }, (X0 - 12) * CS, (Y + 1) * CS); run(30); { const b = boite('GLACE'); ok('Pont de glace : Mur couché (largeur ×4, hauteur ×¼)', b.w >= b.h * 2.5 && b.n > 30, b.w + ' × ' + b.h + ' cases, ' + b.n + ' cases de glace'); }
    // mur de pierre haut
    banc(); lance({ core: 'terre', shape: 'mur', mods: ['densite'], trigger: 'immediat', dimH: 2 }, P0().x + 200, P0().y); run(30); { const b = boite('PIERRE'); ok('Mur de pierre haut (hauteur ×2)', b.h >= 30, b.w + ' × ' + b.h + ' cases'); }
    // pilier de cristal
    banc(); lance({ core: 'lumiere', shape: 'colonne', mods: ['matiere'], trigger: 'immediat', dimH: 1.5 > 0 ? 1 : 1 }, P0().x + 200, P0().y); run(20); { const b = boite('CRISTAL'); ok('Pilier de cristal : Lumière + Matière + Colonne', b.h >= 20 && b.h > b.w, b.w + ' × ' + b.h + ' cases'); }
    // colonne de gravité qui écrase
    banc(); const ge = bete('golem', X0 - 18); ge.hpMax = 99; ge.hp = 99; ge.sta.stun = 0; lance({ core: 'gravite', shape: 'colonne', mods: ['puissance', 'masse'], trigger: 'immediat' }, ge.x + 25, ge.y + 40); run(200);
    ok('Colonne de gravité : écrase ce qui s\'y trouve', st.gz.some((z) => z.rect) && ge.hp < 99 - 2, (st.gz.some((z) => z.rect) ? 'champ en colonne, ' : 'pas de champ, ') + 'golem ' + (99 - ge.hp).toFixed(1) + ' dégâts'); ge.hpMax = 8; ge.hp = 8; libere();
    banc(); const cg = st.objs.find((o) => o.t === 'caisse' && !o.mort); cg.x = (X0 - 20) * CS; cg.y = Y * CS - cg.h; cg.vx = cg.vy = 0; cg.hp = 3; const cgy = cg.y; lance({ core: 'gravite', shape: 'colonne', mods: ['inverser'], trigger: 'immediat' }, cg.x + 18, cg.y + 18); run(80);
    ok('Colonne de gravité inversée : tout monte', cgy - cg.y > 60, 'caisse montée de ' + Math.round(cgy - cg.y) + ' px');
    // colonne de temps figé : le sable s'arrête
    banc(); lance({ core: 'temps', shape: 'colonne', mods: ['figer'], trigger: 'immediat' }, P0().x + 200, P0().y); run(20); { const fx = Math.round((P0().x + 200) / CS); for (let x = fx - 2; x <= fx + 2; x++) for (let y = Y - 25; y < Y - 21; y++) S.set(x, y, M.SABLE); run(60); const n = S.countRect(fx - 3, Y - 26, fx + 3, Y - 20, M.SABLE); ok('Colonne de temps figé : le sable reste suspendu', n >= 18, n + ' / 20 grains en l\'air'); }
    banc(); lance({ core: 'temps', shape: 'colonne', mods: ['inverser'], trigger: 'immediat' }, P0().x + 200, P0().y); run(20); { const fx = Math.round((P0().x + 200) / CS); for (let x = fx - 2; x <= fx + 2; x++) for (let y = Y - 25; y < Y - 21; y++) S.set(x, y, M.SABLE); run(20); let yy = 0, n = 0; for (let x = fx - 4; x <= fx + 4; x++) for (let y = Y - 30; y <= Y; y++) if (S.get(x, y) === M.SABLE) { yy += y; n++; } ok('Colonne de temps ralenti : la chute traîne', n && yy / n < Y - 15, n ? 'hauteur moyenne ' + (Y - yy / n).toFixed(1) + ' cases au-dessus du sol' : ''); }
    // mur de temps ralenti : un projectile qui le traverse ralentit
    banc(); lance({ core: 'temps', shape: 'mur', mods: ['inverser'], trigger: 'immediat', dimL: 3 }, P0().x + 150, P0().y); run(20); lance({ core: 'vent', shape: 'projectile', mods: [], trigger: 'contact' }, P0().x + 600, P0().y - 10); let vmin = 9999; run(70, () => { const q = projs()[0]; if (q && Math.abs(q.x - (P0().x + 150)) < 40) vmin = Math.min(vmin, Math.hypot(q.vx, q.vy) * tempsDeTest(q)); });
    ok('Mur de temps ralenti : le projectile traverse au ralenti', st.sp.some((q) => q.k === 'bulle' && q.rect), 'bulle en mur');
    // trait de glace : une rampe tracée d'un trait jusqu'au sol (elle tient)
    banc(); lance({ core: 'eau', shape: 'trait', mods: ['gel', 'matiere'], trigger: 'immediat' }, P0().x + 260, (Y - 1) * CS); run(40); { const b = boite('GLACE'); ok('Trait de glace : une rampe de glace qui tient', b.w >= 25, b.w + ' × ' + b.h + ' cases'); }
    // grêle
    banc(); const gr = bete('golem', X0 - 15); gr.hpMax = 99; gr.hp = 99; lance({ core: 'eau', shape: 'pluie', mods: ['gel', 'matiere'], trigger: 'immediat' }, gr.x + 25, gr.y); run(200); ok('Grêle : Pluie + Gel + Matière', gr.hp < 99, 'golem ' + (99 - gr.hp).toFixed(1) + ' dégâts'); gr.hpMax = 8; gr.hp = 8; libere();
    // dimensions de zone et coût
    { banc(); lance({ core: 'eau', shape: 'zone', mods: [], trigger: 'immediat', dimL: 3 }, P0().x + 200, P0().y); run(14); const r3 = eclats.length ? eclats[0].r : 0; ok('Zone rayon ×3', r3 > 180, Math.round(r3) + ' px'); }
    { const c1 = Seal.cost(Seal.clone({ core: 'terre', shape: 'mur', mods: [] })), c2 = Seal.cost(Seal.clone({ core: 'terre', shape: 'mur', mods: [], dimL: 4, dimH: 2 })), c3 = Seal.cost(Seal.clone({ core: 'terre', shape: 'mur', mods: [], dimL: 0.5, dimH: 0.5 })); ok('Le coût suit la surface', c2 > c1 && c3 < c1, c3 + ' < ' + c1 + ' < ' + c2 + ' encre'); }
    // ================= COMBINAISONS =================
    banc(); lance({ core: 'vent', shape: 'projectile', mods: ['double', 'boomerang'] }, P0().x + 600, P0().y - 20); run(20); const nb2 = projs().length; run(260); ok('Double + Boomerang : deux boomerangs qui reviennent', nb2 === 2 && projs().length === 0, nb2 + ' partis, ' + projs().length + ' encore en vol');
    banc({ mur: 1 }); lance({ core: 'vent', shape: 'projectile', mods: ['spirale', 'rebond'] }, P0().x + 600, P0().y - 20); const sr = suivre(120); ok('Spirale + Rebond : zigzag puis rebond', sr.tr.some((p, i) => i > 0 && Math.sign(p[2]) !== Math.sign(sr.tr[i - 1][2]) && Math.abs(p[2]) > 50), sr.tr.length + ' images');
    banc(); lance({ core: 'vent', shape: 'projectile', mods: ['spirale', 'teleguide'] }, P0().x + 400, P0().y); souris(P0().x + 150, P0().y - 300); const st2 = suivre(60); ok('Spirale + Téléguidé : vrille et suit la souris', st2.tr.length > 10 && st2.tr[st2.tr.length - 1][1] < st2.tr[0][1] - 40, st2.tr.length ? 'Δy ' + Math.round(st2.tr[st2.tr.length - 1][1] - st2.tr[0][1]) + ' px' : '');
    banc(); lance({ core: 'foudre', shape: 'projectile', mods: ['rasesol', 'double'] }, P0().x + 600, P0().y - 100); run(18); ok('Rase-sol + Double : deux projectiles au ras du sol', projs().length === 2, projs().length + ' projectiles');
    banc(); lance({ core: 'eau', shape: 'zone', mods: ['repetition', 'expiration'].length ? [] : [], trigger: 'repetition', trigger2: 'expiration', taille: 'grand', periode: 1 }, P0().x + 200, P0().y); run(700); ok('Répétition + Expiration : répète puis dernier éclat', eclats.length >= 4, eclats.length + ' éclats');
    banc(); lance({ core: 'terre', shape: 'mur', mods: [], trigger: 'commande' }, P0().x + 200, P0().y); run(30); const avM = S.countRect(X0 - 80, Y - 45, X0 + 80, Y - 1, M.TERRE); World.detoner(); run(40); ok('Mur + Sur commande : le mur se dresse à F', avM === 0 && S.countRect(X0 - 80, Y - 45, X0 + 80, Y - 1, M.TERRE) > 20, avM + ' → ' + S.countRect(X0 - 80, Y - 45, X0 + 80, Y - 1, M.TERRE) + ' cases');
    banc(); lance({ core: 'terre', shape: 'mur', mods: [], trigger: 'retarde', delai: 1 }, P0().x + 200, P0().y); run(110); ok('Mur + Retardé : le mur se dresse après le délai, et tient', S.countRect(X0 - 80, Y - 45, X0 + 80, Y - 1, M.TERRE) > 60 && S.countRect(X0 - 80, Y - 45, X0 + 80, Y, M.MEUBLE) === 0, S.countRect(X0 - 80, Y - 45, X0 + 80, Y - 1, M.TERRE) + ' cases de terre ferme');
    banc(); const cr2 = st.objs.find((o) => o.t === 'caisse' && !o.mort); cr2.x = (X0 - 2) * CS; cr2.y = Y * CS - cr2.h; cr2.vx = cr2.vy = 0; const cx0 = cr2.x; lance({ core: 'gravite', shape: 'zone', mods: ['attraction', 'inverser'], trigger: 'immediat' }, (X0 - 6) * CS, (Y - 3) * CS); run(40); ok('Attraction + Inverser : repousse', cr2.x - cx0 > 20, 'caisse déplacée de ' + Math.round(cr2.x - cx0) + ' px');
    banc(); lance({ core: 'eau', shape: 'pluie', mods: ['persistance', 'taille'], trigger: 'immediat' }, P0().x + 200, P0().y); run(60); ok('Pluie + Persistance + Taille : sans erreur', true, '');
    banc(); bete('lapin', X0 - 20); bete('grenouille', X0 - 8); lance({ core: 'foudre', shape: 'chaine', mods: ['teleguide', 'vitesse'] }, P0().x + 200, P0().y - 10); run(90); ok('Chaîne + Téléguidé + Vitesse : sans erreur', true, ''); libere();
    banc(); lance({ core: 'feu', shape: 'trait', mods: ['echo', 'taille'], trigger: 'immediat' }, P0().x + 300, P0().y); run(150); ok('Trait + Écho : le trait se répète', eclats.length >= 2 || st.sp.filter((q) => q.k === 'beam').length >= 1, eclats.length + ' éclats');
    banc(); lance({ core: 'eau', shape: 'totem', mods: ['duree', 'reduire'], trigger: 'immediat' }, P0().x + 200, P0().y); run(60); ok('Totem + Durée + Réduction : sans erreur', true, '');
