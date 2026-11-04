'use strict';
// ---------- Sceaux : modèle, coût, validité, dessin des glyphes et du cercle ----------
const Seal = (() => {
  const { TAU, INK } = U;

  const NMODS = 5;
  function create(taille = 'moyen') {
    return { nom: '', taille, core: null, core2: null, core3: null, shape: null, mods: [null, null, null, null, null], trigger: null, trigger2: null, lien2: null, filtre: null, cible: null, delai: 2, periode: 2, encre: null, dimL: 1, dimH: 1 };
  }
  function clone(s) {
    let mods = (s.mods || []).map((m) => (m && typeof m === 'object' && m.sub ? { sub: clone(m.sub) } : typeof m === 'string' ? (m in DATA.MIGR_MODS ? DATA.MIGR_MODS[m] : DATA.MODS[m] ? m : null) : null));
    while (mods.length < NMODS) mods.push(null);
    mods = mods.slice(0, NMODS);
    // anciennes essences devenues aspects : l'essence mère au centre, l'aspect sur l'anneau
    let core = s.core || null, core2 = s.core2 || null;
    const migrer = (c) => { const M2 = DATA.MIGRATION[c]; if (!M2) return c; if (!mods.includes(M2[1])) { let i = mods.findIndex((m, k) => !m && k < nbSlots({ taille: s.taille || 'moyen' }, 3)); if (i < 0) i = 0; mods[i] = M2[1]; } return M2[0]; };
    core = migrer(core); core2 = migrer(core2); const core3 = migrer(s.core3 || null);
    return { nom: s.nom || '', taille: s.taille || 'moyen', core, core2, core3: (s.taille === 'grand' && core3) || null, shape: s.shape || null, mods,
      trigger: s.trigger || null, trigger2: s.trigger2 || null, lien2: (s.taille === 'grand' && s.lien2) || null, filtre: s.filtre || null, cible: s.cible || null, delai: s.delai || 2, periode: s.periode || 2, encre: s.encre || null, dimL: s.dimL || 1, dimH: s.dimH || 1 };
  }
  const isSub = (m) => !!(m && typeof m === 'object' && m.sub);
  function subs(s) { return s.mods.filter(isSub).map((m) => m.sub); }
  function depth(s) { let d = 0; for (const q of subs(s)) d = Math.max(d, 1 + depth(q)); return d; }
  function taille(s) { return DATA.TAILLES[s.taille || 'moyen'] || DATA.TAILLES.moyen; }
  // nombre d'emplacements de modificateur réellement utilisables (progress.slots borne le moyen)
  function nbSlots(s, slotsMoyen = 3) { const t = s.taille || 'moyen'; return t === 'petit' ? 1 : t === 'grand' ? 5 : Math.min(3, slotsMoyen); }
  function triggers(s) { return [s.trigger, s.taille === 'grand' ? s.trigger2 : null].filter(Boolean); }
  function cost(s) {
    let c = 0;
    if (s.core) c += DATA.CORES[s.core].cout;
    if (s.core2) c += DATA.CORES[s.core2].cout + 2;
    if (s.core3 && s.taille === 'grand') c += DATA.CORES[s.core3].cout + 3;
    if (s.shape) c += DATA.SHAPES[s.shape].cout;
    for (const m of s.mods) { if (!m) continue; c += isSub(m) ? cost(m.sub) : DATA.MODS[m].cout; }
    for (const t of triggers(s)) c += DATA.TRIGGERS[t].cout;
    if (s.filtre && s.taille !== 'petit') c += DATA.FILTRES[s.filtre].cout;
    if (s.cible && s.taille !== 'petit') c += DATA.CIBLES[s.cible].cout;
    const T = taille(s);
    // la surface de la forme se paie : un grand mur coûte plus qu'un petit
    if (s.taille !== 'petit' && DATA.DIMS[s.shape]) { const A = (s.dimL || 1) * (DATA.DIMS[s.shape].h ? s.dimH || 1 : 1); c += Math.max(-2, Math.round((Math.sqrt(A) - 1) * 3)); }
    const eq = (s.mods || []).filter(Boolean).length >= 2 && equilibre(s).etat === 'equilibre';
    return Math.max(s.core ? 1 : 0, Math.round(c * T.coutMul * (eq ? 0.9 : 1) + T.coutAdd));
  }
  // ---------- la géométrie compte ----------
  // un modificateur posé juste sous une essence fusionnée (au même angle) ne sert qu'elle
  const LIABLES = ['puissance', 'inverser'];
  const ANGLE_ESS = { core2: 90, core3: 180 };
  const ecartAngle = (a, b) => Math.abs((((a - b) % 360) + 540) % 360 - 180);
  function liaisons(s) {
    const t = s.taille || 'moyen', out = {}; if (t === 'petit') return out;
    const ang = MOD_ANGLES[t] || MOD_ANGLES.moyen, nb = nbSlots(s, NMODS);
    ang.forEach((deg, i) => { const m = s.mods[i]; if (!m || isSub(m) || !LIABLES.includes(m) || i >= nb) return; for (const k of ['core2', 'core3']) { if (!s[k] || (k === 'core3' && t !== 'grand')) continue; if (ecartAngle(deg, ANGLE_ESS[k]) <= 25) out[i] = k; } });
    return out;
  }
  // les effets que donne une case d'essence (avec ses aspects)
  function effetsDe(s, k) { const c = s[k]; if (!c) return []; const a = aspects(s)[c]; return a ? a.map((q) => q.devient) : [c]; }
  // l'équilibre des modificateurs autour du cercle : centre de gravité des cases occupées
  function equilibre(s) {
    const ang = MOD_ANGLES[s.taille || 'moyen'] || MOD_ANGLES.moyen, nb = nbSlots(s, NMODS);
    let x = 0, y = 0, n = 0; s.mods.forEach((m, i) => { if (!m || i >= nb || i >= ang.length) return; const a = ang[i] * Math.PI / 180; x += Math.cos(a); y += Math.sin(a); n++; });
    if (n < 2) return { etat: 'neutre', d: 0, n };
    const d = Math.hypot(x, y) / n;
    return { etat: d <= 0.15 ? 'equilibre' : d >= 0.75 ? 'bancal' : 'neutre', d, n };
  }
  // la taille s'ajuste à ce qu'on pose : la plus petite qui tient tout
  const ORDRE_TAILLES = ['petit', 'moyen', 'grand'];
  function tailleBesoin(s, slotsMoyen = 3) {
    let b = 0; const nm = Math.min(3, slotsMoyen);
    if (s.core2 || s.filtre || s.cible || (s.dimL || 1) !== 1 || (s.dimH || 1) !== 1 || s.mods.some((m, i) => m && i >= 1)) b = 1;
    if (s.core3 || s.trigger2 || s.lien2 || s.mods.some((m, i) => m && i >= nm)) b = 2;
    return b;
  }
  function tailleMin(s, tailles = ORDRE_TAILLES, slotsMoyen = 3) {
    const b = tailleBesoin(s, slotsMoyen);
    for (let k = b; k < 3; k++) if (tailles.includes(ORDRE_TAILLES[k])) return ORDRE_TAILLES[k];
    for (let k = 2; k >= 0; k--) if (tailles.includes(ORDRE_TAILLES[k])) return ORDRE_TAILLES[k];
    return 'moyen';
  }
  // le temps de tracé suit le nombre de glyphes posés ; un sceau équilibré se trace plus vite
  const REF_GLYPHES = { petit: 3, moyen: 4, grand: 7 };
  function nGlyphes(s) { let n = 0; for (const k of ['core', 'shape', 'trigger', 'core2', 'core3', 'filtre', 'cible', 'trigger2']) if (s[k]) n++; return n + s.mods.filter(Boolean).length; }
  function geste(s) { const T = taille(s); return T.geste * U.clamp(nGlyphes(s) / (REF_GLYPHES[s.taille || 'moyen'] || 4), 0.6, 1.6) * (equilibre(s).etat === 'equilibre' ? 0.85 : 1); }
  // un trait relie le second déclencheur à une essence : le sort part en deux temps
  function enDeuxTemps(s) { return s.taille === 'grand' && !!s.trigger2 && !!s.lien2 && !!s[s.lien2] && [s.core, s.core2, s.core3].filter(Boolean).length >= 2; }
  function scinder(s) {
    const k = s.lien2, e = s[k], L = liaisons(s), estAspect = (m) => typeof m === 'string' && DATA.MODS[m] && DATA.MODS[m].aspect;
    // A garde les autres essences, B part seule avec le second déclencheur
    const reste = ['core', 'core2', 'core3'].filter((q) => q !== k && s[q]), cle = {}; reste.forEach((q, j) => { cle[q] = ['core', 'core2'][j]; });
    const pourB = [], modsA = new Array(NMODS).fill(null), aPlacer = [];
    s.mods.forEach((m, i) => {
      if (!m) return;
      const aspect = estAspect(m) ? DATA.MODS[m].aspect : null;
      if (aspect === e || L[i] === k) { pourB.push(m); return; }
      if (!aspect && !L[i] && !isSub(m)) pourB.push(m);
      // lié à une autre essence : il la suit à sa nouvelle place (sous la seconde essence : 90°)
      if (L[i]) { if (cle[L[i]] === 'core2' && modsA[0] == null) modsA[0] = m; else aPlacer.push([m, -1]); }
      else aPlacer.push([m, i]);
    });
    aPlacer.sort((x, y) => (y[1] >= 0) - (x[1] >= 0));
    for (const [m, i] of aPlacer) {
      const libre = (q) => modsA[q] == null && !(q === 0 && reste.length > 1 && LIABLES.includes(m));
      const j = i >= 0 && libre(i) ? i : [1, 2, 4, 3, 0].find(libre);
      if (j != null) modsA[j] = m;
    }
    const B = clone(Object.assign({}, s, { nom: '', taille: 'moyen', core: e, core2: null, core3: null, trigger: s.trigger2, trigger2: null, lien2: null, mods: pourB.slice(0, 3) }));
    const A = clone(Object.assign({}, s, { nom: '', core: s[reste[0]] || null, core2: s[reste[1]] || null, core3: null, trigger2: null, lien2: null, mods: modsA }));
    return [A, B];
  }
  // le tracé : centre, premier anneau, second anneau, pointes ; chaque anneau dure selon ses glyphes
  function anneaux(s) {
    const r = [['core'].filter((k) => s[k]), ['shape', 'core2', 'core3'].filter((k) => s[k]), s.mods.map((m, i) => (m ? 'mod' + i : null)).filter(Boolean), ['trigger', 'trigger2', 'filtre', 'cible'].filter((k) => s[k])];
    const n = r.reduce((a, q) => a + Math.max(1, q.length), 0); let acc = 0;
    return r.map((q) => { const de = acc / n; acc += Math.max(1, q.length); return { cases: q, de, a: acc / n }; });
  }
  // lâché avant la fin : seuls les anneaux finis partent
  function partiel(s, prog) {
    if (prog >= 1) return s;
    const fini = anneaux(s).filter((q) => prog >= q.a - 1e-6).length;
    // sans sa forme, rien ne peut partir
    if (fini < 2) return null;
    const c = clone(s);
    if (fini < 3) c.mods = c.mods.map(() => null);
    if (fini < 4) { c.trigger = null; c.trigger2 = null; c.filtre = null; c.cible = null; c.lien2 = null; }
    return c;
  }
  // le sceau qui se dessine dans l'air, anneau par anneau
  function drawTrace(ctx, s, cx, cy, R, prog, t = 0) {
    const A = anneaux(s), lay = layout(cx, cy, R, s.taille || 'moyen'), coul = s.core ? DATA.CORES[s.core].couleur : '#8a7a5a';
    const rayons = [R * 0.36, R * 0.62, R * 0.86, R];
    ctx.save(); ctx.lineCap = 'round';
    if (typeof FX !== 'undefined') FX.glow(ctx, cx, cy, R * 1.3, coul, 0.25 * Math.min(1, prog * 2));
    A.forEach((q, k) => {
      const u = U.clamp((prog - q.de) / Math.max(0.001, q.a - q.de), 0, 1); if (u <= 0) return;
      ctx.globalAlpha = 0.95; ctx.strokeStyle = k === 3 ? INK : coul; ctx.lineWidth = Math.max(1.1, R * (k === 3 ? 0.05 : 0.04));
      ctx.beginPath(); ctx.arc(cx, cy, rayons[k], -Math.PI / 2 + t * 0.3, -Math.PI / 2 + t * 0.3 + u * TAU); ctx.stroke();
      q.cases.forEach((sid, j) => {
        if (u < (j + 1) / (q.cases.length + 0.4)) return;
        const sl = sid.startsWith('mod') ? lay.mods[+sid.slice(3)] : lay[sid], id = sid.startsWith('mod') ? s.mods[+sid.slice(3)] : s[sid];
        if (!sl || !id || typeof id !== 'string') return;
        glyph(ctx, sid === 'filtre' ? 'f_' + id : sid === 'cible' ? 'c_' + id : id, sl.x, sl.y, Math.max(2.4, sl.r * 0.75), /^core/.test(sid) ? DATA.CORES[id].couleur : INK, 3);
      });
    });
    ctx.restore();
  }
  // ---------- relecture : ce que coûte chaque anneau, et les glyphes qui ne servent à rien ici ----------
  function coutCase(s, sid) {
    const T = taille(s), m = (v) => v * T.coutMul;
    if (sid === 'core') return s.core ? m(DATA.CORES[s.core].cout) : 0;
    if (sid === 'core2') return s.core2 && s.taille !== 'petit' ? m(DATA.CORES[s.core2].cout + 2) : 0;
    if (sid === 'core3') return s.core3 && s.taille === 'grand' ? m(DATA.CORES[s.core3].cout + 3) : 0;
    if (sid === 'shape') return s.shape ? m(DATA.SHAPES[s.shape].cout) : 0;
    if (sid === 'trigger') return s.trigger ? m(DATA.TRIGGERS[s.trigger].cout) : 0;
    if (sid === 'trigger2') return s.trigger2 && s.taille === 'grand' ? m(DATA.TRIGGERS[s.trigger2].cout) : 0;
    if (sid === 'filtre') return s.filtre && s.taille !== 'petit' ? m(DATA.FILTRES[s.filtre].cout) : 0;
    if (sid === 'cible') return s.cible && s.taille !== 'petit' ? m(DATA.CIBLES[s.cible].cout) : 0;
    if (sid.startsWith('mod')) { const q = s.mods[+sid.slice(3)]; return !q ? 0 : m(isSub(q) ? cost(q.sub) : DATA.MODS[q].cout); }
    return 0;
  }
  function coutDetail(s) {
    const T = taille(s), m = T.coutMul, sur = s.taille !== 'petit' && DATA.DIMS[s.shape] ? Math.max(-2, Math.round((Math.sqrt((s.dimL || 1) * (DATA.DIMS[s.shape].h ? s.dimH || 1 : 1)) - 1) * 3)) : 0;
    const somme = (ids) => ids.reduce((a, k) => a + coutCase(s, k), 0);
    const parts = [
      { cle: 'centre', nom: 'Centre', v: coutCase(s, 'core') },
      { cle: 'fusion', nom: 'Fusion', v: somme(['core2', 'core3']) },
      { cle: 'forme', nom: 'Forme', v: coutCase(s, 'shape') + sur * m },
      { cle: 'mods', nom: 'Second anneau', v: somme(s.mods.map((q, i) => 'mod' + i)) },
      { cle: 'pointes', nom: 'Pointes', v: somme(['trigger', 'trigger2', 'filtre', 'cible']) },
    ].filter((q) => q.v);
    if (T.coutAdd) parts.push({ cle: 'taille', nom: T.nom + ' sceau', v: T.coutAdd });
    if (equilibre(s).etat === 'equilibre') parts.push({ cle: 'equilibre', nom: 'Équilibré', v: -10, pct: true });
    return { parts, total: cost(s), mul: m };
  }
  const PROJ = ['projectile', 'chaine'];
  // un modificateur n'agit que sur certaines formes
  const SEULEMENT = { rebond: PROJ, teleguide: PROJ.concat(['soi']), orbite: PROJ, percant: PROJ, boomerang: PROJ, spirale: PROJ, zigzag: PROJ, rasesol: PROJ, cloche: ['projectile'], vitesse: PROJ.concat(['vague']), rafale: PROJ.concat(['trait', 'soi']), double: PROJ.concat(['zone', 'mur', 'trait', 'invocation', 'soi']) };
  const JAMAIS = { canalise: ['projectile', 'soi', 'chaine', 'prise'], portee: ['aura'] };
  // sur soi : ce que chaque essence du centre sait faire de la Portée, d'une cible, d'un élan
  const SOI_PORTEE = ['foudre', 'lumiere', 'portail', 'vie', 'esprit', 'gravite'], SOI_CIBLE = ['feu', 'eau', 'vent', 'terre', 'vie', 'lumiere', 'foudre', 'portail', 'esprit', 'gravite'];
  const SOI_ELAN = ['feu', 'eau', 'vent', 'terre', 'vie', 'foudre'];
  const DE_CORE = (c) => { const n = DATA.CORES[c] ? DATA.CORES[c].nom : c; return (/^[AEÉIOU]/.test(n) ? 'de l\'' : ['feu', 'vent', 'temps', 'contre', 'portail', 'esprit'].includes(c) ? 'du ' : 'de la ') + n; };
  function inutiles(s) {
    const out = [], sh = s.shape, nb = nbSlots(s, NMODS);
    const nomF = (id) => (DATA.SHAPES[id] ? DATA.SHAPES[id].nom : id);
    const cores = [s.core, s.taille !== 'petit' ? s.core2 : null, s.taille === 'grand' ? s.core3 : null].filter(Boolean), ef = effets(s);
    s.mods.forEach((q, i) => {
      if (!q || isSub(q) || i >= nb) return; const D = DATA.MODS[q]; if (!D) return; const sid = 'mod' + i;
      if (sh && SEULEMENT[q] && !SEULEMENT[q].includes(sh)) out.push({ sid, raison: D.nom + ' ne sert qu\'aux formes ' + SEULEMENT[q].map(nomF).join(', ') + '.' });
      else if (sh && JAMAIS[q] && JAMAIS[q].includes(sh)) out.push({ sid, raison: D.nom + ' ne fait rien sous la forme ' + nomF(sh) + '.' });
      else if (sh === 'soi' && q === 'portee' && !SOI_PORTEE.includes(s.core)) out.push({ sid, raison: 'Sur soi, la Portée ne change rien à l\'élan ' + DE_CORE(s.core) + '.' });
      else if (sh === 'soi' && q === 'teleguide' && !['foudre', 'vie', 'terre'].includes(s.core)) out.push({ sid, raison: 'Sur soi, Téléguidé ne courbe qu\'un élan en course (Foudre, Vie, Terre qui s\'abat).' });
      else if (D.aspect && !cores.includes(D.aspect)) out.push({ sid, raison: D.nom + ' est un aspect de l\'essence ' + DATA.CORES[D.aspect].nom + ', absente de ce sceau.' });
      else if (D.langue && !ef.includes(D.langue)) out.push({ sid, raison: D.nom + ' est un mot ' + ((DATA.LANGAGES[D.langue] || {}).de || D.langue) + ', absent de ce sceau.' });
      else if (q === 'matiere' && ef.length && !ef.some((e) => DATA.MATIERE[e])) out.push({ sid, raison: 'Matière : aucun effet de ce sceau n\'a de matière à rendre solide.' });
    });
    if (s.taille !== 'petit' && s.core2 && s.core2 === s.core) out.push({ sid: 'core2', raison: 'Deux fois la même essence : elles ne fusionnent pas.' });
    if (s.taille === 'grand' && s.core3 && (s.core3 === s.core || s.core3 === s.core2)) out.push({ sid: 'core3', raison: 'Cette essence est déjà dans le sceau.' });
    if (s.taille === 'grand' && s.trigger2 && s.trigger2 === s.trigger) out.push({ sid: 'trigger2', raison: 'Le même déclencheur, deux fois.' });
    if (s.taille !== 'petit' && s.filtre && sh && !(PROJ.includes(sh) || (sh === 'zone' && triggers(s).some((t) => t === 'contact' || t === 'proximite')))) out.push({ sid: 'filtre', raison: 'Un filtre ne sert qu\'aux projectiles, ou à une zone posée en piège (Au contact, À proximité).' });
    if (s.taille !== 'petit' && s.cible && (sh === 'aura' || (sh === 'soi' && !SOI_CIBLE.includes(s.core)))) out.push({ sid: 'cible', raison: sh === 'aura' ? 'En aura, le sort ne vise rien : la cible ne sert pas.' : 'Sur soi, cette essence ne vise rien : la cible ne sert pas.' });
    return out;
  }
  function count(s, mod) {
    return s.mods.filter((m) => m === mod).length;
  }
  function modId(m) { return isSub(m) ? 'sous' : m; }
  // Un sceau sans glyphe d'effet est un pétard. Sans forme : effet faible sur soi.
  function etat(s) {
    if (!s.core) return { ok: false, raison: 'Pas de glyphe d\'effet : ce sceau ne fera qu\'un pétard de fumée.' };
    if (!s.shape) return { ok: false, raison: 'Pas de forme : l\'effet se répandra mollement autour de toi.' };
    return { ok: true, raison: s.trigger ? '' : 'Pas de déclencheur : l\'effet sera immédiat.' };
  }
  function comboName(s) {
    const ef = effets(s); if (ef.length < 2) return null;
    const k = DATA.comboCle(ef); const I = k && DATA.comboInfo(k);
    return I && api.comboConnu(k) ? I.nom : null;
  }
  function autoNom(s) {
    if (!s.core) return 'Pétard';
    let n = comboName(s) || (s.core2 ? DATA.CORES[s.core].nom + '-' + DATA.CORES[s.core2].nom.toLowerCase() + (s.core3 && s.taille === 'grand' ? '-' + DATA.CORES[s.core3].nom.toLowerCase() : '') : DATA.CORES[s.core].nom);
    if (s.shape) n = DATA.SHAPES[s.shape].nom + (/^[aeiouéèêh]/i.test(n) ? ' d\'' : ' de ') + n.toLowerCase();
    const mods = s.mods.filter(Boolean);
    if (mods.length) n += ' ' + mods.map((m) => (isSub(m) ? '« ' + nom(m.sub) + ' »' : DATA.MODS[m].nom.toLowerCase())).join(', ');
    const tr = triggers(s).filter((t) => t !== 'immediat'); if (tr.length) n += ' (' + tr.map((t) => DATA.TRIGGERS[t].nom.toLowerCase()).join(', ') + ')';
    if (s.taille === 'petit') n = 'Petit ' + n.charAt(0).toLowerCase() + n.slice(1); else if (s.taille === 'grand') n = 'Grand ' + n.charAt(0).toLowerCase() + n.slice(1);
    return n;
  }
  function nom(s) {
    return s.nom || autoNom(s);
  }
  // niveau de langage par élément (deux glyphes au plus)
  // aspects qui changent la nature d'une essence : { essence: { id, devient, n } } (le premier posé l'emporte)
  function aspects(s) { const o = {}; for (const m of s.mods) { if (typeof m !== 'string') continue; const A = DATA.MODS[m]; if (!A || !A.devient) continue; const L = o[A.aspect] || (o[A.aspect] = []); const q = L.find((x) => x.id === m); if (q) q.n = Math.min(2, q.n + 1); else L.push({ id: m, devient: A.devient, n: 1 }); } return o; }
  // effets réels du sceau : chaque essence, avec son aspect
  function effets(s) { const a = aspects(s); const cores = [s.core]; if (s.core2 && s.taille !== 'petit') cores.push(s.core2); if (s.core3 && s.taille === 'grand') cores.push(s.core3); const out = []; cores.filter(Boolean).forEach((c, k, L) => { if (a[c] && k === L.lastIndexOf(c)) for (const A of a[c]) out.push(A.devient); else out.push(c); }); return out; }
  function langues(s) { const o = {}; for (const el in DATA.LANGAGES) { const k = count(s, DATA.LANGAGES[el].glyphe); if (k) o[el] = Math.min(2, k); } return o; }
  function params(s) {
    const L = liaisons(s);
    const n = (m) => s.mods.filter((q, i) => q === m && !L[i]).length;
    // Puissance ou Inverser posés juste sous une essence fusionnée ne servent qu'elle
    const ess = {}, invEss = [];
    for (const i in L) { const m = s.mods[i]; for (const e of effetsDe(s, L[i])) { if (m === 'puissance') (ess[e] || (ess[e] = { n: 0 })).n++; if (m === 'inverser' && !invEss.includes(e)) invEss.push(e); } }
    { const pg = 1 + 0.6 * n('puissance'); for (const e in ess) ess[e].pk = (pg + 0.6 * ess[e].n) / pg; }
    return {
      ess, invEss, liaisons: L,
      power: 1 + 0.6 * n('puissance'),
      range: 1 + 0.5 * n('portee'),
      duration: 1 + 0.8 * n('duree'),
      size: (1 + 0.5 * n('taille')) * Math.pow(0.55, n('reduire')),
      bounces: n('rebond') * 2,
      persist: n('persistance'),
      speed: 1 + 0.4 * n('vitesse'),
      extra: n('double'),
      inverse: n('inverser') > 0,
      echo: n('echo') * 2,
      teleguide: n('teleguide') > 0,
      orbite: n('orbite') > 0,
      canalise: n('canalise') > 0,
      lg: langues(s),
      asp: aspects(s),
      traj: n('boomerang') ? 'boomerang' : n('spirale') ? 'spirale' : n('zigzag') ? 'zigzag' : n('rasesol') ? 'rasesol' : n('cloche') ? 'cloche' : null,
      percant: n('percant') > 0, gerbe: n('gerbe'), matiere: n('matiere') > 0, rafale: n('rafale'),
      dimL: s.taille === 'petit' ? 1 : s.dimL || 1, dimH: s.taille === 'petit' ? 1 : s.dimH || 1,
    };
  }

  // ---------- Dessin des glyphes (icônes vectorielles) ----------
  const ALIAS = { gel: 'froid', corrosion: 'acide', minerai: 'metal', attraction: 'force', fil: 'lien', rembobiner: 'rembobinage' };
  function glyph(ctx, id, x, y, r, color = INK, seed = 1) {
    id = ALIAS[id] || id;
    ctx.save();
    ctx.translate(x, y);
    ctx.strokeStyle = color;
    ctx.fillStyle = color;
    ctx.lineWidth = Math.max(1.2, r * 0.13);
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    const L = (a, b, c, d) => U.inkLine(ctx, a, b, c, d, seed, r * 0.04);
    const C = (cx, cy, rr) => U.inkCircle(ctx, cx, cy, rr, seed, r * 0.04);
    const P = (pts, close = true) => U.inkPoly(ctx, pts, seed, r * 0.04, close);
    const dot = (cx, cy, rr) => { ctx.beginPath(); ctx.arc(cx, cy, rr, 0, TAU); ctx.fill(); };
    switch (id) {
      // --- effets ---
      case 'feu': P([[0, -r], [r * 0.75, r * 0.6], [-r * 0.75, r * 0.6]]); L(0, -r * 0.2, 0, r * 0.45); dot(0, r * 0.2, r * 0.12); break;
      case 'vent': for (let i = -1; i <= 1; i++) { const yy = i * r * 0.45; ctx.beginPath(); ctx.moveTo(-r * 0.8, yy); ctx.quadraticCurveTo(0, yy - r * 0.35, r * 0.8, yy); ctx.stroke(); } break;
      case 'eau': for (let i = -1; i <= 1; i += 2) { const yy = i * r * 0.3; ctx.beginPath(); ctx.moveTo(-r * 0.8, yy); ctx.bezierCurveTo(-r * 0.4, yy - r * 0.5, r * 0.4, yy + r * 0.5, r * 0.8, yy); ctx.stroke(); } dot(0, -r * 0.85, r * 0.12); break;
      case 'terre': P([[-r * 0.85, r * 0.7], [-r * 0.3, -r * 0.6], [r * 0.1, r * 0.1], [r * 0.4, -r * 0.3], [r * 0.85, r * 0.7]]); L(-r * 0.85, r * 0.7, r * 0.85, r * 0.7); break;
      case 'lumiere': C(0, 0, r * 0.4); for (let i = 0; i < 8; i++) { const a = (i / 8) * TAU; L(Math.cos(a) * r * 0.58, Math.sin(a) * r * 0.58, Math.cos(a) * r * 0.95, Math.sin(a) * r * 0.95); } break;
      case 'ombre': ctx.beginPath(); ctx.arc(0, 0, r * 0.85, Math.PI * 0.2, Math.PI * 1.8); ctx.stroke(); ctx.beginPath(); ctx.arc(r * 0.35, 0, r * 0.6, Math.PI * 1.3, Math.PI * 0.7, true); ctx.stroke(); dot(-r * 0.2, -r * 0.1, r * 0.1); break;
      case 'vie': ctx.beginPath(); ctx.moveTo(0, r * 0.9); ctx.quadraticCurveTo(0, 0, r * 0.2, -r * 0.8); ctx.stroke(); ctx.beginPath(); ctx.moveTo(0, r * 0.3); ctx.quadraticCurveTo(-r * 0.9, r * 0.1, -r * 0.55, -r * 0.55); ctx.quadraticCurveTo(0, -r * 0.4, 0, r * 0.3); ctx.stroke(); ctx.beginPath(); ctx.moveTo(r * 0.1, -r * 0.1); ctx.quadraticCurveTo(r * 0.9, -r * 0.3, r * 0.6, -r * 0.9); ctx.quadraticCurveTo(r * 0.1, -r * 0.8, r * 0.1, -r * 0.1); ctx.stroke(); break;
      case 'force': ctx.beginPath(); for (let i = 0; i <= 40; i++) { const t = i / 40; const a = t * TAU * 2.2; const rr = r * 0.95 * (1 - t); const px = Math.cos(a) * rr, py = Math.sin(a) * rr; if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py); } ctx.stroke(); dot(0, 0, r * 0.12); break;
      case 'froid': for (let i = 0; i < 6; i++) { const a = (i / 6) * TAU; L(0, 0, Math.cos(a) * r * 0.9, Math.sin(a) * r * 0.9); L(Math.cos(a) * r * 0.5, Math.sin(a) * r * 0.5, Math.cos(a + 0.5) * r * 0.7, Math.sin(a + 0.5) * r * 0.7); } break;
      case 'foudre': P([[r * 0.2, -r * 0.95], [-r * 0.4, r * 0.05], [r * 0.1, r * 0.05], [-r * 0.2, r * 0.95], [r * 0.5, -r * 0.1], [0, -r * 0.1]], true); break;
      case 'acide': ctx.beginPath(); ctx.moveTo(0, -r * 0.9); ctx.bezierCurveTo(r * 0.9, r * 0.1, r * 0.6, r * 0.9, 0, r * 0.9); ctx.bezierCurveTo(-r * 0.6, r * 0.9, -r * 0.9, r * 0.1, 0, -r * 0.9); ctx.stroke(); dot(-r * 0.25, r * 0.3, r * 0.1); dot(r * 0.2, r * 0.5, r * 0.08); break;
      case 'gravite': C(0, r * 0.3, r * 0.35); L(-r * 0.7, -r * 0.5, r * 0.7, -r * 0.5); P([[-r * 0.3, -r * 0.2], [0, -r * 0.6], [r * 0.3, -r * 0.2]], false); break;
      case 'temps': C(0, 0, r * 0.85); L(0, 0, 0, -r * 0.55); L(0, 0, r * 0.4, r * 0.25); for (let i = 0; i < 4; i++) { const a = (i / 4) * TAU; dot(Math.cos(a) * r * 0.7, Math.sin(a) * r * 0.7, r * 0.07); } break;
      case 'transmutation': P([[-r * 0.8, r * 0.3], [0, -r * 0.8], [r * 0.8, r * 0.3]], true); L(-r * 0.8, r * 0.3, r * 0.8, r * 0.3); C(0, r * 0.55, r * 0.3); break;
      case 'son': for (let i = 1; i <= 3; i++) { ctx.beginPath(); ctx.arc(-r * 0.4, 0, r * 0.3 * i, -Math.PI / 3, Math.PI / 3); ctx.stroke(); } dot(-r * 0.4, 0, r * 0.12); break;
      case 'esprit': C(0, -r * 0.2, r * 0.6); dot(-r * 0.2, -r * 0.3, r * 0.1); dot(r * 0.2, -r * 0.3, r * 0.1); ctx.beginPath(); ctx.moveTo(-r * 0.5, r * 0.5); ctx.quadraticCurveTo(0, r * 1.0, r * 0.5, r * 0.5); ctx.stroke(); break;
      case 'lien': C(-r * 0.45, 0, r * 0.3); C(r * 0.45, 0, r * 0.3); L(-r * 0.15, 0, r * 0.15, 0); break;
      case 'portail': ctx.beginPath(); ctx.ellipse(-r * 0.4, 0, r * 0.3, r * 0.8, 0, 0, TAU); ctx.stroke(); ctx.beginPath(); ctx.ellipse(r * 0.4, 0, r * 0.3, r * 0.8, 0, 0, TAU); ctx.stroke(); ctx.setLineDash([r * 0.15, r * 0.15]); L(-r * 0.4, 0, r * 0.4, 0); ctx.setLineDash([]); break;
      case 'metal': P([[-r * 0.6, r * 0.8], [-r * 0.6, -r * 0.3], [-r * 0.3, -r * 0.8], [r * 0.3, -r * 0.8], [r * 0.6, -r * 0.3], [r * 0.6, r * 0.8]], false); L(-r * 0.6, r * 0.8, -r * 0.6, r * 0.3); L(r * 0.6, r * 0.8, r * 0.6, r * 0.3); break;
      // --- pseudo-effets ---
      case 'creuser': L(-r * 0.8, r * 0.6, r * 0.2, -r * 0.6); P([[r * 0.2, -r * 0.6], [r * 0.8, -r * 0.9], [r * 0.6, -r * 0.2]], true); break;
      case 'fanaison': ctx.beginPath(); ctx.moveTo(0, r * 0.9); ctx.quadraticCurveTo(r * 0.2, 0, r * 0.6, -r * 0.5); ctx.stroke(); L(-r * 0.6, -r * 0.6, r * 0.2, r * 0.2); break;
      case 'neutraliser': C(0, 0, r * 0.7); L(-r * 0.5, 0, r * 0.5, 0); break;
      case 'poids': P([[-r * 0.7, r * 0.5], [r * 0.7, r * 0.5], [r * 0.3, -r * 0.5], [-r * 0.3, -r * 0.5]], true); L(0, -r * 0.5, 0, -r * 0.9); break;
      case 'secheresse': for (let i = 0; i < 3; i++) L(-r * 0.6 + i * r * 0.6, r * 0.6, -r * 0.4 + i * r * 0.6, -r * 0.4); ctx.setLineDash([r * 0.1, r * 0.1]); L(-r * 0.8, r * 0.8, r * 0.8, r * 0.8); ctx.setLineDash([]); break;
      case 'ralentir': C(0, 0, r * 0.85); L(0, 0, 0, -r * 0.55); L(0, 0, -r * 0.4, r * 0.25); break;
      case 'silence': for (let i = 1; i <= 2; i++) { ctx.beginPath(); ctx.arc(-r * 0.4, 0, r * 0.3 * i, -Math.PI / 3, Math.PI / 3); ctx.stroke(); } L(-r * 0.8, -r * 0.8, r * 0.8, r * 0.8); break;
      case 'rouille': P([[-r * 0.6, r * 0.8], [-r * 0.6, -r * 0.3], [-r * 0.3, -r * 0.8], [r * 0.3, -r * 0.8], [r * 0.6, -r * 0.3], [r * 0.6, r * 0.8]], false); dot(0, r * 0.2, r * 0.15); dot(r * 0.3, r * 0.5, r * 0.1); break;
      // --- formes ---
      case 'projectile': L(-r * 0.8, r * 0.5, r * 0.6, -r * 0.5); P([[r * 0.8, -r * 0.7], [r * 0.15, -r * 0.6], [r * 0.7, -r * 0.05]], false); dot(-r * 0.8, r * 0.5, r * 0.18); break;
      case 'soi': C(0, -r * 0.45, r * 0.3); P([[-r * 0.6, r * 0.9], [0, -r * 0.1], [r * 0.6, r * 0.9]]); break;
      case 'zone': C(0, 0, r * 0.35); for (let i = 0; i < 6; i++) { const a = (i / 6) * TAU; dot(Math.cos(a) * r * 0.8, Math.sin(a) * r * 0.8, r * 0.12); } break;
      case 'trait': L(-r * 0.9, r * 0.6, r * 0.9, -r * 0.6); L(-r * 0.9, r * 0.9, -r * 0.5, r * 0.9); L(r * 0.5, -r * 0.9, r * 0.9, -r * 0.9); break;
      case 'aura': C(0, -r * 0.45, r * 0.22); P([[-r * 0.45, r * 0.8], [0, -r * 0.15], [r * 0.45, r * 0.8]]); ctx.setLineDash([r * 0.12, r * 0.12]); C(0, r * 0.1, r * 0.9); ctx.setLineDash([]); break;
      case 'mur': for (let i = 0; i < 3; i++) U.inkRect(ctx, -r * 0.3, -r * 0.9 + i * r * 0.6, r * 0.6, r * 0.5, seed + i, r * 0.03); break;
      case 'totem': L(0, r * 0.9, 0, -r * 0.6); P([[-r * 0.3, -r * 0.6], [0, -r * 0.95], [r * 0.3, -r * 0.6]], true); for (let i = 1; i <= 2; i++) { ctx.beginPath(); ctx.arc(0, -r * 0.3, r * 0.35 * i, Math.PI * 0.15, Math.PI * 0.85, true); ctx.stroke(); } break;
      case 'chaine': dot(-r * 0.7, r * 0.5, r * 0.15); dot(0, -r * 0.5, r * 0.15); dot(r * 0.7, r * 0.3, r * 0.15); L(-r * 0.7, r * 0.5, 0, -r * 0.5); L(0, -r * 0.5, r * 0.7, r * 0.3); break;
      case 'pluie': ctx.beginPath(); for (let k = 0; k < 4; k++) U.inkCircle(ctx, -r * 0.5 + k * r * 0.33, -r * 0.45, r * 0.25, seed + k, r * 0.02); for (let k = 0; k < 3; k++) L(-r * 0.4 + k * r * 0.4, -r * 0.05, -r * 0.5 + k * r * 0.4, r * 0.6); break;
      case 'objet': U.inkRect(ctx, -r * 0.5, -r * 0.2, r, r, seed, r * 0.03); for (let i = 0; i < 4; i++) { const a = (i / 4) * TAU + 0.4; L(Math.cos(a) * r * 0.8, Math.sin(a) * r * 0.8 - r * 0.3, Math.cos(a) * r * 1.0, Math.sin(a) * r * 1.0 - r * 0.3); } break;
      case 'invocation': C(0, r * 0.1, r * 0.4); dot(-r * 0.12, 0, r * 0.07); dot(r * 0.12, 0, r * 0.07); L(0, -r * 0.3, 0, -r * 0.8); L(-r * 0.3, -r * 0.6, 0, -r * 0.8); L(r * 0.3, -r * 0.6, 0, -r * 0.8); break;
      // --- nouveaux effets ---
      case 'metamorphose': ctx.beginPath(); ctx.ellipse(-r * 0.42, -r * 0.2, r * 0.4, r * 0.55, -0.5, 0, TAU); ctx.stroke(); ctx.beginPath(); ctx.ellipse(r * 0.42, -r * 0.2, r * 0.4, r * 0.55, 0.5, 0, TAU); ctx.stroke(); ctx.beginPath(); ctx.ellipse(-r * 0.3, r * 0.5, r * 0.25, r * 0.3, 0.4, 0, TAU); ctx.stroke(); ctx.beginPath(); ctx.ellipse(r * 0.3, r * 0.5, r * 0.25, r * 0.3, -0.4, 0, TAU); ctx.stroke(); L(0, -r * 0.6, 0, r * 0.75); break;
      case 'rembobinage': ctx.beginPath(); ctx.arc(0, 0, r * 0.8, -Math.PI * 0.35, Math.PI * 1.45); ctx.stroke(); P([[r * 0.48, -r * 0.92], [r * 0.5, -r * 0.55], [r * 0.85, -r * 0.62]], false); L(0, 0, 0, -r * 0.45); L(0, 0, -r * 0.35, r * 0.2); break;
      // --- aspects ---
      case 'reduire': C(0, 0, r * 0.25); ctx.setLineDash([r * 0.15, r * 0.15]); C(0, 0, r * 0.85); ctx.setLineDash([]); for (let i = 0; i < 4; i++) { const a = i / 4 * TAU + Math.PI / 4; L(Math.cos(a) * r * 0.75, Math.sin(a) * r * 0.75, Math.cos(a) * r * 0.4, Math.sin(a) * r * 0.4); } break;
      case 'sommeil': U.txt(ctx, 'z', -r * 0.35, r * 0.25, r * 1.1, 'center', color, 'IM Fell English', 'italic'); U.txt(ctx, 'z', r * 0.35, -r * 0.3, r * 0.8, 'center', color, 'IM Fell English', 'italic'); break;
      case 'repulsion': C(0, 0, r * 0.22); for (let i = 0; i < 6; i++) { const a = i / 6 * TAU; L(Math.cos(a) * r * 0.4, Math.sin(a) * r * 0.4, Math.cos(a) * r * 0.9, Math.sin(a) * r * 0.9); P([[Math.cos(a + 0.25) * r * 0.72, Math.sin(a + 0.25) * r * 0.72], [Math.cos(a) * r * 0.92, Math.sin(a) * r * 0.92], [Math.cos(a - 0.25) * r * 0.72, Math.sin(a - 0.25) * r * 0.72]], false); } break;
      case 'fumee': for (const [ax, ay, rr] of [[-r * 0.4, r * 0.2, 0.38], [r * 0.15, -r * 0.1, 0.45], [r * 0.5, r * 0.35, 0.3], [-r * 0.1, -r * 0.55, 0.28]]) C(ax, ay, r * rr); break;
      case 'explosion': P([[0, -r * 0.95], [r * 0.22, -r * 0.3], [r * 0.9, -r * 0.35], [r * 0.35, r * 0.1], [r * 0.6, r * 0.85], [0, r * 0.38], [-r * 0.6, r * 0.85], [-r * 0.35, r * 0.1], [-r * 0.9, -r * 0.35], [-r * 0.22, -r * 0.3]]); break;
      case 'courant': for (let i = -1; i <= 1; i++) { const yy = i * r * 0.45; ctx.beginPath(); ctx.moveTo(-r * 0.9, yy); ctx.bezierCurveTo(-r * 0.4, yy - r * 0.3, 0, yy + r * 0.3, r * 0.5, yy); ctx.stroke(); P([[r * 0.35, yy - r * 0.18], [r * 0.7, yy], [r * 0.35, yy + r * 0.18]], false); } break;
      case 'seisme': P([[-r * 0.95, r * 0.6], [-r * 0.5, r * 0.2], [-r * 0.2, r * 0.7], [r * 0.15, r * 0.1], [r * 0.45, r * 0.6], [r * 0.95, r * 0.15]], false); L(-r * 0.6, -r * 0.6, -r * 0.4, -r * 0.2); L(0, -r * 0.8, 0, -r * 0.35); L(r * 0.6, -r * 0.6, r * 0.4, -r * 0.2); break;
      case 'figer': C(0, 0, r * 0.85); L(0, 0, 0, -r * 0.55); L(0, 0, r * 0.4, 0); L(-r * 0.8, -r * 0.8, r * 0.8, r * 0.8); break;
      case 'saut': ctx.setLineDash([r * 0.18, r * 0.14]); ctx.beginPath(); ctx.arc(0, r * 0.4, r * 0.8, Math.PI * 1.05, Math.PI * 1.95); ctx.stroke(); ctx.setLineDash([]); C(-r * 0.78, r * 0.35, r * 0.15); P([[r * 0.55, r * 0.05], [r * 0.8, r * 0.4], [r * 0.45, r * 0.45]], false); break;
      case 'peur': ctx.beginPath(); ctx.ellipse(0, 0, r * 0.85, r * 0.5, 0, 0, TAU); ctx.stroke(); C(0, 0, r * 0.32); dot(0, 0, r * 0.12); L(-r * 0.6, -r * 0.65, -r * 0.3, -r * 0.5); L(r * 0.6, -r * 0.65, r * 0.3, -r * 0.5); break;
      case 'lecture': C(0, -r * 0.15, r * 0.55); dot(-r * 0.18, -r * 0.25, r * 0.08); dot(r * 0.18, -r * 0.25, r * 0.08); for (let i = 0; i < 3; i++) L(-r * 0.6, r * 0.55 + i * r * 0.15, r * 0.6, r * 0.55 + i * r * 0.15); break;
      case 'revelation': ctx.beginPath(); ctx.ellipse(0, 0, r * 0.9, r * 0.45, 0, 0, TAU); ctx.stroke(); C(0, 0, r * 0.25); for (let i = 0; i < 5; i++) { const a = -Math.PI / 2 + (i - 2) * 0.45; L(Math.cos(a) * r * 0.55, Math.sin(a) * r * 0.55, Math.cos(a) * r * 0.95, Math.sin(a) * r * 0.95); } break;
      case 'matiere': P([[0, -r * 0.95], [r * 0.45, -r * 0.1], [r * 0.2, r * 0.9], [-r * 0.2, r * 0.9], [-r * 0.45, -r * 0.1]]); L(0, -r * 0.95, 0, r * 0.9); L(-r * 0.45, -r * 0.1, r * 0.45, -r * 0.1); break;
      case 'rafale': for (let i = 0; i < 3; i++) { const yy = (i - 1) * r * 0.5, xo = (i - 1) * r * 0.2; L(-r * 0.8 + xo, yy, r * 0.5 + xo, yy); P([[r * 0.25 + xo, yy - r * 0.18], [r * 0.55 + xo, yy], [r * 0.25 + xo, yy + r * 0.18]], false); } break;
      case 'zigzag': P([[-r * 0.95, r * 0.2], [-r * 0.6, -r * 0.4], [-r * 0.2, r * 0.4], [r * 0.2, -r * 0.4], [r * 0.6, r * 0.4], [r * 0.95, -r * 0.2]], false); break;
      case 'cloche': ctx.beginPath(); ctx.moveTo(-r * 0.9, r * 0.6); ctx.quadraticCurveTo(0, -r * 1.4, r * 0.75, r * 0.5); ctx.stroke(); P([[r * 0.5, r * 0.35], [r * 0.78, r * 0.6], [r * 0.9, r * 0.25]], false); L(-r * 0.95, r * 0.75, r * 0.95, r * 0.75); break;
      case 'percant': C(0, 0, r * 0.4); L(-r * 0.95, 0, r * 0.95, 0); P([[r * 0.6, -r * 0.3], [r * 0.95, 0], [r * 0.6, r * 0.3]], false); break;
      case 'gerbe': dot(0, r * 0.45, r * 0.16); for (let i = 0; i < 5; i++) { const a = -Math.PI / 2 + (i - 2) * 0.5; L(Math.cos(a) * r * 0.25, r * 0.45 + Math.sin(a) * r * 0.25, Math.cos(a) * r * 0.9, r * 0.45 + Math.sin(a) * r * 0.95); dot(Math.cos(a) * r * 0.95, r * 0.45 + Math.sin(a) * r, r * 0.09); } break;
      case 'tenu': L(0, -r * 0.95, 0, r * 0.15); P([[-r * 0.28, -r * 0.12], [0, r * 0.2], [r * 0.28, -r * 0.12]], false); ctx.beginPath(); ctx.ellipse(0, r * 0.55, r * 0.75, r * 0.24, 0, 0, TAU); ctx.stroke(); dot(0, r * 0.55, r * 0.1); ctx.beginPath(); ctx.arc(0, r * 0.55, r * 0.95, Math.PI * 1.15, Math.PI * 1.35); ctx.stroke(); ctx.beginPath(); ctx.arc(0, r * 0.55, r * 0.95, Math.PI * 1.65, Math.PI * 1.85); ctx.stroke(); break;
      case 'proximite': dot(0, 0, r * 0.15); for (let i = 1; i <= 3; i++) { ctx.globalAlpha = 1 - i * 0.22; ctx.beginPath(); ctx.arc(0, 0, r * 0.3 * i, 0, TAU); ctx.setLineDash([r * 0.12, r * 0.1]); ctx.stroke(); } ctx.setLineDash([]); ctx.globalAlpha = 1; break;
      case 'vague': ctx.beginPath(); ctx.moveTo(-r * 0.95, r * 0.6); ctx.quadraticCurveTo(-r * 0.2, -r * 0.9, r * 0.5, -r * 0.3); ctx.quadraticCurveTo(r * 0.25, 0, r * 0.4, r * 0.3); ctx.stroke(); L(-r * 0.95, r * 0.6, r * 0.95, r * 0.6); P([[r * 0.55, r * 0.15], [r * 0.95, r * 0.6]], false); break;
      case 'colonne': L(-r * 0.3, r * 0.8, -r * 0.3, -r * 0.5); L(r * 0.3, r * 0.8, r * 0.3, -r * 0.5); P([[-r * 0.55, -r * 0.35], [0, -r * 0.95], [r * 0.55, -r * 0.35]], false); L(-r * 0.8, r * 0.8, r * 0.8, r * 0.8); break;
      // --- trajectoires ---
      case 'boomerang': P([[-r * 0.8, -r * 0.5], [0, r * 0.45], [r * 0.8, -r * 0.5]], false); ctx.beginPath(); ctx.arc(0, -r * 0.3, r * 0.75, Math.PI * 0.15, Math.PI * 0.85); ctx.stroke(); break;
      case 'spirale': ctx.beginPath(); for (let i = 0; i <= 40; i++) { const t = i / 40; const x = -r * 0.9 + t * r * 1.8, y = Math.sin(t * TAU * 2.2) * r * 0.5 * Math.min(1, t * 3); if (i) ctx.lineTo(x, y); else ctx.moveTo(x, y); } ctx.stroke(); dot(r * 0.9, Math.sin(TAU * 2.2) * r * 0.5, r * 0.12); break;
      case 'rasesol': L(-r * 0.9, r * 0.65, r * 0.9, r * 0.65); ctx.beginPath(); ctx.moveTo(-r * 0.8, r * 0.35); ctx.lineTo(r * 0.1, r * 0.35); ctx.lineTo(r * 0.35, r * 0.05); ctx.lineTo(r * 0.75, r * 0.05); ctx.stroke(); P([[r * 0.55, -r * 0.2], [r * 0.85, r * 0.05], [r * 0.55, r * 0.3]], false); break;
      // --- langages ---
      case 'chaleur': P([[0, -r * 0.55], [r * 0.5, r * 0.75], [-r * 0.5, r * 0.75]]); for (let i = -1; i <= 1; i++) { ctx.beginPath(); ctx.moveTo(i * r * 0.4, -r * 0.65); ctx.quadraticCurveTo(i * r * 0.4 + r * 0.15, -r * 0.8, i * r * 0.4, -r * 0.98); ctx.stroke(); } break;
      case 'pression': for (let i = 0; i < 3; i++) L(-r * 0.85 + i * r * 0.22, -r * 0.5, -r * 0.85 + i * r * 0.22, r * 0.5); L(-r * 0.2, 0, r * 0.85, 0); P([[r * 0.85, 0], [r * 0.45, -r * 0.35]], false); P([[r * 0.85, 0], [r * 0.45, r * 0.35]], false); break;
      case 'givre': C(0, 0, r * 0.85); for (let i = 0; i < 6; i++) { const a = (i / 6) * TAU; L(0, 0, Math.cos(a) * r * 0.6, Math.sin(a) * r * 0.6); } dot(0, 0, r * 0.14); break;
      case 'densite': U.inkRect(ctx, -r * 0.8, -r * 0.8, r * 1.6, r * 1.6, seed, r * 0.03); U.inkRect(ctx, -r * 0.45, -r * 0.45, r * 0.9, r * 0.9, seed + 1, r * 0.03); ctx.fillRect(-r * 0.18, -r * 0.18, r * 0.36, r * 0.36); break;
      case 'tourbillon': ctx.beginPath(); for (let i = 0; i <= 30; i++) { const t = i / 30; const a = t * TAU * 1.6; const rr = r * 0.9 * t; const px = Math.cos(a) * rr, py = Math.sin(a) * rr * 0.5 + r * 0.6 - t * r * 1.2; if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py); } ctx.stroke(); break;
      case 'tension': P([[-r * 0.9, 0], [-r * 0.5, -r * 0.4], [-r * 0.1, r * 0.4], [r * 0.3, -r * 0.4], [r * 0.7, r * 0.2]], false); dot(-r * 0.9, 0, r * 0.13); dot(r * 0.8, r * 0.25, r * 0.13); break;
      case 'floraison': for (let i = 0; i < 5; i++) { const a = (i / 5) * TAU - Math.PI / 2; C(Math.cos(a) * r * 0.45, Math.sin(a) * r * 0.45, r * 0.3); } dot(0, 0, r * 0.18); break;
      case 'focale': ctx.beginPath(); ctx.ellipse(-r * 0.35, 0, r * 0.22, r * 0.8, 0, 0, TAU); ctx.stroke(); L(-r * 0.95, -r * 0.6, -r * 0.35, -r * 0.6); L(-r * 0.95, r * 0.6, -r * 0.35, r * 0.6); L(-r * 0.35, -r * 0.6, r * 0.6, 0); L(-r * 0.35, r * 0.6, r * 0.6, 0); dot(r * 0.65, 0, r * 0.14); break;
      case 'tenebres': ctx.beginPath(); ctx.arc(0, 0, r * 0.8, Math.PI * 0.25, Math.PI * 1.75); ctx.arc(r * 0.3, 0, r * 0.55, Math.PI * 1.6, Math.PI * 0.4, true); ctx.closePath(); ctx.fill(); dot(r * 0.6, -r * 0.6, r * 0.08); dot(r * 0.8, r * 0.1, r * 0.06); break;
      case 'mordant': ctx.beginPath(); ctx.moveTo(0, -r * 0.9); ctx.bezierCurveTo(r * 0.8, 0, r * 0.55, r * 0.8, 0, r * 0.8); ctx.bezierCurveTo(-r * 0.55, r * 0.8, -r * 0.8, 0, 0, -r * 0.9); ctx.stroke(); P([[-r * 0.4, r * 0.15], [-r * 0.2, r * 0.45], [0, r * 0.15], [r * 0.2, r * 0.45], [r * 0.4, r * 0.15]], false); break;
      case 'masse': dot(0, 0, r * 0.4); for (let i = 0; i < 4; i++) { const a = (i / 4) * TAU + Math.PI / 4; const x1 = Math.cos(a) * r * 0.95, y1 = Math.sin(a) * r * 0.95, x2 = Math.cos(a) * r * 0.6, y2 = Math.sin(a) * r * 0.6; L(x1, y1, x2, y2); } break;
      // --- modificateurs ---
      case 'puissance': L(-r * 0.7, 0, r * 0.7, 0); L(0, -r * 0.7, 0, r * 0.7); dot(r * 0.75, -r * 0.75, r * 0.12); dot(-r * 0.75, r * 0.75, r * 0.12); break;
      case 'portee': L(-r * 0.9, 0, r * 0.9, 0); P([[r * 0.9, 0], [r * 0.4, -r * 0.4]], false); P([[r * 0.9, 0], [r * 0.4, r * 0.4]], false); dot(-r * 0.9, 0, r * 0.15); break;
      case 'duree': P([[-r * 0.6, -r * 0.8], [r * 0.6, -r * 0.8], [-r * 0.6, r * 0.8], [r * 0.6, r * 0.8]]); ctx.globalAlpha *= 0.6; P([[-r * 0.25, r * 0.5], [r * 0.25, r * 0.5], [0, r * 0.15]]); break;
      case 'taille': C(0, 0, r * 0.3); ctx.setLineDash([r * 0.2, r * 0.18]); C(0, 0, r * 0.85); ctx.setLineDash([]); break;
      case 'rebond': P([[-r * 0.8, r * 0.6], [-r * 0.1, -r * 0.6], [r * 0.4, r * 0.3], [r * 0.9, -r * 0.4]], false); break;
      case 'persistance': ctx.beginPath(); ctx.moveTo(-r * 0.9, 0); ctx.bezierCurveTo(-r * 0.9, -r * 0.9, 0, -r * 0.5, 0, 0); ctx.bezierCurveTo(0, r * 0.5, r * 0.9, r * 0.9, r * 0.9, 0); ctx.bezierCurveTo(r * 0.9, -r * 0.9, 0, -r * 0.5, 0, 0); ctx.bezierCurveTo(0, r * 0.5, -r * 0.9, r * 0.9, -r * 0.9, 0); ctx.stroke(); break;
      case 'vitesse': P([[-r * 0.9, -r * 0.6], [-r * 0.3, 0], [-r * 0.9, r * 0.6]], false); P([[-r * 0.1, -r * 0.6], [r * 0.5, 0], [-r * 0.1, r * 0.6]], false); break;
      case 'double': dot(-r * 0.4, 0, r * 0.3); dot(r * 0.4, 0, r * 0.3); ctx.globalAlpha *= 0.6; C(0, 0, r * 0.9); break;
      case 'inverser': ctx.beginPath(); ctx.arc(0, 0, r * 0.7, Math.PI * 0.1, Math.PI * 0.9); ctx.stroke(); ctx.beginPath(); ctx.arc(0, 0, r * 0.7, Math.PI * 1.1, Math.PI * 1.9); ctx.stroke(); P([[-r * 0.9, r * 0.1], [-r * 0.7, r * 0.4], [-r * 0.4, r * 0.15]], false); P([[r * 0.9, -r * 0.1], [r * 0.7, -r * 0.4], [r * 0.4, -r * 0.15]], false); break;
      case 'echo': for (let i = 1; i <= 3; i++) { ctx.globalAlpha = 1 - i * 0.25; C(0, 0, r * 0.3 * i); } break;
      case 'teleguide': ctx.beginPath(); ctx.moveTo(-r * 0.8, r * 0.6); ctx.bezierCurveTo(-r * 0.2, r * 0.6, 0, -r * 0.6, r * 0.6, -r * 0.6); ctx.stroke(); P([[r * 0.6, -r * 0.6], [r * 0.2, -r * 0.7], [r * 0.5, -r * 0.2]], false); C(r * 0.6, -r * 0.6, r * 0.12); break;
      case 'orbite': C(0, 0, r * 0.2); ctx.beginPath(); ctx.ellipse(0, 0, r * 0.9, r * 0.4, -0.5, 0, TAU); ctx.stroke(); dot(r * 0.7, -r * 0.4, r * 0.12); break;
      case 'canalise': L(-r * 0.9, 0, r * 0.3, 0); L(-r * 0.9, -r * 0.3, r * 0.1, -r * 0.3); L(-r * 0.9, r * 0.3, r * 0.1, r * 0.3); dot(r * 0.6, 0, r * 0.2); break;
      case 'sous': C(0, 0, r * 0.9); C(0, 0, r * 0.55); C(0, 0, r * 0.25); break;
      // --- déclencheurs ---
      case 'immediat': for (let i = 0; i < 6; i++) { const a = (i / 6) * TAU + 0.3; L(Math.cos(a) * r * 0.25, Math.sin(a) * r * 0.25, Math.cos(a) * r * 0.9, Math.sin(a) * r * 0.9); } break;
      case 'contact': L(-r * 0.7, -r * 0.7, r * 0.7, r * 0.7); L(-r * 0.7, r * 0.7, r * 0.7, -r * 0.7); C(0, 0, r * 0.9); break;
      case 'retarde': C(0, 0, r * 0.9); L(0, 0, 0, -r * 0.6); L(0, 0, r * 0.45, r * 0.2); break;
      case 'marque': for (let i = 0; i < 5; i++) { const a = -Math.PI / 2 + (i / 5) * TAU, b = a + TAU / 10; L(Math.cos(a) * r * 0.9, Math.sin(a) * r * 0.9, Math.cos(b) * r * 0.38, Math.sin(b) * r * 0.38); L(Math.cos(b) * r * 0.38, Math.sin(b) * r * 0.38, Math.cos(a + TAU / 5) * r * 0.9, Math.sin(a + TAU / 5) * r * 0.9); } break;
      case 'contre': C(0, 0, r * 0.85); L(-r * 0.6, -r * 0.6, r * 0.6, r * 0.6); P([[-r * 0.3, -r * 0.1], [0, -r * 0.4], [r * 0.3, -r * 0.1]], false); break;
      case 'bouclier': ctx.beginPath(); ctx.moveTo(0, -r * 0.9); ctx.quadraticCurveTo(r * 0.85, -r * 0.7, r * 0.75, 0); ctx.quadraticCurveTo(r * 0.5, r * 0.7, 0, r * 0.95); ctx.quadraticCurveTo(-r * 0.5, r * 0.7, -r * 0.75, 0); ctx.quadraticCurveTo(-r * 0.85, -r * 0.7, 0, -r * 0.9); ctx.stroke(); L(0, -r * 0.6, 0, r * 0.6); break;
      case 'commande': U.inkRect(ctx, -r * 0.7, -r * 0.55, r * 1.4, r * 1.1, seed, r * 0.03); U.txt(ctx, 'F', 0, r * 0.02, r * 1.0, 'center', color); break;
      case 'repetition': ctx.beginPath(); ctx.arc(0, 0, r * 0.7, 0.4, TAU - 0.4); ctx.stroke(); P([[r * 0.6, -r * 0.55], [r * 0.7, -r * 0.2], [r * 0.95, -r * 0.4]], false); dot(0, 0, r * 0.15); break;
      case 'expiration': P([[-r * 0.6, -r * 0.8], [r * 0.6, -r * 0.8], [-r * 0.6, r * 0.8], [r * 0.6, r * 0.8]]); for (let i = 0; i < 4; i++) { const a = (i / 4) * TAU + 0.8; L(Math.cos(a) * r * 0.25, r * 0.6 + Math.sin(a) * r * 0.2, Math.cos(a) * r * 0.5, r * 0.6 + Math.sin(a) * r * 0.4); } break;
      default:
        if (id && id.startsWith('f_')) { const F = DATA.FILTRES[id.slice(2)]; P([[-r * 0.9, -r * 0.8], [r * 0.9, -r * 0.8], [r * 0.18, r * 0.25], [r * 0.18, r * 0.9], [-r * 0.18, r * 0.9], [-r * 0.18, r * 0.25]]); if (F) { ctx.restore(); glyph(ctx, F.glyphe, x, y - r * 0.32, r * 0.4, color, seed + 1); ctx.save(); ctx.translate(x, y); } break; }
        if (id && id.startsWith('c_')) { const k = id.slice(2); C(0, 0, r * 0.65); L(-r, 0, -r * 0.4, 0); L(r * 0.4, 0, r, 0); L(0, -r, 0, -r * 0.4); L(0, r * 0.4, 0, r); if (k === 'creature') { dot(-r * 0.15, -r * 0.05, r * 0.1); dot(r * 0.15, -r * 0.05, r * 0.1); } else if (k === 'objet') { U.inkRect(ctx, -r * 0.25, -r * 0.25, r * 0.5, r * 0.5, seed, r * 0.02); } else if (k === 'marque') { ctx.restore(); glyph(ctx, 'marque', x, y, r * 0.35, color, seed); ctx.save(); ctx.translate(x, y); } else dot(0, 0, r * 0.12); break; }
        C(0, 0, r * 0.5);
    }
    ctx.restore();
  }

  // Positions des emplacements pour un sceau de rayon R
  // chaque taille prolonge la précédente : en grandissant, rien ne bouge. 90° : sous la seconde essence ; 165° : face à la troisième
  const MOD_ANGLES = { petit: [90], moyen: [90, 210, 330], grand: [90, 210, 330, 165, 15] };
  function layout(cx, cy, R, tailleId = 'moyen') {
    const slotAt = (rad, angDeg, r) => { const a = (angDeg * Math.PI) / 180; return { x: cx + Math.cos(a) * rad, y: cy + Math.sin(a) * rad, r }; };
    const ang = MOD_ANGLES[tailleId] || MOD_ANGLES.moyen;
    const L = {
      core: { x: cx, y: cy, r: R * 0.27 },
      shape: slotAt(R * 0.5, -90, R * 0.11),
      core2: slotAt(R * 0.5, 90, R * 0.11),
      core3: slotAt(R * 0.5, 180, R * 0.11),
      mods: ang.map((d) => slotAt(R * 0.74, d, R * 0.1)),
      trigger: slotAt(R * 1.0, -90, R * 0.1),
      filtre: slotAt(R * 1.0, 30, R * 0.09),
      cible: slotAt(R * 1.0, 150, R * 0.09),
      trigger2: slotAt(R * 1.0, 90, R * 0.1),
    };
    if (tailleId === 'petit') { L.core2 = null; L.filtre = null; L.cible = null; L.trigger2 = null; }
    if (tailleId === 'moyen') L.trigger2 = null;
    if (tailleId !== 'grand') L.core3 = null;
    return L;
  }
  // liste des emplacements (identifiant + position) pour le test de clic
  function slotList(cx, cy, R, tailleId) {
    const L = layout(cx, cy, R, tailleId); const out = [];
    for (const k of ['core', 'shape', 'core2', 'core3', 'trigger', 'filtre', 'cible', 'trigger2']) if (L[k]) out.push({ id: k, ...L[k] });
    L.mods.forEach((m, i) => out.push({ id: 'mod' + i, ...m }));
    return out;
  }

  // Dessin complet du sceau. opts: {t (temps), slots (nb mods moyen), highlight (id slot), empty, glow, fusion,
  //   accepte (cases où l'on peut déposer le glyphe tenu), survol (case visée), cache (case d'où part le glyphe tenu)}
  function draw(ctx, s, cx, cy, R0, opts = {}) {
    const t = opts.t || 0;
    const tid = s.taille || 'moyen';
    const R = R0 * (tid === 'petit' ? 0.82 : 1);
    const nb = nbSlots(s, opts.slots == null ? 3 : opts.slots);
    const st = etat(s);
    const coul = s.core ? DATA.CORES[s.core].couleur : '#8a7a5a';
    const lay = layout(cx, cy, R, tid);
    ctx.save(); ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    if (s.core && opts.glow !== false) {
      const g = ctx.createRadialGradient(cx, cy, R * 0.1, cx, cy, R * 1.15);
      if (s.core2) g.addColorStop(0, U.hexA(DATA.CORES[s.core2].couleur, 0.35));
      g.addColorStop(s.core2 ? 0.4 : 0, U.hexA(coul, st.ok ? 0.35 : 0.15));
      g.addColorStop(1, U.hexA(coul, 0));
      ctx.fillStyle = g; ctx.beginPath(); ctx.arc(cx, cy, R * 1.15, 0, TAU); ctx.fill();
    }
    // cercles (le grand a un anneau extérieur supplémentaire)
    ctx.strokeStyle = INK;
    ctx.lineWidth = Math.max(1.5, R * 0.025); U.inkCircle(ctx, cx, cy, R, 11, R * 0.012);
    // l'encre spéciale teinte l'anneau extérieur
    if (s.encre && DATA.ENCRES[s.encre]) { const ce = DATA.ENCRES[s.encre].couleur; ctx.save(); ctx.strokeStyle = U.hexA(ce, 0.85); ctx.lineWidth = Math.max(2, R * 0.035); ctx.shadowColor = ce; ctx.shadowBlur = R * 0.08; U.inkCircle(ctx, cx, cy, R * 1.015, 17, R * 0.008); ctx.restore(); ctx.strokeStyle = INK; }
    ctx.lineWidth = Math.max(1, R * 0.015);
    if (tid !== 'petit') U.inkCircle(ctx, cx, cy, R * 0.86, 12, R * 0.01);
    U.inkCircle(ctx, cx, cy, R * 0.62, 13, R * 0.01);
    U.inkCircle(ctx, cx, cy, R * 0.36, 14, R * 0.01);
    if (tid === 'grand') { ctx.setLineDash([R * 0.02, R * 0.03]); U.inkCircle(ctx, cx, cy, R * 1.2, 15, R * 0.01); ctx.setLineDash([]); }
    if (s.core) {
      ctx.save(); ctx.translate(cx, cy); ctx.rotate(t * 0.3);
      ctx.strokeStyle = U.hexA(coul, 0.8); ctx.lineWidth = Math.max(1, R * 0.02);
      for (let i = 0; i < 24; i++) { const a = (i / 24) * TAU; const r1 = R * 0.93, r2 = R * (i % 3 === 0 ? 0.98 : 0.955); ctx.beginPath(); ctx.moveTo(Math.cos(a) * r1, Math.sin(a) * r1); ctx.lineTo(Math.cos(a) * r2, Math.sin(a) * r2); ctx.stroke(); }
      ctx.restore();
    }
    if (s.shape) for (let i = 1; i < 4; i++) { if (tid !== 'petit' && i === 2) continue; const a = -Math.PI / 2 + (i / 4) * TAU; ctx.globalAlpha = 0.45; glyph(ctx, s.shape, cx + Math.cos(a) * R * 0.5, cy + Math.sin(a) * R * 0.5, R * 0.075, INK, 20 + i); ctx.globalAlpha = 1; }
    // pointes : 3 (4 pour le grand)
    const pointes = tid === 'grand' ? [-90, 30, 150, 90] : tid === 'petit' ? [-90] : [-90, 30, 150];
    for (const deg of pointes) {
      const a = deg * Math.PI / 180; ctx.strokeStyle = INK; ctx.lineWidth = Math.max(1, R * 0.015);
      const tx = cx + Math.cos(a) * R * 1.12, ty = cy + Math.sin(a) * R * 1.12, a1 = a + 0.14, a2 = a - 0.14;
      U.inkPoly(ctx, [[cx + Math.cos(a1) * R * 0.98, cy + Math.sin(a1) * R * 0.98], [tx, ty], [cx + Math.cos(a2) * R * 0.98, cy + Math.sin(a2) * R * 0.98]], 30 + deg, R * 0.01, false);
    }
    // halo doré des cases où le glyphe tenu peut aller ; plus franc sur la case visée
    const halo = (sl, sid) => {
      if (!opts.accepte || !opts.accepte.includes(sid)) return;
      const sur = opts.survol === sid;
      ctx.save(); ctx.shadowColor = 'rgba(224,176,80,0.9)'; ctx.shadowBlur = sur ? R * 0.12 : R * 0.06;
      ctx.fillStyle = sur ? 'rgba(224,176,80,0.28)' : 'rgba(224,176,80,0.12)'; ctx.beginPath(); ctx.arc(sl.x, sl.y, sl.r * (sur ? 1.3 : 1.2), 0, TAU); ctx.fill();
      ctx.strokeStyle = '#c08a2a'; ctx.globalAlpha = sur ? 1 : 0.75 + 0.25 * Math.sin(t * 6);
      ctx.lineWidth = Math.max(2.5, R * (sur ? 0.045 : 0.03)); if (!sur) ctx.setLineDash([R * 0.04, R * 0.025]);
      ctx.beginPath(); ctx.arc(sl.x, sl.y, sl.r * (sur ? 1.3 : 1.2), 0, TAU); ctx.stroke(); ctx.restore();
    };
    const slot = (sl, id, kind, enabled, hl, label, sid) => {
      if (!sl) return;
      if (sid && opts.cache === sid) id = null;
      ctx.save();
      ctx.fillStyle = U.hexA('#efe3c4', 0.9); ctx.beginPath(); ctx.arc(sl.x, sl.y, sl.r, 0, TAU); ctx.fill();
      ctx.strokeStyle = enabled ? INK : 'rgba(60,45,30,0.3)'; ctx.lineWidth = Math.max(1, R * 0.014);
      if (!id) ctx.setLineDash([R * 0.03, R * 0.03]);
      if (hl) { ctx.strokeStyle = coul; ctx.lineWidth = Math.max(2, R * 0.03); ctx.setLineDash([]); }
      U.inkCircle(ctx, sl.x, sl.y, sl.r, 50 + sl.x, R * 0.01); ctx.setLineDash([]);
      if (id) {
        const col = kind === 'core' ? coul : kind === 'core2' || kind === 'core3' ? DATA.CORES[id].couleur : kind === 'filtre' ? DATA.FILTRES[id].couleur : kind === 'mod' && DATA.MODS[id] && DATA.MODS[id].aspect ? DATA.CORES[DATA.MODS[id].aspect].couleur : INK;
        const vain = sid && opts.inutiles && opts.inutiles.includes(sid);
        if (vain) ctx.globalAlpha = 0.32;
        glyph(ctx, kind === 'filtre' ? 'f_' + id : kind === 'cible' ? 'c_' + id : id, sl.x, sl.y, sl.r * 0.68, col, 60 + sl.x);
        // sans effet ici : un petit cercle barré
        if (vain) { ctx.globalAlpha = 0.9; const bx = sl.x + sl.r * 0.72, by = sl.y - sl.r * 0.72, br = Math.max(3.5, sl.r * 0.3); ctx.fillStyle = '#efe3c4'; ctx.strokeStyle = '#9a4a3a'; ctx.lineWidth = Math.max(1.2, R * 0.012); ctx.beginPath(); ctx.arc(bx, by, br, 0, TAU); ctx.fill(); ctx.stroke(); ctx.beginPath(); ctx.moveTo(bx - br * 0.7, by + br * 0.7); ctx.lineTo(bx + br * 0.7, by - br * 0.7); ctx.stroke(); }
        if (label) U.txt(ctx, label, sl.x + sl.r * 0.9, sl.y - sl.r * 0.9, Math.max(9, sl.r * 0.55), 'center', '#6b4f2a');
      } else if (opts.empty && !enabled) {
        ctx.strokeStyle = 'rgba(60,45,30,0.3)';
        U.inkLine(ctx, sl.x - sl.r * 0.4, sl.y - sl.r * 0.4, sl.x + sl.r * 0.4, sl.y + sl.r * 0.4, 1, 0.3);
        U.inkLine(ctx, sl.x - sl.r * 0.4, sl.y + sl.r * 0.4, sl.x + sl.r * 0.4, sl.y - sl.r * 0.4, 1, 0.3);
      }
      ctx.restore();
      if (sid) halo(sl, sid);
    };
    // les traits : modificateur lié à son essence, second déclencheur relié à la sienne
    if (opts.traits !== false) {
      ctx.save(); ctx.strokeStyle = '#c08a2a'; ctx.lineWidth = Math.max(1.4, R * 0.018); ctx.setLineDash([R * 0.03, R * 0.022]);
      const L = liaisons(s); for (const i in L) { const a = lay.mods[i], b = lay[L[i]]; if (a && b) { ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke(); } }
      ctx.setLineDash([]); if (enDeuxTemps(s) && lay.trigger2 && lay[s.lien2]) { const a = lay.trigger2, b = lay[s.lien2]; ctx.lineWidth = Math.max(2, R * 0.026); ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.quadraticCurveTo((a.x + b.x) / 2 + R * 0.25, (a.y + b.y) / 2, b.x, b.y); ctx.stroke(); }
      ctx.restore();
    }
    // les cases d'agrandissement : la taille suivante, en pointillés
    if (opts.croissance) for (const g of opts.croissance) { ctx.save(); ctx.strokeStyle = 'rgba(60,45,30,0.4)'; ctx.lineWidth = Math.max(1, R * 0.012); ctx.setLineDash([R * 0.02, R * 0.028]); ctx.fillStyle = 'rgba(239,227,196,0.5)'; ctx.beginPath(); ctx.arc(g.x, g.y, g.r, 0, TAU); ctx.fill(); ctx.stroke(); ctx.setLineDash([]); U.txt(ctx, '+', g.x, g.y + g.r * 0.3, Math.max(9, g.r * 0.9), 'center', 'rgba(60,45,30,0.45)'); halo(g, g.id); ctx.restore(); }
    const lbl = (tr) => (tr === 'retarde' ? s.delai + 's' : tr === 'repetition' ? '/' + s.periode + 's' : null);
    slot(lay.core, s.core, 'core', true, opts.highlight === 'core', null, 'core');
    slot(lay.shape, s.shape, 'shape', true, opts.highlight === 'shape', null, 'shape');
    if (lay.core2 && (opts.fusion || s.core2)) slot(lay.core2, s.core2, 'core2', !!opts.fusion, opts.highlight === 'core2', null, 'core2');
    if (lay.core3 && (opts.fusion || s.core3)) slot(lay.core3, s.core3, 'core3', !!opts.fusion, opts.highlight === 'core3', null, 'core3');
    lay.mods.forEach((sl, i) => {
      const m = s.mods[i];
      if (isSub(m) && opts.cache !== 'mod' + i) {
        ctx.save(); ctx.fillStyle = U.hexA('#efe3c4', 0.9); ctx.beginPath(); ctx.arc(sl.x, sl.y, sl.r, 0, TAU); ctx.fill(); ctx.restore();
        drawMini(ctx, m.sub, sl.x, sl.y, sl.r * 0.95, t);
        if (opts.highlight === 'mod' + i) { ctx.save(); ctx.strokeStyle = coul; ctx.lineWidth = Math.max(2, R * 0.03); U.inkCircle(ctx, sl.x, sl.y, sl.r, 50 + sl.x, R * 0.01); ctx.restore(); }
        halo(sl, 'mod' + i);
      } else slot(sl, isSub(m) ? null : m, 'mod', i < nb, opts.highlight === 'mod' + i, null, 'mod' + i);
    });
    slot(lay.trigger, s.trigger, 'trigger', true, opts.highlight === 'trigger', lbl(s.trigger), 'trigger');
    if (lay.trigger2) slot(lay.trigger2, s.trigger2, 'trigger', true, opts.highlight === 'trigger2', lbl(s.trigger2), 'trigger2');
    if (lay.filtre && (opts.filtres || s.filtre)) slot(lay.filtre, s.filtre, 'filtre', !!opts.filtres, opts.highlight === 'filtre', null, 'filtre');
    if (lay.cible && (opts.cibles || s.cible)) slot(lay.cible, s.cible, 'cible', !!opts.cibles, opts.highlight === 'cible', null, 'cible');
    ctx.restore();
  }

  // Version compacte pour la barre / icônes : juste le centre coloré
  function drawMini(ctx, s, cx, cy, R, t = 0) {
    const coul = s.core ? DATA.CORES[s.core].couleur : '#8a7a5a';
    ctx.save();
    ctx.lineCap = 'round';
    ctx.strokeStyle = INK;
    ctx.lineWidth = 1.5;
    U.inkCircle(ctx, cx, cy, R, 7, 0.6);
    if (s.encre && DATA.ENCRES[s.encre]) { ctx.save(); ctx.strokeStyle = DATA.ENCRES[s.encre].couleur; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(cx, cy, R + 1.5, 0, TAU); ctx.stroke(); ctx.restore(); }
    if (s.core) {
      ctx.save(); ctx.translate(cx, cy); ctx.rotate(t * 0.5);
      ctx.strokeStyle = U.hexA(coul, 0.9); ctx.lineWidth = 1.2;
      for (let i = 0; i < 12; i++) { const a = (i / 12) * TAU; ctx.beginPath(); ctx.moveTo(Math.cos(a) * R * 0.8, Math.sin(a) * R * 0.8); ctx.lineTo(Math.cos(a) * R * 0.92, Math.sin(a) * R * 0.92); ctx.stroke(); }
      ctx.restore();
      glyph(ctx, s.core, cx, cy, R * 0.5, coul, 3);
    }
    if (s.shape) glyph(ctx, s.shape, cx, cy - R * 0.7, R * 0.18, INK, 4);
    if (s.core2) glyph(ctx, s.core2, cx, cy + R * 0.7, R * 0.22, DATA.CORES[s.core2].couleur, 5);
    if (s.core3 && s.taille === 'grand') glyph(ctx, s.core3, cx - R * 0.7, cy, R * 0.22, DATA.CORES[s.core3].couleur, 6);
    ctx.restore();
  }

  const api = { comboConnu: () => true };
  return Object.assign(api, { liaisons, effetsDe, equilibre, tailleMin, tailleBesoin, geste, nGlyphes, enDeuxTemps, scinder, anneaux, partiel, drawTrace, MOD_ANGLES, inutiles, coutDetail, coutCase, aspects, effets, create, clone, cost, count, etat, autoNom, nom, params, glyph, layout, slotList, draw, drawMini, isSub, subs, depth, modId, comboName, taille, nbSlots, triggers, NMODS });
})();
