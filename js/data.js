'use strict';
// ---------- Données du jeu : glyphes, ingrédients, recettes, découvertes, niveau ----------
const DATA = (() => {
  // Glyphes d'effet (centre du sceau)
  const CORES = {
    feu:     { id: 'feu',     nom: 'Feu',      couleur: '#d9622b', cout: 3, desc: 'Brûle le bois, allume les torches, fait fondre la glace.' },
    vent:    { id: 'vent',    nom: 'Vent',     couleur: '#3f9c9b', cout: 2, desc: 'Repousse tout ce qui bouge, souffle les flammes. Sur soi : bond aérien.' },
    eau:     { id: 'eau',     nom: 'Eau',      couleur: '#3b6fb6', cout: 2, desc: 'Éteint le feu, fait pousser les graines, dissipe les feux follets.' },
    terre:   { id: 'terre',   nom: 'Terre',    couleur: '#8a6b2f', cout: 3, desc: 'Fait surgir un bloc de pierre. Sur soi : peau de pierre.' },
    lumiere: { id: 'lumiere', nom: 'Lumière',  couleur: '#d8a63a', cout: 2, desc: 'Éclaire, étourdit les créatures, révèle les runes cachées.' },
    ombre:   { id: 'ombre',   nom: 'Ombre',    couleur: '#5a4a7d', cout: 3, desc: 'Endort les créatures. Sur soi : tu deviens invisible.' },
    vie:     { id: 'vie',     nom: 'Vie',      couleur: '#5c8f3e', cout: 4, desc: 'Soigne, fait pousser, apprivoise les créatures.' },
    force:   { id: 'force',   nom: 'Force',    couleur: '#9a4a8c', cout: 4, desc: 'Attire objets et créatures vers un point. Sur soi : élan.' },
  };
  // Formes (anneau intérieur)
  const SHAPES = {
    projectile: { id: 'projectile', nom: 'Projectile', cout: 1, desc: 'Une bille d\'encre qui file dans la direction visée.' },
    soi:        { id: 'soi',        nom: 'Sur soi',    cout: 1, desc: 'L\'effet s\'applique à toi-même.' },
    zone:       { id: 'zone',       nom: 'Zone',       cout: 3, desc: 'L\'effet surgit autour du point visé, à portée.' },
    trait:      { id: 'trait',      nom: 'Trait',      cout: 3, desc: 'Une ligne d\'énergie instantanée vers le point visé.' },
  };
  // Modificateurs (anneau extérieur)
  const MODS = {
    puissance:   { id: 'puissance',   nom: 'Puissance',   cout: 2, desc: 'Effet plus fort. Brise les rochers fissurés.' },
    portee:      { id: 'portee',      nom: 'Portée',      cout: 1, desc: 'Va plus loin.' },
    duree:       { id: 'duree',       nom: 'Durée',       cout: 2, desc: 'L\'effet dure plus longtemps.' },
    taille:      { id: 'taille',      nom: 'Taille',      cout: 2, desc: 'Zone d\'effet plus grande.' },
    rebond:      { id: 'rebond',      nom: 'Rebond',      cout: 1, desc: 'Le projectile rebondit sur les murs.' },
    persistance: { id: 'persistance', nom: 'Persistance', cout: 3, desc: 'Laisse une trace d\'énergie sur place (flammes, flaque, lueur...).' },
    vitesse:     { id: 'vitesse',     nom: 'Vitesse',     cout: 1, desc: 'Projectile plus rapide et plus droit.' },
    double:      { id: 'double',      nom: 'Double',      cout: 3, desc: 'Deux fois l\'effet, en éventail.' },
  };
  // Déclencheurs (pointes)
  const TRIGGERS = {
    immediat: { id: 'immediat', nom: 'Immédiat', cout: 0, desc: 'L\'effet agit tout de suite, en continu sur ce qu\'il touche.' },
    contact:  { id: 'contact',  nom: 'Au contact', cout: 1, desc: 'Éclate à la première chose touchée (ou quand on te touche).' },
    retarde:  { id: 'retarde',  nom: 'Retardé',  cout: 1, desc: 'Se fixe, puis éclate après deux secondes.' },
  };

  const INGREDIENTS = {
    eau_source: { id: 'eau_source', nom: 'Eau de source', couleur: '#3b6fb6', infini: true, desc: 'Toujours disponible au labo.' },
    cendre:     { id: 'cendre',     nom: 'Cendre',         couleur: '#555049', infini: true, desc: 'Toujours disponible au labo.' },
    braise:     { id: 'braise',     nom: 'Pétale de braise', couleur: '#d9622b', desc: 'Reste d\'un buisson brûlé.' },
    rosee:      { id: 'rosee',      nom: 'Goutte de rosée', couleur: '#6aa0d8', desc: 'Se recueille dans une mare (E).' },
    plume:      { id: 'plume',      nom: 'Plume de vent',  couleur: '#3f9c9b', desc: 'Tombe d\'un feu follet dissipé par l\'eau.' },
    poussiere:  { id: 'poussiere',  nom: 'Poussière de pierre', couleur: '#8a6b2f', desc: 'Sort d\'un rocher fissuré brisé par la puissance.' },
    lueur:      { id: 'lueur',      nom: 'Lueur captive',  couleur: '#d8a63a', desc: 'Offerte par une rune révélée (E).' },
    racine:     { id: 'racine',     nom: 'Racine vive',    couleur: '#5c8f3e', desc: 'Se cueille sur une plante adulte (E).' },
    champignon: { id: 'champignon', nom: 'Champignon d\'ombre', couleur: '#5a4a7d', desc: 'Pousse dans la grotte.' },
    fil:        { id: 'fil',        nom: 'Fil de vie',     couleur: '#c45a8a', desc: 'Offert par une créature apprivoisée.' },
  };

  const STEPS = {
    chauffer:  { id: 'chauffer',  nom: 'Chauffer',  icone: '🔥' },
    remuer:    { id: 'remuer',    nom: 'Remuer',    icone: '🥄' },
    infuser:   { id: 'infuser',   nom: 'Infuser',   icone: '⏳' },
    refroidir: { id: 'refroidir', nom: 'Refroidir', icone: '❄' },
  };

  // Potions : ingrédients (ensemble non ordonné) + étapes (ordonnées)
  const POTIONS = {
    encre:      { id: 'encre',      nom: 'Potion d\'encre',    couleur: '#1f1a16', usage: 'boire', ingr: ['cendre', 'eau_source'], etapes: ['chauffer', 'remuer'],
                  desc: 'Restaure 20 points d\'encre.', enigme: 'Ce qui reste du feu, noyé dans l\'eau claire, chauffé puis remué : l\'encre revient.' },
    soin:       { id: 'soin',       nom: 'Potion de soin',     couleur: '#c45a5a', usage: 'boire', ingr: ['racine', 'eau_source'], etapes: ['infuser'],
                  desc: 'Soigne complètement.', enigme: 'Une racine encore vivante, laissée à infuser dans l\'eau de source.' },
    saut:       { id: 'saut',       nom: 'Élixir de saut',     couleur: '#3f9c9b', usage: 'boire', ingr: ['plume', 'eau_source'], etapes: ['remuer', 'remuer'],
                  desc: 'Sauts très hauts pendant 25 s.', enigme: 'Une plume dans l\'eau, qu\'on remue, et remue encore.' },
    flamme:     { id: 'flamme',     nom: 'Fiole de flamme',    couleur: '#d9622b', usage: 'lancer', ingr: ['braise', 'cendre'], etapes: ['chauffer', 'chauffer'],
                  desc: 'Se jette : éclate en flammes.', enigme: 'La braise et la cendre, chauffées deux fois : attention aux doigts.' },
    vision:     { id: 'vision',     nom: 'Potion de vision',   couleur: '#d8a63a', usage: 'boire', ingr: ['lueur', 'rosee'], etapes: ['infuser', 'refroidir'],
                  desc: 'Révèle les runes cachées pendant 40 s.', enigme: 'Une lueur infusée dans la rosée, puis refroidie pour qu\'elle se fixe.' },
    croissance: { id: 'croissance', nom: 'Potion de croissance', couleur: '#5c8f3e', usage: 'lancer', ingr: ['racine', 'rosee'], etapes: ['infuser', 'remuer'],
                  desc: 'Se jette : fait pousser tout autour.', enigme: 'Racine et rosée, infusées puis remuées : le printemps en bouteille.' },
    calme:      { id: 'calme',      nom: 'Philtre de calme',   couleur: '#c45a8a', usage: 'lancer', ingr: ['fil', 'rosee'], etapes: ['refroidir'],
                  desc: 'Se jette : apprivoise les créatures alentour.', enigme: 'Un fil de vie dans la rosée, simplement refroidi.' },
    legerete:   { id: 'legerete',   nom: 'Potion de légèreté', couleur: '#8fb8d8', usage: 'boire', ingr: ['plume', 'champignon'], etapes: ['refroidir', 'remuer'],
                  desc: 'Gravité réduite pendant 25 s.', enigme: 'Plume et champignon d\'ombre, refroidis puis remués : on flotte.' },
    petitesse:  { id: 'petitesse',  nom: 'Potion de petitesse', couleur: '#5a4a7d', usage: 'boire', ingr: ['champignon', 'poussiere'], etapes: ['chauffer', 'refroidir'],
                  desc: 'Tu rétrécis pendant 20 s : passe sous les obstacles bas.', enigme: 'Champignon et poussière de pierre, chauffés puis refroidis : on se sent tout petit.' },
    peau:       { id: 'peau',       nom: 'Baume de pierre',    couleur: '#8a6b2f', usage: 'boire', ingr: ['poussiere', 'cendre'], etapes: ['chauffer', 'remuer', 'refroidir'],
                  desc: 'Peau de pierre pendant 40 s : les créatures ne te blessent plus.', enigme: 'Poussière et cendre, chauffées, remuées, refroidies : dur comme le roc.' },
  };

  // Découvertes : ce qui est débloqué et comment
  const UNLOCKS = [
    { id: 'zone',   type: 'shape', item: 'zone',   titre: 'Forme : Zone',  indice: 'Touche 3 choses différentes avec des projectiles.', cond: (p) => p.compteurs.kindsHit.length >= 3 },
    { id: 'trait',  type: 'shape', item: 'trait',  titre: 'Forme : Trait', indice: 'Touche 5 fois un mannequin d\'entraînement.', cond: (p) => p.compteurs.mannequin >= 5 },
    { id: 'lumiere', type: 'core', item: 'lumiere', titre: 'Glyphe : Lumière', indice: 'Allume 3 torches.', cond: (p) => p.compteurs.torches >= 3 },
    { id: 'vie',    type: 'core', item: 'vie',    titre: 'Glyphe : Vie',   indice: 'Fais pousser une graine avec de l\'eau.', cond: (p) => p.compteurs.graines >= 1 },
    { id: 'ombre',  type: 'core', item: 'ombre',  titre: 'Glyphe : Ombre', indice: 'Ramasse un champignon d\'ombre dans la grotte.', cond: (p) => (p.ingredientsVus.includes('champignon')) },
    { id: 'force',  type: 'core', item: 'force',  titre: 'Glyphe : Force', indice: 'Repousse un golem avec le vent, 3 fois.', cond: (p) => p.compteurs.golemPousse >= 3 },
    { id: 'retarde', type: 'trigger', item: 'retarde', titre: 'Déclencheur : Retardé', indice: 'Prépare ta première potion.', cond: (p) => p.recettes.length >= 1 },
    { id: 'mods1',  type: 'mods', item: ['duree', 'taille'], titre: 'Modificateurs : Durée & Taille', indice: 'Découvre 3 recettes.', cond: (p) => p.recettes.length >= 3 },
    { id: 'mods2',  type: 'mods', item: ['rebond', 'persistance'], titre: 'Modificateurs : Rebond & Persistance', indice: 'Fais fondre un bloc de glace.', cond: (p) => p.compteurs.glace >= 1 },
    { id: 'mods3',  type: 'mods', item: ['vitesse', 'double'], titre: 'Modificateurs : Vitesse & Double', indice: 'Lis la rune cachée de la clairière.', cond: (p) => p.compteurs.runes >= 2 },
    { id: 'slot2',  type: 'slot', item: 2, titre: 'Deuxième emplacement de modificateur', indice: 'Possède 6 glyphes d\'effet.', cond: (p) => p.cores.length >= 6 },
    { id: 'slot3',  type: 'slot', item: 3, titre: 'Troisième emplacement de modificateur', indice: 'Possède les 8 glyphes d\'effet.', cond: (p) => p.cores.length >= 8 },
  ];

  const DEBUT = {
    cores: ['feu', 'vent', 'eau', 'terre'],
    shapes: ['projectile', 'soi'],
    mods: ['puissance', 'portee'],
    triggers: ['immediat', 'contact'],
    slots: 1,
  };

  const CHAPEAUX = ['Pointu', 'Large', 'Tordu'];
  const CAPES = [
    { nom: 'Prune', c: '#6b3f73' }, { nom: 'Bleu nuit', c: '#2f4a7a' }, { nom: 'Vert mousse', c: '#4a6b3a' },
    { nom: 'Brique', c: '#9a4a3a' }, { nom: 'Encre', c: '#2a2521' }, { nom: 'Ocre', c: '#a3782e' },
  ];
  const ACCESSOIRES = ['Bâton', 'Plume', 'Grimoire'];

  // ---------- Niveau extérieur (side-scroller) ----------
  const G = 600; // sol
  const W = 5000, H = 720;
  const LEVEL = {
    w: W, h: H, sol: G,
    spawn: { x: 160, y: G - 60 },
    zones: [
      { nom: 'Le Jardin', x: 0, w: 950 },
      { nom: 'La Rivière', x: 950, w: 800 },
      { nom: 'La Falaise', x: 1750, w: 900 },
      { nom: 'La Grotte', x: 2650, w: 950 },
      { nom: 'La Clairière', x: 3600, w: 1400 },
    ],
    grottes: [{ x: 2650, y: 0, w: 950, h: H }],
    solides: [
      // sol par segments (trous pour l'eau)
      { x: 0, y: G, w: 1020, h: 120, t: 'sol' },
      { x: 1260, y: G, w: 1500, h: 120, t: 'sol' },
      { x: 1020, y: G + 100, w: 240, h: 20, t: 'roc' }, // fond de la mare
      { x: 2760, y: G, w: 2240, h: 120, t: 'sol' },
      // mur gauche du labo
      { x: -40, y: 0, w: 40, h: H, t: 'roc' },
      { x: W, y: 0, w: 40, h: H, t: 'roc' },
      // Jardin : petit muret, plateforme
      { x: 560, y: G - 40, w: 90, h: 40, t: 'roc' },
      // Rivière : pierres de gué (dans l'eau)
      { x: 1080, y: G + 10, w: 50, h: 110, t: 'roc' },
      { x: 1170, y: G - 10, w: 50, h: 130, t: 'roc' },
      // Falaise : marches et corniches
      { x: 1900, y: G - 80, w: 160, h: 80, t: 'roc' },
      { x: 2060, y: G - 160, w: 140, h: 160, t: 'roc' },
      { x: 2150, y: G - 220, w: 50, h: 220, t: 'roc' },  // marche intermédiaire
      { x: 2200, y: G - 260, w: 400, h: 260, t: 'roc' }, // haut plateau
      { x: 2600, y: G - 220, w: 40, h: 220, t: 'roc' },  // descente vers la grotte
      { x: 2640, y: G - 160, w: 50, h: 160, t: 'roc' },
      { x: 2690, y: G - 80, w: 50, h: 80, t: 'roc' },
      { x: 2420, y: G - 420, w: 120, h: 24, t: 'roc' },  // corniche haute (vigne nécessaire)
      // Grotte : plafond et stalactites
      { x: 2650, y: 0, w: 950, h: 150, t: 'roc' },
      { x: 3000, y: 150, w: 60, h: 120, t: 'roc' },
      { x: 3300, y: 150, w: 40, h: 90, t: 'roc' },
      { x: 3100, y: G - 70, w: 120, h: 70, t: 'roc' },
      { x: 3380, y: G - 110, w: 90, h: 110, t: 'roc' },
      // Clairière : plateformes légères
      { x: 3900, y: G - 90, w: 120, h: 24, t: 'roc' },
      { x: 4100, y: G - 170, w: 120, h: 24, t: 'roc' },
      { x: 4500, y: G - 60, w: 200, h: 60, t: 'roc' },
    ],
    eaux: [
      { x: 1020, y: G + 10, w: 240, h: 110 },
    ],
    objets: [
      { t: 'porte', x: 60, y: G - 110 },
      { t: 'mannequin', x: 380, y: G - 70 },
      { t: 'caisse', x: 480, y: G - 36 },
      { t: 'torche', x: 700, y: G - 80 },
      { t: 'graine', x: 760, y: G - 10 },
      { t: 'buisson', x: 860, y: G - 44 },
      { t: 'pancarte', x: 220, y: G - 70, texte: 'Terrain d\'essai. Vise à la souris, lance avec le clic.' },
      // Rivière
      { t: 'torche', x: 1320, y: G - 80 },
      { t: 'rocher', x: 1420, y: G - 56 },
      { t: 'torche', x: 1560, y: G - 80 },
      { t: 'glace', x: 1660, y: G - 110 },
      { t: 'buisson', x: 1800, y: G - 44 },
      // Falaise
      { t: 'graine', x: 2080, y: G - 170 },
      { t: 'caisse', x: 1930, y: G - 116 },
      { t: 'pancarte', x: 2260, y: G - 330, texte: 'La vigne grimpe si on l\'arrose. Ou bien... un bloc de terre ?' },
      { t: 'graine', x: 2470, y: G - 270 },
      { t: 'torche', x: 2480, y: G - 420 - 80 },
      { t: 'buisson', x: 2560, y: G - 304 },
      // Grotte
      { t: 'champignon', x: 2900, y: G - 26 },
      { t: 'rune', x: 3240, y: G - 160 },
      { t: 'champignon', x: 3440, y: G - 136 },
      { t: 'torche', x: 3520, y: G - 80 },
      // Clairière
      { t: 'rocher', x: 3700, y: G - 56 },
      { t: 'buisson', x: 3800, y: G - 44 },
      { t: 'mannequin', x: 4000, y: G - 70 },
      { t: 'caisse', x: 4150, y: G - 206 },
      { t: 'torche', x: 4300, y: G - 80 },
      { t: 'graine', x: 4400, y: G - 10 },
      { t: 'rune', x: 4600, y: G - 150 },
      { t: 'pancarte', x: 4480, y: G - 130, texte: 'La stèle garde un secret que seule la lumière révèle.' },
      { t: 'buisson', x: 4850, y: G - 44 },
    ],
    creatures: [
      { t: 'limace', x: 620, y: G - 30 },
      { t: 'limace', x: 1800, y: G - 30 },
      { t: 'limace', x: 2300, y: G - 290 },
      { t: 'follet', x: 2850, y: G - 200 },
      { t: 'follet', x: 3150, y: G - 250 },
      { t: 'limace', x: 3300, y: G - 30 },
      { t: 'golem', x: 3850, y: G - 70 },
      { t: 'limace', x: 4200, y: G - 30 },
      { t: 'golem', x: 4700, y: G - 130 },
    ],
  };

  return { CORES, SHAPES, MODS, TRIGGERS, INGREDIENTS, STEPS, POTIONS, UNLOCKS, DEBUT, CHAPEAUX, CAPES, ACCESSOIRES, LEVEL };
})();
