#!/usr/bin/env python3
"""Rend un texte en Ghâzrûn dans l'écriture gravée (zhâkar), au format SVG.

Usage :
    python3 zhakar.py "Vorzghan zâraghot" -o sortie.svg
    python3 zhakar.py --alphabet -o alphabet.svg     # table complète des signes
    python3 zhakar.py --inscription "Ûn zhâr, ûn ghâz" -o linteau.svg  # de droite à gauche

Principe du système : chaque consonne est un signe carré (« l'os »), chaque voyelle
une entaille portée au-dessus de la consonne qui la précède (« la chair »).
Une entaille = voyelle brève, deux = voyelle longue, trois = vocatif.
Un mot qui commence par une voyelle s'appuie sur le signe muet (un trait vertical).
Un point sous la ligne ferme le mot ; un trait horizontal sépare les vers.
"""
import argparse
import re
import sys

# Chaque consonne : liste de segments ((x1,y1),(x2,y2)) sur une grille 4x4.
# Système : une sonore = la sourde + barre de base ; une fricative = l'occlusive fermée.
CONS = {
    # occlusives : un linteau (barre haute) ; la sonore ajoute la barre de base
    'p':  [((0,0),(4,0)), ((0,0),(0,4)), ((4,0),(4,2)), ((4,2),(2,2))],
    'b':  [((0,0),(4,0)), ((0,0),(0,4)), ((4,0),(4,2)), ((4,2),(2,2)), ((0,4),(4,4))],
    't':  [((0,0),(4,0)), ((2,0),(2,4)), ((0,0),(0,2))],
    'd':  [((0,0),(4,0)), ((2,0),(2,4)), ((0,0),(0,2)), ((0,4),(4,4))],
    'k':  [((0,0),(4,0)), ((0,0),(0,4)), ((4,0),(2,2)), ((2,2),(4,4))],
    'g':  [((0,0),(4,0)), ((0,0),(0,4)), ((4,0),(2,2)), ((2,2),(4,4)), ((0,4),(4,4))],
    # fricatives de gorge : l'occlusive fermée sur la droite
    'kh': [((0,0),(4,0)), ((0,0),(0,4)), ((4,0),(2,2)), ((2,2),(4,4)), ((4,0),(4,4))],
    'gh': [((0,0),(4,0)), ((0,0),(0,4)), ((4,0),(2,2)), ((2,2),(4,4)), ((4,0),(4,4)), ((0,4),(4,4))],
    'th': [((0,0),(4,0)), ((2,0),(2,4)), ((0,0),(0,2)), ((0,2),(4,2))],
    'dh': [((0,0),(4,0)), ((2,0),(2,4)), ((0,0),(0,2)), ((0,2),(4,2)), ((0,4),(4,4))],
    # sifflantes : marches et zigzags
    's':  [((1,0),(4,0)), ((1,0),(1,2)), ((1,2),(4,2)), ((4,2),(4,4))],
    'z':  [((0,0),(4,0)), ((4,0),(0,2)), ((0,2),(4,4))],
    'sh': [((1,0),(4,0)), ((1,0),(1,2)), ((1,2),(4,2)), ((4,2),(4,4)), ((2,2),(2,4))],
    'zh': [((0,0),(4,0)), ((4,0),(0,2)), ((0,2),(4,4)), ((0,2),(0,4))],
    'h':  [((0,0),(0,4)), ((0,2),(4,2)), ((4,2),(4,4))],
    'v':  [((0,0),(0,2)), ((0,2),(2,4)), ((2,4),(4,2)), ((4,2),(4,0))],
    # nasales : le portique ; m ajoute le pilier central
    'n':  [((0,4),(0,0)), ((0,0),(4,0)), ((4,0),(4,4))],
    'm':  [((0,4),(0,0)), ((0,0),(4,0)), ((4,0),(4,4)), ((2,0),(2,4))],
    # liquides
    'r':  [((0,0),(4,0)), ((2,0),(2,4)), ((2,2),(4,4))],
    'l':  [((0,0),(0,4)), ((0,4),(4,4)), ((4,4),(4,2))],
    # signe muet : porte une voyelle initiale
    '_':  [((2,1),(2,4))],
}
CONS_ORDER = ['p','b','t','d','k','g','kh','gh','th','dh','s','z','sh','zh','h','v','m','n','r','l','_']
NOMS = {'p':'pâ','b':'bâ','t':'tâ','d':'dâ','k':'kâ','g':'gâ','kh':'khâ','gh':'ghâ','th':'thâ','dh':'dhâ',
        's':'sâ','z':'zâ','sh':'shâ','zh':'zhâ','h':'hâ','v':'vâ','m':'mâ','n':'nâ','r':'râ','l':'lâ','_':'hûsh (muet)'}

# Entailles de voyelle : forme selon la qualité, nombre selon la longueur.
# Chaque entaille est une liste de segments dans une boîte 1x1 (y vers le haut, au-dessus du signe).
VOY = {
    'a': [((0.5,0),(0.5,1))],                       # trait vertical
    'o': [((0,0.5),(1,0.5))],                       # trait horizontal
    'u': [((0,0),(1,1))],                           # diagonale
    'i': [((0,0),(1,0)),((1,0),(1,1)),((1,1),(0,1)),((0,1),(0,0))],  # petit carré
}
LONG = {'â':'a','ô':'o','û':'u','î':'i'}

TOKEN = re.compile(r"kh|gh|th|dh|sh|zh|[pbtdkgszhvmnrl]|[aouiâôûî]|[^\w]", re.I)

def tokenize(word):
    """Découpe un mot romanisé en (consonne, [voyelles]) ; la voyelle se pose sur la consonne précédente."""
    toks = [t.lower() for t in TOKEN.findall(word) if t.strip()]
    cells = []
    for t in toks:
        if t in CONS:
            cells.append([t, []])
        elif t in VOY or t in LONG:
            if not cells:
                cells.append(['_', []])
            cells[-1][1].append(t)
        else:
            raise ValueError(f"caractère inconnu dans le Ghâzrûn : {t!r} (dans {word!r})")
    return cells

def seg_path(segs, ox, oy, s):
    d = []
    for (x1,y1),(x2,y2) in segs:
        d.append(f"M{ox+x1*s:.1f},{oy+y1*s:.1f}L{ox+x2*s:.1f},{oy+y2*s:.1f}")
    return "".join(d)

def draw_cell(cons, vowels, ox, oy, s, vocatif=False):
    """Dessine un signe et ses entailles. Renvoie le fragment SVG."""
    out = [f'<path d="{seg_path(CONS[cons], ox, oy+2*s, s)}"/>']
    # entailles au-dessus, de gauche à droite
    x = ox
    for v in vowels:
        base = LONG.get(v, v)
        n = 2 if v in LONG else 1
        if vocatif and base == 'a' and v == 'â':
            n = 3
        for i in range(n):
            out.append(f'<path d="{seg_path(VOY[base], x + i*0.7*s, oy + 0.4*s, 0.6*s)}"/>')
        x += (n*0.7 + 0.3) * s
    return "".join(out)

def render_words(text, s=18, rtl=False, vocatif_words=()):
    """Rend un texte (plusieurs lignes possibles) ; renvoie (svg_body, largeur, hauteur)."""
    lines = [l for l in text.split("\n")]
    body = []
    cell_w, line_h = 5*s, 8*s
    maxw = 0
    for li, line in enumerate(lines):
        words = line.split()
        y = s + li*line_h
        # calcul des largeurs
        rendered = []
        for w in words:
            clean = re.sub(r"[^\wâôûîÂÔÛÎ]", "", w)
            if not clean:
                continue
            cells = tokenize(clean)
            rendered.append((cells, clean))
        xs = []
        x = s
        for cells, clean in rendered:
            xs.append(x)
            x += len(cells)*cell_w + 1.5*s
        total = x
        maxw = max(maxw, total)
        for (cells, clean), x0 in zip(rendered, xs):
            if rtl:
                x0 = total - x0 - len(cells)*cell_w
            voc = clean.lower().endswith('â') and clean.lower() in {v.lower() for v in vocatif_words}
            for ci, (c, vs) in enumerate(cells):
                cx = x0 + (len(cells)-1-ci if rtl else ci)*cell_w
                body.append(draw_cell(c, vs, cx, y, s, vocatif=voc and ci == len(cells)-1))
            # point de fin de mot
            px = x0 - 0.6*s if rtl else x0 + len(cells)*cell_w + 0.2*s
            body.append(f'<rect x="{px:.1f}" y="{y+6.4*s:.1f}" width="{0.5*s:.1f}" height="{0.5*s:.1f}"/>')
        if li < len(lines)-1:
            body.append(f'<path d="M{s},{y+7.4*s:.1f}L{total-s:.1f},{y+7.4*s:.1f}" stroke-width="{0.12*s:.2f}"/>')
    return "".join(body), maxw, s + len(lines)*line_h

def svg_wrap(body, w, h, s):
    return (f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {w:.0f} {h:.0f}" width="{w:.0f}" height="{h:.0f}">'
            f'<rect width="100%" height="100%" fill="#f3efe6"/>'
            f'<g fill="#1d1a16" stroke="#1d1a16" stroke-width="{0.28*s:.2f}" stroke-linecap="square" stroke-linejoin="miter">'
            f'{body}</g></svg>')

def alphabet_svg(s=16):
    body = []
    cols = 7
    cw, ch = 8.5*s, 10*s
    for i, c in enumerate(CONS_ORDER):
        col, row = i % cols, i // cols
        ox, oy = s + col*cw, s + row*ch
        body.append(draw_cell(c, [], ox + 1.5*s, oy, s))
        label = c if c != '_' else 'muet'
        body.append(f'<text x="{ox+3.5*s:.1f}" y="{oy+8.2*s:.1f}" font-family="serif" font-size="{1.3*s:.0f}" '
                    f'text-anchor="middle" stroke="none">{label} · {NOMS[c]}</text>')
    rows = (len(CONS_ORDER)+cols-1)//cols
    # voyelles
    oy = s + rows*ch + s
    body.append(f'<text x="{s}" y="{oy+s:.0f}" font-family="serif" font-size="{1.4*s:.0f}" stroke="none">Entailles de voyelle (portées au-dessus de la consonne) : une = brève, deux = longue, trois = vocatif</text>')
    demo = [('a','a / â'),('o','o / ô'),('u','u / û'),('i','i / î')]
    for j,(v,lab) in enumerate(demo):
        ox = s + j*cw*1.2
        body.append(draw_cell('k', [v], ox+1.5*s, oy+2*s, s))
        body.append(draw_cell('k', [LONG_INV[v]], ox+1.5*s+5.5*s, oy+2*s, s))
        body.append(f'<text x="{ox+5*s:.1f}" y="{oy+10.2*s:.1f}" font-family="serif" font-size="{1.3*s:.0f}" text-anchor="middle" stroke="none">k{lab}</text>')
    # vocatif
    ox = s + 4*cw*1.2
    body.append(draw_cell('l', ['â'], ox+1.5*s, oy+2*s, s, vocatif=True))
    body.append(f'<text x="{ox+3.5*s:.1f}" y="{oy+10.2*s:.1f}" font-family="serif" font-size="{1.3*s:.0f}" text-anchor="middle" stroke="none">lâ (vocatif)</text>')
    # exemple de mot
    oy2 = oy + 12*s
    body.append(f'<text x="{s}" y="{oy2+s:.0f}" font-family="serif" font-size="{1.4*s:.0f}" stroke="none">Exemple : Ghâzrûn (point = fin de mot)</text>')
    b, w, h = render_words("Ghâzrûn", s)
    body.append(f'<g transform="translate(0,{oy2+1.5*s:.0f})">{b}</g>')
    W = s + cols*cw + s
    H = oy2 + 1.5*s + h + s
    return svg_wrap("".join(body), W, H, s)

LONG_INV = {v:k for k,v in LONG.items()}

def main():
    ap = argparse.ArgumentParser(description="Écriture gravée du Ghâzrûn (zhâkar) en SVG.")
    ap.add_argument("texte", nargs="?", help="texte en Ghâzrûn romanisé ; \\n pour un nouveau vers")
    ap.add_argument("-o", "--out", default="-", help="fichier SVG de sortie (défaut : stdout)")
    ap.add_argument("--alphabet", action="store_true", help="dessiner la table des signes")
    ap.add_argument("--inscription", action="store_true", help="graver de droite à gauche (style lapidaire)")
    ap.add_argument("--vocatif", nargs="*", default=[], help="mots à marquer de l'entaille triple (ex. thâlâ)")
    ap.add_argument("-s", "--taille", type=int, default=18, help="taille d'une unité de grille")
    a = ap.parse_args()
    if a.alphabet:
        svg = alphabet_svg(a.taille)
    elif a.texte:
        body, w, h = render_words(a.texte.replace("\\n", "\n"), a.taille, rtl=a.inscription, vocatif_words=a.vocatif)
        svg = svg_wrap(body, w, h, a.taille)
    else:
        ap.error("donner un texte ou --alphabet")
    if a.out == "-":
        sys.stdout.write(svg)
    else:
        open(a.out, "w", encoding="utf-8").write(svg)

if __name__ == "__main__":
    main()
