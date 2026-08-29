/* =========================================================================
   RITUEL — la forge
   Une technique innée ne se choisit pas. Elle se constate.
   Même graine, même destin, sur n'importe quelle machine, pour toujours.
   ========================================================================= */
(function (root) {
  'use strict';
  const JJK = (root.JJK = root.JJK || {});
  const { Rng, cyrb128, normalizeSeed, clamp, titre } = JJK.core;

  /* ---- grammaire française : on ne livre pas « de Le Sang » ---------- */
  const VOY = /[aeiouyàâäéèêëîïôöûüh]/i;
  function fr(s) {
    let t = ' ' + String(s || '').replace(/\s+/g, ' ').trim() + ' ';
    t = t.replace(/\bde Les\b/gi, 'des').replace(/\bde Le\b/gi, 'du')
         .replace(/\bde La\b/g, 'de la').replace(/\bde L'/gi, "de l'")
         .replace(/\bà Les\b/gi, 'aux').replace(/\bà Le\b/gi, 'au')
         .replace(/\bà La\b/g, 'à la').replace(/\bà L'/gi, "à l'")
         .replace(/\bde ([AEIOUYÉÈÊÎÔÛaeiouyéèêîôû])/g, "d'$1")
         .replace(/\bDe ([AEIOUYÉÈÊÎÔÛaeiouyéèêîôû])/g, "D'$1")
         .replace(/\ble ([AEIOUYÉÈÊÎÔÛaeiouyéèêîôû])/g, "l'$1")
         .replace(/\bla ([AEIOUYÉÈÊÎÔÛaeiouyéèêîôû])/g, "l'$1")
         .replace(/'\s+/g, "'");
    return t.trim();
  }
  /* Accord d'un qualificatif. Le français ne pardonne pas « L'Attente Second ». */
  const PREPO = /^(de |du |des |d'|à |au |aux |en |sans |sous |sur |par |contre |pour |avant |après )/i;
  function accorder(mot, genre, pluriel) {
    let m = String(mot || '').trim();
    if (!m || PREPO.test(m)) return m;              /* « de Nuit » ne s'accorde pas */
    if (/^[a-z]/.test(m) && / /.test(m)) return m;  /* locution : on n'y touche pas */
    const fem = (genre === 'f') || (genre === 'e' && false);
    if (fem) {
      const regles = [
        [/eux$/, 'euse'], [/eur$/, 'euse'], [/if$/, 'ive'], [/el$/, 'elle'],
        [/eil$/, 'eille'], [/et$/, 'ette'], [/ien$/, 'ienne'], [/on$/, 'onne'],
        [/er$/, 'ère'], [/ier$/, 'ière'], [/eur$/, 'euse'], [/ateur$/, 'atrice'],
        [/anc$/, 'anche'], [/ec$/, 'èche'], [/ard$/, 'arde'], [/and$/, 'ande'],
        [/ond$/, 'onde'], [/ain$/, 'aine'], [/ant$/, 'ante'], [/ent$/, 'ente'],
        [/al$/, 'ale'], [/eux$/, 'euse'], [/ct$/, 'cte'], [/ien$/, 'ienne'],
      ];
      for (const [re, rep] of regles) if (re.test(m)) return m.replace(re, rep);
      if (/[^e]$/.test(m) && !/[sxz]$/.test(m)) return m + 'e';
      if (/é$/.test(m)) return m + 'e';
    }
    if (pluriel) return plurielDe(m);
    return m;
  }
  /* Mot-outil : soit le mot entier, soit une forme élidée (d', l', jusqu').
     Sans l'ancre finale, « labyrinthe » passerait pour « la ».           */
  const INVARIABLE = /^(?:de|du|des|la|le|les|un|une|à|au|aux|en|sans|sous|sur|par|et|contre|dans|pour|avant|après|depuis|entre|chez|vers|selon)$|^(?:d|l|qu|jusqu|puisqu|lorsqu)['\u2019]/i;

  /* Le corpus écrit de belles phrases : « Os hyoïde, seul os qui ne touche
     aucun autre ». Un nom de technique veut un syntagme, pas une notice.
     On coupe à la première articulation et on plafonne la longueur.       */
  function raccourcir(phrase, maxMots) {
    let t = String(phrase || '').trim();
    t = t.split(/[,;(—–:]/)[0].trim();                       /* la subordonnée saute */
    t = t.split(/\s+(?:qui|que|dont|où|quand|lorsque)\s+/i)[0].trim();
    const max = maxMots || 3;
    let mots = t.split(/\s+/);
    if (mots.length <= max) return sansJointFinal(t);
    /* on coupe AVANT le premier joint prépositionnel : « ardoise fendue par
       le gel » doit donner « ardoise fendue », jamais « ardoise fendue par ». */
    for (let i = 1; i < mots.length; i++) {
      if (INVARIABLE.test(mots[i])) return sansJointFinal(mots.slice(0, i).join(' '));
    }
    return sansJointFinal(mots.slice(0, max).join(' '));
  }
  /* Un nom ne se termine jamais sur une préposition en suspens. */
  function sansJointFinal(t) {
    let s2 = String(t || '').trim();
    for (let i = 0; i < 3; i++) {
      const m = /\s+\S+$/.exec(s2);
      if (!m) break;
      const dernier = m[0].trim();
      if (INVARIABLE.test(dernier) || /['\u2019]$/.test(dernier)) s2 = s2.slice(0, m.index).trim();
      else break;
    }
    return s2 || String(t || '').trim();
  }
  function plurielMot(m) {
    if (!m || INVARIABLE.test(m)) return m;
    if (/[sxz]$/.test(m)) return m;
    if (/(au|eau|eu)$/.test(m)) return m + 'x';
    if (/al$/.test(m)) return m.replace(/al$/, 'aux');
    if (/ail$/.test(m)) return m;
    return m + 's';
  }
  /* « lait tourné » → « laits tournés ». Dès qu'une préposition apparaît,
     la suite est un complément : on n'y touche plus. « peau de tambour »
     donne « peaux de tambour », jamais « peaux de tambours ».            */
  function plurielDe(mot) {
    const m = String(mot || '').trim();
    if (!m) return m;
    const mots = m.split(' ');
    let stop = false;
    return mots.map(w => {
      if (stop) return w;
      if (INVARIABLE.test(w) && !/^(la|le)$/i.test(w)) { stop = true; return w; }
      return plurielMot(w);
    }).join(' ');
  }

  /* « La Rouille » → { nu: 'Rouille', genre: 'f', art: 'la' } */
  function decoupe(nom) {
    const s = String(nom || '').trim();
    let m = /^(Les|Le|La|L['’]|Des|Du|De la|De l['’]|De)\s*/i.exec(s);
    if (!m) return { nu: s, genre: 'm', art: 'le', pluriel: false };
    const a = m[1].toLowerCase().replace('’', "'");
    const nu = s.slice(m[0].length).trim() || s;
    const pluriel = a === 'les' || a === 'des';
    const genre = pluriel ? 'p' : (a === 'la' || a === 'de la' ? 'f' : (a === "l'" || a === "de l'" ? (VOY.test(nu[0]) ? 'e' : 'm') : 'm'));
    const art = pluriel ? 'les' : (genre === 'f' ? 'la' : (genre === 'e' ? "l'" : 'le'));
    return { nu, genre, art, pluriel };
  }
  function avecArticle(nom) {
    const d = decoupe(nom);
    return fr(d.art + (d.art === "l'" ? '' : ' ') + d.nu);
  }

  /* ---- composition japonaise ----------------------------------------- */
  const KANJI_SUF = [
    { k: '術', r: 'jutsu' }, { k: '呪法', r: 'juhō' }, { k: '縛', r: 'baku' },
    { k: '律', r: 'ritsu' }, { k: '蝕', r: 'shoku' }, { k: '帳', r: 'chō' },
    { k: '環', r: 'kan' }, { k: '秤', r: 'hakari' }, { k: '骸', r: 'mukuro' },
    { k: '灯', r: 'tō' }, { k: '簿', r: 'bo' }, { k: '轍', r: 'wadachi' },
  ];
  const KANJI_PRE = [
    { k: '', r: '' }, { k: '', r: '' }, { k: '逆', r: 'gyaku' }, { k: '真', r: 'shin' },
    { k: '黒', r: 'koku' }, { k: '無', r: 'mu' }, { k: '深', r: 'shin' }, { k: '虚', r: 'kyo' },
  ];

  /* ---- accès tolérant au corpus --------------------------------------- */
  function C() { return JJK.CORPUS || {}; }
  function liste(k, fallback) {
    const c = C();
    const v = c[k];
    if (Array.isArray(v) && v.length) return v;
    if (v && typeof v === 'object') {
      for (const key in v) if (Array.isArray(v[key]) && v[key].length) return v[key];
    }
    return fallback || [];
  }

  /* affinité stable entre deux entrées : ni hasard, ni arbitraire */
  function affinite(a, b) { return cyrb128('lien:' + a + '::' + b)[1] % 1000; }
  function meilleur(pool, ref, R, top) {
    if (!pool.length) return null;
    const notes = pool.map(o => ({ o, n: affinite(ref, o.id || o.nom || '') }));
    notes.sort((x, y) => y.n - x.n);
    const court = notes.slice(0, Math.max(1, Math.min(top || 4, notes.length)));
    return R.pick(court).o;
  }

  /* ---- noms de technique ---------------------------------------------- */
  /* Chaque patron est répété selon le poids qu'on veut lui donner : les
     tournures pauvres en entropie (la loi seule) doivent rester rares,
     sinon deux graines sur dix portent le même nom.                      */
  const PATRONS = [
    [1, p => fr(p.LOI)],
    [3, p => fr(p.LOI + ' de ' + p.ESSENCE_ART)],
    [2, p => fr('Technique de ' + p.ESSENCE_ART)],
    [3, p => fr(p.NOMBRE_MATIERE)],
    [3, p => fr(p.ESSENCE_NU + ' ' + accorder(p.SUFFIXE, p.GENRE))],
    [3, p => fr(p.PREFIXE + ' de ' + p.ESSENCE_ART)],
    [3, p => fr(p.MATIERE + ' de ' + p.ESSENCE_ART)],
    [3, p => fr(p.LOI + ' : ' + p.NOMBRE_MATIERE)],
    [3, p => fr(p.ESSENCE_ART + ' ' + accorder(p.SUFFIXE, p.GENRE))],
    [2, p => fr(p.PREFIXE + ' ' + accorder(p.SUFFIXE, 'm'))],
    [2, p => fr('Doctrine de ' + p.ESSENCE_ART)],
    [3, p => fr(p.ORGANE + ' de ' + p.ESSENCE_ART)],
    [3, p => fr(p.ESSENCE_ART + ' de ' + p.MATIERE)],
    [3, p => fr(p.PREFIXE + ' de ' + p.MATIERE)],
    [2, p => fr(p.MATIERE + ', ' + accorder(p.SUFFIXE, 'm'))],
    [2, p => fr(p.ORGANE + ' de ' + p.MATIERE)],
  ].reduce((acc, [n, f]) => { for (let i = 0; i < n; i++) acc.push(f); return acc; }, []);

  /* ---- la forge --------------------------------------------------------
     Tout ce qui suit ne dépend que de la graine. Rien d'autre.           */
  function forgeTechnique(rawSeed) {
    const seed = normalizeSeed(rawSeed) || 'sans nom';
    const R = new Rng('technique:' + seed);

    const essences = liste('essences'), vecteurs = liste('vecteurs'), lois = liste('lois');
    const domaines = liste('domaines'), matieres = (C().matieres || {});
    const nomen = C().nomenclature || {};

    const essence = R.pick(essences) || { id: 'x', nom: 'La Cendre', kanji: '灰', romaji: 'hai', concept: '', sensoriel: '', couleur: '#b31217', emotion_source: '' };
    const loi = meilleur(lois, essence.id || essence.nom, R.fork('loi'), 5) || { id: 'y', nom: 'Loi muette', enonce: '', archetype: 'seuil' };
    const vecteur = meilleur(vecteurs, (loi.id || '') + (essence.id || ''), R.fork('vecteur'), 5) || { id: 'z', nom: 'Par le contact', condition: '', portee: 'contact' };
    const domaine = meilleur(domaines, (loi.id || '') + ':' + (essence.id || ''), R.fork('domaine'), 4) || null;

    const matiere = raccourcir(R.pick(matieres.matieres || ['cendre']), 3);
    /* « Un Demi Cendres » n'existe pas ; « Zéro Cendre » si. */
    const nombres = (matieres.nombres || ['Neuf'])
      .filter(x => !/^(un|une|un demi|une demie|zéro)$/i.test(String(x).trim()));
    const nombre = R.pick(nombres.length ? nombres : ['Neuf']);
    const lieu = R.pick(matieres.lieux || ['une salle sans porte']);
    /* on retire l'article AVANT de raccourcir, sinon « le labyrinthe de
       l'oreille interne » se réduit à « le », ce qui ne nomme rien.      */
    const organe = raccourcir(String(R.pick(matieres.organes || ['la moelle']))
      .replace(/^(les|le|la|l['\u2019]|des|du|de\s+l['\u2019]|de\s+la|de)\s*/i, ''), 3);
    const prefixe = R.pick(nomen.prefixes || ['Rite']);
    const suffixe = R.pick(nomen.suffixes || ['Perpétuel']);

    const d = decoupe(essence.nom);
    /* « Neuf Lait Tourné » est une faute ; « Neuf Laits Tournés » n'en est pas une.
       On a par ailleurs écarté « Un » : le genre d'une matière est incertain. */
    const matiereN = titre(plurielDe(matiere));
    const jetons = {
      ESSENCE: essence.nom, ESSENCE_NU: d.nu, ESSENCE_ART: avecArticle(essence.nom),
      GENRE: d.pluriel ? 'p' : d.genre,
      LOI: loi.nom, VECTEUR: vecteur.nom, NOMBRE: nombre,
      MATIERE: titre(matiere), NOMBRE_MATIERE: nombre + ' ' + matiereN,
      PREFIXE: prefixe, SUFFIXE: suffixe, ORGANE: titre(organe),
    };
    let nom = titre(sansJointFinal(PATRONS[R.int(PATRONS.length)](jetons)));
    /* deux techniques de même nom, c'est une insulte au registre */
    nom = nom.replace(/\s+/g, ' ').trim();

    const kp = R.pick(KANJI_PRE), ks = R.pick(KANJI_SUF);
    const nomJp = (kp.k || '') + (essence.kanji || '呪') + ks.k;
    const romaji = ((kp.r ? kp.r + '-' : '') + (essence.romaji || 'ju') + '-' + ks.r).replace(/--+/g, '-');

    const couleur = essence.couleur && /^#[0-9a-f]{3,8}$/i.test(essence.couleur) ? essence.couleur : '#b31217';

    return {
      seed, graineBrute: String(rawSeed || ''),
      nom, nomJp, romaji, couleur,
      essence, vecteur, loi, domaine,
      matiere, nombre, lieu, organe,
      sigil: 'sceau:' + seed,
      archetype: loi.archetype || 'seuil',
      revers: loi.inversion || '',
      maximum: loi.maximum || '',
    };
  }

  /* ---- le réceptacle : ce que le corps fait de la technique ------------
     Les réponses au rituel ne changent PAS la technique.
     Elles changent seulement la manière dont le corps la supporte.      */
  const AXES = ['vigueur', 'flux', 'tranchant', 'lucidite', 'inversion'];
  const POIDS_ARCHETYPE = {
    soustraction: { tranchant: 2.0, lucidite: 1.2, vigueur: 0.6, flux: 1.0, inversion: 0.7 },
    'échange':    { flux: 2.0, inversion: 1.5, lucidite: 1.0, vigueur: 0.8, tranchant: 0.8 },
    'répétition': { flux: 1.7, vigueur: 1.4, tranchant: 1.1, lucidite: 0.8, inversion: 1.0 },
    mesure:       { lucidite: 2.1, tranchant: 1.2, flux: 1.0, vigueur: 0.8, inversion: 0.9 },
    lien:         { inversion: 1.9, vigueur: 1.5, flux: 1.1, lucidite: 1.0, tranchant: 0.6 },
    seuil:        { vigueur: 2.0, tranchant: 1.3, inversion: 1.0, flux: 0.9, lucidite: 0.8 },
    'témoignage': { lucidite: 1.8, flux: 1.4, inversion: 1.2, tranchant: 0.8, vigueur: 0.9 },
    'métamorphose': { tranchant: 1.6, flux: 1.4, vigueur: 1.2, inversion: 1.1, lucidite: 0.8 },
  };

  function forgeReceptacle(rawSeed, reponses) {
    const seed = normalizeSeed(rawSeed) || 'sans nom';
    const R = new Rng('corps:' + seed + ':' + (reponses || []).join(','));
    const poids = { vigueur: 1, flux: 1, tranchant: 1, lucidite: 1, inversion: 1 };
    (reponses || []).forEach(a => {
      const p = POIDS_ARCHETYPE[a];
      if (!p) return;
      AXES.forEach(k => { poids[k] += (p[k] || 1) * 0.55; });
    });
    /* répartition à budget fixe : on ne peut pas être bon partout */
    const brut = {};
    let somme = 0;
    AXES.forEach(k => { brut[k] = Math.max(0.15, poids[k] * R.range(0.72, 1.34)); somme += brut[k]; });
    const BUDGET = 100;
    const stats = {};
    AXES.forEach(k => { stats[k] = Math.max(6, Math.round((brut[k] / somme) * BUDGET)); });

    const dominante = AXES.slice().sort((a, b) => stats[b] - stats[a])[0];
    const pvMax = 90 + stats.vigueur * 3.4 | 0;
    /* la réserve doit pouvoir contenir une extension du territoire (8),
       sinon la moitié du jeu reste hors d'atteinte quel que soit le talent */
    const enMax = 8 + Math.round(stats.flux / 9);
    const enTour = 2 + (stats.flux >= 26 ? 1 : 0) + (stats.flux >= 40 ? 1 : 0);

    return {
      stats, dominante,
      pvMax, enMax, enTour,
      attaque: 13 + Math.round(stats.tranchant * 0.80),
      crit: clamp(0.05 + stats.lucidite * 0.006, 0.05, 0.42),
      soin: 0.35 + stats.inversion * 0.022,
      puissance: Math.round(stats.tranchant * 1.5 + stats.vigueur * 1.1 + stats.flux * 1.2 + stats.lucidite * 1.0 + stats.inversion * 0.9),
    };
  }

  /* ---- grade : la hiérarchie n'est pas une opinion --------------------- */
  function grade(puissance, sermentsSignes) {
    const grades = liste('grades', []).length ? liste('grades') : (C().nomenclature || {}).grades || [];
    const p = puissance + (sermentsSignes || 0) * 22;
    const tri = grades.slice().sort((a, b) => (a.seuil || 0) - (b.seuil || 0));
    let g = tri[0] || { grade: '4', nom: 'Quatrième grade', description: '' };
    tri.forEach(x => { if (p >= (x.seuil || 0)) g = x; });
    return g;
  }

  /* ---- prose du dossier ------------------------------------------------ */
  function dossier(tech) {
    const e = tech.essence || {}, v = tech.vecteur || {}, l = tech.loi || {};
    const phrases = [];
    if (e.concept) phrases.push(e.concept.replace(/\.$/, '') + '.');
    if (e.sensoriel) phrases.push(e.sensoriel.replace(/\.$/, '') + '.');
    if (l.consequence) phrases.push(l.consequence.replace(/\.$/, '') + '.');
    return phrases.join(' ');
  }
  function minuscule(s) { const t = String(s || ''); return t.charAt(0).toLowerCase() + t.slice(1); }

  JJK.forge = { forgeTechnique, forgeReceptacle, grade, dossier, fr, decoupe, avecArticle, accorder, plurielDe, raccourcir, AXES, affinite, liste };
})(window);
