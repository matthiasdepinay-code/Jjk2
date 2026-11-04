'use strict';
// Extrait un ensemble de fonctions de premier niveau de World (js/world.js) vers un module creerX(W).
// Les noms que le lot emprunte au monde deviennent W.nom ; le monde passe un contexte de getters
// (et de setters pour les variables que le lot réaffecte) et garde des relais pour les appels restants.
// Seuls les alias vers les globaux (const { TAU } = U, const M = Sim.M...) sont recopiés dans le module.
//
//   node outils/extraire.js --essai f1 f2 ...                     analyse seulement (noms libres, réaffectations)
//   node outils/extraire.js --module js/x.js --fabrique creerX --alias XX --titre "..." f1 f2 ... [-- var1 var2]
//
// Les variables après « -- » appartiennent au lot : elles partent avec lui (elles ne doivent servir que là).
// Il faut acorn et acorn-walk (npm install). Ensuite : ajouter la balise <script> avant world.js et lancer les tests.
const fs = require('fs'), path = require('path');
const acorn = require('acorn'), walk = require('acorn-walk');
const RACINE = path.resolve(__dirname, '..'), WORLD = path.join(RACINE, 'js', 'world.js');
const ANCRE = '  function respawn() {';

const argv = process.argv.slice(2), opt = {}, noms = [];
for (let i = 0; i < argv.length; i++) { const a = argv[i]; if (a === '--essai') opt.essai = true; else if (a.startsWith('--') && a !== '--') opt[a.slice(2)] = argv[++i]; else noms.push(a); }
const sep = noms.indexOf('--'); const LOT = sep < 0 ? noms : noms.slice(0, sep), POSSEDE = sep < 0 ? [] : noms.slice(sep + 1);
if (!LOT.length || (!opt.essai && !(opt.module && opt.fabrique && opt.alias))) { console.log(fs.readFileSync(__filename, 'utf8').split('\n').slice(1, 11).join('\n')); process.exit(1); }

const src = fs.readFileSync(WORLD, 'utf8');
const ast = acorn.parse(src, { ecmaVersion: 2022, locations: true });
let corps; for (const n of ast.body) if (n.type === 'VariableDeclaration' && n.declarations[0].id.name === 'World') corps = n.declarations[0].init.callee.body.body;
if (!corps) throw new Error('const World = (() => { ... })() introuvable');
const nomsDe = (p, out = []) => { if (!p) return out; if (p.type === 'Identifier') out.push(p.name); else if (p.type === 'ObjectPattern') p.properties.forEach((q) => nomsDe(q.type === 'RestElement' ? q.argument : q.value, out)); else if (p.type === 'ArrayPattern') p.elements.forEach((q) => nomsDe(q, out)); else if (p.type === 'AssignmentPattern') nomsDe(p.left, out); else if (p.type === 'RestElement') nomsDe(p.argument, out); return out; };
const top = new Map();
for (const n of corps) { if (n.type === 'FunctionDeclaration') top.set(n.id.name, { kind: 'function', node: n }); else if (n.type === 'VariableDeclaration') for (const d of n.declarations) for (const x of nomsDe(d.id)) top.set(x, { kind: n.kind, node: n, decl: d }); }
for (const f of LOT) if (!top.has(f) || top.get(f).kind !== 'function') throw new Error('pas une fonction de premier niveau de World : ' + f);
for (const v of POSSEDE) if (!top.has(v) || top.get(v).kind === 'function') throw new Error('pas une variable de premier niveau de World : ' + v);

// ---------- portées : un nom est local s'il est déclaré dans une portée englobante ----------
function declsDe(node) {
  const s = new Set();
  const bloc = (stmts) => { for (const st of stmts) { if (st.type === 'VariableDeclaration') st.declarations.forEach((d) => nomsDe(d.id).forEach((x) => s.add(x))); if (st.type === 'FunctionDeclaration' || st.type === 'ClassDeclaration') s.add(st.id.name); } };
  switch (node.type) {
    case 'FunctionDeclaration': case 'FunctionExpression': case 'ArrowFunctionExpression':
      node.params.forEach((p) => nomsDe(p).forEach((x) => s.add(x))); if (node.type === 'FunctionExpression' && node.id) s.add(node.id.name);
      walk.recursive(node.body, null, { Function() {}, VariableDeclaration(d, st, c) { if (d.kind === 'var') d.declarations.forEach((q) => nomsDe(q.id).forEach((x) => s.add(x))); for (const q of d.declarations) if (q.init) c(q.init, st); } });
      if (node.body.type === 'BlockStatement') bloc(node.body.body);
      break;
    case 'BlockStatement': case 'Program': case 'StaticBlock': bloc(node.body); break;
    case 'SwitchStatement': for (const k of node.cases) bloc(k.consequent); break;
    case 'ForStatement': if (node.init && node.init.type === 'VariableDeclaration') bloc([node.init]); break;
    case 'ForInStatement': case 'ForOfStatement': if (node.left.type === 'VariableDeclaration') bloc([node.left]); break;
    case 'CatchClause': if (node.param) nomsDe(node.param).forEach((x) => s.add(x)); break;
  }
  return s;
}
const cache = new WeakMap(); const decls = (n) => { let s = cache.get(n); if (!s) { s = declsDe(n); cache.set(n, s); } return s; };
const local = (nom, anc) => { for (let i = anc.length - 2; i >= 0; i--) if (decls(anc[i]).has(nom)) return true; return false; };

// ---------- noms libres du lot ----------
const occ = [], libres = new Set(), reaffectes = new Set();
const racines = LOT.map((f) => top.get(f).node).concat([...new Set(POSSEDE.map((v) => top.get(v).decl))]);
for (const r of racines) {
  const voir = (n, anc, ecrit) => {
    const p = anc[anc.length - 2];
    if (p && p.type === 'MemberExpression' && p.property === n && !p.computed) return;
    if (p && (p.type === 'Property' || p.type === 'PropertyDefinition' || p.type === 'MethodDefinition') && p.key === n && !p.computed && !p.shorthand) return;
    if (p && p.type === 'VariableDeclarator' && p.id === n) return;
    if (p && (p.type === 'FunctionDeclaration' || p.type === 'FunctionExpression') && p.id === n) return;
    if (p && (p.type === 'LabeledStatement' || p.type === 'BreakStatement' || p.type === 'ContinueStatement')) return;
    if (local(n.name, anc) || !top.has(n.name) || LOT.includes(n.name) || POSSEDE.includes(n.name)) return;
    libres.add(n.name); if (ecrit) reaffectes.add(n.name);
    occ.push({ start: n.start, end: n.end, nom: n.name, abrege: !!(p && p.type === 'Property' && p.shorthand) });
  };
  walk.ancestor(r, {
    Identifier(n, anc) { const p = anc[anc.length - 2]; voir(n, anc, p && p.type === 'UpdateExpression'); },
    // les cibles d'affectation sont visitées comme « VariablePattern »
    VariablePattern(n, anc) { const p = anc[anc.length - 2]; if (p && /^(VariableDeclarator|FunctionDeclaration|FunctionExpression|ArrowFunctionExpression|CatchClause)$/.test(p.type)) return; voir(n, anc, true); },
  });
}
for (const v of reaffectes) if (top.get(v).kind === 'const') throw new Error('le lot réaffecte une constante : ' + v);

// ---------- constantes recopiées ----------
const dependDuMonde = (init) => { let d = false; if (init) walk.full(init, (n) => { if (n.type === 'Identifier' && top.has(n.name)) d = true; }); return d; };
// seuls les alias vers les globaux (U, Sim, DATA...) sont recopiés ; un nombre recopié ferait deux exemplaires à tenir d'accord
const simple = (i) => i && (i.type === 'MemberExpression' || i.type === 'Identifier');
const COPIE = new Set(), decCopie = [];
for (const nom of libres) { const t = top.get(nom); if (t.kind === 'const' && t.node.declarations.every((d) => simple(d.init) && !dependDuMonde(d.init))) { COPIE.add(nom); if (!decCopie.includes(t.node)) decCopie.push(t.node); } }
const ctx = [...libres].filter((x) => !COPIE.has(x)).sort();
const lignes = (n) => n.loc.end.line - n.loc.start.line + 1;
const nLignes = LOT.reduce((a, f) => a + lignes(top.get(f).node), 0);

// relais : les fonctions du lot appelées ailleurs dans World (ou exportées)
const noeudsLot = [...new Set(POSSEDE.map((v) => top.get(v).node))].concat(LOT.map((f) => top.get(f).node)).sort((a, b) => a.start - b.start);
const dehors = corps.filter((n) => !noeudsLot.includes(n)), relais = new Set();
for (const n of dehors) walk.full(n, (q) => { if (q.type === 'Identifier' && LOT.includes(q.name)) relais.add(q.name); });
const fuites = []; for (const v of POSSEDE) for (const n of dehors) walk.full(n, (q) => { if (q.type === 'Identifier' && q.name === v) fuites.push(v); });

console.log(nLignes + ' lignes dans le lot');
console.log('contexte (' + ctx.length + ') : ' + ctx.map((x) => x + (reaffectes.has(x) ? ' (réaffecté)' : '')).join(', '));
console.log('recopiés : ' + ([...COPIE].join(', ') || 'aucun'));
console.log('relais dans world.js : ' + ([...relais].sort().join(', ') || 'aucun'));
if (fuites.length) { console.log('ÉCHEC : variables possédées utilisées hors du lot : ' + [...new Set(fuites)].join(', ')); process.exit(1); }
if (opt.essai) process.exit(0);

// ---------- écriture du module ----------
const reecrit = (node) => {
  let t = src.slice(node.start, node.end);
  for (const q of occ.filter((o) => o.start >= node.start && o.end <= node.end && !COPIE.has(o.nom)).sort((a, b) => b.start - a.start)) t = t.slice(0, q.start - node.start) + (q.abrege ? q.nom + ': W.' + q.nom : 'W.' + q.nom) + t.slice(q.end - node.start);
  return t;
};
let mod = "'use strict';\n// ---------- " + (opt.titre || opt.fabrique) + " ----------\n// Extrait de world.js (outils/extraire.js) : le monde lui passe un contexte W de getters vers son état et ses fonctions.\nfunction " + opt.fabrique + '(W) {\n';
for (const d of decCopie) mod += '  ' + src.slice(d.start, d.end) + '\n';
for (const n of noeudsLot) mod += '  ' + reecrit(n) + '\n';
mod += '  return { ' + LOT.join(', ') + ' };\n}\n';
const cible = path.resolve(RACINE, opt.module);
if (fs.existsSync(cible)) throw new Error('le module existe déjà : ' + opt.module);
fs.writeFileSync(cible, mod);

// ---------- world.js : on retire le lot, on ajoute le contexte et les relais ----------
let out = src;
for (const n of noeudsLot.slice().sort((a, b) => b.start - a.start)) { let a = n.start; while (a > 0 && out[a - 1] === ' ') a--; let b = n.end; if (out[b] === '\n') b++; out = out.slice(0, a) + out.slice(b); }
const W = ctx.map((x) => 'get ' + x + '() { return ' + x + '; }' + (reaffectes.has(x) ? ', set ' + x + '(v) { ' + x + ' = v; }' : '')).join(', ');
const bloc = '  // ---------- ' + (opt.titre || opt.fabrique) + ' (' + opt.module + ') ----------\n  const ' + opt.alias + ' = ' + opt.fabrique + '({ ' + W + ' });\n' + [...relais].sort().map((f) => '  function ' + f + '(...a) { return ' + opt.alias + '.' + f + '(...a); }\n').join('');
if (out.split(ANCRE).length !== 2) throw new Error('ancre introuvable : ' + ANCRE.trim());
out = out.replace(ANCRE, bloc + ANCRE);
fs.writeFileSync(WORLD, out);
console.log(opt.module + ' écrit (' + mod.split('\n').length + ' lignes) ; world.js : ' + out.split('\n').length + ' lignes');
