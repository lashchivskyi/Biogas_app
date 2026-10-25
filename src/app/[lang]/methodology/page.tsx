import type { Metadata } from "next";
import { PageHero } from "@/components/PageHero";
import { allProvenance } from "@/core";
import { COUNTRIES, COUNTRY_ORDER, UA } from "@/countries";
import { countryName, getDictionary, type Locale } from "@/i18n";
import { alternates } from "@/i18n/seo";

export async function generateMetadata({ params }: PageProps<"/[lang]/methodology">): Promise<Metadata> {
  const { lang } = await params;
  const d = await getDictionary(lang);
  return { title: d.method.title, description: d.method.lead, alternates: alternates(lang as Locale, "/methodology") };
}

const CONF_STYLE = { LOW: "bg-red-100 text-red-900", MEDIUM: "bg-amber-100 text-amber-900", HIGH: "bg-brandsoft text-brandink" } as const;
const GROUPS: Array<[string, (id: string) => boolean]> = [
  ["Physics & process", (id) => id.startsWith("eng.") && !/^eng\.(capex|opex|chp)/.test(id)],
  ["CHP", (id) => id.startsWith("eng.chp")],
  ["CAPEX (EU baseline, 2025 EUR)", (id) => id.startsWith("eng.capex")],
  ["OPEX", (id) => id.startsWith("eng.opex")],
  ["Market: Ukraine (calibrated)", (id) => id.startsWith("econ.")],
  ["Scenarios", (id) => id.startsWith("scn.")],
];
const val = (c: (typeof COUNTRIES)[string], id: string) => c.params.find((p) => p.id === id)?.value;

export default async function MethodologyPage({ params }: PageProps<"/[lang]/methodology">) {
  const { lang } = await params;
  const locale = lang as Locale;
  const d = await getDictionary(locale);
  const M = d.method;
  const all = allProvenance(UA);
  return (
    <main>
      <PageHero eyebrow={M.eyebrow} title={M.title} lead={M.lead} />
      <div className="container-x space-y-12 py-10">
        {locale !== "en" && <p className="rounded-2xl bg-surface2 p-4 text-sm text-ink2">{d.common.englishOnly}</p>}
        <section className="grid gap-6 md:grid-cols-2">
          <div className="card p-5">
            <h2 className="text-xl font-bold">{M.chainTitle}</h2>
            <ol className="mt-3 list-decimal space-y-2 pl-5 text-sm text-ink2">
              <li><b>Feedstock.</b> Head counts → tonnes (manure yield × collectable share), then dry matter → volatile solids → methane (L CH₄/kg VS). Month-by-month seasonality.</li>
              <li><b>Digester.</b> Volume = max(retention time, organic loading). Technology chosen by dry matter and climate: CSTR, solids feeding, dry digestion, high-rate reactor, or an unheated covered lagoon in warm climates. Monthly heat balance for the project region.</li>
              <li><b>Energy.</b> Monthly balance for CHP, boiler or biomethane: digester heat first, then produced heat is matched against the real demand.</li>
              <li><b>Economics.</b> Component CAPEX × country factor; OPEX; revenue and savings (own use, export, heat, disposal, digestate); NPV, IRR and DSCR over 15 years at the country discount rate.</li>
              <li><b>Scenarios, stress tests, support.</b> Conservative / base / optimistic, eight stress tests, and every national support scheme as a separate case.</li>
              <li><b>Verdict.</b> Rule-based on payback, scenario NPVs, DSCR and data quality — never on a single composite score, never with subsidies.</li>
            </ol>
          </div>
          <div className="card p-5">
            <h2 className="text-xl font-bold">{M.notTitle}</h2>
            <ul className="mt-3 list-disc space-y-2 pl-5 text-sm text-ink2">
              <li>It does not replace a laboratory: methane yields are literature ranges, not measurements of your feedstock.</li>
              <li>No energy crops by default — wastes and residues first.</li>
              <li>Subsidies are never in the verdict; national schemes are shown separately with status and source.</li>
              <li>No taxes, VAT, working capital or currency shocks beyond the discount rate.</li>
              <li>Country profiles outside Ukraine are order-of-magnitude estimates (LOW confidence) — enter your own prices.</li>
              <li>It is not an engineering design. Final decisions and safety require qualified professional review.</li>
            </ul>
          </div>
        </section>

        <section>
          <h2 className="text-xl font-bold">Country conditions ({COUNTRY_ORDER.length})</h2>
          <div className="card mt-3 overflow-x-auto">
            <table className="num w-full min-w-[980px] text-sm">
              <thead>
                <tr className="text-left text-xs uppercase tracking-wide text-muted">
                  <th className="p-3">Country</th><th className="p-3">Data</th><th className="p-3 text-right">Power €/kWh</th><th className="p-3 text-right">Export €/kWh</th><th className="p-3 text-right">Gas €/MWh</th><th className="p-3 text-right">Labour €/h</th><th className="p-3 text-right">CAPEX ×</th><th className="p-3 text-right">Discount</th><th className="p-3">Biomethane grid</th><th className="p-3">Support schemes</th>
                </tr>
              </thead>
              <tbody>
                {COUNTRY_ORDER.map((code) => {
                  const c = COUNTRIES[code];
                  return (
                    <tr key={code} className="border-t border-line align-top">
                      <td className="p-3 font-sans font-semibold">{countryName(code, locale)}</td>
                      <td className="p-3 font-sans"><span className={`chip ${c.maturity === "operational" ? "bg-brandsoft text-brandink" : "bg-amber-100 text-amber-900"}`}>{c.maturity === "operational" ? "calibrated" : "profile"}</span></td>
                      <td className="p-3 text-right">{val(c, "econ.electricity_retail_eur_kwh")}</td>
                      <td className="p-3 text-right">{val(c, "econ.electricity_export_eur_kwh")}</td>
                      <td className="p-3 text-right">{val(c, "econ.gas_price_eur_mwh")}</td>
                      <td className="p-3 text-right">{val(c, "econ.labour_eur_h")}</td>
                      <td className="p-3 text-right">{val(c, "econ.capex_factor")}</td>
                      <td className="p-3 text-right">{((val(c, "econ.discount_rate") ?? 0) * 100).toFixed(1)} %</td>
                      <td className="p-3 font-sans">{c.biomethaneInjection ? "yes" : "not yet"}</td>
                      <td className="p-3 font-sans text-xs text-ink2">{c.support.schemes.length ? c.support.schemes.map((s) => `${s.name} (${s.status})`).join("; ") : "—"}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>

        {GROUPS.map(([title, test]) => {
          const rows = all.filter((p) => test(p.id));
          if (!rows.length) return null;
          return (
            <section key={title}>
              <h2 className="text-xl font-bold">{title} <span className="text-sm font-normal text-muted">({rows.length})</span></h2>
              <div className="card mt-3 overflow-x-auto">
                <table className="w-full min-w-[820px] text-sm">
                  <thead>
                    <tr className="text-left text-xs uppercase tracking-wide text-muted">
                      <th className="p-3">{M.param}</th><th className="p-3 text-right">{M.value}</th><th className="p-3">{M.type}</th><th className="p-3">{M.conf}</th><th className="p-3">{M.source}</th><th className="p-3">{M.date}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((p) => (
                      <tr key={p.id} className="border-t border-line align-top">
                        <td className="p-3"><div className="font-medium">{p.label}</div><div className="font-mono text-[11px] text-muted">{p.id}</div>{p.note && <div className="text-xs text-muted">{p.note}</div>}</td>
                        <td className="num p-3 text-right font-semibold">{p.value} <span className="font-normal text-muted">{p.unit}</span></td>
                        <td className="p-3 text-xs font-semibold">{p.kind}</td>
                        <td className="p-3"><span className={`chip ${CONF_STYLE[p.confidence]}`}>{p.confidence}</span></td>
                        <td className="p-3 text-xs text-ink2">{p.source} <span className="text-muted">· {p.country}</span></td>
                        <td className="num p-3 text-xs text-muted">{p.date}</td>
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
