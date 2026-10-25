"""Trends for ~28 countries: relative interest in "biogas" vs a solar benchmark, local language. Writes docs/data/trends-countries.json
Both terms in ONE request per country, so ratio biogas/solar is comparable across countries (normalises for country size/internet use)."""
import json, time
from pathlib import Path
from pytrends.request import TrendReq

C = {
 "Польща": ("PL","pl-PL","biogazownia","fotowoltaika"), "Чехія": ("CZ","cs-CZ","bioplynová stanice","fotovoltaika"),
 "Німеччина": ("DE","de-DE","Biogasanlage","Photovoltaik"), "Австрія": ("AT","de-AT","Biogasanlage","Photovoltaik"),
 "Італія": ("IT","it-IT","biogas","fotovoltaico"), "Франція": ("FR","fr-FR","méthanisation","photovoltaïque"),
 "Іспанія": ("ES","es-ES","biogás","fotovoltaica"), "Нідерланди": ("NL","nl-NL","biogas","zonnepanelen"),
 "Данія": ("DK","da-DK","biogas","solceller"), "Швеція": ("SE","sv-SE","biogas","solceller"),
 "Фінляндія": ("FI","fi-FI","biokaasu","aurinkopaneelit"), "Литва": ("LT","lt-LT","biodujos","saulės elektrinė"),
 "Латвія": ("LV","lv-LV","biogāze","saules paneļi"), "Естонія": ("EE","et-EE","biogaas","päikesepaneelid"),
 "Румунія": ("RO","ro-RO","biogaz","panouri fotovoltaice"), "Угорщина": ("HU","hu-HU","biogáz","napelem"),
 "Словаччина": ("SK","sk-SK","bioplyn","fotovoltika"), "Болгарія": ("BG","bg-BG","биогаз","фотоволтаици"),
 "Сербія": ("RS","sr-RS","biogas","solarni paneli"), "Греція": ("GR","el-GR","βιοαέριο","φωτοβολταϊκά"),
 "Туреччина": ("TR","tr-TR","biyogaz","güneş enerjisi"), "Велика Британія": ("GB","en-GB","anaerobic digestion","solar panels"),
 "США": ("US","en-US","biogas","solar panels"), "Канада": ("CA","en-CA","biogas","solar panels"),
 "Бразилія": ("BR","pt-BR","biogás","energia solar"), "Мексика": ("MX","es-MX","biogás","paneles solares"),
 "Аргентина": ("AR","es-AR","biogás","paneles solares"), "Індія": ("IN","en-IN","biogas plant","solar panel"),
 "В'єтнам": ("VN","vi-VN","biogas","điện mặt trời"), "Таїланд": ("TH","th-TH","ก๊าซชีวภาพ","โซลาร์เซลล์"),
 "Казахстан": ("KZ","ru-KZ","биогаз","солнечные панели"), "Молдова": ("MD","ro-MD","biogaz","panouri solare"),
 "Україна": ("UA","uk-UA","біогаз","сонячна електростанція"),
}
out = {}
for name, (geo, hl, b, s) in C.items():
    for attempt in range(3):
        try:
            p = TrendReq(hl=hl, tz=0, timeout=(10, 30))
            p.build_payload([b, s], timeframe="today 5-y", geo=geo)
            df = p.interest_over_time().drop(columns=["isPartial"], errors="ignore")
            n = len(df); sb, ss = df[b].astype(float), df[s].astype(float)
            last, prev = sb.tail(52).mean(), sb.iloc[n-104:n-52].mean()
            out[name] = {"geo": geo, "biogas_term": b, "bio52": round(last,2), "sol52": round(ss.tail(52).mean(),2),
                         "ratio": round(last/max(ss.tail(52).mean(),0.01),4), "yoy": None if prev < 0.3 else round((last/prev-1)*100,1)}
            print(name, "ok", flush=True); break
        except Exception as e:
            print(name, "retry", type(e).__name__, flush=True); time.sleep(25)
    else:
        out[name] = {"error": "no data"}
    time.sleep(6)
Path("docs/data/trends-countries.json").write_text(json.dumps(out, ensure_ascii=False, indent=1), encoding="utf-8")
