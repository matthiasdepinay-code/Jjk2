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
    /* « \b » ne borne pas une lettre accentuée en JavaScript : sans le
       « (^|[\s(«"']) » explicite, « à Le » n'était jamais contracté en
       « au » et le registre écrivait « doit à Le Goudron ».              */
    t = t.replace(/\bde Les\b/gi, 'des').replace(/\bde Le\b/gi, 'du')
         .replace(/\bde La\b/g, 'de la').replace(/\bde L'/gi, "de l'")
         .replace(/(^|[\s(«"'])à Les\b/gi, '$1aux').replace(/(^|[\s(«"'])à Le\b/gi, '$1au')
         .replace(/(^|[\s(«"'])à La\b/g, '$1à la').replace(/(^|[\s(«"'])à L'/gi, "$1à l'")
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
  /* Deux prédicats, et ils ne se confondent pas.

     DEBUT_COMPLEMENT repère où commence un complément : « d'un cachet »,
     « l'oreille interne » en font partie, donc l'élision suffit à marquer
     la frontière. Sert à couper une phrase et à borner un accord.

     MOT_OUTIL repère un mot-outil ISOLÉ, pour ne jamais terminer un nom
     sur une préposition en l'air. L'élision doit alors être le mot entier :
     sans cela, « l'Écho » passerait pour une préposition et « Laine
     Mouillée de l'Écho » se réduirait à « Laine Mouillée ».              */
  const DEBUT_COMPLEMENT = /^(?:de|du|des|la|le|les|un|une|à|au|aux|en|sans|sous|sur|par|et|contre|dans|pour|avant|après|depuis|entre|chez|vers|selon)$|^(?:d|l|qu|jusqu|puisqu|lorsqu)['\u2019]/i;
  const MOT_OUTIL = /^(?:de|du|des|la|le|les|un|une|à|au|aux|en|sans|sous|sur|par|et|contre|dans|pour|avant|après|depuis|entre|chez|vers|selon)$|^(?:d|l|qu|jusqu|puisqu|lorsqu)['\u2019]$|^(?:jusqu|qu)['\u2019](?:\u00e0|au|aux)$/i;
  const INVARIABLE = DEBUT_COMPLEMENT;

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
  /* Un lieu ne se raccourcit pas comme une matière. « salle des professeurs »
     réduit à « salle » perd tout son sel, mais « laverie automatique ouverte
     toute la nuit » coupé au quatrième mot donne « ouverte toute », qui ne
     veut plus rien dire. On garde donc UN groupe prépositionnel s'il arrive
     tout de suite, et on s'arrête avant un déterminant orphelin.          */
  const PREP_NUE = /^(?:de|du|des|à|au|aux|en|sur|sous|dans|pour|par|avec|sans|entre|vers|après|avant|depuis)$/i;
  /* « d'attente », « l'hôpital » : la préposition élidée porte déjà son nom.
     La traiter comme une préposition nue faisait ramasser le mot suivant et
     produisait « salle d'attente d'un ».                                  */
  const PREP_ELIDEE = /^[dl]['\u2019]\S/i;
  /* « d'un », « l'une » n'apportent pas de nom : ce sont des prépositions
     déguisées, et les laisser passer donnait « salle d'attente d'un ». */
  const ELIDEE_VIDE = /^[dl]['\u2019](?:un|une)$/i;
  const ORPHELIN = /^(?:tout|toute|tous|toutes|le|la|les|un|une|son|sa|ses|leur|leurs)$/i;
  function raccourcirLieu(txt) {
    const mots = String(txt || '').replace(ARTICLE_INITIAL, '')
      .split(/[,;(—–]| (?:où|dont|que|qui|quand|lorsque) /i)[0]
      .trim().split(/\s+/).filter(Boolean);
    const out = [];
    for (let i = 0; i < mots.length && out.length < 3; i++) {
      const m = mots[i];
      if (PREP_ELIDEE.test(m) && !ELIDEE_VIDE.test(m)) { if (!out.length) break; out.push(m); continue; }
      if (PREP_NUE.test(m) || ELIDEE_VIDE.test(m)) {
        if (out.length === 1 && mots[i + 1]) { out.push(m, mots[i + 1]); i++; continue; }
        break;
      }
      out.push(m);
      if (out.length >= 2 && ORPHELIN.test(mots[i + 1] || '')) break;
    }
    return sansJointFinal(out.join(' ')) || (mots[0] || '');
  }

  /* Le genre d'un lieu est écrit dans le corpus : « une laverie », « le local ».
     Le lire vaut mieux que le deviner — la terminaison en -e disait « la
     vestiaire », et on ne rattrape pas ça avec une exception de plus.     */
  function genreDuLieu(txt) {
    /* l'ordre compte : « une » doit être essayé avant « un », sans quoi
       « une salle » se lit masculin et le registre écrit « du Salle ». */
    const m = /^\s*(les|des|une|un|la|le|l['\u2019])\b/i.exec(String(txt || ''));
    if (!m) return genreMot(txt, 'f');
    const a = m[1].toLowerCase();
    if (a === 'les' || a === 'des') return 'p';
    if (a === 'la' || a === 'une') return 'f';
    if (a === 'le' || a === 'un') return 'm';
    return genreMot(String(txt).replace(ARTICLE_INITIAL, ''), 'f');   /* l' : indécidable */
  }

  /* Un nom ne se termine jamais sur une préposition en suspens. */
  function sansJointFinal(t) {
    let s2 = String(t || '').trim();
    for (let i = 0; i < 3; i++) {
      const m = /\s+\S+$/.exec(s2);
      if (!m) break;
      const dernier = m[0].trim();
      if (MOT_OUTIL.test(dernier)) s2 = s2.slice(0, m.index).trim();
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
  /* Retirer l'article initial d'un syntagme. La frontière de mot est
     obligatoire : sans le « \\s+ », « une salle » perdait « un » et sortait
     en « e salle », puis en « E Salle » une fois mis en titre.           */
  const ARTICLE_INITIAL = /^(?:les|le|la|des|du|un|une|de\s+l['\u2019]|de\s+la|de)\s+|^[ld]['\u2019]/i;

  /* Une matière est écrite sans article : « laine mouillée », « vert-de-gris ».
     Son genre se lit d'abord dans le corpus (une entrée peut être un objet
     { nom, genre }), et seulement à défaut dans la terminaison. La règle
     du -e final se trompe une fois sur cinq ; c'est le corpus qui tranche. */
  const FIN_FEMININE = /(?:tion|sion|ance|ence|ure|té|ité|esse|ie|eur|aille|elle|ette|ine|ade|ée|euse|aine|otte|olle)$/;
  function genreMot(mot, defaut) {
    const tete = String(mot || '').trim().toLowerCase().split(/[\s-]/)[0];
    if (!tete) return defaut || 'm';
    if (FIN_FEMININE.test(tete)) return 'f';
    if (/e$/.test(tete) && !/(?:age|isme|ice|ège|iste|acle|ule|ombre|arbre)$/.test(tete)) return 'f';
    return 'm';
  }
  function articleDe(mot, genre) {
    const m = String(mot || '').trim();
    if (!m) return m;
    if (VOY.test(m[0])) return "l'" + m;
    return (genre === 'f' ? 'la ' : 'le ') + m;
  }
  function accordDe(genre, pluriel) { return (genre === 'f' ? 'e' : '') + (pluriel ? 's' : ''); }

  /* Une banque lexicale peut livrer une chaîne nue ou un objet { nom, genre }.
     Le genre déclaré prime toujours : « une escarre », « un pétale », « une
     oriflamme » ne se devinent pas, et un accord faux se voit dans le titre. */
  function motEtGenre(entree, defaut) {
    if (entree && typeof entree === 'object') {
      return { nom: String(entree.nom || ''), genre: /^[mf]$/.test(entree.genre || '') ? entree.genre : genreMot(entree.nom, defaut) };
    }
    return { nom: String(entree || ''), genre: genreMot(entree, defaut) };
  }

  /* « L'Attente » ne dit pas son genre. Le registre le sait : sans cette
     table, on écrirait « Attente Confidentiel ».                        */
  const GENRE_ESSENCE = {
    echo: 'm', attente: 'f', inventaire: 'm', anesthesie: 'f',
    'eau-dormante': 'f', ankylose: 'f', anonymat: 'm',
  };
  function genreEssence(essence, decoupee) {
    /* Une essence écrite après coup déclare son genre : c'est plus sûr que
       toute heuristique, et la table ci-dessus ne sert plus qu'aux anciennes. */
    if (essence && /^[mfp]$/.test(essence.genre || '')) return essence.genre;
    const g = GENRE_ESSENCE[essence && essence.id];
    if (g) return g;
    if (decoupee.pluriel) return 'p';
    if (decoupee.genre === 'e') return /(tion|sion|ance|ence|ure|ité|esse|ie|ée|elle)$/i.test(decoupee.nu) ? 'f' : 'm';
    return decoupee.genre;
  }

  function avecArticle(nom) {
    const d = decoupe(nom);
    return fr(d.art + (d.art === "l'" ? '' : ' ') + d.nu);
  }

  /* ---- accès tolérant au corpus ---------------------------------------
     Le corpus grossit par lots : rien ici ne doit supposer qu'une clé
     existe déjà, ni qu'une liste est au premier niveau.                  */
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

  /* ---- composition japonaise ------------------------------------------
     L'ancien nom japonais tenait dans une grille fixe préfixe × essence ×
     suffixe : 3 840 combinaisons pour des centaines de millions de fiches.
     Il se compose maintenant de morceaux — l'essence, la loi, un affixe —
     assemblés selon des gabarits, romaji compris.                        */
  const KANJI_SUF_REPLI = [
    { k: '術', r: 'jutsu' }, { k: '呪法', r: 'juhō' }, { k: '縛', r: 'baku' },
    { k: '律', r: 'ritsu' }, { k: '蝕', r: 'shoku' }, { k: '帳', r: 'chō' },
    { k: '環', r: 'kan' }, { k: '秤', r: 'hakari' }, { k: '骸', r: 'mukuro' },
    { k: '灯', r: 'tō' }, { k: '簿', r: 'bo' }, { k: '轍', r: 'wadachi' },
  ];
  const KANJI_PRE_REPLI = [
    { k: '逆', r: 'gyaku' }, { k: '真', r: 'shin' }, { k: '黒', r: 'koku' },
    { k: '無', r: 'mu' }, { k: '深', r: 'shin' }, { k: '虚', r: 'kyo' },
  ];
  function affixes(cle, repli) {
    const v = (C().nomenclature || {})[cle];
    return (Array.isArray(v) && v.length && v.every(x => x && x.k)) ? v : repli;
  }

  /* Gabarits japonais : E = essence, L = loi, P = préfixe, S = suffixe.
     Ceux qui appellent L ne sortent que si la loi porte un kanji.        */
  const GABARITS_JP = [
    ['E', 'S'], ['E', 'S'], ['P', 'E', 'S'], ['L', 'E'], ['E', 'L'],
    ['P', 'L', 'S'], ['L', 'S'], ['P', 'E'], ['E', 'L', 'S'], ['L', 'E', 'S'],
  ];

  function composerJp(essence, loi, R) {
    const piece = {
      E: { k: essence.kanji || '呪', r: essence.romaji || 'ju' },
      L: (loi && loi.kanji) ? { k: loi.kanji, r: loi.romaji || '' } : null,
      P: R.pick(affixes('kanji_pre', KANJI_PRE_REPLI)),
      S: R.pick(affixes('kanji_suf', KANJI_SUF_REPLI)),
    };
    const possibles = GABARITS_JP.filter(g => g.every(c => piece[c] && piece[c].k));
    let g = R.pick(possibles.length ? possibles : [['E', 'S']]);
    /* un nom japonais de six kanji ne se lit plus : on retombe sur deux pièces */
    if ([...g.map(c => piece[c].k).join('')].length > 5) g = [g[0], g[g.length - 1]];
    return {
      kanji: g.map(c => piece[c].k).join(''),
      romaji: g.map(c => piece[c].r).filter(Boolean).join('-')
        .replace(/--+/g, '-').replace(/^-|-$/g, '').toLowerCase(),
    };
  }

  /* ---- noms de technique ----------------------------------------------
     Les patrons sont du CONTENU, pas du code : ils vivent dans le corpus,
     sous forme de gabarits « {LOI} de {ESSENCE_ART} ». Deux réservoirs :
     ceux qui vont à toutes les lois, et ceux qui n'appartiennent qu'à un
     archétype — une loi de mesure ne se nomme pas comme une loi de seuil,
     et c'est là que le registre gagne sa couleur.                        */
  const PATRONS_REPLI = [
    '{LOI} de {ESSENCE_ART}', 'Technique de {ESSENCE_ART}', '{NOMBRE_MATIERE}',
    '{ESSENCE_NU} {SUFFIXE_ESSENCE}', '{PREFIXE} de {ESSENCE_ART}', '{MATIERE} de {ESSENCE_ART}',
    '{LOI} : {NOMBRE_MATIERE}', '{ESSENCE_ART} {SUFFIXE_ESSENCE}', '{PREFIXE} {SUFFIXE_PREFIXE}',
    '{ORGANE} de {ESSENCE_ART}', '{ESSENCE_ART} de {MATIERE}', '{PREFIXE} de {MATIERE}',
    '{MATIERE}, {SUFFIXE_MATIERE}', '{ORGANE} de {MATIERE}',
  ];

  /* Un gabarit sans jeton produirait le même nom pour tout le monde :
     on l'écarte à la lecture du corpus plutôt qu'à l'affichage.          */
  function patronsUtiles(liste) {
    return (Array.isArray(liste) ? liste : []).filter(t => typeof t === 'string' && /\{[A-Z_]+\}/.test(t));
  }
  function reservoirPatrons(archetype) {
    const nomen = C().nomenclature || {};
    const communs = patronsUtiles(nomen.patrons);
    const propres = patronsUtiles((nomen.patrons_archetype || {})[archetype]);
    if (!communs.length && !propres.length) return PATRONS_REPLI;
    /* les patrons d'archétype pèsent double : c'est eux qui donnent le ton */
    return communs.concat(propres, propres);
  }
  /* Deux corrections que les gabarits ne peuvent pas porter eux-mêmes :
     un nombre devant une matière l'accorde au pluriel (« Trois Eaux », pas
     « Trois Eau »), et un participe collé au nom suit le genre de l'essence
     via {ACCORD} — « Le Délestage Divisé », « La Rouille Divisée ».      */
  function remplirPatron(gabarit, p) {
    const g = String(gabarit)
      .replace(/\{NOMBRE\}(\s+)\{MATIERE\}/g, '{NOMBRE}$1{MATIERES}')
      .replace(/\{NOMBRE\}(\s+)\{ORGANE\}/g, '{NOMBRE}$1{ORGANES}');
    return fr(g.replace(/\{([A-Z_]+)\}/g, (m, k) => (p[k] == null ? '' : String(p[k]))));
  }

  /* ---- la forge --------------------------------------------------------
     Une technique n'est plus lue dans un nom : elle est DÉCLARÉE. Les dix
     rubriques du formulaire restreignent le corpus et fixent la mécanique ;
     ce qui reste de latitude est tiré du code de dossier, donc reproductible.
     Deux porteurs qui déclarent la même chose portent la même loi. C'est
     le principe même d'un registre.                                      */

  function T() { return JJK.taxo; }

  /* Une entrée appartient à une famille soit parce que la taxonomie le dit,
     soit parce qu'elle porte elle-même le champ. Ainsi, ajouter une essence
     au corpus avec sa famille suffit : rien à recâbler ici.              */
  function parFamille(entrees, ids, famille) {
    const set = {};
    (ids || []).forEach(i => { set[i] = 1; });
    const gardes = entrees.filter(e => set[e.id] || (famille && e.famille === famille));
    return gardes.length ? gardes : entrees;
  }

  /* classement stable : la famille d'abord, l'affinité ensuite */
  function choisir(pool, ref, R, top) {
    if (!pool.length) return null;
    const notes = pool.map(o => ({ o, n: affinite(ref, o.id || o.nom || '') }));
    notes.sort((a, b) => b.n - a.n);
    return R.pick(notes.slice(0, Math.max(1, Math.min(top || 3, notes.length)))).o;
  }

  /* accès à une sous-liste nommée du corpus, sans supposer sa présence */
  function sousListe(cle, sous) {
    const bloc = (C() || {})[cle];
    if (!bloc) return [];
    const v = bloc[sous];
    return Array.isArray(v) ? v : [];
  }

  /* ---- 天与呪縛 : cinq formes mécaniques, habillées par le corpus ------
     Une restriction céleste n'est pas signée : on naît avec. Elle prive
     réellement, et ce qu'elle rend ne compense jamais tout à fait.       */
  const FORMES_JUBAKU = [
    { id: 'sansEnergie', mots: /énergie maudite|呪力|sans 呪力|réserve|aucun flux/i,
      perte: 'Réserve de 呪力 réduite de moitié.', gain: 'Le corps compense : frappes trois fois plus lourdes.',
      eff: { enMaxDelta: -5, frappeMult: 3.0, degatsMult: 0.85 } },
    { id: 'sansVue', mots: /vue|yeux|voir|aveugle|regard|visage/i,
      perte: 'Les points de vie adverses ne te seront jamais montrés.', gain: 'Tu lis le flux : +30 % de critique.',
      eff: { masqueVieEnnemi: true, critBonus: 0.30 } },
    { id: 'sansDouleur', mots: /douleur|souffrance|sentir|nerf|insensib/i,
      perte: '−25 % de points de vie maximum : rien ne t\'avertit.', gain: 'Fracture et Saignée n\'ont pas de prise sur toi.',
      eff: { pvMaxMult: 0.75, immunise: ['fracture', 'saignee'] } },
    { id: 'sansSommeil', mots: /sommeil|dormir|nuit|repos|fatigue/i,
      perte: '−15 % de points de vie maximum. Le corps ne se répare jamais tout à fait.', gain: '+2 呪力 par battement.',
      eff: { pvMaxMult: 0.85, energieBonus: 2 } },
    { id: 'sansAge', mots: /âge|vieilli|croissance|grandir|enfant|temps qui/i,
      perte: '−20 % de dégâts : rien ne se durcit, jamais.', gain: '+30 % de points de vie maximum.',
      eff: { degatsMult: 0.80, pvMaxMult: 1.30 } },
  ];

  function tirerJubaku(code, R) {
    /* elle est rare : environ un porteur sur cinq en porte une */
    if ((cyrb128('jubaku:' + code)[3] % 100) >= 22) return null;
    const src = sousListe('jubaku', 'restrictions');
    const forme = FORMES_JUBAKU[cyrb128('forme:' + code)[1] % FORMES_JUBAKU.length];
    let choisi = null;
    src.forEach(x => {
      if (choisi) return;
      const texte = [x.privation, x.nom, x.contrepartie].join(' ');
      if (forme.mots.test(texte)) choisi = x;
    });
    if (!choisi && src.length) choisi = R.pick(src);
    return {
      id: forme.id,
      nom: (choisi && choisi.nom) || 'Restriction céleste',
      kanji: (choisi && choisi.kanji) || '天与呪縛', romaji: (choisi && choisi.romaji) || "ten'yo-jubaku",
      privation: (choisi && choisi.privation) || forme.perte,
      contrepartie: (choisi && choisi.contrepartie) || forme.gain,
      constat: (choisi && choisi.constat) || '',
      rarete: (choisi && choisi.rarete) || 3,
      perte: forme.perte, gain: forme.gain, eff: forme.eff,
    };
  }

  function forgeDepuisDeclaration(decl, variante) {
    const tx = T();
    const codeBase = tx.codeDeclaration(decl);
    const v = tx.codeVariante(variante || 0);
    const code = codeBase + (v ? '/' + v : '');
    const R = new Rng('technique:' + code);

    const essences = liste('essences'), vecteurs = liste('vecteurs'), lois = liste('lois');
    const domaines = liste('domaines'), matieres = (C().matieres || {});
    const nomen = C().nomenclature || {};

    /* 1. le substrat choisit la famille d'essences */
    const essence = choisir(parFamille(essences, tx.ESSENCES[decl.substrat], decl.substrat), 'e:' + code, R.fork('essence'), 4)
      || { id: 'x', nom: 'La Cendre', kanji: '灰', romaji: 'hai', concept: '', sensoriel: '', couleur: '#b31217', emotion_source: '' };

    /* 2. l'opérateur restreint les archétypes de loi */
    const archs = tx.ARCHETYPES[decl.operateur] || [];
    const loisOk = lois.filter(l => archs.indexOf(l.archetype) >= 0);
    const loi = choisir(loisOk.length ? loisOk : lois, essence.id + ':' + code, R.fork('loi'), 3)
      || { id: 'y', nom: 'Loi muette', enonce: '', archetype: 'seuil' };

    /* 3. la condition et la portée notent les vecteurs ; on ne filtre pas
          durement, sinon certaines combinaisons ne trouveraient rien */
    const idsCond = tx.CONDITIONS[decl.condition] || [];
    const porteesOk = tx.PORTEES[decl.portee] || [];
    /* Un vecteur déclare lui-même sa clause (condition_tag) ; la liste d'ids
       de la taxonomie ne sert plus que de repli pour les entrées anciennes.
       Ajouter un vecteur au corpus suffit désormais : rien à recâbler. */
    const clause = v => v.condition_tag ? v.condition_tag === decl.condition : idsCond.indexOf(v.id) >= 0;
    const notesVec = vecteurs.map(v => ({
      v, n: (clause(v) ? 1000 : 0)
         + (porteesOk.indexOf(v.portee) >= 0 ? 600 : 0)
         + affinite(loi.id + code, v.id),
    })).sort((a, b) => b.n - a.n);
    const vecteur = (R.fork('vecteur').pick(notesVec.slice(0, 3)) || { v: null }).v
      || { id: 'z', nom: 'Par le contact', condition: '', portee: 'contact' };
    /* Le Bureau ne relève une incompatibilité que si l'écart est réel :
       le corpus n'offre pas un vecteur pour chaque croisement, et une
       rubrique voisine (courte au lieu de moyenne) reste tenue.          */
    const ECHELLE = { 'contact': 0, 'courte': 1, 'moyenne': 2, 'longue': 3, 'illimitée conditionnelle': 3 };
    const DECLAREE = { contact: 0, courte: 1, moyenne: 2, lointaine: 3 };
    const ecart = Math.abs((ECHELLE[vecteur.portee] == null ? 2 : ECHELLE[vecteur.portee]) - (DECLAREE[decl.portee] == null ? 2 : DECLAREE[decl.portee]));
    const tenu = {
      condition: clause(vecteur),
      portee: porteesOk.indexOf(vecteur.portee) >= 0 || ecart <= 1,
      ecart,
    };

    /* 4. le territoire déclaré choisit la famille d'extensions */
    const domaine = choisir(parFamille(domaines, tx.TERRITOIRES[decl.territoire], decl.territoire), loi.id + ':' + code, R.fork('domaine'), 3) || null;

    /* 5. le siège choisit l'organe */
    const re = tx.SIEGES[decl.siege];
    const nomDe = o => String(o && typeof o === 'object' ? o.nom : o || '');
    const organesOk = (matieres.organes || []).filter(o => re && re.test(nomDe(o)));
    const organeBrut = R.fork('organe').pick(organesOk.length ? organesOk : (matieres.organes || ['la moelle']));

    const mMat = motEtGenre(R.pick(matieres.matieres || ['cendre']), 'f');
    const matiere = raccourcir(mMat.nom || 'cendre', 3);
    const genreMatiere = mMat.genre;
    const nombres = (matieres.nombres || ['Neuf'])
      .filter(x => !/^(un|une|un demi|une demie|zéro)$/i.test(String(x).trim()));
    const nombre = R.pick(nombres.length ? nombres : ['Neuf']);
    const lieu = R.pick(matieres.lieux || ['une salle sans porte']);
    const mOrg = motEtGenre(organeBrut, 'm');
    const organe = raccourcir(mOrg.nom.replace(ARTICLE_INITIAL, ''), 3);
    const genreOrgane = mOrg.genre;
    const mPre = motEtGenre(R.pick(nomen.prefixes || ['Rite']), 'm');
    const prefixe = mPre.nom;
    const suffixe = R.pick(nomen.suffixes || ['Perpétuel']);

    const d = decoupe(essence.nom);
    const dl = decoupe(loi.nom || '');
    const g = genreEssence(essence, d);
    const matiereN = titre(plurielDe(matiere));
    const lieuCourt = titre(raccourcirLieu(lieu));
    const jetons = {
      ESSENCE: essence.nom, ESSENCE_NU: d.nu, ESSENCE_ART: avecArticle(essence.nom),
      GENRE: g,
      LOI: loi.nom, VECTEUR: vecteur.nom, VERBE: vecteur.verbe || 'Poser',
      NOMBRE: nombre, MATIERE: titre(matiere), MATIERES: matiereN,
      NOMBRE_MATIERE: nombre + ' ' + matiereN,
      PREFIXE: prefixe, ORGANE: titre(organe), ORGANES: titre(plurielDe(organe)),
      LIEU: lieuCourt,
      /* accords tout prêts : le suffixe suit l'essence, ou reste neutre ;
         {ACCORD} sert aux participes écrits dans les gabarits du corpus */
      /* Un adjectif ou un participe s'accorde toujours avec un nom PRÉCIS :
         le jeton dit lequel, et il le dit en toutes lettres. Un jeton dont
         on doit deviner le référent finit par accorder sur le mauvais mot. */
      SUFFIXE_ESSENCE: accorder(suffixe, g),
      SUFFIXE_MATIERE: accorder(suffixe, genreMatiere),
      SUFFIXE_ORGANE: accorder(suffixe, genreOrgane),
      SUFFIXE_PREFIXE: accorder(suffixe, mPre.genre),
      SUFFIXE_NEUTRE: accorder(suffixe, 'm'),
      MATIERE_ART: titre(articleDe(matiere, genreMatiere)),
      ORGANE_ART: titre(articleDe(organe, genreOrgane)),
      LIEU_ART: titre(articleDe(lieuCourt, genreDuLieu(lieu))),
      ACCORD_ESSENCE: accordDe(g, d.pluriel),
      ACCORD_LOI: accordDe(dl.genre === 'e' ? 'm' : dl.genre, dl.pluriel),
      ACCORD_MATIERE: accordDe(genreMatiere, false),
      ACCORD_ORGANE: accordDe(genreOrgane, false),
      ACCORD_PREFIXE: accordDe(mPre.genre, false),
    };
    const patrons = reservoirPatrons(loi.archetype || 'seuil');
    /* La ponctuation française : pas d'espace avant la virgule, une espace
       avant les deux-points. L'inverse est une faute qui saute aux yeux. */
    const nom = titre(sansJointFinal(remplirPatron(R.pick(patrons), jetons)))
      .replace(/\s+/g, ' ').replace(/\s+,/g, ',').replace(/\s*([:;])\s*/g, ' $1 ')
      .replace(/\s+/g, ' ').trim();

    const jp = composerJp(essence, loi, R.fork('jp'));
    const nomJp = jp.kanji, romaji = jp.romaji;
    const couleur = essence.couleur && /^#[0-9a-f]{3,8}$/i.test(essence.couleur) ? essence.couleur : '#b31217';

    /* 術式拡張 : la même loi, prise sous un autre angle. On l'apparie par
       archétype pour qu'elle découle vraiment de la loi du porteur. */
    const kExt = sousListe('kakucho', 'extensions');
    const kOk = kExt.filter(x => x.archetype === (loi.archetype || 'seuil'));
    const kakucho = choisir(kOk.length ? kOk : kExt, 'k:' + code, R.fork('kakucho'), 3) || null;

    /* 簡易領域 : une frontière, pas un paysage. Pas de coup au but. */
    const kanri = R.fork('kanri').pick(sousListe('kanri', 'simplifies')) || null;
    /* 黒閃 : on ne le provoque pas, on le reçoit. */
    const kokusen = R.fork('kokusen').pick(sousListe('kanri', 'kokusen')) || null;
    /* ce à quoi les 上層部 affectent ce porteur, et comment on le neutralise */
    const affectation = R.fork('affectation').pick(sousListe('affectation', 'affectations')) || null;
    const contre = R.fork('contre').pick(sousListe('affectation', 'contres')) || '';
    const jubaku = tirerJubaku(code, R.fork('jubaku'));

    /* ---- 出自 : par où la technique est entrée dans ce corps -----------
       La rubrique de provenance ne décore pas : elle décide de qui, en face,
       a déjà lu la fiche. Chaque étiquette a son propre registre.        */
    const provenance = (function () {
      const lot = sousListe('provenances', decl.origine || 'soden');
      if (!lot.length) return null;
      const pris = choisir(lot, 'prov:' + code, R.fork('provenance'), 3);
      return pris ? Object.assign({ origine: decl.origine || 'soden' }, pris) : null;
    })();

    /* ---- 派生術式 : les applications nommées --------------------------
       Une technique innée ne s'emploie pas en bloc : elle se décline en
       coups qui portent un nom et un rang. On en retient deux à quatre,
       toujours une de rang 1 — celle de tous les jours — et jamais deux
       du même rang, pour que la liste se lise comme un apprentissage.   */
    const derivations = (function () {
      const tous = sousListe('derivations', 'derivations')
        .filter(x => x.archetype === (loi.archetype || 'seuil'));
      if (!tous.length) return [];
      const Rd = R.fork('derivations');
      const combien = 2 + (cyrb128('nb-der:' + code)[0] % 3);
      const parRang = r2 => tous.filter(x => x.rang === r2);
      const retenues = [];
      for (let rang = 1; rang <= 4 && retenues.length < combien; rang++) {
        const lot = parRang(rang);
        if (!lot.length) continue;
        const pris = choisir(lot, 'der' + rang + ':' + code, Rd, 3);
        if (pris) retenues.push(pris);
      }
      /* si un rang manquait au corpus, on complète sans jamais doubler */
      const vus = {};
      retenues.forEach(x => { vus[x.id] = 1; });
      const reste = tous.filter(x => !vus[x.id]);
      while (retenues.length < combien && reste.length) {
        retenues.push(reste.splice(Rd.int(reste.length), 1)[0]);
      }
      return retenues.sort((x, y) => (x.rang || 0) - (y.rang || 0));
    })();

    /* ---- ce par quoi la loi passe pour atteindre le réel --------------
       Déclarer « familier » attache des 式神 : un pivot ou un majeur, qui
       tient la technique, et deux mineurs qu'on sort souvent. Chacun vient
       avec l'épreuve de 調伏 par laquelle on l'a soumis. Déclarer « objet »
       attache un 呪具, qu'on peut vous prendre.                          */
    let familiers = null, outil = null;
    if (decl.manifestation === 'familier') {
      const tous = sousListe('shikigami', 'shikigami');
      if (tous.length) {
        const Rs = R.fork('shikigami');
        const parRang = r2 => tous.filter(x => x.rang === r2);
        const hauts = parRang('pivot').concat(parRang('majeur'));
        const affines = hauts.filter(x => x.archetype === (loi.archetype || 'seuil'));
        const tete = choisir(affines.length ? affines : (hauts.length ? hauts : tous), 'sk:' + code, Rs, 2);
        const petits = tous.filter(x => x.rang === 'mineur' && x.id !== (tete || {}).id);
        const deux = Rs.sample(petits.length >= 2 ? petits : tous.filter(x => x.id !== (tete || {}).id), 2);
        const epreuves = sousListe('chobuku', 'epreuves');
        familiers = [tete].concat(deux).filter(Boolean).map((x, i) => ({
          shikigami: x,
          epreuve: epreuves.length ? epreuves[cyrb128('chobuku:' + code + ':' + x.id)[2] % epreuves.length] : null,
          ordre: i,
        }));
      }
    } else if (decl.manifestation === 'objet') {
      const tous = sousListe('jugu', 'outils');
      if (tous.length) {
        const nobles = tous.filter(x => x.rang === 'gradé' || x.rang === 'scellé');
        outil = choisir(nobles.length ? nobles : tous, 'jg:' + code, R.fork('jugu'), 3);
      }
    }

    return {
      declaration: decl, code, codeBase, variante: v,
      nom, nomJp, romaji, couleur,
      essence, vecteur, loi, domaine,
      matiere, nombre, lieu, organe,
      sigil: 'sceau:' + code,
      archetype: loi.archetype || 'seuil',
      junten: loi.consequence || '',
      hanten: loi.inversion || '',
      revers: loi.inversion || '',
      maximum: loi.maximum || '',
      kakucho, kanri, kokusen, affectation, contre, jubaku, derivations, provenance,
      origine: decl.origine || 'soden',
      manifestation: decl.manifestation || 'directe', familiers, outil,
      tenu,
    };
  }

  /* ---- ce que la déclaration fait à la mécanique ----------------------- */
  function profilDeclaration(decl) {
    const tx = T();
    const lean = { vigueur: 1, flux: 1, tranchant: 1, lucidite: 1, inversion: 1 };
    const mod = {};
    const notes = [];
    tx.AXES.forEach(a => {
      const e = tx.effet(a.id, decl[a.id]);
      AXES.forEach(k => { if (e.lean[k]) lean[k] *= e.lean[k]; });
      for (const k in e.mod) {
        const v = e.mod[k];
        if (typeof v === 'number') {
          /* les multiplicatifs se multiplient, les additifs s'additionnent */
          if (/Mult$/.test(k)) mod[k] = (mod[k] == null ? 1 : mod[k]) * v;
          else mod[k] = (mod[k] || 0) + v;
        } else mod[k] = v;
      }
      if (e.note) notes.push({ axe: a.id, tag: decl[a.id], note: e.note });
    });
    return { lean, mod, notes };
  }

  /* ---- le réceptacle ---------------------------------------------------
     La déclaration incline le corps ; l'examen le décide. Les deux comptent,
     et le budget reste fixe : on ne peut pas être bon partout.           */
  const AXES = ['vigueur', 'flux', 'tranchant', 'lucidite', 'inversion'];

  function forgeReceptacle(decl, poidsExamen, jubaku) {
    const tx = T();
    const prof = profilDeclaration(decl);
    /* la restriction céleste n'a pas été signée : elle s'applique quand même */
    if (jubaku && jubaku.eff) {
      for (const k in jubaku.eff) {
        const val = jubaku.eff[k];
        if (typeof val === 'number') {
          if (/Mult$/.test(k)) prof.mod[k] = (prof.mod[k] == null ? 1 : prof.mod[k]) * val;
          else prof.mod[k] = (prof.mod[k] || 0) + val;
        } else prof.mod[k] = val;
      }
      prof.notes.push({ axe: 'restriction', note: jubaku.perte + ' ' + jubaku.gain });
    }
    const poids = poidsExamen || {};
    const code = tx.codeDeclaration(decl);
    const R = new Rng('corps:' + code + ':' + AXES.map(k => poids[k] || 0).join(''));

    const brut = {};
    let somme = 0;
    AXES.forEach(k => {
      /* La racine comprime les extrêmes : une déclaration et un examen qui
         poussent tous deux dans le même sens doivent spécialiser, pas
         produire un corps à un seul membre.                              */
      const b = Math.pow(prof.lean[k] * (1 + 0.38 * (poids[k] || 0)), 0.68);
      brut[k] = Math.max(0.2, b * R.range(0.93, 1.07));
      somme += brut[k];
    });
    const BUDGET = 100;
    const stats = {};
    AXES.forEach(k => { stats[k] = Math.max(6, Math.round((brut[k] / somme) * BUDGET)); });

    const dominante = AXES.slice().sort((a, b) => stats[b] - stats[a])[0];
    const m = prof.mod;
    const pvMax = 90 + (stats.vigueur * 3.4 | 0);
    const enMax = 8 + Math.round(stats.flux / 9) + (m.enMaxDelta || 0);

    return {
      stats, dominante, profil: prof,
      pvMax, enMax: Math.max(5, enMax),
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
    /* le constat décrit le 呪力 du porteur, pas ce que la loi en fait :
       la conséquence a désormais sa propre rubrique (術式順転), et la
       répéter ici faisait lire deux fois la même phrase.                  */
    if (e.concept) phrases.push(e.concept.replace(/\.$/, '') + '.');
    if (e.sensoriel) phrases.push(e.sensoriel.replace(/\.$/, '') + '.');
    return phrases.join(' ');
  }
  function minuscule(s) { const t = String(s || ''); return t.charAt(0).toLowerCase() + t.slice(1); }

  JJK.forge = {
    forgeDepuisDeclaration, profilDeclaration, forgeReceptacle, grade, dossier,
    fr, decoupe, avecArticle, genreEssence, accorder, plurielDe, raccourcir, sansJointFinal,
    sousListe, FORMES_JUBAKU,
    AXES, affinite, liste,
  };
})(window);
