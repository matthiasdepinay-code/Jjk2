/* =========================================================================
   Vérificateur de corpus.
   Le corpus est devenu trop gros pour se relire : ce fichier tient les
   invariants que la forge suppose. Il échoue fort, il ne devine rien.
     node tools/verifier.mjs            vérifie src/data/corpus.json
     node tools/verifier.mjs --stats    ajoute le relevé des familles
   ========================================================================= */
import fs from 'node:fs';
import path from 'node:path';

const ROOT = path.dirname(path.dirname(new URL(import.meta.url).pathname));
const corpus = JSON.parse(fs.readFileSync(path.join(ROOT, 'src/data/corpus.json'), 'utf8'));

const ARCHETYPES = ['soustraction', 'seuil', 'échange', 'lien', 'répétition', 'métamorphose', 'mesure', 'témoignage'];
const SUBSTRATS = ['usure', 'compte', 'absence', 'contact'];
const TERRITOIRES = ['administration', 'domestique', 'transit', 'clinique'];
const CONDITIONS = ['parole', 'corps', 'lieu', 'trace'];
const PORTEES = ['contact', 'courte', 'moyenne', 'longue', 'illimitée conditionnelle'];
const RANGS_SK = ['pivot', 'majeur', 'mineur'];

/* Ce que l'œuvre a déjà écrit ne nous appartient pas : le corpus est original,
   et une reprise même involontaire doit sauter aux yeux avant publication. */
const CANON = new RegExp('\\b(?:' + [
  'gojo', 'sukuna', 'nanami', 'megumi', 'itadori', 'nobara', 'kugisaki', 'fushiguro',
  'mahito', 'jogo', 'hanami', 'kenjaku', 'geto', 'yuta', 'okkotsu', 'maki', 'toji',
  'inumaki', "zen'?in", 'kamo', 'todo', 'aoi todo', 'panda', 'yuji',
  'limitless', 'infinity', 'ten shadows', 'dix ombres', 'boogie ?woogie',
  'straw ?doll', 'idle transfiguration', 'cursed speech', 'malevolent shrine',
  'unlimited void', 'hollow purple', 'divine dogs?', 'mahoraga', 'rika',
  'blood manipulation', 'shadow garden', 'disaster flames?',
].join('|') + ')\\b', 'i');

const errs = [], warns = [];
const E = m => errs.push(m);
const W = m => warns.push(m);

const arr = (k, s) => {
  const b = corpus[k];
  if (!b) { E(`bloc « ${k} » absent`); return []; }
  const v = b[s];
  if (!Array.isArray(v)) { E(`« ${k}.${s} » n'est pas un tableau`); return []; }
  return v;
};

/* ---- invariants transverses ------------------------------------------ */
/* Les champs courts (kanji, rang, romaji) n'ont qu'une exigence de présence ;
   seuls les champs de prose ont un plancher de longueur — c'est là que le
   remplissage paresseux se voit. */
function champs(liste, nom, requis, options) {
  const o = options || {};
  const prose = new Set(o.prose || []);
  const vus = new Set();
  liste.forEach((x, i) => {
    const ou = `${nom}[${i}]${x && x.id ? ' (' + x.id + ')' : ''}`;
    if (!x || typeof x !== 'object') { E(`${ou} : entrée non-objet`); return; }
    requis.forEach(c => {
      const v = x[c];
      if (v == null || (typeof v === 'string' && !v.trim())) E(`${ou} : champ « ${c} » vide ou absent`);
      else if (prose.has(c) && typeof v === 'string' && v.trim().length < (o.min || 120)) W(`${ou} : « ${c} » très court (${v.trim().length} car.)`);
    });
    if (x.id != null) {
      if (!/^[A-Za-z0-9_-]+$/.test(String(x.id))) E(`${ou} : id non conforme (ASCII, chiffres, tirets)`);
      if (vus.has(x.id)) E(`${ou} : id en double`);
      vus.add(x.id);
    }
    const texte = JSON.stringify(x);
    const m = CANON.exec(texte);
    if (m) E(`${ou} : reprise canon détectée — « ${m[0]} »`);
  });
  return vus;
}

function dansEnum(liste, nom, champ, valeurs) {
  liste.forEach((x, i) => {
    if (x && x[champ] != null && valeurs.indexOf(x[champ]) < 0)
      E(`${nom}[${i}]${x.id ? ' (' + x.id + ')' : ''} : ${champ} = « ${x[champ]} » hors nomenclature`);
  });
}

function repartition(liste, champ, valeurs, nom, plancher) {
  const c = {};
  valeurs.forEach(v => { c[v] = 0; });
  liste.forEach(x => { if (x && c[x[champ]] != null) c[x[champ]]++; });
  valeurs.forEach(v => {
    if (c[v] < plancher) E(`${nom} : famille « ${v} » n'a que ${c[v]} entrée(s), plancher ${plancher}`);
  });
  return c;
}

/* ---- familles ---------------------------------------------------------- */
const essences = arr('essences', 'essences');
champs(essences, 'essences', ['id', 'nom', 'kanji', 'romaji', 'concept', 'sensoriel', 'couleur', 'famille'], { prose: ['concept', 'sensoriel'] });
dansEnum(essences, 'essences', 'famille', SUBSTRATS);
essences.forEach((x, i) => {
  if (x.couleur && !/^#[0-9a-fA-F]{6}$/.test(x.couleur)) E(`essences[${i}] (${x.id}) : couleur « ${x.couleur} » non hexadécimale`);
  if (x.nom && !/^(Le|La|L['’]|Les)\s*/i.test(x.nom)) W(`essences[${i}] (${x.id}) : nom sans article — la grammaire du nom de technique en dépend`);
});

const lois = arr('lois', 'lois');
champs(lois, 'lois', ['id', 'nom', 'enonce', 'consequence', 'limite', 'inversion', 'maximum', 'archetype'], { prose: ['consequence', 'limite', 'inversion', 'maximum'], min: 120 });
dansEnum(lois, 'lois', 'archetype', ARCHETYPES);

const vecteurs = arr('vecteurs', 'vecteurs');
champs(vecteurs, 'vecteurs', ['id', 'nom', 'condition', 'portee', 'verbe', 'faille'], { prose: ['condition', 'faille'], min: 120 });
dansEnum(vecteurs, 'vecteurs', 'portee', PORTEES);
dansEnum(vecteurs, 'vecteurs', 'condition_tag', CONDITIONS);

const domaines = arr('domaines', 'domaines');
champs(domaines, 'domaines', ['id', 'nom_fr', 'nom_jp', 'romaji', 'paysage', 'effet_garanti', 'effet_code', 'incantation', 'faille', 'famille'], { prose: ['paysage', 'effet_garanti', 'effet_code', 'incantation', 'faille'], min: 100 });
dansEnum(domaines, 'domaines', 'famille', TERRITOIRES);

const kakucho = arr('kakucho', 'extensions');
champs(kakucho, 'kakucho', ['id', 'nom', 'kanji', 'romaji', 'principe', 'usage', 'cout', 'archetype'], { prose: ['principe', 'usage', 'cout'], min: 120 });
dansEnum(kakucho, 'kakucho', 'archetype', ARCHETYPES);

const derivations = corpus.derivations ? arr('derivations', 'derivations') : [];
if (derivations.length) {
  champs(derivations, 'derivations', ['id', 'nom', 'kanji', 'romaji', 'archetype', 'rang', 'effet', 'signe', 'cout', 'limite'], { prose: ['effet', 'signe', 'cout', 'limite'], min: 90 });
  dansEnum(derivations, 'derivations', 'archetype', ARCHETYPES);
  derivations.forEach((x, i) => {
    if (![1, 2, 3, 4].includes(x.rang)) E(`derivations[${i}] (${x.id}) : rang « ${x.rang} » hors 1..4`);
  });
}

const shikigami = arr('shikigami', 'shikigami');
champs(shikigami, 'shikigami', ['id', 'nom', 'kanji', 'romaji', 'forme', 'office', 'ordre', 'perte', 'rang', 'archetype', 'cout'], { prose: ['forme', 'office', 'perte'], min: 100 });
dansEnum(shikigami, 'shikigami', 'rang', RANGS_SK);
dansEnum(shikigami, 'shikigami', 'archetype', ARCHETYPES);

const jugu = arr('jugu', 'outils');
champs(jugu, 'jugu', ['id', 'nom', 'kanji', 'romaji', 'objet', 'charge', 'usage', 'defaut', 'rang'], { prose: ['objet', 'charge', 'usage', 'defaut'], min: 100 });

champs(arr('chobuku', 'epreuves'), 'chobuku', ['id', 'nom', 'kanji', 'condition', 'prix', 'echec'], { prose: ['condition', 'prix'], min: 100 });
champs(arr('jubaku', 'restrictions'), 'jubaku', ['id', 'nom', 'kanji', 'romaji', 'privation', 'contrepartie'], { prose: ['privation', 'contrepartie'], min: 100 });
champs(arr('kanri', 'simplifies'), 'kanri', ['id', 'nom', 'kanji', 'romaji', 'forme', 'effet', 'limite'], { prose: ['forme', 'effet', 'limite'], min: 100 });

/* ---- planchers de famille : une déclaration doit avoir du choix -------- */
const stats = {
  essences: repartition(essences, 'famille', SUBSTRATS, 'essences', 10),
  lois: repartition(lois, 'archetype', ARCHETYPES, 'lois', 5),
  domaines: repartition(domaines, 'famille', TERRITOIRES, 'domaines', 5),
  kakucho: repartition(kakucho, 'archetype', ARCHETYPES, 'kakucho', 2),
  vecteurs: repartition(vecteurs, 'condition_tag', CONDITIONS, 'vecteurs', 4),
};
if (derivations.length) stats.derivations = repartition(derivations, 'archetype', ARCHETYPES, 'derivations', 4);

/* ---- les organes doivent servir les quatre sièges ---------------------- */
const taxoSrc = fs.readFileSync(path.join(ROOT, 'src/js/25-taxonomie.js'), 'utf8');
/* Les mêmes expressions que la taxonomie : on les lit dans la source plutôt
   que de les recopier, sinon les deux dérivent en silence. */
const SIEGES = {};
for (const m of taxoSrc.matchAll(/^\s+(gorge|sang|nerf|os):\s+(\/.+\/i),\s*$/gm)) {
  SIEGES[m[1]] = eval(m[2]);
}
if (Object.keys(SIEGES).length !== 4) E('tools/verifier : les expressions de siège n’ont pas pu être lues dans 25-taxonomie.js');
const nomDe = o => String(o && typeof o === 'object' ? o.nom : o || '');
const organes = ((corpus.matieres || {}).organes || []).map(nomDe);
stats.organes = {};
for (const k in SIEGES) {
  const n = organes.filter(o => SIEGES[k].test(o)).length;
  stats.organes[k] = n;
  if (n < 6) E(`matieres.organes : le siège « ${k} » n'a que ${n} organe(s), plancher 6`);
}
const orphelins = organes.filter(o => !Object.values(SIEGES).some(re => re.test(o)));
if (orphelins.length) W(`matieres.organes : ${orphelins.length} organe(s) sans siège — ${orphelins.slice(0, 5).join(' / ')}`);

/* ---- le formulaire couvre-t-il tous les axes ? ------------------------- */
const axes = [...taxoSrc.matchAll(/\{\s*id:\s*'([a-z]+)',\s*tags:\s*\[([^\]]+)\]/g)]
  .map(m => ({ id: m[1], tags: m[2].split(',').map(s => s.trim().replace(/^'|'$/g, '')) }));
const questions = arr('formulaire', 'questions');
axes.forEach(a => {
  const q = questions.find(x => x.axe === a.id);
  if (!q) { E(`formulaire : aucune question pour l'axe « ${a.id} »`); return; }
  const tags = (q.reponses || []).map(r => r.tag);
  a.tags.forEach(t => { if (tags.indexOf(t) < 0) E(`formulaire[${a.id}] : réponse manquante pour l'étiquette « ${t} »`); });
  if (tags.length !== 4) E(`formulaire[${a.id}] : ${tags.length} réponses au lieu de 4`);
});

/* ---- relevé ------------------------------------------------------------ */
const total = Object.keys(corpus).reduce((s, k) => {
  const cpt = o => Array.isArray(o) ? o.length : (o && typeof o === 'object' ? Object.values(o).reduce((a, v) => a + cpt(v), 0) : 0);
  return s + cpt(corpus[k]);
}, 0);

if (process.argv.includes('--stats')) {
  console.log(`axes du formulaire : ${axes.length}  →  ${Math.pow(4, axes.length).toLocaleString('fr-FR')} déclarations`);
  for (const k in stats) console.log('  ' + k.padEnd(11), JSON.stringify(stats[k]));
}
warns.forEach(m => console.log('  ~ ' + m));
if (errs.length) {
  errs.forEach(m => console.log('  ✗ ' + m));
  console.log(`\n✗ ${errs.length} erreur(s), ${warns.length} avertissement(s) — corpus refusé`);
  process.exit(1);
}
console.log(`✓ corpus conforme — ${total} entrées, ${warns.length} avertissement(s)`);
