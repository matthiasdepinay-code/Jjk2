'use strict';
// Vérifie les commandes tactiles sur un téléphone simulé (paysage, écran tactile), avec de vrais
// événements tactiles multi-doigts envoyés par le protocole de Chrome.
//   node tests/outils/tactile.js [--capture]
const path = require('path');
const { chromium } = require('playwright');
(async () => {
  const browser = await chromium.launch();
  const ctx = await browser.newContext({ viewport: { width: 844, height: 390 }, hasTouch: true, isMobile: true, deviceScaleFactor: 2 });
  const page = await ctx.newPage(); const errors = []; page.on('pageerror', (e) => errors.push(e.message));
  await page.goto('file://' + path.resolve(__dirname, '..', '..', 'index.html')); await page.waitForTimeout(1500);
  await page.addStyleTag({ content: '#toasts{display:none!important}' });
  await page.evaluate(() => { game.setLook({ nom: 'P', chapeau: 1, cape: 2, acc: 0 }); UI.close(); const p = game.progress; p.deuxMains = true; game.goWorld(); });
  await page.waitForTimeout(500);
  const cdp = await ctx.newCDPSession(page);
  const touch = (type, pts) => cdp.send('Input.dispatchTouchEvent', { type, touchPoints: pts.map(([x, y, id]) => ({ x, y, id, radiusX: 4, radiusY: 4, force: 1 })) });
  const centre = (sel) => page.evaluate((s) => { const r = document.querySelector(s).getBoundingClientRect(); return [r.left + r.width / 2, r.top + r.height / 2]; }, sel);
  const etat = () => page.evaluate(() => { const p = World.state().p; return { x: p.x, y: p.y, vy: p.vy, ink: p.ink, sp: World.state().sp.length, droite: game.inp ? game.inp.right : null }; });
  const res = []; const ok = (nom, pass, detail) => { res.push(pass); console.log((pass ? '  ✓ ' : '  ✗ ') + nom + (detail ? '  — ' + detail : '')); };
  ok('Le mode tactile s\'active et ses commandes s\'affichent', await page.evaluate(() => document.body.classList.contains('tactile') && getComputedStyle(document.getElementById('tactile')).display !== 'none'));
  // joystick vers la droite
  const [jx, jy] = await centre('#joy');
  let a = await etat(); await touch('touchStart', [[jx, jy, 1]]); await touch('touchMove', [[jx + 60, jy, 1]]); await page.waitForTimeout(600);
  let b = await etat(); await touch('touchEnd', []); await page.waitForTimeout(100); const c = await etat();
  ok('Le joystick fait marcher, et lâché, on s\'arrête', b.x - a.x > 40 && c.droite === false, 'avancé de ' + Math.round(b.x - a.x) + ' px');
  // saut
  const [sx, sy] = await centre('[data-t="saut"]'); a = await etat(); await touch('touchStart', [[sx, sy, 2]]); await page.waitForTimeout(120); b = await etat(); await touch('touchEnd', []); await page.waitForTimeout(400);
  ok('Le bouton Sauter fait sauter', b.y < a.y - 4, 'monté de ' + Math.round(a.y - b.y) + ' px');
  // un doigt sur l'écran lance le sceau choisi
  await page.evaluate(() => { const p = World.state().p; p.ink = p.inkMax; game.selected = 0; });
  a = await etat(); const [gx, gy] = [620, 160];
  await touch('touchStart', [[gx, gy, 3]]); await page.waitForTimeout(250); await touch('touchEnd', []); await page.waitForTimeout(900); b = await etat();
  ok('Toucher l\'écran vise et lance le sceau', b.ink < a.ink - 0.5, 'encre ' + a.ink.toFixed(1) + ' → ' + b.ink.toFixed(1));
  // deux doigts : marcher et lancer en même temps
  await page.evaluate(() => { const p = World.state().p; p.ink = p.inkMax; });
  a = await etat(); await touch('touchStart', [[jx, jy, 4]]); await touch('touchMove', [[jx - 60, jy, 4]]); await page.waitForTimeout(150); await touch('touchStart', [[jx - 60, jy, 4], [gx, gy, 5]]); await page.waitForTimeout(250); await touch('touchEnd', [[jx - 60, jy, 4]]); await page.waitForTimeout(500); b = await etat(); await touch('touchEnd', []); await page.waitForTimeout(500); const b2 = await etat();
  ok('Deux doigts : on marche et on lance à la fois', a.x - b.x > 20 && b2.ink < a.ink - 0.5, 'reculé de ' + Math.round(a.x - b.x) + ' px, encre ' + a.ink.toFixed(1) + ' → ' + b2.ink.toFixed(1));
  // la main gauche : le bouton bascule, et la barre choisit alors pour la main gauche
  const [mx, my] = await centre('#t-main'); await touch('touchStart', [[mx, my, 6]]); await touch('touchEnd', []); await page.waitForTimeout(100);
  const [hx, hy] = await centre('#hotbar .slot:nth-child(3)'); await touch('touchStart', [[hx, hy, 7]]); await touch('touchEnd', []); await page.waitForTimeout(300);
  const mains = await page.evaluate(() => ({ m: game.mainTactile, L: game.selectedL, R: game.selected }));
  ok('Le bouton ✋ passe à la main gauche, et la barre la sert', mains.m === 'L' && mains.L === 2 && mains.R === 0, JSON.stringify(mains));
  if (process.argv.includes('--capture')) { await page.screenshot({ path: path.resolve(__dirname, '..', 'captures', 'tactile.png') }); console.log('  capture : tests/captures/tactile.png'); }
  if (errors.length) { console.log('  erreurs de la page :\n    ' + errors.slice(0, 5).join('\n    ')); res.push(false); }
  console.log('Bilan : ' + res.filter(Boolean).length + ' / ' + res.length);
  if (!res.every(Boolean)) process.exitCode = 1;
  await browser.close();
})();
