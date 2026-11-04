// Joue longtemps en boucle et suit la mémoire, pour repérer les fuites.
//   node tests/outils/endurance.js
const { chromium } = require('playwright');
(async () => {
  const browser = await chromium.launch({ args: ['--js-flags=--expose-gc'] }); const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
  const errors = []; page.on('pageerror', (e) => errors.push(e.message));
  await page.goto('file://' + require('path').resolve(__dirname, '..', '..', 'index.html')); await page.waitForTimeout(1500);
  await page.evaluate(() => { game.setLook({ nom: 'P', chapeau: 1, cape: 2, acc: 0 }); }); await page.waitForTimeout(400);
  await page.evaluate(() => { UI.close(); const p = game.progress; p.cores = DATA.ESSENCES.slice(); p.shapes = Object.keys(DATA.SHAPES); p.mods = Object.keys(DATA.MODS); game.goWorld(); }); await page.waitForTimeout(500);
  const mem = () => page.evaluate(() => { window.gc(); return Math.round(performance.memory.usedJSHeapSize / 1e6); });
  const res = [await mem()];
  for (let tour = 0; tour < 6; tour++) {
    await page.evaluate(() => { const st = World.state(); const cores = ['feu', 'eau', 'vent', 'terre', 'foudre', 'gravite', 'temps', 'lumiere']; for (let i = 0; i < 1800; i++) { if (i % 20 === 0) { st.p.ink = 999; st.p.gestes = { R: null, L: null }; World.castSeal(Seal.clone({ core: cores[(Math.random() * 8) | 0], shape: ['projectile', 'zone'][(Math.random() * 2) | 0], mods: [], trigger: 'contact' }), { x: st.p.x + (Math.random() - 0.5) * 600, y: st.p.y - 50 }); } if (i % 600 === 0) { st.p.x = 200 + Math.random() * (Sim.W * 6 - 400); st.p.y = 300; } World.update(1 / 60, window.__inp, { x: st.p.x + 100, y: st.p.y }); } });
    res.push(await mem());
  }
  const st = await page.evaluate(() => ({ sp: World.state().sp.length, parts: World.state().parts.length, crs: World.state().crs.length, pickups: World.state().pickups.length, eclairs: World.state().eclairs.length, hist: (World.state().hist || []).length, obsT: Object.keys(World.state().obsT || {}).length }));
  console.log('tas (Mo) au fil des tours :', res.join(' → '), JSON.stringify(st), 'ERR', errors.slice(0, 3));
  await browser.close();
})();
