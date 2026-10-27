"""
Monthly climate reference for every project region, from ERA5 reanalysis (ECMWF / Copernicus) via the
Open-Meteo historical-weather API: mean of daily 2 m mean temperature over the most recent 10 complete calendar years (not WMO 30-year normals).
Writes src/countries/data/climate.json. Re-run: python -I scripts/data/fetch_climate.py

The API is free but rate-limited (≈ 26 weighted calls per 10-year location; 5 000/hour), so requests
are spaced; a full run takes ≈ 80 minutes. Matching model/period locations are kept (resumable); each location keeps its own source and fetch date.
"""
import json, os, tempfile, time, urllib.request, urllib.error, datetime

LAST_YEAR = datetime.date.today().year - 1
START, END = f"{LAST_YEAR - 9}-01-01", f"{LAST_YEAR}-12-31"
MODEL = "era5"
OUT = "src/countries/data/climate.json"

# country, id, English name, local names {locale: name}, lat, lon  — regional agricultural / industrial centres
L = [
    # Ukraine — representative oblast centres, not a complete administrative register
    ("UA", "kyiv", "Kyiv oblast", {"uk": "Київська область"}, 50.45, 30.52),
    ("UA", "lviv", "Lviv oblast", {"uk": "Львівська область"}, 49.84, 24.03),
    ("UA", "volyn", "Volyn oblast (Lutsk)", {"uk": "Волинська область"}, 50.75, 25.34),
    ("UA", "rivne", "Rivne oblast", {"uk": "Рівненська область"}, 50.62, 26.25),
    ("UA", "zakarpattia", "Zakarpattia oblast (Uzhhorod)", {"uk": "Закарпатська область"}, 48.62, 22.29),
    ("UA", "ivano-frankivsk", "Ivano-Frankivsk oblast", {"uk": "Івано-Франківська область"}, 48.92, 24.71),
    ("UA", "ternopil", "Ternopil oblast", {"uk": "Тернопільська область"}, 49.55, 25.59),
    ("UA", "chernivtsi", "Chernivtsi oblast", {"uk": "Чернівецька область"}, 48.29, 25.94),
    ("UA", "khmelnytskyi", "Khmelnytskyi oblast", {"uk": "Хмельницька область"}, 49.42, 26.99),
    ("UA", "vinnytsia", "Vinnytsia oblast", {"uk": "Вінницька область"}, 49.23, 28.47),
    ("UA", "zhytomyr", "Zhytomyr oblast", {"uk": "Житомирська область"}, 50.25, 28.66),
    ("UA", "chernihiv", "Chernihiv oblast", {"uk": "Чернігівська область"}, 51.49, 31.29),
    ("UA", "sumy", "Sumy oblast", {"uk": "Сумська область"}, 50.91, 34.80),
    ("UA", "poltava", "Poltava oblast", {"uk": "Полтавська область"}, 49.59, 34.55),
    ("UA", "cherkasy", "Cherkasy oblast", {"uk": "Черкаська область"}, 49.44, 32.06),
    ("UA", "kirovohrad", "Kirovohrad oblast (Kropyvnytskyi)", {"uk": "Кіровоградська область"}, 48.51, 32.26),
    ("UA", "kharkiv", "Kharkiv oblast", {"uk": "Харківська область"}, 49.99, 36.23),
    ("UA", "dnipro", "Dnipropetrovsk oblast (Dnipro)", {"uk": "Дніпропетровська область"}, 48.46, 35.05),
    ("UA", "zaporizhzhia", "Zaporizhzhia oblast", {"uk": "Запорізька область"}, 47.84, 35.14),
    ("UA", "mykolaiv", "Mykolaiv oblast", {"uk": "Миколаївська область"}, 46.98, 31.99),
    ("UA", "odesa", "Odesa oblast", {"uk": "Одеська область"}, 46.48, 30.73),
    ("UA", "kherson", "Kherson oblast", {"uk": "Херсонська область"}, 46.64, 32.62),
    # Poland
    ("PL", "wielkopolskie", "Greater Poland (Poznań)", {"pl": "Wielkopolskie (Poznań)"}, 52.41, 16.93),
    ("PL", "mazowieckie", "Masovia (Warsaw)", {"pl": "Mazowieckie (Warszawa)"}, 52.23, 21.01),
    ("PL", "podlaskie", "Podlaskie (Białystok)", {"pl": "Podlaskie (Białystok)"}, 53.13, 23.16),
    ("PL", "lodzkie", "Łódź province", {"pl": "Łódzkie (Łódź)"}, 51.76, 19.46),
    ("PL", "kujawsko-pomorskie", "Kuyavia-Pomerania (Bydgoszcz)", {"pl": "Kujawsko-pomorskie (Bydgoszcz)"}, 53.12, 18.01),
    ("PL", "lubelskie", "Lublin province", {"pl": "Lubelskie (Lublin)"}, 51.25, 22.57),
    ("PL", "podkarpackie", "Subcarpathia (Rzeszów)", {"pl": "Podkarpackie (Rzeszów)"}, 50.04, 22.00),
    ("PL", "dolnoslaskie", "Lower Silesia (Wrocław)", {"pl": "Dolnośląskie (Wrocław)"}, 51.11, 17.03),
    ("PL", "pomorskie", "Pomerania (Gdańsk)", {"pl": "Pomorskie (Gdańsk)"}, 54.35, 18.65),
    # Czechia
    ("CZ", "praha", "Central Bohemia (Prague)", {"cs": "Středočeský kraj (Praha)"}, 50.08, 14.44),
    ("CZ", "vysocina", "Vysočina (Jihlava)", {"cs": "Vysočina (Jihlava)"}, 49.40, 15.59),
    ("CZ", "jihomoravsky", "South Moravia (Brno)", {"cs": "Jihomoravský kraj (Brno)"}, 49.20, 16.61),
    ("CZ", "jihocesky", "South Bohemia (České Budějovice)", {"cs": "Jihočeský kraj (České Budějovice)"}, 48.97, 14.47),
    ("CZ", "olomoucky", "Olomouc region", {"cs": "Olomoucký kraj (Olomouc)"}, 49.59, 17.25),
    ("CZ", "plzensky", "Plzeň region", {"cs": "Plzeňský kraj (Plzeň)"}, 49.74, 13.37),
    # Slovakia
    ("SK", "nitra", "Nitra region", {"sk": "Nitriansky kraj (Nitra)"}, 48.31, 18.09),
    ("SK", "bratislava", "Bratislava / Trnava", {"sk": "Bratislava / Trnava"}, 48.15, 17.11),
    ("SK", "zilina", "Žilina region", {"sk": "Žilinský kraj (Žilina)"}, 49.22, 18.74),
    ("SK", "banska-bystrica", "Banská Bystrica region", {"sk": "Banskobystrický kraj"}, 48.74, 19.15),
    ("SK", "kosice", "Košice region", {"sk": "Košický kraj (Košice)"}, 48.72, 21.26),
    # Hungary
    ("HU", "alfold", "Great Plain (Kecskemét)", {"hu": "Alföld (Kecskemét)"}, 46.91, 19.69),
    ("HU", "pest", "Budapest / Pest", {"hu": "Budapest / Pest"}, 47.50, 19.04),
    ("HU", "hajdu-bihar", "Hajdú-Bihar (Debrecen)", {"hu": "Hajdú-Bihar (Debrecen)"}, 47.53, 21.63),
    ("HU", "gyor", "Győr-Moson-Sopron (Győr)", {"hu": "Győr-Moson-Sopron (Győr)"}, 47.69, 17.63),
    ("HU", "csongrad", "Csongrád (Szeged)", {"hu": "Csongrád-Csanád (Szeged)"}, 46.25, 20.15),
    ("HU", "baranya", "Baranya (Pécs)", {"hu": "Baranya (Pécs)"}, 46.07, 18.23),
    # Romania
    ("RO", "baragan", "Bărăgan / Muntenia (Călărași)", {"ro": "Bărăgan / Muntenia (Călărași)"}, 44.20, 27.33),
    ("RO", "transilvania", "Transylvania (Cluj)", {"ro": "Transilvania (Cluj)"}, 46.77, 23.59),
    ("RO", "timis", "Banat (Timișoara)", {"ro": "Banat (Timișoara)"}, 45.75, 21.23),
    ("RO", "iasi", "Moldavia (Iași)", {"ro": "Moldova (Iași)"}, 47.16, 27.59),
    ("RO", "dolj", "Oltenia (Craiova)", {"ro": "Oltenia (Craiova)"}, 44.32, 23.80),
    ("RO", "brasov", "Brașov", {"ro": "Brașov"}, 45.65, 25.61),
    ("RO", "bucuresti", "Bucharest / Ilfov", {"ro": "București / Ilfov"}, 44.43, 26.10),
    # Moldova
    ("MD", "chisinau", "Central Moldova (Chișinău)", {"ro": "Centrul Moldovei (Chișinău)", "uk": "Центр Молдови (Кишинів)"}, 47.01, 28.86),
    ("MD", "balti", "Northern Moldova (Bălți)", {"ro": "Nordul Moldovei (Bălți)", "uk": "Північ Молдови (Бєльці)"}, 47.76, 27.93),
    ("MD", "cahul", "Southern Moldova (Cahul)", {"ro": "Sudul Moldovei (Cahul)", "uk": "Південь Молдови (Кагул)"}, 45.90, 28.19),
    # Bulgaria
    ("BG", "danube", "Danube plain (Pleven)", {"bg": "Дунавска равнина (Плевен)"}, 43.42, 24.62),
    ("BG", "plovdiv", "Thrace (Plovdiv)", {"bg": "Тракия (Пловдив)"}, 42.14, 24.75),
    ("BG", "sofia", "Sofia", {"bg": "София"}, 42.70, 23.32),
    ("BG", "dobrich", "Dobrudja (Dobrich)", {"bg": "Добруджа (Добрич)"}, 43.57, 27.83),
    ("BG", "stara-zagora", "Stara Zagora", {"bg": "Стара Загора"}, 42.43, 25.64),
    ("BG", "ruse", "Ruse", {"bg": "Русе"}, 43.85, 25.97),
    # Serbia
    ("RS", "vojvodina", "Vojvodina (Novi Sad)", {"sr": "Vojvodina (Novi Sad)"}, 45.27, 19.83),
    ("RS", "belgrade", "Belgrade", {"sr": "Beograd"}, 44.79, 20.45),
    ("RS", "macva", "Mačva (Šabac)", {"sr": "Mačva (Šabac)"}, 44.75, 19.69),
    ("RS", "sumadija", "Šumadija (Kragujevac)", {"sr": "Šumadija (Kragujevac)"}, 44.01, 20.92),
    ("RS", "nis", "Southern Serbia (Niš)", {"sr": "Južna Srbija (Niš)"}, 43.32, 21.90),
    # Greece
    ("GR", "thessaly", "Thessaly (Larissa)", {"el": "Θεσσαλία (Λάρισα)"}, 39.64, 22.42),
    ("GR", "central-macedonia", "Central Macedonia (Thessaloniki)", {"el": "Κεντρική Μακεδονία (Θεσσαλονίκη)"}, 40.64, 22.94),
    ("GR", "serres", "Eastern Macedonia (Serres)", {"el": "Ανατολική Μακεδονία (Σέρρες)"}, 41.09, 23.55),
    ("GR", "western-greece", "Western Greece (Patras)", {"el": "Δυτική Ελλάδα (Πάτρα)"}, 38.25, 21.73),
    ("GR", "attica", "Attica", {"el": "Αττική"}, 37.98, 23.73),
    ("GR", "epirus", "Epirus (Ioannina)", {"el": "Ήπειρος (Ιωάννινα)"}, 39.66, 20.85),
    ("GR", "crete", "Crete (Heraklion)", {"el": "Κρήτη (Ηράκλειο)"}, 35.34, 25.13),
    # Türkiye
    ("TR", "konya", "Central Anatolia (Konya)", {"tr": "İç Anadolu (Konya)"}, 37.87, 32.48),
    ("TR", "ankara", "Ankara", {"tr": "Ankara"}, 39.93, 32.86),
    ("TR", "afyon", "Afyonkarahisar", {"tr": "Afyonkarahisar"}, 38.76, 30.54),
    ("TR", "aegean", "Aegean (İzmir)", {"tr": "Ege (İzmir)"}, 38.42, 27.14),
    ("TR", "balikesir", "Balıkesir", {"tr": "Balıkesir"}, 39.65, 27.88),
    ("TR", "bursa", "Marmara (Bursa)", {"tr": "Marmara (Bursa)"}, 40.19, 29.06),
    ("TR", "thrace", "Thrace (Tekirdağ)", {"tr": "Trakya (Tekirdağ)"}, 40.98, 27.51),
    ("TR", "adana", "Mediterranean (Adana)", {"tr": "Akdeniz (Adana)"}, 37.00, 35.32),
    ("TR", "samsun", "Black Sea (Samsun)", {"tr": "Karadeniz (Samsun)"}, 41.29, 36.33),
    ("TR", "erzurum", "Eastern Anatolia (Erzurum)", {"tr": "Doğu Anadolu (Erzurum)"}, 39.90, 41.27),
    ("TR", "sanliurfa", "Southeast (Şanlıurfa)", {"tr": "Güneydoğu (Şanlıurfa)"}, 37.16, 38.79),
    # Baltics
    ("LT", "kaunas", "Central Lithuania (Kaunas)", {"lt": "Vidurio Lietuva (Kaunas)"}, 54.90, 23.89),
    ("LT", "vilnius", "Vilnius", {"lt": "Vilnius"}, 54.69, 25.28),
    ("LT", "siauliai", "Šiauliai", {"lt": "Šiauliai"}, 55.93, 23.32),
    ("LT", "panevezys", "Panevėžys", {"lt": "Panevėžys"}, 55.73, 24.36),
    ("LT", "klaipeda", "Klaipėda", {"lt": "Klaipėda"}, 55.71, 21.13),
    ("LV", "zemgale", "Zemgale (Jelgava)", {"lv": "Zemgale (Jelgava)"}, 56.65, 23.72),
    ("LV", "riga", "Riga region", {"lv": "Rīgas reģions"}, 56.95, 24.11),
    ("LV", "vidzeme", "Vidzeme (Valmiera)", {"lv": "Vidzeme (Valmiera)"}, 57.54, 25.43),
    ("LV", "latgale", "Latgale (Rēzekne)", {"lv": "Latgale (Rēzekne)"}, 56.51, 27.33),
    ("LV", "kurzeme", "Kurzeme (Liepāja)", {"lv": "Kurzeme (Liepāja)"}, 56.51, 21.01),
    ("EE", "tartu", "Southern Estonia (Tartu)", {"et": "Lõuna-Eesti (Tartu)"}, 58.38, 26.72),
    ("EE", "harju", "Harju (Tallinn)", {"et": "Harjumaa (Tallinn)"}, 59.44, 24.75),
    ("EE", "parnu", "Pärnu", {"et": "Pärnumaa"}, 58.39, 24.50),
    ("EE", "viljandi", "Viljandi", {"et": "Viljandimaa"}, 58.36, 25.59),
    ("EE", "laane-viru", "Lääne-Viru (Rakvere)", {"et": "Lääne-Virumaa (Rakvere)"}, 59.35, 26.36),
    # Nordics
    ("DK", "jutland", "Central Jutland (Herning)", {"da": "Midtjylland (Herning)"}, 56.14, 8.97),
    ("DK", "south-jutland", "Southern Jutland (Aabenraa)", {"da": "Sønderjylland (Aabenraa)"}, 55.04, 9.42),
    ("DK", "north-jutland", "North Jutland (Aalborg)", {"da": "Nordjylland (Aalborg)"}, 57.05, 9.92),
    ("DK", "funen", "Funen (Odense)", {"da": "Fyn (Odense)"}, 55.40, 10.39),
    ("DK", "zealand", "Zealand (Roskilde)", {"da": "Sjælland (Roskilde)"}, 55.64, 12.08),
    ("SE", "skane", "Skåne (Kristianstad)", {"sv": "Skåne (Kristianstad)"}, 56.03, 14.16),
    ("SE", "halland", "Halland (Halmstad)", {"sv": "Halland (Halmstad)"}, 56.67, 12.86),
    ("SE", "vastra-gotaland", "Västra Götaland (Skara)", {"sv": "Västra Götaland (Skara)"}, 58.39, 13.44),
    ("SE", "ostergotland", "Östergötland (Linköping)", {"sv": "Östergötland (Linköping)"}, 58.41, 15.62),
    ("SE", "uppsala", "Uppsala", {"sv": "Uppsala"}, 59.86, 17.64),
    ("SE", "jamtland", "Jämtland (Östersund)", {"sv": "Jämtland (Östersund)"}, 63.18, 14.64),
    ("FI", "ostrobothnia", "Ostrobothnia (Seinäjoki)", {"fi": "Etelä-Pohjanmaa (Seinäjoki)", "sv": "Södra Österbotten (Seinäjoki)"}, 62.79, 22.84),
    ("FI", "uusimaa", "Uusimaa (Helsinki)", {"fi": "Uusimaa (Helsinki)", "sv": "Nyland (Helsingfors)"}, 60.17, 24.94),
    ("FI", "varsinais-suomi", "Southwest Finland (Turku)", {"fi": "Varsinais-Suomi (Turku)", "sv": "Egentliga Finland (Åbo)"}, 60.45, 22.27),
    ("FI", "pirkanmaa", "Pirkanmaa (Tampere)", {"fi": "Pirkanmaa (Tampere)"}, 61.50, 23.76),
    ("FI", "north-savo", "North Savo (Kuopio)", {"fi": "Pohjois-Savo (Kuopio)"}, 62.89, 27.68),
    ("FI", "oulu", "North Ostrobothnia (Oulu)", {"fi": "Pohjois-Pohjanmaa (Oulu)"}, 65.01, 25.47),
    # Germany
    ("DE", "niedersachsen", "Lower Saxony (Vechta)", {"de": "Niedersachsen (Vechta)"}, 52.73, 8.29),
    ("DE", "nrw", "North Rhine-Westphalia (Münster)", {"de": "Nordrhein-Westfalen (Münster)"}, 51.96, 7.63),
    ("DE", "schleswig-holstein", "Schleswig-Holstein (Rendsburg)", {"de": "Schleswig-Holstein (Rendsburg)"}, 54.30, 9.66),
    ("DE", "mecklenburg", "Mecklenburg-Vorpommern (Neubrandenburg)", {"de": "Mecklenburg-Vorpommern (Neubrandenburg)"}, 53.56, 13.26),
    ("DE", "brandenburg", "Brandenburg (Potsdam)", {"de": "Brandenburg (Potsdam)"}, 52.39, 13.07),
    ("DE", "sachsen", "Saxony (Leipzig)", {"de": "Sachsen (Leipzig)"}, 51.34, 12.37),
    ("DE", "thueringen", "Thuringia (Erfurt)", {"de": "Thüringen (Erfurt)"}, 50.98, 11.03),
    ("DE", "bayern", "Bavaria (Landshut)", {"de": "Bayern (Landshut)"}, 48.54, 12.15),
    ("DE", "baden-wuerttemberg", "Baden-Württemberg (Ulm)", {"de": "Baden-Württemberg (Ulm)"}, 48.40, 9.99),
    # Austria
    ("AT", "oberoesterreich", "Upper Austria (Linz)", {"de": "Oberösterreich (Linz)"}, 48.31, 14.29),
    ("AT", "niederoesterreich", "Lower Austria (St. Pölten)", {"de": "Niederösterreich (St. Pölten)"}, 48.20, 15.63),
    ("AT", "steiermark", "Styria (Graz)", {"de": "Steiermark (Graz)"}, 47.07, 15.44),
    ("AT", "burgenland", "Burgenland (Eisenstadt)", {"de": "Burgenland (Eisenstadt)"}, 47.85, 16.52),
    ("AT", "kaernten", "Carinthia (Klagenfurt)", {"de": "Kärnten (Klagenfurt)"}, 46.62, 14.31),
    ("AT", "tirol", "Tyrol (Innsbruck)", {"de": "Tirol (Innsbruck)"}, 47.27, 11.39),
    # Italy
    ("IT", "lombardia", "Lombardy (Cremona)", {"it": "Lombardia (Cremona)"}, 45.13, 10.02),
    ("IT", "emilia", "Emilia-Romagna (Modena)", {"it": "Emilia-Romagna (Modena)"}, 44.65, 10.93),
    ("IT", "veneto", "Veneto (Verona)", {"it": "Veneto (Verona)"}, 45.44, 10.99),
    ("IT", "piemonte", "Piedmont (Cuneo)", {"it": "Piemonte (Cuneo)"}, 44.39, 7.55),
    ("IT", "lazio", "Lazio (Latina)", {"it": "Lazio (Latina)"}, 41.47, 12.90),
    ("IT", "campania", "Campania (Caserta)", {"it": "Campania (Caserta)"}, 41.07, 14.33),
    ("IT", "puglia", "Apulia (Foggia)", {"it": "Puglia (Foggia)"}, 41.46, 15.54),
    ("IT", "sicilia", "Sicily (Catania)", {"it": "Sicilia (Catania)"}, 37.50, 15.09),
    ("IT", "sardegna", "Sardinia (Oristano)", {"it": "Sardegna (Oristano)"}, 39.90, 8.59),
    # France
    ("FR", "bretagne", "Brittany (Pontivy)", {"fr": "Bretagne (Pontivy)"}, 48.07, -2.96),
    ("FR", "normandie", "Normandy (Caen)", {"fr": "Normandie (Caen)"}, 49.18, -0.37),
    ("FR", "pays-de-la-loire", "Pays de la Loire (Angers)", {"fr": "Pays de la Loire (Angers)"}, 47.47, -0.55),
    ("FR", "hauts-de-france", "Hauts-de-France (Arras)", {"fr": "Hauts-de-France (Arras)"}, 50.29, 2.78),
    ("FR", "grand-est", "Grand Est (Châlons-en-Champagne)", {"fr": "Grand Est (Châlons-en-Champagne)"}, 48.96, 4.36),
    ("FR", "centre", "Centre-Val de Loire (Orléans)", {"fr": "Centre-Val de Loire (Orléans)"}, 47.90, 1.91),
    ("FR", "auvergne-rhone-alpes", "Auvergne-Rhône-Alpes (Lyon)", {"fr": "Auvergne-Rhône-Alpes (Lyon)"}, 45.76, 4.84),
    ("FR", "nouvelle-aquitaine", "Nouvelle-Aquitaine (Bordeaux)", {"fr": "Nouvelle-Aquitaine (Bordeaux)"}, 44.84, -0.58),
    ("FR", "occitanie", "Occitanie (Toulouse)", {"fr": "Occitanie (Toulouse)"}, 43.60, 1.44),
    # Spain
    ("ES", "cataluna", "Catalonia (Lleida)", {"es": "Cataluña (Lleida)"}, 41.62, 0.62),
    ("ES", "aragon", "Aragon (Zaragoza)", {"es": "Aragón (Zaragoza)"}, 41.65, -0.88),
    ("ES", "castilla", "Castile and León (Valladolid)", {"es": "Castilla y León (Valladolid)"}, 41.65, -4.72),
    ("ES", "galicia", "Galicia (Lugo)", {"es": "Galicia (Lugo)"}, 43.01, -7.56),
    ("ES", "castilla-la-mancha", "Castile-La Mancha (Albacete)", {"es": "Castilla-La Mancha (Albacete)"}, 38.99, -1.86),
    ("ES", "andalucia", "Andalusia (Córdoba)", {"es": "Andalucía (Córdoba)"}, 37.88, -4.78),
    ("ES", "murcia", "Murcia", {"es": "Región de Murcia"}, 37.98, -1.13),
    ("ES", "extremadura", "Extremadura (Badajoz)", {"es": "Extremadura (Badajoz)"}, 38.88, -6.97),
    ("ES", "valencia", "Valencia", {"es": "Comunidad Valenciana"}, 39.47, -0.38),
    # Netherlands
    ("NL", "brabant", "North Brabant ('s-Hertogenbosch)", {"nl": "Noord-Brabant ('s-Hertogenbosch)"}, 51.69, 5.30),
    ("NL", "gelderland", "Gelderland (Barneveld)", {"nl": "Gelderland (Barneveld)"}, 52.14, 5.58),
    ("NL", "overijssel", "Overijssel (Zwolle)", {"nl": "Overijssel (Zwolle)"}, 52.52, 6.08),
    ("NL", "friesland", "Friesland (Leeuwarden)", {"nl": "Friesland (Leeuwarden)"}, 53.20, 5.80),
    ("NL", "groningen", "Groningen", {"nl": "Groningen"}, 53.22, 6.57),
    ("NL", "limburg", "Limburg (Venlo)", {"nl": "Limburg (Venlo)"}, 51.37, 6.17),
    # United Kingdom
    ("GB", "midlands", "West Midlands / Shropshire", {}, 52.71, -2.75),
    ("GB", "east-anglia", "East Anglia (Norwich)", {}, 52.63, 1.30),
    ("GB", "south-west", "South West England (Exeter)", {}, 50.72, -3.53),
    ("GB", "south-east", "South East England (Ashford)", {}, 51.15, 0.87),
    ("GB", "yorkshire", "Yorkshire (York)", {}, 53.96, -1.08),
    ("GB", "north-west", "North West England (Preston)", {}, 53.76, -2.70),
    ("GB", "wales", "Wales (Carmarthen)", {}, 51.86, -4.31),
    ("GB", "scotland", "Scotland (Stirling)", {}, 56.12, -3.94),
    ("GB", "northern-ireland", "Northern Ireland (Armagh)", {}, 54.35, -6.65),
    # United States
    ("US", "wisconsin", "Wisconsin (Green Bay)", {}, 44.52, -88.02),
    ("US", "minnesota", "Minnesota (St. Cloud)", {}, 45.56, -94.16),
    ("US", "michigan", "Michigan (Lansing)", {}, 42.73, -84.56),
    ("US", "new-york", "New York (Syracuse)", {}, 43.05, -76.15),
    ("US", "pennsylvania", "Pennsylvania (Lancaster)", {}, 40.04, -76.31),
    ("US", "iowa", "Iowa (Sioux Center)", {}, 43.08, -96.18),
    ("US", "north-carolina", "North Carolina (Clinton)", {}, 35.00, -78.32),
    ("US", "texas", "Texas Panhandle (Amarillo)", {}, 35.22, -101.83),
    ("US", "idaho", "Idaho (Twin Falls)", {}, 42.56, -114.46),
    ("US", "washington", "Washington (Yakima)", {}, 46.60, -120.51),
    ("US", "california", "California Central Valley (Tulare)", {}, 36.21, -119.35),
    # Canada
    ("CA", "ontario", "Ontario (Guelph)", {"fr": "Ontario (Guelph)"}, 43.54, -80.25),
    ("CA", "quebec", "Quebec (Saint-Hyacinthe)", {"fr": "Québec (Saint-Hyacinthe)"}, 45.63, -72.96),
    ("CA", "alberta", "Alberta (Lethbridge)", {}, 49.69, -112.84),
    ("CA", "british-columbia", "British Columbia (Abbotsford)", {"fr": "Colombie-Britannique (Abbotsford)"}, 49.05, -122.31),
    ("CA", "saskatchewan", "Saskatchewan (Saskatoon)", {}, 52.13, -106.67),
    ("CA", "manitoba", "Manitoba (Winnipeg)", {}, 49.90, -97.14),
    # Mexico
    ("MX", "jalisco", "Jalisco highlands (Tepatitlán)", {"es": "Altos de Jalisco (Tepatitlán)"}, 20.82, -102.76),
    ("MX", "guanajuato", "Guanajuato (León)", {"es": "Guanajuato (León)"}, 21.12, -101.68),
    ("MX", "la-laguna", "La Laguna (Torreón)", {"es": "Comarca Lagunera (Torreón)"}, 25.54, -103.41),
    ("MX", "chihuahua", "Chihuahua (Delicias)", {"es": "Chihuahua (Delicias)"}, 28.19, -105.47),
    ("MX", "sonora", "Sonora (Hermosillo)", {"es": "Sonora (Hermosillo)"}, 29.07, -110.96),
    ("MX", "nuevo-leon", "Nuevo León (Monterrey)", {"es": "Nuevo León (Monterrey)"}, 25.69, -100.32),
    ("MX", "veracruz", "Veracruz (Córdoba)", {"es": "Veracruz (Córdoba)"}, 18.88, -96.93),
    ("MX", "yucatan", "Yucatán (Mérida)", {"es": "Yucatán (Mérida)"}, 20.97, -89.62),
    # Argentina
    ("AR", "cordoba", "Córdoba (Villa María)", {"es": "Córdoba (Villa María)"}, -32.41, -63.24),
    ("AR", "buenos-aires", "Buenos Aires province (Pergamino)", {"es": "Provincia de Buenos Aires (Pergamino)"}, -33.89, -60.57),
    ("AR", "santa-fe", "Santa Fe (Rafaela)", {"es": "Santa Fe (Rafaela)"}, -31.25, -61.49),
    ("AR", "entre-rios", "Entre Ríos (Paraná)", {"es": "Entre Ríos (Paraná)"}, -31.73, -60.53),
    ("AR", "tucuman", "Tucumán", {"es": "Tucumán"}, -26.81, -65.22),
    ("AR", "mendoza", "Mendoza", {"es": "Mendoza"}, -32.89, -68.84),
    # Brazil
    ("BR", "santa-catarina", "West Santa Catarina (Chapecó)", {"pt": "Oeste catarinense (Chapecó)"}, -27.10, -52.62),
    ("BR", "parana", "West Paraná (Cascavel)", {"pt": "Oeste do Paraná (Cascavel)"}, -24.96, -53.46),
    ("BR", "rio-grande-do-sul", "Rio Grande do Sul (Passo Fundo)", {"pt": "Rio Grande do Sul (Passo Fundo)"}, -28.26, -52.41),
    ("BR", "sao-paulo", "São Paulo interior (Ribeirão Preto)", {"pt": "Interior de São Paulo (Ribeirão Preto)"}, -21.18, -47.81),
    ("BR", "minas-gerais", "Triângulo Mineiro (Uberaba)", {"pt": "Triângulo Mineiro (Uberaba)"}, -19.75, -47.93),
    ("BR", "goias", "Goiás (Rio Verde)", {"pt": "Goiás (Rio Verde)"}, -17.80, -50.92),
    ("BR", "mato-grosso", "Mato Grosso (Sorriso)", {"pt": "Mato Grosso (Sorriso)"}, -12.55, -55.71),
    ("BR", "pernambuco", "Pernambuco sugar belt (Recife)", {"pt": "Zona da Mata de Pernambuco (Recife)"}, -8.05, -34.88),
    # India
    ("IN", "punjab", "Punjab (Ludhiana)", {}, 30.90, 75.86),
    ("IN", "haryana", "Haryana (Karnal)", {}, 29.69, 76.99),
    ("IN", "uttar-pradesh", "Western Uttar Pradesh (Meerut)", {}, 28.98, 77.71),
    ("IN", "rajasthan", "Rajasthan (Jaipur)", {}, 26.91, 75.79),
    ("IN", "gujarat", "Gujarat (Anand)", {}, 22.56, 72.95),
    ("IN", "madhya-pradesh", "Madhya Pradesh (Indore)", {}, 22.72, 75.86),
    ("IN", "maharashtra", "Maharashtra (Pune)", {}, 18.52, 73.86),
    ("IN", "karnataka", "Karnataka (Bengaluru)", {}, 12.97, 77.59),
    ("IN", "andhra-pradesh", "Andhra Pradesh (Vijayawada)", {}, 16.51, 80.65),
    ("IN", "tamil-nadu", "Tamil Nadu (Coimbatore)", {}, 11.02, 76.96),
    ("IN", "west-bengal", "West Bengal (Kolkata)", {}, 22.57, 88.36),
    # Thailand
    ("TH", "central", "Central Thailand (Suphan Buri)", {"th": "ภาคกลาง (สุพรรณบุรี)"}, 14.47, 100.12),
    ("TH", "west", "Western Thailand (Ratchaburi)", {"th": "ภาคตะวันตก (ราชบุรี)"}, 13.54, 99.82),
    ("TH", "east", "Eastern Thailand (Chonburi)", {"th": "ภาคตะวันออก (ชลบุรี)"}, 13.36, 100.98),
    ("TH", "northeast", "Northeast (Khon Kaen)", {"th": "ภาคตะวันออกเฉียงเหนือ (ขอนแก่น)"}, 16.43, 102.84),
    ("TH", "north", "Northern Thailand (Chiang Mai)", {"th": "ภาคเหนือ (เชียงใหม่)"}, 18.79, 98.98),
    ("TH", "south", "Southern Thailand (Surat Thani)", {"th": "ภาคใต้ (สุราษฎร์ธานี)"}, 9.14, 99.33),
    # Vietnam
    ("VN", "mekong", "Mekong Delta (Cần Thơ)", {"vi": "Đồng bằng sông Cửu Long (Cần Thơ)"}, 10.03, 105.79),
    ("VN", "southeast", "Southeast (Đồng Nai)", {"vi": "Đông Nam Bộ (Đồng Nai)"}, 10.95, 106.82),
    ("VN", "central-highlands", "Central Highlands (Buôn Ma Thuột)", {"vi": "Tây Nguyên (Buôn Ma Thuột)"}, 12.67, 108.04),
    ("VN", "south-central-coast", "South Central Coast (Quy Nhơn)", {"vi": "Duyên hải Nam Trung Bộ (Quy Nhơn)"}, 13.78, 109.22),
    ("VN", "north-central", "North Central (Vinh)", {"vi": "Bắc Trung Bộ (Vinh)"}, 18.68, 105.68),
    ("VN", "red-river", "Red River Delta (Hanoi)", {"vi": "Đồng bằng sông Hồng (Hà Nội)"}, 21.03, 105.85),
    # Kazakhstan
    ("KZ", "north", "Northern Kazakhstan (Kostanay)", {"uk": "Північний Казахстан (Костанай)"}, 53.21, 63.63),
    ("KZ", "akmola", "Akmola (Astana)", {"uk": "Акмолинська обл. (Астана)"}, 51.17, 71.45),
    ("KZ", "pavlodar", "Pavlodar", {"uk": "Павлодар"}, 52.29, 76.95),
    ("KZ", "east", "East Kazakhstan (Oskemen)", {"uk": "Східний Казахстан (Усть-Каменогорськ)"}, 49.95, 82.61),
    ("KZ", "aktobe", "Aktobe", {"uk": "Актобе"}, 50.28, 57.17),
    ("KZ", "south", "Almaty region", {"uk": "Алматинська область"}, 43.24, 76.89),
    ("KZ", "turkistan", "Turkistan (Shymkent)", {"uk": "Туркестанська обл. (Шимкент)"}, 42.32, 69.59),
]

def write_data(data, path=OUT):
    """A reader/build must see either the previous complete JSON or the next complete JSON."""
    temporary = None
    try:
        with tempfile.NamedTemporaryFile(mode="w", encoding="utf-8", dir=os.path.dirname(path), suffix=".tmp", delete=False) as f:
            temporary = f.name
            json.dump(data, f, ensure_ascii=False, indent=1)
        os.replace(temporary, path)
    finally:
        if temporary and os.path.exists(temporary):
            os.unlink(temporary)


def fetch(lat, lon):
    url = (f"https://archive-api.open-meteo.com/v1/archive?latitude={lat}&longitude={lon}"
           f"&start_date={START}&end_date={END}&daily=temperature_2m_mean&models={MODEL}&timezone=GMT")
    for i in range(8):
        try:
            with urllib.request.urlopen(urllib.request.Request(url, headers={"User-Agent": "methalytics-data/1.0"}), timeout=120) as r:
                return json.load(r)
        except urllib.error.HTTPError as e:
            if e.code == 429:
                print(f"API limit: retrying in {90 * (i + 1)} seconds", flush=True)
                time.sleep(90 * (i + 1))
                continue
            raise
        except (urllib.error.URLError, TimeoutError):
            time.sleep(15)
    raise RuntimeError("giving up")


def main():
    data = json.load(open(OUT, encoding="utf-8")) if os.path.exists(OUT) else {"source": "", "regions": {}}
    source = f"ERA5 reanalysis (Copernicus/ECMWF) via Open-Meteo historical API; monthly mean of daily mean 2 m temperature {START[:4]}–{END[:4]} (recent 10-year reference, not a WMO 30-year normal)"
    for i, (cc, rid, en, loc, lat, lon) in enumerate(L):
        key = f"{cc}:{rid}"
        prev = data["regions"].get(key)
        if prev and prev.get("lat") == lat and prev.get("lon") == lon and prev.get("monthlyTempC") and prev.get("period") == [START, END] and prev.get("model") == MODEL:
            prev.update({"name": en, "names": loc})
            continue
        d = fetch(lat, lon)
        sums, counts = [0.0] * 12, [0] * 12
        for day, t in zip(d["daily"]["time"], d["daily"]["temperature_2m_mean"]):
            if t is None:
                continue
            m = int(day[5:7]) - 1
            sums[m] += t
            counts[m] += 1
        expected = (datetime.date.fromisoformat(END) - datetime.date.fromisoformat(START)).days + 1
        if sum(counts) != expected or any(c == 0 for c in counts):
            raise RuntimeError(f"Incomplete climate data for {key}: {sum(counts)}/{expected}")
        temps = [round(s / c, 1) for s, c in zip(sums, counts)]
        data["regions"][key] = {"country": cc, "id": rid, "name": en, "names": loc, "lat": lat, "lon": lon,
                                "elevationM": d.get("elevation"), "monthlyTempC": temps, "days": sum(counts),
                                "period": [START, END], "model": MODEL, "fetchedOn": datetime.date.today().isoformat(), "source": source}
        write_data(data)
        print(f"{i + 1}/{len(L)} {key} {temps}", flush=True)
        time.sleep(float(os.environ.get("SPACING", "20")))
    # keep only listed regions, in list order
    order = [f"{cc}:{rid}" for cc, rid, *_ in L]
    data["regions"] = {k: data["regions"][k] for k in order if k in data["regions"]}
    data["source"] = source
    data["fetchedOn"] = datetime.date.today().isoformat()
    write_data(data)
    print("done", len(data["regions"]))


if __name__ == "__main__":
    main()
