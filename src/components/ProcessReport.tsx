import { INTL_TAG } from "@/i18n/config";
import type { ResultViewProps } from "./ResultView";
import type { RouteId, ScenarioId } from "@/core/types";
import { makeFormat } from "@/lib/format";
import { financialLabels, sensitivityLabels } from "@/i18n/financial-labels";
import { processCopy, processFieldLabels } from "@/i18n/processes";
import { CashFlowChart } from "./Charts";

/** A gas inlet and a COD reactor must never render an AD feedstock/digestate diagram. */
export function ProcessReport({ a, d, locale, currency, display, access, unlockSlot, afterSlot, methodologyHref }: ResultViewProps) {
  const b = a.scenarios.base, process = b.process!;
  const economicsAvailable = a.financialsAvailable ?? !process.missingInputs?.length;
  const R = d.result, L = d.labels, c = processCopy(locale), fields = processFieldLabels(locale);
  const F = makeFormat(locale, L.units, display);
  const number = new Intl.NumberFormat(INTL_TAG[locale], { maximumSignificantDigits: 6 }).format;
  const moneyLabels: Record<string,string> = { ...financialLabels(locale,d), process: c.models[process.kind], process_operation: fields.processOpexLocalYear, residual_disposal: fields.residualCostLocalT, gas_supply: fields.gasPriceLocalNm3, treatment: fields.avoidedTreatmentLocalM3 };
  const metricLabels: Record<string,string> = { nitrogen: "N", effluent: "m out", codIn: "COD in", codOut: "COD out", sludgeCod: "COD → X", methaneCod: "COD → CH₄", sludge: "m sludge (wet)", reactor: "V", effluentCod: "COD out", remainingPotential: "L₀(t)", closingPotential: "L₀(t + 1)", wasteStock: "M", vs: "VS", massIn: "m in", gasMass: "m gas", capturedCh4: "CH₄ → CHP / Upgrading / Boiler", uncapturedCh4: "CH₄ loss", generatedCh4: "CH₄ total", residual: "m residual", hrtDays: "HRT", olr: "OLR" };
  const routes: RouteId[] = ["chp","boiler","biomethane"];
  const scenarios: ScenarioId[] = access === "full" ? ["conservative","base","optimistic"] : ["base"];
  const moneyRows = (rows: {id:string;label:string;eur:number}[]) => <dl className="divide-y divide-line">{rows.map(row => <div key={row.id} className="flex justify-between gap-4 py-2"><dt>{moneyLabels[row.id as keyof typeof moneyLabels] ?? row.label}</dt><dd className="num whitespace-nowrap">{F.eur(row.eur)}</dd></div>)}</dl>;
  return <article className="space-y-7">
    {locale !== a.lang && <p className="text-sm text-muted">{d.common.reportLangNote}</p>}
    <header className="card p-5">
      <p className="text-sm text-muted">{L.business[a.input.businessType].label} · {a.countryCode} · {a.climate.regionName}</p>
      <h2 className="mt-2 text-2xl font-bold">{c.models[process.kind]}</h2>
      <p className="mt-3 text-lg font-semibold">{L.verdict[a.verdict.id]}</p>
      <p>{economicsAvailable && <>{L.route[a.bestRoute]} · </>}{L.confidence[a.confidence.level]}</p><ul className="mt-3 list-disc space-y-2 pl-5 text-sm">{a.verdict.reasons.map(t => <li key={t}>{t}</li>)}</ul>
      <p className="mt-3 text-sm text-muted">{c.inputHint}</p>
      <p className="mt-2 text-xs text-muted">Model {a.dataAudit?.modelVersion} · {a.dataAudit?.asOfDate} · {a.dataAudit?.inputVersion}</p>
    </header>
    <section className="card p-5"><h3 className="font-bold">{R.flowTitle}</h3>
      <dl className="mt-3 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {(economicsAvailable ? [...[R.heatProduced,R.heatUseful,R.energy].map((label,i) => [label,[b.energy.heatProducedKwh,b.energy.heatUsefulKwh,b.energy.elNetKwh][i]/1000,"MWh/a"] as const), ["CH₄",b.energy.ch4ProducedM3,"Nm³/a"] as const, [L.route.biomethane,b.energy.biomethaneNm3,"Nm³/a"] as const] : [["CH₄",b.feed.ch4M3Year,"Nm³/a"],[R.biogas,b.feed.biogasM3Year,"Nm³/a"]] as const).map(([label,value,unit]) => <div key={label}><dt className="text-sm text-muted">{label}</dt><dd className="num font-semibold">{F.n0(value)} {unit}</dd></div>)}
      </dl>
    </section>
    {!economicsAvailable && <section className="card p-5"><h3 className="font-bold">{R.whatWouldChange}</h3><p className="mt-2">{c.costHint}</p><ul className="mt-3 list-disc pl-5">{process.missingInputs.map(key => <li key={key}>{fields[key]}: —</li>)}</ul></section>}
    {access === "free" ? economicsAvailable && <section className="card p-5"><h3 className="font-bold">{R.lockedTitle}</h3><p className="mt-2">{R.lockedText}</p>{unlockSlot}</section> : <>
      <section className="card p-5"><h3 className="font-bold">{R.detailsTitle}</h3>
        <p className="mt-2 text-sm">{c.inputHint}</p>
        <dl className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">{Object.entries(process.metrics).map(([id,m]) => <div key={id}><dt className="text-sm text-muted">{metricLabels[id] ?? fields[id]}</dt><dd className="num">{number(m.value)} {m.unit}</dd></div>)}</dl>
        <p className="mt-4 text-sm">{c.costHint}</p>
      </section>
      {economicsAvailable && <>
      <section className="card p-5"><h3 className="font-bold">{R.capacity}</h3><p className="mt-2 num">CHP: {F.n0(b.energy.chpKwEl)} kWe · {R.biogas}: {F.n1(b.energy.rawBiogasDesignNm3PerHour)} Nm³/h</p><p className="mt-2">{R.elSplit}: {F.n0(b.energy.elSelfConsumedKwh / 1000)} / {F.n0(b.energy.elExportedKwh / 1000)} MWh/a</p><p>{moneyLabels.el_purchased}: {F.n0(b.energy.elPurchasedKwh / 1000)} MWh/a · {moneyLabels.heat_external}: {F.n0(b.energy.heatExternalPurchasedKwh / 1000)} MWh/a</p><p>{d.flow.electricity} · E_aux: {F.n0(b.energy.elParasiticKwh / 1000)} MWh/a</p><p>CH₄ → CHP / Boiler / Upgrading / Flare: {[b.energy.ch4ToChpM3,b.energy.ch4ToBoilerM3,b.energy.ch4ToUpgraderM3,b.energy.ch4FlaredM3].map(F.n0).join(" / ")} Nm³/a</p></section>
      <section className="space-y-3"><h3 className="font-bold">{R.scenariosTitle}</h3>
        <div className="overflow-x-auto"><table className="w-full min-w-[650px] text-left text-sm"><thead><tr>{[R.scenariosTitle,"CAPEX",R.rowOpex,R.rowRevenue,"NPV","IRR","DSCR",R.rowPayback].map(t => <th className="p-3" key={t}>{t}</th>)}</tr></thead>
          <tbody>{scenarios.map(s => { const r = a.scenarios[s]; return <tr key={s} className="border-t border-line"><th className="p-3">{L.scenario[s]}</th>{[F.eur(r.capex.totalEur),F.eur(r.opexRev.opexEur),F.eur(r.opexRev.revenueEur),F.eur(r.fin.npvEur),r.fin.irr === null ? "—" : F.pct(r.fin.irr,1),r.fin.dscrMin === null ? "—" : F.n1(r.fin.dscrMin),F.years(r.fin.simplePaybackYears)].map((v,i) => <td className="num p-3" key={i}>{v}</td>)}</tr>; })}</tbody>
        </table></div>
        <CashFlowChart scenarios={a.scenarios} t={d.charts} scn={L.scenario} compact={F.monetaryCompact} ids={scenarios} />
        <p className="text-sm text-muted">{R.finNote.replace("{debt}",F.pct(b.fin.debtEur / Math.max(1,b.fin.capexEur)))}</p>
      </section>
      <section className="grid gap-5 lg:grid-cols-3">{[["CAPEX",b.capex.lines],["OPEX",b.opexRev.opex],[R.rowRevenue,b.opexRev.revenue]].map(([label,rows]) => <div className="card p-4" key={label as string}><h3 className="font-bold">{label as string}</h3>{moneyRows(rows as typeof b.capex.lines)}</div>)}</section>
      {access === "full" && <>
        <section className="space-y-3"><h3 className="font-bold">{R.routesTitle}</h3><div className="overflow-x-auto"><table className="w-full min-w-[650px] text-left text-sm"><thead><tr>{[R.colRoute,R.scenariosTitle,"CAPEX","EBITDA","NPV","DSCR"].map(t => <th className="p-3" key={t}>{t}</th>)}</tr></thead><tbody>{routes.flatMap(route => scenarios.map(s => { const r = a.routeMatrix[route][s]; return <tr key={`${route}-${s}`} className="border-t border-line"><th className="p-3">{L.route[route]}{route === a.bestRoute && <span className="chip ml-1">{R.chosen}</span>}</th><td className="p-3">{L.scenario[s]}</td>{[F.eur(r.capex.totalEur),F.eur(r.fin.ebitdaEurYear),F.eur(r.fin.npvEur),r.fin.dscrMin === null ? "—" : F.n1(r.fin.dscrMin)].map((v,i) => <td className="num p-3" key={i}>{v}</td>)}</tr>; }))}</tbody></table></div></section>
        <section className="card p-5"><h3 className="font-bold">{R.robust.drivers}</h3><ul className="mt-3 space-y-2">{a.parameterSensitivity?.filter(s => s.parameterId.startsWith("process.")).map(s => <li key={s.parameterId}>{fields[s.parameterId.slice(8)]}: {number(s.lowInput)}–{number(s.highInput)} → NPV {F.range(s.lowNpvEur,s.highNpvEur,F.eur)}</li>)}</ul></section>
        <section className="card p-5"><h3 className="font-bold">{R.robust.drivers}</h3><ul className="mt-3 space-y-2">{a.sensitivity.map(s => <li className="flex justify-between gap-4" key={s.id}><span>{sensitivityLabels(locale,d)[s.id] ?? s.label}</span><span className="num">Δ NPV {F.eur(s.deltaNpvEur)}</span></li>)}</ul></section>
      </>}
      </>}
      <details className="card p-5"><summary className="font-bold">{R.dAssumptions.replace("{n}",String(process.provenance.length))}</summary><p className="mt-3">{c.inputHint}</p><ul className="mt-3 space-y-2 text-sm">{process.provenance.map(p => <li key={p.id}>{fields[p.id.replace("process.","")] ?? p.label}: {number(p.value)} {p.unit.replace("local",currency)} · {p.origin} · {p.confidence} · {p.date} · {p.country}{p.source.startsWith("https://") && <> · <a href={p.source} className="underline" rel="noreferrer" target="_blank">{p.source}</a></>}</li>)}</ul><a className="mt-3 inline-block underline" href={methodologyHref}>{R.assumptionsText}</a></details>
      <section className="card p-5"><h3 className="font-bold">{R.dReg}</h3><p className="mt-2 text-sm">{R.regNote}</p><ul className="mt-3 list-disc space-y-2 pl-5">{a.regulatory.items.map(r => <li key={r.id}>{r.title}</li>)}</ul></section>
      <details className="card p-5"><summary className="font-bold">{R.dSafety}</summary><ul className="mt-3 space-y-4">{a.safety.map(r => <li key={r.id}><strong>{r.hazard}</strong><ul className="mt-2 list-disc space-y-1 pl-5 text-sm">{r.controls.map(c => <li key={c}>{c}</li>)}</ul></li>)}</ul></details>
      <details className="card p-5"><summary className="font-bold">{R.countryNotes}</summary><p className="mt-3">{a.input.process?.basisReference}</p><ul className="mt-3 space-y-3 text-sm">{a.marketEvidence?.map(p => <li key={p.id}><strong>{p.label}: {F.n1(p.value)} {p.unit}</strong><br />{p.source} · {p.date} · {p.confidence} · {p.origin}</li>)}</ul></details>
      <section className="card p-5"><h3 className="font-bold">{R.warnings}</h3><ul className="mt-3 list-disc space-y-2 pl-5 text-sm">{[...a.confidence.reasons,...a.warnings].map(t => <li key={t}>{t}</li>)}</ul></section>
    </>}
    <section className="card p-5"><h3 className="font-bold">{R.whatWouldChange}</h3><ul className="mt-3 list-disc space-y-2 pl-5">{a.verdict.whatWouldChange.map(t => <li key={t}>{t}</li>)}</ul></section>
    {afterSlot}
  </article>;
}
