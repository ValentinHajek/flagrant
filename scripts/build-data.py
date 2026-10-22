"""Génère data/countries.json depuis le dataset mledoze/countries (source de REST Countries).
Usage : curl -sL https://raw.githubusercontent.com/mledoze/countries/master/countries.json -o /tmp/c.json
        python3 scripts/build-data.py /tmp/c.json   (écrit public/data/countries.json)
"""
import json, sys

REGIONS = {"Africa": "Afrique", "Americas": "Amériques", "Asia": "Asie", "Europe": "Europe",
           "Oceania": "Océanie", "Antarctic": "Antarctique"}

# Territoires dont le drapeau est celui du pays parent : exclus du mode drapeaux.
SAME_FLAG = {"BV", "SJ", "HM", "MF", "UM", "GP", "MQ", "GF", "RE", "YT"}

# Noms courants qu'on tape spontanément.
ALIASES = {
    "US": ["USA", "Amérique", "États-Unis d'Amérique"], "GB": ["Angleterre", "UK", "Grande-Bretagne"],
    "CZ": ["République tchèque"], "MK": ["Macédoine"], "CI": ["Côte d'Ivoire", "Ivory Coast"],
    "CD": ["RDC", "Congo Kinshasa"], "CG": ["Congo Brazzaville"], "KR": ["Corée", "Corée du Sud"],
    "KP": ["Corée du Nord"], "NL": ["Hollande"], "MM": ["Birmanie"], "SZ": ["Swaziland"],
    "TL": ["Timor oriental"], "CV": ["Cap-Vert"], "AE": ["Émirats", "EAU"], "VA": ["Vatican"],
    "BA": ["Bosnie"], "DO": ["République dominicaine"], "CF": ["Centrafrique"],
}

src = json.load(open(sys.argv[1]))
out = []
for c in src:
    fr = c["translations"]["fra"]
    tld = next((t for t in c["tld"] if t.isascii()), None)
    out.append({
        "code": c["cca2"],
        "nom": fr["common"],
        "alias": sorted({fr["official"], *ALIASES.get(c["cca2"], [])} - {fr["common"]}),
        "tld": tld,
        "region": REGIONS.get(c["region"], c["region"]),
        "sousRegion": c.get("subregion") or c["region"],
        "souverain": bool(c["independent"]),
        "drapeau": c["cca2"] not in SAME_FLAG,
    })

# Extension partagée (ex. .fr pour Saint-Martin) : on la garde pour le pays souverain seulement.
tlds = [c["tld"] for c in out]
for c in out:
    if tlds.count(c["tld"]) > 1 and not c["souverain"]:
        c["tld"] = None

out.sort(key=lambda c: c["nom"])
json.dump(out, open("public/data/countries.json", "w"), ensure_ascii=False, indent=1)
print(len(out), "pays/territoires,", sum(c["tld"] is not None for c in out), "extensions")
