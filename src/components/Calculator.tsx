"use client";

import { calendarDateAt } from "@/lib/format";

import { useCallback, useDeferredValue, useEffect, useMemo, useRef, useState } from "react";
import { advise, assess, ANIMALS, BUSINESS_TYPES, FEEDSTOCKS, HANDLING_IDS } from "@/core";
import { locList, registerMessages, type Messages } from "@/core/i18n";
import type { Advice, AnimalKind, BusinessTypeId, FeedstockTypeId, HandlingId, HeatNeed, ProjectInput, RouteId } from "@/core";
import { EXAMPLES } from "@/core/examples";
import { COUNTRIES } from "@/countries";
import { PLAN_IDS, type PlanId } from "@/config/plans";
import { countryName, fmt, type Dict, type Locale } from "@/i18n";
import { coreLang, INTL_TAG } from "@/i18n/config";
import { track } from "@/lib/analytics";
import { emptyLine, formToInput, initialForm, inputToForm, invalidNumberStep, linesForBusiness, recontextualizeForm, uiDefaults, processIssues } from "@/lib/form";
import { numberError } from "@/i18n/errors";
import { NumberInput } from "./NumberInput";
import { usePreferences } from "./LocaleProvider";
import { preferenceCopy } from "@/i18n/preferences";
import type { FormLine, FormState } from "@/lib/form";
import { UnlockButton } from "./payments/Checkout";
import { CurrencyResultView as ResultView } from "./CurrencyResultView";
import { ScenarioLab } from "./ScenarioLab";
import { CountrySelect } from "./CountrySelect";
import { CountryFlag } from "./CountryFlag";
import { CitySelect } from "./CitySelect";
import { locationCopy } from "@/i18n/location";
import { calculatorHelp } from "@/i18n/calculator-help";
import { HelpTooltip } from "./HelpTooltip";
import { stepHelp } from "@/i18n/step-help";
import { defaultProcess, BUSINESS_GROUPS, SECTOR_IDS, type BusinessAudience } from "@/core/businesses";
import { businessCopy, businessGroupLabel } from "@/i18n/businesses";
import { ProcessInputs } from "./ProcessInputs";
import { processCopy, processFieldLabels } from "@/i18n/processes";
import { workspaceCopy } from "@/i18n/workspace";
import { Icon, type IconName } from "./brand/Icon";
import { LiveEstimate, LiveStrip, type LiveExample } from "./LiveEstimate";

const STORAGE_KEY = "mx.form.v2";
const STEP_ICONS: IconName[] = ["factory", "leaf", "bolt", "route"];
const GROUP_ICONS: Record<BusinessAudience | "other", IconName> = { farm: "cow", food: "factory", municipal: "drop", developer: "route", other: "info" };

export type CalculatorDict = Pick<Dict, "calc" | "labels" | "result" | "flow" | "charts" | "common" | "checkout" | "pricing" | "country" | "audience">;

export type ExampleSummary = LiveExample;

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

const Num = NumberInput;

function Toggle({ checked, onChange, label, tooltip }: { checked: boolean; onChange: (v: boolean) => void; label: string; tooltip?: string }) {
  return (
    <label className={`flex cursor-pointer items-center gap-3 rounded-xl border px-3 py-2.5 text-sm transition ${checked ? "border-brand bg-brandsoft/50" : "border-line bg-surface hover:border-brand/60"}`}>
      <input type="checkbox" className="h-4 w-4 accent-[var(--brand)]" checked={checked} onChange={(e) => onChange(e.target.checked)} />
      {tooltip ? <HelpTooltip description={tooltip}>{label}</HelpTooltip> : label}
    </label>
  );
}

/** A titled group of fields inside a step: the questionnaire reads as a few blocks, not one long column. */
function Block({ title, children }: { title?: string; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-line bg-surface p-4 md:p-5">
      {title && <h3 className="mb-4 font-semibold text-ink">{title}</h3>}
      {children}
    </div>
  );
}

export function Calculator({ locale, d, examples, demo, samplesHref, samplesLabel, core }: { locale: Locale; d: CalculatorDict; examples: ExampleSummary[]; demo: boolean; samplesHref: string; samplesLabel: string; core?: Messages }) {
  registerMessages(locale, core);
  const C = d.calc;
  const L = d.labels;
  const T = stepHelp(locale);
  const H = businessCopy(locale);
  const W = workspaceCopy[locale];
  const lang = coreLang(locale);
  const preferences = usePreferences();
  const { ready: contextReady, country: projectCountry, region: projectRegion, city: projectCity } = preferences;
  const [formReady, setFormReady] = useState(false);
  const initialized = useRef(false);
  const [form, setForm] = useState<FormState>(() => initialForm("dairy_farm", "GB", "", locale));
  const [restored, setRestored] = useState(false);
  const [step, setStep] = useState(0);
  const [submitted, setSubmitted] = useState(false);
  /** After "Calculate" the questionnaire folds into one line above the result; "Edit answers" opens it again. */
  const [editing, setEditing] = useState(true);
  const [groupPick, setGroupPick] = useState<BusinessAudience | "other">();
  const [today, setToday] = useState<string>();
  const [error, setError] = useState("");
  const [preferredPlan, setPreferredPlan] = useState<PlanId>("report");
  const resultRef = useRef<HTMLDivElement>(null);
  const formRef = useRef<HTMLDivElement>(null);
  const started = useRef(false);
  const exampleParam = useRef<string | null>(null);

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
      // The assessment date is the visitor's calendar day, fixed once in the browser (never during SSR).
      setToday(calendarDateAt(new Date()));
      let next: FormState = { ...initialForm("dairy_farm", adapter.code, projectRegion ?? "", locale), city: projectCity };
      let hasDraft = false;
      try {
        const raw = localStorage.getItem(STORAGE_KEY);
        const parsed = raw ? JSON.parse(raw) as FormState : null;
        if (parsed && (parsed.lines?.length || parsed.processKind) && Object.hasOwn(COUNTRIES, parsed.countryCode)) {
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
      // A sample report links here with its inputs (`?example=id`): opened once, then the address is cleaned so a reload keeps the client's edits.
      exampleParam.current = q.get("example");
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
  const money2 = (v: number) => new Intl.NumberFormat(INTL_TAG[locale], v < 1000 ? { maximumSignificantDigits: 3 } : { maximumFractionDigits: 0 }).format(v);
  // A price with the currency where the locale puts it (€1.25 / 1,25 €), never a hand-built "1.25 EUR".
  const priceText = (v: number) => new Intl.NumberFormat(INTL_TAG[locale], { style: "currency", currency: cur, maximumSignificantDigits: 3 }).format(v);

  const set = useCallback(<K extends keyof FormState>(k: K, v: FormState[K]) => {
    if (!started.current) {
      started.current = true;
      track("calculator_start");
    }
    setForm((f) => ({ ...f, [k]: v }));
  }, []);

  const updateLine = (id: string, patch: Partial<FormLine>) => setForm((f) => ({ ...f, lines: f.lines.map((l) => (l.id === id ? { ...l, ...patch } : l)) }));

  const input = useMemo(() => formToInput(form, country, lang), [form, country, lang]);
  // The live estimate and the result are one assessment of the deferred form: typing stays responsive on phones,
  // and what the panel shows while editing is exactly what "Calculate" opens.
  const deferredForm = useDeferredValue(form);
  const live = useMemo(() => {
    if (!today || !deferredForm.regionId || invalidNumberStep(deferredForm) !== null || processIssues(deferredForm).length) return null;
    const c = COUNTRIES[deferredForm.countryCode] ?? COUNTRIES.GB;
    const i = formToInput(deferredForm, c, lang);
    if (!i.process && i.feedstocks.length === 0) return null;
    try {
      return { input: i, country: c, a: assess(i, c, { asOfDate: today, uncertainty: false }) };
    } catch {
      return null; // An input the model rejects shows no estimate; "Calculate" reports the field.
    }
  }, [deferredForm, lang, today]);
  const assessment = submitted ? live : null;
  // The advisor re-runs the model on realistic changes (≈ 10 fast runs): after the result is on screen, never in its render.
  const adviceKey = assessment ? `${assessment.a.dataAudit?.inputVersion}|${assessment.a.dataAudit?.asOfDate}` : "";
  const [advice, setAdvice] = useState<{ key: string; value?: Advice }>();
  useEffect(() => {
    if (!assessment) return;
    const timer = setTimeout(() => {
      let value: Advice | undefined;
      try { value = advise(assessment.a, assessment.country); } catch { value = undefined; }
      setAdvice({ key: adviceKey, value });
      if (value) track("advice_ready", { improving: value.levers.filter((l) => l.improves).length, combined: !!value.combined, verdict: value.base.verdict });
    }, 150);
    return () => clearTimeout(timer);
  }, [assessment, adviceKey]);
  const currentAdvice = advice && advice.key === adviceKey ? advice.value : undefined;
  // Owner's test switch (build with NEXT_PUBLIC_PAID_PREVIEW=1): shows the result as a Standard or Extended report would, without paying.
  const previewEnabled = process.env.NEXT_PUBLIC_PAID_PREVIEW === "1";
  const [preview, setPreview] = useState<"free" | "standard" | "full">("free");
  const paidPreview = useMemo(() => {
    if (!previewEnabled || preview === "free" || !assessment) return null;
    try {
      const full = assess(assessment.input, assessment.country, { asOfDate: today });
      const plan = advise(full, assessment.country, { thresholds: true });
      return plan ? { ...full, advice: plan } : full;
    } catch { return null; }
  }, [previewEnabled, preview, assessment, today]);
  const access = paidPreview ? preview : "free";
  // Fold as soon as "Calculate" is pressed, not when the deferred result lands: otherwise the page jumps under the scroll.
  const collapsed = submitted && !editing && (!!live || deferredForm !== form);

  function scrollTo(ref: React.RefObject<HTMLDivElement | null>) {
    setTimeout(() => ref.current?.scrollIntoView({ behavior: "smooth", block: "start" }), 50);
  }

  function next() {
    setError("");
    if (step === 0 && !form.regionId) { setError(locationCopy(locale).title + ": " + C.choose); return; }
    const invalidStep = invalidNumberStep(form);
    if (invalidStep !== null && invalidStep <= step) {
      setError(numberError[locale]);
      setStep(invalidStep);
      return;
    }
    if (step === 1 && processIssues(form).length) { setError(processIssues(form).map(k => processFieldLabels(locale)[k] ?? k).join(", ")); return; }
    if (step === 1 && !input.process && input.feedstocks.length === 0) {
      setError(C.errNoFeed);
      return;
    }
    track("calculator_step", { step: step + 1 });
    setStep((s) => Math.min(C.steps.length - 1, s + 1));
    scrollTo(formRef);
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
    if (processIssues(form).length) { setError(processIssues(form).map(k => processFieldLabels(locale)[k] ?? k).join(", ")); setStep(1); return; }
    if (!input.process && input.feedstocks.length === 0) {
      setError(C.errNoFeedStep);
      setStep(1);
      return;
    }
    setSubmitted(true);
    setEditing(false);
    const asOfDate = today ?? calendarDateAt(new Date());
    const a = assess(input, country, { asOfDate, uncertainty: false });
    track("calculator_submit", { business_id: form.businessType, business_group: BUSINESS_TYPES[form.businessType].audience, business_role: form.projectRole ?? BUSINESS_TYPES[form.businessType].role, process_model: input.process?.kind ?? "ad", verdict: a.verdict.id, confidence: a.confidence.level, route: a.bestRoute, country: country.code });
    scrollTo(resultRef);
  }

  function selectBusiness(b: BusinessTypeId) {
    setForm(f => ({...f,businessType:b,projectRole:BUSINESS_TYPES[b].role,processKind:defaultProcess(b),processFields:{},lines:linesForBusiness(b)}));
    setSubmitted(false); setEditing(true); setError("");
    track("business_selected",{source:"calculator",business_id:b,business_group:BUSINESS_TYPES[b].audience,business_role:BUSINESS_TYPES[b].role});
  }

  /** A typical case opens straight on its result (the same verdict as its sample page); every answer stays editable. */
  const loadExample = useCallback((id: string) => {
    const ex = EXAMPLES.find((e) => e.id === id);
    if (!ex) return;
    setForm(inputToForm(ex.input, locale));
    preferences.setLocation(ex.input.countryCode, ex.input.regionId, ex.input.city);
    setStep(1);
    setSubmitted(true);
    setEditing(false);
    setRestored(false);
    setError("");
    track("example_loaded", { id });
    setTimeout(() => resultRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }), 50);
  }, [locale, preferences]);

  useEffect(() => {
    const id = exampleParam.current;
    if (!formReady || !id) return;
    exampleParam.current = null;
    const q = new URLSearchParams(window.location.search);
    q.delete("example");
    window.history.replaceState(window.history.state, "", `${window.location.pathname}${q.size ? `?${q}` : ""}${window.location.hash}`);
    loadExample(id);
  }, [formReady, loadExample]);

  function startOver() {
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch {
      /* ignore */
    }
    const g = preferences.country;
    setForm({ ...initialForm("dairy_farm", g, preferences.region ?? "", locale), city: preferences.city });
    setSubmitted(false);
    setEditing(true);
    setRestored(false);
    setStep(0);
    window.scrollTo({ top: 0, behavior: "smooth" });
    track("calculator_reset");
  }

  function edit() {
    setEditing(true);
    scrollTo(formRef);
  }

  function applyScenario(n: ProjectInput, source: string) {
    setForm(inputToForm(n, locale));
    track("whatif_applied", { source });
    scrollTo(resultRef);
  }

  if (!formReady) return <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_340px]" role="status" aria-label={preferenceCopy(locale).detecting}><div className="card min-h-[80vh] animate-pulse p-8"><div className="h-6 w-2/3 rounded bg-surface2" /><div className="mt-6 h-12 rounded bg-surface2" /></div><div className="card hidden h-96 animate-pulse lg:block" /></div>;

  const businessGroup = groupPick ?? (form.businessType === "other_industry" ? "other" : BUSINESS_TYPES[form.businessType].audience);
  const groupTabs: { id: BusinessAudience | "other"; label: string }[] = [...BUSINESS_GROUPS.map((g) => ({ id: g.id, label: businessGroupLabel(g.id, locale) })), { id: "other", label: L.business.other_industry.label }];
  const region = country.regions.find((r) => r.id === form.regionId);
  const place = form.city?.name ?? region?.names?.[locale] ?? region?.name;

  return (
    <div>
      {restored && (
        <div className="no-print mb-5 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-950" role="status">
          <span>{fmt(C.restored, { business: L.business[form.businessType].label })}</span>
          <button type="button" className="font-semibold underline underline-offset-4" onClick={startOver}>{C.startOver}</button>
        </div>
      )}

      {collapsed ? (
        /* ---------- Inputs folded into one line: what the result below is based on ---------- */
        <div className="no-print card flex flex-col gap-4 p-4 md:flex-row md:items-center md:p-5">
          <div className="min-w-0 flex-1">
            <div className="eyebrow text-muted">{W.yourInputs}</div>
            <ul className="mt-2 flex flex-wrap gap-2 text-sm">
              <li className="chip">{L.business[form.businessType].label}</li>
              <li className="chip"><CountryFlag code={form.countryCode} />{countryName(form.countryCode, locale)}{place ? ` · ${place}` : ""}</li>
              {input.process
                ? <li className="chip">{processCopy(locale).models[input.process.kind]}</li>
                : form.lines.filter((l) => l.quantity.trim()).map((l) => (
                  <li key={l.id} className="chip num">{l.kind === "animal" ? L.animal[l.animal as AnimalKind].label : L.feedstock[l.type as FeedstockTypeId]}: {l.quantity} {l.kind === "animal" ? L.animal[l.animal as AnimalKind].unit : L.units.tYear}</li>
                ))}
            </ul>
          </div>
          <div className="flex shrink-0 flex-wrap gap-2">
            <button type="button" className="btn btn-primary !py-2.5" onClick={edit}>{C.edit}</button>
            <button type="button" className="btn btn-ghost !py-2.5" onClick={startOver}>{C.startOver}</button>
          </div>
        </div>
      ) : (
        <div ref={formRef} className="grid scroll-mt-20 gap-6 lg:grid-cols-[minmax(0,1fr)_340px] lg:items-start">
          <div className="min-w-0">
            {/* ---------- Stepper: one control for progress and navigation ---------- */}
            <nav className="no-print mb-4" aria-label={C.progress}>
              <ol className="grid grid-cols-4 gap-2">
                {C.steps.map((s, i) => (
                  <li key={s}>
                    <button type="button" onClick={() => setStep(i)} aria-current={step === i ? "step" : undefined} className="group block w-full text-left">
                      <span className={`block h-1.5 rounded-full transition-colors duration-500 ${i <= step ? "bg-brand" : "bg-line group-hover:bg-brand/40"}`} />
                      <span className={`mt-2 flex items-center gap-2 text-sm font-semibold ${step === i ? "text-ink" : i < step ? "text-ink2" : "text-muted"}`}>
                        <span className={`grid h-6 w-6 shrink-0 place-items-center rounded-full text-xs ${i < step ? "bg-brand text-white" : step === i ? "bg-ink text-white" : "bg-surface ring-1 ring-line"}`}>{i < step ? "✓" : i + 1}</span>
                        <span className="hidden leading-tight sm:inline">{s}</span>
                      </span>
                    </button>
                  </li>
                ))}
              </ol>
              <div className="mt-3 flex items-center justify-between gap-3 text-sm">
                <span className="font-semibold text-ink2">{fmt(C.stepOf, { n: step + 1, total: C.steps.length, name: C.steps[step] })}</span>
                <span className="text-muted">{fmt(C.minutesLeft, { n: Math.max(1, 3 - step) }, locale)}</span>
              </div>
            </nav>

            <div className="card p-5 shadow-[0_20px_60px_-35px_rgba(11,23,18,0.35)] md:p-7">
              <div aria-hidden className="mb-5 flex items-center gap-3 text-brand">
                <span className="grid h-10 w-10 place-items-center rounded-xl bg-brandsoft"><Icon name={STEP_ICONS[step]} size={20} /></span>
                <span className="h-px flex-1 bg-line" />
              </div>
              {step > 0 && BUSINESS_TYPES[form.businessType].scope === "specialist" && <p className="mb-5 rounded-xl bg-surface2 p-4 text-sm">{H.specialist}. {d.result.robust.accuracy}</p>}
              {step === 0 && (
                <div className="space-y-8">
                  <div>
                    <h2 className="text-xl font-bold">{C.q1}</h2>
                    <div className="mt-4 flex flex-wrap gap-2" role="group" aria-label={C.q1}>
                      {groupTabs.map((g) => (
                        <button key={g.id} type="button" aria-pressed={businessGroup === g.id} onClick={() => { setGroupPick(g.id); if (g.id === "other") selectBusiness("other_industry"); }} className={`flex items-center gap-2 rounded-full border px-3.5 py-2 text-sm font-semibold transition ${businessGroup === g.id ? "border-ink bg-ink text-white" : "border-line bg-surface text-ink2 hover:border-brand"}`}>
                          <Icon name={GROUP_ICONS[g.id]} size={16} />{g.label}
                        </button>
                      ))}
                    </div>
                    {businessGroup === "other" ? (
                      <button type="button" className={`mt-4 w-full rounded-xl border p-4 text-left ${form.businessType === "other_industry" ? "border-brand bg-brandsoft" : "border-line"}`} aria-pressed={form.businessType === "other_industry"} onClick={() => selectBusiness("other_industry")}><span className="font-semibold">{L.business.other_industry.label}</span><span className="mt-1 block text-sm text-muted">{L.business.other_industry.hint}</span></button>
                    ) : (
                      <div className="mt-4 grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
                        {SECTOR_IDS.filter((b) => b !== "other_industry" && BUSINESS_TYPES[b].audience === businessGroup).map((b) => (
                          <button key={b} type="button" onClick={() => selectBusiness(b)} aria-pressed={form.businessType === b} className={`relative flex flex-col items-start rounded-xl border p-3 pr-9 text-left transition ${form.businessType === b ? "border-brand bg-brandsoft shadow-[inset_0_0_0_1px_var(--brand)]" : "border-line bg-surface hover:border-brand"}`}>
                            {form.businessType === b && <Icon name="check" size={16} strokeWidth={2.6} className="absolute right-3 top-3.5 text-brand" />}
                            <div className="font-semibold">{L.business[b].label}</div>
                            <div className="text-xs text-muted">{L.business[b].hint}</div>
                            {BUSINESS_TYPES[b].scope !== "screening" && <div className="mt-2 text-xs font-semibold text-ink2">{BUSINESS_TYPES[b].scope === "outside_model" ? H.outside : H.specialist}</div>}
                          </button>
                        ))}
                      </div>
                    )}
                    {BUSINESS_TYPES[form.businessType].scope === "outside_model" && <p className="mt-4 rounded-xl bg-surface2 p-4 text-sm" role="status">{H.scopeNote}</p>}
                    {BUSINESS_TYPES[form.businessType].scope === "specialist" && <p className="mt-4 text-sm text-muted">{H.specialist}. {d.result.robust.accuracy}</p>}
                  </div>
                  <div>
                    <h2 className="text-xl font-bold">{C.q2}</h2>
                    <p className="hint !mt-1">{C.q2hint}</p>
                    <div className="mt-3 grid gap-4 sm:grid-cols-2">
                      <Field label={C.countryLabel} htmlFor="c-country" tooltip={T.country} hint={preferenceCopy(locale).reset}>
                        <CountrySelect id="c-country" value={form.countryCode} locale={locale} search={d.country.search} empty={d.country.empty} onChange={(c) => { preferences.setLocation(c); track("country_changed", { country: c }); }} />
                      </Field>
                      <Field label={locationCopy(locale).title} htmlFor="c-city" tooltip={T.city}>
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
                    <h2 className="text-xl font-bold">{form.processKind && form.processKind !== "ad" ? processCopy(locale).models[form.processKind] : C.q3}</h2>
                    {(!form.processKind || form.processKind === "ad") && <p className="mt-1 text-sm text-muted">{C.q3hint}</p>}
                  </div>
                  <ProcessInputs form={form} onChange={patch => { setForm(f => ({ ...f, ...patch })); }} locale={locale} currency={cur} adLabel={d.result.dFeed} units={L.units} />
                  {(form.processKind ?? defaultProcess(form.businessType)) === "ad" && <>{form.lines.map((l) => (
                    <LineEditor key={l.id} line={l} d={d} cur={cur} locale={locale} onChange={(p) => updateLine(l.id, p)} onRemove={() => setForm((f) => ({ ...f, lines: f.lines.filter((x) => x.id !== l.id) }))} />
                  ))}
                  <AddLine d={d} onAdd={(kind, key) => setForm((f) => ({ ...f, lines: [...f.lines, emptyLine(kind, key)] }))} /></>}
                </div>
              )}

              {step === 2 && (
                <div className="space-y-4">
                  <h2 className="text-xl font-bold">{C.q6}</h2>
                  <Block title={d.flow.electricity}>
                    <div className="grid gap-5 md:grid-cols-2">
                      <Field label={C.elecBill} htmlFor="c-eb" tooltip={T.elecBill} hint={fmt(C.elecBillHint, { price: priceText(def.electricityPerKwh) })}>
                        <Num id="c-eb" value={form.elecBillMonthly} onChange={(v) => set("elecBillMonthly", v)} unit={fmt(C.perMonth, { cur })} min={0} />
                      </Field>
                      <Field label={C.elecKwh} htmlFor="c-ek" tooltip={T.elecKwh}>
                        <Num id="c-ek" value={form.elecKwhYear} onChange={(v) => set("elecKwhYear", v)} unit={L.units.kwh} placeholder={fmt(C.eg, { v: money2(500_000) })} min={0} />
                      </Field>
                      <Field label={C.elecPrice} htmlFor="c-ep" tooltip={T.elecPrice} hint={C.elecPriceHint}>
                        <Num id="c-ep" value={form.elecPrice} onChange={(v) => set("elecPrice", v)} unit={`${cur}/${L.units.kwh}`} placeholder={fmt(C.eg, { v: money2(def.electricityPerKwh) })} min={0} />
                      </Field>
                      <Field label={C.grid} tooltip={T.grid}>
                        <Toggle checked={form.hasGrid} onChange={(v) => set("hasGrid", v)} label={C.gridToggle} />
                      </Field>
                      {form.hasGrid && (
                        <Field label={C.exportPrice} htmlFor="c-xp" tooltip={T.exportPrice}>
                          <Num id="c-xp" value={form.exportPrice ?? ""} onChange={(v) => set("exportPrice", v)} unit={`${cur}/${L.units.kwh}`} min={0} />
                        </Field>
                      )}
                    </div>
                  </Block>
                  <Block>
                    <Toggle checked={form.gasUsed} onChange={(v) => set("gasUsed", v)} label={C.gasToggle} tooltip={T.gasUsed} />
                    {form.gasUsed && (
                      <div className="mt-5 grid gap-5 md:grid-cols-2">
                        <Field label={C.gasBill} htmlFor="c-gb" tooltip={T.gasBill} hint={fmt(C.gasBillHint, { price: priceText(def.gasPerM3) })}>
                          <Num id="c-gb" value={form.gasBillMonthly} onChange={(v) => set("gasBillMonthly", v)} unit={fmt(C.perMonth, { cur })} min={0} />
                        </Field>
                        <Field label={C.gasM3} htmlFor="c-gm" tooltip={T.gasM3}><Num id="c-gm" value={form.gasM3Year} onChange={(v) => set("gasM3Year", v)} unit={L.units.m3} min={0} /></Field>
                        <Field label={C.gasPrice} htmlFor="c-gp" tooltip={T.gasPrice}><Num id="c-gp" value={form.gasPrice} onChange={(v) => set("gasPrice", v)} unit={`${cur}/${L.units.m3}`} min={0} /></Field>
                      </div>
                    )}
                  </Block>
                  <Block title={d.flow.usefulHeat}>
                    <div className="grid gap-5 md:grid-cols-2">
                      <Field label={C.heatQ} htmlFor="c-hn" hint={C.heatQhint} tooltip={T.heatNeed}>
                        <select id="c-hn" className="field" value={form.heatNeed} onChange={(e) => set("heatNeed", e.target.value as HeatNeed)}>
                          {(["none", "seasonal_buildings", "year_round_process", "greenhouse"] as HeatNeed[]).map((h) => <option key={h} value={h}>{L.heat[h]}</option>)}
                        </select>
                      </Field>
                      {form.heatNeed !== "none" && (
                        <Field label={C.heatKwh} htmlFor="c-hk" tooltip={T.heatKwh} hint={C.heatKwhHint}><Num id="c-hk" value={form.heatKwhYear} onChange={(v) => set("heatKwhYear", v)} unit={L.units.kwh} min={0} /></Field>
                      )}
                      {form.heatNeed !== "none" && (
                        <Field label={C.heatPrice} htmlFor="c-hp" tooltip={T.heatPrice}><Num id="c-hp" value={form.heatPrice ?? ""} onChange={(v) => set("heatPrice", v)} unit={`${cur}/${L.units.kwh}`} min={0} /></Field>
                      )}
                    </div>
                  </Block>
                  <Block title={d.flow.bio}>
                    <div className="grid gap-5 md:grid-cols-2">
                      <Field label={C.biomethanePrice} htmlFor="c-bp" tooltip={T.biomethanePrice}>
                        <Num id="c-bp" value={form.biomethanePrice ?? ""} onChange={(v) => set("biomethanePrice", v)} unit={`${cur}/${L.units.mwh}`} min={0} />
                      </Field>
                    </div>
                  </Block>
                </div>
              )}

              {step === 3 && (
                <div className="space-y-4">
                  <div>
                    <h2 className="text-xl font-bold">{C.siteTitle}</h2>
                    <p className="mt-1 text-sm text-muted">{C.siteHint}</p>
                  </div>
                  <Block>
                    <div className="grid gap-5 md:grid-cols-2">
                      {!input.process && <><Field label={C.land} htmlFor="c-la" hint={C.landHint} tooltip={T.land}><Num id="c-la" value={form.landHa} onChange={(v) => set("landHa", v)} unit={L.units.ha} min={0} /></Field>
                      <Field label={C.storage} htmlFor="c-st" tooltip={T.storage} hint={C.storageHint}><Num id="c-st" value={form.existingStorageM3} onChange={(v) => set("existingStorageM3", v)} unit={L.units.m3} min={0} /></Field></>}
                      <Field label={C.gasGrid} htmlFor="c-gg" tooltip={T.gasGrid} hint={C.gasGridHint}><Num id="c-gg" value={form.gasGridKm} onChange={(v) => set("gasGridKm", v)} unit={L.units.km} min={0} /></Field>
                      <div className="space-y-2">
                        <Toggle checked={form.neighbours} onChange={(v) => set("neighbours", v)} label={C.neighbours} tooltip={T.neighbours} />
                        <Toggle checked={form.protectedArea} onChange={(v) => set("protectedArea", v)} label={C.protected} tooltip={T.protectedArea} />
                      </div>
                    </div>
                  </Block>
                  <Block>
                    <Toggle checked={!!form.refineOpen} onChange={(v) => set("refineOpen", v)} label={C.refineTitle} tooltip={T.refineOpen} />
                    {form.refineOpen && <>
                    <p className="mt-3 text-sm text-muted">{C.refineHint}</p>
                    <div className="mt-4 grid gap-5 md:grid-cols-2">
                      <Field label={C.operatorWage} htmlFor="c-ow" tooltip={T.operatorWage}><Num id="c-ow" value={form.operatorWage ?? ""} onChange={(v) => set("operatorWage", v)} unit={`${cur}/h`} min={0} /></Field>
                      {!input.process && <>
                        <Field label={C.capexQuote} htmlFor="c-cq" tooltip={T.capexQuote}><Num id="c-cq" value={form.capexQuote ?? ""} onChange={(v) => set("capexQuote", v)} unit={cur} min={0} /></Field>
                        <Field label={C.capexQuoteRoute} htmlFor="c-cr" tooltip={T.capexQuoteRoute}>
                          <select id="c-cr" className="field" value={form.capexQuoteRoute ?? ""} onChange={(e) => set("capexQuoteRoute", e.target.value as "" | RouteId)}>
                            <option value="">—</option>
                            {(["chp", "boiler", "biomethane"] as RouteId[]).map((r) => <option key={r} value={r}>{L.route[r]}</option>)}
                          </select>
                        </Field>
                      </>}
                      <Field label={C.debtShare} htmlFor="c-ds" tooltip={T.debtShare}><Num id="c-ds" value={form.debtSharePct ?? ""} onChange={(v) => set("debtSharePct", v)} unit={L.units.pct} min={0} max={90} /></Field>
                      <Field label={C.debtRate} htmlFor="c-dr" tooltip={T.debtRate}><Num id="c-dr" value={form.debtRatePct ?? ""} onChange={(v) => set("debtRatePct", v)} unit={L.units.pct} min={0} max={60} /></Field>
                      <Field label={C.debtTenor} htmlFor="c-dt" tooltip={T.debtTenor}><Num id="c-dt" value={form.debtTenorYears ?? ""} onChange={(v) => set("debtTenorYears", v)} unit={L.units.years} min={0} max={30} /></Field>
                    </div></>}
                  </Block>
                </div>
              )}

              {error && <p role="alert" className="mt-4 rounded-lg bg-red-50 p-3 text-sm text-red-900">{error}</p>}
              <LiveStrip a={live?.a ?? null} d={d} locale={locale} />

              <div className="no-print mt-6 flex flex-wrap items-center justify-between gap-3 border-t border-line pt-5">
                <button type="button" className="btn btn-ghost" disabled={step === 0} onClick={() => setStep((s) => Math.max(0, s - 1))}>← {d.common.back}</button>
                <div className="flex flex-wrap justify-end gap-3">
                  {step < C.steps.length - 1 ? (
                    <>
                      {(step >= 2 || submitted) && <button type="button" className="btn btn-ghost" onClick={calculate} title={C.calcNowHint}>{C.calcNow}</button>}
                      <button type="button" className="btn btn-primary" onClick={next}>{d.common.next} →</button>
                    </>
                  ) : (
                    <button type="button" className="btn btn-primary" onClick={calculate}>{C.calculate}</button>
                  )}
                </div>
              </div>
            </div>
          </div>

          <aside className="no-print lg:sticky lg:top-20">
            <LiveEstimate a={live?.a ?? null} d={d} locale={locale} currency={cur} examples={examples.slice(0, 5)} onExample={loadExample} samplesHref={samplesHref} samplesLabel={samplesLabel} />
          </aside>
        </div>
      )}

      <div ref={resultRef} className="scroll-mt-20">
        {assessment && (
          <div className="mt-10">
            <h2 className="mb-4 text-2xl font-bold tracking-tight md:text-3xl">{C.resultTitle}</h2>
            {previewEnabled && (
              <div role="group" aria-label={d.pricing.title} className="no-print mb-4 inline-flex gap-1 rounded-full border border-line bg-surface p-1">
                {([["free", d.pricing.freeName], ["standard", d.pricing.plans.standard.name], ["full", d.pricing.plans.report.name]] as const).map(([id, name]) => (
                  <button key={id} type="button" aria-pressed={preview === id} onClick={() => setPreview(id)} className={`rounded-full px-4 py-1.5 text-sm font-semibold ${preview === id ? "bg-ink text-white" : "text-ink2 hover:bg-surface2"}`}>{name}</button>
                ))}
              </div>
            )}
            <ResultView
              core={core}
              a={paidPreview ?? (currentAdvice ? { ...assessment.a, advice: currentAdvice } : assessment.a)}
              d={d}
              locale={locale}
              currency={assessment.country.currency}
              countryNotes={locList(assessment.country.approachNotes, lang)}
              access={access}
              samplesHref={samplesHref}
              methodologyHref={`/${locale}/methodology`}
              unlockSlot={<UnlockButton input={assessment.input} locale={locale} d={d} demo={demo} plan={preferredPlan} label={d.result.unlock} className="btn btn-signal" />}
              labSlot={currentAdvice && <ScenarioLab key={adviceKey} a={assessment.a} advice={currentAdvice} input={assessment.input} country={assessment.country} locale={locale} d={d} currency={assessment.country.currency} onApply={applyScenario} />}
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
  const T = stepHelp(locale);
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
        <Field label={isAnimal ? C.lineHead : C.lineTonnes} htmlFor={`${id}-q`} tooltip={isAnimal ? T.quantityHead : T.quantityTonnes}>
          <Num id={`${id}-q`} value={line.quantity} onChange={(v) => onChange({ quantity: v })} unit={unit} placeholder={fmt(C.eg, { v: localNumber(isAnimal ? 400 : 3000) })} min={0} />
        </Field>
        {isAnimal && (
          <Field label={C.lineMeasured} htmlFor={`${id}-mt`} tooltip={T.measuredTonnes}>
            <Num id={`${id}-mt`} value={line.measuredTonnes ?? ""} onChange={(v) => onChange({ measuredTonnes: v })} unit={L.units.tYear} min={0} />
          </Field>
        )}
        {isAnimal && ["dairy_cow", "cattle_other"].includes(line.animal as string) && (
          <Field label={C.housing} htmlFor={`${id}-h`} tooltip={T.housing}>
            <select id={`${id}-h`} className="field" value={line.housing} onChange={(e) => onChange({ housing: e.target.value as FormLine["housing"] })}>
              <option value="year_round">{L.housing.year_round}</option>
              <option value="seasonal">{L.housing.seasonal}</option>
            </select>
          </Field>
        )}
        {!isAnimal && (
          <>
            <Field label={C.handlingQ} htmlFor={`${id}-hd`} tooltip={T.handling}>
              <select id={`${id}-hd`} className="field" value={line.handling} onChange={(e) => onChange({ handling: e.target.value as HandlingId | "" })}>
                <option value="">{C.choose}</option>
                {HANDLING_IDS.map((k) => <option key={k} value={k}>{L.handling[k]}</option>)}
              </select>
            </Field>
            {(line.handling === "paid_disposal" || line.handling === "landfill") && (
              <Field label={C.disposalCost} htmlFor={`${id}-dc`} tooltip={T.disposalCost} hint={C.disposalHint}><Num id={`${id}-dc`} value={line.disposalCost} onChange={(v) => onChange({ disposalCost: v })} unit={`${cur}/${L.units.t}`} min={0} /></Field>
            )}
            {line.handling === "sold_as_feed" && (
              <Field label={C.saleValue} htmlFor={`${id}-sv`} tooltip={T.saleValue} hint={C.saleHint}><Num id={`${id}-sv`} value={line.opportunityValue} onChange={(v) => onChange({ opportunityValue: v })} unit={`${cur}/${L.units.t}`} min={0} /></Field>
            )}
          </>
        )}
      </div>
      <details className="mt-3">
        <summary className="text-sm font-semibold text-brand">{C.refine}</summary>
        <div className="mt-3 grid gap-4 md:grid-cols-3">
          <Field label={fmt(C.dm, { v: localNumber(t.dryMatterPct) })} htmlFor={`${id}-dm`} hint={C.dmHint} tooltip={help.dm}><Num id={`${id}-dm`} value={line.dryMatterPct} onChange={(v) => onChange({ dryMatterPct: v })} unit={L.units.pct} min={0} max={95} /></Field>
          <Field label="VS (% DM)" htmlFor={`${id}-vs`} tooltip={help.vs}><Num id={`${id}-vs`} value={line.vsPctOfDm ?? ""} onChange={(v) => onChange({ vsPctOfDm: v })} unit={L.units.pct} placeholder={localNumber(t.vsPctOfDm)} min={0} max={100} /></Field>
          <Field label="BMP (L CH₄/kg VS)" htmlFor={`${id}-bmp`} tooltip={help.bmp}><Num id={`${id}-bmp`} value={line.methaneYieldLPerKgVs ?? ""} onChange={(v) => onChange({ methaneYieldLPerKgVs: v })} placeholder={localNumber(t.yieldTyp)} min={0} max={1200} /></Field>
          {!isAnimal && <Field label={fmt(C.months, { v: localNumber(t.defaultMonths) })} htmlFor={`${id}-m`} tooltip={help.season}><Num id={`${id}-m`} value={line.monthsActive} onChange={(v) => onChange({ monthsActive: v })} unit={L.units.months} min={1} max={12} /></Field>}
          {!isAnimal && <Field label={C.seasonStart} htmlFor={`${id}-start`} tooltip={help.season}>
            <select id={`${id}-start`} className="field" value={line.startMonth || String(t.defaultStartMonth)} onChange={(e) => onChange({ startMonth: e.target.value })}>
              {Array.from({ length: 12 }, (_, month) => <option key={month} value={month + 1}>{new Intl.DateTimeFormat(INTL_TAG[locale], { month: "long", timeZone: "UTC" }).format(new Date(Date.UTC(2025, month, 1)))}</option>)}
            </select>
          </Field>}
          <div className="space-y-2">
            <Toggle checked={line.delivered} onChange={(v) => onChange({ delivered: v })} label={C.delivered} tooltip={T.delivered} />
            {line.delivered && <Num min={0} value={line.distanceKm} onChange={(v) => onChange({ distanceKm: v })} unit={L.units.km} placeholder={C.distance} />}
          </div>
          {!isAnimal && <Field label={C.purchase} htmlFor={`${id}-pp`} tooltip={T.purchase} hint={C.purchaseHint}><Num id={`${id}-pp`} value={line.purchasePrice} onChange={(v) => onChange({ purchasePrice: v })} unit={`${cur}/${L.units.t}`} signed /></Field>}
        </div>
      </details>
    </div>
  );
}
