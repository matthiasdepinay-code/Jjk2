# Ghâzrûn — « la Voix profonde »

*Langue de fiction inspirée du Noir Parler de Tolkien : des consonnes de gorge, des suffixes qui s'empilent, mais aussi des voyelles longues, des liquides et des parallélismes qui lui donnent une solennité ancienne.*

| Fichier | Contenu |
|---|---|
| `README.md` | Présentation, phonologie, grammaire complète, formation des noms |
| `lexique.md` | Lexique classé par thème (~190 entrées) |
| `lexique.csv` | Le même lexique, exploitable par script |
| `textes.md` | Textes avec traduction et glose mot à mot |

---

## 1. Esprit de la langue

Le Ghâzrûn (*ghâz* « voix » + *rûn* « profond, ancien ») est la langue d'un peuple de l'ombre, forgée par une puissance ancienne pour commander, jurer et graver. Elle a deux visages :

- **Le registre haut** (*Ghâzrûn ûlâr*, « la voix haute ») : langue des serments, des inscriptions et des chants. Les voyelles longues y sont toutes prononcées, les phrases s'ouvrent sur un vocatif, les vers se répondent en parallèle.
- **Le registre bas** (*Ghâzrûn zhag*, « la voix de gorge ») : parler des soldats et des serviteurs. Les mots sont les mêmes, mais clipsés : seule la première voyelle longue d'un mot garde sa longueur.

> *Mârokûth nâldhûmzhâ* (haut) → *Mârokuth nâldhumzha* (bas) — « les ténèbres, pour toujours »

Ce qui rend la langue « ancienne et belle » tient à quelques choix délibérés :

1. **Pas de voyelle *e*.** Le système est fermé, grave : *a, o, u* et leurs longues.
2. **Les voyelles longues portent l'accent** et donnent au discours un rythme lent, psalmodié.
3. **Les fricatives sonores *gh, dh, zh*** adoucissent la dureté des groupes *kr-, zg-, -rz*.
4. **Les suffixes s'empilent** comme dans le Noir Parler : *zâr-ôl-uzar-dhûm* « pour-les-lier-tous ».
5. **La dérivation est régulière** : on peut forger un mot nouveau et il « sonne » juste.

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

### 2.5 Règles de contact (morphophonologie)

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

## 7. Noms propres

Un nom se bâtit par composition ou par suffixe d'agent. Le registre haut aime les noms à deux voyelles longues.

**Personnes**
- **Zârgor** — « le Lieur », titre des maîtres de serment
- **Mârokhâr** — « Seigneur-Sombre » (*mârok* + *khâr*)
- **Ghâzûlâr** — « Haute-Voix », le héraut
- **Nôkhzhâl** — « Qui-voit-la-nuit », nom d'éclaireur
- **Krâzdrâng** — « Pierre-Forte »
- **Vrôzân** — « la Flamboyante / le Flamboyant »
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

## 8. L'écriture : les *zhâkar*

Le Ghâzrûn se grave avant de s'écrire. Ses signes, les **zhâkar** (« marques »), sont faits de traits droits et d'angles, sans courbe, pour mordre la pierre et le métal.

- **Vingt signes de consonnes**, hauts et étroits comme des lames plantées.
- **Les voyelles ne sont pas des lettres** mais des entailles portées sur la consonne qui précède : une entaille pour une brève, deux pour une longue. Un mot sans entaille se lit avec *a*.
- **Un point** sous le signe marque la fin du mot ; **un trait horizontal** sépare les vers.
- Sur les monuments on grave **de droite à gauche**, « vers la porte » ; dans les livres de peau, de gauche à droite.
- Au registre haut, le vocatif *-â* s'écrit avec une entaille triple : c'est le seul signe « ornemental » de l'écriture, réservé aux noms que l'on invoque.

---

## 9. Pour aller plus loin

- Le lexique complet est dans `lexique.md` et `lexique.csv`.
- Les textes glosés (inscription, serment, lamentation, phrases de tous les jours, bénédiction) sont dans `textes.md`.
