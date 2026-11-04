# L'Atelier des Sceaux — document de design

Décisions prises avec l'auteur (novembre 2026). Ce document fait foi pour les étapes suivantes.

## Vision

Un vrai bac à sable de magie, style encre & parchemin, ambiance cosy. On compose des sceaux en emboîtant des glyphes préfabriqués, on brasse des potions, et on sort dans un grand monde où **tout réagit** : les matières sont simulées cellule par cellule (eau, huile, acide, lave, glace, neige, feu, vapeur, bois, plantes, sable, verre, métal, cristal…). L'envie de découvrir vient du monde lui-même : on apprend les glyphes en observant des phénomènes, on trouve des pages déchirées, on relève des défis du maître, et le grimoire montre les cases vides.

## Décisions

| Sujet | Choix |
| --- | --- |
| Techno | Web HTML5/Canvas, sans dépendance, FR, clavier+souris, sauvegarde locale. |
| DA | Encre & parchemin ; les matières simulées sont rendues en formes lissées hachurées, pas en pixels visibles. Les sceaux/effets portent la couleur de leur élément. |
| Monde | Un seul grand monde dessiné à la main, large et haut : ciel (îles volantes), surface (jardin, forêt, lac, montagne enneigée, volcan, clairière, ruines), souterrains (grottes à cristaux, lac souterrain, poche d'acide, nappes d'huile). Le monde modifié persiste ; « Restaurer le monde » au labo. |
| Simulation | Grille de matières façon « falling sand », réactions émergentes (feu+eau=vapeur, froid+eau=glace, foudre conduit dans l'eau, acide creuse, lave+eau=obsidienne, lave+sable=verre, huile flotte et brûle…). |
| Sceaux | Cercle à couches (effet / forme / modificateurs / déclencheur). Étape 2 : **Fusion** (deux effets) et **Sous-sceau** (un emplacement contient un sceau, profondeur 2). |
| Glyphes | 8 actuels + Froid, Foudre, Acide, Gravité (étape 1), puis Temps, Transmutation, Son, Esprit, Lien, Portail, Métal (étape 2). Sur soi, chacun est un pouvoir de déplacement (Gravité = vol libre, Vent = planer, Eau = respirer, Force = murs, Ombre = passer les grilles, Froid = glisser). |
| Formes à venir | Aura, Mur, Totem, Chaîne, Pluie, Sur objet, Invocation. Modificateurs à venir : Inverser, Écho, Téléguidé, Orbite, Canalisé. |
| Apprentissage | Par observation (2-3 phénomènes vus → le glyphe se dessine), pages déchirées cachées, défis du maître. |
| Encre | Conservée, généreuse ; augmente avec l'expérience de découverte et des potions permanentes. |
| Chaudron | Brassage sensoriel : couleur, odeur, bruit indiquent qu'on approche d'une recette ; les ratés donnent des potions bizarres utilisables. |
| Créatures | Écosystème cosy, beaucoup d'espèces, faiblesses et goûts à découvrir, pas de mort. |
| Mains | Fioles à remplir dans n'importe quel liquide, porter/jeter des objets, cueillir et creuser à la main. |
| Météo | Jour/nuit, pluie, orages dont la foudre frappe (phénomènes à observer, provocables par sort). |
| Labo | Grandit : alambic, presse à glyphes, terrarium, bac d'essai. |

## Étapes

1. **Moteur de matières** + grand monde + météo + fioles/portage/creusage + Froid/Foudre/Acide/Gravité + observation minimale. *(fait)*
2. Nouveaux glyphes, Fusion, Sous-sceaux, nouvelles formes et modificateurs. *(fait)*
3. Apprentissage complet : observations, pages déchirées, défis du maître, encyclopédie des réactions. *(fait)*
4. Brassage sensoriel, potions bizarres, nouvelles potions. *(fait)*
5. Écosystème de créatures. *(fait)*
6. Labo qui grandit : bac d'essai, alambic, presse à glyphes, terrarium. *(fait)*

## Deuxième vague (décisions de l'auteur)

| Sujet | Choix |
| --- | --- |
| Gravité | Le glyphe manipule la pesanteur ; le vol n'en est qu'une conséquence. Champ orienté dans le sens du lancer (toutes directions), auquel obéissent matières, créatures, objets et projectiles. Puissance : écrasante. Inverser : apesanteur. Sur soi : vers la surface visée (murs, plafond), vide visé = vol, Puissance = enclume, Inverser = chute vers le ciel. |
| Lettres du maître | Commandes apportées par un corbeau : potions, matières et ingrédients, exploits racontés, sceaux à inventer (évalués sur ce qu'ils font). Récompenses : ingrédients rares, encre maximale permanente, trophées. |
| Geste | Le sceau se trace 0,2 s avant de partir. |
| Matières | Poudre explosive, mousse et miel, sel (saumure) et boue. |
| Visée | Pointillés courts sur l'arc des projectiles. |
| Carte | Dans le grimoire, se dévoile en explorant. |
| Confort | Options de simulation (feu, pluie, encre, texte, volumes) ; musique par zone et par heure. |

## Troisième vague : sorts et glyphes (décisions de l'auteur)

| Sujet | Choix |
| --- | --- |
| Tailles de sceau | Petit (centre, forme, 1 modificateur, déclencheur ; moitié prix, geste quasi instantané), moyen (l'actuel), grand (5 modificateurs, 2 déclencheurs, geste de 0,5 s ; se débloque). |
| Déclencheurs | Sur commande (touche F fait éclater tous les sorts en attente), Répétition (toutes les N s), Retardé à durée réglable (1, 2, 5, 10 s), À l'expiration (un dernier effet quand l'effet s'éteint). |
| Filtres de matière | Petits glyphes posés à côté du déclencheur : le sort au contact ne réagit qu'à la matière choisie et traverse le reste. |
| Ciblage | Couche « cible » : Souris (défaut), Créature la plus proche, Marque. Glyphe Marque : pose jusqu'à 3 repères ; les sorts ciblés Marque visent le plus récent, même hors de vue. |
| Charge | Maintenir le clic charge le sort (jusqu'à 1,5 s) : plus puissant, plus loin, plus cher. |
| Deux mains | Clic gauche = main droite (1-5), clic droit = main gauche (Maj + 1-5). Le clic droit lance d'abord ce qu'on porte. |
| Enchaînements | Combos d'éléments nommés quand un second sort éclate dans la seconde et près du premier. |
| Interactions | Collisions entre projectiles = fusion forcée au point de rencontre. Forme Bouclier élémentaire (arc orienté vers la souris). Glyphe Contre-sort qui dissipe champs, pièges, totems, portails. |
| Déblocage | Par la progression habituelle (découvertes, niveaux), avec indices. |
| Éditeur | Aperçu animé de l'effet et fiche lisible du sceau. |

## Quatrième vague : buts, monde vivant, langages (décisions de l'auteur)

| Sujet | Choix |
| --- | --- |
| Buts du bac à sable | Leviers, grilles, moulins, mécanismes et énigmes, avec des coffres à la clé. |
| Monde vivant | Saisons, repousse, naissances. |
| Effets | De beaux effets visuels ; des gestes de gravité spectaculaires (prendre l'eau d'un lac et la lancer sur un golem : forme Prise). |
| Maîtrise | Par l'usage, langage par langage : maîtriser le feu donne le glyphe Chaleur, qui blanchit puis bleuit la flamme. Pas de saut direct. |
| Encres | Encres spéciales tirées d'ingrédients propres à une région. |
| Trajectoires | Boomerang, spirale, rase-sol. |
| Nouveaux glyphes | Métamorphose et Rembobinage. |
| Personnage | Plus beau, animé, personnalisable. |
| Plus tard | Runes posées de façon permanente ; partage de sceaux (on reste en local pour l'instant). |
