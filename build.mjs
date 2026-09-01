/* =========================================================================
   Assemblage : les sources deviennent une page unique, sans dépendance.
   - index.html   : document complet, ouvrable directement dans un navigateur
   - artifact.html: le même contenu sans <html>/<head>/<body>, pour publication
   ========================================================================= */
import fs from 'node:fs';
import path from 'node:path';

const ROOT = path.dirname(new URL(import.meta.url).pathname);
const SRC = path.join(ROOT, 'src');

const ORDRE = [
  '00-core.js', '10-audio.js', '20-fx.js', '25-taxonomie.js', '30-forge.js', '40-serments.js',
  '50-combat.js', '60-memoire.js', '70-ui.js', '75-ecrans.js', '78-duel.js', '80-boot.js',
];

const lire = p => fs.readFileSync(p, 'utf8');

const corpusPath = path.join(SRC, 'data', 'corpus.json');
if (!fs.existsSync(corpusPath)) {
  console.error('✗ src/data/corpus.json manquant');
  process.exit(1);
}
const corpus = JSON.parse(lire(corpusPath));

const css = lire(path.join(SRC, 'style.css'));
const js = ORDRE.map(f => {
  const p = path.join(SRC, 'js', f);
  if (!fs.existsSync(p)) throw new Error('source manquante : ' + f);
  return '/* ==== ' + f + ' ==== */\n' + lire(p);
}).join('\n\n');

/* </script> dans une chaîne JSON casserait la balise : on le neutralise. */
const corpusJson = JSON.stringify(corpus).replace(/</g, '\\u003c');

const TITRE = 'RITUEL — 呪法帳';
const DESC = "Générateur déterministe de techniques maudites et duel occulte dans l'univers de Jujutsu Kaisen.";

/* Les polices viennent de Google Fonts, seul hôte de feuilles admis côté
   Artifact. La page reste correcte sans elles : chaque pile a un repli réel. */
const URL_POLICES = 'https://fonts.googleapis.com/css2?' +
  'family=Cormorant+Garamond:ital,wght@0,300;0,400;0,600;0,700;1,300;1,400' +
  '&family=IBM+Plex+Mono:wght@300;400;500' +
  '&family=Noto+Serif+JP:wght@400;700&display=swap';
/* Chargées SANS bloquer le rendu : une feuille de style distante bloque le
   premier paint, et si l'hôte ne répond pas le jeu reste noir le temps du
   délai réseau. Ici la page s'affiche tout de suite dans ses polices de
   repli, et les vraies prennent la place quand elles arrivent. */
const POLICES = '<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>\n' +
  '<link rel="stylesheet" href="' + URL_POLICES + '" media="print" onload="this.media=\'all\';this.onload=null">\n' +
  '<noscript><link rel="stylesheet" href="' + URL_POLICES + '"></noscript>';

const corps = `<title>${TITRE}</title>
<meta name="description" content="${DESC}">
${POLICES}
<style>
${css}
</style>

<div id="stage"></div>

<script>
window.JJK = window.JJK || {};
window.JJK.CORPUS = ${corpusJson};
</script>
<script>
${js}
</script>`;

/* Le document complet veut le corps dans <body>. On sépare proprement. */
const iTitre = corps.indexOf('<div id="stage">');
const tete = corps.slice(0, iTitre);
const reste = corps.slice(iTitre);

const documentComplet = `<!doctype html>
<html lang="fr">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">
<meta name="theme-color" content="#07070a">
${tete}</head>
<body>
${reste}
</body>
</html>
`;

fs.writeFileSync(path.join(ROOT, 'index.html'), documentComplet);
fs.writeFileSync(path.join(ROOT, 'artifact.html'), corps + '\n');

const ko = n => (n / 1024).toFixed(1) + ' ko';
console.log('✓ index.html    ', ko(Buffer.byteLength(documentComplet)));
console.log('✓ artifact.html ', ko(Buffer.byteLength(corps)));
console.log('  corpus        ', ko(Buffer.byteLength(corpusJson)), '·', Object.keys(corpus).join(', '));
