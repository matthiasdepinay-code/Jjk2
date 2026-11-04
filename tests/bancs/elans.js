// Banc d'essai : les élans, ce que chaque essence fait de toi sur soi (immédiat, maintenu, teinté, ciblé)
    const EL = World.elans, inp = window.__inp, m = game.inp.mouse;
    const soi = (core, o = {}) => Object.assign({ taille: o.core2 || o.core3 || o.cible ? 'grand' : 'moyen', core, shape: 'soi', mods: [null, null, null, null, null], trigger: 'immediat' }, o);
    const C = () => ({ x: st.p.x + st.p.w / 2, y: st.p.y + st.p.h / 2 });
    const viseRel = (dx, dy) => { const c = C(); souris(c.x + dx, c.y + dy); return { x: c.x + dx, y: c.y + dy }; };
    // lancé, puis on attend la fin du tracé du sceau
    const elan = (seal, dx, dy) => { const a = viseRel(dx, dy); st.p.gestes = { R: null, L: null }; World.castSeal(Seal.clone(seal), a, true, 0); let k = 0; while (st.p.gestes.R && k++ < 90) run(1); };
    const sol = () => { banc(); run(10); };
    // ---------- les élans immédiats ----------
    { sol(); const c0 = C(), hp0 = st.p.hp; elan(soi('feu'), 200, -120); run(12); const c1 = C(); run(120); const c2 = C();
      ok('Feu : une gerbe de flammes te propulse, et l\'on retombe sans se faire mal', c1.x - c0.x > 30 && c1.y < c0.y - 20 && st.p.hp >= hp0 - 0.01, 'poussé(e) de ' + Math.round(c1.x - c0.x) + ' px, monté(e) de ' + Math.round(c0.y - c1.y) + ' px, vitalité ' + st.p.hp.toFixed(1) + ' / ' + hp0.toFixed(1)); }
    { sol(); const c0 = C(); elan(soi('eau'), 200, -60); run(14); const c1 = C(); const eau = S.countRect(X0 - 70, Y - 20, X0 - 30, Y, M.EAU);
      ok('Eau : un jet d\'eau te pousse et laisse de l\'eau derrière', c1.x - c0.x > 25 && eau > 0 && st.p.sta.wet > 0, Math.round(c1.x - c0.x) + ' px, ' + eau + ' cases d\'eau'); }
    { sol(); const c0 = C(); elan(soi('vent'), 220, -40); run(16); const c1 = C();
      ok('Vent : une bourrasque te jette vers la souris, et tu planes', c1.x - c0.x > 30 && st.p.sta.glide > 0, Math.round(c1.x - c0.x) + ' px'); }
    { sol(); const c0 = C(); elan(soi('terre'), 0, -200); let haut = 0; run(40, () => { haut = Math.max(haut, c0.y - C().y); }); const pil = S.countRect(Math.floor(st.p.x / CS) - 2, Y - 40, Math.floor((st.p.x + st.p.w) / CS) + 2, Y, M.TERRE);
      ok('Terre : un pilier surgit sous tes pieds et te soulève', haut > 40 && pil > 10, 'monté(e) de ' + Math.round(haut) + ' px, pilier de ' + pil + ' cases'); }
    { sol(); const l = bete('limace', X0 - 44); l.hp = l.hpMax = 30; st.p.y -= 160; st.p.vy = 0; run(1); const hp0 = st.p.hp; elan(soi('terre'), 0, 200); run(60); const d = 30 - l.hp; libere();
      ok('Terre en l\'air, vers le bas : tu t\'abats et le choc frappe autour', d > 0.5 && st.p.onGround && st.p.hp >= hp0 - 0.01, 'limace −' + d.toFixed(1)); }
    { banc({ mur: -10 }); run(10); st.p.hp = st.p.hpMax - 5; const hp0 = st.p.hp, c0 = C(); elan(soi('vie'), (X0 - 10) * CS - c0.x, -30); run(40); const c1 = C(); const plantes = S.countRect(X0 - 18, Y - 30, X0 - 10, Y, M.PLANTE);
      ok('Vie : une liane s\'accroche au mur visé et t\'y emporte ; la vie te répare', c1.x - c0.x > 150 && plantes > 3 && st.p.hp > hp0, Math.round(c1.x - c0.x) + ' px, ' + plantes + ' cases de liane'); }
    { sol(); const l = bete('limace', X0 - 20); l.sta.stun = 0; const c0 = C(); elan(soi('lumiere'), 250, 0); run(2); const c1 = C(); const vu = l.sta.stun > 0; libere();
      ok('Lumière : tu files en un rayon, aussitôt, et aveugles ce que tu traverses', c1.x - c0.x > 150 && vu, Math.round(c1.x - c0.x) + ' px en 2 images'); }
    { sol(); const l = bete('limace', X0 - 15); l.hp = l.hpMax = 30; const c0 = C(); elan(soi('foudre'), 280, -6); run(14); const c1 = C(); const d = 30 - l.hp; libere();
      ok('Foudre : un éclair, et tu y es ; ce que tu traverses est foudroyé', c1.x - c0.x > 180 && d > 1, Math.round(c1.x - c0.x) + ' px en 14 images, limace −' + d.toFixed(1)); }
    { banc({ mur: 0 }); run(10); const c0 = C(); elan(soi('portail'), 380, 0); run(2); const c1 = C();
      ok('Espace : tu paraîs là où tu vises, même derrière un mur', c1.x > X0 * CS + 12 && c1.x - c0.x > 180, Math.round(c1.x - c0.x) + ' px, mur franchi'); }
    { sol(); const l = bete('limace', X0 - 10); const c0 = C(), l0 = { x: l.x + l.w / 2 }; elan(soi('portail'), l0.x - c0.x, (l.y + l.h / 2) - c0.y); run(2); const c1 = C(); const lx = l.x + l.w / 2; libere();
      ok('Espace sur une bête : vous échangez vos places', Math.abs(c1.x - l0.x) < 30 && Math.abs(lx - c0.x) < 30, 'toi ' + Math.round(c1.x - c0.x) + ' px, la limace ' + Math.round(lx - l0.x) + ' px'); }
    { sol(); const l = bete('limace', X0 + 10); l.sta.stun = 0; const c0 = C(); elan(soi('esprit'), (l.x + l.w / 2) - c0.x, (l.y + l.h / 2) - c0.y); run(2); const pris = st.control && st.control.c === l; World.releaseControl(); libere();
      ok('Esprit sur une bête : tu entres dans sa tête', pris); }
    { sol(); const c0 = C(); elan(soi('esprit'), 300, -100); run(3); const e = EL.esprit, ex = e && e.x; run(20); const ex2 = EL.esprit && EL.esprit.x;
      ok('Esprit vers le vide : ton esprit s\'élance hors du corps, que tu laisses', !!e && ex2 > ex && Math.abs(C().x - c0.x) < 5, e ? 'esprit à ' + Math.round(ex2 - c0.x) + ' px' : 'pas d\'esprit'); run(60); }
    { banc({ mur: -30 }); run(10); elan(soi('transmutation'), 0, -10); run(2); inp.right = true; run(80); inp.right = false; const c1 = C(); run(400); const coince = S.rectBlocked(st.p);
      ok('Transmutation : sable fin, tu passes à travers le mur ; à la fin, tu n\'y restes pas pris(e)', c1.x > (X0 - 28) * CS + 14 && !coince, 'passé(e) à ' + Math.round(c1.x - (X0 - 28) * CS) + ' px derrière le mur'); }
    { sol(); st.p.y -= 150; st.p.vy = 0; run(1); elan(soi('contre'), 0, -10); const y0 = st.p.y; run(25); const dy = st.p.y - y0;
      ok('Contre-sort : tout s\'arrête, tu restes suspendu(e) un instant, un miroir te garde', Math.abs(dy) < 12 && st.p.sta.miroir > 0, 'bougé(e) de ' + Math.round(dy) + ' px en 25 images'); run(120); }
    { sol(); const GD = World.gardiens, l = bete('limace', X0 - 10); l.hp = l.hpMax = 30; elan(soi('contre'), 0, -10); const c = C();
      GD.tirs.push({ type: 'orbe', x: c.x + 120, y: (Y - 2) * CS, vx: -330, vy: 0, g: 0, r: 7, life: 2.4 }); const hp0 = st.p.hp; run(80); const d = 30 - l.hp; libere();
      ok('Le miroir du Contre-sort renvoie le tir d\'un gardien, qui frappe une bête derrière', st.p.hp >= hp0 - 0.01 && d > 0.5, 'apprenti(e) ' + (st.p.hp >= hp0 - 0.01 ? 'indemne' : 'touché(e)') + ', limace −' + d.toFixed(1)); run(60); }
    // ---------- le cercle décide ----------
    { sol(); const c0 = C(); elan(soi('foudre', { mods: ['portee', 'puissance', null, null, null] }), 600, -6); run(20); const loin = C().x - c0.x; sol(); const c2 = C(); elan(soi('foudre'), 600, -6); run(20); const pres = C().x - c2.x;
      ok('Portée et Puissance : l\'éclair va plus loin', loin > pres * 1.3, Math.round(pres) + ' px → ' + Math.round(loin) + ' px'); }
    { sol(); const s = soi('foudre', { mods: ['rafale', null, null, null, null] }); const ink0 = st.p.ink; elan(s, 200, -6); run(20); const n = st.p.avance && st.p.avance.n; const ink1 = st.p.ink;
      st.p.gestes = { R: null, L: null }; const a = viseRel(200, -6); World.castSeal(Seal.clone(s), a, false, 0); const g = st.p.gestes.R, gratuit = st.p.ink === ink1, vite = g && g.t < 0.01; run(20);
      ok('Rafale : des élans d\'avance, relancés aussitôt et sans encre', n === 2 && gratuit && vite, n + ' élans d\'avance ; relance ' + (gratuit ? 'gratuite' : 'payée') + ', ' + (vite ? 'instantanée' : 'tracée')); }
    { sol(); const l = bete('limace', X0 - 5); l.hp = l.hpMax = 30; l.sta.burn = 0; elan(soi('foudre', { core2: 'feu' }), 280, -6); run(14); const brule = l.sta.burn > 0; libere();
      ok('Une seconde essence teinte l\'élan : l\'éclair teinté de Feu enflamme ce qu\'il traverse', brule); }
    { sol(); const c0 = C(); elan(soi('foudre', { core2: 'vent' }), 260, -6); run(20); const plane = st.p.sta.glide > 0; const ph = World.phen.liste.length; World.phen.reset();
      ok('Une fusion sur soi est un mélange : Foudre et Vent, un éclair puis le vol plané', C().x - c0.x > 150 && plane, Math.round(C().x - c0.x) + ' px, ' + (plane ? 'plane' : 'tombe') + (ph ? ', le phénomène suit' : '')); }
    { sol(); const l = bete('limace', X0 + 10); const c0 = C(); elan(soi('foudre', { cible: 'creature' }), 0, -200); run(20); const d = Math.abs(C().x - (l.x + l.w / 2)); libere();
      ok('Une cible dirige l\'élan : l\'éclair file vers la bête la plus proche, pas vers la souris', d < 60 && C().x - c0.x > 100, 'arrivé(e) à ' + Math.round(d) + ' px de la limace'); }
    { sol(); const c0 = C(); st.marques.push({ x: c0.x + 900, y: c0.y - 20, t: 0 }); elan(soi('portail', { cible: 'marque' }), 0, -100); run(2); const d = Math.abs(C().x - (c0.x + 900)); st.marques = [];
      ok('Espace, cible Marque : tu reviens à ta marque, même au-delà de la portée', d < 60, 'à ' + Math.round(d) + ' px de la marque'); }
    // ---------- les élans maintenus ----------
    const tenir = (seal, dx, dy, n, cb) => { const a = viseRel(dx, dy); m.down = true; st.p.gestes = { R: null, L: null }; World.castSeal(Seal.clone(Object.assign(seal, { trigger: 'tenu' })), a, true, 0); run(n, () => { viseRel(dx, dy); if (cb) cb(); }); };
    const lacher = (n = 5) => { m.down = false; run(n); };
    { sol(); const c0 = C(); tenir(soi('feu'), 60, -300, 70); const monte = c0.y - C().y, actifT = !!EL.tenu; lacher(); const fini = !EL.tenu;
      ok('Feu maintenu : des flammes sous les pieds, tu voles tant que tu tiens', monte > 120 && actifT && fini, 'monté(e) de ' + Math.round(monte) + ' px'); run(120); }
    { sol(); const c0 = C(); tenir(soi('vent'), 300, -200, 70); const d = Math.hypot(C().x - c0.x, C().y - c0.y); lacher();
      ok('Vent maintenu : le vent te porte où pointe la souris', d > 150, Math.round(d) + ' px'); run(120); }
    { sol(); for (let x = X0 - 70; x <= X0 - 30; x++) for (let y = Y + 1; y <= Y + 8; y++) S.set(x, y, M.TERRE); const avant = S.countRect(X0 - 70, Y + 1, X0 - 30, Y + 8, M.AIR); tenir(soi('terre'), 40, 200, 60); const apres = S.countRect(X0 - 70, Y + 1, X0 - 30, Y + 8, M.AIR); lacher();
      ok('Terre maintenue : tu creuses comme une taupe', apres - avant > 30, (apres - avant) + ' cases creusées'); run(60); }
    { sol(); const c0 = C(); tenir(soi('esprit'), 250, -60, 50); const e = EL.esprit, d = e ? Math.hypot(e.x - c0.x, e.y - c0.y) : 0, corps = Math.abs(C().x - c0.x) < 5; lacher(); const revenu = !EL.esprit;
      ok('Esprit maintenu : ton esprit sort, tu le promènes, il revient quand tu lâches', d > 100 && corps && revenu, 'esprit à ' + Math.round(d) + ' px'); }
    { banc({ mur: 0 }); run(10); const c0 = C(); tenir(soi('portail'), 240, 0, 20); const vu = !!EL.tenu; lacher(3); const c1 = C();
      ok('Espace maintenu : tu vises où paraître, tu lâches, tu y es', vu && c1.x - c0.x > 180, Math.round(c1.x - c0.x) + ' px'); }
    { sol(); tenir(soi('temps'), 100, 0, 30); const b = st.sp.find((q) => q.k === 'bulle' && q.mode === 'lent' && q.suit); lacher(30); const fin = !st.sp.some((q) => q.k === 'bulle' && q.suit && !q.mort);
      ok('Temps maintenu : une bulle de lenteur te suit ; tu lâches, elle s\'en va', !!b && fin); }
    { sol(); const c0 = C(); tenir(soi('lumiere'), 300, -100, 40); const d = Math.hypot(C().x - c0.x, C().y - c0.y), inv = st.p.inv > 0; lacher();
      ok('Lumière maintenue : tu deviens lumière, intouchable, et tu files', d > 150 && inv, Math.round(d) + ' px'); run(120); }
    { sol(); const c0 = C(); tenir(soi('foudre'), 300, -10, 50); const d = C().x - c0.x; lacher();
      ok('Foudre maintenue : une tempête d\'éclairs, de bond en bond', d > 250, Math.round(d) + ' px'); run(60); }
    { const ink0 = st.p.ink; sol(); st.p.ink = 1; tenir(soi('vent'), 0, -300, 200); const fini = !EL.tenu; m.down = false; run(60);
      ok('Un élan maintenu boit l\'encre : à sec, il retombe', fini); st.p.ink = 9999; }
    // ---------- la table ----------
    { const I = (s) => Seal.inutiles(Seal.clone(s)).map((q) => q.sid); const a = I(soi('foudre', { mods: ['portee', 'rafale', 'teleguide', null, null], cible: 'creature' })), b = I(soi('feu', { mods: ['portee', null, null, null, null] })), c = I({ taille: 'grand', core: 'feu', shape: 'aura', mods: [null, null, null, null, null], cible: 'creature' });
      ok('À la table, Portée, Rafale, Téléguidé et cible comptent sur soi quand l\'élan s\'en sert', !a.length && b.includes('mod0') && c.includes('cible'), 'foudre : ' + (a.join() || 'tout sert') + ' ; feu : ' + b.join() + ' ; aura : ' + c.join()); }
