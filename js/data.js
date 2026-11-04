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
    temps:   { id: 'temps',   nom: 'Temps',    couleur: '#8a8f9a', cout: 4, desc: 'Pose une bulle où le temps file : tout y vieillit à toute allure. Les plantes poussent en buissons, les graines grimpent, le feu s\'épuise, la glace fond, la lave refroidit, la cendre redevient terre, le métal rouille ; les petits grandissent, les effets en cours (brûlure, sommeil, métamorphose) s\'achèvent, les sorts posés s\'usent. Inverser : une bulle de temps lent où créatures et projectiles avancent au ralenti. Sur soi : tu vas plus vite que le monde (pas et encre).' },
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
  const INVERSE = { marque: 'marque', contre: 'contre', feu: 'froid', froid: 'feu', force: 'repulsion', vent: 'force', lumiere: 'ombre', ombre: 'lumiere', terre: 'creuser', vie: 'fanaison', acide: 'neutraliser', foudre: 'neutraliser', gravite: 'poids', eau: 'secheresse', temps: 'ralentir', son: 'silence', metal: 'rouille', transmutation: 'transmutation', esprit: 'esprit', lien: 'lien', portail: 'portail', metamorphose: 'metamorphose', rembobinage: 'temps' };
  // Fusions nommées (clé : deux effets triés). Chacune fait naître un phénomène qui dure et épouse la forme du sceau.
  const COMBOS = {
    // --- le Feu ---
    'eau|feu':            { nom: 'Geyser', desc: 'Une colonne de vapeur brûlante jaillit du sol : elle soulève tout et ébouillante.', indice: 'L\'eau bout quand le feu la presse.' },
    'feu|terre':          { nom: 'Magma', desc: 'Une fontaine de lave crache du sol, puis refroidit en roche.', indice: 'La terre fond quand le feu la travaille.' },
    'feu|vent':           { nom: 'Tornade de feu', desc: 'Un tourbillon de flammes qui avance, soulève les petites choses et allume tout.', indice: 'Le vent fait danser la flamme.' },
    'feu|vie':            { nom: 'Brûlis', desc: 'Le feu passe sur l\'herbe, puis tout repousse, plus vert qu\'avant.', indice: 'Après la flamme, la pousse.' },
    'feu|lumiere':        { nom: 'Rayon ardent', desc: 'Un rayon de soleil concentré : il vitrifie le sable, allume de loin, fait fondre la pierre.', indice: 'La loupe sous le soleil.' },
    'feu|foudre':         { nom: 'Foudre en boule', desc: 'Une boule de plasma qui erre, foudroie ce qui l\'approche et éclate dans l\'eau.', indice: 'La flamme électrique ne tient pas en place.' },
    'feu|gravite':        { nom: 'Petit soleil', desc: 'Une combustion tenue par la pesanteur : une étoile qui flotte, attire, chauffe tout autour, éclaire la nuit et se nourrit de ce qui brûle.', indice: 'Le feu qui ne peut plus s\'échapper.' },
    'feu|temps':          { nom: 'Feu éternel', desc: 'Une flamme hors du temps : elle ne s\'éteint pas, ne se propage pas, réchauffe et redonne de l\'encre à qui s\'assoit près d\'elle.', indice: 'Une flamme qui ne vieillit pas.' },
    'feu|transmutation':  { nom: 'Forge', desc: 'La chaleur change la matière : la pierre devient métal, le sable verre, la terre pierre.', indice: 'Le creuset de l\'alchimiste.' },
    // --- l'Eau ---
    'eau|terre':          { nom: 'Marécage', desc: 'Le sol devient boue : les lourds s\'enfoncent, tout s\'englue.', indice: 'La terre qui boit trop.' },
    'eau|vent':           { nom: 'Nuée', desc: 'Un nuage de pluie qui dérive : il éteint les feux, remplit les trous, fait pousser.', indice: 'L\'eau que le vent emporte.' },
    'eau|vie':            { nom: 'Source vive', desc: 'Une source qui soigne ceux qui s\'y tiennent et fait tout pousser alentour.', indice: 'L\'eau qui donne la vie.' },
    'eau|lumiere':        { nom: 'Arc-en-ciel', desc: 'Un arc de lumière solide, de toi jusqu\'au point visé : on peut marcher dessus.', indice: 'La lumière dans la pluie.' },
    'eau|foudre':         { nom: 'Orage', desc: 'Un nuage noir qui foudroie le sol au-dessous, de préférence les créatures et l\'eau.', indice: 'Le ciel qui gronde.' },
    'eau|gravite':        { nom: 'Sphère d\'eau', desc: 'Une bulle d\'eau en apesanteur : elle aspire les liquides, emprisonne les créatures et lâche tout à la fin.', indice: 'L\'eau qui ne tombe plus.' },
    'eau|temps':          { nom: 'Érosion', desc: 'Mille ans d\'eau en quelques secondes : elle creuse la terre et use la pierre.', indice: 'La goutte qui creuse la pierre.' },
    'eau|transmutation':  { nom: 'Liquéfaction', desc: 'Le sol, même la pierre, devient boue... puis se fige en pierre et retient ce qui s\'y est enfoncé.', indice: 'La pierre qui coule.' },
    // --- la Terre ---
    'terre|vent':         { nom: 'Tempête de sable', desc: 'Un mur de sable qui avance : il pousse, aveugle, use et laisse des dunes.', indice: 'La poussière que le vent soulève.' },
    'terre|vie':          { nom: 'Racines', desc: 'Des racines jaillissent et ligotent les créatures ; en trait, elles poussent en pont de bois.', indice: 'Ce qui pousse sous la terre.' },
    'lumiere|terre':      { nom: 'Géode', desc: 'Des pics de cristal jaillissent du sol, projettent les créatures et luisent ensuite.', indice: 'La lumière prisonnière de la roche.' },
    'foudre|terre':       { nom: 'Fulgurite', desc: 'Un éclair qui fore le sol et laisse un tunnel aux parois de verre.', indice: 'La foudre qui entre dans la terre.' },
    'gravite|terre':      { nom: 'Météore', desc: 'Un rocher tombe du ciel sur le point visé : cratère, onde de choc, éboulements.', indice: 'La pierre qui tombe d\'en haut.' },
    'temps|terre':        { nom: 'Pétrification', desc: 'Les créatures deviennent statues un moment ; le bois devient pierre, le miel ambre.', indice: 'Ce que les siècles font de la terre.' },
    'terre|transmutation':{ nom: 'Golem de glaise', desc: 'La terre du lieu se lève en golem allié, qui frappe tes ennemis puis retourne au sol.', indice: 'La glaise qu\'on anime.' },
    // --- le Vent ---
    'vent|vie':           { nom: 'Pollen', desc: 'Un nuage de pollen : l\'herbe pousse sur son passage, les créatures s\'endorment.', indice: 'Le vent qui sème.' },
    'lumiere|vent':       { nom: 'Lucioles', desc: 'Un essaim de lumières qui dansent longtemps : elles éclairent et attirent les curieux.', indice: 'La lumière portée par la brise.' },
    'foudre|vent':        { nom: 'Front d\'orage', desc: 'Une rafale chargée qui balaie tout devant elle et foudroie ce qu\'elle pousse.', indice: 'La bourrasque avant l\'orage.' },
    'gravite|vent':       { nom: 'Cyclone', desc: 'Une colonne qui aspire et soulève tout, sable, eau et créatures, puis les recrache.', indice: 'Le vent qui tombe vers le haut.' },
    'temps|vent':         { nom: 'Souffle des âges', desc: 'Une bourrasque qui fait vieillir tout ce qu\'elle traverse : les plantes poussent et fanent, le métal rouille.', indice: 'Le vent des années.' },
    'transmutation|vent': { nom: 'Air solide', desc: 'L\'air se fige en verre invisible : une plateforme, un mur, un pont, qui arrête aussi les sorts.', indice: 'Le vent changé en pierre.' },
    // --- la Vie ---
    'lumiere|vie':        { nom: 'Arbre de lumière', desc: 'Un arbre pousse d\'un coup ; son feuillage luit et soigne ceux qui s\'abritent dessous.', indice: 'Ce que la lumière fait pousser.' },
    'foudre|vie':         { nom: 'Ronces électriques', desc: 'Un roncier épais et chargé : qui le touche est piqué et foudroyé.', indice: 'Les épines qui crépitent.' },
    'gravite|vie':        { nom: 'Îlot flottant', desc: 'Une motte de terre herbue flotte dans le ciel... puis retombe, sur qui se trouve dessous.', indice: 'Le jardin qui ne pèse plus.' },
    'temps|vie':          { nom: 'Forêt instantanée', desc: 'Des arbres entiers poussent en un instant.', indice: 'Cent printemps d\'un coup.' },
    'transmutation|vie':  { nom: 'Bois vivant', desc: 'La pierre et la terre deviennent bois et mousse... et le bois, ça brûle.', indice: 'La roche qui se met à vivre.' },
    // --- la Lumière ---
    'foudre|lumiere':     { nom: 'Prisme', desc: 'Un prisme flottant qui tire des rayons sur les créatures hostiles proches.', indice: 'La lumière qui se brise en éclairs.' },
    'gravite|lumiere':    { nom: 'Trou noir', desc: 'Une pesanteur si forte que la lumière n\'en sort plus : elle avale la matière, les sorts et tire tout à elle.', indice: 'La lumière qui tombe.' },
    'lumiere|temps':      { nom: 'Aube', desc: 'Le temps du ciel avance : la nuit se lève en aube, le jour tombe en crépuscule.', indice: 'Le soleil qui se presse.' },
    'lumiere|transmutation': { nom: 'Miroir', desc: 'Un miroir qui renvoie les projectiles et barre le passage.', indice: 'La lumière qu\'on fige en surface.' },
    // --- la Foudre ---
    'foudre|gravite':     { nom: 'Aimant', desc: 'Un champ magnétique : il capture les projectiles, attire golems, rochers et caisses, charge le métal.', indice: 'La foudre qui attire.' },
    'foudre|temps':       { nom: 'Foudre suspendue', desc: 'Un éclair figé dans le temps : il reste là et foudroie qui le touche.', indice: 'L\'éclair qui ne finit pas.' },
    'foudre|transmutation': { nom: 'Électrolyse', desc: 'La foudre défait l\'eau en un gaz léger, qui explose à la moindre flamme.', indice: 'L\'eau qui se défait sous la foudre.' },
    // --- Gravité et Temps ---
    'gravite|temps':      { nom: 'Horizon', desc: 'Près du centre, le temps ralentit jusqu\'à presque s\'arrêter ; tout y est attiré, doucement.', indice: 'Le temps qui pèse.' },
    'gravite|transmutation': { nom: 'Presse', desc: 'La pesanteur écrase la matière : le sable devient pierre, la pierre cristal.', indice: 'La pression qui change tout.' },
    'temps|transmutation':{ nom: 'Origine', desc: 'Chaque chose redevient ce qu\'elle était : le verre sable, l\'obsidienne lave, la cendre bois, le métal pierre.', indice: 'Revenir à ce qu\'on était.' },
    // --- avec les aspects ---
    'froid|vent':         { nom: 'Blizzard', desc: 'Une tempête de neige qui dérive, gèle l\'eau et engourdit.', indice: 'Le vent glacé.' },
    'froid|gravite':      { nom: 'Comète de glace', desc: 'Un bloc de glace tombe du ciel et gèle tout à l\'impact.', indice: 'La glace qui tombe d\'en haut.' },
    'feu|froid':          { nom: 'Choc thermique', desc: 'Chaud puis froid d\'un coup : la pierre, le verre et la glace éclatent.', indice: 'Ce qui casse quand on le trempe.' },
    'froid|temps':        { nom: 'Cryostase', desc: 'Les créatures sont prises dans des blocs de glace qui ne fondent pas de sitôt.', indice: 'Le froid qui arrête le temps.' },
    'foudre|metal':       { nom: 'Bobine', desc: 'Le métal garde la charge et lance des arcs sur les créatures proches.', indice: 'Le métal qui chante sous la foudre.' },
    'feu|metal':          { nom: 'Métal rougi', desc: 'Le métal chauffe au rouge : il brûle ce qui le touche et allume ce qui l\'approche.', indice: 'Le fer dans la forge.' },
    'acide|feu':          { nom: 'Fumée toxique', desc: 'Un nuage âcre qui empoisonne et assoupit.', indice: 'Ce qui fume quand l\'acide brûle.' },
    'acide|eau':          { nom: 'Pluie acide', desc: 'Un nuage qui pleut de l\'acide et ronge ce qui est dessous.', indice: 'La pluie qui ronge.' },
    'foudre|son':         { nom: 'Tonnerre', desc: 'Un fracas qui brise le verre, la glace et le cristal, renverse et réveille tout.', indice: 'Le bruit de l\'éclair.' },
    'explosion|gravite':  { nom: 'Implosion', desc: 'Tout est aspiré vers un point... puis tout explose.', indice: 'L\'explosion qui commence à l\'envers.' },
    'fumee|vent':         { nom: 'Écran de fumée', desc: 'Un mur de fumée : les créatures y perdent ta trace.', indice: 'La fumée qu\'on pousse.' },
    'force|terre':        { nom: 'Éboulement', desc: 'La roche se défait en éboulis qui glissent, et ce qui tenait dessus s\'écroule.', indice: 'La pente qui cède.' },
    'foudre|lien':        { nom: 'Fil électrique', desc: 'Un fil tendu jusqu\'au point visé, qui foudroie ce qui le franchit.', indice: 'Le fil qui conduit.' },
    'eau|froid':          { nom: 'Banquise', desc: 'La surface de l\'eau gèle en un grand radeau de glace qui flotte.', indice: 'L\'eau qui durcit.' },
    'eau|seisme':         { nom: 'Raz-de-marée', desc: 'Une vague immense déferle dans le sens du lancer et emporte tout.', indice: 'La terre qui secoue la mer.' },
    'force|gravite':      { nom: 'Singularité', desc: 'Tout est aspiré vers un point, puis recraché.', indice: 'La pesanteur qui se replie.' },
  };
  // Fusions à trois : le grand sceau a un troisième emplacement d'effet (à gauche de l'anneau intérieur)
  const TRIOS = {
    'feu|gravite|temps':     { nom: 'Étoile', desc: 'Un soleil que le temps ne consume plus : plus grand, plus lourd, il brûle longtemps et finit en nova.', indice: 'Le petit soleil qui ne vieillit pas.' },
    'eau|foudre|vent':       { nom: 'Ouragan', desc: 'Un orage géant qui marche sur le pays : il foudroie, aspire et soulève tout sous lui.', indice: 'Quand l\'orage apprend à marcher.' },
    'feu|gravite|terre':     { nom: 'Volcan', desc: 'Un cône de pierre jaillit du sol et crache la lave par son cratère, en bombes brûlantes.', indice: 'La montagne qui s\'ouvre.' },
    'eau|gravite|vie':       { nom: 'Jardin suspendu', desc: 'Une île flotte, avec son arbre et sa source, puis finit par retomber.', indice: 'Le jardin qui ne pèse plus, et qui boit.' },
    'foudre|gravite|lumiere':{ nom: 'Pulsar', desc: 'Une étoile qui tourne sur elle-même et balaie le monde de deux rayons foudroyants.', indice: 'La lumière qui tourne et qui frappe.' },
    'eau|temps|terre':       { nom: 'Canyon', desc: 'Des siècles d\'érosion d\'un coup : un ravin s\'ouvre sous le point visé et une rivière y coule.', indice: 'La goutte, la pierre, et beaucoup de temps.' },
    'gravite|lumiere|temps': { nom: 'Trou blanc', desc: 'L\'inverse du trou noir : il recrache la matière et la lumière, et repousse tout.', indice: 'Ce que le trou noir finit par rendre.' },
    'lumiere|temps|vie':     { nom: 'Printemps éternel', desc: 'Pendant longtemps, tout pousse alentour : herbe, fleurs qui luisent, arbres, et les blessures guérissent.', indice: 'La saison qui ne finit pas.' },
  };
  // Familles : l'Espace, l'Esprit, le Contre-sort et la Métamorphose s'allient à n'importe quel effet
  const GENRES = {
    portail:      { nom: 'Faille', desc: 'Une faille dans l\'espace qui crache l\'autre effet pendant un moment.', indice: 'L\'Espace qui s\'ouvre sur un élément.' },
    esprit:       { nom: 'Élémentaire', desc: 'Un esprit fait de l\'autre effet, qui chasse tes ennemis.', indice: 'L\'Esprit qui habite un élément.' },
    contre:       { nom: 'Absorption', desc: 'Le Contre-sort avale la matière de l\'autre effet autour du point visé et te rend un peu d\'encre.', indice: 'Défaire un seul élément.' },
    metamorphose: { nom: 'Chimère', desc: 'La créature touchée devient une créature de l\'autre effet et le porte partout où elle va. Sur soi : tu prends cette nature.', indice: 'Changer une bête en élément.' },
  };
  const deEffet = (e) => { const n = ((CORES[e] || PSEUDO[e] || {}).nom || e).toLowerCase(); return (/^[aeiouéèêh]/.test(n) ? 'd\'' : 'de ') + n; };
  function comboInfo(k) {
    if (COMBOS[k]) return COMBOS[k];
    if (TRIOS[k]) return Object.assign({ trio: true }, TRIOS[k]);
    const [a, b] = k.split('|'); const g = GENRES[a] && !GENRES[b] ? a : GENRES[b] && !GENRES[a] ? b : null; if (!g) return null;
    const x = g === a ? b : a; const G = GENRES[g]; return { nom: G.nom + ' ' + deEffet(x), desc: G.desc, indice: G.indice, genre: g, effet: x };
  }
  function comboCle(effets) {
    const u = effets.filter((e, i) => effets.indexOf(e) === i); if (u.length < 2) return null; let fam = null;
    if (u.length >= 3) for (let i = 0; i < u.length; i++) for (let j = i + 1; j < u.length; j++) for (let k = j + 1; k < u.length; k++) { const t = [u[i], u[j], u[k]].sort().join('|'); if (TRIOS[t]) return t; }
    for (let i = 0; i < u.length; i++) for (let j = i + 1; j < u.length; j++) { const k = [u[i], u[j]].sort().join('|'); if (COMBOS[k]) return k; if (!fam && comboInfo(k)) fam = k; }
    return fam;
  }
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
    vague:      { id: 'vague',      nom: 'Vague',      cout: 3, desc: 'Une vague roule au ras du sol dans le sens du lancer : elle porte l\'effet tout le long et emporte les créatures.' },
    colonne:    { id: 'colonne',    nom: 'Colonne',    cout: 3, desc: 'Un jet vertical jaillit du sol là où tu vises : il porte l\'effet et soulève tout ce qui s\'y trouve (geyser d\'eau, pilier de feu, courant d\'air...).' },
    bouclier:   { id: 'bouclier',   nom: 'Bouclier',   cout: 3, desc: 'Un arc devant toi, tourné vers la souris, qui porte l\'élément : le feu brûle ce qui le touche, le froid gèle l\'eau, le vent renvoie, la terre bloque. Il repousse aussi l\'eau et le sable : marche au fond du lac.' },
    invocation: { id: 'invocation', nom: 'Invocation', cout: 6, desc: 'Fait naître le familier de l\'essence du centre : salamandre de braise, ondine, petit golem, sylphe, pousse, luciole, oiseau-tonnerre, petite lune, chouette du temps, renard des failles, chat d\'ombre, ouroboros, pie grise ou chenille. Il te suit et défend. Double : deux familiers.' },
  };
  // Modificateurs (anneau extérieur)
  const MODS = {
    puissance:   { id: 'puissance',   nom: 'Puissance',   cout: 2, desc: 'Effet plus fort. Brise les rochers fissurés.' },
    portee:      { id: 'portee',      nom: 'Portée',      cout: 1, desc: 'Va plus loin.' },
    duree:       { id: 'duree',       nom: 'Durée',       cout: 2, desc: 'L\'effet dure plus longtemps.' },
    taille:      { id: 'taille',      nom: 'Taille',      cout: 2, desc: 'Zone d\'effet plus grande.' },
    reduire:     { id: 'reduire',     nom: 'Réduction',   cout: 0, desc: 'Effet plus petit et plus précis : à peu près moitié moins grand. Se cumule (un tout petit tas de terre, une flammèche, une goutte).' },
    rebond:      { id: 'rebond',      nom: 'Rebond',      cout: 1, desc: 'Le projectile rebondit sur les murs.' },
    persistance: { id: 'persistance', nom: 'Persistance', cout: 3, desc: 'Laisse une trace durable (flammes, pierre au lieu de terre, lueur...).' },
    vitesse:     { id: 'vitesse',     nom: 'Vitesse',     cout: 1, desc: 'Projectile plus rapide et plus droit.' },
    double:      { id: 'double',      nom: 'Double',      cout: 3, desc: 'Deux fois l\'effet, en éventail.' },
    inverser:    { id: 'inverser',    nom: 'Inverser',    cout: 2, desc: 'Retourne l\'effet : le feu refroidit, la terre creuse, la vie fane, l\'eau assèche, la force repousse...' },
    echo:        { id: 'echo',        nom: 'Écho',        cout: 3, desc: 'L\'effet se répète deux fois de plus, au même endroit.' },
    teleguide:   { id: 'teleguide',   nom: 'Téléguidé',   cout: 2, desc: 'Le projectile suit la souris.' },
    orbite:      { id: 'orbite',      nom: 'Orbite',      cout: 3, desc: 'Trois billes tournent autour de toi un moment.' },
    canalise:    { id: 'canalise',    nom: 'Canalisé',    cout: 2, desc: 'Tant que tu maintiens le clic, l\'effet suit la souris et consomme de l\'encre.' },
    matiere:     { id: 'matiere',     nom: 'Matière',     cout: 2, desc: 'L\'effet devient matière solide. Un projectile devient une lame (glace, pierre, métal, cristal, bois...) qui frappe et transperce, puis laisse sa matière. Un mur, une zone, une colonne ou un trait se remplissent de cette matière : mur de glace, pont, pilier de cristal, bloc de pierre. Une pluie devient grêle.' },
    rafale:      { id: 'rafale',      nom: 'Rafale',      cout: 3, desc: 'Le sort part plusieurs fois de suite, vers la souris : trois tirs (cinq avec deux Rafales).' },
    zigzag:      { id: 'zigzag',      nom: 'Zigzag',      cout: 1, desc: 'Le projectile file en zigzag, en angles vifs.' },
    cloche:      { id: 'cloche',      nom: 'Cloche',      cout: 1, desc: 'Le projectile est lancé en cloche et retombe juste là où tu vises, même derrière un mur.' },
    percant:     { id: 'percant',     nom: 'Perçant',     cout: 2, desc: 'Le projectile traverse les créatures et éclate sur chacune, sans s\'arrêter.' },
    gerbe:       { id: 'gerbe',       nom: 'Gerbe',       cout: 3, desc: 'À l\'éclat, le sort se brise en cinq éclats qui partent en gerbe.' },
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
  delete LANGAGES.froid; delete LANGAGES.acide; delete LANGAGES.ombre;
  for (const el in LANGAGES) { const Lg = LANGAGES[el]; MODS[Lg.glyphe] = { id: Lg.glyphe, nom: Lg.nom, cout: 2, langue: el, desc: 'Langage ' + Lg.de + '. ×1 : ' + Lg.paliers[0] + ' ×2 (Adepte) : ' + Lg.paliers[1] + ' Muet sans le glyphe ' + CORES[el].nom + '.' }; }
  // Déclencheurs (pointes)
  const TRIGGERS = {
    immediat: { id: 'immediat', nom: 'Immédiat', cout: 0, desc: 'L\'effet agit tout de suite, en continu sur ce qu\'il touche.' },
    contact:  { id: 'contact',  nom: 'Au contact', cout: 1, desc: 'Éclate à la première chose touchée (ou quand on te touche).' },
    retarde:  { id: 'retarde',  nom: 'Retardé',  cout: 1, desc: 'Se fixe, puis éclate après un délai réglable (1, 2, 5 ou 10 s).' },
    commande: { id: 'commande', nom: 'Sur commande', cout: 1, desc: 'Le sort attend là où il arrive (collé à une créature s\'il la touche). La touche F fait éclater tous tes sorts en attente.' },
    repetition: { id: 'repetition', nom: 'Répétition', cout: 3, desc: 'Après avoir éclaté, l\'effet recommence à intervalle réglable (1, 2 ou 5 s), plusieurs fois.' },
    proximite:  { id: 'proximite',  nom: 'Proximité', cout: 1, desc: 'Éclate dès qu\'une créature approche, sans avoir à la toucher. Posé (zone), c\'est une mine.' },
    tenu:       { id: 'tenu',       nom: 'Maintenu', cout: 1, desc: 'Le sort ne vit que tant que tu gardes le clic enfoncé : il naît dès que tu appuies, se dirige à la souris et disparaît dès que tu lâches. Il boit de l\'encre tant qu\'il dure. Un petit soleil, une tornade, un rayon, un nuage d\'orage... se promènent au bout de ta main. Une Singularité ou une Implosion qu\'on tient éclate quand on lâche.' },
    expiration: { id: 'expiration', nom: 'À l\'expiration', cout: 2, desc: 'Quand l\'effet s\'éteint, il éclate une dernière fois.' },
  };
  // Filtres de matière (pointe droite) : le sort au contact ne réagit qu'à cela et traverse le reste
  const FILTRES = {
    eau:      { id: 'eau',      nom: 'Eau',      glyphe: 'eau',     couleur: '#3b6fb6', cout: 1, mats: ['EAU', 'SAUMURE'] },
    feu:      { id: 'feu',      nom: 'Feu',      glyphe: 'feu',     couleur: '#d9622b', cout: 1, mats: ['FEU', 'LAVE'] },
    pierre:   { id: 'pierre',   nom: 'Pierre',   glyphe: 'terre',   couleur: '#a8977a', cout: 1, mats: ['PIERRE', 'OBSIDIENNE', 'CRISTAL'] },
    terre:    { id: 'terre',    nom: 'Terre',    glyphe: 'creuser', couleur: '#a3844f', cout: 1, mats: ['TERRE', 'MEUBLE', 'SABLE', 'BOUE', 'SEL', 'CENDRE'] },
    bois:     { id: 'bois',     nom: 'Bois',     glyphe: 'vie',     couleur: '#8d6a3c', cout: 1, mats: ['BOIS', 'PLANTE', 'HERBE', 'MOUSSE'] },
    metal:    { id: 'metal',    nom: 'Métal',    glyphe: 'metal',   couleur: '#737e86', cout: 1, mats: ['METAL'] },
    glace:    { id: 'glace',    nom: 'Glace',    glyphe: 'froid',   couleur: '#7fb4d8', cout: 1, mats: ['GLACE', 'NEIGE'] },
    creature: { id: 'creature', nom: 'Créature', glyphe: 'esprit',  couleur: '#c45a8a', cout: 1, mats: [] },
    liquide:  { id: 'liquide',  nom: 'Liquide',  glyphe: 'eau',     couleur: '#5f8fb8', cout: 1, mats: ['EAU', 'SAUMURE', 'HUILE', 'ACIDE', 'MIEL', 'SEVE', 'BOUE', 'LAVE'] },
    objet:    { id: 'objet',    nom: 'Objet',    glyphe: 'objet',   couleur: '#9a6a34', cout: 1, mats: [] },
  };
  // Cibles (pointe gauche)
  const CIBLES = {
    souris:   { id: 'souris',   nom: 'Souris',   cout: 0, desc: 'Le sort part vers la souris (par défaut).' },
    creature: { id: 'creature', nom: 'Créature proche', cout: 2, desc: 'Le sort part seul vers la créature hostile la plus proche, et la suit.' },
    marque:   { id: 'marque',   nom: 'Marque',   cout: 1, desc: 'Le sort part vers ta marque la plus récente, même hors de vue.' },
    objet:    { id: 'objet',    nom: 'Objet proche', cout: 1, desc: 'Le sort part seul vers l\'objet le plus proche de la souris (brasier, lampe, levier, moulin, roue, caisse, rocher, torche) et le suit.' },
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
    // ingrédients d'encre : chacun ne se trouve que dans sa région, en creusant (X)
    coeur_braise:   { id: 'coeur_braise',   nom: 'Cœur de braise',   couleur: '#e0622b', zone: 'Le Volcan',    desc: 'Une braise qui ne s\'éteint jamais. Se trouve en creusant (X) les cendres et la terre du Volcan.' },
    nacre:          { id: 'nacre',          nom: 'Éclat de nacre',   couleur: '#e6eef2', zone: 'Le Lac',       desc: 'Irisé comme une bulle. Se trouve en creusant (X) le fond du Lac, sous l\'eau.' },
    ambre:          { id: 'ambre',          nom: 'Larme d\'ambre',   couleur: '#d89a3a', zone: 'La Forêt',     desc: 'De la résine très ancienne. Se trouve en creusant (X) l\'humus de la Forêt.' },
    givre_bleu:     { id: 'givre_bleu',     nom: 'Givre bleu',       couleur: '#8ab8f0', zone: 'La Montagne',  desc: 'Une glace qui ne fond pas. Se trouve en creusant (X) la neige et la terre de la Montagne.' },
    poudre_or:      { id: 'poudre_or',      nom: 'Poudre d\'or',     couleur: '#e0b050', zone: 'Les Ruines',   desc: 'Ce qui reste des anciens sceaux dorés. Se trouve en creusant (X) le sol des Ruines.' },
    sable_chantant: { id: 'sable_chantant', nom: 'Sable chantant',   couleur: '#e8cf8a', zone: 'Le Désert',    desc: 'Il fredonne quand on le verse. Se trouve en creusant (X) les dunes du Désert.' },
    pollen:         { id: 'pollen',         nom: 'Pollen lumineux',  couleur: '#e8e070', zone: 'La Clairière', desc: 'Une poussière qui luit doucement. Se trouve en arrachant (X) l\'herbe de la Clairière.' },
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
    coeur_braise: 'chaud', nacre: 'frais', ambre: 'visqueux', givre_bleu: 'frais', poudre_or: 'minéral', sable_chantant: 'aérien', pollen: 'vivant',
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
  // Encres spéciales : brassées au chaudron, elles changent la nature des sceaux qu'on écrit avec
  const ENCRES = {
    encre_braise:    { id: 'encre_braise',    nom: 'Encre de braise',  couleur: '#d9622b', encre: true, usage: 'encre', ingr: ['coeur_braise', 'cendre'], etapes: ['chauffer', 'chauffer'],
                       effet: 'Chaque éclat enflamme un peu ce qui l\'entoure ; le feu y gagne 30 % de puissance.', desc: 'Huit gouttes d\'une encre qui fume encore.', enigme: 'Un cœur qui ne s\'éteint pas, dans ce qui reste du feu, chauffé deux fois.' },
    encre_nacre:     { id: 'encre_nacre',     nom: 'Encre de nacre',   couleur: '#dfe8ee', encre: true, usage: 'encre', ingr: ['nacre', 'eau_source'], etapes: ['remuer', 'infuser'],
                       effet: 'Le sort ricoche : deux rebonds de plus, et 30 % de durée.', desc: 'Huit gouttes irisées.', enigme: 'La nacre du fond du lac, remuée puis infusée dans l\'eau claire.' },
    encre_ambre:     { id: 'encre_ambre',     nom: 'Encre d\'ambre',   couleur: '#c88a2a', encre: true, usage: 'encre', ingr: ['ambre', 'seve'], etapes: ['chauffer', 'refroidir'],
                       effet: 'Ce que le sort touche s\'englue : ralenti et figé un instant. Durée +50 %.', desc: 'Huit gouttes épaisses et dorées.', enigme: 'La larme d\'un arbre ancien, fondue dans la sève, puis refroidie.' },
    encre_givre:     { id: 'encre_givre',     nom: 'Encre de givre',   couleur: '#8ab8f0', encre: true, usage: 'encre', ingr: ['givre_bleu', 'eau_source'], etapes: ['refroidir', 'refroidir'],
                       effet: 'Chaque éclat laisse une morsure de froid : l\'eau gèle, les créatures s\'engourdissent.', desc: 'Huit gouttes qui givrent la plume.', enigme: 'Le givre qui ne fond pas, dans l\'eau de source, refroidi encore et encore.' },
    encre_or:        { id: 'encre_or',        nom: 'Encre d\'or',      couleur: '#e0b050', encre: true, usage: 'encre', ingr: ['poudre_or', 'miel'], etapes: ['chauffer', 'remuer'],
                       effet: 'Le sceau coûte 40 % d\'encre en moins.', desc: 'Huit gouttes précieuses.', enigme: 'L\'or des vieux sceaux, lié au miel, chauffé puis remué.' },
    encre_chantante: { id: 'encre_chantante', nom: 'Encre chantante',  couleur: '#e8cf8a', encre: true, usage: 'encre', ingr: ['sable_chantant', 'plume'], etapes: ['remuer', 'remuer', 'infuser'],
                       effet: 'Le sort résonne : un écho de plus, et une onde qui attire les curieux.', desc: 'Huit gouttes qui fredonnent.', enigme: 'Le sable qui chante et une plume de vent, remués deux fois puis laissés à infuser.' },
    encre_pollen:    { id: 'encre_pollen',    nom: 'Encre de pollen',  couleur: '#d8d060', encre: true, usage: 'encre', ingr: ['pollen', 'rosee'], etapes: ['infuser', 'remuer'],
                       effet: 'Chaque éclat fait pousser l\'herbe et te rend un peu de vitalité.', desc: 'Huit gouttes qui sentent le printemps.', enigme: 'Le pollen qui luit, dans la rosée du matin, infusé puis remué.' },
  };
  const ENCRE_ZONES = {
    'Le Volcan':    { ing: 'coeur_braise',   mats: ['CENDRE', 'TERRE', 'SABLE'], p: 0.035 },
    'Le Lac':       { ing: 'nacre',          mats: ['SABLE', 'TERRE'], p: 0.06, eau: true },
    'La Forêt':     { ing: 'ambre',          mats: ['TERRE', 'PLANTE', 'HERBE'], p: 0.03 },
    'La Montagne':  { ing: 'givre_bleu',     mats: ['NEIGE', 'TERRE'], p: 0.035 },
    'Les Ruines':   { ing: 'poudre_or',      mats: ['TERRE', 'SABLE'], p: 0.035 },
    'Le Désert':    { ing: 'sable_chantant', mats: ['SABLE', 'SEL'], p: 0.03 },
    'La Clairière': { ing: 'pollen',         mats: ['HERBE', 'PLANTE', 'MOUSSE'], p: 0.05 },
  };
  const POTIONS = {
    gateau:     { id: 'gateau',     nom: 'Gâteau au miel',     couleur: '#e8b08a', usage: 'boire', ingr: ['miel', 'rosee'], etapes: ['remuer', 'chauffer'],
                  desc: 'Un gâteau doré. Offert à Grum, il le rend tout heureux et bien plus fort deux minutes. Sinon, il soigne un peu.', enigme: 'Le doux de la ruche et une goutte de rosée, remués puis cuits : de quoi rendre un golem heureux.' },
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

  // Leçons du maître : une par nouveauté, avec un petit essai à faire. quand : la leçon paraît ; sceau / evt / obs : ce qui la valide
  const aspectDe = (s) => (s.mods || []).some((m) => typeof m === 'string' && ASPECTS[m] && ASPECTS[m].aspect && (ASPECTS[m].aspect === s.core || ASPECTS[m].aspect === s.core2));
  const LECONS = [
    { id: 'l_premier',  titre: 'Le premier sceau',      quand: () => true, essai: 'Pose un glyphe d\'effet au centre, une forme au premier anneau, et lance le sceau.', sceau: () => true, xp: 10 },
    { id: 'l_forme',    titre: 'Changer de forme',      quand: (p) => p.shapes.length >= 3, essai: 'Garde le même effet et change la forme : lance un Mur ou une Zone.', sceau: (s) => s.shape === 'mur' || s.shape === 'zone', xp: 15 },
    { id: 'l_modif',    titre: 'Le second anneau',      quand: (p) => p.mods.length >= 3, essai: 'Pose un modificateur sur le second anneau : Puissance, Taille, Durée...', sceau: (s) => (s.mods || []).some((m) => typeof m === 'string' && MODS[m] && !ASPECTS[m]), xp: 15 },
    { id: 'l_contact',  titre: 'Attendre le contact',   quand: (p) => p.triggers.includes('contact'), essai: 'Sur la pointe haute, Au contact : le sort attend de toucher quelque chose pour éclater.', sceau: (s) => s.trigger === 'contact' || s.trigger2 === 'contact', xp: 15 },
    { id: 'l_aspect',   titre: 'Les aspects',           quand: (p) => p.mods.some((m) => ASPECTS[m]), essai: 'Pose un aspect avec son essence : l\'Eau avec Gel devient le froid, la Terre avec Minerai le métal.', sceau: (s) => aspectDe(s), xp: 20 },
    { id: 'l_fusion',   titre: 'Deux essences',         quand: (p) => p.fusion, essai: 'Sur un sceau moyen, pose un second effet sous le cercle : les deux fusionnent.', sceau: (s) => !!s.core2 && s.taille !== 'petit', xp: 20 },
    { id: 'l_phen',     titre: 'Faire naître un phénomène', quand: (p) => p.fusion, essai: 'Trouve une fusion qui fait naître un phénomène. Essaie le Feu tenu par la Gravité.', evt: 'combo_decouvert', xp: 30 },
    { id: 'l_tenu',     titre: 'Tenir un sort',         quand: (p) => p.triggers.includes('tenu'), essai: 'Avec le déclencheur Maintenu, garde le clic enfoncé : le sort suit ta souris, puis lâche.', sceau: (s) => s.trigger === 'tenu' || s.trigger2 === 'tenu', xp: 20 },
    { id: 'l_invoc',    titre: 'Un familier',           quand: (p) => p.shapes.includes('invocation'), essai: 'La forme Invocation fait naître la créature de l\'essence au centre. Invoque-en une.', sceau: (s) => s.shape === 'invocation', xp: 20 },
    { id: 'l_ordres',   titre: 'Parler aux familiers',  quand: (p) => (p.leconsFaites || []).includes('l_invoc'), essai: 'Donne un ordre : V pour « reste ici » ou « suis-moi », B pour « attaque » (la créature sous la souris), N pour les congédier.', evt: 'ordre', xp: 15 },
    { id: 'l_matiere',  titre: 'La matière',            quand: (p) => p.mods.includes('matiere'), essai: 'Avec Matière, l\'effet devient solide. Lance une lame de glace : Eau, Gel, Matière, en projectile.', sceau: (s) => (s.mods || []).includes('matiere'), xp: 20 },
    { id: 'l_dims',     titre: 'Sculpter la forme',     quand: (p) => p.tailles.includes('moyen'), essai: 'Sous le cercle, règle la largeur et la hauteur : un Mur large et bas se couche en pont.', sceau: (s) => (s.dimL || 1) !== 1 || (s.dimH || 1) !== 1, xp: 15 },
    { id: 'l_chaleur',  titre: 'La chaleur',            quand: (p) => (p.leconsFaites || []).includes('l_premier'), essai: 'La chaleur se propage : fais fondre de la glace ou de la neige, même sans la toucher.', obs: 'fonte', xp: 15 },
    { id: 'l_chute',    titre: 'Ce qui ne tient plus',  quand: (p) => (p.leconsFaites || []).includes('l_forme'), essai: 'Creuse sous une dalle ou fais sauter un pilier : ce qui ne tient plus tombe, ou bascule.', evt: 'effondrement', xp: 20 },
    { id: 'l_prise',    titre: 'Saisir',                quand: (p) => p.shapes.includes('prise'), essai: 'Avec la forme Prise, saisis l\'eau d\'un lac ou un tas de sable, promène-le, puis lance-le.', sceau: (s) => s.shape === 'prise', xp: 15 },
    { id: 'l_vent',     titre: 'Le vent',               quand: (p) => p.cores.includes('vent'), essai: 'Le vent souffle et garde son élan : pousse la fumée, un nuage ou les flammes avec un sort de Vent.', sceau: (s) => s.core === 'vent' || s.core2 === 'vent', xp: 15 },
    { id: 'l_trio',     titre: 'Trois effets',          quand: (p) => p.fusion && p.tailles.includes('grand'), essai: 'Le grand sceau a une troisième case d\'effet : certaines fusions à trois existent. Le grimoire en garde la trace.', evt: 'combo_decouvert_trio', xp: 40 },
    { id: 'l_gardien',  titre: 'Un gardien',            quand: (p) => (p.gardiensVus || []).length > 0, essai: 'Aucun gardien ne tombe sous la seule force. Observe ce qui le soigne et ce qu\'il craint : le grimoire garde son indice. Puis abats-en un.', evt: 'gardien', xp: 40 },
    { id: 'l_stele',    titre: 'Les stèles',            quand: (p) => p.fusion, essai: 'Des stèles gravées d\'essences dorment dans le monde. Fais naître près de l\'une d\'elles la fusion qu\'elle porte.', evt: 'stele', xp: 25 },
  ];
  // ---------- Tenues de Gribouille et Grum, gagnées en jouant (choisies au miroir du labo) ----------
  const TENUES_MASCOTTES = {
    gribouille: [
      { id: 'classique', cond: () => true },
      { id: 'arcaniste', indice: 'Découvre 10 fusions.', cond: (p) => Object.keys(p.combos || {}).length >= 10 },
      { id: 'alchimiste', indice: 'Connais 8 recettes du chaudron.', cond: (p) => (p.recettes || []).length >= 8 },
      { id: 'explorateur', indice: 'Retrouve 6 pages déchirées.', cond: (p) => (p.pagesLues || []).length >= 6 },
      { id: 'ceruleen', rare: true, indice: 'Vaincs les quatre gardiens.', cond: (p) => Object.keys(p.gardiens || {}).length >= 4 },
    ],
    grum: [
      { id: 'classique', cond: () => true },
      { id: 'runique', indice: 'Éveille deux stèles de fusion.', cond: (p) => ((p.compteurs || {}).steles || 0) >= 2 },
      { id: 'forgeron', indice: 'Ouvre cinq coffres.', cond: (p) => ((p.compteurs || {}).coffres || 0) >= 5 },
      { id: 'forestier', indice: 'Apprivoise cinq créatures.', cond: (p) => ((p.compteurs || {}).tames || 0) >= 5 },
      { id: 'cristallin', rare: true, indice: 'Découvre les huit fusions à trois.', cond: (p) => Object.keys(TRIOS).every((k) => (p.combos || {})[k]) },
    ],
  };
  // ---------- Les gardiens : un par région, chacun a son tour à trouver ----------
  const GARDIENS = {
    ent:      { id: 'ent', nom: 'L\'Ent-ronce', region: 'La Prairie', couleur: '#5c8f3e', desc: 'Un arbre de ronces qui marche. Il garde l\'orée de la forêt et fait jaillir ses racines sous les pas.', indice: 'Le bois vivant craint la flamme. L\'eau et la vie le soignent.', fin: 'Il retourne à la terre, et la terre te laisse un présent.', recompense: { xp: 150, ing: { coeur_chene: 2, pollen: 3 }, encre: { encre_nacre: 6 } } },
    cerf:     { id: 'cerf', nom: 'Le Grand Cerf', region: 'Les Collines', couleur: '#8a6a44', desc: 'Des bois de branches et de mousse. Il gratte le sol, puis charge droit devant lui.', indice: 'Rien ne l\'entame quand il court. Dresse un mur sur sa route : il s\'y assomme.', fin: 'Il s\'incline, puis s\'en va dans les collines.', recompense: { xp: 180, ing: { larme_lune: 1, givre_bleu: 2 }, encre: { encre_nacre: 6 } } },
    magma:    { id: 'magma', nom: 'Le Golem de magma', region: 'La Plaine de cendres', couleur: '#e0622b', desc: 'La lave qui marche. Il lance des boulets brûlants et frappe le sol à s\'en faire trembler la plaine.', indice: 'Le feu le nourrit, la lave le soigne. L\'eau et le froid figent sa croûte : alors il se brise.', fin: 'Il se fige en une statue d\'obsidienne, puis s\'effondre.', recompense: { xp: 220, ing: { coeur_braise: 3, plume_phenix: 1 }, encre: { encre_or: 6 } } },
    automate: { id: 'automate', nom: 'L\'Automate des ruines', region: 'Le Marais', couleur: '#b8733a', desc: 'Un gardien de cuivre resté de l\'ancien temps. Son œil vise, puis tire un rayon.', indice: 'Sa coque est épaisse et la foudre glisse dessus... sauf s\'il est trempé. L\'acide le ronge.', fin: 'Ses rouages s\'arrêtent un à un. L\'œil s\'éteint.', recompense: { xp: 240, ing: { poudre_or: 3, sable_temps: 1 }, encre: { encre_or: 8 } } },
  };
  // la recette d'une fusion en glyphes : essences et aspects
  function recetteCombo(cle) {
    const ess = (e) => { if (CORES[e] && !CORES[e].interne) return { core: e, mod: null }; for (const a in ASPECTS) if (ASPECTS[a].devient === e) return { core: ASPECTS[a].aspect, mod: a }; return null; };
    const parts = cle.split('|').map(ess); if (parts.some((q) => !q) || parts.length > 3) return null;
    // l'aspect se pose sur la dernière occurrence de son essence : on la met en second
    parts.sort((a, b) => (a.mod ? 1 : 0) - (b.mod ? 1 : 0));
    return { taille: parts.length > 2 ? 'grand' : 'moyen', core: parts[0].core, core2: parts[1] ? parts[1].core : null, core3: parts[2] ? parts[2].core : null, mods: parts.filter((q) => q.mod).map((q) => q.mod) };
  }

  // Familiers : la forme Invocation fait naître la créature de l'essence du sceau
  // mode : sol (marche), vol (vole), orbite (tourne autour de toi), roue (roule), chenille (rampe, se nymphose, s'envole)
  const FAMILIERS = {
    feu:           { nom: 'Salamandre de braise', mode: 'sol',      w: 34, h: 16, pv: 6,  vitesse: 175, portee: 120, cadence: 1.1, lum: 80,  desc: 'Elle court au sol et crache un jet de flammes sur tes ennemis. Elle nage dans la lave et, près de toi, chasse le grand froid.' },
    eau:           { nom: 'Ondine',               mode: 'vol',      w: 22, h: 32, pv: 5,  vitesse: 150, portee: 150, cadence: 1.3,           desc: 'Une goutte qui a une âme : elle lance des jets d\'eau, éteint les flammes autour de toi et te soigne doucement. Dans l\'eau, elle file.' },
    terre:         { nom: 'Petit golem',          mode: 'sol',      w: 30, h: 34, pv: 14, vitesse: 85,  portee: 36,  cadence: 1.4,           desc: 'Lent et solide : il se place entre toi et le danger, retient les créatures et les assomme d\'un coup de poing.' },
    vent:          { nom: 'Sylphe',               mode: 'vol',      w: 26, h: 16, pv: 4,  vitesse: 330, portee: 260, cadence: 1.2,           desc: 'Une hirondelle de vent : elle fend tes ennemis en les repoussant, et chasse la fumée autour de toi.' },
    vie:           { nom: 'Pousse',               mode: 'sol',      w: 22, h: 26, pv: 6,  vitesse: 100, portee: 160, cadence: 2.2,           desc: 'Une graine qui marche : l\'herbe pousse sous ses pas, elle te soigne et entrave tes ennemis dans des racines.' },
    lumiere:       { nom: 'Luciole',              mode: 'vol',      w: 16, h: 14, pv: 4,  vitesse: 160, portee: 120, cadence: 2.4, lum: 250, desc: 'Elle éclaire loin autour d\'elle et éblouit les créatures d\'un éclair.' },
    foudre:        { nom: 'Oiseau-tonnerre',      mode: 'vol',      w: 26, h: 18, pv: 4,  vitesse: 380, portee: 210, cadence: 1.1, lum: 60,  desc: 'Vif comme l\'éclair : il foudroie sa cible, et l\'arc saute sur une seconde créature.' },
    gravite:       { nom: 'Petite lune',          mode: 'orbite',   w: 18, h: 18, pv: 7,  vitesse: 220, portee: 220, cadence: 2.6,           desc: 'Elle tourne autour de toi ; elle soulève une créature, puis la laisse retomber lourdement.' },
    temps:         { nom: 'Chouette du temps',    mode: 'vol',      w: 24, h: 26, pv: 5,  vitesse: 140, portee: 210, cadence: 3.5,           desc: 'Ses yeux sont deux cadrans : elle enferme tes ennemis dans une bulle de temps lent, et ton encre revient plus vite.' },
    portail:       { nom: 'Renard des failles',   mode: 'sol',      w: 32, h: 20, pv: 6,  vitesse: 210, portee: 240, cadence: 1.6,           desc: 'Taillé dans un ciel de nuit, il saute d\'une faille à l\'autre jusqu\'à sa proie, la mord, et parfois l\'envoie ailleurs.' },
    esprit:        { nom: 'Chat d\'ombre',       mode: 'sol',      w: 28, h: 20, pv: 5,  vitesse: 185, portee: 34,  cadence: 2.5,           desc: 'Silencieux comme une pensée : il endort les créatures qu\'il frôle.' },
    transmutation: { nom: 'Ouroboros',            mode: 'roue',     w: 22, h: 22, pv: 7,  vitesse: 230, portee: 30,  cadence: 2.2,           desc: 'Le serpent qui se mord la queue roule comme un anneau ; sous sa proie, la terre devient boue et la pierre sable.' },
    contre:        { nom: 'Pie grise',            mode: 'vol',      w: 26, h: 18, pv: 5,  vitesse: 270, portee: 30,  cadence: 1.8,           desc: 'Elle vole la magie : elle étourdit sa cible, lui arrache parfois un trésor, et défait les maux qui t\'accablent.' },
    metamorphose:  { nom: 'Chenille',             mode: 'chenille', w: 26, h: 12, pv: 5,  vitesse: 45,  portee: 170, cadence: 4.5,           desc: 'D\'abord une chenille qui grignote, puis un cocon, puis un papillon qui change tes ennemis en petites bêtes.' },
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
    pont:          { texte: 'un sort qui fasse un pont au-dessus de l\'eau', test: (s) => !['soi', 'aura'].includes(s.shape) && (s.cores.includes('froid') || s.cores.includes('metal') || (s.cores.includes('terre') && s.persist > 0) || ['eau|froid', 'eau|lumiere', 'transmutation|vent', 'terre|vie'].includes(s.combo)), indice: 'Geler l\'eau, faire surgir du métal, ou de la terre qui dure (Persistance).' },
    trois_cibles:  { texte: 'un sort qui touche trois épouvantails d\'un coup', test: (s) => s.shape === 'chaine' || s.shape === 'pluie' || s.extra > 0 || s.echo > 0 || (s.shape === 'zone' && s.size >= 1.5), indice: 'Une Chaîne, une Pluie, un Double, un Écho, ou une très grande Zone.' },
    fusion:        { texte: 'un sort qui fusionne deux éléments', test: (s) => s.cores.length >= 2, indice: 'Un second glyphe d\'effet en bas du premier anneau.' },
    emboite:       { texte: 'un sort qui en lance un autre', test: (s) => s.subs > 0, indice: 'Un sous-sceau dans un emplacement de modificateur.' },
    endormir:      { texte: 'un sort qui endorme tout un troupeau', test: (s) => (s.cores.includes('ombre') || s.cores.includes('silence') || s.combo === 'acide|feu' || s.combo === 'vent|vie') && ['zone', 'pluie', 'aura', 'totem', 'mur', 'projectile'].includes(s.shape), indice: 'L\'Esprit et son aspect Sommeil sur une forme qui couvre large, ou un nuage de pollen.' },
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
    // --- matière et rafale ---
    { id: 'matiere', type: 'mods', item: ['matiere'], titre: 'Modificateur : Matière', indice: 'Atteins le niveau 2.', cond: (p) => p.compteurs.niveau >= 2 },
    { id: 'rafale', type: 'mods', item: ['rafale'], titre: 'Modificateur : Rafale', indice: 'Lance 30 sceaux.', cond: (p) => p.compteurs.sorts >= 30 },
    // --- nouveaux glyphes de sort ---
    { id: 'zigzag', type: 'mods', item: ['zigzag'], titre: 'Trajectoire : Zigzag', indice: 'Lance 45 sceaux.', cond: (p) => p.compteurs.sorts >= 45 },
    { id: 'cloche', type: 'mods', item: ['cloche'], titre: 'Trajectoire : Cloche', indice: 'Atteins le niveau 3.', cond: (p) => p.compteurs.niveau >= 3 },
    { id: 'percant', type: 'mods', item: ['percant'], titre: 'Modificateur : Perçant', indice: 'Touche 25 créatures avec des projectiles.', cond: (p) => p.compteurs.creaturesTouchees >= 25 },
    { id: 'gerbe', type: 'mods', item: ['gerbe'], titre: 'Modificateur : Gerbe', indice: 'Atteins le niveau 5.', cond: (p) => p.compteurs.niveau >= 5 },
    { id: 'tenu', type: 'trigger', item: 'tenu', titre: 'Déclencheur : Maintenu', indice: 'Découvre ta première fusion, ou atteins le niveau 3.', cond: (p) => Object.keys(p.combos || {}).length >= 1 || p.compteurs.niveau >= 3 },
    { id: 'proximite', type: 'trigger', item: 'proximite', titre: 'Déclencheur : Proximité', indice: 'Lance 4 sceaux avec le déclencheur Retardé.', cond: (p) => (p.compteurs.retardes || 0) >= 4 },
    { id: 'vague', type: 'shape', item: 'vague', titre: 'Forme : Vague', indice: 'Lance 10 sceaux de Terre.', cond: (p) => p.compteurs.terre >= 10 },
    { id: 'colonne', type: 'shape', item: 'colonne', titre: 'Forme : Colonne', indice: 'Emploie souvent l\'Eau.', cond: (p) => ((p.maitrise || {}).eau || 0) >= 15 },
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
    mods: ['puissance', 'portee', 'reduire'],
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

  Object.assign(POTIONS, BIZARRES, ENCRES);

  // ================= Refonte : des essences, et leurs aspects =================
  // Une essence est une force première. Ce qui en découle n'est pas une essence : c'est un aspect,
  // un glyphe du second anneau qui donne une autre nature à son essence (Eau + Gel = le froid).
  const ESSENCES = ['feu', 'eau', 'terre', 'vent', 'vie', 'lumiere', 'foudre', 'gravite', 'temps', 'portail', 'esprit', 'transmutation', 'contre', 'metamorphose'];
  for (const id in CORES) if (!ESSENCES.includes(id)) CORES[id].interne = true;
  const DA = {
    feu: ['#d9622b', 'Braise et flamme : le feu transforme ce qu\'il touche par la chaleur. Il brûle le bois et l\'herbe, fond la glace et la neige, évapore l\'eau, vitrifie le sable. Sur soi : il te sèche, ou il te brûle.'],
    eau: ['#3b6fb6', 'Ce qui coule et prend la forme de tout : l\'eau jaillit, éteint, arrose, fait de la boue, dissipe les follets. Ses aspects la font geler, jaillir en jet, ou courir comme un torrent. Sur soi : trempé(e), et l\'on respire sous l\'eau.'],
    terre: ['#8a6b2f', 'Ce qui est lourd et qui reste : la terre surgit, bâtit, bouche, porte. Ses aspects la tassent en pierre ou en cristal, en tirent le métal, la font trembler. Sur soi : peau de pierre.'],
    vent: ['#3f9c9b', 'Le mouvement libre : le vent souffle les gaz, le sable, l\'eau et les flammes, repousse les créatures. Ses aspects en font une tornade ou une onde de son. Sur soi : un bond et un vol plané.'],
    vie: ['#5c8f3e', 'La croissance : soigner, faire pousser l\'herbe, les plantes et les vignes, rendre la cendre à la terre. La vie n\'apprivoise pas : une créature se gagne avec le temps. Sur soi : soin.'],
    lumiere: ['#d8a63a', 'Révéler : la lumière éclaire, révèle les runes, éblouit, effraie les limaces. Inversée, elle devient l\'ombre : tu disparais, les créatures se perdent dans le noir. Sur soi : tu rayonnes comme une lanterne.'],
    foudre: ['#e0c43a', 'L\'énergie : la foudre court dans l\'eau et le métal, embrase l\'huile, vitrifie le sable, secoue les créatures et allume ce qu\'elle touche. Sur soi : vitesse.'],
    gravite: ['#6c5ab8', 'La pesanteur : un champ orienté dans le sens du lancer, où tout tombe de ce côté. Ses aspects attirent, repoussent, alourdissent ou tendent un fil. Inverser : apesanteur. Sur soi : marcher aux murs, au plafond, voler, devenir une enclume.'],
    temps: ['#8a8f9a', CORES.temps.desc + ' Aspects : Rembobiner (remonter le temps), Figer (arrêter tout dans la bulle).'],
    portail: ['#4fb0a0', 'L\'espace se plie : deux lancers posent deux portails, et tout ce qui entre dans l\'un sort par l\'autre, même les liquides. Ses aspects font sauter d\'un point à un autre, ou posent des repères. Sur soi : rejoindre ton dernier portail.'],
    esprit: ['#b08ad8', 'La conscience : prendre la tête d\'une créature et voir par ses yeux (E pour revenir). Ses aspects endorment, ou font fuir.'],
    transmutation: ['#c08a3a', 'L\'alchimie : changer une matière en une autre (pierre en sable, sable en terre, eau en huile, glace en verre...). Son aspect Corrosion en fait un acide qui ronge. Sur soi : peau de pierre.'],
    contre: ['#a8a29a', 'Défaire la magie : dissipe les champs, pièges, totems, bulles, sorts en attente, portails, pesanteurs et marques.'],
    metamorphose: ['#c06aa0', CORES.metamorphose.desc],
  };
  for (const id in DA) { CORES[id].couleur = DA[id][0]; CORES[id].desc = DA[id][1]; }
  CORES.portail.nom = 'Espace';
  Object.assign(PSEUDO, {
    repulsion: { id: 'repulsion', nom: 'Répulsion', couleur: '#8a6ad8' },
    fumee:     { id: 'fumee',     nom: 'Fumée',     couleur: '#6e6660' },
    explosion: { id: 'explosion', nom: 'Explosion', couleur: '#e0622b' },
    courant:   { id: 'courant',   nom: 'Courant',   couleur: '#2f6fb0' },
    seisme:    { id: 'seisme',    nom: 'Séisme',    couleur: '#7a5a2a' },
    figer:     { id: 'figer',     nom: 'Figer',     couleur: '#9aa8c8' },
    saut:      { id: 'saut',      nom: 'Saut',      couleur: '#4fb0a0' },
    peur:      { id: 'peur',      nom: 'Peur',      couleur: '#8a5aa8' },
  });
  PSEUDO.silence.nom = 'Sommeil';
  Object.assign(INVERSE, { repulsion: 'force', fumee: 'vent', explosion: 'force', courant: 'secheresse', seisme: 'seisme', figer: 'temps', saut: 'saut', peur: 'esprit' });
  // aspects qui changent la nature de l'essence : { parent, devient (effet) }
  const ASPECTS = {
    fumee:      { aspect: 'feu',           devient: 'fumee',      nom: 'Fumée',      desc: 'Le feu sans flamme : un épais nuage de fumée qui cache, étouffe et fait tousser les créatures.' },
    explosion:  { aspect: 'feu',           devient: 'explosion',  nom: 'Explosion',  desc: 'Le feu d\'un coup : un souffle qui creuse un cratère, projette tout et enflamme alentour.' },
    gel:        { aspect: 'eau',           devient: 'froid',      nom: 'Gel',        desc: 'L\'eau qui se fige : geler l\'eau, faire neiger, figer la lave, engourdir les créatures. Sur soi : des patins pour marcher sur l\'eau. ×2 (Adepte) : gel profond, les créatures restent prises dans la glace.' },
    courant:    { aspect: 'eau',           devient: 'courant',    nom: 'Courant',    desc: 'L\'eau qui court : un torrent dans le sens du lancer, qui emporte créatures, caisses et liquides.' },
    minerai:    { aspect: 'terre',         devient: 'metal',      nom: 'Minerai',    desc: 'La terre en tire son métal : il surgit, conduit la foudre, résiste à l\'acide, attire caisses et golems. Sur soi : une armure.' },
    seisme:     { aspect: 'terre',         devient: 'seisme',     nom: 'Séisme',     desc: 'La terre qui tremble : tout ce qui est debout tombe, les rochers fissurés éclatent, le verre se brise.' },
    son:        { aspect: 'vent',          devient: 'son',        nom: 'Son',        desc: 'Le vent devenu onde : brise le verre, réveille, repousse, attire les curieux.' },
    attraction: { aspect: 'gravite',       devient: 'force',      nom: 'Attraction', desc: 'Tout est attiré vers le point d\'impact : créatures, caisses, liquides et sable. Sur soi : un élan vers la souris.' },
    repulsion:  { aspect: 'gravite',       devient: 'repulsion',  nom: 'Répulsion',  desc: 'Tout est chassé loin du point d\'impact. Sur soi : une onde qui écarte tout autour de toi.' },
    fil:        { aspect: 'gravite',       devient: 'lien',       nom: 'Fil',        desc: 'Un fil de pesanteur vers ce que le sort touche : on s\'y hisse, on s\'y balance (Espace pour lâcher).' },
    rembobiner: { aspect: 'temps',         devient: 'rembobinage', nom: 'Rembobiner', desc: 'Remonter le temps de quelques secondes : la matière revient, les créatures reculent et se relèvent. Sur soi : tu reviens sur tes pas.' },
    figer:      { aspect: 'temps',         devient: 'figer',      nom: 'Figer',      desc: 'Une bulle où le temps s\'arrête : créatures et projectiles y restent suspendus, puis repartent.' },
    saut:       { aspect: 'portail',       devient: 'saut',       nom: 'Saut',       desc: 'Plier l\'espace d\'un coup : ce qui est touché est projeté ailleurs. Sur soi : tu te téléportes là où tu vises.' },
    marque:     { aspect: 'portail',       devient: 'marque',     nom: 'Marque',     desc: 'Un repère dans l\'espace (trois au plus) ; sur une créature, il la suit. Les sorts ciblés « Marque » le visent, même hors de vue.' },
    sommeil:    { aspect: 'esprit',        devient: 'silence',    nom: 'Sommeil',    desc: 'Plonger les esprits dans le sommeil : les créatures s\'endorment et oublient de te chercher.' },
    peur:       { aspect: 'esprit',        devient: 'peur',       nom: 'Peur',       desc: 'Une terreur soudaine : les créatures fuient loin du point d\'impact.' },
    corrosion:  { aspect: 'transmutation', devient: 'acide',      nom: 'Corrosion',  desc: 'La matière se défait : un acide qui ronge pierre, terre, bois et métal. ×2 (Adepte) : même le métal et l\'obsidienne cèdent.' },
  };
  const DE = { feu: 'du Feu', eau: 'de l\'Eau', terre: 'de la Terre', vent: 'du Vent', vie: 'de la Vie', lumiere: 'de la Lumière', foudre: 'de la Foudre', gravite: 'de la Gravité', temps: 'du Temps', portail: 'de l\'Espace', esprit: 'de l\'Esprit', transmutation: 'de la Transmutation' };
  for (const id in ASPECTS) MODS[id] = Object.assign({ id, cout: 2 }, ASPECTS[id], { desc: 'Aspect ' + DE[ASPECTS[id].aspect] + '. ' + ASPECTS[id].desc + ' Muet sans son essence.' });
  // les glyphes de langage sont des aspects qui renforcent leur essence
  for (const el in LANGAGES) { const Lg = LANGAGES[el], Md = MODS[Lg.glyphe]; Md.aspect = el; Md.desc = 'Aspect ' + DE[el] + ', qui le renforce. ×1 : ' + Lg.paliers[0] + ' ×2 (Adepte) : ' + Lg.paliers[1] + ' Muet sans son essence.'; }
  MODS.inverser.desc = 'Retourne l\'effet : le feu refroidit, la terre creuse, la vie fane, l\'eau assèche, la lumière devient ombre, l\'attraction repousse...';
  // migrations : ancienne essence → [essence, aspect]
  const MIGRATION = { froid: ['eau', 'gel'], acide: ['transmutation', 'corrosion'], metal: ['terre', 'minerai'], son: ['vent', 'son'], force: ['gravite', 'attraction'], lien: ['gravite', 'fil'], rembobinage: ['temps', 'rembobiner'], marque: ['portail', 'marque'], ombre: ['lumiere', 'inverser'] };
  const MIGR_MODS = { givre: 'gel', mordant: 'corrosion', tenebres: null };
  // déblocages : les anciennes essences deviennent des aspects
  const DEB = (id) => UNLOCKS.find((u) => u.id === id);
  const enAspect = (id, mods, titre) => { const u = DEB(id); if (u) { u.type = 'mods'; u.item = mods; u.titre = titre; } };
  enAspect('ombre', ['sommeil'], 'Aspect de l\'Esprit : Sommeil');
  enAspect('force', ['attraction', 'repulsion'], 'Aspects de la Gravité : Attraction et Répulsion');
  enAspect('froid', ['gel'], 'Aspect de l\'Eau : Gel');
  enAspect('acide', ['corrosion'], 'Aspect de la Transmutation : Corrosion');
  enAspect('son', ['son'], 'Aspect du Vent : Son');
  enAspect('lien', ['fil'], 'Aspect de la Gravité : Fil');
  enAspect('metal', ['minerai'], 'Aspect de la Terre : Minerai');
  enAspect('rembobinage', ['rembobiner'], 'Aspect du Temps : Rembobiner');
  DEB('rembobinage').indice = 'Emploie souvent le Temps.'; DEB('rembobinage').cond = (p) => ((p.maitrise || {}).temps || 0) >= 25 || (p.cores.includes('temps') && p.compteurs.niveau >= 6);
  DEB('marque').titre = 'Aspect de l\'Espace et cible : Marque';
  DEB('portail').titre = 'Glyphe : Espace';
  DEB('contre').indice = 'Possède 10 glyphes d\'effet.'; DEB('contre').cond = (p) => p.cores.length >= 10;
  DEB('slot3').indice = 'Possède 9 glyphes d\'effet.'; DEB('slot3').cond = (p) => p.cores.length >= 9;
  DEB('inverser').indice = 'Possède le Feu et l\'aspect Gel de l\'Eau.'; DEB('inverser').cond = (p) => p.mods.includes('gel');
  DEB('prise').indice = 'Possède la Gravité.'; DEB('prise').cond = (p) => p.cores.includes('gravite');
  UNLOCKS.push(
    { id: 'a_fumee', type: 'mods', item: ['fumee'], titre: 'Aspect du Feu : Fumée', indice: 'Brûle beaucoup de choses.', cond: (p) => (p.compteurs.brule || 0) >= 15 },
    { id: 'a_explosion', type: 'mods', item: ['explosion'], titre: 'Aspect du Feu : Explosion', indice: 'Fais sauter de la poudre.', cond: (p) => (p.obs.explosion || 0) >= 1 },
    { id: 'a_courant', type: 'mods', item: ['courant'], titre: 'Aspect de l\'Eau : Courant', indice: 'Emploie souvent l\'Eau.', cond: (p) => ((p.maitrise || {}).eau || 0) >= 25 },
    { id: 'a_seisme', type: 'mods', item: ['seisme'], titre: 'Aspect de la Terre : Séisme', indice: 'Emploie souvent la Terre.', cond: (p) => ((p.maitrise || {}).terre || 0) >= 25 },
    { id: 'a_figer', type: 'mods', item: ['figer'], titre: 'Aspect du Temps : Figer', indice: 'Emploie souvent le Temps.', cond: (p) => ((p.maitrise || {}).temps || 0) >= 15 },
    { id: 'a_saut', type: 'mods', item: ['saut'], titre: 'Aspect de l\'Espace : Saut', indice: 'Emploie souvent l\'Espace.', cond: (p) => ((p.maitrise || {}).portail || 0) >= 12 },
    { id: 'a_peur', type: 'mods', item: ['peur'], titre: 'Aspect de l\'Esprit : Peur', indice: 'Emploie souvent l\'Esprit.', cond: (p) => ((p.maitrise || {}).esprit || 0) >= 12 },
  );
  // aspects d'information
  Object.assign(PSEUDO, { lecture: { id: 'lecture', nom: 'Lecture', couleur: '#b08ad8' }, revelation: { id: 'revelation', nom: 'Révélation', couleur: '#f0d070' } });
  Object.assign(INVERSE, { lecture: 'lecture', revelation: 'ombre' });
  MODS.lecture = { id: 'lecture', cout: 2, aspect: 'esprit', devient: 'lecture', nom: 'Lecture', desc: 'Aspect de l\'Esprit. Lire dans les pensées : ce que chaque créature touchée aime et craint s\'affiche (et entre au bestiaire), avec son affinité pour toi. Muet sans son essence.' };
  MODS.revelation = { id: 'revelation', cout: 2, aspect: 'lumiere', devient: 'revelation', nom: 'Révélation', desc: 'Aspect de la Lumière. Une lumière qui traverse tout : les runes se révèlent, la carte se dessine loin alentour, et les coffres, pages, ingrédients et mécanismes cachés luisent à travers la roche un moment. Muet sans son essence.' };
  UNLOCKS.push(
    { id: 'a_lecture', type: 'mods', item: ['lecture'], titre: 'Aspect de l\'Esprit : Lecture', indice: 'Note au bestiaire 4 goûts ou craintes.', cond: (p) => Object.values(p.bestiaire || {}).reduce((n, b) => n + Object.keys(b).length, 0) >= 4 },
    { id: 'a_revelation', type: 'mods', item: ['revelation'], titre: 'Aspect de la Lumière : Révélation', indice: 'Lis deux runes cachées.', cond: (p) => p.compteurs.runes >= 2 },
    { id: 'filtres3', type: 'filtres', item: ['liquide', 'objet'], titre: 'Filtres : Liquide, Objet', indice: 'Observe 12 réactions différentes.', cond: (p) => Object.keys(p.obs || {}).length >= 12 },
    { id: 'cible_objet', type: 'cible', item: 'objet', titre: 'Cible : Objet proche', indice: 'Ouvre un coffre scellé.', cond: (p) => (p.compteurs.coffres || 0) >= 1 },
  );
  // nom lisible d'un effet, même devenu aspect : « Gel (Eau) »
  const nomEffet = (id) => { if (CORES[id] && !CORES[id].interne) return CORES[id].nom; const M2 = MIGRATION[id]; if (M2) return M2[1] === 'inverser' ? 'Ombre (Lumière inversée)' : MODS[M2[1]].nom + ' (' + CORES[M2[0]].nom + ')'; for (const m in MODS) if (MODS[m].devient === id) return MODS[m].nom + ' (' + CORES[MODS[m].aspect].nom + ')'; return (CORES[id] || PSEUDO[id] || { nom: id }).nom; };
  // dimensions réglables de chaque forme (multiplicateurs)
  const DIMS = { zone: { l: 'Rayon' }, mur: { l: 'Largeur', h: 'Hauteur' }, colonne: { l: 'Largeur', h: 'Hauteur' }, trait: { h: 'Longueur', l: 'Épaisseur' }, vague: { h: 'Hauteur', l: 'Distance' }, pluie: { l: 'Largeur' }, aura: { l: 'Rayon' }, totem: { l: 'Rayon' }, bouclier: { l: 'Taille' } };
  const DIM_VALS = [0.25, 0.5, 1, 2, 3, 4, 6];
  // la matière que devient chaque effet avec le glyphe Matière
  const MATIERE = { froid: 'GLACE', eau: 'EAU', terre: 'PIERRE', metal: 'METAL', feu: 'LAVE', lumiere: 'CRISTAL', foudre: 'METAL', vie: 'BOIS', ombre: 'OBSIDIENNE', acide: 'ACIDE', transmutation: 'VERRE', fanaison: 'CENDRE', secheresse: 'SABLE', rouille: 'SABLE', creuser: 'AIR' };
  // affinité : combien un geste aimé rapproche (sur 100)
  const AFFINITE = { golem: { gain: 4, parJour: 20 }, follet: { gain: 12 }, limace: { gain: 15 }, salamandre: { gain: 14 }, chauve: { gain: 15 } };

  // ---------- les élans : ce que chaque essence fait de toi, sur soi (js/elans.js) ----------
  const ELANS = {
    feu: { imm: 'une gerbe de flammes te propulse vers la souris (le sol s\'embrase un peu derrière toi), et tu retombes sans mal.', tenu: 'tu voles sur tes flammes.' },
    eau: { imm: 'un jet d\'eau te pousse (très vite dans l\'eau), et tu respires l\'eau un moment.', tenu: 'le jet te porte où tu vises.' },
    terre: { imm: 'un pilier te soulève (de pierre avec Persistance : il reste) ; en l\'air, vise en bas pour t\'abattre en onde de choc. Peau de pierre.', tenu: 'tu creuses comme une taupe (la pierre cède plus lentement, sauf avec Puissance).' },
    vent: { imm: 'une bourrasque te jette vers la souris, puis tu planes.', tenu: 'tu voles où pointe la souris.' },
    vie: { imm: 'elle te soigne, et une liane t\'emporte vers le mur visé (grimpe-y avec ↑).', tenu: 'la liane te tient en corde, et tu te régénères.' },
    lumiere: { imm: 'tu files en un rayon jusqu\'au mur, aveuglant ce que tu traverses, et tu luis.', tenu: 'tu deviens lumière : rien ne te touche, tu files où tu vises.' },
    foudre: { imm: 'un éclair : tu fonces d\'un coup, ce que tu traverses est foudroyé, puis tes jambes crépitent.', tenu: 'une tempête d\'éclairs, de bond en bond vers la souris.' },
    gravite: { tenu: 'tu lévites vers la souris.' },
    temps: { tenu: 'le monde ralentit autour de toi ; toi, non.' },
    portail: { imm: 'tu te téléportes là où tu vises, même derrière un mur ; sur une bête, vous échangez vos places ; vers un portail, tu ressors par l\'autre.', tenu: 'vise où paraître, lâche : tu y es (plus loin).' },
    esprit: { imm: 'sur une bête, tu entres dans sa tête ; sinon ton esprit s\'élance et prend la première qu\'il touche.', tenu: 'ton esprit sort de ton corps : promène-le à travers les murs, il lit les bêtes et entre dans celle qu\'il touche.' },
    transmutation: { imm: 'ton corps devient sable fin : tu traverses la roche (↓ pour t\'enfoncer dans le sol).', tenu: 'sable fin tant que tu tiens.' },
    contre: { imm: 'tout s\'arrête : tu restes suspendu(e) un instant, un miroir renvoie les tirs, la magie alentour se dissipe.', tenu: 'suspendu(e) dans l\'air, et les tirs te reviennent dessus... renvoyés.' },
    metamorphose: { tenu: 'tu gardes ta forme tant que tu tiens.' },
  };
  // une seconde (ou troisième) essence teinte l'élan : sa trace, son arrivée
  const TEINTES = { feu: 'brûle ce que tu traverses', eau: 'éclabousse et mouille', terre: 'une onde de choc à l\'arrivée', vent: 'tu planes ensuite', vie: 'soigne, enlace les bêtes', lumiere: 'aveugle ce que tu traverses', foudre: 'plus vite, intouchable, foudroie', gravite: 'tu deviens léger(ère)', temps: 'le monde ralentit un instant', portail: 'tu y es d\'un clin d\'œil', esprit: 'effraie ce que tu traverses', transmutation: 'traverse les murs', contre: 'dissipe la magie, puis arrêt net', metamorphose: 'change les bêtes traversées' };
  for (const e in ELANS) { const C = CORES[e], E = ELANS[e]; if (E.imm) C.desc = C.desc.replace(/ Sur soi : [^.]*\./, '') + ' Sur soi : ' + E.imm; C.desc += ' Maintenu sur soi : ' + E.tenu; }
  return { ELANS, TEINTES, FILTRES, CIBLES, TAILLES, ENCHAINEMENTS, TROPHEES, EPREUVES, LETTRES, CORES, PSEUDO, INVERSE, COMBOS, SHAPES, MODS, TRIGGERS, INGREDIENTS, FAMILLES, ODEURS, BRUITS, BIZARRES, STEPS, POTIONS, OBSERVATIONS, ESPECES, PAGES, DEFIS, UNLOCKS, DEBUT, XP, CHAPEAUX, CAPES, ACCESSOIRES , LANGAGES, MAITRISE, niveauMaitrise, ENCRES, ENCRE_ZONES, ESSENCES, ASPECTS, MIGRATION, MIGR_MODS, AFFINITE, DE, nomEffet, DIMS, DIM_VALS, MATIERE, GENRES, comboInfo, comboCle, FAMILIERS, LECONS, recetteCombo, TRIOS, GARDIENS, TENUES_MASCOTTES };
})();
