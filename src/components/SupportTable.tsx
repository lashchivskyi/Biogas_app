import type { Assessment } from "@/core";
import type { Dict, Locale } from "@/i18n";
import { offerCopy } from "@/i18n/offer";

/**
 * National support as separate cases (never in the verdict). A gas-stream case is "if eligible": its NPV is shown,
 * but it is never marked eligible, because the scheme's gas-source category is not modelled.
 */
export function SupportTable({ a, d, locale, eur, years }: { a: Assessment; d: Pick<Dict, "result" | "labels" | "common">; locale: Locale; eur: (v: number) => string; years: (v: number | null) => string }) {
  const R = d.result;
  const L = d.labels;
  if (a.supportCases.length === 0) return <p className="card p-4 text-sm text-ink2">{R.supportNone}</p>;
  return (
    <div className="card overflow-x-auto p-1" tabIndex={0}>
      <table className="w-full min-w-[640px] text-sm">
        <thead>
          <tr className="text-left text-xs uppercase tracking-wide text-muted">
            <th className="p-3">{R.colScheme}</th><th className="p-3">{R.colStatus}</th><th className="p-3">{R.colEligible}</th><th className="p-3 text-right">{R.colNpv}</th><th className="p-3 text-right">{R.colPayback}</th><th className="p-3 text-right">{R.colDelta}</th>
          </tr>
        </thead>
        <tbody>
          {a.supportCases.map((s) => {
            const shown = s.eligible || s.status === "closed" || !!s.unconfirmed;
            return (
              <tr key={s.schemeId} className="border-t border-line align-top">
                <td className="p-3">
                  <div className="font-semibold">{s.name}</div>
                  <div lang={a.lang} className="mt-0.5 text-xs text-muted">{s.note}</div>
                  <div className="mt-0.5 text-[11px] text-muted"><span lang="en">{s.source}</span> · {L.confidence[s.confidence]}</div>
                </td>
                <td className="p-3"><span className="chip">{R.status[s.status]}</span></td>
                <td className="p-3">{s.eligible ? d.common.yes : s.unconfirmed ? <span className="chip">{offerCopy[locale].ifEligible}</span> : <span className="text-bad">{d.common.no}</span>}{s.reason && <div lang={a.lang} className="mt-0.5 max-w-[220px] text-xs text-muted">{s.reason}</div>}</td>
                <td className="num p-3 text-right font-semibold">{shown ? eur(s.npvEur) : "—"}</td>
                <td className="num p-3 text-right">{shown ? years(s.paybackYears) : "—"}</td>
                <td className={`num p-3 text-right ${s.deltaNpvEur >= 0 ? "text-good" : "text-bad"}`}>{shown ? eur(s.deltaNpvEur) : "—"}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
