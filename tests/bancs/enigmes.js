// Banc d'essai : les énigmes de fusion (stèles et carillon)
    const steles = st.objs.filter((o) => o.t === 'stele');
    ok('Quatre stèles de fusion dans le monde', steles.length === 4, steles.map((o) => o.nom).join(', '));
    const coffreDe = (o) => st.objs.find((q) => q.t === 'coffre' && q.canal === o.canal);
    const sceau = (cle) => { const R = DATA.recetteCombo(cle); return Object.assign({}, R, { taille: R.core3 ? 'grand' : 'moyen', shape: 'zone', trigger: 'immediat' }); };
    const pres = (o) => { const p = st.p; p.x = o.x - 140; p.y = o.y + o.h - p.h - 2; p.vx = p.vy = 0; p.ink = 9999; p.inkMax = 9999; p.hp = p.hpMax; st.cam.x = p.x - 500; st.cam.y = p.y - 380; run(10); p.x = o.x - 140; p.y = o.y + o.h - p.h - 2; };
    const vise = (o) => ({ x: o.x + o.w / 2 + 30, y: o.y + o.h / 2 });
    // une mauvaise fusion ne réveille rien
    { const o = steles[0]; pres(o); World.phen.reset(); const v = vise(o); lance(sceau('feu|vent'), v.x, v.y); run(90); ok('Une autre fusion ne réveille pas la stèle', !o.grave && !coffreDe(o).ouvert, o.nom + (o.grave ? ' éveillée' : ' endormie')); }
    for (const o of steles) {
      pres(o); World.phen.reset(); st.p.gestes = { R: null, L: null };
      const v = vise(o), cle = o.veut[0];
      lance(sceau(cle), v.x, v.y); run(150);
      const c = coffreDe(o);
      ok(o.nom + ' s\'éveille avec ' + DATA.comboInfo(cle).nom, o.grave && c && c.ouvert, (o.grave ? 'éveillée' : 'endormie') + ', coffre ' + (c && c.ouvert ? 'ouvert' : 'fermé'));
      World.phen.reset();
    }
    // l'autre solution du passeur (Air solide) marche aussi, sur une stèle neuve
    { const o = steles.find((q) => q.veut.length >= 3); o.grave = false; o.eveil = 0; pres(o); World.phen.reset(); const v = vise(o); lance(sceau(o.veut[1]), v.x, v.y); run(120); ok('Plusieurs fusions peuvent ouvrir la même stèle', o.grave && o.par === o.veut[1], o.par || 'rien'); World.phen.reset(); }
    // l'éveil est gardé à la sauvegarde
    { const d = JSON.parse(JSON.stringify(World.serialize())); World.reset(); World.build(game, d); st = World.state(); run(3); const s2 = st.objs.filter((o) => o.t === 'stele'); ok('Les stèles éveillées le restent après chargement', s2.length === 4 && s2.every((o) => o.grave && o.eveil > 0.9), s2.filter((o) => o.grave).length + ' / ' + s2.length); }
