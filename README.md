# RITUEL — 呪法帳

Un **générateur de 生得術式** — techniques innées — dans l'univers de *Jujutsu Kaisen*.
Pas de dépendance, pas de serveur : une page qui s'ouvre et qui commence à vous interroger.

> On n'attribue pas de technique. On enregistre celles qui existent déjà.

Le produit fini est une **fiche** : une loi imposée au réel, sa provenance constatée, sa clause
d'énonciation, sa faille, ses **applications nommées** — 第一式, 第二式… — chacune avec le signe
qui la précède d'une demi-seconde, son 反転術式, son 術式最大, son 術式拡張, son 簡易領域, son
領域展開 avec incantation et coup au but, son aptitude au 黒閃, et — pour un porteur sur cinq —
une 天与呪縛 qu'il n'a pas choisie. Si la technique se manifeste par 式神, la fiche porte en plus
sa meute : trois serviteurs nommés, leur ordre d'appel, l'épreuve de 調伏 par laquelle on les
soumet, et ce qu'il en coûte de les perdre.

**2 415 919 104 fiches distinctes** : 4¹² déclarations possibles, 144 variantes chacune. Un duel
est disponible pour s'en servir, mais c'est la fiche qui compte.

---

## Le recto et le verso

Une fiche complète fait quinze mille caractères. Personne ne lit ça d'un trait, et tout ce qu'on
y ajoutait finissait par se neutraliser. Chaque section déclare donc sa **face**.

Le **recto** tient en deux écrans et dit ce qu'*est* la technique : sa loi — en grand, avant tout
le reste —, le constat de 呪力, son application directe, sa première application nommée, son
territoire, le premier de ses 式神 s'il y en a, sa 天与呪縛 s'il y en a une, et son numéro de
dossier. Le **verso** est le dossier entier, déplié d'un clic ou de la touche `D`.

Rien n'est retiré : le 目次 liste tout et marque d'un chevron ce qui est replié, viser une
section repliée ouvre le dossier au lieu de rater la cible, la recherche du navigateur trouve
tout, et l'impression sort toujours le dossier complet. Mesuré sur une même fiche : **3 666 px
au recto contre 7 400 au verso**, et une fiche à trois 式神 passe de 8 458 px à 4 148.

## Ce que c'est

Vous êtes convoqué au **呪術高専**, greffe des techniques innées. Un **補助監督** — superviseur
adjoint, sans technique, celui qui pose le 帳 et relève les corps — vous ouvre trois portes :

- **Tirage immédiat** — le greffe remplit le formulaire à votre place et vous rend une fiche
  complète en une seconde. Rien à répondre.
- **Ouvrir une procédure** — le **術式開示調書**, procès-verbal d'ouverture de technique : douze
  rubriques, puis l'examen du corps.
- **Reprendre un dossier** — un numéro de dossier, et la fiche ressort à l'identique.

Le 術式開示 est canon : énoncer sa technique devant témoin est déjà un 縛り. Vous perdez le
secret, et le réel vous rend en efficacité ce que vous cédez en surprise. C'est exactement ce que
font les douze rubriques : le substrat sur lequel votre loi a prise,
l'opération qu'elle fait au réel, sa portée, sa clause d'application, ce qu'elle vous prélève à
chaque emploi, son délai d'obéissance, l'assiette de sa cible, son siège dans votre corps, la
faille par laquelle on pourra vous détruire — que vous choisissez vous-même —, le paysage de
votre extension du territoire, la **voie de manifestation** — par où la loi sort de vous — et sa
**provenance** : par où elle est entrée dans votre corps.

Puis huit questions sur **vous**, qui ne changent pas la technique : elles établissent seulement
de quoi votre corps est capable en la portant. Il n'a pas de technique, lui ; c'est pour cela
qu'on le laisse écouter.

Ensuite seulement, les 上層部 donnent un nom à ce que vous avez déclaré, et un grade.

Chaque rubrique **restreint réellement** le corpus et **modifie réellement** la mécanique. Le
substrat choisit la famille d'essences ; l'opérateur restreint les archétypes de loi ; la clause
et la portée notent les vecteurs ; le territoire choisit la famille d'extensions ; le siège
choisit l'organe ; la manifestation décide si vous frappez de votre main, par 式神, par 呪具 ou
par le sol lui-même ; la provenance décide qui, en face, a déjà lu votre fiche. Et en face, chaque
réponse a un prix chiffré, écrit noir sur blanc sur la fiche
finale : la portée de contact vaut +25 % de dégâts et +12 % de dégâts subis, le prélèvement sur
la chair rend les techniques moins chères et vous coûte 4,5 % de vos points de vie à chaque
énoncé, la cadence différée fait tomber la loi au battement suivant mais majorée de moitié.

Un formulaire moyen vaut **×1,762** en dégâts — le produit, sur les douze rubriques, de la moyenne
de leurs quatre multiplicateurs. Les fléaux sont calibrés sur cette moyenne : un bon formulaire
paie, un mauvais se sent. Le nombre se recalcule en une ligne depuis la taxonomie, et toute
rubrique nouvelle qui touche aux dégâts oblige à le reporter dans `50-combat.js`.

## Les applications nommées

Dans l'œuvre, une technique innée n'est pas une capacité floue : elle se décline en coups qui
portent un nom et un numéro d'ordre. La fiche en attache **deux à quatre**, tirées dans
l'archétype de votre loi, toujours une de rang 1 — celle de tous les jours — et jamais deux du
même rang, pour que la liste se lise comme un apprentissage.

Chacune porte un champ qui n'existe nulle part ailleurs dans le corpus : le **signe précurseur**.
Ce que l'adversaire voit, entend ou sent dans la demi-seconde qui précède l'impact, et qui lui
donne sa seule chance. Un ternissement de la largeur exacte d'une main. Un cordon de chaleur à
41 °C sous le vêtement clair. Une voix qui passe au débit de guichet. Le signe désigne la parade
en même temps que son insuffisance : on voit venir, on sait quoi faire, on n'a pas de quoi le
faire.

**66 dérivations**, huit à neuf par archétype, chacune avec son effet, son signe, son coût et la
situation exacte où elle ne prend pas.

## Par où la loi est entrée dans votre corps

La douzième rubrique — 出自 — demande d'où vient la technique, et attache à la fiche un récit de
provenance daté, situé, signé.

- **相伝 · transmise** — une lignée, une maison, trois générations de relevés au dépôt. Le Bureau
  a vos contre-mesures depuis longtemps : −6 % de dégâts, +6 % de critique, +1 de réserve.
- **突然変異 · apparue seule** — premier cas constaté, le dossier commence à vous. Personne n'a de
  contre-mesure écrite : +12 % de dégâts. Personne n'a écrit non plus comment s'en servir : la loi
  vous refuse le service un coup sur seize.
- **受肉 · venue d'un 呪物** — un objet avalé, greffé, inhalé, qui n'est jamais ressorti. +12 % de
  structure, et 2 % de vos points de vie à chaque application : la chose se nourrit encore.
- **縛り · achetée par un pacte** — que vous n'avez pas rédigé. +22 % de dégâts, −2 de réserve, et
  votre 反転術式 ne rend plus que les trois quarts. Le contractant existe toujours.

**26 provenances écrites** : maisons inventées, premiers cas datés, scellés manquants d'un dépôt,
contrats de substitution en trois exemplaires.

## Par où la loi sort de vous

La onzième rubrique est celle qui change le plus la fiche.

- **直接 · application directe** — la loi passe par votre corps. +15 % de dégâts, rien à
  entretenir, rien à perdre.
- **式神 · familier** — la loi prend forme et vous obéit. −12 % en frappe directe, mais +1 呪力 par
  battement : la meute travaille pendant que vous respirez. La fiche nomme **trois serviteurs** —
  un pivot ou un majeur accordé à votre archétype, deux mineurs —, leur ordre d'appel, et pour
  chacun l'**épreuve de 調伏** qu'il faut passer pour le soumettre. Les sept règles du 調伏 sont
  au dossier, dont celle qui compte : **un 式神 détruit ne revient jamais.**
- **呪具 · objet chargé** — un outil porte la charge à votre place. +25 % de dégâts, +10 % de
  dégâts subis : l'objet vous expose. La fiche l'identifie nommément.
- **地形 · terrain** — la loi passe par le sol. Un battement de plus dans le territoire, +15 %
  d'effet dedans, −5 % dehors.

## Retirer au sort dans les limites déclarées

La déclaration fixe les **familles**, elle ne fixe pas tout. À l'intérieur — quelle essence de
呪力 dans la famille, quelle loi dans l'archétype, quel territoire, quel organe — le réel a
encore le choix, et ce choix porte un numéro : **144 variantes** par déclaration.

- **Retirer au sort** (`R`) rejoue la latitude sans toucher à vos réponses.
- **Variante suivante** (`V`) avance d'un cran dans les 144.
- **La planche** (`G`) a deux onglets : **Variantes de votre déclaration** — six porteurs qui
  auraient rempli le même formulaire que vous, sceaux compris — et **Tirages entièrement neufs**,
  six déclarations tirées de bout en bout, avec leur voie de manifestation affichée. N'importe
  laquelle s'adopte d'un clic.
- **Corriger une rubrique** revient sur une seule ligne du formulaire — les onze pastilles en tête
  de fiche sont cliquables — et reforge la technique.
- Le **目次** en marge de la fiche en liste toutes les sections et y saute.

## Le numéro de dossier

Votre déclaration entière tient dans une quinzaine de caractères — `R3-7E8HN-02IKM-33`. Douze
rubriques en base 4, cinq poids de corps en base 9, l'archétype dominant, la variante tirée.
Donnez ce numéro, ou le lien `#d=<code>` : on ressortira exactement la fiche que vous portez,
sceau compris. Les anciens codes restent lisibles : un `R2-…` se relit en provenance transmise,
un `R1-…` en manifestation directe. Toute rubrique nouvelle s'ajoute en fin de liste, pour que
les numéros déjà distribués gardent un sens.

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
- **天与呪縛.** Un porteur sur cinq naît avec une restriction céleste : une privation réelle,
  corporelle ou perceptive, qu'il n'a pas signée, contre une contrepartie qui ne compense jamais
  tout à fait. Elle s'applique à ses chiffres qu'il le veuille ou non.
- **Un 式神 détruit ne revient jamais.** Le corpus du 調伏 le dit en toutes lettres, et la fiche
  écrit ce que sa perte retire au porteur — un ordre qu'il ne pourra plus donner, une part de sa
  loi qui reste ouverte.
- **黒閃.** Quand le coup et le 呪力 coïncident à 0,000001 seconde près, l'espace se fend en noir,
  l'image perd sa couleur, et les dégâts sont multipliés par 2,5. On ne le provoque pas : il
  survient dans environ un duel sur sept, et l'avoir touché une fois améliore définitivement le
  contrôle du porteur sur son énergie maudite — pour ce duel-là.

## Jouer

```bash
git clone <ce dépôt> && cd Jjk2
open index.html            # ou : npx serve .
```

`index.html` est autonome : un seul fichier, aucun réseau requis (les polices Google sont un
bonus, la page reste correcte sans elles).

Raccourcis : sur une fiche, `R` retire au sort, `V` passe à la variante suivante, `G` ouvre la
planche, `D` déplie ou replie le dossier. En duel, `1`–`9` déclenchent les actions, `Échap` ouvre le registre, un clic ou
`Espace` emporte le texte en cours de frappe. Pendant une extension du territoire, un clic abrège
la cérémonie — sept secondes la première fois, une seconde et demie quand on l'a assez vue.

`prefers-reduced-motion` est pris au sérieux : plus de grain animé, plus de secousses, plus
d'inversion. La puissance passe alors par la couleur, l'encre et le son.

## Système

| Pièce | Rôle |
|---|---|
| **Formulaire** | Douze rubriques, quatre réponses chacune. Chaque réponse porte une étiquette machine qui restreint le corpus et applique un modificateur chiffré. 4¹² = 16 777 216 déclarations, × 144 variantes = 2,4 milliards de fiches. |
| **Nomenclature** | Les noms sont composés à partir de gabarits qui vivent dans le corpus — 40 communs, 10 par archétype, pour qu'une loi de mesure ne se nomme pas comme une loi de seuil. Les accords sont portés par des jetons explicites (`{ACCORD_MATIERE}`, `{SUFFIXE_ORGANE}`), et chaque banque déclare le genre de ses entrées plutôt que de le laisser deviner. Espace mesuré : ≈ 120 000 noms français, 23 000 noms japonais. |
| **派生術式** | Deux à quatre applications nommées par fiche, tirées dans l'archétype de la loi, numérotées 第一式 à 第四式, chacune avec son signe précurseur. |
| **Examen** | Huit questions sur douze, tirées. Chaque réponse pousse un des cinq axes du corps et révèle un archétype. Répartition vérifiée : chaque axe servi 9 à 10 fois, chaque archétype exactement 6 fois. |
| **Réceptacle** | Cinq axes sur un budget fixe de 100 points. La déclaration incline, l'examen décide, une racine comprime les extrêmes : on spécialise sans produire un corps à un seul membre. |
| **Duel** | Tour par tour à énergie maudite : 10 actions, 12 statuts qui interagissent, tension, technique maximale, extension du territoire, affrontement de territoires. Moteur pur — il n'émet que des événements, l'interface les met en scène. |
| **Calibrage** | Les fléaux visent une durée de duel et partent du réceptacle **nu** — sans serment ni maturation. Le monde ne grandit pas à votre vitesse : c'est ce qui rend la progression sensible. |
| **Serments** | 14 emplacements mécaniques écrits en dur, habillés par la prose du corpus. On en signe trois, puis quatre, puis cinq à mesure qu'on descend. |
| **Tempéraments** | Le comportement décrit dans le bestiaire est analysé et appliqué : patient, imitateur, double, horloge, soigneur, vorace, fuyant. Le texte n'est pas décoratif. |
| **式神 · 呪具** | La voie de manifestation ne fait pas que colorer la fiche : elle attache une meute nommée avec ses épreuves de 調伏, ou un 呪具 identifié, et déplace les chiffres du duel en conséquence. |
| **簡易領域** | Le territoire simplifié est la seule parade régulière opposable à un coup au but : sa frontière fait passer la garantie d'un territoire adverse de « inévitable » à −55 %. |

Mesuré en simulation (90 duels par case) :

| | aucun serment | 1 | 2 | 3 | 4 | 5 |
|---|---|---|---|---|---|---|
| grade 2 · joueur avisé | 72 % | 94 % | 84 % | 91 % | — | — |
| grade 1 · joueur avisé | 57 % | 76 % | 72 % | 80 % | 86 % | — |
| semi-spécial · joueur avisé | **3 %** | 17 % | 27 % | 59 % | 89 % | — |
| grade spécial · joueur avisé | **0 %** | 2 % | 3 % | 14 % | 46 % | 73 % |
| grade 4 · joueur qui découvre | 81 % | 81 % | 93 % | 96 % | — | — |
| grade 4 · qui martèle la frappe | 33 % | 74 % | 67 % | 84 % | — | — |

Serments signés dans l'ordre : Œil scellé, Garde rendue, Silence, Journal fermé, Dette de chair.

Marteler la frappe renforcée ne passe pas le grade 3, quels que soient les serments. Un grade
spécial ne tombe que si vous avez tout rendu : la moitié de votre chair, votre garde, vos yeux,
votre délai, et la trace de votre passage.

## Ce qu'une déclaration parcourt vraiment

La question n'est pas combien le corpus contient, mais combien **une** déclaration rencontre sur
ses 144 variantes — c'est ce que la touche `V` fait défiler. Mesuré avant et après cette écriture :

| | avant | après |
|---|---|---|
| essences | 26 | 26 |
| **lois** | **10 à 13** | **30 à 33** |
| **術式拡張** | **5 à 6** | **15 à 16** |
| 派生術式 | 16 à 17 | 16 à 17 |
| noms distincts | 144 | 144 |

La loi variait deux fois moins que l'essence, alors que l'essence n'est que la matière du 呪力 et
que la loi *est* la technique. Ce n'était pas l'algorithme — la forge atteignait déjà presque
tout ce qui existait —, c'était le corpus. Il a triplé là, et seulement là.

## Le corpus

469 entrées à la première écriture, **1 699** aujourd'hui, toutes écrites pour ce projet :

| | |
|---|---|
| 100 essences de 呪力 | vingt-quatre à vingt-six par famille de substrat, chacune avec son genre grammatical déclaré |
| 126 lois maudites | quinze à dix-sept par archétype, chacune avec sa conséquence, sa faille, son 反転術式, sa sortie maximale et son nom japonais |
| 66 派生術式 | huit à neuf par archétype : effet, **signe précurseur**, coût, limite |
| 26 provenances | 相伝, 突然変異, 受肉, 縛り — récit daté, témoin, prix, mention au dossier |
| 64 vecteurs · 22 territoires innés | avec paysage, incantation, coup au but et faille |
| 62 術式拡張 | sept à huit par archétype, appariées à l'archétype de votre loi pour qu'elles en découlent vraiment |
| 14 簡易領域 · 10 aptitudes au 黒閃 | |
| 14 天与呪縛 | cinq formes mécaniques, habillées par le corpus |
| 28 式神 | 4 pivots, 8 majeurs, 16 mineurs — chacun avec sa description, son ordre d'appel et ce que coûte sa perte |
| 14 épreuves de 調伏 · 7 règles de soumission | dont celle qui interdit le retour d'un 式神 détruit |
| 18 呪具 | outils chargés, nommés et situés |
| 20 fléaux · 20 縛り · 16 affectations · 16 contres | |
| 12 rubriques × 4 réponses, 12 questions d'examen | avec leurs conséquences écrites |
| 150 matières · 97 organes · 94 lieux · 71 nombres | les banques de composition des noms, genre déclaré |
| 120 gabarits de nom | 40 communs, 10 par archétype |
| 34 termes de lexique canon | français, kanji, romaji, définition |

## Structure

```
src/style.css          la feuille (un dossier d'autopsie laissé trop longtemps dans le noir)
src/data/corpus.json   le contenu écrit : formulaire, examen, ambiance, essences, lois, vecteurs,
                       territoires, 式神, 調伏, 呪具, fléaux, serments, voix, banques lexicales
src/js/00-core.js      générateur déterministe, grammaire, utilitaires
src/js/10-audio.js     synthèse Web Audio, zéro fichier son
src/js/20-fx.js        cinq calques de toile : champ, encre, territoire, entailles, sceaux, Voile
src/js/25-taxonomie.js les familles, les effets des douze rubriques, le codage des dossiers
src/js/30-forge.js     la forge des techniques et la grammaire française qui va avec
src/js/40-serments.js  les serments et leurs amputations
src/js/50-combat.js    le moteur de duel (pur, sans DOM)
src/js/60-memoire.js   le registre, les épitaphes, le revenant
src/js/70-ui.js        socle d'interface
src/js/75-ecrans.js    les trois portes, formulaire, examen, fiche et sommaire, planche, registre
src/js/78-duel.js      mise en scène du duel et de l'extension du territoire
src/js/80-boot.js      allumage
build.mjs              assemble le tout en index.html (+ artifact.html)
tools/verifier.mjs     tient les invariants que la forge suppose ; échoue fort
```

```bash
node tools/verifier.mjs --stats   # familles, planchers, sièges, couverture du formulaire
```

Le corpus est devenu trop gros pour se relire. Le vérificateur refuse une entrée sans famille, un
archétype hors nomenclature, un siège anatomique sans organe, une rubrique sans question, un id
en double, une reprise involontaire d'un nom canon. Il lit les expressions de siège directement
dans `25-taxonomie.js` pour que les deux ne dérivent pas en silence.

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
