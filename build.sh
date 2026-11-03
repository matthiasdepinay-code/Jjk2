#!/bin/sh
# Fabrique une version mono-fichier du jeu : dist/atelier-des-sceaux.html
set -e
cd "$(dirname "$0")"
mkdir -p dist
python3 - <<'PY'
import re
html = open('index.html', encoding='utf-8').read()
def inline(m):
    src = m.group(1)
    code = open(src, encoding='utf-8').read().replace('</script>', '<\\/script>')
    return '<script>\n' + code + '\n</script>'
html = re.sub(r'<script src="([^"]+)"></script>', inline, html)
open('dist/atelier-des-sceaux.html', 'w', encoding='utf-8').write(html)
print('dist/atelier-des-sceaux.html écrit')
PY
