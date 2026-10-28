"use client";

import { useCallback, useEffect, useId, useMemo, useRef, useState } from "react";
import { assess, ANIMALS, BUSINESS_TYPES, FEEDSTOCKS, HANDLING_IDS } from "@/core";
import type { AnimalKind, BusinessTypeId, FeedstockTypeId, HandlingId, HeatNeed, ProjectInput } from "@/core";
import { EXAMPLES } from "@/core/examples";
import { COUNTRIES } from "@/countries";
import { PLAN_IDS, type PlanId } from "@/config/plans";
import { countryName, fmt, type Dict, type Locale } from "@/i18n";
import { coreLang, INTL_TAG } from "@/i18n/config";
import { track } from "@/lib/analytics";
import { emptyLine, formToInput, initialForm, inputToForm, invalidNumberStep, linesForBusiness, recontextualizeForm, uiDefaults } from "@/lib/form";
import { parseLocalizedNumber } from "@/lib/localized-number";
import { numberError } from "@/i18n/errors";
import { useLocale, usePreferences } from "./LocaleProvider";
import { preferenceCopy } from "@/i18n/preferences";
import type { FormLine, FormState } from "@/lib/form";
import { UnlockButton } from "./payments/Checkout";
import { CurrencyResultView as ResultView } from "./CurrencyResultView";
import { WhatIf } from "./WhatIf";
import { CountrySelect } from "./CountrySelect";
import { CountryFlag } from "./CountryFlag";
import { CitySelect } from "./CitySelect";
import { locationCopy } from "@/i18n/location";
import { calculatorHelp } from "@/i18n/calculator-help";
import { HelpTooltip } from "./HelpTooltip";

const STORAGE_KEY = "mx.form.v2";

export type CalculatorDict = Pick<Dict, "calc" | "labels" | "result" | "flow" | "charts" | "common" | "checkout" | "pricing" | "country">;

export interface ExampleSummary {
  id: string;
  title: string;
  verdict: string;
  tone: "good" | "mid" | "weak";
  countryCode: string;
}

function Field({ label, hint, tooltip, children, htmlFor }: { label: string; hint?: string; tooltip?: string; children: React.ReactNode; htmlFor?: string }) {
  const description = tooltip ?? hint;
  return (
    <div>
      {description ? (
        <div className="label">
          <label className="sr-only" htmlFor={htmlFor}>{label}</label>
          <HelpTooltip description={description}>{label}</HelpTooltip>
        </div>
      ) : <label className="label" htmlFor={htmlFor}>{label}</label>}
      {children}
      {hint && <p className="hint">{hint}</p>}
    </div>
  );
}

function Num({ value, onChange, placeholder, unit, id }: { value: string; onChange: (v: string) => void; placeholder?: string; unit?: string; id?: string }) {
  const locale = useLocale();
  const fallbackId = useId();
  const errorId = `${id ?? fallbackId}-error`;
  const invalid = value.trim() !== "" && parseLocalizedNumber(value, locale) === undefined;
  return (
    <div>
      <div className="relative">
        <input id={id} className="field num pr-24" inputMode="decimal" value={value} placeholder={placeholder} aria-invalid={invalid || undefined} aria-describedby={invalid ? errorId : undefined} onChange={(e) => onChange(e.target.value)} />
        {unit && <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted">{unit}</span>}
      </div>
      {invalid && <p id={errorId} className="mt-1 text-xs text-bad">{numberError[locale]}</p>}
    </div>
  );
}

function Toggle({ checked, onChange, label }: { checked: boolean; onChange: (v: boolean) => void; label: string }) {
  return (
    <label className="flex cursor-pointer items-center gap-3 rounded-lg border border-line bg-surface px-3 py-2.5 text-sm">
      <input type="checkbox" className="h-4 w-4" checked={checked} onChange={(e) => onChange(e.target.checked)} />
      {label}
    </label>
  );
}


export function Calculator({ locale, d, examples, demo, samplesHref }: { locale: Locale; d: CalculatorDict; examples: ExampleSummary[]; demo: boolean; samplesHref: string }) {
  const C = d.calc;
  const L = d.labels;
  const lang = coreLang(locale);
  const preferences = usePreferences();
  const { ready: contextReady, country: projectCountry, region: projectRegion, city: projectCity } = preferences;
  const [formReady, setFormReady] = useState(false);
  const initialized = useRef(false);
  const [form, setForm] = useState<FormState>(() => initialForm("dairy_farm", "GB", "", locale));
  const [restored, setRestored] = useState(false);
  const [step, setStep] = useState(0);
  const [submitted, setSubmitted] = useState(false);
  const [assessmentDate, setAssessmentDate] = useState<string>();
  const [error, setError] = useState("");
  const [preferredPlan, setPreferredPlan] = useState<PlanId>("report");
  const resultRef = useRef<HTMLDivElement>(null);
  const started = useRef(false);

  // A single project context feeds the form, prices and methodology. Locale changes only reformat inputs.
  useEffect(() => {
    if (!contextReady) return;
    const adapter = COUNTRIES[projectCountry];
    if (!initialized.current) {
      initialized.current = true;
      const q = new URLSearchParams(window.location.search);
      const plan = q.get("plan");
      // eslint-disable-next-line react-hooks/set-state-in-effect -- hydrate the browser draft after deterministic SSR
      if (PLAN_IDS.includes(plan as PlanId)) setPreferredPlan(plan as PlanId);
      let next: FormState = { ...initialForm("dairy_farm", adapter.code, projectRegion ?? "", locale), city: projectCity };
      let hasDraft = false;
      try {
        const raw = localStorage.getItem(STORAGE_KEY);
        const parsed = raw ? JSON.parse(raw) as FormState : null;
        if (parsed?.lines?.length && Object.hasOwn(COUNTRIES, parsed.countryCode)) {
          next = recontextualizeForm(parsed, adapter, projectRegion, locale, projectCity);
          hasDraft = true;
          setRestored(true);
        }
      } catch { /* Draft storage is optional. */ }
      const business = q.get("b");
      if (business && Object.hasOwn(BUSINESS_TYPES, business)) {
        if (!hasDraft || next.businessType !== business) next = { ...initialForm(business as BusinessTypeId, adapter.code, projectRegion ?? "", locale), city: projectCity };
        setStep(1);
      }
      setForm(next);
      setFormReady(true);
      return;
    }
    setForm((current) => recontextualizeForm(current, adapter, projectRegion, locale, projectCity));
  }, [contextReady, projectCountry, projectRegion, projectCity, locale]);
  useEffect(() => {
    if (!formReady) return;
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(form)); } catch { /* Private mode. */ }
  }, [form, formReady]);

  const country = COUNTRIES[form.countryCode] ?? COUNTRIES.GB;
  const cur = country.currency;
  const def = uiDefaults(country);
  const money2 = (v: number) => new Intl.NumberFormat(INTL_TAG[locale], { maximumFractionDigits: v < 10 ? 2 : 0 }).format(v);

  const set = useCallback(<K extends keyof FormState>(k: K, v: FormState[K]) => {
    if (!started.current) {
      started.current = true;
      track("calculator_start");
    }
    setForm((f) => ({ ...f, [k]: v }));
  }, []);

  const updateLine = (id: string, patch: Partial<FormLine>) => setForm((f) => ({ ...f, lines: f.lines.map((l) => (l.id === id ? { ...l, ...patch } : l)) }));

  const input = useMemo(() => formToInput(form, country, lang), [form, country, lang]);
  const assessment = useMemo(() => (submitted && form.regionId ? assess(input, country, { asOfDate: assessmentDate }) : null), [submitted, form.regionId, input, country, assessmentDate]);

  function next() {
    setError("");
    if (step === 0 && !form.regionId) { setError(locationCopy(locale).title + ": " + C.choose); return; }
    const invalidStep = invalidNumberStep(form);
    if (invalidStep !== null && invalidStep <= step) {
      setError(numberError[locale]);
      setStep(invalidStep);
      return;
    }
    if (step === 1 && input.feedstocks.length === 0) {
      setError(C.errNoFeed);
      return;
    }
    track("calculator_step", { step: step + 1 });
    setStep((s) => Math.min(C.steps.length - 1, s + 1));
  }

  function calculate() {
    setError("");
    if (!form.regionId) { setError(locationCopy(locale).title + ": " + C.choose); setStep(0); return; }
    const invalidStep = invalidNumberStep(form);
    if (invalidStep !== null) {
      setError(numberError[locale]);
      setStep(invalidStep);
      return;
    }
    if (input.feedstocks.length === 0) {
      setError(C.errNoFeedStep);
      setStep(1);
      return;
    }
    setSubmitted(true);
    const asOfDate = new Date().toISOString().slice(0, 10);
    setAssessmentDate(asOfDate);
    const a = assess(input, country, { asOfDate });
    track("calculator_submit", { verdict: a.verdict.id, confidence: a.confidence.level, route: a.bestRoute, country: country.code });
    setTimeout(() => resultRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }), 50);
  }

  function loadExample(id: string) {
    const ex = EXAMPLES.find((e) => e.id === id);
    if (!ex) return;
    setForm(inputToForm(ex.input, locale));
    preferences.setLocation(ex.input.countryCode, ex.input.regionId, ex.input.city);
    setSubmitted(false);
    setStep(1);
    track("example_loaded", { id });
  }

  function startOver() {
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch {
      /* ignore */
    }
    const g = preferences.country;
    setForm({ ...initialForm("dairy_farm", g, preferences.region ?? "", locale), city: preferences.city });
    setSubmitted(false);
    setRestored(false);
    setStep(0);
    window.scrollTo({ top: 0, behavior: "smooth" });
    track("calculator_reset");
  }

  function applyWhatIf(n: ProjectInput) {
    setForm(inputToForm(n, locale));
    track("whatif_applied");
    setTimeout(() => resultRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }), 50);
  }

  if (!formReady) return <div className="card min-h-64 animate-pulse p-8" role="status" aria-label={preferenceCopy(locale).detecting}><div className="h-6 w-2/3 rounded bg-surface2" /><div className="mt-6 h-12 rounded bg-surface2" /></div>;

  return (
    <div>
      {restored && (
        <div className="no-print mb-5 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-950" role="status">
          <span>{fmt(C.restored, { business: L.business[form.businessType].label })}</span>
          <button type="button" className="font-semibold underline underline-offset-4" onClick={startOver}>{C.startOver}</button>
        </div>
      )}
      <div className="no-print mb-4">
        <div className="flex items-center justify-between text-sm">
          <span className="font-semibold text-ink2">{fmt(C.stepOf, { n: step + 1, total: C.steps.length, name: C.steps[step] })}</span>
          <span className="text-muted">{fmt(C.minutesLeft, { n: Math.max(1, 3 - step) })}</span>
        </div>
        <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-surface2" role="progressbar" aria-valuemin={1} aria-valuemax={C.steps.length} aria-valuenow={step + 1} aria-label={C.progress}>
          <div className="h-full rounded-full bg-brand transition-all duration-500" style={{ width: `${((step + 1) / C.steps.length) * 100}%` }} />
        </div>
      </div>
      <ol className="no-print mb-6 flex flex-wrap gap-2" aria-label={C.progress}>
        {C.steps.map((s, i) => (
          <li key={s}>
            <button type="button" onClick={() => setStep(i)} aria-current={step === i ? "step" : undefined} className={`flex items-center gap-2 rounded-full border px-3.5 py-1.5 text-sm font-semibold ${step === i ? "border-brand bg-brandsoft text-brandink" : i < step ? "border-line bg-surface text-ink2 hover:border-brand" : "border-line bg-surface text-muted hover:border-brand"}`}>
              <span className={`grid h-5 w-5 place-items-center rounded-full text-xs ring-1 ${i < step ? "bg-brand text-white ring-brand" : "bg-white ring-line"}`}>{i < step ? "✓" : i + 1}</span>
              {s}
            </button>
          </li>
        ))}
      </ol>

      <div className="card p-5 shadow-[0_20px_60px_-35px_rgba(11,23,18,0.35)] md:p-8">
        {step === 0 && (
          <div className="space-y-6">
            <div>
              <h2 className="text-xl font-bold">{C.q1}</h2>
              <div className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                {(Object.keys(BUSINESS_TYPES) as BusinessTypeId[]).map((b) => (
                  <button key={b} type="button" onClick={() => setForm((f) => ({ ...f, businessType: b, lines: linesForBusiness(b) }))} aria-pressed={form.businessType === b} className={`rounded-xl border p-3 text-left transition ${form.businessType === b ? "border-brand bg-brandsoft" : "border-line bg-surface hover:border-brand"}`}>
                    <div className="font-semibold">{L.business[b].label}</div>
                    <div className="text-xs text-muted">{L.business[b].hint}</div>
                  </button>
                ))}
              </div>
            </div>
            <div>
              <h2 className="text-xl font-bold">{C.q2}</h2>
              <p className="hint !mt-1">{C.q2hint}</p>
              <div className="mt-3 grid gap-4 sm:grid-cols-2">
                <Field label={C.countryLabel} htmlFor="c-country" hint={preferenceCopy(locale).reset}>
                  <CountrySelect id="c-country" value={form.countryCode} locale={locale} search={d.country.search} empty={d.country.empty} onChange={(c) => { preferences.setLocation(c); track("country_changed", { country: c }); }} />
                </Field>
                <Field label={locationCopy(locale).title} htmlFor="c-city">
                  <CitySelect key={form.countryCode} id="c-city" country={form.countryCode} locale={locale} region={form.regionId} city={form.city} onChange={(region, city) => preferences.setLocation(form.countryCode, region, city)} />
                </Field>
              </div>
              <p className="mt-2 flex items-center gap-2 text-xs text-muted">
                <span className={`inline-block h-2 w-2 rounded-full ${country.dataStatus === "estimated" ? "bg-warn" : "bg-good"}`} />
                {country.dataStatus === "calibrated" ? d.country.calibrated : country.dataStatus === "official" ? d.country.official : d.country.profileNote}
              </p>
            </div>
          </div>
        )}

        {step === 1 && (
          <div className="space-y-5">
            <div>
              <h2 className="text-xl font-bold">{C.q3}</h2>
              <p className="mt-1 text-sm text-muted">{C.q3hint}</p>
            </div>
            {form.lines.map((l) => (
              <LineEditor key={l.id} line={l} d={d} cur={cur} locale={locale} onChange={(p) => updateLine(l.id, p)} onRemove={() => setForm((f) => ({ ...f, lines: f.lines.filter((x) => x.id !== l.id) }))} />
            ))}
            <AddLine d={d} onAdd={(kind, key) => setForm((f) => ({ ...f, lines: [...f.lines, emptyLine(kind, key)] }))} />
          </div>
        )}

        {step === 2 && (
          <div className="space-y-6">
            <h2 className="text-xl font-bold">{C.q6}</h2>
            <div className="grid gap-5 md:grid-cols-2">
              <Field label={C.elecBill} htmlFor="c-eb" hint={fmt(C.elecBillHint, { price: `${money2(def.electricityPerKwh)} ${cur}` })}>
                <Num id="c-eb" value={form.elecBillMonthly} onChange={(v) => set("elecBillMonthly", v)} unit={fmt(C.perMonth, { cur })} />
              </Field>
              <Field label={C.elecKwh} htmlFor="c-ek">
                <Num id="c-ek" value={form.elecKwhYear} onChange={(v) => set("elecKwhYear", v)} unit={L.units.kwh} placeholder={fmt(C.eg, { v: money2(500_000) })} />
              </Field>
              <Field label={C.elecPrice} htmlFor="c-ep" hint={C.elecPriceHint}>
                <Num id="c-ep" value={form.elecPrice} onChange={(v) => set("elecPrice", v)} unit={`${cur}/${L.units.kwh}`} placeholder={fmt(C.eg, { v: money2(def.electricityPerKwh) })} />
              </Field>
              <Field label={C.grid}>
                <Toggle checked={form.hasGrid} onChange={(v) => set("hasGrid", v)} label={C.gridToggle} />
              </Field>
            </div>
            <div className="grid gap-5 md:grid-cols-2">
              <div className="md:col-span-2"><Toggle checked={form.gasUsed} onChange={(v) => set("gasUsed", v)} label={C.gasToggle} /></div>
              {form.gasUsed && (
                <>
                  <Field label={C.gasBill} htmlFor="c-gb" hint={fmt(C.gasBillHint, { price: `${money2(def.gasPerM3)} ${cur}` })}>
                    <Num id="c-gb" value={form.gasBillMonthly} onChange={(v) => set("gasBillMonthly", v)} unit={fmt(C.perMonth, { cur })} />
                  </Field>
                  <Field label={C.gasM3} htmlFor="c-gm"><Num id="c-gm" value={form.gasM3Year} onChange={(v) => set("gasM3Year", v)} unit={L.units.m3} /></Field>
                  <Field label={C.gasPrice} htmlFor="c-gp"><Num id="c-gp" value={form.gasPrice} onChange={(v) => set("gasPrice", v)} unit={`${cur}/${L.units.m3}`} /></Field>
                </>
              )}
            </div>
            <div className="grid gap-5 md:grid-cols-2">
              <Field label={C.heatQ} htmlFor="c-hn" hint={C.heatQhint} tooltip={C.heatKwhHint}>
                <select id="c-hn" className="field" value={form.heatNeed} onChange={(e) => set("heatNeed", e.target.value as HeatNeed)}>
                  {(["none", "seasonal_buildings", "year_round_process", "greenhouse"] as HeatNeed[]).map((h) => <option key={h} value={h}>{L.heat[h]}</option>)}
                </select>
              </Field>
              {form.heatNeed !== "none" && (
                <Field label={C.heatKwh} htmlFor="c-hk" hint={C.heatKwhHint}><Num id="c-hk" value={form.heatKwhYear} onChange={(v) => set("heatKwhYear", v)} unit={L.units.kwh} /></Field>
              )}
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="space-y-6">
            <h2 className="text-xl font-bold">{C.siteTitle}</h2>
            <p className="-mt-3 text-sm text-muted">{C.siteHint}</p>
            <div className="grid gap-5 md:grid-cols-2">
              <Field label={C.land} htmlFor="c-la" hint={C.landHint} tooltip={C.siteHint}><Num id="c-la" value={form.landHa} onChange={(v) => set("landHa", v)} unit={L.units.ha} /></Field>
              <Field label={C.storage} htmlFor="c-st" hint={C.storageHint}><Num id="c-st" value={form.existingStorageM3} onChange={(v) => set("existingStorageM3", v)} unit={L.units.m3} /></Field>
              <Field label={C.gasGrid} htmlFor="c-gg" hint={C.gasGridHint}><Num id="c-gg" value={form.gasGridKm} onChange={(v) => set("gasGridKm", v)} unit={L.units.km} /></Field>
              <div className="space-y-2">
                <Toggle checked={form.neighbours} onChange={(v) => set("neighbours", v)} label={C.neighbours} />
                <Toggle checked={form.protectedArea} onChange={(v) => set("protectedArea", v)} label={C.protected} />
              </div>
            </div>
          </div>
        )}

        {error && <p role="alert" className="mt-4 rounded-lg bg-red-50 p-3 text-sm text-red-900">{error}</p>}

        <div className="no-print mt-7 flex flex-wrap items-center justify-between gap-3 border-t border-line pt-5">
          <button type="button" className="btn btn-ghost" disabled={step === 0} onClick={() => setStep((s) => Math.max(0, s - 1))}>← {d.common.back}</button>
          <div className="flex gap-3">
            {step < C.steps.length - 1 ? (
              <>
                {step >= 2 && <button type="button" className="btn btn-ghost" onClick={calculate} title={C.calcNowHint}>{C.calcNow}</button>}
                <button type="button" className="btn btn-primary" onClick={next}>{d.common.next} →</button>
              </>
            ) : (
              <button type="button" className="btn btn-primary" onClick={calculate}>{C.calculate}</button>
            )}
          </div>
        </div>
        {step === 0 && (
          <div className="mt-6 rounded-xl border border-dashed border-line p-4">
            <div className="text-sm font-semibold">{C.examplesTitle}</div>
            <div className="mt-2 flex flex-wrap gap-2">
              {examples.map((e) => (
                <button key={e.id} type="button" className="flex flex-col items-start rounded-xl border border-line bg-surface px-3 py-2 text-left hover:border-brand" onClick={() => loadExample(e.id)}>
                  <span className="text-sm font-semibold">{e.title}</span>
                  <span className={`mt-0.5 flex items-center gap-1.5 text-xs font-semibold ${e.tone === "good" ? "text-good" : e.tone === "mid" ? "text-warn" : "text-muted"}`}><CountryFlag code={e.countryCode} />{countryName(e.countryCode, locale)} · {e.verdict}</span>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      <div ref={resultRef} className="scroll-mt-20">
        {assessment && (
          <div className="mt-10">
            <div className="no-print mb-4 flex flex-wrap items-center justify-between gap-3">
              <h2 className="text-2xl font-bold tracking-tight">{C.resultTitle}</h2>
              <div className="flex flex-wrap gap-2">
                <button type="button" className="btn btn-ghost" onClick={() => { setSubmitted(false); window.scrollTo({ top: 0, behavior: "smooth" }); }}>{C.edit}</button>
                <button type="button" className="btn btn-ghost" onClick={startOver}>{C.startOver}</button>
              </div>
            </div>
            <ResultView
              a={assessment}
              d={d}
              locale={locale}
              currency={cur}
              countryNotes={country.approachNotes[lang]}
              access="free"
              samplesHref={samplesHref}
              methodologyHref={`/${locale}/methodology`}
              unlockSlot={<UnlockButton input={input} locale={locale} d={d} demo={demo} plan={preferredPlan} label={d.result.unlock} className="btn btn-primary" />}
              afterSlot={<WhatIf input={input} base={assessment} country={country} locale={locale} d={d} onApply={applyWhatIf} />}
            />
          </div>
        )}
      </div>
    </div>
  );
}

function AddLine({ d, onAdd }: { d: CalculatorDict; onAdd: (kind: "animal" | "type", key: AnimalKind | FeedstockTypeId) => void }) {
  return (
    <select
      className="field max-w-sm"
      aria-label={d.calc.addLine}
      value=""
      onChange={(e) => {
        const v = e.target.value;
        if (!v) return;
        const [kind, key] = v.split(":");
        onAdd(kind as "animal" | "type", key as AnimalKind | FeedstockTypeId);
      }}
    >
      <option value="">{d.calc.addLine}</option>
      <optgroup label={d.calc.animalsGroup}>{(Object.keys(ANIMALS) as AnimalKind[]).map((a) => <option key={a} value={`animal:${a}`}>{d.labels.animal[a].label}</option>)}</optgroup>
      <optgroup label={d.calc.wasteGroup}>{(Object.keys(FEEDSTOCKS) as FeedstockTypeId[]).map((f) => <option key={f} value={`type:${f}`}>{d.labels.feedstock[f]}</option>)}</optgroup>
    </select>
  );
}

function LineEditor({ line, d, cur, locale, onChange, onRemove }: { line: FormLine; d: CalculatorDict; cur: string; locale: Locale; onChange: (p: Partial<FormLine>) => void; onRemove: () => void }) {
  const C = d.calc;
  const L = d.labels;
  const help = calculatorHelp(locale);
  const isAnimal = line.kind === "animal";
  const t = isAnimal ? FEEDSTOCKS[ANIMALS[line.animal as AnimalKind].feedstock] : FEEDSTOCKS[line.type as FeedstockTypeId];
  const label = isAnimal ? L.animal[line.animal as AnimalKind].label : L.feedstock[line.type as FeedstockTypeId];
  const unit = isAnimal ? L.animal[line.animal as AnimalKind].unit : L.units.tYear;
  const id = `l-${line.id}`;
  const localNumber = (v: number) => new Intl.NumberFormat(INTL_TAG[locale], { maximumFractionDigits: 6 }).format(v);
  return (
    <div className="rounded-xl border border-line p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="font-semibold">{label}</div>
        <button type="button" onClick={onRemove} className="text-sm text-muted hover:text-bad" aria-label={`${C.remove}: ${label}`}>{C.remove}</button>
      </div>
      <div className="mt-3 grid gap-4 md:grid-cols-3">
        <Field label={isAnimal ? C.lineHead : C.lineTonnes} htmlFor={`${id}-q`}>
          <Num id={`${id}-q`} value={line.quantity} onChange={(v) => onChange({ quantity: v })} unit={unit} placeholder={fmt(C.eg, { v: localNumber(isAnimal ? 400 : 3000) })} />
        </Field>
        {isAnimal && ["dairy_cow", "cattle_other"].includes(line.animal as string) && (
          <Field label={C.housing} htmlFor={`${id}-h`}>
            <select id={`${id}-h`} className="field" value={line.housing} onChange={(e) => onChange({ housing: e.target.value as FormLine["housing"] })}>
              <option value="year_round">{L.housing.year_round}</option>
              <option value="seasonal">{L.housing.seasonal}</option>
            </select>
          </Field>
        )}
        {!isAnimal && (
          <>
            <Field label={C.handlingQ} htmlFor={`${id}-hd`}>
              <select id={`${id}-hd`} className="field" value={line.handling} onChange={(e) => onChange({ handling: e.target.value as HandlingId | "" })}>
                <option value="">{C.choose}</option>
                {HANDLING_IDS.map((k) => <option key={k} value={k}>{L.handling[k]}</option>)}
              </select>
            </Field>
            {(line.handling === "paid_disposal" || line.handling === "landfill") && (
              <Field label={C.disposalCost} htmlFor={`${id}-dc`} hint={C.disposalHint}><Num id={`${id}-dc`} value={line.disposalCost} onChange={(v) => onChange({ disposalCost: v })} unit={`${cur}/${L.units.t}`} /></Field>
            )}
            {line.handling === "sold_as_feed" && (
              <Field label={C.saleValue} htmlFor={`${id}-sv`} hint={C.saleHint}><Num id={`${id}-sv`} value={line.opportunityValue} onChange={(v) => onChange({ opportunityValue: v })} unit={`${cur}/${L.units.t}`} /></Field>
            )}
          </>
        )}
      </div>
      <details className="mt-3">
        <summary className="text-sm font-semibold text-brand">{C.refine}</summary>
        <div className="mt-3 grid gap-4 md:grid-cols-3">
          <Field label={fmt(C.dm, { v: localNumber(t.dryMatterPct) })} htmlFor={`${id}-dm`} hint={C.dmHint} tooltip={help.dm}><Num id={`${id}-dm`} value={line.dryMatterPct} onChange={(v) => onChange({ dryMatterPct: v })} unit={L.units.pct} /></Field>
          <Field label="VS (% DM)" htmlFor={`${id}-vs`} tooltip={help.vs}><Num id={`${id}-vs`} value={line.vsPctOfDm ?? ""} onChange={(v) => onChange({ vsPctOfDm: v })} unit={L.units.pct} placeholder={localNumber(t.vsPctOfDm)} /></Field>
          <Field label="BMP (L CH₄/kg VS)" htmlFor={`${id}-bmp`} tooltip={help.bmp}><Num id={`${id}-bmp`} value={line.methaneYieldLPerKgVs ?? ""} onChange={(v) => onChange({ methaneYieldLPerKgVs: v })} placeholder={localNumber(t.yieldTyp)} /></Field>
          {!isAnimal && <Field label={fmt(C.months, { v: localNumber(t.defaultMonths) })} htmlFor={`${id}-m`} tooltip={help.season}><Num id={`${id}-m`} value={line.monthsActive} onChange={(v) => onChange({ monthsActive: v })} unit={L.units.months} /></Field>}
          {!isAnimal && <Field label={C.seasonStart} htmlFor={`${id}-start`} tooltip={help.season}>
            <select id={`${id}-start`} className="field" value={line.startMonth || String(t.defaultStartMonth)} onChange={(e) => onChange({ startMonth: e.target.value })}>
              {Array.from({ length: 12 }, (_, month) => <option key={month} value={month + 1}>{new Intl.DateTimeFormat(INTL_TAG[locale], { month: "long", timeZone: "UTC" }).format(new Date(Date.UTC(2025, month, 1)))}</option>)}
            </select>
          </Field>}
          <div className="space-y-2">
            <Toggle checked={line.delivered} onChange={(v) => onChange({ delivered: v })} label={C.delivered} />
            {line.delivered && <Num value={line.distanceKm} onChange={(v) => onChange({ distanceKm: v })} unit={L.units.km} placeholder={C.distance} />}
          </div>
          {!isAnimal && <Field label={C.purchase} htmlFor={`${id}-pp`} hint={C.purchaseHint}><Num id={`${id}-pp`} value={line.purchasePrice} onChange={(v) => onChange({ purchasePrice: v })} unit={`${cur}/${L.units.t}`} /></Field>}
        </div>
      </details>
    </div>
  );
}
