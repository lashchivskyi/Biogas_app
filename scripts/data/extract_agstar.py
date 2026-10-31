"""
Builds the production back-test set from the EPA AgSTAR Livestock Anaerobic Digester Database (public xlsx).
Keeps operational farm-scale digesters on one animal type (dairy or swine) without co-digestion, with a
reported electricity generation (CHP/electricity end use) or an AgSTAR biogas generation estimate.
Read-only summary by default; --write updates src/countries/data/agstar-backtest.json. Needs openpyxl.

Usage: python -I scripts/data/extract_agstar.py [--file local.xlsx] [--write]
"""
import argparse, datetime, json, tempfile, urllib.request
from pathlib import Path

URL = "https://www.epa.gov/sites/default/files/2020-10/agstar-livestock-ad-database.xlsx"
PAGE = "https://www.epa.gov/agstar/livestock-anaerobic-digester-database"
TARGET = Path(__file__).resolve().parents[2] / "src/countries/data/agstar-backtest.json"
CUFT_M3 = 0.0283168466  # 1 ft³ in m³ (exact definition 0.3048³)

parser = argparse.ArgumentParser(description=__doc__)
parser.add_argument("--file", type=Path, help="local copy of the AgSTAR xlsx (default: download)")
parser.add_argument("--data-through", default="2024-06", help="period stated on the AgSTAR page")
parser.add_argument("--write", action="store_true")
args = parser.parse_args()

import openpyxl  # noqa: E402

path = args.file
if path is None:
    tmp = Path(tempfile.mkdtemp()) / "agstar.xlsx"
    req = urllib.request.Request(URL, headers={"User-Agent": "Mozilla/5.0 Methalytics data refresh"})
    tmp.write_bytes(urllib.request.urlopen(req, timeout=60).read())
    path = tmp

wb = openpyxl.load_workbook(path, read_only=True, data_only=True)
rows = list(wb["Operational and Construction"].iter_rows(values_only=True))
head = rows[0]
records = [dict(zip(head, r)) for r in rows[1:]]


def num(v):
    try:
        return float(v)
    except (TypeError, ValueError):
        return 0.0


out = []
for r in records:
    if r.get("Status") != "Operational" or r.get("Project Type") != "Farm Scale":
        continue
    if r.get("Co-Digestion") not in (None, "", "None"):
        continue
    herds = {k: num(r.get(k)) for k in ("Cattle", "Dairy", "Poultry", "Swine")}
    present = [k for k, v in herds.items() if v > 0]
    if present not in (["Dairy"], ["Swine"]):
        continue
    year = int(num(r.get("Year Operational")))
    use = str(r.get("Biogas End Use(s)") or "")
    electricity = num(r.get("Electricity Generated (kWh/yr)"))
    biogas = num(r.get("Biogas Generation Estimate (cu-ft/day)"))
    # Electricity only where power is the end use and the plant has had at least one full year.
    el_ok = electricity > 0 and ("Electricity" in use or "Cogeneration" in use) and 0 < year <= 2022
    if not el_ok and biogas <= 0:
        continue
    out.append({
        "name": r.get("Project Name"),
        "state": r.get("State"),
        "animal": "dairy" if present == ["Dairy"] else "swine",
        "head": int(herds[present[0]]),
        "digester": r.get("Digester Type"),
        "year": year or None,
        "endUse": use,
        **({"electricityKwhYear": round(electricity)} if el_ok else {}),
        **({"biogasM3Day": round(biogas * CUFT_M3, 1)} if biogas > 0 else {}),
    })

data = {
    "description": "EPA AgSTAR Livestock Anaerobic Digester Database: operational farm-scale digesters, one animal type, no co-digestion. "
                   "Values are compiled by AgSTAR from voluntary sources and are not metered or verified; biogas is an AgSTAR estimate. "
                   "Swine heads are taken as finishing places (the database does not split sows).",
    "source": PAGE,
    "file": URL,
    "dataThrough": args.data_through,
    "retrievedOn": datetime.date.today().isoformat(),
    "rows": out,
}
el = sum(1 for r in out if "electricityKwhYear" in r)
bg = sum(1 for r in out if "biogasM3Day" in r)
print(f"{len(out)} digesters: {el} with electricity, {bg} with a biogas estimate")
if args.write:
    TARGET.write_text(json.dumps(data, indent=1, ensure_ascii=False) + "\n", encoding="utf-8")
    print(f"wrote {TARGET}")
