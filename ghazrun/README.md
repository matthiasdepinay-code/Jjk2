# Ghâzrûn — « la Voix profonde »

*Langue de fiction inspirée du Noir Parler de Tolkien : des consonnes de gorge, des suffixes qui s'empilent, mais aussi des voyelles longues, des liquides et des parallélismes qui lui donnent une solennité ancienne.*

| Fichier | Contenu |
|---|---|
| `README.md` | Présentation, phonologie, grammaire complète, formation des noms |
| `monde.md` | L'univers : la Première Voix, les Voix déchues, ce que fait un mot, les serments, la voyelle volée |
| `alphabet.md`, `alphabet.svg` | L'écriture gravée, dessinée : vingt signes taillés à la lame |
| `outils/ghazrun.py` | Déclinaison, conjugaison, lexique, analyse de formes, registre bas |
| `outils/zhakar.py` | Grave un texte dans l'écriture du Ghâzrûn (SVG) |
| `lexique.md` | Lexique classé par thème (~380 entrées : parole, magie, religion, guerre, parler bas, nature, corps, vie quotidienne) |
| `lexique.csv` | Le même lexique, exploitable par script |
| `textes.md` | Textes avec traduction et glose mot à mot, dont un dialogue de garnison et un chant de guerre |

---

## 1. Esprit de la langue

Le Ghâzrûn (*ghâz* « voix » + *rûn* « profond, ancien ») est la langue des **Ghâzgorar**, les Voix : des êtres antérieurs au monde, nés du premier mot, dont la parole fait advenir ce qu'elle dit. Ceux d'entre eux qui ont voulu finir le monde à leur nom, les **Mârghâzar**, Voix de la Nuit, règnent depuis le **Mârdrîm** (voir `monde.md`). C'est **la langue de la réalité** : chaque mot y a trois profondeurs, et la plus profonde plie le monde. Elle a deux visages :

- **Le registre haut** (*Ghâzrûn ûlâr*, « la voix haute ») : langue des serments, des inscriptions et des chants. Les voyelles longues y sont toutes prononcées, les phrases s'ouvrent sur un vocatif, les vers se répondent en parallèle. Sa beauté est une exigence technique : un serment mal prononcé ne lie pas.
- **Le registre bas** (*Ghâzrûn zhag*, « la voix de gorge ») : ce que la langue devient dans une bouche mortelle, celle des serviteurs (*zûgar*). Les mots sont les mêmes, mais clipsés : seule la première voyelle longue d'un mot garde sa longueur, et le mot ne descend pas plus bas que la gorge.

> *Mârokûth nâldhûmzhâ* (haut) → *Mârokuth nâldhumzha* (bas) — « les ténèbres, pour toujours »

**Le modèle sonore est le Noir Parler tel qu'on l'entend dans les films** : ce que les orques aboient entre eux, et l'inscription de l'Anneau lue à voix basse. Rauque, guttural, primitif, comme venu du premier âge du monde. La beauté cherchée ici est celle-là : archaïque, pesante, taillée à la hache. Pas la grâce elfique.

Ce qui rend la langue « ancienne et profonde » tient à quelques choix délibérés :

1. **Pas de voyelle *e*.** Le système est fermé, grave : *a, o, u* et leurs longues. Les Voix ne peuvent pas prononcer ce son, « la voyelle volée » (`monde.md`, § 5).
2. **Les voyelles longues portent l'accent** et donnent au discours un rythme lent, psalmodié.
3. **Les fricatives sonores *gh, dh, zh*** adoucissent la dureté des groupes *kr-, zg-, -rz*.
4. **Les suffixes s'empilent** comme dans le Noir Parler : *zâr-ôl-uzar-dhûm* « pour-les-lier-tous ».
5. **La dérivation est régulière** : on peut forger un mot nouveau et il « sonne » juste.
6. **Chaque syllabe coûte** : pas d'article, pas de pronom sujet, pas de copule, pas de préposition. Une phrase tient en deux ou trois mots (§ 8).

---

## 2. Phonologie

### 2.1 Consonnes (20)

| Écrit | Son (API) | Repère pour un francophone |
|---|---|---|
| p b t d k g | /p b t d k g/ | comme en français, *k* et *g* toujours durs |
| kh | /x/ | « ch » allemand de *Bach*, jota espagnole |
| gh | /ɣ/ | le même son mais sonore : un « r » parisien très relâché, dans la gorge |
| th | /θ/ | « th » anglais de *thin* |
| dh | /ð/ | « th » anglais de *this* |
| s z | /s z/ | comme en français |
| sh | /ʃ/ | « ch » français |
| zh | /ʒ/ | « j » français |
| h | /h/ | h soufflé, toujours prononcé |
| v | /v/ | comme en français |
| m n | /m n/ | |
| r | /r/ | **roulé** avec la pointe de la langue |
| l | /l/ | l clair, jamais vélaire |

Il n'y a ni *f*, ni *w*, ni *y*, ni consonnes doubles. Un *c*, *q* ou *x* n'existent pas dans l'orthographe.

### 2.2 Voyelles

| Brèves | Longues |
|---|---|
| a /a/ | â /aː/ |
| o /ɔ/ | ô /oː/ |
| u /u/ (« ou ») | û /uː/ |
| — | î /iː/ |

- La longueur est **phonémique** : *mârok* « sombre » et *marok* (registre bas) sont le même mot, mais *zâr* « lier » et *zar-* (sans longueur) ne se confondent pas avec *zârâ* « lie ! ».
- *i* bref n'existe que dans quelques particules ; *î* n'apparaît qu'en syllabe longue : *drîm, lîth, thîz*.
- Diphtongues : *ai, au, ôi* (rares, surtout dans les noms propres).

### 2.3 Structure de la syllabe

(C)(C) V (C)(C)

- **Attaques doubles** autorisées : consonne + *r* ou *l* (*kr-, gr-, dr-, thr-, khr-, ghr-, zr-, zhr-, shr-, gl-, kl-, sl-*), et *zg-, zd-, zl-*.
- **Codas doubles** autorisées : *-rz, -rk, -rg, -rgh, -rkh, -lk, -lg, -zg, -sht, -nd, -mb, -ng, -rn, -rm*.
- Interdits : trois consonnes de suite à l'intérieur d'un mot (on insère *-a-*), deux voyelles en contact (on insère *-h-*).

### 2.4 Accent

L'accent frappe **la première voyelle longue** du mot. S'il n'y en a pas, il frappe la première syllabe.

> *ghâzrûn* → GHÂZ-rûn ; *zârôluzardhûm* → ZÂ-rô-lu-zar-dhûm ; *varkh* → VARKH

### 2.5 Le dire à voix haute

Pour que ça sonne comme dans les films, tout se joue dans la gorge et dans le rythme.

- **kh** et **gh** viennent du fond de la gorge, comme un raclement ; *gh* est un grondement, pas un « r ».
- **r** est roulé dur, avec la pointe de la langue, même en fin de mot : *khâr*, *zâr*.
- **Les groupes finaux se détachent** : *vorz* se dit « vor-z », *zhorg* « zhor-g », *ushk* « ush-k ». On ne les avale jamais.
- **Les voyelles longues se tiennent**, basses, dans la poitrine, sans chanter : *mâr* n'est pas « mar » mais « maaar », grondé.
- **L'accent est un coup** : la première voyelle longue reçoit un aboiement, le reste du mot retombe.
- **Registre bas** : chaque mot est un coup, sec, et la phrase est courte. *Zhag ! Grâmâr !*
- **Registre haut** : lent, grave, chaque longue tenue un temps, les vers par paires. Pensez à l'inscription de l'Anneau lue à voix basse, depuis la poitrine.
- **Jamais de *e*, jamais de nasale française** : *ghan* se dit « ghann », *ûn* « oun ».

### 2.6 Règles de contact (morphophonologie)

| Règle | Exemple |
|---|---|
| *-a* bref final tombe devant un suffixe à voyelle | *gha* + *-ôk* → **ghôk** « mon » ; *zûga* + *-ar* → **zûgar** « serviteurs » |
| *-ar* pluriel devient *-r* après voyelle | *zûga* → *zûgar* |
| Deux consonnes identiques fusionnent | *zrâg* + *-gor* → **zrâgor** « le Trouveur » |
| Voyelle longue + suffixe à voyelle : on insère *-h-* | *kâ* + *-agh* → *kâhagh* (rare) |

---

## 3. Le nom

Ni article, ni genre. Le nom se construit ainsi :

**RACINE – nombre – cas – totalité**

### 3.1 Nombre

| | Suffixe | Exemple |
|---|---|---|
| singulier | — | *thâl* « tour » |
| pluriel | **-ar** (*-r* après voyelle) | *thâlar* « tours » |
| totalité | **-dhûm** « tous, la totalité de » | *thâlardhûm* « toutes les tours » |

*-dhûm* se place toujours en toute fin de mot, après le cas.

### 3.2 Cas

| Cas | Suffixe | Sens | Exemple |
|---|---|---|---|
| nominatif | — | sujet, attribut | *thâl* |
| génitif | **-ôk** | de, appartenant à | *zhâr thâlôk* « la porte de la tour » |
| locatif | **-zhâ** | dans, en, sur, chez | *thâlzhâ* « dans la tour » |
| allatif | **-tar** | vers, jusqu'à | *thâltar* « vers la tour » |
| ablatif | **-vôr** | de, depuis, hors de | *thâlvôr* « depuis la tour » |
| instrumental | **-ghan** | par, au moyen de | *vorzghan* « par le feu » |
| vocatif | **-â** | ô… (remplace un *-a* final) | *thâlâ* « ô tour », *zûgâ* « ô serviteur » |

Le possesseur **suit** le possédé : *ûkh khârôk* « le nom du seigneur ».

Empilement complet : *îsh-ar-vôr-dhûm* → **îsharvôrdhûm** « de tous les yeux ».

### 3.3 Adjectif

L'adjectif **suit** le nom. Il est invariable au registre bas ; au registre haut il prend *-ar* au pluriel.

> *thâl mârok* « la tour sombre » ; *thâlar mârokar* « les tours sombres » (haut)

- Comparatif : **-îr** → *mârokîr* « plus sombre »
- Superlatif : **-îrdhûm** → *mârokîrdhûm* « le plus sombre de tous »

Nom et adjectif se soudent volontiers en nom propre : **Thâlmârok** « la Tour-Sombre ».

### 3.4 Pronoms

| | sujet | possessif (génitif) | suffixe objet |
|---|---|---|---|
| je | **gha** | ghôk | -am |
| tu | **tha** | thôk | -ot |
| il, elle, ce | **uz** | uzôk | -uz |
| nous | **ghar** | gharôk | -amar |
| vous | **thar** | tharôk | -otar |
| ils, elles | **uzar** | uzarôk | -uzar |

Le pronom sujet indépendant ne s'emploie que pour insister : la personne est déjà marquée sur le verbe.

Démonstratifs : **tâz** « ceci, ici », **dûz** « cela, là ».

Interrogatifs, construits sur **kâ** « quoi, qui » + cas :
*kâzhâ* « où », *kâtar* « vers où », *kâvôr* « d'où ; pourquoi », *kâghan* « comment », *kânâl* « quand ».

---

## 4. Le verbe

Le verbe est le cœur de la langue. Tout s'y accroche, dans cet ordre fixe :

**(NÉGATION) – RACINE – temps/mode – sujet – objet – (totalité)**

### 4.1 Temps et modes

| | Suffixe | Exemple (*zâr* « lier ») |
|---|---|---|
| présent / aoriste | — | *zâr* « il lie » |
| passé | **-ôn** | *zârôn* « il lia » |
| futur | **-ûsh** | *zârûsh* « il liera » |
| parfait ancien (« ce qui fut et demeure ») | **-îm** | *zârîm* « il a lié, et cela tient encore » |
| impératif sg. | **-â** | *zârâ !* « lie ! » |
| impératif pl. | **-âr** | *zârâr !* « liez ! » |
| infinitif / but | **-ôl** | *zârôl* « lier, pour lier » |
| participe actif | **-ân** | *zârân* « liant, qui lie » |
| participe passif | **-ûn** | *zârûn* « lié » |

### 4.2 Sujet

| je | tu | il | nous | vous | ils |
|---|---|---|---|---|---|
| **-agh** | **-ath** | — | **-aghar** | **-athar** | **-ar** |

### 4.3 Objet

| me | te | le | nous | vous | les |
|---|---|---|---|---|---|
| **-am** | **-ot** | **-uz** | **-amar** | **-otar** | **-uzar** |

### 4.4 Négation

Préfixe **nar-** : *narzâr* « il ne lie pas », *narthûlagh* « je ne sais pas ».
*nar-* sert aussi à former des contraires lexicalisés : *narthûl* « oublier » (ne-pas-savoir), *narzrâg* « perdre » (ne-pas-trouver), *nargor* « personne, nul », *narnâl* « jamais ».

### 4.5 Exemples d'empilement

| Forme | Analyse | Sens |
|---|---|---|
| *zâraghot* | zâr-Ø-agh-ot | je te lie |
| *zârônagh* | zâr-ôn-agh | je liai |
| *zrâgûshuzardhûm* | zrâg-ûsh-Ø-uzar-dhûm | il les trouvera tous |
| *zârôluzardhûm* | zâr-ôl-uzar-dhûm | pour les lier tous |
| *narghîmathuz* | nar-ghîm-Ø-ath-uz | tu ne le caches pas |
| *thôrnâr !* | thôrn-âr | venez ! |

Clin d'œil au modèle : **Ûn khrûl zârôluzardhûm** — « Un anneau pour les lier tous ».

### 4.6 Être, avoir, souhaiter

- **Présent** : pas de copule. *Thâl mârok.* « La tour est sombre. » *Ûkh ghôk Varkhôr.* « Mon nom est Varkhôr. »
- **Passé / futur** : verbe **vân** « être ». *Thâl mârok vânôn.* « La tour était sombre. »
- **Avoir** : on dit « chez X est Y » avec le locatif. *Ghazhâ drâkh.* « J'ai une épée » (litt. « en moi, épée »).
- **Souhait (optatif)** : particule **ô** + futur. *Ô nôkh shûlûshot.* « Que la nuit te garde. »

### 4.7 Le Décret

Le mode du **Décret**, suffixe **-ôth**, est la forme par laquelle une Voix fait advenir ce qu'elle dit. Il ne se traduit ni par un souhait ni par un ordre : c'est un constat qui précède le fait.

| Forme | Analyse | Sens |
|---|---|---|
| *Vorz vânôth.* | feu être-DÉCRET | Feu : est. (Et le feu est.) |
| *Thâl ûzgôth.* | tour se.lever-DÉCRET | La tour se dresse. (Et elle se dresse.) |
| *Zhâr krûzôthdhûm.* | porte fermer-DÉCRET-TOT | Toute porte se ferme. |
| *Ûkh thôk narvânôth.* | nom ton néant-DÉCRET | Ton nom n'est plus. |

Le Décret ne prend **pas de suffixe de sujet** : celui qui décrète n'est jamais dans la phrase, parce qu'il est la phrase. Il peut prendre un objet et la totalité.

Dans la bouche d'un mortel, le Décret agit aussi, mais se paie : c'est le **ghâzdôr**, « le prix de la parole » (`monde.md`, § 3). Les serviteurs n'y ont pas accès : au registre bas, *vânôth* n'est qu'un mot de plus.

---

## 5. Syntaxe

- **Ordre : Sujet – Objet – Verbe.** *Nôkh dâl thôk slûgôn.* « La nuit a bu ta lumière. »
- Le **vocatif** ouvre la phrase : *Ô thâlâ, …*
- L'adjectif, le génitif et la relative **suivent** le nom.
- **Relative** : *ûl* « qui, que » + proposition. *Gor ûl tâz grâm* « celui qui marche ici ». Seul, *ûl* signifie « ce qui ».
- **Question** : particule **kâ** en fin de phrase, ou pronom interrogatif en place. *Thûlath kâ ?* « Sais-tu ? »
- **Conjonctions** : *dha* « et », *vai* « ou », *khor* « mais », *zûm* « car », *gûr* « si », *dok* « ainsi, donc », *ûnâl* « jusqu'à ce que ».
- **Registre haut** : les énoncés vont par paires parallèles, le second vers répondant au premier (*Ûl zrâgûn vânôn, zrâgûn vânûsh ; ûl zârûn vânôn, narkrûshûn vânûsh*).

---

## 6. Former des mots

| Suffixe / procédé | Sens | Exemples |
|---|---|---|
| **-ûth** | nom abstrait (de l'adjectif ou du verbe) | *mârokûth* « ténèbres », *mâlûth* « amour », *rûnûth* « sagesse », *zrâgûth* « la quête » |
| **-ok** | adjectif tiré d'un nom | *nârgok* « rouge, sanglant », *vorzok* « ardent », *thîrok* « vrai », *ûnok* « seul, unique » |
| **-gor** | agent, « celui qui » | *zârgor* « le Lieur », *shûlgor* « le Gardien », *lômgor* « le Chanteur » |
| **-drîm** | lieu | *ghâzdrîm* « bouche » (lieu de la voix), *dhôldrîm* « dortoir, tombe » |
| **-ghan** | instrument (figé à partir du cas) | *zârghan* « chaîne », *zhâkghan* « burin » |
| **-ân / -ûn** | participes employés comme adjectifs | *vorzân* « brûlant », *zârûn* « lié » |
| **nar-** | contraire | *narthûl* « oublier », *narvîth* « inanimé » |
| **composition nom + adjectif** | nom propre | *Thâlmârok*, *Khâstrûn* « la Forteresse Ancienne » |
| **composition nom + nom** (le déterminé en premier) | | *Gûrthlûm* « gouffre d'eau », *lûmîsh* « larme » (eau-œil), *dâghdhûm* « le monde » (terre-tout) |
| **dérivation zéro** | même mot nom et verbe | *ghâz* « voix / parler », *lôm* « chant / chanter », *nârkh* « ennemi / haïr », *hûsh* « silence / se taire » |

### Les nombres

| 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 |
|---|---|---|---|---|---|---|---|---|---|
| ûn | tâk | ghrum | nâk | khâl | shûm | drî | dhâk | zhîk | zûl |

11 = *zûlûn*, 12 = *zûltâk*… ; 20 = *tâkzûl*, 30 = *ghrumzûl* ; 100 = *mâz* ; 1000 = *ûlmaz*.
Le nombre précède le nom et le nom reste au singulier : *ghrum thâl* « trois tours ». *Ûn* signifie aussi « oui » (« c'est un, c'est vrai »).

---

## 7. Les trois profondeurs d'un mot

Chaque racine du Ghâzrûn a trois sens superposés, comme une pierre vue à travers l'eau. Le lexique les note pour les racines majeures (colonne « Profondeur »).

| Profondeur | Nom | Qui l'entend | Exemple : *vorz* | Exemple : *zâr* |
|---|---|---|---|---|
| 1 | **sens de gorge** (*zhag*) | tout le monde | feu | lier |
| 2 | **sens de serment** (*ûrzh*) | les Lieurs, les mortels instruits | ardeur, hospitalité, ce qu'on ne laisse pas mourir | obligation |
| 3 | **sens de racine** (*rûn*) | les Voix | ce qui transforme | rendre un |

Les trois profondeurs sont **le même mot**. Un locuteur ne choisit pas la profondeur ; c'est ce qu'il est qui la choisit. Dans un serment, *vorzghan zâraghot* « par le feu je te lie » engage la deuxième profondeur : *par ce qu'on ne laisse pas mourir, je te fais obligation*. Dans un Décret, la troisième : *par ce qui transforme, je te rends un avec moi.*

C'est la source de la « profondeur » que l'on sent dans la langue : un mot simple y est toujours lourd de ce qu'il pourrait faire. Pour écrire en Ghâzrûn, choisir un mot, c'est choisir trois choses à la fois.

---

## 8. Densité : dire beaucoup en peu de mots

La grammaire a été taillée pour que chaque syllabe compte, comme en latin mais plus loin : **pas d'article, pas de pronom sujet, pas de copule au présent, pas de préposition**, et un objet qui s'accroche au verbe.

| Ghâzrûn | Mots | Français |
|---|---|---|
| *Drâkhghan mûrkônaghuz.* | 2 | C'est avec l'épée que je l'ai tué. |
| *Thâl mârok.* | 2 | La tour est sombre. |
| *Zrâgûshaghuzardhûm.* | 1 | Je les trouverai tous. |
| *Khâr thâlzhâ dhâr.* | 3 | Le seigneur attend dans la tour. |
| *Nôkhzhâ narzhâlath, khor khôrath.* | 4 | Dans la nuit tu ne vois pas, mais tu entends. |
| *Ûkh thôk kâ ?* | 3 | Comment t'appelles-tu ? |
| *Gûr grâmath, ghûmath.* | 3 | Si tu y vas, tu meurs. |
| *Ô thâlâ, dhârâ.* | 3 | Ô tour, demeure. |

Les mots pleins sont pour la plupart monosyllabiques, et les mots longs sont toujours des **empilements lisibles** : *zrâg-ûsh-agh-uzar-dhûm*. L'outil `outils/ghazrun.py analyse` découpe n'importe quelle forme.

---

## 9. Noms propres

Un nom se bâtit par composition ou par suffixe d'agent. Le registre haut aime les noms à deux voyelles longues.

**Personnes**
- **Zârgor** — « le Lieur », titre des maîtres de serment
- **Mârokhâr** — « Seigneur-Sombre » (*mârok* + *khâr*), chef des Voix de la Nuit
- **Ghâzûlâr** — « Haute-Voix », le héraut
- **Nôkhzhâl** — « Qui-voit-la-nuit », la Lieuse en chef
- **Krâzdrâng** — « Pierre-Forte »
- **Vrôzân** — « la Flamboyante », Voix non déchue
- **Varkhôr** — « Guerrier-du-soleil » (*varkh* + *kôr*, consonnes fusionnées)
- **Lûmîshâ** — « Larme » (vocatif figé en prénom)

**Lieux**
- **Thâlmârok** — la Tour-Sombre
- **Zhârdhûm** — la Porte-de-Tout
- **Gûrthlûm** — le Gouffre d'Eau
- **Khâstrûn** — la Forteresse Ancienne
- **Ghrânzhôr** — la Forêt d'Ombre
- **Zhorgvorz** — la Montagne de Feu

---

## 10. L'écriture : les *zhâkar*

L'alphabet est dessiné dans `alphabet.svg` et décrit dans `alphabet.md`. En résumé :

- Une écriture **taillée à la lame** dans la pierre, le fer et l'os : entailles droites, traits lourds, angles vifs, jamais tout à fait nets. Pas de courbe, la lame ne tourne pas.
- C'est un **abugida** : on grave les consonnes, les voyelles se taillent dessus. Une entaille = brève, deux = longue, trois = vocatif.
- **Vingt signes**, par familles : hampe pour les occlusives, racine sous la ligne pour les sonores, griffe refermée pour les fricatives de gorge, foudre pour les sifflantes, portique pour les nasales, crochet et talon pour les liquides.
- Un mot qui commence par une voyelle s'appuie sur **le signe muet**, un coup de lame brisé.
- Un **coup de pointe** ferme le mot, une **ligne brisée** sépare les vers. Sur la pierre on grave de droite à gauche, « vers la porte ».
- Les signes furent inventés pour les serviteurs : un mot gravé lie, mais ne fait pas (`monde.md`, § 7).

---

## 11. Outils

Deux scripts Python sans dépendance, dans `outils/` :

```
python3 outils/ghazrun.py nom thâl --table                 # toutes les formes d'un nom
python3 outils/ghazrun.py verbe zâr --table                # toutes les formes d'un verbe
python3 outils/ghazrun.py verbe zrâg --mode inf --objet 3p --tout   # zrâgôluzardhûm
python3 outils/ghazrun.py verbe vân --mode decret          # vânôth
python3 outils/ghazrun.py mot feu                          # cherche en français ou en ghâzrûn
python3 outils/ghazrun.py analyse zârôluzardhûm            # découpe en morphèmes
python3 outils/ghazrun.py bas "Mârokûth nâldhûmzhâ"        # registre bas
python3 outils/zhakar.py "Vorzghan zâraghot" -o serment.svg   # écriture en SVG
```

## 12. Pour aller plus loin

- L'univers (les Voix, ce que fait un mot, les serments) est dans `monde.md`.
- L'écriture est dans `alphabet.md` et `alphabet.svg`.
- Le lexique complet est dans `lexique.md` et `lexique.csv`.
- Les textes glosés (inscription, serment, lamentation, phrases de tous les jours, bénédiction) sont dans `textes.md`.
