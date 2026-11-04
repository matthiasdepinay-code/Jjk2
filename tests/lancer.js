'use strict';
// Lance les bancs d'essai du jeu dans un navigateur sans écran.
//   node tests/lancer.js                 tous les bancs
//   node tests/lancer.js glyphes fusions  seulement ceux-là
// Il faut Playwright et Chromium : npm i -D playwright && npx playwright install chromium
const fs = require('fs'), path = require('path');
const { chromium } = require('playwright');
const RACINE = path.resolve(__dirname, '..'), BANCS = path.join(__dirname, 'bancs');
const banc = fs.readFileSync(path.join(__dirname, 'lib', 'banc.js'), 'utf8');
(async () => {
  const tous = fs.readdirSync(BANCS).filter((f) => f.endsWith('.js')).map((f) => f.slice(0, -3)).sort();
  const noms = process.argv.slice(2).length ? process.argv.slice(2) : tous;
  const browser = await chromium.launch();
  let total = 0, reussis = 0; const echecs = [];
  for (const nom of noms) {
    if (!tous.includes(nom)) { console.log('Banc inconnu : ' + nom + ' (connus : ' + tous.join(', ') + ')'); process.exitCode = 1; continue; }
    const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
    const erreurs = [];
    page.on('pageerror', (e) => erreurs.push(e.message + ' | ' + (e.stack || '').split('\n')[1]));
    page.on('console', (m) => { if (m.type() === 'error' || (m.type() === 'warning' && !/monde illisible/.test(m.text()))) erreurs.push(m.type() + ' : ' + m.text().slice(0, 200)); });
    await page.goto('file://' + path.join(RACINE, 'index.html')); await page.waitForTimeout(1500);
    await page.addStyleTag({ content: '#toasts{display:none!important}' });
    await page.evaluate(() => { game.setLook({ nom: 'P', chapeau: 1, cape: 2, acc: 0 }); }); await page.waitForTimeout(300);
    await page.evaluate(() => { UI.close(); const p = game.progress; p.cores = DATA.ESSENCES.slice(); p.shapes = Object.keys(DATA.SHAPES); p.mods = Object.keys(DATA.MODS); p.triggers = Object.keys(DATA.TRIGGERS); p.slots = 3; p.tailles = ['petit', 'moyen', 'grand']; p.fusion = true; p.filtres = Object.keys(DATA.FILTRES); p.cibles = Object.keys(DATA.CIBLES); game.goWorld(); });
    await page.waitForTimeout(400);
    await page.evaluate(() => { window.__errs = []; window.addEventListener('error', (e) => window.__errs.push(e.message)); const w0 = console.warn; console.warn = (...a) => { window.__errs.push(a.map(String).join(' ').slice(0, 160)); w0(...a); }; });
    const corps = fs.readFileSync(path.join(BANCS, nom + '.js'), 'utf8');
    const t0 = Date.now();
    let R;
    try { R = await page.evaluate('(() => {\n' + banc + '\n' + corps + '\n    return res;\n})()'); }
    catch (e) { R = [{ nom: 'le banc s\'arrête sur une erreur', ok: false, detail: String(e.message || e).split('\n')[0] }]; }
    let n = 0; console.log('\n== ' + nom + ' ==');
    for (const r of R) { total++; if (r.ok) { n++; reussis++; } else echecs.push(nom + ' : ' + r.nom); console.log((r.ok ? '  ✓ ' : '  ✗ ') + r.nom + (r.detail ? '  — ' + r.detail : '')); }
    if (erreurs.length) { console.log('  erreurs de la page :'); for (const e of erreurs.slice(0, 8)) console.log('    ' + e); echecs.push(nom + ' : ' + erreurs.length + ' erreur(s) de la page'); }
    console.log('  ' + n + ' / ' + R.length + ' en ' + Math.round((Date.now() - t0) / 1000) + ' s');
    await page.close();
  }
  await browser.close();
  console.log('\nBilan : ' + reussis + ' / ' + total + ' réussis' + (echecs.length ? '\nÀ revoir :\n  ' + echecs.join('\n  ') : ''));
  if (echecs.length) process.exitCode = 1;
})();
