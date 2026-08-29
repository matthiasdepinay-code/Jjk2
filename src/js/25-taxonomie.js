/* =========================================================================
   RITUEL — taxonomie
   Le formulaire du Bureau ne pose pas des questions décoratives : chaque
   réponse restreint le corpus ET modifie la mécanique. Les familles et les
   effets sont écrits ici, en dur, pour qu'une déclaration soit lisible.
   ========================================================================= */
(function (root) {
  'use strict';
  const JJK = (root.JJK = root.JJK || {});

  /* ---- les dix rubriques, dans l'ordre du formulaire ------------------- */
  const AXES = [
    { id: 'substrat',   tags: ['usure', 'compte', 'absence', 'contact'] },
    { id: 'operateur',  tags: ['retrancher', 'echanger', 'repeter', 'constater'] },
    { id: 'portee',     tags: ['contact', 'courte', 'moyenne', 'lointaine'] },
    { id: 'condition',  tags: ['parole', 'corps', 'lieu', 'trace'] },
    { id: 'cout',       tags: ['energie', 'chair', 'memoire', 'temps'] },
    { id: 'cadence',    tags: ['instantane', 'differe', 'continu', 'cumulatif'] },
    { id: 'cible',      tags: ['unique', 'zone', 'nomme', 'soi'] },
    { id: 'siege',      tags: ['gorge', 'sang', 'nerf', 'os'] },
    { id: 'faille',     tags: ['condition_stricte', 'epuisement', 'retour', 'lisibilite'] },
    { id: 'territoire', tags: ['administration', 'domestique', 'transit', 'clinique'] },
  ];
  const AXE = {};
  AXES.forEach(a => { AXE[a.id] = a; });

  /* ---- familles de contenu -------------------------------------------- */
  const ESSENCES = {
    usure:   ['rouille', 'cicatrice', 'claudication', 'ankylose', 'maree-basse', 'condensation'],
    compte:  ['recensement', 'dette', 'inventaire', 'proces-verbal', 'bornage', 'legs'],
    absence: ['attente', 'vacance', 'reste', 'anonymat', 'prescription', 'delestage'],
    contact: ['echo', 'anesthesie', 'quarantaine', 'date-anniversaire', 'eau-dormante', 'creux-du-seuil'],
  };

  const ARCHETYPES = {
    retrancher: ['soustraction', 'seuil'],
    echanger:   ['échange', 'lien'],
    repeter:    ['répétition', 'métamorphose'],
    constater:  ['mesure', 'témoignage'],
  };

  const PORTEES = {
    contact:   ['contact'],
    courte:    ['courte'],
    moyenne:   ['moyenne'],
    lointaine: ['longue', 'illimitée conditionnelle'],
  };

  const CONDITIONS = {
    parole: ['VEC-01', 'VEC-09', 'VEC-10', 'VEC-21', 'VEC-22', 'VEC-24'],
    corps:  ['VEC-02', 'VEC-05', 'VEC-12', 'VEC-13', 'VEC-19', 'VEC-20'],
    lieu:   ['VEC-04', 'VEC-07', 'VEC-11', 'VEC-16', 'VEC-23'],
    trace:  ['VEC-03', 'VEC-06', 'VEC-08', 'VEC-14', 'VEC-15', 'VEC-17', 'VEC-18'],
  };

  const TERRITOIRES = {
    administration: ['jocho', 'saigoku', 'meibo', 'shigoku', 'jintei', 'keiden'],
    domestique:     ['shokucho', 'kiro', 'minden', 'mukonden', 'eitei'],
    transit:        ['juden', 'seikan', 'onkoku', 'sokugoku', 'kyokan'],
    clinique:       ['hyotenbo', 'ketsuden', 'tsutei', 'shocho', 'reikan', 'shokubo'],
  };

  /* les organes sont du texte libre : on les reconnaît par leur anatomie */
  const SIEGES = {
    gorge: /thyroïde|hyoïde|palatine|maxillaire|sternale|larynx|glotte|trachée/i,
    sang:  /carotid|moelle|rate|ganglionnaire|diaphragme|cubitale|artère|plèvre|veine/i,
    nerf:  /nerf|plexus|oreille interne|papille|tympan|lacrymal|rétine/i,
    os:    /vertèbre|iliaque|fontanelle|plantaire|calcanéen|poignet|fémur|os\b|crête/i,
  };

  /* ---- ce que chaque réponse fait à la mécanique -----------------------
     Un « lean » déplace la répartition des cinq axes du corps.
     Un « mod » modifie directement le duel. Tout est cumulatif.          */
  const EFFETS = {
    substrat: {
      usure:   { lean: { vigueur: 1.5 }, mod: {}, note: "La loi ronge : elle prend son temps et ne le rend pas." },
      compte:  { lean: { lucidite: 1.5 }, mod: {}, note: "La loi inscrit : ce qui est écrit ne varie plus." },
      absence: { lean: { flux: 1.5 }, mod: {}, note: "La loi retire : il faut d'abord qu'il y ait eu quelque chose." },
      contact: { lean: { tranchant: 1.5 }, mod: {}, note: "La loi touche : elle exige une proximité qu'on regrette." },
    },
    operateur: {
      retrancher: { lean: { tranchant: 1.3 }, mod: {}, note: "Opérateur soustractif. Rien ne repousse." },
      echanger:   { lean: { inversion: 1.3 }, mod: { soinMult: 1.15 }, note: "Opérateur d'échange. Tout se paie deux fois." },
      repeter:    { lean: { flux: 1.3 }, mod: {}, note: "Opérateur itératif. La série ne sait pas s'arrêter." },
      constater:  { lean: { lucidite: 1.3 }, mod: { critBonus: 0.04 }, note: "Opérateur constatif. Ce qui est mesuré est acquis." },
    },
    portee: {
      contact:   { lean: { vigueur: 1.2 }, mod: { degatsMult: 1.25, degatsRecusMult: 1.12 }, note: "Portée de contact : +25 % de dégâts, +12 % de dégâts subis." },
      courte:    { lean: { tranchant: 1.1 }, mod: { degatsMult: 1.12, critBonus: 0.04 }, note: "Portée courte : +12 % de dégâts, +4 % de critique." },
      moyenne:   { lean: {}, mod: { enMaxDelta: 1 }, note: "Portée moyenne : rien de gratuit, rien de payé. +1 de réserve." },
      lointaine: { lean: { lucidite: 1.2 }, mod: { degatsMult: 0.88, degatsRecusMult: 0.85, critBonus: 0.06 }, note: "Portée lointaine : −12 % de dégâts, −15 % de dégâts subis." },
    },
    condition: {
      parole: { lean: { lucidite: 1.1 }, mod: { bonusMarque: 0.15 }, note: "Énonciation par la parole : +15 % contre une cible désignée." },
      corps:  { lean: { vigueur: 1.1 }, mod: { soinMult: 1.12 }, note: "Énonciation par le corps : la technique inversée rend 12 % de plus." },
      lieu:   { lean: { flux: 1.1 }, mod: { energieBonus: 1 }, note: "Énonciation par le lieu : +1 énergie par battement." },
      trace:  { lean: { tranchant: 1.1 }, mod: { critBonus: 0.05 }, note: "Énonciation par la trace : +5 % de critique." },
    },
    cout: {
      energie: { lean: { flux: 1.2 }, mod: { enMaxDelta: 2 }, note: "Prélèvement sur la réserve : +2 de réserve maximale." },
      chair:   { lean: { vigueur: 1.2 }, mod: { remise: 1, coutChair: 0.045 }, note: "Prélèvement sur la chair : techniques à −1 énergie, mais 4,5 % des PV à chaque application." },
      memoire: { lean: { lucidite: 0.8 }, mod: { remise: 1, journalTrouble: true }, note: "Prélèvement sur la mémoire : techniques à −1 énergie, mais le compte rendu se troue." },
      temps:   { lean: { tranchant: 1.2 }, mod: { coutDelta: 1, degatsMult: 1.35 }, note: "Prélèvement sur le temps : +1 énergie par technique, +35 % de dégâts." },
    },
    cadence: {
      instantane: { lean: { tranchant: 1.15 }, mod: { critBonus: 0.08 }, note: "Cadence instantanée : +8 % de critique." },
      differe:    { lean: { lucidite: 1.15 }, mod: { differe: true }, note: "Cadence différée : les dégâts de technique tombent au battement suivant, majorés de moitié." },
      continu:    { lean: { flux: 1.15 }, mod: { saigneeSystematique: true, degatsMult: 0.85 }, note: "Cadence continue : saignée à chaque application, −15 % de dégâts directs." },
      cumulatif:  { lean: { vigueur: 1.15 }, mod: { elanParTour: 0.12 }, note: "Cadence cumulative : +12 % de dégâts par battement, remis à zéro si tu te protèges." },
    },
    cible: {
      unique: { lean: { tranchant: 1.2 }, mod: { degatsMult: 1.20 }, note: "Cible unique : +20 % de dégâts." },
      zone:   { lean: { flux: 1.2 }, mod: { statutDouble: true }, note: "Cible étendue : chaque technique pose un second statut." },
      nomme:  { lean: { lucidite: 1.2 }, mod: { bonusMarque: 0.30 }, note: "Cible nommée : +30 % contre ce qui a été désigné." },
      soi:    { lean: { inversion: 1.2 }, mod: { degatsMult: 1.40, degatsRecusMult: 1.15 }, note: "Cible réflexive : +40 % de dégâts, +15 % de dégâts subis." },
    },
    siege: {
      gorge: { lean: { lucidite: 1.4 }, mod: {}, note: "Siège laryngé." },
      sang:  { lean: { inversion: 1.4 }, mod: {}, note: "Siège sanguin." },
      nerf:  { lean: { tranchant: 1.4 }, mod: {}, note: "Siège nerveux." },
      os:    { lean: { vigueur: 1.4 }, mod: {}, note: "Siège osseux." },
    },
    faille: {
      condition_stricte: { lean: {}, mod: { rate: 0.20, degatsMult: 1.45 }, note: "Faille déclarée : la loi refuse de s'appliquer un battement sur cinq. En échange, +45 % de dégâts." },
      epuisement:        { lean: { flux: 1.2 }, mod: { remise: 1, epuisement: 2 }, note: "Faille déclarée : −2 énergie au battement suivant chaque technique. En échange, −1 à leur coût." },
      retour:            { lean: { vigueur: 1.2 }, mod: { retour: 0.12, degatsMult: 1.30 }, note: "Faille déclarée : tu encaisses 12 % de ce que tu infliges. En échange, +30 % de dégâts." },
      lisibilite:        { lean: { lucidite: 1.2 }, mod: { lisible: 0.14, critBonus: 0.10, degatsMult: 1.12 }, note: "Faille déclarée : ta loi se lit. L'adversaire critique 14 % plus souvent. En échange, +10 % de critique et +12 % de dégâts." },
    },
    territoire: {
      administration: { lean: { lucidite: 1.2 }, mod: { domaineMult: 1.10 }, note: "Territoire administratif." },
      domestique:     { lean: { vigueur: 1.2 }, mod: { domaineTours: 1 }, note: "Territoire domestique : il tient un battement de plus." },
      transit:        { lean: { flux: 1.2 }, mod: { domaineCout: -1 }, note: "Territoire de transit : ouverture à −1 énergie." },
      clinique:       { lean: { inversion: 1.2 }, mod: { soinMult: 1.20 }, note: "Territoire clinique : la technique inversée rend 20 % de plus." },
    },
  };

  function effet(axe, tag) {
    const e = (EFFETS[axe] || {})[tag];
    return e || { lean: {}, mod: {}, note: '' };
  }

  function tagValide(axe, tag) {
    const a = AXE[axe];
    return !!(a && a.tags.indexOf(tag) >= 0);
  }

  /* ---- code de déclaration : dix chiffres en base 4 --------------------
     Une déclaration se partage. Ce n'est pas un nom qui décide, c'est un
     formulaire, et un formulaire a un numéro.                            */
  function codeDeclaration(decl) {
    let n = 0;
    for (let i = 0; i < AXES.length; i++) {
      const a = AXES[i];
      const k = Math.max(0, a.tags.indexOf(decl[a.id]));
      n = n * 4 + k;
    }
    return n.toString(36).toUpperCase().padStart(4, '0');
  }
  function declarationDepuisCode(code) {
    let n = parseInt(String(code || '').trim(), 36);
    if (!isFinite(n) || n < 0) return null;
    const brut = [];
    for (let i = AXES.length - 1; i >= 0; i--) {
      brut[i] = AXES[i].tags[n % 4];
      n = Math.floor(n / 4);
    }
    /* on reconstruit dans l'ordre du formulaire : un dossier se lit de haut
       en bas, et deux dossiers identiques doivent se comparer à l'identique */
    const out = {};
    AXES.forEach((a, i) => { out[a.id] = brut[i]; });
    return out;
  }

  /* poids du corps : cinq chiffres en base 9, plus l'archétype dominant */
  const AXES_CORPS = ['vigueur', 'flux', 'tranchant', 'lucidite', 'inversion'];
  const ARCH_LISTE = ['soustraction', 'échange', 'répétition', 'mesure', 'lien', 'seuil', 'témoignage', 'métamorphose'];

  function codeCorps(poids, archetype) {
    let n = 0;
    AXES_CORPS.forEach(k => { n = n * 9 + Math.max(0, Math.min(8, Math.round(poids[k] || 0))); });
    n = n * 8 + Math.max(0, ARCH_LISTE.indexOf(archetype));
    return n.toString(36).toUpperCase().padStart(5, '0');
  }
  function corpsDepuisCode(code) {
    let n = parseInt(String(code || '').trim(), 36);
    if (!isFinite(n) || n < 0) return null;
    const archetype = ARCH_LISTE[n % 8] || 'seuil';
    n = Math.floor(n / 8);
    const brut = [];
    for (let i = AXES_CORPS.length - 1; i >= 0; i--) { brut[i] = n % 9; n = Math.floor(n / 9); }
    const poids = {};
    AXES_CORPS.forEach((k, i) => { poids[k] = brut[i]; });
    return { poids, archetype };
  }

  const VERSION = 'R1';
  function dossierCode(decl, poids, archetype) {
    return VERSION + '-' + codeDeclaration(decl) + '-' + codeCorps(poids, archetype);
  }
  function lireDossierCode(s) {
    const m = /^([A-Z0-9]+)-([A-Z0-9]+)-([A-Z0-9]+)$/i.exec(String(s || '').trim());
    if (!m) return null;
    const decl = declarationDepuisCode(m[2]);
    const corps = corpsDepuisCode(m[3]);
    if (!decl || !corps) return null;
    return { version: m[1].toUpperCase(), declaration: decl, poids: corps.poids, archetype: corps.archetype };
  }

  JJK.taxo = {
    AXES, AXE, AXES_CORPS, ARCH_LISTE, ESSENCES, ARCHETYPES, PORTEES, CONDITIONS,
    TERRITOIRES, SIEGES, EFFETS, effet, tagValide,
    codeDeclaration, declarationDepuisCode, codeCorps, corpsDepuisCode,
    dossierCode, lireDossierCode, VERSION,
  };
})(window);
