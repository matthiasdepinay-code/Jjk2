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
  /* « L'Attente » ne dit pas son genre. Le registre le sait : sans cette
     table, on écrirait « Attente Confidentiel ».                        */
  const GENRE_ESSENCE = {
    echo: 'm', attente: 'f', inventaire: 'm', anesthesie: 'f',
    'eau-dormante': 'f', ankylose: 'f', anonymat: 'm',
  };
  function genreEssence(essence, decoupee) {
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
    const notesVec = vecteurs.map(v => ({
      v, n: (idsCond.indexOf(v.id) >= 0 ? 1000 : 0)
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
      condition: idsCond.indexOf(vecteur.id) >= 0,
      portee: porteesOk.indexOf(vecteur.portee) >= 0 || ecart <= 1,
      ecart,
    };

    /* 4. le territoire déclaré choisit la famille d'extensions */
    const domaine = choisir(parFamille(domaines, tx.TERRITOIRES[decl.territoire], decl.territoire), loi.id + ':' + code, R.fork('domaine'), 3) || null;

    /* 5. le siège choisit l'organe */
    const re = tx.SIEGES[decl.siege];
    const organesOk = (matieres.organes || []).filter(o => re && re.test(o));
    const organeBrut = R.fork('organe').pick(organesOk.length ? organesOk : (matieres.organes || ['la moelle']));

    const matiere = raccourcir(R.pick(matieres.matieres || ['cendre']), 3);
    const nombres = (matieres.nombres || ['Neuf'])
      .filter(x => !/^(un|une|un demi|une demie|zéro)$/i.test(String(x).trim()));
    const nombre = R.pick(nombres.length ? nombres : ['Neuf']);
    const lieu = R.pick(matieres.lieux || ['une salle sans porte']);
    const organe = raccourcir(String(organeBrut)
      .replace(/^(les|le|la|l[\u2019\']|des|du|de\s+l[\u2019\']|de\s+la|de)\s*/i, ''), 3);
    const prefixe = R.pick(nomen.prefixes || ['Rite']);
    const suffixe = R.pick(nomen.suffixes || ['Perpétuel']);

    const d = decoupe(essence.nom);
    const matiereN = titre(plurielDe(matiere));
    const jetons = {
      ESSENCE: essence.nom, ESSENCE_NU: d.nu, ESSENCE_ART: avecArticle(essence.nom),
      GENRE: genreEssence(essence, d),
      LOI: loi.nom, VECTEUR: vecteur.nom, NOMBRE: nombre,
      MATIERE: titre(matiere), NOMBRE_MATIERE: nombre + ' ' + matiereN,
      PREFIXE: prefixe, SUFFIXE: suffixe, ORGANE: titre(organe),
    };
    const nom = titre(sansJointFinal(PATRONS[R.int(PATRONS.length)](jetons))).replace(/\s+/g, ' ').trim();

    const kp = R.pick(KANJI_PRE), ks = R.pick(KANJI_SUF);
    const nomJp = (kp.k || '') + (essence.kanji || '呪') + ks.k;
    const romaji = ((kp.r ? kp.r + '-' : '') + (essence.romaji || 'ju') + '-' + ks.r).replace(/--+/g, '-');
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
      kakucho, kanri, kokusen, affectation, contre, jubaku,
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
    if (e.concept) phrases.push(e.concept.replace(/\.$/, '') + '.');
    if (e.sensoriel) phrases.push(e.sensoriel.replace(/\.$/, '') + '.');
    if (l.consequence) phrases.push(l.consequence.replace(/\.$/, '') + '.');
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
