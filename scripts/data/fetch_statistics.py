"""
Fetches official market statistics used by the country profiles and writes
src/countries/data/statistics.json. Re-run to refresh (python -I scripts/data/fetch_statistics.py).

Sources (all public, no key):
- Eurostat nrg_pc_205  Electricity prices, non-household, band IC (500–1 999 MWh/a), excl. VAT & recoverable taxes, EUR/kWh
- Eurostat nrg_pc_203  Natural gas prices, non-household, band I3 (10 000–99 999 GJ/a), excl. VAT & recoverable taxes, EUR/kWh
- Eurostat lc_lci_lev  Hourly labour cost, industry/construction/services (B–S excl. O), EUR/h
- Eurostat ert_bil_eur_a  EUR reference exchange rates, annual average
- Energy-Charts API (Fraunhofer ISE; ENTSO-E / SMARD data)  Day-ahead prices by bidding zone, EUR/MWh, last 12 months
"""
import json, sys, time, urllib.request, urllib.error, datetime, statistics

EU = ["PL", "CZ", "SK", "HU", "RO", "MD", "BG", "RS", "EL", "TR", "LT", "LV", "EE", "DK", "SE", "FI", "DE", "AT", "IT", "FR", "ES", "NL"]
ISO = {"EL": "GR"}
CURRENCIES = ["PLN", "CZK", "HUF", "RON", "MDL", "RSD", "TRY", "DKK", "SEK", "GBP", "USD", "CAD", "MXN", "ARS", "BRL", "INR", "THB", "VND", "KZT", "UAH"]
BZN = {"PL": "PL", "CZ": "CZ", "SK": "SK", "HU": "HU", "RO": "RO", "BG": "BG", "RS": "RS", "GR": "GR", "LT": "LT", "LV": "LV", "EE": "EE",
       "DK": "DK1", "SE": "SE4", "FI": "FI", "DE": "DE-LU", "AT": "AT", "IT": "IT-North", "FR": "FR", "ES": "ES", "NL": "NL"}


def get(url, tries=5):
    for i in range(tries):
        try:
            with urllib.request.urlopen(urllib.request.Request(url, headers={"User-Agent": "methalytics-data/1.0"}), timeout=120) as r:
                return json.load(r)
        except (urllib.error.URLError, TimeoutError) as e:
            if i == tries - 1:
                raise
            time.sleep(20 * (i + 1))


def eurostat(dataset, query, key_dim="geo"):
    d = get(f"https://ec.europa.eu/eurostat/api/dissemination/statistics/1.0/data/{dataset}?format=JSON&lang=en&{query}")
    dims = d["id"]
    size = d["size"]
    idx = {k: {i: c for c, i in d["dimension"][k]["category"]["index"].items()} for k in dims}
    out = {}
    for flat, v in d["value"].items():
        flat = int(flat)
        coords = {}
        for k, s in zip(reversed(dims), reversed(size)):
            coords[k] = idx[k][flat % s]
            flat //= s
        out.setdefault(coords[key_dim], {})[coords["time"]] = v
    return out, d.get("updated")


def latest_mean(series, n):
    ks = sorted(series)[-n:]
    return round(statistics.mean(series[k] for k in ks), 4), ks


res = {"fetchedOn": datetime.date.today().isoformat(), "electricity": {}, "gas": {}, "labour": {}, "fx": {}, "dayAhead": {}, "updated": {}}
geos = "&".join(f"geo={g}" for g in EU)

el, upd = eurostat("nrg_pc_205", f"nrg_cons=MWH500-1999&tax=X_VAT&currency=EUR&unit=KWH&sinceTimePeriod=2024-S1&{geos}")
res["updated"]["nrg_pc_205"] = upd
for g, s in el.items():
    v, ks = latest_mean(s, 2)
    res["electricity"][ISO.get(g, g)] = {"eurKwh": v, "periods": ks}

gas, upd = eurostat("nrg_pc_203", f"nrg_cons=GJ10000-99999&tax=X_VAT&currency=EUR&unit=KWH&sinceTimePeriod=2024-S1&{geos}")
res["updated"]["nrg_pc_203"] = upd
for g, s in gas.items():
    v, ks = latest_mean(s, 2)
    res["gas"][ISO.get(g, g)] = {"eurMwh": round(v * 1000, 1), "periods": ks}

lab, upd = eurostat("lc_lci_lev", f"unit=EUR&lcstruct=D1_D4_MD5&nace_r2=B-S_X_O&sinceTimePeriod=2022&{geos}")
res["updated"]["lc_lci_lev"] = upd
for g, s in lab.items():
    k = sorted(s)[-1]
    res["labour"][ISO.get(g, g)] = {"eurH": s[k], "year": k}

fx, upd = eurostat("ert_bil_eur_a", "statinfo=AVG&sinceTimePeriod=2024", key_dim="currency")
res["updated"]["ert_bil_eur_a"] = upd
for c in CURRENCIES:
    if c in fx:
        k = sorted(fx[c])[-1]
        res["fx"][c] = {"perEur": fx[c][k], "year": k}

end = datetime.date.today().replace(day=1)
start = end.replace(year=end.year - 1)
for iso, bzn in BZN.items():
    try:
        d = get(f"https://api.energy-charts.info/price?bzn={bzn}&start={start}&end={end}")
        p = [x for x in d.get("price", []) if x is not None]
        if p:
            res["dayAhead"][iso] = {"eurMwh": round(statistics.mean(p), 1), "bzn": bzn, "from": str(start), "to": str(end), "n": len(p)}
    except Exception as e:  # noqa: BLE001 — record and continue
        res["dayAhead"][iso] = {"error": str(e)[:120], "bzn": bzn}
    time.sleep(6)

out = sys.argv[1] if len(sys.argv) > 1 else "src/countries/data/statistics.json"
with open(out, "w", encoding="utf-8") as f:
    json.dump(res, f, ensure_ascii=False, indent=1)
print("wrote", out, {k: len(v) for k, v in res.items() if isinstance(v, dict)})
