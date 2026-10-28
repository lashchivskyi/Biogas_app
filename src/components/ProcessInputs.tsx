"use client";

import { modelsForBusiness } from "@/core/businesses";
import { processSchema, PROCESS_UNITS, type ProcessKind } from "@/core/processes";
import type { FormState } from "@/lib/form";
import { processIssues } from "@/lib/form";
import { processCopy, processFieldLabels } from "@/i18n/processes";
import type { Locale } from "@/i18n";

export function ProcessInputs({ form, onChange, locale, currency, adLabel }: {
  form: FormState; onChange: (patch: Partial<FormState>) => void; locale: Locale; currency: string; adLabel: string;
}) {
  const c = processCopy(locale), labels = processFieldLabels(locale);
  const kind = form.processKind ?? modelsForBusiness(form.businessType)[0];
  const schema = processSchema.options.find(s => s.shape.kind.value === kind);
  const keys = schema ? Object.keys(schema.shape).filter(k => k !== "kind" && !k.startsWith("basis")) : [];
  const issues = processIssues(form);
  return <div className="space-y-5">
    <label className="block"><span className="label">{c.modelLabel}</span><select className="field" value={kind} onChange={e => onChange({ processKind: e.target.value as "ad" | ProcessKind, processFields: {} })}>
      {modelsForBusiness(form.businessType).map(m => <option key={m} value={m}>{m === "ad" ? adLabel : c.models[m]}</option>)}
    </select></label>
    {kind !== "ad" && <>
      <p className="text-sm text-muted">{c.inputHint}</p>
      <p className="rounded-lg bg-surface2 p-3 text-sm">{c.costHint}</p>
      <div className="grid gap-4 sm:grid-cols-2"><label className="block"><span className="label">{labels.basisDate}</span><input type="date" className="field" value={form.processFields?.basisDate ?? ""} onChange={e => onChange({ processFields: { ...form.processFields, basisDate: e.target.value } })} /></label><label className="block"><span className="label">{labels.basisReference}</span><input className="field" maxLength={500} value={form.processFields?.basisReference ?? ""} onChange={e => onChange({ processFields: { ...form.processFields, basisReference: e.target.value } })} /></label></div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {keys.map(key => {
          const value = form.processFields?.[key] ?? "";
          const unit = (PROCESS_UNITS[key] ?? "—").replace("local", currency);
          return <label className="block" key={key}><span className="label">{labels[key]} <span className="font-normal text-muted">({unit})</span></span>
            <input className="field num" inputMode="decimal" required value={value} aria-invalid={value.trim() !== "" && issues.includes(key) || undefined} onChange={e => onChange({ processFields: { ...form.processFields, [key]: e.target.value } })} />
          </label>;
        })}
      </div>
    </>}
  </div>;
}
