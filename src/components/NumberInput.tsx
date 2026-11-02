"use client";

import { useId } from "react";
import { numberError } from "@/i18n/errors";
import { formatLocalizedNumber, normalizeNumberText, parseLocalizedNumber } from "@/lib/localized-number";
import { useLocale } from "./LocaleProvider";

export interface NumberBounds {
  /** Smallest and largest value the calculation accepts; anything outside is ignored or clamped there, so it is shown here. */
  min?: number;
  max?: number;
}

/** "0–95 %", "≥ 0", "≤ 90 %": symbols only, so the range reads the same in every language. */
export function rangeText({ min, max }: NumberBounds, locale: Parameters<typeof formatLocalizedNumber>[1], unit?: string): string {
  const n = (v: number) => formatLocalizedNumber(v, locale);
  const u = unit ? ` ${unit}` : "";
  if (min !== undefined && max !== undefined) return `${n(min)}–${n(max)}${u}`;
  if (min !== undefined) return `≥ ${n(min)}${u}`;
  return `≤ ${n(max as number)}${u}`;
}

/**
 * A locale-aware number field. It keeps what the user typed, understands the decimal and thousands marks of the interface
 * language, tidies a valid entry on blur, and says so when the text is not a number or lies outside what the model reads.
 * `signed` fields (a gate fee is negative) get the full keyboard, because phone number pads have no minus sign.
 */
export function NumberInput({ value, onChange, placeholder, unit, id, signed, min, max, required }: { value: string; onChange: (v: string) => void; placeholder?: string; unit?: string; id?: string; signed?: boolean; required?: boolean } & NumberBounds) {
  const locale = useLocale();
  const fallbackId = useId();
  const base = id ?? fallbackId;
  const errorId = `${base}-error`;
  const unitId = `${base}-unit`;
  const text = value.trim();
  const parsed = text === "" ? undefined : parseLocalizedNumber(value, locale);
  const notNumber = text !== "" && parsed === undefined;
  const outside = parsed !== undefined && ((min !== undefined && parsed < min) || (max !== undefined && parsed > max));
  const invalid = notNumber || outside;
  const message = notNumber ? numberError[locale] : outside ? rangeText({ min, max }, locale, unit) : "";
  const describedBy = [invalid ? errorId : "", unit ? unitId : ""].filter(Boolean).join(" ") || undefined;
  return (
    <div>
      <div className="relative">
        <input id={id} className="field num" style={unit ? { paddingRight: `${Math.max(3.5, unit.length * 0.6 + 1.5)}rem` } : undefined} inputMode={signed ? "text" : "decimal"} enterKeyHint="next" autoComplete="off" autoCapitalize="off" spellCheck={false} required={required}
          value={value} placeholder={placeholder} aria-invalid={invalid || undefined} aria-describedby={describedBy}
          onChange={(e) => onChange(e.target.value)} onBlur={(e) => { const tidy = normalizeNumberText(e.target.value, locale); if (tidy !== e.target.value) onChange(tidy); }} />
        {unit && <span id={unitId} className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted">{unit}</span>}
      </div>
      {invalid && <p id={errorId} className="mt-1 text-xs text-bad">{message}</p>}
    </div>
  );
}
