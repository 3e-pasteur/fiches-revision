#!/usr/bin/env python3
"""Génère public/search.js : l'index de recherche plein texte du classeur.

À relancer après chaque ajout ou modification d'une fiche :
    python3 tools/build-search.py
Aucune dépendance (Python 3 seulement). Le fichier produit doit être envoyé sur le dépôt avec les fiches.
"""
import html, json, os, re, sys

ROOT = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "public")
FICHES = os.path.join(ROOT, "fiches")
OUT = os.path.join(ROOT, "search.js")

def clean(t):
    t = html.unescape(re.sub(r"<[^>]+>", "", t))
    return re.sub(r"\s+", " ", t).strip()

def course_segments(page):
    m = re.search(r"<main>(.*?)<script>", page, re.S)
    body = m.group(1) if m else page
    body = re.sub(r'<section id="quiz">.*?</section>', "", body, flags=re.S)
    body = re.sub(r"<(svg|style|script|nav)\b.*?</\1>", "", body, flags=re.S)
    body = re.sub(r"</t[dh]>", " · ", body)
    body = re.sub(r"</(p|li|tr|h1|h2|h3|div|section|button)>", "\n", body)
    out, seen = [], set()
    for line in body.split("\n"):
        line = clean(line).strip(" ·")
        if len(line) >= 4 and line not in seen:
            seen.add(line)
            out.append(line)
    return out

def quiz_segments(page):
    segs = []
    m = re.search(r"const QS = \[(.*?)\n\];", page, re.S)
    if not m:
        return segs
    for key in ("q", "w"):
        for lit in re.findall(r'[{,]%s:("(?:[^"\\]|\\.)*")' % key, m.group(1)):
            try:
                text = json.loads(lit).replace("[[", "").replace("]]", "")
            except ValueError:
                continue
            if len(text) >= 4:
                segs.append(text)
    return segs

index = {}
for name in sorted(os.listdir(FICHES)):
    if not name.endswith(".html"):
        continue
    page = open(os.path.join(FICHES, name), encoding="utf-8").read()
    index["fiches/" + name] = {"c": course_segments(page), "q": quiz_segments(page)}

js = "/* Fichier généré par tools/build-search.py : ne pas modifier à la main. */\nconst SEARCH = " + \
     json.dumps(index, ensure_ascii=False, separators=(",", ":")) + ";\n"
open(OUT, "w", encoding="utf-8").write(js)
n_seg = sum(len(v["c"]) + len(v["q"]) for v in index.values())
print("%d fiches, %d passages indexés, %d Ko" % (len(index), n_seg, len(js.encode("utf-8")) // 1024))
