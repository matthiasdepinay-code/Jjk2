/* =========================================================================
   RITUEL — mémoire
   Le jeu tient un registre. Il n'oublie ni les noms, ni les manières de
   mourir. Un serment peut détruire ce registre ; rien ne peut le corriger.
   ========================================================================= */
(function (root) {
  'use strict';
  const JJK = (root.JJK = root.JJK || {});

  const CLE = 'rituel.registre.v1';
  const VIDE = {
    version: 1,
    graine: null, reponses: [], maturation: 0,
    descentes: 0, victoires: 0, fuites: 0, morts: 0,
    serments: [], sonCoupe: false,
    epitaphes: [],           /* ceux qui sont tombés ici, sous n'importe quel nom */
    titres: [], vus: [],
    premiereVisite: null, derniereVisite: null,
    domainesOuverts: 0, sermentsPretes: 0, degatsSubis: 0, degatsInfliges: 0,
  };

  function dispo() {
    try { const k = '__t'; localStorage.setItem(k, '1'); localStorage.removeItem(k); return true; }
    catch (e) { return false; }
  }
  const OK = dispo();
  let cache = null;

  function lire() {
    if (cache) return cache;
    if (!OK) return (cache = JSON.parse(JSON.stringify(VIDE)));
    try {
      const brut = localStorage.getItem(CLE);
      cache = brut ? Object.assign(JSON.parse(JSON.stringify(VIDE)), JSON.parse(brut)) : JSON.parse(JSON.stringify(VIDE));
    } catch (e) { cache = JSON.parse(JSON.stringify(VIDE)); }
    return cache;
  }
  function ecrire(patch) {
    const r = lire();
    if (patch) Object.assign(r, patch);
    r.derniereVisite = Date.now();
    if (!r.premiereVisite) r.premiereVisite = r.derniereVisite;
    if (OK) { try { localStorage.setItem(CLE, JSON.stringify(r)); } catch (e) {} }
    return r;
  }
  function effacer() {
    cache = null;
    if (OK) { try { localStorage.removeItem(CLE); } catch (e) {} }
    return lire();
  }

  /* ---- épitaphes : ce que le registre garde d'un mort ------------------ */
  function inhumer(fiche) {
    const r = lire();
    r.epitaphes.unshift({
      graine: fiche.graine, nom: fiche.nom, technique: fiche.technique, nomJp: fiche.nomJp,
      tueur: fiche.tueur, tour: fiche.tour, grade: fiche.grade,
      serments: fiche.serments || [], date: Date.now(),
      derniersMots: fiche.derniersMots || '',
      archetype: fiche.archetype || 'seuil',
    });
    r.epitaphes = r.epitaphes.slice(0, 12);
    r.morts++;
    ecrire();
    return r.epitaphes[0];
  }

  /* Le revenant : ton cadavre revient te chercher, avec ta propre loi.
     C'est la seule créature du jeu que tu as toi-même fabriquée.        */
  function revenant() {
    const r = lire();
    const e = r.epitaphes[0];
    if (!e) return null;
    return {
      id: 'revenant:' + e.graine + ':' + e.date,
      nom: e.nom ? ('Ce qui reste de ' + e.nom) : 'Ce qui reste de toi',
      grade: r.morts >= 4 ? 'spécial' : (r.morts >= 2 ? 'semi-spécial' : '1'),
      origine: "La peur, très ordinaire, de retrouver sa propre écriture dans une lettre qu'on n'a pas écrite.",
      apparence: "Ta silhouette, à la hauteur exacte de tes yeux, portant ton visage comme on porte un vêtement mal boutonné.",
      comportement: "Il connaît ta loi. Il l'a portée. Il sait à quel tour tu ouvres ton territoire.",
      replique: e.derniersMots || "Tu as recommencé. Moi, je n'ai pas pu.",
      technique_signature: e.technique || 'Ta technique',
      revenant: true, epitaphe: e, archetype: e.archetype || 'seuil',
    };
  }

  function marquerVu(id) {
    const r = lire();
    if (r.vus.indexOf(id) < 0) { r.vus.push(id); ecrire(); }
  }
  function aVu(id) { return lire().vus.indexOf(id) >= 0; }

  function accorderTitre(t) {
    const r = lire();
    if (r.titres.indexOf(t) < 0) { r.titres.push(t); ecrire(); return true; }
    return false;
  }

  function estUnRetour() {
    const r = lire();
    return !!(r.premiereVisite && (r.morts > 0 || r.descentes > 0));
  }

  /* Le registre reconnaît un revenant qui change de nom. */
  function connaitAutreNom(graineActuelle) {
    const r = lire();
    const noms = {};
    r.epitaphes.forEach(e => { if (e.graine && e.graine !== graineActuelle) noms[e.graine] = 1; });
    if (r.graine && r.graine !== graineActuelle) noms[r.graine] = 1;
    return Object.keys(noms);
  }

  JJK.memoire = {
    lire, ecrire, effacer, inhumer, revenant, marquerVu, aVu,
    accorderTitre, estUnRetour, connaitAutreNom, disponible: OK, CLE,
  };
})(window);
