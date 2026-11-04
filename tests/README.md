# Bancs d'essai

Ils font tourner le vrai jeu dans un navigateur sans écran (Chromium, avec Playwright) et vérifient ce que font les sorts.

```
npm i -D playwright && npx playwright install chromium   # une fois
node tests/lancer.js                  # tous les bancs
node tests/lancer.js fusions          # un seul
```

| Banc | Ce qu'il vérifie |
|---|---|
| `glyphes` | Chaque forme, modificateur, trajectoire, déclencheur, filtre, cible, taille, dimension, et leurs mélanges. |
| `physique` | La chaleur, l'effondrement, la masse et la flottaison, les chocs. |
| `fusions` | Les 67 fusions sous six formes chacune, puis l'effet précis de quelques-unes. |
| `maintenu` | Le déclencheur Maintenu, avec les phénomènes et avec les sorts simples. |
| `familiers` | Les quatorze familiers et les défauts corrigés. |

Chaque banc est le corps d'une fonction exécutée dans la page, après `lib/banc.js`. Ce fichier pose un terrain plat en l'air et fournit `banc()`, `bete()`, `lance()`, `run()`, `ok()`...

Les outils de `outils/` se lancent à part :

| Outil | Rôle |
|---|---|
| `hasard.js [n] [graine]` | Des centaines de sceaux tirés au hasard. Aucune erreur ne doit sortir. |
| `perf.js [calme\|feu\|eau\|combos]` | Temps de mise à jour et de dessin par image. |
| `endurance.js` | La mémoire au fil d'une longue partie. |
| `traversee.js` | Traversée complète de la carte. Les captures vont dans `tests/captures/`. |
