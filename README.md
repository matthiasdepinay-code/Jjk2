# L'Atelier des Sceaux

Un bac à sable de magie dans l'esprit de *L'Atelier des Sorciers* : on compose des sceaux en emboîtant des glyphes préfabriqués, on brasse des potions, puis on sort dans un grand monde où **toute la matière réagit** : eau, huile, acide, lave, glace, neige, feu, vapeur, bois, plantes, sable, verre, métal, cristal.

Tout tient dans le navigateur : pas d'installation, pas de dépendance, sauvegarde automatique locale (personnage, découvertes, inventaire et monde modifié).

## Lancer le jeu

- Ouvrir `index.html` dans un navigateur récent (Chrome, Firefox, Edge, Safari).
- Ou la version mono-fichier : `dist/atelier-des-sceaux.html` (régénérée par `./build.sh`).

## Direction artistique

- **Encre et parchemin** : traits de plume tremblés, hachures, grain de papier. Les matières simulées sont dessinées en formes lissées hachurées. Seuls les sceaux et les effets portent la couleur de leur élément.
- **Ambiance cosy** : nappe sonore générative, jour/nuit, pluie et orages, aucun vrai échec. Les ratés font de la fumée et donnent un indice.

## Le labo

| Poste | Ce qu'on y fait |
| --- | --- |
| Miroir | Changer d'apparence (chapeau, cape, objet en main). |
| Table des sceaux | Composer un sceau : **centre** = glyphe d'effet, **premier anneau** = forme, **second anneau** = modificateurs, **pointes** = déclencheur. Consigner, puis « Mettre dans la barre ». |
| Chaudron | Jusqu'à trois ingrédients et trois étapes dans l'ordre. Le chaudron guide par l'odeur, le bruit et la couleur ; un raté donne une potion bizarre (hoquet de fumée, grenouille, ballon, boussole folle...). Les fioles de liquide puisées dehors sont des ingrédients et se lancent depuis la barre. |
| Grimoire | Découvertes, glyphes et fusions, recettes, ingrédients, encyclopédie des réactions, bestiaire, pages déchirées retrouvées, défis du maître, journal. |
| Bac d'essai | Un monde miniature sous verre pour tester le sceau en cours et verser des matières. |
| Alambic | Deux fioles identiques distillées en une fiole forte (effet doublé). |
| Presse à glyphes | Un sceau consigné + une poussière de pierre = trois parchemins lançables sans encre. |
| Terrarium | Les créatures apprivoisées ramenées dans tes bras y vivent et offrent des cadeaux. |
| Fenêtre et corbeau | Treize lettres du maître : commandes de potions, de matières, d'exploits et de sceaux à inventer, récompensées par des ingrédients rares, de l'encre permanente et des trophées. |
| Lettre du maître | L'aide, les contrôles, et « Restaurer le monde ». |
| ⚙ Options | Vitesse du feu, fréquence de la pluie, générosité de l'encre, taille du texte, volumes. |
| Porte | Sortir. Revenir restaure encre et vitalité et sauvegarde le monde. |

## Les sceaux

- **Composer à la table** :
  - glisser un glyphe de la palette sur le cercle (à la souris, ou au doigt après un appui long) ; pendant le geste, les cases qui l'acceptent s'allument en doré ;
  - glisser un glyphe posé le déplace sur une autre case du même anneau (s'il y en a déjà un, ils s'échangent) ; le glisser hors du cercle le retire ;
  - on peut aussi cliquer une case puis un glyphe : les palettes qui n'y vont pas s'estompent ; survoler un glyphe de la palette allume les cases où il peut aller ;
  - Maj + glisser un glyphe posé en pose une copie (un sous-sceau aussi) ;
  - Ctrl+Z et Ctrl+Y (ou ↶ ↷) annulent et refont, même « Nouveau » ou le chargement d'un sceau ; Suppr retire le glyphe de la case choisie, Échap la désélectionne ;
  - au clavier : les flèches passent d'une case à l'autre (gauche et droite tournent sur l'anneau, haut et bas changent d'anneau) ; taper les premières lettres d'un glyphe le trouve dans la palette, Entrée le pose ;
  - un second clic sur un sous-sceau l'ouvre sur place : on le retouche, puis « Remonter » (ou Échap) le remet dans son parent ;
  - relire : au survol, chaque case dit ce qu'elle coûte ; le coût se détaille sous le nom (centre, fusion, forme, anneaux, pointes, taille, équilibre) ; un glyphe qui ne sert à rien est grisé, barré, et la table dit pourquoi ; l'encre choisie teinte l'anneau extérieur ;
  - la taille s'ajuste toute seule : la plus petite qui tient ce qui est posé. Les cases de la taille suivante attendent en pointillés ; y poser un glyphe agrandit le sceau, et rien de ce qui est posé ne bouge. Retirer ce qui demandait la grande taille le fait rapetisser ;
  - le cercle reste à l'écran : les palettes défilent à part.
- **Tailles** : petit (centre, forme, un modificateur, un déclencheur ; moitié prix, presque instantané), moyen (trois modificateurs, filtre, cible, une seconde essence), grand (cinq modificateurs, une troisième essence, deux déclencheurs). Le tracé dure selon le nombre de glyphes posés : 0,2 s pour un moyen de quatre glyphes, 0,5 s pour un grand de sept, entre ×0,6 et ×1,6 autour.
- **La géométrie du sceau** :
  - la place compte : Puissance ou Inverser posé juste sous la seconde essence (en bas, à 90°) ne sert qu'elle ; sur un grand sceau, la case à 165°, contre la troisième essence, ne sert qu'elle. Dans une fusion, chaque essence garde sa part (le petit soleil chauffe selon le Feu, attire selon la Gravité). Un trait relie la case à son essence ;
  - l'équilibre : des modificateurs bien répartis autour du cercle (au moins deux) rendent le sceau équilibré, 10 % d'encre en moins et un tracé 15 % plus vif ; serrés d'un côté, il est bancal : il penche à la table, et sa puissance vacille de ±20 % d'un sort à l'autre ;
  - le second déclencheur d'un grand sceau peut être relié par un trait à une seule essence (réglage « Second déclencheur pour ») : le sort part en deux temps, cette essence avec le second déclencheur, le reste avec le premier ; les deux moitiés ne se heurtent pas.
- **Filtres de matière** (pointe droite) : avec Au contact, le sort ne réagit qu'à l'eau, au feu, à la pierre, à la terre, au bois, au métal, à la glace ou aux créatures, et traverse tout le reste.
- **Cibles** (pointe gauche) : souris, créature hostile la plus proche (le sort la suit), ou marque la plus récente posée par le glyphe Marque, même hors de vue.
- **Déclencheurs** : Immédiat, Au contact, Retardé (1, 2, 5 ou 10 s), Sur commande (la touche F libère tous les sorts en attente), Répétition (toutes les 1, 2 ou 5 s), À l'expiration (dernier éclat quand l'effet s'éteint).
- **Maintenu** (déclencheur) : le sort ne vit que tant qu'on tient le clic. Il naît à l'appui, sans charge, puis suit la souris en buvant de l'encre, et disparaît dès qu'on lâche.
  - Un petit soleil, une tornade de feu, un orage, une sphère d'eau se promènent au bout de la main. On peut porter l'eau ailleurs et la lâcher.
  - Un rayon ardent ou un fil de foudre suivent le regard.
  - Une Singularité ou une Implosion tenues rassemblent tout, puis éclatent au relâchement.
  - Sans fusion, un projectile tenu se tient au bout de la main, une zone ou une aura est canalisée là où l'on pointe, un trait devient un rayon continu.
  - Le clic droit fait de même avec la main gauche. Lâché pendant le tracé, le sceau se défait et rend presque toute son encre.
- **Lancer** : maintenir le clic trace le sceau dans l'air, anneau par anneau, au-dessus de la main ; tenu jusqu'au bout, il part dès qu'on lâche, et tenu plus longtemps il se charge (plus puissant, plus loin, plus cher). Lâché en plein tracé, seuls les anneaux finis partent, plus faibles et moins chers (il faut au moins le centre et la forme) ; un clic bref trace le sceau en entier avant de lancer, comme avant ; la main gauche lance un second sceau au clic droit (Maj + 1-5) ; dix enchaînements nommés quand un second sort éclate près du premier dans la seconde ; deux projectiles qui se croisent fusionnent.
- **Bouclier** : arc élémentaire tourné vers la souris, qui repousse créatures, eau et sable (bulle sèche sous l'eau). **Contre-sort** : dissipe champs, pièges, totems, sorts en attente, portails et marques.
- **Éditeur** : fiche lisible du sceau et aperçu animé de son effet.
- **Terre** : la terre surgit en tas et tombe, puis se tasse au repos (un Mur, lui, reste debout). **Réduction** (dès le début) rend n'importe quel effet plus petit ; avec Taille, on règle la grosseur dans les deux sens.
- **Temps** : dans une bulle, chaque chose vit à son propre rythme : accéléré, tout y va trois fois plus vite (la matière, les créatures, les objets, les sorts) ; Figer arrête tout, même le sable qui tombe ; inversé, tout ralentit. Le lanceur n'y est pas soumis. Une bulle où le temps file (plantes, feu, glace, lave, cendre, métal, petits, effets en cours, sorts posés vieillissent à toute allure) ; inversé, une bulle de temps lent où créatures et projectiles avancent au ralenti.
- **Gravité** : pose un champ de pesanteur orienté dans le sens du lancer (l'eau, le sable, les créatures et les caisses y tombent de ce côté) ; Puissance l'alourdit, Inverser donne l'apesanteur. Sur soi : marcher sur le mur ou le plafond visé, voler en visant le vide, devenir une enclume avec Puissance.
- **Essences** (14) : Feu, Eau, Terre, Vent au départ ; Vie, Lumière, Foudre, Gravité, Temps, Espace, Esprit, Transmutation, Contre-sort et Métamorphose se découvrent. Chacune a sa nature propre ; ce qui en découle n'est pas une essence mais un **aspect** du second anneau :
  - Feu : Chaleur (flamme blanche puis bleue), Fumée, Explosion · Eau : Pression, Gel (le froid), Courant · Terre : Densité, Minerai (le métal), Séisme · Vent : Tourbillon, Son.
  - Vie : Floraison · Lumière : Focale ; inversée, elle devient l'ombre · Foudre : Tension · Gravité : Masse, Attraction, Répulsion, Fil.
  - Temps : la bulle de temps accéléré, Rembobiner, Figer · Espace : Portail, Saut, Marque · Esprit : contrôle, Sommeil, Peur · Transmutation : Corrosion (l'acide).
  - Un aspect se découvre par l'usage de son essence et par les découvertes ; doublé (Adepte), il se renforce.
  - Plusieurs aspects d'une même essence s'additionnent (Feu + Fumée + Explosion). Esprit + **Lecture** révèle ce qu'une créature aime et craint ; Lumière + **Révélation** fait luire à travers la roche coffres, pages et ingrédients.
- **Nouveaux glyphes de sort** : trajectoires Zigzag (angles vifs) et Cloche (retombe sur le point visé, même derrière un mur) ; modificateurs Perçant (traverse les créatures en éclatant sur chacune) et Gerbe (le sort se brise en cinq éclats) ; déclencheur Proximité (éclate quand une créature approche ; posé, c'est une mine) ; formes Vague (roule au sol et emporte tout) et Colonne (un jet vertical qui soulève : geyser, pilier de feu...).
- **Magie sculptée** :
  - **Dimensions** : sur un sceau moyen ou grand, chaque forme se règle à la table (×¼ à ×6) : largeur et hauteur du Mur et de la Colonne, longueur et épaisseur du Trait, rayon de la Zone, de l'Aura et du Totem, hauteur et distance de la Vague, largeur de la Pluie, taille du Bouclier. Le coût suit la surface. Un Mur large ×6 et haut ×¼ se couche : c'est un pont.
  - **Matière** : l'effet se fait matière solide. Eau + Gel + Matière en projectile, ce sont des lames de glace qui blessent même ce qui ne craint pas le froid ; en Mur, un mur ou un pont de glace ; en Trait, une poutre de glace ; en Pluie, la grêle. Terre donne la pierre, Feu la lave, Lumière le cristal, Vie le bois, Transmutation le verre...
  - **Rafale** : le sort repart en volée de trois (cinq sur un grand sceau). Avec Double et Matière, une volée de lames.
  - **Champs sculptés** : la Gravité et le Temps épousent la forme. Une Colonne de Gravité écrase tout ce qui s'y tient (inversée, tout y monte) ; une Colonne de Temps figé suspend le sable et les créatures ; un Mur de temps ralenti fait traverser les projectiles au ralenti.
- **Filtres** : Eau, Feu, Pierre, Terre, Bois, Métal, Glace, Créature, Liquide, Objet. **Cibles** : Souris, Créature proche, Marque, Objet proche (brasier, lampe, levier, caisse...).
- **Apprivoiser** : chaque créature se gagne par affinité (l'élément qu'elle aime, les soins, le calme) ; la blesser la fait reculer. Les petites bêtes en quelques gestes, le golem en plusieurs jours (20 % au plus par jour).
- **Fusion** : deux effets dans un sceau font naître un phénomène (voir plus bas, « Fusions »).
- **Sous-sceaux** : un emplacement de modificateur peut contenir un sceau consigné entier, lancé là où le premier éclate (deux niveaux).
- **Formes** : Projectile, Sur soi, puis Zone, Trait, Aura, Mur, Totem, Chaîne, Pluie, Sur objet, Bouclier, Prise, Invocation.
- **Modificateurs** : Puissance, Portée, Durée, Taille, Rebond, Persistance, Vitesse, Double, Inverser, Écho, Téléguidé, Orbite, Canalisé, Boomerang, Spirale, Rase-sol, et les onze glyphes de langage. Un à cinq emplacements selon la taille.
- **Déclencheurs** : Immédiat, Au contact, Retardé.
- Chaque glyphe coûte de l'encre. L'expérience de découverte augmente l'encre et sa régénération.
- **Langages des éléments** : à force d'employer un élément, on en apprend la grammaire (Initié, Adepte, Maître). Chaque langage donne un glyphe qu'on peut doubler une fois Adepte : Chaleur (flamme blanche, puis bleue qui fond la pierre et le métal), Pression (jet qui creuse, lame d'eau), Givre (gel profond, zéro absolu), Densité (pierre, cristal), Tourbillon (soulève, tornade), Tension (arcs vers 3 puis 6 cibles), Floraison (arbre qui jaillit), Focale, Ténèbres, Mordant, Masse. Maître : sceaux 20 % moins chers.
- **Trajectoires** : Boomerang (traverse, éclate, revient dans la main), Spirale, Rase-sol (épouse le terrain).
- **Métamorphose** : un golem en grenouille, une caisse en rocher ; sur soi, une forme animale choisie par le glyphe fusionné (eau : grenouille, vent : chauve-souris, vie : lapin, terre : golem). **Rembobinage** : le monde garde six secondes de mémoire ; la matière revient, les créatures reculent et se relèvent, on revient sur ses pas.
- **Prise** : saisir de la matière (l'eau d'un lac, du sable, des créatures), la promener, puis la lancer d'un geste sur un golem.
- **Encres spéciales** : sept ingrédients ne se trouvent qu'en creusant (X) dans leur région (cœur de braise au volcan, nacre au fond du lac, ambre en forêt, givre bleu en montagne, poudre d'or aux ruines, sable chantant au désert, pollen à la clairière). Brassées au chaudron, elles donnent huit gouttes ; on choisit l'encre d'un sceau à la table, une goutte par lancer.

## Familiers

La forme **Invocation** fait naître le familier de l'essence posée au centre du sceau. Chacun est dessiné à l'encre et porte au-dessus de la tête un petit sceau qui dit qu'il est à toi. Il te suit à sa place, défend tout ce qui approche à 300 px autour de toi, et a son don :

| Essence | Familier | Ce qu'il fait |
|---|---|---|
| Feu | Salamandre de braise | Court au sol, crache un jet de flammes, nage dans la lave, chasse le grand froid. |
| Eau | Ondine | Lance des jets d'eau, éteint les flammes autour de toi, te soigne doucement, file dans l'eau. |
| Terre | Petit golem | Se place entre toi et le danger, retient les créatures, les assomme d'un coup de poing. |
| Vent | Sylphe | Hirondelle de vent : fend tes ennemis en les repoussant, chasse la fumée. |
| Vie | Pousse | L'herbe pousse sous ses pas ; elle te soigne et entrave tes ennemis dans des racines. |
| Lumière | Luciole | Éclaire loin, éblouit les créatures d'un éclair. |
| Foudre | Oiseau-tonnerre | Foudroie sa cible, l'arc saute sur une seconde créature. |
| Gravité | Petite lune | Tourne autour de toi, soulève une créature puis la laisse retomber. |
| Temps | Chouette du temps | Enferme tes ennemis dans une bulle de temps lent ; ton encre revient plus vite. |
| Espace | Renard des failles | Saute de faille en faille jusqu'à sa proie, la mord, parfois l'envoie ailleurs. |
| Esprit | Chat d'ombre | Endort les créatures qu'il frôle. |
| Transmutation | Ouroboros | Roule comme un anneau ; sous sa proie, la terre devient boue, la pierre sable. |
| Contre-sort | Pie grise | Étourdit, chipe parfois un trésor, défait la brûlure et la lenteur qui t'accablent. |
| Métamorphose | Chenille | Chenille, puis cocon, puis papillon qui change tes ennemis en petites bêtes. |

- Les modificateurs comptent : Double invoque deux familiers, Puissance les rend plus robustes, Durée les fait rester plus longtemps, Taille les fait plus grands. Un aspect change leur coup : l'Ondine de l'Eau avec Gel gèle ce qu'elle touche.
- Avec une fusion, le familier porte le phénomène, et il se tient alors plus loin de toi pour ne pas te brûler.
- Les familiers ne craignent pas tes sorts ni ceux des autres familiers. Seules les créatures hostiles les blessent, au contact. On en garde six au plus à la fois.
- Le bestiaire du grimoire les révèle à la première invocation, et un bouton pose le sceau d'invocation sur la table.
- **Ordres** : <kbd>V</kbd> « reste ici » (ils gardent l'endroit, marqué d'un fanion) ou « suis-moi » ; <kbd>B</kbd> « attaque » la créature sous la souris ; <kbd>N</kbd> les congédie.
- Les familiers, comme les phénomènes en cours, sont gardés dans la sauvegarde du monde.

## Gribouille et Grum

Deux compagnons suivent l'apprenti(e) dehors, dessinés à l'encre d'après leur planche de design :

- **Gribouille**, mage d'encre théâtral et génie autoproclamé, sous un grand chapeau magenta rapiécé (étiquette « G »), un seul grand œil au milieu du visage.
  - Quand une bête hostile approche, il lance ses propres petits sorts : souvent réussis, parfois des **gaffes** (le sort lui éclate au nez et il tombe à la renverse, une bouffée de fumée sort du chapeau, ou il lance... des fleurs), rarement **géniaux**.
  - Ses sorts ne touchent que les bêtes : ils n'abîment pas le monde, ne blessent jamais l'apprenti(e) et ne réveillent pas un gardien endormi.
  - Quand ça tourne mal (un gardien éveillé, ou l'apprenti(e) presque à bout de forces), il devient rarement **Giga Gribouille** : un colosse d'encre violette qui frappe deux fois le sol, puis s'endort épuisé.
  - Il lévite pour suivre l'apprenti(e) qui vole, lit son grimoire quand on ne fait rien.
- **Grum**, golem de pierre simple, loyal et gourmand, coiffé de mousse, yeux dorés, une rune sur la pierre de devant.
  - Il protège : une bête hostile s'approche, il fonce et la frappe.
  - Il aide à creuser : quand l'apprenti(e) creuse (X), il manie la pioche à côté, et ça va deux fois plus vite.
  - Ses yeux éclairent la nuit.
- **Le gâteau au miel** (chaudron : miel + rosée, remuer puis chauffer) : offert à Grum, il le mange et devient heureux et deux fois plus fort pendant deux minutes. Sans Grum, il soigne un peu.
- **Expressions et bulles** : curieux, surpris, inquiet, agacé, gêné, triomphant, endormi..., et des bulles (!, ?, …, gâteau, zzz, colère, cœur) selon ce qui se passe. Sans rien faire un moment, ils lisent, puis s'endorment.
- On ne peut pas les blesser ; trop loin ou coincés, ils reviennent d'un pouf d'encre.
- **Tenues**, gagnées en jouant et choisies au miroir du labo :

| Gribouille | Comment l'obtenir | Grum | Comment l'obtenir |
|---|---|---|---|
| Arcaniste | découvrir 10 fusions | Runique | éveiller deux stèles de fusion |
| Alchimiste | connaître 8 recettes du chaudron | Forgeron | ouvrir cinq coffres |
| Explorateur | retrouver 6 pages déchirées | Forestier | apprivoiser cinq créatures |
| Céruléen (rare) | vaincre les quatre gardiens | Cristallin (rare) | découvrir les huit fusions à trois |

- Le miroir et les réglages permettent aussi de les laisser au labo.

## Fusions : quand deux essences s'allient

Deux effets dans un même sceau (le second sous le cercle, sur un sceau moyen ou grand) peuvent fusionner. Une fusion connue fait naître un **phénomène** : il dure, il a sa propre physique, il agit sur le monde, et il **remplace** les deux effets de base. Un aspect compte comme son effet : Eau + Gel, c'est le froid ; Gravité + Attraction, c'est la force.

- **Toutes les paires des dix essences physiques** (Feu, Eau, Terre, Vent, Vie, Lumière, Foudre, Gravité, Temps, Transmutation), soit 45 phénomènes. Quelques exemples :
  - Feu + Gravité, **Petit soleil** : une combustion tenue par la pesanteur. L'étoile flotte, attire, chauffe tout autour, éclaire la nuit et grossit en avalant ce qui brûle. L'eau l'affaiblit, le vent la déplace.
  - **Geyser**, **Magma**, **Tornade de feu**, **Rayon ardent**, **Foudre en boule**, **Forge**.
  - **Nuée**, **Orage**, **Sphère d'eau**, **Arc-en-ciel** (on marche dessus), **Érosion**, **Liquéfaction**.
  - **Météore**, **Géode**, **Fulgurite**, **Racines**, **Pétrification**, **Golem de glaise**.
  - **Cyclone**, **Tempête de sable**, **Air solide**, **Lucioles**, **Trou noir**, **Horizon**, **Aube**, **Miroir**, **Aimant**, **Électrolyse**, **Origine**...
- **Seize fusions avec les aspects** : Blizzard, Comète de glace, Choc thermique, Cryostase, Bobine, Métal rougi, Fumée toxique, Pluie acide, Tonnerre, Implosion, Écran de fumée, Éboulement, Fil électrique, Banquise, Raz-de-marée, Singularité.
- **Quatre familles** qui s'allient à n'importe quel effet :
  - **Faille** (Espace) : une faille qui crache l'élément.
  - **Élémentaire** (Esprit) : un esprit de l'élément qui chasse tes ennemis.
  - **Absorption** (Contre-sort) : avale cette matière et rend un peu d'encre.
  - **Chimère** (Métamorphose) : la créature porte l'élément partout. Sur soi, tu en prends la nature.
- **La forme du sceau compte.** En projectile, le phénomène file et naît à l'impact. En zone, il est posé. En mur ou en colonne, il en prend le rectangle : une colonne de geyser, un rideau d'orage, une tour de cyclone. En trait, il suit la ligne : un rayon ardent, un fil électrique, un pont de racines ou d'air solide. Sur soi, en aura, sur un objet ou un familier, il suit son porteur.
- **À découvrir** : le grimoire (onglet Fusions) montre « ??? » et un indice. Le phénomène se révèle la première fois qu'on le lance, et rapporte de l'expérience. Une fusion connue se recopie sur la table des sceaux d'un clic (« Copier sur la table »), et l'éditeur en montre l'aperçu animé.
- **Fusions à trois** : le grand sceau a une troisième case d'effet. Huit trios ont leur propre phénomène :
  - **Étoile** (Feu, Gravité, Temps) : un soleil plus grand qui dure longtemps, puis finit en nova.
  - **Ouragan** (Eau, Foudre, Vent) : un orage qui marche, foudroie, aspire et soulève.
  - **Volcan** (Feu, Gravité, Terre) : un cône de pierre qui crache la lave.
  - **Jardin suspendu** (Eau, Gravité, Vie) : une île flotte, avec son arbre et sa source, puis finit par retomber.
  - **Pulsar** (Foudre, Gravité, Lumière) : une étoile qui tourne et balaie le monde de deux rayons foudroyants.
  - **Canyon** (Eau, Temps, Terre) : un ravin s'ouvre sous le point visé, et une rivière y coule.
  - **Trou blanc** (Gravité, Lumière, Temps) : il repousse tout et recrache la matière.
  - **Printemps éternel** (Lumière, Temps, Vie) : longtemps, tout pousse alentour (herbe, fleurs qui luisent, arbres) et les blessures guérissent.
- Chaque phénomène a sa **nappe sonore**, qui s'éloigne et se place à gauche ou à droite avec lui.

## Physique

- **Chaleur** : chaque case a une température.
  - Le feu et la lave chauffent ce qui les entoure, selon la matière : le métal conduit, le bois isole. L'air chaud monte, l'air froid descend.
  - La glace fond près d'une pierre brûlante, l'eau bout sur une plaque de métal chauffée, le bois s'embrase à distance d'une grande chaleur. La lave refroidie par le gel devient obsidienne, le sable très chaud devient verre.
  - Les sorts de Feu chauffent, ceux de Gel refroidissent. Les solides chauffés luisent au rouge, le froid laisse du givre.
  - Les créatures et l'apprenti(e) brûlent près d'une forte chaleur et s'engourdissent dans le grand froid.
- **Effondrement** : ce qui ne tient plus à rien tombe d'un bloc.
  - Creuser sous une dalle, faire sauter les piliers d'une arche ou couper un arbre au pied les fait tomber.
  - Le bloc écrase ce qui est dessous et s'émiette à l'impact. La glace et le bois flottent sur l'eau, la pierre coule.
  - Les îles volantes tiennent par magie.
- **Masse et flottaison** :
  - Chaque chose a une masse : le vent pousse un lapin bien plus loin qu'un golem.
  - La caisse flotte, le rocher coule, le golem marche au fond du lac.
  - Une créature projetée contre un mur ou qui tombe de haut se blesse. Un rocher qui tombe blesse ce qu'il touche. Une chute de très haut fait mal.
- **Basculement** : un bloc haut et étroit qui perd son pied bascule et se couche, au lieu de tomber droit.
- **Vent** : l'air a sa vitesse, qui garde son élan puis s'apaise.
  - Les sorts de Vent et de Son soufflent, les explosions repoussent l'air, la Force l'aspire.
  - La fumée, la vapeur, les gaz et les flammes suivent le vent ; le sable fin et la neige s'envolent ; les créatures légères, les projectiles et les phénomènes dérivent. Dehors, une brise suit la météo.
  - Le vent se voit en traits d'encre.
- **Nouvelle matière** : le gaz de l'Électrolyse, léger, explose à la moindre flamme.

## Dehors

Onze espèces peuplent le monde (limaces d'encre, feux follets, golems, grenouilles, corbeaux, salamandres, poissons d'argent, chauves-souris, escargots de cristal, tortues des sables, lapins de neige), avec habitats, rythme jour/nuit, goûts et craintes à découvrir ; une créature apprivoisée suit et offre des cadeaux.

Treize pages déchirées du grimoire du maître sont cachées aux endroits difficiles (îles, fond du lac, sommet, volcan, grottes, fond du monde) : chacune apprend une recette ou un glyphe. Quinze défis facultatifs rapportent de l'expérience.

Nouvelles matières : poudre explosive, mousse sur la pierre humide, miel des ruches (à enfumer), sel des salines (saumure qui ne gèle pas, fait fondre la glace), boue. La carte du grimoire se dévoile en explorant ; la musique change selon le lieu et l'heure.

**Énigmes** : leviers, plaques de pression, brasiers, roue à aubes, moulin à vent, lampe d'éclair, grilles et coffres scellés, reliés par des circuits (des fils d'encre visibles de près). Sept coffres à ouvrir : le levier du jardin, la plaque de la forêt, la roue à sec au bord du lac, les deux brasiers du volcan, la combinaison de la clairière, la lampe et la plaque des ruines, la cave du désert sous la trappe du moulin.

**Énigmes de fusion** : quatre stèles gravées d'essences dorment dans le monde. Chacune s'éveille quand la fusion qu'elle porte naît près d'elle, et ouvre son coffre ; <kbd>E</kbd> devant une stèle dit ce qu'elle attend.
- au jardin, la **stèle de la source** : la Source vive (Eau + Vie) ;
- au sommet de la montagne, la **stèle du passeur** : un pont né de rien (Arc-en-ciel, Air solide ou Racines) ;
- au volcan, le **cœur du volcan** : la fusion à trois du Volcan, au grand sceau ;
- dans les ruines, le **carillon de verre**, qu'un Tonnerre ou un Choc thermique brise.

**Leçons du maître** : l'onglet Défis du grimoire propose de petits essais guidés (le premier sceau, changer de forme, les aspects, faire naître un phénomène, tenir un sort, parler aux familiers, les stèles, les gardiens...). Elles paraissent avec ce que tu débloques et rapportent de l'expérience.

**Monde vivant** : quatre saisons de deux jours chacune (teintes, neige et lacs gelés l'hiver, feuilles d'automne, fonte au printemps), l'herbe et les arbres brûlés repoussent hors de vue, deux bêtes de la même espèce font des petits qui grandissent.

## Gardiens

Chaque région a son gardien. Aucun ne tombe sous la seule force : chacun a son tour à trouver. Ils dorment tant que tu n'as pas le niveau (de 3 à 6), sauf si tu les provoques. Leurs attaques s'annoncent (racines qui craquent, sabot qui gratte, ligne de visée) pour qu'on puisse les esquiver. Une barre de vie s'affiche pendant le combat.

| Gardien | Région | Son tour |
|---|---|---|
| L'Ent-ronce | La Prairie | Le feu le blesse et le fait brûler ; l'eau et la vie le soignent. Il fait jaillir ses racines sous tes pieds et lance des graines épineuses. |
| Le Grand Cerf | Les Collines | Rien ne l'entame quand il court. Dresse un mur sur sa route : il s'y assomme, et c'est le moment de frapper. |
| Le Golem de magma | La Plaine de cendres | Le feu le nourrit, la lave le soigne. L'eau et le froid figent sa croûte : il ralentit et se brise. Il lance des boulets de lave et frappe le sol. |
| L'Automate des ruines | Le Marais | Coque épaisse : la foudre glisse dessus, sauf s'il est trempé (court-circuit). L'acide le ronge. Son œil vise, puis tire un rayon. |

On ne dompte, n'endort, ne possède ni ne métamorphose un gardien. Vaincu, il laisse des présents rares, et ne revient pas. Le bestiaire du grimoire garde ce que tu as appris d'eux.

**Personnage** : redessiné et animé (marche, saut, bras qui trace le sort), personnalisable : teint, coiffure, cheveux, chapeau et sa couleur, cape, robe, écharpe, objet à la main.

Un seul grand monde, 1 800 cases de large : jardin, prairie, forêt, rivière, lac, collines, montagne enneigée, gorge (et son pont de bois), volcan, plaine de cendres, clairière, marais, ruines de métal, dunes, désert ; des îles volantes dans le ciel ; des grottes à cristaux, un lac souterrain, une poche d'acide et une nappe d'huile sous terre. Le monde est une grille de matières : on creuse, on inonde, on gèle, on brûle, et le tout persiste.

Contrôles : flèches ou ZQSD, Espace pour sauter (maintenir pour un grand saut), haut pour grimper aux plantes, E pour agir (porte, cueillir, lire, remplir une fiole, porter), clic droit pour lancer ce qu'on porte, X maintenu pour creuser vers la souris, 1 à 5 ou molette pour la barre, clic pour lancer (maintenir pour charger), clic droit et Maj + 1 à 5 pour la main gauche, F pour libérer les sorts Sur commande, V, B et N pour les ordres aux familiers, G grimoire, H aide, M son, Échap pour fermer.

**Sur écran tactile** (téléphone en paysage, tablette), des commandes apparaissent d'elles-mêmes :
- un joystick à gauche pour marcher, grimper ou descendre ;
- à droite, Sauter, E (agir), X (creuser), F (libérer), V/B/N (ordres) ;
- toucher l'écran vise et lance le sceau choisi ; garder le doigt posé charge le sort, ou garde un sort Maintenu en vie ;
- deux doigts : on marche et on lance à la fois ;
- le bouton ✋ fait passer le doigt à la main gauche ; la barre choisit alors pour elle.

Pour tout recommencer : Ctrl + Maj + R.

## Structure du code

```
index.html      page, styles, panneaux DOM
js/util.js      maths, aléatoire déterministe, dessin « encre »
js/data.js      glyphes, ingrédients, recettes, découvertes, observations
js/seal.js      modèle de sceau, icônes de glyphes, rendu du cercle
js/perso.js     dessin et personnalisation de l'apprenti(e)
js/fx.js        effets visuels : halos, flammes, traînées, ondes, éclairs
js/audio.js     sons génératifs (WebAudio)
js/sim.js       simulation de matières (grille) et rendu encre par morceaux
js/gen.js       génération du grand monde
js/familiers.js dessin des familiers (un par essence)
js/mascottes.js Gribouille et Grum : dessin à l'encre, tenues, et leur comportement de compagnons
js/combos.js    phénomènes : les fusions d'essences, leur physique et leur dessin
js/gardiens.js  gardiens des régions : comportement, projectiles, dessin, barre de vie
js/rendu.js     rendu du monde : ciel, nuit, objets, créatures, joueur, sorts
js/creatures.js bêtes du monde et familiers : mise à jour, ordres, affinité
js/sorts.js     sorts : lancer, voler, éclater, saisir (Prise), boucliers, marques, enchaînements
js/effets.js    effets des essences sur la matière, les créatures et soi ; Temps, Métamorphose, Rembobinage
js/world.js     monde extérieur : état, joueur, mouvements, mécanismes, météo, sauvegarde du monde
js/lab.js       scène du labo
js/ui.js        éditeur de sceaux, chaudron, grimoire, HUD
js/main.js      boucle, états, progression, expérience, sauvegarde
docs/DESIGN.md  décisions de design et étapes à venir
build.sh        fabrique dist/atelier-des-sceaux.html
tests/          bancs d'essai (node tests/lancer.js) et outils : hasard, perf, endurance, traversée, tactile
outils/         extraire.js : sort un lot de fonctions de world.js vers un module
.github/        les tests tournent sur GitHub à chaque envoi
```

Les modules extraits de `world.js` (phénomènes, gardiens, rendu, créatures, sorts, effets) sont des fabriques `creerX(W)` : le monde leur passe un contexte de getters vers son état et ses fonctions (et de setters pour les rares variables qu'ils réaffectent), et garde des relais pour les appels qui restent chez lui. `outils/extraire.js` fait ce découpage par analyse du code (acorn) :

- `node outils/extraire.js --essai f1 f2 ...` dit ce qu'un lot emprunte au monde, ce qu'il réaffecte et quels relais il faudrait, sans rien écrire ;
- `node outils/extraire.js --module js/x.js --fabrique creerX --alias XX --titre "..." f1 f2 ... -- var1` écrit le module et met world.js à jour. Les variables après `--` partent avec le lot. Il reste à ajouter la balise `<script>` avant `world.js` et à lancer les tests.

Tests : `node tests/lancer.js` lance tous les bancs dans un Chromium sans écran (Playwright) : glyphes, physique, fusions (les 69 fusions lancées dans plusieurs formes), fusions à trois, Maintenu, familiers, compagnons, cercles (position, équilibre, deux temps, taille qui s'ajuste, tracé), vent, énigmes, gardiens, sauvegarde, sons, lisibilité. `node tests/lancer.js gardiens enigmes` n'en lance que certains. `node tests/outils/tactile.js` vérifie les commandes tactiles sur un téléphone simulé, `node tests/outils/table.js` la table des sceaux avec de vrais gestes (souris, clavier, doigt).

Le jeu lui-même n'a aucune dépendance ; `package.json` ne sert qu'aux tests et aux outils (`npm ci`, puis `npm test`). Sur GitHub, le workflow `.github/workflows/tests.yml` lance, à chaque pull request et à chaque envoi sur `main` :
- les bancs d'essai ;
- les commandes tactiles ;
- la table des sceaux (glisser-déposer, annuler) ;
- 300 sceaux au hasard ;
- une vérification que `dist/atelier-des-sceaux.html` correspond bien au code (sinon : `./build.sh` et commiter).

En cas d'échec, il garde les captures des tests.
