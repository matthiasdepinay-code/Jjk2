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
| Chaudron | Jusqu'à trois ingrédients et trois étapes dans l'ordre. Les fioles de liquide puisées dehors sont des ingrédients et se lancent depuis la barre. |
| Grimoire | Découvertes, glyphes, recettes, ingrédients, intuitions (phénomènes observés), journal. |
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
