/* =========================================================================
   RITUEL — le duel
   Moteur pur : il ne touche jamais au DOM. Il émet des événements,
   l'interface les met en scène. Un même duel rejoué à l'identique donne
   exactement les mêmes chiffres : ici, le hasard aussi a signé un serment.
   ========================================================================= */
(function (root) {
  'use strict';
  const JJK = (root.JJK = root.JJK || {});
  const { Rng, clamp } = JJK.core;

  /* ---- statuts ---------------------------------------------------------- */
  const STATUTS = {
    saignee:   { nom: 'Saignée', type: 'mauvais', desc: 'Perd des points de vie à chaque tour.' },
    fracture:  { nom: 'Fracture', type: 'mauvais', desc: 'Dégâts réduits de 30 %.' },
    lie:       { nom: 'Lié', type: 'mauvais', desc: 'Technique innée impossible.' },
    marque:    { nom: 'Marqué', type: 'mauvais', desc: 'Subit 30 % de dégâts en plus.' },
    corrosion: { nom: 'Corrosion', type: 'mauvais', desc: 'Perd 1 énergie par tour.' },
    scelle:    { nom: 'Scellé', type: 'mauvais', desc: 'Territoire impossible.' },
    echo:      { nom: 'Écho', type: 'mauvais', desc: 'Le dernier coup se répète.' },
    differe:   { nom: 'Différé', type: 'mauvais', desc: 'Une loi déjà énoncée tombera au battement suivant.' },
    lecture:   { nom: 'Lecture', type: 'bon', desc: 'Coup critique quasi assuré.' },
    elan:      { nom: 'Élan', type: 'bon', desc: 'Dégâts augmentés.' },
    sursis:    { nom: 'Sursis', type: 'bon', desc: 'Survit une fois à un coup fatal.' },
    garde:     { nom: '簡易領域', type: 'bon', desc: "Absorbe une partie du prochain coup et annule le coup au but d'un territoire adverse." },
  };

  function statut(c, id) { return c.statuts.find(s => s.id === id); }
  function poser(c, id, tours, val) {
    const ex = statut(c, id);
    if (ex) { ex.tours = Math.max(ex.tours, tours); ex.val = Math.max(ex.val || 0, val || 0); return ex; }
    const s = { id, tours, val: val || 0, nom: (STATUTS[id] || {}).nom || id, type: (STATUTS[id] || {}).type || 'mauvais' };
    c.statuts.push(s);
    return s;
  }
  function retirer(c, id) { const i = c.statuts.findIndex(s => s.id === id); if (i >= 0) c.statuts.splice(i, 1); }

  /* ---- actions : les chiffres sont ici, et nulle part ailleurs --------- */
  const ACTIONS = [
    {
      id: 'frappe', nom: 'Frappe renforcée', cout: 0,
      desc: "Le corps, enveloppé d'énergie maudite. Rend 1 énergie.",
      exec(D, a, d, R) {
        const ev = [];
        D.degats(ev, a, d, 1.0 * a.mods.frappeMult, { verbe: 'écrase' });
        a.en = Math.min(a.enMax, a.en + 1);
        return ev;
      },
    },
    {
      id: 'decharge', nom: "Décharge de 呪力", cout: 2,
      desc: 'Une gerbe projetée. Rapide, malpropre, efficace.',
      exec(D, a, d, R) {
        const ev = [];
        D.degats(ev, a, d, 1.75, { verbe: 'traverse' });
        if (R.chance(0.30)) { poser(d, 'saignee', 3, Math.round(a.attaque * 0.22)); ev.push({ t: 'statut', qui: d.cle, id: 'saignee' }); }
        return ev;
      },
    },
    {
      id: 'technique', nom: 'Technique innée · 生得術式', cout: 3,
      desc: 'Ta loi, appliquée à quelqu\'un qui ne l\'a pas demandée.',
      req: (D, a) => !statut(a, 'lie'),
      raison: 'Ta technique est liée.',
      exec(D, a, d, R) {
        const ev = [];
        const m = a.mods;
        /* faille déclarée « condition stricte » : la loi refuse, parfois */
        if (m.rate && R.chance(m.rate)) {
          ev.push({ t: 'rate', qui: a.cle });
          return ev;
        }
        if (m.differe) {
          /* cadence différée : la loi s'applique au battement suivant,
             majorée de moitié. On l'inscrit, on ne la porte pas encore. */
          const pose = poser(d, 'differe', 2, 0);
          pose.val = (pose.val || 0) + Math.round(a.attaque * 2.30 * 1.5 * (m.degatsMult || 1));
          pose.par = a.cle;
          ev.push({ t: 'differe', qui: d.cle, tours: 1 });
        } else {
          D.degats(ev, a, d, 2.30, { verbe: 'impose', technique: true });
        }
        const par = { soustraction: 'fracture', 'échange': 'corrosion', 'répétition': 'echo', mesure: 'marque',
                      lien: 'lie', seuil: 'scelle', 'témoignage': 'marque', 'métamorphose': 'saignee' };
        const id = par[a.archetype] || 'marque';
        poser(d, id, 3, Math.round(a.attaque * 0.20));
        ev.push({ t: 'statut', qui: d.cle, id });
        /* cadence continue : la saignée est systématique */
        if (m.saigneeSystematique) {
          poser(d, 'saignee', 3, Math.max(2, Math.round(a.attaque * 0.20)));
          ev.push({ t: 'statut', qui: d.cle, id: 'saignee' });
        }
        /* cible étendue : un second statut, tiré parmi les autres */
        if (m.statutDouble) {
          const autres = ['fracture', 'corrosion', 'marque', 'saignee', 'lie'].filter(x => x !== id);
          const id2 = R.pick(autres);
          poser(d, id2, 2, Math.round(a.attaque * 0.14));
          ev.push({ t: 'statut', qui: d.cle, id: id2 });
        }
        /* faille déclarée « épuisement » : le battement suivant sera creux */
        if (m.epuisement) a.dette = (a.dette || 0) + m.epuisement;
        return ev;
      },
    },
    {
      id: 'inverse', nom: 'Technique inversée · 反転術式', cout: 3,
      desc: "Recoudre. L'énergie négative multipliée par elle-même devient positive.",
      exec(D, a, d, R) {
        const ev = [];
        const q = Math.round(a.pvMax * a.soin * 0.30 * a.mods.soinMult);
        a.pv = Math.min(a.pvMax, a.pv + q);
        retirer(a, 'saignee');
        ev.push({ t: 'soin', qui: a.cle, montant: q });
        if (R.chance(0.25)) { poser(a, 'sursis', 3, 0); ev.push({ t: 'statut', qui: a.cle, id: 'sursis' }); }
        return ev;
      },
    },
    {
      id: 'lecture', nom: "Lire l'adversaire", cout: 1,
      desc: 'Observer le flux plutôt que le corps. Le prochain coup portera.',
      exec(D, a, d, R) {
        const ev = [];
        poser(a, 'lecture', 2, 0);
        ev.push({ t: 'statut', qui: a.cle, id: 'lecture' });
        ev.push({ t: 'revele', qui: d.cle, intention: d.intention });
        a.en = Math.min(a.enMax, a.en + 1);
        return ev;
      },
    },
    {
      id: 'garde', nom: 'Territoire simplifié · 簡易領域', cout: 0,
      desc: "Une sphère de 2,21 mètres. Elle absorbe le choc et neutralise le coup au but d'un territoire adverse. Rend 2 呪力.",
      exec(D, a, d, R) {
        const ev = [];
        poser(a, 'garde', 1, 0.60);
        a.en = Math.min(a.enMax, a.en + 2);
        ev.push({ t: 'statut', qui: a.cle, id: 'garde' });
        return ev;
      },
    },
    {
      id: 'maximum', nom: 'Technique maximale · 術式最大', cout: 6,
      ultime: true,
      desc: 'La loi appliquée à sa propre limite. Exige 60 de tension.',
      req: (D, a) => a.tension >= 60 && !statut(a, 'lie'),
      raison: 'Tension insuffisante (60 requise).',
      exec(D, a, d, R) {
        const ev = [];
        a.tension -= 60;
        D.degats(ev, a, d, 4.20, { verbe: 'anéantit', ignoreGarde: true, technique: true, gros: true });
        poser(d, 'fracture', 3, 0);
        ev.push({ t: 'statut', qui: d.cle, id: 'fracture' });
        return ev;
      },
    },
    {
      id: 'serment', nom: 'Serment improvisé · 縛り', cout: 0,
      desc: "Offrir un quart de ta chair, ici, maintenant, contre 70 % de dégâts. Une fois par duel.",
      req: (D, a) => !a.sermentPris && a.pv > a.pvMax * 0.28,
      raison: 'Déjà prêté, ou il ne te reste pas assez à donner.',
      exec(D, a, d, R) {
        const ev = [];
        const prix = Math.round(a.pvMax * 0.25);
        a.pv -= prix; a.sermentPris = true;
        a.mods = Object.assign({}, a.mods, { degatsMult: a.mods.degatsMult * 1.70 });
        ev.push({ t: 'serment', qui: a.cle, prix });
        poser(a, 'elan', 99, 0.0);
        return ev;
      },
    },
    {
      id: 'domaine', nom: 'Extension du Territoire · 領域展開', cout: 6,
      ultime: true,
      desc: 'Déployer un espace clos où ta loi est la seule physique. Exige 100 de tension.',
      req: (D, a) => a.tension >= 100 && !statut(a, 'scelle') && !(a.mods.domaineUnique && a.domaineUtilise),
      raison: 'Tension insuffisante (100 requise) — ou ton territoire est scellé.',
      exec(D, a, d, R) {
        const ev = [];
        a.tension -= 100;
        a.domaineUtilise = true;
        const tours = 3 + (a.mods.domaineTours || 0);
        /* affrontement de territoires : deux lois ne tiennent pas dans la même pièce */
        if (d.domaineTours > 0) {
          const ra = a.raffinement + R.intRange(0, 40);
          const rb = d.raffinement + R.intRange(0, 40);
          ev.push({ t: 'clash', a: a.cle, b: d.cle, ra, rb });
          if (Math.abs(ra - rb) <= 8) {
            a.domaineTours = 0; d.domaineTours = 0;
            const q1 = Math.round(a.pvMax * 0.18), q2 = Math.round(d.pvMax * 0.18);
            a.pv -= q1; d.pv -= q2;
            ev.push({ t: 'brise', qui: 'les deux', a: q1, b: q2 });
            return ev;
          }
          if (ra > rb) {
            d.domaineTours = 0; poser(d, 'scelle', 4, 0);
            const q = Math.round(d.pvMax * 0.22); d.pv -= q;
            ev.push({ t: 'domaineBrise', perdant: d.cle, degats: q });
          } else {
            a.domaineTours = 0; poser(a, 'scelle', 4, 0);
            const q = Math.round(a.pvMax * 0.22); a.pv -= q;
            ev.push({ t: 'domaineBrise', perdant: a.cle, degats: q });
            return ev;
          }
        }
        a.domaineTours = tours;
        ev.push({ t: 'domaine', qui: a.cle, tours, spec: a.domaine });
        /* le coup au but : il ne se refuse pas */
        D.degats(ev, a, d, 1.9 * (a.mods.domaineMult || 1), { verbe: 'atteint', surAuBut: true, ignoreGarde: true, gros: true });
        return ev;
      },
    },
    {
      id: 'fuite', nom: 'Rompre le contact', cout: 0,
      desc: "Partir. Le fléau se souviendra que tu es partie chose vivante.",
      exec(D, a, d, R) {
        const ev = [];
        if (R.chance(0.55 + a.crit)) { ev.push({ t: 'fuite', qui: a.cle, reussie: true }); D.fini = true; D.vainqueur = 'fuite'; }
        else { ev.push({ t: 'fuite', qui: a.cle, reussie: false }); }
        return ev;
      },
    },
  ];

  const parId = {};
  ACTIONS.forEach(a => { parId[a.id] = a; });

  /* ---- construction d'un combattant ------------------------------------ */
  function combattantJoueur(tech, corps, mods, nomJoueur) {
    const pvMax = Math.max(24, Math.round(corps.pvMax * mods.pvMaxMult));
    return {
      cle: 'joueur', nom: nomJoueur || 'Toi', sousTitre: tech.nom,
      pv: pvMax, pvMax,
      enMax: Math.max(4, corps.enMax + (mods.enMaxBonus || 0)), en: 0,
      attaque: corps.attaque, crit: corps.crit + mods.critBonus, soin: corps.soin,
      archetype: tech.archetype, domaine: tech.domaine, technique: tech,
      statuts: [], tension: 0, domaineTours: 0, domaineUtilise: false,
      sermentPris: false, rancune: 0, derniereAction: null, mods,
      raffinement: corps.puissance + (mods.raffinementBonus || 0), intention: null, humain: true,
    };
  }

  /* Calibrage : le contenu écrit la couleur, le code écrit la difficulté.
     On vise une durée de duel, pas des chiffres arbitraires. Ainsi un fléau
     reste dangereux quel que soit le réceptacle qui lui fait face.        */
  const CADENCE = {
    '4':             { tours: 4.0,  survie: 13.0 },
    '3':             { tours: 5.5,  survie: 11.0 },
    '2':             { tours: 7.5,  survie: 10.0 },
    '1':             { tours: 10.0, survie: 9.5 },
    'semi-spécial':  { tours: 11.0, survie: 9.5 },
    'spécial':       { tours: 12.5, survie: 9.5 },
  };
  /* Rendement réel d'un tour de joueur : la technique innée vaut 2,3 fois
     l'attaque, mais elle pose « Marqué » (+30 %) et les critiques ajoutent
     encore. Mesuré en simulation, pas supposé — c'est 3,4, pas 1,9.       */
  const REGLAGE = {
    /* Dégâts moyens d'un tour de joueur, en multiples d'attaque. Mesuré,
       pas supposé : 3,4 pour la mécanique de base, multiplié par le gain
       moyen d'une déclaration. Ce gain se recalcule exactement à partir de
       la taxonomie — produit, sur les douze rubriques, de la moyenne de
       leurs quatre multiplicateurs — et vaut ×1,762 depuis l'ajout du 出自.
       On calibre sur la déclaration MOYENNE : un bon formulaire doit payer,
       un mauvais doit se sentir. Toute rubrique nouvelle qui touche aux
       dégâts déplace ce nombre : le relever et reporter ici.             */
    rendementJoueur: 5.35,
    rendementFleau: 1.9,    /* idem côté fléau */
    expoAttaque: 0.40,      /* la courbe pèse à plein sur les PV du fléau, à peine sur sa frappe :
                               une descente doit s'allonger, pas se raccourcir brutalement */
  };

  function combattantFleau(f, ref, R, courbe) {
    const g = String(f.grade || '4');
    const c = CADENCE[g] || CADENCE['2'];
    const rng = R || new Rng('fleau:' + (f.id || f.nom));
    const k = courbe || 1;

    /* IMPORTANT : on calibre sur le RÉCEPTACLE NU — sans serment, sans
       maturation. Sinon progresser ne servirait à rien : le monde grandirait
       exactement à la vitesse du joueur, et le joueur ne sentirait rien.
       Ici, le fléau ignore ce que tu as signé. C'est à toi d'en profiter.  */
    const dpsRef = Math.max(6, ref.attaque * REGLAGE.rendementJoueur);
    /* variance de caractère : deux fléaux de même grade ne se ressemblent pas */
    const vPv = rng.range(0.86, 1.16), vAtt = rng.range(0.86, 1.16);

    const pvMax = Math.max(40, Math.round(dpsRef * c.tours * vPv * k));
    const attaque = Math.max(6, Math.round((ref.pvMax / c.survie / REGLAGE.rendementFleau) * vAtt * Math.pow(k, REGLAGE.expoAttaque)));

    return {
      cle: 'ennemi', nom: f.nom, sousTitre: '呪霊 · fléau de grade ' + g,
      pv: pvMax, pvMax,
      enMax: 10, en: 2,
      attaque, crit: 0.08 + (g === 'spécial' ? 0.10 : g === 'semi-spécial' ? 0.06 : 0), soin: 0.5,
      archetype: f.archetype || 'seuil', domaine: f.domaine || null, fleau: f,
      statuts: [], tension: 0, domaineTours: 0, domaineUtilise: false,
      sermentPris: false, rancune: 0, derniereAction: null,
      mods: MODS_NEUTRES(),
      /* Le raffinement décide qui l'emporte quand deux territoires se
         touchent. On le veut comparable à la puissance du joueur, pas
         indexé sur des PV : sinon un grade spécial gagne toujours. */
      raffinement: ({ '4': 70, '3': 110, '2': 150, '1': 200, 'semi-spécial': 235, 'spécial': 290 }[g] || 150),
      intention: null, humain: false,
      profil: profilDe(g),
      grade: g,
      temperament: temperamentsDe(f),
      patience: 0,
    };
  }

  function MODS_NEUTRES() {
    return { degatsMult: 1, degatsRecusMult: 1, pvMaxMult: 1, soinMult: 1, critBonus: 0, critMult: 1,
      energieBonus: 0, energieDepart: 0, enMaxBonus: 0, enMaxDelta: 0, remise: 0, coutDelta: 0,
      frappeMult: 1, domaineMult: 1, domaineTours: 0, domaineCout: 0, rancune: 0, raffinementBonus: 0,
      interdit: {}, masqueVieEnnemi: false, masqueJournal: false,
      coupeSon: false, pasDeRepetition: false, domaineUnique: false, effaceToutALaMort: false, limiteTours: 0,
      /* déclarés au formulaire, pas signés : ce sont les conséquences des
         dix rubriques, et elles pèsent autant que les serments */
      coutChair: 0, journalTrouble: false, differe: false, saigneeSystematique: false,
      elanParTour: 0, statutDouble: false, bonusMarque: 0, rate: 0, epuisement: 0,
      retour: 0, lisible: 0 };
  }

  /* ------------------------------------------------------------------
     Tempéraments. Le bestiaire décrit des comportements précis :
     « il attend », « il rejoue une de tes actions », « il frappe deux
     fois de suite ». Sans lecture, ce serait de la littérature posée
     sur une IA générique. On lit donc le texte, et on le tient.
     ------------------------------------------------------------------ */
  const TEMPERAMENTS = [
    { id: 'patient',    re: /attend|n['’]engage rien|patiente|immobile|sans bouger|ne bouge|reste au fond|laisse venir/i },
    { id: 'imitateur',  re: /rejoue|recopie|répète|imite|copie|reproduit|renvoie ton|ton propre geste/i },
    { id: 'double',     re: /deux fois de suite|frappe deux fois|double|coup double|enchaîne deux/i },
    { id: 'horloge',    re: /\bau (?:cinquième|sixième|septième|huitième|neuvième|dixième|\d+)(?:e|ème)?\b/i },
    { id: 'soigneur',   re: /se referme|se recoud|se répare|régénère|se soigne|repousse|cicatrise/i },
    { id: 'vorace',     re: /dévore|absorbe|aspire|se nourrit|draine|vide|siphonne/i },
    { id: 'fuyant',     re: /disparaît|s['’]efface|n['’]existe que|invisible|ne se laisse pas|hors de portée/i },
  ];
  const MOTS_TOUR = { cinquième: 5, sixième: 6, septième: 7, huitième: 8, neuvième: 9, dixième: 10 };

  function temperamentsDe(f) {
    const texte = [f.comportement, f.apparence, f.technique_signature].join(' ');
    const t = {};
    TEMPERAMENTS.forEach(x => { if (x.re.test(texte)) t[x.id] = true; });
    if (t.horloge) {
      const m = /\bau (cinquième|sixième|septième|huitième|neuvième|dixième|\d+)/i.exec(texte);
      const v = m ? (MOTS_TOUR[String(m[1]).toLowerCase()] || parseInt(m[1], 10)) : 7;
      t.tourCle = Math.max(3, Math.min(12, v || 7));
    }
    return t;
  }

  function profilDe(grade) {
    switch (String(grade)) {
      case '4': return { agressif: 0.75, technique: 0.10, garde: 0.15, soin: 0, domaine: false, seuilTension: 999 };
      case '3': return { agressif: 0.65, technique: 0.20, garde: 0.15, soin: 0.05, domaine: false, seuilTension: 999 };
      case '2': return { agressif: 0.52, technique: 0.30, garde: 0.12, soin: 0.10, domaine: false, seuilTension: 999 };
      case '1': return { agressif: 0.45, technique: 0.35, garde: 0.10, soin: 0.14, domaine: false, seuilTension: 999 };
      case 'semi-spécial': return { agressif: 0.40, technique: 0.38, garde: 0.10, soin: 0.16, domaine: true, seuilTension: 130 };
      default: return { agressif: 0.36, technique: 0.42, garde: 0.08, soin: 0.18, domaine: true, seuilTension: 100 };
    }
  }

  /* ---- le duel ---------------------------------------------------------- */
  function creer(opts) {
    const R = new Rng('duel:' + opts.seed + ':' + (opts.ennemi.id || 'x') + ':' + (opts.numero || 0));
    const D = {
      R, tour: 1, fini: false, vainqueur: null, journal: [],
      joueur: opts.joueur, ennemi: opts.ennemi,
      mods: opts.joueur.mods,
      numero: opts.numero || 0,
    };
    D.joueur.en = Math.min(D.joueur.enMax, 3 + (D.mods.energieDepart || 0));
    D.ennemi.intention = choisirIntention(D, D.ennemi, D.joueur);

    /* ---- calcul des dégâts : une seule porte d'entrée ---------------- */
    D.degats = function (ev, a, d, mult, o) {
      o = o || {};
      let base = a.attaque * mult;
      if (statut(a, 'fracture')) base *= 0.70;
      const el = statut(a, 'elan'); if (el) base *= 1 + (el.val || 0);
      base *= a.mods.degatsMult || 1;
      base *= 1 + (a.rancune || 0);
      if (a.domaineTours > 0) base *= 1.35;

      const lec = statut(a, 'lecture');
      const lisait = !!lec;
      const chanceCrit = clamp((a.crit || 0.1) + (lec ? 0.55 : 0) + (d.mods.lisible || 0), 0, 0.95);
      const crit = R.chance(chanceCrit);
      /* 黒閃 kokusen : le coup et le 呪力 coïncident à 0,000001 seconde près.
         On ne le provoque pas. Il faut déjà un critique, de la tension, et
         de la chance ; l'avoir touché une fois change le rapport du porteur
         à son énergie maudite pour le reste du duel.                      */
      let kokusen = false;
      if (crit && o.technique !== false && a.tension >= 25) {
        const p = clamp(0.06 + (a.crit || 0) * 0.30 + (a.kokusenVus || 0) * 0.05, 0, 0.34);
        kokusen = R.chance(p);
      }
      if (kokusen) {
        base *= 2.5 * (a.mods.critMult || 1);
        a.kokusenVus = (a.kokusenVus || 0) + 1;
        a.crit = Math.min(0.6, (a.crit || 0.1) + 0.08);
        a.tension = Math.min(200, a.tension + 25);
      } else if (crit) base *= 1.85 * (a.mods.critMult || 1);
      if (lec) { retirer(a, 'lecture'); }

      base *= R.range(0.90, 1.12);

      const g = statut(d, 'garde');
      /* 簡易領域 : sa frontière neutralise la garantie d'un territoire adverse.
         C'est la seule parade régulière opposable à un coup au but, et c'est
         pour cela qu'elle traverse même ce qui « ne se refuse pas ».       */
      if (g && o.surAuBut) {
        base *= 0.45; retirer(d, 'garde');
        ev.push({ t: 'kanri', qui: d.cle });
      } else if (g && !o.ignoreGarde) { base *= 1 - (g.val || 0.5); retirer(d, 'garde'); }
      /* Ce qui n'existe que hors du regard encaisse mal les coups portés
         à l'aveugle. Le fixer — Lire l'adversaire — le rend solide, et
         c'est exactement ce que sa fiche annonce. */
      if (d.temperament && d.temperament.fuyant && !lisait && !statut(d, 'marque') && !o.surAuBut) base *= 0.68;
      if (statut(d, 'marque')) base *= 1.30 + (a.mods.bonusMarque || 0);
      base *= d.mods.degatsRecusMult || 1;
      if (d.domaineTours > 0 && !o.surAuBut) base *= 0.70;

      let q = Math.max(1, Math.round(base));
      if (d.pv - q <= 0 && statut(d, 'sursis')) {
        retirer(d, 'sursis'); q = Math.max(0, d.pv - 1);
        ev.push({ t: 'sursis', qui: d.cle });
      }
      d.pv -= q;
      a.rancune = 0;
      a.tension = Math.min(200, a.tension + Math.round(q * 0.18) + 4);
      d.tension = Math.min(200, d.tension + Math.round(q * 0.35) + 3);
      d.rancune = Math.min(1.5, (d.rancune || 0) + (d.mods.rancune || 0));

      const ec = statut(d, 'echo');
      ev.push({ t: 'degats', par: a.cle, cible: d.cle, montant: q, crit, kokusen, verbe: o.verbe || 'frappe', gros: !!o.gros || kokusen, surAuBut: !!o.surAuBut });
      /* faille déclarée « retour » : la loi ne distingue pas son porteur */
      if (o.technique && a.mods.retour) {
        const r = Math.max(1, Math.round(q * a.mods.retour));
        a.pv -= r;
        ev.push({ t: 'retour', qui: a.cle, montant: r });
      }
      if (ec) {
        const q2 = Math.max(1, Math.round(q * 0.45));
        d.pv -= q2; ec.tours -= 1;
        ev.push({ t: 'degats', par: a.cle, cible: d.cle, montant: q2, echo: true, verbe: 'se répète' });
        if (ec.tours <= 0) retirer(d, 'echo');
      }
      return q;
    };

    /* ---- actions disponibles ------------------------------------------ */
    D.actions = function () {
      const a = D.joueur;
      return ACTIONS.map(act => {
        const cout = coutReel(act, a);
        let ok = true, raison = '';
        if (a.mods.interdit[act.id]) { ok = false; raison = 'Interdit par un serment.'; }
        else if (a.en < cout) { ok = false; raison = 'Énergie insuffisante.'; }
        else if (act.req && !act.req(D, a, D.ennemi)) { ok = false; raison = act.raison || 'Impossible.'; }
        else if (a.mods.pasDeRepetition && a.derniereAction === act.id) { ok = false; raison = 'Serment : jamais deux fois le même geste.'; }
        return {
          id: act.id, nom: act.id === 'technique' ? (a.technique ? a.technique.nom : act.nom) : act.nom,
          sous: act.id === 'technique' ? 'Technique innée' : (act.id === 'maximum' && a.technique && a.technique.maximum ? 'Technique maximale' : ''),
          desc: act.desc, cout, ok, raison, ultime: !!act.ultime,
          interdit: !!a.mods.interdit[act.id],
        };
      });
    };

    const TECHNIQUES = { technique: 1, maximum: 1 };
    function coutReel(act, a) {
      if (!act.cout) return 0;
      let c = act.cout - (a.mods.remise || 0);
      if (TECHNIQUES[act.id]) c += (a.mods.coutDelta || 0);
      if (act.id === 'domaine') c += (a.mods.domaineCout || 0);
      return Math.max(1, Math.round(c));
    }

    /* ---- un tour complet ----------------------------------------------- */
    D.jouer = function (id) {
      if (D.fini) return [];
      const act = parId[id];
      const a = D.joueur, d = D.ennemi;
      if (!act) return [];
      const cout = coutReel(act, a);
      if (a.en < cout || a.mods.interdit[id] || (act.req && !act.req(D, a, d))) return [];

      const ev = [];
      a.en -= cout;
      a.derniereAction = id;
      ev.push({ t: 'acte', qui: 'joueur', nom: id === 'technique' && a.technique ? a.technique.nom : act.nom, id });
      /* prélèvement déclaré sur la chair : il se paie à l'énoncé, pas après */
      if (TECHNIQUES[id] && a.mods.coutChair) {
        const prix = Math.max(1, Math.round(a.pvMax * a.mods.coutChair));
        a.pv -= prix;
        ev.push({ t: 'chair', qui: a.cle, montant: prix });
        if (a.pv <= 0) { finir(ev, 'ennemi'); return ev; }
      }
      Array.prototype.push.apply(ev, act.exec(D, a, d, R) || []);

      if (d.pv <= 0) { finir(ev, 'joueur'); return ev; }
      if (D.fini) return ev;

      /* riposte */
      Array.prototype.push.apply(ev, tourEnnemi(D, ev));
      if (a.pv <= 0) { finir(ev, 'ennemi'); return ev; }
      if (d.pv <= 0) { finir(ev, 'joueur'); return ev; }

      /* fin de tour */
      Array.prototype.push.apply(ev, finDeTour(D));
      if (a.pv <= 0) { finir(ev, 'ennemi'); return ev; }
      if (d.pv <= 0) { finir(ev, 'joueur'); return ev; }

      D.tour++;
      if (a.mods.limiteTours && D.tour > a.mods.limiteTours) {
        ev.push({ t: 'sablier', limite: a.mods.limiteTours });
        a.pv = 0; finir(ev, 'ennemi'); return ev;
      }
      d.intention = choisirIntention(D, d, a);
      ev.push({ t: 'tour', n: D.tour });
      return ev;
    };

    function finir(ev, qui) {
      D.fini = true; D.vainqueur = qui;
      ev.push({ t: 'fin', vainqueur: qui });
    }

    function finDeTour(D) {
      const ev = [];
      [D.joueur, D.ennemi].forEach(c => {
        /* la loi différée tombe maintenant */
        const df = statut(c, 'differe');
        if (df && df.val) {
          const q = Math.max(1, Math.round(df.val * (c.mods.degatsRecusMult || 1)));
          c.pv -= q;
          ev.push({ t: 'degats', par: df.par || 'differe', cible: c.cle, montant: q, verbe: 'rattrape', gros: true });
          retirer(c, 'differe');
        }
        const sg = statut(c, 'saignee');
        if (sg) {
          const q = Math.max(1, sg.val || 3);
          c.pv -= q;
          ev.push({ t: 'degats', par: 'saignee', cible: c.cle, montant: q, verbe: 'saigne', dot: true });
        }
        if (statut(c, 'corrosion')) c.en = Math.max(0, c.en - 1);
        /* +3 par tour : une technique innée (3) est ainsi soutenable,
           et mettre de côté les 6 d'une extension reste un vrai choix. */
        let gain = 3 + (c.mods.energieBonus || 0);
        if (c.dette) { gain -= c.dette; c.dette = 0; }
        c.en = Math.max(0, Math.min(c.enMax, c.en + gain));
        /* cadence cumulative : l'élan monte tant qu'on ne se protège pas */
        if (c.mods.elanParTour) {
          if (c.derniereAction === 'garde') { retirer(c, 'elan'); }
          else {
            const el = poser(c, 'elan', 99, 0);
            el.val = Math.min(0.75, (el.val || 0) + c.mods.elanParTour);
          }
        }
        c.tension = Math.min(200, c.tension + 6);
        if (c.domaineTours > 0) {
          c.domaineTours--;
          const cible = c === D.joueur ? D.ennemi : D.joueur;
          const q = Math.max(2, Math.round(cible.pvMax * 0.06 * (c.mods.domaineMult || 1)));
          cible.pv -= q;
          ev.push({ t: 'degats', par: c.cle, cible: cible.cle, montant: q, verbe: 'ronge', domaine: true });
          if (c.domaineTours === 0) ev.push({ t: 'domaineFerme', qui: c.cle });
        }
        for (let i = c.statuts.length - 1; i >= 0; i--) {
          const s = c.statuts[i];
          if (s.id === 'garde' || s.id === 'elan') continue;
          s.tours--;
          if (s.tours <= 0) { c.statuts.splice(i, 1); ev.push({ t: 'statutFin', qui: c.cle, id: s.id }); }
        }
      });
      return ev;
    }

    /* ---- l'adversaire n'improvise pas : il a un tempérament ------------ */
    function choisirIntention(D, e, cible) {
      if (!e.profil) e.profil = profilDe((e.fleau || {}).grade || '2');
      const p = e.profil, t = e.temperament || {};
      const bas = e.pv / e.pvMax < 0.35;

      /* l'heure dite : ce qu'annonce sa fiche arrive au tour annoncé */
      if (t.tourCle && D.tour === t.tourCle && !statut(e, 'scelle')) {
        if (p.domaine && e.en >= 6 && e.domaineTours === 0) return 'domaine';
        if (e.en >= 6) return 'maximum';
      }
      if (p.domaine && e.tension >= p.seuilTension && e.en >= 6 && !statut(e, 'scelle') && e.domaineTours === 0) return 'domaine';
      if (e.tension >= 70 && e.en >= 5 && R.chance(0.55)) return 'maximum';
      if (bas && (p.soin > 0 || t.soigneur) && e.en >= 3 && R.chance(t.soigneur ? 0.75 : 0.55)) return 'inverse';

      /* celui qui attend : il se garde, et chaque attente le charge */
      if (t.patient && e.patience < 3 && R.chance(0.45)) return 'garde';
      /* celui qui rejoue : il te renvoie ton dernier geste */
      if (t.imitateur && cible.derniereAction && R.chance(0.55)) {
        const a = parId[cible.derniereAction];
        if (a && a.id !== 'fuite' && a.id !== 'serment' && a.id !== 'domaine' && e.en >= (a.cout || 0)) return a.id;
      }
      const r = R.next();
      if (r < p.agressif) return e.en >= 2 && R.chance(0.6) ? 'decharge' : 'frappe';
      if (r < p.agressif + p.technique) return e.en >= 3 ? 'technique' : 'frappe';
      if (r < p.agressif + p.technique + p.garde) return 'garde';
      return 'frappe';
    }

    function agirEnnemi(D, id) {
      const e = D.ennemi, j = D.joueur;
      const act = parId[id];
      const cout = act ? (act.cout || 0) : 0;
      if (!act || e.en < cout || (act.req && !act.req(D, e, j))) id = 'frappe';
      const a2 = parId[id];
      e.en -= (a2.cout || 0);
      e.derniereAction = id;
      const ev = [{ t: 'acte', qui: 'ennemi', nom: id === 'technique' && e.fleau ? (e.fleau.technique_signature || a2.nom) : a2.nom, id }];
      Array.prototype.push.apply(ev, a2.exec(D, e, j, R) || []);
      return ev;
    }

    function tourEnnemi(D) {
      const e = D.ennemi, j = D.joueur;
      const t = e.temperament || {};
      const id = e.intention || 'frappe';
      const ev = agirEnnemi(D, id);

      /* l'attente se paie en avance prise */
      if (t.patient) {
        if (e.derniereAction === 'garde') {
          e.patience++;
          const el2 = poser(e, 'elan', 99, 0);
          el2.val = Math.min(0.42, (el2.val || 0) + 0.11);
          ev.push({ t: 'statut', qui: e.cle, id: 'elan' });
        } else e.patience = 0;
      }
      /* le second coup, quand sa fiche le promet */
      if (t.double && j.pv > 0 && !D.fini && R.chance(0.26)) {
        ev.push({ t: 'second', qui: e.cle });
        Array.prototype.push.apply(ev, agirEnnemi(D, e.en >= 2 ? 'decharge' : 'frappe'));
      }
      /* ce qui se nourrit prend aussi la réserve */
      if (t.vorace && j.pv > 0 && j.en > 0 && R.chance(0.45)) {
        const q = Math.min(j.en, 2);
        j.en -= q; e.en = Math.min(e.enMax, e.en + q);
        ev.push({ t: 'ponction', qui: e.cle, montant: q });
      }
      return ev;
    }

    return D;
  }

  JJK.combat = { creer, combattantJoueur, combattantFleau, ACTIONS, STATUTS, MODS_NEUTRES, statut, profilDe, temperamentsDe, CADENCE, REGLAGE };
})(window);
