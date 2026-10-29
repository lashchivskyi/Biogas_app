"use client";

import { modelsForBusiness } from "@/core/businesses";
import { processSchema, PROCESS_UNITS, type ProcessKind } from "@/core/processes";
import type { FormState } from "@/lib/form";
import { processIssues } from "@/lib/form";
import { processCopy, processFieldLabels, processUsage } from "@/i18n/processes";
import type { Locale } from "@/i18n";

export function ProcessInputs({ form, onChange, locale, currency, adLabel }: {
  form: FormState; onChange: (patch: Partial<FormState>) => void; locale: Locale; currency: string; adLabel: string;
}) {
  const usage = processUsage(locale);
  const c = processCopy(locale), labels = processFieldLabels(locale);
  const kind = form.processKind ?? modelsForBusiness(form.businessType)[0];
  const schema = processSchema.options.find(s => s.shape.kind.value === kind);
  const keys = schema ? Object.keys(schema.shape).filter(k => k !== "kind" && k !== "reactorTechnology" && !k.startsWith("basis")) : [];
  const issues = processIssues(form);
  return <div className="space-y-5">
    {modelsForBusiness(form.businessType).length > 1 && <label className="block"><span className="label">{c.modelLabel}</span><select className="field" value={kind} onChange={e => onChange({ processKind: e.target.value as "ad" | ProcessKind, processFields: {} })}>
      {modelsForBusiness(form.businessType).map(m => <option key={m} value={m}>{m === "ad" ? adLabel : c.models[m]}</option>)}
    </select></label>}
    {kind !== "ad" && <>
      <p className="text-sm text-muted">{c.inputHint}</p>
      {kind === "wastewater" && <label className="block"><span className="label">Reactor</span><select className="field" value={form.processFields?.reactorTechnology || "high_rate"} onChange={e => onChange({processFields:{...form.processFields,reactorTechnology:e.target.value}})}><option value="high_rate">UASB / EGSB</option><option value="covered_lagoon">{usage.lagoon}</option></select></label>}
      <p className="rounded-lg bg-surface2 p-3 text-sm">{c.costHint}</p>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {keys.map(key => {
          const optional = (schema?.shape as Record<string,{isOptional:()=>boolean}> | undefined)?.[key]?.isOptional();
          const value = form.processFields?.[key] ?? "";
          const unit = (PROCESS_UNITS[key] ?? "—").replace("local", currency);
          return <label className="block" key={key}><span className="label">{labels[key]} <span className="font-normal text-muted">({unit})</span>{optional && <span className="ml-1 font-normal text-muted">· {usage.optional}</span>}</span>
            <input className="field num" inputMode="decimal" required={!optional} value={value} aria-invalid={value.trim() !== "" && issues.includes(key) || undefined} onChange={e => onChange({ processFields: { ...form.processFields, [key]: e.target.value } })} />
          </label>;
        })}
      </div>
    </>}
  </div>;
}
