// Fait traverser toute la carte à l'apprenti(e), de gauche à droite, et relève les erreurs.
//   node tests/outils/traversee.js
const { chromium } = require('playwright');
const OUT = require('path').resolve(__dirname, '..', 'captures') + '/'; require('fs').mkdirSync(OUT, { recursive: true });
(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
  const errors = [];
  page.on('pageerror', (e) => errors.push('PAGEERROR: ' + e.message + '\n' + e.stack));
  await page.goto('file://' + require('path').resolve(__dirname, '..', '..', 'index.html'));
  await page.waitForTimeout(2000);
  await page.evaluate(() => { game.setLook({ nom: 'Bot', chapeau: 0, cape: 0, acc: 0 }); });
  await page.waitForTimeout(900);
  await page.evaluate(() => { UI.close(); game.goWorld(); });
  await page.waitForTimeout(800);
  let maxX = 0, stuck = 0, lastX = 0;
  await page.keyboard.down('ArrowRight');
  for (let i = 0; i < 1000; i++) {
    await page.keyboard.down('Space'); setTimeout(() => page.keyboard.up('Space'), 260);
    await page.evaluate(() => { const s = World.state(); s.p.hp = 10; });
    await page.waitForTimeout(300);
    const r = await page.evaluate(() => { const p = World.state().p; return { x: p.x, y: p.y, liq: p.liq }; });
    maxX = Math.max(maxX, r.x);
    if (Math.abs(r.x - lastX) < 3) stuck++; else stuck = 0;
    lastX = r.x;
    if (i % 100 === 0) await page.screenshot({ path: OUT + 'bot2-' + String(i).padStart(3, '0') + '.png' });
    if (r.x > 10700) break;
    if (stuck > 20) { await page.screenshot({ path: OUT + 'bot2-stuck.png' }); console.log('STUCK at x=' + Math.round(r.x) + ' (cell ' + Math.round(r.x / 6) + ') y=' + Math.round(r.y / 6)); break; }
  }
  await page.keyboard.up('ArrowRight');
  console.log('maxX=' + Math.round(maxX) + ' cell ' + Math.round(maxX / 6));
  console.log('ERRORS:\n' + (errors.join('\n') || 'none'));
  await browser.close();
})();
