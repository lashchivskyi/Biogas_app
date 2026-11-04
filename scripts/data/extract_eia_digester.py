"""
Builds the digester-gas engine check: US EIA-923 (generation and fuel, fuel code OBG = digester gas, reciprocating engines "IC")
joined with EIA-860 (operable generators: nameplate MW and unit count per plant). Net generation ÷ fuel for electricity (HHV)
gives the realised efficiency; the nameplate per unit gives the datasheet size and the capacity factor.
Read-only summary by default; --write updates src/countries/data/eia-digester-gas.json. Needs openpyxl.

Usage: python -I scripts/data/extract_eia_digester.py --f923 <EIA923_Schedules_2_3_4_5_M_12_YYYY_Final.xlsx> --f860 <eia860YYYY.zip> [--year 2025] [--write]
Sources: https://www.eia.gov/electricity/data/eia923/  https://www.eia.gov/electricity/data/eia860/
"""
import argparse, datetime, io, json, re, zipfile
from pathlib import Path

TARGET = Path(__file__).resolve().parents[2] / "src/countries/data/eia-digester-gas.json"
parser = argparse.ArgumentParser(description=__doc__)
parser.add_argument("--f923", type=Path, required=True)
parser.add_argument("--f860", type=Path, required=True)
parser.add_argument("--year", type=int, default=2025)
parser.add_argument("--write", action="store_true")
args = parser.parse_args()

import openpyxl  # noqa: E402

# EIA-860: operable OBG reciprocating engines per plant.
z = zipfile.ZipFile(args.f860)
name = next(n for n in z.namelist() if n.startswith("3_1_Generator"))
ws = openpyxl.load_workbook(io.BytesIO(z.read(name)), read_only=True)["Operable"]
rows = ws.iter_rows(values_only=True)
hdr = next(list(r) for r in rows if r and "Plant Code" in r)
c = {k: hdr.index(k) for k in ("Plant Code", "Prime Mover", "Nameplate Capacity (MW)", "Energy Source 1")}
gen = {}
for r in rows:
    if r and r[c["Plant Code"]] is not None and r[c["Energy Source 1"]] == "OBG" and r[c["Prime Mover"]] == "IC":
        g = gen.setdefault(int(r[c["Plant Code"]]), [0, 0.0]); g[0] += 1; g[1] += float(r[c["Nameplate Capacity (MW)"]] or 0)

# EIA-923: annual OBG fuel for electricity (MMBtu, HHV) and net generation (MWh) per plant and prime mover.
ws = openpyxl.load_workbook(args.f923, read_only=True)["Page 1 Generation and Fuel Data"]
plants = []
for i, r in enumerate(ws.iter_rows(values_only=True)):
    if i < 6 or r[14] != "OBG" or r[13] != "IC" or not r[94] or not r[95] or int(r[0]) not in gen:
        continue
    n, mw = gen[int(r[0])]
    plants.append({"plantId": int(r[0]), "name": r[3], "state": r[6], "elecMmbtuHhv": r[94], "netMwh": r[95], "units": n, "nameplateMw": round(mw, 3)})
print(f"{len(gen)} plants with OBG engines in EIA-860, {len(plants)} with EIA-923 fuel and generation")
out = {"description": "US EIA-923 digester gas (OBG) reciprocating engines: fuel for electricity (MMBtu, HHV) and net generation; EIA-860 operable "
       "OBG engines: unit count and nameplate MW. Net of the engines' own use.", "source923": "https://www.eia.gov/electricity/data/eia923/",
       "source860": "https://www.eia.gov/electricity/data/eia860/", "dataYear": args.year, "retrievedOn": datetime.date.today().isoformat(), "plants": plants}
if args.write:
    TARGET.write_text(json.dumps(out, ensure_ascii=False, indent=1) + "\n", encoding="utf-8")
    print("written", TARGET)
