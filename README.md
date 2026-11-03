# L'Atelier des Sceaux

Un bac à sable de magie dans l'esprit de *L'Atelier des Sorciers* : on compose des sceaux en emboîtant des glyphes préfabriqués, on brasse des potions, puis on sort tester le tout sur un terrain d'essai en side-scroller.

Tout tient dans le navigateur : pas d'installation, pas de dépendance, sauvegarde automatique locale.

## Lancer le jeu

- Ouvrir `index.html` dans un navigateur récent (Chrome, Firefox, Edge, Safari).
- Ou bien la version mono-fichier : `dist/atelier-des-sceaux.html` (régénérée par `./build.sh`).

## Direction artistique

- **Encre et parchemin** : traits de plume tremblés, hachures, grain de papier. Seuls les sceaux et les effets portent la couleur de leur élément.
- **Ambiance cosy** : nappe sonore générative douce, aucun stress, aucun vrai échec. Les ratés font de la fumée et donnent un indice.

## Le labo

| Poste | Ce qu'on y fait |
| --- | --- |
| Miroir | Changer d'apparence (chapeau, cape, objet en main). |
| Table des sceaux | Composer un sceau : **centre** = glyphe d'effet, **premier anneau** = forme, **second anneau** = modificateurs, **pointes** = déclencheur. Consigner, puis « Mettre dans la barre ». |
| Chaudron | Jusqu'à trois ingrédients et trois étapes dans l'ordre (chauffer, remuer, infuser, refroidir). Les recettes se découvrent par essai. |
| Grimoire | Découvertes, glyphes connus, recettes, ingrédients, journal. |
| Lettre du maître | L'aide et les contrôles. |
| Porte | Sortir sur le terrain d'essai. Revenir restaure encre et vitalité. |

## Les sceaux

- **Effets** : Feu, Vent, Eau, Terre au départ. Lumière, Ombre, Vie et Force se débloquent.
- **Formes** : Projectile, Sur soi, puis Zone et Trait.
- **Modificateurs** : Puissance, Portée, puis Durée, Taille, Rebond, Persistance, Vitesse, Double. Un seul emplacement au départ, trois à terme.
- **Déclencheurs** : Immédiat (agit en continu sur ce qu'il touche), Au contact (éclate en zone), Retardé (se fixe, éclate après deux secondes).
- Chaque glyphe coûte de l'encre. L'encre se régénère lentement dehors, entièrement au labo.

## Dehors

Cinq zones : le Jardin, la Rivière, la Falaise, la Grotte, la Clairière. Mannequins, caisses, torches, graines, buissons, rochers fissurés, glace, runes cachées, mares. Trois créatures : limaces d'encre, feux follets, golems. Tout réagit aux éléments (le feu brûle, l'eau fait pousser, le vent repousse, la lumière révèle, l'ombre endort, la vie apprivoise, la force attire).

Contrôles : flèches ou ZQSD, Espace pour sauter, haut pour grimper aux vignes, E pour interagir, 1 à 5 ou molette pour la barre, clic pour lancer vers la souris, G grimoire, H aide, M son, Échap pour fermer.

Pour tout recommencer : Ctrl + Maj + R.

## Structure du code

```
index.html      page, styles, panneaux DOM
js/util.js      maths, aléatoire déterministe, dessin « encre »
js/data.js      glyphes, ingrédients, recettes, découvertes, niveau
js/seal.js      modèle de sceau, icônes de glyphes, rendu du cercle
js/audio.js     sons génératifs (WebAudio)
js/world.js     monde extérieur : physique, effets, créatures, rendu
js/lab.js       scène du labo
js/ui.js        éditeur de sceaux, chaudron, grimoire, HUD
js/main.js      boucle, états, progression, sauvegarde
build.sh        fabrique dist/atelier-des-sceaux.html
```
