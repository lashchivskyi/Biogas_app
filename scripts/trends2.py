"""Second pass: biogas-only terms (so they are not flattened by solar) + UA by region. Writes docs/data/trends-biogas.json"""
import json, sys, time
from pathlib import Path
from pytrends.request import TrendReq

M = [
    ("UA", "uk-UA", ["біогаз", "біогазова установка", "біогаз з гною", "біогазова установка ціна", "біогаз своїми руками"]),
    ("PL", "pl-PL", ["biogazownia", "biogaz", "biogazownia rolnicza", "biogazownia koszt", "biogazownia dofinansowanie"]),
    ("CZ", "cs-CZ", ["bioplyn", "bioplynová stanice", "bioplynka", "bioplynová stanice cena", "biometan"]),
    ("DE", "de-DE", ["Biogas", "Biogasanlage", "Biogasanlage Kosten", "Biogasanlage Wirtschaftlichkeit", "Biomethan"]),
    ("TR", "tr-TR", ["biyogaz", "biyogaz tesisi", "biyogaz maliyeti", "biyogaz tesisi kurulumu", "biyogaz nedir"]),
    ("HU", "hu-HU", ["biogáz", "biogáz üzem", "biogázüzem", "biogáz üzem költség", "biometán"]),
    ("US", "en-US", ["biogas", "anaerobic digester", "biogas plant", "renewable natural gas", "biogas calculator"]),
    ("CA", "en-CA", ["biogas", "anaerobic digester", "biogas plant", "renewable natural gas", "biogas calculator"]),
]
out = {}
for geo, hl, terms in M:
    try:
        p = TrendReq(hl=hl, tz=0, timeout=(10, 30))
        p.build_payload(terms, timeframe="today 5-y", geo=geo)
        df = p.interest_over_time().drop(columns=["isPartial"], errors="ignore")
        n = len(df)
        res = {}
        for c in df.columns:
            s = df[c].astype(float)
            last = s.tail(52).mean(); prev = s.iloc[n-104:n-52].mean()
            res[c] = {"last52": round(last, 1), "all": round(s.mean(), 1), "yoy": None if prev == 0 else round((last/prev-1)*100, 1)}
        out[geo] = res
        print(geo, "ok", flush=True)
    except Exception as e:
        out[geo] = {"error": f"{type(e).__name__}: {e}"[:200]}
        print(geo, "ERR", type(e).__name__, flush=True)
    time.sleep(8)
try:
    p = TrendReq(hl="uk-UA", tz=0, timeout=(10, 30))
    p.build_payload(["біогаз"], timeframe="today 5-y", geo="UA")
    r = p.interest_by_region(resolution="REGION", inc_low_vol=True)
    out["UA_regions"] = {k: int(v) for k, v in r["біогаз"].sort_values(ascending=False).items() if v > 0}
    p.build_payload(["біогаз", "біогазова установка"], timeframe="today 12-m", geo="UA")
    q = p.related_queries()
    out["UA_related"] = {t: {kk: (None if vv is None else vv.head(10).to_dict("records")) for kk, vv in d.items()} for t, d in q.items()}
    print("regions ok", flush=True)
except Exception as e:
    out["UA_regions_err"] = f"{type(e).__name__}: {e}"[:200]
Path("docs/data/trends-biogas.json").write_text(json.dumps(out, ensure_ascii=False, indent=1), encoding="utf-8")
