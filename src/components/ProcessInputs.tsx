"use client";

import { modelsForBusiness } from "@/core/businesses";
import { processBounds, processSchema, PROCESS_UNITS, type ProcessKind } from "@/core/processes";
import type { FormState } from "@/lib/form";
import { HelpTooltip } from "./HelpTooltip";
import { processFieldHelp } from "@/i18n/process-help";
import { processCopy, processFieldLabels, processUsage } from "@/i18n/processes";
import type { Dict, Locale } from "@/i18n";
import { NumberInput } from "./NumberInput";
import { presetCopy } from "@/i18n/process-presets";
import { INTL_TAG } from "@/i18n/config";
import { parseLocalizedNumber } from "@/lib/localized-number";
import { presetProcess, STARCH_PRESET_IDS, type WastewaterPreset } from "@/core/wastewaterPresets";
import { useState } from "react";

/** Registry units are machine text ("local/a", "d/a", "kWh_th/a"): show the project currency, the locale's year word and a plain heat unit. */
export function processUnitLabel(unit: string, currency: string, units: Pick<Dict["labels"]["units"], "years">): string {
  return unit.replace(/\blocal\b/g, currency).replace(/kWh_th/g, "kWh (heat)").replace(/\/a\b/g, `/${units.years}`).replace(/^a$/, units.years);
}

export function ProcessInputs({ form, onChange, locale, currency, adLabel, units }: {
  form: FormState; onChange: (patch: Partial<FormState>) => void; locale: Locale; currency: string; adLabel: string; units: Pick<Dict["labels"]["units"], "years">;
}) {
  const usage = processUsage(locale);
  const c = processCopy(locale), labels = processFieldLabels(locale);
  const kind = form.processKind ?? modelsForBusiness(form.businessType)[0];
  const schema = processSchema.options.find(s => s.shape.kind.value === kind);
  const keys = schema ? Object.keys(schema.shape).filter(k => k !== "kind" && k !== "reactorTechnology" && !k.startsWith("basis")) : [];
  const help = processFieldHelp(locale);
  const pc = presetCopy(locale);
  const [preset, setPreset] = useState<WastewaterPreset["id"]>("potato_starch");
  const [rawTonnes, setRawTonnes] = useState("");
  const raw = parseLocalizedNumber(rawTonnes, locale);
  // A preset fills the physical inputs from published sector data; costs and avoided treatment are left to the client or the model.
  const applyPreset = () => {
    if (!raw || raw <= 0) return;
    const nf = new Intl.NumberFormat(INTL_TAG[locale], { useGrouping: false, maximumFractionDigits: 2 });
    const filled = Object.fromEntries(Object.entries(presetProcess(preset, raw)).filter(([k]) => k !== "kind").map(([k, v]) => [k, typeof v === "number" ? nf.format(v) : String(v)]));
    onChange({ processFields: { ...form.processFields, ...filled } });
  };
  return <div className="space-y-5">
    {modelsForBusiness(form.businessType).length > 1 && <label className="block"><span className="label"><HelpTooltip description={help.model}>{c.modelLabel}</HelpTooltip></span><select className="field" value={kind} onChange={e => onChange({ processKind: e.target.value as "ad" | ProcessKind, processFields: {} })}>
      {modelsForBusiness(form.businessType).map(m => <option key={m} value={m}>{m === "ad" ? adLabel : c.models[m]}</option>)}
    </select></label>}
    {kind !== "ad" && <>
      <p className="text-sm text-muted">{c.inputHint}</p>
      {kind === "wastewater" && <label className="block"><span className="label"><HelpTooltip description={help.reactor}>{processFieldLabels(locale).reactorTechnology}</HelpTooltip></span><select className="field" value={form.processFields?.reactorTechnology || "high_rate"} onChange={e => onChange({processFields:{...form.processFields,reactorTechnology:e.target.value}})}><option value="high_rate">UASB / EGSB</option><option value="covered_lagoon">{usage.lagoon}</option></select></label>}
      {kind === "wastewater" && form.businessType === "starch_processor" && <div className="rounded-lg border border-line p-3">
        <div className="text-sm font-semibold">{pc.title}</div>
        <div className="mt-2 grid gap-3 sm:grid-cols-[1fr_1fr_auto] sm:items-end">
          <label className="block"><span className="sr-only">{pc.title}</span><select className="field" value={preset} onChange={e => setPreset(e.target.value as WastewaterPreset["id"])}>
            {STARCH_PRESET_IDS.map(id => <option key={id} value={id}>{pc[id]}</option>)}
          </select></label>
          <div><label className="label" htmlFor="preset-raw">{pc.throughput}</label><NumberInput id="preset-raw" value={rawTonnes} min={0} onChange={setRawTonnes} /></div>
          <button type="button" className="btn btn-ghost" disabled={!raw || raw <= 0} onClick={applyPreset}>{pc.apply}</button>
        </div>
        <p className="mt-2 text-xs text-muted">{pc.note}</p>
      </div>}
      <p className="rounded-lg bg-surface2 p-3 text-sm">{c.costHint}{kind === "residue" && <> {c.modelledHint}</>}{kind === "wastewater" && <> {pc.modelledWastewater}</>}</p>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {keys.map(key => {
          const optional = (schema?.shape as Record<string,{isOptional:()=>boolean}> | undefined)?.[key]?.isOptional();
          const value = form.processFields?.[key] ?? "";
          const unit = processUnitLabel(PROCESS_UNITS[key] ?? "—", currency, units);
          const bounds = processBounds(kind as ProcessKind, key);
          const id = `process-${key}`;
          return <div key={key}><label className="label" htmlFor={id}>{help[key] ? <HelpTooltip description={help[key]}>{labels[key]}</HelpTooltip> : labels[key]}{optional && <span className="ml-1 font-normal text-muted">· {usage.optional}</span>}</label>
            <NumberInput id={id} value={value} unit={unit} required={!optional} min={bounds.low} max={Number.isFinite(bounds.high) ? bounds.high : undefined} onChange={v => onChange({ processFields: { ...form.processFields, [key]: v } })} /></div>;
        })}
      </div>
    </>}
  </div>;
}
