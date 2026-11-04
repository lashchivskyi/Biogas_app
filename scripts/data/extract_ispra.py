"""
Builds the Italian biowaste back-test set: ISPRA Rapporto Rifiuti Urbani (per-region tables "Impianti di trattamento integrato
anaerobico/aerobico" and "Impianti di digestione anaerobica": measured biogas Nm³/a) joined with the ISPRA Catasto rifiuti plant list
(tonnage by fraction) on municipality and total treated tonnage. Fresh mass only (no DM/VS, no CH4 %).
Read-only summary by default; --write updates src/countries/data/ispra-biowaste.json.

Usage: pdftotext -layout <report.pdf> <report.txt>  (ISPRA report PDF, 17.8 MB)
       python -I scripts/data/extract_ispra.py --report <report.txt> --csv <getDettaglioImpianto.csv> [--year 2024] [--write]
"""
import argparse, datetime, json, re
from pathlib import Path

REPORT = "https://www.isprambiente.gov.it/it/pubblicazioni/rapporti/rapporto-rifiuti-urbani-edizione-2025"
CSV = "https://www.catasto-rifiuti.isprambiente.it/gestione/getDettaglioImpianto.csv.php?&aa=2024"
TARGET = Path(__file__).resolve().parents[2] / "src/countries/data/ispra-biowaste.json"

parser = argparse.ArgumentParser(description=__doc__)
parser.add_argument("--report", type=Path, required=True)
parser.add_argument("--csv", type=Path, required=True)
parser.add_argument("--year", type=int, default=2024)
parser.add_argument("--write", action="store_true")
args = parser.parse_args()

num = lambda s: float(s.replace(".", "").replace(",", "."))

# Catasto CSV: one section per plant type, Italian number format.
rows, section = [], None
for line in args.csv.read_text(encoding="latin-1").splitlines():
    t = line.strip().strip(";").strip()
    if not t:
        continue
    if ";" not in t:
        section = t
        continue
    f = [x.strip() for x in t.split(";")]
    if f[0] == "Regione" or section not in ("Trattamento integrato aerobico e anaerobico", "Digestione anaerobica"):
        continue
    try:
        if section.startswith("Tratt"):
            food, green, _ru, sludge, other, total = (num(x) for x in f[3:9])
        else:  # AD-only plants report food + green together as "Frazione organica RU"
            food, sludge, other, total = (num(x) for x in f[3:7]); green = 0.0
    except (ValueError, IndexError):
        continue
    rows.append({"region": f[0], "comune": f[2], "kind": "integrated" if section.startswith("Tratt") else "ad_only",
                 "foodT": food, "greenT": green, "sludgeT": sludge, "otherT": other, "totalT": total})

# Report tables: total treated (second number of the row) and biogas (first value above the treated tonnage: tonnage splits,
# digestate and rejects are smaller; biomethane and energy follow it on the same line).
gas, inside = [], False
for line in args.report.read_text(encoding="utf-8", errors="replace").splitlines():
    if re.search(r"Tabella [\d\.]+\s*\W*\s*Impianti di (trattamento integrato anaerobico/aerobico|digestione anaerobica) dei rifiuti", line):
        inside = True
        continue
    if inside and line.strip().startswith("Totale"):
        inside = False
        continue
    m = inside and re.match(r"^\s*([A-Z]{2})\s+(.+?)\s+(?:\(\d+\)\s+)?(\d[\d\.]*)\s+(\d[\d\.]*)\s+(.*)$", line)
    if not m:
        continue
    total = num(m.group(4))
    nums = [num(x) for x in re.findall(r"(?<![\(\d])(\d{1,3}(?:\.\d{3})+|\d+)(?![\)\d])", m.group(5))]
    gas.append({"comune": re.sub(r"\s*\(\d+\)\s*$", "", m.group(2).strip()), "totalT": total, "biogasNm3": next((x for x in nums if x > total), None)})

key = lambda s: re.sub(r"[^A-Z]", "", s.upper().translate(str.maketrans("ÀÈÉÌÒÙ", "AEEIOU")))
plants = []
for g in gas:
    cand = [r for r in rows if key(r["comune"]) == key(g["comune"]) and abs(r["totalT"] - g["totalT"]) <= 2]
    if len(cand) == 1 and g["biogasNm3"]:
        plants.append({**cand[0], "biogasNm3": g["biogasNm3"]})
print(f"{len(rows)} plants in the list, {len(gas)} report rows, {len(plants)} joined with a biogas value")
out = {
    "description": "ISPRA, Italian biowaste plants: tonnage by fraction (Catasto rifiuti) and measured biogas (Rapporto Rifiuti Urbani "
                   "per-region tables), joined on municipality and total tonnage. Fresh mass; biogas Nm³/a, CH4 share not published. "
                   "Integrated plants also compost: part of their green waste may never reach the digester. Public environmental "
                   "information, reused with citation.",
    "source": REPORT, "csv": CSV, "dataYear": args.year, "retrievedOn": datetime.date.today().isoformat(), "plants": plants,
}
if args.write:
    TARGET.write_text(json.dumps(out, ensure_ascii=False, indent=1) + "\n", encoding="utf-8")
    print("written", TARGET)
