#!/usr/bin/env python3
"""Rend un texte en Ghâzrûn dans son écriture gravée (zhâkar), au format SVG.

Usage :
    python3 zhakar.py "Vorzghan zâraghot" -o sortie.svg
    python3 zhakar.py --alphabet -o alphabet.svg     # table complète des signes
    python3 zhakar.py --inscription "Ûn zhâr, ûn ghâz" -o linteau.svg  # de droite à gauche

Principe du système : chaque consonne est un signe taillé à la lame, en entailles droites
(« l'os »), chaque voyelle une entaille portée au-dessus de la consonne qui la précède
(« la chair »). Une entaille = voyelle brève, deux = voyelle longue, trois = vocatif.
Un mot qui commence par une voyelle s'appuie sur le signe muet (un coup de lame brisé).
Un coup de pointe ferme le mot ; une ligne brisée sépare les vers.
"""
import argparse
import re
import sys

# Chaque consonne est une suite d'entailles droites sur une grille de 4 (largeur) x 6 (hauteur),
# y vers le bas. Les marques de voyelle se taillent au-dessus (y négatif) ; la « racine »
# des sonores descend sous la ligne (y > 6). Pas de courbe : la lame ne tourne pas.
# Commandes : M (lever la lame), L (entaille).
def racine(x):            # pointe de base des consonnes sonores
    return [('M',x,6),('L',x+0.7,7.6)]
STEM1 = [('M',1,0),('L',1,6)]
STEM2 = [('M',2,0),('L',2,6)]
FER_P    = [('M',1,0.4),('L',3.7,1.5),('L',1.2,2.9)]                 # fer de lance sur la hampe
CHAP_T   = [('M',0.2,0.9),('L',2,0),('L',3.8,0.9)]                   # chevron de tête
ARC_TH   = [('M',0.5,2.8),('L',2,2.1),('L',3.5,2.8)]
GRIFFE_K = [('M',1,3.1),('L',3.7,0.4),('L',3.2,3.5)]                 # griffe levée
FERME_K  = [('L',1,3.1)]                                             # la griffe refermée (triangle)
FOUDRE_S = [('M',3.4,0.2),('L',0.6,1.6),('L',3.4,3),('L',0.6,4.4),('L',3.4,5.8)]
FOUDRE_Z = [('M',0.6,0.2),('L',3.4,1.6),('L',0.6,3),('L',3.4,4.4),('L',0.6,5.8)]
CONS = {
    'p':  STEM1 + FER_P,
    'b':  STEM1 + FER_P + racine(1),
    't':  STEM2 + CHAP_T,
    'd':  STEM2 + CHAP_T + racine(2),
    'k':  STEM1 + GRIFFE_K,
    'g':  STEM1 + GRIFFE_K + racine(1),
    'kh': STEM1 + GRIFFE_K + FERME_K,
    'gh': STEM1 + GRIFFE_K + FERME_K + racine(1),
    'th': STEM2 + CHAP_T + ARC_TH,
    'dh': STEM2 + CHAP_T + ARC_TH + racine(2),
    's':  FOUDRE_S,
    'z':  FOUDRE_Z,
    'sh': FOUDRE_S + [('M',0.6,4.4),('L',0.1,7.3)],
    'zh': FOUDRE_Z + [('M',3.4,4.4),('L',3.9,7.3)],
    'h':  [('M',3.3,0.3),('L',0.6,3),('L',3.3,5.7),('M',1.7,3),('L',3.2,3)],
    'v':  [('M',0.3,0.3),('L',2,5.9),('L',3.7,0.3),('M',1,2.9),('L',3,2.9)],
    'n':  [('M',0.6,6),('L',0.6,1),('L',2,0.2),('L',3.4,1),('L',3.4,4.6),('L',2.5,5.5)],
    'm':  [('M',0.4,6),('L',0.4,1),('L',1.3,0.2),('L',2.2,1.5),('L',3.1,0.2),('L',4,1),('L',4,6)],
    'r':  STEM1 + [('M',1,3.3),('L',3.5,4.3),('L',2.2,6.1)],
    'l':  [('M',1,0),('L',1,5.4),('L',3.6,6.3),('L',3.4,4.6)],
    # signe muet (hûsh) : porte une voyelle initiale
    '_':  [('M',1.5,1),('L',2.4,2.4),('L',2.4,6)],
}
CONS_ORDER = ['p','b','t','d','k','g','kh','gh','th','dh','s','z','sh','zh','h','v','m','n','r','l','_']
NOMS = {'p':'pâ','b':'bâ','t':'tâ','d':'dâ','k':'kâ','g':'gâ','kh':'khâ','gh':'ghâ','th':'thâ','dh':'dhâ',
        's':'sâ','z':'zâ','sh':'shâ','zh':'zhâ','h':'hâ','v':'vâ','m':'mâ','n':'nâ','r':'râ','l':'lâ','_':'hûsh (muet)'}

# Entailles de voyelle, dans une boîte 1x1 taillée au-dessus du signe.
# a : entaille verticale ; o : encoche en V ; u : entaille oblique ; i : entaille horizontale.
# Une entaille = brève, deux = longue, trois = vocatif.
VOY = {
    'a': [('M',0.5,0),('L',0.5,1)],
    'o': [('M',0.05,0.15),('L',0.5,1),('L',0.95,0.15)],
    'u': [('M',0.1,0.95),('L',0.9,0.05)],
    'i': [('M',0.05,0.5),('L',0.95,0.5)],
}
LONG = {'â':'a','ô':'o','û':'u','î':'i'}
LONG_INV = {v:k for k,v in LONG.items()}

def _jitter(key, i):
    """Léger désordre déterministe des sommets : la pierre n'est jamais nette."""
    h = (hash(key) * 2654435761 + i * 40503) & 0xffffffff
    return ((h % 1000) / 1000 - 0.5) * 0.22, (((h >> 10) % 1000) / 1000 - 0.5) * 0.22

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

def path_d(cmds, ox, oy, s, key=None):
    out = []
    for n, c in enumerate(cmds):
        k, nums = c[0], c[1:]
        dx, dy = _jitter(key, n) if key else (0, 0)
        pts = [f"{ox + (nums[i]+dx)*s:.1f},{oy + (nums[i+1]+dy)*s:.1f}" for i in range(0, len(nums), 2)]
        out.append(k + " ".join(pts))
    return "".join(out)

CELL_W, CELL_H, MARK_H = 4.8, 7.8, 2.4   # en unités de grille

def draw_cell(cons, vowels, ox, oy, s, vocatif=False):
    """Dessine un signe et ses marques. (ox, oy) = coin haut-gauche de la zone des marques."""
    body_y = oy + MARK_H*s
    out = [f'<path d="{path_d(CONS[cons], ox, body_y, s, key=cons)}"/>']
    x = ox + 0.2*s
    for v in vowels:
        base = LONG.get(v, v)
        n = 2 if v in LONG else 1
        if vocatif and v == 'â':
            n = 3
        for i in range(n):
            out.append(f'<path d="{path_d(VOY[base], x + i*0.85*s, oy + 0.6*s, 0.8*s, key=base+str(i))}"/>')
        x += (n*0.85 + 0.4) * s
    return "".join(out)

def render_words(text, s=18, rtl=False, vocatif_words=()):
    """Rend un texte (plusieurs lignes possibles) ; renvoie (svg_body, largeur, hauteur)."""
    lines = [l for l in text.split("\n")]
    body = []
    cell_w, line_h = CELL_W*s, (CELL_H+MARK_H+1.2)*s
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
            py = y + (MARK_H + 5.9)*s
            body.append(f'<path d="M{px-0.4*s:.1f},{py-0.5*s:.1f}L{px+0.4*s:.1f},{py-0.5*s:.1f}L{px:.1f},{py+0.5*s:.1f}Z" fill="#1d1a16" stroke-width="{0.1*s:.2f}"/>')
        if li < len(lines)-1:
            yy = y + (MARK_H + CELL_H + 0.5)*s
            pts = []
            xx, up = s, False
            while xx < total - s:
                pts.append(f"{xx:.1f},{yy - (0.35*s if up else 0):.1f}")
                xx += 1.6*s; up = not up
            body.append(f'<path d="M' + "L".join(pts) + f'" fill="none" stroke-width="{0.18*s:.2f}"/>')
    return "".join(body), maxw, s + len(lines)*line_h

def svg_wrap(body, w, h, s):
    return (f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {w:.0f} {h:.0f}" width="{w:.0f}" height="{h:.0f}">'
            f'<rect width="100%" height="100%" fill="#e9e2d3"/>'
            f'<g fill="none" stroke="#1d1a16" stroke-width="{0.46*s:.2f}" stroke-linecap="square" stroke-linejoin="miter">'
            f'{body}</g></svg>')

def alphabet_svg(s=16):
    body = []
    cols = 7
    cw, ch = 8.5*s, 13*s
    for i, c in enumerate(CONS_ORDER):
        col, row = i % cols, i // cols
        ox, oy = s + col*cw, s + row*ch
        body.append(draw_cell(c, [], ox + 1.5*s, oy, s))
        label = c if c != '_' else 'muet'
        body.append(f'<text x="{ox+3.5*s:.1f}" y="{oy+11.6*s:.1f}" font-family="serif" font-size="{1.3*s:.0f}" '
                    f'text-anchor="middle" fill="#1d1a16" stroke="none">{label} · {NOMS[c]}</text>')
    rows = (len(CONS_ORDER)+cols-1)//cols
    # voyelles
    oy = s + rows*ch + s
    body.append(f'<text x="{s}" y="{oy+s:.0f}" font-family="serif" font-size="{1.4*s:.0f}" fill="#1d1a16" stroke="none">Entailles de voyelle, taillées au-dessus du signe : une = brève, deux = longue, trois = vocatif</text>')
    demo = [('a','a / â'),('o','o / ô'),('u','u / û'),('i','i / î')]
    for j,(v,lab) in enumerate(demo):
        ox = s + j*cw*1.2
        body.append(draw_cell('k', [v], ox+1.5*s, oy+2*s, s))
        body.append(draw_cell('k', [LONG_INV[v]], ox+1.5*s+5.5*s, oy+2*s, s))
        body.append(f'<text x="{ox+5*s:.1f}" y="{oy+13.6*s:.1f}" font-family="serif" font-size="{1.3*s:.0f}" text-anchor="middle" fill="#1d1a16" stroke="none">k{lab}</text>')
    # vocatif
    ox = s + 4*cw*1.2
    body.append(draw_cell('l', ['â'], ox+1.5*s, oy+2*s, s, vocatif=True))
    body.append(f'<text x="{ox+3.5*s:.1f}" y="{oy+13.6*s:.1f}" font-family="serif" font-size="{1.3*s:.0f}" text-anchor="middle" fill="#1d1a16" stroke="none">lâ (vocatif)</text>')
    # exemple de mot
    oy2 = oy + 15*s
    body.append(f'<text x="{s}" y="{oy2+s:.0f}" font-family="serif" font-size="{1.4*s:.0f}" fill="#1d1a16" stroke="none">Exemple : Ghâzrûn (le coup de pointe ferme le mot)</text>')
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
