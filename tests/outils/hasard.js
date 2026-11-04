// Lance des centaines de sceaux tirés au hasard (formes, modificateurs, déclencheurs, dimensions) et relève la moindre erreur.
//   node tests/outils/hasard.js [nombre=400] [graine=1]
// Fuzz : sceaux au hasard, actions au hasard, vérifications d'intégrité
const { chromium } = require('playwright');
const N = +(process.argv[2] || 600), SEED = +(process.argv[3] || 1);
(async () => {
  const browser = await chromium.launch(); const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
  const errors = []; page.on('pageerror', (e) => errors.push(e.message + ' | ' + (e.stack || '').split('\n').slice(1, 3).join(' / '))); page.on('console', (m) => { if (m.type() === 'warning' && !/monde illisible/.test(m.text())) errors.push('warn: ' + m.text().slice(0, 240)); });
  page.on('console', (m) => { if (m.type() === 'error' || m.type() === 'warning') errors.push('CONSOLE ' + m.type() + ': ' + m.text()); });
  await page.goto('file://' + require('path').resolve(__dirname, '..', '..', 'index.html')); await page.waitForTimeout(1500);
  await page.evaluate(() => { game.setLook({ nom: 'Fuzz', chapeau: 1, cape: 2, acc: 0 }); }); await page.waitForTimeout(400);
  await page.evaluate(() => { UI.close(); const p = game.progress; p.cores = DATA.ESSENCES.slice(); p.shapes = Object.keys(DATA.SHAPES); p.mods = Object.keys(DATA.MODS); p.triggers = Object.keys(DATA.TRIGGERS); p.slots = 3; p.tailles = ['petit', 'moyen', 'grand']; p.fusion = true; p.filtres = Object.keys(DATA.FILTRES); p.cibles = Object.keys(DATA.CIBLES); p.deuxMains = true; for (const id in DATA.ENCRES) game.inv.encres[id] = 50; game.goWorld(); });
  await page.waitForTimeout(400);
  const res = await page.evaluate(([N, SEED]) => {
    let r = SEED * 9301 + 49297; const rnd = () => { r = (r * 9301 + 49297) % 233280; return r / 233280; };
    const pick = (a) => a[Math.floor(rnd() * a.length)];
    const st = World.state(); const W = Sim.W * 6;
    const ES = DATA.ESSENCES, SH = Object.keys(DATA.SHAPES), MO = Object.keys(DATA.MODS).filter((m) => m !== 'sous'), TR = Object.keys(DATA.TRIGGERS), FI = Object.keys(DATA.FILTRES), CI = Object.keys(DATA.CIBLES), TA = ['petit', 'moyen', 'grand'], EN = Object.keys(DATA.ENCRES);
    const probs = []; const note = (m) => { if (probs.length < 60) probs.push(m); };
    const bad = (v) => typeof v !== 'number' || !isFinite(v);
    const run = (n) => { for (let i = 0; i < n; i++) World.update(1 / 60, window.__inp, { x: st.p.x + 100, y: st.p.y }); };
    let maxSp = 0, maxParts = 0, t0 = performance.now(), casts = 0;
    for (let it = 0; it < N; it++) {
      // téléportation de temps en temps
      if (it % 25 === 0) { const x = 60 + rnd() * (W - 120); let y = 0; const cx = Math.floor(x / 6); while (y < 255 && !Sim.P[Sim.get(cx, y)].solid) y++; st.p.x = x; st.p.y = y * 6 - 60; st.p.vx = st.p.vy = 0; st.cam.x = x - 640; st.cam.y = st.p.y - 400; }
      st.p.ink = 9999; st.p.inkMax = 9999; if (st.p.hp < 3) st.p.hp = st.p.hpMax;
      const taille = pick(TA);
      const s = { taille, core: pick(ES), core2: rnd() < 0.3 ? pick(ES) : null, shape: pick(SH), mods: [0, 1, 2, 3, 4].map(() => (rnd() < 0.6 ? pick(MO) : null)), trigger: pick(TR), trigger2: rnd() < 0.3 ? pick(TR) : null, filtre: rnd() < 0.2 ? pick(FI) : null, cible: rnd() < 0.2 ? pick(CI) : null, delai: pick([1, 2]), periode: pick([1, 2]), encre: rnd() < 0.15 ? pick(EN) : null, dimL: rnd() < 0.4 ? pick(DATA.DIM_VALS) : 1, dimH: rnd() < 0.4 ? pick(DATA.DIM_VALS) : 1 };
      if (rnd() < 0.08) s.mods[0] = { sub: { core: pick(ES), shape: pick(['projectile', 'zone']), mods: [pick(MO), null, null], trigger: 'contact' } };
      const aim = { x: st.p.x + (rnd() - 0.5) * 700, y: st.p.y + (rnd() - 0.5) * 500 };
      try {
        st.p.gestes = { R: null, L: null };
        const ok = World.castSeal(Seal.clone(s), aim, rnd() < 0.2, rnd() < 0.3 ? rnd() : 0, rnd() < 0.5 ? 'R' : 'L'); if (ok) casts++;
      } catch (e) { note('cast ' + JSON.stringify(s) + ' → ' + e.message + ' ' + (e.stack || '').split('\n')[1]); }
      try { run(4 + Math.floor(rnd() * 10)); } catch (e) { note('update après ' + JSON.stringify({ core: s.core, core2: s.core2, shape: s.shape, mods: s.mods, trig: s.trigger }) + ' → ' + e.message + ' ' + (e.stack || '').split('\n')[1]); }
      if (rnd() < 0.05) { try { World.detoner(); } catch (e) { note('detoner ' + e.message); } }
      if (rnd() < 0.03) { try { World.lancerPrise(); } catch (e) { note('prise ' + e.message); } }
      if (rnd() < 0.02) { try { World.interact(); } catch (e) { note('interact ' + e.message); } }
      // intégrité
      const p = st.p; if (bad(p.x) || bad(p.y) || bad(p.vx) || bad(p.vy) || bad(p.hp) || bad(p.ink)) { note('joueur NaN après ' + JSON.stringify(s)); p.x = 600; p.y = 600; p.vx = p.vy = 0; p.hp = p.hpMax; }
      for (const c of st.crs) if (bad(c.x) || bad(c.y) || bad(c.vx) || bad(c.vy) || bad(c.hp) || bad(c.w) || bad(c.h)) { note('créature ' + c.t + ' NaN après ' + JSON.stringify({ core: s.core, mods: s.mods, shape: s.shape })); c.x = c.x0 || 600; c.y = 200; c.vx = c.vy = 0; c.hp = c.hpMax || 1; if (bad(c.w)) c.w = 20; if (bad(c.h)) c.h = 20; }
      for (const o of st.objs) if (bad(o.x) || bad(o.y) || (o.vx !== undefined && bad(o.vx))) { note('objet ' + o.t + ' NaN'); o.x = 600; o.y = 200; o.vx = o.vy = 0; }
      for (const q of st.sp) if ((q.x !== undefined && bad(q.x)) || (q.y !== undefined && bad(q.y))) { note('sort ' + q.k + ' NaN'); q.mort = true; }
      if (st.sp.length > maxSp) { window.__pic = {}; for (const q of st.sp) window.__pic[q.k] = (window.__pic[q.k] || 0) + 1; } maxSp = Math.max(maxSp, st.sp.length); maxParts = Math.max(maxParts, st.parts.length);
    }
    const kinds = {}; for (const q of st.sp) kinds[q.k] = (kinds[q.k] || 0) + 1;
    // sauvegarde et rechargement
    let save = null; try { const d = World.serialize(); save = JSON.stringify(d).length; } catch (e) { note('serialize ' + e.message); }
    return { pic: window.__pic, casts, ms: Math.round(performance.now() - t0), maxSp, maxParts, finSp: st.sp.length, kinds, crs: st.crs.length, crsVivantes: st.crs.filter((c) => c.hp > 0).length, objs: st.objs.length, save, probs, control: !!st.control, gz: st.gz.length, marques: st.marques.length, portails: st.portails.length };
  }, [N, SEED]);
  // labo, panneaux, sauvegarde, retour
  try {
    await page.evaluate(() => { game.save(); game.goLab ? game.goLab() : null; });
    await page.waitForTimeout(300);
    for (const pn of ['seal', 'cauldron', 'grimoire', 'help', 'options', 'courrier']) { await page.evaluate((pn) => { try { UI.openPanel(pn); } catch (e) { window.__e = (window.__e || '') + pn + ':' + e.message; } }, pn); await page.waitForTimeout(120); await page.evaluate(() => UI.close()); }
    for (const t of ['decouvertes', 'glyphes', 'recettes', 'ingredients', 'intuitions', 'bestiaire', 'pages', 'defis', 'carte', 'lettres', 'journal']) { await page.evaluate((t) => { UI.openPanel('grimoire'); UI.grimTab(t); }, t); await page.waitForTimeout(80); }
    await page.evaluate(() => UI.close());
    await page.reload(); await page.waitForTimeout(1500);
    await page.evaluate(() => { UI.close(); game.goWorld(); }); await page.waitForTimeout(800);
    res.apresReload = await page.evaluate(() => ({ crs: World.state().crs.length, objs: World.state().objs.length, sceaux: game.seals.length, e: window.__e || null }));
  } catch (e) { res.probs.push('labo/reload ' + e.message); }
  console.log(JSON.stringify(res, null, 1));
  console.log('ERRORS (' + errors.length + '):\n' + ([...new Set(errors)].slice(0, 40).join('\n') || 'none'));
  await browser.close();
})();
