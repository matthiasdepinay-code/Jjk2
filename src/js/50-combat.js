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
    lecture:   { nom: 'Lecture', type: 'bon', desc: 'Coup critique quasi assuré.' },
    elan:      { nom: 'Élan', type: 'bon', desc: 'Dégâts augmentés.' },
    sursis:    { nom: 'Sursis', type: 'bon', desc: 'Survit une fois à un coup fatal.' },
    garde:     { nom: 'Garde', type: 'bon', desc: 'Absorbe une partie du prochain coup.' },
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
      id: 'decharge', nom: "Décharge d'énergie maudite", cout: 2,
      desc: 'Une gerbe projetée. Rapide, malpropre, efficace.',
      exec(D, a, d, R) {
        const ev = [];
        D.degats(ev, a, d, 1.75, { verbe: 'traverse' });
        if (R.chance(0.30)) { poser(d, 'saignee', 3, Math.round(a.attaque * 0.22)); ev.push({ t: 'statut', qui: d.cle, id: 'saignee' }); }
        return ev;
      },
    },
    {
      id: 'technique', nom: 'Technique innée', cout: 3,
      desc: 'Ta loi, appliquée à quelqu\'un qui ne l\'a pas demandée.',
      req: (D, a) => !statut(a, 'lie'),
      raison: 'Ta technique est liée.',
      exec(D, a, d, R) {
        const ev = [];
        D.degats(ev, a, d, 2.30, { verbe: 'impose', technique: true });
        const par = { soustraction: 'fracture', 'échange': 'corrosion', 'répétition': 'echo', mesure: 'marque',
                      lien: 'lie', seuil: 'scelle', 'témoignage': 'marque', 'métamorphose': 'saignee' };
        const id = par[a.archetype] || 'marque';
        poser(d, id, 3, Math.round(a.attaque * 0.20));
        ev.push({ t: 'statut', qui: d.cle, id });
        return ev;
      },
    },
    {
      id: 'inverse', nom: 'Technique inversée', cout: 3,
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
      id: 'garde', nom: 'Résorption', cout: 0,
      desc: "Absorber le choc dans sa propre énergie. Rend 2 énergie.",
      exec(D, a, d, R) {
        const ev = [];
        poser(a, 'garde', 1, 0.60);
        a.en = Math.min(a.enMax, a.en + 2);
        ev.push({ t: 'statut', qui: a.cle, id: 'garde' });
        return ev;
      },
    },
    {
      id: 'maximum', nom: 'Technique maximale', cout: 6,
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
      id: 'serment', nom: 'Serment improvisé', cout: 0,
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
      id: 'domaine', nom: 'Extension du Territoire', cout: 8,
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
      enMax: Math.max(3, corps.enMax + mods.enMaxBonus), en: 0,
      attaque: corps.attaque, crit: corps.crit + mods.critBonus, soin: corps.soin,
      archetype: tech.archetype, domaine: tech.domaine, technique: tech,
      statuts: [], tension: 0, domaineTours: 0, domaineUtilise: false,
      sermentPris: false, rancune: 0, derniereAction: null, mods,
      raffinement: corps.puissance, intention: null, humain: true,
    };
  }

  /* Calibrage : le contenu écrit la couleur, le code écrit la difficulté.
     On vise une durée de duel, pas des chiffres arbitraires. Ainsi un fléau
     reste dangereux quel que soit le réceptacle qui lui fait face.        */
  const CADENCE = {
    '4':             { tours: 3.0, survie: 10.0 },
    '3':             { tours: 4.2, survie: 8.5 },
    '2':             { tours: 5.6, survie: 7.2 },
    '1':             { tours: 7.2, survie: 6.4 },
    'semi-spécial':  { tours: 9.0, survie: 5.8 },
    'spécial':       { tours: 11.5, survie: 5.0 },
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
    const dpsRef = Math.max(6, ref.attaque * 1.9);
    /* variance de caractère : deux fléaux de même grade ne se ressemblent pas */
    const vPv = rng.range(0.86, 1.16), vAtt = rng.range(0.86, 1.16);

    const pvMax = Math.max(40, Math.round(dpsRef * c.tours * vPv * k));
    const attaque = Math.max(6, Math.round((ref.pvMax / c.survie / 1.45) * vAtt * k));

    return {
      cle: 'ennemi', nom: f.nom, sousTitre: 'Fléau de grade ' + g,
      pv: pvMax, pvMax,
      enMax: 10, en: 2,
      attaque, crit: 0.08 + (g === 'spécial' ? 0.10 : g === 'semi-spécial' ? 0.06 : 0), soin: 0.5,
      archetype: f.archetype || 'seuil', domaine: f.domaine || null, fleau: f,
      statuts: [], tension: 0, domaineTours: 0, domaineUtilise: false,
      sermentPris: false, rancune: 0, derniereAction: null,
      mods: MODS_NEUTRES(),
      raffinement: Math.round(pvMax / 5 + attaque * 2.2),
      intention: null, humain: false,
      profil: profilDe(g),
      grade: g,
    };
  }

  function MODS_NEUTRES() {
    return { degatsMult: 1, degatsRecusMult: 1, pvMaxMult: 1, soinMult: 1, critBonus: 0, critMult: 1,
      energieBonus: 0, energieDepart: 0, enMaxBonus: 0, remise: 0, frappeMult: 1, domaineMult: 1,
      domaineTours: 0, rancune: 0, interdit: {}, masqueVieEnnemi: false, masqueJournal: false,
      coupeSon: false, pasDeRepetition: false, domaineUnique: false, effaceToutALaMort: false, limiteTours: 0 };
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
      const chanceCrit = clamp((a.crit || 0.1) + (lec ? 0.55 : 0), 0, 0.95);
      const crit = R.chance(chanceCrit);
      if (crit) base *= 1.85 * (a.mods.critMult || 1);
      if (lec) { retirer(a, 'lecture'); }

      base *= R.range(0.90, 1.12);

      const g = statut(d, 'garde');
      if (g && !o.ignoreGarde) { base *= 1 - (g.val || 0.5); retirer(d, 'garde'); }
      if (statut(d, 'marque')) base *= 1.30;
      base *= d.mods.degatsRecusMult || 1;
      if (d.domaineTours > 0 && !o.surAuBut) base *= 0.70;

      let q = Math.max(1, Math.round(base));
      if (d.pv - q <= 0 && statut(d, 'sursis')) {
        retirer(d, 'sursis'); q = Math.max(0, d.pv - 1);
        ev.push({ t: 'sursis', qui: d.cle });
      }
      d.pv -= q;
      a.rancune = 0;
      a.tension = Math.min(200, a.tension + Math.round(q * 0.30) + 6);
      d.tension = Math.min(200, d.tension + Math.round(q * 0.55) + 4);
      d.rancune = Math.min(1.5, (d.rancune || 0) + (d.mods.rancune || 0));

      const ec = statut(d, 'echo');
      ev.push({ t: 'degats', par: a.cle, cible: d.cle, montant: q, crit, verbe: o.verbe || 'frappe', gros: !!o.gros, surAuBut: !!o.surAuBut });
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

    function coutReel(act, a) {
      if (!act.cout) return 0;
      return Math.max(1, act.cout - (a.mods.remise || 0));
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
        const sg = statut(c, 'saignee');
        if (sg) {
          const q = Math.max(1, sg.val || 3);
          c.pv -= q;
          ev.push({ t: 'degats', par: 'saignee', cible: c.cle, montant: q, verbe: 'saigne', dot: true });
        }
        if (statut(c, 'corrosion')) c.en = Math.max(0, c.en - 1);
        c.en = Math.min(c.enMax, c.en + 2 + (c.mods.energieBonus || 0) + (c.humain ? 0 : 1));
        c.tension = Math.min(200, c.tension + 8);
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
      const p = e.profil;
      const bas = e.pv / e.pvMax < 0.35;
      if (p.domaine && e.tension >= p.seuilTension && e.en >= 6 && !statut(e, 'scelle') && e.domaineTours === 0) return 'domaine';
      if (e.tension >= 70 && e.en >= 5 && R.chance(0.55)) return 'maximum';
      if (bas && p.soin > 0 && e.en >= 3 && R.chance(0.55)) return 'inverse';
      const r = R.next();
      if (r < p.agressif) return e.en >= 2 && R.chance(0.6) ? 'decharge' : 'frappe';
      if (r < p.agressif + p.technique) return e.en >= 3 ? 'technique' : 'frappe';
      if (r < p.agressif + p.technique + p.garde) return 'garde';
      return 'frappe';
    }

    function tourEnnemi(D) {
      const e = D.ennemi, j = D.joueur;
      let id = e.intention || 'frappe';
      const act = parId[id];
      const cout = act ? (act.cout || 0) : 0;
      if (!act || e.en < cout || (act.req && !act.req(D, e, j))) { id = 'frappe'; }
      const a2 = parId[id];
      e.en -= (a2.cout || 0);
      e.derniereAction = id;
      const ev = [{ t: 'acte', qui: 'ennemi', nom: id === 'technique' && e.fleau ? (e.fleau.technique_signature || a2.nom) : a2.nom, id }];
      Array.prototype.push.apply(ev, a2.exec(D, e, j, R) || []);
      return ev;
    }

    return D;
  }

  JJK.combat = { creer, combattantJoueur, combattantFleau, ACTIONS, STATUTS, MODS_NEUTRES, statut, profilDe };
})(window);
