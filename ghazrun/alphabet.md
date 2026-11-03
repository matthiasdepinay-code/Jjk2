# Les zhâkar : l'écriture gravée du Ghâzrûn

![Table des signes](alphabet.svg)

*Table complète dans `alphabet.svg`. Exemples : `exemple-inscription.svg` (deux vers, de droite à gauche, avec un vocatif), `exemple-devise.svg` (« Ûl ghâzagh, vânôth ») et `exemple-chant.svg` (le chant de guerre). Tous sont produits par `outils/zhakar.py`, qui grave n'importe quel texte romanisé.*

---

## 1. Principe

Les Voix n'écrivent pas : un mot dit suffit. Les **zhâkar** (« marques ») ont été inventés pour les serviteurs et les vassaux, afin que les serments tiennent dans une mémoire mortelle. Un mot gravé est un mot **arrêté à la deuxième profondeur** : il lie, mais il ne fait pas (voir `monde.md`, § 7).

C'est une écriture du premier âge du monde : **taillée à la lame**, en entailles droites, dans la pierre, le fer et l'os. La lame ne tourne pas, donc il n'y a pas de courbe. Les traits sont lourds, les angles vifs, et aucun signe n'est jamais tout à fait droit : la pierre n'est pas nette.

Le fonctionnement, lui, est celui qu'on connaît ailleurs : un **abugida**. On écrit les consonnes, et les voyelles se taillent dessus.

- **La consonne est l'os du mot** (*ghrôm*). Chaque consonne est un signe plein, fait de deux à sept entailles.
- **La voyelle est la chair** (*zhamb*). Elle ne s'écrit pas comme une lettre mais comme une **entaille** portée au-dessus de la consonne qu'elle suit.
- **La longueur est le nombre d'entailles** : une pour une brève, deux pour une longue, trois pour le vocatif noble (*thâlâ*, « ô tour »).
- Un mot qui commence par une voyelle (*ûn, ûkh, îsh*) s'appuie sur **le signe muet**, un coup de lame brisé nommé *hûsh*, « silence ».

## 2. Les vingt signes

Une famille de sons, un geste de lame.

| Famille | Geste | Signes |
|---|---|---|
| Occlusives sourdes | une **hampe**, avec un fer de lance (p), un chevron de tête (t) ou une griffe levée (k) | p, t, k |
| Occlusives sonores | le même signe, prolongé sous la ligne par une **racine** (pointe de base) | b, d, g |
| Fricatives de gorge | la griffe du k **refermée** en triangle sur la hampe | kh (de k), gh (de g) |
| Dentales | le t avec un **second chevron** sous le premier | th, dh |
| Sifflantes | la **foudre** ; z est la foudre inversée ; les chuintantes ajoutent une **queue** sous la ligne | s, z, sh, zh |
| Souffle | un chevron ouvert vers la droite, traversé d'une entaille | h |
| Labiale | une pointe vers le bas, barrée | v |
| Nasales | un **portique** à toit (n) ou à deux pointes (m) | n, m |
| Liquides | la hampe à **crochet** (r) et la hampe à **talon** (l) | r, l |

Chaque signe porte un nom : la consonne suivie de *â* (*pâ, tâ, khâ, ghâ…*). Réciter l'alphabet, c'est réciter vingt vocatifs.

**La racine.** La pointe qui descend sous la ligne pour b, d, g, gh, dh est l'entaille la plus chargée de sens : une sonore est « une sourde qui a pris racine ». Les Lieurs disent qu'un serment gravé sans aucune racine ne tient pas.

## 3. Les entailles de voyelle

| Voyelle | Entaille | Brève | Longue | Vocatif |
|---|---|---|---|---|
| a / â | entaille verticale | ǀ | ǀǀ | ǀǀǀ |
| o / ô | encoche en V | v | vv | — |
| u / û | entaille oblique | / | // | — |
| i / î | entaille horizontale | ‾ | ‾ ‾ | — |

Un signe sans entaille se lit sans voyelle (consonne de groupe ou de fin de mot) : *vorz* s'écrit v-o-r-z avec une seule encoche, sur le v.

## 4. Ponctuation

- **Le coup de pointe** (un petit triangle sous la ligne, après le mot) ferme le mot. Il n'y a pas d'espace : la pierre n'en a pas besoin.
- **La ligne brisée** sépare les vers. Un serment en cinq vers a quatre lignes.
- **Les trois entailles** du vocatif sont le seul signe ornemental. Les tailler sur un nom qu'on n'invoque pas est un sacrilège.

## 5. Sens de la gravure

- Sur la pierre et le métal, on grave **de droite à gauche**, « vers la porte » : le Lieur grave face à l'entrée de la salle et finit son serment en regardant le seuil.
- Sur la peau et dans les livres des vassaux, on écrit de gauche à droite. Les Lieurs disent que c'est pour cela que les livres mentent.

`zhakar.py` rend les deux : par défaut de gauche à droite, avec `--inscription` de droite à gauche.

## 6. Graver un texte

```
python3 outils/zhakar.py "Vorzghan zâraghot" -o serment.svg
python3 outils/zhakar.py "Ô thâlâ, thâl ûlâr\nNôkh dâl thôk slûgôn" --inscription --vocatif thâlâ -o linteau.svg
python3 outils/zhakar.py --alphabet -o alphabet.svg
```

`\n` sépare les vers, `--vocatif` liste les mots qui reçoivent les trois entailles, `-s` règle la taille.
