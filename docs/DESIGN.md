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
5. Écosystème de créatures.
6. Labo qui grandit.
