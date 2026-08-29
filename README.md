# RITUEL — 呪法帳

Un générateur-jeu de **techniques maudites** dans l'univers de *Jujutsu Kaisen*.
Pas de dépendance, pas de serveur : une page qui s'ouvre et qui commence à vous interroger.

> Le Bureau n'attribue pas de techniques. Il enregistre celles qui existent déjà.

---

## Ce que c'est

Vous êtes convoqué par le **Bureau des Exorcistes**, service des enregistrements. Un examinateur
vous fait remplir le *Formulaire R-9*. Dix rubriques : le substrat sur lequel votre loi a prise,
l'opération qu'elle fait au réel, sa portée, sa clause d'application, ce qu'elle vous prélève à
chaque emploi, son délai d'obéissance, l'assiette de sa cible, son siège dans votre corps, la
faille par laquelle on pourra vous détruire — que vous choisissez vous-même — et le paysage de
votre extension du territoire.

Puis huit questions sur **vous**, qui ne changent pas la technique : elles établissent seulement
de quoi votre corps est capable en la portant.

Ensuite seulement, le Haut Conseil donne un nom à ce que vous avez déclaré, et un grade.

Chaque rubrique **restreint réellement** le corpus et **modifie réellement** la mécanique. Le
substrat choisit la famille d'essences ; l'opérateur restreint les archétypes de loi ; la clause
et la portée notent les vecteurs ; le territoire choisit la famille d'extensions ; le siège
choisit l'organe. Et en face, chaque réponse a un prix chiffré, écrit noir sur blanc sur la fiche
finale : la portée de contact vaut +25 % de dégâts et +12 % de dégâts subis, le prélèvement sur
la chair rend les techniques moins chères et vous coûte 4,5 % de vos points de vie à chaque
énoncé, la cadence différée fait tomber la loi au battement suivant mais majorée de moitié.

Un formulaire moyen vaut ×1,56 en dégâts. Les extrêmes vont de ×0,75 à ×3,17. Les fléaux sont
calibrés sur la **moyenne** : un bon formulaire paie, un mauvais se sent.

## Le numéro de dossier

Votre déclaration entière tient dans onze caractères — `R1-B824-01E83`. Dix rubriques en base 4,
cinq poids de corps en base 9, l'archétype dominant. Donnez ce numéro à quelqu'un, ou le lien
`#d=<code>` : le service lui ressortira exactement la fiche que vous portez, avec le même sceau.

Ce n'est pas votre nom qui décide — votre nom ne sert qu'au dossier, aux convocations et, le cas
échéant, à l'épitaphe.

## Ce qui devrait déranger

- **On vous demande de choisir votre propre faille.** Rubrique 9. Par où vous pourrez être
  détruit, c'est vous qui le déclarez, et l'examinateur inscrit la conséquence en retour.
- **Les serments contraignants amputent vraiment.** Le Serment de la Paupière Cousue ne « simule »
  pas la perte d'information : la barre de vie adverse est rayée à l'écran, définitivement. Le
  Serment du Gantelet Déposé retire le bouton Résorption. Celui de l'Oreille Coupée coupe le son,
  l'enregistre, et le bouton affiche ensuite `SON : SCELLÉ` en refusant. Celui de la Trace Effacée
  détruit votre sauvegarde à votre mort — y compris les morts d'avant, qui ne vous avaient rien
  demandé.
- **Vos cadavres reviennent.** Chaque mort est inscrite. À la descente suivante, votre dépouille
  vous attend comme fléau — elle porte votre loi, et elle sait à quel battement vous ouvrez votre
  territoire. Plus vous mourez, plus son grade monte.
- **Le prélèvement sur la mémoire troue le compte rendu.** Si vous l'avez déclaré, une ligne de
  combat sur deux devient `……`. Vous jouez sans savoir ce que vous venez de subir.
- **Le sang reste à l'écran.** L'encre s'accumule sur l'objectif au fil des coups reçus et ne part
  qu'avec la technique inversée.
- **Le registre vous reconnaît.** Tapez un nom déjà tombé ici : il vous le dit pendant que vous
  tapez.
- **Les fléaux font ce que leur fiche annonce.** « Il attend », « il rejoue une de vos actions »,
  « au septième, il ouvre son registre » : ces phrases sont lues par le moteur et tenues. Celui qui
  n'existe que hors du regard encaisse mal — jusqu'à ce que vous le fixiez.
- **Le Voile (帳) tombe avant chaque intervention.** Un rideau noir coupe le secteur du reste du
  monde. Dehors, la rue continue sans savoir.

## Jouer

```bash
git clone <ce dépôt> && cd Jjk2
open index.html            # ou : npx serve .
```

`index.html` est autonome : un seul fichier, aucun réseau requis (les polices Google sont un
bonus, la page reste correcte sans elles).

Raccourcis : `1`–`9` déclenchent les actions en duel, `Échap` ouvre le registre, un clic ou
`Espace` emporte le texte en cours de frappe. Pendant une extension du territoire, un clic abrège
la cérémonie — sept secondes la première fois, une seconde et demie quand on l'a assez vue.

`prefers-reduced-motion` est pris au sérieux : plus de grain animé, plus de secousses, plus
d'inversion. La puissance passe alors par la couleur, l'encre et le son.

## Système

| Pièce | Rôle |
|---|---|
| **Formulaire** | Dix rubriques, quatre réponses chacune. Chaque réponse porte une étiquette machine qui restreint le corpus et applique un modificateur chiffré. 4¹⁰ déclarations possibles. |
| **Examen** | Huit questions sur douze, tirées. Chaque réponse pousse un des cinq axes du corps et révèle un archétype. Répartition vérifiée : chaque axe servi 9 à 10 fois, chaque archétype exactement 6 fois. |
| **Réceptacle** | Cinq axes sur un budget fixe de 100 points. La déclaration incline, l'examen décide, une racine comprime les extrêmes : on spécialise sans produire un corps à un seul membre. |
| **Duel** | Tour par tour à énergie maudite : 10 actions, 12 statuts qui interagissent, tension, technique maximale, extension du territoire, affrontement de territoires. Moteur pur — il n'émet que des événements, l'interface les met en scène. |
| **Calibrage** | Les fléaux visent une durée de duel et partent du réceptacle **nu** — sans serment ni maturation. Le monde ne grandit pas à votre vitesse : c'est ce qui rend la progression sensible. |
| **Serments** | 14 emplacements mécaniques écrits en dur, habillés par la prose du corpus. On en signe trois, puis quatre, puis cinq à mesure qu'on descend. |
| **Tempéraments** | Le comportement décrit dans le bestiaire est analysé et appliqué : patient, imitateur, double, horloge, soigneur, vorace, fuyant. Le texte n'est pas décoratif. |

Mesuré en simulation (90 duels par case) :

| | aucun serment | 1 | 2 | 3 | 4 | 5 |
|---|---|---|---|---|---|---|
| grade 2 · joueur avisé | 79 % | 88 % | 79 % | 92 % | — | — |
| grade 1 · joueur avisé | 42 % | 72 % | 51 % | 79 % | 79 % | — |
| semi-spécial · joueur avisé | **1 %** | 20 % | 23 % | 67 % | 86 % | — |
| grade spécial · joueur avisé | **0 %** | 4 % | 17 % | 39 % | 62 % | 94 % |
| grade 4 · joueur qui découvre | 80 % | 89 % | 82 % | 89 % | — | — |
| grade 4 · qui martèle la frappe | 33 % | 68 % | 79 % | 98 % | — | — |

Marteler la frappe renforcée ne passe pas le grade 3, quels que soient les serments. Un grade
spécial ne tombe que si vous avez tout rendu : la moitié de votre chair, votre garde, vos yeux,
votre délai, et la trace de votre passage.

## Structure

```
src/style.css          la feuille (un dossier d'autopsie laissé trop longtemps dans le noir)
src/data/corpus.json   le contenu écrit : formulaire, examen, ambiance, essences, lois,
                       vecteurs, territoires, fléaux, serments, voix, banques lexicales
src/js/00-core.js      générateur déterministe, grammaire, utilitaires
src/js/10-audio.js     synthèse Web Audio, zéro fichier son
src/js/20-fx.js        cinq calques de toile : champ, encre, territoire, entailles, sceaux, Voile
src/js/25-taxonomie.js les familles, les effets des dix rubriques, le codage des dossiers
src/js/30-forge.js     la forge des techniques et la grammaire française qui va avec
src/js/40-serments.js  les serments et leurs amputations
src/js/50-combat.js    le moteur de duel (pur, sans DOM)
src/js/60-memoire.js   le registre, les épitaphes, le revenant
src/js/70-ui.js        socle d'interface
src/js/75-ecrans.js    convocation, formulaire, examen, nomination, serments, missions, registre
src/js/78-duel.js      mise en scène du duel et de l'extension du territoire
src/js/80-boot.js      allumage
build.mjs              assemble le tout en index.html (+ artifact.html)
```

```bash
node build.mjs   # régénère index.html et artifact.html depuis src/
```

`artifact.html` porte le même contenu sans `<html>`/`<head>`/`<body>`, pour publication.

## Notes

- Le contenu est **original** : aucune technique canon n'est reprise. La grammaire suit la logique
  de l'œuvre — une loi simple poussée à des conséquences vertigineuses, un coût, une faille, un
  territoire dont l'effet garanti découle de la loi.
- Le son est entièrement synthétisé à la volée : aucun asset, aucune requête.
- La grammaire française est traitée sérieusement : accord en genre et en nombre, élisions,
  contractions, raccourcissement des syntagmes, jamais de préposition en suspens. Vérifié sur
  8000 générations.
