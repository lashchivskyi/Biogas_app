"""Build offline GeoNames/ERA5 assets. Raw data and Python dependencies belong outside the repo.

Python 3.11+: pip install xarray zarr icechunk s3fs dask numpy pandas
Run: python scripts/data/build_locations.py --cache <external-directory> --write
No API key/account is required. See docs/data-sources.md for attribution and limitations.
"""
import argparse
import calendar
import datetime as dt
import gzip
import hashlib
import io
import json
import re
import unicodedata
import urllib.request
import zipfile
from collections import Counter
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
LANGUAGES = set(re.search(r'LOCALES = \[(.*?)\]', (ROOT / 'src/i18n/config.ts').read_text('utf-8')).group(1).replace('"', '').replace(' ', '').split(','))


def normalize(value):
    value = value.lower().translate(str.maketrans({'ł': 'l', 'ø': 'o', 'đ': 'd', 'ß': 'ss', 'ı': 'i'}))
    return ''.join(c for c in unicodedata.normalize('NFKD', value) if unicodedata.category(c) != 'Mn')


def digest(data):
    return hashlib.sha256(data).hexdigest()


def pack(data):
    return gzip.compress(json.dumps(data, ensure_ascii=False, separators=(',', ':')).encode(), mtime=0)


def cities(cache, countries):
    urls = {}
    for filename in ('cities500.zip', 'admin1CodesASCII.txt', 'alternateNamesV2.zip'):
        url = f'https://download.geonames.org/export/dump/{filename}'
        target = cache / filename
        if not target.exists():
            urllib.request.urlretrieve(url, target)
        urls[url] = digest(target.read_bytes())
    admins, admin_ids = {}, {}
    for line in (cache / 'admin1CodesASCII.txt').read_text('utf-8').splitlines():
        code, name, ascii_name, geo_id = line.split('\t')
        if code[:2] in countries:
            admins[code] = {'name': name, 'names': {}}
            admin_ids[int(geo_id)] = code
    rows, ids = [], set()
    with zipfile.ZipFile(cache / 'cities500.zip') as archive:
        for line in io.TextIOWrapper(archive.open('cities500.txt'), encoding='utf-8'):
            p = line.rstrip('\n').split('\t')
            if p[8] not in countries or not p[7].startswith('PPL'):
                continue
            row = {'id': int(p[0]), 'name': p[1], 'countryCode': p[8], 'latitude': float(p[4]), 'longitude': float(p[5]),
                   'admin': f'{p[8]}.{p[10]}', 'elevation': int(p[15] or p[16] or 0), 'population': int(p[14] or 0),
                   'names': {}, 'aliases': {p[1], p[2]}}
            rows.append(row)
            ids.add(row['id'])
    by_id = {r['id']: r for r in rows}
    priorities = {}
    with zipfile.ZipFile(cache / 'alternateNamesV2.zip') as archive:
        for line in io.TextIOWrapper(archive.open('alternateNamesV2.txt'), encoding='utf-8'):
            p = line.rstrip('\n').split('\t')
            geo_id = int(p[1])
            if geo_id not in ids and geo_id not in admin_ids:
                continue
            lang = p[2]
            if lang not in LANGUAGES and lang not in ('sr-Latn', 'pt-BR'):
                continue
            if len(p) > 7 and (p[6] == '1' or p[7] == '1'):
                continue
            name = p[3]
            if not name or len(name) > 160:
                continue
            target = by_id.get(geo_id) or admins[admin_ids[geo_id]]
            if geo_id in ids:
                target['aliases'].add(name)
            priority = (p[4] == '1', p[5] != '1', -int(p[0]))
            key = (geo_id, lang)
            if priority > priorities.get(key, (False, False, -10**15)):
                priorities[key] = priority
                target['names'][lang] = name
    for row in rows:
        row['search'] = sorted({normalize(n) for n in row.pop('aliases')})
    rows.sort(key=lambda r: (-r['population'], r['id']))
    counts = dict(sorted(Counter(r['countryCode'] for r in rows).items()))
    assert set(counts) == countries and len(ids) == len(rows)
    obtained = {name: dt.datetime.fromtimestamp((cache/name).stat().st_mtime, dt.timezone.utc).date().isoformat()
                for name in ('cities500.zip', 'admin1CodesASCII.txt', 'alternateNamesV2.zip')}
    return pack({'cities': rows, 'admins': admins}), counts, urls, obtained


def climate(cache, end_year):
    import numpy as np
    import xarray as xr
    import icechunk as ic
    storage = ic.s3_storage(bucket='planette-era5', prefix='ERA5_ic/month', region='us-east-2', anonymous=True)
    repo = ic.Repository.open(storage=storage)
    session = repo.readonly_session('main')
    ds = xr.open_zarr(session.store, group='single/0p25latx0p25lon', consolidated=False, decode_timedelta=True, chunks={})
    subset = ds.t2m.sel(time=slice(f'{end_year-9}-01-01', f'{end_year}-12-01'))
    dates = [str(t)[:10] for t in subset.time.values]
    expected = [f'{y}-{m:02}-01' for y in range(end_year-9, end_year+1) for m in range(1, 13)]
    if dates != expected:
        raise ValueError(f'Incomplete ERA5 period: need {expected[0]} through {expected[-1]}, got {dates}')
    # Download once; each upstream chunk holds 30 global monthly fields.
    cached = cache / f'era5-t2m-{end_year-9}-{end_year}-{session.snapshot_id}.npy'
    if cached.exists():
        values = np.load(cached)
    else:
        print('Downloading 120 monthly global ERA5 temperature fields...', flush=True)
        values = subset.values
        np.save(cached, values)
    assert values.shape == (120, 721, 1440) and np.isfinite(values).all()
    assert np.allclose(ds.lat.values, 90-np.arange(721)*0.25)
    assert np.allclose(ds.lon.values, -179.75+np.arange(1440)*0.25)
    monthly = []
    for month in range(1, 13):
        weights = [calendar.monthrange(y, month)[1] for y in range(end_year-9, end_year+1)]
        monthly.append(np.average(values[month-1::12].astype('float64'), axis=0, weights=weights)-273.15)
    grid = np.stack(monthly, axis=-1)
    assert np.isfinite(grid).all() and grid.min() > -90 and grid.max() < 65
    raw = np.rint(grid*10).astype('<i2').tobytes(order='C')
    print(f'ERA5 grid: {grid.min():.1f} to {grid.max():.1f} C; {len(raw)} bytes', flush=True)
    obtained = dt.datetime.fromtimestamp(cached.stat().st_mtime, dt.timezone.utc).date().isoformat()
    return gzip.compress(raw, mtime=0), {'latStart': 90, 'latStep': -0.25, 'latCount': 721,
        'lonStart': -179.75, 'lonStep': 0.25, 'lonCount': 1440, 'months': 12, 'scale': 0.1,
        'encoding': 'int16-le', 'layout': 'latitude,longitude,month', 'bytes': len(raw)}, str(session.snapshot_id), obtained


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--cache', type=Path, required=True)
    parser.add_argument('--end-year', type=int, default=dt.date.today().year-1)
    parser.add_argument('--write', action='store_true', help='Publish validated assets to src/server/data')
    args = parser.parse_args()
    cache = args.cache.resolve()
    if cache == ROOT or ROOT in cache.parents:
        parser.error('--cache must be outside the repository')
    if args.end_year >= dt.date.today().year or args.end_year < 1950:
        parser.error('Use a completed year, no earlier than 1950')
    cache.mkdir(parents=True, exist_ok=True)
    countries = {r['country'] for r in json.loads((ROOT/'src/countries/data/climate.json').read_text('utf-8'))['regions'].values()}
    city_data, counts, urls, obtained = cities(cache, countries)
    print(f'GeoNames: {sum(counts.values())} cities in {len(counts)} countries', flush=True)
    grid_data, axes, snapshot, climate_obtained = climate(cache, args.end_year)
    assets = {'cities.json.gz': city_data, 'era5-temperature.bin.gz': grid_data}
    manifest = {'schema': 1, 'dataset': 'era5-planette-0.25', 'fetchedOn': climate_obtained,
        'startDate': f'{args.end_year-9}-01-01', 'endDate': f'{args.end_year}-12-31', 'grid': axes,
        'citiesByCountry': counts, 'sha256': {name: digest(data) for name, data in assets.items()},
        'geonames': {'source': 'https://download.geonames.org/export/dump/', 'license': 'CC BY 4.0', 'files': urls, 'downloadedOn': obtained,
            'coverage': 'cities500: populated places with >500 inhabitants or administrative seats; not every settlement'},
        'era5': {'source': 'https://registry.opendata.aws/planette_era5_reanalysis/', 'snapshot': snapshot,
            'variable': 't2m', 'license': 'Copernicus/CC BY 4.0',
            'attribution': 'Contains modified Copernicus Climate Change Service information; ECMWF ERA5, NSF NCAR, Planette',
            'method': 'Day-weighted monthly means, 10 completed years; nearest 0.25 degree grid cell; no elevation downscaling; not a WMO 30-year normal'}}
    assets['locations.json'] = (json.dumps(manifest, ensure_ascii=False, indent=2)+'\n').encode()
    for name, data in assets.items():
        (cache/name).write_bytes(data)
        print(f'{name}: {len(data):,} bytes', flush=True)
    if args.write:
        target = ROOT/'src/server/data'
        target.mkdir(exist_ok=True)
        # All candidates have been computed/validated before replacing production assets.
        for name, data in assets.items():
            (target/name).write_bytes(data)
        print('Published offline data assets.', flush=True)


if __name__ == '__main__':
    main()
