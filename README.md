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

- **Tailles** : petit (centre, forme, un modificateur, un déclencheur ; moitié prix, presque instantané), moyen, grand (cinq modificateurs, deux déclencheurs, tracé en 0,5 s).
- **Filtres de matière** (pointe droite) : avec Au contact, le sort ne réagit qu'à l'eau, au feu, à la pierre, à la terre, au bois, au métal, à la glace ou aux créatures, et traverse tout le reste.
- **Cibles** (pointe gauche) : souris, créature hostile la plus proche (le sort la suit), ou marque la plus récente posée par le glyphe Marque, même hors de vue.
- **Déclencheurs** : Immédiat, Au contact, Retardé (1, 2, 5 ou 10 s), Sur commande (la touche F libère tous les sorts en attente), Répétition (toutes les 1, 2 ou 5 s), À l'expiration (dernier éclat quand l'effet s'éteint).
- **Lancer** : maintenir le clic charge le sort (plus puissant, plus loin, plus cher) ; la main gauche lance un second sceau au clic droit (Maj + 1-5) ; dix enchaînements nommés quand un second sort éclate près du premier dans la seconde ; deux projectiles qui se croisent fusionnent.
- **Bouclier** : arc élémentaire tourné vers la souris, qui repousse créatures, eau et sable (bulle sèche sous l'eau). **Contre-sort** : dissipe champs, pièges, totems, sorts en attente, portails et marques.
- **Éditeur** : fiche lisible du sceau et aperçu animé de son effet.
- **Temps** : une bulle où le temps file (plantes, feu, glace, lave, cendre, métal, petits, effets en cours, sorts posés vieillissent à toute allure) ; inversé, une bulle de temps lent où créatures et projectiles avancent au ralenti.
- **Gravité** : pose un champ de pesanteur orienté dans le sens du lancer (l'eau, le sable, les créatures et les caisses y tombent de ce côté) ; Puissance l'alourdit, Inverser donne l'apesanteur. Sur soi : marcher sur le mur ou le plafond visé, voler en visant le vide, devenir une enclume avec Puissance.
- **Essences** (14) : Feu, Eau, Terre, Vent au départ ; Vie, Lumière, Foudre, Gravité, Temps, Espace, Esprit, Transmutation, Contre-sort et Métamorphose se découvrent. Chacune a sa nature propre ; ce qui en découle n'est pas une essence mais un **aspect** du second anneau :
  - Feu : Chaleur (flamme blanche puis bleue), Fumée, Explosion · Eau : Pression, Gel (le froid), Courant · Terre : Densité, Minerai (le métal), Séisme · Vent : Tourbillon, Son.
  - Vie : Floraison · Lumière : Focale ; inversée, elle devient l'ombre · Foudre : Tension · Gravité : Masse, Attraction, Répulsion, Fil.
  - Temps : la bulle de temps accéléré, Rembobiner, Figer · Espace : Portail, Saut, Marque · Esprit : contrôle, Sommeil, Peur · Transmutation : Corrosion (l'acide).
  - Un aspect se découvre par l'usage de son essence et par les découvertes ; doublé (Adepte), il se renforce.
- **Apprivoiser** : chaque créature se gagne par affinité (l'élément qu'elle aime, les soins, le calme) ; la blesser la fait reculer. Les petites bêtes en quelques gestes, le golem en plusieurs jours (20 % au plus par jour).
- **Fusion** : deux glyphes d'effet dans un sceau, avec des combos nommés (tornade de feu, banquise, lave, orage, blizzard...).
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

## Dehors

Onze espèces peuplent le monde (limaces d'encre, feux follets, golems, grenouilles, corbeaux, salamandres, poissons d'argent, chauves-souris, escargots de cristal, tortues des sables, lapins de neige), avec habitats, rythme jour/nuit, goûts et craintes à découvrir ; une créature apprivoisée suit et offre des cadeaux.

Treize pages déchirées du grimoire du maître sont cachées aux endroits difficiles (îles, fond du lac, sommet, volcan, grottes, fond du monde) : chacune apprend une recette ou un glyphe. Quinze défis facultatifs rapportent de l'expérience.

Nouvelles matières : poudre explosive, mousse sur la pierre humide, miel des ruches (à enfumer), sel des salines (saumure qui ne gèle pas, fait fondre la glace), boue. La carte du grimoire se dévoile en explorant ; la musique change selon le lieu et l'heure.

**Énigmes** : leviers, plaques de pression, brasiers, roue à aubes, moulin à vent, lampe d'éclair, grilles et coffres scellés, reliés par des circuits (des fils d'encre visibles de près). Sept coffres à ouvrir : le levier du jardin, la plaque de la forêt, la roue à sec au bord du lac, les deux brasiers du volcan, la combinaison de la clairière, la lampe et la plaque des ruines, la cave du désert sous la trappe du moulin.

**Monde vivant** : quatre saisons de deux jours chacune (teintes, neige et lacs gelés l'hiver, feuilles d'automne, fonte au printemps), l'herbe et les arbres brûlés repoussent hors de vue, deux bêtes de la même espèce font des petits qui grandissent.

**Personnage** : redessiné et animé (marche, saut, bras qui trace le sort), personnalisable : teint, coiffure, cheveux, chapeau et sa couleur, cape, robe, écharpe, objet à la main.

Un seul grand monde, 1 800 cases de large : jardin, prairie, forêt, rivière, lac, collines, montagne enneigée, gorge (et son pont de bois), volcan, plaine de cendres, clairière, marais, ruines de métal, dunes, désert ; des îles volantes dans le ciel ; des grottes à cristaux, un lac souterrain, une poche d'acide et une nappe d'huile sous terre. Le monde est une grille de matières : on creuse, on inonde, on gèle, on brûle, et le tout persiste.

Contrôles : flèches ou ZQSD, Espace pour sauter (maintenir pour un grand saut), haut pour grimper aux plantes, E pour agir (porte, cueillir, lire, remplir une fiole, porter), clic droit pour lancer ce qu'on porte, X maintenu pour creuser vers la souris, 1 à 5 ou molette pour la barre, clic pour lancer, G grimoire, H aide, M son, Échap pour fermer.

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
js/world.js     monde extérieur : entités, effets, créatures, météo, rendu
js/lab.js       scène du labo
js/ui.js        éditeur de sceaux, chaudron, grimoire, HUD
js/main.js      boucle, états, progression, expérience, sauvegarde
docs/DESIGN.md  décisions de design et étapes à venir
build.sh        fabrique dist/atelier-des-sceaux.html
```
