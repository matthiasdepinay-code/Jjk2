#!/usr/bin/env python3
"""Outil de déclinaison, de conjugaison et de consultation du Ghâzrûn.

Exemples :
    python3 ghazrun.py nom thâl --pl --cas loc --tout          # thâlarzhâdhûm
    python3 ghazrun.py verbe zâr --temps fut --sujet 1s --objet 3p --tout
    python3 ghazrun.py verbe vân --mode decret                 # vânôth
    python3 ghazrun.py mot feu                                 # cherche dans le lexique (fr → ghâzrûn)
    python3 ghazrun.py mot vorz                                # (ghâzrûn → fr)
    python3 ghazrun.py bas "Mârokûth nâldhûmzhâ"               # registre bas
    python3 ghazrun.py analyse zârôluzardhûm                   # découpe une forme

Le lexique est lu dans ../lexique.csv.
"""
import argparse
import csv
import os
import sys
import unicodedata

ICI = os.path.dirname(os.path.abspath(__file__))
LEXIQUE = os.path.join(ICI, "..", "lexique.csv")

VOYELLES = "aouiâôûî"
LONGUES = "âôûî"

# ---------- règles de contact ----------
def coller(base, suffixe):
    """Soude un suffixe à une base en appliquant la morphophonologie."""
    if not suffixe:
        return base
    b, s = base, suffixe
    if s[0] in VOYELLES:
        if b.endswith("a"):              # -a bref final tombe devant voyelle
            b = b[:-1]
        elif b[-1] in LONGUES:           # longue + voyelle : -h- de liaison
            b = b + "h"
    if s == "ar" and b[-1] in VOYELLES:  # pluriel -ar → -r après voyelle
        s = "r"
    if b[-1] == s[0] and s[0] not in VOYELLES:   # consonnes identiques fusionnent
        s = s[1:]
    return b + s

# ---------- nom ----------
CAS = {"nom": "", "gen": "ôk", "loc": "zhâ", "all": "tar", "abl": "vôr", "ins": "ghan", "voc": "â"}
CAS_NOMS = {"nom": "nominatif", "gen": "génitif", "loc": "locatif", "all": "allatif", "abl": "ablatif", "ins": "instrumental", "voc": "vocatif"}

def decliner(nom, pluriel=False, cas="nom", tout=False):
    f = nom
    if pluriel:
        f = coller(f, "ar")
    if cas == "voc":
        f = f[:-1] + "â" if f.endswith("a") else coller(f, "â")
    else:
        f = coller(f, CAS[cas])
    if tout:
        f = coller(f, "dhûm")
    return f

# ---------- verbe ----------
TEMPS = {"pres": "", "passe": "ôn", "fut": "ûsh", "parf": "îm"}
MODES = {"imp": "â", "imp-pl": "âr", "inf": "ôl", "part-act": "ân", "part-pas": "ûn", "decret": "ôth"}
SUJETS = {"": "", "1s": "agh", "2s": "ath", "3s": "", "1p": "aghar", "2p": "athar", "3p": "ar"}
OBJETS = {"": "", "1s": "am", "2s": "ot", "3s": "uz", "1p": "amar", "2p": "otar", "3p": "uzar"}

def conjuguer(racine, temps="pres", mode=None, sujet="", objet="", tout=False, neg=False):
    f = racine
    if mode:
        f = coller(f, MODES[mode])
        if mode in ("imp", "imp-pl", "part-act", "part-pas"):
            sujet = ""
    else:
        f = coller(f, TEMPS[temps])
        f = coller(f, SUJETS[sujet])
    f = coller(f, OBJETS[objet])
    if tout:
        f = coller(f, "dhûm")
    if neg:
        f = "nar" + f
    return f

# ---------- registre bas ----------
def registre_bas(texte):
    """Seule la première voyelle longue de chaque mot garde sa longueur."""
    court = str.maketrans("âôûîÂÔÛÎ", "aouiAOUI")
    mots = []
    for mot in texte.split(" "):
        out, vu = [], False
        for ch in mot:
            if ch in "âôûîÂÔÛÎ":
                if vu:
                    ch = ch.translate(court)
                vu = True
            out.append(ch)
        mots.append("".join(out))
    return " ".join(mots)

# ---------- analyse ----------
def analyser(forme):
    """Découpe une forme en morphèmes connus (heuristique, de droite à gauche)."""
    lex = charger_lexique()
    racines = {r["mot"].lower() for r in lex if r["categorie"].startswith(("v", "n", "adj"))}
    suffixes = [("dhûm", "TOT")] + [(v, f"OBJ.{k}") for k, v in OBJETS.items() if v] \
        + [(v, f"SUJ.{k}") for k, v in SUJETS.items() if v] + [(v, f"{k.upper()}") for k, v in TEMPS.items() if v] \
        + [(v, k.upper()) for k, v in MODES.items()] + [(v, f"CAS.{k}") for k, v in CAS.items() if v] \
        + [("ar", "PL/SUJ.3p"), ("ûth", "ABSTR"), ("ok", "ADJ"), ("gor", "AGENT"), ("drîm", "LIEU"), ("ghan", "INSTR")]
    suffixes.sort(key=lambda x: -len(x[0]))
    f = forme.lower()
    prefixe = []
    if f.startswith("nar") and f[3:] and f[3:] not in racines:
        prefixe.append(("nar", "NÉG")); f = f[3:]

    def rec(reste, acc):
        if reste in racines:
            return [(reste, "racine")] + acc
        if reste + "a" in racines:
            return [(reste + "a", "racine")] + acc
        for s, g in suffixes:
            if reste.endswith(s) and len(reste) - len(s) >= 2:
                base = reste[:-len(s)]
                if base.endswith("h") and base[-2] in LONGUES:
                    base = base[:-1]
                r = rec(base, [(s, g)] + acc)
                if r:
                    return r
        return None
    r = rec(f, [])
    return (prefixe + r) if r else None

# ---------- lexique ----------
def strip_accents(s):
    return "".join(c for c in unicodedata.normalize("NFD", s) if unicodedata.category(c) != "Mn").lower()

def charger_lexique():
    with open(LEXIQUE, encoding="utf-8") as f:
        return list(csv.DictReader(f))

def chercher(mot):
    q = strip_accents(mot)
    res = []
    for r in charger_lexique():
        if strip_accents(r["mot"]) == q:
            res.insert(0, r)
        elif q in strip_accents(r["mot"]) or q in strip_accents(r["sens"]):
            res.append(r)
    return res

# ---------- CLI ----------
def main():
    ap = argparse.ArgumentParser(description="Déclinaison, conjugaison et lexique du Ghâzrûn.")
    sub = ap.add_subparsers(dest="cmd", required=True)

    n = sub.add_parser("nom", help="décliner un nom")
    n.add_argument("nom"); n.add_argument("--pl", action="store_true", help="pluriel")
    n.add_argument("--cas", choices=CAS, default="nom"); n.add_argument("--tout", action="store_true", help="totalité -dhûm")
    n.add_argument("--table", action="store_true", help="afficher toutes les formes")

    v = sub.add_parser("verbe", help="conjuguer un verbe")
    v.add_argument("racine"); v.add_argument("--temps", choices=TEMPS, default="pres")
    v.add_argument("--mode", choices=MODES); v.add_argument("--sujet", choices=[k for k in SUJETS if k], default="")
    v.add_argument("--objet", choices=[k for k in OBJETS if k], default=""); v.add_argument("--tout", action="store_true")
    v.add_argument("--neg", action="store_true"); v.add_argument("--table", action="store_true", help="tableau complet")

    m = sub.add_parser("mot", help="chercher dans le lexique (français ou ghâzrûn)"); m.add_argument("mot")
    b = sub.add_parser("bas", help="convertir au registre bas"); b.add_argument("texte")
    a = sub.add_parser("analyse", help="découper une forme en morphèmes"); a.add_argument("forme")
    args = ap.parse_args()

    if args.cmd == "nom":
        if args.table:
            print(f"{'cas':14}{'singulier':18}{'pluriel':18}{'pluriel + tout'}")
            for c in CAS:
                print(f"{CAS_NOMS[c]:14}{decliner(args.nom, False, c):18}{decliner(args.nom, True, c):18}{decliner(args.nom, True, c, True)}")
        else:
            print(decliner(args.nom, args.pl, args.cas, args.tout))
    elif args.cmd == "verbe":
        if args.table:
            print(f"{'':10}" + "".join(f"{t:14}" for t in TEMPS))
            for s in SUJETS:
                if s:
                    print(f"{s:10}" + "".join(f"{conjuguer(args.racine, t, None, s):14}" for t in TEMPS))
            print()
            for mo in MODES:
                print(f"{mo:10}{conjuguer(args.racine, mode=mo)}")
        else:
            print(conjuguer(args.racine, args.temps, args.mode, args.sujet, args.objet, args.tout, args.neg))
    elif args.cmd == "mot":
        res = chercher(args.mot)
        if not res:
            print("aucune entrée"); return
        for r in res[:15]:
            ligne = f"{r['mot']:18}{r['categorie']:10}{r['sens']}"
            if r.get("note"): ligne += f"   [{r['note']}]"
            print(ligne)
            if r.get("profondeur"): print(f"{'':28}↳ {r['profondeur']}")
    elif args.cmd == "bas":
        print(registre_bas(args.texte))
    elif args.cmd == "analyse":
        r = analyser(args.forme)
        if not r:
            print("forme non reconnue"); return
        print(" - ".join(m for m, _ in r)); print(" - ".join(g for _, g in r))

if __name__ == "__main__":
    main()
