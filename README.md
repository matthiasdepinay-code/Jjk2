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
| Lettre du maître | L'aide, les contrôles, et « Restaurer le monde ». |
| Porte | Sortir. Revenir restaure encre et vitalité et sauvegarde le monde. |

## Les sceaux

- **Effets** (19) : Feu, Vent, Eau, Terre au départ. Lumière, Ombre, Vie, Force, Froid, Foudre, Acide, Gravité, Temps, Transmutation, Son, Esprit, Lien, Portail et Métal se découvrent (par exploits ou par observation de phénomènes).
- **Fusion** : deux glyphes d'effet dans un sceau, avec des combos nommés (tornade de feu, banquise, lave, orage, blizzard...).
- **Sous-sceaux** : un emplacement de modificateur peut contenir un sceau consigné entier, lancé là où le premier éclate (deux niveaux).
- **Formes** : Projectile, Sur soi, puis Zone, Trait, Aura, Mur, Totem, Chaîne, Pluie, Sur objet, Invocation.
- **Modificateurs** : Puissance, Portée, Durée, Taille, Rebond, Persistance, Vitesse, Double, Inverser, Écho, Téléguidé, Orbite, Canalisé. Un à trois emplacements.
- **Déclencheurs** : Immédiat, Au contact, Retardé.
- Chaque glyphe coûte de l'encre. L'expérience de découverte augmente l'encre et sa régénération.

## Dehors

Onze espèces peuplent le monde (limaces d'encre, feux follets, golems, grenouilles, corbeaux, salamandres, poissons d'argent, chauves-souris, escargots de cristal, tortues des sables, lapins de neige), avec habitats, rythme jour/nuit, goûts et craintes à découvrir ; une créature apprivoisée suit et offre des cadeaux.

Treize pages déchirées du grimoire du maître sont cachées aux endroits difficiles (îles, fond du lac, sommet, volcan, grottes, fond du monde) : chacune apprend une recette ou un glyphe. Quinze défis facultatifs rapportent de l'expérience.

Un seul grand monde : jardin, forêt, lac, montagne enneigée, volcan, clairière, ruines de métal, désert ; des îles volantes dans le ciel ; des grottes à cristaux, un lac souterrain, une poche d'acide et une nappe d'huile sous terre. Le monde est une grille de matières : on creuse, on inonde, on gèle, on brûle, et le tout persiste.

Contrôles : flèches ou ZQSD, Espace pour sauter (maintenir pour un grand saut), haut pour grimper aux plantes, E pour agir (porte, cueillir, lire, remplir une fiole, porter), clic droit pour lancer ce qu'on porte, X maintenu pour creuser vers la souris, 1 à 5 ou molette pour la barre, clic pour lancer, G grimoire, H aide, M son, Échap pour fermer.

Pour tout recommencer : Ctrl + Maj + R.

## Structure du code

```
index.html      page, styles, panneaux DOM
js/util.js      maths, aléatoire déterministe, dessin « encre »
js/data.js      glyphes, ingrédients, recettes, découvertes, observations
js/seal.js      modèle de sceau, icônes de glyphes, rendu du cercle
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
