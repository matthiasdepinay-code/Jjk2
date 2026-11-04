// Mesure le temps de mise à jour et de dessin dans une scène : calme, feu, eau ou combos.
//   node tests/outils/perf.js [calme|feu|eau|combos]
const { chromium } = require('playwright');
const SCENE = process.argv[2] || 'calme';
(async () => {
  const browser = await chromium.launch(); const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
  const errors = []; page.on('pageerror', (e) => errors.push(e.message));
  await page.goto('file://' + require('path').resolve(__dirname, '..', '..', 'index.html')); await page.waitForTimeout(1500);
  await page.addStyleTag({ content: '#toasts{display:none!important}' });
  await page.evaluate(() => { game.setLook({ nom: 'P', chapeau: 1, cape: 2, acc: 0 }); }); await page.waitForTimeout(400);
  await page.evaluate(() => { UI.close(); const p = game.progress; p.cores = DATA.ESSENCES.slice(); p.shapes = Object.keys(DATA.SHAPES); p.mods = Object.keys(DATA.MODS); p.slots = 3; p.tailles = ['petit', 'moyen', 'grand']; game.goWorld(); });
  await page.waitForTimeout(600);
  await page.evaluate((SCENE) => {
    const st = World.state(), p = st.p, S = Sim, M = S.M;
    const place = (cell) => { p.x = cell * 6; let y = 0; while (!S.P[S.get(cell + 2, y)].solid) y++; p.y = y * 6 - 60; p.vx = p.vy = 0; p.ink = 9999; p.inkMax = 9999; };
    if (SCENE === 'calme' || SCENE === 'combos') place(300);
    if (SCENE === 'feu') { place(Math.round(Gen.X(170))); st.meteo.type = 'orage'; st.meteo.t = 999; for (const a of World.level().arbres.slice(0, 12)) { const sy = 120; for (let y = 60; y < 140; y++) if (S.get(a.x, y) === M.BOIS) { S.aux[y * S.W + a.x] = 150; S.touch(y * S.W + a.x); } } }
    if (SCENE === 'eau') { place(Math.round(Gen.X(275))); for (let x = p.x / 6 - 60; x < p.x / 6 + 60; x++) for (let y = 40; y < 70; y++) if (S.get(x, y) === M.AIR) S.set(x, y, M.EAU); }
    if (SCENE === 'lab') { game.goLab ? game.goLab() : null; }
    window.__t = { u: 0, d: 0, n: 0 };
    const U0 = World.update, D0 = World.draw;
    World.update = function (...a) { const t = performance.now(); const r = U0.apply(this, a); window.__t.u += performance.now() - t; window.__t.n++; return r; };
    World.draw = function (...a) { const t = performance.now(); const r = D0.apply(this, a); window.__t.d += performance.now() - t; return r; };
    if (SCENE === 'combos') { const cles = Object.keys(DATA.COMBOS); const ess = (e) => { if (DATA.CORES[e] && !DATA.CORES[e].interne) return { core: e, mod: null }; for (const a in DATA.ASPECTS) if (DATA.ASPECTS[a].devient === e) return { core: DATA.ASPECTS[a].aspect, mod: a }; return null; }; game.progress.fusion = true; game.progress.tailles = ['petit', 'moyen', 'grand']; window.__spam = setInterval(() => { const pp = World.state().p; pp.gestes = { R: null, L: null }; pp.ink = 999; const k = cles[(Math.random() * cles.length) | 0], [a, b] = k.split('|'), A = ess(a), B = ess(b); World.castSeal(Seal.clone({ taille: 'moyen', core: A.core, core2: B.core, mods: [A.mod, B.mod].filter(Boolean), shape: ['projectile', 'zone', 'mur', 'colonne', 'trait'][(Math.random() * 5) | 0], trigger: 'immediat' }), { x: pp.x + 100 + Math.random() * 400, y: pp.y + (Math.random() - 0.6) * 200 }); }, 300); }
    if (SCENE === 'eau') { window.__spam = setInterval(() => { const pp = World.state().p; pp.gestes = { R: null, L: null }; const cores = ['feu', 'eau', 'vent', 'terre', 'foudre', 'gravite']; World.castSeal(Seal.clone({ core: cores[(Math.random() * 6) | 0], shape: ['projectile', 'zone', 'pluie'][(Math.random() * 3) | 0], mods: ['taille'], trigger: 'contact' }), { x: pp.x + (Math.random() - 0.3) * 600, y: pp.y + (Math.random() - 0.5) * 300 }); }, 250); }
  }, SCENE);
  // déplacement continu
  if (SCENE !== 'lab') await page.keyboard.down('ArrowRight');
  const cdp = await page.context().newCDPSession(page);
  await cdp.send('Profiler.enable'); await cdp.send('Profiler.setSamplingInterval', { interval: 200 }); await cdp.send('Profiler.start');
  const t0 = Date.now(); await page.waitForTimeout(6000);
  const { profile } = await cdp.send('Profiler.stop');
  if (SCENE !== 'lab') await page.keyboard.up('ArrowRight');
  const tt = await page.evaluate(() => ({ ...window.__t, sp: World.state().sp.length, parts: World.state().parts.length }));
  // temps propre par fonction
  const byId = new Map(profile.nodes.map((n) => [n.id, n])); const self = new Map();
  const dts = profile.timeDeltas; let total = 0;
  profile.samples.forEach((id, i) => { const n = byId.get(id); const cf = n.callFrame; const key = (cf.functionName || '(anon)') + ' ' + cf.url.split('/').pop() + ':' + (cf.lineNumber + 1); const d = dts[i] || 0; total += d; self.set(key, (self.get(key) || 0) + d); });
  const top = [...self.entries()].sort((a, b) => b[1] - a[1]).slice(0, 28).map(([k, v]) => (v / total * 100).toFixed(1).padStart(5) + '%  ' + k);
  console.log('FEU', await page.evaluate(() => { let f = 0, b = 0, l = 0; const S = Sim; for (let i = 0; i < S.W * S.H; i++) { if (S.mat[i] === S.M.FEU) f++; else if ((S.mat[i] === S.M.BOIS || S.mat[i] === S.M.PLANTE) && S.aux[i] > 0) b++; } return f + ' feu, ' + b + ' en flammes, lumières ' + Sim.lights(World.state().cam, 1280, 720).length; }));
  console.log('SCENE', SCENE, 'frames', tt.n, 'fps≈', (tt.n / 6).toFixed(1), 'update ms', (tt.u / tt.n).toFixed(2), 'draw ms', (tt.d / tt.n).toFixed(2), 'sp', tt.sp, 'parts', tt.parts);
  console.log(top.join('\n'));
  // natifs : à qui les attribuer (fonction appelante JS)
  const parent = new Map(); for (const n of profile.nodes) for (const c of n.children || []) parent.set(c, n.id);
  const att = new Map(); profile.samples.forEach((id, i) => { let n = byId.get(id); const nm = n.callFrame.functionName; if (!['drawImage', 'fillRect', 'stroke', 'fill', 'save', '(program)'].includes(nm)) return; let q = n, depth = 0; while (q && (!q.callFrame.url || q.callFrame.url === '') && depth < 10) { q = byId.get(parent.get(q.id)); depth++; } if (!q) return; const key = nm + ' ← ' + (q.callFrame.functionName || 'anon') + ' ' + q.callFrame.url.split('/').pop() + ':' + (q.callFrame.lineNumber + 1); att.set(key, (att.get(key) || 0) + (dts[i] || 0)); });
  console.log('--- natifs par appelant'); console.log([...att.entries()].sort((a, b) => b[1] - a[1]).slice(0, 18).map(([k, v]) => (v / total * 100).toFixed(1).padStart(5) + '%  ' + k).join('\n'));
  console.log('ERR', errors.slice(0, 3));
  await browser.close();
})();
