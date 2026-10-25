"""Google Trends demand check (relative interest 0-100, NOT search volumes).

Run:  python -I scripts/trends.py
Requires: pip install pytrends
Writes: docs/data/trends.json  (and prints a summary)

Google Trends scales each request so the highest point among the (max 5) terms = 100.
Compare terms only within one request. Use a stable "anchor" term in every request to compare across requests.
"""
import json
import sys
import time
from pathlib import Path

from pytrends.request import TrendReq

# (market, geo, hl, terms) — first term is the anchor reused in each batch.
MARKETS = [
    ("Україна", "UA", "uk-UA", ["біогазова установка", "біогаз", "біогаз з гною", "калькулятор біогазу", "сонячна електростанція"]),
    ("Польща", "PL", "pl-PL", ["biogazownia", "biogazownia rolnicza", "biogaz", "biogazownia koszt", "fotowoltaika"]),
    ("Чехія", "CZ", "cs-CZ", ["bioplynová stanice", "bioplyn", "bioplynka", "bioplynová stanice cena", "fotovoltaika"]),
    ("Німеччина", "DE", "de-DE", ["Biogasanlage", "Biogas", "Biogasanlage Kosten", "Biogasanlage Rechner", "Photovoltaik"]),
    ("Туреччина", "TR", "tr-TR", ["biyogaz", "biyogaz tesisi", "biyogaz maliyeti", "biyogaz tesisi kurulumu", "güneş enerjisi"]),
    ("Угорщина", "HU", "hu-HU", ["biogáz", "biogáz üzem", "biogázüzem", "biogáz üzem költség", "napelem"]),
    ("США", "US", "en-US", ["biogas", "anaerobic digester", "biogas plant", "biogas calculator", "solar panels"]),
    ("Канада", "CA", "en-CA", ["biogas", "anaerobic digester", "biogas plant", "biogas calculator", "solar panels"]),
]


def fetch(geo: str, hl: str, terms: list[str], timeframe: str):
    py = TrendReq(hl=hl, tz=0, timeout=(10, 30))
    py.build_payload(terms, timeframe=timeframe, geo=geo)
    df = py.interest_over_time()
    if df.empty:
        return None
    df = df.drop(columns=["isPartial"], errors="ignore")
    return df


def summarise(df):
    out = {}
    n = len(df)
    for c in df.columns:
        s = df[c].astype(float)
        last52 = s.tail(52).mean()
        prev52 = s.iloc[max(0, n - 104): n - 52].mean() if n > 104 else float("nan")
        yoy = (last52 / prev52 - 1) * 100 if prev52 and prev52 == prev52 else None
        winter = s[s.index.month.isin([10, 11, 12, 1, 2, 3])].mean()
        summer = s[s.index.month.isin([4, 5, 6, 7, 8, 9])].mean()
        out[c] = {
            "avg_last_52w": round(float(last52), 1),
            "avg_all": round(float(s.mean()), 1),
            "yoy_pct": None if yoy is None else round(float(yoy), 1),
            "season_ratio_winter_to_summer": round(float(winter / summer), 2) if summer else None,
        }
    return out


def main():
    result = {}
    for name, geo, hl, terms in MARKETS:
        for attempt in range(3):
            try:
                df = fetch(geo, hl, terms, "today 5-y")
                break
            except Exception as e:  # 429 / transient
                print(f"{name}: retry {attempt + 1} after {type(e).__name__}")
                time.sleep(20 * (attempt + 1))
                df = None
        if df is None:
            result[name] = {"error": "no data"}
            continue
        result[name] = {"geo": geo, "terms": summarise(df), "weekly": {c: [int(v) for v in df[c].tolist()] for c in df.columns}, "dates": [d.strftime("%Y-%m-%d") for d in df.index]}
        print(f"{name}: ok ({len(df)} weeks)")
        time.sleep(8)
    Path("docs/data").mkdir(parents=True, exist_ok=True)
    Path("docs/data/trends.json").write_text(json.dumps(result, ensure_ascii=False, indent=1), encoding="utf-8")
    print("wrote docs/data/trends.json")


if __name__ == "__main__":
    main()
