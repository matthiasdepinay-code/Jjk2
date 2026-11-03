# Les zhâkar : l'écriture du Ghâzrûn

![Table des signes](alphabet.svg)

*Table complète dans `alphabet.svg`. Exemples : `exemple-inscription.svg` (deux vers, de droite à gauche, avec un vocatif) et `exemple-devise.svg` (« Ûl ghâzagh, vânôth »). Les trois sont produits par `outils/zhakar.py`, qui écrit n'importe quel texte romanisé.*

---

## 1. Principe

Les Voix n'écrivent pas : un mot dit suffit. Les **zhâkar** (« marques ») ont été inventés pour les serviteurs et les vassaux, afin que les serments tiennent dans une mémoire mortelle. Un mot écrit est un mot **arrêté à la deuxième profondeur** : il lie, mais il ne fait pas (voir `monde.md`, § 7).

Le système est un **abugida** : on écrit les consonnes, et les voyelles se posent dessus. Quiconque connaît l'arabe, l'hébreu, le devanagari ou le tengwar en reconnaît le fonctionnement ; les formes, elles, n'appartiennent qu'au Ghâzrûn.

- **La consonne est l'os du mot** (*ghrôm*). Chaque consonne est un signe tracé **d'un seul souffle**, sans lever la main : on dit qu'il reproduit le chemin de la voix dans la gorge.
- **La voyelle est la chair** (*zhamb*). Elle ne s'écrit pas comme une lettre mais comme une **marque** posée au-dessus de la consonne qu'elle suit.
- **La longueur est le nombre de marques** : une marque pour une brève, deux pour une longue, trois pour le vocatif noble (*thâlâ*, « ô tour »).
- Un mot qui commence par une voyelle (*ûn, ûkh, îsh*) s'appuie sur **le signe muet**, une simple volute nommée *hûsh*, « silence ».

## 2. Les vingt signes

Les formes sont régulières : une famille de sons, un geste.

| Famille | Geste | Signes |
|---|---|---|
| Occlusives sourdes | une **hampe** droite, avec un lobe (p), un chapeau (t) ou un bras levé (k) | p, t, k |
| Occlusives sonores | le même signe, prolongé sous la ligne par une **racine** (boucle de base) | b, d, g |
| Fricatives de gorge | le bras du k **refermé en boucle** sur la hampe | kh (de k), gh (de g) |
| Dentales | le t avec un **second arc** sous le chapeau | th, dh |
| Sifflantes | un **serpent** ; z est le serpent inversé et barré ; les chuintantes ajoutent une **queue** | s, z, sh, zh |
| Souffle | un croissant ouvert, traversé d'un trait | h |
| Labiale | une coupe à bec | v |
| Nasales | une **arche** (n) ou deux arches (m) | n, m |
| Liquides | la hampe à **volute** (r) et la hampe à **crosse** (l) | r, l |

Chaque signe porte un nom : la consonne suivie de *â* (*pâ, tâ, khâ, ghâ…*). Réciter l'alphabet, c'est réciter vingt vocatifs.

**La racine.** La boucle qui descend sous la ligne pour b, d, g, gh, dh est le trait le plus chargé de sens de l'écriture : une sonore est « une sourde qui a pris racine ». Les Lieurs disent qu'un serment gravé sans aucune racine ne tient pas.

## 3. Les marques de voyelle

| Voyelle | Marque | Brève | Longue | Vocatif |
|---|---|---|---|---|
| a / â | point | · | ·· | ··· |
| o / ô | anneau | ○ | ○○ | — |
| u / û | flamme (petit crochet) | ʽ | ʽʽ | — |
| i / î | trait | ı | ıı | — |

Un signe sans marque se lit sans voyelle (consonne de groupe ou de fin de mot) : *vorz* s'écrit v-o-r-z avec une seule marque, l'anneau, sur le v.

## 4. Ponctuation

- **Le losange** après le mot (sous la ligne) ferme le mot. Il n'y a pas d'espace.
- **La ligne ondulée** sépare les vers. Un serment en cinq vers a quatre lignes.
- **Les trois points** du vocatif sont le seul signe ornemental. Les poser sur un nom qu'on n'invoque pas est un sacrilège.

## 5. Sens de l'écriture

- Sur la pierre et le métal, on grave **de droite à gauche**, « vers la porte » : le Lieur grave face à l'entrée de la salle et finit son serment en regardant le seuil.
- Sur la peau et dans les livres des vassaux, on écrit de gauche à droite. Les Lieurs disent que c'est pour cela que les livres mentent.

`zhakar.py` rend les deux : par défaut de gauche à droite, avec `--inscription` de droite à gauche.

## 6. Écrire un texte

```
python3 outils/zhakar.py "Vorzghan zâraghot" -o serment.svg
python3 outils/zhakar.py "Ô thâlâ, thâl ûlâr\nNôkh dâl thôk slûgôn" --inscription --vocatif thâlâ -o linteau.svg
python3 outils/zhakar.py --alphabet -o alphabet.svg
```

`\n` sépare les vers, `--vocatif` liste les mots qui reçoivent les trois points, `-s` règle la taille.
