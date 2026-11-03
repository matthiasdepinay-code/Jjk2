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
    gravite: { id: 'gravite', nom: 'Gravité',  couleur: '#6c5ab8', cout: 5, desc: 'Pose un champ de pesanteur orienté dans le sens du lancer : tout y tombe de ce côté, créatures, caisses, eau, sable. Puissance : écrasante. Inverser : apesanteur. Sur soi : ta pesanteur pointe vers la surface visée (murs, plafond) ; vise le vide pour voler ; avec Puissance, tu deviens une enclume ; avec Inverser, tu tombes vers le ciel.' },
    temps:   { id: 'temps',   nom: 'Temps',    couleur: '#8a8f9a', cout: 4, desc: 'Le temps passe plus vite : les plantes poussent, le feu s\'éteint, la lave se fige, la glace fond, les créatures s\'engourdissent. Sur soi : hâte, encre rapide.' },
    transmutation: { id: 'transmutation', nom: 'Transmutation', couleur: '#c08a3a', cout: 4, desc: 'Change la matière : pierre en sable, sable en terre, terre en pierre, bois en pierre, eau en huile, glace en verre... Sur soi : peau de pierre.' },
    son:     { id: 'son',     nom: 'Son',      couleur: '#d08ab0', cout: 3, desc: 'Onde de choc : repousse, réveille, brise le verre, attire les créatures curieuses.' },
    esprit:  { id: 'esprit',  nom: 'Esprit',   couleur: '#b08ad8', cout: 5, desc: 'Prend le contrôle d\'une créature touchée pendant un moment (E pour la relâcher).' },
    lien:    { id: 'lien',    nom: 'Lien',     couleur: '#c9a63a', cout: 3, desc: 'Une corde magique vers ce que le sort touche : on s\'y hisse, on s\'y balance (Espace pour lâcher).' },
    portail: { id: 'portail', nom: 'Portail',  couleur: '#4fb0a0', cout: 5, desc: 'Deux lancers posent deux portails : tout ce qui entre dans l\'un sort par l\'autre, même les liquides. Sur soi : rejoindre son dernier portail.' },
    marque:  { id: 'marque',  nom: 'Marque',   couleur: '#e0b050', cout: 1, desc: 'Pose un repère lumineux là où le sort touche (sur une créature, il la suit). Trois au plus. Les sorts ciblés « Marque » visent le plus récent, même hors de vue.' },
    contre:  { id: 'contre',  nom: 'Contre-sort', couleur: '#a8a29a', cout: 3, desc: 'Dissipe la magie posée : champs, pièges, totems, sorts en attente, portails, pesanteurs, marques.' },
    metamorphose: { id: 'metamorphose', nom: 'Métamorphose', couleur: '#c06aa0', cout: 5, desc: 'Change une créature en une autre pour un moment (même un golem en grenouille), une caisse en rocher. Sur soi : tu prends une forme animale, selon le glyphe fusionné (eau : grenouille, vent : chauve-souris, vie : lapin, terre : golem). Inverser : rend sa vraie forme.' },
    rembobinage: { id: 'rembobinage', nom: 'Rembobinage', couleur: '#7a8ad0', cout: 5, desc: 'Remonte le temps de quelques secondes dans la zone : la matière revient comme avant, les créatures reculent (et se relèvent). Sur soi : tu reviens là où tu étais, avec ta vitalité d\'alors. Durée : remonte plus loin.' },
    metal:   { id: 'metal',   nom: 'Métal',    couleur: '#737e86', cout: 4, desc: 'Fait surgir du métal, qui conduit la foudre et résiste à l\'acide. Attire caisses, rochers et golems. Sur soi : armure.' },
  };
  // Effets dérivés (par Inverser), jamais dans la palette
  const PSEUDO = {
    creuser:     { id: 'creuser',     nom: 'Creuser',     couleur: '#6b4f2a' },
    fanaison:    { id: 'fanaison',    nom: 'Fanaison',    couleur: '#8a6b2f' },
    neutraliser: { id: 'neutraliser', nom: 'Neutraliser', couleur: '#8fb8d8' },
    poids:       { id: 'poids',       nom: 'Poids',       couleur: '#4a4a55' },
    secheresse:  { id: 'secheresse',  nom: 'Sécheresse',  couleur: '#d9c48a' },
    ralentir:    { id: 'ralentir',    nom: 'Ralentir',    couleur: '#5a6070' },
    silence:     { id: 'silence',     nom: 'Silence',     couleur: '#6a5a7a' },
    rouille:     { id: 'rouille',     nom: 'Rouille',     couleur: '#9a5a3a' },
  };
  const INVERSE = { marque: 'marque', contre: 'contre', feu: 'froid', froid: 'feu', force: 'vent', vent: 'force', lumiere: 'ombre', ombre: 'lumiere', terre: 'creuser', vie: 'fanaison', acide: 'neutraliser', foudre: 'neutraliser', gravite: 'poids', eau: 'secheresse', temps: 'ralentir', son: 'silence', metal: 'rouille', transmutation: 'transmutation', esprit: 'esprit', lien: 'lien', portail: 'portail', metamorphose: 'metamorphose', rembobinage: 'temps' };
  // Fusions nommées (clé : deux glyphes triés)
  const COMBOS = {
    'feu|vent': { nom: 'Tornade de feu', desc: 'Des flammes qui tourbillonnent et se déplacent.' },
    'feu|terre': { nom: 'Lave', desc: 'La terre fond en lave.' },
    'eau|feu': { nom: 'Vapeur', desc: 'Les deux s\'annulent dans un grand nuage.' },
    'eau|froid': { nom: 'Banquise', desc: 'Un bloc de glace solide, même en l\'air.' },
    'eau|foudre': { nom: 'Orage', desc: 'L\'eau conduit loin, la pluie tombe.' },
    'froid|vent': { nom: 'Blizzard', desc: 'Neige et bourrasques.' },
    'eau|vie': { nom: 'Printemps', desc: 'Tout pousse d\'un coup.' },
    'lumiere|ombre': { nom: 'Crépuscule', desc: 'Rien. Un silence gêné.' },
    'force|terre': { nom: 'Séisme', desc: 'Le sol tremble et attire.' },
    'gravite|vent': { nom: 'Cyclone', desc: 'Une colonne qui soulève tout, longtemps.' },
    'force|gravite': { nom: 'Singularité', desc: 'Tout est aspiré vers un point, puis recraché.' },
    'gravite|terre': { nom: 'Météore', desc: 'Un rocher se détache du ciel et s\'écrase.' },
    'eau|gravite': { nom: 'Sphère d\'eau', desc: 'Une bulle d\'eau qui flotte en apesanteur.' },
    'gravite|temps': { nom: 'Chute lente', desc: 'Tout tombe au ralenti dans la bulle.' },
    'feu|froid': { nom: 'Choc thermique', desc: 'La pierre éclate en sable.' },
    'acide|feu': { nom: 'Fumée toxique', desc: 'Un nuage qui endort.' },
    'ombre|vie': { nom: 'Mycélium', desc: 'Des champignons d\'ombre poussent.' },
    'eau|terre': { nom: 'Boue', desc: 'La terre coule en sable mouillé.' },
    'feu|lumiere': { nom: 'Petit soleil', desc: 'Une lumière immense et chaude.' },
    'foudre|metal': { nom: 'Dynamo', desc: 'Le métal garde la charge longtemps.' },
    'son|verre': { nom: 'Chant du verre', desc: '' },
    'temps|vie': { nom: 'Forêt instantanée', desc: 'Les plantes jaillissent.' },
    'portail|eau': { nom: 'Source', desc: 'De l\'eau jaillit du portail.' },
  };
  // Formes (anneau intérieur)
  const SHAPES = {
    projectile: { id: 'projectile', nom: 'Projectile', cout: 1, desc: 'Une bille d\'encre qui file dans la direction visée.' },
    soi:        { id: 'soi',        nom: 'Sur soi',    cout: 1, desc: 'L\'effet s\'applique à toi-même.' },
    zone:       { id: 'zone',       nom: 'Zone',       cout: 3, desc: 'L\'effet surgit autour du point visé, à portée.' },
    trait:      { id: 'trait',      nom: 'Trait',      cout: 3, desc: 'Une ligne d\'énergie instantanée vers le point visé.' },
    aura:       { id: 'aura',       nom: 'Aura',       cout: 3, desc: 'L\'effet t\'entoure et te suit un moment.' },
    mur:        { id: 'mur',        nom: 'Mur',        cout: 4, desc: 'L\'effet se dresse en colonne au point visé.' },
    totem:      { id: 'totem',      nom: 'Totem',      cout: 5, desc: 'Un piquet planté au point visé répète l\'effet toutes les deux secondes.' },
    chaine:     { id: 'chaine',     nom: 'Chaîne',     cout: 4, desc: 'Un projectile qui saute de cible en cible.' },
    pluie:      { id: 'pluie',      nom: 'Pluie',      cout: 5, desc: 'L\'effet tombe du ciel sur la zone visée pendant un moment.' },
    objet:      { id: 'objet',      nom: 'Sur objet',  cout: 3, desc: 'Enchante la caisse ou la créature la plus proche du point visé : elle porte l\'effet.' },
    prise:      { id: 'prise',      nom: 'Prise',      cout: 4, desc: 'Saisit tout ce qui se trouve au point visé : eau, sable, lave, créatures, caisses. La masse suit ta souris ; clique à nouveau pour la lancer (secoue la souris pour viser). Elle s\'écrase et rend ce qu\'elle porte.' },
    bouclier:   { id: 'bouclier',   nom: 'Bouclier',   cout: 3, desc: 'Un arc devant toi, tourné vers la souris, qui porte l\'élément : le feu brûle ce qui le touche, le froid gèle l\'eau, le vent renvoie, la terre bloque. Il repousse aussi l\'eau et le sable : marche au fond du lac.' },
    invocation: { id: 'invocation', nom: 'Invocation', cout: 6, desc: 'Un petit familier de l\'élément te suit et attaque ce qui t\'attaque.' },
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
    inverser:    { id: 'inverser',    nom: 'Inverser',    cout: 2, desc: 'Retourne l\'effet : le feu refroidit, la terre creuse, la vie fane, l\'eau assèche, la force repousse...' },
    echo:        { id: 'echo',        nom: 'Écho',        cout: 3, desc: 'L\'effet se répète deux fois de plus, au même endroit.' },
    teleguide:   { id: 'teleguide',   nom: 'Téléguidé',   cout: 2, desc: 'Le projectile suit la souris.' },
    orbite:      { id: 'orbite',      nom: 'Orbite',      cout: 3, desc: 'Trois billes tournent autour de toi un moment.' },
    canalise:    { id: 'canalise',    nom: 'Canalisé',    cout: 2, desc: 'Tant que tu maintiens le clic, l\'effet suit la souris et consomme de l\'encre.' },
    boomerang:   { id: 'boomerang',   nom: 'Boomerang',   cout: 2, desc: 'Le projectile file, traverse ce qu\'il touche en éclatant, puis revient dans ta main.' },
    spirale:     { id: 'spirale',     nom: 'Spirale',     cout: 1, desc: 'Le projectile tourne en vrille autour de sa course : il balaie plus large.' },
    rasesol:     { id: 'rasesol',     nom: 'Rase-sol',    cout: 1, desc: 'Le projectile court au ras du sol, épouse les pentes et grimpe les marches.' },
    sous:        { id: 'sous',        nom: 'Sous-sceau',  cout: 0, desc: 'Un sceau consigné entier, lancé là où celui-ci éclate.' },
  };
  // Langages des éléments : à force d'employer un élément, on en apprend la grammaire
  const MAITRISE = { seuils: [12, 40, 100], noms: ['Novice', 'Initié(e)', 'Adepte', 'Maître'] };
  const niveauMaitrise = (pts) => (pts >= 100 ? 3 : pts >= 40 ? 2 : pts >= 12 ? 1 : 0);
  const LANGAGES = {
    feu:     { glyphe: 'chaleur',    nom: 'Chaleur',    de: 'du feu',        paliers: ['Flamme blanche : brûle plus fort, vitrifie le sable, fond glace et neige d\'un coup.', 'Flamme bleue : si chaude qu\'elle fond la pierre et le métal en lave, et entame le golem.'] },
    eau:     { glyphe: 'pression',   nom: 'Pression',   de: 'de l\'eau',     paliers: ['Jet : l\'eau frappe fort, repousse et creuse terre, sable et boue.', 'Lame d\'eau : elle entaille le bois, use la pierre et brise la glace.'] },
    froid:   { glyphe: 'givre',      nom: 'Givre',      de: 'du froid',      paliers: ['Gel profond : les créatures restent prises dans la glace ; la lave se fige d\'un coup.', 'Zéro absolu : l\'air lui-même tombe en neige, l\'acide cristallise, la saumure rend son sel.'] },
    terre:   { glyphe: 'densite',    nom: 'Densité',    de: 'de la terre',   paliers: ['La terre surgit déjà tassée en pierre.', 'La pierre se serre jusqu\'au cristal, qui luit dans le noir.'] },
    vent:    { glyphe: 'tourbillon', nom: 'Tourbillon', de: 'du vent',       paliers: ['Le vent tourne et soulève : créatures, eau et sable montent.', 'Tornade : une colonne tournoyante reste quelques secondes et aspire tout ce qui passe.'] },
    foudre:  { glyphe: 'tension',    nom: 'Tension',    de: 'de la foudre',  paliers: ['Arc : l\'éclair saute vers trois cibles proches.', 'Foudre violette : six cibles, et tout ce qui brûle s\'embrase.'] },
    vie:     { glyphe: 'floraison',  nom: 'Floraison',  de: 'de la vie',     paliers: ['L\'herbe et les plantes poussent deux fois plus, le soin est doublé.', 'Croissance : un arbre jaillit du sol.'] },
    lumiere: { glyphe: 'focale',     nom: 'Focale',     de: 'de la lumière', paliers: ['Loupe : la lumière concentrée enflamme le bois et l\'herbe, et éblouit plus longtemps.', 'Soleil : elle vitrifie le sable, fond la neige et aveugle longuement.'] },
    ombre:   { glyphe: 'tenebres',   nom: 'Ténèbres',   de: 'de l\'ombre',   paliers: ['Nuit noire : le sommeil dure le double.', 'Rêve : les créatures endormies se réveillent dociles.'] },
    acide:   { glyphe: 'mordant',    nom: 'Mordant',    de: 'de l\'acide',   paliers: ['L\'acide ronge trois fois plus vite et blesse le golem.', 'Dissolution : même le métal et l\'obsidienne cèdent.'] },
    gravite: { glyphe: 'masse',      nom: 'Masse',      de: 'de la gravité', paliers: ['Champ plus large et plus lourd.', 'Effondrement : le champ se creuse en un puits qui avale puis recrache ce qui l\'entoure.'] },
  };
  for (const el in LANGAGES) { const Lg = LANGAGES[el]; MODS[Lg.glyphe] = { id: Lg.glyphe, nom: Lg.nom, cout: 2, langue: el, desc: 'Langage ' + Lg.de + '. ×1 : ' + Lg.paliers[0] + ' ×2 (Adepte) : ' + Lg.paliers[1] + ' Muet sans le glyphe ' + CORES[el].nom + '.' }; }
  // Déclencheurs (pointes)
  const TRIGGERS = {
    immediat: { id: 'immediat', nom: 'Immédiat', cout: 0, desc: 'L\'effet agit tout de suite, en continu sur ce qu\'il touche.' },
    contact:  { id: 'contact',  nom: 'Au contact', cout: 1, desc: 'Éclate à la première chose touchée (ou quand on te touche).' },
    retarde:  { id: 'retarde',  nom: 'Retardé',  cout: 1, desc: 'Se fixe, puis éclate après un délai réglable (1, 2, 5 ou 10 s).' },
    commande: { id: 'commande', nom: 'Sur commande', cout: 1, desc: 'Le sort attend là où il arrive (collé à une créature s\'il la touche). La touche F fait éclater tous tes sorts en attente.' },
    repetition: { id: 'repetition', nom: 'Répétition', cout: 3, desc: 'Après avoir éclaté, l\'effet recommence à intervalle réglable (1, 2 ou 5 s), plusieurs fois.' },
    expiration: { id: 'expiration', nom: 'À l\'expiration', cout: 2, desc: 'Quand l\'effet s\'éteint, il éclate une dernière fois.' },
  };
  // Filtres de matière (pointe droite) : le sort au contact ne réagit qu'à cela et traverse le reste
  const FILTRES = {
    eau:      { id: 'eau',      nom: 'Eau',      glyphe: 'eau',     couleur: '#3b6fb6', cout: 1, mats: ['EAU', 'SAUMURE'] },
    feu:      { id: 'feu',      nom: 'Feu',      glyphe: 'feu',     couleur: '#d9622b', cout: 1, mats: ['FEU', 'LAVE'] },
    pierre:   { id: 'pierre',   nom: 'Pierre',   glyphe: 'terre',   couleur: '#a8977a', cout: 1, mats: ['PIERRE', 'OBSIDIENNE', 'CRISTAL'] },
    terre:    { id: 'terre',    nom: 'Terre',    glyphe: 'creuser', couleur: '#a3844f', cout: 1, mats: ['TERRE', 'SABLE', 'BOUE', 'SEL', 'CENDRE'] },
    bois:     { id: 'bois',     nom: 'Bois',     glyphe: 'vie',     couleur: '#8d6a3c', cout: 1, mats: ['BOIS', 'PLANTE', 'HERBE', 'MOUSSE'] },
    metal:    { id: 'metal',    nom: 'Métal',    glyphe: 'metal',   couleur: '#737e86', cout: 1, mats: ['METAL'] },
    glace:    { id: 'glace',    nom: 'Glace',    glyphe: 'froid',   couleur: '#7fb4d8', cout: 1, mats: ['GLACE', 'NEIGE'] },
    creature: { id: 'creature', nom: 'Créature', glyphe: 'esprit',  couleur: '#c45a8a', cout: 1, mats: [] },
  };
  // Cibles (pointe gauche)
  const CIBLES = {
    souris:   { id: 'souris',   nom: 'Souris',   cout: 0, desc: 'Le sort part vers la souris (par défaut).' },
    creature: { id: 'creature', nom: 'Créature proche', cout: 2, desc: 'Le sort part seul vers la créature hostile la plus proche, et la suit.' },
    marque:   { id: 'marque',   nom: 'Marque',   cout: 1, desc: 'Le sort part vers ta marque la plus récente, même hors de vue.' },
  };
  // Tailles de sceau
  const TAILLES = {
    petit: { id: 'petit', nom: 'Petit', slots: 1, coutMul: 0.5, coutAdd: 0, geste: 0.05, couches: false, desc: 'Centre, forme, un modificateur, un déclencheur. Moitié prix, presque instantané.' },
    moyen: { id: 'moyen', nom: 'Moyen', slots: 3, coutMul: 1, coutAdd: 0, geste: 0.2, couches: true, desc: 'Le sceau ordinaire : jusqu\'à 3 modificateurs, filtre et cible.' },
    grand: { id: 'grand', nom: 'Grand', slots: 5, coutMul: 1, coutAdd: 2, geste: 0.5, couches: true, desc: '5 modificateurs et 2 déclencheurs ; plus long à tracer.' },
  };
  // Enchaînements : second sort qui éclate moins d'une seconde après le premier, tout près
  const ENCHAINEMENTS = {
    'eau>froid':    { nom: 'Piège de glace', desc: 'Les créatures trempées sont prises dans la glace.' },
    'feu>vent':     { nom: 'Embrasement',    desc: 'Le vent porte les flammes sur tout ce qui brûle alentour.' },
    'terre>force':  { nom: 'Lancer de rocher', desc: 'La terre levée part comme un boulet vers la souris.' },
    'eau>foudre':   { nom: 'Électrocution',  desc: 'Tout ce qui est mouillé est foudroyé.' },
    'lumiere>ombre': { nom: 'Éclipse',       desc: 'Une nuit soudaine : tout s\'endort alentour.' },
    'froid>feu':    { nom: 'Choc thermique', desc: 'La pierre éclate en sable, les rochers se fendent.' },
    'vie>eau':      { nom: 'Floraison',      desc: 'Tout ce qui est vert pousse d\'un coup.' },
    'gravite>terre': { nom: 'Éboulement',    desc: 'La roche au-dessus se détache et dégringole.' },
    'vent>vent':    { nom: 'Rafale',         desc: 'Le second souffle est trois fois plus fort.' },
    'foudre>foudre': { nom: 'Arc électrique', desc: 'La foudre saute entre les deux points d\'impact.' },
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
    miel:       { id: 'miel',       nom: 'Fiole de miel',  couleur: '#d8a03a', liquide: 'MIEL', desc: 'Pris dans une ruche enfumée (E), ou puisé dans une coulée de miel.' },
    sel:        { id: 'sel',        nom: 'Sel',            couleur: '#f2efe6', liquide: 'SEL', desc: 'Gratté dans les salines du désert (X). Fond dans l\'eau, fait fondre la glace.' },
    mousse:     { id: 'mousse',     nom: 'Mousse',         couleur: '#7a9a4a', desc: 'Grattée sur la pierre humide (X).' },
    poudre:     { id: 'poudre',     nom: 'Sac de poudre',  couleur: '#3a3430', liquide: 'POUDRE', desc: 'Se jette en tas. Une étincelle, et boum.' },
    // rares : offerts par le maître
    larme_lune:   { id: 'larme_lune',   nom: 'Larme de lune',   couleur: '#cfd8e8', rare: true, desc: 'Offerte par le maître. Une goutte qui luit faiblement.' },
    coeur_chene:  { id: 'coeur_chene',  nom: 'Cœur de chêne',   couleur: '#7a5a2a', rare: true, desc: 'Offert par le maître. Un nœud de bois qui bat lentement.' },
    sable_temps:  { id: 'sable_temps',  nom: 'Sable du temps',  couleur: '#d8c08a', rare: true, desc: 'Offert par le maître. Il coule vers le haut.' },
    plume_phenix: { id: 'plume_phenix', nom: 'Plume de phénix', couleur: '#e8842a', rare: true, desc: 'Offerte par le maître. Tiède, même dans la neige.' },
  };

  // Familles sensorielles des ingrédients (pour les indices du chaudron)
  const FAMILLES = {
    eau_source: 'frais', eau: 'frais', rosee: 'frais', flocon: 'frais',
    cendre: 'chaud', braise: 'chaud', lave: 'chaud',
    plume: 'aérien', lueur: 'aérien', eclat: 'minéral', poussiere: 'minéral',
    racine: 'vivant', fil: 'vivant', champignon: 'sombre',
    huile: 'visqueux', seve: 'visqueux', acide: 'acide',
    miel: 'visqueux', sel: 'minéral', mousse: 'vivant', poudre: 'chaud',
    larme_lune: 'frais', coeur_chene: 'vivant', sable_temps: 'minéral', plume_phenix: 'chaud',
  };
  const ODEURS = { frais: 'ça sent la pluie', chaud: 'ça sent la fumée', 'aérien': 'ça sent l\'orage', 'minéral': 'ça sent la pierre mouillée', vivant: 'ça sent la forêt', sombre: 'ça sent la cave', visqueux: 'ça sent le vieux bois', acide: 'ça pique le nez' };
  const BRUITS = { chauffer: 'ça bouillonne', remuer: 'ça clapote', infuser: 'ça murmure', refroidir: 'ça craque' };
  // Potions bizarres : produites par les ratés, selon la famille dominante
  const BIZARRES = {
    hoquet:     { id: 'hoquet',     nom: 'Hoquet de fumée',      couleur: '#6e6660', usage: 'boire', bizarre: true, famille: 'chaud',    desc: 'Tu hoquettes de la fumée pendant 30 s. Pas très digne.' },
    grenouille: { id: 'grenouille', nom: 'Potion de grenouille', couleur: '#5c8f3e', usage: 'boire', bizarre: true, famille: 'vivant',   desc: 'Petit(e) et bondissant(e) pendant 25 s. Coa.' },
    glouglou:   { id: 'glouglou',   nom: 'Glouglou',             couleur: '#6aa0d8', usage: 'boire', bizarre: true, famille: 'frais',    desc: 'Tu fuis de partout : de l\'eau coule de toi pendant 20 s.' },
    ballon:     { id: 'ballon',     nom: 'Potion ballon',        couleur: '#d08ab0', usage: 'boire', bizarre: true, famille: 'aérien',   desc: 'Tu gonfles : énorme et léger(ère) pendant 20 s.' },
    boussole:   { id: 'boussole',   nom: 'Boussole folle',       couleur: '#8a8f9a', usage: 'boire', bizarre: true, famille: 'minéral',  desc: 'Gauche et droite s\'échangent pendant 15 s.' },
    luciole:    { id: 'luciole',    nom: 'Potion luciole',       couleur: '#e0c43a', usage: 'boire', bizarre: true, famille: 'sombre',   desc: 'Tu brilles comme une lanterne pendant 40 s. Utile, en fait.' },
    glu:        { id: 'glu',        nom: 'Glu de sorcier',       couleur: '#c9a63a', usage: 'lancer', bizarre: true, famille: 'visqueux', desc: 'Se jette : une flaque de sève collante.' },
    petard:     { id: 'petard',     nom: 'Pétard mouillé',       couleur: '#8fbf2a', usage: 'lancer', bizarre: true, famille: 'acide',    desc: 'Se jette : un grand nuage de fumée et un bruit ridicule.' },
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
    poudre:     { id: 'poudre',     nom: 'Poudre de sorcier',  couleur: '#3a3430', usage: 'lancer', ingr: ['sel', 'cendre', 'braise'], etapes: ['remuer', 'remuer'],
                  desc: 'Se jette : un tas de poudre. Allume-le de loin.', enigme: 'Du sel, de la cendre et une braise, remués deux fois, sans jamais chauffer. Surtout sans chauffer.' },
    baume_mousse: { id: 'baume_mousse', nom: 'Baume de mousse', couleur: '#7a9a4a', usage: 'boire', ingr: ['mousse', 'eau_source'], etapes: ['chauffer', 'infuser'],
                  desc: 'Tu te soignes lentement pendant 40 s.', enigme: 'De la mousse dans l\'eau, chauffée puis infusée : une tisane de grand-mère.' },
    hydromel:   { id: 'hydromel',   nom: 'Hydromel',           couleur: '#d8a03a', usage: 'boire', ingr: ['miel', 'eau_source'], etapes: ['infuser'],
                  desc: 'Soigne, puis te soigne encore pendant 40 s.', enigme: 'Du miel dans l\'eau, longuement infusé.' },
    sel_garde:  { id: 'sel_garde',  nom: 'Sel de garde',       couleur: '#f2efe6', usage: 'boire', ingr: ['sel', 'braise'], etapes: ['chauffer', 'remuer'],
                  desc: 'Pendant 45 s, le feu ne te brûle plus et la lave te mord à peine.', enigme: 'Du sel et une braise, chauffés puis remués.' },
    encre_eternelle: { id: 'encre_eternelle', nom: 'Encre éternelle', couleur: '#2f2a4a', usage: 'boire', ingr: ['larme_lune', 'cendre', 'eau_source'], etapes: ['chauffer', 'infuser', 'refroidir'],
                  desc: 'À boire : +6 points d\'encre maximum, pour toujours.', enigme: 'Une larme de lune, de la cendre et de l\'eau : chauffer, infuser, refroidir. L\'encre ne s\'épuise plus tout à fait.' },
    vitalite:   { id: 'vitalite',   nom: 'Sève de vigueur',    couleur: '#7a5a2a', usage: 'boire', ingr: ['coeur_chene', 'racine'], etapes: ['infuser', 'infuser'],
                  desc: 'À boire : +2 de vitalité maximum, pour toujours.', enigme: 'Un cœur de chêne et une racine, infusés longuement.' },
    sablier:    { id: 'sablier',    nom: 'Sablier liquide',    couleur: '#d8c08a', usage: 'boire', ingr: ['sable_temps', 'lueur'], etapes: ['refroidir'],
                  desc: 'Le monde ralentit autour de toi pendant 30 s.', enigme: 'Du sable du temps et une lueur, refroidis : les secondes s\'étirent.' },
    phenix:     { id: 'phenix',     nom: 'Souffle de phénix',  couleur: '#e8842a', usage: 'boire', ingr: ['plume_phenix', 'braise'], etapes: ['chauffer'],
                  desc: 'Pendant 5 minutes, ta prochaine défaillance te relève sur place, en pleine forme.', enigme: 'Une plume de phénix sur une braise. Rien d\'autre.' },
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
    magma:      { id: 'magma',      nom: 'La pierre fond',          glyphe: null,      desc: 'Une flamme bleue liquéfie la pierre ou le métal.' },
    vapeur:     { id: 'vapeur',     nom: 'L\'eau et le feu',        glyphe: null,      desc: 'Le feu rencontre l\'eau : vapeur.' },
    obsidienne: { id: 'obsidienne', nom: 'La lave et l\'eau',       glyphe: null,      desc: 'La lave touche l\'eau et se fige en pierre noire.' },
    verre:      { id: 'verre',      nom: 'Le sable et la lave',     glyphe: null,      desc: 'Le sable chauffé par la lave devient verre.' },
    incendie:   { id: 'incendie',   nom: 'Le feu se propage',       glyphe: null,      desc: 'Une flamme en allume une autre.' },
    pluie:      { id: 'pluie',      nom: 'La pluie tombe',          glyphe: null,      desc: 'Être dehors sous la pluie.' },
    verre_brise: { id: 'verre_brise', nom: 'Le verre se brise',      glyphe: 'son',     desc: 'Du verre vole en éclats.' },
    conduction: { id: 'conduction', nom: 'L\'eau et le métal conduisent', glyphe: null, desc: 'L\'électricité court dans l\'eau ou le métal.' },
    dilution:   { id: 'dilution',   nom: 'L\'eau dilue l\'acide',    glyphe: null,      desc: 'De l\'acide au contact de l\'eau redevient eau.' },
    condensation: { id: 'condensation', nom: 'La vapeur retombe',    glyphe: null,      desc: 'De la vapeur redevient goutte.' },
    cendre:     { id: 'cendre',     nom: 'Le bois devient cendre',    glyphe: null,      desc: 'Du bois finit de brûler.' },
    huile_feu:  { id: 'huile_feu',  nom: 'L\'huile s\'embrase',      glyphe: null,      desc: 'De l\'huile prend feu.' },
    flottaison: { id: 'flottaison', nom: 'L\'huile flotte',          glyphe: null,      desc: 'De l\'huile remonte au-dessus de l\'eau.' },
    explosion:  { id: 'explosion',  nom: 'La poudre explose',         glyphe: null,      desc: 'Une étincelle sur de la poudre.' },
    sel:        { id: 'sel',        nom: 'Le sel fond dans l\'eau',   glyphe: null,      desc: 'Le sel se dissout en saumure, qui ne gèle pas.' },
    mousse:     { id: 'mousse',     nom: 'La mousse pousse',          glyphe: null,      desc: 'La mousse gagne la pierre humide.' },
    boue:       { id: 'boue',       nom: 'La terre devient boue',     glyphe: null,      desc: 'L\'eau détrempe la terre, qui se met à couler.' },
    fulgurite:  { id: 'fulgurite',  nom: 'La foudre vitrifie',        glyphe: null,      desc: 'Un éclair change le sable en verre.' },
  };

  // Espèces : comportement, goûts et craintes (à découvrir), cadeau quand apprivoisée
  const ESPECES = {
    limace:   { id: 'limace',   nom: 'Limace d\'encre',     mode: 'hop',   w: 36, h: 24, hp: 3, dmg: 1, hostile: true,  aime: 'vie',     craint: 'lumiere', drop: 'fil',        desc: 'Bondit vers qui passe. Gonfle quand on l\'arrose.' },
    follet:   { id: 'follet',   nom: 'Feu follet',          mode: 'fly',   w: 24, h: 24, hp: 2, dmg: 1, hostile: true,  aime: 'feu',     craint: 'eau',     drop: 'plume',      desc: 'Une petite flamme curieuse. L\'eau la dissipe en plume.', nocturne: true },
    golem:    { id: 'golem',    nom: 'Golem',               mode: 'walk',  w: 50, h: 70, hp: 8, dmg: 2, hostile: true,  aime: 'terre',   craint: 'force',   drop: 'poussiere',  desc: 'Lourd, patient, insensible au feu. Le vent le fait reculer.', immune: ['feu'] },
    grenouille: { id: 'grenouille', nom: 'Grenouille',     mode: 'hop',   w: 26, h: 18, hp: 2, dmg: 0, hostile: false, aime: 'eau',     craint: 'froid',   drop: 'rosee',      desc: 'Saute haut, nage bien, chante le soir. Le froid la fige.', couleur: '#5c8f3e', peur: 90 },
    corbeau:  { id: 'corbeau',  nom: 'Corbeau',             mode: 'fly',   w: 26, h: 18, hp: 2, dmg: 0, hostile: false, aime: 'lumiere', craint: 'son',     drop: 'plume',      desc: 'Méfiant. S\'envole au moindre bruit, revient pour ce qui brille.', couleur: '#1f1a16', peur: 160, diurne: true },
    salamandre: { id: 'salamandre', nom: 'Salamandre',     mode: 'walk',  w: 34, h: 16, hp: 4, dmg: 1, hostile: true,  aime: 'feu',     craint: 'froid',   drop: 'braise',     desc: 'Vit dans la lave comme dans un bain. Déteste la neige.', couleur: '#d9622b', immune: ['feu', 'acide'], faible: ['froid', 'eau'], lave: true },
    poisson:  { id: 'poisson',  nom: 'Poisson d\'argent',  mode: 'swim',  w: 22, h: 12, hp: 2, dmg: 0, hostile: false, aime: 'eau',     craint: 'foudre',  drop: 'rosee',      desc: 'Ne vit que dans l\'eau. La foudre l\'étourdit. Hors de l\'eau, il se débat.', couleur: '#8fb8d8', peur: 70 },
    chauve:   { id: 'chauve',   nom: 'Chauve-souris',       mode: 'fly',   w: 24, h: 14, hp: 2, dmg: 1, hostile: true,  aime: 'ombre',   craint: 'lumiere', drop: 'champignon', desc: 'Dort le jour la tête en bas, fuit la lumière.', couleur: '#4a3a5a', nocturne: true, grotte: true },
    escargot: { id: 'escargot', nom: 'Escargot de cristal', mode: 'crawl', w: 22, h: 16, hp: 3, dmg: 0, hostile: false, aime: 'lumiere', craint: 'son',     drop: 'eclat',      desc: 'Lent, luisant, et immunisé à l\'acide. Sa coquille est un cristal.', couleur: '#b58fd8', immune: ['acide'], peur: 0, lumineux: true },
    tortue:   { id: 'tortue',   nom: 'Tortue des sables',   mode: 'walk',  w: 34, h: 18, hp: 6, dmg: 0, hostile: false, aime: 'eau',     craint: 'gravite', drop: 'poussiere',  desc: 'Une carapace à toute épreuve. Adore l\'eau, déteste flotter.', couleur: '#a3844f', immune: ['feu', 'foudre', 'acide', 'froid'], peur: 0 },
    lapin:    { id: 'lapin',    nom: 'Lapin de neige',      mode: 'hop',   w: 22, h: 20, hp: 2, dmg: 0, hostile: false, aime: 'froid',   craint: 'feu',     drop: 'flocon',     desc: 'Bondit dans la poudreuse, fuit la moindre flamme.', couleur: '#f6f8fa', peur: 110, diurne: true },
    familier: { id: 'familier', nom: 'Familier',            mode: 'fly',   w: 20, h: 20, hp: 4, dmg: 0, hostile: false, aime: null, craint: null, drop: null, desc: 'Un petit élémentaire invoqué.' },
  };

  // Trophées : souvenirs offerts par le maître, exposés au labo
  const TROPHEES = {
    seau:     { id: 'seau',     nom: 'Seau des pompiers', couleur: '#8d6a3c', desc: 'Les villageois te remercient pour la grange.' },
    banquise: { id: 'banquise', nom: 'Patin du marché d\'hiver', couleur: '#7fb4d8', desc: 'Le lac a tenu tout le marché.' },
    volcan:   { id: 'volcan',   nom: 'Pierre de volcan', couleur: '#2d2830', desc: 'Encore tiède.' },
    pont:     { id: 'pont',     nom: 'Clou du vieux moulin', couleur: '#737e86', desc: 'Le meunier traverse de nouveau.' },
    globe:    { id: 'globe',    nom: 'Globe des vents',  couleur: '#3f9c9b', desc: 'Il tourne seul quand il va pleuvoir.' },
    cristal:  { id: 'cristal',  nom: 'Cristal géant',    couleur: '#b58fd8', desc: 'Il chante quand on le frôle.' },
    medaille: { id: 'medaille', nom: 'Médaille de fusion', couleur: '#d8a63a', desc: 'Décernée par la guilde des sceaux.' },
    epouvantail: { id: 'epouvantail', nom: 'Chapeau d\'épouvantail', couleur: '#a3782e', desc: 'Les trois épouvantails te saluent.' },
    paix:     { id: 'paix',     nom: 'Collier de golem', couleur: '#8a6b2f', desc: 'Les bêtes du monde te connaissent.' },
    diplome:  { id: 'diplome',  nom: 'Diplôme de sorcier(e)', couleur: '#9a4a3a', desc: 'Signé de la main du maître.' },
  };
  // Épreuves de sceaux : « invente un sort qui... » ; spec = sceau évalué
  const EPREUVES = {
    eteindre_loin: { texte: 'un sort qui éteigne un feu de loin', test: (s) => !['soi', 'aura'].includes(s.shape) && s.cores.some((c) => ['eau', 'froid', 'vent', 'neutraliser', 'secheresse'].includes(c)), indice: 'Il faut un effet qui éteint (Eau, Froid, Vent...) et une forme qui porte loin.' },
    pont:          { texte: 'un sort qui fasse un pont au-dessus de l\'eau', test: (s) => !['soi', 'aura'].includes(s.shape) && (s.cores.includes('froid') || s.cores.includes('metal') || (s.cores.includes('terre') && s.persist > 0) || s.combo === 'eau|froid'), indice: 'Geler l\'eau, faire surgir du métal, ou de la terre qui dure (Persistance).' },
    trois_cibles:  { texte: 'un sort qui touche trois épouvantails d\'un coup', test: (s) => s.shape === 'chaine' || s.shape === 'pluie' || s.extra > 0 || s.echo > 0 || (s.shape === 'zone' && s.size >= 1.5), indice: 'Une Chaîne, une Pluie, un Double, un Écho, ou une très grande Zone.' },
    fusion:        { texte: 'un sort qui fusionne deux éléments', test: (s) => s.cores.length >= 2, indice: 'Un second glyphe d\'effet en bas du premier anneau.' },
    emboite:       { texte: 'un sort qui en lance un autre', test: (s) => s.subs > 0, indice: 'Un sous-sceau dans un emplacement de modificateur.' },
    endormir:      { texte: 'un sort qui endorme tout un troupeau', test: (s) => (s.cores.includes('ombre') || s.cores.includes('silence') || s.combo === 'acide|feu') && ['zone', 'pluie', 'aura', 'totem', 'mur'].includes(s.shape), indice: 'L\'Ombre, sur une forme qui couvre large.' },
  };
  // Lettres du maître, apportées par le corbeau, dans l'ordre
  const LETTRES = [
    { id: 'l1', titre: 'Première lettre', texte: 'Mon apprenti(e), j\'espère que l\'atelier ne brûle pas encore. Je suis au col des Brumes, et j\'ai oublié mes potions d\'encre sur l\'étagère. Renvoie-m\'en deux par le corbeau, il est plus fiable que moi.',
      cmd: { type: 'potion', id: 'encre', n: 2 }, don: [{ type: 'encre_max', n: 4 }], merci: 'Merci ! En échange, une encre de seiche de mon pays : ton encre s\'approfondit pour de bon.' },
    { id: 'l2', titre: 'Le col des Brumes', texte: 'Il fait un froid de loup ici. Les gens du col prétendent qu\'un flocon de notre montagne ne fond jamais. Prouve-le-leur : deux flocons éternels, grattés dans la neige.',
      cmd: { type: 'ingredient', id: 'flocon', n: 2 }, don: [{ type: 'ingredient', id: 'larme_lune', n: 2 }, { type: 'recette', id: 'encre_eternelle' }], merci: 'Ils n\'ont pas fondu ! Voici deux larmes de lune et ma recette d\'encre éternelle.' },
    { id: 'l3', titre: 'La grange', texte: 'Au village du bas, une grange prend feu chaque été, et les pompiers sont trop lents. Invente-leur un sceau qui éteigne un feu de loin, et envoie-m\'en le dessin. Je le recopierai.',
      cmd: { type: 'sceau', epreuve: 'eteindre_loin' }, don: [{ type: 'trophee', id: 'seau' }, { type: 'xp', n: 60 }], merci: 'Les pompiers l\'ont appris en une journée. Ils t\'envoient leur plus vieux seau, en souvenir.' },
    { id: 'l4', titre: 'Le marché d\'hiver', texte: 'Le marché d\'hiver se tient sur notre lac, d\'habitude. Cette année il ne gèle pas. Fais-moi ça : gèle une grande partie du lac. Ne te gèle pas avec.',
      cmd: { type: 'exploit', texte: 'Geler une grande partie du lac', cond: (p, w) => w.glaceLac >= 300 }, don: [{ type: 'ingredient', id: 'coeur_chene', n: 1 }, { type: 'recette', id: 'vitalite' }, { type: 'trophee', id: 'banquise' }], merci: 'On a patiné trois jours. Voici un cœur de chêne, et de quoi en faire une sève de vigueur.' },
    { id: 'l5', titre: 'Le forgeron', texte: 'Un forgeron de ma connaissance jure qu\'aucune flamme ne vaut la lave de notre volcan. Rapporte-m\'en une fiole. Avec des gants.',
      cmd: { type: 'ingredient', id: 'lave', n: 1 }, don: [{ type: 'encre_max', n: 4 }, { type: 'trophee', id: 'volcan' }], merci: 'Il en a fait une lame magnifique. Tiens, un éclat de la pierre du volcan, et encore un peu d\'encre.' },
    { id: 'l6', titre: 'Le moulin', texte: 'Le pont du vieux moulin s\'est effondré dans la rivière. Le meunier pleure. Trouve un sceau qui fasse un pont au-dessus de l\'eau.',
      cmd: { type: 'sceau', epreuve: 'pont' }, don: [{ type: 'ingredient', id: 'sable_temps', n: 2 }, { type: 'recette', id: 'sablier' }, { type: 'trophee', id: 'pont' }], merci: 'Le meunier traverse en chantant. Voici du sable du temps : il coule vers le haut, c\'est normal.' },
    { id: 'l7', titre: 'Les épouvantails', texte: 'Trois épouvantails gardent un champ à l\'est, et les corbeaux (pas le mien) se moquent d\'eux. Il faut un sort qui touche les trois d\'un coup. Ce sera leur porte-bonheur.',
      cmd: { type: 'sceau', epreuve: 'trois_cibles' }, don: [{ type: 'encre_max', n: 6 }, { type: 'trophee', id: 'epouvantail' }], merci: 'Plus un corbeau. Mon corbeau à moi est vexé, mais il s\'en remettra.' },
    { id: 'l8', titre: 'Le ciel', texte: 'Je veux voir le monde d\'en haut avant d\'être trop vieux. Envoie-moi un élixir de vol. La recette est dans une page que j\'ai perdue sur une île... désolé.',
      cmd: { type: 'potion', id: 'vol', n: 1 }, don: [{ type: 'trophee', id: 'globe' }, { type: 'xp', n: 80 }], merci: 'J\'ai survolé trois royaumes. Voici un globe des vents, il tourne quand il va pleuvoir.' },
    { id: 'l9', titre: 'La paix des bêtes', texte: 'Un golem de pierre garde un col, et personne ne passe. On dit qu\'un golem apprivoisé se laisse convaincre. Apprivoise-en un chez nous, pour t\'entraîner.',
      cmd: { type: 'exploit', texte: 'Apprivoiser un golem', cond: (p, w) => w.golemTame }, don: [{ type: 'ingredient', id: 'plume_phenix', n: 1 }, { type: 'recette', id: 'phenix' }, { type: 'trophee', id: 'paix' }], merci: 'Le golem du col m\'a laissé passer en souriant. Voici une plume de phénix : garde-la pour un mauvais jour.' },
    { id: 'l10', titre: 'Le chant des cristaux', texte: 'Les cristaux des grottes chantent, paraît-il. J\'en voudrais trois éclats pour un ami musicien.',
      cmd: { type: 'ingredient', id: 'eclat', n: 3 }, don: [{ type: 'trophee', id: 'cristal' }, { type: 'encre_max', n: 4 }], merci: 'Mon ami en a fait un carillon. Il t\'envoie le plus gros cristal, celui qui chante le mieux.' },
    { id: 'l11', titre: 'La guilde', texte: 'La guilde des sceaux me demande si mon élève sait fusionner deux éléments. Je leur ai dit oui. Ne me fais pas mentir.',
      cmd: { type: 'sceau', epreuve: 'fusion' }, don: [{ type: 'trophee', id: 'medaille' }, { type: 'xp', n: 100 }], merci: 'La guilde est impressionnée. Voici ta médaille. Tu la porteras le dimanche.' },
    { id: 'l12', titre: 'Le troupeau', texte: 'Un troupeau de moutons insomniaques empêche tout un village de dormir. Il faudrait un sort qui endorme tout le troupeau. Doucement.',
      cmd: { type: 'sceau', epreuve: 'endormir' }, don: [{ type: 'encre_max', n: 6 }, { type: 'xp', n: 80 }], merci: 'Tout le village a dormi douze heures. Les moutons aussi.' },
    { id: 'l13', titre: 'Le fond du monde', texte: 'Dernière épreuve, la plus vieille : descends tout en bas du monde, sous la dernière pierre, et reviens. Ensuite, nous parlerons de ton avenir.',
      cmd: { type: 'exploit', texte: 'Descendre tout en bas du monde (sous la cellule 240)', cond: (p, w) => w.profondeur >= 240 }, don: [{ type: 'trophee', id: 'diplome' }, { type: 'xp', n: 150 }],
      merci: 'Tu as vu le fond du monde, et tu es remonté(e). Je ne rentrerai pas tout de suite : l\'atelier est à toi, désormais. Voici ton diplôme. Continue d\'inventer. — Ton maître, fier.' },
  ];

  // Pages déchirées du grimoire du maître, cachées dans le monde
  const PAGES = [
    { id: 'p_puits', titre: 'Note sur les puits', texte: 'Les grottes gardent des champignons qui préfèrent l\'ombre. Les cueillir m\'a toujours donné des idées sombres... et un glyphe.', don: null },
    { id: 'p_lac', titre: 'Fond du lac', texte: 'J\'ai nagé jusqu\'ici avec des branchies. Recette : rosée, fil de vie, racine ; infuser puis refroidir.', don: { type: 'recette', id: 'respiration' } },
    { id: 'p_sommet', titre: 'Sommet enneigé', texte: 'Un flocon éternel dans la rosée, refroidi deux fois. L\'hiver tient dans une fiole.', don: { type: 'recette', id: 'gel' } },
    { id: 'p_volcan', titre: 'Cœur du volcan', texte: 'La lave et l\'eau font une pierre noire que rien ne ronge. Avec Feu et Terre fusionnés, on fait de la lave soi-même.', don: { type: 'fusion' } },
    { id: 'p_ile1', titre: 'Première île', texte: 'Plume, lueur, rosée : infuser, remuer. Le ciel s\'ouvre.', don: { type: 'recette', id: 'vol' } },
    { id: 'p_ile2', titre: 'Île du lac', texte: 'Le Temps est un glyphe comme un autre. Il vient avec l\'expérience, et il fait pousser les forêts en un clin d\'œil.', don: { type: 'core', id: 'temps' } },
    { id: 'p_ile3', titre: 'Île du volcan', texte: 'Une corde magique : le Lien. On la lance, on s\'y hisse. J\'ai perdu trois chapeaux comme ça.', don: { type: 'core', id: 'lien' } },
    { id: 'p_ile4', titre: 'Île des ruines', texte: 'Le Portail. Deux lancers, un passage. Attention : l\'eau aussi passe.', don: { type: 'core', id: 'portail' } },
    { id: 'p_acide', titre: 'Poche d\'acide', texte: 'Cendre, champignon, eau ; chauffer puis infuser : du vitriol qui creuse la pierre.', don: { type: 'recette', id: 'vitriol' } },
    { id: 'p_huile', titre: 'Nappe d\'huile', texte: 'Huile et braise, chauffées : un feu qui brûle même sur l\'eau. Cendre et huile, chauffées et remuées : du savon.', don: { type: 'recette', id: 'gregeois' } },
    { id: 'p_crepes', titre: 'Recette de crêpes', texte: 'Farine, lait, trois œufs, une pincée de sel. Laisser reposer. (Ce n\'est pas magique, mais c\'est important.)', don: { type: 'xp', n: 30 } },
    { id: 'p_desert', titre: 'Bout du désert', texte: 'Le Son brise le verre et réveille les dormeurs. Le Métal se forge d\'un éclat et d\'une poussière.', don: { type: 'core', id: 'son' } },
    { id: 'p_fond', titre: 'Fond du monde', texte: 'Tu as creusé jusqu\'ici ? Alors tu mérites l\'Esprit : prends la tête d\'une créature, et vois le monde par ses yeux.', don: { type: 'core', id: 'esprit' } },
  ];

  // Défis du maître : conditions sur la progression (p) et sur le monde (w)
  const DEFIS = [
    { id: 'd_torches', titre: 'Lanternes', texte: 'Allume 6 torches en même temps.', xp: 40, cond: (p, w) => w.torches >= 6 },
    { id: 'd_lac', titre: 'Pieds secs', texte: 'Traverse le lac d\'ouest en est sans te mouiller.', xp: 60, cond: (p, w) => w.lacSec },
    { id: 'd_banquise', titre: 'Banquise', texte: 'Gèle une grande partie du lac.', xp: 50, cond: (p, w) => w.glaceLac >= 400 },
    { id: 'd_sommet', titre: 'Dégel', texte: 'Fais fondre toute la glace du sommet.', xp: 40, cond: (p, w) => w.glaceSommet === 0 && w.vuSommet },
    { id: 'd_vigne', titre: 'Haricot magique', texte: 'Fais pousser une vigne de 40 cellules ou plus.', xp: 40, cond: (p, w) => w.vigneMax >= 40 },
    { id: 'd_golem', titre: 'Ami de pierre', texte: 'Apprivoise un golem.', xp: 50, cond: (p, w) => w.golemTame },
    { id: 'd_iles', titre: 'Les quatre îles', texte: 'Pose le pied sur les quatre îles volantes.', xp: 80, cond: (p, w) => (p.compteurs.iles || []).length >= 4 },
    { id: 'd_lave', titre: 'Fiole brûlante', texte: 'Rapporte une fiole de lave au labo.', xp: 40, cond: (p, w) => p.ingredientsVus.includes('lave') },
    { id: 'd_fond', titre: 'Spéléologie', texte: 'Descends sous la cellule 240 (tout en bas).', xp: 60, cond: (p, w) => w.profondeur >= 240 },
    { id: 'd_tornade', titre: 'Tornade', texte: 'Déclenche une tornade de feu (fusion Feu + Vent).', xp: 40, cond: (p, w) => (p.compteurs.combos || []).includes('feu|vent') },
    { id: 'd_recettes', titre: 'Alchimiste', texte: 'Brasse 10 recettes différentes.', xp: 80, cond: (p, w) => p.recettes.length >= 10 },
    { id: 'd_runes', titre: 'Lecteur de runes', texte: 'Lis les 5 runes du monde.', xp: 60, cond: (p, w) => p.compteurs.runes >= 5 },
    { id: 'd_pages', titre: 'Bibliothécaire', texte: 'Retrouve 8 pages déchirées.', xp: 80, cond: (p, w) => (p.pagesLues || []).length >= 8 },
    { id: 'd_foret', titre: 'Pyromane repenti', texte: 'Brûle 200 cellules de forêt... puis fais repousser 200 cellules de plantes avec Vie.', xp: 60, cond: (p, w) => (p.compteurs.brule || 0) >= 200 && (p.compteurs.pousse || 0) >= 200 },
    { id: 'd_portail', titre: 'Plombier', texte: 'Fais passer de l\'eau par un portail.', xp: 40, cond: (p, w) => (p.compteurs.portailEau || 0) >= 20 },
    { id: 'd_bestiaire', titre: 'Naturaliste', texte: 'Découvre ce qu\'aiment et craignent 6 espèces.', xp: 80, cond: (p, w) => Object.values(p.bestiaire || {}).filter((b) => b.aime && b.craint).length >= 6 },
    { id: 'd_cadeaux', titre: 'Bon maître', texte: 'Reçois 5 cadeaux de créatures apprivoisées.', xp: 50, cond: (p, w) => (p.compteurs.cadeaux || 0) >= 5 },
  ];

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
    // --- étape 2 : fusion, sous-sceaux, nouveaux glyphes, formes et modificateurs ---
    { id: 'fusion', type: 'fusion', item: true, titre: 'Fusion : deux glyphes d\'effet dans un sceau', indice: 'Lance 30 sceaux.', cond: (p) => p.compteurs.sorts >= 30 },
    { id: 'sous',   type: 'mods', item: ['sous'], titre: 'Sous-sceau : un sceau dans un sceau', indice: 'Consigne 6 sceaux différents.', cond: (p) => p.compteurs.sceaux >= 6 },
    { id: 'temps',  type: 'core', item: 'temps',  titre: 'Glyphe : Temps', indice: 'Atteins le niveau 3.', cond: (p) => p.compteurs.niveau >= 3 },
    { id: 'transmutation', type: 'core', item: 'transmutation', titre: 'Glyphe : Transmutation', indice: 'Observe le sable devenir verre et la lave devenir pierre.', cond: (p) => (p.obs.verre || 0) >= 1 && (p.obs.obsidienne || 0) >= 1 },
    { id: 'son',    type: 'core', item: 'son',    titre: 'Glyphe : Son', indice: 'Observe du verre se briser (le verre des ruines, ou le tien).', cond: (p) => (p.obs.verre_brise || 0) >= 1 },
    { id: 'esprit', type: 'core', item: 'esprit', titre: 'Glyphe : Esprit', indice: 'Apprivoise 3 créatures.', cond: (p) => p.compteurs.tames >= 3 },
    { id: 'lien',   type: 'core', item: 'lien',   titre: 'Glyphe : Lien', indice: 'Porte et lance 5 objets ou créatures.', cond: (p) => p.compteurs.lancers >= 5 },
    { id: 'portail', type: 'core', item: 'portail', titre: 'Glyphe : Portail', indice: 'Lis 3 runes cachées.', cond: (p) => p.compteurs.runes >= 3 },
    { id: 'metal',  type: 'core', item: 'metal',  titre: 'Glyphe : Métal', indice: 'Possède un éclat de cristal et une poussière de pierre.', cond: (p) => p.ingredientsVus.includes('eclat') && p.ingredientsVus.includes('poussiere') },
    { id: 'aura',   type: 'shape', item: 'aura',  titre: 'Forme : Aura', indice: 'Atteins le niveau 2.', cond: (p) => p.compteurs.niveau >= 2 },
    { id: 'mur',    type: 'shape', item: 'mur',   titre: 'Forme : Mur', indice: 'Lance 12 sceaux de Terre.', cond: (p) => p.compteurs.terre >= 12 },
    { id: 'totem',  type: 'shape', item: 'totem', titre: 'Forme : Totem', indice: 'Découvre 5 recettes.', cond: (p) => p.recettes.length >= 5 },
    { id: 'chaine', type: 'shape', item: 'chaine', titre: 'Forme : Chaîne', indice: 'Touche 10 créatures avec des projectiles.', cond: (p) => p.compteurs.creaturesTouchees >= 10 },
    { id: 'pluie',  type: 'shape', item: 'pluie', titre: 'Forme : Pluie', indice: 'Reste dehors sous la pluie.', cond: (p) => (p.obs.pluie || 0) >= 1 },
    { id: 'objet',  type: 'shape', item: 'objet', titre: 'Forme : Sur objet', indice: 'Porte 3 fois une caisse ou une créature.', cond: (p) => p.compteurs.portes >= 3 },
    { id: 'invocation', type: 'shape', item: 'invocation', titre: 'Forme : Invocation', indice: 'Apprivoise 5 créatures.', cond: (p) => p.compteurs.tames >= 5 },
    { id: 'inverser', type: 'mods', item: ['inverser'], titre: 'Modificateur : Inverser', indice: 'Possède le Feu et le Froid.', cond: (p) => p.cores.includes('froid') },
    { id: 'echo',   type: 'mods', item: ['echo'], titre: 'Modificateur : Écho', indice: 'Lance 60 sceaux.', cond: (p) => p.compteurs.sorts >= 60 },
    { id: 'teleguide', type: 'mods', item: ['teleguide'], titre: 'Modificateur : Téléguidé', indice: 'Possède la forme Trait.', cond: (p) => p.shapes.includes('trait') },
    { id: 'orbite', type: 'mods', item: ['orbite'], titre: 'Modificateur : Orbite', indice: 'Vole (Gravité sur soi ou élixir de vol).', cond: (p) => p.compteurs.vols >= 1 },
    { id: 'canalise', type: 'mods', item: ['canalise'], titre: 'Modificateur : Canalisé', indice: 'Atteins le niveau 4.', cond: (p) => p.compteurs.niveau >= 4 },
    // --- troisième vague : sorts ---
    { id: 'grand',      type: 'taille', item: 'grand', titre: 'Le grand sceau', indice: 'Atteins le niveau 5.', cond: (p) => p.compteurs.niveau >= 5 },
    { id: 'deuxmains',  type: 'flag', item: 'deuxMains', titre: 'Les deux mains (clic droit, Maj + 1-5)', indice: 'Lance 25 sceaux.', cond: (p) => p.compteurs.sorts >= 25 },
    { id: 'commande',   type: 'trigger', item: 'commande', titre: 'Déclencheur : Sur commande (touche F)', indice: 'Lance 8 sceaux avec le déclencheur Retardé.', cond: (p) => (p.compteurs.retardes || 0) >= 8 },
    { id: 'repetition', type: 'trigger', item: 'repetition', titre: 'Déclencheur : Répétition', indice: 'Lance 50 sceaux.', cond: (p) => p.compteurs.sorts >= 50 },
    { id: 'expiration', type: 'trigger', item: 'expiration', titre: 'Déclencheur : À l\'expiration', indice: 'Possède la forme Aura.', cond: (p) => p.shapes.includes('aura') },
    { id: 'filtres1',   type: 'filtres', item: ['eau', 'feu', 'creature'], titre: 'Filtres : Eau, Feu, Créature', indice: 'Observe 4 réactions différentes.', cond: (p) => Object.keys(p.obs || {}).length >= 4 },
    { id: 'filtres2',   type: 'filtres', item: ['pierre', 'terre', 'bois', 'metal', 'glace'], titre: 'Filtres : Pierre, Terre, Bois, Métal, Glace', indice: 'Observe 9 réactions différentes.', cond: (p) => Object.keys(p.obs || {}).length >= 9 },
    { id: 'cible_creature', type: 'cible', item: 'creature', titre: 'Cible : Créature proche', indice: 'Touche 15 créatures avec des projectiles.', cond: (p) => p.compteurs.creaturesTouchees >= 15 },
    { id: 'marque',     type: 'marque', item: 'marque', titre: 'Glyphe et cible : Marque', indice: 'Retrouve 2 pages déchirées.', cond: (p) => (p.pagesLues || []).length >= 2 },
    { id: 'prise',      type: 'shape', item: 'prise', titre: 'Forme : Prise', indice: 'Possède le glyphe Force ou Gravité.', cond: (p) => p.cores.includes('force') || p.cores.includes('gravite') },
    { id: 'bouclier',   type: 'shape', item: 'bouclier', titre: 'Forme : Bouclier', indice: 'Fais-toi bousculer 5 fois par des créatures.', cond: (p) => (p.compteurs.bouscule || 0) >= 5 },
    { id: 'contre',     type: 'core', item: 'contre', titre: 'Glyphe : Contre-sort', indice: 'Possède 12 glyphes d\'effet.', cond: (p) => p.cores.length >= 12 },
    // --- trajectoires, métamorphose, rembobinage ---
    { id: 'spirale',  type: 'mods', item: ['spirale'], titre: 'Trajectoire : Spirale', indice: 'Lance 35 sceaux.', cond: (p) => p.compteurs.sorts >= 35 },
    { id: 'boomerang', type: 'mods', item: ['boomerang'], titre: 'Trajectoire : Boomerang', indice: 'Touche 20 créatures avec des projectiles.', cond: (p) => p.compteurs.creaturesTouchees >= 20 },
    { id: 'rasesol',  type: 'mods', item: ['rasesol'], titre: 'Trajectoire : Rase-sol', indice: 'Lance 15 sceaux de Terre.', cond: (p) => p.compteurs.terre >= 15 },
    { id: 'metamorphose', type: 'core', item: 'metamorphose', titre: 'Glyphe : Métamorphose', indice: 'Rencontre 8 espèces et apprivoises-en 4.', cond: (p) => (p.especesVues || []).length >= 8 && p.compteurs.tames >= 4 },
    { id: 'rembobinage', type: 'core', item: 'rembobinage', titre: 'Glyphe : Rembobinage', indice: 'Possède le glyphe Temps et atteins le niveau 6.', cond: (p) => p.cores.includes('temps') && p.compteurs.niveau >= 6 },
    // --- langages des éléments ---
    ...Object.keys(LANGAGES).map((el) => ({ id: 'lg_' + el, type: 'mods', item: [LANGAGES[el].glyphe], titre: 'Tu commences à parler le langage ' + LANGAGES[el].de + ' : glyphe ' + LANGAGES[el].nom, indice: 'Emploie souvent le glyphe ' + CORES[el].nom + ' (maîtrise : Initié(e)).', cond: (p) => ((p.maitrise || {})[el] || 0) >= MAITRISE.seuils[0] })),
    // --- étape 6 : le labo grandit ---
    { id: 'bac',       type: 'labo', item: 'bac',       titre: 'Labo : le bac d\'essai', indice: 'Atteins le niveau 2.', cond: (p) => p.compteurs.niveau >= 2 },
    { id: 'alambic',   type: 'labo', item: 'alambic',   titre: 'Labo : l\'alambic', indice: 'Atteins le niveau 3.', cond: (p) => p.compteurs.niveau >= 3 },
    { id: 'terrarium', type: 'labo', item: 'terrarium', titre: 'Labo : le terrarium', indice: 'Apprivoise 3 créatures.', cond: (p) => p.compteurs.tames >= 3 },
    { id: 'presse',    type: 'labo', item: 'presse',    titre: 'Labo : la presse à glyphes', indice: 'Lance 40 sceaux.', cond: (p) => p.compteurs.sorts >= 40 },
  ];

  const DEBUT = {
    cores: ['feu', 'vent', 'eau', 'terre'],
    shapes: ['projectile', 'soi'],
    mods: ['puissance', 'portee'],
    triggers: ['immediat', 'contact'],
    slots: 1,
    tailles: ['petit', 'moyen'], filtres: [], cibles: ['souris'],
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

  Object.assign(POTIONS, BIZARRES);
  return { FILTRES, CIBLES, TAILLES, ENCHAINEMENTS, TROPHEES, EPREUVES, LETTRES, CORES, PSEUDO, INVERSE, COMBOS, SHAPES, MODS, TRIGGERS, INGREDIENTS, FAMILLES, ODEURS, BRUITS, BIZARRES, STEPS, POTIONS, OBSERVATIONS, ESPECES, PAGES, DEFIS, UNLOCKS, DEBUT, XP, CHAPEAUX, CAPES, ACCESSOIRES , LANGAGES, MAITRISE, niveauMaitrise };
})();
