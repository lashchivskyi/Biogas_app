import type { Metadata } from "next";
import { PageHero } from "@/components/PageHero";
import { HelpTooltip } from "@/components/HelpTooltip";
import { CountryFlag } from "@/components/CountryFlag";
import { allProvenance } from "@/core";
import { COUNTRIES, COUNTRY_ORDER, UA } from "@/countries";
import { countryName, getDictionary, INTL_TAG, type Locale } from "@/i18n";
import { alternates } from "@/i18n/seo";
import { methodologyCopy } from "@/i18n/methodology";
import "./methodology.css";

export async function generateMetadata({ params }: PageProps<"/[lang]/methodology">): Promise<Metadata> {
  const { lang } = await params;
  const d = await getDictionary(lang);
  return { title: d.method.title, description: d.method.lead, alternates: alternates(lang as Locale, "/methodology") };
}

const CONF_STYLE = { LOW: "bg-red-100 text-red-900", MEDIUM: "bg-amber-100 text-amber-900", HIGH: "bg-brandsoft text-brandink" } as const;
const GROUPS: Array<(id: string) => boolean> = [
  (id) => id.startsWith("eng.") && !/^eng\.(capex|opex|chp)/.test(id),
  (id) => id.startsWith("eng.chp"),
  (id) => id.startsWith("eng.capex"),
  (id) => id.startsWith("eng.opex"),
  (id) => id.startsWith("econ."),
  (id) => id.startsWith("scn."),
];
const DOT = { LOW: "bg-red-500", MEDIUM: "bg-amber-500", HIGH: "bg-emerald-600" } as const;
// Source terminology stays in English alongside the localised client explanation.
const TECHNICAL_NOTES = [
  "Manure yield × collectable share → tonnes → dry matter → volatile solids → methane (L CH₄/kg VS).",
  "Volume = max(retention time, organic loading). CSTR / solids feeding / dry digestion / high-rate reactor / unheated covered lagoon (warm climates).",
  "Monthly energy balance: CHP / boiler / biomethane; digester heat first.",
  "Component CAPEX × country factor; OPEX; own use / export / heat / disposal / digestate. NPV / IRR / DSCR: 15 years.",
] as const;
/** Value with its confidence dot; the source is in the tooltip. */
function Cell({ c, id, locale, percentage = false }: { c: (typeof COUNTRIES)[string]; id: string; locale: Locale; percentage?: boolean }) {
  const p = c.params.find((x) => x.id === id);
  return (
    <td className="methodology-numericCell">
      {p && <HelpTooltip description={`${p.source} (${p.confidence})`}>
        {new Intl.NumberFormat(INTL_TAG[locale], { style: percentage ? "percent" : "decimal", maximumFractionDigits: percentage ? 1 : 6 }).format(p.value)}
        <span className={`inline-block h-1.5 w-1.5 rounded-full ${DOT[p.confidence]}`} aria-label={p.confidence} />
      </HelpTooltip>}
    </td>
  );
}

export default async function MethodologyPage({ params }: PageProps<"/[lang]/methodology">) {
  const { lang } = await params;
  const locale = lang as Locale;
  const d = await getDictionary(locale);
  const M = d.method;
  const copy = methodologyCopy[locale];
  const all = allProvenance(UA);
  return (
    <main>
      <PageHero eyebrow={M.eyebrow} title={M.title} lead={M.lead} />
      <div className="container-x methodology-content">
        <nav className="methodology-sectionNav" aria-label={M.title}>
          <a href="#country-conditions">{copy.countries}<span className="num">{COUNTRY_ORDER.length}</span></a>
          {GROUPS.map((test, index) => {
            const count = all.filter((p) => test(p.id)).length;
            return count > 0 && <a key={index} href={`#parameter-group-${index}`}>{copy.groups[index]}<span className="num">{count}</span></a>;
          })}
        </nav>
        <div className="methodology-overview">
          <section className="methodology-process" aria-labelledby="calculation-chain">
            <h2 id="calculation-chain" className="methodology-panelTitle">{M.chainTitle}</h2>
            <ol className="methodology-steps">
              {copy.chain.map((step, index) => <li key={step}>
                {step}
                {index < TECHNICAL_NOTES.length && <p lang="en" className="methodology-technicalDetail">{TECHNICAL_NOTES[index]}</p>}
              </li>)}
            </ol>
          </section>
          <section className="methodology-limitations" aria-labelledby="model-limitations">
            <h2 id="model-limitations" className="methodology-panelTitle">{M.notTitle}</h2>
            <ul className="methodology-limits">
              {copy.limitations.map((item, index) => <li key={item}>
                {item}
                {index === 4 && <p lang="en" className="methodology-technicalDetail">Eurostat · national regulators · EIA · World Bank · ERA5 climate · Damodaran country risk</p>}
              </li>)}
            </ul>
          </section>
        </div>
        <p className="methodology-technicalNote">{copy.technicalNote}</p>

        <section id="country-conditions" className="methodology-section" aria-labelledby="country-conditions-title">
          <div className="methodology-sectionHeading">
            <h2 id="country-conditions-title">{copy.countries} <span className="methodology-count">{COUNTRY_ORDER.length}</span></h2>
            <p id="country-confidence-legend" className="methodology-legend">{copy.legend}</p>
          </div>
          <div className="methodology-tableFrame" role="region" aria-labelledby="country-conditions-title" tabIndex={0}>
            <table className="num methodology-table methodology-countryTable" aria-labelledby="country-conditions-title" aria-describedby="country-confidence-legend">
              <colgroup>
                <col className="methodology-countryColumn" /><col style={{ width: 128 }} />
                <col style={{ width: 128 }} /><col style={{ width: 112 }} /><col style={{ width: 88 }} />
                <col style={{ width: 88 }} /><col style={{ width: 80 }} /><col style={{ width: 128 }} />
                <col style={{ width: 140 }} /><col />
              </colgroup>
              <thead>
                <tr>
                  {copy.columns.map((label, index) => (
                    <th key={label} scope="col" className={index >= 2 && index <= 7 ? "methodology-numericCell" : undefined}>
                      <HelpTooltip description={copy.countryHelp[index]}>{label}</HelpTooltip>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {COUNTRY_ORDER.map((code) => {
                  const c = COUNTRIES[code];
                  return (
                    <tr key={code}>
                      <th scope="row"><span className="methodology-countryName"><CountryFlag code={code} />{countryName(code, locale)}</span></th>
                      <td><span className={`methodology-badge ${c.dataStatus === "estimated" ? "bg-amber-100 text-amber-900" : "bg-brandsoft text-brandink"}`}>{copy.data[c.dataStatus === "calibrated" ? 0 : c.dataStatus === "official" ? 1 : 2]}</span></td>
                      <Cell c={c} locale={locale} id="econ.electricity_retail_eur_kwh" />
                      <Cell c={c} locale={locale} id="econ.electricity_spot_eur_kwh" />
                      <Cell c={c} locale={locale} id="econ.gas_price_eur_mwh" />
                      <Cell c={c} locale={locale} id="econ.labour_official_eur_h" />
                      <Cell c={c} locale={locale} id="econ.capex_factor" />
                      <Cell c={c} locale={locale} id="econ.discount_rate" percentage />
                      <td>{copy.injection[c.biomethaneInjection ? 0 : 1]}</td>
                      <td className="methodology-source">{c.support.schemes.length ? c.support.schemes.map((s) => `${s.name} (${d.result.status[s.status]})`).join("; ") : "—"}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>

        {GROUPS.map((test, groupIndex) => {
          const title = copy.groups[groupIndex];
          const rows = all.filter((p) => test(p.id));
          if (!rows.length) return null;
          return (
            <section key={title} id={`parameter-group-${groupIndex}`} className="methodology-section" aria-labelledby={`parameter-title-${groupIndex}`}>
              <div className="methodology-sectionHeading">
                <h2 id={`parameter-title-${groupIndex}`}>{title} <span className="methodology-count">{rows.length}</span></h2>
              </div>
              <div className="methodology-tableFrame" role="region" aria-labelledby={`parameter-title-${groupIndex}`} tabIndex={0}>
                <table className="methodology-table methodology-registerTable" aria-labelledby={`parameter-title-${groupIndex}`}>
                  <colgroup>
                    <col className="methodology-parameterColumn" /><col style={{ width: 156 }} />
                    <col style={{ width: 126 }} /><col style={{ width: 118 }} /><col /><col style={{ width: 104 }} />
                  </colgroup>
                  <thead>
                    <tr>
                      {[M.param, M.value, M.type, M.conf, M.source, M.date].map((label, index) => (
                        <th key={label} scope="col" className={index === 1 ? "methodology-numericCell" : undefined}>
                          <HelpTooltip description={copy.registerHelp[index]}>{label}</HelpTooltip>
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((p) => (
                      <tr key={p.id}>
                        <th scope="row" lang="en"><div className="methodology-parameterLabel">{p.label}</div><div className="methodology-parameterId">{p.id}</div>{p.note && <div className="methodology-parameterNote">{p.note}</div>}</th>
                        <td className="num methodology-numericCell methodology-parameterValue">{new Intl.NumberFormat(INTL_TAG[locale], { maximumFractionDigits: 8 }).format(p.value)} <span className="methodology-unit">{p.unit}</span></td>
                        <td className="methodology-kind">{p.kind}</td>
                        <td><span className={`methodology-badge ${CONF_STYLE[p.confidence]}`}>{p.confidence}</span></td>
                        <td className="methodology-source">{p.source} <span className="text-muted">· {p.country}</span></td>
                        <td className="num methodology-date"><time dateTime={p.date}>{new Intl.DateTimeFormat(INTL_TAG[locale], { dateStyle: "short", timeZone: "UTC", calendar: "gregory" }).format(new Date(`${p.date}T00:00:00Z`))}</time></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          );
        })}
      </div>
    </main>
  );
}
