'use strict';
// Vérifie la table des sceaux avec de vrais gestes : glisser-déposer à la souris et au doigt,
// déplacer, échanger, retirer, annuler, refaire, changer de taille sans rien perdre.
//   node tests/outils/table.js [--capture]
const path = require('path');
const { chromium } = require('playwright');
(async () => {
  const browser = await chromium.launch();
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 720 }, hasTouch: true });
  const page = await ctx.newPage(); const errors = []; page.on('pageerror', (e) => errors.push(e.message));
  await page.goto('file://' + path.resolve(__dirname, '..', '..', 'index.html')); await page.waitForTimeout(1500);
  await page.addStyleTag({ content: '#toasts{display:none!important}' });
  await page.evaluate(() => {
    game.setLook({ nom: 'P', chapeau: 1, cape: 2, acc: 0 }); UI.close(); const p = game.progress;
    p.cores = DATA.ESSENCES.slice(); p.shapes = Object.keys(DATA.SHAPES); p.mods = Object.keys(DATA.MODS); p.triggers = Object.keys(DATA.TRIGGERS); p.tailles = ['petit', 'moyen', 'grand']; p.fusion = true; p.slots = 3;
    game.editSeal = Seal.create('moyen'); UI.openPanel('seal');
  });
  await page.waitForTimeout(400);
  const cdp = await ctx.newCDPSession(page);
  const res = []; const ok = (nom, pass, detail) => { res.push(!!pass); console.log((pass ? '  ✓ ' : '  ✗ ') + nom + (detail ? '  — ' + detail : '')); };
  const sceau = () => page.evaluate(() => JSON.parse(JSON.stringify(game.editSeal)));
  // centre d'une case du cercle, en coordonnées de la page
  const caseXY = (sid) => page.evaluate((sid) => { const c = document.getElementById('seal-canvas'), r = c.getBoundingClientRect(), t = game.editSeal.taille || 'moyen'; const sl = Seal.slotList(c.width / 2, c.height / 2 + 10, 140 * (t === 'petit' ? 0.82 : 1), t).find((q) => q.id === sid); return [r.left + sl.x * r.width / c.width, r.top + sl.y * r.height / c.height]; }, sid);
  const boutonXY = (g) => page.evaluate((g) => { const b = document.querySelector('[data-glyphe="' + g + '"]'); b.scrollIntoView({ block: 'center' }); const r = b.getBoundingClientRect(); return [r.left + r.width / 2, r.top + r.height / 2]; }, g);
  const glisserSouris = async ([x0, y0], [x1, y1]) => { await page.mouse.move(x0, y0); await page.mouse.down(); for (let i = 1; i <= 12; i++) await page.mouse.move(x0 + (x1 - x0) * i / 12, y0 + (y1 - y0) * i / 12); await page.waitForTimeout(60); await page.mouse.up(); await page.waitForTimeout(150); };
  const touche = (type, pts) => cdp.send('Input.dispatchTouchEvent', { type, touchPoints: pts.map(([x, y]) => ({ x, y, id: 1, radiusX: 4, radiusY: 4, force: 1 })) });
  const glisserDoigt = async ([x0, y0], [x1, y1], appuiLong) => { await touche('touchStart', [[x0, y0]]); if (appuiLong) await page.waitForTimeout(400); for (let i = 1; i <= 12; i++) await touche('touchMove', [[x0 + (x1 - x0) * i / 12, y0 + (y1 - y0) * i / 12]]); await page.waitForTimeout(60); await touche('touchEnd', []); await page.waitForTimeout(400); };

  // 1. glisser depuis la palette
  const btnFeu = await page.evaluate(() => { window.__btnFeu = document.querySelector('[data-glyphe="core:feu"]'); return !!window.__btnFeu; });
  await glisserSouris(await boutonXY('core:feu'), await caseXY('core'));
  await glisserSouris(await boutonXY('shape:zone'), await caseXY('shape'));
  await glisserSouris(await boutonXY('mod:puissance'), await caseXY('mod1'));
  let s = await sceau();
  ok('Glisser de la palette pose le glyphe sur la case visée', s.core === 'feu' && s.shape === 'zone' && s.mods[1] === 'puissance', JSON.stringify({ core: s.core, shape: s.shape, mods: s.mods }));
  ok('Les palettes ne sont plus reconstruites à chaque geste', btnFeu && await page.evaluate(() => document.contains(window.__btnFeu)));
  // 2. une forme lâchée sur le centre n'y va pas
  await glisserSouris(await boutonXY('shape:mur'), await caseXY('core')); s = await sceau();
  ok('Un glyphe lâché sur une case qui n\'est pas la sienne n\'y va pas', s.core === 'feu' && s.shape === 'zone');
  // 3. déplacer, échanger, retirer
  await glisserSouris(await caseXY('mod1'), await caseXY('mod2')); s = await sceau();
  ok('Glisser un glyphe posé le déplace', s.mods[1] === null && s.mods[2] === 'puissance', JSON.stringify(s.mods));
  await glisserSouris(await boutonXY('mod:duree'), await caseXY('mod0'));
  await glisserSouris(await caseXY('mod0'), await caseXY('mod2')); s = await sceau();
  ok('Sur une case prise, les deux glyphes s\'échangent', s.mods[0] === 'puissance' && s.mods[2] === 'duree', JSON.stringify(s.mods));
  const [cx, cy] = await caseXY('mod2'); await glisserSouris([cx, cy], [cx + 600, cy + 40]); s = await sceau();
  ok('Glisser un glyphe hors du cercle le retire', s.mods[2] === null && s.mods[0] === 'puissance', JSON.stringify(s.mods));
  // 4. annuler, refaire
  await page.mouse.click(5, 5); await page.keyboard.press('Control+z'); s = await sceau();
  ok('Ctrl+Z annule le dernier geste', s.mods[2] === 'duree', JSON.stringify(s.mods));
  await page.keyboard.press('Control+z'); s = await sceau();
  ok('Un second Ctrl+Z remonte encore d\'un geste (avant l\'échange)', s.mods[0] === 'duree' && s.mods[2] === 'puissance', JSON.stringify(s.mods));
  await page.keyboard.press('Control+y'); await page.keyboard.press('Control+y'); await page.keyboard.press('Control+y'); s = await sceau();
  ok('Ctrl+Y refait', s.mods[2] === null && s.mods[0] === 'puissance', JSON.stringify(s.mods));
  await page.click('#seal-new'); await page.waitForTimeout(100); await page.click('#seal-annuler'); s = await sceau();
  ok('« Nouveau » par mégarde s\'annule aussi (bouton ↶)', s.core === 'feu' && s.mods[0] === 'puissance');
  // 5. choisir une case estompe les autres palettes ; Suppr retire ; Échap désélectionne sans fermer
  await page.mouse.click(...(await caseXY('mod0'))); await page.waitForTimeout(100);
  const estompe = await page.evaluate(() => ({ cores: document.getElementById('pal-cores').classList.contains('horsjeu'), mods: document.getElementById('pal-mods').classList.contains('horsjeu') }));
  ok('Une case choisie : les palettes qui n\'y vont pas s\'estompent', estompe.cores && !estompe.mods, JSON.stringify(estompe));
  await page.keyboard.press('Delete'); s = await sceau();
  ok('Suppr retire le glyphe de la case choisie', s.mods[0] === null, JSON.stringify(s.mods));
  await page.mouse.click(...(await caseXY('shape'))); await page.keyboard.press('Escape'); await page.waitForTimeout(100);
  ok('Échap désélectionne sans fermer la table', await page.evaluate(() => UI.isOpen() === 'seal'));
  // 6. changer de taille sans rien perdre
  await page.evaluate(() => { const s = game.editSeal; s.taille = 'grand'; s.core2 = 'gravite'; s.core3 = 'temps'; s.mods = ['puissance', 'duree', 'taille', 'echo', 'portee']; s.trigger = 'immediat'; s.trigger2 = 'repetition'; UI.refreshSeal(); });
  await page.evaluate(() => UI._table.changerTaille('moyen')); const moyen = await sceau();
  await page.evaluate(() => UI._table.changerTaille('grand')); const grand = await sceau();
  ok('Réduire met de côté, agrandir remet en place', moyen.mods[3] === null && moyen.core3 === null && grand.mods.join() === 'puissance,duree,taille,echo,portee' && grand.core3 === 'temps' && grand.trigger2 === 'repetition', 'moyen ' + moyen.mods.join() + ' / grand ' + grand.mods.join() + ', ' + grand.core3 + ', ' + grand.trigger2);
  // 7. au doigt : appui long dans la palette puis glisser ; glisser un glyphe posé hors du cercle
  await page.evaluate(() => { game.editSeal = Seal.create('moyen'); UI.refreshSeal(); });
  await glisserDoigt(await boutonXY('core:eau'), await caseXY('core'), true); s = await sceau();
  ok('Au doigt : appui long sur un glyphe, puis glisser, le pose', s.core === 'eau', 'centre : ' + s.core);
  await glisserDoigt(await boutonXY('shape:trait'), await caseXY('core'), false); s = await sceau();
  ok('Au doigt : un glissé rapide dans la palette fait défiler, il ne pose rien', s.shape === null);
  const [ex, ey] = await caseXY('core'); await glisserDoigt([ex, ey], [ex + 650, ey], false); s = await sceau();
  ok('Au doigt : glisser un glyphe posé hors du cercle le retire', s.core === null);
  // 8. un sous-sceau s'ouvre sur place, et remonte dans son parent
  await page.evaluate(() => { game.editSeal = Seal.clone({ taille: 'moyen', core: 'feu', shape: 'projectile', mods: [{ sub: { taille: 'moyen', core: 'eau', shape: 'zone', mods: [], trigger: 'immediat' } }, null, null], trigger: 'contact' }); UI.refreshSeal(); });
  await page.mouse.click(...(await caseXY('mod0'))); await page.waitForTimeout(80); await page.mouse.click(...(await caseXY('mod0'))); await page.waitForTimeout(200);
  const dedans = await page.evaluate(() => ({ pile: UI._table.pile, core: game.editSeal.core, fil: !document.getElementById('seal-fil').classList.contains('hidden') }));
  ok('Un second clic sur un sous-sceau l\'ouvre sur place, avec un fil d\'Ariane', dedans.pile === 1 && dedans.core === 'eau' && dedans.fil, JSON.stringify(dedans));
  await glisserSouris(await boutonXY('mod:duree'), await caseXY('mod1'));
  await page.click('#seal-remonter'); await page.waitForTimeout(150);
  const remonte = await page.evaluate(() => ({ pile: UI._table.pile, core: game.editSeal.core, sub: game.editSeal.mods[0] && game.editSeal.mods[0].sub && game.editSeal.mods[0].sub.mods[1] }));
  ok('Remonter remet le sous-sceau retouché dans son parent', remonte.pile === 0 && remonte.core === 'feu' && remonte.sub === 'duree', JSON.stringify(remonte));
  // 9. au clavier : les flèches parcourent les cases, les lettres trouvent un glyphe, Entrée le pose
  await page.evaluate(() => { game.editSeal = Seal.create('moyen'); UI._table.sel = 'core'; UI.refreshSeal(); document.activeElement && document.activeElement.blur(); });
  await page.keyboard.press('ArrowUp'); const a1 = await page.evaluate(() => UI._table.sel); await page.keyboard.press('ArrowUp'); const a2 = await page.evaluate(() => UI._table.sel); await page.keyboard.press('ArrowRight'); const a3 = await page.evaluate(() => UI._table.sel);
  ok('Les flèches passent d\'anneau en anneau et tournent autour', /shape|core2|core3/.test(a1) && /^mod/.test(a2) && /^mod/.test(a3) && a3 !== a2, a1 + ' → ' + a2 + ' → ' + a3);
  await page.keyboard.type('pui'); await page.waitForTimeout(80); await page.keyboard.press('Enter'); await page.waitForTimeout(150);
  const tape = await page.evaluate((sid) => game.editSeal.mods[+sid.slice(3)], a3);
  ok('Taper « pui » puis Entrée pose Puissance sur la case choisie', tape === 'puissance', String(tape));
  // 10. Maj + glisser : une copie
  await page.keyboard.down('Shift'); await glisserSouris(await caseXY(a3), await caseXY(a2)); await page.keyboard.up('Shift');
  const copie = await page.evaluate(([x, y]) => [game.editSeal.mods[+x.slice(3)], game.editSeal.mods[+y.slice(3)]], [a3, a2]);
  ok('Maj + glisser recopie le glyphe au lieu de le déplacer', copie[0] === 'puissance' && copie[1] === 'puissance', JSON.stringify(copie));
  if (process.argv.includes('--capture')) {
    await page.evaluate(() => { const s = game.editSeal; Object.assign(s, { core: 'feu', core2: 'gravite', shape: 'zone', mods: ['puissance', null, null, null, null], trigger: 'immediat' }); UI.refreshSeal(); });
    const [bx, by] = await boutonXY('mod:taille'); await page.mouse.move(bx, by); await page.mouse.down(); const [tx, ty] = await caseXY('mod1'); for (let i = 1; i <= 10; i++) await page.mouse.move(bx + (tx - bx) * i / 10, by + (ty - by) * i / 10); await page.waitForTimeout(200);
    await page.screenshot({ path: path.resolve(__dirname, '..', 'captures', 'table.png') }); await page.mouse.up(); console.log('  capture : tests/captures/table.png');
  }
  if (errors.length) { console.log('  erreurs de la page :\n    ' + errors.slice(0, 5).join('\n    ')); res.push(false); }
  console.log('Bilan : ' + res.filter(Boolean).length + ' / ' + res.length);
  if (!res.every(Boolean)) process.exitCode = 1;
  await browser.close();
})();
