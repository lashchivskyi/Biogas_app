"""
Refreshes official market statistics. Read-only summary by default; --output PATH
writes a candidate, --write atomically updates production after mandatory feeds succeed.
Retains consumer bands, latest published period and dated ECB reference FX.

Sources (all public, no key):
- Eurostat nrg_pc_205  Electricity prices, non-household, band IC (500–1 999 MWh/a), excl. VAT & recoverable taxes, EUR/kWh
- Eurostat nrg_pc_203  Natural gas prices, non-household, band I3 (10 000–99 999 GJ/a), excl. VAT & recoverable taxes, EUR/kWh
- Eurostat lc_lci_lev  Hourly labour cost, industry/construction/services (B–S excl. O), EUR/h
- Eurostat ert_bil_eur_a  EUR reference exchange rates, annual average (fallback only)
- National EUR rates where the ECB has none: NBU (UAH), NBM (MDL), NBK (KZT), BCRA (ARS), NBS (RSD), Vietcombank × ECB (VND)
- Energy-Charts API (Fraunhofer ISE; ENTSO-E / SMARD data)  Day-ahead prices by bidding zone, EUR/MWh, last 12 months
"""
import argparse, concurrent.futures, json, time, urllib.request, urllib.error, datetime, statistics, math, calendar
from pathlib import Path
import xml.etree.ElementTree as ET

TARGET = Path(__file__).resolve().parents[2] / "src/countries/data/statistics.json"
parser = argparse.ArgumentParser(description=__doc__)
parser.add_argument("--output", type=Path)
parser.add_argument("--write", action="store_true")
parser.add_argument("--as-of", default=datetime.datetime.now(datetime.timezone.utc).date().isoformat())
args = parser.parse_args()
as_of = datetime.date.fromisoformat(args.as_of)
if args.write and args.output:
    parser.error("Choose --output or --write")
if args.output and args.output.resolve() == TARGET.resolve():
    parser.error("Production update requires --write")

EU = ["PL", "CZ", "SK", "HU", "RO", "MD", "BG", "RS", "EL", "TR", "LT", "LV", "EE", "DK", "SE", "FI", "DE", "AT", "IT", "FR", "ES", "NL"]
ISO = {"EL": "GR"}
CURRENCIES = ["PLN", "CZK", "HUF", "RON", "MDL", "RSD", "TRY", "DKK", "SEK", "GBP", "USD", "CAD", "MXN", "ARS", "BRL", "INR", "THB", "VND", "KZT", "UAH"]
BZN = {"PL": "PL", "CZ": "CZ", "SK": "SK", "HU": "HU", "RO": "RO", "BG": "BG", "RS": "RS", "GR": "GR", "LT": "LT", "LV": "LV", "EE": "EE",
       "DK": "DK1", "SE": "SE4", "FI": "FI", "DE": "DE-LU", "AT": "AT", "IT": "IT-North", "FR": "FR", "ES": "ES", "NL": "NL"}


def get(url, tries=2):
    for i in range(tries):
        try:
            with urllib.request.urlopen(urllib.request.Request(url, headers={"User-Agent": "methalytics-data/2.0"}), timeout=25) as r:
                return json.load(r)
        except (urllib.error.URLError, TimeoutError) as e:
            if i == tries - 1:
                raise
            time.sleep(1)


def eurostat(dataset, query, key_dim="geo", bands=False):
    url = f"https://ec.europa.eu/eurostat/api/dissemination/statistics/1.0/data/{dataset}?format=JSON&lang=en&{query}"
    d = get(url)
    if d.get("updated", "")[:10] > args.as_of:
        raise ValueError(f"{dataset}: publication is later than the requested valuation date; a historical snapshot is required")
    dims = d["id"]
    size = d["size"]
    idx = {k: {i: c for c, i in d["dimension"][k]["category"]["index"].items()} for k in dims}
    out = {}
    for flat, v in d["value"].items():
        if v == 0:
            continue  # Eurostat reports 0 for bands with no consumers (e.g. ≥ 150 GWh in the Baltics): not a price.
        if not isinstance(v, (int, float)) or not math.isfinite(v) or v < 0:
            raise ValueError(f"{dataset}: invalid numeric observation")
        flat = int(flat)
        coords = {}
        for k, s in zip(reversed(dims), reversed(size)):
            coords[k] = idx[k][flat % s]
            flat //= s
        period = coords["time"]
        if len(period) == 4:
            period_end = period + "-12-31"
        elif "-S" in period:
            period_end = period[:4] + ("-06-30" if period.endswith("S1") else "-12-31")
        elif len(period) == 7:
            period_end = period + f"-{calendar.monthrange(int(period[:4]), int(period[5:]))[1]:02d}"
        else:
            period_end = period
        if period_end > args.as_of:
            continue  # Never label an incomplete/future annual period as an observed full-year average.
        group = coords[key_dim] + ("|" + coords["nrg_cons"] if bands else "")
        out.setdefault(group, {})[coords["time"]] = v
    if not out:
        raise ValueError(f"Empty mandatory feed: {dataset}")
    return out, d.get("updated"), url


def latest_mean(series, n):
    ks = sorted(series)[-n:]
    return round(statistics.mean(series[k] for k in ks), 4), ks


old = json.loads(TARGET.read_text(encoding="utf-8"))
res = {**old, "electricity": {}, "gas": {}, "labour": {}, "fx": dict(old["fx"]), "dayAhead": dict(old["dayAhead"]), "updated": dict(old.get("updated", {})), "refreshErrors": {}}
geos = "&".join(f"geo={g}" for g in EU)

el, upd, url = eurostat("nrg_pc_205", f"tax=X_VAT&currency=EUR&unit=KWH&sinceTimePeriod=2025-S1&{geos}", bands=True)
res["updated"]["nrg_pc_205"] = upd
for group, s in el.items():
    g, band = group.split("|")
    v, ks = latest_mean(s, 2)
    last = sorted(s)[-1]
    row = {"eurKwh": s[last], "periods": [last], "referenceMean": v, "referencePeriods": ks, "sourceUpdated": upd, "fetchedOn": args.as_of, "url": url}
    res["electricity"].setdefault(ISO.get(g, g), {"bands": {}})["bands"][band] = row
for row in res["electricity"].values():
    row.update(row["bands"]["MWH500-1999"])

gas, upd, url = eurostat("nrg_pc_203", f"tax=X_VAT&currency=EUR&unit=KWH&sinceTimePeriod=2025-S1&{geos}", bands=True)
res["updated"]["nrg_pc_203"] = upd
for group, s in gas.items():
    g, band = group.split("|")
    v, ks = latest_mean(s, 2)
    last = sorted(s)[-1]
    row = {"eurMwh": s[last] * 1000, "periods": [last], "referenceMean": v * 1000, "referencePeriods": ks, "sourceUpdated": upd, "fetchedOn": args.as_of, "url": url}
    res["gas"].setdefault(ISO.get(g, g), {"bands": {}})["bands"][band] = row
for row in res["gas"].values():
    row.update(row["bands"]["GJ10000-99999"])

lab, upd, url = eurostat("lc_lci_lev", f"unit=EUR&lcstruct=D1_D4_MD5&nace_r2=B-S_X_O&sinceTimePeriod=2023&{geos}")
res["updated"]["lc_lci_lev"] = upd
for g, s in lab.items():
    k = sorted(s)[-1]
    res["labour"][ISO.get(g, g)] = {"eurH": s[k], "year": k, "sourceUpdated": upd, "fetchedOn": args.as_of, "url": url}

fx, upd, url = eurostat("ert_bil_eur_a", "statinfo=AVG&sinceTimePeriod=2024", key_dim="currency")
res["updated"]["ert_bil_eur_a"] = upd
for c in CURRENCIES:
    if c in fx:
        k = sorted(fx[c])[-1]
        res["fx"][c] = {"perEur": fx[c][k], "year": k, "sourceUpdated": upd, "fetchedOn": args.as_of, "url": url}

fx_url = "https://www.ecb.europa.eu/stats/eurofxref/eurofxref-daily.xml"
try:
    with urllib.request.urlopen(fx_url, timeout=25) as response:
        tree = ET.fromstring(response.read())
    dated = next(node for node in tree.iter() if "time" in node.attrib)
    if dated.attrib["time"] > args.as_of:
        raise ValueError("Future ECB observation")
    res["fxReference"] = {"asOf": dated.attrib["time"], "fetchedOn": args.as_of, "url": fx_url, "rates": {node.attrib["currency"]: float(node.attrib["rate"]) for node in dated if "currency" in node.attrib}}
except Exception as exc:
    res["refreshErrors"]["fxReference"] = str(exc)[:200]
    # Verified HTTPS fallback: Eurostat republishes the ECB daily reference series.
    # Never disable TLS certificate verification to obtain a newer-looking date.
    daily, updated, daily_url = eurostat("ert_bil_eur_d", "statinfo=AVG&unit=NAC&sinceTimePeriod=" + str(as_of - datetime.timedelta(days=10)), key_dim="currency")
    periods = sorted({period for series in daily.values() for period in series if period <= args.as_of})
    latest = periods[-1]
    rates = {currency: series[latest] for currency, series in daily.items() if latest in series}
    res["fxReference"] = {"asOf": latest, "fetchedOn": args.as_of, "url": daily_url, "sourceUpdated": updated, "rates": rates}

def text(url):
    with urllib.request.urlopen(urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0 methalytics-data/2.0"}), timeout=25) as r:
        return r.read()


def back(fetch, days=7):
    """Latest quotation on or before the valuation date (central banks do not publish on holidays)."""
    for i in range(days):
        try:
            return fetch(as_of - datetime.timedelta(days=i))
        except (LookupError, ValueError, StopIteration, KeyError):
            continue
    raise LookupError("no quotation in the last week")


def nbu(day):
    url = "https://bank.gov.ua/NBUStatService/v1/statdirectory/exchange?valcode=EUR&date=" + day.strftime("%Y%m%d") + "&json"
    q = get(url)[0]
    return q["rate"], datetime.datetime.strptime(q["exchangedate"], "%d.%m.%Y").date().isoformat(), url, None


def nbm(day):
    url = "https://www.bnm.md/en/official_exchange_rates?get_xml=1&date=" + day.strftime("%d.%m.%Y")
    root = ET.fromstring(text(url))
    node = next(v for v in root.iter("Valute") if v.findtext("CharCode") == "EUR")
    return float(node.findtext("Value")) / float(node.findtext("Nominal")), datetime.datetime.strptime(root.attrib["Date"], "%d.%m.%Y").date().isoformat(), url, None


def nbk(day):
    url = "https://nationalbank.kz/rss/get_rates.cfm?fdate=" + day.strftime("%d.%m.%Y")
    root = ET.fromstring(text(url))
    node = next(i for i in root.iter("item") if i.findtext("title") == "EUR")
    return float(node.findtext("description")) / float(node.findtext("quant")), datetime.datetime.strptime(root.findtext("date"), "%d.%m.%Y").date().isoformat(), url, None


def bcra(day):
    url = "https://api.bcra.gob.ar/estadisticascambiarias/v1.0/Cotizaciones?fecha=" + day.isoformat()
    r = get(url)["results"]
    rate = next(x["tipoCotizacion"] for x in r["detalle"] if x["codigoMoneda"] == "EUR")
    if not rate:
        raise LookupError("no BCRA quotation")
    return rate, r["fecha"], url, None


def nbs(_day):
    # nbs.rs blocks scripted access; kurs.resenje.org republishes the NBS official middle rate.
    url = "https://kurs.resenje.org/api/v1/currencies/eur/rates/today"
    q = get(url)
    return q["exchange_middle"], q["date"], url, ("NBS official middle rate (via kurs.resenje.org), " + q["date"], "HIGH")


def vietcombank(_day):
    # SBV publishes no EUR reference rate and blocks scripted access: USD mid at Vietcombank × ECB USD/EUR.
    url = "https://portal.vietcombank.com.vn/Usercontrols/TVPortal.TyGia/pXML.aspx"
    root = ET.fromstring(text(url))
    usd = next(x for x in root.iter("Exrate") if x.attrib["CurrencyCode"] == "USD")
    mid = (float(usd.attrib["Transfer"].replace(",", "")) + float(usd.attrib["Sell"].replace(",", ""))) / 2
    ecb = res["fxReference"]
    date = datetime.datetime.strptime(root.findtext("DateTime").split()[0], "%m/%d/%Y").date().isoformat()
    return mid * ecb["rates"]["USD"], date, url, (f"Cross rate: Vietcombank USD mid {mid:,.0f} VND × ECB {ecb['rates']['USD']} USD/EUR ({ecb['asOf']}); SBV publishes no EUR rate", "MEDIUM")


res["fxNational"] = dict(old.get("fxNational", {}))
for currency, fetch, days in (("UAH", nbu, 7), ("MDL", nbm, 7), ("KZT", nbk, 7), ("ARS", bcra, 7), ("RSD", nbs, 1), ("VND", vietcombank, 1)):
    try:
        rate, quote_date, url, label = back(fetch, days)
        if quote_date > args.as_of or not rate or rate <= 0:
            raise ValueError("Invalid or future quotation")
        row = {"perEur": round(rate, 4), "asOf": quote_date, "fetchedOn": args.as_of, "url": url}
        if label:
            row["source"], row["confidence"] = label
        res["fxNational"][currency] = row
    except Exception as exc:
        res["refreshErrors"][f"fxNational.{currency}"] = str(exc)[:200]

end = as_of.replace(day=1)
start = end.replace(year=end.year - 1)
def spot(iso, bzn):
    time.sleep(6)  # Public API rate limit; keep the last successful row on failure.
    url = f"https://api.energy-charts.info/price?bzn={bzn}&start={start}&end={end}"
    d = get(url)
    p = [x for x in d.get("price", []) if x is not None]
    if not p:
        raise ValueError("Empty day-ahead series")
    return iso, {"eurMwh": statistics.mean(p), "bzn": bzn, "from": str(start), "to": str(end), "n": len(p), "fetchedOn": args.as_of, "url": url}

with concurrent.futures.ThreadPoolExecutor(max_workers=1) as pool:
    jobs = {pool.submit(spot, iso, bzn): iso for iso, bzn in BZN.items()}
    for job in concurrent.futures.as_completed(jobs):
        try:
            iso, row = job.result()
            res["dayAhead"][iso] = row
        except Exception as exc:
            res["refreshErrors"][f"dayAhead.{jobs[job]}"] = str(exc)[:200]

res["fetchedOn"] = args.as_of
for mandatory in ("electricity", "gas", "labour"):
    missing = set(old[mandatory]) - set(res[mandatory])
    if missing:
        raise ValueError(f"{mandatory}: refusing to drop previously covered countries: {sorted(missing)}")
out = TARGET if args.write else args.output
if out:
    temporary = out.with_suffix(out.suffix + ".tmp")
    temporary.write_text(json.dumps(res, ensure_ascii=False, indent=1) + "\n", encoding="utf-8")
    temporary.replace(out)
print(json.dumps({"written": str(out) if out else None, "counts": {key: len(res[key]) for key in ("electricity", "gas", "labour", "fx", "dayAhead")}, "fxReferenceDate": res.get("fxReference", {}).get("asOf"), "errors": res["refreshErrors"]}))
