'use strict';
// ---------- Données du jeu : glyphes, ingrédients, recettes, découvertes, observations ----------
const DATA = (() => {
  // Glyphes d'effet (centre du sceau)
  const CORES = {
    feu:     { id: 'feu',     nom: 'Feu',      couleur: '#d9622b', cout: 3, desc: 'Enflamme le bois, l\'herbe, l\'huile. Fait fondre glace et neige, évapore l\'eau.' },
    vent:    { id: 'vent',    nom: 'Vent',     couleur: '#3f9c9b', cout: 2, desc: 'Repousse créatures, objets, gaz et poudres ; souffle les flammes. Sur soi : bond aérien et planeur.' },
    eau:     { id: 'eau',     nom: 'Eau',      couleur: '#3b6fb6', cout: 2, desc: 'Fait jaillir de l\'eau : éteint, arrose, dissipe les follets. Sur soi : trempé(e), respiration sous l\'eau.' },
    terre:   { id: 'terre',   nom: 'Terre',    couleur: '#8a6b2f', cout: 3, desc: 'Fait surgir de la terre (de la pierre avec Persistance). Sur soi : peau de pierre.' },
    lumiere: { id: 'lumiere', nom: 'Lumière',  couleur: '#d8a63a', cout: 2, desc: 'Éclaire, étourdit les créatures, révèle les runes.' },
    ombre:   { id: 'ombre',   nom: 'Ombre',    couleur: '#5a4a7d', cout: 3, desc: 'Endort les créatures. Sur soi : invisible.' },
    vie:     { id: 'vie',     nom: 'Vie',      couleur: '#5c8f3e', cout: 4, desc: 'Soigne, fait pousser les plantes, apprivoise.' },
    force:   { id: 'force',   nom: 'Force',    couleur: '#9a4a8c', cout: 4, desc: 'Attire tout vers un point, même les liquides et le sable. Sur soi : élan.' },
    froid:   { id: 'froid',   nom: 'Froid',    couleur: '#7fb4d8', cout: 3, desc: 'Gèle l\'eau en glace, fige la lave, condense la vapeur. Sur soi : patins de glace sur l\'eau.' },
    foudre:  { id: 'foudre',  nom: 'Foudre',   couleur: '#e0c43a', cout: 4, desc: 'Électrise : l\'eau et le métal conduisent, l\'huile s\'embrase, les créatures sont secouées. Sur soi : vitesse.' },
    acide:   { id: 'acide',   nom: 'Acide',    couleur: '#8fbf2a', cout: 3, desc: 'Fait couler de l\'acide qui ronge pierre, terre, bois et métal. Sur soi : tu dissous ce que tu touches.' },
    gravite: { id: 'gravite', nom: 'Gravité',  couleur: '#6c5ab8', cout: 5, desc: 'Inverse la pesanteur dans une zone : tout flotte. Sur soi : vol libre.' },
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
    persistance: { id: 'persistance', nom: 'Persistance', cout: 3, desc: 'Laisse une trace durable (flammes, pierre au lieu de terre, lueur...).' },
    vitesse:     { id: 'vitesse',     nom: 'Vitesse',     cout: 1, desc: 'Projectile plus rapide et plus droit.' },
    double:      { id: 'double',      nom: 'Double',      cout: 3, desc: 'Deux fois l\'effet, en éventail.' },
  };
  // Déclencheurs (pointes)
  const TRIGGERS = {
    immediat: { id: 'immediat', nom: 'Immédiat', cout: 0, desc: 'L\'effet agit tout de suite, en continu sur ce qu\'il touche.' },
    contact:  { id: 'contact',  nom: 'Au contact', cout: 1, desc: 'Éclate à la première chose touchée (ou quand on te touche).' },
    retarde:  { id: 'retarde',  nom: 'Retardé',  cout: 1, desc: 'Se fixe, puis éclate après deux secondes.' },
  };

  // Ingrédients. `liquide` : une matière qu'on puise en fiole, lançable depuis la barre.
  const INGREDIENTS = {
    eau_source: { id: 'eau_source', nom: 'Eau de source', couleur: '#3b6fb6', infini: true, desc: 'Toujours disponible au labo.' },
    cendre:     { id: 'cendre',     nom: 'Cendre',         couleur: '#555049', infini: true, desc: 'Toujours disponible au labo.' },
    braise:     { id: 'braise',     nom: 'Pétale de braise', couleur: '#d9622b', desc: 'Reste d\'un buisson brûlé.' },
    rosee:      { id: 'rosee',      nom: 'Goutte de rosée', couleur: '#6aa0d8', desc: 'Se recueille au bord de l\'eau (E).' },
    plume:      { id: 'plume',      nom: 'Plume de vent',  couleur: '#3f9c9b', desc: 'Tombe d\'un feu follet dissipé par l\'eau.' },
    poussiere:  { id: 'poussiere',  nom: 'Poussière de pierre', couleur: '#8a6b2f', desc: 'Sort d\'un rocher fissuré brisé par la puissance.' },
    lueur:      { id: 'lueur',      nom: 'Lueur captive',  couleur: '#d8a63a', desc: 'Offerte par une rune révélée (E).' },
    racine:     { id: 'racine',     nom: 'Racine vive',    couleur: '#5c8f3e', desc: 'Se cueille sur une vigne adulte (E).' },
    champignon: { id: 'champignon', nom: 'Champignon d\'ombre', couleur: '#5a4a7d', desc: 'Pousse dans les grottes.' },
    fil:        { id: 'fil',        nom: 'Fil de vie',     couleur: '#c45a8a', desc: 'Offert par une créature apprivoisée.' },
    flocon:     { id: 'flocon',     nom: 'Flocon éternel', couleur: '#bfe3f5', desc: 'Se gratte dans la neige (X).' },
    eclat:      { id: 'eclat',      nom: 'Éclat de cristal', couleur: '#b58fd8', desc: 'Se gratte sur un cristal des grottes (X).' },
    eau:        { id: 'eau',        nom: 'Fiole d\'eau',   couleur: '#3b6fb6', liquide: 'EAU', desc: 'Puisée dans une mare (E). Vaut de l\'eau de source au chaudron.' },
    huile:      { id: 'huile',      nom: 'Fiole d\'huile', couleur: '#4a3a20', liquide: 'HUILE', desc: 'Puisée dans une nappe d\'huile (E). Flotte et brûle.' },
    acide:      { id: 'acide',      nom: 'Fiole d\'acide', couleur: '#8fbf2a', liquide: 'ACIDE', desc: 'Puisée dans une mare d\'acide (E). Ronge presque tout.' },
    lave:       { id: 'lave',       nom: 'Fiole de lave',  couleur: '#d9622b', liquide: 'LAVE', desc: 'Puisée dans la lave (E). Ne pas boire.' },
    seve:       { id: 'seve',       nom: 'Fiole de sève',  couleur: '#c9a63a', liquide: 'SEVE', desc: 'Puisée dans une flaque de sève collante (E).' },
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
                  desc: 'Restaure 25 points d\'encre.', enigme: 'Ce qui reste du feu, noyé dans l\'eau claire, chauffé puis remué : l\'encre revient.' },
    soin:       { id: 'soin',       nom: 'Potion de soin',     couleur: '#c45a5a', usage: 'boire', ingr: ['racine', 'eau_source'], etapes: ['infuser'],
                  desc: 'Soigne complètement.', enigme: 'Une racine encore vivante, laissée à infuser dans l\'eau de source.' },
    saut:       { id: 'saut',       nom: 'Élixir de saut',     couleur: '#3f9c9b', usage: 'boire', ingr: ['plume', 'eau_source'], etapes: ['remuer', 'remuer'],
                  desc: 'Sauts très hauts pendant 30 s.', enigme: 'Une plume dans l\'eau, qu\'on remue, et remue encore.' },
    flamme:     { id: 'flamme',     nom: 'Fiole de flamme',    couleur: '#d9622b', usage: 'lancer', ingr: ['braise', 'cendre'], etapes: ['chauffer', 'chauffer'],
                  desc: 'Se jette : éclate en flammes.', enigme: 'La braise et la cendre, chauffées deux fois : attention aux doigts.' },
    vision:     { id: 'vision',     nom: 'Potion de vision',   couleur: '#d8a63a', usage: 'boire', ingr: ['lueur', 'rosee'], etapes: ['infuser', 'refroidir'],
                  desc: 'Révèle les runes cachées pendant 40 s.', enigme: 'Une lueur infusée dans la rosée, puis refroidie pour qu\'elle se fixe.' },
    croissance: { id: 'croissance', nom: 'Potion de croissance', couleur: '#5c8f3e', usage: 'lancer', ingr: ['racine', 'rosee'], etapes: ['infuser', 'remuer'],
                  desc: 'Se jette : fait pousser tout autour.', enigme: 'Racine et rosée, infusées puis remuées : le printemps en bouteille.' },
    calme:      { id: 'calme',      nom: 'Philtre de calme',   couleur: '#c45a8a', usage: 'lancer', ingr: ['fil', 'rosee'], etapes: ['refroidir'],
                  desc: 'Se jette : apprivoise les créatures alentour.', enigme: 'Un fil de vie dans la rosée, simplement refroidi.' },
    legerete:   { id: 'legerete',   nom: 'Potion de légèreté', couleur: '#8fb8d8', usage: 'boire', ingr: ['plume', 'champignon'], etapes: ['refroidir', 'remuer'],
                  desc: 'Gravité réduite pendant 30 s.', enigme: 'Plume et champignon d\'ombre, refroidis puis remués : on flotte.' },
    petitesse:  { id: 'petitesse',  nom: 'Potion de petitesse', couleur: '#5a4a7d', usage: 'boire', ingr: ['champignon', 'poussiere'], etapes: ['chauffer', 'refroidir'],
                  desc: 'Tu rétrécis pendant 25 s : passe dans les boyaux étroits.', enigme: 'Champignon et poussière de pierre, chauffés puis refroidis : on se sent tout petit.' },
    peau:       { id: 'peau',       nom: 'Baume de pierre',    couleur: '#8a6b2f', usage: 'boire', ingr: ['poussiere', 'cendre'], etapes: ['chauffer', 'remuer', 'refroidir'],
                  desc: 'Peau de pierre pendant 45 s : ni bousculade, ni brûlure.', enigme: 'Poussière et cendre, chauffées, remuées, refroidies : dur comme le roc.' },
    vol:        { id: 'vol',        nom: 'Élixir de vol',      couleur: '#6c5ab8', usage: 'boire', ingr: ['plume', 'lueur', 'rosee'], etapes: ['infuser', 'remuer'],
                  desc: 'Vol libre pendant 35 s (flèches ou ZQSD dans toutes les directions).', enigme: 'Une plume, une lueur, une goutte de rosée : infuser, remuer, et le ciel s\'ouvre.' },
    respiration: { id: 'respiration', nom: 'Potion de branchies', couleur: '#3b6fb6', usage: 'boire', ingr: ['rosee', 'fil', 'racine'], etapes: ['infuser', 'refroidir'],
                  desc: 'Respirer sous l\'eau et nager vite pendant 60 s.', enigme: 'Rosée, fil de vie et racine : infuser, puis refroidir. On respire l\'eau.' },
    gel:        { id: 'gel',        nom: 'Fiole de gel',       couleur: '#7fb4d8', usage: 'lancer', ingr: ['flocon', 'rosee'], etapes: ['refroidir', 'refroidir'],
                  desc: 'Se jette : gèle l\'eau et fige tout alentour.', enigme: 'Un flocon éternel dans la rosée, refroidi deux fois : l\'hiver en fiole.' },
    orage:      { id: 'orage',      nom: 'Orage en bouteille', couleur: '#e0c43a', usage: 'lancer', ingr: ['lueur', 'eclat', 'plume'], etapes: ['chauffer', 'chauffer', 'refroidir'],
                  desc: 'Se jette : décharge de foudre.', enigme: 'Lueur, éclat de cristal et plume, chauffés deux fois puis refroidis : ça crépite.' },
    vitriol:    { id: 'vitriol',    nom: 'Vitriol',            couleur: '#8fbf2a', usage: 'lancer', ingr: ['cendre', 'champignon', 'eau_source'], etapes: ['chauffer', 'infuser'],
                  desc: 'Se jette : une mare d\'acide qui ronge la pierre.', enigme: 'Cendre, champignon et eau, chauffés puis infusés : ça fume et ça creuse.' },
    geant:      { id: 'geant',      nom: 'Potion de géant',    couleur: '#9a4a3a', usage: 'boire', ingr: ['racine', 'poussiere', 'braise'], etapes: ['chauffer', 'remuer'],
                  desc: 'Tu grandis pendant 25 s : rien ne te bouscule, tu pousses les caisses du pied.', enigme: 'Racine, poussière et braise, chauffées et remuées : on voit loin.' },
    gregeois:   { id: 'gregeois',   nom: 'Feu grégeois',       couleur: '#b84a1b', usage: 'lancer', ingr: ['huile', 'braise'], etapes: ['chauffer'],
                  desc: 'Se jette : une nappe d\'huile enflammée.', enigme: 'De l\'huile puisée et une braise, simplement chauffées. Ça brûle même sur l\'eau.' },
    savon:      { id: 'savon',      nom: 'Savon de sorcier',   couleur: '#e8e0c0', usage: 'lancer', ingr: ['cendre', 'huile'], etapes: ['chauffer', 'remuer'],
                  desc: 'Se jette : tout glisse alentour pendant un moment.', enigme: 'Cendre et huile, chauffées puis remuées : c\'est la vraie recette du savon.' },
  };

  // Observations : des phénomènes vus à l'écran font germer les glyphes
  const OBSERVATIONS = {
    fonte:      { id: 'fonte',      nom: 'La glace fond',           glyphe: 'froid',   desc: 'De la glace ou de la neige redevient eau.' },
    gel:        { id: 'gel',        nom: 'L\'eau gèle',             glyphe: 'froid',   desc: 'De l\'eau devient glace.' },
    foudre:     { id: 'foudre',     nom: 'La foudre frappe',        glyphe: 'foudre',  desc: 'Un éclair touche le sol ou l\'eau. Les orages en apportent.' },
    corrosion:  { id: 'corrosion',  nom: 'L\'acide ronge',          glyphe: 'acide',   desc: 'De l\'acide dissout de la matière.' },
    ile:        { id: 'ile',        nom: 'Une île dans le ciel',    glyphe: 'gravite', desc: 'Poser le pied sur une île volante.' },
    vapeur:     { id: 'vapeur',     nom: 'L\'eau et le feu',        glyphe: null,      desc: 'Le feu rencontre l\'eau : vapeur.' },
    obsidienne: { id: 'obsidienne', nom: 'La lave et l\'eau',       glyphe: null,      desc: 'La lave touche l\'eau et se fige en pierre noire.' },
    verre:      { id: 'verre',      nom: 'Le sable et la lave',     glyphe: null,      desc: 'Le sable chauffé par la lave devient verre.' },
    incendie:   { id: 'incendie',   nom: 'Le feu se propage',       glyphe: null,      desc: 'Une flamme en allume une autre.' },
  };

  // Découvertes : ce qui est débloqué et comment
  const UNLOCKS = [
    { id: 'zone',   type: 'shape', item: 'zone',   titre: 'Forme : Zone',  indice: 'Touche 3 choses différentes avec des projectiles.', cond: (p) => p.compteurs.kindsHit.length >= 3 },
    { id: 'trait',  type: 'shape', item: 'trait',  titre: 'Forme : Trait', indice: 'Touche 5 fois un mannequin d\'entraînement.', cond: (p) => p.compteurs.mannequin >= 5 },
    { id: 'lumiere', type: 'core', item: 'lumiere', titre: 'Glyphe : Lumière', indice: 'Allume 3 torches.', cond: (p) => p.compteurs.torches >= 3 },
    { id: 'vie',    type: 'core', item: 'vie',    titre: 'Glyphe : Vie',   indice: 'Fais pousser une graine avec de l\'eau.', cond: (p) => p.compteurs.graines >= 1 },
    { id: 'ombre',  type: 'core', item: 'ombre',  titre: 'Glyphe : Ombre', indice: 'Ramasse un champignon d\'ombre dans une grotte.', cond: (p) => (p.ingredientsVus.includes('champignon')) },
    { id: 'force',  type: 'core', item: 'force',  titre: 'Glyphe : Force', indice: 'Repousse un golem avec le vent, 3 fois.', cond: (p) => p.compteurs.golemPousse >= 3 },
    { id: 'froid',  type: 'core', item: 'froid',  titre: 'Glyphe : Froid', indice: 'Observe 3 fois la glace qui fond ou l\'eau qui gèle.', cond: (p) => (p.obs.fonte || 0) + (p.obs.gel || 0) >= 3 },
    { id: 'foudre', type: 'core', item: 'foudre', titre: 'Glyphe : Foudre', indice: 'Observe 3 éclairs frapper (les orages en apportent).', cond: (p) => (p.obs.foudre || 0) >= 3 },
    { id: 'acide',  type: 'core', item: 'acide',  titre: 'Glyphe : Acide', indice: 'Observe 3 fois l\'acide ronger la matière.', cond: (p) => (p.obs.corrosion || 0) >= 3 },
    { id: 'gravite', type: 'core', item: 'gravite', titre: 'Glyphe : Gravité', indice: 'Pose le pied sur une île volante.', cond: (p) => (p.obs.ile || 0) >= 1 },
    { id: 'retarde', type: 'trigger', item: 'retarde', titre: 'Déclencheur : Retardé', indice: 'Prépare ta première potion.', cond: (p) => p.recettes.length >= 1 },
    { id: 'mods1',  type: 'mods', item: ['duree', 'taille'], titre: 'Modificateurs : Durée & Taille', indice: 'Découvre 3 recettes.', cond: (p) => p.recettes.length >= 3 },
    { id: 'mods2',  type: 'mods', item: ['rebond', 'persistance'], titre: 'Modificateurs : Rebond & Persistance', indice: 'Fais fondre de la glace.', cond: (p) => p.compteurs.glace >= 1 },
    { id: 'mods3',  type: 'mods', item: ['vitesse', 'double'], titre: 'Modificateurs : Vitesse & Double', indice: 'Lis deux runes cachées.', cond: (p) => p.compteurs.runes >= 2 },
    { id: 'slot2',  type: 'slot', item: 2, titre: 'Deuxième emplacement de modificateur', indice: 'Possède 6 glyphes d\'effet.', cond: (p) => p.cores.length >= 6 },
    { id: 'slot3',  type: 'slot', item: 3, titre: 'Troisième emplacement de modificateur', indice: 'Possède 10 glyphes d\'effet.', cond: (p) => p.cores.length >= 10 },
  ];

  const DEBUT = {
    cores: ['feu', 'vent', 'eau', 'terre'],
    shapes: ['projectile', 'soi'],
    mods: ['puissance', 'portee'],
    triggers: ['immediat', 'contact'],
    slots: 1,
    sceaux: [
      { nom: 'Étincelle', core: 'feu', shape: 'projectile', mods: [null, null, null], trigger: 'contact' },
      { nom: 'Goutte', core: 'eau', shape: 'projectile', mods: [null, null, null], trigger: 'contact' },
      { nom: 'Souffle', core: 'vent', shape: 'soi', mods: [null, null, null], trigger: 'immediat' },
    ],
  };

  // Expérience : chaque découverte en donne ; les niveaux augmentent l'encre.
  const XP = { observation: 6, recette: 15, decouverte: 25, ingredient: 4, parNiveau: (n) => 40 + n * 30, encreParNiveau: 6, regenParNiveau: 0.15 };

  const CHAPEAUX = ['Pointu', 'Large', 'Tordu'];
  const CAPES = [
    { nom: 'Prune', c: '#6b3f73' }, { nom: 'Bleu nuit', c: '#2f4a7a' }, { nom: 'Vert mousse', c: '#4a6b3a' },
    { nom: 'Brique', c: '#9a4a3a' }, { nom: 'Encre', c: '#2a2521' }, { nom: 'Ocre', c: '#a3782e' },
  ];
  const ACCESSOIRES = ['Bâton', 'Plume', 'Grimoire'];

  return { CORES, SHAPES, MODS, TRIGGERS, INGREDIENTS, STEPS, POTIONS, OBSERVATIONS, UNLOCKS, DEBUT, XP, CHAPEAUX, CAPES, ACCESSOIRES };
})();
