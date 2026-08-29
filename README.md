# RITUEL — 呪法帳

Un générateur-jeu de **techniques maudites** dans l'univers de *Jujutsu Kaisen*.
Pas de dépendance, pas de build lourd, pas de serveur : une page qui s'ouvre et qui commence à parler.

> On ne distribue pas de pouvoirs ici. On constate ce qui est déjà là.

---

## Ce que c'est

Tu donnes un nom. Le registre le lit et en extrait une technique innée : une **loi** imposée
au réel, un **vecteur** par lequel elle atteint les choses, une **faille structurelle**, une
**technique inversée**, une **technique maximale**, une **extension du territoire** avec son
incantation et son coup au but. Puis tu descends, et tu t'en sers contre des fléaux.

Ce n'est pas un tirage aléatoire. C'est une **lecture déterministe** : la même graine donne
exactement la même technique, le même sceau, le même territoire — sur n'importe quelle machine,
maintenant ou dans dix ans. `#g=<nom>` dans l'URL ouvre le registre directement à cette page.

## Ce qui devrait déranger

- **Le rituel ne sert à rien.** Les six questions posées avant la révélation ne changent pas
  une lettre de ta technique : elle était dans ton nom avant que tu t'assoies. Elles décident
  seulement comment ton corps la porte. Le jeu te le dit en face, après.
- **Le nom de ta technique passe à l'écran pendant 130 ms**, une seule fois, juste après ta
  saisie, sans annonce. Presque personne ne le lit. Le jeu s'en souvient et te le rappelle.
- **Les serments contraignants amputent vraiment.** Le Serment de la Paupière Cousue ne « simule »
  pas la perte d'information : la barre de vie adverse est rayée à l'écran, définitivement.
  Le Serment du Gantelet Déposé retire le bouton Résorption. Celui de l'Oreille Coupée coupe le son
  et t'interdit de le rallumer. Celui de la Trace Effacée détruit ta sauvegarde à ta mort —
  y compris les morts d'avant, qui ne t'avaient rien demandé.
- **Tes cadavres reviennent.** Chaque mort est inscrite au registre. À la descente suivante,
  ta dépouille t'attend comme fléau jouable — elle porte ta loi, et elle sait à quel tour tu
  ouvres ton territoire. Plus tu meurs, plus son grade monte.
- **Le sang reste à l'écran.** L'encre s'accumule sur l'objectif au fil des coups reçus et ne
  part qu'avec la technique inversée.
- **Le silence est définitif.** Le Serment de l'Oreille Coupée est enregistré : après un
  rechargement, le bouton du son est toujours là, il affiche `SON : SCELLÉ`, et il refuse.
- **Le registre te reconnaît.** Tape un nom déjà tombé ici : il te le dit pendant que tu tapes.
- **Les fléaux font ce que leur fiche annonce.** « Il attend », « il rejoue une de tes actions »,
  « au septième, il ouvre son registre » : ces phrases sont lues par le moteur et tenues. Celui
  qui n'existe que hors du regard encaisse mal — jusqu'à ce que tu le fixes.

## Jouer

```bash
git clone <ce dépôt> && cd Jjk2
open index.html            # ou : npx serve .
```

`index.html` est autonome : un seul fichier, aucun réseau requis (les polices Google sont un
bonus, la page reste correcte sans elles).

Raccourcis : `1`–`9` déclenchent les actions en duel, `Échap` ouvre le registre, un clic ou
`Espace` emporte le texte en cours de frappe. Pendant une extension du territoire, un clic
abrège la cérémonie — elle dure sept secondes la première fois, une seconde et demie quand on
l'a assez vue.

`prefers-reduced-motion` est pris au sérieux : plus de grain animé, plus de secousses, plus
d'inversion. La puissance passe alors par la couleur, l'encre et le son.

## Système

| Pièce | Rôle |
|---|---|
| **Graine** | Normalisée (casse, accents, ponctuation ignorés) puis hachée en `cyrb128` → `mulberry32`. Chaque axe tire sur un sous-générateur nommé, pour que deux axes n'interfèrent jamais. |
| **Loi** | Le cœur de la technique : un axiome froid, sa conséquence extrême, sa faille, son inversion, son maximum. Choisie par affinité stable avec l'essence — jamais au hasard pur. |
| **Réceptacle** | Cinq axes (vigueur, flux, tranchant, lucidité, inversion) répartis sur un budget fixe de 100 points, pondéré par les archétypes de tes réponses. On ne peut pas être bon partout. |
| **Duel** | Tour par tour à énergie maudite : 10 actions, 11 statuts qui interagissent, tension, technique maximale, extension du territoire, affrontement de territoires. Le moteur est pur — il n'émet que des événements, l'interface les met en scène. |
| **Calibrage** | Les fléaux sont taillés sur le **réceptacle nu** — sans serment ni maturation. C'est ce qui rend la progression et les serments réellement sensibles : le monde ne grandit pas à ta vitesse. |
| **Serments** | 14 emplacements mécaniques écrits en dur, habillés par la prose du corpus. Multiplicateurs cumulatifs, plafond souple au-delà de ×3. On en signe trois, puis quatre, puis cinq à mesure qu'on descend. |
| **Tempéraments** | Le comportement décrit dans le bestiaire est analysé et appliqué : patient, imitateur, double, horloge, soigneur, vorace, fuyant. Le texte n'est pas décoratif. |

Mesuré en simulation (80 duels par case, joueur compétent) :

| | aucun serment | 1 | 2 | 3 | 4 | 5 |
|---|---|---|---|---|---|---|
| grade 2 | 85 % | 99 % | 94 % | 100 % | — | — |
| grade 1 | 61 % | 75 % | 71 % | 95 % | 94 % | — |
| semi-spécial | **0 %** | 6 % | 13 % | 75 % | 93 % | — |
| grade spécial | **0 %** | 0 % | 4 % | 11 % | 35 % | 95 % |

Marteler les boutons ne passe pas le grade 3, quels que soient les serments. Un grade spécial ne
tombe que si tu as tout rendu : la moitié de ta chair, ta garde, tes yeux, ton délai, et la trace
de ton passage. C'est le contrat de la série — la puissance se paie en restrictions réelles.

## Structure

```
src/style.css        la feuille (un dossier d'autopsie laissé trop longtemps dans le noir)
src/data/corpus.json le contenu : essences, lois, vecteurs, territoires, fléaux, voix
src/js/00-core.js    graine, générateur déterministe, utilitaires
src/js/10-audio.js   synthèse Web Audio, zéro fichier son (drone, cœur, territoire, murmures)
src/js/20-fx.js      cinq calques de toile : champ, encre, territoire, entailles, sceaux
src/js/30-forge.js   la forge des techniques, avec la grammaire française qui va avec
src/js/40-serments.js les serments et leurs amputations
src/js/50-combat.js  le moteur de duel (pur, sans DOM)
src/js/60-memoire.js le registre, les épitaphes, le revenant
src/js/70-ui.js      socle d'interface
src/js/75-ecrans.js  seuil, rituel, révélation, serments, descente, registre, consultation
src/js/78-duel.js    mise en scène du duel et de l'extension du territoire
src/js/80-boot.js    allumage
build.mjs            assemble le tout en index.html (+ artifact.html)
```

```bash
node build.mjs   # régénère index.html et artifact.html depuis src/
```

`artifact.html` porte le même contenu sans `<html>`/`<head>`/`<body>`, pour publication.

Le corpus compte 469 entrées écrites : 24 essences, 24 vecteurs, 28 lois, 22 territoires,
20 fléaux, 20 serments, plus les voix, la nomenclature et les banques lexicales.

## Notes

- Le contenu est **original** : aucune technique canon n'est reprise. La grammaire, elle, suit
  la logique de l'œuvre (une loi simple poussée à des conséquences vertigineuses, un coût, une
  faille, un territoire dont l'effet garanti découle de la loi).
- Le son est entièrement synthétisé à la volée : aucun asset, aucune requête.
- `prefers-reduced-motion` est respecté : grain, rotations et dérives s'arrêtent.
